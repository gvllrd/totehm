import * as T from './vendor/three-0.180.0.mjs';
import {LISBON_STREET_SIGNS,LISBON_SIGN_OBSTACLES} from './gallery-lisbon-signs-layout.mjs';
import {createEmblemReliefGeometry} from './gallery-lisbon-emblem-relief.mjs';
export {LISBON_STREET_SIGNS,LISBON_SIGN_OBSTACLES};

// Each authored sign keeps its own experience identity while taking the form
// it actually has in the city: paint, a plaque, a signal, an emblem or a sign.
export function createLisbonStreetSigns(parent,{mobile=false,anisotropy=1,onChange=()=>{},signs=LISBON_STREET_SIGNS}={}){
 const root=new T.Group();root.name='Lisbon street signs with Higher stickers';parent.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),instances=new Set(),pickables=[],animations=[];
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 let disposed=false,loaded=0,failed=0,time=0,lastAnimation=-1;
 const changed=()=>{if(!disposed)onChange();};
 const hasImages=!!globalThis.document?.createElementNS;
 function load(src,ready=()=>{}){
  if(!hasImages)return null;
  const texture=new T.TextureLoader().load(src,loadedTexture=>{
   if(disposed)return;
   if(src.endsWith('/Heli.png')){
    // The authored H comes on opaque black. In the city it is white road
    // paint: keep its exact mark and let the original paving show through.
    const canvas=document.createElement('canvas');canvas.width=loadedTexture.image.naturalWidth||300;canvas.height=loadedTexture.image.naturalHeight||300;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(loadedTexture.image,0,0);
    const pixels=context.getImageData(0,0,canvas.width,canvas.height);
    for(let n=0;n<pixels.data.length;n+=4){const brightness=Math.max(pixels.data[n],pixels.data[n+1],pixels.data[n+2]);pixels.data[n+3]=Math.round(pixels.data[n+3]*Math.max(0,Math.min(1,(brightness-25)/110)));}
    context.putImageData(pixels,0,0);loadedTexture.image=canvas;loadedTexture.needsUpdate=true;
   }
   if(src.endsWith('/destination.png')){
    // This authored PNG already contains a very large Higher sticker. Remove
    // that baked-in copy: the motorway board receives the same small physical
    // sticker as the other objects, while Lisboa and its airport arrow remain.
    const canvas=document.createElement('canvas');canvas.width=300;canvas.height=300;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(loadedTexture.image,0,0,300,300);
    const blue=context.getImageData(25,110,1,1).data;context.fillStyle='rgb('+blue[0]+','+blue[1]+','+blue[2]+')';context.fillRect(58,84,182,67);
    loadedTexture.image=canvas;loadedTexture.needsUpdate=true;
   }
   if(src.endsWith('.svg')){
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=400;
    canvas.getContext('2d').drawImage(loadedTexture.image,0,0,canvas.width,canvas.height);
    loadedTexture.image=canvas;loadedTexture.needsUpdate=true;
   }
   loaded++;ready(loadedTexture);changed();
  },undefined,()=>{if(disposed)return;failed++;changed();});
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,anisotropy);textures.add(texture);return texture;
 }
 const metal=material(new T.MeshStandardMaterial({color:0x79828a,roughness:.48,metalness:.78}));
 const dark=material(new T.MeshStandardMaterial({color:0x111719,roughness:.6,metalness:.55}));
 const brass=material(new T.MeshStandardMaterial({color:0x5e4f34,roughness:.45,metalness:.76}));
 const white=material(new T.MeshStandardMaterial({color:0xf3f0e7,roughness:.93,metalness:0,emissive:0x363630,emissiveIntensity:.12}));
 const glass=material(new T.MeshPhysicalMaterial({color:0xb9e4d7,transparent:true,opacity:.10,roughness:.12,depthWrite:false}));
 const stickerMap=load('/assets/gallery/higher.svg');
 const stickerMaterial=material(new T.MeshStandardMaterial({map:stickerMap,color:0xffffff,transparent:true,alphaTest:.12,roughness:.65,metalness:0,emissive:0xffffff,emissiveMap:stickerMap,emissiveIntensity:.16}));
 const plane=geometry(new T.PlaneGeometry(1,1)),box=geometry(new T.BoxGeometry(1,1,1));
 const screwGeometry=geometry(new T.CylinderGeometry(.009,.009,.004,mobile?8:12));screwGeometry.rotateX(Math.PI/2);
 function mesh(group,g,m,p,name,scale=null){const o=new T.Mesh(g,m);o.position.set(...p);if(scale)o.scale.set(...scale);o.name=name;o.castShadow=true;o.receiveShadow=true;group.add(o);return o;}
 function block(group,m,p,size,name){return mesh(group,box,m,p,name,size);}
 function outline(kind,w,height=w){
  const shape=new T.Shape();
  if(kind==='circle'){shape.absarc(0,0,w*.46,0,Math.PI*2,false);return shape;}
  if(kind==='triangle'){shape.moveTo(0,w*.46);shape.lineTo(-w*.46,-w*.40);shape.lineTo(w*.46,-w*.40);shape.closePath();return shape;}
  if(kind==='square'){
   const b=w/2,h=height/2,c=Math.min(w,height)*.03;shape.moveTo(-b+c,-h);shape.lineTo(b-c,-h);shape.quadraticCurveTo(b,-h,b,-h+c);shape.lineTo(b,h-c);shape.quadraticCurveTo(b,h,b-c,h);shape.lineTo(-b+c,h);shape.quadraticCurveTo(-b,h,-b,h-c);shape.lineTo(-b,-h+c);shape.quadraticCurveTo(-b,-h,-b+c,-h);return shape;
  }
  for(let n=0;n<8;n++){const a=Math.PI/8+n*Math.PI/4,p=[Math.cos(a)*w*.48,Math.sin(a)*w*.48];if(!n)shape.moveTo(...p);else shape.lineTo(...p);}shape.closePath();return shape;
 }
 function extrude(shape,depth=.018){return geometry(new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,curveSegments:mobile?24:40}));}
 const stickerGeometry=geometry(new T.PlaneGeometry(1,1,8,2)),sp=stickerGeometry.attributes.position;
 for(let i=0;i<sp.count;i++){const u=sp.getX(i)+.5,v=.5-sp.getY(i);sp.setZ(i,.001*Math.pow(Math.max(0,(u+v-1.55)/.45),2));}stickerGeometry.computeVertexNormals();
 let sharedSignal=null,greenLens=null,redLens=null;
 function streetPost(group,sign,mark,{x=0,radius=.045,name='Full-height galvanized street post — '+sign.id,z=-.055}={}){
  const ground=-.09,top=sign.position[1]+sign.width*.32,height=top-ground;
  const post=mesh(group,geometry(new T.CylinderGeometry(radius,radius,height,mobile?10:16)),metal,[x,(ground+top)/2-sign.position[1],z],name);post.userData.streetPost=true;
  mesh(group,geometry(new T.CylinderGeometry(radius>.06?.19:.12,radius>.06?.19:.12,.04,mobile?10:16)),metal,[x,ground+.02-sign.position[1],z],'Anchored street-post foot — '+sign.id);
  return post;
 }
 for(const sign of signs){
  const presentation=sign.presentation||'road-sign',group=new T.Group();group.name='Lisbon street sign — '+sign.title;group.position.set(...sign.position);group.rotation.set(sign.rotationX||0,sign.rotationY||0,0);
  if(sign.normal)group.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...sign.normal));
  group.userData={lisbonStreetSign:true,signId:sign.id,title:sign.title,phrase:sign.phrase,presentation,mount:sign.mount,zone:sign.zone,wallMounted:['stone','plaque','building','shell'].includes(sign.mount),support:sign.mount==='ground'?'ground':sign.mount==='stone'?'stone':sign.mount,animated:presentation==='pharmacy'||presentation.startsWith('pedestrian-')};root.add(group);
  const data={kind:'lisbon-street-sign',id:sign.id,signId:sign.id,title:sign.title,phrase:sign.phrase,presentation,href:'/play_lisbon_street?sign='+encodeURIComponent(sign.id),methodHref:'/get_higher'};
  const mark=o=>{o.userData={...o.userData,...data};pickables.push(o);return o;};
  let emblem=null;
  const image=load(sign.src,texture=>{
   if(!emblem)return;
   const previous=emblem.geometry;emblem.geometry=geometry(createEmblemReliefGeometry(texture.image,{width:sign.width,depth:sign.depth||.12,mobile}));geometries.delete(previous);previous.dispose();group.userData.reliefReady=!emblem.geometry.userData.fallback;
  });
  const faceMaterial=material(new T.MeshStandardMaterial({map:image,color:0xffffff,transparent:true,alphaTest:.08,roughness:.6,metalness:.08,emissive:0xffffff,emissiveMap:image,emissiveIntensity:.12}));
  function face(width=sign.width,p=[0,0,.024],name='Original Lisbon sign — '+sign.id,parentGroup=group){return mark(mesh(parentGroup,plane,faceMaterial,p,name,[width,width,1]));}
  function sticker({width=Math.min(.24,sign.width*.22),x=sign.width*.25,y=-sign.width*.27,z=.032,parentGroup=group}={}){
   const o=mark(mesh(parentGroup,stickerGeometry,stickerMaterial,[x,y,z],'Higher sticker — '+sign.id,[width,width/3,1]));o.rotation.z=sign.stickerAngle||0;o.castShadow=false;o.userData={...o.userData,sticker:true,physicalWidth:width};return o;
  }
  function fixings(width=sign.width,z=.026){for(const y of [-width*.31,width*.31])mark(mesh(group,screwGeometry,metal,[0,y,z],'Small sign fixing — '+sign.id));}
  if(presentation==='ground-helipad'){
   const paint=face(sign.width,[0,0,.001],'Helipad ground marking');paint.castShadow=false;paint.userData.groundMarking=true;
   sticker({width:.35,x:sign.width*.28,y:-sign.width*.26,z:.004});
  }else if(presentation==='ground-crosswalk'){
   const depth=sign.depth||4,count=5,stride=depth/count,barDepth=stride*.57;
   for(let n=0;n<count;n++){const stripe=mark(mesh(group,plane,white,[0,(n-(count-1)/2)*stride,.001],'Crosswalk painted stripe — '+n,[sign.width,barDepth,1]));stripe.castShadow=false;stripe.userData.groundMarking=true;}
   sticker({width:.27,x:sign.width/2+.20,y:-depth*.36,z:.004});
  }else if(presentation==='motorway-sign'){
   const offsets=sign.postOffsets||[-sign.width*.38,sign.width*.38];
   offsets.forEach((x,n)=>streetPost(group,sign,mark,{x,radius:.095,z:sign.postDepth??-.20,name:'Motorway galvanized support — '+n}));
   mark(block(group,metal,[0,0,-.035],[sign.width,sign.height||sign.width*.60,.10],'Large motorway direction board'));
   face();sticker({width:.28,x:sign.width*.37,y:-sign.width*.215,z:.032});
  }else if(presentation==='hotel-plaque'){
   mark(block(group,brass,[0,0,0],[sign.width*.9,sign.width*.9,.045],'Hotel five-star entrance plaque'));
   face(sign.width,[0,0,.028]);sticker({width:.10,x:sign.width*.24,y:-sign.width*.31,z:.035});
   fixings(sign.width,.036);
  }else if(presentation==='defibrillator'){
   mark(block(group,white,[0,-.12,.07],[sign.width*.70,sign.width*.78,.14],'Wall-mounted defibrillator cabinet'));
   mark(block(group,dark,[0,-.12,.15],[sign.width*.54,sign.width*.62,.025],'AED cabinet gasket'));
   mark(block(group,white,[0,-.15,.17],[sign.width*.35,sign.width*.43,.05],'Defibrillator stored behind glass'));
   const device=material(new T.MeshStandardMaterial({color:0x78ad29,roughness:.65}));block(group,device,[0,-.11,.20],[sign.width*.25,sign.width*.22,.012],'AED green device face');
   mark(block(group,glass,[0,-.12,.23],[sign.width*.64,sign.width*.72,.008],'AED cabinet clear door'));
   face(sign.width,[0,sign.width*.39,.02],'Interior AED direction plaque');sticker({width:.09,x:sign.width*.22,y:-sign.width*.42,z:.241});
  }else if(presentation==='fire-exit'){
   mark(block(group,white,[0,0,-.005],[sign.width*.96,sign.width*.55,.065],'Illuminated emergency exit lightbox'));
   face();sticker({width:.10,x:sign.width*.33,y:-sign.width*.18,z:.032});
  }else if(presentation==='pedestrian-green'||presentation==='pedestrian-red'){
   const diameter=sign.width,green=presentation==='pedestrian-green';
   if(!sharedSignal){
    const signalGroup=new T.Group();signalGroup.position.set(sign.position[0],0,sign.position[2]);signalGroup.rotation.y=sign.rotationY||0;signalGroup.name='Shared pedestrian crossing signal';root.add(signalGroup);sharedSignal=signalGroup;
    const greenSign=signs.find(s=>s.presentation==='pedestrian-green')||sign,redSign=signs.find(s=>s.presentation==='pedestrian-red')||sign;
    const bottom=Math.min(greenSign.position[1],redSign.position[1])-diameter*.66,top=Math.max(greenSign.position[1],redSign.position[1])+diameter*.66,centre=(top+bottom)/2;
    const postHeight=top+.09;
    mesh(signalGroup,geometry(new T.CylinderGeometry(.045,.045,postHeight,mobile?10:16)),metal,[0,postHeight/2-.09,-.15],'Pedestrian crossing shared galvanized pole').userData.streetPost=true;
    mark(block(signalGroup,dark,[0,centre,-.07],[diameter*1.34,top-bottom,.25],'Shared pedestrian signal housing'));
    mesh(signalGroup,geometry(new T.CylinderGeometry(.12,.12,.04,12)),metal,[0,-.07,-.15],'Pedestrian signal anchored base');
   }
   mark(mesh(group,geometry(new T.CylinderGeometry(diameter*.53,diameter*.53,.02,mobile?20:32).rotateX(Math.PI/2)),dark,[0,0,.067],'Pedestrian signal lens rim — '+sign.id));
   const lightFace=face(diameter,[0,0,.081],'Pedestrian signal lens — '+sign.id);lightFace.material=material(faceMaterial.clone());lightFace.material.emissiveIntensity=green?.80:.03;
   if(green)greenLens=lightFace;else redLens=lightFace;
   const visor=block(group,dark,[0,diameter*.55,.12],[diameter*1.14,.045,.23],'Pedestrian lens sun visor — '+sign.id);visor.castShadow=true;
   sticker({width:.09,x:diameter*.42,y:-diameter*.51,z:.085});
  }else if(presentation==='building-emblem'){
   const side=material(new T.MeshStandardMaterial({color:0xc7c9bc,roughness:.45,metalness:.65}));
   emblem=mark(mesh(group,geometry(createEmblemReliefGeometry(null,{width:sign.width,depth:sign.depth||.12,mobile})),[faceMaterial,side],[0,0,0],'Lisbon municipal emblem relief'));
   group.userData.reliefReady=false;sticker({width:.14,x:sign.width*.08,y:-sign.width*.34,z:(sign.depth||.12)+.006});
  }else if(presentation==='pharmacy'){
   const w=sign.width,arm=w*.18,h=w/2,shape=new T.Shape();
   shape.moveTo(-arm,h);shape.lineTo(arm,h);shape.lineTo(arm,arm);shape.lineTo(h,arm);shape.lineTo(h,-arm);shape.lineTo(arm,-arm);shape.lineTo(arm,-h);shape.lineTo(-arm,-h);shape.lineTo(-arm,-arm);shape.lineTo(-h,-arm);shape.lineTo(-h,arm);shape.lineTo(-arm,arm);shape.closePath();
   const luminous=material(new T.MeshStandardMaterial({color:0x62b830,roughness:.35,metalness:.3,emissive:0x2aca1c,emissiveIntensity:.65}));
   const cross=mark(mesh(group,extrude(shape,sign.depth||.26),luminous,[0,0,0],'Pharmacy illuminated cross body'));
   cross.userData.volumetricCross=true;const bracket=sign.bracketDepth||.32;mark(block(group,metal,[0,0,-bracket/2],[.075,.08,bracket],'Pharmacy projecting wall bracket'));
   const front=face(w,[0,0,(sign.depth||.26)+.006],'Pharmacy authored cross face');front.material=material(faceMaterial.clone());front.material.emissiveIntensity=.5;
   const back=face(w,[0,0,-.008],'Pharmacy authored cross reverse');back.rotation.y=Math.PI;back.material=front.material;
   const ledMaterial=material(new T.MeshBasicMaterial({color:0x83ff65,toneMapped:false}));ledMaterial.name='Pharmacy animated LED field';
   const dots=[];for(let iy=-5;iy<=5;iy++)for(let ix=-5;ix<=5;ix++)if(Math.abs(ix)<=1||Math.abs(iy)<=1)dots.push([ix*w/13,iy*w/13]);
   const dotGeometry=geometry(new T.CircleGeometry(w*.012,mobile?5:7)),leds=new T.InstancedMesh(dotGeometry,ledMaterial,dots.length),tr=new T.Object3D();leds.name='Pharmacy animated green LED matrix';leds.userData.animatedPharmacy=true;group.add(leds);instances.add(leds);
   dots.forEach(([x,y],n)=>{tr.position.set(x,y,(sign.depth||.26)+.013);tr.updateMatrix();leds.setMatrixAt(n,tr.matrix);});leds.instanceMatrix.needsUpdate=true;
   animations.push({kind:'pharmacy',luminous,front:front.material,leds,dots,transform:tr,depth:sign.depth||.26});
   sticker({width:.16,x:w*.25,y:-w*.07,z:(sign.depth||.26)+.019});
  }else{
   if(sign.mount==='post')streetPost(group,sign,mark);
   for(const y of [-sign.width*.23,sign.width*.23])mesh(group,box,dark,[0,y,-.035],(sign.mount==='post'?'Galvanized mounting clamp — ':'Recessed stone fixing — ')+sign.id,[.08,.045,.07]);
   const plateWidth=sign.width*(sign.plateWidth||.88),plateHeight=sign.width*(sign.plateHeight||sign.plateWidth||.88);
   mark(mesh(group,extrude(outline(sign.shape,sign.shape==='square'?plateWidth:sign.width,plateHeight)),metal,[0,0,0],'Thin aluminium road-sign plate — '+sign.id));
   face();sticker({x:sign.shape==='triangle'?sign.width*.12:sign.width*.25,y:sign.width*(sign.shape==='triangle'?-.30:-.27)});fixings();
  }
 }
 function countPosts(){let count=0;root.traverse(o=>{if(o.userData.streetPost)count++;});return count;}
 return {root,pickables,
  update(dt,eye,motion=true){
   if(disposed||!motion)return false;time+=Math.max(0,Math.min(Number(dt)||0,.1));if(time-lastAnimation<1/(mobile?12:18))return false;lastAnimation=time;
   for(const a of animations){
    const wave=.5+.5*Math.sin(time*2.8);a.luminous.emissiveIntensity=.5+wave*.45;a.front.emissiveIntensity=.4+wave*.4;
    a.dots.forEach(([x,y],n)=>{const active=Math.sin(time*3.3-(Math.abs(x)+Math.abs(y))*7)>.1;a.transform.position.set(x,y,a.depth+.013);a.transform.scale.setScalar(active?1:.18);a.transform.updateMatrix();a.leds.setMatrixAt(n,a.transform.matrix);});a.leds.instanceMatrix.needsUpdate=true;
   }
   if(greenLens&&redLens){const green=Math.floor(time/7)%2===0;greenLens.material.emissiveIntensity=green?.85:.025;redLens.material.emissiveIntensity=green?.025:.85;greenLens.material.color.setScalar(green?1:.23);redLens.material.color.setScalar(green?.23:1);}
   return animations.length>0||!!greenLens;
  },
  diagnostics:()=>({count:signs.length,loaded,expectedTextures:signs.length+1,failed,ready:loaded===signs.length+1,originalSigns:true,sticker:'/assets/gallery/higher.svg',stickerRatio:3,stickerMaximumWidth:.35,outside:signs.filter(s=>s.zone==='outside').length,inside:signs.filter(s=>s.zone==='inside').length,posts:countPosts(),fullSize:true,semanticObjects:true,pharmacyAnimated:animations.length>0,pedestrianPair:!!greenLens&&!!redLens,positions:signs.map(s=>({id:s.id,position:[...s.position],rotationY:s.rotationY,zone:s.zone,mount:s.mount,width:s.width,presentation:s.presentation})),experience:'/play_lisbon_street',method:'/get_higher',disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const mesh of instances)mesh.dispose();root.clear();}
 };
}
