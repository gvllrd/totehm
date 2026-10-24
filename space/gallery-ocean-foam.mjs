import * as T from './vendor/three-0.180.0.mjs';

export const OCEAN_FOAM_DOMAIN=4096;
export const OCEAN_FOAM_GLSL=`
 // Linear decoding also works between adjacent texels. Keeping the low byte
 // prevents pale foam from becoming immortal through RGBA8 rounding.
 float oceanFoamDensity(vec4 state){return dot(state.rg,vec2(256./257.,1./257.));}
`;

// This patch stores a history of aeration in the sea's material coordinates q.
// The shared surface moves those coordinates with the swell; only the slow
// wind/current slip belongs in this advection pass.
export function createOceanFoam(renderer,{mobile=false,surfaceGLSL='',onChange=()=>{}}={}){
 const size=mobile?128:256,rate=mobile?20:30,interval=1/rate,decaySeconds=7.8;
 const empty=new T.DataTexture(new Uint8Array([0,0,255,0]),1,1,T.RGBAFormat,T.UnsignedByteType);
 empty.colorSpace=T.NoColorSpace;empty.minFilter=empty.magFilter=T.LinearFilter;empty.needsUpdate=true;
 let disposed=false,initialized=false,steps=0,time=0,accumulator=0,read=null,write=null;
 const rendererReady=!!renderer&&typeof renderer.render==='function'&&typeof renderer.setRenderTarget==='function'&&typeof renderer.getRenderTarget==='function';
 const hasSurface=typeof surfaceGLSL==='string'&&surfaceGLSL.includes('oceanSurface(');
 const supported=rendererReady&&hasSurface;
 const compressionDriven=/struct\s+OceanSurface\s*\{[^}]*\bcompression\b/.test(surfaceGLSL);
 let geometry=null,material=null,scene=null,camera=null;
 if(supported){
  const options={format:T.RGBAFormat,type:T.UnsignedByteType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,
   wrapS:T.ClampToEdgeWrapping,wrapT:T.ClampToEdgeWrapping,depthBuffer:false,stencilBuffer:false,generateMipmaps:false};
  read=new T.WebGLRenderTarget(size,size,options);write=new T.WebGLRenderTarget(size,size,options);
  read.texture.name='Ocean foam history A';write.texture.name='Ocean foam history B';
  read.texture.colorSpace=write.texture.colorSpace=T.NoColorSpace;
  material=new T.ShaderMaterial({
   name:'Ocean foam — advected breaking memory',depthTest:false,depthWrite:false,blending:T.NoBlending,toneMapped:false,
   uniforms:{uFoamPrevious:{value:empty},uFoamTime:{value:0},uFoamDelta:{value:0},uFoamSeed:{value:true},uFoamDomain:{value:OCEAN_FOAM_DOMAIN}},
   vertexShader:`varying vec2 vFoamUv;void main(){vFoamUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}`,
   fragmentShader:`
    // OCEAN_FOAM_STATE: persistent aeration, not a time-scrolled colour map.
    precision highp float;
    uniform sampler2D uFoamPrevious;
    uniform float uFoamTime,uFoamDelta,uFoamDomain;
    uniform bool uFoamSeed;
    varying vec2 vFoamUv;
    ${surfaceGLSL}
    ${OCEAN_FOAM_GLSL}
    float foamHash(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+19.19);return fract(p.x*p.y);}
    float foamNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(foamHash(i),foamHash(i+vec2(1,0)),f.x),mix(foamHash(i+vec2(0,1)),foamHash(i+vec2(1)),f.x),f.y);}
    vec2 foamFlow(vec2 q,float t){
     const vec2 wind=vec2(.544,.839),across=vec2(-.839,.544);
     // Curl-like crosswind eddies stretch the old aeration into uneven wakes.
     float along=dot(q,wind)*.009+t*.032,crosswind=dot(q,across)*.012-t*.021;
     return wind*(2.7+.75*cos(crosswind))+across*(.65*sin(along));
    }
    float foamBirth(OceanSurface sea,vec2 q,float t){
     float compression=${compressionDriven?'sea.compression':'smoothstep(.48,.92,sea.breaking)'};
     float spilling=smoothstep(.30,.80,compression)*smoothstep(.45,.85,sea.breaking);
     vec2 storm=vec2(dot(q,vec2(-.839,.544))*.006,dot(q,vec2(.544,.839))*.0018-t*.035);
     float event=smoothstep(.34,.70,foamNoise(storm));
     float fragments=.38+.62*foamNoise(q*.019-vec2(.544,.839)*t*.045);
     return spilling*event*fragments*sea.energy;
    }
    vec2 foamPack(float density){float value=floor(clamp(density,0.,1.)*65535.+.5);return vec2(floor(value/256.),mod(value,256.))/255.;}
    void main(){
     vec2 q=(vFoamUv-.5)*uFoamDomain;
     OceanSurface sea=oceanSurface(q,uFoamTime);
     float birth=foamBirth(sea,q,uFoamTime),density=0.,age=0.;
     if(uFoamSeed){
      // Seed the current sea with a short, deterministic prehistory. The two
      // previous spills already trail behind the moving front on the first view.
      density=1.-exp(-birth*2.4);
      float weightedAge=0.;
      for(int i=1;i<=2;i++){
       float elapsed=float(i)*2.6;
       vec2 oldQ=q-foamFlow(q,uFoamTime)*elapsed;
       OceanSurface oldSea=oceanSurface(oldQ,uFoamTime-elapsed);
       float oldDensity=(1.-exp(-foamBirth(oldSea,oldQ,uFoamTime-elapsed)*2.4))*exp(-elapsed/${decaySeconds});
       weightedAge+=oldDensity*elapsed/10.;
       density=1.-(1.-density)*(1.-oldDensity);
      }
      age=clamp(weightedAge/max(density,.0001),0.,1.);
     }else{
      vec2 previousUv=vFoamUv-foamFlow(q,uFoamTime)*uFoamDelta/uFoamDomain;
      vec4 previous=texture2D(uFoamPrevious,previousUv);
      float retained=oceanFoamDensity(previous)*exp(-uFoamDelta/${decaySeconds});
      float injected=(1.-retained)*(1.-exp(-birth*3.*uFoamDelta));
      density=retained+injected;
      age=min(previous.b+uFoamDelta/10.,1.)*retained/max(density,.0001);
     }
     // Drop the last invisible traces before even the low byte can round its
     // exponential decrement to zero.
     if(density<.002)density=0.;
     gl_FragColor=vec4(foamPack(density),age,birth);
    }`
  });
  geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.BufferAttribute(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3));
  const triangle=new T.Mesh(geometry,material);triangle.frustumCulled=false;
  scene=new T.Scene();scene.add(triangle);camera=new T.Camera();
 }
 function draw(nextTime,delta,seed){
  const target=renderer.getRenderTarget(),face=renderer.getActiveCubeFace?.()??0,mip=renderer.getActiveMipmapLevel?.()??0;
  // A caller can override a bound target's viewport/scissor without changing
  // that target's defaults. Preserve those actual rectangles as well. The
  // regular screen path needs no GL state query: rebinding null restores it.
  const viewport=target&&renderer.state?.viewport&&renderer.getCurrentViewport?renderer.getCurrentViewport(new T.Vector4()):null;
  const context=target&&renderer.state?.scissor&&renderer.state?.setScissorTest?renderer.getContext?.():null;
  const scissor=context?.getParameter?context.getParameter(context.SCISSOR_BOX):null;
  const scissorTest=context?.isEnabled?context.isEnabled(context.SCISSOR_TEST):null;
  const autoClear=renderer.autoClear,xrEnabled=renderer.xr?.enabled,autoReset=renderer.info?.autoReset;
  const shadowAutoUpdate=renderer.shadowMap?.autoUpdate,shadowNeedsUpdate=renderer.shadowMap?.needsUpdate;
  material.uniforms.uFoamPrevious.value=initialized?read.texture:empty;
  material.uniforms.uFoamTime.value=nextTime;material.uniforms.uFoamDelta.value=delta;material.uniforms.uFoamSeed.value=seed;
  try{
   renderer.autoClear=false;
   if(renderer.xr)renderer.xr.enabled=false;
   if(renderer.info)renderer.info.autoReset=false;
   if(renderer.shadowMap){renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;}
   // Target binding installs its pixel viewport/scissor. Calling setViewport
   // here would multiply these dimensions by the screen's device pixel ratio.
   renderer.setRenderTarget(write);renderer.render(scene,camera);
  }finally{
   // Rebinding through the target rectangles restores both WebGL state and
   // Three's current-viewport cache. A state.viewport() call alone leaves that
   // cache stale, so the next nested pass can save and restore the wrong size.
   // Keep the target's public defaults unchanged after the synchronous bind.
   const targetViewport=target?.viewport,targetScissor=target?.scissor,targetScissorTest=target?.scissorTest;
   try{
    if(viewport)target.viewport=viewport;
    if(scissor)target.scissor=new T.Vector4(scissor[0],scissor[1],scissor[2],scissor[3]);
    if(scissorTest!==null)target.scissorTest=scissorTest;
    renderer.setRenderTarget(target,face,mip);
   }finally{
    if(viewport)target.viewport=targetViewport;
    if(scissor)target.scissor=targetScissor;
    if(scissorTest!==null)target.scissorTest=targetScissorTest;
   }
   renderer.autoClear=autoClear;
   if(renderer.xr)renderer.xr.enabled=xrEnabled;
   if(renderer.info)renderer.info.autoReset=autoReset;
   if(renderer.shadowMap){renderer.shadowMap.autoUpdate=shadowAutoUpdate;renderer.shadowMap.needsUpdate=shadowNeedsUpdate;}
  }
  const previous=read;read=write;write=previous;
  initialized=true;steps++;time=nextTime;
  onChange();
 }
 return{
  get texture(){return initialized?read.texture:empty;},
  get size(){return supported?size:1;},
  get domainSize(){return OCEAN_FOAM_DOMAIN;},
  update(nextTime,dt,motion=true){
   if(disposed||!supported)return false;
   const requestedTime=Number(nextTime),requestedDelta=Number(dt);
   const currentTime=Number.isFinite(requestedTime)?Math.max(0,requestedTime):time;
   if(!initialized){draw(currentTime,0,true);return true;}
   if(!motion){accumulator=0;return false;}
   const delta=Number.isFinite(requestedDelta)?Math.max(0,Math.min(requestedDelta,.1)):0;
   if(!delta)return false;
   accumulator+=delta;
   if(accumulator+1e-7<interval)return false;
   const step=Math.min(accumulator,.1);accumulator-=step;
   draw(currentTime,step,false);return true;
  },
  diagnostics:()=>({kind:'gpu-ocean-foam',supported,initialized,simulationSize:supported?size:1,domainSize:OCEAN_FOAM_DOMAIN,
   steps,time:+time.toFixed(4),advected:steps>1,decayed:steps>1,seeded:initialized,updateRate:rate,decaySeconds,
   pingPong:supported,targets:supported?2:0,compressionDriven,packing:'rg16-density/b-age/a-birth',fallbackReason:supported?null:rendererReady?'surface-unavailable':'renderer-unavailable',disposed}),
  dispose(){
   if(disposed)return;disposed=true;
   read?.dispose();write?.dispose();material?.dispose();geometry?.dispose();empty.dispose();scene?.clear();
  }
 };
}
