// TOTEHM · higher-map v6
// ─────────────────────────────────────────────────────────────────────
// Le monde filtré par ton Totehm.
//
// v6 — flow « Intention Trigger ». Le front n'appelle plus cette
// fonction à l'ouverture de la carte : il l'appelle au moment où le
// membre choisit une intention, et il en passe UNE. On ne renvoie que
// les lieux de cette intention.
//
// Conséquence côté coût : plus d'invocations (une par choix au lieu
// d'une par ouverture), mais chacune balaie au plus UNE intention
// Google au lieu de trois. Le coût Google baisse, le coût Supabase est
// inclus dans le forfait. Estimation à 1 000 membres : ~30 000
// invocations/mois, largement sous le quota.
//
// SÉCURITÉ : l'intention demandée doit appartenir au Totehm du membre.
// Sinon on refuse. On ne laisse pas interroger le monde sous une
// intention qu'on n'a pas assumée dans ses habitudes.
//
// DOCTRINE DE COÛT — inchangée depuis la v5.
// Google Places facture ~35 $ / 1 000 appels. La v4 appelait Google
// une fois par intention À CHAQUE ouverture : 8,40 $/mois pour UN
// membre contre 6,75 € d'ARPU. Trois verrous :
//   1. La base d'abord. Google n'est appelé QUE si places_near()
//      renvoie moins de MIN_RESULTS lieux.
//   2. Le cache est géographique, pas personnel. Une cellule de
//      ~1,1 km est balayée une fois puis sert tous les membres du
//      quartier pendant CELL_TTL_DAYS. Le second membre coûte 0.
//   3. Un plafond global par jour (places_budget_take). Au-dessus, on
//      sert la base et on ne dépense plus. C'est ce qui sépare un bug
//      d'une facture à 3 000 €.
//
// verify_jwt = true
// ─────────────────────────────────────────────────────────────────────

import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_SPACE = "https://www.totehm.space";
const ALLOWED_ORIGINS = [
  "https://www.totehm.com", "https://totehm.com",
  SITE_SPACE, "https://totehm.space",
  "https://www.higher.boutique", "https://higher.boutique",
  "http://localhost:3000",
];

// Lisbonne — Praça do Comércio. Repli quand le navigateur refuse la
// géolocalisation : le radar montre toujours quelque chose.
const FALLBACK = { lat: 38.7078, lng: -9.1366 };

const RADIUS_M      = 4000;
const MIN_RESULTS   = 8;
const CELL_TTL_DAYS = 90;
const MAX_SWEEPS    = 3;
const DAILY_BUDGET  = 200;

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : SITE_SPACE;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// Une intention → plusieurs types Google. Traduction éditoriale d'une
// intention en lieux réels ; le type seul ne dit rien.
const GOOGLE_TYPES: Record<string, string[]> = {
  fight:     ["gym", "fitness_center", "sports_complex"],
  flow:      ["park", "hiking_area", "swimming_pool"],
  enrich:    ["book_store", "university", "convention_center"],
  love:      ["cafe", "garden", "tourist_attraction"],
  express:   ["art_gallery", "art_studio", "performing_arts_theater"],
  focus:     ["library", "coffee_shop"],
  celebrate: ["night_club", "bar", "concert_hall"],
};

