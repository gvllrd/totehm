import assert from 'node:assert/strict';import fs from 'node:fs';
import {launch,page} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/new-york-building';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',browser=await launch(),results=[];let checks=0;
const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
const fixture=`<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;background:#02050a}canvas{display:block}</style></head><body><script type="module">
import * as T from '/vendor/three-0.180.0.mjs';import {createNewYorkGallery} from '/gallery-new-york.mjs';import {createGalleryFireplace} from '/gallery-fireplace.mjs';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x030914);const camera=new T.PerspectiveCamera(innerWidth<650?78:72,innerWidth/innerHeight,.08,200);camera.position.set(0,1.65,15);camera.lookAt(0,12,-9);
scene.add(new T.HemisphereLight(0x95b5da,0x242032,.62));const moon=new T.DirectionalLight(0xc2d9ff,1.65);moon.position.set(-30,70,-40);scene.add(moon);const fill=new T.DirectionalLight(0x91aecf,.72);fill.position.set(-18,28,45);scene.add(fill);
const gallery=createNewYorkGallery(scene,renderer,{mobile:innerWidth<650}),fire=createGalleryFireplace(scene,{mobile:innerWidth<650,smokeOutlet:{x:-8,y:27,z:-15.2,radius:.45,radiusZ:.45}});let frames=0;
renderer.setAnimationLoop(()=>{gallery.update(0,camera.position,false);fire.update(0,camera.position,false);renderer.render(scene,camera);frames++;});
window.__ny=()=>({...gallery.diagnostics(),frames,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,programErrors:renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length});window.__nyView=(position,target)=>{camera.position.set(...position);camera.lookAt(...target);};
</script></body></html>`;
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,viewport,session:false,network:url=>url.pathname==='/__ny-building'?{status:200,contentType:'text/html',body:fixture}:null});
  try{
   await pg.goto(origin+'/__ny-building');await pg.waitForFunction(()=>window.__ny?.().frames>3&&__ny().facade.paperLoaded&&__ny().stone.photographicMapsReady,null,{timeout:60000});
   const d=await pg.evaluate(()=>__ny());check(d.levels===5&&d.stairs===0&&d.ramps===16,'five floors and sixteen continuous ramp runs render at '+viewport.width);
   check(d.redBrick&&d.facadeOnlyMasonry&&d.windowsFrontOnly&&d.windows===28&&d.centralWindows===0&&d.glassSides&&d.glassRear&&d.glassRoof,'brick facade, blank middle and the clear glass envelope compile at '+viewport.width);
   check(d.flooring.sameAsLisbon&&d.flooring.ancientStone.photographicMapsReady&&d.exhibition.walls===10&&d.exhibition.reservedSlots===29,'Lisbon stone and unobstructed exhibition walls serve all five floors at '+viewport.width);
   check(d.facade.originalDrawing&&d.facade.paperLoaded&&d.facade.edgeNotches===12&&d.facade.scale===2.6&&d.facade.position[1]===14,'the monumental centered tongue and real THP load at '+viewport.width);
   check(d.programErrors===0,'native masonry, pavement, glass, stone and flame shaders compile at '+viewport.width);
   await pg.screenshot({path:OUT+'/entry-'+viewport.width+'.png'});
   await pg.evaluate(()=>__nyView([0,2,-4.8],[0,2.4,-14]));await pg.waitForTimeout(180);await pg.screenshot({path:OUT+'/interior-'+viewport.width+'.png'});
   await pg.evaluate(()=>__nyView([28,18,22],[0,12,-9]));await pg.waitForTimeout(180);await pg.screenshot({path:OUT+'/exterior-'+viewport.width+'.png'});
   await pg.evaluate(()=>__nyView([0,23.25,-7.3],[0,24,-13]));await pg.waitForTimeout(180);await pg.screenshot({path:OUT+'/upper-'+viewport.width+'.png'});
   check(!log.errors.some(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e)),log.errors.join('\n'));results.push({viewport,diagnostics:d,errors:log.errors});
  }finally{await ctx.close();}
 }
 fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));console.log('PASS '+checks+' New York native building checks');
}finally{await browser.close();}
