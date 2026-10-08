// higher.boutique/streetwear — la totehmisation (08/10/2026 bis). Zéro réseau.
// Téléphone : une scène plein écran à la fois. Ordinateur : le vêtement reste et se décale, les fenêtres glissent.
// CLOTH (← → modèles, ↑ ↓ vues) → ELEMENT (WISDOM ← → VISION, manette) → NAME → STYLE → ORDER.
// LANCER : node streetwear.mjs /tmp
import { launch, page, ok } from './harness.mjs';
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
  my_trips: { trips:[{ id:'o1', text:'Marathon in May', is:['flow'], days_left:200 }], reps:[{ id:7, text:'Scrolling at night', is:['focus'] }],
              wisdom:[{ id:'w1', text:'Slow is smooth', is:['focus'] }], visions:[{ id:'v1', text:'A studio by the sea', is:['express'] }] },
  my_box_matter: b => b.p_kind === 'vision'
    ? { text:'A studio by the sea', view:'visions', palette:['#1D9E75'], matter:{ objectives:[{ text:'Save 10k' }] }, extra:{} }
    : { text:'Slow is smooth', view:'wisdom', palette:['#378ADD'], matter:{ objectives:[{ text:'Marathon in May' }] }, extra:{ freq:'every_morning' } },
  my_streetwear_test_mode: true,
};
const styles = [{ id:'st1', name:'Ink Realism', active:true, status:'active', position:1, remaining_capacity:7, total_capacity:7, image_url:'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22/%3E' },
                { id:'st2', name:'Neon Glitch', active:true, status:'active', position:2, remaining_capacity:0, total_capacity:7 }];
