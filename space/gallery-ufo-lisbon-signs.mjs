import * as T from './vendor/three-0.180.0.mjs';
import {LISBON_FRONT_NAMES,LISBON_FRONT_COPY,LISBON_FRONT_SIZE,lisbonFrontSigns} from './lisbon-first-page.mjs';
import {LISBON_URBEX_LAYOUT as L} from './gallery-lisbon-urbex-layout.mjs';

const frozen=value=>Object.freeze(Array.isArray(value)?value.slice():value);
export const UFO_LISBON_SIGNS_LAYOUT=Object.freeze({
 position:frozen(L.play.screen),size:frozen(L.play.screenSize),
 emitter:frozen([0,18.9,-4.2]),approach:frozen(L.play.approach),
 followPosition:frozen(L.seat.eye),href:'/play_lisbon_street?board=1',depth:1.1
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;

function opticalBeam(width,height,emitter){
 const corners=[[-width/2,height/2,-.12],[width/2,height/2,-.12],[width/2,-height/2,-.12],[-width/2,-height/2,-.12]];
 const positions=[],uvs=[];
 for(let n=0;n<4;n++){
  const a=new T.Vector3(...corners[n]),b=new T.Vector3(...corners[(n+1)%4]);
  const ea=emitter.clone().lerp(a,.025),eb=emitter.clone().lerp(b,.025);
  for(const p of [ea,eb,a,eb,b,a])positions.push(...p.toArray());
  uvs.push(0,0,1,0,0,1,1,0,1,1,0,1);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
 const material=new T.ShaderMaterial({
  transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,
  uniforms:{uTime:{value:0},uPower:{value:1}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:[
   'varying vec2 vUv;uniform float uTime,uPower;',
   'void main(){',
   'float ends=smoothstep(0.,.13,vUv.y)*(1.-smoothstep(.94,1.,vUv.y));',
   'float edge=smoothstep(0.,.07,vUv.x)*smoothstep(0.,.07,1.-vUv.x);',
   'float filament=pow(max(0.,cos(vUv.x*180.+vUv.y*24.)),16.);',
   'float pulse=.5+.5*sin(vUv.y*19.-uTime*1.2);',
   'vec3 ink=mix(vec3(.002,.003,.006),vec3(.075,.10,.15),filament*.3+pulse*.025);',
   'gl_FragColor=vec4(ink,uPower*ends*edge*(.12+filament*.035));',
   '}'
  ].join('\n')
 });
 const mesh=new T.Mesh(geometry,material);mesh.name='UFO Lisbon optical projection volume';
 return mesh;
}

function registrationGeometry(){
 const positions=[];
 for(const x of [-.5,.5])for(const y of [-.5,.5]){
  positions.push(x*.98,y*1.08,-.018,x*1.08,y*1.08,-.018,x*1.08,y*1.08,-.018,x*1.08,y*.98,-.018);
 }
 return new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3));
}

/**
 * Twenty-two separate, full-colour authored projections. There is no cinema
 * panel or invisible rectangle between the signs. The visible title is also
 * the legacy screen anchor; the caller owns navigation, access and the lift.
 */
export function createUfoLisbonSigns(parent,{
 mobile=false,onChange=()=>{},onSelect=()=>{},
 position=UFO_LISBON_SIGNS_LAYOUT.position,size=UFO_LISBON_SIGNS_LAYOUT.size,
 emitter=UFO_LISBON_SIGNS_LAYOUT.emitter,depth=UFO_LISBON_SIGNS_LAYOUT.depth,
 followPosition=UFO_LISBON_SIGNS_LAYOUT.followPosition
}={}){
 const width=Math.max(1,finite(size?.[0],16.8)),height=Math.max(1,finite(size?.[1],9.45)),volumeDepth=clamp(finite(depth,1.1),0,4);
 const root=new T.Group();root.name='UFO — twenty-two floating Lisbon signs';root.position.set(...position);parent.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),pickables=[],signs=[];
 const ownG=g=>(geometries.add(g),g),ownM=m=>(materials.add(m),m);
 const faceGeometry=ownG(new T.PlaneGeometry(1,1)),frameGeometry=ownG(registrationGeometry());
 let disposed=false,dirty=true,time=0,lastPose=-1,loaded=0,failed=0,titleReady=false,active=false,opened=false,opens=0,projecting=true,opacity=1,handoff=false,openCallback=onSelect;
 const changed=()=>{if(!disposed){dirty=true;onChange();}};
 const action={kind:'experience-projection',city:'lisbon',href:UFO_LISBON_SIGNS_LAYOUT.href,installation:'ufo-lisbon-signs'};
 function mark(object,data={}){object.userData={...object.userData,...action,...data};pickables.push(object);return object;}
 for(let i=0;i<LISBON_FRONT_NAMES.length;i++){
  const id=LISBON_FRONT_NAMES[i],group=new T.Group();group.name='Floating original Lisbon sign — '+id;root.add(group);
  const material=ownM(new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,alphaTest:.035,depthWrite:false,side:T.DoubleSide,toneMapped:false}));
  const face=mark(new T.Mesh(faceGeometry,material),{signId:id,id,source:'/assets/signs/'+id+'.png',authoredArtwork:true});
  face.name='UFO Lisbon sign face — '+id;group.add(face);
  const frameMaterial=ownM(new T.LineBasicMaterial({color:0xaebdcc,transparent:true,opacity:.16,depthWrite:false,toneMapped:false}));
  const frame=new T.LineSegments(frameGeometry,frameMaterial);frame.name='Projection registration corners — '+id;frame.raycast=()=>{};group.add(frame);
  const record={id,index:i,group,face,frame,loaded:false,aspect:[1,1]};signs.push(record);
  if(globalThis.document?.createElementNS){
   const texture=new T.TextureLoader().load('/assets/signs/'+id+'.png',map=>{
    if(disposed)return;
    const {width:sourceWidth,height:sourceHeight}=map.image;
    const largestSide=Math.max(sourceWidth,sourceHeight,1);
    record.aspect=[sourceWidth/largestSide,sourceHeight/largestSide];
    record.loaded=true;loaded++;material.opacity=opacity;pose();changed();
   },undefined,()=>{if(disposed)return;failed++;changed();});
   texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=mobile?2:4;
   texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;textures.add(texture);material.map=texture;
  }
 }
 function makeText(value,name,w,h,fontSize,color){
  const geometry=ownG(new T.PlaneGeometry(w,h)),material=ownM(new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,alphaTest:.02,depthWrite:false,side:T.DoubleSide,toneMapped:false}));
  const mesh=new T.Mesh(geometry,material);mesh.name=name;root.add(mesh);
  if(globalThis.document?.createElement){
   const canvas=document.createElement('canvas');canvas.width=2304;canvas.height=Math.max(128,Math.round(canvas.width*h/w));
   const context=canvas.getContext('2d');
   if(context){
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;textures.add(texture);material.map=texture;
    const draw=()=>{if(disposed)return;context.clearRect(0,0,canvas.width,canvas.height);context.textAlign='center';context.textBaseline='middle';context.font='700 '+fontSize+'px "Space Mono",monospace';context.fillStyle=color;context.fillText(value,canvas.width/2,canvas.height/2,canvas.width*.98);texture.needsUpdate=true;material.opacity=opacity;changed();};
    draw();document.fonts?.ready?.then(draw);return{mesh,ready:true};
   }
  }
  return{mesh,ready:false};
 }
 const textScale=width/16.8;
 const headline=makeText(LISBON_FRONT_COPY.headline,'Make them useful for your brain — projected title',12.5*textScale,1.35*textScale,116,'#e1e2e8');
 const screen=mark(headline.mesh,{projectedTitle:true,headline:LISBON_FRONT_COPY.headline});
 screen.position.set(0,(450-427)/900*height,.14);titleReady=headline.ready;
 const subtitle=makeText(LISBON_FRONT_COPY.subtitle,'Neurological & Digital Street Art — projected credit',7.4*textScale,.46*textScale,82,'#999aa6');
 subtitle.mesh.position.set(0,(450-501)/900*height,.14);
 const emitterLocal=new T.Vector3(...emitter).sub(root.position);
 const followLocal=new T.Vector3(...followPosition).sub(root.position);
 const beam=opticalBeam(width,height,emitterLocal);ownG(beam.geometry);ownM(beam.material);root.add(beam);
 const emitterGeometry=ownG(new T.RingGeometry(.30,.44,mobile?32:48)),emitterMaterial=ownM(new T.MeshBasicMaterial({color:0x819bc6,transparent:true,opacity:.24,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
 const emitterRing=new T.Mesh(emitterGeometry,emitterMaterial);emitterRing.name='UFO Lisbon sealed optical source';emitterRing.position.copy(emitterLocal);emitterRing.rotation.x=Math.PI/2;root.add(emitterRing);

 function pose(){
  const canonical=lisbonFrontSigns(time);
  for(let i=0;i<signs.length;i++){
   const sign=signs[i],p=canonical[i],w=p.size/LISBON_FRONT_SIZE.width*width,h=p.size/LISBON_FRONT_SIZE.height*height;
   sign.group.position.set((p.x/LISBON_FRONT_SIZE.width-.5)*width,(.5-p.y/LISBON_FRONT_SIZE.height)*height,volumeDepth*(Math.sin(time*.22+i*.83)*.22+Math.sin(i*1.37)*.46));
   sign.group.rotation.set(0,0,-p.rotation);sign.group.scale.set(w*sign.aspect[0],h*sign.aspect[1],1);
   sign.group.updateMatrix();
  }
  lastPose=time;
 }
 function visualState(){
  for(const sign of signs){sign.face.visible=!handoff;sign.frame.visible=!handoff;sign.face.material.opacity=sign.loaded?opacity:0;sign.frame.material.opacity=opacity*.16;}
  screen.material.opacity=headline.ready?opacity:0;subtitle.mesh.material.opacity=subtitle.ready?opacity:0;
  beam.material.uniforms.uPower.value=opacity;emitterMaterial.opacity=opacity*.24;
 }
 function projectObject(object,camera,viewportWidth,viewportHeight){
  object.updateWorldMatrix(true,false);
  const w=object.geometry.parameters?.width||1,h=object.geometry.parameters?.height||1;
  return[[-w/2,h/2,0],[w/2,h/2,0],[w/2,-h/2,0],[-w/2,-h/2,0]].map(p=>{
   const v=new T.Vector3(...p).applyMatrix4(object.matrixWorld).project(camera);
   return{x:(v.x+1)*viewportWidth/2,y:(1-v.y)*viewportHeight/2,z:v.z};
  });
 }
 function snapshot(camera,viewportWidth=globalThis.innerWidth||1600,viewportHeight=globalThis.innerHeight||900){
  if(!camera||disposed)return[];
  const vw=Math.max(1,finite(viewportWidth,1600)),vh=Math.max(1,finite(viewportHeight,900));
  root.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);
  return signs.map(sign=>{
   const c=projectObject(sign.face,camera,vw,vh),distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
   const hx=(c[1].x-c[0].x+c[2].x-c[3].x)/2,hy=(c[1].y-c[0].y+c[2].y-c[3].y)/2;
   return{id:sign.id,x:c.reduce((sum,p)=>sum+p.x,0)/4,y:c.reduce((sum,p)=>sum+p.y,0)/4,width:(distance(c[0],c[1])+distance(c[3],c[2]))/2,height:(distance(c[0],c[3])+distance(c[1],c[2]))/2,rotation:Math.atan2(hy,hx),corners:c.map(p=>({x:p.x,y:p.y}))};
  });
 }
 function worldPoint(local){root.updateWorldMatrix(true,false);return root.localToWorld(new T.Vector3(...local)).toArray();}
 const anchors={
  get center(){return worldPoint([0,0,0]);},
  get emitter(){return worldPoint(emitterLocal.toArray());},
  get title(){root.updateWorldMatrix(true,true);return screen.getWorldPosition(new T.Vector3()).toArray();},
  get follow(){return{position:worldPoint(followLocal.toArray()),target:this.title};},
  get envelope(){return[[-width/2,height/2,0],[width/2,height/2,0],[width/2,-height/2,0],[-width/2,-height/2,0]].map(worldPoint);},
  sign(id){const sign=signs.find(item=>item.id===id);if(!sign)return null;root.updateWorldMatrix(true,true);return{position:sign.face.getWorldPosition(new T.Vector3()).toArray(),width:sign.group.scale.x,height:sign.group.scale.y};}
 };
 function open(hit=null){
  if(disposed||opacity<.1)return false;opened=true;opens++;changed();
  const id=hit?.object?.userData?.signId||null;
  openCallback({href:UFO_LISBON_SIGNS_LAYOUT.href,projection:api,signId:id});return true;
 }
 function acceptHit(hit){const object=hit?.object;return!!(!disposed&&opacity>.1&&object&&pickables.includes(object)&&object.visible&&object.material?.opacity>.05);}
 function interact(value,hit=null){const result=value?.object?value:hit||{object:value};return acceptHit(result)?open(result):false;}
 pose();visualState();
 const api={root,screen,beam,signs,anchors,pickables,
  onOpen(fn){openCallback=typeof fn==='function'?fn:()=>{};},open,acceptHit,interact,
  setActive(value){active=!!value;if(!active)opened=false;},
  setProjecting(value){if(projecting!==!!value){projecting=!!value;changed();}},
  setHandoff(value){handoff=!!value;visualState();changed();},
  reset(){opened=false;handoff=false;visualState();changed();},
  handleKey(event){return active&&event?.key==='Enter'&&!event.repeat?open():false;},
  setTime(value){time=Math.max(0,finite(value,0));pose();changed();},
  snapshot,
  followSnapshot(camera,viewportWidth,viewportHeight){return{time,signs:snapshot(camera,viewportWidth,viewportHeight),follow:anchors.follow,title:anchors.title,emitter:anchors.emitter};},
  update(dt,eye,motion=true){
   if(disposed)return false;
   const elapsed=clamp(finite(dt,0),0,.1);if(motion)time+=elapsed;
   if(time-lastPose>=1/(mobile?16:24)){pose();dirty=true;}
   const target=projecting?1:0,next=motion?T.MathUtils.damp(opacity,target,6,elapsed):target;
   if(Math.abs(next-opacity)>.001||Math.abs(opacity-target)<.001&&opacity!==target){opacity=Math.abs(next-target)<.001?target:next;dirty=true;}
   visualState();beam.material.uniforms.uTime.value=time;
   const result=dirty||motion&&projecting&&elapsed>0;dirty=false;return result;
  },
  diagnostics:()=>({kind:'ufo-lisbon-floating-signs',city:'lisbon',canonicalFirstPage:true,blackPanel:false,independentSigns:true,signs:signs.length,loaded,failed,loadFailures:failed,ready:loaded===LISBON_FRONT_NAMES.length&&titleReady,coverReady:loaded===LISBON_FRONT_NAMES.length&&titleReady,lifeSize:true,widthRangeMetres:[138/1600*width,250/1600*width],headline:LISBON_FRONT_COPY.headline,title:LISBON_FRONT_COPY.headline,subtitle:LISBON_FRONT_COPY.subtitle,screenSize:[width,height],bottom:root.position.y-height/2,position:root.position.toArray(),beamSource:anchors.emitter,projectionDepth:volumeDepth,time:+time.toFixed(4),active,opened,opens,projecting,opacity,handoff,playing:false,videoDecoders:0,clickTargets:pickables.length,disposed}),
  dispose(){if(disposed)return;disposed=true;openCallback=()=>{};for(const texture of textures)texture.dispose();for(const g of geometries)g.dispose();for(const material of materials)material.dispose();root.removeFromParent();root.clear();signs.length=0;pickables.length=0;}
 };
 return api;
}
