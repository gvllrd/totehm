import * as T from './vendor/three-0.180.0.mjs';
import {LISBON_FRONT_NAMES} from './lisbon-first-page.mjs';

export const LISBON_PROJECTOR_PORTS=Object.freeze(LISBON_FRONT_NAMES.map((_,index)=>{
 const angle=index*2*Math.PI/LISBON_FRONT_NAMES.length;
 return Object.freeze([Math.cos(angle)*1.32,-.021,Math.sin(angle)*1.32]);
}));

export const LISBON_SIGN_STENCIL_BIT=1;
const sides=8;
const verticesPerBeam=sides*2;
const apertureEnd=.16;

function makeReceivers(signs){
 const inverse=new T.Matrix4(),transform=new T.Matrix4(),part=new T.Box3();
 return signs.map(({id,group,hitTargets})=>{
  group.updateWorldMatrix(true,true);
  inverse.copy(group.matrixWorld).invert();
  const bounds=new T.Box3();
  for(const body of hitTargets){
   body.geometry.computeBoundingBox();
   transform.multiplyMatrices(inverse,body.matrixWorld);
   bounds.union(part.copy(body.geometry.boundingBox).applyMatrix4(transform));
  }
  const corners=[],{min,max}=bounds;
  for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z]){
   corners.push(new T.Vector3(x,y,z));
  }
  const body=hitTargets[0],face=body.geometry.boundingBox;
  const contact=new T.Vector3((face.min.x+face.max.x)/2,T.MathUtils.lerp(face.min.y,face.max.y,.88),face.max.z);
  return{id,group,body,contact,center:bounds.getCenter(new T.Vector3()),corners,anchor:new T.Vector3()};
 });
}

