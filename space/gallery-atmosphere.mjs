import * as T from './vendor/three-0.180.0.mjs';

// The reference film is a fixed, overcast blue hour. This whole outdoor layer
// (including every light) can be hidden when an artwork corridor opens.
export function createAtmosphere(scene, renderer) {
  const root=new T.Group();root.name='Petrol blue-hour atmosphere';scene.add(root);
  const textures=new Set(),geometries=new Set(),ownedMaterials=new Set();
  let disposed=false,time=0,seed=102619;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const ownTexture=(canvas,colour=false)=>{
    const t=new T.CanvasTexture(canvas);t.wrapS=t.wrapT=T.RepeatWrapping;
    t.colorSpace=colour?T.SRGBColorSpace:T.NoColorSpace;
    t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());textures.add(t);return t;
  };
  const ownMaterial=m=>(ownedMaterials.add(m),m);
  const ownGeometry=g=>(geometries.add(g),g);
  function canvas(){const c=document.createElement('canvas');c.width=c.height=1024;return c;}

  // A single 3.2 m formwork tile: colour, physical pore height and roughness
  // share their registration. Tie holes and narrow panel joints remain small
  // when the same material is used on a thirty-metre wall or a short planter.
  const concreteCanvas=canvas(),heightCanvas=canvas(),roughCanvas=canvas();
  const cx=concreteCanvas.getContext('2d'),hx=heightCanvas.getContext('2d'),rx=roughCanvas.getContext('2d');
  const pixels=cx.createImageData(1024,1024),height=hx.createImageData(1024,1024);
  for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
    const i=(y*1024+x)*4;
    const broad=Math.sin(x*.009)*Math.cos(y*.013)*3+Math.sin(x*.034+y*.018)*1.4;
    const grain=(random()-.5)*9,b=159+broad+grain;
    pixels.data[i]=b-4;pixels.data[i+1]=b+1;pixels.data[i+2]=b+3;pixels.data[i+3]=255;
    const h=128+(random()-.5)*6;
    height.data[i]=height.data[i+1]=height.data[i+2]=h;height.data[i+3]=255;
  }
  cx.putImageData(pixels,0,0);hx.putImageData(height,0,0);rx.fillStyle='#d4d4d4';rx.fillRect(0,0,1024,1024);
  for(let i=0;i<14500;i++){
    const x=random()*1024,y=random()*1024,r=.25+random()*1.8;
    cx.fillStyle=`rgba(49,57,61,${.04+random()*.12})`;cx.beginPath();cx.ellipse(x,y,r,r*(.5+random()),0,0,Math.PI*2);cx.fill();
    hx.fillStyle=`rgba(27,27,27,${.1+random()*.3})`;hx.beginPath();hx.arc(x,y,r,0,Math.PI*2);hx.fill();
  }
  // Casting seams are recessed rather than drawn as luminous grid lines.
  for(const p of [1,512,1023]){
    cx.fillStyle='rgba(37,46,52,.33)';cx.fillRect(p-1,0,2,1024);cx.fillRect(0,p-1,1024,2);
    hx.fillStyle='#3a3a3a';hx.fillRect(p-1,0,2,1024);hx.fillRect(0,p-1,1024,2);
    cx.fillStyle='rgba(218,222,221,.13)';cx.fillRect(p+1,0,1,1024);cx.fillRect(0,p+1,1024,1);
  }
  for(const y of [128,384,640,896])for(const x of [128,384,640,896]){
    const shadow=cx.createRadialGradient(x-.4,y-.7,.5,x,y,3.2);
    shadow.addColorStop(0,'rgba(24,33,38,.75)');shadow.addColorStop(.65,'rgba(46,54,58,.55)');shadow.addColorStop(1,'rgba(73,82,85,0)');
    cx.fillStyle=shadow;cx.beginPath();cx.arc(x,y,3.2,0,Math.PI*2);cx.fill();
    hx.fillStyle='#242424';hx.beginPath();hx.arc(x,y,2.5,0,Math.PI*2);hx.fill();
    cx.strokeStyle='rgba(224,227,224,.20)';cx.lineWidth=.7;cx.beginPath();cx.arc(x,y,3.3,.15,Math.PI);cx.stroke();
  }
  const concreteMap=ownTexture(concreteCanvas,true),concreteBump=ownTexture(heightCanvas),concreteRough=ownTexture(roughCanvas);

  // Project in metres, after instancing. Default BoxGeometry UVs would stretch
  // every pore and formwork panel to the complete width of a building.
  function metreProjection(material,scale=3.2){
    material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
        vec4 architecturalPosition=vec4(transformed,1.0);
        vec3 architecturalNormal=objectNormal;
        #ifdef USE_INSTANCING
          architecturalPosition=instanceMatrix*architecturalPosition;
          architecturalNormal=mat3(instanceMatrix)*architecturalNormal;
        #endif
        architecturalPosition=modelMatrix*architecturalPosition;
        architecturalNormal=normalize(mat3(modelMatrix)*architecturalNormal);
        vec3 architecturalAxis=abs(architecturalNormal);
        vec2 architecturalUV=architecturalPosition.xy;
        if(architecturalAxis.y>max(architecturalAxis.x,architecturalAxis.z)) architecturalUV=architecturalPosition.xz;
        else if(architecturalAxis.x>architecturalAxis.z) architecturalUV=vec2(architecturalPosition.z,architecturalPosition.y);
        architecturalUV/=${scale.toFixed(4)};
        #ifdef USE_MAP
          vMapUv=architecturalUV;
        #endif
        #ifdef USE_BUMPMAP
          vBumpMapUv=architecturalUV;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv=architecturalUV;
        #endif
        #include <project_vertex>`);
    };
    material.customProgramCacheKey=()=>`architectural-metres-${scale}`;
    return material;
  }
  const concrete=ownMaterial(metreProjection(new T.MeshStandardMaterial({color:0xffffff,map:concreteMap,bumpMap:concreteBump,bumpScale:.006,roughnessMap:concreteRough,roughness:.98,metalness:0,fog:false})));
  const wetStone=ownMaterial(metreProjection(new T.MeshPhysicalMaterial({color:0x414b50,map:concreteMap,bumpMap:concreteBump,bumpScale:.007,roughness:.19,metalness:0,clearcoat:.85,clearcoatRoughness:.13,fog:false})));
  const black=ownMaterial(new T.MeshStandardMaterial({color:0x080b0d,roughness:.56,metalness:.08,fog:false}));
  const glass=ownMaterial(new T.MeshPhysicalMaterial({color:0x8aa5ac,roughness:.07,metalness:.05,transparent:true,opacity:.21,depthWrite:false,side:T.DoubleSide,clearcoat:1,fog:false}));
  const rock=ownMaterial(metreProjection(new T.MeshStandardMaterial({color:0xb9bebe,map:concreteMap,bumpMap:concreteBump,bumpScale:.065,roughness:1,fog:false}),1.3));
  const limestone=ownMaterial(metreProjection(new T.MeshStandardMaterial({color:0xd0c9b7,map:concreteMap,bumpMap:concreteBump,bumpScale:.034,roughness:.94,fog:false}),2.4));
  const amber=ownMaterial(new T.MeshBasicMaterial({color:0xffc987,toneMapped:false,fog:false}));
  const foliage=ownMaterial(new T.MeshStandardMaterial({color:0x263a32,roughness:.9,metalness:0,side:T.DoubleSide,fog:false}));

  const ambient=new T.HemisphereLight(0x95bed5,0x364149,2.3);root.add(ambient);
  const moon=new T.DirectionalLight(0x9bc2d8,.38);moon.position.set(-32,58,27);
  moon.castShadow=true;moon.shadow.mapSize.set(innerWidth<650?512:1024,innerWidth<650?512:1024);
  Object.assign(moon.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:160});
  moon.shadow.normalBias=.08;moon.shadow.bias=-.001;moon.shadow.camera.updateProjectionMatrix();root.add(moon);
  const fill=new T.DirectionalLight(0x7b9db4,.6);fill.position.set(23,15,-25);root.add(fill);

  const noiseGLSL=`
    float hash(vec3 p){p=fract(p*.3183099+vec3(.13,.27,.51));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
    float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);}
    float fbm(vec3 p){float n=0.,a=.53;for(int i=0;i<6;i++){n+=a*noise(p);p=p*2.04+vec3(3.1,9.7,4.2);a*=.49;}return n;}`;
  const skyUniforms={uTime:{value:0}};
  const skyMaterial=ownMaterial(new T.ShaderMaterial({uniforms:skyUniforms,side:T.BackSide,depthWrite:false,depthTest:false,toneMapped:false,fog:false,
    vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 vDirection;uniform float uTime;${noiseGLSL}
      void main(){
        vec3 d=normalize(vDirection);float elevation=max(d.y,0.);
        vec3 c=mix(vec3(.002,.055,.115),vec3(.0008,.025,.075),pow(elevation,.45));
        vec3 p=d*7.1+vec3(uTime*.0015,0.,uTime*.0006);
        float warp=fbm(p*.68+vec3(7.2,4.1,1.3));
        float cloud=fbm(p+warp*2.4),detail=fbm(p*2.9+vec3(4.1,1.7,8.));
        float mass=smoothstep(.29,.69,cloud*.78+detail*.22);
        float shadow=fbm(p+vec3(.17,-.16,.08));
        vec3 cloudColour=mix(vec3(.0004,.011,.030),vec3(.004,.061,.120),smoothstep(.27,.70,shadow));
        c=mix(c,cloudColour,mass*.91);
        float edge=smoothstep(.43,.60,cloud)-smoothstep(.51,.69,cloud);
        c+=edge*vec3(.002,.012,.028)*(.4+detail);
        float horizon=pow(1.-abs(d.y),14.);
        c=mix(c,vec3(.024,.043,.067),horizon*.32);
        if(d.y<-.045)c=mix(c,vec3(.009,.023,.034),1.-smoothstep(-.5,-.045,d.y));
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`
  }));
  const sky=new T.Mesh(ownGeometry(new T.SphereGeometry(1150,32,18)),skyMaterial);sky.name='Procedural overcast petrol sky';sky.renderOrder=-1000;sky.frustumCulled=false;root.add(sky);

  const oceanUniforms={uTime:{value:0}};
  const oceanMaterial=ownMaterial(new T.ShaderMaterial({uniforms:oceanUniforms,side:T.DoubleSide,fog:false,toneMapped:false,
    vertexShader:`varying vec3 vWorld;void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`varying vec3 vWorld;uniform float uTime;${noiseGLSL}
      void main(){
        vec3 viewDirection=normalize(cameraPosition-vWorld);
        float wave=sin(vWorld.x*.36+vWorld.z*.58+uTime*.36)*.42+sin(vWorld.x*.78-vWorld.z*.43-uTime*.27)*.22;
        float fine=noise(vec3(vWorld.xz*1.35,uTime*.11));
        float horizon=pow(1.-max(0.,viewDirection.y),5.);
        vec3 c=mix(vec3(.004,.024,.041),vec3(.014,.060,.083),horizon*.7+.1);
        c+=(wave*.5+.5)*vec3(.002,.007,.009);
        float glint=pow(max(0.,wave*.4+fine*.65),12.);
        c+=glint*vec3(.015,.039,.047)*(.2+horizon*.8);
        float distanceFog=1.-exp(-length(cameraPosition.xz-vWorld.xz)*.0009);
        c=mix(c,vec3(.022,.050,.067),distanceFog*.72);
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`
  }));
  const ocean=new T.Mesh(ownGeometry(new T.PlaneGeometry(6500,6500)),oceanMaterial);ocean.rotation.x=-Math.PI/2;ocean.position.y=-25;ocean.name='Distant blue-hour ocean';root.add(ocean);

  return {
    root,materials:{concrete,wetStone,black,glass,rock,limestone,amber,foliage},
    update(dt,eye,motion=true){
      if(disposed||!root.visible)return false;
      if(eye)sky.position.copy(eye);
      if(!motion)return false;
      time+=Math.min(.1,Math.max(0,dt));skyUniforms.uTime.value=oceanUniforms.uTime.value=time;return true;
    },
    diagnostics:()=>({kind:'reference overcast coastal blue hour',visible:root.visible,time:+time.toFixed(3),fixedHour:19,stars:0,procedural:true,textureSize:1024,worldMetreUV:true,concrete:'formwork, panel seams, pores and recessed tie holes',oceanY:-25,lights:3,externalAssets:false}),
    dispose(){if(disposed)return;disposed=true;root.removeFromParent();moon.shadow.dispose();for(const g of geometries)g.dispose();for(const m of ownedMaterials)m.dispose();for(const t of textures)t.dispose();}
  };
}
