// Real native box/editor, fake accounts and persistence. No production writes or models.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page,USER} from './harness.mjs';
import {elementURL} from '../../backend/supabase/functions/_shared/chatgpt-context.ts';
const out=process.argv[2]||'work/habit-rhythm';fs.mkdirSync(out,{recursive:true});
const origin='https://www.totehm.com',browser=await launch();let checks=0;
const check=(v,m)=>{assert(v,m);checks++;};
const original='Lire vingt minutes chaque soir';
const tree={signed_in:true,trips:[],reps:[],wisdom:[],visions:[],objs:{}};
async function sample(width,member=false){
 let stored=[{t:original,f:'weekly',is:['focus'],o:null}];const writes=[];
 const p=await page(browser,{dir:'com',origin,viewport:{width,height:844},hasTouch:width<700,
  tables:{profiles:[{pseudo:'fixture'}],totehms:()=>[{user_id:USER.id,steps:stored,updated_at:'2026-11-12T12:00:00Z'}]},
  rpc:{my_trips:tree,totehm_read:{...tree,ok:true,pseudo:'artist',steps:stored},my_landing:{signed_in:true,pseudo:'fixture'},element_orders_for:{ok:true,orders:{}},habit_rename_links:{ok:true}},
  network:(url,req)=>{if(url.pathname==='/rest/v1/totehms'&&req.method()==='POST'){
   const body=JSON.parse(req.postData());stored=body.steps;writes.push(structuredClone(body.steps));return {status:200,contentType:'application/json',body:'[]'};
  }return null;}});
 await p.pg.goto(elementURL({kind:'habit',ref:original},member?'artist':null));
 await p.pg.waitForFunction(()=>window.__totehm_element_link?.().state==='opened',null,{timeout:15000});
 return {...p,writes,stored:()=>stored};
}
try{
 for(const width of [390,1280]){
  const {pg,ctx,log,writes,stored}=await sample(width);
  const input=pg.locator('#habits .habit.open [data-edit]'),hint=pg.locator('#habits [data-rhythm-preview]');
  check(await pg.locator('[data-rhythm]').textContent()==='Use every evening check-in','Inline recognition in the original native box');
  check((await hint.textContent()).includes('Session length and exact times stay in your text'),'The duration is not a reminder interval');
  check(writes.length===0,'Opening an existing Habit never changes the stored rhythm');
  const before=await input.textContent();await pg.locator('[data-rhythm]').click();
  await pg.waitForFunction(()=>window.__totehm_save?.().nonConfirme===false);
  check(stored()[0].f==='every_evening'&&stored()[0].t===before,'Explicit acceptance saves only the chosen rhythm and preserves original text');
  check(!await pg.locator('[data-rhythm]').count(),'An accepted suggestion disappears');
  const current=pg.locator('#habits .habit.open [data-edit]');
  await current.fill('毎朝20分間読む');
  await pg.waitForSelector('[data-rhythm-frequency="every_morning"]');
  check(await current.evaluate(e=>document.activeElement===e),'Typing a proposal does not replace the editor or lose the caret');
  await pg.waitForTimeout(2800);
  check(stored()[0].f==='every_evening'&&stored()[0].t==='毎朝20分間読む','Saving edited text does not silently accept its proposed rhythm');
  check(log.rpc.some(r=>r.name==='habit_rename_links'&&r.body.p_old===original&&r.body.p_new==='毎朝20分間読む'),'Native rename flow retains links and tracking history');
  await pg.locator('[data-rhythm-ignore]').click();
  check(!await pg.locator('[data-rhythm]').count()&&stored()[0].f==='every_evening','Keep current dismisses without a rhythm write');
  await current.fill('Courir trois fois par semaine');
  await pg.waitForSelector('[data-rhythm-frequency="weekly"]');
  check((await hint.textContent()).includes('target 3 / week')&&(await hint.textContent()).includes('not one notification per session'),'A quota is a period-level check-in, never three automatic notifications');
  await pg.screenshot({path:out+'/quota-'+width+'.png'});
  await pg.locator('[data-rhythm]').click();await pg.waitForTimeout(1100);
  check(stored()[0].f==='weekly'&&stored()[0].t==='Courir trois fois par semaine','The weekly check-in and complete quota text persist together');
  // A stale/mutated DOM button can never apply a suggestion to different text.
  await current.fill('Read every morning');
  await pg.waitForSelector('[data-rhythm-frequency="every_morning"]');
  await pg.locator('[data-rhythm]').evaluate(e=>e.dataset.rhythmFrequency='daily');
  await pg.locator('[data-rhythm]').click();await pg.waitForTimeout(2800);
  check(stored()[0].f==='weekly','The handler rechecks the current text and proposed frequency');
  await current.fill('Read every morning or every evening');
  check(!await pg.locator('[data-rhythm]').count()&&(await hint.textContent()).includes('manual choice'),'Ambiguity exposes no accept button');
  await current.fill('Read 20 minutes');
  check(!await pg.locator('[data-rhythm]').count()&&(await hint.textContent()).includes('session length is not a rhythm'),'Duration alone never becomes every_minute');
  await current.fill('Read every day at 07:30');await pg.waitForSelector('[data-rhythm-frequency="daily"]');
  check((await hint.textContent()).includes('Notifications follow your settings'),'Exact clock time is disclosed as text, without changing notification settings');
  await pg.screenshot({path:out+'/timing-'+width+'.png'});
  // Preserve the member's own timing words and update quotas without replacing the editor.
  await pg.locator('[data-pk^="freq:h:"]').click();
  let words=pg.locator('[data-fqin]');await words.fill('2x/week at 7am');
  check((await pg.locator('[data-fq-feedback]').textContent()).includes('target 2 / week'),'Manual input keeps its repetition target');
  const originalEditor=await words.elementHandle();await words.fill('3x/week at 7am');
  check((await pg.locator('[data-fq-feedback]').textContent()).includes('target 3 / week')&&await words.evaluate((e,old)=>e===old,originalEditor),'Same-cadence edits update the exact quota without replacing the editor');
  await words.press('Enter');await pg.waitForTimeout(1100);
  check(stored()[0].f==='weekly'&&stored()[0].rhythm_text==='3x/week at 7am'&&stored()[0].t==='Read every day at 07:30','Confirmed timing words survive separately from the unchanged Habit and confirmed cadence');
  await pg.goto(elementURL({kind:'habit',ref:'Read every day at 07:30'}));await pg.waitForFunction(()=>window.__totehm_element_link?.().state==='opened');
  await pg.locator('[data-pk^="freq:h:"]').click();words=pg.locator('[data-fqin]');
  check(await words.inputValue()==='3x/week at 7am','Authored timing reloads from cloud/cache through the original native box');
  await pg.locator('[data-fq$="|weekly"]:not(.fq-hit)').click();await pg.waitForTimeout(1100);
  check(stored()[0].rhythm_text==='3x/week at 7am','Selecting the existing cadence preserves the confirmed wording');
  await pg.locator('[data-pk^="freq:h:"]').click();words=pg.locator('[data-fqin]');
  await words.fill('2x/week');
  await words.evaluate(el=>{el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.value='毎朝';el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,inputType:'insertCompositionText'}));});
  check(!await pg.locator('[data-fq-suggested][data-fq$="|every_morning"]').count(),'A time-frequency IME composition is not parsed mid-word');
  await words.evaluate(el=>el.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,cancelable:true,isComposing:true,inputType:'insertLineBreak'})));
  check(await words.count()===1&&stored()[0].f==='weekly','IME candidate confirmation cannot commit timing through beforeinput');
  await words.dispatchEvent('compositionend');
  check(await words.evaluate(e=>document.activeElement===e)&&await pg.locator('[data-fq-suggested][data-fq$="|every_morning"]').count()===1,'Frequency composition completion updates feedback while keeping the caret');
  await words.fill('every day except Sunday');
  check(!await pg.locator('[data-fq-suggested]').count()&&(await pg.locator('[data-fq-feedback]').textContent()).includes('not scheduled'),'Exceptions produce an explicit manual choice and no invented schedule');
  await words.fill('');await pg.locator('[data-pk^="freq:h:"]').click();
  // Existing manual rhythm selection remains available and overrides text recognition.
  await pg.locator('[data-pk^="freq:h:"]').click();
  const fqin=pg.locator('[data-fqin]');await fqin.fill('nonsense without a recurrence');
  check(!await pg.locator('[data-fq].fq-hit').count(),'Unknown manual input never defaults to sometimes');
  await pg.locator('[data-fq$="|monthly"]').click();await pg.waitForTimeout(1100);
  check(stored()[0].f==='monthly'&&!await pg.locator('[data-rhythm]').count(),'Manual override is respected for this text');
  await pg.reload();await pg.waitForFunction(()=>window.__totehm_lv);
  // Read from the persisted record through the regular source-opening route.
  await pg.goto(elementURL({kind:'habit',ref:'Read every day at 07:30'}));
  await pg.waitForFunction(()=>window.__totehm_element_link?.().state==='opened');
  check(await pg.locator('[data-pk^="freq:h:"]').textContent()==='monthly ▾','A reload preserves the explicit stored rhythm instead of inferring a replacement');
  await pg.locator('#habits .habit.open .w-x').click();
  await pg.locator('[data-add="h"]').click();
  const fresh=pg.locator('#habits .habit.open [data-edit]');
  await fresh.evaluate(el=>{
   el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.textContent='أقرأ كل يوم';
   el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,inputType:'insertCompositionText'}));
  });
  check(!await pg.locator('[data-rhythm]').count(),'An IME composition is not interpreted before completion');
  await fresh.dispatchEvent('compositionend');await pg.waitForSelector('[data-rhythm-frequency="daily"]');
  check(await fresh.evaluate(e=>e.dir==='auto'&&getComputedStyle(e).direction==='rtl'),'The native text field follows Arabic direction without changing the box');
  await pg.waitForTimeout(2800);check(stored().at(-1).f===null,'A new Habit has no inferred stored rhythm before acceptance');
  await pg.screenshot({path:out+'/arabic-'+width+'.png'});
  await pg.locator('[data-rhythm]').click();await pg.waitForTimeout(1100);
  check(stored().at(-1).t==='أقرأ كل يوم'&&stored().at(-1).f==='daily','New multilingual Habits use the same explicit native save path');
  check(!await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'Natural input, explanation and buttons fit the viewport');
  check(!log.functions.length&&!log.network.some(u=>/openai|anthropic/i.test(String(u))),'Recognition never invokes an Edge Function or external model');
  check(!log.rpc.some(r=>r.name==='tracking_settings_set'),'Habit text cannot change bot settings or consent');
  check(!log.errors.some(e=>e.startsWith('pageerror')),'No runtime errors');
  await ctx.close();
 }
 {const {pg,ctx,writes,log}=await sample(390,true);
  check(!await pg.locator('[data-rhythm-preview],[data-rhythm],[data-fqin],[data-edit]').count(),'Member content stays read-only with no rhythm controls');
  check(writes.length===0&&!log.rpc.some(r=>/rename|_set/.test(r.name)),'Reading a creator Habit never sets a rhythm or changes its source');await ctx.close();
 }
 console.log(JSON.stringify({suite:'Native multilingual Habit editing',checks,passed:checks}));
}finally{await browser.close();}
