// TOTEHM · higher-map v15 — LA CARTE S'OUVRE SUR UN OBJECTIF
//
// CE QUI CHANGE EN v15, et c'est le produit entier qui bascule
//   La carte ne demande plus « quelle intention ». Elle demande
//   « quel objectif », et elle range le monde contre les habitudes qui
//   servent CET objectif. Un trip, c'est un WHY (l'objectif), des HOW
//   (les habitudes) et ce qui les protège (les répulsions) — la carte
//   sert le premier en lisant les seconds.
//
//   Techniquement, RIEN de neuf : `places_matching_habits` classait déjà
//   par cosine entre l'embedding d'un lieu et le TEXTE d'une habitude.
//   L'intention n'a jamais été qu'un préfiltre grossier. On change donc
//   seulement QUELLES habitudes entrent dans le calcul.
//
//   `trip` absent  → toutes les habitudes du membre (comportement v14).
//   `trip` = uuid  → seulement celles rattachées à ce trip.
//   trip sans habitude → `reason:'trip_empty'`, jamais un radar vide sans
//   explication. Un écran vide qui ne dit pas quoi faire est un bug.
//
// TOTEHM · higher-map v14 — GOOGLE MAPS + TICKETMASTER, MONDIAL
// ─────────────────────────────────────────────────────────────────────
// CE QUE RÉPOND CETTE FONCTION
//   Trois couches, un seul classement, partout sur la planète.
//
//     MEMBER_DROP   un membre a posé ce lieu depuis TotehmBot   (table spots)
//     PLACE         Google Places, mis en cache par cellule      (table places)
//     LIVE_EVENT    Ticketmaster Discovery, mis en cache         (table live_events)
//
//   Chaque ligne est RANGÉE, pas filtrée : cosine similarity entre
//   l'embedding du lieu (ou de l'événement) et l'habitude précise du membre
//   pour cette intention. Google Maps montre ce qui existe, TOTEHM montre ce
//   qui te correspond, dans cet ordre.
//
// CE QUI A CHANGÉ EN v13 — et pourquoi
//
//   1. TROIS ADAPTATEURS SUPPRIMÉS. Mesuré dans les logs edge du 03/09 :
//      Eventbrite renvoyait 404 à CHAQUE ouverture du radar (API publique
//      fermée depuis 2021, la clé était posée, l'appel partait quand même).
//      Songkick et Meetup n'ont jamais renvoyé une ligne : la première est
//      fermée aux nouveaux comptes, la seconde exige un plan Pro payant.
//      Trois adaptateurs morts qui coûtaient une latence à chaque clic.
//
//   2. TICKETMASTER PASSE EN CACHE. Il était appelé en direct, sans cache
//      et sans plafond, à chaque ouverture. 1 000 membres × 10 ouvertures =
//      40 000 appels/jour pour un quota gratuit de 5 000 : le radar se
//      coupait tout seul. Désormais une cellule de 0,1° (~11 km) balayée
//      toutes les 12 h. Le deuxième membre d'une ville ne coûte rien.
//
//   3. L'ÉVÉNEMENT EST RANGÉ COMME UNE PLACE. Il portait `rank_tier: 3` en
//      dur — c'est-à-dire la périphérie du radar, opacity .5, systématiquement.
//      La moitié Ticketmaster du produit était affichée comme un déchet.
//      Il est maintenant embedé une fois et classé par correspondance.
//
//   4. L'INTENTION VIENT DE L'ÉVÉNEMENT, PLUS DE `intentions[0]`. Tous les
//      adaptateurs étiquetaient chaque événement avec la PREMIÈRE intention
//      demandée. Sur la vue « toutes intentions », un match de boxe était
//      rangé dans Love parce que Love arrivait en tête de la liste.
//
//   5. LE REPLI SANS OPENAI NE RENVOIE PLUS ZÉRO. `matchNear` appelait
//      `nearIntentionOnly` avec la liste d'intentions déduite d'un tableau
//      VIDE — donc `[]`, donc aucune ligne. Le jour où OpenAI tombe, le
//      radar était vide au lieu d'être simplement moins bien rangé.
//
// COÛT — vérifié avant d'écrire, doctrine CLAUDE.md
//   Ticketmaster : gratuit, 5 000 req/jour. Plafond posé à 3 000.
//   Google Places : plafond 200/jour, inchangé.
//   OpenAI : embeddings ~20 tokens par événement NOUVEAU, une fois.
//            ~1 $/mois à 1 000 membres contre 6 750 € d'ARPU.
//
// verify_jwt = true
// ─────────────────────────────────────────────────────────────────────

