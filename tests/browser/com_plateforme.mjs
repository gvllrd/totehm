// 12/10/2026 — UNE PLATEFORME (Wah) : SPACE et le Club vivent dans totehm.com (`/x/space`, `/x/club`, même
// origine, même session, sans pont), dans une couche chargée d'avance. Un space, un spot, « + a space »,
// « + a spot » s'ouvrent SUR PLACE ; la croix, Échap et « précédent » rendent le Totehm. Et COM parle moins :
// plus de [Higher] STRATEGY ni de phrase, le nom écrit sur le papier navy, Get Higher à GAUCHE, la recherche
// EN HAUT, le trackpad lu comme SPACE (deltaX > 0 → la vue de droite). 13/10 : la croix de Wah → com_croix.mjs. Tout est simulé. LANCER : node com_plateforme.mjs /tmp
import fs from 'node:fs';
import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '/tmp'; fs.mkdirSync(OUT, { recursive:true });
const origin = 'https://www.totehm.com', now = Date.now();
const erreurs = log => log.errors.filter(e => e.startsWith('pageerror'));
const land = { signed_in:true, pseudo:'wahigher', visibility:'private', offer:{ enabled:false }, higher:{ active:false, price_cents:700, currency:'eur', period:'month' }, thp:false, subscriptions:0, subscribers:0 };
const item = (id, format) => ({ id, format, habit:'Deep practice', intentions:['focus'], visibility:'shared', location:format==='space'?'off':'on', mode:'silent', city:'Lisbon',
  starts_at:new Date(now + 3600000).toISOString(), ends_at:new Date(now + 7200000).toISOString(), duration_min:60, exact:null, creator:'studio', mine:false });
const habits = [{ name:'Deep practice', freq:'daily', ints:['focus'], objectives:[{ text:'Build a practice' }], repulsions:[] }, { name:'Run the hill', freq:'every_morning', ints:['fight'], objectives:[], repulsions:[] }];
const rpc = { my_landing:land, habit_spaces:{ ok:true, mine:true, habits:[{ habit:'Deep practice', total:2, total_spaces:1, total_spots:1, spaces:[item('s1','space')], spots:[item('p1','spot')] }] },
  my_trips:{ signed_in:true, trips:[{ id:'o1', text:'Build a practice', is:['focus'] }], reps:[], wisdom:[], visions:[] }, element_cloths:{ ok:true, mine:true, elements:[] },
  spot_get:b => ({ ok:true, spot:item(b.p_id, b.p_id.startsWith('p') ? 'spot' : 'space') }), spot_rules:{ clip_seconds:33, duration_min:5, duration_max:720, horizon_days:90 },
  space_feed:{ ok:true, spots:[], more:false }, space_pulse:{ spaces_week:1, vibes_week:0 }, space_habits:{ ok:true, habits }, space_discover:{ spots:[], more:false }, spots_feed:{ spots:[], more:false } };
