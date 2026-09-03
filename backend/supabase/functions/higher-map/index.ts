// TOTEHM · higher-map v12
// ─────────────────────────────────────────────────────────────────────
// Geo-routing : deux stacks selon la position de l'utilisateur.
//
// ZONE LISBON (< 100 km de Lisbonne)
//   sources locales : Songkick (concerts) + Meetup (communautés)
//
// ZONE INTERNATIONALE (hors Lisbonne)
//   Ticketmaster Discovery (événements payants mondiaux)
//
// TOUJOURS
//   Google Places cache + Member Drops (table spots)
//   Eventbrite : dormant — API publique bloquée depuis 2021
//
// Coût : 0 $ sur toutes les sources (plans gratuits).
// Ticketmaster : 5 000 req/jour.  Songkick : 5 000 req/jour.
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

const PLACES_ENABLED    = true;
const FALLBACK          = { lat: 38.7078, lng: -9.1366 };
const RADIUS_M          = 4000;   // rayon lieux physiques (Google Places)
const EVENT_RADIUS_KM   = 50;     // rayon events (concerts, meetups) — beaucoup plus grand
const MIN_RESULTS       = 8;
const CELL_TTL_DAYS     = 90;
const MAX_SWEEPS        = 3;
const DAILY_BUDGET      = 200;

// ─── Zones géographiques ─────────────────────────────────────────────
// Étendre ici pour Madrid, Paris, etc. au fil du growth.

const GEO_ZONES: Record<string, { lat: number; lng: number; radius_km: number }> = {
  lisbon: { lat: 38.7169, lng: -9.1399, radius_km: 100 },
};

// ─── Mappings intention → monde ──────────────────────────────────────

const GOOGLE_TYPES: Record<string, string[]> = {
  fight:     ["gym", "fitness_center", "sports_complex"],
  flow:      ["park", "hiking_area", "swimming_pool"],
  enrich:    ["book_store", "university", "convention_center"],
  love:      ["cafe", "garden", "tourist_attraction"],
  express:   ["art_gallery", "art_studio", "performing_arts_theater"],
  focus:     ["library", "coffee_shop"],
  celebrate: ["night_club", "bar", "concert_hall"],
};

// Mots-clés Eventbrite (dormant — conservé pour quand l'API sera approuvée)
const EB_KEYWORDS: Record<string, string> = {
  fight:     "sport fitness boxing martial arts running crossfit",
  flow:      "yoga meditation wellness outdoor hiking nature",
  enrich:    "culture art museum exhibition conference talk workshop",
  love:      "social community gathering food wine dining",
  express:   "music concert theatre performance dance live",
  focus:     "workshop seminar learning tech coworking productivity",
  celebrate: "party festival concert celebration nightlife",
};

// Meetup : mots-clés communautés
const MEETUP_KEYWORDS: Record<string, string> = {
  fight:     "sport fitness running boxing",
  flow:      "yoga meditation mindfulness outdoor",
  enrich:    "culture learning art science",
  love:      "social community friendship",
  express:   "music art photography creative",
  focus:     "tech startup entrepreneurship productivity",
  celebrate: "social party fun entertainment",
};

// Ticketmaster : classifications (international uniquement)
const TM_CLASSIFICATIONS: Record<string, string[]> = {
  fight:     ["Sports"],
  flow:      ["Sports", "Miscellaneous"],
  enrich:    ["Arts & Theatre"],
  love:      ["Family", "Miscellaneous"],
  express:   ["Music", "Arts & Theatre"],
  focus:     ["Arts & Theatre", "Miscellaneous"],
  celebrate: ["Music", "Sports"],
};

// Ton de chaque intention — injecté dans le prompt OpenAI
const INTENTION_TONES: Record<string, string> = {
  fight:     "FIGHT (Goggins): brutal discipline, zero excuse, self-overcoming, pain as fuel",
  flow:      "FLOW (Watts): fluid, no pressure, body leads, somatic release, surrender",
  enrich:    "ENRICH (Naval): leverage, capital, systems, strategic accumulation, compounding",
  love:      "LOVE (Perel): beauty, presence, slow connection, sensory depth, warmth",
  express:   "EXPRESS (Abloh): creation, output, voice as identity, the 3% different",
  focus:     "FOCUS (Jobs): deep work, subtraction, signal over noise, attention as power",
  celebrate: "CELEBRATE (Bourdain): honest hedonism, pleasure as commitment, peak moments",
};

// ─── Helpers ─────────────────────────────────────────────────────────

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

