// Real local WebGL renderer and navigation; identity/media are intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {launch,page} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/totehm-immersive';fs.mkdirSync(OUT,{recursive:true});
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=160x160:rate=12','-t','2','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart',OUT+'/art.mp4']);
const media=fs.readFileSync(OUT+'/art.mp4'),origin='https://www.totehm.space';
const browser=await launch();
let checks=0;
const check=(condition,message)=>{assert(condition,message);checks++;};
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:false,viewport,hasTouch:viewport.width<650,network:url=>url.pathname.startsWith('/storage/v1/object/public/')?{status:200,contentType:'video/mp4',body:media}:null});
  await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_gallery?.().frames>0,{},{timeout:20000});
  check((await pg.evaluate(()=>__totehm_gallery())).webgl,'real WebGL rendered at '+viewport.width);
  await pg.waitForTimeout(700);await pg.screenshot({path:OUT+'/entrance-'+viewport.width+'.png'});
  check(await pg.locator('#space canvas').count()===1,'one gallery canvas');
  check(await pg.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'no horizontal overflow');
  check(await pg.locator('.tour [data-room]').count()===4,'four accessible guided stations');
  check(!(await pg.evaluate(()=>__totehm_gallery())).playing,'video not loaded at entrance');
  await pg.click('#enter-gallery');await pg.waitForFunction(()=>__totehm_gallery().room===0&&!__totehm_gallery().moving);
  check(await pg.getAttribute('#work-links a:first-child','href')==='/get_higher','original experience opens from work information');
  check(await pg.getAttribute('.tour [data-room="0"]','aria-current')==='true','navigation reflects current work');
  await pg.screenshot({path:OUT+'/paper-'+viewport.width+'.png'});
  await pg.click('.tour [data-room="2"]');await pg.waitForFunction(()=>__totehm_gallery().room===2&&!__totehm_gallery().moving);
  check(await pg.getAttribute('#work-links a:first-child','href')==='/play_lisbon_street','Lisbon original experience preserved');
  await pg.screenshot({path:OUT+'/lisbon-'+viewport.width+'.png'});
  await pg.click('#overview');await pg.waitForFunction(()=>__totehm_gallery().room===-1&&!__totehm_gallery().moving);
  await pg.mouse.click(viewport.width*.65,viewport.height*.72);await pg.waitForFunction(()=>!__totehm_gallery().moving&&__totehm_gallery().position[1]<7.8);
  check(true,'tap on the actual 3D floor moves to that position');
  const before=await pg.evaluate(()=>__totehm_gallery().position);
  await pg.focus('#space');await pg.keyboard.down('w');await pg.waitForFunction(z=>__totehm_gallery().position[1]<z-.45,before[1],{timeout:5000});await pg.keyboard.up('w');
  check((await pg.evaluate(()=>__totehm_gallery().position))[1]<before[1]-.4,'keyboard physically moves camera through room');
  if(viewport.width<650){
    const start=await pg.evaluate(()=>__totehm_gallery().position),r=await pg.locator('#joystick').boundingBox(),cdp=await ctx.newCDPSession(pg);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2-24}]});
    await pg.waitForFunction(z=>__totehm_gallery().position[1]<z-.25,start[1]);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
    check(!(await pg.evaluate(()=>__totehm_gallery())).moving,'real touch joystick moves and releases without stuck motion');
  }
  await pg.click('.tour [data-room="3"]');await pg.waitForFunction(()=>__totehm_gallery().playing===1);
  check(true,'Quantum plays its actual video texture when selected');
  await pg.emulateMedia({reducedMotion:'reduce'});await pg.waitForFunction(()=>__totehm_gallery().playing===0);
  await pg.click('.tour [data-room="1"]');check(!(await pg.evaluate(()=>__totehm_gallery())).moving,'reduced motion snaps to artwork');
  await pg.click('#view-list');check(await pg.locator('#gallery').isVisible(),'artwork list remains available');
  check(await pg.locator('#gallery .room').count()===4&&await pg.locator('#gallery a[href="/origins"]').count()===2,'all original artwork doors available outside 3D');
  await pg.click('#view-list');check(!(await pg.evaluate(()=>__totehm_gallery())).list,'can return to 3D visit');
  check(!log.errors.some(e=>e.startsWith('pageerror')),'no application JavaScript error: '+log.errors.join(' | '));
  await ctx.close();
 }
 // Devices with no WebGL keep a complete usable artwork view.
 const f=await page(browser,{dir:'space',origin,session:false});
 await f.pg.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
 await f.pg.goto(origin+'/');await f.pg.waitForFunction(()=>window.__totehm_gallery?.().fallback);
 check(await f.pg.locator('#gallery').isVisible()&&await f.pg.locator('#gallery .room').count()===4,'WebGL unavailable exposes all four real artworks');
 await f.ctx.close();
 console.log('PASS '+checks+' immersive gallery checks; screenshots '+OUT);
}finally{await browser.close();}
