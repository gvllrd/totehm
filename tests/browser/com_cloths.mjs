// 08/10/2026 (ter) — COM ↔ higher.boutique : la boutique se cale dans WISDOM et VISION, comme SPACE dans les habits.
// Fermée, une leçon dit combien de Cloths la portent ; ouverte, elle les montre (nom Coral, étape) et « + totehmize »
// part sur /streetwear avec CET élément ; un Cloth ouvre sa page Decode. Par le pont SSO. Tout est simulé.
// LANCER : node com_cloths.mjs /tmp
import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '/tmp'; const browser = await launch(); const origin = 'https://www.totehm.com';
const CODE = 'c'.repeat(64);
const erreurs = log => log.errors.filter(e => e.startsWith('pageerror'));
const trips = { signed_in:true, trips:[{ id:'o1', text:'Marathon in May', is:['flow'] }], reps:[],
  wisdom:[{ id:'w1', text:'Slow is smooth', is:['focus'] }, { id:'w2', text:'Breathe first', is:['flow'] }],
  visions:[{ id:'v1', text:'A studio by the sea', is:['express'] }] };
const mine = { ok:true, mine:true, elements:[{ kind:'wisdom', ref:'w1', total:4, cloths:[
  { name:'0.Hill', line:'streetwear', stage:'shipped', test:false }, { name:'0.Sea', line:'luxury', stage:'making', test:false },
  { name:'0.Try', line:'streetwear', stage:'making', test:true }] }] };
const land = { signed_in:true, pseudo:'wah', visibility:'private', offer:{ enabled:false }, higher:{ active:false, price_cents:700, currency:'eur' }, thp:false, subscriptions:0, subscribers:0 };
const network = url => url.host === 'www.higher.boutique' ? { status:200, contentType:'text/html', body:'<p>boutique</p>' } : null;
const source = { ok:true, pseudo:'studio', steps:[{ t:'Deep practice', is:['focus'] }], objs:{}, trips:[], reps:[],
  wisdom:[{ id:'w9', text:'Attention is a choice', is:['focus'] }], visions:[] };
const theirs = { ok:true, mine:false, elements:[{ kind:'wisdom', ref:'w9', total:1, cloths:[{ name:'0.Calm', line:'streetwear', stage:'production', test:false }] }] };

