// Le miroir du Higher Self (22/10/2026) — `backend/supabase/functions/_shared/mirror.ts`, testé sous Node (types effacés).
// 1 · Le contexte écrit chaque box Habit ENTIÈRE (where, intentions, rythme, son de l'intention) et les liens entre les vues.
// 2 · Les citations ne valent que si elles existent mot pour mot dans MON TOTEHM.
// 3 · Un lieu ne sort que s'il fait partie de ceux donnés (ou le where de MA Habit) : jamais un lieu inventé.
// LANCER : node tests/fn/mirror.mjs
import { contexteMiroir, verifierMiroir, lieuDe, local } from '../../backend/supabase/functions/_shared/mirror.ts';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

const M = {
  habits: [{ text: 'Run the hill', is: ['fight', 'flow'], freq: 'every_morning', where: 'the park downstairs', objectives: ['Run a marathon'],
             repulsions: ['The phone in bed'], media: 3, spot: { state: 'was', city: 'Lisbon', at: '2026-10-12T08:00:00Z' } },
           { text: 'Read at dawn', is: ['focus'], freq: null, where: null, objectives: [], repulsions: [], media: 0, spot: null }],
  objectives: [{ text: 'Run a marathon', by: '2026-12-01T00:00:00Z', days_left: 40, habits: ['Run the hill'], visions: ['A body that carries me'], teachings: ['Discipline is freedom'] }],
  repulsions: [{ text: 'The phone in bed', obstacle: 'I scroll until 2am', habits: ['Run the hill'], teachings: ['Discipline is freedom'] }],
  visions: [{ text: 'A body that carries me', objectives: ['Run a marathon'] }],
  wisdom: [{ text: 'Discipline is freedom', objectives: ['Run a marathon'], repulsions: ['The phone in bed'] }],
  sounds: { fight: { kind: 'dark techno', artist: 'Amelie Lens', platform: 'spotify' } },
};
const LIEUX = [
  { id: 'P1', kind: 'place', ref: 'ChIJ123', name: 'Jardim da Estrela', type: 'city_park', address: 'Praça da Estrela, Lisboa', lat: 38.713, lng: -9.159, km: 1.2, is: ['flow', 'love'] },
  { id: 'E1', kind: 'event', ref: 'tm1', name: 'Night Run Lisboa', venue: 'Parque Eduardo VII', city: 'Lisbon', at: '2026-10-24T19:00:00Z', url: 'https://www.ticketmaster.pt/e/1', lat: 38.72, lng: -9.15, km: 2.4, is: ['fight'] },
];

// ── 1 · le contexte ──
const c = contexteMiroir(M, 'Wed 2026-10-22 18:40', LIEUX, -60);
ok(/"Run the hill" · intentions: fight, flow · rhythm: every morning · where: "the park downstairs" · sound for fight: "dark techno" \(Amelie Lens\)/.test(c),
   'la box Habit ENTIÈRE : intentions, rythme, where, le son de son intention');
ok(/→ serves "Run a marathon" · → threatened by "The phone in bed" · 3 media of it · last spot: I was there, Lisbon, 2026-10-12/.test(c),
   'la Habit tient aux autres vues : l\'objectif qu\'elle sert, la répulsion qui la menace, ses médias, son dernier spot');
ok(/"Run a marathon" · by 2026-12-01 \(40 days left\) · → for my vision "A body that carries me" · → executed by "Run the hill" · → my story teaches "Discipline is freedom"/.test(c),
   'l\'objectif : son échéance, sa vision, ses Habits, son enseignement');
ok(/"The phone in bed" · obstacle: "I scroll until 2am" · → threatens "Run the hill"/.test(c) && /"Discipline is freedom" · → teaches me for "Run a marathon" · → holds me against "The phone in bed"/.test(c),
   'la répulsion et MY STORY, reliées');
ok(/MY SOUNDS \(one per intention\): fight: "dark techno"/.test(c), 'les sons, un par intention');
ok(/P1 · "Jardim da Estrela" · city park · 1\.2 km · flow, love/.test(c) && /E1 · "Night Run Lisboa" · at Parque Eduardo VII · Sat 2026-10-24 20:00 · 2\.4 km/.test(c),
   'les lieux près de moi, et l\'heure d\'un événement à MON heure (UTC+1 → 20:00)');
ok(!/PLACES NEAR ME/.test(contexteMiroir(M, 'x', [])), 'sans Higher (aucun lieu donné) : aucune section de lieux');
ok(contexteMiroir(null, 'x').startsWith('Now (my local time): x'), 'un TOTEHM vide ne casse rien');

// ── 2 · les citations ──
const REP = '@dir objective "Run a marathon"\nI run for the finish line.\n@obs\nI scroll in bed.\n@teach wisdom "Discipline is freedom"\nEvery night on the screen is a morning lost.\n'
  + '@step habit "Run the hill" fight\nTomorrow 7:00 down at the park, dark techno on, I run the hill twice.\n@place mine 2026-10-23T07:00';
ok(JSON.stringify(verifierMiroir(REP, M)) === '{"dir":true,"teach":true,"step":true}', 'trois citations vraies → vérifiées');
ok(JSON.stringify(verifierMiroir(REP.replace('"Run the hill"', '"Run the mountain"').replace('wisdom "Discipline is freedom"', 'wisdom "Pain is weakness"'), M)) === '{"dir":true,"teach":false,"step":false}',
   'une citation inventée → refusée');

// ── 3 · le lieu ──
const mine = lieuDe(REP, LIEUX, M);
ok(mine && mine.kind === 'mine' && mine.name === 'the park downstairs' && mine.when === '2026-10-23T07:00', '« mine » : le where de MA Habit, et l\'heure du geste');
const p = lieuDe(REP.replace('@place mine 2026-10-23T07:00', '@place P1 2026-10-23T07:00'), LIEUX, M);
ok(p && p.kind === 'place' && p.name === 'Jardim da Estrela' && /query_place_id=ChIJ123/.test(p.maps) && p.address === 'Praça da Estrela, Lisboa',
   'un lieu donné : son nom, son adresse, son lien Maps (place_id)');
const e = lieuDe(REP.replace('@place mine 2026-10-23T07:00', '@place E1 none'), LIEUX, M);
ok(e && e.kind === 'event' && e.url === 'https://www.ticketmaster.pt/e/1' && e.at === '2026-10-24T19:00:00Z' && e.when === null, 'un événement : son lien, sa date ; « none » = pas d\'heure inventée');
ok(lieuDe(REP.replace('@place mine 2026-10-23T07:00', '@place P9 2026-10-23T07:00'), LIEUX, M) === null, 'un id qui n\'existe pas → aucun lieu');
ok(lieuDe(REP.replace('@place mine', '@place mine').replace('"Run the hill"', '"Read at dawn"'), LIEUX, M) === null, '« mine » sans where écrit → aucun lieu');
ok(lieuDe(REP.replace(/\n@place.*/, ''), LIEUX, M) === null, 'sans ligne @place → aucun lieu');
ok(local('2026-10-24T19:00:00Z', -60) === 'Sat 2026-10-24 20:00' && local('bad') === '', 'l\'heure locale d\'une date ISO');

console.log(`\n${pass} PASS · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
