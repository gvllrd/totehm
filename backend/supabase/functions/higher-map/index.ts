// TOTEHM · higher-map v9
// ─────────────────────────────────────────────────────────────────────
// Le monde filtré par ton Totehm.
//
// v9 — Google Places activé + Eventbrite adapter.
//
// Trois sources de lieux, normalisées au même modèle :
//   MEMBER_DROP  → spots (table Supabase, user_id renseigné)
//   LIVE_EVENT   → spots (expires_at) + Eventbrite
//   PLACE        → spots (permanent) + Google Places cache
//
// Eventbrite tourne en parallèle de places_near : les deux requêtes
// partent ensemble, on fusionne les résultats. Pas de cache DB pour
// les events Eventbrite — ils sont courts et leur TTL naturel est
// l'heure de début. La facture Eventbrite est 0 $ (plan gratuit
// couvre 2 000 req/h). Google Places reste derrière le cache cellule.
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

const PLACES_ENABLED = true;

// Lisbonne — Praça do Comércio. Repli quand le navigateur ne donne rien.
const FALLBACK = { lat: 38.7078, lng: -9.1366 };

const RADIUS_M      = 4000;
const MIN_RESULTS   = 8;
const CELL_TTL_DAYS = 90;
const MAX_SWEEPS    = 3;
const DAILY_BUDGET  = 200;

// Rayon Eventbrite en km (arrondi supérieur de RADIUS_M)
const EB_RADIUS_KM = Math.ceil(RADIUS_M / 1000);

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

// Intention → Google Places types
const GOOGLE_TYPES: Record<string, string[]> = {
  fight:     ["gym", "fitness_center", "sports_complex"],
  flow:      ["park", "hiking_area", "swimming_pool"],
  enrich:    ["book_store", "university", "convention_center"],
  love:      ["cafe", "garden", "tourist_attraction"],
  express:   ["art_gallery", "art_studio", "performing_arts_theater"],
  focus:     ["library", "coffee_shop"],
  celebrate: ["night_club", "bar", "concert_hall"],
};

// Intention → Eventbrite category IDs
// https://www.eventbrite.com/platform/api#/reference/category/list/list-categories
const EVENTBRITE_CATS: Record<string, string[]> = {
  fight:     ["108"],            // Sports & Fitness
  flow:      ["107", "399"],     // Health & Wellness, Outdoors & Adventure
  enrich:    ["102", "105"],     // Science & Tech, Arts
  love:      ["110", "113"],     // Food & Drink, Community & Culture
  express:   ["105", "104"],     // Performing & Visual Arts, Film & Media
  focus:     ["101", "102"],     // Business, Science & Tech
  celebrate: ["103", "111"],     // Music, Nightlife
};

const cellOf = (lat: number, lng: number) => `${lat.toFixed(2)},${lng.toFixed(2)}`;

// Distance Haversine en mètres
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { data: { user }, error: authErr } = await sb.auth.getUser(
    (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
  );
  if (authErr || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

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

  // Spots DB + Eventbrite en parallèle
  const [dbSpots, ebEvents] = await Promise.all([
    near(lat!, lng!, wanted),
    fetchEventbriteEvents(lat!, lng!, wanted),
  ]);

  let spots = dbSpots;
  let sweeps = 0;

  if (PLACES_ENABLED && spots.length < MIN_RESULTS) {
    sweeps = await warm(lat!, lng!, wanted);
    if (sweeps > 0) spots = await near(lat!, lng!, wanted);
  }

  // Fusion : spots DB d'abord, events Eventbrite ensuite
  const all = [...spots, ...ebEvents];

  return Response.json({
    spots: all,
    intention: asked,
    intentions: mine,
    origin: { lat, lng, fallback },
    radius_m: RADIUS_M,
    sweeps,
    places_enabled: PLACES_ENABLED,
    events_count: ebEvents.length,
  }, { headers: cors });
});

// ─── spots Supabase (MEMBER_DROP, PLACE, LIVE_EVENT en base) ──────────────

