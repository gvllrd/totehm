import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PerspectiveCamera,Vector3} from '../../space/vendor/three-0.180.0.mjs';
import {launch,page} from './harness.mjs';
const out=process.argv[2]||'/tmp/lisbon-urbex',origin='https://www.totehm.space';fs.mkdirSync(out,{recursive:true});
let checks=0;const check=(v,m)=>{assert(v,m);checks++;console.log('PASS '+m);};
const neutral="import * as T from '/vendor/three-0.180.0.mjs';export function createTempleLandscape(scene){scene.background=new T.Color(0x101621);scene.add(new T.HemisphereLight(0xdbe6f0,0x252a33,2));const moon=new T.DirectionalLight(0xd5e6ff,3);moon.position.set(-20,40,20);scene.add(moon);return{update:()=>false,diagnostics:()=>({qa:true})};}";
const browser=await launch(),results=[];
function project(d,point,viewport){const c=new PerspectiveCamera(d.camera.fov,viewport.width/viewport.height,.08,9000);c.position.fromArray(d.camera.position);c.lookAt(new Vector3(...d.camera.target));c.updateMatrixWorld();const p=new Vector3(...point).project(c);return{x:(p.x+1)*viewport.width/2,y:(1-p.y)*viewport.height/2};}
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const f=await page(browser,{dir:'space',origin,viewport,session:false,hasTouch:viewport.width<650,network:url=>url.pathname==='/gallery-temple-landscape.mjs'?{contentType:'text/javascript',body:neutral}:null});
  const {pg,ctx,log}=f;
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/lisbon-space',{waitUntil:'domcontentloaded'});
   await pg.waitForFunction(()=>window.__totehm_gallery?.().stations?.play?.coverReady&&__totehm_gallery().originsJourney.vessel.blackHole.realPortal,null,{timeout:90000});
   const start=await pg.evaluate(()=>__totehm_gallery());
   check(start.temple.kind==='lisbon-azulejo-urbex-gallery'&&!start.temple.dome&&start.temple.azulejoBuilding.ruined,'The real world has the ruined azulejo building at '+viewport.width);
   check(start.temple.thpCounter.tables===1&&start.temple.thpCounter.inside&&start.temple.laboratory.wings===2,'One indoor table combines the THP and both laboratory wings at '+viewport.width);
   check(start.temple.facade.externalStreetSigns===0&&start.temple.facade.collaborationInside,'The old exterior sign installation is absent at '+viewport.width);
   await pg.screenshot({path:out+'/'+viewport.width+'-entry.png',timeout:90000});
   await pg.locator('.tour [data-room="0"]').click();await pg.waitForFunction(()=>__totehm_gallery().focused===0);
   check((await pg.evaluate(()=>__totehm_gallery().position[1]))<-2,'Visitors actually enter the building to reach the table at '+viewport.width);
   await pg.screenshot({path:out+'/'+viewport.width+'-laboratory.png',timeout:90000});await pg.locator('#close-info').click();
   await pg.locator('.tour [data-room="1"]').click();await pg.waitForURL(u=>u.pathname==='/origin');await pg.waitForFunction(()=>window.__totehm_origin?.().frames>0);
   check(await pg.locator('#origin-return').isVisible(),'Origins is a dedicated galaxy page with a return at '+viewport.width);
   await pg.locator('#origin-return').click();await pg.waitForFunction(()=>window.__totehm_gallery?.().stations.play.coverReady);
   await pg.locator('.tour [data-room="2"]').click();await pg.waitForFunction(()=>__totehm_gallery().focused===2);
   await pg.locator('#close-info').click();await pg.waitForFunction(()=>__totehm_gallery().room===-1);
   // Closing the info panel preserves the arrived view. The physical optical
   // field, rather than a UI link, must open the independent original page.
   const d=await pg.evaluate(()=>__totehm_gallery());await pg.screenshot({path:out+'/'+viewport.width+'-hologram.png',timeout:90000});
   const click=project(d,[-3.4,3.45,-15.35],viewport);await pg.mouse.click(click.x,click.y);
   await pg.waitForURL(u=>u.pathname==='/play_lisbon_street'&&u.searchParams.get('discover')==='1',{timeout:20000});
   await pg.waitForFunction(()=>window.__totehm_lisbon?.().access.state==='guest');
   check(await pg.evaluate(()=>__totehm_lisbon().step===0&&!__totehm_lisbon().board),'Clicking the physical hologram opens the full original Discover first at '+viewport.width);
   const type=await pg.locator('.disc-block.active .t-futura').last().evaluate(e=>({size:parseFloat(getComputedStyle(e).fontSize),line:parseFloat(getComputedStyle(e).lineHeight)}));
   check(type.size>=(viewport.width<650?15:22)&&type.line/type.size>=1.45,'The reading type matches the clearer full-screen format at '+viewport.width);
   await pg.screenshot({path:out+'/'+viewport.width+'-discover.png'});
   for(let step=1;step<9;step++){await pg.keyboard.press('ArrowDown');await pg.waitForFunction(i=>__totehm_lisbon().step===i,step);const b=await pg.locator('.disc-block.active').last().boundingBox();check(b.x>=0&&b.y>=65&&b.x+b.width<=viewport.width+1&&b.y+b.height<viewport.height-60,'Discover slide '+step+' fits without overlap at '+viewport.width);}
   check(await pg.locator('.disc-block.active [data-street-enter]').getAttribute('data-access')==='guest','The readable Discover still requires THP for the controller at '+viewport.width);
   check(!log.errors.some(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e)),'World, hologram and Discover have no JavaScript/GPU errors at '+viewport.width);
   results.push({viewport,diagnostics:start,errors:log.errors});
  }catch(e){console.error(JSON.stringify({url:pg.url(),errors:log.errors,diagnostics:await pg.evaluate(()=>window.__totehm_gallery?.()||window.__totehm_lisbon?.())}));throw e;}finally{await ctx.close();}
 }
 const owner=await page(browser,{dir:'space',origin,session:true,functions:{'stoner-gate':{access:true}},viewport:{width:1100,height:760},network:url=>url.pathname==='/gallery-temple-landscape.mjs'?{contentType:'text/javascript',body:neutral}:null});
 try{await owner.pg.emulateMedia({reducedMotion:'reduce'});await owner.pg.goto(origin+'/lisbon-space');await owner.pg.waitForFunction(()=>window.__totehm_gallery?.().frames>0);await owner.pg.locator('.tour [data-room="2"]').click();await owner.pg.waitForFunction(()=>__totehm_gallery().focused===2);await owner.pg.locator('#enter-experience').click();await owner.pg.waitForURL(u=>u.pathname==='/play_lisbon_street'&&u.searchParams.get('discover')==='1');await owner.pg.waitForFunction(()=>window.__totehm_lisbon?.().access.owned);check(await owner.pg.evaluate(()=>!__totehm_lisbon().board),'THP holders also enter through the original Discover');for(let step=1;step<9;step++){await owner.pg.locator('#sdisc-trig').click();await owner.pg.waitForFunction(next=>__totehm_lisbon().step===next,step);}await owner.pg.locator('.disc-block.active [data-street-enter]').click();await owner.pg.waitForFunction(()=>__totehm_lisbon().board);check(await owner.pg.evaluate(()=>__totehm_lisbon().rocks===22),'The verified owner can transform the signs into the original controller');}finally{await owner.ctx.close();}
}finally{await browser.close();}
fs.writeFileSync(out+'/results.json',JSON.stringify({checks,results},null,2));console.log('PASS '+checks+' Lisbon urbex and full-screen Discover checks');
