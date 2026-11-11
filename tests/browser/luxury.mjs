// higher.boutique/luxury — L'ATELIER LOCAL (11/11/2026). Zéro réseau.
// Wah : « la branche luxury, il faut la refaire en front sur le modèle de streetwear…
// avant tout règlement de l'acompte de 770 €, l'utilisateur doit obligatoirement fournir :
// le nom exact du produit (parmi les 3 marques d'exception), une photo ou une vidéo haute
// définition de sa pièce qui doit arriver en premier lieu, ainsi que sa ville… une Box, un
// style artistique (liste ou photo d'un artiste) et son budget. »
// On MESURE : le feuilleteur (doigt + [NEXT]), la vidéo qui laisse une image fixe à étudier,
// les trois marques, la ville, le style, la box, le budget — puis ce qui part vraiment.
// LANCER : node luxury.mjs /tmp
import { launch, page, ok, USER } from './harness.mjs';
const OUT = process.argv[2] || '.';
const browser = await launch();

const ACCESS = { signed_in:true, thp:true, open:true, price_cents:77000, currency:'eur',
                 quotes:[], admin:false, test_mode:true, mode:'quote' };
const rpc = {
  luxury_access: () => ACCESS,
  name_available: b => String(b.candidate).toLowerCase() !== '0.taken',
  my_trips: {
    trips:[{ id:'o1', text:'Marathon in May', is:['flow'], habits:[{ t:'Run the hill', i:'fight' }] }],
    loose:[{ t:'Cold shower', i:'fight' }],
    reps:[{ id:'r1', text:'Scrolling at night', is:['focus'] }],
    wisdom:[{ id:'w1', text:'Slow is smooth', is:['focus'] }],
    visions:[{ id:'v1', text:'A studio by the sea', is:['express'] }],
  },
  my_box_matter: () => ({ text:'Slow is smooth', view:'wisdom', palette:['#378ADD'],
    matter:{ objectives:[{ text:'Marathon in May' }],
             habits:[{ text:'Run the hill again before anyone else wakes up, even when the rain has turned the trail into a river' }] },
    extra:{ mood:'Low end theory' } }),
  my_box_shots: () => ([
    { kind:'media', id:'em1', bucket:'element-media', path:'u/m-1.jpg', txt:'bag.jpg', at:'2026-10-20' },
    { kind:'spot',  id:'sp1', bucket:'moments',       path:'u/s-1.jpg', txt:'the hill', at:'2026-10-24' } ]),
};
const styles = [{ id:'sty1', name:'Ink Realism', active:true, status:'active', position:1,
                  image_url:'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22/%3E' },
                { id:'sty2', name:'Gold Leaf', active:true, status:'active', position:2 }];
const tables = { profiles: [{ pseudo:'Vallerand' }], artistic_styles: styles };
let ASK = null, CHECKOUT = null;
const functions = {
  'luxury-quote': b => { if(b.action === 'request'){ ASK = b; return { ok:true, id:'q1', name:'0.sea', cents:77000, currency:'eur' }; }
                         if(b.action === 'photos') return { ok:true, photos:[] };
                         return { ok:true }; },
  'luxury-checkout': b => { CHECKOUT = b; return { url:'https://checkout.stripe.test/c' }; },
};
const net = url => url.href.startsWith('https://checkout.stripe.test')
  ? { status:200, contentType:'text/html', body:'ok' } : null;

/* Une VRAIE vidéo (VP8/WebM, 320×240, 2 s) : c'est d'elle que la page doit
   tirer une image fixe. Elle vit ici, en clair : zéro réseau, zéro outil. */
const WEBM = Buffer.from('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', 'base64');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const { pg, ctx, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, functions, network:net, hasTouch:true });
const D = () => pg.evaluate(() => window.__totehm_luxury());
const cdp = await ctx.newCDPSession(pg);
const pt = (x, y) => [{ x, y, radiusX:12, radiusY:12, force:1, id:1 }];
const glisser = async (y0, y1, pas = 10) => {
  await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints: pt(24, y0) });
  for(let i = 1; i <= pas; i++){
    await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints: pt(24, Math.round(y0 + (y1 - y0) * i / pas)) });
    await pg.waitForTimeout(12);
  }
  await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints: [] });
  await pg.waitForTimeout(520);
};
const suivant = async () => { await pg.click('#st-next'); await pg.waitForTimeout(520); };

await pg.goto('https://www.higher.boutique/luxury');
await pg.waitForFunction(() => window.__totehm_luxury && window.__totehm_luxury().price_loaded);
let d = await D();

