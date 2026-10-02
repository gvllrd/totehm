// 02/10/2026 — figher.club (porte : Get Higher, Lisbon, deux clés) et
// higher.boutique (accueil Streetwear + Luxe, page /luxury). Zéro réseau.
// LANCER : node club_luxury.mjs /tmp
import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '.';
const browser = await launch();
const geo = lisbon => async url => url.pathname === '/api/geo'
  ? { status:200, contentType:'application/json', body: JSON.stringify({ country: lisbon ? 'PT' : 'FR', lisbon }) } : null;

// ── 1. La porte, connecté : THP oui, Habit non, acheteur, au Portugal
{
  const { pg, log } = await page(browser, { dir:'club', origin:'https://www.figher.club', network: geo(true),
    rpc: { figher_access: { signed_in:true, thp:true, habit:false, member:false, number:7, pseudo:'wah' } },
    functions: { 'stoner-gate': { access:true } } });
  await pg.goto('https://www.figher.club/');
  await pg.waitForFunction(() => window.__totehm_club && window.__totehm_club().higher_gate === true && window.__totehm_club().lisbon === true);
  const d = await pg.evaluate(() => window.__totehm_club());
  ok(d.build === '2026-10-02' && d.figher.thp && !d.figher.habit && !d.figher.member, 'door reads two keys from figher_access');
  ok(await pg.getAttribute('#higher-btn', 'href') === '/stoner', 'Get Higher sends a buyer straight to the method');
  ok(await pg.isVisible('#lisbon-btn'), 'Lisbon button revealed in PT');
  ok(/#007/.test(await pg.textContent('#st1-ok')) && /missing/.test(await pg.textContent('#st2-ok')), 'keys: THP #007 · Habit missing');
  ok(/Write my first Habit/.test(await pg.textContent('#cta')), 'one button follows the missing key');
  ok(!(await pg.content()).match(/annual|velvet|compatibility/i), 'no annual, no velvet rope, no compatibility');
  ok(log.errors.length === 0, 'door: no page error ' + log.errors.join(' | '));
  await pg.screenshot({ path: OUT + '/club_door.png', fullPage:true });
}

// ── 2. La porte, invité, hors Portugal
{
  const { pg, log } = await page(browser, { dir:'club', origin:'https://www.figher.club', network: geo(false), session:false });
  await pg.goto('https://www.figher.club/');
  await pg.waitForFunction(() => window.__totehm_club && window.__totehm_club().build);
  await pg.waitForTimeout(300);
  ok(await pg.getAttribute('#higher-btn', 'href') === '/discover', 'guest: Get Higher opens the wall');
  ok(!(await pg.isVisible('#lisbon-btn')), 'guest outside PT: Lisbon stays hidden');
  ok(/Sign in/.test(await pg.textContent('#cta')), 'guest: sign in to check keys');
  ok(log.errors.length === 0, 'guest door: no page error ' + log.errors.join(' | '));
}

// ── 3. Les pages déplacées se servent depuis figher.club
for(const f of ['discover', 'discover_lisbon', 'get_higher', 'stoner', 'origins', 'play_lisbon_street', 'stoner_terms']){
  const { pg } = await page(browser, { dir:'club', origin:'https://www.figher.club', session:false,
    functions: { 'higher-checkout': { amount:1700, currency:'usd', left:776994 } } });
  const r = await pg.goto('https://www.figher.club/' + f);
  ok(r.status() === 200, 'figher.club/' + f + ' served');
  await pg.context().close();
}

// ── 4. Luxe : propriétaire du THP → pièce, note, conditions, paiement
{
  const { pg, ctx, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique',
    rpc: { luxury_access: { signed_in:true, thp:true, open:true, price_cents:50000, currency:'eur', orders:0 } } });
  const bodies = [];
  await ctx.route('https://abujjbkbbiumxrokozph.supabase.co/functions/v1/luxury-checkout', r => {
    bodies.push(JSON.parse(r.request().postData() || '{}'));
    r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ url:'https://checkout.stripe.test/lux' }) }); });
  await ctx.route('https://checkout.stripe.test/**', r => r.fulfill({ status:200, contentType:'text/html', body:'<h1>stripe</h1>' }));
  await pg.goto('https://www.higher.boutique/luxury');
  await pg.waitForFunction(() => window.__totehm_luxury && window.__totehm_luxury().price_loaded);
  ok(/€500/.test(await pg.textContent('#launch')), 'price from the server: €500');
  ok(await pg.isVisible('#form') && !(await pg.isVisible('#s-nothp')), 'THP owner sees the form');
  await pg.click('[data-piece="jacket"]');
  await pg.fill('#note', 'black leather jacket');
  await pg.click('#launch');
  ok(/tick the box/.test(await pg.textContent('#launch-n')) && bodies.length === 0, 'terms must be ticked first');
  await pg.check('#terms');
  await pg.click('#launch');
  await pg.waitForURL('https://checkout.stripe.test/lux');
  ok(bodies.length === 1 && bodies[0].piece === 'jacket' && bodies[0].note === 'black leather jacket' && bodies[0].price_cents === undefined,
    'checkout gets piece + note, never a price');
  ok(log.errors.length === 0, 'luxury: no page error ' + log.errors.join(' | '));
}

// ── 5. Luxe : sans THP → Get Higher, pas de formulaire
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique',
    rpc: { luxury_access: { signed_in:true, thp:false, open:true, price_cents:50000, currency:'eur', orders:0 } } });
  await pg.goto('https://www.higher.boutique/luxury');
  await pg.waitForFunction(() => window.__totehm_luxury && window.__totehm_luxury().signed_in);
  ok(await pg.isVisible('#s-nothp') && !(await pg.isVisible('#form')), 'no THP: Get Higher instead of the form');
  ok(log.errors.length === 0, 'luxury no THP: no page error ' + log.errors.join(' | '));
  await pg.screenshot({ path: OUT + '/luxury_nothp.png', fullPage:true });
}

// ── 6. L'accueil de la boutique : Streetwear + Luxe, plus de Get Higher en tête, plus de logos
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', session:false });
  await pg.goto('https://www.higher.boutique/');
  await pg.waitForFunction(() => window.__totehm_boutique);
  const d = await pg.evaluate(() => window.__totehm_boutique());
  ok(d.build === '2026-10-02' && d.luxury_link && d.club_links === 2 && d.logos === 0, 'boutique home: /luxury, 2 club links, 0 logo');
  ok(!(await pg.$('#higher-btn')) && !(await pg.$('#lisbon-btn')), 'Get Higher / Lisbon left the boutique menu');
  ok(/Not affiliated/.test(await pg.textContent('.lux-block')), 'brand names + independence line');
  ok(log.errors.length === 0, 'boutique home: no page error ' + log.errors.join(' | '));
}

await browser.close();
