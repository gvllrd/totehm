import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createNewYorkGallery} from '../../space/gallery-new-york.mjs';
import {createModernGallery} from '../../space/gallery-modern.mjs';
import {NEW_YORK_FLOOR_RECTS,NEW_YORK_RAMPS,NEW_YORK_RAMP_TURNS,NEW_YORK_CONNECTORS,newYorkConnectorHeight} from '../../space/gallery-new-york-layout.mjs';
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
for(const mobile of [false,true]){
 const scene=new T.Scene(),gallery=createNewYorkGallery(scene,null,{mobile});scene.updateMatrixWorld(true);
 const d=gallery.diagnostics();check(d.levels===5&&d.topFloorSetback.maxX===10,'Five storeys end in a smaller penthouse');
 check(d.ramps===16&&d.stairs===0&&d.minimalWhiteInterior,'The building uses inclined aisles and white galleries');
 const ray=new T.Raycaster();
 for(const r of NEW_YORK_FLOOR_RECTS){
  const object=gallery.root.getObjectByName(r.id);check(!!object,'Every collision floor rectangle is rendered');
  ray.set(new T.Vector3((r.minX+r.maxX)/2,r.y+1,(r.minZ+r.maxZ)/2),new T.Vector3(0,-1,0));
  const hit=ray.intersectObject(object)[0];check(!!hit&&Math.abs(hit.point.y-r.y)<.000002,'Rendered stone slab matches exact collision height');
 }
 for(const r of NEW_YORK_RAMPS){
  const object=gallery.root.getObjectByName(r.id);check(gallery.walkable.includes(object),'All inclined aisles accept floor raycasts');
  for(const t of [.05,.25,.5,.75,.95]){
   const x=r.from.x+(r.to.x-r.from.x)*t,y=r.from.y+(r.to.y-r.from.y)*t,z=r.from.z+(r.to.z-r.from.z)*t;
   ray.set(new T.Vector3(x,y+1,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(object)[0];
   check(!!hit&&Math.abs(hit.point.y-y)<.000003,'Inclined rendered top follows analytic walking surface');
   check(hit.face.normal.y>.9,'Ramps have upward-facing walkable normals');
  }
 }
 for(const p of NEW_YORK_RAMP_TURNS){const object=gallery.root.getObjectByName(p.id);ray.set(new T.Vector3(p.x,p.y+1,p.z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(object)[0];check(!!hit&&Math.abs(hit.point.y-p.y)<.000003,'Corner landing is an actual level stone mesh');}
 for(const c of NEW_YORK_CONNECTORS){const object=gallery.root.getObjectByName(c.id);check(gallery.walkable.includes(object),'Flush gallery joins are walkable rendered surfaces');for(let ix=0;ix<=10;ix++)for(let iz=0;iz<=10;iz++){const x=c.minX+(c.maxX-c.minX)*(.02+.096*ix),z=c.minZ+(c.maxZ-c.minZ)*(.02+.096*iz),y=newYorkConnectorHeight(c,x,z);ray.set(new T.Vector3(x,y+1,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(object)[0];check(!!hit&&Math.abs(hit.point.y-y)<.0007,'Flush stone connectors match the shared bilinear walking height within one millimetre');}}
 ray.set(new T.Vector3(0,1.65,5),new T.Vector3(0,0,-1));const doorway=ray.intersectObjects(gallery.solids).filter(h=>h.distance<8);check(doorway.length===0,'Entrance masonry has a real full-height doorway');
 ray.set(new T.Vector3(-8,29,-15.2),new T.Vector3(0,-1,0));const roofHits=ray.intersectObjects(gallery.solids).filter(h=>h.point.y>26);check(roofHits.length===0,'Smoke outlet is a genuine opening through the top roof');
 ray.set(new T.Vector3(0,26,-9.4),new T.Vector3(0,-1,0));check(!ray.intersectObjects(gallery.walkable).some(h=>h.point.y>1),'Atrium stays physically open through every upper floor');
 for(const [name,x,z] of [['west',-11.5,-9.5],['east',11.5,-9.5],['back',0,-16.5],['front',0,-3]]){
  const object=gallery.root.getObjectByName('Setback roof terrace — '+name);check(gallery.walkable.includes(object),'Setback roof terrace is a rendered walkable surface');ray.set(new T.Vector3(x,24,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(object)[0];check(!!hit&&Math.abs(hit.point.y-21.71)<.000003,'Lower roof terrace matches its 21.71-metre collision support');
 }
 // Clear sight to the target centre alone can leave its chin or crown
 // cropped by deep masonry. Exercise the whole visible head and torch.
 const outlook=new T.Vector3(12.65,17.85,-4.7),targets=[];
 for(const x of [70,76,82])for(const y of [-95.1,-82,-65])for(const z of [-54,-48,-42])targets.push(new T.Vector3(x,y,z));targets.push(new T.Vector3(62,-43,-66));
 for(const target of targets){ray.set(outlook,target.clone().sub(outlook).normalize());ray.near=.03;ray.far=outlook.distanceTo(target)-.1;check(!ray.intersectObjects(gallery.solids).some(h=>h.object.visible&&!h.object.material?.transparent),'The full Liberty head and torch clear the stone window apron');}ray.near=0;ray.far=Infinity;
 // Compare both places, including every tongue vertex and the physical
 // perforations, so they cannot silently diverge into similar drawings.
 const lisbon=createModernGallery(new T.Scene(),null,{mobile});
 for(const name of ['Original mouth — rounded three-dimensional lips','Volumetric tongue curving out of the facade','Dimensional original THP — twelve genuine edge notches']){
  const a=gallery.root.getObjectByName(name),b=lisbon.root.getObjectByName(name);check(!!a&&!!b,'Both places carry the original sculpted facade');
  assert.deepEqual(a.geometry.attributes.position.array,b.geometry.attributes.position.array);checks++;
  assert.deepEqual(a.geometry.index?.array,b.geometry.index?.array);checks++;
 }
 lisbon.dispose();gallery.dispose();check(scene.children.length===0,'Complete architecture and its lights release on disposal');
}
console.log('PASS '+checks+' New York rendered-surface checks');
