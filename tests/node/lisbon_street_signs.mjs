// Physical meaning, small stickers, real supports and the shared walking body.
import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createModernGallery} from '../../space/gallery-modern.mjs';
import {createNewYorkGallery} from '../../space/gallery-new-york.mjs';
import {createModernPhysics,createModernWalkway} from '../../space/gallery-modern-navigation.mjs';
import {LISBON_DOME_LAYOUT as L,LISBON_DOME_STATIONS as GALLERY_STATIONS,LISBON_DOME_SIGNS as LISBON_STREET_SIGNS,LISBON_DOME_OBSTACLES} from '../../space/gallery-lisbon-dome-layout.mjs';
const LISBON_SIGN_OBSTACLES=LISBON_DOME_OBSTACLES.filter(o=>o.id.startsWith('motorway-')||o.id==='pedestrian-signal');
import {createLisbonStreetSigns} from '../../space/gallery-lisbon-street-signs.mjs';

let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
const canonicalIds=['fire_exit','Heli','aed','green_walk','red_walk','pharma','destination','lisboa_city_hall','speed_bump_caution','crosswalk_caution','no_entry','no_parking','hospital','parking','Hotel','dead_end','roundabout','left_or_straight','no_uturn','priority','crosswalk','stop'];
const meanings={Heli:'ground-helipad',crosswalk:'ground-crosswalk',Hotel:'hotel-plaque',aed:'defibrillator',fire_exit:'fire-exit',green_walk:'pedestrian-green',red_walk:'pedestrian-red',lisboa_city_hall:'building-emblem',pharma:'pharmacy',destination:'motorway-sign'};
assert.deepEqual(LISBON_STREET_SIGNS.map(s=>s.id).sort(),canonicalIds.slice().sort(),'Every canonical authored cue is preserved exactly once');
const signGroups=root=>{const result=[];root.traverse(o=>{if(o.userData.lisbonStreetSign)result.push(o);});return result;};
const meshes=root=>{const result=[];root.traverse(o=>{if(o.isMesh)result.push(o);});return result;};
const nameStarts=(root,prefix)=>meshes(root).filter(o=>o.name.startsWith(prefix));
const bounds=object=>new T.Box3().setFromObject(object);
const physicalSize=object=>{object.geometry.computeBoundingBox();return object.geometry.boundingBox.getSize(new T.Vector3()).multiply(object.scale);};
const obstacleContains=(obstacle,b)=>obstacle.minX<=b.min.x+.001&&obstacle.maxX>=b.max.x-.001&&obstacle.minZ<=b.min.z+.001&&obstacle.maxZ>=b.max.z-.001&&obstacle.minY<=b.min.y+.001&&obstacle.maxY>=b.max.y-.001;
for(const mobile of [false,true]){
 const scene=new T.Scene(),gallery=createModernGallery(scene,null,{mobile});scene.updateMatrixWorld(true);
 const signs=signGroups(gallery.root),masonry=gallery.solids.filter(o=>o.userData.domeShell||o.name==='Interior black exit-sign lintel'),byId=id=>signs.find(o=>o.userData.signId===id);
 check(signs.length===22,'Lisbon contains exactly twenty-two distinct physical cues on '+(mobile?'mobile':'desktop'));
 check(signs.some(s=>s.userData.zone==='outside')&&signs.some(s=>s.userData.zone==='inside'),'The original cues occupy both the calçada and the gallery');
 for(const expected of LISBON_STREET_SIGNS){
  const sign=byId(expected.id),meaning=meanings[expected.id]||'road-sign';
  check(sign,'The '+expected.id+' cue exists');
  check(sign.userData.presentation===meaning,'The '+expected.id+' cue is physically presented as '+meaning);
  check(sign.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...expected.position))<.0001,'The '+expected.id+' cue occupies its chosen real-world position');
  const sticker=sign.getObjectByName('Higher sticker — '+expected.id);
  check(sticker?.isMesh,'The '+expected.id+' cue carries an individual small Higher sticker');
  const size=physicalSize(sticker);
  check(Math.abs(size.x/size.y-3)<.01,'The '+expected.id+' sticker keeps its original 3:1 aspect');
  check(size.x<=expected.width*.25+.001,'The '+expected.id+' sticker occupies at most one quarter of its object width');
  check(size.x<=.401,'The '+expected.id+' sticker remains a physical label rather than covering the pictogram');
  const normal=new T.Vector3(0,0,1).applyQuaternion(sticker.getWorldQuaternion(new T.Quaternion())),centre=sticker.getWorldPosition(new T.Vector3());
  const ray=new T.Raycaster(centre.clone().addScaledVector(normal,.6),normal.clone().negate(),0,1.2);
  check(ray.intersectObjects(gallery.pickables).some(h=>h.object.userData.kind==='lisbon-street-sign'&&h.object.userData.signId===expected.id),'The '+expected.id+' physical sticker/face can be picked for its own animation');
  if(expected.mount==='shell'){
   const forward=new T.Vector3(...expected.normal);
   check(new T.Raycaster(new T.Vector3(...expected.position),forward.negate(),0,1.5).intersectObjects(masonry).length>0,'The '+expected.id+' wall object is attached to the actual dome');
  }
  sign.traverse(o=>{const p=o.geometry?.attributes.position;if(p)for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)),expected.id+' contains finite vertices');});
 }
 const heli=byId('Heli'),helipad=heli.getObjectByName('Helipad ground marking');
 check(helipad?.isMesh,'The helicopter cue is a painted ground marking');
 const hb=bounds(helipad),hs=hb.getSize(new T.Vector3());
 check(hb.min.y>=L.groundY-.001&&hb.max.y<=L.groundY+.05&&hs.x>4&&hs.z>4,'The helipad lies horizontally on the terrace at helicopter-pad scale');
 check(nameStarts(heli,'Full-height galvanized').length===0,'The helicopter marking has no invented street-sign post');
 const zebra=byId('crosswalk'),stripes=nameStarts(zebra,'Crosswalk painted stripe');
 check(stripes.length>=5,'The crossing is made of actual painted pedestrian stripes');
 const zb=new T.Box3();for(const stripe of stripes)zb.union(bounds(stripe));const zs=zb.getSize(new T.Vector3());
 check(zb.min.y>=L.groundY-.001&&zb.max.y<=L.groundY+.05&&Math.min(zs.x,zs.z)>=2.5&&Math.max(zs.x,zs.z)>=3.5,'The pedestrian crossing spans a walkable stretch of ground');
 check(nameStarts(zebra,'Full-height galvanized').length===0,'The pedestrian crossing is not mounted as a street sign');
 const hotel=byId('Hotel');check(nameStarts(hotel,'Full-height galvanized').length===0&&LISBON_STREET_SIGNS.find(s=>s.id==='Hotel').width<.7,'The hotel cue is a small building plaque');
 check(LISBON_STREET_SIGNS.find(s=>s.id==='aed').zone==='inside'&&nameStarts(byId('aed'),'Full-height galvanized').length===0,'The defibrillator cue belongs inside the building');
 const green=byId('green_walk'),red=byId('red_walk'),gp=green.getWorldPosition(new T.Vector3()),rp=red.getWorldPosition(new T.Vector3());
 check(Math.hypot(gp.x-rp.x,gp.z-rp.z)<.001&&rp.y-gp.y>.2,'Red and green pedestrian lenses are stacked together at the same crossing');
 const housing=nameStarts(gallery.root,'Shared pedestrian signal housing');check(housing.length===1,'Red and green share one real pedestrian-signal housing');
 const lenses=[green.getObjectByName('Pedestrian signal lens — green_walk'),red.getObjectByName('Pedestrian signal lens — red_walk')];
 check(lenses.every(o=>o?.isMesh),'Both separate pedestrian indications retain their physical lenses');
 const motorway=byId('destination'),supports=nameStarts(motorway,'Motorway galvanized support');
 check(supports.length===2&&LISBON_STREET_SIGNS.find(s=>s.id==='destination').width>=4,'The destination cue is an oversized motorway sign on two supports');
 for(const support of supports){const b=bounds(support);check(Math.abs(b.min.y-L.groundY)<.001&&gallery.obstacles.some(o=>obstacleContains(o,b)),'Each motorway support physically meets paving and has a matching collision');}
 const emblem=byId('lisboa_city_hall').getObjectByName('Lisbon municipal emblem relief');
 check(emblem?.isMesh,'The city emblem is an actual building relief');
 emblem.geometry.computeBoundingBox();check(emblem.geometry.boundingBox.getSize(new T.Vector3()).z>.05,'The city emblem has measurable three-dimensional relief');
 const pharmacy=byId('pharma').getObjectByName('Pharmacy illuminated cross body');
 check(pharmacy?.isMesh,'The pharmacy cue has an extruded illuminated cross body');
 pharmacy.geometry.computeBoundingBox();check(pharmacy.geometry.boundingBox.getSize(new T.Vector3()).z>.15,'The pharmacy cross has real projecting volume');
 const nav=createModernWalkway(gallery.obstacles),body=createModernPhysics({x:L.entry[0],z:L.entry[2]},gallery.obstacles,gallery.roofProfile);
 check(LISBON_SIGN_OBSTACLES.every(o=>gallery.obstacles.some(actual=>actual.id===o.id)),'The real visitor engine receives every new solid support');
 check(!LISBON_SIGN_OBSTACLES.some(o=>o.id==='lisbon-sign-post-crosswalk'||o.id==='lisbon-sign-post-Heli'),'Painted ground cues introduce no solid street-sign obstacle');
 check(nav.clear({x:L.entry[0],z:L.entry[2]},{x:L.inside[0],z:L.inside[2]}),'The central arrival path remains walkable through the painted crossing');
 const entranceRay=new T.Raycaster(new T.Vector3(0,1.65,3),new T.Vector3(0,0,-1),0,8);
 check(entranceRay.intersectObjects(signs,true).length===0,'The cues keep the black dome entrance clear');
 const priority=byId('destination').getObjectByName('Motorway galvanized support — 0'),pc=bounds(priority).getCenter(new T.Vector3());
 const walking=createModernPhysics({x:pc.x,z:pc.z+.8},gallery.obstacles,gallery.roofProfile);for(let i=0;i<100;i++)walking.step(.025,{dz:-.025});
 check(walking.position.z>pc.z+.18&&walking.position.z<pc.z+.5&&walking.diagnostics().grounded,'The real walking body stops at an motorway-sign support');
 for(const station of GALLERY_STATIONS){
  const route=nav.route({x:body.position.x,y:body.position.y+L.eyeHeight,z:body.position.z},{x:station.approach[0],y:station.approach[1],z:station.approach[2]});
  check(route&&route.length>=2,'The '+station.id+' artwork remains reachable');
  for(const point of route.slice(1)){
   for(let i=0;i<1200&&Math.hypot(body.position.x-point.x,body.position.z-point.z)>.002;i++){const dx=point.x-body.position.x,dz=point.z-body.position.z,length=Math.hypot(dx,dz),stride=Math.min(.7,length);body.step(.05,{dx:dx/length*stride,dz:dz/length*stride,guided:true});}
   check(Math.hypot(body.position.x-point.x,body.position.z-point.z)<.003&&body.diagnostics().grounded,'Every waypoint toward '+station.id+' stays physically reachable');
  }
 }
 const ownedGeometries=new Set(meshes(gallery.root.getObjectByName('Lisbon street signs with Higher stickers')).map(o=>o.geometry));let disposedGeometry=0;for(const g of ownedGeometries)g.addEventListener('dispose',()=>disposedGeometry++);
 gallery.dispose();gallery.dispose();check(scene.children.length===0&&disposedGeometry===ownedGeometries.size,'The sign installation releases its visible resources repeatably');
 const nyScene=new T.Scene(),ny=createNewYorkGallery(nyScene,null,{mobile});check(signGroups(ny.root).length===0&&!ny.pickables.some(o=>o.userData.kind==='lisbon-street-sign'),'New York creates neither Lisbon objects nor invisible hit targets');ny.dispose();
}
// The real pharmacy animation must use the parent clock and freeze in reduced motion.
const animationRoot=new T.Group(),installation=createLisbonStreetSigns(animationRoot);
const pharmacyState=()=>{const values=[];animationRoot.traverse(o=>{if(o.name==='Pharmacy illuminated cross body')values.push(o.material.emissiveIntensity);if(o.name==='Pharmacy animated green LED matrix')values.push(...o.instanceMatrix.array);});return JSON.stringify(values);};
const before=pharmacyState();installation.update(.1,new T.Vector3(0,1.65,0),true);const moved=pharmacyState();installation.update(.1,new T.Vector3(0,1.65,0),false);const stopped=pharmacyState();
check(before!==moved,'The luminous pharmacy cross really animates on the parent clock');check(moved===stopped,'The pharmacy light animation freezes with reduced motion');installation.dispose();
console.log('PASS '+checks+' Lisbon cue semantics and visitor checks');
