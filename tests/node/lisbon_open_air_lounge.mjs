import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createModernGallery} from '../../space/gallery-modern.mjs';
import {createModernWalkway} from '../../space/gallery-modern-navigation.mjs';

const scene=new T.Scene(),lounge=createModernGallery(scene,{});
try{
 const {layout,seat,table,cases,paperAttache,controller,performance}=lounge;
 const world=lounge.diagnostics();
 assert.equal(world.openAir,true);
 assert.equal(world.walls,0);
 assert.equal(world.facade,false);
 assert.equal(world.roof,false);
 assert.equal(lounge.walkable.length,1,'Lisbon has one continuous walking surface');
 assert.match(lounge.walkable[0].material.name,/CALCADA/);
 assert.equal(world.pavement.boat,true,'Lisbon’s original caravel is made of the same stones');
 assert.equal(world.thpCounter.chemistryEquipment,0);
 assert.ok(layout.counter.position[1]<.6,'hotel coffee table stays below a seated visitor');
 assert.equal(table.parent,lounge.root);
 assert.ok(seat.pickables.every(mesh=>mesh.userData.kind==='lisbon-seat'&&lounge.pickables.includes(mesh)));
 assert.equal(world.thpCounter.attache.cradles,2);
 assert.ok(world.thpCounter.attache.open&&world.thpCounter.attache.leather);
 assert.equal(paperAttache.root.parent,lounge.root);
 assert.equal(cases.length,2);
 assert.ok(cases.every(item=>item.root.userData.premiumPackaging&&item.front&&item.root.parent===paperAttache.root&&item.width===.042));
 assert.ok(cases.every(item=>item.root.children.every(mesh=>mesh.userData.kind==='lisbon-paper'&&mesh.userData.paper===item)));
 assert.ok(controller.root.position.x>0&&controller.pickables.every(mesh=>lounge.pickables.includes(mesh)));
 assert.ok(performance.diagnostics().bottom>1,'floating screen clears the floor');
 assert.equal(performance.screen.position.y,0,'the projection plane remains centred in its group');
 const walk=createModernWalkway(lounge.obstacles);
 const position=([x,,z])=>({x,z});
 for(const target of [seat.approach,layout.counter.approach,layout.play.approach]){
  const path=walk.route(position(layout.entry),position(target));
  assert.ok(path?.length>=2,'each furniture approach is reachable from the island entrance');
 }
 scene.updateMatrixWorld(true);
 for(const item of cases){
  assert.ok(item.root.getWorldPosition(new T.Vector3()).x<0);
  assert.deepEqual(item.root.getWorldScale(new T.Vector3()).toArray().map(value=>Math.round(value*1e6)/1e6),[1,1,1]);
 }
 const controllerBounds=new T.Box3().setFromObject(controller.root,true).getSize(new T.Vector3());
 assert.ok(controllerBounds.x>.21&&controllerBounds.x<.245&&controllerBounds.y<.072,'the slim tabletop controller retains a handheld scale');
 assert.equal(world.controller.roundBanks,2);
 assert.ok(controllerBounds.z>.20,'the rounded grips extend beyond the bridge at handheld scale');
 const feet=lounge.root.getObjectsByProperty('name','Controller rubber foot');
 assert.equal(feet.length,2);
 for(const foot of feet){
  const bounds=new T.Box3().setFromObject(foot,true);
  assert.ok(Math.abs(bounds.min.y-layout.counter.position[1])<1e-6&&bounds.max.y-bounds.min.y<.005,'the controller has discreet pads in contact with the stone');
 }
 const camera=new T.PerspectiveCamera(seat.fov,16/9,.08,20000);
 camera.position.fromArray(seat.eye);camera.lookAt(...seat.target);camera.updateMatrixWorld(true);
 for(const object of [...cases.map(item=>item.front),controller.root,performance.screen]){
  const screen=object.getWorldPosition(new T.Vector3()).project(camera);
  assert.ok(Math.abs(screen.x)<.9&&Math.abs(screen.y)<.9&&screen.z>0&&screen.z<1,'every lounge object fits the anchored seated view');
 }
 const ray=new T.Raycaster(camera.position,new T.Vector3(...world.controller.tableAim).sub(camera.position).normalize());
 assert.equal(ray.intersectObjects(lounge.pickables,false)[0]?.object.userData.kind,'lisbon-controller','the smaller controller is still directly clickable from the chair');
 for(const item of cases){
  const target=item.front.getWorldPosition(new T.Vector3());
  ray.set(camera.position,target.sub(camera.position).normalize());
  const selected=ray.intersectObjects(lounge.pickables,false).find(hit=>hit.object.userData.kind==='lisbon-paper');
  const caseFurniture=ray.intersectObjects(paperAttache.occluders,false)[0];
  assert.equal(selected?.object.userData.paper,item,'each original glass case has an independent hit target');
  assert.ok(!caseFurniture||caseFurniture.distance>selected.distance,'the open attaché does not obscure the case');
 }
 console.log('PASS Lisbon’s open calçada, reachable furniture and independently accessible glass cases');
}finally{lounge.dispose();}
assert.equal(scene.children.length,0);
