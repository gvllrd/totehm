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
  {const{pg,ctx,log}=await ready(browser);await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.click('#conn-bar');
   await pg.waitForFunction(()=>document.querySelector('[data-com-monetize]')?.getAttribute('href')==='/monetize');
   ok(await pg.locator('#totehm-menu .cm-item').count()===7&&!await pg.locator('#club-toggle').count(),'seven actions replace the My Club panel');
   ok(await pg.locator('#totehm-menu .cm-hint').count()===7&&/Tap on it/.test(await pg.textContent('#totehm-menu')),'landing gestures live outside the button backgrounds');
   ok((await pg.textContent('[data-com-monetize]'))==='Monetize my TOTEHM ecosystem','an active paid membership does not turn off the creator sales invitation');
   ok(await pg.getAttribute('#totehm-menu a[href="/search"]','href')==='/search','Search keeps the full names/subscriptions/boxes controller');
   ok(await pg.locator('#btn-get-higher svg[aria-label="Higher"]').count()===1,'Get Higher uses the actual Higher badge');
   const widths=await pg.locator('#totehm-menu .cm-action').evaluateAll(items=>items.every(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return r.width<=e.parentElement.getBoundingClientRect().width+1&&s.backgroundColor==='rgb(31, 31, 36)'&&s.whiteSpace==='nowrap'&&s.fontSize==='12.5px';}));
   ok(widths,'06/10: all seven buttons are higher.boutique buttons, centred, on one line');
   ok(await pg.$eval('#mw-in-state',e=>e.lastElementChild.textContent.trim().toLowerCase())==='simple terms of use','terms remain the final member entry');
   await pg.screenshot({path:OUT+'/com_member_mobile.png'});
   await pg.click('[data-com-open]');await pg.waitForSelector('body:not(.gate)');
   ok(!await pg.$eval('#member-window',e=>e.classList.contains('show')),'Open my TOTEHM uses the native paper deployment and closes the menu');
   await pg.click('#fold-x');await pg.waitForSelector('body.gate:not(.folding)');await pg.click('#conn-bar');await pg.click('#myspaces-open');await pg.waitForSelector('[data-space="old-private"]');
   ok(/PRIVATE/.test(await pg.textContent('#myspaces-list'))&&await pg.$eval('#gate',e=>e.inert),'My TOTEHM spaces preserves owner-only history in a modal');
   await pg.keyboard.press('Escape');ok(await pg.$eval('#member-window',e=>e.classList.contains('show'))&&!await pg.$eval('#gate',e=>e.inert),'closing history restores the member menu and background');
   ok(!log.errors.some(e=>e.startsWith('pageerror')),'native menu, paper and history have no runtime errors');await ctx.close();
  }
  {const{pg,ctx,log}=await ready(browser,{rpc:{...rpc,my_console:{...base,offer:{enabled:true},bot:{active:false}}}});await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.click('#conn-bar');await pg.waitForFunction(()=>document.querySelector('[data-com-monetize]')?.textContent==='Manage my subscriptions');
   ok(await pg.getAttribute('[data-com-monetize]','href')==='/console','an enabled offer leads to management even when visibility is private');
   await pg.click('#btn-get-higher');await pg.waitForURL(/www\.figher\.club\/get_higher/);
   ok(log.functions.some(x=>x.name==='sso-mint'&&x.body.target==='club')&&pg.url().includes('#sso='),'Get Higher passes the COM session through the club SSO bridge');await ctx.close();
  }
  {const{pg,ctx,log}=await ready(browser);await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.click('#conn-bar');await pg.click('#wear-btn');await pg.waitForURL(/www\.higher\.boutique/);
   ok(log.functions.some(x=>x.name==='sso-mint'&&x.body.target==='boutique')&&!pg.url().includes('test-at'),'Totehmize my cloth opens Boutique with a one-use code, never a session token');await ctx.close();
  }
  {const{pg,ctx}=await ready(browser);await pg.goto(origin+'/totehm?spaces=1');await pg.waitForSelector('[data-space="old-private"]');
   ok(await pg.locator('#myspaces.is-open').count()===1,'the shared menu deep link opens the existing owner history');await ctx.close();
  }
  // A slow offer response may never repaint another account after sign-out.
  {const{pg,ctx}=await ready(browser,{rpc:{...rpc,my_console:async()=>{await new Promise(r=>setTimeout(r,650));return{...base,offer:{enabled:true}};}}});await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.click('#conn-bar');await pg.click('#mw-signout');await pg.waitForSelector('body:not(.member)');await pg.waitForTimeout(800);
   ok((await pg.textContent('[data-com-offer-hint]'))==='Subscription settings','late account data cannot restore an active-offer state after sign-out');await ctx.close();
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
