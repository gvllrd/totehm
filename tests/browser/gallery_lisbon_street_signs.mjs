// Native sign renders and actual pointer-to-card UI. The ocean is replaced
// by neutral test lighting so this focused check avoids its unrelated GPU cost.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PerspectiveCamera,Vector3} from '../../space/vendor/three-0.180.0.mjs';
import {LISBON_STREET_SIGNS} from '../../space/gallery-lisbon-signs-layout.mjs';
import {launch,page} from './harness.mjs';

const OUT=process.argv[2]||'/tmp/lisbon-street-signs',origin='https://www.totehm.space';
const desktopOnly=process.argv.includes('--desktop-only'),fixtureOnly=process.argv.includes('--fixture-only');
fs.mkdirSync(OUT,{recursive:true});
let checks=0;const results=[];
const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
const canonicalIds=['fire_exit','Heli','aed','green_walk','red_walk','pharma','destination','lisboa_city_hall','speed_bump_caution','crosswalk_caution','no_entry','no_parking','hospital','parking','Hotel','dead_end','roundabout','left_or_straight','no_uturn','priority','crosswalk','stop'];
assert.deepEqual(LISBON_STREET_SIGNS.map(s=>s.id).sort(),canonicalIds.slice().sort());
const screenshotSigns=['priority','stop','roundabout','parking'].map(id=>LISBON_STREET_SIGNS.find(sign=>sign.id===id));
const fatal=log=>log.errors.filter(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e));
const fixture=`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;background:#0c1420}canvas{display:block}</style></head><body><script type="module">
import * as T from '/vendor/three-0.180.0.mjs';
import {createModernGallery} from '/gallery-modern.mjs';
import {LISBON_STREET_SIGNS} from '/gallery-lisbon-signs-layout.mjs';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x0c1420);scene.add(new T.HemisphereLight(0xd7e4ef,0x756148,2));
const lamp=new T.DirectionalLight(0xffe5c7,2.2);lamp.position.set(12,25,35);scene.add(lamp);
const camera=new T.PerspectiveCamera(48,innerWidth/innerHeight,.08,100);let dirty=true,frames=0;
const gallery=createModernGallery(scene,renderer,{mobile:innerWidth<650,onChange:()=>{dirty=true;}});
window.__signView=id=>{const sign=LISBON_STREET_SIGNS.find(s=>s.id===id),normal=new T.Vector3(Math.sin(sign.rotationY),0,Math.cos(sign.rotationY)),target=new T.Vector3(...sign.position);camera.position.copy(target).addScaledVector(normal,innerWidth<650?2.5:2.2);camera.position.y+=.12;camera.lookAt(target);camera.updateProjectionMatrix();dirty=true;};
__signView('priority');
renderer.setAnimationLoop(()=>{if(!dirty)return;dirty=false;gallery.update(0,camera.position,false);renderer.render(scene,camera);frames++;});
window.__stickerContribution=id=>{
 let group;gallery.root.traverse(object=>{if(object.userData.lisbonStreetSign&&object.userData.signId===id)group=object;});
 const sticker=group.children.find(object=>object.name.startsWith('Higher sticker'));
 const target=new T.WebGLRenderTarget(96,96),visiblePixels=new Uint8Array(96*96*4),hiddenPixels=new Uint8Array(96*96*4),previous=renderer.getRenderTarget();
 renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,96,96,visiblePixels);
 sticker.visible=false;renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,96,96,hiddenPixels);sticker.visible=true;
 renderer.setRenderTarget(previous);target.dispose();dirty=true;
 let different=0;for(let n=0;n<visiblePixels.length;n+=4)if(Math.abs(visiblePixels[n]-hiddenPixels[n])+Math.abs(visiblePixels[n+1]-hiddenPixels[n+1])+Math.abs(visiblePixels[n+2]-hiddenPixels[n+2])>12)different++;
 return different;
};
window.__signFixture=()=>({frames,pending:dirty,signs:gallery.diagnostics().streetSigns,shaderFailures:renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length});
</script></body></html>`;
const neutralLandscape=`import * as T from '/vendor/three-0.180.0.mjs';export function createTempleLandscape(scene){scene.background=new T.Color(0x0c1420);scene.add(new T.HemisphereLight(0xd7e4ef,0x756148,2));const light=new T.DirectionalLight(0xffe5c7,2.2);light.position.set(12,25,35);scene.add(light);return{update:()=>false,diagnostics:()=>({qaNeutralLight:true})};}`;
// A checkout-local hook changes only the QA response served by the harness.
// It uses the real camera and body; no production test API is introduced.
const spatialSource=fs.readFileSync(new URL('../../space/gallery-spatial.mjs',import.meta.url),'utf8');
const marker=' return{visit,enter,enterGallery,overview,visitFireplace,visitLevel,invalidate,';
assert(spatialSource.includes(marker),'The spatial QA hook attaches to the current public return');
const spatialWithView=spatialSource.replace(marker,` window.__streetSignView=(position,target)=>{physics.relocateHorizontal({x:position[0],z:position[2]});eye.set(physics.position.x,physics.position.y+HEIGHT,physics.position.z);gaze.set(...target);angles();dirty=true;};\n`+marker);
async function project(pg,point){
 const d=await pg.evaluate(()=>({camera:__totehm_gallery().camera,width:innerWidth,height:innerHeight}));
 const c=new PerspectiveCamera(d.camera.fov,d.camera.aspect,d.camera.near,d.camera.far);c.position.fromArray(d.camera.position);c.lookAt(new Vector3(...d.camera.target));c.updateProjectionMatrix();c.updateMatrixWorld();
 const p=new Vector3(...point).project(c);return{x:(p.x+1)*d.width/2,y:(1-p.y)*d.height/2};
}
async function viewPriority(pg){
 const before=await pg.evaluate(()=>__totehm_gallery().frames);
 const sign=LISBON_STREET_SIGNS.find(s=>s.id==='priority'),normal=new Vector3(Math.sin(sign.rotationY),0,Math.cos(sign.rotationY)),target=new Vector3(...sign.position),approach=target.clone().addScaledVector(normal,2.5);
 approach.y=1.65;
 await pg.evaluate(({position,target})=>__streetSignView(position,target),{position:approach.toArray(),target:target.toArray()});
 await pg.waitForFunction(n=>__totehm_gallery().frames>n,before,{timeout:30000});
 const point=await project(pg,target.clone().addScaledVector(normal,.03).toArray());
 check(point.x>0&&point.x<await pg.evaluate(()=>innerWidth)&&point.y>0&&point.y<await pg.evaluate(()=>innerHeight),'The physical Priority sign is in the visitor viewport');
 await pg.mouse.click(point.x,point.y);
 await pg.waitForFunction(()=>document.getElementById('work-info').dataset.artwork==='priority'&&!document.getElementById('work-info').hidden,null,{timeout:10000});
}
const browser=await launch();
try{
 for(const viewport of (desktopOnly?[{width:1440,height:1000}]:[{width:1440,height:1000},{width:390,height:844}])){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,viewport,session:false,hasTouch:viewport.width<650,network:url=>url.pathname==='/__street_sign_fixture'?{contentType:'text/html',body:fixture}:null});
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});
   await pg.goto(origin+'/__street_sign_fixture');
   await pg.waitForFunction(()=>window.__signFixture?.().signs?.ready&&__signFixture().frames>0&&!__signFixture().pending,null,{timeout:60000});
   for(const sign of screenshotSigns){
    const before=await pg.evaluate(()=>__signFixture().frames);
    await pg.evaluate(id=>__signView(id),sign.id);
    await pg.waitForFunction(n=>__signFixture().frames>n&&!__signFixture().pending,before,{timeout:30000});
    const contribution=await pg.evaluate(id=>__stickerContribution(id),sign.id);
    check(contribution>10,'The '+sign.id+' Higher sticker visibly changes rendered pixels at '+viewport.width);
    await pg.waitForFunction(()=>!__signFixture().pending);
    await pg.screenshot({path:OUT+'/'+viewport.width+'-'+sign.id+'.png'});
   }
   const d=await pg.evaluate(()=>__signFixture());
   check(d.signs.count===22&&d.signs.loaded===23&&d.signs.failed===0,'All twenty-two original sign PNGs and the Higher SVG load at '+viewport.width);
   check(d.shaderFailures===0&&!fatal(log).length,'The native street-sign collection compiles without browser or GPU errors at '+viewport.width);
   check(d.signs.outside===12&&d.signs.inside===10&&d.signs.posts===16,'The full collection spans exterior and interior with sixteen solid street posts at '+viewport.width);
   results.push({kind:'fixture',viewport,diagnostics:d,errors:log.errors});
  }finally{await ctx.close();}
  if(fixtureOnly)continue;
  for(const place of ['lisbon','new-york']){
   const {pg,ctx,log}=await page(browser,{dir:'space',origin,viewport,session:false,hasTouch:viewport.width<650,network:url=>url.pathname==='/gallery-temple-landscape.mjs'?{contentType:'text/javascript',body:neutralLandscape}:url.pathname==='/gallery-spatial.mjs'?{contentType:'text/javascript',body:spatialWithView}:null});
   try{
    await pg.emulateMedia({reducedMotion:'reduce'});
    await pg.goto(origin+(place==='lisbon'?'/lisbon-space':'/new-york'),{waitUntil:'domcontentloaded'});
    await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&!d.fallback&&d.frames>0&&(d.place!=='lisbon'||d.temple?.streetSigns?.ready);},null,{timeout:60000});
    if(place==='lisbon'){
     await viewPriority(pg);
     check((await pg.locator('#work-note').textContent()).includes('Focus on your objectives'),'Clicking the real sign reveals its authored reading at '+viewport.width);
     check(await pg.locator('#enter-experience').getAttribute('aria-label')==='Get Higher'&&await pg.locator('#enter-experience').isEnabled(),'The sign card offers Get Higher at '+viewport.width);
     check(await pg.locator('#work-links a').getAttribute('href')==='/play_lisbon_street'&&await pg.locator('#work-links a').getAttribute('aria-label')==='Higher the Lisbon Streets','The sign card links to Higher the Lisbon Streets at '+viewport.width);
     check(!await pg.locator('body').evaluate(o=>o.classList.contains('station-focused')),'The sign card does not inherit another artwork station layout at '+viewport.width);
     await pg.screenshot({path:OUT+'/'+viewport.width+'-priority-card.png'});
     await pg.click('#close-info');
     check(await pg.locator('#work-info').isHidden()&&await pg.evaluate(()=>__totehm_gallery().selectedSign===null),'Closing the sign card clears its selection at '+viewport.width);
     await viewPriority(pg);
     await pg.click('.tour [data-room="0"]');
     await pg.waitForFunction(()=>__totehm_gallery().focused===0&&!__totehm_gallery().moving,null,{timeout:30000});
     check(await pg.evaluate(()=>__totehm_gallery().selectedSign===null)&&await pg.locator('#work-info').getAttribute('data-artwork')===null,'Choosing the edition table restores the normal artwork state at '+viewport.width);
     await viewPriority(pg);
     await pg.click('#enter-experience');
     await pg.waitForURL(url=>url.pathname==='/get_higher',{timeout:15000});
     check(new URL(pg.url()).pathname==='/get_higher','The sign Get Higher button opens the independent experience at '+viewport.width);
    }else check(await pg.evaluate(()=>__totehm_gallery().temple.streetSigns===null&&__totehm_gallery().selectedSign===null),'New York keeps its scene free of Lisbon sign mounts and selection at '+viewport.width);
    check(!fatal(log).length,'The '+place+' sign interaction check has no JavaScript or GPU errors at '+viewport.width);
    results.push({kind:'application',place,viewport,errors:log.errors});
   }finally{await ctx.close();}
  }
 }
 fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));
 console.log('PASS '+checks+' Lisbon street sign browser checks');
}finally{await browser.close();}
