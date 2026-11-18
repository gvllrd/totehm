import * as T from './vendor/three-0.180.0.mjs';

// Keep the soft upholstery radius in world metres, even on long panels.
function upholsteredBox(width,height,depth,radius){
 const divisions=8;
 const geometry=new T.BoxGeometry(width,height,depth,divisions,divisions,divisions);
 const points=geometry.attributes.position;
 const normals=geometry.attributes.normal;
 const half=new T.Vector3(width/2,height/2,depth/2);
 const round=Math.min(radius,half.x*.92,half.y*.92,half.z*.92);
 const core=half.clone().subScalar(round),low=core.clone().negate();
 const vertex=new T.Vector3(),base=new T.Vector3(),normal=new T.Vector3();
 function concentrate(value,edge){
  const distance=Math.abs(value)/edge;
  const remapped=distance>.5?edge-round*(1-distance)*2:(edge-round)*distance*2;
  return Math.sign(value)*remapped;
 }
 for(let i=0;i<points.count;i++){
  vertex.fromBufferAttribute(points,i);
  vertex.set(concentrate(vertex.x,half.x),concentrate(vertex.y,half.y),concentrate(vertex.z,half.z));
  base.copy(vertex).clamp(low,core);
  normal.copy(vertex).sub(base).normalize();
  vertex.copy(base).addScaledVector(normal,round);
  points.setXYZ(i,vertex.x,vertex.y,vertex.z);
  normals.setXYZ(i,normal.x,normal.y,normal.z);
 }
 return geometry;
}

function grainMap(){
 const size=128,texels=new Uint8Array(size*size*4);
 function grain(x,y){
  x=(x+size)%size;y=(y+size)%size;
  const noise=((Math.imul(x+19,45937)^Math.imul(y+23,18181))>>>0)%257/257;
  return .08*noise+.045*Math.sin(x*.589+y*.294)*Math.cos(y*.442-x*.196);
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=grain(x-1,y)-grain(x+1,y),dy=grain(x,y-1)-grain(x,y+1);
  const index=(y*size+x)*4;
  texels.set([128+dx*460,128+dy*460,247,255],index);
 }
 const map=new T.DataTexture(texels,size,size);
 map.name='Small tactile leather pores';
 map.wrapS=map.wrapT=T.RepeatWrapping;
 map.repeat.set(3,3);map.minFilter=T.LinearMipmapLinearFilter;
 map.magFilter=T.LinearFilter;map.generateMipmaps=true;map.needsUpdate=true;
 return map;
}

export function createLisbonArmchair(parent,{layout,geometry,material,texture,mark}){
 const root=new T.Group();root.name='Cognac leather club chair facing the cinema';
 root.position.set(...layout.position);parent.add(root);
 const grain=texture(grainMap());
 const leather=material(new T.MeshPhysicalMaterial({
  color:0x71402b,normalMap:grain,normalScale:new T.Vector2(.36,.36),
  roughness:.49,clearcoat:.24,clearcoatRoughness:.32,envMapIntensity:.66
 }));
 const seatLeather=material(leather.clone());seatLeather.color.set(0x875333);
 const darkLeather=material(leather.clone());darkLeather.color.set(0x4e2c20);
 const piping=material(new T.MeshStandardMaterial({color:0x3e2319,roughness:.46}));
 const thread=material(new T.MeshStandardMaterial({color:0xac7851,roughness:.82}));
 const walnut=material(new T.MeshStandardMaterial({color:0x2d1810,roughness:.53,metalness:.03}));
 const pickables=[];
 function piece(name,position,size,radius,finish=leather,parent=root){
  const mesh=new T.Mesh(geometry(upholsteredBox(...size,radius)),finish);
  mesh.name=name;mesh.position.set(...position);mesh.castShadow=mesh.receiveShadow=true;
  parent.add(mesh);pickables.push(mark(mesh,'lisbon-seat'));return mesh;
 }
 function seam(name,points,closed=true,parent=root){
  const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed,'centripetal');
  const mesh=new T.Mesh(geometry(new T.TubeGeometry(path,56,.009,5,closed)),piping);
  mesh.name=name;parent.add(mesh);return path;
 }
 function stitch(name,path,count,parent=root){
  const mesh=new T.InstancedMesh(geometry(new T.BoxGeometry(.011,.004,.004)),thread,count);
  const anchor=new T.Object3D(),axis=new T.Vector3(1,0,0);
  for(let i=0;i<count;i++){
   const position=i/count;anchor.position.copy(path.getPointAt(position));
   anchor.position.y+=.003;
   anchor.quaternion.setFromUnitVectors(axis,path.getTangentAt(position));anchor.updateMatrix();mesh.setMatrixAt(i,anchor.matrix);
  }
  mesh.name=name;parent.add(mesh);
 }
 piece('Low walnut frame',[0,.19,0],[1.37,.20,1.31],.043,walnut);
 piece('Hand-upholstered leather apron',[0,.325,-.043],[1.41,.31,1.34],.095,darkLeather);
 piece('Deep sprung leather seat',[0,.523,-.133],[1.13,.205,1.09],.092,seatLeather);
 const seatSeam=seam('Seat cushion piping',[
  [-.47,.565,-.653],[-.548,.566,-.547],[-.55,.565,-.1],[-.5,.567,.37],
  [.48,.567,.37],[.55,.565,-.1],[.548,.566,-.547],[.47,.565,-.653]
 ]);
 stitch('Fine saddle stitching on seat',seatSeam,128);
 for(const side of [-1,1]){
  piece('Sculpted leather outer arm',[side*.647,.487,-.029],[.257,.63,1.33],.092);
  piece('Rolled arm topped in supple leather',[side*.602,.774,-.071],[.31,.236,1.238],.11,seatLeather);
  const line=seam('Outer arm leather welt',[
   [side*.72,.788,-.604],[side*.735,.803,-.53],[side*.744,.807,-.31],
   [side*.744,.808,.2],[side*.726,.812,.421]
  ],false);
  stitch('Fine saddle stitching on arm',line,42);
  for(const z of [-.49,.498])piece('Dark tapered furniture foot',[side*.547,.085,z],[.156,.174,.171],.029,walnut);
 }
 const back=new T.Group();back.position.set(0,.86,.477);back.rotation.x=.135;root.add(back);
 piece('Hand-shaped high leather back',[0,.056,.012],[1.37,1.10,.245],.12,darkLeather,back);
 piece('Two-tone leather back cushion',[0,.08,-.132],[1.16,.964,.20],.099,leather,back);
 const backSeam=seam('Back cushion piped saddle seam',[
  [-.44,-.368,-.185],[-.553,-.313,-.207],[-.567,.36,-.204],[-.45,.534,-.20],
  [.45,.534,-.20],[.567,.36,-.204],[.553,-.313,-.207],[.44,-.368,-.185]
 ],true,back);
 stitch('Saddle stitches around curved back',backSeam,125,back);
 for(const side of [-1,1]){
  const gathered=seam('Subtle gathered leather seam',[
   [side*.07,.395,-.234],[side*.095,.22,-.235],[side*.105,-.065,-.235],[side*.14,-.25,-.227]
  ],false,back);
  stitch('Thread on vertical upholstery seam',gathered,20,back);
 }
 return{root,pickables,...layout};
}
