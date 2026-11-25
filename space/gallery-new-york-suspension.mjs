import * as T from './vendor/three-0.180.0.mjs';
import {OPPOSITES,OPPOSITE_FRAME} from './gallery-opposites.mjs';

const href='/think_same_but_opposite';
const source=[0,18.90,-4.2];
const {height:artHeight,ratio,border,color}=OPPOSITE_FRAME;
const artWidth=artHeight*ratio,frameWidth=artWidth+2*border,frameHeight=artHeight+2*border,frameDepth=.13,frameZ=-.068;

export const NEW_YORK_SUSPENSION_LAYOUT=Object.freeze({
 position:Object.freeze([0,5.88,-.85]),
 approach:Object.freeze([0,1.65,6.8]),
 target:Object.freeze([0,5.88,-.85])
});

function makeFields(root,works){
 const sides=4,verticesPerWork=2*sides;
 const points=new T.BufferAttribute(new Float32Array(works.length*verticesPerWork*3),3).setUsage(T.DynamicDrawUsage);
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',points);
 const progress=[],indices=[];
 for(let i=0;i<works.length;i++){
  const base=i*verticesPerWork;
  for(let ring=0;ring<2;ring++)for(let side=0;side<sides;side++)progress.push(ring);
  for(let side=0;side<sides;side++){
   const start=base+side,next=base+(side+1)%sides;
   indices.push(start,start+sides,next,next,start+sides,next+sides);
  }
 }
 geometry.setAttribute('aProgress',new T.Float32BufferAttribute(progress,1));
 geometry.setIndex(indices);
 const material=new T.ShaderMaterial({
  transparent:true,depthTest:true,depthWrite:false,side:T.BackSide,toneMapped:false,
  vertexShader:`
   attribute float aProgress; varying float vProgress;
   void main(){
    vProgress=aProgress;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
   }`,
  fragmentShader:`
   varying float vProgress;
   void main(){
    float density=smoothstep(.015,.32,vProgress)*(1.-.93*smoothstep(.67,1.,vProgress));
    gl_FragColor=vec4(.001,.0014,.003,density*.34);
    #include <colorspace_fragment>
   }`
 });
 const mesh=new T.Mesh(geometry,material);mesh.name='Six separate dark projection fields';
 mesh.frustumCulled=false;mesh.raycast=()=>{};root.add(mesh);
 const point=new T.Vector3(),inverse=new T.Matrix4(),emitter=new T.Vector3();
 const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
 function update(){
  root.updateWorldMatrix(true,false);
  inverse.copy(root.matrixWorld).invert();
  for(let i=0;i<works.length;i++){
   const work=works[i],angle=i*Math.PI/3,base=i*verticesPerWork;
   emitter.set(source[0]+.66*Math.cos(angle),source[1],source[2]+.66*Math.sin(angle)).applyMatrix4(inverse);
   work.group.updateWorldMatrix(false,false);
   for(let side=0;side<sides;side++){
    const [x,y]=corners[side];
    points.setXYZ(base+side,emitter.x+x*.024,emitter.y,emitter.z+y*.024);
    point.set(x*(artWidth/2+.23),y*(artHeight/2+.24),-.20).applyMatrix4(work.group.matrixWorld).applyMatrix4(inverse);
    points.setXYZ(base+sides+side,point.x,point.y,point.z);
   }
  }
  points.needsUpdate=true;
 }
 return{update,dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();}};
}

