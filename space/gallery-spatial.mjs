import {expandOriginsBook} from './gallery-book-expansion.mjs';
import * as T from './vendor/three-0.180.0.mjs';
import {createModernGallery} from './gallery-modern.mjs';
import {createTempleLandscape} from './gallery-temple-landscape.mjs';
import {createModernWalkway,createModernPhysics} from './gallery-modern-navigation.mjs';
import {LISBON_URBEX_LAYOUT as LISBON_LAYOUT,LISBON_URBEX_STATIONS,LISBON_HOLOGRAM_SIGNS} from './gallery-lisbon-urbex-layout.mjs';
import {GALLERY_STATIONS as NEW_YORK_STATIONS} from './gallery-modern-layout.mjs';
import {createGalleryAudio} from './gallery-audio.mjs';
import {createLecternBook} from './gallery-lectern-book.mjs';
import {createGalleryFireplace} from './gallery-fireplace.mjs';
import {createFireAudio} from './gallery-fire-audio.mjs';
import {createPlayInstallation} from './gallery-play-installation.mjs';
import {createOppositeInstallation} from './gallery-opposite-installation.mjs';
import {createRenderQuality} from './gallery-render-quality.mjs';
import {glassRoofHeight} from './gallery-glass-shell.mjs';
import {createOriginsVessel} from './gallery-origins-vessel.mjs';
import {createSaucerCockpit} from './gallery-black-hole.mjs';
import {reverseIslandFlight} from './origin-return-journey.mjs';
import {checkLisbonStreetAccess} from './lisbon-street-access.mjs';
const emptyInstallation=kind=>({pickables:[],setActive(){},reset(){},interact(){return false;},handleKey(){return false;},acceptHit(){return false;},update(){return false;},diagnostics:()=>({kind,active:false,closed:true,opening:false,opened:false})});

