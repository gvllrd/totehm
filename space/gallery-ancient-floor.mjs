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
function slabs(bounds=BOUNDS){
 const result=[];
 for(let mz=Math.floor(bounds.minZ/MODULE);mz<=Math.floor(bounds.maxZ/MODULE);mz++)for(let mx=Math.floor(bounds.minX/MODULE);mx<=Math.floor(bounds.maxX/MODULE);mx++){
  const orientation=Math.floor(hash(mx+7.3,mz-1.9)*8);
  for(let r=0;r<RECTANGLES.length;r++){
   const rect=transformRect(RECTANGLES[r],orientation);
   const x0=Math.max(bounds.minX,mx*MODULE+rect[0]*UNIT),x1=Math.min(bounds.maxX,mx*MODULE+rect[2]*UNIT);
   const z0=Math.max(bounds.minZ,mz*MODULE+rect[1]*UNIT),z1=Math.min(bounds.maxZ,mz*MODULE+rect[3]*UNIT);
   if(x1-x0>.012&&z1-z0>.012)result.push({x0,x1,z0,z1,key:hash(mx*17+r*.37,mz*19+r*7.1),seed:hash(mx*7+r*13,mz*2+r*.19),module:[mx,mz],rectangle:r});
  }
 }
 return result;
}
function makeGeometry(blocks,mobile,detail={}){
 const positions=[],uvs=[],colours=[],edges=[],indices=[],segments=detail.segments??(mobile?4:6);
 const rings=detail.rings??(mobile?[0,.008,.030,.070]:[0,.004,.014,.035,.070]);
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
   const round=Math.max(detail.minimumCorner??.006,Math.min(radius,halfX*.40,halfZ*.40));
   const t=inset/bevel,profile=Math.sqrt(Math.max(0,1-(1-t)*(1-t)));
   const y=GROUND-.025+.025*profile-settle;
   ringStarts.push(positions.length/3);
   const corners=[[halfX-round,halfZ-round,0],[-halfX+round,halfZ-round,Math.PI/2],[-halfX+round,-halfZ+round,Math.PI],[halfX-round,-halfZ+round,Math.PI*1.5]];
   let perimeter=0;
   for(const [ox,oz,start]of corners)for(let i=0;i<=segments;i++){
    const angle=start+i/segments*Math.PI/2;
    let x=ox+Math.cos(angle)*round,z=oz+Math.sin(angle)*round;
    const erosion=(.001+.002*(.5+.5*Math.sin(perimeter*1.73+slab.seed*97)))*(1-t*.65)*(detail.clipWear?Math.min(1,small/.08):1);
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

// The very same photographed Lisbon limestone and opus-romain slab layout on
// any storey, landing or inclined aisle. The original Lisbon factory above
// keeps its exact geometry and 301 stones. A building shares one material and
// three reference-counted scan maps, rather than loading a set per floor.
export function createAncientStoneSurfaces(scene,{mobile=false,anisotropy=4,onChange=()=>{},surfaces=[]}={}){
 const root=new T.Group();root.name='Lisbon antique limestone throughout the gallery';scene.add(root);
 const stone=createWhiteStone({mobile,anisotropy,onChange,slabGeometry:true});
 const mortarMaterial=new T.MeshStandardMaterial({color:0x514c42,roughness:.96,metalness:0});
 const geometries=new Set(),solids=[],byId=new Map(),coverage=new Map(),mortarPieces=[];
 const detail=mobile?{segments:2,rings:[0,.070],minimumCorner:.00025,clipWear:true}:{segments:3,rings:[0,.014,.070],minimumCorner:.00025,clipWear:true};
 let disposed=false,totalSlabs=0,totalTriangles=0,highestDeviation=-Infinity,lowestDeviation=Infinity,surfaceCount=0;
 const finite=Number.isFinite;
 function subtract(a,b){
  const x0=Math.max(a.minX,b.minX),x1=Math.min(a.maxX,b.maxX),z0=Math.max(a.minZ,b.minZ),z1=Math.min(a.maxZ,b.maxZ);
  if(x1<=x0||z1<=z0)return[a];
  return[
   {...a,maxX:x0},{...a,minX:x1},
   {...a,minX:x0,maxX:x1,maxZ:z0},{...a,minX:x0,maxX:x1,minZ:z1}
  ].filter(r=>r.maxX-r.minX>.012&&r.maxZ-r.minZ>.012);
 }
 function merge(pieces,name){
  const keys=['position','uv','color','aAncientEdge'],sizes={position:3,uv:2,color:3,aAncientEdge:1},values=Object.fromEntries(keys.map(k=>[k,[]])),indices=[];let offset=0;
  for(const g of pieces){for(const key of keys){const a=g.attributes[key];if(a)values[key].push(...a.array);else values[key].push(...new Float32Array(g.attributes.position.count*sizes[key]));}
   if(g.index)for(const i of g.index.array)indices.push(offset+i);else for(let i=0;i<g.attributes.position.count;i++)indices.push(offset+i);
   offset+=g.attributes.position.count;g.dispose();
  }
  const g=new T.BufferGeometry();for(const key of keys)g.setAttribute(key,new T.Float32BufferAttribute(values[key],sizes[key]));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.name=name;geometries.add(g);return g;
 }
 function descriptor(s,index){
  if(s.kind==='ramp'||s.from&&s.to){
   const a=s.from,b=s.to;if(!a||!b||![a.x,a.y,a.z,b.x,b.y,b.z,s.width].every(finite)||s.width<=0)return null;
   const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<.012)return null;
   return{id:s.id||'stone-ramp-'+index,floor:s.floor,bounds:{minX:0,maxX:length,minZ:-s.width/2,maxZ:s.width/2},height:(x)=>a.y+(b.y-a.y)*x/length,map:(x,z)=>[a.x+dx*x/length-dz*z/length,a.z+dz*x/length+dx*z/length],ramp:true};
  }
  if(![s.minX,s.maxX,s.minZ,s.maxZ,s.y].every(finite)||s.minX>=s.maxX||s.minZ>=s.maxZ)return null;
  return{id:s.id||'stone-surface-'+index,floor:s.floor,bounds:{minX:s.minX,maxX:s.maxX,minZ:s.minZ,maxZ:s.maxZ},height:typeof s.heightAt==='function'?s.heightAt:()=>s.y,map:(x,z)=>[x,z],nonlinear:typeof s.heightAt==='function',flatKey:typeof s.heightAt==='function'?null:s.y.toFixed(7)};
 }
 function bend(g,d){
  const p=g.attributes.position;
  if(!d.nonlinear){for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),[wx,wz]=d.map(x,z),deviation=p.getY(i)-GROUND;p.setXYZ(i,wx,d.height(x,z)+deviation,wz);highestDeviation=Math.max(highestDeviation,deviation);lowestDeviation=Math.min(lowestDeviation,deviation);}g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;}
  const out={p:[],uv:[],c:[],e:[]},uv=g.attributes.uv,c=g.attributes.color,e=g.attributes.aAncientEdge;
  const vertex=i=>[p.getX(i),p.getY(i),p.getZ(i),uv.getX(i),uv.getY(i),c.getX(i),c.getY(i),c.getZ(i),e.getX(i)];
  const mid=(a,b)=>a.map((value,i)=>(value+b[i])/2),h=v=>d.height(v[0],v[2]);
  function append(v){const [wx,wz]=d.map(v[0],v[2]),deviation=v[1]-GROUND;out.p.push(wx,h(v)+deviation,wz);out.uv.push(v[3],v[4]);out.c.push(v[5],v[6],v[7]);out.e.push(v[8]);highestDeviation=Math.max(highestDeviation,deviation);lowestDeviation=Math.min(lowestDeviation,deviation);}
  function triangle(a,b,c,depth=0){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a),errors=[Math.abs(h(ab)-(h(a)+h(b))/2),Math.abs(h(bc)-(h(b)+h(c))/2),Math.abs(h(ca)-(h(c)+h(a))/2)];
   if(Math.max(...errors)<=.0007||depth>=8){append(a);append(b);append(c);return;}
   const edge=errors.indexOf(Math.max(...errors));if(edge===0){triangle(a,ab,c,depth+1);triangle(ab,b,c,depth+1);}else if(edge===1){triangle(a,b,bc,depth+1);triangle(a,bc,c,depth+1);}else{triangle(a,b,ca,depth+1);triangle(ca,b,c,depth+1);}
  }
  for(let i=0;i<g.index.count;i+=3)triangle(vertex(g.index.getX(i)),vertex(g.index.getX(i+1)),vertex(g.index.getX(i+2)));
  const bent=new T.BufferGeometry();bent.setAttribute('position',new T.Float32BufferAttribute(out.p,3));bent.setAttribute('uv',new T.Float32BufferAttribute(out.uv,2));bent.setAttribute('color',new T.Float32BufferAttribute(out.c,3));bent.setAttribute('aAncientEdge',new T.Float32BufferAttribute(out.e,1));bent.computeVertexNormals();bent.computeBoundingBox();bent.computeBoundingSphere();g.dispose();return bent;
 }
 function mortarGeometry(bounds,d){
  const n=d.nonlinear?8:1,positions=[],indices=[];
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){const x=bounds.minX+(bounds.maxX-bounds.minX)*i/n,z=bounds.minZ+(bounds.maxZ-bounds.minZ)*j/n,[wx,wz]=d.map(x,z);positions.push(wx,d.height(x,z)+(MORTAR-GROUND),wz);}
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const k=i*(n+1)+j;indices.push(k,k+1,k+n+1,k+1,k+n+2,k+n+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);return g;
 }
 for(const [index,s] of surfaces.entries()){
  const d=descriptor(s,index);if(!d)continue;
  let pieces=[d.bounds];
  if(d.flatKey!==null&&d.flatKey!==undefined){const used=coverage.get(d.flatKey)||[];for(const previous of used)pieces=pieces.flatMap(r=>subtract(r,previous));used.push(d.bounds);coverage.set(d.flatKey,used);}
  const stonePieces=[];let count=0;
  for(const bounds of pieces){const blocks=slabs(bounds);if(!blocks.length)continue;const built=makeGeometry(blocks,mobile,detail);stonePieces.push(bend(built.geometry,d));mortarPieces.push(mortarGeometry(bounds,d));count+=blocks.length;}
  if(!stonePieces.length){byId.set(d.id,[]);continue;}
  const g=merge(stonePieces,'Lisbon opus-romain — '+d.id),object=new T.Mesh(g,stone.material);object.name=d.id;object.receiveShadow=true;object.castShadow=false;object.userData={ancientStone:true,walkable:true,floor:d.floor,surfaceId:d.id,ramp:!!d.ramp};root.add(object);solids.push(object);byId.set(d.id,[object]);totalSlabs+=count;totalTriangles+=g.index.count/3;surfaceCount++;
 }
 if(mortarPieces.length){const g=merge(mortarPieces,'Shared dark mortar beneath every ancient stone surface'),mortar=new T.Mesh(g,mortarMaterial);mortar.name='Narrow real mortar beneath the complete stone gallery';mortar.receiveShadow=true;mortar.userData={walkable:true,ancientMortar:true};root.add(mortar);solids.push(mortar);totalTriangles+=g.index.count/3;}
 onChange();
 return{root,solids,walkable:solids,byId,material:stone.material,
  diagnostics:()=>({kind:'lisbon-opus-romain-on-gallery-surfaces',ready:!disposed,physicalSlabs:true,sharedWithLisbon:true,surfaces:surfaceCount,slabs:totalSlabs,triangles:totalTriangles,drawCalls:solids.length,nonOverlappingFlatSurfaces:true,highestDeviation,lowestDeviation,bevelDropMetres:.025,physicalJointMetres:.006,ramps:true,photographicMapsReady:stone.diagnostics().photographicMapsReady,stone:stone.diagnostics(),disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const g of geometries)g.dispose();stone.dispose();mortarMaterial.dispose();root.clear();}
 };
}
