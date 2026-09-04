// ═══════════════════════════════════════════════════════════════════════
// TOTEHM · _shared/live.ts — LA COUCHE LIVE, UNE SEULE FOIS
//
// why : deux fonctions ont besoin d'événements — `higher-map` (le radar)
//       et `bot-reply` (la commande /tonight). Écrire deux fois le même
//       adaptateur Ticketmaster, c'est garantir qu'ils divergeront, et la
//       divergence se verra le jour où la carte et le bot ne proposeront
//       pas la même soirée. Même raison que `_shared/origins.ts`.
//
// how : une cellule de 0,1° (~11 km), balayée au plus toutes les 12 h,
//       plafonnée par `live_budget_take`. Le deuxième membre d'une ville
//       ne coûte rien. Calculer une fois, stocker, interroger à l'infini.
//
// what: `liveWarm()` remplit `live_events` ; `live_near()` (SQL) la lit.
//       Aucune des deux ne décide qui a le droit de voir : c'est
//       l'abonnement, vérifié par l'appelant.
// ═══════════════════════════════════════════════════════════════════════

// Le client Supabase est passé par l'appelant : chaque fonction a déjà le
// sien, en construire un second doublerait les connexions pour rien.
// deno-lint-ignore no-explicit-any
type SB = any;

export const LIVE_RADIUS_M  = 50000;  // on prend un train pour un concert
export const LIVE_HORIZON_D = 45;
const LIVE_TTL_HOURS = 12;            // une affiche bouge, un café non
const LIVE_BUDGET    = 3000;          // quota gratuit 5 000/j — marge gardée

// Cellule live : 0,1° ≈ 11 km. Dix fois plus grosse que la cellule Google
// (0,01°) : le rayon événementiel est de 50 km, une cellule d'un kilomètre
// y serait absurde — 2 000 balayages pour couvrir une ville.
export const liveCellOf = (lat: number, lng: number) =>
  `${lat.toFixed(1)},${lng.toFixed(1)}`;

// ═══════════════════════════════════════════════════════════════════════
// L'ÉVÉNEMENT → LES SEPT INTENTIONS
//
// Ticketmaster classe le monde en 5 segments et ~200 genres. TOTEHM le
// classe en 7 intentions. La traduction se fait ICI, une fois, à
// l'ingestion — jamais à l'affichage, sinon elle se rejoue à chaque clic.
//
// Un événement porte UNE ou DEUX intentions, jamais plus : au-delà il
// remonte partout et ne veut plus rien dire.
// ═══════════════════════════════════════════════════════════════════════
const GENRE_RULES: Array<{ re: RegExp; ints: string[] }> = [
  // Corps — le combat et l'effort
  { re: /boxing|wrestl|martial|mma|ufc|combat|fight/i,             ints: ["fight"] },
  { re: /marathon|running|cycling|triathlon|swim|climb|obstacle/i, ints: ["fight", "flow"] },
  { re: /yoga|pilates|wellness|meditation|breathwork/i,            ints: ["flow"] },
  { re: /football|soccer|basketball|rugby|hockey|baseball|tennis|golf|motorsport|racing|cricket|volleyball/i,
    ints: ["fight", "celebrate"] },

  // Musique — deux familles, deux états
  { re: /jazz|blues|classical|opera|chamber|orchestr|choir|folk|world|new age|acoustic|ambient/i,
    ints: ["love", "express"] },
  { re: /dance|electronic|house|techno|edm|hip-hop|rap|reggae|latin|afro|pop|rock|metal|punk|alternative|r&b|funk|soul/i,
    ints: ["celebrate", "express"] },

  // Scène
  { re: /comedy|stand-?up/i,                                       ints: ["celebrate"] },
  { re: /theat|ballet|dance|circus|magic|performance art|puppet|cabaret|spectacular|cultural|fine art|exhibit/i,
    ints: ["express", "love"] },

  // Tête
  { re: /lecture|seminar|conference|convention|expo|trade show|business|workshop|book|literary|tech|science/i,
    ints: ["enrich", "focus"] },
  { re: /film|cinema|screening|documentary/i,                      ints: ["focus", "love"] },
  { re: /family|children|holiday|fair|festival/i,                  ints: ["celebrate", "love"] },
];

