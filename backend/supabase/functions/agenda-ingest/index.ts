// TOTEHM · agenda-ingest v2 — LA COUCHE LOCALE
// ─────────────────────────────────────────────────────────────────────
// POURQUOI CETTE FONCTION EXISTE
//
// Ticketmaster couvre le monde et ne couvre pas le Portugal. Lisbonne a
// ses agendas — la mairie, Culturgest, la Gulbenkian, le ZDB, le Lux.
//
// LA TENTATION serait d'écrire un adaptateur par site. C'est exactement
// ce qui a produit Eventbrite (404 depuis 2021, appelé quand même à
// chaque clic), Songkick et Meetup : trois adaptateurs morts qu'il a
// fallu retirer un an plus tard.
//
// CE QU'ON FAIT À LA PLACE : trois parseurs de FORMATS, jamais de sites.
//
//     ics      RFC 5545 — la norme des calendriers. Ne change jamais.
//     jsonld   schema.org/Event dans la page. Google l'exige pour le
//              référencement : tout agenda sérieux le publie déjà.
//     rss      le repli. Un titre, un lien, une date d'événement.
//
// Une salle de plus, c'est UNE LIGNE dans `live_sources`. Zéro ligne de
// code. C'est la seule forme qui tienne dix ans.
//
// COÛT : zéro. Ce sont des pages publiques. Le seul euro possible serait
// le géocodage — évité en portant `lat/lng` sur la SOURCE : une salle ne
// déménage pas entre deux concerts.
//
// TROIS MODES
//   discover — MESURÉ LE 04/09/2026 : sur dix URLs d'agendas lisboètes
//              choisies à la main, ZÉRO rendait des événements. Deviner
//              une URL de flux ne marche pas. Alors on ne devine plus :
//              on interroge le site (`/wp-json/wp/v2/types` liste ses
//              types de contenu), on essaie les chemins de flux
//              normalisés, et on garde CELUI QUI RÉPOND. Le résultat est
//              réécrit dans `live_sources.url` : la découverte se fait
//              une fois, pas à chaque ingestion.
//   probe    — essaie les sources sans rien écrire dans `live_events`.
//   run      — les sources `active`. pg_cron, une fois par jour.
//
// On ne déclare JAMAIS qu'une source marche. On la mesure, et le rapport
// dit ce qu'on a vu.
//
// verify_jwt = false — appelée par pg_cron via un jeton à usage unique.
// ─────────────────────────────────────────────────────────────────────

import { createClient } from "npm:@supabase/supabase-js@2";
import { intentionsFor, embedLiveEvents, LIVE_HORIZON_D } from "../_shared/live.ts";
// Les parseurs vivent à part : ils ne touchent ni le réseau ni la base,
// donc ils se testent sur une chaîne — c'est tout leur intérêt.
import { parseIcs, parseJsonLd, parseRss, parseAgendaLx, type Ev } from "../_shared/agenda.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// Beaucoup d'agendas répondent 403 à un client sans User-Agent. Ce n'est
// pas un contournement : c'est se présenter.
const UA = "TotehmBot/1.0 (+https://www.totehm.space; agenda ingest)";
const MAX_PER_SOURCE = 120;
const REQ_TIMEOUT_MS = 7000;
// pg_net coupe à 55 s. On s'arrête AVANT, avec un rapport complet, plutôt
// que d'être tué au milieu d'une écriture.
const WALL_BUDGET_MS = 42000;

// Les chemins de flux NORMALISÉS. Ce ne sont pas des devinettes : ce sont
// les conventions de The Events Calendar (le plugin WordPress d'agenda le
// plus répandu), de WordPress lui-même, et de la norme iCal.
const FEED_PATHS = [
  "/wp-json/tribe/events/v1/events?per_page=100",
  "/events/?ical=1",
  "/agenda/?ical=1",
  "/?ical=1",
  "/events.ics",
  "/agenda.ics",
  "/calendar.ics",
  "/events/feed/",
  "/agenda/feed/",
  "/feed/",
];

type Source = {
  id: string; city: string; name: string; kind: string; url: string;
  lat: number | null; lng: number | null; intentions: string[];
};

// ═════════════════════════════════════════════════════════════════════
// LE RÉSEAU — une seule porte, un seul délai
// ═════════════════════════════════════════════════════════════════════
async function grab(url: string): Promise<{ status: number; body: string; error?: string }> {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "application/json, text/calendar, application/rss+xml, text/html;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(REQ_TIMEOUT_MS),
    });
    return { status: r.status, body: await r.text() };
  } catch (e) {
    return { status: 0, body: "", error: (e as Error).message.slice(0, 140) };
  }
}

