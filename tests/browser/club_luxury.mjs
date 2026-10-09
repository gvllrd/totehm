// 09/10/2026 — figher.club (se retrouver : les spots) ; Get Higher, Lisbon, Origins et le marché revenus sur la boutique ;
// higher.boutique (page /luxury sur devis, 05/10 ; l'accueil : boutique_home.mjs). Zéro réseau.
// LANCER : node club_luxury.mjs /tmp
import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '.';
const browser = await launch();
const geo = lisbon => async url => url.pathname === '/api/geo'
  ? { status:200, contentType:'application/json', body: JSON.stringify({ country: lisbon ? 'PT' : 'FR', lisbon }) } : null;

// ── 1. figher.club (09/10) = SE RETROUVER : les spots, à venir · en cours · passés
{
  const SP = (id, state, habit, h) => ({ id, state, habit, city:'Lisbon', creator:'Vallerand', mode: state==='was' ? 'silent' : 'social',
    starts_at: new Date(Date.now() + h*3600e3).toISOString(), duration_min:45, exact:null, intentions:['focus'] });
  let mint = null;
  const { pg, log } = await page(browser, { dir:'club', origin:'https://www.figher.club',
    rpc: { figher_access: { signed_in:true, thp:true, habit:true, member:true, number:7, pseudo:'wah' },
           spots_list: { ok:true, spots:[SP('n1','will','Run the hill',20), SP('n2','will','Deep practice',44)], more:false },
           spots_feed: { spots:[SP('a1','am','Cold shower',-0.2), SP('p1','was','Meditation',-30)] } },
    functions: { 'sso-mint': b => { mint = b.target; return { code:'c'.repeat(64) }; } },
    network: url => url.host === 'www.totehm.space' ? { status:200, contentType:'text/html', body:'<p>space</p>' } : null });
  await pg.goto('https://www.figher.club/meet');
  await pg.waitForFunction(() => window.__totehm_club && window.__totehm_club().spots.charge);
  const d = await pg.evaluate(() => window.__totehm_club());
  ok(d.build === '2026-10-09-meet' && d.page === 'meet' && d.spots.next === 2 && d.spots.now === 1 && d.spots.past === 1, 'club: next · now · past read from spots_list / spots_feed');
  ok(/MEET\s*IN REALITY/i.test(await pg.textContent('h1')), 'club: « Meet in reality. »');
  const c = await pg.$$eval('#sp-list .sp-card', l => l.map(x => x.textContent));
  ok(c.length === 2 && /I will be here/.test(c[0]) && /Run the hill/.test(c[0]) && /Vallerand/.test(c[0]), 'next: two spots, the Habit, the host');
  await pg.click('[data-sp="past"]');
  ok(/I was there/.test(await pg.textContent('#sp-list')) && /Meditation/.test(await pg.textContent('#sp-list')), 'past: I was there');
  const html = await pg.content();
  ok(!/href="\/(discover|market|origins|get_higher|stoner)"/.test(html) && !document_has(html, 'Two keys'), 'club: no Get Higher, market or Origins left on the door');
  ok(/totehm\.com · strategy/.test(html) && /totehm\.space · inspiration/.test(html) && /higher\.boutique · wear &amp; own/.test(html), 'footer: each domain says its function');
  await pg.click('#sp-list .sp-card');
  await pg.waitForURL('https://www.figher.club/?spot=p1');
  ok(mint === null && pg.url() === 'https://www.figher.club/?spot=p1', 'a Meet spot opens on the same Club domain (' + pg.url() + ')');
  ok(log.errors.filter(e => e.startsWith('pageerror')).length === 0, 'club: no page error ' + log.errors.join(' | '));
}
function document_has(h, t){ return h.includes(t); }

// ── 2. figher.club, invité : la ville pour tous, rien à vendre
{
  const { pg, log } = await page(browser, { dir:'club', origin:'https://www.figher.club', session:false,
    rpc: { spots_list: { ok:true, spots:[], more:false }, spots_feed: { spots:[] } } });
  await pg.goto('https://www.figher.club/meet');
  await pg.waitForFunction(() => window.__totehm_club && window.__totehm_club().spots.charge);
  ok(/No spot announced yet/.test(await pg.textContent('#sp-list')) && /CONNECT WITH MY TOTEHM/.test(await pg.textContent('#member-txt')), 'guest: an empty « next », connect with my TOTEHM');
  await pg.screenshot({ path: OUT + '/club_meet.png', fullPage:true });
  ok(log.errors.filter(e => e.startsWith('pageerror')).length === 0, 'guest club: no page error ' + log.errors.join(' | '));
}

