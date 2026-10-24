// Real WebGL/HTMLVideo/Web Audio integration. Public media is replaced by two
// visibly different local MP4s; no account, purchase or production write occurs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {launch,page} from './harness.mjs';
import {PerspectiveCamera,Vector3} from '../../space/vendor/three-0.180.0.mjs';
import {ORIGINS} from '../../space/gallery-artworks.mjs';
import {GALLERY_OBSTACLES} from '../../space/gallery-modern-layout.mjs';

const OUT=process.argv[2]||'/tmp/totehm-production/living-gallery';
const origin='https://www.totehm.space',BUILD='2026-10-24-space-living-gallery';
fs.mkdirSync(OUT,{recursive:true});
for(const [name,filter]of [['normal','null'],['inverse','negate']])execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=192x108:rate=10','-vf',filter,'-t','60','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart',OUT+'/'+name+'.mp4']);
const clips={normal:fs.readFileSync(OUT+'/normal.mp4'),inverse:fs.readFileSync(OUT+'/inverse.mp4')};
const results=[];let checks=0,browser;
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const state=pg=>pg.evaluate(()=>window.__totehm_gallery());
const fatal=log=>log.errors.filter(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e));
const architecture=d=>d.modernGallery||d.temple;
const clocks=d=>[d.landscape.time,d.landscape.sky.time,d.landscape.ocean.time,d.landscape.planet?.time];
async function observe(pg,{noWebGL=false}={}){
 await pg.addInitScript(({noWebGL})=>{
  const n=window.__livingNative={draws:0,uploads:0,images:[],videos:[],canvases:[],audio:[]};
  const getContext=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(kind,...args){if(noWebGL&&/webgl/i.test(kind))return null;const context=Reflect.apply(getContext,this,[kind,...args]);if(kind==='2d'&&context&&!n.canvases.includes(this))n.canvases.push(this);return context;};
  const draw=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(source,...args){const result=Reflect.apply(draw,this,[source,...args]);if(source instanceof HTMLVideoElement){let hash=2166136261,nonzero=0;try{const a=this.getImageData(Math.max(0,this.canvas.width/2-50),Math.max(0,this.canvas.height/2-30),100,60).data;for(let i=0;i<a.length;i+=4){hash=Math.imul(hash^a[i]^a[i+1]^a[i+2],16777619)>>>0;if(a[i]+a[i+1]+a[i+2]>20)nonzero++;}}catch{}n.videos.push({src:source.currentSrc,time:source.currentTime,hash,nonzero,width:this.canvas.width,height:this.canvas.height});if(n.videos.length>100)n.videos.shift();}return result;};
  for(const Class of [globalThis.WebGLRenderingContext,globalThis.WebGL2RenderingContext])if(Class){
   for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const fn=Class.prototype[name];if(fn)Class.prototype[name]=function(...args){n.draws++;return Reflect.apply(fn,this,args);};}
   for(const name of ['texImage2D','texSubImage2D']){const fn=Class.prototype[name];Class.prototype[name]=function(...args){const image=args.find(a=>a instanceof HTMLImageElement);if(image&&!n.images.includes(image.src))n.images.push(image.src);const c=args.find(a=>a instanceof HTMLCanvasElement);if(c&&[1024,1536].includes(c.width)&&Math.abs(c.width/c.height-16/9)<.01)n.uploads++;return Reflect.apply(fn,this,args);};}
  }
  const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){const Actual=new Proxy(Audio,{construct(Target,args){const ctx=Reflect.construct(Target,args);n.audio.push(ctx);return ctx;}});if(window.AudioContext)window.AudioContext=Actual;else window.webkitAudioContext=Actual;}
 },{noWebGL});
}
async function fixture(viewport,options={}){
 const requests=[],sources={};
 const f=await page(browser,{dir:'space',origin,session:false,viewport,hasTouch:viewport.width<650,
  network:(url,request)=>{requests.push({url:url.href,method:request.method()});if(url.origin===origin&&/^\/gallery-[a-z0-9-]+\.mjs$|^\/gallery\.css$/.test(url.pathname)){const bytes=fs.readFileSync(new URL('../../space'+url.pathname,import.meta.url));sources[url.pathname]=createHash('sha256').update(bytes).digest('hex');}if(url.pathname.startsWith('/storage/v1/object/public/play-signals/'))return{status:200,contentType:'video/mp4',headers:{'access-control-allow-origin':origin},body:url.pathname.endsWith('/stop.mp4')?clips.inverse:clips.normal};return null;},
  functions:{'stoner-gate':{access:false,reason:'no_session'},'higher-checkout':{amount:1700,currency:'usd',left:777000}}});
 await observe(f.pg,options);await f.pg.emulateMedia({reducedMotion:'reduce'});return{...f,requests,sources};
}
async function loaded(pg){
 await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.(),a=d?.modernGallery||d?.temple;return d?.webgl&&d.frames>0&&a?.ready&&a.facade?.paperLoaded&&d.landscape?.skyLoaded&&d.landscape?.environmentLoaded&&d.stations?.play?.loaded===22&&d.stations?.book?.loadedVisible?.every(Boolean);},null,{timeout:90000});return state(pg);
}
async function settled(pg){await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&!d.moving&&!d.transition?.active;},null,{timeout:45000});return state(pg);}
async function visibility(pg,hidden){await pg.evaluate(hidden=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden});document.dispatchEvent(new Event('visibilitychange'));},hidden);}
async function screenshot(pg,name,{world=false}={}){let style;if(world)style=await pg.addStyleTag({content:'body>*:not(#space){visibility:hidden!important}#space,#space canvas{visibility:visible!important}body::before,body::after,#space::before,#space::after{display:none!important}'});const file=OUT+'/'+name+'.png';try{await pg.screenshot({path:file});}finally{if(style)await style.evaluate(n=>n.remove());}return file;}
async function project(pg,point){const data=await pg.evaluate(()=>({camera:__totehm_gallery().camera,width:innerWidth,height:innerHeight})),c=new PerspectiveCamera(data.camera.fov,data.camera.aspect,.08,100000);c.position.fromArray(data.camera.position);c.lookAt(new Vector3(...data.camera.target));c.updateProjectionMatrix();c.updateMatrixWorld();const p=new Vector3(...point).project(c);return{x:(p.x+1)*data.width/2,y:(1-p.y)*data.height/2};}
async function visit(pg,index){await pg.click('.tour [data-room="'+index+'"]');await settled(pg);await pg.waitForFunction(index=>__totehm_gallery().room===index,index);return state(pg);}
function preservation(){const baseline='515a2801b788cfcee57739af6634962ef0639268',files=['space/get_higher.html','space/origins.html','space/play_lisbon_street.html','space/stoner.html','space/stoner_terms.html','space/market.html','space/gallery-artworks.mjs','space/gallery-3d.mjs','space/gallery-temple.mjs','space/gallery-temple-navigation.mjs','space/gallery-temple-physics.mjs','space/gallery-temple-landscape.mjs','space/gallery-drowned-ocean.mjs','space/gallery-drowned-sky.mjs','space/gallery-lisbon-pavement.mjs','space/gallery-audio.mjs'];return files.map(path=>{const current=createHash('sha256').update(fs.readFileSync(new URL('../../'+path,import.meta.url))).digest('hex'),before=createHash('sha256').update(execFileSync('git',['show',baseline+':'+path],{cwd:new URL('../..',import.meta.url)})).digest('hex');return{path,sha256:current,unchanged:current===before};});}
function save(){fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));}
async function animatedMovement(pg,sample){
 await pg.emulateMedia({reducedMotion:'no-preference'});await pg.click('#overview');await settled(pg);
 const warm=(await state(pg)).landscape.ocean.time;await pg.waitForFunction(t=>__totehm_gallery().landscape.ocean.time>t+.35,warm,{timeout:30000});
 await pg.evaluate(()=>{window.__livingRoute=[];window.__livingTracing=true;const trace=()=>{if(!__livingTracing)return;const d=__totehm_gallery();__livingRoute.push({position:d.position,feet:d.physics.feetHeight,moving:d.moving});requestAnimationFrame(trace);};requestAnimationFrame(trace);});
 const mouth=await project(pg,[0,4.1,-1.74]);await pg.mouse.click(mouth.x,mouth.y);await settled(pg);check((await state(pg)).zone==='gallery','clicking the original mouth façade walks through the physical entry');await visit(pg,2);
 sample.guidedRoute=await pg.evaluate(()=>{__livingTracing=false;return __livingRoute;});
 const positions=sample.guidedRoute.filter(s=>s.moving),radius=.18,height=1.74;
 check(positions.length>=2&&new Set(positions.map(s=>s.position.join(','))).size>=2,'actual animated guidance crosses the gallery entry and walks around the sofa');
 check(positions.every(s=>!GALLERY_OBSTACLES.some(b=>s.position[0]>b.minX-radius+.015&&s.position[0]<b.maxX+radius-.015&&s.position[1]>b.minZ-radius+.015&&s.position[1]<b.maxZ+radius-.015&&s.feet<b.maxY-.02&&s.feet+height>b.minY+.02)),'every sampled guided body position stays outside the shared furniture and wall collisions');
 await pg.click('#leave-station');await pg.focus('#space');const before=(await state(pg)).physics.headContacts;await pg.keyboard.press('Space');
 await pg.waitForFunction(n=>__totehm_gallery().physics.headContacts>n,before,{timeout:15000});await settled(pg);sample.insideJump=await state(pg);
 check(sample.insideJump.physics.grounded&&sample.insideJump.physics.feetHeight<.1&&sample.insideJump.physics.headContacts>before,'an intentional indoor jump hits the real ceiling and lands without escaping the building');
 await pg.click('#overview');await settled(pg);await pg.focus('#space');await pg.keyboard.press('Space');
 await pg.waitForFunction(()=>__totehm_gallery().physics.feetHeight>200,null,{timeout:15000});await pg.click('.tour [data-room="1"]');sample.deferredVisit=await state(pg);
 check(sample.deferredVisit.physics.feetHeight>200&&sample.deferredVisit.navigation.deferredArrival,'a gallery visit requested in the air preserves altitude and defers the indoor arrival');
 await settled(pg);sample.afterDeferredVisit=await state(pg);
 check(sample.afterDeferredVisit.zone==='gallery'&&sample.afterDeferredVisit.focused===1&&sample.afterDeferredVisit.physics.grounded&&!sample.afterDeferredVisit.physics.onRoof,'the outdoor flight lands before the deferred visit reaches the book');
 await pg.emulateMedia({reducedMotion:'reduce'});
}