import { createClient } from "npm:@supabase/supabase-js@2";
// Une seule liste d'origines pour tout le backend — c'est la raison d'être
// de _shared/origins.ts. La v12 en redéclarait une copie locale.
import { corsHeaders, SITE_SPACE } from "../_shared/origins.ts";
// La couche live est partagée avec bot-reply (/tonight) : deux adaptateurs
// Ticketmaster finiraient par ne plus proposer la même soirée.
import { liveWarm, embedTexts, LIVE_RADIUS_M, LIVE_HORIZON_D } from "../_shared/live.ts";

const FALLBACK        = { lat: 38.7078, lng: -9.1366 };   // Praça do Comércio
const RADIUS_M        = 4000;    // lieux physiques : ce qui se rejoint à pied
const MIN_RESULTS     = 8;
const CELL_TTL_DAYS   = 90;      // Google : un café ne déménage pas
const MAX_SWEEPS      = 3;
const DAILY_BUDGET    = 200;     // Google, payant
const MERGED_LIMIT    = 40;

// ─── Google : intention → types de lieux ─────────────────────────────
const GOOGLE_TYPES: Record<string, string[]> = {
  fight:     ["gym", "fitness_center", "sports_complex"],
  flow:      ["park", "hiking_area", "swimming_pool"],
  enrich:    ["book_store", "university", "convention_center"],
  love:      ["cafe", "garden", "tourist_attraction"],
  express:   ["art_gallery", "art_studio", "performing_arts_theater"],
  focus:     ["library", "coffee_shop"],
  celebrate: ["night_club", "bar", "concert_hall"],
};

