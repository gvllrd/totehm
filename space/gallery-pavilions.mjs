import * as T from './vendor/three-0.180.0.mjs';

// Two of the filmed spaces: the double-wave reflecting court and the stepped
// seaside house. Everything is physical geometry, including the ribbon
// soffits, window recesses, pool edges and the deeply relieved limestone.
export function buildPavilions({materials,waterSurface,onChange=()=>{}}) {
  const ownedGeometry=new Set(),ownedMaterials=new Set();
  const geo=g=>(ownedGeometry.add(g),g),mat=m=>(ownedMaterials.add(m),m);
  const unit=geo(new T.BoxGeometry(1,1,1));
  const cylinder=geo(new T.CylinderGeometry(1,1,1,12));
  const sphere=geo(new T.SphereGeometry(1,20,14));
  const leafSphere=geo(new T.SphereGeometry(1,7,5));
  const concrete=materials.concrete,stone=materials.wetStone;
  const black=materials.black,glass=materials.glass,amber=materials.amber;
  const ivory=materials.limestone,rock=materials.rock;
  const foliage=mat(materials.foliage.clone());foliage.side=T.DoubleSide;
  const interior=mat(new T.MeshStandardMaterial({color:0x9a7953,emissive:0x5b3616,emissiveIntensity:.17,roughness:.86}));
  const linen=mat(new T.MeshStandardMaterial({color:0xc6bca7,roughness:.97}));
  const darkWood=mat(new T.MeshStandardMaterial({color:0x302a22,roughness:.78}));
  const bark=mat(new T.MeshStandardMaterial({color:0x575044,roughness:1}));
  const poolTile=mat(new T.MeshStandardMaterial({color:0x397e7b,roughness:.72}));
  const flameGold=mat(new T.MeshBasicMaterial({color:0xffb256,toneMapped:false,side:T.DoubleSide}));
  const flameCore=mat(new T.MeshBasicMaterial({color:0xffe0a1,toneMapped:false,side:T.DoubleSide}));
  const m4=new T.Matrix4(),p3=new T.Vector3(),q4=new T.Quaternion(),s3=new T.Vector3();
  let seed=98231;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function mesh(parent,g,m,x=0,y=0,z=0) {const object=new T.Mesh(g,m);object.position.set(x,y,z);parent.add(object);return object;}
  function box(parent,m,x,y,z,w,h,d,ry=0) {const object=mesh(parent,unit,m,x,y,z);object.scale.set(w,h,d);object.rotation.y=ry;return object;}
  function instanced(parent,g,m,transforms) {
    if(!transforms.length)return null;
    const object=new T.InstancedMesh(g,m,transforms.length);
    transforms.forEach((v,i)=>{
      p3.set(v[0],v[1],v[2]);s3.set(v[3]??1,v[4]??1,v[5]??1);
      q4.setFromEuler(new T.Euler(v[6]||0,v[7]||0,v[8]||0));m4.compose(p3,q4,s3);object.setMatrixAt(i,m4);
    });object.instanceMatrix.needsUpdate=true;object.computeBoundingSphere();parent.add(object);return object;
  }
  function batches(parent) {
    const sets=new Map();
    return {add(m,x,y,z,w,h,d,ry=0){if(!sets.has(m))sets.set(m,[]);sets.get(m).push([x,y,z,w,h,d,0,ry,0]);},flush(){for(const[m,values]of sets)instanced(parent,unit,m,values);sets.clear();}};
  }
  function segment(a,b,r) {
    const delta=new T.Vector3(...b).sub(new T.Vector3(...a));
    const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
    const e=new T.Euler().setFromQuaternion(q);
    return[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,delta.length(),r,e.x,e.y,e.z];
  }
  // Agave blades are curved ribbons with a sharp tip, rather than cones.
  function bladeGeometry() {
    const positions=[],uv=[],indices=[],n=12;
    for(let i=0;i<=n;i++){
      const u=i/n,width=.135*Math.pow(Math.sin(Math.PI*u),.8),height=.1+1.02*u-.15*Math.sin(Math.PI*u);
      for(const side of [-1,1]){positions.push(side*width,height,u*.85);uv.push((side+1)/2,u);}
      if(i<n){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return geo(g);
  }
  const blade=bladeGeometry();
  function agaves(parent,locations) {
    const transforms=[];
    for(const[x,y,z,size]of locations)for(let i=0;i<17;i++){
      const a=i*2.39996,scale=(.57+.43*random())*size;
      transforms.push([x,y,z,scale,scale,scale,.09+random()*.36,a,0]);
    }
    instanced(parent,blade,foliage,transforms);
  }
  function point(parent,x,y,z,power=15,distance=8) {const light=new T.PointLight(0xffce84,power,distance,2);light.position.set(x,y,z);parent.add(light);return light;}
  function water(parent,w,d,x,z,kind,y) {const result=waterSurface(w,d,x,z,kind,y);if(result)parent.add(result);return result;}
  function rocks(parent,positions,m=rock) {
    const g=geo(new T.SphereGeometry(1,24,16));const a=g.attributes.position;
    for(let i=0;i<a.count;i++){
      const x=a.getX(i),y=a.getY(i),z=a.getZ(i);
      const f=1+.09*Math.sin(x*8+z*5)+.05*Math.sin(y*17-z*8);a.setXYZ(i,x*f,y*f,z*f);
    }g.computeVertexNormals();instanced(parent,g,m,positions);
  }

  const pavilion=new T.Group();pavilion.name='The double-wave reflecting pavilion';
  const b=batches(pavilion);
  b.add(stone,0,-.46,-3.5,24,.6,45);
  // Water fills the axis; a dry arrival and two slim lateral margins remain.
  water(pavilion,10,34,0,-8,'water',-.06);
  b.add(concrete,0,-.13,13.5,24,.16,9);
  for(const x of [-6.05,6.05])b.add(concrete,x,-.13,-8,1.8,.16,34);
  b.add(concrete,0,-.13,-25.7,13.9,.16,1.4);
  water(pavilion,24,9,0,13.5,'wet',-.025);
  for(const x of [-6.05,6.05])water(pavilion,1.8,34,x,-8,'wet',-.025);
  for(const x of [-5.1,5.1])b.add(black,x,-.025,-8,.07,.025,34);
  // Thin pavement joints are deliberately dark and recessed, never emissive.
  for(let z=10;z<18;z+=2.2)b.add(black,0,-.042,z,23.7,.006,.012);
  for(const x of [-9,-6,-3,0,3,6,9])b.add(black,x,-.042,13.5,.012,.006,8.8);
  const agaveLocations=[],lowRocks=[];
  for(const side of [-1,1]) {
    // The inner facade is assembled around real warm door recesses.
    b.add(concrete,side*9.1,7.2,-7.7,5.8,1.4,35.6);
    b.add(concrete,side*11.1,3.0,-7.7,1.8,6.0,35.6);
    b.add(concrete,side*8.7,10.45,-7.7,6.6,.6,35.6);
    b.add(concrete,side*8.7,8.95,-7.7,6.2,.3,35.6);
    for(let i=0;i<4;i++) {
      const z=7.5-i*9;
      b.add(concrete,side*8.15,3.15,z+2.6,4.2,6.3,3.2);
      b.add(concrete,side*8.15,4.75,z-.15,4.2,3.1,2.3);
      b.add(interior,side*8.35,1.55,z-.15,1.2,3.1,2.15);
      b.add(amber,side*7.7,3.05,z-.15,.045,.035,1.82);
      b.add(stone,side*7.35,.01,z-.15,2.5,.05,2.16);
      // Upper-storey glass sits behind concrete reveals and fine mullions.
      const win=mesh(pavilion,geo(new T.PlaneGeometry(7.9,1.8)),glass,side*6.045,9.35,z-1.1);win.rotation.y=side===1?-Math.PI/2:Math.PI/2;
      b.add(black,side*6.025,9.35,z-1.1,.09,1.84,.065);
      for(const dz of [-3.99,0,3.99])b.add(black,side*6.00,9.35,z-1.1+dz,.09,1.86,.07);
      b.add(interior,side*7.7,9.35,z-1.1,.1,1.8,7.9);
      if(i<3){
        const pz=6-i*10; b.add(black,side*5.55,.25,pz,1.12,.48,1.12);
        b.add(stone,side*5.55,.50,pz,1.02,.035,1.02);agaveLocations.push([side*5.55,.52,pz,.82]);
      }
    }
    b.add(amber,side*6.05,.095,-7.5,.022,.025,34.5);
    for(const z of [-3,-14]){
      // The lower piers visually carry the sinusoidal overhead bridges.
      b.add(concrete,side*8.9,3.25,z,5.5,6.5,2.6);
      b.add(concrete,side*6.3,3.25,z,1.1,6.5,2.6);
    }
    lowRocks.push([side*4.8,.18,-6.4,.70,.29,.52,0,.3*side,0],[side*4.9,.16,-17.4,.83,.25,.48,0,.9*side,0]);
  }
  b.flush();agaves(pavilion,agaveLocations);rocks(pavilion,lowRocks);

  function waveBridge(z,phase) {
    const positions=[],uvs=[],indices=[],segments=160,width=2.4,thickness=.43;
    const height=x=>8.5+1.9*Math.sin(x*.268+phase);
    // Independent vertices keep the four long surfaces crisply edged, while
    // 160 segments retain a smooth wave at the near end of the camera move.
    for(let face=0;face<4;face++)for(let i=0;i<=segments;i++) {
      const x=-11.6+i/segments*23.2,h=height(x);
      const corners=[[-width/2,0],[width/2,0],[width/2,-thickness],[-width/2,-thickness]];
      const a=corners[face],c=corners[(face+1)%4];
      positions.push(x,h+a[1],z+a[0],x,h+c[1],z+c[0]);uvs.push(i/segments*8,0,i/segments*8,1);
      if(i<segments){const j=(face*(segments+1)+i)*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
    }
    const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
    // Winding faces outwards on the top, underside and vertical lips.
    mesh(pavilion,g,concrete);
    const points=[];for(let i=0;i<=160;i++){const x=-11.55+i/160*23.1;points.push(new T.Vector3(x,height(x)-thickness-.01,z+width/2-.10));}
    const curve=new T.CatmullRomCurve3(points);mesh(pavilion,geo(new T.TubeGeometry(curve,160,.017,5,false)),amber);
  }
  waveBridge(-3,-.6);waveBridge(-14,1.05);
  // The small fire is the one bright focal point at the vanishing point.
  box(pavilion,black,0,.04,-23.7,2.85,.22,1.65);
  box(pavilion,stone,0,.16,-23.7,2.25,.12,1.1);
  box(pavilion,black,0,.24,-23.7,1.72,.075,.68);
  const flames=[];
  for(let i=0;i<5;i++) {
    const shape=new T.Shape();shape.moveTo(-.13,0);shape.bezierCurveTo(-.28,.19,-.10,.32,0,.64);shape.bezierCurveTo(.05,.31,.27,.18,.13,0);shape.closePath();
    const object=mesh(pavilion,geo(new T.ShapeGeometry(shape,12)),i%2?flameCore:flameGold,(i-2)*.25,.28,-23.68+(i%2)*.10);object.rotation.y=i*.7;flames.push(object);
  }
  point(pavilion,0,.8,-23.6,22,8);point(pavilion,-6.4,2.1,5.7,16,6);point(pavilion,6.4,2.1,5.7,16,6);point(pavilion,0,8,-9,10,14);

  const coast=new T.Group();coast.name='The illuminated cliffside sea terrace';
  const c=batches(coast);
  // A continuous, weather-cut limestone cliff replaces a stack of primitive
  // rocks. Multiple spatial frequencies reveal coarse ledges and fine chips.
  function cliffGeometry() {
    const vertices=[],uv=[],indices=[],ny=75,nz=118;
    for(let j=0;j<=nz;j++)for(let i=0;i<=ny;i++) {
      const y=-27+i/ny*45,z=-31+j/nz*58;
      const broad=Math.sin(z*.19+y*.11)*.80+Math.sin(z*.43-y*.13)*.45;
      const strata=Math.sin(y*1.75+Math.sin(z*.4)*.6)*.23+Math.sin(y*4.3+z*1.6)*.10;
      const chips=Math.sin(y*7.3+z*5.7)*Math.cos(y*3.8-z*6.1)*.10;
      const base=-16.7+Math.max(0,-y-7)*.19;
      vertices.push(base+broad+strata+chips,y,z);uv.push(z*.13,y*.13);
      if(i<ny&&j<nz){const a=j*(ny+1)+i,b=a+1,d=a+ny+1,e=d+1;indices.push(a,b,d,b,e,d);}
    }
    const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  mesh(coast,cliffGeometry(),ivory);
  // Rounded irregular outcrops give the lower shoreline a continuous body.
  const outcrops=[];
  for(let i=0;i<21;i++)outcrops.push([-10+random()*3,-20+random()*3,-25+i*2.4,4.0+random(),6.5+random()*3,2.8+random()*1.4,random()*.2,random(),random()*.3]);
  rocks(coast,outcrops,ivory);
  // Three recessed storeys. The structure remains open at the seaward side,
  // so golden rooms and furniture are genuinely behind the dark glazing.
  for(let level=0;level<3;level++) {
    const y=-6+level*6,east=-4.7-level*.65,west=-15.8,front=5-level*1.3,rear=-23;
    c.add(concrete,(west+east)/2,y-.21,(front+rear)/2,east-west+.6,.42,front-rear+.6);
    c.add(concrete,(west+east)/2,y+5.65,(front+rear)/2,east-west+.9,.50,front-rear+.9);
    c.add(concrete,west+.25,y+2.7,(front+rear)/2,.55,5.5,front-rear);
    c.add(concrete,(west+east)/2,y+2.7,rear,(east-west),5.5,.55);
    c.add(interior,west+1.2,y+2.6,(front+rear)/2,.1,5.2,front-rear-.8);
    c.add(interior,(west+east)/2,y+.015,(front+rear)/2,east-west-.4,.07,front-rear-.6);
    for(let bay=0;bay<5;bay++) {
      const z=front-2.4-bay*5.0;
      // An actual recessed pane, with 45 mm bronze-black mullions.
      const pane=mesh(coast,geo(new T.PlaneGeometry(4.86,5.1)),glass,east+.015,y+2.72,z);pane.rotation.y=Math.PI/2;
      c.add(black,east+.045,y+2.7,z-2.46,.07,5.36,.055);
      c.add(black,east+.045,y+2.7,z+2.46,.07,5.36,.055);
      c.add(black,east+.045,y+.16,z,.07,.10,4.98);
      c.add(black,east+.045,y+5.32,z,.07,.10,4.98);
      c.add(amber,west+2.5,y+5.22,z,.025,.025,4.4);
      if(bay%2===0){
        c.add(linen,west+3.0,y+.43,z,2.0,.55,1.05);
        c.add(linen,west+2.3,y+.8,z,.65,.95,1.1);
        c.add(darkWood,west+4.9,y+.32,z,1.1,.16,1.4);
      }
    }
    // Full-height corner glazing faces the far end of the terrace as well.
    const frontPane=mesh(coast,geo(new T.PlaneGeometry(east-west-.6,5.08)),glass,(west+east)/2,y+2.7,front+.02);
    c.add(black,(west+east)/2,y+2.7,front+.04,.07,5.4,.06);
    c.add(concrete,east-.05,y+2.7,rear+.3,.7,5.4,.7);
    if(level>0){
      // Slim balconies and transparent balustrades do not conceal the rooms.
      c.add(concrete,east+1.15,y-.15,-6.7,2.4,.27,21.2);
      const rail=mesh(coast,geo(new T.PlaneGeometry(21.0,1.05)),glass,east+2.28,y+.55,-6.7);rail.rotation.y=Math.PI/2;
      c.add(black,east+2.29,y+1.10,-6.7,.025,.025,21.0);
      for(const z of [-16,-10,-4,2])c.add(black,east+2.29,y+.54,z,.025,1.10,.025);
    }
  }
  // The main deck and its cantilevered infinity pool sit one storey below the
  // camera, matching the reference's elevated view over the whole coastline.
  // The structural plate is below the pool bottom. The deck itself is four
  // strips around a real aperture: a continuous plate at deck height would
  // hide the reflective water by five millimetres.
  c.add(concrete,-2.3,-8.55,-1.9,21.5,.65,26.6);
  c.add(concrete,-8.125,-6.38,-1.9,9.85,.65,26.6);
  c.add(concrete,7.825,-6.38,-1.9,1.25,.65,26.6);
  c.add(concrete,2,-6.38,9.825,10.4,.65,3.15);
  c.add(concrete,2,-6.38,-13.725,10.4,.65,2.95);
  c.add(concrete,7.37,-10.4,-2,.58,8.7,20.6);
  c.add(concrete,2.0,-10.35,8.36,10.8,8.6,.54);
  c.add(concrete,-3.20,-6.50,-2,.42,.95,20.8);
  c.add(concrete,2,-6.50,-12.23,10.8,.95,.42);
  c.add(poolTile,2,-7.72,-2,10,.15,20);
  c.add(poolTile,7.04,-6.91,-2,.10,1.65,20);
  c.add(poolTile,2,-6.91,-12.03,10,1.65,.10);
  water(coast,10,20,2,-2,'pool',-6.06);
  // Narrow wet copings and underwater access steps.
  c.add(ivory,-3.30,-5.99,-2,.30,.15,20.7);
  c.add(ivory,7.20,-5.99,-2,.24,.15,20.7);
  c.add(ivory,2,-5.99,-12.25,10.8,.15,.26);
  c.add(ivory,2,-5.99,8.25,10.8,.15,.26);
  for(let i=0;i<4;i++)c.add(ivory,-1.7,-6.20-i*.31,7.15-i*.49,2.0,.19,.55);
  // Paving joints remain subtle and follow the real deck, never the water.
  for(let z=-14;z<11;z+=2.0)c.add(stone,-9.2,-6.035,z,11.3,.007,.014);
  for(const x of [-14,-12,-10,-8,-6,-4])c.add(stone,x,-6.035,-1.8,.014,.007,25.7);
  // Ecru loungers, linen cushions and dark timber legs face the open sea.
  for(let i=0;i<4;i++) {
    const z=5.9-i*4.4,x=-5.65;
    c.add(darkWood,x,-5.65,z,1.05,.20,2.65);
    c.add(linen,x,-5.46,z+.28,1.04,.25,1.95);
    // The inclined back is a physical cushion, shared in one instance batch.
    const cushion=box(coast,linen,x,-5.16,z-.87,1.03,.19,1.0);cushion.rotation.x=-.43;
    c.add(linen,x,-5.10,z-.88,.82,.17,.43);
    for(const dx of [-.38,.38])for(const dz of [-.95,.95])c.add(darkWood,x+dx,-5.86,z+dz,.075,.40,.075);
  }
  // A quiet low lounge under the lowest overhang, with no fake occupants.
  c.add(darkWood,-8.8,-5.69,-16.2,4.8,.37,1.6);
  c.add(linen,-8.8,-5.43,-16.2,4.6,.34,1.5);
  c.add(linen,-8.8,-5.0,-16.82,4.6,1.05,.3);
  c.add(darkWood,-7.7,-5.61,-13.7,2.1,.16,1.55);
  c.add(amber,-7.7,-5.48,-13.7,.50,.035,.40);
  // Raised observation walk: solid floor, fine glass rail, no step into the
  // lower pool. The navigation module bounds movement to this real platform.
  c.add(concrete,12.5,-.25,14.5,7,.5,9);
  c.add(concrete,15.8,-5.2,14.5,.4,10.5,9);
  for(const z of [10,19]){
    const pane=mesh(coast,geo(new T.PlaneGeometry(7,1.08)),glass,12.5,.55,z);c.add(black,12.5,1.1,z,7,.025,.025);
    for(const x of [9.1,12.5,15.9])c.add(black,x,.55,z,.028,1.1,.028);
  }
  const sideRail=mesh(coast,geo(new T.PlaneGeometry(9,1.08)),glass,9,.55,14.5);sideRail.rotation.y=Math.PI/2;
  c.add(black,9,1.1,14.5,.025,.025,9);
  // Lit lower stair and retaining wall continue the reference below the pool.
  for(let i=0;i<18;i++){
    const y=-6-i*.20,z=11.1+i*.32;c.add(concrete,-6.0,y-.13,z,3.0,.25,.36);
    if(i%3===0)c.add(amber,-7.46,y+.01,z,.03,.07,.22);
  }
  c.add(concrete,-7.75,-7.8,13.8,.35,4.1,6.8);
  c.add(amber,-4.58,-5.80,-6,.025,.035,20.6);
  c.flush();
  const coastalAgaves=[];
  for(const[x,z,size]of [[-13,6.8,1.2],[-12,-11,1.1],[-4.1,-14.1,.8],[7.8,8.8,.9],[-13.2,11,1.1]]){
    const pot=mesh(coast,geo(new T.CylinderGeometry(.55,.40,.8,28)),stone,x,-5.6,z);coastalAgaves.push([x,-5.2,z,size]);
  }
  agaves(coast,coastalAgaves);
  function olive(x,z,size) {
    const y=-6,branches=[],leaves=[];
    branches.push(segment([x,y,z],[x+.11*size,y+2.15*size,z-.08*size],.10*size));
    for(let i=0;i<8;i++) {
      const angle=i*2.39996,tip=[x+Math.cos(angle)*size,y+(2.2+random()*.8)*size,z+Math.sin(angle)*size];
      branches.push(segment([x+.05*size,y+1.25*size,z],tip,.036*size));
      for(let j=0;j<55;j++){
        const a=random()*Math.PI*2,u=random()*2-1,r=Math.sqrt(1-u*u),spread=(.38+random()*.28)*size;
        leaves.push([tip[0]+Math.cos(a)*r*spread,tip[1]+u*spread*.72,tip[2]+Math.sin(a)*r*spread,.045*size,.13*size,.025*size,random()*6,random()*6,random()*6]);
      }
    }
    instanced(coast,cylinder,bark,branches);instanced(coast,leafSphere,foliage,leaves);
  }
  olive(-13.6,-4,1.15);olive(-13.3,8.8,1.0);olive(-10.8,-19.4,.9);
  point(coast,-14.25,-2.9,6,50,10);point(coast,-14.2,3.4,-5,36,10);point(coast,-10.5,-3.8,-16.1,35,13);point(coast,-4.8,-7.2,12.2,23,8);
  onChange();
  let fireTime=0;
  const sets=[
    {id:'pavilion',name:'Pavilion',root:pavilion,portals:[],view:{position:[0,1.65,14],target:[0,4.2,-20]},waterHeight:-.06,
      update(dt,eye,motion=true){if(!motion)return;fireTime+=Math.min(dt,.05);flames.forEach((flame,i)=>{flame.scale.y=.83+.17*Math.sin(fireTime*5.1+i*1.8);flame.rotation.y=i*.7+Math.sin(fireTime*1.4+i)*.13;});},
      diagnostics:()=>({bridges:2,curvedSegments:160,water:'planar reflection',doors:8,localLights:4})},
    {id:'coast',name:'Sea view',root:coast,portals:[],view:{position:[15.2,7.5,18],target:[-4,-3,-4]},waterHeight:-6.06,
      update(){},diagnostics:()=>({storeys:3,water:'planar reflection',pool:'turquoise infinity',localLights:4,overlook:[9,16,10,19]})}
  ];
  // Shared parent materials/textures belong to the environment, not this set.
  sets.dispose=()=>{for(const g of ownedGeometry)g.dispose();for(const m of ownedMaterials)m.dispose();pavilion.removeFromParent();coast.removeFromParent();};
  return sets;
}
