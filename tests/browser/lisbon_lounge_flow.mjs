import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {launch,page} from './harness.mjs';
import {LISBON_URBEX_LAYOUT as L} from '../../space/gallery-lisbon-urbex-layout.mjs';

const origin='https://www.totehm.space';
const output=process.argv[2]||'/tmp/lisbon-lounge-flow';
fs.mkdirSync(output,{recursive:true});
const landscape=`import * as T from './vendor/three-0.180.0.mjs';
 export function createTempleLandscape(scene){
  scene.background=new T.Color(0x080c16);scene.add(new T.HemisphereLight(0xe9efff,0x26202b,1.5));
  return{update:()=>false,diagnostics:()=>({fixture:true})};
 }`;
const browser=await launch();
let checks=0;
function check(value,message){assert.ok(value,message);checks++;console.log('PASS '+message);}
async function current(pg){return pg.evaluate(()=>window.__totehm_gallery?.());}
async function clickPoint(pg,point){
 const pixel=await pg.evaluate(async coordinates=>{
  const T=await import('/vendor/three-0.180.0.mjs');
  const view=window.__totehm_gallery().camera;
  const camera=new T.PerspectiveCamera(view.fov,view.aspect,view.near,view.far);
  camera.position.fromArray(view.position);camera.lookAt(...view.target);camera.updateMatrixWorld(true);
  const point=new T.Vector3(...coordinates).project(camera);
  return{x:(point.x+1)*innerWidth/2,y:(1-point.y)*innerHeight/2};
 },point);
 assert.ok(pixel.x>=0&&pixel.y>=0&&pixel.x<1100&&pixel.y<800,'The physical object is on screen');
 await pg.mouse.click(pixel.x,pixel.y);
}
async function experience(pg,type){
 await pg.waitForFunction(kind=>{
  const state=window.__totehm_projection_expansion?.();
  return state?.type===kind&&state.stage==='experience'&&state.overlays===0;
 },type,{timeout:35000});
 return pg.frames().find(frame=>new URL(frame.url()).searchParams.get('embedded')==='1');
}
async function close(pg,frame,shot){
 await frame.locator('body').press('Escape');
 await pg.waitForURL(url=>url.pathname==='/lisbon-space');
 await pg.waitForFunction(()=>window.__totehm_projection_expansion?.().stage==='closed');
 const state=await current(pg);
 check(state.seated&&state.camera.position.every((coordinate,i)=>Math.abs(coordinate-shot[i])<.001),'Closing returns to the exact seated camera');
}
async function prepare(owned){
 const fixture=await page(browser,{
  dir:'space',origin,session:owned,viewport:{width:1100,height:800},
  functions:{'stoner-gate':{access:owned},'higher-checkout':{amount:1700,currency:'eur'}},
  network:url=>url.pathname==='/gallery-temple-landscape.mjs'?{contentType:'text/javascript',body:landscape}:null
 });
 await fixture.pg.emulateMedia({reducedMotion:'reduce'});
 await fixture.pg.goto(origin+'/lisbon-space');
 await fixture.pg.waitForFunction(()=>{
  const world=window.__totehm_gallery?.();
  return world?.frames>0&&world.projection?.ready&&world.temple?.paperLoaded&&world.temple?.controller.loaded===22;
 },null,{timeout:90000});
 return fixture;
}

