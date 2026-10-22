// The restored temple is a hub: real WebGL/Web Audio here, each artwork lives
// in its own original page. All identity, payment and media requests are local.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {launch,page} from './harness.mjs';
import {PerspectiveCamera,Vector3} from '../../space/vendor/three-0.180.0.mjs';

const OUT=process.argv[2]||'/tmp/totehm-production/temple-restored';
const origin='https://www.totehm.space',destinations=['/get_higher','/origins','/play_lisbon_street'];
const results=[];let checks=0,browser;
fs.mkdirSync(OUT,{recursive:true});
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=96x64:rate=8','-t','2','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart',OUT+'/fixture.mp4']);
const media=fs.readFileSync(OUT+'/fixture.mp4');
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const state=pg=>pg.evaluate(()=>window.__totehm_gallery());
const dayOf=d=>d.landscape?.day??d.temple?.day;
const clocks=d=>[d.temple?.time,d.landscape?.time];
const close=async context=>{await context.close();};
const errors=log=>log.errors.filter(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e));

async function observe(pg,{hour=12,noWebGL=false}={}){
 await pg.addInitScript(({hour,noWebGL})=>{
  const NativeDate=Date,fixed=new NativeDate(2026,9,21,hour,0,0).getTime();
  window.Date=new Proxy(NativeDate,{construct:(Target,args)=>Reflect.construct(Target,args.length?args:[fixed])});
  const native=window.__templeNative={contexts:0,draws:0,instancedCounts:[],textureUploads:0,imageSources:[],lastUpload:0,audio:[],noises:[],tones:[],lastFrame:0};
  const get=HTMLCanvasElement.prototype.getContext,seenContexts=new WeakSet();
  HTMLCanvasElement.prototype.getContext=function(kind,...args){
   if(noWebGL&&/webgl/i.test(kind))return null;
   const value=Reflect.apply(get,this,[kind,...args]);
   if(value&&/webgl/i.test(kind)&&!seenContexts.has(value)){seenContexts.add(value);native.contexts++;}
   return value;
  };
  for(const Class of [globalThis.WebGLRenderingContext,globalThis.WebGL2RenderingContext]){
   if(!Class)continue;
   for(const method of ['texImage2D','texSubImage2D']){
    const original=Class.prototype[method];
    Class.prototype[method]=function(...args){
     const image=args.find(x=>x instanceof HTMLImageElement||(globalThis.ImageBitmap&&x instanceof ImageBitmap));
     if(image){native.textureUploads++;native.lastUpload=performance.now();if(image.src&&!native.imageSources.includes(image.src))native.imageSources.push(image.src);}
     return Reflect.apply(original,this,args);
    };
   }
   for(const method of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
    const original=Class.prototype[method];if(!original)continue;
    Class.prototype[method]=function(...args){native.draws++;native.lastFrame=performance.now();if(method.endsWith('Instanced')&&!native.instancedCounts.includes(args.at(-1)))native.instancedCounts.push(args.at(-1));return Reflect.apply(original,this,args);};
   }
  }
  const NativeAudio=window.AudioContext||window.webkitAudioContext;
  if(NativeAudio){
   const Observed=new Proxy(NativeAudio,{construct(Target,args){
    const context=Reflect.construct(Target,args);native.audio.push(context);
    const oscillator=context.createOscillator.bind(context),source=context.createBufferSource.bind(context),gain=context.createGain.bind(context);
    context.createOscillator=()=>{const node=oscillator();native.tones.push(node);return node;};
    context.createBufferSource=()=>{const node=source();native.noises.push(node);return node;};
    let first=true;context.createGain=()=>{const node=gain();if(first){first=false;native.meter=context.createAnalyser();native.meter.fftSize=2048;node.connect(native.meter);}return node;};
    return context;
   }});
   if(window.AudioContext)window.AudioContext=Observed;else window.webkitAudioContext=Observed;
  }
  window.__templeRMS=()=>{
   if(!native.meter)return 0;const samples=new Float32Array(native.meter.fftSize);native.meter.getFloatTimeDomainData(samples);
   return Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length);
  };
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
 await pg.waitForFunction(()=>{const d=__totehm_gallery();return d.temple.stoneMapsLoaded>=9&&d.temple.paperPortal?.loaded&&d.landscape.skyLoaded&&d.landscape.hdrLoaded;},null,{timeout:60000});
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

try{
 browser=await launch();const daySamples=new Map();
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const f=await fixture(viewport),{pg,ctx,log,requests}=f,sample={viewport,kind:'day'};results.push(sample);const suffix=' at '+viewport.width;
  try{
   await pg.goto(origin+'/');sample.initial=await loaded(pg);
   check(sample.initial.build==='2026-10-21-space-temple-restored'&&sample.initial.zone==='temple'&&!sample.initial.fallback,'restored temple opens in a real 3D scene'+suffix);
   check(dayOf(sample.initial)===true&&sample.initial.temple.portals.length===3,'local daytime and three antique portals are present'+suffix);
   check(await pg.locator('iframe,video,#spatial-player').count()===0,'the temple has no embedded or merged experience player'+suffix);
   check((await pg.evaluate(()=>__templeNative.audio.length))===0&&!sample.initial.audio.unlocked,'sound is not constructed before a real gesture'+suffix);
   check(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'temple interface fits the viewport'+suffix);
   sample.dayPixels=await screenshot(pg,'day-world-'+viewport.width,{world:true});daySamples.set(viewport.width,sample.dayPixels);
   await screenshot(pg,'entrance-ui-'+viewport.width);
   check(sample.dayPixels.mean>12&&sample.dayPixels.black<.85&&sample.dayPixels.colours>300,'the day scene contains textured, lit world pixels'+suffix);
   await pg.waitForFunction(()=>__templeNative.imageSources.filter(src=>src.includes('/assets/temple/')).length>=2,null,{timeout:45000});
   sample.nativeTextures=await pg.evaluate(()=>({contexts:__templeNative.contexts,draws:__templeNative.draws,uploads:__templeNative.textureUploads,sources:__templeNative.imageSources,instancedCounts:__templeNative.instancedCounts}));
   check(sample.nativeTextures.contexts===1&&sample.nativeTextures.draws>0&&sample.nativeTextures.uploads>=2,'real temple image textures reach the native GPU'+suffix);
   check(sample.initial.temple.paperPortal?.papers===(viewport.width<650?18:24)&&sample.nativeTextures.instancedCounts.includes(sample.initial.temple.paperPortal.papers)&&sample.nativeTextures.sources.some(src=>src.endsWith('/assets/gallery/totehmpaper.png')),'the door renders many copies of the genuine perforated paper as native instances'+suffix);
   await pg.click('#enter-gallery');
   check(new URL(pg.url()).pathname==='/'&&(await state(pg)).zone==='temple','begin activates the visit without entering an artwork'+suffix);
   await pg.waitForFunction(()=>__totehm_gallery().audio.unlocked&&__templeNative.audio.length===1);
   await pg.waitForTimeout(350);sample.farRMS=await pg.evaluate(()=>__templeRMS());
   const beforeWalk=(await state(pg)).position;await pg.focus('#space');await pg.keyboard.down('w');
   try{await pg.waitForFunction(z=>__totehm_gallery().position[1]<z-.2,beforeWalk[1],{timeout:6000});}finally{await pg.keyboard.up('w');}
   check(!(await state(pg)).moving&&(await state(pg)).position[1]<beforeWalk[1]-.2,'keyboard walk advances and releases on temple stone'+suffix);
   await pg.locator('.tour [data-room="1"]').click();
   check(await pg.locator('#work-info').isVisible()&&await pg.locator('#enter-experience').isVisible(),'selection immediately exposes its panel and entry action'+suffix);
   sample.near=await settled(pg);
   check(sample.near.room===1&&Math.abs(sample.near.position[0])<.03&&Math.abs(sample.near.position[1]+10.6)<.08,'guided doorway selection stops before the central sill'+suffix);
   check(new URL(pg.url()).pathname==='/'&&sample.near.audio.proximity>.5,'approach alone keeps the temple and raises its magnetic sound'+suffix);
   await pg.waitForTimeout(500);sample.nearRMS=await pg.evaluate(()=>__templeRMS());
   check(sample.nearRMS>.0001&&sample.nearRMS>sample.farRMS*2+.00005&&sample.nearRMS<.05,'native measured audio rises gently near the actual doorway'+suffix);
   check(await pg.evaluate(()=>__templeNative.audio.length===1&&__templeNative.tones.length>=2),'approaching reuses one real audio context and its voices'+suffix);
   await screenshot(pg,'portal-close-'+viewport.width);
   await pg.click('#look-sea');await settled(pg);sample.sea=await state(pg);sample.seaPixels=await screenshot(pg,'sea-world-'+viewport.width,{world:true});
   check(sample.sea.camera.target[0]<sample.sea.camera.position[0]&&sample.seaPixels.hash!==sample.dayPixels.hash,'the sea viewpoint looks left into a genuinely different rendering'+suffix);
   await pg.click('#look-mountains');await settled(pg);sample.mountains=await state(pg);sample.mountainPixels=await screenshot(pg,'mountains-world-'+viewport.width,{world:true});
   check(sample.mountains.camera.target[0]>sample.mountains.camera.position[0]&&sample.mountainPixels.hash!==sample.seaPixels.hash,'the mountain viewpoint looks right into the other panorama'+suffix);
   await pg.click('#overview');await settled(pg);
   check(JSON.stringify((await state(pg)).position)===JSON.stringify([0,12]),'return restores the original temple entrance'+suffix);
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.waitForFunction(()=>__totehm_gallery().reduced_motion);
   await pg.waitForTimeout(500);const frozen=await state(pg);await pg.waitForTimeout(350);const frozenEnd=await state(pg);
   check(frozenEnd.frames===frozen.frames&&JSON.stringify(clocks(frozenEnd))===JSON.stringify(clocks(frozen)),'reduced motion freezes the rendered atmosphere and architecture'+suffix);
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
   await pg.click('#toggle-sound');await pg.waitForFunction(()=>__totehm_gallery().audio.state==='running');
   await hidden(pg,true);await pg.waitForFunction(()=>__totehm_gallery().audio.state==='suspended');
   const hiddenStart=await state(pg);await pg.waitForTimeout(350);const hiddenEnd=await state(pg);
   check(hiddenStart.frames===hiddenEnd.frames&&JSON.stringify(clocks(hiddenStart))===JSON.stringify(clocks(hiddenEnd)),'hidden tabs suspend geometry, atmosphere and native audio'+suffix);
   await hidden(pg,false);await pg.waitForFunction(()=>__totehm_gallery().audio.state==='running');
   check(!requests.some(r=>/\.(mp3|wav|ogg|aac|flac)(\?|$)/i.test(r.url)),'approach ambience needs no external audio file'+suffix);
   check(!requests.some(r=>/\/storage\/v1\/object\/(public|sign)\//.test(new URL(r.url).pathname)),'the hub requests no experience video or private sequence'+suffix);
   check(errors(log).length===0,'day temple has no application or GPU shader errors'+suffix);
   await pg.emulateMedia({reducedMotion:'no-preference'});await pg.click('#overview');await settled(pg);
   await enter(pg,1,{trace:true});await pg.waitForSelector('#deck .slide');
   const trace=await pg.evaluate(()=>JSON.parse(sessionStorage.getItem('temple-test-transition')||'[]'));sample.transitionTrace=trace;
   check(trace.some(row=>row.transition?.active&&row.fov>(viewport.width<650?72.2:60.2))&&trace.filter(row=>row.transition?.active).every(row=>row.fov>=(viewport.width<650?72:60))&&trace.some(row=>row.audio?.transitions>0),'crossing renders the FOV aspiration and a synthetic breath before navigation'+suffix);
   check(await pg.locator('#deck .slide').count()===21&&await pg.locator('#deck video').count()===20&&await pg.locator('#space,#spatial-player,iframe').count()===0,'Origins opens its own original reader, not an embedded temple view'+suffix);
   check(errors(log).length===0,'independent Origins navigation has no application errors'+suffix);
   sample.log=log;
  }catch(error){sample.error=String(error);sample.failed=await state(pg).catch(()=>null);await pg.screenshot({path:OUT+'/failure-day-'+viewport.width+'.png'}).catch(()=>{});throw error;}
  finally{sample.requests=requests;fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await close(ctx);}
 }
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const {pg,ctx,log}=await fixture(viewport,{hour:22}),sample={viewport,kind:'night'};results.push(sample);
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/');sample.state=await loaded(pg);
   check(dayOf(sample.state)===false,'local night selects the celestial temple at '+viewport.width);
   sample.pixels=await screenshot(pg,'night-world-'+viewport.width,{world:true});await screenshot(pg,'night-ui-'+viewport.width);
   check(sample.pixels.hash!==daySamples.get(viewport.width).hash&&sample.pixels.mean>1&&sample.pixels.mean<daySamples.get(viewport.width).mean,'night produces a visible, distinct and darker real scene at '+viewport.width);
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
   const floor=await project(pg,[0,.005,-8]);await pg.mouse.click(floor.x,floor.y);
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
 console.log('PASS '+checks+' restored temple checks; evidence '+OUT);
}finally{await browser?.close();}
