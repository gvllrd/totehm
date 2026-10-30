import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createHeritageMasonry} from '../../space/gallery-heritage-masonry.mjs';

let checks=0;const check=(condition,message)=>{assert(condition,message);checks++;};
const walls=[
 {id:'front',group:'old-wing',minX:-3,maxX:3,minY:-.09,maxY:4.2,minZ:-2,maxZ:-1.45,seed:41},
 {id:'return',group:'old-wing',axis:'z',minX:4,maxX:4.62,minY:-.09,maxY:3.7,minZ:-6,maxZ:-.5,seed:55},
 {id:'broken',minX:6,maxX:8.5,minY:-.09,maxY:2.8,minZ:-3,maxZ:-2.4,breakTop:true,seed:93},
 {id:'thin',minX:9,maxX:9.024,minY:0,maxY:.06,minZ:0,maxZ:1,breakTop:true},
 null,{id:'invalid',minX:2,maxX:1,minY:0,maxY:1,minZ:0,maxZ:1}
];
for(const mobile of [false,true]){
 const scene=new T.Scene(),sentinel=new T.Group();scene.add(sentinel);
 const masonry=createHeritageMasonry(scene,{walls,mobile}),d=masonry.diagnostics();scene.updateMatrixWorld(true);
 check(d.walls===4&&d.blocks>200&&d.materials===2,'Both orientations and eroded remains share two materials; invalid bounds are omitted');
 check(d.physicalBlocks&&d.irregularBlocks&&d.beveledStone&&d.deepMortar,'The old masonry consists of actual individual weathered stones and deep mortar');
 check(d.fragments===4&&d.fragmentGroups===3&&d.wallData[0].group==='old-wing','Separate ruin fragments preserve their historical wall group');
 check(d.angularChips&&d.variedCourseFormats&&d.fracturedBlocks>d.blocks*.2&&d.fracturedBlocks<d.blocks*.6,'The ruin mixes worn stones with real sharp fractured faces rather than identical rounded blocks');
 check(masonry.solids.length===5&&d.drawCalls===5,'The retained walls merge their stones and share one recessed mortar draw');
 const A=new T.Vector3(),B=new T.Vector3(),C=new T.Vector3(),normal=new T.Vector3(),face=new T.Vector3();let triangles=0;
 for(const object of masonry.solids){
  const g=object.geometry,p=g.attributes.position,n=g.attributes.normal;triangles+=p.count/3;
  const bounds=walls.find(w=>w?.id===object.name);
  if(bounds)for(let i=0;i<p.count;i++){
   A.fromBufferAttribute(p,i);check(Number.isFinite(A.x+A.y+A.z),'Every stone vertex is finite');
   for(const [axis,min,max] of [['x',bounds.minX,bounds.maxX],['y',bounds.minY,bounds.maxY],['z',bounds.minZ,bounds.maxZ]])check(A[axis]>=min-1e-6&&A[axis]<=max+1e-6,'All real stones stay inside their physics bounds');
   normal.fromBufferAttribute(n,i);check(Math.abs(normal.length()-1)<.00001,'Physical stone normals are finite and normalized');
  }
  for(let i=0;i<p.count;i+=3){
   A.fromBufferAttribute(p,i);B.fromBufferAttribute(p,i+1);C.fromBufferAttribute(p,i+2);face.crossVectors(B.clone().sub(A),C.clone().sub(A)).normalize();normal.fromBufferAttribute(n,i);
   check(face.dot(normal)>.001,'Side returns preserve outward winding and lighting after rotation');
  }
 }
 check(triangles===d.triangles&&triangles<40000,'Measured masonry triangle counts match the actual bounded meshes');
 const front=masonry.root.getObjectByName('front'),core=masonry.solids.find(o=>o.userData.heritageMortar),ray=new T.Raycaster();
 let stoneHits=0,mortarHits=0,mortarZ=null,reliefMin=Infinity,reliefMax=-Infinity;
 for(let ix=0;ix<61;ix++)for(let iy=0;iy<45;iy++){
  ray.set(new T.Vector3(-2.94+ix*.096, .04+iy*.09,1),new T.Vector3(0,0,-1));
  const hits=ray.intersectObjects([front,core]);
  check(hits.length>0,'Recessed structural mortar closes every genuine stone joint');
  if(hits[0].object===front){stoneHits++;reliefMin=Math.min(reliefMin,hits[0].point.z);reliefMax=Math.max(reliefMax,hits[0].point.z);}
  else{mortarHits++;mortarZ=hits[0].point.z;}
 }
 check(stoneHits>2000&&mortarHits>50,'Raycasts find both genuine stone faces and physically recessed lime joints');
 check(reliefMax-reliefMin>.015,'Irregular blocks have real eroded face relief rather than a flat printed stone surface');
 check(Math.abs(mortarZ+1.495)<1e-5,'Lime mortar sits 45 mm behind the visible front stone envelope');
 check(d.recessedEnds&&d.stoneTopSupports,'Real stone, rather than a concrete-like core, remains visible at broken ends and tops');
 for(const wall of walls.filter(w=>w&&w.id!=='invalid')){
  const object=masonry.root.getObjectByName(wall.id),p=object.geometry.attributes.position;let cap=null;
  for(let i=0;i<p.count&&!cap;i+=3)if([0,1,2].every(j=>Math.abs(p.getY(i+j)-wall.maxY)<1e-6))cap=new T.Vector3((p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,wall.maxY,(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3);
  check(!!cap,'Each fragment has an actual stone top face at its exact physical support height');
  ray.set(cap.clone().add(new T.Vector3(0,1,0)),new T.Vector3(0,-1,0));
  const hit=ray.intersectObjects([object,core])[0],behind=ray.intersectObject(core)[0];
  check(hit?.object===object&&Math.abs(hit.point.y-wall.maxY)<1e-6,'A downward ray reaches real stone at maxY before the hidden structural mortar');
  if(behind)check(behind.point.y<wall.maxY-.005,'Structural mortar remains recessed below even the top stones of a very thin fragment');
 }
 for(const [origin,direction,name] of [[[4,1.67,-1.725],[-1,0,0],'front'],[[4.31,1.67,.5],[0,0,-1],'return']]){
  ray.set(new T.Vector3(...origin),new T.Vector3(...direction));const hits=ray.intersectObjects(masonry.solids);
  check(hits[0]?.object.name===name,'Horizontal rays at both fragment orientations reach genuine stone ends before the recessed core');
  const behind=hits.find(hit=>hit.object===core);check(!!behind&&behind.distance>hits[0].distance+.02,'The mortar is recessed longitudinally as well as across each wall');
 }
 const side=masonry.root.getObjectByName('return');
 ray.set(new T.Vector3(3,1.67,-2.57),new T.Vector3(1,0,0));check(ray.intersectObject(side).length>0,'A side-facing retained wall renders its outward surface with front-face culling');
 let releasedG=0,releasedM=0;for(const object of masonry.solids)object.geometry.addEventListener('dispose',()=>releasedG++);
 for(const m of new Set(masonry.solids.map(o=>o.material)))m.addEventListener('dispose',()=>releasedM++);
 masonry.dispose();masonry.dispose();check(releasedG===5&&releasedM===2&&scene.children.length===1&&scene.children[0]===sentinel&&masonry.diagnostics().disposed,'Standalone disposal is complete and idempotent, preserving unrelated scene objects');
}
{
 const geometries=[],materials=[],scene=new T.Scene();
 const masonry=createHeritageMasonry(scene,{walls:walls.slice(0,2),geometry:g=>(geometries.push(g),g),material:m=>(materials.push(m),m)});
 let released=0;for(const item of [...geometries,...materials])item.addEventListener('dispose',()=>released++);
 masonry.dispose();check(released===0&&scene.children.length===0,'Caller-registered GPU resources remain caller-owned after removal');
 for(const item of [...geometries,...materials])item.dispose();check(released===geometries.length+materials.length,'The architecture can then release every registered resource exactly once');
}
console.log('PASS '+checks+' retained heritage masonry checks');
