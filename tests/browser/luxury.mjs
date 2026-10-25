// higher.boutique/luxury — LE PROJET QUE L'ON DÉPOSE (24/10/2026). Zéro réseau.
// Wah : « simplifie largement la rubrique luxe… une photo de son article… 500 balles pour
// déposer le projet (remboursé si pas de possibilité)… reprendre le fonctionnement de
// streetwear dans le choix de la box ». On mesure : la photo part dans le dossier du membre,
// le TOTEHM se décompose à sa place, une box tapée EST le choix, une sous-box s'éteint, et
// le dépôt n'envoie que des RÉFÉRENCES avant d'ouvrir le Checkout.
// LANCER : node luxury.mjs /tmp
import { launch, page, ok, USER } from './harness.mjs';
const OUT = process.argv[2] || '.';
const browser = await launch();

const ACCESS = { signed_in:true, thp:true, open:true, price_cents:50000, currency:'eur',
                 quotes:[], admin:false, test_mode:true, mode:'test' };
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
  my_box_matter: b => ({ text:'Slow is smooth', view:'wisdom', palette:['#378ADD'],
    matter:{ objectives:[{ text:'Marathon in May' }], habits:[{ text:'Run the hill' }] }, extra:{ mood:'Low end theory' } }),
};
const tables = { profiles: [{ pseudo:'Vallerand' }] };
let ASK = null, CHECKOUT = null;
const functions = {
  'luxury-quote': b => { if(b.action === 'request'){ ASK = b; return { ok:true, id:'q1', name:'0.sea', cents:50000, currency:'eur' }; }
                         if(b.action === 'photos') return { ok:true, photos:[] };
                         return { ok:true }; },
  'luxury-checkout': b => { CHECKOUT = b; return { url:'https://checkout.stripe.test/c' }; },
};
const net = url => url.href.startsWith('https://checkout.stripe.test')
  ? { status:200, contentType:'text/html', body:'ok' } : null;

const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, functions, network:net });
const D = () => pg.evaluate(() => window.__totehm_luxury());

await pg.goto('https://www.higher.boutique/luxury');
await pg.waitForFunction(() => window.__totehm_luxury && window.__totehm_luxury().price_loaded);
let d = await D();
ok(d.build === '2026-10-25-plein-ecran' && d.deposit === 50000 && !d.photo && !d.box && !d.flow,
  'le luxe s\'ouvre sur son porche : le prix, le métier — le dépôt attend derrière un bouton (500 €)');
ok(/500/.test(await pg.textContent('#price')) && /deposit/i.test(await pg.textContent('#price'))
   && /refunded/i.test(await pg.textContent('#refund')), 'le prix dit un DÉPÔT, et le remboursement est écrit');
ok(!(await pg.$('#sel')) && !(await pg.$('.style-track')) && !(await pg.$('[data-piece]')) && !(await pg.$('[data-brand]')) && !(await pg.$('#nav-box')),
  'simplifié : plus de modal, plus de style du moment, plus de type ni de marque — et plus de manette ombrée');

// ── HOW IT WORKS : le métier, replié puis ouvert
ok((await pg.$eval('#how-body', e => e.getBoundingClientRect().height)) < 2, 'How it works est replié');
await pg.click('#how-btn');
await pg.waitForTimeout(500);
const how = await pg.evaluate(() => ({ h: document.querySelector('#how-body').getBoundingClientRect().height,
                                       t: document.querySelector('#how-body').textContent }));
ok(how.h > 200 && /primer|abrasion/i.test(how.t) && /flex/i.test(how.t) && /top-coat/i.test(how.t) && /refunded in full/i.test(how.t),
  'How it works dit la préparation, la peinture qui plie, la tenue — et le remboursement');

// ── LE FLUX, PLEIN ÉCRAN : une étape à la fois
await pg.click('#fm-go');
await pg.waitForFunction(() => window.__totehm_luxury().flow);
await pg.waitForTimeout(500);
const plein = await pg.evaluate(() => { const f = document.querySelector('#form').getBoundingClientRect();
  return { w: Math.round(f.width), h: Math.round(f.height), W: innerWidth, H: innerHeight,
           etape: window.__totehm_luxury().step, ouvertes: document.querySelectorAll('#form .step.is-open').length,
           croix: !!document.querySelector('#fm-x') && getComputedStyle(document.querySelector('#fm-x')).display !== 'none' }; });
ok(plein.w === plein.W && plein.h === plein.H && plein.etape === 'st-photo' && plein.ouvertes === 1 && plein.croix,
  'le dépôt prend TOUT l\'écran, une seule étape ouverte, une croix pour sortir ' + JSON.stringify(plein));

// ── 1 · LA PIÈCE : quelques mots, puis la photo (réduite ici, déposée dans le dossier du membre)
await pg.fill('#note', 'a 2019 bag, black leather');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
await pg.setInputFiles('#ph-file', { name:'piece.png', mimeType:'image/png', buffer: png });
await pg.waitForFunction(() => window.__totehm_luxury().photo);
await pg.waitForTimeout(650);   // l'étape qui part s'efface en 360 ms
d = await D();
const up = log.upload.at(-1);
ok(up && up.path.startsWith('luxury-pieces/' + USER.id + '/') && /\.jpg$/.test(up.path) && up.method === 'POST',
  'la photo part dans le DOSSIER du membre, en JPEG (' + (up ? up.path.slice(0, 60) : 'rien') + ')');
