import * as T from './vendor/three-0.180.0.mjs';
import {createWhiteStone} from './gallery-white-stone.mjs';

const RADIUS = .85;
const FLAME_BOUNDS = [1.48, 1.68, 1.42];
const UP = new T.Vector3(0, 1, 0);
const random = seed => {
 const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
 return value - Math.floor(value);
};

function charredBirch(radius, length, seed, mobile) {
 const geometry = new T.CylinderGeometry(radius * .88, radius, length, mobile ? 28 : 44, 14);
 const points = geometry.attributes.position;
 for (let i = 0; i < points.count; i++) {
  const x = points.getX(i), y = points.getY(i), z = points.getZ(i);
  const v = y / length, angle = Math.atan2(z, x);
  const ridge = 1 + .075 * Math.sin(angle * 6 + seed) + .045 * Math.sin(angle * 19 + v * 3);
  const split = Math.max(0, Math.cos(angle * 7 + seed + v * .7) - .92) * 2.1;
  const knot = .16 * Math.exp(-((angle - 1) ** 2 / .13 + (v - .14) ** 2 / .028));
  const capWear = Math.abs(v) > .49 && Math.hypot(x, z) > .001
   ? .012 * Math.sin(angle * 4 + seed) + .005 * Math.sin(angle * 13 + v) : 0;
  points.setXYZ(i,
   x * (ridge + knot - split) + .014 * Math.sin(v * 5 + seed),
   y + capWear,
   z * (ridge + knot - split) + .008 * Math.cos(v * 7 + seed));
 }
 geometry.computeVertexNormals();
 geometry.computeBoundingBox();
 geometry.computeBoundingSphere();
 return geometry;
}