function detectZone(lat: number, lng: number): string {
  for (const [name, zone] of Object.entries(GEO_ZONES)) {
    if (haversine(lat, lng, zone.lat, zone.lng) / 1000 <= zone.radius_km) {
      return name;
    }
  }
  return "international";
}

const cellOf = (lat: number, lng: number) => `${lat.toFixed(2)},${lng.toFixed(2)}`;

// ─── Supabase client ──────────────────────────────────────────────────

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// ─── Main handler ─────────────────────────────────────────────────────

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

  const zone = detectZone(lat!, lng!);
  const isLocal = zone === "lisbon";
  const isIntl  = !isLocal;

  // Toutes les sources tournent en parallèle.
  // Ticketmaster : toutes zones (concerts internationaux passent par Lisbonne aussi).
  // Local (Lisbonne) : + Songkick + Meetup.
  const NO_EVENTS: Awaited<ReturnType<typeof near>> = [];

  const [dbSpots, ebEvents, muEvents, tmEvents, skEvents] = await Promise.all([
    near(lat!, lng!, wanted),
    fetchEventbriteEvents(lat!, lng!, wanted),                             // dormant
    isLocal ? fetchMeetupEvents(lat!, lng!, wanted)   : Promise.resolve(NO_EVENTS),
    fetchTicketmasterEvents(lat!, lng!, wanted),                           // toutes zones
    isLocal ? fetchSongkickEvents(lat!, lng!, wanted) : Promise.resolve(NO_EVENTS),
  ]);

  let spots = dbSpots;
  let sweeps = 0;

  if (PLACES_ENABLED && spots.length < MIN_RESULTS) {
    sweeps = await warm(lat!, lng!, wanted);
    if (sweeps > 0) spots = await near(lat!, lng!, wanted);
  }

  const events = [...ebEvents, ...muEvents, ...tmEvents, ...skEvents];

  // Backfill descriptions — tous les spots sans commentaire (places ET spots manuels).
  // Ne touche jamais les MEMBER_DROP (texte personnel du membre).
  // Max 10 par requête : progressif, latence nulle une fois tout décrit.
  const needDesc = spots
    .filter((s) => !s.commentaire && s.kind !== "MEMBER_DROP")
    .slice(0, 10);

  console.log("backfill: needDesc=", needDesc.length, "wanted=", wanted[0] ?? "none");

  if (needDesc.length > 0 && wanted.length > 0) {
    const generated = await batchDescribe(
      needDesc.map((s) => ({ name: String(s.activite ?? ""), type: s.lieu_type as string | null })),
      wanted[0],
    );
    console.log("backfill: generated=", JSON.stringify(generated?.slice(0, 3)));
    await Promise.all(needDesc.map(async (s, i) => {
      const desc = generated[i];
      if (!desc) return;
      if (s.source === "place") {
        // Google Places → places.descriptions JSONB
        const { data: prev } = await sb
          .from("places").select("descriptions").eq("place_id", s.id).maybeSingle();
        const existing = (prev?.descriptions ?? {}) as Record<string, string>;
        await sb.from("places")
          .update({ descriptions: { ...existing, [wanted[0]]: desc } })
          .eq("place_id", s.id);
      } else {
        // Spot seedé manuellement → spots.commentaire
        await sb.from("spots").update({ commentaire: desc }).eq("id", s.id);
      }
      (s as Record<string, unknown>).commentaire = desc;
    }));
  }

  return Response.json({
    spots: [...spots, ...events],
    intention: asked,
    intentions: mine,
    origin: { lat, lng, fallback },
    zone,
    radius_m: RADIUS_M,
    sweeps,
    places_enabled: PLACES_ENABLED,
    events_count: events.length,
    eb_count: ebEvents.length,
    mu_count: muEvents.length,
    tm_count: tmEvents.length,
    sk_count: skEvents.length,
  }, { headers: cors });
});

// ─── spots Supabase ───────────────────────────────────────────────────

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
    energy_mode:   r.energy_mode,
  }));
}

// ─── Eventbrite adapter ───────────────────────────────────────────────
// API publique bloquée depuis 2021 — conservé pour activation future.
// Pour débloquer : soumettre une demande à api@eventbrite.com.

