import assert from 'node:assert/strict';
import {createModernPhysics,createModernWalkway} from '../../space/gallery-modern-navigation.mjs';
import {GALLERY_LAYOUT,GALLERY_STATIONS} from '../../space/gallery-modern-layout.mjs';

let checks=0,samples=0,steps=0;
const check=(value,message)=>{assert(value,message);checks++;};
const near=(a,b,epsilon=2e-5)=>Math.abs(a-b)<=epsilon;
const tick=(p,dt,input)=>{steps++;return p.step(dt,input);};
const nav=createModernWalkway(),entry={x:0,z:12};
const approaches=GALLERY_STATIONS.map(s=>({x:s.approach[0],z:s.approach[2]}));

// Independent metre-space collision specification, including furniture.
const groundBoxes=[
 [-13,13,-17.2,-16.8],[-13.16,-12.94,-17,-2],[12.94,13.16,-17,-2],
 [-13,-2.4,-2.2,-1.8],[2.4,13,-2.2,-1.8],
 [-3.5,3.5,-13.05,-11.05],[-9.25,-5.95,-9.1,-6.9],
 [5.6,10.4,-11.3,-9.5],[5.15,10.85,-7.2,-5.4]
];
function free(x,z){
 return x>=-15.8&&x<=15.8&&z>=-17.6&&z<=16&&!groundBoxes.some(([l,r,b,f])=>x>l-.18+1e-7&&x<r+.18-1e-7&&z>b-.18+1e-7&&z<f+.18-1e-7);
}
function follow(from,to){
 const route=nav.route(from,to);check(route&&route.length>=2,`A route exists ${JSON.stringify(from)} -> ${JSON.stringify(to)}`);
 check(route[0]===from&&route.at(-1)===to,'Guidance preserves endpoints');
 const p=createModernPhysics(from);
 for(let n=1;n<route.length;n++){
  const a=route[n-1],b=route[n],count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.025));
  for(let i=0;i<=count;i++){
   const t=i/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;samples++;
   check(free(x,z),'Every guide segment remains on real stone outside solid walls and furniture');
   check(nav.portalAt(x,z)===null,'The gallery guide never launches an independent page');
  }
  for(let i=0;i<1200&&Math.hypot(p.position.x-b.x,p.position.z-b.z)>.0001;i++){
   const distance=Math.hypot(b.x-p.position.x,b.z-p.position.z),stride=Math.min(.3,distance);
   tick(p,.05,{dx:(b.x-p.position.x)/distance*stride,dz:(b.z-p.position.z)/distance*stride,guided:true});
  }
  check(Math.hypot(p.position.x-b.x,p.position.z-b.z)<.0001,'The real collision engine follows every planned segment');
 }
 check(p.diagnostics().grounded&&near(p.position.y,-.09),'Guidance stays on the gallery floor');
 return route;
}
const positions=[entry,...approaches,{x:0,z:-5},{x:0,z:-10},{x:11.8,z:-13},{x:-11.8,z:-13},
 {x:15,z:-15},{x:-15,z:-15},{x:15,z:10},{x:-15,z:10},{x:0,z:16},{x:0,z:-17.6}];
for(const from of positions)for(const to of positions)follow(from,to);
check(follow(entry,approaches[0]).length===2,'The counter is directly ahead through the entrance');
check(follow(entry,approaches[1]).length>2,'The left-hand approach goes through the doorway rather than glazing');
check(follow(entry,approaches[2]).length>2,'The lounge approach goes around the sofa rather than through it');

// A manual body can come closer to a wall than a decorative corner waypoint.
// Return guidance must work from those real collision contacts too.
for(const [start,input]of [
 [{x:0,z:-5},{dx:-1}],[{x:0,z:-5},{dx:1}],
 [{x:0,z:0},{dz:-1}],[{x:0,z:-8},{dz:-1}],
 [{x:-7.6,z:-4},{dz:-1}],[{x:8,z:-8},{dz:1}],
 [{x:0,z:0},{dx:1,dz:-.1}]
]){
 const p=createModernPhysics(start);for(let i=0;i<240;i++)tick(p,.05,input);
 check(free(p.position.x,p.position.z),'Manual movement stops outside solids');
 follow({...p.position},entry);
 for(const to of approaches)follow({...p.position},to);
}

