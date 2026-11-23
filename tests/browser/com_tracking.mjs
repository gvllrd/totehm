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
  counts:{on_it:span===7?2:8,no_time:1,no_energy:2,not_on_it:1,unanswered:3,pending:1,answered:6},
  coverage:{total_habits:5,observed_habits:1,answered:6,delivered:10,pending:1},
  habits:[{ref:steps[0].t,habit:steps[0].t,frequency:'weekly',intentions:['focus'],on_it:span===7?2:8,no_time:1,no_energy:2,not_on_it:1,unanswered:3,reports:10,
   day_counts:days.map((d,i)=>({...d,on_it:i===0?1:0,no_energy:i===0?1:0,no_time:i===1?1:0,not_on_it:i===2?1:0,unanswered:i===3?1:0,pending:i===4?1:0}))}],
  days,trend:{state:'insufficient'},delivery:{failed:1,unconfirmed:0}};
}
const browser=await launch();let checks=0;
const check=(v,m)=>{assert(v,m);checks++;};
try{
 for(const width of [390,1280]){
  let settings={timezone:'Europe/Lisbon',quiet_from:22,quiet_to:8,max_daily:2,paused:false,linked:true,share_chatgpt:false},delayed=false,release;
  const {pg,ctx,log}=await page(browser,{dir:'com',origin,viewport:{width,height:844},hasTouch:width<700,
   tables:{profiles:[{pseudo:'fixture'}],totehms:[{user_id:USER.id,habits:steps}]},
   rpc:{my_landing:{signed_in:true,pseudo:'fixture',telegram:true,offer:{enabled:false},higher:{active:false},sm:{}},
    my_board:{ok:true,today,tz:'Europe/Lisbon',telegram:true,habits:[],days:[],week:{},totals:{},heat:[],objectives:[{t:'Read a book',jours:10,temps:.7}],feed:[]},
    tracking_summary_for_me:async({p_days})=>{if(delayed&&p_days===28){delayed=false;await new Promise(r=>release=r);}return snapshot(p_days,settings);},tracking_settings_get:()=>({ok:true,settings}),
    tracking_settings_set:({p_changes})=>{settings={...settings,...p_changes};return {ok:true,settings};},
    my_totehm:{signed_in:true,objectives:[],repulsions:[],stories:[],visions:[],objs:{}},element_orders_for:{ok:true,orders:{}}}});
  await pg.addInitScript(()=>{window.__copied=[];Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.__copied.push(text)}});});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');
  await pg.click('#lv-tap-turn');await pg.waitForSelector('#srch.is-pret');
  /* 23/11 (Wah : « retirer le dashboard… juste ChatGPT et Telegram ») : l'onglet Go Higher = Higher GPT puis TotehmBot */
  await pg.waitForTimeout(800);
  const v=await pg.evaluate(()=>{const g=document.getElementById('mw-gpt'),t=document.getElementById('mw-menu');
    return {dash:!!document.getElementById('vs-dash'),grille:document.querySelectorAll('.tracking-matrix,.tracking-cell,.db-o').length,
      ordre:!!(g&&t&&(g.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING)),chap:[...g.querySelectorAll('[data-ch]')].map(b=>b.textContent).join('|')};});
  check(!v.dash&&v.grille===0&&v.ordre&&v.chap==='This week|This month','No dashboard: Higher GPT (My Chapter) then TotehmBot → '+JSON.stringify(v));
  check(!log.rpc.some(x=>x.name==='my_board'||x.name==='tracking_summary_for_me'),'The verso no longer reads a dashboard');
  await pg.locator('#tracking-manage').click();await pg.waitForSelector('#tracking-settings form');
  check(!await pg.locator('[name="share_chatgpt"]').isChecked()&&log.rpc.filter(x=>x.name==='tracking_settings_set').length===0,'Opening configuration never grants sharing');
  await pg.locator('[name="share_chatgpt"]').check();await pg.locator('[name="max_daily"]').fill('3');
  await pg.locator('#tracking-settings button[type="submit"]').click();
  await pg.waitForFunction(()=>document.querySelector('[data-track-notice]')?.textContent==='Saved.');
  check(settings.share_chatgpt&&settings.max_daily===3,'Only an explicit save changes sharing and notification limits');
  await pg.locator('[name="share_chatgpt"]').uncheck();await pg.locator('[name="paused"]').check();await pg.locator('#tracking-settings button[type="submit"]').click();
  await pg.waitForTimeout(800);
  check(!settings.share_chatgpt&&settings.paused,'Sharing can be revoked independently of pausing notifications');
  check(!await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'Configuration fits the viewport');
  await pg.screenshot({path:out+'/settings-'+width+'.png'});
  check(!log.errors.some(e=>e.startsWith('pageerror')),'No runtime errors');await ctx.close();
 }
 console.log(JSON.stringify({suite:'Go Higher: Higher GPT and TotehmBot, no dashboard',checks,passed:checks}));
}finally{await browser.close();}
