import * as T from './vendor/three-0.180.0.mjs';

export const ORIGIN_DEFORMATION_RATE=.18;

// A continuous spherical warp preserves the Milky Way's photographed dust
// lanes, without stretching an image around the longitude seam or its poles.
export const ORIGIN_SKY_FRAGMENT=`
   uniform float uPassage,uWarpPassage;
   vec3 originRefraction(vec3 galactic,float time){
    float drift=time*${ORIGIN_DEFORMATION_RATE};
    vec3 flowAxis=normalize(vec3(-.23,.82,.38));
    float layer=sin(dot(galactic,vec3(6.7,-3.3,2.1))-drift*.18);
    float tide=sin(dot(galactic,vec3(-3.6,4.4,1.6))+drift*.24);
    float roll=sin(dot(galactic,vec3(2.,6.2,-1.9))-drift*.12);
    float bulge=(.55+.45*cos(galactic.x*4.9-drift*.16))*(1.-.39*abs(galactic.y));
    vec3 swirl=cross(flowAxis,galactic)*layer;
    vec3 surge=cross(vec3(.66,-.16,.72),galactic)*tide;
    vec3 fold=cross(vec3(.38,.22,-.88),galactic)*roll;
    return normalize(galactic+(swirl*.063+surge*.028+fold*.021)*bulge*(1.+uWarpPassage*1.10));
   }
   float gaussianVeil(float offset,float scale){
    float width=offset/scale;
    return exp(-width*width);
   }
   vec3 prismaticVeil(float along,float altitude,float gate,float phase,float breadth){
    float wave=along*4.15+phase*.24;
    float fold=sin(along*19.2+sin(wave)*1.8-phase*.51);
    float pleat=sin(along*43.1+sin(wave*1.62)*2.7+phase*.38);
    float crest=.21+sin(wave)*.205+sin(along*9.1-phase*.33)*.072;
    float fall=altitude-crest-.031*fold;
    float transmission=smoothstep(.15,.86,.49+.27*sin(along*13.7-phase*.37)+.16*fold+.09*pleat);
    float granularity=.66+.34*pleat;
    vec3 cobalt=vec3(.032,.074,.51),violet=vec3(.35,.027,.59),turquoise=vec3(.011,.55,.56);
    float hue=smoothstep(.21,.82,.52+.23*sin(wave*1.5)+.16*fold);
    vec3 cloth=mix(cobalt,violet,hue);
    float rose=smoothstep(.39,.89,.52+.29*sin(wave*.82-.65)+.16*pleat);
    cloth=mix(cloth,vec3(.47,.043,.31),rose*.68);
    vec3 lip=mix(turquoise,vec3(.17,.16,.66),hue);
    lip=mix(lip,vec3(.58,.11,.35),rose*.63);
    float shell=gaussianVeil(fall+.023,.087*breadth)*(.040+.050*transmission);
    float rim=gaussianVeil(fall-.024,.014*breadth)*(.043+.24*transmission);
    float seam=gaussianVeil(fall-.042-.009*pleat,.007*breadth)*transmission*granularity*.11;
    float trailing=gaussianVeil(fall+.108+.033*sin(wave*1.65),.043*breadth)*transmission*.044;
    vec3 glow=cloth*(shell+trailing)+lip*(rim+seam);
    return glow*gate*(1.-smoothstep(.70,1.0,abs(along)));
   }
   vec3 originLight(vec3 ink,vec3 direction,vec3 galactic,float time){
    float longitude=dot(direction,vec3(.94,.05,.33));
    float altitude=dot(direction,vec3(-.12,.98,.12));
    float front=smoothstep(-.23,.65,-direction.z);
    float drift=time*${ORIGIN_DEFORMATION_RATE};
    vec3 nearLight=prismaticVeil(longitude,altitude,front,drift,1.);
    float side=dot(direction,vec3(-.20,.14,.97));
    float high=dot(direction,vec3(.19,.91,-.34));
    float farGate=smoothstep(-.08,.62,direction.x)+.36*smoothstep(.18,.85,direction.z);
    vec3 farLight=prismaticVeil(side,high-.22,farGate,drift*-.72+12.,.65)*.64;
    float reflected=galactic.y+.24+sin(galactic.x*7.+drift*.22)*.095;
    float filaments=gaussianVeil(reflected,.041)*smoothstep(.04,.82,.48+.38*sin(galactic.z*13.+time*.33));
    vec3 ember=mix(vec3(.023,.18,.35),vec3(.65,.32,.027),smoothstep(.05,.82,galactic.x));
    ember=mix(ember,vec3(.47,.057,.29),.57*smoothstep(.15,.74,-galactic.z));
    float breathing=.94+.06*sin(time*.47+altitude*3.7);
    return ink*breathing+(nearLight+farLight)*(1.+uPassage*.41)+ember*filaments*.047;
   }`;