// ── 3. Les pages revenues sur higher.boutique (09/10) ; l'accueil de la boutique les ouvre
for(const f of ['discover', 'discover_lisbon', 'get_higher', 'stoner', 'origins', 'play_lisbon_street', 'stoner_terms', 'market']){
  const { pg } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', session:false,
    functions: { 'higher-checkout': { amount:1700, currency:'usd', left:776994 } } });
  const r = await pg.goto('https://www.higher.boutique/' + f);
  ok(r.status() === 200, 'higher.boutique/' + f + ' served');
  await pg.context().close();
}
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', network: geo(true),
    rpc: { figher_access: { signed_in:true, thp:true, habit:true, member:true, pseudo:'wah' } }, functions: { 'stoner-gate': { access:true } } });
  await pg.goto('https://www.higher.boutique/');
  await pg.waitForFunction(() => document.getElementById('higher-btn')?.getAttribute('href') === '/stoner', null, { timeout:5000 }).catch(()=>{});
  ok(await pg.getAttribute('#higher-btn', 'href') === '/stoner' && await pg.isVisible('#lisbon-btn'), 'boutique: Get Higher → the method for a THP owner; Lisbon in PT');
  ok(await pg.locator('a[href="/market"]').count() === 1 && await pg.locator('a[href="/origins"]').count() === 1, 'boutique: the art market and Origins');
  ok(/physical & digital · wear it · own it/i.test(await pg.textContent('.fn-line')) && /HIGHER\.BOUTIQUE — wear it, own it/.test(await pg.title()), 'boutique: its function, said once');
  ok(log.errors.filter(e => e.startsWith('pageerror')).length === 0, 'boutique home: no page error ' + log.errors.join(' | '));
}

