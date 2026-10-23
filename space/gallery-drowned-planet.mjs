import * as T from './vendor/three-0.180.0.mjs';

export const WORLD_RADIUS=6500;
export const WORLD_CENTER_Y=-6596;

// Coarse geographical outlines are data, not an image or another land mesh.
// The same continuous field colours the nearby sea and the entire globe: the
// continental shelves remain beneath one uninterrupted, reflective waterline.
const continents={
 Africa:[[-17,37],[9,37],[25,32],[33,30],[43,12],[51,11],[43,-12],[34,-25],[28,-34],[18,-35],[11,-18],[6,3],[-7,5],[-16,14],[-17,26]],
 Eurasia:[[-10,36],[-9,43],[-1,44],[-5,49],[8,54],[7,58],[21,71],[31,70],[39,61],[58,71],[90,77],[135,70],[161,61],[180,65],[179,53],[155,49],[143,43],[132,34],[123,25],[111,20],[107,6],[100,0],[98,14],[89,22],[81,9],[74,8],[67,24],[57,25],[50,13],[43,13],[36,29],[27,35],[25,41],[16,40],[13,45],[7,44],[4,42],[-1,43],[-1,36]],
 NorthAmerica:[[-168,70],[-150,71],[-135,69],[-126,73],[-114,72],[-101,78],[-82,82],[-61,61],[-58,52],[-69,45],[-78,35],[-81,25],[-88,22],[-86,16],[-78,9],[-83,8],[-93,16],[-106,23],[-115,31],[-125,48],[-137,58],[-151,60],[-162,55],[-168,60]],
 SouthAmerica:[[-81,12],[-72,11],[-62,9],[-51,4],[-35,-6],[-39,-20],[-47,-28],[-54,-35],[-68,-55],[-74,-51],[-75,-34],[-70,-18],[-81,-5]],
 Greenland:[[-73,60],[-44,59],[-20,72],[-25,82],[-47,84],[-63,79]],
 Australia:[[113,-22],[113,-34],[129,-35],[140,-39],[149,-37],[153,-28],[146,-19],[142,-11],[134,-12],[130,-16],[122,-17]]
};
const scalar=n=>Number.isInteger(n)?`${n}.`:String(n);
const point=p=>`vec2(${p.map(scalar).join(',')})`;
const outlines=Object.entries(continents).map(([name,points])=>{
 const edges=points.map((a,i)=>`dwEdge(p,${point(a)},${point(points[(i+1)%points.length])},distanceSquared,signValue);`).join('');
 return `float dw${name}(vec2 p){float distanceSquared=1000000.,signValue=1.;${edges}return signValue*sqrt(distanceSquared);}`;
}).join('\n');

