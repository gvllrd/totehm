import * as T from './vendor/three-0.180.0.mjs';
import {createTempleArchitecture} from './gallery-temple.mjs';
import {createTempleLandscape} from './gallery-temple-landscape.mjs';
import {createTempleWalkway} from './gallery-temple-navigation.mjs';
import {createGalleryAudio} from './gallery-audio.mjs';

const ENTRY=[0,1.65,12],LOOK=[0,3.4,-12],PATHS=['/get_higher','/origins','/play_lisbon_street'];
const ENTER_MS=800;
export async function createGallery({select,onOverview=()=>{},interact=()=>{},fallback,reduced,lisbonPreview}){
 const host=document.getElementById('space'),mobile=innerWidth<650;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:1.75));renderer.setSize(innerWidth,innerHeight);
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 renderer.setClearColor(0xb8d2df);renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(mobile?72:60,innerWidth/innerHeight,.08,2800);
 let dirty=true,frames=0,list=false,hidden=document.hidden,paused=false,lastTime=0,lastRender=0,slow=0;
 let motionReduced=reduced.matches,tween=null,room=-1,transition=null,down=null,yaw=0,pitch=0,dragged=false;
 const landscape=createTempleLandscape(scene,renderer,{mobile,onChange:()=>{dirty=true;}});
 const temple=createTempleArchitecture(scene,renderer,{mobile,lisbonPreview,onChange:()=>{dirty=true;renderer.shadowMap.needsUpdate=true;}});
 const walkway=createTempleWalkway(),sound=createGalleryAudio(),eye=new T.Vector3(...ENTRY),gaze=new T.Vector3(...LOOK),keys=new Set();
 const stick=document.getElementById('joystick'),knob=stick.querySelector('span'),flash=document.getElementById('portal-flash');let joystick={x:0,y:0};
 const soundButton=document.getElementById('toggle-sound');
 function angles(){const d=gaze.clone().sub(eye).normalize();yaw=Math.atan2(-d.x,-d.z);pitch=Math.asin(d.y);}
 function look(){gaze.copy(eye).add(new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)));}
 function stopStick(){joystick={x:0,y:0};knob.style.transform='';}
 function stop(){keys.clear();stopStick();down=null;}
 function soundState(){const muted=sound.diagnostics().muted;soundButton.textContent=muted?'Sound off':'Sound on';soundButton.setAttribute('aria-pressed',String(!muted));soundButton.setAttribute('aria-label',muted?'Turn sound on':'Turn sound off');}
 try{sound.setMuted(localStorage.getItem('space-sound-muted')==='true');}catch{}
 soundState();angles();
 function syncSound(){const portals=temple.portals||[],distance=portals.length?Math.min(...portals.map(p=>Math.hypot(eye.x-p.x,eye.z-p.z))):99;const proximity=Math.max(0,1-distance/8);sound.update({zone:'temple',proximity,active:!hidden&&!list&&!paused});}
 const unlock=e=>{if(e.isTrusted&&!list&&!hidden&&!paused)sound.unlock().catch(()=>{});};
 document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
 soundButton.addEventListener('click',()=>{sound.setMuted(!sound.diagnostics().muted);try{localStorage.setItem('space-sound-muted',String(sound.diagnostics().muted));}catch{}soundState();});
 function travel(position,target,done){
  if(transition)return false;const path=walkway.route(eye,position);if(!path)return false;stop();interact();
  if(motionReduced||eye.distanceTo(position)<.03){eye.copy(position);gaze.copy(target);angles();tween=null;dirty=true;done?.();return true;}
  const points=path.map(p=>new T.Vector3(p.x,1.65,p.z)),lengths=[0];
  for(let n=1;n<points.length;n++)lengths.push(lengths[n-1]+points[n-1].distanceTo(points[n]));
  tween={points,lengths,to:position,target,from:gaze.clone(),start:performance.now(),duration:Math.min(4200,Math.max(1450,lengths.at(-1)*110)),done};dirty=true;return true;
 }
 function visit(index,done=null){
  const portal=temple.portals?.find(p=>p.room===index);if(!portal)return false;room=index;
  return travel(new T.Vector3(portal.x,1.65,portal.approach?.z??-10.6),new T.Vector3(portal.x,3.1,-15),done);
 }
 function enter(index=room){
  if(transition||!PATHS[index]||list)return false;
  const portal=temple.portals.find(p=>p.room===index);if(!portal)return false;
  if(Math.hypot(eye.x-portal.x,eye.z-portal.z)>3){return visit(index,()=>enter(index));}
  stop();tween=null;room=index;interact();sound.transition('enter');
  transition={start:null,progress:0,midpointRendered:false,room:index,path:PATHS[index],from:eye.clone(),x:portal.x,z:portal.z,fromGaze:gaze.clone()};
  dirty=true;return true;
 }
 function overview(){if(transition)return;room=-1;tween=null;onOverview();travel(new T.Vector3(...ENTRY),new T.Vector3(...LOOK));}
 function panorama(kind){if(transition)return;room=-1;onOverview();const sea=kind==='sea';travel(new T.Vector3(sea?-13.6:13.6,1.65,8.4),new T.Vector3(sea?-250:240,sea?-70:-35,sea?-60:-170));}
 function move(dx,dz){
  const before=eye.clone(),x=eye.x+dx,z=eye.z+dz;
  if(walkway.allowed(x,eye.z))eye.x=x;if(walkway.allowed(eye.x,z))eye.z=z;
  if(eye.distanceToSquared(before)>.00001){look();dirty=true;const near=walkway.portalAt(eye.x,eye.z);if(near!==null)enter(near);}
 }
 const ray=new T.Raycaster(),mouse=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),-.005),floor=new T.Vector3();
 function hit(event){const rect=host.getBoundingClientRect();mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);const picks=temple.pickables??temple.portals.flatMap(p=>p.pickables);return ray.intersectObjects(picks,false).find(h=>h.object.visible&&h.object.material?.opacity!==0);}
 function free(){if(tween)tween=null;interact();}
 host.addEventListener('pointerdown',e=>{if(e.button!==0||transition)return;host.setPointerCapture(e.pointerId);down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY};dragged=false;});
 host.addEventListener('pointermove',e=>{
  if(transition)return;
  if(!down){const h=hit(e);host.style.cursor=h?.object.userData.room!==undefined?'pointer':'grab';return;}
  if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;
  if(dragged){free();yaw-=(e.clientX-down.lx)*.004;pitch=T.MathUtils.clamp(pitch+(e.clientY-down.ly)*.003,-1.2,1.35);look();dirty=true;}
  down.lx=e.clientX;down.ly=e.clientY;
 });
 host.addEventListener('pointerup',e=>{
  if(!down||transition)return;down=null;if(dragged)return;
  const h=hit(e),data=h?.object.userData;
  if(data?.room!==undefined){const portal=temple.portals[data.room];if(room===data.room&&Math.hypot(eye.x-portal.x,eye.z-portal.z)<3)enter(data.room);else select(data.room);return;}
  if(ray.ray.intersectPlane(plane,floor)&&walkway.allowed(floor.x,floor.z)&&floor.distanceTo(eye)<50&&(!h||h.distance>=floor.distanceTo(eye)-.2)){
   const destination=new T.Vector3(floor.x,1.65,floor.z),direction=gaze.clone().sub(eye);free();travel(destination,destination.clone().add(direction));
  }
 });
 host.addEventListener('pointercancel',()=>{down=null;});
 document.addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea,select,[contenteditable=true]')||list||hidden||transition)return;
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())){e.preventDefault();free();keys.add(e.key.toLowerCase());}
 });
 document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 function stickMove(e){const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.max(22,Math.hypot(dx,dy));joystick={x:dx/len,y:dy/len};knob.style.transform=`translate(${joystick.x*22}px,${joystick.y*22}px)`;}
 stick.addEventListener('pointerdown',e=>{if(transition)return;e.preventDefault();stick.setPointerCapture(e.pointerId);free();stickMove(e);});
 stick.addEventListener('pointermove',e=>{if(stick.hasPointerCapture(e.pointerId)&&!transition)stickMove(e);});stick.addEventListener('pointerup',stopStick);stick.addEventListener('pointercancel',stopStick);
 document.getElementById('look-sky').addEventListener('click',()=>{if(transition)return;free();pitch=.75;look();dirty=true;});
 document.getElementById('help').addEventListener('click',()=>document.querySelector('.guide').classList.toggle('is-help'));
 document.getElementById('look-sea').addEventListener('click',()=>panorama('sea'));document.getElementById('look-mountains').addEventListener('click',()=>panorama('mountains'));
 addEventListener('blur',()=>{stop();paused=true;syncSound();});addEventListener('focus',()=>{paused=false;syncSound();});
 document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden)stop();syncSound();dirty=true;lastTime=0;});
 function motionChanged(){motionReduced=reduced.matches;if(motionReduced&&tween){const t=tween;tween=null;eye.copy(t.to);gaze.copy(t.target);angles();t.done?.();}dirty=true;}
 reduced.addEventListener('change',motionChanged);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();paused=true;syncSound();renderer.setAnimationLoop(null);fallback();});
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=mobile?72:60;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);dirty=true;});
 function animate(now){
  const elapsed=lastTime?(now-lastTime)/1000:0,dt=Math.min(elapsed,.05);lastTime=now;if(reduced.matches!==motionReduced)motionChanged();if(list||hidden){slow=0;return;}
  if(frames>2&&(!motionReduced||tween)){slow=elapsed>.09?slow+1:0;if(slow>=3&&renderer.getPixelRatio()>.65){renderer.setPixelRatio(Math.max(.65,renderer.getPixelRatio()*.75));slow=0;dirty=true;}}
  if(tween){const t=tween,p=T.MathUtils.clamp((now-t.start)/t.duration,0,1),ease=p*p*(3-2*p),distance=t.lengths.at(-1)*ease;let i=1;while(i<t.points.length-1&&t.lengths[i]<distance)i++;const length=t.lengths[i]-t.lengths[i-1];eye.lerpVectors(t.points[i-1],t.points[i],length?(distance-t.lengths[i-1])/length:1);gaze.lerpVectors(t.from,t.target,ease);dirty=true;if(p===1){tween=null;angles();t.done?.();}}
  if(!transition){
   const forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)-joystick.y,side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joystick.x;
   if(forward||side){const speed=dt*2.6/Math.max(1,Math.hypot(forward,side));move((-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed);}
  }
  if(transition){
   // Start on the first animation frame. A queued rAF timestamp may precede
   // the input event's performance.now(); it must never contract the FOV.
   if(transition.start===null)transition.start=now;
   let p=T.MathUtils.clamp((now-transition.start)/(motionReduced?120:ENTER_MS),0,1);
   // Even a device that misses the middle frames sees the aspiration once.
   // Mark it only after an actual render, then allow the doorway to finish.
   if(!motionReduced&&!transition.midpointRendered&&p>.5)p=.5;
   transition.progress=p;
   const ease=p*p*(3-2*p);eye.lerpVectors(transition.from,new T.Vector3(transition.x,1.65,transition.z-1.2),ease);gaze.lerpVectors(transition.fromGaze,new T.Vector3(transition.x,2.8,transition.z-6),ease);camera.fov=(mobile?72:60)+(motionReduced?0:11*Math.sin(p*Math.PI));camera.updateProjectionMatrix();flash.style.opacity=String(T.MathUtils.smoothstep(p,.15,1));dirty=true;if(p>=1){const path=transition.path;transition=null;sound.update({zone:'temple',proximity:0,active:false});renderer.setAnimationLoop(null);location.assign(path);return;}}
  const landChanged=landscape.update(dt,eye,!motionReduced);temple.setDay(landscape.day??landscape.diagnostics().day);
  const previewChanged=lisbonPreview?.update(dt,!motionReduced),architectureChanged=temple.update(dt,eye,!motionReduced);if(landChanged||architectureChanged||previewChanged)dirty=true;
  document.body.classList.toggle('temple-day',!!(landscape.day??landscape.diagnostics().day));
  if(dirty&&(transition||now-lastRender>=(mobile?40:32))){camera.position.copy(eye);camera.lookAt(gaze);camera.updateMatrixWorld();renderer.render(scene,camera);if(transition&&transition.progress>=.5)transition.midpointRendered=true;frames++;dirty=false;lastRender=now;}
  syncSound();
 }
 landscape.update(0,eye,false);temple.setDay(landscape.day??landscape.diagnostics().day);temple.update(0,eye,false);camera.position.copy(eye);camera.lookAt(gaze);camera.updateMatrixWorld();renderer.setAnimationLoop(animate);
 addEventListener('pagehide',()=>{stop();paused=true;syncSound();renderer.setAnimationLoop(null);});
 addEventListener('pageshow',e=>{if(e.persisted){paused=false;hidden=document.hidden;transition=null;if(eye.z<-11.4){eye.z=-10.6;gaze.set(eye.x,3.1,-15);angles();}flash.style.opacity='0';camera.fov=mobile?72:60;camera.updateProjectionMatrix();dirty=true;lastTime=0;syncSound();renderer.setAnimationLoop(animate);}});
 return{visit,enter,overview,panorama,invalidate(){dirty=true;},stop(){stop();tween=null;dirty=true;},setList(value){list=!!value;stop();syncSound();dirty=true;lastTime=0;},
  diagnostics:()=>({webgl:true,zone:'temple',room,frames,position:[+eye.x.toFixed(2),+eye.z.toFixed(2)],moving:!!tween||!!keys.size||!!joystick.x||!!joystick.y,visible:!hidden&&!list,
   camera:{position:eye.toArray(),target:gaze.toArray(),fov:camera.fov,aspect:camera.aspect},temple:temple.diagnostics(),landscape:landscape.diagnostics(),audio:sound.diagnostics(),render:{pixelRatio:renderer.getPixelRatio(),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},transition:{active:!!transition,duration:ENTER_MS,fov:camera.fov},navigation:{speed:2.6,minDuration:1450,maxDuration:4200}})};
}
