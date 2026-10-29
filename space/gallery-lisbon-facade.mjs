import * as T from './vendor/three-0.180.0.mjs';
import {createLisbonAzulejos} from './gallery-lisbon-tiles.mjs';

// Project the sculpted mouth beyond the deepest cornice, including its rear
// bevel, so no pale stone rail cuts across the original black silhouette.
export const LISBON_FACADE=Object.freeze({halfWidth:13,height:7.65,wallTop:7.24,frontZ:-1.835,backZ:-2.16,entryWidth:4.8,entryHeight:3.1,centralBayHalfWidth:3.2,signPosition:[0,5.45,-1.42],signScale:1.6});
const WINDOW_ROWS=Object.freeze([{y:1.40,height:1.90,arched:false,balcony:false},{y:3.95,height:1.80,arched:false,balcony:true},{y:6.25,height:1.45,arched:true,balcony:true}]);
const WINDOW_X=Object.freeze([-10.25,-5.90,5.90,10.25]);
export const LISBON_FACADE_BALCONIES=Object.freeze(WINDOW_ROWS.flatMap((row,r)=>!row.balcony?[]:WINDOW_X.flatMap((x,c)=>{
 const bottom=row.y-row.height/2-.07,half=1.24,id=`lisbon-balcony-${r}-${c}`;
 return[
  {id:id+'-stone',minX:x-1.475,maxX:x+1.475,minZ:-1.86,maxZ:-1.14,minY:bottom-.13,maxY:bottom},
  {id:id+'-front-guard',minX:x-half-.014,maxX:x+half+.014,minZ:-1.204,maxZ:-1.176,minY:bottom+.086,maxY:bottom+.814},
  ...[-1,1].map(side=>({id:id+(side<0?'-left-guard':'-right-guard'),minX:x+side*half-.014,maxX:x+side*half+.014,minZ:-1.924,maxZ:-1.176,minY:bottom+.086,maxY:bottom+.814}))
 ].map(Object.freeze);
})));

