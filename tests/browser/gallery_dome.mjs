// Real local WebGL. Identity and all public media requests remain intercepted.
// source /workspace/.totehm-cloud/activate.sh; node tests/browser/gallery_dome.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';
import {ORIGINS,TOTEHMPAPER} from '../../space/gallery-artworks.mjs';
import {PerspectiveCamera,Vector3} from '../../space/vendor/three-0.180.0.mjs';

const OUT=process.argv[2]||'/tmp/totehm-production/intention-dome';
fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',results=[];
const com=fs.readFileSync(new URL('../../com/totehm.html',import.meta.url),'utf8');
const intentions=com.match(/const INTS=\[([\s\S]*?)\];/)[1];
const colours=[...intentions.matchAll(/color:'(#[\da-f]+)'/gi)].map(m=>m[1].toLowerCase());
assert.equal(colours.length,7,'the live COM source defines seven intentions');
const browser=await launch();let checks=0;
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const state=pg=>pg.evaluate(()=>window.__totehm_gallery());
async function follow(pg,selector){
 await pg.evaluate(()=>{
  window.__dome_trace=[window.__totehm_gallery().position];
  window.__dome_timer=setInterval(()=>window.__dome_trace.push(window.__totehm_gallery().position),75);
 });
 await pg.click(selector);
 await pg.waitForFunction(()=>!window.__totehm_gallery().moving,null,{timeout:25000});
 return pg.evaluate(()=>{
  clearInterval(window.__dome_timer);
  const samples=[...window.__dome_trace,window.__totehm_gallery().position];
  delete window.__dome_trace;delete window.__dome_timer;
  return {samples,end:window.__totehm_gallery()};
 });
}
async function visibility(pg,hidden){
 await pg.evaluate(h=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>h});document.dispatchEvent(new Event('visibilitychange'));},hidden);
}
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:false,viewport,hasTouch:viewport.width<650});
  const samples={viewport,routes:[]},suffix=' at '+viewport.width;
  try{
   await pg.goto(origin+'/');
   await pg.waitForFunction(()=>window.__totehm_gallery?.().frames>0&&window.__totehm_gallery().collection?.origins.loaded===20,null,{timeout:45000});
   samples.entrance=await state(pg);
   const {dome,collection}=samples.entrance;
   check(samples.entrance.webgl&&!samples.entrance.fallback&&samples.entrance.rooms===3,'three collection groups render in real WebGL'+suffix);
   check(dome.intentions===7&&dome.ribs===7&&dome.branches>=21&&dome.roots===7&&dome.height>10,'abstract tree and dome use branching intention strokes'+suffix);
   check(JSON.stringify(dome.colours.map(c=>c.toLowerCase()))===JSON.stringify(colours)&&dome.stroke<=2,'fine dome strokes use exactly the seven COM colours'+suffix);
   check(samples.entrance.stone.material==='absolute black'&&samples.entrance.stone.wallColor==='#000000'&&samples.entrance.stone.wallThickness>=.8,'thick walls use absolute black without marble veining'+suffix);
   check(collection.paper.framed&&collection.paper.src.endsWith('assets/gallery/totehmpaper.png')&&collection.origins.total===20&&collection.origins.frames===20,'actual framed paper and every Origins work are installed'+suffix);
   check(await pg.locator('#gallery .room').count()===3&&!await pg.locator('#gallery .room#stoner').count(),'THP and Stoner form a single artwork collection'+suffix);
   const paper=await pg.locator('#totehmpaper .artwork img').getAttribute('src');
   check(paper.replace(/^\//,'./')===TOTEHMPAPER.src,'HTML fallback displays the same actual THP'+suffix);
   const posters=await pg.locator('#origins .origins-grid .origin-card').evaluateAll(els=>els.map(e=>({href:e.getAttribute('href'),src:e.querySelector('img')?.getAttribute('src'),title:e.querySelector('img')?.getAttribute('alt')})));
   check(posters.length===20&&ORIGINS.every((work,i)=>posters[i].src.replace(/^\//,'./')===work.src&&Number(new URL(posters[i].href,origin).searchParams.get('work'))===work.index),'all twenty real posters have individually addressed original experiences'+suffix);
   check(await pg.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'entrance fits viewport'+suffix);
   await pg.screenshot({path:OUT+'/entrance-'+viewport.width+'.png'});
   await follow(pg,'#look-sky');
   await pg.screenshot({path:OUT+'/dome-'+viewport.width+'.png'});

   for(const work of [{id:'totehmpaper',href:'/get_higher'},{id:'lisbon',href:'/play_lisbon_street'},{id:'origins',href:'/origins'}]){
    const route=await follow(pg,'.tour a[href="#'+work.id+'"]');samples.routes.push({work:work.id,...route});
    const index=Number(await pg.getAttribute('.tour a[href="#'+work.id+'"]','data-room'));
    check(route.end.room===index&&route.samples.every(([x,z])=>Math.hypot(x,z+3)>=1.18),'guided '+work.id+' visit clears the abstract tree'+suffix);
    check(await pg.locator('#work-links a[href="'+work.href+'"]').count()===1,'original '+work.id+' experience remains accessible'+suffix);
    await pg.screenshot({path:OUT+'/station-'+work.id+'-'+viewport.width+'.png'});
   }
   // Hit an actual lower-row photo on the far wall, not an HTML tour link.
   // Camera and wall coordinates describe the visitor's current gallery view.
   const camera=new PerspectiveCamera(viewport.width<650?76:62,viewport.width/viewport.height,.08,220);
   camera.position.set(0,1.65,3);camera.lookAt(0,3.2,-13);camera.updateMatrixWorld();
   const angle=2.07+4*.185,hit=new Vector3(Math.sin(angle)*12.72,1.55,-3+Math.cos(angle)*12.72).project(camera);
   await pg.mouse.click((hit.x+1)*viewport.width/2,(1-hit.y)*viewport.height/2);
   await pg.waitForFunction(title=>document.querySelector('#work-title').textContent===title&&!__totehm_gallery().moving,ORIGINS[4].title);
   const selectedLinks=await pg.locator('#work-links a').evaluateAll(els=>els.map(e=>e.getAttribute('href')));
   check(selectedLinks.some(h=>h.startsWith('/origins?')&&Number(new URL(h,origin).searchParams.get('work'))===5),'clicking an actual wall photo opens its own title and original chapter'+suffix);
   await pg.screenshot({path:OUT+'/selected-photo-'+viewport.width+'.png'});
   await pg.click('.tour a[href="#totehmpaper"]');await pg.waitForFunction(()=>!__totehm_gallery().moving);
   check(await pg.locator('#work-links a[href="/get_higher"]').count()===1&&await pg.locator('#work-links a[href="/stoner"]').count()===1,'paper artwork retains both its original entry and Stoner method'+suffix);

   const exit=await follow(pg,'#explore-space');samples.exit=exit;
   check(exit.end.journey.outside&&exit.end.position[1]<-20,'exit actually moves the visitor beyond the dome'+suffix);
   // A slow software GPU may render frames on opposite sides of the narrow
   // opening. Check intersections of their traced segments with the door.
   const crossing=[];
   for(let i=1;i<exit.samples.length;i++){
    const [ax,az]=exit.samples[i-1],[bx,bz]=exit.samples[i],z=-15.85;
    if(az>=z&&bz<z)crossing.push(ax+(bx-ax)*(z-az)/(bz-az));
   }
   check(crossing.length>0&&crossing.every(x=>Math.abs(x)<1.5),'guided journey passes through the far portal'+suffix);
   await pg.waitForTimeout(450);samples.outside=await state(pg);
   check(samples.outside.journey.animated&&samples.outside.journey.time>exit.end.journey.time,'surprises animate in the space beyond the gallery'+suffix);
   await pg.screenshot({path:OUT+'/space-first-'+viewport.width+'.png'});
   const beforeWalk=await state(pg);
   await pg.focus('#space');await pg.keyboard.down('w');
   try{await pg.waitForFunction(z=>__totehm_gallery().position[1]<z-.25,beforeWalk.position[1],{timeout:5000});}
   finally{await pg.keyboard.up('w');}
   check(!(await state(pg)).moving,'physical walking works outside and releases cleanly'+suffix);

   await pg.emulateMedia({reducedMotion:'reduce'});
   await pg.waitForFunction(()=>!__totehm_gallery().journey.animated);
   samples.reducedStart=await state(pg);await pg.waitForTimeout(350);samples.reducedEnd=await state(pg);
   check(samples.reducedEnd.journey.time===samples.reducedStart.journey.time&&samples.reducedEnd.sky.time===samples.reducedStart.sky.time,'reduced motion freezes stars and exterior sculpture'+suffix);
   samples.sectors=[];
   for(let i=0;i<7;i++){
    await pg.click('#explore-space');
    await pg.waitForFunction(()=>!__totehm_gallery().moving);
    samples.sectors.push(await state(pg));
   }
   const last=samples.sectors.at(-1),limit=viewport.width<650?3:5;
   check(last.journey.sector>=6&&last.journey.visited>=7&&last.position[1]<-200,'continuing the journey reveals further sectors without an end wall'+suffix);
   check(samples.sectors.every(s=>s.journey.chambers===limit)&&last.journey.rebuilds>samples.outside.journey.rebuilds,'continuous travel recycles a fixed sculpture pool'+suffix);
   check(new Set(samples.sectors.flatMap(s=>s.journey.kinds)).size===4,'the journey reveals four distinct spatial surprises'+suffix);
   await pg.screenshot({path:OUT+'/space-later-'+viewport.width+'.png'});
   await pg.click('#return-dome');await pg.waitForFunction(()=>!__totehm_gallery().moving&&!__totehm_gallery().journey.outside);
   samples.returned=await state(pg);
   check(Math.hypot(samples.returned.position[0],samples.returned.position[1]-8.7)<.04,'distant travel always offers a usable return to the dome'+suffix);
   await pg.emulateMedia({reducedMotion:'no-preference'});
   await pg.waitForFunction(()=>__totehm_gallery().sky.animated);
   await pg.click('#view-list');await pg.waitForFunction(()=>__totehm_gallery().list);
   samples.listStart=await state(pg);await pg.waitForTimeout(400);samples.listEnd=await state(pg);
   check(samples.listEnd.frames===samples.listStart.frames&&samples.listEnd.sky.time===samples.listStart.sky.time&&samples.listEnd.journey.time===samples.listStart.journey.time,'artwork list suspends the entire 3D scene'+suffix);
   await pg.locator('#origins').scrollIntoViewIfNeeded();
   // Exercise native lazy loading by visiting every card, including rows well
   // below the phone viewport; loading them all at entry is not required.
   for(let i=0;i<20;i++){
    const card=pg.locator('#origins .origin-card').nth(i);await card.scrollIntoViewIfNeeded();
    await card.locator('img').evaluate(img=>img.decode());
   }
   check(await pg.locator('#origins .origin-card img').evaluateAll(els=>els.length===20&&els.every(e=>e.complete&&e.naturalWidth>0)),'complete collection remains visible in accessible artwork mode'+suffix);
   await pg.screenshot({path:OUT+'/collection-'+viewport.width+'.png',fullPage:true});
   await pg.click('#view-list');
   await visibility(pg,true);samples.hiddenStart=await state(pg);await pg.waitForTimeout(350);samples.hiddenEnd=await state(pg);
   check(samples.hiddenEnd.frames===samples.hiddenStart.frames&&samples.hiddenEnd.sky.time===samples.hiddenStart.sky.time,'hidden document pauses the world'+suffix);
   await visibility(pg,false);
   await pg.waitForFunction(n=>__totehm_gallery().frames>n,samples.hiddenEnd.frames);
   check(!log.errors.some(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e)),'no application or WebGL shader errors'+suffix+': '+log.errors.join(' | '));
   results.push({viewport,samples,log});
  }catch(error){
   samples.failed=await state(pg).catch(()=>null);
   await pg.screenshot({path:OUT+'/failure-'+viewport.width+'.png'}).catch(()=>{});
   results.push({viewport,samples,log,error:String(error)});throw error;
  }finally{fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await ctx.close();}
 }
 console.log('PASS '+checks+' intention dome checks; screenshots '+OUT);
}finally{await browser.close();}
