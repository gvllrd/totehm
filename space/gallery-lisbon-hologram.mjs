import * as T from './vendor/three-0.180.0.mjs';
import {PLAY_SIGNS} from './gallery-play-installation.mjs';
import {LISBON_URBEX_LAYOUT as L} from './gallery-lisbon-urbex-layout.mjs';

// A volume of light in front of stone: separate floating originals, a nearly
// invisible optical field and a recessed projector. No opaque screen or video.
export function createLisbonHologram(parent,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Play the Street — monumental interior hologram';root.position.set(...L.play.screen);parent.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),pickables=[],panels=[];
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 let disposed=false,dirty=true,active=false,opened=false,clock=0,loaded=0,failed=0,headingLoaded=false,opens=0,animated=false,lastDraw=0,openCallback=()=>{};
 const changed=()=>{if(!disposed){dirty=true;onChange();}};
 const data={kind:'lisbon-street-installation',installation:'play',room:2,playAction:'open',href:L.play.href,hologram:true};
 const mark=object=>{object.userData={...object.userData,...data};pickables.push(object);return object;};
 function mesh(g,m,p,name){const o=new T.Mesh(g,m);o.position.set(...p);o.name=name;o.castShadow=false;root.add(o);return o;}
 const optical=material(new T.MeshBasicMaterial({color:0x7699d3,transparent:true,opacity:.035,depthWrite:false,side:T.DoubleSide,toneMapped:false,blending:T.AdditiveBlending}));
 const screen=mark(mesh(geometry(new T.PlaneGeometry(...L.play.screenSize)),optical,[0,0,-.2],'Transparent holographic field — stone visible through it'));
 const beamGeometry=geometry(new T.BufferGeometry());
 beamGeometry.setAttribute('position',new T.Float32BufferAttribute([-5.9,-3.38,0,-6.6,2.575,-.2,6.6,2.575,-.2,-5.9,-3.38,0,6.6,2.575,-.2,5.9,-3.38,0],3));
 const beam=mesh(beamGeometry,material(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,
  vertexShader:'varying vec3 vPoint;void main(){vPoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec3 vPoint;void main(){float rise=clamp((vPoint.y+3.38)/5.96,0.,1.);float ray=.35+.65*pow(.5+.5*sin(vPoint.x*23.+rise*9.),12.);gl_FragColor=vec4(.35,.58,.95,(1.-rise)*.038*ray);}'
 })),[0,0,-.24],'Volumetric hologram projection rising from the black emitter');beam.renderOrder=1;
 const light=material(new T.MeshBasicMaterial({color:0xa5c9ef,transparent:true,opacity:.32,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending}));
 const lines=[];
 for(let y=-2.45;y<=2.45;y+=.115)lines.push(-6.6,y,-.17,6.6,y,-.17);
 const scan=new T.BufferGeometry();scan.setAttribute('position',new T.Float32BufferAttribute(lines,3));geometry(scan);
 const scanlines=new T.LineSegments(scan,material(new T.LineBasicMaterial({color:0x91c5ee,transparent:true,opacity:.045,depthWrite:false,blending:T.AdditiveBlending})));scanlines.name='Fine holographic scan lines';root.add(scanlines);
 const cornerGeometry=geometry(new T.BoxGeometry(1,1,1));
 for(const x of [-6.6,6.6])for(const y of [-2.575,2.575]){
  const a=mesh(cornerGeometry,light,[x-Math.sign(x)*.16,y,-.18],'Hologram corner light');a.scale.set(.32,.012,.012);
  const b=mesh(cornerGeometry,light,[x,y-Math.sign(y)*.16,-.18],'Hologram corner light');b.scale.set(.012,.32,.012);
 }
 function imageMaterial(src,ready){
  const m=material(new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,alphaTest:.035,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
  if(globalThis.document?.createElementNS){const map=new T.TextureLoader().load(src,t=>{if(disposed)return;m.opacity=.86;ready(t);changed();},undefined,()=>{failed++;changed();});map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;textures.add(map);m.map=map;}
  return m;
 }
 let seed=731;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 PLAY_SIGNS.forEach((source,i)=>{
  const col=i%6,row=Math.floor(i/6),width=['destination','crosswalk','pharma'].includes(source.id)?1.55:1.03;
  const m=imageMaterial(source.src,()=>{loaded++;}),g=geometry(new T.PlaneGeometry(width,width));
  const sign=mark(mesh(g,m,[-5.3+col*2.1+(row%2)*.17,1.62-row*1.08,.10+random()*.65],'Floating holographic original — '+source.id));
  sign.userData={...sign.userData,id:source.id,source:source.src};sign.rotation.z=(random()-.5)*.26;
  const auraMaterial=material(new T.MeshBasicMaterial({map:m.map,color:0x8dbbff,transparent:true,opacity:.14,depthWrite:false,side:T.DoubleSide,toneMapped:false,blending:T.AdditiveBlending}));
  const aura=new T.Mesh(g,auraMaterial);aura.name='Holographic light halo — '+source.id;aura.scale.setScalar(1.045);aura.position.z=-.022;sign.add(aura);
  panels.push({id:source.id,mesh:sign,x:sign.position.x,y:sign.position.y,z:sign.position.z,phase:random()*Math.PI*2,spin:sign.rotation.z});
 });
 const title=mark(mesh(geometry(new T.PlaneGeometry(2.4,.8)),imageMaterial('/assets/gallery/higher.svg',()=>{headingLoaded=true;}),[4.15,-1.73,.45],'Native Higher hovering inside the optical field'));title.userData.nativeHigherHoles=18;
 const projector=mesh(geometry(new T.BoxGeometry(12,.08,.2)),material(new T.MeshPhysicalMaterial({color:0x000000,metalness:.72,roughness:.18,clearcoat:.8})),[0,-3.43,0],'Deep black recessed hologram projector');projector.userData.support='black';
 mesh(geometry(new T.BoxGeometry(11.8,.006,.025)),light,[0,-3.38,.06],'Hairline hologram emitter');
 function open(){if(disposed)return false;opened=true;opens++;changed();openCallback({href:L.play.href});return true;}
 return{root,screen,panels,pickables,onOpen(fn){openCallback=fn;},onState(){},open,
  setActive(value){active=!!value;if(!active)opened=false;changed();},acceptHit:h=>pickables.includes(h?.object),
  interact(value){if(!pickables.includes(value?.object||value))return false;return open();},
  handleKey(event){if(active&&event.key==='Enter'&&!event.repeat)return open();return false;},
  update(dt,eye,motion=true){if(disposed)return false;animated=!!motion;if(motion){clock+=Math.min(.1,Math.max(0,Number(dt)||0));if(clock-lastDraw>1/(mobile?12:18)){lastDraw=clock;for(const p of panels){p.mesh.position.set(p.x+Math.sin(clock*.12+p.phase)*.13,p.y+Math.sin(clock*.17+p.phase)*.09,p.z+Math.sin(clock*.14+p.phase)*.17);p.mesh.rotation.z=p.spin+Math.sin(clock*.06+p.phase)*.11;}dirty=true;}}const result=dirty;dirty=false;return result;},
  diagnostics:()=>({kind:'lisbon-interior-hologram',hologram:true,inside:true,transparentField:true,opaqueScreen:false,screenSize:[...L.play.screenSize],position:root.position.toArray(),signs:panels.length,loaded,failed,coverReady:loaded===22&&headingLoaded,ready:loaded===22&&headingLoaded,originalSignImages:true,active,focused:active,opened,opens,animated,playing:false,inGalleryPlayback:false,videoDecoders:0,mediaSource:null,curved:false,compoundCurvature:false,standalone:L.play.href,disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.clear();openCallback=()=>{};}
 };
}
