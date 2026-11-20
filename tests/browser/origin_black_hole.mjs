import assert from 'node:assert/strict';import fs from 'node:fs';import {launch,page} from './harness.mjs';
const out=process.argv[2]||'/tmp/origin-black-hole';fs.mkdirSync(out,{recursive:true});let checks=0;const check=(v,m)=>{assert(v,m);checks++;console.log('PASS '+m);};const browser=await launch(),results=[];
const neutral="import * as T from '/vendor/three-0.180.0.mjs';export function createTempleLandscape(scene){scene.background=new T.Color(0x101621);scene.add(new T.HemisphereLight(0xdbe6f0,0x252a33,2));return{update:()=>false,diagnostics:()=>({qa:true})};}";
try{for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){const f=await page(browser,{dir:'space',origin:'https://www.totehm.space',session:false,viewport,hasTouch:viewport.width<650,network:url=>url.pathname==='/gallery-temple-landscape.mjs'?{contentType:'text/javascript',body:neutral}:null});const {pg,ctx,log}=f;try{
 await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto('https://www.totehm.space/lisbon-space');await pg.waitForFunction(()=>window.__totehm_gallery?.().frames>0&&__totehm_gallery().stations.play.coverReady,null,{timeout:90000});
 check(await pg.evaluate(()=>__totehm_gallery().originsJourney.vessel.kind==='origins-saucer-black-hole-transit'),'The island has the real black-hole departure at '+viewport.width);
 await pg.locator('.tour [data-room="1"]').click();await pg.waitForURL(u=>u.pathname==='/origin'&&u.searchParams.get('arrival')==='1',{timeout:30000});await pg.waitForFunction(()=>window.__totehm_origin?.().frames>0,null,{timeout:90000});
 check(await pg.evaluate(()=>__totehm_origin().stage==='saucer'&&__totehm_origin().galaxy&&!__totehm_origin().ocean),'The black hole changes page to a saucer inside the galaxy at '+viewport.width);
 await pg.waitForFunction(()=>__totehm_origin().vessel.canopy.open);
 await pg.screenshot({path:out+'/'+viewport.width+'-saucer.png',timeout:90000});
 await pg.locator('#origin-action').click();await pg.waitForFunction(()=>__totehm_origin().stage==='chamber');
 const d=await pg.evaluate(()=>__totehm_origin());check(d.book.closed&&d.exhibitedWorks===0&&d.vessel.chamber.originalWorks===0,'Only the original closed book is exhibited at '+viewport.width);
 check(d.vessel.chamber.openAir&&d.vessel.walkway.steps===4,'The book stands at the top of four open stairs at '+viewport.width);
 check(await pg.locator('.mc,#conn-bar,input[type=email]').count()===0,'Arrival never asks for a second member connection at '+viewport.width);
 await pg.screenshot({path:out+'/'+viewport.width+'-book.png',timeout:90000});
 check(!log.network.some(u=>/\/wah\//.test(typeof u==='string'?u:JSON.stringify(u))),'No surrounding artwork image is requested in the sanctuary at '+viewport.width);
 await pg.locator('#origin-action').click();await pg.waitForFunction(()=>window.__totehm_book_expansion?.().stage==='reading',null,{timeout:30000});const reader=pg.frames().find(frame=>frame.url().includes('embedded=1'));check(await reader.locator('.reader-header>a').getAttribute('href')==='/origin?return=1','The book opens its original reader in the same scene at '+viewport.width);await reader.locator('.reader-header>a').click();await pg.waitForFunction(()=>__totehm_book_expansion().stage==='closed'&&__totehm_origin().book.closed);check(await pg.locator('iframe').count()===0,'The reader returns to the existing sanctuary without reloading at '+viewport.width);
 const start=await pg.evaluate(()=>__totehm_origin().position);
 await pg.keyboard.down('ArrowRight');
 await pg.waitForFunction(x=>Math.abs(__totehm_origin().position[0]-x)>.4,start[0]);
 await pg.keyboard.up('ArrowRight');
 check(await pg.evaluate(()=>__totehm_origin().stage==='chamber'&&!__totehm_origin().moving),'The arrow keys walk around the book with the action button focused at '+viewport.width);
 check(!log.errors.some(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e)),'Flight, galaxy and sacred book render without application or GPU errors at '+viewport.width);results.push({viewport,diagnostics:d,errors:log.errors});
 }catch(error){console.error(JSON.stringify({url:pg.url(),errors:log.errors,diag:await pg.evaluate(()=>window.__totehm_origin?.()||window.__totehm_gallery?.())}));throw error;}finally{await ctx.close();}}}finally{await browser.close();}
fs.writeFileSync(out+'/results.json',JSON.stringify({checks,results},null,2));console.log('PASS '+checks+' black-hole and Origins page checks');
