import * as T from './vendor/three-0.180.0.mjs';
import {createHeritageMasonry} from './gallery-heritage-masonry.mjs';
import {createCastleRuins} from './gallery-castle-ruins.mjs';
import {heritageWalls,heritageWallGroups,HERITAGE_PORTAL as P} from './gallery-heritage-layout.mjs';

// Contemporary glass is a light addition to retained, substantial masonry.
// Both places use the same physical portal and stone volumes as navigation.
export function createHeritageIntervention(parent,{place='lisbon',mobile=false,anisotropy=4,onChange=()=>{},geometry=null,material=null}={}){
 const root=new T.Group();root.name='TOTEHM — clear glass joined to retained ancient masonry';parent.add(root);
 const geometries=new Set(),materials=new Set(),solids=[],walls=heritageWalls(place);
 let disposed=false,glassCompiled=false;
 const ownG=g=>{geometries.add(g);return geometry?geometry(g):g;},ownM=m=>{materials.add(m);return material?material(m):m;};
 const changed=()=>{if(!disposed)onChange();};
 const masonry=createHeritageMasonry(root,{walls,mobile,anisotropy,onChange:changed,geometry,material});solids.push(...masonry.solids);
 const glass=ownM(new T.MeshPhysicalMaterial({color:0xdce9ed,transparent:true,opacity:.045,roughness:.035,metalness:.01,side:T.DoubleSide,depthWrite:false,envMapIntensity:1.4,clearcoat:1,clearcoatRoughness:.04,ior:1.5}));
 glass.name='Low-iron architectural glass — clear face and grazing reflection';
 glass.customProgramCacheKey=()=> 'heritage-clear-glass-fresnel-v1';
 glass.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   // Thin, low-iron glazing stays clear head-on and reveals its presence
   // in the reflected sky and warm stone at an oblique viewing angle.
   float heritageGrazing=pow(1.-clamp(abs(dot(normalize(normal),normalize(vViewPosition))),0.,1.),5.);
   diffuseColor.a=mix(.035,.22,heritageGrazing);
   #include <opaque_fragment>`);
  glassCompiled=true;
 };
 const metal=ownM(new T.MeshStandardMaterial({color:0x171a1b,roughness:.38,metalness:.76}));metal.name='Restrained charcoal-bronze glass junctions';
 const castle=createCastleRuins(root,{place,stoneMaterial:masonry.stoneMaterial,glassMaterial:glass,metalMaterial:metal,geometry,material});solids.push(...castle.solids);
 const warm=ownM(new T.MeshBasicMaterial({color:0xffd6a0,toneMapped:false}));warm.name='Warm light concealed in the stone threshold';
 const box=ownG(new T.BoxGeometry(1,1,1));
 function block(m,p,size,name,solid=false){
  const object=new T.Mesh(box,m);object.position.set(...p);object.scale.set(...size);object.name=name;object.castShadow=!m.transparent;object.receiveShadow=!m.isMeshBasicMaterial;root.add(object);if(solid)solids.push(object);return object;
 }
 const length=P.maxZ-P.minZ,centreZ=(P.minZ+P.maxZ)/2,height=P.maxY-P.minY,centreY=(P.minY+P.maxY)/2,t=P.frameThickness;
 for(const side of [-1,1]){
  const x=side*P.sideX;
  block(glass,[x,centreY,centreZ],[P.sideThickness,height,length],'Open vestibule — low-iron '+(side<0?'west':'east')+' glass wall',true);
  for(const y of [P.minY+t/2,P.maxY-t/2])block(metal,[x,y,centreZ],[t,t,length],'Thirty-five-millimetre continuous glass side channel');
  for(const z of [P.minZ+t/2,P.maxZ-t/2])block(metal,[x,centreY,z],[t,height,t],'Slender vestibule glass corner joint');
  // The light is recessed beside the old jamb, away from the clear path.
  block(warm,[side*2.41,.025,-2.48],[.008,.012,1.24],'Concealed light grazing the retained stone entrance jamb');
 }
 const roofWidth=P.sideX*2+P.sideThickness;
 block(glass,[0,P.roofY,centreZ],[roofWidth,P.roofThickness,length],'Open vestibule — continuous glass canopy below the TOTEHM tongue',true);
 for(const z of [P.minZ+t/2,P.maxZ-t/2])block(metal,[0,P.maxY-t/2,z],[roofWidth,t,t],'Fine dark front and rear glass canopy edge');

 // A narrow shadow gap lets the raw wall ends remain legible behind the
 // full-height exterior glazing; no extra grid is drawn over the ocean.
 for(const w of heritageWallGroups(place).filter(w=>!w.id.includes('entry'))){
  const side=Math.sign(w.minX+w.maxX),x=side*13;
  block(metal,[x,P.minY+t/2,(w.minZ+w.maxZ)/2],[t,t,w.maxZ-w.minZ],'Fine glazing shoe beside retained masonry — '+w.id);
 }
 function graze(position,target,power,distance,angle){
  const lamp=new T.SpotLight(0xffd8a9,power,distance,angle,.88,2);lamp.name='Warm raking light on old masonry';lamp.position.set(...position);lamp.target.position.set(...target);root.add(lamp,lamp.target);
 }
 for(const side of [-1,1]){
  graze([side*2.19,.18,-1.41],[side*2.69,1.9,-2.55],40,5.8,.45);
  graze([side*11.94,.20,-2.60],[side*12.59,3.7,side<0?-3.46:-4.02],90,11,.33);
 }
 root.updateMatrixWorld(true);changed();
 return{
  root,solids,
  diagnostics(){const stone=masonry.diagnostics();return{
   kind:'glass-and-retained-masonry',place,retainedMasonry:true,retainedWalls:heritageWallGroups(place).length,physicalFragments:walls.length,ruin:true,brokenWallTops:true,actualMissingMasonry:true,roughStoneReturns:true,clearGlassEnvelope:true,
   thinFrames:true,frameThickness:t,shadowGapMetres:.08,
   portal:{open:true,glass:true,clearWidth:P.clearWidth,minZ:P.minZ,maxZ:P.maxZ,projection:length,roofHeight:P.roofY,roofThickness:P.roofThickness,panes:3,doors:0,glassCompiled},
   masonry:stone,castle:castle.diagnostics(),photographicMapsReady:stone.photographicMapsReady,compiled:!!stone.compiled&&glassCompiled,warmRakingLights:4,disposed
  };},
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();castle.dispose();masonry.dispose();if(!geometry)for(const g of geometries)g.dispose();if(!material)for(const m of materials)m.dispose();root.clear();}
 };
}
