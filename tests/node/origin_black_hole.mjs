import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createOriginsVessel,originsWalkHeight} from '../../space/gallery-origins-vessel.mjs';
import {ORIGIN_PORTAL} from '../../space/gallery-black-hole.mjs';
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
for(const mobile of [false,true]){
 const scene=new T.Scene(),ship=createOriginsVessel(scene,{mobile,transitOnly:true});
 ship.update(.016,new T.Vector3(0,1.65,27),true);
 check(!ship.root.getObjectByName('ORIGINS — enclosed chamber')&&!ship.root.getObjectByName('ORIGINS — open walkway'),'The island contains only the saucer and galaxy portal');
 check(ship.book.pickables.length===0&&ship.diagnostics().originalWorks===0,'No book or photos remain on the island vessel');
 check(ship.journey.outbound.at(-1)[1]===ORIGIN_PORTAL.position[1]&&Math.abs(ship.journey.outbound.at(-1)[2]-ORIGIN_PORTAL.position[2])<1,'The flight really terminates inside the event horizon');
 scene.updateMatrixWorld(true);const hull=ship.root.getObjectByName('Origins metallic disk — continuous closed hull');
 for(const [x,z] of [[0,0],[0,-3],[0,-6],[0,-9],[3,0],[-3,0],[0,6]]){
  const ray=new T.Raycaster(new T.Vector3(x,16,z-4.2),new T.Vector3(0,1,0),0,6);
  check(ray.intersectObject(hull).length>0,'Opaque saucer underside closes the centre and former rear opening at '+x+','+z);
 }
 const floor=ship.root.getObjectByName('Saucer continuous black cabin floor');
 check(!floor.material.transparent&&new T.Raycaster(new T.Vector3(0,21.65,-4.2),new T.Vector3(0,-1,0),0,2).intersectObject(floor).length>0,'The passenger stands above a full opaque cabin floor');
 const canopy=ship.root.getObjectByName('Origins metallic cupola');check(!canopy.material.transparent&&new T.Raycaster(new T.Vector3(0,25,-4.2),new T.Vector3(0,-1,0),0,5).intersectObject(canopy).length>0,'An opaque metallic canopy visibly closes the top of the saucer');
 const firstRotation=ship.diagnostics().rotation;
 ship.update(.1,new T.Vector3(0,1.65,13),true);
 check(ship.diagnostics().canopy.opening&&ship.diagnostics().canopy.openness>0&&ship.diagnostics().canopy.openness<1,'The roof starts to open smoothly near island boarding');
 for(let i=0;i<25;i++)ship.update(.1,new T.Vector3(0,21.65,-4.2),true);
 check(ship.diagnostics().canopy.open&&ship.diagnostics().rotation>firstRotation,'The roof opens while the hull keeps rotating');
 scene.updateMatrixWorld(true);
 const clearance=new T.Box3().setFromObject(canopy);
 check(clearance.min.x>2&&Math.abs(canopy.parent.position.z)<.0001,'The open roof clears both opposing boarding routes');
 for(const p of ship.journey.outbound.slice(2,5).concat([...ship.journey.outbound.slice(2,5)].reverse())){
  const eye=new T.Vector3(...p);
  check(!clearance.containsPoint(eye),'There is no canopy in the passenger lane while boarding or disembarking');
 }
 for(const origin of [[0,16,-4.2],[1,16,-3.2]]){const ray=new T.Raycaster(new T.Vector3(...origin),new T.Vector3(0,1,0),0,8),solid=ray.intersectObjects(ship.solids).find(h=>!h.object.material.transparent),hit=ray.intersectObjects(ship.pickables).find(h=>!solid||h.distance<=solid.distance+.055);check(hit?.object.userData.kind==='origins-vessel','The closed central engine cover still boards the saucer when clicked');}
 for(const p of ship.journey.outbound.slice(0,4)){ship.setFlight(new T.Vector3(...p));check(!ship.diagnostics().flying,'The ship waits while the passenger approaches above its intact hull');}
 ship.setFlight(new T.Vector3(0,60,-40));check(ship.diagnostics().flying&&ship.diagnostics().saucerPosition.join(',')==='0,58.35,-40','The saucer moves with its passenger after boarding');
 ship.update(.016,new T.Vector3(0,60,-40),false);
 check(ship.diagnostics().canopy.openness===0,'The roof closes during flight, including in reduced motion');
 ship.setReturnFlight(new T.Vector3(0,60,-40));
 ship.setReturnFlight(new T.Vector3(0,21.65,-4.16));
 check(ship.diagnostics().canopy.open,'The canopy is already clear when the parked ship hands back the gangway view');
 ship.resetFlight();check(ship.diagnostics().saucerPosition.join(',')==='0,20,-4.2','Cancellation restores the physical saucer');
 check(ship.root.getObjectByName('Plain black event horizon')?.material.color.getHex()===0,'The black hole is real rendered geometry');
 ship.dispose();check(scene.children.length===0,'The island transit releases all scene objects');
 const room=createOriginsVessel(scene,{mobile,bookOnly:true});scene.updateMatrixWorld(true);const d=room.diagnostics();
 check(d.chamber.originalWorks===0&&d.chamber.loadedWorks===0,'The sanctuary exhibits zero surrounding works');
 check(!room.pickables.some(o=>o.userData.kind==='origins-vessel-work'),'No photo or artwork frame can be selected or loaded');
 check(d.book.closed&&d.book.dimensions.join(',')==='.7,.08,.98'.split(',').map(Number).join(','),'The physical original closed book retains its dimensions');
 check(room.root.getObjectByName('Origins ceremonial reading slab').material.color.getHex()===0,'The original book stands on a pure black ceremonial support');
 const walkway=room.root.getObjectByName('ORIGINS — open walkway');
 check(walkway.children.every(o=>o.isMesh&&!o.material.transparent&&!/rib|roof|glass/i.test(o.name))&&d.walkway.openAir,'The walkway is open to the galaxy with no glass or ribs');
 for(let z=-41.875;z<=-4.2;z+=.125){
  check(originsWalkHeight(0,z)!==null,'Travel stays supported at z='+z);
  const ray=new T.Raycaster(new T.Vector3(0,22.7,z),new T.Vector3(0,-1,0),0,3),hit=ray.intersectObjects(room.walkSurfaces)[0];
  check(hit&&Math.abs(hit.point.y-originsWalkHeight(0,z))<.08,'Navigation follows the actual 3D surface at z='+z);
 }
 check(originsWalkHeight(1.5,-24)!==null&&originsWalkHeight(2,-24)===null,'The bridge allows lateral movement and ends at the open edge');
 check(originsWalkHeight(2,-43)!==null&&originsWalkHeight(0,-43)===null,'The visitor can circle the physical book plinth');
 room.root.position.y=3480;
 for(let i=0;i<35;i++){
  room.update(.04,new T.Vector3(0,3502.45,-4.2),true);
  scene.updateMatrixWorld(true);
  const roof=new T.Box3().setFromObject(room.root.getObjectByName('Origins metallic cupola'));
  check(roof.max.y<3502.45,'The opening roof never rises through the standing passenger');
 }
 room.update(.016,new T.Vector3(0,3501.65,-19),false);
 check(room.diagnostics().canopy.open,'Approaching the saucer from the sanctuary opens its roof in world space');
 room.update(.016,new T.Vector3(0,3501.65,-36),false);
 check(room.diagnostics().closedCanopy,'The parked saucer closes when the visitor walks away');
 room.root.position.y=0;scene.updateMatrixWorld(true);
 const book=new T.Vector3(...room.journey.bookPosition);
 const headroom=new T.Raycaster(book,new T.Vector3(0,1,0),.2,30);
 check(!headroom.intersectObjects(room.solids).length&&d.chamber.openAir,'The book stands under an unobstructed sky');
 let prior=20;
 for(const [front,back,top] of room.journey.stairs){
  const z=(front+back)/2,above=new T.Raycaster(new T.Vector3(0,23,z),new T.Vector3(0,-1,0),0,3);
  check(top>prior&&Math.abs(originsWalkHeight(0,z)-top)<.0001&&Math.abs(above.intersectObjects(room.walkSurfaces)[0].point.y-top)<.0001,'Each rising stair is a real and walkable surface');
  prior=top;
 }
 check(d.walkway.steps===4&&d.chamber.lightAnimation,'The path leads up four steps to an animated pedestal');
 const halo=room.root.getObjectByName('Animated light surrounding the Origins pedestal');
 const phase=halo.material.uniforms.uTime.value;
 room.update(.1,book,true);
 check(halo.material.uniforms.uTime.value>phase,'The pedestal lights animate');
 const frozenPhase=halo.material.uniforms.uTime.value;
 room.update(.1,book,false);
 check(halo.material.uniforms.uTime.value===frozenPhase,'Reduced motion holds the pedestal lighting still');
 room.dispose();check(scene.children.length===0,'The sanctuary resources dispose cleanly');
}
const frames=JSON.parse(fs.readFileSync(new URL('../../space/assets/gallery/book-origins/first-frames.json',import.meta.url)));check(frames.frame===0&&frames.files.length===20,'All twenty posters come from decoded frame zero');for(const frame of frames.files)check(createHash('sha256').update(fs.readFileSync(new URL('../../space/assets/gallery/book-origins/'+frame.file,import.meta.url))).digest('hex')===frame.sha256,'The verified first-frame poster matches '+frame.video);
console.log('PASS '+checks+' black-hole flight and book-only sanctuary checks');
