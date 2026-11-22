import * as T from './vendor/three-0.180.0.mjs';
import {LISBON_FRONT_NAMES} from './lisbon-first-page.mjs';

export const LISBON_PROJECTOR_PORTS=Object.freeze(LISBON_FRONT_NAMES.map((_,index)=>{
 const angle=index*2*Math.PI/LISBON_FRONT_NAMES.length;
 return Object.freeze([Math.cos(angle)*1.32,-.021,Math.sin(angle)*1.32]);
}));

export function createLisbonSignRays(parent,signs){
 const geometry=new T.BufferGeometry(),vertices=signs.length*4;
 const points=new T.BufferAttribute(new Float32Array(vertices*3),3).setUsage(T.DynamicDrawUsage);
 const opposite=new T.BufferAttribute(new Float32Array(vertices*3),3).setUsage(T.DynamicDrawUsage);
 const uv=[],phases=[],indices=[];
 const receivers=signs.map(({id,hitTargets},index)=>{
  const offset=4*index,body=hitTargets[0];
  body.geometry.computeBoundingBox();
  const {min,max}=body.geometry.boundingBox;
  const contact=new T.Vector3((min.x+max.x)/2,T.MathUtils.lerp(min.y,max.y,.88),max.z);
  uv.push(-1,0,1,0,-1,1,1,1);
  phases.push(index,index,index,index);
  indices.push(offset,offset+1,offset+2,offset+1,offset+3,offset+2);
  return{id,body,contact};
 });
 geometry.setAttribute('position',points);
 geometry.setAttribute('aOpposite',opposite);
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 geometry.setAttribute('aPhase',new T.Float32BufferAttribute(phases,1));
 geometry.setIndex(indices);
 const material=new T.ShaderMaterial({
  transparent:true,blending:T.AdditiveBlending,side:T.DoubleSide,depthTest:true,depthWrite:false,toneMapped:false,
  uniforms:{viewport:{value:new T.Vector2(1600,900)},time:{value:0}},
  vertexShader:`
   attribute vec3 aOpposite;
   attribute float aPhase;
   uniform vec2 viewport;
   varying vec2 vUv;
   varying float vPhase;
   vec2 projected(vec4 p){
    return p.xy/(p.w<0.0?min(-0.02,p.w):max(0.02,p.w));
   }
   void main(){
    vUv=uv;vPhase=aPhase;
    vec4 point=projectionMatrix*modelViewMatrix*vec4(position,1.0);
    vec4 other=projectionMatrix*modelViewMatrix*vec4(aOpposite,1.0);
    vec2 direction=(projected(other)-projected(point))*viewport*(1.0-2.0*uv.y);
    vec2 perpendicular=vec2(-direction.y,direction.x)*inversesqrt(max(dot(direction,direction),0.01));
    float radius=mix(2.2,3.2,uv.y);
    point.xy+=2.0*perpendicular*radius*uv.x*point.w/viewport;
    gl_Position=point;
   }
  `,
  fragmentShader:`
   uniform float time;
   varying vec2 vUv;
   varying float vPhase;
   void main(){
    float across=abs(vUv.x);
    float core=exp(-18.0*across*across);
    float halo=1.0-smoothstep(0.1,1.0,across);
    float travel=fract(time*0.188+vPhase*0.379);
    float distanceToPulse=vUv.y-travel;
    float pulse=exp(-250.0*distanceToPulse*distanceToPulse);
    float contact=smoothstep(0.96,1.0,vUv.y);
    float strength=0.66+0.34*smoothstep(0.0,0.20,vUv.y);
    vec3 light=mix(vec3(0.37,0.64,0.92),vec3(0.56,0.56,0.83),fract(vPhase*0.327));
    gl_FragColor=vec4(light,strength*(0.35*core+0.064*halo+0.19*pulse*core+0.15*contact*halo));
   }
  `
 });
 const mesh=new T.Mesh(geometry,material);
 mesh.name='Lisbon projector — one ray per real street object';
 mesh.frustumCulled=false;mesh.visible=false;mesh.raycast=()=>{};
 mesh.onBeforeRender=renderer=>renderer.getSize(material.uniforms.viewport.value);
 parent.add(mesh);

 const localPort=new T.Vector3(),source=new T.Vector3(),target=new T.Vector3(),inverse=new T.Matrix4();
 function update(projector,elapsed){
  if(!projector||!mesh.visible)return;
  projector.updateWorldMatrix(true,false);
  parent.updateWorldMatrix(true,false);
  inverse.copy(parent.matrixWorld).invert();
  for(let index=0;index<receivers.length;index++){
   const {body,contact}=receivers[index],offset=index*4;
   body.updateWorldMatrix(true,false);
   localPort.fromArray(LISBON_PROJECTOR_PORTS[index]);
   source.copy(localPort).applyMatrix4(projector.matrixWorld).applyMatrix4(inverse);
   target.copy(contact).applyMatrix4(body.matrixWorld).applyMatrix4(inverse);
   for(let vertex=0;vertex<4;vertex++){
    const point=vertex<2?source:target,other=vertex<2?target:source;
    points.setXYZ(offset+vertex,point.x,point.y,point.z);
    opposite.setXYZ(offset+vertex,other.x,other.y,other.z);
   }
  }
  points.needsUpdate=true;opposite.needsUpdate=true;material.uniforms.time.value=elapsed;
 }
 return{mesh,update,
  diagnostics(){
   const sample=new T.Vector3();
   mesh.updateWorldMatrix(true,false);
   return receivers.map(({id},i)=>({id,from:sample.fromBufferAttribute(points,4*i).applyMatrix4(mesh.matrixWorld).toArray(),
    to:sample.fromBufferAttribute(points,4*i+2).applyMatrix4(mesh.matrixWorld).toArray()}));
  },
  dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();}
 };
}
