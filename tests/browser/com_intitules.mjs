// 12/11 — LES INTITULÉS DE LA STONER METHOD (Wah). Une box n'est pas une liste, c'est une PHRASE :
//   HABIT      why (ses objectifs) · trigger · instead of (ses répulsions) · I was there to practice it (ses spots)
//   OBJECTIVE  how (ses habits) · vision · the big why (ses visions)
//   REPULSION  instead (ses habits) · why (ses leçons)
//   VISION     how (ses objectifs) · learn from (les répulsions DÉDUITES de la chaîne)
// Plus : « + totehmize » dans les cinq vues, [Add a media to visualize it], et la visibilité qui dit sa PORTÉE.
// LANCER : node com_intitules.mjs /tmp
import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '/tmp'; const browser = await launch(); const origin = 'https://www.totehm.com';
const UID = '11111111-1111-4111-8111-111111111111';
const STEPS = [{ t:'Run the hill', t0:'Run the hill', is:['flow'], f:'daily', o:'o1' }];
const trips = { signed_in:true,
  trips:[{ id:'o1', text:'Marathon in May', habits:['Run the hill'] }],
  reps:[{ id:'r1', text:'Scrolling at night', hs:['Run the hill'], habits:['Run the hill'] }],
  wisdom:[{ id:'w1', text:'Slow is smooth' }],
  visions:[{ id:'v1', text:'A studio by the sea', os:['o1'] }] };
const land = { signed_in:true, pseudo:'wah', visibility:'private', offer:{ enabled:false },
  higher:{ active:false, price_cents:700, currency:'eur' }, thp:false, subscriptions:0, subscribers:0 };

