// Historical facade/source-object fixtures only. The current native Lisbon
// route, pointer actions and world player are covered by gallery_lisbon_black_dome.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LISBON_STREET_SIGNS} from '../../space/gallery-lisbon-signs-layout.mjs';
import {launch,page} from './harness.mjs';

const OUT=process.argv[2]||'/tmp/lisbon-azulejo-restoration',origin='https://www.totehm.space';
const desktopOnly=process.argv.includes('--desktop-only');
fs.mkdirSync(OUT,{recursive:true});
let checks=0;const results=[];
const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
const fatal=log=>log.errors.filter(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e));
const fixture=`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;background:#0c1420}canvas{display:block}</style></head><body><script type="module">
import * as T from '/vendor/three-0.180.0.mjs';
import {createCastleSpace} from '/gallery-castle-space.mjs';
const createModernGallery=(scene,renderer,options)=>createCastleSpace(scene,renderer,{...options,place:'lisbon',style:'azulejo'});
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x0c1420);scene.add(new T.HemisphereLight(0xd7e4ef,0x756148,2));
const light=new T.DirectionalLight(0xffe5c7,2.2);light.position.set(12,25,35);scene.add(light);
const camera=new T.PerspectiveCamera(48,innerWidth/innerHeight,.08,160);let dirty=true,frames=0;
const gallery=createModernGallery(scene,renderer,{mobile:innerWidth<650,onChange:()=>{dirty=true;}});
window.__azView=(position,target)=>{camera.position.set(...position);camera.lookAt(new T.Vector3(...target));camera.updateProjectionMatrix();dirty=true;};
__azView(innerWidth<650?[0,5,65]:[0,4.6,26],[0,3.6,-1.8]);
renderer.setAnimationLoop(()=>{if(!dirty)return;dirty=false;gallery.update(0,camera.position,false);renderer.render(scene,camera);frames++;});
window.__azulejoContribution=()=>{
 const tiles=gallery.root.getObjectByName('Continuous cobalt and white lozenge azulejos');
 const target=new T.WebGLRenderTarget(256,256),shown=new Uint8Array(256*256*4),hidden=new Uint8Array(256*256*4),previous=renderer.getRenderTarget();
 renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,256,256,shown);
 tiles.visible=false;renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,256,256,hidden);tiles.visible=true;
 renderer.setRenderTarget(previous);target.dispose();dirty=true;
 let changed=0;for(let n=0;n<shown.length;n+=4)if(Math.abs(shown[n]-hidden[n])+Math.abs(shown[n+1]-hidden[n+1])+Math.abs(shown[n+2]-hidden[n+2])>15)changed++;
 return changed;
};
window.__azFixture=()=>{
 const signs=[],parts=[];gallery.root.traverse(o=>{if(o.userData.lisbonStreetSign)signs.push(o.userData.signId);parts.push(...o.userData.facadeParts||[]);});
 return{frames,pending:dirty,gallery:gallery.diagnostics(),balusters:gallery.root.getObjectByName('Lisbon roofline — turned stone balustrade').count,windows:parts.filter(n=>n==='Traditional front window glazing').length,balconies:parts.filter(n=>n==='Carved stone Juliet balcony slab').length,signs,shaderFailures:renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length};
};
</script></body></html>`;
const browser=await launch();
try{
 for(const viewport of (desktopOnly?[{width:1440,height:1000}]:[{width:1440,height:1000},{width:390,height:844}])){
  const mobile=viewport.width<650;
  const fixturePage=await page(browser,{dir:'space',origin,viewport,session:false,hasTouch:mobile,network:url=>url.pathname==='/__azulejo_fixture'?{contentType:'text/html',body:fixture}:null});
  try{
   const {pg,log}=fixturePage;
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/__azulejo_fixture');
   await pg.waitForFunction(()=>window.__azFixture?.().gallery.streetSigns.ready&&__azFixture().frames>0&&!__azFixture().pending,null,{timeout:60000});
   const contribution=await pg.evaluate(()=>__azulejoContribution());
   check(contribution>50,'Actual cobalt azulejos visibly contribute rendered pixels at '+viewport.width);
   await pg.waitForFunction(()=>!__azFixture().pending);await pg.screenshot({path:OUT+'/'+viewport.width+'-restored-front.png'});
   for(const view of [
    {id:'facade-detail',position:mobile?[-7.5,3.8,10]:[-11,4,14],target:[-6.5,3.8,-2]},
    {id:'current-interior',position:[0,2.6,-4.3],target:[0,3,-14.7]}
   ]){
    const before=await pg.evaluate(()=>__azFixture().frames);await pg.evaluate(({position,target})=>__azView(position,target),view);
    await pg.waitForFunction(n=>__azFixture().frames>n&&!__azFixture().pending,before,{timeout:30000});await pg.screenshot({path:OUT+'/'+viewport.width+'-'+view.id+'.png'});
   }
   const d=await pg.evaluate(()=>__azFixture());
   check(d.gallery.kind==='lisbon-azulejo-gallery'&&d.gallery.azulejoBuilding.restoredFrom==='c8ddaf0','The original azulejo building is delivered in WebGL at '+viewport.width);
   check(d.balusters===58&&d.windows===12&&d.balconies===8,'The browser renders the complete historic facade geometry at '+viewport.width);
   assert.deepEqual(d.signs.slice().sort(),LISBON_STREET_SIGNS.map(s=>s.id).sort());checks++;
   check(d.gallery.streetSigns.count===22&&d.gallery.streetSigns.loaded===23&&d.gallery.streetSigns.failed===0,'All current street cues and their small Higher sticker load at '+viewport.width);
   check(d.gallery.thpCounter.packagedPapers===6&&d.gallery.origins.readingAlcove&&d.gallery.exhibition.glassMountedArtworks===0,'Current premium cases and sheltered Origins survive restoration at '+viewport.width);
   check(d.shaderFailures===0&&!fatal(log).length,'The restored building compiles without JavaScript or GPU errors at '+viewport.width);
   results.push({kind:'fixture',viewport,azulejoPixels:contribution,diagnostics:d,errors:log.errors});
  }finally{await fixturePage.ctx.close();}

 }
 fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));
 console.log('PASS '+checks+' restored Lisbon browser checks');
}finally{await browser.close();}