// No textures or uniforms: the near ocean imports precisely this shader field.
// Values are linear RGB, before tone mapping. Radiance includes moonlight and
// a restrained grazing-angle water sheen; tint by itself is the seabed colour.
export const drownedWorldGLSL=`
 float dwHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float dwNoise(vec3 p){
  vec3 cell=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(dwHash(cell),dwHash(cell+vec3(1,0,0)),f.x),mix(dwHash(cell+vec3(0,1,0)),dwHash(cell+vec3(1,1,0)),f.x),f.y),mix(mix(dwHash(cell+vec3(0,0,1)),dwHash(cell+vec3(1,0,1)),f.x),mix(dwHash(cell+vec3(0,1,1)),dwHash(cell+vec3(1,1,1)),f.x),f.y),f.z);
 }
 void dwEdge(vec2 p,vec2 a,vec2 b,inout float distanceSquared,inout float signValue){
  vec2 e=b-a,w=p-a;vec2 nearest=w-e*clamp(dot(w,e)/dot(e,e),0.,1.);
  distanceSquared=min(distanceSquared,dot(nearest,nearest));
  bvec3 crossing=bvec3(p.y>=a.y,p.y<b.y,e.x*w.y>e.y*w.x);
  if(all(crossing)||all(not(crossing)))signValue=-signValue;
 }
 ${outlines}
 float dwIsland(vec2 p,vec2 center,vec2 radii,float turn){
  vec2 q=p-center;float c=cos(turn),s=sin(turn);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
  return (length(q/radii)-1.)*min(radii.x,radii.y);
 }
 vec2 dwGeography(vec3 direction){
  // The sanctuary lies above the Atlantic, with Europe and Africa facing a
  // rising visitor. This orthonormal basis has no longitude seam in the sea.
  vec3 d=normalize(direction);
  vec3 geographical=d.x*vec3(.3907311285,0.,.9205048535)+d.y*vec3(.847329185,.3907311285,-.3596699)-d.z*vec3(-.3596699,.9205048535,.1526708148);
  return vec2(atan(geographical.z,geographical.x),asin(clamp(geographical.y,-1.,1.)))*57.2957795131;
 }
 float dwContinentalDistance(vec2 p,vec3 direction){
  float distanceValue=min(min(dwAfrica(p),dwEurasia(p)),min(dwNorthAmerica(p),dwSouthAmerica(p)));
  distanceValue=min(distanceValue,min(dwGreenland(p),dwAustralia(p)));
  distanceValue=min(distanceValue,dwIsland(p,vec2(-3.,55.),vec2(2.1,5.3),-.16));
  distanceValue=min(distanceValue,dwIsland(p,vec2(-19.,65.),vec2(4.,1.8),-.1));
  distanceValue=min(distanceValue,dwIsland(p,vec2(47.,-20.),vec2(2.3,5.9),-.22));
  distanceValue=min(distanceValue,dwIsland(p,vec2(138.,37.),vec2(2.,5.6),-.45));
  distanceValue=min(distanceValue,dwIsland(p,vec2(145.,44.),vec2(1.9,2.7),-.44));
  distanceValue=min(distanceValue,dwIsland(p,vec2(172.,-42.),vec2(1.9,5.5),-.48));
  distanceValue=min(distanceValue,dwIsland(p,vec2(116.,0.),vec2(4.,6.),-.6));
  distanceValue=min(distanceValue,dwIsland(p,vec2(138.,-5.),vec2(7.6,2.2),.12));
  distanceValue=min(distanceValue,p.y+74.+(dwNoise(direction*9.+7.)-.5)*5.);
  // Spherical noise breaks the low-resolution survey into drowned estuaries
  // and irregular shelves without a UV grid, repeated stripes, or polar pinch.
  return distanceValue+(dwNoise(direction*31.+13.)-.5)*1.35+(dwNoise(direction*79.+3.)-.5)*.32;
 }
 float oceanWorldLand(vec3 direction){
  vec3 d=normalize(direction);return 1.-smoothstep(-.65,.65,dwContinentalDistance(dwGeography(d),d));
 }
 vec3 oceanWorldTint(vec3 direction){
  vec3 d=normalize(direction);vec2 p=dwGeography(d);
  float distanceValue=dwContinentalDistance(p,d);
  float land=1.-smoothstep(-.65,.65,distanceValue);
  float shelf=1.-smoothstep(-.4,4.8,distanceValue);
  float basins=dwNoise(d*5.4+17.2)*.64+dwNoise(d*16.2+4.7)*.36;
  float survey=dwNoise(d*39.1+9.3);
  vec3 abyss=mix(vec3(.0045,.018,.042),vec3(.009,.035,.063),basins);
  vec3 submerged=mix(vec3(.012,.059,.076),vec3(.025,.097,.116),survey*.65+basins*.35);
  vec3 water=mix(abyss,vec3(.017,.071,.093),shelf*.66);
  water=mix(water,submerged,land*.86);
  // Soft weather wisps stay translucent: even the brightest parts describe
  // water and submerged relief, never a white or green exposed continent.
  vec3 warped=d*13.+vec3(dwNoise(d*6.+31.),dwNoise(d*6.+7.),dwNoise(d*6.+19.))*1.7;
  float weather=smoothstep(.68,.88,dwNoise(warped))*smoothstep(.34,.62,dwNoise(d*27.+5.));
  return water+vec3(.018,.024,.028)*weather;
 }
 vec3 oceanWorldRadiance(vec3 direction,vec3 viewDirection,vec3 moonDirection){
  vec3 d=normalize(direction),view=normalize(viewDirection),moon=normalize(moonDirection);
  float nl=max(dot(d,moon),0.),nv=max(dot(d,view),0.);
  vec3 water=oceanWorldTint(d)*(.62+1.06*sqrt(nl));
  float sheen=pow(1.-nv,4.5);
  water+=vec3(.006,.018,.033)*sheen;
  vec3 halfway=normalize(view+moon);
  float glint=pow(max(dot(d,halfway),0.),110.)*sqrt(nl);
  water+=vec3(.070,.102,.133)*glint;
  return water;
 }
`;