// Cellule ≈ 1,1 km × 0,87 km à la latitude de Lisbonne.
const cellOf = (lat: number, lng: number) => `${lat.toFixed(2)},${lng.toFixed(2)}`;

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { data: { user }, error: authErr } = await sb.auth.getUser(
    (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
  );
  if (authErr || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  // Abonnement — .limit(1) et pas .maybeSingle() : deux lignes actives
  // (upgrade, réabonnement) faisaient planter la requête et rendaient
  // un 402 à un membre qui paie.
  const { data: subs } = await sb
    .from("subscriptions").select("status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .limit(1);

  if (!subs?.length) {
    return Response.json({ error: "members only" }, { status: 402, headers: cors });
  }

  // Totehm — la ligne la plus récente fait foi.
  const { data: totehms } = await sb
    .from("totehms").select("steps, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  const steps: { i?: string; intention?: string }[] = totehms?.[0]?.steps ?? [];
  const mine = [...new Set(
    steps.map((s) => s.i || s.intention).filter(Boolean),
  )] as string[];

  if (!mine.length) {
    return Response.json({ reason: "no_intention" }, { headers: cors });
  }

  let lat: number | null = null, lng: number | null = null;
  let asked: string | null = null;
  try {
    const body = await req.json();
    if (Number.isFinite(body?.lat)) lat = body.lat;
    if (Number.isFinite(body?.lng)) lng = body.lng;
    if (typeof body?.intention === "string") asked = body.intention;
  } catch { /* pas de body */ }

  // On n'interroge le monde que sous une intention réellement posée
  // sur ses propres habitudes.
  if (asked && !mine.includes(asked)) {
    return Response.json(
      { reason: "not_your_intention", intentions: mine },
      { status: 403, headers: cors },
    );
  }
  const wanted = asked ? [asked] : mine;

  const fallback = lat === null || lng === null;
  if (fallback) { lat = FALLBACK.lat; lng = FALLBACK.lng; }

  let spots = await near(lat!, lng!, wanted);
  let sweeps = 0;

  // Google n'entre en jeu que si la base est maigre ICI.
  if (spots.length < MIN_RESULTS) {
    sweeps = await warm(lat!, lng!, wanted);
    if (sweeps > 0) spots = await near(lat!, lng!, wanted);
  }

  return Response.json({
    spots,
    intention: asked,
    intentions: mine,
    origin: { lat, lng, fallback },
    radius_m: RADIUS_M,
    sweeps,
  }, { headers: cors });
});

async function near(lat: number, lng: number, intentions: string[]) {
  const { data, error } = await sb.rpc("places_near", {
    p_lat: lat, p_lng: lng,
    p_radius: RADIUS_M,
    p_intentions: intentions,
    p_limit: 60,
  });
  if (error) { console.error("places_near:", error.message); return []; }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id:           r.ref,
    source:       r.source,
    activite:     r.name,
    intention:    r.intention,
    lieu_type:    r.lieu_type,
    commentaire:  r.why,
    lat:          r.lat,
    lng:          r.lng,
    dist_m:       r.dist_m,
    duration_min: r.duration_min,
  }));
}

// Balaye la cellule pour les intentions encore froides. Écrit dans
// places. Renvoie le nombre d'appels Google réellement passés.
async function warm(lat: number, lng: number, intentions: string[]): Promise<number> {
  const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!key) return 0;

  const cell = cellOf(lat, lng);
  const stale = new Date(Date.now() - CELL_TTL_DAYS * 864e5).toISOString();

  const { data: done } = await sb
    .from("places_cells").select("intention")
    .eq("cell", cell)
    .in("intention", intentions)
    .gt("swept_at", stale);

  const hot = new Set((done ?? []).map((d) => d.intention));
  const cold = intentions.filter((i) => !hot.has(i) && GOOGLE_TYPES[i]).slice(0, MAX_SWEEPS);

  let calls = 0;
  for (const intention of cold) {
    const { data: allowed } = await sb.rpc("places_budget_take", { p_max: DAILY_BUDGET });
    if (!allowed) { console.warn("google budget reached"); break; }
    calls++;

    try {
      const r = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          // Field mask minimal : chaque champ en plus change de SKU.
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.location,places.formattedAddress,places.primaryType",
        },
        body: JSON.stringify({
          includedTypes: GOOGLE_TYPES[intention],
          maxResultCount: 20,
          locationRestriction: {
            circle: { center: { latitude: lat, longitude: lng }, radius: 1500 },
          },
        }),
      });

      const j = await r.json();
      if (!r.ok) { console.error("google", r.status, JSON.stringify(j).slice(0, 200)); continue; }

      const rows = (j.places ?? []).filter((p: Record<string, unknown>) => p.id && p.location);

      for (const p of rows) {
        // Un lieu peut porter plusieurs intentions : on ajoute, on
        // n'écrase pas. Le parc est flow ET love.
        const { data: prev } = await sb
          .from("places").select("intentions").eq("place_id", p.id).maybeSingle();

        const merged = [...new Set([...(prev?.intentions ?? []), intention])];

        await sb.from("places").upsert({
          place_id:     p.id,
          name:         p.displayName?.text ?? "place",
          intentions:   merged,
          lieu_type:    p.primaryType ?? null,
          address:      p.formattedAddress ?? null,
          lat:          p.location.latitude,
          lng:          p.location.longitude,
          refreshed_at: new Date().toISOString(),
        }, { onConflict: "place_id" });
      }

      await sb.from("places_cells").upsert({
        cell, intention, swept_at: new Date().toISOString(), found: rows.length,
      }, { onConflict: "cell,intention" });

    } catch (e) {
      console.error("sweep failed:", intention, (e as Error).message);
    }
  }

  return calls;
}
