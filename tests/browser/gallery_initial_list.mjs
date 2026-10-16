// Open the HTML artwork view while the 3D module is still downloading.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/totehm-production/lisbon-initial-list';
fs.mkdirSync(OUT,{recursive:true});
const browser=await launch(),results=[];let checks=0;
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  let release;const download=new Promise(resolve=>release=resolve);
  const {pg,ctx,log}=await page(browser,{dir:'space',origin:'https://www.totehm.space',session:false,viewport,network:async url=>{if(url.pathname==='/gallery-3d.mjs')await download;return null;}});
  try{
   await pg.goto('https://www.totehm.space/',{waitUntil:'commit'});
   await pg.waitForFunction(()=>window.__totehm_gallery&&window.__totehm_gallery().webgl===undefined);
   await pg.click('#view-list');
   assert(await pg.locator('#gallery').isVisible(),'HTML list opens before 3D finishes');checks++;
   release();
   await pg.waitForFunction(()=>window.__totehm_gallery().webgl===true);
   const initial=await pg.evaluate(()=>__totehm_gallery());
   assert(initial.list&&!initial.visible&&!initial.sky.animated,'late engine respects the already open artwork list');checks++;
   await pg.waitForTimeout(600);
   const settled=await pg.evaluate(()=>__totehm_gallery());
   assert.equal(settled.sky.time,initial.sky.time,'sky clock remains paused behind the list');checks++;
   assert.equal(settled.frames,initial.frames,'WebGL does not render behind the list');checks++;
   assert(!log.errors.some(e=>e.startsWith('pageerror:')),'no initialization JavaScript error');checks++;
   results.push({viewport,initial,settled,log});
  }finally{release();await ctx.close();}
 }
 console.log('PASS '+checks+' initial artwork-list checks');
}finally{fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await browser.close();}