try{
 const guest=await prepare(false),pg=guest.pg;
 const warnings=[];
 pg.on('console',message=>{if(message.type()==='warning')warnings.push(message.text());});
 try{
  const world=await current(pg);
  check(world.temple.openAir&&world.temple.walls===0&&world.temple.floor.surfaces===1&&world.temple.floor.caravel,'Lisbon renders one open-air calçada with its caravel');
  check(world.temple.thpCounter.paperWidthMetres<.03&&world.temple.thpCounter.signed,'The signed cases contain blotter-sized sheets on the table');
  check(world.fireplace.outdoor&&world.fireplace.present&&world.fireAudio.present,'Only the outdoor wood fire and its audio source are in the lounge');
  check(world.projection.bottom>0&&world.projection.front.visibleSigns===0&&world.projection.front.titleOnly,'The suspended idle screen has only the authored Lisbon title');
  await pg.screenshot({path:path.join(output,'island.png')});
  await clickPoint(pg,[0,.96,L.seat.position[2]]);
  await pg.waitForFunction(()=>window.__totehm_gallery().seated&&window.__totehm_gallery().camera.position[1]<1.1);
  const shot=(await current(pg)).camera.position;
  check(shot.every((coordinate,i)=>Math.abs(coordinate-L.seat.eye[i])<.001),'Clicking the brown leather chair anchors the seated view');
  await pg.screenshot({path:path.join(output,'seated.png')});

  const [paper]=L.paperCases,caseWidth=world.temple.thpCounter.caseWidthMetres;
  const caseDepth=caseWidth*50/180,front=caseDepth/2+.0007*caseWidth;
  const caseCentre=L.counter.position[1]+Math.abs(Math.sin(paper.angle))*caseWidth/2+Math.cos(paper.angle)*caseDepth/2+.002;
  await pg.evaluate(()=>{
   window.caseLiftSeen=false;
   const observer=new MutationObserver(()=>{
    const state=window.__totehm_projection_expansion?.();
    if(state?.type==='paper'&&state.overlays===1&&!state.physicalPanelVisible&&document.querySelector('#experience-projection-dialog>canvas')){
     window.caseLiftSeen=true;observer.disconnect();
    }
   });
   observer.observe(document.body,{childList:true});
  });
  await pg.emulateMedia({reducedMotion:'no-preference'});
  await pg.waitForFunction(()=>window.__totehm_gallery().originsJourney.vessel.rotation>0);
  await clickPoint(pg,[paper.position[0],caseCentre-Math.sin(paper.angle)*front,paper.position[1]+Math.cos(paper.angle)*front]);
  const edition=await experience(pg,'paper');
  check(await pg.evaluate(()=>window.caseLiftSeen),'The picked premium case lifts as one physical volume');
  check(await edition.evaluate(()=>window.__totehm_paper_entry().sharedModel&&window.__totehm_paper_entry().premium&&window.__totehm_paper_entry().shown&&!window.__totehm_langue?.().joue),'The same premium case arrives fullscreen and skips the tongue');
  const handoff=await pg.evaluate(()=>window.__totehm_projection_expansion().handoff);
  check(handoff?.from?.length===4&&handoff.from.every(([x,y],i)=>Math.hypot(x-handoff.to[i][0],y-handoff.to[i][1])<.1),'All four glass corners land on their fullscreen pixels within a tenth of a pixel');
  check(await edition.evaluate(()=>__totehm_paper_entry().originalsLoaded&&__totehm_paper_entry().signature==='/assets/img/wavywah_signature.png'),'The original signed artwork is loaded on the same volume');
  await pg.screenshot({path:path.join(output,'premium-case.png')});
  await edition.getByRole('button',{name:'Turn over',exact:true}).click();
  await edition.waitForFunction(()=>__totehm_paper_entry().verso&&!__totehm_paper_entry().turning);
  check(await edition.getByRole('button',{name:'Turn to the front',exact:true}).isVisible(),'The case turns over to reveal Wah’s signature');
  await pg.screenshot({path:path.join(output,'premium-case-signed.png')});
  await close(pg,edition,shot);

  await pg.emulateMedia({reducedMotion:'reduce'});
  await clickPoint(pg,[L.controller.position[0],L.controller.position[1]+.03,L.controller.position[2]]);
  const locked=await experience(pg,'controller');
  await locked.waitForFunction(()=>document.body.classList.contains('is-controller-locked'));
  check(await locked.evaluate(()=>{
   const controller=window.__totehm_controller_entry();
   return controller.canvas&&controller.model.keys===22&&!controller.owned&&!window.__totehm_lisbon().board;
  }),'Clicking the physical controller opens its locked 3D preview for a guest');
  check(!guest.log.functions.some(entry=>entry.name==='lisbon-street-media'),'The locked controller requests no signed private media');
  await pg.screenshot({path:path.join(output,'controller-locked.png')});
  await close(pg,locked,shot);

  await clickPoint(pg,L.play.screen);
  const discover=await experience(pg,'screen');
  await discover.waitForFunction(()=>window.__totehm_experience_front?.().phase==='discover');
  check(await discover.evaluate(()=>{
   const state=window.__totehm_lisbon();
   return state.discoverSlides===9&&!state.board&&state.firstPage.signs===22;
  }),'Clicking the title screen enters its Discover with the original signs');
  await pg.screenshot({path:path.join(output,'discover.png')});
  await close(pg,discover,shot);
  check(!guest.log.errors.some(error=>error.startsWith('pageerror:')),'The physical guest journey has no page exception');
 }catch(error){
  console.error('Lounge state',await pg.evaluate(()=>({url:location.pathname,expansion:window.__totehm_projection_expansion?.(),seated:window.__totehm_gallery?.()?.seated,camera:window.__totehm_gallery?.()?.camera})).catch(()=>null));
  console.error('Browser errors',guest.log.errors,'Warnings',warnings);
  throw error;
 }finally{await guest.ctx.close();}

 const owner=await prepare(true);
 try{
  const pg=owner.pg;
  await pg.locator('#sit-lounge').click();
  await pg.waitForFunction(()=>window.__totehm_gallery().seated);
  await clickPoint(pg,[L.controller.position[0],L.controller.position[1]+.03,L.controller.position[2]]);
  const board=await experience(pg,'controller');
  await board.waitForFunction(()=>window.__totehm_lisbon?.().board);
  check(await board.evaluate(()=>window.__totehm_lisbon().directBoard&&window.__totehm_lisbon().access.owned&&window.__totehm_controller_entry().model.keys===22),'A confirmed THP owner enters the active 3D controller directly');
  check(await board.locator('.street-rock[role=button]').count()===22,'All twenty-two keys are actionable for the entitled member');
  check(!owner.log.functions.some(entry=>entry.name==='lisbon-street-media'),'The controller does not request signed video until an artwork key is pressed');
  await pg.screenshot({path:path.join(output,'controller-owned.png')});
  check(!owner.log.errors.some(error=>error.startsWith('pageerror:')),'The entitled controller journey has no page exception');
 }finally{await owner.ctx.close();}
 console.log('PASS '+checks+' Lisbon lounge flow checks');
}finally{await browser.close();}
