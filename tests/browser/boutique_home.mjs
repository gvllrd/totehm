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
ok(d.build === '2026-10-30-main' && d.decode_first && !d.member_window, 'the physical landing page: DECODE first, no member window here');
// 30/10 (Wah) : « la face verso du [Higher] doit avoir EXACTEMENT les mêmes
// perforations que la face recto — logique, on retourne la même pièce ». Donc
// UN SEUL masque dans le document, et les deux faces le référencent.
const piece = await pg.evaluate(() => {
  const m = [...document.querySelectorAll('mask')].filter(x => x.id === 'hmask');
  const faces = [...document.querySelectorAll('#slogan use')].map(u => u.getAttribute('href'));
  const refs = [...document.querySelectorAll('symbol#higher-slogan rect, symbol#higher-dos rect')].map(r => r.getAttribute('mask'));
  const f = document.querySelector('.hi-front svg').getBoundingClientRect();
  const b = document.querySelector('#sl-dos').getBoundingClientRect();
  return { masques: m.length, trous: m[0] ? m[0].querySelectorAll('circle').length : 0,
    faces: faces.join(','), refs: refs.join(','),
    memeBoite: Math.abs(f.width - b.width) < 1 && Math.abs(f.height - b.height) < 1,
    ratio: +(b.width / b.height).toFixed(2) };
});
ok(piece.masques === 1 && piece.trous === 18 && piece.faces === '#higher-slogan,#higher-dos'
   && piece.refs === 'url(#hmask),url(#hmask)' && piece.memeBoite && piece.ratio === 3,
  '30/10 · une seule pièce : les deux faces partagent LE MÊME masque (18 trous) et la même boîte ' + JSON.stringify(piece));
// 27/10 (Wah) : « au format NORMAL, comme ses homologues ».
const deco = await pg.evaluate(() => { const d = getComputedStyle(document.querySelector('#decode-btn')),
  a = getComputedStyle(document.querySelector('a[href="streetwear.html"]'));
  return { bord: d.borderImageSource, fond: d.backgroundColor, meme: d.backgroundColor === a.backgroundColor && d.fontSize === a.fontSize }; });
ok(deco.bord === 'none' && deco.meme, 'Decode est un bouton comme les autres ' + JSON.stringify(deco));
ok(!(await pg.$('.seam')) && !/one seam/i.test(await pg.textContent('body')), 'the landing page is bare again: no seam drawing, no caption');
// 27/10 (Wah) : le Higher se retourne SUR PLACE, et le nom s'écrit À SON DOS.
await pg.click('#decode-btn');
await pg.waitForFunction(() => document.activeElement === document.querySelector('#decode-q'));
await pg.waitForTimeout(760);
const dec = await pg.evaluate(() => { const i = document.querySelector('#decode-q'), s = getComputedStyle(i);
  const sl = document.querySelector('#slogan'), r = sl.getBoundingClientRect();
  return { col: s.color, focus: document.activeElement === i, v: i.value, caret: i.selectionStart,
    dos: sl.classList.contains('is-back'), pose: sl.classList.contains('is-flat'),
    dans: (() => { const b = i.getBoundingClientRect();
      return b.top >= r.top - 1 && b.bottom <= r.bottom + 1 && b.left >= r.left - 1; })(),
    papier: !!document.querySelector('#sl-dos use[href="#higher-dos"]'),
    ecrit: document.querySelector('#hi').classList.contains('is-ecrit'),
    plein: document.querySelector('#hb').classList.contains('is-on'),
    large: Math.round(r.width) };
});
ok(dec.focus && dec.v === '0.' && dec.caret === 2 && /251, 213, 202/.test(dec.col) && dec.dos && dec.pose
   && dec.dans && dec.papier && dec.ecrit && !dec.plein && dec.large < 260,
  '27/10 · le Higher se retourne SUR PLACE : le nom s\'écrit à son DOS (le même papier perforé), et rien ne passe en plein écran ' + JSON.stringify(dec));
