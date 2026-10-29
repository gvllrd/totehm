import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createAncientFloor,createAncientStoneSurfaces} from '../../space/gallery-ancient-floor.mjs';

let checks=0;const check=(condition,message)=>{checks++;assert.ok(condition,message);};
const curved=(x,z)=>8+.11*(x-12)*(z-1);
const surfaces=[
 {id:'flat-a',minX:0,maxX:8,minZ:0,maxZ:6,y:3.21,floor:1},
 {id:'flat-b',minX:4,maxX:10,minZ:2,maxZ:8,y:3.21,floor:1},
 {id:'inclined',kind:'ramp',from:{x:-2,y:0,z:-3},to:{x:-2,y:3,z:7},width:2.2,floor:0},
 {id:'curved-connector',minX:12,maxX:14,minZ:0,maxZ:2,y:8,heightAt:curved,floor:2},
 {id:'clipped-sliver',minX:15,maxX:15.024,minZ:0,maxZ:2,y:3.21},
 {id:'duplicate',minX:1,maxX:2,minZ:1,maxZ:2,y:3.21},
 {id:'invalid-ramp',kind:'ramp',from:{x:0,y:0,z:0},to:{x:0,y:1,z:0},width:2}
];
for(const mobile of [false,true]){
 const scene=new T.Scene(),lisbon=createAncientFloor(scene,{mobile}),legacy=lisbon.diagnostics();
 check(legacy.slabs===301,'Lisbon keeps its 301 actual stones');
 check(legacy.triangles===(mobile?42140:75852),'The original Lisbon geometry density remains unchanged');
 check(legacy.bounds.minX===-13&&legacy.bounds.maxX===13&&legacy.bounds.minZ===-17&&legacy.bounds.maxZ===-2,'Lisbon keeps its precise interior bounds');lisbon.dispose();
 const sentinel=new T.Group();scene.add(sentinel);
 const floor=createAncientStoneSurfaces(scene,{mobile,surfaces}),d=floor.diagnostics();scene.updateMatrixWorld(true);
 check(d.surfaces===5&&floor.byId.get('duplicate').length===0,'Overlapping flat surfaces are partitioned and fully covered duplicates are omitted');
 check(!floor.byId.has('invalid-ramp'),'A zero-length ramp never creates invalid GPU geometry');
 check(d.stone.photographedSurface&&d.stone.physicalSlabGeometry&&d.sharedWithLisbon,'Every new surface uses the same real photographed Lisbon limestone');
 check(d.drawCalls===6&&d.slabs>30,'Five actual stone surfaces share one merged mortar draw');
 const p=new T.Vector3();let triangles=0;
 for(const object of floor.solids){
  const g=object.geometry,a=g.attributes.position,n=g.attributes.normal;triangles+=g.index.count/3;
  for(let i=0;i<a.count;i++){
   p.fromBufferAttribute(a,i);check(Number.isFinite(p.x+p.y+p.z),'Every rendered stone and mortar vertex is finite');
   check(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.00001,'Every physical surface has a normalized real geometric normal');
   if(!object.userData.ancientStone)continue;
   const height=object.name==='inclined'?(p.z+3)*.3:object.name==='curved-connector'?curved(p.x,p.z):3.21;
   check(p.y<=height+.000003&&p.y>=height-.02636,'Rounded edges stay below the exact walking plane, with the same wear depth as Lisbon');
   if(object.name==='clipped-sliver')check(p.x>=15-1e-5&&p.x<=15.024+1e-5&&p.z>=-1e-5&&p.z<=2+1e-5,'Even tiny cut stones stay inside their actual floor boundary');
  }
  if(object.name==='curved-connector')for(let i=0;i<g.index.count;i+=3){const ids=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)],x=ids.reduce((sum,j)=>sum+a.getX(j),0)/3,z=ids.reduce((sum,j)=>sum+a.getZ(j),0)/3,y=ids.reduce((sum,j)=>sum+a.getY(j),0)/3;
   check(y<=curved(x,z)+.00071&&y>=curved(x,z)-.0271,'Adaptive stone triangles follow nonlinear connectors without floating above their physical surface');
  }
 }
 check(triangles===d.triangles,'The advertised triangle budget is the real rendered budget');
 const ray=new T.Raycaster(),flatMeshes=[...floor.byId.get('flat-a'),...floor.byId.get('flat-b')];
 for(let ix=0;ix<39;ix++)for(let iz=0;iz<31;iz++){
  const x=.143+ix*.249,z=.131+iz*.247;ray.set(new T.Vector3(x,4,z),new T.Vector3(0,-1,0));ray.near=0;ray.far=1;
  const hits=ray.intersectObjects(flatMeshes,false);check(new Set(hits.map(h=>h.object)).size<=1,'Intersecting gallery rectangles never produce overlapping coplanar stone meshes');
 }
 ray.set(new T.Vector3(3.96,4,3.96),new T.Vector3(0,-1,0));const joint=ray.intersectObjects(floor.solids,false)[0];
 check(joint?.object.userData.ancientMortar&&Math.abs(joint.point.y-3.184)<.000003,'Real dark mortar fills the physical joints below the stones');
 let disposed=0;for(const object of floor.solids)object.geometry.addEventListener('dispose',()=>disposed++);
 floor.dispose();floor.dispose();check(disposed===6&&scene.children.length===1&&scene.children[0]===sentinel&&floor.diagnostics().disposed,'All shared geometry is disposed exactly once without removing unrelated scene objects');
}
console.log('PASS '+checks+' reusable Lisbon stone surface checks');
