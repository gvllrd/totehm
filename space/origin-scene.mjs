import * as T from './vendor/three-0.180.0.mjs';
import {createDrownedSky} from './gallery-drowned-sky.mjs';
import {createOriginsVessel} from './gallery-origins-vessel.mjs';
import {createRenderQuality} from './gallery-render-quality.mjs';
export const ORIGIN_ROOM=Object.freeze({offset:3480,floor:3500,eye:3501.65,entry:Object.freeze([0,3501.65,-4.2]),book:Object.freeze([0,3501.34,-43]),arrival:Object.freeze([0,3501.65,-40.5])});
const host=document.getElementById('origin-scene'),button=document.getElementById('origin-action'),status=document.getElementById('origin-status'),stick=document.getElementById('origin-stick'),reduced=matchMedia('(prefers-reduced-motion:reduce)'),mobile=innerWidth<650;
let engine=null;
try{engine=createOriginScene();}catch(error){console.error('[origin scene]',error?.message);document.getElementById('origin-fallback').hidden=false;document.body.classList.add('no-webgl');document.body.classList.remove('is-arriving');}
window.__totehm_origin=()=>({build:'2026-11-15-origin-sacred-volume',fallback:!engine,...engine?.diagnostics()});
function createOriginScene(){
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'}),quality=createRenderQuality({mobile,pixelRatio:devicePixelRatio});renderer.setPixelRatio(quality.diagnostics().pixelRatio);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.setClearColor(0x000000);renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(mobile?80:72,innerWidth/innerHeight,.05,100000),eye=new T.Vector3(...ORIGIN_ROOM.entry),target=new T.Vector3(0,3502,-15);
 let dirty=true,disposed=false,hidden=document.hidden,blurred=false,last=0,frames=0,stage='saucer',rail=null,yaw=0,pitch=0,down=null,dragged=false,opening=false;
 const invalidate=()=>{dirty=true;};
 const sky=createDrownedSky(scene,{mobile,onChange:invalidate,place:'lisbon'});
 const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(sky.environmentTexture);scene.environment=environment.texture;scene.environmentIntensity=.12;
 const vessel=createOriginsVessel(scene,{mobile,bookOnly:true,onChange:invalidate,onOpen:()=>{opening=true;document.body.classList.add('is-arriving');setTimeout(()=>location.assign('/origins?open=1&from=origin'),reduced.matches?0:500);}});vessel.root.position.y=ORIGIN_ROOM.offset;
 const keys=new Set();let joystick={x:0,y:0};
 function angles(){const d=target.clone().sub(eye).normalize();yaw=Math.atan2(-d.x,-d.z);pitch=Math.asin(d.y);}
 function look(){target.copy(eye).add(new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)));}
 function paint(){status.textContent=stage==='saucer'?'Beyond the event horizon':stage==='passage'?'Origins':stage==='chamber'?'The original volume':'';button.textContent=stage==='saucer'?'Leave the saucer':stage==='chamber'?'Open the book':'Continue to the book';button.disabled=!!rail||opening;}
 function arrive(){stage='chamber';eye.fromArray(ORIGIN_ROOM.arrival);target.fromArray(ORIGIN_ROOM.book);angles();paint();dirty=true;}
 function passage(){
  if(rail||opening)return;stage='passage';keys.clear();
  const points=[eye.clone(),...[-8,-16,-25,-32.8,-36.5,-40.5].filter(z=>z<eye.z-.05).map(z=>new T.Vector3(0,ORIGIN_ROOM.eye,z))];
  const curve=new T.CurvePath();for(let i=1;i<points.length;i++)curve.add(new T.LineCurve3(points[i-1],points[i]));
  if(reduced.matches||points.length<2)arrive();else{rail={curve,elapsed:0,duration:Math.max(3,eye.distanceTo(new T.Vector3(...ORIGIN_ROOM.arrival))/2.3)};paint();}dirty=true;
 }
 button.addEventListener('click',()=>{if(stage==='chamber')vessel.book.open();else passage();});
 const ray=new T.Raycaster(),pointer=new T.Vector2();
 host.addEventListener('pointerdown',event=>{host.focus({preventScroll:true});host.setPointerCapture(event.pointerId);down={x:event.clientX,y:event.clientY,lx:event.clientX,ly:event.clientY};dragged=false;});
 host.addEventListener('pointermove',event=>{if(!down)return;if(Math.hypot(event.clientX-down.x,event.clientY-down.y)>6)dragged=true;if(dragged){yaw-=(event.clientX-down.lx)*.004;pitch=T.MathUtils.clamp(pitch+(event.clientY-down.ly)*.003,-1.3,1.3);look();dirty=true;}down.lx=event.clientX;down.ly=event.clientY;});
 host.addEventListener('pointerup',event=>{if(!down)return;down=null;if(dragged||rail)return;pointer.set(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);ray.setFromCamera(pointer,camera);if(eye.distanceTo(new T.Vector3(...ORIGIN_ROOM.book))<5&&ray.intersectObjects(vessel.book.pickables,false).length){vessel.book.open();return;}if(stage!=='chamber')passage();});
 host.addEventListener('pointercancel',()=>down=null);
 function free(){if(rail){rail=null;stage=eye.z<-34?'chamber':'passage';angles();paint();}dirty=true;}
 function stopInput(){keys.clear();joystick={x:0,y:0};stick.querySelector('span').style.transform='';down=null;}
 document.addEventListener('keydown',event=>{if(event.target.closest('button,a,input,textarea')||hidden||blurred)return;const key=event.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){event.preventDefault();free();keys.add(key);}else if(event.key==='Enter'){event.preventDefault();button.click();}});
 document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
 function stickMove(event){const b=stick.getBoundingClientRect(),x=event.clientX-b.x-b.width/2,y=event.clientY-b.y-b.height/2,r=Math.max(24,Math.hypot(x,y));joystick={x:x/r,y:y/r};stick.querySelector('span').style.transform=`translate(${joystick.x*24}px,${joystick.y*24}px)`;}
 stick.addEventListener('pointerdown',event=>{event.preventDefault();stick.setPointerCapture(event.pointerId);free();stickMove(event);});stick.addEventListener('pointermove',event=>{if(stick.hasPointerCapture(event.pointerId))stickMove(event);});stick.addEventListener('pointerup',stopInput);stick.addEventListener('pointercancel',stopInput);
 function allowed(x,z){
  if(z>-4.0||z<-52.7)return false;
  if(z>-33.3)return Math.abs(x)<2.03;
  if(Math.hypot(x,z+43)>9.9)return false;
  return Math.hypot(x,z+43)>1.05;
 }
 function move(dx,dz){let changed=false;if(allowed(eye.x+dx,eye.z)){eye.x+=dx;changed=true;}if(allowed(eye.x,eye.z+dz)){eye.z+=dz;changed=true;}if(changed){look();stage=eye.z<-34?'chamber':'passage';paint();dirty=true;}}
 function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(quality.resize(devicePixelRatio));renderer.setSize(innerWidth,innerHeight);dirty=true;}
 addEventListener('resize',resize);addEventListener('blur',()=>{blurred=true;stopInput();});addEventListener('focus',()=>{blurred=false;last=0;dirty=true;});
 document.addEventListener('visibilitychange',()=>{hidden=document.hidden;stopInput();last=0;dirty=true;});reduced.addEventListener('change',()=>{if(reduced.matches&&rail){rail=null;arrive();}dirty=true;});
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);document.getElementById('origin-fallback').hidden=false;document.body.classList.add('no-webgl');document.body.classList.remove('is-arriving');});
 function frame(now){
  if(disposed)return;const rawElapsed=last?(now-last)/1000:0,elapsed=Math.min(rawElapsed,.25);last=now;if(hidden||blurred)return;
  if(rail){rail.elapsed+=Math.min(rawElapsed,1);const p=Math.min(1,rail.elapsed/rail.duration);eye.copy(rail.curve.getPointAt(p));target.set(0,ORIGIN_ROOM.book[1],-43);dirty=true;if(p===1){rail=null;arrive();}}
  else{const forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)-joystick.y,side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joystick.x,speed=elapsed*2.2/Math.max(1,Math.hypot(forward,side));if(forward||side)move((-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed);}
  const fov=stage==='chamber'?(mobile?48:55):(mobile?80:72);if(Math.abs(camera.fov-fov)>.01){camera.fov=reduced.matches?fov:T.MathUtils.damp(camera.fov,fov,4,elapsed);camera.updateProjectionMatrix();dirty=true;}
  const a=sky.update(elapsed,eye,!reduced.matches),b=vessel.update(elapsed,eye,!reduced.matches);dirty=dirty||a||b;
  if(dirty){camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld();const started=performance.now();renderer.render(scene,camera);frames++;dirty=false;const ratio=quality.sample(now,{frameMs:rawElapsed*1000,renderMs:performance.now()-started});if(ratio!==renderer.getPixelRatio()){renderer.setPixelRatio(ratio);dirty=true;}if(frames===1)requestAnimationFrame(()=>document.body.classList.remove('is-arriving'));}
 }
 if(new URLSearchParams(location.search).get('return')==='1')arrive();else{angles();paint();}
 renderer.setAnimationLoop(frame);
 addEventListener('pagehide',event=>{if(event.persisted){hidden=true;stopInput();renderer.setAnimationLoop(null);return;}disposed=true;stopInput();renderer.setAnimationLoop(null);vessel.dispose();sky.dispose();environment.dispose();pmrem.dispose();renderer.dispose();});
 addEventListener('pageshow',event=>{if(event.persisted){hidden=document.hidden;blurred=false;last=0;opening=false;vessel.book.reset();paint();dirty=true;document.body.classList.remove('is-arriving');renderer.setAnimationLoop(frame);}});
 return{diagnostics:()=>({stage,frames,moving:!!rail,passage:rail?{elapsed:rail.elapsed,duration:rail.duration}:null,galaxy:true,island:false,ocean:false,authPrompts:0,visible:!hidden&&!blurred,position:eye.toArray(),camera:{position:camera.position.toArray(),target:target.toArray(),fov:camera.fov},vessel:vessel.diagnostics(),book:vessel.book.diagnostics(),originalBook:true,exhibitedWorks:0,bookOnly:true,reducedMotion:reduced.matches})};
}
