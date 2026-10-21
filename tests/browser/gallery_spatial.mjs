// A real WebGL / HTMLVideo journey. Every service and media response is local;
// no account, private production URL, payment or purchase is ever requested.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {launch,page} from './harness.mjs';
import {ORIGINS} from '../../space/gallery-artworks.mjs';
import {SIGNS,INTENTIONS} from '../../space/gallery-spatial-data.mjs';
import {PerspectiveCamera,Vector3} from '../../space/vendor/three-0.180.0.mjs';

const OUT=process.argv[2]||'/tmp/totehm-production/spatial-gallery';
const focusedScenarios=process.env.SPATIAL_SCENARIOS_ONLY?.split(',')||null;
const renderOnly=process.env.SPATIAL_RENDER_ONLY||null;
fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',storage='https://abujjbkbbiumxrokozph.supabase.co';
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=192x128:rate=12','-t','4','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart',OUT+'/art.mp4']);
const media=fs.readFileSync(OUT+'/art.mp4');
const results=[];let checks=0,browser;
const check=(condition,message)=>{assert(condition,message);checks++;};
const state=pg=>pg.evaluate(()=>window.__totehm_gallery());
const clone=value=>JSON.parse(JSON.stringify(value));
const originalController=Function('return ('+fs.readFileSync(new URL('../../space/play_lisbon_street.html',import.meta.url),'utf8').match(/const SIGNS = (\{[\s\S]*?\n\});/)[1]+')')();

// Choose a real opaque image pixel which is not covered by another PNG. The
// original controller includes transparent 300×300 image rectangles that overlap.
const signPoints=JSON.parse(execFileSync('python3',['-c',String.raw`
import json,sys
from PIL import Image
from pathlib import Path
signs=json.loads(sys.argv[1]); images={k:Image.open(Path(sys.argv[2])/(k+'.png')).convert('RGBA') for k in signs}; result={}
for key,(left,top,width) in signs.items():
 im=images[key]; w,h=im.size; candidates=[]
 for py in range(4,h-4,3):
  for px in range(4,w-4,3):
   if im.getpixel((px,py))[3]>220: candidates.append(((px-w/2)**2+(py-h/2)**2,px,py))
 for _,px,py in sorted(candidates):
  x=left/100*10+width/100*10*px/w; y=top/100*5.625+width/100*10*py/h; clear=True
  for other,(l,t,span) in signs.items():
   if other==key:continue
   u=(x-l/100*10)/(span/100*10); v=(y-t/100*5.625)/(span/100*10)
   if 0<=u<1 and 0<=v<1:
    oi=images[other]
    if oi.getpixel((min(299,int(u*300)),min(299,int(v*300))))[3]>20:clear=False;break
  if clear: result[key]=[-11-5+x,3+5.625/2-y,-4.92];break
 if key not in result:raise Exception('No unoccluded opaque point for '+key)
print(json.dumps(result))
`,JSON.stringify(SIGNS),new URL('../../space/assets/signs',import.meta.url).pathname],{encoding:'utf8'}));