export const ORIGIN_STAR_MOTION=`
    float uniformFlow=sin(position.z*.009+position.x*.006+uTime*.81)*.52;
    float pulse=.5+.5*sin(uniformFlow*3.1+aPhase);
    vIntensity*=mix(.76,1.25,pulse);
    vColour=mix(vColour,vec3(.34,.51,1.),pulse*.19*(1.-aAnchor*.8));
    float drift=uTime*${ORIGIN_DEFORMATION_RATE};
    point+=(1.-aAnchor*.72)*(4.8+7.5*uWarpPassage)*
     vec3(sin(aPhase+drift*.24),cos(aPhase*2.2+drift*.18),sin(aPhase+drift*.21));`;

export function createOriginStardust(scene,{mobile,time,passage}){
 const count=mobile?1380:3560;
 const positions=new Float32Array(count*3),seeds=new Float32Array(count*2);
 const depths=[58,165,355,690];
 let seed=0x4f524947;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<count;i++){
  const horizon=random()*2-1;
  const y=i%4===3?horizon:(random()+random()+random()-1.5)*.52+.18;
  const azimuth=random()*Math.PI*2,depth=depths[i%depths.length]*(.87+.26*random());
  const equator=depth*Math.sqrt(1-y*y);
  positions.set([Math.cos(azimuth)*equator,y*depth,Math.sin(azimuth)*equator],i*3);
  seeds.set([random(),random()],i*2);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.BufferAttribute(positions,3));
 geometry.setAttribute('aSeed',new T.BufferAttribute(seeds,2));
 const pixelRatio={value:1};
 const material=new T.ShaderMaterial({
  uniforms:{uTime:time,uPassage:passage,uPixelRatio:pixelRatio},
  transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
  vertexShader:`
   attribute vec2 aSeed;
   uniform float uTime,uPassage,uPixelRatio;
   varying vec3 vTint;
   varying float vIntensity;
   void main(){
    float angle=aSeed.x*6.2831853;
    float depth=length(position);
    float time=uTime*(.30+.27*aSeed.y);
    float sway=.016*sin(time*.44+depth*.024)+.025*sin(angle+time*.51);
    float orbit=sway*(1.+uPassage*1.38);
    float cosine=cos(orbit),sine=sin(orbit);
    vec2 drift=mat2(cosine,sine,-sine,cosine)*position.xz;
    float rise=(1.2+6.5*smoothstep(55.,660.,depth))*sin(time+angle*1.7+position.z*.022);
    vec3 point=vec3(drift.x,position.y+rise*(1.+uPassage),drift.y);
    vec3 violet=mix(vec3(.32,.51,1.),vec3(.52,.15,1.),smoothstep(.18,.60,aSeed.x));
    vec3 cyan=mix(vec3(.07,.88,1.),vec3(1.,.52,.18),smoothstep(.86,1.,aSeed.x));
    vTint=mix(violet,cyan,smoothstep(.59,.72,aSeed.x));
    float breath=pow(.5+.5*sin(angle*4.2+uTime*(.8+.43*aSeed.y)),3.);
    vec4 viewPosition=modelViewMatrix*vec4(point,1.);
    float nearby=1.-smoothstep(65.,170.,depth);
    vIntensity=(.048+.37*breath)*smoothstep(21.,53.,-viewPosition.z)*(1.-nearby*.32);
    gl_PointSize=uPixelRatio*(1.25+1.94*aSeed.y+nearby*.4)*(1.+.16*breath);
    gl_Position=projectionMatrix*viewPosition;
   }`,
  fragmentShader:`
   varying vec3 vTint;
   varying float vIntensity;
   void main(){
    vec2 centered=gl_PointCoord-.5;
    float radiusSquared=dot(centered,centered);
    float opacity=(exp(-radiusSquared*38.)+.16*exp(-radiusSquared*12.))*
     (1.-smoothstep(.09,.25,radiusSquared))*vIntensity;
    gl_FragColor=vec4(vTint,opacity);
    #include <colorspace_fragment>
   }`
 });
 const dust=new T.Points(geometry,material);
 dust.name='Origins · travelling stardust at four depths';
 dust.frustumCulled=false;dust.renderOrder=-1090;dust.visible=false;
 dust.onBeforeRender=renderer=>{pixelRatio.value=Math.min(renderer.getPixelRatio(),1.5);};
 scene.add(dust);
 return{
  depths:depths.length,
  anchor(eye){if(dust.visible)return;dust.position.copy(eye);dust.visible=true;},
  dispose(){dust.removeFromParent();geometry.dispose();material.dispose();}
 };
}

