import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createLiberty,LIBERTY_LOCATION,LIBERTY_VIEW,libertyWaterHeight} from '../../space/gallery-liberty.mjs';
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
for(const mobile of [false,true]){
 const scene=new T.Scene(),sculpture=createLiberty(scene,{mobile}),d=sculpture.diagnostics();scene.updateMatrixWorld(true);
 const meshes=sculpture.root.children.filter(o=>o.isMesh),parts=meshes.flatMap(o=>o.userData.parts);
 check(meshes.length===5&&d.drawMeshes===5,'Four copper batches and one stone pedestal batch render the whole monument');
 check(LIBERTY_VIEW.framePoints.length>=8&&LIBERTY_VIEW.framePoints.every(p=>p.length===3&&p.every(Number.isFinite)),'Shared sightseeing points cover real feet, shoulders, head, crown and torch');
 check(parts.filter(p=>/^Crown ray \d+$/.test(p.name)).length===7,'The actual mesh includes seven individual crown rays');
 check(parts.filter(p=>p.name==='Crown arched observation window').length===13,'The diadem has actual dark arched window geometry');
 check(parts.some(p=>p.name==='Raised right arm — continuous fluted sleeve')&&parts.some(p=>p.name==='Hand holding the torch'),'The torch arm is draped, articulated and grasping the shaft');
 check(parts.some(p=>p.name==='Liberty — classical copper head'&&p.vertexCount>3000)&&!parts.some(p=>/eyelid|eye socket|eyebrow|nose bridge|lip|cheek plane|jaw and chin/i.test(p.name)),'The complete anatomical face is a single dense surface without layered feature meshes');
 const ray=new T.Raycaster(),depth=(x,y)=>{
  ray.set(new T.Vector3(x,y,40).applyMatrix4(sculpture.root.matrixWorld),new T.Vector3(0,0,-1).transformDirection(sculpture.root.matrixWorld));
  const hit=ray.intersectObjects(meshes,false)[0];assert(hit,'Anatomical ray hits real sculpted copper');return sculpture.root.worldToLocal(hit.point).z;
 };
 check(depth(0,11)>depth(3.3,10)+1.4,'The continuous nose bridge projects ahead of the cheek plane');
 check(depth(2.5,12.15)<depth(2.5,13.45)-.25,'Eye sockets are cut into the same surface below the brow planes');
 check(depth(0,6.58)<depth(0,6.9)-.1,'Closed lips are modelled by a fine recessed seam in the face');
 check(d.headMinimum>libertyWaterHeight(LIBERTY_LOCATION.x,LIBERTY_LOCATION.z)+80,'The head belongs to a fully standing statue above the sea');
 check(d.torchMinimum>d.headMinimum+35,'The gilded torch towers above the head');
 check(parts.some(p=>p.name==='Lowered left arm cradling the tablet')&&parts.some(p=>p.name==='Liberty tablet — bevelled copper with chamfered corner'),'The full standing silhouette includes the left arm and tablet');
 check(parts.filter(p=>/^(Left|Right) copper foot$/.test(p.name)).length===2&&parts.filter(p=>/^(Left|Right) sandal sole$/.test(p.name)).length===2,'Both actual feet and sandal soles are modelled');
 let stoneBelow=0,copperAbove=0,radius=0,triangles=0,copperMinimum=Infinity,footMinimum=Infinity,footY=Infinity;
 const point=new T.Vector3();
 for(const object of meshes){
  const g=object.geometry,p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color;triangles+=g.index.count/3;
  check(p.count===n.count&&n.count===c.count,'Every vertex has normals and patinated copper colour');
  for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i).applyMatrix4(object.matrixWorld);
   check(Number.isFinite(point.x+point.y+point.z),'All sculpture vertices are finite');
   check(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.00001,'All transformed sculptural normals are unit length');
   radius=Math.max(radius,Math.hypot(point.x,point.z));const water=libertyWaterHeight(point.x,point.z);
   if(object.userData.materialKind==='stone'){if(point.y<water)stoneBelow++;}
   else{check(point.y-water>=2.5,'Every real copper vertex remains more than 2.5 m above the actual curved sea');check(point.y>=-93.50001,'Copper never drops below the absolute calm-wave safety height');copperMinimum=Math.min(copperMinimum,point.y-water);copperAbove++;}
  }
  for(const part of object.userData.parts){
   if(['Standing pleated robe','Raised right arm — continuous fluted sleeve','Lowered left arm cradling the tablet'].includes(part.name)){
    const sides=mobile?36:56,steps=mobile?28:44;
    for(const row of [4,Math.floor(steps/2),steps-4]){
     const center=new T.Vector3();for(let k=0;k<sides;k++)center.add(new T.Vector3().fromBufferAttribute(p,part.vertexStart+row*(sides+1)+k));center.multiplyScalar(1/sides);
     let sum=0;for(let k=0;k<sides;k++){const index=part.vertexStart+row*(sides+1)+k,radial=new T.Vector3().fromBufferAttribute(p,index).sub(center),normal=new T.Vector3().fromBufferAttribute(n,index);sum+=normal.dot(radial);}
     check(sum>0,'Pleated cloth faces and normals point outward so the exterior is visible');
    }
   }
   if(!/copper foot|sandal sole/i.test(part.name))continue;
   for(let i=part.vertexStart;i<part.vertexStart+part.vertexCount;i++){
    point.fromBufferAttribute(p,i).applyMatrix4(object.matrixWorld);
    footMinimum=Math.min(footMinimum,point.y-libertyWaterHeight(point.x,point.z));footY=Math.min(footY,point.y);
   }
  }
 }
 check(radius<110&&d.insideCalmWater,'Every vertex stays in the ocean shader calm collar, at every animation time');
 check(copperMinimum>=2.5&&footMinimum>=2.5&&d.feetAboveWater&&d.entireStatueAboveSea&&!d.submergedBody,'The full copper statue including its lowest feet remains dry');
 check(stoneBelow>0&&copperAbove>0,'Only the stone foundation enters the ocean');
 check(Math.abs(footY-d.pedestalSupport.topY)<.00001&&d.pedestalSupport.footContact,'Both sandal soles touch the supporting stone top exactly');
 const stoneMeshes=meshes.filter(o=>o.userData.materialKind==='stone');
 for(const [x,z] of [[-4,5],[4,8]]){
  ray.set(new T.Vector3(x,-86.99,z).applyMatrix4(sculpture.root.matrixWorld),new T.Vector3(0,-1,0));
  const hit=ray.intersectObjects(stoneMeshes,false)[0];check(!!hit&&Math.abs(hit.point.y-footY)<.00001,'A physical stone surface immediately supports each foot');
 }
 check(triangles===d.triangles&&triangles<(mobile?45000:80000),'Real triangle count stays inside the device budget');
 const initial=d.time;sculpture.update(10,null,false);sculpture.update(10,null,false);check(sculpture.diagnostics().time===initial,'Reduced motion freezes torch light time');
 sculpture.update(.05,null,true);check(sculpture.diagnostics().time>initial,'Trusted parent clock can advance torch light');
 let freed=0;for(const object of meshes)object.geometry.addEventListener('dispose',()=>freed++);
 sculpture.dispose();sculpture.dispose();check(scene.children.length===0&&freed===5&&sculpture.diagnostics().disposed,'Disposal is complete and idempotent');
}
console.log('PASS '+checks+' standing Liberty geometry checks');
