import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';
const out=process.argv[2]||'/tmp/lisbon-portal-world',origin='https://www.totehm.space';fs.mkdirSync(out,{recursive:true});let checks=0;
const check=(v,m)=>{assert(v,m);checks++;console.log('PASS '+m);};
const neutral="import * as T from '/vendor/three-0.180.0.mjs';export function createTempleLandscape(scene){scene.background=new T.Color(0x101621);scene.add(new T.HemisphereLight(0xdbe6f0,0x252a33,2));const moon=new T.DirectionalLight(0xd5e6ff,3);moon.position.set(-20,40,20);scene.add(moon);return{update:()=>false,diagnostics:()=>({qa:true})};}";
const browser=await launch();const results=[];
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,viewport,session:false,hasTouch:viewport.width<650,network:url=>url.pathname==='/gallery-temple-landscape.mjs'?{contentType:'text/javascript',body:neutral}:null});
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/lisbon-space',{waitUntil:'domcontentloaded'});
   await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&!d.fallback&&d.frames>0&&d.stations.play.coverReady&&d.originsJourney.vessel.chamber.loadedWorks===20;},null,{timeout:90000});
   check(await pg.locator('.tour [data-room="4"]').count()===0,'Lisbon removes the opposite installation at '+viewport.width);
   check(await pg.locator('#outside-discover-link').getAttribute('href')==='/play_lisbon_street?discover=1','The exterior Discover stays accessible at '+viewport.width);
   await pg.screenshot({path:out+'/'+viewport.width+'-entry.png',timeout:90000});
   await pg.locator('.tour [data-room="0"]').click();await pg.waitForFunction(()=>__totehm_gallery().focused===0);check(await pg.locator('#enter-experience').isEnabled(),'The sheltered exterior THP table is physically reachable at '+viewport.width);
   await pg.screenshot({path:out+'/'+viewport.width+'-sheltered-paper.png',timeout:90000});await pg.locator('#close-info').click();
   await pg.locator('.tour [data-room="2"]').click();await pg.waitForFunction(()=>__totehm_gallery().focused===2);await pg.locator('#enter-experience').click();
   await pg.waitForFunction(()=>__totehm_gallery().streetAccess.state==='guest');
   check(new URL(pg.url()).pathname==='/lisbon-space'&&await pg.locator('.street-get-higher').isVisible(),'A guest sees the THP requirement instead of entering the dome at '+viewport.width);
   check(!(await pg.evaluate(()=>__totehm_gallery().stations.play.playing)),'The world preview never starts an unlocked film at '+viewport.width);
   await pg.screenshot({path:out+'/'+viewport.width+'-tinted-door.png',timeout:90000});await pg.locator('#close-info').click();
   await pg.locator('.tour [data-room="1"]').click();await pg.waitForFunction(()=>__totehm_gallery().originsJourney.state==='chamber');
   const d=await pg.evaluate(()=>__totehm_gallery());check(d.camera.position[1]>20&&d.camera.position[2]<-35,'The saucer actually transports the visitor through to Origins at '+viewport.width);
   check(await pg.locator('#return-island').isVisible()&&d.originsJourney.vessel.chamber.originalWorks===20,'The enclosed destination has twenty original works and a return at '+viewport.width);
   await pg.screenshot({path:out+'/'+viewport.width+'-origins-chamber.png',timeout:90000});
   await pg.locator('#return-island').click();await pg.waitForFunction(()=>__totehm_gallery().originsJourney.state==='island'&&__totehm_gallery().camera.position[1]<2);check((await pg.evaluate(()=>__totehm_gallery().camera.position[1]))<2,'Returning restores the island viewpoint at '+viewport.width);
   const errors=log.errors.filter(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e));check(!errors.length,'The full world and transport render without JavaScript or GPU errors at '+viewport.width);
   results.push({viewport,errors:log.errors,diagnostics:await pg.evaluate(()=>__totehm_gallery())});
  }catch(error){console.error(JSON.stringify(log.errors));throw error;}finally{await ctx.close();}
 }
 const owner=await page(browser,{dir:'space',origin,session:true,viewport:{width:1100,height:760},functions:{'stoner-gate':{access:true}},network:url=>url.pathname==='/gallery-temple-landscape.mjs'?{contentType:'text/javascript',body:neutral}:null});
 try{await owner.pg.emulateMedia({reducedMotion:'reduce'});await owner.pg.goto(origin+'/lisbon-space');await owner.pg.waitForFunction(()=>window.__totehm_gallery?.().frames>0);await owner.pg.locator('.tour [data-room="2"]').click();await owner.pg.waitForFunction(()=>__totehm_gallery().focused===2);await owner.pg.locator('#enter-experience').click();await owner.pg.waitForURL(url=>url.pathname==='/play_lisbon_street'&&url.searchParams.get('board')==='1');await owner.pg.waitForFunction(()=>window.__totehm_lisbon?.().access.owned&&__totehm_lisbon().board);check(true,'A verified THP holder passes the tinted door into the full-screen controller');check(await owner.pg.evaluate(()=>__totehm_lisbon().rocks===22),'The admitted owner receives all twenty-two original cues');}finally{await owner.ctx.close();}
}finally{await browser.close();}
fs.writeFileSync(out+'/results.json',JSON.stringify({checks,results},null,2));console.log('PASS '+checks+' Lisbon entrance and Origins world checks');