export function createOriginDeepStars(parent,{mobile,time,core,east,normal}){
 const count=mobile?144000:384000;
 const positions=new Float32Array(count*3),appearance=new Uint8Array(count*4);
 const radius=1238,rotation=Math.PI*(3-Math.sqrt(5));
 const spread=2.25/Math.sqrt(count*.50);
 let seed=0x44454550;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const deepCentres=[
  [-.35,.50,-.79],[.52,.22,-.83],[-.69,-.23,-.69],[.31,-.79,-.53],
  [.82,.55,.15],[.76,-.48,.43],[-.47,.81,.36],[.05,.92,-.38],
  [-.87,.14,.48],[-.41,-.83,.39],[.21,.41,.88],[.18,-.41,.89],
  [-.69,.68,-.23],[.81,.02,-.58],[-.62,-.59,.50],[.06,-.08,1]
 ].map(vector=>{
  const centre=new T.Vector3(...vector).normalize();
  const tangent=new T.Vector3().crossVectors(normal,centre).normalize();
  const elevation=new T.Vector3().crossVectors(centre,tangent).normalize();
  const scale=.095+.15*random(),angle=random()*Math.PI;
  return{centre,tangent,elevation,scale,sine:Math.sin(angle),cosine:Math.cos(angle)};
 });
 // Linear-light stellar colours plus the coloured light of nearby dust.
 const palette=[
  [.84,.92,1.], [.30,.54,1.], [.13,.80,.94], [.43,.92,.78], [.52,.24,1.],
  [1.,.31,.61], [1.,.39,.27], [1.,.76,.43]
 ];
 const clusterHues=[4,2,7,1,5,3,1,4,2,6,4,7,5,3,1,6];
 const v=new T.Vector3(),backgroundCount=Math.floor(count*.49),beltEnd=Math.floor(count*.77);
 for(let i=0;i<count;i++){
  let regionHue=0,regionTint=.14;
  if(i<backgroundCount){
   // Equal-area coverage with jitter on both axes. Even the empty sides of
   // the galactic plane are peppered with the most distant stars.
   const dy=1-2*(i+random())/backgroundCount,r=Math.sqrt(Math.max(0,1-dy*dy));
   const phi=i*rotation+(random()-.5)*spread/Math.max(r,.05);
   v.set(Math.cos(phi)*r,dy,Math.sin(phi)*r);
  }else if(i<beltEnd){
   const phase=random()*Math.PI*2,fold=.037*Math.sin(phase*3.)-.021*Math.cos(phase*5.1);
   const latitude=fold+(random()+random()+random()-1.5)*(.145+.11*Math.sin(phase+.6)**2);
   const sector=Math.sin(phase*1.7+.6)+.35*Math.cos(phase*5.1);
   regionHue=sector>.72?2:sector<-.64?7:latitude>fold?4:1;
   regionTint=.46;
   v.copy(core).multiplyScalar(Math.cos(phase)*Math.cos(latitude)).addScaledVector(east,Math.sin(phase)*Math.cos(latitude)).addScaledVector(normal,Math.sin(latitude));
  }else{
   const field=i%deepCentres.length;
   const {centre,tangent,elevation,scale,sine,cosine}=deepCentres[field];
   regionHue=clusterHues[field];regionTint=.66;
   const phase=random()*Math.PI*2,gap=Math.sqrt(-Math.log(Math.max(.001,random())))*scale;
   const x=Math.cos(phase)*gap,y=Math.sin(phase)*gap*.61;
   v.copy(centre).addScaledVector(tangent,x*cosine-y*sine).addScaledVector(elevation,x*sine+y*cosine).normalize();
  }
  const pos=i*3;
  positions[pos]=v.x*radius;positions[pos+1]=v.y*radius;positions[pos+2]=v.z*radius;
  const magnitude=random(),fine=Math.pow(magnitude,4);
  const strength=i<backgroundCount?.30:i<beltEnd?.51:.64;
  const temperature=random();
  const stellar=palette[temperature<.42?0:temperature<.69?1:temperature<.86?7:temperature<.94?6:temperature<.975?4:5];
  const region=palette[regionHue];
  const tint=regionTint*(.75+.25*random())*(1.-fine*.34);
  const colour=i*4;
  for(let channel=0;channel<3;channel++)appearance[colour+channel]=Math.round(255*(stellar[channel]+(region[channel]-stellar[channel])*tint));
  appearance[colour+3]=Math.round(255*(.039+fine*.245+strength*.10));
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.BufferAttribute(positions,3));
 geometry.setAttribute('aStar',new T.BufferAttribute(appearance,4,true));
 const pixelRatio={value:1};
 const material=new T.ShaderMaterial({
  uniforms:{uTime:time,uPixelRatio:pixelRatio},
  transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,fog:false,
  vertexShader:`
   attribute vec4 aStar;
   uniform float uTime,uPixelRatio;
   varying vec3 vTint;
   varying float vFlux;
   void main(){
    vTint=aStar.rgb;
    // Remote stars scintillate independently. The foreground dust layers
    // supply the moving parallax while these keep an immense fixed backdrop.
    float phase=dot(position,vec3(.927,1.191,.693));
    float glimmer=.96+.04*sin(phase+uTime*(.20+.13*aStar.b));
    vFlux=aStar.w*glimmer;
    float diameter=1.17+.92*smoothstep(.09,.36,aStar.w);
    gl_PointSize=max(1.25,diameter*uPixelRatio);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
   }`,
  fragmentShader:`
   varying vec3 vTint;
   varying float vFlux;
   void main(){
    vec2 point=gl_PointCoord-.5;
    float radius=dot(point,point);
    if(radius>.25)discard;
    float core=exp(-radius*10.4)*(1.-smoothstep(.11,.25,radius));
    gl_FragColor=vec4(vTint,core*vFlux);
    #include <colorspace_fragment>
   }`
 });
 const stars=new T.Points(geometry,material);
 stars.name='Origins · deep stellar field';
 stars.renderOrder=-1140;stars.frustumCulled=false;
 stars.onBeforeRender=renderer=>{pixelRatio.value=Math.min(renderer.getPixelRatio(),1.5);};
 parent.add(stars);
 return{
  count,clusters:deepCentres.length,
  dispose(){stars.removeFromParent();geometry.dispose();material.dispose();}
 };
}
