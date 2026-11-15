import * as T from './vendor/three-0.180.0.mjs';
import {ORIGINS} from './gallery-artworks.mjs';
import {createBlackHolePortal,ORIGIN_PORTAL} from './gallery-black-hole.mjs';
import {INTENTIONS} from './gallery-lisbon-dome-layout.mjs';
import {createLecternBook} from './gallery-lectern-book.mjs';

const frozen=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;};
export const ORIGINS_VESSEL_LAYOUT=frozen({
 saucer:[0,20,-4.2],radius:10.2,floorY:20,
 corridor:{startZ:-6.4,endZ:-32.8,width:4.6,height:4.8},
 chamber:{center:[0,20,-43],radius:10.5,wallHeight:9},
 bookPosition:[0,21.34,-43],bookApproach:[0,21.65,-39],
 outbound:[[0,1.65,13],[0,8.5,11],[0,15.8,5.5],[0,16,-4.2],[0,21.65,-4.2],[0,21.65,-16],[0,21.65,-28],[0,21.65,-35.5],[0,21.65,-39]],
 targets:[[0,20,-4.2],[0,20,-4.2],[0,19,-4.2],[.3,22.2,-4.7],[0,21.8,-14],[0,22,-35],[0,22,-43],[0,21.7,-43],[0,21.34,-43]],
 return:[[0,21.65,-39],[0,21.65,-28],[0,21.65,-16],[0,21.65,-5],[0,21.65,-4.2],[0,16,-4.2],[0,15.8,5.5],[0,8.5,11],[0,1.65,13]],
 returnTargets:[[0,21.8,-28],[0,21.8,-16],[0,21.8,-5],[0,21.8,-4.2],[.2,16,-4.1],[0,10,-4.2],[0,6,12],[0,3,4],[0,4.2,-3.5]]
});
const L=ORIGINS_VESSEL_LAYOUT;

