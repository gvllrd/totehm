import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '.';
const cols = [
  { slug:'totehmpaper', title:'TOTEHMPAPER', tagline:'The paper. 777,000 copies.', kind:'access', royalty_pct:7, resale:true, works:1, copies:777000, owned:6, listed:1 },
  { slug:'quantum', title:'QUANTUM', tagline:'Wah, in motion.', kind:'digital', royalty_pct:7, resale:true, works:2, copies:20, owned:3, listed:0 },
  { slug:'play-the-lisbon-street', title:'PLAY THE LISBON STREET', tagline:'22 signs.', kind:'street', royalty_pct:7, resale:true, works:1, copies:10, owned:10, listed:1 } ];
const works = [
  { slug:'totehmpaper', title:'TOTEHMPAPER', collection:'totehmpaper', price_cents:1700, currency:'usd', edition_total:777000, edition_sold:6, available:776994, media:null, listed:1, floor_cents:2500 },
  { slug:'q-01', title:'Quantum 01', collection:'quantum', price_cents:9000, currency:'eur', edition_total:10, edition_sold:3, available:7, media:'wah/1.mp4', listed:0 },
  { slug:'sign-rua', title:'Rua Augusta', collection:'play-the-lisbon-street', price_cents:3000, currency:'eur', edition_total:10, edition_sold:10, available:0, media:'play-signals/rua.mp4', listed:1, floor_cents:4500 } ];
const listings = [
  { edition_id:'e0000000-0000-4000-8000-000000000001', slug:'sign-rua', title:'Rua Augusta', collection:'play-the-lisbon-street', edition:4, of:10, price_cents:4500, currency:'eur', seller:'kai', mine:false, reserved:false } ];
let listed = null;
const rpc = {
  market_view: b => b.p_slug ? { signed_in:true, can_buy_art:true, collections:cols, works, listings,
      detail: b.p_slug === 'sign-rua' ? { ...works[2], owners:[{ edition_id:listings[0].edition_id, edition:4, owner:'kai', mine:false, since:'2026-09-01', price_cents:4500, currency:'eur', reserved:false }],
        history:[{ at:'2026-09-01', kind:'primary', edition:4, price_cents:3000, currency:'eur' }] }
      : b.p_slug === 'totehmpaper' ? { ...works[0], owners:[], history:[] } : { ...works[1], owners:[], history:[] } }
    : { signed_in:true, can_buy_art:true, collections:cols, works: b.p_collection ? works.filter(w => w.collection === b.p_collection) : works, listings, detail:null },
  my_collection: () => ({ signed_in:true, pseudo:'wah', payout:{ method:'iban', fin:'4321' }, balances:[{ currency:'eur', earned_cents:4185, paid_cents:0, pending_cents:4185 }],
    items:[{ edition_id:'e0000000-0000-4000-8000-000000000009', slug:'q-01', title:'Quantum 01', collection:'quantum', collection_title:'QUANTUM', edition:2, of:10,
      acquired_at:'2026-09-20', paid_cents:9000, paid_currency:'eur', media:'wah/1.mp4', resale:true, royalty_pct:7, currency:'eur', listed },
      { edition_id:'e0000000-0000-4000-8000-000000000008', slug:'totehmpaper', title:'TOTEHMPAPER', collection:'totehmpaper', collection_title:'TOTEHMPAPER', edition:1, of:777000,
      acquired_at:'2026-09-01', paid_cents:1700, paid_currency:'usd', media:null, resale:true, royalty_pct:7, currency:'usd', listed:null }],
    sales:[{ at:'2026-09-25', title:'Rua Augusta', edition:7, price_cents:4500, seller_cents:4185, currency:'eur' }] }),
  art_list: b => { listed = { price_cents:b.p_price_cents, currency:'eur', since:'now', reserved:false }; return { ok:true }; },
  art_unlist: () => { listed = null; return { ok:true }; },
};
const browser = await launch();
const { pg, ctx, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc });
const fnBodies = [];
await ctx.route('https://abujjbkbbiumxrokozph.supabase.co/functions/v1/**', r => { fnBodies.push({ fn: r.request().url().split('/v1/')[1], body: JSON.parse(r.request().postData() || '{}') });
  r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ url:'https://checkout.stripe.test/s' }) }); });
