import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createCastleRuins} from '../../space/gallery-castle-ruins.mjs';
import {castleTowers,castleBelvedere,castleObstacles} from '../../space/gallery-heritage-layout.mjs';
import {createNewYorkWalkway} from '../../space/gallery-new-york-navigation.mjs';
import {NEW_YORK_LAYOUT,NEW_YORK_LANDINGS} from '../../space/gallery-new-york-layout.mjs';

let checks=0;
const check=(value,message)=>{assert(value,message);checks++;};
for(const place of ['lisbon','new-york']){
 const scene=new T.Scene(),stone=new T.MeshStandardMaterial(),glass=new T.MeshBasicMaterial({transparent:true}),metal=new T.MeshStandardMaterial();
 const castle=createCastleRuins(scene,{place,stoneMaterial:stone,glassMaterial:glass,metalMaterial:metal});
 scene.updateMatrixWorld(true);
 const d=castle.diagnostics(),ray=new T.Raycaster(),masonry=castle.solids.filter(o=>!o.material.transparent),bounds=castleObstacles(place);
 check(d.towers===2&&d.stoneBlocks>200&&d.triangles<40000,'Two substantial real stone towers remain within a bounded geometry budget');
 for(const tower of castleTowers(place)){
  ray.set(new T.Vector3(tower.x,1.2,2.5),new T.Vector3(0,0,-1));ray.far=3;
  check(ray.intersectObjects(masonry).length===0,'The arched doorway opens into the actual hollow tower');
  ray.set(new T.Vector3(tower.x,3.1,2.5),new T.Vector3(0,0,-1));
  check(ray.intersectObjects(masonry).length>0,'Real stone voussoirs span the open doorway');
  ray.set(new T.Vector3(tower.x,1.2,tower.z),new T.Vector3(0,0,-1));ray.far=2;
  check(ray.intersectObjects(masonry).length>0,'The hollow tower has a real interior rear stone wall');
  const b=castleBelvedere(tower,place);
  ray.set(new T.Vector3(b.x,b.base+b.height/2,2.5),new T.Vector3(0,0,-1));ray.far=2.8;
  check(ray.intersectObjects(masonry).length===0,'The glass belvedere overlooks a genuinely empty front half of the ruined tower');
  ray.set(new T.Vector3(b.x,b.base+b.height+1,b.z),new T.Vector3(0,-1,0));ray.far=1.1;
  check(ray.intersectObjects(castle.solids).some(h=>h.object.material.transparent),'The new glass belvedere has a genuine solid transparent roof');
  check(bounds.some(o=>o.id===tower.id+'-belvedere-roof'&&o.minY<b.base+b.height&&o.maxY>b.base+b.height),'Roof collision uses the same belvedere height as the actual glass');
 }
 for(const object of castle.solids){
  const p=object.geometry.attributes.position;
  for(let i=0;i<p.count;i++)check(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)),'Castle geometry vertices are finite');
 }
 castle.dispose();castle.dispose();check(scene.children.length===0&&castle.diagnostics().disposed,'Castle disposal is complete and repeatable');
 stone.dispose();glass.dispose();metal.dispose();
}
const walkway=createNewYorkWalkway(),eye=NEW_YORK_LAYOUT.eyeHeight,landing=NEW_YORK_LANDINGS[1];
for(const tower of castleTowers('new-york')){
 const route=walkway.route({x:tower.x,y:tower.minY+eye,z:tower.z},{x:landing.x,y:landing.y+eye,z:landing.z});
 check(route?.length>2,'A visitor inside either hollow tower can reach the first exhibition floor');
 check(route.some(p=>Math.abs(p.x-tower.x)<.01&&p.z>tower.z+tower.radius),'The guided route leaves through the actual front arch before approaching the gallery');
}
console.log('PASS '+checks+' physical castle ruin checks');
