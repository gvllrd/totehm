import * as T from './vendor/three-0.180.0.mjs';
import {createLisbonSignGeometry} from './lisbon-sign-buttons.mjs';

const sizes={
 fire_exit:[.62,'exit-lightbox',.070],Heli:[3.20,'helipad-pavement',.145],
 aed:[.47,'interior-plaque',.037],green_walk:[.36,'pedestrian-signal',.29],red_walk:[.36,'pedestrian-signal',.29],
 pharma:[1.06,'pharmacy-lightbox',.19],destination:[5.4,'motorway-board',.12],
 lisboa_city_hall:[1.45,'cast-city-emblem',.095],speed_bump_caution:[.95,'road-sign',.022],
 crosswalk_caution:[.84,'road-sign',.024],no_entry:[.76,'road-sign',.025],
 no_parking:[.73,'road-sign',.021],hospital:[.84,'road-sign',.026],
 parking:[.74,'road-sign',.023],Hotel:[.48,'hotel-plaque',.048],dead_end:[.75,'road-sign',.022],
 roundabout:[.82,'road-sign',.025],left_or_straight:[.79,'road-sign',.024],
 no_uturn:[.76,'road-sign',.022],priority:[.85,'road-sign',.027],
 crosswalk:[3.55,'crosswalk-pavement',.17],stop:[.87,'road-sign',.028]
};
const scaleOverrides={Heli:1.24,crosswalk:1.24,destination:1.24,pharma:2.14};
export const LISBON_STREET_OBJECTS=Object.freeze(Object.fromEntries(Object.entries(sizes).map(([id,[width,kind,depth]])=>{
 const scale=scaleOverrides[id]??1.32;
 return [id,Object.freeze({width:width*scale,height:width*scale*(id==='destination'?.57:1),kind,depth:depth*scale,scale})];
})));

function asphaltTexture(){
 const edge=128,data=new Uint8Array(edge*edge*4);
 let seed=43791;
 for(let i=0;i<data.length;i+=4){
  seed=(Math.imul(1664525,seed)+1013904223)>>>0;
  const grain=seed>>>24;
  const value=grain>237?150+grain%45:82+grain%52;
  data.set([value,value-2,value-6,255],i);
 }
 const texture=new T.DataTexture(data,edge,edge);
 texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;
 texture.repeat.set(2.5,2.5);texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;
 texture.generateMipmaps=true;texture.needsUpdate=true;
 return texture;
}