// Le format déclaré prime ; s'il ne rend rien, on essaie les autres. Un
// agenda qui passe de JSON-LD à ICS ne doit pas disparaître en silence —
// il doit continuer à marcher, et le dire.
function parseAny(body: string, preferred: string,
                  report: Record<string, unknown>): { events: Ev[]; used: string } {
  const tryOne = (kind: string): Ev[] => {
    try {
      if (kind === "ics")      return parseIcs(body);
      if (kind === "rss")      return parseRss(body);
      if (kind === "jsonld")   return parseJsonLd(body);
      if (kind === "agendalx") {
        const p = parseAgendaLx(JSON.parse(body));
        if (p.keys.length) report.keys_seen = p.keys.slice(0, 24);
        return p.events;
      }
    } catch { /* un format qui n'est pas le bon n'est pas une erreur */ }
    return [];
  };

  let events = tryOne(preferred);
  if (events.length) return { events, used: preferred };
  for (const k of ["jsonld", "agendalx", "ics", "rss"]) {
    if (k === preferred) continue;
    events = tryOne(k);
    if (events.length) return { events, used: k };
  }
  return { events: [], used: preferred };
}

// ═════════════════════════════════════════════════════════════════════
// LA DÉCOUVERTE — on interroge le site, on ne devine pas
// ═════════════════════════════════════════════════════════════════════
async function discover(src: Source, deadline: number) {
  const report: Record<string, unknown> = { id: src.id, name: src.name, mode: "discover" };
  let origin: string;
  try { origin = new URL(src.url).origin; }
  catch { report.error = "url invalide"; return report; }

  const paths: string[] = [];

  // 1 · WordPress se décrit lui-même. `/wp-json/wp/v2/types` liste les
  //     types de contenu et leur `rest_base` : on n'a plus à deviner si
  //     c'est `evento`, `eventos`, `agenda` ou `tribe_events`.
  const t = await grab(origin + "/wp-json/wp/v2/types");
  if (t.status === 200) {
    try {
      const types = JSON.parse(t.body) as Record<string, { rest_base?: string; name?: string; slug?: string }>;
      const hits = Object.entries(types)
        .filter(([slug, v]) => /event|evento|agenda|espet|espect|tribe|concert/i
          .test(`${slug} ${v?.name ?? ""} ${v?.slug ?? ""}`))
        .map(([slug, v]) => v?.rest_base || slug);
      report.wp_types = hits.slice(0, 6);
      for (const b of hits.slice(0, 4)) {
        paths.push(`/wp-json/wp/v2/${b}?per_page=100&orderby=date&order=desc`);
      }
    } catch { /* pas du JSON : ce n'est pas un WordPress ouvert */ }
  }

  // 2 · Les chemins normalisés, puis la page déclarée elle-même.
  paths.push(...FEED_PATHS);
  try {
    const u = new URL(src.url);
    paths.push(u.pathname + u.search);
  } catch { /* déjà géré */ }

  const tried: string[] = [];
  for (const p of paths) {
    if (Date.now() > deadline) { report.stopped = "budget"; break; }
    const url = origin + p;
    if (tried.includes(url)) continue;
    tried.push(url);

    const r = await grab(url);
    if (r.status !== 200 || !r.body) continue;

    const prefer = p.endsWith(".ics") || p.includes("ical") ? "ics"
                 : p.includes("feed")                       ? "rss"
                 : p.includes("wp-json") || p.includes("tribe") ? "agendalx"
                 : "jsonld";
    const { events, used } = parseAny(r.body, prefer, report);
    if (!events.length) continue;

    // Trouvé. On l'écrit dans la source : la découverte ne se refait pas.
    await admin.from("live_sources").update({
      url, kind: used, last_count: events.length, last_error: null,
      last_ok_at: new Date().toISOString(), active: true,
    }).eq("id", src.id);

    report.found_url = url;
    report.format    = used;
    report.found     = events.length;
    report.tried     = tried.length;
    return report;
  }

  report.tried = tried.length;
  report.error = "aucun flux exploitable";
  await admin.from("live_sources")
    .update({ last_error: "aucun flux exploitable", last_count: 0 }).eq("id", src.id);
  return report;
}

