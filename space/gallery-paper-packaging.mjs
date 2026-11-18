import * as T from './vendor/three-0.180.0.mjs';
import {TOTEHMPAPER} from './gallery-artworks.mjs';

export const PAPER_CASE_SIGNATURE='/assets/img/wavywah_signature.png';
export const PAPER_CASE_FACE_RATIO=.68;

// One set of the original edition's materials for the table and the viewer.
export function createPaperEdition({anisotropy=4,onChange=()=>{}}={}){
 const textures=[],pending=[];
 const loader=globalThis.document?.createElementNS?new T.TextureLoader():null;
 function load(source,colorSpace=T.SRGBColorSpace){
  if(!loader)return null;
  let finish;
  pending.push(new Promise(resolve=>{finish=resolve;}));
  const map=loader.load(source,()=>{finish(true);onChange();},undefined,()=>finish(false));
  map.colorSpace=colorSpace;map.anisotropy=anisotropy;textures.push(map);return map;
 }
 const paperMaterial=new T.MeshStandardMaterial({map:load(TOTEHMPAPER.src),color:0xffffff,roughness:.59,side:T.DoubleSide,alphaTest:.12});
 const badgeMaterial=new T.MeshBasicMaterial({map:load('/assets/gallery/higher.svg'),transparent:true,alphaTest:.02,toneMapped:false});
 const signatureMaterial=new T.MeshBasicMaterial({alphaMap:load(PAPER_CASE_SIGNATURE,T.NoColorSpace),color:0xffffff,transparent:true,opacity:.85,toneMapped:false,depthWrite:false});
 return{paperMaterial,badgeMaterial,signatureMaterial,ready:Promise.all(pending).then(results=>results.every(Boolean)),
  dispose(){for(const texture of textures)texture.dispose();for(const m of [paperMaterial,badgeMaterial,signatureMaterial])m.dispose();}
 };
}

// The physical counterpart of get_higher.html's .box: black 180-square case,
// 50-deep sides, clear front and the original THP at 68% of the case width.
// Local +Z faces the viewer; the group is centred so its owner can lay it on
// the edition table or incline it. Resource callbacks belong to that owner.
export function createPaperPackaging({paperMaterial,badgeMaterial,signatureMaterial,geometry=g=>g,material=m=>m,width=.38}={}){
 if(!paperMaterial)throw new TypeError('A Totehmpaper material is required');
 const root=new T.Group();root.name='Totehmpaper — original premium glass case';
 const depth=width*50/180,halfDepth=depth/2,edgeWidth=width*1.5/180;
 const box=geometry(new T.BoxGeometry(1,1,1)),plane=geometry(new T.PlaneGeometry(1,1));
 const black=material(new T.MeshStandardMaterial({color:0x000000,roughness:.39,metalness:.18}));
 function block(p,size,name){
  const mesh=new T.Mesh(box,black);mesh.position.set(...p);mesh.scale.set(...size);mesh.name=name;
  mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
 }
 function sheet(m,p,size,name){
  const mesh=new T.Mesh(plane,m);mesh.position.set(...p);mesh.scale.set(size[0],size[1],1);mesh.name=name;root.add(mesh);return mesh;
 }
 block([0,0,-halfDepth],[width,width,edgeWidth],'Original matte-black case backing');
 for(const x of [-width/2,width/2])block([x,0,0],[edgeWidth,width+edgeWidth,depth],'Original black vertical side');
 for(const y of [-width/2,width/2])block([0,y,0],[width,edgeWidth,depth],'Original black horizontal side');
 const paperWidth=width*PAPER_CASE_FACE_RATIO;
 const paper=sheet(paperMaterial,[0,0,-width*12/180],[paperWidth,paperWidth],'One authentic THP protected inside its premium case');
 paper.castShadow=true;paper.receiveShadow=true;
 const rear=-halfDepth-edgeWidth/2-width*.002;
 if(badgeMaterial)sheet(badgeMaterial,[0,0,rear],[width*140/180,width*140/540],'Native Higher on the premium case reverse').rotation.y=Math.PI;
 if(signatureMaterial){
  const signature=sheet(signatureMaterial,[-width*58/180,-width*51/180,rear],[width*48/180,width*62/180],'Wah’s original signature on the reverse');
  signature.rotation.y=Math.PI;signature.renderOrder=5;
 }
 // These match .b-front and its diagonal ::before highlight. They avoid a
 // transmission pass, keeping six independent cases inexpensive on mobile.
 const glass=material(new T.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:.04,roughness:.10,metalness:.12,depthWrite:false,side:T.FrontSide}));
 const front=sheet(glass,[0,0,halfDepth+width*.0007],[width,width],'Original clear premium case glass');front.renderOrder=3;
 const glint=material(new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 vUv;void main(){float d=(vUv.x+1.-vUv.y)*.5;float a=d<.4?mix(.14,.03,d/.4):mix(.03,0.,clamp((d-.4)/.25,0.,1.));gl_FragColor=vec4(vec3(1.),a);}'
 }));
 sheet(glint,[0,0,halfDepth+width*.001],[width,width],'Original diagonal glass reflection').renderOrder=4;
 const rim=material(new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35,depthWrite:false,toneMapped:false}));
 sheet(rim,[0,width/2-width*.002,halfDepth+width*.0013],[width-edgeWidth,width*.0017],'Original fine upper glass edge').renderOrder=4;
 const half=width/2,face=front.position.z;
 root.userData={premiumPackaging:true,premiumSource:'/get_higher',sourceClasses:['box','b-back','b-logo','bside','b-front'],originalDimensions:[180,180,50],logoRatio:PAPER_CASE_FACE_RATIO,glassOpacity:.04,dimensions:[width+edgeWidth,width+edgeWidth,depth+edgeWidth],paperCount:1,
  signature:signatureMaterial?PAPER_CASE_SIGNATURE:null,
  faceCorners:[[-half,half,face],[half,half,face],[half,-half,face],[-half,-half,face]]
 };
 return root;
}
