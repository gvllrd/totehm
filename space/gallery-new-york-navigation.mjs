import {NEW_YORK_LAYOUT as L,NEW_YORK_FLOORS as FLOORS,NEW_YORK_RAMPS as RAMPS,NEW_YORK_RAMP_TURNS as TURNS,NEW_YORK_FLOOR_RECTS as RECTS,NEW_YORK_LANDINGS as LANDINGS,NEW_YORK_GROUND_OBSTACLES as FURNITURE,newYorkSurfacesAt,newYorkRoofHeight} from './gallery-new-york-layout.mjs';

const H=L.eyeHeight,R=.18,EPS=1e-5,G=8*18000/14**2,V=4*18000/14;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),finite=Number.isFinite;
const inside=(r,x,z,margin=0)=>x>r.minX-margin+EPS&&x<r.maxX+margin-EPS&&z>r.minZ-margin+EPS&&z<r.maxZ+margin-EPS;
const bounds=(x,z)=>finite(x)&&finite(z)&&x>=L.bounds.minX&&x<=L.bounds.maxX&&z>=L.bounds.minZ&&z<=L.bounds.maxZ;
const ground=FLOORS[0];
const WALLS=[
 {id:'ny-west',minX:-13.2,maxX:-12.9,minZ:-17.2,maxZ:-1.8,minY:ground,maxY:21.51},
 {id:'ny-east',minX:12.9,maxX:13.2,minZ:-17.2,maxZ:-1.8,minY:ground,maxY:21.51},
 {id:'ny-back',minX:-13,maxX:13,minZ:-17.2,maxZ:-16.8,minY:ground,maxY:21.51},
 ...[[-13,-2.4],[2.4,13]].map(([minX,maxX])=>({id:'ny-front',minX,maxX,minZ:-2.2,maxZ:-1.8,minY:ground,maxY:21.51})),
 {id:'ny-entry-lintel',minX:-2.4,maxX:2.4,minZ:-2.2,maxZ:-1.8,minY:3.1,maxY:21.51},
 {id:'ny-upper-west',minX:-10.2,maxX:-9.9,minZ:-16.1,maxZ:-3.9,minY:21.51,maxY:27},
 {id:'ny-upper-east',minX:9.9,maxX:10.2,minZ:-16.1,maxZ:-3.9,minY:21.51,maxY:27},
 {id:'ny-upper-back',minX:-10,maxX:10,minZ:-16.2,maxZ:-15.9,minY:21.51,maxY:27},
 {id:'ny-upper-front',minX:-10,maxX:10,minZ:-4.1,maxZ:-3.9,minY:21.51,maxY:27}
];
const SOLIDS=[...WALLS,...FURNITURE];
const horizontalClear=(x,z,y)=>bounds(x,z)&&!SOLIDS.some(b=>inside(b,x,z,R)&&y<b.maxY-EPS&&y+H>b.minY+EPS);
function roofSurface(x,z){
 if(x< -13||x>13||z< -17||z> -2)return null;
 const o=L.smokeOutlet;if(((x-o.x)/o.radius)**2+((z-o.z)/o.radiusZ)**2<1)return null;
 return{y:newYorkRoofHeight(x,z),id:'ny-roof',roof:true};
}
function surfaces(x,z){
 const result=newYorkSurfacesAt(x,z),roof=roofSurface(x,z);if(roof)result.push(roof);
 for(const wall of WALLS)if(inside(wall,x,z,R))result.push({y:wall.maxY,id:'ny-roof',roof:true});
 return result;
}
function nearby(x,z,y,step=.13){return surfaces(x,z).filter(s=>s.y<=y+step&&s.y>=y-.23).sort((a,b)=>b.y-a.y)[0]??null;}
function ceilingAt(x,z,y){
 let ceiling=Infinity;
 for(const b of SOLIDS)if(inside(b,x,z,R)&&b.minY>=y+H-EPS)ceiling=Math.min(ceiling,b.minY);
 for(const s of surfaces(x,z))if(s.y-.2>=y+H-EPS)ceiling=Math.min(ceiling,s.y-.2);
 return ceiling;
}
function surfaceCollision(x,z,y){return surfaces(x,z).some(s=>s.y>ground+.1&&y<s.y-.21&&y+H>s.y-.2+EPS);}

