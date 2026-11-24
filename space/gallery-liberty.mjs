import * as T from './vendor/three-0.180.0.mjs';
import {GLTFLoader} from './vendor/GLTFLoader-0.180.0.mjs';
import {MeshoptDecoder} from './vendor/meshopt_decoder.module.js';
import {WORLD_CENTER_Y} from './gallery-drowned-planet.mjs';
import {CRISTO_REI_LOCATION,cristoFeetHeight,stillOceanHeight} from './gallery-lisbon-water.mjs';

// Both monuments occupy the same position relative to their own island.
export const LIBERTY_LOCATION=Object.freeze({
 x:CRISTO_REI_LOCATION.x,
 y:cristoFeetHeight(),
 z:CRISTO_REI_LOCATION.z,
 yaw:CRISTO_REI_LOCATION.yaw,
 scale:4.2
});

export function createLiberty(scene,{mobile=false,onChange=()=>{},submerged=true}={}){
 const root=new T.Group();
 root.name='Liberty — monumental photogrammetric statue submerged in storm breakers';
 root.position.set(LIBERTY_LOCATION.x,LIBERTY_LOCATION.y,LIBERTY_LOCATION.z);
 const {x,z,yaw}=LIBERTY_LOCATION;
 const up=new T.Vector3(0,1,0);
 const localUp=new T.Vector3(x,stillOceanHeight(x,z)-WORLD_CENTER_Y,z).normalize();
 root.quaternion.setFromUnitVectors(up,localUp).multiply(new T.Quaternion().setFromAxisAngle(up,yaw));
 root.scale.setScalar(LIBERTY_LOCATION.scale);
 scene.add(root);

 const geometries=new Set(),materials=new Set(),textures=new Set();
 let disposed=false,dirty=true,time=0,loaded=false,triangles=0;

 // Precise center of the gilded torch flame from HAER NY-138 photogrammetry scan
 const TORCH_POS=new T.Vector3(-3.693,43.988,6.361);

 // 1. Powerful warm amber beacon light at the gilded torch flame tip
 const torchLight=new T.PointLight(0xffaa38,5400,340,2);
 torchLight.position.copy(TORCH_POS);
 root.add(torchLight);

 // 2. Luminous beacon corona sprite at the flame tip
 const canvas=globalThis.document?.createElement('canvas');
 let coronaMesh=null;
 if(canvas){
  canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  if(ctx){
   const g=ctx.createRadialGradient(64,64,0,64,64,64);
   g.addColorStop(0,'rgba(255,220,130,1)');
   g.addColorStop(.25,'rgba(255,160,50,.7)');
   g.addColorStop(.6,'rgba(255,90,20,.2)');
   g.addColorStop(1,'rgba(255,50,0,0)');
   ctx.fillStyle=g;
   ctx.fillRect(0,0,128,128);
   const coronaTex=new T.CanvasTexture(canvas);
   textures.add(coronaTex);
   const coronaMat=new T.SpriteMaterial({map:coronaTex,color:0xffbf60,transparent:true,blending:T.AdditiveBlending,depthWrite:false});
   materials.add(coronaMat);
   coronaMesh=new T.Sprite(coronaMat);
   coronaMesh.position.copy(TORCH_POS);
   coronaMesh.scale.set(14,14,1);
   root.add(coronaMesh);
  }
 }

 // 3. Cool moonlit fill across the drapery folds
 const moonFill=new T.PointLight(0x7cb5d8,2600,200,2);
 moonFill.position.set(6,28,16);
 root.add(moonFill);

 // 4. Reflected light from the ocean across the lower drapery
 const seaFill=new T.PointLight(0x247568,3200,160,2);
 seaFill.position.set(0,9,10);
 root.add(seaFill);

 // 5. Load the original photogrammetric scan
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
      // Gilded 24k torch flame: radiant warm golden emission
      if(o.name==='statue_2'||o.material.name==='lb:gold'||o.name.includes('gold')||o.material.name?.includes('gold')){
       o.material.color.set(0xffcf68);
       o.material.emissive=new T.Color(0xff8c18);
       o.material.emissiveIntensity=2.6;
       o.material.roughness=0.22;
       o.material.metalness=0.88;
      }else{
       // Weathered marine Bartholdi copper verdigris patina with rain/wave sheen
       o.material.color.set(0x4c857b);
       o.material.roughness=0.40;
       o.material.metalness=0.28;
      }
     }
    }
   });
   const bounds=new T.Box3().setFromObject(model);
   if(!bounds.isEmpty()){
    model.position.y-=bounds.min.y;
    torchLight.position.y-=bounds.min.y;
    if(coronaMesh)coronaMesh.position.y-=bounds.min.y;
   }
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
    const delta=Math.max(0,Math.min(Number(dt)||0,.1));
    time+=delta;
    // Multi-harmonic torch flame flicker
    torchLight.intensity=5200+Math.sin(time*2.1)*680+Math.cos(time*4.7)*360+Math.sin(time*10.3)*180;
    if(coronaMesh){
     const coronaScale=13+Math.sin(time*3.4)*1.6+Math.cos(time*6.8)*0.8;
     coronaMesh.scale.set(coronaScale,coronaScale,1);
    }
    dirty=true;
   }
   const was=dirty;dirty=false;return was;
  },
  diagnostics:()=>({
   kind:'photogrammetric-statue-of-liberty',
   place:'new-york',
   ready:loaded||!globalThis.document,
   loaded,
   submerged,
   stillWaterY:stillOceanHeight(x,z),
   modelAsset:assetPath,
   photogrammetry:true,
   source:'jerryfisher / HAER NY-138',
   heightMetres:+(44.93*LIBERTY_LOCATION.scale).toFixed(2),
   scale:LIBERTY_LOCATION.scale,
   location:[LIBERTY_LOCATION.x,LIBERTY_LOCATION.y,LIBERTY_LOCATION.z],
   yaw:LIBERTY_LOCATION.yaw,
   gildedTorch:true,
   beaconIntensity:+torchLight.intensity.toFixed(1),
   copperPatina:true,
   crashingWaveFoam:false,
   seaSprayParticles:0,
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
