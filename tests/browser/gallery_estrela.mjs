// Historical 15/10 release checks: the Estrela-inspired ficus and marble.
// Superseded by gallery_dome.mjs after the 16/10 intention-line dome redesign.
// This file documents that earlier release and is not a current-gallery test.
// source /workspace/.totehm-cloud/activate.sh; node tests/browser/gallery_estrela.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {launch,page} from './harness.mjs';

const OUT=process.argv[2]||'/tmp/totehm-production/estrela';
fs.mkdirSync(OUT,{recursive:true});
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=160x160:rate=12','-t','2','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart',OUT+'/art.mp4']);
const media=fs.readFileSync(OUT+'/art.mp4'),origin='https://www.totehm.space';
const browser=await launch(),results=[];
let checks=0;
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const state=pg=>pg.evaluate(()=>window.__totehm_gallery());
const distance=position=>Math.hypot(position[0],position[1]+2.6);
// Diagnostics round camera metres to two decimals; allow that rounding only.
const safe=position=>{
 const [x,z]=position;
 return Math.abs(x)<6.21&&z>-11.81&&z<8.81&&distance(position)>=1.83&&
  !(x>-4.64&&x<-1.36&&z>2.56&&z<4.04);
};
async function follow(pg,selector){
 await pg.evaluate(()=>{
  window.__estrela_trace=[window.__totehm_gallery().position];
  window.__estrela_timer=setInterval(()=>window.__estrela_trace.push(window.__totehm_gallery().position),90);
 });
 await pg.click(selector);
 let current;
 const deadline=Date.now()+20000;
 do{
  current=await state(pg);
  if(!current.moving)break;
  assert(Date.now()<deadline,'guided visit settles');
  await pg.waitForTimeout(90);
 }while(true);
 const samples=await pg.evaluate(()=>{
  clearInterval(window.__estrela_timer);
  const result=[...window.__estrela_trace,window.__totehm_gallery().position];
  delete window.__estrela_trace;delete window.__estrela_timer;return result;
 });
 return {samples,end:current};
}
async function dragHorizontal(pg,viewport,total){
 const limit=viewport.width-100;
 while(Math.abs(total)>.1){
  const delta=Math.sign(total)*Math.min(Math.abs(total),limit),x=delta>0?50:viewport.width-50,y=viewport.height*.36;
  await pg.mouse.move(x,y);await pg.mouse.down();
  await pg.mouse.move(x+delta,y,{steps:8});await pg.mouse.up();
  total-=delta;
 }
}
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:false,viewport,hasTouch:viewport.width<650,network:url=>url.pathname.startsWith('/storage/v1/object/public/')?{status:200,contentType:'video/mp4',body:media}:null});
  const samples={width:viewport.width,routes:[]},suffix=' at '+viewport.width;
  try{
   await pg.goto(origin+'/');
   await pg.waitForFunction(()=>window.__totehm_gallery?.().frames>0&&window.__totehm_gallery().tree,null,{timeout:30000});
   samples.entrance=await state(pg);
   const {tree,stone}=samples.entrance;
   check(samples.entrance.webgl&&!samples.entrance.fallback&&samples.entrance.room===-1,'real WebGL entrance'+suffix);
   check(tree.species==='ficus'&&tree.height>7&&tree.branches>20&&tree.leaves>1000,'monumental branching fig tree and individual foliage loaded'+suffix);
   check(stone.material==='black marble'&&stone.worldProjected&&stone.wallThickness>=.8,'veined black marble covers thick gallery stone'+suffix);
   check(await pg.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'entrance fits viewport'+suffix);
   await pg.waitForTimeout(650);samples.animated=await state(pg);
   check(samples.animated.sky.time>samples.entrance.sky.time&&samples.animated.frames>samples.entrance.frames,'stars animate above the tree while the visitor stands still'+suffix);
   await pg.screenshot({path:OUT+'/entrance-'+viewport.width+'.png'});
   await follow(pg,'#look-sky');samples.lookup=await state(pg);
   check(distance(samples.lookup.position)>1.83&&samples.lookup.sky.animated,'look up leaves the visitor safely in place beneath the canopy'+suffix);
   await pg.screenshot({path:OUT+'/lookup-'+viewport.width+'.png'});

   // Opposite walls force the guided camera to walk around the central roots.
   const works=[
    {index:0,position:[-2.7,-2],href:'/get_higher'},
    {index:2,position:[2.5,-3.8],href:'/play_lisbon_street'},
    {index:1,position:[-3.6,-7.3],href:'/stoner'},
    {index:3,position:[3.7,-7.3],href:'/origins'}
   ];
   for(const work of works){
    const route=await follow(pg,'.tour [data-room="'+work.index+'"]');samples.routes.push({work:work.index,...route});
    const reached=route.end.position;
    check(route.samples.every(safe)&&route.end.room===work.index&&Math.hypot(reached[0]-work.position[0],reached[1]-work.position[1])<.04,'guided camera reaches artwork '+work.index+' without entering trunk, bench or walls'+suffix);
    check(await pg.getAttribute('#work-links a:first-child','href')===work.href&&await pg.locator('#work-info').isVisible(),'original artwork '+work.index+' remains accessible'+suffix);
    await pg.screenshot({path:OUT+'/station-'+work.index+'-'+viewport.width+'.png'});
   }
   // Prove a physical detour rather than relying on a particular GPU frame rate.
   const cross=samples.routes[1].samples,dx=5.2,dz=-1.8;
   check(cross.some(([x,z])=>Math.abs(dx*(z+2)-dz*(x+2.7))/Math.hypot(dx,dz)>.4)&&cross.some(p=>distance(p)<2.3),'cross-gallery visit actually skirts the tree'+suffix);

   await follow(pg,'.tour [data-room="2"]');
   samples.beforeWalk=await state(pg);
   // Station 2 faces +X. Turn along the shortest arc towards the ficus centre.
   const initialYaw=-Math.PI/2,targetYaw=Math.atan2(2.5,-1.2);
   let turn=targetYaw-initialYaw;while(turn>Math.PI)turn-=Math.PI*2;
   await dragHorizontal(pg,viewport,-turn/.004);
   await pg.focus('#space');await pg.keyboard.down('w');
   const walked=[],deadline=Date.now()+6500;
   try{
    do{
     const current=await state(pg);walked.push(current.position);
     if(distance(current.position)<1.99)break;
     await pg.waitForTimeout(90);
    }while(Date.now()<deadline);
    const pressingUntil=Date.now()+850;
    while(Date.now()<pressingUntil){walked.push((await state(pg)).position);await pg.waitForTimeout(90);}
   }finally{await pg.keyboard.up('w');}
   samples.walked=walked;samples.afterWalk=await state(pg);
   check(walked.length>3&&Math.min(...walked.map(distance))<2.02&&walked.every(safe),'holding WASD towards the trunk stops at its roots'+suffix);
   check(!samples.afterWalk.moving,'releasing movement leaves no stuck input'+suffix);
   await pg.screenshot({path:OUT+'/roots-'+viewport.width+'.png'});
   const returnRoute=await follow(pg,'#overview');samples.returnRoute=returnRoute;
   check(returnRoute.samples.every(safe)&&Math.hypot(returnRoute.end.position[0]-.5,returnRoute.end.position[1]-8)<.04,'entrance remains reachable from the tree roots'+suffix);

   await pg.emulateMedia({reducedMotion:'reduce'});
   await pg.waitForFunction(()=>window.__totehm_gallery().sky.animated===false);
   samples.reducedStart=await state(pg);await pg.waitForTimeout(500);samples.reducedEnd=await state(pg);
   check(samples.reducedEnd.sky.time===samples.reducedStart.sky.time,'reduced motion keeps the celestial canopy still'+suffix);
   await pg.click('.tour [data-room="1"]');samples.reducedVisit=await state(pg);
   check(!samples.reducedVisit.moving&&samples.reducedVisit.room===1&&safe(samples.reducedVisit.position),'reduced-motion visit reaches artwork immediately and safely'+suffix);
   await pg.emulateMedia({reducedMotion:'no-preference'});
   await pg.waitForFunction(()=>window.__totehm_gallery().sky.animated===true);
   await pg.click('#view-list');await pg.waitForFunction(()=>window.__totehm_gallery().list);
   samples.listStart=await state(pg);await pg.waitForTimeout(500);samples.listEnd=await state(pg);
   check(samples.listEnd.sky.time===samples.listStart.sky.time&&await pg.locator('#gallery .room').count()===4,'artwork list keeps all four experiences and pauses the sky'+suffix);
   await pg.click('#view-list');
   await pg.waitForFunction(t=>!window.__totehm_gallery().list&&window.__totehm_gallery().sky.time>t,samples.listEnd.sky.time);
   check(!log.errors.some(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e)),'no application or WebGL shader errors'+suffix+': '+log.errors.join(' | '));
   results.push({viewport,samples,log});
  }catch(error){
   await pg.screenshot({path:OUT+'/failure-'+viewport.width+'.png'}).catch(()=>{});
   results.push({viewport,samples,log,error:String(error)});throw error;
  }finally{
   fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await ctx.close();
  }
 }
 console.log('PASS '+checks+' Estrela gallery checks; screenshots '+OUT);
}finally{await browser.close();}
