// Full dashboard and private settings with real DOM, synthetic state and no real accounts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page,USER} from './harness.mjs';
const out=process.argv[2]||'work/tracking-browser';fs.mkdirSync(out,{recursive:true});
const origin='https://www.totehm.com',steps=[{t:'Read <b>slowly</b>',is:['focus'],f:'weekly'}];
const today='2026-11-10',days=Array.from({length:7},(_,n)=>({day:'2026-11-'+String(n+4).padStart(2,'0'),done:n===0?1:0,attempts:n<3?1:0,unanswered:0}));
const snapshot={ok:true,source_complete:true,today,days_count:28,source:'self_report',
 counts:{done:2,partial:1,missed:1,skipped:1,unanswered:3,attempts:4,answered:5,energy_reports:0,duration_reports:0},
 habits:[{ref:steps[0].t,habit:steps[0].t,frequency:'weekly',intentions:['focus'],done:2,partial:1,missed:1,skipped:1,unanswered:3,attempts:4,days:['d','p','m','s','a','','']}],
 days,trend:{state:'insufficient'},barriers:[{kind:'energy',count:2}],intentions:{focus:{done:2}},delivery:{failed:1,unconfirmed:0}};
const browser=await launch();let checks=0;
const check=(v,m)=>{assert(v,m);checks++;};
try{
 for(const width of [390,1280]){
  let settings={timezone:'Europe/Lisbon',quiet_from:22,quiet_to:8,max_daily:2,paused:false,linked:true,share_chatgpt:false};
  const {pg,ctx,log}=await page(browser,{dir:'com',origin,viewport:{width,height:844},hasTouch:width<700,
   tables:{profiles:[{pseudo:'fixture'}],totehms:[{user_id:USER.id,steps}]},
   rpc:{my_landing:{signed_in:true,pseudo:'fixture',telegram:true,offer:{enabled:false},higher:{active:false},sm:{}},
    my_board:{ok:true,today,tz:'Europe/Lisbon',telegram:true,habits:[],days:[],week:{},totals:{},heat:[],objectives:[],feed:[]},
    tracking_summary_for_me:()=>({...snapshot,settings}),tracking_settings_get:()=>({ok:true,settings}),
    tracking_settings_set:({p_changes})=>{settings={...settings,...p_changes};return {ok:true,settings};},
    my_trips:{signed_in:true,trips:[],reps:[],wisdom:[],visions:[],objs:{}},element_orders_for:{ok:true,orders:{}}}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');
  await pg.click('#lv-tap-turn');await pg.waitForSelector('#srch.is-pret');
  await pg.waitForFunction(()=>document.querySelector('#vs-dash')?.textContent.includes('My practice'));
  const text=await pg.locator('#vs-dash').innerText();
  check(text.includes('self-reported')&&text.includes('unknown')&&text.includes('set aside'),'Reports are distinguished from proof, silence and a deliberate skip');
  check((await pg.locator('#vs-dash .db-c.is-p').count())===1&&(await pg.locator('#vs-dash .db-c.is-s').count())===1,'Partial and skipped have distinct matrix states');
  check(!await pg.locator('#vs-dash input').count()&&!log.rpc.some(x=>/tracking_(answer|detail|open|settings_set)/.test(x.name)),'The dashboard records no check-ins and makes no unsolicited settings change');
  check(!await pg.locator('#vs-dash .db-n b').count()&&(await pg.locator('#vs-dash .db-n a').textContent())===steps[0].t,'Habit text is escaped and the original source is linked');
  check(text.includes('energy 2 times')&&text.includes('More reports are needed'),'An observed barrier is attributed, sparse data is not a trend');
  check(text.includes('not counted as unanswered'),'Delivery failures are not blamed on the person');
  await pg.locator('[data-track-manage]').click();await pg.waitForSelector('#tracking-settings form');
  check(!await pg.locator('[name="share_chatgpt"]').isChecked(),'Sharing is off by default');
  check(log.rpc.filter(x=>x.name==='tracking_settings_set').length===0,'Opening settings does not grant consent');
  await pg.locator('[name="share_chatgpt"]').check();await pg.locator('[name="max_daily"]').fill('3');
  await pg.locator('#tracking-settings button[type="submit"]').click();
  await pg.waitForFunction(()=>document.querySelector('[data-track-notice]')?.textContent==='Saved.');
  check(settings.share_chatgpt&&settings.max_daily===3,'A deliberate save records the explicit sharing choice and bounded limit');
  await pg.waitForFunction(()=>document.querySelector('#vs-dash').textContent.includes('practice summaries shared with ChatGPT'));
  check(log.rpc.filter(x=>x.name==='tracking_summary_for_me').length>=2,'The dashboard refreshes its own reader after a settings change');
  await pg.locator('[name="share_chatgpt"]').uncheck();await pg.locator('[name="paused"]').check();
  await pg.locator('#tracking-settings button[type="submit"]').click();
  await pg.waitForFunction(()=>document.querySelector('#vs-dash').textContent.includes('Questions paused'));
  check(!settings.share_chatgpt&&settings.paused,'Sharing is revocable and questions can be paused independently');
  const overflow=await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  check(!overflow,'Controls fit the viewport');
  await pg.screenshot({path:out+'/settings-'+width+'.png'});
  await pg.locator('#tracking-manage').click();await pg.locator('#vs-dash').scrollIntoViewIfNeeded();
  await pg.screenshot({path:out+'/dashboard-'+width+'.png'});
  const href=await pg.locator('#vs-dash .db-n a').getAttribute('href');await pg.goto(href);
  await pg.waitForFunction(()=>window.__totehm_element_link?.().state==='opened',null,{timeout:12000});
  check(await pg.locator('#habits .habit.open .v-name').textContent()===steps[0].t,'A dashboard insight opens the exact original Habit, through the native renderer');
  check(!log.errors.some(e=>e.startsWith('pageerror')),'No runtime errors');await ctx.close();
 }
 console.log(JSON.stringify({suite:'Intelligent tracking dashboard',checks,passed:checks}));
}finally{await browser.close();}
