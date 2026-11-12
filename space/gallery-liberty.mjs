import * as T from './vendor/three-0.180.0.mjs';
import {GLTFLoader} from './vendor/GLTFLoader-0.180.0.mjs';
import {MeshoptDecoder} from './vendor/meshopt_decoder.module.js';

// Colossal photogrammetric 3D scan of the Statue of Liberty (HAER NY-138 / Bartholdi bronze cast),
// scaled to monumental scale (188.7 m total height, 4.2x) and positioned in the open storm ocean
// off New York. Submerged in the rolling breakers, framed directly in the visitor's line of sight
// upon arrival on the terrace, with crashing wave foam, windblown sea spray, and a glowing amber torch beacon.
export const LIBERTY_LOCATION=Object.freeze({
 x:16,
 y:-115,
 z:-130,
 yaw:-.42,
 scale:4.2
});

export function createLiberty(scene,{mobile=false,onChange=()=>{},submerged=true}={}){
 const root=new T.Group();
 root.name='Liberty — monumental photogrammetric statue submerged in storm breakers';
 root.position.set(LIBERTY_LOCATION.x,LIBERTY_LOCATION.y,LIBERTY_LOCATION.z);
 root.rotation.y=LIBERTY_LOCATION.yaw;
 root.scale.setScalar(LIBERTY_LOCATION.scale);
 scene.add(root);

 const geometries=new Set(),materials=new Set(),textures=new Set();
 let disposed=false,dirty=true,time=0,loaded=false,triangles=0;

 // Precise center of the gilded torch flame from HAER NY-138 photogrammetry scan
 const TORCH_POS=new T.Vector3(-3.693,43.988,6.361);

 // 1. Powerful warm amber beacon light at the gilded torch flame tip
 const torchLight=new T.PointLight(0xffaa38,5400,340,2);
 torchLight.position.copy(TORCH_POS);
 root.add(torchLight);

 // 2. Luminous beacon corona sprite at the flame tip
 const canvas=globalThis.document?.createElement('canvas');
 let coronaMesh=null;
 if(canvas){
  canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  if(ctx){
   const g=ctx.createRadialGradient(64,64,0,64,64,64);
   g.addColorStop(0,'rgba(255,220,130,1)');
   g.addColorStop(.25,'rgba(255,160,50,.7)');
   g.addColorStop(.6,'rgba(255,90,20,.2)');
   g.addColorStop(1,'rgba(255,50,0,0)');
   ctx.fillStyle=g;
   ctx.fillRect(0,0,128,128);
   const coronaTex=new T.CanvasTexture(canvas);
   textures.add(coronaTex);
   const coronaMat=new T.SpriteMaterial({map:coronaTex,color:0xffbf60,transparent:true,blending:T.AdditiveBlending,depthWrite:false});
   materials.add(coronaMat);
   coronaMesh=new T.Sprite(coronaMat);
   coronaMesh.position.copy(TORCH_POS);
   coronaMesh.scale.set(14,14,1);
   root.add(coronaMesh);
  }
 }

 // 3. Cool moonlit fill across the drapery folds
 const moonFill=new T.PointLight(0x7cb5d8,2600,200,2);
 moonFill.position.set(6,28,16);
 root.add(moonFill);

 // 4. Upward ocean-bounce fill from churning sea foam beneath the waterline
 const seaFill=new T.PointLight(0x247568,3200,160,2);
 seaFill.position.set(0,9,10);
 root.add(seaFill);

 // 5. Crashing wave foam skirt ("claqué par les vagues") around the submerged body
 const foamUniforms={uTime:{value:0}};
 const foamVertexShader=`
  uniform float uTime;
  attribute float aPhase;
  attribute float aRadial;
  varying vec2 vUv;
  varying float vWave;
  varying float vSurge;
  void main(){
   vUv=uv;
   float phase=uTime*0.73+aPhase;
   float wave=sin(phase)*2.2+sin(phase*2.1+0.8)*0.9;
   float surge=max(0.0,sin(phase+0.42));
   vec3 p=position;
   p.y+=wave*aRadial+surge*2.4;
   p.x+=cos(phase)*0.8*aRadial;
   p.z+=sin(phase)*0.8*aRadial;
   vWave=wave;
   vSurge=surge;
   gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
  }
 `;
 const foamFragmentShader=`
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  varying float vSurge;
  void main(){
   float dist=length(vUv-0.5)*2.0;
   float lace=sin(vUv.x*48.0+uTime*1.8)*cos(vUv.y*36.0-uTime*1.4);
   float froth=0.5+0.5*lace;
   float edge=smoothstep(0.15,0.45,dist)*(1.0-smoothstep(0.75,0.98,dist));
   float alpha=edge*(0.40+0.50*vSurge+0.20*froth);
   vec3 deepWater=vec3(0.05,0.22,0.28);
   vec3 whitecap=vec3(0.88,0.94,0.98);
   vec3 col=mix(deepWater,whitecap,froth*0.65+vSurge*0.35);
   col+=vec3(0.12,0.08,0.03)*max(0.0,vSurge); // warm torch glint on crest
   if(alpha<0.01)discard;
   gl_FragColor=vec4(col,alpha*0.88);
  }
 `;
 const foamMat=new T.ShaderMaterial({
  uniforms:foamUniforms,
  vertexShader:foamVertexShader,
  fragmentShader:foamFragmentShader,
  transparent:true,
  side:T.DoubleSide,
  depthWrite:false
 });
 materials.add(foamMat);

 const foamRings=mobile?4:6,foamSlices=mobile?32:48;
 const foamGeo=new T.RingGeometry(5.2,22,foamSlices,foamRings);
 foamGeo.rotateX(-Math.PI/2);
 const fPos=foamGeo.attributes.position;
 const fCount=fPos.count;
 const fPhase=new Float32Array(fCount),fRadial=new Float32Array(fCount);
 for(let i=0;i<fCount;i++){
  const px=fPos.getX(i),pz=fPos.getZ(i);
  const r=Math.hypot(px,pz);
  const ang=Math.atan2(pz,px);
  fPhase[i]=ang*2.0+r*0.18;
  fRadial[i]=Math.min(1.0,(r-5.2)/12.0);
 }
 foamGeo.setAttribute('aPhase',new T.BufferAttribute(fPhase,1));
 foamGeo.setAttribute('aRadial',new T.BufferAttribute(fRadial,1));
 geometries.add(foamGeo);
 const foamMesh=new T.Mesh(foamGeo,foamMat);
 foamMesh.name='Crashing ocean wave foam skirt';
 foamMesh.position.set(0,8.2,1.2);
 root.add(foamMesh);

 // 6. Wave impact spindrift & sea spray particles bursting against the drapery
 const sprayCount=mobile?240:520;
 const sprayPositions=new Float32Array(sprayCount*3);
 const sprayLife=new Float32Array(sprayCount);
 const spraySpeed=new Float32Array(sprayCount);
 const sprayDir=new Float32Array(sprayCount*3);
 for(let i=0;i<sprayCount;i++){
  const ang=Math.PI*0.2+(Math.random()-0.5)*Math.PI*1.4;
  const rad=5.5+Math.random()*4.5;
  sprayPositions[i*3]=Math.cos(ang)*rad;
  sprayPositions[i*3+1]=7.5+Math.random()*3.5;
  sprayPositions[i*3+2]=Math.sin(ang)*rad+1.2;
  sprayLife[i]=Math.random();
  spraySpeed[i]=0.8+Math.random()*1.2;
  sprayDir[i*3]=(Math.random()-0.5)*0.8+0.4;
  sprayDir[i*3+1]=1.2+Math.random()*1.8;
  sprayDir[i*3+2]=(Math.random()-0.5)*0.8+0.5;
 }
 const sprayGeo=new T.BufferGeometry();
 sprayGeo.setAttribute('position',new T.BufferAttribute(sprayPositions,3));
 sprayGeo.setAttribute('aLife',new T.BufferAttribute(sprayLife,1));
 sprayGeo.setAttribute('aSpeed',new T.BufferAttribute(spraySpeed,1));
 sprayGeo.setAttribute('aDirection',new T.BufferAttribute(sprayDir,3));
 geometries.add(sprayGeo);

 const sprayUniforms={uTime:{value:0}};
 const sprayMat=new T.ShaderMaterial({
  uniforms:sprayUniforms,
  transparent:true,
  depthWrite:false,
  blending:T.NormalBlending,
  vertexShader:`
   uniform float uTime;
   attribute float aLife;
   attribute float aSpeed;
   attribute vec3 aDirection;
   varying float vAlpha;
   void main(){
    float t=fract(aLife+uTime*0.32);
    vec3 p=position+aDirection*(t*aSpeed*9.5);
    p.y+=sin(t*3.14159)*9.0-t*t*6.0; // arching ballistic trajectory
    p.x+=t*2.8; // windblown drift
    p.z+=t*4.2;
    vAlpha=sin(t*3.14159)*pow(1.0-t,0.65);
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_PointSize=clamp(240.0/-mv.z,2.0,36.0);
    gl_Position=projectionMatrix*mv;
   }
  `,
  fragmentShader:`
   varying float vAlpha;
   void main(){
    vec2 p=gl_PointCoord-0.5;
    float distSq=dot(p,p);
    if(distSq>0.25)discard;
    float soft=exp(-distSq*9.0);
    gl_FragColor=vec4(0.86,0.92,0.96,vAlpha*soft*0.75);
   }
  `
 });
 materials.add(sprayMat);
 const sprayParticles=new T.Points(sprayGeo,sprayMat);
 sprayParticles.name='Windblown sea spray from breaking wave crests';
 root.add(sprayParticles);

 // 7. Load authentic photogrammetric 3D scan GLB
 const assetPath=mobile?'/assets/liberty/liberty_statue_l1.glb':'/assets/liberty/liberty_statue_l0.glb';

 if(globalThis.document){
  const loader=new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(assetPath,gltf=>{
   if(disposed){gltf.scene?.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return;}
   const model=gltf.scene;
   model.name='Statue of Liberty — photogrammetric mesh';
   model.traverse(o=>{
    if(o.isMesh){
     o.castShadow=false;
     o.receiveShadow=true;
     if(o.geometry){
      geometries.add(o.geometry);
      triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
     }
     if(o.material){
      materials.add(o.material);
      // Gilded 24k torch flame: radiant warm golden emission
      if(o.name==='statue_2'||o.material.name==='lb:gold'||o.name.includes('gold')||o.material.name?.includes('gold')){
       o.material.color.set(0xffcf68);
       o.material.emissive=new T.Color(0xff8c18);
       o.material.emissiveIntensity=2.6;
       o.material.roughness=0.22;
       o.material.metalness=0.88;
      }else{
       // Weathered marine Bartholdi copper verdigris patina with rain/wave sheen
       o.material.color.set(0x4c857b);
       o.material.roughness=0.40;
       o.material.metalness=0.28;
      }
     }
    }
   });
   root.add(model);
   loaded=true;
   dirty=true;
   onChange();
  },undefined,err=>{
   console.warn('[liberty] GLB load fallback:',err?.message||err);
  });
 }

 return {
  root,
  update(dt,eye,motion=true){
   if(disposed)return false;
   if(motion){
    const delta=Math.max(0,Math.min(Number(dt)||0,.1));
    time+=delta;
    // Multi-harmonic torch flame flicker
    torchLight.intensity=5200+Math.sin(time*2.1)*680+Math.cos(time*4.7)*360+Math.sin(time*10.3)*180;
    if(coronaMesh){
     const coronaScale=13+Math.sin(time*3.4)*1.6+Math.cos(time*6.8)*0.8;
     coronaMesh.scale.set(coronaScale,coronaScale,1);
    }
    foamUniforms.uTime.value=time;
    sprayUniforms.uTime.value=time;
    dirty=true;
   }
   const was=dirty;dirty=false;return was;
  },
  diagnostics:()=>({
   kind:'photogrammetric-statue-of-liberty',
   place:'new-york',
   ready:loaded||!globalThis.document,
   loaded,
   submerged:true,
   modelAsset:assetPath,
   photogrammetry:true,
   source:'jerryfisher / HAER NY-138',
   heightMetres:+(44.93*LIBERTY_LOCATION.scale).toFixed(2),
   scale:LIBERTY_LOCATION.scale,
   location:[LIBERTY_LOCATION.x,LIBERTY_LOCATION.y,LIBERTY_LOCATION.z],
   yaw:LIBERTY_LOCATION.yaw,
   gildedTorch:true,
   beaconIntensity:+torchLight.intensity.toFixed(1),
   copperPatina:true,
   crashingWaveFoam:true,
   seaSprayParticles:sprayCount,
   triangles,
   time:+time.toFixed(3),
   disposed
  }),
  dispose(){
   if(disposed)return;
   disposed=true;
   root.removeFromParent();
   for(const g of geometries)g.dispose();
   for(const m of materials)m.dispose();
   for(const t of textures)t.dispose();
   root.clear();
   onChange();
  }
 };
}
