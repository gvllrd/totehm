// Geometry and clock contracts of Lisbon's outdoor fire; GPU coverage lives
// in tests/browser/lounge_campfire.mjs.
import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createOutdoorCampfire} from '../../space/gallery-outdoor-campfire.mjs';

let checks=0;
const check=(value,message)=>{assert(value,message);checks++;};
for(const mobile of [false,true]){
 const layout={groundY:-.09,fireplace:{position:[2.65,0,2.65]}};
 const scene=new T.Scene(),fire=createOutdoorCampfire(scene,{mobile,layout});
 scene.updateMatrixWorld(true);
 const logs=fire.root.children.filter(object=>object.name==='Split charred hardwood with exposed end grain');
 const stones=fire.root.children.filter(object=>object.name==='Chipped limestone hearth stone');
 check(logs.length===8&&stones.length===14,'The existing eight-log fire and fourteen-stone footprint stay intact');
 for(const [index,log] of logs.entries()){
  const p=log.geometry.attributes.position,n=log.geometry.attributes.normal;
  let maxX=-Infinity,planar=0,flatNormals=0;
  for(let i=0;i<p.count;i++){
   assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)));
   maxX=Math.max(maxX,p.getX(i));
  }
  for(let i=0;i<p.count;i++){
   if(Math.abs(p.getX(i)-maxX)<1e-7)planar++;
   if(n.getX(i)>.95&&Math.abs(n.getY(i))<.1)flatNormals++;
  }
  check(planar>40&&flatNormals>40,'Log '+index+' has an actual broad split face with matching surface normals');
 }
 const flames=fire.root.getObjectByName('Sharp volumetric fire with separate rolling tongues');
 const coals=fire.root.getObjectByName('Fractured coals at the base of the logs');
 check(coals.isInstancedMesh&&coals.count===(mobile?70:122),'Ember detail retains one instanced draw and the existing particle budget');
 const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <map_fragment>\n#include <emissivemap_fragment>'};
 coals.material.onBeforeCompile(shader);
 check(shader.uniforms.uCoalTime===flames.material.uniforms.uTime,'Ember fractures and flames borrow one animation clock');
 check(shader.uniforms.uCoalFlow.value===flames.material.uniforms.uFlow.value,'Ember fractures reuse the existing flow texture');
 check(flames.material.side===T.BackSide&&!flames.material.depthWrite&&flames.material.premultipliedAlpha,'The volume preserves opaque wood depth and blends integrated thermal light');
 check(flames.material.uniforms.uSteps.value===(mobile?30:48),'Near flame sampling keeps the established quality budget');
 const lights=fire.root.children.filter(object=>object.isPointLight);
 const initial=fire.diagnostics().time;
 fire.update(.1,new T.Vector3(2.65,1.5,6),true);
 check(fire.diagnostics().time>initial&&Math.abs(shader.uniforms.uCoalTime.value-fire.diagnostics().time)<.0001,'A real update advances the clock shared by wood, embers and flame');
 const parked=shader.uniforms.uCoalTime.value,lightIntensities=lights.map(light=>light.intensity);
 fire.update(.1,null,false);
 check(shader.uniforms.uCoalTime.value===parked&&lights.every((light,index)=>light.intensity===lightIntensities[index]),'Reduced motion freezes both combustion and reflected light');
 fire.update(0,new T.Vector3(2.65,1.5,20),false);
 check(flames.material.uniforms.uSteps.value===(mobile?16:24)&&shader.uniforms.uCoalTime.value===parked,'A distant paused camera changes ray quality without advancing the fire');
 check(fire.pickables.every(object=>object.userData.kind==='fireplace')&&fire.pickables.length>logs.length,'The physical wood and stone keep their existing interaction');
 const geometries=new Set(fire.root.children.map(object=>object.geometry).filter(Boolean));
 let disposed=0;for(const geometry of geometries)geometry.addEventListener('dispose',()=>disposed++);
 fire.dispose();fire.dispose();
 check(scene.children.length===0&&disposed===geometries.size,'Disposal releases every geometry once and removes the fire');
}
console.log('PASS '+checks+' outdoor campfire geometry and shared-clock checks');