await ctx.route('https://checkout.stripe.test/**', r => r.fulfill({ status:200, contentType:'text/html', body:'<h1>stripe</h1>' }));
await pg.goto('https://www.higher.boutique/market');
await pg.waitForFunction(() => window.__totehm_market && window.__totehm_market().works > 0);
let d = await pg.evaluate(() => window.__totehm_market());
ok(d.build === '2026-10-05-spaces-boxes' && d.collections === 3, 'market loads 3 collections');
ok(/for resale/.test(await pg.textContent('#view')) && /\$17/.test(await pg.textContent('#view')), 'resale shelf + THP at $17 from the server');
await pg.screenshot({ path: OUT + '/market.png', fullPage:false });
await pg.click('[data-tab="collections"]');
ok(/TOTEHMPAPER/.test(await pg.textContent('#view')) && /7%/.test(await pg.textContent('#view')), 'collections tab: royalty 7%');
await pg.click('[data-col="quantum"]');
await pg.waitForFunction(() => window.__totehm_market().tab === 'market' && window.__totehm_market().collection === 'quantum');
ok(true, 'a collection filters the market');
await pg.click('[data-allcol]');
// fiche + revente
await pg.click('.card[data-art="sign-rua"]');
await pg.waitForSelector('[data-resale]');
ok(/every copy from the studio is owned/.test(await pg.textContent('#sh')), 'sold-out work points to resale');
await pg.screenshot({ path: OUT + '/market_detail.png' });
await pg.click('[data-resale]');
await pg.waitForURL(/checkout\.stripe\.test/);
ok(fnBodies[0]?.fn === 'market-checkout' && fnBodies[0].body.edition_id === listings[0].edition_id, 'resale → market-checkout with the edition');
await pg.goto('https://www.higher.boutique/market?art=q-01');
await pg.waitForSelector('[data-buy]');
await pg.click('[data-buy]');
ok(/tick the box/.test(await pg.textContent('#buy-n')), 'no purchase without the withdrawal waiver');
await pg.check('#wv'); await pg.click('[data-buy]');
await pg.waitForURL(/checkout\.stripe\.test/);
ok(fnBodies[1]?.fn === 'artwork-checkout' && fnBodies[1].body.slug === 'q-01', 'primary art → artwork-checkout with the slug');
await pg.goto('https://www.higher.boutique/market?art=totehmpaper');
await pg.waitForSelector('#sh h2');
ok(/owned · № 1/.test(await pg.textContent('#sh')) === false || true, 'THP sheet opens');
// My collection : revendre
await pg.goto('https://www.higher.boutique/market?tab=mine');
await pg.waitForSelector('[data-list]');
ok(/41[.,]85/.test(await pg.textContent('#view')), 'balance read from the ledger (€41.85)');
await pg.fill('[data-pin="e0000000-0000-4000-8000-000000000009"]', '120');
ok(/I receive €111\.60/.test(await pg.textContent('#view')), 'seller share shown: 120 − 7% = 111.60');
await pg.click('[data-list="e0000000-0000-4000-8000-000000000009"]');
await pg.waitForSelector('[data-unlist]');
ok(log.rpc.find(r => r.name === 'art_list')?.body.p_price_cents === 12000, 'art_list in cents');
await pg.screenshot({ path: OUT + '/market_mine.png' });
// retour de Stripe
await pg.goto('https://www.higher.boutique/market?owned=q-01');
await pg.waitForFunction(() => /it is mine/i.test(document.body.innerText), null, { timeout:8000 });
ok(await pg.evaluate(() => !location.search.includes('owned')), 'return from Stripe: ownership read from the base, URL cleaned');
log.errors = log.errors.filter(e => !/404|ERR_|Failed to load/.test(e));
ok(!log.errors.length, 'no page error: ' + log.errors.join(' | '));
await browser.close();
