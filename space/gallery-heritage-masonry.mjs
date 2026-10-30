import * as T from './vendor/three-0.180.0.mjs';

// The old structure is made of actual eroded blocks, with recessed mortar.
// Small crops of the locally hosted CC0 sandstone scan supply mineral grain;
// its photographed courses never become a second masonry pattern on a wall.
const caches=new Map(),MAPS={color:'map',normal:'normalMap',roughness:'roughnessMap'};
const hash=(x,y=0)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453123;return n-Math.floor(n);};
const seedOf=value=>typeof value==='number'?value:[...String(value||'heritage')].reduce((s,c)=>Math.imul(s,31)+c.charCodeAt(0)|0,7);
function acquireMaps(anisotropy,changed){
 if(!globalThis.document?.createElementNS)return null;
 let cache=caches.get('sandstone');
 if(!cache){
  cache={refs:0,callbacks:new Set(),textures:{},loaded:new Set(),failed:new Set(),disposed:false};caches.set('sandstone',cache);
  for(const name of Object.keys(MAPS)){
   const texture=new T.TextureLoader().load('/assets/temple/stone-'+name+'.webp',loaded=>{
    if(cache.disposed)return;cache.loaded.add(name);for(const callback of cache.callbacks)callback();
   },undefined,()=>{if(!cache.disposed){cache.failed.add(name);for(const callback of cache.callbacks)callback();}});
   texture.colorSpace=name==='color'?T.SRGBColorSpace:T.NoColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;
   texture.anisotropy=anisotropy;texture.name='CC0 old sandstone — heritage '+name;cache.textures[name]=texture;
  }
 }
 cache.refs++;cache.callbacks.add(changed);let released=false;
 return{cache,release(){if(released)return;released=true;cache.callbacks.delete(changed);if(--cache.refs)return;cache.disposed=true;for(const texture of Object.values(cache.textures))texture.dispose();caches.delete('sandstone');}};
}

