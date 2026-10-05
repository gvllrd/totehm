// 02/10/2026 — figher.club (porte : Get Higher, Lisbon, deux clés) et
// higher.boutique (page /luxury sur devis, 05/10 ; l'accueil : boutique_home.mjs). Zéro réseau.
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
  ok(d.build === '2026-10-05-spaces-boxes' && d.figher.thp && !d.figher.habit && !d.figher.member, 'door reads two keys from figher_access');
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
  ok(/CONNECT WITH MY TOTEHM/.test(await pg.textContent('#cta')), 'guest: connect to check keys');
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

// ── 4. Luxe SUR DEVIS (05/10) : THP → pièce, marque, Box → demande ; un devis prêt → paiement
{
  const QUOTED = { id:'q2', piece:'jacket', brand:'Gucci', note:'black leather', status:'quoted', quote_cents:80000, currency:'eur',
    quote_note:'Ready in 3 weeks', view:'habits', text:'Run the hill', palette:['#E24B4A'], created_at:'2026-10-05T10:00:00Z' };
  let quotes = [QUOTED];
  const access = () => ({ mode:'quote', signed_in:true, thp:true, open:true, price_cents:50000, currency:'eur', orders:0, admin:false, test_mode:false, quotes });
  const { pg, ctx, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique',
    rpc: { luxury_access: access, my_trips: { trips:[], reps:[], wisdom:[], visions:[] },
           my_box_matter: { text:'Run the hill', view:'habits', palette:['#E24B4A'], matter:{}, extra:{} } },
    tables: { profiles:[{ pseudo:'Vallerand' }], totehms:[{ steps:[{ t:'Run the hill', f:'every_morning', is:['fight'] }] }] } });
  const bodies = { quote:[], checkout:[] };
  await ctx.route('https://abujjbkbbiumxrokozph.supabase.co/functions/v1/luxury-quote', r => {
    const b = JSON.parse(r.request().postData() || '{}'); bodies.quote.push(b);
    if(b.action === 'request') quotes = [{ id:'q3', piece:b.piece, brand:b.brand, note:b.note, status:'requested', quote_cents:null, currency:'eur', view:'habits', text:'Run the hill', palette:['#E24B4A'], created_at:'2026-10-05T11:00:00Z' }, ...quotes];
    r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ ok:true, id:'q3', status:'requested' }) }); });
  await ctx.route('https://abujjbkbbiumxrokozph.supabase.co/functions/v1/luxury-checkout', r => {
    bodies.checkout.push(JSON.parse(r.request().postData() || '{}'));
    r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ url:'https://checkout.stripe.test/lux' }) }); });
  await ctx.route('https://checkout.stripe.test/**', r => r.fulfill({ status:200, contentType:'text/html', body:'<h1>stripe</h1>' }));
  await pg.goto('https://www.higher.boutique/luxury');
  await pg.waitForFunction(() => window.__totehm_luxury && window.__totehm_luxury().price_loaded);
  const d0 = await pg.evaluate(() => window.__totehm_luxury());
  ok(d0.build === '2026-10-05-quote' && d0.mode === 'quote' && d0.quoted === 1 && d0.joystick, 'luxury: quote mode, one quote ready, joystick');
  ok(/on quote · from €500/.test(await pg.textContent('#price')), 'the floor price from the server: on quote · from €500');
  ok(/€800/.test(await pg.textContent('#quotes')) && /Ready in 3 weeks/.test(await pg.textContent('#quotes')), 'my quote: €800 and Wah\'s word');
  ok((await pg.textContent('#nav-say')) === 'Pay', 'joystick center says PAY when a quote is ready');
  await pg.screenshot({ path: OUT + '/luxury_quote.png', fullPage:true });
  // la demande : pièce, marque, Box
  await pg.click('[data-piece="shoes"]'); await pg.click('[data-brand="Louis Vuitton"]');
  await pg.fill('#note', 'white sneakers');
  await pg.click('#ask');
  ok(/pick up the box/.test(await pg.textContent('#ask-n')) && bodies.quote.length === 0, 'no box, no request');
  await pg.click('#pick-box');
  await pg.waitForSelector('#sel.is-open #list .bx');
  await pg.click('#list .bx'); await pg.waitForSelector('#mt-go'); await pg.click('#mt-go');
  await pg.waitForSelector('#picked:not(.hide)');
  ok(/Run the hill/.test(await pg.textContent('#picked')), 'the box is picked from my TOTEHM (select mode)');
  await pg.click('#ask');
  await pg.waitForFunction(() => window.__totehm_luxury().quotes === 2);
  const q = bodies.quote[0];
  ok(q.action === 'request' && q.piece === 'shoes' && q.brand === 'Louis Vuitton' && q.note === 'white sneakers' && q.box.kind === 'habit' && q.box.ref === 'Run the hill' && q.price === undefined,
    'request sends piece, brand, note and a box REFERENCE — never a price');
  ok(/waiting for our quote/.test(await pg.textContent('#quotes')), 'the new request waits for the quote');
  // payer le devis prêt : conditions d'abord
  await pg.click('[data-pay="q2"]');
  ok(/tick the box/.test(await pg.textContent('[data-n="q2"]')) && bodies.checkout.length === 0, 'terms must be ticked first');
  await pg.check('[data-terms="q2"]');
  await pg.click('[data-pay="q2"]');
  await pg.waitForURL('https://checkout.stripe.test/lux');
  ok(bodies.checkout.length === 1 && bodies.checkout[0].quote_id === 'q2' && bodies.checkout[0].price_cents === undefined, 'checkout gets the quote id, never a price');
  ok(log.errors.length === 0, 'luxury: no page error ' + log.errors.join(' | '));
}

