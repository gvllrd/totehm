import { launch, page, ok, USER } from './harness.mjs';
const OUT = process.argv[2] || '.';
const now = Date.now(), iso = ms => new Date(now + ms).toISOString();
const spot = (id, dm, extra = {}) => ({ id, kind:'experience', habit:'Run the hill ' + id, intentions:['fight'], mode:'social', venue:'public',
  starts_at: iso(dm*60e3), duration_min:60, live: dm <= 0, state: dm <= 0 ? 'am' : 'will', shield:'off', city:'Lisbon',
  lat:38.72 + dm/5000, lng:-9.14, capacity:6, taken:1, access:'club', selection:'auto', mine:false, creator:'nia', compat:62, ...extra });
const moments = [
  { id:'m1', kind:'moment', habit:'Cold shower', intentions:['focus'], mode:'silent', shield:'on', city:'Lisbon', starts_at: iso(-10*60e3), state:'am',
    lat:38.72, lng:-9.14, creator:'kai', video:'22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.webm', exact:{ lat:38.7211, lng:-9.1402 } },
  { id:'m2', kind:'moment', habit:'Sunset sketch', intentions:['express'], mode:'social', shield:'off', city:'Lisbon', starts_at: iso(-3*3600e3), state:'was', lat:38.71, lng:-9.13, creator:'ana', video:null },
];
const radarCalls = [];
const rpc = {
  figher_access: { member:true, pseudo:'wah', comp:true, spots_benefit:true, complete:true, thp:true },
  spot_rules: { max_upcoming:10, capacity_min:1, capacity_max:50, duration_min:5, duration_max:720, horizon_days:90, local_radius_km:60, round_public:2, clip_max_bytes:8388608 },
  spots_radar: b => { radarCalls.push(b); const l = b.p_when === 'today' ? [spot('a', -5), spot('b', 90)] : [spot('c', 60*26), spot('d', 60*30, { lat:38.9 })]; return { member:true, signed_in:true, spots:l }; },
  spots_globe: [],
  moments_feed: { member:true, signed_in:true, moments },
  my_space: { spots:[{ ...spot('mine1', 60*48, { mine:true, status:'published' }) }, { ...moments[0], mine:true, status:'published' }], applications:[], requests:[],
    limits:{ upcoming:1, max_upcoming:10, moments_today:1, moment_max_day:12 } },
  my_trips: { trips:[], reps:[], objs:{} }, intention_sounds: {},
  moment_publish: b => ({ ok:true, id:'m9' }),
  spot_publish: b => ({ ok:true, id:'s9', lat:38.72, lng:-9.14 }),
};
const tables = { totehms: [{ steps:[{ t:'Run the hill', f:'every_morning', is:['fight','flow'] }, { t:'Cold shower', f:'daily', is:['focus'] }] }], habit_spots: [] };
const browser = await launch();
const { pg, log } = await page(browser, { dir:'space', origin:'https://www.totehm.space', rpc, tables });
await pg.goto('https://www.totehm.space/');
await pg.waitForFunction(() => window.__totehm_space && window.__totehm_space().spots > 0, null, { timeout:15000 });
let d = await pg.evaluate(() => window.__totehm_space());
ok(d.build === '2026-09-30', 'build 2026-09-30');
ok(await pg.textContent('#vt') === 'Radar', 'centre is titled Radar');
ok(!(await pg.evaluate(() => document.body.classList.contains('map-on'))), 'no street map on the radar');
await pg.waitForTimeout(800);
ok(log.tiles === 0, 'zero OSM tile requested on the radar (' + log.tiles + ')');
ok(/I am here/.test(await pg.getAttribute('.marker.live', 'aria-label') || ''), 'live marker says I am here');
// toucher le radar à vide : rien ne se crée
const box = await pg.$eval('#canvas', c => { const r = c.getBoundingClientRect(); return { x:r.width/2 + 40, y:r.height/2 - 60 }; });
await pg.mouse.click(box.x, box.y);
await pg.waitForTimeout(300);
ok((await pg.evaluate(() => window.__totehm_space().view)) === 'radar', 'tapping the radar creates nothing');
await pg.screenshot({ path: OUT + '/space_radar.png' });