// ─── Ton de chaque intention — injecté dans le prompt OpenAI ─────────
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
// Cellule Google : 0,01° ≈ 1,1 km — un café se cherche à la rue près.
// (La cellule live, dix fois plus grosse, vit dans _shared/live.ts.)
const cellOf = (lat: number, lng: number) => `${lat.toFixed(2)},${lng.toFixed(2)}`;

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// ─── Main handler ─────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"), SITE_SPACE);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { data: { user }, error: authErr } = await sb.auth.getUser(
    (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
  );
  if (authErr || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  // .limit(1), jamais .maybeSingle() : deux lignes actives rendaient un 402
  // à un membre qui paie.
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

  // On garde le tuple complet (texte + intention). Le texte fait le
  // matching sémantique ; l'intention est la CLÉ DE JOINTURE vers le monde
  // (places.intentions[], spots.intention, live_events.intentions[]).
  //
  // ⚠️ v14 · 04/09/2026 — DEPUIS LE TRIP, UNE HABITUDE N'A PLUS D'INTENTION.
  // Le membre ne la choisit plus : il range son habitude sous un objectif.
  // Le filtre d'avant était `.filter((h) => h.intention && h.text)` : il
  // JETAIT toute habitude sans `i`. Tant que l'écran forçait le choix,
  // personne ne le voyait. Le jour où plus aucune nouvelle habitude n'en
  // porte, `mine` devient vide, la fonction renvoie `no_intention`, et la
  // carte est noire pour tout nouveau membre. Aucun message, aucune erreur.
  //
  // On DÉDUIT donc les intentions du texte, côté base, en UN appel pour
  // tout le Totehm (`habits_intentions`) : déterministe, zéro appel IA,
  // Seed reste gratuit.
  //
  // Et une habitude peut en servir PLUSIEURS : « méditer dans les espaces
  // verts » est flow ET love. On la duplique donc une fois par intention,
  // toutes partageant le même embedding — l'intention n'est qu'un préfiltre
  // grossier, le cosine tranche derrière. Être généreux ici coûte quelques
  // lignes de candidats ; se tromper coûte un écran vide.
  // `o` porte l'uuid du trip que sert cette habitude. Absent = pas encore
  // rangée : elle compte quand même, dans la vue « tous les objectifs ».
  const steps: { t?: string; i?: string; intention?: string; o?: string }[] =
    totehms?.[0]?.steps ?? [];
  const rawHabits = steps
    .map((s) => ({
      intention: (s.i || s.intention || "").trim(),
      text:      String(s.t ?? "").trim(),
      trip:      String(s.o ?? "").trim(),
    }))
    .filter((h) => h.text);

  // Un seul aller-retour, et seulement pour celles qui n'ont pas de choix.
  const needDerive = rawHabits.filter((h) => !h.intention).map((h) => h.text);
  let derived: Record<string, string[]> = {};
  if (needDerive.length) {
    const { data, error } = await sb.rpc("habits_intentions", { p_texts: needDerive });
    // Une erreur de RPC se journalise, toujours. Sans ce log, une carte vide
    // ne dirait pas si c'est la ville qui est vide ou la fonction qui casse.
    if (error) console.error("habits_intentions:", error.message);
    derived = (data ?? {}) as Record<string, string[]>;
  }

  const userHabits = rawHabits.flatMap((h) =>
    (h.intention ? [h.intention] : (derived[h.text] ?? []))
      .map((intention) => ({ intention, text: h.text, trip: h.trip }))
  );
  const mine = [...new Set(userHabits.map((h) => h.intention))];

  if (!mine.length) {
    // Plus « pas d'intention » : le membre n'en pose plus. C'est qu'il n'a
    // écrit aucune habitude — le message doit dire ça, pas autre chose.
    return Response.json({ reason: "no_habit" }, { headers: cors });
  }

  // ── LES TRIPS, POUR LE SÉLECTEUR ────────────────────────────────────
  // Servis à CHAQUE réponse : le sélecteur de la carte se construit sur
  // eux, et un sélecteur qui doit faire son propre appel affiche un cadre
  // vide pendant une seconde à chaque ouverture.
  //
  // ⚠️ ON NE FILTRE PAS LE STATUT EN SQL ICI. `not("status","in",...)` se
  // traduit par `NOT (status IN (...))`, qui vaut NULL — donc FAUX — quand
  // `status` est nul. La colonne est nullable : un objectif sans statut
  // aurait disparu du sélecteur, sans erreur et sans qu'on sache pourquoi.
  // `my_trips()` fait `coalesce(status,'active')` ; les deux chemins doivent
  // dire la même chose du même objectif, sinon le sélecteur et l'écran des
  // trips finiront par ne pas lister les mêmes.
  const CLOSED = ["done", "dropped", "closed"];
  const { data: trips, error: tripsErr } = await sb
    .from("objectives")
    .select("id, text, target_at, status")
    .eq("user_id", user.id)
    .order("target_at", { ascending: true, nullsFirst: false });
  if (tripsErr) console.error("objectives:", tripsErr.message);

  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const myTrips = (trips ?? [])
    .filter((t: Record<string, unknown>) => !CLOSED.includes(String(t.status ?? "active")))
    .map((t: Record<string, unknown>) => ({
    id:    t.id,
    text:  t.text,
    target_at: t.target_at,
    // Le compte à rebours est calculé ICI : un client qui compare des dates
    // compare aussi son horloge, et celle d'un téléphone ment souvent.
    days_left: t.target_at
      ? Math.round((new Date(String(t.target_at)).setUTCHours(0, 0, 0, 0) - today.getTime()) / 864e5)
      : null,
    habit_count: rawHabits.filter((h) => h.trip === String(t.id)).length,
  }));
  const loose_count = rawHabits.filter((h) => !h.trip).length;

  let lat: number | null = null, lng: number | null = null;
  let asked: string | null = null;
  let trip:  string | null = null;
  try {
    const body = await req.json();
    if (Number.isFinite(body?.lat)) lat = body.lat;
    if (Number.isFinite(body?.lng)) lng = body.lng;
    if (typeof body?.intention === "string") asked = body.intention;
    if (typeof body?.trip === "string" && body.trip !== "all") trip = body.trip;
  } catch { /* pas de body */ }

  // ── LE FILTRE PAR TRIP — c'est lui, le changement de v15 ────────────
  // On ne restreint pas les INTENTIONS, on restreint les HABITUDES. Le
  // classement reste identique : cosine entre le lieu et le texte de
  // l'habitude. L'intention suit, déduite, invisible.
  let habitPool = userHabits;
  if (trip) {
    if (!myTrips.some((t) => String(t.id) === trip)) {
      return Response.json({ reason: "not_your_trip", trips: myTrips },
        { status: 403, headers: cors });
    }
    habitPool = userHabits.filter((h) => h.trip === trip);
    if (!habitPool.length) {
      // Un radar vide sans explication est un bug. On dit ce qui manque.
      return Response.json(
        { reason: "trip_empty", trip, trips: myTrips, loose_count },
        { headers: cors },
      );
    }
  }
  const poolIntentions = [...new Set(habitPool.map((h) => h.intention))];

  if (asked && !poolIntentions.includes(asked)) {
    return Response.json(
      { reason: "not_your_intention", intentions: poolIntentions },
      { status: 403, headers: cors },
    );
  }
  const wanted = asked ? [asked] : poolIntentions;

  const fallback = lat === null || lng === null;
  if (fallback) { lat = FALLBACK.lat; lng = FALLBACK.lng; }

  const wantedHabits = habitPool.filter((h) => wanted.includes(h.intention));
  const habitsWithEmbeddings = await embedHabits(wantedHabits);

  // Google et Ticketmaster ne s'attendent pas l'un l'autre.
  const [placesRows, liveWarmed] = await Promise.all([
    matchNear(lat!, lng!, habitsWithEmbeddings, wanted),
    liveWarm(sb, lat!, lng!),
  ]);

  let places = placesRows;
  let sweeps = 0;
  if (googleOn() && places.length < MIN_RESULTS) {
    sweeps = await warm(lat!, lng!, wanted);
    if (sweeps > 0) places = await matchNear(lat!, lng!, habitsWithEmbeddings, wanted);
  }

  const live = await liveNear(lat!, lng!, habitsWithEmbeddings, wanted);

  // Backfill des descriptions — max 10 par requête, jamais sur un MEMBER_DROP
  // (c'est le texte du membre) ni sur un LIVE_EVENT (le lieu est la salle).
  await backfillDescriptions(places, wanted);

  // Le classement est commun aux deux couches : c'est ce qui fait qu'un
  // concert peut passer devant un café. Sans ça, la moitié Ticketmaster du
  // produit reste toujours derrière la moitié Google.
  const merged = [...places, ...live]
    .sort((a, b) =>
      (a.rank_tier ?? 3) - (b.rank_tier ?? 3) ||
      (b.score ?? -1) - (a.score ?? -1) ||
      (a.dist_m ?? 0) - (b.dist_m ?? 0))
    .slice(0, MERGED_LIMIT);

  return Response.json({
    spots:          merged,
    intention:      asked,
    intentions:     poolIntentions,
    trip,
    trips:          myTrips,
    loose_count,
    origin:         { lat, lng, fallback },
    radius_m:       RADIUS_M,
    live_radius_m:  LIVE_RADIUS_M,
    sweeps,
    live_swept:     liveWarmed,
    live_count:     live.length,
    place_count:    places.length,
    places_enabled: googleOn(),
    // Des booléens, jamais des valeurs : on doit pouvoir diagnostiquer une
    // couche éteinte sans jamais faire fuiter un secret dans une réponse.
    sources: {
      google:       googleOn(),
      ticketmaster: liveOn(),
      openai:       !!Deno.env.get("OPENAI_API_KEY"),
    },
  }, { headers: cors });
});

