import * as T from './vendor/three-0.180.0.mjs';

// A continuous spherical warp preserves the Milky Way's photographed dust
// lanes, without stretching an image around the longitude seam or its poles.
export const ORIGIN_SKY_FRAGMENT=`
   uniform float uPassage;
   vec3 originRefraction(vec3 galactic,float time){
    vec3 flowAxis=normalize(vec3(-.23,.82,.38));
    float layer=sin(dot(galactic,vec3(6.7,-3.3,2.1))-time*.17);
    float tide=sin(dot(galactic,vec3(-3.6,4.4,1.6))+time*.27);
    float bulge=(.58+.42*cos(galactic.x*4.9-time*.19))*(1.-.37*abs(galactic.y));
    vec3 swirl=cross(flowAxis,galactic)*layer;
    vec3 surge=cross(vec3(.66,-.16,.72),galactic)*tide;
    return normalize(galactic+(swirl*.051+surge*.021)*bulge*(1.+uPassage*.94));
   }
   vec3 originLight(vec3 ink,vec3 direction,vec3 galactic,float time){
    float longitude=dot(direction,vec3(.94,.05,.33));
    float altitude=dot(direction,vec3(-.12,.98,.12));
    float front=smoothstep(-.21,.57,-direction.z);
    float curl=longitude*4.8+time*.27;
    float crest=.26+sin(curl)*.16+sin(longitude*9.1-time*.21)*.062;
    float ripple=sin(longitude*23.4+sin(curl)*1.7-time*.51);
    float folded=altitude-crest-.024*ripple;
    float veil=exp(-pow(abs(folded)/.094,2.));
    float edge=exp(-pow(abs(folded-.030)/.018,2.));
    float wake=exp(-pow(abs(folded+.101+sin(curl*1.7)*.024)/.037,2.));
    float breaks=smoothstep(.18,.90,.49+.25*sin(longitude*14.7-time*.37)+.19*ripple);
    float lengthwise=front*(1.-smoothstep(.60,.95,abs(longitude)));
    vec3 blue=vec3(.038,.068,.42), violet=vec3(.35,.032,.67), turquoise=vec3(.014,.47,.52);
    vec3 drape=mix(violet,blue,smoothstep(-.62,.41,longitude))*veil*(.045+.043*breaks);
    drape+=mix(blue,turquoise,smoothstep(-.48,.55,longitude))*edge*breaks*.118;
    drape+=violet*wake*breaks*.021;
    float reflected=galactic.y+.24+sin(galactic.x*7.+time*.22)*.095;
    float filaments=exp(-pow(abs(reflected)/.061,2.))*smoothstep(.04,.82,.48+.38*sin(galactic.z*13.+time*.33));
    vec3 ember=mix(blue,vec3(.48,.20,.021),smoothstep(.05,.82,galactic.x));
    float breathing=.87+.13*sin(time*.57+altitude*3.7);
    return ink*breathing+drape*lengthwise*(1.+uPassage*.45)+ember*filaments*.039;
   }`;

export const ORIGIN_STAR_MOTION=`
    float uniformFlow=sin(position.z*.009+position.x*.006+uTime*.81)*.52;
    float pulse=.5+.5*sin(uniformFlow*3.1+aPhase);
    vIntensity*=mix(.76,1.25,pulse);
    vColour=mix(vColour,vec3(.34,.51,1.),pulse*.19*(1.-aAnchor*.8));
    point+=(1.-aAnchor*.72)*(4.8+7.5*uPassage)*
     vec3(sin(aPhase+uTime*.24),cos(aPhase*2.2+uTime*.18),sin(aPhase+uTime*.21));`;

export function createOriginStardust(scene,{mobile,time,passage}){
 const count=mobile?1050:2400;
 const positions=new Float32Array(count*3),seeds=new Float32Array(count*2);
 const depths=[115,300,670];
 let seed=0x4f524947;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<count;i++){
  const horizon=random()*2-1;
  const y=i%3===2?(random()+random()+random()-1.5)*.55:horizon;
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
    float ripple=sin(angle+uTime*(.20+.30*aSeed.y));
    float curl=cos(angle*1.8-uTime*.41);
    float gust=(3.5+2.8*aSeed.y)*(1.+uPassage*1.7);
    vec3 drift=vec3(ripple,curl*.67,sin(angle*2.7-uTime*.37))*gust;
    vec3 violet=mix(vec3(.32,.51,1.),vec3(.52,.15,1.),smoothstep(.18,.60,aSeed.x));
    vec3 cyan=mix(vec3(.07,.88,1.),vec3(1.,.52,.18),smoothstep(.86,1.,aSeed.x));
    vTint=mix(violet,cyan,smoothstep(.59,.72,aSeed.x));
    float breath=pow(.5+.5*sin(angle*4.2+uTime*(.8+.43*aSeed.y)),3.);
    vec4 viewPosition=modelViewMatrix*vec4(position+drift,1.);
    vIntensity=(.042+.29*breath)*smoothstep(30.,90.,-viewPosition.z);
    gl_PointSize=uPixelRatio*(1.15+1.9*aSeed.y)*(1.+.17*breath);
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
 dust.name='Origins · travelling stardust at three depths';
 dust.frustumCulled=false;dust.renderOrder=-1090;dust.visible=false;
 dust.onBeforeRender=renderer=>{pixelRatio.value=Math.min(renderer.getPixelRatio(),1.5);};
 scene.add(dust);
 return{
  anchor(eye){if(dust.visible)return;dust.position.copy(eye);dust.visible=true;},
  dispose(){dust.removeFromParent();geometry.dispose();material.dispose();}
 };
}