// ═════════════════════════════════════════════════════════════════════
// L'INGESTION
// ═════════════════════════════════════════════════════════════════════
async function ingest(src: Source, dry: boolean) {
  const report: Record<string, unknown> = { id: src.id, name: src.name, kind: src.kind };

  const r = await grab(src.url);
  report.status = r.status;
  if (r.error)      { report.error = `fetch: ${r.error}`; await mark(src.id, 0, String(report.error), false); return report; }
  if (r.status >= 400) { report.error = `http ${r.status}`; await mark(src.id, 0, String(report.error), false); return report; }

  const { events, used } = parseAny(r.body, src.kind, report);
  report.format = used;
  report.found  = events.length;

  const now = Date.now();
  const horizon = now + LIVE_HORIZON_D * 864e5;
  const rows = events
    .filter((e) => {
      const t = Date.parse(e.starts_at);
      return t > now - 3 * 3600e3 && t < horizon;
    })
    .slice(0, MAX_PER_SOURCE)
    .map((e) => {
      const lat = e.lat ?? src.lat, lng = e.lng ?? src.lng;
      if (lat == null || lng == null) return null;
      // L'indice de la source prime, sinon on classe sur le titre avec
      // EXACTEMENT la règle de Ticketmaster : deux couches, un vocabulaire.
      const ints = src.intentions?.length
        ? src.intentions
        : intentionsFor("", e.genre ?? "", "", e.name);
      return {
        event_id:   `${src.id}_${hash(e.key)}`,
        source:     src.id,
        name:       e.name,
        url:        e.url,
        image_url:  null,
        segment:    src.name,
        genre:      e.genre,
        intentions: ints,
        venue_name: e.venue ?? src.name,
        city:       src.city,
        country:    src.city === "lisbon" ? "PT" : null,
        lat, lng,
        starts_at:  e.starts_at,
        ends_at:    e.ends_at,
        price_min:  e.price_min,
        price_max:  null,
        currency:   e.currency,
        refreshed_at: new Date().toISOString(),
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  report.kept = rows.length;
  if (dry) { await mark(src.id, rows.length, null, rows.length > 0); return report; }

  if (rows.length) {
    const { error } = await admin.from("live_events").upsert(rows, { onConflict: "event_id" });
    if (error) { report.error = error.message.slice(0, 200); }
    else await embedLiveEvents(admin, rows.map((r2) => String(r2.event_id)));
  }
  await mark(src.id, rows.length, (report.error as string) ?? null, rows.length > 0);
  return report;
}

// Un identifiant stable et court à partir de la clé de la source : le même
// événement rebalayé demain doit écraser sa ligne, pas en créer une seconde.
function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

async function mark(id: string, count: number, err: string | null, ok: boolean) {
  const patch: Record<string, unknown> = { last_count: count, last_error: err };
  if (ok) { patch.last_ok_at = new Date().toISOString(); patch.active = true; }
  await admin.from("live_sources").update(patch).eq("id", id);
}

// ═════════════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  const started  = Date.now();
  const deadline = started + WALL_BUDGET_MS;

  const token = req.headers.get("x-tick-token");
  let allowed = false;
  if (token) {
    const { data } = await admin.rpc("edge_token_consume",
      { p_token: token, p_purpose: "agenda-ingest" });
    allowed = data === true;
  } else {
    const auth = req.headers.get("Authorization") ?? "";
    allowed = auth.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? " ");
  }
  if (!allowed) return new Response("forbidden", { status: 403 });

  let mode = "run", city: string | null = null, only: string | null = null;
  try {
    const b = await req.json();
    if (typeof b?.mode === "string") mode = b.mode;
    if (typeof b?.city === "string") city = b.city;
    if (typeof b?.id === "string")   only = b.id;
  } catch { /* pas de corps */ }

  let q = admin.from("live_sources").select("*");
  if (city) q = q.eq("city", city);
  if (only) q = q.eq("id", only);
  // `run` ne réveille que ce qui a déjà répondu ; `probe` et `discover`
  // regardent tout, puisque c'est justement ce qu'ils vont mesurer.
  if (mode === "run" && !only) q = q.eq("active", true);

  const { data: sources, error } = await q.order("id");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const reports: Record<string, unknown>[] = [];
  let skipped = 0;
  for (const s of (sources ?? []) as Source[]) {
    if (Date.now() > deadline) { skipped++; continue; }
    reports.push(mode === "discover"
      ? await discover(s, deadline)
      : await ingest(s, mode === "probe"));
  }

  await admin.rpc("live_events_sweep_expired");

  const { count } = await admin
    .from("live_events").select("event_id", { count: "exact", head: true });

  return Response.json({
    mode, city,
    checked: reports.length,
    skipped_budget: skipped,
    ms: Date.now() - started,
    live_events_total: count ?? null,
    reports,
  });
});
