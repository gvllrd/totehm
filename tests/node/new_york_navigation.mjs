import assert from 'node:assert/strict';
import {NEW_YORK_LAYOUT as L,NEW_YORK_FLOORS as FLOORS,NEW_YORK_RAMPS as RAMPS,NEW_YORK_LANDINGS as LANDINGS,NEW_YORK_STATIONS as STATIONS,NEW_YORK_EXHIBITION_WALLS as ART_WALLS,NEW_YORK_EXHIBITION_OBSTACLES as ART_SOLIDS,NEW_YORK_GROUND_OBSTACLES as FURNITURE,newYorkRampHeight,newYorkSurfacesAt,newYorkRoofHeight} from '../../space/gallery-new-york-layout.mjs';
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
function crosses(a,b,box){
 let low=0,high=1;
 for(const [axis,min,max] of [['x',box.minX,box.maxX],['y',box.minY,box.maxY],['z',box.minZ,box.maxZ]]){
  const delta=b[axis]-a[axis];if(Math.abs(delta)<1e-9){if(a[axis]<=min||a[axis]>=max)return false;continue;}
  const enter=(min-a[axis])/delta,leave=(max-a[axis])/delta;low=Math.max(low,Math.min(enter,leave));high=Math.min(high,Math.max(enter,leave));if(low>=high)return false;
 }return high>1e-6&&low<1-1e-6;
}
check(ART_WALLS.length===10,'every one of the five floors has two dedicated white exhibition walls');
check(ART_WALLS.reduce((n,w)=>n+w.slots.length,0)===29,'twenty-nine future digital artwork positions are reserved without fake artworks');
for(let level=0;level<5;level++){
 const exhibition=createNewYorkPhysics({...LANDINGS[level]});
 for(const wall of ART_WALLS.filter(w=>w.floor===level)){
  follow(exhibition,walkway.route(eye(exhibition.position),{x:wall.approach[0],y:wall.approach[1],z:wall.approach[2]}),{guided:true});
  check(Math.abs(exhibition.position.y-FLOORS[level])<.01,'each artwork viewpoint is physically accessible from the same-floor landing');
  const approach={x:wall.approach[0],y:wall.approach[1],z:wall.approach[2]};
  check(Math.abs(approach.x-wall.x)-wall.depth/2-.18>=1.2,'a clear viewer aisle remains in front of each exhibition surface');
  for(const slot of wall.slots)for(const dy of [-slot.height/2,slot.height/2])for(const dz of [-slot.width/2,slot.width/2]){
   const target={x:slot.position[0],y:slot.position[1]+dy,z:slot.position[2]+dz};
   check(![...FURNITURE,...ART_SOLIDS].some(box=>crosses(approach,target,box)),'furniture and partitions do not obscure the full reserved artwork rectangle');
   for(let i=0;i<=16;i++){
    const t=i/16,x=approach.x+(target.x-approach.x)*t,z=approach.z+(target.z-approach.z)*t,y=approach.y+(target.y-approach.y)*t;
    check(!RAMPS.some(r=>{const h=newYorkRampHeight(r,x,z);return h!==null&&y>h-.14&&y<h+.025;}),'no inclined aisle crosses any artwork viewing ray');
   }
  }
  const barrier=createNewYorkPhysics({x:approach.x,y:FLOORS[level],z:approach.z});for(let i=0;i<100;i++)barrier.step(.025,{dx:Math.sign(wall.x)*.065});
  check(Math.abs(barrier.position.x-wall.x)>=wall.depth/2+.18-.003,'exhibition partitions are solid physical walls');
 }
}
const screenEye={x:L.opposite.approach[0],y:L.opposite.approach[1],z:L.opposite.approach[2]};
for(const y of [1.525,4.675])for(const z of [-9.8,-4.2])check(!ART_SOLIDS.some(box=>crosses(screenEye,{x:-12.72,y,z},box)),'all four Same but opposite corners remain visible past the new walls');
const playEye={x:L.play.approach[0],y:L.play.approach[1],z:L.play.approach[2]};
for(const y of [1.15,5.05])for(const x of [4.5,11.5])check(!ART_SOLIDS.some(box=>crosses(playEye,{x,y,z:-16.18},box)),'all four Lisbon-screen corners remain visible past the new walls');
const fireEye={x:L.fireplace.approach[0],y:L.fireplace.approach[1],z:L.fireplace.approach[2]};
const fireVisit=createNewYorkPhysics();follow(fireVisit,walkway.route(eye(fireVisit.position),fireEye),{guided:true});
for(const [x,y,z] of [[-10.15,.02,-15.17],[-5.85,.02,-15.17],[-9.95,4.62,-15.99],[-6.05,4.62,-15.99]])check(!ART_SOLIDS.some(box=>crosses(fireEye,{x,y,z},box)),'the full campfire remains visible from its original approach');
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
