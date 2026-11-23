import * as T from './vendor/three-0.180.0.mjs';
import {GLTFLoader} from './vendor/GLTFLoader-0.180.0.mjs';
import {MeshoptDecoder} from './vendor/meshopt_decoder.module.js';
import {WORLD_CENTER_Y,WORLD_RADIUS} from './gallery-drowned-planet.mjs';
import {createCristoRei} from './gallery-cristo-rei.mjs';
import {
 CRISTO_REI_LOCATION,PONTE_25_ABRIL_LOCATION,CRISTO_PEDESTAL_HEIGHT,CRISTO_STATUE_HEIGHT,
 BRIDGE_DECK_LOCAL_Y,BRIDGE_DECK_DEPTH,cristoFeetHeight,bridgeHeight,stillOceanHeight
} from './gallery-lisbon-water.mjs';

export {CRISTO_REI_LOCATION,PONTE_25_ABRIL_LOCATION};

export function createLisbonSeaMonuments(scene,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Submerged monuments of Lisbon';scene.add(root);
 const geometries=new Set(),materials=new Set();
 let disposed=false,dirty=true,bridgeLoaded=false,bridgeFailed=false,towerSpan=0;
 const loader=globalThis.document?.createElementNS?new GLTFLoader():null;
 loader?.setMeshoptDecoder(MeshoptDecoder);
 const changed=()=>{dirty=true;onChange();};
 const figure=createCristoRei({loader,onChange:changed});
 const cristo=CRISTO_REI_LOCATION,bridge=PONTE_25_ABRIL_LOCATION,feetY=cristoFeetHeight();
 figure.root.position.set(cristo.x,feetY,cristo.z);figure.root.scale.setScalar(cristo.scale);
 const vertical=new T.Vector3(0,1,0),localUp=new T.Vector3(cristo.x,stillOceanHeight(cristo.x,cristo.z)-WORLD_CENTER_Y,cristo.z).normalize();
 figure.root.quaternion.setFromUnitVectors(vertical,localUp).multiply(new T.Quaternion().setFromAxisAngle(vertical,cristo.yaw));
 root.add(figure.root);

 const bridgeRoot=new T.Group();bridgeRoot.name='Ponte 25 de Abril under the flooded Tagus';root.add(bridgeRoot);
 const bridgeSteel=new T.MeshStandardMaterial({color:0xa93b2e,roughness:.69,metalness:.35});
 const cables=new T.MeshStandardMaterial({color:0x3b3937,roughness:.62,metalness:.58});
 const causeway=new T.MeshStandardMaterial({color:0x697075,roughness:.89});
 for(const material of [bridgeSteel,cables,causeway])materials.add(material);
 const storage=mobile?'/assets/lisbon/ponte_25_abril_l1.glb':'/assets/lisbon/ponte_25_abril_l0.glb';
 const point=new T.Vector3(),normal=new T.Vector3(),normalMatrix=new T.Matrix3(),up=new T.Vector3(0,1,0);
 const cosine=Math.cos(bridge.yaw),sine=Math.sin(bridge.yaw);

 function attachBridge(model){
  model.updateMatrixWorld(true);
  const objects=[],sourceMaterials=new Set(),sourceGeometries=new Set(),sourceTextures=new Set();
  const towers=new T.Box3();
  model.traverse(o=>{
   if(!o.isMesh||!o.geometry?.attributes.position)return;
   if(!disposed)objects.push(o);
   sourceGeometries.add(o.geometry);
   for(const material of Array.isArray(o.material)?o.material:[o.material]){
    if(!material)continue;
    sourceMaterials.add(material);
    for(const texture of Object.values(material))if(texture?.isTexture)sourceTextures.add(texture);
   }
   if(disposed)return;
   const vertices=o.geometry.attributes.position;
   for(let i=0;i<vertices.count;i++){
    point.fromBufferAttribute(vertices,i).applyMatrix4(o.matrixWorld);
    if(point.y>178)towers.expandByPoint(point);
   }
  });
  if(!disposed){
   const centre=towers.isEmpty()?new T.Vector3(-140,0,0):towers.getCenter(new T.Vector3());
   towerSpan=towers.isEmpty()?0:(towers.max.z-towers.min.z)*bridge.scale;
   for(const source of objects){
    const geometry=source.geometry.clone(),vertices=geometry.attributes.position,normals=geometry.attributes.normal;
    normalMatrix.getNormalMatrix(source.matrixWorld);
    for(let i=0;i<vertices.count;i++){
     point.fromBufferAttribute(vertices,i).applyMatrix4(source.matrixWorld);
     const x=(point.x-centre.x)*bridge.scale,z=(point.z-centre.z)*bridge.scale;
     const east=bridge.x+x*cosine+z*sine,north=bridge.z-x*sine+z*cosine;
     vertices.setXYZ(i,east,bridgeHeight(east,north,point.y),north);
     if(normals){
      const cosLatitude=Math.sqrt(Math.max(1,WORLD_RADIUS*WORLD_RADIUS-east*east-north*north));
      normal.fromBufferAttribute(normals,i).applyNormalMatrix(normalMatrix).applyAxisAngle(up,bridge.yaw);
      normal.set(normal.x+normal.y*east/cosLatitude,normal.y,normal.z+normal.y*north/cosLatitude).normalize();
      normals.setXYZ(i,normal.x,normal.y,normal.z);
     }
    }
    if(!normals)geometry.computeVertexNormals();
    geometry.computeBoundingBox();geometry.computeBoundingSphere();geometries.add(geometry);
    const map=(material)=>{
     const name=material?.name?.toLowerCase()??'';
     return name.includes('redwood')||name.includes('red')?bridgeSteel:name.includes('000')||name.includes('cable')?cables:causeway;
    };
    const mesh=new T.Mesh(geometry,Array.isArray(source.material)?source.material.map(map):map(source.material));
    mesh.name='Submerged suspension steel and roadway';bridgeRoot.add(mesh);
   }
   bridgeLoaded=bridgeRoot.children.length>0;dirty=true;onChange();
  }
  for(const geometry of sourceGeometries)geometry.dispose();
  for(const material of sourceMaterials)material.dispose();
  for(const texture of sourceTextures)texture.dispose();
 }
 if(loader){
  loader.load(storage,gltf=>attachBridge(gltf.scene),undefined,()=>{
   if(!disposed){bridgeFailed=true;dirty=true;onChange();}
  });
 }

 return{
  root,
  update(){const changed=dirty&&!disposed;dirty=false;return changed;},
  diagnostics:()=>({
   kind:'lisbon-sea-monuments',place:'lisbon',ready:!loader||bridgeLoaded&&figure.diagnostics().loaded,loaded:bridgeLoaded,
   submerged:true,bridgeFailed,
   cristoRei:{
    monument:'Santuário de Cristo Rei',location:[cristo.x,feetY,cristo.z],yaw:cristo.yaw,scale:cristo.scale,
    stillWaterY:stillOceanHeight(cristo.x,cristo.z),feetY,pedestalTopY:feetY-.06*cristo.scale,
    ...figure.diagnostics(),submergedPillars:true,measuredExterior:true,
    pedestalHeightMetres:CRISTO_PEDESTAL_HEIGHT,statueHeightMetres:CRISTO_STATUE_HEIGHT
   },
   ponte25Abril:{
    bridge:'Ponte 25 de Abril',location:[bridge.x,bridgeHeight(bridge.x,bridge.z,BRIDGE_DECK_LOCAL_Y),bridge.z],
    yaw:bridge.yaw,scale:bridge.scale,towerHeightMetres:190.5,spanLengthMetres:1013,fittedSpan:towerSpan,
    internationalOrange:true,submergedPiers:true,submergedRoadway:true,deckDepth:BRIDGE_DECK_DEPTH,followsOceanCurvature:true
   },
   surfaceAttachedFoam:true,disposed
  }),
  dispose(){
   if(disposed)return;disposed=true;
   figure.dispose();
   for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
   root.removeFromParent();root.clear();
  }
 };
}
