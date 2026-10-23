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
 for(let n=1;n<14*fps;n++){
  tick(p,1/fps);peak=Math.max(peak,p.position.y);
  const t=n/fps,expected=-.09+18000*(1-((t-7)/7)**2);
  check(near(p.position.y,expected,2e-5),`Ballistic position at ${fps}Hz, t=${t}`);
  check(!state(p).grounded,'The flight cannot ground itself above the terrace');
  check(!p.jump(),'A held/repeated key cannot add a second airborne impulse');
  if(n===7*fps){
   check(near(p.position.y,17999.91,2e-5),'The head reaches the stars at the seven-second apex');
   check(Math.abs(state(p).velocityY)<.0001,'The apex is a turning point');
  }
  if(n===8*fps)check(state(p).velocityY<0&&p.position.y<17999.91,'Gravity brings the player down after the apex');
 }
 tick(p,1/fps);
 check(state(p).grounded&&near(p.position.y,-.09),'The complete jump returns to real stone');
 check(Math.abs(peak-17999.91)<2e-5,'The jump reaches its finite analytic apex');
 check(state(p).jumps===1&&state(p).landings===1,'One impulse produces one landing');
 check(state(p).jumpApex===18000&&state(p).flightTime===14,'Diagnostics expose the designed height and flight time');
 for(let n=0;n<fps;n++)tick(p,1/fps);
 check(state(p).landings===1&&near(p.position.y,-.09),'An idle ground contact cannot bounce or count another landing');
 check(p.jump(),'A completed landing permits the next deliberate jump');
}

// All eight former column footprints are now open stone, including their
// projecting capitals. Walking, jumping and standing must meet no ghost.
for(const side of [-1,1])for(const z of [-12,-4,4,12]){
 const p=createTemplePhysics({x:side*13.3,z});
 for(let i=0;i<80;i++)tick(p,1/120,{dx:side*2.6/120});
 check(near(p.position.x,side*(13.3+80*2.6/120)),'Walk straight through every former column footprint');
 check(state(p).grounded&&near(p.position.y,-.09),'The removed base has no residual support height');
 p.reset({x:side*15,z});check(p.jump(),'The bare stone permits a normal jump');let peak=-Infinity;
 for(let i=0;i<14*120;i++){tick(p,1/120);peak=Math.max(peak,p.position.y);}
 check(Math.abs(peak-17999.91)<2e-5,'A removed capital cannot stop the head or become a landing');
 check(state(p).grounded&&near(p.position.y,-.09)&&state(p).supportColumn==null,'Jump lands on ground at every former column');
 p.reset({x:side*15,z,y:9.52});
 check(!state(p).grounded&&!p.jump(),'A restored airborne position cannot stand on a removed capital');
 for(let i=0;i<240;i++)tick(p,1/120);
 check(state(p).grounded&&near(p.position.y,-.09),'An airborne restore falls through the removed column to ground');
}

