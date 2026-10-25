import * as T from './vendor/three-0.180.0.mjs';
import {createWhiteStone} from './gallery-white-stone.mjs';

// Real, individually rounded stone surfaces in one merged draw. Their highest
// worn centres meet the existing walking plane; the arrises fall into the
// actual dark mortar below. No displacement plane or extra physics surface.
const BOUNDS=Object.freeze({minX:-13,maxX:13,minZ:-17,maxZ:-2});
const MODULE=3.96,UNIT=.66,GROUND=-.09,MORTAR=-.116;
const RECTANGLES=Object.freeze([
 [0,0,3,2],[3,0,5,1],[5,0,6,2],[3,1,5,2],
 [0,2,2,5],[2,2,4,4],[4,2,6,3],[4,3,6,5],
 [2,4,4,6],[0,5,2,6],[4,5,6,6]
]);
function hash(x,y){const n=Math.sin(x*127.1+y*311.7)*43758.5453123;return n-Math.floor(n);}
function transformRect(rect,orientation){
 const points=[[rect[0],rect[1]],[rect[2],rect[1]],[rect[2],rect[3]],[rect[0],rect[3]]].map(([x,z])=>{
  if(orientation&1)[x,z]=[z,x];if(orientation&2)x=6-x;if(orientation&4)z=6-z;return[x,z];
 });
 return[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
}
function slabs(){
 const result=[];
 for(let mz=Math.floor(BOUNDS.minZ/MODULE);mz<=Math.floor(BOUNDS.maxZ/MODULE);mz++)for(let mx=Math.floor(BOUNDS.minX/MODULE);mx<=Math.floor(BOUNDS.maxX/MODULE);mx++){
  const orientation=Math.floor(hash(mx+7.3,mz-1.9)*8);
  for(let r=0;r<RECTANGLES.length;r++){
   const rect=transformRect(RECTANGLES[r],orientation);
   const x0=Math.max(BOUNDS.minX,mx*MODULE+rect[0]*UNIT),x1=Math.min(BOUNDS.maxX,mx*MODULE+rect[2]*UNIT);
   const z0=Math.max(BOUNDS.minZ,mz*MODULE+rect[1]*UNIT),z1=Math.min(BOUNDS.maxZ,mz*MODULE+rect[3]*UNIT);
   if(x1-x0>.012&&z1-z0>.012)result.push({x0,x1,z0,z1,key:hash(mx*17+r*.37,mz*19+r*7.1),seed:hash(mx*7+r*13,mz*2+r*.19),module:[mx,mz],rectangle:r});
  }
 }
 return result;
}
function makeGeometry(blocks,mobile){
 const positions=[],uvs=[],colours=[],edges=[],indices=[],segments=mobile?4:6;
 const rings=mobile?[0,.008,.030,.070]:[0,.004,.014,.035,.070];
 let highest=-Infinity,lowest=Infinity;
 function vertex(x,y,z,u,v,c,edge=0){positions.push(x,y,z);uvs.push(u,v);colours.push(...c);edges.push(edge);highest=Math.max(highest,y);lowest=Math.min(lowest,y);return positions.length/3-1;}
 for(const slab of blocks){
  const width=slab.x1-slab.x0-.006,depth=slab.z1-slab.z0-.006;
  if(width<=.003||depth<=.003)continue;
  const cx=(slab.x0+slab.x1)/2,cz=(slab.z0+slab.z1)/2,small=Math.min(width,depth);
  const bevel=Math.min(.070,small*.20),radius=Math.min(.052,small*.19);
  const settle=slab.key*.0008,tone=.82+slab.key*.24;
  const tint=[tone*(1.+(slab.seed-.5)*.018),tone,tone*(.98+(slab.seed-.5)*.025)];
  const quarterTurns=Math.floor(slab.seed*4),uOffset=hash(slab.seed*37,4.8)*9.3,vOffset=hash(slab.key*19,1.3)*7.7;
  function uv(x,z){let u=(x-cx)/1.25,v=(z-cz)/1.25;for(let i=0;i<quarterTurns;i++)[u,v]=[-v,u];return[u+uOffset,v+vOffset];}
  const ringStarts=[];
  for(let level=0;level<rings.length;level++){
   const inset=rings[level]/.070*bevel,halfX=width/2-inset,halfZ=depth/2-inset;
   const round=Math.max(.006,Math.min(radius,halfX*.40,halfZ*.40));
   const t=inset/bevel,profile=Math.sqrt(Math.max(0,1-(1-t)*(1-t)));
   const y=GROUND-.025+.025*profile-settle;
   ringStarts.push(positions.length/3);
   const corners=[[halfX-round,halfZ-round,0],[-halfX+round,halfZ-round,Math.PI/2],[-halfX+round,-halfZ+round,Math.PI],[halfX-round,-halfZ+round,Math.PI*1.5]];
   let perimeter=0;
   for(const [ox,oz,start]of corners)for(let i=0;i<=segments;i++){
    const angle=start+i/segments*Math.PI/2;
    let x=ox+Math.cos(angle)*round,z=oz+Math.sin(angle)*round;
    const erosion=(.001+.002*(.5+.5*Math.sin(perimeter*1.73+slab.seed*97)))*(1-t*.65);
    x-=Math.sign(x)*erosion;z-=Math.sign(z)*erosion;
    const wear=.00055*(.5+.5*Math.sin(perimeter*2.1+slab.key*33))*(1-t);
    const [u,v]=uv(cx+x,cz+z);vertex(cx+x,y-wear,cz+z,u,v,tint,1-profile);perimeter++;
   }
  }
  const count=4*(segments+1);
  for(let ring=0;ring<ringStarts.length-1;ring++)for(let i=0;i<count;i++){
   const next=(i+1)%count,a=ringStarts[ring]+i,b=ringStarts[ring]+next,c=ringStarts[ring+1]+i,d=ringStarts[ring+1]+next;
   indices.push(a,c,b,b,c,d);
  }
  const [u,v]=uv(cx,cz),centre=vertex(cx,GROUND-settle,cz,u,v,tint),inner=ringStarts.at(-1);
  for(let i=0;i<count;i++)indices.push(centre,inner+(i+1)%count,inner+i);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));geometry.setAttribute('aAncientEdge',new T.Float32BufferAttribute(edges,1));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.name='Merged ancient opus-romain — actual rounded stone surfaces';
 return{geometry,triangles:indices.length/3,vertices:positions.length/3,highest,lowest};
}

