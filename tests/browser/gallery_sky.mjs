// Real local WebGL starfield; identity and all network requests stay in the harness.
// source /workspace/.totehm-cloud/activate.sh; node tests/browser/gallery_sky.mjs /tmp/totehm-production/starry-sky
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';

const OUT=process.argv[2]||'/tmp/totehm-production/starry-sky';
fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',results=[];
const browser=await launch();
let checks=0;
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const state=pg=>pg.evaluate(()=>window.__totehm_gallery());
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:false,viewport,hasTouch:viewport.width<650});
  const samples={width:viewport.width};
  try{
   await pg.goto(origin+'/');
   await pg.waitForFunction(()=>window.__totehm_gallery?.().frames>0&&window.__totehm_gallery().sky?.stars>0,null,{timeout:20000});
   await pg.waitForFunction(()=>!window.__totehm_gallery().moving);
   samples.entrance=await state(pg);
   check(samples.entrance.webgl&&samples.entrance.sky.stars>0,'real WebGL starfield at '+viewport.width);
   await pg.waitForTimeout(750);
   samples.stationary=await state(pg);
   check(!samples.stationary.moving&&samples.stationary.sky.animated,'sky stays animated while camera is stationary at '+viewport.width);
   check(samples.stationary.sky.time>samples.entrance.sky.time&&samples.stationary.frames>samples.entrance.frames,'stationary sky advances and is rendered at '+viewport.width);
   await pg.screenshot({path:OUT+'/entrance-'+viewport.width+'.png'});
   check(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'starry entrance fits viewport at '+viewport.width);
   check(await pg.evaluate(()=>{
    const guide=document.querySelector('.guide').getBoundingClientRect(),controls=document.querySelector('.controls').getBoundingClientRect();
    return guide.right<=controls.left||guide.left>=controls.right||guide.bottom<=controls.top||guide.top>=controls.bottom;
   }),'entrance guidance does not overlap sky controls at '+viewport.width);

   await pg.click('#look-sky');
   await pg.waitForFunction(()=>!window.__totehm_gallery().moving);
   await pg.waitForTimeout(100);
   samples.lookup=await state(pg);
   await pg.screenshot({path:OUT+'/lookup-'+viewport.width+'.png'});
   check(samples.lookup.sky.animated&&!samples.lookup.moving,'look-up control settles with animated stars at '+viewport.width);

   await pg.emulateMedia({reducedMotion:'reduce'});
   await pg.waitForFunction(()=>window.__totehm_gallery().sky.animated===false);
   samples.reducedStart=await state(pg);
   await pg.waitForTimeout(650);
   samples.reducedEnd=await state(pg);
   check(samples.reducedEnd.sky.time===samples.reducedStart.sky.time,'reduced motion freezes the sky clock at '+viewport.width);
   check(!samples.reducedEnd.sky.animated,'reduced motion reports a static sky at '+viewport.width);
   await pg.screenshot({path:OUT+'/reduced-'+viewport.width+'.png'});

   await pg.emulateMedia({reducedMotion:'no-preference'});
   await pg.waitForFunction(t=>window.__totehm_gallery().sky.animated&&window.__totehm_gallery().sky.time>t,samples.reducedEnd.sky.time);
   await pg.click('#view-list');
   await pg.waitForFunction(()=>window.__totehm_gallery().list===true);
   samples.listStart=await state(pg);
   await pg.waitForTimeout(650);
   samples.listEnd=await state(pg);
   check(samples.listEnd.sky.time===samples.listStart.sky.time,'artworks list suspends the sky clock at '+viewport.width);
   check(await pg.locator('#gallery').isVisible(),'artworks remain available with sky suspended at '+viewport.width);
   await pg.click('#view-list');
   await pg.waitForFunction(t=>!window.__totehm_gallery().list&&window.__totehm_gallery().sky.animated&&window.__totehm_gallery().sky.time>t,samples.listEnd.sky.time);
   samples.resumed=await state(pg);
   check(samples.resumed.frames>samples.listEnd.frames,'returning to 3D resumes rendering at '+viewport.width);
   if(viewport.width>=650){
    // Lower the upward view slightly so the meteor's full arc is in frame.
    await pg.mouse.move(viewport.width/2,viewport.height/2);
    await pg.mouse.down();
    await pg.mouse.move(viewport.width/2,viewport.height/2-190,{steps:8});
    await pg.mouse.up();
    await pg.waitForFunction(()=>window.__totehm_gallery().sky.meteor===true,null,{timeout:30000});
    samples.meteor=await state(pg);
    check(samples.meteor.sky.meteor,'a meteor appears in the animated sky on desktop');
    await pg.screenshot({path:OUT+'/meteor-'+viewport.width+'.png'});
   }
   check(!log.errors.some(e=>e.startsWith('pageerror:')),'no application JavaScript errors at '+viewport.width+': '+log.errors.join(' | '));
   results.push({viewport,samples,log});
  }catch(error){
   await pg.screenshot({path:OUT+'/failure-'+viewport.width+'.png'}).catch(()=>{});
   results.push({viewport,samples,log,error:String(error)});
   throw error;
  }finally{
   fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));
   await ctx.close();
  }
 }
 console.log('PASS '+checks+' animated sky checks; screenshots '+OUT);
}finally{await browser.close();}
