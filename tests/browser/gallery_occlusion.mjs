// Actual ray picking respects black walls, while visible artwork stays usable.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/totehm-production/dome-occlusion';
fs.mkdirSync(OUT,{recursive:true});
const browser=await launch(),origin='https://www.totehm.space';let checks=0;
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
function angles(from,to){
 const x=to[0]-from[0],y=to[1]-from[1],z=to[2]-from[2];
 return {yaw:Math.atan2(-x,-z),pitch:Math.asin(y/Math.hypot(x,y,z))};
}
async function aim(pg,from,oldTarget,newTarget){
 const old=angles(from,oldTarget),next=angles(from,newTarget);
 let turn=next.yaw-old.yaw;while(turn>Math.PI)turn-=2*Math.PI;while(turn<-Math.PI)turn+=2*Math.PI;
 await pg.mouse.move(1100,550);await pg.mouse.down();
 await pg.mouse.move(1100-turn/.004,550+(next.pitch-old.pitch)/.003,{steps:10});
 await pg.mouse.up();await pg.waitForTimeout(250);
}
try{
 const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:false,viewport:{width:1440,height:1000}});
 try{
  await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/');
  await pg.waitForFunction(()=>window.__totehm_gallery?.().frames>0&&__totehm_gallery().collection?.origins.loaded===20);
  await pg.click('#explore-space');await pg.waitForFunction(()=>__totehm_gallery().journey.outside&&!__totehm_gallery().moving);
  const before=await pg.evaluate(()=>__totehm_gallery());
  await aim(pg,[0,1.65,-25],[4.8,5.1,-34],[-12.5,2.8,-3]);
  await pg.mouse.move(720,500);
  check(await pg.locator('#space').evaluate(e=>getComputedStyle(e).cursor)==='grab','opaque exterior wall is not an artwork pointer');
  await pg.mouse.click(720,500);await pg.waitForTimeout(250);
  const blocked=await pg.evaluate(()=>__totehm_gallery());
  check(blocked.room===-1&&!blocked.moving&&JSON.stringify(blocked.position)===JSON.stringify(before.position),'clicking a hidden painting through a wall cannot select it or travel through the wall');
  await pg.screenshot({path:OUT+'/exterior-wall.png'});
  await pg.click('#return-dome');await pg.waitForFunction(()=>!__totehm_gallery().journey.outside&&!__totehm_gallery().moving);
  await aim(pg,[0,1.65,8.7],[0,3.5,-5],[-12.5,2.8,-3]);
  await pg.mouse.move(720,500);
  check(await pg.locator('#space').evaluate(e=>getComputedStyle(e).cursor)==='pointer','visible paper inside the dome has an artwork pointer');
  await pg.mouse.click(720,500);await pg.waitForFunction(()=>__totehm_gallery().room===0&&!__totehm_gallery().moving);
  check(await pg.locator('#work-links a[href="/get_higher"]').count()===1,'visible inside paper still opens its original experience');
  await pg.screenshot({path:OUT+'/interior-paper.png'});
  check(!log.errors.some(e=>/pageerror:|THREE.WebGLProgram|shader error/i.test(e)),'picking guard has no application or shader errors');
  fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,before,blocked,after:await pg.evaluate(()=>__totehm_gallery()),log},null,2));
 }finally{await ctx.close();}
 console.log('PASS '+checks+' artwork occlusion checks; screenshots '+OUT);
}finally{await browser.close();}
