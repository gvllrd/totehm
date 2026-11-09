// higher.boutique/streetwear — la totehmisation (08/10/2026 bis). Zéro réseau.
// Téléphone : une scène plein écran à la fois. Ordinateur : le vêtement reste et se décale, les fenêtres glissent.
// CLOTH (← → modèles, ↑ ↓ vues) → ELEMENT (WISDOM ← → VISION, manette) → NAME → STYLE → ORDER.
// 08/10 (ter) : arriver de COM (« + totehmize » d'une leçon) = l'élément déjà choisi.
// 23/10 : N'IMPORTE QUELLE box se porte. Le TOTEHM se décompose en trois papiers (MY STORY · GRIND · VISION),
// le GRIND s'ouvre en objective · habit · repulsion, et une box tapée devient le vêtement.
// LANCER : node streetwear.mjs /tmp
import { launch, page, ok, USER } from './harness.mjs';
const OUT = process.argv[2] || '.';
const SB = 'https://abujjbkbbiumxrokozph.supabase.co';
const supports = [
  { id:'s1', title:'Higher Champion Sweatshirt', max_pieces:177, claimed:0, price:170, active:true, position:1, storage_folder:'champ', details:'Heavy cotton.',
    image_url:'https://files.cdn.printful.test/champ.png', print_area:{ placement:'back', width_in:12, height_in:16 },
    printful_variant_map:{ L:{ sync_variant_id:3 }, S:{ sync_variant_id:1 }, '2XL':{ sync_variant_id:5 }, M:{ sync_variant_id:2 }, XL:{ sync_variant_id:4, availability:'discontinued' } } },
  { id:'s2', title:'Tee white', max_pieces:5, claimed:5, price:44, active:true, position:2, image_url:'https://files.cdn.printful.test/tee.png' } ];
const NAMES = [];
const rpc = {
  name_available: b => { NAMES.push(b.candidate); return !/taken/i.test(b.candidate); },
  totehm_complete: { complete:true, any:true, remplies:5, habits:true, objectives:true, repulsions:true, wisdom:true, visions:true },
  my_trips: { trips:[{ id:'o1', text:'Marathon in May', is:['flow'], days_left:200, habits:[{ t:'Run the hill', f:'every_morning', i:'fight' }] }],
              reps:[{ id:7, text:'Scrolling at night', is:['focus'] }], loose:[{ t:'Cold shower', f:'every_morning', i:'fight' }],
              wisdom:[{ id:'w1', text:'Slow is smooth', is:['focus'] }], visions:[{ id:'v1', text:'A studio by the sea', is:['express'] }] },
  my_box_matter: b => ({
    vision:   { text:'A studio by the sea', view:'visions',    palette:['#1D9E75'], matter:{ objectives:[{ text:'Save 10k' }] }, extra:{} },
    habit:    { text:b.p_ref,               view:'habits',     palette:['#E24B4A'], matter:{ objectives:[{ text:'Marathon in May' }] }, extra:{ freq:'every_morning' } },
    objective:{ text:'Marathon in May',     view:'objectives', palette:['#e48b31'], matter:{ habits:[{ text:'Run the hill' }] }, extra:{} },
    repulsion:{ text:'Scrolling at night',  view:'repulsions', palette:['#378ADD'], matter:{ habits:[{ text:'Cold shower' }] }, extra:{} },
  })[b.p_kind] || { text:'Slow is smooth', view:'wisdom', palette:['#378ADD'], matter:{ objectives:[{ text:'Marathon in May' }], habits:[{ text:'Run the hill' }] }, extra:{ freq:'every_morning' } },
  /* 26/10 — les photos du monde de la box : un media (perforé) et un spot. */
  my_box_shots: () => ([
    { kind:'media', id:'em1', bucket:'element-media', path:'u/m-1.jpg', txt:'hill.jpg', at:'2026-10-20' },
    { kind:'spot',  id:'sp1', bucket:'moments',       path:'u/s-1.jpg', txt:'the hill', at:'2026-10-24' } ]),
  my_streetwear_test_mode: true,
};
const styles = [{ id:'st1', name:'Ink Realism', active:true, status:'active', position:1, remaining_capacity:7, total_capacity:7, image_url:'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22/%3E' },
                { id:'st2', name:'Neon Glitch', active:true, status:'active', position:2, remaining_capacity:0, total_capacity:7 }];
const tables = { totehm_cloth_support: supports, profiles: [{ pseudo:'Vallerand' }], artistic_styles: styles, totehm_clothes: [{ name:'0.hill', status:'paid', paid_at:'2026-10-08' }] };
// Le dossier du support : trois vues (le seau est public ; la liste passe par l'API Storage).
const network = (url, req) => {
  if(url.origin === SB && url.pathname === '/storage/v1/object/list/totehm-cloth-support'){
    const prefix = JSON.parse(req.postData() || '{}').prefix;
    const files = prefix === 'champ' ? [{ name:'1-front.png' }, { name:'2-back.png' }, { name:'3-side.png' }, { name:'print' }, { name:'.keep' }]
                : prefix === 'champ/print' ? [{ name:'1-back-zone.png' }] : [];
    return { status:200, contentType:'application/json', body: JSON.stringify(files) };
  }
  if(/printful\.test|storage\/v1\/object\/public/.test(url.href)) return { status:200, contentType:'image/svg+xml', body:'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#1a1a1e"/><path d="M250 180 L400 140 L550 180 L640 300 L580 330 L560 290 L560 680 L240 680 L240 290 L220 330 L160 300 Z" fill="#d9d9d9"/></svg>' };
  return null;
};
/* 26/10 (Wah) : plus de [next] — on DESCEND. Le banc fait le même geste que le
   doigt : il amène l'étape sous les yeux et attend qu'elle devienne la courante. */
/* 02/11 (Wah) : « full screen par full screen, pas d'entre-deux ». Le banc fait
   donc le VRAI geste — la molette sur le rouleau — et une étape à la fois. Si
   l'étape déborde, on la lit d'abord jusqu'au bout, comme le doigt. */
const ORDRE = ['cloth', 'style', 'element', 'name', 'order'];
const descendre = async (pg, s) => {
  await pg.waitForSelector('.stage[data-s="' + s + '"].is-open', { timeout:5000 });
  /* Au bord gauche, bas : jamais sur `#viewer`, qui garde son propre geste. */
  await pg.mouse.move(20, 760);
  for(let i = 0; i < 10; i++){
    const now = await pg.evaluate(() => window.__totehm_cloth().stage);
    if(now === s) return;
    const d = ORDRE.indexOf(s) > ORDRE.indexOf(now) ? 1 : -1;
    await pg.evaluate(k => { const el = document.querySelector('.stage[data-s="' + window.__totehm_cloth().stage + '"]');
      if(el) el.scrollTop = k > 0 ? el.scrollHeight : 0; }, d);
    await pg.waitForTimeout(40);
    await pg.mouse.wheel(0, d * 300);
    await pg.waitForFunction(x => window.__totehm_cloth().stage !== x, now, { timeout:2000 }).catch(() => {});
  }
  await pg.waitForFunction(x => window.__totehm_cloth().stage === x, s, { timeout:3000 });
};
const monter = descendre;
const browser = await launch();
const { pg, ctx, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, network });
let body = null;
await ctx.route(SB + '/functions/v1/create-checkout', r => { body = JSON.parse(r.request().postData()); r.fulfill({ status:200, contentType:'application/json', body:'{"url":"https://checkout.stripe.test/c","name":"0.hill"}' }); });
await ctx.route('https://checkout.stripe.test/**', r => r.fulfill({ status:200, contentType:'text/html', body:'ok' }));
const D = () => pg.evaluate(() => window.__totehm_cloth());
await pg.goto('https://www.higher.boutique/streetwear');
await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().angles === 3);
await pg.waitForTimeout(80);

