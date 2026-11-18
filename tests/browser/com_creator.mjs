// totehm.com/@nom (05/10/2026) — la page de vente d'un membre ; `/search` mène au verso du TOTEHM (18/11).
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

/* ── 1 · 18/11 : `/search` n'est plus une page — la recherche de [Members] vit sur le VERSO du TOTEHM ── */
for(const [qui, opts] of [['visitor', { session:false }], ['member', { tables:{ profiles:[{ pseudo:'wah' }] } }]]){
  const { pg, log } = await page(browser, Object.assign({ dir:'com', origin:'https://www.totehm.com',
    rpc:{ totehm_search: ROWS, figher_access: { signed_in:qui !== 'visitor', member:true } } }, opts));
  const vers = pg.waitForURL(/\/totehm\?members=kai$/, { timeout:9000 }).then(() => true, () => false);
  await pg.goto('https://www.totehm.com/creator?q=kai');
  ok(await vers, '18/11 · ' + qui + ': an old /search?q=kai link goes to the verso of the TOTEHM (' + pg.url().replace('https://www.totehm.com', '') + ')');
  ok(!log.rpc.some(r => r.name === 'totehm_search'), '18/11 · ' + qui + ': the old name list is never asked for');
  await pg.context().close();
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
  const t = await pg.textContent('#dc');
  ok(/€24/.test(t) && /\/ year/i.test(t), 'the yearly price, from the server');
  /* 15/11 (Wah : « une page doit respecter le 60 / 30 / 10 ») : UNE idée par écran, au geste. 18/11 (Wah : « ce Discover est
     BEAUCOUP mieux que l'actuel ») : SON texte, mot pour mot — l'esprit des meilleurs, leurs spots, les rencontrer, l'accès pur. */
  ok(/Inside the mind of top performers/.test(t) && /their living autobiography, in their exact words, accessible even directly in ChatGPT/.test(t)
     && /all their exclusive media behind their mind/.test(t), '18/11 · their living TOTEHM, in ChatGPT too, and their exclusive media');
  ok(/Go to the spots they use/.test(t) && /pinned at the exact place and time/.test(t) && /straight into their footprint/.test(t),
     '18/11 · their spots, at the exact place and time');
  ok(/Meet them in reality/.test(t) && /if it’s marked SILENCE, you respect it strictly, or one report gets your subscription revoked/.test(t)
     && /you’re sharing their asphalt/.test(t), '18/11 · meet them in reality — the SILENCE rule said plainly');
  ok(/Pure access\. Zero fluff\./.test(t) && /One annual payment via Stripe/.test(t) && /it runs until the year ends/.test(t),
     '18/11 · pure access, zero fluff: one annual payment, stop anytime');
  ok(await pg.$eval('#paper .tn-l', e => getComputedStyle(e).fontFamily.includes('Quantico') && getComputedStyle(e).color === 'rgb(251, 213, 202)'), 'the name: Quantico Coral on its paper');
  ok(await pg.$$eval('#offer .dc-ints i', l => l.length) === 3, 'three intentions shown');
  /* ── DISCOVER : un écran à la fois, au geste, noir ── */
  const d0 = await pg.evaluate(() => ({ ...window.__totehm_creator().discover, on:document.querySelectorAll('#offer .dc-s.is-on').length,
    fond:getComputedStyle(document.getElementById('dc')).backgroundColor, prog:document.querySelectorAll('#dc .dc-progress,#dc .dc-hint').length,
    cache:getComputedStyle(document.querySelector('#offer .dc-s:not(.is-on)')).visibility, texte:document.querySelector('#offer .dc-s.is-on .dc-h').textContent.replace(/\s+/g,' ').trim() }));   /* 18/11 : le titre est en capitales par la police, on lit son texte */
  ok(d0.n === 5 && d0.i === 0 && d0.on === 1 && d0.fond === 'rgb(0, 0, 0)' && d0.prog === 0 && d0.cache === 'hidden' && /Enter kai’s ecosystem\.$/.test(d0.texte),
     '18/11 · DISCOVER : 5 écrans (son nom, puis les quatre idées de Wah), UN seul visible, fond noir, le premier dit « Enter kai’s ecosystem. » → ' + JSON.stringify(d0));
  await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(800);
  const d1 = await pg.evaluate(() => ({ i:window.__totehm_creator().discover.i, texte:document.querySelector('#offer .dc-s.is-on').textContent.replace(/\s+/g,' ').trim() }));
  ok(d1.i === 1 && /^Inside the mind of top performers\./.test(d1.texte), '↓ (clavier) : l\'écran suivant, jamais deux d\'un coup → ' + JSON.stringify(d1));
  await pg.mouse.move(200, 300); await pg.mouse.wheel(0, 120); await pg.waitForTimeout(800);
  ok(await pg.evaluate(() => window.__totehm_creator().discover.i) === 2, 'la molette : un geste = un écran');
  await pg.keyboard.press('ArrowUp'); await pg.waitForTimeout(800);
  ok(await pg.evaluate(() => window.__totehm_creator().discover.i) === 1, '↑ : on revient en arrière');
  await pg.evaluate(() => window.__totehm_discover().derniere());
  await pg.waitForTimeout(300);
  /* le 60 / 30 / 10 : sur l'écran qui AGIT, la seule couleur est l'accent (corail) — le noir tient le reste */
  const col = await pg.evaluate(() => { const tous = [...document.querySelectorAll('#dc .dc-s.is-on, #dc .dc-s.is-on *, #cta, #cta *')], vus = new Set();
    const chroma = c => { const m = c.match(/\d+(\.\d+)?/g); if(!m || (m[3] !== undefined && +m[3] === 0)) return false; const [r, g, b] = m.map(Number); return Math.max(r, g, b) - Math.min(r, g, b) > 24; };
    for(const e of tous){ const cs = getComputedStyle(e); if(cs.visibility === 'hidden') continue; for(const k of ['color', 'backgroundColor']) if(chroma(cs[k])) vus.add(cs[k]); }
    return { couleurs:[...vus], fond:getComputedStyle(document.getElementById('dc')).backgroundColor, dernier:window.__totehm_creator().discover }; });
  ok(col.couleurs.length === 0 && col.dernier.i === col.dernier.n - 1,
     '60 / 30 / 10 : sur le dernier écran, AUCUN corail (réservé au nom et à l\'art) : noir, blanc, gris — prix et bouton compris : ' + JSON.stringify(col.couleurs));
  /* l'appel à l'action est sous CHAQUE écran : « Subscribe · €24 / year », gris */
  const cta = [];
  for(let k = 0; k < 5; k++){ await pg.evaluate(k => window.__totehm_discover().aller(k, true), k);
    cta.push(await pg.evaluate(() => { const b = document.querySelector('#cta [data-do=subscribe]'); if(!b) return null; const r = b.getBoundingClientRect();
      return { t:b.textContent.trim(), vu:r.width > 40 && r.bottom <= innerHeight && getComputedStyle(b).backgroundColor }; })); }
  ok(cta.every(x => x && x.t === 'Subscribe · €24 / year' && x.vu === 'rgb(42, 42, 42)'), 'Subscribe · €24 / year sous les 5 écrans, bouton gris normal → ' + JSON.stringify(cta[0]));
  await pg.evaluate(() => window.__totehm_discover().derniere());
  const p = await propre(pg);
  ok(p.white === 0 && !p.fonts.length, 'page: no white background, Space Mono + Quantico only ' + p.fonts.join(','));
  await pg.screenshot({ path: OUT + '/creator_visitor.png', fullPage:true });
  await pg.click('[data-do=subscribe]');
  ok(await pg.waitForSelector('#si-email', { state:'visible', timeout:4000 }).then(() => true).catch(() => false), 'Subscribe without an account: email asked here');
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

/* ── 3 · abonné · propriétaire · fermé · inconnu · privé ─────────────── (14/11 : « me » n'a plus de lien My console — une seule console, celle du verso du TOTEHM) */
const cas = [
  ['subscribed', KAI({ subscribed:true, until:'2027-05-01', can_read:true }), async pg => /Renews 1 May 2027/.test(await pg.textContent('#offer')) && !!await pg.$('[data-do=open]') && !await pg.$('[data-do=subscribe]')],
  ['me', Object.assign(KAI({ me:true }), { pseudo:'kai' }), async pg => /This is your page/i.test(await pg.textContent('#offer')) && !!await pg.$('[data-do=copy]') && !await pg.$('a[href="/console"]') && !await pg.$('[data-do=subscribe]')],
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
/* ── 5 · /@nom = l'univers (13/10) : lisible net, réservé flouté (son niveau seul), un tap ouvre sur place ── */
{
  /* 16/10 : il n'y a plus de PUBLIC — FIGHER CLUB est le niveau le plus ouvert, et il ne se badge donc pas. */
  const sp = (id, o) => Object.assign({ id, format:'space', habit:'Run the hill', intentions:['fight'], audience:'figher', state:'was', city:'Lisbon', locked:false }, o);
  const UNI = { ok:true, me:false, signed_in:true, figher:false, totehm:{ audience:'subscribers', can_read:false, counts:{ habits:3 } },
    spaces:[ sp('a0000000-0000-4000-8000-000000000001', { photo:'u1/p.jpg' }), { locked:true, format:'space', audience:'subscribers' } ],
    spots:[ sp('b0000000-0000-4000-8000-000000000002', { format:'spot', audience:'subscribers', state:'will', habit:'Read at dawn', photo:'u1/p.jpg' }), { locked:true, format:'spot', audience:'figher', state:'am' } ] };
  const { pg, log } = await page(browser, { dir:'com', origin:'https://www.totehm.com', rpc:{ creator_page:KAI({}), creator_universe:UNI, my_console:{ signed_in:true, offer:{ enabled:false } } },
    tables:{ profiles:[{ pseudo:'wah' }] }, viewport:{ width:390, height:844 } });
  /* l'URL signée sert une vraie image : sinon `onerror` la retire avant qu'on la voie (course, comme en prod sur un fichier absent) */
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await pg.route(/\/storage\/v1\/object\/sign\//, r => r.request().method() === 'GET' ? r.fulfill({ status:200, contentType:'image/png', body:PNG }) : r.fallback());
  await pg.goto('https://www.totehm.com/creator?n=kai');
  await pg.waitForFunction(() => window.__totehm_creator && window.__totehm_creator().universe.loaded, null, { timeout:15000 });
  const d = await pg.evaluate(() => window.__totehm_creator().universe);
  ok(d.spaces === 2 && d.spots === 2 && d.locked === 2 && await pg.locator('#uni .u-t').count() === 2, 'the universe: lu 2 spaces + 2 spots, mais SEULS les 2 spots se montrent (15/11)');
  const locked = await pg.$$eval('#uni .u-t.is-locked', l => l.map(e => ({ t:e.textContent, badge:!!e.querySelector('.audb'), label:e.getAttribute('aria-label') })));
  ok(locked.every(x => x.badge && !/Run the hill|Read at dawn|Lisbon/.test(x.t)) && locked.map(x => x.label).join(',') === 'FIGHER CLUB', 'reserved = blurred, its level only: ' + locked.map(x => x.label).join(','));
  ok(/I AM HERE/.test(locked[0].t), 'a reserved spot still says its state');
  await pg.waitForFunction(() => document.querySelector('#uni img[data-photo]')?.getAttribute('src'));
  ok(await pg.locator('#uni [data-open="spot"] .audb').count() === 1 && await pg.locator('#uni [data-open="space"] .audb').count() === 0, 'un élément lisible dit son niveau SAUF FIGHER CLUB, le plus ouvert (16/10)');
  await pg.evaluate(() => window.__totehm_discover().aller([...document.querySelectorAll('#offer .dc-s')].findIndex(e => e.querySelector('.dc-slot')), true));          /* l'écran « ses spots » */
  await pg.click('#uni .u-t.is-locked');
  ok(/subscribe to open it/i.test(await pg.textContent('#note')), 'a reserved tile points to Subscribe');
  ok(log.rpc.some(r => r.name === 'creator_universe' && r.body.p_pseudo === 'kai'), 'one read: creator_universe(kai)');
  ok(!erreurs(log).length, 'universe: no page error ' + erreurs(log).join(' | '));
  await pg.screenshot({ path: OUT + '/creator_universe.png', fullPage:true });
  await pg.evaluate(() => window.__totehm_discover().aller([...document.querySelectorAll('#offer .dc-s')].findIndex(e => e.querySelector('.dc-slot')), true));   /* le tap réservé nous a menés à l'écran du prix */
  const [req] = await Promise.all([pg.waitForRequest(r => /\/totehm\?open=/.test(r.url())), pg.click('#uni [data-open="spot"]')]);
  ok(/\/totehm\?open=spot&id=b0000000-0000-4000-8000-000000000002$/.test(req.url()), 'a readable spot opens ON totehm.com (an id, never a URL)');
}
await browser.close();
