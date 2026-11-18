// Real page and controller tests. The catalogue, entitlement endpoint and
// signed video transport are mocked; no checkout or member account is touched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';

const OUT=process.argv[2]||'/tmp/lisbon-street-portal',origin='https://www.totehm.space';fs.mkdirSync(OUT,{recursive:true});
let checks=0;const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const media=fs.readFileSync(new URL('../../space/assets/slides/init.mp4',import.meta.url));
const browser=await launch(),results=[];
async function fixture({session=false,owned=false,gateError=false,viewport={width:1440,height:1000}}={}){
 const mediaCalls=[],signedCalls=[];
 const value=await page(browser,{dir:'space',origin,session,viewport,hasTouch:viewport.width<650,
  functions:{'stoner-gate':{access:owned},'higher-checkout':{amount:1700,currency:'eur'}},
  network:(url,request)=>{
   if(gateError&&url.pathname==='/functions/v1/stoner-gate')return{status:503,contentType:'application/json',body:JSON.stringify({access:false,reason:'error'})};
   if(url.pathname==='/functions/v1/lisbon-street-media'){
    let body={};try{body=JSON.parse(request.postData()||'{}');}catch{}
    signedCalls.push(body);
    if(!owned)return{status:403,contentType:'application/json',body:JSON.stringify({error:'TotehmPaper required'})};
    const id=body.id||body.sign;
    return{status:200,contentType:'application/json',body:JSON.stringify({access:true,sign:id,url:'https://abujjbkbbiumxrokozph.supabase.co/storage/v1/object/sign/play-signals/'+id+'.mp4?token=fixture',expires_in:900})};
   }
   if(url.pathname.startsWith('/storage/v1/object/sign/play-signals/')){mediaCalls.push(url.pathname);return{status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'video/mp4',body:media};}
   if(url.pathname.startsWith('/storage/v1/object/public/play-signals/')){mediaCalls.push(url.pathname);return{status:403,contentType:'application/json',body:'{"error":"private bucket"}'};}
   if(['/get_higher','/stoner','/market'].includes(url.pathname))return{contentType:'text/html',body:'<!doctype html><title>Destination</title>'};
   return null;
  }});
 await value.pg.emulateMedia({reducedMotion:'reduce'});return{...value,mediaCalls,signedCalls};
}
async function ready(pg,state){await pg.waitForFunction(expected=>window.__totehm_lisbon?.().access?.state===expected,state,{timeout:20000});}
async function noVideo(f,message){
 const state=await f.pg.evaluate(()=>({diag:__totehm_lisbon(),src:document.getElementById('vid').getAttribute('src')}));
 check(!state.src&&f.mediaCalls.length===0&&f.signedCalls.length===0,message);
}
try{
 for(const scenario of [{name:'anonymous',session:false,owned:false,state:'guest'},{name:'member without a THP',session:true,owned:false,state:'missing'},{name:'entitlement failure',session:true,owned:false,gateError:true,state:'error'}]){
  const f=await fixture(scenario);
  try{
   await f.pg.goto(origin+'/play_lisbon_street?sign=priority&play=1&from=space',{waitUntil:'domcontentloaded'});await ready(f.pg,scenario.state);
   await noVideo(f,'A '+scenario.name+' cannot bypass the THP requirement with a direct clip URL');
   check(await f.pg.evaluate(()=>!__totehm_lisbon().board),'The controller remains protected for a '+scenario.name);
   check(await f.pg.locator('[data-street-enter]').count()>0,'The public Discover retains a visible entry action for a '+scenario.name);
   await f.pg.screenshot({path:OUT+'/'+scenario.state+'-discover.png'});
   check(!f.log.errors.some(e=>e.startsWith('pageerror:')),'The protected Discover has no application error for a '+scenario.name);
   results.push({scenario:scenario.name,diagnostics:await f.pg.evaluate(()=>__totehm_lisbon()),signedCalls:f.signedCalls});
  }finally{await f.ctx.close();}
 }
 const spoof=await fixture();
 try{
  await spoof.ctx.addInitScript(()=>{localStorage.setItem('THP_OWNED','true');localStorage.setItem('stoner_access','true');localStorage.setItem('lisbon-street-access','owned');});
  await spoof.pg.goto(origin+'/play_lisbon_street?sign=stop&play=1');await ready(spoof.pg,'guest');
  await noVideo(spoof,'Local storage flags cannot manufacture a TotehmPaper entitlement');
 }finally{await spoof.ctx.close();}
 for(const viewport of [{width:1440,height:1000},{width:1024,height:768}]){
  const owner=await fixture({session:true,owned:true,viewport});
  try{
   await owner.pg.goto(origin+'/play_lisbon_street?discover=1',{waitUntil:'domcontentloaded'});await ready(owner.pg,'owned');
   check(owner.mediaCalls.length===0&&owner.signedCalls.length===0,'The owner can read the full Discover without starting video at '+viewport.width);
   await owner.pg.locator('#sdisc-cover-next').click();await owner.pg.locator('[data-street-enter]').first().click();await owner.pg.waitForFunction(()=>__totehm_lisbon().board,null,{timeout:20000});
   check(await owner.pg.evaluate(()=>__totehm_lisbon().rocks===22),'The original PlayStation layout still contains all twenty-two cues at '+viewport.width);
   await owner.pg.screenshot({path:OUT+'/'+viewport.width+'-controller.png'});
   await owner.pg.goto(origin+'/play_lisbon_street?sign=priority&play=1&from=space',{waitUntil:'domcontentloaded'});await ready(owner.pg,'owned');
   await owner.pg.waitForFunction(()=>__totehm_lisbon().activeSign==='priority'&&__totehm_lisbon().playAttempted&&document.getElementById('vid').readyState>=2,null,{timeout:20000});
   check(owner.signedCalls.some(call=>(call.id||call.sign)==='priority')&&owner.mediaCalls.some(url=>url.includes('priority')),'The owner receives only a signed original clip at '+viewport.width);
   check(!owner.mediaCalls.some(url=>url.includes('/public/play-signals/')),'The private experience never falls back to its former public media URL at '+viewport.width);
   check(await owner.pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'The complete page fits the '+viewport.width+' viewport');
   check(!owner.log.errors.some(e=>e.startsWith('pageerror:')),'The original Discover, controller and clip have no application error at '+viewport.width);
   results.push({scenario:'owner',viewport,diagnostics:await owner.pg.evaluate(()=>__totehm_lisbon()),signedCalls:owner.signedCalls});
  }finally{await owner.ctx.close();}
 }
}finally{await browser.close();}
fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));console.log('PASS '+checks+' Lisbon street entitlement and controller checks');