export async function createGallery({place='lisbon',select,onOverview=()=>{},onStationState=()=>{},onArtwork=()=>{},onSignFocus=()=>{},interact=()=>{},fallback,reduced}){
 const newYork=place==='new-york';
 const ny=newYork?await Promise.all([import('./gallery-new-york.mjs'),import('./gallery-new-york-navigation.mjs'),import('./gallery-new-york-layout.mjs')]):null;
 const L=newYork?ny[2].NEW_YORK_LAYOUT:LISBON_LAYOUT;
 const STATIONS=newYork?NEW_YORK_STATIONS:LISBON_URBEX_STATIONS;
 const ENTRY=L.entry,LOOK=L.look,GROUND=L.groundY,HEIGHT=L.eyeHeight;
 const ceiling=(x,z)=>newYork?ny[2].newYorkRoofHeight(x,z):(architecture?.roofHeight||glassRoofHeight)(x,z);
 const host=document.getElementById('space'),mobile=innerWidth<650||(matchMedia('(pointer: coarse)').matches&&Math.min(innerWidth,innerHeight)<650);
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 const quality=createRenderQuality({mobile,pixelRatio:devicePixelRatio});
 renderer.setPixelRatio(quality.diagnostics().pixelRatio);renderer.setSize(innerWidth,innerHeight);
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 renderer.setClearColor(0x030912);renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 const baseFov=newYork?82:mobile?88:82;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(baseFov,innerWidth/innerHeight,.08,9000);
 let dirty=true,frames=0,list=false,hidden=document.hidden,paused=false,lastTime=0,lastRender=0,returnReveal=false;
 let motionReduced=reduced.matches,tween=null,arrival=null,pendingVisit=null,stellarView=null,room=-1,focused=-1,down=null,yaw=0,pitch=0,dragged=false,initialized=false,inspecting=false,inspectionAmount=0,bookDestination=null;
 let architecture=null,book=null,play=null,opposite=null,liberty=null,lastStationState='';
 const cockpit=newYork?null:createSaucerCockpit(camera);if(cockpit)scene.add(camera);
 let vessel=null,vesselMode='island',rail=null,gateGeneration=0,streetAccess={state:'idle',owned:false},portalAt=null;
 const invalidate=()=>{dirty=true;};
 const landscape=createTempleLandscape(scene,renderer,{mobile,onChange:invalidate,place});
 architecture=(newYork?ny[0].createNewYorkGallery:createModernGallery)(scene,renderer,{mobile,onChange:invalidate});
 if(newYork){
  const {createLiberty}=await import('./gallery-liberty.mjs');
  liberty=createLiberty(scene,{mobile,onChange:invalidate,submerged:true});
 }
 if(!newYork)vessel=createOriginsVessel(scene,{mobile,transitOnly:true,onChange:invalidate,onOpen:({href})=>{bookDestination=href;dirty=true;}});
 book=newYork?createLecternBook(scene,{mobile,layout:L,onChange:invalidate,onOpen:({href})=>{expandOriginsBook(book.root,camera,href,{reduced:motionReduced,onStart:()=>{pause();renderer.render(scene,camera);},onClose:()=>{paused=false;lastTime=0;book.reset();dirty=true;syncSound();}});}}):vessel.book;
 const fireplace=createGalleryFireplace(scene,{mobile,layout:L,blackStone:!newYork,onChange:invalidate,...(architecture.smokeOutlet?{smokeOutlet:architecture.smokeOutlet}:newYork?{smokeOutlet:L.smokeOutlet}:{})});
 function openExperience({href}){
  // Navigation releases the world instead of leaving its GPU/audio behind an
  // iframe. Independent pages retain their own controls, pixels and access.
  if(!['/get_higher','/play_lisbon_street','/play_lisbon_street?discover=1','/play_lisbon_street?board=1','/origin?arrival=1','/origins','/origins?open=1','/same_but_opposite'].includes(href)&&!/^\/origins\?work=\d+$/.test(href)&&!/^\/think_same_but_opposite\?work=[a-z-]+$/.test(href))return false;
  pause();sound.setMuted(true);fireSound.setMuted(true);renderer.setAnimationLoop(null);location.assign(href);return true;
 }
 play=newYork?createPlayInstallation(scene,{mobile,onChange:invalidate,onOpen:openExperience}):architecture.performance;
 if(!newYork)play.onOpen?.(()=>openDiscover());
 opposite=newYork?createOppositeInstallation(scene,{mobile,layout:L,onChange:invalidate,onOpen:openExperience}):emptyInstallation('absent-in-lisbon');
 const walkway=newYork?ny[1].createNewYorkWalkway():createModernWalkway(architecture.obstacles),physics=newYork?ny[1].createNewYorkPhysics({x:ENTRY[0],z:ENTRY[2]}):createModernPhysics({x:ENTRY[0],z:ENTRY[2]},architecture.obstacles,architecture.roofProfile),sound=createGalleryAudio(),fireSound=createFireAudio();
 const eye=new T.Vector3(...ENTRY),gaze=new T.Vector3(...LOOK),keys=new Set();
 const stick=document.getElementById('joystick'),knob=stick.querySelector('span');let joystick={x:0,y:0};
 const isFloor=()=>physics.diagnostics().grounded&&physics.position.y<GROUND+.2;
 const inGallery=()=>eye.x>-L.halfWidth&&eye.x<L.halfWidth&&eye.z<L.frontZ&&eye.z>L.backZ&&eye.y<ceiling(eye.x,eye.z);
 const nearStation=index=>{if(!newYork&&index===1)return vesselMode==='chamber';const s=STATIONS[index];return!!s&&isFloor()&&physics.position.y<GROUND+.2&&Math.hypot(eye.x-(mobile&&s.approachMobile||s.approach)[0],eye.z-(mobile&&s.approachMobile||s.approach)[2])<1.2;};
 function stationState(){
  if(!initialized)return;
  const b=book.diagnostics(),p=play.diagnostics(),o=opposite.diagnostics(),value={room,focused,book:b,play:p,opposite:o,moving:!!tween||!!pendingVisit||!!rail,vessel:vesselMode};
  const signature=JSON.stringify([vesselMode,room,focused,!!tween,!!pendingVisit,b.closed,b.opening,b.opened,p.active,o.active]);
  if(signature!==lastStationState){lastStationState=signature;onStationState(value);}
 }
 function angles(){const d=gaze.clone().sub(eye).normalize();yaw=Math.atan2(-d.x,-d.z);pitch=Math.asin(d.y);}
 function look(){gaze.copy(eye).add(new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)));}
 function stopStick(){joystick={x:0,y:0};knob.style.transform='';}
 function stopInput(){keys.clear();stopStick();down=null;}
 function resetPortals(){play.setActive(false);opposite.setActive(false);}
 function cancelTravel(){architecture?.setDoorOpen?.(false);gateGeneration++;tween=null;arrival=null;pendingVisit=null;stellarView=null;angles();}
 function leaveStation(){architecture.setInspecting?.(false);bookDestination=null;book.reset();inspecting=false;room=focused=-1;resetPortals();stationState();}
 function free(){if(vesselMode!=='island'){interact();return;}inspecting=false;architecture.setInspecting?.(false);cancelTravel();interact();}
 try{const muted=localStorage.getItem('space-sound-muted')==='true';sound.setMuted(muted);fireSound.setMuted(muted);}catch{}
 angles();
 function syncSound(){
  const active=!hidden&&!list&&!paused,distance=Math.hypot(eye.x,eye.z-L.frontZ,eye.y-1.65);
  const shelter=vesselMode!=='island'?.92:T.MathUtils.smoothstep(L.frontZ-eye.z,0,4)*T.MathUtils.smoothstep(L.halfWidth-Math.abs(eye.x),0,1.1)*T.MathUtils.smoothstep(eye.z-L.backZ,0,.8)*(1-T.MathUtils.smoothstep(eye.y,ceiling(eye.x,eye.z)-.8,ceiling(eye.x,eye.z)+.3));
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
  tween={points,lengths,segment:1,stalled:0,to:position,target,from:gaze.clone(),start:performance.now(),duration:Math.min(4200,Math.max(1450,lengths.at(-1)*110)),done,air};dirty=true;return true;
 }
 function groundedTravel(position,target,done){
  if(!isFloor()){
   const request={position,target,done};pendingVisit=request;
   return travel(new T.Vector3(...ENTRY),new T.Vector3(...LOOK),()=>{if(pendingVisit!==request)return;pendingVisit=null;travel(position,target,done);},{air:true});
  }
  return travel(position,target,done);
 }
 function focusStation(index){if(!nearStation(index))return;focused=room=index;inspecting=index===0;architecture.setInspecting?.(inspecting);if(index===2)play.setActive(true);if(index===4)opposite.setActive(true);stationState();}
 function visit(index){
  if(!newYork&&index===1)return visitOrigins();
  if(!newYork&&index===4)return false;
  if(!newYork&&vesselMode!=='island')return returnIsland(()=>visit(index));
  if(index===3)index=0;
  const station=STATIONS[index];if(!station||list)return false;
  cancelTravel();resetPortals();inspecting=false;architecture.setInspecting?.(false);room=index;focused=-1;
  const result=groundedTravel(new T.Vector3(...(mobile&&station.approachMobile||station.approach)),new T.Vector3(...station.target),()=>focusStation(index));stationState();return result;
 }
 function enter(index=room){
  if(!newYork&&index===1){if(vesselMode==='chamber')return book.open();return visitOrigins();}
  if(index===3)index=0;
  if(!STATIONS[index]||list)return false;
  if(!nearStation(index))return visit(index);
  focusStation(index);if(index===2){if(!newYork)return openDiscover();play.open();}else if(index===4)opposite.open();else if(index===1)book.open();else openExperience({href:'/get_higher'});dirty=true;stationState();return true;
 }
 function openDiscover(){return openExperience({href:'/play_lisbon_street?discover=1'});}
 async function requestStreetEntry(){
  if(newYork)return false;if(streetAccess.state==='checking')return false;
  stopInput();cancelTravel();leaveStation();interact();const request=++gateGeneration;
  streetAccess={state:'checking',owned:false};onArtwork({kind:'lisbon-entry',...streetAccess});
  const access=await checkLisbonStreetAccess();if(request!==gateGeneration||hidden||list||paused)return false;
  streetAccess=access;onArtwork({kind:'lisbon-entry',...access});
  if(access.owned){architecture.setDoorOpen?.(true);setTimeout(()=>{if(request===gateGeneration&&!hidden&&!paused&&!list)openExperience({href:'/play_lisbon_street?board=1'});},motionReduced?0:650);}
  return access.owned;
 }
 function activateStreetSign(){return requestStreetEntry();}
 function startJourney(mode,points,done){
  stopInput();cancelTravel();leaveStation();interact();vesselMode=mode;
  const path=[eye.clone(),...points.map(p=>new T.Vector3(...p))];const curve=new T.CurvePath();for(let i=1;i<path.length;i++)curve.add(new T.LineCurve3(path[i-1],path[i]));rail={curve,elapsed:0,duration:mode==='outbound'?17:12,done};
  if(motionReduced){eye.copy(path.at(-1));rail=null;done();}dirty=true;stationState();return true;
 }
 function visitOrigins(){
  if(!vessel||vesselMode==='outbound')return false;if(vesselMode==='chamber')return true;
  const pickup=new T.Vector3(...vessel.journey.outbound[0]);
  const floorPath=vesselMode==='island'?walkway.route(eye,pickup):null;
  const departure=floorPath?floorPath.slice(1).map(p=>[p.x,1.65,p.z]).concat(vessel.journey.outbound.slice(1)):vessel.journey.outbound;
  return startJourney('outbound',departure,()=>{vesselMode='portal';document.body.classList.add('is-origin-transit');dirty=true;stationState();portalAt=performance.now();});
 }
 function returnIsland(done=()=>{}){
  if(!vessel||vesselMode==='island')return false;
  document.body.classList.remove('is-origin-transit');portalAt=null;
  const points=[[eye.x,Math.max(26,eye.y),eye.z],[0,26,7],[0,8.5,11],[0,1.65,13],ENTRY];
  return startJourney('returning',points,()=>{vesselMode='island';vessel.resetFlight?.();physics.reset({x:ENTRY[0],z:ENTRY[2]});eye.fromArray(ENTRY);gaze.fromArray(LOOK);angles();room=focused=-1;dirty=true;stationState();done();});
 }
 function enterGallery(){cancelTravel();leaveStation();onOverview();return groundedTravel(new T.Vector3(...L.inside),new T.Vector3(...L.insideTarget));}
 function overview(){if(vesselMode!=='island')return returnIsland();cancelTravel();leaveStation();onOverview();groundedTravel(new T.Vector3(...ENTRY),new T.Vector3(...LOOK));}
 function visitFireplace(){cancelTravel();leaveStation();onOverview();return groundedTravel(new T.Vector3(...L.fireplace.approach),new T.Vector3(...L.fireplace.target));}
 // A single uninterrupted gallery has no secondary floor destinations.
 function visitLevel(level){return level===0&&!list?enterGallery():false;}
 function move(dt,dx=0,dz=0,guided=false){
  if(vesselMode==='chamber'){if(Math.abs(dx)+Math.abs(dz)<.000001)return;const x=T.MathUtils.clamp(eye.x+dx,-5,5),z=T.MathUtils.clamp(eye.z+dz,-47,-38);if(!(Math.abs(x)<.9&&Math.abs(z+43)<.9)){eye.x=x;eye.z=z;look();dirty=true;}return;}
  const before=eye.clone(),steps=Math.max(1,Math.ceil(dt/.025));
  for(let i=0;i<steps;i++)physics.step(dt/steps,{dx:dx/steps,dz:dz/steps,guided});
  eye.set(physics.position.x,physics.position.y+HEIGHT,physics.position.z);
  if(eye.distanceToSquared(before)>.000001){look();dirty=true;}
 }
 function jump(){if(vesselMode!=='island'||list||hidden||paused)return false;const jumped=physics.jump();if(jumped){free();leaveStation();onOverview();stellarView={yaw,pitch,amount:0};dirty=true;}return jumped;}
 const ray=new T.Raycaster(),mouse=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),-GROUND),floor=new T.Vector3();
 const pickables=[...architecture.pickables,...book.pickables,...play.pickables,...opposite.pickables,...(newYork?fireplace.pickables||[]:[]),...(vessel?.pickables||[])];
 function hit(event){
  const rect=host.getBoundingClientRect();mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);
  const hits=ray.intersectObjects(pickables,false).filter(h=>h.object.visible&&h.object.material?.opacity!==0&&(!h.object.userData.installation||play.acceptHit(h)||opposite.acceptHit(h)));
  // Glass is deliberately transparent; opaque furniture/walls still occlude a
  // portal or book so it cannot be operated through the back of the room.
  const solid=ray.intersectObjects([...(architecture.solids||[]),...(vessel?.solids||[])],false).find(h=>h.object.visible&&!h.object.material?.transparent);
  return hits.find(h=>!solid||h.distance<=solid.distance+.055);
 }
 host.addEventListener('pointerdown',e=>{if(e.button!==0)return;host.focus({preventScroll:true});host.setPointerCapture(e.pointerId);down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY};dragged=false;});
 host.addEventListener('pointermove',e=>{
  if(!down){const h=hit(e),data=h?.object.userData;host.style.cursor=h?'pointer':'grab';onSignFocus(data?.kind==='lisbon-street-sign'?{id:data.id,title:data.title}:null);return;}
  if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;
  if(dragged){onSignFocus(null);free();yaw-=(e.clientX-down.lx)*.004;pitch=T.MathUtils.clamp(pitch+(e.clientY-down.ly)*.003,-1.55,1.35);look();dirty=true;}
  down.lx=e.clientX;down.ly=e.clientY;
 });
 host.addEventListener('pointerup',e=>{
  if(!down)return;down=null;if(dragged||vesselMode!=='island')return;
  const h=hit(e),data=h?.object.userData;
  if(data?.kind==='origins-vessel'){select(1);return;}
  if(data?.kind==='origins-vessel-book'){book.open();return;}
  if(data?.kind==='origins-vessel-work'&&/^\/origins\?work=\d+$/.test(data.href)){openExperience({href:data.href});return;}
  if(data?.kind==='lisbon-discover'){openDiscover();return;}
  if(data?.kind==='lisbon-street-installation'){openDiscover();return;}
  if(data?.kind==='lisbon-street-sign'){
   activateStreetSign(data.id);return;
  }
  if(data?.kind==='new-york-opposite'){
   stopInput();cancelTravel();leaveStation();interact();openExperience({href:data.href});return;
  }
  if(data?.kind==='origins-book'){
   if(nearStation(1)){focusStation(1);book.interact(h);dirty=true;stationState();}else select(1);return;
  }
  if(data?.installation==='play'){
   play.interact(h);return;
  }
  if(data?.installation==='opposite'){opposite.interact(h);return;}
  if(data?.kind==='fireplace'){visitFireplace();return;}
  if(data?.room!==undefined){if(data.room<0)enterGallery();else select(data.room);return;}
  const onFloor=!!ray.ray.intersectPlane(plane,floor);
  if(onFloor&&walkway.allowed(floor.x,floor.z)&&floor.distanceTo(eye)<50){
   const solid=ray.intersectObjects([...(architecture.solids||[]),...(vessel?.solids||[])],false).find(h=>h.object.visible&&!h.object.material?.transparent);
   if(solid&&solid.distance<floor.distanceTo(eye)-.2)return;
   const destination=new T.Vector3(floor.x,GROUND+HEIGHT,floor.z),direction=gaze.clone().sub(eye);free();leaveStation();onOverview();groundedTravel(destination,destination.clone().add(direction));
  }
 });
 host.addEventListener('pointercancel',()=>{down=null;onSignFocus(null);});
 host.addEventListener('pointerleave',()=>onSignFocus(null));
 document.addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea,select,[contenteditable=true]')||list||hidden||paused)return;
  if(vesselMode!=='island'){if(e.key==='Escape')returnIsland();return;}
  const interactive=!!e.target.closest('button,a,summary,[role=button]');
  if(focused===2&&nearStation(2)&&!interactive&&play.handleKey(e)){e.preventDefault();dirty=true;stationState();return;}
  if(focused===4&&nearStation(4)&&!interactive&&opposite.handleKey(e)){e.preventDefault();dirty=true;stationState();return;}
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
 document.addEventListener('visibilitychange',()=>{hidden=document.hidden;lastTime=0;if(hidden){stopInput();bookDestination=null;book.reset();resetPortals();}syncSound();dirty=true;lastTime=0;stationState();});
 function motionChanged(){
  motionReduced=reduced.matches;
  if(motionReduced){if(rail){const done=rail.done;eye.copy(rail.curve.getPointAt(1));rail=null;done();angles();}stellarView=null;if(tween){const t=tween;tween=null;physics.relocateHorizontal(t.to);eye.set(physics.position.x,physics.position.y+HEIGHT,physics.position.z);gaze.copy(t.target);angles();if(isFloor())t.done?.();else arrival={target:t.target.clone(),done:t.done};}}
  dirty=true;
 }
 reduced.addEventListener('change',motionChanged);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();renderer.setAnimationLoop(null);fallback();});
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(quality.resize(devicePixelRatio));renderer.setSize(innerWidth,innerHeight);dirty=true;});
 function viewTarget(){return gaze.clone().lerp(new T.Vector3(...L.counter.target),inspectionAmount);}
 function animate(now){
  const elapsed=lastTime?(now-lastTime)/1000:0,dt=Math.min(elapsed,.05),physicsDt=Math.min(elapsed,.5);lastTime=now;
  if(reduced.matches!==motionReduced)motionChanged();if(list||hidden||paused)return;
  if(rail){rail.elapsed+=Math.min(elapsed,1);const progress=Math.min(1,rail.elapsed/rail.duration);eye.copy(rail.curve.getPointAt(progress));if(vesselMode==='outbound')vessel?.setFlight?.(eye);else if(vesselMode==='returning')vessel?.setReturnFlight?.(eye);gaze.copy(rail.curve.getPointAt(Math.min(1,progress+.025)));dirty=true;if(progress===1){const done=rail.done;rail=null;done();angles();}}
  const guiding=!!tween;
  if(vesselMode==='portal'&&portalAt!==null&&now-portalAt>(motionReduced?0:700)){portalAt=null;openExperience({href:'/origin?arrival=1'});return;}
  if(vesselMode==='island'){
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
  }else if(vesselMode==='chamber'){const forward=(keys.has('w')?1:0)-(keys.has('s')?1:0)-joystick.y,side=(keys.has('d')?1:0)-(keys.has('a')?1:0)+joystick.x;const speed=dt*2;move(dt,(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed);}
  if(stellarView){const s=stellarView;s.amount=T.MathUtils.smoothstep(physics.position.y-GROUND,200,5000);if(!motionReduced){yaw=s.yaw;pitch=T.MathUtils.lerp(s.pitch,-1.52,s.amount);look();dirty=true;}if(physics.diagnostics().grounded){if(!motionReduced){yaw=s.yaw;pitch=s.pitch;look();}stellarView=null;}}
  if(arrival&&isFloor()){const a=arrival;arrival=null;gaze.copy(a.target);angles();a.done?.();dirty=true;}
  if(vesselMode==='island'&&focused>=0&&!nearStation(focused)){leaveStation();onOverview();}
  const altitude=Math.max(0,eye.y-1.65),near=T.MathUtils.clamp(altitude*.002,.08,12),far=altitude>100?100000:9000;
  if(Math.abs(camera.near-near)>.0001||camera.far!==far){camera.near=near;camera.far=far;camera.updateProjectionMatrix();dirty=true;}
  const changes=[cockpit?.update(['outbound','returning','portal'].includes(vesselMode)&&!!vessel?.diagnostics().flying,camera.aspect),vessel?.update(dt,eye,!motionReduced),landscape.update(dt,eye,!motionReduced),architecture.update(dt,eye,!motionReduced),newYork&&book.update(dt,eye,!motionReduced),play.update(dt,eye,!motionReduced),opposite.update(dt,eye,!motionReduced),fireplace.update(dt,eye,!motionReduced),liberty?.update(dt,eye,!motionReduced)];
  if(changes.some(Boolean))dirty=true;
  // Lean toward the premium cases to inspect the protected paper editions.
  const inspectionTarget=inspecting&&focused===0?1:0;
  const nextInspection=motionReduced?inspectionTarget:T.MathUtils.damp(inspectionAmount,inspectionTarget,7,dt);
  if(Math.abs(nextInspection-inspectionAmount)>.0001){inspectionAmount=nextInspection;dirty=true;}else if(inspectionAmount!==inspectionTarget){inspectionAmount=inspectionTarget;dirty=true;}
  const targetFov=(mobile&&(focused===2||focused===4)?88:baseFov)-(mobile?16:10)*inspectionAmount;
  if(Math.abs(camera.fov-targetFov)>.001){camera.fov=motionReduced?targetFov:T.MathUtils.damp(camera.fov,targetFov,7,dt);camera.updateProjectionMatrix();dirty=true;}
  if(dirty&&now-lastRender>=32){
   camera.position.copy(eye).add(new T.Vector3(0,.28,-.18).multiplyScalar(inspectionAmount));
   camera.lookAt(viewTarget());camera.updateMatrixWorld();const renderStart=performance.now();renderer.render(scene,camera);const renderMs=performance.now()-renderStart;frames++;dirty=false;lastRender=now;if(returnReveal){returnReveal=false;requestAnimationFrame(()=>document.body.classList.remove('is-origin-transit'));}
   const ratio=quality.sample(now,{frameMs:elapsed*1000,renderMs});if(ratio!==renderer.getPixelRatio()){renderer.setPixelRatio(ratio);dirty=true;}
   if(bookDestination){const href=bookDestination;sound.transition('enter');requestAnimationFrame(()=>{if(bookDestination===href){bookDestination=null;location.assign(href);}});}
  }
  syncSound();stationState();
 }
 landscape.update(0,eye,false);architecture.update(0,eye,false);book.update(0,eye,!motionReduced);play.update(0,eye,!motionReduced);fireplace.update(0,eye,false);if(liberty)liberty.update(0,eye,!motionReduced);
 if(!newYork&&new URLSearchParams(location.search).get('arrival')==='origin'){
  const points=reverseIslandFlight(vessel.journey);eye.fromArray(points.shift());gaze.fromArray(points[0]);angles();vessel.setReturnFlight(eye);returnReveal=true;document.body.classList.add('is-origin-transit');
  startJourney('returning',points.concat([ENTRY]),()=>{vesselMode='island';vessel.resetFlight();physics.reset({x:ENTRY[0],z:ENTRY[2]});eye.fromArray(ENTRY);gaze.fromArray(LOOK);angles();dirty=true;stationState();history.replaceState(history.state,'',location.pathname+location.hash);});
 }
 camera.position.copy(eye);camera.lookAt(gaze);camera.updateMatrixWorld();initialized=true;stationState();renderer.setAnimationLoop(animate);
 addEventListener('pagehide',()=>{pause();if(liberty)liberty.dispose();renderer.setAnimationLoop(null);});
 addEventListener('pageshow',e=>{if(e.persisted){if(!newYork&&vesselMode!=='island'){vesselMode='island';rail=null;portalAt=null;document.body.classList.remove('is-origin-transit');vessel.resetFlight?.();physics.reset({x:ENTRY[0],z:ENTRY[2]});eye.fromArray(ENTRY);gaze.fromArray(LOOK);angles();}paused=false;hidden=document.hidden;bookDestination=null;book.reset();resetPortals();quality.reset();try{const muted=localStorage.getItem('space-sound-muted')==='true';sound.setMuted(muted);fireSound.setMuted(muted);}catch{}dirty=true;lastTime=0;syncSound();renderer.setAnimationLoop(animate);}});
 return{visit,enter,enterGallery,overview,visitFireplace,visitLevel,invalidate,activateStreetSign,
  requestStreetEntry,openDiscover,visitOrigins,returnIsland,
  replayStreetSign(){return !newYork&&activateStreetSign(play.diagnostics().id||'priority');},muteStreetSign(value){if(!newYork)play.setMuted?.(value);},
  leaveStation(){stopInput();cancelTravel();leaveStation();onOverview();dirty=true;},
  stop(){stopInput();cancelTravel();leaveStation();dirty=true;},
  setList(value){list=!!value;stopInput();cancelTravel();leaveStation();syncSound();dirty=true;lastTime=0;},
  diagnostics:()=>({webgl:true,place:newYork?'new-york':'lisbon',zone:vesselMode!=='island'?'origins-vessel':inGallery()?'gallery':'terrace',originsJourney:{state:vesselMode,moving:!!rail,returnFromOrigin:!newYork&&new URLSearchParams(location.search).get('arrival')==='origin',vessel:vessel?.diagnostics()},streetAccess:{...streetAccess},room,focused,frames,position:[+eye.x.toFixed(2),+eye.z.toFixed(2)],moving:!!tween||!!pendingVisit||!!keys.size||!!joystick.x||!!joystick.y||!physics.diagnostics().grounded,visible:!hidden&&!list&&!paused,liberty:liberty?liberty.diagnostics():null,
   camera:{position:camera.position.toArray(),target:viewTarget().toArray(),inspection:inspectionAmount,fov:camera.fov,aspect:camera.aspect,near:camera.near,far:camera.far,stellarOverview:!!stellarView&&!motionReduced,overviewAmount:stellarView?.amount??0},physics:physics.diagnostics(),temple:architecture.diagnostics(),stations:{play:play.diagnostics(),opposite:opposite.diagnostics(),book:book.diagnostics()},landscape:landscape.diagnostics(),audio:sound.diagnostics(),fireAudio:fireSound.diagnostics(),fireplace:fireplace.diagnostics(),render:{...quality.diagnostics(),width:renderer.domElement.width,height:renderer.domElement.height,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},navigation:{speed:2.6,minDuration:1450,maxDuration:4200,deferredArrival:!!arrival||!!pendingVisit,...walkway.diagnostics()}})};
}
