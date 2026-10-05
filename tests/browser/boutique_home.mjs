// higher.boutique — la page d'atterrissage (05/10/2026, retour à la page d'avant). Zéro réseau.
// LANCER : node boutique_home.mjs /tmp
import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '.';
const browser = await launch();
const CLOTHS = {
  '0.hill': { found:true, name:'0.Hill', legacy:false, level:'member', view:'habits', created_at:'2026-10-05', palette:['#E24B4A'], text:'Run the hill', is:['fight'], owner:'nia', matter:null },
  '0.lock': { found:true, name:'0.Lock', legacy:false, level:'locked', view:'wisdom', created_at:'2026-10-05', palette:null, text:null, is:null, owner:null, matter:null },
  '0.old':  { found:true, name:'0.Old', legacy:true, level:'full', message:'I stay higher', created_at:'2026-09-01' },
};
const rpc = { reveal_cloth: b => CLOTHS[String(b.p_name).toLowerCase()] || { found:false } };
const tables = { totehm_cloth_support: [{ max_pieces:50, claimed:3 }], profiles: [{ pseudo:'Vallerand' }], subscribers: [] };
const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, session:false });
await pg.goto('https://www.higher.boutique/');
await pg.waitForFunction(() => window.__totehm_boutique && /47 pieces left/.test(document.querySelector('#sw-col-sold').textContent));
const d = await pg.evaluate(() => window.__totehm_boutique());
ok(d.build === '2026-10-05-landing' && !d.joystick, 'the landing page is back, no joystick');
ok(d.collab && d.logos === 0 && d.luxury_link, 'Totehm x Champion 2026 under Create, written, no logo');
ok(d.branding_com && d.club_links === 0, 'Experience our dope branding → totehm.com');
const order = await pg.evaluate(() => { const a = document.querySelector('a[href="streetwear.html"]').getBoundingClientRect().top, c = document.querySelector('#collab').getBoundingClientRect().top, l = document.querySelector('a[href="/luxury"]').getBoundingClientRect().top; return a < c && c < l; });
ok(order, 'the collection sits under [Create my Totehm Streetwear Cloth], above Luxury');
await pg.screenshot({ path: OUT + '/bq_landing.png' });
await pg.click('#decode-btn');
for(const [name, re, lvl] of [['0.hill', /Run the hill/, 'member'], ['0.lock', /FIGHER/, 'locked'], ['0.old', /I stay higher/, 'full']]){
  await pg.fill('#decode-input', name); await pg.press('#decode-input', 'Enter');
  await pg.waitForFunction(n => document.querySelector('#decode-fs').classList.contains('show') && window.__totehm_boutique().decode, name);
  ok(re.test(await pg.textContent('#decode-msg')) && (await pg.evaluate(() => window.__totehm_boutique().decode.level)) === lvl, 'decode ' + lvl + ': reveal_cloth');
  if(lvl === 'locked') ok(!/Run the hill/.test(await pg.textContent('#decode-msg')), 'decode locked: no box text');
  await pg.click('#decode-back');
}
await pg.fill('#decode-input', '0.none'); await pg.press('#decode-input', 'Enter');
await pg.waitForFunction(() => /no Totehm Cloth/.test(document.querySelector('#decode-note').textContent));
ok(true, 'decode unknown: said');
ok(!log.errors.length, 'no page error: ' + log.errors.join(' | '));
await browser.close();
