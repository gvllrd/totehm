// higher.boutique/streetwear — la totehmisation plein écran (08/10/2026). Zéro réseau.
// CLOTH (← → modèles, ↑ ↓ vues) → ELEMENT (Totehm déplié + manette) → NAME → STYLE → ORDER.
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
              wisdom:[{ id:'w1', text:'Slow is smooth', is:[] }], visions:[{ id:'v1', text:'A studio by the sea', is:['express'] }] },
  my_box_matter: b => ({ text: b.p_kind === 'vision' ? 'A studio by the sea' : 'Run the hill', view: b.p_kind === 'vision' ? 'visions' : 'habits',
    palette:['#E24B4A','#e48b31'], matter:{ objectives:[{ text:'Marathon in May' }] }, extra:{ freq:'every_morning' } }),
  my_streetwear_test_mode: true,
};
const styles = [{ id:'st1', name:'Ink Realism', active:true, status:'active', position:1, remaining_capacity:7, total_capacity:7 },
                { id:'st2', name:'Neon Glitch', active:true, status:'active', position:2, remaining_capacity:0, total_capacity:7 }];
const tables = { totehm_cloth_support: supports, profiles: [{ pseudo:'Vallerand' }], totehms: [{ steps:[{ t:'Run the hill', f:'every_morning', is:['fight'] }] }],
  artistic_styles: styles, totehm_clothes: [{ name:'0.hill', status:'paid', paid_at:'2026-10-08' }] };
// Le dossier du support : trois vues (le seau est public ; la liste passe par l'API Storage).
const network = (url, req) => {
  if(url.origin === SB && url.pathname === '/storage/v1/object/list/totehm-cloth-support'){
    const prefix = JSON.parse(req.postData() || '{}').prefix;
    const files = prefix === 'champ' ? [{ name:'1-front.png' }, { name:'2-back.png' }, { name:'3-side.png' }, { name:'.keep' }] : [];
    return { status:200, contentType:'application/json', body: JSON.stringify(files) };
  }
  if(/printful\.test|storage\/v1\/object\/public/.test(url.href)) return { status:200, contentType:'image/svg+xml', body:'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#444"/></svg>' };
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

// ── 1 · CLOTH
let d = await D();
ok(d.build === '2026-10-08-immersive' && d.stage === 'cloth' && !d.joystick, 'CLOTH first, and no joystick before the TOTEHM');
ok(/Higher Champion Sweatshirt/.test(await pg.textContent('#cl-title')) && /170 €/.test(await pg.textContent('#cl-facts')) && /177 \/ 177 left/.test(await pg.textContent('#cl-facts')), 'title, server price and edition left');
ok(/S · M · L · XL · 2XL/.test(await pg.textContent('#cl-facts')), 'Printful sizes, in order');
const lay = await pg.evaluate(() => { const v = document.querySelector('#viewer').getBoundingClientRect(), b = document.querySelector('#totehmize').getBoundingClientRect();
  return { centre: Math.abs((v.left + v.right) / 2 - innerWidth / 2), ctr: Math.abs((b.left + b.right) / 2 - innerWidth / 2), scroll: document.documentElement.scrollWidth - innerWidth, bottom: b.bottom <= innerHeight }; });
ok(lay.centre < 2 && lay.ctr < 2 && lay.scroll <= 0 && lay.bottom, 'the cloth and TOTEHMIZE are centered, on one screen (' + lay.centre.toFixed(1) + ' px)');
ok((await pg.$$eval('#a-dots i', l => l.length)) === 3 && (await pg.$$eval('#m-dots i', l => l.length)) === 2, 'dots: 3 views (vertical), 2 cloths (horizontal)');
ok(/swipe ↔ cloths · ↕ views/.test(await pg.textContent('#cl-hint')), 'the gesture hint says both axes');
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

// ── 2 · ELEMENT
await pg.click('#totehmize');
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'element');
d = await D();
ok(d.joystick && d.views === 5, 'TOTEHMIZE opens the unfolded TOTEHM, the joystick appears now (5 views)');
ok(/my habits/i.test(await pg.textContent('#el-title')) && /Run the hill/.test(await pg.textContent('#el-list')), 'it opens on MY HABITS');
ok(!/\bbox\b/i.test(await pg.textContent('#s-element')), 'on screen: "element", never "box"');
await pg.waitForTimeout(500);
const jb = await pg.locator('#joy-box').boundingBox();
await pg.mouse.move(jb.x + jb.width / 2, jb.y + jb.height / 2); await pg.mouse.down();
await pg.mouse.move(jb.x + jb.width / 2 + 22, jb.y + jb.height / 2, { steps:5 });
ok(/my vision/i.test(await pg.textContent('#joy-say')), 'pushing the joystick names the view before going');
await pg.mouse.up();
await pg.waitForFunction(() => /my vision/i.test(document.querySelector('#el-title').textContent));
ok(/A studio by the sea/.test(await pg.textContent('#el-list')), 'released: MY VISION');
await pg.click('#cur-g');
await pg.waitForFunction(() => /my habits/i.test(document.querySelector('#el-title').textContent));
await pg.click('#el-map [data-v="objectives"]');
await pg.waitForFunction(() => /my objectives/i.test(document.querySelector('#el-title').textContent));
ok(/Marathon in May/.test(await pg.textContent('#el-list')) && await pg.isVisible('#el-map [data-v="objectives"].is-here'), 'the little cross jumps to a view and says where I am');
await pg.keyboard.press('ArrowDown');
await pg.waitForFunction(() => /my habits/i.test(document.querySelector('#el-title').textContent));
ok(true, 'arrows move in the cross (objectives ↓ habits)');
await pg.click('#el-list .bx');
await pg.waitForSelector('#mt-go');
ok(/Marathon in May/.test(await pg.textContent('#matter')) && (await D()).open && /wear it/i.test(await pg.textContent('#joy-say')), 'the element opens its matter; the joystick centre now wears it');
await pg.screenshot({ path: OUT + '/sw_element.png' });
await pg.click('#mt-go');

