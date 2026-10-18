import * as T from './vendor/three-0.180.0.mjs';
import { createSky } from './gallery-sky.mjs';
import { TOTEHMPAPER, ORIGINS } from './gallery-artworks.mjs';

// The whole outdoor world lives under this root: hiding it leaves the parallel
// galleries in genuinely empty black space, including their lights and sky.
export function createTemple(scene, renderer, {lisbonPreview, now=()=>new Date(), onChange=()=>{}}={}) {
  const root=new T.Group();root.name='Temple above the clouds';scene.add(root);
  let seed=71117,time=0,minute=-1,day=true,disposed=false,loaded=0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const textures=new Set(),geometries=new Set(),materials=new Set();
  const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
  const trackTexture=t=>{textures.add(t);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;};
  const matrix=new T.Matrix4(),position=new T.Vector3(),quaternion=new T.Quaternion(),scale=new T.Vector3();
  function instance(g,m,transforms,parent=root) {
    const mesh=new T.InstancedMesh(g,m,transforms.length);
    transforms.forEach((v,i)=>{position.set(v[0],v[1],v[2]);scale.set(v[3]??1,v[4]??1,v[5]??1);quaternion.setFromEuler(new T.Euler(v[6]||0,v[7]||0,v[8]||0));matrix.compose(position,quaternion,scale);mesh.setMatrixAt(i,matrix);});
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();parent.add(mesh);return mesh;
  }
  function mesh(g,m,x=0,y=0,z=0,parent=root) {const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}

  // Hand-aged limestone. All colour, grain and joints are generated locally;
  // broad variation and a restrained bump prevent a polished plastic surface.
  function stoneCanvas(floor=false) {
    const c=document.createElement('canvas');c.width=c.height=1024;const x=c.getContext('2d');
    x.fillStyle=floor?'#c6b998':'#d8cbb0';x.fillRect(0,0,1024,1024);
    for(let i=0;i<11000;i++){const a=.018+random()*.065;x.fillStyle=random()<.56?`rgba(83,69,49,${a})`:`rgba(255,252,233,${a})`;const w=1+random()*13;x.fillRect(random()*1024,random()*1024,w,1+random()*4);}
    for(let i=0;i<145;i++){x.beginPath();const a=random()*1024,b=random()*1024;x.moveTo(a,b);x.bezierCurveTo(a+50,b-7,a+70,b+random()*25,a+110+random()*150,b+random()*23);x.strokeStyle=`rgba(105,94,72,${.015+random()*.04})`;x.lineWidth=1+random()*5;x.stroke();}
    if(floor){for(let j=0;j<4;j++)for(let i=0;i<4;i++){
      const a=i*256,b=j*256;x.fillStyle=`rgba(75,66,49,${.018+random()*.06})`;x.fillRect(a+3,b+3,250,250);
      x.strokeStyle='rgba(76,68,53,.40)';x.lineWidth=3;x.strokeRect(a+1,b+1,254,254);
      x.strokeStyle='rgba(252,240,206,.40)';x.lineWidth=1;x.strokeRect(a+4,b+4,248,248);
    }}
    const texture=trackTexture(new T.CanvasTexture(c));texture.wrapS=texture.wrapT=T.RepeatWrapping;return texture;
  }
  const stoneMap=stoneCanvas(),floorMap=stoneCanvas(true);floorMap.repeat.set(2,2.25);
  const stone=material(new T.MeshStandardMaterial({map:stoneMap,color:0xf4ead2,roughness:.97,bumpMap:stoneMap,bumpScale:.065,fog:false}));
  const floorStone=material(new T.MeshStandardMaterial({map:floorMap,color:0xf1e8d0,roughness:.98,bumpMap:floorMap,bumpScale:.07,fog:false}));
  const shadowStone=material(new T.MeshStandardMaterial({map:stoneMap,color:0x9e947f,roughness:1,fog:false}));
  const bronze=material(new T.MeshStandardMaterial({color:0x80734c,roughness:.8,metalness:.25,fog:false}));
  const black=material(new T.MeshBasicMaterial({color:0x000000,toneMapped:false,fog:false}));
  const box=geometry(new T.BoxGeometry(1,1,1));
  instance(box,shadowStone,[[0,-.95,0,34,1.1,38],[0,-.48,0,33,.32,37]]);
  instance(box,stone,[[0,-.22,0,32.5,.24,36.5]]);
  const floor=mesh(geometry(new T.PlaneGeometry(32,36)),floorStone,0,-.095,0);floor.rotation.x=-Math.PI/2;
  // A modest inset border and ancient walkways leave the centre unobstructed.
  instance(box,bronze,[[-15.65,-.083,0,.025,.008,35.3],[15.65,-.083,0,.025,.008,35.3],[0,-.083,17.65,31.3,.008,.025],[0,-.083,-17.65,31.3,.008,.025]]);
  const columnPositions=[];for(const x of [-15,15])for(const z of [-12,-4,4,12])columnPositions.push([x,z]);
  const cylinder=geometry(new T.CylinderGeometry(1,1,1,48));
  const shaft=geometry(new T.CylinderGeometry(.63,.77,8.15,96,10));
  const attr=shaft.attributes.position;
  for(let i=0;i<attr.count;i++){const x=attr.getX(i),z=attr.getZ(i),r=Math.hypot(x,z);if(r>.1){const theta=Math.atan2(z,x),flute=1-.045*(.5+.5*Math.cos(theta*24));attr.setXYZ(i,x*flute,attr.getY(i),z*flute);}}
  shaft.computeVertexNormals();
  instance(shaft,stone,columnPositions.map(([x,z])=>[x,4.7,z]));
  instance(cylinder,stone,columnPositions.flatMap(([x,z])=>[[x,.32,z,1.02,.42,1.02],[x,.61,z,.87,.18,.87],[x,8.87,z,.87,.21,.87],[x,9.10,z,1.04,.22,1.04]]));
  instance(box,stone,columnPositions.flatMap(([x,z])=>[[x,.04,z,2.2,.20,2.2],[x,9.32,z,2.16,.23,2.16]]));
  instance(box,stone,[[-15,9.66,0,2.36,.46,28],[15,9.66,0,2.36,.46,28],[0,9.66,-14.1,32.4,.46,2.36]]);
  instance(box,shadowStone,[[-15,9.45,0,2.48,.10,28.2],[15,9.45,0,2.48,.10,28.2],[0,9.45,-14.1,32.5,.10,2.48]]);

  // Rounded stone voussoirs form real openings; their black recesses give an
  // immediate glimpse of the void rather than a fourth landscape painted on.
  function wedge(a,b) {
    const s=new T.Shape();s.moveTo(Math.cos(a)*2.52,4.7+Math.sin(a)*2.52);s.absarc(0,4.7,2.52,a,b,false);s.lineTo(Math.cos(b)*1.8,4.7+Math.sin(b)*1.8);s.absarc(0,4.7,1.8,b,a,true);s.closePath();
    const g=new T.ExtrudeGeometry(s,{depth:1.02,bevelEnabled:true,bevelThickness:.022,bevelSize:.022,bevelSegments:1,curveSegments:6});g.translate(0,0,-.51);return g;
  }
  // All three arches use one merged geometry, so the detailed voussoirs cost a
  // single draw call. Vertex normals and UVs are retained for the stone grain.
  function merge(parts) {
    const arrays={position:[],normal:[],uv:[]};
    for(const g of parts){const v=g.index?g.toNonIndexed():g;for(const key of Object.keys(arrays))arrays[key].push(...v.attributes[key].array);if(v!==g)v.dispose();g.dispose();}
    const out=new T.BufferGeometry();for(const [key,a]of Object.entries(arrays))out.setAttribute(key,new T.Float32BufferAttribute(a,key==='uv'?2:3));out.computeBoundingSphere();return geometry(out);
  }
  const archParts=[];
  for(const x of [-9,0,9]){
    for(let j=0;j<13;j++){const g=wedge(j/13*Math.PI+.006,(j+1)/13*Math.PI-.006);g.translate(x,0,-12);archParts.push(g);}
    for(const side of [-1,1])for(let j=0;j<7;j++){const g=new T.BoxGeometry(.72,.66,1.02);g.translate(x+side*2.16,.35+j*.67,-12);archParts.push(g);}
  }
  mesh(merge(archParts),stone);
  instance(box,stone,[-9,0,9].flatMap(x=>[[-2.16,2.16].map(dx=>[x+dx,.10,-12,1.1,.25,1.42]),[-2.16,2.16].map(dx=>[x+dx,4.65,-12,.92,.18,1.27])]).flat());
  const archOpening=new T.Shape();archOpening.moveTo(-1.8,0);archOpening.lineTo(1.8,0);archOpening.lineTo(1.8,4.7);archOpening.absarc(0,4.7,1.8,0,Math.PI,false);archOpening.lineTo(-1.8,0);archOpening.closePath();
  const openingGeometry=geometry(new T.ShapeGeometry(archOpening,28));
  const covers=[],portals=[],labelMaps=[];
  function label(title,subtitle) {
    const c=document.createElement('canvas');c.width=1024;c.height=160;const x=c.getContext('2d');
    x.fillStyle='#dbd0b5';x.fillRect(0,0,1024,160);x.fillStyle='#463d2a';x.textAlign='center';x.font='31px Georgia';x.fillText(title,512,63);x.font='16px monospace';x.fillText(subtitle,512,108);
    const t=trackTexture(new T.CanvasTexture(c));labelMaps.push(t);return t;
  }
  const portalTitles=[['TOTEHMPAPER {THP}','THE STONER EXPERIENCE'],['ORIGINS','TWENTY WORKS · ENTER THE VOID'],['NEURO STREET ART DIGITAL','HIGHER THE LISBON STREETS']];
  [-9,0,9].forEach((x,room)=>{
    const opening=mesh(openingGeometry,black,x,0,-12.17);opening.userData={room,portal:true};
    // The cover floats inside the darkness, with a visible black margin all
    // around. It dissolves near the threshold so visitors physically enter.
    const coverMaterial=material(new T.MeshBasicMaterial({transparent:true,opacity:1,color:0xffffff,toneMapped:false,fog:false}));
    const cover=mesh(geometry(new T.PlaneGeometry(room===1?2.35:2.85,room===1?3.05:2.85)),coverMaterial,x,3.1,-11.99);
    cover.userData={room,portal:true};covers.push(cover);
    if(room===2&&lisbonPreview?.canvas)coverMaterial.map=trackTexture(new T.CanvasTexture(lisbonPreview.canvas));
    else if(room<2){const image=new Image();image.onload=()=>{if(disposed)return;const t=trackTexture(new T.Texture(image));t.needsUpdate=true;coverMaterial.map=t;coverMaterial.needsUpdate=true;loaded++;onChange();};image.src=room===0?TOTEHMPAPER.src:ORIGINS[0].src;}
    const plaque=mesh(geometry(new T.PlaneGeometry(4.9,.77)),material(new T.MeshBasicMaterial({map:label(...portalTitles[room]),fog:false})),x,7.78,-11.98);
    plaque.userData={room,portal:true};
    portals.push({room,x,z:-12,width:3.6,height:6.5,pickables:[opening,cover,plaque]});
  });

  // Native trees grow from planted beds, not the circulation paths. Irregular
  // overlapping foliage volumes and fine branchlets avoid a low-poly topiary.
  const trunkMaterial=material(new T.MeshStandardMaterial({color:0x6b6045,roughness:1,fog:false}));
  const leavesMaterial=material(new T.MeshStandardMaterial({color:0x638254,roughness:1,fog:false,vertexColors:false}));
  const shrubMaterial=material(new T.MeshStandardMaterial({color:0x496b3c,roughness:1,fog:false}));
  const stemMaterial=material(new T.MeshStandardMaterial({color:0x78865b,roughness:1,fog:false}));
  const soilMaterial=material(new T.MeshStandardMaterial({color:0x443e2b,roughness:1,fog:false}));
  const planters=[];for(const x of [-11,11])for(const z of [-3,5,13])planters.push([x,z]);
  instance(box,stone,planters.map(([x,z])=>[x,.12,z,4.9,.4,4.4]));
  instance(box,soilMaterial,planters.map(([x,z])=>[x,.34,z,4.55,.08,4.05]));
  const trunks=[],branches=[],leaves=[],shrubs=[],stems=[],flowers=[];
  const branchGeometry=geometry(new T.CylinderGeometry(.55,.9,1,9));
  const leafGeometry=geometry(new T.SphereGeometry(1,innerWidth<650?16:22,innerWidth<650?10:16));
  for(let i=0;i<leafGeometry.attributes.position.count;i++){
    const p=leafGeometry.attributes.position,x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const r=1+.075*Math.sin(x*9.4+y*3.7)*Math.cos(z*8.1-y*4.6)+.035*Math.sin(z*18.7+x*11.1);
    p.setXYZ(i,x*r,y*r,z*r);
  }
  leafGeometry.computeVertexNormals();
  function segment(a,b,r1,r2=r1) {const v=new T.Vector3(...b).sub(new T.Vector3(...a)),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize()),e=new T.Euler().setFromQuaternion(q);return[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r1,v.length(),r2,e.x,e.y,e.z];}
  for(const [x,z]of planters){
    const lean=(random()-.5)*.8,h=4.7+random()*.9;trunks.push(segment([x,.35,z],[x+lean,h,z+.3],.23));
    for(let j=0;j<7;j++){const a=j/7*Math.PI*2+random()*.35,r=1.55+random()*.6,end=[x+Math.cos(a)*r,h+.4+random()*1.1,z+Math.sin(a)*r];branches.push(segment([x+lean*.6,h*.58,z],end,.075));
      leaves.push([end[0],end[1]+.5,end[2],1.05+random()*.5,.9+random()*.45,.9+random()*.5,random()*.4,random()*6,random()*.5]);
      leaves.push([end[0]+(random()-.5),end[1]+.2,end[2]+(random()-.5),.75,.8,.75]);
    }
    leaves.push([x+lean,h+1.0,z,1.65,1.25,1.6]);
    for(let j=0;j<16;j++){const a=random()*Math.PI*2,r=.6+random()*1.35,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;shrubs.push([px,.53,pz,.35+random()*.38,.25+random()*.3,.4+random()*.3]);}
    for(let j=0;j<36;j++){const px=x+(random()-.5)*4.1,pz=z+(random()-.5)*3.5,h=.57+random()*.22;stems.push([px,h*.5+.35,pz,.012,h,.012]);flowers.push([px,h+.35,pz,.045+random()*.025,.045+random()*.025,.045+random()*.025]);}
  }
  instance(branchGeometry,trunkMaterial,trunks.concat(branches));
  const crown=instance(leafGeometry,leavesMaterial,leaves);
  leaves.forEach((_,i)=>crown.setColorAt(i,new T.Color().setHSL(.23+random()*.055,.25+random()*.1,.72+random()*.16)));crown.instanceColor.needsUpdate=true;
  // Thousands of tiny, cut-out leaves break the canopy silhouette. They are
  // one instanced draw call, with opaque depth and no transparency sorting.
  const leafCanvas=document.createElement('canvas');leafCanvas.width=leafCanvas.height=64;const lx=leafCanvas.getContext('2d');
  lx.fillStyle='#fff';lx.beginPath();lx.moveTo(5,32);lx.bezierCurveTo(16,8,47,8,60,32);lx.bezierCurveTo(46,56,16,56,5,32);lx.fill();
  lx.strokeStyle='#d0d9c3';lx.lineWidth=2;lx.beginPath();lx.moveTo(10,32);lx.lineTo(56,32);lx.stroke();
  const leafTexture=trackTexture(new T.CanvasTexture(leafCanvas));
  const individualLeaves=[];
  leaves.forEach(v=>{for(let j=0;j<38;j++){
    const theta=random()*Math.PI*2,y=random()*2-1,r=Math.sqrt(1-y*y),size=.18+random()*.15;
    individualLeaves.push([v[0]+Math.cos(theta)*r*v[3]*1.02,v[1]+y*v[4]*1.02,v[2]+Math.sin(theta)*r*v[5]*1.02,size,size*.65,1,random()*6,random()*6,random()*6]);
  }});
  const leafCards=instance(geometry(new T.PlaneGeometry(1,1)),material(new T.MeshStandardMaterial({map:leafTexture,color:0x759556,alphaTest:.5,side:T.DoubleSide,roughness:1,fog:false})),individualLeaves);
  individualLeaves.forEach((_,i)=>leafCards.setColorAt(i,new T.Color().setHSL(.23+random()*.05,.25,.65+random()*.3)));leafCards.instanceColor.needsUpdate=true;
  instance(geometry(new T.SphereGeometry(1,10,7)),shrubMaterial,shrubs);
  instance(cylinder,stemMaterial,stems);
  const flower=instance(geometry(new T.SphereGeometry(1,7,5)),material(new T.MeshStandardMaterial({color:0xffffff,roughness:1,fog:false})),flowers);
  const petalColours=[0xf7ebd1,0xeab3b9,0xc0a7d8,0xf6d486,0xdfd8ee];flowers.forEach((_,i)=>flower.setColorAt(i,new T.Color(petalColours[i%5])));flower.instanceColor.needsUpdate=true;

  // A dark summit underneath the temple sells the altitude when looking over
  // the edge; its surrounding cloud sea extends well beyond the nearby peak.
  const peakMaterial=material(new T.MeshStandardMaterial({color:0x777968,roughness:1,fog:false}));
  const summit=mesh(geometry(new T.ConeGeometry(26,46,32,5)),peakMaterial,0,-24,0);summit.rotation.y=.21;
  // Several silhouettes are folded into one vertex-coloured mesh: distant
  // summits stay graceful and layered instead of reading as identical cones.
  const mountainParts=[];
  for(let row=0;row<3;row++){
    const vertices=[],uvs=[],indices=[],colours=[],nx=18,nz=240;
    const base=new T.Color(row===0?0x70818a:row===1?0x8d9faa:0xa7bac4),snow=new T.Color(0xe7e9e2);
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
      const z=-190+j/nz*380,u=i/nx,phase=row*1.7;
      const triangle=n=>1-Math.abs(2*(n-Math.floor(n))-1);
      const crest=27+31*Math.pow(triangle(z*.015+phase),1.5)+17*Math.pow(triangle(z*.043+phase*.7),1.5)+7*triangle(z*.11+phase);
      const shape=Math.pow(Math.max(0,1-Math.abs(2*u-1)),.74);
      const crease=(Math.sin(z*.19+u*12)+Math.sin(z*.37-u*8)*.5)*Math.sin(u*Math.PI)*2.4;
      const y=-28+crest*shape+crease,x=31+row*30+u*52+Math.sin(z*.017+phase)*5;
      vertices.push(x,y,z);uvs.push(u,j/nz);
      const c=base.clone();c.multiplyScalar(.85+.15*Math.sin(z*.21+u*17));if(y>17+row*2)c.lerp(snow,T.MathUtils.clamp((y-17-row*2)/15,0,.85));colours.push(c.r,c.g,c.b);
      if(i<nx&&j<nz){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setAttribute('color',new T.Float32BufferAttribute(colours,3));g.setIndex(indices);g.computeVertexNormals();mountainParts.push(g);
  }
  // This merge also includes colours, used only by the panorama's stone peaks.
  function mergeMountains(parts){const out=new T.BufferGeometry(),buffers={position:[],normal:[],uv:[],color:[]};for(const g of parts){const v=g.index?g.toNonIndexed():g;for(const k of Object.keys(buffers))buffers[k].push(...v.attributes[k].array);if(v!==g)v.dispose();g.dispose();}for(const[k,v]of Object.entries(buffers))out.setAttribute(k,new T.Float32BufferAttribute(v,k==='uv'?2:3));out.computeBoundingSphere();return geometry(out);}
  const mountainMaterial=material(new T.MeshStandardMaterial({vertexColors:true,roughness:1,fog:false}));
  mountainMaterial.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRockPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRockPosition=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vRockPosition;
      float rockHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float rockNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(rockHash(i),rockHash(i+vec3(1,0,0)),f.x),mix(rockHash(i+vec3(0,1,0)),rockHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(rockHash(i+vec3(0,0,1)),rockHash(i+vec3(1,0,1)),f.x),mix(rockHash(i+vec3(0,1,1)),rockHash(i+vec3(1)),f.x),f.y),f.z);}
    `).replace('#include <color_fragment>',`#include <color_fragment>
      float rock=rockNoise(vRockPosition*.7)*.6+rockNoise(vRockPosition*2.7)*.27+rockNoise(vRockPosition*8.)*.13;
      diffuseColor.rgb*=.76+rock*.4;
    `);
  };
  mountainMaterial.customProgramCacheKey=()=> 'temple-rock-strata-v1';
  const mountains=mesh(mergeMountains(mountainParts),mountainMaterial);
  mountains.geometry.computeBoundingBox();
  // Every neighbouring summit sits below the temple: the visitor is at the
  // world's highest point, looking down over peaks emerging from the clouds.
  mountains.position.y=-mountains.geometry.boundingBox.max.y-3;
  const oceanUniforms={uTime:{value:0},uDay:{value:1}};
  const oceanMaterial=material(new T.ShaderMaterial({uniforms:oceanUniforms,side:T.DoubleSide,fog:false,toneMapped:false,
    vertexShader:'varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}',
    fragmentShader:`varying vec3 vWorld;uniform float uTime,uDay;void main(){float wave=sin(vWorld.x*.5+uTime*.13)*sin(vWorld.z*.8-uTime*.09);float fine=sin(vWorld.x*3.2+vWorld.z*1.8+uTime*.3);vec3 day=mix(vec3(.07,.32,.46),vec3(.35,.66,.73),.47+wave*.1);day+=pow(max(0.,fine),18.)*.055;vec3 night=vec3(.003,.016,.029)+pow(max(0.,fine),24.)*.009;gl_FragColor=vec4(mix(night,day,uDay),1.);#include <colorspace_fragment>}`.replace(';#include',';\n#include')
  }));
  const sea=mesh(geometry(new T.PlaneGeometry(240,350)),oceanMaterial,-124,-22,0);sea.rotation.x=-Math.PI/2;

  // A soft procedural billow field: one surface, no giant pile of translucent
  // spheres. It is deliberately below eye level, so the temple is the summit.
  const cloudUniforms={uTime:{value:0},uDay:{value:1}};
  const cloudMaterial=material(new T.ShaderMaterial({uniforms:cloudUniforms,transparent:true,depthWrite:false,side:T.DoubleSide,fog:false,toneMapped:false,
    vertexShader:`varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader:`varying vec3 vWorld;uniform float uTime,uDay;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float n=0.,a=.54;for(int i=0;i<5;i++){n+=a*noise(p);p=p*2.03+vec2(9.3,5.1);a*=.49;}return n;}
      void main(){vec2 p=vWorld.xz*.038+vec2(uTime*.0013,-uTime*.0007);float n=fbm(p),detail=fbm(p*3.4+vec2(5.3));float banks=smoothstep(.30,.62,n);float opening=smoothstep(20.,33.,length(vWorld.xz));float distant=smoothstep(105.,210.,length(vWorld.xz));float alpha=banks*opening*(.79+detail*.16);alpha=max(alpha,distant*.62);float light=.62+detail*.28+pow(max(0.,n),3.)*.28;vec3 day=mix(vec3(.68,.79,.86),vec3(1.,.96,.86),light);vec3 night=mix(vec3(.025,.045,.080),vec3(.16,.21,.29),light);gl_FragColor=vec4(mix(night,day,uDay),alpha);\n#include <colorspace_fragment>}`
  }));
  const cloudGeometry=geometry(new T.PlaneGeometry(380,380,46,46)),cloudPosition=cloudGeometry.attributes.position;
  // Low rolling height, rather than a flat fog sheet.
  for(let i=0;i<cloudPosition.count;i++){const x=cloudPosition.getX(i),y=cloudPosition.getY(i);cloudPosition.setZ(i,Math.sin(x*.037)*Math.cos(y*.029)*2.9+Math.sin(y*.067+x*.011)*1.1);}
  cloudGeometry.computeVertexNormals();const clouds=mesh(cloudGeometry,cloudMaterial,0,-10,0);clouds.rotation.x=-Math.PI/2;clouds.renderOrder=2;

  const daySky=new T.Group(),nightSky=new T.Group();root.add(daySky,nightSky);
  const skyUniforms={uTime:{value:0},uSun:{value:new T.Vector3(-.45,.65,-.62).normalize()}};
  const atmosphere=mesh(geometry(new T.SphereGeometry(205,32,20)),material(new T.ShaderMaterial({uniforms:skyUniforms,side:T.BackSide,depthWrite:false,depthTest:false,fog:false,toneMapped:false,
    vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vDirection;uniform float uTime;uniform vec3 uSun;
      float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);}
      void main(){vec3 d=normalize(vDirection);float h=pow(max(0.,d.y),.43);vec3 c=mix(vec3(.81,.90,.94),vec3(.085,.39,.73),h);float s=max(0.,dot(d,uSun));c+=pow(s,10.)*vec3(.20,.13,.03);c+=pow(s,95.)*vec3(.45,.34,.13);c+=smoothstep(.9990,.9996,s)*vec3(3.,2.5,1.7);float w=noise(d*12.+vec3(uTime*.001,0,0))*.65+noise(d*29.)*.25;float cirrus=smoothstep(.62,.78,w)*smoothstep(.04,.3,d.y);c=mix(c,vec3(.98,.98,.94),cirrus*.55);gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>}`
  })),0,0,0,daySky);atmosphere.renderOrder=-1000;atmosphere.frustumCulled=false;
  const celestial=createSky(nightSky,renderer);
  // Existing stars sit 59 m away in the intimate gallery. This panorama is
  // wider: move the entire celestial geometry behind the mountain ranges.
  nightSky.children[0].scale.setScalar(3.2);
  const ambient=new T.HemisphereLight(0xd5edff,0x898165,2.1),sun=new T.DirectionalLight(0xfff0c9,3.2),fill=new T.DirectionalLight(0xc4e0ff,.55);
  sun.position.set(-35,50,-30);fill.position.set(20,16,20);root.add(ambient,sun,fill);
  const nightAmbient=new T.HemisphereLight(0x9bbbea,0x352f42,.80),moon=new T.DirectionalLight(0xb9ccff,1.15);moon.position.set(-22,45,-28);root.add(nightAmbient,moon);

  function refreshTime(){const date=now(),next=Math.floor(date.getTime()/60000);if(next===minute)return false;minute=next;const h=date.getHours();day=h>=6&&h<20;daySky.visible=day;nightSky.visible=!day;ambient.visible=sun.visible=fill.visible=day;nightAmbient.visible=moon.visible=!day;cloudUniforms.uDay.value=oceanUniforms.uDay.value=day?1:0;return true;}
  refreshTime();
  function update(dt,eye,motion=true){
    if(disposed)return false;
    const changed=refreshTime();if(!root.visible)return changed;
    if(motion)time+=Math.min(.05,Math.max(0,dt));
    skyUniforms.uTime.value=cloudUniforms.uTime.value=oceanUniforms.uTime.value=time;
    daySky.position.copy(eye);celestial.update(dt,eye,motion&&!day);
    covers.forEach((cover,i)=>{const portal=portals[i],distance=Math.hypot(eye.x-portal.x,eye.z-portal.z);cover.material.opacity=T.MathUtils.smoothstep(distance,1.4,3.5);cover.visible=cover.material.opacity>.001;});
    if(lisbonPreview?.canvas&&covers[2].material.map&&motion)covers[2].material.map.needsUpdate=true;
    return changed||motion;
  }
  return {
    root,portals,update,
    setVisible(value){root.visible=!!value;},
    diagnostics:()=>({kind:'mountaintop antique temple',visible:root.visible,day,hour:now().getHours(),time:+time.toFixed(3),portals:portals.map(p=>({room:p.room,x:p.x,z:p.z,width:p.width,height:p.height})),columns:8,trees:6,flowers:flowers.length,covers:loaded+(lisbonPreview?.canvas?1:0),panorama:{sea:'left',mountains:'right',cloudSea:true,highestPeakY:-3,templeFloorY:0},stone:'procedural antique limestone',externalAssets:false}),
    dispose(){if(disposed)return;disposed=true;root.removeFromParent();const skyResources=new Set();root.traverse(o=>{if(o.geometry)skyResources.add(o.geometry);if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])skyResources.add(m);}});for(const item of [...skyResources,...textures,...geometries,...materials])item.dispose?.();}
  };
}
