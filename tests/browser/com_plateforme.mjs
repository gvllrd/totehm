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
  spot_schedule_audience:{ ok:true, id:'p9', state:'will' }, spot_box_set:{ ok:true },
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
     /* 16/10 : le nom a quitté le recto du papier — il vit EN HAUT, au centre, en petit, et il n'en bouge jamais. */
     connAbs:!document.getElementById('conn-bar'),
     sigInPaper:!document.getElementById('ast-sig'), nameBtn:getComputedStyle(document.getElementById('name-btn')).display,
     thp:!!document.getElementById('lv-thp-say'), tag:!!document.getElementById('lv-b-tag'), build:window.__totehm_lv().build,
     pitch:document.getElementById('lv-pitch').classList.contains('hide'), tap:document.getElementById('lv-tap').textContent }));
   ok(!c.why && !c.strat && !c.thp && !c.tag, 'COM : plus de « [Higher] STRATEGY », de phrase sous lui, de texte du THP ni de slogan TotehmSM');
   ok(c.pitch && /to open it · (Turn|Swipe) to configure it/.test(c.tap), '15/10 bis : un MEMBRE ne lit pas l\'argumentaire — le geste seul');
   ok(c.connAbs && c.sigInPaper && c.nameBtn === 'none', 'le nom du Totehm ne vit QUE sur la face verso (18/10) — ni en haut de l\'atterrissage, ni sur le recto du papier');
   ok(c.build === '2026-10-27-com-prise-de-spot', 'BUILD 2026-10-27-com-prise-de-spot');
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
   await pg.click('#lv-tap-open'); await pg.waitForFunction(() => !document.body.classList.contains('gate'), null, { timeout:8000 });
   await pg.waitForSelector('#habits [data-open]'); await pg.locator('#habits [data-open]').first().evaluate(e => e.click());
   /* ⚠️ 16/10 : il n'y a plus de SPACES dans une Habit Box — seulement des SPOTS (Wah : « on a supprimé
      tous les spaces, on garde seulement les spots »), et ANNONCER un spot ne quitte plus la boîte. */
   await pg.waitForSelector('#habits [data-space]');
   const url0 = pg.url();
   ok(await pg.locator('#habits [data-format="space"]').count() === 0 && await pg.locator('#habits [data-format="spot"]').count() === 1
      && !await pg.locator('#habits [data-newspace]').count(), 'la Habit Box ne montre plus que ses SPOTS, et « + a space » est parti');
   /* un spot → le Club, sur place ; la croix rend le Totehm tel qu'il était */
   await pg.locator('#habits [data-format="spot"]').click();
   await pg.waitForFunction(() => window.__totehm_xo().actif === 'club');
   const cl = cadre(pg, 'club'); await cl.waitForSelector('#detail.is-open', { timeout:10000 });
   ok(pg.url() === url0 && !log.functions.some(f => f.name === 'sso-mint'), 'un spot s\'ouvre SUR PLACE : même page, aucun pont SSO');
   ok(await cl.evaluate(() => document.body.classList.contains('is-embed')), 'dans la couche : le Club sans son coin membre (COM le tient)');
   await pg.screenshot({ path:OUT + '/plateforme_spot.png' });
   await pg.goBack(); await pg.waitForFunction(() => !window.__totehm_xo().actif);
   ok(pg.url() === url0 && await pg.locator('#habits [data-space]').count() === 1, '« précédent » referme la couche, sans quitter le Totehm (la Habit toujours ouverte)');
   /* 27/10 — [Add a spot] : le Totehm se replie, la vue de DROITE s'ouvre sur la prise de spot, CETTE Habit choisie
      (Wah : « la prise de spot se fait dans la vue de droite ») ; aucune autre page, aucun cadre */
   await pg.locator('#habits [data-spotnew]').click();
   await pg.waitForFunction(() => window.__totehm_lv().vue === 'd' && !document.getElementById('rdr-new').hidden, null, { timeout:12000 }).catch(() => {});
   const sn = await pg.evaluate(() => ({ vue:window.__totehm_lv().vue, xo:window.__totehm_xo().actif, ancien:!!document.querySelector('[data-sn],[data-spotgo]'),
     h:[...document.querySelectorAll('#rdr-new .sfb.is-on .v-name')].map(e => e.textContent.trim()).join('|') }));
   ok(sn.vue === 'd' && !sn.xo && !sn.ancien && sn.h === 'Deep practice', '[Add a spot] : la prise de spot de la vue de droite, CETTE Habit choisie — pas une autre page → ' + JSON.stringify(sn));
   await pg.click('#rdr-new [data-ns="quand"][data-v="later"]'); await pg.click('#rdr-new [data-ns="aud"][data-v="figher"]');
   await pg.click('#rdr-new [data-ns="mode"][data-v="silent"]'); await pg.click('#rdr-new [data-ns="ici"]');
   await pg.waitForSelector('#rdr-new [data-ns="dur"][data-v="60"]', { timeout:8000 });
   await pg.click('#rdr-new [data-ns="dur"][data-v="60"]'); await pg.fill('#rdr-new [data-nsi="place"]', 'the hill');
   await pg.click('#rdr-new .ns-go');
   await pg.waitForFunction(() => !document.body.classList.contains('is-nspot'), null, { timeout:12000 }).catch(() => {});
   const an = log.rpc.find(r => r.name === 'spot_schedule_audience');
   ok(an && an.body.p_habit === 'Deep practice' && an.body.p_place === 'the hill' && an.body.p_audience === 'figher'
      && an.body.p_location === 'on' && an.body.p_mode === 'silent' && typeof an.body.p_lat === 'number',
     'annoncer : spot_schedule_audience avec MA Habit, le lieu, qui le voit et le POINT (ma position, jamais une fausse)');
   ok(log.rpc.filter(r => r.name === 'habit_spaces').length >= 2, 'à chaque retour (et après une annonce), le Totehm relit ses spots');
   ok(!log.functions.some(f => f.name === 'sso-mint'), 'aucun pont SSO de tout le parcours');
   ok(!erreurs(log).length, 'parcours : aucune erreur ' + erreurs(log).join(' | '));
   await pg.context().close(); }

 /* ── 3 · 15/10 : le lecteur social conservé ; galerie et Club consultatif à leur entrée ── */
 { const { pg, log } = await page(browser, { dir:'space', origin:'https://www.totehm.space', tables, rpc });
   await pg.goto('https://www.totehm.space/social'); await pg.waitForFunction(() => window.__totehm_space?.().view === 'feed');
   ok(true, 'le lecteur social demeure accessible à son adresse conservée');
   ok(await pg.$eval('#joy-box', e => e.style.getPropertyValue('--joy-vue')) === 'var(--rep)' && await pg.$eval('#joy-box', e => e.classList.contains('is-side')), 'au fil, la manette garde ses couleurs d\'avant (rouge-violet)');
   await pg.click('#cur-g'); await pg.waitForFunction(() => window.__totehm_space().view === 'home');
   ok(!(await pg.locator('#home-what').count()) && await pg.locator('#x-back').isHidden(), 'à gauche du fil, SPACE sans phrase ; hors de COM, pas de croix');
   ok(!erreurs(log).length, 'SPACE seul : aucune erreur');
   await pg.context().close(); }
 { const { pg, log } = await page(browser, { dir:'space', origin:'https://www.totehm.space', tables, rpc });
   /* ⚠️ 18/10 — le compte de salles était épinglé à 4 ; le temple du 17/10 en a changé le nombre et
      cette suite PLANTAIT (le compteur de PASS masquait l'exception : 20 au lieu de 23, fail=0).
      Ce contrôle ne porte pas sur le nombre de salles — il porte sur « l'entrée SPACE sert les
      œuvres sans charger le fil social ». On attend donc une galerie VIVANTE, pas un chiffre. */
   await pg.goto('https://www.totehm.space/'); await pg.waitForFunction(() => window.__totehm_gallery?.().rooms > 0);
   ok(await pg.locator('a[href="/get_higher"]').count()>0 && !log.rpc.some(r=>r.name==='space_feed'), 'entrée SPACE : les œuvres, sans chargement du fil social');
   await pg.context().close(); }
 { const { pg, log } = await page(browser, { dir:'club', origin:'https://www.figher.club', tables, rpc:{...rpc,club_spots:{ok:true,items:[],total:0,has_more:false,next_offset:0,as_of:new Date().toISOString()}} });
   /* ⚠️ 18/10 — le contrôle visait la consultation seule du 15/10. Wah a demandé le 17/10 le RETOUR
      de l'interface d'avant (cinq vues, référence b4ae3f0) : `period` n'existe plus (`view`), et le
      plan et la caméra sont REVENUS. Ce qui reste vrai, et ce qu'on vérifie : l'entrée du Club est
      le RADAR, et elle tourne sans erreur. */
   await pg.goto('https://www.figher.club/'); await pg.waitForFunction(() => window.__totehm_club?.().view === 'radar');
   ok(await pg.locator('#v-radar.is-on').count() === 1 && await pg.locator('#v-plan,#v-list,#v-cam,#v-past').count() === 4, 'entrée Club : le radar, et les cinq vues restaurées (17/10)');
   ok(!erreurs(log).length, 'Club seul : aucune erreur');
   await pg.context().close(); }
}finally{ await browser.close(); }
