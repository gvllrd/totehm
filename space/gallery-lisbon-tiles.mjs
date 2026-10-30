import * as T from './vendor/three-0.180.0.mjs';

// An original, metre-sized reconstruction of the repeated cobalt lozenges
// in Lisbon's nineteenth-century glazed façades. No reference photograph,
// watermark or downloaded tile image is rendered in the building.
export function createLisbonAzulejos({border=false}={}){
 let compiled=false,disposed=false;
 const material=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.32,metalness:0,clearcoat:.45,clearcoatRoughness:.19});
 material.name=border?'Lisbon azulejo — fine cobalt diamond border':'Lisbon azulejo — cobalt and ivory elongated lozenges';
 material.customProgramCacheKey=()=>border?'lisbon-cobalt-lozenge-border-v1':'lisbon-cobalt-lozenge-field-v1';
 material.onBeforeCompile=shader=>{
  compiled=true;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLisbonTileWorld;');
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','vLisbonTileWorld=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vLisbonTileWorld;
   float lisboaHash(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+19.19);return fract(p.x*p.y);}
  `).replace('#include <color_fragment>',`#include <color_fragment>
   vec2 lisboaP=vLisbonTileWorld.xy;
   vec2 lisboaGrid=lisboaP/vec2(${border?'.085,.12':'.155,.22'});
   vec2 lisboaCell=floor(lisboaGrid),lisboaUV=fract(lisboaGrid);
   float lisboaDiamond=abs(lisboaUV.x-.5)+abs(lisboaUV.y-.5);
   float lisboaAA=max(fwidth(lisboaDiamond),.003);
   float lisboaBlue=1.-smoothstep(.47-lisboaAA,.47+lisboaAA,lisboaDiamond);
   // At distance the repeated pattern converges to its true coverage instead
   // of sparkling into a moiré. Close views retain the glazed, pointed ends.
   float lisboaPixel=max(fwidth(lisboaGrid.x),fwidth(lisboaGrid.y));
   lisboaBlue=mix(lisboaBlue,.4418,smoothstep(.35,.85,lisboaPixel));
   vec2 lisboaTile=lisboaP/.155,lisboaTileUV=fract(lisboaTile);
   float lisboaJoint=min(min(lisboaTileUV.x,1.-lisboaTileUV.x),min(lisboaTileUV.y,1.-lisboaTileUV.y))*.155;
   float lisboaJointAA=max(fwidth(lisboaJoint),.0001);
   float lisboaGlaze=smoothstep(.0007-lisboaJointAA,.0012+lisboaJointAA,lisboaJoint);
   float lisboaVariation=lisboaHash(floor(lisboaTile));
   float lisboaGrain=lisboaHash(floor(lisboaP*360.));
   vec3 lisboaIvory=vec3(.91,.905,.855)*(.96+.035*lisboaVariation);
   vec3 lisboaCobalt=mix(vec3(.009,.036,.31),vec3(.016,.083,.53),lisboaVariation*.7+.3*lisboaGrain);
   vec3 lisboaColour=mix(lisboaIvory,lisboaCobalt,lisboaBlue);
   diffuseColor.rgb=mix(vec3(.63,.65,.62),lisboaColour,lisboaGlaze)*(.99+.02*lisboaGrain);
  `);
 };
 return{material,diagnostics:()=>({kind:'lisbon-cobalt-lozenge-azulejo',originalProcedural:true,externalImages:0,elongatedDiamonds:true,blueAndWhite:true,glazed:true,physicalCeramicWidth:.155,diamondPeriod:border?[.085,.12]:[.155,.22],antiAliased:true,border,compiled,disposed}),dispose(){if(disposed)return;disposed=true;material.dispose();}};
}
