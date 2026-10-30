import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createNewYorkGallery} from '../../space/gallery-new-york.mjs';
import {createModernGallery} from '../../space/gallery-modern.mjs';
import {NEW_YORK_FLOORS,NEW_YORK_FLOOR_RECTS,NEW_YORK_RAMPS,NEW_YORK_RAMP_TURNS,NEW_YORK_CONNECTORS,newYorkConnectorHeight,NEW_YORK_EXHIBITION_WALLS} from '../../space/gallery-new-york-layout.mjs';
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
for(const mobile of [false,true]){
 const scene=new T.Scene(),gallery=createNewYorkGallery(scene,null,{mobile});scene.updateMatrixWorld(true);
 const d=gallery.diagnostics();check(d.levels===5&&d.topFloorSetback.maxX===10,'Five storeys end in a smaller penthouse');
 check(d.ramps===16&&d.stairs===0&&d.minimalWhiteInterior,'The building uses inclined aisles and white galleries');
 check(d.facadeOnlyMasonry&&d.windowsFrontOnly&&d.glassSides&&d.glassRear&&d.glassRoof,'Only the front elevation is masonry; the remaining envelope is glass');
 check(d.windows===28&&gallery.facadeWindows.every(w=>w.minX>=3.4||w.maxX<=-3.4),'Every facade window stays completely outside the central TOTEHM spine');
 check(d.flooring.sameAsLisbon&&d.flooring.ancientStone.physicalSlabs,'Every New York level uses actual Lisbon opus-romain stone');
 check(d.ruinedHistoricFacade&&d.brokenMasonryCrown&&d.modernGlassSeal,'The surviving historical facade has a physically broken crown inside a complete modern glass seal');
 const ray=new T.Raycaster();
 for(const x of [-8.0,8.6]){
  ray.set(new T.Vector3(x,26.6,0),new T.Vector3(0,0,-1));ray.far=4.5;
  const hits=ray.intersectObjects(gallery.solids);
  check(hits.some(h=>h.object.material?.transparent),'Real glass seals each gap above the broken old crown');
  check(!hits.some(h=>!h.object.material?.transparent),'Each missing crown section is a real empty masonry silhouette, not a painted patch');
 }
 ray.set(new T.Vector3(0,26.4,0),new T.Vector3(0,0,-1));
 check(ray.intersectObjects(gallery.solids).some(h=>!h.object.material?.transparent),'The central TOTEHM spine remains complete and windowless above the ruins');ray.far=Infinity;
 const floorHit=(x,y,z)=>{ray.set(new T.Vector3(x,y+.04,z),new T.Vector3(0,-1,0));return ray.intersectObjects(gallery.walkable).find(h=>h.point.y<=y+.001&&h.point.y>=y-.0275);};
 for(const r of NEW_YORK_FLOOR_RECTS){
  const hit=floorHit((r.minX+r.maxX)/2,r.y,(r.minZ+r.maxZ)/2);
  check(!!hit&&(hit.object.userData.ancientStone||hit.object.userData.ancientMortar),'Every collision floor rectangle is covered by the actual Lisbon stone system');
  check(!!hit&&hit.point.y<=r.y+.001&&hit.point.y>=r.y-.0275,'Worn stone arrises stay within the original Lisbon walking-height envelope');
 }
 for(const r of NEW_YORK_RAMPS){
  const object=gallery.root.getObjectByName(r.id);check(gallery.walkable.includes(object),'All inclined aisles accept floor raycasts');
  for(const t of [.05,.25,.5,.75,.95]){
   const x=r.from.x+(r.to.x-r.from.x)*t,y=r.from.y+(r.to.y-r.from.y)*t,z=r.from.z+(r.to.z-r.from.z)*t;
   const hit=floorHit(x,y,z);
   check(!!hit&&hit.point.y<=y+.001&&hit.point.y>=y-.0275,'Real stone arrises follow the inclined analytic walking surface');
   check(hit.face.normal.y>0,'Ramps have upward-facing walkable stone normals');
  }
 }
 for(const p of NEW_YORK_RAMP_TURNS){check(!!floorHit(p.x,p.y,p.z),'Corner landing has real stone covering at its physical walking height');}
 for(const c of NEW_YORK_CONNECTORS){for(let ix=0;ix<=10;ix++)for(let iz=0;iz<=10;iz++){const x=c.minX+(c.maxX-c.minX)*(.02+.096*ix),z=c.minZ+(c.maxZ-c.minZ)*(.02+.096*iz),y=newYorkConnectorHeight(c,x,z);check(!!floorHit(x,y,z),'Worn stone connectors cover the complete shared bilinear walking surface');}}
 ray.set(new T.Vector3(0,1.65,5),new T.Vector3(0,0,-1));const doorway=ray.intersectObjects(gallery.solids).filter(h=>h.distance<8);check(doorway.length===0,'Entrance masonry has a real full-height doorway');
 for(const [from,to] of [[[14,9.41,-9.4],[-14,9.41,-9.4]],[[0,9.41,-18],[0,9.41,-4]]]){
  const a=new T.Vector3(...from),b=new T.Vector3(...to);ray.set(a,b.clone().sub(a).normalize());ray.far=a.distanceTo(b);
  check(!ray.intersectObjects(gallery.solids).some(h=>!h.object.material.transparent),'Side and rear glazing have no concealed brick wall behind the glass');
 }ray.far=Infinity;
 ray.set(new T.Vector3(-8,29,-15.2),new T.Vector3(0,-1,0));const roofHits=ray.intersectObjects(gallery.solids).filter(h=>h.point.y>26);check(roofHits.length===0,'Smoke outlet is a genuine opening through the top roof');
 ray.set(new T.Vector3(0,26,-9.4),new T.Vector3(0,-1,0));check(!ray.intersectObjects(gallery.walkable).some(h=>h.point.y>1),'Atrium stays physically open through every upper floor');
 ray.set(new T.Vector3(0,29,-9.4),new T.Vector3(0,-1,0));check(!ray.intersectObjects(gallery.solids).some(h=>h.point.y>26&&!h.object.material.transparent),'The glass roof has no opaque ceiling hiding the sky');
 for(const [name,x,z] of [['west',-11.5,-9.5],['east',11.5,-9.5],['back',0,-16.5],['front',0,-3]]){
  const object=gallery.root.getObjectByName('Setback roof terrace — '+name);check(gallery.walkable.includes(object),'Setback roof terrace is a rendered walkable surface');check(!!floorHit(x,21.71,z),'Lower roof terrace has the same stone and 21.71-metre collision support');
 }
 check(gallery.exhibitionWalls.length===10&&gallery.artSurfaces.flatMap(w=>w.slots).length===29,'Every floor has white wall surfaces reserved for future digital artworks');
 for(const floor of NEW_YORK_FLOORS.keys())check(gallery.artSurfaces.filter(s=>s.floor===floor).length===2,'Two separate exhibition walls serve each physical floor');
 for(const wall of NEW_YORK_EXHIBITION_WALLS){
  const object=gallery.root.getObjectByName(wall.id);check(gallery.solids.includes(object)&&object.material.color.r>.8,'Reserved art surfaces are actual plain white opaque walls');
  for(const slot of wall.slots){const from=new T.Vector3(...wall.approach),target=new T.Vector3(...slot.position);ray.set(from,target.clone().sub(from).normalize());ray.near=.03;ray.far=from.distanceTo(target)+.03;
   const hit=ray.intersectObjects(gallery.solids).find(h=>h.object.visible&&!h.object.material?.transparent);check(hit?.object===object,'The viewing area sees its art wall without a ramp or other partition in front');
  }
 }
 ray.near=0;ray.far=Infinity;
 // Compare both places, including every tongue vertex and the physical
 // perforations, so they cannot silently diverge into similar drawings.
 const lisbon=createModernGallery(new T.Scene(),null,{mobile});
 lisbon.root.updateMatrixWorld(true);
 for(const y of [7.21,7.30,7.60]){
  ray.set(new T.Vector3(0,y,3),new T.Vector3(0,0,-1));
  check(ray.intersectObject(lisbon.root,true)[0]?.object.name==='Original mouth — rounded three-dimensional lips','The projecting cornice never cuts in front of Lisbon’s original mouth silhouette');
 }
 for(const name of ['Original mouth — rounded three-dimensional lips','Volumetric tongue curving out of the facade','Dimensional original THP — twelve genuine edge notches']){
  const a=gallery.root.getObjectByName(name),b=lisbon.root.getObjectByName(name);check(!!a&&!!b,'Both places carry the original sculpted facade');
  assert.deepEqual(a.geometry.attributes.position.array,b.geometry.attributes.position.array);checks++;
  assert.deepEqual(a.geometry.index?.array,b.geometry.index?.array);checks++;
 }
 const sign=gallery.root.getObjectByName('The original mouth — sculpted tongue and dimensional THP');
 check(sign.position.x===0&&sign.position.y===14&&sign.scale.x===2.6,'The monumental original TOTEHM tongue occupies the middle of the facade');
 const signBounds=new T.Box3().setFromObject(sign);check(signBounds.max.x-signBounds.min.x>6&&signBounds.max.y-signBounds.min.y>7,'The actual sign is over six metres wide and seven metres tall');
 lisbon.dispose();gallery.dispose();check(scene.children.length===0,'Complete architecture and its lights release on disposal');
}
console.log('PASS '+checks+' New York rendered-surface checks');
