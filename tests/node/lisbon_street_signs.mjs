// Real geometry, masonry support, visitor paths and pickable sticker faces.
import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createModernGallery} from '../../space/gallery-modern.mjs';
import {createNewYorkGallery} from '../../space/gallery-new-york.mjs';
import {createModernPhysics,createModernWalkway} from '../../space/gallery-modern-navigation.mjs';
import {GALLERY_LAYOUT as L,GALLERY_STATIONS} from '../../space/gallery-modern-layout.mjs';
import {castleFabricPlan} from '../../space/gallery-castle-plan.mjs';
import {LISBON_STREET_SIGNS,LISBON_SIGN_OBSTACLES} from '../../space/gallery-lisbon-signs-layout.mjs';

let checks=0;
const check=(value,message)=>{assert(value,message);checks++;};
const canonicalIds=['fire_exit','Heli','aed','green_walk','red_walk','pharma','destination','lisboa_city_hall','speed_bump_caution','crosswalk_caution','no_entry','no_parking','hospital','parking','Hotel','dead_end','roundabout','left_or_straight','no_uturn','priority','crosswalk','stop'];
const placements=LISBON_STREET_SIGNS;
assert.deepEqual(placements.map(s=>s.id).sort(),canonicalIds.slice().sort(),'The physical signs preserve every canonical identifier from the native experience');
assert.equal(new Set(placements.map(s=>s.id)).size,22,'The layout has exactly twenty-two distinct original signs');
assert.equal(placements.filter(s=>s.zone==='outside').length,12,'Twelve original signs inhabit the exterior calçada');
assert.equal(placements.filter(s=>s.zone==='inside').length,10,'Ten original signs inhabit the gallery');
const signGroups=root=>{const result=[];root.traverse(o=>{if(o.userData.lisbonStreetSign)result.push(o);});return result;};
for(const mobile of [false,true]){
 const scene=new T.Scene(),gallery=createModernGallery(scene,null,{mobile});scene.updateMatrixWorld(true);
 const signs=signGroups(gallery.root),masonry=gallery.solids.filter(o=>o.userData.castleFabric);
 check(signs.length===placements.length,'Lisbon physically contains all twenty-two original street signs on '+(mobile?'mobile':'desktop'));
 for(const expected of placements){
  const sign=signs.find(o=>o.userData.signId===expected.id);
  check(sign,'The '+expected.id+' street sign exists');
  const position=sign.getWorldPosition(new T.Vector3());
  check(position.distanceTo(new T.Vector3(...expected.position))<.0001,'The '+expected.id+' sign occupies its selected street-scale placement');
  const forward=new T.Vector3(0,0,1).applyQuaternion(sign.getWorldQuaternion(new T.Quaternion()));
  const expectedForward=new T.Vector3(Math.sin(expected.rotationY),0,Math.cos(expected.rotationY));
  check(forward.distanceTo(expectedForward)<.0001,'The '+expected.id+' sign faces the visitor side of the masonry');
  check(expected.width>=.8&&expected.width<=1.2,'The '+expected.id+' panel remains at full street-sign scale');
  check(sign.userData.zone===expected.zone&&sign.userData.mount===expected.mount,'The '+expected.id+' sign uses its intended inside/outside mounting');
  if(expected.mount==='stone')check(sign.userData.wallMounted&&sign.userData.support==='stone','The '+expected.id+' sign retains its stone-wall attachment');
  else{
   check(!sign.userData.wallMounted&&sign.userData.support==='galvanized-post','The '+expected.id+' sign is an independent street post');
   const post=sign.getObjectByName('Full-height galvanized street post — '+expected.id),foot=sign.getObjectByName('Anchored street-post foot — '+expected.id);
   check(post?.isMesh&&foot?.isMesh,'The '+expected.id+' sign has a real full-height post and anchored foot');
   const postBounds=new T.Box3().setFromObject(post),footBounds=new T.Box3().setFromObject(foot),centre=postBounds.getCenter(new T.Vector3());
   check(Math.abs(postBounds.min.y-L.groundY)<.0001&&Math.abs(footBounds.min.y-L.groundY)<.0001,'The '+expected.id+' post and foot rest on the actual paving');
   check(postBounds.max.y>expected.position[1]&&postBounds.max.y<expected.position[1]+expected.width/2,'The '+expected.id+' post reaches the raised sign without protruding above it');
   const obstacle=gallery.obstacles.find(o=>o.id==='lisbon-sign-post-'+expected.id);
   check(obstacle&&obstacle.minX<=postBounds.min.x&&obstacle.maxX>=postBounds.max.x&&obstacle.minZ<=postBounds.min.z&&obstacle.maxZ>=postBounds.max.z,'The '+expected.id+' physical post is enclosed by its collision obstacle');
   check(obstacle.minY===L.groundY&&obstacle.maxY+.00001>=postBounds.max.y,'The '+expected.id+' collision runs from paving through the sign support');
  }
  check(typeof sign.userData.phrase==='string'&&sign.userData.phrase.length>5,'The '+expected.id+' sign carries its original experience phrase');
  const sticker=sign.getObjectByProperty('name','Higher sticker — '+expected.id);
  check(sticker?.isMesh,'The '+expected.id+' sign has a physical Higher sticker');
  sticker.geometry.computeBoundingBox();
  const size=sticker.geometry.boundingBox.getSize(new T.Vector3());
  check(Math.abs(size.x*Math.abs(sticker.scale.x)/(size.y*Math.abs(sticker.scale.y))-3)<.01,'The '+expected.id+' Higher sticker preserves the original 3:1 ratio');
  const signFace=sign.getObjectByName('Original Lisbon sign — '+expected.id);
  check(signFace?.isMesh&&sticker.position.z>signFace.position.z,'The '+expected.id+' Higher sticker sits in front of its original sign image');
  if(expected.mount==='stone')for(const dx of [-expected.width*.42,0,expected.width*.42])for(const dy of [-expected.width*.32,0,expected.width*.32]){
   const sample=position.clone().add(new T.Vector3(dx,dy,0).applyQuaternion(sign.getWorldQuaternion(new T.Quaternion())));
   const supportRay=new T.Raycaster(sample,forward.clone().negate(),0,1.25);
   check(supportRay.intersectObjects(masonry).length>0,'Real stone supports '+expected.id+' at offset '+dx+','+dy);
  }
  const stickerCentre=sticker.getWorldPosition(new T.Vector3());
  const hitRay=new T.Raycaster(stickerCentre.clone().addScaledVector(forward,.6),forward.clone().negate(),0,1);
  const hit=hitRay.intersectObjects(gallery.pickables).find(h=>h.object.userData.kind==='lisbon-street-sign'&&h.object.userData.signId===expected.id);
  check(hit,'An actual ray picks the '+expected.id+' sign through its Higher sticker');
  sign.traverse(o=>{const vertices=o.geometry?.attributes.position;if(!vertices)return;for(let i=0;i<vertices.count;i++)assert(Number.isFinite(vertices.getX(i)+vertices.getY(i)+vertices.getZ(i)),expected.id+' contains finite geometry');});
 }
 // The full collection must leave the entry, original arches and floor routes
 // usable by the same body that actually walks through the gallery.
 for(const arch of castleFabricPlan('lisbon').arches){
  const origin=arch.axis==='x'?new T.Vector3(arch.centre,1.65,arch.fixed+arch.depth/2+.7):new T.Vector3(arch.fixed+arch.depth/2+.7,1.65,arch.centre);
  const direction=arch.axis==='x'?new T.Vector3(0,0,-1):new T.Vector3(-1,0,0);
  const ray=new T.Raycaster(origin,direction,0,arch.depth+1.4);
  check(ray.intersectObjects(signs,true).length===0,'Street signs leave the '+arch.id+' passage open');
 }
 const entranceRay=new T.Raycaster(new T.Vector3(0,1.65,3),new T.Vector3(0,0,-1),0,8);
 check(entranceRay.intersectObjects(signs,true).length===0,'Street signs leave the central entrance open');
 const nav=createModernWalkway(gallery.obstacles),body=createModernPhysics({x:L.entry[0],z:L.entry[2]},gallery.obstacles);
 check(LISBON_SIGN_OBSTACLES.every(o=>gallery.obstacles.some(actual=>actual.id===o.id)),'The actual Lisbon navigation receives every street-post collision');
 check(nav.clear({x:L.entry[0],z:L.entry[2]},{x:L.inside[0],z:L.inside[2]}),'The central arrival axis remains uninterrupted by street posts');
 const priority=signs.find(s=>s.userData.signId==='priority'),priorityPost=priority.getObjectByName('Full-height galvanized street post — priority');
 const postCentre=new T.Box3().setFromObject(priorityPost).getCenter(new T.Vector3());
 const walkingBody=createModernPhysics({x:postCentre.x,z:postCentre.z+.8},gallery.obstacles);
 for(let i=0;i<100;i++)walkingBody.step(.025,{dz:-.025});
 check(walkingBody.position.z>postCentre.z+.18&&walkingBody.position.z<postCentre.z+.5,'The real visitor body meets the Priority post rather than walking through it');
 check(walkingBody.diagnostics().grounded,'Walking against the Priority post preserves support on the calçada');
 for(const station of GALLERY_STATIONS){
  const eye={x:body.position.x,y:body.position.y+L.eyeHeight,z:body.position.z};
  const route=nav.route(eye,{x:station.approach[0],y:station.approach[1],z:station.approach[2]});
  check(route&&route.length>=2,'The '+station.id+' artwork remains reachable beside the new signs');
  for(const point of route.slice(1)){
   for(let i=0;i<1200&&Math.hypot(body.position.x-point.x,body.position.z-point.z)>.002;i++){
    const dx=point.x-body.position.x,dz=point.z-body.position.z,length=Math.hypot(dx,dz),stride=Math.min(.7,length);
    body.step(.05,{dx:dx/length*stride,dz:dz/length*stride,guided:true});
   }
   check(Math.hypot(body.position.x-point.x,body.position.z-point.z)<.003&&body.diagnostics().grounded,'The physical visitor reaches each waypoint toward '+station.id);
  }
 }
 gallery.dispose();gallery.dispose();
 check(scene.children.length===0,'Lisbon releases the full sign installation repeatably');
 const nyScene=new T.Scene(),ny=createNewYorkGallery(nyScene,null,{mobile});
 check(signGroups(ny.root).length===0,'New York contains no Lisbon street sign installation');
 check(!ny.pickables.some(o=>o.userData.kind==='lisbon-street-sign'),'New York has no invisible Lisbon sign hit targets');
 ny.dispose();
}
console.log('PASS '+checks+' Lisbon street sign placement and visitor checks');
