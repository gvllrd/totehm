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
  totehm_complete: { complete:true, remplies:5, habits:true, objectives:true, repulsions:true, wisdom:true, visions:true },
  my_trips: { trips:[{ id:'o1', text:'Marathon in May', is:['flow'], days_left:200, habits:[{ t:'Run the hill', f:'every_morning', i:'fight' }] }],
              reps:[{ id:7, text:'Scrolling at night', is:['focus'] }], loose:[{ t:'Cold shower', f:'every_morning', i:'fight' }],
              wisdom:[{ id:'w1', text:'Slow is smooth', is:['focus'] }], visions:[{ id:'v1', text:'A studio by the sea', is:['express'] }] },
  my_box_matter: b => ({
    vision:   { text:'A studio by the sea', view:'visions',    palette:['#1D9E75'], matter:{ objectives:[{ text:'Save 10k' }] }, extra:{} },
    habit:    { text:b.p_ref,               view:'habits',     palette:['#E24B4A'], matter:{ objectives:[{ text:'Marathon in May' }] }, extra:{ freq:'every_morning' } },
    objective:{ text:'Marathon in May',     view:'objectives', palette:['#e48b31'], matter:{ habits:[{ text:'Run the hill' }] }, extra:{} },
    repulsion:{ text:'Scrolling at night',  view:'repulsions', palette:['#378ADD'], matter:{ habits:[{ text:'Cold shower' }] }, extra:{} },
  })[b.p_kind] || { text:'Slow is smooth', view:'wisdom', palette:['#378ADD'], matter:{ objectives:[{ text:'Marathon in May' }] }, extra:{ freq:'every_morning' } },
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
ok(d.build === '2026-10-24-my-boxes' && d.stage === 'cloth' && !d.papers && !d.desktop, 'phone: CLOTH first, the TOTEHM still folded');
const rest = await pg.evaluate(() => { const b = document.querySelector('#cl-facts .left b'); const s = getComputedStyle(b);
  return { n: b.textContent.trim(), px: Math.round(parseFloat(s.fontSize)), col: s.color, txt: document.querySelector('#cl-facts').textContent }; });
ok(/Higher Champion Sweatshirt/.test(await pg.textContent('#cl-title')) && rest.n === '177' && /of 177/.test(rest.txt) && /pieces left/.test(rest.txt),
  'the title and what is left');
ok(rest.px >= 22 && /251, 213, 202/.test(rest.col), 'what is left is READ FIRST: a big coral number ' + rest.px + 'px');
ok(!/€|S · M · L/.test(await pg.textContent('#cl-facts')) && !(await pg.$('#cl-hint')) && !(await pg.$('#concept-btn')) && !(await pg.$('#conn-bar')) && !(await pg.$('#back')),
  'no price, no sizes, no hint, no « how it works », no member corner, no Back');
const lay = await pg.evaluate(() => { const v = document.querySelector('#viewer').getBoundingClientRect(), b = document.querySelector('#totehmize').getBoundingClientRect();
  return { centre: Math.abs((v.left + v.right) / 2 - innerWidth / 2), ctr: Math.abs((b.left + b.right) / 2 - innerWidth / 2), scroll: document.documentElement.scrollWidth - innerWidth, over: Math.round(b.bottom - innerHeight) }; });
ok(lay.centre < 2 && lay.ctr < 2 && lay.scroll <= 0 && lay.over <= 0, 'the cloth and TOTEHMIZE are centered, on one screen (' + lay.centre.toFixed(1) + ' px, ctr ' + lay.ctr.toFixed(1) + ', logo ' + lay.over + ' px from the bottom, scroll ' + lay.scroll + ')');
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
ok(/sold out/i.test(await pg.textContent('#cl-facts')) && await pg.isDisabled('#totehmize'), 'a horizontal swipe: the next cloth (sold out: the TOTEHM is closed)');
await pg.keyboard.press('ArrowLeft');
await pg.waitForFunction(() => window.__totehm_cloth().model === 0 && window.__totehm_cloth().angle === 2);
ok(true, 'back to the first cloth with the keyboard, its view is remembered');
const src = await pg.evaluate(() => [...document.querySelectorAll('.model[data-i="0"] img')].map(i => i.getAttribute('src') || '').join('|'));
ok(/champ\/1-front\.png/.test(src) && /champ\/3-side\.png/.test(src) && !/\.keep/.test(src), 'views = the photos of its Storage folder, in name order');

