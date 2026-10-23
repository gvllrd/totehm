// Real WebGL checks for the ocean. Pages and assets are served locally under
// their production origin; identity, payments and media remain mocked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {launch,page} from './harness.mjs';

const OUT=process.argv[2]||'/tmp/totehm-production/luminous-sea-final';
const origin='https://www.totehm.space';
const results=[];let checks=0,browser;
fs.mkdirSync(OUT,{recursive:true});
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const state=pg=>pg.evaluate(()=>window.__totehm_gallery());
const clocks=d=>[d.temple.time,d.landscape.time,d.landscape.sky.time,d.landscape.ocean.time];
const gpuErrors=log=>log.errors.filter(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e));

async function observe(pg){
 await pg.addInitScript(()=>{
  const native=window.__oceanNative={programs:0,draws:0,geometryCounts:[],images:[],times:[]};
  const shaders=new WeakSet(),programs=new WeakSet(),locations=new WeakSet();let active=false;
  for(const Class of [globalThis.WebGLRenderingContext,globalThis.WebGL2RenderingContext]){
   if(!Class)continue;
   const source=Class.prototype.shaderSource;
   Class.prototype.shaderSource=function(shader,text){if(/\buOceanTime\b|\bOceanSurface\b/.test(text))shaders.add(shader);return Reflect.apply(source,this,[shader,text]);};
   const attach=Class.prototype.attachShader;
   Class.prototype.attachShader=function(program,shader){if(shaders.has(shader)&&!programs.has(program)){programs.add(program);native.programs++;}return Reflect.apply(attach,this,[program,shader]);};
   const use=Class.prototype.useProgram;
   Class.prototype.useProgram=function(program){active=programs.has(program);return Reflect.apply(use,this,[program]);};
   const location=Class.prototype.getUniformLocation;
   Class.prototype.getUniformLocation=function(program,name){const value=Reflect.apply(location,this,[program,name]);if(value&&programs.has(program)&&name==='uOceanTime')locations.add(value);return value;};
   const uniform=Class.prototype.uniform1f;
   Class.prototype.uniform1f=function(location,value){if(locations.has(location)&&native.times.at(-1)!==value){native.times.push(value);if(native.times.length>32)native.times.shift();}return Reflect.apply(uniform,this,[location,value]);};
   for(const method of ['drawElements','drawArrays']){
    const draw=Class.prototype[method];
    Class.prototype[method]=function(...args){if(active){native.draws++;const count=method==='drawElements'?args[1]:args[2];if(!native.geometryCounts.includes(count))native.geometryCounts.push(count);}return Reflect.apply(draw,this,args);};
   }
   for(const method of ['texImage2D','texSubImage2D']){
    const upload=Class.prototype[method];
    Class.prototype[method]=function(...args){
     const image=args.find(value=>value instanceof HTMLImageElement);
     if(image?.src&&!native.images.includes(image.src))native.images.push(image.src);
     return Reflect.apply(upload,this,args);
    };
   }
  }
 });
}
async function fixture(viewport,{maps='normal'}={}){
 let releaseMaps;const gate=new Promise(resolve=>{releaseMaps=resolve;});
 const sources={};
 const result=await page(browser,{dir:'space',origin,session:false,viewport,hasTouch:viewport.width<650,
  network:async(url,request)=>{
   if(url.pathname.startsWith('/assets/ocean/')){
    if(maps==='failed')return{status:503,contentType:'text/plain',body:'Ocean texture intentionally unavailable in test'};
    if(maps==='delayed')await gate;
   }
   if(url.pathname==='/gallery-drowned-ocean.mjs'||url.pathname==='/gallery-ui.mjs'){
    const body=fs.readFileSync(new URL('../../space'+url.pathname,import.meta.url));
    sources[url.pathname]=createHash('sha256').update(body).digest('hex');
    return{status:200,contentType:'text/javascript',body};
   }
   return null;
  }});
 await observe(result.pg);return{...result,releaseMaps,sources};
}
async function loaded(pg,log,{maps=true}={}){
 await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&d.frames>0&&d.temple?.stoneMapsLoaded>=9&&d.landscape?.skyLoaded&&d.landscape?.environmentLoaded;},null,{timeout:90000});
 assert.equal(gpuErrors(log).length,0,gpuErrors(log).join('\n'));
 if(maps){
  await pg.waitForFunction(()=>__totehm_gallery().landscape.ocean.detailMapsLoaded===2,null,{timeout:60000});
  await pg.waitForFunction(()=>__oceanNative.images.filter(src=>src.includes('/assets/ocean/')).length===2,null,{timeout:60000});
 }
 return state(pg);
}
async function settled(pg){
 await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&!d.moving&&!d.transition?.active;},null,{timeout:45000});return state(pg);
}
async function hidden(pg,value){
 await pg.evaluate(value=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>value});document.dispatchEvent(new Event('visibilitychange'));},value);
}
async function screenshot(pg,name,{world=false}={}){
 let style;if(world)style=await pg.addStyleTag({content:'body>*:not(#space){visibility:hidden!important}#space,#space canvas{visibility:visible!important}'});
 const path=OUT+'/'+name+'.png';
 try{if(world)await pg.locator('#space canvas').screenshot({path});else await pg.screenshot({path});}finally{if(style)await style.evaluate(node=>node.remove());}
 return path;
}
function difference(a,b){
 return JSON.parse(execFileSync('python3',['-c',String.raw`
import json,sys
from PIL import Image,ImageChops
im=Image.open(sys.argv[1]).convert('RGB');other=Image.open(sys.argv[2]).convert('RGB')
w,h=im.size;box=(round(w*.04),round(h*.48),round(w*.74),round(h*.76))
pixels=list(ImageChops.difference(im.crop(box),other.crop(box)).getdata())
print(json.dumps({'crop':box,'changedFraction':sum(max(p)>3 for p in pixels)/len(pixels),'meanRGBDifference':sum(sum(p) for p in pixels)/(len(pixels)*3)}))
`,a,b],{encoding:'utf8'}));
}
function save(){fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));}