export function createNewYorkSuspension(parent,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Think same but opposite — six suspended artworks';
 root.position.fromArray(NEW_YORK_SUSPENSION_LAYOUT.position);parent.add(root);
 const resources=new Set(),own=resource=>(resources.add(resource),resource),pickables=[];
 const artGeometry=own(new T.PlaneGeometry(artWidth,artHeight));
 const frameGeometry=own(new T.BoxGeometry(frameWidth,frameHeight,frameDepth));
 const frameMaterial=own(new T.MeshStandardMaterial({color,metalness:.45,roughness:.57}));
 const titleGeometry=own(new T.PlaneGeometry(10.2,.65));
 const titleMaterial=own(new T.MeshBasicMaterial({transparent:true,alphaTest:.05,depthWrite:false,toneMapped:false,opacity:0}));
 const screen=new T.Mesh(titleGeometry,titleMaterial);
 screen.name='Think same but opposite — suspended title';screen.position.set(0,4.76,-.12);root.add(screen);
 const targetData={kind:'experience-projection',installation:'new-york-suspension',city:'new-york'};
 screen.userData={...targetData,href};pickables.push(screen);
 let time=0,lastPose=0,loaded=0,failed=0,dirty=true,disposed=false;
 let active=false,opened=false,opens=0,projecting=true,handoff=false,openCallback=()=>{};
 function changed(){if(!disposed){dirty=true;onChange();}}

 const canvas=globalThis.document?.createElement('canvas'),context=canvas?.getContext('2d');
 if(context){
  canvas.width=1600;canvas.height=104;
  const texture=own(new T.CanvasTexture(canvas));texture.colorSpace=T.SRGBColorSpace;
  texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;titleMaterial.map=texture;
  function drawTitle(){
   if(disposed)return;
   context.clearRect(0,0,canvas.width,canvas.height);
   context.textAlign='center';context.textBaseline='middle';
   context.font='700 62px "Space Mono", monospace';context.fillStyle='#ececf2';
   context.fillText('THINK SAME BUT OPPOSITE',800,52);
   titleMaterial.opacity=1;texture.needsUpdate=true;changed();
  }
  drawTitle();document.fonts?.ready?.then(drawTitle);
 }
 const loader=globalThis.document?.createElementNS?new T.TextureLoader():null;
 const works=OPPOSITES.map((work,index)=>{
  const group=new T.Group();group.name=work.title;root.add(group);
  const body=new T.Mesh(frameGeometry,frameMaterial);body.position.z=frameZ;group.add(body);
  const material=own(new T.MeshBasicMaterial({color:0xffffff,toneMapped:false}));
  const face=new T.Mesh(artGeometry,material);face.name='Original artwork — '+work.title;face.visible=false;group.add(face);
  const data={...targetData,id:work.id,href:href+'?work='+encodeURIComponent(work.id)};
  body.userData=data;face.userData=data;pickables.push(body,face);
  if(loader){
   const texture=own(loader.load(work.image,()=>{
    if(disposed)return;
    face.visible=true;loaded++;changed();
   },undefined,()=>{if(!disposed){failed++;changed();}}));
   texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=mobile?2:4;material.map=texture;
  }
  return{id:work.id,image:work.image,index,group,face,body};
 });
 const fields=makeFields(root,works),targets=new Set(pickables);
 function pose(){
  for(const {index,group} of works){
   const column=index%3-1,row=Math.floor(index/3),phase=time*.52+index*1.43;
   const yaw=-column*.12+Math.sin(phase*.67)*.046;
   group.position.set(column*4.15+(row?-.19:.19),row?-2.08:2.28,-Math.abs(column)*.25+(row?.23:-.29)+.11*Math.cos(phase*.72));
   group.position.y+=.14*Math.sin(phase);
   group.rotation.set(.023*Math.cos(phase),yaw,.016*Math.sin(phase));
  }
  fields.update();
  lastPose=time;
 }
 pose();

 function projectCorners(object,camera,width,height,planeWidth=artWidth,planeHeight=artHeight,z=0){
  const w=planeWidth/2,h=planeHeight/2;
  return [[-w,h],[w,h],[w,-h],[-w,-h]].map(([x,y])=>{
   const point=new T.Vector3(x,y,z).applyMatrix4(object.matrixWorld).project(camera);
   return{x:(point.x+1)*width/2,y:(1-point.y)*height/2};
  });
 }
 function snapshot(camera,width,height){
  if(!camera||disposed)return[];
  root.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);
  return works.map(({id,face})=>{
   const corners=projectCorners(face,camera,width,height);
   const [tl,tr,br,bl]=corners,span=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
   return{id,x:(tl.x+tr.x+br.x+bl.x)/4,y:(tl.y+tr.y+br.y+bl.y)/4,
    width:(span(tl,tr)+span(bl,br))/2,height:(span(tl,bl)+span(tr,br))/2,corners};
  });
 }
 function artworkLift(id,camera,width,height){
  const work=works.find(work=>work.id===id);
  if(!work||disposed||!work.face.visible)return null;
  const image=work.face.material.map?.image;
  if(!image?.naturalWidth||!image.naturalHeight)return null;
  work.body.updateWorldMatrix(true,false);camera.updateMatrixWorld(true);
  return{object:work.group,image,border,color,frameWidth,frameHeight,
   corners:projectCorners(work.body,camera,width,height,frameWidth,frameHeight,frameDepth/2)};
 }
 function syncVisibility(){
  root.visible=projecting&&!handoff;
  changed();
 }
 function acceptHit(hit){
  return !disposed&&root.visible&&targets.has(hit?.object)&&hit.object.visible&&hit.object.material.opacity>0;
 }
 function open(hit){
  if(disposed||!root.visible||(hit&&!acceptHit(hit)))return false;
  opened=true;opens++;openCallback({href:hit?.object.userData.href||href,id:hit?.object.userData.id});return true;
 }
 return{
  root,screen,pickables,snapshot,artworkLift,acceptHit,open,
  onOpen(fn){openCallback=fn;},
  setActive(value){active=!!value;if(!active)opened=false;},
  setHandoff(value){if(handoff!==!!value){handoff=!!value;syncVisibility();}},
  setProjecting(value){if(projecting!==!!value){projecting=!!value;syncVisibility();}},
  reset(){opened=false;if(handoff){handoff=false;syncVisibility();}},
  interact:open,
  handleKey(event){return active&&event.key==='Enter'&&!event.repeat?open():false;},
  update(dt,_eye,motion=true){
   if(disposed)return false;
   if(motion&&root.visible)time+=T.MathUtils.clamp(dt,0,.1);
   if(time-lastPose>=1/(mobile?16:30)){pose();dirty=true;}
   const result=dirty;dirty=false;return result;
  },
  diagnostics:()=>({
   kind:'new-york-suspended-opposites',city:'new-york',canonicalFirstPage:true,blackPanel:false,independentWorks:true,
   opticalBeam:true,beamVisible:root.visible,rayCount:works.length,beamSource:source,position:root.position.toArray(),
   ids:works.map(work=>work.id),assets:works.map(work=>work.image),works:works.length,loaded,failed,
   ready:loaded===works.length,coverReady:loaded===works.length,projecting,handoff,active,opened,opens,time:+time.toFixed(4),
   playing:false,videoDecoders:0,disposed
  }),
  dispose(){
   if(disposed)return;
   disposed=true;fields.dispose();
   for(const resource of resources)resource.dispose();
   root.removeFromParent();root.clear();pickables.length=0;targets.clear();
  }
 };
}
