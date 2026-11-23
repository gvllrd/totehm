import {expandOriginsBook} from './gallery-book-expansion.mjs';
import * as T from './vendor/three-0.180.0.mjs';
import {createDrownedSky} from './gallery-drowned-sky.mjs';
import {createOriginsVessel,originsWalkHeight,ORIGINS_VESSEL_LAYOUT} from './gallery-origins-vessel.mjs';
import {createRenderQuality} from './gallery-render-quality.mjs';
import {createBlackHolePortal,createSaucerCockpit} from './gallery-black-hole.mjs';
import {ORIGIN_RETURN} from './origin-return-journey.mjs';
import {ORIGIN_BOOK_JOURNEY,sampleOriginBookJourney,sampleOriginBookReveal} from './origin-book-journey.mjs';
const worldOffset=3480,eyeHeight=1.65;
const ground=(x,z)=>{const height=originsWalkHeight(x,z);return height===null?null:worldOffset+height+eyeHeight;};
const walkPoint=(x,z)=>[x,ground(x,z),z];
export const ORIGIN_ROOM=Object.freeze({offset:worldOffset,entry:Object.freeze(walkPoint(0,-4.2)),book:Object.freeze(ORIGINS_VESSEL_LAYOUT.bookPosition.map((value,index)=>index===1?value+worldOffset:value)),arrival:Object.freeze(walkPoint(0,ORIGINS_VESSEL_LAYOUT.bookApproach[2]))});
const host=document.getElementById('origin-scene'),button=document.getElementById('origin-action'),status=document.getElementById('origin-status'),stick=document.getElementById('origin-stick'),reduced=matchMedia('(prefers-reduced-motion:reduce)'),mobile=innerWidth<650;
const originCity=new URLSearchParams(location.search).get('from')==='new-york'?'new-york':'lisbon',earthHref='/'+(originCity==='new-york'?'new-york':'lisbon-space')+'?arrival=origin';
let engine=null;
try{engine=createOriginScene();}catch(error){console.error('[origin scene]',error?.message);document.getElementById('origin-fallback').hidden=false;document.body.classList.add('no-webgl');document.body.classList.remove('is-arriving');}
window.__totehm_origin=()=>({build:'origin-photographic-book-journey',fallback:!engine,...engine?.diagnostics()});
function createOriginScene(){
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'}),quality=createRenderQuality({mobile,pixelRatio:devicePixelRatio});renderer.setPixelRatio(quality.diagnostics().pixelRatio);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.setClearColor(0x000000);renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(mobile?80:72,innerWidth/innerHeight,.05,100000),eye=new T.Vector3(...ORIGIN_ROOM.entry),target=new T.Vector3(0,3501.1,-24);
 let dirty=true,disposed=false,hidden=document.hidden,blurred=false,last=0,frames=0,stage='saucer',rail=null,yaw=0,pitch=0,down=null,dragged=false,opening=false,portalAt=null,hasLeftSaucer=false,viewY=eye.y,bookReveal=null;
 const invalidate=()=>{dirty=true;};
 const sky=createDrownedSky(scene,{mobile,onChange:invalidate});
 const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(sky.environmentTexture);scene.environment=environment.texture;scene.environmentIntensity=.12;
 const vessel=createOriginsVessel(scene,{mobile,bookOnly:true,onChange:invalidate,onOpen:prepareBook});vessel.root.position.y=ORIGIN_ROOM.offset;
 const returnPortal=createBlackHolePortal(scene,{position:ORIGIN_RETURN.portal,href:earthHref}),cockpit=createSaucerCockpit(camera);scene.add(camera);
 const returnLink=document.getElementById('origin-return');
 const berthLight=new T.SpotLight(0xc7ddf5,900,55,.9,.8,2);berthLight.position.set(-6,3510,-22);berthLight.target.position.set(...ORIGIN_RETURN.ship);scene.add(berthLight,berthLight.target);
 const keys=new Set();let joystick={x:0,y:0};
 function angles(){const d=target.clone().sub(eye).normalize();yaw=Math.atan2(-d.x,-d.z);pitch=Math.asin(d.y);}
 function look(){target.copy(eye).add(new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)));}
 function paint(){
  const flying=stage==='return-flight'||stage==='return-portal';document.body.classList.toggle('is-return-flight',flying);
  status.textContent=flying?'Returning to the submerged Earth':stage==='return-corridor'?'Back to the saucer':stage==='boarding'?'Boarding the saucer':stage==='board'?'The saucer is waiting':stage==='saucer'?'Beyond the event horizon':stage==='chamber'?'The original volume':'Origins';
  button.textContent=stage==='saucer'?'Leave the saucer':stage==='chamber'?'Open the book':stage==='board'?'Board the saucer · return to Earth':stage==='return-corridor'?'Returning to the saucer':stage==='boarding'?'Boarding the saucer':'Continue to the book';button.disabled=!!rail||opening||flying;
  returnLink.textContent=flying?'Cancel return':stage==='saucer'||stage==='board'?'← Return to Earth':'← Return to the saucer';
 }
 function liftBook(){
  const priorView=bookReveal;
  bookReveal=null;
  expandOriginsBook(vessel.book.root,camera,'/origins?open=1&from=origin'+(originCity==='new-york'?'&city=new-york':''),{
   reduced:reduced.matches,
   onStart:()=>{stopInput();paint();renderer.render(scene,camera);},
   onClose:()=>{
    if(priorView){
     eye.copy(priorView.from);target.copy(priorView.startTarget);viewY=eye.y;camera.fov=priorView.startFov;
     camera.updateProjectionMatrix();camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld();
    }
    opening=false;vessel.book.reset();angles();paint();dirty=true;last=0;button.focus();
   }
  });
 }
 function prepareBook(){
  if(opening||rail)return;
  opening=true;stopInput();
  if(reduced.matches){liftBook();return;}
  bookReveal={from:eye.clone(),startTarget:target.clone(),startFov:camera.fov,elapsed:0};
  paint();dirty=true;
 }
 function cancelBookReveal(){
  if(!bookReveal)return;
  eye.copy(bookReveal.from);target.copy(bookReveal.startTarget);camera.fov=bookReveal.startFov;
  camera.updateProjectionMatrix();bookReveal=null;opening=false;viewY=eye.y;
  vessel.book.reset();angles();paint();dirty=true;last=0;
 }
 function finishBookReveal(){
  if(!bookReveal)return;
  const shot=sampleOriginBookReveal({...bookReveal,focus:new T.Vector3(...ORIGIN_ROOM.book),progress:1});
  eye.copy(shot.position);target.copy(shot.target);viewY=eye.y;camera.fov=shot.fov;
  camera.updateProjectionMatrix();camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld();
  renderer.render(scene,camera);liftBook();
 }
 function guide(points,duration,done,kind){
  stopInput();rail={curve:new T.CurvePath(),elapsed:0,duration,done,kind,lookStart:[yaw,pitch],targetStart:target.clone(),fovStart:camera.fov};const path=[eye.clone(),...points.map(p=>new T.Vector3(...p))];
  if(kind==='flight')rail.curve=new T.CatmullRomCurve3(path,false,'centripetal');else for(let i=1;i<path.length;i++)rail.curve.add(new T.LineCurve3(path[i-1],path[i]));
  if(reduced.matches||rail.curve.getLength()<.01){eye.copy(path.at(-1));rail=null;done();}paint();dirty=true;
 }
 function finishRail(){if(!rail)return;eye.copy(rail.curve.getPointAt(1));const done=rail.done;rail=null;done();angles();paint();dirty=true;}
 function walkStage(){
  if(eye.z<-14.4)hasLeftSaucer=true;
  const next=eye.z<=-39.2?'chamber':eye.z>-14.4?(hasLeftSaucer?'board':'saucer'):'passage';
  if(next!==stage){stage=next;paint();}
 }
 function clearSegment(x,z,tx,tz){
  const steps=Math.ceil(Math.hypot(tx-x,tz-z)/.2);
  for(let i=1;i<=steps;i++)if(ground(T.MathUtils.lerp(x,tx,i/steps),T.MathUtils.lerp(z,tz,i/steps))===null)return false;
  return true;
 }
 function guideWalk(points,pace,done,kind){
  let distance=0,x=eye.x,z=eye.z;
  for(const [tx,,tz] of points){distance+=Math.hypot(tx-x,tz-z);x=tx;z=tz;}
  guide(points,Math.max(.1,distance/pace),done,kind);
 }
 function parked(){hasLeftSaucer=true;stage='board';eye.fromArray(ORIGIN_RETURN.approach);target.set(...ORIGIN_RETURN.ship);angles();paint();dirty=true;}
 function returnToSaucer(){
  if(opening||rail)return;
  if(stage==='saucer'||stage==='board'||eye.z>ORIGIN_RETURN.approach[2])return boardSaucer();
  stage='return-corridor';
  const points=ORIGIN_RETURN.corridor.filter(z=>z>eye.z+.05).map(z=>walkPoint(0,z));
  if(eye.z<-43&&!clearSegment(eye.x,eye.z,0,points[0][2])){
   const x=eye.x<0?-2:2;
   if(eye.z>-44.2)points.unshift(walkPoint(x,-44.3),walkPoint(x,-41.5));
   else points.unshift(walkPoint(x,-41.5));
  }
  guideWalk(points,3,parked,'corridor-return');
 }
 function boardSaucer(){
  if(rail||opening)return;
  stage='boarding';
  const points=ORIGIN_RETURN.boarding.filter(z=>z>eye.z+.05).map(z=>walkPoint(0,z));
  if(!points.length||eye.z>-4.25)points.push([...ORIGIN_ROOM.entry]);
  guideWalk(points,3,launch,'boarding');
 }
 function launch(){stage='return-flight';guide(ORIGIN_RETURN.flight.slice(1),14,()=>{vessel.setFlight(eye);stage='return-portal';portalAt=performance.now();document.body.classList.add('is-departing');paint();},'flight');}
 function cancelReturn(){rail=null;portalAt=null;vessel.resetFlight();document.body.classList.remove('is-departing');parked();}
 returnLink.addEventListener('click',event=>{event.preventDefault();if(stage==='return-flight'||stage==='return-portal')cancelReturn();else returnToSaucer();});
 function arrive(){hasLeftSaucer=true;stage='chamber';eye.fromArray(ORIGIN_ROOM.arrival);target.fromArray(ORIGIN_ROOM.book);angles();paint();dirty=true;}
 function passage(){
  if(rail||opening)return;
  stage='passage';
  const points=[-8,-13.9,-16,-25,-32.8,-36.5,ORIGIN_ROOM.arrival[2]].filter(z=>z<eye.z-.05).map(z=>walkPoint(0,z));
  guideWalk(points,2.7,arrive,'to-book');
 }
 button.addEventListener('click',()=>{if(stage==='chamber')vessel.book.open();else if(stage==='board')boardSaucer();else passage();});
 const ray=new T.Raycaster(),pointer=new T.Vector2();
 host.addEventListener('pointerdown',event=>{if(event.button!==0)return;host.focus({preventScroll:true});host.setPointerCapture(event.pointerId);down={x:event.clientX,y:event.clientY,lx:event.clientX,ly:event.clientY};dragged=false;});
 host.addEventListener('pointermove',event=>{if(!down)return;if(Math.hypot(event.clientX-down.x,event.clientY-down.y)>6)dragged=true;if(dragged){yaw-=(event.clientX-down.lx)*.004;pitch=T.MathUtils.clamp(pitch+(event.clientY-down.ly)*.003,-1.3,1.3);look();dirty=true;}down.lx=event.clientX;down.ly=event.clientY;});
 host.addEventListener('pointerup',event=>{
  if(!down)return;down=null;
  if(dragged||rail||opening||stage==='return-flight'||stage==='return-portal')return;
  pointer.set(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);ray.setFromCamera(pointer,camera);
  if(eye.distanceTo(new T.Vector3(...ORIGIN_ROOM.book))<5&&ray.intersectObjects(vessel.book.pickables,false).length){vessel.book.open();return;}
  const floor=ray.intersectObjects(vessel.walkSurfaces,false)[0];
  if(!floor)return;
  const {x,z}=floor.point;
  if(ground(x,z)===null||!clearSegment(eye.x,eye.z,x,z))return;
  guideWalk([walkPoint(x,z)],3,()=>{look();walkStage();},'walk');
 });
 host.addEventListener('pointercancel',()=>down=null);
 function free(){if(rail){rail=null;angles();walkStage();paint();}dirty=true;}
 function stopInput(){keys.clear();joystick={x:0,y:0};stick.querySelector('span').style.transform='';down=null;}
 document.addEventListener('keydown',event=>{
  if(hidden||blurred||event.defaultPrevented)return;
  if(event.key==='Escape'&&bookReveal){event.preventDefault();cancelBookReveal();return;}
  if(event.key==='Escape'&&(stage==='return-flight'||stage==='return-portal')){event.preventDefault();cancelReturn();return;}
  if(event.target.closest('input,textarea,select,[contenteditable]')||stage==='return-flight'||stage==='return-portal'||opening)return;
  const key=event.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)&&!event.metaKey&&!event.ctrlKey&&!event.altKey){
   event.preventDefault();free();keys.add(key);
  }else if(event.key==='Enter'&&!event.target.closest('button,a')){event.preventDefault();button.click();}
 });
 document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
 function stickMove(event){const b=stick.getBoundingClientRect(),x=event.clientX-b.x-b.width/2,y=event.clientY-b.y-b.height/2,r=Math.max(24,Math.hypot(x,y));joystick={x:x/r,y:y/r};stick.querySelector('span').style.transform=`translate(${joystick.x*24}px,${joystick.y*24}px)`;}
 stick.addEventListener('pointerdown',event=>{event.preventDefault();stick.setPointerCapture(event.pointerId);free();stickMove(event);});stick.addEventListener('pointermove',event=>{if(stick.hasPointerCapture(event.pointerId))stickMove(event);});stick.addEventListener('pointerup',stopInput);stick.addEventListener('pointercancel',stopInput);
 function move(dx,dz){
  const x=ground(eye.x+dx,eye.z)!==null?eye.x+dx:eye.x,z=ground(x,eye.z+dz)!==null?eye.z+dz:eye.z;
  if(x===eye.x&&z===eye.z)return;
  eye.set(x,ground(x,z),z);look();walkStage();dirty=true;
 }
 function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(quality.resize(devicePixelRatio));renderer.setSize(innerWidth,innerHeight);dirty=true;}
 addEventListener('resize',resize);addEventListener('blur',()=>{blurred=true;stopInput();});addEventListener('focus',()=>{blurred=false;last=0;dirty=true;});
 document.addEventListener('visibilitychange',()=>{hidden=document.hidden;stopInput();last=0;dirty=true;});reduced.addEventListener('change',()=>{if(reduced.matches&&rail)finishRail();if(reduced.matches&&bookReveal)finishBookReveal();dirty=true;});
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);document.getElementById('origin-fallback').hidden=false;document.body.classList.add('no-webgl');document.body.classList.remove('is-arriving');});
 function frame(now){
  if(disposed)return;const rawElapsed=last?(now-last)/1000:0,elapsed=Math.min(rawElapsed,.25);last=now;if(hidden||blurred||opening&&!bookReveal)return;
  if(stage==='return-portal'&&portalAt!==null&&now-portalAt>(reduced.matches?0:700)){portalAt=null;location.assign(earthHref);return;}
  if(rail){rail.elapsed+=Math.min(rawElapsed,1);const p=Math.min(1,rail.elapsed/rail.duration);eye.copy(rail.curve.getPointAt(p));if(rail.kind!=='flight')eye.y=ground(eye.x,eye.z)??eye.y;if(rail.kind==='flight'){vessel.setFlight(eye);target.copy(rail.curve.getPointAt(Math.min(1,p+.03)));}else if(rail.kind==='walk')look();else if(rail.kind==='to-book'){const view=sampleOriginBookJourney({eye,book:new T.Vector3(...ORIGIN_ROOM.book),startTarget:rail.targetStart,progress:p,startFov:rail.fovStart,mobile});target.copy(view.target);}else{const direction=new T.Vector3(...(rail.kind==='boarding'?ORIGIN_RETURN.portal:ORIGIN_RETURN.ship)).sub(eye).normalize(),toYaw=Math.atan2(-direction.x,-direction.z),turn=T.MathUtils.smoothstep(rail.elapsed,0,1.1);yaw=rail.lookStart[0]+Math.atan2(Math.sin(toYaw-rail.lookStart[0]),Math.cos(toYaw-rail.lookStart[0]))*turn;pitch=T.MathUtils.lerp(rail.lookStart[1],Math.asin(direction.y),turn);look();}dirty=true;if(p===1)finishRail();}
  else if(stage!=='return-portal'&&!bookReveal){const forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)-joystick.y,side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joystick.x,speed=Math.min(elapsed,.08)*3/Math.max(1,Math.hypot(forward,side));if(forward||side)move((-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed);}
  let fov=stage==='chamber'?(mobile?ORIGIN_BOOK_JOURNEY.mobileArrivalFov:ORIGIN_BOOK_JOURNEY.desktopArrivalFov):(mobile?80:72);
  if(rail?.kind==='to-book')fov=sampleOriginBookJourney({eye,book:new T.Vector3(...ORIGIN_ROOM.book),startTarget:rail.targetStart,progress:Math.min(1,rail.elapsed/rail.duration),startFov:rail.fovStart,mobile}).fov;
  if(bookReveal){
   bookReveal.elapsed+=Math.min(rawElapsed,.1);
   const progress=Math.min(1,bookReveal.elapsed/ORIGIN_BOOK_JOURNEY.revealDuration);
   const shot=sampleOriginBookReveal({...bookReveal,focus:new T.Vector3(...ORIGIN_ROOM.book),progress});
   eye.copy(shot.position);target.copy(shot.target);fov=shot.fov;dirty=true;
   if(progress===1){finishBookReveal();return;}
  }
  if(Math.abs(camera.fov-fov)>.01){camera.fov=reduced.matches||bookReveal?fov:T.MathUtils.damp(camera.fov,fov,4,elapsed);camera.updateProjectionMatrix();dirty=true;}
  const a=sky.update(elapsed,eye,!reduced.matches),b=vessel.update(elapsed,eye,!reduced.matches),c=returnPortal.update(elapsed,eye,!reduced.matches),d=cockpit.update(stage==='return-flight'||stage==='return-portal',camera.aspect);dirty=dirty||a||b||c||d;
  const flight=stage==='return-flight'||stage==='return-portal';
  const y=flight||reduced.matches||!rawElapsed||Math.abs(viewY-eye.y)<.002?eye.y:T.MathUtils.damp(viewY,eye.y,13,elapsed);
  if(y!==viewY){viewY=y;dirty=true;}
  if(dirty){camera.position.set(eye.x,viewY,eye.z);camera.lookAt(target.x,target.y+viewY-eye.y,target.z);camera.updateMatrixWorld();const started=performance.now();renderer.render(scene,camera);frames++;dirty=false;const ratio=quality.sample(now,{frameMs:rawElapsed*1000,renderMs:performance.now()-started});if(ratio!==renderer.getPixelRatio()){renderer.setPixelRatio(ratio);dirty=true;}if(frames===1)requestAnimationFrame(()=>document.body.classList.remove('is-arriving'));}
 }
 if(new URLSearchParams(location.search).get('return')==='1')arrive();else{angles();paint();}
 vessel.update(0,eye,false);
 renderer.setAnimationLoop(frame);
 addEventListener('pagehide',event=>{if(event.persisted){hidden=true;stopInput();renderer.setAnimationLoop(null);return;}disposed=true;bookReveal=null;stopInput();renderer.setAnimationLoop(null);vessel.dispose();returnPortal.dispose();cockpit.dispose();berthLight.dispose();sky.dispose();environment.dispose();pmrem.dispose();renderer.dispose();});
 addEventListener('pageshow',event=>{if(event.persisted){hidden=document.hidden;blurred=false;last=0;bookReveal=null;opening=false;vessel.book.reset();if(stage==='return-flight'||stage==='return-portal')cancelReturn();paint();dirty=true;document.body.classList.remove('is-arriving');renderer.setAnimationLoop(frame);}});
 return{diagnostics:()=>({stage,frames,originCity,reading:opening,bookArrival:{cinematic:true,revealing:!!bookReveal,progress:bookReveal?Math.min(1,bookReveal.elapsed/ORIGIN_BOOK_JOURNEY.revealDuration):null},returnJourney:{destination:earthHref,parkedShip:ORIGIN_RETURN.ship,portal:returnPortal.diagnostics(),moving:!!rail,kind:rail?.kind||null},moving:!!rail,passage:rail?{elapsed:rail.elapsed,duration:rail.duration}:null,galaxy:true,island:false,ocean:false,authPrompts:0,visible:!hidden&&!blurred,position:eye.toArray(),camera:{position:camera.position.toArray(),target:target.toArray(),fov:camera.fov},vessel:vessel.diagnostics(),sky:sky.diagnostics(),book:vessel.book.diagnostics(),originalBook:true,exhibitedWorks:0,bookOnly:true,reducedMotion:reduced.matches})};
}
