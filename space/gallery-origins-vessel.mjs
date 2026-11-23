import {LISBON_PROJECTOR_PORTS} from './gallery-lisbon-projector.mjs';
import * as T from './vendor/three-0.180.0.mjs';
import {ORIGINS} from './gallery-artworks.mjs';
import {createBlackHolePortal,ORIGIN_PORTAL} from './gallery-black-hole.mjs';
import {createLecternBook} from './gallery-lectern-book.mjs';

const frozen=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;};
export const ORIGINS_VESSEL_LAYOUT=frozen({
 saucer:[0,20,-4.2],radius:10.2,floorY:20,
 walkway:[[-13.9,1.45,20.11],[-15.3,1.8,20],[-31.8,1.8,20],[-36.6,2.1,20]],
 stairs:[[-36.54,-37.14,20.18],[-37.14,-37.74,20.36],[-37.74,-38.34,20.54],[-38.34,-39.55,20.72]],
 platform:{centerZ:-43,radius:4.65,height:20.72},

 chamber:{center:[0,20,-43],radius:10.5,wallHeight:9},
 bookPosition:[0,22.06,-43],bookApproach:[0,22.37,-40.5],
 outbound:[[0,1.65,13],[0,8.5,11],[0,15.8,5.5],[0,16,-4.2],[0,21.65,-4.2],[0,21.65,-16],[0,21.65,-28],[0,21.65,-35.5],[0,21.65,-39]],
 targets:[[0,20,-4.2],[0,20,-4.2],[0,19,-4.2],[.3,22.2,-4.7],[0,21.8,-14],[0,22,-35],[0,22,-43],[0,21.7,-43],[0,21.34,-43]],
 return:[[0,21.65,-39],[0,21.65,-28],[0,21.65,-16],[0,21.65,-5],[0,21.65,-4.2],[0,16,-4.2],[0,15.8,5.5],[0,8.5,11],[0,1.65,13]],
 returnTargets:[[0,21.8,-28],[0,21.8,-16],[0,21.8,-5],[0,21.8,-4.2],[.2,16,-4.1],[0,10,-4.2],[0,6,12],[0,3,4],[0,4.2,-3.5]]
});
const L=ORIGINS_VESSEL_LAYOUT;

const hullTop=[[0,.72],[1.9,.78],[3.6,.72],[5.4,.57],[7.8,.30],[9.85,.08],[L.radius,0]];
const cabinRadius=2.95,cabinHeight=.80,doorHalfWidth=2.3;
const stairHalfWidth=2.1;
const lerp=T.MathUtils.lerp;

export function originsWalkHeight(x,z){
 const radius=Math.hypot(x-L.saucer[0],z-L.saucer[2]);
 let height=null;
 if(radius<L.radius-.18){
  const upper=hullTop.findIndex(([r],i)=>i>0&&radius<=r),[r0,y0]=hullTop[upper-1],[r1,y1]=hullTop[upper];
  const hullY=lerp(y0,y1,(radius-r0)/(r1-r0));
  height=L.saucer[1]+lerp(cabinHeight,hullY,T.MathUtils.smoothstep(radius,cabinRadius-.08,cabinRadius+.18));
 }
 for(let i=1;i<L.walkway.length;i++){
  const [z0,w0,y0]=L.walkway[i-1],[z1,w1,y1]=L.walkway[i];
  if(z>z0||z<z1)continue;
  const t=(z0-z)/(z0-z1);
  if(Math.abs(x)<lerp(w0,w1,t)-.16)height=Math.max(height??-Infinity,lerp(y0,y1,t));
  break;
 }
 if(Math.abs(x)<stairHalfWidth-.16){
  for(const [front,back,top] of L.stairs)if(z<=front&&z>=back)height=Math.max(height??-Infinity,top);
 }
 const distanceToBook=Math.hypot(x,z-L.platform.centerZ);
 if(distanceToBook<1.05)return null;
 if(distanceToBook<L.platform.radius-.16)height=Math.max(height??-Infinity,L.platform.height);
 return height;
}

