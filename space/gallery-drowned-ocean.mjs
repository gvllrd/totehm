import * as T from './vendor/three-0.180.0.mjs';

// A dense radial surface resolves the water beside the sanctuary and the
// distant breakers without placing an equally expensive grid on the horizon.
export function createDrownedOcean(scene,{
 mobile=false,onChange=()=>{},moonDirection=new T.Vector3(.38,.43,-.82),
 horizonColor=new T.Color(0x101e32),environmentTexture=null
}={}){
 const root=new T.Group();root.name='The great flood — rolling walls of water';scene.add(root);
 const BASE=-112,CALM=135,SPAN=24000,rings=mobile?160:256,sectors=mobile?192:288;
 // Every term is bounded independently. The four-metre rolled lip is included;
 // even simultaneous constructive interference remains beneath the terrace.
 const crestUpperBound=BASE+46*(1+.30+.12)+4+12*(1+.18)+5+2.8+1.4+.8;
 const uniforms={uOceanTime:{value:0},uMoon:{value:moonDirection.clone().normalize()},uHorizon:{value:horizonColor.clone()},uEnvironment:{value:environmentTexture},uHasEnvironment:{value:!!environmentTexture}};
 const surface=`
  float bandLimit(float phaseStep){return 1.-smoothstep(.7,1.2,phaseStep);}
  float bandDerivative(float phaseStep){float t=clamp((phaseStep-.7)/.5,0.,1.);return -12.*t*(1.-t);}
  struct OceanSurface{vec3 p;vec3 normal;float phaseA;float phaseB;vec2 gradientA;float crest;float breaking;};
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
   float radius=max(length(q),.001),u=clamp((radius-135.)/185.,0.,1.);
   vec2 radial=q/radius;
   // A wave may occupy many metres while its high harmonics are still
   // smaller than a remote radial cell. Filter each frequency before the
   // Nyquist limit; normals, whitecaps and spray use the same filtered sea.
   float radialStep=(radius+24.)*${Math.log(501)}/${rings}.;
   float angularStep=radius*6.28318530718/${sectors}.;
   float sampleStep=max(radialStep,angularStep);
   float stepDerivative=radialStep>=angularStep?${Math.log(501)/rings}:${Math.PI*2/sectors};
   float e=u*u*(3.-2.*u);vec2 de=q/radius*(6.*u*(1.-u)/185.);
   vec3 p=vec3(q.x,-112.,q.y),dx=vec3(1,0,0),dz=vec3(0,0,1);
   vec2 a=q-vec2(-2900.,-4500.),b=q-vec2(3900.,-3600.);
   float ra=max(length(a),1.),rb=max(length(b),1.);vec2 da=a/ra,db=b/rb;
   vec2 dax=vec2(1.-da.x*da.x,-da.x*da.y)/ra,daz=vec2(-da.x*da.y,1.-da.y*da.y)/ra;
   vec2 dbx=vec2(1.-db.x*db.x,-db.x*db.y)/rb,dbz=vec2(-db.x*db.y,1.-db.y*db.y)/rb;
   float wa=q.x*.0013+q.y*.0021,wb=q.x*.004-q.y*.002;
   float warp=.45*sin(wa)+.18*sin(wb);
   vec2 warpGradient=vec2(.0013,.0021)*.45*cos(wa)+vec2(.004,-.002)*.18*cos(wb);
   float pa=ra*.0112+warp-time*.151-1.68;
   float pb=rb*.0157+.21*sin(q.x*.0021+q.y*.0014)-time*.126+.35;
   vec2 ga=da*.0112+warpGradient,gb=db*.0157+vec2(.0021,.0014)*.21*cos(q.x*.0021+q.y*.0014);
   float la=bandLimit(sampleStep*.0112),lb=bandLimit(sampleStep*.0157),lc=bandLimit(sampleStep*.035);
   float dla=bandDerivative(sampleStep*.0112)*.0112*stepDerivative;
   float dlb=bandDerivative(sampleStep*.0157)*.0157*stepDerivative;
   float dlc=bandDerivative(sampleStep*.035)*.035*stepDerivative;
   vec2 ha=vec2(bandLimit(sampleStep*.0224),bandLimit(sampleStep*.0336));
   vec2 dha=vec2(bandDerivative(sampleStep*.0224)*.0224,bandDerivative(sampleStep*.0336)*.0336)*stepDerivative;
   float hb=bandLimit(sampleStep*.0314),dhb=bandDerivative(sampleStep*.0314)*.0314*stepDerivative;
   float curlFilter=bandLimit(sampleStep*.0448),curlSlope=bandDerivative(sampleStep*.0448)*.0448*stepDerivative;
   swell(p,dx,dz,da,dax,daz,pa,ga,46.,vec2(.30,.12)*ha,.64,8.*curlFilter,e*la,de*la+radial*(e*dla));
   // Include the slowly changing LOD amplitudes in the analytic normal.
   float harmonicDerivative=46.*(.30*dha.x*sin(pa*2.)+.12*dha.y*sin(pa*3.));
   float cva=.5+.5*sin(pa+.42),lipA=pow(cva,9.);
   vec3 curlDerivative=vec3(da.x,.5,da.y)*(8.*curlSlope*lipA);
   dx+=e*la*(vec3(0.,harmonicDerivative*radial.x,0.)+curlDerivative*radial.x);
   dz+=e*la*(vec3(0.,harmonicDerivative*radial.y,0.)+curlDerivative*radial.y);
   swell(p,dx,dz,db,dbx,dbz,pb,gb,12.,vec2(.18*hb,0.),.42,0.,e*lb,de*lb+radial*(e*dlb));
   dx.y+=e*lb*12.*.18*dhb*sin(pb*2.)*radial.x;dz.y+=e*lb*12.*.18*dhb*sin(pb*2.)*radial.y;
   const vec2 dc=vec2(.34014,.94037);float pc=dot(q,dc)*.035-time*.36+.7;
   swell(p,dx,dz,dc,vec2(0),vec2(0),pc,dc*.035,5.,vec2(0),.18,0.,e*lc,de*lc+radial*(e*dlc));
   // Geometry detail stops within330m. Beyond it, short waves are represented
   // by the independently filtered per-pixel normal, not aliased triangles.
   float fu=clamp((radius-110.)/220.,0.,1.),detail=1.-fu*fu*(3.-2.*fu);
   vec2 detailGradient=-radial*(6.*fu*(1.-fu)/220.);
   vec3 phase=vec3(dot(q,vec2(.93,.367))*.095-time*.61,dot(q,vec2(-.621,.784))*.18+time*.83,dot(q,vec2(.276,-.961))*.32-time*1.17);
   vec3 amp=vec3(2.8*bandLimit(sampleStep*.095),1.4*bandLimit(sampleStep*.18),.8*bandLimit(sampleStep*.32));
   vec3 ampDerivative=vec3(2.8*bandDerivative(sampleStep*.095)*.095,1.4*bandDerivative(sampleStep*.18)*.18,.8*bandDerivative(sampleStep*.32)*.32)*stepDerivative;
   float shortHeight=dot(sin(phase),amp);
   vec2 shortGradient=vec2(.93,.367)*(amp.x*.095*cos(phase.x))+vec2(-.621,.784)*(amp.y*.18*cos(phase.y))+vec2(.276,-.961)*(amp.z*.32*cos(phase.z));
   shortGradient+=radial*dot(sin(phase),ampDerivative);
   p.y+=detail*shortHeight;dx.y+=detail*shortGradient.x+detailGradient.x*shortHeight;dz.y+=detail*shortGradient.y+detailGradient.y*shortHeight;
   float ca=.5+.5*sin(pa+.42),cb=.5+.5*sin(pb+.42);
   float compression=clamp(1.-(dx.x*dz.z-dx.z*dz.x),0.,1.);
   float visibleCrestA=la*bandLimit(sampleStep*.0336),visibleCrestB=lb*bandLimit(sampleStep*.0471);
   OceanSurface result;result.p=p;result.normal=normalize(cross(dz,dx));result.phaseA=pa;result.phaseB=pb;result.gradientA=ga;
   result.crest=e*max(pow(ca,5.)*visibleCrestA,pow(cb,5.)*.48*visibleCrestB);
   result.breaking=e*max(pow(ca,7.)*visibleCrestA*(.46+.54*smoothstep(.10,.62,compression)),pow(cb,9.)*.38*visibleCrestB);
   return result;
  }
 `;
 const material=new T.ShaderMaterial({uniforms,side:T.DoubleSide,toneMapped:true,
  vertexShader:`uniform float uOceanTime;varying vec3 vWorld,vNormal;varying vec2 vOriginal,vPhase;varying float vCrest,vBreaking;${surface}
   void main(){OceanSurface sea=oceanSurface(position.xz,uOceanTime);vWorld=sea.p;vNormal=sea.normal;vOriginal=position.xz;vPhase=vec2(sea.phaseA,sea.phaseB);vCrest=sea.crest;vBreaking=sea.breaking;gl_Position=projectionMatrix*viewMatrix*vec4(sea.p,1.);}`,
  fragmentShader:`uniform float uOceanTime;uniform vec3 uMoon,uHorizon;uniform sampler2D uEnvironment;uniform bool uHasEnvironment;
   varying vec3 vWorld,vNormal;varying vec2 vOriginal,vPhase;varying float vCrest,vBreaking;
   const float PI=3.14159265359;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   float phaseDistance(float p){return atan(sin(p),cos(p));}
   vec2 ripple(vec2 p,vec2 direction,float frequency,float strength,float speed,float footprint){return direction*cos(dot(p,direction)*frequency+uOceanTime*speed)*strength*(1.-smoothstep(.35,1.8,footprint*frequency));}
   void main(){
    vec2 q=vOriginal;float footprint=max(length(dFdx(q)),length(dFdy(q)));
    vec2 small=ripple(q,vec2(.81,.586),.79,.095,.91,footprint)+ripple(q,vec2(-.416,.909),1.67,.061,-1.3,footprint)+ripple(q,vec2(.273,-.962),3.11,.031,1.8,footprint);
    vec3 n=normalize(vNormal+vec3(-small.x,0.,-small.y));if(!gl_FrontFacing)n=-n;
    vec3 view=normalize(cameraPosition-vWorld),halfway=normalize(view+uMoon);
    float nv=max(dot(n,view),.015),nl=max(dot(n,uMoon),0.),nh=max(dot(n,halfway),0.);
    float fresnel=.021+.979*pow(1.-nv,5.);vec3 reflected=reflect(-view,n);
    vec3 sky=mix(uHorizon*.9,vec3(.009,.019,.041),pow(max(reflected.y,0.),.5));
    if(uHasEnvironment){vec2 uv=vec2(atan(reflected.z,reflected.x)*.159154943+.5,asin(clamp(reflected.y,-1.,1.))*.318309886+.5);sky=mix(sky,texture2D(uEnvironment,uv,2.1).rgb,.64);}
    vec3 water=vec3(.003,.019,.031)*(.8+nl*.65);
    water+=vec3(.002,.016,.024)*vCrest*(.35+.65*nl);
    float thinWall=pow(max(dot(-n,uMoon),0.),1.6)*vCrest*(.3+.7*(1.-nv));
    float through=pow(max(dot(view,-uMoon),0.),3.)*vCrest;
    water+=vec3(.014,.075,.093)*(thinWall+through*.42);
    vec3 colour=mix(water,sky,fresnel*.93);
    // A rough microfacet reflection stretches the real moon across the moving
    // facets rather than printing a white reflection stripe on the sea.
    float roughness=.29,alpha=roughness*roughness,a2=alpha*alpha;
    float denom=nh*nh*(a2-1.)+1.,distribution=a2/(PI*denom*denom+.00001);
    float k=.167,visibility=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));
    float f=.021+.979*pow(1.-max(dot(halfway,view),0.),5.);
    float specular=min(.42,distribution*visibility*f/max(4.*nv*nl,.003));
    colour+=vec3(.61,.77,1.)*specular*.44;
    // Breaking foam follows the broad, leaning lip in torn patches.
    // Projected derivatives filter its fine bubble detail at a distance.
    float d=phaseDistance(vPhase.x-1.15),db=phaseDistance(vPhase.y-1.15);
    float aa=max(fwidth(d),.012),aab=max(fwidth(db),.012);
    float lip=(1.-smoothstep(.12+aa,.33+aa,abs(d)))*vBreaking;
    lip=max(lip,(1.-smoothstep(.06+aab,.17+aab,abs(db)))*vBreaking*.38);
    vec2 flow=q*.027+vec2(uOceanTime*.018,-uOceanTime*.011);
    float eddy=noise(flow+noise(flow*.37)*2.7),fine=noise(flow*3.1+vec2(4.2,1.7));
    float breakPatch=smoothstep(.19,.72,eddy*.65+fine*.35);
    float pores=noise(flow*7.7+vec2(eddy*2.1,fine));
    float fineVisible=1.-smoothstep(.55,1.8,footprint*.21);
    float bubbles=mix(.75,.55+.45*pores,fineVisible);
    float foam=lip*(.20+.8*breakPatch)*bubbles;
    vec3 foamColour=vec3(.35,.48,.57)*(.53+.47*nl);
    colour=mix(colour,foamColour,clamp(foam,0.,.9));
    float distanceToEye=length(cameraPosition-vWorld),haze=1.-exp(-pow(distanceToEye*.00029,1.5));
    colour=mix(colour,uHorizon,haze*.96);gl_FragColor=vec4(colour,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
 const stride=sectors+1,positions=new Float32Array((rings+1)*stride*3),indices=new ((rings+1)*stride>65535?Uint32Array:Uint16Array)(rings*sectors*6);
 const log=Math.log(1+12000/24);let offset=0;
 for(let r=0;r<=rings;r++){
  const radius=24*(Math.exp(r/rings*log)-1);
  for(let a=0;a<=sectors;a++){const angle=a/sectors*Math.PI*2,index=(r*stride+a)*3;positions[index]=Math.sin(angle)*radius;positions[index+1]=BASE;positions[index+2]=-Math.cos(angle)*radius;}
 }
 for(let r=0;r<rings;r++)for(let a=0;a<sectors;a++){const p=r*stride+a,b=p+stride;indices.set([p,b+1,b,p,p+1,b+1],offset);offset+=6;}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setIndex(new T.BufferAttribute(indices,1));
 const ocean=new T.Mesh(geometry,material);ocean.name='Twelve-kilometre ocean with rolling breakers';ocean.frustumCulled=false;root.add(ocean);
 // A small, real point field catches the breaking lip as drifting silver mist.
 // It shares the same displacement equations, so particles cannot detach from
 // the swell when time is paused or the user moves around the temple.
 let seed=0x534541;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const sprayCount=mobile?700:1600,sprayAnchors=new Float32Array(sprayCount*3),sprayLife=new Float32Array(sprayCount),spraySize=new Float32Array(sprayCount);
 for(let i=0;i<sprayCount;i++){const angle=random()*Math.PI*2,radius=270+Math.pow(random(),.6)*1650;sprayAnchors.set([Math.cos(angle)*radius,0,Math.sin(angle)*radius],i*3);sprayLife[i]=random();spraySize[i]=.55+random()*1.2;}
 const sprayGeometry=new T.BufferGeometry();sprayGeometry.setAttribute('position',new T.BufferAttribute(sprayAnchors,3));sprayGeometry.setAttribute('aLife',new T.BufferAttribute(sprayLife,1));sprayGeometry.setAttribute('aSize',new T.BufferAttribute(spraySize,1));
 const sprayMaterial=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,toneMapped:true,
  vertexShader:`uniform float uOceanTime;attribute float aLife,aSize;varying float vAlpha;${surface}
   void main(){float age=fract(aLife+uOceanTime*.125);vec2 anchor=position.xz;OceanSurface seed=oceanSurface(anchor,uOceanTime);float delta=atan(sin(seed.phaseA-1.15),cos(seed.phaseA-1.15));anchor-=seed.gradientA*delta/max(dot(seed.gradientA,seed.gradientA),.00001);OceanSurface sea=oceanSurface(anchor,uOceanTime);vec3 p=sea.p+vec3(age*23.,2.+age*15.-age*age*8.,-age*15.);float distanceToEye=length(cameraPosition-p);vAlpha=sea.breaking*sin(age*3.14159265)*pow(1.-age,1.4)*(1.-smoothstep(1500.,2400.,distanceToEye));gl_PointSize=clamp(aSize*1550./distanceToEye,1.,10.);gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
  fragmentShader:`varying float vAlpha;void main(){vec2 p=(gl_PointCoord-.5)*vec2(1.45,.72);float soft=exp(-dot(p,p)*15.);float alpha=soft*vAlpha*.27;if(alpha<.004)discard;gl_FragColor=vec4(.49,.65,.77,alpha);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`
 });
 const spray=new T.Points(sprayGeometry,sprayMaterial);spray.name='Windblown spray on the breaking lips';spray.frustumCulled=false;root.add(spray);
 let time=0,disposed=false,animated=false;onChange();
 return{
  root,
  update(dt,eye,motion){if(disposed)return false;animated=!!motion;if(!animated)return false;const delta=Math.max(0,Math.min(Number(dt)||0,.1));if(!delta)return false;time+=delta;uniforms.uOceanTime.value=time;return true;},
  diagnostics:()=>({kind:'rolling-flood-ocean',time:+time.toFixed(4),animated,displacedGeometry:true,swells:3,waveLayers:6,
   baseHeight:BASE,crestUpperBound:+crestUpperBound.toFixed(4),centralCalmRadius:CALM,span:SPAN,
   triangles:geometry.index.count/3,lod:'band-limited logarithmic radial mesh',bandLimited:true,geometryDetailRadius:330,rings,sectors,rolledCrests:true,analyticNormals:true,
   foam:'derivative-filtered broken whitecaps',sprayParticles:sprayCount,sprayOnMovingCrests:true,skyReflections:!!environmentTexture,externalTextures:0,disposed}),
  dispose(){if(disposed)return;disposed=true;animated=false;geometry.dispose();material.dispose();sprayGeometry.dispose();sprayMaterial.dispose();root.removeFromParent();root.clear();}
 };
}
