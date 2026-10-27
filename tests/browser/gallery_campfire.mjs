// Isolated native WebGL view of the actual campfire, with reproducible cameras.
// The full pavilion and navigation are covered by gallery_glass_hearth.mjs.
import assert from 'node:assert/strict';import fs from 'node:fs';
import {launch,page} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/gallery-campfire';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',browser=await launch(),results=[];let checks=0;
const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
const fixture=`<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;background:#050b16}canvas{display:block}</style></head><body><script type="module">
import * as T from '/vendor/three-0.180.0.mjs';import {createGalleryFireplace} from '/gallery-fireplace.mjs';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x050b16);const camera=new T.PerspectiveCamera(innerWidth<650?65:48,innerWidth/innerHeight,.08,200);camera.position.set(-8,2.35,innerWidth<650?-7.7:-9.3);camera.lookAt(-8,2.35,-15.99);
scene.add(new T.HemisphereLight(0xb3d2ff,0x1d0d08,.6));const floor=new T.Mesh(new T.PlaneGeometry(40,40),new T.MeshStandardMaterial({color:0x727679,roughness:.8}));floor.rotation.x=-Math.PI/2;floor.position.set(-8,-.09,-15);scene.add(floor);
const fire=createGalleryFireplace(scene,{mobile:innerWidth<650});let frames=0,motion=false,last=0;
renderer.setAnimationLoop(now=>{const dt=last?Math.min((now-last)/1000,.1):0;last=now;fire.update(dt,camera.position,motion);renderer.render(scene,camera);frames++;});
window.__campfire=()=>({...fire.diagnostics(),frames,programs:renderer.info.programs.length,errors:renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length});window.__campfireMotion=value=>{motion=!!value;};
</script></body></html>`;
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,viewport,session:false,deviceScaleFactor:viewport.width<650?2:1,network:url=>url.pathname==='/__campfire-test'?{status:200,contentType:'text/html',body:fixture}:null});
  try{
   await pg.goto(origin+'/__campfire-test');await pg.waitForFunction(()=>window.__campfire?.().frames>3,null,{timeout:60000});await pg.waitForTimeout(200);
   const still=await pg.evaluate(()=>__campfire());check(still.volumetricFlames&&still.threeDimensionalFlow&&still.flameHeight>=4,'tall real-depth combustion volume renders at '+viewport.width);
   check(!still.metalCanopy&&!still.blackPipe&&still.canopyThickness===0&&still.glassSmokeCollector,'the fire has no freestanding metal hood or chimney at '+viewport.width);
   check(still.flueTop>7&&still.smokeTop>still.flueTop&&still.warmLights===2,'smoke follows the shared glass outlet and fire lights the room at '+viewport.width);
   check(still.errors===0&&still.programs>=4,'native fire, wood, coals and smoke GPU programs compile at '+viewport.width);
   await pg.screenshot({path:OUT+'/campfire-'+viewport.width+'.png'});
   await pg.waitForTimeout(100);check((await pg.evaluate(()=>__campfire())).time===still.time,'reduced motion freezes all combustion clocks at '+viewport.width);
   await pg.evaluate(()=>__campfireMotion(true));await pg.waitForFunction(t=>__campfire().time>t+.2,still.time,{timeout:30000});
   const moving=await pg.evaluate(()=>__campfire());check(moving.moving&&moving.updates>0,'flames, glowing wood, sparks and smoke advance together at '+viewport.width);
   await pg.screenshot({path:OUT+'/campfire-moving-'+viewport.width+'.png'});
   check(!log.errors.some(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e)),log.errors.join('\n'));results.push({viewport,still,moving,errors:log.errors});
  }finally{await ctx.close();}
 }
 fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));console.log('PASS '+checks+' campfire shader and clock checks');
}finally{await browser.close();}
