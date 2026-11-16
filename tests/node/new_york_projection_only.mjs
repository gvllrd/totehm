import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createNewYorkGallery} from '../../space/gallery-new-york.mjs';
import {NEW_YORK_GROUND_OBSTACLES} from '../../space/gallery-new-york-layout.mjs';
import {createNewYorkPhysics,createNewYorkWalkway} from '../../space/gallery-new-york-navigation.mjs';
import {castleFabricPlan} from '../../space/gallery-castle-plan.mjs';
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
for(const mobile of [false,true]){
 const scene=new T.Scene(),g=createNewYorkGallery(scene,null,{mobile});scene.updateMatrixWorld(true);const d=g.diagnostics();
 check(d.projectionOnly&&d.ready&&d.castle.retainedBuilding,'New York retains the real castle as the setting for its projection');
 check(g.pickables.length===0&&g.interactables.length===0&&g.portals.length===0,'The base castle exposes no removed artwork or product control');
 check(d.thpCounter.packagedPapers===0&&!d.origins.lectern&&d.opposites.count===0&&!d.opposites.blackWall,'No old THP editions, book plinth or six-frame wall remains');
 for(const name of ['A single floating limestone edition table','Origins — limestone reading slab in the west keep','Solid dressed limestone book plinth','THINK SAME BUT OPPOSITE — black exhibition wall','Clear fold leading the smoke to the open roof'])check(!g.root.getObjectByName(name),'Removed installation is absent: '+name);
 check(!d.facade.monumentalEntranceMark&&!g.root.children.some(o=>o.userData.premiumPackaging),'No entrance product sculpture or product packaging survives');
 for(const arch of castleFabricPlan('new-york').arches){
  const origin=arch.axis==='x'?new T.Vector3(arch.centre,1.65,arch.fixed+arch.depth/2+.7):new T.Vector3(arch.fixed+arch.depth/2+.7,1.65,arch.centre),direction=arch.axis==='x'?new T.Vector3(0,0,-1):new T.Vector3(-1,0,0);
  check(new T.Raycaster(origin,direction,0,arch.depth+1.4).intersectObjects(g.solids).filter(h=>h.object.userData.castleFabric).length===0,'Retained arch remains genuinely open: '+arch.id);
 }
 check(g.walkable.length>0&&g.solids.length>0,'Stone floor and architectural collision surfaces remain');
 g.dispose();check(scene.children.length===0,'The cleared castle releases its scene objects');
}
check(!NEW_YORK_GROUND_OBSTACLES.some(b=>['new-york-opposites-wall','thp-counter','origins-lectern','fireplace-hearth'].includes(b.id)),'Removed furniture and exhibition wall leave no ghost collider');
const route=createNewYorkWalkway().route({x:0,y:1.65,z:-5},{x:0,y:1.65,z:-12});check(route&&route.every(p=>Math.abs(p.x)<.01),'Visitors can walk directly through the cleared former wall and table');
const body=createNewYorkPhysics({x:0,z:-5});for(let i=0;i<140;i++)body.step(.025,{dx:0,dz:-.05,guided:true});check(body.position.z<-11.8,'Actual walking physics crosses the former artwork and product footprints');
console.log('PASS '+checks+' cleared New York projection setting checks');
