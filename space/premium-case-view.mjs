import * as T from './vendor/three-0.180.0.mjs';
import {createPaperEdition,createPaperPackaging} from './gallery-paper-packaging.mjs';
import {addObjectLighting,modelShotRotation,premiumCaseShot,projectModelFace} from './gallery-object-view.mjs';

export function mountPremiumCase(host,{embedded=false,turnButton}={}){
 const canvas=document.createElement('canvas');canvas.id='premium-case-canvas';canvas.setAttribute('role','img');
 canvas.setAttribute('aria-label','The original TotehmPaper in its premium glass case, signed by Wah on the reverse');
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.01,30);camera.position.z=8;
 const geometries=[],materials=[];addObjectLighting(scene);
 let ready=false,originalsLoaded=false,grabbing=false,previous=null,disposed=false,shown=!embedded,turnFrame=0;
 const edition=createPaperEdition();
 const volume=createPaperPackaging({...edition,width:1,geometry:geometry=>(geometries.push(geometry),geometry),material:material=>(materials.push(material),material)});
 const initial=premiumCaseShot(innerWidth,innerHeight);
 volume.quaternion.copy(modelShotRotation(initial));
 volume.position.fromArray(initial.center).applyQuaternion(volume.quaternion).negate();
 scene.add(volume);host.replaceChildren(canvas);
 function draw(){if(!disposed)renderer.render(scene,camera);}
 edition.ready.then(loaded=>{originalsLoaded=loaded;ready=true;draw();});
 function resize(){
  const {pixels}=premiumCaseShot(innerWidth,innerHeight);
  camera.left=-innerWidth/(2*pixels);camera.right=-camera.left;camera.bottom=-innerHeight/(2*pixels);camera.top=-camera.bottom;
  camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);draw();
 }
 const facingBack=()=>Math.cos(volume.rotation.x)*Math.cos(volume.rotation.y)<0;
 function labelTurn(){if(turnButton)turnButton.textContent=facingBack()?'Turn to the front':'Turn over';}
 function stopTurn(){cancelAnimationFrame(turnFrame);turnFrame=0;}
 function turn(){
  if(!shown||turnFrame||grabbing)return;
  const from=volume.rotation.y,back=!facingBack(),angle=initial.yaw+(back?Math.PI:0);
  const to=angle+Math.round((from-angle)/(Math.PI*2))*Math.PI*2;
  const pitch=volume.rotation.x,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let start;
  const frame=now=>{
   start??=now;const progress=reduced?1:Math.min(1,(now-start)/620);
   const amount=progress*progress*(3-2*progress);
   volume.rotation.x=T.MathUtils.lerp(pitch,initial.pitch,amount);
   volume.rotation.y=T.MathUtils.lerp(from,to,amount);draw();
   if(progress<1)turnFrame=requestAnimationFrame(frame);
   else{turnFrame=0;labelTurn();}
  };
  turnFrame=requestAnimationFrame(frame);
 }
 turnButton?.addEventListener('click',turn);
 canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0||!shown)return;
  stopTurn();grabbing=true;previous=[event.clientX,event.clientY];canvas.setPointerCapture(event.pointerId);
 });
 canvas.addEventListener('pointermove',event=>{
  if(!grabbing)return;
  volume.rotation.y+=(event.clientX-previous[0])*.009;
  volume.rotation.x=T.MathUtils.clamp(volume.rotation.x+(event.clientY-previous[1])*.009,-1.15,1.15);
  previous=[event.clientX,event.clientY];draw();
 });
 for(const event of ['pointercancel','pointerup','lostpointercapture'])canvas.addEventListener(event,()=>{grabbing=false;labelTurn();});
 addEventListener('resize',resize);resize();
 addEventListener('pagehide',event=>{
  stopTurn();
  if(event.persisted)return;
  disposed=true;removeEventListener('resize',resize);turnButton?.removeEventListener('click',turn);
  for(const geometry of geometries)geometry.dispose();
  for(const material of materials)material.dispose();
  edition.dispose();renderer.dispose();
 });
 addEventListener('totehm:paper-enter',()=>{shown=true;document.body.classList.add('is-paper-entered');draw();},{once:true});
 return ()=>({build:'2026-11-18-signed-premium-case',ready,shown,premium:true,sharedModel:true,tongue:false,originalsLoaded,signature:volume.userData.signature,
  verso:facingBack(),turning:!!turnFrame,faceCorners:projectModelFace(volume,camera,innerWidth,innerHeight)
 });
}
