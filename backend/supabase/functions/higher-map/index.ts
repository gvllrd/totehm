// TOTEHM · higher-map
// Localisation → Google Places (si clé) ou spots en base (fallback)
// filtré par les intentions du Totehm du membre.
// 402 si pas membre · reason:'no_intention' si aucune intention posée
// verify_jwt = true

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_SPACE } from "../_shared/origins.ts";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// Intentions TOTEHM → types Google Places
const GOOGLE_TYPES: Record<string, string> = {
  fight:     "gym",
  flow:      "park",
  enrich:    "museum",
  love:      "cafe",
  express:   "art_gallery",
  focus:     "library",
  celebrate: "restaurant",
};

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"), SITE_SPACE);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Auth
  const { data: { user }, error: authErr } = await sb.auth.getUser(
    (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
  );
  if (authErr || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  // Membership — 402 si non membre ou trial expiré
  const { data: sub } = await sb
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (!sub) {
    return Response.json({ error: "members only" }, { status: 402, headers: cors });
  }

  // Intentions du membre via ses habitudes
  const { data: totehm } = await sb
    .from("totehms")
    .select("steps")
    .eq("user_id", user.id)
    .maybeSingle();

  // Les steps utilisent 'i' comme clé compacte pour intention (f/i/t).
  // On accepte aussi 'intention' pour éviter toute régression.
  const steps: { i?: string; intention?: string }[] = totehm?.steps ?? [];
  const intentions = [...new Set(
    steps.map((s) => s.i || s.intention).filter(Boolean),
  )] as string[];

  if (!intentions.length) {
    return Response.json({ reason: "no_intention" }, { headers: cors });
  }

  // Position depuis le body (mise en cache par cityBoot côté front)
  let lat: number | null = null;
  let lng: number | null = null;
  try {
    const body = await req.json();
    if (typeof body.lat === "number") lat = body.lat;
    if (typeof body.lng === "number") lng = body.lng;
  } catch { /* pas de body = pas de coords, fallback DB */ }

  const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

  const spots = googleKey && lat !== null && lng !== null
    ? await fromGoogle(lat, lng, intentions, googleKey)
    : await fromDB(intentions, lat, lng);

  return Response.json({ spots, intentions }, { headers: cors });
});

// ─── Google Places Nearby Search ─────────────────────────────────────────────

async function fromGoogle(
  lat: number, lng: number, intentions: string[], key: string,
): Promise<object[]> {
  const results: object[] = [];
  const seen = new Set<string>();

  for (const intention of intentions) {
    const type = GOOGLE_TYPES[intention];
    if (!type) continue;

    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", "1500");
    url.searchParams.set("type", type);
    url.searchParams.set("key", key);

    try {
      const r = await fetch(url.toString());
      const j = await r.json();
      for (const p of (j.results ?? []).slice(0, 4)) {
        if (seen.has(p.place_id)) continue;
        seen.add(p.place_id);
        results.push({
          activite:    p.name,
          lieu_type:   type,
          commentaire: p.vicinity ?? null,
          intention,
          duration_min: null,
          lat: p.geometry?.location?.lat ?? null,
          lng: p.geometry?.location?.lng ?? null,
        });
      }
    } catch (e) {
      console.error("google places error:", intention, e.message);
    }
  }

  return results.slice(0, 12);
}

// ─── Fallback — spots en base ─────────────────────────────────────────────────

async function fromDB(
  intentions: string[], lat: number | null, lng: number | null,
): Promise<object[]> {
  const now = new Date().toISOString();

  const { data, error } = await sb
    .from("spots")
    .select("activite, lieu_type, commentaire, intention, duration_min, lat, lng")
    .in("intention", intentions)
    .eq("is_public", true)
    .eq("active", true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .limit(20);

  if (error) {
    console.error("spots query error:", error.message);
    return [];
  }

  const rows = data ?? [];

  // Tri par proximité si coords disponibles
  if (lat !== null && lng !== null) {
    rows.sort((a, b) => {
      const da = Math.hypot((a.lat ?? 0) - lat, (a.lng ?? 0) - lng);
      const db = Math.hypot((b.lat ?? 0) - lat, (b.lng ?? 0) - lng);
      return da - db;
    });
  }

  return rows.slice(0, 12);
}
