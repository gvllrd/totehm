// Dashboard/configuration remain separate from creator monetization. Synthetic accounts only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page,USER} from './harness.mjs';
const out=process.argv[2]||'work/verso-dashboard';fs.mkdirSync(out,{recursive:true});
const origin='https://www.totehm.com',today='2026-11-10',browser=await launch();let checks=0;
const check=(v,m)=>{assert(v,m);checks++;};
const habits=[{t:'Run the hill',is:['fight'],f:'daily'}];
const board={ok:true,today,telegram:false,habits:[],days:[],week:{fait:99,manque:1,top:{serie:99}},totals:{habits:1},heat:Array(84).fill(1),
 objectives:[{t:'Run a marathon',jours:12,temps:.62}],feed:['habit','objective','repulsion','vision','story','track'].map(box=>({at:today,box,k:box==='track'?'tracked_done':box+'_added',l:'<img src=x onerror=alert(1)>',i:'fight'}))};
const practice={ok:true,days_count:7,counts:{done:2,missed:1,unanswered:1,answered:3},coverage:{total_habits:1,observed_habits:1},habits:[{ref:'Run the hill',habit:'Run the hill',done:2,missed:1,unanswered:1,day_counts:Array.from({length:7},(_,i)=>({done:i<2?1:0,missed:i===2?1:0,unanswered:i===3?1:0}))}],days:Array.from({length:7},(_,i)=>({day:'2026-11-'+String(4+i).padStart(2,'0')})),trend:{state:'insufficient'},settings:{linked:false,share_chatgpt:false}};
const rpc={my_landing:{signed_in:true,pseudo:'fixture',telegram:false,higher:{active:true}},my_board:board,tracking_summary_for_me:practice,
 creator_dashboard:{ok:true,subscribers:3,month_cents:1920,pending_cents:1920,currency:'eur',next_payout:'2026-12-01',threshold_cents:2500,part:80,price_cents:2400,min_cents:300,max_cents:100000},
 my_console:{signed_in:true,offer:{enabled:true,price_cents:2400,currency:'eur',payout_fin:'1234'},subscriptions:[]},tracking_settings_get:{ok:true,settings:{timezone:'UTC',quiet_from:22,quiet_to:8,max_daily:2,share_chatgpt:false}}};
