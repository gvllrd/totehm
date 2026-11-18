import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createModernGallery} from '../../space/gallery-modern.mjs';
import {createModernWalkway} from '../../space/gallery-modern-navigation.mjs';

const scene=new T.Scene(),lounge=createModernGallery(scene,{});
try{
 const {layout,seat,table,cases,controller,performance}=lounge;
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
 assert.ok(cases.length>=2&&cases.every(item=>item.root.userData.premiumPackaging&&item.front&&item.root.position.x<0));
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
 const camera=new T.PerspectiveCamera(seat.fov,16/9,.08,20000);
 camera.position.fromArray(seat.eye);camera.lookAt(...seat.target);camera.updateMatrixWorld(true);
 for(const object of [...cases.map(item=>item.front),controller.root,performance.screen]){
  const screen=object.getWorldPosition(new T.Vector3()).project(camera);
  assert.ok(Math.abs(screen.x)<.9&&Math.abs(screen.y)<.9&&screen.z>0&&screen.z<1,'every lounge object fits the anchored seated view');
 }
 console.log('PASS Lisbon’s open calçada, reachable furniture and seated sight lines');
}finally{lounge.dispose();}
assert.equal(scene.children.length,0);
