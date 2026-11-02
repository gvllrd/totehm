// New York uses the same single-level castle physics, with eye-space routes.
import assert from 'node:assert/strict';
import {NEW_YORK_LAYOUT as L,NEW_YORK_FLOORS as FLOORS,NEW_YORK_RAMPS as RAMPS,NEW_YORK_STATIONS as STATIONS,newYorkSurfacesAt,newYorkRoofHeight} from '../../space/gallery-new-york-layout.mjs';
import {createNewYorkPhysics,createNewYorkWalkway} from '../../space/gallery-new-york-navigation.mjs';
import {createModernPhysics} from '../../space/gallery-modern-navigation.mjs';
import {glassRoofHeight} from '../../space/gallery-glass-shell.mjs';
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
const eye=p=>({x:p.x,y:p.y+L.eyeHeight,z:p.z}),nav=createNewYorkWalkway();
check(FLOORS.length===1&&RAMPS.length===0,'New York has one continuous level rather than the retired stacked office floors');
for(const z of [12,-1,-2.5])for(const station of STATIONS){
 const body=createNewYorkPhysics({x:0,z}),target={x:station.approach[0],y:station.approach[1],z:station.approach[2]},started=performance.now(),route=nav.route(eye(body.position),target);
 check(performance.now()-started<2000,'Guidance at the entrance does not block the UI while constructing a route');
 check(route?.length>=2&&route.every(p=>Math.abs(p.y-(L.groundY+L.eyeHeight))<1e-8),'Route waypoints retain eye height on the physical ground plane');
 for(const point of route.slice(1)){
  for(let i=0;i<1200&&Math.hypot(body.position.x-point.x,body.position.z-point.z)>.003;i++){
   const dx=point.x-body.position.x,dz=point.z-body.position.z,length=Math.hypot(dx,dz),stride=Math.min(.5,length);
   body.step(.025,{dx:dx/length*stride,dz:dz/length*stride,guided:true});
   assert(body.diagnostics().grounded&&Math.abs(body.position.y-L.groundY)<1e-6,'Guided movement never loses support or changes altitude');
  }
  check(Math.hypot(body.position.x-point.x,body.position.z-point.z)<.004,'The actual New York body reaches every waypoint to '+station.id);
 }
 check(newYorkSurfacesAt(body.position.x,body.position.z).some(s=>Math.abs(s.y-body.position.y)<1e-6),'Reported visitor support agrees with the rendered castle floor');
}
const ny=createNewYorkPhysics(),shared=createModernPhysics();
for(const input of [{dx:.05},{dz:-.05},{dx:-.03,dz:.02}])for(let i=0;i<30;i++){ny.step(.025,input);shared.step(.025,input);assert.deepEqual(ny.position,shared.position);checks++;}
check(ny.diagnostics().levels===1&&ny.diagnostics().level===0&&ny.diagnostics().stairs===0,'The adapter reports the current single gallery level');
check(ny.jump()&&shared.jump(),'The New York adapter keeps deliberate jumps available');
for(let i=0;i<60;i++){ny.step(1/120);shared.step(1/120);assert.deepEqual(ny.position,shared.position);checks++;}
const altitude=ny.position.y,velocity=ny.diagnostics().velocityY;ny.relocateHorizontal({x:0,z:12,y:L.eyeHeight});
check(ny.position.y===altitude&&ny.diagnostics().velocityY===velocity,'Horizontal guidance cannot teleport an airborne visitor down to the floor');
for(const [x,z] of [[0,-8],[-10,-14],[11,-5]])check(newYorkRoofHeight(x,z)===glassRoofHeight(x,z),'Both city adapters report the same inclined roof contact surface');
for(const malformed of [null,{},[],{x:NaN,z:0},{x:0,z:Infinity}])check(nav.route(eye(ny.position),malformed)===null,'Malformed destinations return no route');
console.log('PASS '+checks+' New York single-gallery movement checks');
