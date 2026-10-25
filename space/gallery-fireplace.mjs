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
 const soot=mat(new T.MeshStandardMaterial({color:0x080707,roughness:.97}));
 const hearthStone=createWhiteStone({mobile,onChange});
 soot.name='Charred wood — irregular bark fissures and ember seams';
 soot.customProgramCacheKey=()=> 'charred-firewood-fissures-v1';
 soot.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCharWood;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCharWood=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vCharWood;
   float charHash(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+19.19);return fract(p.x*p.y);}
   float charNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(charHash(i),charHash(i+vec2(1,0)),f.x),mix(charHash(i+vec2(0,1)),charHash(i+vec2(1)),f.x),f.y);}
  `).replace('#include <map_fragment>',`#include <map_fragment>
   vec2 wood=vec2(atan(vCharWood.z,vCharWood.x)*2.7,vCharWood.y*9.);
   float grain=charNoise(wood*vec2(2.4,.27));
   float cracks=pow(1.-abs(sin(wood.x*2.9+charNoise(wood*.65)*3.2)),18.);
   float charPatch=charNoise(wood*vec2(.7,1.7));
   diffuseColor.rgb=vec3(.0045,.0037,.0031)*(.45+grain*1.7);
   float hot=cracks*smoothstep(.44,.74,charPatch);
  `).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   totalEmissiveRadiance+=vec3(.95,.075,.004)*hot*.72;
  `);
 };
 const ember=mat(new T.MeshStandardMaterial({color:0x6c1b02,emissive:0xff3d00,emissiveIntensity:.9,roughness:1}));
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
 const charcoalGeo=geo(new T.CylinderGeometry(.085,.13,.88,12)),emberGeo=geo(new T.IcosahedronGeometry(.075,0));
 for(let i=0;i<7;i++){
  const log=piece(charcoalGeo,soot,[-9.42+i*.47,.32+(i%3)*.035,-15.99+Math.sin(i*4.9)*.19],'Charred wood with glowing fissures');log.rotation.z=Math.PI/2+(i%2?.23:-.18);log.rotation.y=Math.sin(i*2.3)*.27;log.scale.set(1+(i%3)*.12,.84+(i%4)*.13,1);
 }
 const coalBed=new T.InstancedMesh(emberGeo,ember,28),coalTransform=new T.Object3D();coalBed.name='Scattered living coals — one draw';root.add(coalBed);
 for(let i=0;i<28;i++){coalTransform.position.set(-9.65+(i%10)*.365,.235+((i*7)%5)*.013,-16.34+Math.floor(i/10)*.28);coalTransform.scale.set(.6+(i%4)*.17,.30,.65+(i%3)*.22);coalTransform.rotation.y=i*2.39;coalTransform.updateMatrix();coalBed.setMatrixAt(i,coalTransform.matrix);}coalBed.instanceMatrix.needsUpdate=true;
 const warm=new T.PointLight(0xff8d3b,40,22,2);warm.position.set(-8,1.17,-15.15);warm.name='Firelight on the white stone';root.add(warm);
 const fill=new T.PointLight(0xffb46d,14,17,2);fill.position.set(-7.4,2.08,-14.95);fill.name='Warm reflected light across the room';root.add(fill);
 const flameUniforms={uTime:{value:time},uCenter:{value:new T.Vector3(-8,1.15,-15.93)},uHalf:{value:new T.Vector3(1.83,.84,.42)}};
 const noise=`
 float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
 float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}
 float turbulence(vec2 p){return noise2(p)*.57+noise2(p*2.07+7.1)*.28+noise2(p*4.13-3.7)*.15;}
 `;
 const flameMaterial=mat(new T.ShaderMaterial({uniforms:flameUniforms,transparent:true,depthWrite:false,side:T.BackSide,premultipliedAlpha:true,toneMapped:false,
  vertexShader:`varying vec3 vPoint;void main(){vPoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
  uniform float uTime;uniform vec3 uCenter,uHalf;varying vec3 vPoint;
  ${noise}
  vec2 intersectBox(vec3 ro,vec3 rd){vec3 inv=1./rd;vec3 a=(-uHalf-ro)*inv,b=(uHalf-ro)*inv;vec3 lo=min(a,b),hi=max(a,b);return vec2(max(max(lo.x,lo.y),lo.z),min(min(hi.x,hi.y),hi.z));}
  void main(){
   vec3 origin=cameraPosition-uCenter,ray=normalize(vPoint-origin);vec2 bounds=intersectBox(origin,ray);float begin=max(bounds.x,0.);if(bounds.y<=begin)discard;
   const int STEPS=${mobile?12:20};float stride=(bounds.y-begin)/float(STEPS);float jitter=hash21(gl_FragCoord.xy)*.65;vec3 colour=vec3(0.);float alpha=0.;
   for(int i=0;i<STEPS;i++){
    vec3 p=origin+ray*(begin+(float(i)+.18+jitter)*stride),q=(p+uHalf)/(uHalf*2.);
    // Coherent, separate plumes: a void between two pieces of burning wood
    // stays a void through the complete ray, rather than filling with other
    // phase-shifted sheets as the ray crosses the volume.
    float y=q.y,cell=floor(q.x*8.),local=fract(q.x*8.)-.5;
    float seed=hash21(vec2(cell+2.,19.71));
    float breath=noise2(vec2(seed*20.+cell,uTime*.87));
    float height=clamp(.28+.59*breath+.10*sin(uTime*1.61+seed*13.),.25,.98);
    float rise=y/height,remaining=max(0.,1.-rise);
    float curl=sin(rise*6.3-uTime*(2.1+seed*.82)+seed*21.);
    float billow=noise2(vec2(rise*8.2-uTime*2.7,cell*3.7));
    float bend=(.25*curl+.24*(billow-.5))*pow(max(rise,0.),.88);
    float turbulenceFine=noise2(vec2(local*10.8+seed*31.+q.z*1.6,rise*15.-uTime*4.1));
    float width=(.43*pow(remaining,.73)+.006)*(.82+.30*billow);
    float distanceFromCore=abs(local-bend+.043*(turbulenceFine-.5));
    float body=1.-smoothstep(width*.20,width,distanceFromCore);
    body*=1.-smoothstep(.84,1.,rise);
    // Upward advected pockets open and close in the luminous sheet. The
    // irregular holes, changing tip heights and depth wrinkles keep the fire
    // from reading as a row of identical candle-shaped opaque sprites.
    float tear=noise2(vec2(local*8.3+seed*17.,rise*9.7-uTime*3.4));
    body*=mix(1.,smoothstep(.23,.55,tear),smoothstep(.19,.76,rise)*.88);
    float filamentCenter=bend+.12*sin(rise*9.-uTime*2.4+seed*11.);
    float filamentWidth=.018*pow(remaining,.42)+.002;
    float filament=exp(-pow((local-filamentCenter)/filamentWidth,2.))*smoothstep(.18,.50,rise)*(1.-smoothstep(.80,1.,rise))*.34;
    float depthCenter=.50+.10*sin(seed*19.)+.10*sin(rise*8.-uTime*1.8+seed*9.);
    float depthRadius=.26*pow(remaining,.45)+.040;
    float depth=1.-smoothstep(depthRadius*.38,depthRadius,abs(q.z-depthCenter));
    float sides=smoothstep(0.,.035,q.x)*smoothstep(0.,.035,1.-q.x);
    float fineStructure=.49+.51*turbulenceFine;
    float density=max(body,filament)*depth*sides*fineStructure*smoothstep(0.,.035,y);
    float core=1.-smoothstep(0.,max(.001,width*.74),distanceFromCore);
    float heat=clamp(.25+.38*(1.-rise)+.27*core+.13*turbulenceFine,0.,1.);
    vec3 fire=mix(vec3(.95,.025,.0005),vec3(1.65,.49,.012),smoothstep(.21,.70,heat));
    fire=mix(fire,vec3(1.95,1.18,.39),smoothstep(.74,.98,heat));
    fire=mix(fire,vec3(.16,.20,.48),(.20+.42*seed)*(1.-smoothstep(.025,.10,rise)));
    float a=1.-exp(-density*stride*4.8);colour+=(1.-alpha)*a*fire;alpha+=(1.-alpha)*a;
   }
   if(alpha<.005)discard;gl_FragColor=vec4(colour/max(alpha,.00001),alpha);
   #include <colorspace_fragment>
   // The output colour space conversion happens before premultiplication;
   // low density must not turn a whole translucent rectangle into a glow.
   gl_FragColor.rgb*=gl_FragColor.a;
  }`}));
 const flame=piece(geo(new T.BoxGeometry(3.66,1.68,.84)),flameMaterial,flameUniforms.uCenter.value.toArray(),'Volumetric panoramic flames');flame.castShadow=flame.receiveShadow=false;flame.renderOrder=4;
 const sparkCount=mobile?22:40,smokeCount=mobile?18:28;
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
   if(moving){const step=Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):0;time+=step;updates++;flameUniforms.uTime.value=sparkMaterial.uniforms.uTime.value=smokeMaterial.uniforms.uTime.value=time;
    const flicker=1.+.075*Math.sin(time*8.2)+.032*Math.sin(time*13.7+1.9)+.022*Math.sin(time*23.1);warm.intensity=40*flicker;fill.intensity=14*(1.+.035*Math.sin(time*5.3));ember.emissiveIntensity=.87+.09*Math.sin(time*3.1);dirty=step>0;
   }
   const changed=dirty;dirty=false;return changed;
  },
   diagnostics:()=>({kind:'suspended-panoramic-hearth',ready:!disposed,fireplace:true,minimal:true,ultraMinimal:true,stonePlinth:true,stoneContinuousWithFloor:true,canopyThickness:.16,openSides:true,charredLogs:7,instancedCoals:28,volumetricFlames:true,advectedFlamePockets:true,flameSteps:mobile?12:20,flameBounds:[3.66,1.68,.84],warmLights:2,lightIntensity:disposed?0:+warm.intensity.toFixed(2),smokeOutside:true,smokeParticles:smokeCount,sparks:sparkCount,flueTop:8.61,smokeTop:12.65,position:[-8,0,-16.05],anchor:[-8,1.15,-15.25],time:+time.toFixed(3),updates,moving,externalFiles:0,parentClock:true,disposed}),
  dispose(){if(disposed)return;disposed=true;moving=false;root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();hearthStone.dispose();coalBed.dispose();warm.dispose();fill.dispose();root.clear();}
 };
}