const tables = { totehm_cloth_support: supports, profiles: [{ pseudo:'Vallerand' }], artistic_styles: styles, totehm_clothes: [{ name:'0.hill', status:'paid', paid_at:'2026-10-08' }] };
// Le dossier du support : trois vues (le seau est public ; la liste passe par l'API Storage).
const network = (url, req) => {
  if(url.origin === SB && url.pathname === '/storage/v1/object/list/totehm-cloth-support'){
    const prefix = JSON.parse(req.postData() || '{}').prefix;
    const files = prefix === 'champ' ? [{ name:'1-front.png' }, { name:'2-back.png' }, { name:'3-side.png' }, { name:'.keep' }] : [];
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
ok(d.build === '2026-10-08-wisdom-vision' && d.stage === 'cloth' && !d.joystick && !d.desktop, 'phone: CLOTH first, no joystick before the TOTEHM');
ok(/Higher Champion Sweatshirt/.test(await pg.textContent('#cl-title')) && /170 €/.test(await pg.textContent('#cl-facts')) && /177 \/ 177 left/.test(await pg.textContent('#cl-facts')), 'title, server price and edition left');
ok(/S · M · L · XL · 2XL/.test(await pg.textContent('#cl-facts')), 'Printful sizes, in order');
const lay = await pg.evaluate(() => { const v = document.querySelector('#viewer').getBoundingClientRect(), b = document.querySelector('#totehmize').getBoundingClientRect();
  return { centre: Math.abs((v.left + v.right) / 2 - innerWidth / 2), ctr: Math.abs((b.left + b.right) / 2 - innerWidth / 2), scroll: document.documentElement.scrollWidth - innerWidth, bottom: b.bottom <= innerHeight }; });
ok(lay.centre < 2 && lay.ctr < 2 && lay.scroll <= 0 && lay.bottom, 'the cloth and TOTEHMIZE are centered, on one screen (' + lay.centre.toFixed(1) + ' px)');
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
ok(/sold out/i.test(await pg.textContent('#cl-facts')) && await pg.isDisabled('#totehmize'), 'a horizontal swipe: the next cloth (sold out: TOTEHMIZE closed)');
await pg.keyboard.press('ArrowLeft');
await pg.waitForFunction(() => window.__totehm_cloth().model === 0 && window.__totehm_cloth().angle === 2);
ok(true, 'back to the first cloth with the keyboard, its view is remembered');
const src = await pg.evaluate(() => [...document.querySelectorAll('.model[data-i="0"] img')].map(i => i.getAttribute('src') || '').join('|'));
ok(/champ\/1-front\.png/.test(src) && /champ\/3-side\.png/.test(src) && !/\.keep/.test(src), 'views = the photos of its Storage folder, in name order');

// ── 2 · ELEMENT : WISDOM ← → VISION
await pg.click('#totehmize');
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'element');
d = await D();
ok(d.joystick && d.views === 2 && d.view === 'wisdom', 'TOTEHMIZE opens the TOTEHM on WISDOM; the joystick appears now; two views only');
ok(/my wisdom/i.test(await pg.textContent('#el-title')) && /what I pass on/i.test(await pg.textContent('#el-sub')) && /Slow is smooth/.test(await pg.textContent('#el-list')), 'MY WISDOM · what I pass on');
ok(!/Marathon in May|Scrolling at night/.test(await pg.textContent('#el-list')) && (await pg.$$eval('#el-map button', b => b.length)) === 2, 'no habits, objectives or repulsions to wear; the little map is the time axis (2)');
ok(await pg.evaluate(() => ['cur-h','cur-b','cur-g'].every(i => document.getElementById(i).classList.contains('mort')) && !document.getElementById('cur-d').classList.contains('mort')), 'joystick: only → (to VISION) is alive');
await pg.waitForTimeout(500);
const jb = await pg.locator('#joy-box').boundingBox();
await pg.mouse.move(jb.x + jb.width / 2, jb.y + jb.height / 2); await pg.mouse.down();
await pg.mouse.move(jb.x + jb.width / 2 + 22, jb.y + jb.height / 2, { steps:5 });
ok(/my vision/i.test(await pg.textContent('#joy-say')), 'pushing the joystick names the view before going');
await pg.mouse.up();
await pg.waitForFunction(() => /my vision/i.test(document.querySelector('#el-title').textContent));
ok(/A studio by the sea/.test(await pg.textContent('#el-list')) && /imagine for the world/i.test(await pg.textContent('#el-sub')), 'released: MY VISION · what I imagine for the world');
await pg.keyboard.press('ArrowLeft');
await pg.waitForFunction(() => /my wisdom/i.test(document.querySelector('#el-title').textContent));
ok(true, 'the arrow brings back WISDOM');
await pg.click('#el-list .bx');
await pg.waitForSelector('#mt-go');
const matter = await pg.textContent('#matter');
ok(/Marathon in May/.test(matter) && (await D()).open && /wear it/i.test(await pg.textContent('#joy-say')), 'the element opens what it is connected to; the joystick centre now wears it');
ok(!/palette|rhythm|every morning/i.test(matter + await pg.textContent('#el-list')) && !(await pg.$('#matter .pal')), 'no colour palette, no time frequency on screen');
await pg.screenshot({ path: OUT + '/sw_element.png' });
await pg.click('#mt-go');

// ── 3 · NAME
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'name');
d = await D();
ok(!d.joystick && d.element === 'wisdom', 'NAME: the joystick is gone, the element is kept (wisdom)');
ok(/Slow is smooth/.test(await pg.textContent('#nm-el')) && !(await pg.$('#nm-el .pals')) && (await pg.textContent('#nm-prefix')) === '0.', 'the element sits on top, without palette; the name starts with 0.');
await pg.fill('#nm-input', 'taken');
await pg.waitForFunction(() => /already taken/.test(document.querySelector('#nm-note').textContent));
ok(NAMES.includes('0.taken') && await pg.isDisabled('#nm-go'), 'availability is checked by the SERVER; a taken name blocks Next');
await pg.fill('#nm-input', '0.hill');
await pg.waitForFunction(() => /available/.test(document.querySelector('#nm-note').textContent));
ok((await pg.inputValue('#nm-input')) === 'hill' && NAMES.includes('0.hill'), 'a typed "0." is not doubled: 0.hill');
const coral = await pg.evaluate(() => getComputedStyle(document.querySelector('#nm-input')).color + '|' + getComputedStyle(document.querySelector('#nm-input')).fontFamily);
ok(/251, 213, 202/.test(coral) && /Quantico/.test(coral), 'the name is Quantico Coral');
await pg.screenshot({ path: OUT + '/sw_name.png' });
await pg.press('#nm-input', 'Enter');

// ── 4 · STYLE
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'style' && document.querySelectorAll('.st-card').length === 2);
ok(/7 left/.test(await pg.textContent('.st-card[data-id="st1"]')) && await pg.isDisabled('.st-card[data-id="st2"]'), 'styles say what is left; a sold-out style is closed');
await pg.click('.st-card[data-id="st1"]');
await pg.click('#st-go');