async function fetchEventbriteEvents(
  lat: number,
  lng: number,
  intentions: string[],
): Promise<ReturnType<typeof near>> {
  const key = Deno.env.get("EVENTBRITE_API_KEY");
  if (!key) return [];

  const keyword = EB_KEYWORDS[intentions[0]]?.split(" ")[0] ?? "event";

  const params = new URLSearchParams({
    "q":                  keyword,
    "location.latitude":  String(lat),
    "location.longitude": String(lng),
    "location.within":    `${EVENT_RADIUS_KM}km`,
    "expand":             "venue",
    "sort_by":            "date",
    "page_size":          "15",
  });

  try {
    const r = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?${params}`,
      { headers: { "Authorization": `Bearer ${key}` } },
    );
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.error("eventbrite", r.status, txt.slice(0, 200));
      return [];
    }
    const j = await r.json();
    const now = Date.now();

    return ((j.events ?? []) as Record<string, unknown>[])
      .filter((e) => {
        const venue = e.venue as Record<string, unknown> | null;
        if (!venue?.latitude || !venue?.longitude) return false;
        const start = (e.start as Record<string, unknown>)?.utc as string | null;
        if (start && new Date(start).getTime() < now) return false;
        return true;
      })
      .map((e) => {
        const venue   = e.venue as Record<string, unknown>;
        const start   = (e.start as Record<string, unknown>).utc as string;
        const end     = (e.end as Record<string, unknown> | null)?.utc as string | null;
        const elat    = Number(venue.latitude);
        const elng    = Number(venue.longitude);
        const nameObj = e.name as Record<string, unknown>;
        const descObj = e.description as Record<string, unknown> | null;

        return {
          id:            `eb_${e.id}`,
          source:        "eventbrite",
          kind:          "LIVE_EVENT",
          activite:      (nameObj?.text as string | null) ?? "Event",
          intention:     intentions[0],
          lieu_type:     "event",
          commentaire:   (descObj?.text as string | null)?.slice(0, 200) ?? null,
          state_of_mind: null,
          vibe:          null,
          tags:          [],
          member_count:  0,
          ends_at:       end ?? start,
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

// ─── Meetup adapter ───────────────────────────────────────────────────
// GraphQL API — communautés locales.
// Actif uniquement en zone locale (Lisbonne).

async function fetchMeetupEvents(
  lat: number,
  lng: number,
  intentions: string[],
): Promise<ReturnType<typeof near>> {
  const token = Deno.env.get("MEETUP_ACCESS_TOKEN");
  if (!token) return [];

  const keyword = MEETUP_KEYWORDS[intentions[0]] ?? "social";

  const query = `
    query {
      keywordSearch(
        filter: {
          query: "${keyword}"
          lat: ${lat}
          lon: ${lng}
          radius: ${EVENT_RADIUS_KM}
          source: EVENTS
          startDateRange: "${new Date().toISOString()}"
        }
        input: { first: 15 }
      ) {
        edges {
          node {
            result {
              ... on Event {
                id
                title
                dateTime
                endTime
                eventUrl
                venue {
                  lat
                  lng
                  city
                }
                description
                group {
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const r = await fetch("https://api.meetup.com/gql", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!r.ok) {
      console.error("meetup", r.status);
      return [];
    }

    const j = await r.json();
    const edges = j?.data?.keywordSearch?.edges ?? [];

    return (edges as Record<string, unknown>[])
      .map((edge) => {
        const node   = (edge.node as Record<string, unknown>)?.result as Record<string, unknown> | null;
        if (!node?.title) return null;

        const venue  = node.venue as Record<string, unknown> | null;
        const elat   = venue?.lat ? Number(venue.lat) : null;
        const elng   = venue?.lng ? Number(venue.lng) : null;
        if (!elat || !elng) return null;

        const desc = (node.description as string | null)?.slice(0, 200) ?? null;

        return {
          id:            `mu_${node.id}`,
          source:        "meetup",
          kind:          "LIVE_EVENT",
          activite:      (node.title as string) ?? "Meetup",
          intention:     intentions[0],
          lieu_type:     "meetup",
          commentaire:   desc,
          state_of_mind: null,
          vibe:          null,
          tags:          [],
          member_count:  0,
          ends_at:       (node.endTime as string | null) ?? (node.dateTime as string | null),
          lat:           elat,
          lng:           elng,
          dist_m:        Math.round(haversine(lat, lng, elat, elng)),
          duration_min:  null,
        };
      })
      .filter(Boolean) as ReturnType<typeof near>;
  } catch (e) {
    console.error("meetup fetch failed:", (e as Error).message);
    return [];
  }
}

// ─── Ticketmaster Discovery API ───────────────────────────────────────
// Plan gratuit, 5 000 req/jour.
// Actif uniquement hors zone locale (international).
// Zéro couverture Portugal — pertinent pour les membres hors Lisbonne.

async function fetchTicketmasterEvents(
  lat: number,
  lng: number,
  intentions: string[],
): Promise<ReturnType<typeof near>> {
  const key = Deno.env.get("TICKETMASTER_API_KEY");
  if (!key) return [];

  const classifications = TM_CLASSIFICATIONS[intentions[0]] ?? ["Music"];

  const results: ReturnType<typeof near> = [];

  for (const classif of classifications.slice(0, 2)) {
    const params = new URLSearchParams({
      "apikey":              key,
      "latlong":            `${lat},${lng}`,
      "radius":             String(EVENT_RADIUS_KM),
      "unit":               "km",
      "classificationName": classif,
      "size":               "10",
      "sort":               "date,asc",
    });

    try {
      const r = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
      );
      if (!r.ok) { console.error("ticketmaster", r.status); continue; }
      const j = await r.json();

      const events = (j?._embedded?.events ?? []) as Record<string, unknown>[];
      const now = Date.now();

      for (const e of events) {
        const dates  = e.dates as Record<string, unknown>;
        const start  = (dates?.start as Record<string, unknown>)?.dateTime as string | null;
        const end    = (dates?.end   as Record<string, unknown>)?.dateTime as string | null;
        if (start && new Date(start).getTime() < now) continue;

        const embedded = e._embedded as Record<string, unknown> | null;
        const venue    = ((embedded?.venues as unknown[]) ?? [])[0] as Record<string, unknown> | null;
        const loc      = venue?.location as Record<string, unknown> | null;
        const elat     = loc?.latitude  ? Number(loc.latitude)  : null;
        const elng     = loc?.longitude ? Number(loc.longitude) : null;
        if (!elat || !elng) continue;

        if (results.find((r) => r.id === `tm_${e.id}`)) continue;

        results.push({
          id:            `tm_${e.id}`,
          source:        "ticketmaster",
          kind:          "LIVE_EVENT",
          activite:      (e.name as string) ?? "Event",
          intention:     intentions[0],
          lieu_type:     classif.toLowerCase().replace(" & ", "_"),
          commentaire:   (venue?.name as string | null) ?? null,
          state_of_mind: null,
          vibe:          null,
          tags:          [],
          member_count:  0,
          ends_at:       end ?? start,
          lat:           elat,
          lng:           elng,
          dist_m:        Math.round(haversine(lat, lng, elat, elng)),
          duration_min:  null,
        });
      }
    } catch (e) {
      console.error("ticketmaster fetch failed:", (e as Error).message);
    }
  }

  return results;
}

// ─── Songkick adapter ─────────────────────────────────────────────────
// Concerts et festivals — forte couverture Portugal/Lisbonne.
// Plan gratuit, 5 000 req/jour.
// Actif uniquement en zone locale (Lisbonne).

async function fetchSongkickEvents(
  lat: number,
  lng: number,
  intentions: string[],
): Promise<ReturnType<typeof near>> {
  const key = Deno.env.get("SONGKICK_API_KEY");
  if (!key) return [];

  const today = new Date().toISOString().slice(0, 10);

  const params = new URLSearchParams({
    apikey:   key,
    location: `geo:${lat},${lng}`,
    per_page: "20",
    min_date: today,
  });

  try {
    const r = await fetch(
      `https://api.songkick.com/api/3.0/events.json?${params}`,
    );
    if (!r.ok) {
      console.error("songkick", r.status);
      return [];
    }
    const j = await r.json();
    const now = Date.now();

    const evts = (j?.resultsPage?.results?.event ?? []) as Record<string, unknown>[];

    return evts
      .filter((e) => {
        if (e.status !== "ok") return false;
        const venue = e.venue as Record<string, unknown> | null;
        if (!venue?.lat || !venue?.lng) return false;
        const start = (e.start as Record<string, unknown>)?.datetime as string | null;
        if (start && new Date(start).getTime() < now) return false;
        return true;
      })
      .map((e) => {
        const venue  = e.venue  as Record<string, unknown>;
        const start  = e.start  as Record<string, unknown>;
        const end    = e.end    as Record<string, unknown> | null;
        const elat   = Number(venue.lat);
        const elng   = Number(venue.lng);
        const perfs  = (e.performance as Record<string, unknown>[]) ?? [];
        const artist = perfs[0]
          ? ((perfs[0].artist as Record<string, unknown>)?.displayName as string | null)
          : null;

        return {
          id:            `sk_${e.id}`,
          source:        "songkick",
          kind:          "LIVE_EVENT",
          activite:      (e.displayName as string) ?? artist ?? "Concert",
          intention:     intentions[0],
          lieu_type:     ((e.type as string) ?? "concert").toLowerCase(),
          commentaire:   (venue.displayName as string | null) ?? null,
          state_of_mind: null,
          vibe:          null,
          tags:          [],
          member_count:  0,
          ends_at:       (end?.datetime as string | null)
                         ?? (start?.datetime as string | null)
                         ?? (start?.date as string | null) ?? null,
          lat:           elat,
          lng:           elng,
          dist_m:        Math.round(haversine(lat, lng, elat, elng)),
          duration_min:  null,
        };
      });
  } catch (e) {
    console.error("songkick fetch failed:", (e as Error).message);
    return [];
  }
}

// ─── OpenAI — descriptions intention-spécifiques (batch) ─────────────
// 1 appel par sweep de cellule (max 3/requête utilisateur).
// Coût : ~0,00003 $ par description. ~0,10 $ pour 500 lieux × 7 intentions.
// Cache permanent : la description générée une fois n'est jamais régénérée.

async function batchDescribe(
  places: { name: string; type: string | null }[],
  intention: string,
): Promise<(string | null)[]> {
  const key = Deno.env.get("OPENAI_API_KEY");
  console.log("batchDescribe: key=", !!key, "places=", places.length, "intention=", intention);
  if (!key || places.length === 0) return places.map(() => null);

  const tone = INTENTION_TONES[intention];
  if (!tone) return places.map(() => null);

  const allTones = Object.values(INTENTION_TONES).join("\n");
  const list = places.map((p, i) => `${i + 1}. "${p.name}" (${p.type ?? "place"})`).join("\n");

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: places.length * 25,
        temperature: 0.75,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a mentor writing one line about a place, to one person, right now.
Voice: the mentor named for the intention (Goggins, Watts, Naval, Perel, Abloh, Jobs, Bourdain).
Speak AS them — not about them.

RULES (all mandatory):
1. Max 8 words. Count them. If you exceed, cut.
2. Contain one physical anchor: an object, a texture, a sound, a smell, a body part, a piece of gear.
   Not "quiet" — "the back bench". Not "energetic" — "brass, sweat, low bass".
3. No motivational cliché: no "unlock", "vibrant", "hidden gem", "must-visit",
   "elevate", "journey", "embrace", "immerse", "experience", "vibe".
4. No adjective flood. One noun beats three modifiers.
5. No ending punctuation. No emoji. No quotes around the line.

Mental states (pick the one for the intention below):
${allTones}

Output JSON only: {"descriptions":["...","...",...]} — one per input place, same order.`,
          },
          {
            role: "user",
            content: `Intention: ${intention.toUpperCase()} — ${tone}\n\nPlaces:\n${list}`,
          },
        ],
      }),
    });

    if (!r.ok) { console.error("openai batch", r.status); return places.map(() => null); }

    const j    = await r.json();
    const raw  = j.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const descs  = parsed.descriptions;

    if (!Array.isArray(descs)) return places.map(() => null);
    return places.map((_, i) =>
      typeof descs[i] === "string" ? (descs[i] as string).slice(0, 120) : null,
    );
  } catch (e) {
    console.error("openai batch failed:", (e as Error).message);
    return places.map(() => null);
  }
}

// ─── Google Places cache (warm) ───────────────────────────────────────

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

      type DescTarget = { place_id: string; name: string; type: string | null; existing: Record<string, string> };
      const toDescribe: DescTarget[] = [];

      for (const p of rows) {
        const { data: prev } = await sb
          .from("places").select("intentions, descriptions").eq("place_id", p.id).maybeSingle();
        const merged        = [...new Set([...(prev?.intentions ?? []), intention])];
        const existingDescs = (prev?.descriptions ?? {}) as Record<string, string>;

        await sb.from("places").upsert({
          place_id:     p.id,
          name:         p.displayName?.text ?? "place",
          intentions:   merged,
          lieu_type:    p.primaryType ?? null,
          address:      p.formattedAddress ?? null,
          lat:          p.location.latitude,
          lng:          p.location.longitude,
          refreshed_at: new Date().toISOString(),
          descriptions: existingDescs,
        }, { onConflict: "place_id" });

        // Nouveau pour cette intention → à décrire
        if (!existingDescs[intention]) {
          toDescribe.push({
            place_id: p.id as string,
            name:     p.displayName?.text ?? "place",
            type:     p.primaryType ?? null,
            existing: existingDescs,
          });
        }
      }

      // 1 seul appel OpenAI pour tous les nouveaux lieux de ce sweep
      if (toDescribe.length > 0) {
        const generated = await batchDescribe(
          toDescribe.map((t) => ({ name: t.name, type: t.type })),
          intention,
        );
        for (let i = 0; i < toDescribe.length; i++) {
          const desc = generated[i];
          if (!desc) continue;
          await sb.from("places")
            .update({ descriptions: { ...toDescribe[i].existing, [intention]: desc } })
            .eq("place_id", toDescribe[i].place_id);
        }
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