async function ouvrir(pg){
  await pg.goto(origin + '/totehm'); await pg.waitForSelector('body.member'); await pg.waitForTimeout(700);
  await pg.click('#lv-tap-open'); await pg.waitForFunction(() => !document.body.classList.contains('gate'), null, { timeout:6000 }).catch(() => {});
  await pg.waitForTimeout(1200);
}
async function vers(pg, touche, vue){
  await pg.keyboard.press(touche); await pg.waitForFunction(v => window.__totehm_zone?.vue === v, vue, { timeout:6000 }); await pg.waitForTimeout(500);
}
const lire = (pg, sel) => pg.evaluate(s => {
  const b = document.querySelector(s); if(!b) return null;
  return { mots:[...b.querySelectorAll('.mg-l')].map(l => l.textContent),
    vu:[...b.querySelectorAll('.mg-l')].map(l => getComputedStyle(l).display),
    minis:[...b.querySelectorAll('.mg')].map(g => [g.querySelector('.mg-l')?.textContent,
      [...g.querySelectorAll('.mini,.mini-w,.mini-t')].filter(x => x.classList.contains('mini-t') || !x.querySelector('.mini-t')).map(x => x.textContent.replace('×', '').trim())]),
    wear:b.querySelector('[data-totehmize]')?.dataset.totehmize || '',
    media:[...b.querySelectorAll('.dash')].map(d => d.textContent),
    baud:[...b.querySelectorAll('.baud-o')].map(x => x.textContent),
    portee:b.querySelector('.baud-n')?.textContent || '' };
}, sel);
try{
 const { pg, log } = await page(browser, { dir:'com', origin,
   tables:{ profiles:[{ pseudo:'wah' }], totehms:[{ user_id:UID, steps:STEPS, vis:'private' }] },
   rpc:{ my_landing:land, my_trips:trips, habit_spaces:{ ok:true, mine:true, habits:[] },
         my_box_audiences:{ ok:true, h:{}, t:{}, r:{}, w:{}, v:{} } } });
 await ouvrir(pg);

 /* ── LA HABIT ── */
 await pg.locator('#habits [data-open^="h:"]').first().evaluate(e => e.click()); await pg.waitForTimeout(500);
 const h = await lire(pg, '#habits .habit.open');
 ok(h && h.vu.every(d => d !== 'none'), 'les intitulés SE VOIENT (ils étaient masqués depuis le 13/10) : ' + (h ? h.vu.join(',') : '—'));
 ok(h.mots.slice(0, 2).join(' | ') === 'why | trigger · instead of',
    'HABIT : « why » au-dessus des objectifs, « trigger · instead of » au-dessus des répulsions → ' + h.mots.join(' | '));
 ok(h.media.some(t => t === 'Add a media to visualize it'), 'HABIT : [Add a media to visualize it] → ' + h.media.join(' | '));
 ok(h.wear === 'habit:Run the hill', 'HABIT : « + totehmize » porte son TEXTE serveur → ' + h.wear);
 ok(h.baud.join(' · ') === 'private · visible to my subscribers' && /this box only/.test(h.portee),
    'la visibilité dit sa PORTÉE : « ' + h.portee + ' »');
 await pg.screenshot({ path:OUT + '/com_box_habit.png' });

 /* ── L'OBJECTIF ── */
 await vers(pg, 'ArrowUp', 'objectives');
 await pg.locator('#habits [data-open="t:o1"]').evaluate(e => e.click()); await pg.waitForTimeout(500);
 const o = await lire(pg, '#habits .habit.open');
 ok(o.mots.slice(0, 2).join(' | ') === 'how | vision · the big why',
    'OBJECTIVE : « how » au-dessus des habits, « vision · the big why » au-dessus des visions → ' + o.mots.join(' | '));
 ok(o.wear === 'objective:o1', 'OBJECTIVE : « + totehmize » → ' + o.wear);
 await pg.screenshot({ path:OUT + '/com_box_objective.png' });

 /* ── LA RÉPULSION ── */
 await vers(pg, 'ArrowDown', 'habits'); await vers(pg, 'ArrowDown', 'repulsions');
 await pg.locator('#habits [data-open="r:r1"]').evaluate(e => e.click()); await pg.waitForTimeout(500);
 const r = await lire(pg, '#habits .habit.open');
 ok(r.mots.slice(0, 2).join(' | ') === 'instead | why',
    'REPULSION : « instead » au-dessus des habits, « why » au-dessus des leçons → ' + r.mots.join(' | '));
 ok(r.wear === 'repulsion:r1', 'REPULSION : « + totehmize » → ' + r.wear);
 await pg.screenshot({ path:OUT + '/com_box_repulsion.png' });

 /* ── LA VISION ── */
 await vers(pg, 'ArrowUp', 'habits'); await vers(pg, 'ArrowRight', 'visions');
 await pg.locator('#habits [data-open="v:v1"]').evaluate(e => e.click()); await pg.waitForTimeout(500);
 const v = await lire(pg, '#habits .habit.open');
 ok(v.mots.slice(0, 2).join(' | ') === 'how | learn from',
    'VISION : « how » au-dessus des objectifs, « learn from » au-dessus des répulsions → ' + v.mots.join(' | '));
 const lf = v.minis.find(g => g[0] === 'learn from');
 ok(lf && lf[1].join(',') === 'Scrolling at night',
    'VISION : « learn from » est DÉDUIT de la chaîne vision → objectif → habit → répulsion → ' + JSON.stringify(lf && lf[1]));
 ok(v.wear === 'vision:v1', 'VISION : « + totehmize » → ' + v.wear);
 await pg.screenshot({ path:OUT + '/com_box_vision.png' });

 /* ── MY STORY ── */
 await vers(pg, 'ArrowLeft', 'habits'); await vers(pg, 'ArrowLeft', 'wisdom');
 await pg.locator('#habits [data-open="w:w1"]').evaluate(e => e.click()); await pg.waitForTimeout(500);
 const w = await lire(pg, '#habits .habit.open');
 ok(w.mots[0] === 'learned from' && w.wear === 'wisdom:w1',
    'MY STORY : « learned from » gardé, « + totehmize » → ' + w.wear);

 /* ── le mot TOTEHM est la pièce, DANS l'app ── */
 const mot = await pg.evaluate(() => window.__totehm_mot ? window.__totehm_mot() : null);
 ok(mot && mot.pieces > 0 && mot.nom === 'wah',
    'le mot TOTEHM est la pièce, jusque dans l\'app : ' + JSON.stringify(mot));
 ok(await pg.evaluate(() => [...document.querySelectorAll('.v-name,[contenteditable],[data-edit]')].every(e => !e.querySelector('.tw'))),
    'aucune pièce dans ce que le membre a écrit');

 const errs = log.errors.filter(e => e.startsWith('pageerror'));
 ok(!errs.length, 'aucune erreur de page' + (errs.length ? ' → ' + errs.join(' | ') : ''));
 await pg.context().close();
}finally{ await browser.close(); }
