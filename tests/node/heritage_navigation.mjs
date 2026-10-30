import assert from 'node:assert/strict';
import {HERITAGE_PORTAL as P,heritageWallGroups,heritageWalls,heritageObstacles} from '../../space/gallery-heritage-layout.mjs';
import {GALLERY_LAYOUT as LISBON,GALLERY_STATIONS,GALLERY_EXHIBITION_WALLS} from '../../space/gallery-modern-layout.mjs';
import {createModernPhysics,createModernWalkway} from '../../space/gallery-modern-navigation.mjs';
import {NEW_YORK_LAYOUT as NY,NEW_YORK_LANDINGS,NEW_YORK_FLOORS,NEW_YORK_EXHIBITION_WALLS} from '../../space/gallery-new-york-layout.mjs';
import {createNewYorkPhysics,createNewYorkWalkway} from '../../space/gallery-new-york-navigation.mjs';

let checks=0,steps=0;
const check=(value,message)=>{checks++;assert(value,message);};
const eye=p=>({x:p.x,y:p.y+1.74,z:p.z});
const insideBody=(p,b)=>p.x>b.minX-.18+1e-5&&p.x<b.maxX+.18-1e-5&&p.z>b.minZ-.18+1e-5&&p.z<b.maxZ+.18-1e-5&&p.y<b.maxY-1e-5&&p.y+1.74>b.minY+1e-5;
function crosses(a,b,box){
 let lo=0,hi=1;
 for(const [axis,min,max] of [['x',box.minX,box.maxX],['y',box.minY,box.maxY],['z',box.minZ,box.maxZ]]){
  const delta=b[axis]-a[axis];if(Math.abs(delta)<1e-9){if(a[axis]<=min||a[axis]>=max)return false;continue;}
  const t0=(min-a[axis])/delta,t1=(max-a[axis])/delta;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>=hi)return false;
 }return hi>1e-6&&lo<1-1e-6;
}
function follow(physics,path,obstacles,label){
 check(!!path&&path.length>=2,label+' has a connected physical route');
 for(const point of path){
  let n=0;
  while(Math.hypot(point.x-physics.position.x,point.z-physics.position.z)>.006){
   physics.step(.025,{dx:point.x-physics.position.x,dz:point.z-physics.position.z,guided:true});steps++;
   check(++n<2500,label+' progresses around masonry and glazing');
   check(physics.diagnostics().grounded,label+' keeps continuous support');
   check(!obstacles.some(b=>insideBody(physics.position,b)),label+' never crosses retained masonry or the glass vestibule');
  }
 }
}
for(const [place,L,createPhysics,createWalkway] of [['lisbon',LISBON,createModernPhysics,createModernWalkway],['new-york',NY,createNewYorkPhysics,createNewYorkWalkway]]){
 const obstacles=heritageObstacles(place),walls=heritageWalls(place),groups=heritageWallGroups(place),nav=createWalkway();
 check(groups.length===6&&walls.length>groups.length,place+' retains six historic wall groups as genuinely broken physical fragments');
 const west=walls.filter(w=>w.group==='heritage-ocean-west').sort((a,b)=>a.minZ-b.minZ),gapStart=west.findIndex((w,i)=>i<west.length-1&&west[i+1].minZ-w.maxZ>.4);
 check(gapStart>=0,place+' the retained ocean wall has a real missing span wide enough for a body');
 const gapZ=(west[gapStart].maxZ+west[gapStart+1].minZ)/2;
 const missing=createPhysics({x:-11.7,z:gapZ});for(let i=0;i<100;i++)missing.step(.025,{dx:-1});
 check(missing.position.x< -12.5,place+' a body can cross the actual missing stone span before reaching the exterior glass');
 const stump=west.reduce((lowest,w)=>w.maxY<lowest.maxY?w:lowest,west[0]),fallOnStump=createPhysics({x:(stump.minX+stump.maxX)/2,y:stump.maxY+.6,z:(stump.minZ+stump.maxZ)/2});
 for(let i=0;i<240;i++)fallOnStump.step(1/120);
 check(fallOnStump.diagnostics().grounded&&Math.abs(fallOnStump.position.y-stump.maxY)<.0001,place+' a broken wall fragment supports the body at its own visible height');
 const p=createPhysics();
 for(const s of [...GALLERY_STATIONS,{id:'fire',approach:L.fireplace.approach}]){
  const target={x:s.approach[0],y:s.approach[1],z:s.approach[2]};
  follow(p,nav.route(eye(p.position),target),obstacles,place+' '+s.id);
 }
 follow(p,nav.route(eye(p.position),{x:0,y:1.65,z:L.entry[2]}),obstacles,place+' return through the open vestibule');
 for(const side of [-1,1]){
  const glass=createPhysics({x:0,z:.5});for(let i=0;i<160;i++)glass.step(.025,{dx:side});
  check(Math.abs(glass.position.x)<=P.sideX-P.sideThickness/2-.18+.001,place+' vestibule glazing blocks a full-sized body');
  const jamb=createPhysics({x:0,z:-2.7});for(let i=0;i<160;i++)jamb.step(.025,{dx:side});
  check(Math.abs(jamb.position.x)<=2.4-.18+.001,place+' deep stone entrance jambs are solid');
 }
 for(const wall of walls.filter(w=>w.id.includes('ocean')||w.id.includes('front'))){
  const side=Math.sign(wall.minX),body=createPhysics({x:side*11.7,z:(wall.minZ+wall.maxZ)/2});
  for(let i=0;i<100;i++)body.step(.025,{dx:side});
  check(!insideBody(body.position,wall),place+' '+wall.id+' has a real body collision');
  check(Math.abs(body.position.x)<12.28-.18+.003,place+' the historic return stops movement before its stone face');
 }
 const jump=createPhysics({x:0,z:.5});check(jump.jump(),place+' deliberate jump beneath the new glass canopy starts');let peak=-Infinity;
 for(let i=0;i<240;i++){jump.step(1/120);peak=Math.max(peak,jump.position.y+1.74);}
 check(peak<=P.roofY-P.roofThickness/2+.00001,place+' a high-speed jump cannot tunnel through the actual glass canopy');
 check(jump.diagnostics().headContacts>0&&jump.diagnostics().grounded,place+' canopy contact returns the visitor to the floor');
 const fall=createPhysics({x:0,y:6,z:.5});for(let i=0;i<240;i++)fall.step(1/120);
 check(fall.diagnostics().grounded&&Math.abs(fall.position.y-P.maxY)<.0001,place+' the canopy has a real top support when landing from above');
 const exhibition=place==='new-york'?NEW_YORK_EXHIBITION_WALLS:GALLERY_EXHIBITION_WALLS;
 for(const wall of exhibition){
  const approach=wall.approach||[Math.sign(wall.x)*6.3,1.65,wall.z],viewer={x:approach[0],y:approach[1],z:approach[2]};
  const body=createPhysics(place==='new-york'?NEW_YORK_LANDINGS[wall.floor]:{});
  follow(body,nav.route(eye(body.position),viewer),obstacles,place+' '+wall.id+' viewing aisle');
  for(const slot of wall.slots)for(const dy of [-slot.height/2,slot.height/2])for(const dz of [-slot.width/2,slot.width/2]){
   const point={x:slot.position[0],y:slot.position[1]+dy,z:slot.position[2]+dz};
   check(!obstacles.some(b=>crosses(viewer,point,b)),place+' old masonry leaves every reserved artwork corner visible');
  }
 }
 if(place==='new-york'){
  const ascending=createPhysics();
  for(let floor=1;floor<5;floor++){
   const landing=NEW_YORK_LANDINGS[floor],target={...landing,y:landing.y+1.74};
   follow(ascending,nav.route(eye(ascending.position),target),obstacles,'New York physical level '+floor);
   check(Math.abs(ascending.position.y-NEW_YORK_FLOORS[floor])<.02,'the retained walls preserve access to New York level '+floor);
  }
  follow(ascending,nav.route(eye(ascending.position),{x:0,y:1.65,z:15}),obstacles,'New York descent to the street');
 }
}
console.log('PASS '+checks+' heritage architecture navigation checks ('+steps+' physical steps)');