export function createLisbonSignRays(parent,signs){
 const geometry=new T.BufferGeometry(),vertices=signs.length*verticesPerBeam;
 const points=new T.BufferAttribute(new Float32Array(vertices*3),3).setUsage(T.DynamicDrawUsage);
 const depths=new T.Float32BufferAttribute(new Float32Array(vertices),1),indices=[];
 const receivers=makeReceivers(signs);
 for(let i=0;i<receivers.length;i++){
  const start=i*verticesPerBeam,end=start+sides;
  for(let j=0;j<sides;j++){
   const next=(j+1)%sides;
   depths.setX(end+j,1);
   indices.push(start+j,start+next,end+j,start+next,end+next,end+j);
  }
 }
 geometry.setAttribute('position',points);geometry.setAttribute('aDepth',depths);geometry.setIndex(indices);
 const material=new T.ShaderMaterial({
  transparent:true,blending:T.NormalBlending,side:T.BackSide,depthTest:true,depthWrite:false,toneMapped:false,
  stencilWrite:true,stencilRef:LISBON_SIGN_STENCIL_BIT,stencilFuncMask:LISBON_SIGN_STENCIL_BIT,
  stencilFunc:T.NotEqualStencilFunc,stencilWriteMask:0,
  uniforms:{time:{value:0}},
  vertexShader:`
   attribute float aDepth;
   varying float vDepth;
   varying vec3 vNormalView;
   varying vec3 vPositionView;
   void main(){
    vec4 point=modelViewMatrix*vec4(position,1.0);
    vDepth=aDepth;
    vNormalView=normalMatrix*normal;
    vPositionView=point.xyz;
    gl_Position=projectionMatrix*point;
   }
  `,
  fragmentShader:`
   uniform float time;
   varying float vDepth;
   varying vec3 vNormalView;
   varying vec3 vPositionView;
   void main(){
    float facing=abs(dot(normalize(vNormalView),normalize(-vPositionView)));
    float skin=smoothstep(0.02,0.62,facing);
    float rise=smoothstep(0.04,0.33,vDepth);
    float fall=1.0-smoothstep(0.75,1.0,vDepth);
    float breath=0.92+0.08*sin(vDepth*7.0-time*0.85);
    float density=(0.04+0.19*skin)*rise*fall*breath;
    vec3 ink=mix(vec3(0.014,0.022,0.032),vec3(0.002,0.003,0.006),skin);
    gl_FragColor=vec4(ink,density);
   }
  `
 });
 const mesh=new T.Mesh(geometry,material);
 mesh.name='Lisbon projector — black volumes enclosing the street objects';
 mesh.frustumCulled=false;mesh.visible=false;mesh.raycast=()=>{};
 parent.add(mesh);

 const source=new T.Vector3(),center=new T.Vector3(),axis=new T.Vector3(),right=new T.Vector3(),up=new T.Vector3();
 const corner=new T.Vector3(),section=new T.Vector3(),point=new T.Vector3();
 const inverse=new T.Matrix4(),objectMatrix=new T.Matrix4();
 const coordinates=[];
 function update(projector,elapsed){
  if(!projector||!mesh.visible)return;
  projector.updateWorldMatrix(true,false);
  parent.updateWorldMatrix(true,false);
  inverse.copy(parent.matrixWorld).invert();
  for(let index=0;index<receivers.length;index++){
   const {group,body,contact,corners,center:objectCenter,anchor}=receivers[index];
   group.updateWorldMatrix(true,false);body.updateWorldMatrix(false,false);
   objectMatrix.multiplyMatrices(inverse,group.matrixWorld);
   anchor.copy(contact).applyMatrix4(body.matrixWorld).applyMatrix4(inverse);
   source.fromArray(LISBON_PROJECTOR_PORTS[index]).applyMatrix4(projector.matrixWorld).applyMatrix4(inverse);
   center.copy(objectCenter).applyMatrix4(objectMatrix);
   axis.copy(center).sub(source).normalize();
   right.set(1,0,0).transformDirection(objectMatrix);
   right.addScaledVector(axis,-right.dot(axis)).normalize();
   up.crossVectors(axis,right).normalize();

   let endDistance=0,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
   // Project every corner from the port onto a plane past the entire object.
   for(let j=0;j<corners.length;j++){
    corner.copy(corners[j]).applyMatrix4(objectMatrix).sub(source);
    const depth=Math.max(.1,corner.dot(axis));
    endDistance=Math.max(endDistance,depth);
    const x=corner.dot(right)/depth,y=corner.dot(up)/depth;
    minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   }
   endDistance+=apertureEnd;
   minX*=endDistance;maxX*=endDistance;minY*=endDistance;maxY*=endDistance;
   const span=Math.min(maxX-minX,maxY-minY),pad=.05+span*.07;
   minX-=pad;maxX+=pad;minY-=pad;maxY+=pad;
   const bevel=Math.min(pad*1.55,(maxX-minX)*.23,(maxY-minY)*.23);
   coordinates[0]=minX+bevel;coordinates[1]=minY;
   coordinates[2]=maxX-bevel;coordinates[3]=minY;
   coordinates[4]=maxX;coordinates[5]=minY+bevel;
   coordinates[6]=maxX;coordinates[7]=maxY-bevel;
   coordinates[8]=maxX-bevel;coordinates[9]=maxY;
   coordinates[10]=minX+bevel;coordinates[11]=maxY;
   coordinates[12]=minX;coordinates[13]=maxY-bevel;
   coordinates[14]=minX;coordinates[15]=minY+bevel;
   const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
   const throat=.034/Math.hypot(maxX-cx,maxY-cy);
   const first=index*verticesPerBeam;
   section.copy(source).addScaledVector(axis,endDistance);
   for(let j=0;j<sides;j++){
    const x=coordinates[j*2],y=coordinates[j*2+1];
    point.copy(source).addScaledVector(right,(x-cx)*throat).addScaledVector(up,(y-cy)*throat);
    points.setXYZ(first+j,point.x,point.y,point.z);
    point.copy(section).addScaledVector(right,x).addScaledVector(up,y);
    points.setXYZ(first+sides+j,point.x,point.y,point.z);
   }
  }
  points.needsUpdate=true;
  geometry.computeVertexNormals();
  material.uniforms.time.value=elapsed;
 }
 return{mesh,update,
  diagnostics(projector){
   const sample=new T.Vector3();
   projector.updateWorldMatrix(true,false);
   mesh.updateWorldMatrix(true,false);
   return receivers.map(({id,anchor,group,corners},i)=>({
    id,from:sample.fromArray(LISBON_PROJECTOR_PORTS[i]).applyMatrix4(projector.matrixWorld).toArray(),
    to:sample.copy(anchor).applyMatrix4(mesh.matrixWorld).toArray(),
    aperture:Array.from({length:sides},(_,j)=>sample.fromBufferAttribute(points,i*verticesPerBeam+sides+j).applyMatrix4(mesh.matrixWorld).toArray()),
    bounds:corners.map(corner=>sample.copy(corner).applyMatrix4(group.matrixWorld).toArray())
   }));
  },
  dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();}
 };
}
