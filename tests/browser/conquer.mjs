// higher.boutique/atelier + /conquer — VENDRE LA SOLUTION (12/11/2026). Zéro réseau.
// Wah : « crée-moi un système qui va vendre la solution… un superbe dashboard
// Commercial et communication — Conquer the world, gamifié, où ça envoie
// automatiquement en appuyant sur des boutons ».
// On MESURE : la page partenaire dit les chiffres et ne laisse rien partir de bancal ;
// le cockpit compte des VILLES, ses boutons appellent le serveur, et il ne s'ouvre
// qu'à un administrateur.
// LANCER : node conquer.mjs /tmp
import { launch, page, ok, USER } from './harness.mjs';
const OUT = process.argv[2] || '.';
const browser = await launch();

const BOARD = {
  score: { prospects: 14, to_contact: 9, contacted: 3, replied: 1, signed: 1, refused: 0 },
  cities: [
    { city:'Lisbon', country:'PT', prospects:9, to_contact:5, contacted:2, replied:1, signed:1, galleries:7, conquered:true },
    { city:'Paris',  country:'FR', prospects:5, to_contact:4, contacted:1, replied:0, signed:0, galleries:5, conquered:false },
  ],
  file: Array.from({ length: 9 }, (_, i) => ({ id:'p' + i, name:'Galeria ' + i, city: i < 5 ? 'Lisbon' : 'Paris',
    segment:'gallery', rank: 3 - (i % 3), email:'g' + i + '@x.test', site:'x.test' })),
  due_followup: 2,
  applications: [{ id:'a1', kind:'gallery', name:'Galeria da Porta', city:'Lisbon', email:'porta@x.test',
    link:'https://x.test', word:'We show three painters who work on leather.', status:'new', created_at:'2026-11-12' }],
  recent: [{ name:'Galeria 0', city:'Lisbon', kind:'first', ok:true, error:'', at:'2026-11-12T09:00:00Z' },
           { name:'Galeria 1', city:'Lisbon', kind:'first', ok:false, error:'invalid address', at:'2026-11-12T09:01:00Z' }],
  templates: [{ slug:'gallery_first', subject:'One gallery per city — {{city}}', body:'Hello,\n\nWe are opening {{city}} with one partner gallery. We would like it to be {{name}}.\n\nWah' },
              { slug:'hotel_first', subject:'Something your guests cannot buy — {{city}}', body:'Hello,\n\nFor {{name}} in {{city}}.\n\nWah' }],
};
let ADDED = null, MARKED = null, SAVED = null, SENT = null;
const rpc = {
  outreach_board: () => BOARD,
  outreach_add: b => { ADDED = b.p_rows; return { ok:true, added: b.p_rows.length }; },
  outreach_application_mark: b => { MARKED = b; return { ok:true }; },
  outreach_template_set: b => { SAVED = b; return { ok:true }; },
};
const tables = { profiles: [{ pseudo:'Vallerand' }] };
const functions = { atelier: b => { SENT = b; return b.action === 'send' ? { ok:true, claimed:9, sent:9, failed:[] } : { ok:true, to:'wah@example.test' }; } };

