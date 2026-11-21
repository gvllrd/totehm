import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createLisbonSeaMonuments} from '../../space/gallery-lisbon-sea.mjs';
import {createDrownedOcean} from '../../space/gallery-drowned-ocean.mjs';
import {
 BRIDGE_DECK_LOCAL_Y,BRIDGE_DECK_DEPTH,CRISTO_FEET_DEPTH,CRISTO_WAVE_SHADOW,
 CRISTO_REI_LOCATION,PONTE_25_ABRIL_LOCATION,stillOceanHeight,oceanDomain,bridgeHeight
} from '../../space/gallery-lisbon-water.mjs';

const scene=new T.Scene(),monuments=createLisbonSeaMonuments(scene,{}),ocean=createDrownedOcean(scene,{profile:'lisbon',mobile:true});
const oceanNY=createDrownedOcean(scene,{mobile:true});
try{
 const {cristoRei,ponte25Abril,surfaceAttachedFoam}=monuments.diagnostics(),water=ocean.diagnostics();
 assert.equal(cristoRei.feetY,stillOceanHeight(CRISTO_REI_LOCATION.x,CRISTO_REI_LOCATION.z)-CRISTO_FEET_DEPTH);
 assert.ok(surfaceAttachedFoam&&water.contactFoam&&water.littoralSpilling);
 assert.equal(water.baseHeight,stillOceanHeight(0,0));
 assert.ok(water.wavelengthMetres>590&&water.crestUpperBound< -10);
 assert.equal(oceanNY.diagnostics().mainChop,1.8);
 assert.equal(oceanNY.diagnostics().contactFoam,false);
 const waveBound=(42*(1+.26+.095)+9*1.18+5+3.6+2.3+1.2)*CRISTO_WAVE_SHADOW.transmission;
 assert.ok(cristoRei.pedestalTopY<cristoRei.stillWaterY-waveBound-.05,'The pedestal stays under even the maximum local drawdown');
 const figure=monuments.root.getObjectByName('Cristo Rei sculpted limestone figure');
 assert.ok(figure&&figure.getObjectByName('Vertically fluted stone tunic')&&figure.getObjectByName('Carved open palm'));
 const span=new T.Box3().setFromObject(figure).getSize(new T.Vector3());
 assert.ok(span.y>95&&span.x>65,'The head and arms keep the monumental silhouette');
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
 monuments.dispose();ocean.dispose();oceanNY.dispose();assert.equal(scene.children.length,0);
}
