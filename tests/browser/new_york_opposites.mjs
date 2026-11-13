// Real gallery pointer and standalone Discover checks; only the distant sea is neutralized.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PerspectiveCamera,Vector3} from '../../space/vendor/three-0.180.0.mjs';
import {OPPOSITES} from '../../space/gallery-opposites.mjs';
import {launch,page} from './harness.mjs';

const origin='https://www.totehm.space',out=process.argv[2]||'/tmp/new-york-opposites';
fs.mkdirSync(out,{recursive:true});
const neutralLandscape=`import * as T from '/vendor/three-0.180.0.mjs';export function createTempleLandscape(scene){scene.background=new T.Color(0x0c1420);scene.add(new T.HemisphereLight(0xd7e4ef,0x756148,2));const light=new T.DirectionalLight(0xffe5c7,2.2);light.position.set(12,25,35);scene.add(light);return{update:()=>false,diagnostics:()=>({qaNeutralLight:true})};}`;
const spatialSource=fs.readFileSync(new URL('../../space/gallery-spatial.mjs',import.meta.url),'utf8');
const marker=' return{visit,enter,enterGallery,overview,visitFireplace,visitLevel,invalidate,';
assert(spatialSource.includes(marker));
const hookedSpatial=spatialSource.replace(marker,` window.__oppositeView=(position,target)=>{physics.relocateHorizontal({x:position[0],z:position[2]});eye.set(physics.position.x,physics.position.y+HEIGHT,physics.position.z);gaze.set(...target);angles();dirty=true;};\n`+marker);
function project(d,point){
 const camera=new PerspectiveCamera(d.camera.fov,d.camera.aspect,d.camera.near,d.camera.far);
 camera.position.fromArray(d.camera.position);camera.lookAt(new Vector3(...d.camera.target));camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const p=new Vector3(...point).project(camera);return{x:(p.x+1)*d.render.width/2,y:(1-p.y)*d.render.height/2};
}
let checks=0;const check=(condition,message)=>{assert(condition,message);console.log('PASS '+message);checks++;};
const browser=await launch();
try{
 const venue=await page(browser,{dir:'space',origin,session:false,viewport:{width:1440,height:1000},network:url=>url.pathname==='/gallery-temple-landscape.mjs'?{contentType:'text/javascript',body:neutralLandscape}:url.pathname==='/gallery-spatial.mjs'?{contentType:'text/javascript',body:hookedSpatial}:null});
 try{
  const {pg,log}=venue;
  await pg.emulateMedia({reducedMotion:'reduce'});
  await pg.goto(origin+'/new-york',{waitUntil:'domcontentloaded'});
  await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&d.temple?.opposites?.count===6&&d.frames>0;},null,{timeout:60000});
  check(await pg.locator('.opposites-list-grid a').count()===6,'Six accessible links accompany the wall');
  const before=await pg.evaluate(()=>__totehm_gallery().frames);
  await pg.evaluate(()=>__oppositeView([0,1.65,-2.65],[0,2.75,-8.742]));
  await pg.waitForFunction(n=>__totehm_gallery().frames>n,before);
  await pg.screenshot({path:out+'/wall-desktop.png'});
  const d=await pg.evaluate(()=>__totehm_gallery());
  check(d.temple.opposites.whiteWall&&d.temple.opposites.ids.join(',')===OPPOSITES.map(w=>w.id).join(','),'The six original images occupy the New York wall in order');
  const left=project(d,[-6.48,2.75,-8.742]),right=project(d,[6.48,2.75,-8.742]);
  check(left.x>0&&right.x<1440,'All six frames fit in the entrance view');
  const border=project(d,[-1.11,4.35,-8.742]);
  check(border.x>0&&border.x<1440&&border.y>0&&border.y<1000,'A framed artwork is in the camera view');
  await pg.mouse.click(border.x,border.y);
  await pg.waitForURL(url=>url.pathname==='/think_same_but_opposite'&&url.searchParams.get('work')==='get-higher',{timeout:15000});
  check(await pg.locator('#image').evaluate(img=>img.naturalWidth===200),'Clicking the physical image opens its Discover and loads the original art');
  check(log.errors.filter(e=>e.startsWith('pageerror:')).length===0,'The gallery runs without JavaScript errors');
 }finally{await venue.ctx.close();}
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const p=await page(browser,{dir:'space',origin,session:false,viewport,hasTouch:viewport.width<650});
  try{
   const {pg,log}=p;
  const bounds=[];
   await pg.emulateMedia({reducedMotion:'reduce'});
   for(const work of OPPOSITES){
    await pg.goto(origin+'/think_same_but_opposite?work='+work.id,{waitUntil:'domcontentloaded'});
    await pg.waitForFunction(()=>window.__totehm_opposites?.().count===5);
    check(await pg.locator('#image').evaluate(img=>img.complete&&img.naturalWidth===200),work.title+' image loads at '+viewport.width);
    check((await pg.locator('#slide').innerText()).includes(work.slides[0][0]),work.title+' starts with its own comparison');
    if(viewport.width<650)bounds.push(await pg.evaluate(()=>({work:__totehm_opposites().work,step:0,slide:document.getElementById('slide').getBoundingClientRect().bottom,actions:document.querySelector('.actions').getBoundingClientRect().bottom})));
    for(let i=1;i<work.slides.length;i++){
     await pg.locator('#next').click();
     await pg.waitForFunction(step=>__totehm_opposites().step===step,i);
     if(viewport.width<650)bounds.push(await pg.evaluate(()=>({work:__totehm_opposites().work,step:__totehm_opposites().step,slide:document.getElementById('slide').getBoundingClientRect().bottom,actions:document.querySelector('.actions').getBoundingClientRect().bottom})));
     if(work.id==='totehm'&&i===3&&viewport.width>650){await pg.waitForSelector('#slide .tw');check(true,'The TOTEHM word keeps its native brand piece in Discover');}
     if(work.id==='get-higher'&&i===2&&viewport.width<650)await pg.screenshot({path:out+'/discover-get-higher-390.png'});
    }
    check(await pg.locator('#action').isVisible()&&await pg.locator('#action').getAttribute('href')===work.href,work.title+' leads to its actual offer');
    const following=OPPOSITES[(OPPOSITES.indexOf(work)+1)%OPPOSITES.length];
    check(await pg.locator('#next-work').isVisible()&&await pg.locator('#next-work').getAttribute('href')==='/think_same_but_opposite?work='+following.id,work.title+' leads to the next artwork');
    if(work.id==='higher'){
     await pg.locator('#prev').focus();await pg.keyboard.press('ArrowLeft');await pg.waitForFunction(()=>__totehm_opposites().step===3);
     await pg.keyboard.press('ArrowRight');await pg.waitForFunction(()=>__totehm_opposites().step===4);
     check(true,'Arrow keys advance the story while a control has focus');
    }
    if(work.id==='higher')await pg.screenshot({path:out+'/discover-'+viewport.width+'.png'});
   }
   if(viewport.width<650)check(bounds.every(item=>item.actions<viewport.height&&item.slide<viewport.height),'All thirty mobile story screens remain fully in view: '+JSON.stringify(bounds.filter(item=>item.actions>=viewport.height||item.slide>=viewport.height)));
   check(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Discover fits the '+viewport.width+' viewport');
   check(log.errors.filter(e=>e.startsWith('pageerror:')).length===0,'Discover has no JavaScript errors at '+viewport.width);
  }finally{await p.ctx.close();}
 }
 console.log('PASS '+checks+' New York opposites browser checks');
}finally{await browser.close();}
