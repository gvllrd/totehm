// TOTEHM · higher-map v7
// ─────────────────────────────────────────────────────────────────────
// Le monde filtré par ton Totehm.
//
// v7 — Unified Spot Model et Google coupé.
//
// PLACES_ENABLED = false. Le Founder veut la table `spots` seule pour
// l'instant. Le cache Google n'est PAS supprimé : il ne coûte rien
// tant que la clé n'est pas posée, et le supprimer pour le
// reconstruire dans trois semaines serait du travail jeté. Un seul
// booléen le rallume, et places_near reçoit p_places en conséquence.
//
// Le modèle unifié est DÉDUIT, pas stocké :
//   user_id renseigné    → MEMBER_DROP
//   expires_at renseigné → LIVE_EVENT  (le front affiche le compte à rebours)
//   sinon                → PLACE
// Une colonne `kind` devrait être tenue cohérente à chaque écriture ;
// déduite, elle est vraie par construction.
//
// SÉCURITÉ : l'intention demandée doit appartenir au Totehm du membre.
// On n'interroge pas le monde sous une intention qu'on n'a pas posée
// sur ses propres habitudes.
//
// DOCTRINE DE COÛT — la v4 appelait Google une fois par intention à
// chaque ouverture : 8,40 $/mois pour UN membre contre 6,75 € d'ARPU.
// Trois verrous depuis la v5 : la base d'abord (MIN_RESULTS), un cache
// géographique et non personnel (CELL_TTL_DAYS), un plafond global
// quotidien (DAILY_BUDGET). Ils restent en place, éteints.
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

// L'interrupteur. true = le cache Google reprend du service.
const PLACES_ENABLED = false;

// Lisbonne — Praça do Comércio. Repli quand le navigateur ne donne
// rien : le radar montre toujours quelque chose.
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

const GOOGLE_TYPES: Record<string, string[]> = {
  fight:     ["gym", "fitness_center", "sports_complex"],
  flow:      ["park", "hiking_area", "swimming_pool"],
  enrich:    ["book_store", "university", "convention_center"],
  love:      ["cafe", "garden", "tourist_attraction"],
  express:   ["art_gallery", "art_studio", "performing_arts_theater"],
  focus:     ["library", "coffee_shop"],
  celebrate: ["night_club", "bar", "concert_hall"],
};

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

  // .limit(1) et pas .maybeSingle() : deux lignes actives (upgrade,
  // réabonnement) faisaient planter la requête et rendaient un 402 à
  // un membre qui paie.
  const { data: subs } = await sb
    .from("subscriptions").select("status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .limit(1);

  if (!subs?.length) {
    return Response.json({ error: "members only" }, { status: 402, headers: cors });
  }

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

  if (PLACES_ENABLED && spots.length < MIN_RESULTS) {
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
    places_enabled: PLACES_ENABLED,
  }, { headers: cors });
});

async function near(lat: number, lng: number, intentions: string[]) {
  const { data, error } = await sb.rpc("places_near", {
    p_lat: lat, p_lng: lng,
    p_radius: RADIUS_M,
    p_intentions: intentions,
    p_limit: 60,
    p_places: PLACES_ENABLED,
  });
  if (error) { console.error("places_near:", error.message); return []; }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id:            r.ref,
    source:        r.source,
    kind:          r.kind,
    activite:      r.name,
    intention:     r.intention,
    lieu_type:     r.lieu_type,
    commentaire:   r.why,
    state_of_mind: r.state_of_mind,
    vibe:          r.vibe,
    tags:          r.tags,
    member_count:  r.member_count,
    ends_at:       r.ends_at,
    lat:           r.lat,
    lng:           r.lng,
    dist_m:        r.dist_m,
    duration_min:  r.duration_min,
  }));
}

// Balaye la cellule pour les intentions encore froides. Dormant tant
// que PLACES_ENABLED vaut false.
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
