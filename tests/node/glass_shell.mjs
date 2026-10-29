import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createModernGallery} from '../../space/gallery-modern.mjs';
import {GLASS_SHELL,GLASS_HEARTH,glassRoofHeight,glassSmokeOpening} from '../../space/gallery-glass-shell.mjs';
let checks=0;const check=(v,message)=>{assert(v,message);checks++;};
const o=GLASS_HEARTH.smokeOutlet;
for(let x=-13;x<=13;x+=.1)check(Math.abs(glassRoofHeight(x,-2)-7.25)<1e-9,'The glass front edge meets the historic facade above its upper windows');
// The variable section is continuous and bounded, including its four edges.
for(let x=GLASS_SHELL.minX;x<=GLASS_SHELL.maxX;x+=.19)for(let z=GLASS_SHELL.minZ;z<=GLASS_SHELL.maxZ;z+=.19){
 const y=glassRoofHeight(x,z);check(y>=GLASS_SHELL.minHeight&&y<=GLASS_SHELL.maxHeight,'Glass height remains inside its collision envelope');
 check(Math.abs(y-glassRoofHeight(x+.001,z))<.001&&Math.abs(y-glassRoofHeight(x,z+.001))<.001,'Roof has no jumps at panel boundaries');
}
for(const mobile of [false,true]){
 const scene=new T.Scene(),gallery=createModernGallery(scene,null,{mobile}),d=gallery.diagnostics();
 scene.updateMatrixWorld(true);const roof=gallery.root.getObjectByName('Wave glass roof — open smoke oculus, no flat lid');
 check(!!roof&&d.waveGlass&&!d.flatRoof&&d.roofShell.continuous,'Actual roof geometry replaces the flat lid');
 const p=roof.geometry.attributes.position,n=roof.geometry.attributes.normal;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),distance=p.getY(i)-glassRoofHeight(x,z);
  check(Math.min(Math.abs(distance),Math.abs(distance-GLASS_SHELL.thickness))<.000002,'Every rendered roof vertex agrees with the shared physics height');
  check(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.000001,'Roof has finite unit surface normals');
 }
 // Interpolated faces, rather than their defining vertices alone, must
 // remain within six millimetres of the continuous collision section.
 for(let i=0;i<p.count;i+=3){
  for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]]){
   let x=0,y=0,z=0;for(let j=0;j<3;j++){x+=p.getX(i+j)*weights[j];y+=p.getY(i+j)*weights[j];z+=p.getZ(i+j)*weights[j];}
   const delta=y-glassRoofHeight(x,z);check(Math.min(Math.abs(delta),Math.abs(delta-GLASS_SHELL.thickness))<.0061,'Interpolated roof faces remain within six millimetres of their analytic section');
  }
 }
 const ray=new T.Raycaster(new T.Vector3(o.x,12,o.z),new T.Vector3(0,-1,0));
 check(ray.intersectObject(roof).length===0,'The smoke passage is a real mesh opening');
 for(const [x,z] of [[0,-5],[-11,-12],[10,-10],[-8,-14.8]]){
  ray.set(new T.Vector3(x,12,z),new T.Vector3(0,-1,0));const hits=ray.intersectObject(roof);
  check(hits.length>0,'Glazing surrounds the smoke aperture');
  check(Math.abs(hits[0].point.y-(glassRoofHeight(x,z)+GLASS_SHELL.thickness))<.0061,'Ray-cast glass top follows the continuous section');
 }
 check(gallery.root.getObjectByName('Folded glass smoke collector continuous with the wave roof')?.geometry.attributes.position.count>500,'The clear collector is a continuous curved surface');
 check(!gallery.root.getObjectByName('Full celestial glass roof'),'No hidden flat roof remains');
 check(glassSmokeOpening(o.x,o.z)&&!glassSmokeOpening(o.x+1,o.z),'Opening mask agrees with the open oculus');
 gallery.dispose();check(scene.children.length===0,'Disposal removes complete architecture');
}
console.log('PASS '+checks+' wave-glass geometry checks');
