import * as T from './vendor/three-0.180.0.mjs';
import { createSky } from './gallery-sky.mjs';
import { createDome, INTENTION_COLOURS } from './gallery-dome.mjs';
import { createJourney } from './gallery-journey.mjs';
import { createWalkway } from './gallery-path.mjs';
import { TOTEHMPAPER, ORIGINS } from './gallery-artworks.mjs';

const ENTRY=[0,1.65,8.7],OVERVIEW=[0,3.5,-5];
const WORKS=[
 {at:[-12.5,2.8,-3],rotation:Math.PI/2,w:3.9,h:3.9,view:[-7.5,1.65,-3],room:0,title:'TOTEHMPAPER {THP}',type:'THE STONER EXPERIENCE',image:'paper'},
 {at:[0,3.2,-13],view:[0,1.65,3],room:1},
 {at:[12.5,2.8,-3],rotation:-Math.PI/2,w:4.4,h:3.1,view:[7.5,1.65,-3],room:2,title:'NEURO STREET ART DIGITAL',type:'WAH / INTERACTIVE',image:'lisbon'}
];
export async function createGallery({select,interact,fallback,reduced,lisbonPreview}) {
 const host=document.getElementById('space');
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<650?1.5:1.75));renderer.setSize(innerWidth,innerHeight);
 renderer.setClearColor(0x000000);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color(0x000000);scene.fog=new T.Fog(0x000000,35,125);
 const sky=createSky(scene,renderer),dome=createDome(scene,renderer),journey=createJourney(scene),walkway=createWalkway(dome.collision);
 document.body.classList.add('night-sky');
 const camera=new T.PerspectiveCamera(innerWidth<650?76:62,innerWidth/innerHeight,.08,220);
 const eye=new T.Vector3(...ENTRY),gaze=new T.Vector3(...OVERVIEW);
 let dirty=true,list=false,hidden=document.hidden,active=-1,tween=null,yaw=0,pitch=0,frames=0;
 let dragged=false,down=null,joystick={x:0,y:0},lastTime=0,motionReduced=reduced.matches,loaded=0;
 const keys=new Set(),art=[],originWorks=[];
 const black=new T.MeshBasicMaterial({color:0x000000,toneMapped:false});
 const shape=new T.Shape(),start=Math.PI+.145,span=Math.PI*2-.29,steps=100;
 for(let i=0;i<=steps;i++){const a=start+span*i/steps,x=Math.sin(a)*13.8,y=-Math.cos(a)*13.8;if(i)shape.lineTo(x,y);else shape.moveTo(x,y);}
 for(let i=steps;i>=0;i--){const a=start+span*i/steps;shape.lineTo(Math.sin(a)*13,-Math.cos(a)*13);}shape.closePath();
 const walls=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:5.2,steps:1,bevelEnabled:false}),black);walls.rotation.x=-Math.PI/2;walls.position.z=-3;scene.add(walls);
 const ground=new T.Mesh(new T.CircleGeometry(13,96),black);ground.rotation.x=-Math.PI/2;ground.position.set(0,-.015,-3);scene.add(ground);
 const doorway=new T.Mesh(new T.PlaneGeometry(3.3,5.1),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));
 doorway.position.set(0,2.55,-15.85);scene.add(doorway);
 function texture(c){const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;}
 const lisbonTexture=texture(lisbonPreview.canvas);
 function label(title,subtitle){
  const c=document.createElement('canvas');c.width=1024;c.height=140;const ctx=c.getContext('2d');
  ctx.fillStyle='#000';ctx.fillRect(0,0,1024,140);ctx.fillStyle='#d4d0df';ctx.font='22px monospace';ctx.fillText(title,18,48);
  ctx.fillStyle='#9691a5';ctx.font='14px monospace';ctx.fillText(subtitle,18,83);return texture(c);
 }
 function frame(work,colourIndex=5){
  const group=new T.Group();group.position.fromArray(work.at);group.rotation.y=work.rotation;scene.add(group);
  const backing=new T.Mesh(new T.BoxGeometry(work.w+.12,work.h+.12,.1),black);group.add(backing);
  const rim=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(work.w+.14,work.h+.14,.11)),new T.LineBasicMaterial({color:INTENTION_COLOURS[colourIndex%7],toneMapped:false}));group.add(rim);
  const material=new T.MeshBasicMaterial({color:0x000000,toneMapped:false});
  const painting=new T.Mesh(new T.PlaneGeometry(work.w,work.h),material);painting.position.z=.061;
  painting.userData={room:work.room,origin:work.origin};group.add(painting);art.push(painting);
  const plaqueWidth=Math.min(work.w,2.7),plaque=new T.Mesh(new T.PlaneGeometry(plaqueWidth,.36),new T.MeshBasicMaterial({map:label(work.title,work.type),toneMapped:false}));
  plaque.position.set(-work.w/2+plaqueWidth/2,-work.h/2-.26,.06);group.add(plaque);return material;
 }
 const paperMaterial=frame(WORKS[0]);
 const paperImage=new Image();paperImage.onload=()=>{
  const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,1024,1024);ctx.drawImage(paperImage,112,112,800,800);
  paperMaterial.map=texture(c);paperMaterial.color.set(0xffffff);paperMaterial.needsUpdate=true;dirty=true;
 };paperImage.src=TOTEHMPAPER.src;
 const lisbonMaterial=frame(WORKS[2],4);lisbonMaterial.map=lisbonTexture;lisbonMaterial.color.set(0xffffff);lisbonMaterial.needsUpdate=true;
 ORIGINS.forEach((item,i)=>{
  const side=i<10?1:-1,a=side*(2.07+(i%5)*.185),r=12.72,h=1.88,w=h*item.aspect;
  const work={at:[Math.sin(a)*r,i%10<5?1.55:4.02,-3+Math.cos(a)*r],rotation:a+Math.PI,w,h,
   view:[Math.sin(a)*9.45,1.65,-3+Math.cos(a)*9.45],room:1,origin:i,title:item.title,type:'ORIGINS / QUANTUM'};
  originWorks.push(work);const material=frame(work,i);
  const image=new Image();image.onload=()=>{const t=new T.Texture(image);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());t.needsUpdate=true;
   material.map=t;material.color.set(0xffffff);material.needsUpdate=true;loaded++;dirty=true;};image.src=item.src;
 });
 scene.updateMatrixWorld();
 function cameraAngles(){const delta=gaze.clone().sub(eye).normalize();yaw=Math.atan2(-delta.x,-delta.z);pitch=Math.asin(delta.y);}
 function look(){gaze.copy(eye).add(new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)));}
 cameraAngles();
 function travel(position,target){
  keys.clear();stopStick();const route=walkway.route(eye,position);if(!route)return;
  if(reduced.matches){eye.copy(position);gaze.copy(target);cameraAngles();tween=null;dirty=true;}
  else{const path=route.map(p=>new T.Vector3(p.x,1.65,p.z)),lengths=[0];for(let i=1;i<path.length;i++)lengths.push(lengths[i-1]+path[i-1].distanceTo(path[i]));
   tween={path,lengths,to:position,lookFrom:gaze.clone(),lookTo:target,start:performance.now(),duration:Math.min(4200,Math.max(1450,lengths.at(-1)*110))};}
 }
 function visit(index,origin=null){active=index;const work=index===1&&origin!==null?originWorks[origin]:WORKS[index];if(work)travel(new T.Vector3(...work.view),new T.Vector3(...work.at));}
 function overview(){active=-1;travel(new T.Vector3(...ENTRY),new T.Vector3(...OVERVIEW));}
 function explore(){active=-1;const stop=journey.nextStop(eye);travel(stop.position,stop.target);}
 function freeLook(){active=-1;interact();}
 document.getElementById('look-sky').addEventListener('click',()=>{freeLook();travel(eye.clone(),eye.clone().add(new T.Vector3(0,12,-3)));});
 const ray=new T.Raycaster(),mouse=new T.Vector2(),floorPlane=new T.Plane(new T.Vector3(0,1,0),0),floorPoint=new T.Vector3();
 const pickables=[walls,doorway,...art];
 function setRay(event){const r=host.getBoundingClientRect();mouse.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);}
 const {allowed}=walkway;
 function move(dx,dz){const x=eye.x+dx,z=eye.z+dz;if(allowed(x,eye.z))eye.x=x;if(allowed(eye.x,z))eye.z=z;look();dirty=true;}
 host.addEventListener('pointerdown',e=>{if(e.button!==0)return;host.setPointerCapture(e.pointerId);down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};dragged=false;});
 host.addEventListener('pointermove',e=>{
  if(!down){setRay(e);const hit=ray.intersectObjects(pickables,false)[0];host.style.cursor=hit&&hit.object!==walls?'pointer':'grab';return;}
  const dx=e.clientX-down.lastX,dy=e.clientY-down.lastY;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;
  if(dragged){tween=null;freeLook();yaw-=dx*.004;pitch=T.MathUtils.clamp(pitch+dy*.003,-.85,1.45);look();dirty=true;}
  down.lastX=e.clientX;down.lastY=e.clientY;
 });
 host.addEventListener('pointerup',e=>{
  if(!down)return;down=null;if(dragged)return;setRay(e);
  const hit=ray.intersectObjects(pickables,false)[0];
  if(hit&&hit.object!==walls&&hit.object!==doorway){select(hit.object.userData.room,true,hit.object.userData.origin??null);return;}
  if(hit?.object===doorway){freeLook();if(eye.z<-16)overview();else explore();return;}
  if(ray.ray.intersectPlane(floorPlane,floorPoint)&&allowed(floorPoint.x,floorPoint.z)&&(!hit||eye.distanceTo(floorPoint)<hit.distance)){
   freeLook();const destination=new T.Vector3(floorPoint.x,1.65,floorPoint.z),direction=gaze.clone().sub(eye);travel(destination,destination.clone().add(direction));
  }
 });
 host.addEventListener('pointercancel',()=>{down=null;});
 addEventListener('keydown',e=>{if(list||e.target.closest('input,textarea,select,[contenteditable=true],button,a'))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)){e.preventDefault();keys.add(e.key.toLowerCase());tween=null;freeLook();}
 });addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 const stick=document.getElementById('joystick'),knob=stick.querySelector('span');
 function stickMove(e){const r=stick.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/28,y=(e.clientY-r.top-r.height/2)/28;const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}joystick={x,y};knob.style.transform='translate('+x*23+'px,'+y*23+'px)';tween=null;freeLook();}
 stick.addEventListener('pointerdown',e=>{stick.setPointerCapture(e.pointerId);stickMove(e);});stick.addEventListener('pointermove',e=>{if(stick.hasPointerCapture(e.pointerId))stickMove(e);});
 function stopStick(){joystick={x:0,y:0};knob.style.transform='';}
 stick.addEventListener('pointerup',stopStick);stick.addEventListener('pointercancel',stopStick);
 function stop(){keys.clear();stopStick();down=null;lisbonPreview.pause();}
 addEventListener('blur',stop);addEventListener('pagehide',()=>{stop();renderer.setAnimationLoop(null);});
 document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden)stop();else dirty=true;});
 function motionChanged(){motionReduced=reduced.matches;if(motionReduced&&tween){eye.copy(tween.to);gaze.copy(tween.lookTo);tween=null;cameraAngles();}dirty=true;}
 reduced.addEventListener('change',motionChanged);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();renderer.setAnimationLoop(null);fallback();});
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<650?76:62;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);dirty=true;});
 document.getElementById('help').addEventListener('click',()=>{document.querySelector('.guide').style.opacity='1';});
 let lastRender=0,slowFrames=0,lastOutside=false;
 const frustum=new T.Frustum(),projection=new T.Matrix4();
 function animate(time){
  const elapsed=lastTime?(time-lastTime)/1000:0,dt=Math.min(elapsed,.05);lastTime=time;
  if(reduced.matches!==motionReduced)motionChanged();if(hidden||list){slowFrames=0;return;}
  if(frames>2&&(!motionReduced||tween)){slowFrames=elapsed>.09?slowFrames+1:0;if(slowFrames>=3&&renderer.getPixelRatio()>.65){renderer.setPixelRatio(Math.max(.65,renderer.getPixelRatio()*.6));slowFrames=0;dirty=true;}}
  if(tween){const p=Math.min(1,(time-tween.start)/tween.duration),ease=p*p*(3-2*p),distance=tween.lengths.at(-1)*ease;
   let segment=1;while(segment<tween.path.length-1&&tween.lengths[segment]<distance)segment++;
   const start=tween.lengths[segment-1],length=tween.lengths[segment]-start;
   eye.lerpVectors(tween.path[segment-1],tween.path[segment],length?(distance-start)/length:1);gaze.lerpVectors(tween.lookFrom,tween.lookTo,ease);dirty=true;if(p===1){tween=null;cameraAngles();}
  }
  const forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)-joystick.y;
  const side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joystick.x;
  if(forward||side){const length=Math.max(1,Math.hypot(forward,side)),speed=dt*2.6/length;move((-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed);}
  camera.position.copy(eye);camera.lookAt(gaze);camera.updateMatrixWorld();
  frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  const animated=!reduced.matches;
  if(lisbonPreview.update(dt,animated&&frustum.intersectsObject(art[1]))){lisbonTexture.needsUpdate=true;dirty=true;}
  if(journey.update(dt,eye,animated))dirty=true;
  const outside=eye.z<-16;
  if(outside!==lastOutside){lastOutside=outside;document.body.classList.toggle('beyond-dome',outside);document.getElementById('explore-space').textContent=outside?'Drift further ↗':'Explore space ↗';}
  sky.update(dt,eye,animated);
  if(dirty||animated){if(time-lastRender<(innerWidth<650?40:32))return;renderer.render(scene,camera);frames++;dirty=false;lastRender=time;}
 }
 renderer.setAnimationLoop(animate);
 addEventListener('pageshow',e=>{if(e.persisted){hidden=document.hidden;dirty=true;lastTime=0;renderer.setAnimationLoop(animate);}});
 return {visit,overview,explore,invalidate(){lisbonTexture.needsUpdate=true;dirty=true;},setList(value){list=value;keys.clear();stopStick();lisbonPreview.pause();dirty=true;},
  diagnostics:()=>({webgl:true,frames,moving:!!tween||!!keys.size||!!joystick.x||!!joystick.y,position:[+eye.x.toFixed(2),+eye.z.toFixed(2)],playing:0,visible:!hidden&&!list,
   render:{pixelRatio:renderer.getPixelRatio(),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},dome:dome.diagnostics(),
   stone:{material:'absolute black',wallColor:'#000000',wallThickness:.8},collection:{paper:{src:'/assets/gallery/totehmpaper.png',framed:true},origins:{total:ORIGINS.length,loaded,frames:originWorks.length}},
   journey:{...journey.diagnostics(),animated:!hidden&&!list&&!reduced.matches&&eye.z<-16},sky:{...sky.diagnostics(),animated:!hidden&&!list&&!reduced.matches}})};
}
