// Real browser checks of the physical book reader. Only public artwork media
// and catalogue responses are fixtures; no account or production write occurs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {launch,page} from './harness.mjs';
import {ORIGINS} from '../../space/gallery-artworks.mjs';
const OUT=process.argv[2]||'/tmp/totehm-production/origins-codex-book',origin='https://www.totehm.space',BUILD='2026-10-26-origins-explicit-play';
fs.mkdirSync(OUT,{recursive:true});
const clipPath=OUT+'/portrait.mp4';if(!fs.existsSync(clipPath))execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=192x248:rate=10','-t','60','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart',clipPath]);
const clip=fs.readFileSync(clipPath),catalogue=ORIGINS.map((a,i)=>({id:'test-art-'+(i+1),slug:'test-quantum-'+(i+1),title:a.title,price_cents:1377+i*100,currency:'eur',status:i===19?'sold':'available',sort_order:i+1}));
let browser,checks=0;const results=[];
const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
const state=pg=>pg.evaluate(()=>window.__totehm_origins());
const settled=pg=>pg.waitForFunction(()=>window.__totehm_origins&&!__totehm_origins().turning);
const fatal=log=>log.errors.filter(e=>/pageerror:|WebGLProgram|shader error/i.test(e));
function save(){fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));}
async function fixture(viewport){const requests=[];const f=await page(browser,{dir:'space',origin,viewport,hasTouch:viewport.width<650,session:false,tables:{artworks:catalogue},network:(url,request)=>{requests.push({path:url.pathname,query:url.search,method:request.method()});if(url.pathname.startsWith('/storage/v1/object/public/wah/'))return{status:200,contentType:'video/mp4',body:clip};return null;}});await f.pg.emulateMedia({reducedMotion:'reduce'});return{...f,requests};}
async function ready(pg,path='/origins'){await pg.goto(origin+path,{waitUntil:'domcontentloaded'});await pg.waitForFunction(()=>window.__totehm_origins?.().catalogueRecords===20);return state(pg);}
async function shot(pg,name){await pg.screenshot({path:OUT+'/'+name+'.png'});}
async function visibleBox(pg,selector){return pg.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,inViewport:r.x>=-1&&r.y>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1};});}
async function touchSwipe(pg,dx,dy){const box=await pg.locator('#book-stage').boundingBox(),x=box.x+box.width*.5,y=box.y+box.height*.45;const session=await pg.context().newCDPSession(pg);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*.5,y:y+dy*.5}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y:y+dy}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
function ssoBlock(text){const start=text.indexOf('/* ══ LE PONT SSO');const end=text.indexOf('/* ══ FIN DU BLOC SSO',start);if(start<0)return'';if(end>=0)return text.slice(start,end);const marker=text.indexOf('const BASE',start);return text.slice(start,marker>=0?marker:text.indexOf("import {createOriginsReader}",start));}
try{
 const old=execFileSync('git',['show','5c257a7:space/origins.html'],{cwd:new URL('../..',import.meta.url)}).toString(),now=fs.readFileSync(new URL('../../space/origins.html',import.meta.url),'utf8');
 // The precise import/client bridge is audited separately by its producer;
 // the existing anonymous client configuration must not change here either.
 check(old.match(/const SB_URL\s*=.*\nconst SB_ANON\s*=.*\nconst sb =.*;/)?.[0]===now.match(/const SB_URL\s*=.*\nconst SB_ANON\s*=.*\nconst sb =.*;/)?.[0],'Origins retains its existing identity client configuration');
 browser=await launch();
 const viewports=process.argv.includes('--desktop-only')?[{width:1440,height:1000}]:process.argv.includes('--mobile-only')?[{width:390,height:844}]:[{width:1440,height:1000},{width:390,height:844}];
 for(const viewport of viewports){const f=await fixture(viewport),{pg,ctx,log}=f,sample={viewport};results.push(sample);const suffix=' at '+viewport.width;
  try{
   sample.closed=await ready(pg);check(sample.closed.build===BUILD&&sample.closed.book&&sample.closed.total===20&&!sample.closed.opened&&sample.closed.playing===0,'Origins begins as a closed black book without playing media'+suffix);await shot(pg,'cover-'+viewport.width);
   await pg.click('#open-book');check((await state(pg)).opened&&(await state(pg)).work===0,'the cover opens into the introduction'+suffix);await shot(pg,'intro-'+viewport.width);
   const intro=await pg.locator('#intro-left p:visible,#intro-right p:visible').allTextContents();check(intro.join(' ')==='Passionate about science—particularly the fundamental laws of physics—the artist Wah has sought to understand reality through his \"Origins\" digital art collection. Like a continuous story, each of these 22 digital artworks builds upon the concepts presented in the previous ones, a creative evolution that ultimately led to the creation of the TOTEHM logo.','the introduction contains the exact requested text'+suffix);check((await visibleBox(pg,'#book-begin')).inViewport,'the full introduction keeps its begin control visible'+suffix);
   await pg.click('#book-begin');await settled(pg);await pg.waitForTimeout(350);sample.first=await state(pg);check(sample.first.work===1&&sample.first.playing===0&&await pg.locator('#work-1 .artwork-play').textContent()==='Tap to play the artwork','opening the first artwork waits for an explicit play gesture'+suffix);await pg.click('#work-1 .artwork-play');await pg.waitForFunction(()=>__totehm_origins().playing===1);check(await pg.locator('#book-play').textContent()==='PAUSE','tapping the artwork starts only its video'+suffix);await pg.click('#work-1 .artwork-play');check((await state(pg)).playing===0,'tapping the playing artwork pauses it'+suffix);await pg.click('#book-play');await pg.waitForFunction(()=>__totehm_origins().playing===1);await shot(pg,'page01-'+viewport.width);
   check(await pg.locator('#gl0 .gl-t').textContent()==='Chaos'&&await pg.locator('#gl0 .gl-p').textContent()==='€13.77','first artwork title and price come from the server catalogue'+suffix);
   check((await visibleBox(pg,'#vid0')).inViewport&&(await visibleBox(pg,'.reader-controls')).inViewport,'artwork and page controls fit the actual viewport'+suffix);
   const wheelBefore=(await state(pg)).work;for(let i=0;i<28;i++){await pg.mouse.wheel(0,110);await pg.waitForTimeout(60);}await settled(pg);sample.afterWheel=await state(pg);
   check(sample.afterWheel.playing===0,'turning to the next artwork pauses playback and never autoplays'+suffix);
   check(sample.afterWheel.work===wheelBefore+1&&sample.afterWheel.gestures.wheelTurns===1,'a long wheel/trackpad inertia burst turns exactly one page'+suffix);
   await pg.waitForTimeout(280);await pg.mouse.wheel(0,110);await settled(pg);check((await state(pg)).work===wheelBefore+2,'a new wheel gesture after quiet advances one further page'+suffix);
   await pg.waitForTimeout(280);await pg.mouse.wheel(0,-110);await settled(pg);check((await state(pg)).work===wheelBefore+1,'a reverse wheel gesture turns back one page'+suffix);
   if(viewport.width<650){const before=(await state(pg)).work;await touchSwipe(pg,-140,0);await settled(pg);check((await state(pg)).work===before+1,'one real horizontal touch swipe turns one page'+suffix);await touchSwipe(pg,0,150);await settled(pg);check((await state(pg)).work===before,'one real downward swipe returns one page'+suffix);}
   await pg.keyboard.press('ArrowRight');await settled(pg);const keyWork=(await state(pg)).work;await pg.keyboard.press('ArrowLeft');await settled(pg);check((await state(pg)).work===keyWork-1,'keyboard arrows turn exactly one page'+suffix);
   if(viewport.width>650){await pg.emulateMedia({reducedMotion:'no-preference'});await pg.keyboard.press('ArrowRight');await pg.waitForFunction(()=>__totehm_origins().turning);sample.turn=await pg.evaluate(()=>({d:__totehm_origins(),sheetHidden:document.getElementById('turn-sheet').hidden,animations:document.getElementById('turn-sheet').getAnimations().map(a=>a.effect.getKeyframes())}));check(!sample.turn.sheetHidden&&sample.turn.animations.some(frames=>frames.some(frame=>/rotateY/.test(frame.transform||''))),'normal motion turns an actual 3D leaf instead of sliding the story vertically');await shot(pg,'turning-'+viewport.width);await settled(pg);await pg.emulateMedia({reducedMotion:'reduce'});}
   sample.order=[];while((await state(pg)).work<20){const d=await state(pg);sample.order.push(d.work);await pg.click('#nav-down');await settled(pg);}sample.order.push(20);check((await state(pg)).playing===0,'the final artwork also waits for its own play gesture'+suffix);await pg.click('#work-20 .artwork-play');await pg.waitForFunction(()=>__totehm_origins().playing===1);
   check((await state(pg)).videoFiles.every((name,i)=>name===(i+1)+'.mp4')&&sample.order.every((n,i,a)=>i===0||n===a[i-1]+1),'twenty original videos remain in their authored order'+suffix);
   check(await pg.locator('#nav-down').isDisabled()&&await pg.locator('#gl19 .gl-btn').isDisabled()&&await pg.locator('#gl19 .gl-btn').textContent()==='Sold','the final page is bounded and preserves sold status from the catalogue'+suffix);await shot(pg,'page20-'+viewport.width);
   await pg.click('#nav-up');await settled(pg);check((await state(pg)).work===19&&(await state(pg)).playing===0,'previous returns from the last page without wrapping or autoplay'+suffix);await pg.click('#work-19 .artwork-play');await pg.waitForFunction(()=>__totehm_origins().playing===1);
   await pg.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await pg.waitForTimeout(180);check((await state(pg)).playing===0,'hiding the reader pauses its original video'+suffix);
   await pg.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});check((await state(pg)).playing===0,'returning to the reader does not autoplay the previous artwork'+suffix);
   await pg.click('#book-close');check(!(await state(pg)).opened&&(await state(pg)).playing===0,'closing the book pauses the experience'+suffix);
   sample.deep=await ready(pg,'/origins?work=07');await pg.waitForTimeout(350);check(sample.deep.opened&&sample.deep.work===7&&(await state(pg)).playing===0,'existing work deep links open their exact page without autoplay'+suffix);check(await pg.locator('#work-7 .artwork-play').isVisible(),'deep links display the explicit artwork play control'+suffix);
   sample.open=await ready(pg,'/origins?open=1');check(sample.open.opened&&sample.open.work===0,'the gallery lectern link enters the open introduction without a second cover'+suffix);
   check(await pg.locator('a[href="/market"]').count()>0&&await pg.locator('a[href="/market?tab=mine"]').count()>0,'the complete market and owned collection remain linked'+suffix);
   check(await pg.evaluate(()=>document.documentElement.scrollHeight===innerHeight&&document.documentElement.scrollWidth===innerWidth),'book gestures never create document scrolling or horizontal overflow'+suffix);
   check(fatal(log).length===0,'no JavaScript or GPU error in the book reader'+suffix);sample.errors=log.errors;sample.requests=f.requests;sample.final=await state(pg);save();
  }catch(error){sample.failure={message:error.message,stack:error.stack,state:await state(pg).catch(()=>null),errors:log.errors};await shot(pg,'failure-'+viewport.width).catch(()=>{});save();throw error;}finally{await ctx.close();}
 }
 console.log('PASS '+checks+' Origins book checks; '+OUT+'/results.json');save();
}finally{await browser?.close();}
