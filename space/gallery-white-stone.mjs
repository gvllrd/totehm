import * as T from './vendor/three-0.180.0.mjs';

// Large, time-worn pale limestone slabs. All detail is evaluated in
// world metres, including on the counter faces; there is no image or panorama.
export function createWhiteStone({mobile=false,anisotropy=4,onChange=()=>{}}={}){
 let disposed=false,compiled=false;
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0});
 material.name='WHITE_ANTIQUE_LIMESTONE — worn ancient ashlar, fossils and softened arrises';
 material.customProgramCacheKey=()=> 'white-antique-limestone-opus-romain-v4';
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
    // Eleven non-overlapping rectangles pack a six-by-six Roman module.
    // Mirroring/rotating whole modules avoids the uniform brick-course look
    // while every seam still meets exactly; no loop or texture lookup.
    vec2 module=floor(p/3.96),grid=fract(p/3.96)*6.;
    float orientation=wsHash(module+11.7);
    if(orientation<.5)grid=grid.yx;
    if(fract(orientation*7.1)<.5)grid.x=6.-grid.x;
    if(fract(orientation*13.7)<.5)grid.y=6.-grid.y;
    grid=clamp(grid,vec2(.00001),vec2(5.99999));
    vec4 rect;
    if(grid.y<2.){
     if(grid.x<3.)rect=vec4(0.,0.,3.,2.);
     else if(grid.x>=5.)rect=vec4(5.,0.,6.,2.);
     else if(grid.y<1.)rect=vec4(3.,0.,5.,1.);
     else rect=vec4(3.,1.,5.,2.);
    }else if(grid.y<5.){
     if(grid.x<2.)rect=vec4(0.,2.,2.,5.);
     else if(grid.x<4.)rect=grid.y<4.?vec4(2.,2.,4.,4.):vec4(2.,4.,4.,6.);
     else rect=grid.y<3.?vec4(4.,2.,6.,3.):vec4(4.,3.,6.,5.);
    }else{
     if(grid.x<2.)rect=vec4(0.,5.,2.,6.);
     else if(grid.x<4.)rect=vec4(2.,4.,4.,6.);
     else rect=vec4(4.,5.,6.,6.);
    }
    vec2 slab=(rect.zw-rect.xy)*.66;
    vec2 local=(grid-rect.xy)*.66,cell=local/slab;
    vec2 id=module*17.+rect.xy+rect.zw*.19;
    float key=wsHash(id+vec2(13.9,5.1));
    // Rounded-rectangle distance gives the corners the same soft worn shape
    // as the edges; a min-axis bevel would leave a sharp diagonal mitre.
    const float cornerRadius=.052;
    vec2 corner=abs(local-slab*.5)-(slab*.5-cornerRadius);
    float edge=cornerRadius-length(max(corner,vec2(0.)))-min(max(corner.x,corner.y),0.);
    // Weathered arrises stay on their original course. Tiny chips interrupt
    // the mortar locally instead of turning the floor into a perfect grid.
    float wear=wsNoise(local*18.+id*3.1);
    edge-=(wear-.36)*.005;
    edge-=smoothstep(.77,.94,wsNoise(local*7.2+id*4.3))*.008;
    float aa=max(fwidth(edge)*.65,.00015);
    float stone=smoothstep(.0018-aa,.0038+aa,edge);
    float footprint=max(length(dFdx(p)),length(dFdy(p)));
    float resolved=1.-smoothstep(.14,.50,footprint);
    stone=mix(.994,stone,resolved);
    float cloud=wsNoise(p*.52+id*2.13),mineral=wsNoise(p*2.7+vec2(cloud*2.9,key*7.));
    float sediment=wsNoise(vec2(p.x*1.8+cloud*2.,p.y*9.5+key*3.));
    float grainFilter=1.-smoothstep(.22,.85,footprint*115.);
    float fineFilter=1.-smoothstep(.20,.75,footprint*uWhiteStoneFineScale);
    float grain=mix(.5,wsNoise(p*115.+id*.73),grainFilter);
    float fine=mix(.5,wsNoise(p*uWhiteStoneFineScale+id*2.7),fineFilter);
    float porePatch=smoothstep(.39,.78,wsNoise(p*3.6+id*1.9));
    // Sparse small round cavities, with a continuous antialiased rim. High
    // frequency noise in a derivative normal creates ugly 2x2 pixel squares;
    // unresolved pits therefore affect colour only and then fade completely.
    vec2 poreGrid=p*78.+id*1.37,poreId=floor(poreGrid),poreUV=fract(poreGrid);
    vec2 poreCentre=.25+.50*vec2(wsHash(poreId+3.7),wsHash(poreId+9.1));
    float poreRadius=.080+.080*wsHash(poreId+19.);
    float poreDistance=length(poreUV-poreCentre)-poreRadius;
    float poreAA=max(fwidth(poreDistance)*.8,.012);
    float poreFilter=1.-smoothstep(.18,.65,footprint*78.);
    float poreBumpFilter=1.-smoothstep(.04,.12,footprint*78.);
    float poreMask=(1.-smoothstep(-poreAA,poreAA,poreDistance))*poreFilter*(.13+.87*porePatch);
    poreMask*=smoothstep(.24,.36,wsHash(poreId+1.1));
    float fossils=smoothstep(.755,.93,wsNoise(p*14.+vec2(mineral*2.,key*17.)));
    float patina=smoothstep(.49,.91,mineral)*(.023+key*.024);
    float edgeAge=(1.-smoothstep(.006,.10,edge))*(.55+.45*wear);
    // Calcium, faint fossils and sediment belong inside the block. A worn
    // antique floor has a warm chalk body and matte pores, never marble veins.
    float shade=.86+cloud*.18+(key-.5)*.15+(grain-.5)*.022;
    vec3 ivory=vec3(.74,.718,.674)*shade;
    ivory-=vec3(.055,.048,.035)*fossils;
    ivory-=vec3(.045,.037,.025)*(sediment-.5);
    ivory-=vec3(patina)+vec3(.038,.032,.021)*edgeAge;
    ivory-=vec3(.10,.093,.082)*poreMask;
    ivory+=vec3(.021,.009,-.008)*(key-.5);
    vec3 mortar=vec3(.17,.159,.139)*(.94+cloud*.10);
    WhiteStone result;
    result.colour=mix(mortar,ivory,stone);
    float arris=clamp((edge-.003)/.085,0.,1.);
    float rounded=sqrt(max(0.,1.-(1.-arris)*(1.-arris)));
    result.roughness=mix(.99,.49+key*.15+(grain-.5)*.035+poreMask*.29+edgeAge*.12,stone);
    // Broad, softly pillowed arrises catch grazing light like the supplied
    // ancient slabs. The centre remains satin-worn, the pitting matte.
    float crown=.003*(1.-dot(cell-.5,cell-.5)*1.5);
    float relief=.020*rounded+crown+.00035*(mineral-.5)+.000035*(grain-.5)+.000012*(fine-.5)-poreMask*.00010*poreBumpFilter-fossils*.00010;
    result.height=mix(.022,relief*stone,resolved);
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
   stone:'time-worn pale antique limestone in opus romain',slabSizeMetres:[1.98,1.32],jointMetres:.005,
   opusRomanLayout:true,mixedSlabSizes:true,roundedWornSlabs:true,roundAntialiasedPores:true,poreBumpMetres:.00010,roundedCornerRadiusMetres:.052,moduleSizeMetres:3.96,slabsPerModule:11,bevelMetres:.020,
   staggeredCourses:true,aged:true,wornEdges:true,mineralFossils:true,mattePores:true,satinCentres:true,worldMetres:true,faceProjection:true,
   pbr:true,proceduralNormals:true,proceduralRoughness:true,antialiasedGrain:true,
   ownTextures:0,externalFiles:0,domRequired:false,animated:false,disposed}),
  dispose(){if(disposed)return;disposed=true;material.dispose();}
 };
}