// The path climbs to a platform suspended under the same sky as the islands.
export function createOriginsVessel(scene,{mobile=false,onChange=()=>{},onOpen=()=>{},transitOnly=false,bookOnly=false,streetProjection=false}={}){
 const root=new T.Group();root.name='ORIGINS — saucer and walkway to the book';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),pickables=[],solids=[],lights=[];
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 let disposed=false,dirty=true,loadedWorks=0,failedWorks=0,time=0,updates=0;
 const changed=()=>{if(!disposed){dirty=true;onChange();}};
 const black=material(new T.MeshPhysicalMaterial({color:0x000000,roughness:.48,metalness:.42,clearcoat:.25,side:T.DoubleSide}));
 black.name='Origins — raw black architecture';
 const silver=material(new T.MeshPhysicalMaterial({color:0x767f83,roughness:.4,metalness:.9,clearcoat:.3,clearcoatRoughness:.2,side:T.DoubleSide}));
 silver.name='Origins — brushed metallic saucer hull';
 const canopy=material(silver.clone());canopy.side=T.FrontSide;canopy.name='Origins — sliding metallic canopy';
 const hullLight=new T.SpotLight(0xc8ddf2,420,55,.9,.9,2);hullLight.position.set(0,10,12);hullLight.target.position.set(0,20,-4.2);root.add(hullLight,hullLight.target);lights.push(hullLight);
 const white=material(new T.MeshBasicMaterial({color:0xc1d5e4,toneMapped:false}));
 const focus=material(new T.MeshBasicMaterial({color:0x378add,toneMapped:false}));
 const box=geometry(new T.BoxGeometry(1,1,1)),plane=geometry(new T.PlaneGeometry(1,1));
 function mesh(parent,g,m,position,name,solid=false,scale=null){const object=new T.Mesh(g,m);object.position.set(...position);if(scale)object.scale.set(...scale);object.name=name;object.castShadow=!m.transparent;object.receiveShadow=true;parent.add(object);if(solid)solids.push(object);return object;}
 const block=(parent,m,p,size,name,solid=false)=>mesh(parent,box,m,p,name,solid,size);
 const pick=(object,kind,data={})=>{object.userData={...object.userData,kind,...data};pickables.push(object);return object;};
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
 const spinner=new T.Group();spinner.name='Saucer rotating disk';saucer.add(spinner);
 const profile=[...hullTop,[9.9,-.15],[7.4,-.50],[5,-.80],[2.7,-.96],[0,-1.02]].map(p=>new T.Vector2(...p));
 const hull=pick(mesh(spinner,geometry(new T.LatheGeometry(profile,mobile?96:144)),silver,[0,0,0],'Origins metallic disk — continuous closed hull',true),'origins-vessel',{action:'board',href:'/origin'});
 hull.userData.saucerHull=true;
 const canopyCarrier=new T.Group();canopyCarrier.name='Origins sliding canopy carrier';saucer.add(canopyCarrier);
 pick(mesh(canopyCarrier,geometry(new T.SphereGeometry(3,mobile?48:72,24,0,Math.PI*2,0,Math.PI/2)),canopy,[0,.62,0],'Origins metallic cupola',false,[1,.48,1]),'origins-vessel',{action:'board'});
 ring(saucer,2.96,.016,.83,0,black,'Saucer fine canopy seam');
 ring(spinner,9.92,.027,.025,0,white,'Saucer fine metallic edge highlight');
 const deck=mesh(saucer,geometry(new T.CircleGeometry(cabinRadius,mobile?64:96)),black,[0,cabinHeight,0],'Saucer continuous black cabin floor',true);deck.rotation.x=-Math.PI/2;
 pick(mesh(spinner,geometry(new T.CylinderGeometry(2.7,2.7,.06,mobile?64:96)),silver,[0,-1.045,0],'Saucer sealed underside engine cover',true),'origins-vessel',{action:'board',href:'/origin'});
 ring(spinner,3.12,.025,-.99,0,focus,'Saucer sealed engine fine blue seam');
 const streetProjector=streetProjection&&transitOnly?new T.Group():null;
 let projectionLenses=null;
 if(streetProjector){
  streetProjector.name='Lisbon projector — rotating 22-port optic';
  streetProjector.position.y=-1.153;spinner.add(streetProjector);
  const armor=mesh(streetProjector,geometry(new T.CylinderGeometry(1.59,1.44,.10,mobile?32:48)),black,[0,.037,0],'Sealed Lisbon optic housing');
  armor.castShadow=false;
  const rim=ring(streetProjector,1.49,.015,-.013,0,silver,'Machined projector rim');rim.castShadow=false;
  const light=material(new T.MeshBasicMaterial({color:0x667a91,toneMapped:false}));
  const ports=geometry(new T.SphereGeometry(.041,mobile?8:12,8));
  const lenses=new T.InstancedMesh(ports,light,LISBON_PROJECTOR_PORTS.length);
  lenses.name='Twenty-two underside projector ports';
  const lensMatrix=new T.Matrix4();
  LISBON_PROJECTOR_PORTS.forEach(([x,y,z],i)=>lenses.setMatrixAt(i,lensMatrix.makeTranslation(x,y,z)));
  lenses.instanceMatrix.needsUpdate=true;streetProjector.add(lenses);projectionLenses=lenses;
 }
 for(const [r,y] of [[4.7,-.84],[7.4,-.51],[9.9,-.16]])ring(spinner,r,.012,y,0,black,'Saucer restrained engraved hull seam');
 const dots=new T.InstancedMesh(geometry(new T.CircleGeometry(.035,8)),focus,48),transform=new T.Object3D();dots.name='Saucer underside — forty-eight small landing lights';
 for(let i=0;i<48;i++){const a=i/48*Math.PI*2;transform.position.set(Math.sin(a)*3.35,-.95,Math.cos(a)*3.35);transform.rotation.x=Math.PI/2;transform.updateMatrix();dots.setMatrixAt(i,transform.matrix);}dots.instanceMatrix.needsUpdate=true;spinner.add(dots);
 const beamMaterial=material(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,
  uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float uTime;varying vec2 vUv;void main(){float ends=smoothstep(0.,.15,vUv.y)*(1.-smoothstep(.86,1.,vUv.y));float flutes=.65+.35*pow(.5+.5*cos(vUv.x*6.2831853*24.+uTime*.14),5.);float a=.035*ends*flutes;gl_FragColor=vec4(.24,.55,.88,a);}'
 }));
 const segments=new T.InstancedMesh(geometry(new T.BoxGeometry(.19,.024,.095)),white,18);
 segments.name='Rotating machined registrations on the saucer rim';
 for(let n=0;n<18;n++){
  const angle=(n%6)*.038+Math.floor(n/6)*Math.PI*2/3;
  transform.position.set(Math.sin(angle)*9.55,-.205,Math.cos(angle)*9.55);transform.rotation.set(0,angle,0);transform.updateMatrix();segments.setMatrixAt(n,transform.matrix);
 }
 segments.instanceMatrix.needsUpdate=true;spinner.add(segments);
 let canopyRaised=false,canopyTravel=0;
 const shipCenter=new T.Vector3();
 function placeCanopy(amount){
  canopyTravel=amount;
  // Retract perpendicular to both boarding routes and keep the roof below eye level on the deck.
  canopyCarrier.position.set(5.2*amount,.18*Math.sin(Math.PI*amount)-.12*amount,0);
 }
 function updateShip(dt,eye,motion,flying){
  if(motion)spinner.rotation.y=(spinner.rotation.y+dt*.065)%(2*Math.PI);
  saucer.getWorldPosition(shipCenter);
  const distance=transitOnly&&eye.y<10?Math.hypot(eye.x,eye.z-13):Math.hypot(eye.x-shipCenter.x,eye.z-shipCenter.z);
  const approach=transitOnly?(eye.y<10?4.6:14):L.radius+9.2;
  canopyRaised=!flying&&distance<approach+(canopyRaised?1:0);
  const target=canopyRaised?1:0,previous=canopyTravel;
  const travel=motion?T.MathUtils.damp(canopyTravel,target,3.1,dt):target;
  placeCanopy(Math.abs(target-travel)<.002?target:travel);
  return canopyTravel!==previous;
 }
 const canopyState=()=>({openness:canopyTravel,open:canopyTravel>.95,opening:canopyRaised&&canopyTravel<1});
 mesh(root,geometry(new T.CylinderGeometry(2.7,4.2,8.2,mobile?32:48,1,true)),beamMaterial,[0,14.6,-4.2],'Saucer translucent blue boarding light').visible=!transitOnly;
 if(transitOnly){
  const portal=createBlackHolePortal(root),shipHome=new T.Vector3(...L.saucer);let flying=false;
  const cabin=new T.PointLight(0xc7dcff,12,7,2);cabin.position.set(0,1.9,0);saucer.add(cabin);lights.push(cabin);
  const book={pickables:[],open:()=>false,reset(){},update:()=>false,diagnostics:()=>({closed:true,opening:false,opened:false,absent:true})};
  return{root,pickables,solids,book,streetProjector,journey:{...L,outbound:[[0,1.65,13],[0,8.5,11],[0,15.8,7.5],[0,22,7.5],[0,21.65,-4.2],[0,30,-8],[0,61,-35],[0,94,-65],[0,118,-89.7]]},
   setFlight(eye){if(!flying&&(eye.y<21.7||eye.z>-4.25))return;flying=true;saucer.position.set(eye.x,eye.y-1.65,eye.z);beamMaterial.opacity=0;beamMaterial.visible=false;},
   setReturnFlight(eye){if(eye.y>=21.64&&eye.z<=-4.19){flying=true;saucer.position.set(eye.x,eye.y-1.65,eye.z);beamMaterial.visible=false;}else{if(flying)placeCanopy(1);flying=false;saucer.position.copy(shipHome);beamMaterial.visible=true;}},
   resetFlight(){flying=false;saucer.position.copy(shipHome);beamMaterial.visible=true;},
   update(dt,eye,motion=true){if(disposed)return false;const step=Math.max(0,Math.min(Number(dt)||0,.1)),canopyChanged=updateShip(step,eye,motion,flying);if(motion){time+=step;beamMaterial.uniforms.uTime.value=time;}portal.update(dt,eye,motion);const result=dirty||motion||canopyChanged;dirty=false;return result;},
   diagnostics:()=>({kind:'origins-saucer-black-hole-transit',saucer:true,rotation:spinner.rotation.y,canopy:canopyState(),rotationDegreesPerSecond:.065*180/Math.PI,closedHull:true,closedUnderside:true,openShaft:false,flying,saucerPosition:saucer.position.toArray(),corridorInIsland:false,bookInIsland:false,originalWorks:0,blackHole:portal.diagnostics(),destination:ORIGIN_PORTAL.href}),
   dispose(){if(disposed)return;disposed=true;portal.dispose();root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();for(const light of lights)light.dispose?.();dots.dispose();segments.dispose();projectionLenses?.dispose();root.clear();}
  };
 }
 // Opaque open decking with flush edge strips. The same sections define walking limits.
 const walkway=new T.Group();walkway.name='ORIGINS — open walkway';root.add(walkway);
 function walkwayStrip(left,right,name,finish,solid=false){
  const positions=[],indices=[];
  for(const [z,w,y] of L.walkway){
   const i=positions.length/3;positions.push(...left(z,w,y),...right(z,w,y));
   if(i>0)indices.push(i-2,i-1,i,i-1,i+1,i);
  }
  const shape=geometry(new T.BufferGeometry());shape.setAttribute('position',new T.Float32BufferAttribute(positions,3));shape.setIndex(indices);shape.computeVertexNormals();
  return mesh(walkway,shape,finish,[0,0,0],name,solid);
 }
 const walkingMetal=material(new T.MeshStandardMaterial({color:0x202934,roughness:.76,metalness:.34}));
 const edge=material(new T.MeshBasicMaterial({color:0x788799,toneMapped:false}));
 const bridge=walkwayStrip((z,w,y)=>[-w,y,z],(z,w,y)=>[w,y,z],'Origins exposed walkway deck',walkingMetal,true);
 for(const side of [-1,1]){
  walkwayStrip((z,w,y)=>[side*w,y-.14,z],(z,w,y)=>[side*w,y,z],'Origins deck fascia',black);
  walkwayStrip((z,w,y)=>[side*(w-.09),y+.006,z],(z,w,y)=>[side*(w-.05),y+.006,z],'Origins flush walkway edge',edge);
 }
 const dockLight=new T.PointLight(0xbacde0,36,20,2);dockLight.position.set(0,24,-15);root.add(dockLight);lights.push(dockLight);

 const sanctuary=new T.Group();sanctuary.name=bookOnly?'ORIGINS — open book platform':'ORIGINS — enclosed chamber';root.add(sanctuary);
 const {centerZ,radius:platformRadius,height:platformY}=L.platform;
 const radius=bookOnly?platformRadius:L.chamber.radius,opening=Math.asin(doorHalfWidth/radius),lift=bookOnly?platformY-L.floorY:0;
 const bookPosition=[0,L.bookPosition[1]-(bookOnly?0:platformY-L.floorY),centerZ];
 const floorY=L.floorY+lift;
 const floor=mesh(sanctuary,geometry(new T.CylinderGeometry(radius,radius-.18,.28,mobile?80:128)),walkingMetal,[0,floorY-.14,centerZ],'Origins suspended platform',true);
 const steps=[];
 if(bookOnly){
  for(const [front,back,top] of L.stairs){
   const bottom=L.floorY-.12;
   steps.push(block(sanctuary,walkingMetal,[0,(bottom+top)/2,(front+back)/2],[stairHalfWidth*2,top-bottom,front-back+.008],'Origins stair tread',true));
   block(sanctuary,edge,[0,top+.002,front-.028],[stairHalfWidth*2-.16,.004,.034],'Origins recessed light on stair nosing');
  }
  ring(sanctuary,radius-.08,.012,floorY+.014,centerZ,edge,'Origins subtle platform edge');
 }else{
  mesh(sanctuary,geometry(new T.CylinderGeometry(radius,radius,4.8,mobile?96:144,1,true,opening,Math.PI*2-opening*2)),black,[0,22.4,centerZ],'Origins chamber wall',true);
  mesh(sanctuary,geometry(new T.CylinderGeometry(radius,radius,4.2,mobile?96:144,1,true)),black,[0,26.9,centerZ],'Origins chamber continuous upper wall',true);
  mesh(sanctuary,geometry(new T.SphereGeometry(radius,mobile?64:96,32,0,Math.PI*2,0,Math.PI/2)),black,[0,29,centerZ],'ORIGINS — closed chamber ceiling',true,[1,.36,1]);
  label(sanctuary,'ORIGINS',[0,26.5,centerZ-radius+.07],5.4,.52);
 }
 // Light moves across the base and cover while the original book stays on its lectern.
 mesh(sanctuary,geometry(new T.CylinderGeometry(.98,1.05,.12,80)),black,[0,floorY+.06,centerZ],'Origins pedestal foot',true);
 block(sanctuary,black,[0,20.66+lift,centerZ],[.78,1.16,.78],'ORIGINS — ceremonial book plinth',true);
 const slab=block(sanctuary,bookOnly?black:silver,[0,21.22+lift,centerZ],[1.2,.10,1.1],'Origins ceremonial reading slab',true);slab.rotation.x=Math.PI/10;
 const pedestalTime={value:0},pedestalLight={value:.55};
 if(bookOnly){
  const lightTrace=material(new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
   uniforms:{uTime:pedestalTime,uPresence:pedestalLight},
   vertexShader:'varying vec2 vFloor;void main(){vFloor=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`varying vec2 vFloor;uniform float uTime,uPresence;
    void main(){float a=atan(vFloor.y,vFloor.x);float glow=pow(.5+.5*cos(a-uTime*.38),8.)+.38*pow(.5+.5*cos(a+uTime*.24+2.5),10.);
     gl_FragColor=vec4(mix(vec3(.34,.64,.87),vec3(.95,.86,.67),glow*.63),(.06+.68*glow)*uPresence);
     #include <colorspace_fragment>
    }`
  }));
  const trace=mesh(sanctuary,geometry(new T.RingGeometry(1.43,1.48,96)),lightTrace,[0,floorY+.017,centerZ],'Animated light surrounding the Origins pedestal');trace.rotation.x=-Math.PI/2;
 }
 const book=createLecternBook(sanctuary,{mobile,onChange:changed,onOpen,layout:{origins:{book:bookPosition}}});
 for(const object of book.pickables){object.userData={...object.userData,kind:'origins-vessel-book',href:'/origins?open=1'};pickables.push(object);}
 const artWidth=1.85;
 (bookOnly?[]:ORIGINS).forEach((work,n)=>{
  const a=opening+.10+(Math.PI*2-opening*2-.2)*(n+.5)/ORIGINS.length,r=radius-.18,x=Math.sin(a)*r,z=centerZ+Math.cos(a)*r,group=new T.Group();
  group.name='Origins chamber work — '+work.title;group.position.set(x,24.25,z);group.rotation.y=a+Math.PI;sanctuary.add(group);
  const artHeight=artWidth/work.aspect;
  block(group,black,[0,0,-.055],[artWidth+.08,artHeight+.08,.10],'Origins slim black frame — '+work.id,true);
  let map=null;if(globalThis.document?.createElementNS){map=new T.TextureLoader().load(work.src,loaded=>{if(disposed)return;const image=loaded.image,maxWidth=mobile?256:512;if(image.width>maxWidth){const canvas=document.createElement('canvas');canvas.width=maxWidth;canvas.height=Math.round(maxWidth*image.height/image.width);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);loaded.image=canvas;loaded.needsUpdate=true;}loadedWorks++;changed();},undefined,()=>{if(disposed)return;failedWorks++;changed();});map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;textures.add(map);}
  const image=material(new T.MeshBasicMaterial({map,color:map?0xffffff:0x333366,toneMapped:false}));
  const face=pick(mesh(group,plane,image,[0,0,.006],'Original Origins artwork — '+work.id,false,[artWidth,artHeight,1]),'origins-vessel-work',{workId:work.id,index:work.index,title:work.title,href:'/origins?work='+work.index,media:work.media});
  face.userData.originalOrigins=true;
  label(group,work.title,[0,-artHeight/2-.24,.015],artWidth,.18);
 });
 if(!bookOnly){
  pick(block(sanctuary,black,[0,21.35,centerZ+radius-.15],[2.2,.62,.08],'Origins return portal'),'origins-vessel-return',{action:'return',href:'/lisbon-space'});
  const returnLabel=label(sanctuary,'RETURN TO THE SAUCER',[0,21.35,centerZ+radius-.20],2.05,.22,{rotationY:Math.PI});
  if(returnLabel)pick(returnLabel,'origins-vessel-return',{action:'return',href:'/lisbon-space'});
 }
 const key=new T.SpotLight(0xffdfad,335,18,.33,.76,2);key.position.set(-1.2,floorY+5.65,centerZ+2);
 key.target.position.set(0,bookPosition[1],centerZ);sanctuary.add(key,key.target);lights.push(key);
 const rim=new T.SpotLight(0xa9d4ff,185,17,.39,.82,2);rim.position.set(2.65,floorY+3.1,centerZ-2.1);
 rim.target.position.copy(key.target.position);sanctuary.add(rim,rim.target);lights.push(rim);
 const landingLight=new T.PointLight(0xa0bdd9,47,12,2);landingLight.position.set(0,floorY+2.1,centerZ+3.6);sanctuary.add(landingLight);lights.push(landingLight);
 const bookCenter=new T.Vector3();
 changed();
 let returnFlying=false;
 return{root,pickables,solids,book,journey:L,walkSurfaces:[deck,hull,bridge,floor,...steps],
  setFlight(eye){returnFlying=true;saucer.position.set(eye.x-root.position.x,eye.y-root.position.y-1.65,eye.z-root.position.z);beamMaterial.visible=false;changed();},
  resetFlight(){returnFlying=false;saucer.position.set(...L.saucer);beamMaterial.visible=true;changed();},
  update(dt,eye,motion=true){if(disposed)return false;const step=Math.max(0,Math.min(Number(dt)||0,.1)),canopyChanged=updateShip(step,eye,motion,returnFlying);if(motion){time+=step;updates++;beamMaterial.uniforms.uTime.value=time;}if(bookOnly){
   book.root.getWorldPosition(bookCenter);
   const presence=1-T.MathUtils.smoothstep(eye.distanceTo(bookCenter),3,22),target=.46+presence*.54;
   pedestalTime.value=time;pedestalLight.value=motion?T.MathUtils.damp(pedestalLight.value,target,2.4,step):target;
   key.intensity=(225+135*pedestalLight.value)*(motion?1+.105*Math.sin(time*.46):1);
   rim.intensity=(105+88*pedestalLight.value)*(motion?1+.15*Math.sin(time*.62+1.4):1);
  }const bookChanged=book.update(dt,eye,motion),result=dirty||canopyChanged||bookChanged||!!(motion&&step>0);dirty=false;return result;},
  diagnostics:()=>({kind:'origins-flying-saucer-destination',ready:!disposed,saucer:true,rotation:spinner.rotation.y,canopy:canopyState(),rotationDegreesPerSecond:.065*180/Math.PI,saucerRadius:L.radius,saucerPosition:saucer.getWorldPosition(new T.Vector3()).toArray(),flying:returnFlying,parked:!returnFlying,metallicDisk:true,closedCanopy:canopyTravel===0,blueBeam:true,walkway:{openAir:true,startZ:L.walkway[0][0],endZ:L.walkway.at(-1)[0],width:2*L.walkway[2][1],steps:bookOnly?L.stairs.length:0,intentions:0},chamber:{openAir:bookOnly,closed:!bookOnly,realDoorway:!bookOnly,closedCeiling:!bookOnly,center:[0,floorY,centerZ],radius,originalWorks:bookOnly?0:ORIGINS.length,intentions:0,loadedWorks,failedWorks,bookPosition:[...bookPosition],bookApproach:[...L.bookApproach],lightAnimation:bookOnly},book:book.diagnostics(),cameraJourney:true,bodyPhysicsRequired:false,originalMedia:true,workTextureMaximumWidth:mobile?256:512,updates,time,disposed}),
  dispose(){if(disposed)return;disposed=true;book.dispose();root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();for(const light of lights)light.dispose?.();dots.dispose();segments.dispose();root.clear();}
 };
}
