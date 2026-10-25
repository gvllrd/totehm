import {GALLERY_LAYOUT,GALLERY_OBSTACLES} from './gallery-modern-layout.mjs';

const GROUND=GALLERY_LAYOUT.groundY,HEIGHT=GALLERY_LAYOUT.eyeHeight;
const BOUNDS=GALLERY_LAYOUT.bounds,RADIUS=.18,ROUTE_MARGIN=RADIUS,CORNER_MARGIN=.275,EPS=1e-7;
const JUMP_APEX=18000,FLIGHT_TIME=14;
const GRAVITY=8*JUMP_APEX/FLIGHT_TIME**2,JUMP_SPEED=4*JUMP_APEX/FLIGHT_TIME;
const finite=Number.isFinite;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const point=p=>p&&finite(p.x)&&finite(p.z);
const within=(x,z)=>finite(x)&&finite(z)&&x>=BOUNDS.minX&&x<=BOUNDS.maxX&&z>=BOUNDS.minZ&&z<=BOUNDS.maxZ;
function boxes(source){
 return (Array.isArray(source)?source:[]).filter(b=>b&&['minX','maxX','minZ','maxZ','minY','maxY'].every(k=>finite(b[k]))&&b.minX<b.maxX&&b.minZ<b.maxZ&&b.minY<b.maxY).map(b=>({...b}));
}
function inside(b,x,z,margin){return x>b.minX-margin+EPS&&x<b.maxX+margin-EPS&&z>b.minZ-margin+EPS&&z<b.maxZ+margin-EPS;}

// Rendering and movement read the same metre-sized wall and furniture boxes.
// All vertical contacts sweep the complete step, including the first fast
// centimetres of the deliberately very high outdoor jump.
export function createModernPhysics(initial={x:0,z:12},obstacles=GALLERY_OBSTACLES){
 const solids=boxes(obstacles),position={x:0,y:GROUND,z:12};
 let velocityY=0,grounded=true,jumps=0,landings=0,headContacts=0,support='ground';
 function validHorizontal(x,z,y){
  return within(x,z)&&!solids.some(b=>inside(b,x,z,RADIUS)&&y<b.maxY-EPS&&y+HEIGHT>b.minY+EPS);
 }
 function supportAt(x,z,y){
  let top=GROUND,id='ground';
  for(const b of solids)if(b.maxY<=y+EPS&&b.maxY>top&&inside(b,x,z,RADIUS)){top=b.maxY;id=b.id||'solid';}
  return{top,id};
 }
 function reset(next={}){
  const x=clamp(finite(next.x)?next.x:0,BOUNDS.minX,BOUNDS.maxX),z=clamp(finite(next.z)?next.z:12,BOUNDS.minZ,BOUNDS.maxZ);
  const y=finite(next.y)?Math.max(GROUND,next.y):GROUND;
  if(validHorizontal(x,z,y)){position.x=x;position.z=z;position.y=y;}
  else{
   // A restore is never permission to eject somebody above a table or roof.
   // Prefer the nearest free side at the requested height, then the entrance.
   const candidates=[];
   for(const b of solids)if(inside(b,x,z,RADIUS)&&y<b.maxY-EPS&&y+HEIGHT>b.minY+EPS){
    candidates.push({x:b.minX-RADIUS-.002,z},{x:b.maxX+RADIUS+.002,z},{x,z:b.minZ-RADIUS-.002},{x,z:b.maxZ+RADIUS+.002});
   }
   candidates.push({x:0,z:12});candidates.sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z));
   const safe=candidates.find(p=>validHorizontal(p.x,p.z,y));
   if(safe){position.x=safe.x;position.z=safe.z;position.y=y;}
  }
  velocityY=0;const floor=supportAt(position.x,position.z,position.y);
  grounded=Math.abs(position.y-floor.top)<EPS;support=grounded?floor.id:null;
  return position;
 }
 function jump(){if(!grounded)return false;velocityY=JUMP_SPEED;grounded=false;support=null;jumps++;return true;}
 function relocateHorizontal(next={}){
  const x=finite(next.x)?clamp(next.x,BOUNDS.minX,BOUNDS.maxX):position.x;
  const z=finite(next.z)?clamp(next.z,BOUNDS.minZ,BOUNDS.maxZ):position.z;
  if(validHorizontal(x,z,position.y)){
   position.x=x;position.z=z;
   if(grounded){const floor=supportAt(x,z,position.y);if(Math.abs(floor.top-position.y)>EPS){grounded=false;support=null;}}
  }
  return position;
 }
 function step(dt,{dx=0,dz=0,guided=false}={}){
  const elapsed=finite(dt)?clamp(dt,0,.05):0;if(!elapsed)return position;
  dx=finite(dx)?dx:0;dz=finite(dz)?dz:0;
  const scale=Math.min(1,(guided?40:2.6)*elapsed/Math.max(Math.hypot(dx,dz),EPS));dx*=scale;dz*=scale;
  const steps=Math.max(1,Math.ceil(elapsed*240),Math.ceil(Math.hypot(dx,dz)/.02)),h=elapsed/steps;
  for(let i=0;i<steps;i++){
   const oldY=position.y,oldVelocity=velocityY;
   if(!grounded){
    let nextY=oldY+oldVelocity*h-.5*GRAVITY*h*h,nextVelocity=oldVelocity-GRAVITY*h;
    if(oldVelocity>0){
     const upTime=Math.min(h,oldVelocity/GRAVITY),peak=oldY+oldVelocity*upTime-.5*GRAVITY*upTime*upTime;
     let ceiling=Infinity;
     for(const b of solids)if(inside(b,position.x,position.z,RADIUS)&&oldY+HEIGHT<=b.minY+EPS&&peak+HEIGHT>=b.minY-EPS)ceiling=Math.min(ceiling,b.minY);
     if(ceiling<Infinity){nextY=ceiling-HEIGHT;nextVelocity=0;headContacts++;}
    }
    if(nextVelocity<=0){
     let top=GROUND,id='ground';
     for(const b of solids)if(inside(b,position.x,position.z,RADIUS)&&oldY>=b.maxY-EPS&&nextY<=b.maxY+EPS&&b.maxY>top){top=b.maxY;id=b.id||'solid';}
     if(oldY>=top-EPS&&nextY<=top+EPS){nextY=top;nextVelocity=0;grounded=true;support=id;landings++;}
    }
    position.y=nextY;velocityY=nextVelocity;
   }
   const x=position.x+dx/steps,z=position.z+dz/steps;
   if(validHorizontal(x,position.z,position.y))position.x=x;
   if(validHorizontal(position.x,z,position.y))position.z=z;
   if(grounded){const floor=supportAt(position.x,position.z,position.y);if(Math.abs(floor.top-position.y)>EPS){grounded=false;support=null;}}
  }
  return position;
 }
 function diagnostics(){return{grounded,feetHeight:+position.y.toFixed(4),velocityY:+velocityY.toFixed(4),support,supportColumn:null,jumps,landings,headContacts,onRoof:support==='gallery-roof',jumpSpeed:JUMP_SPEED,gravity:GRAVITY,jumpApex:JUMP_APEX,flightTime:FLIGHT_TIME,bodyRadius:RADIUS,bodyHeight:HEIGHT,obstacleCount:solids.length};}
 reset(initial);return{position,jump,step,reset,relocateHorizontal,diagnostics};
}

