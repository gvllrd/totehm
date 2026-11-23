// Dashboard/configuration remain separate from creator monetization. Synthetic accounts only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page,USER} from './harness.mjs';
const out=process.argv[2]||'work/verso-dashboard';fs.mkdirSync(out,{recursive:true});
const origin='https://www.totehm.com',today='2026-11-10',browser=await launch();let checks=0;
const check=(v,m)=>{assert(v,m);checks++;};
const habits=[{t:'Run the hill',is:['fight'],f:'daily'}];
const board={ok:true,today,telegram:false,habits:[],days:[],week:{fait:99,manque:1,top:{serie:99}},totals:{habits:1},heat:Array(84).fill(1),
 objectives:[{t:'Run a marathon',jours:12,temps:.62}],feed:['habit','objective','repulsion','vision','story','track'].map(box=>({at:today,box,k:box==='track'?'tracked_on_it':box+'_added',l:'<img src=x onerror=alert(1)>',i:'fight'}))};
const practice={ok:true,days_count:7,counts:{on_it:2,no_energy:1,unanswered:1,answered:3},coverage:{total_habits:1,observed_habits:1},habits:[{ref:'Run the hill',habit:'Run the hill',on_it:2,no_energy:1,unanswered:1,day_counts:Array.from({length:7},(_,i)=>({on_it:i<2?1:0,no_energy:i===2?1:0,unanswered:i===3?1:0}))}],days:Array.from({length:7},(_,i)=>({day:'2026-11-'+String(4+i).padStart(2,'0')})),trend:{state:'insufficient'},settings:{linked:false,share_chatgpt:false}};
const rpc={my_landing:{signed_in:true,pseudo:'fixture',telegram:false,higher:{active:true}},my_board:board,tracking_summary_for_me:practice,
 creator_dashboard:{ok:true,subscribers:3,month_cents:1920,pending_cents:1920,currency:'eur',next_payout:'2026-12-01',threshold_cents:2500,part:80,price_cents:2400,min_cents:300,max_cents:100000},
 my_console:{signed_in:true,offer:{enabled:true,price_cents:2400,currency:'eur',payout_fin:'1234'},subscriptions:[]},tracking_settings_get:{ok:true,settings:{timezone:'UTC',quiet_from:22,quiet_to:8,max_daily:2,share_chatgpt:false}}};
try{
 for(const width of [390,1280]){
  const {pg,ctx,log}=await page(browser,{dir:'com',origin,viewport:{width,height:844},hasTouch:width<700,tables:{profiles:[{pseudo:'fixture'}],totehms:[{user_id:USER.id,habits:habits}]},rpc});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.click('#lv-tap-turn');await pg.waitForSelector('#srch.is-pret');
  /* 23/11 (Wah) : plus de tableau de bord — Go Higher = Higher GPT (My Chapter) puis TotehmBot */
  await pg.waitForTimeout(800);
  check(await pg.getAttribute('#srch','data-tab')==='higher'&&await pg.isVisible('#mw-gpt')&&await pg.isVisible('#mw-menu')&&!await pg.isVisible('#mw-creator'),'Go Higher opens first: Higher GPT then TotehmBot, separately from monetization');
  check(!await pg.locator('#vs-dash,.tracking-matrix,.db-o,#mw-higher,[data-hsub]').count()&&!log.rpc.some(r=>r.name==='my_board'||r.name==='tracking_summary_for_me'),'No dashboard and no dashboard read');
  await pg.locator('#tracking-manage').click();await pg.waitForSelector('#tracking-settings form');
  check(log.rpc.filter(r=>r.name==='tracking_settings_get').length===1&&!log.rpc.some(r=>/tracking_(answer|detail|open|settings_set)/.test(r.name)),'Configuration opens without recording practice or consent');
  await pg.click('#vs-tabs [data-vs-tab="money"]');
  check(await pg.isVisible('#mw-creator')&&!await pg.isVisible('#mw-gpt')&&!await pg.isVisible('#mw-menu'),'Monetization keeps its own independent panel');
  await pg.click('#vs-tabs [data-vs-tab="higher"]');await pg.click('#vs-loupe');
  check(!await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'The verso zoom remains inside the viewport');
  check(!log.errors.some(e=>e.startsWith('pageerror')),'No runtime errors');
  await pg.screenshot({path:out+'/dashboard-'+width+'.png'});await ctx.close();
 }
 console.log(JSON.stringify({suite:'Go Higher: Higher GPT and TotehmBot',checks,passed:checks}));
}finally{await browser.close();}
