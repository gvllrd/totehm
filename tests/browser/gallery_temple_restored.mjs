// The last summit is a nocturnal hub: real WebGL/Web Audio here, each artwork lives
// in its own original page. All identity, payment and media requests are local.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {launch,page} from './harness.mjs';
import {PerspectiveCamera,Vector3} from '../../space/vendor/three-0.180.0.mjs';

const OUT=process.argv[2]||'/tmp/totehm-production/storm-jump-final';
const origin='https://www.totehm.space',destinations=['/get_higher','/origins','/play_lisbon_street'];
const results=[];let checks=0,browser;
fs.mkdirSync(OUT,{recursive:true});
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=96x64:rate=8','-t','2','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart',OUT+'/fixture.mp4']);
const media=fs.readFileSync(OUT+'/fixture.mp4');
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const state=pg=>pg.evaluate(()=>window.__totehm_gallery());
const dayOf=d=>d.landscape?.day??d.temple?.day;
const clocks=d=>[d.temple?.time,d.landscape?.time,d.landscape?.sky?.time,d.landscape?.ocean?.time];
const close=async context=>{await context.close();};
const errors=log=>log.errors.filter(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e));

async function observe(pg,{hour=12,noWebGL=false}={}){
 await pg.addInitScript(({hour,noWebGL})=>{
  const NativeDate=Date,fixed=new NativeDate(2026,9,21,hour,0,0).getTime();
  window.Date=new Proxy(NativeDate,{construct:(Target,args)=>Reflect.construct(Target,args.length?args:[fixed])});
  const native=window.__templeNative={contexts:0,draws:0,instancedCounts:[],textureUploads:0,imageSources:[],lastUpload:0,audio:[],noises:[],tones:[],toneGains:[],lastFrame:0,canvasUploads:[],pointCounts:[],timeUniforms:{},oceanTimeUniforms:{},oceanPrograms:0,oceanDraws:0,oceanGeometryCounts:[],vegetationShader:false};
  const uniformNames=new WeakMap(),shaderKinds=new WeakMap(),programKinds=new WeakMap(),oceanPrograms=new WeakSet();let activeProgramKind=null;
  const get=HTMLCanvasElement.prototype.getContext,seenContexts=new WeakSet();
  HTMLCanvasElement.prototype.getContext=function(kind,...args){
   if(noWebGL&&/webgl/i.test(kind))return null;
   const value=Reflect.apply(get,this,[kind,...args]);
   if(value&&/webgl/i.test(kind)&&!seenContexts.has(value)){seenContexts.add(value);native.contexts++;}
   return value;
  };
  for(const Class of [globalThis.WebGLRenderingContext,globalThis.WebGL2RenderingContext]){
   if(!Class)continue;
   const shaderSource=Class.prototype.shaderSource;Class.prototype.shaderSource=function(shader,source){if(/uTempleWind/.test(source))native.vegetationShader=true;if(/\buOceanTime\b|\bOceanSurface\b|\boceanSurface\b/.test(source))shaderKinds.set(shader,'ocean');return Reflect.apply(shaderSource,this,[shader,source]);};
   const attachShader=Class.prototype.attachShader;Class.prototype.attachShader=function(program,shader){if(shaderKinds.get(shader)==='ocean'){programKinds.set(program,'ocean');if(!oceanPrograms.has(program)){oceanPrograms.add(program);native.oceanPrograms++;}}return Reflect.apply(attachShader,this,[program,shader]);};
   const useProgram=Class.prototype.useProgram;Class.prototype.useProgram=function(program){activeProgramKind=programKinds.get(program)||null;return Reflect.apply(useProgram,this,[program]);};
   for(const method of ['texImage2D','texSubImage2D']){
    const original=Class.prototype[method];
    Class.prototype[method]=function(...args){
     const image=args.find(x=>x instanceof HTMLImageElement||(globalThis.ImageBitmap&&x instanceof ImageBitmap));
     if(image){native.textureUploads++;native.lastUpload=performance.now();if(image.src&&!native.imageSources.includes(image.src))native.imageSources.push(image.src);}
     const canvas=args.find(x=>x instanceof HTMLCanvasElement);if(canvas&&!native.canvasUploads.some(c=>c.width===canvas.width&&c.height===canvas.height))native.canvasUploads.push({width:canvas.width,height:canvas.height});
     return Reflect.apply(original,this,args);
    };
   }
   for(const method of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
    const original=Class.prototype[method];if(!original)continue;
    Class.prototype[method]=function(...args){native.draws++;native.lastFrame=performance.now();if(args[0]===0&&!native.pointCounts.includes(args[2]))native.pointCounts.push(args[2]);if(method.endsWith('Instanced')&&!native.instancedCounts.includes(args.at(-1)))native.instancedCounts.push(args.at(-1));if(activeProgramKind==='ocean'){native.oceanDraws++;const count=method.startsWith('drawElements')?args[1]:args[2];if(!native.oceanGeometryCounts.includes(count))native.oceanGeometryCounts.push(count);}return Reflect.apply(original,this,args);};
   }
   const location=Class.prototype.getUniformLocation;Class.prototype.getUniformLocation=function(program,name){const value=Reflect.apply(location,this,[program,name]);if(value)uniformNames.set(value,{name,kind:programKinds.get(program)});return value;};
   const uniform=Class.prototype.uniform1f;Class.prototype.uniform1f=function(location,value){const meta=uniformNames.get(location),name=meta?.name;if(name&&/time/i.test(name)){for(const target of [native.timeUniforms,...(meta.kind==='ocean'?[native.oceanTimeUniforms]:[])]){const rows=target[name]||(target[name]=[]);if(rows.at(-1)!==value){rows.push(value);if(rows.length>16)rows.shift();}}}return Reflect.apply(uniform,this,[location,value]);};
  }
  const NativeAudio=window.AudioContext||window.webkitAudioContext;
  if(NativeAudio){
   const Observed=new Proxy(NativeAudio,{construct(Target,args){
    const context=Reflect.construct(Target,args);native.audio.push(context);
    const oscillator=context.createOscillator.bind(context),source=context.createBufferSource.bind(context),gain=context.createGain.bind(context);
    context.createOscillator=()=>{const node=oscillator(),connect=node.connect.bind(node);native.tones.push(node);node.connect=(target,...args)=>{if(target instanceof GainNode)native.toneGains.push({oscillator:node,gain:target});return connect(target,...args);};return node;};
    context.createBufferSource=()=>{const node=source();native.noises.push(node);return node;};
    let first=true;context.createGain=()=>{const node=gain();if(first){first=false;native.master=node;native.meter=context.createAnalyser();native.meter.fftSize=2048;node.connect(native.meter);}return node;};
    return context;
   }});
   if(window.AudioContext)window.AudioContext=Observed;else window.webkitAudioContext=Observed;
  }
  window.__templeRMS=()=>{
   if(!native.meter)return 0;const samples=new Float32Array(native.meter.fftSize);native.meter.getFloatTimeDomainData(samples);
   return Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length);
  };
  window.__templeAudioLayers=()=>({
   tones:native.toneGains.filter(({oscillator})=>oscillator.frequency.value>=20).map(({oscillator,gain})=>({frequency:oscillator.frequency.value,gain:gain.gain.value})),
   noises:native.noises.map(source=>({loop:source.loop,seconds:source.buffer?.duration||0,channels:source.buffer?.numberOfChannels||0})),
  });
 },{hour,noWebGL});
}
async function fixture(viewport,{hour=12,noWebGL=false}={}){
 const requests=[];
 const context=await page(browser,{dir:'space',origin,session:false,viewport,hasTouch:viewport.width<650,
  network:(url,request)=>{
   requests.push({url:url.href,method:request.method()});
   if(url.pathname.startsWith('/storage/v1/object/public/'))return {status:200,contentType:'video/mp4',headers:{'access-control-allow-origin':origin},body:media};
   return null;
  },functions:{'higher-checkout':{amount:1700,currency:'usd',left:777000},'stoner-gate':{access:false,reason:'no_session'}}});
 await observe(context.pg,{hour,noWebGL});return {...context,requests};
}
async function loaded(pg){
 await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&d.frames>0&&d.temple?.portals?.length===3;},null,{timeout:90000});
 await pg.waitForFunction(()=>{const d=__totehm_gallery();return d.temple.stoneMapsLoaded>=9&&d.temple.paperPortal?.loaded&&d.landscape.skyLoaded&&d.landscape.environmentLoaded;},null,{timeout:60000});
 await pg.waitForTimeout(300);return state(pg);
}
async function settled(pg){
 await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&!d.moving&&!d.transition?.active;},null,{timeout:30000});return state(pg);
}
async function hidden(pg,value){
 await pg.evaluate(value=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>value});document.dispatchEvent(new Event('visibilitychange'));},value);
}
async function screenshot(pg,name,{world=false}={}){
 let style;if(world)style=await pg.addStyleTag({content:'body>*:not(#space){visibility:hidden!important}#space,#space canvas{visibility:visible!important}'});
 const path=OUT+'/'+name+'.png';
 try{if(world)await pg.locator('#space canvas').screenshot({path});else await pg.screenshot({path});}finally{if(style)await style.evaluate(e=>e.remove());}
 return JSON.parse(execFileSync('python3',['-c',String.raw`
import hashlib,json,sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB');raw=im.tobytes();small=im.resize((120,80));pixels=list(small.getdata())
print(json.dumps({'hash':hashlib.sha256(raw).hexdigest(),'mean':sum(.2126*r+.7152*g+.0722*b for r,g,b in pixels)/len(pixels),'black':sum(max(p)<3 for p in pixels)/len(pixels),'colours':len(set(pixels))}))
`,path],{encoding:'utf8'}));
}
async function project(pg,point){
 const info=await pg.evaluate(()=>({camera:__totehm_gallery().camera,width:innerWidth,height:innerHeight}));
 const camera=new PerspectiveCamera(info.camera.fov,info.camera.aspect,.08,1600);camera.position.fromArray(info.camera.position);camera.lookAt(new Vector3(...info.camera.target));camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const projected=new Vector3(...point).project(camera);return {x:(projected.x+1)*info.width/2,y:(1-projected.y)*info.height/2};
}
async function enter(pg,room,{trace=false}={}){
 await pg.locator('.tour [data-room="'+room+'"]').click();
 check(await pg.locator('#work-info').isVisible()&&await pg.locator('#enter-experience').isVisible(),'selecting door '+room+' exposes the real experience action');
 await settled(pg);
 if(trace)await pg.evaluate(()=>{
  sessionStorage.removeItem('temple-test-transition');const capture=()=>{
   const d=window.__totehm_gallery?.();if(!d)return;
   const rows=JSON.parse(sessionStorage.getItem('temple-test-transition')||'[]');rows.push({at:performance.now(),fov:d.camera?.fov,frames:d.frames,transition:d.transition,audio:d.audio});
   sessionStorage.setItem('temple-test-transition',JSON.stringify(rows.slice(-50)));
   window.__transitionFrame=requestAnimationFrame(capture);
  };window.__transitionFrame=requestAnimationFrame(capture);
 });
 await pg.click('#enter-experience');
 await pg.waitForURL(url=>url.pathname===destinations[room],{timeout:30000});
}
async function recordJump(pg,action){
 await pg.evaluate(()=>{window.__jumpTrace=[];window.__jumpCapture=true;const capture=()=>{if(!window.__jumpCapture)return;const d=__totehm_gallery();__jumpTrace.push({at:performance.now(),position:d.position,eye:d.camera.position,physics:d.physics});window.__jumpFrame=requestAnimationFrame(capture);};window.__jumpFrame=requestAnimationFrame(capture);});
 try{await action();}finally{await pg.evaluate(()=>{window.__jumpCapture=false;cancelAnimationFrame(window.__jumpFrame);});}
 return pg.evaluate(()=>window.__jumpTrace);
}
async function keyUntil(pg,key,predicate,arg,{timeout=30000}={}){
 await pg.focus('#space');await pg.keyboard.down(key);
 try{await pg.waitForFunction(predicate,arg,{timeout});}finally{await pg.keyboard.up(key);}
}
async function analogUntil(pg,{x=0,y=0},predicate,arg,{timeout=30000}={}){
 const stick=await pg.locator('#joystick').boundingBox(),sx=stick.x+stick.width/2,sy=stick.y+stick.height/2;
 await pg.mouse.move(sx,sy);await pg.mouse.down();await pg.mouse.move(sx+x*22,sy+y*22);
 try{await pg.waitForFunction(predicate,arg,{timeout});}finally{await pg.mouse.up();}
}