const googleOn = () => !!Deno.env.get("GOOGLE_MAPS_API_KEY");
const liveOn   = () => !!Deno.env.get("TICKETMASTER_API_KEY");

// ═════════════════════════════════════════════════════════════════════
// EMBEDDINGS
// ~20 à 30 tokens par ligne, $0.02/1M. On n'en fait jamais l'économie :
// c'est ce qui distingue « voici des lieux » de « voici TES lieux ».
// ═════════════════════════════════════════════════════════════════════
type HabitWithEmbedding = { intention: string; text: string; embedding: number[] };

async function embedHabits(
  habits: { intention: string; text: string }[],
): Promise<HabitWithEmbedding[]> {
  if (!habits.length) return [];
  // ⚠️ Une habitude est dupliquée une fois par intention depuis v14 : embeder
  // le tableau tel quel paierait trois fois le même texte. On embede les
  // textes UNIQUES, puis on redistribue. À 1 000 membres, c'est la différence
  // entre une facture et une ligne de bruit.
  const uniq = [...new Set(habits.map((h) => h.text))];
  const vectors = await embedTexts(uniq);
  const byText = new Map(uniq.map((t, i) => [t, vectors[i] ?? []]));
  return habits
    .map((h) => ({ intention: h.intention, text: h.text, embedding: byText.get(h.text) ?? [] }))
    .filter((h) => h.embedding.length === 1536);
}

