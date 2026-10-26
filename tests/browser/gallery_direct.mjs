// Current Space entrance: real WebGL, local files, mocked services, no live writes.
import assert from 'node:assert/strict';import fs from 'node:fs';
import {PerspectiveCamera,Vector3} from '../../space/vendor/three-0.180.0.mjs';
import {launch,page} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/gallery-direct',origin='https://www.totehm.space';fs.mkdirSync(OUT,{recursive:true});
const browser=await launch();let checks=0;const results=[];
const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
const fatal=log=>log.errors.filter(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e));
async function project(pg,point){const d=await pg.evaluate(()=>({camera:__totehm_gallery().camera,width:innerWidth,height:innerHeight}));const c=new PerspectiveCamera(d.camera.fov,d.camera.aspect,d.camera.near,d.camera.far);c.position.fromArray(d.camera.position);c.lookAt(new Vector3(...d.camera.target));c.updateProjectionMatrix();c.updateMatrixWorld();const p=new Vector3(...point).project(c);return{x:(p.x+1)*d.width/2,y:(1-p.y)*d.height/2};}
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const requests=[],sample={viewport};results.push(sample);
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,viewport,session:false,hasTouch:viewport.width<650,deviceScaleFactor:viewport.width<650?3:1,network:url=>{requests.push(url.pathname);return null;}});
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});
   await pg.addInitScript(()=>{window.__directVideoCreated=0;const create=document.createElement;document.createElement=function(name,...args){if(String(name).toLowerCase()==='video')__directVideoCreated++;return Reflect.apply(create,this,[name,...args]);};});
   await pg.goto(origin+'/',{waitUntil:'domcontentloaded'});
   await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&d.frames>0&&d.temple?.stone?.compiled&&d.temple.flooring.ancientStone.photographicMapsReady&&d.temple.flooring.ancientStone.stone.compiled&&d.temple.facade.paperLoaded&&d.landscape.skyLoaded&&d.stations.play.coverReady&&d.stations.opposite.coverReady;},null,{timeout:90000});
   sample.entry=await pg.evaluate(()=>__totehm_gallery());
   check(!sample.entry.fallback&&sample.entry.experiences.includes('/same_but_opposite'),'current gallery renders WebGL and registers the new artwork at '+viewport.width);
   check(await pg.locator('#member-menu,.panorama-nav,.welcome,.guide,.controls,#jump,#look-sky,#look-sea,#look-horizon,#visit-fireplace,#toggle-sound').count()===0,'removed HUD, member menu and welcome title are absent at '+viewport.width);
   check(await pg.locator('header').innerText().then(t=>!t.toLowerCase().includes('totehm.space')),'top-right site title is removed at '+viewport.width);
   check(await pg.locator('#member').isVisible()&&await pg.locator('#member').textContent()==='CONNECT WITH MY TOTEHM','TOTEHM remains the sole connection entry at '+viewport.width);
   check(await pg.locator('.market-nav a[href="/market"]').isVisible()&&await pg.locator('.market-nav a[href="/market?tab=mine"]').isVisible(),'market and personal collection routes remain visible at '+viewport.width);
   check(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'entrance has no horizontal overflow at '+viewport.width);
   await pg.screenshot({path:OUT+'/entry-'+viewport.width+'.png'});
   await pg.click('#view-list');await pg.waitForFunction(()=>__totehm_gallery().list);
   check(await pg.locator('#same-but-opposite .artwork[href="/same_but_opposite"]').isVisible()&&await pg.locator('#lisbon .artwork[href="/play_lisbon_street"]').isVisible(),'artwork list exposes both independent screens at '+viewport.width);
   check(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'artwork list has no horizontal overflow at '+viewport.width);
   await pg.locator('#same-but-opposite').scrollIntoViewIfNeeded();await pg.screenshot({path:OUT+'/artworks-'+viewport.width+'.png'});
   await pg.click('#view-list');await pg.waitForFunction(()=>!__totehm_gallery().list);
   await pg.click('.tour [data-room="4"]');
   await pg.waitForFunction(()=>{const d=__totehm_gallery();return d.focused===4&&!d.moving;},null,{timeout:45000});
   sample.opposite=await pg.evaluate(()=>__totehm_gallery());
   check(sample.opposite.stations.opposite.active&&sample.opposite.stations.opposite.standalone==='/same_but_opposite','tour reaches the Same but opposite screen at '+viewport.width);
   check(await pg.locator('#work-links a[href="/same_but_opposite"]').count()===1&&!await pg.locator('#enter-experience').isDisabled(),'focused installation exposes its full experience at '+viewport.width);
   check(await pg.evaluate(()=>__directVideoCreated===0&&document.querySelectorAll('video,iframe').length===0)&&!requests.some(p=>/\.mp4$|\/stoner-gate$/.test(p)),'gallery creates no embedded decoder or video request at '+viewport.width);
   sample.screenClick=await project(pg,[-12.72,3.1,-7]);
   check(sample.screenClick.x>=0&&sample.screenClick.x<=viewport.width&&sample.screenClick.y>=0&&sample.screenClick.y<=viewport.height,'actual 3D screen projects inside the viewport at '+viewport.width);
   sample.screenCorners=await Promise.all([[-12.72,1.525,-4.2],[-12.72,1.525,-9.8],[-12.72,4.675,-4.2],[-12.72,4.675,-9.8]].map(point=>project(pg,point)));
   check(sample.screenCorners.every(p=>p.x>=0&&p.x<=viewport.width&&p.y>=0&&p.y<=viewport.height),'all four Same but opposite screen corners fit the viewport at '+viewport.width);
   await pg.screenshot({path:OUT+'/opposite-'+viewport.width+'.png'});
   sample.clickTarget=await pg.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('#space,button,a,aside')?.id||null,sample.screenClick);
   check(sample.clickTarget==='space','the visible screen is clickable without a HUD blocking it at '+viewport.width);
   await pg.mouse.click(sample.screenClick.x,sample.screenClick.y);await pg.waitForURL(u=>u.pathname==='/same_but_opposite',{timeout:20000});await pg.waitForFunction(()=>typeof __totehm_opposite==='function');
   check(await pg.locator('#space').count()===0&&await pg.locator('#artwork').count()===1&&await pg.locator('#play-artwork').isVisible(),'clicking the real screen opens the standalone, paused artwork at '+viewport.width);
   check(await pg.$eval('#artwork',v=>v.paused&&!v.autoplay),'entry waits for explicit viewer playback at '+viewport.width);
   check(fatal(log).length===0,'no JavaScript or GPU errors at '+viewport.width+': '+fatal(log).join(' | '));
  }finally{await ctx.close();}
 }
 console.log('PASS '+checks+' direct-gallery integration checks');
}finally{fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await browser.close();}
