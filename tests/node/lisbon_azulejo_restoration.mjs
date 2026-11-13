// Verify the delivered c8ddaf0 architecture, its real collision surfaces and
// the current installations together. No source-text or diagnostic-only test.
import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createCastleSpace} from '../../space/gallery-castle-space.mjs';
// Historical envelope regression. The active Lisbon dome has its own suite.
const createModernGallery=(scene,renderer,options)=>createCastleSpace(scene,renderer,{...options,place:'lisbon',style:'azulejo'});
import {createNewYorkGallery} from '../../space/gallery-new-york.mjs';
import {createModernPhysics,createModernWalkway} from '../../space/gallery-modern-navigation.mjs';
import {GALLERY_LAYOUT as L,GALLERY_STATIONS} from '../../space/gallery-modern-layout.mjs';
import {CASTLE_OBSTACLES} from '../../space/gallery-castle-plan.mjs';
import {LISBON_STREET_SIGNS} from '../../space/gallery-lisbon-signs-layout.mjs';
import {createGalleryFireplace} from '../../space/gallery-fireplace.mjs';

let checks=0;
const check=(value,message)=>{assert(value,message);checks++;};
const opaque=object=>!(Array.isArray(object.material)?object.material: [object.material]).every(m=>m?.transparent);
const names=root=>{const result=[];root.traverse(object=>result.push(...object.userData.facadeParts||[]));return result;};
const legacyIds=new Set(CASTLE_OBSTACLES.map(box=>box.id));
const canonicalIds=['fire_exit','Heli','aed','green_walk','red_walk','pharma','destination','lisboa_city_hall','speed_bump_caution','crosswalk_caution','no_entry','no_parking','hospital','parking','Hotel','dead_end','roundabout','left_or_straight','no_uturn','priority','crosswalk','stop'];
assert.deepEqual(LISBON_STREET_SIGNS.map(s=>s.id).sort(),canonicalIds.slice().sort());

