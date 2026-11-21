import * as T from './vendor/three-0.180.0.mjs';
import {GLTFLoader} from './vendor/GLTFLoader-0.180.0.mjs';
import {MeshoptDecoder} from './vendor/meshopt_decoder.module.js';

// Monumental 3D models of Lisbon's iconic maritime landmarks:
// 1. Santuário de Cristo Rei (Almada / Lisbon) — 110 m colossal monument (82 m 4-pillar reinforced
//    concrete portico pedestal and 28 m statue of Christ overlooking Lisbon and the Tagus).
// 2. Ponte 25 de Abril (Lisbon Suspension Bridge) — 190.5 m twin red steel lattice towers, suspension
//    main cables, and stiffening truss spanning across the Atlantic horizon in the submerged ocean.
// Both submerged in the rolling breakers off Lisbon, with crashing wave foam, windblown sea spray,
// pulsating red aviation tower beacons, and lunar corona illumination.

export const CRISTO_REI_LOCATION = Object.freeze({
 x: -92,
 y: -42,
 z: -145,
 yaw: 0.65,
 scale: 1.35
});

export const PONTE_25_ABRIL_LOCATION = Object.freeze({
 x: -60,
 y: -11.5,
 z: -270,
 yaw: -0.38,
 scale: 0.82
});

