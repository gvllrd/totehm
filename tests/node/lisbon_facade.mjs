import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createLisbonFacade,LISBON_FACADE as F,LISBON_FACADE_BALCONIES,LISBON_PARAPET_GAPS} from '../../space/gallery-lisbon-facade.mjs';
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
for(const mobile of [false,true]){
 const scene=new T.Scene(),facade=createLisbonFacade(scene,{mobile}),d=facade.diagnostics();scene.updateMatrixWorld(true);
 check(d.windows===12&&facade.windows.length===12,'Twelve actual front windows reconstruct the three-tier Lisbon reference');
 check(d.upperBalconies===8&&d.realCurledIronGeometry,'The two upper window rows have real ornate iron balconies');
 check(d.centralBay.windowFree&&facade.windows.every(w=>Math.abs(w.x)-w.width/2>F.centralBayHalfWidth),'Every window lies outside the solid central TOTEHM bay');
 const ray=new T.Raycaster(),wall=facade.root.getObjectByName('Lisbon façade — actual limestone-backed masonry and window apertures');
 for(const y of [.2,1.65,3.05]){ray.set(new T.Vector3(0,y,3),new T.Vector3(0,0,-1));check(ray.intersectObjects(facade.solids,false).length===0,'The central entrance remains a real unobstructed opening');}
 for(const y of [3.3,4.3,5.5,6.9]){ray.set(new T.Vector3(0,y,3),new T.Vector3(0,0,-1));check(ray.intersectObject(wall).length>0,'Real opaque masonry supports the monumental tongue instead of a central window');}
 for(const w of facade.windows){
  ray.set(new T.Vector3(w.x,w.y,3),new T.Vector3(0,0,-1));check(ray.intersectObject(wall).length===0,'Each visible front window is an actual aperture in the masonry');
  if(w.arch){ray.set(new T.Vector3(w.x+w.width/2-.015,w.y+w.height/2-.02,3),new T.Vector3(0,0,-1));check(ray.intersectObject(wall).length>0,'The upper window opening has a genuine shallow arched top');}
 }
 check(LISBON_FACADE_BALCONIES.length===32&&LISBON_FACADE_BALCONIES.every(b=>b.minY>2.8&&b.minX<b.maxX&&b.minY<b.maxY&&b.minZ<b.maxZ),'Physical balcony guards and platforms remain above the ground-level approach');
 for(const b of LISBON_FACADE_BALCONIES.filter(b=>b.id.endsWith('-stone'))){ray.set(new T.Vector3((b.minX+b.maxX)/2,b.maxY+.04,(b.minZ+b.maxZ)/2),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(facade.solids,false)[0];check(!!hit&&Math.abs(hit.point.y-b.maxY)<.000002,'Every balcony collision platform follows its actual rendered stone top');}
 const geometryNames=facade.root.children.flatMap(o=>o.userData.facadeParts||[]);
 check(geometryNames.filter(name=>name==='Hand-curled wrought-iron scroll').length===64,'All sixty-four paired iron curls exist in the rendered mesh');
 check(geometryNames.filter(name=>name==='Oval at the heart of the wrought-iron panel').length===32,'The original-style iron panels contain thirty-two actual oval ornaments');
 const balusters=facade.root.getObjectByName('Lisbon roofline — turned stone balustrade'),stumps=facade.root.getObjectByName('Lisbon roofline — broken stone baluster stumps');
 check(d.ruined&&d.brokenParapet&&balusters.isInstancedMesh&&balusters.count===d.stoneBalusters&&balusters.count>25&&balusters.count<58,'The ruined parapet preserves actual groups of the old turned balustrade');
 check(stumps.isInstancedMesh&&stumps.count===d.brokenBalusterStumps&&stumps.count>2,'Several balusters survive as irregular physical broken stumps');
 for(const [a,b] of LISBON_PARAPET_GAPS){
  check(a< b&&(b< -F.centralBayHalfWidth||a>F.centralBayHalfWidth),'The original solid TOTEHM bay is outside every parapet breach');
  ray.set(new T.Vector3((a+b)/2,7.60,3),new T.Vector3(0,0,-1));check(ray.intersectObject(facade.root,true).length===0,'Each broken group has a real open silhouette instead of a dark painted patch');
  ray.set(new T.Vector3(a-.20,7.60,3),new T.Vector3(0,0,-1));check(ray.intersectObjects(facade.solids,false).length>0,'Retained stone rail remains solid immediately beside a real breach');
 }
 let triangles=0;const p=new T.Vector3(),instance=new T.Matrix4();
 for(const object of facade.root.children.filter(o=>o.isMesh)){
  const g=object.geometry,a=g.attributes.position,n=g.attributes.normal;triangles+=(g.index?.count||a.count)/3*(object.isInstancedMesh?object.count:1);if(object.isInstancedMesh)object.getMatrixAt(0,instance);else instance.identity();
  for(let i=0;i<a.count;i++){
   p.fromBufferAttribute(a,i).applyMatrix4(instance).applyMatrix4(object.matrixWorld);
   check(Number.isFinite(p.x+p.y+p.z),'Every physical façade vertex is finite');
   check(p.z>=-2.18&&p.z<=-.99,'Historical masonry and ornament remain on the street face, never on a side or rear wall');
   check(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.0001,'All façade surfaces have valid unit lighting normals');
  }
 }
 check(triangles<(mobile?45000:65000),'Detailed window iron and balustrade keep a reasonable device triangle budget');
 check(facade.root.children.filter(o=>o.isMesh).length<=9,'Ornaments are batched rather than becoming hundreds of draw calls');
 check(d.tiles.externalImages===0&&d.tiles.originalProcedural&&d.tiles.elongatedDiamonds&&d.tiles.blueAndWhite,'Cobalt lozenges are original physical-scale patterns with no watermarked image download');
 check(d.tiles.diamondPeriod[1]>d.tiles.diamondPeriod[0]&&d.tiles.antiAliased&&d.border.border,'The reference elongated lozenges and fine tile borders keep separate scales and distance filtering');
 check(d.weatheredTiles&&d.tiles.weatheredTiles&&d.tiles.missingTilePatches===5&&d.tiles.exposedLime&&d.tiles.fineCracks&&d.tiles.chippedGlaze,'The surviving original cobalt pattern has coherent missing patches, bare lime, fine cracks and worn glaze');
 let released=0;for(const object of facade.root.children.filter(o=>o.isMesh))object.geometry.addEventListener('dispose',()=>released++);
 const meshCount=facade.root.children.filter(o=>o.isMesh).length;facade.dispose();facade.dispose();
 check(scene.children.length===0&&released===meshCount&&facade.diagnostics().disposed,'Standalone façade release is complete and idempotent');
 console.log(JSON.stringify({mobile,triangles,meshes:meshCount,windows:d.windows,balconies:d.upperBalconies}));
}
console.log('PASS '+checks+' Lisbon historic façade geometry checks');
