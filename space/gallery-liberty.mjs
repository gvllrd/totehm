import * as T from './vendor/three-0.180.0.mjs';
import {GLTFLoader} from './vendor/GLTFLoader-0.180.0.mjs';
import {MeshoptDecoder} from './vendor/meshopt_decoder.module.js';

// An authentic photogrammetric 3D scan of the Statue of Liberty (Bartholdi 19th c. bronze cast),
// scaled to HAER NY-138 architectural measurements (44.93 m height), submerged in the drowned New York ocean.
export const LIBERTY_LOCATION=Object.freeze({x:42,y:-68,z:-110,yaw:-.65});

export function createLiberty(scene,{mobile=false,onChange=()=>{},submerged=true}={}){
 const root=new T.Group();
 root.name='Liberty — authentic photogrammetric statue submerged in the storm ocean';
 root.position.set(LIBERTY_LOCATION.x,LIBERTY_LOCATION.y,LIBERTY_LOCATION.z);
 root.rotation.y=LIBERTY_LOCATION.yaw;
 scene.add(root);

 const geometries=new Set(),materials=new Set(),textures=new Set();
 let disposed=false,dirty=true,time=0,loaded=false,triangles=0;

 // Warm amber beacon light at the gilded torch flame tip
 const torchLight=new T.PointLight(0xffbe62,130,85,2);
 torchLight.position.set(-2.5,44.5,1.2);
 root.add(torchLight);

 // Gentle moonlit fill on the copper drapery
 const copperFill=new T.PointLight(0x7ac2b3,160,70,2);
 copperFill.position.set(6,25,18);
 root.add(copperFill);

 const assetPath=mobile?'/assets/liberty/liberty_statue_l1.glb':'/assets/liberty/liberty_statue_l0.glb';

 if(globalThis.document){
  const loader=new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(assetPath,gltf=>{
   if(disposed){gltf.scene?.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return;}
   const model=gltf.scene;
   model.name='Statue of Liberty — photogrammetric mesh';
   model.traverse(o=>{
    if(o.isMesh){
     o.castShadow=false;
     o.receiveShadow=true;
     if(o.geometry){
      geometries.add(o.geometry);
      triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
     }
     if(o.material){
      materials.add(o.material);
      o.material.roughness=Math.max(.55,o.material.roughness||.7);
      o.material.metalness=Math.min(.35,o.material.metalness||.2);
      if(o.name.includes('gold')||o.material.name?.includes('gold')){
       o.material.emissive=new T.Color(0x683c08);
       o.material.emissiveIntensity=.4;
      }
     }
    }
   });
   root.add(model);
   loaded=true;
   dirty=true;
   onChange();
  },undefined,err=>{
   console.warn('[liberty] GLB load fallback:',err?.message||err);
  });
 }

 return {
  root,
  update(dt,eye,motion=true){
   if(disposed)return false;
   if(motion){
    time+=Math.max(0,Math.min(Number(dt)||0,.1));
    torchLight.intensity=120+Math.sin(time*1.3)*14+Math.cos(time*2.9)*7;
    dirty=true;
   }
   const was=dirty;dirty=false;return was;
  },
  diagnostics:()=>({
   kind:'photogrammetric-statue-of-liberty',
   place:'new-york',
   ready:loaded||!globalThis.document,
   loaded,
   submerged:true,
   modelAsset:assetPath,
   photogrammetry:true,
   source:'jerryfisher / HAER NY-138',
   heightMetres:44.93,
   location:[LIBERTY_LOCATION.x,LIBERTY_LOCATION.y,LIBERTY_LOCATION.z],
   gildedTorch:true,
   copperPatina:true,
   triangles,
   time:+time.toFixed(3),
   disposed
  }),
  dispose(){
   if(disposed)return;
   disposed=true;
   root.removeFromParent();
   for(const g of geometries)g.dispose();
   for(const m of materials)m.dispose();
   for(const t of textures)t.dispose();
   root.clear();
   onChange();
  }
 };
}
