// ═══════════════════════════════════════════════════════════════════════
// TOTEHM · _shared/agenda.ts — TROIS PARSEURS DE FORMATS, ZÉRO ADAPTATEUR
//
// why : un agenda change de HTML tous les six mois ; une norme, jamais.
//       On ne parse donc pas des SITES, on parse des FORMATS. Une salle
//       de plus = une ligne dans `live_sources`, zéro ligne ici.
//
// how : `ics` (RFC 5545) · `jsonld` (schema.org/Event, que Google exige
//       déjà de tout agenda référencé) · `rss` en repli.
//
// what: chaque parseur rend le même `Ev`. Ce fichier ne touche NI le
//       réseau NI la base : il se teste sur une chaîne de caractères.
// ═══════════════════════════════════════════════════════════════════════

export type Ev = {
  key: string; name: string; url: string | null;
  starts_at: string; ends_at: string | null;
  venue: string | null; lat: number | null; lng: number | null;
  genre: string | null; price_min: number | null; currency: string | null;
};

// ═════════════════════════════════════════════════════════════════════
// LES PARSEURS
// ═════════════════════════════════════════════════════════════════════

// ── ICS · RFC 5545 ───────────────────────────────────────────────────
// Le dépliage des lignes vient AVANT tout le reste : la norme coupe à 75
// octets et poursuit avec une espace ou une tabulation. Sans ce
// dépliage, un titre long est tronqué au milieu d'un mot, silencieusement.
export function parseIcs(text: string): Ev[] {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const out: Ev[] = [];

  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const get = (k: string) => {
      const m = body.match(new RegExp("^" + k + "[^:\\r\\n]*:(.*)$", "mi"));
      return m ? m[1].trim() : null;
    };
    const name = deIcs(get("SUMMARY"));
    const dt   = get("DTSTART");
    if (!name || !dt) continue;
    const starts = icsDate(dt);
    if (!starts) continue;

    const geo = get("GEO");                       // "38.71;-9.14"
    const g   = geo ? geo.split(/[;,]/).map(Number) : null;

    out.push({
      key:       get("UID") || `${name}|${starts}`,
      name,
      url:       get("URL"),
      starts_at: starts,
      ends_at:   icsDate(get("DTEND") ?? ""),
      venue:     deIcs(get("LOCATION")),
      lat:       g && Number.isFinite(g[0]) ? g[0] : null,
      lng:       g && Number.isFinite(g[1]) ? g[1] : null,
      genre:     deIcs(get("CATEGORIES")),
      price_min: null, currency: null,
    });
  }
  return out;
}

const deIcs = (s: string | null) =>
  s ? s.replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\;/g, ";")
       .replace(/\\\\/g, "\\").trim() : null;

// `20260912T210000Z`, `20260912T210000`, `20260912` — les trois formes
// que la norme autorise. La date seule prend 20:00 : mieux vaut une heure
// plausible qu'un événement rejeté faute d'horodatage.
function icsDate(v: string | null): string | null {
  if (!v) return null;
  const m = v.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss] = m;
  const iso = `${y}-${mo}-${d}T${hh ?? "20"}:${mm ?? "00"}:${ss ?? "00"}Z`;
  return isNaN(Date.parse(iso)) ? null : iso;
}

// ── JSON-LD · schema.org/Event ───────────────────────────────────────
// Google exige ce balisage pour afficher un événement dans ses résultats :
// tout agenda qui veut être trouvé le publie déjà. C'est la source la plus
// fiable d'une page HTML — bien plus qu'un sélecteur CSS, qui casse au
// premier redesign.
const EVENT_TYPES = /^(Event|MusicEvent|TheaterEvent|DanceEvent|ScreeningEvent|ExhibitionEvent|Festival|SportsEvent|ComedyEvent|SocialEvent|EducationEvent|BusinessEvent|LiteraryEvent|VisualArtsEvent)$/i;

export function parseJsonLd(html: string): Ev[] {
  const out: Ev[] = [];
  const blocks = [...html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const b of blocks) {
    let data: unknown;
    try { data = JSON.parse(b[1].trim()); } catch { continue; }
    walk(data, out);
  }
  return out;
}

