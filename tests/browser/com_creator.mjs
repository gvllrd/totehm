// totehm.com/search et /@nom (05/10/2026) — un nom ouvre un Totehm ; la page de vente d'un membre.
import { launch, page, ok, USER } from './harness.mjs';
const OUT = process.argv[2] || '.';
const browser = await launch();
const sale = (open = true) => ({ open, price_cents: open ? 2400 : null, currency:'eur', period:'year' });
const viewer = v => Object.assign({ signed_in:true, me:false, subscribed:false, until:null, ending:false, can_read:false }, v);
const KAI = v => ({ ok:true, pseudo:'kai', palette:['fight','focus','love'], sale:sale(), viewer:viewer(v) });
const ROWS = [{ pseudo:'kai', offer:true, price_cents:2400, currency:'eur', subscribed:true }, { pseudo:'kaito', offer:true, price_cents:1200, currency:'eur', subscribed:false }];
const propre = async pg => {
  const white = await pg.evaluate(() => [...document.querySelectorAll('body *')].filter(e => /^rgba?\(255, 255, 255(, 1)?\)$/.test(getComputedStyle(e).backgroundColor) && e.offsetWidth > 20).length);
  const fonts = await pg.evaluate(() => [...new Set([...document.querySelectorAll('body *')].filter(e => e.offsetWidth).map(e => getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim()))]);
  return { white, fonts: fonts.filter(f => !/^(Space Mono|Quantico|monospace|sans-serif)$/.test(f)) };
};
const erreurs = log => log.errors.filter(e => !/404|Failed to load resource/i.test(e));

/* ── 1 · /search : un champ, des noms ─────────────────────────────── */
{
  const { pg, log } = await page(browser, { dir:'com', origin:'https://www.totehm.com', rpc:{ totehm_search: b => b.p_q ? ROWS.filter(r => r.pseudo.startsWith(b.p_q)) : ROWS.filter(r => r.subscribed), my_console: { signed_in:true, offer:{ enabled:false } } },
    tables:{ profiles:[{ pseudo:'wah' }] } });
  await pg.goto('https://www.totehm.com/creator');
  await pg.waitForFunction(() => window.__totehm_creator && window.__totehm_creator().results === 1, null, { timeout:15000 });
  ok(/My subscriptions/i.test(await pg.textContent('#res')), 'empty search: my subscriptions');
  ok(!await pg.$('#search-controls, .ts-modes, select'), 'no modes, no filters, no selects');
  await pg.fill('#q', 'ka');
  await pg.waitForFunction(() => window.__totehm_creator().results === 2);
  const hrefs = await pg.$$eval('#res a', l => l.map(a => a.getAttribute('href')));
  ok(hrefs[0] === '/totehm?ro=kai' && hrefs[1] === '/totehm?ro=kaito', 'a name opens its TOTEHM read only: ' + hrefs.join(' '));
  ok(log.rpc.every(r => r.name !== 'totehm_discover'), 'names only (totehm_search), never box search');
  await pg.fill('#q', 'k');
  await pg.waitForTimeout(400);
  ok(/two letters/i.test(await pg.textContent('#q-note')), 'one letter: two letters, minimum');
  await pg.fill('#q', '@kaito');
  await pg.waitForTimeout(400);
  const nav = pg.waitForURL(/\/totehm\?ro=kaito$/, { timeout:5000 }).then(() => true, () => false);
  await pg.press('#q', 'Enter');
  ok(await nav, 'Enter opens the exact name (an @link is cleaned)');
  ok(!erreurs(log).length, 'search: no page error ' + erreurs(log).join(' | '));
  await pg.goto('https://www.totehm.com/creator?q=ka');
  await pg.waitForFunction(() => window.__totehm_creator && window.__totehm_creator().results === 2, null, { timeout:15000 });
  const p = await propre(pg);
  ok(p.white === 0 && !p.fonts.length, 'search: no white background, Space Mono + Quantico only ' + p.fonts.join(','));
  await pg.screenshot({ path: OUT + '/creator_search.png', fullPage:true });
}

