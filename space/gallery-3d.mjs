import * as T from './vendor/three-0.180.0.mjs';
import { createSky } from './gallery-sky.mjs';

const WORKS = [
  {at:[-6.78,2.5,-2],rotation:Math.PI/2,w:4.5,h:2.7,view:[-2.7,1.65,-2],title:'TOTEHMPAPER',type:'WAH / DIGITAL ART',image:'higher'},
  {at:[-3.6,2.5,-12.77],rotation:0,w:4.1,h:2.8,view:[-3.6,1.65,-7.3],title:'THE STONER EXPERIENCE',type:'WAH / INTERACTIVE',image:'stoner'},
  {at:[6.78,2.5,-3.8],rotation:-Math.PI/2,w:4.4,h:3.1,view:[2.5,1.65,-3.8],title:'PLAY THE LISBON STREET',type:'WAH / INTERACTIVE',image:'lisbon'},
  {at:[3.7,2.5,-12.77],rotation:0,w:4.2,h:3,view:[3.7,1.65,-7.3],title:'ORIGINS / QUANTUM',type:'WAH / MOVING IMAGE',image:'quantum'}
];
export async function createGallery({select,interact,fallback,reduced}) {
  const host=document.getElementById('space');
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<650?1.5:1.75));
  renderer.setSize(innerWidth,innerHeight); renderer.setClearColor(0xe7e5dd);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false; renderer.shadowMap.needsUpdate=true;
  renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
  renderer.domElement.setAttribute('aria-hidden','true'); host.append(renderer.domElement);
  const scene=new T.Scene(); scene.background=new T.Color(0x060918); scene.fog=new T.Fog(0x101326,30,75);
  const sky=createSky(scene,renderer); document.body.classList.add('night-sky');
  const camera=new T.PerspectiveCamera(innerWidth<650?76:62,innerWidth/innerHeight,.08,100);
  const eye=new T.Vector3(.5,1.65,8), gaze=new T.Vector3(-.5,2.8,-6);
  let dirty=true, list=false, hidden=document.hidden, active=-1, tween=null, yaw=0, pitch=0, frames=0;
  let dragged=false, down=null, joystick={x:0,y:0}, lastTime=0, video=null, videoTexture=null;
  let motionReduced=reduced.matches;
  const keys=new Set(), surfaces=[], art=[];
  const wall=new T.MeshStandardMaterial({color:0xeceae4,roughness:.95});
  const floor=new T.MeshStandardMaterial({color:0xc8c4b9,roughness:.72,metalness:.03});
  const trim=new T.MeshStandardMaterial({color:0x6d6a61,roughness:.8});
  const dark=new T.MeshStandardMaterial({color:0x292938,roughness:.55});
  function box(w,h,d,x,y,z,material=wall,shadow=true) {
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material); mesh.position.set(x,y,z);
    mesh.castShadow=shadow; mesh.receiveShadow=true;scene.add(mesh);return mesh;
  }
  const ground=box(30,.16,38,0,-.08,-2,floor,false); surfaces.push(ground);
  box(.3,5.6,23,-7,2.8,-1.5);box(.3,5.6,23,7,2.8,-1.5);
  // An open roof leaves the entire celestial canopy visible above the lit gallery.
  box(6.1,5.6,.3,-4,2.8,-13);box(6.1,5.6,.3,4,2.8,-13);box(1.8,1.4,.3,0,4.9,-13);
  box(.22,.18,23,-6.94,5.66,-1.5);box(.22,.18,23,6.94,5.66,-1.5);
  box(14,.06,.08,0,.03,-12.83,trim,false);
  box(.08,.06,23,-6.82,.03,-1.5,trim,false);box(.08,.06,23,6.82,.03,-1.5,trim,false);
  for(let z=-11;z<10;z+=2.4)box(13.6,.006,.012,0,.004,z,new T.MeshStandardMaterial({color:0xbab6ac,roughness:1}),false);
  // A low sculpture plinth: the same Higher artwork, with no new collectible or invented work.
  box(1.12,.8,1.12,0,.4,-3.1);const plinth=box(.76,.76,.76,0,1.18,-3.1,dark);
  box(2.8,.17,.85,-3,.52,3.3,new T.MeshStandardMaterial({color:0x989084,roughness:.9}));
  box(.16,.45,.6,-4,.25,3.3,trim);box(.16,.45,.6,-2,.25,3.3,trim);
  scene.add(new T.HemisphereLight(0xf3f5ff,0x8e8170,2.6));
  const sun=new T.DirectionalLight(0xfff1d4,3.2);sun.position.set(-8,14,3);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-13,right:13,top:16,bottom:-16,near:1,far:40});sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.0005;sun.shadow.normalBias=.04;sun.target.position.set(0,0,-3);scene.add(sun,sun.target);
  const fill=new T.DirectionalLight(0xdde5ff,.8);fill.position.set(5,5,8);scene.add(fill);
  function texture(canvas){const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;}
  function canvas(w=1024,h=768){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function label(text,sub,w=1024,h=150) {
    const c=canvas(w,h),ctx=c.getContext('2d');ctx.fillStyle='#eceae4';ctx.fillRect(0,0,w,h);ctx.fillStyle='#4b4a48';ctx.font='23px monospace';ctx.fillText(text,22,55);ctx.fillStyle='#8b8780';ctx.font='15px monospace';ctx.fillText(sub,22,92);return texture(c);
  }
  const sign=new T.Mesh(new T.PlaneGeometry(2.4,.36),new T.MeshBasicMaterial({map:label('TOTEHM.SPACE','ART BY WAH')}));sign.position.set(0,4.55,-12.82);scene.add(sign);
  const image = src => new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});
  async function preview(name,aspect){
    const c=canvas(1024,Math.round(1024/aspect)),ctx=c.getContext('2d');ctx.fillStyle=name==='quantum'?'#121220':'#f6f3eb';ctx.fillRect(0,0,c.width,c.height);
    if(name==='lisbon'){
      const names=['no_entry','crosswalk','green_walk','stop','pharma','red_walk','parking','roundabout','no_parking'];
      const images=await Promise.all(names.map(n=>image('/assets/signs/'+n+'.png')));
      images.forEach((im,i)=>{const cell=Math.min(c.width/3,c.height/3)*.65,scale=Math.min(cell/im.width,cell/im.height);const w=im.width*scale,h=im.height*scale;ctx.drawImage(im,(i%3+.5)*c.width/3-w/2,(Math.floor(i/3)+.5)*c.height/3-h/2,w,h);});
    }else{
      const im=await image('/assets/gallery/'+name+(name==='quantum'?'.jpg':'.svg'));
      const scale=Math.min(c.width*.83/im.width,c.height*.8/im.height);const w=im.width*scale,h=im.height*scale;ctx.drawImage(im,(c.width-w)/2,(c.height-h)/2,w,h);
    }return texture(c);
  }
  for(const [index,work] of WORKS.entries()){
    const group=new T.Group();group.position.fromArray(work.at);group.rotation.y=work.rotation;scene.add(group);
    const frame=new T.Mesh(new T.BoxGeometry(work.w+.12,work.h+.12,.09),dark);group.add(frame);frame.castShadow=true;
    const material=new T.MeshBasicMaterial({color:work.image==='quantum'?0x151522:0xf6f3eb});
    const painting=new T.Mesh(new T.PlaneGeometry(work.w,work.h),material);painting.position.z=.051;painting.userData.work=index;group.add(painting);art.push(painting);
    const plaque=new T.Mesh(new T.PlaneGeometry(2.05,.3),new T.MeshBasicMaterial({map:label(work.title,work.type)}));plaque.position.set(-work.w/2+1.025,-work.h/2-.38,.01);group.add(plaque);
    preview(work.image,work.w/work.h).then(t=>{material.map=t;material.color.set(0xffffff);material.needsUpdate=true;dirty=true;if(index===0){plinth.material=new T.MeshStandardMaterial({map:t,roughness:.6});}}).catch(()=>{});
    const light=new T.PointLight(0xfff5df,9,8,2);light.position.copy(group.position).add(new T.Vector3(0,2,0));scene.add(light);
  }
  function cameraAngles(){const delta=gaze.clone().sub(eye).normalize();yaw=Math.atan2(-delta.x,-delta.z);pitch=Math.asin(delta.y);}
  function look(){gaze.copy(eye).add(new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)));}
  cameraAngles();
  function media(){
    const play=active===3&&!hidden&&!list&&!reduced.matches;
    if(play&&!video){video=document.querySelector('#quantum video');video.crossOrigin='anonymous';video.src=video.dataset.src;videoTexture=new T.VideoTexture(video);videoTexture.colorSpace=T.SRGBColorSpace;
      video.addEventListener('playing',()=>{if(reduced.matches||hidden||list||active!==3){video.pause();return;}const work=WORKS[3],aspect=video.videoWidth/video.videoHeight;art[3].geometry.dispose();art[3].geometry=new T.PlaneGeometry(Math.min(work.w,work.h*aspect),Math.min(work.h,work.w/aspect));art[3].material.map=videoTexture;art[3].material.needsUpdate=true;dirty=true;});
    }
    if(play)video.play().catch(()=>{});else video?.pause();
  }
  function travel(position,target){
    keys.clear();joystick={x:0,y:0};
    if(reduced.matches){eye.copy(position);gaze.copy(target);cameraAngles();tween=null;dirty=true;}
    else tween={from:eye.clone(),to:position,lookFrom:gaze.clone(),lookTo:target,start:performance.now(),duration:1450};
  }
  function visit(index){active=index;travel(new T.Vector3(...WORKS[index].view),new T.Vector3(...WORKS[index].at));media();}
  function overview(){active=-1;travel(new T.Vector3(.5,1.65,8),new T.Vector3(-.5,2.8,-6));media();}
  document.getElementById('look-sky').addEventListener('click',()=>{freeLook();travel(eye.clone(),eye.clone().add(new T.Vector3(0,12,-3)));});
  function freeLook(){if(active!==-1){active=-1;media();}interact();}
  const ray=new T.Raycaster(),mouse=new T.Vector2();
  function hits(event,objects){const r=host.getBoundingClientRect();mouse.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);return ray.intersectObjects(objects,false)[0];}
  function allowed(x,z){return x>-6.2&&x<6.2&&z>-11.8&&z<8.8&&!(Math.abs(x)<.94&&z>-4.05&&z<-2.15);}
  function clearPath(a,b){const steps=Math.max(1,Math.ceil(a.distanceTo(b)/.2));for(let i=1;i<=steps;i++){const t=i/steps;if(!allowed(T.MathUtils.lerp(a.x,b.x,t),T.MathUtils.lerp(a.z,b.z,t)))return false;}return true;}
  function move(dx,dz){const x=eye.x+dx,z=eye.z+dz;if(allowed(x,eye.z))eye.x=x;if(allowed(eye.x,z))eye.z=z;look();dirty=true;}
  host.addEventListener('pointerdown',e=>{if(e.button!==0)return;host.setPointerCapture(e.pointerId);down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};dragged=false;});
  host.addEventListener('pointermove',e=>{
    if(!down){host.style.cursor=hits(e,art)?'pointer':'grab';return;}
    const dx=e.clientX-down.lastX,dy=e.clientY-down.lastY;
    if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;
    if(dragged){tween=null;freeLook();yaw-=dx*.004;pitch=T.MathUtils.clamp(pitch+dy*.003,-.85,1.45);look();dirty=true;}
    down.lastX=e.clientX;down.lastY=e.clientY;
  });
  host.addEventListener('pointerup',e=>{
    if(!down)return;down=null;if(dragged)return;
    const hit=hits(e,art);if(hit){select(hit.object.userData.work);return;}
    const floorHit=hits(e,surfaces);if(floorHit&&allowed(floorHit.point.x,floorHit.point.z)&&clearPath(eye,new T.Vector3(floorHit.point.x,1.65,floorHit.point.z))){
      interact();active=-1;media();const destination=new T.Vector3(floorHit.point.x,1.65,floorHit.point.z);const direction=gaze.clone().sub(eye);travel(destination,destination.clone().add(direction));
    }
  });
  host.addEventListener('pointercancel',()=>{down=null;});
  addEventListener('keydown',e=>{
    if(list||e.target.closest('input,textarea,select,[contenteditable=true],button,a'))return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)){e.preventDefault();keys.add(e.key.toLowerCase());tween=null;freeLook();}
  });addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  const stick=document.getElementById('joystick'),knob=stick.querySelector('span');
  function stickMove(e){const r=stick.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/28,y=(e.clientY-r.top-r.height/2)/28;const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}joystick={x,y};knob.style.transform=`translate(${x*23}px,${y*23}px)`;tween=null;freeLook();}
  stick.addEventListener('pointerdown',e=>{stick.setPointerCapture(e.pointerId);stickMove(e);});stick.addEventListener('pointermove',e=>{if(stick.hasPointerCapture(e.pointerId))stickMove(e);});
  function stopStick(){joystick={x:0,y:0};knob.style.transform='';}stick.addEventListener('pointerup',stopStick);stick.addEventListener('pointercancel',stopStick);
  function stop(){keys.clear();stopStick();down=null;video?.pause();}
  addEventListener('blur',stop);addEventListener('pagehide',()=>{stop();renderer.setAnimationLoop(null);});
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden)stop();else{dirty=true;media();}});
  function motionChanged(){motionReduced=reduced.matches;if(motionReduced&&tween){eye.copy(tween.to);gaze.copy(tween.lookTo);tween=null;cameraAngles();}media();dirty=true;}
  reduced.addEventListener('change',motionChanged);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();renderer.setAnimationLoop(null);fallback();});
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<650?76:62;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);dirty=true;});
  document.getElementById('help').addEventListener('click',()=>{document.querySelector('.guide').style.opacity='1';});
  let lastRender=0;
  function animate(time){
    const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;
    // Some engines update matches before delivering the media-query event.
    if(reduced.matches!==motionReduced)motionChanged();
    if(hidden||list)return;
    if(tween){const p=Math.min(1,(time-tween.start)/tween.duration),ease=p*p*(3-2*p);eye.lerpVectors(tween.from,tween.to,ease);gaze.lerpVectors(tween.lookFrom,tween.lookTo,ease);dirty=true;if(p===1){tween=null;cameraAngles();}}
    const forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)-joystick.y;
    const side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joystick.x;
    if(forward||side){const length=Math.max(1,Math.hypot(forward,side)),speed=dt*2.6/length;move((-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed);}
    const skyAnimated=!reduced.matches;
    sky.update(dt,eye,skyAnimated);
    if(dirty||skyAnimated||(video&&!video.paused)){if(time-lastRender<(innerWidth<650?40:32))return;camera.position.copy(eye);camera.lookAt(gaze);renderer.render(scene,camera);frames++;dirty=false;lastRender=time;}
  }
  renderer.setAnimationLoop(animate);
  addEventListener('pageshow',e=>{if(e.persisted){hidden=document.hidden;dirty=true;lastTime=0;media();renderer.setAnimationLoop(animate);}});
  return {visit,overview,setList(value){list=value;keys.clear();stopStick();dirty=true;media();},diagnostics:()=>({webgl:true,frames,moving:!!tween||!!keys.size||!!joystick.x||!!joystick.y,position:[+eye.x.toFixed(2),+eye.z.toFixed(2)],playing:video&&!video.paused?1:0,visible:!hidden&&!list,sky:{...sky.diagnostics(),animated:!hidden&&!list&&!reduced.matches}})};
}