const tables = { profiles:[{ pseudo:'wahigher' }], totehms:[{ user_id:'u', steps:[{ t:'Deep practice', f:'daily', is:['focus'], i:'focus' }], totehm_visibility:'private' }] };
const xo = pg => pg.evaluate(() => window.__totehm_xo());
const cadre = (pg, k) => pg.frame({ url:u => String(u).includes('/x/' + k) });
const browser = await launch();
try{
 /* ── 1 · l'atterrissage : moins de mots, le nom sur le papier, la croix, le trackpad ── */
 { const { pg, log } = await page(browser, { dir:'com', origin, tables, rpc, viewport:{ width:1280, height:800 } });
   await pg.goto(origin + '/totehm'); await pg.waitForSelector('body.member'); await pg.waitForTimeout(900);
   const c = await pg.evaluate(() => ({ why:!!document.getElementById('lv-why'), strat:/strategy/i.test(document.getElementById('lv-slogan').textContent),
     sig:document.getElementById('ast-sig')?.textContent, sigFont:getComputedStyle(document.getElementById('ast-sig')).fontFamily,
     sigInPaper:!!document.querySelector('#ast-front #ast-sig'), nameBtn:getComputedStyle(document.getElementById('name-btn')).display,
     thp:!!document.getElementById('lv-thp-say'), tag:!!document.getElementById('lv-b-tag'), build:window.__totehm_lv().build }));
   ok(!c.why && !c.strat && !c.thp && !c.tag, 'COM : plus de « [Higher] STRATEGY », de phrase sous lui, de texte du THP ni de slogan TotehmSM');
   ok(c.sig === 'wahigher' && /Quantico/.test(c.sigFont) && c.sigInPaper && c.nameBtn === 'none', 'le nom est écrit SUR le papier (Quantico), plus de boîte noire sous lui');
   ok(c.build === '2026-10-15-com-processeur', 'BUILD 2026-10-15-com-processeur');
   await pg.screenshot({ path:OUT + '/plateforme_centre.png' });
   /* 15/10 : les trois vues, leurs gestes, la galaxie et la Reflection sont dans com_processeur.mjs. */
   /* La couche se réchauffe toute seule, sans rien charger dans SPACE ni le Club. */
   await pg.waitForFunction(() => window.__totehm_xo && window.__totehm_xo().prets.length === 2, null, { timeout:12000 }).catch(() => {});
   const x = await xo(pg);
   ok(x.prets.includes('space') && x.prets.includes('club') && !x.actif, 'SPACE et le Club sont chargés d\'avance, invisibles (' + x.prets.join(',') + ')');
   ok(!log.rpc.some(r => r.name === 'space_feed' || r.name === 'space_discover') && !log.functions.some(f => f.name === 'create-bunny-upload'),
     'réchauffés, ils ne lisent ni le fil, ni les spots, ni la vidéo');
   ok(!erreurs(log).length, 'atterrissage : aucune erreur ' + erreurs(log).join(' | '));
   await pg.context().close(); }

 /* ── 2 · mon Totehm : un space, un spot, + a space, + a spot — sur place ── */
 { const { pg, log } = await page(browser, { dir:'com', origin, tables, rpc, viewport:{ width:390, height:844 }, hasTouch:true,
     functions:{ 'create-bunny-upload':{ available:false }, 'sso-mint':{ code:'x'.repeat(64) } } });
   await pg.emulateMedia({ reducedMotion:'reduce' });
   await pg.goto(origin + '/totehm'); await pg.waitForSelector('body.member'); await pg.waitForTimeout(600);
   await pg.click('#lv-tap'); await pg.waitForFunction(() => !document.body.classList.contains('gate'), null, { timeout:8000 });
   await pg.waitForSelector('#habits [data-open]'); await pg.locator('#habits [data-open]').first().evaluate(e => e.click());
   await pg.waitForSelector('#habits [data-space]');
   const url0 = pg.url();
   await pg.locator('#habits [data-format="space"]').click();
   await pg.waitForFunction(() => window.__totehm_xo().actif === 'space');
   const sp = cadre(pg, 'space');
   await sp.waitForSelector('#detail.is-open', { timeout:10000 });
   ok(pg.url() === url0 && !log.functions.some(f => f.name === 'sso-mint'), 'un space s\'ouvre SUR PLACE : même page, aucun pont SSO');
   ok(await sp.evaluate(() => document.body.classList.contains('is-embed') && getComputedStyle(document.getElementById('who')).display === 'none'), 'dans la couche : SPACE sans son coin membre (COM le tient)');
   await pg.screenshot({ path:OUT + '/plateforme_space.png' });
   await sp.click('#x-back'); await pg.waitForFunction(() => !window.__totehm_xo().actif);
   ok(!(await pg.evaluate(() => document.body.classList.contains('gate'))) && await pg.locator('#habits [data-space]').count() === 2, 'la croix rend le Totehm tel qu\'il était (la Habit toujours ouverte)');
   ok(await sp.evaluate(() => !document.getElementById('detail').classList.contains('is-open')), 'fermé, SPACE s\'endort (fiche refermée, vidéo coupée)');
   /* un spot → le Club, sur place ; « précédent » le referme */
   await pg.locator('#habits [data-format="spot"]').click();
   await pg.waitForFunction(() => window.__totehm_xo().actif === 'club');
   const cl = cadre(pg, 'club'); await cl.waitForSelector('#detail.is-open', { timeout:10000 });
   ok(true, 'un spot s\'ouvre dans le Club, sur place');
   await pg.goBack(); await pg.waitForFunction(() => !window.__totehm_xo().actif);
   ok(pg.url() === url0, '« précédent » referme la couche, sans quitter le Totehm');
   /* + a space : la caméra de SPACE, sur CETTE Habit */
   await pg.locator('#habits [data-newspace]').click();
   await pg.waitForFunction(() => window.__totehm_xo().actif === 'space');
   await sp.waitForFunction(() => window.__totehm_space().view === 'cam', null, { timeout:10000 });
   await sp.waitForSelector('[data-start="photo"]'); await sp.click('[data-start="photo"]');
   await sp.waitForFunction(() => ['shot','ready'].includes(window.__totehm_space().rec.step), null, { timeout:15000 });
   await sp.click('#joy-box'); await sp.waitForFunction(() => window.__totehm_space().rec.step === 'form', null, { timeout:15000 });
   ok(/Deep practice/.test(await sp.textContent('#cam-body')), '+ a space : la caméra s\'ouvre sur place, la Habit déjà choisie (Deep practice)');
   await pg.screenshot({ path:OUT + '/plateforme_plus_space.png' });
   await sp.click('#x-back'); await pg.waitForFunction(() => !window.__totehm_xo().actif);
   /* + a spot : le plan du Club, sur CETTE Habit */
   await pg.locator('#habits [data-newspot]').click();
   await pg.waitForFunction(() => window.__totehm_xo().actif === 'club');
   await cl.waitForFunction(() => window.__totehm_club().view === 'plan', null, { timeout:10000 });
   await cl.waitForSelector('#plan-body .plan-habit', { timeout:10000 });
   ok(/Deep practice/.test(await cl.textContent('#plan-body .plan-habit')), '+ a spot : le plan du Club s\'ouvre sur place, sur la Habit (Deep practice)');
   await cl.click('#x-back'); await pg.waitForFunction(() => !window.__totehm_xo().actif);
   ok(log.rpc.filter(r => r.name === 'habit_spaces').length >= 3, 'à chaque retour, le Totehm relit ses spaces et ses spots');
   ok(!log.functions.some(f => f.name === 'sso-mint'), 'aucun pont SSO de tout le parcours');
   ok(!erreurs(log).length, 'parcours : aucune erreur ' + erreurs(log).join(' | '));
   await pg.context().close(); }

 /* ── 3 · totehm.space seul : on arrive dans le fil ; figher.club : le radar, sans phrase ── */
 { const { pg, log } = await page(browser, { dir:'space', origin:'https://www.totehm.space', tables, rpc });
   await pg.goto('https://www.totehm.space/'); await pg.waitForFunction(() => window.__totehm_space?.().view === 'feed');
   ok(true, 'totehm.space : on arrive dans le FIL (pur TikTok)');
   ok(await pg.$eval('#joy-box', e => e.style.getPropertyValue('--joy-vue')) === 'var(--rep)' && await pg.$eval('#joy-box', e => e.classList.contains('is-side')), 'au fil, la manette garde ses couleurs d\'avant (rouge-violet)');
   await pg.click('#cur-g'); await pg.waitForFunction(() => window.__totehm_space().view === 'home');
   ok(!(await pg.locator('#home-what').count()) && await pg.locator('#x-back').isHidden(), 'à gauche du fil, SPACE sans phrase ; hors de COM, pas de croix');
   ok(!erreurs(log).length, 'SPACE seul : aucune erreur');
   await pg.context().close(); }
 { const { pg, log } = await page(browser, { dir:'club', origin:'https://www.figher.club', tables, rpc });
   await pg.goto('https://www.figher.club/'); await pg.waitForFunction(() => window.__totehm_club?.().view === 'radar');
   ok(await pg.locator('#club-title p').count() === 0, 'figher.club : le radar et [Higher] SPOTS, sans phrase');
   ok(!erreurs(log).length, 'Club seul : aucune erreur');
   await pg.context().close(); }
}finally{ await browser.close(); }
