// Real native usual-place editing and privacy boundaries. Synthetic accounts only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page,USER} from './harness.mjs';
import {elementURL} from '../../backend/supabase/functions/_shared/chatgpt-context.ts';
const out=process.argv[2]||'work/usual-place';fs.mkdirSync(out,{recursive:true});
const origin='https://www.totehm.com',habit='Read every evening',privatePlace='My private kitchen',nextPlace='Bibliothèque · القراءة';
const tree={signed_in:true,trips:[],reps:[],wisdom:[],visions:[],objs:{}};
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
const browser=await launch();
async function signal(p){let timer;try{return await Promise.race([p,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Expected fixture request did not start')),10000))]);}finally{clearTimeout(timer);}}
async function sample({width=390,delayPlace=false,placeError=false,placeHook=null,renameHook=null}={}){
 let steps=[{t:habit,f:'every_evening',is:['focus']}],release;
 const placeMap=new Map([[habit,privatePlace]]),placeCalls=[],renameCalls=[],writes=[];let announce;const placeRequested=new Promise(r=>announce=r);
 const x=await page(browser,{dir:'com',origin,viewport:{width,height:844},hasTouch:width<700,
  tables:{profiles:[{pseudo:'fixture'}],totehms:()=>[{user_id:USER.id,steps}]},
  rpc:{my_landing:{signed_in:true,pseudo:'fixture'},my_trips:tree,element_orders_for:{ok:true,orders:{}},
   habit_spaces:{ok:true,mine:true,habits:[]},totehm_read:{...tree,ok:true,pseudo:'artist',steps:[{t:habit,is:['focus'],f:'daily'}]},
   creator_page:{ok:true,pseudo:'artist',palette:['focus'],sale:{open:false},viewer:{signed_in:true,can_read:true}},
   member_media:{ok:true,items:[]},club_spots_of:{ok:true,items:[]},sso_revoke_everywhere:1,
   habit_spot_set:async args=>{placeCalls.push(args);const result=await placeHook?.(args,placeCalls.length);if(result===false||result?.ok===false)return result;
    if(args.p_place)placeMap.set(args.p_habit,args.p_place);else placeMap.delete(args.p_habit);return result??null;},
   habit_rename_links:async args=>{renameCalls.push(args);const result=await renameHook?.(args,renameCalls.length);if(result===false||result?.ok===false)return result;
    if(placeMap.has(args.p_old)){const place=placeMap.get(args.p_old);placeMap.delete(args.p_old);placeMap.set(args.p_new,place);}return true;}},
  network:async(url,req)=>{
   if(url.pathname==='/rest/v1/habit_spots'){
    assert.equal(url.searchParams.get('user_id'),'eq.'+USER.id);
    const snapshot=[...placeMap].map(([habit_text,place])=>({habit_text,place}));
    announce();if(delayPlace)await new Promise(r=>release=r);
    return {status:placeError?503:200,contentType:'application/json',body:JSON.stringify(placeError?{message:'unavailable'}:snapshot)};
   }
   if(url.pathname==='/rest/v1/totehms'&&req.method()==='POST'){
    steps=JSON.parse(req.postData()).steps;writes.push(structuredClone(steps));return {status:200,contentType:'application/json',body:'[]'};
   }
   return null;
  }});
 await x.ctx.addInitScript(()=>{window.__geoCalls=0;Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:()=>window.__geoCalls++,watchPosition:()=>window.__geoCalls++}});});
 return {...x,placeCalls,renameCalls,writes,placeRequested,places:()=>new Map(placeMap),release:()=>release?.()};
}
async function opened(x){await x.pg.goto(elementURL({kind:'habit',ref:habit}));await x.pg.waitForFunction(()=>window.__totehm_element_link?.().state==='opened',null,{timeout:15000});}
async function enterMember(x){
 await x.pg.click('#lv-m-members');await x.pg.waitForSelector('#mb-q:visible');
 await x.pg.fill('#mb-q','artist');await x.pg.keyboard.press('Enter');
 await x.pg.waitForFunction(()=>document.body.classList.contains('lv-membre')&&!document.body.classList.contains('mb-cherche')&&!window.__totehm_lv().bouge);
}
try{
 for(const width of [390,1280]){
  const x=await sample({width});await opened(x);
  check(await x.pg.locator('[data-pk^="spot:h:"]').textContent()===privatePlace,'The authored usual place appears in its original Habit at '+width+'px');
  check(x.placeCalls.length===0&&!x.writes.length,'Opening an Habit never edits the place or the Habit');
  await x.pg.locator('[data-pk^="spot:h:"]').click();
  const input=x.pg.locator('[data-spot]');
  check(await input.getAttribute('placeholder')==='where I usually do it','The place field names the habitual context explicitly');
  check(await input.getAttribute('dir')==='auto','A usual place accepts the member’s own writing direction');
  await input.fill(nextPlace);await input.press('Enter');
  await x.pg.waitForFunction(p=>document.querySelector('[data-pk^="spot:h:"]')?.textContent===p,nextPlace);
  check(x.placeCalls.length===1&&x.placeCalls[0].p_habit===habit&&x.placeCalls[0].p_place===nextPlace,'Enter saves the exact text and exact source Habit');
  await x.pg.locator('[data-pk^="spot:h:"]').click();await x.pg.locator('[data-spot]').fill('My studio');
  await x.pg.locator('#habits .habit.open .v-name').click();
  await x.pg.waitForFunction(()=>document.querySelector('[data-pk^="spot:h:"]')?.textContent==='My studio');
  check(x.placeCalls.at(-1).p_place==='My studio','Leaving the place field saves it without requiring a hardware Enter key');
  await x.pg.locator('#habits .habit.open .v-name').fill('Read every evening at home');
  await x.pg.locator('#habits .habit.open .v-name').press('Enter');await x.pg.waitForTimeout(500);
  // Opening another native selector repaints the Habit without reloading the server graph.
  await x.pg.locator('[data-pk^="freq:h:"]').click();
  check(await x.pg.locator('[data-pk^="spot:h:"]').textContent()==='My studio','A local Habit rename preserves its habitual place through a native repaint');
  await x.pg.locator('[data-pk^="spot:h:"]').click();await x.pg.locator('[data-spot]').fill('');await x.pg.locator('[data-spot]').press('Enter');
  check(x.placeCalls.at(-1).p_habit==='Read every evening at home'&&x.placeCalls.at(-1).p_place==='','Clearing the usual place detaches it from the current exact Habit');
  check(await x.pg.evaluate(()=>window.__geoCalls===0),'Habitual context never asks for a GPS position');
  check(!x.log.rpc.some(r=>/spot_(create|schedule)|tracking_(answer|open|claim)/.test(r.name)),'A usual-place edit creates neither a precise spot nor a practice report');
  check(!await x.pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'The native place controls fit this viewport');
  await x.pg.screenshot({path:out+'/place-'+width+'.png'});
  check(!x.log.errors.some(e=>e.startsWith('pageerror')),'No runtime errors');await x.ctx.close();
 }
 {const x=await sample();await opened(x);
  await x.pg.keyboard.press('Escape');await x.pg.waitForFunction(()=>document.body.classList.contains('gate')&&!window.__totehm_lv().bouge);
  await enterMember(x);await x.pg.evaluate(h=>location.hash='#element=habit&ref='+encodeURIComponent(h),habit);
  await x.pg.waitForFunction(()=>!document.body.classList.contains('gate')&&!!document.querySelector('#habits .habit.open'));
  check(!(await x.pg.locator('#habits').textContent()).includes(privatePlace),'A member with the same Habit text never inherits the viewer’s private usual place');
  check(!await x.pg.locator('[data-spot]').count(),'A subscribed/member Habit has no usual-place editor');await x.ctx.close();}
 {const x=await sample({delayPlace:true});await x.pg.goto(origin+'/totehm');await x.placeRequested;
  await enterMember(x);x.release();await x.pg.evaluate(h=>location.hash='#element=habit&ref='+encodeURIComponent(h),habit);await x.pg.waitForFunction(()=>!document.body.classList.contains('gate')&&!!document.querySelector('#habits .habit.open'));
  await x.pg.waitForTimeout(350);
  check(!(await x.pg.locator('#habits').textContent()).includes(privatePlace),'A late personal place read cannot repaint another member’s ecosystem');await x.ctx.close();}
 {const x=await sample({delayPlace:true});await x.pg.goto(origin+'/totehm');await x.placeRequested;
  await x.pg.locator('#mw-signout').evaluate(e=>e.click());await x.pg.waitForFunction(()=>!document.body.classList.contains('member'));
  x.release();await x.pg.waitForTimeout(350);
  check(!(await x.pg.locator('#habits').textContent()).includes(privatePlace),'A late place read after sign-out cannot expose private context');await x.ctx.close();}
 {const x=await sample({placeError:true});await opened(x);
  check(!await x.pg.locator('[data-spot]').count()&&x.log.errors.some(e=>e.includes('usual_place_read_failed')),'A read failure is logged and does not manufacture a location');await x.ctx.close();}
 // The server-acknowledged usual place and exact Habit ref share one per-Habit queue.
 {let release,start;const gate=new Promise(r=>release=r),started=new Promise(r=>start=r);
  const x=await sample({placeHook:async()=>{start();await gate;}});await opened(x);
  await x.pg.locator('[data-pk^="spot:h:"]').click();await x.pg.locator('[data-spot]').fill('Delayed studio');await x.pg.locator('[data-spot]').press('Enter');await signal(started);
  await x.pg.locator('#habits .habit.open .v-name').fill('Read with intention');await x.pg.locator('#habits .habit.open .v-name').press('Enter');
  await x.pg.waitForTimeout(150);
  check(x.renameCalls.length===0,'Renaming waits for the earlier usual-place write instead of racing it');
  release();await x.pg.waitForTimeout(400);
  check(x.placeCalls[0].p_habit===habit&&x.renameCalls[0]?.p_old===habit&&x.renameCalls[0]?.p_new==='Read with intention','Place-before-rename uses the old exact reference before moving the attachment');
  check(x.places().get('Read with intention')==='Delayed studio'&&!x.places().has(habit),'A delayed place then rename keeps the acknowledged place on the new source');
  await x.pg.locator('[data-pk^="spot:h:"]').click();
  check(await x.pg.locator('[data-spot]').inputValue()==='Delayed studio','The local place agrees with the server after queued rename');await x.ctx.close();}
 {let release,start;const gate=new Promise(r=>release=r),started=new Promise(r=>start=r);
  const x=await sample({renameHook:async()=>{start();await gate;}});await opened(x);
  await x.pg.locator('#habits .habit.open .v-name').fill('Read in my new chapter');await x.pg.locator('#habits .habit.open .v-name').press('Enter');await signal(started);
  await x.pg.locator('[data-pk^="spot:h:"]').click();await x.pg.locator('[data-spot]').fill('New library');await x.pg.locator('[data-spot]').press('Enter');
  await x.pg.waitForTimeout(150);
  check(x.placeCalls.length===0,'A place edit waits for a preceding native rename acknowledgement');
  release();await x.pg.waitForTimeout(400);
  check(x.placeCalls.at(-1)?.p_habit==='Read in my new chapter'&&x.places().get('Read in my new chapter')==='New library'&&!x.places().has(habit),'Rename-before-place resolves the new exact source after rename succeeds');await x.ctx.close();}
 {let release,start;const gate=new Promise(r=>release=r),started=new Promise(r=>start=r);
  const x=await sample({placeHook:async(args,n)=>{if(n===1){start();await gate;}return n<=2?{ok:false}:null;}});await opened(x);
  await x.pg.locator('[data-pk^="spot:h:"]').click();await x.pg.locator('[data-spot]').fill('First rejected studio');await x.pg.locator('[data-spot]').press('Enter');await signal(started);
  await x.pg.locator('[data-pk^="spot:h:"]').click();await x.pg.locator('[data-spot]').fill('Second rejected studio');await x.pg.locator('[data-spot]').press('Enter');
  release();await x.pg.waitForTimeout(450);
  check(x.placeCalls.length===2&&x.places().get(habit)===privatePlace,'Two rejected queued writes leave the server at its last acknowledged place');
  await x.pg.locator('[data-pk^="spot:h:"]').click();
  check(await x.pg.locator('[data-spot]').inputValue()===privatePlace,'The local rollback restores the acknowledged place, never the previous failed desired value');
  await x.pg.locator('[data-spot]').fill('Second rejected studio');await x.pg.locator('[data-spot]').press('Enter');await x.pg.waitForTimeout(350);
  check(x.placeCalls.length===3&&x.places().get(habit)==='Second rejected studio','The exact same rejected wording can be retried and acknowledged');await x.ctx.close();}
 {const x=await sample();await opened(x);
  await x.pg.route('**/rest/v1/rpc/habit_spot_set',route=>route.abort('failed'));
  await x.pg.locator('[data-pk^="spot:h:"]').click();await x.pg.locator('[data-spot]').fill('Retry after network loss');await x.pg.locator('[data-spot]').press('Enter');await x.pg.waitForTimeout(350);
  await x.pg.unroute('**/rest/v1/rpc/habit_spot_set');await x.pg.locator('[data-pk^="spot:h:"]').click();
  check(await x.pg.locator('[data-spot]').inputValue()===privatePlace,'A network rejection restores the last acknowledged place');
  await x.pg.locator('[data-spot]').fill('Retry after network loss');await x.pg.locator('[data-spot]').press('Enter');await x.pg.waitForTimeout(350);
  check(x.placeCalls.length===1&&x.places().get(habit)==='Retry after network loss','A network-rejected desired place remains retryable');await x.ctx.close();}
 console.log(JSON.stringify({suite:'Native usual place and privacy',checks,passed:checks}));
}finally{await browser.close();}
