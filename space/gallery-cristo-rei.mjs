import * as T from './vendor/three-0.180.0.mjs';
import {CRISTO_PEDESTAL_HEIGHT} from './gallery-lisbon-water.mjs';

export const CRISTO_MODEL='/assets/lisbon/cristo-rei-almada.glb';
const PEDESTAL_OFFSET=.06;

function softenStoneNormals(geometry){
 const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal');
 if(!normal)return;
 const seams=new Map(),keys=[],sample=new T.Vector3(),averaged=new T.Vector3(),values=new Float32Array(normal.count*3);
 for(let i=0;i<position.count;i++){
  // The export duplicates vertices at every face. Share normals where the stone joins.
  const key=[position.getX(i),position.getY(i),position.getZ(i)].join(',');
  keys.push(key);
  if(!seams.has(key))seams.set(key,new T.Vector3());
  seams.get(key).add(sample.fromBufferAttribute(normal,i));
 }
 for(let i=0;i<normal.count;i++){
  sample.fromBufferAttribute(normal,i).normalize();
  averaged.copy(seams.get(keys[i])).normalize();
  if(sample.dot(averaged)>.38)sample.lerp(averaged,.78).normalize();
  sample.toArray(values,i*3);
 }
 geometry.setAttribute('normal',new T.BufferAttribute(values,3));
}

export function createCristoRei({loader,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Cristo Rei — Almada';
 const geometries=new Set(),materials=new Set();
 let loaded=false,failed=false,disposed=false,triangles=0;
 if(loader)loader.load(CRISTO_MODEL,({scene:model})=>{
  model.updateMatrixWorld(true);
  const parentScale=new T.Vector3();
  model.traverse(object=>{
   if(!object.isMesh)return;
   const geometry=object.geometry;
   geometries.add(geometry);
   for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);
   if(object.name.includes('pedestal'))object.position.y-=PEDESTAL_OFFSET/object.parent.getWorldScale(parentScale).y;
   else if(!disposed)softenStoneNormals(geometry);
   triangles+=(geometry.index?.count??geometry.getAttribute('position').count)/3;
  });
  if(disposed){release();return;}
  for(const material of materials){
   if(material.name==='bronze')continue;
   material.roughness=.93;
   material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader
     .replace('#include <common>','#include <common>\nvarying vec3 vCristoStone;')
     .replace('#include <begin_vertex>','#include <begin_vertex>\nvCristoStone=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader
     .replace('#include <common>','#include <common>\nvarying vec3 vCristoStone;')
     .replace('#include <color_fragment>',`#include <color_fragment>
      vec3 stone=vCristoStone;
      float runoff=sin(stone.x*.49+cos(stone.z*.31)+stone.y*.026);
      float grain=sin(dot(stone,vec3(.31,.54,.27)))*sin(dot(stone,vec3(-.37,.46,.28)));
      diffuseColor.rgb*=.95+.048*runoff+.036*grain;
     `);
   };
  }
  // The model looks north (-Z) from Almada; the Lisbon viewer faces its +Z side.
  model.rotation.y=Math.PI;model.position.y=-CRISTO_PEDESTAL_HEIGHT;
  root.add(model);loaded=triangles>0;failed=!loaded;onChange();
 },undefined,()=>{if(!disposed){failed=true;onChange();}});
 function release(){
  for(const geometry of geometries)geometry.dispose();
  for(const material of materials)material.dispose();
  geometries.clear();materials.clear();
 }
 return{root,
  diagnostics:()=>({asset:CRISTO_MODEL,loaded,failed,triangles,source:'Codriver',licence:'CC BY 4.0',pedestalOffset:PEDESTAL_OFFSET}),
  dispose(){disposed=true;release();root.clear();root.removeFromParent();}
 };
}
