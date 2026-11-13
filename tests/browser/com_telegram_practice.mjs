// Native Telegram preparation with synthetic accounts. No Telegram messages or personal media.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page,USER} from './harness.mjs';
const origin='https://www.totehm.com',out=process.argv[2]||'work/telegram-practice';fs.mkdirSync(out,{recursive:true});
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const habit='Écrire & lire / 読む #1',second='A different next step';
const steps=[{t:habit,is:['express'],f:'daily',o:id(1)},{t:second,is:['flow'],f:'weekly'}];
const tree={signed_in:true,ok:true,pseudo:'fixture',steps,trips:[{id:id(1),text:'Publish',status:'active',habits:[habit]}],
 reps:[{id:'1',text:'Scrolling',hs:[habit]}],visions:[{id:id(2),text:'Transmit',os:[id(1)]}],wisdom:[{id:id(3),text:'My words'}]};
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
const browser=await launch();
async function sample({session=true,width=390,source={ok:true,habit},sdk=true}={}){
 const writes=[];
 const x=await page(browser,{dir:'com',origin,session,viewport:{width,height:844},hasTouch:width<700,
 tables:{profiles:[{pseudo:'fixture'}],totehms:[{user_id:USER.id,steps}]},
 rpc:{my_landing:{signed_in:session,pseudo:'fixture'},my_trips:tree,element_orders_for:{ok:true,orders:{}},
  tracking_practice_for_me:source,sso_revoke_everywhere:1,habit_spaces:{ok:true,mine:true,habits:[]}},
 network:(url,req)=>{
  if(url.pathname.startsWith('/rest/v1/')&&!url.pathname.includes('/rpc/')&&req.method()!=='GET')writes.push(url.pathname);
  if(url.pathname==='/auth/v1/verify')return {status:200,contentType:'application/json',body:JSON.stringify({access_token:'test-at',refresh_token:'test-rt',token_type:'bearer',expires_in:3600,user:USER})};
  return null;
 }});
 if(sdk)await x.ctx.addInitScript(()=>{
  window.__tg={ready:0,expand:0,back:false,clicked:0};
  // Deliberately forged Telegram identity: the native app must completely ignore it.
  window.Telegram={WebApp:{initDataUnsafe:{user:{id:999999999,username:'forged'}},ready:()=>window.__tg.ready++,expand:()=>window.__tg.expand++,
   setHeaderColor:()=>{},setBackgroundColor:()=>{},BackButton:{show:()=>window.__tg.back=true,hide:()=>window.__tg.back=false,onClick:fn=>window.__tg.backClick=fn}}};
 });
 return {...x,writes};
}
const url=(ref='9007199254740993')=>origin+'/totehm?telegram=1#practice='+ref;
const opened=pg=>pg.waitForFunction(()=>window.__totehm_element_link?.().state==='opened',null,{timeout:15000});
try{
 for(const width of [390,1280]){
  const x=await sample({width});await x.pg.goto(url());await opened(x.pg);
  check(await x.pg.locator('#habits .habit.open .v-name').textContent()===habit,'Telegram opens the exact native Habit at '+width+'px');
  check(await x.pg.evaluate(()=>window.__totehm_practice().state==='resolved'&&window.__totehm_zone.vue==='habits'),'A read-only source lookup feeds existing native navigation');
  const calls=x.log.rpc.filter(r=>r.name==='tracking_practice_for_me');
  check(calls.length===1&&calls[0].body.p_outcome==='9007199254740993','The database receives an exact string ID, never a rounded number or Telegram user');
  const labels=await x.pg.locator('#habits .habit.open .mg-l').allTextContents();
  check(labels[0]==='why'&&labels[1]==='trigger · instead of','Native phrase labels stay visible in the mini-app');
  check(await x.pg.locator('#habits .habit.open [data-totehmize]').getAttribute('data-totehmize')==='habit:'+habit,'The native garment choice remains explicit and points to the same box');
  check(await x.pg.evaluate(()=>document.activeElement.tagName!=='INPUT'&&!document.activeElement.isContentEditable),'Preparation never opens an editing keyboard');
  check(!x.writes.length&&!x.log.rpc.some(r=>/tracking_(answer|open|correct|claim|settings_set)|create|rename|import/.test(r.name)),'Opening the mini-app neither records practice nor edits the TOTEHM');
  check(await x.pg.evaluate(()=>window.__tg.ready===1&&window.__tg.expand===1&&window.__totehm_telegram().sdk),'Telegram adapts the window once without supplying identity');
  await x.pg.waitForFunction(()=>window.__tg.back);
  check(await x.pg.evaluate(()=>window.__tg.back),'Telegram Back follows the native app layer');
  check(!new URL(x.pg.url()).hash&&!x.log.network.some(u=>String(u).includes(encodeURIComponent(habit))),'The consumed outcome locator contains no Habit text');
  check(!await x.pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'Native boxes fit this viewport');
  await x.pg.screenshot({path:out+'/habit-'+width+'.png'});
  await x.pg.evaluate(()=>window.__tg.backClick());await x.pg.waitForFunction(()=>document.body.classList.contains('gate')&&!window.__tg.back);
  check(await x.pg.locator('#habits .habit.open').count()===0,'Telegram Back follows the native Escape gesture and folds the TOTEHM');
  check(await x.pg.evaluate(()=>!window.__totehm_telegram().back),'At the native home, Telegram Back hides and the client can close normally');
  check(!x.log.errors.some(e=>e.startsWith('pageerror')),'No runtime errors');await x.ctx.close();
 }
 {const x=await sample({session:false});await x.pg.goto(url());await x.pg.waitForSelector('body.is-door');
  check(await x.pg.evaluate(()=>window.__totehm_practice().state==='pending'&&document.body.classList.contains('gate')),'A forged SDK identity leaves the site login gate intact');
  check(!x.log.rpc.some(r=>r.name==='tracking_practice_for_me'||r.name==='my_trips'),'No source or own account tree is read without a site session');
  await x.pg.locator('#mw-email').fill('wah@example.test');await x.pg.locator('#mw-email').press('Enter');
  await x.pg.locator('#mw-code').fill('123456');await opened(x.pg);
  check(await x.pg.locator('#habits .habit.open .v-name').textContent()===habit,'The pending source survives native email login in the same mini-app');
  check(x.log.rpc.filter(r=>r.name==='tracking_practice_for_me').length===1,'Login resolves the original intention only once');await x.ctx.close();}
 for(const result of [{ok:false},{ok:true,habit:'Deleted Habit'},{ok:true,habit:'<invalid>\u0000source'}]){
  const x=await sample({source:result});await x.pg.goto(url());
  await x.pg.waitForFunction(()=>window.__totehm_practice?.().state==='unavailable'||window.__totehm_element_link?.().state==='unavailable');
  check(await x.pg.locator('#habits .habit.open').count()===0,'An unavailable or invalid exact source never opens another Habit');await x.ctx.close();
 }
 {let release,started;const pending=new Promise(r=>started=r);
  const x=await sample({source:async({p_outcome})=>{if(p_outcome==='1'){started();await new Promise(r=>release=r);}return {ok:true,habit:p_outcome==='1'?habit:second};}});
  await x.pg.goto(url('1'));await pending;
  await x.pg.evaluate(()=>location.hash='#practice=2');release();await opened(x.pg);
  check(await x.pg.locator('#habits .habit.open .v-name').textContent()===second,'A late source response cannot overwrite a newer preparation');
  check(x.log.rpc.filter(r=>r.name==='tracking_practice_for_me').map(r=>r.body.p_outcome).join(',')==='1,2','The latest source is independently resolved');await x.ctx.close();}
 {let release,started;const pending=new Promise(r=>started=r);
  const x=await sample({source:async()=>{started();await new Promise(r=>release=r);return {ok:true,habit};}});
  await x.pg.goto(url('1'));await pending;
  await x.pg.locator('#mw-signout').evaluate(e=>e.click());await x.pg.waitForFunction(()=>!document.body.classList.contains('member'));
  release();await x.pg.waitForTimeout(350);
  check(await x.pg.locator('#habits .habit.open').count()===0&&await x.pg.evaluate(()=>window.__totehm_element_link().state!=='opened'),'A source response after signing out cannot open private content');await x.ctx.close();}
 {const x=await sample({sdk:false});await x.pg.goto(url());await opened(x.pg);
  check(await x.pg.locator('#habits .habit.open .v-name').textContent()===habit,'The same native source works when the Telegram SDK is unavailable');await x.ctx.close();}
 {const x=await sample();await x.pg.goto(origin+'/totehm#element=habit&ref='+encodeURIComponent(habit));await opened(x.pg);
  check(!await x.pg.evaluate(()=>!!window.__totehm_telegram)&&await x.pg.evaluate(()=>window.__tg.ready===0),'Ordinary site visits never initialize or depend on Telegram');await x.ctx.close();}
 {const x=await sample();await x.pg.goto(origin+'/totehm?telegram=1#practice=9223372036854775808');await x.pg.waitForSelector('body.member');
  check(!x.log.rpc.some(r=>r.name==='tracking_practice_for_me'),'An invalid bigint fragment is ignored before reading the database');await x.ctx.close();}
 console.log(JSON.stringify({suite:'Native TotehmBot mini-app',checks,passed:checks}));
}finally{await browser.close();}
