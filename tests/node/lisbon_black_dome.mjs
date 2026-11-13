import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createModernGallery} from '../../space/gallery-modern.mjs';
import {createNewYorkGallery} from '../../space/gallery-new-york.mjs';
import {createModernPhysics,createModernWalkway} from '../../space/gallery-modern-navigation.mjs';
import {DOME,LISBON_DOME_SIGNS,INTENTIONS} from '../../space/gallery-lisbon-dome-layout.mjs';
import {streetClipUrl} from '../../space/gallery-lisbon-street-performance.mjs';
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
const colors=['#E24B4A','#e48b31','#fcbe21','#378ADD','#1D9E75','#7F77DD','#639922'];
assert.deepEqual(INTENTIONS.map(i=>i.color),colors);
check(streetClipUrl('../private')===null&&streetClipUrl('unknown')===null,'Only the canonical public clip IDs can select a media source');
for(const mobile of [false,true]){
 const scene=new T.Scene(),gallery=createModernGallery(scene,null,{mobile});scene.updateMatrixWorld(true);const d=gallery.diagnostics();
 check(d.pavement.boatCentre[0]===-6.5&&d.pavement.boatCentre[1]===11,'The original caravel remains visible outside the dome footprint');
 check(d.kind==='lisbon-black-higher-dome'&&d.blackExterior&&d.blackInterior,'Lisbon uses the complete black dome');
 const shell=gallery.root.getObjectByName('Raw black dome — open entrance and smoke oculus');
 check(shell?.isMesh&&shell.material.color.getHex()===0&&shell.geometry.attributes.position.count>2000,'The dome is an actual raw-black curved mesh');
 const p=shell.geometry.attributes.position;for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));
 for(const x of [-2.15,0,2.15]){
  const ray=new T.Raycaster(new T.Vector3(x,1.65,12),new T.Vector3(0,0,-1),0,10);
  check(ray.intersectObjects(gallery.solids).length===0,'The entrance is genuinely empty at visitor height: '+x);
 }
 const down=new T.Raycaster(new T.Vector3(0,16,-5),new T.Vector3(0,-1,0));
 check(down.intersectObject(shell).length>0,'The black dome has a physically rendered roof');
 down.ray.origin.set(DOME.oculus.x,16,DOME.oculus.z);
 check(down.intersectObject(shell).length===0,'The right-hand fire has a real opening in the roof');
 down.ray.origin.x+=.7;check(down.intersectObject(shell).length>0,'The dome resumes next to the smoke opening');
 const signs=[],cases=[],seams=[];gallery.root.traverse(o=>{if(o.userData.lisbonStreetSign)signs.push(o);if(o.userData.premiumPackaging)cases.push(o);if(o.userData.intention)seams.push(o);});
 check(signs.length===22&&new Set(signs.map(s=>s.userData.signId)).size===22,'All 22 original signs remain unique physical objects');
 for(const sign of LISBON_DOME_SIGNS){
  const object=signs.find(o=>o.userData.signId===sign.id),sticker=object.getObjectByName('Higher sticker — '+sign.id);
  check(sticker?.isMesh&&sticker.scale.x<=.35,'The '+sign.id+' cue retains a small physical Higher sticker');
  check(streetClipUrl(sign.id).endsWith('/'+sign.id+'.mp4'),'The '+sign.id+' cue selects its own original animation');
  if(sign.mount==='shell'){
   const normal=new T.Vector3(...sign.normal),ray=new T.Raycaster(new T.Vector3(...sign.position),normal.negate(),0,sign.bracketDepth?1.5:.7);
   check(ray.intersectObjects(gallery.solids).length>0,'The '+sign.id+' cue is attached to actual black structure');
  }
 }
 check(seams.length===14&&new Set(seams.map(o=>o.userData.intention)).size===7,'Seven exact intention colours continue from floor into the dome');
 check(cases.length===6&&cases.every(c=>c.userData.dimensions[0]<.125),'Six much smaller original premium cases sit on the laboratory table');
 const moving=cases[3],rest=moving.position.clone();gallery.setInspecting(true);for(let i=0;i<160;i++)gallery.update(.025,new T.Vector3(0,1.65,-.5));
 check(moving.position.distanceTo(rest)>.8&&moving.scale.x===1,'Inspection brings the same small case close without changing its scale');
 gallery.setInspecting(false);for(let i=0;i<160;i++)gallery.update(.025);check(moving.position.distanceTo(rest)<.002,'Leaving inspection returns that case to its table');
 check(d.laboratory.scientificGlass&&gallery.root.getObjectByName('Analytical balance base')&&gallery.root.getObjectByName('Laboratory glass neck'),'The black interior contains real analytical glass and instruments');
 const higher=gallery.root.getObjectByName('Boutique — original Higher piece in space');higher.geometry.computeBoundingBox();
 check(higher.geometry.userData.perforations===18&&higher.geometry.boundingBox.getSize(new T.Vector3()).z>.03,'The native Higher piece has genuine extrusion and eighteen physical notches');
 const nav=createModernWalkway(gallery.obstacles),body=createModernPhysics({x:0,z:16},gallery.obstacles,gallery.roofProfile);
 for(const station of [...gallery.stations,...LISBON_DOME_SIGNS]){
  const destination={x:station.approach[0],z:station.approach[2]},route=nav.route(body.position,destination);
  check(route?.length>=2,'The '+station.id+' station has a real walkable route');
  for(const point of route.slice(1)){
   for(let i=0;i<1600&&Math.hypot(body.position.x-point.x,body.position.z-point.z)>.003;i++){
    const dx=point.x-body.position.x,dz=point.z-body.position.z,length=Math.hypot(dx,dz),stride=Math.min(.12,length);body.step(.025,{dx:dx/length*stride,dz:dz/length*stride,guided:true});
   }
   check(Math.hypot(body.position.x-point.x,body.position.z-point.z)<.004,'The visitor body physically reaches the '+station.id+' waypoint');
  }
 }
 const jumper=createModernPhysics({x:0,z:-5},gallery.obstacles,gallery.roofProfile);check(jumper.jump(),'A visitor can intentionally jump indoors');
 for(let i=0;i<80;i++)jumper.step(.025);check(jumper.diagnostics().headContacts===1&&jumper.diagnostics().grounded,'The curved black roof stops a fast jump without tunnelling');
 const before=scene.children.length;gallery.performance.start('priority');check(gallery.performance.diagnostics().mediaSource.endsWith('/priority.mp4'),'The integrated artwork uses the original public film');
 gallery.dispose();gallery.dispose();check(before>0&&scene.children.length===0,'The new dome disposes repeatably, including its street player');
 const ny=createNewYorkGallery(scene,null,{mobile});check(ny.diagnostics().kind==='coastal-castle-glass-museum'&&!ny.performance,'New York keeps its independent existing architecture');ny.dispose();
}
console.log('PASS '+checks+' Lisbon black dome geometry, supports and movement checks');