// ── 1 · CLOTH (téléphone)
let d = await D();
ok(d.build === '2026-11-09-card-pieces' && d.stage === 'cloth' && !d.papers && !d.desktop, 'phone: CLOTH first, the TOTEHM still folded');
const rest = await pg.evaluate(() => { const b = document.querySelector('#cl-facts .left b'), s = getComputedStyle(b);
  const g = document.querySelector('#cl-facts .bar i'), bar = document.querySelector('#cl-facts .bar');
  return { n: b.textContent.trim(), px: Math.round(parseFloat(s.fontSize)), col: s.color, fam: s.fontFamily,
           txt: document.querySelector('#cl-facts').textContent,
           jauge: g ? Math.round(g.getBoundingClientRect().width / bar.getBoundingClientRect().width * 100) : -1 }; });
ok(/Higher Champion Sweatshirt/.test(await pg.textContent('#cl-title')) && rest.n === '177' && /\/ 177/.test(rest.txt) && /pieces left/.test(rest.txt),
  'the title and what is left');
ok(rest.px >= 13 && /Quantico/.test(rest.fam) && rest.col === 'rgb(255, 255, 255)' && rest.jauge === 100,
  'what is left: white Quantico and a one-pixel gauge, never Coral (that is a TOTEHM name) ' + JSON.stringify(rest.jauge));
ok(!/€/.test(await pg.textContent('#cl-facts')) && !(await pg.$('#cl-hint')) && !(await pg.$('#concept-btn')) && !(await pg.$('#conn-bar')) && !(await pg.$('#back')),
  'no price, no hint, no « how it works », no member corner, no Back');
// 02/11 (Wah) : « le choix de la taille, mets-la directement avec le choix du
// modèle de vêtement » — et la première section ne montre PLUS la box héritée.
const tailles = await pg.evaluate(() => ({
  n: document.querySelectorAll('#cl-sizes .sz').length,
  l: [...document.querySelectorAll('#cl-sizes .sz')].map(b => b.dataset.s).join(','),
  off: [...document.querySelectorAll('#cl-sizes .sz[disabled]')].map(b => b.dataset.s).join(','),
  chip: !!document.querySelector('#cl-wear'), ailleurs: !!document.querySelector('#od-sizes') }));
ok(tailles.n === 5 && tailles.l === 'S,M,L,XL,2XL' && tailles.off === 'XL' && !tailles.chip && !tailles.ailleurs,
  '02/11 · la taille se choisit AVEC le vêtement (et nulle part ailleurs) ; plus de box héritée ici ' + JSON.stringify(tailles));
await pg.click('#cl-sizes .sz[data-s="M"]');
await pg.waitForFunction(() => window.__totehm_cloth().size);
const lay = await pg.evaluate(() => { const v = document.querySelector('#viewer').getBoundingClientRect(), b = document.querySelector('#cl-go').getBoundingClientRect();
  return { centre: Math.abs((v.left + v.right) / 2 - innerWidth / 2), ctr: Math.abs((b.left + b.right) / 2 - innerWidth / 2), scroll: document.documentElement.scrollWidth - innerWidth, over: Math.round(b.bottom - innerHeight) }; });
ok(lay.centre < 2 && lay.ctr < 2 && lay.scroll <= 0 && lay.over <= 0, 'the cloth and its button are centered, on one screen (' + lay.centre.toFixed(1) + ' px, ctr ' + lay.ctr.toFixed(1) + ', button ' + lay.over + ' px from the bottom, scroll ' + lay.scroll + ')');
ok((await pg.$$eval('#a-dots i', l => l.length)) === 3 && (await pg.$$eval('#m-dots i', l => l.length)) === 2, 'dots: 3 views (vertical), 2 cloths (horizontal)');
await pg.screenshot({ path: OUT + '/sw_cloth.png' });
const vb = await pg.locator('#viewer').boundingBox();
const cx = vb.x + vb.width / 2, cy = vb.y + vb.height / 2;
await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.mouse.move(cx, cy - 140, { steps:8 }); await pg.mouse.up();
await pg.waitForFunction(() => window.__totehm_cloth().angle === 1);
ok(true, 'a vertical swipe turns the cloth: view 2');
await pg.mouse.move(cx, cy); await pg.mouse.wheel(0, 160);
await pg.waitForFunction(() => window.__totehm_cloth().angle === 2);
ok(true, 'the trackpad (vertical) turns it again: view 3');
await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.mouse.move(cx - 160, cy, { steps:8 }); await pg.mouse.up();
await pg.waitForFunction(() => window.__totehm_cloth().model === 1);
ok(/sold out/i.test(await pg.textContent('#cl-facts')) && await pg.isDisabled('#cl-go'), 'a horizontal swipe: the next cloth (sold out: the TOTEHM is closed)');
await pg.keyboard.press('ArrowLeft');
await pg.waitForFunction(() => window.__totehm_cloth().model === 0 && window.__totehm_cloth().angle === 2);
ok(true, 'back to the first cloth with the keyboard, its view is remembered');
const src = await pg.evaluate(() => [...document.querySelectorAll('.model[data-i="0"] img')].map(i => i.getAttribute('src') || '').join('|'));
ok(/champ\/1-front\.png/.test(src) && /champ\/3-side\.png/.test(src) && !/\.keep/.test(src), 'views = the photos of its Storage folder, in name order');

// ── 2 · STYLE — 02/11 (Wah) : « le style artistique en section deux, et
// ensuite la sélection de la box ».
await pg.click('#cl-go');
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'style');
await pg.waitForFunction(() => document.querySelectorAll('.st-card').length === 2);
const ordre2 = await pg.evaluate(() => [...document.querySelectorAll('.stage.is-open')].map(e => e.dataset.s).join(','));
ok(ordre2 === 'cloth,style' && !(await pg.evaluate(() => document.querySelector('#s-element').classList.contains('is-open'))),
  '02/11 · le STYLE vient juste après le vêtement, et la box n\'existe pas encore (' + ordre2 + ')');
ok((await pg.evaluate(() => { const l = [...document.querySelectorAll('#stages-roll .stage')].map(e => e.dataset.s); return l.join(','); }))
   === 'cloth,style,element,name,order,done', 'le rouleau est dans l\'ordre : vêtement · style · box · nom · commande');