// ── 5 · ORDER
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'order');
ok((await pg.$$eval('#od-sizes .sz', b => b.map(x => x.textContent).join(','))) === 'S,M,L,XL,2XL' && await pg.isDisabled('#od-sizes .sz[data-s="XL"]'), 'sizes from Printful, in order; a discontinued one is closed');
ok(await pg.isVisible('#od-test') && /4242/.test(await pg.textContent('#od-test')), 'test mode said on the page');
const pv = await pg.evaluate(() => { const z = document.querySelector('#od-visual .pz'); return { dashed: getComputedStyle(z).borderTopStyle, img: !!z.querySelector('img'), canvas: !!document.querySelector('#od-visual canvas'), name: document.querySelector('#od-visual .pz-name').textContent }; });
ok(pv.dashed === 'dashed' && pv.img && !pv.canvas && pv.name === '0.hill', 'the preview: the place (dashed), the style, the name — no palette');
await pg.click('#od-sizes .sz[data-s="L"]');
ok(/Order · 170 €/.test(await pg.textContent('#od-go')) && await pg.isEnabled('#od-go'), 'the order button carries the server price');
await pg.screenshot({ path: OUT + '/sw_order.png' });
await pg.click('#od-go');
await pg.waitForURL(/checkout\.stripe\.test/);
ok(body && body.garment_id === 's1' && body.box.kind === 'wisdom' && body.box.ref === 'w1' && body.name === 'hill' && body.size === 'L' && body.style_id === 'st1',
  'order sends a reference (wisdom) and the name WITHOUT prefix (the server sets 0.)');

// ── Paiement annulé : retour sur ORDER, tous les choix gardés
await pg.goto('https://www.higher.boutique/streetwear?cancel=1');
await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().stage === 'order');
d = await D();
ok(d.named && d.style && d.size && d.element === 'wisdom' && /cancelled/.test(await pg.textContent('#od-note')), 'Stripe cancelled: back on ORDER, name · style · size · element kept');
ok(!/cancel=/.test(pg.url()), 'the ?cancel=1 leaves the address bar');
await pg.click('#back');
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'style');
ok(true, 'Back walks the steps backwards (ORDER → STYLE)');
await pg.click('#hud button[data-i="1"]');
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'element' && window.__totehm_cloth().joystick);
ok(true, 'the step bar jumps back to ELEMENT (and the joystick comes back)');

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
  ok(d.side === 'left' && g.el.l === 0 && g.vc > g.w / 2 + 120 && g.vis === 'visible', 'WISDOM: its window slides in on the LEFT, the cloth shifts right and stays on screen');
  ok(d.zone && /your element/i.test(await pg.textContent('#vw-zone')), 'the place of the artwork lights up on the cloth');
  await pg.screenshot({ path: OUT + '/sw_desk_wisdom.png' });
  await pg.click('#cur-d');
  await pg.waitForFunction(() => window.__totehm_cloth().view === 'visions');
  await pg.waitForTimeout(900);
  g = await geo(); d = await D();
  ok(d.side === 'right' && g.el.r === g.w && g.vc < g.w / 2 - 120 && /A studio by the sea/.test(await pg.textContent('#el-list')), 'VISION: the window comes in on the RIGHT, the cloth shifts left');
  const jx = await pg.evaluate(() => { const j = document.getElementById('joy').getBoundingClientRect(), v = document.getElementById('viewer').getBoundingClientRect(); return Math.abs((j.left + j.right) / 2 - (v.left + v.right) / 2); });
  ok(jx < 4, 'the joystick follows the cloth in the free place (' + jx.toFixed(1) + ' px)');
  await pg.screenshot({ path: OUT + '/sw_desk_vision.png' });
  await pg.click('#el-list .bx');
  await pg.waitForSelector('#mt-go');
  await pg.click('#mt-go');
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'name');
  await pg.waitForTimeout(600);
  g = await geo(); d = await D();
  ok(d.side === 'right' && g.nm.r === g.w && g.vc < g.w / 2 - 120 && !d.joystick, 'NAME: a window on the right, the cloth on the left, no joystick');
  await pg.fill('#nm-input', 'sea');
  await pg.waitForFunction(() => /0\.sea/.test(document.querySelector('#vw-zone').textContent));
  ok(true, 'the name engraves itself on the cloth as it is typed');
  await pg.waitForFunction(() => /available/.test(document.querySelector('#nm-note').textContent));
  await pg.click('#nm-go');
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'style' && document.querySelectorAll('.st-card').length === 2);
  await pg.click('.st-card[data-id="st1"]');
  ok(!!(await pg.$('#vw-zone .pz img')), 'the chosen style fills the place on the cloth');
  await pg.click('#st-go');
  await pg.waitForFunction(() => window.__totehm_cloth().stage === 'order');
  await pg.waitForTimeout(500);
  ok(!(await pg.isVisible('#od-visual')) && (await geo()).vis === 'visible', 'ORDER on desktop: the cloth itself is the preview (no second picture)');
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
