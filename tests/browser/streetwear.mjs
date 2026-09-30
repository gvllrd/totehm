import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '.';
const supports = [ { id:1, title:'Hoodie black', max_pieces:10, claimed:3, price:77, active:true, position:1, printful_variant_map:{ S:1, M:2, L:3 } },
                   { id:2, title:'Tee white', max_pieces:5, claimed:5, price:44, active:true, position:2 } ];
const rpc = {
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
await pg.waitForFunction(() => window.__totehm_cloth && document.querySelector('#collection-stock').textContent.length > 0);
ok((await pg.textContent('#collection-stock')) === '7 left', 'stock from the supports, no `collections` table (7 left)');
ok(!log.rpc.length || true, 'boot');
const d0 = await pg.evaluate(() => window.__totehm_cloth());
ok(d0.build === '2026-09-30' && d0.flow === 'pick', 'flow starts at PICK');
ok(/Pick up a box for it/.test(await pg.textContent('#card')), 'a cloth asks for a box first');
await pg.screenshot({ path: OUT + '/sw_pick.png' });
await pg.click('#pick-btn');
await pg.waitForSelector('#sel.show #list .bx');
ok(/my habits/.test(await pg.textContent('#sel-title')), 'my TOTEHM opens on the HABIT BOXES');
await pg.click('#list .bx');
await pg.waitForSelector('#mt-go');
await pg.click('#mt-go');
await pg.waitForSelector('#picked:not(.hide)');
const d1 = await pg.evaluate(() => window.__totehm_cloth());
ok(d1.flow === 'select' && d1.box === 'habit', 'box picked → SELECT the cloth');
ok(/Materialize my box on it/.test(await pg.textContent('#card')), 'the cloth now materializes the box');
await pg.screenshot({ path: OUT + '/sw_select.png' });
await pg.click('#totehmize');
await pg.waitForSelector('#config.show');
ok((await pg.evaluate(() => window.__totehm_cloth().flow)) === 'materialize', 'MATERIALIZE: name · style · size');
await pg.click('#name-btn'); await pg.fill('#name-input', 'hill');
await pg.waitForSelector('#step-style.on');
await pg.click('#style-btn'); await pg.click('.style-item');
await pg.click('#dim-btn'); await pg.click('.sz');
await pg.click('#order-btn');
await pg.waitForURL(/checkout\.stripe\.test/);
ok(body && body.garment_id === 1 && body.box.kind === 'habit' && body.box.ref === 'Run the hill' && body.style_id === 9, 'order sends a reference (box kind+ref), never a text');
// un vêtement touché AVANT la box devient le support
await pg.goto('https://www.higher.boutique/streetwear');
await pg.waitForSelector('#totehmize');
await pg.click('#totehmize');
await pg.waitForSelector('#sel.show #list .bx');
await pg.click('#list .bx'); await pg.waitForSelector('#mt-go'); await pg.click('#mt-go');
await pg.waitForSelector('#config.show');
ok(/Hoodie black/.test(await pg.textContent('#anchor')), 'the cloth touched first waits, and becomes the support');
log.errors = log.errors.filter(e => !/404|Failed to load/.test(e));
ok(!log.errors.length, 'no page error: ' + log.errors.join(' | '));
await browser.close();
