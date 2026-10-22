import assert from 'node:assert/strict';
import {createTemplePhysics} from '../../space/gallery-temple-physics.mjs';
import {createTempleWalkway} from '../../space/gallery-temple-navigation.mjs';

let checks=0,steps=0;
const check=(condition,message)=>{assert(condition,message);checks++;};
const near=(actual,expected,epsilon=1e-6)=>Math.abs(actual-expected)<=epsilon;
const tick=(p,dt,input)=>{steps++;return p.step(dt,input);};
const state=p=>p.diagnostics();

// Independent analytic solution, rather than the implementation's constants.
for(const fps of [20,30,60,120,240]){
 const p=createTemplePhysics({x:0,z:0});check(p.jump(),'Ground launches a jump');
 let peak=-Infinity;
 for(let n=1;n<=fps;n++){
  tick(p,1/fps);peak=Math.max(peak,p.position.y);
  const t=n/fps;check(near(p.position.y,-.09+16*t-6*t*t,2e-6),`Ballistic position at ${fps}Hz, t=${t}`);
  check(!p.jump(),'A held/repeated key cannot add a second airborne impulse');
 }
 check(near(p.position.y,9.91,2e-6),'One second reaches the analytic height');
 for(let n=0;n<fps*2;n++){tick(p,1/fps);peak=Math.max(peak,p.position.y);}
 check(state(p).grounded&&near(p.position.y,-.09),'The complete jump returns to real stone');
 check(Math.abs(peak-10.5766666667)<.004,'Apex exceeds the column top without unlimited flight');
 check(state(p).jumps===1&&state(p).landings===1,'One impulse produces one landing');
}

// Every column must be physically reachable with ordinary air steering.
for(const side of [-1,1])for(const z of [-12,-4,4,12]){
 const p=createTemplePhysics({x:side*13.3,z});p.jump();
 for(let i=0;i<114;i++)tick(p,1/120);
 let landedAt=null;
 for(let i=0;i<240;i++){
  tick(p,1/120,{dx:side*2.6/120});
  if(state(p).grounded){landedAt=(i+115)/120;break;}
 }
 check(state(p).supportColumn!==null,`Reach the top at ${side*15},${z}`);
 check(near(p.position.y,9.52),'Column reception uses its actual top surface');
 check(Math.abs(landedAt-1.753)<1/120,'Descending top crossing agrees with the independent quadratic');
 const stable={...p.position};
 for(let i=0;i<120;i++)tick(p,1/120);
 check(JSON.stringify(p.position)===JSON.stringify(stable),'Standing on the capital stays stable');
 check(p.jump(),'A column is a real support for another jump');
 for(let i=0;i<400;i++)tick(p,1/120,{dx:-side*2.6/120});
 check(state(p).grounded&&state(p).supportColumn===null&&near(p.position.y,-.09),'Leap away from a column and land on the terrace');

 p.reset({x:side*15,z,y:9.52});
 for(let i=0;i<240;i++)tick(p,1/120,{dx:-side*2.6/120});
 check(state(p).supportColumn===null&&near(p.position.y,-.09),'Walking off the edge falls without sticking or tunnelling');
}

// Capitals and arches stop the head, not just horizontal foot movement.
for(const side of [-1,1]){
 const p=createTemplePhysics({x:side*13.9,z:12});p.jump();let max=-Infinity;
 for(let i=0;i<360;i++){tick(p,1/120);max=Math.max(max,p.position.y);}
 check(max+1.74<=9.155+1e-6,'A jump below a projecting capital cannot pass through its underside');
 check(state(p).grounded&&near(p.position.y,-.09),'A ceiling contact returns to the floor');
}
for(const x of [-9,0,9]){
 const p=createTemplePhysics({x,z:-12});p.jump();let max=-Infinity;
 for(let i=0;i<400;i++){tick(p,1/120);max=Math.max(max,p.position.y);}
 check(max+1.74<=10.725+1e-6,'The real arched opening acts as a ceiling');
 check(state(p).grounded&&near(p.position.y,-.09),'An arch ceiling does not leave the player hovering');
}

for(const side of [-1,1]){
 const p=createTemplePhysics({x:side*13.3,z:4});
 for(let i=0;i<240;i++)tick(p,1/120,{dx:side*2.6/120});
 check(Math.abs(p.position.x-side*15)>=.98-1e-6,'A shaft cannot be entered by ground movement');
}
for(const x of [-9,0,9]){
 const p=createTemplePhysics({x:x+2.7,z:-10});
 for(let i=0;i<240;i++)tick(p,1/120,{dz:-2.6/120});
 check(p.position.z>=-11.19-.03,'Every separate stone jamb blocks a body approaching its face');
}

