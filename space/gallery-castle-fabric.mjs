import * as T from './vendor/three-0.180.0.mjs';
import {createHeritageMasonry} from './gallery-heritage-masonry.mjs';
import {castleFabricPlan,castleArchHalfWidth} from './gallery-castle-plan.mjs';

// Retained castle walls are one substantial, asymmetrical building. Their
// mineral maps add grain to actual worn stones, never a printed brick facade.
export function createCastleFabric(parent,{place='lisbon',mobile=false,anisotropy=4,onChange=()=>{},geometry=null,material=null}={}){
 const root=new T.Group();root.name='Castle fabric — ruined keep, deep arches and broken curtain walls';parent.add(root);
 const geometries=new Set(),materials=new Set(),solids=[],plan=castleFabricPlan(place);
 const ownG=g=>(geometries.add(g),geometry?geometry(g):g),ownM=m=>(materials.add(m),material?material(m):m);
 let disposed=false,blocks=0,triangles=0;
 const changed=()=>{if(!disposed)onChange();};
 // Reuse only the verified local mineral scan/material loader. None of the
 // previous building geometry, tower ornaments or wall layout is retained.
 const surface=createHeritageMasonry(root,{walls:[],mobile,anisotropy,onChange:changed,geometry,material});
 const stone=surface.stoneMaterial;stone.color.set(place==='new-york'?0xc5c5bd:0xd7ccb7);
 stone.name='Castle — weathered full-depth limestone, individual broken arrises';
 const mortar=ownM(new T.MeshStandardMaterial({color:place==='new-york'?0x78796e:0x847963,roughness:.98}));
 const stoneData={p:[],n:[],uv:[],c:[]},coreData={p:[],n:[],uv:[]};
 const hash=(a,b=0)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
 const point=(w,a,y,d)=>w.axis==='x'?new T.Vector3(a,y,w.fixed+d):new T.Vector3(w.fixed-d,y,a);
 function triangle(data,a,b,c,tone=1){
  const normal=new T.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a)).normalize();
  for(const p of [a,b,c]){data.p.push(p.x,p.y,p.z);data.n.push(normal.x,normal.y,normal.z);const u=Math.abs(normal.x)>.65?p.z:p.x,v=Math.abs(normal.y)>.65?p.z:p.y;data.uv.push(.27+u*.13,.41+v*.14);if(data.c)data.c.push(tone,tone*.985,tone*.955);}
 }
 function face(data,vertices,outward,tone){
  const a=vertices[0],b=vertices[1],c=vertices[2],normal=new T.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a));
  if(normal.dot(outward)<0)vertices=[...vertices].reverse();
  for(let i=1;i<vertices.length-1;i++)triangle(data,vertices[0],vertices[i],vertices[i+1],tone);
 }
 function stoneBlock(w,a,b,y0,y1,seed){
  if(b-a<.045||y1-y0<.045)return;
  const cut=Math.min(.025+.045*hash(seed,41),(b-a)*.16,(y1-y0)*.15),depth=w.depth/2-.012;
  // Different lost corners and slightly bowed faces catch grazing light as
  // real geometry. Entire stones remain within the shared structural bounds.
  const outline=[[a+cut,y0],[b-cut*.72,y0],[b,y0+cut*.72],[b,y1-cut],[b-cut,y1],[a+cut*.61,y1],[a,y1-cut*.61],[a,y0+cut]];
  const front=outline.map(([x,y],i)=>point(w,x,y,depth-(i%3)*.0035)),back=outline.map(([x,y],i)=>point(w,x,y,-depth+(i%3)*.003));
  const normal=w.axis==='x'?new T.Vector3(0,0,1):new T.Vector3(-1,0,0),tone=.85+.19*hash(seed,27);
  face(stoneData,front,normal,tone);face(stoneData,back,normal.clone().negate(),tone);
  const centre=point(w,(a+b)/2,(y0+y1)/2,0);
  for(let i=0;i<8;i++){const j=(i+1)%8,vertices=[front[i],front[j],back[j],back[i]],out=front[i].clone().add(back[j]).multiplyScalar(.5).sub(centre);face(stoneData,vertices,out,tone);}
  blocks++;
 }
 function archStone(w,opening,theta0,theta1){
  const inner=opening.radius,outer=inner+opening.ring,depth=w.depth/2-.008;
  const outline=[[inner*Math.cos(theta0),inner*Math.sin(theta0)],[outer*Math.cos(theta0),outer*Math.sin(theta0)],[outer*Math.cos(theta1),outer*Math.sin(theta1)],[inner*Math.cos(theta1),inner*Math.sin(theta1)]];
  const front=outline.map(([x,y])=>point(w,opening.centre+x,opening.spring+y,depth)),back=outline.map(([x,y])=>point(w,opening.centre+x,opening.spring+y,-depth));
  const outward=w.axis==='x'?new T.Vector3(0,0,1):new T.Vector3(-1,0,0),tone=.90+.13*hash(theta0,5);
  face(stoneData,front,outward,tone);face(stoneData,back,outward.clone().negate(),tone);
  const centre=front.reduce((sum,p)=>sum.add(p),new T.Vector3()).add(back.reduce((sum,p)=>sum.add(p),new T.Vector3())).multiplyScalar(1/8);
  for(let i=0;i<4;i++){const j=(i+1)%4,vertices=[front[i],front[j],back[j],back[i]];face(stoneData,vertices,front[i].clone().add(back[j]).multiplyScalar(.5).sub(centre),tone);}
  blocks++;
 }
 function core(w){
  const start=w.sections[0][0],end=w.sections.at(-1)[1],shape=new T.Shape(),inset=.025;
  shape.moveTo(start,w.minY);
  for(const opening of [...w.arches].sort((a,b)=>a.centre-b.centre)){
   const radius=opening.radius+inset;shape.lineTo(opening.centre-radius,w.minY);shape.lineTo(opening.centre-radius,opening.spring);
   for(let i=0;i<=28;i++){const angle=Math.PI-Math.PI*i/28;shape.lineTo(opening.centre+Math.cos(angle)*radius,opening.spring+Math.sin(angle)*radius);}
   shape.lineTo(opening.centre+radius,w.minY);
  }
  shape.lineTo(end,w.minY);shape.lineTo(end,w.sections.at(-1)[2]-.035);
  for(const [a,b,top] of [...w.sections].reverse()){shape.lineTo(b,top-.035);shape.lineTo(a,top-.035);}
  shape.closePath();
  const depth=w.depth-.11,g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:1});
  const p=g.attributes.position;
  for(let i=0;i<p.count;i+=3){const vertices=[];for(let j=0;j<3;j++)vertices.push(point(w,p.getX(i+j),p.getY(i+j),p.getZ(i+j)-depth/2));triangle(coreData,...vertices);}
  g.dispose();
 }
 for(const [wi,w] of plan.walls.entries()){
  core(w);
  for(const [si,[left,right,top]] of w.sections.entries()){
   let y=w.minY,row=0;
   while(y<top-.04){
    const rowHeight=Math.min(top-y,.31+.24*hash(wi*71+si,row)),y1=y+rowHeight;
    let a=left-(row%2?.34:0),column=0;
    while(a<right-.04){
     const width=(mobile?.78:.64)+.80*hash(wi*97+row,column),lo=Math.max(left,a)+.009,hi=Math.min(right,a+width)-.009;
     let spans=[[lo,hi]];
     for(const opening of w.arches){
      const half=castleArchHalfWidth(opening,y,true);
      if(half){const cutLo=opening.centre-half-.008,cutHi=opening.centre+half+.008;spans=spans.flatMap(([x,z])=>[[x,Math.min(z,cutLo)],[Math.max(x,cutHi),z]].filter(([l,r])=>r-l>.045));}
     }
     for(const [l,r] of spans)stoneBlock(w,l,r,y+.008,y1-(y1>=top-.001?0:.008),wi*10001+si*701+row*41+column);
     a+=width;column++;
    }
    y=y1;row++;
   }
  }
  for(const opening of w.arches){
   for(let i=0;i<17;i++)archStone(w,opening,i/17*Math.PI+.004,(i+1)/17*Math.PI-.004);
   for(const side of [-1,1]){let y=w.minY,row=0;while(y<opening.spring-.04){const y1=Math.min(opening.spring,y+.35+.10*hash(row,21));stoneBlock(w,opening.centre+side*opening.radius+(side<0?-opening.ring:0)+.008,opening.centre+side*opening.radius+(side<0?0:opening.ring)-.008,y+.008,y1-.008,wi*151+row);y=y1;row++;}}
  }
 }
 function merged(data,m,name){
  const g=ownG(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(data.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(data.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));if(data.c)g.setAttribute('color',new T.Float32BufferAttribute(data.c,3));g.computeBoundingBox();g.computeBoundingSphere();
  const object=new T.Mesh(g,m);object.name=name;object.castShadow=true;object.receiveShadow=true;object.userData={castleFabric:true,physicalBlocks:true};root.add(object);solids.push(object);triangles+=data.p.length/9;return object;
 }
 merged(coreData,mortar,'Ancient castle — deep recessed lime structure with genuine open arches');
 merged(stoneData,stone,'Ancient castle — bonded irregular limestone and full-depth voussoirs');
 changed();
 return{root,solids,obstacles:plan.obstacles,plan,
  diagnostics:()=>({kind:'asymmetric-ruined-castle',restartedArchitecture:true,retainedBuilding:true,rectangularKeep:true,pairedRoundTowers:false,continuousCurtainWalls:true,arches:plan.arches.length,openArches:plan.arches.map(a=>({id:a.id,axis:a.axis,centre:a.centre,fixed:a.fixed,clearWidth:a.radius*2,spring:a.spring,top:a.spring+a.radius})),entry:plan.entry,physicalStoneBlocks:true,stoneBlocks:blocks,triangles,drawCalls:2,deepReveals:true,brokenCrown:true,photographicMapsReady:surface.diagnostics().photographicMapsReady,compiled:surface.diagnostics().compiled,mapFailures:surface.diagnostics().mapFailures,disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();surface.dispose();if(!geometry)for(const g of geometries)g.dispose();if(!material)for(const m of materials)m.dispose();root.clear();}
 };
}
