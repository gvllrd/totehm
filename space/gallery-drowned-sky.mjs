import * as T from './vendor/three-0.180.0.mjs';

// The last sanctuary has no daylight. This celestial sphere is generated once,
// without a network image, and is also the temple's real lighting environment.
export function createDrownedSky(scene,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='The rebirth sky — a quiet Milky Way above the drowned world';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set();
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 let time=0,disposed=false,dirty=true,animated=false;
 let seed=0x4e494748;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
 // A low celestial arch stays visible from both ocean panoramas as well as
 // the entrance: its pearly centre rises above the three independent doors.
 const normal=new T.Vector3(.05,.92,.388).normalize();
 const core=new T.Vector3(-.2,.39,-.899);core.addScaledVector(normal,-core.dot(normal)).normalize();
 const tangent=new T.Vector3().crossVectors(normal,core).normalize();
 const moonDirection=new T.Vector3(.38,.43,-.82).normalize();
 const width=mobile?1024:2048,height=width/2;
 const lattice=new Float32Array(32*32*32);for(let i=0;i<lattice.length;i++)lattice[i]=random();
 function noise(x,y,z){
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=fz*fz*(3-2*fz);
  const at=(a,b,c)=>lattice[(a&31)+((b&31)<<5)+((c&31)<<10)];
  const a=at(ix,iy,iz)*(1-u)+at(ix+1,iy,iz)*u,b=at(ix,iy+1,iz)*(1-u)+at(ix+1,iy+1,iz)*u;
  const c=at(ix,iy,iz+1)*(1-u)+at(ix+1,iy,iz+1)*u,d=at(ix,iy+1,iz+1)*(1-u)+at(ix+1,iy+1,iz+1)*u;
  return (a*(1-v)+b*v)*(1-w)+(c*(1-v)+d*v)*w;
 }

 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d'),pixels=context.createImageData(width,height),data=pixels.data;
 const cosLongitude=new Float32Array(width),sinLongitude=new Float32Array(width);
 for(let x=0;x<width;x++){const longitude=((x+.5)/width-.5)*Math.PI*2;cosLongitude[x]=Math.cos(longitude);sinLongitude[x]=Math.sin(longitude);}
 for(let y=0;y<height;y++){
  const latitude=(.5-(y+.5)/height)*Math.PI,dy=Math.sin(latitude),latitudeCos=Math.cos(latitude);
  const horizon=Math.exp(-Math.abs(dy)*7.5),upper=smooth(-.035,.12,dy);
  for(let x=0;x<width;x++){
   const dx=latitudeCos*cosLongitude[x],dz=latitudeCos*sinLongitude[x],at=(y*width+x)*4;
   let r=1.7+horizon*5.4,g=3.8+horizon*9.4,b=10.5+horizon*16.2;
   const galacticLatitude=dx*normal.x+dy*normal.y+dz*normal.z;
   const along=dx*tangent.x+dy*tangent.y+dz*tangent.z,centre=dx*core.x+dy*core.y+dz*core.z;
   const band=Math.exp(-galacticLatitude*galacticLatitude/.044)*upper;
   if(band>.002){
    // Isotropic noise on the sphere avoids the parallel brush strokes made
    // by stretching a texture along the galactic equator. Domain warping
    // breaks the arms into overlapping, pearly clouds and dark dust islands.
    const low=noise(dx*6+7,dy*6+13,dz*6+9);
    const middle=noise(dx*22+11,dy*22+17,dz*22+5);
    const fine=noise(dx*73+8,dy*73+7,dz*73+16);
    const grains=noise(dx*183+12,dy*183+3,dz*183+19);
    const bulge=Math.exp((centre-1)*7.2);
    const warpedLatitude=galacticLatitude+(low-.5)*.065+(middle-.5)*.018;
    const broad=Math.exp(-Math.pow(warpedLatitude/(.105+bulge*.065),2));
    const inner=Math.exp(-Math.pow((warpedLatitude+.008*Math.sin(along*11))/.055,2));
    const outerArm=Math.exp(-Math.pow((warpedLatitude-.085-.022*Math.sin(along*8))/.035,2));
    const cloud=Math.pow(smooth(.20,.79,low*.43+middle*.33+fine*.18+grains*.06),1.12);
    const riftOffset=.012*Math.sin(along*17)+.009*Math.cos(centre*23)+(middle-.5)*.026;
    const rift=Math.exp(-Math.pow((warpedLatitude-riftOffset)/(.014+fine*.022),2));
    const islands=smooth(.42,.76,middle*.63+fine*.37);
    const dust=1-Math.min(.93,rift*(.51+islands*.32)+islands*.18);
    const wisps=(broad*.39+inner*.61+outerArm*.17)*cloud*dust*upper;
    // Warm crowded core, cool pearly arms, and dark foreground dust. The
    // radiance stays restrained enough that individual stars remain legible.
    const energy=wisps*(58+bulge*118),pearl=.81+fine*.14+grains*.05;
    r+=energy*(.66+bulge*.39)*pearl;
    g+=energy*(.78+bulge*.19)*pearl;
    b+=energy*(1.04-bulge*.22);
    const distantDust=band*(1-dust)*cloud*2.4;r+=distantDust;g+=distantDust*.76;b+=distantDust*.58;
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
  if(i%4===0){dy=random();const radius=Math.sqrt(1-dy*dy);dx=Math.cos(theta)*radius;dz=Math.sin(theta)*radius;}
  if(dy<.025)continue;
  const x=Math.floor((Math.atan2(dz,dx)/(Math.PI*2)+.5)*width)%width,y=Math.floor((.5-Math.asin(clamp(dy,-1,1))/Math.PI)*height);
  const at=(y*width+x)*4,luminance=4+Math.pow(random(),6)*25;
  data[at]=Math.min(255,data[at]+luminance*.88);data[at+1]=Math.min(255,data[at+1]+luminance*.95);data[at+2]=Math.min(255,data[at+2]+luminance);
 }
 context.putImageData(pixels,0,0);
 const environmentTexture=new T.CanvasTexture(canvas);environmentTexture.colorSpace=T.SRGBColorSpace;environmentTexture.mapping=T.EquirectangularReflectionMapping;environmentTexture.wrapS=T.RepeatWrapping;
 environmentTexture.minFilter=T.LinearMipmapLinearFilter;environmentTexture.magFilter=T.LinearFilter;textures.add(environmentTexture);
 const spaceUniform={value:0};
 const skyMaterial=material(new T.ShaderMaterial({uniforms:{uMap:{value:environmentTexture},uSpace:spaceUniform},side:T.BackSide,depthWrite:false,depthTest:false,fog:false,toneMapped:false,
  vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 vDirection;uniform sampler2D uMap;uniform float uSpace;
   vec3 celestialColour(vec3 d){vec2 uv=vec2(atan(d.z,d.x)*.159154943+.5,asin(clamp(d.y,-1.,1.))*.318309886+.5);
    // Keep the longitude seam from selecting a dark, oversized mip level.
    vec2 du=dFdx(uv),dv=dFdy(uv);du.x-=floor(du.x+.5);dv.x-=floor(dv.x+.5);vec3 sky=textureGrad(uMap,uv,du,dv).rgb;
    float horizon=exp(-abs(d.y)*7.5),airglow=exp(-pow((d.y-.047)/.065,2.))*smoothstep(-.035,.12,d.y);
    vec3 air=(vec3(1.7,3.8,10.5)+horizon*vec3(5.4,9.4,16.2)+airglow*vec3(.8,2.1,1.6))/255.;
    vec3 linearAir=mix(air/12.92,pow((air+.055)/1.055,vec3(2.4)),step(vec3(.04045),air));
    return max(vec3(0.),sky-linearAir*uSpace);}
   void main(){vec3 d=normalize(vDirection),sky=celestialColour(d);
    if(d.y<0.&&uSpace>0.){vec3 lower=vec3(d.x,-d.y,d.z);float bend=1.11*smoothstep(.08,.85,-d.y),c=cos(bend),s=sin(bend);lower=vec3(lower.x,lower.y*c+lower.z*s,-lower.y*s+lower.z*c);sky=mix(sky,celestialColour(lower),uSpace*smoothstep(0.,.18,-d.y));}
    gl_FragColor=vec4(sky,1.);
    #include <colorspace_fragment>
   }`
 }));
 const dome=new T.Mesh(geometry(new T.SphereGeometry(1250,48,24)),skyMaterial);dome.name='Milky Way and interstellar dust';dome.renderOrder=-1200;dome.frustumCulled=false;root.add(dome);

 const starCount=mobile?8500:18000,positions=new Float32Array(starCount*3),colours=new Float32Array(starCount*3),sizes=new Float32Array(starCount),phases=new Float32Array(starCount),intensities=new Float32Array(starCount);
 const colour=new T.Color();
 for(let i=0;i<starCount;i++){
  let direction;
  if(i<starCount*.43){
   const longitude=random()*Math.PI*2,latitude=(random()+random()+random()-1.5)*.065;
   direction=new T.Vector3().copy(core).multiplyScalar(Math.cos(longitude)).addScaledVector(tangent,Math.sin(longitude)).multiplyScalar(Math.cos(latitude)).addScaledVector(normal,Math.sin(latitude));
   if(direction.y<.035)direction.negate();
  }else{
   const dy=.025+random()*.975,phi=random()*Math.PI*2,r=Math.sqrt(1-dy*dy);direction=new T.Vector3(Math.cos(phi)*r,dy,Math.sin(phi)*r);
  }
  positions.set(direction.multiplyScalar(1220).toArray(),i*3);
  const bright=Math.pow(random(),9),temperature=random();
  colour.setHex(temperature<.12?0xffd4a2:temperature<.32?0xfff0cf:temperature<.76?0xe3edff:0xaecbff);
  colours.set(colour.toArray(),i*3);sizes[i]=.88+bright*3.5;phases[i]=random()*Math.PI*2;intensities[i]=.27+bright*.86;
 }
 const starGeometry=geometry(new T.BufferGeometry());starGeometry.setAttribute('position',new T.BufferAttribute(positions,3));starGeometry.setAttribute('aColour',new T.BufferAttribute(colours,3));starGeometry.setAttribute('aSize',new T.BufferAttribute(sizes,1));starGeometry.setAttribute('aPhase',new T.BufferAttribute(phases,1));starGeometry.setAttribute('aIntensity',new T.BufferAttribute(intensities,1));
 const timeUniform={value:0},pixelRatio={value:Math.min(globalThis.devicePixelRatio||1,1.5)};
 const starMaterial=material(new T.ShaderMaterial({uniforms:{uTime:timeUniform,uPixelRatio:pixelRatio},transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,fog:false,
  vertexShader:`attribute vec3 aColour;attribute float aSize,aPhase,aIntensity;uniform float uTime,uPixelRatio;varying vec3 vColour;varying float vIntensity,vGlint;
   void main(){vColour=aColour;float lowAltitude=1.-clamp(position.y/1220.,0.,1.);float shimmer=.035+.105*lowAltitude*lowAltitude;vIntensity=aIntensity*(1.-shimmer+shimmer*sin(aPhase+uTime*(.21+.13*sin(aPhase))));vGlint=smoothstep(3.2,4.4,aSize);gl_PointSize=aSize*uPixelRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 vColour;varying float vIntensity,vGlint;
   void main(){vec2 p=gl_PointCoord-.5;float r=length(p);float light=exp(-r*r*22.);float glint=exp(-abs(p.x)*58.)*exp(-abs(p.y)*9.)+exp(-abs(p.y)*58.)*exp(-abs(p.x)*9.);float alpha=(light*.79+(1.-smoothstep(.015,.17,r))*.21+glint*vGlint*.065)*vIntensity;if(r>.5)discard;gl_FragColor=vec4(vColour,alpha);
    #include <colorspace_fragment>
   }`
 }));
 const stars=new T.Points(starGeometry,starMaterial);stars.name='Fine stellar light — warm giants and blue distant stars';stars.renderOrder=-1100;stars.frustumCulled=false;root.add(stars);

 // The ocean hides the lower celestial hemisphere at ground level. Once
 // above it, distant stars also surround the world below the visitor. Their
 // true depth remains behind the entire globe, rather than over its surface.
 const deepStarMaterial=material(new T.ShaderMaterial({uniforms:{uTime:timeUniform,uPixelRatio:pixelRatio,uDeepStarOpacity:spaceUniform},transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,fog:false,
  vertexShader:starMaterial.vertexShader.replace('uniform float uTime,uPixelRatio;','uniform float uTime,uPixelRatio,uDeepStarOpacity;').replace('vIntensity=aIntensity*','vIntensity=uDeepStarOpacity*aIntensity*'),fragmentShader:starMaterial.fragmentShader
 }));
 const deepStars=new T.Points(starGeometry,deepStarMaterial);deepStars.name='The distant stellar hemisphere beneath the world';deepStars.scale.set(56000/1220,-56000/1220,56000/1220);deepStars.renderOrder=-1100;deepStars.frustumCulled=false;deepStars.visible=false;root.add(deepStars);

 // A second, finite field lets a high jump pass among stellar light. Each
 // point has a fixed world position; a toroidal boundary renews only the
 // invisible outer volume. Camera movement supplies all of the parallax,
 // without a rain emitter, speed lines, or a second animation clock.
 const nearStarCount=mobile?600:1300,nearDustCount=mobile?120:300,nearCount=nearStarCount+nearDustCount;
 const nearPositions=new Float32Array(nearCount*3),nearColours=new Float32Array(nearCount*3),nearSizes=new Float32Array(nearCount),nearIntensities=new Float32Array(nearCount),nearKinds=new Float32Array(nearCount);
 const celestialSeed=seed;
 for(let i=0;i<nearCount;i++){
  nearPositions[i*3]=(random()-.5)*1800;nearPositions[i*3+1]=(random()-.5)*1800;nearPositions[i*3+2]=(random()-.5)*1800;
  const dust=i>=nearStarCount,bright=Math.pow(random(),5),temperature=random();
  colour.setHex(dust?0x91a8d4:temperature<.075?0xffead7:temperature<.7?0xe8f0ff:0xc2d9ff);nearColours.set(colour.toArray(),i*3);
  nearSizes[i]=dust?8+random()*12:1.5+bright*2.8;nearIntensities[i]=dust?.014+random()*.018:.5+bright*.85;nearKinds[i]=dust?1:0;
 }
 // Keep the original moon and all ground-level celestial detail identical.
 seed=celestialSeed;
 const nearGeometry=geometry(new T.BufferGeometry());nearGeometry.setAttribute('position',new T.BufferAttribute(nearPositions,3));nearGeometry.setAttribute('aNearColour',new T.BufferAttribute(nearColours,3));nearGeometry.setAttribute('aNearSize',new T.BufferAttribute(nearSizes,1));nearGeometry.setAttribute('aNearIntensity',new T.BufferAttribute(nearIntensities,1));nearGeometry.setAttribute('aNearKind',new T.BufferAttribute(nearKinds,1));
 const nearOpacity={value:0},stellarEye={value:new T.Vector3()};
 const nearMaterial=material(new T.ShaderMaterial({uniforms:{uNearStarOpacity:nearOpacity,uStellarEye:stellarEye,uPixelRatio:pixelRatio},transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,fog:false,
  vertexShader:`attribute vec3 aNearColour;attribute float aNearSize,aNearIntensity,aNearKind;uniform vec3 uStellarEye;uniform float uNearStarOpacity,uPixelRatio;varying vec3 vNearColour;varying float vNearIntensity,vNearKind;
   void main(){vec3 local=mod(position-uStellarEye+vec3(900.),vec3(1800.))-vec3(900.);float distanceToEye=length(local);
    float envelope=smoothstep(65.,110.,distanceToEye)*(1.-smoothstep(720.,900.,distanceToEye));
    vNearColour=aNearColour;vNearKind=aNearKind;vNearIntensity=aNearIntensity*envelope*uNearStarOpacity;
    float perspective=clamp(310./max(distanceToEye,65.),.75,2.);gl_PointSize=aNearSize*perspective*uPixelRatio;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(local,1.);}`,
  fragmentShader:`varying vec3 vNearColour;varying float vNearIntensity,vNearKind;
   void main(){vec2 p=gl_PointCoord-.5;float r=length(p);if(r>.5)discard;float light=mix(exp(-r*r*26.),exp(-r*r*12.)*(1.-smoothstep(.28,.5,r)),vNearKind);gl_FragColor=vec4(vNearColour,light*vNearIntensity);
    #include <colorspace_fragment>
   }`
 }));
 const nearStars=new T.Points(nearGeometry,nearMaterial);nearStars.name='Nearby stellar light and soft interstellar dust';nearStars.renderOrder=-1060;nearStars.frustumCulled=false;nearStars.visible=false;root.add(nearStars);

 const moonCanvas=document.createElement('canvas');moonCanvas.width=moonCanvas.height=mobile?256:512;
 const mx=moonCanvas.getContext('2d'),moonPixels=mx.createImageData(moonCanvas.width,moonCanvas.height),moonData=moonPixels.data;
 const lunarCraters=Array.from({length:34},()=>{const theta=random()*Math.PI*2,r=Math.sqrt(random())*.91;return{x:Math.cos(theta)*r,y:Math.sin(theta)*r,radius:.022+Math.pow(random(),2)*.09};});
 for(let y=0;y<moonCanvas.height;y++)for(let x=0;x<moonCanvas.width;x++){
  const nx=(x+.5)/moonCanvas.width*2-1,ny=1-(y+.5)/moonCanvas.height*2,r=Math.hypot(nx,ny),at=(y*moonCanvas.width+x)*4;if(r>=1)continue;
  const nz=Math.sqrt(1-r*r),grain=noise(nx*14+11,ny*14+9,nz*14+5),maria=smooth(.38,.68,noise(nx*3+7,ny*3+5,nz*3+13));
  let craters=0;
  for(const crater of lunarCraters){const dx=nx-crater.x,dy=ny-crater.y;if(Math.abs(dx)>crater.radius*1.4||Math.abs(dy)>crater.radius*1.4)continue;const d=Math.hypot(dx,dy)/crater.radius;craters+=Math.exp(-Math.pow((d-.89)/.14,2))*.095-Math.exp(-d*d*4)*.078;}
  const illumination=Math.max(0,nx*-.52+ny*.24+nz*.82),brightness=(.57+grain*.36-maria*.19+craters)*(.13+illumination*.87);
  moonData[at]=clamp(brightness*255+7,0,255);moonData[at+1]=clamp(brightness*250+8,0,255);moonData[at+2]=clamp(brightness*237+11,0,255);moonData[at+3]=(1-smooth(.983,1,r))*255;
 }
 mx.putImageData(moonPixels,0,0);const moonTexture=new T.CanvasTexture(moonCanvas);moonTexture.colorSpace=T.SRGBColorSpace;textures.add(moonTexture);
 const moonMaterial=material(new T.MeshBasicMaterial({map:moonTexture,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,fog:false}));
 const moonDistance=1190,moonSize=moonDistance*Math.tan(.52*Math.PI/180)*2;
 const moon=new T.Mesh(geometry(new T.PlaneGeometry(moonSize,moonSize)),moonMaterial);moon.position.copy(moonDirection).multiplyScalar(moonDistance);moon.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),moonDirection.clone().negate());moon.name='A small silver gibbous moon';moon.renderOrder=-1070;moon.frustumCulled=false;root.add(moon);
 const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=128;const hx=haloCanvas.getContext('2d'),gradient=hx.createRadialGradient(64,64,0,64,64,64);
 gradient.addColorStop(0,'rgba(193,213,239,.19)');gradient.addColorStop(.12,'rgba(173,201,235,.085)');gradient.addColorStop(.43,'rgba(124,163,216,.023)');gradient.addColorStop(1,'rgba(96,137,203,0)');hx.fillStyle=gradient;hx.fillRect(0,0,128,128);
 const haloTexture=new T.CanvasTexture(haloCanvas);haloTexture.colorSpace=T.SRGBColorSpace;textures.add(haloTexture);
 const haloMaterial=material(new T.MeshBasicMaterial({map:haloTexture,transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,fog:false}));
 const halo=new T.Mesh(geometry(new T.PlaneGeometry(moonSize*9,moonSize*9)),haloMaterial);halo.position.copy(moon.position);halo.quaternion.copy(moon.quaternion);halo.renderOrder=-1080;halo.name='A restrained moon halo';halo.frustumCulled=false;root.add(halo);

 const meteorTrail=new Float32Array(32*3),meteorAges=new Float32Array(32);for(let i=0;i<32;i++)meteorAges[i]=i/31;
 const meteorGeometry=geometry(new T.BufferGeometry());meteorGeometry.setAttribute('position',new T.BufferAttribute(meteorTrail,3));meteorGeometry.setAttribute('aAge',new T.BufferAttribute(meteorAges,1));
 const meteorMaterial=material(new T.ShaderMaterial({uniforms:{uTime:timeUniform},transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,fog:false,
  vertexShader:`attribute float aAge;uniform float uTime;varying float vAlpha;
   void main(){float cycle=mod(uTime+37.,53.);float p=cycle/1.35;float head=p-aAge*.17;vec3 direction=normalize(mix(normalize(vec3(-.46,.64,-.61)),normalize(vec3(.12,.44,-.89)),clamp(head,0.,1.)));vAlpha=exp(-aAge*5.)*smoothstep(0.,.13,p)*(1.-smoothstep(.82,1.12,p));if(head<0.||head>1.)vAlpha=0.;gl_Position=projectionMatrix*modelViewMatrix*vec4(direction*1200.,1.);}`,
  fragmentShader:'varying float vAlpha;void main(){gl_FragColor=vec4(.62,.77,1.,vAlpha*.62);}'
 }));
 const meteor=new T.Line(meteorGeometry,meteorMaterial);meteor.name='A rare, silent falling star';meteor.renderOrder=-1090;meteor.frustumCulled=false;root.add(meteor);
 onChange();
 return{
  root,environmentTexture,moonDirection,
  update(dt,eye,motion){
   if(disposed)return false;
   if(eye&&!root.position.equals(eye)){root.position.copy(eye);dirty=true;}
   if(eye){
    stellarEye.value.copy(eye);
    const opacity=smooth(350,2500,eye.y);
    if(nearOpacity.value!==opacity){nearOpacity.value=spaceUniform.value=opacity;nearStars.visible=deepStars.visible=opacity>0;haloMaterial.opacity=1-opacity*.72;dirty=true;}
   }
   animated=!!motion;if(animated){time+=Math.max(0,Math.min(Number(dt)||0,.1));timeUniform.value=time;dirty=true;}
   const changed=dirty;dirty=false;return changed;
  },
  diagnostics:()=>({night:true,skyLoaded:true,textureReady:true,textureSize:[width,height],milkyWay:true,galacticClouds:'spherical warped clouds and fragmented dark dust',galacticArch:true,galacticNormal:normal.toArray(),stars:starCount,stellarDust:tinyStars,deepStars:{count:starCount,visible:deepStars.visible,distance:56000,hemisphere:'lower',galaxy:true},nearStars:{count:nearCount,stars:nearStarCount,dust:nearDustCount,visible:nearStars.visible,opacity:+nearOpacity.value.toFixed(3),nearDistance:110,farDistance:900,fadeStartAltitude:350,fullAltitude:2500,worldAnchored:true,autonomousMotion:false},spaceDarkening:+spaceUniform.value.toFixed(3),time:+time.toFixed(3),animated,moon:true,moonDirection:moonDirection.toArray(),moonDiameterDegrees:1.04,lunarCraters:lunarCraters.length,shootingStars:1,meteorPeriod:53,externalFiles:0,disposed}),
  dispose(){if(disposed)return;disposed=true;for(const t of textures)t.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();canvas.width=canvas.height=moonCanvas.width=moonCanvas.height=haloCanvas.width=haloCanvas.height=1;root.removeFromParent();root.clear();}
 };
}