// ── 3 · NAME
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'name');
d = await D();
ok(!d.joystick && d.element === 'habit' && d.palette === 2, 'NAME: the joystick is gone, the element is kept (habit, its palette)');
ok(/Run the hill/.test(await pg.textContent('#nm-el')) && (await pg.textContent('#nm-prefix')) === '0.', 'the element sits on top; the name starts with 0.');
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
ok(await pg.isEnabled('#st-go'), 'a style chosen: Next');
await pg.click('#st-go');

// ── 5 · ORDER
await pg.waitForFunction(() => window.__totehm_cloth().stage === 'order');
ok((await pg.$$eval('#od-sizes .sz', b => b.map(x => x.textContent).join(','))) === 'S,M,L,XL,2XL', 'sizes from Printful, in order (S,M,L,XL,2XL)');
ok(await pg.isDisabled('#od-sizes .sz[data-s="XL"]'), 'a discontinued size is closed');
ok(await pg.isVisible('#od-test') && /4242/.test(await pg.textContent('#od-test')), 'test mode said on the page (my_streetwear_test_mode)');
ok(/0\.hill/.test(await pg.textContent('#od-recap')) && /Ink Realism/.test(await pg.textContent('#od-recap')), 'the recap: the name, the element view, the style, the cloth');
const px = await pg.evaluate(() => { const c = document.querySelector('#od-visual canvas'), g = c.getContext('2d'); const a = g.getImageData(0, 0, c.width, c.height).data; let r = 0; for(let i = 0; i < a.length; i += 4) r = Math.max(r, a[i]); return r; });
ok(px > 120, 'the preview carries the palette of the element (red max ' + px + ')');
ok(await pg.isDisabled('#od-go'), 'no size, no order');
await pg.click('#od-sizes .sz[data-s="L"]');
ok(/Order · 170 €/.test(await pg.textContent('#od-go')) && await pg.isEnabled('#od-go'), 'the order button carries the server price');
await pg.screenshot({ path: OUT + '/sw_order.png' });
await pg.click('#od-go');
await pg.waitForURL(/checkout\.stripe\.test/);
ok(body && body.garment_id === 's1' && body.box.kind === 'habit' && body.box.ref === 'Run the hill' && body.name === 'hill' && body.size === 'L' && body.style_id === 'st1',
  'order sends a reference and the name WITHOUT prefix (the server sets 0.)');

// ── Paiement annulé : retour sur ORDER, tous les choix gardés
await pg.goto('https://www.higher.boutique/streetwear?cancel=1');
await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().stage === 'order');
d = await D();
ok(d.named && d.style && d.size && d.element === 'habit' && /cancelled/.test(await pg.textContent('#od-note')), 'Stripe cancelled: back on ORDER, name · style · size · element kept');
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
ok(!log.errors.length, 'no page error: ' + log.errors.join(' | '));

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
  await pg.screenshot({ path: OUT + '/sw_empty_desktop.png' });
}
await browser.close();