await pg.click('.st-card[data-id="st1"]');
await pg.waitForFunction(() => window.__totehm_cloth().style);
await pg.screenshot({ path: OUT + '/sw_style.png' });
// 02/11 — CE QUI A DÉJÀ SON GESTE LE GARDE : sur le vêtement, un geste vertical
// change la VUE de l'image ; maintenant qu'une étape existe en dessous, il ne
// doit SURTOUT pas tourner la page du même doigt.
await monter(pg, 'cloth');
{
  await pg.waitForTimeout(560);        // le rouleau finit de glisser : l'image est à sa place
  const vb = await pg.locator('#viewer').boundingBox();
  await pg.keyboard.press('ArrowUp'); await pg.keyboard.press('ArrowUp');   // revenir à la 1re vue
  await pg.waitForFunction(() => window.__totehm_cloth().angle === 0);
  const a0 = await pg.evaluate(() => window.__totehm_cloth().angle);
  await pg.mouse.move(vb.x + vb.width / 2, vb.y + vb.height / 2);
  await pg.mouse.wheel(0, 200);
  await pg.waitForTimeout(420);
  const ap = await pg.evaluate(() => ({ angle: window.__totehm_cloth().angle, stage: window.__totehm_cloth().stage }));
  ok(ap.angle !== a0 && ap.stage === 'cloth',
    '02/11 · un geste sur l\'image tourne la VUE, pas la page ' + JSON.stringify({ a0, ...ap }));
}
await descendre(pg, 'style');

// ── 3 · ELEMENT : le TOTEHM se décompose en trois papiers (23/10)
await descendre(pg, 'element');
ok(!(await D()).melt && (await pg.$eval('#tz-logo', e => +getComputedStyle(e).opacity)) > 0.9, 'the TOTEHM arrives whole: background, rail, T and word');
await pg.waitForFunction(() => window.__totehm_cloth().papers);
await pg.waitForTimeout(650);
d = await D();
ok(d.papers && d.melt && !d.grind && d.view === null && d.views === 5, 'the TOTEHM has melted into three papers, no view chosen yet, the five views are there');
ok((await pg.$$eval('#tz-papers .pap-lab', l => l.map(b => b.textContent.trim()))).join(',') === 'my wisdom story,my grind,my vision'
   && (await pg.$eval('#el-list', e => e.children.length)) === 0, 'MY WISDOM STORY · MY GRIND · MY VISION, and nothing listed before a tap');
ok((await pg.$eval('#tz-logo', e => +getComputedStyle(e).opacity)) < 0.05 && (await pg.$$eval('#tz-logo .gl', l => l.length)) === 3,
  'the logo (rail · T · word — the three SVGs of totehm.com) has dissolved; only its background is left');
const g3 = await pg.$$eval('#tz-papers .g3 i', l => l.map(i => i.textContent.trim()).join(','));
ok(g3 === 'my objectives,my habits,my repulsions' && (await pg.$eval('#tz-papers .g3', e => +getComputedStyle(e).opacity)) < 0.05, 'the three buttons live inside the GRIND, hidden');
await pg.click('.pap-g');
await pg.waitForFunction(() => window.__totehm_cloth().grind);
await pg.waitForTimeout(400);
const gz = await pg.evaluate(() => { const g = document.querySelector('#tz-papers .g3').getBoundingClientRect(), p = document.querySelector('.pap-g').getBoundingClientRect();
  return { op:+getComputedStyle(document.querySelector('#tz-papers .g3')).opacity, lab:+getComputedStyle(document.querySelector('.pap-g .pap-lab')).opacity,
    dx:Math.abs((g.left+g.right)/2 - (p.left+p.right)/2), inside:g.top > p.top && g.bottom < p.bottom, gh:Math.round(g.height), ph:Math.round(p.height) };
});
ok(gz.op > 0.9 && gz.dx < 2 && gz.inside && gz.lab < 0.05, 'a tap on MY GRIND stacks its three buttons in the centre of its navy ' + JSON.stringify(gz));
const lab = await pg.evaluate(() => [...document.querySelectorAll('#tz-papers .pap')].map(p => {
  const l = p.querySelector('.pap-lab'), r = l.getBoundingClientRect(), b = p.getBoundingClientRect();
  return { t: l.textContent.trim(), deborde: Math.round(Math.max(0, b.left - r.left) + Math.max(0, r.right - b.right)) };
}));
ok(lab.every(l => l.deborde === 0), 'no title is clipped by its perforated paper ' + JSON.stringify(lab));
const sel = await pg.$$eval('#tz-papers .g3 i', l => l.map(i => ({ px: Math.round(parseFloat(getComputedStyle(i).fontSize)), cut: i.scrollWidth - i.clientWidth })));
ok(sel.every(s => s.px >= 10) && sel.every(s => s.cut <= 1),
  'the titles of the view selectors are read, whole, inside the navy ' + JSON.stringify(sel));
await pg.click('.g3 i[data-v="habits"]');
await pg.waitForFunction(() => window.__totehm_cloth().view === 'habits');
ok(/Run the hill/.test(await pg.textContent('#el-list')) && /Cold shower/.test(await pg.textContent('#el-list')) && /my habits/i.test(await pg.textContent('#el-sub')),
  'MY HABITS: the habits of the TOTEHM, the ones of an objective and the loose ones');
await pg.click('.pap-v');
await pg.waitForFunction(() => window.__totehm_cloth().view === 'visions');
ok(/A studio by the sea/.test(await pg.textContent('#el-list')), 'VISION is wearable too');
// 26/10 — REMONTER, c'est juste remonter : le TOTEHM reste ouvert plus bas, tel qu'on l'a laissé.
await monter(pg, 'cloth');
await pg.waitForTimeout(400);
const remonte = await pg.evaluate(() => { const r = document.getElementById('stages'), c = document.getElementById('s-cloth'), e = document.getElementById('s-element');
  return { haut: Math.abs(r.scrollTop - c.offsetTop) < 3, dessous: e.offsetTop > c.offsetTop && e.classList.contains('is-open'),
    hint: +getComputedStyle(c.querySelector('.sc-hint')).opacity, vue: window.__totehm_cloth().view }; });
ok(remonte.haut && remonte.dessous && remonte.hint > 0 && remonte.vue === 'visions',
  '26/10 · remonter au vêtement ne défait rien : le TOTEHM attend dessous, sur sa vue, et l\'invitation à descendre est là ' + JSON.stringify(remonte));
// 27/10 — LE ROULEAU EST UNE PAGE : descendre et remonter n'empile RIEN. Avant,
// chaque écran traversé poussait une entrée (4 → 11 mesurées) et le « back »,
// depuis le haut, REDESCENDAIT dans le flux.
const hist = await pg.evaluate(() => history.length);
await descendre(pg, 'element');
await monter(pg, 'cloth');
await descendre(pg, 'element');
await monter(pg, 'cloth');
ok((await pg.evaluate(() => history.length)) === hist && (await D()).stage === 'cloth',
  '27/10 · le rouleau ne touche pas à l\'historique : deux allers-retours, ' + hist + ' entrées avant comme après');
