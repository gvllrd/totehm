import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';
import {LISBON_FRONT_NAMES,LISBON_FRONT_COPY} from '../../space/lisbon-first-page.mjs';
const out=process.argv[2]||'/tmp/saucer-projections';fs.mkdirSync(out,{recursive:true});
const origin='https://www.totehm.space',results=[];let checks=0;const check=(v,m)=>{assert(v,m);checks++;console.log('PASS '+m);};
const landscape="import * as T from '/vendor/three-0.180.0.mjs';export function createTempleLandscape(scene){scene.background=new T.Color(0x080c16);scene.add(new T.HemisphereLight(0xdbe6f0,0x252a33,1));return{update:()=>false,diagnostics:()=>({qa:true})};}";
const sky="import * as T from '/vendor/three-0.180.0.mjs';export function createDrownedSky(scene){scene.background=new T.Color(0x080c16);const texture=new T.DataTexture(new Uint8Array(128*64*4).fill(80),128,64);texture.needsUpdate=true;return{environmentTexture:texture,update:()=>false,dispose:()=>texture.dispose()};}";
const state=pg=>pg.evaluate(()=>window.__totehm_gallery?.());
const ready=pg=>pg.waitForFunction(()=>window.__totehm_gallery?.().frames>0&&__totehm_gallery().projection?.ready,null,{timeout:90000});
const fatal=log=>log.errors.filter(e=>/pageerror:|WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e));
const save=()=>fs.writeFileSync(out+'/results.json',JSON.stringify({checks,results},null,2));
async function focusProjection(pg){await pg.locator('.tour [data-room="2"]').click({timeout:60000});await pg.waitForFunction(()=>__totehm_gallery().focused===2,null,{timeout:30000});await pg.waitForFunction(()=>!document.getElementById('enter-experience').disabled);}
async function clickPanel(pg){
 const point=await pg.evaluate(async()=>{
  const {PerspectiveCamera,Vector3}=await import('/vendor/three-0.180.0.mjs');
  const {camera:pose,projection}=__totehm_gallery();
  const camera=new PerspectiveCamera(pose.fov,pose.aspect,pose.near,pose.far);
  camera.position.fromArray(pose.position);camera.lookAt(new Vector3(...pose.target));camera.updateMatrixWorld(true);
  const point=new Vector3(...projection.position).project(camera),rect=document.getElementById('space').getBoundingClientRect();
  return{x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};
 });
 await pg.mouse.click(point.x,point.y);
}
async function clickSign(pg){
 const sign=await pg.evaluate(()=>{
  const host=document.getElementById('space');
  return __totehm_gallery().projection.poses.find(({x,y,width,height})=>{
   const hit=document.elementFromPoint(x,y);
   return width>5&&height>5&&x>15&&x<innerWidth-15&&y>50&&y<innerHeight-30&&host.contains(hit);
  });
 });
 check(!!sign,'An individual floating sign can be reached on the 3D canvas');
 await pg.mouse.click(sign.x,sign.y);
 return sign.id;
}
async function monitorFormation(pg){
 await pg.evaluate(()=>{
  window.projectionSamples=[];
  function sample(){
   const entrance=window.__totehm_projection_expansion?.();
   if(entrance?.type==='formation'){
    const child=document.querySelector('#experience-projection-dialog>iframe')?.contentWindow;
    const assembly=child?.__totehm_lisbon?.().assembly;
    window.projectionSamples.push({
     stage:entrance.stage,frames:entrance.frames,overlays:entrance.overlays,
     physicalPanelVisible:entrance.physicalPanelVisible,assembly
    });
    if(entrance.stage==='experience'||entrance.stage==='closed')return;
   }
   requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
 });
}
const browser=await launch();
try{for(const viewport of [{width:800,height:600},{width:1100,height:760}])for(const city of ['lisbon','new-york']){
 const lisbon=city==='lisbon',owned=lisbon&&viewport.width===800;
 const requests=[],f=await page(browser,{dir:'space',origin,session:owned,viewport,hasTouch:false,functions:{'stoner-gate':{access:owned}},network:u=>{requests.push(u.pathname);return u.pathname==='/gallery-temple-landscape.mjs'?{contentType:'text/javascript',body:landscape}:u.pathname==='/gallery-drowned-sky.mjs'?{contentType:'text/javascript',body:sky}:null;}}),{pg,log}=f,sample={viewport,city,warnings:[]};results.push(sample);pg.on('console',message=>{if(message.type()==='warning')sample.warnings.push(message.text());});
 try{
  await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+(city==='lisbon'?'/lisbon-space':'/new-york'));await ready(pg);sample.initial=await state(pg);
  check(!sample.initial.fallback&&await pg.locator('#space canvas').count()===1,city+' has an actual rendered 3D gallery at '+viewport.width);
  const {fireplace,fireAudio}=sample.initial;
  if(city==='lisbon')check(fireplace.present&&fireplace.outdoor&&fireplace.volumetricFlames&&fireplace.charredLogs>0&&fireAudio.present&&fireAudio.woodCrackle,'Lisbon has an outdoor wood fire with volumetric flame, charred logs and crackle at '+viewport.width);
  else check(!fireplace.present&&fireplace.flames===0&&!fireAudio.present&&fireAudio.sources===0,'New York has no hearth or fire audio source at '+viewport.width);
  const projection=sample.initial.projection;
  check(projection.beamSource.every((axis,i)=>Math.abs(axis-[0,18.9,-4.2][i])<1e-6),city+' projects from the saucer emitter at '+viewport.width);
  check(sample.initial.originsJourney.vessel.saucer&&!sample.initial.originsJourney.vessel.bookInIsland&&projection.videoDecoders===0,city+' keeps the original book in Origin and decodes no gallery video at '+viewport.width);
  if(lisbon){
   check(projection.kind==='ufo-lisbon-floating-signs'&&projection.blackPanel===false&&projection.independentSigns&&projection.lifeSize&&projection.signs===22&&projection.loaded===22&&projection.clickTargets===23,'Lisbon projects 22 independent 3D signs at '+viewport.width);
   assert.deepEqual(projection.poses.map(({id})=>id),LISBON_FRONT_NAMES);
   check(projection.headline===LISBON_FRONT_COPY.headline&&projection.subtitle===LISBON_FRONT_COPY.subtitle,'Lisbon keeps the canonical title and smaller caption amid the signs');
  }else{
   check(projection.kind==='saucer-first-page-projection'&&projection.canonicalFirstPage&&projection.blackPanel&&projection.blackBeam&&projection.opticalBeam&&projection.bottom>0,'New York keeps its raised canonical screen at '+viewport.width);
   check(projection.works===6&&projection.front.count===6&&projection.front.ids.length===6&&sample.initial.temple.projectionOnly&&sample.initial.temple.legacyArtworkPickables===0&&sample.initial.temple.thpCounter.packagedPapers===0&&!sample.initial.temple.origins.lectern,'New York has only the six-work projection and saucer, without a local book or THP table at '+viewport.width);
   check(await pg.locator('.tour [data-room]').count()===2,'New York navigation offers only its projection and Origin at '+viewport.width);
  }
  const vessel=sample.initial.originsJourney.vessel;
  await pg.waitForTimeout(200);
  check((await state(pg)).originsJourney.vessel.rotation===vessel.rotation,city+' keeps the saucer still with reduced motion at '+viewport.width);
  await pg.emulateMedia({reducedMotion:'no-preference'});
  await pg.waitForFunction(angle=>Math.abs(__totehm_gallery().originsJourney.vessel.rotation-angle)>.01,vessel.rotation);
  check(vessel.rotationDegreesPerSecond>=3&&vessel.rotationDegreesPerSecond<=5,city+' turns the saucer slowly on its own axis at '+viewport.width);
  await pg.emulateMedia({reducedMotion:'reduce'});
  await pg.screenshot({path:out+'/'+city+'-'+viewport.width+'-world.png'});await focusProjection(pg);sample.camera=await pg.evaluate(()=>__totehm_gallery().camera.position);await pg.evaluate(()=>window.projectionSceneToken='same scene');
  if(owned){
   await pg.emulateMedia({reducedMotion:'no-preference'});
   await monitorFormation(pg);
  }
  if(lisbon)sample.clickedSign=await clickSign(pg);
  else await clickPanel(pg);
  await pg.waitForFunction(()=>window.__totehm_projection_expansion?.().stage==='experience',null,{timeout:40000});
  const frame=pg.frames().find(fr=>new URL(fr.url()).searchParams.get('embedded')==='1');
  check(!!frame,city+' opens a single full-screen experience at '+viewport.width);
  if(lisbon){
   const url=new URL(frame.url());
   check(url.pathname==='/play_lisbon_street'&&url.searchParams.get('board')==='1'&&url.searchParams.get('projection')==='1','A floating sign enters the projected controller route');
   await frame.waitForFunction(allowed=>__totehm_controller_entry().phase===(allowed?'board':'locked'),owned);
   const keys=await frame.locator('.street-rock[role=button] img').evaluateAll(images=>images.map(image=>new URL(image.src).pathname.split('/').at(-1).slice(0,-4)));
   assert.deepEqual(keys,owned?LISBON_FRONT_NAMES:[]);
   sample.front=await frame.evaluate(()=>__totehm_lisbon());
   check(sample.front.access.owned===owned&&sample.front.board===owned&&sample.front.activeSign===null,'Formation checks THP access without starting a film');
   check(!log.functions.some(call=>call.name==='lisbon-street-media'),'Opening the projected controller does not request private media');
   if(owned){
    await pg.waitForFunction(()=>window.projectionSamples.at(-1)?.stage==='experience');
    sample.animation=await pg.evaluate(()=>window.projectionSamples);
    const moving=sample.animation.filter(sample=>sample.stage==='expanding'&&sample.assembly?.source==='saucer'&&sample.assembly.progress>0&&sample.assembly.progress<1);
    check(moving.length>=2&&moving.at(-1).assembly.progress>moving[0].assembly.progress&&moving.every(sample=>sample.assembly.signs===22&&sample.overlays===0&&sample.frames===1&&!sample.physicalPanelVisible),'All 22 signs assemble over multiple frames in one live experience');
    check(await pg.evaluate(()=>__totehm_projection_expansion().handoff?.signs===22),'The handoff passes one source pose for every controller key');
   }else{
    check(sample.front.reduced_motion&&sample.front.assembly===null&&await frame.getByText('A Totehmpaper is required to enter. Get Higher through Stoner first.',{exact:true}).isVisible(),'Reduced-motion guests see the requirement and no playable keys');
   }
  }else{
   check(await frame.evaluate(()=>__totehm_experience_front().ready),'New York opens its ready original first page at '+viewport.width);
   sample.front=await frame.evaluate(()=>__totehm_experience_front());
   check(sample.front.build===projection.front.build&&JSON.stringify(sample.front.ids)===JSON.stringify(projection.front.ids),'New York uses the same canonical canvas and catalogue in the scene and full-screen page');
   check(!requests.some(path=>path.startsWith('/assets/fire/')),'New York never requests a fire recording at '+viewport.width);
  }
  check(await pg.evaluate(()=>window.projectionSceneToken==='same scene'&&__totehm_projection_expansion().physicalPanelVisible===false&&__totehm_projection_expansion().overlays===0&&__totehm_projection_expansion().frames===1),city+' has one live experience with the physical projection hidden at '+viewport.width);
  await pg.screenshot({path:out+'/'+city+'-'+viewport.width+'-experience.png'});
  const close=lisbon?(owned?'#sdisc-board-close':'#sdisc-back'):'[data-experience-close]';
  await frame.locator(close).first().click({timeout:30000});
  await pg.waitForFunction(()=>__totehm_projection_expansion().stage==='closed'&&__totehm_projection_expansion().physicalPanelVisible);
  check(await pg.locator('iframe').count()===0&&await pg.evaluate(p=>window.projectionSceneToken==='same scene'&&JSON.stringify(__totehm_gallery().camera.position)===JSON.stringify(p),sample.camera),city+' closes back to the same physical projection and camera at '+viewport.width);
  await pg.emulateMedia({reducedMotion:'reduce'});await focusProjection(pg);await pg.locator('#enter-experience').click({timeout:60000});await pg.waitForFunction(()=>__totehm_projection_expansion().stage==='experience');
  if(lisbon){
   const reducedFrame=pg.frames().find(fr=>new URL(fr.url()).searchParams.get('projection')==='1');
   check(!!reducedFrame,'The gallery Enter control opens the same Lisbon sign route');
   await reducedFrame.waitForFunction(allowed=>__totehm_controller_entry().phase===(allowed?'board':'locked'),owned);
   check(await reducedFrame.evaluate(()=>__totehm_lisbon().reduced_motion&&__totehm_lisbon().assembly===null),'Reduced-motion entry reaches the same destination without an assembly animation');
  }
  await pg.goBack();await pg.waitForFunction(()=>__totehm_projection_expansion().stage==='closed');
  check(await pg.locator('#experience-projection-dialog').count()===0&&await pg.evaluate(()=>__totehm_projection_expansion().physicalPanelVisible),city+' browser Back closes only the full-screen experience at '+viewport.width);
  if(city==='new-york'){
   await pg.locator('.tour [data-room="1"]').click({timeout:60000});await pg.waitForURL(u=>u.pathname==='/origin'&&u.searchParams.get('arrival')==='1'&&u.searchParams.get('from')==='new-york',{timeout:60000});await pg.waitForFunction(()=>window.__totehm_origin?.().frames>0,null,{timeout:90000});sample.origin=await pg.evaluate(()=>__totehm_origin());check(sample.origin.originCity==='new-york'&&sample.origin.returnJourney.destination==='/new-york?arrival=origin'&&sample.origin.vessel.parked,'The New York saucer reaches Origin and remembers its home city at '+viewport.width);
   await pg.locator('#origin-return').click({timeout:60000});await pg.waitForURL(u=>u.pathname==='/new-york',{timeout:60000});await ready(pg);await pg.waitForFunction(()=>__totehm_gallery().originsJourney.state==='island');check(await pg.evaluate(()=>__totehm_gallery().place==='new-york'&&!__totehm_gallery().originsJourney.vessel.flying&&__totehm_gallery().projection.ready),'The same saucer returns from Origin to the New York island at '+viewport.width);
  }
  check(fatal(log).length===0,city+' projection and journey have no application or GPU exception at '+viewport.width);sample.errors=log.errors;save();
 }catch(error){sample.failure={message:error.message,url:pg.url(),state:await state(pg).catch(()=>null),projection:await pg.evaluate(()=>window.__totehm_projection_expansion?.()).catch(()=>null),requests,errors:log.errors};await pg.screenshot({path:out+'/'+city+'-'+viewport.width+'-failure.png'}).catch(()=>{});save();throw error;}finally{await f.ctx.close();}
}}finally{await browser.close();}console.log('PASS '+checks+' saucer projection and continuous first-page checks');save();