// ── 2 · ELEMENT : le TOTEHM se décompose en trois papiers (23/10)
await pg.click('#totehmize');
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'element');
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
await pg.goBack();
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'cloth' && !window.__totehm_cloth().melt);
await pg.waitForTimeout(60);
ok((await pg.$eval('#tz-logo', e => +getComputedStyle(e).opacity)) > 0.5 && (await D()).view === null,
  'back: the TOTEHM folds into its logo again');
ok(await pg.isVisible('#viewer') && await pg.isVisible('#totehmize'), 'one single screen: the cloth and the TOTEHM never leave it');
await pg.click('#totehmize');
await pg.waitForFunction(() => window.__totehm_cloth().papers);
await pg.click('.pap-s');
await pg.waitForFunction(() => window.__totehm_cloth().view === 'wisdom');
ok(/Slow is smooth/.test(await pg.textContent('#el-list')) && /my wisdom story/i.test(await pg.textContent('#el-sub')), 'MY WISDOM STORY · what I pass on');
ok((await D()).seam === 1, 'the seam lights the intention of what is on screen (focus)');
await pg.click('#el-list .bx');
// Pas de bouton : le tap EST le choix (comme sur totehm.com), et la box garde sa matière.
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'name');
await pg.waitForFunction(() => !!document.querySelector('#el-list .bx.is-on #matter .mi'));
const matter = await pg.textContent('#matter');
ok(/Marathon in May/.test(matter) && (await D()).open && !(await pg.$('#mt-go')),
  'a tap chooses the element AND keeps its matter open inside the box — no button at all');
ok(!/palette|rhythm|every morning/i.test(matter + await pg.textContent('#el-list')) && !(await pg.$('#matter .pal')), 'no colour palette, no time frequency on screen');
await pg.screenshot({ path: OUT + '/sw_element.png' });

// ── 3 · NAME
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'name');
d = await D();
ok(d.stage === 'name' && d.element === 'wisdom' && d.print === 1, 'NAME: the element is kept (wisdom); the print-zone photo is loaded apart');
await pg.click('#el-list .bx.is-on .nm');
await pg.waitForFunction(() => !document.getElementById('s-element').classList.contains('is-picked'));
ok((await pg.$$eval('#el-list .bx', l => l.filter(b => b.offsetParent).length)) > 0 && (await D()).stage === 'element',
  'a tap on the worn element opens the list again — one can always change one\'s mind');
await pg.click('#el-list .bx');
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'name');
ok(!(await pg.$('#nm-el')) && /Slow is smooth/.test(await pg.textContent('#el-list')) && (await pg.$$eval('#el-list .bx', l => l.filter(b => b.offsetParent).length)) === 1,
  'the chosen element stays alone on screen — never written twice');
ok((await pg.textContent('#nm-prefix')) === '0.' && (await pg.$eval('#nm-field', e => getComputedStyle(e).borderImageSource)).includes('svg')
   && (await pg.$eval('#nm-field', e => getComputedStyle(e).backgroundColor)) === 'rgb(51, 51, 102)', 'the name is typed in the perforated navy BOX');
await pg.fill('#nm-input', 'taken');
await pg.waitForFunction(() => /already taken/.test(document.querySelector('#nm-note').textContent));
ok(NAMES.includes('0.taken') && await pg.isDisabled('#nm-go'), 'availability is checked by the SERVER; a taken name blocks Next');
await pg.fill('#nm-input', '0.Hill Street');
await pg.waitForFunction(() => /available/.test(document.querySelector('#nm-note').textContent));
ok((await pg.inputValue('#nm-input')) === 'hillstreet' && NAMES.includes('0.hillstreet'),
  'the name is an IDENTIFIER: lower case, no space, and a typed "0." is not doubled');
ok(/0 = this collection/i.test(await pg.textContent('#s-name')), 'the 0 says what it is, at the moment it is typed');
const coral = await pg.evaluate(() => getComputedStyle(document.querySelector('#nm-input')).color + '|' + getComputedStyle(document.querySelector('#nm-input')).fontFamily);
ok(/251, 213, 202/.test(coral) && /Quantico/.test(coral), 'the name is Quantico Coral');
await pg.screenshot({ path: OUT + '/sw_name.png' });
await pg.press('#nm-input', 'Enter');

