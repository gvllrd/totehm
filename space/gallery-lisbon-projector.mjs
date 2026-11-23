import * as T from './vendor/three-0.180.0.mjs';
import {LISBON_FRONT_NAMES} from './lisbon-first-page.mjs';

export const LISBON_PROJECTOR_PORTS=Object.freeze(LISBON_FRONT_NAMES.map((_,index)=>{
 const angle=index*2*Math.PI/LISBON_FRONT_NAMES.length;
 return Object.freeze([Math.cos(angle)*1.32,-.021,Math.sin(angle)*1.32]);
}));

export const LISBON_SIGN_STENCIL_BIT=1;
const sides=8;
const sections=10;
const verticesPerBeam=sides*(sections+1);
const apertureEnd=.16;

function makeReceivers(signs){
 const inverse=new T.Matrix4(),transform=new T.Matrix4(),part=new T.Box3();
 return signs.map(({id,group,face,hitTargets})=>{
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
  const body=hitTargets[0],faceBounds=body.geometry.boundingBox;
  const contact=new T.Vector3((faceBounds.min.x+faceBounds.max.x)/2,T.MathUtils.lerp(faceBounds.min.y,faceBounds.max.y,.88),faceBounds.max.z);
  return{id,group,body,contact,held:!face.userData.groundMarking,center:bounds.getCenter(new T.Vector3()),corners,anchor:new T.Vector3()};
 });
}

