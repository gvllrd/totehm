// totehm.com/console (01/10/2026) — la console vit sur la source.
import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '.';
const C = { signed_in:true, pseudo:'wah', visibility:'private',
  offer:{ enabled:false, open:false, price_cents:3600, currency:'eur', period:'year', payout_method:'iban', payout_fin:'1234', part:80 },
  subscribers:{ count:1, list:[{ pseudo:'nia', status:'active', since:'2026-09-01', renews:'2027-09-01', ending:false }] },
  subscriptions:[{ creator:'kai', price_cents:2400, currency:'eur', status:'active', renews:'2027-05-01', since:'2026-05-01', ending:false }],
  earnings:{ balances:[{ currency:'eur', earned_cents:2880, pending_cents:2880, paid_cents:0 }], threshold_cents:2500, next_payout:'2026-11-01', recent:[] },
  payouts:[], bot:{ active:false, price_cents:700, currency:'eur', period:'month' }, membership:null, rules:{} };
const rpc = {
  my_console: () => C,
  visibility_set: b => { C.visibility = b.p_visibility; return { ok:true, visibility:b.p_visibility, subscribers:1, open:false }; },
  monetization_set: b => { C.offer.enabled = b.p_enabled; C.offer.open = b.p_enabled && C.visibility === 'subscribers'; return { ok:true, monetized:b.p_enabled }; },
  totehm_search: [{ pseudo:'kai', offer:true, price_cents:2400, currency:'eur', subscribed:true }, { pseudo:'kaito', offer:true, price_cents:1200, currency:'eur', subscribed:false }],
};
const browser = await launch();
const { pg, log } = await page(browser, { dir:'com', origin:'https://www.totehm.com', rpc });
await pg.goto('https://www.totehm.com/console');
await pg.waitForFunction(() => window.__totehm_console && window.__totehm_console().loaded, null, { timeout:15000 });
let d = await pg.evaluate(() => window.__totehm_console());
ok(d.build === '2026-10-02' && d.period === 'year', 'console on totehm.com, offer per year');
const txt = await pg.evaluate(() => document.body.innerText);
ok(/Who sees my TOTEHM/i.test(txt) && /Private/i.test(txt) && /Visible to my subscribers/i.test(txt), 'two visibility settings');
ok(/My subscribers/i.test(txt) && /nia/.test(txt), 'finds my subscribers');
ok(/My subscriptions/i.test(txt) && /kai/.test(txt) && /\/ year/i.test(txt), 'manages my subscriptions, per year');
ok(/7 \/ month/i.test(txt.replace(/€/g, '')) && /separate from any TOTEHM subscription/i.test(txt), 'TotehmBot monthly, distinct from the creator subscription');
await pg.click('[data-vis="subscribers"]');
await pg.waitForTimeout(300);
ok(log.rpc.some(r => r.name === 'visibility_set' && r.body.p_visibility === 'subscribers'), 'visibility_set called');
await pg.click('#off-on');
await pg.waitForTimeout(300);
ok(log.rpc.some(r => r.name === 'monetization_set' && r.body.p_enabled === true && r.body.p_price_cents === 3600), 'offer turned on at 36 € / year');
// 02/10 : un post prêt à publier — la phrase de Wah + le lien /@nom, jamais un prix.
ok(!await pg.$eval('#post', e => e.classList.contains('hide')) && !await pg.$eval('#link', e => e.classList.contains('hide')), 'offer open: the link AND a ready-to-publish post can be copied');

await pg.fill('#find', 'kai');
await pg.waitForTimeout(500);
ok(/subscribed/.test(await pg.textContent('#found')) && /12 \/ year/.test((await pg.textContent('#found')).replace(/€/g, '')), 'search a TOTEHM to subscribe: name + offer only');
const white = await pg.evaluate(() => [...document.querySelectorAll('body *')].filter(e => /^rgba?\(255, 255, 255(, 1)?\)$/.test(getComputedStyle(e).backgroundColor) && e.offsetWidth > 20).length);
ok(white === 0, 'no white background');
ok(!/Bebas/i.test(await pg.content()), 'no Bebas Neue');
await pg.click('#member');
const items = await pg.$$eval('#menu .m-it', l => l.map(e => e.textContent));
ok(items.at(-1) === 'Simple terms of use', 'terms last in the member menu: ' + items.join(' | '));
await pg.screenshot({ path: OUT + '/console.png', fullPage:true });
log.errors = log.errors.filter(e => !/404|Failed to load resource/i.test(e));
ok(!log.errors.length, 'no page error: ' + log.errors.join(' | '));
await browser.close();