try{
 browser=await launch();const noonSamples=new Map();
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const f=await fixture(viewport),{pg,ctx,log,requests}=f,sample={viewport,kind:'night-at-noon'};results.push(sample);const suffix=' at '+viewport.width;
  try{
   await pg.goto(origin+'/');sample.initial=await loaded(pg);
   check(sample.initial.build==='2026-10-22-space-storm-jump'&&sample.initial.zone==='temple'&&!sample.initial.fallback,'the storm-and-jump temple opens in a real 3D scene'+suffix);
   check(dayOf(sample.initial)===false&&sample.initial.landscape.permanentNight&&sample.initial.temple.portals.length===3,'the drowned world stays nocturnal at local noon with three antique portals'+suffix);
   check(sample.initial.landscape.sky.milkyWay&&sample.initial.landscape.sky.stars>5000&&sample.initial.landscape.sky.moon,'the sky contains a Milky Way, thousands of stars and a moon'+suffix);
   check(sample.initial.landscape.ocean.displacedGeometry&&sample.initial.landscape.ocean.swells>=2&&sample.initial.landscape.ocean.crestUpperBound<0&&sample.initial.landscape.ocean.baseHeight<sample.initial.landscape.ocean.crestUpperBound,'monumental displaced swells remain below the last summit'+suffix);
   check(sample.initial.temple.trees===0&&sample.initial.temple.flowers===0&&sample.initial.temple.planters===0&&sample.initial.temple.leafCards===0&&sample.initial.temple.vegetation===false&&sample.initial.temple.plants.length===0,'the temple contains no trees, flowers, foliage or planting beds'+suffix);
   check(sample.initial.temple.columns===8&&sample.initial.temple.columnTops.length===8&&sample.initial.temple.roof===false&&sample.initial.temple.entablature===false&&sample.initial.temple.pediment===false,'only freestanding columns and doors rise above the stone terrace'+suffix);
   check(sample.initial.temple.archHeight>sample.initial.temple.columnHeight&&sample.initial.temple.doorsAboveColumns&&sample.initial.temple.portals.every(p=>p.width===4.5&&p.height===10.725&&p.outerHeight>9.52),'all three enlarged doors stand above the column capitals'+suffix);
   check(await pg.locator('iframe,video,#spatial-player').count()===0,'the temple has no embedded or merged experience player'+suffix);
   check((await pg.evaluate(()=>__templeNative.audio.length))===0&&!sample.initial.audio.unlocked,'sound is not constructed before a real gesture'+suffix);
   check(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'temple interface fits the viewport'+suffix);
   sample.worldPixels=await screenshot(pg,'noon-night-world-'+viewport.width,{world:true});noonSamples.set(viewport.width,sample.worldPixels);
   await screenshot(pg,'entrance-ui-'+viewport.width);
   check(sample.worldPixels.mean>4&&sample.worldPixels.mean<100&&sample.worldPixels.black<.9&&sample.worldPixels.colours>300,'the night keeps textured temple stones and a readable world'+suffix);
   await pg.waitForFunction(()=>__templeNative.imageSources.filter(src=>src.includes('/assets/temple/')).length>=2,null,{timeout:45000});
   sample.nativeTextures=await pg.evaluate(()=>({contexts:__templeNative.contexts,draws:__templeNative.draws,uploads:__templeNative.textureUploads,sources:__templeNative.imageSources,instancedCounts:__templeNative.instancedCounts,canvasUploads:__templeNative.canvasUploads,pointCounts:__templeNative.pointCounts,timeUniforms:__templeNative.timeUniforms,oceanPrograms:__templeNative.oceanPrograms,oceanDraws:__templeNative.oceanDraws,oceanGeometryCounts:__templeNative.oceanGeometryCounts,vegetationShader:__templeNative.vegetationShader}));
   check(sample.nativeTextures.contexts===1&&sample.nativeTextures.draws>0&&sample.nativeTextures.uploads>=2,'real temple image textures reach the native GPU'+suffix);
   check(sample.nativeTextures.canvasUploads.some(c=>c.width===sample.initial.landscape.sky.textureSize[0]&&c.height===sample.initial.landscape.sky.textureSize[1])&&sample.nativeTextures.pointCounts.includes(sample.initial.landscape.sky.stars),'the actual celestial canvas and star points reach native GPU uploads and draws'+suffix);
   check(!sample.nativeTextures.vegetationShader&&!sample.nativeTextures.instancedCounts.includes(viewport.width<650?5760:11520),'the removed foliage is absent from native shaders and instanced draws'+suffix);
   check(sample.nativeTextures.oceanPrograms>0&&sample.nativeTextures.oceanDraws>0&&sample.nativeTextures.oceanGeometryCounts.some(count=>count>10000),'the displaced ocean is linked and drawn as real high-resolution native geometry'+suffix);
   check(sample.initial.landscape.ocean.rolledCrests&&sample.initial.landscape.ocean.analyticNormals&&sample.initial.landscape.ocean.skyReflections&&sample.nativeTextures.pointCounts.includes(sample.initial.landscape.ocean.sprayParticles),'the rolled ocean reflects the real sky and draws its crest spray as native points'+suffix);
   const movingWorld=sample.initial.landscape;await pg.waitForFunction(previous=>{const d=__totehm_gallery().landscape;return d.ocean.time>previous.ocean+.025&&d.sky.time>previous.sky+.025;},{ocean:movingWorld.ocean.time,sky:movingWorld.sky.time},{timeout:15000});
   check(await pg.evaluate(()=>Object.values(__templeNative.timeUniforms).some(values=>new Set(values).size>1)),'the ocean and stars advance with real native shader time uniforms'+suffix);
   check(await pg.evaluate(()=>Object.values(__templeNative.oceanTimeUniforms).some(values=>new Set(values).size>1)),'the actual ocean program receives advancing time independently of the stars'+suffix);
   check(sample.initial.temple.paperPortal?.papers===(viewport.width<650?18:24)&&sample.nativeTextures.instancedCounts.includes(sample.initial.temple.paperPortal.papers)&&sample.nativeTextures.sources.some(src=>src.endsWith('/assets/gallery/totehmpaper.png')),'the door renders many copies of the genuine perforated paper as native instances'+suffix);
   await pg.click('#enter-gallery');
   check(new URL(pg.url()).pathname==='/'&&(await state(pg)).zone==='temple','begin activates the visit without entering an artwork'+suffix);
   await pg.waitForFunction(()=>__totehm_gallery().audio.unlocked&&__templeNative.audio.length===1);
   await pg.waitForTimeout(850);sample.farRMS=await pg.evaluate(()=>__templeRMS());sample.farAudioLayers=await pg.evaluate(()=>__templeAudioLayers());
   check(sample.farRMS>.0001&&sample.farRMS<.12,'real wind and sea are audible at the temple entrance without approaching a door'+suffix);
   check(sample.farAudioLayers.noises.filter(n=>n.loop&&n.channels===2&&n.seconds>4).length===4,'four native stereo noise sources sustain the wind and sea without downloaded audio'+suffix);
   const beforeJump=await state(pg);
   sample.jumpTrace=await recordJump(pg,async()=>{
    if(viewport.width<650)await pg.locator('#jump').tap();else{await pg.focus('#space');await pg.keyboard.down('Space');}
    try{
     await pg.waitForFunction(()=>!__totehm_gallery().physics.grounded&&__totehm_gallery().physics.feetHeight>.3,null,{timeout:20000});
     if(viewport.width>=650){await pg.keyboard.down('Space');await pg.keyboard.down('Space');}
     await pg.waitForFunction(jumps=>{const p=__totehm_gallery().physics;return p.jumps>jumps&&p.grounded;},beforeJump.physics.jumps,{timeout:45000});
    }finally{if(viewport.width>=650)await pg.keyboard.up('Space');}
   });
   const afterJump=await state(pg),heights=sample.jumpTrace.map(row=>row.physics.feetHeight);
   check(Math.max(...heights)>9.6&&sample.jumpTrace.some(row=>row.physics.velocityY>0)&&sample.jumpTrace.some(row=>row.physics.velocityY<0),'a genuine '+(viewport.width<650?'touch':'Space')+' input produces a rising and falling jump high enough to reach a column'+suffix);
   check(afterJump.physics.grounded&&Math.abs(afterJump.physics.feetHeight+.09)<.002&&afterJump.physics.jumps===beforeJump.physics.jumps+1,'landing returns to stone and a held or repeated jump key does not create flight'+suffix);
   await pg.focus('#overview');await pg.keyboard.press('Space');await settled(pg);
   check((await state(pg)).physics.jumps===afterJump.physics.jumps,'Space activates a focused interface button without jumping'+suffix);
   const beforeWalk=(await state(pg)).position;await pg.focus('#space');await pg.keyboard.down('w');
   try{await pg.waitForFunction(z=>__totehm_gallery().position[1]<z-.2,beforeWalk[1],{timeout:6000});}finally{await pg.keyboard.up('w');}
   check(!(await state(pg)).moving&&(await state(pg)).position[1]<beforeWalk[1]-.2,'keyboard walk advances and releases on temple stone'+suffix);
   await pg.locator('.tour [data-room="1"]').click();
   check(await pg.locator('#work-info').isVisible()&&await pg.locator('#enter-experience').isVisible(),'selection immediately exposes its panel and entry action'+suffix);
   sample.near=await settled(pg);
   check(sample.near.room===1&&Math.abs(sample.near.position[0])<.03&&Math.abs(sample.near.position[1]+10.6)<.08,'guided doorway selection stops before the central sill'+suffix);
   check(new URL(pg.url()).pathname==='/'&&sample.near.audio.proximity>.5,'approach alone keeps the temple and raises its magnetic sound'+suffix);
   await pg.waitForTimeout(700);sample.nearRMS=await pg.evaluate(()=>__templeRMS());sample.nearAudioLayers=await pg.evaluate(()=>__templeAudioLayers());
   check(sample.nearRMS>.0001&&sample.nearRMS<.12&&sample.nearAudioLayers.tones.filter(t=>t.frequency===50||t.frequency===70).length===2&&sample.nearAudioLayers.tones.filter(t=>t.frequency===50||t.frequency===70).every(t=>t.gain>.001),'the native magnetic tones rise near the doorway while wind and sea continue'+suffix);
   check(await pg.evaluate(()=>__templeNative.audio.length===1&&__templeNative.tones.length>=2),'approaching reuses one real audio context and its voices'+suffix);
   await screenshot(pg,'portal-close-'+viewport.width);
   await pg.click('#look-sea');await settled(pg);sample.sea=await state(pg);sample.seaPixels=await screenshot(pg,'sea-world-'+viewport.width,{world:true});
   check(sample.sea.camera.target[0]<sample.sea.camera.position[0]&&sample.seaPixels.hash!==sample.worldPixels.hash,'the sea viewpoint looks left into a genuinely different rendering'+suffix);
   await pg.click('#look-horizon');await settled(pg);sample.horizon=await state(pg);sample.horizonPixels=await screenshot(pg,'drowned-horizon-world-'+viewport.width,{world:true});
   check(sample.horizon.camera.target[0]>sample.horizon.camera.position[0]&&sample.horizonPixels.hash!==sample.seaPixels.hash,'the second viewpoint looks right across the drowned horizon'+suffix);
   await pg.click('#overview');await settled(pg);
   check(JSON.stringify((await state(pg)).position)===JSON.stringify([0,12]),'return restores the original temple entrance'+suffix);
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.waitForFunction(()=>__totehm_gallery().reduced_motion);
   await pg.waitForTimeout(500);const frozen=await state(pg),frozenOceanUniforms=await pg.evaluate(()=>JSON.stringify(__templeNative.oceanTimeUniforms));await pg.waitForTimeout(350);const frozenEnd=await state(pg);
   check(frozenEnd.frames===frozen.frames&&JSON.stringify(clocks(frozenEnd))===JSON.stringify(clocks(frozen))&&!frozenEnd.landscape.ocean.animated&&!frozenEnd.landscape.sky.animated,'reduced motion freezes geometry, waves, stars and architecture'+suffix);
   check(await pg.evaluate(()=>JSON.stringify(__templeNative.oceanTimeUniforms))===frozenOceanUniforms,'reduced motion also stops actual ocean shader time uploads'+suffix);
   if(viewport.width<650){
    const start=(await state(pg)).position,r=await pg.locator('#joystick').boundingBox(),cdp=await ctx.newCDPSession(pg);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width/2,y:r.y+5}]});
    try{await pg.waitForFunction(z=>__totehm_gallery().position[1]<z-.15,start[1],{timeout:6000});}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
    check(!(await state(pg)).moving,'real touch joystick moves and releases without leaving the terrace');
   }
   await pg.click('#view-list');await pg.waitForFunction(()=>__totehm_gallery().list&&__totehm_gallery().audio.state==='suspended');
   const listed=await state(pg);await pg.waitForTimeout(350);const listedEnd=await state(pg);
   check(listed.frames===listedEnd.frames&&JSON.stringify(clocks(listed))===JSON.stringify(clocks(listedEnd)),'the artwork list pauses world rendering and sound'+suffix);
   check(await pg.locator('#origins .origin-card').count()===20&&await pg.locator('#totehmpaper a[href="/get_higher"]').count()>0&&await pg.locator('#lisbon a[href="/play_lisbon_street"]').count()>0,'the accessible list retains twenty Origins and independent experience links'+suffix);
   check(await pg.locator('#origins .origin-card').evaluateAll(cards=>cards.every((a,i)=>new URL(a.href).pathname==='/origins'&&Number(new URL(a.href).searchParams.get('work'))===i+1)),'every polaroid still links to its authored independent Origins chapter'+suffix);
   await pg.click('#view-list');await pg.waitForFunction(()=>!__totehm_gallery().list&&__totehm_gallery().audio.state==='running');
   await pg.click('#toggle-sound');await pg.waitForFunction(()=>__totehm_gallery().audio.muted&&__totehm_gallery().audio.state==='suspended');
   check(await pg.locator('#toggle-sound').getAttribute('aria-pressed')==='false','mute exposes its state and suspends the native context'+suffix);
   check(await pg.evaluate(()=>__templeNative.master.gain.value<.01)&&!(await state(pg)).audio.weather.active,'mute fades the native master and stops weather output'+suffix);
   await pg.click('#toggle-sound');await pg.waitForFunction(()=>__totehm_gallery().audio.state==='running');
   await hidden(pg,true);await pg.waitForFunction(()=>__totehm_gallery().audio.state==='suspended');
   const hiddenStart=await state(pg);await pg.waitForTimeout(350);const hiddenEnd=await state(pg);
   check(hiddenStart.frames===hiddenEnd.frames&&JSON.stringify(clocks(hiddenStart))===JSON.stringify(clocks(hiddenEnd)),'hidden tabs suspend geometry, atmosphere and native audio'+suffix);
   await hidden(pg,false);await pg.waitForFunction(()=>__totehm_gallery().audio.state==='running');
   check(!requests.some(r=>/\.(mp3|wav|ogg|aac|flac)(\?|$)/i.test(r.url)),'approach ambience needs no external audio file'+suffix);
   check(!requests.some(r=>/\/storage\/v1\/object\/(public|sign)\//.test(new URL(r.url).pathname)),'the hub requests no experience video or private sequence'+suffix);
   check(errors(log).length===0,'nocturnal temple has no application or GPU shader errors'+suffix);
   await pg.emulateMedia({reducedMotion:'no-preference'});await pg.click('#overview');await settled(pg);
   await enter(pg,1,{trace:true});await pg.waitForSelector('#deck .slide');
   const trace=await pg.evaluate(()=>JSON.parse(sessionStorage.getItem('temple-test-transition')||'[]'));sample.transitionTrace=trace;
   check(trace.some(row=>row.transition?.active&&row.fov>(viewport.width<650?72.2:60.2))&&trace.filter(row=>row.transition?.active).every(row=>row.fov>=(viewport.width<650?72:60))&&trace.some(row=>row.audio?.transitions>0),'crossing renders the FOV aspiration and a synthetic breath before navigation'+suffix);
   check(await pg.locator('#deck .slide').count()===21&&await pg.locator('#deck video').count()===20&&await pg.locator('#space,#spatial-player,iframe').count()===0,'Origins opens its own original reader, not an embedded temple view'+suffix);
   check(errors(log).length===0,'independent Origins navigation has no application errors'+suffix);
   sample.log=log;
  }catch(error){sample.error=String(error);sample.failed=await state(pg).catch(()=>null);await pg.screenshot({path:OUT+'/failure-noon-night-'+viewport.width+'.png'}).catch(()=>{});throw error;}
  finally{sample.requests=requests;fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await close(ctx);}
 }
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const {pg,ctx,log}=await fixture(viewport,{hour:22}),sample={viewport,kind:'night'};results.push(sample);
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/');sample.state=await loaded(pg);
   check(dayOf(sample.state)===false&&sample.state.landscape.permanentNight,'the same nocturnal world remains selected at local 22:00 at '+viewport.width);
   sample.pixels=await screenshot(pg,'night-world-'+viewport.width,{world:true});await screenshot(pg,'night-ui-'+viewport.width);
   check(sample.pixels.mean>4&&sample.pixels.mean<100&&sample.pixels.mean>noonSamples.get(viewport.width).mean*.4&&sample.pixels.mean<noonSamples.get(viewport.width).mean*2,'night remains visible and does not become a daylight world at another connection hour '+viewport.width);
   check(sample.pixels.colours>200&&sample.pixels.black<.9,'night lighting keeps the antique stones and landscape visible at '+viewport.width);
   check(errors(log).length===0,'night has no application or GPU shader errors at '+viewport.width);sample.log=log;
  }catch(error){sample.error=String(error);sample.failed=await state(pg).catch(()=>null);throw error;}
  finally{fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await close(ctx);}
 }
 for(const room of [0,2]){
  const {pg,ctx,log}=await fixture({width:390,height:844}),sample={kind:'independent',room};results.push(sample);
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/');await loaded(pg);await pg.click('#enter-gallery');
   if(room===0){
    await pg.locator('.tour [data-room="0"]').click();sample.preview=await settled(pg);
    await screenshot(pg,'paper-door-close-390');
   }
   await enter(pg,room);
   check(new URL(pg.url()).pathname===destinations[room],'door '+room+' navigates to its independent canonical file');
   check(await pg.locator('#space,#spatial-player,iframe').count()===0,'door '+room+' leaves the temple rather than merging its experience');
   check((await pg.title())===(room===0?'TOTEHM — Get Higher':'TOTEHM — Lisbon Streets Higher'),'door '+room+' renders its original page title');
   if(room===2){await pg.waitForFunction(()=>window.__totehm_lisbon?.().rocks===22);check((await pg.evaluate(()=>__totehm_lisbon())).rocks===22,'independent Lisbon retains all twenty-two original signs');}
   check(errors(log).length===0,'independent page '+room+' has no application errors');sample.log=log;
  }catch(error){sample.error=String(error);throw error;}
  finally{fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await close(ctx);}
 }
 {
  const {pg,ctx,log}=await fixture({width:1440,height:1000}),sample={kind:'physical-threshold'};results.push(sample);
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/');await loaded(pg);await pg.click('#enter-gallery');
   for(const x of [-11,11]){
    const oldBed=await project(pg,[x,-.09,-3]);check(oldBed.x>0&&oldBed.x<1440&&oldBed.y>0&&oldBed.y<1000,'the former planting is a visible physical floor target');
    await pg.mouse.click(oldBed.x,oldBed.y);
    await pg.waitForFunction(x=>{const d=__totehm_gallery();return Math.abs(d.position[0]-x)<.15&&Math.abs(d.position[1]+3)<.15&&!d.moving;},x);
    check(new URL(pg.url()).pathname==='/'&&(await state(pg)).room===-1,'a real floor click crosses the former planting without an invisible obstacle');
    await pg.click('#overview');await settled(pg);
   }
   const floor=await project(pg,[0,-.09,-8]);await pg.mouse.click(floor.x,floor.y);
   await pg.waitForFunction(()=>Math.abs(__totehm_gallery().position[1]+8)<.15&&!__totehm_gallery().moving);
   check(new URL(pg.url()).pathname==='/'&&(await state(pg)).room===-1,'an actual floor ray moves along the central aisle without selecting a page');
   const arch=await project(pg,[0,3.1,-12]);await pg.mouse.click(arch.x,arch.y);await settled(pg);
   check((await state(pg)).room===1&&Math.abs((await state(pg)).position[1]+10.6)<.1&&new URL(pg.url()).pathname==='/','an actual arch-cover ray approaches and selects the correct doorway');
   await pg.focus('#space');await pg.keyboard.down('w');
   try{await pg.waitForURL(url=>url.pathname==='/origins',{timeout:15000});}finally{await pg.keyboard.up('w');}
   check(new URL(pg.url()).pathname==='/origins','physically crossing the sill launches the original independent experience');
   check(errors(log).length===0,'floor, arch and physical threshold work without application errors');sample.log=log;
  }catch(error){sample.error=String(error);sample.failed=await state(pg).catch(()=>null);await pg.screenshot({path:OUT+'/failure-physical.png'}).catch(()=>{});throw error;}
  finally{fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await close(ctx);}
 }
 {
  const {pg,ctx,log}=await fixture({width:1440,height:1000}),sample={kind:'column-jump'};results.push(sample);
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/');await loaded(pg);await pg.click('#enter-gallery');
   const start=await project(pg,[12,-.09,-3]);
   check(start.x>0&&start.x<1440&&start.y>0&&start.y<1000,'the approach to a column is a visible authored floor target');
   await pg.mouse.click(start.x,start.y);
   await pg.waitForFunction(()=>{const d=__totehm_gallery();return Math.abs(d.position[0]-12)<.15&&Math.abs(d.position[1]+3)<.15&&!d.moving;});
   await analogUntil(pg,{x:.18},()=>__totehm_gallery().position[0]>13.2);
   await analogUntil(pg,{y:-.18},()=>__totehm_gallery().position[1]<-3.95);
   sample.approach=await state(pg);
   const before=sample.approach.physics.jumps;
   sample.ascent=await recordJump(pg,async()=>{
    await pg.focus('#space');await pg.keyboard.down('Space');
    try{
     await pg.waitForFunction(()=>__totehm_gallery().physics.feetHeight>9.6,null,{timeout:30000});
     await pg.keyboard.down('d');
     await pg.waitForFunction(()=>__totehm_gallery().position[0]>14.65,null,{timeout:45000});
     await pg.keyboard.up('d');
     await pg.waitForFunction(()=>{const p=__totehm_gallery().physics;return p.grounded&&p.supportColumn!==null&&Math.abs(p.feetHeight-9.52)<.002;},null,{timeout:45000});
    }finally{await pg.keyboard.up('d');await pg.keyboard.up('Space');}
   });
   sample.onColumn=await state(pg);
   check(sample.onColumn.physics.jumps===before+1&&sample.onColumn.physics.grounded&&sample.onColumn.physics.supportColumn!==null&&Math.abs(sample.onColumn.camera.position[1]-11.26)<.003,'Space and air movement land the user on a real 9.52 m column capital');
   check(sample.ascent.some(row=>row.physics.velocityY<0&&row.physics.feetHeight>9.52)&&sample.ascent.some(row=>row.position[0]<13.9&&row.physics.feetHeight<9),'access to the capital uses a real vertical ascent followed by air movement and descending contact');
   const stationary=sample.onColumn.physics.feetHeight;await pg.waitForTimeout(350);
   check(Math.abs((await state(pg)).physics.feetHeight-stationary)<.001,'standing on a column is stable without repeat jumping or vertical drift');
   await pg.mouse.move(700,500);await pg.mouse.down();await pg.mouse.move(1100,380,{steps:12});await pg.mouse.up();
   sample.columnPixels=await screenshot(pg,'column-sea-world-1440',{world:true});await screenshot(pg,'column-sea-ui-1440');
   check(sample.columnPixels.colours>200&&sample.columnPixels.mean>3,'the sea and night remain rendered from the elevated column viewpoint');
   await pg.emulateMedia({reducedMotion:'no-preference'});
   sample.returnTrace=await recordJump(pg,async()=>{await pg.click('#overview');await settled(pg);});
   sample.returned=await state(pg);
   check(sample.returned.physics.grounded&&sample.returned.physics.supportColumn===null&&Math.abs(sample.returned.physics.feetHeight+.09)<.002&&Math.abs(sample.returned.position[0])<.03&&Math.abs(sample.returned.position[1]-12)<.03,'guided return from a column reaches the entrance on the real floor');
   check(sample.returnTrace.some(row=>row.physics.velocityY<0&&row.physics.feetHeight>0&&row.physics.feetHeight<9.4),'guided return falls naturally from the capital instead of teleporting vertically');
   await pg.locator('.tour [data-room="1"]').click();await settled(pg);await pg.focus('#space');
   sample.airThreshold=await recordJump(pg,async()=>{
    await pg.keyboard.down('Space');await pg.keyboard.down('w');
    try{await pg.waitForFunction(()=>{const d=__totehm_gallery();return d.position[1]<-12.15&&!d.physics.grounded;},null,{timeout:20000});}finally{await pg.keyboard.up('w');}
    check(new URL(pg.url()).pathname==='/'&&!(await state(pg)).transition.active,'flying through an arch does not falsely trigger a ground-level portal');
    await pg.keyboard.down('s');
    try{await pg.waitForFunction(()=>__totehm_gallery().position[1]>-11.3,null,{timeout:20000});}finally{await pg.keyboard.up('s');await pg.keyboard.up('Space');}
    await pg.waitForFunction(()=>__totehm_gallery().physics.grounded,null,{timeout:20000});
   });
   check(new URL(pg.url()).pathname==='/'&&(await state(pg)).physics.grounded,'an airborne approach can safely return to the temple before landing');
   await pg.click('#overview');await settled(pg);
   const gap=await project(pg,[4.5,-.09,0]);await pg.mouse.click(gap.x,gap.y);await settled(pg);
   await keyUntil(pg,'w',()=>__totehm_gallery().position[1]<-12.88);
   await analogUntil(pg,{x:-.18},()=>__totehm_gallery().position[0]<2.8);
   sample.behindJamb=await state(pg);
   check(sample.behindJamb.position[1]<-12.85&&sample.behindJamb.position[0]<2.85&&new URL(pg.url()).pathname==='/','real walking reaches the rear paving behind a stone doorway jamb');
   sample.rearReturnTrace=await recordJump(pg,async()=>{await pg.click('#overview');await settled(pg);});
   check(Math.abs((await state(pg)).position[0])<.03&&Math.abs((await state(pg)).position[1]-12)<.03&&sample.rearReturnTrace.every(row=>row.physics.grounded),'guided return follows the actual corners around a jamb without cutting through stone');
   check(errors(log).length===0,'column access, high viewpoints and airborne portal guards have no application or GPU errors');sample.log=log;
  }catch(error){sample.error=String(error);sample.failed=await state(pg).catch(()=>null);await pg.screenshot({path:OUT+'/failure-column.png'}).catch(()=>{});throw error;}
  finally{fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await close(ctx);}
 }
 {
  const {pg,ctx,log}=await fixture({width:390,height:844},{hour:12,noWebGL:true}),sample={kind:'fallback'};results.push(sample);
  try{
   await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_gallery?.().fallback);
   check(await pg.locator('#gallery').isVisible()&&await pg.locator('#origins .origin-card').count()===20,'without WebGL the complete independent artwork list stays available');
   await pg.locator('#origins .origin-card').nth(16).click();await pg.waitForURL(url=>url.pathname==='/origins');
   await pg.waitForFunction(()=>document.querySelector('#counter')?.textContent==='17 / 20');
   check(new URL(pg.url()).searchParams.get('work')==='17'&&(await pg.locator('#vid16').getAttribute('src'))?.endsWith('/17.mp4'),'fallback photo seventeen opens the original video and reader chapter');
   check(errors(log).length===0,'fallback navigation has no application errors');sample.log=log;
  }catch(error){sample.error=String(error);throw error;}
  finally{fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await close(ctx);}
 }
 console.log('PASS '+checks+' tidal-ocean checks; evidence '+OUT);
}finally{await browser?.close();}
