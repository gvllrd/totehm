import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createOriginsVessel} from '../../space/gallery-origins-vessel.mjs';
import {ORIGIN_PORTAL} from '../../space/gallery-black-hole.mjs';
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
for(const mobile of [false,true]){
 const scene=new T.Scene(),ship=createOriginsVessel(scene,{mobile,transitOnly:true});
 check(!ship.root.getObjectByName('ORIGINS — enclosed chamber')&&!ship.root.getObjectByName('ORIGINS — transparent dark glass corridor'),'The island contains only the saucer and galaxy portal');
 check(ship.book.pickables.length===0&&ship.diagnostics().originalWorks===0,'No book or photos remain on the island vessel');
 check(ship.journey.outbound.at(-1)[1]===ORIGIN_PORTAL.position[1]&&Math.abs(ship.journey.outbound.at(-1)[2]-ORIGIN_PORTAL.position[2])<1,'The flight really terminates inside the event horizon');
 ship.setFlight(new T.Vector3(0,60,-40));check(ship.diagnostics().flying&&ship.diagnostics().saucerPosition.join(',')==='0,58.35,-40','The saucer moves with its passenger after boarding');
 ship.resetFlight();check(ship.diagnostics().saucerPosition.join(',')==='0,20,-4.2','Cancellation restores the physical saucer');
 check(ship.root.getObjectByName('Black event horizon with lensed accretion disk')?.material.isShaderMaterial,'The black hole is real rendered geometry');
 ship.dispose();check(scene.children.length===0,'The island transit releases all scene objects');
 const room=createOriginsVessel(scene,{mobile,bookOnly:true});scene.updateMatrixWorld(true);const d=room.diagnostics();
 check(d.chamber.originalWorks===0&&d.chamber.loadedWorks===0,'The sanctuary exhibits zero surrounding works');
 check(!room.pickables.some(o=>o.userData.kind==='origins-vessel-work'),'No photo or artwork frame can be selected or loaded');
 check(d.book.closed&&d.book.dimensions.join(',')==='.7,.08,.94'.split(',').map(Number).join(','),'The physical original closed book retains its dimensions');
 check(room.root.getObjectByName('Origins ceremonial reading slab').material.color.getHex()===0,'The original book stands on a pure black ceremonial support');
 const corridor=room.root.getObjectByName('ORIGINS — transparent dark glass corridor');let transparent=0;corridor.traverse(o=>{if(o.isMesh&&o.material.transparent)transparent++;});check(transparent>=4,'The floating corridor has genuine transparent sides and floor');
 const solids=room.solids.filter(o=>!(Array.isArray(o.material)?o.material:[o.material]).every(m=>m.transparent)),book=new T.Vector3(...room.journey.bookPosition);
 for(const dir of [[1,0,0],[-1,0,0],[0,0,-1],[0,1,0]])check(new T.Raycaster(book,new T.Vector3(...dir),.2,30).intersectObjects(solids).length>0,'The sanctuary is physically enclosed around the book');
 room.dispose();check(scene.children.length===0,'The sanctuary resources dispose cleanly');
}
console.log('PASS '+checks+' black-hole flight and book-only sanctuary checks');
