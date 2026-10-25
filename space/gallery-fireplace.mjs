import * as T from './vendor/three-0.180.0.mjs';

// A suspended panoramic hearth, actually lit from within. Flames and smoke
// share the gallery clock: no image, movie, autonomous timer or external asset.
export function createGalleryFireplace(scene,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='The hearth — suspended fire and a chimney through the stars';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),solids=[];
 let time=11.7,disposed=false,dirty=true,updates=0,moving=false;
 const geo=g=>(geometries.add(g),g),mat=m=>(materials.add(m),m);
 const body=mat(new T.MeshStandardMaterial({color:0x090a0b,roughness:.81,metalness:.2}));
 const inside=mat(new T.MeshStandardMaterial({color:0x060404,roughness:.98,metalness:0}));
 const bronze=mat(new T.MeshStandardMaterial({color:0x4d3524,roughness:.43,metalness:.72}));
 const soot=mat(new T.MeshStandardMaterial({color:0x080707,roughness:.97}));
 const ember=mat(new T.MeshStandardMaterial({color:0x6c1b02,emissive:0xff3d00,emissiveIntensity:.9,roughness:1}));
 function box(width,height,depth){
  const w=width/2,h=height/2,r=Math.min(.026,width/12,height/12),s=new T.Shape();
  s.moveTo(-w+r,-h);s.lineTo(w-r,-h);s.quadraticCurveTo(w,-h,w,-h+r);s.lineTo(w,h-r);s.quadraticCurveTo(w,h,w-r,h);s.lineTo(-w+r,h);s.quadraticCurveTo(-w,h,-w,h-r);s.lineTo(-w,-h+r);s.quadraticCurveTo(-w,-h,-w+r,-h);
  const g=new T.ExtrudeGeometry(s,{depth:depth-.02,bevelEnabled:true,bevelSize:.012,bevelThickness:.01,bevelSegments:2,curveSegments:4});g.translate(0,0,-(depth-.02)/2);return geo(g);
 }
 function piece(g,m,position,name,solid=false){const o=new T.Mesh(g,m);o.position.set(...position);o.name=name;o.receiveShadow=true;o.castShadow=true;root.add(o);if(solid)solids.push(o);return o;}
 const block=(size,position,m,name,solid=true)=>piece(box(...size),m,position,name,solid);
 // The long low hearth is solid stone; the floating hood is supported only
 // by the slender flue. Its front opening stays entirely unobstructed.
 block([4.3,.30,1.62],[-8,.06,-15.99],body,'Floating black-stone hearth');
 block([3.88,.10,1.24],[-8,.255,-15.99],inside,'Recessed ember bed');
 block([4.08,1.12,1.16],[-8,2.73,-16.12],body,'Minimal suspended hood');
 block([3.94,.035,.034],[-8,2.156,-15.525],bronze,'Firelit bronze underside of the hood',false);
 block([4.12,.025,.035],[-8,.224,-15.17],bronze,'Firelit hearth edge',false);
 block([4.08,1.85,.10],[-8,1.18,-16.64],inside,'Dark refractory back of the fire');
 for(const x of [-10.02,-5.98])block([.08,1.92,1.12],[x,1.20,-16.1],body,'Thin fireplace cheek');
 const pipe=piece(geo(new T.CylinderGeometry(.205,.245,5.18,mobile?20:32)),body,[-8,5.87,-16.12],'Black chimney through the glass roof',true);
 const collar=piece(geo(new T.TorusGeometry(.27,.055,8,32)),body,[-8,6.22,-16.12],'Sealed roof collar');collar.rotation.x=Math.PI/2;
 const cap=piece(geo(new T.CylinderGeometry(.29,.29,.055,24)),body,[-8,8.61,-16.12],'Chimney rain cap');
 for(const x of [-8.16,-7.84])block([.025,.18,.025],[x,8.51,-16.12],body,'Discreet cap support',false);
 // A loose arrangement of charred real geometry and glowing embers gives
 // the fire a convincing base even when its parent clock is frozen.
 const charcoalGeo=geo(new T.CylinderGeometry(.072,.10,.88,9)),emberGeo=geo(new T.IcosahedronGeometry(.075,0));
 for(let i=0;i<7;i++){
  const log=piece(charcoalGeo,soot,[-9.42+i*.47,.39+(i%2)*.035,-15.99+Math.sin(i*4.9)*.16],'Charred wood');log.rotation.z=Math.PI/2+(i%2?.16:-.12);log.rotation.y=Math.sin(i*2.3)*.14;
 }
 for(let i=0;i<28;i++){const e=piece(emberGeo,ember,[-9.65+(i%10)*.365,.32+((i*7)%5)*.013,-16.34+Math.floor(i/10)*.28],'A glowing ember');e.scale.set(.6+(i%4)*.17,.30,.65+(i%3)*.22);}
 const warm=new T.PointLight(0xff8d3b,240,22,2);warm.position.set(-8,1.17,-15.15);warm.name='Firelight on the white stone';root.add(warm);
 const fill=new T.PointLight(0xffb46d,85,17,2);fill.position.set(-7.4,2.08,-14.95);fill.name='Warm reflected light across the room';root.add(fill);
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
    float breath=noise2(vec2(seed*20.+cell,uTime*.75));
    float height=clamp(.36+.55*breath+.08*sin(uTime*1.3+seed*13.),.28,.98);
    float rise=y/height,remaining=max(0.,1.-rise);
    float curl=sin(rise*5.4-uTime*(1.65+seed*.65)+seed*21.);
    float billow=noise2(vec2(rise*7.2-uTime*2.0,cell*3.7));
    float bend=(.23*curl+.16*(billow-.5))*pow(max(rise,0.),.92);
    float turbulenceFine=noise2(vec2(local*7.8+seed*31.,rise*11.-uTime*3.1));
    float width=(.285*pow(remaining,.68)+.008)*(.82+.26*billow);
    float distanceFromCore=abs(local-bend+.015*(turbulenceFine-.5));
    float body=1.-smoothstep(width*.38,width,distanceFromCore);
    body*=1.-smoothstep(.84,1.,rise);
    float filamentCenter=bend+.12*sin(rise*9.-uTime*2.4+seed*11.);
    float filamentWidth=.018*pow(remaining,.42)+.002;
    float filament=exp(-pow((local-filamentCenter)/filamentWidth,2.))*smoothstep(.18,.50,rise)*(1.-smoothstep(.80,1.,rise))*.34;
    float depthCenter=.50+.10*sin(seed*19.);
    float depthRadius=.24*pow(remaining,.45)+.055;
    float depth=1.-smoothstep(depthRadius*.38,depthRadius,abs(q.z-depthCenter));
    float sides=smoothstep(0.,.035,q.x)*smoothstep(0.,.035,1.-q.x);
    float fineStructure=.68+.32*turbulenceFine;
    float density=max(body,filament)*depth*sides*fineStructure*smoothstep(0.,.035,y);
    float core=1.-smoothstep(0.,max(.001,width*.74),distanceFromCore);
    float heat=clamp(.30+.39*(1.-rise)+.31*core+.10*turbulenceFine,0.,1.);
    vec3 fire=mix(vec3(1.15,.052,.001),vec3(1.55,.58,.022),smoothstep(.21,.74,heat));
    fire=mix(fire,vec3(1.65,1.25,.63),smoothstep(.80,1.,heat));
    float a=1.-exp(-density*stride*3.25);colour+=(1.-alpha)*a*fire;alpha+=(1.-alpha)*a;
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
    const flicker=1.+.075*Math.sin(time*8.2)+.032*Math.sin(time*13.7+1.9)+.022*Math.sin(time*23.1);warm.intensity=240*flicker;fill.intensity=85*(1.+.035*Math.sin(time*5.3));ember.emissiveIntensity=.87+.09*Math.sin(time*3.1);dirty=step>0;
   }
   const changed=dirty;dirty=false;return changed;
  },
  diagnostics:()=>({kind:'suspended-panoramic-hearth',ready:!disposed,fireplace:true,minimal:true,volumetricFlames:true,flameSteps:mobile?12:20,flameBounds:[3.66,1.68,.84],warmLights:2,lightIntensity:disposed?0:+warm.intensity.toFixed(2),smokeOutside:true,smokeParticles:smokeCount,sparks:sparkCount,flueTop:8.61,smokeTop:12.65,position:[-8,0,-16.05],anchor:[-8,1.15,-15.25],time:+time.toFixed(3),updates,moving,externalFiles:0,parentClock:true,disposed}),
  dispose(){if(disposed)return;disposed=true;moving=false;root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();warm.dispose();fill.dispose();root.clear();}
 };
}