// ── 0 · L'INTRO : tout se dit AVANT
ok(d.deposit === 77000 && d.stage === 'intro' && !d.flow && !d.photo && !d.box,
  'le luxe s\'ouvre sur son intro ; le dépôt est à 770 € ' + JSON.stringify({ deposit:d.deposit, stage:d.stage }));
const intro = await pg.evaluate(() => document.querySelector('#s-intro').textContent.replace(/\s+/g, ' '));
ok(/770/.test(await pg.textContent('#price')) && /deposit/i.test(await pg.textContent('#price')),
  'le prix dit un DÉPÔT de 770 €');
ok(/pigment/i.test(intro) && /generation/i.test(intro) && /bespoke/i.test(intro),
  '11/11 · l\'intro pose les matières : pigments ultra-haut de gamme, 100 % sur-mesure, un objet qui se transmet');
ok(/local/i.test(intro) && /gallery/i.test(intro) && /largest private network/i.test(intro),
  '11/11 · l\'intro pose l\'ADN : artistes LOCAUX, galerie partenaire, le plus grand réseau privé');
ok(/30 days|thirty days/i.test(intro) && /refunded/i.test(intro) && /two weeks/i.test(intro),
  '11/11 · l\'intro pose les délais : 30 jours ou remboursé, puis deux semaines pour l\'œuvre');
ok(/Hermès/.test(intro) && /Louis Vuitton/.test(intro) && /Gucci/.test(intro) && /Not affiliated/i.test(intro),
  'les trois marques d\'exception sont nommées, et l\'indépendance est écrite');
const plein = await pg.evaluate(() => { const r = document.querySelector('#stages').getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), W: innerWidth, H: innerHeight,
           ouvertes: window.__totehm_luxury().ouvertes }; });
ok(plein.w === plein.W && plein.h === plein.H && plein.ouvertes.join(',') === 'intro',
  'le rouleau prend TOUT l\'écran, et seule l\'intro est ouverte ' + JSON.stringify(plein));
await pg.screenshot({ path: OUT + '/lux_intro.png' });

// ── HOW IT WORKS : le métier, replié puis ouvert
ok((await pg.$eval('#how-body', e => e.getBoundingClientRect().height)) < 2, 'How it works est replié');
await pg.click('#how-btn');
await pg.waitForTimeout(500);
const how = await pg.textContent('#how-body');
ok(/primer/i.test(how) && /local/i.test(how) && /30 days/i.test(how) && /two weeks/i.test(how) && /refunded in full/i.test(how),
  'How it works dit l\'étude, l\'artiste local, les 30 jours, les deux semaines et le remboursement');

// ── LA PORTE : elle ouvre le dépôt (elle connecte et vérifie le TotehmPaper)
await pg.click('#go');
await pg.waitForFunction(() => window.__totehm_luxury().stage === 'piece');
ok((await D()).ouvertes.join(',') === 'intro,piece', 'la porte ouvre LA PIÈCE, et rien de plus');

// ── 1 · LA PIÈCE : UNE VIDÉO, et l'image fixe qu'on en tire
await pg.setInputFiles('#ph-file', { name:'piece.webm', mimeType:'video/webm', buffer: WEBM });
await pg.waitForFunction(() => window.__totehm_luxury().photo, null, { timeout:15000 });
await pg.waitForTimeout(300);
d = await D();
const envois = log.upload.filter(u => u.path.startsWith('luxury-pieces/'));
const still = envois.find(u => /\.jpg$/.test(u.path)), video = envois.find(u => /\.webm$/.test(u.path));
ok(still && video && still.path.startsWith('luxury-pieces/' + USER.id + '/') && video.path.startsWith('luxury-pieces/' + USER.id + '/')
   && still.size > 200 && d.media === 'video',
  '11/11 · UNE VIDÉO : la page dépose la vidéo ET l\'image fixe qu\'elle en tire ' + JSON.stringify({ still: still && still.size, video: video && video.size }));
ok(!(await pg.$eval('#ph-vid', e => e.hidden)), 'la vidéo se montre dans la tuile grise');
// les trois marques, et rien d'autre
const brs = await pg.$$eval('#br-chips .chip', l => l.map(b => b.textContent.trim()));
ok(brs.join(' · ') === 'Hermès · Louis Vuitton · Gucci', 'trois marques, pas une de plus (' + brs.join(', ') + ')');
await pg.click('#br-chips .chip:nth-child(1)');
await pg.fill('#product', 'Birkin 30');
await pg.fill('#city', 'Los Angeles');
await pg.fill('#note', 'a 2019 bag, black leather');
d = await D();
ok(d.brand && d.product && d.city, 'la marque, le produit exact et la ville sont tenus par la page');
await pg.screenshot({ path: OUT + '/lux_piece.png' });

