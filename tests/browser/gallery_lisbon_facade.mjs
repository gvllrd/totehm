import assert from 'node:assert/strict';import fs from 'node:fs';
import {launch,page} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/lisbon-facade';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',browser=await launch();let checks=0;const results=[];
const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
const fixture=`<!doctype html><html><head><style>html,body{margin:0;background:#030912}canvas{display:block}</style></head><body><script type="module">
import * as T from '/vendor/three-0.180.0.mjs';import {createLisbonFacade,LISBON_FACADE as F} from '/gallery-lisbon-facade.mjs';import {createGalleryFacade} from '/gallery-facade.mjs';
const mobile=innerWidth<650,renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x030912);scene.add(new T.HemisphereLight(0xc1d2e1,0x4e4540,.9));const moon=new T.DirectionalLight(0xd3e4ff,1.8);moon.position.set(-15,20,18);scene.add(moon);const fill=new T.DirectionalLight(0xffefd9,.6);fill.position.set(8,8,15);scene.add(fill);
const camera=new T.PerspectiveCamera(mobile?60:46,innerWidth/innerHeight,.08,200);camera.position.set(0,4.3,mobile?52:21);camera.lookAt(0,3.8,-2);
const facade=createLisbonFacade(scene,{mobile}),black=new T.MeshBasicMaterial({color:0x000000}),paper=new T.MeshStandardMaterial({color:0xffffff,roughness:.6});new T.TextureLoader().load('/assets/gallery/totehmpaper.png',texture=>{texture.colorSpace=T.SRGBColorSpace;paper.map=texture;paper.needsUpdate=true;});
createGalleryFacade(scene,{mobile,geometry:g=>g,material:m=>m,station:object=>object,black,sculptedPaperMaterial:paper,position:F.signPosition,scale:F.signScale});let frames=0;renderer.setAnimationLoop(()=>{renderer.render(scene,camera);frames++;});
window.__facade=()=>({...facade.diagnostics(),frames,programs:renderer.info.programs.length,shaderFailures:renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length});window.__detail=()=>{camera.position.set(8,4.2,mobile?5:6);camera.lookAt(8,4.2,-2);camera.fov=44;camera.updateProjectionMatrix();};
</script></body></html>`;
try{for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
 const {pg,ctx,log}=await page(browser,{dir:'space',origin,viewport,session:false,network:url=>url.pathname==='/__lisbon-facade'?{status:200,contentType:'text/html',body:fixture}:null});
 try{
  await pg.goto(origin+'/__lisbon-facade');await pg.waitForFunction(()=>window.__facade?.().frames>2&&__facade().tiles.compiled&&__facade().border.compiled,null,{timeout:60000});
  const d=await pg.evaluate(()=>__facade());check(d.shaderFailures===0,'Native ceramic field, fine borders, iron and limestone shaders compile at '+viewport.width);
  check(d.windows===12&&d.centralBay.windowFree&&d.upperBalconies===8,'The window-free central bay and all historical window rows render at '+viewport.width);
  check(d.tiles.originalProcedural&&d.tiles.externalImages===0&&d.tiles.elongatedDiamonds,'Cobalt diamonds use original metre-sized glazing at '+viewport.width);
  await pg.screenshot({path:OUT+'/front-'+viewport.width+'.png'});await pg.evaluate(()=>__detail());await pg.waitForFunction(n=>__facade().frames>n+2,d.frames);
  await pg.screenshot({path:OUT+'/detail-'+viewport.width+'.png'});
  check(!log.errors.some(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e)),log.errors.join('\n'));results.push({viewport,diagnostics:d,errors:log.errors});
 }finally{await ctx.close();}
}fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));console.log('PASS '+checks+' Lisbon façade native GPU checks');}finally{await browser.close();}