function burningWood(clock, logLength) {
 const material = new T.MeshStandardMaterial({color:0x302018,roughness:.96,metalness:0});
 material.name = 'Split hardwood, growth rings, scorched bark and incandescent cracks';
 material.customProgramCacheKey = () => 'outdoor-hardwoods-v1';
 material.onBeforeCompile = shader => {
  shader.uniforms.uTimeWood = clock;
  shader.uniforms.uLogLength = {value:logLength};
  shader.vertexShader = shader.vertexShader
   .replace('#include <common>', '#include <common>\nvarying vec3 vWood,vWoodNormal;')
   .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWood=position;vWoodNormal=normal;');
  shader.fragmentShader = shader.fragmentShader
   .replace('#include <common>', `#include <common>
    uniform float uTimeWood,uLogLength;varying vec3 vWood,vWoodNormal;
    float grainHash(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+19.19);return fract(p.x*p.y);}
    float grainNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(grainHash(i),grainHash(i+vec2(1,0)),f.x),mix(grainHash(i+vec2(0,1)),grainHash(i+vec2(1)),f.x),f.y);}`)
   .replace('#include <map_fragment>', `#include <map_fragment>
    float angle=atan(vWood.z,vWood.x), r=length(vWood.xz), end=abs(vWood.y)*2./uLogLength;
    vec2 bark=vec2(angle*5.9,vWood.y*17.2);
    float fissure=abs(sin(bark.x*5.2+grainNoise(bark*vec2(.38,.24))*5.2));
    float fine=grainNoise(bark*vec2(3.1,1.8)), relief=fissure*.0014+fine*.0009;
    float face=smoothstep(.56,.96,abs(normalize(vWoodNormal).y));
    float ring=sin(r*660.+grainNoise(vWood.xz*30.)*2.8+sin(angle*3.)*.7);
    float ringFade=1.-smoothstep(.5,2.4,fwidth(ring));
    vec3 cut=mix(vec3(.103,.047,.018),vec3(.31,.164,.073),(.56+.36*ring*ringFade)*(.77+.23*fine));
    float ashy=smoothstep(.48,.82,grainNoise(bark*.68))*(1.-smoothstep(.43,.95,end));
    vec3 shell=mix(vec3(.021,.010,.006),vec3(.119,.062,.029),smoothstep(.32,.98,end)*(.38+.62*fissure));
    shell=mix(shell,vec3(.20,.166,.127),ashy*.75)*(.61+.39*fine);
    float aa=max(fwidth(fissure),.018);
    float hot=(1.-smoothstep(.022,.071+aa*.17,fissure))*smoothstep(.5,.78,grainNoise(bark*.74))*pow(max(0.,1.-end),1.8)*(1.-smoothstep(.19,.55,aa))*(1.-face);
    hot*=.69+.31*sin(uTimeWood*1.1+bark.x*1.8+bark.y*2.2);
    diffuseColor.rgb=mix(shell,cut,face);`)
   .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
    vec3 dxWood=dFdx(-vViewPosition),dyWood=dFdy(-vViewPosition);
    vec3 uWood=cross(dyWood,normal),vRelief=cross(normal,dxWood);
    float detWood=dot(dxWood,uWood), heightWood=mix(relief,ring*.00035,face);
    normal=normalize(max(.00001,abs(detWood))*normal-sign(detWood)*(dFdx(heightWood)*uWood+dFdy(heightWood)*vRelief));`)
   .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.25,.102,.004)*hot;');
 };
 return material;
}

function flowTexture(mobile) {
 const edge = mobile ? 32 : 48, values = new Uint8Array(edge ** 3 * 4);
 let seed = 0x8a54d211;
 for (let i = 0; i < values.length; i++) {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  values[i] = (seed >>> 0) >>> 24;
 }
 const texture = new T.Data3DTexture(values, edge, edge, edge);
 texture.name = 'Turbulent burning wood flow field';
 texture.format = T.RGBAFormat;
 texture.minFilter = texture.magFilter = T.LinearFilter;
 texture.wrapS = texture.wrapT = texture.wrapR = T.RepeatWrapping;
 texture.unpackAlignment = 1;
 texture.needsUpdate = true;
 return {texture, edge};
}

function combustion(clock, flow, center, extent, maxSteps) {
 const uniforms = {
  uTime: clock, uFlow: {value:flow.texture}, uScale: {value:1/flow.edge},
  uCenter: {value:center}, uHalf: {value:extent}, uSteps: {value:maxSteps}
 };
 return new T.ShaderMaterial({uniforms, transparent:true, depthWrite:false, side:T.FrontSide,
  vertexShader:`varying vec3 vPoint;void main(){vPoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float uTime,uScale,uSteps;uniform highp sampler3D uFlow;uniform vec3 uCenter,uHalf;varying vec3 vPoint;
   vec3 flow(vec3 p){return texture(uFlow,(p+.5)*uScale).rgb;}
   float spot(vec2 p,vec2 center,float radius){vec2 q=(p-center)/radius;return exp(-dot(q,q));}
   vec2 boundsOf(vec3 ro,vec3 rd){vec3 a=(-uHalf-ro)/rd,b=(uHalf-ro)/rd;vec3 lo=min(a,b),hi=max(a,b);return vec2(max(max(lo.x,lo.y),lo.z),min(min(hi.x,hi.y),hi.z));}
   void main(){
    vec3 origin=cameraPosition-uCenter, ray=normalize(vPoint-origin);vec2 bounds=boundsOf(origin,ray);
    float start=max(bounds.x,0.);if(bounds.y<=start)discard;
    float stride=(bounds.y-start)/uSteps;vec3 light=vec3(0.);float alpha=0.;
    for(int i=0;i<${maxSteps};i++){
     if(float(i)>=uSteps||alpha>.982)break;
     vec3 p=origin+ray*(start+(float(i)+.5)*stride);float y=p.y+uHalf.y,rise=y/(2.*uHalf.y);
     vec3 slow=flow(vec3(p.x*2.3+6.,y*2.45-uTime*1.32,p.z*2.4+3.));
     vec2 skew=(slow.rb-.5)*(.12+rise*.42)+vec2(rise*.20, -rise*.13);
     vec2 q=p.xz-skew;
     vec3 rolls=flow(vec3(q.x*6.1+4.,y*5.4-uTime*3.2,q.y*6.2+12.));
     vec3 small=flow(vec3(q.x*18.4+rolls.b*.7,y*9.5-uTime*6.6,q.y*19.2+rolls.r*.7));
     float breadth=mix(.235,.075,rise)*(.76+slow.g*.36);
     vec2 sweep=vec2(.086*sin(y*5.7-uTime*2.1),.07*sin(y*7.3+uTime*1.6))*rise;
     float left=.96*spot(q,vec2(-.235,.125)+sweep,breadth*.76);
     float right=spot(q,vec2(.225,.105)-sweep,breadth*.78);
     float back=spot(q,vec2(.008,-.225)+sweep.yx,breadth*.94);
     float body=max(max(left,right),back);
     float lean=.10*sin(uTime*1.65+p.x*7.1)+.19*(slow.r-.5);
     float height=1.40-.51*length(p.xz)+lean+.10*sin(uTime*2.7+p.z*8.);
     float tip=1.-smoothstep(height-.24,height+.15,y);
     float mixture=rolls.r*.68+small.g*.23+slow.g*.09;
     float edge=.365+rise*.27+.038*sin(y*23.-uTime*7.9+rolls.g*6.1);
     float react=smoothstep(edge-.035,edge+.041,mixture);
     float strands=mix(1.,smoothstep(.32,.69,small.b+rolls.g*.19),smoothstep(.43,.82,rise));
     float boundary=(1.-smoothstep(.50,.68,length(p.xz)))*(1.-smoothstep(1.51,1.68,y));
     float sheet=smoothstep(.035,.31,body*react);
     float density=body*sheet*tip*strands*boundary*smoothstep(.01,.13,y);
     float heat=clamp(.67+.31*react-.48*rise+.14*(small.r-.5)-.14*(1.-body),0.,1.);
     vec3 flame=mix(vec3(1.6,.075,.0014),vec3(3.4,.86,.022),smoothstep(.46,.81,heat));
     flame=mix(flame,vec3(4.,2.0,.42),smoothstep(.88,.99,heat));
     float opacity=1.-exp(-12.8*density*stride);light+=(1.-alpha)*opacity*flame;alpha+=(1.-alpha)*opacity;
    }
    if(alpha<.008)discard;
    gl_FragColor=vec4(light/max(alpha,.001),alpha*smoothstep(.008,.115,alpha));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
}

function floatingParticles(count, clock, ground, center, mode, mobile) {
 const geometry = new T.BufferGeometry();
 geometry.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(count*3),3));
 geometry.setAttribute('aSeed', new T.Float32BufferAttribute(Array.from({length:count}, (_,i)=>random(i+12)),1));
 const smoke=mode==='smoke';
 const material = new T.ShaderMaterial({transparent:true, depthWrite:false, toneMapped:false,
  blending:smoke?T.NormalBlending:T.AdditiveBlending,
  uniforms:{uTime:clock,uGround:{value:ground},uCenter:{value:center},uSize:{value:mobile?675:940}},
  vertexShader:`attribute float aSeed;uniform float uTime,uGround,uSize;uniform vec3 uCenter;varying float vLife,vSeed;
   void main(){
    float life=fract(aSeed+uTime*(${smoke?'.105+aSeed*.038':'.29+aSeed*.24'}));vLife=life;vSeed=aSeed;
    float phase=aSeed*73.+life*8.;
    vec3 p=vec3(${smoke?'.19*sin(phase)*(1.+life*2.1)+life*1.8':'.43*sin(phase)*(1.-life*.62)+life*.77'},
      uGround+${smoke?'1.11+life*3.4':'.24+life*2.'}, ${smoke?'.22*cos(phase)*life-life*.92':'.48*cos(phase)*(1.-life*.58)-life*.40'});
    p.xz+=uCenter.xz;vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
    gl_PointSize=clamp((${smoke?'.18+life*.75':'.006+aSeed*.011'})*uSize/max(.25,-view.z),.55,${smoke?'156.':'4.8'});
   }`,
  fragmentShader:`varying float vLife,vSeed;void main(){vec2 p=gl_PointCoord-.5;float r=length(p);
    float life=sin(vLife*3.14159);float a=(1.-smoothstep(.06,.50,r))*life;
    gl_FragColor=vec4(${smoke?'vec3(.28,.266,.255),a*.038':'vec3(1.,.29+(1.-vLife)*.47,.055),a*.8'});
    #include <colorspace_fragment>
  }`
 });
 const points = new T.Points(geometry, material);
 points.name=smoke?'Thin wood smoke blown into the night air':'Live sparks from the ember bed';
 points.frustumCulled=false;
 points.renderOrder=smoke?6:5;
 return points;
}

export function createOutdoorCampfire(scene,{mobile=false,onChange=()=>{},layout}={}) {
 const position = [...layout.fireplace.position], [x,,z] = position, floor = layout.groundY;
 const root = new T.Group();
 root.name = 'Lisbon lounge · open wood fire in old stone';
 scene.add(root);
 const materials = new Set(), geometries = new Set(), solids = [], pickables = [];
 const clock = {value:11.7}, flow = flowTexture(mobile), stone = createWhiteStone({mobile,onChange});
 const anchor = [x,floor+.72,z], minSteps = mobile ? 16 : 24, maxSteps = mobile ? 30 : 48;
 let disposed = false, dirty = true, moving = false, updates = 0, barkMeshes = 0;
 const own = (object,solid=false,pick=false) => {
  root.add(object);geometries.add(object.geometry);if(object.material!==stone.material)materials.add(object.material);
  if(solid)solids.push(object);
  if(pick){object.userData.kind='fireplace';pickables.push(object);}
  return object;
 };
 function mesh(geometry, material, location, name, solid=false,pick=false) {
  const object = new T.Mesh(geometry,material);
  object.name=name;object.position.set(x+location[0],floor+location[1],z+location[2]);
  object.castShadow=object.receiveShadow=!material.transparent;
  return own(object,solid,pick);
 }
 // Separate worn stones form the basin rim. The calçada stays the only floor.
 const stones = 14;
 for(let i=0;i<stones;i++) {
  const angle = i*2*Math.PI/stones, radius=.691+random(i+66)*.018;
  const rock = new T.DodecahedronGeometry(1,1), points = rock.attributes.position;
  for(let j=0;j<points.count;j++) {
   const u=points.getX(j), v=points.getY(j), w=points.getZ(j), n=random(u*29+v*40+w*80+i*6)*.18+.91;
   points.setXYZ(j,u*n,Math.max(-.58,Math.min(.55,v*n)),w*n);
  }
  rock.computeVertexNormals();
  const stoneBlock = mesh(rock,stone.material,[Math.sin(angle)*radius,.101,Math.cos(angle)*radius], 'Chipped limestone hearth stone',true,true);
  stoneBlock.scale.set(.180+random(i+1)*.022,.19+random(i+89)*.042,.144);
  stoneBlock.rotation.y=angle+.075*(random(i*31)-.5);
 }
 const basinMat = new T.MeshStandardMaterial({color:0x160e0b,roughness:1});
 mesh(new T.CylinderGeometry(.665,.643,.074,72),basinMat,[0,.055,0],'Black ash basin',true,true);
 // Rest the bottom crosspieces against the hot coals, stagger the upper split logs.
 const logs = [
  [[-.43,.16,-.27],[.42,.20,-.22],.086], [[-.41,.17,.255],[.46,.21,.19],.092],
  [[-.30,.25,-.47],[-.28,.27,.43],.086], [[.32,.22,-.45],[.24,.29,.44],.088],
  [[-.44,.24,.00],[.39,.44,.12],.094], [[-.39,.34,-.27],[.33,.43,-.095],.073],
  [[-.16,.21,.445],[.084,.49,-.16],.076], [[.36,.29,.33],[-.27,.46,-.31],.096]
 ];
 logs.forEach(([start,end,radius],i)=>{
  const low=new T.Vector3(...start), high=new T.Vector3(...end), axis=high.clone().sub(low), length=axis.length();
  const log=mesh(charredBirch(radius,length,1.4+i*3.1,mobile),burningWood(clock,length),low.add(high).multiplyScalar(.5).toArray(),'Split charred hardwood with exposed end grain',false,true);
  log.quaternion.setFromUnitVectors(UP,axis.normalize());barkMeshes++;
 });
 const coalCount=mobile?70:122,ashCount=mobile?38:68;
 const coalMaterial=new T.MeshStandardMaterial({color:0x170b07,emissive:0x4a0b01,emissiveIntensity:.85,roughness:1});
 const ashMaterial=new T.MeshStandardMaterial({color:0x938679,roughness:1});
 function scatter(count,material,radius,name,ash=false){
  const geometry=new T.IcosahedronGeometry(radius,ash?0:1), particles=own(new T.InstancedMesh(geometry,material,count)), transform=new T.Object3D(), light=new T.Color();
  particles.name=name;
  for(let i=0;i<count;i++){
   const a=random(i*17.1+7)*Math.PI*2,r=Math.sqrt(random(i*6+7))*(ash?.62:.54);
   transform.position.set(x+r*Math.cos(a),floor+.100+random(i*2+13)*.022,z+r*Math.sin(a));
   transform.scale.set(.72+random(i+8)*.9,.39+random(i+43)*.32,.58+random(i+51)*1.12);
   transform.rotation.set(random(i+1),random(i+3)*6.28,random(i+5));transform.updateMatrix();
   particles.setMatrixAt(i,transform.matrix);light.setScalar(.31+random(i+39)*.69);particles.setColorAt(i,light);
  }
  particles.instanceMatrix.needsUpdate=true;
 }
 scatter(coalCount,coalMaterial,.036,'Fractured coals at the base of the logs');
 scatter(ashCount,ashMaterial,.021,'Pale ash flakes between the coals',true);
 const extent=new T.Vector3(...FLAME_BOUNDS).multiplyScalar(.5), center=new T.Vector3(x,floor+.19+extent.y,z);
 const flameMaterial=combustion(clock,flow,center,extent,maxSteps);
 const fire=mesh(new T.BoxGeometry(...FLAME_BOUNDS),flameMaterial,[0,center.y-floor,0],'Sharp volumetric fire with separate rolling tongues');
 fire.renderOrder=4;
 const sparkCount=mobile?32:56, smokeCount=mobile?20:34;
 own(floatingParticles(sparkCount,clock,floor,center,'spark',mobile));
 own(floatingParticles(smokeCount,clock,floor,center,'smoke',mobile));
 const warm=new T.PointLight(0xff873c,8.6,9,2), glow=new T.PointLight(0xffc08a,1.5,6,2);
 warm.position.set(x,floor+.91,z+.12);glow.position.set(x-.28,floor+.45,z+.12);
 warm.name='Orange reflection on the leather seat and old paving';
 glow.name='Warm ember light on the split wood';
 root.add(warm,glow);
 onChange();
 return {root,solids,pickables,anchor,
  obstacles:[{id:'lounge-wood-fire',minX:x-RADIUS,maxX:x+RADIUS,minZ:z-RADIUS,maxZ:z+RADIUS,minY:floor,maxY:floor+.40}],
  update(dt,eye,motion=true){
   if(disposed)return false;
   moving=!!motion;
   if(moving&&Number.isFinite(dt)&&dt>0){
    clock.value+=Math.min(.1,dt);updates++;dirty=true;
    const t=clock.value;warm.intensity=8.6*(.90+.055*Math.sin(t*8.9)+.076*Math.sin(t*2.8+1.7));
    glow.intensity=1.5*(.95+.07*Math.sin(t*4.43));coalMaterial.emissiveIntensity=.71+.16*Math.sin(t*2.39);
   }
   if(eye){
    const distance=Math.hypot(eye.x-x,eye.y-anchor[1],eye.z-z),steps=distance>10?minSteps:distance>5?maxSteps-8:maxSteps;
    if(steps!==flameMaterial.uniforms.uSteps.value){flameMaterial.uniforms.uSteps.value=steps;dirty=true;}
   }
   const change=dirty;dirty=false;return change;
  },
  diagnostics:()=>({kind:'outdoor-lisbon-wood-fire',present:!disposed,ready:!disposed,outdoor:true,position,anchor,hearthDiameter:2*RADIUS,
   limestoneStones:stones,charredLogs:barkMeshes,brokenEndGrain:true,barkRelief:true,volumetricFlames:true,flameBounds:FLAME_BOUNDS,
   flameSteps:flameMaterial.uniforms.uSteps.value,maxFlameSteps:maxSteps,distanceLOD:true,clearSmoke:true,smokeParticles:smokeCount,
   smokeDrift:[1.8,3.4,-.92],glassSmokeCollector:false,blackPipe:false,metalCanopy:false,instancedCoals:coalCount,ashFlakes:ashCount,sparks:sparkCount,
   warmLights:2,lightIntensity:+warm.intensity.toFixed(2),time:+clock.value.toFixed(3),updates,moving,disposed}),
  dispose(){
   if(disposed)return;disposed=true;root.removeFromParent();
   for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
   root.traverse(child=>{if(child.isInstancedMesh)child.dispose();});
   warm.dispose();glow.dispose();flow.texture.dispose();stone.dispose();root.clear();
  }
 };
}
