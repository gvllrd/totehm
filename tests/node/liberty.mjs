import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createLiberty,LIBERTY_LOCATION,libertyWaterHeight} from '../../space/gallery-liberty.mjs';
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
for(const mobile of [false,true]){
 const scene=new T.Scene(),sculpture=createLiberty(scene,{mobile}),d=sculpture.diagnostics();scene.updateMatrixWorld(true);
 const meshes=sculpture.root.children.filter(o=>o.isMesh),parts=meshes.flatMap(o=>o.userData.parts);
 check(meshes.length===4&&d.drawMeshes===4,'The copper sculpture is batched into four draw calls');
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
 check(d.headMinimum>libertyWaterHeight(LIBERTY_LOCATION.x,LIBERTY_LOCATION.z)+1,'The whole head is clear of the existing calm sea');
 check(d.torchMinimum>d.headMinimum+35,'The gilded torch towers above the head');
 let below=0,above=0,radius=0,triangles=0,bodyMaximum=-Infinity,headMinimum=Infinity;
 const point=new T.Vector3();
 for(const object of meshes){
  const g=object.geometry,p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color;triangles+=g.index.count/3;
  check(p.count===n.count&&n.count===c.count,'Every vertex has normals and patinated copper colour');
  for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i).applyMatrix4(object.matrixWorld);
   check(Number.isFinite(point.x+point.y+point.z),'All sculpture vertices are finite');
   check(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.00001,'All transformed sculptural normals are unit length');
   radius=Math.max(radius,Math.hypot(point.x,point.z));const water=libertyWaterHeight(point.x,point.z);
   if(point.y<water)below++;else above++;
  }
  for(const part of object.userData.parts){
   if(!['Submerged pleated robe','Submerged shoulders','Liberty — classical copper head'].includes(part.name))continue;
   for(let i=part.vertexStart;i<part.vertexStart+part.vertexCount;i++){
    point.fromBufferAttribute(p,i).applyMatrix4(object.matrixWorld);
    if(part.name==='Liberty — classical copper head')headMinimum=Math.min(headMinimum,point.y-libertyWaterHeight(point.x,point.z));
    else bodyMaximum=Math.max(bodyMaximum,point.y-libertyWaterHeight(point.x,point.z));
   }
  }
 }
 check(radius<110&&d.insideCalmWater,'Every vertex stays in the ocean shader calm collar, at every animation time');
 check(bodyMaximum<0&&headMinimum>0,'Water genuinely submerges the robe and shoulders while leaving the head uncovered');
 check(above>0&&below>0,'The same mesh extends above and below the real water surface');
 check(triangles===d.triangles&&triangles<(mobile?33000:60000),'Real triangle count stays inside the device budget');
 const initial=d.time;sculpture.update(10,null,false);sculpture.update(10,null,false);check(sculpture.diagnostics().time===initial,'Reduced motion freezes torch light time');
 sculpture.update(.05,null,true);check(sculpture.diagnostics().time>initial,'Trusted parent clock can advance torch light');
 let freed=0;for(const object of meshes)object.geometry.addEventListener('dispose',()=>freed++);
 sculpture.dispose();sculpture.dispose();check(scene.children.length===0&&freed===4&&sculpture.diagnostics().disposed,'Disposal is complete and idempotent');
}
console.log('PASS '+checks+' submerged Liberty geometry checks');