function fixtures({signedIn=true,canBuy=true,access=true}={}){
 const values={signedIn,canBuy,access,gateCalls:0,publicReads:[],privateReads:[],checkouts:[],failure:false,holdSlug:null,pending:[],checkoutResult:{error:'reserved'},owners:{}};
 const works=[
  {slug:'totehmpaper',title:'TOTEHMPAPER {THP}',collection:'totehmpaper',media:null,price_cents:1700,currency:'usd',edition_total:777000,available:777000},
  ...ORIGINS.map((w,i)=>({slug:'origin-collection-'+String(i+1).padStart(2,'0'),title:w.title,collection:'quantum',media:w.media,price_cents:13500+i*100,currency:'eur',edition_total:8,available:7})),
  ...Object.keys(SIGNS).map((key,i)=>({slug:'signal-collection-'+key,title:'Street · '+key,collection:'play-the-lisbon-street',media:'play-signals/'+key+'.mp4',price_cents:24100+i*100,currency:'eur',edition_total:12,available:11}))
 ];
 values.works=works;
 const view=slug=>({signed_in:values.signedIn,can_buy_art:values.canBuy,door:{thp:values.canBuy,habit:values.canBuy},collections:[{slug:'quantum',title:'Origins'},{slug:'totehmpaper',title:'TotehmPaper'},{slug:'play-the-lisbon-street',title:'Lisbon'}],works:clone(works),detail:slug?{...clone(works.find(w=>w.slug===slug)),owners:clone(values.owners[slug]||[]),history:[]}:null});
 values.network=async(url,request,log)=>{
  if(url.origin===storage&&url.pathname==='/rest/v1/rpc/market_view'){
   const body=JSON.parse(request.postData()||'{}');log.rpc.push({name:'market_view',body});
   const response=view(body.p_slug);
   if(body.p_slug&&body.p_slug===values.holdSlug)await new Promise(resolve=>values.pending.push(resolve));
   return values.failure?{status:503,contentType:'application/json',body:JSON.stringify({message:'Fixture catalogue unavailable',code:'fixture_unavailable'})}:{status:200,contentType:'application/json',body:JSON.stringify(response)};
  }
  if(url.origin===storage&&url.pathname.startsWith('/storage/v1/object/public/')){
   values.publicReads.push(url.pathname);return {status:200,contentType:'video/mp4',headers:{'access-control-allow-origin':origin},body:media};
  }
  if(url.origin===storage&&url.pathname.startsWith('/storage/v1/object/sign/stoner-method/')){
   values.privateReads.push(url.pathname);return {status:200,contentType:'video/mp4',headers:{'access-control-allow-origin':origin},body:media};
  }
  if(url.origin===storage&&url.pathname==='/functions/v1/stoner-gate'){
   values.gateCalls++;return {status:200,contentType:'application/json',body:JSON.stringify(values.access?{access:true,expires_in:900,urls:Object.fromEntries(Array.from({length:11},(_,n)=>[String(n),storage+'/storage/v1/object/sign/stoner-method/step_'+n+'.mp4?token=local-fixture']))}:{access:false,reason:'locked'})};
  }
  if(url.origin===storage&&/\/functions\/v1\/(artwork-checkout|higher-checkout|market-checkout)$/.test(url.pathname)){
   values.checkouts.push({fn:url.pathname.split('/').at(-1),body:JSON.parse(request.postData()||'{}'),authorization:request.headers().authorization==='Bearer test-at'});
   return {status:200,contentType:'application/json',body:JSON.stringify(values.checkoutResult)};
  }
  if(url.hostname==='checkout.stripe.com')return {status:200,contentType:'text/html',body:'<!doctype html><title>Local checkout fixture</title><p>No payment is made.</p>'};
  return null;
 };
 return values;
}
async function observe(pg,{noWebGL=false}={}){
 await pg.addInitScript(noWebGL=>{
  window.__spNative={contexts:0,videoUploads:0,videoElements:0,draws:0,motionChanges:[]};
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>__spNative.motionChanges.push(e.matches));
  const seen=new WeakSet(),contexts=new WeakSet(),get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(kind,...args){if(noWebGL&&/webgl/i.test(kind))return null;const gl=Reflect.apply(get,this,[kind,...args]);if(gl&&/webgl/i.test(kind)&&!contexts.has(gl)){contexts.add(gl);__spNative.contexts++;}return gl;};
  for(const Class of [globalThis.WebGLRenderingContext,globalThis.WebGL2RenderingContext]){
   if(!Class)continue;
   for(const name of ['texImage2D','texSubImage2D']){
    const native=Class.prototype[name];Class.prototype[name]=function(...args){
     const source=args.find(x=>x instanceof HTMLVideoElement);
     if(source){__spNative.videoUploads++;if(!seen.has(source)){seen.add(source);__spNative.videoElements++;}}
     return Reflect.apply(native,this,args);
    };
   }
   for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
    const native=Class.prototype[name];if(native)Class.prototype[name]=function(...args){__spNative.draws++;return Reflect.apply(native,this,args);};
   }
  }
 },noWebGL);
}
async function settled(pg){await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&d.zone==='spatial'&&!d.moving;},null,{timeout:45000});return state(pg);}
async function mediaReady(pg,selection){
 await pg.waitForFunction(selection=>{const p=window.__totehm_gallery?.().player;return p?.open&&p.videoReady&&!p.loading&&p.selection?.kind===selection.kind&&(selection.index===undefined||p.selection.index===selection.index)&&(selection.key===undefined||p.selection.key===selection.key);},selection,{timeout:30000});
 return state(pg);
}
async function hidden(pg,value){await pg.evaluate(value=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>value});document.dispatchEvent(new Event('visibilitychange'));},value);}
async function projectedClick(pg,point,{requireCanvas=false}={}){
 const d=await state(pg),viewport=pg.viewportSize(),pose=d.camera;
 assert(pose?.position&&pose?.target,'read-only camera diagnostics required for true in-world picking');
 const camera=new PerspectiveCamera(pose.fov,viewport.width/viewport.height,.08,1400);camera.position.fromArray(pose.position);camera.lookAt(...pose.target);camera.updateMatrixWorld();
 const p=new Vector3(...point).project(camera),x=(p.x+1)*viewport.width/2,y=(1-p.y)*viewport.height/2;
 assert(x>0&&x<viewport.width&&y>0&&y<viewport.height,'artwork point is visible in the current camera');
 if(requireCanvas)assert(await pg.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName==='CANVAS',{x,y}),'the open artwork dock leaves this sign directly reachable on the real canvas');
 await pg.mouse.click(x,y);return {x,y};
}
async function canvasPixels(pg,name){
 const hide=await pg.addStyleTag({content:'body>*:not(#space){visibility:hidden!important}#space,#space canvas{visibility:visible!important}#space::after{display:none!important}'}),file=OUT+'/'+name+'.png';
 try{await pg.locator('#space canvas').screenshot({path:file});}finally{await hide.evaluate(e=>e.remove());}
 return JSON.parse(execFileSync('python3',['-c',String.raw`from PIL import Image
import hashlib,json,sys
im=Image.open(sys.argv[1]).convert('RGB'); pixels=list(im.get_flattened_data() if hasattr(im,'get_flattened_data') else im.getdata()); print(json.dumps({'hash':hashlib.sha256(im.tobytes()).hexdigest(),'black':sum(p==(0,0,0) for p in pixels)/len(pixels)}))`,file],{encoding:'utf8'}));
}
async function renderedMedia(pg,label,sample){
 const uploads=await pg.evaluate(()=>__spNative.videoUploads);
 await pg.waitForFunction(count=>__spNative.videoUploads>=count+2,uploads,{timeout:15000});
 const first=await canvasPixels(pg,label+'-a'),time=await pg.locator('#sp-player-video').evaluate(v=>v.currentTime);
 await pg.waitForFunction(t=>Math.abs(document.querySelector('#sp-player-video').currentTime-t)>.3,time);
 const second=await canvasPixels(pg,label+'-b');
 sample.renderedMedia={first,second,native:await pg.evaluate(()=>({...__spNative})),state:await state(pg)};
 await pg.screenshot({path:OUT+'/'+label+'-ui.png'});
 check(first.hash!==second.hash,label+' changes actual world pixels after new native GPU uploads');
}
async function openOrigin(pg,index,{list=false}={}){
 if(list)await pg.locator('.origin-card[data-origin="'+index+'"]').click();
 else{
  if(index===0)await pg.locator('.tour [data-place="origins"]').click();
  await pg.waitForFunction(index=>{const d=__totehm_gallery();return !d.moving&&Math.abs(d.position[1]-(-25-index*32))<.06;},index,{timeout:30000});
  const d=await state(pg);
  if(!d.player?.open||d.player.selection?.kind!=='origin'||d.player.selection.index!==index)await projectedClick(pg,[(index%2?-1:1)*4.8,5.1,-34-index*32+.04]);
 }
 return mediaReady(pg,{kind:'origin',index});
}
async function inPlace(pg){return pg.evaluate(()=>({path:location.pathname,iframes:document.querySelectorAll('iframe').length,videos:document.querySelectorAll('video').length,position:__totehm_gallery().position,src:document.querySelector('#sp-player-video')?.getAttribute('src'),native:{...__spNative}}));}
async function save(){fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));}