export function createLisbonStreetObject(id,{mobile=false,onChange=()=>{}}={}){
 const [width,kind,depth]=sizes[id];
 const height=width;
 const group=new T.Group();group.scale.setScalar(LISBON_STREET_OBJECTS[id].scale);
 group.name='Lisbon street object — '+id;
 group.userData={signId:id,streetObject:true};
 const resources=new Set(),hitTargets=[];
 const own=resource=>(resources.add(resource),resource);
 const material=parameters=>own(new T.MeshStandardMaterial(parameters));
 const metal=material({color:0x90999b,roughness:.68,metalness:.64});
 const dark=material({color:0x202427,roughness:.72,metalness:.19});
 const box=own(new T.BoxGeometry(1,1,1));
 let disposed=false;
 function mesh(geometry,surface,x=0,y=0,z=0){
  const object=new T.Mesh(geometry,surface);object.position.set(x,y,z);object.receiveShadow=true;
  group.add(object);hitTargets.push(object);return object;
 }
 function block(surface,x,y,z,w,h,d){
  const body=mesh(box,surface,x,y,z);body.scale.set(w,h,d);return body;
 }
 function plate(surface,edge=surface){
  const body=mesh(own(createLisbonSignGeometry(id,width,depth)),[surface,edge],0,0,-depth);
  body.castShadow=true;return body;
 }
 function pins(points,color=metal,size=.010){
  const screw=own(new T.CylinderGeometry(size,size,.006,8).rotateX(Math.PI/2));
  const slot=material({color:0x343537,roughness:.7,metalness:.38});
  for(const [x,y] of points){
   mesh(screw,color,x,y,.005);
   block(slot,x,y,.008,size*1.26,.002,.001);
  }
 }
 function rearBrackets(offset,length,z){
  for(const y of [-offset,offset])block(metal,0,y,z,length,.045,.039);
 }

 if(kind.endsWith('-pavement')){
  const shape=new T.Shape();
  const boundary=id==='Heli'
   ?[[-.64,-.27],[-.5,-.49],[.18,-.52],[.53,-.39],[.55,.18],[.30,.49],[-.14,.52],[-.53,.36]]
   :[[-.63,-.46],[-.18,-.50],[.47,-.47],[.53,-.06],[.47,.50],[-.28,.52],[-.56,.41],[-.64,.05]];
  boundary.forEach(([x,y],i)=>shape[i===0?'moveTo':'lineTo'](x*width,y*height));
  shape.closePath();
  const asphalt=own(asphaltTexture());
  const aggregate=material({color:0x787b7c,map:asphalt,bumpMap:asphalt,bumpScale:.027,roughness:.99});
  const tornSide=material({color:0x515355,map:asphalt,bumpMap:asphalt,bumpScale:.035,roughness:1});
  const slab=mesh(own(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:1,bevelSize:.02,bevelThickness:.01})),
   [aggregate,tornSide],0,0,-depth-.011);
  slab.castShadow=true;
 }else if(kind==='pedestrian-signal'){
  block(dark,0,0,-.15,.456,.5,.30);
  block(metal,0,0,-.319,.12,.16,.06);
  const ring=own(new T.RingGeometry(.137,.166,mobile?18:32));
  mesh(ring,dark,0,.015,.021);
  // A curved weather hood protects each lens on the common signal housing.
  const visor=own(new T.CylinderGeometry(.177,.177,.108,mobile?14:24,1,true,Math.PI*.17,Math.PI*.66).rotateX(Math.PI/2));
  mesh(visor,material({color:0x15191b,roughness:.79,side:T.DoubleSide}),0,.015,.07).rotateZ(Math.PI/2);
 }else if(kind==='motorway-board'){
  plate(material({color:0x637c8f,roughness:.71,metalness:.34}),metal);
  for(const y of [-.91,.91])block(metal,0,y,-.17,width*.88,.086,.074);
  const upright=own(new T.CylinderGeometry(.063,.063,2.7,mobile?10:16));
  for(const x of [-1.63,1.63]){
   mesh(upright,metal,x,-.30,-.24);
   for(const y of [-.91,.91])block(dark,x,y,-.22,.26,.16,.08);
  }
  pins([[-2.2,-.81],[-2.2,.81],[2.2,-.81],[2.2,.81]],metal,.019);
 }else if(kind==='pharmacy-lightbox'){
  const casing=material({color:0x395e27,roughness:.56,metalness:.18});
  plate(casing,material({color:0x447b35,roughness:.56,emissive:0x174e0d,emissiveIntensity:.22}));
  block(metal,0,0,-.30,.125,.105,.38);
  block(metal,0,0,-.49,.24,.22,.047);
 }else if(kind==='hotel-plaque'||kind==='interior-plaque'||kind==='exit-lightbox'||kind==='cast-city-emblem'){
  const body=kind==='hotel-plaque'
   ?material({color:0xae8441,roughness:.62,metalness:.64})
   :kind==='cast-city-emblem'?material({color:0xbfc3bd,roughness:.44,metalness:.68})
    :material({color:0x9baca5,roughness:.68,metalness:.31});
  plate(body);
  rearBrackets(width*.21,width*.53,-depth-.02);
  if(kind==='hotel-plaque'||kind==='interior-plaque'){
   const x=width*.32,y=width*.29;
   pins([[-x,-y],[-x,y],[x,-y],[x,y]],body,.008);
  }
 }else{
  plate(material({color:0xa0a9ae,roughness:.61,metalness:.36}),metal);
  const post=own(new T.CylinderGeometry(.033,.033,width*.80,mobile?10:16));
  mesh(post,metal,0,-width*.27,-.075);
  rearBrackets(width*.22,width*.43,-.066);
  pins([[0,-width*.31],[0,width*.31]]);
 }

 const artwork=material({color:0xffffff,roughness:kind.includes('pavement')?.92:.65,metalness:.015,alphaTest:.047});
 const face=new T.Mesh(own(new T.PlaneGeometry(width,height)),artwork);
 face.name='Original artwork — '+id;
 face.position.z=kind==='pedestrian-signal'?.024:.0025;
 face.visible=false;face.receiveShadow=true;group.add(face);
 const emissive=kind==='exit-lightbox'||kind==='pharmacy-lightbox'||kind==='pedestrian-signal';
 if(globalThis.document?.createElementNS){
  const map=own(new T.TextureLoader().load('/assets/signs/'+id+'.png',()=>{
   if(disposed)return;
   face.visible=true;onChange();
  },undefined,()=>{if(!disposed)onChange();}));
  map.colorSpace=T.SRGBColorSpace;map.anisotropy=mobile?2:6;artwork.map=map;
  if(emissive){artwork.emissive.set(0xffffff);artwork.emissiveMap=map;artwork.emissiveIntensity=.38;}
 }
 return{group,face,hitTargets,update(time){
  if(kind==='pedestrian-signal'){
   const green=time%10<4;
   const lit=(id==='green_walk')===green;
   artwork.color.setScalar(lit?1:.42);
   artwork.emissiveIntensity=lit?.75:.02;
  }else if(kind==='pharmacy-lightbox'){
   artwork.emissiveIntensity=.38+(1+Math.sin(time*1.8))*.14;
  }
 },dispose(){
  disposed=true;
  for(const resource of resources)resource.dispose();
  group.removeFromParent();group.clear();hitTargets.length=0;resources.clear();
 }};
}
