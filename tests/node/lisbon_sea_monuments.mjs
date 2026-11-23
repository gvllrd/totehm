import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {GLTFLoader} from '../../space/vendor/GLTFLoader-0.180.0.mjs';
import {MeshoptDecoder} from '../../space/vendor/meshopt_decoder.module.js';
import {createLisbonSeaMonuments} from '../../space/gallery-lisbon-sea.mjs';
import {createCristoRei,CRISTO_MODEL,CRISTO_PEDESTAL_MODEL} from '../../space/gallery-cristo-rei.mjs';
import {createDrownedOcean} from '../../space/gallery-drowned-ocean.mjs';
import {
 BRIDGE_DECK_LOCAL_Y,BRIDGE_DECK_DEPTH,CRISTO_FEET_DEPTH,CRISTO_WAVE_SHADOW,
 CRISTO_REI_LOCATION,PONTE_25_ABRIL_LOCATION,stillOceanHeight,oceanDomain,bridgeHeight
} from '../../space/gallery-lisbon-water.mjs';

const bytes=fs.readFileSync('space'+CRISTO_MODEL);
assert.equal(bytes.readUInt32LE(0),0x46546c67);
assert.equal(bytes.readUInt32LE(8),bytes.length);
const jsonLength=bytes.readUInt32LE(12);
const photo=JSON.parse(bytes.subarray(20,20+jsonLength));
const payloadOffset=28+jsonLength;
const [image]=photo.images;
assert.equal(image.mimeType,'image/jpeg');
assert.equal(bytes.readUInt16BE(payloadOffset+photo.bufferViews[image.bufferView].byteOffset),0xffd8);

// Decode the geometry directly so this test runs without a browser image decoder.
function readAccessor(index,ArrayType){
 const accessor=photo.accessors[index],view=photo.bufferViews[accessor.bufferView];
 const start=bytes.byteOffset+payloadOffset+view.byteOffset+(accessor.byteOffset??0);
 return new ArrayType(bytes.buffer.slice(start,start+view.byteLength));
}
const statue=new T.Group();
for(const primitive of photo.meshes[0].primitives){
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.BufferAttribute(readAccessor(primitive.attributes.POSITION,Float32Array),3));
 geometry.setIndex(new T.BufferAttribute(readAccessor(primitive.indices,Uint16Array),1));
 statue.add(new T.Mesh(geometry,new T.MeshStandardMaterial()));
}
const pedestalBytes=fs.readFileSync('space'+CRISTO_PEDESTAL_MODEL);
const pedestalBuffer=pedestalBytes.buffer.slice(pedestalBytes.byteOffset,pedestalBytes.byteOffset+pedestalBytes.byteLength);
const pedestal=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(pedestalBuffer,'');
const figure=createCristoRei({loader:{load(path,ready){
 if(path===CRISTO_MODEL)ready({scene:statue});
 else{
  assert.equal(path,CRISTO_PEDESTAL_MODEL);
  ready(pedestal);
 }
}}});
figure.root.updateMatrixWorld(true);
const scene=new T.Scene(),monuments=createLisbonSeaMonuments(scene,{}),ocean=createDrownedOcean(scene,{profile:'lisbon',mobile:true});
const oceanNY=createDrownedOcean(scene,{mobile:true});
try{
 const {cristoRei,ponte25Abril,surfaceAttachedFoam}=monuments.diagnostics(),water=ocean.diagnostics();
 assert.equal(cristoRei.feetY,stillOceanHeight(CRISTO_REI_LOCATION.x,CRISTO_REI_LOCATION.z)-CRISTO_FEET_DEPTH);
 assert.ok(surfaceAttachedFoam&&water.contactFoam&&water.littoralSpilling);
 assert.equal(water.baseHeight,stillOceanHeight(0,0));
 assert.ok(water.wavelengthMetres>590&&water.crestUpperBound< -10);
 assert.ok(water.coastalShoaling&&water.crestFaceCascades&&water.shoalCrestLift===9.5);
 assert.equal(oceanNY.diagnostics().shoalCrestLift,0);
 assert.equal(oceanNY.diagnostics().mainChop,1.8);
 assert.equal(oceanNY.diagnostics().contactFoam,false);
 const waveBound=(42*(1+.26+.095)+9*1.18+5+3.6+2.3+1.2)*CRISTO_WAVE_SHADOW.transmission;
 assert.ok(cristoRei.pedestalTopY<cristoRei.stillWaterY-waveBound-.05,'The pedestal stays under even the maximum local drawdown');
 const sculpture=figure.diagnostics();
 assert.ok(sculpture.loaded&&sculpture.pedestalLoaded&&sculpture.photographicRelief);
 assert.equal(sculpture.triangles,9604);
 assert.equal(figure.root.getObjectByName('cristo-rei-almada-image-statue'),undefined);
 const bounds=new T.Box3().setFromObject(statue),span=bounds.getSize(new T.Vector3());
 assert.ok(Math.abs(bounds.min.y)<.01&&Math.abs(span.y-28)<.01&&Math.abs(span.x-28)<.01&&span.z>3,'The authored GLB matches the statue height, span and submerged feet anchor');
 const model=new T.Box3().setFromObject(figure.root);
 assert.ok(Math.abs(model.min.y+82.06)<.02&&Math.abs(model.max.y-28)<.02,'The pedestal remains attached beneath the photographic sculpture');
 const [sx,sz]=oceanDomain(CRISTO_REI_LOCATION.x,CRISTO_REI_LOCATION.z);
 assert.ok(Math.hypot(sx,sz)>Math.hypot(CRISTO_REI_LOCATION.x,CRISTO_REI_LOCATION.z));
 for(const offset of [-900,0,900]){
  const {x,z}=PONTE_25_ABRIL_LOCATION,east=x+offset;
  assert.equal(stillOceanHeight(east,z)-bridgeHeight(east,z,BRIDGE_DECK_LOCAL_Y),BRIDGE_DECK_DEPTH);
  assert.ok(bridgeHeight(east,z,190.5)>stillOceanHeight(east,z)+45,'The tower crowns emerge above the flooded roadway');
 }
 assert.ok(ponte25Abril.submergedRoadway&&ponte25Abril.followsOceanCurvature);
 assert.equal(monuments.update(),true);
 assert.equal(monuments.update(),false);
 for(const path of ['ponte_25_abril_l0.glb','ponte_25_abril_l1.glb']){
  assert.ok(fs.statSync('space/assets/lisbon/'+path).size>0);
 }
 console.log('PASS Lisbon monuments, submerged roadway, real crest envelope and shared contact waterline');
}finally{
 figure.dispose();monuments.dispose();ocean.dispose();oceanNY.dispose();assert.equal(scene.children.length,0);
}