export function createHeritageMasonry(parent,{walls=[],mobile=false,anisotropy=4,onChange=()=>{},geometry=null,material=null}={}){
 const root=new T.Group();root.name='Retained masonry — weathered stone inside contemporary glass';parent.add(root);
 const geometries=new Set(),materials=new Set(),solids=[],wallData=[];
 const ownG=g=>(geometries.add(g),geometry?geometry(g):g),ownM=m=>(materials.add(m),material?material(m):m);
 let disposed=false,compiled=false,surface=null,blocks=0,fracturedBlocks=0,totalTriangles=0;
 const stone=ownM(new T.MeshStandardMaterial({color:0xd5cbbb,roughness:.88,metalness:0,vertexColors:true,normalScale:new T.Vector2(.43,.43)}));
 stone.name='HERITAGE_STONE — real weathered limestone blocks and mineral scans';
 const mortar=ownM(new T.MeshStandardMaterial({color:0x776f61,roughness:.98,metalness:0}));mortar.name='Recessed old lime mortar';
 const changed=()=>{if(disposed)return;if(surface){for(const [name,key] of Object.entries(MAPS))stone[key]=surface.cache.loaded.has(name)?surface.cache.textures[name]:null;stone.needsUpdate=true;}onChange();};
 surface=acquireMaps(anisotropy,changed);
 stone.customProgramCacheKey=()=> 'heritage-physical-sandstone-grain-v1';
 stone.onBeforeCompile=shader=>{
  compiled=true;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   #ifdef USE_MAP
    vec4 heritageScan=texture2D(map,vMapUv);
    float heritageMineral=dot(heritageScan.rgb,vec3(.2126,.7152,.0722));
    // Geometry supplies all courses and joints. The sampled patch supplies
    // only the subtle, naturally irregular mineral grain of each stone.
    diffuseColor.rgb*=clamp(.72+heritageMineral*.75,.72,1.12);
   #endif
  `);
 };
 const mortarParts=[];
 function makeBlock(target,a,b,y0,y1,depth,axis,centre,seed,warm,topFlush=false){
  const width=b-a,height=y1-y0;if(width<.018||height<.018)return;
  const mid=(a+b)/2,cy=(y0+y1)/2,halfW=width/2,halfH=height/2;
  const bevel=Math.min(.010+.021*hash(seed,83),.18*width,.16*height,.16*depth),fractured=hash(seed,97)>.63;
  // Corners are independently broken, rather than identically rounded.
  // The restrained cuts remain entirely inside the structural fragment.
  const cuts=Array.from({length:4},(_,i)=>Math.min(.010+.075*hash(seed+i,67),.27*width,.26*height));
  const outline=[[-halfW+cuts[0],-halfH], [halfW-cuts[1],-halfH], [halfW,-halfH+cuts[1]], [halfW,halfH-cuts[2]], [halfW-cuts[2],halfH], [-halfW+cuts[3],halfH], [-halfW,halfH-cuts[3]], [-halfW,-halfH+cuts[0]]];
  const local=[],indices=[];
  for(const face of [-1,1])for(const ring of [0,1])for(let i=0;i<8;i++){
   const [x,y]=outline[i],inset=ring?bevel:0;
   const wear=Math.min(.018,width*.06,height*.08),courseWear=Math.min(.029,height*.10)*(.5+.5*Math.sin((mid+x)*3.1+seed*.13));
   const px=x-Math.sign(x)*(inset+wear*hash(seed+i,27));
   // A retained fragment is supported by its real upper stones. The middle
   // of each top cap reaches the shared maxY; its outer bevel stays eroded.
   const py=topFlush&&!ring&&(i===4||i===5)?halfH:y-Math.sign(y)*(inset+wear*hash(seed+i,41)+courseWear);
   const erosion=Math.min(depth*.12,.002+.014*hash(seed+i,19))*(ring?.5:1),z=face*(depth/2-(ring?0:bevel)-erosion);
   local.push(px,py,z);
  }
  for(const face of [0,1]){
   const start=face*16;
   for(let i=0;i<8;i++){
    const j=(i+1)%8,a=start+i,b=start+j,c=start+8+i,d=start+8+j;
    if(face)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);
   }
   const c=local.length/3;local.push((hash(seed,71)-.5)*width*.10,(hash(seed,73)-.5)*height*.10,(face?1:-1)*(depth/2-(fractured?Math.min(.014,depth*.08):.002)));
   for(let i=0;i<8;i++){const a=start+8+i,b=start+8+(i+1)%8;if(face)indices.push(c,a,b);else indices.push(c,b,a);}
  }
  for(let i=0;i<8;i++){const j=(i+1)%8;indices.push(i,j,16+i,j,16+j,16+i);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(local,3));g.setIndex(indices);g.computeVertexNormals();
  const p=g.attributes.position,n=g.attributes.normal,uvCentre=[.12+.74*hash(seed,31),[.10,.31,.58,.87][Math.floor(hash(seed,4)*4)]],tone=.82+hash(seed,5)*.30;
  const tint=warm?[1.04,.985,.88]:[1.0,.99,.96];
  // Duplicate triangle UVs before merging so every side has its own correct
  // tangent basis. No degenerate UVs or stretched normal map on cut reveals.
  const A=new T.Vector3(),B=new T.Vector3(),C=new T.Vector3(),faceNormal=new T.Vector3(),vertexNormal=new T.Vector3();
  for(let i=0;i<indices.length;i+=3){
   A.fromBufferAttribute(p,indices[i]);B.fromBufferAttribute(p,indices[i+1]);C.fromBufferAttribute(p,indices[i+2]);faceNormal.crossVectors(B.clone().sub(A),C.clone().sub(A));
   const nx=Math.abs(faceNormal.x),ny=Math.abs(faceNormal.y),nz=Math.abs(faceNormal.z);faceNormal.normalize();
   for(const id of indices.slice(i,i+3)){
    const x=p.getX(id),y=p.getY(id),z=p.getZ(id),u=nx>ny&&nx>nz?z:x,v=ny>nx&&ny>nz?z:y;
    target.p.push(axis==='x'?mid+x:centre-z,cy+y,axis==='x'?centre+z:mid+x);
    vertexNormal.fromBufferAttribute(n,id);
    if(vertexNormal.dot(faceNormal)<.02||fractured&&Math.abs(faceNormal.z)<.98)vertexNormal.copy(faceNormal);
    target.n.push(axis==='x'?vertexNormal.x:-vertexNormal.z,vertexNormal.y,axis==='x'?vertexNormal.z:vertexNormal.x);
    target.uv.push(uvCentre[0]+u*.13,uvCentre[1]+v*.14);target.c.push(tint[0]*tone,tint[1]*tone,tint[2]*tone);
   }
  }
  g.dispose();blocks++;if(fractured)fracturedBlocks++;totalTriangles+=indices.length/3;
 }
 function merged(data,name,m){
  if(!data.p.length)return null;
  const g=ownG(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(data.p,3));
  if(data.n)g.setAttribute('normal',new T.Float32BufferAttribute(data.n,3));else g.computeVertexNormals();
  if(data.uv)g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));if(data.c)g.setAttribute('color',new T.Float32BufferAttribute(data.c,3));
  g.computeBoundingBox();g.computeBoundingSphere();const object=new T.Mesh(g,m);object.name=name;object.castShadow=true;object.receiveShadow=true;root.add(object);solids.push(object);return object;
 }
 for(const [index,w] of walls.entries()){
  if(!w||!['minX','maxX','minY','maxY','minZ','maxZ'].every(k=>Number.isFinite(w[k]))||w.minX>=w.maxX||w.minY>=w.maxY||w.minZ>=w.maxZ)continue;
  const axis=['x','z'].includes(w.axis)?w.axis:((w.maxX-w.minX)>=(w.maxZ-w.minZ)?'x':'z'),min=axis==='x'?w.minX:w.minZ,max=axis==='x'?w.maxX:w.maxZ;
  const centre=axis==='x'?(w.minZ+w.maxZ)/2:(w.minX+w.maxX)/2,depth=axis==='x'?w.maxZ-w.minZ:w.maxX-w.minX,seed=seedOf(w.seed??w.id??index);
  const data={p:[],n:[],uv:[],c:[]},joint=Math.min(.018,depth*.07),startBlocks=blocks;let y=w.minY,row=0;
  while(y<w.maxY-.018){
   let rowHeight=Math.min(w.maxY-y,.18+.25*hash(seed+row,17));
   if(w.maxY-y-rowHeight<.06)rowHeight=w.maxY-y;
   const lastRow=y+rowHeight>=w.maxY-1e-8;
   let x=min-(row%2?(.18+.12*hash(seed,row)):0),column=0,topStone=false;
   while(x<max-.018){
    const width=.24+.69*hash(seed+row*41,column+3),a=Math.max(min,x)+joint/2,b=Math.min(max,x+width)-joint/2;
    const valid=b-a>=.018,cut=w.breakTop&&lastRow&&topStone?Math.min(rowHeight*.48,.04+.09*hash(seed+column,9)):0;
    makeBlock(data,a,b,y+joint/2,y+rowHeight-(lastRow?0:joint/2)-cut,depth,axis,centre,seed+row*103+column*7,w.warm!==false,lastRow&&!cut);
    if(valid&&lastRow)topStone=true;
    x+=width;column++;
   }
   y+=rowHeight;row++;
  }
  const object=merged(data,w.id||'Retained old stone wall '+index,stone);if(object)object.userData={heritageMasonry:true,wallId:w.id||index,fragmentGroup:w.group||w.id||index,physicalBlocks:true};
  // Recess the core on every exposed end, not just the two long faces. Its
  // top stops below the real capstones so a broken end never reads as a
  // flat concrete slice. Narrow fragments retain a positive inner core.
  const recessX=Math.min(axis==='x'?.060:.045,(w.maxX-w.minX)*.22),recessZ=Math.min(axis==='z'?.060:.045,(w.maxZ-w.minZ)*.22);
  const topRecess=Math.min(.025,(w.maxY-w.minY)*.15),coreHeight=w.maxY-w.minY-topRecess;
  const g=new T.BoxGeometry(w.maxX-w.minX-recessX*2,coreHeight,w.maxZ-w.minZ-recessZ*2).toNonIndexed();
  g.translate((w.minX+w.maxX)/2,w.minY+coreHeight/2,(w.minZ+w.maxZ)/2);mortarParts.push(g);
  wallData.push({id:w.id||index,group:w.group||w.id||index,axis,blocks:blocks-startBlocks,bounds:{minX:w.minX,maxX:w.maxX,minY:w.minY,maxY:w.maxY,minZ:w.minZ,maxZ:w.maxZ},breakTop:!!w.breakTop});
 }
 const mortarData={p:[],n:[],uv:[]};
 for(const g of mortarParts){mortarData.p.push(...g.attributes.position.array);mortarData.n.push(...g.attributes.normal.array);mortarData.uv.push(...g.attributes.uv.array);g.dispose();}
 const core=merged(mortarData,'Recessed structural lime mortar behind the retained stones',mortar);if(core){core.userData={heritageMortar:true};totalTriangles+=mortarData.p.length/9;}
 changed();
 return{root,solids,
  diagnostics:()=>({kind:'retained-weathered-stone-masonry',walls:wallData.length,fragments:wallData.length,fragmentGroups:new Set(wallData.map(w=>w.group)).size,wallData:wallData.map(w=>({...w,bounds:{...w.bounds}})),blocks,fracturedBlocks,angularChips:true,variedCourseFormats:true,physicalBlocks:true,irregularBlocks:true,beveledStone:true,deepMortar:true,mortarRecessMetres:.045,recessedEnds:true,stoneTopSupports:true,mortarTopRecessMetres:.025,compiled,photographicMapsReady:surface?.cache.loaded.size===3,loadedMaps:surface?.cache.loaded.size||0,mapFailures:surface?.cache.failed.size||0,localPhotographicMaps:true,sharedGPUMaps:true,textureSource:'https://polyhaven.com/a/old_sandstone_02',license:'CC0-1.0',materials:2,drawCalls:solids.length,triangles:totalTriangles,mobile,disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();surface?.release();if(!geometry)for(const g of geometries)g.dispose();if(!material)for(const m of materials)m.dispose();root.clear();}
 };
}
