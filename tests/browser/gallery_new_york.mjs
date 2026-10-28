// Both city entry points use the production modules and native WebGL.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createLiberty} from '../../space/gallery-liberty.mjs';
import {launch,page} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/gallery-new-york',origin='https://www.totehm.space';
const landmarkOnly=process.argv.includes('--landmark-only');
fs.mkdirSync(OUT,{recursive:true});
let checks=0;const results=[];
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const browser=await launch();
async function ready(pg){await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&d.frames>1&&!d.fallback&&d.stations?.opposite?.coverReady&&d.temple?.facade?.paperLoaded;},null,{timeout:90000});}
async function floor(pg,level){
 await pg.click('#view-list');await pg.locator('[data-level="'+level+'"]').click();
 await pg.waitForFunction(expected=>{const d=__totehm_gallery();return !d.moving&&d.physics.grounded&&Math.abs(d.physics.feetHeight-(-.09+5.4*expected))<.06&&Math.abs(d.camera.position[1]-(-.09+5.4*expected+1.74))<.06;},level,{timeout:90000});
}
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,viewport,session:false,hasTouch:viewport.width<650});
  const sample={viewport};results.push(sample);
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});
   await pg.goto(origin+'/new-york',{waitUntil:'domcontentloaded'});await ready(pg);
   sample.entry=await pg.evaluate(()=>__totehm_gallery());
   check(sample.entry.place==='new-york'&&sample.entry.physics.levels===5,'New York entry loads its own five-floor world at '+viewport.width);
   check(sample.entry.temple.levels===5&&sample.entry.temple.stairs===0,'building has five levels with ramps and no stairs at '+viewport.width);
   check(sample.entry.liberty.entireStatueAboveSea&&sample.entry.liberty.minimumFootClearance>=2.5&&sample.entry.fireplace.flameHeight===4.34,'New York keeps the campfire and the complete statue above its sea at '+viewport.width);
   check(sample.entry.liberty.maximumMeshRadius<sample.entry.landscape.ocean.centralCalmRadius&&sample.entry.liberty.footMinimum>sample.entry.landscape.ocean.baseHeight,'the actual ocean calm zone and water ceiling remain below every foot at '+viewport.width);
   check(await pg.locator('.panorama-nav,.welcome,.controls,#jump,#toggle-sound').count()===0,'direct immersive entrance keeps the removed HUD absent at '+viewport.width);
   check(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'New York has no horizontal overflow at '+viewport.width);
   await pg.screenshot({path:OUT+'/entry-'+viewport.width+'.png'});
   if(!landmarkOnly){for(const level of [1,2,3,4]){
    await floor(pg,level);
    check((await pg.evaluate(()=>__totehm_gallery())).physics.level===level,'guided visit reaches physical level '+level+' at '+viewport.width);
   }
   sample.upper=await pg.evaluate(()=>__totehm_gallery());
   await pg.screenshot({path:OUT+'/upper-'+viewport.width+'.png'});
   // Free looking and manual walking remain available on elevated surfaces.
   await pg.locator('#space').focus();await pg.keyboard.down('a');await pg.waitForTimeout(500);await pg.keyboard.up('a');
   check((await pg.evaluate(()=>__totehm_gallery())).physics.feetHeight>20,'manual movement stays supported on the fifth floor at '+viewport.width);
   await floor(pg,0);
   await pg.click('.tour [data-room="1"]');await pg.waitForFunction(()=>__totehm_gallery().focused===1&&!__totehm_gallery().moving);
   check((await pg.evaluate(()=>__totehm_gallery())).stations.book.closed,'Origins book remains reachable and closed in New York at '+viewport.width);
   await pg.click('.tour [data-room="4"]');await pg.waitForFunction(()=>__totehm_gallery().focused===4&&!__totehm_gallery().moving);
   check((await pg.evaluate(()=>__totehm_gallery())).stations.opposite.active,'Same but opposite remains reachable in New York at '+viewport.width);
   }
   await pg.click('#view-list');await pg.click('#visit-liberty');
   await pg.waitForFunction(()=>{const d=__totehm_gallery();return !d.moving&&d.liberty.viewClear&&d.liberty.fullFigureView&&Math.abs(d.camera.fov-d.liberty.viewFov)<.01&&d.camera.position[1]>7;});
   check((await pg.evaluate(()=>__totehm_gallery())).liberty.viewClear,'Liberty destination has a clear view through masonry, slabs and the actual island at '+viewport.width);
   const framing=await pg.evaluate(()=>({camera:__totehm_gallery().camera,top:document.querySelector('header').getBoundingClientRect().bottom+16,bottom:document.querySelector('.tour').getBoundingClientRect().top-16}));
   const scene=new T.Scene(),statue=createLiberty(scene,{mobile:viewport.width<650}),camera=new T.PerspectiveCamera(framing.camera.fov,framing.camera.aspect,framing.camera.near,framing.camera.far);
   scene.updateMatrixWorld(true);camera.position.fromArray(framing.camera.position);camera.lookAt(new T.Vector3(...framing.camera.target));camera.updateMatrixWorld();
   const point=new T.Vector3(),pixels=[];
   statue.root.traverse(object=>{if(!object.isMesh||object.userData.materialKind!=='copper')return;const vertices=object.geometry.attributes.position;for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i).applyMatrix4(object.matrixWorld).project(camera);pixels.push([(point.x+1)*viewport.width/2,(1-point.y)*viewport.height/2]);}});
   check(pixels.every(([x,y])=>x>=16&&x<=viewport.width-16&&y>=framing.top&&y<=framing.bottom),'every copper vertex from feet to torch fits between the controls at '+viewport.width);
   sample.statueView={camera:framing.camera,footClearance:statue.diagnostics().minimumFootClearance};statue.dispose();
   await pg.screenshot({path:OUT+'/liberty-'+viewport.width+'.png'});
   sample.errors=log.errors;
   check(!log.errors.some(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e)),'New York has no JavaScript or shader failure at '+viewport.width);
   if(!landmarkOnly){await pg.goto(origin+'/lisbon-space',{waitUntil:'domcontentloaded'});await ready(pg);
   sample.lisbon=await pg.evaluate(()=>__totehm_gallery());
   check(sample.lisbon.place==='lisbon'&&sample.lisbon.temple.waveGlass&&!sample.lisbon.liberty,'explicit Lisbon URL preserves the glass pavilion at '+viewport.width);
   check(await pg.locator('#building-levels').isHidden(),'New York floor controls stay out of Lisbon at '+viewport.width);
   }
  }finally{await ctx.close();}
 }
 // Native software rendering of the storm ocean is too slow for an animated
 // circulation check. Keep the actual building, navigation, fire and UI here;
 // the two complete scenes above independently exercise the actual ocean.
 if(!landmarkOnly){
  const lighting="import * as T from '/vendor/three-0.180.0.mjs';export function createTempleLandscape(scene){scene.add(new T.HemisphereLight(0xc3d6e6,0x302a20,1));return{update(){return false;},diagnostics(){return{kind:'navigation-test-lighting',skyLoaded:true};}};}";
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,viewport:{width:1100,height:900},session:false,network:url=>url.pathname==='/gallery-temple-landscape.mjs'?{contentType:'text/javascript',body:lighting}:null});
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/new-york');await ready(pg);
   await pg.click('#view-list');await pg.emulateMedia({reducedMotion:'no-preference'});
   await pg.evaluate(()=>{window.__rampSamples=[];window.__rampTimer=setInterval(()=>__rampSamples.push(__totehm_gallery().physics.feetHeight),80);});
   await pg.click('[data-level="1"]');
   await pg.waitForFunction(()=>{const d=__totehm_gallery();return !d.moving&&Math.abs(d.physics.feetHeight-5.31)<.06;},null,{timeout:90000});
   const heights=await pg.evaluate(()=>{clearInterval(__rampTimer);return __rampSamples;});
   check(heights.some(y=>y>.5&&y<4.8),'animated guided travel ascends a physical ramp without teleporting');
   check(!log.errors.some(e=>/pageerror:|THREE.WebGLProgram|shader error/i.test(e)),'animated multi-level guidance has no JavaScript or shader error');
   results.push({circulation:heights});
  }finally{await ctx.close();}
 }
 fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));
 console.log('PASS '+checks+' two-city browser checks');
}finally{await browser.close();}