function walk(node: unknown, out: Ev[]) {
  if (Array.isArray(node)) { for (const n of node) walk(n, out); return; }
  if (!node || typeof node !== "object") return;
  const o = node as Record<string, unknown>;

  // @graph et itemListElement : les deux emballages courants.
  if (o["@graph"]) walk(o["@graph"], out);
  if (o.itemListElement) walk(o.itemListElement, out);
  if (o.item) walk(o.item, out);

  const types = ([] as string[]).concat(
    (o["@type"] as string | string[] | undefined) ?? []);
  if (!types.some((t) => EVENT_TYPES.test(String(t)))) return;

  const name  = typeof o.name === "string" ? o.name.trim() : null;
  const start = typeof o.startDate === "string" ? o.startDate : null;
  if (!name || !start) return;
  const starts = new Date(start);
  if (isNaN(starts.getTime())) return;

  const loc   = (o.location ?? {}) as Record<string, unknown>;
  const geo   = (loc.geo ?? {}) as Record<string, unknown>;
  const offer = ([] as Record<string, unknown>[])
    .concat((o.offers as Record<string, unknown> | Record<string, unknown>[]) ?? [])[0] ?? {};

  out.push({
    key:       String(o["@id"] ?? o.url ?? `${name}|${start}`),
    name:      name.slice(0, 160),
    url:       typeof o.url === "string" ? o.url : null,
    starts_at: starts.toISOString(),
    ends_at:   typeof o.endDate === "string" && !isNaN(Date.parse(o.endDate))
                 ? new Date(o.endDate).toISOString() : null,
    venue:     typeof loc.name === "string" ? loc.name : null,
    lat:       num(geo.latitude), lng: num(geo.longitude),
    genre:     typeof o.genre === "string" ? o.genre
               : (types.find((t) => EVENT_TYPES.test(String(t))) ?? null),
    price_min: num(offer.price ?? offer.lowPrice),
    currency:  typeof offer.priceCurrency === "string" ? offer.priceCurrency : null,
  });
}

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ── RSS · le repli ───────────────────────────────────────────────────
// Un flux RSS porte rarement une date d'événement — il porte une date de
// PUBLICATION. On ne prend donc que les items qui déclarent explicitement
// une date d'événement. Sans ça on afficherait « ce soir » sur un article
// écrit ce soir, ce qui est faux et se voit tout de suite.
export function parseRss(xml: string): Ev[] {
  const out: Ev[] = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const it   = m[0];
    const tag  = (t: string) => {
      const r = it.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i"));
      return r ? deCdata(r[1]) : null;
    };
    const name  = tag("title");
    const start = tag("ev:startdate") ?? tag("startDate") ?? tag("dc:date");
    if (!name || !start || isNaN(Date.parse(start))) continue;
    out.push({
      key: tag("guid") ?? tag("link") ?? `${name}|${start}`,
      name: name.slice(0, 160),
      url: tag("link"),
      starts_at: new Date(start).toISOString(),
      ends_at: null, venue: null, lat: null, lng: null,
      genre: tag("category"), price_min: null, currency: null,
    });
  }
  return out;
}

const deCdata = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
   .replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#8217;/g, "'")
   .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

// ── AgendaLX · une API JSON dont le contrat n'est pas publié ─────────
// La Câmara Municipal expose une API (dados.cm-lisboa.pt la référence)
// mais n'en publie pas le schéma. Plutôt que de deviner une fois pour
// toutes, on lit LARGE : on essaie les noms de champs plausibles, et on
// REMONTE les clés réellement vues dans le rapport. Une fois le contrat
// connu, cette fonction se réduit à trois lignes — et on saura lesquelles.
export function parseAgendaLx(json: unknown): { events: Ev[]; keys: string[] } {
  const arr: Record<string, unknown>[] = Array.isArray(json)
    ? json as Record<string, unknown>[]
    : ((json as Record<string, unknown>)?.events ??
       (json as Record<string, unknown>)?.data ??
       (json as Record<string, unknown>)?.results ?? []) as Record<string, unknown>[];
  if (!Array.isArray(arr) || !arr.length) return { events: [], keys: [] };

  // WordPress range les champs métier dans `acf`, `meta` ou `fields`. On
  // regarde donc le premier niveau ET ces trois poches — sans descendre
  // plus loin : au-delà on ramasse n'importe quoi.
  const flat = (o: Record<string, unknown>): Record<string, unknown> => ({
    ...(o.acf    as Record<string, unknown> ?? {}),
    ...(o.meta   as Record<string, unknown> ?? {}),
    ...(o.fields as Record<string, unknown> ?? {}),
    ...o,
  });
  const keys = [...new Set(arr.slice(0, 3).flatMap((o) => Object.keys(flat(o ?? {}))))];
  const pick = (o: Record<string, unknown>, names: string[]) => {
    const f = flat(o);
    for (const n of names) {
      const v = f[n];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (Array.isArray(v) && typeof v[0] === "string" && v[0].trim()) return v[0].trim();
      if (v && typeof v === "object" && typeof (v as { rendered?: string }).rendered === "string") {
        return (v as { rendered: string }).rendered.replace(/<[^>]+>/g, "").trim();
      }
    }
    return null;
  };

  const events: Ev[] = [];
  for (const o of arr) {
    if (!o || typeof o !== "object") continue;
    const name  = pick(o, ["title", "titulo", "nome", "name", "designacao"]);
    // ⚠️ NI `date` NI `data` : dans WordPress, `date` est la date de
    // PUBLICATION. La prendre pour une date d'événement afficherait « ce
    // soir » sur un article écrit ce soir — exactement le piège évité
    // dans le parseur RSS. Un item sans vraie date de début est REJETÉ,
    // et ses clés remontent dans le rapport pour qu'on sache laquelle
    // ajouter ici.
    const start = pick(o, ["startDate", "start_date", "startdate", "date_start",
                           "data_inicio", "dataInicio", "datainicio", "inicio",
                           "event_start", "EventStartDate", "_EventStartDate"]);
    if (!name || !start || isNaN(Date.parse(start))) continue;
    events.push({
      key:       String(o.id ?? o.slug ?? `${name}|${start}`),
      name:      name.slice(0, 160),
      url:       pick(o, ["link", "url", "permalink"]),
      starts_at: new Date(start).toISOString(),
      ends_at:   (() => {
        const e = pick(o, ["endDate", "end_date", "data_fim", "dataFim", "enddate"]);
        return e && !isNaN(Date.parse(e)) ? new Date(e).toISOString() : null;
      })(),
      venue:     pick(o, ["venue", "local", "localizacao", "place", "location"]),
      lat:       num(o.lat ?? o.latitude), lng: num(o.lng ?? o.longitude ?? o.lon),
      genre:     pick(o, ["category", "categoria", "tipo", "type"]),
      price_min: null, currency: null,
    });
  }
  return { events, keys };
}
