// 13/10/2026 — LOT B : une VISION porte une image libre (générée ailleurs ; « Generate » = lot C). Ouverte, la vision
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
  ok(await pg.locator('#habits [data-vimg="v1"]').count() === 1 && await pg.locator('#habits [data-vimg-x="v1"]').count() === 1, 'ouverte : « + image » et « × »');
  const fc = pg.waitForEvent('filechooser', { timeout:4000 });
  await pg.click('#habits [data-vimg="v1"]');
  await (await fc).setFiles({ name:'house.png', mimeType:'image/png', buffer:PNG });
  await pg.waitForFunction(() => /vision-[0-9a-f-]{36}\.jpg$/.test(document.querySelector('#habits .v-img')?.dataset.photo || ''), null, { timeout:6000 });
  const up = log.upload.find(u => u.method === 'POST'), set = log.rpc.find(r => r.name === 'vision_image_set');
  ok(up && /^moments\/[^/]+\/vision-[0-9a-f-]{36}\.jpg$/.test(up.path), 'le JPEG part dans MON dossier : ' + (up && up.path));
  ok(set && set.body.p_id === 'v1' && up && up.path === 'moments/' + set.body.p_path, 'vision_image_set(v1, ce chemin)');
  ok(log.upload.some(u => u.method === 'DELETE'), 'l\'ancien fichier s\'efface');
  await pg.click('#habits [data-vimg-x="v1"]');
  await pg.waitForFunction(() => !document.querySelector('#habits .v-img') && window.__totehm_zone?.images === 0, null, { timeout:6000 });
  const off = log.rpc.filter(r => r.name === 'vision_image_set').pop();
  ok(off.body.p_path === null && log.upload.filter(u => u.method === 'DELETE').length === 2, '« × » : vision_image_set(v1, null), le fichier s\'efface');
  await pg.screenshot({ path:OUT + '/com_vision_image.png' });
  ok(!erreurs(log).length, 'aucune erreur ' + erreurs(log).join(' | '));
}finally{ await browser.close(); }
