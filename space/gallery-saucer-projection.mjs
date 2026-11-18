import * as T from './vendor/three-0.180.0.mjs';
import {createLisbonFirstPage} from './lisbon-first-page.mjs';
import {createOppositesFront} from './opposites-front.mjs';
import {LISBON_URBEX_LAYOUT} from './gallery-lisbon-urbex-layout.mjs';

export const PROJECTION_LAYOUTS=Object.freeze({
 lisbon:{position:LISBON_URBEX_LAYOUT.play.screen,size:LISBON_URBEX_LAYOUT.play.screenSize,approach:LISBON_URBEX_LAYOUT.play.approach},
 'new-york':{position:[0,5,-9],size:[14.4,8.1],approach:[0,1.65,.5]}
});
const emitterPosition=[0,18.9,-4.2];

function createOpticalBeam(width,height,emitter){
 const corners=[[-width/2,height/2,-.08],[width/2,height/2,-.08],[width/2,-height/2,-.08],[-width/2,-height/2,-.08]];
 const positions=[],coordinates=[];
 for(let n=0;n<4;n++){
  const a=new T.Vector3(...corners[n]),b=new T.Vector3(...corners[(n+1)%4]);
  const topA=emitter.clone().lerp(a,.028),topB=emitter.clone().lerp(b,.028);
  positions.push(...topA.toArray(),...topB.toArray(),...a.toArray(),...topB.toArray(),...b.toArray(),...a.toArray());
  coordinates.push(0,0,1,0,0,1,1,0,1,1,0,1);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new T.Float32BufferAttribute(coordinates,2));
 const material=new T.ShaderMaterial({
  transparent:true,side:T.DoubleSide,depthWrite:false,toneMapped:false,
  uniforms:{uTime:{value:0},uPower:{value:1}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 vUv; uniform float uTime,uPower;
   void main(){
    float spread=smoothstep(0.,.16,vUv.y)*(1.-smoothstep(.86,1.,vUv.y));
    float feather=smoothstep(0.,.075,vUv.x)*smoothstep(0.,.075,1.-vUv.x);
    float filament=pow(max(0.,cos(vUv.x*155.+vUv.y*17.)),12.);
    float pulse=.5+.5*sin(vUv.y*18.-uTime*1.7);
    vec3 ink=mix(vec3(.003,.004,.008),vec3(.085,.13,.21),filament*.38+pulse*.09);
    gl_FragColor=vec4(ink,uPower*spread*feather*(.30+filament*.08));
   }`
 });
 const mesh=new T.Mesh(geometry,material);mesh.name='Feathered optical projection from the saucer';return mesh;
}

export function createSaucerProjection(parent,{city='lisbon',mobile=false,onChange=()=>{}}={}){
 const layout=PROJECTION_LAYOUTS[city],root=new T.Group();root.name='Suspended cinema projection';root.position.set(...layout.position);parent.add(root);
 let disposed=false,dirty=true,active=false,opened=false,opens=0,projecting=true,opacity=1,callback=()=>{},drawTime=0,clock=0;
 const changed=()=>{if(!disposed){dirty=true;onChange();}};
 const front=globalThis.document?(city==='lisbon'?createLisbonFirstPage:createOppositesFront)({width:mobile?1024:1600,height:mobile?576:900,onChange:changed}):null;
 const texture=front?.canvas?new T.CanvasTexture(front.canvas):null;
 if(texture){texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;}
 const material=new T.MeshBasicMaterial({map:texture,color:texture?0xffffff:0x000000,toneMapped:false,transparent:true});
 const geometry=new T.PlaneGeometry(...layout.size),screen=new T.Mesh(geometry,material);screen.name='Floating original first page';
 screen.userData={kind:'experience-projection',city,href:city==='lisbon'?'/play_lisbon_street':'/think_same_but_opposite'};root.add(screen);
 const emitter=new T.Vector3(...emitterPosition).sub(root.position);
 const [width,height]=layout.size,beam=createOpticalBeam(width,height,emitter);root.add(beam);
 const rimMaterial=new T.LineBasicMaterial({color:0x93aee1,transparent:true,opacity:.42,depthWrite:false});
 const rimVertices=[[-width/2,height/2],[width/2,height/2],[width/2,-height/2],[-width/2,-height/2]].map(([x,y])=>new T.Vector3(x,y,.006));
 const rimGeometry=new T.BufferGeometry().setFromPoints(rimVertices);
 const rim=new T.LineLoop(rimGeometry,rimMaterial);rim.name='Fine illuminated cinema aperture';root.add(rim);
 const locatorMaterial=new T.MeshBasicMaterial({color:0x819bc6,transparent:true,opacity:.40,depthWrite:false,toneMapped:false});
 const locatorGeometry=new T.RingGeometry(.33,.53,48),locator=new T.Mesh(locatorGeometry,locatorMaterial);
 locator.position.copy(emitter);locator.rotation.x=Math.PI/2;locator.name='Sealed optical emitter';root.add(locator);
 function open(hit){
  if(disposed||opacity<.9)return false;
  opened=true;opens++;let href=screen.userData.href;
  if(city==='new-york'&&hit?.uv){const work=front?.hit(hit.uv.x,1-hit.uv.y);if(work)href+='?work='+encodeURIComponent(work.id);}
  callback({href,projection:api});return true;
 }
 const api={root,screen,rim,front,pickables:[screen],onOpen(fn){callback=fn;},setProjecting(value){projecting=!!value;},
  setActive(value){active=!!value;if(!active)opened=false;},reset(){opened=false;},acceptHit:h=>h?.object===screen,interact:open,open,
  handleKey(event){return active&&event.key==='Enter'&&!event.repeat?open():false;},
  update(dt,eye,motion=true){
   if(disposed)return false;
   if(motion)clock+=dt;
   if(city==='new-york')front?.update(dt,motion);
   const time=front?.diagnostics().time||0;
   if(texture&&(dirty||time-drawTime>1/(mobile?16:24))){texture.needsUpdate=true;drawTime=time;dirty=true;}
   const target=projecting?1:0,next=motion?T.MathUtils.damp(opacity,target,6,Math.min(.1,dt)):target;
   if(Math.abs(next-opacity)>.001){opacity=next;dirty=true;}
   material.opacity=opacity;beam.material.uniforms.uPower.value=opacity;
   beam.material.uniforms.uTime.value=clock;rimMaterial.opacity=opacity*.42;locatorMaterial.opacity=opacity*.40;
   const result=dirty||motion&&projecting;dirty=false;return result;
  },
  diagnostics:()=>({kind:'saucer-first-page-projection',city,canonicalFirstPage:true,blackPanel:true,blackBeam:true,
   opticalBeam:true,beamSource:emitterPosition,screenSize:layout.size,position:layout.position,bottom:layout.position[1]-height/2,
   signs:city==='lisbon'?22:0,works:city==='new-york'?6:0,coverReady:!!front?.diagnostics().ready,ready:!!front?.diagnostics().ready,
   time:front?.diagnostics().time||0,active,opened,opens,playing:false,videoDecoders:0,projecting,opacity,front:front?.diagnostics()||null}),
  dispose(){disposed=true;front?.dispose();texture?.dispose();geometry.dispose();material.dispose();rimGeometry.dispose();rimMaterial.dispose();locatorGeometry.dispose();locatorMaterial.dispose();beam.geometry.dispose();beam.material.dispose();root.removeFromParent();root.clear();}
 };
 return api;
}
