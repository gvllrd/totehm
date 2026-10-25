import * as T from './vendor/three-0.180.0.mjs';

// Large, carefully laid antique limestone slabs. All detail is evaluated in
// world metres, including on the counter faces; there is no image or panorama.
export function createWhiteStone({mobile=false,anisotropy=4,onChange=()=>{}}={}){
 let disposed=false,compiled=false;
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0});
 material.name='WHITE_ANTIQUE_LIMESTONE — large aligned honed stone slabs';
 material.customProgramCacheKey=()=> 'white-antique-limestone-ashlar-v1';
 material.onBeforeCompile=shader=>{
  shader.uniforms.uWhiteStoneFineScale={value:mobile?185:340};
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   varying vec3 vWhiteStoneWorld;`);
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
   vWhiteStoneWorld=(modelMatrix*vec4(transformed,1.)).xyz;
   #include <project_vertex>`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   // WHITE_ANTIQUE_LIMESTONE: joints, rounded edges, mineral body and patina
   // belong to the same individual block, not separate decorative overlays.
   varying vec3 vWhiteStoneWorld;
   uniform float uWhiteStoneFineScale;
   struct WhiteStone{vec3 colour;float roughness;float height;};
   float wsHash(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+19.19);return fract(p.x*p.y);}
   float wsNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(wsHash(i),wsHash(i+vec2(1,0)),f.x),mix(wsHash(i+vec2(0,1)),wsHash(i+vec2(1)),f.x),f.y);}
   WhiteStone whiteStone(vec3 world){
    // Choose the projection from the actual geometric face. The same stone
    // therefore remains metre-sized on a floor, vertical face or stone table.
    vec3 face=abs(normalize(cross(dFdx(world),dFdy(world))));
    vec2 p=face.y>=face.x&&face.y>=face.z?world.xz:(face.x>=face.z?world.zy:world.xy);
    const vec2 slab=vec2(2.75,1.55);
    vec2 grid=p/slab;
    float row=floor(grid.y);grid.x+=mod(row,2.)*.5;
    vec2 id=floor(grid),cell=fract(grid),local=cell*slab;
    float key=wsHash(id+vec2(13.9,5.1));
    float edge=min(min(local.x,slab.x-local.x),min(local.y,slab.y-local.y));
    // A few tenths of a millimetre of edge wear, not a broken random course.
    edge-=(wsNoise(cell*11.+id*.37)-.5)*.0012;
    float aa=max(fwidth(edge)*.65,.00015);
    float stone=smoothstep(.0025-aa,.0044+aa,edge);
    float footprint=max(length(dFdx(p)),length(dFdy(p)));
    float resolved=1.-smoothstep(.14,.50,footprint);
    stone=mix(.994,stone,resolved);
    float cloud=wsNoise(p*.52+id*2.13),mineral=wsNoise(p*2.7+vec2(cloud*2.9,key*7.));
    float grainFilter=1.-smoothstep(.22,.85,footprint*115.);
    float fineFilter=1.-smoothstep(.20,.75,footprint*uWhiteStoneFineScale);
    float grain=mix(.5,wsNoise(p*115.+id*.73),grainFilter);
    float fine=mix(.5,wsNoise(p*uWhiteStoneFineScale+id*2.7),fineFilter);
    float pores=wsNoise(p*26.+id*1.37);
    float patina=smoothstep(.80,.99,pores)*.012;
    // Warm antique white: the stone still receives the room's real fire and
    // moonlight. The low-contrast calcium ribbons never become a marble print.
    float ribbon=smoothstep(.72,.92,mineral)*.012;
    float shade=.953+cloud*.065+(key-.5)*.040+(grain-.5)*.012;
    vec3 ivory=vec3(.725,.706,.670)*shade;
    ivory-=vec3(.026,.023,.017)*ribbon*8.;
    ivory-=vec3(patina);
    ivory+=vec3(.006,.003,-.002)*(key-.5);
    vec3 mortar=vec3(.245,.240,.218)*(.96+cloud*.06);
    WhiteStone result;
    result.colour=mix(mortar,ivory,stone);
    result.roughness=mix(.96,.73+key*.08+(grain-.5)*.045,stone);
    float bevel=smoothstep(.003,.019,edge);
    float crown=.00022*(1.-dot(cell-.5,cell-.5)*1.5);
    float relief=.0028*bevel+crown+.00011*(grain-.5)+.000035*(fine-.5)-patina*.0012;
    result.height=mix(.0029,relief*stone,resolved);
    return result;
   }
   vec3 whiteStoneRelief(vec3 viewPoint,vec3 surfaceNormal,float height,float facing){
    vec3 px=dFdx(viewPoint),py=dFdy(viewPoint);
    vec3 rx=cross(py,surfaceNormal),ry=cross(surfaceNormal,px);
    float determinant=dot(px,rx)*facing;
    if(abs(determinant)<.000000000001)return surfaceNormal;
    vec3 gradient=sign(determinant)*(dFdx(height)*rx+dFdy(height)*ry);
    return normalize(abs(determinant)*surfaceNormal-gradient);
   }`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   WhiteStone antiqueWhiteStone=whiteStone(vWhiteStoneWorld);
   diffuseColor.rgb*=antiqueWhiteStone.colour;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor*=antiqueWhiteStone.roughness;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   normal=whiteStoneRelief(-vViewPosition,normal,antiqueWhiteStone.height,faceDirection);`);
  compiled=true;
 };
 if(typeof onChange==='function')onChange();
 return{
  material,
  diagnostics:()=>({kind:'antique-white-limestone',ready:!disposed,compiled,whiteStone:true,largeSlabs:true,aligned:true,
   stone:'honed antique limestone',slabSizeMetres:[2.75,1.55],jointMetres:.005,
   staggeredCourses:true,bevelMetres:.0028,worldMetres:true,faceProjection:true,
   pbr:true,proceduralNormals:true,proceduralRoughness:true,antialiasedGrain:true,
   ownTextures:0,externalFiles:0,domRequired:false,animated:false,disposed}),
  dispose(){if(disposed)return;disposed=true;material.dispose();}
 };
}