// ═════════════════════════════════════════════════════════════════════
// COUCHE PHYSIQUE — spots + Google Places
// ═════════════════════════════════════════════════════════════════════
type Row = Record<string, unknown> & {
  rank_tier?: number; score?: number | null; dist_m?: number; kind?: string;
};

async function matchNear(
  lat: number, lng: number,
  habits: HabitWithEmbedding[],
  wanted: string[],
): Promise<Row[]> {
  // ⚠️ LE BUG DE LA v12 ÉTAIT ICI. Le repli déduisait les intentions du
  // tableau `habits` — vide par définition dans cette branche — et
  // interrogeait donc `places_near` avec `[]`. Zéro ligne. Le jour où
  // OpenAI tombe, le radar était vide au lieu d'être moins bien rangé.
  if (!habits.length) return nearIntentionOnly(lat, lng, wanted);

  const { data, error } = await sb.rpc("places_matching_habits", {
    p_lat: lat, p_lng: lng,
    p_radius: RADIUS_M,
    p_habits: habits.map((h) => ({
      intention: h.intention, text: h.text, embedding: JSON.stringify(h.embedding),
    })),
    p_include_club: true,
    p_limit: 60,
  });
  if (error) { console.error("places_matching_habits:", error.message); return []; }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.ref, source: r.source, kind: r.kind,
    activite: r.name, intention: r.intention, lieu_type: r.lieu_type,
    commentaire: r.why, state_of_mind: r.state_of_mind, vibe: r.vibe, tags: r.tags,
    member_count: r.member_count, ends_at: r.ends_at, starts_at: null,
    lat: r.lat, lng: r.lng, dist_m: r.dist_m, duration_min: r.duration_min,
    energy_mode: r.energy_mode, score: r.score, matched_habit: r.matched_habit,
    rank_tier: r.rank_tier, url: null,
  }));
}

async function nearIntentionOnly(lat: number, lng: number, intentions: string[]): Promise<Row[]> {
  if (!intentions.length) return [];
  const { data, error } = await sb.rpc("places_near", {
    p_lat: lat, p_lng: lng,
    p_radius: RADIUS_M,
    p_intentions: intentions,
    p_limit: 60,
    p_places: true,
    p_include_club: true,
  });
  if (error) { console.error("places_near fallback:", error.message); return []; }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.ref, source: r.source, kind: r.kind,
    activite: r.name, intention: r.intention, lieu_type: r.lieu_type,
    commentaire: r.why, state_of_mind: r.state_of_mind, vibe: r.vibe, tags: r.tags,
    member_count: r.member_count, ends_at: r.ends_at, starts_at: null,
    lat: r.lat, lng: r.lng, dist_m: r.dist_m, duration_min: r.duration_min,
    energy_mode: r.energy_mode, score: null, matched_habit: null,
    rank_tier: r.kind === "MEMBER_DROP" ? 0 : 3, url: null,
  }));
}

// ═════════════════════════════════════════════════════════════════════
// COUCHE LIVE — Ticketmaster
// ═════════════════════════════════════════════════════════════════════
async function liveNear(
  lat: number, lng: number,
  habits: HabitWithEmbedding[],
  wanted: string[],
): Promise<Row[]> {
  const { data, error } = await sb.rpc("live_near", {
    p_lat: lat, p_lng: lng,
    p_radius: LIVE_RADIUS_M,
    p_habits: habits.map((h) => ({
      intention: h.intention, text: h.text, embedding: JSON.stringify(h.embedding),
    })),
    p_intentions: wanted,
    p_limit: 20,
    p_horizon_days: LIVE_HORIZON_D,
  });
  if (error) { console.error("live_near:", error.message); return []; }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.ref, source: r.source, kind: r.kind,
    activite: r.name, intention: r.intention, lieu_type: r.lieu_type,
    commentaire: r.why, state_of_mind: null, vibe: null, tags: null,
    member_count: null, ends_at: r.ends_at, starts_at: r.starts_at,
    lat: r.lat, lng: r.lng, dist_m: r.dist_m, duration_min: null,
    energy_mode: null, score: r.score, matched_habit: r.matched_habit,
    rank_tier: r.rank_tier,
    url: r.url, venue: r.venue, city: r.city, country: r.country,
    price_min: r.price_min, price_max: r.price_max, currency: r.currency,
  }));
}