// ── 4. Luxe SUR DEVIS (05/10) : THP → pièce, marque, Box → demande ; un devis prêt → paiement
{
  const QUOTED = { id:'q2', piece:'jacket', brand:'Gucci', note:'black leather', status:'quoted', quote_cents:80000, currency:'eur',
    quote_note:'Ready in 3 weeks', view:'habits', text:'Run the hill', palette:['#E24B4A'], created_at:'2026-10-05T10:00:00Z' };
  let quotes = [QUOTED];
  const access = () => ({ mode:'quote', signed_in:true, thp:true, open:true, price_cents:50000, currency:'eur', orders:0, admin:false, test_mode:false, quotes });
  const { pg, ctx, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique',
    rpc: { luxury_access: access, my_trips: { trips:[], reps:[], wisdom:[], visions:[] },
           my_box_matter: { text:'Run the hill', view:'habits', palette:['#E24B4A'], matter:{}, extra:{} },
           name_available: b => !/^0\.taken$/i.test(b.candidate) },
    tables: { profiles:[{ pseudo:'Vallerand' }], totehms:[{ steps:[{ t:'Run the hill', f:'every_morning', is:['fight'] }] }],
              artistic_styles:[{ id:'11111111-1111-4111-8111-111111111111', name:'Ink Realism', image_url:null, status:'active', position:1, active:true },
                               { id:'22222222-2222-4222-8222-222222222222', name:'Neon Glitch', image_url:null, status:'active', position:2, active:true }] } });
  const bodies = { quote:[], checkout:[] };
  await ctx.route('https://abujjbkbbiumxrokozph.supabase.co/functions/v1/luxury-quote', r => {
    const b = JSON.parse(r.request().postData() || '{}'); bodies.quote.push(b);
    if(b.action === 'request') quotes = [{ id:'q3', piece:b.piece, brand:b.brand, note:b.note, status:'requested', quote_cents:null, currency:'eur', view:'habits', text:'Run the hill', palette:['#E24B4A'], created_at:'2026-10-05T11:00:00Z', name:'0.' + b.name, style:'Neon Glitch' }, ...quotes];
    r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ ok:true, id:'q3', status:'requested', name:'0.' + b.name }) }); });
  await ctx.route('https://abujjbkbbiumxrokozph.supabase.co/functions/v1/luxury-checkout', r => {
    bodies.checkout.push(JSON.parse(r.request().postData() || '{}'));
    r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ url:'https://checkout.stripe.test/lux' }) }); });
  await ctx.route('https://checkout.stripe.test/**', r => r.fulfill({ status:200, contentType:'text/html', body:'<h1>stripe</h1>' }));
  await pg.goto('https://www.higher.boutique/luxury');
  await pg.waitForFunction(() => window.__totehm_luxury && window.__totehm_luxury().price_loaded);
  const d0 = await pg.evaluate(() => window.__totehm_luxury());
  ok(d0.build === '2026-10-08-no-palette' && d0.mode === 'quote' && d0.quoted === 1 && d0.joystick, 'luxury: quote mode, one quote ready, joystick');
  ok(!(await pg.$('#quotes .pals')), 'no colour palette on screen (Wah, 08/10 bis)');
  ok(/on quote · from €500/.test(await pg.textContent('#price')), 'the floor price from the server: on quote · from €500');
  ok(/€800/.test(await pg.textContent('#quotes')) && /Ready in 3 weeks/.test(await pg.textContent('#quotes')), 'my quote: €800 and Wah\'s word');
  ok((await pg.textContent('#nav-say')) === 'Pay', 'joystick center says PAY when a quote is ready');
  await pg.screenshot({ path: OUT + '/luxury_quote.png', fullPage:true });
  // la demande : pièce, marque, Box
  await pg.click('[data-piece="shoes"]'); await pg.click('[data-brand="Louis Vuitton"]');
  await pg.fill('#note', 'white sneakers');
  await pg.click('#ask');
  ok(/pick up the element/.test(await pg.textContent('#ask-n')) && bodies.quote.length === 0, 'no element, no request (on screen: element, never box)');
  await pg.click('#pick-box');
  await pg.waitForSelector('#sel.is-open #list .bx');
  await pg.click('#list .bx'); await pg.waitForSelector('#mt-go'); await pg.click('#mt-go');
  await pg.waitForSelector('#picked:not(.hide)');
  ok(/Run the hill/.test(await pg.textContent('#picked')), 'the element is picked from my TOTEHM (select mode)');
  // 06/10 (ter) : le style du moment et le nom 0.{Nom}, exigés avant la demande
  ok((await pg.$$eval('#style-track .style-item', l => l.map(e => e.textContent))).join('|') === 'Ink Realism|Neon Glitch', 'the styles of the moment, from artistic_styles');
  await pg.click('#ask');
  ok(/choose the style/.test(await pg.textContent('#ask-n')) && bodies.quote.length === 0, 'no style, no request');
  await pg.click('#style-track .style-item >> nth=1');
  await pg.click('#ask');
  ok(/engrave its name/.test(await pg.textContent('#ask-n')) && bodies.quote.length === 0, 'no name, no request');
  ok((await pg.textContent('#name-prefix')) === '0.', 'the name starts with 0. (this year of the collection)');
  await pg.fill('#name-input', 'taken'); await pg.waitForFunction(() => /already taken/.test(document.getElementById('name-note').textContent));
  ok(!(await pg.evaluate(() => window.__totehm_luxury().named)), 'a taken name is refused live (name_available)');
  await pg.fill('#name-input', 'Sneaker Run'); await pg.waitForFunction(() => /available/.test(document.getElementById('name-note').textContent));
  ok(/available/.test(await pg.textContent('#name-note')) && (await pg.textContent('#ask-n')) === '', 'a free name: available, the old warning leaves');
  await pg.screenshot({ path: OUT + '/luxury_style_name.png', fullPage:true });
  await pg.click('#ask');
  await pg.waitForFunction(() => window.__totehm_luxury().quotes === 2);
  const q = bodies.quote[0];
  ok(q.action === 'request' && q.piece === 'shoes' && q.brand === 'Louis Vuitton' && q.note === 'white sneakers' && q.box.kind === 'habit' && q.box.ref === 'Run the hill' && q.price === undefined,
    'request sends piece, brand, note and a box REFERENCE — never a price');
  ok(q.style === '22222222-2222-4222-8222-222222222222' && q.name === 'Sneaker Run', 'request sends the style id and the name WITHOUT its prefix (the server sets 0.)');
  ok(/0\.Sneaker Run/.test(await pg.textContent('#quotes')) && /Neon Glitch/.test(await pg.textContent('#quotes')), 'my quote shows its cloth name and its style');
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
