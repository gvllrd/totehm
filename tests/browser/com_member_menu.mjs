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
const rpc={creator_dashboard:{ok:true,subscribers:12,month_cents:19200,pending_cents:19200,currency:'eur',next_payout:'2026-11-01',threshold_cents:2500,part:80,period:'year',price_cents:2400,min_cents:300,max_cents:100000,enabled:true,open:true},monetization_set:{ok:true},visibility_set:b=>({ok:true,visibility:b.p_visibility}),my_console:base,my_spaces:{ok:true,spaces:history,more:false},totehm_discover:{items:[],total:0,more:false}};
const ready=async(browser,options={})=>{const sample=await page(browser,{dir:'com',origin,rpc,tables,network,functions:{'sso-mint':{code:'b'.repeat(64)}},...options});await sample.pg.emulateMedia({reducedMotion:'reduce'});return sample;};
/* ⚠️ 18/10 — IL N'Y A PLUS D'ESPACE MEMBRE HORS DU VERSO (Wah) : `#conn-bar` est parti. On ouvre
   donc mes réglages comme un membre : en RETOURNANT le papier (un glissé horizontal dessus). */
const retourner=async pg=>{
  /* Le verso refuse de s'ouvrir tant qu'une course est en train (`sMoving`, `PAPIER.occupe()`) :
     on attend que le papier soit posé, et on retente une fois si le geste est tombé pendant. */
  for(let i=0;i<4;i++){
    await pg.waitForFunction(()=>!document.getElementById('srch').classList.contains('is-on'),null,{timeout:9000}).catch(()=>{});
    await pg.click('#lv-tap-turn').catch(()=>{});
    const ok=await pg.waitForFunction(()=>document.getElementById('srch').classList.contains('is-open'),null,{timeout:3000}).then(()=>true,()=>false);
    if(ok) return;
    await pg.waitForTimeout(700);
  }
  throw new Error('le verso ne s\'ouvre pas');};
