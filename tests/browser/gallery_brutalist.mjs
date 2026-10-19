// Real local WebGL/Web Audio. Identity, original images and all network stay
// inside the harness; framebuffer observation delegates every native GL call.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {launch,page} from './harness.mjs';
import {ORIGINS} from '../../space/gallery-artworks.mjs';
import {PerspectiveCamera,Vector3} from '../../space/vendor/three-0.180.0.mjs';

const OUT=process.argv[2]||'/tmp/totehm-production/brutalist-gallery';
fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',results=[],locations=['courtyard','passage','pavilion','coast'];
const browser=await launch();let checks=0;
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const state=pg=>pg.evaluate(()=>window.__totehm_gallery());
async function observe(pg,hour){
 await pg.addInitScript(hour=>{
  const NativeDate=Date,fixed=NativeDate.parse('2026-10-19T'+String(hour).padStart(2,'0')+':00:00Z');
  window.Date=new Proxy(NativeDate,{construct:(target,args)=>Reflect.construct(target,args.length?args:[fixed]),apply:()=>new NativeDate(fixed).toString(),get:(target,key)=>key==='now'?()=>fixed:Reflect.get(target,key)});
  window.__nativeAudio=[];
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(Audio){const Observed=new Proxy(Audio,{construct(target,args){const context=Reflect.construct(target,args);__nativeAudio.push(context);return context;}});if(window.AudioContext)window.AudioContext=Observed;else window.webkitAudioContext=Observed;}
  window.__nativeGl={contexts:0,offscreenDraws:0,targetTextures:0,fullReflectionDraws:0,partialReflectionDraws:0,lastReflectionViewport:null};
  const reflectionSize=innerWidth<650?256:512,contexts=new WeakSet(),bindings=new WeakMap(),viewports=new WeakMap(),activeTextures=new WeakMap(),boundTextures=new WeakMap(),textureSizes=new WeakMap(),framebufferSizes=new WeakMap(),get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){const context=Reflect.apply(get,this,[type,...args]);if(/webgl/i.test(type)&&context&&!contexts.has(context)){contexts.add(context);__nativeGl.contexts++;}return context;};
  for(const Class of [window.WebGLRenderingContext,window.WebGL2RenderingContext]){
   if(!Class)continue;const proto=Class.prototype;
   const bind=proto.bindFramebuffer;
   proto.bindFramebuffer=function(target,buffer){if(target===0x8d40||target===0x8ca9)bindings.set(this,buffer);return Reflect.apply(bind,this,[target,buffer]);};
   const active=proto.activeTexture,texture=proto.bindTexture,viewport=proto.viewport,attach=proto.framebufferTexture2D;
   proto.activeTexture=function(unit){activeTextures.set(this,unit);return Reflect.apply(active,this,[unit]);};
   proto.bindTexture=function(target,value){if(target===0x0de1){if(!boundTextures.has(this))boundTextures.set(this,new Map());boundTextures.get(this).set(activeTextures.get(this)??0x84c0,value);}return Reflect.apply(texture,this,[target,value]);};
   proto.viewport=function(...args){viewports.set(this,args);return Reflect.apply(viewport,this,args);};
   proto.framebufferTexture2D=function(...args){const buffer=bindings.get(this),size=textureSizes.get(args[3]);if(args[0]!==0x8ca8&&buffer&&args[1]===0x8ce0&&size)framebufferSizes.set(buffer,size);return Reflect.apply(attach,this,args);};
   for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){
    const method=proto[name];if(!method)continue;
    proto[name]=function(...args){
     const buffer=bindings.get(this);if(buffer)__nativeGl.offscreenDraws++;
     const size=buffer&&framebufferSizes.get(buffer),view=viewports.get(this);
     if(size&&view&&size[0]===reflectionSize&&size[0]===size[1]){
      __nativeGl.lastReflectionViewport=view.slice();
      if(view[0]===0&&view[1]===0&&view[2]===size[0]&&view[3]===size[1])__nativeGl.fullReflectionDraws++;else __nativeGl.partialReflectionDraws++;
     }
     return Reflect.apply(method,this,args);
    };
   }
   for(const name of ['texImage2D','texStorage2D']){
    const method=proto[name];if(!method)continue;
    proto[name]=function(...args){if(args[3]===reflectionSize&&args[3]===args[4]){
     __nativeGl.targetTextures++;
     const value=boundTextures.get(this)?.get(activeTextures.get(this)??0x84c0);if(value)textureSizes.set(value,[args[3],args[4]]);
    }return Reflect.apply(method,this,args);};
   }
  }
 },hour);
}
async function settled(pg,zone='temple'){
 await pg.waitForFunction(zone=>{const d=window.__totehm_gallery?.();return d?.webgl&&d.zone===zone&&!d.moving&&!d.transition.active;},zone,{timeout:30000});return state(pg);
}
async function evidence(pg){return pg.evaluate(()=>({gl:{...__nativeGl},audio:__nativeAudio.map(c=>c.state),now:performance.now(),state:__totehm_gallery()}));}
async function visibility(pg,hidden){await pg.evaluate(hidden=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden});document.dispatchEvent(new Event('visibilitychange'));},hidden);}
function projected(point,viewport,eye=[0,1.65,14],target=[0,5,-22]){
 const camera=new PerspectiveCamera(viewport.width<650?76:62,viewport.width/viewport.height,.08,1400);camera.position.fromArray(eye);camera.lookAt(...target);camera.updateMatrixWorld();
 const p=new Vector3(...point).project(camera);return {x:(p.x+1)/2,y:(1-p.y)/2};
}
async function worldPixels(pg,name,water={x:.5,y:.72}){
 const style=await pg.addStyleTag({content:'body>*:not(#space){visibility:hidden!important}#space,#space canvas{visibility:visible!important}body::before,body::after,#space::before,#space::after{display:none!important}'}),file=OUT+'/'+name+'.png';
 try{await pg.locator('#space canvas').screenshot({path:file});}finally{await style.evaluate(e=>e.remove());}
 return JSON.parse(execFileSync('python3',['-c',String.raw`from PIL import Image
import hashlib,json,sys,warnings
warnings.filterwarnings('ignore',category=DeprecationWarning)
im=Image.open(sys.argv[1]).convert('RGB');w,h=im.size;p=list(im.getdata());black=sum(c==(0,0,0) for c in p)/len(p)
corners=[]
for x,y in [(0,0),(w-int(w*.08),0),(0,h-int(h*.08)),(w-int(w*.08),h-int(h*.08))]:
 q=list(im.crop((x,y,x+int(w*.08),y+int(h*.08))).getdata());corners.append(sum(c==(0,0,0) for c in q)/len(q))
x,y=float(sys.argv[2])*w,float(sys.argv[3])*h;r=12 if w<650 else 24
tile=im.crop((int(x-r),int(y-r),int(x+r),int(y+r)))
print(json.dumps({'width':w,'height':h,'black':black,'corners':corners,'hash':hashlib.sha256(im.tobytes()).hexdigest(),'waterHash':hashlib.sha256(tile.tobytes()).hexdigest(),'mean':sum(.2126*c[0]+.7152*c[1]+.0722*c[2] for c in p)/len(p)}))`,file,String(water.x),String(water.y)],{encoding:'utf8'}));
}
async function uiClear(pg){return pg.evaluate(()=>{
 const rect=s=>document.querySelector(s).getBoundingClientRect(),guide=rect('.guide');
 const clear=(a,b)=>a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;
 const nav=rect('.world-nav');
 return document.documentElement.scrollWidth===innerWidth&&nav.left>=0&&nav.right<=innerWidth&&['.controls','.travel-controls','.welcome h1','.welcome button'].every(s=>clear(guide,rect(s)));
});}
async function floor(pg,viewport,point,eye,target){
 const p=projected(point,viewport,eye,target);await pg.mouse.click(p.x*viewport.width,p.y*viewport.height);
 await pg.waitForFunction(point=>{const d=__totehm_gallery();return d.zone==='temple'&&!d.moving&&Math.hypot(d.position[0]-point[0],d.position[1]-point[2])<.05;},point,{timeout:15000});
 return settled(pg);
}
async function drag(pg,viewport,dx,dy=0){
 while(Math.abs(dx)>.1||Math.abs(dy)>.1){
  const sx=Math.max(-viewport.width+100,Math.min(viewport.width-100,dx)),sy=Math.max(-viewport.height*.4,Math.min(viewport.height*.4,dy));
  const x=sx>0?50:viewport.width-50,y=viewport.height*.4;
  const steps=Math.max(1,Math.min(8,Math.floor(Math.hypot(sx,sy)/8)));
  await pg.mouse.move(x,y);await pg.mouse.down();await pg.mouse.move(x+sx,y+sy,{steps});await pg.mouse.up();dx-=sx;dy-=sy;
 }
}
async function checkOriginal(pg,index,suffix){
 await settled(pg,'void');await pg.waitForFunction(()=>{const v=__totehm_gallery().void;return v.loaded===Math.min(v.pool,v.total);});
 const d=await state(pg),item=ORIGINS[index],href=await pg.locator('#work-links a[href^="/origins?work="]').getAttribute('href');
 check(d.void.currentWork===item.id&&d.void.index===index&&JSON.stringify(d.void.visibleWorks)===JSON.stringify([index+1]),'original '+(index+1)+' is alone and in order'+suffix);
 check(Math.abs(d.position[0])<.02&&Math.abs(d.position[1]-(-25-index*32))<.02&&(await pg.locator('#work-title').textContent())===item.title&&Number(new URL(href,origin).searchParams.get('work'))===index+1,'original '+(index+1)+' keeps its 32 metre stop, title and authored reader'+suffix);
 return d;
}
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:false,viewport,hasTouch:viewport.width<650});
  const samples={viewport,stages:[],stops:[]},suffix=' at '+viewport.width;
  try{
   await observe(pg,viewport.width<650?22:12);await pg.goto(origin+'/');
   await pg.waitForFunction(()=>window.__totehm_gallery?.().frames>0&&window.__totehm_gallery().world?.reflection.ready,null,{timeout:60000});
   samples.entrance=await evidence(pg);const d=samples.entrance.state;
   check(d.webgl&&!d.fallback&&d.world.visible&&d.world.location==='courtyard','real WebGL courtyard opens'+suffix);
   check(d.world.day===false&&d.world.atmosphere.fixedHour===19&&d.world.atmosphere.stars===0,'reference blue hour replaces local noon or night'+suffix);
   check(JSON.stringify(d.world.locations)===JSON.stringify(locations)&&await pg.locator('.world-nav [data-location]').count()===4,'all four reference shots have accessible location controls'+suffix);
   check(d.world.architecture.rectangularPortals===3&&d.world.architecture.wallHeight>=25&&d.world.atmosphere.worldMetreUV&&d.world.atmosphere.concrete.includes('formwork'),'courtyard uses monumental rectangular openings and detailed concrete'+suffix);
   check(await uiClear(pg),'four-shot navigation and guidance fit the viewport'+suffix);
   check(samples.entrance.audio.length===0&&!d.audio.unlocked,'arrival creates no native audio context before a gesture'+suffix);
   check(d.world.reflection.size===(viewport.width<650?256:512)&&d.world.reflection.maxHz===(viewport.width<650?4:8)&&d.world.reflection.targets===1&&d.world.reflection.clipped&&!d.world.reflection.lastError,'one clipped reflection target has bounded resolution and cadence'+suffix);
   check(samples.entrance.gl.contexts===1&&samples.entrance.gl.offscreenDraws>0&&samples.entrance.gl.targetTextures>0,'reflection performs genuine native off-screen WebGL draws'+suffix);
   check(samples.entrance.gl.fullReflectionDraws>0&&samples.entrance.gl.partialReflectionDraws===0,'native mirror draws fill the complete render target at the current DPR'+suffix);
   await pg.screenshot({path:OUT+'/entrance-'+viewport.width+'.png'});
   samples.courtPixels=await worldPixels(pg,'court-'+viewport.width,projected([.6,-.06,4],viewport));
   check(samples.courtPixels.black<.95&&samples.courtPixels.mean>5,'courtyard and mirrored pool produce visible pixels'+suffix);
   await pg.click('#enter-gallery');check((await state(pg)).zone==='temple'&&await pg.locator('#space').evaluate(e=>document.activeElement===e),'entry action starts exploration in the gallery'+suffix);
   const beforeMirror=await evidence(pg);await drag(pg,viewport,30);
   await pg.waitForFunction(n=>__totehm_gallery().world.reflection.passes>n,beforeMirror.state.world.reflection.passes);
   const pitch=Math.atan2(3.35,36),look=[Math.sin(.12)*Math.cos(pitch),Math.sin(pitch),-Math.cos(.12)*Math.cos(pitch)];
   samples.mirrorPixels=await worldPixels(pg,'court-mirror-view-'+viewport.width,projected([.6,-.06,4],viewport,[0,1.65,14],[look[0],1.65+look[1],14+look[2]]));
   samples.mirrorAfter=await evidence(pg);
   check(samples.mirrorPixels.waterHash!==samples.courtPixels.waterHash&&samples.mirrorAfter.gl.offscreenDraws>beforeMirror.gl.offscreenDraws,'changing the view updates actual reflected water pixels and the native target'+suffix);
   const elapsed=(samples.mirrorAfter.now-beforeMirror.now)/1000;
   check(samples.mirrorAfter.state.world.reflection.passes-beforeMirror.state.world.reflection.passes<=Math.ceil(elapsed*d.world.reflection.maxHz)+1,'reflection captures respect their frame-rate cap'+suffix);
   await pg.click('#overview');await settled(pg);
   await floor(pg,viewport,[0,0,8.75]);await pg.focus('#space');await pg.keyboard.down('w');
   try{await pg.waitForFunction(()=>__totehm_gallery().position[1]<8.64,null,{timeout:6000});await pg.waitForTimeout(450);}finally{await pg.keyboard.up('w');}
   const bank=await state(pg);
   check(bank.position[1]>8.49&&bank.position[1]<8.65&&Math.abs(bank.position[0])<.02&&!bank.moving,'walking stops at the real courtyard pool setback'+suffix);
   await pg.click('#overview');await settled(pg);
   samples.stages.push({location:'courtyard',state:await state(pg),pixels:samples.courtPixels});
   for(const location of locations.slice(1)){
    const before=await state(pg);await pg.click('.world-nav [data-location="'+location+'"]');await settled(pg);
    await pg.waitForFunction(({location,n})=>__totehm_gallery().world.location===location&&__totehm_gallery().world.reflection.passes>n,{location,n:before.world.reflection.passes});
    const current=await state(pg),pixels=await worldPixels(pg,location+'-'+viewport.width);
    check(current.world.location===location&&current.zone==='temple'&&await pg.locator('.world-nav [data-location="'+location+'"]').getAttribute('aria-current')==='true','location cut reaches '+location+' without opening an artwork'+suffix);
    check(pixels.black<.95&&pixels.mean>3,'the '+location+' set genuinely renders'+suffix);
    samples.stages.push({location,state:current,pixels});
   }
   check(new Set(samples.stages.map(s=>s.pixels.hash)).size===4,'four reference locations render distinct spatial views'+suffix);
   const pavilion=samples.stages.find(s=>s.location==='pavilion').state.world.architecture,coast=samples.stages.at(-1).state.world.architecture;
   check(pavilion.bridges===2&&pavilion.curvedSegments>=100&&coast.storeys===3,'ribbon pavilion and three-storey cliff residence retain their defining forms'+suffix);
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.waitForFunction(()=>__totehm_gallery().reduced_motion&&!__totehm_gallery().transition.active);
   const coastYaw=Math.atan2(19.2,22),coastPitch=Math.asin(-10.5/Math.hypot(19.2,10.5,22));
   await drag(pg,viewport,-(-Math.PI/2-coastYaw)/.004,-coastPitch/.003);
   await pg.focus('#space');await pg.keyboard.down('w');
   try{await pg.waitForFunction(()=>__totehm_gallery().position[0]>15.65,null,{timeout:6000});await pg.waitForTimeout(350);}finally{await pg.keyboard.up('w');}
   const edge=await state(pg);
   check(edge.position[0]<=15.81&&edge.position[0]>15.65&&edge.position[1]>=10.19&&edge.position[1]<=18.81&&!edge.moving,'cliff exploration stops safely at the actual overlook edge'+suffix);
   await pg.click('.world-nav [data-location="courtyard"]');await settled(pg);
   // Let the one final cached-image display settle; it must not create an
   // endless capture feedback loop on a slow GPU in reduced-motion mode.
   await pg.waitForTimeout(900);const reducedStart=await evidence(pg);await pg.waitForTimeout(500);const reducedEnd=await evidence(pg);
   check(reducedEnd.state.frames===reducedStart.state.frames&&reducedEnd.state.world.time===reducedStart.state.world.time&&reducedEnd.state.world.reflection.passes===reducedStart.state.world.reflection.passes,'reduced motion keeps the idle gallery and mirror completely still'+suffix);
   await pg.emulateMedia({reducedMotion:'no-preference'});
   await pg.waitForFunction(t=>__totehm_gallery().world.time>t,reducedEnd.state.world.time);
   await pg.evaluate(()=>{window.__courtRoute=[];window.__courtTimer=setInterval(()=>{const d=__totehm_gallery();if(d.zone==='temple')__courtRoute.push(d.position);},40);});
   await pg.click('.tour a[href="#origins"]');await settled(pg,'void');
   samples.route=await pg.evaluate(()=>{clearInterval(__courtTimer);return __courtRoute;});
   check(samples.route.every(([x,z])=>!(Math.abs(x)<2.44&&z>-18.49&&z<8.49)),'guided artwork visit actually skirts the courtyard pool'+suffix);
   samples.stops.push(await checkOriginal(pg,0,suffix));
   samples.voidPixels=await worldPixels(pg,'void-'+viewport.width);
   check(samples.voidPixels.black>.75&&samples.voidPixels.black<.999&&samples.voidPixels.corners.every(x=>x>.999)&&!(await state(pg)).world.visible,'parallel artwork space remains absolute black with the architecture absent'+suffix);
   const voidStart=await evidence(pg);await pg.waitForTimeout(500);const voidEnd=await evidence(pg);
   check(voidEnd.state.world.reflection.passes===voidStart.state.world.reflection.passes&&voidEnd.gl.offscreenDraws===voidStart.gl.offscreenDraws,'hidden architecture performs no mirror captures in the void'+suffix);
   if(viewport.width<650){
    const start=(await state(pg)).position,r=await pg.locator('#joystick').boundingBox(),cdp=await ctx.newCDPSession(pg);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2-24}]});
    try{await pg.waitForFunction(z=>__totehm_gallery().position[1]<z-.2,start[1],{timeout:6000});}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
    check(!(await state(pg)).moving,'real phone joystick still moves and releases in the corridor');
   }
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.waitForFunction(()=>__totehm_gallery().reduced_motion&&!__totehm_gallery().transition.active);
   for(let index=1;index<20;index++){await pg.click('#explore-space');samples.stops.push(await checkOriginal(pg,index,suffix));}
   check(samples.stops.every(s=>s.void.pool===(viewport.width<650?3:5)&&s.void.loaded<=s.void.pool),'all twenty original images retain bounded GPU residency'+suffix);
   await pg.click('#explore-space');const back=await settled(pg);
   check(back.world.location==='courtyard'&&back.position[0]===0&&back.position[1]===14,'end of the original sequence returns to the new courtyard entry'+suffix);
   await floor(pg,viewport,[0,0,-20.95]);await pg.focus('#space');await pg.keyboard.down('w');
   try{await pg.waitForFunction(()=>__totehm_gallery().zone==='void'&&!__totehm_gallery().transition.active,null,{timeout:10000});}finally{await pg.keyboard.up('w');}
   check((await state(pg)).void.room===1,'a real walk across a rectangular doorway enters its artwork space'+suffix);
   await pg.keyboard.press('Escape');await settled(pg);
   await pg.click('.tour a[href="#totehmpaper"]');await settled(pg,'void');
   check(await pg.locator('#work-links a[href="/get_higher"]').count()===1&&await pg.locator('#work-links a[href="/stoner"]').count()===1,'single THP/Stoner presentation retains both authored experiences'+suffix);
   await pg.click('#return-dome');await settled(pg);
   await pg.click('.tour a[href="#lisbon"]');await settled(pg,'void');
   check(await pg.locator('#work-title use[href="#higher-slogan"]').count()===1&&await pg.locator('#work-links a[href="/play_lisbon_street"]').count()===1,'Lisbon retains its authentic Higher title and sole PLAY door'+suffix);
   await pg.keyboard.press('Escape');await settled(pg);
   check((await state(pg)).position[1]===14&&(await state(pg)).room===-1,'Escape restores the new gallery entry'+suffix);
   await pg.emulateMedia({reducedMotion:'no-preference'});await pg.waitForFunction(()=>__totehm_gallery().audio.state==='running');
   await pg.click('#view-list');await pg.waitForFunction(()=>__totehm_gallery().list&&__totehm_gallery().audio.state==='suspended');
   const listStart=await evidence(pg);await pg.waitForTimeout(500);const listEnd=await evidence(pg);
   check(listEnd.state.frames===listStart.state.frames&&listEnd.state.world.reflection.passes===listStart.state.world.reflection.passes&&listEnd.gl.offscreenDraws===listStart.gl.offscreenDraws&&JSON.stringify(listEnd.audio)==='["suspended"]','artwork list suspends native rendering, reflection and audio'+suffix);
   check(await pg.locator('#origins .origin-card img').count()===20&&await pg.locator('#totehmpaper img[src$="totehmpaper.png"]').count()===1,'complete original artwork list remains available'+suffix);
   await pg.click('#view-list');await pg.waitForFunction(()=>__totehm_gallery().visible&&__totehm_gallery().audio.state==='running');
   await visibility(pg,true);await pg.waitForFunction(()=>__totehm_gallery().audio.state==='suspended');
   const hiddenStart=await evidence(pg);await pg.waitForTimeout(500);samples.hiddenEnd=await evidence(pg);
   check(samples.hiddenEnd.state.frames===hiddenStart.state.frames&&samples.hiddenEnd.state.world.reflection.passes===hiddenStart.state.world.reflection.passes&&samples.hiddenEnd.gl.offscreenDraws===hiddenStart.gl.offscreenDraws&&JSON.stringify(samples.hiddenEnd.audio)==='["suspended"]','hidden document stops reflection, rendering and the native audio clock'+suffix);
   await visibility(pg,false);await pg.waitForFunction(n=>__totehm_gallery().frames>n&&__totehm_gallery().audio.state==='running',samples.hiddenEnd.state.frames);
   check((await evidence(pg)).gl.partialReflectionDraws===0,'all four scenes preserve the full native reflection viewport after adaptive DPR'+suffix);
   check(!log.errors.some(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e)),'four locations and all original spaces have no JavaScript or WebGL errors'+suffix+': '+log.errors.join(' | '));
   results.push({viewport,samples,log});
  }catch(error){samples.failed=await evidence(pg).catch(()=>null);await pg.screenshot({path:OUT+'/failure-'+viewport.width+'.png'}).catch(()=>{});results.push({viewport,samples,log,error:String(error)});throw error;}
  finally{fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await ctx.close();}
 }
 let release;const gate=new Promise(resolve=>release=resolve);
 const late=await page(browser,{dir:'space',origin,session:false,viewport:{width:390,height:844},network:async url=>{if(url.pathname==='/gallery-3d.mjs')await gate;return null;}});
 try{
  await observe(late.pg,12);await late.pg.goto(origin+'/',{waitUntil:'commit'});
  await late.pg.waitForFunction(()=>window.__totehm_gallery&&__totehm_gallery().webgl===undefined);
  await late.pg.click('.world-nav [data-location="coast"]');await late.pg.click('#view-list');release();
  await late.pg.waitForFunction(()=>__totehm_gallery().webgl===true);
  const a=await evidence(late.pg);await late.pg.waitForTimeout(500);const b=await evidence(late.pg);
  check(a.state.world.location==='coast'&&a.state.list&&!a.state.visible&&a.state.frames===b.state.frames&&a.state.world.reflection.passes===b.state.world.reflection.passes,'late renderer respects both queued location and already-open artwork list');
  check(b.audio.length===0&&await late.pg.locator('#origins .origin-card').count()===20,'initial download race starts no sound and retains all twenty originals');
  results.push({race:true,start:a,end:b,log:late.log});
 }finally{release();fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await late.ctx.close();}
 const fallback=await page(browser,{dir:'space',origin,session:false,viewport:{width:390,height:844}});
 try{
  await fallback.pg.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args);};});
  await fallback.pg.goto(origin+'/');await fallback.pg.waitForFunction(()=>window.__totehm_gallery?.().fallback);
  check(await fallback.pg.locator('#gallery').isVisible()&&await fallback.pg.locator('#origins .origin-card').count()===20&&await fallback.pg.locator('#totehmpaper img[src$="totehmpaper.png"]').count()===1,'WebGL fallback preserves every original photograph and THP');
  check(await fallback.pg.evaluate(()=>document.documentElement.scrollWidth===innerWidth)&&!fallback.log.errors.some(e=>e.startsWith('pageerror:')),'complete HTML fallback fits the phone without application errors');
  results.push({fallback:true,state:await state(fallback.pg),log:fallback.log});
 }finally{fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await fallback.ctx.close();}
 console.log('PASS '+checks+' brutalist gallery checks; screenshots '+OUT);
}finally{await browser.close();}
