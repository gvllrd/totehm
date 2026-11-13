import * as T from './vendor/three-0.180.0.mjs';
import {DOME as D} from './gallery-lisbon-dome-layout.mjs';

// Clip polygons against the actual entrance and oculus. A missing triangle
// is a real opening for light/raycasting, not a dark rectangle on a sphere.
function split(polygon,distance){
 const inside=[],outside=[];
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],da=distance(a),db=distance(b),ia=da<=0,ib=db<=0;
  (ia?inside:outside).push(a);
  if(ia!==ib){const p=a.clone().lerp(b,da/(da-db));inside.push(p);outside.push(p);}
 }
 return{inside,outside};
}
function subtract(polygon,planes){
 const result=[];let remaining=polygon;
 for(const distance of planes){if(remaining.length<3)break;const parts=split(remaining,distance);if(parts.outside.length>=3)result.push(parts.outside);remaining=parts.inside;}
 return result;
}
export function createDomeShellGeometry({mobile=false}={}){
 const sphere=new T.SphereGeometry(1,mobile?96:144,mobile?32:48,0,Math.PI*2,0,Math.PI/2),source=sphere.toNonIndexed();
 const attribute=source.attributes.position,positions=[],normals=[],door=[p=>p.x-D.entryHalfWidth,p=>-p.x-D.entryHalfWidth,p=>p.y-D.entryHeight,p=>-p.z];
 const o=D.oculus,aperture=Array.from({length:40},(_,i)=>{const a=i/40*Math.PI*2,nx=Math.cos(a),nz=Math.sin(a);return p=>(p.x-o.x)*nx+(p.z-o.z)*nz-o.radius;});
 function emit(polygon){
  for(let i=1;i<polygon.length-1;i++)for(const p of [polygon[0],polygon[i],polygon[i+1]]){
   positions.push(p.x,p.y,p.z);const normal=new T.Vector3(p.x/D.radiusX**2,(p.y-D.groundY)/D.height**2,(p.z-D.centerZ)/D.radiusZ**2).normalize();normals.push(...normal.toArray());
  }
 }
 for(let i=0;i<attribute.count;i+=3){
  const triangle=Array.from({length:3},(_,n)=>new T.Vector3(attribute.getX(i+n)*D.radiusX,D.groundY+attribute.getY(i+n)*D.height,D.centerZ+attribute.getZ(i+n)*D.radiusZ));
  const pieces=subtract(triangle,door);
  for(const polygon of pieces){
   const near=polygon.some(p=>Math.hypot(p.x-o.x,p.z-o.z)<1.4);
   if(near)for(const piece of subtract(polygon,aperture))emit(piece);else emit(polygon);
  }
 }
 sphere.dispose();source.dispose();const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(positions,3));result.setAttribute('normal',new T.Float32BufferAttribute(normals,3));result.computeBoundingBox();result.computeBoundingSphere();return result;
}
