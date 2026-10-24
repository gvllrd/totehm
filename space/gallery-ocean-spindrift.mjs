import * as T from './vendor/three-0.180.0.mjs';
import {WORLD_CENTER_Y} from './gallery-drowned-planet.mjs';

// A few shallow volumes leave the spilling water with the wind. Their screen
// quads are only raymarch supports: density lives inside a world-space
// ellipsoid, not in a flat white sprite. Parent time and lighting are borrowed.
export function createOceanSpindrift(scene,{
 mobile=false,uniforms,surfaceGLSL,onChange=()=>{}
}={}){
 if(!scene||typeof scene.add!=='function')throw new TypeError('Spindrift requires a Three.js scene or group.');
 if(typeof surfaceGLSL!=='string'||!surfaceGLSL.includes('oceanSurface('))throw new TypeError('Spindrift requires the shared ocean surface shader.');
 for(const key of ['uOceanTime','uMoon','uHorizon']){
  if(!uniforms?.[key]||!('value' in uniforms[key]))throw new TypeError('Spindrift requires the shared '+key+' uniform.');
 }
 const root=new T.Group();root.name='Low, wind-torn volumes of sea mist';
 const cloudCount=mobile?40:80,positions=new Float32Array(cloudCount*12);
 const anchors=new Float32Array(cloudCount*12),shapes=new Float32Array(cloudCount*16);
 const indices=new Uint16Array(cloudCount*6);
 let seed=0x5350494e,disposed=false;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<cloudCount;i++){
  const angle=i*2.399963229728653+(random()-.5)*.4;
  const radius=400+Math.pow(random(),1.4)*1200;
  const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,life=random();
  const along=23+random()*19,cross=7+random()*7,height=2.1+random()*1.7,character=random();
  for(let j=0;j<4;j++){
   positions.set([j===0||j===3?-1:1,j<2?-1:1,0],i*12+j*3);
   anchors.set([x,z,life],i*12+j*3);
   shapes.set([along,cross,height,character],i*16+j*4);
  }
  const v=i*4;indices.set([v,v+1,v+2,v,v+2,v+3],i*6);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.BufferAttribute(positions,3));
 geometry.setAttribute('aMistAnchor',new T.BufferAttribute(anchors,3));
 geometry.setAttribute('aMistShape',new T.BufferAttribute(shapes,4));
 geometry.setIndex(new T.BufferAttribute(indices,1));
 const material=new T.ShaderMaterial({
  name:'OCEAN_SPINDRIFT — moonlit wind volumes',
  uniforms:{uOceanTime:uniforms.uOceanTime,uMoon:uniforms.uMoon,uHorizon:uniforms.uHorizon},
  transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,toneMapped:true,
  vertexShader:`
   // OCEAN_SPINDRIFT: bounded, crest-attached world-space volume supports.
   uniform float uOceanTime;
   attribute vec3 aMistAnchor;
   attribute vec4 aMistShape;
   varying vec3 vMistWorld,vMistCenter,vMistWind,vMistAcross,vMistUp,vMistRadii;
   varying vec2 vMistLife;
   ${surfaceGLSL}
   void main(){
    float age=fract(aMistAnchor.z+uOceanTime*.073);
    OceanSurface initial=oceanSurface(aMistAnchor.xy,uOceanTime);
    float phase=atan(sin(initial.phaseA-1.0058),cos(initial.phaseA-1.0058));
    vec2 q=aMistAnchor.xy-initial.gradientA*phase/max(dot(initial.gradientA,initial.gradientA),.00001);
    OceanSurface sea=oceanSurface(q,uOceanTime);
    vec3 worldCenter=vec3(0.,${WORLD_CENTER_Y}.,0.);
    vec3 up=normalize(sea.outward);
    vec3 wind=normalize(vec3(.544,0.,.839)-up*dot(vec3(.544,0.,.839),up));
    float waterRadius=length(sea.p-worldCenter);
    float drift=age*(50.+aMistShape.w*50.);
    // Moving on a sphere preserves radial height even on the lee side.
    up=normalize(up+wind*(drift/waterRadius));
    wind=normalize(wind-up*dot(wind,up));
    vec3 across=normalize(cross(up,wind));
    float lift=3.8*sin(age*3.14159265359);
    vec3 center=worldCenter+up*(waterRadius+lift);
    float expansion=.70+.30*smoothstep(0.,.75,age);
    vec3 radii=vec3(aMistShape.xy*expansion,aMistShape.z);
    vec3 right=normalize(vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]));
    vec3 screenUp=normalize(vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]));
    // Support of the oriented ellipsoid on the camera plane, with a small
    // perspective margin. Empty support fragments are discarded below.
    vec3 rx=vec3(dot(right,wind),dot(right,across),dot(right,up))*radii;
    vec3 ry=vec3(dot(screenUp,wind),dot(screenUp,across),dot(screenUp,up))*radii;
    vec3 p=center+right*(position.x*length(rx)*1.13)+screenUp*(position.y*length(ry)*1.13);
    float distanceToEye=length(cameraPosition-center);
    float contourLife=1.-smoothstep(1.55,2.85,abs(phase));
    float burst=.48+.52*smoothstep(.15,.86,.5+.5*sin(aMistShape.w*17.+uOceanTime*.21));
    float life=sin(age*3.14159265359)*pow(1.-age,.48);
    float visible=(1.-smoothstep(1450.,2250.,distanceToEye))*(1.-smoothstep(600.,1400.,cameraPosition.y));
    vMistWorld=p;vMistCenter=center;vMistWind=wind;vMistAcross=across;vMistUp=up;vMistRadii=radii;
    vMistLife=vec2(.22*contourLife*burst*life*sea.breaking*visible,aMistShape.w*73.+aMistAnchor.z*19.);
    gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
   }`,
  fragmentShader:`
   // OCEAN_SPINDRIFT: five actual density samples through an ellipsoid.
   uniform mat4 projectionMatrix;
   uniform float uOceanTime;
   uniform vec3 uMoon,uHorizon;
   varying vec3 vMistWorld,vMistCenter,vMistWind,vMistAcross,vMistUp,vMistRadii;
   varying vec2 vMistLife;
   float mistHash(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   float mistNoise(vec3 p){
    vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(mistHash(i),mistHash(i+vec3(1,0,0)),f.x),mix(mistHash(i+vec3(0,1,0)),mistHash(i+vec3(1,1,0)),f.x),f.y),
     mix(mix(mistHash(i+vec3(0,0,1)),mistHash(i+vec3(1,0,1)),f.x),mix(mistHash(i+vec3(0,1,1)),mistHash(i+vec3(1,1,1)),f.x),f.y),f.z);
   }
   vec3 mistLocal(vec3 p){return vec3(dot(p,vMistWind),dot(p,vMistAcross),dot(p,vMistUp))/vMistRadii;}
   void main(){
    if(vMistLife.x<.001)discard;
    vec3 ray=normalize(vMistWorld-cameraPosition);
    vec3 origin=mistLocal(cameraPosition-vMistCenter),direction=mistLocal(ray);
    float a=dot(direction,direction),b=dot(origin,direction),c=dot(origin,origin)-1.;
    float discriminant=b*b-a*c;if(discriminant<=0.)discard;
    float halfChord=sqrt(discriminant),nearT=max(0.,(-b-halfChord)/a),farT=(-b+halfChord)/a;
    if(farT<=nearT)discard;
    float stepLength=(farT-nearT)/5.,densitySum=0.,lightSum=0.,depthSum=0.;
    for(int i=0;i<5;i++){
     float t=nearT+(float(i)+.5)*stepLength;
     vec3 p=origin+direction*t;
     float edge=max(1.-dot(p,p),0.);
     vec3 flow=p*vec3(3.1,3.8,2.7)+vec3(vMistLife.y,-vMistLife.y*.31,uOceanTime*.055);
     flow.x+=sin(p.y*4.7+vMistLife.y+uOceanTime*.17)*.34;
     float billow=mistNoise(flow);
     float density=edge*edge*smoothstep(.22,.72,billow);
     float topLight=.44+.56*smoothstep(-.7,.8,p.z);
     densitySum+=density;lightSum+=density*topLight;depthSum+=density*t;
    }
    if(densitySum<.005)discard;
    float opacity=(1.-exp(-densitySum*stepLength*.09))*vMistLife.x;
    if(opacity<.0015)discard;
    vec3 view=-ray;
    float cosine=dot(view,-uMoon),g=.58;
    float phase=(1.-g*g)/pow(max(1.+g*g-2.*g*cosine,.08),1.5);
    float forwardScatter=clamp(phase*.18,0.,1.);
    float illumination=(lightSum/densitySum)*(.30+.70*forwardScatter);
    vec3 colour=mix(vec3(.16,.25,.34),vec3(.66,.79,.89),illumination);
    float haze=1.-exp(-pow(length(cameraPosition-vMistCenter)*.00020,1.55));
    colour=mix(colour,uHorizon,haze*.88);
    // Test the occupied volume, rather than the middle support rectangle,
    // against the already rendered water. The volumes never write depth.
    vec3 occupied=cameraPosition+ray*(depthSum/densitySum);
    vec4 clip=projectionMatrix*viewMatrix*vec4(occupied,1.);
    gl_FragDepth=clip.z/clip.w*.5+.5;
    gl_FragColor=vec4(colour,min(opacity,.13));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
 const mesh=new T.Mesh(geometry,material);mesh.name='OCEAN_SPINDRIFT — sparse moonlit spray volumes';
 mesh.frustumCulled=false;mesh.renderOrder=4;root.add(mesh);scene.add(root);onChange();
 return{
  root,
  diagnostics:()=>({kind:'raymarched-sea-spindrift',volumes:cloudCount,triangles:indices.length/3,
   samplesPerRay:5,shape:'wind-oriented ellipsoids',attachedToCrests:true,sphericalDrift:true,
   maximumRadialRise:8,maximumOpacity:.13,maximumHalfAxes:[42,14,3.8],maximumCenterLift:3.8,
   altitudeFade:[600,1400],distanceFade:[1450,2250],parentClock:true,borrowedUniforms:true,
   externalFiles:0,textures:0,disposed}),
  dispose(){if(disposed)return;disposed=true;geometry.dispose();material.dispose();root.removeFromParent();root.clear();}
 };
}