// ── 2 · LE STYLE : la liste OU la photo d'un artiste
await suivant();
await pg.waitForFunction(() => document.querySelectorAll('#st-rail .st-card').length === 2);
ok((await D()).stage === 'style', '[NEXT] mène au style');
ok(!(await D()).next, 'sans style choisi, rien dessous : le bouton ne promet rien');
await pg.setInputFiles('#sr-file', { name:'style.png', mimeType:'image/png', buffer: PNG });
await pg.waitForFunction(() => window.__totehm_luxury().style_ref);
ok((await D()).next, 'une photo de style suffit à ouvrir la suite');
await pg.click('#st-rail .st-card[data-id="sty1"]');
await pg.waitForFunction(() => window.__totehm_luxury().style);
ok((await D()).style, 'un style de la liste se choisit aussi');

// ── 3 · LE TOTEHM, comme sur streetwear
await suivant();
await pg.waitForFunction(() => window.__totehm_luxury().stage === 'element');
await pg.waitForFunction(() => !!document.querySelector('#tz-papers .pap-lab'));
ok((await pg.$$eval('#tz-papers .pap-lab', l => l.map(b => b.textContent.trim()))).join(',') === 'my story,my grind,my vision',
  '11/11 · le papier dit MY STORY, comme sur totehm.com');
await pg.click('#totehmize');
await pg.waitForFunction(() => window.__totehm_luxury().papers);
await pg.waitForTimeout(600);
await pg.click('.pap-s');
await pg.waitForFunction(() => /Slow is smooth/.test(document.querySelector('#el-list').textContent));
await pg.click('#el-list .bx');
await pg.waitForFunction(() => window.__totehm_luxury().box);
await pg.waitForFunction(() => !!document.querySelector('#el-list .bx.is-on #matter .mi'));
d = await D();
ok(d.box && (await pg.$$eval('#el-list .bx', l => l.filter(b => b.offsetParent).length)) === 1,
  'la box tapée EST le choix : la liste se réduit à elle');
// le TOTEHM garde son dessin exact ; la mini-box longue se lit EN ENTIER
const tot = await pg.evaluate(() => {
  const mi = [...document.querySelectorAll('#matter .mi')].find(b => b.textContent.length > 60);
  const s = getComputedStyle(mi);
  return { papier: getComputedStyle(document.querySelector('.pap-g')).backgroundColor,
           perfo: getComputedStyle(document.querySelector('.pap-g')).maskImage.includes('svg'),
           box: getComputedStyle(document.querySelector('#el-list .bx.is-on')).backgroundColor,
           blanc: s.whiteSpace, lignes: Math.round(mi.getBoundingClientRect().height / parseFloat(s.lineHeight)),
           coupe: mi.scrollWidth > mi.clientWidth + 1 };
});
ok(tot.papier === 'rgb(51, 51, 102)' && tot.perfo && tot.box !== 'rgb(21, 21, 26)',
  '27/10 · le TOTEHM garde ses couleurs : le papier navy perforé et la box ' + JSON.stringify({ p:tot.papier, b:tot.box }));
ok(tot.blanc === 'normal' && tot.lignes >= 2 && !tot.coupe,
  '11/11 · ici aussi, une mini-box longue revient à la ligne et se lit en entier ' + JSON.stringify({ l:tot.lignes }));
await pg.click('#matter .mi[data-k="objectives"]');
await pg.waitForFunction(() => window.__totehm_luxury().linked === 1);
await pg.waitForSelector('#shots .sh-t');
await pg.click('#shots .sh-t[data-id="em1"]');
await pg.waitForFunction(() => window.__totehm_luxury().shots === 1);
await pg.screenshot({ path: OUT + '/lux_element.png' });

// ── 4 · LE BUDGET
await suivant();
await pg.waitForFunction(() => window.__totehm_luxury().stage === 'budget');
const bgs = await pg.$$eval('#bg-chips .chip', l => l.map(b => b.textContent.trim()));
ok(bgs.length === 6 && /\+$/.test(bgs[5]), 'le budget se dit en paliers, le dernier ouvert (' + bgs.join(', ') + ')');
ok(!(await D()).next, 'sans budget, rien dessous');
await pg.click('#bg-chips .chip:nth-child(3)');
await pg.waitForFunction(() => window.__totehm_luxury().budget === 1000000);
ok((await D()).next, 'le budget choisi ouvre la suite');

// ── 5 · LE NOM
await suivant();
await pg.waitForFunction(() => window.__totehm_luxury().stage === 'name');
const nmf = await pg.$eval('#nm-field', e => { const s = getComputedStyle(e);
  return { bg: s.backgroundColor, img: s.borderImageSource, r: s.borderTopLeftRadius }; });