// ── 4 · STYLE
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'style' && document.querySelectorAll('.st-card').length === 2);
const stl = await pg.evaluate(() => { const b = document.querySelector('.st-card[data-id="st1"] span b'); const s = getComputedStyle(b);
  return { n: b.textContent.trim(), px: Math.round(parseFloat(s.fontSize)), col: s.color, out: document.querySelector('.st-card[data-id="st2"] span.out').textContent }; });
ok(stl.n === '7' && stl.px >= 14 && /251, 213, 202/.test(stl.col) && /sold out/i.test(stl.out) && await pg.isDisabled('.st-card[data-id="st2"]'),
  'a style says what is left, in the same big coral figure; a sold-out style is closed ' + JSON.stringify(stl));
await pg.click('.st-card[data-id="st1"]');
await pg.click('#st-go');

// ── 5 · ORDER
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'order');
ok((await pg.$$eval('#od-sizes .sz', b => b.map(x => x.textContent).join(','))) === 'S,M,L,XL,2XL' && await pg.isDisabled('#od-sizes .sz[data-s="XL"]'), 'sizes from Printful, in order; a discontinued one is closed');
ok(await pg.isVisible('#od-test') && /4242/.test(await pg.textContent('#od-test')), 'test mode said on the page');
const pv = await pg.evaluate(() => ({ src: (document.querySelector('#od-visual img.ph') || {}).src || '', extra: document.querySelectorAll('#od-visual *').length, canvas: !!document.querySelector('#od-visual canvas') }));
ok(/1-back-zone\.png$/.test(pv.src) && pv.extra === 1 && !pv.canvas, 'ORDER: the PHOTO of the print zone, nothing simulated over it');
await pg.click('#od-sizes .sz[data-s="L"]');
ok(/Order · 170 €/.test(await pg.textContent('#od-go')) && await pg.isEnabled('#od-go'), 'the order button carries the server price');
await pg.screenshot({ path: OUT + '/sw_order.png' });
await pg.click('#od-go');
await pg.waitForURL(/checkout\.stripe\.test/);
ok(body && body.garment_id === 's1' && body.box.kind === 'wisdom' && body.box.ref === 'w1' && body.name === 'hillstreet' && body.size === 'L' && body.style_id === 'st1',
  'order sends a reference (wisdom) and the name WITHOUT prefix (the server sets 0.)');

// ── Paiement annulé : retour sur ORDER, tous les choix gardés
await pg.goto('https://www.higher.boutique/streetwear?cancel=1');
await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().stage === 'order');
d = await D();
ok(d.named && d.style && d.size && d.element === 'wisdom' && /cancelled/.test(await pg.textContent('#od-note')), 'Stripe cancelled: back on ORDER, name · style · size · element kept');
ok(!/cancel=/.test(pg.url()), 'the ?cancel=1 leaves the address bar');
ok((await pg.$$eval('.stage', l => l.filter(e => e.classList.contains('is-open')).map(e => e.id).join(','))) === 's-cloth,s-element,s-name,s-style,s-order',
  'one screen: every step reached is still there, one under the other');
