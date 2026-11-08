import * as T from './vendor/three-0.180.0.mjs';

import {LISBON_STREET_SIGNS,LISBON_SIGN_OBSTACLES} from './gallery-lisbon-signs-layout.mjs';
export {LISBON_STREET_SIGNS,LISBON_SIGN_OBSTACLES};

export function createLisbonStreetSigns(parent,{mobile=false,anisotropy=1,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Lisbon street signs with Higher stickers';parent.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),pickables=[];
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 let disposed=false,loaded=0,failed=0;
 const changed=()=>{if(!disposed)onChange();};
 const hasImages=!!globalThis.document?.createElementNS;
 function load(src){
  if(!hasImages)return null;
  const texture=new T.TextureLoader().load(src,loadedTexture=>{
   if(disposed)return;
   if(src.endsWith('.svg')){
    // Give the vector sticker an explicit raster size before WebGL upload.
    // Its SVG mask and perforations then retain the same alpha as in HTML.
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=400;
    canvas.getContext('2d').drawImage(loadedTexture.image,0,0,canvas.width,canvas.height);
    loadedTexture.image=canvas;loadedTexture.needsUpdate=true;
   }
   loaded++;changed();
  },undefined,()=>{if(disposed)return;failed++;changed();});
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,anisotropy);textures.add(texture);return texture;
 }
 const metal=material(new T.MeshStandardMaterial({color:0x79828a,roughness:.48,metalness:.78}));
 const bracket=material(new T.MeshStandardMaterial({color:0x313638,roughness:.72,metalness:.7}));
 const stickerMap=load('/assets/gallery/higher.svg');
 const stickerMaterial=material(new T.MeshStandardMaterial({map:stickerMap,color:0xffffff,transparent:true,alphaTest:.12,roughness:.65,metalness:0,emissive:0xffffff,emissiveMap:stickerMap,emissiveIntensity:.16}));
 const plane=geometry(new T.PlaneGeometry(1,1)),box=geometry(new T.BoxGeometry(1,1,1));
 const screwGeometry=geometry(new T.CylinderGeometry(.009,.009,.004,mobile?8:12));screwGeometry.rotateX(Math.PI/2);
 function mesh(group,g,m,position,name,scale=null){const part=new T.Mesh(g,m);part.position.set(...position);if(scale)part.scale.set(...scale);part.name=name;part.castShadow=true;part.receiveShadow=true;group.add(part);return part;}
 function outline(kind,w,height=w){
  const shape=new T.Shape(),r=w*.46;
  if(kind==='circle'){shape.absarc(0,0,r,0,Math.PI*2,false);return shape;}
  if(kind==='square'){
   const b=w/2,h=height/2,c=Math.min(w,height)*.03;shape.moveTo(-b+c,-h);shape.lineTo(b-c,-h);shape.quadraticCurveTo(b,-h,b,-h+c);shape.lineTo(b,h-c);shape.quadraticCurveTo(b,h,b-c,h);shape.lineTo(-b+c,h);shape.quadraticCurveTo(-b,h,-b,h-c);shape.lineTo(-b,-h+c);shape.quadraticCurveTo(-b,-h,-b+c,-h);return shape;
  }
  const count=kind==='diamond'?4:kind==='triangle'?3:8,angle=kind==='diamond'||kind==='triangle'?Math.PI/2:Math.PI/8,radius=w*.48;
  for(let n=0;n<count;n++){const a=angle+n*Math.PI*2/count,p=[Math.cos(a)*radius,Math.sin(a)*radius];if(n===0)shape.moveTo(...p);else shape.lineTo(...p);}shape.closePath();return shape;
 }
 const stickerGeometry=geometry(new T.PlaneGeometry(1,1,8,2)),p=stickerGeometry.attributes.position;
 for(let i=0;i<p.count;i++){
  // A tiny lifted corner catches the light without flattening the SVG into
  // the sign photograph. Its original perforations remain transparent.
  const u=p.getX(i)+.5,v=.5-p.getY(i);p.setZ(i,.0025*Math.pow(Math.max(0,(u+v-1.55)/.45),2));
 }
 stickerGeometry.computeVertexNormals();
 for(const sign of LISBON_STREET_SIGNS){
  const group=new T.Group();group.name='Lisbon street sign — '+sign.title;group.position.set(...sign.position);group.rotation.y=sign.rotationY;
  group.userData={lisbonStreetSign:true,signId:sign.id,title:sign.title,phrase:sign.phrase,wallMounted:sign.mount==='stone',support:sign.mount==='post'?'galvanized-post':'stone',zone:sign.zone,mount:sign.mount};root.add(group);
  const data={kind:'lisbon-street-sign',id:sign.id,signId:sign.id,title:sign.title,phrase:sign.phrase,href:'/play_lisbon_street',methodHref:'/get_higher'};
  const mark=part=>{part.userData={...part.userData,...data};pickables.push(part);return part;};
  if(sign.mount==='post'){
   const ground=-.09,top=sign.position[1]+sign.width*.32,height=top-ground;
   const postGeometry=geometry(new T.CylinderGeometry(.045,.045,height,mobile?10:16));
   mesh(group,postGeometry,metal,[0,(ground+top)/2-sign.position[1],-.055],'Full-height galvanized street post — '+sign.id);
   const baseGeometry=geometry(new T.CylinderGeometry(.12,.12,.04,mobile?10:16));
   mesh(group,baseGeometry,metal,[0,ground+.02-sign.position[1],-.055],'Anchored street-post foot — '+sign.id);
  }
  for(const y of [-sign.width*.23,sign.width*.23])mesh(group,box,bracket,[0,y,-.035],(sign.mount==='post'?'Galvanized mounting clamp — ':'Recessed stone fixing — ')+sign.id,[.08,.045,.07]);
  const plateGeometry=geometry(new T.ExtrudeGeometry(outline(sign.shape,sign.shape==='square'?sign.width*(sign.plateWidth||.88):sign.width,sign.width*(sign.plateHeight||sign.plateWidth||.88)),{depth:.014,steps:1,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,curveSegments:mobile?24:40}));
  mark(mesh(group,plateGeometry,metal,[0,0,0],'Thin aluminium road-sign plate — '+sign.id));
  const image=load(sign.src),faceMaterial=material(new T.MeshStandardMaterial({map:image,color:0xffffff,transparent:true,alphaTest:.08,roughness:.6,metalness:.08,emissive:0xffffff,emissiveMap:image,emissiveIntensity:.12}));
  mark(mesh(group,plane,faceMaterial,[0,0,.018],'Original Lisbon sign — '+sign.id,[sign.width,sign.width,1]));
  const sticker=mark(mesh(group,stickerGeometry,stickerMaterial,[sign.width*.025,-sign.width*.045,.025],'Higher sticker — '+sign.id,[sign.width*.75,sign.width*.75/3,1]));sticker.rotation.z=sign.stickerAngle;sticker.castShadow=false;
  for(const y of [-sign.width*.31,sign.width*.31])mark(mesh(group,screwGeometry,metal,[0,y,.021],'Small sign fixing — '+sign.id));
 }
 return {root,pickables,
  diagnostics:()=>({count:LISBON_STREET_SIGNS.length,loaded,expectedTextures:LISBON_STREET_SIGNS.length+1,failed,ready:loaded===LISBON_STREET_SIGNS.length+1,originalSigns:true,sticker:'/assets/gallery/higher.svg',stickerRatio:3,outside:LISBON_STREET_SIGNS.filter(s=>s.zone==='outside').length,inside:LISBON_STREET_SIGNS.filter(s=>s.zone==='inside').length,posts:LISBON_STREET_SIGNS.filter(s=>s.mount==='post').length,fullSize:true,positions:LISBON_STREET_SIGNS.map(s=>({id:s.id,position:[...s.position],rotationY:s.rotationY,zone:s.zone,mount:s.mount,width:s.width})),experience:'/play_lisbon_street',method:'/get_higher',disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.clear();}
 };
}
