// Both actual gallery factories, real WebGL/PBR, local assets and no live writes.
import assert from 'node:assert/strict';import fs from 'node:fs';
import {launch,page} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/gallery-heritage',origin='https://www.totehm.space';fs.mkdirSync(OUT,{recursive:true});
const browser=await launch(),results=[],junctionsOnly=process.argv.includes('--junctions-only');let checks=0;
const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
const fixture=`<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;background:#030914}canvas{display:block}</style></head><body><script type="module">
import * as T from '/vendor/three-0.180.0.mjs';import {createModernGallery} from '/gallery-modern.mjs';import {createNewYorkGallery} from '/gallery-new-york.mjs';import {createGalleryFireplace} from '/gallery-fireplace.mjs';import {heritageWalls} from '/gallery-heritage-layout.mjs';
const place=new URL(location.href).searchParams.get('place'),ny=place==='new-york',mobile=innerWidth<650;
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x07111e);scene.add(new T.HemisphereLight(0xb1c9de,0x3b3026,.88));
const moon=new T.DirectionalLight(0xc2d9ff,1.7);moon.position.set(-30,70,-40);scene.add(moon);const fill=new T.DirectionalLight(0xcbd3df,.72);fill.position.set(-18,28,45);scene.add(fill);
// A small original sky gradient gives the real glazing a reflected night sky.
const width=256,height=128,values=new Uint8Array(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const horizon=Math.exp(-Math.pow((y/height-.48)*12,2)),i=(y*width+x)*4;values[i]=8+38*horizon;values[i+1]=17+40*horizon;values[i+2]=35+45*horizon;values[i+3]=255;}
const env=new T.DataTexture(values,width,height,T.RGBAFormat);env.colorSpace=T.SRGBColorSpace;env.mapping=T.EquirectangularReflectionMapping;env.needsUpdate=true;const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(env).texture;env.dispose();pmrem.dispose();
const camera=new T.PerspectiveCamera(mobile?60:50,innerWidth/innerHeight,.08,200);let dirty=true,frames=0;
const changed=()=>{dirty=true;},gallery=(ny?createNewYorkGallery:createModernGallery)(scene,renderer,{mobile,onChange:changed}),fire=createGalleryFireplace(scene,{mobile,onChange:changed,...(ny?{smokeOutlet:{x:-8,y:27,z:-15.2,radius:.45,radiusZ:.45}}:{})});
const view=(position,target,fov=mobile?60:50)=>{camera.fov=fov;camera.position.set(...position);camera.lookAt(...target);camera.updateProjectionMatrix();dirty=true;};
view(ny?[0,6,mobile?62:36]:[0,3.4,mobile?44:25],ny?[0,12,-2]:[0,3.8,-2]);
renderer.setAnimationLoop(()=>{if(!dirty)return;dirty=false;gallery.update(0,camera.position,false);fire.update(0,camera.position,false);renderer.render(scene,camera);frames++;});
window.__heritage=()=>({...gallery.diagnostics(),frames,renderPending:dirty,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,shaderFailures:renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length});
window.__heritageView=view;
window.__heritageGeometry=()=>{scene.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(0,1.65,5),new T.Vector3(0,0,-1),0,9),door=ray.intersectObjects(gallery.solids).filter(h=>!h.object.material?.transparent);ray.set(new T.Vector3(0,4,.5),new T.Vector3(0,-1,0));ray.far=1.3;const roof=ray.intersectObjects(gallery.solids),west=heritageWalls(place).filter(w=>w.group==='heritage-ocean-west').sort((a,b)=>a.minZ-b.minZ),gap=west.findIndex((w,i)=>i<west.length-1&&west[i+1].minZ-w.maxZ>.4),gapZ=(west[gap].maxZ+west[gap+1].minZ)/2;ray.set(new T.Vector3(-11.7,1.1,gapZ),new T.Vector3(-1,0,0));ray.far=1.5;const gapHits=ray.intersectObjects(gallery.solids).filter(h=>h.object.userData.heritageMasonry||h.object.userData.heritageMortar);return{opaqueEntranceHits:door.length,canopy:roof.some(h=>h.object.material?.transparent&&Math.abs(h.point.y-3.0575)<.001),walls:gallery.solids.filter(o=>o.userData.heritageMasonry).length,blocks:gallery.solids.filter(o=>o.userData.heritageMasonry).every(o=>o.userData.physicalBlocks),gapClear:gapHits.length===0}};
</script></body></html>`;
async function view(pg,position,target,name,fov){
 const before=await pg.evaluate(()=>__heritage().frames);await pg.evaluate(({position,target,fov})=>__heritageView(position,target,fov),{position,target,fov});
 await pg.waitForFunction(frames=>__heritage().frames>frames&&!__heritage().renderPending,before,{timeout:90000});await pg.screenshot({path:OUT+'/'+name+'.png'});
}
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}])for(const place of ['lisbon','new-york']){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,viewport,session:false,network:url=>url.pathname==='/__heritage'?{contentType:'text/html',body:fixture}:null});
  try{
   await pg.goto(origin+'/__heritage?place='+place);await pg.waitForFunction(()=>window.__heritage?.().frames>0&&!__heritage().renderPending&&__heritage().facade.paperLoaded&&__heritage().heritage?.compiled&&__heritage().heritage?.photographicMapsReady,null,{timeout:90000});
   const d=await pg.evaluate(()=>__heritage()),h=d.heritage,suffix=' for '+place+' at '+viewport.width;
   check(h.kind==='glass-and-retained-masonry'&&h.retainedWalls===6&&h.retainedMasonry&&h.ruin&&h.brokenWallTops&&h.actualMissingMasonry&&h.physicalFragments>h.retainedWalls,'Both actual galleries integrate clear glass around physically broken ruins'+suffix);
   check(h.masonry.physicalBlocks&&h.masonry.irregularBlocks&&h.masonry.beveledStone&&h.masonry.deepMortar&&h.masonry.blocks>300,'Old masonry has actual irregular worn blocks and deeply recessed joints'+suffix);
   check(h.photographicMapsReady&&h.masonry.loadedMaps===3&&h.masonry.mapFailures===0,'The three locally hosted mineral PBR maps load without a fallback'+suffix);
   check(h.compiled&&h.portal.glassCompiled&&d.shaderFailures===0,'Native limestone, normal mapping and low-iron Fresnel glass compile'+suffix);
   check(h.portal.open&&h.portal.panes===3&&h.portal.doors===0&&h.portal.clearWidth===4.8&&Math.abs(h.portal.projection-2.95)<.0001,'The projecting glass vestibule has a genuinely open entrance'+suffix);
   check(h.thinFrames&&h.frameThickness===.035&&h.shadowGapMetres===.08&&h.warmRakingLights===4,'Fine junctions and warm raking light reveal the old/new connection'+suffix);
   const geometry=await pg.evaluate(()=>__heritageGeometry());
   check(geometry.opaqueEntranceHits===0&&geometry.canopy&&geometry.walls===h.physicalFragments&&geometry.blocks&&geometry.gapClear,'Real raycasts confirm the open doorway, solid glass canopy and a genuine lacuna in the old stone'+suffix);
   check(d.exhibition.reservedSlots===(place==='new-york'?29:5)&&d.facade.centered&&d.facade.monumental,'The original central TOTEHM and future artwork surfaces remain present'+suffix);
   check(place==='new-york'?d.levels===5&&d.stairs===0&&d.ramps===16:d.facade.windows===12&&d.waveGlass,'The two distinct historical identities and circulation remain intact'+suffix);
   check(place==='new-york'?d.ruinedHistoricFacade&&d.brokenMasonryCrown&&d.modernGlassSeal:d.facade.ruined&&d.facade.brokenParapet&&d.facade.weatheredTiles&&d.facade.tiles.exposedLime&&d.facade.tiles.fineCracks,'The historic facade has actual broken edges and weathering beside intact modern glass'+suffix);
   const name=place+'-'+viewport.width;
   const mobile=viewport.width<650;
   if(!junctionsOnly){
    await pg.screenshot({path:OUT+'/'+name+'-front.png'});
    await view(pg,place==='new-york'?(mobile?[46,28,48]:[32,20,28]):(mobile?[40,21,36]:[25,12,20]),place==='new-york'?[0,12,-7]:[0,3.7,-7],name+'-exterior');
    await view(pg,place==='new-york'?[15,29,7]:[6.5,7.7,6.5],place==='new-york'?[6,25,-4]:[6.5,5.8,-2],name+'-facade-detail',mobile?62:48);
    await view(pg,[6.5,2.5,5],[0,1.65,-2.0],name+'-vestibule',mobile?65:54);
   }
   await view(pg,[14.8,3.3,-10.2],[12.55,2.6,-14.2],name+'-junction',mobile?65:58);
   await view(pg,[-10.0,2.2,-10.8],[-12.6,2.5,-14.5],name+'-stone-interior',mobile?65:58);
   if(!junctionsOnly)await view(pg,[0,2,-4.8],[0,2.4,-14],name+'-interior',mobile?78:68);
   check(!log.errors.some(e=>/pageerror:|THREE.WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e)),'The complete structure renders without JavaScript or GPU errors'+suffix);
   results.push({place,viewport,diagnostics:d,geometry,errors:log.errors});
  }finally{await ctx.close();}
 }
 fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,mode:junctionsOnly?'refined-junctions':'complete-architecture',results},null,2));console.log('PASS '+checks+' native glass-and-heritage architecture checks');
}finally{await browser.close();}
