import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createModernGallery} from '../../space/gallery-modern.mjs';
import {createModernWalkway,createModernPhysics} from '../../space/gallery-modern-navigation.mjs';
import {LISBON_URBEX_LAYOUT as L,LISBON_URBEX_STATIONS} from '../../space/gallery-lisbon-urbex-layout.mjs';
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
for(const mobile of [false,true]){
 const scene=new T.Scene(),g=createModernGallery(scene,null,{mobile}),d=g.diagnostics();scene.updateMatrixWorld(true);
 check(d.kind==='lisbon-azulejo-urbex-gallery'&&!d.dome,'The actual factory restores the azulejo building');
 check(d.azulejoBuilding.restoredFrom==='c8ddaf0'&&d.azulejoBuilding.waveGlass,'The historical source and real glass wave are preserved');
 check(d.azulejoBuilding.ruined&&d.azulejoBuilding.facade.missingTilePatches===6&&d.azulejoBuilding.facade.brokenWindows===3,'The facade has actual missing tiles and broken windows');
 check(d.azulejoBuilding.facade.stoneBalusters<58&&d.azulejoBuilding.facade.brokenCornice,'The original roofline has broken surviving portions');
 check(d.floor.physicalSlabs&&d.stone.physicalBlocks&&d.stone.fracturedBlocks>0,'The interior has physical stone, joints and fractured blocks');
 const tables=[];g.root.traverse(o=>{if(o.userData.table)tables.push(o);});check(tables.length===1,'Only one actual display table exists');
 check(tables[0].material.color.getHex()===0&&d.thpCounter.inside&&!d.thpCounter.exterior,'The only table is pure black and inside');
 const bounds=new T.Box3().setFromObject(tables[0]),cases=[];g.root.traverse(o=>{if(o.userData.premiumPackaging)cases.push(o);});
 check(cases.length===6&&d.thpCounter.caseWidthMetres===.12,'All six small original premium cases are present');
 for(const o of cases){const b=new T.Box3().setFromObject(o);check(b.min.x>bounds.min.x&&b.max.x<bounds.max.x&&b.min.z>bounds.min.z&&b.max.z<bounds.max.z&&Math.abs(b.min.y-bounds.max.y)<.003,'Each complete original case rests on the one table');}
 const lab=g.root.getObjectByName('Two laboratory wings on the single THP table');const b=new T.Box3().setFromObject(lab);
 check(b.min.x<-1&&b.max.x>1&&b.min.x>bounds.min.x&&b.max.x<bounds.max.x&&b.min.z>bounds.min.z&&b.max.z<bounds.max.z,'Both laboratory wings are contained on the same table');
 check(d.laboratory.condenser&&d.laboratory.analyticalBalance&&d.laboratory.sampleTubes===4,'The actual sculptural laboratory has both kinds of instruments');
 check(d.facade.externalStreetSigns===0&&d.facade.externalBrandSculptures===0&&d.streetSigns.groundMarkings===0,'No exterior signs, sculpture or ground signals remain');
 const identity=g.root.getObjectByName('Interior Lisbon city hall × TOTEHM collaboration');
 check(identity.position.z<L.frontZ&&Math.abs(identity.rotation.y-Math.PI/2)<.001,'The collaboration faces into the interior');
 check(g.root.getObjectByName('Interior native TOTEHM 3D piece').geometry.userData.perforations===12,'The interior TOTEHM keeps twelve true notches');
 check(g.root.getObjectByName('Interior native Higher piece').geometry.userData.perforations===18,'Higher keeps eighteen true notches');
 check(g.performance.panels.length===22&&new Set(g.performance.panels.map(p=>p.id)).size===22,'All twenty-two original signs belong to the interior hologram');
 check(g.performance.screen.material.transparent&&g.performance.screen.material.opacity<.05&&d.performance.videoDecoders===0,'The hologram is transparent and never starts video');
 check(g.performance.root.position.z>-16.5&&g.performance.root.position.z<-2,'The complete hologram is inside the building');
 let opened=null;g.performance.onOpen(value=>opened=value.href);g.performance.open();check(opened==='/play_lisbon_street?discover=1','The real hologram opens the original Discover first');
 const walk=createModernWalkway(g.obstacles),physics=createModernPhysics({x:0,z:12},g.obstacles,g.roofProfile);
 const entry=new T.Vector3(...L.entry);check(walk.allowed(0,-2),'The historic entrance is open to visitors');
 for(const station of [LISBON_URBEX_STATIONS[0],LISBON_URBEX_STATIONS[2],...LISBON_URBEX_STATIONS.filter(s=>s.approachMobile).map(s=>({...s,approach:s.approachMobile}))]){
  const route=walk.route(entry,new T.Vector3(...station.approach));check(route&&route.length>=2,'An interior station has a real route through the restored door');
  for(let i=1;i<route.length;i++){const a=new T.Vector3(route[i-1].x,1.65,route[i-1].z),b=new T.Vector3(route[i].x,1.65,route[i].z),n=Math.ceil(a.distanceTo(b)/.08);for(let j=0;j<=n;j++){const p=a.clone().lerp(b,j/n);check(walk.allowed(p.x,p.z),'Guided travel stays clear of walls and the single table');}}
 }
 physics.reset({x:0,z:-5.65});for(let i=0;i<60;i++)physics.step(1/60,{dx:0,dz:-.1});check(physics.position.z>-6.6,'Walking cannot pass through the actual table');
 const roof=g.root.getObjectByName('Wave glass roof — open smoke oculus, no flat lid'),ray=new T.Raycaster(new T.Vector3(0,15,-9),new T.Vector3(0,-1,0));check(ray.intersectObject(roof).length>0,'The modern glass roof is actual geometry');
 ray.ray.origin.set(g.smokeOutlet.x,15,g.smokeOutlet.z);check(ray.intersectObject(roof).length===0,'The fire retains an open smoke outlet');
 check(d.pavement.boatCentre?.join(',')==='0,4','The central caravel and island paving remain');
 g.dispose();check(!scene.children.length,'The new gallery releases its scene and resources');
}
console.log('PASS '+checks+' Lisbon urbex, laboratory, hologram and navigation checks');
