// Real isolated origin storage; deliberately does not use harness.page(), which
// preloads the same mock session on each origin. All network traffic is mocked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './harness.mjs';

const root = new URL('../..', import.meta.url).pathname;
const bundle = fs.readFileSync(new URL('./supabase.mjs', import.meta.url));
const BOUT = 'https://www.higher.boutique';
const CLUB = 'https://www.figher.club';
const SPACE = 'https://www.totehm.space';
const SB = 'https://abujjbkbbiumxrokozph.supabase.co';
const OLD = 'a'.repeat(64), NEW = 'b'.repeat(64), STATE = 's'.repeat(24), VERIFIER = 'v'.repeat(43);
const USER = { id:'11111111-1111-4111-8111-111111111111', email:'art@example.test', aud:'authenticated', role:'authenticated' };
const token = origin => ({ access_token:'access-' + origin, refresh_token:'refresh-' + origin, token_type:'bearer', expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, user:USER });
const types = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.png':'image/png' };
const browser = await launch();
let assertions = 0;
const check = (condition, description) => { assert(condition, description); assertions++; };

async function make({ source = BOUT, knownBoutique = false, wrongState = false, mintFails = false, redeemFails = false } = {}){
  const ctx = await browser.newContext({ viewport:{ width:390, height:844 }, reducedMotion:'reduce' });
  const log = { redeem:[], mint:[], errors:[], requests:[] };
  await ctx.addInitScript(({ source, knownBoutique, state, verifier, token }) => {
    if(location.origin !== source) return;
    sessionStorage.setItem('totehm_sso_pkce', JSON.stringify({ state, verifier }));
    if(knownBoutique) localStorage.setItem('sb-abujjbkbbiumxrokozph-auth-token', JSON.stringify(token));
  }, { source, knownBoutique, state:wrongState ? 'wrong-state' : STATE, verifier:VERIFIER, token:token(source === CLUB ? 'club' : 'boutique') });
  await ctx.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    log.requests.push(url.href);
    const json = (body, status = 200) => route.fulfill({ status, contentType:'application/json', body:JSON.stringify(body) });
    if(url.host === 'esm.sh') return route.fulfill({ contentType:'text/javascript', body:bundle });
    if(url.origin === SB){
      let body = {}; try{ body = JSON.parse(request.postData() || '{}'); }catch{}
      const origin = request.headers().origin;
      if(url.pathname.endsWith('/sso-redeem')){
        log.redeem.push({ origin, body });
        if(redeemFails) return json({ error:'network_unavailable' }, 503);
        if(body.code === OLD && origin === source && (!body.verifier || body.verifier === VERIFIER)) return json({ token_hash:source === CLUB ? 'club-hash' : 'boutique-hash' });
        if(body.code === NEW && origin === SPACE && !body.verifier) return json({ token_hash:'space-hash' });
        return json({ error:'wrong_door' }, 403);
      }
      if(url.pathname.endsWith('/sso-mint')){
        log.mint.push({ origin, body, bearer:request.headers().authorization });
        return mintFails ? json({ error:'unavailable' }, 503) : json({ code:NEW });
      }
      if(url.pathname === '/auth/v1/verify') return json(token(body.token_hash === 'boutique-hash' ? 'boutique' : body.token_hash === 'club-hash' ? 'club' : 'space'));
      if(url.pathname === '/auth/v1/user') return json(USER);
      if(url.pathname.startsWith('/auth/v1/')) return json({});
      if(url.pathname.endsWith('/stoner-gate')) return json({ access:true, urls:{}, expires_in:900 });
      if(url.pathname.endsWith('/higher-checkout')) return json({ amount:1700, currency:'usd' });
      if(url.pathname.startsWith('/rest/v1/')) return json(null);
      return json({});
    }
    if(url.origin === BOUT || url.origin === CLUB || url.origin === SPACE){
      let file;
      if(url.origin === BOUT || url.origin === CLUB){
        // Emulate Vercel's same-origin rewrite while preserving location.pathname.
        const dir = url.origin === CLUB ? 'club' : 'boutique';
        const config = JSON.parse(fs.readFileSync(path.join(root, dir, 'vercel.json')));
        const rewrite = config.rewrites?.find(r => r.source === url.pathname);
        file = path.join(root, dir, rewrite?.destination || url.pathname);
      }else file = path.join(root, 'space', url.pathname);
      if(!path.extname(file)) file += '.html';
      if(!fs.existsSync(file)) return route.fulfill({ status:404, body:'missing' });
      return route.fulfill({ contentType:types[path.extname(file)] || 'application/octet-stream', body:fs.readFileSync(file) });
    }
    return route.fulfill({ status:204, body:'' });
  });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => log.errors.push(e.message));
  return { pg, ctx, log };
}