// ══ /atelier — LA PAGE QU'ON MET DANS UN EMAIL ════════════════════════
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique',
    rpc, tables, functions, session:false });
  let APPLY = null;
  pg.on('request', r => { if(r.url().includes('/functions/v1/atelier')) { try{ APPLY = JSON.parse(r.postData() || '{}'); }catch(_){} } });
  await pg.goto('https://www.higher.boutique/atelier');
  await pg.waitForFunction(() => window.__totehm_atelier);
  const txt = await pg.evaluate(() => document.body.textContent.replace(/\s+/g, ' '));
  ok(/55 %/.test(txt) && /20 %/.test(txt) && /770/.test(txt) && /2 000/.test(txt)
     && /6 months/.test(txt) && /2 weeks/.test(txt),
    'la page dit les chiffres qui font dire oui : 55 · 20 · 770 · 2 000 · 6 mois · 2 semaines');
  ok(/one gallery per city/i.test(txt) && /Not affiliated/i.test(txt),
    'une seule galerie par ville, et l\'indépendance est écrite');
  // ⚠️ RIEN QUI NE SOIT VRAI : pas de nom emprunté, pas de « en pourparler avec ».
  ok(!/in talks|in discussion|partnership with (Herm|Louis|Gucci)|official partner/i.test(txt),
    '12/11 · aucune phrase qui emprunte un nom : la page ne dit que des choses vraies');
  // Les deux portes changent les mots, pas le formulaire.
  const p1 = await pg.getAttribute('#f-name', 'placeholder');
  await pg.click('#d-artist');
  const p2 = await pg.getAttribute('#f-name', 'placeholder');
  ok(/gallery/i.test(p1) && /your name/i.test(p2) && (await pg.evaluate(() => window.__totehm_atelier().kind)) === 'artist',
    'deux portes, un seul formulaire : seuls les mots changent');
  await pg.click('#d-gallery');
  // Rien de bancal ne part.
  await pg.click('#go');
  ok(/your name/i.test(await pg.textContent('#note')) && !APPLY, 'sans nom, rien ne part');
  await pg.fill('#f-name', 'Galeria da Porta');
  await pg.fill('#f-city', 'Lisbon');
  await pg.fill('#f-email', 'pas-un-email');
  await pg.click('#go');
  ok(/email/i.test(await pg.textContent('#note')) && !APPLY, 'sans email valable, rien ne part');
  await pg.fill('#f-email', 'porta@example.test');
  await pg.fill('#f-link', 'https://galeriadaporta.test');
  await pg.fill('#f-word', 'Three painters who work on leather.');
  await pg.click('#go');
  await pg.waitForFunction(() => window.__totehm_atelier().sent);
  ok(APPLY && APPLY.action === 'apply' && APPLY.kind === 'gallery' && APPLY.name === 'Galeria da Porta'
     && APPLY.city === 'Lisbon' && APPLY.email === 'porta@example.test' && APPLY.website === '',
    'une candidature part entière, et le pot de miel part VIDE ' + JSON.stringify({ k: APPLY?.kind, pot: APPLY?.website }));
  ok(/48 hours/i.test(await pg.textContent('#note')) && (await pg.inputValue('#f-name')) === '',
    'la page remercie et se vide — on ne renvoie pas deux fois la même candidature');
  await pg.screenshot({ path: OUT + '/atelier.png', fullPage: true });
  log.errors = log.errors.filter(e => !/404|Failed to load/.test(e));
  ok(!log.errors.length, 'atelier : aucune erreur ' + log.errors.join(' | '));
}

