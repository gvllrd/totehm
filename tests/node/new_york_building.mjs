import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createNewYorkGallery} from '../../space/gallery-new-york.mjs';
import {createModernGallery} from '../../space/gallery-modern.mjs';
import {NEW_YORK_FLOORS,NEW_YORK_FLOOR_RECTS,NEW_YORK_RAMPS} from '../../space/gallery-new-york-layout.mjs';
import {GALLERY_LAYOUT as L,GALLERY_STATIONS} from '../../space/gallery-modern-layout.mjs';
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
for(const mobile of [false,true]){
 const scene=new T.Scene(),gallery=createNewYorkGallery(scene,null,{mobile});scene.updateMatrixWorld(true);const d=gallery.diagnostics();
 check(d.rebuilt&&d.levels===1&&NEW_YORK_FLOORS.length===1&&NEW_YORK_RAMPS.length===0,'New York is the rebuilt single double-height castle gallery');
 check(d.airyInterior&&d.interiorPartitions===0&&gallery.artSurfaces.length===0,'The former multi-floor partitions leave an uninterrupted room');
 check(d.glassSides&&d.glassRear&&d.glassRoof,'The new clear envelope surrounds substantial old masonry');
 check(d.castle.rectangularKeep&&d.castle.deepReveals&&d.castle.arches===3&&!d.castle.pairedRoundTowers,'The actual castle has an asymmetric keep and three deep arched openings');
 check(d.flooring.continuousStone&&d.flooring.ancientStone.physicalSlabs,'The terrace and interior share physical worn limestone');
 const ray=new T.Raycaster();
 const floorHit=(x,z)=>{ray.set(new T.Vector3(x,L.groundY+.04,z),new T.Vector3(0,-1,0));ray.far=.1;return ray.intersectObjects(gallery.walkable).find(h=>h.point.y<=L.groundY+.001&&h.point.y>=L.groundY-.0275);};
 for(const r of NEW_YORK_FLOOR_RECTS)for(const fx of [.1,.35,.5,.8,.95])for(const fz of [.05,.3,.6,.9]){
  const hit=floorHit(r.minX+(r.maxX-r.minX)*fx,r.minZ+(r.maxZ-r.minZ)*fz);
  check(!!hit&&(hit.object.userData.ancientStone||hit.object.userData.ancientMortar),'Every room section has rendered stone at its physical walking height');
  check(hit.face.normal.y>0,'The exposed walking surface faces upwards');
 }
 for(const [x,z] of [[14,12],[-14,12],[0,15],[0,-5],...GALLERY_STATIONS.map(s=>[s.approach[0],s.approach[2]])])check(!!floorHit(x,z),'Entry terrace and every original artwork approach have real stone support');
 ray.set(new T.Vector3(0,1.65,3),new T.Vector3(0,0,-1));ray.far=5.5;
 check(ray.intersectObjects(gallery.solids).length===0,'The new central entrance is physically open at eye height');
 ray.set(new T.Vector3(0,6,3),new T.Vector3(0,0,-1));
 check(ray.intersectObjects(gallery.solids).some(h=>h.object.material.transparent),'Full-height glass closes the room above the open doorway');
 for(const [from,to] of [[[14,5,-6],[12.7,5,-6]],[[3,5,-20],[3,5,-16.8]]]){
  const a=new T.Vector3(...from),b=new T.Vector3(...to);ray.set(a,b.clone().sub(a).normalize());ray.far=a.distanceTo(b);
  const hits=ray.intersectObjects(gallery.solids);check(hits.some(h=>h.object.material.transparent),'The clear side/rear envelope is built glass');
  check(!hits.some(h=>!h.object.material.transparent),'Unoccupied glass spans have no concealed opaque wall');
 }
 check(gallery.portals.length===GALLERY_STATIONS.length&&gallery.portals.every(p=>GALLERY_STATIONS.some(s=>s.room===p.room&&s.href===p.href)),'Every original independent artwork retains its portal destination');
 const lisbon=createModernGallery(new T.Scene(),null,{mobile});lisbon.root.updateMatrixWorld(true);
 for(const name of ['Original mouth — rounded three-dimensional lips','Volumetric tongue curving out of the facade','Dimensional original THP — twelve genuine edge notches']){
  const a=gallery.root.getObjectByName(name),b=lisbon.root.getObjectByName(name);check(!!a&&!!b,'Both cities retain the actual original sculpted entrance mark');
  assert.deepEqual(a.geometry.attributes.position.array,b.geometry.attributes.position.array);checks++;
  assert.deepEqual(a.geometry.index?.array,b.geometry.index?.array);checks++;
 }
 const sign=gallery.root.getObjectByName('The original mouth — sculpted tongue and dimensional THP'),signBounds=new T.Box3().setFromObject(sign);
 check(sign.position.x>2.8&&sign.scale.x<.5,'The original mark is a discreet element beside the open entrance');
 check(signBounds.max.x-signBounds.min.x<1.2&&signBounds.max.y-signBounds.min.y<1.5,'The small entrance mark leaves the architectural volume and artworks dominant');
 check(d.thpCounter.sheets===6&&d.thpCounter.looseTabs===5&&d.origins.closedBook,'The original physical paper sheets and closed book remain present');
 lisbon.dispose();gallery.dispose();gallery.dispose();check(scene.children.length===0,'The complete structure and lighting dispose repeatably');
}
console.log('PASS '+checks+' rebuilt New York rendered-surface checks');