try {
  {
    const { pg, ctx, log } = await make();
    await pg.goto(BOUT + '/get_higher?owned=q-01&campaign=shared#edition-2&sso=' + OLD + '&state=' + STATE);
    await pg.waitForURL(SPACE + '/get_higher**');
    await pg.waitForFunction(() => !location.hash.includes('sso='));
    check(log.redeem.length === 2, 'both origins redeem their own one-use code');
    check(log.redeem[0].origin === BOUT && log.redeem[0].body.verifier === VERIFIER, 'boutique validates the PKCE callback using its own storage');
    check(log.redeem[1].origin === SPACE && log.redeem[1].body.code === NEW, 'SPACE only sees the newly minted SPACE code');
    check(log.mint[0]?.body.target === 'space' && log.mint[0]?.bearer === 'Bearer access-boutique', 'departure uses the boutique session to mint for SPACE');
    const current = new URL(pg.url());
    check(current.searchParams.get('owned') === 'q-01' && current.searchParams.get('campaign') === 'shared', 'purchase and shared query preserved');
    check(current.searchParams.get('migration') === 'gallery-v1' && current.hash === '#edition-2', 'cached old 308 avoided; useful fragment preserved');
    check(!log.requests.some(u => u.startsWith(SPACE) && u.includes(OLD)), 'boutique code never reaches SPACE');
    const state = await ctx.storageState();
    for(const [origin, access] of [[BOUT,'access-boutique'], [SPACE,'access-space']]){
      const entry = state.origins.find(o => o.origin === origin)?.localStorage.find(v => v.name === 'sb-abujjbkbbiumxrokozph-auth-token');
      check(entry && JSON.parse(entry.value).access_token === access, origin + ' has an independently acquired session');
    }
    check(!log.errors.length, 'no JavaScript errors during authenticated migration: ' + log.errors.join(' | '));
    await ctx.close();
  }
  {
    const { pg, ctx, log } = await make();
    await pg.goto(BOUT + '/get_higher?campaign=old-com#chapter-2&sso=' + OLD);
    await pg.waitForURL(SPACE + '/get_higher**');
    await pg.waitForFunction(() => !location.hash.includes('sso='));
    check(log.redeem.length === 2 && !log.redeem[0].body.verifier, 'existing COM direct-bridge code works without inventing a PKCE verifier');
    check(log.mint[0]?.body.target === 'space' && pg.url().endsWith('#chapter-2'), 'direct old COM link receives a fresh SPACE code and keeps its deep link');
    await ctx.close();
  }
  {
    const { pg, ctx, log } = await make({ source:CLUB });
    await pg.goto(CLUB + '/get_higher?campaign=club#edition-8&sso=' + OLD + '&state=' + STATE);
    await pg.waitForURL(SPACE + '/get_higher**');
    await pg.waitForFunction(() => !location.hash.includes('sso='));
    check(log.redeem.length === 2 && log.redeem[0].origin === CLUB && log.redeem[1].origin === SPACE, 'old Club codes are consumed on Club before SPACE arrival');
    check(log.mint[0]?.body.target === 'space' && log.mint[0]?.bearer === 'Bearer access-club', 'Club mints a fresh SPACE-bound code from its own session');
    check(new URL(pg.url()).searchParams.get('campaign') === 'club' && pg.url().endsWith('#edition-8'), 'old Club path, query and useful fragment retained');
    await ctx.close();
  }
  {
    const { pg, ctx, log } = await make({ wrongState:true });
    await pg.goto(BOUT + '/get_higher?campaign=wrong-state#chapter-3&sso=' + OLD + '&state=' + STATE);
    await pg.waitForURL(SPACE + '/get_higher**');
    check(log.redeem.length === 0 && log.mint.length === 0, 'wrong PKCE state cannot redeem or mint a session');
    check(!pg.url().includes('sso=') && pg.url().endsWith('#chapter-3'), 'wrong-state code removed; useful fragment retained');
    const state = await ctx.storageState();
    check(!state.origins.some(o => o.localStorage.some(v => v.name === 'sb-abujjbkbbiumxrokozph-auth-token')), 'wrong state does not create a session on either origin');
    await ctx.close();
  }
  for(const failure of ['mintFails', 'redeemFails']){
    const { pg, ctx, log } = await make({ [failure]:true, knownBoutique:failure === 'mintFails' });
    await pg.goto(BOUT + '/get_higher?campaign=offline#chapter-4&sso=' + OLD + '&state=' + STATE);
    await pg.waitForURL(SPACE + '/get_higher**', { timeout:8000 });
    check(!pg.url().includes('sso=') && new URL(pg.url()).searchParams.get('campaign') === 'offline', failure + ' preserves a nonblocking anonymous route');
    check(!log.requests.some(u => u.startsWith(SPACE) && u.includes(OLD)), failure + ' never forwards a failed boutique code');
    await ctx.close();
  }
  {
    const { pg, ctx, log } = await make();
    await pg.goto(BOUT + '/origins?next=https://evil.example/&art=q-01#slide-4');
    await pg.waitForURL(SPACE + '/origins**');
    check(new URL(pg.url()).origin === SPACE && !log.mint.length && !log.redeem.length, 'anonymous visit uses the closed destination table without requiring auth');
    check(new URL(pg.url()).searchParams.get('art') === 'q-01' && pg.url().endsWith('#slide-4'), 'anonymous art deep link preserved');
    await ctx.close();
  }
  console.log(`${assertions} isolated-origin art bridge checks passed`);
} finally { await browser.close(); }