async function ouvrir(pg){
  await pg.goto(origin + '/totehm'); await pg.waitForSelector('body.member'); await pg.waitForTimeout(700);
  await pg.click('#lv-tap'); await pg.waitForFunction(() => !document.body.classList.contains('gate'), null, { timeout:6000 }).catch(() => {});
  await pg.waitForTimeout(1200);
}
async function vers(pg, touche, vue){
  await pg.keyboard.press(touche); await pg.waitForFunction(v => window.__totehm_zone?.vue === v, vue, { timeout:6000 }); await pg.waitForTimeout(500);
}
try{
 /* ── 1 · MON Totehm : WISDOM dit combien de Cloths, les montre, et « + totehmize » ── */
 { const { pg, log } = await page(browser, { dir:'com', origin, tables:{ profiles:[{ pseudo:'wah' }] }, network,
     rpc:{ my_landing:land, my_trips:trips, habit_spaces:{ ok:true, mine:true, habits:[] }, element_cloths:mine }, functions:{ 'sso-mint':{ code:CODE } } });
   await ouvrir(pg);
   await vers(pg, 'ArrowLeft', 'wisdom');
   const call = log.rpc.find(x => x.name === 'element_cloths');
   ok(call && call.body.p_pseudo === null, 'COM lit MES Cloths (element_cloths, p_pseudo null)');
   await pg.waitForFunction(() => /4 cloths/i.test(document.querySelector('#habits').textContent));
   const ferme = await pg.evaluate(() => [...document.querySelectorAll('#habits [data-open^="w:"]')].map(b => ({ id:b.dataset.open, n:(b.querySelector('.v-spc')?.textContent || '') })));
   ok(ferme.find(x => x.id === 'w:w1')?.n === '4 cloths' && ferme.find(x => x.id === 'w:w2')?.n === '', 'fermée, la leçon dit « 4 cloths » ; sans Cloth, rien');
   ok((await pg.evaluate(() => window.__totehm_zone.cloths)) === 4, 'diagnostic : __totehm_zone.cloths = 4');
   await pg.locator('#habits [data-open="w:w1"]').evaluate(e => e.click()); await pg.waitForTimeout(400);
   const o = await pg.evaluate(() => { const c = [...document.querySelectorAll('#habits [data-cloth]')];
     return { n:c.length, noms:c.map(b => b.dataset.cloth).join(','), etats:c.map(b => b.querySelector('.ms-st').textContent).join(' | '),
       coral:getComputedStyle(c[0].querySelector('.mc-n')).color, quantico:/Quantico/.test(getComputedStyle(c[0].querySelector('.mc-n')).fontFamily),
       label:[...document.querySelectorAll('#habits .mg-l')].map(l => l.textContent).join(' | '), plus:document.querySelector('#habits [data-totehmize]')?.dataset.totehmize }; });
   ok(o.n === 3 && o.noms === '0.Hill,0.Sea,0.Try' && /cloths · 3 of 4/.test(o.label), 'ouverte : trois Cloths au plus, « cloths · 3 of 4 »');
   ok(/shipped/.test(o.etats) && /in the making · luxury/.test(o.etats) && /in the making · test/.test(o.etats), 'chaque Cloth dit son étape (luxury, test marqués) : ' + o.etats);
   ok(o.coral === 'rgb(251, 213, 202)' && o.quantico, 'le nom 0.xxx en Quantico Coral');
   ok(o.plus === 'wisdom:w1', '« + totehmize » porte CET élément (wisdom:w1)');
   await pg.screenshot({ path:OUT + '/com_wisdom_cloths.png' });
   const nav = pg.waitForURL(/higher\.boutique/, { timeout:8000 }).then(() => pg.url(), () => '');
   await pg.click('#habits [data-totehmize]');
   const u = await nav;
   ok(u === 'https://www.higher.boutique/streetwear?wear=wisdom%3Aw1#sso=' + CODE && log.functions.some(f => f.name === 'sso-mint' && f.body.target === 'boutique'),
     '« + totehmize » → /streetwear avec l\'élément, par le pont SSO → ' + u);
   ok(!erreurs(log).length, 'WISDOM : aucune erreur ' + erreurs(log).join(' | ')); await pg.context().close();
 }
 /* ── 2 · un Cloth ouvre sa page Decode ; VISION a aussi « + totehmize » ── */
 { const { pg, log } = await page(browser, { dir:'com', origin, tables:{ profiles:[{ pseudo:'wah' }] }, network,
     rpc:{ my_landing:land, my_trips:trips, habit_spaces:{ ok:true, mine:true, habits:[] }, element_cloths:mine }, functions:{ 'sso-mint':{ code:CODE } } });
   await ouvrir(pg);
   await vers(pg, 'ArrowRight', 'visions');
   await pg.locator('#habits [data-open="v:v1"]').evaluate(e => e.click()); await pg.waitForTimeout(400);
   ok((await pg.$eval('#habits [data-totehmize]', b => b.dataset.totehmize)) === 'vision:v1' && (await pg.locator('#habits [data-cloth]').count()) === 0,
     'VISION : pas encore de Cloth, « + totehmize » (vision:v1)');
   await vers(pg, 'ArrowLeft', 'habits'); await vers(pg, 'ArrowLeft', 'wisdom');
   await pg.locator('#habits [data-open="w:w1"]').evaluate(e => e.click()); await pg.waitForTimeout(400);
   const nav = pg.waitForURL(/higher\.boutique/, { timeout:8000 }).then(() => pg.url(), () => '');
   await pg.click('#habits [data-cloth="0.Hill"]');
   const u = await nav;
   ok(u === 'https://www.higher.boutique/?decode=0.Hill#sso=' + CODE, 'un Cloth → sa page Decode sur la boutique, par le pont → ' + u);
   ok(!erreurs(log).length, 'Decode : aucune erreur ' + erreurs(log).join(' | ')); await pg.context().close();
 }
 /* ── 3 · le Totehm d'un autre (lecture) : ses Cloths, jamais « + totehmize » ── */
 { const { pg, log } = await page(browser, { dir:'com', origin, tables:{ profiles:[{ pseudo:'wah' }] }, network,
     rpc:{ totehm_of:source, habit_spaces:{ ok:true, mine:false, habits:[] }, element_cloths:b => b.p_pseudo === 'studio' ? theirs : mine }, functions:{ 'sso-mint':{ code:CODE } } });
   await pg.goto(origin + '/totehm?ro=studio'); await pg.waitForSelector('body.ro:not(.gate)'); await pg.waitForTimeout(600);
   await vers(pg, 'ArrowLeft', 'wisdom');
   ok(log.rpc.some(x => x.name === 'element_cloths' && x.body.p_pseudo === 'studio'), 'en lecture : element_cloths(p_pseudo = studio), le serveur juge les droits');
   await pg.locator('#habits [data-open="w:w9"]').evaluate(e => e.click()); await pg.waitForTimeout(400);
   ok((await pg.locator('#habits [data-cloth="0.Calm"]').count()) === 1 && (await pg.locator('#habits [data-totehmize]').count()) === 0, 'ses Cloths, et pas de « + totehmize » chez un autre');
   ok(!erreurs(log).length, 'lecture : aucune erreur ' + erreurs(log).join(' | ')); await pg.context().close();
 }
 /* ── 4 · le serveur tousse : journalisé, la vue tient ── */
 { const { pg, log } = await page(browser, { dir:'com', origin, tables:{ profiles:[{ pseudo:'wah' }] }, network,
     rpc:{ my_landing:land, my_trips:trips, habit_spaces:{ ok:true, mine:true, habits:[] } },
     network:url => url.pathname.endsWith('/rpc/element_cloths') ? { status:500, contentType:'application/json', body:'{"message":"boom"}' } : null });
   await ouvrir(pg); await vers(pg, 'ArrowLeft', 'wisdom');
   await pg.locator('#habits [data-open="w:w1"]').evaluate(e => e.click()); await pg.waitForTimeout(400);
   ok((await pg.locator('#habits [data-totehmize]').count()) === 1 && !erreurs(log).length && log.errors.some(e => /element_cloths/.test(e)),
     'element_cloths en panne : journalisé, la leçon s\'ouvre, « + totehmize » reste');
   await pg.context().close();
 }
}finally{ await browser.close(); }
