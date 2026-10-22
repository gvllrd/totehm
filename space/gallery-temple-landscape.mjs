import * as T from './vendor/three-0.180.0.mjs';
import {HDRLoader} from './vendor/HDRLoader-0.180.0.mjs';
import {TEMPLE_ASSETS} from './gallery-temple-assets.mjs';

// A real landscape surrounds the temple. The photographs supply only the sky
// and its incident light; every mountain, cliff and stretch of water is 3D.
export function createTempleLandscape(scene,renderer,{onChange=()=>{},now=()=>new Date(),mobile=innerWidth<650}={}){
 const root=new T.Group();root.name='The summit — sea, mountains and a sea of clouds';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),skyTextures=new Map(),requests=new Set();
 let disposed=false,dirty=true,time=0,minute=-1,hour=12,day=true,skyLoaded=false,hdrLoaded=false,environmentTarget=null,hdrTexture=null,nightEnvironmentTexture=null;
 const priorEnvironment=scene.environment,priorIntensity=scene.environmentIntensity,priorFog=scene.fog;
 const ownGeometry=g=>(geometries.add(g),g),ownMaterial=m=>(materials.add(m),m);
 const changed=()=>{if(!disposed){dirty=true;onChange();}};
 const fog=new T.FogExp2(0xc1d7df,.00078);scene.fog=fog;
 const pmrem=new T.PMREMGenerator(renderer);pmrem.compileEquirectangularShader();
 const hemisphere=new T.HemisphereLight(0xc9e5f1,0x82735a,1.05);root.add(hemisphere);
 const sun=new T.DirectionalLight(0xffedce,3.1);sun.position.set(56,80,37);sun.castShadow=true;
 sun.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);
 Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:180});sun.shadow.camera.updateProjectionMatrix();
 sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.radius=2;root.add(sun,sun.target);sun.target.position.set(0,0,-1);
 const fill=new T.DirectionalLight(0xd5eaf4,.28);fill.position.set(-45,20,-60);root.add(fill);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;

 const commonNoise=`
  float hash3(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
  float summitNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){float v=0.,a=.55;for(int i=0;i<4;i++){v+=a*summitNoise(p);p=p*2.031+vec3(7.13,11.7,3.41);a*=.49;}return v;}
 `;
 const hazeDay=new T.Color(0xbcd4de),hazeNight=new T.Color(0x152540);
 const skyUniforms={uMap:{value:null},uHasMap:{value:false},uDay:{value:1},uHaze:{value:hazeDay.clone()}};
 const skyMaterial=ownMaterial(new T.ShaderMaterial({uniforms:skyUniforms,side:T.BackSide,depthWrite:false,depthTest:false,fog:false,toneMapped:false,
  vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 vDirection;uniform sampler2D uMap;uniform bool uHasMap;uniform float uDay;uniform vec3 uHaze;
   void main(){vec3 d=normalize(vDirection);vec2 uv=vec2(atan(d.z,d.x)*.159154943+.5,asin(clamp(d.y,-1.,1.))*.318309886+.5);
    vec3 zenith=mix(vec3(.001,.003,.012),vec3(.08,.29,.51),uDay);
    vec3 colour=mix(uHaze,zenith,pow(max(d.y,0.),.45));
    if(uHasMap)colour=texture2D(uMap,uv).rgb*mix(vec3(.035,.05,.075),vec3(1.),uDay);
    // The lower half of an HDR photograph contains its original ground. It
    // never substitutes that ground for the mountain and ocean geometry.
    float below=mix(1.-smoothstep(.06,.28,d.y),1.-smoothstep(-.035,.045,d.y),uDay);float horizon=pow(1.-max(d.y,0.),18.)*.23;
    colour=mix(colour,uHaze,max(below,horizon));gl_FragColor=vec4(colour,1.);
    #include <colorspace_fragment>
   }`
 }));
 const sky=new T.Mesh(ownGeometry(new T.SphereGeometry(1180,48,24)),skyMaterial);sky.name='Photographic upper sky';sky.renderOrder=-1000;sky.frustumCulled=false;root.add(sky);

 const noise=(x,z)=>{
  const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
  const h=(a,b)=>{let n=Math.imul(a,374761393)+Math.imul(b,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
  return(h(ix,iz)*(1-u)+h(ix+1,iz)*u)*(1-v)+(h(ix,iz+1)*(1-u)+h(ix+1,iz+1)*u)*v;
 };
 function fbm2(x,z,octaves=5){let total=0,a=.55;for(let i=0;i<octaves;i++){total+=a*noise(x,z);x=x*2.03+17.7;z=z*2.03+31.4;a*=.49;}return total;}
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 // Cusp-shaped watersheds, broken summits and progressively finer gullies.
 // Heights are bounded by construction: no clipped tops or soft ceiling can
 // turn the skyline into a row of mesas.
 function ridgeHeight(x,z){
  const warp=48*(fbm2(x*.0041+13,z*.0041,3)-.5);
  const axis=242+Math.sin(z*.0047)*59+Math.sin(z*.0137+2)*24+warp;
  const spine=Math.exp(-Math.abs(x-axis)/164);
  const along=1-Math.abs(2*noise(z*.0068+11,4.2)-1);
  const teeth=1-Math.abs(2*noise(z*.022+37,19.6)-1);
  const primary=spine*(.66+.28*Math.pow(along,1.45)+.06*teeth);
  const backAxis=648+Math.sin(z*.0033+2.1)*98+warp*.7;
  const backSpine=Math.exp(-Math.abs(x-backAxis)/212);
  const backPeaks=1-Math.abs(2*noise(z*.0052+28,27.4)-1);
  const secondary=backSpine*(.67+.33*Math.pow(backPeaks,1.6))*.94;
  // The oblique spurs branch away from the main watershed rather than forming
  // a smooth wall. Narrow negative cuts read as erosion at several scales.
  const distance=Math.abs(x-axis),flow=z+distance*.48+warp*.4;
  const ribs=Math.pow(1-Math.abs(2*noise(flow*.018+3,x*.0015)-1),2.5);
  const fineCuts=Math.pow(1-Math.abs(2*noise(flow*.052+17,x*.004)-1),5);
  const massif=Math.max(primary,secondary);
  const erosion=(ribs*25+fineCuts*9)*Math.sqrt(massif)*(1-Math.exp(-distance*.025));
  const scree=(fbm2(x*.068,z*.068,3)-.5)*5.5;
  return -225+207*massif-erosion+scree;
 }
 const terrainMaterial=ownMaterial(new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.98,metalness:0}));
 const rockUniforms={uRockMap:{value:null},uHasRock:{value:false}};
 const rockMap=new T.TextureLoader().load(TEMPLE_ASSETS.column.color,texture=>{
  if(disposed){texture.dispose();return;}rockUniforms.uHasRock.value=true;changed();
 },undefined,()=>changed());
 rockMap.colorSpace=T.SRGBColorSpace;rockMap.wrapS=rockMap.wrapT=T.RepeatWrapping;rockUniforms.uRockMap.value=rockMap;textures.add(rockMap);
 terrainMaterial.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,rockUniforms);
  shader.vertexShader='varying vec3 vSummitPosition;varying vec3 vSummitNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSummitPosition=(modelMatrix*vec4(position,1.)).xyz;vSummitNormal=normalize(mat3(modelMatrix)*normal);');
  shader.fragmentShader='varying vec3 vSummitPosition;varying vec3 vSummitNormal;uniform sampler2D uRockMap;uniform bool uHasRock;\n'+commonNoise+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float grain=fbm(vSummitPosition*.31);float strata=sin(vSummitPosition.y*.35+summitNoise(vSummitPosition*.055)*5.4);
   float seams=pow(1.-abs(2.*summitNoise(vSummitPosition*vec3(.14,.026,.14))-1.),9.);
   diffuseColor.rgb*=.67+grain*.64+strata*.10-seams*.17;
   if(uHasRock){vec3 w=pow(abs(normalize(vSummitNormal)),vec3(4.));w/=max(w.x+w.y+w.z,.001);
    vec3 rock=texture2D(uRockMap,vSummitPosition.zy*.075).rgb*w.x+texture2D(uRockMap,vSummitPosition.xz*.075).rgb*w.y+texture2D(uRockMap,vSummitPosition.xy*.075).rgb*w.z;
    diffuseColor.rgb*=mix(vec3(1.),pow(rock*2.,vec3(1.22)),.82);
   }`);
  // The same erosion signal also catches the light as relief. This uses
  // screen derivatives of the existing samples, without another texture or
  // additional terrain triangles on mobile.
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float rockRelief=grain*1.35-seams*.35+strata*.14;
   vec3 rockDx=dFdx(-vViewPosition),rockDy=dFdy(-vViewPosition);
   vec3 rockRx=cross(rockDy,normal),rockRy=cross(normal,rockDx);
   float rockDet=dot(rockDx,rockRx);
   normal=normalize(abs(rockDet)*normal-sign(rockDet)*(dFdx(rockRelief)*rockRx+dFdy(rockRelief)*rockRy));
  `);
 };
 terrainMaterial.customProgramCacheKey=()=> 'summit-triplanar-rock-v3';
 function terrain(name,cx,cz,width,depth,segX,segZ,height,far=false){
  const g=ownGeometry(new T.PlaneGeometry(width,depth,segX,segZ));g.rotateX(-Math.PI/2);
  const p=g.attributes.position,colours=new Float32Array(p.count*3),colour=new T.Color();
  for(let n=0;n<p.count;n++){
   const x=p.getX(n)+cx,z=p.getZ(n)+cz,y=height(x,z);p.setXYZ(n,x,y,z);
   const e=2.5,slope=Math.hypot(height(x+e,z)-height(x-e,z),height(x,z+e)-height(x,z-e))/(e*2);
   const grain=fbm2(x*.031,z*.031,3),green=clamp((1-slope)*.7)*(1-clamp((y+95)/65));
   const exposed=clamp(slope*.48),ochre=fbm2(x*.008+17,z*.008-5,3);
   colour.setRGB(.105+grain*.15+exposed*.04,.115+grain*.13,.12+grain*.105);
   colour.lerp(new T.Color(.23,.185,.13),clamp((ochre-.45)*2.5)*.38);
   colour.lerp(new T.Color(.035,.075,.043),green*.75);
   const snow=clamp((y+48)/27)*clamp(1.-slope*.78)*clamp((fbm2(x*.041+7,z*.041-3,3)-.43)*4.2);
   colour.lerp(new T.Color(.64,.70,.73),snow*.8);
   if(far)colour.lerp(hazeDay,.11);colours.set([colour.r,colour.g,colour.b],n*3);
  }
  g.setAttribute('color',new T.BufferAttribute(colours,3));g.computeVertexNormals();g.computeBoundingSphere();
  const mesh=new T.Mesh(g,terrainMaterial);mesh.name=name;root.add(mesh);return mesh;
 }
 // One coherent, eroded mountain massif, with successively softer ridges.
 terrain('Eastern massif — continuous ridges',580,-310,1060,1430,mobile?128:192,mobile?128:208,ridgeHeight);
 terrain('Distant mountain chain',1040,-1090,1420,800,mobile?36:60,mobile?28:44,(x,z)=>ridgeHeight(x*.63+160,z*.71-210)-43,true);
 terrain('Northern ridge beneath the horizon',130,-1210,810,610,mobile?32:48,mobile?24:36,(x,z)=>Math.min(-25,ridgeHeight(x+310,z*.7)-40),true);
 // The terrace is supported by a real crag. Its broad top remains below the
 // architectural steps and its stratified cliffs disappear into the cloud sea.
 const cragGeometry=ownGeometry(new T.CylinderGeometry(1,4,260,mobile?64:96,mobile?32:48,true));
 const cp=cragGeometry.attributes.position,cragColours=new Float32Array(cp.count*3),cragColour=new T.Color();
 for(let n=0;n<cp.count;n++){
  const x=cp.getX(n),y=cp.getY(n),z=cp.getZ(n),theta=Math.atan2(z,x),f=(130-y)/260;
  const variation=1+(.012+f*.035)*Math.sin(theta*13+f*7)+f*.031*Math.sin(theta*29-f*9);
  const exponent=.25+.75*Math.min(1,f*3),c=Math.cos(theta),s=Math.sin(theta);
  const rx=17.5+(110-17.5)*Math.pow(f,.72),rz=19.5+(118-19.5)*Math.pow(f,.72);
  cp.setXYZ(n,Math.sign(c)*Math.pow(Math.abs(c),exponent)*rx*variation,y-131.4,Math.sign(s)*Math.pow(Math.abs(s),exponent)*rz*variation);
  const grain=fbm2(x*.045+y*.012,z*.045),green=clamp((y-80)/55)*.25;
  cragColour.setRGB(.15+grain*.08,.155+grain*.075,.135+grain*.07);cragColour.lerp(new T.Color(.055,.09,.04),green);
  cragColours.set([cragColour.r,cragColour.g,cragColour.b],n*3);
 }
 cragGeometry.setAttribute('color',new T.BufferAttribute(cragColours,3));cragGeometry.computeVertexNormals();
 const crag=new T.Mesh(cragGeometry,terrainMaterial);crag.name='Limestone summit beneath the temple';root.add(crag);
 const cap=ownGeometry(new T.CircleGeometry(1,64));cap.rotateX(-Math.PI/2);
 const capPosition=cap.attributes.position,capColours=new Float32Array(capPosition.count*3);
 for(let n=0;n<capPosition.count;n++){
  const x=capPosition.getX(n),z=capPosition.getZ(n),r=Math.hypot(x,z),theta=Math.atan2(z,x),c=Math.cos(theta),s=Math.sin(theta);
  const px=r?Math.sign(c)*Math.pow(Math.abs(c),.25)*17.5*r:0,pz=r?Math.sign(s)*Math.pow(Math.abs(s),.25)*19.5*r:0;
  capPosition.setXYZ(n,px,-1.44-r*r*.24-fbm2(px*.21,pz*.21,3)*.22,pz);capColours.set([.17,.175,.15],n*3);
 }
 cap.setAttribute('color',new T.BufferAttribute(capColours,3));cap.computeVertexNormals();const capMesh=new T.Mesh(cap,terrainMaterial);capMesh.name='Rock crown tucked beneath the ancient steps';root.add(capMesh);

 const seaUniforms={uTime:{value:0},uDay:{value:1},uHaze:{value:hazeDay.clone()},uSun:{value:new T.Vector3(.56,.8,.37).normalize()},uSky:{value:null},uHasSky:{value:false}};
 const seaMaterial=ownMaterial(new T.ShaderMaterial({uniforms:seaUniforms,toneMapped:true,
  vertexShader:'varying vec3 vWorld;void main(){vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}',
  fragmentShader:`varying vec3 vWorld;uniform float uTime,uDay;uniform vec3 uHaze,uSun;uniform sampler2D uSky;uniform bool uHasSky;
   vec2 ripple(vec2 p,vec2 direction,float frequency,float amplitude,float speed,float footprint){
    float visible=1.-smoothstep(.35,2.2,footprint*frequency);
    return direction*cos(dot(p,direction)*frequency+uTime*speed)*amplitude*visible;
   }
   void main(){vec2 p=vWorld.xz;float footprint=max(length(dFdx(p)),length(dFdy(p)));
    // Incommensurate crossing wave trains avoid the repeated leaf shapes of
    // a few large sine waves reflecting a sharp, photographic cloud map.
    vec2 slopes=ripple(p,vec2(.93,.37),.129,.036,.38,footprint)
     +ripple(p,vec2(-.55,.835),.281,.026,-.53,footprint)
     +ripple(p,vec2(.24,-.971),.593,.020,.77,footprint)
     +ripple(p,vec2(.78,.626),1.137,.013,-1.13,footprint)
     +ripple(p,vec2(-.971,.239),2.377,.008,1.54,footprint)
     +ripple(p,vec2(.47,.883),4.611,.004,-1.93,footprint);
    vec3 n=normalize(vec3(-slopes.x,1.,-slopes.y));
    vec3 viewDirection=normalize(cameraPosition-vWorld),reflection=reflect(-viewDirection,n);
    vec3 reflected=mix(vec3(.008,.018,.042),mix(uHaze*.68,vec3(.13,.29,.41),smoothstep(0.,.7,reflection.y)),uDay);
    if(uHasSky){vec2 uv=vec2(atan(reflection.z,reflection.x)*.159154943+.5,asin(clamp(reflection.y,-1.,1.))*.318309886+.5);
     vec3 photo=texture2D(uSky,uv).rgb;float luminance=dot(photo,vec3(.2126,.7152,.0722));photo=mix(vec3(luminance),photo,.32);
     reflected=mix(reflected,photo*mix(vec3(.025,.035,.055),vec3(.58,.62,.66),uDay),.23);
    }
    float fresnel=.025+.975*pow(1.-max(dot(n,viewDirection),0.),5.);
    vec3 deep=mix(vec3(.002,.012,.025),vec3(.009,.115,.152),uDay);
    float shallow=exp(-length(vWorld.xz-vec2(-43.,-3.))*.006);deep=mix(deep,vec3(.012,.16,.17)*(.3+.7*uDay),shallow*.3);
    vec3 colour=mix(deep,reflected,fresnel*.88);
    float glint=pow(max(dot(reflect(-uSun,n),viewDirection),0.),350.);colour+=glint*mix(vec3(.06,.11,.19),vec3(2.2,1.95,1.5),uDay);
    float distanceToEye=length(cameraPosition-vWorld);float haze=1.-exp(-pow(distanceToEye*.00068,1.7));colour=mix(colour,uHaze,haze*.88);
    gl_FragColor=vec4(colour,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 }));
 const sea=new T.Mesh(ownGeometry(new T.PlaneGeometry(3300,3300)),seaMaterial);sea.rotation.x=-Math.PI/2;sea.position.set(-800,-125,-260);sea.name='Infinite sea west of the temple';root.add(sea);

 const cloudUniforms={uTime:{value:0},uDay:{value:1},uHaze:{value:hazeDay.clone()}};
 const cloudMaterial=ownMaterial(new T.ShaderMaterial({uniforms:cloudUniforms,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:true,
  vertexShader:'varying vec3 vWorld;void main(){vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}',
  fragmentShader:`varying vec3 vWorld;uniform float uTime,uDay;uniform vec3 uHaze;${commonNoise}
   void main(){vec3 ray=normalize(vWorld-cameraPosition);if(ray.y>-.012)discard;
    float start=max(0.,(-48.-cameraPosition.y)/ray.y),finish=(-112.-cameraPosition.y)/ray.y;
    float stepLength=(finish-start)/${mobile?'6.':'9.'};float transmittance=1.;vec3 colour=vec3(0.);
    for(int i=0;i<${mobile?'6':'9'};i++){
     float distanceAlong=start+(float(i)+.5)*stepLength;vec3 p=cameraPosition+ray*distanceAlong;
     vec3 q=p*vec3(.012,.025,.012)+vec3(uTime*.002,7.3,uTime*.0008);
     float weather=summitNoise(vec3(p.x*.0041+uTime*.0004,3.71,p.z*.0041));
     float coverage=smoothstep(.48,.69,weather);
     float structure=fbm(q),detail=summitNoise(q*2.9+vec3(8.));
     float top=-87.+39.*pow(weather,1.35);
     float vertical=smoothstep(-112.,-96.,p.y)*(1.-smoothstep(top-13.,top,p.y));
     float westWindow=mix(.035,1.,smoothstep(-230.,-40.,p.x));
     float density=smoothstep(.37,.65,structure*.74+detail*.26)*vertical*coverage*westWindow;
     float extinction=1.-exp(-density*stepLength*.052);
     float light=clamp((p.y+112.)/64.,0.,1.);
     float shadow=summitNoise(q+vec3(.74,.54,.43))*coverage;
     float powder=clamp(.16+light*.65+(1.-density)*.19-shadow*.29,0.,1.);
     vec3 cloudColour=mix(vec3(.025,.043,.075),mix(vec3(.16,.23,.30),vec3(.98,.97,.90),powder),uDay);
     float haze=1.-exp(-distanceAlong*.0003);cloudColour=mix(cloudColour,uHaze,haze*.44);
     colour+=transmittance*extinction*cloudColour;transmittance*=1.-extinction;
    }
    float alpha=1.-transmittance;if(alpha<.002)discard;gl_FragColor=vec4(colour/max(alpha,.001),alpha*.88);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 }));
 const cloudSea=new T.Mesh(ownGeometry(new T.PlaneGeometry(3200,3200)),cloudMaterial);cloudSea.rotation.x=-Math.PI/2;cloudSea.position.set(0,-112,-290);cloudSea.name='Volume of clouds below the summit';cloudSea.renderOrder=10;root.add(cloudSea);

 let seed=28271;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const starCount=mobile?1200:2400,starPositions=new Float32Array(starCount*3),starPhases=new Float32Array(starCount),starSizes=new Float32Array(starCount);
 for(let n=0;n<starCount;n++){const y=.045+random()*.95,phi=random()*Math.PI*2,r=Math.sqrt(1-y*y);starPositions.set([Math.cos(phi)*r*1135,y*1135,Math.sin(phi)*r*1135],n*3);starPhases[n]=random()*Math.PI*2;starSizes[n]=.7+Math.pow(random(),8)*1.5;}
 const starGeometry=ownGeometry(new T.BufferGeometry());starGeometry.setAttribute('position',new T.BufferAttribute(starPositions,3));starGeometry.setAttribute('aPhase',new T.BufferAttribute(starPhases,1));starGeometry.setAttribute('aSize',new T.BufferAttribute(starSizes,1));
 const starUniforms={uTime:{value:0}};
 const starMaterial=ownMaterial(new T.ShaderMaterial({uniforms:starUniforms,transparent:true,depthWrite:false,toneMapped:false,
  vertexShader:'attribute float aPhase,aSize;uniform float uTime;varying float vAlpha;void main(){vAlpha=.54+.30*sin(aPhase+uTime*.38);gl_PointSize=aSize;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);float a=(1.-smoothstep(.15,.5,r))*vAlpha;gl_FragColor=vec4(.78,.87,1.,a);}'
 }));
 const stars=new T.Points(starGeometry,starMaterial);stars.name='Quiet animated stars above the photographic night';stars.renderOrder=-900;root.add(stars);

 const loader=new T.TextureLoader();
 function environmentFrom(texture){
  if(disposed||!texture)return;
  const next=pmrem.fromEquirectangular(texture);if(disposed){next.dispose();return;}
  const old=environmentTarget;environmentTarget=next;scene.environment=next.texture;scene.environmentIntensity=day?.6:.1;old?.dispose();changed();
 }
 function installEnvironment(){
  if(day){if(hdrTexture)environmentFrom(hdrTexture);}
  else{
   const texture=skyTextures.get('night');if(!texture)return;
   if(!nightEnvironmentTexture){
    const c=document.createElement('canvas');c.width=mobile?512:1024;c.height=c.width/2;const x=c.getContext('2d');x.drawImage(texture.image,0,0,c.width,c.height);
    // The actual sky is used, with the photographic village removed below its horizon.
    x.fillStyle='#101827';x.fillRect(0,c.height/2,c.width,c.height/2);
    nightEnvironmentTexture=new T.CanvasTexture(c);nightEnvironmentTexture.colorSpace=T.SRGBColorSpace;nightEnvironmentTexture.mapping=T.EquirectangularReflectionMapping;textures.add(nightEnvironmentTexture);
   }
   environmentFrom(nightEnvironmentTexture);
  }
 }
 function useSky(){
  const kind=day?'day':'night',texture=skyTextures.get(kind);skyLoaded=!!texture;
  skyUniforms.uMap.value=texture||null;skyUniforms.uHasMap.value=!!texture;seaUniforms.uSky.value=texture||null;seaUniforms.uHasSky.value=!!texture;
  if(texture)return;
  if(requests.has(kind))return;requests.add(kind);
  loader.load(TEMPLE_ASSETS.sky[kind],texture=>{
   if(disposed){texture.dispose();return;}texture.colorSpace=T.SRGBColorSpace;texture.mapping=T.EquirectangularReflectionMapping;textures.add(texture);skyTextures.set(kind,texture);
   if((day?'day':'night')===kind){skyLoaded=true;skyUniforms.uMap.value=texture;skyUniforms.uHasMap.value=true;seaUniforms.uSky.value=texture;seaUniforms.uHasSky.value=true;if(!day)installEnvironment();changed();}
  },undefined,()=>{requests.delete(kind);changed();});
 }
 function synchroniseClock(){
  const date=now(),nextHour=date.getHours(),nextMinute=nextHour*60+date.getMinutes();if(nextMinute===minute)return false;
  minute=nextMinute;hour=nextHour;const wasDay=day;day=hour>=6&&hour<20;
  skyUniforms.uDay.value=seaUniforms.uDay.value=cloudUniforms.uDay.value=day?1:0;
  const haze=day?hazeDay:hazeNight;skyUniforms.uHaze.value.copy(haze);seaUniforms.uHaze.value.copy(haze);cloudUniforms.uHaze.value.copy(haze);fog.color.copy(haze);fog.density=day?.00078:.00125;
  hemisphere.color.set(day?0xc9e5f1:0x6f8db3);hemisphere.groundColor.set(day?0x82735a:0x242c3b);hemisphere.intensity=day?1.05:.48;
  sun.color.set(day?0xffedce:0x91b6e2);sun.intensity=day?3.1:.95;sun.position.set(day?56:-46,day?80:62,day?37:-35);
  seaUniforms.uSun.value.copy(sun.position).normalize();
  fill.color.set(day?0xd5eaf4:0x7792b7);fill.intensity=day?.28:.4;fill.position.set(day?-45:-18,day?20:28,day?-60:45);stars.visible=!day;
  scene.environmentIntensity=day?.6:.1;renderer.shadowMap.needsUpdate=true;
  useSky();if(wasDay!==day||!environmentTarget)installEnvironment();changed();return true;
 }
 synchroniseClock();
 new HDRLoader().load(TEMPLE_ASSETS.sky.environment,texture=>{
  if(disposed){texture.dispose();return;}texture.mapping=T.EquirectangularReflectionMapping;textures.add(texture);hdrTexture=texture;hdrLoaded=true;if(day)installEnvironment();changed();
 },undefined,()=>changed());

 return{
  root,get day(){return day;},get hour(){return hour;},
  update(dt,eye,motion){
   if(disposed)return false;const clockChanged=synchroniseClock();
   if(eye){sky.position.copy(eye);stars.position.copy(eye);}
   if(motion){time+=Math.max(0,Math.min(Number(dt)||0,.1));seaUniforms.uTime.value=cloudUniforms.uTime.value=starUniforms.uTime.value=time;dirty=true;}
   const result=dirty||clockChanged;dirty=false;return result;
  },
  diagnostics:()=>({kind:'photographic sky and physically lit summit landscape',day,hour,time:+time.toFixed(3),skyLoaded,hdrLoaded,environment:environmentTarget?(day?'CC0 HDR radiance PMREM':'night sky PMREM'):null,sea:{side:'left',height:-125,crossingRipples:6},mountains:{side:'right',highest:-15,erodedSpines:true,photographicRock:rockUniforms.uHasRock.value},summit:{halfWidth:17.5,halfDepth:19.5,flatApron:false},clouds:{lower:-112,upper:-48,steps:mobile?6:9,brokenCoverage:true},stars:day?0:starCount,shadowSize:mobile?512:1024,triangles:[...geometries].reduce((n,g)=>n+(g.index?g.index.count:g.attributes.position.count)/3,0),disposed}),
  dispose(){
   if(disposed)return;disposed=true;root.visible=false;
   if(scene.environment===environmentTarget?.texture){scene.environment=priorEnvironment;scene.environmentIntensity=priorIntensity;}
   if(scene.fog===fog)scene.fog=priorFog;environmentTarget?.dispose();pmrem.dispose();sun.shadow.map?.dispose();
   for(const texture of textures)texture.dispose();for(const material of materials)material.dispose();for(const geometry of geometries)geometry.dispose();root.removeFromParent();root.clear();
  }
 };
}
