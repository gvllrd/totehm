import * as T from './vendor/three-0.180.0.mjs';
import {createLisbonFacade,LISBON_FACADE as F,LISBON_FACADE_BALCONIES} from './gallery-lisbon-azulejo-facade.mjs';
import {GLASS_SHELL as S,GLASS_HEARTH as H,glassRoofHeight,glassSmokeOpening,LISBON_ROOF_PROFILE} from './gallery-lisbon-shell.mjs';

// The complete c8ddaf0 building envelope: the original intact azulejo street
// front and its continuous wave of glass. Furniture and artworks belong to
// the caller, so restoring architecture never restores obsolete editions.
export function createLisbonAzulejoBuilding(parent,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Lisbon — restored azulejo building and wave glass';parent.add(root);
 const geometries=new Set(),materials=new Set(),solids=[];
 let disposed=false;
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 const changed=()=>{if(!disposed)onChange();};
 const metal=material(new T.MeshStandardMaterial({color:0x202122,roughness:.28,metalness:.82}));
 const bronze=material(new T.MeshStandardMaterial({color:0x5d5547,roughness:.32,metalness:.86}));
 const glass=material(new T.MeshPhysicalMaterial({color:0xd5e2e6,roughness:.055,metalness:.015,transparent:true,opacity:.055,depthWrite:false,side:T.FrontSide,envMapIntensity:1.2,clearcoat:1,clearcoatRoughness:.06}));
 const roofGlass=glass.clone();roofGlass.name='Wave-folded celestial glass shell';roofGlass.opacity=.075;roofGlass.side=T.DoubleSide;roofGlass.roughness=.035;materials.add(roofGlass);
 const collectorGlass=roofGlass.clone();collectorGlass.name='Clear glass smoke fold continuous with the roof';collectorGlass.opacity=.03;materials.add(collectorGlass);
 const lit=material(new T.MeshBasicMaterial({color:0xffe3bb,toneMapped:false}));
 const box=geometry(new T.BoxGeometry(1,1,1));
 function mesh(g,m,p,name,solid=false,size=null){
  const object=new T.Mesh(g,m);object.position.set(...p);if(size)object.scale.set(...size);
  object.name=name;object.castShadow=!m.transparent;object.receiveShadow=true;root.add(object);if(solid)solids.push(object);return object;
 }
 const block=(m,p,size,name)=>mesh(box,m,p,name,false,size);
 const o=H.smokeOutlet,roofLimit=mobile?2.6:2.2,roofError=mobile?.006:.004;
 function roofNormal(x,z,offset=1){const d=.005,n=new T.Vector3((glassRoofHeight(x-d,z)-glassRoofHeight(x+d,z))/(2*d),1,(glassRoofHeight(x,z-d)-glassRoofHeight(x,z+d))/(2*d));return n.normalize().multiplyScalar(offset);}
 function roofSurface(){
  const {minX,maxX,minZ,maxZ,thickness}=S;
  const outline=[new T.Vector2(minX,minZ),new T.Vector2(maxX,minZ),new T.Vector2(maxX,maxZ),new T.Vector2(minX,maxZ)];
  const samples=mobile?64:96,hole=Array.from({length:samples},(_,i)=>{const a=i/samples*Math.PI*2;return new T.Vector2(o.x+Math.cos(a)*o.radius,o.z+Math.sin(a)*o.radiusZ);});
  const points=[...outline,...hole],faces=T.ShapeUtils.triangulateShape(outline,[hole]),positions=[],normals=[],uvs=[];
  const push=(p,top)=>{const n=roofNormal(p.x,p.y,top?1:-1);positions.push(p.x,glassRoofHeight(p.x,p.y)+(top?thickness:0),p.y);normals.push(n.x,n.y,n.z);uvs.push((p.x-minX)/(maxX-minX),(p.y-minZ)/(maxZ-minZ));};
  function split(a,b,c,depth=0){
   const ab=a.distanceToSquared(b),bc=b.distanceToSquared(c),ca=c.distanceToSquared(a),longest=Math.max(ab,bc,ca);
   const height=p=>glassRoofHeight(p.x,p.y),ha=height(a),hb=height(b),hc=height(c);
   const midpointError=(p,q,hp,hq)=>Math.abs(height(p.clone().add(q).multiplyScalar(.5))-(hp+hq)/2);
   const centre=a.clone().add(b).add(c).multiplyScalar(1/3),error=Math.max(midpointError(a,b,ha,hb),midpointError(b,c,hb,hc),midpointError(c,a,hc,ha),Math.abs(height(centre)-(ha+hb+hc)/3));
   if(longest<=roofLimit*roofLimit&&error<=roofError||depth>18){for(const p of [a,c,b])push(p,true);for(const p of [a,b,c])push(p,false);return;}
   if(longest===ab){const m=a.clone().add(b).multiplyScalar(.5);split(a,m,c,depth+1);split(m,b,c,depth+1);}
   else if(longest===bc){const m=b.clone().add(c).multiplyScalar(.5);split(a,b,m,depth+1);split(a,m,c,depth+1);}
   else{const m=c.clone().add(a).multiplyScalar(.5);split(a,b,m,depth+1);split(m,b,c,depth+1);}
  }
  for(const f of faces)split(...f.map(i=>points[i]));
  const g=geometry(new T.BufferGeometry());g.name='Continuous curved glass roof with actual open smoke oculus';
  g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeBoundingBox();g.computeBoundingSphere();return g;
 }
 const waveRoof=mesh(roofSurface(),roofGlass,[0,0,0],'Wave glass roof — open smoke oculus, no flat lid',true);waveRoof.castShadow=false;
 function curvedGlazing(axis,fixed,start,end,bottom,name){
  const count=mobile?48:72,positions=[],indices=[];
  for(let i=0;i<=count;i++){
   const a=start+(end-start)*i/count,x=axis==='x'?a:fixed,z=axis==='x'?fixed:a;
   positions.push(x,bottom,z,x,glassRoofHeight(x,z),z);
   if(i<count){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const g=geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
  const pane=mesh(g,roofGlass,[0,0,0],name,true);pane.castShadow=false;return pane;
 }
 curvedGlazing('x',-17,-13,13,-.09,'Rear glazing following the lifted wave');
 const facade=createLisbonFacade(root,{mobile,onChange:changed});solids.push(...facade.solids);
 for(const x of [-13,13]){
  curvedGlazing('z',x,-17,-2,-.09,'Ocean-side glass cut to the flowing roof');
  for(const z of [-16.94,-2.05]){const height=glassRoofHeight(x,z)+.09;block(metal,[x,(height-.09)/2,z],[.036,height,.045],'Slender glass corner post');}
  block(bronze,[x,.025,-9.5],[.055,.05,15],'Quiet bronze floor glass channel');
 }
 for(const x of [-2.43,2.43])block(metal,[x,1.50,-1.96],[.035,3.18,.055],'Original open entry jamb');
 block(bronze,[0,-.098,-1.98],[4.8,.018,.55],'Flush bronze entrance threshold');
 function swept(points,radius,m,name){const curve=new T.CatmullRomCurve3(points),g=geometry(new T.TubeGeometry(curve,mobile?72:112,radius,5,false));return mesh(g,m,[0,0,0],name);}
 const section=(axis,fixed,start,end,offset=0)=>Array.from({length:49},(_,i)=>{const a=start+(end-start)*i/48,x=axis==='x'?a:fixed,z=axis==='x'?fixed:a;return new T.Vector3(x,glassRoofHeight(x,z)+offset,z);});
 for(const z of [-17.2,-9.4,-1.65])swept(section('x',z,-13.30,13.30,.045),.035,metal,'Slender wave-following roof rib');
 for(const x of [-13.30,13.30])swept(section('z',x,-17.2,-1.65,.045),.039,metal,'Swept glass eave');
 swept(section('x',-1.66,-13.26,13.26,-.035),.0065,lit,'Warm hairline on the undulating entrance');
 // The original asymmetric glass fold gathers smoke into the real opening.
 const rings=mobile?18:28,sides=mobile?48:72,collectorPositions=[],collectorIndices=[];
 for(let j=0;j<=rings;j++){
  const t=j/rings,ease=(1-t)*(1-t),rx=o.radius+(H.collectorRadius[0]-o.radius)*ease,rz=o.radiusZ+(H.collectorRadius[1]-o.radiusZ)*ease;
  for(let i=0;i<=sides;i++){
   const a=i/sides*Math.PI*2,x=o.x+rx*Math.cos(a),z=o.z+rz*Math.sin(a),roof=glassRoofHeight(o.x+o.radius*Math.cos(a),o.z+o.radiusZ*Math.sin(a))+S.thickness;
   const lip=H.collectorBaseY+2.05*Math.pow((1-Math.sin(a))*.5,1.2);collectorPositions.push(x,lip+(roof-lip)*t,z);
   if(j<rings&&i<sides){const k=j*(sides+1)+i;collectorIndices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
  }
 }
 const collectorGeometry=geometry(new T.BufferGeometry());collectorGeometry.setAttribute('position',new T.Float32BufferAttribute(collectorPositions,3));collectorGeometry.setIndex(collectorIndices);collectorGeometry.computeVertexNormals();collectorGeometry.computeBoundingBox();collectorGeometry.computeBoundingSphere();
 const collector=mesh(collectorGeometry,collectorGlass,[0,0,0],'Folded glass smoke collector continuous with the wave roof');collector.castShadow=false;
 const outletRing=Array.from({length:73},(_,i)=>{const a=i/72*Math.PI*2,x=o.x+o.radius*Math.cos(a),z=o.z+o.radiusZ*Math.sin(a);return new T.Vector3(x,glassRoofHeight(x,z)+S.thickness+.014,z);});
 swept(outletRing,.014,metal,'Minimal open smoke oculus rim');
 // The cool grazing spots are part of the original azulejo presentation.
 for(const x of [-9,9]){
  const spot=new T.SpotLight(0xe0eaff,140,16,.65,.75,2);spot.position.set(x,5,3);spot.target.position.set(x,4,-2);root.add(spot,spot.target);
 }
 const boxObstacle=(id,minX,maxX,minZ,maxZ,minY,maxY,shape={})=>Object.freeze({id,minX,maxX,minZ,maxZ,minY,maxY,...shape});
 const obstacles=Object.freeze([
  boxObstacle('lisbon-azulejo-back-glass',-13,13,-17.2,-16.8,-.09,S.maxHeight,{waveWall:{axis:'z',at:-17}}),
  boxObstacle('lisbon-azulejo-left-glass',-13.16,-12.94,-17,-2,-.09,S.maxHeight,{waveWall:{axis:'x',at:-13}}),
  boxObstacle('lisbon-azulejo-right-glass',12.94,13.16,-17,-2,-.09,S.maxHeight,{waveWall:{axis:'x',at:13}}),
  boxObstacle('lisbon-azulejo-front-left',-13,-F.entryWidth/2,-2.2,-1.8,-.09,F.height),
  boxObstacle('lisbon-azulejo-front-right',F.entryWidth/2,13,-2.2,-1.8,-.09,F.height),
  boxObstacle('lisbon-azulejo-entry-lintel',-F.entryWidth/2,F.entryWidth/2,-2.2,-1.8,F.entryHeight,F.height),
  ...LISBON_FACADE_BALCONIES,
  boxObstacle('lisbon-azulejo-roof',S.minX,S.maxX,S.minZ,S.maxZ,S.minHeight,S.maxHeight+S.thickness,{waveRoof:true})
 ]);
 changed();
 return {root,solids,obstacles,roofHeight:glassRoofHeight,smokeOutlet:o,roofProfile:LISBON_ROOF_PROFILE,
  facadeSign:{position:[...F.signPosition],scale:F.signScale},
  diagnostics:()=>({kind:'lisbon-azulejo-pavilion',restoredFrom:'c8ddaf0',ready:!disposed,levels:1,azulejos:true,facadeOnlyMasonry:true,glassSides:true,glassRear:true,glassRoof:true,waveGlass:true,flatRoof:false,entryWidth:F.entryWidth,entryHeight:F.entryHeight,facade:facade.diagnostics(),roofShell:{continuous:true,minimum:S.minHeight,maximum:S.maxHeight,thickness:S.thickness,triangles:waveRoof.geometry.attributes.position.count/3,ribs:5,actualAperture:true,smokeOutlet:{...o},collector:{glass:true,rearGlazingFold:true,asymmetricLip:true,baseHeight:H.collectorBaseY,topHeight:o.y,metalHood:false,metalFlue:false,integrated:true}},disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();facade.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.traverse(object=>{if(object.isLight)object.dispose?.();});root.clear();}
 };
}
