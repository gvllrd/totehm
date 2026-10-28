import assert from 'node:assert/strict';
import {NEW_YORK_LAYOUT as L,NEW_YORK_FLOORS as FLOORS,NEW_YORK_RAMPS as RAMPS,NEW_YORK_LANDINGS as LANDINGS,NEW_YORK_STATIONS as STATIONS,newYorkSurfacesAt,newYorkRoofHeight} from '../../space/gallery-new-york-layout.mjs';
import {createNewYorkPhysics,createNewYorkWalkway} from '../../space/gallery-new-york-navigation.mjs';

let checks=0,steps=0;const check=(condition,message)=>{checks++;assert.ok(condition,message);};
const H=L.eyeHeight,eye=p=>({x:p.x,y:p.y+H,z:p.z}),walkway=createNewYorkWalkway();
function follow(physics,path,{guided=false}={}){
 check(!!path,'a connected route exists');
 for(const target of path){
  let count=0;
  while(Math.hypot(physics.position.x-target.x,physics.position.z-target.z)>.01){
   const before={...physics.position};physics.step(.025,{dx:target.x-physics.position.x,dz:target.z-physics.position.z,guided});steps++;
   check(++count<2000,`route progresses to ${JSON.stringify(target)} from ${JSON.stringify(physics.position)}`);
   check(physics.diagnostics().grounded,'ramps and turns retain continuous support');
   check(Math.abs(physics.position.y-before.y)<.14,`incline has no stair-sized jump ${JSON.stringify(before)} -> ${JSON.stringify(physics.position)}`);
   check(newYorkSurfacesAt(physics.position.x,physics.position.z).some(s=>Math.abs(s.y-physics.position.y)<1e-4),'rendered surface and physical support agree');
  }
  check(Math.abs(physics.position.y-(target.y-H))<.21,'waypoint elevation matches actual aisle');
 }
}
check(FLOORS.length===5,'five levels');check(RAMPS.length===16,'four four-sided inclined aisles');
for(const r of RAMPS){check((r.to.y-r.from.y)/r.length<.11,'generous continuous aisle slope');check(r.width>=2.1,'two metre wide aisle');}
const physics=createNewYorkPhysics();
const top={...LANDINGS[4],y:LANDINGS[4].y+H};
follow(physics,walkway.route(eye(physics.position),top));
check(Math.abs(physics.position.y-FLOORS[4])<.01,'manual movement reaches fifth floor');
const initialTop={...physics.position};
follow(physics,walkway.route(eye(physics.position),{x:6,y:FLOORS[4]+H,z:-7.3}));
follow(physics,walkway.route(eye(physics.position),{x:-6,y:FLOORS[4]+H,z:-11.8}));
check(Math.abs(physics.position.y-FLOORS[4])<.01,'fifth gallery stays at its correct elevation');
follow(physics,walkway.route(eye(physics.position),{x:0,y:1.65,z:15}));
check(Math.abs(physics.position.y-FLOORS[0])<.01,'full descent returns to street level');
for(let level=1;level<5;level++){
 const p=createNewYorkPhysics({...LANDINGS[level]});
 for(const target of [{x:6,y:FLOORS[level]+H,z:-7.3},{x:-6,y:FLOORS[level]+H,z:-11.8},{...LANDINGS[level],y:FLOORS[level]+H}])follow(p,walkway.route(eye(p.position),target),{guided:true});
 check(Math.abs(p.position.y-FLOORS[level])<.01,`level ${level+1} connects all gallery wings and its landing`);
}
for(const station of STATIONS){
 const p=createNewYorkPhysics();follow(p,walkway.route(eye(p.position),{x:station.approach[0],y:station.approach[1],z:station.approach[2]}),{guided:true});
 check(Math.abs(p.position.y-FLOORS[0])<.01,'original installation remains at ground level');
}
const wall=createNewYorkPhysics({x:12,z:-9});for(let i=0;i<200;i++)wall.step(.025,{dx:1});check(wall.position.x<12.75,'body cannot walk through brick wall');
const viewpoint=createNewYorkPhysics();follow(viewpoint,walkway.route(eye(viewpoint.position),{x:12.7,y:FLOORS[3]+H,z:-4.7}),{guided:true});check(Math.abs(viewpoint.position.x-12.7)<.02&&Math.abs(viewpoint.position.y-FLOORS[3])<.02,'Liberty window landing is physically connected to the street through ramps');
const well=createNewYorkPhysics({x:6,z:-9,y:FLOORS[2]});for(let i=0;i<100;i++)well.step(.025,{dx:-1});check(well.position.x>5.3,'atrium guard stops visitor before floor opening');check(well.diagnostics().grounded,'edge guard preserves support');
const ceiling=createNewYorkPhysics({x:0,z:-7,y:FLOORS[1]});check(ceiling.jump(),'intentional indoor jump starts');for(let i=0;i<20;i++)ceiling.step(.025);check(ceiling.diagnostics().headContacts>0,'slab underside intercepts high jump');check(ceiling.position.y<FLOORS[2]-H+.01,'jump cannot tunnel through upper floor');
const teleport=createNewYorkPhysics();teleport.relocateHorizontal(top);check(Math.abs(teleport.position.y-FLOORS[4])<.01,'reduced motion relocation targets real upper floor');teleport.relocateHorizontal({x:0,y:100+H,z:-8});check(teleport.position.y<22,'unsupported altitude cannot be restored');
const flying=createNewYorkPhysics();flying.jump();flying.step(.025);const altitude=flying.position.y;flying.relocateHorizontal({x:0,y:1.65,z:12});check(flying.position.y===altitude,'horizontal relocation preserves an airborne altitude');
check(newYorkRoofHeight(0,-8)===27,'recessed fifth floor roof is tall');check(newYorkRoofHeight(12,-8)<22,'four-storey cornice remains lower');
const roof=createNewYorkPhysics({x:12,y:newYorkRoofHeight(12,-8),z:-8});
check(roof.diagnostics().onRoof,'roof restore has actual support');
for(let i=0;i<8;i++)roof.step(.025,{dx:.065});check(roof.position.x>12.4,'grounded roof visitor can walk');
for(let i=0;i<70;i++)roof.step(.025,{dx:.065});check(roof.position.x>13.3,'visitor can leave roof edge instead of becoming trapped');
check(roof.position.y<21,'leaving roof begins a real fall');
for(let i=0;i<150;i++)roof.step(.025);check(roof.diagnostics().grounded,'roof fall eventually lands');
const upperRoof=createNewYorkPhysics({x:0,y:27,z:-8});upperRoof.step(.025,{dx:.06});check(upperRoof.position.x>.05,'upper roof walking works');
console.log(JSON.stringify({passed:true,checks,steps,floors:FLOORS.length,ramps:RAMPS.length,topFeet:initialTop.y}));