ok(d.step === 's-element' && !(await pg.$eval('#ph-img', e => e.hidden)) && (await pg.$$eval('#form .step.is-open', l => l.length)) === 1,
  'la photo déposée fait GLISSER vers l\'étape suivante : le TOTEHM, seul à l\'écran');

// ── 2 · LE TOTEHM, comme sur streetwear
ok(await pg.isVisible('#totehmize') && (await pg.$eval('#tz-logo', e => +getComputedStyle(e).opacity)) > 0.9,
  'le TOTEHM est là, entier : le fond, le rail, le T et le mot');
await pg.click('#totehmize');
await pg.waitForFunction(() => window.__totehm_luxury().papers);
await pg.waitForTimeout(600);
ok((await pg.$$eval('#tz-papers .pap-lab', l => l.map(b => b.textContent.trim()))).join(',') === 'my wisdom story,my grind,my vision',
  'il se décompose en trois papiers, à leur nom entier');
await pg.click('.pap-s');
await pg.waitForFunction(() => /Slow is smooth/.test(document.querySelector('#el-list').textContent));
ok(/my wisdom story/i.test(await pg.textContent('#el-sub')), 'un tap sur un papier donne ses box');
await pg.click('#el-list .bx');
await pg.waitForFunction(() => window.__totehm_luxury().box);
await pg.waitForFunction(() => !!document.querySelector('#el-list .bx.is-on #matter .mi'));
d = await D();
ok(d.box && d.step === 's-element' && await pg.isVisible('#el-go') && (await pg.$$eval('#el-list .bx', l => l.filter(b => b.offsetParent).length)) === 1,
  'la box tapée EST le choix : la liste se réduit à elle, et [Next] attend');
ok(/Marathon in May/.test(await pg.textContent('#matter')) && /Low end theory/.test(await pg.textContent('#matter')),
  'elle garde sa matière ouverte — ses mini-box et le son de son intention');
await pg.click('#matter .mi[data-k="objectives"]');
await pg.waitForFunction(() => window.__totehm_luxury().hidden === 1);
ok(await pg.$eval('#matter .mi[data-k="objectives"]', e => e.classList.contains('is-off')),
  'une sous-box s\'éteint ici aussi');
await pg.screenshot({ path: OUT + '/lux_element.png' });
await pg.click('#el-go');
await pg.waitForFunction(() => window.__totehm_luxury().step === 'st-name');

// ── 3 · LE NOM — un identifiant, dans la boîte navy perforée
ok((await pg.$eval('#nm-field', e => getComputedStyle(e).borderImageSource)).includes('svg')
   && (await pg.$eval('#nm-field', e => getComputedStyle(e).backgroundColor)) === 'rgb(51, 51, 102)',
  'le nom se tape dans la BOÎTE NAVY PERFORÉE');
await pg.fill('#nm-input', '0.Sea Bag');
await pg.waitForFunction(() => /available/.test(document.querySelector('#name-note').textContent));
ok((await pg.inputValue('#nm-input')) === 'seabag' && !(await pg.isDisabled('#nm-go')),
  'un IDENTIFIANT : minuscules, sans espace — et [Next] s\'ouvre');
await pg.click('#nm-go');
await pg.waitForFunction(() => window.__totehm_luxury().step === 'st-pay');
ok((await pg.$$eval('#form .step.is-open', l => l.length)) === 1, 'le dépôt, seul à l\'écran');

// ── 4 · LE DÉPÔT — des références, puis le Checkout
await pg.click('#ask');
await pg.waitForFunction(() => /tick the box/.test(document.querySelector('#ask-n').textContent));
ok(true, 'sans les conditions lues, rien ne part');
await pg.check('#terms');
await pg.click('#ask');
await pg.waitForURL(/checkout\.stripe\.test/);
ok(ASK && ASK.photo === up.path.replace('luxury-pieces/', '') && ASK.box.kind === 'wisdom' && ASK.box.ref === 'w1'
   && ASK.name === 'seabag' && /2019 bag/.test(ASK.note) && !('style' in ASK) && !('piece' in ASK) && !('brand' in ASK),
  'le dépôt envoie le CHEMIN de la photo, la référence de la box et le nom — rien d\'autre');
ok(JSON.stringify(ASK.hide) === '[{"kind":"objectives","text":"Marathon in May"}]',
  'la sous-box éteinte voyage en RÉFÉRENCE');
ok(CHECKOUT && CHECKOUT.quote_id === 'q1', 'le Checkout suit tout de suite, sur le devis que le serveur vient d\'écrire');
ok(!log.functions.some(f => f.name === 'sso-mint'), 'aucun pont SSO dans tout le parcours');
log.errors = log.errors.filter(e => !/404|Failed to load/.test(e));
ok(!log.errors.length, 'luxe : aucune erreur ' + log.errors.join(' | '));
await browser.close();