export function createAncientFloor(scene,{mobile=false,anisotropy=4,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Interior only — real ancient limestone opus romain';scene.add(root);
 const stone=createWhiteStone({mobile,anisotropy,onChange,slabGeometry:true});
 const blocks=slabs(),built=makeGeometry(blocks,mobile);
 const floor=new T.Mesh(built.geometry,stone.material);floor.name='Real pillowed ancient stone slabs';floor.receiveShadow=true;floor.castShadow=false;root.add(floor);
 const mortarMaterial=new T.MeshStandardMaterial({color:0x514c42,roughness:.96,metalness:0});
 const mortarGeometry=new T.PlaneGeometry(BOUNDS.maxX-BOUNDS.minX,BOUNDS.maxZ-BOUNDS.minZ),mortar=new T.Mesh(mortarGeometry,mortarMaterial);
 mortar.name='Actual narrow dark mortar beneath the stones';mortar.rotation.x=-Math.PI/2;mortar.position.set(0,MORTAR,(BOUNDS.minZ+BOUNDS.maxZ)/2);mortar.receiveShadow=true;root.add(mortar);
 let disposed=false;
 return{
  root,solids:[floor,mortar],material:stone.material,
  diagnostics:()=>({kind:'photographed-ancient-opus-romain-floor',ready:!disposed,interiorOnly:true,physicalSlabs:true,mergedMesh:true,drawCalls:2,slabs:blocks.length,triangles:built.triangles,vertices:built.vertices,
   bounds:{...BOUNDS},groundHeight:GROUND,highestPoint:built.highest,lowestPoint:built.lowest,mortarHeight:MORTAR,physicalJointMetres:.006,roundedArrises:true,bevelDropMetres:.025,
   nonOverlapping:true,animated:false,photographicMapsReady:stone.diagnostics().photographicMapsReady,stone:stone.diagnostics(),disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();built.geometry.dispose();stone.dispose();mortarGeometry.dispose();mortarMaterial.dispose();root.clear();}
 };
}
