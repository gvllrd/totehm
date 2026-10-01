// totehm.space — DO WITH ME (01/10/2026). Les cinq vues, le Spot unique,
// le lieu qui ne sort que du serveur, la caméra d'abord.
import { launch, page, ok, USER } from './harness.mjs';
const OUT = process.argv[2] || '.';
const now = Date.now(), iso = ms => new Date(now + ms).toISOString();
const V = '22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.webm';
const spot = (id, startMin, dur, extra = {}) => ({ id, habit:'Run the hill ' + id, intentions:['love','fight'], visibility:'shared', mode:'social', location:'off',
  city:'Lisbon', comment:null, starts_at: iso(startMin*60e3), ends_at: iso((startMin + dur)*60e3), duration_min: dur,
  state: startMin + dur > 0 ? 'am' : 'was', creator:'nia', mine:false, video:V, context:null, exact:null, ...extra });
// Le fil : la ville seulement (jamais un point), + un Spot à moi, privé.
const feed = [ spot('f1', -10, 60), spot('f2', -300, 60, { video:null }), spot('mine-p', -5, 45, { visibility:'private', mode:null, location:null, mine:true, creator:'wah',
  exact:{ lat:38.7224, lng:-9.1394 }, context:{ objectives:[{ text:'Sub 50 min 10k' }], repulsions:[] } }) ];
// Le radar : mes Spots + les SHARED·ON de mes créateurs — avec le point.
const exact = [ feed[2], spot('on1', -20, 90, { location:'on', exact:{ lat:38.7290, lng:-9.1500 }, creator:'kai' }),
  spot('on2', -400, 60, { location:'on', exact:{ lat:38.7100, lng:-9.1300 }, creator:'kai' }) ];
const calls = { feed:[], exact:[] };
const rpc = {
  spot_rules: { clip_seconds:3, clip_max_bytes:20971520, countdown:1, duration_min:5, duration_max:720, radius_km:60 },
  spots_feed: b => { calls.feed.push(b); return { signed_in:true, spots: feed.filter(s => !b.p_intention || s.intentions.includes(b.p_intention)) }; },
  spots_exact: b => { calls.exact.push(b); return { signed_in:true, spots: exact.filter(s => !b.p_intention || s.intentions.includes(b.p_intention)) }; },
  spot_get: b => ({ ok:true, spot: feed[0] }),
  spot_create: b => ({ ok:true, id:'new1', ends_at: iso(30*60e3) }),
};
const tables = { totehms: [{ steps:[{ t:'Run the hill', f:'every_morning', is:['fight','flow'] }, { t:'Cold shower', f:'daily', is:['focus'] }] }],
  profiles: [{ pseudo:'wah' }] };