// Only the street-facing wall is historical masonry. The existing ocean-side
// and rear glazing, roof, stone floor and installations remain separate.
export function createLisbonFacade(parent,{mobile=false,geometry=null,material=null,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Lisbon — cobalt azulejo street façade';parent.add(root);
 const geometries=new Set(),materials=new Set(),solids=[],batches=new Map(),windows=[];
 let disposed=false;
 const ownG=g=>{geometries.add(g);return geometry?geometry(g):g;},ownM=m=>{materials.add(m);return material?material(m):m;};
 const tiles=createLisbonAzulejos(),border=createLisbonAzulejos({border:true});ownM(tiles.material);ownM(border.material);
 const limestone=ownM(new T.MeshStandardMaterial({color:0xd9d8ca,roughness:.87,metalness:0}));
 const white=ownM(new T.MeshStandardMaterial({color:0xf0eee4,roughness:.88,metalness:0}));
 const iron=ownM(new T.MeshStandardMaterial({color:0x12262d,roughness:.47,metalness:.68}));
 const glass=ownM(new T.MeshPhysicalMaterial({color:0xc7dce7,transparent:true,opacity:.075,roughness:.055,metalness:.01,side:T.DoubleSide,depthWrite:false,envMapIntensity:1.1}));
 function add(g,m,name,{solid=false,batch=true}={}){
  if(!batch){const object=new T.Mesh(ownG(g),m);object.name=name;object.castShadow=!m.transparent;object.receiveShadow=true;root.add(object);if(solid)solids.push(object);return object;}
  let data=batches.get(m);if(!data){data={p:[],n:[],uv:[],names:[],solid:false};batches.set(m,data);}
  const source=g.index?g.toNonIndexed():g,p=source.attributes.position,n=source.attributes.normal,uv=source.attributes.uv;
  for(let i=0;i<p.count;i++){data.p.push(p.getX(i),p.getY(i),p.getZ(i));data.n.push(n.getX(i),n.getY(i),n.getZ(i));data.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);}
  data.names.push(name);data.solid||=solid;if(source!==g)source.dispose();g.dispose();return null;
 }
 function block(m,x,y,z,w,h,d,name,solid=false){const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);return add(g,m,name,{solid});}
 function bar(a,b,radius=.009,m=iron,name='Wrought-iron balcony bar'){
  const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start),g=new T.CylinderGeometry(radius,radius,delta.length(),mobile?4:6);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());return add(g,m,name);
 }
 function scroll(points,radius=.008,name='Hand-curled wrought-iron scroll'){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return add(new T.TubeGeometry(curve,mobile?10:16,radius,4,false),iron,name);
 }
 function outline(cx,cy,width,height,arch=0){
  const x0=cx-width/2,x1=cx+width/2,y0=cy-height/2,y1=cy+height/2,s=new T.Shape();
  s.moveTo(x0,y0);s.lineTo(x1,y0);s.lineTo(x1,y1-arch);
  if(arch){s.quadraticCurveTo(x1,y1,cx,y1);s.quadraticCurveTo(x0,y1,x0,y1-arch);}else s.lineTo(x0,y1);
  s.lineTo(x0,y0);return s;
 }
 const hole=shape=>new T.Path(shape.getPoints(mobile?8:16).reverse());
 function frame(cx,cy,width,height,arch,thickness,m,z,depth,name){
  const shape=outline(cx,cy,width+thickness*2,height+thickness*2,arch+thickness*.35);shape.holes.push(hole(outline(cx,cy,width,height,arch)));
  const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:mobile?8:16});g.translate(0,0,z);add(g,m,name,{solid:true});
 }
 const wall=new T.Shape();wall.moveTo(-13,-.09);wall.lineTo(-2.4,-.09);wall.lineTo(-2.4,3.1);wall.lineTo(2.4,3.1);wall.lineTo(2.4,-.09);wall.lineTo(13,-.09);wall.lineTo(13,LISBON_FACADE.wallTop);wall.lineTo(-13,LISBON_FACADE.wallTop);wall.closePath();
 for(const row of WINDOW_ROWS)for(const x of WINDOW_X){const spec={x,y:row.y,width:2.4,height:row.height,arch:row.arched?.20:0,balcony:row.balcony};windows.push(spec);wall.holes.push(hole(outline(x,row.y,spec.width,spec.height,spec.arch)));}
 const body=new T.ExtrudeGeometry(wall,{depth:LISBON_FACADE.frontZ-LISBON_FACADE.backZ,bevelEnabled:false,curveSegments:mobile?8:16});body.translate(0,0,LISBON_FACADE.backZ);
 const wallMesh=add(body,white,'Lisbon façade — actual limestone-backed masonry and window apertures',{solid:true,batch:false});
 const tiledFace=new T.ShapeGeometry(wall,mobile?8:16);tiledFace.translate(0,0,LISBON_FACADE.frontZ+.004);add(tiledFace,tiles.material,'Continuous cobalt and white lozenge azulejos',{batch:false});
 for(const w of windows){
  frame(w.x,w.y,w.width+.34,w.height+.30,w.arch,.055,border.material,-1.855,.045,'Fine cobalt tile border around limestone window');
  frame(w.x,w.y,w.width,w.height,w.arch,.15,limestone,-1.965,.235,'Deep pale limestone window surround');
  const glazed=new T.ShapeGeometry(outline(w.x,w.y,w.width-.08,w.height-.06,w.arch),mobile?8:16);glazed.translate(0,0,-2.09);add(glazed,glass,'Traditional front window glazing');
  for(const dx of [-w.width/2+.06,0,w.width/2-.06])block(white,w.x+dx,w.y,-1.985,.055,w.height-.05,.08,'Ivory sash vertical');
  for(const dy of [-w.height/2+.045,0,w.height/2-.06])block(white,w.x,w.y+dy,-1.985,w.width-.06,.055,.08,'Ivory sash horizontal');
  block(limestone,w.x,w.y-w.height/2-.13,-1.72,w.width+.40,.15,.42,'Projecting limestone window sill');
  if(!w.balcony)continue;
  const bottom=w.y-w.height/2-.07,front=-1.19,half=w.width/2+.04;
  block(limestone,w.x,bottom-.065,-1.50,w.width+.55,.13,.72,'Carved stone Juliet balcony slab');
  for(const y of [bottom+.10,bottom+.80])bar([w.x-half,y,front],[w.x+half,y,front],.014,iron,'Continuous balcony handrail');
  for(const side of [-1,1]){
   bar([w.x+side*half,bottom+.07,front],[w.x+side*half,bottom+.80,front],.013);
   for(const y of [bottom+.10,bottom+.80])bar([w.x+side*half,y,front],[w.x+side*half,y,-1.91],.012);
  }
  // Four symmetric panels each carry paired S-scrolls, an oval and a small
  // diamond. The repeated curled iron is modelled, never a painted decal.
  for(let panel=0;panel<4;panel++){
   const cx=w.x+(panel-1.5)*.57,cy=bottom+.45;
   bar([cx-.285,bottom+.10,front],[cx-.285,bottom+.80,front],.008);
   for(const side of [-1,1])scroll([[cx,cy-.31,front],[cx+side*.16,cy-.17,front],[cx+side*.17,cy+.04,front],[cx+side*.09,cy+.15,front],[cx+side*.01,cy+.10,front],[cx+side*.055,cy+.035,front]]);
   const loop=Array.from({length:17},(_,i)=>{const a=i/16*Math.PI*2;return[cx+Math.cos(a)*.11,cy+Math.sin(a)*.19,front];});scroll(loop,.007,'Oval at the heart of the wrought-iron panel');
   for(const [a,b] of [[[0,.075],[.075,0]],[[.075,0],[0,-.075]],[[0,-.075],[-.075,0]],[[-.075,0],[0,.075]]])bar([cx+a[0],cy+a[1],front+.003],[cx+b[0],cy+b[1],front+.003],.008);
  }
 }
 // Stone courses stop at the solid central TOTEHM bay. There is no opening,
 // sash or balcony behind the monumental tongue above the real entrance.
 for(const [y,height,depth] of [[.02,.18,.32],[2.61,.14,.38],[5.13,.16,.40],[7.18,.15,.42]])for(const [x,width] of [[-8.1,9.8],[8.1,9.8]])block(limestone,x,y,-1.72,width,height,depth,'Historic limestone string course');
 for(const y of [2.83,5.35])for(const x of [-8.1,8.1])block(border.material,x,y,-1.79,9.7,.17,.035,'Cobalt lozenge frieze between the window rows');
 for(const x of [-12.84,-3.18,3.18,12.84])block(limestone,x,3.62,-1.79,.20,7.18,.26,'Pale limestone vertical façade trim');
 for(const [y,height,depth] of [[7.21,.12,.46],[7.30,.09,.50],[7.60,.10,.44]])block(limestone,0,y,-1.76,26.25,height,depth,'Stepped pale limestone cornice and balustrade rail');
 const profile=[[.055,0],[.067,.035],[.045,.085],[.072,.15],[.073,.19],[.043,.26],[.045,.29],[.064,.32]].map(p=>new T.Vector2(...p));
 const balusterGeometry=new T.LatheGeometry(profile,mobile?6:8);balusterGeometry.normalizeNormals();
 const count=58,balusters=new T.InstancedMesh(ownG(balusterGeometry),limestone,count),matrix=new T.Matrix4();
 balusters.name='Lisbon roofline — turned stone balustrade';for(let i=0;i<count;i++){matrix.makeTranslation(-12.54+i*(25.08/(count-1)),7.31,-1.76);balusters.setMatrixAt(i,matrix);}balusters.instanceMatrix.needsUpdate=true;balusters.computeBoundingSphere();balusters.castShadow=true;balusters.receiveShadow=true;root.add(balusters);
 for(const [m,data] of batches){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(data.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));g.computeBoundingBox();g.computeBoundingSphere();const object=add(g,m,data.names.join(' · '),{solid:data.solid,batch:false});object.userData.facadeParts=data.names;}
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root);onChange();
 return{
  root,solids,pickables:[],windows:windows.map(w=>({...w})),height:LISBON_FACADE.height,
  diagnostics:()=>({kind:'lisbon-azulejo-street-facade',frontOnly:true,referenceMotif:'cobalt and white elongated lozenges',originalProceduralPattern:true,externalImages:0,historicWindowRows:3,windows:windows.length,upperBalconies:8,pairedScrollPanels:32,realCurledIronGeometry:true,stoneBalusters:count,limestoneSurrounds:true,whiteInterior:true,centralWindow:false,centralBay:{minX:-3.2,maxX:3.2,entranceHeight:3.1,windowFree:true},entryWidth:4.8,height:LISBON_FACADE.height,frontBounds:{minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z},tiles:tiles.diagnostics(),border:border.diagnostics(),wallTriangles:wallMesh.geometry.index?.count/3||wallMesh.geometry.attributes.position.count/3,meshes:root.children.filter(o=>o.isMesh).length,disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();if(!geometry)for(const g of geometries)g.dispose();if(!material)for(const m of materials)m.dispose();root.clear();}
 };
}
