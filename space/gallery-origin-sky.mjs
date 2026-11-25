import * as T from './vendor/three-0.180.0.mjs';

// A continuous spherical warp preserves the Milky Way's photographed dust
// lanes, without stretching an image around the longitude seam or its poles.
export const ORIGIN_SKY_FRAGMENT=`
   uniform float uPassage;
   vec3 originRefraction(vec3 galactic,float time){
    vec3 flowAxis=normalize(vec3(-.23,.82,.38));
    float layer=sin(dot(galactic,vec3(6.7,-3.3,2.1))-time*.18);
    float tide=sin(dot(galactic,vec3(-3.6,4.4,1.6))+time*.24);
    float roll=sin(dot(galactic,vec3(2.,6.2,-1.9))-time*.12);
    float bulge=(.55+.45*cos(galactic.x*4.9-time*.16))*(1.-.39*abs(galactic.y));
    vec3 swirl=cross(flowAxis,galactic)*layer;
    vec3 surge=cross(vec3(.66,-.16,.72),galactic)*tide;
    vec3 fold=cross(vec3(.38,.22,-.88),galactic)*roll;
    return normalize(galactic+(swirl*.063+surge*.028+fold*.021)*bulge*(1.+uPassage*1.10));
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
    vec3 lip=mix(turquoise,vec3(.17,.16,.66),hue);
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
    vec3 nearLight=prismaticVeil(longitude,altitude,front,time,1.);
    float side=dot(direction,vec3(-.20,.14,.97));
    float high=dot(direction,vec3(.19,.91,-.34));
    float farGate=smoothstep(-.08,.62,direction.x)+.36*smoothstep(.18,.85,direction.z);
    vec3 farLight=prismaticVeil(side,high-.22,farGate,time*-.72+12.,.65)*.64;
    float reflected=galactic.y+.24+sin(galactic.x*7.+time*.22)*.095;
    float filaments=gaussianVeil(reflected,.041)*smoothstep(.04,.82,.48+.38*sin(galactic.z*13.+time*.33));
    vec3 ember=mix(vec3(.033,.09,.34),vec3(.58,.26,.016),smoothstep(.05,.82,galactic.x));
    float breathing=.94+.06*sin(time*.47+altitude*3.7);
    return ink*breathing+(nearLight+farLight)*(1.+uPassage*.41)+ember*filaments*.047;
   }`;

export const ORIGIN_STAR_MOTION=`
    float uniformFlow=sin(position.z*.009+position.x*.006+uTime*.81)*.52;
    float pulse=.5+.5*sin(uniformFlow*3.1+aPhase);
    vIntensity*=mix(.76,1.25,pulse);
    vColour=mix(vColour,vec3(.34,.51,1.),pulse*.19*(1.-aAnchor*.8));
    point+=(1.-aAnchor*.72)*(4.8+7.5*uPassage)*
     vec3(sin(aPhase+uTime*.24),cos(aPhase*2.2+uTime*.18),sin(aPhase+uTime*.21));`;

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