const browser = await launch();
const { pg, log } = await page(browser, { dir:'space', origin:'https://www.totehm.space', rpc, tables });
await pg.goto('https://www.totehm.space/');
await pg.waitForFunction(() => window.__totehm_space && window.__totehm_space().exact > 0, null, { timeout:15000 });
let d = await pg.evaluate(() => window.__totehm_space());
ok(d.build === '2026-10-01', 'build 2026-10-01');
ok(d.view === 'radar' && d.intention === 'love', 'arrival: radar, LOVE');
ok((await pg.textContent('#title-int')) === 'Love' && await pg.$('#title svg use[href="#higher-badge"]'), 'title = intention + Higher badge');
ok(calls.exact.every(c => c.p_intention === 'love'), 'radar asks for love');
ok(calls.feed.length > 0 && calls.feed.every(c => c.p_lat == null || Math.round(c.p_lat*10) === c.p_lat*10), 'feed is asked with a city-scale position only');
// Les sept, dans l'ordre des chakras
const order = await pg.$$eval('#ints [data-int]', l => l.map(b => b.dataset.int));
ok(order.join() === 'celebrate,focus,express,love,enrich,flow,fight', 'seven filters, violet on top, red at the bottom: ' + order.join());
// Pas de Bebas, pas de fond blanc, pas de %
const audit = await pg.evaluate(() => {
  const fonts = new Set(), white = [];
  document.querySelectorAll('body *').forEach(e => { const s = getComputedStyle(e); fonts.add(s.fontFamily.split(',')[0].replace(/"/g, '').trim());
    if(/^rgba?\(255, 255, 255(, 1)?\)$/.test(s.backgroundColor) && e.offsetWidth > 20) white.push(e.tagName + '#' + e.id + '.' + e.className); });
  return { fonts:[...fonts], white, bebas: /Bebas/i.test(document.documentElement.outerHTML), pct: /\d+%\s*(match|·)/i.test(document.body.innerText),
    logo: !!document.getElementById('space-mark'), termsFixed: !!document.getElementById('terms') };
});
ok(!audit.bebas, 'no Bebas Neue anywhere in the page');
ok(audit.fonts.every(f => /Space Mono|Quantico|monospace|sans-serif|Times|serif/.test(f)), 'fonts: ' + audit.fonts.join(','));
ok(!audit.white.length, 'no white background: ' + audit.white.join(' '));
ok(!audit.pct, 'no match %');
ok(!audit.logo && !audit.termsFixed, 'no landing logo, no fixed terms link');
// Le radar : toucher un point ouvre CE Spot, seul
await pg.waitForTimeout(400);
const pt = await pg.evaluate(() => { const c = document.getElementById('canvas'); return null; });
const pts = await pg.evaluate(() => window.__RADPTS = null);
await pg.screenshot({ path: OUT + '/space_radar.png' });
// on vise le point le plus proche du centre (mon Spot privé, à ~15 m)
const box = await pg.$eval('#canvas', c => { const r = c.getBoundingClientRect(); return { w:r.width, h:r.height }; });
const cy = 64 + (box.h - 64 - 120)/2;
await pg.mouse.click(box.w/2, cy);
await pg.waitForTimeout(300);
let det = await pg.evaluate(() => window.__totehm_space().detail);
if(!det){ // le point peut être un peu décalé : balayer autour
  for(const [dx, dy] of [[4,-4],[-4,4],[8,0],[0,8],[-8,0],[0,-8]]){ await pg.mouse.click(box.w/2 + dx, cy + dy); await pg.waitForTimeout(150); if(await pg.evaluate(() => window.__totehm_space().detail)) break; }
}
det = await pg.evaluate(() => window.__totehm_space().detail);
ok(det, 'tapping a radar point opens that spot');
const dt = await pg.textContent('#detail');
ok(/I AM HERE/.test(dt) && (dt.match(/I AM HERE|I WAS THERE/g) || []).length === 1, 'detail shows ONE spot, I AM HERE');
await pg.keyboard.press('Escape');
// RIGHT : la liste, avec la distance (point autorisé)
await pg.keyboard.press('ArrowRight');
await pg.waitForFunction(() => window.__totehm_space().view === 'list');
const lt = await pg.textContent('#list');
ok(/I WAS THERE/.test(lt) && /I AM HERE/.test(lt), 'list: I AM HERE and I WAS THERE');
ok(/km/.test(lt), 'authorized exact spots show a distance');
ok(await pg.$$eval('#list .tname', l => l.every(t => !/^by /i.test(t.textContent))), '"by" is outside the navy tile');
ok(await pg.evaluate(() => getComputedStyle(document.getElementById('ints')).opacity) === '1', 'seven filters on the right of the list');
await pg.screenshot({ path: OUT + '/space_list.png' });
// L'intention change → les trois vues suivent, et c'est retenu
await pg.click('#ints [data-int="fight"]');
await pg.waitForTimeout(300);
ok(calls.exact.at(-1).p_intention === 'fight' && calls.feed.at(-1).p_intention === 'fight', 'intention shared by the views');
ok((await pg.textContent('#title-int')) === 'Fight', 'title follows the intention');
// LEFT : le fil, nu
await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('ArrowLeft');
await pg.waitForFunction(() => window.__totehm_space().view === 'feed');
await pg.waitForTimeout(700);
const fv = await pg.evaluate(() => ({ joy: getComputedStyle(document.getElementById('joy')).opacity, radar: getComputedStyle(document.getElementById('v-radar')).visibility,
  canvasVisible: document.getElementById('canvas').offsetParent !== null && getComputedStyle(document.getElementById('v-radar')).visibility === 'visible',
  ctrls: ['zoom','cmp','how','z-me'].filter(id => document.getElementById(id)).length, text: document.getElementById('feed').innerText }));
ok(fv.radar === 'hidden' && fv.joy === '0' && fv.ctrls === 0, 'feed: no radar behind, no controls');
ok(!/\d+\s*°|NORTH|N\s*W/.test(fv.text), 'feed: no heading');
ok(!/km|mi\b/.test(fv.text.replace(/\bmine\b/g, '')) || /mine-p/.test(fv.text) === false, 'feed: no distance for the city-only spots');
ok(log.signed >= 1, 'the visible clip asks a signed URL (' + (log.signed || 0) + ')');
const srcs = await pg.$$eval('#feed video', l => l.map(v => v.getAttribute('src') || ''));
ok(srcs.filter(Boolean).length <= 2 && srcs.filter(Boolean).every(s => /object\/sign\/moments\//.test(s)), 'only the clip on screen is loaded, signed: ' + srcs.filter(Boolean).length);
await pg.screenshot({ path: OUT + '/space_feed.png' });
// TOP : la barre, la recherche persiste
await pg.keyboard.press('ArrowRight');
await pg.waitForFunction(() => window.__totehm_space().view === 'radar');
await pg.keyboard.press('ArrowUp');
await pg.waitForFunction(() => window.__totehm_space().view === 'search');
ok(await pg.$$eval('#v-search input, #v-search select, #v-search button', l => l.length) === 2, 'search view = one bar (+ clear)');
await pg.fill('#q', 'hill');
await pg.waitForTimeout(500);
ok(calls.exact.at(-1).p_q === 'hill' && calls.feed.at(-1).p_q === 'hill', 'search reaches the three views');
await pg.keyboard.press('Enter');
await pg.waitForFunction(() => window.__totehm_space().view === 'radar');
ok((await pg.evaluate(() => window.__totehm_space().search)), 'search persists back on the radar');
// BOTTOM : la caméra d'abord
await pg.keyboard.press('ArrowDown');
await pg.waitForFunction(() => window.__totehm_space().view === 'cam');
await pg.waitForFunction(() => ['count','rec'].includes(window.__totehm_space().rec.step), null, { timeout:8000 });
ok(!(await pg.$('#cam-body [data-h]')), 'no form before the camera');
await pg.waitForFunction(() => window.__totehm_space().rec.step === 'rec', null, { timeout:5000 });
ok(true, 'recording starts after the countdown');
await pg.waitForFunction(() => window.__totehm_space().rec.step === 'habit', null, { timeout:8000 });
ok((await pg.evaluate(() => window.__totehm_space().rec.clip)), 'recording stops by itself at the limit');
await pg.waitForSelector('#cam-body [data-h]');
await pg.click('#cam-body [data-h="0"]');
ok(await pg.$eval('#cam-body [data-send]', b => b.disabled), 'I AM HERE disabled until complete');
await pg.click('[data-vis="shared"]');
ok(/silent/.test(await pg.textContent('#cam-body')) && /location/.test(await pg.textContent('#cam-body')), 'SHARED asks silent/social and location');
await pg.click('[data-mode="silent"]'); await pg.click('[data-loc="on"]'); await pg.click('[data-dur="30"]');
await pg.fill('#c-say', 'come run');
await pg.screenshot({ path: OUT + '/space_create.png' });
await pg.click('[data-send]');
await pg.waitForFunction(() => window.__totehm_space().view === 'radar', null, { timeout:8000 });
const sc = log.rpc.find(r => r.name === 'spot_create')?.body;
ok(sc && sc.p_habit === 'Run the hill' && sc.p_visibility === 'shared' && sc.p_mode === 'silent' && sc.p_location === 'on' && sc.p_duration_min === 30 && sc.p_comment === 'come run',
  'spot_create carries habit, shared, silent, location on, 30 min, the word');
ok(sc && new RegExp('^' + USER.id + '/[0-9a-f-]{36}\\.(webm|mp4)$').test(sc.p_video) && sc.p_city === 'Lisbon', 'video in MY folder, city from Natural Earth');
ok(!('p_intentions' in (sc || {})), 'intentions come from the habit, not from the page');
ok(await pg.evaluate(() => localStorage.getItem('space_vis')) === 'shared', 'last PRIVATE/SHARED choice remembered');
// PRIVATE : ni mode ni location exigés
await pg.keyboard.press('ArrowDown');
await pg.waitForFunction(() => window.__totehm_space().rec.step === 'habit', null, { timeout:12000 });
ok((await pg.evaluate(() => window.__totehm_space().rec.vis)) === 'shared', 'the next spot starts on the remembered choice');
await pg.click('#cam-body [data-h="1"]'); await pg.click('[data-vis="private"]'); await pg.click('[data-dur="15"]');
ok(!(await pg.$eval('#cam-body [data-send]', b => b.disabled)) && !/silent/.test(await pg.textContent('#cam-body')), 'PRIVATE: no silent/social, no location required');
await pg.click('[data-send]');
await pg.waitForFunction(() => window.__totehm_space().view === 'radar', null, { timeout:8000 });
const sp = log.rpc.filter(r => r.name === 'spot_create').at(-1).body;
ok(sp.p_visibility === 'private' && sp.p_mode === null && sp.p_location === null, 'private spot: no mode, no location');
// Le menu membre : les conditions en dernier
await pg.click('#member');
const items = await pg.$$eval('#menu .m-it', l => l.map(e => e.textContent));
ok(items.at(-1) === 'Simple terms of use', 'Simple terms of use is the last entry: ' + items.join(' | '));
// Un lien partagé ouvre un Spot
await pg.goto('https://www.totehm.space/?spot=f1');
await pg.waitForFunction(() => window.__totehm_space && window.__totehm_space().detail, null, { timeout:10000 });
ok(true, 'a shared link opens the spot');
log.errors = log.errors.filter(e => !/404|Failed to load resource|MEDIA/i.test(e));
ok(!log.errors.length, 'no page error: ' + log.errors.join(' | '));
await browser.close();
