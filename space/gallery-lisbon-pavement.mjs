import * as T from './vendor/three-0.180.0.mjs';

// Original calçada design: limestone and basalt waves, with a caravel laid
// in the same stones. It is generated locally, without a floor photograph,
// network request, DOM canvas or an extra collision surface.
export function createLisbonPavement({mobile=false,anisotropy=4,onChange=()=>{}}={}){
 const resolution=mobile?512:1024;
 const mask=caravelMask(resolution);
 const boatTexture=new T.DataTexture(mask,resolution,resolution,T.RGBAFormat,T.UnsignedByteType);
 boatTexture.name='Lisbon caravel — original vector mosaic mask';
 boatTexture.colorSpace=T.NoColorSpace;boatTexture.flipY=false;
 boatTexture.wrapS=boatTexture.wrapT=T.ClampToEdgeWrapping;
 boatTexture.minFilter=T.LinearMipmapLinearFilter;boatTexture.magFilter=T.LinearFilter;
 boatTexture.generateMipmaps=true;boatTexture.anisotropy=Math.max(1,Math.min(8,Number(anisotropy)||1));boatTexture.needsUpdate=true;
 let disposed=false,compiled=false;
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0});
 material.name='LISBON_CALCADA — hand-laid limestone, basalt and a caravel';
 material.customProgramCacheKey=()=> 'lisbon-calcada-waves-caravel-v1';
 material.onBeforeCompile=shader=>{
  shader.uniforms.uLisbonBoatMask={value:boatTexture};
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   // LISBON_CALCADA: the paving is measured in world metres.
   varying vec2 vLisbonPavementXZ;`);
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
   vec4 lisbonWorld=modelMatrix*vec4(transformed,1.);
   vLisbonPavementXZ=lisbonWorld.xz;
   #include <project_vertex>`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   // LISBON_CALCADA: colour, joints, bevels and wear belong to each stone.
   varying vec2 vLisbonPavementXZ;
   uniform sampler2D uLisbonBoatMask;
   struct LisbonStone{vec3 colour;float roughness;float height;};
   float lisbonHash(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+19.19);return fract(p.x*p.y);}
   float lisbonGrain(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(lisbonHash(i),lisbonHash(i+vec2(1,0)),f.x),mix(lisbonHash(i+vec2(0,1)),lisbonHash(i+vec2(1)),f.x),f.y);}
   LisbonStone lisbonStone(vec2 world){
    const float waveFrequency=.78539816339;
    // Continuous curved courses follow the Mar Largo waves. Staggered rows,
    // chipped corners and varied joints keep the small blocks hand-laid.
    float bend=1.12*sin(world.y*waveFrequency);
    vec2 grid=vec2((world.x-bend)/.079,world.y/.073);
    grid.y+=sin(world.x*2.3)*.10;
    float row=floor(grid.y),offset=mod(row,2.)*.5+(lisbonHash(vec2(row,31.))-.5)*.18;
    grid.x+=offset;
    vec2 id=floor(grid),cell=fract(grid);
    float variation=lisbonHash(id+vec2(17.3,8.1));
    float chip=.006+.017*lisbonHash(id+vec2(9,43));
    float edge=min(min(cell.x,1.-cell.x),min(cell.y,1.-cell.y));
    edge=min(edge,(.963-abs(cell.x-.5)-abs(cell.y-.5))*.7071);
    float jagged=(lisbonGrain(cell*7.+id*.37)-.5)*chip;
    edge-=jagged;
    float aa=min(max(fwidth(edge)*.55,.001),.065);
    float face=smoothstep(.018-aa,.036+aa,edge);
    float footprint=max(length(dFdx(grid)),length(dFdy(grid)));
    float resolved=1.-smoothstep(.36,1.15,footprint);
    face=mix(.895,face,resolved);
    // Select the colour at the centre of a block. The boat and the waves are
    // a mosaic of entire black stones, never a graphic printed over joints.
    float centreZ=(id.y+.5)*.073;
    float centreX=(id.x+.5-offset)*.079+1.12*sin(centreZ*waveFrequency);
    vec2 centre=vec2(centreX,centreZ);
    float wave=sin((centre.x-1.12*sin(centre.y*waveFrequency))*1.90399554763);
    float black=step(0.,wave);
    vec2 ship=centre-vec2(0.,4.);
    float radius=length(ship);
    float medallion=1.-smoothstep(3.47,3.53,radius);
    vec2 uv=ship/7.+.5;
    vec2 ddx=dFdx(world)/7.,ddy=dFdy(world)/7.;
    float carving=textureGrad(uLisbonBoatMask,uv,ddx,ddy).r;
    float rim=1.-smoothstep(.038,.075,abs(radius-3.37));
    float innerRim=1.-smoothstep(.018,.041,abs(radius-3.18));
    black=mix(black,max(carving,max(rim,innerRim)),medallion);
    float grain=lisbonGrain(world*133.);
    float fine=lisbonGrain(world*487.+id);
    float stoneVariation=mix(1.,.83+variation*.30,resolved);
    vec3 limestone=vec3(.56,.525,.455)*(stoneVariation*(.96+grain*.08));
    vec3 basalt=vec3(.025,.033,.040)*(stoneVariation*(.88+grain*.23));
    vec3 top=mix(limestone,basalt,black);
    vec3 joint=vec3(.028,.031,.029)*(.85+.30*grain);
    LisbonStone result;
    result.colour=mix(joint,top,face);
    result.roughness=mix(.98,mix(.79,.63,black)+variation*.10,face);
    float bevel=smoothstep(.021,.115,edge);
    float crown=max(0.,1.-dot(cell-.5,cell-.5)*2.2);
    float height=(.0037*bevel+.00065*crown+.00065*variation+.00028*(fine-.5))*face;
    result.height=mix(.0035,height,resolved);
    return result;
   }
   vec3 lisbonRelief(vec3 viewPoint,vec3 surfaceNormal,float height,float facing){
    vec3 px=dFdx(viewPoint),py=dFdy(viewPoint);
    vec3 rx=cross(py,surfaceNormal),ry=cross(surfaceNormal,px);
    float determinant=dot(px,rx)*facing;
    if(abs(determinant)<.000000000001)return surfaceNormal;
    vec3 gradient=sign(determinant)*(dFdx(height)*rx+dFdy(height)*ry);
    return normalize(abs(determinant)*surfaceNormal-gradient);
   }`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   LisbonStone lisbonPaving=lisbonStone(vLisbonPavementXZ);
   diffuseColor.rgb*=lisbonPaving.colour;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor*=lisbonPaving.roughness;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   normal=lisbonRelief(-vViewPosition,normal,lisbonPaving.height,faceDirection);`);
  compiled=true;
 };
 if(typeof onChange==='function')onChange();
 return{
  material,
  diagnostics:()=>({kind:'lisbon-calcada-pavement',ready:!disposed,compiled,
   waves:true,boat:true,design:'Mar Largo waves and a hand-laid caravel medallion',
   sharedMosaic:true,worldMetres:true,stoneSizeMetres:[.079,.073],
   blackStone:'basalt',whiteStone:'limestone',bevelMetres:.0037,
   pbr:true,proceduralNormals:true,proceduralRoughness:true,
   boatCentre:[0,4],medallionDiameter:7,boatMaskSize:[resolution,resolution],
   ownTextures:1,externalFiles:0,domRequired:false,animated:false,disposed}),
  dispose(){if(disposed)return;disposed=true;material.dispose();boatTexture.dispose();}
 };
}