export function createNewYorkPhysics(initial={x:0,z:15}){
 const position={x:0,y:ground,z:15};let grounded=true,velocityY=0,support='ground',jumps=0,landings=0,headContacts=0;
 function reset(next={}){
  let x=finite(next.x)?next.x:0,z=finite(next.z)?next.z:15,y=finite(next.y)?Math.max(ground,next.y):ground;
  if(!horizontalClear(x,z,y)||surfaceCollision(x,z,y)){x=0;z=15;y=ground;}
  Object.assign(position,{x,y,z});velocityY=0;const s=nearby(x,z,y,.02);grounded=!!s&&Math.abs(s.y-y)<.03;support=grounded?s.id:null;return position;
 }
 function moveHorizontal(x,z){
  if(!horizontalClear(x,z,position.y))return false;
  let y=position.y,s=null;
  if(grounded){
   s=nearby(x,z,y);
   if(!s){if(support!=='ny-roof')return false;grounded=false;velocityY=0;support=null;}
   else y=s.y;
  }
  if(!horizontalClear(x,z,y)||surfaceCollision(x,z,y))return false;
  // A foot cylinder cannot leave a guarded gallery or an inclined aisle.
  if(grounded&&support!=='ny-roof'&&y>ground+.25){
   const footprint=[[R,0],[-R,0],[0,R],[0,-R]];
   if(footprint.some(([dx,dz])=>!nearby(x+dx,z+dz,y,.13)))return false;
  }
  position.x=x;position.z=z;position.y=y;if(s)support=s.id;return true;
 }
 function relocateHorizontal(next={}){
  const x=finite(next.x)?next.x:position.x,z=finite(next.z)?next.z:position.z;
  const requested=finite(next.y)?next.y-H:position.y;
  const s=surfaces(x,z).find(s=>Math.abs(s.y-requested)<.08);
  if(grounded&&s&&horizontalClear(x,z,s.y)&&!surfaceCollision(x,z,s.y)){Object.assign(position,{x,y:s.y,z});support=s.id;velocityY=0;return position;}
  if(!grounded&&horizontalClear(x,z,position.y)&&!surfaceCollision(x,z,position.y)){position.x=x;position.z=z;}
  return position;
 }
 function jump(){if(!grounded)return false;velocityY=V;grounded=false;support=null;jumps++;return true;}
 function step(dt,{dx=0,dz=0,guided=false}={}){
  dt=finite(dt)?clamp(dt,0,.05):0;if(!dt)return position;
  dx=finite(dx)?dx:0;dz=finite(dz)?dz:0;const scale=Math.min(1,(guided?40:2.6)*dt/Math.max(Math.hypot(dx,dz),EPS));dx*=scale;dz*=scale;
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.018),Math.ceil(dt*240)),h=dt/count;
  for(let i=0;i<count;i++){
   if(!grounded){
    const old=position.y,v=velocityY;let next=old+v*h-.5*G*h*h,nv=v-G*h;
    if(v>0){const ceiling=ceilingAt(position.x,position.z,old);if(next+H>=ceiling){next=ceiling-H;nv=0;headContacts++;}}
    if(nv<=0){
     const contacts=surfaces(position.x,position.z).filter(s=>s.y<=old+EPS&&s.y>=next-EPS);
     contacts.sort((a,b)=>b.y-a.y);if(contacts[0]){next=contacts[0].y;nv=0;grounded=true;support=contacts[0].id;landings++;}
    }
    position.y=next;velocityY=nv;
   }
   moveHorizontal(position.x+dx/count,position.z);moveHorizontal(position.x,position.z+dz/count);
  }
  return position;
 }
 reset(initial);
 return{position,reset,relocateHorizontal,jump,step,diagnostics:()=>({kind:'new-york-ramp-physics',grounded,feetHeight:+position.y.toFixed(4),velocityY:+velocityY.toFixed(4),support,jumps,landings,headContacts,onRoof:support==='ny-roof',bodyRadius:R,bodyHeight:H,levels:5,ramps:RAMPS.length,stairs:0,jumpSpeed:V,gravity:G,jumpApex:18000,flightTime:14,level:Math.max(0,Math.min(4,Math.round((position.y-ground)/5.4)))})};
}