await pg.click('#cl-go');
await pg.waitForFunction(() => window.__totehm_cloth().papers);
await pg.click('.pap-s');
await pg.waitForFunction(() => window.__totehm_cloth().view === 'wisdom');
ok(/Slow is smooth/.test(await pg.textContent('#el-list')) && /my wisdom story/i.test(await pg.textContent('#el-sub')), 'MY WISDOM STORY · what I pass on');
ok((await D()).seam === 1, 'the seam lights the intention of what is on screen (focus)');
await pg.click('#el-list .bx');
// Le tap EST le choix (comme sur totehm.com) : la liste se réduit à elle, sa matière reste ouverte,
// on éteint ce qu'on veut, PUIS on passe à l'étape suivante.
await pg.waitForFunction(() => !!document.querySelector('#el-list .bx.is-on #matter .mi'));
const matter = await pg.textContent('#matter');
ok(/Marathon in May/.test(matter) && (await D()).open && !(await pg.$('#mt-go')) && !(await pg.$('#el-go'))
   && (await pg.$$eval('#el-list .bx', l => l.filter(b => b.offsetParent).length)) === 1
   && (await pg.$eval('#s-name', e => e.classList.contains('is-open')))
   && (await pg.$eval('#s-element', e => e.classList.contains('has-next'))),
  '26/10 · a tap chooses the element: the list folds onto it, its matter stays open, and the NAME waits below — no [Next]');
ok(!/palette|rhythm|every morning/i.test(matter + await pg.textContent('#el-list')) && !(await pg.$('#matter .pal')), 'no colour palette, no time frequency on screen');
// 26/10 — TOUT EST ÉTEINT AU DÉPART : sombre, sans trait. Un tap LIE à l'œuvre.
const avant = await pg.$eval('#matter .mi[data-k="objectives"]', e => ({ on: e.classList.contains('is-on'), press: e.getAttribute('aria-pressed'), f: getComputedStyle(e).filter, line: getComputedStyle(e).textDecorationLine }));
ok(!avant.on && avant.press === 'false' && /brightness\(0\.34\)/.test(avant.f) && !/line-through/.test(avant.line) && (await D()).linked === 0,
  '26/10 · par défaut une mini-box est ASSOMBRIE, sans trait, et hors de l\'œuvre ' + JSON.stringify(avant));
await pg.click('#matter .mi[data-k="objectives"]');
await pg.waitForFunction(() => window.__totehm_cloth().linked === 1);
await pg.waitForTimeout(260);           // la couleur revient par une transition
const sub = await pg.$eval('#matter .mi[data-k="objectives"]', e => ({ on: e.classList.contains('is-on'), press: e.getAttribute('aria-pressed'), f: getComputedStyle(e).filter, w: Math.round(e.getBoundingClientRect().width) }));
ok(sub.on && sub.press === 'true' && !/brightness\(0\.34\)/.test(sub.f) && sub.w < 160,
  'un tap LIE la mini-box à la totehmisation : elle reprend sa couleur ' + JSON.stringify(sub));
// 02/11 (Wah) : « quand je sélectionne une box et que je souhaite modifier mon
// choix, RIEN ne se passe quand j'appuie sur le système de commandes des 5 vues
// placé juste au-dessus. C'est frustrant… supprime l'étape "je dois d'abord
// cliquer sur la box". » UN SEUL TAP, donc : la vue tapée défait le choix et
// ouvre sa liste, avec ce qui était allumé remis à zéro.
await pg.click('.pap-v');
await pg.waitForFunction(() => window.__totehm_cloth().view === 'visions');
const unTap = await pg.evaluate(() => ({ vue: window.__totehm_cloth().view,
  choisi: !!window.__totehm_cloth().element, lie: window.__totehm_cloth().linked,
  photos: window.__totehm_cloth().shots, filtre: document.querySelector('#s-element').classList.contains('is-picked'),
  liste: document.querySelector('#el-list').textContent, grille: document.querySelector('#shots').children.length }));
ok(unTap.vue === 'visions' && !unTap.choisi && unTap.lie === 0 && unTap.photos === 0 && !unTap.filtre
   && /A studio by the sea/.test(unTap.liste) && unTap.grille === 0,
  '02/11 · UN SEUL TAP sur une vue défait le choix et ouvre sa liste — plus besoin de retaper la box ' + JSON.stringify(unTap));
// On revient sur MY WISDOM STORY et on refait le choix, pour la suite du parcours.
await pg.click('.pap-s');
await pg.waitForFunction(() => window.__totehm_cloth().view === 'wisdom');
await pg.click('#el-list .bx');
await pg.waitForFunction(() => !!window.__totehm_cloth().element);
await pg.waitForSelector('#matter .mi[data-k="objectives"]');
await pg.click('#matter .mi[data-k="objectives"]');
await pg.waitForFunction(() => window.__totehm_cloth().linked === 1);
// Les PHOTOS de la box : les medias (perforés) et les spots, éteints eux aussi.
await pg.waitForSelector('#shots .sh-t');
const ph = await pg.evaluate(() => { const l = [...document.querySelectorAll('#shots .sh-t')];
  const m = l[0], im = m.querySelector('img'), gEl = document.getElementById('shots'), g = getComputedStyle(gEl);
  const bx = document.querySelector('#el-list .bx');
  return { n: l.length, m: m.classList.contains('m'), s: l[1].classList.contains('s'), on: l.some(x => x.classList.contains('is-on')),
    perfo: /svg/.test(getComputedStyle(im).maskImage + getComputedStyle(im).webkitMaskImage), cols: g.gridTemplateColumns.split(' ').length,
    carre: Math.abs(m.getBoundingClientRect().width - m.getBoundingClientRect().height) < 2,
    f: getComputedStyle(m).filter, lieu: (l[1].querySelector('b') || {}).textContent || '',
    dehors: !bx.contains(gEl), dessous: gEl.getBoundingClientRect().top >= bx.getBoundingClientRect().bottom - 1,
    rond: getComputedStyle(l[1]).borderTopLeftRadius }; });
ok(ph.n === 2 && ph.m && ph.s && !ph.on && ph.perfo && ph.cols === 3 && ph.carre && /brightness\(0\.34\)/.test(ph.f)
   && ph.dehors && ph.dessous && ph.rond !== '0px' && !ph.lieu,
  '27/10 · les photos SORTENT de la box et se posent dessous : media perforé, spot aux coins arrondis, l\'image seule ' + JSON.stringify(ph));
await pg.click('#shots .sh-t[data-id="sp1"]');
await pg.waitForFunction(() => window.__totehm_cloth().shots === 1);
await pg.waitForTimeout(260);
const shOn = await pg.$eval('#shots .sh-t[data-id="sp1"]', e => getComputedStyle(e).filter + '|' + e.getAttribute('aria-pressed'));
ok(!/brightness\(0\.34\)/.test(shOn) && /\|true$/.test(shOn), 'un tap LIE la photo du spot à la totehmisation (' + shOn + ')');
await pg.screenshot({ path: OUT + '/sw_element.png' });

