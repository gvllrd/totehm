// Real gallery pointer and standalone Discover checks; only the distant sea is neutralized.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {OPPOSITES} from '../../space/gallery-opposites.mjs';
import {launch,page} from './harness.mjs';

const origin='https://www.totehm.space',out=process.argv[2]||'/tmp/new-york-opposites';
fs.mkdirSync(out,{recursive:true});
const neutralLandscape=`import * as T from '/vendor/three-0.180.0.mjs';export function createTempleLandscape(scene){scene.background=new T.Color(0x0c1420);scene.add(new T.HemisphereLight(0xd7e4ef,0x756148,2));const light=new T.DirectionalLight(0xffe5c7,2.2);light.position.set(12,25,35);scene.add(light);return{update:()=>false,diagnostics:()=>({qaNeutralLight:true})};}`;
let checks=0;const check=(condition,message)=>{assert(condition,message);console.log('PASS '+message);checks++;};
const browser=await launch();
try{
 const venue=await page(browser,{dir:'space',origin,session:false,viewport:{width:1440,height:1000},network:url=>url.pathname==='/gallery-temple-landscape.mjs'?{contentType:'text/javascript',body:neutralLandscape}:null});
 try{
  const {pg,log}=venue;
  await pg.emulateMedia({reducedMotion:'no-preference'});
  await pg.goto(origin+'/new-york',{waitUntil:'domcontentloaded'});
  await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&d.projection?.ready&&d.frames>0;},null,{timeout:60000});
  const before=await pg.evaluate(()=>__totehm_gallery());
  assert.deepEqual(before.projection.ids,OPPOSITES.map(work=>work.id));
  check(before.projection.independentWorks&&!before.projection.blackPanel,'The six original works hang separately in New York');
  await pg.screenshot({path:out+'/suspended-artworks.png'});
  for(const work of OPPOSITES){
   const pose=(await pg.evaluate(()=>__totehm_gallery())).projection.poses.find(({id})=>id===work.id);
   check(pose&&pose.x>0&&pose.x<1440&&pose.y>0&&pose.y<1000,work.title+' is in the arrival view');
   await pg.mouse.click(pose.x,pose.y);
   await pg.waitForFunction(()=>window.__totehm_projection_expansion?.().stage==='experience',null,{timeout:25000});
   const reader=pg.frames().find(frame=>new URL(frame.url()).pathname==='/think_same_but_opposite');
   assert(reader);
   assert.equal(new URL(reader.url()).searchParams.get('work'),work.id);
   await reader.waitForFunction(id=>__totehm_opposites().phase==='artwork'&&__totehm_opposites().work===id,work.id);
   check(await reader.locator('#artwork-hero-image').isVisible()&&await reader.locator('#artwork-hero-image').getAttribute('src')===work.image&&await reader.locator('#discover-stage').isHidden(),work.title+' first lifts into its original fullscreen artwork');
   check(await pg.evaluate(()=>__totehm_projection_expansion().type==='artwork'&&__totehm_projection_expansion().documentReloads===0),work.title+' stays in the gallery handoff');
   const heroFrame=reader.locator('#artwork-hero-frame');
   const large=await heroFrame.boundingBox();
   check(large&&await heroFrame.evaluate(frame=>frame.getBoundingClientRect().width>frame.firstElementChild.getBoundingClientRect().width),work.title+' retains its physical frame');
   await pg.mouse.wheel(0,600);
   await reader.waitForFunction(()=>__totehm_opposites().phase==='discover'&&__totehm_opposites().step===0);
   check((await reader.locator('#slide').innerText()).includes(work.slides[0][0]),work.title+' opens its original Discover on scroll');
   const small=await reader.locator('#discover-artwork-frame').boundingBox();
   check(small&&small.height<large.height*.4&&await reader.locator('#discover-artwork-image').getAttribute('src')===work.image,work.title+' keeps a smaller framed artwork in Discover');
   check(await reader.locator('.eyebrow').count()===0,'The prior artwork title is not repeated above the slides');
   await reader.locator('#close').click();
   await reader.waitForFunction(()=>__totehm_opposites().phase==='returning');
   await reader.waitForFunction(()=>__totehm_opposites().phase==='artwork');
   await reader.locator('header a[data-experience-close]').click();
   await pg.waitForFunction(()=>{const d=__totehm_projection_expansion();return d.stage==='returning'&&d.overlays===1&&d.progress<1;});
   await pg.waitForFunction(()=>__totehm_projection_expansion().stage==='closed');
   const restored=await pg.evaluate(()=>__totehm_gallery());
   assert.deepEqual(restored.camera.position,before.camera.position);
   check(!restored.projection.handoff&&restored.projection.beamVisible,'Gallery Back restores the same six artworks');
  }
  check(await pg.evaluate(()=>{const d=__totehm_gallery().liberty;return d&&!d.crashingWaveFoam&&d.seaSprayParticles===0;}),'Liberty has no local foam or spray effects');
  check(log.errors.filter(e=>e.startsWith('pageerror:')).length===0,'The gallery runs without JavaScript errors');
 }finally{await venue.ctx.close();}
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const p=await page(browser,{dir:'space',origin,session:false,viewport,hasTouch:false});
  try{
   const {pg,log}=p;
  const bounds=[];
   await pg.emulateMedia({reducedMotion:'reduce'});
   for(const work of OPPOSITES){
    await pg.goto(origin+'/think_same_but_opposite?work='+work.id,{waitUntil:'domcontentloaded'});
    await pg.waitForFunction(()=>window.__totehm_experience_front?.().ready);
    check(await pg.locator('#artwork-hero-image').evaluate(img=>img.complete&&img.naturalWidth===200),work.title+' original loads at '+viewport.width);
    await pg.getByRole('button',{name:'Discover',exact:true}).click();
    await pg.waitForFunction(id=>__totehm_opposites().phase==='discover'&&__totehm_opposites().work===id,work.id);
    check(await pg.locator('#artwork-hero').isHidden()&&await pg.evaluate(()=>getComputedStyle(document.body).backgroundColor==='rgb(0, 0, 0)'),work.title+' opens a full-screen black reading stage');
    check((await pg.locator('#slide').innerText()).includes(work.slides[0][0]),work.title+' starts with its own comparison');
    if(viewport.width<650)bounds.push(await pg.evaluate(()=>({work:__totehm_opposites().work,step:0,slide:document.getElementById('slide').getBoundingClientRect().bottom,actions:document.querySelector('.actions').getBoundingClientRect().bottom})));
    for(let i=1;i<work.slides.length;i++){
     if(i===1)await pg.mouse.wheel(0,600);else await pg.keyboard.press('ArrowDown');
     await pg.waitForFunction(step=>__totehm_opposites().step===step,i);
     if(viewport.width<650)bounds.push(await pg.evaluate(()=>({work:__totehm_opposites().work,step:__totehm_opposites().step,slide:document.getElementById('slide').getBoundingClientRect().bottom,actions:document.querySelector('.actions').getBoundingClientRect().bottom})));
     if(work.id==='totehm'&&i===3)check((await pg.locator('#slide').innerText()).includes('TOTEHM'),'The original Discover copy keeps the TOTEHM wording');
     if(work.id==='get-higher'&&i===2&&viewport.width<650)await pg.screenshot({path:out+'/discover-get-higher-390.png'});
    }
    check(await pg.locator('#action').isVisible()&&await pg.locator('#action').getAttribute('href')===work.href,work.title+' leads to its actual offer');
    const following=OPPOSITES[(OPPOSITES.indexOf(work)+1)%OPPOSITES.length];
    check(await pg.locator('#next-work').isVisible()&&await pg.locator('#next-work').getAttribute('href')==='/think_same_but_opposite?work='+following.id,work.title+' leads to the next artwork');
    if(work.id==='higher'){
     await pg.keyboard.press('ArrowLeft');await pg.waitForFunction(()=>__totehm_opposites().step===3);
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
