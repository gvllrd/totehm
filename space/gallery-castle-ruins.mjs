import * as T from './vendor/three-0.180.0.mjs';
import {castleTowers,castleSector,castleBelvedere,castleArchStones} from './gallery-heritage-layout.mjs';

// The gatehouse is a genuinely hollow remnant, not a texture on a cylinder.
// Individual curved stones merge into two draws; arch openings remain empty.
export function createCastleRuins(parent,{place='lisbon',stoneMaterial,glassMaterial,metalMaterial,geometry=null,material=null}={}){
 const root=new T.Group();root.name='Ruined castle gatehouse — glass belvederes';parent.add(root);
 const geometries=new Set(),materials=new Set(),solids=[];
 const ownG=g=>(geometries.add(g),geometry?geometry(g):g),ownM=m=>(materials.add(m),material?material(m):m);
 const mortar=ownM(new T.MeshStandardMaterial({color:0x635e54,roughness:.98}));
 const glow=ownM(new T.MeshBasicMaterial({color:0xffdab0,toneMapped:false}));
 const stone={p:[],n:[],uv:[],c:[]},core={p:[],n:[],uv:[],c:[]};
 let blocks=0,disposed=false;
 const hash=(a,b=0)=>{const q=Math.sin(a*127.1+b*311.7)*43758.5453;return q-Math.floor(q);};
 function face(data,vertices,outward,tone=1){
  const normal=new T.Vector3().crossVectors(new T.Vector3().subVectors(vertices[1],vertices[0]),new T.Vector3().subVectors(vertices[2],vertices[0])).normalize();
  if(normal.dot(outward)<0){vertices=[vertices[0],vertices[3],vertices[2],vertices[1]];normal.negate();}
  for(const i of [0,1,2,0,2,3]){
   const p=vertices[i];data.p.push(p.x,p.y,p.z);data.n.push(normal.x,normal.y,normal.z);
   // The same local mineral scan as the retained walls, without a second
   // printed stone pattern laid over the real courses and radial joints.
   data.uv.push(.25+(Math.abs(normal.x)>.7?p.z:p.x)*.13,.31+(Math.abs(normal.y)>.7?p.z:p.y)*.14);
   data.c.push(tone,tone*.97,tone*.91);
  }
 }
 function prism(data,outline,y0,y1,tone=1){
  const centre=new T.Vector3(outline.reduce((s,p)=>s+p[0],0)/4,(y0+y1)/2,outline.reduce((s,p)=>s+p[1],0)/4);
  const bottom=outline.map(p=>new T.Vector3(p[0],y0,p[1])),top=outline.map(p=>new T.Vector3(p[0],y1,p[1]));
  face(data,bottom,new T.Vector3(0,-1,0),tone);face(data,top,new T.Vector3(0,1,0),tone);
  for(let i=0;i<4;i++){const j=(i+1)%4,vertices=[bottom[i],bottom[j],top[j],top[i]],mid=vertices[0].clone().add(vertices[2]).multiplyScalar(.5);face(data,vertices,mid.sub(centre),tone);}
 }
 function arcBlock(data,t,a0,a1,r0,r1,y0,y1,tone){
  prism(data,[[t.x+Math.cos(a0)*r0,t.z+Math.sin(a0)*r0],[t.x+Math.cos(a0)*r1,t.z+Math.sin(a0)*r1],[t.x+Math.cos(a1)*r1,t.z+Math.sin(a1)*r1],[t.x+Math.cos(a1)*r0,t.z+Math.sin(a1)*r0]],y0,y1,tone);
 }
 function archStone(t,a0,a1,r0,r1){
  const z0=t.z+.88,z1=t.z+1.39,spring=2.2;
  const outline=[[r0*Math.cos(a0),r0*Math.sin(a0)],[r1*Math.cos(a0),r1*Math.sin(a0)],[r1*Math.cos(a1),r1*Math.sin(a1)],[r0*Math.cos(a1),r0*Math.sin(a1)]];
  const front=outline.map(([x,y])=>new T.Vector3(t.x+x,spring+y,z1)),back=outline.map(([x,y])=>new T.Vector3(t.x+x,spring+y,z0));
  const centre=front.reduce((s,p)=>s.add(p),new T.Vector3()).multiplyScalar(.25);centre.z=(z0+z1)/2;
  const tone=.8+.19*hash(a0,7);
  face(stone,front,new T.Vector3(0,0,1),tone);face(stone,back,new T.Vector3(0,0,-1),tone);
  for(let i=0;i<4;i++){const j=(i+1)%4,vertices=[front[i],front[j],back[j],back[i]];face(stone,vertices,vertices[0].clone().add(vertices[2]).multiplyScalar(.5).sub(centre),tone);}
  blocks++;
 }
 function mesh(data,m,name){
  const g=ownG(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(data.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(data.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(data.c,3));g.computeBoundingBox();g.computeBoundingSphere();
  const object=new T.Mesh(g,m);object.name=name;object.castShadow=true;object.receiveShadow=true;root.add(object);solids.push(object);return object;
 }
 const box=new T.BoxGeometry(1,1,1);
 function block(m,p,s,name,solid=false){const o=new T.Mesh(box,m);o.position.set(...p);o.scale.set(...s);o.name=name;o.castShadow=!m.transparent;o.receiveShadow=true;root.add(o);if(solid)solids.push(o);return o;}
 const towers=castleTowers(place);
 for(const [ti,t] of towers.entries()){
  for(let i=0;i<t.segments;i++){
   const sector=castleSector(t,i),aGap=.0055;
   arcBlock(core,t,sector.a0,sector.a1,t.innerRadius+.028,t.radius-.035,sector.minY,sector.maxY-.045,1);
   let y=sector.minY,row=0;
   while(y<sector.maxY-.04){
    const height=Math.min(.27+.1*hash(i+ti*29,row),sector.maxY-y);
    // Alternating half-stones produce real radial bonds without adding a
    // continuous horizontal line around the fractured silhouette.
    const count=row%2?2:1;
    for(let sub=0;sub<count;sub++){
     const a0=sector.a0+(sector.a1-sector.a0)*sub/count+aGap,a1=sector.a0+(sector.a1-sector.a0)*(sub+1)/count-aGap;
     const wear=.009+.017*hash(i*41+row,sub),tone=.78+.26*hash(i+row*71,ti*13+sub);
     arcBlock(stone,t,a0,a1,t.innerRadius+wear,t.radius-wear,y+.009,y+height-.009,tone);blocks++;
    }
    y+=height;row++;
   }
  }
  // True, full-depth semicircular voussoirs complete the missing front wall.
  // The centre is empty from the terrace through the inside of each tower.
  for(const a of castleArchStones(t))archStone(t,a.a0,a.a1,.72,1.14);
  for(const side of [-1,1])for(let row=0;row<8;row++){
   const x=t.x+side*.93;
   prism(stone,[[x-.205,t.z+.89],[x+.205,t.z+.89],[x+.205,t.z+1.38],[x-.205,t.z+1.38]],-.09+row*.286,-.09+(row+1)*.286-.012,.82+.16*hash(row,ti+side));blocks++;
  }
  // New glass is a crisp, slender-edged insertion suspended over the old
  // entrance arch. It is deliberately quiet beside the torn stone crown.
  const b=castleBelvedere(t,place),{base,height,width,depth}=b,cx=b.x,cz=b.z,frame=.038;
  block(metalMaterial,[cx,base,cz],[width,.065,depth],'Belvedere — thin cantilevered bronze floor',true);
  block(metalMaterial,[cx,base+height,cz],[width,.055,depth],'Belvedere — fine floating roof edge');
  for(const sx of [-1,1]){
   block(glassMaterial,[cx+sx*width/2,base+height/2,cz],[.022,height,depth],'Belvedere — seamless side glass',true);
   for(const sz of [-1,1])block(metalMaterial,[cx+sx*width/2,base+height/2,cz+sz*depth/2],[frame,height,frame],'Belvedere — slender bronze corner');
  }
  block(glassMaterial,[cx,base+height/2,cz+depth/2],[width,height,.022],'Belvedere — ocean-facing uninterrupted glass',true);
  block(glassMaterial,[cx,base+height,cz],[width,.026,depth],'Belvedere — clear star roof',true);
  block(glow,[cx,base+.042,cz+depth/2-.08],[width-.12,.008,.012],'Belvedere — concealed amber floor line');
 }
 // Each material shares one static draw (separating body solids). Fine
 // architectural joints therefore do not cost a draw call apiece on phones.
 const groups=new Map();
 for(const object of [...root.children]){
  const solid=solids.includes(object),key=object.material.uuid+'-'+solid;
  if(!groups.has(key))groups.set(key,{data:{p:[],n:[],uv:[],c:[]},m:object.material,solid,name:object.material.transparent?'Castle belvederes — joined low-iron glazing':object.material===glow?'Castle belvederes — concealed warm light':'Castle belvederes — fine bronze junctions'});
  const data=groups.get(key).data,g=box.toNonIndexed(),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  object.updateMatrix();const normalMatrix=new T.Matrix3().getNormalMatrix(object.matrix),v=new T.Vector3();
  for(let i=0;i<p.count;i++){
   v.fromBufferAttribute(p,i).applyMatrix4(object.matrix);data.p.push(v.x,v.y,v.z);
   v.fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize();data.n.push(v.x,v.y,v.z);data.uv.push(uv.getX(i),uv.getY(i));data.c.push(1,1,1);
  }
  g.dispose();object.removeFromParent();
 }
 box.dispose();solids.length=0;
 for(const {data,m,solid,name} of groups.values()){
  const object=mesh(data,m,name);object.castShadow=!m.transparent;if(!solid)solids.splice(solids.indexOf(object),1);
 }
 const stoneMesh=mesh(stone,stoneMaterial,'Castle towers — bonded stone, torn crowns and open radial arches');stoneMesh.userData={castleMasonry:true,physicalBlocks:true};
 mesh(core,mortar,'Castle towers — recessed lime mortar inside hollow rings');
 const triangles=root.children.reduce((n,o)=>n+o.geometry.attributes.position.count/3,0),drawCalls=root.children.length;
 return{root,solids,
  diagnostics:()=>({towers:towers.length,archedOpenings:towers.length,brokenCrowns:true,hollowTowers:true,glassBelvederes:towers.length,stoneBlocks:blocks,triangles,drawCalls,footprints:towers.map(t=>({x:t.x,z:t.z,radius:t.radius,height:t.height})),disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();if(!geometry)for(const g of geometries)g.dispose();if(!material)for(const m of materials)m.dispose();root.clear();}
 };
}
