// Ground geometry is specified independently of the route implementation.
// No renderer, account or network is needed for these navigation contracts.
import assert from 'node:assert/strict';
import {createTempleWalkway} from '../../space/gallery-temple-navigation.mjs';

const nav=createTempleWalkway(),gates=[-9,0,9];
const beds=[-11,11].flatMap(x=>[-3,5,13].map(z=>({x,z})));
const point=(x,z)=>({x,z});
let checks=0,samples=0;
const check=(value,message)=>{assert(value,message);checks++;};

function floor(x,z,{guided=false}={}){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>14||z < -13||z>16)return false;
 if(guided&&z < -11.4)return false;
 if(z < -11.4&&!gates.some(gate=>Math.abs(x-gate)<1.7))return false;
 return beds.every(bed=>Math.hypot(x-bed.x,z-bed.z)>2.7);
}
function verify(from,to){
 const route=nav.route(from,to);
 assert(route&&route.length>=2,`No safe route ${JSON.stringify(from)} → ${JSON.stringify(to)}`);
 assert.equal(route[0],from,'Route preserves the caller start');
 assert.equal(route.at(-1),to,'Route reaches the requested destination');
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.025));
  for(let j=0;j<=steps;j++){
   const t=j/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
   assert(floor(x,z,{guided:true}),`Route leaves safe walking stone at ${x}, ${z}`);samples++;
   assert.equal(nav.portalAt(x,z),null,'A guided route cannot launch an experience');
  }
 }
 checks++;return route;
}

const entry=point(0,12),approaches=gates.map(x=>point(x,-10.6));
const stations=[entry,...approaches,point(0,0),point(0,16),
 point(-7,-6),point(7,-6),point(-7,8),point(7,8),
 point(-13.9,0),point(13.9,0),point(-13.9,9),point(13.9,9),
 point(-13.6,8.4),point(13.6,8.4)];
for(const from of stations)for(const to of stations)verify(from,to);
for(const to of approaches){
 const route=verify(entry,to);
 check(route.at(-1).z===-10.6,'Guided doorway selection stops in front of the threshold');
}

for(const bed of beds){
 check(!nav.allowed(bed.x,bed.z),'The planted bed centre is not walking stone');
 check(!nav.allowed(bed.x+2.69,bed.z),'Plantation setback has its full 2.7 m radius');
 check(nav.allowed(bed.x+Math.sign(-bed.x)*2.71,bed.z),'Stone just inside the central aisle remains available');
}
for(const [x,z] of [[-14,0],[14,0],[0,16],[0,-11.4],[-9,-13],[0,-13],[9,-13]]){
 check(nav.allowed(x,z)===floor(x,z),'Physical walking includes the authored floor edge');
}
for(const [x,z] of [[14.01,0],[-14.01,0],[0,16.01],[0,-13.01],[4,-12],[-4,-12]]){
 check(!nav.allowed(x,z),'The platform edge and stone between arches stop physical walking');
}
for(let room=0;room<gates.length;room++){
 const x=gates[room];
 check(nav.portalAt(x,-11.99)===null,'Near-door ambience does not itself enter an experience');
 check(nav.portalAt(x,-12)===room,'Crossing the true sill identifies the correct independent experience');
 check(nav.portalAt(x,-12.9)===room,'The interior of the opening keeps its destination');
 check(nav.portalAt(x+1.71,-12)===null,'Walking into the stone jamb cannot enter a neighbouring experience');
 check(nav.route(entry,point(x,-12))===null,'Automatic floor destinations cannot cross the threshold');
}
check(!nav.clear(point(-14,-3),point(-7,-3)),'A direct walk through a planting is obstructed');
check(verify(point(-14,-3),point(-7,-3)).length>2,'Guidance passes around the planting instead of through it');

for(const value of [NaN,Infinity,-Infinity,undefined,null,'0']){
 check(!nav.allowed(value,0)&&!nav.allowed(0,value),'Invalid physical positions are rejected');
 check(nav.route(entry,point(value,0))===null&&nav.route(entry,point(0,value))===null,'Invalid guide destinations are rejected');
 check(nav.portalAt(value,-12)===null&&nav.portalAt(0,value)===null,'Invalid portal coordinates never select an experience');
}
for(const malformed of [null,undefined,{},[],{x:0},{z:0}]){
 check(nav.route(entry,malformed)===null&&nav.route(malformed,entry)===null,'Malformed route endpoints are rejected');
}
const from=point(-14,-3),to=point(-7,-3),snapshot=JSON.stringify([from,to]);verify(from,to);
check(JSON.stringify([from,to])===snapshot,'Route planning does not mutate camera destinations');
console.log(`PASS ${checks} temple navigation checks (${samples} independently sampled floor points)`);
