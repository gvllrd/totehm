import * as T from './vendor/three-0.180.0.mjs';
import {createModernGallery} from './gallery-modern.mjs';
import {createTempleLandscape} from './gallery-temple-landscape.mjs';
import {createModernWalkway,createModernPhysics} from './gallery-modern-navigation.mjs';
import {GALLERY_LAYOUT as LISBON_LAYOUT,GALLERY_STATIONS} from './gallery-modern-layout.mjs';
import {createGalleryAudio} from './gallery-audio.mjs';
import {createLecternBook} from './gallery-lectern-book.mjs';
import {createGalleryFireplace} from './gallery-fireplace.mjs';
import {createFireAudio} from './gallery-fire-audio.mjs';
import {createPlayInstallation} from './gallery-play-installation.mjs';
import {createOppositeInstallation} from './gallery-opposite-installation.mjs';
import {createStonerInstallation} from './gallery-stoner-installation.mjs';
import {createRenderQuality} from './gallery-render-quality.mjs';
import {glassRoofHeight} from './gallery-glass-shell.mjs';

export async function createGallery({place='lisbon',select,onOverview=()=>{},onStationState=()=>{},onArtwork=()=>{},interact=()=>{},fallback,reduced}){
 const newYork=place==='new-york';
 const ny=newYork?await Promise.all([import('./gallery-new-york.mjs'),import('./gallery-new-york-navigation.mjs'),import('./gallery-new-york-layout.mjs'),import('./gallery-liberty.mjs')]):null;
 const L=newYork?ny[2].NEW_YORK_LAYOUT:LISBON_LAYOUT;
 const ENTRY=L.entry,LOOK=L.look,GROUND=L.groundY,HEIGHT=L.eyeHeight;
 const ceiling=(x,z)=>newYork?ny[2].newYorkRoofHeight(x,z):glassRoofHeight(x,z);
 const host=document.getElementById('space'),mobile=innerWidth<650||(matchMedia('(pointer: coarse)').matches&&Math.min(innerWidth,innerHeight)<650);
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 const quality=createRenderQuality({mobile,pixelRatio:devicePixelRatio});
 renderer.setPixelRatio(quality.diagnostics().pixelRatio);renderer.setSize(innerWidth,innerHeight);
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 renderer.setClearColor(0x030912);renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 const baseFov=newYork?(mobile?78:72):(mobile?72:60);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(baseFov,innerWidth/innerHeight,.08,9000);
 let dirty=true,frames=0,list=false,hidden=document.hidden,paused=false,lastTime=0,lastRender=0;
 let motionReduced=reduced.matches,tween=null,arrival=null,pendingVisit=null,stellarView=null,room=-1,focused=-1,down=null,yaw=0,pitch=0,dragged=false,initialized=false,inspecting=false,inspectionAmount=0,bookDestination=null;
 let architecture=null,book=null,play=null,stoner=null,opposite=null,lastStationState='',libertyViewClear=null;
 const invalidate=()=>{dirty=true;};
 const landscape=createTempleLandscape(scene,renderer,{mobile,onChange:invalidate});
 architecture=(newYork?ny[0].createNewYorkGallery:createModernGallery)(scene,renderer,{mobile,onChange:invalidate});
 const liberty=newYork?ny[3].createLiberty(scene,{mobile,onChange:invalidate}):null;
 book=createLecternBook(scene,{mobile,onChange:invalidate,onOpen:({href})=>{bookDestination=href;dirty=true;}});
 const fireplace=createGalleryFireplace(scene,{mobile,onChange:invalidate,...(newYork?{smokeOutlet:L.smokeOutlet}:{})});
 function openExperience({href}){
  // Navigation releases the world instead of leaving its GPU/audio behind an
  // iframe. Independent pages retain their own controls, pixels and access.
  if(!['/get_higher','/play_lisbon_street','/same_but_opposite'].includes(href))return false;
  pause();sound.setMuted(true);fireSound.setMuted(true);renderer.setAnimationLoop(null);location.assign(href);return true;
 }
 play=createPlayInstallation(scene,{mobile,onChange:invalidate,onOpen:openExperience});
 stoner=createStonerInstallation(scene,{mobile,onChange:invalidate,onOpen:openExperience});
 opposite=createOppositeInstallation(scene,{mobile,onChange:invalidate,onOpen:openExperience});
 const walkway=(newYork?ny[1].createNewYorkWalkway:createModernWalkway)(),physics=(newYork?ny[1].createNewYorkPhysics:createModernPhysics)({x:ENTRY[0],z:ENTRY[2]}),sound=createGalleryAudio(),fireSound=createFireAudio();
 const eye=new T.Vector3(...ENTRY),gaze=new T.Vector3(...LOOK),keys=new Set();
 const stick=document.getElementById('joystick'),knob=stick.querySelector('span');let joystick={x:0,y:0};
 const isFloor=()=>physics.diagnostics().grounded&&(newYork?!physics.diagnostics().onRoof:physics.position.y<GROUND+.2);
 const inGallery=()=>eye.x>-L.halfWidth&&eye.x<L.halfWidth&&eye.z<L.frontZ&&eye.z>L.backZ&&eye.y<ceiling(eye.x,eye.z);
 const nearStation=index=>{const s=GALLERY_STATIONS[index];return!!s&&isFloor()&&physics.position.y<GROUND+.2&&Math.hypot(eye.x-s.approach[0],eye.z-s.approach[2])<1.2;};
 function stationState(){
  if(!initialized)return;
  const b=book.diagnostics(),p=play.diagnostics(),s=stoner.diagnostics(),o=opposite.diagnostics(),value={room,focused,book:b,play:p,stoner:s,opposite:o,moving:!!tween||!!pendingVisit};
  const signature=JSON.stringify([room,focused,!!tween,!!pendingVisit,b.closed,b.opening,b.opened,p.active,s.active,o.active]);
  if(signature!==lastStationState){lastStationState=signature;onStationState(value);}
 }
 function angles(){const d=gaze.clone().sub(eye).normalize();yaw=Math.atan2(-d.x,-d.z);pitch=Math.asin(d.y);}
 function look(){gaze.copy(eye).add(new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)));}
 function stopStick(){joystick={x:0,y:0};knob.style.transform='';}
 function stopInput(){keys.clear();stopStick();down=null;}
 function resetPortals(){play.setActive(false);stoner.setActive(false);opposite.setActive(false);}
 function cancelTravel(){tween=null;arrival=null;pendingVisit=null;stellarView=null;angles();}
 function leaveStation(){bookDestination=null;book.reset();inspecting=false;room=focused=-1;resetPortals();stationState();}
 function free(){inspecting=false;cancelTravel();interact();}
 try{const muted=localStorage.getItem('space-sound-muted')==='true';sound.setMuted(muted);fireSound.setMuted(muted);}catch{}
 angles();
 function syncSound(){
  const active=!hidden&&!list&&!paused,distance=Math.hypot(eye.x,eye.z-L.frontZ,eye.y-1.65);
  const shelter=T.MathUtils.smoothstep(L.frontZ-eye.z,0,4)*T.MathUtils.smoothstep(L.halfWidth-Math.abs(eye.x),0,1.1)*T.MathUtils.smoothstep(eye.z-L.backZ,0,.8)*(1-T.MathUtils.smoothstep(eye.y,ceiling(eye.x,eye.z)-.8,ceiling(eye.x,eye.z)+.3));
  sound.update({zone:physics.position.y>3000?'void':'temple',proximity:Math.max(0,1-distance/8),exposure:T.MathUtils.clamp((physics.position.y-GROUND)/10,0,1),shelter,active});
  const fireDistance=Math.hypot(eye.x-L.fireplace.position[0],eye.y-1,eye.z-L.fireplace.position[2]);
  const fireX=L.fireplace.position[0]-eye.x,fireZ=L.fireplace.position[2]-eye.z;
  const pan=T.MathUtils.clamp((fireX*Math.cos(yaw)-fireZ*Math.sin(yaw))/Math.max(.01,Math.hypot(fireX,fireZ)),-1,1)*.65;
  fireSound.update({proximity:Math.max(0,1-fireDistance/13),pan,active});
 }
 const unlock=e=>{if(e.isTrusted&&!list&&!hidden&&!paused){sound.unlock().catch(()=>{});fireSound.unlock().catch(()=>{});}};
 document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
 function travel(position,target,done,{air=false}={}){
  const path=air?[eye.clone(),position]:walkway.route(eye,position);if(!path)return false;
  stopInput();interact();arrival=null;stellarView=null;
  if(motionReduced||eye.distanceTo(position)<.03){
   physics.relocateHorizontal(position);eye.set(physics.position.x,physics.position.y+HEIGHT,physics.position.z);gaze.copy(target);angles();tween=null;dirty=true;
   if(isFloor())done?.();else arrival={target:target.clone(),done};return true;
  }
  const points=path.map(p=>new T.Vector3(p.x,newYork?p.y:1.65,p.z)),lengths=[0];
  for(let n=1;n<points.length;n++)lengths.push(lengths[n-1]+points[n-1].distanceTo(points[n]));
  tween={points,lengths,segment:1,stalled:0,to:position,target,from:gaze.clone(),start:performance.now(),duration:Math.min(newYork?18000:4200,Math.max(1450,lengths.at(-1)*110)),done,air};dirty=true;return true;
 }
 function groundedTravel(position,target,done){
  if(!isFloor()){
   const request={position,target,done};pendingVisit=request;
   return travel(new T.Vector3(...ENTRY),new T.Vector3(...LOOK),()=>{if(pendingVisit!==request)return;pendingVisit=null;travel(position,target,done);},{air:true});
  }
  return travel(position,target,done);
 }
 function focusStation(index){if(!nearStation(index))return;focused=room=index;inspecting=index===0;if(index===2)play.setActive(true);if(index===3)stoner.setActive(true);if(index===4)opposite.setActive(true);stationState();}
 function visit(index){
  const station=GALLERY_STATIONS[index];if(!station||list)return false;
  cancelTravel();resetPortals();inspecting=false;room=index;focused=-1;
  const result=groundedTravel(new T.Vector3(...station.approach),new T.Vector3(...station.target),()=>focusStation(index));stationState();return result;
 }
 function enter(index=room){
  if(!GALLERY_STATIONS[index]||list)return false;
  if(!nearStation(index))return visit(index);
  focusStation(index);if(index===2)play.open();else if(index===3)stoner.open();else if(index===4)opposite.open();else if(index===1)book.open();else openExperience({href:'/get_higher'});dirty=true;stationState();return true;
 }
 function enterGallery(){cancelTravel();leaveStation();onOverview();return groundedTravel(new T.Vector3(...L.inside),new T.Vector3(...L.insideTarget));}
 function overview(){cancelTravel();leaveStation();onOverview();groundedTravel(new T.Vector3(...ENTRY),new T.Vector3(...LOOK));}
 function visitFireplace(){cancelTravel();leaveStation();onOverview();return groundedTravel(new T.Vector3(...L.fireplace.approach),new T.Vector3(...L.fireplace.target));}
 function visitLevel(level){
  if(!newYork||list||!Number.isInteger(level)||!ny[2].NEW_YORK_LANDINGS[level])return false;
  const landing=ny[2].NEW_YORK_LANDINGS[level],position=new T.Vector3(landing.x,landing.y+HEIGHT,landing.z);
  cancelTravel();leaveStation();onOverview();return groundedTravel(position,new T.Vector3(0,position.y,-8));
 }
 function visitLiberty(){
  if(!newYork||list)return false;
  const target=new T.Vector3(76,-82,-48),rock=['Limestone summit beneath the temple','Rock crown tucked beneath the ancient steps'].map(name=>landscape.root?.getObjectByName(name)).filter(Boolean);
  scene.updateMatrixWorld(true);
  // The summit flares below the pavement. Use a real upper-gallery view,
  // checking the masonry, floor slabs and rock rather than aiming through it.
  const position=new T.Vector3(12.7,ny[2].NEW_YORK_FLOORS[3]+HEIGHT,-4.7);
  const samples=[target,...[70,82].flatMap(x=>[-95.1,-75.9].flatMap(y=>[-53,-43].map(z=>new T.Vector3(x,y,z)))),new T.Vector3(76,-64,-48),new T.Vector3(62,-43,-66)];
  const blockers=[...architecture.solids.filter(o=>!o.material?.transparent),...rock];
  const clear=samples.every(point=>!new T.Raycaster(position,point.clone().sub(position).normalize(),.05,position.distanceTo(point)).intersectObjects(blockers,false).length);
  libertyViewClear=clear;if(!clear)return false;
  cancelTravel();leaveStation();onOverview();return groundedTravel(position,target);
 }
 function move(dt,dx=0,dz=0,guided=false){
  const before=eye.clone(),steps=Math.max(1,Math.ceil(dt/.025));
  for(let i=0;i<steps;i++)physics.step(dt/steps,{dx:dx/steps,dz:dz/steps,guided});
  eye.set(physics.position.x,physics.position.y+HEIGHT,physics.position.z);
  if(eye.distanceToSquared(before)>.000001){look();dirty=true;}
 }
 function jump(){if(list||hidden||paused)return false;const jumped=physics.jump();if(jumped){free();leaveStation();onOverview();stellarView={yaw,pitch,amount:0};dirty=true;}return jumped;}
 const ray=new T.Raycaster(),mouse=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),-GROUND),floor=new T.Vector3();
 const pickables=[...architecture.pickables,...book.pickables,...play.pickables,...stoner.pickables,...opposite.pickables,...(fireplace.pickables||[])];
 function hit(event){
  const rect=host.getBoundingClientRect();mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);
  const hits=ray.intersectObjects(pickables,false).filter(h=>h.object.visible&&h.object.material?.opacity!==0&&(!h.object.userData.installation||play.acceptHit(h)||stoner.acceptHit(h)||opposite.acceptHit(h)));
  // Glass is deliberately transparent; opaque furniture/walls still occlude a
  // portal or book so it cannot be operated through the back of the room.
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
   play.interact(h);return;
  }
  if(data?.installation==='opposite'){opposite.interact(h);return;}
  if(data?.installation==='stoner'){
   stoner.interact(h);return;
  }
  if(data?.kind==='fireplace'){visitFireplace();return;}
  if(data?.room!==undefined){if(data.room<0)enterGallery();else select(data.room);return;}
  const surface=newYork?ray.intersectObjects(architecture.walkable||[],false).find(h=>h.face&&h.face.normal.clone().transformDirection(h.object.matrixWorld).y>.1):null;
  const onFloor=newYork?!!surface:!!ray.ray.intersectPlane(plane,floor);
  if(surface)floor.copy(surface.point);
  if(onFloor&&walkway.allowed(floor.x,floor.z,newYork?floor.y:undefined)&&floor.distanceTo(eye)<50){
   const solid=ray.intersectObjects(architecture.solids||[],false).find(h=>h.object.visible&&!h.object.material?.transparent);
   if(solid&&solid.distance<floor.distanceTo(eye)-.2)return;
   const destination=new T.Vector3(floor.x,newYork?floor.y+HEIGHT:1.65,floor.z),direction=gaze.clone().sub(eye);free();leaveStation();onOverview();groundedTravel(destination,destination.clone().add(direction));
  }
 });
 host.addEventListener('pointercancel',()=>{down=null;});
 document.addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea,select,[contenteditable=true]')||list||hidden||paused)return;
  const interactive=!!e.target.closest('button,a,summary,[role=button]');
  if(focused===2&&nearStation(2)&&!interactive&&play.handleKey(e)){e.preventDefault();dirty=true;stationState();return;}
  if(focused===4&&nearStation(4)&&!interactive&&opposite.handleKey(e)){e.preventDefault();dirty=true;stationState();return;}
  if(focused===3&&nearStation(3)&&!interactive&&stoner.handleKey(e)){e.preventDefault();dirty=true;stationState();return;}
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
 function pause(){stopInput();paused=true;bookDestination=null;book.reset();resetPortals();quality.reset();syncSound();stationState();}
 addEventListener('blur',pause);addEventListener('focus',()=>{paused=false;lastTime=0;quality.reset();syncSound();});
 document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden){stopInput();bookDestination=null;book.reset();resetPortals();}syncSound();dirty=true;lastTime=0;stationState();});
 function motionChanged(){
  motionReduced=reduced.matches;
  if(motionReduced){stellarView=null;if(tween){const t=tween;tween=null;physics.relocateHorizontal(t.to);eye.set(physics.position.x,physics.position.y+HEIGHT,physics.position.z);gaze.copy(t.target);angles();if(isFloor())t.done?.();else arrival={target:t.target.clone(),done:t.done};}}
  dirty=true;
 }
 reduced.addEventListener('change',motionChanged);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();renderer.setAnimationLoop(null);fallback();});
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(quality.resize(devicePixelRatio));renderer.setSize(innerWidth,innerHeight);dirty=true;});
 function viewTarget(){return gaze.clone().lerp(new T.Vector3(...L.counter.target),inspectionAmount);}
 function animate(now){
  const elapsed=lastTime?(now-lastTime)/1000:0,dt=Math.min(elapsed,.05),physicsDt=Math.min(elapsed,.5);lastTime=now;
  if(reduced.matches!==motionReduced)motionChanged();if(list||hidden||paused)return;
  const guiding=!!tween;
  if(tween){
   const t=tween,p=T.MathUtils.clamp((now-t.start)/t.duration,0,1),ease=p*p*(3-2*p),i=t.segment,distance=Math.min(t.lengths.at(-1)*ease,t.lengths[i]),length=t.lengths[i]-t.lengths[i-1];
   const point=new T.Vector3().lerpVectors(t.points[i-1],t.points[i],length?T.MathUtils.clamp((distance-t.lengths[i-1])/length,0,1):1),before=eye.clone();
   move(physicsDt,point.x-eye.x,point.z-eye.z,true);
   t.stalled=before.distanceToSquared(eye)<.000001&&Math.hypot(point.x-eye.x,point.z-eye.z)>.08?t.stalled+physicsDt:0;
   if(t.segment<t.points.length-1&&(newYork?eye.distanceTo(t.points[i]):Math.hypot(eye.x-t.points[i].x,eye.z-t.points[i].z))<.04)t.segment++;
   gaze.lerpVectors(t.from,t.target,ease);dirty=true;
   if(p===1&&(newYork?eye.distanceTo(t.to):Math.hypot(eye.x-t.to.x,eye.z-t.to.z))<.08&&(isFloor()||t.air)){
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
  const changes=[landscape.update(dt,eye,!motionReduced),architecture.update(dt,eye,!motionReduced),book.update(dt,eye,!motionReduced),play.update(dt,eye,!motionReduced),stoner.update(dt,eye,!motionReduced),opposite.update(dt,eye,!motionReduced),fireplace.update(dt,eye,!motionReduced),liberty?.update(dt,eye,!motionReduced)];
  if(changes.some(Boolean))dirty=true;
  // A closer view reveals the intentionally tiny perforated paper tabs.
  const inspectionTarget=inspecting&&focused===0?1:0;
  const nextInspection=motionReduced?inspectionTarget:T.MathUtils.damp(inspectionAmount,inspectionTarget,7,dt);
  if(Math.abs(nextInspection-inspectionAmount)>.0001){inspectionAmount=nextInspection;dirty=true;}else if(inspectionAmount!==inspectionTarget){inspectionAmount=inspectionTarget;dirty=true;}
  const targetFov=(mobile&&(focused===2||focused===4)?88:baseFov)-(mobile?16:10)*inspectionAmount;
  if(Math.abs(camera.fov-targetFov)>.001){camera.fov=motionReduced?targetFov:T.MathUtils.damp(camera.fov,targetFov,7,dt);camera.updateProjectionMatrix();dirty=true;}
  if(dirty&&now-lastRender>=32){
   camera.position.copy(eye).add(new T.Vector3(0,.28,-.18).multiplyScalar(inspectionAmount));
   camera.lookAt(viewTarget());camera.updateMatrixWorld();const renderStart=performance.now();renderer.render(scene,camera);const renderMs=performance.now()-renderStart;frames++;dirty=false;lastRender=now;
   const ratio=quality.sample(now,{frameMs:elapsed*1000,renderMs});if(ratio!==renderer.getPixelRatio()){renderer.setPixelRatio(ratio);dirty=true;}
   if(bookDestination){const href=bookDestination;sound.transition('enter');requestAnimationFrame(()=>{if(bookDestination===href){bookDestination=null;location.assign(href);}});}
  }
  syncSound();stationState();
 }
 landscape.update(0,eye,false);architecture.update(0,eye,false);book.update(0,eye,!motionReduced);play.update(0,eye,!motionReduced);fireplace.update(0,eye,false);
 camera.position.copy(eye);camera.lookAt(gaze);camera.updateMatrixWorld();initialized=true;stationState();renderer.setAnimationLoop(animate);
 addEventListener('pagehide',()=>{pause();renderer.setAnimationLoop(null);});
 addEventListener('pageshow',e=>{if(e.persisted){paused=false;hidden=document.hidden;bookDestination=null;book.reset();resetPortals();quality.reset();try{const muted=localStorage.getItem('space-sound-muted')==='true';sound.setMuted(muted);fireSound.setMuted(muted);}catch{}dirty=true;lastTime=0;syncSound();renderer.setAnimationLoop(animate);}});
 return{visit,enter,enterGallery,overview,visitFireplace,visitLevel,visitLiberty,invalidate,
  leaveStation(){stopInput();cancelTravel();leaveStation();onOverview();dirty=true;},
  stop(){stopInput();cancelTravel();leaveStation();dirty=true;},
  setList(value){list=!!value;stopInput();cancelTravel();leaveStation();syncSound();dirty=true;lastTime=0;},
  diagnostics:()=>({webgl:true,place:newYork?'new-york':'lisbon',zone:inGallery()?'gallery':'terrace',room,focused,frames,position:[+eye.x.toFixed(2),+eye.z.toFixed(2)],moving:!!tween||!!pendingVisit||!!keys.size||!!joystick.x||!!joystick.y||!physics.diagnostics().grounded,visible:!hidden&&!list&&!paused,liberty:liberty?{...liberty.diagnostics(),viewClear:libertyViewClear}:null,
   camera:{position:camera.position.toArray(),target:viewTarget().toArray(),inspection:inspectionAmount,fov:camera.fov,aspect:camera.aspect,near:camera.near,far:camera.far,stellarOverview:!!stellarView&&!motionReduced,overviewAmount:stellarView?.amount??0},physics:physics.diagnostics(),temple:architecture.diagnostics(),stations:{play:play.diagnostics(),stoner:stoner.diagnostics(),opposite:opposite.diagnostics(),book:book.diagnostics()},landscape:landscape.diagnostics(),audio:sound.diagnostics(),fireAudio:fireSound.diagnostics(),fireplace:fireplace.diagnostics(),render:{...quality.diagnostics(),width:renderer.domElement.width,height:renderer.domElement.height,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},navigation:{speed:2.6,minDuration:1450,maxDuration:newYork?18000:4200,deferredArrival:!!arrival||!!pendingVisit,...walkway.diagnostics()}})};
}
