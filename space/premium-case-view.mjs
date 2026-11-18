import * as T from './vendor/three-0.180.0.mjs';
import {createPaperPackaging} from './gallery-paper-packaging.mjs';
import {TOTEHMPAPER} from './gallery-artworks.mjs';
import {addObjectLighting,premiumCaseShot} from './gallery-object-view.mjs';

export function mountPremiumCase(host,{embedded=false}={}){
 const canvas=document.createElement('canvas');canvas.id='premium-case-canvas';canvas.setAttribute('role','img');
 canvas.setAttribute('aria-label','The original TotehmPaper in its premium glass case');
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.01,30);camera.position.z=8;
 const geometries=[],materials=[];addObjectLighting(scene);
 let ready=false,grabbing=false,previous=null,disposed=false;
 const map=new T.TextureLoader().load(TOTEHMPAPER.src,()=>{ready=true;draw();},undefined,()=>{ready=true;draw();});map.colorSpace=T.SRGBColorSpace;
 const paperMaterial=new T.MeshStandardMaterial({map,color:0xffffff,roughness:.59,side:T.DoubleSide,alphaTest:.12});materials.push(paperMaterial);
 const volume=createPaperPackaging({width:1,paperMaterial,geometry:geometry=>(geometries.push(geometry),geometry),material:material=>(materials.push(material),material)});
 scene.add(volume);host.replaceChildren(canvas);
 function draw(){if(!disposed)renderer.render(scene,camera);}
 function resize(){
  const {pixels}=premiumCaseShot(innerWidth,innerHeight);
  camera.left=-innerWidth/(2*pixels);camera.right=-camera.left;camera.bottom=-innerHeight/(2*pixels);camera.top=-camera.bottom;
  camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);draw();
 }
 canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;grabbing=true;previous=[event.clientX,event.clientY];canvas.setPointerCapture(event.pointerId);});
 canvas.addEventListener('pointermove',event=>{
  if(!grabbing)return;
  volume.rotation.y+=(event.clientX-previous[0])*.009;
  volume.rotation.x=T.MathUtils.clamp(volume.rotation.x+(event.clientY-previous[1])*.009,-1.15,1.15);
  previous=[event.clientX,event.clientY];draw();
 });
 for(const event of ['pointercancel','pointerup'])canvas.addEventListener(event,()=>{grabbing=false;});
 addEventListener('resize',resize);resize();
 addEventListener('pagehide',event=>{if(!event.persisted){disposed=true;removeEventListener('resize',resize);for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();map.dispose();renderer.dispose();}},{once:true});
 let shown=!embedded;
 addEventListener('totehm:paper-enter',()=>{shown=true;document.body.classList.add('is-paper-entered');draw();},{once:true});
 return ()=>({ready,shown,premium:true,sharedModel:true,tongue:false});
}