export function createDrownedPlanet(scene,{
 radius=WORLD_RADIUS,centerY=WORLD_CENTER_Y,mobile=false,onChange=()=>{},
 moonDirection=new T.Vector3(.38,.43,-.82)
}={}){
 const root=new T.Group();root.name='Earth beneath the great flood';root.position.y=centerY;scene.add(root);
 // The local sea can fall far below its mean level. Keep the complete body
 // beneath its deepest trough; only the ocean cap supplies the upper surface.
 const surfaceRadius=radius-180,atmosphereRadius=radius+90;
 const segments=mobile?96:128,rings=mobile?48:64;
 const center=new T.Vector3(0,centerY,0),moon=moonDirection.clone().normalize();
 const sphereGeometry=new T.SphereGeometry(surfaceRadius,segments,rings);
 const uniforms={uPlanetMoon:{value:moon},uPlanetCenter:{value:center}};
 const sphereMaterial=new T.ShaderMaterial({uniforms,fog:false,toneMapped:true,
  vertexShader:`varying vec3 vPlanetDirection,vPlanetWorld;
   void main(){vPlanetDirection=normalize(position);vPlanetWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vPlanetWorld,1.);}`,
  fragmentShader:`uniform vec3 uPlanetMoon,uPlanetCenter;varying vec3 vPlanetDirection,vPlanetWorld;${drownedWorldGLSL}
   void main(){vec3 view=normalize(cameraPosition-vPlanetWorld);gl_FragColor=vec4(oceanWorldRadiance(normalize(vPlanetDirection),view,uPlanetMoon),1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
 const sphere=new T.Mesh(sphereGeometry,sphereMaterial);sphere.name='A complete Earth — every continent under water';sphere.visible=false;sphere.renderOrder=1;root.add(sphere);
 const atmosphereGeometry=new T.SphereGeometry(atmosphereRadius,segments,rings);
 const atmosphereUniforms={uPlanetCenter:{value:center},uPlanetMoon:{value:moon},uSeaRadius:{value:radius},uAirRadius:{value:atmosphereRadius},uAtmosphereVisibility:{value:0}};
 const atmosphereMaterial=new T.ShaderMaterial({uniforms:atmosphereUniforms,transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,fog:false,toneMapped:true,
  vertexShader:'varying vec3 vAirWorld;void main(){vAirWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vAirWorld,1.);}',
  fragmentShader:`uniform vec3 uPlanetCenter,uPlanetMoon;uniform float uSeaRadius,uAirRadius,uAtmosphereVisibility;varying vec3 vAirWorld;
   float airDensity(vec3 p){return exp(-max(length(p)-uSeaRadius,0.)/27.);}
   void main(){
    vec3 origin=cameraPosition-uPlanetCenter,ray=normalize(vAirWorld-cameraPosition);
    float b=dot(origin,ray),r2=dot(origin,origin),outerRoot=sqrt(max(b*b-r2+uAirRadius*uAirRadius,0.));
    float start=max(0.,-b-outerRoot),finish=-b+outerRoot;
    float solidDiscriminant=b*b-r2+uSeaRadius*uSeaRadius;
    if(solidDiscriminant>0.)finish=min(finish,-b-sqrt(solidDiscriminant));
    float path=max(finish-start,0.);vec3 stepVector=ray*(path*.2),samplePoint=origin+ray*(start+path*.1);
    float density=airDensity(samplePoint);samplePoint+=stepVector;density+=airDensity(samplePoint);samplePoint+=stepVector;density+=airDensity(samplePoint);samplePoint+=stepVector;density+=airDensity(samplePoint);samplePoint+=stepVector;density+=airDensity(samplePoint);
    float optical=1.-exp(-density*.2*path*.00082);
    vec3 normal=normalize(vAirWorld-uPlanetCenter);float lit=.48+.52*max(dot(normal,uPlanetMoon),0.);
    vec3 colour=mix(vec3(.055,.175,.34),vec3(.10,.25,.43),lit);
    gl_FragColor=vec4(colour,optical*uAtmosphereVisibility);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
 const atmosphere=new T.Mesh(atmosphereGeometry,atmosphereMaterial);atmosphere.name='The thin blue air above a drowned Earth';atmosphere.renderOrder=5;atmosphere.visible=false;root.add(atmosphere);
 let disposed=false,time=0,animated=false,altitude=0,visibility=0;
 const smooth=(a,b,n)=>{const t=T.MathUtils.clamp((n-a)/(b-a),0,1);return t*t*(3-2*t);};
 onChange();
 return{
  root,
  update(dt,eye,motion){
   if(disposed)return false;
   animated=!!motion;
   // The planet and air have no animation of their own; freezing motion also
   // preserves every ocean/continent relationship during an accessible jump.
   if(animated)time+=Math.max(0,Math.min(Number(dt)||0,.1));
   const nextAltitude=eye?Math.max(0,eye.distanceTo(center)-radius):0;
   const nextVisibility=smooth(500,4000,nextAltitude),changed=Math.abs(nextVisibility-visibility)>.00001;
   const bodyVisible=nextAltitude>400,bodyChanged=sphere.visible!==bodyVisible;sphere.visible=bodyVisible;
   altitude=nextAltitude;visibility=nextVisibility;
   atmosphereUniforms.uAtmosphereVisibility.value=visibility;atmosphere.visible=visibility>.0001;
   return changed||bodyChanged;
  },
  diagnostics:()=>({kind:'drowned-earth',fullSphere:true,submergedContinents:true,continents:Object.keys(continents).length,
   radius,centerY,surfaceRadius,atmosphereRadius,triangles:sphereGeometry.index.count/3,atmosphereTriangles:atmosphereGeometry.index.count/3,
   seaLevelRelief:0,sharedOceanTint:true,visible:sphere.visible,thinAtmosphere:true,atmosphereVisibility:+visibility.toFixed(4),highAltitude:+altitude.toFixed(3),
   time:+time.toFixed(3),animated,externalTextures:0,disposed}),
  dispose(){if(disposed)return;disposed=true;animated=false;sphereGeometry.dispose();sphereMaterial.dispose();atmosphereGeometry.dispose();atmosphereMaterial.dispose();root.removeFromParent();root.clear();}
 };
}