await pg.goBack();
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'style');
ok(!(await pg.$eval('#s-order', e => e.classList.contains('is-open'))), 'back: the order step is folded away again');

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
    return { vc: Math.round((v.left + v.right) / 2), vis: getComputedStyle(document.getElementById('s-cloth')).visibility, el: r('s-element'), nm: r('s-name'), w: innerWidth }; });
  await pg.goto('https://www.higher.boutique/streetwear');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready);
  await pg.waitForTimeout(150);
  let g = await geo(); let d = await D();
  ok(d.desktop && Math.abs(g.vc - g.w / 2) < 3, 'desktop: the cloth stands in the middle');
  await pg.screenshot({ path: OUT + '/sw_desk_cloth.png' });
  await pg.click('#totehmize');
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'element');
  await pg.waitForTimeout(700);
  g = await geo(); d = await D();
  ok(Math.abs(g.vc - g.w / 2) < 3 && Math.abs((g.el.l + g.el.r) / 2 - g.w / 2) < 3 && g.vis === 'visible',
    'desktop: NO side window — the TOTEHM opens in the same centred column, under the cloth');
  ok(!(await pg.$('#vw-zone')) && !(await pg.$('.pz')), 'no simulated preview anywhere on the cloth');
  await pg.screenshot({ path: OUT + '/sw_desk_papers.png' });
  await pg.click('.pap-s');
  await pg.waitForFunction(() => window.__totehm_cloth().view === 'wisdom');
  await pg.click('#el-list .bx');
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'name');
  await pg.waitForTimeout(600);
  g = await geo(); d = await D();
  ok(Math.abs((g.nm.l + g.nm.r) / 2 - g.w / 2) < 3 && g.vc === (await geo()).vc, 'NAME: still the same column, nothing slides');
  await pg.fill('#nm-input', 'sea');
  await pg.waitForFunction(() => /available/.test(document.querySelector('#nm-note').textContent));
  await pg.click('#nm-go');
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'style' && document.querySelectorAll('.st-card').length === 2);
  await pg.click('.st-card[data-id="st1"]');
  await pg.click('#st-go');
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'order');
  await pg.waitForTimeout(500);
  ok(await pg.isVisible('#od-visual') && (await geo()).vis === 'visible', 'ORDER: the preview and the cloth are both on the page, one under the other');
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
  await pg.click('#totehmize');
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
  const chip = await pg.evaluate(() => { const c = document.getElementById('cl-wear'), t = document.getElementById('totehmize').getBoundingClientRect();
    return { on: !c.classList.contains('hide') && c.getBoundingClientRect().height > 0, txt: c.textContent, bg: getComputedStyle(c).backgroundColor, fits: t.bottom <= innerHeight }; });
  ok(d.stage === 'cloth' && !d.wanted && chip.on && /my wisdom story/i.test(chip.txt) && /Slow is smooth/.test(chip.txt) && /116, 49, 105/.test(chip.bg),
    'from COM: the cloth first, the element already chosen under it (my wisdom story, red-violet)');
  ok(new URL(pg.url()).search === '' && chip.fits, 'the ?wear= leaves the address bar; TOTEHMIZE stays on one screen');
  ok(log.rpc.some(x => x.name === 'my_trips'), 'the element is read again in MY TOTEHM (my_trips), never trusted from the address');
  await pg.screenshot({ path: OUT + '/sw_from_com.png' });
  await pg.click('#totehmize');
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'name');
  ok(/Slow is smooth/.test(await pg.textContent('#el-list')) && /my wisdom story/i.test(await pg.textContent('#el-sub')), 'TOTEHMIZE goes straight to NAME, the element above it');
  await pg.goBack();
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'element');
  ok((await pg.evaluate(() => window.__totehm_cloth().view)) === 'wisdom', 'Back: ELEMENT, on MY STORY (the element can still change)');
  await pg.goForward();
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'name');
  await pg.fill('#nm-input', 'sea');
  await pg.waitForFunction(() => /available/.test(document.querySelector('#nm-note').textContent));
  await pg.press('#nm-input', 'Enter');
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'style' && document.querySelectorAll('.st-card').length === 2);
  await pg.click('.st-card[data-id="st1"]'); await pg.click('#st-go');
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'order');
  await pg.click('#od-sizes .sz[data-s="M"]'); await pg.click('#od-go');
  await pg.waitForURL(/checkout\.stripe\.test/);
  ok(sent && sent.box.kind === 'wisdom' && sent.box.ref === 'w1' && sent.name === 'sea' && sent.size === 'M', 'the order carries the element chosen in COM (wisdom · w1)');
  ok(!log.errors.length, 'from COM: no page error ' + log.errors.join(' | '));
}
// ── 23/10 · n'importe quelle box arrive de COM : une VISION, une HABIT
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, network });
  await pg.goto('https://www.higher.boutique/streetwear?wear=vision:v1');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().element === 'vision');
  ok(/A studio by the sea/.test(await pg.textContent('#cl-wear')) && /vision/i.test(await pg.textContent('#cl-wear')), 'a VISION from COM is worn');
  await pg.goto('https://www.higher.boutique/streetwear?wear=habit:Cold%20shower');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().element === 'habit');
  ok(/Cold shower/.test(await pg.textContent('#cl-wear')) && /habit/i.test(await pg.textContent('#cl-wear')), 'a HABIT from COM is worn — its text is its reference');
  ok(!log.errors.length, 'from COM, any box: no page error ' + log.errors.join(' | '));
}
// ── Un élément introuvable (effacé, autre compte) : oublié, la page suit son cours
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, network });
  await pg.goto('https://www.higher.boutique/streetwear?wear=wisdom:gone');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().supports === 2);
  await pg.waitForTimeout(120);
  ok(!(await pg.evaluate(() => window.__totehm_cloth().element)) && await pg.isHidden('#cl-wear'), 'an unknown element is dropped: nothing chosen, nothing shown');
  await pg.click('#totehmize');
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'element');
  ok(!log.errors.length, 'unknown element: TOTEHMIZE opens ELEMENT as usual, no page error');
}
// ── Sans compte, arrivé de COM : l'élément voulu attend la connexion (PKCE), puis NAME
{
  const { pg, ctx, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, network, session:false });
  await pg.goto('https://www.higher.boutique/streetwear?wear=wisdom:w1');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().supports === 2);
  ok((await pg.evaluate(() => window.__totehm_cloth().wanted)) && await pg.isHidden('#cl-wear'), 'signed out: the wish is kept, nothing shown before the TOTEHM is read');
  // totehm.com rend la main (simulé) ; au retour, la session est là.
  await ctx.route('https://www.totehm.com/auth**', r => r.fulfill({ status:200, contentType:'text/html', body:'<script>location.replace("https://www.higher.boutique/streetwear")</script>' }));
  await ctx.addInitScript(([u]) => { if(location.host === 'www.higher.boutique') localStorage.setItem('sb-abujjbkbbiumxrokozph-auth-token', JSON.stringify({ access_token:'test-at', refresh_token:'test-rt', token_type:'bearer', expires_in:3600, expires_at: Math.floor(Date.now()/1000) + 3600, user:u })); }, [USER]);
  const req = pg.waitForRequest(r => /www\.totehm\.com\/auth\?client=boutique/.test(r.url()));
  await pg.click('#totehmize');
  ok(new URL((await req).url()).searchParams.get('return') === '/streetwear', 'signed out: TOTEHMIZE signs in through totehm.com (PKCE), back to /streetwear');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().stage === 'name', null, { timeout:15000 });
  ok(/Slow is smooth/.test(await pg.textContent('#el-list')) && (await pg.evaluate(() => window.__totehm_cloth().element)) === 'wisdom', 'the wish travels through the sign-in: back, straight to NAME with the wisdom chosen in COM');
  ok(!log.errors.filter(e => !/totehm\.com\/auth/.test(e)).length, 'signed out from COM: no page error');
}
// ── Le passeport : un Totehm incomplet ne s'ouvre pas
{
  const { pg } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc:{ ...rpc, totehm_complete:{ complete:false, remplies:3, habits:true, objectives:true, repulsions:false, wisdom:true, visions:false } }, tables, network });
  await pg.goto('https://www.higher.boutique/streetwear');
  await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().ready && window.__totehm_cloth().supports === 2);
  await pg.click('#totehmize');
  await pg.waitForSelector('#pass.is-open');
  ok(/3 \/ 5 views/.test(await pg.textContent('#pass-n')) && (await pg.evaluate(() => window.__totehm_cloth().stage)) === 'cloth', 'passport: an incomplete TOTEHM stays at the door (3 / 5 views)');
}
// ── La collection vide, sur ordinateur : la page tient debout
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables: { ...tables, totehm_cloth_support: [] }, network, viewport:{ width:1280, height:800 } });
  await pg.goto('https://www.higher.boutique/streetwear');
  await pg.waitForFunction(() => window.__totehm_cloth && /coming soon/.test(document.querySelector('#viewer').textContent));
  ok(!(await pg.isVisible('#totehmize')) && (await pg.evaluate(() => window.__totehm_cloth().stage)) === 'cloth', 'empty collection: coming soon, no TOTEHMIZE');
  ok(!log.errors.length, 'empty collection: no page error ' + log.errors.join(' | '));
}
await browser.close();
