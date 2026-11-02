import * as T from './vendor/three-0.180.0.mjs';

// An original, metre-sized reconstruction of the repeated cobalt lozenges
// in Lisbon's nineteenth-century glazed façades. No reference photograph,
// watermark or downloaded tile image is rendered in the building.
export function createLisbonAzulejos({border=false}={}){
 let compiled=false,disposed=false;
 const material=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.32,metalness:0,clearcoat:.45,clearcoatRoughness:.19});
 material.name=border?'Ruined Lisbon azulejo — worn cobalt diamond border':'Ruined Lisbon azulejo — surviving cobalt lozenges and exposed lime substrate';
 material.customProgramCacheKey=()=>border?'lisbon-ruined-lozenge-border-v2':'lisbon-ruined-lozenge-field-v2';
 material.onBeforeCompile=shader=>{
  compiled=true;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLisbonTileWorld;');
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','vLisbonTileWorld=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vLisbonTileWorld;
   float lisboaHash(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+19.19);return fract(p.x*p.y);}
   float lisboaNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(lisboaHash(i),lisboaHash(i+vec2(1.,0.)),f.x),mix(lisboaHash(i+vec2(0.,1.)),lisboaHash(i+1.),f.x),f.y);}
   float lisboaPatch(vec2 p,vec2 centre,vec2 radius){return 1.-smoothstep(.25,1.,length((p-centre)/radius));}
   float lisboaCrack(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.));}
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
   // Loss follows groups of whole ceramic squares, with ragged fragments
   // at the edges. The surviving original pattern stays legible between
   // the scars; this is exposed old lime, rather than dirt painted on blue.
   vec2 lisboaCentre=(floor(lisboaTile)+.5)*.155;
   float lisboaScars=max(max(lisboaPatch(lisboaCentre,vec2(-11.9,3.1),vec2(1.5,2.2)),lisboaPatch(lisboaCentre,vec2(-4.1,6.2),vec2(1.6,1.2))),max(lisboaPatch(lisboaCentre,vec2(8.7,2.6),vec2(2.0,1.5)),lisboaPatch(lisboaCentre,vec2(11.7,6.9),vec2(2.1,1.2))));
   lisboaScars=max(lisboaScars,lisboaPatch(lisboaCentre,vec2(-7.8,.55),vec2(2.2,1.0)));
   float lisboaCellWear=lisboaNoise(lisboaCentre*2.3+13.7),lisboaLoss=step(.57,lisboaScars+.22*lisboaCellWear);
   float lisboaChip=smoothstep(.0005,.004+lisboaVariation*.006,.010-lisboaJoint)*smoothstep(.58,.91,lisboaNoise(lisboaP*41.));
   float lisboaFault=min(lisboaCrack(lisboaP,vec2(-11.6,7.2),vec2(-10.9,5.7)),lisboaCrack(lisboaP,vec2(-10.9,5.7),vec2(-11.1,4.9)));
   lisboaFault=min(lisboaFault,min(lisboaCrack(lisboaP,vec2(5.6,5.4),vec2(6.2,4.75)),lisboaCrack(lisboaP,vec2(6.2,4.75),vec2(6.05,3.7))));
   lisboaFault=min(lisboaFault,lisboaCrack(lisboaP,vec2(6.2,4.75),vec2(6.65,4.5)));
   float lisboaFaultAA=max(fwidth(lisboaFault),.0005),lisboaFissure=1.-smoothstep(.0015-lisboaFaultAA,.004+lisboaFaultAA,lisboaFault);
   float lisboaDecay=max(lisboaLoss,lisboaChip*.75);
   vec3 lisboaLime=vec3(.58,.51,.40)*(.80+.20*lisboaNoise(lisboaP*4.3)+.08*lisboaNoise(lisboaP*93.));
   float lisboaRain=smoothstep(.62,.91,lisboaNoise(vec2(lisboaP.x*3.7,.13)))*(.03+.10*(1.-smoothstep(.2,3.5,lisboaP.y)));
   vec3 lisboaSurviving=mix(vec3(.53,.52,.46),lisboaColour,lisboaGlaze)*(.93+.04*lisboaGrain-lisboaRain);
   diffuseColor.rgb=mix(lisboaSurviving,lisboaLime,lisboaDecay)*(1.-lisboaFissure*.60);
  `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=mix(roughnessFactor,.95,max(lisboaDecay,lisboaFissure));
  `).replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>
   #ifdef USE_CLEARCOAT
    material.clearcoat*=1.-max(lisboaDecay,lisboaFissure);
    material.clearcoatRoughness=mix(material.clearcoatRoughness,.95,lisboaDecay);
   #endif
  `);
 };
 return{material,diagnostics:()=>({kind:'lisbon-cobalt-lozenge-azulejo',originalProcedural:true,externalImages:0,elongatedDiamonds:true,blueAndWhite:true,glazed:true,weatheredTiles:true,missingTilePatches:5,exposedLime:true,fineCracks:true,chippedGlaze:true,physicalCeramicWidth:.155,diamondPeriod:border?[.085,.12]:[.155,.22],antiAliased:true,border,compiled,disposed}),dispose(){if(disposed)return;disposed=true;material.dispose();}};
}
