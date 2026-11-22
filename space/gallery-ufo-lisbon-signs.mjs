import * as T from './vendor/three-0.180.0.mjs';
import {LISBON_FRONT_NAMES,LISBON_FRONT_COPY} from './lisbon-first-page.mjs';
import {LISBON_URBEX_LAYOUT as L} from './gallery-lisbon-urbex-layout.mjs';
import {createLisbonStreetObject,LISBON_STREET_OBJECTS} from './gallery-lisbon-street-objects.mjs';

export const UFO_LISBON_SIGNS_LAYOUT=Object.freeze({
 position:L.play.screen,approach:Object.freeze([0,1.65,-.25]),
 href:'/play_lisbon_street?board=1'
});

// Road markings sit low in the foreground, and the motorway board hangs
// back above them. The traffic-light halves share position and movement.
const placement={
 fire_exit:[-4.18,2.23,2.8,.19],
 Heli:[-3.9,-4.90,4.20,.12,-.96],
 aed:[4.8,1.67,3.65,-.19],
 green_walk:[-4.55,-1.75,3.1,.08],
 red_walk:[-4.55,-1.25,3.1,.08],
 pharma:[-6.65,.35,1.22,.18],
 destination:[0,3.62,-2.60,-.035],
 lisboa_city_hall:[3.92,3.42,-.52,-.13],
 speed_bump_caution:[-5.82,3.60,-.30,.14],
 crosswalk_caution:[3.42,-2.27,1.8,-.13],
 no_entry:[6.5,.42,1.26,-.20],
 no_parking:[.12,-1.76,2.15,-.11],
 hospital:[6.21,2.92,1.42,-.17],
 parking:[-1.66,-2.19,2.8,.09],
 Hotel:[2.37,1.85,3.65,-.12],
 dead_end:[-3.03,-1.68,2.35,.12],
 roundabout:[-6.62,-2.66,2.00,.18],
 left_or_straight:[1.71,-2.52,2.94,-.07],
 no_uturn:[5.1,-3.54,3.58,-.18],
 priority:[-2.88,2.77,.79,.11],
 crosswalk:[1.55,-5.03,3.18,-.12,-1.04],
 stop:[5.55,-1.95,3.28,-.15]
};