// ── 3 · NAME
await descendre(pg, 'name');
d = await D();
ok(d.stage === 'name' && d.element === 'wisdom' && d.print === 1, 'NAME: the element is kept (wisdom); the print-zone photo is loaded apart');
await monter(pg, 'element');
await pg.waitForTimeout(200);
ok((await pg.$eval('#el-list .bx', e => e.classList.contains('is-on'))) && (await pg.$eval('#s-name', e => e.classList.contains('is-open'))),
  'back on the TOTEHM: the chosen box is still lit and the NAME still waits below');
await pg.click('#el-list .bx');
await pg.waitForTimeout(150);
await pg.click('#el-list .bx');
await descendre(pg, 'name');
ok(!(await pg.$('#nm-el')) && /Slow is smooth/.test(await pg.textContent('#el-list')) && (await pg.$$eval('#el-list .bx', l => l.filter(b => b.offsetParent).length)) === 1,
  'the chosen element stays alone on screen — never written twice');
// 30/10 (Wah) : « EXACTEMENT le même format de la face verso du [Higher] ».
// Ce n'est plus une bordure imitée : c'est la pièce, son masque, ses 18 trous.
const nmf = await pg.evaluate(() => { const f = document.querySelector('#nm-field'), d = document.querySelector('#nm-dos');
  const m = [...document.querySelectorAll('mask')].filter(x => x.id === 'hmask');
  const r = d.getBoundingClientRect();
  return { prefix: document.querySelector('#nm-prefix').textContent,
    piece: d.getAttribute('viewBox') + ' ' + (d.querySelector('use') || {}).getAttribute?.('href'),
    masque: m.length === 1 && m[0].querySelectorAll('circle').length === 18,
    ref: (document.querySelector('symbol#higher-dos rect') || {}).getAttribute?.('mask'),
    bord: getComputedStyle(f).borderImageSource, ratio: +(r.width / r.height).toFixed(2),
    couvre: Math.abs(r.width - f.getBoundingClientRect().width) < 1 };
});
ok(nmf.prefix === '0.' && nmf.piece === '0 0 600 200 #higher-dos' && nmf.masque && nmf.ref === 'url(#hmask)'
   && nmf.bord === 'none' && nmf.ratio === 3 && nmf.couvre,
  '30/10 · le nom s\'écrit sur LE DOS DU HIGHER : la même pièce perforée, ses 18 trous, 600 × 200 ' + JSON.stringify(nmf));
await pg.fill('#nm-input', 'taken');
await pg.waitForFunction(() => /already taken/.test(document.querySelector('#nm-note').textContent));
ok(NAMES.includes('0.taken') && !(await pg.$eval('#s-order', e => e.classList.contains('is-open'))),
  'availability is checked by the SERVER; a taken name opens nothing below');
await pg.fill('#nm-input', '0.Hill Street');
await pg.waitForFunction(() => /available/.test(document.querySelector('#nm-note').textContent));
ok((await pg.inputValue('#nm-input')) === 'hillstreet' && NAMES.includes('0.hillstreet'),
  'the name is an IDENTIFIER: lower case, no space, and a typed "0." is not doubled');
const coral = await pg.evaluate(() => getComputedStyle(document.querySelector('#nm-input')).color + '|' + getComputedStyle(document.querySelector('#nm-input')).fontFamily);
ok(/251, 213, 202/.test(coral) && /Quantico/.test(coral), 'the name is Quantico Coral');
await pg.screenshot({ path: OUT + '/sw_name.png' });
await pg.press('#nm-input', 'Enter');

// ── LE STYLE a sa propre section (la 2) : ce qui reste s'y lit, pas au rappel.
await monter(pg, 'style');
const stl = await pg.evaluate(() => { const b = document.querySelector('.st-card[data-id="st1"] span b'); const s = getComputedStyle(b);
  return { n: b.textContent.trim(), px: Math.round(parseFloat(s.fontSize)), col: s.color, out: document.querySelector('.st-card[data-id="st2"] span.out').textContent }; });
ok(stl.n === '7' && stl.px >= 11 && stl.col === 'rgb(255, 255, 255)' && /sold out/i.test(stl.out) && await pg.isDisabled('.st-card[data-id="st2"]'),
  'a style says what is left in the same writing as the cloth; a sold-out style is closed ' + JSON.stringify(stl));

// ── 5 · ORDER — le RAPPEL
await descendre(pg, 'order');
ok(await pg.isVisible('#od-test') && /4242/.test(await pg.textContent('#od-test')), 'test mode said on the page');
const pv = await pg.evaluate(() => ({ src: (document.querySelector('#od-visual img.ph') || {}).src || '', extra: document.querySelectorAll('#od-visual *').length, canvas: !!document.querySelector('#od-visual canvas') }));
ok(/1-back-zone\.png$/.test(pv.src) && pv.extra === 1 && !pv.canvas, 'ORDER: the PHOTO of the print zone, nothing simulated over it');
// 02/11 (Wah) : « la dernière section, c'est un rappel… le nom dans sa fameuse
// box perforée bleu navy, la box du Totehm, le prix et le style (sa vignette) —
// sans 177 of 177 pieces left ni 7 in this style, propres à leurs sections. »
const rap = await pg.evaluate(() => { const r = document.querySelector('#od-recap');
  const nd = r.querySelector('.od-dos use'), bx = r.querySelector('.od-box'), st = r.querySelector('.od-st');
  return { nom: (r.querySelector('.od-nm span') || {}).textContent || '',
    piece: nd ? nd.getAttribute('href') : null,
    box: bx ? bx.textContent.replace(/\s+/g, ' ').trim() : '',
    boxCouleur: bx ? getComputedStyle(bx).backgroundColor : '',
    style: st ? st.textContent.trim() : '', vignette: !!(st && st.querySelector('img')),
    prix: (r.querySelector('.price') || {}).textContent || '',
    vetement: r.textContent.replace(/\s+/g, ' '),
    restes: /pieces left|in this style/i.test(r.textContent),
    tailles: !!document.querySelector('#od-sizes') }; });
ok(rap.nom === '0.hillstreet' && rap.piece === '#higher-dos' && /Slow is smooth/.test(rap.box)
   && /116, 49, 105/.test(rap.boxCouleur) && /Ink Realism/.test(rap.style) && rap.vignette
   && /170/.test(rap.prix) && /Higher Champion Sweatshirt · M/.test(rap.vetement)
   && !rap.restes && !rap.tailles,
  '02/11 · le rappel : le nom dans la pièce perforée, la box dans sa couleur, la vignette du style, le vêtement, le prix — et AUCUN reste ' + JSON.stringify(rap));