// Visibility graphs stay on the actual stone gallery surfaces. The only
// inter-floor edges are the centre lines of the physical inclined aisles.
export function createNewYorkWalkway(){
 const asEye=p=>({x:p.x,y:p.y+H,z:p.z});
 const feet=p=>finite(p.y)?p.y-H:ground;
 function allowed(x,z,y=ground){return horizontalClear(x,z,y)&&!surfaceCollision(x,z,y)&&!!nearby(x,z,y,.1);}
 function clearAt(a,b,y){
  const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.08));
  for(let i=0;i<=count;i++){
   const t=i/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
   if(!allowed(x,z,y))return false;
   if([[0,0],[R,0],[-R,0],[0,R],[0,-R]].some(([dx,dz])=>!surfaces(x+dx,z+dz).some(s=>Math.abs(s.y-y)<.035)))return false;
  }return true;
 }
 function localRoute(from,to,y){
  if(!allowed(from.x,from.z,y)||!allowed(to.x,to.z,y))return null;
  if(clearAt(from,to,y))return[{...from,y:y+H},{...to,y:y+H}];
  const candidates=[];
  const level=Math.round((y-ground)/5.4);
  for(const r of RECTS.filter(r=>r.floor===level))for(const x of [r.minX+.3,(r.minX+r.maxX)/2,r.maxX-.3])for(const z of [r.minZ+.3,(r.minZ+r.maxZ)/2,r.maxZ-.3])if(allowed(x,z,y))candidates.push({x,y:y+H,z});
  if(level===0){
   for(const b of [...FURNITURE,...WALLS])for(const x of [b.minX-.3,b.maxX+.3])for(const z of [b.minZ-.3,b.maxZ+.3])if(allowed(x,z,y))candidates.push({x,y:y+H,z});
   for(const x of [-14,0,10.7,14])for(const z of [-17.5,-3.4,0,12,15])if(allowed(x,z,y))candidates.push({x,y:y+H,z});
  }
  const nodes=[{...from,y:y+H},...candidates,{...to,y:y+H}],end=nodes.length-1,dist=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),done=new Set();dist[0]=0;
  while(done.size<nodes.length){let i=-1;for(let n=0;n<nodes.length;n++)if(!done.has(n)&&(i<0||dist[n]<dist[i]))i=n;if(i<0||!finite(dist[i]))return null;if(i===end)break;done.add(i);
   for(let j=0;j<nodes.length;j++)if(!done.has(j)&&clearAt(nodes[i],nodes[j],y)){const cost=dist[i]+Math.hypot(nodes[i].x-nodes[j].x,nodes[i].z-nodes[j].z);if(cost<dist[j]){dist[j]=cost;prev[j]=i;}}
  }
  const path=[];for(let i=end;i>=0;i=prev[i]){path.unshift(nodes[i]);if(i===0)break;}return path;
 }
 // Every centreline endpoint is distinct in 3D even when the plan repeats.
 const chain=[RAMPS[0].from];
 for(let i=0;i<RAMPS.length;i++){const ramp=RAMPS[i];if(i&&Math.hypot(chain.at(-1).x-ramp.from.x,chain.at(-1).z-ramp.from.z)>.01)chain.push(ramp.from);chain.push(ramp.to);}
 function anchor(p){
  const y=feet(p),level=Math.round((y-ground)/5.4);
  if(level>=0&&level<5&&Math.abs(y-FLOORS[level])<.14){
   const route=localRoute(p,LANDINGS[level],FLOORS[level]);if(route){let index=chain.findIndex(q=>Math.hypot(q.x-LANDINGS[level].x,q.y-LANDINGS[level].y,q.z-LANDINGS[level].z)<.01);return{index,route};}
  }
  let best=null;
  for(let i=0;i<chain.length-1;i++){
   const a=chain[i],b=chain[i+1],dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;if(len2<.01)continue;
   const t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/len2,0,1),q={x:a.x+dx*t,y:a.y+(b.y-a.y)*t,z:a.z+dz*t};
   const distance=Math.hypot(p.x-q.x,y-q.y,p.z-q.z);
   if(distance<1.2&&(!best||distance<best.distance))best={index:i,t,point:q,distance};
  }
  return best?{...best,route:[{...p},asEye(best.point)]}:null;
 }
 function route(from,to){
  if(!from||!to||!finite(from.x)||!finite(from.z)||!finite(to.x)||!finite(to.z))return null;
  const fy=feet(from),ty=feet(to);
  if(Math.abs(fy-ty)<.12){const direct=localRoute(from,to,(fy+ty)/2);if(direct)return direct;}
  const a=anchor(from),b=anchor(to);if(!a||!b)return null;
  const av=a.index+(a.t??0),bv=b.index+(b.t??0),middle=[];
  if(av<=bv){for(let i=Math.floor(av)+1;i<=Math.floor(bv);i++)middle.push(asEye(chain[i]));}
  else{for(let i=Math.ceil(av)-1;i>=Math.ceil(bv);i--)middle.push(asEye(chain[i]));}
  return [...a.route,...middle,...b.route.slice().reverse()].filter((p,i,array)=>!i||Math.hypot(p.x-array[i-1].x,p.y-array[i-1].y,p.z-array[i-1].z)>.001);
 }
 return{allowed,clear:(a,b)=>Math.abs(feet(a)-feet(b))<.12&&clearAt(a,b,feet(a)),route,portalAt:()=>null,floorAt:(x,z,y=ground)=>nearby(x,z,y),diagnostics:()=>({kind:'new-york-five-floor-ramp-walkway',floors:5,ramps:RAMPS.length,stairs:0,continuousAscent:true,eyeCoordinates:true})};
}
