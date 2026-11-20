import * as T from './vendor/three-0.180.0.mjs';

// The last sanctuary has no daylight. This celestial sphere is generated once,
// without a network image, and is also the temple's real lighting environment.
export function createDrownedSky(scene,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='TOTEHM — the common celestial sphere';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set();
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 let time=0,disposed=false,dirty=true,animated=false;
 let seed=0x4e494748;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
 // A low celestial arch stays visible from both ocean panoramas as well as
 // the entrance: its pearly centre rises above the three independent doors.
 const normal=new T.Vector3(.05,.88,.47).normalize();
 const core=new T.Vector3(-.2,.53,-.824);core.addScaledVector(normal,-core.dot(normal)).normalize();
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
  const horizon=Math.exp(-Math.abs(dy)*7.5),upper=smooth(-.28,.18,dy);
  for(let x=0;x<width;x++){
   const dx=latitudeCos*cosLongitude[x],dz=latitudeCos*sinLongitude[x],at=(y*width+x)*4;
   let r=2.1+horizon*2.7,g=3.2+horizon*3.8,b=8.2+horizon*6.2;
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
    const dust=Math.exp(-rift*(1.0+islands*1.25)-branch*.52-islands*.28);
    const filament=Math.pow(smooth(.23,.80,fine*.72+grains*.28),1.8);
    const secondary=Math.exp(-Math.pow((warpedLatitude+.099+.035*Math.sin(along*7.))/.042,2));
    const wisps=(broad*.55+inner*.78+outerArm*.26+secondary*.22)*cloud*dust*(.86+.42*filament);
    // Warm crowded core, cool pearly arms, and dark foreground dust. The
    // radiance stays restrained enough that individual stars remain legible.
    const energy=wisps*(83+bulge*176),pearl=.86+fine*.10+grains*.04;
    r+=energy*(.70+bulge*.38)*pearl;
    g+=energy*(.81+bulge*.18)*pearl;
    b+=energy*(1.08-bulge*.22);
    {
     const hAlpha=Math.pow(smooth(.24,.82,middle*.62+fine*.38),2.2)*(1-dust*.65);
     const ionCyan=Math.pow(smooth(.30,.86,warp*.48+grains*.52),2.0)*(1-dust*.75);
     r+=hAlpha*28.0;g+=ionCyan*16.0+hAlpha*5.0;b+=ionCyan*34.0+hAlpha*22.0;
    }
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
 const timeUniform={value:0},pixelRatio={value:Math.min(globalThis.devicePixelRatio||1,1.5)};
 const skyMaterial=material(new T.ShaderMaterial({uniforms:{uMap:{value:environmentTexture},uTime:timeUniform},side:T.BackSide,depthWrite:false,depthTest:false,fog:false,toneMapped:false,
  vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 vDirection;uniform sampler2D uMap;uniform float uTime;
   void main(){vec3 d=normalize(vDirection);vec2 uv=vec2(atan(d.z,d.x)*.159154943+.5,asin(clamp(d.y,-1.,1.))*.318309886+.5);
    vec2 du=dFdx(uv),dv=dFdy(uv);du.x-=floor(du.x+.5);dv.x-=floor(dv.x+.5);
    vec3 sky=textureGrad(uMap,uv,du,dv).rgb;
    float clouds=smoothstep(.003,.08,max(sky.r,max(sky.g,sky.b)));
    float bloom=sin(dot(d,vec3(18.,-7.,11.))-uTime*.27)*sin(dot(d,vec3(5.,16.,8.))+uTime*.22);
    sky*=1.+clouds*(.065+.14*bloom);
    gl_FragColor=vec4(sky,1.);
    #include <colorspace_fragment>
   }`
 }));
 const dome=new T.Mesh(geometry(new T.SphereGeometry(1250,48,24)),skyMaterial);dome.name='Milky Way and interstellar dust';dome.renderOrder=-1200;dome.frustumCulled=false;root.add(dome);

 const starCount=mobile?10500:23500,positions=new Float32Array(starCount*3),colours=new Float32Array(starCount*3),sizes=new Float32Array(starCount),phases=new Float32Array(starCount),intensities=new Float32Array(starCount);
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
   direction=new T.Vector3().copy(core).multiplyScalar(Math.cos(longitude)).addScaledVector(tangent,Math.sin(longitude)).multiplyScalar(Math.cos(latitude)).addScaledVector(normal,Math.sin(latitude));
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
  colours.set(colour.toArray(),i*3);sizes[i]=1.0+bright*12;phases[i]=random()*Math.PI*2;intensities[i]=.13+bright*1.49;
 }
 const starGeometry=geometry(new T.BufferGeometry());starGeometry.setAttribute('position',new T.BufferAttribute(positions,3));starGeometry.setAttribute('aColour',new T.BufferAttribute(colours,3));starGeometry.setAttribute('aSize',new T.BufferAttribute(sizes,1));starGeometry.setAttribute('aPhase',new T.BufferAttribute(phases,1));starGeometry.setAttribute('aIntensity',new T.BufferAttribute(intensities,1));

 const starMaterial=material(new T.ShaderMaterial({uniforms:{uTime:timeUniform,uPixelRatio:pixelRatio},transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,fog:false,
  vertexShader:`attribute vec3 aColour;attribute float aSize,aPhase,aIntensity;uniform float uTime,uPixelRatio;varying vec3 vColour;varying float vIntensity,vGlint;
   void main(){vColour=aColour;float lowAltitude=1.-clamp(position.y/1220.,0.,1.);float shimmer=.045+.13*lowAltitude*lowAltitude;float twinkle=sin(aPhase+uTime*(.32+.16*sin(aPhase)))*.45+sin(aPhase*2.7+uTime*(1.02+.32*cos(aPhase)))*.35+sin(aPhase*6.1+uTime*2.15)*.2;vIntensity=aIntensity*(1.-shimmer+shimmer*twinkle);vGlint=smoothstep(1.5,6.2,aSize);gl_PointSize=aSize*uPixelRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 vColour;varying float vIntensity,vGlint;
   void main(){vec2 p=gl_PointCoord-.5;float r=length(p);if(r>.5)discard;float core=exp(-r*r*mix(24.,280.,vGlint));float halo=exp(-r*r*15.)*(vGlint*.12+.035);float glint=(exp(-abs(p.x)*95.)*exp(-abs(p.y)*11.)+exp(-abs(p.y)*95.)*exp(-abs(p.x)*11.))*vGlint*.075;float alpha=(core*.92+halo+glint)*vIntensity;gl_FragColor=vec4(vColour,alpha);
    #include <colorspace_fragment>
   }`
 }));
 const stars=new T.Points(starGeometry,starMaterial);stars.name='Fine stellar light — warm giants and blue distant stars';stars.renderOrder=-1100;stars.frustumCulled=false;stars.onBeforeRender=renderer=>{pixelRatio.value=Math.min(renderer.getPixelRatio(),1.5);};root.add(stars);

 seed=0x4d4f4f4e;
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

 const meteorSegments=32,meteorTrail=new Float32Array(meteorSegments*2*3),meteorAges=new Float32Array(meteorSegments*2),meteorSides=new Float32Array(meteorSegments*2),meteorIndices=[];
 for(let i=0;i<meteorSegments;i++){
  meteorAges[i*2]=meteorAges[i*2+1]=i/(meteorSegments-1);meteorSides[i*2]=-1;meteorSides[i*2+1]=1;
  if(i<meteorSegments-1){const v=i*2;meteorIndices.push(v,v+2,v+1,v+1,v+2,v+3);}
 }
 const meteorGeometry=geometry(new T.BufferGeometry());meteorGeometry.setAttribute('position',new T.BufferAttribute(meteorTrail,3));meteorGeometry.setAttribute('aAge',new T.BufferAttribute(meteorAges,1));meteorGeometry.setAttribute('aSide',new T.BufferAttribute(meteorSides,1));meteorGeometry.setIndex(meteorIndices);
 function createMeteor(start,finish,period,offset,duration){
  const meteorMaterial=material(new T.ShaderMaterial({uniforms:{uTime:timeUniform,uStart:{value:new T.Vector3(...start).normalize()},uEnd:{value:new T.Vector3(...finish).normalize()},uPeriod:{value:period},uOffset:{value:offset},uDuration:{value:duration}},side:T.DoubleSide,transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,fog:false,
   vertexShader:`attribute float aAge,aSide;uniform float uTime,uPeriod,uOffset,uDuration;uniform vec3 uStart,uEnd;varying float vAlpha,vAge,vAcross;
    // CELESTIAL_METEOR_RIBBON: a tapered optical trail with a compact white head.
    void main(){float cycle=mod(uTime+uOffset,uPeriod);float p=cycle/uDuration;float head=p-aAge*.17;vec3 start=uStart,finish=uEnd;vec3 direction=normalize(mix(start,finish,clamp(head,0.,1.)));vec3 side=normalize(cross(direction,finish-start));float width=.22+pow(1.-aAge,2.)*1.4;vAge=aAge;vAcross=aSide;vAlpha=exp(-aAge*4.5)*smoothstep(0.,.13,p)*(1.-smoothstep(.85,1.12,p));if(head<0.||head>1.)vAlpha=0.;gl_Position=projectionMatrix*modelViewMatrix*vec4(direction*1200.+side*aSide*width,1.);}`,
   fragmentShader:`varying float vAlpha,vAge,vAcross;void main(){float core=exp(-vAcross*vAcross*3.4);vec3 colour=mix(vec3(.38,.57,.92),vec3(.92,.96,1.),pow(1.-vAge,3.));gl_FragColor=vec4(colour,core*vAlpha*.78);
    #include <colorspace_fragment>
   }`
  }));
  const meteor=new T.Mesh(meteorGeometry,meteorMaterial);meteor.name='Shooting star';meteor.renderOrder=-1090;meteor.frustumCulled=false;meteor.visible=false;root.add(meteor);
  return {mesh:meteor,period,offset,duration};
 }
 const meteors=[createMeteor([-.57,.59,-.72],[.02,.45,-.91],21,17,1.22),createMeteor([.86,.37,-.34],[.38,.2,-.94],33,19,.92),createMeteor([-.68,-.25,-.66],[.14,-.48,-.92],49,41,1.18)];
 onChange();
 return{
  root,environmentTexture,moonDirection,
  update(dt,eye,motion){
   if(disposed)return false;
   if(eye&&!root.position.equals(eye)){root.position.copy(eye);dirty=true;}
   animated=!!motion;if(animated){time+=Math.max(0,Math.min(Number(dt)||0,.1));timeUniform.value=time;dirty=true;}
   for(const meteor of meteors){
    const visible=animated&&(time+meteor.offset)%meteor.period<meteor.duration*1.14;
    if(meteor.mesh.visible!==visible){meteor.mesh.visible=visible;dirty=true;}
   }
   const changed=dirty;dirty=false;return changed;
  },
  diagnostics:()=>({night:true,skyLoaded:true,textureReady:true,catalogue:'totehm-celestial-sphere',fullSphere:true,textureSize:[width,height],milkyWay:true,galacticClouds:'warped luminous filaments behind branching dust',galacticArch:true,galacticNormal:normal.toArray(),stars:starCount,stellarDust:tinyStars,stellarProfile:'compact cores, diffraction and faint optical halos',stellarColours:7,time:+time.toFixed(3),animated,moon:true,moonDirection:moonDirection.toArray(),moonDiameterDegrees:1.04,lunarCraters:lunarCraters.length,shootingStars:meteors.length,meteor:meteors.some(event=>event.mesh.visible),meteorRibbon:true,meteorTriangles:meteorIndices.length/3,externalFiles:0,disposed}),
  dispose(){if(disposed)return;disposed=true;for(const t of textures)t.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();canvas.width=canvas.height=moonCanvas.width=moonCanvas.height=haloCanvas.width=haloCanvas.height=1;root.removeFromParent();root.clear();}
 };
}