// One launch substep travels farther than a complete arch. The head must
// still hit the curved underside without tunneling between sampled heights.
for(const fps of [20,30,60,120,240])for(const gate of [-9,0,9])for(const offset of [-1.8,0,1.8]){
 const p=createTemplePhysics({x:gate+offset,z:-12});check(p.jump(),'Stone paving under an arch permits a launch');let max=-Infinity;
 const ceiling=7.755+2.97*Math.sqrt(1-((Math.abs(offset)+.14)/2.25)**2);
 tick(p,1/fps);max=Math.max(max,p.position.y);
 check(state(p).velocityY<=0,'A high-speed head crossing stops immediately at the underside of each arch');
 for(let i=1;i<fps;i++){tick(p,1/fps);max=Math.max(max,p.position.y);}
 check(max+1.74<=ceiling+1e-6,'The curved stone opening acts as a swept ceiling');
 check(max>1,'A ceiling contact does not erase the launch');
 check(state(p).grounded&&near(p.position.y,-.09),'An arch ceiling does not leave the player hovering');
 check(state(p).jumps===1&&state(p).landings===1,'An arch strike ends with exactly one real ground landing');
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
check(near(invalid.position.y-before.y,36000/7*.05-18000/49*.05**2,2e-6),'A resumed long frame advances only the analytic first 50 ms');
check(Math.hypot(invalid.position.x-before.x,invalid.position.z-before.z)<=.13+1e-7,'A long frame cannot tunnel through geometry');
const paused={...invalid.position};for(let i=0;i<100;i++)tick(invalid,0,{dx:1,dz:1});
check(JSON.stringify(invalid.position)===JSON.stringify(paused),'A paused physics clock freezes the entire jump');

// Reduced-motion guidance can change the horizontal destination immediately,
// but choosing a view in the sky must not reset a flight onto the floor.
const relocated=createTemplePhysics({x:0,z:0});relocated.jump();
for(let n=0;n<4*120;n++)tick(relocated,1/120);
const airborne={...state(relocated)},airborneHeight=relocated.position.y;
relocated.relocateHorizontal({x:13.6,z:8.4,y:-.09});
check(near(relocated.position.x,13.6)&&near(relocated.position.z,8.4),'Immediate guidance relocates the horizontal position');
check(relocated.position.y===airborneHeight&&state(relocated).velocityY===airborne.velocityY,'Immediate guidance preserves altitude and vertical momentum');
check(!state(relocated).grounded&&!relocated.jump()&&state(relocated).jumps===1,'Changing a view cannot create a ground contact or a second jump');
const frozen=JSON.stringify({...relocated.position,...state(relocated)});
for(const bad of [0,NaN,Infinity,-1])tick(relocated,bad,{dx:1,dz:1,guided:true});
check(JSON.stringify({...relocated.position,...state(relocated)})===frozen,'Paused or invalid time preserves the full airborne state');
for(let n=4*120;n<14*120;n++)tick(relocated,1/120);
check(state(relocated).grounded&&near(relocated.position.y,-.09)&&state(relocated).landings===1,'A relocated flight finishes its original fourteen-second ground landing');
relocated.relocateHorizontal({x:1e6,z:1e6});
check(near(relocated.position.x,15.8)&&near(relocated.position.z,16),'An immediate destination remains inside the stone footprint');
relocated.reset({x:0,z:0,y:9});relocated.relocateHorizontal({x:0,z:-12});
check(near(relocated.position.z,0)&&near(relocated.position.y,9),'Immediate guidance cannot place a body inside a stone arch');

const guided=createTemplePhysics({x:0,z:12});tick(guided,.05,{dx:1,guided:true});
check(near(guided.position.x,1),'Guidance preserves existing smooth travel durations');
tick(guided,.05,{dx:100,guided:true});
check(near(guided.position.x,3),'Guidance remains capped at forty metres per second');
const walking=createTemplePhysics({x:0,z:0});tick(walking,.05,{dx:100});
check(near(walking.position.x,.13),'Manual walking remains capped at 2.6 metres per second');
const finiteStress=createTemplePhysics();finiteStress.jump();
for(let n=0;n<5000;n++){
 tick(finiteStress,n%2?.05:1/240,{dx:n%3?Number.MAX_VALUE:Infinity,dz:n%5?-Number.MAX_VALUE:NaN,guided:n%2===0});
 if(n%100===0)finiteStress.jump();
 check(Object.values(finiteStress.position).every(Number.isFinite)&&Number.isFinite(state(finiteStress).velocityY),'Extreme finite and invalid inputs keep the complete trajectory finite');
 check(finiteStress.position.y>=-.09,'Extreme movement never falls below the real terrace');
}
const nav=createTempleWalkway();
for(const side of [-1,1])for(const z of [-12,-4,4,12]){
 const start={x:side*15,y:1.65,z},end={x:0,z:12},route=nav.route(start,end);
 check(route&&route[0]===start&&route.at(-1)===end,'Guidance can depart every former column footprint');
 const p=createTemplePhysics({x:side*15,z});
 for(const target of route.slice(1)){
  for(let i=0;i<500&&Math.hypot(p.position.x-target.x,p.position.z-target.z)>.001;i++){
   const distance=Math.hypot(p.position.x-target.x,p.position.z-target.z),stride=Math.min(.25,distance);
   tick(p,.05,{dx:(target.x-p.position.x)/distance*stride,dz:(target.z-p.position.z)/distance*stride,guided:true});
  }
  check(Math.hypot(p.position.x-target.x,p.position.z-target.z)<.001,'The collision engine follows guidance across the open side terrace');
 }
 check(near(p.position.y,-.09)&&state(p).grounded,'Guidance stays on the ground where columns once stood');
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