// ══ /conquer — LE COCKPIT ═════════════════════════════════════════════
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, functions });
  await pg.goto('https://www.higher.boutique/conquer');
  await pg.waitForFunction(() => window.__totehm_conquer && window.__totehm_conquer().admin);
  const d = await pg.evaluate(() => window.__totehm_conquer());
  ok(d.cities === 2 && d.won === 1 && d.due === 2 && d.apps === 1, 'le cockpit lit tout d\'une seule traite ' + JSON.stringify(d));
  // LE SEUL COMPTEUR QUI COMPTE : des villes, pas des emails.
  const hero = await pg.evaluate(() => ({ n: document.querySelector('#hero b').textContent,
    mot: document.querySelector('#hero span').textContent, rang: document.querySelector('#rank').textContent }));
  ok(hero.n === '1' && /city conquered/.test(hero.mot) && hero.rang === 'FIRST BLOOD',
    '12/11 · le chiffre en gros est une VILLE CONQUISE, et le rang monte avec elles ' + JSON.stringify(hero));
  const villes = await pg.evaluate(() => [...document.querySelectorAll('.city')].map(c => ({
    nom: c.querySelector('.n').textContent, etat: c.querySelector('.st').textContent,
    won: c.classList.contains('is-won'), barre: c.querySelector('.bar i').style.width })));
  ok(villes[0].nom === 'Lisbon' && villes[0].won && villes[0].etat === 'conquered'
     && !villes[1].won && villes[1].etat === 'in progress',
    'la carte dit l\'état de chaque ville ' + JSON.stringify(villes));
  // Les boutons disent ce qu'ils vont faire, et se taisent quand il n'y a rien.
  const btns = await pg.evaluate(() => ({ first: document.querySelector('#b-first').textContent,
    follow: document.querySelector('#b-follow').textContent,
    followOff: document.querySelector('#b-follow').disabled }));
  ok(/Send the next 9/.test(btns.first) && /Follow up · 2/.test(btns.follow) && !btns.followOff,
    'les boutons disent le nombre exact qui partira ' + JSON.stringify(btns));
  // UN TAP = UN LOT, et le serveur fait le reste.
  await pg.click('#b-first');
  await pg.waitForFunction(() => /sent/.test(document.querySelector('#fire-n').textContent));
  ok(SENT && SENT.action === 'send' && SENT.kind === 'first' && SENT.limit === 10,
    'le bouton appelle le serveur, jamais Resend depuis la page ' + JSON.stringify(SENT));
  // Viser une ville : le même bouton, dans la carte.
  SENT = null;
  await pg.click('.city [data-city="Lisbon"]');
  await pg.waitForTimeout(300);
  ok(SENT && SENT.city === 'Lisbon' && SENT.kind === 'first', 'une ville se vise depuis sa carte');
  // La relance.
  SENT = null;
  await pg.click('#b-follow');
  await pg.waitForTimeout(300);
  ok(SENT && SENT.kind === 'followup', 'la relance est un geste à part');
  // Ajouter des prospects : on colle, on range.
  await pg.click('#d-add summary');
  await pg.selectOption('#a-segment', 'hotel');
  await pg.selectOption('#a-rank', '3');
  await pg.fill('#a-rows', 'Hotel Un ; Lisbon ; un@x.test ; un.test\nHotel Deux ; Lisbon ; deux@x.test\n\n');
  await pg.click('#b-add');
  await pg.waitForFunction(() => /added/.test(document.querySelector('#add-n').textContent));
  ok(ADDED && ADDED.length === 2 && ADDED[0].segment === 'hotel' && ADDED[0].rank === 3
     && ADDED[0].name === 'Hotel Un' && ADDED[0].city === 'Lisbon' && ADDED[1].email === 'deux@x.test',
    'une liste collée se range en prospects ' + JSON.stringify(ADDED && ADDED[0]));
  // Les candidatures, et les mots.
  await pg.click('[data-keep="a1"]');
  await pg.waitForTimeout(250);
  ok(MARKED && MARKED.p_id === 'a1' && MARKED.p_status === 'kept', 'une candidature se garde d\'un tap');
  await pg.click('#d-words summary');
  const mots = await pg.evaluate(() => ({ slug: document.querySelector('#w-slug').value,
    sujet: document.querySelector('#w-subject').value, corps: document.querySelector('#w-body').value.length }));
  ok(mots.slug === 'gallery_first' && /One gallery per city/.test(mots.sujet) && mots.corps > 30,
    'les mots se lisent et se changent sans déployer ' + JSON.stringify({ s: mots.slug }));
  await pg.fill('#w-subject', 'One gallery in {{city}}');
  await pg.click('#b-words');
  await pg.waitForFunction(() => /saved/.test(document.querySelector('#words-n').textContent));
  ok(SAVED && SAVED.p_slug === 'gallery_first' && SAVED.p_subject === 'One gallery in {{city}}',
    'les mots partent en base, pas dans le code');
  await pg.screenshot({ path: OUT + '/conquer.png', fullPage: true });
  log.errors = log.errors.filter(e => !/404|Failed to load/.test(e));
  ok(!log.errors.length, 'conquer : aucune erreur ' + log.errors.join(' | '));
}

// ══ LA PORTE — le cockpit ne s'ouvre pas à n'importe qui ══════════════
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique',
    rpc: { ...rpc, outreach_board: () => ({ error:'forbidden' }) }, tables, functions });
  await pg.goto('https://www.higher.boutique/conquer');
  await pg.waitForFunction(() => /not an administrator/.test(document.querySelector('#gate-n').textContent));
  const vu = await pg.evaluate(() => ({ board: document.querySelector('#board').classList.contains('hide'),
    gate: !document.querySelector('#gate').classList.contains('hide'),
    rien: !document.querySelector('.city') && !document.querySelector('[data-city]') }));
  ok(vu.board && vu.gate && vu.rien, 'un compte qui n\'est pas administrateur ne voit RIEN ' + JSON.stringify(vu));
  log.errors = log.errors.filter(e => !/404|Failed to load/.test(e));
  ok(!log.errors.length, 'porte : aucune erreur ' + log.errors.join(' | '));
}
await browser.close();