// ── gauche : Short-Live
await pg.keyboard.press('ArrowLeft');
await pg.waitForFunction(() => window.__totehm_space().moments === 2);
ok(await pg.textContent('#vt') === 'Short-Live', 'left is Short-Live');
ok(log.rpc.some(r => r.name === 'moments_feed'), 'moments_feed read');
const txt = await pg.textContent('#p-g');
ok(/I am here/.test(txt) && /I was here/.test(txt), 'moments say I am here / I was here');
ok(/exact place · subscribers/.test(txt) === false && /the exact place/.test(txt), 'shield ON + exact → exact link shown to this viewer');
ok(await pg.$$eval('#p-g .mo-v[data-clip]', l => l.length) === 1, 'one clip box (the other has no video for this viewer)');
await pg.waitForTimeout(600);
const src = await pg.$eval('#p-g .mo-v[data-clip] video', v => v.getAttribute('src') || '');
ok(/storage\/v1\/object\/public\/moments\//.test(src), 'visible clip loads from the public bucket');
ok(!/Do it again/i.test(await pg.evaluate(() => document.body.innerText)), 'no Do it again anywhere on screen');
await pg.screenshot({ path: OUT + '/space_shortlive.png' });

// ── REC : la manette touchée
const jb = await pg.$eval('#joy-box', e => { const r = e.getBoundingClientRect(); return { x:r.x + r.width/2, y:r.y + r.height/2 }; });
await pg.mouse.click(jb.x, jb.y);
await pg.waitForFunction(() => window.__totehm_space().rec.step === 'ready', null, { timeout:8000 });
ok(true, 'controller tap opens the camera (fake device)');
await pg.screenshot({ path: OUT + '/space_rec_ready.png' });
await pg.click('[data-rgo]');
await pg.waitForFunction(() => window.__totehm_space().rec.step === 'ctx', null, { timeout:9000 });
ok((await pg.evaluate(() => window.__totehm_space().rec.clip)), '5 s clip recorded');
await pg.waitForSelector('#rec-body [data-rh]');
await pg.click('#rec-body [data-rh="1"]');
await pg.click('[data-rmode="silent"]');
await pg.click('[data-rshield="on"]');
await pg.screenshot({ path: OUT + '/space_rec_send.png' });
await pg.click('[data-rsend]');
await pg.waitForFunction(() => !window.__totehm_space().rec.open, null, { timeout:8000 });
const mp = log.rpc.find(r => r.name === 'moment_publish');
ok(!!mp, 'moment_publish called');
ok(mp && mp.body.p_shield === 'on' && mp.body.p_mode === 'silent' && mp.body.p_habit === 'Cold shower', 'moment carries habit, silent, shield on');
ok(mp && new RegExp('^' + USER.id + '/[0-9a-f-]{36}\\.(webm|mp4)$').test(mp.body.p_video), 'video path is in MY folder: ' + (mp && mp.body.p_video));
ok(mp && mp.body.p_city === 'Lisbon', 'city from Natural Earth, zero geocoding: ' + (mp && mp.body.p_city));
const ups = log.upload.filter(u => u.method === 'POST'); ok(ups.length === 1 && ups[0].path.startsWith('moments/' + USER.id + '/') && ups[0].size > 1000, 'clip uploaded once, into moments/<my uid>/ (' + (ups[0]||{}).size + ' bytes)');

// ── bas : Search compacte
await pg.keyboard.press('ArrowRight');           // retour au radar
await pg.waitForFunction(() => window.__totehm_space().view === 'radar');
await pg.keyboard.press('ArrowDown');
await pg.waitForFunction(() => window.__totehm_space().view === 'search');
await pg.waitForSelector('#ctx-b');
ok((await pg.textContent('#ctx-b')).startsWith('Habit'), 'search opens on [ Habit ▾ ]');
await pg.click('#ctx-b'); await pg.click('[data-ctx="dist"]');
await pg.waitForTimeout(400);
const before = radarCalls.length, n0 = (await pg.evaluate(() => window.__totehm_space().spots));
await pg.click('[data-fd="1000"]');
await pg.waitForTimeout(400);
const n1 = await pg.evaluate(() => window.__totehm_space().spots);
ok(radarCalls.length === before, 'distance filters with zero request');
ok(n1 <= n0, 'distance filter narrows the list (' + n0 + ' → ' + n1 + ')');
ok(/≤/.test(await pg.textContent('#fs-pills')), 'active filter shown as a pill');
await pg.screenshot({ path: OUT + '/space_search.png' });

// ── droite : Spots
await pg.keyboard.press('ArrowUp');
await pg.waitForFunction(() => window.__totehm_space().view === 'radar');
await pg.keyboard.press('ArrowRight');
await pg.waitForFunction(() => window.__totehm_space().view === 'time');
ok(await pg.textContent('#vt') === 'Spots', 'right is Spots');
await pg.waitForTimeout(500);
ok(/I will be here/.test(await pg.textContent('#p-d')), 'Spots to come say I will be here');

// ── haut : Create, bouclier et ville
await pg.keyboard.press('ArrowLeft');
await pg.keyboard.press('ArrowUp');
await pg.waitForFunction(() => window.__totehm_space().view === 'create');
await pg.waitForSelector('#p-h [data-hk]');
await pg.click('#p-h [data-hk="0"]');
await pg.waitForSelector('[data-date]');
await pg.click('[data-date]:nth-child(2)');
await pg.click('[data-time="18:00"]');
await pg.click('[data-dur="60"]');
await pg.fill('#f-place', 'the steps at Ribeira');
await pg.click('[data-geo]');
await pg.waitForTimeout(400);
await pg.click('[data-pk="venue"]').catch(() => {});
await pg.click('[data-venue="public"]');
await pg.click('[data-pk="shield"]');
await pg.click('[data-shield="on"]');
ok(/GPS shield · on/.test(await pg.textContent('#p-h')), 'shield set on in the draft');
ok(!(await pg.evaluate(() => document.body.classList.contains('map-on'))), 'no street map while writing (only in place-it-on-the-map)');
await pg.click('[data-pk="loc"]'); await pg.click('[data-pin]');
await pg.waitForTimeout(700);
ok(await pg.evaluate(() => document.body.classList.contains('map-on')), 'street map appears only to place the meeting point');
await pg.click('#pin-ok');
await pg.screenshot({ path: OUT + '/space_create.png' });
await pg.click('#f-pub');
await pg.waitForTimeout(800);
const sp = log.rpc.find(r => r.name === 'spot_publish');
ok(sp && sp.body.p_shield === 'on' && sp.body.p_city === 'Lisbon' && sp.body.p_video === null, 'spot_publish carries shield, city, no video');
log.errors = log.errors.filter(e => !/404/.test(e));
ok(!log.errors.length, 'no page error: ' + log.errors.join(' | '));
await browser.close();