const SEGMENT_DEFAULT: Record<string, string[]> = {
  "Music":          ["celebrate", "express"],
  "Sports":         ["fight"],
  "Arts & Theatre": ["express", "love"],
  "Film":           ["focus", "love"],
  "Miscellaneous":  ["celebrate"],
  "Family":         ["love"],
};

export function intentionsFor(
  segment: string, genre: string, sub: string, name: string,
): string[] {
  const hay = `${genre} ${sub} ${name}`;
  for (const rule of GENRE_RULES) if (rule.re.test(hay)) return rule.ints;
  return SEGMENT_DEFAULT[segment] ?? ["celebrate"];
}

// ═══════════════════════════════════════════════════════════════════════
// EMBEDDINGS — ~20 tokens la ligne, $0.02/1M. Une fois, jamais deux.
// ═══════════════════════════════════════════════════════════════════════
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key || !texts.length) return [];
  try {
    const r = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
    });
    if (!r.ok) { console.error("embed", r.status, (await r.text()).slice(0, 200)); return []; }
    const j = await r.json();
    return ((j.data ?? []) as { embedding: number[] }[]).map((d) => d.embedding ?? []);
  } catch (e) {
    console.error("embed failed:", (e as Error).message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════
// LE BALAYAGE
// Un seul appel Ticketmaster pour toute la cellule — pas une boucle par
// intention. L'API rend 100 événements d'un coup ; on les classe nous-mêmes.
// C'est ce qui fait tenir le quota gratuit à 1 000 membres.
// ═══════════════════════════════════════════════════════════════════════
export async function liveWarm(sb: SB, lat: number, lng: number): Promise<boolean> {
  const key = Deno.env.get("TICKETMASTER_API_KEY");
  if (!key) return false;

  const cell  = liveCellOf(lat, lng);
  const stale = new Date(Date.now() - LIVE_TTL_HOURS * 3600e3).toISOString();

  const { data: fresh } = await sb
    .from("live_cells").select("cell").eq("cell", cell).gt("swept_at", stale).maybeSingle();
  if (fresh) return false;

  const { data: allowed } = await sb.rpc("live_budget_take", { p_max: LIVE_BUDGET });
  if (!allowed) { console.warn("ticketmaster budget reached"); return false; }

  const params = new URLSearchParams({
    apikey:        key,
    latlong:       `${lat.toFixed(3)},${lng.toFixed(3)}`,
    radius:        String(Math.round(LIVE_RADIUS_M / 1000)),
    unit:          "km",
    size:          "100",
    sort:          "date,asc",
    startDateTime: new Date().toISOString().slice(0, 19) + "Z",
    endDateTime:   new Date(Date.now() + LIVE_HORIZON_D * 864e5).toISOString().slice(0, 19) + "Z",
  });

  let events: Record<string, unknown>[] = [];
  try {
    const r = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
    if (!r.ok) {
      console.error("ticketmaster", r.status, (await r.text()).slice(0, 200));
      // La cellule est marquée quand même : un 429 ne doit pas déclencher
      // une rafale de nouvelles tentatives à chaque clic.
      await sb.from("live_cells").upsert(
        { cell, swept_at: new Date().toISOString(), found: 0 }, { onConflict: "cell" });
      return false;
    }
    const j = await r.json();
    events = (j?._embedded?.events ?? []) as Record<string, unknown>[];
  } catch (e) {
    console.error("ticketmaster fetch failed:", (e as Error).message);
    return false;
  }

  const rows: Record<string, unknown>[] = [];
  const seen = new Set<string>();

  for (const e of events) {
    const embedded = e._embedded as Record<string, unknown> | null;
    const venue    = ((embedded?.venues as unknown[]) ?? [])[0] as Record<string, unknown> | null;
    const loc      = venue?.location as Record<string, unknown> | null;
    const elat     = loc?.latitude  ? Number(loc.latitude)  : NaN;
    const elng     = loc?.longitude ? Number(loc.longitude) : NaN;
    if (!Number.isFinite(elat) || !Number.isFinite(elng)) continue;

    const id = `tm_${e.id}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const dates = (e.dates ?? {}) as Record<string, unknown>;
    const start = (dates.start as Record<string, unknown> | null) ?? {};
    // Beaucoup d'événements n'ont qu'une date locale, sans heure ni fuseau.
    // 20:00 est une convention assumée : mieux vaut une heure plausible
    // qu'un événement rejeté faute d'horodatage.
    const startsAt = (start.dateTime as string | null)
      ?? (start.localDate
            ? `${start.localDate}T${(start.localTime as string) ?? "20:00:00"}Z`
            : null);
    if (!startsAt) continue;

    const cls   = ((e.classifications as Record<string, unknown>[]) ?? [])[0] ?? {};
    const seg   = ((cls.segment  as Record<string, unknown>)?.name as string) ?? "";
    const genre = ((cls.genre    as Record<string, unknown>)?.name as string) ?? "";
    const sub   = ((cls.subGenre as Record<string, unknown>)?.name as string) ?? "";
    const name  = (e.name as string) ?? "Event";

    const prices = ((e.priceRanges as Record<string, unknown>[]) ?? [])[0] ?? {};
    const img    = ((e.images as Record<string, unknown>[]) ?? [])
      .find((i) => Number(i.width ?? 0) >= 640)?.url as string | undefined;

    rows.push({
      event_id:   id,
      source:     "ticketmaster",
      name:       name.slice(0, 160),
      url:        (e.url as string) ?? null,
      image_url:  img ?? null,
      segment:    seg || null,
      genre:      genre || null,
      intentions: intentionsFor(seg, genre, sub, name),
      venue_name: (venue?.name as string) ?? null,
      city:       ((venue?.city    as Record<string, unknown>)?.name        as string) ?? null,
      country:    ((venue?.country as Record<string, unknown>)?.countryCode as string) ?? null,
      lat: elat, lng: elng,
      starts_at:  startsAt,
      ends_at:    ((dates.end as Record<string, unknown>)?.dateTime as string) ?? null,
      price_min:  prices.min != null ? Number(prices.min) : null,
      price_max:  prices.max != null ? Number(prices.max) : null,
      currency:   (prices.currency as string) ?? null,
      refreshed_at: new Date().toISOString(),
    });
  }

  if (rows.length) {
    const { error } = await sb.from("live_events").upsert(rows, { onConflict: "event_id" });
    if (error) console.error("live_events upsert:", error.message);
    await embedLiveEvents(sb, rows.map((r) => String(r.event_id)));
  }

  await sb.from("live_cells").upsert(
    { cell, swept_at: new Date().toISOString(), found: rows.length }, { onConflict: "cell" });

  // Le ménage voyage avec le balayage : pas de cron à maintenir pour ça.
  await sb.rpc("live_events_sweep_expired");
  return true;
}

// Seuls les événements SANS embedding sont envoyés. Une affiche rebalayée
// douze fois n'est embedée qu'une fois — c'est là qu'est l'économie.
// Exportée : `agenda-ingest` embed ses propres lignes avec exactement la
// même formule, sinon les deux couches ne seraient pas comparables et le
// classement du radar mélangerait deux échelles.
export async function embedLiveEvents(sb: SB, ids: string[]) {
  if (!ids.length) return;
  const { data: todo } = await sb
    .from("live_events")
    .select("event_id, name, genre, segment, venue_name, city")
    .in("event_id", ids)
    .is("embedding", null)
    .limit(100);
  if (!todo?.length) return;

  const texts = todo.map((t: Record<string, string | null>) =>
    [t.name, t.genre || t.segment, t.venue_name, t.city].filter(Boolean).join(" — "));
  const vectors = await embedTexts(texts);
  if (!vectors.length) return;

  await Promise.all(todo.map(async (t: { event_id: string }, i: number) => {
    const v = vectors[i];
    if (!v || v.length !== 1536) return;
    await sb.from("live_events")
      .update({ embedding: JSON.stringify(v) })
      .eq("event_id", t.event_id);
  }));
}
