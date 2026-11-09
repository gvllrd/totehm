import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
// New York retains the inclined plane; Lisbon's restored wave has its own suite.
import {createNewYorkGallery} from '../../space/gallery-new-york.mjs';
import {GLASS_SHELL as S,GLASS_HEARTH,glassRoofHeight,glassSmokeOpening} from '../../space/gallery-glass-shell.mjs';
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
const o=GLASS_HEARTH.smokeOutlet;
check(Math.abs(glassRoofHeight(10,-2)-glassRoofHeight(-10,-2)-1.6)<1e-9,'The roof has a deliberate transverse incline');
check(Math.abs(glassRoofHeight(0,-17)-glassRoofHeight(0,-2)-.45)<1e-9,'The second roof incline stays independent of the facade');
for(let x=S.minX;x<=S.maxX;x+=.31)for(let z=S.minZ;z<=S.maxZ;z+=.31){
 const y=glassRoofHeight(x,z);check(y>=S.minHeight&&y<=S.maxHeight,'The complete roof plane stays within the physics envelope');
 check(Math.abs(y-glassRoofHeight(x+.001,z))<.001&&Math.abs(y-glassRoofHeight(x,z+.001))<.001,'Glass has no panel-height discontinuity');
}
for(const mobile of [false,true]){
 const scene=new T.Scene(),gallery=createNewYorkGallery(scene,null,{mobile}),d=gallery.diagnostics();scene.updateMatrixWorld(true);
 const roof=gallery.root.getObjectByName('Single floating glass roof — open star oculus');
 check(!!roof&&d.flatSlopingRoof&&!d.waveGlass&&d.roofShell.actualAperture,'The current gallery renders the new inclined glass roof');
 const p=roof.geometry.attributes.position,n=roof.geometry.attributes.normal;
 for(let i=0;i<p.count;i++){
  const offset=p.getY(i)-glassRoofHeight(p.getX(i),p.getZ(i));
  check(Math.min(Math.abs(offset),Math.abs(offset-S.thickness))<.000002,'Rendered roof vertices match either physical glass face');
  check(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.000002,'Every roof face has a finite unit normal');
 }
 for(let i=0;i<p.count;i+=3){
  let x=0,y=0,z=0;for(let j=0;j<3;j++){x+=p.getX(i+j)/3;y+=p.getY(i+j)/3;z+=p.getZ(i+j)/3;}
  const offset=y-glassRoofHeight(x,z);
  if(Math.abs(n.getY(i))>.9)check(Math.min(Math.abs(offset),Math.abs(offset-S.thickness))<.000002,'Glass-face interiors match the analytic plane');
  else check(offset>=-.000002&&offset<=S.thickness+.000002,'The aperture/perimeter edge lies inside the actual glass thickness');
 }
 const ray=new T.Raycaster(new T.Vector3(o.x,13,o.z),new T.Vector3(0,-1,0));
 check(ray.intersectObject(roof).length===0,'The smoke opening passes through both physical glass faces');
 for(const [x,z] of [[0,-5],[-11,-12],[10,-10],[-8,-14.8]]){
  ray.set(new T.Vector3(x,13,z),new T.Vector3(0,-1,0));const hits=ray.intersectObject(roof);
  check(hits.length>=2,'The glazing has distinct top and bottom faces');
  check(Math.abs(hits[0].point.y-(glassRoofHeight(x,z)+S.thickness))<.000002,'Raycast top agrees with body support height');
  check(Math.abs(hits.at(-1).point.y-glassRoofHeight(x,z))<.000002,'Raycast underside agrees with head-contact height');
 }
 const fold=gallery.root.getObjectByName('Clear fold leading the smoke to the open roof');
 check(!!fold&&fold.material.transparent,'A transparent smoke fold remains above the preserved fire');
 const fp=fold.geometry.attributes.position;
 for(let i=fp.count/2;i<fp.count;i++)check(Math.abs(fp.getY(i)-glassRoofHeight(fp.getX(i),fp.getZ(i)))<.000002,'The smoke fold actually meets the roof aperture');
 check(glassSmokeOpening(o.x,o.z)&&!glassSmokeOpening(o.x+o.radius+.01,o.z),'The shared aperture mask leaves the same centre open');
 gallery.dispose();gallery.dispose();check(scene.children.length===0,'Roof resources dispose with the full gallery');
}
console.log('PASS '+checks+' inclined-glass geometry checks');