ok(nmf.bg === 'rgb(21, 21, 26)' && nmf.img === 'none' && nmf.r === '10px',
  '27/10 · le nom se tape dans une SAISIE GRISE (figher.club), ni navy ni perforée ' + JSON.stringify(nmf));
await pg.fill('#nm-input', '0.Sea Bag');
await pg.waitForFunction(() => /available/.test(document.querySelector('#name-note').textContent));
ok((await pg.inputValue('#nm-input')) === 'seabag' && (await D()).next,
  'un IDENTIFIANT : minuscules, sans espace — et le dépôt s\'ouvre dessous');

// ── LE DOIGT : il remonte et redescend, même sur une étape qui déborde
await glisser(150, 440);
ok((await D()).stage === 'budget', 'le doigt remonte d\'une étape (' + (await D()).stage + ')');
await glisser(440, 150);
ok((await D()).stage === 'name', 'et il redescend d\'une étape');

// ── 6 · LE DÉPÔT : le prix et le paiement, rien d'autre
await suivant();
await pg.waitForFunction(() => window.__totehm_luxury().stage === 'pay');
const fin = await pg.evaluate(() => { const st = document.querySelector('#s-pay');
  return { prix: (st.querySelector('.price') || {}).textContent || '',
           px: Math.round(parseFloat(getComputedStyle(st.querySelector('.price')).fontSize)),
           bouton: document.querySelector('#ask').textContent,
           rappel: /Birkin|Slow is smooth|Ink Realism|Los Angeles/.test(st.textContent) };
});
ok(/770/.test(fin.prix) && fin.px >= 22 && /770/.test(fin.bouton) && !fin.rappel,
  'la dernière étape ne dit que le PRIX et le PAIEMENT ' + JSON.stringify(fin));
await pg.screenshot({ path: OUT + '/lux_pay.png' });
await pg.click('#ask');
await pg.waitForFunction(() => /tick the box/.test(document.querySelector('#ask-n').textContent));
ok(true, 'sans les conditions lues, rien ne part');
await pg.check('#terms');
await pg.click('#ask');
await pg.waitForURL(/checkout\.stripe\.test/);
ok(ASK && ASK.photo === still.path.replace('luxury-pieces/', '') && ASK.media === video.path.replace('luxury-pieces/', '')
   && ASK.media_kind === 'video',
  'le dépôt envoie LES DEUX chemins : l\'image à étudier et la vidéo d\'origine');
ok(ASK.brand === 'Hermès' && ASK.product === 'Birkin 30' && ASK.city === 'Los Angeles' && ASK.budget_cents === 1000000
   && ASK.style === 'sty1' && /\.jpg$/.test(String(ASK.style_ref || '')),
  '11/11 · tout arrive AVANT le paiement : marque, produit, ville, budget, style ' + JSON.stringify({ b:ASK.brand, p:ASK.product, c:ASK.city, bu:ASK.budget_cents, s:ASK.style }));
ok(ASK.box.kind === 'wisdom' && ASK.box.ref === 'w1' && ASK.name === 'seabag'
   && JSON.stringify(ASK.pick) === '{"matter":[{"kind":"objectives","text":"Marathon in May"}],"shots":["em1"]}',
  '26/10 · la box et ce qui est ALLUMÉ voyagent en RÉFÉRENCES');
ok(CHECKOUT && CHECKOUT.quote_id === 'q1', 'le Checkout suit tout de suite, sur le devis que le serveur vient d\'écrire');
ok(!log.functions.some(f => f.name === 'sso-mint'), 'aucun pont SSO dans tout le parcours');
log.errors = log.errors.filter(e => !/404|Failed to load/.test(e));
ok(!log.errors.length, 'luxe : aucune erreur ' + log.errors.join(' | '));

// ── LE RETOUR DE STRIPE : l'étape finale est SEULE, jamais un écran noir
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, functions, network:net });
  await pg.goto('https://www.higher.boutique/luxury?paid=1');
  await pg.waitForFunction(() => window.__totehm_luxury && window.__totehm_luxury().stage === 'done');
  const f = await pg.evaluate(() => ({ ouvertes: window.__totehm_luxury().ouvertes,
    haut: Math.round(document.querySelector('.stage[data-s="done"]').getBoundingClientRect().height),
    texte: (document.body.innerText || '').trim().length }));
  ok(f.ouvertes.join(',') === 'done' && f.haut > 200 && f.texte > 20,
    'retour de paiement : l\'étape finale est SEULE et visible ' + JSON.stringify(f));
  log.errors = log.errors.filter(e => !/404|Failed to load/.test(e));
  ok(!log.errors.length, 'retour de paiement : aucune erreur ' + log.errors.join(' | '));
}
await browser.close();
