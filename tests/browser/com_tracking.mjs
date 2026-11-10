// Real DOM with synthetic private reports; no accounts, deliveries or production writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page,USER} from './harness.mjs';
const out=process.argv[2]||'work/tracking-browser';fs.mkdirSync(out,{recursive:true});
const origin='https://www.totehm.com',steps=[{t:('Read <b>slowly</b> 🌍 '+ 'long international Habit 日本語 '.repeat(150)).trim(),is:['focus'],f:'weekly'}];
const today='2026-11-10';
function snapshot(span,settings){
 const days=Array.from({length:span},(_,i)=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-span+1+i);return {day:d.toISOString().slice(0,10)};});
 return {ok:true,source_complete:true,today,days_count:span,source:'self_report',settings,
  counts:{done:span===7?2:8,partial:1,missed:2,skipped:1,unanswered:3,pending:1,attempts:5,answered:6},
  coverage:{total_habits:5,observed_habits:1,answered:6,delivered:10,pending:1},
  habits:[{ref:steps[0].t,habit:steps[0].t,frequency:'weekly',intentions:['focus'],done:span===7?2:8,partial:1,missed:2,skipped:1,unanswered:3,reports:10,
   day_counts:days.map((d,i)=>({...d,done:i===0?1:0,missed:i===0?1:0,partial:i===1?1:0,skipped:i===2?1:0,unanswered:i===3?1:0,pending:i===4?1:0}))}],
  days,trend:{state:'insufficient'},delivery:{failed:1,unconfirmed:0}};
}
const browser=await launch();let checks=0;
const check=(v,m)=>{assert(v,m);checks++;};
try{
 for(const width of [390,1280]){
  let settings={timezone:'Europe/Lisbon',quiet_from:22,quiet_to:8,max_daily:2,paused:false,linked:true,share_chatgpt:false},delayed=false,release;
  const {pg,ctx,log}=await page(browser,{dir:'com',origin,viewport:{width,height:844},hasTouch:width<700,
   tables:{profiles:[{pseudo:'fixture'}],totehms:[{user_id:USER.id,steps}]},
   rpc:{my_landing:{signed_in:true,pseudo:'fixture',telegram:true,offer:{enabled:false},higher:{active:false},sm:{}},
    my_board:{ok:true,today,tz:'Europe/Lisbon',telegram:true,habits:[],days:[],week:{},totals:{},heat:[],objectives:[{t:'Read a book',jours:10,temps:.7}],feed:[]},
    tracking_summary_for_me:async({p_days})=>{if(delayed&&p_days===28){delayed=false;await new Promise(r=>release=r);}return snapshot(p_days,settings);},tracking_settings_get:()=>({ok:true,settings}),
    tracking_settings_set:({p_changes})=>{settings={...settings,...p_changes};return {ok:true,settings};},
    my_trips:{signed_in:true,trips:[],reps:[],wisdom:[],visions:[],objs:{}},element_orders_for:{ok:true,orders:{}}}});
  await pg.addInitScript(()=>{window.__copied=[];Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.__copied.push(text)}});});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');
  await pg.click('#lv-tap-turn');await pg.waitForSelector('#srch.is-pret');
  await pg.waitForFunction(()=>document.querySelector('#vs-dash')?.textContent.includes('My practice'));
  const text=await pg.locator('#vs-dash').innerText();
  check(text.includes('7 days · self-reported')&&text.includes('No response is never a Missed')&&text.includes('Earlier reports: 1 in part · 1 set aside'),'One period, honest unknowns and unchanged historical states');
  check(text.includes('1 / 5 Habits with observations'),'Coverage distinguishes observed Habits from all choices');
  check((await pg.locator('.tracking-cell.has-done.has-missed').count())===1&&(await pg.locator('.tracking-cell.has-done.has-missed').textContent()).includes('×'),'One successful report cannot hide a missed report on the same day');
  check(!await pg.locator('#vs-dash input').count()&&!log.rpc.some(x=>/tracking_(answer|detail|open|settings_set)/.test(x.name)),'The dashboard never writes reports or consent');
  check(!await pg.locator('#vs-dash .db-n b').count()&&(await pg.locator('#vs-dash .db-n a').textContent())===steps[0].t,'The full long Unicode Habit is escaped and linked to its original');
  check(await pg.locator('.tracking-matrix .db-n').evaluate(e=>e.getBoundingClientRect().height<=200),'A very long Habit remains a readable preview, with its exact source kept intact');
  check(text.includes('2 Missed reports')&&text.includes('do not explain why')&&!text.includes('Consider a smaller'),'Insights attribute reported counts without inventing a cause');
  check(text.includes('not counted as unanswered'),'Delivery failures are distinct from unknown practice');
  check(!await pg.locator('#mw-higher,#mw-higher-acts,#mw-hs-hint').count()&&(await pg.getAttribute('#mw-menu','aria-label'))==='TotehmBot configuration','Duplicate subscription markup and controls are removed');
  check(!await pg.locator('.tracking-history').getAttribute('open')&&!await pg.locator('.db-o .db-bar').count(),'Application history is secondary and deadlines never mimic progress');
  await pg.locator('[data-track-period="28"]').click();await pg.waitForFunction(()=>document.querySelector('#vs-dash').textContent.includes('28 days · self-reported'));
  check((await pg.locator('.tracking-cell').count())===28&&log.rpc.at(-1).body.p_days===28,'The selected period drives all counts and all day cells');
  check(!log.rpc.some(x=>/tracking_(answer|detail|open|settings_set)/.test(x.name)),'Changing the read period is not a settings write');
  await pg.locator('[data-track-period="7"]').click();await pg.waitForFunction(()=>document.querySelector('#vs-dash').textContent.includes('7 days · self-reported'));
  delayed=true;await pg.locator('[data-track-period="28"]').click();await pg.waitForFunction(()=>true);
  await pg.locator('[data-track-period="7"]').click();release();await pg.waitForTimeout(200);
  check((await pg.locator('.tracking-cell').count())===7,'A late period response never overwrites a newer selection');
  check((await pg.evaluate(()=>window.__copied.length))===0,'The review prompt is never copied automatically');
  await pg.locator('[data-track-copy]').click();
  check((await pg.evaluate(()=>window.__copied.length))===1&&(await pg.evaluate(()=>window.__copied[0])).includes('past 7 days')&&(await pg.locator('[data-track-copy-status]').textContent()).startsWith('Copied.'),'One deliberate gesture copies a generic review prompt, without personal data');
  check((await pg.getAttribute('.tracking-review a','href'))==='/chatgpt','Higher uses the existing consent page without data in the URL');
  await pg.locator('[data-track-manage]').click();await pg.waitForSelector('#tracking-settings form');
  check(!await pg.locator('[name="share_chatgpt"]').isChecked()&&log.rpc.filter(x=>x.name==='tracking_settings_set').length===0,'Opening configuration never grants sharing');
  await pg.locator('[name="share_chatgpt"]').check();await pg.locator('[name="max_daily"]').fill('3');
  await pg.locator('#tracking-settings button[type="submit"]').click();
  await pg.waitForFunction(()=>document.querySelector('[data-track-notice]')?.textContent==='Saved.');
  check(settings.share_chatgpt&&settings.max_daily===3,'Only an explicit save changes sharing and notification limits');
  await pg.waitForFunction(()=>document.querySelector('#vs-dash').textContent.includes('practice summaries shared with ChatGPT'));
  await pg.locator('[name="share_chatgpt"]').uncheck();await pg.locator('[name="paused"]').check();await pg.locator('#tracking-settings button[type="submit"]').click();
  await pg.waitForFunction(()=>document.querySelector('#vs-dash').textContent.includes('Notifications paused'));
  check(!settings.share_chatgpt&&settings.paused,'Sharing can be revoked independently of pausing notifications');
  check(!await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'Long Habits and configuration fit the viewport');
  await pg.screenshot({path:out+'/settings-'+width+'.png'});
  await pg.locator('#tracking-manage').click();await pg.locator('#vs-dash').evaluate(e=>e.scrollIntoView({block:'start'}));await pg.screenshot({path:out+'/dashboard-'+width+'.png'});
  const href=await pg.locator('#vs-dash .db-n a').getAttribute('href');await pg.goto(href);
  await pg.waitForFunction(()=>window.__totehm_element_link?.().state==='opened',null,{timeout:12000});
  check(await pg.locator('#habits .habit.open .v-name').textContent()===steps[0].t,'The report opens the exact Habit through the native renderer');
  check(!log.errors.some(e=>e.startsWith('pageerror')),'No runtime errors');await ctx.close();
 }
 console.log(JSON.stringify({suite:'Quiet tracking dashboard',checks,passed:checks}));
}finally{await browser.close();}
