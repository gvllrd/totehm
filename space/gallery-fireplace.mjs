import * as T from './vendor/three-0.180.0.mjs';
import {createWhiteStone} from './gallery-white-stone.mjs';

// A suspended panoramic hearth, actually lit from within. Flames and smoke
// share the gallery clock: no image, movie, autonomous timer or external asset.
export function createGalleryFireplace(scene,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='The hearth — ancient limestone, a floating steel plane and living wood';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),solids=[];
 let time=11.7,disposed=false,dirty=true,updates=0,moving=false;
 const geo=g=>(geometries.add(g),g),mat=m=>(materials.add(m),m);
 const body=mat(new T.MeshStandardMaterial({color:0x090a0b,roughness:.81,metalness:.2}));
 const inside=mat(new T.MeshStandardMaterial({color:0x060404,roughness:.98,metalness:0}));
 const bronze=mat(new T.MeshStandardMaterial({color:0x242321,roughness:.43,metalness:.72}));
 const soot=mat(new T.MeshStandardMaterial({color:0x080707,roughness:.96}));
 const thermalClock={value:time};
 const hearthStone=createWhiteStone({mobile,onChange});
 soot.name='Charred hardwood — real bark relief, broken end grain and incandescent fissures';
 soot.customProgramCacheKey=()=> 'charred-hardwood-volume-v3';
 soot.onBeforeCompile=shader=>{
  shader.uniforms.uWoodClock=thermalClock;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCharWood;varying vec3 vCharNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCharWood=position;vCharNormal=normal;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vCharWood,vCharNormal;uniform float uWoodClock;
   float charHash(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+19.19);return fract(p.x*p.y);}
   float charNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(charHash(i),charHash(i+vec2(1,0)),f.x),mix(charHash(i+vec2(0,1)),charHash(i+vec2(1)),f.x),f.y);}
  `).replace('#include <map_fragment>',`#include <map_fragment>
   float angle=atan(vCharWood.z,vCharWood.x),radius=length(vCharWood.xz);
   vec2 wood=vec2(angle*3.4,vCharWood.y*7.);
   float grain=charNoise(wood*vec2(2.6,.65)),charPatch=charNoise(wood*vec2(.75,1.6));
   float cap=smoothstep(.60,.85,abs(normalize(vCharNormal).y));
   float barkLine=abs(sin(angle*24.+charNoise(wood*.8)*6.2+vCharWood.y*1.8));
   float endLine=abs(sin(radius*220.+charNoise(vCharWood.xz*38.)*2.2));
   float line=mix(barkLine,endLine,cap);
   float crackAA=max(fwidth(line),.008);
   float cracks=(1.-smoothstep(.010-crackAA*.18,.038+crackAA*.18,line))*smoothstep(.38,.68,charPatch)*(1.-smoothstep(.10,.32,crackAA));
   float ash=smoothstep(.55,.86,charNoise(wood*vec2(1.1,2.9)))*.42;
   diffuseColor.rgb=mix(vec3(.0030,.0026,.0022),vec3(.027,.024,.020),ash)*(.68+grain*.65);
   float hot=cracks*(.65+.35*charNoise(vec2(uWoodClock*.52+wood.x,wood.y*2.)));
  `).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   totalEmissiveRadiance+=vec3(.34,.028,.002)*hot;
  `);
 };
 const ember=mat(new T.MeshStandardMaterial({color:0x090706,roughness:1}));
 ember.name='Coal crust — dark ash over irregular glowing fractures';
 ember.customProgramCacheKey=()=> 'wood-coal-crust-v2';
 ember.onBeforeCompile=shader=>{
  shader.uniforms.uCoalClock=thermalClock;shader.uniforms.uCoalFlow={value:flowTexture};shader.uniforms.uCoalFlowScale={value:1/flowSize};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCoal;varying float vCoalSeed;').replace('#include <begin_vertex>',`#include <begin_vertex>
   vCoal=position;vCoalSeed=0.;
   #ifdef USE_INSTANCING
    vCoalSeed=fract(sin(dot(instanceMatrix[3].xz,vec2(12.9898,78.233)))*43758.5453);
   #endif`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vCoal;varying float vCoalSeed;uniform float uCoalClock,uCoalFlowScale;uniform highp sampler3D uCoalFlow;`).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float crust=texture(uCoalFlow,(vCoal*28.+vec3(vCoalSeed*53.,vCoalSeed*17.,vCoalSeed*31.))*uCoalFlowScale).r;
   float hot=smoothstep(.68,.83,crust)*(.35+.65*vCoalSeed);
   float breath=.78+.22*sin(uCoalClock*(.38+vCoalSeed*.48)+vCoalSeed*32.);
   totalEmissiveRadiance+=vec3(.8,.065,.002)*hot*breath;`);
 };
 function box(width,height,depth){
  const w=width/2,h=height/2,r=Math.min(.026,width/12,height/12),s=new T.Shape();
  s.moveTo(-w+r,-h);s.lineTo(w-r,-h);s.quadraticCurveTo(w,-h,w,-h+r);s.lineTo(w,h-r);s.quadraticCurveTo(w,h,w-r,h);s.lineTo(-w+r,h);s.quadraticCurveTo(-w,h,-w,h-r);s.lineTo(-w,-h+r);s.quadraticCurveTo(-w,-h,-w+r,-h);
  const g=new T.ExtrudeGeometry(s,{depth:depth-.02,bevelEnabled:true,bevelSize:.012,bevelThickness:.01,bevelSegments:2,curveSegments:4});g.translate(0,0,-(depth-.02)/2);return geo(g);
 }
 function piece(g,m,position,name,solid=false){const o=new T.Mesh(g,m);o.position.set(...position);o.name=name;o.receiveShadow=true;o.castShadow=true;root.add(o);if(solid)solids.push(o);return o;}
 const block=(size,position,m,name,solid=true)=>piece(box(...size),m,position,name,solid);
 // A single limestone plinth continues the room's actual material. Above it
 // a 16 cm floating steel plane collects the smoke. No frame, bulky cheeks,
 // masonry back or ornamental surround blocks the glass and stars.
 block([4.3,.26,1.62],[-8,.04,-15.99],hearthStone.material,'Ancient limestone hearth continuous with the floor');
 block([3.88,.045,1.24],[-8,.192,-15.99],inside,'Recessed ember bed');
 block([4.08,.16,1.16],[-8,2.25,-16.12],body,'Ultra-thin suspended steel canopy');
 block([3.94,.018,.034],[-8,2.163,-15.525],bronze,'Shadow line under the floating canopy',false);
 block([4.12,.015,.035],[-8,.173,-15.17],bronze,'Recessed hearth shadow line',false);
 const pipe=piece(geo(new T.CylinderGeometry(.205,.245,6.13,mobile?20:32)),body,[-8,5.395,-16.12],'Black chimney through the glass roof',true);
 const collar=piece(geo(new T.TorusGeometry(.27,.055,8,32)),body,[-8,6.22,-16.12],'Sealed roof collar');collar.rotation.x=Math.PI/2;
 const cap=piece(geo(new T.CylinderGeometry(.29,.29,.055,24)),body,[-8,8.61,-16.12],'Chimney rain cap');
 for(const x of [-8.16,-7.84])block([.025,.18,.025],[x,8.51,-16.12],body,'Discreet cap support',false);
 // A loose arrangement of charred real geometry and glowing embers gives
 // the fire a convincing base even when its parent clock is frozen.
 const random=seed=>{const s=Math.sin(seed*127.1+311.7)*43758.5453123;return s-Math.floor(s);};
 function hardwood(seed,length,radius){
  const g=geo(new T.CylinderGeometry(radius*.83,radius,length,mobile?28:40,mobile?10:16,false));
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,z),a=Math.atan2(z,x),v=y/length;
   if(r>.0001){
    const grain=1.+.055*Math.sin(a*7.+seed)+.025*Math.sin(a*19.+seed*.7+v*2.)+.026*Math.sin(v*18.+a*3.+seed);
    const knot=Math.exp(-((a-.8-Math.sin(seed)*.6)**2/.20+(v-.12)**2/.025))*.20;
    p.setXYZ(i,x*(grain+knot)+.012*Math.sin(v*5.+seed),y+(Math.abs(v)>.49?.018*Math.sin(a*5.+seed)+.007*Math.sin(a*11.):0),z*(grain+knot)+.009*Math.cos(v*7.+seed));
   }
  }
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
 }
 const woodPieces=[
  {p:[-9.35,.37,-16.16],l:1.03,r:.14,z:1.34,y:.18},
  {p:[-8.55,.36,-16.18],l:1.06,r:.135,z:1.68,y:-.17},
  {p:[-7.68,.35,-16.13],l:1.14,r:.145,z:1.38,y:.14},
  {p:[-6.79,.37,-16.11],l:.92,r:.13,z:1.72,y:-.24},
  {p:[-9.02,.49,-15.84],l:1.07,r:.12,z:1.82,y:-.28},
  {p:[-8.10,.51,-15.91],l:1.19,r:.14,z:1.26,y:.32},
  {p:[-7.12,.46,-15.82],l:1.03,r:.125,z:1.83,y:-.21}
 ];
 woodPieces.forEach((v,i)=>{const log=piece(hardwood(i*3.17+1,v.l,v.r),soot,v.p,'Irregular charred hardwood — bark, knots and broken end grain');log.rotation.z=v.z;log.rotation.y=v.y;});
 for(const [i,p] of [[0,[-8.65,.56,-15.83]],[1,[-7.47,.53,-15.89]]]){
  const stub=piece(hardwood(i+21,.27,.075),soot,p,'Broken branch on a burning log');stub.rotation.z=i?.65:-.57;stub.rotation.x=.34;
 }
 const emberGeo=geo(new T.IcosahedronGeometry(.065,1)),coalPositions=emberGeo.attributes.position;
 for(let i=0;i<coalPositions.count;i++){const x=coalPositions.getX(i),y=coalPositions.getY(i),z=coalPositions.getZ(i),scale=.78+random(x*72+y*49+z*93)*.40;coalPositions.setXYZ(i,x*scale,y*scale,z*scale);}emberGeo.computeVertexNormals();
 const coalCount=mobile?72:112,coalBed=new T.InstancedMesh(emberGeo,ember,coalCount),coalTransform=new T.Object3D();coalBed.name='Irregular glowing coal and ash bed — one draw';root.add(coalBed);
 for(let i=0;i<coalCount;i++){coalTransform.position.set(-9.71+random(i*3+1)*3.42,.238+random(i*3+2)*.032,-16.47+random(i*3+3)*.91);coalTransform.scale.set(.45+random(i+54)*.85,.23+random(i+29)*.31,.50+random(i+81)*.90);coalTransform.rotation.set(random(i+41),random(i+19)*Math.PI*2,random(i+62));coalTransform.updateMatrix();coalBed.setMatrixAt(i,coalTransform.matrix);}coalBed.instanceMatrix.needsUpdate=true;
 const warm=new T.PointLight(0xff8d3b,40,22,2);warm.position.set(-8,1.17,-15.15);warm.name='Firelight on the white stone';root.add(warm);
 const fill=new T.PointLight(0xffb46d,14,17,2);fill.position.set(-7.4,2.08,-14.95);fill.name='Warm reflected light across the room';root.add(fill);
 // A small seeded 3D field supplies hardware-trilinear flow samples. Unlike
 // noise evaluated as eight hashes at every ray step, the same volume serves
 // all three scales of real-depth advection with three bounded texture reads.
 const flowSize=mobile?32:64,flowData=new Uint8Array(flowSize**3*4);
 let flowSeed=0x8a54d211;
 for(let i=0;i<flowData.length;i++){flowSeed^=flowSeed<<13;flowSeed^=flowSeed>>>17;flowSeed^=flowSeed<<5;flowData[i]=(flowSeed>>>0)>>>24;}
 const flowTexture=new T.Data3DTexture(flowData,flowSize,flowSize,flowSize);flowTexture.name='Seeded continuous three-dimensional combustion flow';flowTexture.format=T.RGBAFormat;flowTexture.type=T.UnsignedByteType;flowTexture.minFilter=flowTexture.magFilter=T.LinearFilter;flowTexture.wrapS=flowTexture.wrapT=flowTexture.wrapR=T.RepeatWrapping;flowTexture.unpackAlignment=1;flowTexture.needsUpdate=true;textures.add(flowTexture);
 const maxSteps=mobile?18:30;
 const flameUniforms={uTime:thermalClock,uFlow:{value:flowTexture},uFlowScale:{value:1/flowSize},uSteps:{value:maxSteps},uCenter:{value:new T.Vector3(-8,1.17,-15.98)},uHalf:{value:new T.Vector3(1.83,.86,.52)}};
 const noise=`
 float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
 float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}
 float turbulence(vec2 p){return noise2(p)*.57+noise2(p*2.07+7.1)*.28+noise2(p*4.13-3.7)*.15;}
 `;
 const flameMaterial=mat(new T.ShaderMaterial({uniforms:flameUniforms,transparent:true,depthWrite:false,side:T.BackSide,premultipliedAlpha:true,toneMapped:true,
  vertexShader:`varying vec3 vPoint;void main(){vPoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
  uniform float uTime,uFlowScale,uSteps;uniform highp sampler3D uFlow;uniform vec3 uCenter,uHalf;varying vec3 vPoint;
  ${noise}
  vec3 flow(vec3 p){return texture(uFlow,(p+vec3(.5))*uFlowScale).rgb;}
  vec2 intersectBox(vec3 ro,vec3 rd){vec3 inv=1./rd;vec3 a=(-uHalf-ro)*inv,b=(uHalf-ro)*inv;vec3 lo=min(a,b),hi=max(a,b);return vec2(max(max(lo.x,lo.y),lo.z),min(min(hi.x,hi.y),hi.z));}
  void main(){
   vec3 origin=cameraPosition-uCenter,ray=normalize(vPoint-origin);vec2 bounds=intersectBox(origin,ray);float begin=max(bounds.x,0.);if(bounds.y<=begin)discard;
   float stride=(bounds.y-begin)/uSteps,jitter=hash21(gl_FragCoord.xy)*.55;vec3 colour=vec3(0.);float alpha=0.;
   for(int i=0;i<${maxSteps};i++){
    if(float(i)>=uSteps||alpha>.985)break;
    vec3 p=origin+ray*(begin+(float(i)+.23+jitter)*stride);
    float y=p.y+uHalf.y,rise=y/(uHalf.y*2.);
    // A connected fuel bed is advected through the real depth of the fire.
    // Different rates at three scales stretch, curl and tear the same field;
    // no repeated cells, rows of candles or camera-facing image are used.
    vec3 large=flow(vec3(p.x*.83+11.,y*1.6-uTime*.67,p.z*2.1+19.));
    vec2 curl=(large.rb-.5)*(.13+rise*.39);
    vec3 q=vec3(p.x+curl.x,y,p.z+curl.y*.53);
    vec3 rolling=flow(vec3(q.x*5.6+2.7,q.y*2.8-uTime*2.6,q.z*6.2+8.1));
    vec3 fine=flow(vec3(q.x*14.+rolling.b*.65,q.y*5.5-uTime*6.7,q.z*13.+rolling.r*.59));
    float chemistry=rolling.r*.68+fine.g*.24+large.g*.08;
    float fuel=max(max(.88*exp(-pow((p.x+1.19)/.37,2.)-pow((p.z+.10)/.22,2.)),.93*exp(-pow((p.x+.38)/.48,2.)-pow((p.z-.04)/.25,2.))),max(.82*exp(-pow((p.x-.46)/.33,2.)-pow((p.z+.08)/.24,2.)),.72*exp(-pow((p.x-1.22)/.29,2.)-pow((p.z-.09)/.22,2.))));
    float threshold=.40+rise*.34+(1.-fuel)*.08;
    float reaction=smoothstep(threshold-.045,threshold+.075,chemistry);
    float depthRadius=.20*(1.-rise)+.045;
    float depth=exp(-pow((q.z+.032*(rolling.b-.5))/depthRadius,2.));
    float sides=1.-smoothstep(1.48,1.83,abs(p.x));
    float fuelWeight=mix(.36+.64*fuel,.84,smoothstep(.15,.65,rise));
    float density=reaction*depth*sides*fuelWeight*smoothstep(0.,.075,y)*(1.-smoothstep(.82,1.,rise));
    float heat=clamp(.52+.23*(1.-rise)+.12*reaction+.06*(fine.r-.5),0.,1.);
    vec3 fire=mix(vec3(1.28,.05,.001),vec3(2.35,.62,.035),smoothstep(.48,.80,heat));
    fire=mix(fire,vec3(3.3,2.25,.96),smoothstep(.86,.98,heat));
    // A very narrow cool oxidation edge stays under the hot wood flame.
    fire=mix(fire,vec3(.14,.25,.57),.48*(1.-smoothstep(.035,.13,y))*(.4+.6*fine.b));
    float a=1.-exp(-density*stride*3.1);colour+=(1.-alpha)*a*fire;alpha+=(1.-alpha)*a;
   }
   if(alpha<.005)discard;
   // The ray has already integrated emitted radiance and absorption. Tone
   // mapping an unweighted colour and multiplying it by alpha afterwards
   // turns a luminous flame into faint coloured smoke. Expose the integrated
   // light directly; it is already premultiplied by each sample's density.
   gl_FragColor=vec4(colour*2.2,alpha*.65);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`}));
 const flame=piece(geo(new T.BoxGeometry(3.66,1.72,1.04)),flameMaterial,flameUniforms.uCenter.value.toArray(),'Continuous three-dimensional turbulent hardwood combustion');flame.castShadow=flame.receiveShadow=false;flame.renderOrder=4;
 const sparkCount=mobile?30:52,smokeCount=mobile?18:28;
 function pointGeometry(count){const g=geo(new T.BufferGeometry()),p=new Float32Array(count*3),seed=new Float32Array(count);for(let i=0;i<count;i++)seed[i]=(i*.61803398875)%1;g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('aSeed',new T.BufferAttribute(seed,1));return g;}
 const sparkMaterial=mat(new T.ShaderMaterial({uniforms:{uTime:{value:time},uScale:{value:mobile?700:950}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
  vertexShader:`uniform float uTime,uScale;attribute float aSeed;varying float vLife;void main(){float life=fract(aSeed+uTime*(.17+aSeed*.045));vLife=life;vec3 p=vec3(-8.+(aSeed-.5)*3.2+sin(life*7.+aSeed*19.)*.11,.42+life*1.9,-15.84+cos(aSeed*29.+life*4.)*.20);vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp((.008+aSeed*.008)*uScale/max(.2,-v.z),.5,3.5);}`,
  fragmentShader:`varying float vLife;void main(){float d=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,.1,d)*(1.-vLife)*smoothstep(0.,.10,vLife);gl_FragColor=vec4(1.0,.28+.37*(1.-vLife),.035,a*.7);#include <colorspace_fragment>}`.replace(';#include',';\n#include')}));
 const sparks=new T.Points(pointGeometry(sparkCount),sparkMaterial);sparks.name='Fine embers rising from the wood';sparks.frustumCulled=false;sparks.renderOrder=5;root.add(sparks);
 const smokeMaterial=mat(new T.ShaderMaterial({uniforms:{uTime:{value:time},uScale:{value:mobile?700:950}},transparent:true,depthWrite:false,toneMapped:false,
  vertexShader:`uniform float uTime,uScale;attribute float aSeed;varying float vLife,vSeed;void main(){float life=fract(aSeed+uTime*.067);vLife=life;vSeed=aSeed;vec3 p=vec3(-8.+.58*life*life+sin(aSeed*31.+life*3.)*.16*life,8.50+life*4.15,-16.12+.16*life+cos(aSeed*23.)*.16*life);vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp((.27+life*1.05)*uScale/max(.5,-v.z),1.,180.);}`,
  fragmentShader:`uniform float uTime;varying float vLife,vSeed;${noise}void main(){vec2 p=gl_PointCoord-.5;float radius=length(p*vec2(1.,.91));float cloud=turbulence(p*5.+vec2(vSeed*19.,uTime*.035));float a=smoothstep(.5,.13,radius+.10*(cloud-.5))*smoothstep(0.,.06,vLife)*pow(1.-vLife,1.15)*(.055+.026*cloud);if(a<.002)discard;vec3 c=mix(vec3(.24,.18,.13),vec3(.10,.12,.15),smoothstep(.05,.6,vLife));gl_FragColor=vec4(c,a);\n#include <colorspace_fragment>}`
 }));
 const smoke=new T.Points(pointGeometry(smokeCount),smokeMaterial);smoke.name='Soft smoke leaving the flue above the glass';smoke.frustumCulled=false;smoke.renderOrder=6;root.add(smoke);
 onChange();
 return{
  root,solids,pickables:[],anchor:[-8,1.15,-15.25],
  obstacles:[{id:'gallery-fireplace',minX:-10.15,maxX:-5.85,minZ:-16.8,maxZ:-15.18,minY:-.09,maxY:3.35}],
  update(dt,eye,motion=true){
   if(disposed)return false;moving=!!motion;
   if(moving){const step=Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):0;time+=step;updates++;thermalClock.value=sparkMaterial.uniforms.uTime.value=smokeMaterial.uniforms.uTime.value=time;
    const flickerNoise=(t,seed)=>{const i=Math.floor(t),f=t-i,u=f*f*(3-2*f);return random(i+seed)*(1-u)+random(i+seed+1)*u;};
    const flicker=.84+flickerNoise(time*11.7,3.1)*.23+flickerNoise(time*3.9,17.2)*.12;
    warm.intensity=40*flicker;fill.intensity=14*(.89+flickerNoise(time*5.3,7.1)*.22);dirty=step>0;
   }
   if(eye){const distance=Math.hypot(eye.x+8,eye.y-1.17,eye.z+15.98),steps=distance>15?(mobile?10:16):distance>8?(mobile?14:22):maxSteps;if(steps!==flameUniforms.uSteps.value){flameUniforms.uSteps.value=steps;dirty=true;}}
   const changed=dirty;dirty=false;return changed;
  },
   diagnostics:()=>({kind:'suspended-panoramic-hearth',ready:!disposed,fireplace:true,minimal:true,ultraMinimal:true,stonePlinth:true,stoneContinuousWithFloor:true,canopyThickness:.16,openSides:true,charredLogs:7,brokenBranches:2,irregularWoodGeometry:true,endGrain:true,instancedCoals:coalCount,scatteredCoalBed:true,volumetricFlames:true,continuousFuelBed:true,irregularFuelHotspots:true,tonemappedThermalEmission:true,antialiasedWoodCracks:true,threeDimensionalFlow:true,hardwareFlowVolume:true,flowTextureSize:flowSize,advectedFlamePockets:true,thermalEmission:true,flameSteps:flameUniforms.uSteps.value,maxFlameSteps:maxSteps,distanceLOD:true,flameBounds:[3.66,1.72,1.04],warmLights:2,lightIntensity:disposed?0:+warm.intensity.toFixed(2),smokeOutside:true,smokeParticles:smokeCount,sparks:sparkCount,flueTop:8.61,smokeTop:12.65,position:[-8,0,-16.05],anchor:[-8,1.15,-15.25],time:+time.toFixed(3),updates,moving,externalFiles:0,parentClock:true,disposed}),
  dispose(){if(disposed)return;disposed=true;moving=false;root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();hearthStone.dispose();coalBed.dispose();warm.dispose();fill.dispose();root.clear();}
 };
}
