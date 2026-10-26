// higher.boutique — la page d'atterrissage et la page d'un Cloth décodé (08/10/2026). Zéro réseau.
// LANCER : node boutique_home.mjs /tmp
import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '.';
const browser = await launch();
const CLOTHS = {
  '0.hill': { found:true, name:'0.Hill', legacy:false, level:'member', line:'streetwear', view:'habits', created_at:'2026-10-05', palette:['#E24B4A'], text:'Run the hill',
              is:['fight'], owner:'nia', matter:null, garment:'Higher Champion Sweatshirt', size:'L', style:'Ink Realism', stage:'making', edition:3, edition_of:177, art:false },
  '0.lock': { found:true, name:'0.Lock', legacy:false, level:'locked', line:'streetwear', view:'wisdom', created_at:'2026-10-05', palette:null, text:null, is:null, owner:null, matter:null,
              garment:'Higher Champion Sweatshirt', size:null, style:'Ink Realism', stage:'production', edition:1, edition_of:177, art:false },
  '0.old':  { found:true, name:'0.Old', legacy:true, level:'full', message:'I stay higher', created_at:'2026-09-01' },
  '0.sea':  { found:true, name:'0.Sea', legacy:false, level:'full', line:'streetwear', view:'visions', created_at:'2026-10-06', palette:['#1D9E75'], text:'A studio by the sea',
              is:['express'], owner:'wah', matter:{ objectives:[{ text:'Save 10k' }] }, garment:'Higher Champion Sweatshirt', size:'M', style:'Analog Grain', stage:'shipped', edition:2, edition_of:177, art:true, mine:true },
};
const BOARD = { signed_in:true, pseudo:'Vallerand',
  cloths:[{ name:'0.Sea', stage:'shipped', size:'M', price:170, garment:'Higher Champion Sweatshirt', at:'2026-10-06',
            tracking:'https://track.test/1', test:false, art:true, text:'A studio by the sea', view:'visions' }],
  luxury:[{ name:'0.Bag', status:'quoted', brand:'Hermès', piece:'bag', cents:50000, currency:'eur', at:'2026-10-24', text:'Slow is smooth' }] };
const SHOTS = [{ kind:'media', id:'em1', bucket:'element-media', path:'u/m-1.jpg', txt:'sea.jpg' },
               { kind:'spot',  id:'sp1', bucket:'moments',       path:'u/s-1.jpg', txt:'the hill' }];
const rpc = { reveal_cloth: b => CLOTHS[String(b.p_name).toLowerCase()] || { found:false },
              my_boutique_board: () => BOARD, cloth_shots: () => SHOTS };
const tables = { totehm_cloth_support: [{ max_pieces:50, claimed:3 }], profiles: [{ pseudo:'Vallerand' }], subscribers: [] };
const ART = [];
const functions = { 'cloth-art': b => { ART.push(b.name); return { url:'https://abujjbkbbiumxrokozph.supabase.co/storage/v1/object/sign/streetwear-generations/x/final.png?token=t' }; } };
const geo = url => url.pathname === '/api/geo' ? { status:200, contentType:'application/json', body:'{"country":"FR","lisbon":false}' } : null;
const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, functions, session:false, network:geo });
await pg.goto('https://www.higher.boutique/');
await pg.waitForFunction(() => window.__totehm_boutique && /47 pieces left/.test(document.querySelector('#sw-col-sold').textContent));
const d = await pg.evaluate(() => window.__totehm_boutique());
ok(d.build === '2026-10-26-higher' && d.decode_first && !d.member_window, 'the physical landing page: DECODE first, no member window here');
ok((await pg.$eval('#decode-btn', b => getComputedStyle(b).borderImageSource)).includes('svg') && (await pg.$eval('#decode-btn', b => getComputedStyle(b).backgroundColor)) === 'rgb(51, 51, 102)',
  'Decode is the perforated navy BOX, always — not only on hover');
ok(!(await pg.$('.seam')) && !/one seam/i.test(await pg.textContent('body')), 'the landing page is bare again: no seam drawing, no caption');
// 26/10 — LE HIGHER SE RETOURNE : la recherche est DEDANS, le « 0. » déjà posé.
await pg.click('#decode-btn');
await pg.waitForFunction(() => document.activeElement === document.querySelector('#hb-q'));
await pg.waitForTimeout(500);
const dec = await pg.evaluate(() => { const i = document.querySelector('#hb-q'), s = getComputedStyle(i), r = i.getBoundingClientRect();
  const sl = getComputedStyle(document.querySelector('.slogan')).transform, bg = document.querySelector('#hb-bg');
  return { px: Math.round(parseFloat(s.fontSize)), col: s.color, focus: document.activeElement === i, v: i.value,
    caret: i.selectionStart, centre: Math.abs((r.left + r.right) / 2 - innerWidth / 2), retourne: sl,
    navy: /333366|%2333366/.test(getComputedStyle(bg).backgroundImage), zoom: getComputedStyle(bg).transform,
    pret: document.querySelector('#hb').classList.contains('is-pret'),
    tabs: [...document.querySelectorAll('#hb-tabs button')].map(b => b.textContent.trim()).join(','),
    btn: Math.round(document.querySelector('#decode-btn').getBoundingClientRect().height) }; });
