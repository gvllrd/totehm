// 12/11 — LES INTITULÉS DE LA STONER METHOD (Wah). Une box n'est pas une liste, c'est une PHRASE :
//   HABIT      why (ses objectifs datés ET ses visions) · trigger · instead of (ses répulsions) · I was there to practice it
//   OBJECTIVE  how (ses habits) — plus de « vision · the big why » : objectif et vision sont la MÊME box (19/11)
//   REPULSION  instead (ses habits) · why (ses leçons)
//   VISION     how (SES habits, 19/11) · learn from (les répulsions DÉDUITES de ses habits)
// 19/11 — LA DATE DÉCIDE DE LA VUE : un objectif sans deadline part dans Vision quand on le referme, une
// vision à qui l'on donne une date part dans Objectifs ; une ligne le dit.
// Plus : « + totehmize » dans les cinq vues, [Add a media to visualize it], et la visibilité qui dit sa PORTÉE.
// LANCER : node com_intitules.mjs /tmp
import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '/tmp'; const browser = await launch(); const origin = 'https://www.totehm.com';
const UID = '11111111-1111-4111-8111-111111111111';
const STEPS = [{ t:'Run the hill', t0:'Run the hill', is:['flow'], f:'daily', o:'o1' }];
const trips = { signed_in:true,
  trips:[{ id:'o1', text:'Marathon in May', target_at:'2027-05-01T00:00:00Z', days_left:163, habits:['Run the hill'] }],
  objs:{ 'Run the hill':['o1','v1'] },
  reps:[{ id:'r1', text:'Scrolling at night', hs:['Run the hill'], habits:['Run the hill'] }],
  wisdom:[{ id:'w1', text:'Slow is smooth' }],
  visions:[{ id:'v1', text:'A studio by the sea', os:[] }] };
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
 const hw = h.minis.find(g => g[0] === 'why');
 ok(hw && hw[1].join(',') === 'Marathon in May,A studio by the sea',
    'HABIT : son why montre l\'objectif daté PUIS la vision qu\'elle sert directement → ' + JSON.stringify(hw && hw[1]));
 ok(h.media.some(t => t === 'Add a media to visualize it'), 'HABIT : [Add a media to visualize it] → ' + h.media.join(' | '));
 ok(h.wear === 'habit:Run the hill', 'HABIT : « + totehmize » porte son TEXTE serveur → ' + h.wear);
 ok(h.baud.join(' · ') === 'private · subscribers' && h.portee === '' && !h.mots.includes('who sees this box'),
    '16/11 · la confidentialité est MINIMALE dans la box : deux mots, ni intitulé ni note au repos (la portée se dit à la confirmation) « ' + h.portee + ' »');
 await pg.screenshot({ path:OUT + '/com_box_habit.png' });

 /* ── L'OBJECTIF ── */
 await vers(pg, 'ArrowUp', 'objectives');
 await pg.locator('#habits [data-open="t:o1"]').evaluate(e => e.click()); await pg.waitForTimeout(500);
 const o = await lire(pg, '#habits .habit.open');
 ok(o.mots[0] === 'how' && !o.mots.includes('vision · the big why'),
    'OBJECTIVE : « how » au-dessus des habits, plus de « vision · the big why » → ' + o.mots.join(' | '));
 ok(await pg.evaluate(() => !document.querySelector('#habits .habit.open .pk-say')?.textContent.includes('No deadline')),
    'OBJECTIVE daté : aucune ligne « No deadline »');
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
    'VISION : « how » au-dessus des habits, « learn from » au-dessus des répulsions → ' + v.mots.join(' | '));
 const vh = v.minis.find(g => g[0] === 'how');
 ok(vh && vh[1].join(',') === 'Run the hill', 'VISION : son « how », ce sont SES habits (19/11) → ' + JSON.stringify(vh && vh[1]));
 const lf = v.minis.find(g => g[0] === 'learn from');
 ok(lf && lf[1].join(',') === 'Scrolling at night',
    'VISION : « learn from » est DÉDUIT de la chaîne vision → habit → répulsion → ' + JSON.stringify(lf && lf[1]));
 ok(v.wear === 'vision:v1', 'VISION : « + totehmize » → ' + v.wear);
 await pg.screenshot({ path:OUT + '/com_box_vision.png' });

 /* ── MY STORY ── */
 await vers(pg, 'ArrowLeft', 'habits'); await vers(pg, 'ArrowLeft', 'wisdom');
 await pg.locator('#habits [data-open="w:w1"]').evaluate(e => e.click()); await pg.waitForTimeout(500);
 const w = await lire(pg, '#habits .habit.open');
 ok(w.mots[0] === 'learned from' && w.wear === 'wisdom:w1',
    'MY STORY : « learned from » gardé, « + totehmize » → ' + w.wear);

 /* ── 19/11 · LA DATE DÉCIDE DE LA VUE ── */
 const dit = () => pg.evaluate(() => document.getElementById('dit')?.textContent || '');
 const why = () => pg.evaluate(() => window.__totehm_why ? window.__totehm_why() : null);
 await vers(pg, 'ArrowRight', 'habits'); await vers(pg, 'ArrowRight', 'visions');
 await pg.locator('#habits [data-open="v:v1"]').evaluate(e => e.click()); await pg.waitForTimeout(400);
 await pg.locator('#habits .habit.open input[data-date="v1"]').fill('2027-06-01'); await pg.waitForTimeout(300);
 ok(await pg.evaluate(() => !!document.querySelector('#habits .habit.open[data-id="v1"], #habits .habit.open')),
    'VISION datée : la box reste ouverte sous le doigt (elle change de vue à la fermeture)');
 await pg.evaluate(() => document.activeElement && document.activeElement.blur());
 await vers(pg, 'ArrowLeft', 'habits');
 let w1 = await why();
 ok(w1 && w1.objectifs === 2 && w1.visions === 0, 'VISION + date → rejoint les objectifs quand on la referme → ' + JSON.stringify(w1));
 ok((await dit()) === 'Deadline set · moved to Objectives', 'une ligne le dit : « ' + (await dit()) + ' »');
 ok(log.rpc.some(c => c.name === 'objective_set_target' && c.body.p_obj === 'v1' && String(c.body.p_target).startsWith('2027-06-01')),
    'la date part au serveur sur la MÊME box (objective_set_target)');
 await vers(pg, 'ArrowUp', 'objectives');
 await pg.locator('#habits [data-open="t:v1"]').evaluate(e => e.click()); await pg.waitForTimeout(400);
 await pg.locator('#habits [data-nodate="v1"]').evaluate(e => e.click()); await pg.waitForTimeout(300);
 ok(await pg.evaluate(() => (document.querySelector('#habits .habit.open .pk-say')?.textContent || '').startsWith('No deadline')),
    'OBJECTIVE sans date : la ligne prévient AVANT de refermer');
 await vers(pg, 'ArrowDown', 'habits');
 w1 = await why();
 ok(w1 && w1.objectifs === 1 && w1.visions === 1 && w1.deplaces === 2, 'OBJECTIVE sans deadline → part dans Vision → ' + JSON.stringify(w1));
 ok((await dit()) === 'No deadline · moved to Vision', 'une ligne le dit : « ' + (await dit()) + ' »');
 ok(!log.rpc.some(c => c.name === 'objective_vision_link' || c.name === 'objective_vision_unlink'), 'plus aucun lien objectif → vision n\'est écrit');

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