try{
 browser=await launch();
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const f=await fixture(viewport),{pg,ctx,log}=f,sample={kind:'actual-hub',viewport};results.push(sample);
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/',{waitUntil:'domcontentloaded'});sample.entry=await loaded(pg,log);
   check(sample.entry.build==='2026-10-23-space-luminous-sea'&&sample.entry.temple.columns===8&&!sample.entry.temple.roof&&sample.entry.temple.doorsAboveColumns,'the open temple and tall doors remain intact '+viewport.width);
   check(sample.entry.landscape.ocean.detailMapsLoaded===2&&sample.entry.landscape.ocean.detailMapFailures===0,'both local ocean maps finish loading '+viewport.width);
   await screenshot(pg,'entry-'+viewport.width);await screenshot(pg,'entry-world-'+viewport.width,{world:true});
   await pg.click('#enter-gallery');
   for(const [id,name] of [['look-sea','ocean'],['look-horizon','horizon']]){
    await pg.click('#'+id);await settled(pg);sample[name]=await state(pg);
    await screenshot(pg,name+'-'+viewport.width);await screenshot(pg,name+'-world-'+viewport.width,{world:true});
   }
   sample.native=await pg.evaluate(()=>JSON.parse(JSON.stringify(__oceanNative)));
   check(sample.native.images.filter(src=>src.includes('/assets/ocean/')).length===2,'both real water textures reach native GPU uploads '+viewport.width);
   check(sample.native.programs>=2&&sample.native.draws>0&&sample.native.geometryCounts.some(count=>count>10000),'surface and spray are real native ocean draws '+viewport.width);
   const frozen=clocks(await state(pg));await pg.waitForTimeout(450);
   check(JSON.stringify(clocks(await state(pg)))===JSON.stringify(frozen),'reduced motion freezes the ocean and sky '+viewport.width);
   await pg.click('#look-sea');await settled(pg);await pg.emulateMedia({reducedMotion:'no-preference'});
   const initialTime=(await state(pg)).landscape.ocean.time;
   // Let quality adaptation settle before measuring image motion. Different
   // pixel ratios or camera positions would contaminate a water comparison.
   await pg.waitForFunction(at=>__totehm_gallery().landscape.ocean.time>at+.65,initialTime,{timeout:60000});
   sample.motionStart=await state(pg);const first=await screenshot(pg,'ocean-motion-start-'+viewport.width,{world:true});
   await pg.waitForFunction(at=>__totehm_gallery().landscape.ocean.time>at+1.2,sample.motionStart.landscape.ocean.time,{timeout:60000});
   const last=await screenshot(pg,'ocean-motion-end-'+viewport.width,{world:true});sample.motionEnd=await state(pg);
   check(sample.motionStart.render.pixelRatio===sample.motionEnd.render.pixelRatio&&JSON.stringify(sample.motionStart.camera)===JSON.stringify(sample.motionEnd.camera),'motion captures keep identical camera and render resolution '+viewport.width);
   sample.motionDifference=difference(first,last);
   check(sample.motionDifference.changedFraction>.003,'actual water pixels move at the fixed camera '+viewport.width);
   sample.native.times=await pg.evaluate(()=>__oceanNative.times);
   check(new Set(sample.native.times).size>1,'time reaches the actual ocean GPU programs '+viewport.width);
   await pg.click('#view-list');const listClock=clocks(await state(pg));await pg.waitForTimeout(500);
   check(JSON.stringify(clocks(await state(pg)))===JSON.stringify(listClock),'artworks list pauses the ocean '+viewport.width);
   await pg.click('#view-list');await hidden(pg,true);const hiddenClock=clocks(await state(pg));await pg.waitForTimeout(500);
   check(JSON.stringify(clocks(await state(pg)))===JSON.stringify(hiddenClock),'a hidden document pauses the ocean '+viewport.width);
   await hidden(pg,false);check(gpuErrors(log).length===0,'ocean views have no application or GLSL errors '+viewport.width);
   sample.log=log;sample.sources=f.sources;
  }catch(error){sample.error=String(error);sample.log=log;sample.failed=await state(pg).catch(()=>null);await pg.screenshot({path:OUT+'/failure-'+viewport.width+'.png'}).catch(()=>{});throw error;}
  finally{save();await ctx.close();}
 }
 for(const maps of ['delayed','failed']){
  const f=await fixture({width:390,height:844},{maps}),{pg,ctx,log}=f,sample={kind:'texture-'+maps};results.push(sample);
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/',{waitUntil:'domcontentloaded'});await loaded(pg,log,{maps:false});
   await pg.click('#enter-gallery');await pg.click('#look-sea');await settled(pg);sample.before=await state(pg);
   const before=await screenshot(pg,'textures-'+maps+'-before',{world:true});
   check(sample.before.webgl&&!sample.before.fallback&&sample.before.landscape.ocean.detailMapsLoaded===0&&await pg.evaluate(()=>__oceanNative.draws>0),'the real water remains rendered while textures are '+maps);
   if(maps==='delayed'){
    f.releaseMaps();await loaded(pg,log);const after=await screenshot(pg,'textures-delayed-after',{world:true});sample.after=await state(pg);sample.difference=difference(before,after);
    check(sample.after.landscape.ocean.detailMapsLoaded===2&&sample.difference.changedFraction>.003,'late textures visibly enrich the water without moving its camera');
   }else{
    await pg.waitForFunction(()=>__totehm_gallery().landscape.ocean.detailMapFailures===2,null,{timeout:15000});sample.after=await state(pg);
    check(sample.after.landscape.ocean.detailMapsLoaded===0&&sample.after.landscape.ocean.detailMapFailures===2,'both failed assets keep their valid fallback samplers');
   }
   check(gpuErrors(log).length===0,'texture '+maps+' state has no application or GLSL errors');sample.log=log;sample.sources=f.sources;
  }catch(error){sample.error=String(error);sample.log=log;throw error;}
  finally{f.releaseMaps();save();await ctx.close();}
 }
 console.log('PASS '+checks+' ocean checks; evidence '+OUT);
}finally{await browser?.close();}
