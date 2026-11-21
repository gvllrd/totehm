import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createLisbonSeaMonuments, CRISTO_REI_LOCATION, PONTE_25_ABRIL_LOCATION} from '../../space/gallery-lisbon-sea.mjs';

const scene=new T.Scene();
const monuments=createLisbonSeaMonuments(scene,{});

try{
 const diag=monuments.diagnostics();
 assert.equal(diag.kind,'lisbon-sea-monuments');
 assert.equal(diag.place,'lisbon');
 assert.equal(diag.submerged,true);
 assert.equal(diag.crashingWaveFoam,true);
 assert.ok(diag.seaSprayParticles>0);

 // Cristo Rei diagnostics
 assert.equal(diag.cristoRei.monument,'Santuário de Cristo Rei');
 assert.equal(diag.cristoRei.scale,CRISTO_REI_LOCATION.scale);
 assert.equal(diag.cristoRei.submergedPillars,true);
 assert.equal(diag.cristoRei.lunarCorona,true);
 assert.ok(diag.cristoRei.heightMetres>100,'monument height is colossal');
 assert.deepEqual(diag.cristoRei.location,[CRISTO_REI_LOCATION.x,CRISTO_REI_LOCATION.y,CRISTO_REI_LOCATION.z]);

 // Ponte 25 de Abril diagnostics
 assert.equal(diag.ponte25Abril.bridge,'Ponte 25 de Abril');
 assert.equal(diag.ponte25Abril.scale,PONTE_25_ABRIL_LOCATION.scale);
 assert.equal(diag.ponte25Abril.internationalOrange,true);
 assert.equal(diag.ponte25Abril.aviationBeacons,true);
 assert.equal(diag.ponte25Abril.submergedPiers,true);
 assert.ok(diag.ponte25Abril.towerHeightMetres>100,'bridge suspension towers are monumental');
 assert.ok(diag.ponte25Abril.spanLengthMetres>2000,'bridge spans the Tagus sea horizon');
 assert.deepEqual(diag.ponte25Abril.location,[PONTE_25_ABRIL_LOCATION.x,PONTE_25_ABRIL_LOCATION.y,PONTE_25_ABRIL_LOCATION.z]);

 // Scene graph structure
 assert.equal(monuments.root.parent,scene);
 assert.ok(monuments.root.children.length>=2,'contains Cristo Rei and Bridge roots');

 // Update advance
 const eye=new T.Vector3(0,1.65,5);
 assert.equal(monuments.update(0.016,eye,true),true);

 // Assets verification
 const assets=[
  'space/assets/lisbon/cristo_rei_l0.glb',
  'space/assets/lisbon/cristo_rei_l1.glb',
  'space/assets/lisbon/ponte_25_abril_l0.glb',
  'space/assets/lisbon/ponte_25_abril_l1.glb',
  'space/assets/lisbon/LICENSE.txt'
 ];
 for(const asset of assets){
  assert.ok(fs.existsSync(asset),'asset exists on disk: '+asset);
  assert.ok(fs.statSync(asset).size>0,'asset is non-empty: '+asset);
 }

 console.log('PASS Lisbon sea monuments (Cristo Rei & Ponte 25 de Abril) submerged in ocean breakers');
}finally{
 monuments.dispose();
 assert.equal(monuments.diagnostics().disposed,true);
 assert.equal(monuments.root.parent,null);
}
