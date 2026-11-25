import * as T from './vendor/three-0.180.0.mjs';
import {createOriginStardust,ORIGIN_SKY_FRAGMENT,ORIGIN_STAR_MOTION} from './gallery-origin-sky.mjs';

export const SKY_ASTROPHOTOGRAPH=Object.freeze({
 src:'/assets/gallery/sky/eso-milky-way-2048.jpg',
 source:'https://www.eso.org/public/images/eso0932a/',
 credit:'ESO/S. Brunier',license:'CC BY 4.0',
 licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
 dimensions:Object.freeze([2048,1024]),
 adaptation:'Exposure, colour and orientation adapted for the shared night sky; photograph pixels unchanged.'
});

// All three spaces use the same photographed celestial sphere. At Origins
// alone, the photograph breathes and light travels through it and in front of it.
export function createDrownedSky(scene,{mobile=false,profile='earth',arrival=false,onChange=()=>{}}={}){
 const origin=profile==='origin';
 const root=new T.Group();root.name='TOTEHM — the common celestial sphere';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set();
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 let time=0,disposed=false,dirty=true,animated=false,plateReady=false,plateFailed=false;
 const plateBlend={value:0};
 const photograph=typeof globalThis.document?.createElementNS==='function'?new T.TextureLoader().load(SKY_ASTROPHOTOGRAPH.src,()=>{
  if(disposed)return;
  plateReady=true;dirty=true;onChange();
 },undefined,()=>{
  if(disposed)return;
  plateFailed=true;dirty=true;onChange();
 }):null;
 if(photograph){
  photograph.colorSpace=T.SRGBColorSpace;photograph.anisotropy=4;
  photograph.wrapS=T.RepeatWrapping;textures.add(photograph);
 }
 // The CC BY credit stays visible in each scene. Rendering uses only the local JPEG.
 let credit=null;
 if(globalThis.document?.body&&!document.querySelector?.('[data-totehm-sky-credit]')){
  credit=document.createElement('div');credit.dataset.totehmSkyCredit='';
  credit.style.cssText='position:fixed;bottom:5px;left:50%;transform:translateX(-50%);z-index:3;white-space:nowrap;font:9px/1.3 monospace;color:#89929e;pointer-events:auto';
  const source=document.createElement('a'),license=document.createElement('a');
  source.href=SKY_ASTROPHOTOGRAPH.source;source.textContent='Sky · '+SKY_ASTROPHOTOGRAPH.credit;
  source.title=SKY_ASTROPHOTOGRAPH.adaptation;
  license.href=SKY_ASTROPHOTOGRAPH.licenseUrl;license.textContent=' · '+SKY_ASTROPHOTOGRAPH.license;
  for(const link of [source,license]){link.target='_blank';link.rel='noopener noreferrer';link.style.cssText='color:inherit;text-decoration:none';credit.append(link);}
  document.body.append(credit);
 }
 let seed=0x4e494748;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
 // A low celestial arch stays visible from both ocean panoramas as well as
 // the entrance: its pearly centre rises above the three independent doors.
 const normal=new T.Vector3(.05,.88,.47).normalize();
 const core=new T.Vector3(-.2,.53,-.824);core.addScaledVector(normal,-core.dot(normal)).normalize();
 const tangent=new T.Vector3().crossVectors(normal,core).normalize();
 const plateNormal=normal,plateCore=core,plateLongitude=tangent;
 const moonDirection=new T.Vector3(.38,.43,-.82).normalize(),moonDiameter=1.5;
 const width=mobile?1024:2048,height=width/2;
 const lattice=new Float32Array(32*32*32);for(let i=0;i<lattice.length;i++)lattice[i]=random();
 const atLattice=(x,y,z)=>lattice[(x&31)+((y&31)<<5)+((z&31)<<10)];
 function noise(x,y,z){
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=fz*fz*(3-2*fz);
  const a=atLattice(ix,iy,iz)*(1-u)+atLattice(ix+1,iy,iz)*u,b=atLattice(ix,iy+1,iz)*(1-u)+atLattice(ix+1,iy+1,iz)*u;
  const c=atLattice(ix,iy,iz+1)*(1-u)+atLattice(ix+1,iy,iz+1)*u,d=atLattice(ix,iy+1,iz+1)*(1-u)+atLattice(ix+1,iy+1,iz+1)*u;
  return (a*(1-v)+b*v)*(1-w)+(c*(1-v)+d*v)*w;
 }

 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d'),pixels=context.createImageData(width,height),data=pixels.data;
 const cosLongitude=new Float32Array(width),sinLongitude=new Float32Array(width);
 for(let x=0;x<width;x++){const longitude=((x+.5)/width-.5)*Math.PI*2;cosLongitude[x]=Math.cos(longitude);sinLongitude[x]=Math.sin(longitude);}
 for(let y=0;y<height;y++){
  const latitude=(.5-(y+.5)/height)*Math.PI,dy=Math.sin(latitude),latitudeCos=Math.cos(latitude);
  const horizon=Math.exp(-Math.abs(dy)*7.5),upper=smooth(-.28,.18,dy);
  for(let x=0;x<width;x++){
   const dx=latitudeCos*cosLongitude[x],dz=latitudeCos*sinLongitude[x],at=(y*width+x)*4;
   let r=2.1+horizon*2.7,g=3.2+horizon*3.8,b=7.05+horizon*6.2;
   const galacticLatitude=dx*normal.x+dy*normal.y+dz*normal.z;
   const along=dx*tangent.x+dy*tangent.y+dz*tangent.z,centre=dx*core.x+dy*core.y+dz*core.z;
   const band=Math.exp(-galacticLatitude*galacticLatitude/.055);
   if(band>.002){
    // Isotropic noise on the sphere avoids the parallel brush strokes made
    // by stretching a texture along the galactic equator. Domain warping
    // breaks the arms into overlapping, pearly clouds and dark dust islands.
    const low=noise(dx*5.1+7,dy*5.1+13,dz*5.1+9);
    const warp=noise(dx*11.3+16,dy*11.3+3,dz*11.3+12);
    const wx=dx+(low-.5)*.058,wy=dy+(warp-.5)*.058,wz=dz+(low-warp)*.037;
    const middle=noise(wx*24.7+11,wy*24.7+17,wz*24.7+5);
    const fine=noise(wx*81.3+8,wy*81.3+7,wz*81.3+16);
    const grains=noise(wx*217.1+12,wy*217.1+3,wz*217.1+19);
    const bulge=Math.exp((centre-1)*6.1);
    const warpedLatitude=galacticLatitude+(low-.5)*.079+(warp-.5)*.028;
    const broad=Math.exp(-Math.pow(warpedLatitude/(.112+bulge*.067),2));
    const armCurve=.014*Math.sin(along*7.3)+(middle-.5)*.019;
    const inner=Math.exp(-Math.pow((warpedLatitude+armCurve)/(.043+bulge*.029),2));
    const outerArm=Math.exp(-Math.pow((warpedLatitude-.083-.023*Math.sin(along*9.1))/.031,2));
    const cloud=Math.pow(smooth(.16,.83,low*.46+middle*.31+fine*.17+grains*.06),1.08);
    // The foreground Great Rift has broad occluding clouds and narrow,
    // branching lanes. Fine luminous filaments remain behind that dust.
    const riftOffset=.014*Math.sin(along*11.7)+.012*Math.cos(centre*19.3)+(middle-.5)*.033;
    const rift=Math.exp(-Math.pow((warpedLatitude-riftOffset)/(.010+fine*.021),2));
    const branch=Math.exp(-Math.pow((warpedLatitude-riftOffset-.027-.012*Math.sin(along*23.))/.008,2));
    const islands=smooth(.43,.78,middle*.64+fine*.36);
    const dust=Math.exp(-rift*(1.27+islands*1.62)-branch*.72-islands*.3);
    const filament=Math.pow(smooth(.23,.80,fine*.72+grains*.28),1.8);
    const secondary=Math.exp(-Math.pow((warpedLatitude+.099+.035*Math.sin(along*7.))/.042,2));
    const curl=.060+.034*Math.sin(along*11.8+middle*1.8)+.018*Math.sin(along*31.3);
    const brightFilament=Math.exp(-Math.pow((warpedLatitude-curl)/(.012+.013*warp),2));
    const wisps=(broad*.58+inner*.82+outerArm*.32+secondary*.25+brightFilament*.20)*cloud*dust*(.80+.63*filament);
    // Amber light in the crowded core, a break of violet dust, and cool outer clouds.
    const energy=wisps*(89+bulge*202),pearl=.83+fine*.13+grains*.04;
    const warm=bulge*smooth(.24,.82,middle*.74+fine*.26);
    r+=energy*(.65+bulge*.36+warm*.67)*pearl;
    g+=energy*(.77+bulge*.22+warm*.26)*pearl;
    b+=energy*(1.07-bulge*.23);
    const violet=Math.pow(smooth(.25,.81,middle*.57+fine*.43),1.85)*(.36*outerArm+.4*secondary+.24*brightFilament)*(1-dust*.45);
    const cyan=Math.pow(smooth(.27,.86,warp*.56+grains*.44),1.85)*(broad*.36+outerArm*.34+secondary*.30);
    r+=violet*67;g+=cyan*16+violet*10;b+=cyan*45+violet*72;
    const scattered=band*(1-dust)*cloud*3.0;r+=scattered;g+=scattered*.78;b+=scattered*.64;
   }
   // A thin natural airglow, rather than a luminous horizon or ground photo.
   const airglow=Math.exp(-Math.pow((dy-.047)/.065,2))*upper;
   data[at]=clamp(r+airglow*.8,0,255);data[at+1]=clamp(g+airglow*2.1,0,255);data[at+2]=clamp(b+airglow*1.6,0,255);data[at+3]=255;
  }
 }
 // Very distant stellar dust is baked into the environment. Brighter stars
 // below are genuine point geometry, with a slow, independent scintillation.
 const tinyStars=mobile?18000:48000;
 for(let i=0;i<tinyStars;i++){
  const theta=random()*Math.PI*2,latitude=(random()+random()+random()-1.5)*.092;
  let dx=(core.x*Math.cos(theta)+tangent.x*Math.sin(theta))*Math.cos(latitude)+normal.x*Math.sin(latitude);
  let dy=(core.y*Math.cos(theta)+tangent.y*Math.sin(theta))*Math.cos(latitude)+normal.y*Math.sin(latitude);
  let dz=(core.z*Math.cos(theta)+tangent.z*Math.sin(theta))*Math.cos(latitude)+normal.z*Math.sin(latitude);
  if(i%4===0){dy=random()*2-1;const radius=Math.sqrt(1-dy*dy);dx=Math.cos(theta)*radius;dz=Math.sin(theta)*radius;}
  const x=Math.floor((Math.atan2(dz,dx)/(Math.PI*2)+.5)*width)%width,y=Math.floor((.5-Math.asin(clamp(dy,-1,1))/Math.PI)*height);
  const at=(y*width+x)*4,luminance=2+Math.pow(random(),9)*22;
  // Tiny unresolved stars contribute a veil of light; the point geometry
  // below supplies crisp individual stars instead of a field of blue bokeh.
  data[at]=Math.min(255,data[at]+luminance*.88);data[at+1]=Math.min(255,data[at+1]+luminance*.95);data[at+2]=Math.min(255,data[at+2]+luminance);
 }
 context.putImageData(pixels,0,0);
 const environmentTexture=new T.CanvasTexture(canvas);environmentTexture.colorSpace=T.SRGBColorSpace;environmentTexture.mapping=T.EquirectangularReflectionMapping;environmentTexture.wrapS=T.RepeatWrapping;
 environmentTexture.minFilter=T.LinearMipmapLinearFilter;environmentTexture.magFilter=T.LinearFilter;textures.add(environmentTexture);
 const timeUniform={value:0},passage={value:0},pixelRatio={value:Math.min(globalThis.devicePixelRatio||1,1.5)};
 const defines=origin?{ORIGIN_SKY:1}:{};
 const skyMaterial=material(new T.ShaderMaterial({defines,uniforms:{
  uMap:{value:environmentTexture},uPhotograph:{value:photograph??environmentTexture},uPhotographBlend:plateBlend,uTime:timeUniform,uPassage:passage,
  uGalacticCore:{value:core},uGalacticEast:{value:tangent},uGalacticNormal:{value:normal}
 },side:T.BackSide,depthWrite:false,depthTest:false,fog:false,toneMapped:false,
  vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 vDirection;
   uniform sampler2D uMap,uPhotograph;
   uniform float uPhotographBlend,uTime;
   uniform vec3 uGalacticCore,uGalacticEast,uGalacticNormal;
   vec2 sphereUV(vec3 d){
    return vec2(atan(d.z,d.x)*.159154943+.5,asin(clamp(d.y,-1.,1.))*.318309886+.5);
   }
   vec2 skyDerivative(vec2 delta){
    // Crossing the longitude seam must keep the same texture footprint.
    delta.x-=floor(delta.x+.5);
    return delta;
   }
   vec3 skySample(sampler2D image,vec2 uv){
    return textureGrad(image,uv,skyDerivative(dFdx(uv)),skyDerivative(dFdy(uv))).rgb;
   }
   vec3 nightPigment(vec3 signal,vec3 lowFrequency,vec3 galactic,float time){
    vec3 luminance=vec3(.2126,.7152,.0722);
    float light=dot(signal,luminance);
    float localLight=dot(lowFrequency,luminance);
    // Separate the photographed dust lanes from the broad glow. Suppress the
    // plate's floor while preserving the fine variations inside those lanes.
    float fine=clamp((light-localLight)/(localLight+.022),-.75,.8);
    float structure=smoothstep(.006,.032,localLight)*(1.-smoothstep(.16,.52,light));
    float floorLevel=mix(.0048,.0034,smoothstep(.014,.075,localLight));
    float intensity=max(light-floorLevel,0.)*(.32+.73*smoothstep(.005,.039,light))/(1.+.79*light);
    intensity*=1.+fine*structure*.91;
    float latitude=abs(galactic.y);
    float violet=smoothstep(.22,.79,.49+.33*sin(dot(galactic,vec3(2.4,1.2,-3.1)))+.13*cos(dot(galactic,vec3(7.8,-3.3,4.1)))+fine*.09);
    float turquoise=smoothstep(.52,.91,.55+.37*sin(dot(galactic,vec3(-4.7,2.1,4.2)))+fine*.075)
     *(1.-smoothstep(.04,.42,latitude))*smoothstep(.011,.057,light);
    float warmth=(signal.r-signal.b)/max(light,.004);
    float gold=smoothstep(.105,.55,warmth)*smoothstep(.032,.118,light);
    vec3 cobalt=mix(vec3(.20,.43,2.06),vec3(.30,.70,1.96),smoothstep(.026,.13,localLight));
    vec3 tint=mix(cobalt,vec3(.88,.294,1.86),violet);
    tint=mix(tint,vec3(.077,1.31,1.74),turquoise);
    tint=mix(tint,vec3(2.06,1.00,.242),gold);
    tint=mix(tint,signal/max(light,.001),.12);
    float glimmer=.977+.023*sin(dot(galactic,vec3(9.3,-4.5,10.7))+time*.34);
    vec3 dust=intensity*tint*mix(1.,glimmer,max(turquoise,gold));
    // Bright compact peaks keep their natural colours. A similarly bright
    // cloud does not desaturate a whole region of the photograph.
    float peak=light-localLight;
    float star=smoothstep(.34,.85,max(signal.r,max(signal.g,signal.b)))*
     smoothstep(.14,.56,light)*smoothstep(.018,.16,peak);
    return mix(dust,signal*.78,star);
   }
   #ifdef ORIGIN_SKY
   ${ORIGIN_SKY_FRAGMENT}
   #endif
   void main(){
    vec3 d=normalize(vDirection);
    vec3 fallback=skySample(uMap,sphereUV(d))*vec3(.010,.021,.047);
    // The same galactic coordinates anchor the photograph in all three worlds.
    vec3 galactic=vec3(dot(d,uGalacticCore),dot(d,uGalacticNormal),dot(d,uGalacticEast));
    #ifdef ORIGIN_SKY
    vec3 photographDirection=originRefraction(galactic,uTime);
    #else
    vec3 photographDirection=galactic;
    #endif
    vec2 plateUV=sphereUV(photographDirection);
    vec2 dx=skyDerivative(dFdx(plateUV)),dy=skyDerivative(dFdy(plateUV));
    vec3 signal=textureGrad(uPhotograph,plateUV,dx,dy).rgb;
    vec2 workingSize=vec2(textureSize(uPhotograph,0));
    float footprint=max(length(dx*workingSize),length(dy*workingSize));
    vec3 lowFrequency=textureLod(uPhotograph,plateUV,max(2.05,log2(max(1.,footprint))+1.35)).rgb;
    vec3 ink=mix(fallback,nightPigment(signal,lowFrequency,galactic,uTime),uPhotographBlend);
    #ifdef ORIGIN_SKY
    ink=originLight(ink,d,galactic,uTime);
    #endif
    gl_FragColor=vec4(ink,1.);
    #include <colorspace_fragment>
   }`
 }));
 const dome=new T.Mesh(geometry(new T.SphereGeometry(1250,48,24)),skyMaterial);dome.name='Photographed Milky Way and interstellar dust lanes';dome.renderOrder=-1200;dome.frustumCulled=false;root.add(dome);

 const starCount=mobile?10500:23500,positions=new Float32Array(starCount*3),colours=new Float32Array(starCount*3),sizes=new Float32Array(starCount),phases=new Float32Array(starCount),intensities=new Float32Array(starCount),anchorsStrength=new Float32Array(starCount);
 // Separate seeds keep navigation stars and the lunar relief fixed across quality settings.
 seed=0x53544152;
 const colour=new T.Color();
 const pleiades=[[.32,.58,-.75],[.324,.584,-.748],[.318,.579,-.753],[.328,.576,-.746],[.315,.586,-.751],[.331,.582,-.743],[.322,.574,-.756]];
 const navigationalStars=[[-.15,.88,.44],[-.42,.42,-.81],[-.38,.39,-.83],[-.34,.36,-.85],[-.48,.48,-.73],[-.28,.31,-.91],[.05,.92,-.38]];
 const anchors=[...pleiades,...navigationalStars];
 for(let i=0;i<starCount;i++){
  let direction;
  if(i<anchors.length){
   direction=new T.Vector3(...anchors[i]).normalize();
  }else if(i%5<2){
   const longitude=random()*Math.PI*2,latitude=(random()+random()+random()-1.5)*.085;
   direction=new T.Vector3().copy(plateCore).multiplyScalar(Math.cos(longitude)).addScaledVector(plateLongitude,Math.sin(longitude)).multiplyScalar(Math.cos(latitude)).addScaledVector(plateNormal,Math.sin(latitude));
  }else{
   const dy=random()*2-1,phi=random()*Math.PI*2,r=Math.sqrt(1-dy*dy);direction=new T.Vector3(Math.cos(phi)*r,dy,Math.sin(phi)*r);
  }
  positions.set(direction.multiplyScalar(1220).toArray(),i*3);
  const sample=Math.pow(random(),19),temperature=random(),bright=i<anchors.length?Math.max(sample,i<7?.29:.65):sample;
  if(temperature<.06)colour.setHex(0x789eff);
  else if(temperature<.20)colour.setHex(0xa6c2ff);
  else if(temperature<.52)colour.setHex(0xeef3ff);
  else if(temperature<.70)colour.setHex(0xfff7ee);
  else if(temperature<.84)colour.setHex(0xffebaf);
  else if(temperature<.94)colour.setHex(0xffbe68);
  else colour.setHex(0xff7452);
  const navigation=i>=pleiades.length&&i<anchors.length;
  anchorsStrength[i]=navigation?1:i<pleiades.length?.34:0;
  colours.set(colour.toArray(),i*3);
  sizes[i]=navigation?5.5+bright*2.2:1.15+bright*3.5;
  phases[i]=random()*Math.PI*2;intensities[i]=.055+bright*.84;
 }
 const starGeometry=geometry(new T.BufferGeometry());starGeometry.setAttribute('position',new T.BufferAttribute(positions,3));starGeometry.setAttribute('aColour',new T.BufferAttribute(colours,3));starGeometry.setAttribute('aSize',new T.BufferAttribute(sizes,1));starGeometry.setAttribute('aPhase',new T.BufferAttribute(phases,1));starGeometry.setAttribute('aIntensity',new T.BufferAttribute(intensities,1));starGeometry.setAttribute('aAnchor',new T.BufferAttribute(anchorsStrength,1));

 const starMaterial=material(new T.ShaderMaterial({defines,uniforms:{uTime:timeUniform,uPixelRatio:pixelRatio,uPassage:passage},transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,fog:false,
  vertexShader:`attribute vec3 aColour;attribute float aSize,aPhase,aIntensity,aAnchor;uniform float uTime,uPixelRatio,uPassage;varying vec3 vColour;varying float vIntensity,vGlint,vAnchor,vPhase;
   void main(){vAnchor=aAnchor;vPhase=aPhase;float low=1.-smoothstep(.04,.68,position.y/1220.);
    float shimmer=mix(.019+.046*low*low,.036,aAnchor);
    float twinkle=sin(aPhase+uTime*(.21+.08*sin(aPhase)))*.55+sin(aPhase*2.7+uTime*.49)*.31+sin(aPhase*6.1+uTime*.73)*.14;
    float glint=smoothstep(1.5,6.2,aSize);
    vColour=aColour;
    vIntensity=aIntensity*(1.-shimmer+shimmer*twinkle);
    vGlint=glint;
    vec3 point=position;
    #ifdef ORIGIN_SKY
    ${ORIGIN_STAR_MOTION}
    #endif
    gl_PointSize=max(1.25,aSize*uPixelRatio);gl_Position=projectionMatrix*modelViewMatrix*vec4(point,1.);}`,
  fragmentShader:`varying vec3 vColour;varying float vIntensity,vGlint,vAnchor,vPhase;
   void main(){
    vec2 p=gl_PointCoord-.5;
    float rr=dot(p,p);
    if(rr>.25)discard;
    float core=exp(-rr*mix(mix(9.5,93.,vGlint),138.,vAnchor));
    float edge=1.-smoothstep(.14,.25,rr);
    float halo=exp(-rr*16.)*edge*(.012+.058*vGlint+.071*vAnchor);
    float angle=.12+.18*sin(vPhase);
    float sine=sin(angle),cosine=cos(angle);
    vec2 spike=abs(mat2(cosine,sine,-sine,cosine)*p);
    float arms=(exp(-spike.x*147.-spike.y*8.)+exp(-spike.y*147.-spike.x*8.))*edge*(.016*vGlint+.119*vAnchor);
    float opacity=(core*edge*.95+halo+arms)*vIntensity;
    vec3 light=mix(vColour,vec3(1.,.983,.961),smoothstep(.37,.91,core)*(.48+.31*vAnchor));
    gl_FragColor=vec4(light,min(1.,opacity));
    #include <colorspace_fragment>
   }`
 }));
 const stars=new T.Points(starGeometry,starMaterial);stars.name='Fine stellar light — warm giants and blue distant stars';stars.renderOrder=-1100;stars.frustumCulled=false;stars.onBeforeRender=renderer=>{pixelRatio.value=Math.min(renderer.getPixelRatio(),1.5);};root.add(stars);

 seed=0x4d4f4f4e;
 const moonCanvas=document.createElement('canvas');moonCanvas.width=moonCanvas.height=mobile?256:512;
 const mx=moonCanvas.getContext('2d'),moonPixels=mx.createImageData(moonCanvas.width,moonCanvas.height),moonData=moonPixels.data;
 const rayCraters=[
  {x:-.17,y:-.57,radius:.081,rays:.15,phase:.48},
  {x:-.54,y:.16,radius:.099,rays:.10,phase:1.86},
  {x:.32,y:.30,radius:.073,rays:.11,phase:3.2}
 ];
 const lunarCraters=[...rayCraters,...Array.from({length:48},()=>{
  const theta=random()*Math.PI*2,r=Math.sqrt(random())*.91;
  return {x:Math.cos(theta)*r,y:Math.sin(theta)*r,radius:.022+Math.pow(random(),2)*.09,rays:0,phase:0};
 })];
 for(let y=0;y<moonCanvas.height;y++)for(let x=0;x<moonCanvas.width;x++){
  const nx=(x+.5)/moonCanvas.width*2-1,ny=1-(y+.5)/moonCanvas.height*2,r=Math.hypot(nx,ny),at=(y*moonCanvas.width+x)*4;if(r>=1)continue;
  const nz=Math.sqrt(1-r*r),regolith=noise(nx*19+11,ny*19+9,nz*19+5),grain=noise(nx*64+14,ny*64+8,nz*64+10);
  const mareBase=noise(nx*3.6+7,ny*3.6+5,nz*3.6+13);
  const maria=smooth(.32,.72,mareBase*.90+grain*.10);
  const grit=noise(nx*166+5,ny*166+10,nz*166+18);
  let relief=0;
  for(const crater of lunarCraters){
   const dx=(nx-crater.x)/crater.radius,dy=(ny-crater.y)/crater.radius,reach=crater.rays?4.3:1.34;
   if(Math.abs(dx)>reach||Math.abs(dy)>reach)continue;
   const d=Math.hypot(dx,dy);
   if(d<1.34){
    const slope=(dx*-.70+dy*.33)/Math.max(d,.01);
    const rim=Math.exp(-Math.pow((d-.88)/.11,2));
    const basin=Math.exp(-d*d*4.2);
    relief+=rim*(.083+.18*slope)-basin*(.095+.033*Math.max(slope,0));
   }
   if(crater.rays&&d>=.76&&d<reach){
    const angle=Math.atan2(dy,dx)+crater.phase;
    const spokes=Math.pow(Math.max(0,.5*Math.cos(angle*17)+.5*Math.sin(angle*23)),4);
    relief+=spokes*crater.rays*Math.exp(-d*.36)*(1-smooth(2.9,reach,d));
   }
  }
  const daylight=smooth(-.012,.73,nx*-.60+ny*.25+nz*.76);
  const limb=.62+.38*Math.sqrt(nz);
  const brightness=clamp((.555+regolith*.245+grain*.088+grit*.048-maria*.244+relief)*daylight*limb);
  const earthshine=(1-daylight)*(.59+regolith*.24-maria*.18)*limb;
  moonData[at]=clamp(brightness*255+earthshine*21,0,255);
  moonData[at+1]=clamp(brightness*249+earthshine*27,0,255);
  moonData[at+2]=clamp(brightness*232+earthshine*38,0,255);
  moonData[at+3]=(1-smooth(.983,1,r))*255;
 }
 mx.putImageData(moonPixels,0,0);const moonTexture=new T.CanvasTexture(moonCanvas);moonTexture.colorSpace=T.SRGBColorSpace;textures.add(moonTexture);
 const moonMaterial=material(new T.MeshBasicMaterial({map:moonTexture,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,fog:false}));
 const moonDistance=1190,moonSize=moonDistance*Math.tan(moonDiameter*Math.PI/360)*2;
 const moon=new T.Mesh(geometry(new T.PlaneGeometry(moonSize,moonSize)),moonMaterial);moon.position.copy(moonDirection).multiplyScalar(moonDistance);moon.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),moonDirection.clone().negate());moon.name='Gibbous moon with relief and earthshine';moon.renderOrder=-1070;moon.frustumCulled=false;root.add(moon);
 const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=128;const hx=haloCanvas.getContext('2d'),gradient=hx.createRadialGradient(64,64,0,64,64,64);
 gradient.addColorStop(0,'rgba(193,213,239,.19)');gradient.addColorStop(.12,'rgba(173,201,235,.085)');gradient.addColorStop(.43,'rgba(124,163,216,.023)');gradient.addColorStop(1,'rgba(96,137,203,0)');hx.fillStyle=gradient;hx.fillRect(0,0,128,128);
 const haloTexture=new T.CanvasTexture(haloCanvas);haloTexture.colorSpace=T.SRGBColorSpace;textures.add(haloTexture);
 const haloMaterial=material(new T.MeshBasicMaterial({map:haloTexture,transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,fog:false}));
 const halo=new T.Mesh(geometry(new T.PlaneGeometry(moonSize*6.4,moonSize*6.4)),haloMaterial);halo.position.copy(moon.position);halo.quaternion.copy(moon.quaternion);halo.renderOrder=-1080;halo.name='A restrained moon halo';halo.frustumCulled=false;root.add(halo);

 const stardust=origin?createOriginStardust(scene,{mobile,time:timeUniform,passage}):null;
 onChange();
 return{
  root,environmentTexture,moonDirection,
  update(dt,eye,motion){
   if(disposed)return false;
   if(eye&&!root.position.equals(eye)){root.position.copy(eye);dirty=true;}
   const step=Math.max(0,Math.min(Number(dt)||0,.1));
   animated=!!motion;if(animated){time+=step;timeUniform.value=time;dirty=true;}
   const nextPassage=origin&&arrival&&motion?1-smooth(.38,6.2,time):passage.value;
   if(nextPassage!==passage.value){passage.value=nextPassage;dirty=true;}
   if(eye)stardust?.anchor(eye);
   if(plateReady&&plateBlend.value<1){
    const blend=motion?Math.min(1,plateBlend.value+step/1.05):1;
    if(blend!==plateBlend.value){plateBlend.value=blend;dirty=true;}
   }
   const changed=dirty;dirty=false;return changed;
  },
  diagnostics:()=>({
   night:true,skyLoaded:true,textureReady:true,catalogue:'totehm-celestial-sphere',fullSphere:true,
   textureSize:[width,height],milkyWay:true,galacticClouds:'local contrast in photographed star clouds and dark interstellar dust lanes',
   skyMotion:{paintedShear:origin,driftingDust:origin,colourScintillation:origin,stellarScintillation:true},
   dimension:origin?{refraction:true,auroras:true,dustLayers:stardust.depths,parallax:true,pairedVeils:true,passage:+passage.value.toFixed(3)}:null,
   skyGrade:'astrophotographic-night',skyPalette:'black-cobalt-violet-turquoise-gold',
   galacticPlate:{ready:plateReady,failed:plateFailed,blend:plateBlend.value,projection:'full-sphere-astrophotography',
    direction:core.toArray(),normal:normal.toArray(),size:[...SKY_ASTROPHOTOGRAPH.dimensions]},
   astrophotography:{...SKY_ASTROPHOTOGRAPH,ready:plateReady,fallback:!plateReady,local:true},
   brightAnchors:anchors.length,galacticArch:true,galacticNormal:normal.toArray(),stars:starCount,
   stellarDust:tinyStars,stellarProfile:'anti-aliased chromatic cores, individual diffraction and slow scintillation',photographicLocalContrast:true,
   stellarColours:7,time:+time.toFixed(3),animated,moon:true,moonDirection:moonDirection.toArray(),
   moonDiameterDegrees:moonDiameter,lunarCraters:lunarCraters.length,lunarRelief:true,
   comet:false,shootingStars:0,meteor:false,meteorRibbon:false,meteorTriangles:0,externalFiles:0,disposed
  }),
  dispose(){if(disposed)return;disposed=true;stardust?.dispose();credit?.remove();for(const t of textures)t.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();canvas.width=canvas.height=moonCanvas.width=moonCanvas.height=haloCanvas.width=haloCanvas.height=1;root.removeFromParent();root.clear();}
 };
}
