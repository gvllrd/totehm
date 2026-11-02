// Current castle/glass galleries, native WebGL and local assets. Services are mocked.
// --fixture --shots-only gives fast architectural views for visual review.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PerspectiveCamera,Vector3} from '../../space/vendor/three-0.180.0.mjs';
import {GALLERY_LAYOUT as L} from '../../space/gallery-modern-layout.mjs';
import {launch,page} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/castle-rebuild',origin='https://www.totehm.space';
const fixtureMode=process.argv.includes('--fixture'),shotsOnly=process.argv.includes('--shots-only');
const desktopOnly=process.argv.includes('--desktop-only');
fs.mkdirSync(OUT,{recursive:true});
let checks=0;const results=[];
const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
const fatal=log=>log.errors.filter(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e));
const fixture=`<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;background:#050b14}canvas{display:block}</style></head><body><script type="module">
import * as T from '/vendor/three-0.180.0.mjs';
import {createModernGallery} from '/gallery-modern.mjs';import {createNewYorkGallery} from '/gallery-new-york.mjs';
import {createGalleryFireplace} from '/gallery-fireplace.mjs';import {GLASS_HEARTH} from '/gallery-glass-shell.mjs';
const mobile=innerWidth<650,place=new URL(location.href).searchParams.get('place');
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x08111c);scene.add(new T.HemisphereLight(0xc1d5e8,0x3b3025,1));
const moon=new T.DirectionalLight(0xc0d8ff,1.65);moon.position.set(-30,70,-40);scene.add(moon);const fill=new T.DirectionalLight(0xffe2be,.65);fill.position.set(20,24,34);scene.add(fill);
const width=256,height=128,values=new Uint8Array(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const horizon=Math.exp(-Math.pow((y/height-.48)*12,2)),i=(y*width+x)*4;values[i]=9+38*horizon;values[i+1]=19+40*horizon;values[i+2]=39+45*horizon;values[i+3]=255;}
const env=new T.DataTexture(values,width,height,T.RGBAFormat);env.colorSpace=T.SRGBColorSpace;env.mapping=T.EquirectangularReflectionMapping;env.needsUpdate=true;const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(env).texture;env.dispose();pmrem.dispose();
const camera=new T.PerspectiveCamera(mobile?62:50,innerWidth/innerHeight,.08,240);let dirty=true,frames=0;
const changed=()=>{dirty=true;},gallery=(place==='new-york'?createNewYorkGallery:createModernGallery)(scene,renderer,{mobile,onChange:changed}),fire=createGalleryFireplace(scene,{mobile,onChange:changed,smokeOutlet:GLASS_HEARTH.smokeOutlet});
window.__castleView=(position,target,fov=mobile?62:50)=>{camera.fov=fov;camera.position.set(...position);camera.lookAt(...target);camera.updateProjectionMatrix();dirty=true;};
__castleView(mobile?[0,4,43]:[0,4,27],[0,4,-8]);
renderer.setAnimationLoop(()=>{if(!dirty)return;dirty=false;gallery.update(0,camera.position,false);fire.update(0,camera.position,false);renderer.render(scene,camera);frames++;});
window.__castleFixture=()=>({...gallery.diagnostics(),frames,renderPending:dirty,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,shaderFailures:renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length});
window.__castleRays=()=>{scene.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(0,1.65,3),new T.Vector3(0,0,-1),0,8);const opaqueEntry=ray.intersectObjects(gallery.solids).filter(h=>!h.object.material?.transparent);return{opaqueEntry:opaqueEntry.length};};
</script></body></html>`;
async function fixtureView(pg,position,target,name,fov){
 const before=await pg.evaluate(()=>__castleFixture().frames);
 await pg.evaluate(({position,target,fov})=>__castleView(position,target,fov),{position,target,fov});
 await pg.waitForFunction(n=>__castleFixture().frames>n&&!__castleFixture().renderPending,before,{timeout:90000});
 await pg.screenshot({path:OUT+'/'+name+'.png'});
}
async function project(pg,point){
 const d=await pg.evaluate(()=>({camera:__totehm_gallery().camera,width:innerWidth,height:innerHeight}));
 const c=new PerspectiveCamera(d.camera.fov,d.camera.aspect,d.camera.near,d.camera.far);c.position.fromArray(d.camera.position);c.lookAt(new Vector3(...d.camera.target));c.updateProjectionMatrix();c.updateMatrixWorld();
 const p=new Vector3(...point).project(c);return{x:(p.x+1)*d.width/2,y:(1-p.y)*d.height/2};
}
const browser=await launch();
try{
 for(const viewport of (desktopOnly?[{width:1440,height:1000}]:[{width:1440,height:1000},{width:390,height:844}]))for(const place of ['lisbon','new-york']){
  const suffix=place+'-'+viewport.width;
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,viewport,session:false,hasTouch:viewport.width<650,network:url=>fixtureMode&&url.pathname==='/__castle_rebuild'?{contentType:'text/html',body:fixture}:null});
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});
   if(fixtureMode){
    await pg.goto(origin+'/__castle_rebuild?place='+place);
    await pg.waitForFunction(()=>window.__castleFixture?.().frames>0&&!__castleFixture().renderPending,null,{timeout:90000});
    // Let the local photographic maps finish; rendering remains event driven.
    await pg.waitForLoadState('networkidle');
    await pg.screenshot({path:OUT+'/'+suffix+'-front.png'});
    await fixtureView(pg,viewport.width<650?[35,20,35]:[27,16,23],[0,4,-8],suffix+'-exterior');
    await fixtureView(pg,[-22,13,18],[-4,4,-9],suffix+'-ruin');
    await fixtureView(pg,[0,1.9,-4.5],[0,2.6,-14],suffix+'-interior',viewport.width<650?78:72);
    const d=await pg.evaluate(()=>__castleFixture()),rays=await pg.evaluate(()=>__castleRays());
    check(d.shaderFailures===0&&!fatal(log).length,'The native structure compiles without JavaScript or GLSL errors at '+suffix);
    check(rays.opaqueEntry===0,'Actual stone and glass geometry leaves the central entrance physically open at '+suffix);
    results.push({place,viewport,diagnostics:d,rays,errors:log.errors});
    continue;
   }
   await pg.goto(origin+(place==='lisbon'?'/lisbon-space':'/new-york'),{waitUntil:'domcontentloaded'});
   await pg.waitForFunction(()=>{const d=window.__totehm_gallery?.();return d?.webgl&&!d.fallback&&d.frames>0&&d.landscape?.skyLoaded&&d.landscape?.ocean?.detailMapsLoaded===2&&d.temple?.flooring?.ancientStone?.photographicMapsReady&&d.stations?.play?.coverReady&&d.stations?.opposite?.coverReady;},null,{timeout:90000});
   const d=await pg.evaluate(()=>__totehm_gallery());
   await pg.screenshot({path:OUT+'/'+suffix+'-entry.png'});
   check(d.place===place&&!d.fallback,'The actual '+place+' page starts a native WebGL visit at '+viewport.width);
   check(d.temple.rebuilt&&d.temple.levels===1&&d.temple.airyInterior&&d.temple.interiorPartitions===0,'The new castle has one uninterrupted double-height interior at '+suffix);
   check(d.temple.facade.monumentalEntranceMark&&d.temple.facade.scale===1.5&&d.temple.facade.position[0]===0&&d.temple.facade.position[1]>L.entryHeight,'The monumental tongue is centred above the open entrance at '+suffix);
   check(d.temple.thpCounter.packagedPapers===6&&d.temple.thpCounter.papers===6&&d.temple.thpCounter.looseTabs===0&&d.temple.thpCounter.wallPapers===0&&d.temple.thpCounter.premiumSource==='/get_higher','All six Totehmpapers have their original premium packaging and remain exclusively on the table at '+suffix);
   check(d.temple.origins.stone&&d.temple.origins.inKeep&&d.temple.origins.closedBook&&d.temple.origins.position.join(',')===L.origins.lectern.join(','),'Origins rests on a stone plinth inside the left keep at '+suffix);
   check(d.temple.exhibition.artworkSupport==='stone'&&d.temple.exhibition.glassMountedArtworks===0,'The wall artworks use stone supports and leave the glass clear at '+suffix);
   check(d.stations.play.signs===22&&d.stations.play.loaded===22&&d.stations.play.originalSignImages&&d.stations.play.matchingStandaloneDrift&&d.stations.play.view==='floating-signs'&&d.stations.play.screen.join(',')===L.play.screen.join(','),'The left screen shows all 22 original floating Lisbon street signs at '+suffix);
   check(d.stations.play.screen[0]<0&&d.stations.play.wallMounted&&d.stations.play.support==='stone','The Lisbon preview hangs on the left stone wall at '+suffix);
   check(d.fireplace.position[0]>0&&d.fireplace.position.join(',')===L.fireplace.position.join(',')&&d.fireplace.barkRelief&&d.fireplace.splitWoodGeometry&&d.fireplace.independentFlameBreathing,'The improved wood fire is on the right at '+suffix);
   check(place==='lisbon'
    ?d.temple.pavement?.compiled&&d.temple.pavement.waves&&d.temple.pavement.boat&&d.temple.pavement.boatCentre.join(',')==='0,4'&&!d.temple.flooring.continuousStone
    :d.temple.pavement===null&&d.temple.flooring.continuousStone,'The original Lisbon calçada compiles with its waves and caravel; New York keeps its own terrace at '+suffix);
   check(d.landscape.ocean.curledSurface&&d.landscape.ocean.mainChop===1.8&&d.landscape.ocean.detailMapsLoaded===2,'The original storm ocean and both detail maps remain at '+suffix);
   check(d.landscape.sky.night&&d.landscape.sky.milkyWay&&d.landscape.sky.moon&&d.landscape.sky.stars===(viewport.width<650?8500:18000),'The original star field, Milky Way and moon remain at '+suffix);
   check(['/origins','/get_higher','/play_lisbon_street','/same_but_opposite'].every(href=>d.experiences.includes(href)),'All independent artwork destinations remain at '+suffix);
   check(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'The gallery fits the viewport at '+suffix);
   check(await pg.locator('#building-levels').isHidden(),'The open castle gallery has no obsolete five-floor controls at '+suffix);
   if(!shotsOnly){
    for(const room of [1,2,0,4]){
     await pg.click('.tour [data-room="'+room+'"]');
     await pg.waitForFunction(room=>{const d=__totehm_gallery();return d.focused===room&&!d.moving;},room,{timeout:45000});
     const state=await pg.evaluate(()=>__totehm_gallery());
     check(state.physics.grounded&&Math.abs(state.physics.feetHeight+.09)<.01,'Real guided movement reaches artwork '+room+' on the castle floor at '+suffix);
     if(room===1||room===4)await pg.screenshot({path:OUT+'/'+suffix+'-art-'+room+'.png'});
    }
    const point=await project(pg,L.opposite.screen);
    check(point.x>0&&point.x<viewport.width&&point.y>0&&point.y<viewport.height,'The physical artwork screen is in view at '+suffix);
    await pg.mouse.click(point.x,point.y);
    await pg.waitForURL(url=>url.pathname==='/same_but_opposite',{timeout:20000});
    await pg.waitForFunction(()=>typeof __totehm_opposite==='function');
    check(await pg.locator('video').count()===1&&await pg.locator('video').evaluate(v=>v.paused),'Clicking the actual artwork opens its independent paused player at '+suffix);
   }
   check(!fatal(log).length,'The complete scene and artwork visit have no JavaScript or GPU errors at '+suffix);
   results.push({place,viewport,entry:d,errors:log.errors});
  }finally{await ctx.close();}
 }
 fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,fixtureMode,shotsOnly,results},null,2));
 console.log('PASS '+checks+' rebuilt castle gallery checks');
}finally{await browser.close();}
