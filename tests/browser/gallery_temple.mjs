// Real local WebGL and Web Audio; all network and identity remain intercepted.
// source /workspace/.totehm-cloud/activate.sh; node tests/browser/gallery_temple.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {launch,page} from './harness.mjs';
import {ORIGINS} from '../../space/gallery-artworks.mjs';

const OUT=process.argv[2]||'/tmp/totehm-production/temple-void';
fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',results=[];
const browser=await launch();let checks=0;
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const state=pg=>pg.evaluate(()=>window.__totehm_gallery());
async function clockAndAudio(pg,iso='2026-10-17T12:00:00Z'){
 await pg.addInitScript(iso=>{
  const Original=Date,fixed=Original.parse(iso);
  window.Date=new Proxy(Original,{
   construct:(target,args)=>Reflect.construct(target,args.length?args:[fixed]),
   apply:()=>new Original(fixed).toString(),
   get:(target,key)=>key==='now'?()=>fixed:Reflect.get(target,key)
  });
  window.__testAudioContexts=[];
  const Native=window.AudioContext||window.webkitAudioContext;
  if(Native){
   const Observed=new Proxy(Native,{construct(target,args){const ctx=Reflect.construct(target,args);window.__testAudioContexts.push(ctx);return ctx;}});
   if(window.AudioContext)window.AudioContext=Observed;else window.webkitAudioContext=Observed;
  }
 },iso);
}
async function settled(pg,zone){
 await pg.waitForFunction(zone=>{
  const d=window.__totehm_gallery?.();return d?.webgl&&!d.moving&&!d.transition.active&&(!zone||d.zone===zone);
 },zone,{timeout:30000});
 return state(pg);
}
async function follow(pg,selector,zone){
 await pg.evaluate(()=>{
  window.__templeTrace=[];
  window.__templeTimer=setInterval(()=>{const d=__totehm_gallery();window.__templeTrace.push({time:performance.now(),zone:d.zone,position:d.position,moving:d.moving,transition:d.transition});},25);
 });
 await pg.click(selector);const end=await settled(pg,zone);
 const trace=await pg.evaluate(()=>{clearInterval(__templeTimer);const result=__templeTrace;delete window.__templeTrace;delete window.__templeTimer;return result;});
 return {end,trace};
}
async function visibility(pg,hidden){
 await pg.evaluate(hidden=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden});document.dispatchEvent(new Event('visibilitychange'));},hidden);
}
async function guideClear(pg){
 return pg.evaluate(()=>{
  const guide=document.querySelector('.guide').getBoundingClientRect();
  return ['.controls','.travel-controls','.welcome h1','.welcome button'].every(selector=>{
   const r=document.querySelector(selector).getBoundingClientRect();
   return guide.right<=r.left||guide.left>=r.right||guide.bottom<=r.top||guide.top>=r.bottom;
  });
 });
}
async function worldPixels(pg,name){
 // Hide only the HTML overlay while measuring the actual composited WebGL
 // image. No scene object, material, shader or debug state is changed.
 const style=await pg.addStyleTag({content:'body>*:not(#space){visibility:hidden!important}#space,#space canvas{visibility:visible!important}body::before,body::after,#space::before,#space::after{display:none!important}'});
 const file=OUT+'/'+name+'.png';
 try{await pg.locator('#space canvas').screenshot({path:file});}finally{await style.evaluate(e=>e.remove());}
 return JSON.parse(execFileSync('python3',['-c',String.raw`from PIL import Image
import json,sys,warnings
warnings.filterwarnings('ignore', category=DeprecationWarning)
im=Image.open(sys.argv[1]).convert('RGB');w,h=im.size
pixels=list(im.getdata());black=sum(p==(0,0,0) for p in pixels)
corners=[]
for x,y in [(0,0),(w-int(w*.08),0),(0,h-int(h*.08)),(w-int(w*.08),h-int(h*.08))]:
 box=list(im.crop((x,y,x+int(w*.08),y+int(h*.08))).getdata())
 corners.append(sum(p==(0,0,0) for p in box)/len(box))
print(json.dumps({'width':w,'height':h,'black':black/len(pixels),'corners':corners,'mean':sum(.2126*p[0]+.7152*p[1]+.0722*p[2] for p in pixels)/len(pixels)}))`,file],{encoding:'utf8'}));
}
async function audioState(pg){return pg.evaluate(()=>window.__testAudioContexts.map(c=>c.state));}
async function checkWork(pg,index,suffix){
 await settled(pg,'void');
 await pg.waitForFunction(()=>{const v=__totehm_gallery().void;return v.loaded===Math.min(v.pool,v.total);});
 const d=await state(pg),item=ORIGINS[index];
 check(d.void.index===index&&d.void.currentWork===item.id&&JSON.stringify(d.void.visibleWorks)===JSON.stringify([index+1]),'only original '+(index+1)+' is revealed in the correct order'+suffix);
 check(Math.abs(d.position[0])<.02&&Math.abs(d.position[1]-(-25-index*32))<.02,'published 32 metre stop '+(index+1)+' remains exact'+suffix);
 const href=await pg.locator('#work-links a[href^="/origins?work="]').getAttribute('href');
 check((await pg.locator('#work-title').textContent())===item.title&&Number(new URL(href,origin).searchParams.get('work'))===index+1,'revealed original '+(index+1)+' keeps its actual title and authored chapter'+suffix);
 return d;
}
try{
 const dayPixels=new Map();
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const requests=[];
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:false,viewport,hasTouch:viewport.width<650,network:url=>{requests.push(url.href);return null;}});
  const samples={viewport},suffix=' at '+viewport.width;
  try{
   await clockAndAudio(pg);await pg.goto(origin+'/');
   await pg.waitForFunction(()=>window.__totehm_gallery?.().frames>0&&window.__totehm_gallery().temple?.portals.length===3,null,{timeout:45000});
   samples.entrance=await settled(pg,'temple');
   const temple=samples.entrance.temple;
   check(samples.entrance.webgl&&!samples.entrance.fallback&&temple.day&&temple.visible,'daytime temple renders in real WebGL'+suffix);
   check(temple.columns>=8&&temple.trees>=6&&temple.flowers>=100&&temple.panorama.sea==='left'&&temple.panorama.mountains==='right'&&temple.panorama.cloudSea,'temple has its architecture, vegetation and sea/mountain panorama'+suffix);
   check(temple.portals.length===3&&new Set(temple.portals.map(p=>p.room)).size===3,'three distinct collection arches are available'+suffix);
   check((await audioState(pg)).length===0&&!samples.entrance.audio.unlocked,'no real AudioContext is constructed before a gesture'+suffix);
   check(await pg.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'temple UI fits viewport'+suffix);
   check(await guideClear(pg),'entrance guidance stays clear of text and controls'+suffix);
   await pg.screenshot({path:OUT+'/entrance-'+viewport.width+'.png'});
   samples.dayPixels=await worldPixels(pg,'day-world-'+viewport.width);dayPixels.set(viewport.width,samples.dayPixels);
   check(samples.dayPixels.black<.9&&samples.dayPixels.mean>15,'temple world renders visible daylight pixels'+suffix);
   await pg.click('#enter-gallery');
   check((await state(pg)).zone==='temple'&&await pg.locator('#space').evaluate(e=>document.activeElement===e),'entry action begins exploration on the temple platform'+suffix);
   const start=(await state(pg)).position;
   await pg.keyboard.down('w');
   try{await pg.waitForFunction(z=>__totehm_gallery().position[1]<z-.25,start[1],{timeout:6000});}finally{await pg.keyboard.up('w');}
   check(!(await state(pg)).moving&&(await state(pg)).zone==='temple','original physical walking and release work in the temple'+suffix);
   await pg.waitForFunction(()=>__totehm_gallery().audio.unlocked&&__totehm_gallery().audio.state==='running');
   check(JSON.stringify(await audioState(pg))==='["running"]','a real gesture unlocks exactly one native Web Audio context'+suffix);

   samples.enter=await follow(pg,'.tour a[href="#origins"]','void');
   check(!samples.enter.end.temple.visible&&samples.enter.end.void.room===1&&samples.enter.end.void.total===20,'Origins arch leaves the complete temple behind'+suffix);
   const pulse=samples.enter.trace.filter(s=>s.zone==='void'&&s.transition.active);
   check(samples.enter.end.transition.duration===800&&pulse.some(s=>s.transition.fov>s.transition.baseFov+.2)&&samples.enter.end.transition.fov===samples.enter.end.transition.baseFov,'arch crossing renders a FOV pulse and settles after the 0.8 second transition'+suffix);
   check(samples.enter.end.navigation.speed===2.6&&samples.enter.end.navigation.minDuration===1450&&samples.enter.end.navigation.maxDuration===4200,'published walking speed and distance-based travel timing remain intact'+suffix);
   check(JSON.stringify(samples.enter.end.void.order)===JSON.stringify(ORIGINS.map(w=>w.id)),'corridor follows all twenty originals in their existing order'+suffix);
   samples.first=await checkWork(pg,0,suffix);
   await pg.waitForFunction(()=>__totehm_gallery().void.loaded>0);
   await pg.screenshot({path:OUT+'/void-first-'+viewport.width+'.png'});
   samples.voidPixels=await worldPixels(pg,'void-world-'+viewport.width);
   check(samples.voidPixels.black>.75&&samples.voidPixels.black<.999&&samples.voidPixels.corners.every(p=>p>.999),'void pixels are absolute black around a genuinely rendered original image'+suffix);
   await pg.mouse.click(viewport.width/2,viewport.height/2);await settled(pg,'void');
   check((await state(pg)).origin===0&&(await pg.locator('#work-title').textContent())===ORIGINS[0].title,'actual floating image remains selectable in the void'+suffix);
   const beforeWalk=await state(pg);await pg.focus('#space');await pg.keyboard.down('w');
   try{await pg.waitForFunction(z=>__totehm_gallery().position[1]<z-.25,beforeWalk.position[1],{timeout:6000});}finally{await pg.keyboard.up('w');}
   check(!(await state(pg)).moving,'original walking remains physical in the black corridor'+suffix);
   if(viewport.width<650){
    const start=(await state(pg)).position,r=await pg.locator('#joystick').boundingBox(),cdp=await ctx.newCDPSession(pg);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2-24}]});
    try{await pg.waitForFunction(z=>__totehm_gallery().position[1]<z-.2,start[1],{timeout:6000});}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
    check(!(await state(pg)).moving,'real touch joystick still moves and releases in the corridor');
   }
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.waitForFunction(()=>__totehm_gallery().reduced_motion&&!__totehm_gallery().transition.active);
   samples.stops=[samples.first];
   for(let index=1;index<20;index++){
    await pg.click('#explore-space');samples.stops.push(await checkWork(pg,index,suffix));
   }
   check(samples.stops.every(s=>s.void.loaded<=s.void.pool&&s.void.pool===(viewport.width<650?3:5)),'the full twenty-work visit keeps a bounded image cache'+suffix);
   await pg.keyboard.press('PageUp');await pg.waitForFunction(()=>__totehm_gallery().void.index===18&&!__totehm_gallery().moving);
   await pg.keyboard.press('PageDown');await pg.waitForFunction(()=>__totehm_gallery().void.index===19&&!__totehm_gallery().moving);
   check((await state(pg)).position[1]===-633,'keyboard previous/next preserves adjacent original chapters and exact spacing'+suffix);
   await pg.screenshot({path:OUT+'/void-last-'+viewport.width+'.png'});
   check((await pg.locator('#explore-space').textContent()).includes('Return'),'last original offers a return to the temple'+suffix);
   await pg.click('#explore-space');samples.returned=await settled(pg,'temple');
   check(samples.returned.temple.visible&&samples.returned.position[0]===0&&samples.returned.position[1]===12&&!samples.returned.transition.active,'return from the twentieth image restores the temple immediately with reduced motion'+suffix);
   const frozen=await state(pg);await pg.waitForTimeout(350);
   check((await state(pg)).temple.time===frozen.temple.time,'reduced motion freezes the living temple'+suffix);
   // Use the real floor ray to approach the central arch, then physically
   // cross its threshold. This exercises the portal independently of its nav.
   const pitch=Math.atan2(3-1.65,22),down=Math.atan2(-1.65,23)-pitch;
   const floorY=viewport.height*(1-Math.tan(down)/Math.tan(frozen.transition.baseFov*Math.PI/360))/2;
   await pg.mouse.click(viewport.width/2,floorY);
   await pg.waitForFunction(()=>__totehm_gallery().zone==='temple'&&__totehm_gallery().position[1]<-10.8&&!__totehm_gallery().moving);
   await pg.focus('#space');await pg.keyboard.down('w');
   try{await pg.waitForFunction(()=>__totehm_gallery().zone==='void'&&!__totehm_gallery().transition.active,null,{timeout:10000});}finally{await pg.keyboard.up('w');}
   check((await state(pg)).void.room===1&&(await state(pg)).void.index===0,'walking through the actual arch opens its original collection'+suffix);
   await pg.keyboard.press('Escape');await settled(pg,'temple');
   await pg.mouse.click(viewport.width/2,viewport.height/2);await settled(pg,'void');
   check((await state(pg)).void.room===1,'the visible central arch also accepts an actual ray click'+suffix);
   await pg.keyboard.press('Escape');await settled(pg,'temple');
   await pg.click('.tour a[href="#totehmpaper"]');await settled(pg,'void');
   check((await state(pg)).void.total===1&&await pg.locator('#work-links a[href="/get_higher"]').count()===1&&await pg.locator('#work-links a[href="/stoner"]').count()===1,'paper arch retains the single THP/Stoner work and both authored doors'+suffix);
   await pg.click('#return-dome');await settled(pg,'temple');
   await pg.click('.tour a[href="#lisbon"]');await settled(pg,'void');
   check((await state(pg)).void.total===1&&await pg.locator('#work-title use[href="#higher-slogan"]').count()===1&&await pg.locator('#work-links a[href="/play_lisbon_street"]').count()===1,'Lisbon arch keeps its authentic Higher title and sole PLAY destination'+suffix);
   await pg.keyboard.press('Escape');await settled(pg,'temple');
   check((await state(pg)).room===-1,'Escape returns from a parallel space to the temple'+suffix);

   await pg.emulateMedia({reducedMotion:'no-preference'});await pg.waitForFunction(t=>__totehm_gallery().temple.time>t,frozen.temple.time);
   await pg.click('#view-list');await pg.waitForFunction(()=>__totehm_gallery().list&&!__totehm_gallery().visible);
   await pg.waitForFunction(()=>__totehm_gallery().audio.state==='suspended');
   samples.listStart=await state(pg);await pg.waitForTimeout(350);samples.listEnd=await state(pg);
   check(samples.listEnd.frames===samples.listStart.frames&&samples.listEnd.temple.time===samples.listStart.temple.time&&JSON.stringify(await audioState(pg))==='["suspended"]','artwork mode suspends rendering, temple animation and the native audio clock'+suffix);
   check(await pg.locator('#gallery .room').count()===3&&await pg.locator('#origins .origin-card img').count()===20&&await pg.locator('#totehmpaper img[src$="totehmpaper.png"]').count()===1,'accessible artwork mode retains all twenty originals plus the real paper'+suffix);
   await pg.click('#view-list');await pg.waitForFunction(()=>__totehm_gallery().visible&&__totehm_gallery().audio.state==='running');
   await pg.click('#toggle-sound');await pg.waitForFunction(()=>__totehm_gallery().audio.muted&&__totehm_gallery().audio.state==='suspended');
   check(await pg.locator('#toggle-sound').getAttribute('aria-pressed')==='false'&&JSON.stringify(await audioState(pg))==='["suspended"]','sound control truly suspends audio and exposes its disabled state'+suffix);
   await pg.click('#toggle-sound');await pg.waitForFunction(()=>!__totehm_gallery().audio.muted&&__totehm_gallery().audio.state==='running');
   check(JSON.stringify(await audioState(pg))==='["running"]','sound resumes the same native context'+suffix);
   await visibility(pg,true);await pg.waitForFunction(()=>__totehm_gallery().audio.state==='suspended');
   samples.hiddenStart=await state(pg);await pg.waitForTimeout(350);samples.hiddenEnd=await state(pg);
   check(samples.hiddenEnd.frames===samples.hiddenStart.frames&&samples.hiddenEnd.temple.time===samples.hiddenStart.temple.time&&JSON.stringify(await audioState(pg))==='["suspended"]','hidden document suspends the world and its native audio clock'+suffix);
   await visibility(pg,false);await pg.waitForFunction(n=>__totehm_gallery().frames>n&&__totehm_gallery().audio.state==='running',samples.hiddenEnd.frames);
   check(!requests.some(u=>/\.(mp3|wav|ogg|aac|flac)(\?|$)/i.test(u)),'ambient sound needs no external audio file'+suffix);
   check(!log.errors.some(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e)),'no application or WebGL shader errors'+suffix+': '+log.errors.join(' | '));
   results.push({viewport,samples,log});
  }catch(error){samples.failed=await state(pg).catch(()=>null);await pg.screenshot({path:OUT+'/failure-'+viewport.width+'.png'}).catch(()=>{});results.push({viewport,samples,log,error:String(error)});throw error;}
  finally{fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await ctx.close();}
 }
 // A separate local clock exercises the real night rendering, not a colour flag.
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:false,viewport});
  try{
   await clockAndAudio(pg,'2026-10-17T22:00:00Z');await pg.goto(origin+'/');
   await pg.waitForFunction(()=>window.__totehm_gallery?.().frames>0,null,{timeout:45000});
   const night=await settled(pg,'temple'),pixels=await worldPixels(pg,'night-world-'+viewport.width);
   check(!night.temple.day&&night.temple.visible&&night.temple.hour===await pg.evaluate(()=>new Date().getHours()),'local night clock changes the living temple at '+viewport.width);
   check(pixels.mean<dayPixels.get(viewport.width).mean*.8&&pixels.black<.999,'night is genuinely darker rendered scenery at '+viewport.width);
   check(await guideClear(pg),'night guidance stays clear of text and controls at '+viewport.width);
   check((await audioState(pg)).length===0&&!log.errors.some(e=>e.startsWith('pageerror:')),'night loads silently without application errors at '+viewport.width);
   results.push({night:true,viewport,state:night,pixels,log});
  }finally{fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await ctx.close();}
 }
 // The HTML view must win a race against a still-downloading renderer.
 let release;const gate=new Promise(resolve=>release=resolve);
 const late=await page(browser,{dir:'space',origin,session:false,viewport:{width:390,height:844},network:async url=>{if(url.pathname==='/gallery-3d.mjs')await gate;return null;}});
 try{
  await clockAndAudio(late.pg);await late.pg.goto(origin+'/',{waitUntil:'commit'});
  await late.pg.waitForFunction(()=>window.__totehm_gallery&&__totehm_gallery().webgl===undefined);
  await late.pg.click('#view-list');release();
  await late.pg.waitForFunction(()=>__totehm_gallery().webgl===true);
  const a=await state(late.pg);await late.pg.waitForTimeout(400);const b=await state(late.pg);
  check(a.list&&!a.visible&&a.frames===b.frames&&a.temple.time===b.temple.time,'opening artwork mode before the renderer loads keeps the late temple paused');
  check((await audioState(late.pg)).length===0&&await late.pg.locator('#origins .origin-card').count()===20,'late renderer does not start sound or hide the complete HTML collection');
  results.push({race:true,start:a,end:b,log:late.log});
 }finally{release();fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await late.ctx.close();}
 const fallback=await page(browser,{dir:'space',origin,session:false,viewport:{width:390,height:844}});
 try{
  await fallback.pg.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args);};});
  await fallback.pg.goto(origin+'/');await fallback.pg.waitForFunction(()=>window.__totehm_gallery?.().fallback);
  check(await fallback.pg.locator('#gallery').isVisible()&&await fallback.pg.locator('#origins .origin-card').count()===20&&await fallback.pg.locator('#totehmpaper img[src$="totehmpaper.png"]').count()===1,'WebGL fallback exposes all twenty originals and authentic THP');
  check(await fallback.pg.evaluate(()=>document.documentElement.scrollWidth===innerWidth)&&!fallback.log.errors.some(e=>e.startsWith('pageerror:')),'complete fallback fits the phone and has no application errors');
  results.push({fallback:true,state:await state(fallback.pg),log:fallback.log});
 }finally{fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await fallback.ctx.close();}
 console.log('PASS '+checks+' temple and black corridor checks; screenshots '+OUT);
}finally{await browser.close();}
