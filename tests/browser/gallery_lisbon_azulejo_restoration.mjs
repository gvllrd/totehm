// Native WebGL restoration checks plus a real pointer-to-clip regression.
// Fixtures use neutral light; the application keeps its actual architecture,
// camera, physics, signs and player. The expensive seascape alone is stubbed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PerspectiveCamera,Vector3} from '../../space/vendor/three-0.180.0.mjs';
import {LISBON_STREET_SIGNS} from '../../space/gallery-lisbon-signs-layout.mjs';
import {launch,page} from './harness.mjs';

const OUT=process.argv[2]||'/tmp/lisbon-azulejo-restoration',origin='https://www.totehm.space';
const desktopOnly=process.argv.includes('--desktop-only'),fixtureOnly=process.argv.includes('--fixture-only');
fs.mkdirSync(OUT,{recursive:true});
let checks=0;const results=[];
const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
const fatal=log=>log.errors.filter(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e));
const fixture=`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;background:#0c1420}canvas{display:block}</style></head><body><script type="module">
import * as T from '/vendor/three-0.180.0.mjs';
import {createModernGallery} from '/gallery-modern.mjs';
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
const neutralLandscape=`import * as T from '/vendor/three-0.180.0.mjs';export function createTempleLandscape(scene){scene.background=new T.Color(0x0c1420);scene.add(new T.HemisphereLight(0xd7e4ef,0x756148,2));const light=new T.DirectionalLight(0xffe5c7,2.2);light.position.set(12,25,35);scene.add(light);return{update:()=>false,diagnostics:()=>({qaNeutralLight:true})};}`;
const spatialSource=fs.readFileSync(new URL('../../space/gallery-spatial.mjs',import.meta.url),'utf8');
const marker=' return{visit,enter,enterGallery,overview,visitFireplace,visitLevel,invalidate,';
assert(spatialSource.includes(marker),'The checkout-only camera hook still attaches to the real spatial API');
const hookedSpatial=spatialSource.replace(marker,` window.__azAppView=(position,target)=>{physics.relocateHorizontal({x:position[0],z:position[2]});eye.set(physics.position.x,physics.position.y+HEIGHT,physics.position.z);gaze.set(...target);angles();dirty=true;};\n`+marker);
const animationClip=fs.readFileSync(new URL('../../space/assets/slides/init.mp4',import.meta.url));
async function project(pg,point){
 const d=await pg.evaluate(()=>({camera:__totehm_gallery().camera,width:innerWidth,height:innerHeight}));
 const camera=new PerspectiveCamera(d.camera.fov,d.camera.aspect,d.camera.near,d.camera.far);camera.position.fromArray(d.camera.position);camera.lookAt(new Vector3(...d.camera.target));camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const p=new Vector3(...point).project(camera);return{x:(p.x+1)*d.width/2,y:(1-p.y)*d.height/2};
}
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
  if(fixtureOnly)continue;
  const appPage=await page(browser,{dir:'space',origin,viewport,session:false,hasTouch:mobile,network:url=>url.pathname.startsWith('/storage/v1/object/public/play-signals/')?{contentType:'video/mp4',body:animationClip}:url.pathname==='/gallery-temple-landscape.mjs'?{contentType:'text/javascript',body:neutralLandscape}:url.pathname==='/gallery-spatial.mjs'?{contentType:'text/javascript',body:hookedSpatial}:null});
  try{
   const {pg,log}=appPage;
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/lisbon-space',{waitUntil:'domcontentloaded'});
   await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&!d.fallback&&d.frames>0&&d.temple?.streetSigns?.ready;},null,{timeout:60000});
   const initial=await pg.evaluate(()=>__totehm_gallery());
   check(initial.temple.kind==='lisbon-azulejo-gallery'&&initial.temple.azulejoBuilding.facade.windows===12,'The real Lisbon route uses the restored building at '+viewport.width);
   check(await pg.locator('#lisbon .street-sign-links a').count()===22,'All twenty-two Make it useful actions remain available at '+viewport.width);
   check(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'The restored Lisbon page fits the viewport at '+viewport.width);
   await pg.screenshot({path:OUT+'/'+viewport.width+'-application-entry.png'});
   const sign=LISBON_STREET_SIGNS.find(s=>s.id==='priority'),normal=new Vector3(Math.sin(sign.rotationY),0,Math.cos(sign.rotationY)),target=new Vector3(...sign.position),approach=target.clone().addScaledVector(normal,2.5);
   const before=await pg.evaluate(()=>__totehm_gallery().frames);
   await pg.evaluate(({position,target})=>__azAppView(position,target),{position:approach.toArray(),target:target.toArray()});
   await pg.waitForFunction(n=>__totehm_gallery().frames>n,before,{timeout:30000});
   const point=await project(pg,target.clone().addScaledVector(normal,.03).toArray());
   check(point.x>0&&point.x<viewport.width&&point.y>0&&point.y<viewport.height,'The physical Priority cue is visible and directly clickable at '+viewport.width);
   await pg.mouse.move(point.x,point.y);
   if(!mobile){await pg.waitForSelector('#street-sign-hint:not([hidden])');check((await pg.locator('#street-sign-hint').textContent()).includes('Make it useful'),'The restored space retains its physical Make it useful prompt');}
   await pg.mouse.click(point.x,point.y);
   await pg.waitForURL(url=>url.pathname==='/play_lisbon_street'&&url.searchParams.get('sign')==='priority'&&url.searchParams.get('play')==='1'&&url.searchParams.get('from')==='space',{timeout:15000});
   await pg.waitForFunction(()=>window.__totehm_lisbon?.().activeSign==='priority'&&__totehm_lisbon().playAttempted&&!document.getElementById('vid').paused,null,{timeout:15000});
   check(await pg.locator('#vid').getAttribute('src')==='https://abujjbkbbiumxrokozph.supabase.co/storage/v1/object/public/play-signals/priority.mp4','Clicking the preserved cue immediately plays its own original clip at '+viewport.width);
   check(await pg.evaluate(()=>__totehm_lisbon().videoMuted&&document.getElementById('vid').controls),'The direct clip starts muted with usable video controls at '+viewport.width);
   check(await pg.locator('#xp-get-higher').getAttribute('href')==='/get_higher'&&await pg.locator('#xp-get-higher').getAttribute('aria-label')==='Get Higher to get it','The preserved clip keeps Get Higher to get it at '+viewport.width);
   check((await pg.locator('.xp-teaser').textContent()).includes('Totehmpaper')&&(await pg.locator('.xp-teaser').textContent()).includes('Stoner'),'The direct experience remains a Totehmpaper and Stoner teaser at '+viewport.width);
   await pg.screenshot({path:OUT+'/'+viewport.width+'-priority-direct-clip.png'});
   check(!fatal(log).length,'The restored application and its direct animation have no JavaScript or GPU errors at '+viewport.width);
   results.push({kind:'application',viewport,diagnostics:initial.temple,errors:log.errors});
  }finally{await appPage.ctx.close();}
 }
 fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));
 console.log('PASS '+checks+' restored Lisbon browser checks');
}finally{await browser.close();}
