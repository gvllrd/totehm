// 13/10/2026 — LOT B (20/10 : l'ajout passe par [Add a media] seul) : une VISION porte une image libre (générée ailleurs ; « Generate » = lot C). Ouverte, la vision
// a « + image » : un JPEG ≤ 1080 px part dans MON dossier du seau `moments`, `vision_image_set` le pose, l'ancien
// fichier s'efface ; « × » la retire. Fermée, l'image s'affiche signée. Tout est simulé.
// LANCER : node com_vision_image.mjs /tmp
import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '/tmp'; const browser = await launch(); const origin = 'https://www.totehm.com';
const erreurs = log => log.errors.filter(e => e.startsWith('pageerror'));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const trips = { signed_in:true, trips:[{ id:'o1', text:'Save for the house', is:['enrich'] }], reps:[], wisdom:[],
  visions:[{ id:'v1', text:'A quiet house by the sea', is:['love'] }, { id:'v2', text:'Run Lisbon', is:['flow'] }] };
const land = { signed_in:true, pseudo:'wah', visibility:'private', offer:{ enabled:false }, higher:{ active:false, price_cents:700, currency:'eur' }, thp:false, subscriptions:0, subscribers:0 };
let image = 'u/vision-old.jpg';
const visions = () => ({ ok:true, visions:[{ id:'v1', text:'A quiet house by the sea', image, objectives:[] }, { id:'v2', text:'Run Lisbon', image:null, objectives:[] }] });
try{
  const { pg, log } = await page(browser, { dir:'com', origin, tables:{ profiles:[{ pseudo:'wah' }] },
    rpc:{ my_landing:land, my_trips:trips, habit_spaces:{ ok:true, mine:true, habits:[] }, element_cloths:{ ok:true, mine:true, elements:[] },
      my_visions:visions, vision_image_set:b => { const old = image; image = b.p_path; return { ok:true, image:b.p_path, old }; } } });
  /* l'URL signée sert une vraie image (sinon `onerror` la retire, comme en prod) */
  await pg.route(/\/storage\/v1\/object\/sign\//, r => r.request().method() === 'GET' ? r.fulfill({ status:200, contentType:'image/png', body:PNG }) : r.fallback());
  await pg.goto(origin + '/totehm'); await pg.waitForSelector('body.member'); await pg.waitForTimeout(700);
  await pg.click('#lv-tap-open'); await pg.waitForFunction(() => !document.body.classList.contains('gate'), null, { timeout:6000 }).catch(() => {}); await pg.waitForTimeout(1200);
  await pg.keyboard.press('ArrowRight'); await pg.waitForFunction(() => window.__totehm_zone?.vue === 'visions', null, { timeout:6000 });
  await pg.waitForFunction(() => window.__totehm_zone?.images === 1 && document.querySelector('#habits .v-img[src]'), null, { timeout:6000 });
  const ferme = await pg.evaluate(() => ({ img:document.querySelector('#habits .v-img')?.dataset.photo, src:!!document.querySelector('#habits .v-img')?.getAttribute('src'),
    titres:[...document.querySelectorAll('#habits .mg-l')].filter(l => getComputedStyle(l).display !== 'none').length }));
  ok(ferme.img === 'u/vision-old.jpg' && ferme.src, 'fermée, la vision montre son image, signée : ' + JSON.stringify(ferme));
  ok(ferme.titres === 0, 'aucun titre de groupe visible (Totehm minimal)');
  await pg.locator('#habits [data-open="v:v1"]').evaluate(e => e.click()); await pg.waitForTimeout(400);
  /* 20/10 — UN SEUL GESTE POUR ILLUSTRER UNE VISION (Wah : « garde seulement Add a media ») : le bouton
     « image » (l'image libre, une pièce jointe de plus) est parti ; l'image déjà posée reste affichée. */
  const ouv = await pg.evaluate(() => ({ vimg:document.querySelectorAll('#habits [data-vimg],#habits [data-vimg-x]').length,
    media:[...document.querySelectorAll('#habits .habit.open [data-cap]')].map(e => e.textContent.trim()),
    img:!!document.querySelector('#habits .v-img') }));
  ok(ouv.vimg === 0 && ouv.media.length === 1 && ouv.media[0] === 'Add a media' && ouv.img,
     'ouverte : UN seul geste, [Add a media] ; plus de bouton « image » ; l\'image posée reste : ' + JSON.stringify(ouv));
  await pg.screenshot({ path:OUT + '/com_vision_image.png' });
  ok(!erreurs(log).length, 'aucune erreur ' + erreurs(log).join(' | '));
}finally{ await browser.close(); }