const browser=await launch();
try{
  /* 07/10 — L'ESPACE MEMBRE DE totehm.com, C'EST L'UTILISATEUR : sa vignette,
     son abonnement Higher, ses abonnements, ses spaces, TotehmBot. 15/10 : le nom,
     la visibilité et le programme sont MES RÉGLAGES, au verso du papier. */
  const LAND={signed_in:true,pseudo:'wahigher',avatar:null,visibility:'private',offer:{enabled:false,open:false},
    higher:{active:false,comp:false,price_cents:700,currency:'eur',period:'month'},telegram:false,thp:false,subscriptions:2,subscribers:1};
  {const SUBS=[{creator:'alice',price_cents:1200,currency:'eur',status:'active',renews:'2027-03-01',ending:false}];
   const{pg,ctx,log}=await ready(browser,{rpc:{...rpc,my_landing:LAND,avatar_set:b=>({ok:/^data:image\/jpeg;base64,/.test(b.p_data)}),new_bot_link_code:'CODE123',
       my_console:{...base,offer:{enabled:false,open:false},subscriptions:SUBS},creator_payout_set:{ok:true},
       monetization_set:b=>b.p_enabled===true?{ok:false,why:'payout_first'}:{ok:true}},
     functions:{'sso-mint':{code:'b'.repeat(64)},'higher-sub':{error:'not_ready'},'club-billing':b=>({ok:true,until:'2027-03-01',action:b.action})}});
   await pg.addInitScript(()=>{window.__opened=[];window.open=(u)=>{window.__opened.push(u);return null;};});
   await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);await retourner(pg);
   await pg.waitForFunction(()=>!document.getElementById('mw-creator').classList.contains('hide'),null,{timeout:9000});
   /* 20/10 — LE VERSO = MON ARGENT, EN UN ÉCRAN (Wah : « totalement ILLISIBLE … ULTRA-SIMPLIFIÉ »). */
   ok(!await pg.locator('#srch iframe,#srch-console').count()&&!log.rpc.some(x=>x.name==='visibility_set'),'20/10: no second page stacked in the back (no /console iframe), no Totehm-wide privacy');
   const nom=await pg.$eval('#srch',e=>(e.innerText.match(/wahigher/g)||[]).length);
   ok(nom===1,'20/10: the name appears ONCE on the back (it was five times) → '+nom);
   ok(!await pg.locator('#member-window #lv-card').count()&&await pg.locator('#srch #lv-card #ident-block').count()===1&&!await pg.locator('#totehm-menu').count(),'the name and the money live on the back of the paper');
   ok(await pg.locator('#srch #member-window.show').count()===1&&!await pg.locator('#mw-avatar,#mw-who,#mwc-save,#acct-cancel').count()
      &&await pg.$eval('#member-window',e=>getComputedStyle(e).position==='static'),'the account follows inside the back — no picture, no second name, no Save button, no dead « cancel » (20/10)');
   const dash=await pg.evaluate(()=>({subs:document.getElementById('mwc-subs').textContent,month:document.getElementById('mwc-month').textContent,next:document.getElementById('mwc-next').textContent,
     due:document.getElementById('vs-due').textContent,price:document.getElementById('vs-price').textContent,say:document.getElementById('mwc-say').textContent,
     etat:document.getElementById('vs-open').dataset.etat,pay:document.getElementById('vs-pay-v').textContent}));
   ok(dash.subs==='12'&&dash.month==='€192'&&dash.next==='1 Nov'&&dash.due==='€192'&&dash.price==='€24 / year'&&dash.say==='100 subscribers = €1,920 for me'&&dash.etat==='off'&&dash.pay==='to set',
      'what I earn, open or not, my price, where to pay me — read from the server → '+JSON.stringify(dash));
   ok(log.rpc.some(x=>x.name==='creator_dashboard')&&log.rpc.some(x=>x.name==='my_console'),'two reads, in parallel: creator_dashboard + my_console');
   await pg.$eval('#mwc-price',e=>{e.value='3600';e.dispatchEvent(new Event('input',{bubbles:true}));});
   ok(await pg.textContent('#vs-price')==='€36 / year','the price follows the slider live');
   await pg.$eval('#mwc-price',e=>e.dispatchEvent(new Event('change',{bubbles:true})));
   await pg.waitForFunction(()=>document.getElementById('mwc-note').textContent==='saved');
   ok(log.rpc.some(x=>x.name==='monetization_set'&&x.body.p_price_cents===3600&&x.body.p_enabled===null),'releasing the slider saves the price (monetization_set, enabled untouched) — no Save button');
   await pg.click('#vs-open');await pg.waitForFunction(()=>/where to pay me first/.test(document.getElementById('mwc-note').textContent));
   ok(log.rpc.some(x=>x.name==='monetization_set'&&x.body.p_enabled===true)&&await pg.isVisible('#vs-pay-in'),'opening without a payout: the SERVER refuses (payout_first) and the payout field opens');
   await pg.click('[data-paym="paypal"]');ok(await pg.getAttribute('#vs-pay-in','placeholder')==='my PayPal email','IBAN / PayPal');
   await pg.fill('#vs-pay-in','me@paypal.test');await pg.click('#vs-pay-save');await pg.waitForFunction(()=>document.getElementById('mwc-note').textContent==='saved');
   ok(log.rpc.some(x=>x.name==='creator_payout_set'&&x.body.p_method==='paypal'&&x.body.p_handle==='me@paypal.test')&&await pg.inputValue('#vs-pay-in')===''&&!await pg.isVisible('#vs-pay-in'),
      'the payout is written by creator_payout_set, then wiped from the screen');
   ok(await pg.textContent('#vs-subs .vs-nom')==='alice'&&/renews 1 Mar/.test(await pg.textContent('#vs-subs')),'what I pay: the Totehms I subscribe to, one line each');
   await pg.click('#vs-subs [data-stop]');await pg.waitForFunction(()=>/stops on/.test(document.getElementById('mw-menu-note').textContent));
   ok(log.functions.some(f=>f.name==='club-billing'&&f.body.action==='cancel_creator'&&f.body.pseudo==='alice'),'Stop = club-billing cancel_creator, at the end of the year');
   ok(await pg.locator('#mw-menu .vs-hi use[href="#higher-badge"]').count()===1&&!/higher/i.test(await pg.$eval('#mw-menu',e=>e.textContent)),'« Higher » is the SVG, never text');
   const acts=await pg.$$eval('#mw-menu .vs-act',l=>l.map(e=>e.textContent));
   ok(JSON.stringify(acts)==='["Get","Connect"]','one gesture per line → '+acts.join(' | '));
   await pg.keyboard.press('Escape');
   await pg.waitForFunction(()=>!document.getElementById('srch').classList.contains('is-open'),null,{timeout:6000});
   await pg.waitForTimeout(1800);
   await retourner(pg);await pg.waitForSelector('#member-window.show');
   ok(/€7 \/ month/.test(await pg.textContent('#mw-higher-hint')),'the Higher price comes from the server (my_landing)');
   const fmt=await pg.locator('#srch .vs-act,#srch .vs-val,#srch .vs-tog').evaluateAll(items=>items.every(e=>{const s=getComputedStyle(e);return s.backgroundColor==='rgb(31, 31, 36)'&&s.whiteSpace==='nowrap'&&s.borderTopLeftRadius==='10px';}));
   ok(fmt,'controls: grey, 10 px radius, one line'+(fmt?'':' → '+JSON.stringify(await pg.locator('#srch .vs-act,#srch .vs-val,#srch .vs-tog').evaluateAll(l=>l.map(e=>{const s=getComputedStyle(e);return e.id+'/'+e.className+':'+s.backgroundColor+','+s.whiteSpace+','+s.borderTopLeftRadius;})))));
   ok(await pg.$eval('#mw-in-state',e=>[...e.querySelectorAll('a,button')].pop().textContent.trim().toLowerCase())==='simple terms of use','terms remain the final member entry');
   await pg.click('#mw-higher');await pg.waitForFunction(()=>/opening soon/.test(document.getElementById('mw-menu-note').textContent));
   ok(await pg.isVisible('#mw-menu-note'),'the menu note is VISIBLE in the member window (11/10: it was written into the hidden door note)');
   ok(log.functions.some(f=>f.name==='higher-sub'&&f.body.action==='checkout'),'Get (Higher) asks the server for a checkout — no live price yet: « opening soon »');
   await pg.click('#mw-telegram');await pg.waitForFunction(()=>window.__opened.length===1);
   ok(await pg.evaluate(()=>window.__opened[0])==='https://t.me/TotehmBot?start=CODE123','Connect TotehmBot: a one-use link code, then Telegram');
   /* 18/10 — PLUS DE PHOTO DE PROFIL (Wah) : la vignette, son champ de fichier et `avatar_set` sont
      partis ensemble. Le papier EST l'image du membre. */
   ok(!await pg.locator('#mw-avatar,#mw-avatar-file,#mw-avatar-note').count()&&!log.rpc.some(x=>x.name==='avatar_set'),
      '18/10: no picture at all on the back of the paper (avatar_set is gone)');
   await pg.screenshot({path:OUT+'/com_member_mobile.png'});
   ok(!await pg.locator('#myspaces,[id^="myspaces-"]').count()&&!await pg.evaluate(()=>typeof MYSPACES!=='undefined'),'16/10: the whole My-spaces window is gone — markup AND wiring');
   ok(!log.errors.some(e=>e.startsWith('pageerror')),'member window: no runtime errors');await ctx.close();
  }
  {const until=new Date(Date.now()+20*864e5).toISOString();
   const{pg,ctx,log}=await ready(browser,{rpc:{...rpc,my_landing:{...LAND,higher:{...LAND.higher,active:true,status:'active',until,ending:false}}},
     functions:{'sso-mint':{code:'b'.repeat(64)},'higher-sub':b=>({ok:true,ending:b.action==='cancel',until})}});
   await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);await retourner(pg);
   await pg.waitForFunction(()=>/renews/.test(document.getElementById('mw-higher-hint').textContent));
   ok((await pg.textContent('#mw-higher'))==='Open'&&(await pg.textContent('#mw-higher-acts'))==='Stop'&&/renews/.test(await pg.textContent('#mw-higher-hint')),'Higher active: renews on a date, Open, and Stop (at the end of the month)');
   await pg.click('[data-hsub="cancel"]');await pg.waitForFunction(()=>/it ends on/.test(document.getElementById('mw-menu-note').textContent));
   ok(log.functions.some(f=>f.name==='higher-sub'&&f.body.action==='cancel')&&(await pg.textContent('#mw-higher-acts'))==='Keep','stopping is at period end (higher-sub cancel), and it can be kept');
   await pg.click('#mw-higher');await pg.waitForFunction(()=>window.__totehm_lv&&window.__totehm_lv().vue==='b');
   ok(!await pg.$eval('#member-window',e=>e.classList.contains('show')),'My Higher subscription opens my Reflection (the view below, 15/10)');
   ok(!log.errors.some(e=>e.startsWith('pageerror')),'Higher active: no runtime errors');await ctx.close();
  }
  {const{pg,ctx,log}=await ready(browser,{rpc:{...rpc,my_landing:LAND}});await pg.goto(origin+'/totehm?spaces=1');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);
   ok(!log.errors.some(e=>e.startsWith('pageerror'))&&!await pg.locator('#myspaces').count(),'16/10: the old ?spaces=1 deep link opens nothing and breaks nothing');await ctx.close();
  }
  // A slow landing response may never repaint another account after sign-out.
  {let n=0;const{pg,ctx}=await ready(browser,{rpc:{...rpc,my_landing:async()=>{const k=++n;await new Promise(r=>setTimeout(r,650));
     return k<=2?{...LAND,subscriptions:5,avatar:'data:image/jpeg;base64,AAAA'}:{signed_in:false,thp:false,higher:{active:false,price_cents:700,currency:'eur'}};}}});
   await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);await retourner(pg);await pg.click('#mw-signout');await pg.waitForSelector('body:not(.member)');await pg.waitForTimeout(900);
   ok(!await pg.locator('body.member').count(),'late account data cannot repaint the member space after sign-out');await ctx.close();
  }
  for(const path of ['/search','/console','/monetize']){
   const{pg,ctx,log}=await ready(browser,{rpc:{...rpc,my_console:{...base,offer:{enabled:true}}}});await pg.goto(origin+path);await pg.waitForFunction(()=>document.querySelector('[data-com-monetize]')?.textContent==='My monetization');await pg.click('#member');
   ok(await pg.locator('#menu .cm-item').count()===7&&await pg.getAttribute('[data-com-monetize]','href')==='/console',path+' keeps the same seven actions and server-derived offer state');
   ok(await pg.$eval('#menu',e=>e.lastElementChild.textContent.trim().toLowerCase())==='simple terms of use',path+' ends its menu with terms');
   ok(!log.errors.some(e=>e.startsWith('pageerror')),path+' has no runtime errors');await ctx.close();
  }
  {const{pg,ctx,log}=await ready(browser,{session:false,viewport:{width:1280,height:900}});await pg.goto(origin+'/monetize');await pg.waitForFunction(()=>window.__totehm_monetize?.().signed_in===false);await pg.waitForTimeout(300);
   /* 16/10 — la page ne montre plus que SA part (la doctrine du grand livre : on affiche sa part, pas le brut),
      et le curseur COMPTE au lieu de promettre. On vérifie donc 80 %, l'année, et le calcul — jamais « 20 % ». */
   {const t=await pg.textContent('main');
    ok(await pg.locator('h1').isVisible()&&/80%/.test(t)&&/[Oo]nce a year/.test(t)&&!/\d+ ?€ ?\/ ?year guaranteed/i.test(t)&&await pg.locator('#mz-p').count()===1,
       'the sales page is public: the annual model, MY 80%, a slider that counts — and no promised revenue');}
   ok(!log.rpc.some(x=>x.name==='my_console')&&await pg.getAttribute('[data-setup]','href')==='/console','visiting the public page does not read a member console or activate an offer');
   await pg.screenshot({path:OUT+'/com_monetize_desktop.png'});await ctx.close();
  }
}finally{await browser.close();}
