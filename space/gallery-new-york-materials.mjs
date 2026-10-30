import * as T from './vendor/three-0.180.0.mjs';

// Running-bond masonry is in world metres: piers, reveals and cornices all
// keep the same brick scale instead of stretching a small image over a wall.
export function createNewYorkBrick(){
 const material=new T.MeshStandardMaterial({color:0x9c4938,roughness:.93,metalness:0});
 material.name='SoHo surviving red brick — spalled clay, lime scars and deep old joints';
 material.customProgramCacheKey=()=> 'ny-red-clay-world-ruin-v2';
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   varying vec3 vNYBrickWorld;`);
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vNYBrickWorld=(modelMatrix*vec4(transformed,1.)).xyz;
   #include <project_vertex>`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vNYBrickWorld;
   float nyHash(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+19.19);return fract(p.x*p.y);}
   float nyNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(nyHash(i),nyHash(i+vec2(1.,0.)),f.x),mix(nyHash(i+vec2(0.,1.)),nyHash(i+1.),f.x),f.y);}
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 nyFace=abs(normalize(cross(dFdx(vNYBrickWorld),dFdy(vNYBrickWorld))));
   vec2 nyP=nyFace.z>=nyFace.x?vNYBrickWorld.xy:vNYBrickWorld.zy;
   if(nyFace.y>.8)nyP=vNYBrickWorld.xz;
   float nyRow=floor(nyP.y/.083);vec2 nyGrid=vec2(nyP.x/.245+mod(nyRow,2.)*.5,nyP.y/.083);
   vec2 nyCell=floor(nyGrid),nyUV=fract(nyGrid),nyEdge=min(nyUV,1.-nyUV)*vec2(.245,.083);
   float nyDistance=min(nyEdge.x,nyEdge.y),nyAA=max(fwidth(nyDistance),.0005);
   float nyBrick=smoothstep(.0035-nyAA,.0035+nyAA,nyDistance);
   float nyBevel=smoothstep(.003,.009,nyDistance);
   float nyVariation=nyHash(nyCell),nyCloud=nyNoise(nyP*8.7+nyVariation*13.);
   float nyGrain=nyNoise(nyP*220.);
   float nyWeather=nyNoise(nyP*.62+vec2(18.3,7.9))*.65+nyNoise(nyP*1.73+vec2(3.,13.))*.35;
   float nySpall=smoothstep(.52,.72,nyWeather*.62+nyNoise(nyP*10.4+nyVariation)*.38);
   float nyLime=smoothstep(.57,.72,nyWeather)*(.35+.65*nyNoise(nyP*4.3));
   float nyCrackWander=nyNoise(vec2(nyP.y*.84,4.7))*.15+nyNoise(vec2(nyP.y*5.4,17.2))*.025;
   float nyCrackDistance=abs(fract((nyP.x+nyCrackWander)/3.7)-.5)*3.7;
   float nyCrack=(1.-smoothstep(.003,.007+max(fwidth(nyCrackDistance),.0005),nyCrackDistance))*smoothstep(.42,.68,nyNoise(nyP*.47+11.));
   vec3 nyClay=mix(vec3(.28,.077,.040),vec3(.52,.205,.105),nyVariation*.6+nyCloud*.4);
   nyClay*=.85+.23*nyCloud+.12*(nyGrain-.5);
   nyClay*=.68+.32*nyBevel;
   // Lost fired faces expose the warmer, porous body of the brick. The
   // broad broken patches and thin fractures remain distinct from grain.
   nyClay=mix(nyClay,vec3(.42,.235,.137)*(.75+.3*nyCloud),nySpall*.72);
   nyClay=mix(nyClay,vec3(.46,.415,.32),nyLime*.74);
   vec3 nyMortar=vec3(.27,.246,.205)*(.85+.15*nyGrain);
   diffuseColor.rgb=mix(nyMortar,nyClay,nyBrick)*(1.-nyCrack*.55);
   float nyRelief=.0055*nyBevel-.0038*nySpall-.0025*nyCrack+.00045*(nyGrain-.5);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=clamp(.84+.10*nySpall+.04*nyLime,.82,.99);
  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   // Derivative bump mapping makes the old joints, lost faces and fractures
   // catch the real grazing lights, without an external texture or flat tint.
   vec3 nySigmaX=dFdx(-vViewPosition),nySigmaY=dFdy(-vViewPosition);
   vec3 nyR1=cross(nySigmaY,normal),nyR2=cross(normal,nySigmaX);
   float nyDet=dot(nySigmaX,nyR1);
   vec3 nyGradient=sign(nyDet)*(dFdx(nyRelief)*nyR1+dFdy(nyRelief)*nyR2);
   normal=normalize(abs(nyDet)*normal-nyGradient);
  `);
 };
 return material;
}

export function createNewYorkPavement(){
 const material=new T.MeshStandardMaterial({color:0x505458,roughness:.88,metalness:0});
 material.name='Downtown Manhattan bluestone flags and asphalt';
 material.customProgramCacheKey=()=> 'ny-bluestone-asphalt-world-v1';
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vNYGround;');
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','vNYGround=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vNYGround;
   float nyGroundHash(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+19.19);return fract(p.x*p.y);}`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 nyP=vNYGround.xz,nyCell=floor((nyP+vec2(0.,1.1))/vec2(1.5,1.1));
   vec2 nyF=fract((nyP+vec2(0.,1.1))/vec2(1.5,1.1));
   vec2 nyD=min(nyF,1.-nyF)*vec2(1.5,1.1);float nyJoint=min(nyD.x,nyD.y);
   float nyAA=max(fwidth(nyJoint),.001);
   float nyTile=smoothstep(.007-nyAA,.007+nyAA,nyJoint);
   float nyGrit=nyGroundHash(floor(nyP*270.)),nyVar=nyGroundHash(nyCell);
   vec3 nyStone=mix(vec3(.14,.17,.19),vec3(.29,.32,.33),nyVar)*(.9+.19*nyGrit);
   vec3 nyAsphalt=vec3(.047,.052,.057)*(.8+.4*nyGrit);
   float nyRoad=smoothstep(4.05,4.12,nyP.y);
   diffuseColor.rgb=mix(mix(vec3(.045),nyStone,nyTile),nyAsphalt,nyRoad);
  `);
 };
 return material;
}