export function createLisbonSeaMonuments(scene,{mobile=false,onChange=()=>{},submerged=true}={}){
 const root=new T.Group();
 root.name='Lisbon Sea Monuments — Cristo Rei & Ponte 25 de Abril submerged in ocean breakers';
 scene.add(root);

 const geometries=new Set(),materials=new Set(),textures=new Set();
 let disposed=false,dirty=true,time=0,loaded=false,triangles=0;

 // ==========================================
 // 1. CRISTO REI ROOT & LIGHTS
 // ==========================================
 const cristoRoot=new T.Group();
 cristoRoot.name='Cristo Rei — colossal sanctuary monument';
 cristoRoot.position.set(CRISTO_REI_LOCATION.x,CRISTO_REI_LOCATION.y,CRISTO_REI_LOCATION.z);
 cristoRoot.rotation.y=CRISTO_REI_LOCATION.yaw;
 cristoRoot.scale.setScalar(CRISTO_REI_LOCATION.scale);
 root.add(cristoRoot);

 // Head of Christ in local coordinate space (y ~ 116 m in original model)
 const CRISTO_HEAD_POS=new T.Vector3(0,116,0);

 // Lunar halo corona sprite crowning the head of Christ
 const canvas=globalThis.document?.createElement('canvas');
 let cristoCoronaMesh=null;
 if(canvas){
  canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  if(ctx){
   const g=ctx.createRadialGradient(64,64,0,64,64,64);
   g.addColorStop(0,'rgba(255,245,210,1)');
   g.addColorStop(.28,'rgba(240,210,130,.65)');
   g.addColorStop(.62,'rgba(180,195,240,.22)');
   g.addColorStop(1,'rgba(100,140,220,0)');
   ctx.fillStyle=g;
   ctx.fillRect(0,0,128,128);
   const coronaTex=new T.CanvasTexture(canvas);
   textures.add(coronaTex);
   const coronaMat=new T.SpriteMaterial({map:coronaTex,color:0xffeed0,transparent:true,blending:T.AdditiveBlending,depthWrite:false});
   materials.add(coronaMat);
   cristoCoronaMesh=new T.Sprite(coronaMat);
   cristoCoronaMesh.position.copy(CRISTO_HEAD_POS);
   cristoCoronaMesh.scale.set(22,22,1);
   cristoRoot.add(cristoCoronaMesh);
  }
 }

 // Cool moonlight directional / fill across the monument
 const cristoMoonFill=new T.PointLight(0x8bc2e8,3400,240,2);
 cristoMoonFill.position.set(12,85,25);
 cristoRoot.add(cristoMoonFill);

 // Upward ocean-bounce glow reflecting the churning sea waves against the pedestal columns
 const cristoSeaBounce=new T.PointLight(0x1a6b60,3800,180,2);
 cristoSeaBounce.position.set(0,32,0);
 cristoRoot.add(cristoSeaBounce);

 // ==========================================
 // 2. PONTE 25 DE ABRIL ROOT & LIGHTS
 // ==========================================
 const bridgeRoot=new T.Group();
 bridgeRoot.name='Ponte 25 de Abril — suspension bridge across Tagus horizon';
 bridgeRoot.position.set(PONTE_25_ABRIL_LOCATION.x,PONTE_25_ABRIL_LOCATION.y,PONTE_25_ABRIL_LOCATION.z);
 bridgeRoot.rotation.y=PONTE_25_ABRIL_LOCATION.yaw;
 bridgeRoot.scale.setScalar(PONTE_25_ABRIL_LOCATION.scale);
 root.add(bridgeRoot);

 // Pulsing red aviation warning beacons atop the twin 190.5 m suspension towers
 // In the bridge model, the main towers are centered around x ~ -140 and z ~ -500 / +500
 const TOWER1_TOP=new T.Vector3(-140,190,-490);
 const TOWER2_TOP=new T.Vector3(-140,190,510);

 const towerBeacon1=new T.PointLight(0xff2a18,4800,260,2);
 towerBeacon1.position.copy(TOWER1_TOP);
 bridgeRoot.add(towerBeacon1);

 const towerBeacon2=new T.PointLight(0xff2a18,4800,260,2);
 towerBeacon2.position.copy(TOWER2_TOP);
 bridgeRoot.add(towerBeacon2);

 // Tower beacon luminous sprites
 let beaconSprite1=null,beaconSprite2=null;
 const beaconCanvas=globalThis.document?.createElement('canvas');
 if(beaconCanvas){
  beaconCanvas.width=beaconCanvas.height=64;
  const bctx=beaconCanvas.getContext('2d');
  if(bctx){
   const bg=bctx.createRadialGradient(32,32,0,32,32,32);
   bg.addColorStop(0,'rgba(255,100,80,1)');
   bg.addColorStop(.35,'rgba(255,30,10,.7)');
   bg.addColorStop(1,'rgba(180,0,0,0)');
   bctx.fillStyle=bg;
   bctx.fillRect(0,0,64,64);
   const beaconTex=new T.CanvasTexture(beaconCanvas);
   textures.add(beaconTex);
   const beaconMat=new T.SpriteMaterial({map:beaconTex,color:0xff3322,transparent:true,blending:T.AdditiveBlending,depthWrite:false});
   materials.add(beaconMat);

   beaconSprite1=new T.Sprite(beaconMat);
   beaconSprite1.position.copy(TOWER1_TOP);
   beaconSprite1.scale.set(16,16,1);
   bridgeRoot.add(beaconSprite1);

   beaconSprite2=new T.Sprite(beaconMat);
   beaconSprite2.position.copy(TOWER2_TOP);
   beaconSprite2.scale.set(16,16,1);
   bridgeRoot.add(beaconSprite2);
  }
 }

 // Amber roadway lights glowing across the central suspension deck
 const roadGlow=new T.PointLight(0xffa840,3200,380,2);
 roadGlow.position.set(-140,70,0);
 bridgeRoot.add(roadGlow);

 // Cool moonlit sheen along the red steel truss & towers
 const bridgeMoon=new T.PointLight(0x7eaed6,2800,420,2);
 bridgeMoon.position.set(80,140,0);
 bridgeRoot.add(bridgeMoon);

 // ==========================================
 // 3. CRASHING OCEAN WAVE FOAM SKIRTS
 // ==========================================
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
   float phase=uTime*0.68+aPhase;
   float wave=sin(phase)*2.4+sin(phase*2.05+0.9)*1.1;
   float surge=max(0.0,sin(phase+0.38));
   vec3 p=position;
   p.y+=wave*aRadial+surge*2.6;
   p.x+=cos(phase)*0.85*aRadial;
   p.z+=sin(phase)*0.85*aRadial;
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
   float lace=sin(vUv.x*44.0+uTime*1.7)*cos(vUv.y*34.0-uTime*1.3);
   float froth=0.5+0.5*lace;
   float edge=smoothstep(0.12,0.42,dist)*(1.0-smoothstep(0.72,0.98,dist));
   float alpha=edge*(0.38+0.52*vSurge+0.22*froth);
   vec3 deepWater=vec3(0.04,0.20,0.26);
   vec3 whitecap=vec3(0.86,0.93,0.98);
   vec3 col=mix(deepWater,whitecap,froth*0.65+vSurge*0.35);
   col+=vec3(0.10,0.07,0.03)*max(0.0,vSurge);
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

 function makeFoamSkirt(innerR,outerR,slices,rings){
  const geo=new T.RingGeometry(innerR,outerR,slices,rings);
  geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;
  const count=pos.count;
  const phase=new Float32Array(count),radial=new Float32Array(count);
  for(let i=0;i<count;i++){
   const px=pos.getX(i),pz=pos.getZ(i);
   const r=Math.hypot(px,pz);
   const ang=Math.atan2(pz,px);
   phase[i]=ang*2.0+r*0.16;
   radial[i]=Math.min(1.0,(r-innerR)/(outerR-innerR));
  }
  geo.setAttribute('aPhase',new T.BufferAttribute(phase,1));
  geo.setAttribute('aRadial',new T.BufferAttribute(radial,1));
  geometries.add(geo);
  return new T.Mesh(geo,foamMat);
 }

 const slices=mobile?32:48,rings=mobile?4:6;
 // Foam skirt around Cristo Rei four concrete pillar legs (waterline is around local Y = 30.5 / scale = 22.6)
 const cristoFoam=makeFoamSkirt(18,52,slices,rings);
 cristoFoam.name='Crashing ocean wave foam skirt — Cristo Rei base';
 cristoFoam.position.set(0,22.6,0);
 cristoRoot.add(cristoFoam);

 // Foam skirts around Ponte 25 de Abril main tower piers at water level (local Y = 0)
 const bridgePierFoam1=makeFoamSkirt(12,44,slices,rings);
 bridgePierFoam1.name='Crashing wave foam — Ponte 25 de Abril Tower 1';
 bridgePierFoam1.position.set(-140,0,-490);
 bridgeRoot.add(bridgePierFoam1);

 const bridgePierFoam2=makeFoamSkirt(12,44,slices,rings);
 bridgePierFoam2.name='Crashing wave foam — Ponte 25 de Abril Tower 2';
 bridgePierFoam2.position.set(-140,0,510);
 bridgeRoot.add(bridgePierFoam2);

 // ==========================================
 // 4. WINDBLOWN SEA SPRAY PARTICLES
 // ==========================================
 const sprayCount=mobile?260:540;
 const sprayPositions=new Float32Array(sprayCount*3);
 const sprayLife=new Float32Array(sprayCount);
 const spraySpeed=new Float32Array(sprayCount);
 const sprayDir=new Float32Array(sprayCount*3);
 for(let i=0;i<sprayCount;i++){
  const ang=Math.PI*0.15+(Math.random()-0.5)*Math.PI*1.5;
  const rad=16+Math.random()*18;
  sprayPositions[i*3]=Math.cos(ang)*rad;
  sprayPositions[i*3+1]=22+Math.random()*6;
  sprayPositions[i*3+2]=Math.sin(ang)*rad;
  sprayLife[i]=Math.random();
  spraySpeed[i]=0.85+Math.random()*1.3;
  sprayDir[i*3]=(Math.random()-0.5)*0.8+0.5;
  sprayDir[i*3+1]=1.1+Math.random()*2.0;
  sprayDir[i*3+2]=(Math.random()-0.5)*0.8+0.4;
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
    float t=fract(aLife+uTime*0.30);
    vec3 p=position+aDirection*(t*aSpeed*11.0);
    p.y+=sin(t*3.14159)*10.5-t*t*7.5;
    p.x+=t*3.2;
    p.z+=t*4.6;
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
 sprayParticles.name='Windblown ocean spray from breakers';
 cristoRoot.add(sprayParticles);

 // ==========================================
 // 5. LOAD 3D GLB MONUMENT ASSETS
 // ==========================================
 const cristoAsset=mobile?'/assets/lisbon/cristo_rei_l1.glb':'/assets/lisbon/cristo_rei_l0.glb';
 const bridgeAsset=mobile?'/assets/lisbon/ponte_25_abril_l1.glb':'/assets/lisbon/ponte_25_abril_l0.glb';

 if(globalThis.document){
  const loader=new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  // Load Cristo Rei
  loader.load(cristoAsset,gltf=>{
   if(disposed){gltf.scene?.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return;}
   const model=gltf.scene;
   model.name='Cristo Rei — architectural 3D monument';
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
      const name=(o.material.name||'').toLowerCase();
      if(name.includes('concrete')||name.includes('pedestal')||name.includes('floor')){
       // Weathered architectural concrete / limestone portico pillars with maritime dampness
       o.material.color.set(0xbcbaa8);
       o.material.roughness=0.62;
       o.material.metalness=0.08;
      }else{
       // Sculpted Christ statue in light cream/ivory stone catching the moonlight
       o.material.color.set(0xded8c6);
       o.material.roughness=0.46;
       o.material.metalness=0.12;
      }
     }
    }
   });
   cristoRoot.add(model);
   loaded=true;
   dirty=true;
   onChange();
  },undefined,err=>{
   console.warn('[lisbon-sea] Cristo Rei GLB load fallback:',err?.message||err);
  });

  // Load Ponte 25 de Abril
  loader.load(bridgeAsset,gltf=>{
   if(disposed){gltf.scene?.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return;}
   const model=gltf.scene;
   model.name='Ponte 25 de Abril — suspension bridge mesh';
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
      const name=(o.material.name||'').toLowerCase();
      if(name.includes('redwood')||name.includes('red')){
       // Signature weathered International Orange / deep red suspension steel paint
       o.material.color.set(0xb43525);
       o.material.roughness=0.44;
       o.material.metalness=0.55;
      }else if(name.includes('000')||name.includes('line')||name.includes('cable')){
       // Steel suspension cables and roadway truss
       o.material.color.set(0x3a3f45);
       o.material.roughness=0.38;
       o.material.metalness=0.72;
      }else{
       // Submerged foundation piers in ocean salt-weathered concrete
       o.material.color.set(0x727570);
       o.material.roughness=0.70;
       o.material.metalness=0.10;
      }
     }
    }
   });
   bridgeRoot.add(model);
   loaded=true;
   dirty=true;
   onChange();
  },undefined,err=>{
   console.warn('[lisbon-sea] Ponte 25 de Abril GLB load fallback:',err?.message||err);
  });
 }

 return {
  root,
  update(dt,eye,motion=true){
   if(disposed)return false;
   if(motion){
    const delta=Math.max(0,Math.min(Number(dt)||0,.1));
    time+=delta;

    // Harmonic pulsing of red aviation warning beacons atop bridge towers (1.1s period)
    const beaconPulse=Math.pow(Math.max(0,Math.sin(time*2.85)),6.0);
    towerBeacon1.intensity=2400+beaconPulse*6200;
    towerBeacon2.intensity=towerBeacon1.intensity;
    if(beaconSprite1&&beaconSprite2){
     const bScale=12+beaconPulse*8;
     beaconSprite1.scale.set(bScale,bScale,1);
     beaconSprite2.scale.set(bScale,bScale,1);
    }

    // Gentle lunar halo corona pulse above Cristo Rei
    if(cristoCoronaMesh){
     const cScale=20+Math.sin(time*1.8)*2.4;
     cristoCoronaMesh.scale.set(cScale,cScale,1);
    }

    // Dynamic wave foam & spray particle time updates
    foamUniforms.uTime.value=time;
    sprayUniforms.uTime.value=time;
    dirty=true;
   }
   const was=dirty;dirty=false;return was;
  },
  diagnostics:()=>({
   kind:'lisbon-sea-monuments',
   place:'lisbon',
   ready:loaded||!globalThis.document,
   loaded,
   submerged:true,
   cristoRei:{
    monument:'Santuário de Cristo Rei',
    location:[CRISTO_REI_LOCATION.x,CRISTO_REI_LOCATION.y,CRISTO_REI_LOCATION.z],
    scale:CRISTO_REI_LOCATION.scale,
    heightMetres:+(110*CRISTO_REI_LOCATION.scale).toFixed(1),
    yaw:CRISTO_REI_LOCATION.yaw,
    pedestalHeightMetres:+(82*CRISTO_REI_LOCATION.scale).toFixed(1),
    statueHeightMetres:+(28*CRISTO_REI_LOCATION.scale).toFixed(1),
    submergedPillars:true,
    lunarCorona:true
   },
   ponte25Abril:{
    bridge:'Ponte 25 de Abril',
    location:[PONTE_25_ABRIL_LOCATION.x,PONTE_25_ABRIL_LOCATION.y,PONTE_25_ABRIL_LOCATION.z],
    scale:PONTE_25_ABRIL_LOCATION.scale,
    towerHeightMetres:+(190.5*PONTE_25_ABRIL_LOCATION.scale).toFixed(1),
    spanLengthMetres:+(3700*PONTE_25_ABRIL_LOCATION.scale).toFixed(1),
    yaw:PONTE_25_ABRIL_LOCATION.yaw,
    internationalOrange:true,
    aviationBeacons:true,
    submergedPiers:true
   },
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
