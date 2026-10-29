// MON MOMENT du Higher Self (29/10/2026) — `backend/supabase/functions/_shared/meteo.ts`, testé sous Node (types effacés).
// 1 · Le code MET devient des mots, et la nuit se lit.
// 2 · La ligne MY MOMENT dit la part du jour, la météo, chez moi ou dehors (ou « unknown »).
// 3 · `meteo()` lit la réponse MET Norway, la garde 30 min par case, et rend null sans jamais lever (réseau, statut).
// LANCER : node tests/fn/meteo.mjs
import { meteo, ciel, moment } from '../../backend/supabase/functions/_shared/meteo.ts';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

/* 1 · le ciel */
ok(ciel('lightrain').mots === 'light rain' && !ciel('lightrain').nuit, 'lightrain → « light rain », de jour');
ok(ciel('partlycloudy_night').mots === 'partly cloudy' && ciel('partlycloudy_night').nuit, 'partlycloudy_night → « partly cloudy », nuit');
ok(ciel('clearsky_day').mots === 'clear sky', 'clearsky_day → « clear sky »');
ok(ciel('heavyrainshowersandthunder').mots === 'heavy rain showers and thunder', 'heavyrainshowersandthunder → ' + ciel('heavyrainshowersandthunder').mots);
ok(ciel('').mots === '' && !ciel(undefined).nuit, 'rien → rien');

/* 2 · la ligne du moment */
const m1 = moment('Thu 2026-10-29 21:40', { t: 12.4, ciel: 'rain_night', pluie: 1.2 }, 'home');
ok(m1 === 'MY MOMENT: evening · weather: rain, 12.4°C, 1.2 mm of rain this hour, dark outside · I am AT HOME', m1);
const m2 = moment('2026-10-29 07:05', { t: 18, ciel: 'fair_day', pluie: 0 }, 'out');
ok(m2 === 'MY MOMENT: morning · weather: fair, 18°C · I am OUT, away from home', m2);
const m3 = moment('', null, null);
ok(m3 === 'MY MOMENT: home or out: unknown', m3);
ok(/late night/.test(moment('2026-10-29 03:10', null, null)) && /midday/.test(moment('2026-10-29 12:30', null, null)), 'late night · midday');

/* 3 · la lecture MET Norway, le cache, les pannes */
let appels = 0, dernier = null;
const repondre = (corps, status = 200) => async (url, o) => { appels++; dernier = { url: String(url), ua: o?.headers?.['User-Agent'] }; return new Response(JSON.stringify(corps), { status }); };
const MET = { properties: { timeseries: [{ data: { instant: { details: { air_temperature: 23.46 } },
  next_1_hours: { summary: { symbol_code: 'fair_day' }, details: { precipitation_amount: 0 } } } }] } };
globalThis.fetch = repondre(MET);
const a = await meteo(38.72, -9.14);
ok(a && a.t === 23.5 && a.ciel === 'fair_day' && a.pluie === 0, 'lu : ' + JSON.stringify(a));
ok(/lat=38\.72&lon=-9\.14$/.test(dernier.url) && /totehm\.com/.test(dernier.ua || ''), 'la case arrondie, et le User-Agent exigé par MET');
const b = await meteo(38.72, -9.14);
ok(appels === 1 && b === a, 'même case dans les 30 min : servi du cache, aucun appel');
globalThis.fetch = repondre({}, 429);
ok(await meteo(40.71, -74.01) === null, 'MET refuse (429) : null, la réponse part sans météo');
globalThis.fetch = async () => { throw new Error('timeout'); };
ok(await meteo(48.85, 2.35) === null, 'réseau en panne : null, jamais une exception');

console.log(`\n${pass} PASS · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
