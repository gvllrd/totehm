import assert from 'node:assert/strict';import fs from 'node:fs';
import {launch,page} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/gallery-liberty';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',browser=await launch(),results=[];let checks=0;
const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
const fixture=`<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;background:#07111d}canvas{display:block}</style></head><body><script type="module">
import * as T from '/vendor/three-0.180.0.mjs';import {createLiberty,LIBERTY_VIEW} from '/gallery-liberty.mjs';import {createDrownedOcean} from '/gallery-drowned-ocean.mjs';
const mobile=innerWidth<650,renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x07111d);scene.fog=new T.FogExp2(0x101e32,.00024);const camera=new T.PerspectiveCamera(50,innerWidth/innerHeight,.1,9000);camera.position.set(mobile?-95:-70,-5,mobile?87:72);camera.lookAt(74,-23,-48);camera.updateMatrixWorld(true);
scene.add(new T.HemisphereLight(0x95b5da,0x242032,.62));const moon=new T.DirectionalLight(0xc2d9ff,1.65);moon.position.set(38,43,-82);scene.add(moon);const fill=new T.DirectionalLight(0x91aecf,.72);fill.position.set(-18,28,45);scene.add(fill);
const ocean=createDrownedOcean(scene,{mobile,renderer}),liberty=createLiberty(scene,{mobile});let frames=0,motion=false,last=0;
scene.updateMatrixWorld(true);let fit=0;const point=new T.Vector3();liberty.root.traverse(o=>{if(!o.isMesh||o.userData.materialKind==='stone')return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse);fit=Math.max(fit,Math.abs(point.y)/-point.z,Math.abs(point.x)/(-point.z*camera.aspect));}});camera.fov=T.MathUtils.radToDeg(2*Math.atan(fit*1.16));camera.updateProjectionMatrix();
let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;liberty.root.traverse(o=>{if(!o.isMesh||o.userData.materialKind==='stone')return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).project(camera);minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);}});const framing={minX,maxX,minY,maxY};
renderer.setAnimationLoop(now=>{const dt=last?Math.min((now-last)/1000,.1):0;last=now;ocean.update(dt,camera.position,motion);liberty.update(dt,camera.position,motion);renderer.render(scene,camera);frames++;});
window.__liberty=()=>({...liberty.diagnostics(),framing,ocean:ocean.diagnostics(),frames,programs:renderer.info.programs.length,errors:renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length});window.__libertyMotion=value=>{motion=!!value;};window.__libertyCamera=(position,target)=>{camera.position.set(...position);camera.lookAt(...target);camera.fov=42;camera.updateProjectionMatrix();};
</script></body></html>`;
try{
 for(const viewport of [{width:1440,height:1000},...process.argv.includes('--desktop-only')?[]:[{width:390,height:844}]]){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,viewport,session:false,deviceScaleFactor:viewport.width<650?2:1,network:url=>url.pathname==='/__liberty-test'?{status:200,contentType:'text/html',body:fixture}:null});
  try{
   await pg.goto(origin+'/__liberty-test');await pg.waitForFunction(()=>window.__liberty?.().frames>3,null,{timeout:90000});
   const still=await pg.evaluate(()=>__liberty());
   check(still.errors===0&&still.programs>=3,'Native copper, gilded torch and actual ocean shaders compile at '+viewport.width+' ('+still.programs+' programs, '+still.errors+' failures)');
   check(still.crownRays===7&&still.raisedRightArm&&still.sculpted&&still.patinatedCopper,'Crowned head and raised torch are real copper geometry at '+viewport.width);
   check(still.insideCalmWater&&still.maximumMeshRadius<110&&still.minimumCopperClearance>=2.5&&still.minimumFootClearance>=2.5,'The existing ocean stays at least 2.5 m below all copper and both feet at '+viewport.width);
   check(!still.submergedBody&&still.entireStatueAboveSea&&still.feetVisible&&still.loweredLeftArm&&still.tablet,'The complete standing statue includes both feet, the lowered arm and tablet at '+viewport.width);
   check(still.pedestal&&still.pedestalSupport.footContact&&still.bounds.min[1]<still.waterHeight&&still.footMinimum>still.waterHeight,'Stone enters the sea and physically supports the dry feet at '+viewport.width);
   check(still.framing.minX>-.9&&still.framing.maxX<.9&&still.framing.minY>-.9&&still.framing.maxY<.9,'Every real copper vertex is visible inside the full-height portrait at '+viewport.width);
   check(still.drawMeshes===5&&still.externalAssets===0,'The sculpture uses four metal batches plus its stone pedestal at '+viewport.width);
   await pg.screenshot({path:OUT+'/liberty-'+viewport.width+'.png'});
   await pg.waitForTimeout(100);const frozen=await pg.evaluate(()=>__liberty());check(frozen.time===still.time&&frozen.ocean.time===still.ocean.time,'Reduced motion freezes the statue and the actual ocean at '+viewport.width);
   if(viewport.width>650){await pg.evaluate(()=>__libertyCamera([48,13.5,-9],[76,5.5,-48]));await pg.waitForFunction(n=>__liberty().frames>n+2,still.frames);await pg.screenshot({path:OUT+'/liberty-face.png'});}
   await pg.evaluate(()=>__libertyMotion(true));await pg.waitForFunction(t=>__liberty().time>t+.15,still.time,{timeout:30000});
   const moving=await pg.evaluate(()=>__liberty());check(moving.time>still.time&&moving.ocean.time>still.ocean.time,'Parent motion advances water and torch on one clock at '+viewport.width);
   check(!log.errors.some(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e)),log.errors.join('\n'));results.push({viewport,still,moving,errors:log.errors});
  }finally{await ctx.close();}
 }
 fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));console.log('PASS '+checks+' Liberty native GPU checks');
}finally{await browser.close();}
