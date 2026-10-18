import * as T from './vendor/three-0.180.0.mjs';
import { createTemple } from './gallery-temple.mjs';
import { createVoid } from './gallery-void.mjs';
import { createGalleryAudio } from './gallery-audio.mjs';
import { createTempleWalkway } from './gallery-navigation.mjs';
import { ORIGINS } from './gallery-artworks.mjs';

const ENTRY=[0,1.65,12],OVERVIEW=[0,3,-10],PORTALS=[-9,0,9];
const TRANSITION_MS=800;
export async function createGallery({select,interact,onZone=()=>{},fallback,reduced,lisbonPreview}) {
 const host=document.getElementById('space');
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<650?1.5:1.75));renderer.setSize(innerWidth,innerHeight);
 renderer.setClearColor(0x000000);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color(0x000000);
 let dirty=true,list=false,hidden=document.hidden,zone='temple',room=-1,transition=null,tween=null;
 let frames=0,lastTime=0,lastRender=0,slowFrames=0,yaw=0,pitch=0,down=null,dragged=false;
 let motionReduced=reduced.matches,joystick={x:0,y:0},announced=-1;
 const temple=createTemple(scene,renderer,{lisbonPreview,onChange:()=>{dirty=true;}}),walkway=createTempleWalkway();
 const corridor=createVoid(scene,{lisbonPreview,onChange:()=>{dirty=true;}}),sound=createGalleryAudio();
 const camera=new T.PerspectiveCamera(innerWidth<650?76:62,innerWidth/innerHeight,.08,1400);
 const eye=new T.Vector3(...ENTRY),gaze=new T.Vector3(...OVERVIEW),keys=new Set();
 const flash=document.getElementById('portal-flash'),advance=document.getElementById('explore-space');
 const soundButton=document.getElementById('toggle-sound'),status=document.getElementById('world-status');
 function cameraAngles(){const delta=gaze.clone().sub(eye).normalize();yaw=Math.atan2(-delta.x,-delta.z);pitch=Math.asin(delta.y);}
 function look(){gaze.copy(eye).add(new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)));}
 cameraAngles();
 function baseFov(){return innerWidth<650?76:62;}
 function syncSound(){const muted=sound.diagnostics().muted;soundButton.textContent=muted?'Sound off':'Sound on';soundButton.setAttribute('aria-pressed',String(!muted));soundButton.setAttribute('aria-label',muted?'Turn sound on':'Turn sound off');}
 try{if(localStorage.getItem('space-sound-muted')==='true')sound.setMuted(true);}catch{}
 syncSound();
 function unlock(e){if(e.isTrusted&&!list&&!hidden)sound.unlock().catch(()=>{});}
 document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
 soundButton.addEventListener('click',()=>{const muted=!sound.diagnostics().muted;sound.setMuted(muted);try{localStorage.setItem('space-sound-muted',String(muted));}catch{}syncSound();});
 function stopStick(){joystick={x:0,y:0};knob.style.transform='';}
 function stop(){keys.clear();stopStick();down=null;lisbonPreview.pause();}
 function beginTransition(direction){
  transition=motionReduced?null:{direction,start:performance.now()};
  sound.transition(direction);camera.fov=baseFov();camera.updateProjectionMatrix();flash.style.opacity='0';dirty=true;
 }
 function announce(){
  const data=corridor.diagnostics(),index=data.index??0;
  advance.textContent=index>=data.total-1?'Return to the temple ↗':'Next artwork ↗';
  if(announced!==index){announced=index;onZone('void',room,room===1?index:null);status.textContent=room===1?ORIGINS[index].title+' · '+(index+1)+' of 20':room===0?'TotehmPaper · The Stoner Experience':'Higher the Lisbon Streets';}
 }
 function enter(roomIndex,index=0){
  stop();tween=null;room=roomIndex;zone='void';announced=-1;
  temple.setVisible(false);corridor.enter(room,index);
  const step=corridor.getStop(index);eye.copy(step.position);gaze.copy(step.target);cameraAngles();
  document.body.classList.add('void-world','exploring');document.body.classList.remove('temple-day');
  corridor.update(0,eye,!motionReduced);beginTransition('enter');announce();
 }
 function overview(){
  const wasVoid=zone==='void';stop();tween=null;zone='temple';room=-1;announced=-1;
  corridor.root.visible=false;temple.setVisible(true);eye.fromArray(ENTRY);gaze.fromArray(OVERVIEW);cameraAngles();
  document.body.classList.remove('void-world');advance.textContent='Enter Origins ↗';status.textContent='Back at the temple above the clouds';
  if(wasVoid)beginTransition('return');onZone('temple',-1,null);dirty=true;
 }
 function travel(position,target,done=null){
  keys.clear();stopStick();
  const route=zone==='temple'?walkway.route(eye,position):[eye,position];if(!route)return false;
  if(motionReduced){eye.copy(position);gaze.copy(target);cameraAngles();tween=null;dirty=true;done?.();}
  else{
   const path=route.map(p=>new T.Vector3(p.x,1.65,p.z)),lengths=[0];
   for(let i=1;i<path.length;i++)lengths.push(lengths[i-1]+path[i-1].distanceTo(path[i]));
   // Keep the preceding gallery's exact distance-based timing and easing.
   tween={path,lengths,to:position,lookFrom:gaze.clone(),lookTo:target,start:performance.now(),duration:Math.min(4200,Math.max(1450,lengths.at(-1)*110)),done};
  }
  return true;
 }
 function visit(index,origin=null){
  const work=index===1&&origin!==null?origin:0;
  if(zone==='void'&&room===index){
   const step=corridor.getStop(work);travel(step.position,step.target,()=>{corridor.update(0,eye,!motionReduced);announced=-1;announce();});return;
  }
  if(zone==='void')overview();
  travel(new T.Vector3(PORTALS[index],1.65,-11.2),new T.Vector3(PORTALS[index],3.2,-15),()=>enter(index,work));
 }
 function explore(){
  if(zone==='temple'){select(1,true,0);return;}
  if(tween||transition)return;
  const step=corridor.nextStop(eye);if(step.end){overview();return;}
  travel(step.position,step.target,()=>{corridor.update(0,eye,!motionReduced);announce();});
 }
 function previous(){
  if(zone!=='void')return;
  const index=Math.max(0,(corridor.diagnostics().index??0)-1),step=corridor.getStop(index);
  travel(step.position,step.target,()=>{corridor.update(0,eye,!motionReduced);announce();});
 }
 function freeLook(){interact();}
 document.getElementById('look-sky').addEventListener('click',()=>{freeLook();if(zone==='temple')travel(eye.clone(),eye.clone().add(new T.Vector3(0,12,-3)));});
 const ray=new T.Raycaster(),mouse=new T.Vector2(),floorPlane=new T.Plane(new T.Vector3(0,1,0),0),floorPoint=new T.Vector3();
 function setRay(event){const r=host.getBoundingClientRect();mouse.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);}
 function hitAt(event){setRay(event);const picks=zone==='temple'?temple.portals.flatMap(p=>p.pickables):corridor.pickables;return ray.intersectObjects(picks,false).find(hit=>hit.object.visible&&hit.object.material?.opacity!==0);}
 function allowed(x,z){return zone==='temple'?walkway.allowed(x,z):Math.abs(x)<11.5&&z<=-16.9&&z>=-34-(corridor.diagnostics().total-1)*32-12;}
 function move(dx,dz){
  const x=eye.x+dx,z=eye.z+dz;if(allowed(x,eye.z))eye.x=x;if(allowed(eye.x,z))eye.z=z;
  if(zone==='temple'){const portal=walkway.portalAt(eye.x,eye.z);if(portal!==null){enter(portal);return;}}
  look();dirty=true;
 }
 host.addEventListener('pointerdown',e=>{if(e.button!==0)return;host.setPointerCapture(e.pointerId);down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};dragged=false;});
 host.addEventListener('pointermove',e=>{
  if(!down){host.style.cursor=hitAt(e)?'pointer':'grab';return;}
  const dx=e.clientX-down.lastX,dy=e.clientY-down.lastY;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;
  if(dragged){tween=null;freeLook();yaw-=dx*.004;pitch=T.MathUtils.clamp(pitch+dy*.003,-.85,1.45);look();dirty=true;}
  down.lastX=e.clientX;down.lastY=e.clientY;
 });
 host.addEventListener('pointerup',e=>{
  if(!down)return;down=null;if(dragged)return;const hit=hitAt(e);
  if(hit){const data=hit.object.userData;select(data.room,true,data.origin??null);return;}
  if(ray.ray.intersectPlane(floorPlane,floorPoint)&&allowed(floorPoint.x,floorPoint.z)){
   freeLook();const destination=new T.Vector3(floorPoint.x,1.65,floorPoint.z),direction=gaze.clone().sub(eye);
   travel(destination,destination.clone().add(direction),()=>{if(zone==='temple'){const portal=walkway.portalAt(eye.x,eye.z);if(portal!==null)enter(portal);}});
  }
 });
 host.addEventListener('pointercancel',()=>{down=null;});
 addEventListener('keydown',e=>{
  if(list||e.target.closest('input,textarea,select,[contenteditable=true],button,a'))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)){e.preventDefault();keys.add(e.key.toLowerCase());tween=null;freeLook();}
 });addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 const stick=document.getElementById('joystick'),knob=stick.querySelector('span');
 function stickMove(e){const r=stick.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/28,y=(e.clientY-r.top-r.height/2)/28;const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}joystick={x,y};knob.style.transform='translate('+x*23+'px,'+y*23+'px)';tween=null;freeLook();}
 stick.addEventListener('pointerdown',e=>{stick.setPointerCapture(e.pointerId);stickMove(e);});stick.addEventListener('pointermove',e=>{if(stick.hasPointerCapture(e.pointerId))stickMove(e);});
 stick.addEventListener('pointerup',stopStick);stick.addEventListener('pointercancel',stopStick);
 function syncAudio(){
  const proximity=zone==='temple'?Math.max(0,1-Math.min(...PORTALS.map(x=>Math.hypot(eye.x-x,eye.z+12)))/7):0;
  sound.update({zone,proximity,active:!hidden&&!list});
 }
 addEventListener('blur',()=>{stop();sound.update({zone,proximity:0,active:false});});
 addEventListener('pagehide',()=>{stop();sound.update({zone,proximity:0,active:false});renderer.setAnimationLoop(null);});
 document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden)stop();syncAudio();dirty=true;});
 function motionChanged(){
  motionReduced=reduced.matches;
  if(motionReduced){transition=null;flash.style.opacity='0';camera.fov=baseFov();camera.updateProjectionMatrix();
   if(tween){const completed=tween;eye.copy(completed.to);gaze.copy(completed.lookTo);tween=null;cameraAngles();completed.done?.();}}
  dirty=true;
 }
 reduced.addEventListener('change',motionChanged);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();sound.update({zone,proximity:0,active:false});renderer.setAnimationLoop(null);fallback();});
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=baseFov();camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);dirty=true;});
 document.getElementById('help').addEventListener('click',()=>{document.querySelector('.guide').style.opacity='1';});
 function animate(time){
  const elapsed=lastTime?(time-lastTime)/1000:0,dt=Math.min(elapsed,.05);lastTime=time;
  if(reduced.matches!==motionReduced)motionChanged();if(hidden||list){slowFrames=0;return;}
  if(frames>2&&(!motionReduced||tween)){slowFrames=elapsed>.09?slowFrames+1:0;if(slowFrames>=3&&renderer.getPixelRatio()>.65){renderer.setPixelRatio(Math.max(.65,renderer.getPixelRatio()*.6));slowFrames=0;dirty=true;}}
  if(tween){const current=tween,p=Math.min(1,(time-current.start)/current.duration),ease=p*p*(3-2*p),distance=current.lengths.at(-1)*ease;
   let segment=1;while(segment<current.path.length-1&&current.lengths[segment]<distance)segment++;
   const start=current.lengths[segment-1],length=current.lengths[segment]-start;
   eye.lerpVectors(current.path[segment-1],current.path[segment],length?(distance-start)/length:1);gaze.lerpVectors(current.lookFrom,current.lookTo,ease);dirty=true;
   if(p===1){tween=null;cameraAngles();current.done?.();}
  }
  if(!transition){
   const forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)-joystick.y;
   const side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joystick.x;
   if(forward||side){const length=Math.max(1,Math.hypot(forward,side)),speed=dt*2.6/length;move((-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed);}
  }
  if(transition){const progress=Math.min(1,(time-transition.start)/TRANSITION_MS);
   camera.fov=baseFov()+(transition.direction==='enter'?12:-3)*Math.sin(progress*Math.PI);camera.updateProjectionMatrix();
   flash.style.opacity=transition.direction==='return'?String(Math.sin(progress*Math.PI)*.3):'0';dirty=true;
   if(progress===1){transition=null;flash.style.opacity='0';camera.fov=baseFov();camera.updateProjectionMatrix();}
  }
  if(zone==='temple'){
   if(lisbonPreview.update(dt,!motionReduced))dirty=true;
   if(temple.update(dt,eye,!motionReduced))dirty=true;
   document.body.classList.toggle('temple-day',!!temple.diagnostics().day);
  }else{if(corridor.update(dt,eye,!motionReduced))dirty=true;if(!tween)announce();}
  syncAudio();camera.position.copy(eye);camera.lookAt(gaze);camera.updateMatrixWorld();
  if(dirty||!motionReduced){if(time-lastRender<(innerWidth<650?40:32))return;renderer.render(scene,camera);frames++;dirty=false;lastRender=time;}
 }
 renderer.setAnimationLoop(animate);
 addEventListener('pageshow',e=>{if(e.persisted){hidden=document.hidden;dirty=true;lastTime=0;syncAudio();renderer.setAnimationLoop(animate);}});
 return {visit,overview,explore,previous,invalidate(){corridor.invalidate();dirty=true;},setList(value){list=value;stop();syncAudio();dirty=true;},
  diagnostics:()=>({webgl:true,frames,zone,moving:!!tween||!!keys.size||!!joystick.x||!!joystick.y,position:[+eye.x.toFixed(2),+eye.z.toFixed(2)],playing:0,visible:!hidden&&!list,
   render:{pixelRatio:renderer.getPixelRatio(),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},
   transition:{active:!!transition,direction:transition?.direction??null,duration:TRANSITION_MS,fov:+camera.fov.toFixed(2),baseFov:baseFov()},
   temple:temple.diagnostics(),void:corridor.diagnostics(),audio:sound.diagnostics(),
   collection:{paper:{src:'/assets/gallery/totehmpaper.png',framed:true},origins:{total:ORIGINS.length}},
   navigation:{speed:2.6,spacing:32,minDuration:1450,maxDuration:4200}})};
}
