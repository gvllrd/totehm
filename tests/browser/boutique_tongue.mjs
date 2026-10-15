// 13/10/2026 (lot B3) — à l'arrivée sur /get_higher : la bouche s'ouvre, le TotehmPaper se pose sur la langue, elle
// l'avale — UNE fois par session ; un tap passe ; jamais avec une adresse à paramètres ni en mouvement réduit.
// 15/10 (lot processeur) : la bouche du 12/10 revient sur totehm.com, EN HAUT (Get Higher) ; elle y a déjà avalé
// le papier, donc elle mène à /get_higher?from=com — et la boutique ne rejoue pas la langue. LANCER : node boutique_tongue.mjs /tmp
import fs from 'node:fs';
import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '/tmp'; fs.mkdirSync(OUT, { recursive:true });
const B = 'https://www.higher.boutique';
const erreurs = log => log.errors.filter(e => e.startsWith('pageerror'));
const browser = await launch();
const etat = pg => pg.evaluate(() => ({ ...(window.__totehm_langue ? window.__totehm_langue() : { absent:true }), gone:document.getElementById('tongue').classList.contains('is-gone') }));
try{
 /* ── 1 · première arrivée : la scène joue, puis s'efface d'elle-même ; la deuxième fois, rien ── */
 { const { pg, log } = await page(browser, { dir:'boutique', origin:B, session:false, viewport:{ width:390, height:844 } });
   await pg.goto(B + '/get_higher'); await pg.waitForTimeout(700);
   let e = await etat(pg);
   ok(e.joue === true && !e.gone, 'arrivée : la bouche s\'ouvre, le TotehmPaper se pose sur la langue');
   await pg.screenshot({ path:OUT + '/tongue_play.png' });
   await pg.waitForFunction(() => window.__totehm_langue().fini && document.getElementById('tongue').classList.contains('is-gone'), null, { timeout:8000 }).catch(() => {});
   e = await etat(pg);
   ok(e.fini && e.gone, 'elle l\'avale, puis la scène s\'efface seule (≈ 3,2 s)');
   await pg.reload(); await pg.waitForTimeout(500);
   e = await etat(pg);
   ok(e.joue === false && e.gone, 'une fois par session : la deuxième arrivée va droit à la page');
   ok(!erreurs(log).length, 'langue : aucune erreur ' + erreurs(log).join(' | ')); await pg.context().close(); }
 /* ── 2 · un tap passe ── */
 { const { pg, log } = await page(browser, { dir:'boutique', origin:B, session:false, viewport:{ width:1280, height:800 } });
   await pg.goto(B + '/get_higher'); await pg.waitForTimeout(500);
   await pg.mouse.click(640, 400); await pg.waitForTimeout(700);
   const e = await etat(pg);
   ok(e.fini && e.gone, 'un tap passe la scène');
   ok(!erreurs(log).length, 'tap : aucune erreur'); await pg.context().close(); }
 /* ── 3 · une adresse à paramètres (retour Stripe…) ou le mouvement réduit : jamais ── */
 { const { pg } = await page(browser, { dir:'boutique', origin:B, session:false });
   await pg.goto(B + '/get_higher?from=com'); await pg.waitForTimeout(500);
   ok((await etat(pg)).joue === false, 'venu de totehm.com (?from=com, la langue a déjà eu lieu) : pas de scène'); await pg.context().close(); }
 { const { pg } = await page(browser, { dir:'boutique', origin:B, session:false });
   await pg.goto(B + '/get_higher?from=method'); await pg.waitForTimeout(500);
   ok((await etat(pg)).joue === false, 'avec des paramètres (retour Stripe…) : pas de scène'); await pg.context().close(); }
 { const { pg } = await page(browser, { dir:'boutique', origin:B, session:false });
   await pg.emulateMedia({ reducedMotion:'reduce' }); await pg.goto(B + '/get_higher'); await pg.waitForTimeout(500);
   ok((await etat(pg)).joue === false, 'mouvement réduit : pas de scène'); await pg.context().close(); }
 /* ── 4 · totehm.com : la bouche est revenue, EN HAUT ; au centre elle est fermée et invisible ── */
 { const { pg, log } = await page(browser, { dir:'com', origin:'https://www.totehm.com', session:false });
   await pg.goto('https://www.totehm.com/totehm'); await pg.waitForTimeout(800);
   const m = await pg.evaluate(() => ({ n:document.querySelectorAll('#gate-mouth #m-lips, #gate-mouth #m-tongue').length,
     op:getComputedStyle(document.getElementById('gate-mouth')).opacity, ouverte:window.__totehm_lsd.bouche }));
   ok(m.n === 2 && m.op === '0' && m.ouverte === false, 'totehm.com : la bouche du 12/10 est là, fermée, invisible au centre ' + JSON.stringify(m));
   ok(!erreurs(log).length, 'COM, la bouche : aucune erreur'); await pg.context().close(); }
}finally{ await browser.close(); }
