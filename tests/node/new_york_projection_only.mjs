import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createNewYorkGallery} from '../../space/gallery-new-york.mjs';
import {NEW_YORK_LAYOUT as L,NEW_YORK_FLOOR_RECTS,NEW_YORK_GROUND_OBSTACLES} from '../../space/gallery-new-york-layout.mjs';
import {createNewYorkPhysics,createNewYorkWalkway} from '../../space/gallery-new-york-navigation.mjs';
import {LIBERTY_LOCATION,createLiberty} from '../../space/gallery-liberty.mjs';
import {CRISTO_REI_LOCATION,cristoFeetHeight} from '../../space/gallery-lisbon-water.mjs';

for(const mobile of [false,true]){
 const scene=new T.Scene(),gallery=createNewYorkGallery(scene,null,{mobile});
 scene.updateMatrixWorld(true);
 const d=gallery.diagnostics();
 assert.ok(d.ready&&d.openAir&&!d.building&&!d.glassRoof&&!d.glassSides&&!d.ruins);
 assert.equal(d.seat.seats,2);
 assert.equal(d.thpCounter.tables,1);
 assert.equal(d.thpCounter.packagedPapers,2);
 assert.equal(d.legacyArtworkPickables,0);
 assert.ok(d.flooring.ancientStone.physicalSlabs);
 assert.ok(gallery.pickables.some(object=>object.userData.kind==='lisbon-seat'));
 assert.ok(gallery.cases.every(paper=>gallery.pickables.some(object=>object.userData.paper===paper)));
 assert.ok(gallery.cases.every(paper=>paper.href==='/get_higher?paper=1'));
 const ray=new T.Raycaster();
 for(const rect of NEW_YORK_FLOOR_RECTS)for(const [fx,fz] of [[.1,.05],[.35,.3],[.5,.38],[.8,.6],[.95,.9]]){
  ray.set(new T.Vector3(rect.minX+(rect.maxX-rect.minX)*fx,L.groundY+.04,rect.minZ+(rect.maxZ-rect.minZ)*fz),new T.Vector3(0,-1,0));ray.far=.1;
  const hit=ray.intersectObjects(gallery.walkable)[0];
  assert.ok(hit&&hit.point.y<=L.groundY+.001&&hit.point.y>=L.groundY-.0275,'Stone supports the same walking plane');
 }
 const liberty=createLiberty(scene,{mobile});
 assert.equal(LIBERTY_LOCATION.x,CRISTO_REI_LOCATION.x);
 assert.equal(LIBERTY_LOCATION.z,CRISTO_REI_LOCATION.z);
 assert.equal(LIBERTY_LOCATION.y,cristoFeetHeight());
 assert.deepEqual(liberty.root.position.toArray(),[LIBERTY_LOCATION.x,LIBERTY_LOCATION.y,LIBERTY_LOCATION.z]);
 liberty.dispose();gallery.dispose();assert.equal(scene.children.length,0);
}
assert.deepEqual(NEW_YORK_GROUND_OBSTACLES.map(box=>box.id),['new-york-leather-sofa','new-york-coffee-table']);
const walk=createNewYorkWalkway(),body=createNewYorkPhysics({x:L.entry[0],z:L.entry[2]});
for(const target of [L.seat.approach,L.counter.approach,[0,1.65,-12]]){
 const route=walk.route(body.position,{x:target[0],y:target[1],z:target[2]});
 assert.ok(route&&route.every(point=>walk.allowed(point.x,point.z)));
 for(const point of route.slice(1)){
  for(let i=0;i<1200&&Math.hypot(body.position.x-point.x,body.position.z-point.z)>.003;i++){
   const dx=point.x-body.position.x,dz=point.z-body.position.z,length=Math.hypot(dx,dz),stride=Math.min(.12,length);
   body.step(.025,{dx:dx/length*stride,dz:dz/length*stride,guided:true});
  }
  assert.ok(Math.hypot(body.position.x-point.x,body.position.z-point.z)<.004);
 }
}
console.log('PASS New York open-air stone terrace, shared Totehmpaper and monument placement');