await pg.screenshot({ path: OUT + '/bq_dos.png' });
await pg.reload(); await pg.waitForFunction(() => window.__totehm_boutique && /47 pieces left/.test(document.querySelector('#sw-col-sold').textContent));
ok(await pg.locator('a[data-space][href="https://www.totehm.space/"]').count()===1 && await pg.locator('#higher-btn,#lisbon-btn,a[href="/market"],a[href="/origins"]').count()===0,'digital art has one explicit SPACE destination; the physical homepage keeps its Cloth paths');
ok(d.collab && d.logos === 0 && d.luxury_link, 'Totehm x Champion 2026 under Create, written, no logo');
ok(d.branding_space && d.club_links === 0 && !(await pg.$('a[href="https://www.totehm.space/"].btn-sig:not(#brand-btn)')),
  '27/10 · [Digital art · SPACE] est parti ; le branding mène DIRECTEMENT à totehm.space');
const order = await pg.evaluate(() => { const a = document.querySelector('a[href="streetwear.html"]').getBoundingClientRect().top, c = document.querySelector('#collab').getBoundingClientRect().top, l = document.querySelector('a[href="/luxury"]').getBoundingClientRect().top; return a < c && c < l; });
ok(order, 'the collection sits under [Create my Totehm Streetwear Cloth], above Luxury');
await pg.screenshot({ path: OUT + '/bq_landing.png' });
await pg.click('#decode-btn');
await pg.waitForFunction(() => document.activeElement === document.querySelector('#decode-q'));
await pg.waitForTimeout(700);   // le Higher finit de tourner : à 90° il n'a plus de largeur
for(const [name, re, lvl] of [['0.hill', /Run the hill/, 'member'], ['0.lock', /reserved/, 'locked'], ['0.old', /I stay higher/, 'full']]){
  await pg.fill('#decode-q', name); await pg.press('#decode-q', 'Enter');
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
await pg.fill('#decode-q', '0.none'); await pg.press('#decode-q', 'Enter');
await pg.waitForFunction(() => /no Totehm Cloth/.test(document.querySelector('#dc-note').textContent));
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
  await pg.click('#hi');
  await pg.waitForFunction(() => window.__totehm_boutique().higher.pret);
  await pg.waitForFunction(() => document.querySelectorAll('#hb-cloths .hb-row').length === 1);
  await pg.waitForTimeout(400);
  const t = await pg.evaluate(() => ({
    onglet: window.__totehm_boutique().higher.onglet,
    pseudo: document.querySelector('#hb-nom').textContent.trim(),
    dos: document.querySelector('#sl-name').textContent.trim(),
    rien: !document.querySelector('#hb input'),
    plein: (() => { const b = document.querySelector('#hb-bg').getBoundingClientRect();
      return b.width >= innerWidth && b.height >= innerHeight; })(),
    rang: (() => { const b = [...document.querySelectorAll('#hb-tabs button')].map(e => Math.round(e.getBoundingClientRect().top));
      return b.every(y => y === b[0]); })(),
    cloth: document.querySelector('#hb-cloths .hb-row').textContent.replace(/\s+/g, ' ').trim(),
    luxVisible: document.querySelector('#hb-luxury').offsetParent !== null,
    coral: getComputedStyle(document.querySelector('#hb-cloths .hb-row b')).color }));
  ok(t.pseudo === 'Vallerand' && t.dos === 'Vallerand' && t.rien && t.plein,
    '27/10 · le tableau vient du Higher RETOURNÉ, en plein écran : il porte le PSEUDO, jamais une recherche ' + JSON.stringify({p:t.pseudo,d:t.dos,r:t.rien,pl:t.plein}));
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
// ══ 30/10 · ON LE TOURNE À LA MAIN — à la souris ET au doigt ═══════════════
// Wah : « on doit pouvoir tourner le [Higher] sur mobile et ordinateur
// exactement comme le totehm sur totehm.com dans la vue centrale ».
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, functions, session:true, network:geo });
  await pg.goto('https://www.higher.boutique/');
  await pg.waitForFunction(() => window.__totehm_boutique);
  const boite = await pg.evaluate(() => { const r = document.querySelector('#hi').getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width) }; });
  // LA SOURIS : on prend la pièce et on la tourne. Un quart de tour suffit.
  await pg.mouse.move(boite.x, boite.y);
  await pg.mouse.down();
  const angles = [];
  for(let i = 1; i <= 10; i++){
    await pg.mouse.move(boite.x + i * 18, boite.y);
    angles.push(await pg.evaluate(() => { const m = getComputedStyle(document.querySelector('#slogan')).transform;
      return m === 'none' ? 0 : 1; }));
  }
  const tenu = await pg.evaluate(() => ({ suit: getComputedStyle(document.querySelector('#slogan')).transform,
    tenue: document.querySelector('#hi').classList.contains('tenu'),
    libre: !document.querySelector('#slogan').classList.contains('is-flat') }));
  ok(angles.every(a => a === 1) && /matrix3d/.test(tenu.suit) && tenu.tenue && tenu.libre,
    '30/10 · à la souris, la pièce SUIT la main pendant le geste (et le curseur dit qu\'on la tient)');
  await pg.mouse.up();
  await pg.waitForFunction(() => window.__totehm_boutique().higher.ouvert, null, { timeout:4000 });
  await pg.waitForTimeout(900);
  const pose = await pg.evaluate(() => ({ face: window.__totehm_boutique().higher.face,
    mode: window.__totehm_boutique().higher.mode,
    plat: document.querySelector('#slogan').classList.contains('is-flat'),
    dos: document.querySelector('#slogan').classList.contains('is-back'),
    net: getComputedStyle(document.querySelector('#slogan')).transform,
    plein: document.querySelector('#hb').classList.contains('is-open') }));
  ok(pose.face === 1 && pose.mode === 'board' && pose.plat && pose.dos && pose.net === 'none' && pose.plein,
    '30/10 · un quart de tour à la main le POSE sur son dos et ouvre MON TABLEAU — posé, aucune transformation ne reste ' + JSON.stringify(pose));
  await pg.screenshot({ path: OUT + '/bq_tourne.png' });
  // LE DOIGT : le même geste, en tactile — et il referme en revenant sur sa face.
  await pg.click('#hb-x');
  await pg.waitForFunction(() => !window.__totehm_boutique().higher.ouvert);
  await pg.waitForTimeout(900);
  const t2 = await pg.evaluate(() => ({ face: window.__totehm_boutique().higher.face,
    plat: document.querySelector('#slogan').classList.contains('is-flat') }));
  ok(t2.face === 0 && t2.plat, 'refermé, il revient sur sa face, posé');
  await pg.touchscreen.tap(boite.x, boite.y).catch(() => {});
  const doigt = await pg.evaluate(async b => {
    const hi = document.querySelector('#hi');
    const env = (t, x) => hi.dispatchEvent(new PointerEvent(t, { pointerId:1, pointerType:'touch', isPrimary:true,
      clientX:x, clientY:b.y, bubbles:true, cancelable:true, button:0 }));
    env('pointerdown', b.x);
    for(let i = 1; i <= 10; i++){ env('pointermove', b.x + i * 18); await new Promise(f => requestAnimationFrame(f)); }
    const suit = getComputedStyle(document.querySelector('#slogan')).transform;
    env('pointerup', b.x + 180);
    return { suit, tactile: getComputedStyle(hi).touchAction };
  }, boite);
  await pg.waitForFunction(() => window.__totehm_boutique().higher.ouvert, null, { timeout:4000 });
  ok(/matrix3d/.test(doigt.suit) && doigt.tactile === 'none',
    '30/10 · au doigt, le même geste tourne la pièce : le rouleau de la page ne la vole pas (touch-action:none)');
  ok(!log.errors.length, 'le geste du Higher : aucune erreur ' + log.errors.join(' | '));
  await pg.context().close();
}
await browser.close();
