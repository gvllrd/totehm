// Member ecosystem navigation, actual offer state, owner history and SSO.
// Accounts, API responses and other domains are fixtures; no production writes.
import fs from 'node:fs';
import { launch, page, ok } from './harness.mjs';
const origin='https://www.totehm.com',OUT=process.argv[2]||'/tmp/com-member-menu';
fs.mkdirSync(OUT,{recursive:true});
const tables={profiles:[{pseudo:'wahigher'}],subscriptions:[{status:'active'}]};
const base={signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false},subscriptions:[],subscribers:{count:0},bot:{active:false}};
const iso=n=>new Date(Date.now()+n*60000).toISOString();
const history=[{id:'old-private',habit:'Deep practice',visibility:'private',starts_at:iso(-60),ends_at:iso(-30),city:'Lisbon'}];
const network=url=>url.pathname==='/search'?{status:200,contentType:'text/html',body:fs.readFileSync(new URL('../../com/creator.html',import.meta.url))}:url.hostname==='www.figher.club'||url.hostname==='www.higher.boutique'?{status:200,contentType:'text/html',body:'<!doctype html><p>Satellite fixture</p>'}:null;
const rpc={my_console:base,my_spaces:{ok:true,spaces:history,more:false},totehm_discover:{items:[],total:0,more:false}};
const ready=async(browser,options={})=>{const sample=await page(browser,{dir:'com',origin,rpc,tables,network,functions:{'sso-mint':{code:'b'.repeat(64)}},...options});await sample.pg.emulateMedia({reducedMotion:'reduce'});return sample;};
const browser=await launch();
try{
  /* 07/10 — L'ESPACE MEMBRE DE totehm.com, C'EST L'UTILISATEUR : sa vignette,
     son abonnement Higher, ses abonnements, ses spaces, TotehmBot. Le nom et la
     visibilité sont au centre de l'atterrissage ; l'écosystème, ce sont ses vues. */
  const LAND={signed_in:true,pseudo:'wahigher',avatar:null,visibility:'private',offer:{enabled:false,open:false},
    higher:{active:false,comp:false,price_cents:700,currency:'eur',period:'month'},telegram:false,thp:false,subscriptions:2,subscribers:1};
  {const{pg,ctx,log}=await ready(browser,{rpc:{...rpc,my_landing:LAND,avatar_set:b=>({ok:/^data:image\/jpeg;base64,/.test(b.p_data)}),new_bot_link_code:'CODE123'},
     functions:{'sso-mint':{code:'b'.repeat(64)},'higher-sub':{error:'not_ready'}}});
   await pg.addInitScript(()=>{window.__opened=[];window.open=(u)=>{window.__opened.push(u);return null;};});
   await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(400);await pg.click('#conn-bar');
   await pg.waitForFunction(()=>/2 TOTEHMs I follow/.test(document.getElementById('mw-subs-hint').textContent));
   const acts=await pg.$$eval('#mw-menu .cm-action',l=>l.map(e=>e.textContent));
   ok(JSON.stringify(acts)==='["Get Higher Self","My subscriptions","My TOTEHM spaces","Connect TotehmBot"]','the member space is the member: Higher, subscriptions, spaces, TotehmBot → '+acts.join(' | '));
   ok(!await pg.locator('#member-window #ident-block, #member-window [data-lvvis], #totehm-menu').count()&&await pg.locator('#lv-card #ident-block').count()===1,'the TOTEHM name and visibility left the window for the centre of the landing');
   ok(/€7 \/ month/.test(await pg.textContent('#mw-higher-hint'))&&/1 subscriber/.test(await pg.textContent('#mw-subs-hint')),'Higher price and my counts come from the server (my_landing)');
   const fmt=await pg.locator('#mw-menu .cm-action').evaluateAll(items=>items.every(e=>{const s=getComputedStyle(e);return s.backgroundColor==='rgb(31, 31, 36)'&&s.whiteSpace==='nowrap'&&s.fontSize==='12.5px';}));
   ok(fmt,'the higher.boutique buttons, centred, on one line');
   ok(await pg.$eval('#mw-in-state',e=>e.lastElementChild.textContent.trim().toLowerCase())==='simple terms of use','terms remain the final member entry');
   await pg.click('#mw-higher');await pg.waitForFunction(()=>/opening soon/.test(document.getElementById('mw-note').textContent));
   ok(log.functions.some(f=>f.name==='higher-sub'&&f.body.action==='checkout'),'Get Higher Self asks the server for a checkout — no live price yet: « opening soon »');
   await pg.click('#mw-telegram');await pg.waitForFunction(()=>window.__opened.length===1);
   ok(await pg.evaluate(()=>window.__opened[0])==='https://t.me/TotehmBot?start=CODE123','Connect TotehmBot: a one-use link code, then Telegram');
   // la vignette : un JPEG recadré, écrit par avatar_set, repris dans le coin membre
   const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==','base64');
   await pg.setInputFiles('#mw-avatar-file',{name:'me.png',mimeType:'image/png',buffer:png});
   await pg.waitForFunction(()=>!!document.querySelector('#conn-bar .lv-av'));
   const av=log.rpc.find(x=>x.name==='avatar_set');
   ok(av&&/^data:image\/jpeg;base64,/.test(av.body.p_data)&&/url\("data:image\/jpeg/.test(await pg.$eval('#mw-avatar',e=>e.style.backgroundImage)),'my picture: a JPEG data URL through avatar_set, shown in the window and the corner');
   await pg.screenshot({path:OUT+'/com_member_mobile.png'});
   await pg.click('#myspaces-open');await pg.waitForSelector('[data-space="old-private"]');
   ok(/PRIVATE/.test(await pg.textContent('#myspaces-list'))&&await pg.$eval('#gate',e=>e.inert),'My TOTEHM spaces preserves owner-only history in a modal');
   await pg.keyboard.press('Escape');ok(await pg.$eval('#member-window',e=>e.classList.contains('show'))&&!await pg.$eval('#gate',e=>e.inert),'closing history restores the member window and background');
   ok(!log.errors.some(e=>e.startsWith('pageerror')),'member window: no runtime errors');await ctx.close();
  }
  {const until=new Date(Date.now()+20*864e5).toISOString();
   const{pg,ctx,log}=await ready(browser,{rpc:{...rpc,my_landing:{...LAND,higher:{...LAND.higher,active:true,status:'active',until,ending:false}}},
     functions:{'sso-mint':{code:'b'.repeat(64)},'higher-sub':b=>({ok:true,ending:b.action==='cancel',until})}});
   await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(400);await pg.click('#conn-bar');
   await pg.waitForFunction(()=>/renews/.test(document.getElementById('mw-higher-hint').textContent));
   ok((await pg.textContent('#mw-higher'))==='My Higher subscription'&&/Stop at the end of the month/.test(await pg.textContent('#mw-higher-acts')),'Higher active: renews on a date, can stop at the end of the month');
   await pg.click('[data-hsub="cancel"]');await pg.waitForFunction(()=>/it ends on/.test(document.getElementById('mw-note').textContent));
   ok(log.functions.some(f=>f.name==='higher-sub'&&f.body.action==='cancel')&&/Keep it/.test(await pg.textContent('#mw-higher-acts')),'stopping is at period end (higher-sub cancel), and it can be kept');
   await pg.click('#mw-higher');await pg.waitForFunction(()=>window.__totehm_lv&&window.__totehm_lv().vue==='b');
   ok(!await pg.$eval('#member-window',e=>e.classList.contains('show')),'My Higher subscription opens TotehmSM (the view below)');
   ok(!log.errors.some(e=>e.startsWith('pageerror')),'Higher active: no runtime errors');await ctx.close();
  }
  {const{pg,ctx}=await ready(browser,{rpc:{...rpc,my_landing:LAND}});await pg.goto(origin+'/totehm?spaces=1');await pg.waitForSelector('[data-space="old-private"]');
   ok(await pg.locator('#myspaces.is-open').count()===1,'the shared menu deep link opens the existing owner history');await ctx.close();
  }
  // A slow landing response may never repaint another account after sign-out.
  {let n=0;const{pg,ctx}=await ready(browser,{rpc:{...rpc,my_landing:async()=>{const k=++n;await new Promise(r=>setTimeout(r,650));
     return k<=2?{...LAND,subscriptions:5,avatar:'data:image/jpeg;base64,AAAA'}:{signed_in:false,thp:false,higher:{active:false,price_cents:700,currency:'eur'}};}}});
   await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.click('#conn-bar');await pg.click('#mw-signout');await pg.waitForSelector('body:not(.member)');await pg.waitForTimeout(900);
   ok(!await pg.locator('#conn-bar .lv-av').count()&&!/5 TOTEHMs/.test(await pg.textContent('#mw-subs-hint')),'late account data cannot repaint the member space after sign-out');await ctx.close();
  }
  for(const path of ['/search','/console','/monetize']){
   const{pg,ctx,log}=await ready(browser,{rpc:{...rpc,my_console:{...base,offer:{enabled:true}}}});await pg.goto(origin+path);await pg.waitForFunction(()=>document.querySelector('[data-com-monetize]')?.textContent==='Manage my subscriptions');await pg.click('#member');
   ok(await pg.locator('#menu .cm-item').count()===7&&await pg.getAttribute('[data-com-monetize]','href')==='/console',path+' keeps the same seven actions and server-derived offer state');
   ok(await pg.$eval('#menu',e=>e.lastElementChild.textContent.trim().toLowerCase())==='simple terms of use',path+' ends its menu with terms');
   ok(!log.errors.some(e=>e.startsWith('pageerror')),path+' has no runtime errors');await ctx.close();
  }
  {const{pg,ctx,log}=await ready(browser,{session:false,viewport:{width:1280,height:900}});await pg.goto(origin+'/monetize');await pg.waitForFunction(()=>window.__totehm_monetize?.().signed_in===false);await pg.waitForTimeout(300);
   ok(await pg.locator('h1').isVisible()&&/80%/.test(await pg.textContent('main'))&&/20%/.test(await pg.textContent('main')),'the influencer sales page is public and explains the 80/20 annual model');
   ok(!log.rpc.some(x=>x.name==='my_console')&&await pg.getAttribute('[data-setup]','href')==='/console','visiting the public page does not read a member console or activate an offer');
   await pg.screenshot({path:OUT+'/com_monetize_desktop.png'});await ctx.close();
  }
}finally{await browser.close();}