async function near(lat: number, lng: number, intentions: string[]) {
  const { data, error } = await sb.rpc("places_near", {
    p_lat: lat, p_lng: lng,
    p_radius: RADIUS_M,
    p_intentions: intentions,
    p_limit: 60,
    p_places: PLACES_ENABLED,
    p_include_club: true,
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

// ─── Eventbrite adapter ───────────────────────────────────────────────────

async function fetchEventbriteEvents(
  lat: number,
  lng: number,
  intentions: string[],
): Promise<ReturnType<typeof near>> {
  const key = Deno.env.get("EVENTBRITE_API_KEY");
  if (!key) return [];

  // Union des catégories pour toutes les intentions demandées
  const cats = [...new Set(intentions.flatMap((i) => EVENTBRITE_CATS[i] ?? []))];
  if (!cats.length) return [];

  // Catégorie → intention (pour le mapping retour)
  const catToIntent: Record<string, string> = {};
  for (const intent of intentions) {
    for (const cat of (EVENTBRITE_CATS[intent] ?? [])) {
      catToIntent[cat] ??= intent;
    }
  }

  const params = new URLSearchParams({
    "location.latitude":  String(lat),
    "location.longitude": String(lng),
    "location.within":    `${EB_RADIUS_KM}km`,
    "categories":         cats.join(","),
    "expand":             "venue",
    "sort_by":            "date",
    "page_size":          "20",
  });

  try {
    const r = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?${params}`,
      { headers: { "Authorization": `Bearer ${key}` } },
    );
    if (!r.ok) {
      console.error("eventbrite", r.status, await r.text().catch(() => ""));
      return [];
    }
    const j = await r.json();
    const now = Date.now();

    return ((j.events ?? []) as Record<string, unknown>[])
      .filter((e) => {
        // Garder uniquement les events avec lieu géolocalisé et encore à venir
        const venue = e.venue as Record<string, unknown> | null;
        if (!venue?.latitude || !venue?.longitude) return false;
        const start = (e.start as Record<string, unknown>)?.utc as string | null;
        if (start && new Date(start).getTime() < now) return false;
        return true;
      })
      .map((e) => {
        const venue    = e.venue as Record<string, unknown>;
        const start    = (e.start as Record<string, unknown>).utc as string;
        const end      = (e.end as Record<string, unknown> | null)?.utc as string | null;
        const elat     = Number(venue.latitude);
        const elng     = Number(venue.longitude);
        const catId    = String(e.category_id ?? "");
        const nameObj  = e.name as Record<string, unknown>;
        const descObj  = e.description as Record<string, unknown> | null;

        // Intention la mieux mappée parmi celles demandées
        const intention = catToIntent[catId] ?? intentions[0];

        // Description courte : 200 car max
        const desc = (descObj?.text as string | null)?.slice(0, 200) ?? null;

        return {
          id:            `eb_${e.id}`,
          source:        "eventbrite",
          kind:          "LIVE_EVENT",
          activite:      (nameObj?.text as string | null) ?? "Event",
          intention,
          lieu_type:     "event",
          commentaire:   desc,
          state_of_mind: null,
          vibe:          null,
          tags:          [],
          member_count:  0,
          ends_at:       end ?? start,  // countdown jusqu'à la fin (ou le début si pas de fin)
          lat:           elat,
          lng:           elng,
          dist_m:        Math.round(haversine(lat, lng, elat, elng)),
          duration_min:  null,
        };
      });
  } catch (e) {
    console.error("eventbrite fetch failed:", (e as Error).message);
    return [];
  }
}

// ─── Google Places cache (warm) ───────────────────────────────────────────

async function warm(lat: number, lng: number, intentions: string[]): Promise<number> {
  const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!key) return 0;

  const cell  = cellOf(lat, lng);
  const stale = new Date(Date.now() - CELL_TTL_DAYS * 864e5).toISOString();

  const { data: done } = await sb
    .from("places_cells").select("intention")
    .eq("cell", cell)
    .in("intention", intentions)
    .gt("swept_at", stale);

  const hot  = new Set((done ?? []).map((d) => d.intention));
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
