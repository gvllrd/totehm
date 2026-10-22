import * as T from './vendor/three-0.180.0.mjs';

// The last summit stands above this water. Every swell is actual displaced
// geometry: its silhouette, shade and silver breaking lip move together.
export function createDrownedOcean(scene,{
 mobile=false,onChange=()=>{},moonDirection=new T.Vector3(.38,.43,-.82),
 horizonColor=new T.Color(0x101e32)
}={}){
 const root=new T.Group();root.name='The drowned world — echoes of the flood';scene.add(root);
 const BASE=-105,CALM=160,segments=mobile?104:164;
 // These are analytic maxima, not samples: each bounded profile and small
 // ripple is included. Even the largest combined crest stays below −37 m.
 const crestUpperBound=BASE+68*(1-35/128)+20*(1-5/16)+2.25+1.1+.55;
 const uniforms={uTime:{value:0},uMoon:{value:moonDirection.clone().normalize()},uHorizon:{value:horizonColor.clone()}};
 const surface=`
  const float WATER_LEVEL=-105.;
  struct OceanSurface{float height;vec2 slope;float breaking;float crest;};
  OceanSurface oceanSurface(vec2 p,float time){
   float radius=max(length(p),.001),u=clamp((radius-160.)/200.,0.,1.);
   float envelope=u*u*(3.-2.*u);
   vec2 envelopeGradient=p/radius*(6.*u*(1.-u)/200.);
   vec2 a=p-vec2(-1480.,-920.),b=p-vec2(1320.,-1380.);
   float ra=max(length(a),1.),rb=max(length(b),1.);
   vec2 da=a/ra,db=b/rb;
   float pa=ra*.00997331-time*.076+.58;
   float pb=rb*.01336848-time*.059-1.7;
   float ca=.5+.5*cos(pa),cb=.5+.5*cos(pb);
   float ca2=ca*ca,ca3=ca2*ca,ca4=ca2*ca2,cb2=cb*cb,cb3=cb2*cb;
   float modulation=.84+.16*sin(p.x*.0016+p.y*.0029+.7);
   vec2 modulationGradient=vec2(.0016,.0029)*.16*cos(p.x*.0016+p.y*.0029+.7);
   float large=68.*modulation*(ca4-.2734375)+20.*(cb3-.3125);
   vec2 slope=(-136.*modulation*ca3*sin(pa)*.00997331)*da
     +68.*(ca4-.2734375)*modulationGradient
     +(-30.*cb2*sin(pb)*.01336848)*db;
   float p1=dot(p,vec2(.93,.367))*.037-time*.32;
   float p2=dot(p,vec2(-.621,.784))*.063+time*.43;
   float p3=dot(p,vec2(.276,-.961))*.109-time*.57;
   float small=2.25*sin(p1)+1.1*sin(p2)+.55*sin(p3);
   vec2 smallSlope=vec2(.93,.367)*(.08325*cos(p1))
     +vec2(-.621,.784)*(.0693*cos(p2))+vec2(.276,-.961)*(.05995*cos(p3));
   OceanSurface result;
   result.height=WATER_LEVEL+envelope*large+small;
   result.slope=envelope*slope+large*envelopeGradient+smallSlope;
   // The steeper leeward lip catches the foam. The broad face remains dark,
   // so a wave reads as a moving wall of water rather than a white stripe.
   float frontA=smoothstep(-.05,.6,sin(pa));
   float frontB=smoothstep(-.05,.65,sin(pb));
   result.breaking=envelope*max(smoothstep(.67,.965,ca)*frontA,smoothstep(.78,.98,cb)*frontB*.57);
   result.crest=envelope*max(ca4,cb3*.5);
   return result;
  }
 `;
 const material=new T.ShaderMaterial({
  uniforms,side:T.FrontSide,transparent:false,toneMapped:true,
  vertexShader:`
   uniform float uTime;
   varying vec3 vWorld,vOceanNormal;
   varying float vBreaking,vCrest;
   ${surface}
   void main(){
    OceanSurface sea=oceanSurface(position.xz,uTime);
    vec3 displaced=vec3(position.x,sea.height,position.z);
    vWorld=displaced;vOceanNormal=normalize(vec3(-sea.slope.x,1.,-sea.slope.y));
    vBreaking=sea.breaking;vCrest=sea.crest;
    gl_Position=projectionMatrix*viewMatrix*vec4(displaced,1.);
   }`,
  fragmentShader:`
   uniform float uTime;uniform vec3 uMoon,uHorizon;
   varying vec3 vWorld,vOceanNormal;varying float vBreaking,vCrest;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   void main(){
    vec2 p=vWorld.xz;
    float footprint=max(length(dFdx(p)),length(dFdy(p)));
    float microVisibility=1.-smoothstep(.6,4.5,footprint);
    vec2 micro=vec2(.022*cos(dot(p,vec2(.71,.704))*.73+uTime*.92),.018*sin(dot(p,vec2(-.86,.51))*1.17-uTime*1.23))*microVisibility;
    vec3 n=normalize(vOceanNormal+vec3(micro.x,0.,micro.y));
    vec3 viewDirection=normalize(cameraPosition-vWorld);
    float facing=max(dot(n,viewDirection),0.);
    float fresnel=.028+.972*pow(1.-facing,5.);
    float moonFacing=max(dot(n,uMoon),0.);
    vec3 reflectedRay=reflect(-viewDirection,n);
    float skyElevation=clamp(reflectedRay.y,0.,1.);
    vec3 sky=mix(uHorizon*.85,vec3(.018,.034,.069),pow(skyElevation,.44));
    vec3 deep=mix(vec3(.0014,.005,.010),vec3(.004,.022,.036),moonFacing*.6+vCrest*.18);
    vec3 colour=mix(deep,sky,fresnel*.86);
    float specular=pow(max(dot(reflectedRay,uMoon),0.),240.);
    float broadReflection=pow(max(dot(reflectedRay,uMoon),0.),18.);
    colour+=vec3(.63,.77,1.)*(specular*1.75+broadReflection*.032);
    // Silver-green light transmitted through the thinner upper wave wall.
    float rim=pow(max(dot(-n,uMoon),0.),2.)*vCrest*(.35+.65*fresnel);
    colour+=vec3(.009,.036,.041)*rim;
    // Resolve only foam detail large enough for its projected footprint.
    // A narrow breaking lip keeps the vast dark face of each swell visible.
    float laceVisibility=1.-smoothstep(.45,1.7,footprint*.18);
    float lace=mix(.5,noise(p*.18+vec2(uTime*.021,-uTime*.013)),laceVisibility);
    float torn=noise(p*.037+vec2(2.7,-uTime*.012));
    float foam=pow(clamp(vBreaking,0.,1.),2.7)*smoothstep(.26,.72,lace*.44+torn*.56);
    vec3 foamColour=vec3(.14,.23,.31)*(.4+.6*moonFacing);
    colour=mix(colour,foamColour,foam*.86);
    // Distance veils the horizon and the farthest wave faces, without a
    // sheet of opaque cloud covering the flooded world.
    float distanceToEye=length(cameraPosition-vWorld);
    float haze=1.-exp(-pow(distanceToEye*.00045,1.72));
    colour=mix(colour,uHorizon,haze*.93);
    gl_FragColor=vec4(colour,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
 const geometry=new T.PlaneGeometry(6000,6000,segments,segments);geometry.rotateX(-Math.PI/2);
 const sea=new T.Mesh(geometry,material);sea.name='World ocean — two displaced tidal wave trains';sea.frustumCulled=false;root.add(sea);
 let time=0,disposed=false,animated=false;
 onChange();
 return{
  root,
  update(dt,eye,motion){
   if(disposed)return false;
   animated=!!motion;
   if(!animated)return false;
   const delta=Math.max(0,Math.min(Number(dt)||0,.1));
   if(!delta)return false;
   time+=delta;uniforms.uTime.value=time;return true;
  },
  diagnostics:()=>({kind:'drowned-world-ocean',time:+time.toFixed(4),animated,displacedGeometry:true,swells:2,
   baseHeight:BASE,crestUpperBound:+crestUpperBound.toFixed(4),centralCalmRadius:CALM,
   span:6000,triangles:geometry.index.count/3,externalTextures:0,disposed}),
  dispose(){if(disposed)return;disposed=true;animated=false;geometry.dispose();material.dispose();root.removeFromParent();root.clear();}
 };
}