export function createLisbonSignRays(parent,signs){
 const geometry=new T.BufferGeometry(),vertices=signs.length*verticesPerBeam;
 const points=new T.BufferAttribute(new Float32Array(vertices*3),3).setUsage(T.DynamicDrawUsage);
 const layers=new T.Float32BufferAttribute(new Float32Array(vertices*4),4),indices=[];
 const receivers=makeReceivers(signs);
 for(let i=0;i<receivers.length;i++){
  const first=i*verticesPerBeam;
  for(let ring=0;ring<=sections;ring++){
   const start=first+ring*sides,end=start+sides;
   for(let j=0;j<sides;j++){
    const next=(j+1)%sides,angle=j*2*Math.PI/sides;
    layers.setXYZW(start+j,ring/sections,Math.cos(angle),Math.sin(angle),receivers[i].held?1:0);
    if(ring<sections)indices.push(start+j,start+next,end+j,start+next,end+next,end+j);
   }
  }
 }
 geometry.setAttribute('position',points);geometry.setAttribute('aLayer',layers);geometry.setIndex(indices);
 const material=new T.ShaderMaterial({
  transparent:true,blending:T.NormalBlending,side:T.BackSide,depthTest:true,depthWrite:false,toneMapped:false,
  stencilWrite:true,stencilRef:LISBON_SIGN_STENCIL_BIT,stencilFuncMask:LISBON_SIGN_STENCIL_BIT,
  stencilFunc:T.NotEqualStencilFunc,stencilWriteMask:0,
  uniforms:{time:{value:0}},
  vertexShader:`
   attribute vec4 aLayer;
   varying vec4 vLayer;
   varying vec3 vNormalView;
   varying vec3 vPositionView;
   void main(){
    vec4 point=modelViewMatrix*vec4(position,1.0);
    vLayer=aLayer;
    vNormalView=normalMatrix*normal;
    vPositionView=point.xyz;
    gl_Position=projectionMatrix*point;
   }
  `,
  fragmentShader:`
   uniform float time;
   varying vec4 vLayer;
   varying vec3 vNormalView;
   varying vec3 vPositionView;
   void main(){
    float facing=abs(dot(normalize(vNormalView),normalize(-vPositionView)));
    float skin=smoothstep(0.02,0.62,facing);
    float depth=vLayer.x;
    float rise=smoothstep(0.04,0.27,depth);
    float fall=1.0-smoothstep(0.8,1.0,depth);
    float winding=atan(vLayer.z,vLayer.y)*2.0+depth*22.0-time*0.53;
    float curl=sin(winding)+0.10*sin(depth*33.0-time*0.31);
    float contour=smoothstep(0.82,0.99,curl)*smoothstep(0.28,0.62,depth)*fall*vLayer.w;
    float density=(0.025+0.095*skin)*rise*fall+0.11*contour;
    vec3 ink=mix(vec3(0.004,0.006,0.010),vec3(0.025,0.034,0.047),contour*.76+(1.0-skin)*.13);
    gl_FragColor=vec4(ink,density);
   }
  `
 });
 const mesh=new T.Mesh(geometry,material);
 mesh.name='Lisbon saucer — magnetic suspension and ground projections';
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
   const {group,body,contact,corners,center:objectCenter,anchor,held}=receivers[index];
   group.updateWorldMatrix(true,false);body.updateWorldMatrix(false,false);
   objectMatrix.multiplyMatrices(inverse,group.matrixWorld);
   anchor.copy(contact).applyMatrix4(body.matrixWorld).applyMatrix4(inverse);
   source.fromArray(LISBON_PROJECTOR_PORTS[index]).applyMatrix4(projector.matrixWorld).applyMatrix4(inverse);
   center.copy(objectCenter).applyMatrix4(objectMatrix);
   axis.copy(center).sub(source).normalize();
   right.set(1,0,0).transformDirection(objectMatrix);
   right.addScaledVector(axis,-right.dot(axis)).normalize();
   up.crossVectors(axis,right).normalize();

   let endDistance=0,frontDistance=Infinity,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
   // Project every corner from the port onto a plane past the entire object.
   for(let j=0;j<corners.length;j++){
    corner.copy(corners[j]).applyMatrix4(objectMatrix).sub(source);
    const depth=Math.max(.1,corner.dot(axis));
    endDistance=Math.max(endDistance,depth);frontDistance=Math.min(frontDistance,depth);
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
   // Bow the field only upstream of the sign; its final rings still enclose the exact object.
   const flexEnd=Math.min(.77,Math.max(.12,frontDistance/endDistance-1/sections));
   const twist=index*1.41+elapsed*.24,reach=Math.min(.74,endDistance*.057);
   const lateral=Math.sin(twist)*reach,forward=Math.cos(twist)*reach*.58;
   for(let ring=0;ring<=sections;ring++){
    const t=ring/sections;
    const flex=held&&t<flexEnd?Math.sin(Math.PI*t/flexEnd)**2:0;
    const radius=T.MathUtils.lerp(throat,1,t)+.07*flex;
    section.copy(source).addScaledVector(axis,endDistance*t)
     .addScaledVector(right,cx*t+lateral*flex).addScaledVector(up,cy*t+forward*flex);
    for(let j=0;j<sides;j++){
     point.copy(section).addScaledVector(right,(coordinates[j*2]-cx)*radius).addScaledVector(up,(coordinates[j*2+1]-cy)*radius);
     points.setXYZ(first+ring*sides+j,point.x,point.y,point.z);
    }
   }
  }
  points.needsUpdate=true;
  geometry.computeVertexNormals();
  material.uniforms.time.value=elapsed;
 }
 return{mesh,update,
  diagnostics(projector){
   const sample=new T.Vector3(),curve=new T.Vector3(),end=new T.Vector3();
   projector.updateWorldMatrix(true,false);
   mesh.updateWorldMatrix(true,false);
   return receivers.map(({id,anchor,group,corners,held},i)=>{
    const first=i*verticesPerBeam,apertureOffset=first+sections*sides,mid=first+3*sides;
    curve.fromBufferAttribute(points,mid).add(sample.fromBufferAttribute(points,mid+4)).multiplyScalar(.5).applyMatrix4(mesh.matrixWorld);
    const from=sample.fromArray(LISBON_PROJECTOR_PORTS[i]).applyMatrix4(projector.matrixWorld).toArray();
    end.fromBufferAttribute(points,apertureOffset).add(sample.fromBufferAttribute(points,apertureOffset+4)).multiplyScalar(.5).applyMatrix4(mesh.matrixWorld);
    const bend=curve.distanceTo(sample.fromArray(from).lerp(end,3/sections));
    return{id,from,held,bend,
     to:sample.copy(anchor).applyMatrix4(mesh.matrixWorld).toArray(),
     aperture:Array.from({length:sides},(_,j)=>sample.fromBufferAttribute(points,apertureOffset+j).applyMatrix4(mesh.matrixWorld).toArray()),
     bounds:corners.map(corner=>sample.copy(corner).applyMatrix4(group.matrixWorld).toArray())
    };
   });
  },
  dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();}
 };
}
