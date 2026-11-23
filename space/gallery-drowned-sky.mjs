import * as T from './vendor/three-0.180.0.mjs';

const SKY_PAINTING='/assets/gallery/sky/painted-nebula.jpg';

// One celestial sphere serves Lisbon, New York and Origins. Its procedural
// environment lights the scenery as the painted night sky loads.
export function createDrownedSky(scene,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='TOTEHM — the common celestial sphere';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set();
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 let time=0,disposed=false,dirty=true,animated=false,plateReady=false,plateFailed=false;
 const plateBlend={value:0};
 const painting=typeof document.createElementNS==='function'?new T.TextureLoader().load(SKY_PAINTING,()=>{
  if(disposed)return;
  plateReady=true;dirty=true;onChange();
 },undefined,()=>{
  if(disposed)return;
  plateFailed=true;dirty=true;onChange();
 }):null;
 if(painting){
  painting.colorSpace=T.SRGBColorSpace;painting.anisotropy=4;textures.add(painting);
 }
 let seed=0x4e494748;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
 // A low celestial arch stays visible from both ocean panoramas as well as
 // the entrance: its pearly centre rises above the three independent doors.
 const normal=new T.Vector3(.05,.88,.47).normalize();
 const core=new T.Vector3(-.2,.53,-.824);core.addScaledVector(normal,-core.dot(normal)).normalize();
 const tangent=new T.Vector3().crossVectors(normal,core).normalize();
 const plateNormal=new T.Vector3(.365,.87,.35).normalize();
 const plateCore=new T.Vector3(-.36,.45,-.82);
 plateCore.addScaledVector(plateNormal,-plateCore.dot(plateNormal)).normalize();
 const plateLongitude=new T.Vector3().crossVectors(plateNormal,plateCore).normalize();
 const moonDirection=new T.Vector3(.38,.43,-.82).normalize(),moonDiameter=1.5;
 const companionDirection=new T.Vector3(-.62,.198,-.88).normalize();
 const companionEast=new T.Vector3().crossVectors(new T.Vector3(0,1,0),companionDirection).normalize().applyAxisAngle(companionDirection,.52);
 const companionNorth=new T.Vector3().crossVectors(companionDirection,companionEast);
 const nebulaDirection=new T.Vector3(.32,.23,-.93).normalize();
 const nebulaEast=new T.Vector3().crossVectors(nebulaDirection,new T.Vector3(0,1,0)).normalize();
 const nebulaNorth=new T.Vector3().crossVectors(nebulaEast,nebulaDirection);
 const nebulaExtent=new T.Vector2(.64,.46),paintingExtent=new T.Vector2(1.04,.49);
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
   // A small inclined spiral, off the main band. Its dark lanes separate
   // individual arms from the central bulge at the same fixed sky coordinates.
   const towardsCompanion=dx*companionDirection.x+dy*companionDirection.y+dz*companionDirection.z;
   if(towardsCompanion>.996){
    const u=34*(dx*companionEast.x+dy*companionEast.y+dz*companionEast.z);
    const v=76*(dx*companionNorth.x+dy*companionNorth.y+dz*companionNorth.z);
    const radial=u*u+v*v;
    if(radial<7){
     const turn=Math.atan2(v,u)-2.40*Math.log1p(radial);
     const curl=.5+.5*Math.cos(turn*2.0);
     const texture=noise(u*4.2+11,v*4.2+13,6.1);
     const edge=1-smooth(2.7,7,radial),bulge=Math.exp(-radial*10);
     const haze=Math.exp(-radial*1.2),arms=haze*Math.pow(curl,3)*(.43+texture*.57);
     r+=edge*(97*bulge+38*arms+13*haze);
     g+=edge*(82*bulge+47*arms+15*haze);
     b+=edge*(65*bulge+66*arms+22*haze);
    }
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
 // Bake the emission and foreground dust into a directional layer for the visible sky.
 // The shared environment map still supplies the scene's reflections and lighting.
 const cloudWidth=mobile?384:768,cloudHeight=mobile?256:512;
 const cloudPixels=new Uint8Array(cloudWidth*cloudHeight*4);
 for(let row=0;row<cloudHeight;row++){
  const v=(row+.5)*2/cloudHeight-1;
  for(let col=0;col<cloudWidth;col++){
   const u=(col+.5)*2/cloudWidth-1,i=(row*cloudWidth+col)*4;
   const limit=1-smooth(.66,.98,Math.max(Math.abs(u),Math.abs(v)));
   if(limit<=0)continue;
   const coarse=noise(u*2.6+20,v*2.6+10,8.2);
   const warp=noise(u*5.1+18,v*5.1+14,4.3);
   const x=u+(coarse-.5)*.32,y=v+(warp-.5)*.24;
   const folds=noise(x*8.8+12,y*10.3+16,2.7);
   const detail=noise(x*19+10,y*22+13,7.9);
   const grain=noise(x*56+11,y*51+7,9.1);
   const density=smooth(.23,.77,.46*coarse+.31*folds+.16*detail+.07*grain);
   const outline=.13+.32*Math.sin(2.7*x-.12)-.16*x*x+(folds-.5)*.18;
   const broad=Math.exp(-Math.pow((x+.04)/.81,2)-Math.pow((y-.02)/.64,2));
   const sculpted=Math.exp(-Math.pow((y-outline)/(.095+.12*coarse),2));
   const lower=Math.exp(-Math.pow((y+.37-.17*Math.sin(3.2*x+.28))/.23,2));
   const cavity=Math.exp(-Math.pow((x-.08)/.46,2)-Math.pow((y+.05-(folds-.5)*.23)/.16,2));
   const dust=density*cavity*smooth(.26,.71,.48*warp+.38*folds+.14*grain);
   // A torn, painted arc of cool dust with fine warm edges.
   const arcX=(x-.13)*.95,arcY=(y-.09)*1.22,angle=Math.atan2(arcY,arcX);
   const radius=Math.hypot(arcX,arcY),ridge=.45+.053*Math.sin(angle*3+.6)+.038*Math.cos(angle*5)+(detail-.5)*.061;
   const threads=Math.exp(-Math.pow((radius-ridge)/(.022+.013*folds),2));
   const bits=smooth(.30,.76,folds*.57+detail*.31+grain*.12);
   const openArc=smooth(.10,.74,.5+.5*Math.sin(angle*2-.67))*(.25+.75*bits);
   const leaf=Math.exp(-Math.pow((radius-ridge+.075+.029*Math.sin(angle*4))/.061,2));
   const cobalt=broad*bits*(.035+.22*lower+.23*sculpted)+leaf*openArc*.62;
   const gold=threads*openArc*smooth(.21,.67,warp*.66+detail*.34);
   const touch=threads*openArc*(1-smooth(.18,.66,warp));
   cloudPixels[i]=Math.round(clamp(limit*(cobalt*61+gold*224+touch*53),0,255));
   cloudPixels[i+1]=Math.round(clamp(limit*(cobalt*109+gold*153+touch*96),0,255));
   cloudPixels[i+2]=Math.round(clamp(limit*(cobalt*212+gold*59+touch*184),0,255));
   cloudPixels[i+3]=Math.round(limit*broad*dust*162);
  }
 }
 const nebulaTexture=new T.DataTexture(cloudPixels,cloudWidth,cloudHeight,T.RGBAFormat,T.UnsignedByteType);
 nebulaTexture.colorSpace=T.SRGBColorSpace;nebulaTexture.generateMipmaps=true;nebulaTexture.minFilter=T.LinearMipmapLinearFilter;nebulaTexture.magFilter=T.LinearFilter;nebulaTexture.needsUpdate=true;textures.add(nebulaTexture);

 const timeUniform={value:0},pixelRatio={value:Math.min(globalThis.devicePixelRatio||1,1.5)};
 const skyMaterial=material(new T.ShaderMaterial({uniforms:{
  uMap:{value:environmentTexture},uPainting:{value:painting??environmentTexture},uPaintingBlend:plateBlend,
  uPaintingExtent:{value:paintingExtent},uNebula:{value:nebulaTexture},uNebulaExtent:{value:nebulaExtent},
  uMoonDirection:{value:moonDirection},uDirection:{value:nebulaDirection},uEast:{value:nebulaEast},
  uNorth:{value:nebulaNorth},uTime:timeUniform
 },side:T.BackSide,depthWrite:false,depthTest:false,fog:false,toneMapped:false,
  vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 vDirection;
   uniform sampler2D uMap,uNebula,uPainting;
   uniform float uTime,uPaintingBlend;
   uniform vec3 uDirection,uEast,uNorth,uMoonDirection;
   uniform vec2 uNebulaExtent,uPaintingExtent;

   vec2 movePigment(vec2 uv,float rim){
    // Local shear and circulation preserve the painted silhouette and the black border.
    vec2 p=uv-vec2(.597,.562);
    vec2 radial=p*vec2(1.42,.94);
    float depth=exp(-dot(radial,radial)*21.);
    float curl=.062*sin(uTime*.081+dot(p,vec2(7.,-11.)))+.020*sin(uTime*.139-p.y*13.);
    vec2 tides=vec2(sin(p.y*19.+p.x*6.-uTime*.101),cos(p.x*17.-p.y*9.+uTime*.076));
    return uv+rim*(vec2(-p.y,p.x)*(curl*depth)+tides*vec2(.0034,.0049));
   }
   void main(){
    vec3 d=normalize(vDirection);
    vec2 uv=vec2(atan(d.z,d.x)*.159154943+.5,asin(clamp(d.y,-1.,1.))*.318309886+.5);
    vec2 du=dFdx(uv),dv=dFdy(uv);du.x-=floor(du.x+.5);dv.x-=floor(dv.x+.5);
    vec3 distant=textureGrad(uMap,uv,du,dv).rgb;
    vec3 ink=vec3(.00041,.00056,.00092)+distant*mix(.029,.006,uPaintingBlend);
    float ahead=dot(d,uDirection);
    vec2 centre=vec2(dot(d,uEast),dot(d,uNorth))/max(.49,ahead);
    vec2 paintedUV=.5+centre*(.5/uPaintingExtent);
    float rim=1.-smoothstep(.73,1.,2.*max(abs(paintedUV.x-.5),abs(paintedUV.y-.5)));
    vec2 pigmentUV=paintedUV;
    if(uPaintingBlend>0.&&rim>0.)pigmentUV=movePigment(paintedUV,rim);
    vec2 paintedDX=dFdx(pigmentUV),paintedDY=dFdy(pigmentUV);
    vec2 proceduralUV=.5+centre*(.5/uNebulaExtent);
    proceduralUV+=.005*vec2(sin(uTime*.073+centre.y*15.),cos(uTime*.098-centre.x*11.));
    vec2 proceduralDX=dFdx(proceduralUV),proceduralDY=dFdy(proceduralUV);
    float moonSpace=1.-.46*smoothstep(.992,.99955,dot(d,uMoonDirection));
    if(ahead>.49){
     if(uPaintingBlend>0.&&rim>0.){
      vec3 pigment=textureGrad(uPainting,pigmentUV,paintedDX,paintedDY).rgb;
      float brightness=dot(pigment,vec3(.2126,.7152,.0722));
      float stroke=smoothstep(.002,.043,brightness);
      float gold=smoothstep(.0025,.057,pigment.r-pigment.b);
      float cyan=smoothstep(.001,.027,pigment.g-pigment.r)*stroke;
      // Only the already painted seams catch the traveling light.
      float shimmer=.5+.5*sin(dot(pigmentUV,vec2(68.,-87.))+uTime*.55+sin(pigmentUV.y*30.));
      vec3 glaze=pigment*(.75+.29*stroke)/(1.+.45*brightness);
      glaze*=mix(vec3(.97,1.01,1.06),vec3(1.10,1.035,.965),gold);
      glaze*=1.+shimmer*(.15*gold+.052*cyan);
      ink=mix(ink,glaze*moonSpace,uPaintingBlend*rim*.97);
     }
     if(all(greaterThan(proceduralUV,vec2(0.)))&&all(lessThan(proceduralUV,vec2(1.)))){
      vec4 dust=textureGrad(uNebula,proceduralUV,proceduralDX,proceduralDY);
      float grain=uPaintingBlend*.19*dust.a;
      ink=ink*(1.-grain)+dust.rgb*mix(.095,.019,uPaintingBlend)*moonSpace;
     }
    }
    gl_FragColor=vec4(ink,1.);
    #include <colorspace_fragment>
   }`
 }));
 const dome=new T.Mesh(geometry(new T.SphereGeometry(1250,48,24)),skyMaterial);dome.name='Milky Way and interstellar dust';dome.renderOrder=-1200;dome.frustumCulled=false;root.add(dome);

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
  sizes[i]=navigation?18+bright*5:1.09+bright*10.8;
  phases[i]=random()*Math.PI*2;intensities[i]=.14+bright*1.49;
 }
 const starGeometry=geometry(new T.BufferGeometry());starGeometry.setAttribute('position',new T.BufferAttribute(positions,3));starGeometry.setAttribute('aColour',new T.BufferAttribute(colours,3));starGeometry.setAttribute('aSize',new T.BufferAttribute(sizes,1));starGeometry.setAttribute('aPhase',new T.BufferAttribute(phases,1));starGeometry.setAttribute('aIntensity',new T.BufferAttribute(intensities,1));starGeometry.setAttribute('aAnchor',new T.BufferAttribute(anchorsStrength,1));

 const starMaterial=material(new T.ShaderMaterial({uniforms:{uTime:timeUniform,uPixelRatio:pixelRatio},transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,fog:false,
  vertexShader:`attribute vec3 aColour;attribute float aSize,aPhase,aIntensity,aAnchor;uniform float uTime,uPixelRatio;varying vec3 vColour;varying float vIntensity,vGlint,vAnchor;
   void main(){vAnchor=aAnchor;float low=1.-clamp(position.y/1220.,0.,1.);
    float shimmer=mix(.055+.122*low*low,.10,aAnchor);
    float twinkle=sin(aPhase+uTime*(.31+.12*sin(aPhase)))*.55+sin(aPhase*2.7+uTime*.89)*.31+sin(aPhase*6.1+uTime*1.4)*.14;
    float glint=smoothstep(1.5,6.2,aSize);
    float fleck=pow(max(0.,sin(aPhase*9.17+uTime*(.33+.18*sin(aPhase*2.1)))),9.);
    float temperature=sin(aPhase*4.3+uTime*.74)*glint*(.016+.025*low);
    vColour=clamp(aColour*vec3(1.+temperature,1.,1.-temperature),0.,1.);
    vIntensity=aIntensity*(1.-shimmer+shimmer*twinkle+.13*glint*fleck);
    vGlint=glint;
    gl_PointSize=aSize*uPixelRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 vColour;varying float vIntensity,vGlint,vAnchor;
   void main(){vec2 p=gl_PointCoord-.5;float r=length(p);if(r>.5)discard;float rr=r*r;
    float core=exp(-rr*mix(mix(31.,290.,vGlint),530.,vAnchor));
    float halo=exp(-rr*17.)*(.019+vGlint*.051+vAnchor*.064)*(1.-smoothstep(.30,.50,r));
    vec2 spike=abs(mat2(.995,.10,-.10,.995)*p);
    float arms=(exp(-spike.x*132.-spike.y*9.)+exp(-spike.y*132.-spike.x*9.))*(.025*vGlint+.20*vAnchor);
    float opacity=(core*.96+halo+arms)*vIntensity;
    vec3 light=mix(vColour,vec3(1.,.986,.97),smoothstep(.22,.85,core)*(.56+.33*vAnchor));
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
 const lunarCraters=[...rayCraters,...Array.from({length:34},()=>{
  const theta=random()*Math.PI*2,r=Math.sqrt(random())*.91;
  return {x:Math.cos(theta)*r,y:Math.sin(theta)*r,radius:.022+Math.pow(random(),2)*.09,rays:0,phase:0};
 })];
 for(let y=0;y<moonCanvas.height;y++)for(let x=0;x<moonCanvas.width;x++){
  const nx=(x+.5)/moonCanvas.width*2-1,ny=1-(y+.5)/moonCanvas.height*2,r=Math.hypot(nx,ny),at=(y*moonCanvas.width+x)*4;if(r>=1)continue;
  const nz=Math.sqrt(1-r*r),regolith=noise(nx*19+11,ny*19+9,nz*19+5),grain=noise(nx*64+14,ny*64+8,nz*64+10);
  const maria=smooth(.33,.71,noise(nx*3.6+7,ny*3.6+5,nz*3.6+13));
  let relief=0;
  for(const crater of lunarCraters){
   const dx=(nx-crater.x)/crater.radius,dy=(ny-crater.y)/crater.radius,reach=crater.rays?4.3:1.34;
   if(Math.abs(dx)>reach||Math.abs(dy)>reach)continue;
   const d=Math.hypot(dx,dy);
   if(d<1.34){
    const slope=(dx*-.70+dy*.33)/Math.max(d,.01);
    const rim=Math.exp(-Math.pow((d-.88)/.11,2));
    const basin=Math.exp(-d*d*4.2);
    relief+=rim*(.088+.14*slope)-basin*.104;
   }
   if(crater.rays&&d>=.76&&d<reach){
    const angle=Math.atan2(dy,dx)+crater.phase;
    const spokes=Math.pow(Math.max(0,.5*Math.cos(angle*17)+.5*Math.sin(angle*23)),4);
    relief+=spokes*crater.rays*Math.exp(-d*.36)*(1-smooth(2.9,reach,d));
   }
  }
  const daylight=smooth(-.012,.73,nx*-.60+ny*.25+nz*.76);
  const limb=.62+.38*Math.sqrt(nz);
  const brightness=clamp((.58+regolith*.24+grain*.096-maria*.23+relief)*daylight*limb);
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

 const meteorSegments=32,meteorTrail=new Float32Array(meteorSegments*2*3),meteorAges=new Float32Array(meteorSegments*2),meteorSides=new Float32Array(meteorSegments*2),meteorIndices=[];
 for(let i=0;i<meteorSegments;i++){
  meteorAges[i*2]=meteorAges[i*2+1]=i/(meteorSegments-1);meteorSides[i*2]=-1;meteorSides[i*2+1]=1;
  if(i<meteorSegments-1){const v=i*2;meteorIndices.push(v,v+2,v+1,v+1,v+2,v+3);}
 }
 const meteorGeometry=geometry(new T.BufferGeometry());meteorGeometry.setAttribute('position',new T.BufferAttribute(meteorTrail,3));meteorGeometry.setAttribute('aAge',new T.BufferAttribute(meteorAges,1));meteorGeometry.setAttribute('aSide',new T.BufferAttribute(meteorSides,1));meteorGeometry.setIndex(meteorIndices);
 function createMeteor(start,finish,period,offset,duration,tint=0x7ba7ed){
  const meteorMaterial=material(new T.ShaderMaterial({uniforms:{uTime:timeUniform,uStart:{value:new T.Vector3(...start).normalize()},uEnd:{value:new T.Vector3(...finish).normalize()},uPeriod:{value:period},uOffset:{value:offset},uDuration:{value:duration},uTint:{value:new T.Color(tint)}},side:T.DoubleSide,transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,fog:false,
   vertexShader:`attribute float aAge,aSide;uniform float uTime,uPeriod,uOffset,uDuration;uniform vec3 uStart,uEnd;varying float vAlpha,vAge,vAcross;
    // CELESTIAL_METEOR_RIBBON: a tapered optical trail with a compact white head.
    void main(){float cycle=mod(uTime+uOffset,uPeriod);float p=cycle/uDuration;float head=p-aAge*.17;vec3 start=uStart,finish=uEnd;vec3 direction=normalize(mix(start,finish,clamp(head,0.,1.)));vec3 side=normalize(cross(direction,finish-start));float width=.23+pow(1.-aAge,1.9)*2.05;vAge=aAge;vAcross=aSide;vAlpha=exp(-aAge*4.5)*smoothstep(0.,.13,p)*(1.-smoothstep(.85,1.12,p));if(head<0.||head>1.)vAlpha=0.;gl_Position=projectionMatrix*modelViewMatrix*vec4(direction*1200.+side*aSide*width,1.);}`,
   fragmentShader:`varying float vAlpha,vAge,vAcross;uniform vec3 uTint;
    void main(){float crossSection=vAcross*vAcross,tip=exp(-vAge*vAge*290.);
     float core=exp(-crossSection*6.)*(.63+.34*tip);
     float wake=exp(-crossSection*2.)*.24*(1.-smoothstep(.63,1.,abs(vAcross)));
     vec3 colour=mix(uTint,vec3(1.,.97,.92),pow(1.-vAge,2.5));
     gl_FragColor=vec4(colour,(core+wake)*vAlpha);
    #include <colorspace_fragment>
   }`
  }));
  const meteor=new T.Mesh(meteorGeometry,meteorMaterial);meteor.name='Shooting star';meteor.renderOrder=-1090;meteor.frustumCulled=false;meteor.visible=false;root.add(meteor);
  return {mesh:meteor,period,offset,duration};
 }
 const meteors=[
  createMeteor([-.57,.46,-.79],[.08,.43,-.91],21,17,1.22),
  createMeteor([.86,.37,-.34],[.38,.2,-.94],33,19,.92),
  createMeteor([-.68,-.25,-.66],[.14,-.48,-.92],49,41,1.18),
  createMeteor([.20,.43,-.88],[.57,.22,-.80],59,52.9,1.24,0xffc18f),
  createMeteor([.25,.38,-.89],[.46,.16,-.90],59,52.1,.84),
  createMeteor([.18,.48,-.88],[.45,.30,-.87],59,51.45,.80,0xa69eff)
 ];
 onChange();
 return{
  root,environmentTexture,moonDirection,
  update(dt,eye,motion){
   if(disposed)return false;
   if(eye&&!root.position.equals(eye)){root.position.copy(eye);dirty=true;}
   const step=Math.max(0,Math.min(Number(dt)||0,.1));
   animated=!!motion;if(animated){time+=step;timeUniform.value=time;dirty=true;}
   if(plateReady&&plateBlend.value<1){
    const blend=motion?Math.min(1,plateBlend.value+step/1.05):1;
    if(blend!==plateBlend.value){plateBlend.value=blend;dirty=true;}
   }
   for(const meteor of meteors){
    const visible=animated&&(time+meteor.offset)%meteor.period<meteor.duration*1.14;
    if(meteor.mesh.visible!==visible){meteor.mesh.visible=visible;dirty=true;}
   }
   const changed=dirty;dirty=false;return changed;
  },
  diagnostics:()=>({night:true,skyLoaded:true,textureReady:true,catalogue:'totehm-celestial-sphere',fullSphere:true,textureSize:[width,height],milkyWay:true,galacticClouds:'painted turquoise and violet with broken golden edges',skyMotion:{paintedShear:true,driftingDust:true,colourScintillation:true},skyGrade:'painted-night',galacticPlate:{ready:plateReady,failed:plateFailed,blend:plateBlend.value,projection:'directional-painting',direction:nebulaDirection.toArray(),extent:paintingExtent.toArray(),size:[1774,887]},companionGalaxy:companionDirection.toArray(),emissionNebula:{direction:nebulaDirection.toArray(),extent:nebulaExtent.toArray(),textureSize:[cloudWidth,cloudHeight]},brightAnchors:anchors.length,galacticArch:true,galacticNormal:normal.toArray(),stars:starCount,stellarDust:tinyStars,stellarProfile:'white cores, restrained halos and anchor-star diffraction',stellarColours:7,time:+time.toFixed(3),animated,moon:true,moonDirection:moonDirection.toArray(),moonDiameterDegrees:moonDiameter,lunarCraters:lunarCraters.length,lunarRelief:true,comet:false,shootingStars:meteors.length,meteor:meteors.some(event=>event.mesh.visible),meteorRibbon:true,meteorTriangles:meteorIndices.length/3,externalFiles:0,disposed}),
  dispose(){if(disposed)return;disposed=true;for(const t of textures)t.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();canvas.width=canvas.height=moonCanvas.width=moonCanvas.height=haloCanvas.width=haloCanvas.height=1;root.removeFromParent();root.clear();}
 };
}
