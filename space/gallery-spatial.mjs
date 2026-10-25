import * as T from './vendor/three-0.180.0.mjs';
import {createModernGallery} from './gallery-modern.mjs';
import {createTempleLandscape} from './gallery-temple-landscape.mjs';
import {createModernWalkway,createModernPhysics} from './gallery-modern-navigation.mjs';
import {GALLERY_LAYOUT as L,GALLERY_STATIONS} from './gallery-modern-layout.mjs';
import {createGalleryAudio} from './gallery-audio.mjs';
import {createLecternBook} from './gallery-lectern-book.mjs';
import {createGalleryFireplace} from './gallery-fireplace.mjs';
import {createFireAudio} from './gallery-fire-audio.mjs';
import {createPlayInstallation} from './gallery-play-installation.mjs';

const ENTRY=L.entry,LOOK=L.look,GROUND=L.groundY,HEIGHT=L.eyeHeight;
export async function createGallery({select,onOverview=()=>{},onStationState=()=>{},onArtwork=()=>{},interact=()=>{},fallback,reduced}){
 const host=document.getElementById('space'),mobile=innerWidth<650;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:1.75));renderer.setSize(innerWidth,innerHeight);
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 renderer.setClearColor(0x030912);renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(mobile?72:60,innerWidth/innerHeight,.08,9000);
 let dirty=true,frames=0,list=false,hidden=document.hidden,paused=false,lastTime=0,lastRender=0,slow=0;
 let motionReduced=reduced.matches,tween=null,arrival=null,pendingVisit=null,stellarView=null,room=-1,focused=-1,down=null,yaw=0,pitch=0,dragged=false,initialized=false,inspecting=false,inspectionAmount=0,bookDestination=null;
 let architecture=null,book=null,play=null,lastStationState='';
 const invalidate=()=>{dirty=true;};
 const landscape=createTempleLandscape(scene,renderer,{mobile,onChange:invalidate});
 architecture=createModernGallery(scene,renderer,{mobile,onChange:invalidate});
 book=createLecternBook(scene,{mobile,onChange:invalidate,onOpen:({href})=>{bookDestination=href;dirty=true;}});
 const fireplace=createGalleryFireplace(scene,{mobile,onChange:invalidate});
 play=createPlayInstallation(scene,{mobile,onChange:invalidate});
 const walkway=createModernWalkway(),physics=createModernPhysics({x:ENTRY[0],z:ENTRY[2]}),sound=createGalleryAudio(),fireSound=createFireAudio();
 const eye=new T.Vector3(...ENTRY),gaze=new T.Vector3(...LOOK),keys=new Set();
 const stick=document.getElementById('joystick'),knob=stick.querySelector('span');let joystick={x:0,y:0};
 const soundButton=document.getElementById('toggle-sound');
 const isFloor=()=>physics.diagnostics().grounded&&physics.position.y<GROUND+.2;
 const inGallery=()=>eye.x>-L.halfWidth&&eye.x<L.halfWidth&&eye.z<L.frontZ&&eye.z>L.backZ&&physics.position.y<L.height;
 const nearStation=index=>{const s=GALLERY_STATIONS[index];return!!s&&isFloor()&&Math.hypot(eye.x-s.approach[0],eye.z-s.approach[2])<1.2;};
 function stationState(){
  if(!initialized)return;
  const b=book.diagnostics(),p=play.diagnostics(),value={room,focused,book:b,play:p,moving:!!tween||!!pendingVisit};
  const signature=JSON.stringify([room,focused,!!tween,!!pendingVisit,b.closed,b.opening,b.opened,p.selectedSign,p.mediaState,p.active,p.view]);
  if(signature!==lastStationState){lastStationState=signature;onStationState(value);}
 }
 function angles(){const d=gaze.clone().sub(eye).normalize();yaw=Math.atan2(-d.x,-d.z);pitch=Math.asin(d.y);}
 function look(){gaze.copy(eye).add(new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)));}
 function stopStick(){joystick={x:0,y:0};knob.style.transform='';}
 function stopInput(){keys.clear();stopStick();down=null;}
 function pausePlayer(){play.setActive(false);}
 function cancelTravel(){tween=null;arrival=null;pendingVisit=null;stellarView=null;angles();}
 function leaveStation(){bookDestination=null;book.reset();inspecting=false;room=focused=-1;pausePlayer();stationState();}
 function free(){inspecting=false;cancelTravel();interact();}
 function soundState(){const muted=sound.diagnostics().muted;soundButton.textContent=muted?'Sound off':'Sound on';soundButton.setAttribute('aria-pressed',String(!muted));soundButton.setAttribute('aria-label',muted?'Turn sound on':'Turn sound off');}
 try{const muted=localStorage.getItem('space-sound-muted')==='true';sound.setMuted(muted);fireSound.setMuted(muted);}catch{}
 soundState();angles();
 function syncSound(){const distance=Math.hypot(eye.x,eye.z-L.frontZ,eye.y-1.65);sound.update({zone:physics.position.y>3000?'void':'temple',proximity:Math.max(0,1-distance/8),exposure:T.MathUtils.clamp((physics.position.y-GROUND)/10,0,1),active:!hidden&&!list&&!paused});const fireDistance=Math.hypot(eye.x-L.fireplace.position[0],eye.y-1,eye.z-L.fireplace.position[2]);fireSound.update({proximity:Math.max(0,1-fireDistance/13),active:!hidden&&!list&&!paused});}
 const unlock=e=>{if(e.isTrusted&&!list&&!hidden&&!paused){sound.unlock().catch(()=>{});fireSound.unlock().catch(()=>{});}};
 document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
 soundButton.addEventListener('click',()=>{sound.setMuted(!sound.diagnostics().muted);fireSound.setMuted(sound.diagnostics().muted);try{localStorage.setItem('space-sound-muted',String(sound.diagnostics().muted));}catch{}soundState();});
 function travel(position,target,done,{air=false}={}){
  const path=air?[eye.clone(),position]:walkway.route(eye,position);if(!path)return false;
  stopInput();interact();arrival=null;stellarView=null;
  if(motionReduced||Math.hypot(eye.x-position.x,eye.z-position.z)<.03){
   physics.relocateHorizontal(position);eye.set(physics.position.x,physics.position.y+HEIGHT,physics.position.z);gaze.copy(target);angles();tween=null;dirty=true;
   if(isFloor())done?.();else arrival={target:target.clone(),done};return true;
  }
  const points=path.map(p=>new T.Vector3(p.x,1.65,p.z)),lengths=[0];
  for(let n=1;n<points.length;n++)lengths.push(lengths[n-1]+points[n-1].distanceTo(points[n]));
  tween={points,lengths,segment:1,stalled:0,to:position,target,from:gaze.clone(),start:performance.now(),duration:Math.min(4200,Math.max(1450,lengths.at(-1)*110)),done,air};dirty=true;return true;
 }
 function groundedTravel(position,target,done){
  if(!isFloor()){
   const request={position,target,done};pendingVisit=request;
   return travel(new T.Vector3(...ENTRY),new T.Vector3(...LOOK),()=>{if(pendingVisit!==request)return;pendingVisit=null;travel(position,target,done);},{air:true});
  }
  return travel(position,target,done);
 }
 function focusStation(index){if(!nearStation(index))return;focused=room=index;inspecting=index===0;if(index===2)play.setActive(true);stationState();}
 function visit(index){
  const station=GALLERY_STATIONS[index];if(!station||list)return false;
  cancelTravel();pausePlayer();inspecting=false;room=index;focused=-1;
  const result=groundedTravel(new T.Vector3(...station.approach),new T.Vector3(...station.target),()=>focusStation(index));stationState();return result;
 }
 function enter(index=room){
  if(!GALLERY_STATIONS[index]||list)return false;
  if(!nearStation(index))return visit(index);
  focusStation(index);if(index===2)play.togglePlayback();if(index===1)book.open();dirty=true;stationState();return true;
 }
 function enterGallery(){cancelTravel();leaveStation();onOverview();return groundedTravel(new T.Vector3(...L.inside),new T.Vector3(...L.insideTarget));}
 function overview(){cancelTravel();leaveStation();onOverview();groundedTravel(new T.Vector3(...ENTRY),new T.Vector3(...LOOK));}
 function panorama(kind){cancelTravel();leaveStation();onOverview();const sea=kind==='sea';groundedTravel(new T.Vector3(sea?-13.6:13.6,1.65,8.4),new T.Vector3(sea?-700:600,sea?-75:-45,sea?-350:-800));}
 function visitFireplace(){cancelTravel();leaveStation();onOverview();return groundedTravel(new T.Vector3(...L.fireplace.approach),new T.Vector3(...L.fireplace.target));}
 function move(dt,dx=0,dz=0,guided=false){
  const before=eye.clone(),steps=Math.max(1,Math.ceil(dt/.025));
  for(let i=0;i<steps;i++)physics.step(dt/steps,{dx:dx/steps,dz:dz/steps,guided});
  eye.set(physics.position.x,physics.position.y+HEIGHT,physics.position.z);
  if(eye.distanceToSquared(before)>.000001){look();dirty=true;}
 }
 function jump(){if(list||hidden||paused)return false;const jumped=physics.jump();if(jumped){free();leaveStation();onOverview();stellarView={yaw,pitch,amount:0};dirty=true;}return jumped;}
 document.getElementById('jump').addEventListener('click',()=>{jump();host.focus({preventScroll:true});});
 const ray=new T.Raycaster(),mouse=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),-GROUND),floor=new T.Vector3();
 const pickables=[...architecture.pickables,...book.pickables,...play.pickables,...(fireplace.pickables||[])];
 function hit(event){
  const rect=host.getBoundingClientRect();mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);
  const hits=ray.intersectObjects(pickables,false).filter(h=>h.object.visible&&h.object.material?.opacity!==0&&(!h.object.userData.installation||play.acceptHit(h)));
  // Glass is deliberately transparent; opaque furniture/walls still occlude a
  // controller or page so it cannot be operated through the back of the room.
  const solid=ray.intersectObjects(architecture.solids||[],false).find(h=>h.object.visible&&!h.object.material?.transparent);
  return hits.find(h=>!solid||h.distance<=solid.distance+.055);
 }
 host.addEventListener('pointerdown',e=>{if(e.button!==0)return;host.focus({preventScroll:true});host.setPointerCapture(e.pointerId);down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY};dragged=false;});
 host.addEventListener('pointermove',e=>{
  if(!down){host.style.cursor=hit(e)?'pointer':'grab';return;}
  if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;
  if(dragged){free();yaw-=(e.clientX-down.lx)*.004;pitch=T.MathUtils.clamp(pitch+(e.clientY-down.ly)*.003,-1.55,1.35);look();dirty=true;}
  down.lx=e.clientX;down.ly=e.clientY;
 });
 host.addEventListener('pointerup',e=>{
  if(!down)return;down=null;if(dragged)return;
  const h=hit(e),data=h?.object.userData;
  if(data?.kind==='origins-book'){
   if(nearStation(1)){focusStation(1);book.interact(h);dirty=true;stationState();}else select(1);return;
  }
  if(data?.installation==='play'){
   if(nearStation(2)){focusStation(2);play.interact(h);dirty=true;stationState();}else select(2);return;
  }
  if(data?.kind==='fireplace'){visitFireplace();return;}
  if(data?.room!==undefined){if(data.room<0)enterGallery();else select(data.room);return;}
  if(ray.ray.intersectPlane(plane,floor)&&walkway.allowed(floor.x,floor.z)&&floor.distanceTo(eye)<50){
   const solid=ray.intersectObjects(architecture.solids||[],false).find(h=>h.object.visible&&!h.object.material?.transparent);
   if(solid&&solid.distance<floor.distanceTo(eye)-.2)return;
   const destination=new T.Vector3(floor.x,1.65,floor.z),direction=gaze.clone().sub(eye);free();leaveStation();onOverview();groundedTravel(destination,destination.clone().add(direction));
  }
 });
 host.addEventListener('pointercancel',()=>{down=null;});
 document.addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea,select,[contenteditable=true]')||list||hidden||paused)return;
  const interactive=!!e.target.closest('button,a,summary,[role=button]');
  if(focused===2&&nearStation(2)&&!interactive&&play.handleKey(e)){e.preventDefault();dirty=true;stationState();return;}
  if(focused===1&&nearStation(1)&&!interactive&&e.key==='Enter'){e.preventDefault();book.open();dirty=true;return;}
  if(e.key==='Escape'){cancelTravel();leaveStation();onOverview();return;}
  if(e.code==='Space'||e.key===' '){if(!interactive){e.preventDefault();if(!e.repeat)jump();}return;}
  if(interactive)return;
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())){e.preventDefault();free();keys.add(e.key.toLowerCase());}
 });
 document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 function stickMove(e){const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.max(22,Math.hypot(dx,dy));joystick={x:dx/len,y:dy/len};knob.style.transform=`translate(${joystick.x*22}px,${joystick.y*22}px)`;}
 stick.addEventListener('pointerdown',e=>{e.preventDefault();stick.setPointerCapture(e.pointerId);free();stickMove(e);});
 stick.addEventListener('pointermove',e=>{if(stick.hasPointerCapture(e.pointerId))stickMove(e);});stick.addEventListener('pointerup',stopStick);stick.addEventListener('pointercancel',stopStick);
 document.getElementById('look-sky').addEventListener('click',()=>{free();pitch=.75;look();dirty=true;});
 document.getElementById('help').addEventListener('click',()=>document.querySelector('.guide').classList.toggle('is-help'));
 document.getElementById('visit-fireplace').addEventListener('click',visitFireplace);
 document.getElementById('look-sea').addEventListener('click',()=>panorama('sea'));document.getElementById('look-horizon').addEventListener('click',()=>panorama('horizon'));
 function pause(){stopInput();paused=true;bookDestination=null;book.reset();pausePlayer();syncSound();stationState();}
 addEventListener('blur',pause);addEventListener('focus',()=>{paused=false;lastTime=0;syncSound();});
 document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden){stopInput();bookDestination=null;book.reset();pausePlayer();}syncSound();dirty=true;lastTime=0;stationState();});
 function motionChanged(){
  motionReduced=reduced.matches;
  if(motionReduced){stellarView=null;if(tween){const t=tween;tween=null;physics.relocateHorizontal(t.to);eye.set(physics.position.x,physics.position.y+HEIGHT,physics.position.z);gaze.copy(t.target);angles();if(isFloor())t.done?.();else arrival={target:t.target.clone(),done:t.done};}}
  dirty=true;
 }
 reduced.addEventListener('change',motionChanged);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();renderer.setAnimationLoop(null);fallback();});
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);dirty=true;});
 function viewTarget(){return gaze.clone().lerp(new T.Vector3(...L.counter.target),inspectionAmount);}
 function animate(now){
  const elapsed=lastTime?(now-lastTime)/1000:0,dt=Math.min(elapsed,.05),physicsDt=Math.min(elapsed,.5);lastTime=now;
  if(reduced.matches!==motionReduced)motionChanged();if(list||hidden||paused){slow=0;return;}
  if(frames>2&&(!motionReduced||tween||!physics.diagnostics().grounded||keys.size||joystick.x||joystick.y)){slow=elapsed>.09?slow+1:0;if(slow>=3&&renderer.getPixelRatio()>.65){renderer.setPixelRatio(Math.max(.65,renderer.getPixelRatio()*.75));slow=0;dirty=true;}}
  const guiding=!!tween;
  if(tween){
   const t=tween,p=T.MathUtils.clamp((now-t.start)/t.duration,0,1),ease=p*p*(3-2*p),i=t.segment,distance=Math.min(t.lengths.at(-1)*ease,t.lengths[i]),length=t.lengths[i]-t.lengths[i-1];
   const point=new T.Vector3().lerpVectors(t.points[i-1],t.points[i],length?T.MathUtils.clamp((distance-t.lengths[i-1])/length,0,1):1),before=eye.clone();
   move(physicsDt,point.x-eye.x,point.z-eye.z,true);
   t.stalled=before.distanceToSquared(eye)<.000001&&Math.hypot(point.x-eye.x,point.z-eye.z)>.08?t.stalled+physicsDt:0;
   if(t.segment<t.points.length-1&&Math.hypot(eye.x-t.points[i].x,eye.z-t.points[i].z)<.04)t.segment++;
   gaze.lerpVectors(t.from,t.target,ease);dirty=true;
   if(p===1&&Math.hypot(eye.x-t.to.x,eye.z-t.to.z)<.08&&(isFloor()||t.air)){
    tween=null;angles();if(isFloor())t.done?.();else arrival={target:t.target.clone(),done:t.done};
   }else if(t.stalled>2.5){tween=null;pendingVisit=null;angles();}
  }
  if(!guiding){
   const forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)-joystick.y,side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joystick.x;
   const speed=physicsDt*2.6/Math.max(1,Math.hypot(forward,side));move(physicsDt,(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed);
  }
  if(stellarView){const s=stellarView;s.amount=T.MathUtils.smoothstep(physics.position.y-GROUND,200,5000);if(!motionReduced){yaw=s.yaw;pitch=T.MathUtils.lerp(s.pitch,-1.52,s.amount);look();dirty=true;}if(physics.diagnostics().grounded){if(!motionReduced){yaw=s.yaw;pitch=s.pitch;look();}stellarView=null;}}
  if(arrival&&isFloor()){const a=arrival;arrival=null;gaze.copy(a.target);angles();a.done?.();dirty=true;}
  if(focused>=0&&!nearStation(focused)){leaveStation();onOverview();}
  const altitude=Math.max(0,eye.y-1.65),near=T.MathUtils.clamp(altitude*.002,.08,12),far=altitude>100?100000:9000;
  if(Math.abs(camera.near-near)>.0001||camera.far!==far){camera.near=near;camera.far=far;camera.updateProjectionMatrix();dirty=true;}
  const changes=[landscape.update(dt,eye,!motionReduced),architecture.update(dt,eye,!motionReduced),book.update(dt,eye,!motionReduced),play.update(dt,eye,!motionReduced),fireplace.update(dt,eye,!motionReduced)];
  if(changes.some(Boolean))dirty=true;
  // A closer view reveals the intentionally tiny perforated paper tabs.
  const inspectionTarget=inspecting&&focused===0?1:0;
  const nextInspection=motionReduced?inspectionTarget:T.MathUtils.damp(inspectionAmount,inspectionTarget,7,dt);
  if(Math.abs(nextInspection-inspectionAmount)>.0001){inspectionAmount=nextInspection;dirty=true;}else if(inspectionAmount!==inspectionTarget){inspectionAmount=inspectionTarget;dirty=true;}
  const targetFov=(mobile?(focused===2?88:72):60)-(mobile?16:10)*inspectionAmount;
  if(Math.abs(camera.fov-targetFov)>.001){camera.fov=motionReduced?targetFov:T.MathUtils.damp(camera.fov,targetFov,7,dt);camera.updateProjectionMatrix();dirty=true;}
  if(dirty&&now-lastRender>=(mobile?40:32)){
   camera.position.copy(eye).add(new T.Vector3(0,.28,-.18).multiplyScalar(inspectionAmount));
   camera.lookAt(viewTarget());camera.updateMatrixWorld();renderer.render(scene,camera);frames++;dirty=false;lastRender=now;
   if(bookDestination){const href=bookDestination;sound.transition('enter');requestAnimationFrame(()=>{if(bookDestination===href){bookDestination=null;location.assign(href);}});}
  }
  syncSound();stationState();
 }
 landscape.update(0,eye,false);architecture.update(0,eye,false);book.update(0,eye,!motionReduced);play.update(0,eye,!motionReduced);fireplace.update(0,eye,false);
 camera.position.copy(eye);camera.lookAt(gaze);camera.updateMatrixWorld();initialized=true;stationState();renderer.setAnimationLoop(animate);
 addEventListener('pagehide',()=>{pause();renderer.setAnimationLoop(null);});
 addEventListener('pageshow',e=>{if(e.persisted){paused=false;hidden=document.hidden;bookDestination=null;book.reset();dirty=true;lastTime=0;syncSound();renderer.setAnimationLoop(animate);}});
 function stationAction(index,action,value){
  if(list||hidden||paused||focused!==index||!nearStation(index))return false;
  let result=false;
  if(index===1)result=book.open();
  if(index===2){play.setActive(true);result=action==='sign'?play.activateSign(value):action==='next'?play.nextSign(1):action==='previous'?play.nextSign(-1):action==='cover'?play.showCover():play.togglePlayback();}
  dirty=true;stationState();return result;
 }
 return{visit,enter,enterGallery,overview,panorama,visitFireplace,stationAction,invalidate,
  leaveStation(){stopInput();cancelTravel();leaveStation();onOverview();dirty=true;},
  stop(){stopInput();cancelTravel();leaveStation();dirty=true;},
  setList(value){list=!!value;stopInput();cancelTravel();leaveStation();syncSound();dirty=true;lastTime=0;},
  diagnostics:()=>({webgl:true,zone:inGallery()?'gallery':'terrace',room,focused,frames,position:[+eye.x.toFixed(2),+eye.z.toFixed(2)],moving:!!tween||!!pendingVisit||!!keys.size||!!joystick.x||!!joystick.y||!physics.diagnostics().grounded,visible:!hidden&&!list&&!paused,
   camera:{position:camera.position.toArray(),target:viewTarget().toArray(),inspection:inspectionAmount,fov:camera.fov,aspect:camera.aspect,near:camera.near,far:camera.far,stellarOverview:!!stellarView&&!motionReduced,overviewAmount:stellarView?.amount??0},physics:physics.diagnostics(),temple:architecture.diagnostics(),stations:{play:play.diagnostics(),book:book.diagnostics()},landscape:landscape.diagnostics(),audio:sound.diagnostics(),fireAudio:fireSound.diagnostics(),fireplace:fireplace.diagnostics(),render:{pixelRatio:renderer.getPixelRatio(),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},navigation:{speed:2.6,minDuration:1450,maxDuration:4200,deferredArrival:!!arrival||!!pendingVisit,...walkway.diagnostics()}})};
}