// ── 5. Luxe : sans THP → Get Higher, pas de formulaire ; un administrateur répond par un prix
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique',
    rpc: { luxury_access: { mode:'quote', signed_in:true, thp:false, open:true, price_cents:50000, currency:'eur', orders:0, admin:false, test_mode:false, quotes:[] } } });
  await pg.goto('https://www.higher.boutique/luxury');
  await pg.waitForFunction(() => window.__totehm_luxury && window.__totehm_luxury().signed_in);
  ok(await pg.isVisible('#s-nothp') && !(await pg.isVisible('#form')) && (await pg.textContent('#nav-say')) === 'Get Higher', 'no THP: Get Higher instead of the form, joystick says so');
  ok(log.errors.length === 0, 'luxury no THP: no page error ' + log.errors.join(' | '));
  await pg.screenshot({ path: OUT + '/luxury_nothp.png', fullPage:true });
  await pg.context().close();
}
{
  const REQ = { id:'q9', pseudo:'nia', email:'nia@example.test', piece:'bag', brand:'Hermès', note:'Birkin 30', status:'requested', quote_cents:null, currency:'eur', view:'wisdom', text:'Less is more', palette:['#7F77DD'], test:false, created_at:'2026-10-05T09:00:00Z' };
  const { pg, ctx, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique',
    rpc: { luxury_access: { mode:'quote', signed_in:true, thp:true, open:true, price_cents:50000, currency:'eur', orders:0, admin:true, test_mode:true, quotes:[] },
           luxury_quotes_admin: { quotes:[REQ] } } });
  const sent = [];
  await ctx.route('https://abujjbkbbiumxrokozph.supabase.co/functions/v1/luxury-quote', r => { sent.push(JSON.parse(r.request().postData() || '{}'));
    r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ ok:true, status:'quoted' }) }); });
  await pg.goto('https://www.higher.boutique/luxury');
  await pg.waitForFunction(() => window.__totehm_luxury && window.__totehm_luxury().to_answer === 1);
  ok(/test mode · card 4242/.test(await pg.textContent('#test-badge')), 'a tester sees Stripe test mode, said plainly');
  await pg.click('[data-price="q9"]');
  ok(/a price, in €/.test(await pg.textContent('[data-a="q9"]')) && sent.length === 0, 'admin: no price, nothing sent');
  await pg.fill('[data-cents="q9"]', '1200'); await pg.fill('[data-word="q9"]', 'Four weeks');
  await pg.click('[data-price="q9"]');
  for(let i = 0; i < 40 && !sent.length; i++) await pg.waitForTimeout(100);
  ok(sent.length === 1 && sent[0].action === 'price' && sent[0].quote_id === 'q9' && sent[0].cents === 120000 && sent[0].note === 'Four weeks', 'admin: the price leaves in cents with a word');
  await pg.screenshot({ path: OUT + '/luxury_admin.png', fullPage:true });
  ok(log.errors.length === 0, 'luxury admin: no page error ' + log.errors.join(' | '));
}

// ── 6. L'accueil de la boutique — voir boutique_home.mjs (la manette, 05/10)

await browser.close();