// The sky jump is intentionally enormous, with an independently calculated
// 18 km apex at seven seconds and an exact fourteen-second round trip.
for(const fps of [20,60,120]){
 const p=createModernPhysics(entry);check(p.jump(),'An intentional ground jump launches');
 for(let i=1;i<14*fps;i++){
  tick(p,1/fps);const t=i/fps;
  check(near(p.position.y,-.09+18000*(1-((t-7)/7)**2)),'Outdoor jump follows its analytic trajectory');
  check(!p.jump(),'Holding jump cannot add an airborne impulse');
 }
 tick(p,1/fps);check(near(p.position.y,-.09)&&p.diagnostics().grounded,'Outdoor jump lands back on real stone');
 check(p.diagnostics().jumps===1&&p.diagnostics().landings===1,'A sky jump has exactly one launch and one landing');
}

// Swept head checks are essential: the initial jump speed would otherwise
// tunnel through the entire ceiling in a single ordinary frame.
for(const fps of [20,60,120])for(const start of [{x:0,z:-5},{x:-7.6,z:-4},{x:0,z:-2}]){
 const p=createModernPhysics(start);check(p.jump(),'A jump indoors remains intentional');let peak=-Infinity;
 for(let i=0;i<fps;i++){tick(p,1/fps);peak=Math.max(peak,p.position.y);}
 const ceiling=start.z===-2?3.1:6;
 check(peak+1.74<=ceiling+1e-6,'The full-speed head cannot tunnel through the roof or entry lintel');
 check(p.diagnostics().headContacts===1,'The ceiling records one real head contact');
 check(p.diagnostics().grounded&&near(p.position.y,-.09),'A ceiling contact returns to the floor');
}

// A sky visitor may land on the roof, walk off its edge and return to the
// terrace. Neither a guide nor a reduced-motion relocation resets altitude.
const roof=createModernPhysics({x:0,z:-5,y:30});
for(let i=0;i<120;i++)tick(roof,1/120);
check(roof.diagnostics().grounded&&roof.diagnostics().onRoof&&near(roof.position.y,6.28),'Falling above the building lands on the actual roof');
roof.relocateHorizontal({x:0,z:2});check(near(roof.position.y,6.28)&&!roof.diagnostics().grounded,'Leaving the roof preserves height and starts a fall');
for(let i=0;i<120;i++)tick(roof,1/120);
check(roof.diagnostics().grounded&&near(roof.position.y,-.09),'The roof edge returns to the terrace without hovering');
const sky=createModernPhysics(entry);sky.jump();for(let i=0;i<240;i++)tick(sky,1/120);
const before={y:sky.position.y,v:sky.diagnostics().velocityY};sky.relocateHorizontal({x:14,z:8,y:-.09});
check(sky.position.y===before.y&&sky.diagnostics().velocityY===before.v,'Immediate horizontal guidance preserves altitude and momentum');
check(!sky.jump(),'Guidance cannot manufacture a second jump');
for(let i=240;i<14*120;i++)tick(sky,1/120);
check(sky.diagnostics().grounded&&near(sky.position.y,-.09),'The relocated flight keeps its original landing time');

// Invalid/long resume frames and extreme input cannot corrupt navigation.
for(const bad of [NaN,Infinity,-Infinity,undefined,null,'0']){
 check(!nav.allowed(bad,0)&&!nav.allowed(0,bad),'Invalid positions are rejected');
 check(nav.route(entry,{x:bad,z:0})===null&&nav.route({x:0,z:bad},entry)===null,'Invalid destinations return no route');
 const p=createModernPhysics(entry),saved=JSON.stringify(p.position);tick(p,bad,{dx:Infinity,dz:NaN});
 check(JSON.stringify(p.position)===saved,'Invalid frame times preserve position');
}
for(const malformed of [null,undefined,{},[],{x:0},{z:0}])check(nav.route(entry,malformed)===null,'Malformed routes are rejected');
const stress=createModernPhysics(entry);stress.jump();
for(let i=0;i<1600;i++){
 tick(stress,i%2?.05:1/240,{dx:i%3?Number.MAX_VALUE:Infinity,dz:i%5?-Number.MAX_VALUE:NaN,guided:i%2===0});
 check(Object.values(stress.position).every(Number.isFinite)&&Number.isFinite(stress.diagnostics().velocityY),'Extreme input remains finite');
 check(stress.position.y>=GALLERY_LAYOUT.groundY,'No movement falls below the terrace');
}
const frozen=JSON.stringify({...stress.position,...stress.diagnostics()});for(let i=0;i<100;i++)tick(stress,0,{dx:1,dz:1});
check(JSON.stringify({...stress.position,...stress.diagnostics()})===frozen,'Paused clocks preserve full flight and ground state');
console.log(`PASS ${checks} modern gallery navigation/physics checks (${samples} sampled route points, ${steps} physics steps)`);
