import * as T from './vendor/three-0.180.0.mjs';
import {CRISTO_PEDESTAL_HEIGHT} from './gallery-lisbon-water.mjs';

export const CRISTO_MODEL='/assets/lisbon/cristo-rei-photographic.glb';
export const CRISTO_PEDESTAL_MODEL='/assets/lisbon/cristo-rei-almada.glb';
const PEDESTAL_OFFSET=.06;
const PHOTO_CREDIT='https://commons.wikimedia.org/wiki/File:Cristo_Rei_(36211699613)_(cropped).jpg';

export function createCristoRei({loader,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Cristo Rei — Almada';
 const geometries=new Set(),materials=new Set(),textures=new Set();
 let loaded=false,failed=false,pedestalLoaded=false,disposed=false,triangles=0,credit=null;

 function releaseMesh(mesh){
  mesh.geometry.dispose();
  for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   for(const value of Object.values(material))if(value?.isTexture)value.dispose();
   material.dispose();
  }
 }
 function attach({scene:model},pedestal){
  const meshes=[];
  model.traverse(object=>{if(object.isMesh)meshes.push(object);});
  let retained=0;
  model.updateMatrixWorld(true);
  for(const mesh of meshes){
   if(disposed||pedestal&&!mesh.name.includes('pedestal')){
    releaseMesh(mesh);mesh.removeFromParent();continue;
   }
   retained++;
   const geometry=mesh.geometry;
   geometries.add(geometry);
   for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
    materials.add(material);
    for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
   }
   if(!pedestal)triangles+=(geometry.index?.count??geometry.getAttribute('position').count)/3;
  }
  if(disposed)return;
  if(pedestal){
   // The measured GLB faces north (-Z). The photographed sculpture already faces +Z.
   model.rotation.y=Math.PI;model.position.y=-CRISTO_PEDESTAL_HEIGHT-PEDESTAL_OFFSET;
   pedestalLoaded=retained>0;
  }else{
   loaded=retained>0;failed=!loaded;
   if(loaded&&globalThis.document?.body){
    credit=document.createElement('a');
    credit.href=PHOTO_CREDIT;credit.target='_blank';credit.rel='noopener noreferrer';
    credit.textContent='Cristo Rei · Deensel';
    credit.title='Cristo Rei photograph by Deensel · CC BY 2.0 · cropped by Cristiano Tomás';
    credit.style.cssText='position:fixed;bottom:6px;left:12px;z-index:3;color:#89929e;font:9px/1.3 monospace;text-decoration:none';
    document.body.append(credit);
   }
  }
  if(retained)root.add(model);
  onChange();
 }
 if(loader){
  loader.load(CRISTO_MODEL,model=>attach(model,false),undefined,()=>{
   if(!disposed){failed=true;onChange();}
  });
  loader.load(CRISTO_PEDESTAL_MODEL,model=>attach(model,true),undefined,()=>{
   if(!disposed)onChange();
  });
 }
 return{root,
  diagnostics:()=>({asset:CRISTO_MODEL,loaded,failed,pedestalLoaded,triangles,source:'Deensel',licence:'CC BY 2.0',
   photographicRelief:true,pedestalOffset:PEDESTAL_OFFSET}),
  dispose(){
   disposed=true;credit?.remove();
   for(const texture of textures)texture.dispose();
   for(const geometry of geometries)geometry.dispose();
   for(const material of materials)material.dispose();
   root.clear();root.removeFromParent();
  }
 };
}
