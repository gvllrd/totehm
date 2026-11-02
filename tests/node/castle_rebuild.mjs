// Exercise the new built geometry and its actual shared movement engine.
import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createModernGallery} from '../../space/gallery-modern.mjs';
import {createNewYorkGallery} from '../../space/gallery-new-york.mjs';
import {createModernPhysics,createModernWalkway} from '../../space/gallery-modern-navigation.mjs';
import {createNewYorkPhysics,createNewYorkWalkway} from '../../space/gallery-new-york-navigation.mjs';
import {GALLERY_LAYOUT as L,GALLERY_STATIONS} from '../../space/gallery-modern-layout.mjs';
import {GLASS_SHELL,GLASS_HEARTH,glassRoofHeight} from '../../space/gallery-glass-shell.mjs';
import {createCastleFabric} from '../../space/gallery-castle-fabric.mjs';
import {createLecternBook} from '../../space/gallery-lectern-book.mjs';
import {createGalleryFireplace} from '../../space/gallery-fireplace.mjs';
import {castleFabricPlan} from '../../space/gallery-castle-plan.mjs';

let checks=0;
const check=(value,message)=>{assert(value,message);checks++;};
for(const [place,factory,physicsFactory,walkwayFactory] of [
 ['lisbon',createModernGallery,createModernPhysics,createModernWalkway],
 ['new-york',createNewYorkGallery,createNewYorkPhysics,createNewYorkWalkway]
]){
 const fabricScene=new T.Scene(),fabric=createCastleFabric(fabricScene,{place});fabricScene.updateMatrixWorld(true);
 for(const arch of castleFabricPlan(place).arches){
  const origin=arch.axis==='x'?new T.Vector3(arch.centre,1.65,arch.fixed+arch.depth/2+.7):new T.Vector3(arch.fixed+arch.depth/2+.7,1.65,arch.centre);
  const direction=arch.axis==='x'?new T.Vector3(0,0,-1):new T.Vector3(-1,0,0);
  const ray=new T.Raycaster(origin,direction,0,arch.depth+1.4);
  check(ray.intersectObjects(fabric.solids).length===0,'The '+place+' '+arch.id+' is a real full-depth arch opening');
 }
 fabric.dispose();
 const scene=new T.Scene(),gallery=factory(scene,null,{mobile:false});scene.updateMatrixWorld(true);
 const d=gallery.diagnostics();
 check(d.levels===1,'The '+place+' rebuild is one open double-height gallery');
 check(gallery.solids.length>0,'The '+place+' building has real collision geometry');
 // Measure the delivered objects, including their tilt and complete case
 // depth, rather than trusting the installation's diagnostic counters.
 const table=gallery.root.getObjectByName('A single floating limestone edition table');
 const tableBounds=new T.Box3().setFromObject(table);
 const cases=gallery.root.children.filter(object=>object.userData.premiumPackaging);
 check(cases.length===6,'The '+place+' table physically holds six premium cases');
 for(const [index,display] of cases.entries()){
  const bounds=new T.Box3().setFromObject(display);
  check(bounds.min.x>tableBounds.min.x&&bounds.max.x<tableBounds.max.x&&bounds.min.z>tableBounds.min.z&&bounds.max.z<tableBounds.max.z,'The '+place+' premium case '+index+' stays entirely over its stone table');
  check(Math.abs(bounds.min.y-tableBounds.max.y)<.002,'The '+place+' premium case '+index+' rests within two millimetres of the tabletop');
 }
 const book=createLecternBook(scene),fire=createGalleryFireplace(scene);scene.updateMatrixWorld(true);
 const slab=gallery.root.getObjectByName('Origins — limestone reading slab in the west keep');
 const plinth=gallery.root.getObjectByName('Solid dressed limestone book plinth');
 check(slab.material===table.material&&plinth.material===table.material,'The '+place+' Origins slab and plinth use the very same stone material as the table');
 check(slab.rotation.x===book.root.rotation.x,'The '+place+' Origins book follows the actual stone reading slope');
 const keep=castleFabricPlan(place).keep;
 for(const [label,object] of [['slab',slab],['plinth',plinth],['book',book.root]]){
  const bounds=new T.Box3().setFromObject(object);
  check(bounds.min.x>keep.minX&&bounds.max.x<keep.maxX&&bounds.min.z>keep.minZ&&bounds.max.z<keep.maxZ,'The complete '+place+' Origins '+label+' stands inside the ruined west keep');
 }
 const masonry=gallery.solids.filter(object=>object.userData.castleFabric);
 for(const direction of [new T.Vector3(-1,0,0),new T.Vector3(1,0,0),new T.Vector3(0,0,-1)]){
  const enclosureRay=new T.Raycaster(new T.Vector3(...L.origins.book),direction,0,3);
  check(enclosureRay.intersectObjects(masonry).length>0,'Actual '+place+' stone encloses the Origins corner along '+direction.toArray().join(','));
 }
 for(const work of [L.play,L.opposite])for(const dx of [-work.screenSize[0]/2,0,work.screenSize[0]/2])for(const dy of [-work.screenSize[1]/2,0,work.screenSize[1]/2]){
  const supportRay=new T.Raycaster(new T.Vector3(work.screen[0]+dx,work.screen[1]+dy,work.screen[2]),new T.Vector3(0,0,-1),0,1);
  check(supportRay.intersectObjects(masonry).length>0,'The '+place+' '+work.id+' screen has solid stone behind offset '+dx+','+dy);
 }
 const hearth=fire.root.getObjectByName('Low limestone campfire lip continuous with the floor');
 const hearthBounds=new T.Box3().setFromObject(hearth),hearthCentre=hearthBounds.getCenter(new T.Vector3());
 check(hearthBounds.min.x>0,'The complete '+place+' hearth is physically on the right of the entrance');
 const outlet=GLASS_HEARTH.smokeOutlet;
 check(Math.abs(hearthCentre.x-outlet.x)<.001&&Math.abs(hearthCentre.z-outlet.z)<.001,'The '+place+' smoke outlet aligns with the centre of the actual hearth');
 const roof=gallery.root.getObjectByName('Single floating glass roof — open star oculus');
 const apertureRay=new T.Raycaster(new T.Vector3(hearthCentre.x,0,hearthCentre.z),new T.Vector3(0,1,0),0,20);
 check(apertureRay.intersectObject(roof).length===0,'The '+place+' glass roof is really open above the relocated fire');
 apertureRay.ray.origin.x+=outlet.radius+.1;
 check(apertureRay.intersectObject(roof).length>0,'The '+place+' glass roof resumes immediately beside the smoke opening');
 book.dispose();fire.dispose();
 const groundRay=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0),0,.4);
 const floorHits=(x,z)=>{groundRay.ray.origin.set(x,L.groundY+.1,z);return groundRay.intersectObjects(gallery.walkable);};
 for(const [x,z] of [[0,4],[15.9,17.8],[-15.9,17.8],[0,-17.9],[-14.5,-9.5],[14.5,-9.5]]){
  const hits=floorHits(x,z),top=hits[0];
  check(top&&Math.abs(top.point.y-L.groundY)<.027,'The '+place+' exterior is supported at the original walking height');
  check(place==='lisbon'?top.object.userData.lisbonPavement:top.object.userData.ancientStone||top.object.userData.ancientMortar,'The '+place+' exterior uses its own original floor material');
  if(place==='lisbon')check(new Set(hits.map(h=>h.object)).size===1,'The Lisbon calçada is not overlaid on stone slabs or mortar');
 }
 check(!floorHits(0,-5).some(h=>h.object.userData.lisbonPavement),'The '+place+' interior keeps its ancient stone floor');
 if(place==='lisbon'){
  const terraces=gallery.walkable.filter(o=>o.userData.lisbonPavement);
  check(terraces.length===4&&terraces.every(o=>o.material===terraces[0].material),'All four original Lisbon terraces share one continuous world-space mosaic');
  check(d.pavement.waves&&d.pavement.boat&&d.pavement.boatCentre.join(',')==='0,4'&&d.pavement.medallionDiameter===7,'The original waves and seven-metre caravel stay in their original position');
 }else check(d.pavement===null&&d.flooring.continuousStone,'The Lisbon restoration leaves the New York terrace unchanged');
 const ray=new T.Raycaster(new T.Vector3(0,1.65,3),new T.Vector3(0,0,-1),0,8);
 check(ray.intersectObjects(gallery.solids).filter(h=>!h.object.material.transparent).length===0,'The '+place+' castle entrance is a genuine empty passage');
 let vertices=0;
 gallery.root.traverse(object=>{
  const p=object.geometry?.attributes.position;if(!p)return;
  for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)),place+' has finite built vertices');
  vertices+=p.count;
 });
 check(vertices>1000,'The '+place+' structure is built geometry rather than a façade picture');
 const nav=walkwayFactory(),body=physicsFactory({x:L.entry[0],z:L.entry[2]});
 const eye=()=>({x:body.position.x,y:body.position.y+L.eyeHeight,z:body.position.z});
 const destinations=[...GALLERY_STATIONS.map(s=>({id:s.id,x:s.approach[0],z:s.approach[2]})),{id:'fire',x:L.fireplace.approach[0],z:L.fireplace.approach[2]},{id:'outside',x:L.entry[0],z:L.entry[2]}];
 for(const destination of destinations){
  const route=nav.route(eye(),{...destination,y:1.65});
  check(route&&route.length>=2,'A '+place+' route exists to '+destination.id);
  for(const point of route.slice(1)){
   for(let i=0;i<1200&&Math.hypot(body.position.x-point.x,body.position.z-point.z)>.002;i++){
    const dx=point.x-body.position.x,dz=point.z-body.position.z,length=Math.hypot(dx,dz),stride=Math.min(.7,length);
    body.step(.05,{dx:dx/length*stride,dz:dz/length*stride,guided:true});
    assert(body.diagnostics().grounded,place+' guidance remains supported');
   }
   check(Math.hypot(body.position.x-point.x,body.position.z-point.z)<.003,'Real '+place+' movement reaches every collision-free waypoint toward '+destination.id);
  }
  check(Math.abs(body.position.y-L.groundY)<.00001,'The '+place+' visit stays on its physical castle floor');
 }
 const jump=physicsFactory({x:0,z:-7});check(jump.jump(),'Intentional jump starts inside '+place);
 let peak=-Infinity;
 for(let i=0;i<480;i++){jump.step(1/120);peak=Math.max(peak,jump.position.y+L.eyeHeight);}
 check(jump.diagnostics().grounded&&jump.diagnostics().headContacts>0,'The '+place+' glass roof stops an actual high-speed jump');
 check(peak<=glassRoofHeight(0,-7)+.025,'The '+place+' roof collision matches the sloped rendered glass');
 const side=physicsFactory({x:10,z:-8});for(let i=0;i<100;i++)side.step(.025,{dx:1});
 check(side.position.x<13,'The '+place+' perimeter blocks a walking body');
 gallery.dispose();gallery.dispose();check(scene.children.length===0,'The '+place+' rebuild disposes its full structure repeatably');
 if(place==='lisbon')check(gallery.diagnostics().pavement.disposed,'The restored Lisbon pavement releases its material and boat texture');
}
check(GLASS_SHELL.maxHeight-GLASS_SHELL.minHeight>1,'The clear roof has a deliberate asymmetric inclination');
console.log('PASS '+checks+' rebuilt castle geometry and movement checks');
