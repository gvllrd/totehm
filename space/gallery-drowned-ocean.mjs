import * as T from './vendor/three-0.180.0.mjs';
import {WORLD_RADIUS,WORLD_CENTER_Y,drownedWorldGLSL} from './gallery-drowned-planet.mjs';

// A dense radial surface resolves the water beside the sanctuary and the
// distant breakers without placing an equally expensive grid on the horizon.
export function createDrownedOcean(scene,{
 mobile=false,onChange=()=>{},moonDirection=new T.Vector3(.38,.43,-.82),
 horizonColor=new T.Color(0x101e32),environmentTexture=null
}={}){
 const root=new T.Group();root.name='The great flood — rolling walls of water';scene.add(root);
 const BASE=-96,CALM=110,SPAN=24000;
 const innerRings=mobile?12:16,nearRings=mobile?176:256,farRings=mobile?36:48;
 const nearEdge=mobile?1250:1400,rings=innerRings+nearRings+farRings,sectors=mobile?384:512;
 const nearStep=(nearEdge-110)/nearRings;
 // Match the far logarithmic grid to the near grid's actual spacing.
 let lower=.01,upper=12000;
 for(let i=0;i<48;i++){const mid=(lower+upper)/2;if(mid*Math.log(1+(12000-nearEdge)/mid)/farRings>nearStep)upper=mid;else lower=mid;}
 const farAnchor=(lower+upper)/2,farLog=Math.log(1+(12000-nearEdge)/farAnchor);
 let time=0,disposed=false,animated=false,detailMapsLoaded=0,detailMapFailures=0;
 const textures=new Set(),loader=globalThis.document?new T.TextureLoader():null;
 function fallback(pixel){const t=new T.DataTexture(new Uint8Array(pixel),1,1);t.needsUpdate=true;textures.add(t);return t;}
 const flatNormal=fallback([128,128,255,255]),emptyFoam=fallback([0,0,128,255]);
 // Every term is bounded independently. The five-metre rolled lip is included;
 // even simultaneous constructive interference remains beneath the terrace.
 const crestUpperBound=BASE+40*(1+.30+.12)+5+9*(1+.18)+5+3.6+2.3+1.2;
 const uniforms={uOceanTime:{value:0},uMoon:{value:moonDirection.clone().normalize()},uHorizon:{value:horizonColor.clone()},uEnvironment:{value:environmentTexture},uHasEnvironment:{value:!!environmentTexture},uNormalMap:{value:flatNormal},uFoamMap:{value:emptyFoam}};
 function detailMap(name,uniform){
  if(!loader)return;
  const texture=loader.load('/assets/ocean/'+name,loaded=>{
   if(disposed){loaded.dispose();return;}
   uniforms[uniform].value=loaded;detailMapsLoaded++;onChange();
  },undefined,()=>{if(!disposed){detailMapFailures++;onChange();}});
  texture.colorSpace=T.NoColorSpace;texture.flipY=false;texture.wrapS=texture.wrapT=T.RepeatWrapping;
  texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.anisotropy=mobile?2:4;
  textures.add(texture);
 }
 detailMap('sea-normal.webp','uNormalMap');detailMap('sea-foam.webp','uFoamMap');
 const surface=`
  float bandLimit(float phaseStep){return 1.-smoothstep(.7,1.2,phaseStep);}
  float bandDerivative(float phaseStep){float t=clamp((phaseStep-.7)/.5,0.,1.);return -12.*t*(1.-t);}
  struct OceanSurface{vec3 p;vec3 normal;vec3 outward;float waveHeight;float phaseA;float phaseB;vec2 gradientA;float crest;float breaking;float energy;float shortFoam;};
  void swell(inout vec3 p,inout vec3 dx,inout vec3 dz,vec2 direction,vec2 dirDx,vec2 dirDz,
   float phase,vec2 gradient,float amplitude,vec2 harmonics,float chop,float curl,float e,vec2 de){
   float c=.5+.5*sin(phase+.42),c2=c*c,c4=c2*c2,c8=c4*c4;
   float lip=c8*c,lipDerivative=4.5*c8*cos(phase+.42);
   float f=sin(phase)+harmonics.x*sin(phase*2.)+harmonics.y*sin(phase*3.);
   float df=cos(phase)+2.*harmonics.x*cos(phase*2.)+3.*harmonics.y*cos(phase*3.);
   float curlHeight=curl*.5;
   float height=amplitude*f+curlHeight*lip;
   float dh=amplitude*df+curlHeight*lipDerivative;
   float travel=amplitude*chop*cos(phase)+curl*lip;
   float dTravel=-amplitude*chop*sin(phase)+curl*lipDerivative;
   vec2 shift=e*travel*direction;
   vec2 sx=(de.x*travel+e*dTravel*gradient.x)*direction+e*travel*dirDx;
   vec2 sz=(de.y*travel+e*dTravel*gradient.y)*direction+e*travel*dirDz;
   p+=vec3(shift.x,e*height,shift.y);
   dx+=vec3(sx.x,de.x*height+e*dh*gradient.x,sx.y);
   dz+=vec3(sz.x,de.y*height+e*dh*gradient.y,sz.y);
  }
  OceanSurface oceanSurface(vec2 q,float time){
   float radius=max(length(q),.001),u=clamp((radius-110.)/250.,0.,1.);
   vec2 radial=q/radius;
   // A wave may occupy many metres while its high harmonics are still
   // smaller than a remote radial cell. Filter each frequency before the
   // Nyquist limit; normals, whitecaps and spray use the same filtered sea.
   // These are the actual local cell dimensions of the near-uniform / far-log mesh.
   float nearStep=${nearStep};
   float farScale=${farLog/farRings};
   float radialStep=radius<110.?110./${innerRings}.:radius<${nearEdge}.?nearStep:(radius-${nearEdge}.+${farAnchor})*farScale;
   float angularStep=radius*6.28318530718/${sectors}.;
   float sampleStep=max(radialStep,angularStep);
   float stepDerivative=radialStep>=angularStep?(radius<${nearEdge}.?0.:farScale):${Math.PI*2/sectors};
   float e=u*u*(3.-2.*u);vec2 de=q/radius*(6.*u*(1.-u)/250.);
   vec3 p=vec3(q.x,-96.,q.y),dx=vec3(1,0,0),dz=vec3(0,0,1);
   vec2 a=q-vec2(-2900.,-4500.),b=q-vec2(-6500.,-4800.);
   float ra=max(length(a),1.),rb=max(length(b),1.);vec2 da=a/ra,db=b/rb;
   vec2 dax=vec2(1.-da.x*da.x,-da.x*da.y)/ra,daz=vec2(-da.x*da.y,1.-da.y*da.y)/ra;
   vec2 dbx=vec2(1.-db.x*db.x,-db.x*db.y)/rb,dbz=vec2(-db.x*db.y,1.-db.y*db.y)/rb;
   float wa=q.x*.0013+q.y*.0021,wb=q.x*.004-q.y*.002;
   float wc=dot(q,vec2(.544,.839))*.019+time*.073;
   float warpFilter=bandLimit(sampleStep*.019);
   float warpSlope=bandDerivative(sampleStep*.019)*.019*stepDerivative;
   float warp=.45*sin(wa)+.18*sin(wb)+.12*sin(wc)*warpFilter;
   vec2 warpGradient=vec2(.0013,.0021)*.45*cos(wa)+vec2(.004,-.002)*.18*cos(wb)
    +vec2(.544,.839)*(.00228*cos(wc)*warpFilter)+radial*(.12*sin(wc)*warpSlope);
   float pa=ra*.0136+warp-time*.365-1.68;
   float pb=rb*.0225+.21*sin(q.x*.0021+q.y*.0014)-time*.47+.35;
   vec2 ga=da*.0136+warpGradient,gb=db*.0225+vec2(.0021,.0014)*.21*cos(q.x*.0021+q.y*.0014);
   // Long crests rise and fall along their length, rather than drawing
   // uninterrupted parallel ribbons around the island. The envelope never
   // exceeds one; include its gradient in the actual displaced normal.
   float crossA=dot(q,vec2(-.839,.544))*.0031+time*.037;
   float modulation=.94+.06*sin(crossA);
   vec2 modulationGradient=vec2(-.839,.544)*(.000186*cos(crossA));
   float la=bandLimit(sampleStep*.0136),lb=bandLimit(sampleStep*.0225),lc=bandLimit(sampleStep*.035);
   float dla=bandDerivative(sampleStep*.0136)*.0136*stepDerivative;
   float dlb=bandDerivative(sampleStep*.0225)*.0225*stepDerivative;
   float dlc=bandDerivative(sampleStep*.035)*.035*stepDerivative;
   vec2 ha=vec2(bandLimit(sampleStep*.0272),bandLimit(sampleStep*.0408));
   vec2 dha=vec2(bandDerivative(sampleStep*.0272)*.0272,bandDerivative(sampleStep*.0408)*.0408)*stepDerivative;
   float hb=bandLimit(sampleStep*.0450),dhb=bandDerivative(sampleStep*.0450)*.0450*stepDerivative;
   float curlFilter=bandLimit(sampleStep*.0544),curlSlope=bandDerivative(sampleStep*.0544)*.0544*stepDerivative;
   // A dominant travelling front, steepened horizontally before it spills.
   // Smaller swells follow the same storm: they ruffle long ridges instead
   // of intersecting at right angles to produce isolated conical hills.
   swell(p,dx,dz,da,dax,daz,pa,ga,40.,vec2(.30,.12)*ha,1.0,10.*curlFilter,e*la*modulation,(de*la+radial*(e*dla))*modulation+e*la*modulationGradient);
   // Include the slowly changing LOD amplitudes in the analytic normal.
   float harmonicDerivative=40.*(.30*dha.x*sin(pa*2.)+.12*dha.y*sin(pa*3.));
   float cva=.5+.5*sin(pa+.42),lipA=pow(cva,9.);
   vec3 curlDerivative=vec3(da.x,.5,da.y)*(10.*curlSlope*lipA);
   dx+=e*la*modulation*(vec3(0.,harmonicDerivative*radial.x,0.)+curlDerivative*radial.x);
   dz+=e*la*modulation*(vec3(0.,harmonicDerivative*radial.y,0.)+curlDerivative*radial.y);
   swell(p,dx,dz,db,dbx,dbz,pb,gb,9.,vec2(.18*hb,0.),.28,0.,e*lb,de*lb+radial*(e*dlb));
   dx.y+=e*lb*9.*.18*dhb*sin(pb*2.)*radial.x;dz.y+=e*lb*9.*.18*dhb*sin(pb*2.)*radial.y;
   const vec2 dc=vec2(.34014,.94037);float pc=dot(q,dc)*.035-time*.586+.7;
   swell(p,dx,dz,dc,vec2(0),vec2(0),pc,dc*.035,5.,vec2(0),.18,0.,e*lc,de*lc+radial*(e*dlc));
   // Resolved short waves taper by 1800m. Beyond it, wind waves are represented
   // by the independently filtered per-pixel normal, not aliased triangles.
   float fu=clamp((radius-160.)/1640.,0.,1.),detail=1.-fu*fu*(3.-2.*fu);
   vec2 detailGradient=-radial*(6.*fu*(1.-fu)/1640.);
   vec3 phase=vec3(dot(q,vec2(.93,.367))*.0571-time*.78,dot(q,vec2(-.621,.784))*.105+time*1.05,dot(q,vec2(.276,-.961))*.18-time*1.43);
   vec3 amp=vec3(3.6*bandLimit(sampleStep*.0571),2.3*bandLimit(sampleStep*.105),1.2*bandLimit(sampleStep*.18));
   vec3 ampDerivative=vec3(3.6*bandDerivative(sampleStep*.0571)*.0571,2.3*bandDerivative(sampleStep*.105)*.105,1.2*bandDerivative(sampleStep*.18)*.18)*stepDerivative;
   float shortHeight=dot(sin(phase),amp);
   vec2 shortGradient=vec2(.93,.367)*(amp.x*.0571*cos(phase.x))+vec2(-.621,.784)*(amp.y*.105*cos(phase.y))+vec2(.276,-.961)*(amp.z*.18*cos(phase.z));
   shortGradient+=radial*dot(sin(phase),ampDerivative);
   p.y+=e*detail*shortHeight;
   vec2 shortEnvelopeGradient=de*detail+e*detailGradient;
   dx.y+=e*detail*shortGradient.x+shortEnvelopeGradient.x*shortHeight;
   dz.y+=e*detail*shortGradient.y+shortEnvelopeGradient.y*shortHeight;
   float ca=.5+.5*sin(pa+.42),cb=.5+.5*sin(pb+.42);
   float compression=clamp(1.-(dx.x*dz.z-dx.z*dz.x),0.,1.);
   float visibleCrestA=la*bandLimit(sampleStep*.0408),visibleCrestB=lb*bandLimit(sampleStep*.0675);
   // Bend the resolved sea onto the same globe as the distant drowned world.
   // Transform both true surface tangents through this map's Jacobian; merely
   // rotating its old normal would flatten the steep breaking fronts.
   float arc=max(length(p.xz),.001),theta=arc/${WORLD_RADIUS}.;
   vec2 direction=p.xz/arc;float sn=sin(theta),cs=cos(theta),height=p.y+96.;
   float curvedRadius=${WORLD_RADIUS}.+height,s=curvedRadius*sn/arc,c=curvedRadius*cs/${WORLD_RADIUS}.;
   vec3 outward=vec3(direction.x*sn,cs,direction.y*sn);
   vec3 bendX=vec3(s+(c-s)*direction.x*direction.x,-curvedRadius*sn/${WORLD_RADIUS}.*direction.x,(c-s)*direction.x*direction.y);
   vec3 bendZ=vec3((c-s)*direction.x*direction.y,-curvedRadius*sn/${WORLD_RADIUS}.*direction.y,s+(c-s)*direction.y*direction.y);
   mat3 bend=mat3(bendX,outward,bendZ);dx=bend*dx;dz=bend*dz;
   p=vec3(0.,${WORLD_CENTER_Y}.,0.)+outward*curvedRadius;
   OceanSurface result;result.p=p;result.normal=normalize(cross(dz,dx));result.outward=outward;result.waveHeight=height;result.phaseA=pa;result.phaseB=pb;result.gradientA=ga;
   result.shortFoam=detail*e*max(smoothstep(.36,.98,sin(phase.x))*amp.x/3.6,smoothstep(.58,.98,sin(phase.y))*amp.y/2.3*.65);
   result.energy=e*la;result.crest=e*max(pow(ca,5.)*visibleCrestA,pow(cb,5.)*.48*visibleCrestB);
   result.breaking=e*max(pow(ca,7.)*visibleCrestA*(.46+.54*smoothstep(.10,.62,compression)),pow(cb,9.)*.38*visibleCrestB);
   return result;
  }
 `;
 const material=new T.ShaderMaterial({uniforms,side:T.DoubleSide,toneMapped:true,
  vertexShader:`uniform float uOceanTime;varying vec3 vWorld,vNormal;varying vec2 vOriginal,vPhase;varying float vCrest,vBreaking,vEnergy,vShortFoam,vWaveHeight;${surface}
   void main(){OceanSurface sea=oceanSurface(position.xz,uOceanTime);vWorld=sea.p;vNormal=sea.normal;vOriginal=position.xz;vPhase=vec2(sea.phaseA,sea.phaseB);vCrest=sea.crest;vBreaking=sea.breaking;vEnergy=sea.energy;vShortFoam=sea.shortFoam;vWaveHeight=sea.waveHeight;gl_Position=projectionMatrix*viewMatrix*vec4(sea.p,1.);}`,
  fragmentShader:`uniform float uOceanTime;uniform vec3 uMoon,uHorizon;uniform sampler2D uEnvironment,uNormalMap,uFoamMap;uniform bool uHasEnvironment;
   varying vec3 vWorld,vNormal;varying vec2 vOriginal,vPhase;varying float vCrest,vBreaking,vEnergy,vShortFoam,vWaveHeight;
   const float PI=3.14159265359;
   ${drownedWorldGLSL}
   float phaseDistance(float p){return atan(sin(p),cos(p));}
   vec2 turn(vec2 p){return vec2(.428*p.x-.904*p.y,.904*p.x+.428*p.y);}
   vec2 unturn(vec2 p){return vec2(.428*p.x+.904*p.y,-.904*p.x+.428*p.y);}
   mat3 waterFrame(vec3 normal,vec3 point,vec2 uv){
    vec3 px=dFdx(point),py=dFdy(point),pyPerp=cross(py,normal),pxPerp=cross(normal,px);
    vec2 ux=dFdx(uv),uy=dFdy(uv);
    vec3 tangent=pyPerp*ux.x+pxPerp*uy.x,bitangent=pyPerp*ux.y+pxPerp*uy.y;
    float scale=inversesqrt(max(max(dot(tangent,tangent),dot(bitangent,bitangent)),.0000001));
    return mat3(tangent*scale,bitangent*scale,normal);
   }
   vec3 marineSky(vec3 direction,float roughness){
    // Broad moonlit skylight remains present between the visible stars.
    // The stone receives this ambient light too; water must not reflect black.
    float elevation=clamp(direction.y,0.,1.);
    vec3 fill=mix(vec3(.020,.041,.066),vec3(.014,.030,.058),pow(elevation,.55));
    if(uHasEnvironment){
     vec2 uv=vec2(atan(direction.z,direction.x)*.159154943+.5,asin(clamp(direction.y,-1.,1.))*.318309886+.5);
     vec2 ux=dFdx(uv),uy=dFdy(uv);ux.x-=floor(ux.x+.5);uy.x-=floor(uy.x+.5);
     fill+=textureGrad(uEnvironment,uv,ux*exp2(roughness*7.),uy*exp2(roughness*7.)).rgb*.32;
    }
    float moonHalo=pow(max(dot(direction,uMoon),0.),44.);
    return fill+vec3(.13,.19,.25)*moonHalo;
   }
   void main(){
    vec2 q=vOriginal;vec3 view=normalize(cameraPosition-vWorld),ng=normalize(vNormal);
    if(!gl_FrontFacing)ng=-ng;
    float distanceToEye=length(cameraPosition-vWorld);
    // Local spectral slopes: two directions/scales in a real cotangent frame.
    // Mipmaps filter the capillaries, rather than turning distant waves into glitter.
    vec3 detailA=texture2D(uNormalMap,q/64.+vec2(-.011,.006)*uOceanTime).rgb*2.-1.;
    vec3 detailB=texture2D(uNormalMap,turn(q)/23.+vec2(.018,-.012)*uOceanTime).rgb*2.-1.;
    vec2 slopes=detailA.xy/max(detailA.z,.3)*.95+unturn(detailB.xy/max(detailB.z,.3))*.46;
    slopes*=1.-smoothstep(2400.,7000.,distanceToEye);
    vec3 n=normalize(waterFrame(ng,vWorld,q)*normalize(vec3(slopes,1.)));
    float nv=max(dot(n,view),.025),nl=max(dot(n,uMoon),0.);
    float fresnel=.0204+.9796*pow(1.-nv,5.);
    // Drained foam stretches down the storm direction, instead of painting
    // evenly sized white islands across every face of a wave.
    vec2 windSpace=vec2(dot(q,vec2(.839,-.544)),dot(q,vec2(.544,.839)));
    vec2 flow=windSpace/vec2(20.,44.)+vec2(.018,-.10)*uOceanTime;
    vec3 foamA=texture2D(uFoamMap,flow).rgb;
    vec3 foamB=texture2D(uFoamMap,turn(q)/157.+vec2(.012,-.009)*uOceanTime).rgb;
    float foamPatch=foamB.g*.72+foamA.g*.28;
    float roughness=.21+.075*foamB.g+smoothstep(900.,5500.,distanceToEye)*.085+.08*smoothstep(.52,.92,vBreaking);
    vec3 reflected=reflect(-view,n),sky=marineSky(reflected,roughness);
    // Clear deep water, moonlit body, and light transmitted through thin crests.
    float height=clamp((vWaveHeight+50.)/100.,0.,1.),hemi=.5+.5*max(ng.y,0.);
    float faceLight=.30+.48*nl+.22*hemi;
    vec3 water=mix(vec3(.003,.017,.029),vec3(.012,.068,.094),height)*faceLight;
    water+=vec3(.004,.014,.021)*(.35+.65*hemi);
    float thin=pow(max(dot(-ng,uMoon),0.),1.5)*vCrest*(.35+.65*(1.-nv));
    float through=pow(max(dot(view,-uMoon),0.),3.)*vCrest;
    water+=vec3(.018,.105,.122)*(thin+through*.48);
    vec3 colour=mix(water,sky,fresnel*.94);
    // Energy-shaped moon glints break into moving facets, never a painted stripe.
    vec3 halfway=normalize(view+uMoon);
    float nh=max(dot(n,halfway),0.),alpha=roughness*roughness,a2=alpha*alpha;
    float denominator=nh*nh*(a2-1.)+1.,distribution=a2/(PI*denominator*denominator+.00001);
    float k=pow(roughness+1.,2.)*.125;
    float visibility=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));
    float f=.0204+.9796*pow(1.-max(dot(halfway,view),0.),5.);
    float specular=distribution*visibility*f/max(4.*nv,.05);
    specular=specular/(1.+specular/1.2);
    colour+=vec3(.62,.78,.96)*specular*.88;
    // A breaking lip, scattered small whitecaps, then stretched cellular wakes.
    float crest=smoothstep(.57,.91,vBreaking);
    float foamSkin=pow(clamp(foamA.r*(.65+.35*foamA.b),0.,1.),.8);
    float lip=exp(-pow(phaseDistance(vPhase.x-.96)/.21,2.))*vEnergy;
    float froth=(crest*(.07+.66*foamSkin)+lip*(.13+.19*foamSkin))*smoothstep(.24,.66,foamPatch);
    float d=phaseDistance(vPhase.x-1.15);
    float trail=smoothstep(-1.85,-1.06,d)*(1.-smoothstep(-.52,.07,d));
    float wake=trail*vEnergy*smoothstep(.46,.76,foamPatch)*(.04+.96*foamSkin)*.20;
    float whitecaps=vShortFoam*smoothstep(.50,.80,foamPatch)*foamSkin*.35;
    float foam=clamp(froth+wake+whitecaps,0.,.97);
    vec3 foamColour=vec3(.54,.62,.65)*(.43+.46*nl+.11*hemi)*(.86+.14*foamA.b);
    colour=mix(colour,foamColour,foam);
    float orbital=smoothstep(1200.,4500.,cameraPosition.y);
    float haze=(1.-exp(-pow(distanceToEye*.00020,1.55)))*(1.-orbital);
    colour=mix(colour,uHorizon,haze*.96);
    if(orbital>.001){vec3 sphereDirection=normalize(vWorld-vec3(0.,${WORLD_CENTER_Y}.,0.));colour=mix(colour,oceanWorldRadiance(sphereDirection,view,uMoon),orbital*.88);}
    gl_FragColor=vec4(colour,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
 const stride=sectors+1,positions=new Float32Array((rings+1)*stride*3),indices=new ((rings+1)*stride>65535?Uint32Array:Uint16Array)(rings*sectors*6);
 let offset=0;
 for(let r=0;r<=rings;r++){
  const radius=r<=innerRings?110*r/innerRings:r<=innerRings+nearRings?110+(r-innerRings)*(nearEdge-110)/nearRings:nearEdge+farAnchor*(Math.exp((r-innerRings-nearRings)/farRings*farLog)-1);
  for(let a=0;a<=sectors;a++){const angle=a/sectors*Math.PI*2,index=(r*stride+a)*3;positions[index]=Math.sin(angle)*radius;positions[index+1]=BASE;positions[index+2]=-Math.cos(angle)*radius;}
 }
 for(let r=0;r<rings;r++)for(let a=0;a<sectors;a++){const p=r*stride+a,b=p+stride;indices.set([p,b+1,b,p,p+1,b+1],offset);offset+=6;}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setIndex(new T.BufferAttribute(indices,1));
 const ocean=new T.Mesh(geometry,material);ocean.name='Twelve-kilometre ocean with rolling breakers';ocean.frustumCulled=false;root.add(ocean);
 // A small, real point field catches the breaking lip as drifting silver mist.
 // It shares the same displacement equations, so particles cannot detach from
 // the swell when time is paused or the user moves around the temple.
 let seed=0x534541;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const sprayCount=mobile?1400:3600,sprayAnchors=new Float32Array(sprayCount*3),sprayLife=new Float32Array(sprayCount),spraySize=new Float32Array(sprayCount);
 for(let i=0;i<sprayCount;i++){const angle=random()*Math.PI*2,radius=270+Math.pow(random(),.6)*1650;sprayAnchors.set([Math.cos(angle)*radius,0,Math.sin(angle)*radius],i*3);sprayLife[i]=random();spraySize[i]=.65+random()*2.2;}
 const sprayGeometry=new T.BufferGeometry();sprayGeometry.setAttribute('position',new T.BufferAttribute(sprayAnchors,3));sprayGeometry.setAttribute('aLife',new T.BufferAttribute(sprayLife,1));sprayGeometry.setAttribute('aSize',new T.BufferAttribute(spraySize,1));
 const sprayMaterial=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,toneMapped:true,
  vertexShader:`uniform float uOceanTime;attribute float aLife,aSize;varying float vAlpha,vMist;${surface}
   void main(){float age=fract(aLife+uOceanTime*.125);vec2 anchor=position.xz;OceanSurface seed=oceanSurface(anchor,uOceanTime);float delta=atan(sin(seed.phaseA-.96),cos(seed.phaseA-.96));anchor-=seed.gradientA*delta/max(dot(seed.gradientA,seed.gradientA),.00001);OceanSurface sea=oceanSurface(anchor,uOceanTime);vec3 p=sea.p+sea.outward*(2.+age*15.-age*age*8.)+vec3(age*30.,0.,age*44.);float distanceToEye=length(cameraPosition-p);vMist=step(2.15,aSize);vAlpha=sea.breaking*sin(age*3.14159265)*pow(1.-age,1.4)*(1.-smoothstep(1500.,2400.,distanceToEye));gl_PointSize=clamp(aSize*mix(4300.,14500.,vMist)/distanceToEye,1.5,58.);gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
  fragmentShader:`varying float vAlpha,vMist;void main(){vec2 p=(gl_PointCoord-.5)*mix(vec2(.78,1.14),vec2(.60,2.65),vMist);float soft=exp(-dot(p,p)*15.);float alpha=soft*vAlpha*mix(.55,.19,vMist);if(alpha<.003)discard;gl_FragColor=vec4(.49,.65,.77,alpha);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`
 });
 const spray=new T.Points(sprayGeometry,sprayMaterial);spray.name='Windblown spray on the breaking lips';spray.frustumCulled=false;root.add(spray);
 onChange();
 return{
  root,
  update(dt,eye,motion){if(disposed)return false;animated=!!motion;if(!animated)return false;const delta=Math.max(0,Math.min(Number(dt)||0,.1));if(!delta)return false;time+=delta;uniforms.uOceanTime.value=time;return true;},
  diagnostics:()=>({kind:'rolling-flood-ocean',time:+time.toFixed(4),animated,displacedGeometry:true,swells:3,waveLayers:6,
   baseHeight:BASE,crestUpperBound:+crestUpperBound.toFixed(4),centralCalmRadius:CALM,span:SPAN,
   triangles:geometry.index.count/3,lod:'dense near-field / logarithmic horizon',bandLimited:true,geometryDetailRadius:1800,rings,sectors,rolledCrests:true,analyticNormals:true,sphericalWorld:true,worldRadius:WORLD_RADIUS,worldCenterY:WORLD_CENTER_Y,
   foam:'narrow spilling fronts and cellular aerated wakes',dominantStormFront:true,windStretchedSpindrift:true,windRippleLayers:2,detailMapsLoaded,detailMapFailures,detailTextureSize:[1024,1024],detailTextureFiles:2,detailTexturesLocal:true,translucentLips:true,mainWavePeriod:+(Math.PI*2/.365).toFixed(2),sprayParticles:sprayCount,sprayOnMovingCrests:true,skyReflections:!!environmentTexture,externalTextures:0,disposed}),
  dispose(){if(disposed)return;disposed=true;animated=false;geometry.dispose();material.dispose();sprayGeometry.dispose();sprayMaterial.dispose();for(const t of textures)t.dispose();root.removeFromParent();root.clear();}
 };
}
