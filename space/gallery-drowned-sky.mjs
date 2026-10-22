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
 const normal=new T.Vector3(.64,.69,.29).normalize();
 const core=new T.Vector3(-.2,.5,-.842);core.addScaledVector(normal,-core.dot(normal)).normalize();
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
   const band=Math.exp(-galacticLatitude*galacticLatitude/.018)*upper;
   if(band>.002){
    const low=noise(along*5+7,galacticLatitude*15+13,centre*6+9);
    const middle=noise(along*21+11,galacticLatitude*59+17,centre*24+5);
    const fine=noise(along*67+8,galacticLatitude*151+7,centre*71+16);
    const bulge=Math.exp((centre-1)*7.2);
    const widthVariation=.66+low*.65;
    const cloud=Math.pow(clamp((low*.54+middle*.32+fine*.14-.23)*1.8),1.35);
    const riftOffset=.014*Math.sin(dx*13+dz*4)+.011*Math.cos(dz*17-dy*9);
    const rift=Math.exp(-Math.pow((galacticLatitude-riftOffset)/(.019+middle*.026),2));
    const dust=1-rift*(.47+smooth(.24,.67,middle)*.43);
    const wisps=band*widthVariation*cloud*dust;
    // Warm crowded core, cool pearly arms, and dark foreground dust. The
    // radiance stays restrained enough that individual stars remain legible.
    const energy=wisps*(37+bulge*74),pearl=.76+fine*.24;
    r+=energy*(.72+bulge*.29)*pearl;
    g+=energy*(.79+bulge*.17)*pearl;
    b+=energy*(1.05-bulge*.16);
    const distantDust=band*(1-dust)*cloud*3.5;r+=distantDust;g+=distantDust*.8;b+=distantDust*.62;
   }
   // A thin natural airglow, rather than a luminous horizon or ground photo.
   const airglow=Math.exp(-Math.pow((dy-.047)/.065,2))*upper;
   data[at]=clamp(r+airglow*.8,0,255);data[at+1]=clamp(g+airglow*2.1,0,255);data[at+2]=clamp(b+airglow*1.6,0,255);data[at+3]=255;
  }
 }
 // Very distant stellar dust is baked into the environment. Brighter stars
 // below are genuine point geometry, with a slow, independent scintillation.
 const tinyStars=mobile?14000:38000;
 for(let i=0;i<tinyStars;i++){
  const theta=random()*Math.PI*2,latitude=(random()+random()+random()-1.5)*.075;
  const dx=(core.x*Math.cos(theta)+tangent.x*Math.sin(theta))*Math.cos(latitude)+normal.x*Math.sin(latitude);
  const dy=(core.y*Math.cos(theta)+tangent.y*Math.sin(theta))*Math.cos(latitude)+normal.y*Math.sin(latitude);
  const dz=(core.z*Math.cos(theta)+tangent.z*Math.sin(theta))*Math.cos(latitude)+normal.z*Math.sin(latitude);
  if(dy<.025)continue;
  const x=Math.floor((Math.atan2(dz,dx)/(Math.PI*2)+.5)*width)%width,y=Math.floor((.5-Math.asin(clamp(dy,-1,1))/Math.PI)*height);
  const at=(y*width+x)*4,luminance=5+Math.pow(random(),5)*31;
  data[at]=Math.min(255,data[at]+luminance*.9);data[at+1]=Math.min(255,data[at+1]+luminance*.95);data[at+2]=Math.min(255,data[at+2]+luminance);
 }
 context.putImageData(pixels,0,0);
 const environmentTexture=new T.CanvasTexture(canvas);environmentTexture.colorSpace=T.SRGBColorSpace;environmentTexture.mapping=T.EquirectangularReflectionMapping;
 environmentTexture.minFilter=T.LinearMipmapLinearFilter;environmentTexture.magFilter=T.LinearFilter;textures.add(environmentTexture);
 const skyMaterial=material(new T.ShaderMaterial({uniforms:{uMap:{value:environmentTexture}},side:T.BackSide,depthWrite:false,depthTest:false,fog:false,toneMapped:false,
  vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 vDirection;uniform sampler2D uMap;
   void main(){vec3 d=normalize(vDirection);vec2 uv=vec2(atan(d.z,d.x)*.159154943+.5,asin(clamp(d.y,-1.,1.))*.318309886+.5);gl_FragColor=vec4(texture2D(uMap,uv).rgb,1.);
    #include <colorspace_fragment>
   }`
 }));
 const dome=new T.Mesh(geometry(new T.SphereGeometry(1250,48,24)),skyMaterial);dome.name='Milky Way and interstellar dust';dome.renderOrder=-1200;dome.frustumCulled=false;root.add(dome);

 const starCount=mobile?6500:14000,positions=new Float32Array(starCount*3),colours=new Float32Array(starCount*3),sizes=new Float32Array(starCount),phases=new Float32Array(starCount),intensities=new Float32Array(starCount);
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
  colours.set(colour.toArray(),i*3);sizes[i]=.65+bright*3.1;phases[i]=random()*Math.PI*2;intensities[i]=.2+bright*.8;
 }
 const starGeometry=geometry(new T.BufferGeometry());starGeometry.setAttribute('position',new T.BufferAttribute(positions,3));starGeometry.setAttribute('aColour',new T.BufferAttribute(colours,3));starGeometry.setAttribute('aSize',new T.BufferAttribute(sizes,1));starGeometry.setAttribute('aPhase',new T.BufferAttribute(phases,1));starGeometry.setAttribute('aIntensity',new T.BufferAttribute(intensities,1));
 const timeUniform={value:0},pixelRatio={value:Math.min(globalThis.devicePixelRatio||1,1.5)};
 const starMaterial=material(new T.ShaderMaterial({uniforms:{uTime:timeUniform,uPixelRatio:pixelRatio},transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,fog:false,
  vertexShader:`attribute vec3 aColour;attribute float aSize,aPhase,aIntensity;uniform float uTime,uPixelRatio;varying vec3 vColour;varying float vIntensity;
   void main(){vColour=aColour;vIntensity=aIntensity*(.86+.14*sin(aPhase+uTime*(.17+.11*sin(aPhase))));gl_PointSize=aSize*uPixelRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 vColour;varying float vIntensity;
   void main(){float r=length(gl_PointCoord-.5);float light=exp(-r*r*19.);float alpha=(light*.75+(1.-smoothstep(.015,.19,r))*.25)*vIntensity;if(r>.5)discard;gl_FragColor=vec4(vColour,alpha);
    #include <colorspace_fragment>
   }`
 }));
 const stars=new T.Points(starGeometry,starMaterial);stars.name='Fourteen thousand quiet stars';stars.renderOrder=-1100;stars.frustumCulled=false;root.add(stars);

 const moonCanvas=document.createElement('canvas');moonCanvas.width=moonCanvas.height=mobile?256:512;
 const mx=moonCanvas.getContext('2d'),moonPixels=mx.createImageData(moonCanvas.width,moonCanvas.height),moonData=moonPixels.data;
 for(let y=0;y<moonCanvas.height;y++)for(let x=0;x<moonCanvas.width;x++){
  const nx=(x+.5)/moonCanvas.width*2-1,ny=1-(y+.5)/moonCanvas.height*2,r=Math.hypot(nx,ny),at=(y*moonCanvas.width+x)*4;if(r>=1)continue;
  const nz=Math.sqrt(1-r*r),grain=noise(nx*14+11,ny*14+9,nz*14+5),maria=smooth(.38,.68,noise(nx*3+7,ny*3+5,nz*3+13));
  const illumination=Math.max(0,nx*-.52+ny*.24+nz*.82),brightness=(.57+grain*.36-maria*.19)*(.13+illumination*.87);
  moonData[at]=clamp(brightness*255+7,0,255);moonData[at+1]=clamp(brightness*250+8,0,255);moonData[at+2]=clamp(brightness*237+11,0,255);moonData[at+3]=(1-smooth(.983,1,r))*255;
 }
 mx.putImageData(moonPixels,0,0);const moonTexture=new T.CanvasTexture(moonCanvas);moonTexture.colorSpace=T.SRGBColorSpace;textures.add(moonTexture);
 const moonMaterial=material(new T.MeshBasicMaterial({map:moonTexture,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,fog:false}));
 const moonDistance=1190,moonSize=moonDistance*Math.tan(.52*Math.PI/180)*2;
 const moon=new T.Mesh(geometry(new T.PlaneGeometry(moonSize,moonSize)),moonMaterial);moon.position.copy(moonDirection).multiplyScalar(moonDistance);moon.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),moonDirection.clone().negate());moon.name='A small silver gibbous moon';moon.renderOrder=-1070;moon.frustumCulled=false;root.add(moon);
 const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=128;const hx=haloCanvas.getContext('2d'),gradient=hx.createRadialGradient(64,64,0,64,64,64);
 gradient.addColorStop(0,'rgba(193,213,239,.19)');gradient.addColorStop(.12,'rgba(173,201,235,.085)');gradient.addColorStop(.43,'rgba(124,163,216,.023)');gradient.addColorStop(1,'rgba(96,137,203,0)');hx.fillStyle=gradient;hx.fillRect(0,0,128,128);
 const haloTexture=new T.CanvasTexture(haloCanvas);haloTexture.colorSpace=T.SRGBColorSpace;textures.add(haloTexture);
 const halo=new T.Mesh(geometry(new T.PlaneGeometry(moonSize*9,moonSize*9)),material(new T.MeshBasicMaterial({map:haloTexture,transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,fog:false})));halo.position.copy(moon.position);halo.quaternion.copy(moon.quaternion);halo.renderOrder=-1080;halo.name='A restrained moon halo';halo.frustumCulled=false;root.add(halo);

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
   animated=!!motion;if(animated){time+=Math.max(0,Math.min(Number(dt)||0,.1));timeUniform.value=time;dirty=true;}
   const changed=dirty;dirty=false;return changed;
  },
  diagnostics:()=>({night:true,skyLoaded:true,textureReady:true,textureSize:[width,height],milkyWay:true,stars:starCount,stellarDust:tinyStars,time:+time.toFixed(3),animated,moon:true,moonDirection:moonDirection.toArray(),moonDiameterDegrees:1.04,shootingStars:1,meteorPeriod:53,externalFiles:0,disposed}),
  dispose(){if(disposed)return;disposed=true;for(const t of textures)t.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();canvas.width=canvas.height=moonCanvas.width=moonCanvas.height=haloCanvas.width=haloCanvas.height=1;root.removeFromParent();root.clear();}
 };
}
