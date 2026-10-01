// Harnais de test navigateur : sert un dossier du dépôt sous son vrai domaine,
// remplace esm.sh par un bundle local et Supabase par un mock en mémoire.
// Zéro réseau, zéro compte, zéro donnée de production.
//
// PRÉPARER (une fois, dans tests/browser/) :
//   npm i --no-save @supabase/supabase-js@2 esbuild
//   echo 'export * from "@supabase/supabase-js";' > entry.js
//   npx esbuild entry.js --bundle --format=esm --platform=browser --outfile=supabase.mjs
// LANCER : node space.mjs /tmp   (captures d'écran dans le dossier donné)
// Playwright : `npm i playwright` ; ou PLAYWRIGHT_MODULE=/chemin/index.mjs.
// PLAYWRIGHT_CHROMIUM peut désigner le navigateur de l'environnement.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'node:fs'; import path from 'node:path';
const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const SB = 'https://abujjbkbbiumxrokozph.supabase.co';
const BUNDLE = fs.readFileSync(new URL('./supabase.mjs', import.meta.url));
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.css':'text/css', '.mp4':'video/mp4' };
export const USER = { id:'11111111-1111-4111-8111-111111111111', email:'wah@example.test', aud:'authenticated', role:'authenticated' };
export async function launch(){
  const args = ['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required'];
  if(process.env.CHROMIUM_PROVIDER){
    const { default: provider } = await import(process.env.CHROMIUM_PROVIDER);
    return chromium.launch({ executablePath:await provider.executablePath(), args:[...provider.args,...args] });
  }
  return chromium.launch({ executablePath:process.env.PLAYWRIGHT_CHROMIUM || undefined, args });
}
export async function page(browser, { dir, origin, rpc = {}, tables = {}, session = true, viewport = { width:390, height:844 }, geo = { latitude:38.7223, longitude:-9.1393 }, hasTouch = false }){
  const ctx = await browser.newContext({ viewport, permissions:['geolocation','camera','microphone'], geolocation: geo, hasTouch });
  const log = { rpc:[], upload:[], tiles:0, other:[], errors:[] };
  if(session) await ctx.addInitScript(([u]) => {
    localStorage.setItem('sb-abujjbkbbiumxrokozph-auth-token', JSON.stringify({ access_token:'test-at', refresh_token:'test-rt', token_type:'bearer',
      expires_in:3600, expires_at: Math.floor(Date.now()/1000) + 3600, user:u }));
  }, [USER]);
  await ctx.route('**/*', async route => {
    const url = new URL(route.request().url()), req = route.request();
    if(url.host === 'esm.sh') return route.fulfill({ status:200, contentType:'text/javascript', body:BUNDLE });
    if(url.host.includes('openstreetmap')){ log.tiles++; return route.fulfill({ status:404, body:'' }); }
    if(url.origin === SB){
      const p = url.pathname;
      if(p.startsWith('/rest/v1/rpc/')){
        const name = p.slice(13); let body = {}; try{ body = JSON.parse(req.postData() || '{}'); }catch(_){}
        log.rpc.push({ name, body });
        const h = rpc[name]; const data = typeof h === 'function' ? await h(body, log) : h;
        if(h === undefined){ log.other.push('rpc:' + name); return route.fulfill({ status:200, contentType:'application/json', body:'null' }); }
        return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(data ?? null) });
      }
      if(p.startsWith('/rest/v1/')){
        const t = p.slice(9); const d = tables[t];
        const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
        const v = typeof d === 'function' ? d(url, req) : (d ?? []);
        return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(one ? (Array.isArray(v) ? v[0] ?? null : v) : v) });
      }
      if(p.startsWith('/storage/v1/object/sign/')){
        log.signed = (log.signed || 0) + 1;
        return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ signedURL: '/object/sign/' + p.slice(24) + '?token=t' }) });
      }
      if(p.startsWith('/storage/v1/object/')){
        log.upload.push({ path: p.slice(19), method: req.method(), size: (req.postDataBuffer() || []).length });
        return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ Key: p.slice(19), Id:'x' }) });
      }
      if(p.startsWith('/auth/v1/user')) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(USER) });
      if(p.startsWith('/auth/v1/')) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
      if(p.startsWith('/functions/v1/')){ log.other.push('fn:' + p.slice(14)); return route.fulfill({ status:200, contentType:'application/json', body:'{}' }); }
      return route.fulfill({ status:404, body:'' });
    }
    if(url.origin === origin){
      let f = decodeURIComponent(url.pathname); if(f.endsWith('/')) f += 'index.html';
      let fp = path.join(ROOT, dir, f); if(!path.extname(fp) && fs.existsSync(fp + '.html')) fp += '.html';
      if(!fs.existsSync(fp)) return route.fulfill({ status:404, body:'nf' });
      return route.fulfill({ status:200, contentType: TYPES[path.extname(fp)] || 'application/octet-stream', body: fs.readFileSync(fp) });
    }
    return route.fulfill({ status:204, body:'' });
  });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => log.errors.push('pageerror: ' + e.message));
  pg.on('console', m => { if(m.type() === 'error') log.errors.push('console: ' + m.text()); });
  return { pg, ctx, log };
}
export const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if(!c) process.exitCode = 1; };