export function createUfoLisbonSigns(parent,{mobile=false,onChange=()=>{},position=UFO_LISBON_SIGNS_LAYOUT.position}={}){
 const root=new T.Group();root.name='Suspended Lisbon street objects';root.position.fromArray(position);parent.add(root);
 const pickables=[],objects=[],titleResources=[];
 const targetData={kind:'experience-projection',installation:'ufo-lisbon-signs',city:'lisbon',href:UFO_LISBON_SIGNS_LAYOUT.href};
 let active=false,opened=false,disposed=false,handoff=false,dirty=true,opens=0,time=0,lastPose=-1,openCallback=()=>{};
 function changed(){if(!disposed){dirty=true;onChange();}}
 function makeTitle(text,width,height,y,fontSize,color){
  const geometry=new T.PlaneGeometry(width,height);
  const material=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,alphaTest:.02,depthWrite:false,toneMapped:false});
  const mesh=new T.Mesh(geometry,material);mesh.name=text;mesh.position.set(0,y,.14);root.add(mesh);
  const canvas=globalThis.document?.createElement('canvas'),context=canvas?.getContext('2d');
  if(context){
   canvas.width=2304;canvas.height=Math.max(128,Math.round(canvas.width*height/width));
   const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
   texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;material.map=texture;
   const draw=()=>{
    if(disposed)return;
    context.clearRect(0,0,canvas.width,canvas.height);context.textAlign='center';context.textBaseline='middle';
    context.font=(fontSize===116?'700 ':'400 ')+fontSize+'px "Space Mono",monospace';
    context.fillStyle=color;context.fillText(text,canvas.width/2,canvas.height/2,canvas.width*.98);
    texture.needsUpdate=true;material.opacity=1;changed();
   };
   draw();document.fonts?.ready?.then(draw);titleResources.push(texture);
  }
  titleResources.push(geometry,material);return mesh;
 }

 const screen=makeTitle(LISBON_FRONT_COPY.headline,12.5,1.35,.24,116,'#e1e2e8');
 screen.userData={...targetData,projectedTitle:true};pickables.push(screen);
 makeTitle(LISBON_FRONT_COPY.subtitle,7.4,.46,-.54,82,'#aeb5c8');
 for(const id of LISBON_FRONT_NAMES){
  const model=createLisbonStreetObject(id,{mobile,onChange:changed});
  const [x,y,z,yaw,pitch=0]=placement[id];
  root.add(model.group);objects.push({...model,id,x,y,z,yaw,pitch,index:objects.length});
  for(const hit of model.hitTargets){
   hit.userData={...hit.userData,...targetData,signId:id,id};pickables.push(hit);
  }
 }
 const hitSet=new Set(pickables);

 function pose(){
  for(const object of objects){
   const {group,id,x,y,z,yaw,pitch,index}=object;
   const paired=id==='red_walk'||id==='green_walk',phase=paired?0:index;
   const drift=Math.sin(time*.37+phase*1.93);
   group.position.set(x,y+.061*drift,z+.095*Math.sin(time*.28+phase*1.32));
   group.rotation.set(pitch,yaw+Math.sin(time*.24+phase)*.05,paired?0:drift*.017);
   object.update?.(time);
  }
  lastPose=time;
 }
 pose();

 function snapshot(camera,width=globalThis.innerWidth||1600,height=globalThis.innerHeight||900){
  if(!camera||disposed)return[];
  root.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);
  return objects.map(({id,face})=>{
   const {width:w,height:h}=face.geometry.parameters;
   const corners=[[-w/2,h/2],[w/2,h/2],[w/2,-h/2],[-w/2,-h/2]].map(([x,y])=>{
    const point=new T.Vector3(x,y,0).applyMatrix4(face.matrixWorld).project(camera);
    return{x:(point.x+1)*width/2,y:(1-point.y)*height/2};
   });
   const [tl,tr,br,bl]=corners,distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
   return{id,x:(tl.x+tr.x+br.x+bl.x)/4,y:(tl.y+tr.y+br.y+bl.y)/4,
    width:(distance(tl,tr)+distance(bl,br))/2,height:(distance(tl,bl)+distance(tr,br))/2,
    rotation:Math.atan2(tr.y-tl.y+br.y-bl.y,tr.x-tl.x+br.x-bl.x),corners};
  });
 }
 function acceptHit(hit){
  const object=hit?.object;
  if(disposed||handoff||!hitSet.has(object)||!object.visible)return false;
  return (Array.isArray(object.material)?object.material:[object.material]).some(material=>material?.visible&&material.opacity>.05);
 }
 function open(hit=null){
  if(disposed||handoff)return false;
  opened=true;opens++;changed();openCallback({href:targetData.href,signId:hit?.object.userData.signId||null});return true;
 }
 function setHandoff(value){
  handoff=!!value;
  for(const object of objects)object.group.visible=!handoff;
  changed();
 }
 function diagnostics(){
  const loaded=objects.filter(({face})=>!!face.material.map?.image).length;
  const ready=loaded===LISBON_FRONT_NAMES.length&&screen.material.opacity>0;
  return{kind:'lisbon-suspended-street-objects',city:'lisbon',canonicalFirstPage:true,physicalObjects:true,
   blackPanel:false,opticalBeam:false,independentSigns:true,signs:objects.length,loaded,ready,coverReady:ready,
   lifeSize:true,position:root.position.toArray(),headline:LISBON_FRONT_COPY.headline,subtitle:LISBON_FRONT_COPY.subtitle,
   mounts:objects.map(({id})=>({id,...LISBON_STREET_OBJECTS[id]})),time:+time.toFixed(4),active,opened,opens,handoff,
   playing:false,videoDecoders:0,clickTargets:pickables.length,disposed};
 }
 return{root,screen,signs:objects,pickables,snapshot,acceptHit,open,setHandoff,diagnostics,
  onOpen(fn){openCallback=fn;},
  interact(hit){return acceptHit(hit)?open(hit):false;},
  setActive(value){active=!!value;if(!active)opened=false;},
  reset(){opened=false;setHandoff(false);},
  handleKey(event){return active&&event.key==='Enter'&&!event.repeat?open():false;},
  update(dt,eye,motion=true){
   if(disposed)return false;
   if(motion)time+=Math.max(0,Math.min(dt,.1));
   if(time-lastPose>=1/(mobile?16:24)){pose();dirty=true;}
   const result=dirty;dirty=false;return result;
  },
  dispose(){
   if(disposed)return;
   disposed=true;
   for(const object of objects)object.dispose();
   for(const resource of titleResources)resource.dispose();
   root.removeFromParent();root.clear();pickables.length=0;objects.length=0;hitSet.clear();
  }
 };
}
