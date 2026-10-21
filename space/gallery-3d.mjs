import * as T from './vendor/three-0.180.0.mjs';
import {createSpatialWorld} from './gallery-spatial-world.mjs';
import {createSpatialLisbon} from './gallery-spatial-lisbon.mjs';
import {createGalleryAudio} from './gallery-audio.mjs';
import {allowed,clear,route} from './gallery-spatial-path.mjs';

const ENTRY=[0,1.65,18],LOOK=[1,4,-6];
export async function createGallery({onPick,onArrive=()=>{},onMove=()=>{},interact=()=>{},fallback,reduced}){
 const host=document.getElementById('space'),mobile=innerWidth<650;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:1.75));renderer.setSize(innerWidth,innerHeight);
 renderer.setClearColor(0x000000);renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color(0x000000);
 const camera=new T.PerspectiveCamera(mobile?72:60,innerWidth/innerHeight,.08,850);
 let dirty=true,frames=0,list=false,hidden=document.hidden,paused=false,lastTime=0,lastRender=0,slow=0;
 let motionReduced=reduced.matches,tween=null,focus=null,media=null,down=null,yaw=0,pitch=0,dragged=false;
 const world=createSpatialWorld(scene,{mobile,onChange:()=>{dirty=true;}});
 const lisbon=createSpatialLisbon(scene,{mobile,onChange:()=>{dirty=true;}});
 const sound=createGalleryAudio(),eye=new T.Vector3(...ENTRY),gaze=new T.Vector3(...LOOK),keys=new Set();
 const stick=document.getElementById('joystick'),knob=stick.querySelector('span');let joystick={x:0,y:0};
 const soundButton=document.getElementById('toggle-sound');
 function angles(){const d=gaze.clone().sub(eye).normalize();yaw=Math.atan2(-d.x,-d.z);pitch=Math.asin(d.y);}
 function look(){gaze.copy(eye).add(new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)));}
 function stopStick(){joystick={x:0,y:0};knob.style.transform='';}
 function stop(){keys.clear();stopStick();down=null;}
 function soundState(){const muted=sound.diagnostics().muted;soundButton.textContent=muted?'Sound off':'Sound on';soundButton.setAttribute('aria-pressed',String(!muted));soundButton.setAttribute('aria-label',muted?'Turn sound on':'Turn sound off');}
 try{sound.setMuted(localStorage.getItem('space-sound-muted')==='true');}catch{}
 soundState();angles();
 function syncSound(){sound.update({zone:'void',proximity:0,active:!hidden&&!list&&!paused&&!media});}
 const unlock=e=>{if(e.isTrusted&&!list&&!hidden&&!paused)sound.unlock().catch(()=>{});};
 document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
 soundButton.addEventListener('click',()=>{sound.setMuted(!sound.diagnostics().muted);try{localStorage.setItem('space-sound-muted',String(sound.diagnostics().muted));}catch{}soundState();});
 function travel(position,target,done){
  const path=route(eye,position);if(!path)return false;
  stop();interact();
  if(eye.distanceTo(position)<.03){gaze.copy(target);angles();tween=null;dirty=true;done?.();return true;}
  if(motionReduced){eye.copy(position);gaze.copy(target);angles();tween=null;dirty=true;done?.();return true;}
  const points=path.map(p=>new T.Vector3(p.x,1.65,p.z)),lengths=[0];
  for(let n=1;n<points.length;n++)lengths.push(lengths[n-1]+points[n-1].distanceTo(points[n]));
  tween={points,lengths,to:position,target,from:gaze.clone(),start:performance.now(),duration:Math.min(4200,Math.max(1450,lengths.at(-1)*110)),done};dirty=true;return true;
 }
 function visit(selection,done){
  if(!selection)return false;let step;
  if(selection.kind==='origin')step=world.getStop(selection.index);
  else if(selection.kind==='paper')step=world.paperStop();
  else if(['lisbon','sign'].includes(selection.kind))step={position:new T.Vector3(...lisbon.stop.position),target:new T.Vector3(-11,4.8,-6)};
  if(!step||step.end)return false;focus={...selection};
  return travel(step.position,step.target,()=>{onArrive(focus);done?.();});
 }
 function overview(){focus=null;onMove();travel(new T.Vector3(...ENTRY),new T.Vector3(...LOOK),()=>onArrive(null));}
 function setMedia(video,selection){
  world.clearMedia();lisbon.clearMedia();media=selection?{...selection}:null;
  if(video&&selection){if(selection.kind==='sign')lisbon.setMedia(video,selection.key);else world.setMedia(video,selection);}
  syncSound();dirty=true;
 }
 function move(dx,dz){
  const before=eye.clone(),x=eye.x+dx,z=eye.z+dz;
  if(clear(eye,{x,z:eye.z}))eye.x=x;if(clear(eye,{x:eye.x,z}))eye.z=z;
  if(eye.distanceToSquared(before)>.00001){look();dirty=true;}
 }
 const ray=new T.Raycaster(),mouse=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),0),floor=new T.Vector3();
 function hit(event){const rect=host.getBoundingClientRect();mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);return ray.intersectObjects([...world.pickables,...lisbon.pickables],false).find(h=>h.object.visible&&h.object.material?.opacity!==0);}
 function free(){if(tween)tween=null;onMove();interact();}
 host.addEventListener('pointerdown',e=>{if(e.button!==0)return;host.setPointerCapture(e.pointerId);down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY};dragged=false;});
 host.addEventListener('pointermove',e=>{
  if(!down){host.style.cursor=hit(e)?'pointer':'grab';return;}
  if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;
  if(dragged){if(tween)tween=null;interact();yaw-=(e.clientX-down.lx)*.004;pitch=T.MathUtils.clamp(pitch+(e.clientY-down.ly)*.003,-.9,1.35);look();dirty=true;}
  down.lx=e.clientX;down.ly=e.clientY;
 });
 host.addEventListener('pointerup',e=>{
  if(!down)return;down=null;if(dragged)return;
  const h=hit(e),data=h?.object.userData;
  if(data&&['origin','paper','sign'].includes(data.kind)){onPick({...data});return;}
  if(data?.kind==='lisbonScreen'){const key=lisbon.diagnostics().selected;if(key)onPick({kind:'sign',key});return;}
  if(ray.ray.intersectPlane(plane,floor)&&allowed(floor.x,floor.z)&&floor.distanceTo(eye)<80){free();const target=new T.Vector3(floor.x-Math.sin(yaw)*10,1.65+Math.sin(pitch)*10,floor.z-Math.cos(yaw)*10);travel(new T.Vector3(floor.x,1.65,floor.z),target);}
 });
 host.addEventListener('pointercancel',()=>{down=null;});
 document.addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea,select,[contenteditable=true],#spatial-player')||list||hidden)return;
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())){e.preventDefault();if(!keys.size)free();keys.add(e.key.toLowerCase());}
 });
 document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 function stickMove(e){const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.max(22,Math.hypot(dx,dy));joystick={x:dx/len,y:dy/len};knob.style.transform=`translate(${joystick.x*22}px,${joystick.y*22}px)`;}
 stick.addEventListener('pointerdown',e=>{e.preventDefault();stick.setPointerCapture(e.pointerId);free();stickMove(e);});
 stick.addEventListener('pointermove',e=>{if(stick.hasPointerCapture(e.pointerId))stickMove(e);});
 stick.addEventListener('pointerup',stopStick);stick.addEventListener('pointercancel',stopStick);
 document.getElementById('look-sky').addEventListener('click',()=>{interact();tween=null;pitch=.65;look();dirty=true;});
 document.getElementById('help').addEventListener('click',()=>document.querySelector('.guide').classList.toggle('is-help'));
 addEventListener('blur',()=>{stop();paused=true;syncSound();});addEventListener('focus',()=>{paused=false;syncSound();});
 document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden)stop();syncSound();dirty=true;lastTime=0;});
 function motionChanged(){motionReduced=reduced.matches;if(motionReduced&&tween){const t=tween;tween=null;eye.copy(t.to);gaze.copy(t.target);angles();t.done?.();}dirty=true;}
 reduced.addEventListener('change',motionChanged);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();paused=true;syncSound();renderer.setAnimationLoop(null);fallback();});
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<650?72:60;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);dirty=true;});
 function animate(now){
  const elapsed=lastTime?(now-lastTime)/1000:0,dt=Math.min(elapsed,.05);lastTime=now;if(reduced.matches!==motionReduced)motionChanged();if(list||hidden){slow=0;return;}
  if(frames>2&&(!motionReduced||tween)){slow=elapsed>.09?slow+1:0;if(slow>=3&&renderer.getPixelRatio()>.65){renderer.setPixelRatio(Math.max(.65,renderer.getPixelRatio()*.7));slow=0;dirty=true;}}
  if(tween){const t=tween,p=Math.min(1,(now-t.start)/t.duration),ease=p*p*(3-2*p),distance=t.lengths.at(-1)*ease;let i=1;while(i<t.points.length-1&&t.lengths[i]<distance)i++;const length=t.lengths[i]-t.lengths[i-1];eye.lerpVectors(t.points[i-1],t.points[i],length?(distance-t.lengths[i-1])/length:1);gaze.lerpVectors(t.from,t.target,ease);dirty=true;if(p===1){tween=null;angles();t.done?.();}}
  const forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)-joystick.y,side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joystick.x;
  if(forward||side){const speed=dt*2.6/Math.max(1,Math.hypot(forward,side));move((-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed);}
  const worldChanged=world.update(dt,eye,!motionReduced),lisbonChanged=lisbon.update(dt,eye,!motionReduced);if(worldChanged||lisbonChanged)dirty=true;
  if(dirty&&now-lastRender>=(innerWidth<650?40:32)){camera.position.copy(eye);camera.lookAt(gaze);camera.updateMatrixWorld();renderer.render(scene,camera);frames++;dirty=false;lastRender=now;}
  syncSound();
 }
 world.update(0,eye,false);lisbon.update(0,eye,false);camera.position.copy(eye);camera.lookAt(gaze);camera.updateMatrixWorld();renderer.setAnimationLoop(animate);
 addEventListener('pagehide',()=>{stop();paused=true;syncSound();renderer.setAnimationLoop(null);});
 addEventListener('pageshow',e=>{if(e.persisted){paused=false;hidden=document.hidden;dirty=true;lastTime=0;syncSound();renderer.setAnimationLoop(animate);}});
 return{visit,overview,setMedia,stop,invalidate(){dirty=true;},setList(value){list=!!value;stop();syncSound();dirty=true;lastTime=0;},
  diagnostics:()=>({webgl:true,zone:'spatial',frames,focus:focus?{...focus}:null,position:[+eye.x.toFixed(2),+eye.z.toFixed(2)],moving:!!tween||!!keys.size||!!joystick.x||!!joystick.y,visible:!hidden&&!list,
   camera:{position:eye.toArray(),target:gaze.toArray(),fov:camera.fov,aspect:camera.aspect},world:world.diagnostics(),lisbon:lisbon.diagnostics(),audio:sound.diagnostics(),render:{pixelRatio:renderer.getPixelRatio(),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},navigation:{speed:2.6,spacing:32,minDuration:1450,maxDuration:4200}})};
}