/* ── 2 · /@kai, visiteur sans compte : s'abonner = email, code, paiement ── */
{
  let signed = false;
  const network = url => {
    if(url.pathname === '/auth/v1/verify'){ signed = true;
      return { status:200, contentType:'application/json', body: JSON.stringify({ access_token:'test-at', refresh_token:'test-rt', token_type:'bearer', expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, user:USER }) }; }
    if(url.pathname === '/auth/v1/otp') return { status:200, contentType:'application/json', body:'{}' };
    if(url.host === 'checkout.stripe.com') return { status:200, contentType:'text/html', body:'<title>stripe</title>' };
    return null;
  };
  const { pg, log } = await page(browser, { dir:'com', origin:'https://www.totehm.com', session:false, network,
    rpc:{ creator_page: () => KAI({ signed_in:signed }), my_console:{ signed_in:true, offer:{ enabled:false } } },
    tables:{ profiles:[{ pseudo:null }] },
    functions:{ 'creator-subscribe': { url:'https://checkout.stripe.com/c/test' } } });
  await pg.goto('https://www.totehm.com/creator?n=kai');
  await pg.waitForFunction(() => window.__totehm_creator && window.__totehm_creator().loaded, null, { timeout:15000 });
  const t = await pg.textContent('#offer');
  ok(/€24/.test(t) && /\/ year/i.test(t), 'the yearly price, from the server');
  ok(/kai’s whole TOTEHM/.test(t) && /read only/i.test(t) && /exact place/i.test(t), 'what the subscription opens: the TOTEHM, read only, and the exact place of spaces');
  ok(/80% goes to kai/.test(t), 'the 80/20 split, said plainly');
  ok(await pg.$eval('#who', e => getComputedStyle(e).fontFamily.includes('Quantico') && getComputedStyle(e).color === 'rgb(251, 213, 202)'), 'the name: Quantico Coral on its paper');
  ok(await pg.$$eval('#ints span', l => l.length) === 3, 'three intentions shown');
  const p = await propre(pg);
  ok(p.white === 0 && !p.fonts.length, 'page: no white background, Space Mono + Quantico only ' + p.fonts.join(','));
  await pg.screenshot({ path: OUT + '/creator_visitor.png', fullPage:true });
  await pg.click('[data-do=subscribe]');
  ok(await pg.isVisible('#si-email'), 'Subscribe without an account: email asked here');
  await pg.fill('#si-email', 'nia@example.test');
  await pg.press('#si-email', 'Enter');
  await pg.waitForSelector('#si-code:not(.hide)', { timeout:5000 });
  await pg.screenshot({ path: OUT + '/creator_signin.png', fullPage:true });
  const nav = pg.waitForURL(/checkout\.stripe\.com/, { timeout:8000 }).then(() => true, () => false);
  await pg.fill('#si-code', '123456');
  ok(await nav, 'after the code, checkout opens by itself');
  const f = log.functions.find(x => x.name === 'creator-subscribe');
  ok(f && f.body.pseudo === 'kai' && f.body.from === 'page', 'creator-subscribe {pseudo, from:page}');
  ok(!erreurs(log).length, 'visitor: no page error ' + erreurs(log).join(' | '));
}

/* ── 3 · abonné · propriétaire · fermé · inconnu · privé ─────────────── */
const cas = [
  ['subscribed', KAI({ subscribed:true, until:'2027-05-01', can_read:true }), async pg => /Renews 1 May 2027/.test(await pg.textContent('#offer')) && !!await pg.$('[data-do=open]') && !await pg.$('[data-do=subscribe]')],
  ['me', Object.assign(KAI({ me:true }), { pseudo:'kai' }), async pg => /This is your page/i.test(await pg.textContent('#offer')) && !!await pg.$('[data-do=copy]') && !!await pg.$('a[href="/console"]') && !await pg.$('[data-do=subscribe]')],
  ['closed', Object.assign(KAI({}), { sale:sale(false) }), async pg => /Not open yet/i.test(await pg.textContent('#offer')) && !await pg.$('[data-do=subscribe]')],
  ['nobody', { ok:false, why:'nobody' }, async pg => /No TOTEHM by that name/i.test(await pg.textContent('#offer'))],
  ['private', { ok:false, why:'private' }, async pg => /This TOTEHM is private/i.test(await pg.textContent('#offer'))],
];
for(const [nom, data, test] of cas){
  const { pg, log } = await page(browser, { dir:'com', origin:'https://www.totehm.com', rpc:{ creator_page:data, my_console:{ signed_in:true, offer:{ enabled:true } } }, tables:{ profiles:[{ pseudo:'wah' }] },
    viewport: nom === 'me' ? { width:1280, height:900 } : { width:390, height:844 } });
  await pg.goto('https://www.totehm.com/creator?n=kai');
  await pg.waitForFunction(() => window.__totehm_creator && window.__totehm_creator().loaded, null, { timeout:15000 });
  ok(await test(pg), nom + ': the one right action');
  ok(!erreurs(log).length, nom + ': no page error ' + erreurs(log).join(' | '));
  await pg.screenshot({ path: OUT + '/creator_' + nom + '.png', fullPage:true });
}

/* ── 4 · le retour de Stripe : on attend le webhook ─────────────────── */
{
  let n = 0;
  const { pg } = await page(browser, { dir:'com', origin:'https://www.totehm.com', rpc:{ creator_page: () => KAI(++n > 2 ? { subscribed:true, until:'2027-10-05', can_read:true } : {}), my_console:{ signed_in:true, offer:{ enabled:false } } }, tables:{ profiles:[{ pseudo:'nia' }] } });
  await pg.goto('https://www.totehm.com/creator?n=kai&subscribed=1');
  await pg.waitForFunction(() => window.__totehm_creator && window.__totehm_creator().subscribed, null, { timeout:15000 });
  await pg.waitForTimeout(200);
  ok(/you are subscribed/i.test(await pg.textContent('#note')) && !/subscribed=/.test(pg.url()), 'back from Stripe: waits for the webhook, then says subscribed');
}
await browser.close();
