// Exact source navigation, synthetic sessions/data and real app rendering.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page,USER} from './harness.mjs';
import {elementURL} from '../../backend/supabase/functions/_shared/chatgpt-context.ts';
const origin='https://www.totehm.com',out=process.argv[2]||'work/element-links';fs.mkdirSync(out,{recursive:true});
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const steps=[{t:'Écrire & lire / 読む #1',is:['express'],f:'daily'}];
const tree={signed_in:true,ok:true,pseudo:'artist',steps,trips:[{id:id(1),text:'Publish',status:'active'}],
 reps:[{id:1,text:'Scrolling',hs:[steps[0].t],ws:[]}],visions:[{id:id(2),text:'Transmit',os:[]}],wisdom:[{id:id(3),text:'My story\n\nMy words.',os:[]}]};
const cases=[['habit',steps[0].t,'Écrire & lire / 読む #1','habits'],['objective',id(1),'Publish','objectives'],
 ['repulsion','1','Scrolling','repulsions'],['vision',id(2),'Transmit','visions'],['wisdom',id(3),'My storyMy words.','wisdom']];
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
const browser=await launch();
async function sample({session=true,member=false,denied=false,delay=0}={}){
 const writes=[];
 const {pg,ctx,log}=await page(browser,{dir:'com',origin,session,
 tables:{profiles:[{pseudo:'fixture'}],totehms:[{user_id:USER.id,steps,updated_at:'2026-11-08T12:00:00Z'}]},
 rpc:{my_trips:async()=>{if(delay)await new Promise(r=>setTimeout(r,delay));return tree;},
 totehm_read:denied?{ok:false,why:'private'}:tree,my_landing:{signed_in:session,pseudo:'fixture'},element_orders_for:{ok:true,orders:{}}},
 network:(url,req)=>{if(url.pathname==='/rest/v1/totehms'&&req.method()!=='GET')writes.push(url.pathname);return null;}});
 return {pg,ctx,log,writes};
}
try{
 for(const width of [390,1280]){
  const x=await sample({delay:150});await x.pg.setViewportSize({width,height:844});
  for(const [kind,ref,text,view] of cases){
   await x.pg.goto(elementURL({kind,ref}));
   try{await x.pg.waitForFunction(()=>window.__totehm_element_link?.().state==='opened',null,{timeout:15000});}
   catch(e){console.log(JSON.stringify({kind,width,state:await x.pg.evaluate(()=>({link:window.__totehm_element_link?.(),zone:window.__totehm_zone,body:document.body.className})),errors:x.log.errors}));throw e;}
   const actual=await x.pg.locator('#habits .habit.open .v-name').textContent();
   check(actual.replace(/\s+/g,'')===text.replace(/\s+/g,''),'Exact '+kind+' opens at '+width+'px');
   check(await x.pg.evaluate(view=>window.__totehm_zone.vue===view&&!document.body.classList.contains('gate'),view),'The right view and original renderer are used');
   check(await x.pg.evaluate(()=>!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!document.activeElement.isContentEditable),'A source link does not focus an edit field or open a keyboard');
   check(!new URL(x.pg.url()).hash,'Locator is consumed after resolution');
  }
  await x.pg.screenshot({path:out+'/story-'+width+'.png'});
  check(x.writes.length===0&&!x.log.rpc.some(r=>/create|rename|import|set$|remove/.test(r.name)),'Source navigation performs no data mutations');
  check(!x.log.errors.some(e=>e.startsWith('pageerror')),'No runtime errors');await x.ctx.close();
 }
 {const x=await sample();await x.pg.goto(elementURL({kind:'objective',ref:id(99)}));
  await x.pg.waitForFunction(()=>window.__totehm_element_link?.().state==='unavailable');
  check(await x.pg.locator('#habits .habit.open').count()===0,'Missing exact source never opens another element');
  check((await x.pg.locator('#dit').textContent()).includes('no longer available'),'Missing source has a visible explanation');await x.ctx.close();}
 {const x=await sample();await x.pg.goto(elementURL({kind:'objective',ref:id(1)},'artist'));
  await x.pg.waitForFunction(()=>window.__totehm_element_link?.().state==='opened');
  check(await x.pg.evaluate(()=>document.body.classList.contains('ro')),'A member link remains read-only');
  check(!await x.pg.locator('#habits .habit.open [contenteditable="true"]').count(),'Member original has no editable title');
  check(!x.log.rpc.some(r=>r.name==='my_trips'||r.name==='totehm_import_boxes'),'Member locator never loads the owner’s tree or adopts content');await x.ctx.close();}
 {const x=await sample({denied:true});await x.pg.goto(elementURL({kind:'objective',ref:id(1)},'artist'));
  await x.pg.waitForFunction(()=>window.__totehm_element_link?.().state==='unavailable');
  check(await x.pg.locator('#habits .habit.open').count()===0,'Private member source stays inaccessible');await x.ctx.close();}
 {const x=await sample({delay:350});await x.pg.goto(elementURL({kind:'habit',ref:steps[0].t}));
  await x.pg.waitForFunction(()=>!!window.__totehm_element_link);
  await x.pg.goto(elementURL({kind:'objective',ref:id(1)}));
  await x.pg.waitForFunction(()=>window.__totehm_element_link?.().state==='opened');
  check(await x.pg.locator('#habits .habit.open .v-name').textContent()==='Publish','The latest source wins while account data is loading');await x.ctx.close();}
 {const x=await sample({session:false});await x.pg.goto(elementURL({kind:'habit',ref:steps[0].t}));
  await x.pg.waitForSelector('body.is-door');
  check(await x.pg.evaluate(()=>window.__totehm_element_link().state==='pending'&&document.body.classList.contains('gate')),'Without a session the login gate keeps the pending intention');
  check(!x.log.rpc.some(r=>r.name==='my_trips'||r.name==='totehm_read'),'No account tree is read before signing in');await x.ctx.close();}
 console.log(JSON.stringify({suite:'TOTEHM source links',checks,passed:checks}));
}finally{await browser.close();}
