// Real WebGL checks for the ocean. Pages and assets are served locally under
// their production origin; identity, payments and media remain mocked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {launch,page} from './harness.mjs';

const OUT=process.argv[2]||'/tmp/totehm-production/ocean-nocturne-final';
const BUILD='2026-10-24-space-storm-stars';
const origin='https://www.totehm.space';
const results=[];let checks=0,browser;
fs.mkdirSync(OUT,{recursive:true});
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const state=pg=>pg.evaluate(()=>window.__totehm_gallery());
const clocks=d=>[d.temple.time,d.landscape.time,d.landscape.sky.time,d.landscape.ocean.time,d.landscape.planet?.time];
const gpuErrors=log=>log.errors.filter(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e));

async function observe(pg){
 await pg.addInitScript(()=>{
  const role=()=>({programs:0,draws:0,geometryCounts:[],times:[]});
  const native=window.__oceanNative={programs:0,draws:0,geometryCounts:[],images:[],times:[],roles:{surface:role(),spray:role(),foam:role(),spindrift:role(),galaxy:role(),stars:role(),meteor:role()},foamReads:[],canvasUploads:[]};
  const shaders=new WeakMap(),programs=new WeakMap(),locations=new WeakMap(),canvases=new WeakSet();let active=null;
  for(const Class of [globalThis.WebGLRenderingContext,globalThis.WebGL2RenderingContext]){
   if(!Class)continue;
   const source=Class.prototype.shaderSource;
   Class.prototype.shaderSource=function(shader,text){
    const kind=/OCEAN_FOAM_STATE|\buFoamPrevious\b/.test(text)?'foam':/OCEAN_SPINDRIFT/.test(text)?'spindrift':/\baLife\b/.test(text)&&/\buOceanTime\b/.test(text)?'spray':/\buOceanTime\b|\bOceanSurface\b/.test(text)?'surface':/\baAge\b|\bvMeteor\b|METEOR_TRAIL/.test(text)?'meteor':/\baColour\b|\baNearColour\b|CELESTIAL_STAR/.test(text)?'stars':/\bvDirection\b/.test(text)&&/\buMap\b/.test(text)?'galaxy':null;
    if(kind)shaders.set(shader,kind);return Reflect.apply(source,this,[shader,text]);
   };
   const attach=Class.prototype.attachShader;
   Class.prototype.attachShader=function(program,shader){const kind=shaders.get(shader);if(kind&&!programs.has(program)){programs.set(program,kind);native.programs++;native.roles[kind].programs++;}return Reflect.apply(attach,this,[program,shader]);};
   const use=Class.prototype.useProgram;
   Class.prototype.useProgram=function(program){active=programs.get(program)||null;return Reflect.apply(use,this,[program]);};
   const location=Class.prototype.getUniformLocation;
   Class.prototype.getUniformLocation=function(program,name){const value=Reflect.apply(location,this,[program,name]);if(value&&programs.has(program)&&/^u\w*Time$/.test(name))locations.set(value,programs.get(program));return value;};
   const uniform=Class.prototype.uniform1f;
   Class.prototype.uniform1f=function(location,value){const kind=locations.get(location);if(kind){const times=native.roles[kind].times;if(times.at(-1)!==value){times.push(value);if(times.length>32)times.shift();}if((kind==='surface'||kind==='spray')&&native.times.at(-1)!==value){native.times.push(value);if(native.times.length>32)native.times.shift();}}return Reflect.apply(uniform,this,[location,value]);};
   for(const method of ['drawElements','drawArrays']){
    const draw=Class.prototype[method];
    Class.prototype[method]=function(...args){
     const kind=active;
     if(kind){native.draws++;const count=method==='drawElements'?args[1]:args[2],r=native.roles[kind];r.draws++;if(!native.geometryCounts.includes(count))native.geometryCounts.push(count);if(!r.geometryCounts.includes(count))r.geometryCounts.push(count);}
     const result=Reflect.apply(draw,this,args);
     // Read the actual simulation framebuffer. Distinct nonempty results show
     // that foam memory changes on the GPU, beyond a diagnostic counter.
     if(kind==='foam'&&[1,10,30].includes(native.roles.foam.draws)){
      const viewport=this.getParameter(this.VIEWPORT),width=viewport[2],height=viewport[3],pixels=new Uint8Array(width*height*4);this.readPixels(0,0,width,height,this.RGBA,this.UNSIGNED_BYTE,pixels);
      let hash=2166136261,nonzero=0,density=0;
      for(let i=0;i<pixels.length;i++){hash=Math.imul(hash^pixels[i],16777619)>>>0;if(i%4<2){density+=pixels[i];if(pixels[i])nonzero++;}}
      native.foamReads.push({draw:native.roles.foam.draws,width,height,hash,nonzero,density,time:native.roles.foam.times.at(-1)});
     }
     return result;
    };
   }
   for(const method of ['texImage2D','texSubImage2D']){
    const upload=Class.prototype[method];
    Class.prototype[method]=function(...args){
     const image=args.find(value=>value instanceof HTMLImageElement);
     if(image?.src&&!native.images.includes(image.src))native.images.push(image.src);
     const canvas=args.find(value=>value instanceof HTMLCanvasElement);
     if(canvas&&!canvases.has(canvas)){
      canvases.add(canvas);
      const sample={width:canvas.width,height:canvas.height};
      try{const pixels=canvas.getContext('2d')?.getImageData(0,0,canvas.width,canvas.height).data;
       if(pixels){let minimum=255,maximum=0,sum=0,count=0;const stride=Math.max(4,Math.floor(pixels.length/16384/4)*4);
        for(let i=0;i<pixels.length;i+=stride){const light=(pixels[i]+pixels[i+1]+pixels[i+2])/3;minimum=Math.min(minimum,light);maximum=Math.max(maximum,light);sum+=light;count++;}
        Object.assign(sample,{minimum,maximum,mean:sum/count});}}
      catch{}
      native.canvasUploads.push(sample);
     }
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
   if(/^\/gallery-[a-z0-9-]+\.mjs$/.test(url.pathname)){
    const body=fs.readFileSync(new URL('../../space'+url.pathname,import.meta.url));
    sources[url.pathname]=createHash('sha256').update(body).digest('hex');
    return{status:200,contentType:'text/javascript',body};
   }
   return null;
  }});
 await observe(result.pg);return{...result,releaseMaps,sources};
}
async function loaded(pg,log,{maps=true}={}){
 await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&d.frames>0&&d.temple?.stoneMapsLoaded>=6&&d.temple?.pavement?.ready&&d.landscape?.skyLoaded&&d.landscape?.environmentLoaded;},null,{timeout:90000});
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
   check(sample.entry.build===BUILD&&sample.entry.temple.columns===0&&sample.entry.temple.columnTops.length===0&&!sample.entry.temple.roof&&sample.entry.temple.overheadLabels===0&&sample.entry.temple.portals.length===3&&sample.entry.temple.portals.every(p=>p.width===4.5&&p.height===10.725),'the open terrace has no columns or overhead labels and keeps its three tall doors '+viewport.width);
   check(sample.entry.landscape.ocean.detailMapsLoaded===2&&sample.entry.landscape.ocean.detailMapFailures===0,'both local ocean maps finish loading '+viewport.width);
   const initialFoam=sample.entry.landscape.ocean.foamSimulation;
   check(initialFoam.supported&&initialFoam.initialized&&initialFoam.pingPong&&initialFoam.targets===2&&initialFoam.compressionDriven&&initialFoam.simulationSize===(viewport.width<650?128:256),'persistent aeration uses two actual-size compression-driven GPU targets '+viewport.width);
   check(sample.entry.landscape.ocean.curledSurface&&sample.entry.landscape.ocean.mainChop===1.8,'breaking crests belong to the continuous spherical water surface '+viewport.width);
   const spindrift=sample.entry.landscape.ocean.spindrift;
   check(spindrift.kind==='raymarched-sea-spindrift'&&spindrift.parentClock&&spindrift.externalFiles===0&&spindrift.textures===0&&spindrift.samplesPerRay===5&&spindrift.maximumOpacity<=.13,'windblown sea mist shares the water clock and owns no external images '+viewport.width);
   await screenshot(pg,'entry-'+viewport.width);await screenshot(pg,'entry-world-'+viewport.width,{world:true});
   await pg.click('#enter-gallery');
   for(const [id,name] of [['look-sea','ocean'],['look-horizon','horizon']]){
    await pg.click('#'+id);await settled(pg);sample[name]=await state(pg);
    await screenshot(pg,name+'-'+viewport.width);await screenshot(pg,name+'-world-'+viewport.width,{world:true});
   }
   await pg.click('#look-sky');await settled(pg);sample.sky=await state(pg);
   await screenshot(pg,'sky-'+viewport.width);await screenshot(pg,'sky-world-'+viewport.width,{world:true});
   sample.native=await pg.evaluate(()=>JSON.parse(JSON.stringify(__oceanNative)));
   check(sample.native.images.filter(src=>src.includes('/assets/ocean/')).length===2,'both real water textures reach native GPU uploads '+viewport.width);
   check(sample.native.programs>=3&&sample.native.roles.surface.programs>0&&sample.native.roles.spray.programs>0&&sample.native.roles.surface.draws>0&&sample.native.roles.spray.draws>0&&sample.native.geometryCounts.some(count=>count>10000),'continuous surface and spray are real native ocean draws '+viewport.width);
   check(sample.native.roles.foam.programs>0&&sample.native.foamReads.some(read=>read.width===initialFoam.simulationSize&&read.height===initialFoam.simulationSize&&read.nonzero>0),'foam history contains nonempty pixels in the real simulation framebuffer '+viewport.width);
   check(sample.native.roles.spindrift.programs>0&&sample.native.roles.spindrift.draws>0&&sample.native.roles.spindrift.geometryCounts.includes(spindrift.triangles*3),'raymarched spray volumes reach a real indexed GPU draw '+viewport.width);
   const sky=sample.sky.landscape.sky;
   check(sky.night&&sky.milkyWay&&sky.moon&&sky.externalFiles===0&&sample.native.roles.galaxy.draws>0&&sample.native.roles.stars.draws>0&&sample.native.roles.stars.geometryCounts.includes(sky.stars),'procedural galaxy and actual star geometry reach native GPU draws '+viewport.width);
   check(sample.native.canvasUploads.some(texture=>texture.width===sky.textureSize[0]&&texture.height===sky.textureSize[1]&&texture.maximum>texture.minimum+20&&texture.mean>0),'the real galaxy canvas uploads varied radiance at the declared resolution '+viewport.width);
   const frozen=clocks(await state(pg)),frozenSteps=(await state(pg)).landscape.ocean.foamSimulation.steps,frozenDraws=await pg.evaluate(()=>__oceanNative.roles.foam.draws);await pg.waitForTimeout(450);
   check(JSON.stringify(clocks(await state(pg)))===JSON.stringify(frozen),'reduced motion freezes the ocean and sky '+viewport.width);
   check((await state(pg)).landscape.ocean.foamSimulation.steps===frozenSteps&&await pg.evaluate(()=>__oceanNative.roles.foam.draws)===frozenDraws,'reduced motion performs no extra simulation framebuffer draws '+viewport.width);
   const frozenStellarTimes=await pg.evaluate(()=>JSON.stringify([__oceanNative.roles.stars.times,__oceanNative.roles.meteor.times]));
   await pg.waitForTimeout(300);
   check(await pg.evaluate(()=>JSON.stringify([__oceanNative.roles.stars.times,__oceanNative.roles.meteor.times]))===frozenStellarTimes,'reduced motion freezes the actual celestial GPU clocks '+viewport.width);
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
   await pg.waitForFunction(()=>__oceanNative.roles.foam.draws>=30,null,{timeout:60000});
   sample.nativeAnimated=await pg.evaluate(()=>JSON.parse(JSON.stringify(__oceanNative)));
   const foamReads=sample.nativeAnimated.foamReads;
   check(foamReads.length===3&&foamReads.every(read=>read.nonzero>0)&&new Set(foamReads.map(read=>read.hash)).size===3&&new Set(sample.nativeAnimated.roles.foam.times).size>1,'native GPU framebuffer pixels evolve across simulation draws 1, 10 and 30 '+viewport.width);
   check((await state(pg)).landscape.ocean.foamSimulation.advected&&(await state(pg)).landscape.ocean.foamSimulation.decayed,'foam history advances with advection and decay '+viewport.width);
   check(new Set(sample.nativeAnimated.roles.spindrift.times).size>1&&sample.nativeAnimated.roles.spindrift.times.at(-1)===sample.nativeAnimated.roles.surface.times.at(-1),'volumetric spindrift receives exactly the animated parent-water GPU clock '+viewport.width);
   check(new Set(sample.nativeAnimated.roles.stars.times).size>1&&sample.nativeAnimated.roles.meteor.draws>0&&new Set(sample.nativeAnimated.roles.meteor.times).size>1,'stellar scintillation and meteor clocks advance in real GPU programs '+viewport.width);
   await pg.click('#view-list');const listClock=clocks(await state(pg)),listFoamDraws=await pg.evaluate(()=>__oceanNative.roles.foam.draws);await pg.waitForTimeout(500);
   check(JSON.stringify(clocks(await state(pg)))===JSON.stringify(listClock),'artworks list pauses the ocean '+viewport.width);
   check(await pg.evaluate(()=>__oceanNative.roles.foam.draws)===listFoamDraws,'artworks list pauses the actual GPU foam simulation '+viewport.width);
   const listStarDraws=await pg.evaluate(()=>__oceanNative.roles.stars.draws);await pg.waitForTimeout(300);
   check(await pg.evaluate(()=>__oceanNative.roles.stars.draws)===listStarDraws,'artworks list performs no celestial redraws '+viewport.width);
   await pg.click('#view-list');await hidden(pg,true);const hiddenClock=clocks(await state(pg)),hiddenFoamDraws=await pg.evaluate(()=>__oceanNative.roles.foam.draws);await pg.waitForTimeout(500);
   check(JSON.stringify(clocks(await state(pg)))===JSON.stringify(hiddenClock),'a hidden document pauses the ocean '+viewport.width);
   check(await pg.evaluate(()=>__oceanNative.roles.foam.draws)===hiddenFoamDraws,'a hidden document pauses the actual GPU foam simulation '+viewport.width);
   const hiddenStarDraws=await pg.evaluate(()=>__oceanNative.roles.stars.draws);await pg.waitForTimeout(300);
   check(await pg.evaluate(()=>__oceanNative.roles.stars.draws)===hiddenStarDraws,'a hidden document performs no celestial redraws '+viewport.width);
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