try{
 const preserved=preservation();results.push({kind:'preservation',files:preserved});check(preserved.every(f=>f.unchanged),'all independent artworks, marketplace, old temple and sea/sky/calçada/audio files are byte-identical');
 browser=await launch();
 for(const viewport of (process.argv.includes('--desktop-only')?[{width:1440,height:1000}]:process.argv.includes('--mobile-only')?[{width:390,height:844}]:[{width:1440,height:1000},{width:390,height:844}])){
  const f=await fixture(viewport),{pg,ctx,log}=f,sample={kind:'integrated-gallery',viewport,sources:f.sources},suffix=' at '+viewport.width;results.push(sample);
  try{
   await pg.goto(origin+'/',{waitUntil:'domcontentloaded'});sample.entry=await loaded(pg);const a=architecture(sample.entry);
   if(process.argv.includes('--movement-only')){await animatedMovement(pg,sample);check(fatal(log).length===0,'animated navigation and both jumps have no JavaScript or GPU shader errors');sample.final=await state(pg);sample.errors=log.errors;save();continue;}
   if(process.argv.includes('--visual-only')){
    if(!process.argv.includes('--play-only')){
    await screenshot(pg,'entry-'+viewport.width);await pg.click('#enter-gallery');await settled(pg);
    await visit(pg,1);await pg.waitForFunction(()=>__totehm_gallery().stations.book.loadedVisible.every(Boolean));
    await screenshot(pg,'book-'+viewport.width);await screenshot(pg,'book-world-'+viewport.width,{world:true});
    check((await state(pg)).stations.book.imageSources.every(src=>src.startsWith('/assets/gallery/book-origins/')),'final mobile book loads its dedicated authentic artwork stills');
    for(let n=1;n<=3;n++){await pg.click('#book-next');await pg.waitForFunction(n=>{const b=__totehm_gallery().stations.book;return b.spreadIndex===n&&!b.turning&&b.loadedVisible.every(Boolean);},n);}
    await screenshot(pg,'book-07-08-'+viewport.width);check(JSON.stringify((await state(pg)).stations.book.visibleIndices)==='[7,8]','final mobile book renders the actual07–08 artwork spread');
    }
    await visit(pg,2);await screenshot(pg,'lounge-'+viewport.width);await screenshot(pg,'lounge-world-'+viewport.width,{world:true});
    check(await pg.locator('#toggle-sound').isVisible(),'sound remains reachable while the mobile installation is focused');
    const corners=await Promise.all([[4.5,1.15,-16.18],[11.5,1.15,-16.18],[4.5,5.05,-16.18],[11.5,5.05,-16.18]].map(p=>project(pg,p)));sample.screenCorners=corners;
    check(corners.every(p=>p.x>=-2&&p.x<=viewport.width+2&&p.y>=0&&p.y<=viewport.height),'final mobile camera fits all four corners of the physical television');
    const stop=await project(pg,[8.873,.606,-9.938]);await pg.mouse.click(stop.x,stop.y);await pg.waitForFunction(()=>{const p=__totehm_gallery().stations.play;return p.selectedSign==='stop'&&p.playing&&p.videoFrames>0;});
    check(await pg.evaluate(()=>__livingNative.videos.at(-1)?.nonzero>0),'final mobile physical controller drives actual decoded artwork pixels');
    await screenshot(pg,'playing-'+viewport.width);
    check(await pg.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'final mobile controls fit the viewport');check(fatal(log).length===0,'final mobile has no JavaScript or GPU shader errors');sample.final=await state(pg);sample.errors=log.errors;save();continue;
   }
   check(sample.entry.build===BUILD&&!sample.entry.fallback&&a.modernGallery&&a.building&&a.facade.originalDrawing&&a.columns===0,'actual contemporary gallery and original mouth façade render'+suffix);
   check(a.thpCounter.sheets===6&&a.thpCounter.looseTabs===5&&a.thpCounter.perforated&&a.thpCounter.loaded,'physical THP sheets and loose perforated tabs load their original image'+suffix);
   check(sample.entry.landscape.night!==false&&sample.entry.landscape.sky.night&&a.pavement.ready&&sample.entry.landscape.ocean.detailMapsLoaded===2,'existing calçada, nighttime sky and detailed sea remain in the world'+suffix);
   check(await pg.evaluate(()=>__livingNative.audio.length===0),'arrival has no audio context or unsolicited sound'+suffix);
   await screenshot(pg,'entry-'+viewport.width);await screenshot(pg,'entry-world-'+viewport.width,{world:true});
   await pg.click('#enter-gallery');sample.inside=await settled(pg);
   check(sample.inside.zone==='gallery'&&sample.inside.camera.position[2]<-2&&new URL(pg.url()).pathname==='/','Enter the gallery physically crosses the entrance without leaving the scene'+suffix);
   await screenshot(pg,'inside-'+viewport.width);await screenshot(pg,'inside-world-'+viewport.width,{world:true});
   check(sample.inside.audio.unlocked&&await pg.evaluate(()=>__livingNative.audio.length===1),'first intentional gesture unlocks the existing sea and wind audio'+suffix);
   sample.thp=await visit(pg,0);check(sample.thp.zone==='gallery'&&await pg.locator('#work-links a[href="/market?art=totehmpaper"]').count()===1,'counter keeps the original server-backed THP market route'+suffix);
   await screenshot(pg,'counter-'+viewport.width);await screenshot(pg,'counter-world-'+viewport.width,{world:true});
   sample.origins=await visit(pg,1);await pg.waitForFunction(()=>__totehm_gallery().stations.book.loadedVisible.every(Boolean));
   await screenshot(pg,'book-'+viewport.width);await screenshot(pg,'book-world-'+viewport.width,{world:true});
   check(sample.origins.stations.book.total===20&&sample.origins.stations.book.spreadCount===10&&JSON.stringify(sample.origins.stations.book.order)===JSON.stringify(ORIGINS.map(a=>a.index)),'book uses all twenty original photographs in exact authored order'+suffix);
   check(await pg.locator('#book-prev').isDisabled(),'book begins at its first spread with a bounded previous control'+suffix);
   sample.spreads=[];
   for(let spread=0;spread<10;spread++){
    await pg.waitForFunction(n=>{const b=__totehm_gallery().stations.book;return!b.turning&&b.spreadIndex===n&&b.loadedVisible.every(Boolean);},spread,{timeout:30000});const b=(await state(pg)).stations.book;sample.spreads.push({spread:b.spreadIndex,visible:b.visibleIndices,loaded:b.loadedVisible});check(JSON.stringify(b.visibleIndices)===JSON.stringify([spread*2+1,spread*2+2])&&b.cacheSize<=6,'real book spread '+(spread+1)+' shows originals '+(spread*2+1)+'–'+(spread*2+2)+' within its image cache'+suffix);if(spread<9)await pg.click('#book-next');
   }
   check(await pg.locator('#book-next').isDisabled(),'book ends at19–20 without wrapping'+suffix);
   await pg.click('#book-prev');await pg.waitForFunction(()=>__totehm_gallery().stations.book.spreadIndex===8&&!__totehm_gallery().stations.book.turning);
   const photo=await project(pg,[-6.98,1.09,-8]);await pg.mouse.click(photo.x,photo.y);await settled(pg);
   check(new URL(pg.url()).pathname==='/'&&await pg.locator('#work-links a[href="/market?collection=quantum"]').count()===1&&(await pg.locator('#work-title').textContent())===ORIGINS[17].title,'selecting a physical photograph updates its real title, stays in the gallery and retains its verified collection route'+suffix);
   sample.play=await visit(pg,2);check(await pg.locator('#play-signs [data-sign]').count()===22&&!sample.play.stations.play.playing,'all twenty-two original controller signs are accessible without autoplay'+suffix);
   await screenshot(pg,'lounge-'+viewport.width);await screenshot(pg,'lounge-world-'+viewport.width,{world:true});
   await pg.click('#play-controller summary');await pg.click('#play-signs [data-sign="pharma"]');await pg.click('#play-controller summary');await pg.waitForFunction(()=>{const p=__totehm_gallery().stations.play;return p.selectedSign==='pharma'&&p.playing&&p.videoFrames>0;},null,{timeout:30000});
   const first=await pg.evaluate(()=>__livingNative.videos.at(-1));const controllerStop=await project(pg,[8.873,.606,-9.938]);sample.controllerPoint=controllerStop;
   await pg.mouse.click(controllerStop.x,controllerStop.y);await pg.waitForFunction(()=>{const p=__totehm_gallery().stations.play;return p.selectedSign==='stop'&&p.playing&&p.mediaTime>0;},null,{timeout:15000});
   sample.native=await pg.evaluate(()=>({draws:__livingNative.draws,uploads:__livingNative.uploads,images:__livingNative.images,videos:__livingNative.videos}));const second=sample.native.videos.at(-1);
   check(first.src.endsWith('/pharma.mp4')&&second.src.endsWith('/stop.mp4')&&first.hash!==second.hash&&first.nonzero>0&&second.nonzero>0&&sample.native.uploads>1,'clicking a real 3D controller sign changes decoded video pixels and uploads the television texture'+suffix);
   const before=(await state(pg)).stations.play.videoFrames;await pg.waitForFunction(n=>__totehm_gallery().stations.play.videoFrames>n+2,before,{timeout:15000});
   check(JSON.stringify(clocks(await state(pg)))===JSON.stringify(clocks(sample.play)),'intentional television playback works while reduced motion keeps the sea and stars still'+suffix);
   await screenshot(pg,'playing-'+viewport.width);await screenshot(pg,'playing-world-'+viewport.width,{world:true});
   await pg.click('#play-toggle');await pg.waitForFunction(()=>!__totehm_gallery().stations.play.playing);
   const previous=(await state(pg)).stations.play.selectedSign;await pg.click('#play-next');check((await state(pg)).stations.play.selectedSign!==previous,'controller selection changes through its accessible next button'+suffix);
   await pg.focus('#space');await pg.keyboard.press('Enter');await pg.waitForFunction(()=>__totehm_gallery().stations.play.playing);
   await visibility(pg,true);await pg.waitForTimeout(250);const hidden=await state(pg),frames=hidden.frames;await pg.waitForTimeout(180);
   check(!hidden.stations.play.playing&&!hidden.audio.active&&(await state(pg)).frames===frames,'hidden tab pauses media, WebGL frames and ambient sound'+suffix);
   await visibility(pg,false);await pg.waitForTimeout(150);check(!(await state(pg)).stations.play.playing,'returning to the tab does not autoplay the artwork'+suffix);
   await pg.click('#play-toggle');await pg.waitForFunction(()=>__totehm_gallery().stations.play.playing);await pg.click('#view-list');await pg.waitForTimeout(250);sample.list=await state(pg);
   check(sample.list.list&&!sample.list.stations.play.playing&&!sample.list.audio.active&&await pg.locator('.origin-card').count()===20,'accessible artwork list pauses the installation and keeps twenty independent Origins links'+suffix);
   check(await pg.locator('.market-nav a[href="/market"]').count()===1&&await pg.locator('.market-nav a[href="/market?tab=mine"]').count()===1,'market and owned collection remain linked'+suffix);
   await pg.click('#view-list');await pg.waitForTimeout(180);check(!(await state(pg)).stations.play.playing,'returning from the list requires another intentional play input'+suffix);
   await pg.click('#overview');await settled(pg);check((await state(pg)).zone==='terrace','overview walks back outside into the existing sea and star landscape'+suffix);
   await pg.click('#look-sea');await settled(pg);await screenshot(pg,'ocean-'+viewport.width);
   await pg.click('#look-sky');await settled(pg);await screenshot(pg,'sky-'+viewport.width);
   if(viewport.width>650)await animatedMovement(pg,sample);
   check(await pg.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'gallery controls fit without horizontal overflow'+suffix);
   check(fatal(log).length===0,'no JavaScript or GPU shader errors'+suffix);
   check(!f.requests.some(r=>r.method!=='GET'&&!/\/auth\/|\/functions\//.test(r.url)),'the spatial visit performs no purchase, ownership or database write'+suffix);
   sample.final=await state(pg);sample.requests=f.requests;sample.errors=log.errors;save();
  }catch(error){sample.failure={message:error.message,stack:error.stack,state:await state(pg).catch(()=>null),errors:log.errors};await screenshot(pg,'failure-'+viewport.width).catch(()=>{});save();throw error;}finally{await ctx.close();}
 }
 const f=await fixture({width:390,height:844},{noWebGL:true});try{await f.pg.goto(origin+'/');await f.pg.waitForFunction(()=>window.__totehm_gallery?.().fallback);check(await f.pg.locator('.origin-card').count()===20&&await f.pg.locator('#lisbon a[href="/play_lisbon_street"]').count()>0,'without WebGL the original accessible experiences remain available');}finally{await f.ctx.close();}
 save();console.log('PASS '+checks+' living-gallery checks; '+OUT+'/results.json');
}finally{await browser?.close();}
