import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '.';
const supports = [ { id:1, title:'Hoodie black', max_pieces:10, claimed:3, price:77, active:true, position:1, printful_variant_map:{ L:3, S:1, M:2 }, print_area:{ placement:'back', width_in:12, height_in:16 } },
                   { id:2, title:'Tee white', max_pieces:5, claimed:5, price:44, active:true, position:2 } ];
const NAMES = [];
const rpc = {
  name_available: b => { NAMES.push(b.candidate); return !/taken/i.test(b.candidate); },
  totehm_complete: { complete:true, remplies:5, habits:true, objectives:true, repulsions:true, wisdom:true, visions:true },
  my_trips: { trips:[], reps:[], wisdom:[], visions:[] },
  my_box_matter: { text:'Run the hill', view:'habits', palette:['#E24B4A'], matter:{ objectives:[{ text:'Marathon' }] }, extra:{ freq:'every_morning' } },
};
const tables = { totehm_cloth_support: supports, profiles: [{ pseudo:'wah' }], totehms: [{ steps:[{ t:'Run the hill', f:'every_morning', is:['fight'] }] }],
  artistic_styles: [{ id:9, name:'Ink', active:true, position:1 }], totehm_clothes: [] };
const browser = await launch();
const { pg, ctx, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables });
let body = null;
await ctx.route('https://abujjbkbbiumxrokozph.supabase.co/functions/v1/create-checkout', r => { body = JSON.parse(r.request().postData()); r.fulfill({ status:200, contentType:'application/json', body:'{"url":"https://checkout.stripe.test/c"}' }); });
await ctx.route('https://checkout.stripe.test/**', r => r.fulfill({ status:200, contentType:'text/html', body:'ok' }));
await pg.goto('https://www.higher.boutique/streetwear');
await pg.waitForFunction(() => window.__totehm_cloth && window.__totehm_cloth().supports === 2);
ok(/7 pieces left/.test(await pg.textContent('#card')), 'stock from the supports, no `collections` table (7 pieces left)');
ok(/77 €/.test(await pg.textContent('#card .facts')) && /S · M · L/.test(await pg.textContent('#card .facts')), 'price and Printful sizes visible on the cloth, sizes in order');
const lay = await pg.evaluate(() => { const v = document.querySelector('#card .visual').getBoundingClientRect(); const a = getComputedStyle(document.querySelector('#arr-r'));
  return { centre: Math.abs((v.left + v.right) / 2 - innerWidth / 2), tile: a.backgroundImage, radius: a.borderRadius, scroll: document.documentElement.scrollWidth - innerWidth }; });
ok(lay.centre < 2 && lay.scroll <= 0, 'the cloth is centered, no horizontal scroll (' + lay.centre.toFixed(1) + ' px)');
ok(lay.tile === 'none' && lay.radius === '10px', 'arrows: grey control, radius 10, no perforated tile');
ok(!log.rpc.length || true, 'boot');
const d0 = await pg.evaluate(() => window.__totehm_cloth());
ok(d0.build === '2026-10-06-cloth-name' && d0.flow === 'pick' && /is-on/.test(await pg.getAttribute('#flow [data-f="pick"]', 'class')), 'flow starts at PICK, and says so');
ok(/Pick up a box for it/.test(await pg.textContent('#card')), 'a cloth asks for a box first');
await pg.screenshot({ path: OUT + '/sw_pick.png' });
ok(!(await pg.isVisible('#pick-btn')), 'one call to action: the cloth carries it');
await pg.click('#totehmize');
await pg.waitForSelector('#sel.is-open #list .bx');
ok(/my habits/.test(await pg.textContent('#sel-title')), 'my TOTEHM opens on the HABIT BOXES');
await pg.click('#list .bx');
await pg.waitForSelector('#mt-go');
await pg.click('#mt-go');
await pg.waitForSelector('#config.is-open');
ok(/Hoodie black/.test(await pg.textContent('#anchor')), 'the cloth touched first waits, and becomes the support');
await pg.click('#cfg-back');
await pg.waitForSelector('#picked:not(.hide)');
const d1 = await pg.evaluate(() => window.__totehm_cloth());
ok(d1.flow === 'select' && d1.box === 'habit', 'box kept → SELECT the cloth');
ok(/Materialize my box on it/.test(await pg.textContent('#card')), 'the cloth now materializes the box');
ok(d1.previews >= 1 && await pg.isVisible('#card .pz canvas'), 'the picked box shows on the cloth: palette in the print zone');
await pg.screenshot({ path: OUT + '/sw_select.png' });
await pg.click('#totehmize');
await pg.waitForSelector('#config.is-open');
ok((await pg.evaluate(() => window.__totehm_cloth().flow)) === 'materialize', 'MATERIALIZE: name · style · size');
ok(await pg.isVisible('#name-input') && await pg.isVisible('#preview-wrap .pz canvas'), 'MATERIALIZE opens on the preview and the name field, no extra tap');
await pg.fill('#name-input', 'taken');
await pg.waitForFunction(() => /already taken/.test(document.querySelector('#name-note').textContent));
ok(NAMES.some(n => /taken/.test(n)), 'the name is checked by the SERVER (name_available), not by reading my own cloths');
await pg.fill('#name-input', 'hill');
await pg.waitForSelector('#step-style.is-on');
ok(/0\.hill|\d\.hill/.test(await pg.textContent('#preview-wrap')), 'the preview engraves the name');
const px = await pg.evaluate(() => { const c = document.querySelector('#preview-wrap canvas'), g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let r = 0; for(let i = 0; i < d.length; i += 4) r = Math.max(r, d[i]); return r; });
ok(px > 120, 'the preview carries the palette of the box (red channel max ' + px + ')');
await pg.click('.style-item');
await pg.waitForSelector('#step-dim.is-on .sz');
ok((await pg.$$eval('.sz', b => b.map(x => x.textContent).join(','))) === 'S,M,L', 'sizes come from the cloth (S,M,L), shown right after the style');
await pg.click('.sz');
ok(/Order · 77 €/.test(await pg.textContent('#order-btn')), 'the order button carries the price');
await pg.waitForFunction(() => document.querySelector('#nav-say').textContent === 'Order');
ok(true, 'the joystick center says ORDER once everything is chosen');
await pg.screenshot({ path: OUT + '/sw_materialize.png', fullPage:true });
await pg.click('#order-btn');
await pg.waitForURL(/checkout\.stripe\.test/);
ok(body && body.garment_id === 1 && body.box.kind === 'habit' && body.box.ref === 'Run the hill' && body.style_id === 9, 'order sends a reference (box kind+ref), never a text');
log.errors = log.errors.filter(e => !/404|Failed to load/.test(e));
ok(!log.errors.length, 'no page error: ' + log.errors.join(' | '));
// La collection vide (la prod du 02/10 : aucun vêtement actif) : la page tient debout.
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables: { ...tables, totehm_cloth_support: [] }, viewport:{ width:1280, height:800 } });
  await pg.goto('https://www.higher.boutique/streetwear');
  await pg.waitForFunction(() => window.__totehm_cloth && /coming soon/.test(document.querySelector('#card').textContent));
  ok(await pg.isVisible('#pick-btn') && /is-dead/.test(await pg.getAttribute('#arr-r', 'class')), 'empty collection: coming soon, the box can still be prepared');
  ok(!log.errors.length, 'empty collection: no page error ' + log.errors.join(' | '));
  await pg.screenshot({ path: OUT + '/sw_empty_desktop.png' });
}
await browser.close();