try{
 for(const width of [390,1280]){
  const {pg,ctx,log}=await page(browser,{dir:'com',origin,viewport:{width,height:844},hasTouch:width<700,tables:{profiles:[{pseudo:'fixture'}],totehms:[{user_id:USER.id,steps:habits}]},rpc});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.click('#lv-tap-turn');await pg.waitForSelector('#srch.is-pret');
  await pg.waitForFunction(()=>document.querySelector('#vs-dash').textContent.includes('My practice'));
  check(await pg.getAttribute('#srch','data-tab')==='higher'&&await pg.isVisible('#vs-dash')&&!await pg.isVisible('#mw-creator'),'The dashboard opens first, separately from monetization');
  check(await pg.isVisible('#mw-menu')&&!await pg.locator('#mw-higher,[data-hsub]').count(),'Only TotehmBot configuration follows the dashboard');
  const call=log.rpc.find(r=>r.name==='my_board');check(typeof call.body.p_tz==='string'&&call.body.p_tz,'Account activity uses the browser timezone');
  const text=await pg.locator('#vs-dash').innerText();check(text.includes('2')&&text.includes('Missed')&&!text.includes('99%')&&!await pg.locator('.db-courbe').count(),'Practice does not fall back to an obsolete percentage or streak');
  check(await pg.locator('.db-o .j').textContent()==='D-12'&&!await pg.locator('.db-o .db-bar').count(),'An objective deadline is not rendered as achievement progress');
  check(await pg.locator('.tracking-history').getAttribute('open')===null,'Account activity starts folded');
  await pg.locator('.tracking-history summary').click();
  check((await pg.locator('.db-heat span:not([style*="hidden"])').count())===84&&(await pg.locator('.db-tot span').count())===10,'Account history and inventory are available on demand');
  const native=await pg.locator('.db-f .tb').evaluateAll(nodes=>nodes.map(n=>({skin:[...n.classList].find(c=>c.startsWith('blk-')),background:getComputedStyle(n.querySelector('.h-body')).backgroundColor,square:getComputedStyle(n.querySelector('.h-body')).borderRadius,controls:n.querySelectorAll('button,input,[data-open]').length})));
  check(native.map(n=>n.skin).join(',')==='blk-h,blk-o,blk-r,blk-v,blk-w,blk-h'&&native.map(n=>n.background).join('|')==='rgb(51, 51, 102)|rgb(54, 73, 140)|rgb(116, 49, 105)|rgb(54, 73, 140)|rgb(116, 49, 105)|rgb(51, 51, 102)'&&native.every(n=>n.square==='0px'&&n.controls===0),'All five history categories keep native skins, square format and inert content');
  check(await pg.locator('.tracking-name .tb.blk-h .v-name').textContent()==='Run the hill'&&await pg.locator('.db-o .tb.blk-o .v-name').textContent()==='Run a marathon','Practice and due objectives use native TOTEHM boxes');
  check(!await pg.locator('#vs-dash img').count()&&(await pg.locator('.db-f').textContent()).includes('<img'),'History text is escaped');
  await pg.locator('[data-track-manage]').click();await pg.waitForSelector('#tracking-settings form');
  check(log.rpc.filter(r=>r.name==='tracking_settings_get').length===1&&!log.rpc.some(r=>/tracking_(answer|detail|open|settings_set)/.test(r.name)),'Configuration opens without recording practice or consent');
  await pg.click('#vs-tabs [data-vs-tab="money"]');
  check(await pg.isVisible('#mw-creator')&&!await pg.isVisible('#vs-dash')&&!await pg.isVisible('#mw-menu'),'Monetization keeps its own independent panel');
  await pg.click('#vs-tabs [data-vs-tab="higher"]');await pg.click('#vs-loupe');
  check(!await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'Dashboard zoom remains inside the viewport');
  check(!log.errors.some(e=>e.startsWith('pageerror')),'No runtime errors');
  await pg.screenshot({path:out+'/dashboard-'+width+'.png'});await ctx.close();
 }
 const {pg,ctx,log}=await page(browser,{dir:'com',origin,tables:{profiles:[{pseudo:'fixture'}]},rpc:{...rpc,tracking_summary_for_me:null}});
 await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.click('#lv-tap-turn');await pg.waitForSelector('#srch.is-pret');
 await pg.waitForFunction(()=>document.querySelector('#vs-dash').textContent.includes('Practice is unavailable'));
 check(!await pg.locator('.db-k,.db-courbe').count(),'A missing practice reader is visible and never silently restores contradictory legacy analytics');
 check(!log.errors.some(e=>e.startsWith('pageerror')),'Unavailable practice leaves the rest of the account usable');await ctx.close();
 {const {pg,ctx,log}=await page(browser,{dir:'com',origin,tables:{profiles:[{pseudo:'fixture'}]},rpc:{...rpc,my_board:null,tracking_summary_for_me:({p_days})=>({...practice,days_count:p_days})}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.click('#lv-tap-turn');await pg.waitForSelector('#srch.is-pret');
  await pg.waitForFunction(()=>document.querySelector('#vs-dash').textContent.includes('My practice'));
  check((await pg.locator('#vs-dash').innerText()).includes('7 days · self-reported')&&(await pg.locator('#vs-dash').innerText()).includes('History temporarily unavailable'),'Fresh practice remains visible when the independent history reader fails');
  check(!await pg.locator('.db-heat,.db-tot,.tracking-history').count(),'Missing history is never replaced with invented zero activity');
  await pg.locator('[data-track-period="28"]').click();await pg.waitForFunction(()=>document.querySelector('#vs-dash').textContent.includes('28 days · self-reported'));
  check(log.rpc.filter(r=>r.name==='tracking_summary_for_me').at(-1).body.p_days===28,'Practice periods remain usable while history is unavailable');
  check(!log.errors.some(e=>e.startsWith('pageerror')),'Independent history failure creates no runtime errors');await ctx.close();
 }
 console.log(JSON.stringify({suite:'Dashboard and TotehmBot configuration',checks,passed:checks}));
}finally{await browser.close();}