// ═════════════════════════════════════════════════════════════════════
// DESCRIPTIONS — la voix du mentor, une fois, puis jamais
// ═════════════════════════════════════════════════════════════════════
async function backfillDescriptions(spots: Row[], wanted: string[]) {
  const needDesc = spots
    .filter((s) => !s.commentaire && s.kind !== "MEMBER_DROP" && s.kind !== "LIVE_EVENT")
    .slice(0, 10);
  if (!needDesc.length || !wanted.length) return;

  const generated = await batchDescribe(
    needDesc.map((s) => ({ name: String(s.activite ?? ""), type: (s.lieu_type as string) ?? null })),
    wanted[0],
  );
  await Promise.all(needDesc.map(async (s, i) => {
    const desc = generated[i];
    if (!desc) return;
    if (s.source === "place") {
      const { data: prev } = await sb
        .from("places").select("descriptions").eq("place_id", s.id).maybeSingle();
      const existing = (prev?.descriptions ?? {}) as Record<string, string>;
      await sb.from("places")
        .update({ descriptions: { ...existing, [wanted[0]]: desc } }).eq("place_id", s.id);
    } else if (s.source === "spot") {
      await sb.from("spots").update({ commentaire: desc }).eq("id", s.id);
    }
    (s as Record<string, unknown>).commentaire = desc;
  }));
}

async function batchDescribe(
  places: { name: string; type: string | null }[],
  intention: string,
): Promise<(string | null)[]> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key || places.length === 0) return places.map(() => null);
  const tone = INTENTION_TONES[intention];
  if (!tone) return places.map(() => null);

  const allTones = Object.values(INTENTION_TONES).join("\n");
  const list = places.map((p, i) => `${i + 1}. "${p.name}" (${p.type ?? "place"})`).join("\n");

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
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
    const j      = await r.json();
    const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
    const descs  = parsed.descriptions;
    if (!Array.isArray(descs)) return places.map(() => null);
    return places.map((_, i) =>
      typeof descs[i] === "string" ? (descs[i] as string).slice(0, 120) : null);
  } catch (e) {
    console.error("openai batch failed:", (e as Error).message);
    return places.map(() => null);
  }
}

// ═════════════════════════════════════════════════════════════════════
// GOOGLE PLACES — cache par cellule, plafond quotidien
// ═════════════════════════════════════════════════════════════════════
async function warm(lat: number, lng: number, intentions: string[]): Promise<number> {
  const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!key) return 0;

  const cell  = cellOf(lat, lng);
  const stale = new Date(Date.now() - CELL_TTL_DAYS * 864e5).toISOString();

  const { data: done } = await sb
    .from("places_cells").select("intention")
    .eq("cell", cell).in("intention", intentions).gt("swept_at", stale);

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

        if (!existingDescs[intention]) {
          toDescribe.push({
            place_id: p.id as string,
            name:     p.displayName?.text ?? "place",
            type:     p.primaryType ?? null,
            existing: existingDescs,
          });
        }
      }

      if (toDescribe.length > 0) {
        const generated = await batchDescribe(
          toDescribe.map((t) => ({ name: t.name, type: t.type })), intention);
        for (let i = 0; i < toDescribe.length; i++) {
          const desc = generated[i];
          if (!desc) continue;
          await sb.from("places")
            .update({ descriptions: { ...toDescribe[i].existing, [intention]: desc } })
            .eq("place_id", toDescribe[i].place_id);
        }
      }

      // Embeddings : sans eux, une place tombe en tier 3 — visible, mais
      // en périphérie. Le radar n'a jamais de trou.
      const toEmbed = rows.map((p: Record<string, unknown>) => {
        const dn = p.displayName as { text?: string } | null;
        return {
          place_id: p.id as string,
          name:     dn?.text ?? "place",
          type:     (p.primaryType as string | null) ?? null,
        };
      });
      if (toEmbed.length > 0) {
        const texts = await Promise.all(toEmbed.map(async (t: { place_id: string; name: string; type: string | null }) => {
          const { data: row } = await sb.from("places")
            .select("descriptions").eq("place_id", t.place_id).maybeSingle();
          const descs = (row?.descriptions ?? {}) as Record<string, string>;
          return [t.name, t.type ?? "", Object.values(descs).join(" · ")].filter(Boolean).join(" — ");
        }));
        const vectors = await embedTexts(texts);
        await Promise.all(toEmbed.map(async (t: { place_id: string }, k: number) => {
          const vec = vectors[k];
          if (!vec || vec.length !== 1536) return;
          await sb.from("places").update({ embedding: JSON.stringify(vec) }).eq("place_id", t.place_id);
        }));
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
