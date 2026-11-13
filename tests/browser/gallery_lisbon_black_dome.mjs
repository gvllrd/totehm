import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PerspectiveCamera,Vector3} from '../../space/vendor/three-0.180.0.mjs';
import {LISBON_DOME_SIGNS} from '../../space/gallery-lisbon-dome-layout.mjs';
import {launch,page} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/lisbon-black-dome',origin='https://www.totehm.space';fs.mkdirSync(OUT,{recursive:true});
let checks=0;const results=[];const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
const clip=fs.readFileSync(process.env.STREET_VIDEO_FIXTURE||new URL('../../space/assets/slides/init.mp4',import.meta.url));
const neutral=`import * as T from '/vendor/three-0.180.0.mjs';export function createTempleLandscape(scene,renderer){scene.background=new T.Color(0x0b111a);scene.add(new T.HemisphereLight(0xdbe6f0,0x14171c,1.6));const moon=new T.DirectionalLight(0xd8e7ff,2.4);moon.position.set(-20,30,20);scene.add(moon);const pixels=new Uint8Array(256*128*4);for(let y=0;y<128;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,k=10+85*Math.exp(-Math.pow((y/128-.45)*9,2));pixels[i]=k;pixels[i+1]=k;pixels[i+2]=k;pixels[i+3]=255;}const map=new T.DataTexture(pixels,256,128,T.RGBAFormat);map.mapping=T.EquirectangularReflectionMapping;map.colorSpace=T.SRGBColorSpace;map.needsUpdate=true;const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(map).texture;map.dispose();pmrem.dispose();return{update:()=>false,diagnostics:()=>({qaNeutralLight:true})};}`;
const source=fs.readFileSync(new URL('../../space/gallery-spatial.mjs',import.meta.url),'utf8'),marker=' return{visit,enter,enterGallery,overview,visitFireplace,visitLevel,invalidate,';
assert(source.includes(marker));
const hooked=source.replace(marker," window.__domeView=(position,target)=>{physics.relocateHorizontal({x:position[0],z:position[2]});eye.set(physics.position.x,physics.position.y+HEIGHT,physics.position.z);gaze.set(...target);angles();dirty=true;};\n"+marker);
async function view(pg,position,target,name){const frames=await pg.evaluate(()=>__totehm_gallery().frames);await pg.evaluate(({position,target})=>__domeView(position,target),{position,target});await pg.waitForFunction(n=>__totehm_gallery().frames>n,frames);await pg.screenshot({path:OUT+'/'+name+'.png',timeout:60000});}
async function project(pg,point){const d=await pg.evaluate(()=>({camera:__totehm_gallery().camera,w:innerWidth,h:innerHeight}));const c=new PerspectiveCamera(d.camera.fov,d.camera.aspect,d.camera.near,d.camera.far);c.position.fromArray(d.camera.position);c.lookAt(new Vector3(...d.camera.target));c.updateProjectionMatrix();c.updateMatrixWorld();const p=new Vector3(...point).project(c);return{x:(p.x+1)*d.w/2,y:(1-p.y)*d.h/2};}
const browser=await launch();
try{
 for(const viewport of (process.argv.includes('--mobile-only')?[{width:390,height:844}]:process.argv.includes('--desktop-only')?[{width:1440,height:1000}]:[{width:1440,height:1000},{width:390,height:844}])){
  const requests=[];let failNext=false;
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,viewport,hasTouch:viewport.width<650,session:false,network:url=>{
   if(url.pathname==='/gallery-temple-landscape.mjs')return{contentType:'text/javascript',body:neutral};
   if(url.pathname==='/gallery-spatial.mjs')return{contentType:'text/javascript',body:hooked};
   if(url.pathname.startsWith('/storage/v1/object/public/play-signals/')){requests.push(url.pathname);if(failNext){failNext=false;return{status:404,headers:{'Access-Control-Allow-Origin':'*'},body:''};}return{contentType:'video/mp4',headers:{'Access-Control-Allow-Origin':'*'},body:clip};}
   return null;
  }});
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/lisbon-space',{waitUntil:'domcontentloaded'});
   await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&!d.fallback&&d.frames>0&&d.temple?.streetSigns?.ready;},null,{timeout:60000});
   const d=await pg.evaluate(()=>__totehm_gallery());
   check(d.temple.kind==='lisbon-black-higher-dome'&&d.temple.blackInterior&&d.temple.blackExterior,'The real Lisbon page renders the black dome at '+viewport.width);
   check(d.temple.intentions.length===7&&d.temple.thpCounter.packagedPapers===6&&d.temple.thpCounter.caseWidthMetres===.12,'The seven intentions and smaller premium cases are present at '+viewport.width);
   check(d.temple.streetSigns.count===22&&requests.length===0,'All 22 signs load without starting any video decoder at '+viewport.width);
   await pg.screenshot({path:OUT+'/'+viewport.width+'-entry.png',timeout:60000});
   await view(pg,[0,1.65,1.6],[0,3,-5],viewport.width+'-laboratory');
   await view(pg,[3.2,1.65,-.8],[4.4,1.3,-3.5],viewport.width+'-laboratory-glass');
   await pg.locator('.tour [data-room="0"]').click();await pg.waitForFunction(()=>{const d=__totehm_gallery();return d.focused===0&&d.temple.thpCounter.inspection===1;},null,{timeout:30000});
   check(await pg.locator('#enter-experience').isEnabled(),'A visitor physically reaches and inspects the same small THP case at '+viewport.width);
   await pg.screenshot({path:OUT+'/'+viewport.width+'-paper-inspection.png',timeout:60000});
   await pg.locator('#close-info').click();
   const sign=LISBON_DOME_SIGNS.find(s=>s.id==='priority'),normal=new Vector3(...sign.normal);normal.y=0;normal.normalize();
   await view(pg,[sign.position[0]+normal.x*4,1.65,sign.position[2]+normal.z*4],sign.position,viewport.width+'-priority');
   const point=await project(pg,sign.position);await pg.mouse.click(point.x,point.y);
   await pg.waitForFunction(()=>{const d=__totehm_gallery();return d.activeSign==='priority'&&d.stations.play.playing&&d.stations.play.videoFrames>0;},null,{timeout:20000});
   check(new URL(pg.url()).pathname==='/lisbon-space','Clicking the physical sticker starts its original film inside the same world at '+viewport.width);
   check(await pg.locator('.street-get-higher').getAttribute('href')==='/get_higher','The world performance offers Get Higher to get it at '+viewport.width);
   check(requests.at(-1).endsWith('/priority.mp4'),'The exact matching clip is requested at '+viewport.width);
   await pg.screenshot({path:OUT+'/'+viewport.width+'-world-animation.png',timeout:60000});
   await pg.locator('#close-info').click();check(!(await pg.evaluate(()=>__totehm_gallery().stations.play.playing)),'Closing the work stops its decoder at '+viewport.width);
   await pg.locator('#view-list').click();await pg.locator('.street-sign-links a[href*="sign=stop&"]').click();
   await pg.waitForFunction(()=>__totehm_gallery().stations.play.playing&&__totehm_gallery().activeSign==='stop');
   check(!(await pg.evaluate(()=>__totehm_gallery().list)),'The visible accessible sign list returns to the same world and starts its work at '+viewport.width);
   await pg.evaluate(()=>window.dispatchEvent(new Event('blur')));
   check(!(await pg.evaluate(()=>__totehm_gallery().stations.play.playing)),'Losing focus pauses the world video decoder at '+viewport.width);
   await pg.evaluate(()=>window.dispatchEvent(new Event('focus')));await pg.locator('#close-info').click();
   await pg.locator('.tour [data-room="2"]').click();await pg.waitForFunction(()=>__totehm_gallery().focused===2);await pg.locator('#enter-experience').click();
   await pg.waitForFunction(()=>__totehm_gallery().stations.play.playing&&__totehm_gallery().activeSign==='stop');
   const framing=await pg.evaluate(()=>{const d=__totehm_gallery();return{eye:d.camera.position,target:d.camera.target,projection:d.stations.play.projection};});
   check(new Vector3(...framing.target).distanceTo(new Vector3(...framing.projection))<.001&&new Vector3(...framing.eye).distanceTo(new Vector3(...framing.projection))>2.8,'The menu also frames the complete world artwork from a reachable viewpoint at '+viewport.width);await pg.locator('#close-info').click();
   failNext=true;await pg.evaluate(()=>document.querySelector('.street-sign-links a[href*="sign=pharma&"]').click());
   await pg.waitForFunction(()=>__totehm_gallery().stations.play.state==='error');
   check(await pg.locator('#enter-experience').isEnabled()&&await pg.locator('.street-get-higher').isVisible(),'A failed media request leaves Retry, Get Higher and the full experience available at '+viewport.width);
   await pg.locator('#enter-experience').click();await pg.waitForFunction(()=>__totehm_gallery().stations.play.playing);
   check((await pg.evaluate(()=>__totehm_gallery().stations.play.mediaSource)).endsWith('/pharma.mp4'),'Retry recovers the same original work at '+viewport.width);await pg.locator('#close-info').click();
   if(viewport.width>650){
    for(const cue of LISBON_DOME_SIGNS){
     await pg.evaluate(id=>document.querySelector('.street-sign-links a[href*="sign='+id+'&"]').click(),cue.id);
     await pg.waitForFunction(id=>{const d=__totehm_gallery();return d.activeSign===id&&d.stations.play.id===id&&d.stations.play.playing;},cue.id,{timeout:15000});
     check(requests.at(-1).endsWith('/'+cue.id+'.mp4'),'The accessible '+cue.id+' control selects its respective world animation');
     await pg.waitForFunction(approach=>{const p=__totehm_gallery().camera.position;return Math.hypot(p[0]-approach[0],p[2]-approach[2])<.02;},cue.approach);
     const view=await pg.evaluate(()=>{const d=__totehm_gallery();return{target:d.camera.target,projection:d.stations.play.projection};});
     check(new Vector3(...view.target).distanceTo(new Vector3(...view.projection))<.001,'The '+cue.id+' film is centred from its own reachable viewpoint');
    }
    await pg.locator('#close-info').click();
   }
   check(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'The real interface fits the viewport at '+viewport.width);
   const fatal=log.errors.filter(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e));
   check(fatal.length===0,'Architecture, original film shader and interactions have no JavaScript/GPU error at '+viewport.width);
   results.push({viewport,requests,diagnostics:await pg.evaluate(()=>__totehm_gallery()),errors:log.errors});
  }catch(error){console.error(JSON.stringify(log.errors));throw error;}finally{await ctx.close();}
 }
}finally{await browser.close();}
fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));console.log('PASS '+checks+' Lisbon dome browser checks');
