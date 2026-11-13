// Historical facade/source-object fixtures only. The current native Lisbon
// route, pointer actions and world player are covered by gallery_lisbon_black_dome.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LISBON_STREET_SIGNS} from '../../space/gallery-lisbon-signs-layout.mjs';
import {launch,page} from './harness.mjs';

const OUT=process.argv[2]||'/tmp/lisbon-street-signs',origin='https://www.totehm.space';
const desktopOnly=process.argv.includes('--desktop-only');
fs.mkdirSync(OUT,{recursive:true});
let checks=0;const results=[];
const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
const canonicalIds=['fire_exit','Heli','aed','green_walk','red_walk','pharma','destination','lisboa_city_hall','speed_bump_caution','crosswalk_caution','no_entry','no_parking','hospital','parking','Hotel','dead_end','roundabout','left_or_straight','no_uturn','priority','crosswalk','stop'];
assert.deepEqual(LISBON_STREET_SIGNS.map(s=>s.id).sort(),canonicalIds.slice().sort());
const screenshotIds=['priority','Heli','crosswalk','Hotel','green_walk','destination','lisboa_city_hall','pharma'];
const screenshotSigns=screenshotIds.map(id=>LISBON_STREET_SIGNS.find(sign=>sign.id===id));
const animationClip=fs.readFileSync(new URL('../../space/assets/slides/init.mp4',import.meta.url));
const fatal=log=>log.errors.filter(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e));
const fixture=`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;background:#0c1420}canvas{display:block}</style></head><body><script type="module">
import * as T from '/vendor/three-0.180.0.mjs';
import {createCastleSpace} from '/gallery-castle-space.mjs';
const createModernGallery=(scene,renderer,options)=>createCastleSpace(scene,renderer,{...options,place:'lisbon',style:'azulejo'});
import {LISBON_STREET_SIGNS} from '/gallery-lisbon-signs-layout.mjs';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x0c1420);scene.add(new T.HemisphereLight(0xd7e4ef,0x756148,2));
const lamp=new T.DirectionalLight(0xffe5c7,2.2);lamp.position.set(12,25,35);scene.add(lamp);
const camera=new T.PerspectiveCamera(48,innerWidth/innerHeight,.08,100);let dirty=true,frames=0;
const gallery=createModernGallery(scene,renderer,{mobile:innerWidth<650,onChange:()=>{dirty=true;}});
window.__signView=id=>{const sign=LISBON_STREET_SIGNS.find(s=>s.id===id),normal=new T.Vector3(Math.sin(sign.rotationY),0,Math.cos(sign.rotationY)),target=new T.Vector3(...sign.position),ground=sign.presentation.startsWith('ground-');if(ground){camera.position.copy(target).add(new T.Vector3(0,Math.max(5,sign.width*(innerWidth<650?2.7:1.35)),Math.max(2,sign.width*.5)));}else{camera.position.copy(target).addScaledVector(normal,Math.max(innerWidth<650?2.5:2.2,sign.width*(innerWidth<650?2.7:1.5)));camera.position.y+=.12;}camera.lookAt(target);camera.updateProjectionMatrix();dirty=true;};
__signView('priority');
renderer.setAnimationLoop(()=>{if(!dirty)return;dirty=false;gallery.update(0,camera.position,false);renderer.render(scene,camera);frames++;});
window.__stickerContribution=id=>{
 let group;gallery.root.traverse(object=>{if(object.userData.lisbonStreetSign&&object.userData.signId===id)group=object;});
 const sticker=group.getObjectByName('Higher sticker — '+id);
 const target=new T.WebGLRenderTarget(256,256),visiblePixels=new Uint8Array(256*256*4),hiddenPixels=new Uint8Array(256*256*4),previous=renderer.getRenderTarget();
 renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,256,256,visiblePixels);
 sticker.visible=false;renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,256,256,hiddenPixels);sticker.visible=true;
 renderer.setRenderTarget(previous);target.dispose();dirty=true;
 let different=0;for(let n=0;n<visiblePixels.length;n+=4)if(Math.abs(visiblePixels[n]-hiddenPixels[n])+Math.abs(visiblePixels[n+1]-hiddenPixels[n+1])+Math.abs(visiblePixels[n+2]-hiddenPixels[n+2])>12)different++;
 return different;
};
window.__signFixture=()=>({frames,pending:dirty,signs:gallery.diagnostics().streetSigns,shaderFailures:renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length});
</script></body></html>`;
const browser=await launch();
try{
 for(const viewport of (desktopOnly?[{width:1440,height:1000}]:[{width:1440,height:1000},{width:390,height:844}])){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,viewport,session:false,hasTouch:viewport.width<650,network:url=>url.pathname==='/__street_sign_fixture'?{contentType:'text/html',body:fixture}:null});
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});
   await pg.goto(origin+'/__street_sign_fixture');
   await pg.waitForFunction(()=>window.__signFixture?.().signs?.ready&&__signFixture().frames>0&&!__signFixture().pending,null,{timeout:60000});
   for(const sign of screenshotSigns.filter(sign=>viewport.width>=650||['priority','Heli','green_walk','pharma'].includes(sign.id))){
    const before=await pg.evaluate(()=>__signFixture().frames);
    await pg.evaluate(id=>__signView(id),sign.id);
    await pg.waitForFunction(n=>__signFixture().frames>n&&!__signFixture().pending,before,{timeout:30000});
    const contribution=await pg.evaluate(id=>__stickerContribution(id),sign.id);
    check(contribution>2,'The smaller '+sign.id+' Higher sticker still visibly changes rendered pixels at '+viewport.width);
    await pg.waitForFunction(()=>!__signFixture().pending);
    await pg.screenshot({path:OUT+'/'+viewport.width+'-'+sign.id+'.png'});
   }
   const d=await pg.evaluate(()=>__signFixture());
   check(d.signs.count===22&&d.signs.loaded===23&&d.signs.failed===0,'All twenty-two original sign PNGs and the Higher SVG load at '+viewport.width);
   check(d.shaderFailures===0&&!fatal(log).length,'The native street-sign collection compiles without browser or GPU errors at '+viewport.width);
   check(d.signs.semanticObjects&&d.signs.pharmacyAnimated&&d.signs.pedestrianPair,'The street objects include a luminous pharmacy and one paired pedestrian signal at '+viewport.width);
   results.push({kind:'fixture',viewport,diagnostics:d,errors:log.errors});
  }finally{await ctx.close();}

 }
 fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));
 console.log('PASS '+checks+' Lisbon street sign browser checks');
}finally{await browser.close();}