ok(/Order · 170 €/.test(await pg.textContent('#od-go')) && await pg.isEnabled('#od-go'), 'the order button carries the server price');
await pg.waitForTimeout(560);
await pg.screenshot({ path: OUT + '/sw_order.png' });
await pg.click('#od-go');
await pg.waitForURL(/checkout\.stripe\.test/);
ok(body && body.garment_id === 's1' && body.box.kind === 'wisdom' && body.box.ref === 'w1' && body.name === 'hillstreet' && body.size === 'M' && body.style_id === 'st1',
  'order sends a reference (wisdom) and the name WITHOUT prefix (the server sets 0.)');
ok(JSON.stringify(body.pick) === '{"matter":[{"kind":"objectives","text":"Marathon in May"}],"shots":["sp1"]}' && !body.hide,
  '26/10 · ce qui est ALLUMÉ part en RÉFÉRENCES (mini-box + photo) ; le serveur relit tout lui-même ' + JSON.stringify(body.pick));

// ── Paiement annulé : retour sur ORDER, tous les choix gardés
await pg.goto('https://www.higher.boutique/streetwear?cancel=1');
await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().stage === 'order');
d = await D();
ok(d.named && d.style && d.size && d.element === 'wisdom' && /cancelled/.test(await pg.textContent('#od-note')), 'Stripe cancelled: back on ORDER, name · style · size · element kept');
ok(!/cancel=/.test(pg.url()), 'the ?cancel=1 leaves the address bar');
// 02/11 (Wah) : « full screen par full screen, pas d'entre-deux. Je ne veux pas
// le scrolling traditionnel. » Le rouleau ne défile donc PAS : il se pose.
const rouleau = await pg.evaluate(() => { const r = document.getElementById('stages'), k = document.getElementById('stages-roll');
  const l = [...document.querySelectorAll('.stage.is-open')], o = document.getElementById('s-order');
  const dec = new DOMMatrixReadOnly(getComputedStyle(k).transform).m42;
  return { n: l.length, ids: l.map(e => e.id).join(','), fige: getComputedStyle(r).overflowY,
    plein: l.every(e => Math.abs(e.getBoundingClientRect().height - r.clientHeight) < 1),
    pose: Math.abs(-dec - o.offsetTop) < 2, haut: Math.abs(o.getBoundingClientRect().top - r.getBoundingClientRect().top) < 2,
    dedans: getComputedStyle(o).overflowY }; });
ok(rouleau.n === 5 && rouleau.ids === 's-cloth,s-style,s-element,s-name,s-order' && rouleau.fige === 'hidden'
   && rouleau.plein && rouleau.pose && rouleau.haut && rouleau.dedans === 'auto',
  '02/11 · un FEUILLETEUR : la page ne défile pas, l\'étape est POSÉE plein écran, et elle seule défile si elle déborde ' + JSON.stringify(rouleau));
// UN GESTE = UNE ÉTAPE, jamais une demie : la molette avance d'exactement une
// section, et une inertie de trackpad n'en tourne pas trois.
const unPas = await pg.evaluate(async () => {
  const k = document.getElementById('stages-roll'), r = document.getElementById('stages');
  const y = () => -new DOMMatrixReadOnly(getComputedStyle(k).transform).m42;
  const avant = window.__totehm_cloth().stage, y0 = y();
  r.dispatchEvent(new WheelEvent('wheel', { deltaY:-300, bubbles:true, cancelable:true }));
  r.dispatchEvent(new WheelEvent('wheel', { deltaY:-300, bubbles:true, cancelable:true }));
  r.dispatchEvent(new WheelEvent('wheel', { deltaY:-300, bubbles:true, cancelable:true }));
  await new Promise(f => setTimeout(f, 620));
  return { avant, apres: window.__totehm_cloth().stage, saut: Math.round((y0 - y()) / r.clientHeight) };
});
ok(unPas.avant === 'order' && unPas.apres === 'name' && unPas.saut === 1,
  '02/11 · trois crans de molette d\'affilée = UNE étape, jamais trois ' + JSON.stringify(unPas));
// UNE ÉTAPE PLUS HAUTE QUE L'ÉCRAN SE LIT CHEZ ELLE — et le geste de page ne
// part qu'une fois son bord atteint (sinon une vue de huit box serait illisible).
const tenu = await pg.evaluate(async () => {
  const r = document.getElementById('stages'), e = document.getElementById('s-name');
  const bourre = document.createElement('div'); bourre.style.cssText = 'height:900px;flex:none'; bourre.id = 'bourre';
  e.querySelector('.inner').appendChild(bourre);
  await new Promise(f => requestAnimationFrame(() => requestAnimationFrame(f)));
  const max = e.scrollHeight - e.clientHeight;
  e.scrollTop = Math.round(max / 2);
  const avant = window.__totehm_cloth().stage;
  r.dispatchEvent(new WheelEvent('wheel', { deltaY:300, bubbles:true, cancelable:true }));
  await new Promise(f => setTimeout(f, 300));
  const out = { deborde: max > 4, milieu: Math.round(e.scrollTop), avant,
    reste: window.__totehm_cloth().stage, hauteur: e.scrollHeight, ecran: e.clientHeight };
  bourre.remove(); e.scrollTop = 0; return out;
});
ok(tenu.deborde && tenu.milieu > 0 && tenu.reste === tenu.avant,
  '02/11 · une étape plus haute que l\'écran se lit CHEZ ELLE : le geste ne tourne pas la page tant qu\'il reste à lire ' + JSON.stringify(tenu));
// Remonter d'un écran, c'est le doigt — pas le « back » du navigateur.
await monter(pg, 'style');
await pg.waitForTimeout(560);          // le rouleau finit de glisser avant qu'on le mesure
ok((await pg.evaluate(() => { const k = document.getElementById('stages-roll'), s = document.getElementById('s-style');
  const dec = -new DOMMatrixReadOnly(getComputedStyle(k).transform).m42;
  return Math.abs(dec - s.offsetTop) < 2 && document.getElementById('s-order').classList.contains('is-open'); })),
  '26/10 · on remonte au STYLE d\'un geste, et la commande reste dessous');

// ── Retour payé : le nom, et Decode
await pg.goto('https://www.higher.boutique/streetwear?paid=1&cloth=c1');
await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().stage === 'done');
ok((await pg.textContent('#dn-name')) === '0.hill' && (await pg.getAttribute('#dn-decode', 'href')) === '/?decode=0.hill', 'paid: the name, and Decode it → /?decode=0.hill');
log.errors = log.errors.filter(e => !/404|Failed to load/.test(e));
ok(!log.errors.length, 'phone: no page error: ' + log.errors.join(' | '));