ok(dec.px >= 26 && dec.focus && dec.v === '0.' && dec.caret === 2 && dec.centre < 2 && /251, 213, 202/.test(dec.col)
   && /matrix3d|matrix\(-1/.test(dec.retourne) && dec.navy && !/matrix\(0\.03/.test(dec.zoom) && dec.pret
   && dec.tabs === 'My cloths,My luxury,My account' && dec.btn < 60,
  '26/10 · le Higher se RETOURNE : le navy perforé grandit, la recherche est dedans avec le « 0. » et le curseur derrière, et les onglets sont là ' + JSON.stringify(dec));
await pg.reload(); await pg.waitForFunction(() => window.__totehm_boutique && /47 pieces left/.test(document.querySelector('#sw-col-sold').textContent));
ok(await pg.locator('a[data-space][href="https://www.totehm.space/"]').count()===1 && await pg.locator('#higher-btn,#lisbon-btn,a[href="/market"],a[href="/origins"]').count()===0,'digital art has one explicit SPACE destination; the physical homepage keeps its Cloth paths');
ok(d.collab && d.logos === 0 && d.luxury_link, 'Totehm x Champion 2026 under Create, written, no logo');
ok(d.branding_com && d.club_links === 0, 'Experience our dope branding → totehm.com');
const order = await pg.evaluate(() => { const a = document.querySelector('a[href="streetwear.html"]').getBoundingClientRect().top, c = document.querySelector('#collab').getBoundingClientRect().top, l = document.querySelector('a[href="/luxury"]').getBoundingClientRect().top; return a < c && c < l; });
ok(order, 'the collection sits under [Create my Totehm Streetwear Cloth], above Luxury');
await pg.screenshot({ path: OUT + '/bq_landing.png' });
await pg.click('#decode-btn');
await pg.waitForFunction(() => document.activeElement === document.querySelector('#hb-q'));
for(const [name, re, lvl] of [['0.hill', /Run the hill/, 'member'], ['0.lock', /reserved/, 'locked'], ['0.old', /I stay higher/, 'full']]){
  await pg.fill('#hb-q', name); await pg.press('#hb-q', 'Enter');
  await pg.waitForFunction(n => document.querySelector('#decode-fs').classList.contains('show') && window.__totehm_boutique().decode, name);
  ok(re.test(await pg.textContent('#decode-msg')) && (await pg.evaluate(() => window.__totehm_boutique().decode.level)) === lvl, 'decode ' + lvl + ': reveal_cloth');
  if(lvl === 'member'){
    const t = await pg.evaluate(() => { const k = [...document.querySelector('#decode-msg').children].map(e => e.className);
      const el = document.querySelector('.dc-el').getBoundingClientRect(), nm = document.querySelector('.dc-name').getBoundingClientRect();
      return { order:k.join(','), wide: el.width >= nm.width, bg: getComputedStyle(document.querySelector('.dc-el')).backgroundColor }; });
    ok(t.order.startsWith('dc-name,dc-meta,dc-el') && t.wide && /51, 51, 102/.test(t.bg), 'the element comes first, full width, in its view colour (habit navy)');
    const txt = await pg.textContent('#decode-msg');
    ok(/No\. 3 \/ 177/.test(txt) && /Higher Champion Sweatshirt · L/.test(txt) && /Ink Realism/.test(txt) && /in the making/i.test(txt) && /nia/.test(txt), 'every detail: edition, cloth, size, style, owner, stage');
    ok(/lands with the cloth/.test(txt) && !ART.length, 'not shipped: the artwork stays a surprise, cloth-art not called');
    ok(/decode=0\.Hill/.test(pg.url()), 'the address follows the decoded cloth (shareable)');
    ok(!/\bbox\b/i.test(txt), 'on screen: "element", never "box"');
    ok(!(await pg.$('#decode-msg .dc-pal, #decode-msg [style*="#E24B4A"] i')), 'no colour palette on the cloth page (Wah, 08/10 bis)');
    await pg.screenshot({ path: OUT + '/bq_decode_member.png' });
  }
  if(lvl === 'locked'){
    ok(!/Run the hill/.test(await pg.textContent('#decode-msg')) && await pg.isVisible('#decode-msg [data-eco-connect]'), 'decode locked: no element text, CONNECT WITH MY TOTEHM');
    ok(/in production/i.test(await pg.textContent('#decode-msg')) && /my wisdom/i.test(await pg.textContent('.dc-el')), 'locked still says the view, the cloth and the stage');
  }
  await pg.click('#decode-back');
  ok(!/decode=/.test(pg.url()), 'Back in Time clears the address');
}
await pg.fill('#hb-q', '0.none'); await pg.press('#hb-q', 'Enter');
await pg.waitForFunction(() => /no Totehm Cloth/.test(document.querySelector('#hb-note').textContent));
ok(true, 'decode unknown: said');
ok(!log.errors.length, 'no page error: ' + log.errors.join(' | '));

// Le lien direct d'une pièce expédiée : la page s'ouvre, l'œuvre se montre.
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, functions, session:false, network:geo });
  await pg.goto('https://www.higher.boutique/?decode=0.sea');
  await pg.waitForFunction(() => document.querySelector('#decode-fs').classList.contains('show') && document.querySelector('#dc-art img'));
  const txt = await pg.textContent('#decode-msg');
  ok(ART.includes('0.Sea') && /A studio by the sea/.test(txt) && /Save 10k/.test(txt) && /shipped/i.test(txt), 'shipped: the artwork shows (cloth-art), with the element, its matter and the stage');
  ok(/36, 49, 140|54, 73, 140/.test(await pg.evaluate(() => getComputedStyle(document.querySelector('.dc-el')).backgroundColor)), 'a vision wears light blue');
  ok(!log.errors.length, 'deep link: no page error ' + log.errors.join(' | '));
  await pg.screenshot({ path: OUT + '/bq_decode_shipped.png', fullPage:true });
}
// ══ 26/10 · LE TABLEAU DE BORD DU HIGHER — mes pièces, mes projets, mon compte ══
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, functions, session:true, network:geo });
  await pg.goto('https://www.higher.boutique/');
  await pg.waitForFunction(() => window.__totehm_boutique);
  await pg.click('#decode-btn');
  await pg.waitForFunction(() => window.__totehm_boutique().higher.pret);
  await pg.waitForFunction(() => document.querySelectorAll('#hb-cloths .hb-row').length === 1);
  await pg.waitForTimeout(400);
  const t = await pg.evaluate(() => ({
    onglet: window.__totehm_boutique().higher.onglet,
    rang: (() => { const b = [...document.querySelectorAll('#hb-tabs button')].map(e => Math.round(e.getBoundingClientRect().top));
      return b.every(y => y === b[0]); })(),
    cloth: document.querySelector('#hb-cloths .hb-row').textContent.replace(/\s+/g, ' ').trim(),
    luxVisible: document.querySelector('#hb-luxury').offsetParent !== null,
    coral: getComputedStyle(document.querySelector('#hb-cloths .hb-row b')).color }));
  ok(t.onglet === 'cloths' && t.rang && /0\.Sea/.test(t.cloth) && /Higher Champion Sweatshirt · M · 2026-10-06/.test(t.cloth)
     && /shipped/.test(t.cloth) && /track it/.test(t.cloth) && !t.luxVisible && /251, 213, 202/.test(t.coral),
    '26/10 · onglet MY CLOTHS : les trois onglets sur UNE rangée, ma pièce, son vêtement, son état, son suivi — le nom en Coral');
  await pg.screenshot({ path: OUT + '/bq_higher.png' });
  await pg.click('#hb-tabs button[data-hb-tab="luxury"]');
  await pg.waitForFunction(() => window.__totehm_boutique().higher.onglet === 'luxury');
  ok(/Hermès · bag/.test(await pg.textContent('#hb-luxury')) && /deposited/.test(await pg.textContent('#hb-luxury'))
     && !(await pg.evaluate(() => document.querySelector('#hb-cloths').offsetParent !== null)),
    'onglet MY LUXURY : le projet déposé, et les pièces s\'effacent');
  await pg.click('#hb-tabs button[data-hb-tab="account"]');
  await pg.waitForFunction(() => window.__totehm_boutique().higher.onglet === 'account');
  ok(/Vallerand/.test(await pg.textContent('#hb-account')) && /my totehm/i.test(await pg.textContent('#hb-account'))
     && /sign out/i.test(await pg.textContent('#hb-account')), 'onglet MY ACCOUNT : mon nom, mon TOTEHM, me déconnecter');
  // Un tap sur « decode it » décode la pièce depuis le tableau, et montre MES photos.
  await pg.click('#hb-tabs button[data-hb-tab="cloths"]');
  await pg.click('#hb-cloths .hb-row [data-hb-decode]');
  await pg.waitForFunction(() => document.querySelector('#decode-fs').classList.contains('show'));
  await pg.waitForSelector('#dc-shots figure');
  const ph = await pg.evaluate(() => { const l = [...document.querySelectorAll('#dc-shots figure')];
    return { n: l.length, m: l[0].classList.contains('m'), lieu: (l[1].querySelector('figcaption') || {}).textContent || '',
      mat: document.querySelector('.dc-mat') ? document.querySelector('.dc-mat').textContent.trim() : '' }; });
  ok(ph.n === 2 && ph.m && ph.lieu === 'the hill' && ph.mat === 'Save 10k',
    '26/10 · Decode montre TOUT ce qui a été sélectionné : les mini-boxes allumées et mes photos ' + JSON.stringify(ph));
  await pg.screenshot({ path: OUT + '/bq_decode_mine.png' });
  ok(!log.errors.length, 'le Higher retourné : aucune erreur ' + log.errors.join(' | '));
  await pg.context().close();
}
await browser.close();
