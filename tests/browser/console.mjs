// totehm.com/console (05/10/2026) — mon abonnement en trois étapes, sans Reveal the Box.
import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '.';
const C = { signed_in:true, pseudo:'wah', visibility:'private',
  offer:{ enabled:false, open:false, price_cents:null, currency:'eur', period:'year', payout_method:null, payout_fin:null, part:80 },
  subscribers:{ count:1, list:[{ pseudo:'nia', status:'active', since:'2026-09-01', renews:'2027-09-01', ending:false }] },
  subscriptions:[{ creator:'kai', price_cents:2400, currency:'eur', status:'active', renews:'2027-05-01', since:'2026-05-01', ending:false }],
  earnings:{ balances:[{ currency:'eur', earned_cents:2880, pending_cents:2880, paid_cents:0 }], threshold_cents:2500, next_payout:'2026-11-01', recent:[] },
  payouts:[], bot:{ active:false, price_cents:700, currency:'eur', period:'month' }, membership:null, rules:{} };
const rpc = {
  my_console: () => C,
  visibility_set: b => { C.visibility = b.p_visibility; C.offer.open = C.offer.enabled && b.p_visibility === 'subscribers'; return { ok:true, visibility:b.p_visibility, subscribers:1, open:C.offer.open }; },
  monetization_set: b => {
    if(b.p_price_cents != null && (b.p_price_cents < 300 || b.p_price_cents > 100000)) return { ok:false, why:'price' };
    if(b.p_price_cents != null) C.offer.price_cents = b.p_price_cents;
    if(b.p_enabled && !C.offer.price_cents) return { ok:false, why:'price_first' };
    if(b.p_enabled && !C.offer.payout_method) return { ok:false, why:'payout_first' };
    C.offer.enabled = b.p_enabled; if(b.p_enabled) C.visibility = 'subscribers';
    C.offer.open = C.offer.enabled && C.visibility === 'subscribers'; return { ok:true, monetized:b.p_enabled, open:C.offer.open }; },
  creator_payout_set: b => { C.offer.payout_method = b.p_method; C.offer.payout_fin = b.p_handle.slice(-4); return null; },
};
const browser = await launch();
const { pg, log } = await page(browser, { dir:'com', origin:'https://www.totehm.com', rpc });
await pg.goto('https://www.totehm.com/console');
await pg.waitForFunction(() => window.__totehm_console && window.__totehm_console().loaded, null, { timeout:15000 });
let d = await pg.evaluate(() => window.__totehm_console());
ok(d.build === '2026-10-06-menu' && d.period === 'year', 'console on totehm.com, offer per year');
ok(!d.reveal && !/Reveal the Box/i.test(await pg.evaluate(() => document.body.innerText)), 'no Reveal the Box (the boutique is not the console)');
ok(await pg.isDisabled('#open-on') && /Set my price first/i.test(await pg.textContent('#open-note')), 'step 3 waits for steps 1 and 2, and says why');
await pg.screenshot({ path: OUT + '/console_start.png', fullPage:true });

await pg.fill('#price', '2');
await pg.click('#price-save');
await pg.waitForTimeout(300);
ok(/between €3 and €1,000/.test(await pg.textContent('#price-note')), 'price out of range: the rule, in plain words');
await pg.fill('#price', '36');
await pg.click('#price-save');
await pg.waitForFunction(() => window.__totehm_console().steps.price);
ok(/€36 \/ year/.test(await pg.textContent('#ok-price')), 'step 1 done: €36 / year');
await pg.click('#pay-paypal');
await pg.fill('#pay-handle', 'wah@example.test');
await pg.click('#pay-save');
await pg.waitForFunction(() => window.__totehm_console().steps.payout);
ok(log.rpc.some(r => r.name === 'creator_payout_set' && r.body.p_method === 'paypal') && await pg.inputValue('#pay-handle') === '', 'step 2 done: PayPal saved, the handle is not left on screen');
ok(!await pg.isDisabled('#open-on'), 'step 3 unlocked');
await pg.click('#open-on');
await pg.waitForFunction(() => window.__totehm_console().offer_open);
ok(log.rpc.some(r => r.name === 'monetization_set' && r.body.p_enabled === true && r.body.p_price_cents === 3600), 'opened at 36 € / year');
ok(await pg.isVisible('#st-page') && /totehm\.com\/@wah/.test(await pg.textContent('#page-url')), 'open: my page, its link and a post to copy');
ok(await pg.$eval('[data-vis=subscribers]', e => e.classList.contains('is-on')), 'opening lets my subscribers read my TOTEHM (server)');
ok(/My subscribers/i.test(await pg.textContent('#s-fans')) && /nia/.test(await pg.textContent('#fans')), 'finds my subscribers');
ok(/kai/.test(await pg.textContent('#subs')) && /\/ year/i.test(await pg.textContent('#subs')) && !!await pg.$('[data-cancel=kai]'), 'my subscriptions, per year, stoppable');
ok(await pg.$eval('a[href="/search"]', e => !!e.offsetWidth), 'find a TOTEHM → /search');
const bot = (await pg.textContent('#bot')).replace(/€/g, '');
ok(/7 \/ month/i.test(bot) && /separate from any TOTEHM subscription/i.test(bot), 'TotehmBot monthly, distinct from the creator subscription');
const white = await pg.evaluate(() => [...document.querySelectorAll('body *')].filter(e => /^rgba?\(255, 255, 255(, 1)?\)$/.test(getComputedStyle(e).backgroundColor) && e.offsetWidth > 20).length);
ok(white === 0, 'no white background');
ok(!/Bebas/i.test(await pg.content()), 'no Bebas Neue');
await pg.screenshot({ path: OUT + '/console.png', fullPage:true });
await pg.click('#member');
const items = await pg.$$eval('#menu .m-it', l => l.map(e => e.textContent));
ok(items.at(-1) === 'Simple terms of use', 'terms last in the member menu: ' + items.join(' | '));
log.errors = log.errors.filter(e => !/404|Failed to load resource/i.test(e));
ok(!log.errors.length, 'no page error: ' + log.errors.join(' | '));
await browser.close();
