import assert from 'node:assert/strict';
import {allowed,clear,route} from '../../space/gallery-spatial-path.mjs';

let checks=0,samples=0;
const point=(x,z)=>({x,z});
const check=(condition,message)=>{assert(condition,message);checks++;};

// Independent floor specification: this deliberately does not import obstacles
// or use clear() to establish whether a routed point is safe.
function floor(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z)||x < -21||x > 21||z < -660||z > 24)return false;
 if(z<=-17&&Math.abs(x)>=9)return false;
 if(x>=3&&x<=9&&Math.abs(z)<=.5)return false;
 if(x>=-16.2&&x<=-5.8&&z>=-5.3&&z<=-4.7)return false;
 return true;
}
function verify(from,to){
 const path=route(from,to);
 assert(path&&path.length>=2,`No route ${JSON.stringify(from)} → ${JSON.stringify(to)}`);
 assert.deepEqual(path[0],from);assert.deepEqual(path.at(-1),to);
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.075));
  for(let j=0;j<=count;j++){
   const t=j/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
   assert(floor(x,z),`Route leaves the floor at ${x},${z}`);samples++;
  }
 }
 checks++;return path;
}

const entry=point(0,18),paper=point(6,10),lisbon=point(-11,7);
const origins=Array.from({length:20},(_,index)=>point(0,-25-index*32));
const stations=[entry,paper,lisbon,...origins,
 ...[-20,-17,-5,0,2,10,20].flatMap(x=>[20,2,-2,-10,-16.5].map(z=>point(x,z))).filter(p=>floor(p.x,p.z)),
 point(-8.75,-17.25),point(8.75,-17.25),point(-8.75,-659.75),point(8.75,-659.75)];

for(const from of stations)for(const to of stations)verify(from,to);
for(let i=1;i<origins.length;i++){
 const path=verify(origins[i-1],origins[i]);
 check(path.length===2&&path.every(p=>p.x===0),`Origins ${i} → ${i+1} remains straight`);
 check(Math.abs(path[1].z-path[0].z)===32,`Origins ${i} → ${i+1} advances exactly 32 m`);
}
check(verify(entry,paper).length===2,'The paper can be approached directly from arrival');
check(verify(entry,lisbon).length===2,'The controller can be approached directly from arrival');
check(verify(point(6,2),point(6,-2)).length>2,'The route passes around the physical paper instead of through it');
check(verify(point(-11,0),point(-11,-10)).length>2,'The route passes around the street console');
check(verify(point(-20,-10),origins[19]).some(p=>p.z>-17),'The outer plaza joins the promenade through its opening');

for(let x=-22;x<=22;x+=.5)for(let z=-20;z<=25;z+=.5){
 assert.equal(allowed(x,z),floor(x,z),`Plaza floor ${x},${z}`);samples++;
}
for(const x of [-21,-10,-9,-8.99,0,8.99,9,10,21])for(const z of [-660.01,-660,-659,-633,-25,-17.01,-17,-16.99]){
 assert.equal(allowed(x,z),floor(x,z),`Promenade boundary ${x},${z}`);samples++;
}
checks++;
for(const [a,b] of [[point(6,1),point(6,-1)],[point(-11,-4),point(-11,-6)],
 [point(-20,-16),point(-8,-100)],[point(20,-16),point(8,-100)]]){
 check(!clear(a,b),'A direct segment cannot clip a physical sculpture or promenade corner');
 verify(a,b);
}
for(const bad of [NaN,Infinity,-Infinity,undefined,null,'0']){
 check(!allowed(bad,0)&&!allowed(0,bad),'Nonfinite/nonnumeric coordinates are rejected');
 check(route(entry,point(bad,0))===null&&route(entry,point(0,bad))===null,'Invalid destinations cannot be routed');
}
for(const bad of [null,undefined,{},[],{x:0},{z:0}]){
 check(route(bad,entry)===null&&!clear(bad,entry),'Malformed starts are rejected');
 check(route(entry,bad)===null&&!clear(entry,bad),'Malformed destinations are rejected');
}
for(const blocked of [point(6,0),point(-11,-5),point(10,-30),point(0,-661),point(-22,20)]){
 check(!allowed(blocked.x,blocked.z)&&route(entry,blocked)===null,'Obstacles and outer void are unreachable');
}
const from=point(6,2),to=point(6,-2),before=JSON.stringify([from,to]);verify(from,to);
check(JSON.stringify([from,to])===before,'Route requests do not mutate caller coordinates');
console.log(`PASS ${checks} spatial navigation checks (${samples} independently sampled floor points)`);