// Liang–Barsky against the *open* body-expanded box. Endpoints use the same
// clearance as manual movement so a visitor beside a wall can always return.
// Graph corners retain extra room rather than cutting close to furniture.
function crosses(a,b,box,margin){
 let low=0,high=1;
 for(const [axis,min,max] of [['x',box.minX-margin+EPS,box.maxX+margin-EPS],['z',box.minZ-margin+EPS,box.maxZ+margin-EPS]]){
  const d=b[axis]-a[axis];
  if(Math.abs(d)<EPS){if(a[axis]<=min||a[axis]>=max)return false;continue;}
  const u=(min-a[axis])/d,v=(max-a[axis])/d;
  low=Math.max(low,Math.min(u,v));high=Math.min(high,Math.max(u,v));if(low>=high)return false;
 }
 return high>0&&low<1;
}
export function createModernWalkway(obstacles=GALLERY_OBSTACLES){
 const solids=boxes(obstacles).filter(b=>b.minY<GROUND+HEIGHT-EPS&&b.maxY>GROUND+EPS);
 const allowed=(x,z)=>within(x,z)&&!solids.some(b=>inside(b,x,z,ROUTE_MARGIN));
 const clear=(a,b)=>!!(point(a)&&point(b)&&allowed(a.x,a.z)&&allowed(b.x,b.z)&&!solids.some(box=>crosses(a,b,box,ROUTE_MARGIN)));
 const candidates=[];
 for(const b of solids)for(const x of [b.minX-CORNER_MARGIN,b.maxX+CORNER_MARGIN])for(const z of [b.minZ-CORNER_MARGIN,b.maxZ+CORNER_MARGIN]){
  if(allowed(x,z)&&!candidates.some(p=>Math.hypot(p.x-x,p.z-z)<.001))candidates.push({x,z});
 }
 for(const x of [BOUNDS.minX,BOUNDS.maxX])for(const z of [BOUNDS.minZ,BOUNDS.maxZ])if(allowed(x,z))candidates.push({x,z});
 const fixedEdges=candidates.map(()=>[]);
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++)if(clear(candidates[i],candidates[j])){
  const distance=Math.hypot(candidates[i].x-candidates[j].x,candidates[i].z-candidates[j].z);fixedEdges[i].push([j,distance]);fixedEdges[j].push([i,distance]);
 }
 function route(from,to){
  if(!point(from)||!point(to)||!allowed(from.x,from.z)||!allowed(to.x,to.z))return null;
  if(clear(from,to))return[from,to];
  const nodes=[...candidates,from,to],start=nodes.length-2,end=start+1;
  const edges=fixedEdges.map(row=>row.slice());edges.push([],[]);
  for(const dynamic of [start,end])for(let i=0;i<candidates.length;i++)if(clear(nodes[dynamic],nodes[i])){
   const distance=Math.hypot(nodes[dynamic].x-nodes[i].x,nodes[dynamic].z-nodes[i].z);edges[dynamic].push([i,distance]);edges[i].push([dynamic,distance]);
  }
  const cost=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set();cost[start]=0;
  while(visited.size<nodes.length){
   let current=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(current<0||cost[i]<cost[current]))current=i;
   if(current<0||cost[current]===Infinity)return null;if(current===end)break;visited.add(current);
   for(const [next,length] of edges[current])if(cost[current]+length<cost[next]){cost[next]=cost[current]+length;previous[next]=current;}
  }
  if(!finite(cost[end]))return null;
  const path=[];for(let at=end;at>=0;at=previous[at]){path.unshift(nodes[at]);if(at===start)break;}
  // Remove graph corners that no longer protect against an obstacle.
  for(let i=0;i<path.length-2;)if(clear(path[i],path[i+2]))path.splice(i+1,1);else i++;
  return path;
 }
 return{allowed,clear,route,portalAt:()=>null,diagnostics:()=>({kind:'modern-gallery-walkway',obstacles:solids.length,waypoints:candidates.length,margin:ROUTE_MARGIN,bounds:{...BOUNDS}})};
}
