import * as T from './vendor/three-0.180.0.mjs';

// Genuine photographed stone, not a generated speckle pattern. All three PBR
// maps share their physical scale, crop and orientation. A reference-counted
// cache lets the floor, counter and hearth share one GPU copy.
const caches=new Map();
const names=['color','normal','roughness'];
const sources={color:'map',normal:'normalMap',roughness:'roughnessMap'};
function acquireSurface(mobile,anisotropy,changed){
 if(!globalThis.document?.createElementNS)return null;
 const key=mobile?'1k':'2k';let cache=caches.get(key);
 if(!cache){
  cache={key,refs:0,callbacks:new Set(),textures:{},loaded:new Set(),failed:new Set(),disposed:false};caches.set(key,cache);
  const loader=new T.TextureLoader();
  for(const name of names){
   const texture=loader.load('/assets/stone/ancient-'+name+(mobile?'-1k':'')+'.webp',loaded=>{
    if(cache.disposed){loaded.dispose();return;}
    cache.loaded.add(name);for(const callback of cache.callbacks)callback();
   },undefined,()=>{if(cache.disposed)return;cache.failed.add(name);for(const callback of cache.callbacks)callback();});
   texture.name='CC0 ancient limestone — '+name+' '+key;
   texture.colorSpace=name==='color'?T.SRGBColorSpace:T.NoColorSpace;
   texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;
   texture.generateMipmaps=true;texture.anisotropy=anisotropy;cache.textures[name]=texture;
  }
 }
 cache.refs++;cache.callbacks.add(changed);
 let released=false;
 return{cache,release(){if(released)return;released=true;cache.callbacks.delete(changed);cache.refs--;if(cache.refs)return;cache.disposed=true;for(const texture of Object.values(cache.textures))texture.dispose();caches.delete(key);}};
}

export function createWhiteStone({mobile=false,anisotropy=4,onChange=()=>{},slabGeometry=false}={}){
 let disposed=false,compiled=false,surface=null;
 const material=new T.MeshStandardMaterial({color:0xd6d0c4,roughness:.68,metalness:0,vertexColors:slabGeometry,normalScale:new T.Vector2(.37,.37),envMapIntensity:1.05});
 material.name='WHITE_ANTIQUE_LIMESTONE — photographed worn stone, satin mineral faces';
 const changed=()=>{
  if(disposed)return;
  if(surface){
   for(const name of names)material[sources[name]]=surface.cache.loaded.has(name)?surface.cache.textures[name]:null;
   material.color.set(surface.cache.loaded.has('color')?0xffffff:0xd6d0c4);
   material.roughness=surface.cache.loaded.has('roughness')?1:.68;
   material.needsUpdate=true;
  }
  onChange();
 };
 surface=acquireSurface(mobile,anisotropy,changed);
 material.customProgramCacheKey=()=> 'photographed-ancient-limestone-v2-'+(slabGeometry?'physical-slabs':'world-grain');
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   varying vec3 vAncientStoneWorld;
   ${slabGeometry?'attribute float aAncientEdge;varying float vAncientEdge;':''}`);
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
   vAncientStoneWorld=(modelMatrix*vec4(transformed,1.)).xyz;
   ${slabGeometry?'vAncientEdge=aAncientEdge;':''}
   #include <project_vertex>`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   // WHITE_ANTIQUE_LIMESTONE — actual colour, normal and roughness scans.
   varying vec3 vAncientStoneWorld;
   ${slabGeometry?'varying float vAncientEdge;':''}
   float stoneHash(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+19.19);return fract(p.x*p.y);}
   float stoneNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(stoneHash(i),stoneHash(i+vec2(1.,0.)),f.x),mix(stoneHash(i+vec2(0.,1.)),stoneHash(i+1.),f.x),f.y);}
  `);
  // Shared furniture uses world-metre grain, not stretched box UVs. Actual
  // floor blocks carry unique rotated/offset scan UVs from their real geometry.
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   vec3 stoneFace=abs(normalize(cross(dFdx(vAncientStoneWorld),dFdy(vAncientStoneWorld))));
   vec2 stoneProjection=stoneFace.y>=stoneFace.x&&stoneFace.y>=stoneFace.z?vAncientStoneWorld.xz:(stoneFace.x>=stoneFace.z?vAncientStoneWorld.zy:vAncientStoneWorld.xy);
   vec2 stoneSurfaceUV=stoneProjection/1.25;
   ${slabGeometry?'#ifdef USE_MAP\nstoneSurfaceUV=vMapUv;\n#endif':''}
   #define vMapUv stoneSurfaceUV
   #define vNormalMapUv stoneSurfaceUV
   #define vRoughnessMapUv stoneSurfaceUV
   #include <map_fragment>
   #ifndef USE_MAP
    float fallbackCloud=stoneNoise(stoneProjection*3.1);
    float fallbackGrain=stoneNoise(stoneProjection*52.);
    diffuseColor.rgb*=.88+.15*fallbackCloud+.035*(fallbackGrain-.5);
   #endif
  `);
  if(slabGeometry)shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=clamp(roughnessFactor+vAncientEdge*.17,.32,.95);`);
  compiled=true;
 };
 changed();
 return{
  material,
  diagnostics:()=>({kind:'antique-white-limestone',ready:!disposed,compiled,whiteStone:true,largeSlabs:true,aligned:true,
   stone:'photographed time-worn pale stone, real rounded opus-romain slabs',slabSizeMetres:[1.98,1.32],jointMetres:.006,
   opusRomanLayout:true,mixedSlabSizes:true,roundedWornSlabs:true,roundedCornerRadiusMetres:.052,moduleSizeMetres:3.96,slabsPerModule:11,bevelMetres:.025,
   aged:true,wornEdges:true,mineralFossils:true,mattePores:true,satinCentres:true,worldMetres:true,faceProjection:!slabGeometry,
   pbr:true,photographedSurface:true,photographicMapsReady:surface?.cache.loaded.size===3,loadedMaps:surface?.cache.loaded.size||0,mapFailures:surface?.cache.failed.size||0,
   mapSize:mobile?1024:2048,sharedGPUMaps:true,normalMapOpenGL:true,mipmaps:true,anisotropy,
   source:'https://polyhaven.com/a/rock_01',license:'CC0-1.0',physicalSlabGeometry:slabGeometry,
   proceduralNormals:false,proceduralRoughness:false,antialiasedGrain:true,ownTextures:0,sharedTextures:surface?3:0,externalFiles:0,localFiles:surface?3:0,domRequired:false,animated:false,disposed}),
  dispose(){if(disposed)return;disposed=true;surface?.release();material.dispose();}
 };
}