// One continuous, world-space destination: the saucer is the boarding point,
// the transparent corridor stays open to the ocean, and Origins occupies a
// genuinely enclosed chamber. The caller supplies the camera journey.
export function createOriginsVessel(scene,{mobile=false,onChange=()=>{},onOpen=()=>{},transitOnly=false,bookOnly=false}={}){
 const root=new T.Group();root.name='ORIGINS — vessel, glass corridor and closed chamber';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),pickables=[],solids=[],lights=[];
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 let disposed=false,dirty=true,loadedWorks=0,failedWorks=0,time=0,updates=0;
 const changed=()=>{if(!disposed){dirty=true;onChange();}};
 const black=material(new T.MeshPhysicalMaterial({color:0x000000,roughness:.48,metalness:.42,clearcoat:.25,side:T.DoubleSide}));
 black.name='Origins — raw black architecture';
 const silver=material(new T.MeshPhysicalMaterial({color:0x767f83,roughness:.4,metalness:.9,clearcoat:.3,clearcoatRoughness:.2,side:T.DoubleSide}));
 silver.name='Origins — brushed metallic saucer hull';
 const canopy=material(silver.clone());canopy.side=T.FrontSide;canopy.name='Origins — closed metallic canopy, outward surface';
 const hullLight=new T.SpotLight(0xc8ddf2,420,55,.9,.9,2);hullLight.position.set(0,10,12);hullLight.target.position.set(0,20,-4.2);root.add(hullLight,hullLight.target);lights.push(hullLight);
 const glass=material(new T.MeshPhysicalMaterial({color:0x344958,roughness:.035,metalness:.08,transparent:true,opacity:.07,depthWrite:false,side:T.DoubleSide,envMapIntensity:1.2,clearcoat:1}));
 glass.name='Origins — transparent smoked glass';
 const white=material(new T.MeshBasicMaterial({color:0xc1d5e4,toneMapped:false}));
 const focus=material(new T.MeshBasicMaterial({color:0x378add,toneMapped:false}));
 const box=geometry(new T.BoxGeometry(1,1,1)),plane=geometry(new T.PlaneGeometry(1,1));
 function mesh(parent,g,m,position,name,solid=false,scale=null){const object=new T.Mesh(g,m);object.position.set(...position);if(scale)object.scale.set(...scale);object.name=name;object.castShadow=!m.transparent;object.receiveShadow=true;parent.add(object);if(solid)solids.push(object);return object;}
 const block=(parent,m,p,size,name,solid=false)=>mesh(parent,box,m,p,name,solid,size);
 const pick=(object,kind,data={})=>{object.userData={...object.userData,kind,...data};pickables.push(object);return object;};
 function path(parent,points,radius,m,name){return mesh(parent,geometry(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),mobile?48:80,radius,5,false)),m,[0,0,0],name);}
 function ring(parent,radius,tube,y,z,m,name){const object=mesh(parent,geometry(new T.TorusGeometry(radius,tube,6,mobile?64:96)),m,[0,y,z],name);object.rotation.x=-Math.PI/2;return object;}
 function label(parent,value,p,width,height,{color='#d4dbe1',rotationY=0}={}){
  if(!globalThis.document?.createElement)return null;
  const canvas=document.createElement('canvas');canvas.width=mobile?512:1024;canvas.height=Math.max(32,Math.round(canvas.width*height/width));
  const context=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.add(texture);
  const ink=material(new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));
  const object=mesh(parent,plane,ink,p,value,false,[width,height,1]);object.rotation.y=rotationY;object.castShadow=false;
  function draw(){if(disposed)return;context.clearRect(0,0,canvas.width,canvas.height);context.fillStyle=color;context.textAlign='center';context.textBaseline='middle';context.font='400 '+Math.floor(canvas.height*.62)+'px "Space Mono",monospace';context.fillText(value,canvas.width/2,canvas.height/2,canvas.width);texture.needsUpdate=true;changed();}
  draw();document.fonts?.ready?.then(draw);return object;
 }
 // Closed rotational hull: no removed wedge or central opening.
 const saucer=new T.Group();saucer.name='ORIGINS — hovering saucer';saucer.position.set(...L.saucer);root.add(saucer);
 const profile=[[0,.72],[1.9,.78],[3.6,.72],[5.4,.57],[7.8,.30],[9.85,.08],[10.2,0],[9.9,-.15],[7.4,-.50],[5,-.80],[2.7,-.96],[0,-1.02]].map(p=>new T.Vector2(...p));
 const hull=pick(mesh(saucer,geometry(new T.LatheGeometry(profile,mobile?96:144)),silver,[0,0,0],'Origins metallic disk — continuous closed hull',true),'origins-vessel',{action:'board',href:'/origin'});
 hull.userData.saucerHull=true;
 const cupola=pick(mesh(saucer,geometry(new T.SphereGeometry(3,mobile?48:72,24,0,Math.PI*2,0,Math.PI/2)),canopy,[0,.62,0],'Origins closed metallic cupola',false,[1,.48,1]),'origins-vessel',{action:'board'});
 ring(saucer,2.96,.016,.83,0,black,'Saucer fine canopy seam');
 ring(saucer,9.92,.027,.025,0,white,'Saucer fine metallic edge highlight');
 const deck=mesh(saucer,geometry(new T.CircleGeometry(2.95,mobile?64:96)),black,[0,.80,0],'Saucer continuous black cabin floor',true);deck.rotation.x=-Math.PI/2;
 pick(mesh(saucer,geometry(new T.CylinderGeometry(2.7,2.7,.06,mobile?64:96)),silver,[0,-1.045,0],'Saucer sealed underside engine cover',true),'origins-vessel',{action:'board',href:'/origin'});
 ring(saucer,3.12,.025,-.99,0,focus,'Saucer sealed engine fine blue seam');
 for(const [r,y] of [[4.7,-.84],[7.4,-.51],[9.9,-.16]])ring(saucer,r,.012,y,0,black,'Saucer restrained engraved hull seam');
 const dots=new T.InstancedMesh(geometry(new T.CircleGeometry(.035,8)),focus,48),transform=new T.Object3D();dots.name='Saucer underside — forty-eight small landing lights';
 for(let i=0;i<48;i++){const a=i/48*Math.PI*2;transform.position.set(Math.sin(a)*3.35,-.95,Math.cos(a)*3.35);transform.rotation.x=Math.PI/2;transform.updateMatrix();dots.setMatrixAt(i,transform.matrix);}dots.instanceMatrix.needsUpdate=true;saucer.add(dots);
 const beamMaterial=material(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,
  uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float uTime;varying vec2 vUv;void main(){float ends=smoothstep(0.,.15,vUv.y)*(1.-smoothstep(.86,1.,vUv.y));float flutes=.65+.35*pow(.5+.5*cos(vUv.x*6.2831853*24.+uTime*.14),5.);float a=.035*ends*flutes;gl_FragColor=vec4(.24,.55,.88,a);}'
 }));
 mesh(root,geometry(new T.CylinderGeometry(2.7,4.2,8.2,mobile?32:48,1,true)),beamMaterial,[0,14.6,-4.2],'Saucer translucent blue boarding light');
 if(transitOnly){
  const portal=createBlackHolePortal(root),shipHome=new T.Vector3(...L.saucer);let flying=false;
  const cabin=new T.PointLight(0xc7dcff,12,7,2);cabin.position.set(0,1.9,0);saucer.add(cabin);lights.push(cabin);
  const book={pickables:[],open:()=>false,reset(){},update:()=>false,diagnostics:()=>({closed:true,opening:false,opened:false,absent:true})};
  return{root,pickables,solids,book,journey:{...L,outbound:[[0,1.65,13],[0,8.5,11],[0,15.8,7.5],[0,22,7.5],[0,21.65,-4.2],[0,30,-8],[0,61,-35],[0,94,-65],[0,118,-89.7]]},
   setFlight(eye){if(!flying&&(eye.y<21.7||eye.z>-4.25))return;flying=true;saucer.position.set(eye.x,eye.y-1.65,eye.z);beamMaterial.opacity=0;beamMaterial.visible=false;},
   setReturnFlight(eye){if(eye.y>=21.64&&eye.z<=-4.19){flying=true;saucer.position.set(eye.x,eye.y-1.65,eye.z);beamMaterial.visible=false;}else{flying=false;saucer.position.copy(shipHome);beamMaterial.visible=true;}},
   resetFlight(){flying=false;saucer.position.copy(shipHome);beamMaterial.visible=true;},
   update(dt,eye,motion=true){if(disposed)return false;if(motion){time+=Math.max(0,Math.min(Number(dt)||0,.1));beamMaterial.uniforms.uTime.value=time;}portal.update(dt,eye,motion);const result=dirty||motion;dirty=false;return result;},
   diagnostics:()=>({kind:'origins-saucer-black-hole-transit',saucer:true,closedHull:true,closedUnderside:true,openShaft:false,flying,saucerPosition:saucer.position.toArray(),corridorInIsland:false,bookInIsland:false,originalWorks:0,blackHole:portal.diagnostics(),destination:ORIGIN_PORTAL.href}),
   dispose(){if(disposed)return;disposed=true;portal.dispose();root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();for(const light of lights)light.dispose?.();dots.dispose();root.clear();}
  };
 }
 // The corridor is a glass sleeve around an open volume, rather than an
 // extruded transparent block. Its floor also lets the ocean show through.
 const corridor=new T.Group();corridor.name='ORIGINS — transparent dark glass corridor';root.add(corridor);
 const section=[[-2.3,20],[-2.3,22.5]];
 for(let i=1;i<=32;i++){const a=Math.PI-i/32*Math.PI;section.push([Math.cos(a)*2.3,22.5+Math.sin(a)*2.3]);}
 section.push([2.3,20]);
 const c=bookOnly?{...L.corridor,startZ:L.saucer[2]-L.radius-.12}:L.corridor,positions=[],indices=[];
 for(let i=0;i<section.length;i++){const [x,y]=section[i];positions.push(x,y,c.startZ,x,y,c.endZ);if(i<section.length-1){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
 const sleeveGeometry=geometry(new T.BufferGeometry());sleeveGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));sleeveGeometry.setIndex(indices);sleeveGeometry.computeVertexNormals();sleeveGeometry.computeBoundingSphere();
 mesh(corridor,sleeveGeometry,glass,[0,0,0],'Origins corridor — transparent side and vaulted roof');
 for(let panel=0;panel<3;panel++){const length=Math.abs(c.endZ-c.startZ)/3,z=c.startZ-(panel+.5)*length;block(corridor,glass,[0,19.98,z],[4.6,.06,length-.012],'Origins corridor — transparent smoked glass floor '+(panel+1));}
 for(const x of [-2.24,2.24])block(corridor,black,[x,19.93,(c.startZ+c.endZ)/2],[.12,.2,Math.abs(c.endZ-c.startZ)],'Origins corridor black structural sill',true);
 for(let n=0;n<7;n++){
  const z=c.startZ+(c.endZ-c.startZ)*n/6;
  path(corridor,section.map(([x,y])=>[x,y,z]),.037,black,'Origins corridor black portal rib');
 }
 INTENTIONS.forEach((intent,n)=>{
  const ink=material(new T.MeshBasicMaterial({color:intent.color,toneMapped:false})),x=(n-3)*.20;
  block(corridor,ink,[x,20.025,(c.startZ+c.endZ)/2],[.014,.007,Math.abs(c.endZ-c.startZ)],'Origins corridor floor intention — '+intent.label).userData.intention=intent.id;
  const roof=22.5+Math.sqrt(2.3**2-x*x)-.055;
  block(corridor,ink,[x,roof,(c.startZ+c.endZ)/2],[.012,.009,Math.abs(c.endZ-c.startZ)],'Origins corridor roof intention — '+intent.label).userData.intention=intent.id;
 });
 // A closed ceremonial room at the far end. Its wall is physically absent
 // only at the transparent corridor's doorway; the ceiling is continuous.
 const chamber=new T.Group();chamber.name='ORIGINS — enclosed chamber';root.add(chamber);
 const centerZ=L.chamber.center[2],radius=L.chamber.radius,opening=Math.asin(2.3/radius);
 const floor=mesh(chamber,geometry(new T.CircleGeometry(radius,mobile?96:144)),black,[0,20,centerZ],'Origins chamber closed black floor',true);floor.rotation.x=-Math.PI/2;
 mesh(chamber,geometry(new T.CylinderGeometry(radius,radius,4.8,mobile?96:144,1,true,opening,Math.PI*2-opening*2)),black,[0,22.4,centerZ],'Origins chamber wall — real corridor doorway',true);
 mesh(chamber,geometry(new T.CylinderGeometry(radius,radius,4.2,mobile?96:144,1,true)),black,[0,26.9,centerZ],'Origins chamber continuous upper wall',true);
 const ceiling=mesh(chamber,geometry(new T.SphereGeometry(radius,mobile?64:96,32,0,Math.PI*2,0,Math.PI/2)),black,[0,29,centerZ],'ORIGINS — closed chamber ceiling',true,[1,.36,1]);ceiling.userData.closedCeiling=true;
 ring(chamber,radius-.06,.018,20.06,centerZ,white,'Origins chamber quiet floor perimeter');
 ring(chamber,radius-.04,.02,28.94,centerZ,white,'Origins chamber crown perimeter');
 for(const x of [-2.3,2.3])block(chamber,black,[x,22.4,centerZ+Math.sqrt(radius*radius-x*x)],[.12,4.8,.16],'Origins chamber entrance jamb',true);
 if(!bookOnly)label(chamber,'ORIGINS',[0,26.5,centerZ-radius+.07],5.4,.52);
 INTENTIONS.forEach((intent,n)=>{
  const ink=material(new T.MeshBasicMaterial({color:intent.color,toneMapped:false})),a=(-140+n*46)*Math.PI/180;
  path(chamber,[[0,20.025,centerZ],[(radius-.1)*Math.sin(a),20.025,centerZ+(radius-.1)*Math.cos(a)]],.012,ink,'Origins chamber floor intention — '+intent.label).userData.intention=intent.id;
 });
 // Physical edition book at the terminus, isolated by a low circular dais.
 for(const [r,h,y] of [[2.7,.10,20.05],[2.15,.14,20.15],[1.6,.1,20.27]])mesh(chamber,geometry(new T.CylinderGeometry(r,r,h,mobile?64:96)),black,[0,y,centerZ],'Origins ceremonial concentric dais',true);
 const plinth=block(chamber,black,[0,20.74,centerZ],[.78,1.0,.78],'ORIGINS — ceremonial book plinth',true);
 const slab=block(chamber,bookOnly?black:silver,[0,21.22,centerZ],[1.2,.10,1.1],'Origins ceremonial reading slab',true);slab.rotation.x=Math.PI/10;
 ring(chamber,2.69,.012,20.11,centerZ,white,'Origins book dais fine highlight');
 const book=createLecternBook(chamber,{mobile,onChange:changed,onOpen,layout:{origins:{book:L.bookPosition}}});
 for(const object of book.pickables){object.userData={...object.userData,kind:'origins-vessel-book',href:'/origins?open=1'};pickables.push(object);}
 const artWidth=1.85;
 (bookOnly?[]:ORIGINS).forEach((work,n)=>{
  const a=opening+.10+(Math.PI*2-opening*2-.2)*(n+.5)/ORIGINS.length,r=radius-.18,x=Math.sin(a)*r,z=centerZ+Math.cos(a)*r,group=new T.Group();
  group.name='Origins chamber work — '+work.title;group.position.set(x,24.25,z);group.rotation.y=a+Math.PI;chamber.add(group);
  const artHeight=artWidth/work.aspect;
  block(group,black,[0,0,-.055],[artWidth+.08,artHeight+.08,.10],'Origins slim black frame — '+work.id,true);
  let map=null;if(globalThis.document?.createElementNS){map=new T.TextureLoader().load(work.src,loaded=>{if(disposed)return;const image=loaded.image,maxWidth=mobile?256:512;if(image.width>maxWidth){const canvas=document.createElement('canvas');canvas.width=maxWidth;canvas.height=Math.round(maxWidth*image.height/image.width);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);loaded.image=canvas;loaded.needsUpdate=true;}loadedWorks++;changed();},undefined,()=>{if(disposed)return;failedWorks++;changed();});map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;textures.add(map);}
  const image=material(new T.MeshBasicMaterial({map,color:map?0xffffff:0x333366,toneMapped:false}));
  const face=pick(mesh(group,plane,image,[0,0,.006],'Original Origins artwork — '+work.id,false,[artWidth,artHeight,1]),'origins-vessel-work',{workId:work.id,index:work.index,title:work.title,href:'/origins?work='+work.index,media:work.media});
  face.userData.originalOrigins=true;
  label(group,work.title,[0,-artHeight/2-.24,.015],artWidth,.18);
 });
 // Return is part of the room, alongside the caller's accessible UI control.
 const returnPlate=pick(block(chamber,black,[0,21.35,centerZ+radius-.15],[2.2,.62,.08],'Origins return portal'),'origins-vessel-return',{action:'return',href:'/lisbon-space'});
 const returnLabel=label(chamber,'RETURN TO THE SAUCER',[0,21.35,centerZ+radius-.20],2.05,.22,{rotationY:Math.PI});
 if(returnLabel)pick(returnLabel,'origins-vessel-return',{action:'return',href:'/lisbon-space'});
 for(const [p,target,power] of [[[0,27,-40],[0,21,-43],150],[[-6,26,-39],[0,21,-43],70],[[6,26,-47],[0,21,-43],70]]){
  const light=new T.SpotLight(bookOnly?0xffe7c2:0xd7e5ef,bookOnly?(power===150?230:8):power,24,bookOnly?.23:.65,.8,2);light.position.set(...p);light.target.position.set(...target);chamber.add(light,light.target);lights.push(light);
 }
 const ambient=new T.PointLight(0xb8c9dd,bookOnly?4:25,25,2);ambient.position.set(0,26,-43);chamber.add(ambient);lights.push(ambient);
 changed();
 let returnFlying=false;
 return{root,pickables,solids,book,journey:L,
  setFlight(eye){returnFlying=true;saucer.position.set(eye.x-root.position.x,eye.y-root.position.y-1.65,eye.z-root.position.z);beamMaterial.visible=false;changed();},
  resetFlight(){returnFlying=false;saucer.position.set(...L.saucer);beamMaterial.visible=true;changed();},
  update(dt,eye,motion=true){if(disposed)return false;const step=Math.max(0,Math.min(Number(dt)||0,.1));if(motion){time+=step;updates++;beamMaterial.uniforms.uTime.value=time;}const bookChanged=book.update(dt,eye,motion),result=dirty||bookChanged||!!(motion&&step>0);dirty=false;return result;},
  diagnostics:()=>({kind:'origins-flying-saucer-destination',ready:!disposed,saucer:true,saucerRadius:L.radius,saucerPosition:saucer.getWorldPosition(new T.Vector3()).toArray(),flying:returnFlying,parked:!returnFlying,metallicDisk:true,closedCanopy:true,blueBeam:true,corridor:{transparent:true,blackFrames:true,glassFloor:true,intentions:7,roofIntentions:7,startZ:c.startZ,endZ:c.endZ,floorY:L.floorY,width:c.width,height:c.height},chamber:{closed:true,realDoorway:true,closedCeiling:true,center:[...L.chamber.center],radius,wallHeight:L.chamber.wallHeight,originalWorks:bookOnly?0:ORIGINS.length,loadedWorks,failedWorks,bookPosition:[...L.bookPosition],bookApproach:[...L.bookApproach]},book:book.diagnostics(),cameraJourney:true,bodyPhysicsRequired:false,originalMedia:true,workTextureMaximumWidth:mobile?256:512,updates,time,disposed}),
  dispose(){if(disposed)return;disposed=true;book.dispose();root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();for(const light of lights)light.dispose?.();dots.dispose();root.clear();}
 };
}