// A tiny scanline rasteriser keeps the exact same original vector boat in a
// browser and in the no-DOM fallback. The mask is data, not a lit photograph.
function caravelMask(size){
 const pixels=new Uint8Array(size*size),scale=.86;
 const point=(x,y)=>[(x*scale+.5)*size,(y*scale+.5)*size];
 function fill(points,ink=255){
  const p=points.map(([x,y])=>point(x,y));
  const low=Math.max(0,Math.floor(Math.min(...p.map(v=>v[1])))),high=Math.min(size-1,Math.ceil(Math.max(...p.map(v=>v[1]))));
  for(let y=low;y<=high;y++){
   const scan=y+.5,crossings=[];
   for(let i=0,j=p.length-1;i<p.length;j=i++){
    const a=p[j],b=p[i];if((a[1]>scan)===(b[1]>scan))continue;
    crossings.push(a[0]+(scan-a[1])*(b[0]-a[0])/(b[1]-a[1]));
   }
   crossings.sort((a,b)=>a-b);
   for(let i=0;i+1<crossings.length;i+=2){
    const from=Math.max(0,Math.ceil(crossings[i]-.5)),to=Math.min(size-1,Math.floor(crossings[i+1]-.5));
    if(to>=from)pixels.fill(ink,y*size+from,y*size+to+1);
   }
  }
 }
 function path(commands,ink=255){
  const points=[];let here=[0,0];
  for(const command of commands){
   const [type,...v]=command;
   if(type==='M'||type==='L'){here=[v[0],v[1]];points.push(here);}
   else if(type==='C'){
    const a=here;
    for(let n=1;n<=18;n++){const t=n/18,u=1-t;points.push([u*u*u*a[0]+3*u*u*t*v[0]+3*u*t*t*v[2]+t*t*t*v[4],u*u*u*a[1]+3*u*u*t*v[1]+3*u*t*t*v[3]+t*t*t*v[5]]);}
    here=[v[4],v[5]];
   }
  }
  fill(points,ink);return points;
 }
 function disk(x,y,r,ink){fill(Array.from({length:12},(_,i)=>[x+Math.cos(i*Math.PI/6)*r,y+Math.sin(i*Math.PI/6)*r]),ink);}
 function stroke(points,width,ink=255){
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(!length)continue;
   const nx=-dy/length*width*.5,ny=dx/length*width*.5;
   fill([[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]],ink);
  }
  points.forEach(p=>disk(p[0],p[1],width*.5,ink));
 }
 // Curved hull and raised forecastle.
 path([['M',-.415,.058],['C',-.24,.135,.18,.15,.367,.025],['L',.438,.080],['C',.386,.191,.302,.251,.145,.272],['C',-.11,.29,-.349,.213,-.415,.058]]);
 path([['M',.281,.095],['L',.31,-.015],['L',.393,-.014],['L',.437,.080],['L',.391,.12]]);
 // Two white-water seams and individual portholes cut through the black hull.
 const seam1=path([['M',-.345,.123],['C',-.16,.224,.16,.225,.378,.105]],255);
 stroke(seam1,.014,0);
 const seam2=path([['M',-.289,.194],['C',-.10,.276,.156,.266,.319,.175]],255);
 stroke(seam2,.011,0);
 for(let i=0;i<9;i++){const x=-.255+i*.068;disk(x,.158+.031*Math.sin((x+.26)*4.2),.0075,0);}
 // Masts, yards and billowing square sails are broad enough to be made from
 // whole paving stones; fine rigging is intentionally secondary.
 stroke([[-.17,-.382],[-.17,.105]],.022);
 stroke([[.126,-.388],[.126,.099]],.021);
 stroke([[.315,-.269],[.315,.078]],.016);
 stroke([[-.292,-.286],[-.032,-.286]],.016);
 stroke([[-.351,-.135],[.003,-.135]],.018);
 stroke([[.014,-.306],[.252,-.306]],.016);
 stroke([[-.002,-.162],[.284,-.162]],.018);
 path([['M',-.292,-.278],['L',-.043,-.278],['C',-.085,-.235,-.083,-.197,-.046,-.164],['C',-.145,-.178,-.218,-.178,-.294,-.152],['C',-.257,-.197,-.26,-.235,-.292,-.278]]);
 path([['M',-.35,-.127],['L',-.004,-.127],['C',-.067,-.065,-.056,.006,-.006,.043],['C',-.123,.015,-.236,.019,-.354,.061],['C',-.315,-.012,-.305,-.065,-.35,-.127]]);
 path([['M',.015,-.298],['L',.251,-.298],['C',.216,-.254,.224,-.213,.26,-.184],['C',.166,-.198,.089,-.195,.013,-.176],['C',.05,-.218,.055,-.252,.015,-.298]]);
 path([['M',-.001,-.154],['L',.284,-.154],['C',.239,-.092,.242,-.037,.29,.006],['C',.176,-.018,.092,-.017,-.006,.018],['C',.036,-.045,.042,-.096,-.001,-.154]]);
 path([['M',.312,-.248],['C',.352,-.16,.398,-.087,.436,-.024],['C',.373,-.056,.321,-.067,.253,-.048],['C',.285,-.11,.302,-.174,.312,-.248]]);
 // Flags and stays give the silhouette the characteristic Lisbon caravel.
 path([['M',-.177,-.379],['C',-.151,-.409,-.118,-.362,-.077,-.393],['L',-.085,-.344],['C',-.124,-.322,-.148,-.367,-.177,-.341]]);
 path([['M',.119,-.385],['C',.148,-.411,.18,-.368,.212,-.394],['L',.201,-.347],['C',.168,-.33,.146,-.367,.119,-.35]]);
 stroke([[-.17,-.351],[-.399,.08]],.0085);
 stroke([[.126,-.35],[.427,.08]],.0085);
 stroke([[-.17,-.351],[.125,-.178]],.0085);
 // Three irregular Mar Largo wave ribbons beneath the ship.
 for(let row=0;row<3;row++){
  const y=.312+row*.066,w=.445-row*.043,points=[];
  for(let n=0;n<=64;n++){const x=-w+n*w*2/64;points.push([x,y+Math.sin(x*20+row*.85)*.020+Math.sin(x*7-row*.5)*.012]);}
  stroke(points,.027-row*.002);
 }
 const rgba=new Uint8Array(size*size*4);
 for(let i=0;i<pixels.length;i++){rgba[i*4]=rgba[i*4+1]=rgba[i*4+2]=pixels[i];rgba[i*4+3]=255;}
 return rgba;
}