for(const mobile of [false,true]){
 const label=mobile?'mobile':'desktop',scene=new T.Scene(),gallery=createModernGallery(scene,null,{mobile});
 scene.updateMatrixWorld(true);
 const d=gallery.diagnostics(),building=d.azulejoBuilding;
 check(d.kind==='lisbon-azulejo-gallery'&&building?.restoredFrom==='c8ddaf0','Lisbon restores the historic building on '+label);
 check(building.waveGlass&&!building.flatRoof&&d.castle===null,'The restored azulejo pavilion retains its wave glass on '+label);
 check(gallery.roofProfile?.height===gallery.roofHeight&&typeof gallery.roofProfile.smokeOpening==='function','Rendering and physics expose one restored roof profile on '+label);
 check(!gallery.obstacles.some(box=>legacyIds.has(box.id)),'No invisible castle obstacle remains inside the restored pavilion on '+label);

 const facade=gallery.root.getObjectByName('Lisbon — cobalt azulejo street façade');
 check(!!facade,'The complete azulejo street facade is built on '+label);
 const masonry=facade.getObjectByName('Lisbon façade — actual limestone-backed masonry and window apertures');
 const balusters=facade.getObjectByName('Lisbon roofline — turned stone balustrade');
 check(balusters?.isInstancedMesh&&balusters.count===58,'All 58 historic stone balusters are actually rendered on '+label);
 const parts=names(facade);
 check(parts.filter(name=>name==='Traditional front window glazing').length===12,'All twelve historic windows contain real glazing on '+label);
 check(parts.filter(name=>name==='Carved stone Juliet balcony slab').length===8,'All eight upper balconies contain actual stone slabs on '+label);
 check(parts.filter(name=>name==='Hand-curled wrought-iron scroll').length===64,'The balconies retain their paired modelled iron scrolls on '+label);
 for(const y of [1.40,3.95,6.25])for(const x of [-10.25,-5.90,5.90,10.25]){
  const ray=new T.Raycaster(new T.Vector3(x+.36,y+.20,0),new T.Vector3(0,0,-1),0,3);
  check(ray.intersectObject(masonry).length===0,'Window '+x+','+y+' is cut through actual masonry on '+label);
 }
 for(const x of [-8,0,8]){
  const ray=new T.Raycaster(new T.Vector3(x,4.8,0),new T.Vector3(0,0,-1),0,3);
  check(ray.intersectObject(masonry).length>0,'The central bay and sign-bearing masonry piers remain solid on '+label);
 }
 for(const x of [-2.1,0,2.1]){
  const ray=new T.Raycaster(new T.Vector3(x,1.65,3),new T.Vector3(0,0,-1),0,8);
  check(ray.intersectObjects(gallery.solids).filter(hit=>opaque(hit.object)).length===0,'The restored 4.8-metre entrance is a physically empty passage at '+x+' on '+label);
 }
 check(d.facade.position.join(',')==='0,5.45,-1.42'&&d.facade.scale===1.6,'The monumental tongue returns to its historic placement above the entry on '+label);

 const roof=gallery.root.getObjectByName('Wave glass roof — open smoke oculus, no flat lid');
 check(roof?.geometry.attributes.position.count>500,'The glass wave is a real curved surface on '+label);
 const down=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0),0,20),heightSamples=[];
 for(const [x,z] of [[-11,-15],[-7,-9],[0,-7],[7,-10],[11,-4]]){
  down.ray.origin.set(x,15,z);const hits=down.intersectObject(roof);
  check(hits.length>0,'The restored glass physically covers '+x+','+z+' on '+label);
  check(Math.abs(hits[0].point.y-gallery.roofHeight(x,z)-gallery.roofProfile.thickness)<.015,'The rendered curved glass matches its movement profile at '+x+','+z+' on '+label);
  heightSamples.push(hits[0].point.y);
 }
 check(Math.max(...heightSamples)-Math.min(...heightSamples)>.35,'The delivered glass retains visible wave height variation on '+label);
 const outlet=gallery.smokeOutlet;
 down.ray.origin.set(outlet.x,15,outlet.z);
 check(down.intersectObject(roof).length===0,'The relocated hearth has a genuinely empty glass oculus on '+label);
 down.ray.origin.x+=outlet.radius+.1;
 check(down.intersectObject(roof).length>0,'Glass resumes immediately beside the smoke oculus on '+label);
 const fire=createGalleryFireplace(scene,{mobile,smokeOutlet:outlet});scene.updateMatrixWorld(true);
 const hearth=fire.root.getObjectByName('Low limestone campfire lip continuous with the floor'),hearthBounds=new T.Box3().setFromObject(hearth),hearthCentre=hearthBounds.getCenter(new T.Vector3());
 check(hearthBounds.min.x>0&&Math.abs(hearthCentre.x-outlet.x)<.001&&Math.abs(hearthCentre.z-outlet.z)<.001,'The current right-hand campfire aligns with the restored glass opening on '+label);
 check(fire.diagnostics().smokeOutlet.join(',')===[outlet.x,outlet.y,outlet.z].join(','),'The actual smoke effect uses the restored roof outlet on '+label);
 fire.dispose();

 const stone=gallery.solids.filter(object=>object.userData.exhibitionStone);
 for(const direction of [new T.Vector3(-1,0,0),new T.Vector3(1,0,0),new T.Vector3(0,0,-1)]){
  const ray=new T.Raycaster(new T.Vector3(...L.origins.book),direction,0,2);
  check(ray.intersectObjects(stone).length>0,'Stone encloses the current Origins corner on '+direction.toArray()+' on '+label);
 }
 for(const work of [L.play,L.opposite])for(const dx of [-work.screenSize[0]/2,0,work.screenSize[0]/2])for(const dy of [-work.screenSize[1]/2,0,work.screenSize[1]/2]){
  const ray=new T.Raycaster(new T.Vector3(work.screen[0]+dx,work.screen[1]+dy,work.screen[2]),new T.Vector3(0,0,-1),0,1);
  check(ray.intersectObjects(stone).length>0,'The complete '+work.id+' artwork remains backed by real stone on '+label);
 }
 const table=gallery.root.getObjectByName('A single floating limestone edition table'),tableBounds=new T.Box3().setFromObject(table),packages=[];
 gallery.root.traverse(object=>{if(object.userData.premiumPackaging)packages.push(object);});
 check(packages.length===6,'All six current premium Totehmpaper cases remain on '+label);
 for(const display of packages){
  const box=new T.Box3().setFromObject(display);
  check(box.min.x>tableBounds.min.x&&box.max.x<tableBounds.max.x&&box.min.z>tableBounds.min.z&&box.max.z<tableBounds.max.z&&Math.abs(box.min.y-tableBounds.max.y)<.002,'A complete premium case rests on the current stone table on '+label);
 }
 check(gallery.root.getObjectByName('Solid dressed limestone book plinth').material===table.material,'Origins keeps the same stone as the premium table on '+label);

 const signs=[];gallery.root.traverse(object=>{if(object.userData.lisbonStreetSign)signs.push(object);});
 assert.deepEqual(signs.map(sign=>sign.userData.signId).sort(),canonicalIds.slice().sort());checks++;
 for(const sign of signs){
  const sticker=sign.getObjectByName('Higher sticker — '+sign.userData.signId);
  check(!!sticker&&sticker.scale.x<=.4&&sticker.scale.x>0,'The '+sign.userData.signId+' object keeps its small Higher sticker on '+label);
 }
 for(const sign of LISBON_STREET_SIGNS.filter(s=>s.mount==='stone')){
  const direction=new T.Vector3(-Math.sin(sign.rotationY),0,-Math.cos(sign.rotationY));
  const ray=new T.Raycaster(new T.Vector3(...sign.position),direction,0,.7);
  check(ray.intersectObjects(gallery.solids).some(hit=>opaque(hit.object)),'The '+sign.id+' fixture is fixed to actual restored masonry on '+label);
 }

 const nav=createModernWalkway(gallery.obstacles),body=createModernPhysics({x:L.entry[0],z:L.entry[2]},gallery.obstacles,gallery.roofProfile);
 const destinations=[...GALLERY_STATIONS.map(s=>({id:s.id,x:s.approach[0],z:s.approach[2]})),{id:'fire',x:L.fireplace.approach[0],z:L.fireplace.approach[2]},{id:'outside',x:L.entry[0],z:L.entry[2]}];
 for(const destination of destinations){
  const route=nav.route({x:body.position.x,y:body.position.y+L.eyeHeight,z:body.position.z},{...destination,y:1.65});
  check(route?.length>=2,'A restored Lisbon route reaches '+destination.id+' on '+label);
  for(const point of route.slice(1)){
   for(let i=0;i<1200&&Math.hypot(body.position.x-point.x,body.position.z-point.z)>.002;i++){
    const dx=point.x-body.position.x,dz=point.z-body.position.z,length=Math.hypot(dx,dz),stride=Math.min(.7,length);
    body.step(.05,{dx:dx/length*stride,dz:dz/length*stride,guided:true});
    assert(body.diagnostics().grounded,'Guidance stays on the actual Lisbon floor');
   }
   check(Math.hypot(body.position.x-point.x,body.position.z-point.z)<.003,'The real visitor body clears each waypoint toward '+destination.id+' on '+label);
  }
 }
 for(const [x,z] of [[0,-7],[-7,-9],[7,-10]]){
  const jump=createModernPhysics({x,z},gallery.obstacles,gallery.roofProfile);check(jump.jump(),'A real jump starts beneath the restored roof on '+label);
  let peak=-Infinity;for(let i=0;i<480;i++){jump.step(1/120);peak=Math.max(peak,jump.position.y+L.eyeHeight);}
  check(jump.diagnostics().grounded&&jump.diagnostics().headContacts>0&&peak<=gallery.roofHeight(x,z)+.025,'The actual jump meets the restored curved roof at '+x+','+z+' on '+label);
 }
 const apertureBody=createModernPhysics({x:outlet.x,z:outlet.z,y:4.65},gallery.obstacles,gallery.roofProfile);
 check(apertureBody.jump(),'The movement body can launch from the supported hearth beneath the real oculus on '+label);
 apertureBody.step(1/120);
 check(apertureBody.position.y>outlet.y&&apertureBody.diagnostics().headContacts===0,'The actual body passes through the rendered smoke opening without a phantom glass cap on '+label);
 gallery.dispose();gallery.dispose();
 check(scene.children.length===0&&gallery.diagnostics().azulejoBuilding.disposed,'The restored building releases its full scene repeatably on '+label);
}

const nyScene=new T.Scene(),ny=createNewYorkGallery(nyScene,null);
check(ny.diagnostics().kind==='coastal-castle-glass-museum'&&ny.diagnostics().azulejoBuilding===null,'New York keeps its present castle architecture');
check(!ny.root.getObjectByName('Lisbon — cobalt azulejo street façade')&&ny.obstacles.some(box=>legacyIds.has(box.id)),'The Lisbon restoration neither adds azulejos nor removes New York castle collisions');
ny.dispose();
check(nyScene.children.length===0,'The unchanged New York scene still disposes cleanly');
console.log('PASS '+checks+' Lisbon azulejo restoration geometry and movement checks');
