// deno test --allow-none backend/supabase/functions/_shared/agenda_test.ts
//
// Ces parseurs ne touchent ni le réseau ni la base : ils se testent sur une
// chaîne. C'est la raison pour laquelle ils vivent à part — un parseur qu'on
// ne peut tester qu'en production n'est pas testé.
//
// Chaque cas ci-dessous reproduit un piège RÉEL :
//   · ICS   — le pliage à 75 octets (RFC 5545 §3.1). Sans dépliage, le titre
//             est coupé au milieu d'un mot, silencieusement.
//   · ICS   — DTSTART en date seule, sans heure ni fuseau.
//   · JSONLD— l'emballage @graph, et le tableau d'offres.
//   · RSS   — un item SANS date d'événement doit être REJETÉ : sa date de
//             publication n'est pas la date du concert.

import { parseIcs, parseJsonLd, parseRss, parseAgendaLx } from "./agenda.ts";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error("FAIL — " + msg);
}

// ── ICS ──────────────────────────────────────────────────────────────
const ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:evt-1@zdb.pt
SUMMARY:Concerto de jazz no terraço com um titre tres long qui depasse la
  limite de soixante-quinze octets
DTSTART:20260915T210000Z
DTEND:20260915T233000Z
LOCATION:Galeria Zé dos Bois\\, Rua da Barroca 59
GEO:38.7113;-9.1450
URL:https://zdb.pt/e/1
CATEGORIES:Jazz
END:VEVENT
BEGIN:VEVENT
UID:evt-2@zdb.pt
SUMMARY:Exposição
DTSTART;VALUE=DATE:20260920
END:VEVENT
END:VCALENDAR`;

const ics = parseIcs(ICS);
assert(ics.length === 2, `ICS: 2 événements attendus, reçu ${ics.length}`);
assert(ics[0].name.includes("soixante-quinze octets"),
  "ICS: la ligne pliée n'a pas été dépliée — titre tronqué");
assert(ics[0].starts_at === "2026-09-15T21:00:00.000Z" ||
       ics[0].starts_at === "2026-09-15T21:00:00Z",
  `ICS: DTSTART mal lu (${ics[0].starts_at})`);
assert(ics[0].lat === 38.7113 && ics[0].lng === -9.1450, "ICS: GEO mal lu");
assert(ics[0].venue === "Galeria Zé dos Bois, Rua da Barroca 59",
  `ICS: LOCATION mal déséchappé (${ics[0].venue})`);
assert(ics[1].starts_at.startsWith("2026-09-20T20:00"),
  `ICS: date seule doit prendre 20:00 (${ics[1].starts_at})`);

// ── JSON-LD ──────────────────────────────────────────────────────────
const HTML = `<html><head>
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
  {"@type":"WebSite","name":"Culturgest"},
  {"@type":"MusicEvent","@id":"https://culturgest.pt/e/9","name":"Sons da Casa",
   "startDate":"2026-09-18T21:30:00+01:00","endDate":"2026-09-18T23:00:00+01:00",
   "url":"https://culturgest.pt/e/9",
   "location":{"@type":"Place","name":"Grande Auditório",
               "geo":{"@type":"GeoCoordinates","latitude":38.7276,"longitude":-9.1487}},
   "offers":[{"@type":"Offer","price":"12","priceCurrency":"EUR"}]}
]}
</script>
<script type="application/ld+json">{"@type":"Article","name":"pas un event"}</script>
</head><body></body></html>`;

const jl = parseJsonLd(HTML);
assert(jl.length === 1, `JSON-LD: 1 événement attendu, reçu ${jl.length}`);
assert(jl[0].name === "Sons da Casa", "JSON-LD: nom mal lu");
assert(jl[0].venue === "Grande Auditório", "JSON-LD: location.name mal lu");
assert(jl[0].lat === 38.7276, "JSON-LD: geo mal lu");
assert(jl[0].price_min === 12 && jl[0].currency === "EUR", "JSON-LD: offre mal lue");
assert(jl[0].starts_at === "2026-09-18T20:30:00.000Z",
  `JSON-LD: fuseau +01:00 mal converti (${jl[0].starts_at})`);

// ── RSS ──────────────────────────────────────────────────────────────
const RSS = `<rss><channel>
<item><title><![CDATA[Noite de fado]]></title><link>https://x.pt/1</link>
      <ev:startdate>2026-09-19T22:00:00Z</ev:startdate><category>Fado</category></item>
<item><title>Un article, pas un événement</title><link>https://x.pt/2</link>
      <pubDate>Tue, 02 Sep 2026 10:00:00 GMT</pubDate></item>
</channel></rss>`;

const rss = parseRss(RSS);
assert(rss.length === 1,
  `RSS: seul l'item avec une VRAIE date d'événement doit passer, reçu ${rss.length}`);
assert(rss[0].name === "Noite de fado", `RSS: CDATA mal retiré (${rss[0].name})`);

// ── AgendaLX / WordPress ─────────────────────────────────────────────
const LX = [
  { id: 41, title: { rendered: "Festa &#8217;na rua" }, data_inicio: "2026-09-21",
    local: "Praça do Comércio", link: "https://agendalx.pt/e/41", categoria: "Música" },
  { id: 42, title: { rendered: "Sans date" }, local: "X" },
];
const lx = parseAgendaLx(LX);
assert(lx.events.length === 1, `AgendaLX: 1 événement attendu, reçu ${lx.events.length}`);
assert(lx.events[0].venue === "Praça do Comércio", "AgendaLX: local mal lu");
assert(lx.keys.includes("data_inicio"),
  "AgendaLX: les clés vues doivent remonter dans le rapport");

// ── Le repli entre formats ───────────────────────────────────────────
assert(parseJsonLd(ICS).length === 0, "un ICS ne doit rien rendre au parseur JSON-LD");
assert(parseIcs(HTML).length === 0, "une page HTML ne doit rien rendre au parseur ICS");

console.log("✓ agenda.ts — 18 assertions, tous les formats");