try{
 browser=await launch();
 for(const viewport of focusedScenarios?[]:renderOnly?[{width:1440,height:1000}]:[{width:1440,height:1000},{width:390,height:844}]){
  const fixture=fixtures(),{pg,ctx,log}=await page(browser,{dir:'space',origin,session:true,viewport,hasTouch:viewport.width<650,network:fixture.network,rpc:{set_entry_mode:{ok:true}}});
  const sample={viewport};results.push(sample);const suffix=' at '+viewport.width;
  try{
   await observe(pg);await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/');
   await pg.waitForFunction(()=>window.__totehm_gallery?.().frames>0&&window.__totehm_gallery().world?.paperLoaded&&window.__totehm_gallery().lisbon?.loaded===22,null,{timeout:60000});
   sample.entrance=await state(pg);
   check(sample.entrance.build==='2026-10-21-space-one-journey'&&sample.entrance.zone==='spatial'&&sample.entrance.world.continuous,'one spatial ecosystem opens'+suffix);
   check(JSON.stringify(sample.entrance.world.order)===JSON.stringify(ORIGINS.map(w=>w.id))&&sample.entrance.world.spacing===32,'the authored twenty-work sequence and spacing are intact'+suffix);
   check(JSON.stringify(sample.entrance.world.intentions)===JSON.stringify(INTENTIONS)&&sample.entrance.world.paperPerforations,'COM paper and seven exact circuit colours reach the space'+suffix);
   check(await pg.locator('iframe,.world-nav [data-location]').count()===0,'one space replaces separate architecture views and embedded pages'+suffix);
   check(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'interface fits the viewport'+suffix);
   check(fixture.publicReads.length===0&&fixture.privateReads.length===0,'arrival downloads no artwork video before selection'+suffix);
   sample.entrancePixels=await canvasPixels(pg,'entrance-'+viewport.width);
   await pg.screenshot({path:OUT+'/entrance-ui-'+viewport.width+'.png'});
   check(sample.entrancePixels.black>.35&&sample.entrancePixels.black<.998,'the black field contains a visible spatial paper and circuit'+suffix);
   await pg.waitForTimeout(350);
   const frozen=await state(pg);await pg.waitForTimeout(350);const later=await state(pg);
   check(frozen.frames===later.frames&&frozen.world.time===later.world.time&&frozen.lisbon.time===later.lisbon.time,'reduced motion freezes ambient rendering and both world clocks'+suffix);
   if(renderOnly==='ambient'){
    await pg.emulateMedia({reducedMotion:'no-preference'});await pg.waitForTimeout(1000);
    sample.motionProbe=await pg.evaluate(()=>({native:{...__spNative},matches:matchMedia('(prefers-reduced-motion: reduce)').matches,hidden:document.hidden,visibility:document.visibilityState,now:performance.now()}));
    sample.final=await state(pg);sample.log=log;
    check(sample.final.world.time>0&&sample.final.lisbon.time>0,'normal ambient media preference updates both scene clocks');continue;
   }
   if(renderOnly==='lisbon'){
    await pg.locator('.tour [data-place="lisbon"]').click();await settled(pg);
    await projectedClick(pg,signPoints.fire_exit);await mediaReady(pg,{kind:'sign',key:'fire_exit'});
    await renderedMedia(pg,'lisbon-render-'+viewport.width,sample);sample.final=await state(pg);sample.log=log;continue;
   }
   await pg.click('#enter-gallery');
   await openOrigin(pg,0);await pg.waitForFunction(()=>__spNative.videoUploads>0);
   let d=await state(pg),place=await inPlace(pg);
   check(place.path==='/'&&place.iframes===0&&place.videos===1&&place.src?.endsWith('/wah/1.mp4'),'Origins plays the original media inside this page using one video'+suffix);
   check(place.native.videoUploads>0&&place.native.videoElements===1&&d.world.media?.kind==='origin','the real playing video is uploaded to an in-world GPU texture'+suffix);
   await pg.click('#sp-player-play');await pg.waitForFunction(()=>document.querySelector('#sp-player-video').paused);
   const stopped=await pg.locator('#sp-player-video').evaluate(v=>v.currentTime);await pg.waitForTimeout(300);
   check(Math.abs(await pg.locator('#sp-player-video').evaluate(v=>v.currentTime)-stopped)<.03,'Pause stops the native media clock'+suffix);
   await pg.click('#sp-player-play');const firstPixels=await canvasPixels(pg,'origin-playing-a-'+viewport.width);
   const firstTime=await pg.locator('#sp-player-video').evaluate(v=>v.currentTime);await pg.waitForFunction(t=>Math.abs(document.querySelector('#sp-player-video').currentTime-t)>.25,firstTime);
   sample.originPixels=await canvasPixels(pg,'origin-playing-b-'+viewport.width);
   check(firstPixels.hash!==sample.originPixels.hash,'video changes the actual world pixels while ambient motion is reduced'+suffix);
   await pg.screenshot({path:OUT+'/origin-ui-'+viewport.width+'.png'});
   console.log('STAGE '+viewport.width+' entrance and Origins video captured');
   await pg.click('#sp-player-collect');await pg.waitForSelector('#sp-player-price');
   check(await pg.locator('#sp-player-price').textContent()==='€135'&&(await state(pg)).player.detail==='origin-collection-01','catalogue media resolves its independent sale slug and server price'+suffix);
   check(!await pg.locator('#sp-player-consent').isChecked(),'digital-access consent begins unchecked'+suffix);
   await pg.click('#sp-player-buy');await pg.waitForTimeout(100);
   check(fixture.checkouts.length===0&&/Confirm immediate access/.test(await pg.locator('#sp-player-note').innerText()),'an unchecked consent cannot create a checkout'+suffix);
   await pg.check('#sp-player-consent');await pg.locator('#sp-player-buy').dblclick();await pg.waitForFunction(()=>__totehm_gallery().player.error==='checkout');
   check(fixture.checkouts.length===1&&fixture.checkouts[0].fn==='artwork-checkout'&&fixture.checkouts[0].body.slug==='origin-collection-01'&&fixture.checkouts[0].body.waiver===true&&!('price' in fixture.checkouts[0].body)&&fixture.checkouts[0].authorization,'one consented gesture uses server checkout with no client price'+suffix);
   check(/being collected/.test(await pg.locator('#sp-player-note').innerText()),'server reservation refusal remains visible in the space'+suffix);
   await pg.click('#sp-player-collect');
   sample.stops=[];
   for(let index=0;index<20;index++){
    if(index){await pg.click('#explore-space');await openOrigin(pg,index);}
    d=await state(pg);sample.stops.push({index,position:d.position,work:d.world.currentWork,visible:d.world.visibleWorks});
    check(d.world.currentWork===ORIGINS[index].id&&d.world.index===index&&Math.abs(d.position[0])<.06&&Math.abs(d.position[1]-(-25-index*32))<.06,'Origins '+(index+1)+' is discovered at its exact ordered stop'+suffix);
    check(d.world.visibleWorks.includes(index+1)&&!d.world.visibleWorks.includes(index+2)&&d.world.loaded<=d.world.pool,'only the approached original emerges, with a bounded image pool '+(index+1)+suffix);
   }
   await pg.click('#previous-work');await openOrigin(pg,18);
   check((await state(pg)).world.currentWork==='quantum-19','previous returns to the preceding work in the same path'+suffix);
   const beforeClose=(await state(pg)).position;await pg.click('#sp-player-close');await pg.waitForTimeout(100);
   check(JSON.stringify((await state(pg)).position)===JSON.stringify(beforeClose)&&!(await state(pg)).player.playing&&!(await state(pg)).world.media,'closing artwork preserves the exact viewpoint and restores its still image'+suffix);
   await pg.locator('.tour [data-place="lisbon"]').click();await settled(pg);
   check(JSON.stringify((await state(pg)).lisbon.coordinates)===JSON.stringify(originalController),'all original controller coordinates are preserved'+suffix);
   sample.signClicks=[];
   for(const key of Object.keys(SIGNS)){
    const point=await projectedClick(pg,signPoints[key]);await mediaReady(pg,{kind:'sign',key});await settled(pg);
    const current=await inPlace(pg),reading=await state(pg);
    check(current.src?.endsWith('/play-signals/'+key+'.mp4')&&reading.lisbon.selected===key&&current.path==='/'&&current.videos===1,'native 3D sign '+key+' plays its own original work on the shared screen'+suffix);
    sample.signClicks.push({key,point});await pg.click('#sp-player-close');
   }
   sample.controllerPixels=await canvasPixels(pg,'lisbon-'+viewport.width);
   await projectedClick(pg,signPoints.fire_exit);await mediaReady(pg,{kind:'sign',key:'fire_exit'});
   check((await state(pg)).player.detail==='signal-collection-fire_exit','Lisbon sales resolve by actual media instead of assuming a sign-name slug'+suffix);
   await renderedMedia(pg,'lisbon-playing-'+viewport.width,sample);
   await pg.screenshot({path:OUT+'/lisbon-media-ui-'+viewport.width+'.png'});
   if(viewport.width<650){
    sample.uncoveredSigns=[];
    for(const key of ['priority','crosswalk','stop']){
     const point=await projectedClick(pg,signPoints[key],{requireCanvas:true});await mediaReady(pg,{kind:'sign',key});
     check((await state(pg)).lisbon.selected===key,'mobile lower sign '+key+' remains directly playable while the artwork dock stays open');
     sample.uncoveredSigns.push({key,point});
    }
    await renderedMedia(pg,'lisbon-compact-'+viewport.width,sample);
   }
   console.log('STAGE '+viewport.width+' all twenty Origins and twenty-two 3D signs pass');
   await hidden(pg,true);const hiddenStart=await state(pg);await pg.waitForTimeout(350);const hiddenEnd=await state(pg);
   check(!hiddenEnd.player.playing&&hiddenStart.frames===hiddenEnd.frames&&hiddenStart.world.time===hiddenEnd.world.time,'hidden document pauses native video and rendering'+suffix);
   await hidden(pg,false);await pg.waitForFunction(()=>__totehm_gallery().player.playing);
   await pg.click('#view-list');await pg.waitForFunction(()=>__totehm_gallery().list);const listed=await state(pg);await pg.waitForTimeout(350);
   check((await state(pg)).frames===listed.frames&&!(await state(pg)).player.playing,'artwork list suspends both the spatial renderer and native video'+suffix);
   await pg.click('#view-list');await settled(pg);
   await pg.locator('.tour [data-place="paper"]').click();await settled(pg);
   if(!(await state(pg)).player.open)await projectedClick(pg,[6,4,0]);
   await pg.waitForFunction(()=>__totehm_gallery().player?.selection?.kind==='paper'&&!__totehm_gallery().player.loading);
   check(fixture.privateReads.length===0,'the paper preview alone cannot request private sequences'+suffix);
   await pg.click('#sp-player-enter-method');await pg.waitForFunction(()=>__totehm_gallery().player.methodStep===0&&__totehm_gallery().player.videoReady&&!__totehm_gallery().player.loading,null,{timeout:30000});
   check(fixture.gateCalls===1&&(await inPlace(pg)).src?.startsWith('blob:')&&(await state(pg)).player.loadedBlobs===1,'server-authorised THP opens the first private sequence as a bounded local blob'+suffix);
   await renderedMedia(pg,'paper-playing-'+viewport.width,sample);
   await pg.screenshot({path:OUT+'/paper-media-ui-'+viewport.width+'.png'});
   await pg.click('#sp-player-high');await pg.waitForFunction(()=>__totehm_gallery().player.methodStep===2&&!__totehm_gallery().player.loading);
   check(log.rpc.some(x=>x.name==='set_entry_mode'&&x.body.p_mode==='high'),'High keeps the original deliberate entry choice'+suffix);
   await pg.click('#sp-player-prev');await pg.waitForFunction(()=>__totehm_gallery().player.methodStep===0&&!__totehm_gallery().player.loading);
   await pg.click('#sp-player-low');await pg.waitForFunction(()=>__totehm_gallery().player.methodStep===1&&!__totehm_gallery().player.loading);
   check(log.rpc.some(x=>x.name==='set_entry_mode'&&x.body.p_mode==='low'),'Low keeps the original deliberate entry choice'+suffix);
   await pg.evaluate(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+901000;});
   for(let step=2;step<=10;step++){
    await pg.click('#sp-player-next');await pg.waitForFunction(step=>{const p=__totehm_gallery().player;return p.methodStep===step&&p.videoReady&&!p.loading;},step,{timeout:30000});
    check((await state(pg)).player.loadedBlobs===1&&fixture.privateReads.some(x=>x.endsWith('/step_'+step+'.mp4')),'THP sequence '+step+' stays in the world with one private blob'+suffix);
   }
   check(fixture.gateCalls>=2,'expired private signatures are renewed through the gate'+suffix);
   const paperPosition=(await state(pg)).position;await pg.click('#sp-player-next');
   check(!(await state(pg)).world.media&&(await state(pg)).player.loadedBlobs===0&&JSON.stringify((await state(pg)).position)===JSON.stringify(paperPosition),'finishing the method restores the paper at the same viewpoint'+suffix);
   await pg.click('#sp-player-close');await pg.click('#overview');await settled(pg);
   await pg.emulateMedia({reducedMotion:'no-preference'});const ambient=await state(pg);await pg.waitForTimeout(350);const animated=await state(pg);
   check(animated.world.time>ambient.world.time&&animated.lisbon.time>ambient.lisbon.time&&animated.frames>ambient.frames,'normal motion advances both station clocks and the spatial rendering'+suffix);
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.waitForTimeout(150);
   await pg.locator('#space').focus();const start=(await state(pg)).position;await pg.keyboard.down('w');await pg.waitForTimeout(250);await pg.keyboard.up('w');
   check((await state(pg)).position[1]<start[1]-.1,'keyboard walking retains forward progression'+suffix);
   if(viewport.width<650){
    const joy=await pg.locator('#joystick').boundingBox(),before=(await state(pg)).position;
    await pg.mouse.move(joy.x+joy.width/2,joy.y+joy.height/2);await pg.mouse.down();await pg.mouse.move(joy.x+joy.width/2,joy.y+6);await pg.waitForTimeout(250);await pg.mouse.up();
    check(Math.hypot((await state(pg)).position[0]-before[0],(await state(pg)).position[1]-before[1])>.1,'touch joystick still moves through the shared space'+suffix);
   }
   sample.final=await state(pg);sample.log=log;sample.requests={public:fixture.publicReads.length,private:fixture.privateReads,gate:fixture.gateCalls,checkouts:fixture.checkouts};
   check(!log.errors.some(e=>e.startsWith('pageerror:')||/WebGL.*(?:ERROR|INVALID)|shader.*error/i.test(e)),'journey has no application or shader errors'+suffix);
   await pg.screenshot({path:OUT+'/ui-'+viewport.width+'.png'});
  }catch(error){sample.failure=String(error);sample.state=await state(pg).catch(()=>null);sample.log=log;await pg.screenshot({path:OUT+'/failure-'+viewport.width+'.png'}).catch(()=>{});throw error;}
  finally{await save();await ctx.close();}
 }
 // These service states exercise the same integrated reader through its
 // accessible HTML fallback. WebGL is deliberately unavailable, never bypassed.
 for(const scenario of ['locked','visitor','catalogue-error','stale-detail','checkout-resume'].filter(name=>!renderOnly&&(!focusedScenarios||focusedScenarios.includes(name)))){
  const fixture=fixtures({signedIn:scenario!=='visitor',canBuy:scenario!=='locked',access:false});
  if(scenario==='catalogue-error')fixture.failure=true;
  if(scenario==='stale-detail')fixture.holdSlug='origin-collection-01';
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:scenario!=='visitor',viewport:{width:390,height:844},hasTouch:true,network:fixture.network});
  const sample={scenario};results.push(sample);
  try{
   await observe(pg,{noWebGL:true});await pg.goto(origin+'/');
   await pg.waitForFunction(()=>window.__totehm_gallery?.().fallback);
   check(await pg.locator('.origin-card[data-origin]').count()===20,'fallback keeps all twenty actual Origins in '+scenario);
   if(scenario==='locked'||scenario==='visitor'){
    await pg.locator('.tour [data-place="paper"]').click();
    await pg.waitForFunction(()=>__totehm_gallery().player.open&&!__totehm_gallery().player.loading);
    await pg.click('#sp-player-enter-method');
    await pg.waitForFunction(()=>!__totehm_gallery().player.loading&&['locked','signin'].includes(__totehm_gallery().player.error));
    const d=await state(pg);
    check(!d.player.access&&!d.player.videoReady&&fixture.privateReads.length===0,'THP '+scenario+' cannot request or play private video');
    check(fixture.gateCalls===(scenario==='visitor'?0:1),'THP '+scenario+' obeys the real session and server gate');
    check(await pg.locator('#sp-player-note').isVisible()&&await pg.locator('#sp-player-offer').isVisible(),'THP '+scenario+' explains its access in place');
    await pg.click('#sp-player-close');
    await pg.locator('.origin-card[data-origin="0"]').click();await mediaReady(pg,{kind:'origin',index:0});
    check((await inPlace(pg)).path==='/'&&await pg.locator('#sp-player-video').isVisible(),'public Origins remains playable in the same fallback page for '+scenario);
    if(scenario==='locked'){
     await pg.click('#sp-player-collect');
     check(await pg.locator('#sp-player-gate-action').isVisible()&&!await pg.locator('#sp-player-buy').isVisible(),'collecting gate offers the existing THP requirement without a purchase shortcut');
    }
   }else if(scenario==='catalogue-error'){
    await pg.locator('.origin-card[data-origin="0"]').click();
    await pg.waitForFunction(()=>__totehm_gallery().player.videoReady&&__totehm_gallery().player.error==='catalogue');
    check((await state(pg)).player.playing&&await pg.locator('#sp-player-retry').isVisible(),'a catalogue outage leaves public art playing with a visible retry');
    fixture.failure=false;await pg.click('#sp-player-retry');
    await pg.waitForFunction(()=>__totehm_gallery().player.detail==='origin-collection-01'&&!__totehm_gallery().player.loading);
    check(!(await state(pg)).player.error&&await pg.locator('#sp-player-collect').isVisible(),'catalogue retry restores the server offer without leaving the artwork');
   }else if(scenario==='stale-detail'){
    await pg.locator('.origin-card[data-origin="0"]').click();
    await pg.waitForFunction(()=>__totehm_gallery().player.videoReady);
    const deadline=Date.now()+10000;
    while(!fixture.pending.length&&Date.now()<deadline)await pg.waitForTimeout(30);
    assert(fixture.pending.length,'the first artwork detail request reached its fixture hold');
    await pg.locator('.origin-card[data-origin="1"]').focus();await pg.locator('.origin-card[data-origin="1"]').press('Enter');await mediaReady(pg,{kind:'origin',index:1});
    check((await state(pg)).player.detail==='origin-collection-02','a fresh selection resolves before the earlier detail response');
    fixture.pending.splice(0).forEach(resolve=>resolve());await pg.waitForTimeout(150);
    check((await state(pg)).player.detail==='origin-collection-02'&&(await state(pg)).player.selection.index===1,'a late detail cannot overwrite the newer artwork or offer');
   }else{
    await pg.locator('.origin-card[data-origin="0"]').click();await mediaReady(pg,{kind:'origin',index:0});
    await pg.click('#sp-player-collect');await pg.check('#sp-player-consent');
    fixture.checkoutResult={url:'https://checkout.stripe.com/c/pay/local-space-checkout'};
    await pg.click('#sp-player-buy');await pg.waitForURL('https://checkout.stripe.com/c/pay/local-space-checkout');
    check(fixture.checkouts.length===1&&fixture.checkouts[0].body.slug==='origin-collection-01','a local Stripe fixture receives one server-resolved artwork checkout');
    fixture.owners['origin-collection-01']=[{edition_id:'local-edition-01',edition:3,owner:'local collector',mine:true,since:'2026-10-21T10:00:00Z',price_cents:null,currency:'eur',reserved:false}];
    await pg.goto(origin+'/market?owned=origin-collection-01');
    await pg.waitForURL(url=>url.pathname==='/'&&url.searchParams.has('resume'));
    await mediaReady(pg,{kind:'origin',index:0});
    check((await state(pg)).player.owned&&pg.url().includes('#origin-01'),'payment return resumes the same artwork and reads ownership from the server');
    check(await pg.evaluate(()=>!sessionStorage.getItem('space-spatial-checkout')&&!sessionStorage.getItem('space-spatial-resume')),'payment resume markers are consumed after the return');
    await pg.goto(origin+'/market?art=origin-collection-01');await pg.waitForTimeout(250);
    check(new URL(pg.url()).pathname==='/market','a direct market visit without a checkout marker remains the normal market');
   }
   sample.state=await state(pg).catch(()=>null);sample.log=log;
   check(!log.errors.some(e=>e.startsWith('pageerror:')),'fallback '+scenario+' has no application exception');
   await pg.screenshot({path:OUT+'/fallback-'+scenario+'.png'});
  }catch(error){sample.failure=String(error);sample.state=await state(pg).catch(()=>null);sample.log=log;await pg.screenshot({path:OUT+'/failure-'+scenario+'.png'}).catch(()=>{});throw error;}
  finally{fixture.pending.splice(0).forEach(resolve=>resolve());await save();await ctx.close();}
 }
 console.log('PASS '+checks+' spatial browser checks; evidence '+OUT);
}finally{await browser?.close();await save();}
