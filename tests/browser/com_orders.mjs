// Real DOM interactions + reloads, synthetic sessions and in-memory persistence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page,USER} from './harness.mjs';
const origin='https://www.totehm.com',out=process.argv[2]||'work/orders-browser';
fs.mkdirSync(out,{recursive:true});
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const steps=[{t:'読む',is:['focus'],f:'yearly'},{t:'Créer',is:['express'],f:'daily'},{t:'مشي',is:['love'],f:'hourly'}];
const tree={signed_in:true,ok:true,pseudo:'artist',steps,
 trips:[1,2,3].map(n=>({id:id(n),text:'Objective '+n,is:[],status:'active'})),
 reps:[1,2,3].map(n=>({id:n,text:'Repulsion '+n,hs:[],ws:[]})),
 visions:[4,5,6].map(n=>({id:id(n),text:'Vision '+n,os:[]})),
 wisdom:[7,8,9].map(n=>({id:id(n),text:'Story '+n,os:[]}))};
const views={habits:'habit',objectives:'objective',repulsions:'repulsion',visions:'vision',wisdom:'wisdom'};
const browser=await launch();let checks=0;
const check=(v,m)=>{assert(v,m);checks++;};
try{
 for(const width of [390,1280]){
  let orders={},persisted=structuredClone(steps),active=0,maxActive=0;
  const {pg,log}=await page(browser,{dir:'com',origin,viewport:{width,height:844},hasTouch:width<700,
   tables:{profiles:[{pseudo:'fixture'}],totehms:(_url,req)=>{
    if(req.method()==='POST')persisted=JSON.parse(req.postData()).steps;
    return [{user_id:USER.id,steps:persisted,updated_at:'2026-11-08T12:00:00Z'}];}},
   rpc:{my_trips:tree,totehm_read:tree,my_landing:{signed_in:true,pseudo:'fixture'},element_orders_for:()=>({ok:true,orders}),
    element_order_set:async({p_kind,p_refs})=>{active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setTimeout(r,80));orders[p_kind]=p_refs;active--;return {ok:true};}}});
  let navigation=0;
  const open=async view=>{
   await pg.goto(origin+'/totehm?order_test='+(++navigation)+'#in:'+view);
   await pg.waitForFunction(view=>window.__totehm_zone?.arbre_charge&&window.__totehm_zone?.vue===view,view);
   await pg.waitForFunction(()=>window.__totehm_order?.().loaded&&window.__totehm_order().pending===0);
   try{await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:5000});}
   catch(e){console.log(JSON.stringify({view,body:await pg.locator('body').getAttribute('class'),zone:await pg.evaluate(()=>window.__totehm_zone),errors:log.errors}));throw e;}
   await pg.waitForFunction(()=>document.querySelectorAll('#habits .habit[data-row]').length===3);
  };
  const texts=()=>pg.locator('#habits .habit[data-row] .v-name').allTextContents();
  const rowIds=()=>pg.locator('#habits .habit[data-row]').evaluateAll(es=>es.map(e=>e.dataset.row));
  for(const [view,kind] of Object.entries(views)){
   await open(view);
   const beforeText=await texts();
   const before=await rowIds();check(before.length===3,'Three real rows in '+view);
   await pg.locator('#ordbtn').click();
   await pg.locator(`[data-mv="down:${before[0]}"]`).click();
   await pg.locator(`[data-mv="down:${before[0]}"]`).click();
   await pg.waitForFunction(()=>window.__totehm_order().pending===0);
   const expected=[beforeText[1],beforeText[2],beforeText[0]];
   check(JSON.stringify(await texts())===JSON.stringify(expected),'Two arrow clicks reorder '+view);
   check(orders[kind]?.length===3,'Order saved for '+kind);
   await open(view);
   check(JSON.stringify(await texts())===JSON.stringify(expected),'Order survives reload for '+view);
   if(view==='wisdom'&&width===390)await pg.screenshot({path:out+'/story-mobile.png'});
  }
  check(maxActive===1,'Rapid moves serialize persistence');
  check(!log.errors.some(e=>e.startsWith('pageerror')),'No browser runtime errors');
  const writes=log.rpc.filter(x=>x.name==='element_order_set').length;
  // The same saved ranking is rendered when viewing an authorized member.
  await pg.goto(origin+'/totehm?ro=artist#in:visions');
  await pg.waitForFunction(()=>window.__totehm_order?.().loaded&&window.__totehm_zone?.vue==='visions');
  check(JSON.stringify(await rowIds())===JSON.stringify(orders.vision),'Subscribed member view uses the same saved ranking');
  check(log.rpc.filter(x=>x.name==='element_order_set').length===writes,'Viewing a member never writes rankings');
  await pg.context().close();
 }
 console.log(JSON.stringify({suite:'Browser orders',checks,passed:checks,viewports:2,views:5}));
}finally{await browser.close();}