for(const input of [{dx:2.6},{dx:-2.6},{dz:2.6},{dz:-2.6},{dx:1,dz:1}]){
 const p=createTemplePhysics({x:0,z:0});
 for(let i=0;i<4000;i++){tick(p,1/120,input);if(i%120===0)p.jump();}
 check(Math.abs(p.position.x)<=15.8&&p.position.z>=-13&&p.position.z<=16,'Long walking/jumping cannot leave the stone footprint');
 check(p.position.y>=-.09&&Number.isFinite(p.position.y),'No trajectory falls under the terrace');
}

const invalid=createTemplePhysics();
for(const bad of [NaN,Infinity,-Infinity,undefined,null,'0']){
 const before={...invalid.position};tick(invalid,bad,{dx:Infinity,dz:NaN});
 check(JSON.stringify(invalid.position)===JSON.stringify(before),'Invalid or absent time never corrupts movement');
}
invalid.jump();const before={...invalid.position};tick(invalid,600,{dx:1e8,dz:1e8});
check(invalid.position.y-before.y<.81,'A resumed long frame is bounded to 50 ms');
check(Math.hypot(invalid.position.x-before.x,invalid.position.z-before.z)<=.13+1e-7,'A long frame cannot tunnel through geometry');
const paused={...invalid.position};for(let i=0;i<100;i++)tick(invalid,0,{dx:1,dz:1});
check(JSON.stringify(invalid.position)===JSON.stringify(paused),'A paused physics clock freezes the entire jump');

const guided=createTemplePhysics({x:0,z:12});tick(guided,.05,{dx:1,guided:true});
check(near(guided.position.x,1),'Guidance preserves existing smooth travel durations');
const nav=createTempleWalkway();
for(const side of [-1,1])for(const z of [-12,-4,4,12]){
 const start={x:side*15,y:11.26,z},end={x:0,z:12},route=nav.route(start,end);
 check(route&&route[0]===start&&route.at(-1)===end,'Guidance can depart every column');
 check(route.some(p=>Math.abs(p.x)<=13.3),'Guidance leaves the column toward the safe central terrace');
 const p=createTemplePhysics({x:side*15,z,y:9.52});
 for(const target of route.slice(1)){
  for(let i=0;i<500&&Math.hypot(p.position.x-target.x,p.position.z-target.z)>.001;i++){
   const distance=Math.hypot(p.position.x-target.x,p.position.z-target.z),stride=Math.min(.25,distance);
   tick(p,.05,{dx:(target.x-p.position.x)/distance*stride,dz:(target.z-p.position.z)/distance*stride,guided:true});
  }
  check(Math.hypot(p.position.x-target.x,p.position.z-target.z)<.001,'The real collision engine can follow each outward guide segment');
 }
 for(let i=0;i<100;i++)tick(p,.05);
 check(near(p.position.y,-.09)&&state(p).grounded,'Guidance physically descends from every column to the floor');
}

for(const side of [-1,1]){
 const route=nav.route({x:side*13.9,y:11.26,z:-12},{x:0,z:12});
 check(route&&route.length>=3,'The inner edge of each rear capital also has a route home');
}

// The arches are freestanding. Walking behind or between them must never
// strand Home/overview on the rear paving or send a guide through a jamb.
const rearStarts=[
 ...[-13.3,-4.5,4.5,13.3].flatMap(x=>[-13,-12,-11.5].map(z=>({x,z}))),
 ...[-9,0,9].flatMap(x=>[-1,1].map(side=>({x:x+side*2.7,z:-13}))),
 ...[-9,0,9].map(x=>({x,z:-12.9})),
 {x:14,z:-12},{x:-14,z:-12}
];
for(const start of rearStarts){
 const p=createTemplePhysics(start),end={x:0,z:12},route=nav.route({...start,y:1.65},end);
 check(route&&route.length>=2,'Every reachable rear paving position has a return route');
 for(const target of route.slice(1)){
  for(let i=0;i<500&&Math.hypot(p.position.x-target.x,p.position.z-target.z)>.001;i++){
   const distance=Math.hypot(p.position.x-target.x,p.position.z-target.z),stride=Math.min(.12,distance);
   tick(p,.05,{dx:(target.x-p.position.x)/distance*stride,dz:(target.z-p.position.z)/distance*stride,guided:true});
  }
  check(Math.hypot(p.position.x-target.x,p.position.z-target.z)<.001,'A guide from rear paving goes around actual stone door volumes');
 }
 check(near(p.position.y,-.09),'A rear-paving return stays on the stone terrace');
}

console.log(`PASS ${checks} temple physics checks (${steps} deterministic simulation steps)`);