// ── ORDINATEUR : le vêtement reste et se décale, les fenêtres-côtés glissent (comme SPACE)
{
  const { pg, ctx, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, network, viewport:{ width:1280, height:800 } });
  await ctx.route('https://checkout.stripe.test/**', r => r.fulfill({ status:200, contentType:'text/html', body:'ok' }));
  const D = () => pg.evaluate(() => window.__totehm_cloth());
  const geo = () => pg.evaluate(() => { const v = document.querySelector('#viewer').getBoundingClientRect();
    const r = id => { const b = document.getElementById(id).getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right) }; };
    return { vc: Math.round((v.left + v.right) / 2), vis: document.getElementById('s-cloth').getBoundingClientRect().bottom > 1 ? 'visible' : 'hidden', el: r('s-element'), nm: r('s-name'), w: innerWidth }; });
  await pg.goto('https://www.higher.boutique/streetwear');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready);
  await pg.waitForTimeout(150);
  let g = await geo(); let d = await D();
  ok(d.desktop && Math.abs(g.vc - g.w / 2) < 3, 'desktop: the cloth stands in the middle');
  await pg.screenshot({ path: OUT + '/sw_desk_cloth.png' });
  await pg.click('#cl-go');
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'style');
  await pg.click('.st-card[data-id="st1"]');
  await pg.waitForFunction(() => window.__totehm_cloth().style);
  await descendre(pg, 'element');
  await pg.waitForTimeout(700);
  g = await geo(); d = await D();
  ok(Math.abs((g.el.l + g.el.r) / 2 - g.w / 2) < 3 && g.vis === 'hidden',
    'desktop: NO side window — the TOTEHM takes the screen, centred, and the cloth has rolled off it');
  ok(!(await pg.$('#vw-zone')) && !(await pg.$('.pz')), 'no simulated preview anywhere on the cloth');
  await pg.screenshot({ path: OUT + '/sw_desk_papers.png' });
  await pg.click('.pap-s');
  await pg.waitForFunction(() => window.__totehm_cloth().view === 'wisdom');
  await pg.click('#el-list .bx');
  await descendre(pg, 'name');
  await pg.waitForTimeout(600);
  g = await geo(); d = await D();
  ok(Math.abs((g.nm.l + g.nm.r) / 2 - g.w / 2) < 3, 'NAME: still the same centred column, nothing slides');
  await pg.fill('#nm-input', 'sea');
  await pg.waitForFunction(() => /available/.test(document.querySelector('#nm-note').textContent));
  await descendre(pg, 'style');
  await pg.waitForFunction(() => document.querySelectorAll('.st-card').length === 2);
  await pg.click('.st-card[data-id="st1"]');
  await descendre(pg, 'order');
  await pg.waitForTimeout(500);
  ok(await pg.isVisible('#od-visual') && (await geo()).vis === 'hidden', 'ORDER takes the screen alone: the cloth has rolled off it');
  await pg.screenshot({ path: OUT + '/sw_desk_order.png' });
  log.errors = log.errors.filter(e => !/404|Failed to load/.test(e));
  ok(!log.errors.length, 'desktop: no page error ' + log.errors.join(' | '));
}
// ── Sans compte : TOTEHMIZE passe par totehm.com (PKCE), la pièce attend
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, network, session:false });
  await pg.goto('https://www.higher.boutique/streetwear');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().supports === 2);
  const req = pg.waitForRequest(r => /www\.totehm\.com\/auth\?client=boutique/.test(r.url()));
  await pg.click('#cl-go');
  const u = new URL((await req).url());
  ok(u.searchParams.get('return') === '/streetwear' && !!u.searchParams.get('challenge') && !!u.searchParams.get('state'), 'signed out: TOTEHMIZE goes through totehm.com (PKCE + state), back to /streetwear');
  ok(!log.errors.length, 'signed out: no page error ' + log.errors.join(' | '));
}
// ── 08/10 (ter) · ARRIVER DE COM : « + totehmize » de MY STORY → l'élément déjà choisi, relu dans MON Totehm
{
  const { pg, ctx, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, network });
  let sent = null;
  await ctx.route(SB + '/functions/v1/create-checkout', r => { sent = JSON.parse(r.request().postData()); r.fulfill({ status:200, contentType:'application/json', body:'{"url":"https://checkout.stripe.test/c","name":"0.sea"}' }); });
  await ctx.route('https://checkout.stripe.test/**', r => r.fulfill({ status:200, contentType:'text/html', body:'ok' }));
  await pg.goto('https://www.higher.boutique/streetwear?wear=wisdom:w1');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().element === 'wisdom');
  const d = await pg.evaluate(() => window.__totehm_cloth());
  // 02/11 (Wah) : « la première section concerne simplement le choix du vêtement :
  // pas besoin d'afficher la box héritée de la deuxième section ». L'élément est
  // bien gardé — il ne s'affiche simplement plus ici.
  const chip = await pg.evaluate(() => ({ aucune: !document.getElementById('cl-wear'),
    txt: document.getElementById('s-cloth').textContent,
    fits: document.getElementById('cl-go').getBoundingClientRect().bottom <= innerHeight }));
  ok(d.stage === 'cloth' && !d.wanted && d.element === 'wisdom' && chip.aucune && !/Slow is smooth/.test(chip.txt),
    '02/11 · de COM : le vêtement SEUL — l\'élément est gardé mais ne s\'affiche pas dans sa section');
  ok(new URL(pg.url()).search === '' && chip.fits, 'the ?wear= leaves the address bar; the button stays on one screen');
  ok(log.rpc.some(x => x.name === 'my_trips'), 'the element is read again in MY TOTEHM (my_trips), never trusted from the address');
  await pg.screenshot({ path: OUT + '/sw_from_com.png' });
  await pg.click('#cl-go');
  // 02/11 : le style passe devant — TOTEHMIZE ouvre donc le style, puis le nom
  // (la box, elle, vient déjà de COM).
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'style');
  await pg.click('.st-card[data-id="st1"]');
  await pg.waitForFunction(() => window.__totehm_cloth().style);
  await descendre(pg, 'name');
  ok(/Slow is smooth/.test(await pg.textContent('#el-list')) && /my wisdom story/i.test(await pg.textContent('#el-sub')), 'de COM : la box est déjà choisie, le nom attend juste après le style');
  await monter(pg, 'element');
  ok((await pg.evaluate(() => window.__totehm_cloth().view)) === 'wisdom', 'remonter : ELEMENT, sur MY STORY (l\'élément peut encore changer)');
  await descendre(pg, 'name');
  await pg.fill('#nm-input', 'sea');
  await pg.waitForFunction(() => /available/.test(document.querySelector('#nm-note').textContent));
  await pg.press('#nm-input', 'Enter');
  await descendre(pg, 'order');
  await monter(pg, 'cloth');
  await pg.click('#cl-sizes .sz[data-s="M"]');
  await pg.waitForFunction(() => window.__totehm_cloth().size);
  await descendre(pg, 'order');
  await pg.click('#od-go');
  await pg.waitForURL(/checkout\.stripe\.test/);
  ok(sent && sent.box.kind === 'wisdom' && sent.box.ref === 'w1' && sent.name === 'sea' && sent.size === 'M', 'the order carries the element chosen in COM (wisdom · w1)');
  ok(!log.errors.length, 'from COM: no page error ' + log.errors.join(' | '));
}
// ── 23/10 · n'importe quelle box arrive de COM : une VISION, une HABIT
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, network });
  await pg.goto('https://www.higher.boutique/streetwear?wear=vision:v1');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().element === 'vision');
  ok((await pg.evaluate(() => window.__totehm_cloth().element)) === 'vision', 'a VISION from COM is worn');
  await pg.goto('https://www.higher.boutique/streetwear?wear=habit:Cold%20shower');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().element === 'habit');
  ok((await pg.evaluate(() => window.__totehm_cloth().element)) === 'habit', 'a HABIT from COM is worn — its text is its reference');
  ok(!log.errors.length, 'from COM, any box: no page error ' + log.errors.join(' | '));
}
// ── Un élément introuvable (effacé, autre compte) : oublié, la page suit son cours
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, network });
  await pg.goto('https://www.higher.boutique/streetwear?wear=wisdom:gone');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().supports === 2);
  await pg.waitForTimeout(120);
  ok(!(await pg.evaluate(() => window.__totehm_cloth().element)), 'an unknown element is dropped: nothing chosen, nothing shown');
  await pg.click('#cl-go');
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'style');
  ok(!log.errors.length, 'unknown element: TOTEHMIZE opens the flow as usual, no page error');
}
// ── Sans compte, arrivé de COM : l'élément voulu attend la connexion (PKCE), puis NAME
{
  const { pg, ctx, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, network, session:false });
  await pg.goto('https://www.higher.boutique/streetwear?wear=wisdom:w1');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().supports === 2);
  ok((await pg.evaluate(() => window.__totehm_cloth().wanted)) && !(await pg.$('#cl-wear')), 'signed out: the wish is kept, nothing shown before the TOTEHM is read');
  // totehm.com rend la main (simulé) ; au retour, la session est là.
  await ctx.route('https://www.totehm.com/auth**', r => r.fulfill({ status:200, contentType:'text/html', body:'<script>location.replace("https://www.higher.boutique/streetwear")</script>' }));
  await ctx.addInitScript(([u]) => { if(location.host === 'www.higher.boutique') localStorage.setItem('sb-abujjbkbbiumxrokozph-auth-token', JSON.stringify({ access_token:'test-at', refresh_token:'test-rt', token_type:'bearer', expires_in:3600, expires_at: Math.floor(Date.now()/1000) + 3600, user:u })); }, [USER]);
  const req = pg.waitForRequest(r => /www\.totehm\.com\/auth\?client=boutique/.test(r.url()));
  await pg.click('#cl-go');
  ok(new URL((await req).url()).searchParams.get('return') === '/streetwear', 'signed out: TOTEHMIZE signs in through totehm.com (PKCE), back to /streetwear');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().stage === 'style', null, { timeout:15000 });
  ok((await pg.evaluate(() => window.__totehm_cloth().element)) === 'wisdom', 'the wish travels through the sign-in: back with the wisdom chosen in COM, on the style');
  ok(!log.errors.filter(e => !/totehm\.com\/auth/.test(e)).length, 'signed out from COM: no page error');
}
// ── Le passeport : 08/11 (Wah) « une seule box dans une vue suffit »
{
  /* TROIS vues remplies sur cinq : ça PASSE désormais. L'ancienne règle exigeait
     les cinq et arrêtait ce membre à la porte. */
  const { pg } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc:{ ...rpc, totehm_complete:{ complete:false, any:true, remplies:3, habits:true, objectives:true, repulsions:false, wisdom:true, visions:false } }, tables, network });
  await pg.goto('https://www.higher.boutique/streetwear');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().supports === 2);
  await pg.click('#cl-go');
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'style');
  ok(!(await pg.evaluate(() => document.querySelector('#pass').classList.contains('is-open'))),
     "08/11 · trois vues sur cinq TOTEHMISENT : une seule box suffit, la porte ne s'ouvre plus");
}
{
  /* AUCUNE box : là, et là seulement, la porte se ferme — et elle dit qu'UNE suffit. */
  const { pg } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc:{ ...rpc, totehm_complete:{ complete:false, any:false, remplies:0, habits:false, objectives:false, repulsions:false, wisdom:false, visions:false } }, tables, network });
  await pg.goto('https://www.higher.boutique/streetwear');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().supports === 2);
  await pg.click('#cl-go');
  await pg.waitForSelector('#pass.is-open');
  const p = await pg.evaluate(() => ({ n: document.querySelector('#pass-n').textContent,
    dit: document.querySelector('#pass .say').textContent, go: document.querySelector('#pass-go').textContent }));
  ok(/one box is enough/.test(p.n) && /ONE box/.test(p.dit) && /first box/.test(p.go)
     && (await pg.evaluate(() => window.__totehm_cloth().stage)) === 'cloth',
     'un Totehm VIDE reste a la porte, et la porte dit qu une seule box suffit · ' + JSON.stringify(p));
}
// ── La collection vide, sur ordinateur : la page tient debout
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables: { ...tables, totehm_cloth_support: [] }, network, viewport:{ width:1280, height:800 } });
  await pg.goto('https://www.higher.boutique/streetwear');
  await pg.waitForFunction(() => window.__totehm_cloth && /coming soon/.test(document.querySelector('#viewer').textContent));
  ok(!(await pg.isVisible('#cl-go')) && (await pg.evaluate(() => window.__totehm_cloth().stage)) === 'cloth', 'empty collection: coming soon, no TOTEHMIZE');
  ok(!log.errors.length, 'empty collection: no page error ' + log.errors.join(' | '));
}
// ── 03/11 · LE RETOUR DE STRIPE. `?paid=1` montre l'étape finale. `done` manquait
//    à STAGES : `ouvrir()` ne l'ouvrait jamais, le cas `fini` fermait tout le
//    reste, et le membre retombait sur un ÉCRAN NOIR, sans la moindre erreur JS.
{
  const CL = '9d53364c-709a-408c-802f-15e11259dff7';
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc,
    tables: { ...tables, totehm_clothes: [{ id:CL, name:'0.muscle', status:'draft' }] }, network });
  await pg.goto('https://www.higher.boutique/streetwear?paid=1&cloth=' + CL);
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().stage === 'done');
  const fin = await pg.evaluate(() => {
    const d = document.querySelector('.stage[data-s="done"]'), r = d.getBoundingClientRect();
    return { ouvertes: [...document.querySelectorAll('.stage.is-open')].map(e => e.dataset.s),
             haut: Math.round(r.height), inert: !!d.inert, nom: document.querySelector('#dn-name').textContent,
             texte: (document.body.innerText || '').trim().length };
  });
  ok(fin.ouvertes.length === 1 && fin.ouvertes[0] === 'done' && fin.haut > 200 && !fin.inert
     && fin.nom === '0.muscle' && fin.texte > 20,
    '03/11 · retour de paiement : l\'étape finale est SEULE, visible et nommée — jamais un écran noir ' + JSON.stringify(fin));
  ok(!log.errors.length, 'retour de paiement : aucune erreur ' + log.errors.join(' | '));
}
await browser.close();
