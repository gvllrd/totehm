import * as T from './vendor/three-0.180.0.mjs';
import { TOTEHMPAPER, ORIGINS } from './gallery-artworks.mjs';

// The two architectural spaces are built in metres, rather than projected
// photographs. Everything, including the small recess lights, belongs to its
// own root so none of the courtyard can leak into the black art corridors.
export function buildCourtyards({materials, waterSurface, lisbonPreview, onChange=()=>{}}) {
  const geometries=new Set(),localMaterials=new Set(),textures=new Set();
  const geometry=g=>(geometries.add(g),g),material=m=>(localMaterials.add(m),m);
  const texture=t=>{textures.add(t);t.colorSpace=T.SRGBColorSpace;return t;};
  const box=geometry(new T.BoxGeometry(1,1,1));
  const plane=geometry(new T.PlaneGeometry(1,1));
  const matrix=new T.Matrix4(),position=new T.Vector3(),quaternion=new T.Quaternion(),scale=new T.Vector3();
  let seed=194326,disposed=false,loaded=0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const roots=[];
  function mesh(parent,g,m,x=0,y=0,z=0,sx=1,sy=1,sz=1) {
    const object=new T.Mesh(g,m);object.position.set(x,y,z);object.scale.set(sx,sy,sz);object.receiveShadow=true;object.castShadow=true;parent.add(object);return object;
  }
  function instances(parent,g,m,items,name) {
    const object=new T.InstancedMesh(g,m,items.length);object.name=name;
    items.forEach((v,i)=>{
      position.set(v[0],v[1],v[2]);scale.set(v[3]??1,v[4]??1,v[5]??1);
      quaternion.setFromEuler(new T.Euler(v[6]||0,v[7]||0,v[8]||0));matrix.compose(position,quaternion,scale);object.setMatrixAt(i,matrix);
    });
    object.instanceMatrix.needsUpdate=true;object.computeBoundingSphere();object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
  }
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
  const shadowContext=shadowCanvas.getContext('2d'),gradient=shadowContext.createRadialGradient(64,64,3,64,64,64);
  gradient.addColorStop(0,'rgba(0,0,0,.70)');gradient.addColorStop(.45,'rgba(0,0,0,.40)');gradient.addColorStop(1,'rgba(0,0,0,0)');
  shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,128,128);
  const ao=material(new T.MeshBasicMaterial({map:texture(new T.CanvasTexture(shadowCanvas)),transparent:true,depthWrite:false,toneMapped:false,fog:false}));
  const leafMaterial=material(materials.foliage.clone());leafMaterial.side=T.DoubleSide;

  // A rounded but irregular weathered boulder, with enough smooth facets to
  // retain its weight under grazing light. One geometry serves all boulders.
  const boulder=geometry(new T.SphereGeometry(1,18,12)),boulderPosition=boulder.attributes.position;
  for(let i=0;i<boulderPosition.count;i++){
    const x=boulderPosition.getX(i),y=boulderPosition.getY(i),z=boulderPosition.getZ(i);
    const distortion=1+.085*Math.sin(x*7.2+z*4.3)*Math.cos(y*6.4)+.045*Math.sin(z*11-y*3);
    boulderPosition.setXYZ(i,x*distortion,y*(.88+.09*Math.sin(z*5+x*8)),z*distortion);
  }
  boulder.computeVertexNormals();
  const pebble=geometry(new T.SphereGeometry(1,8,6));

  // Folded tapering ribbons form individual fleshy agave leaves. There are no
  // spherical plant crowns or billboard pictures in either architectural view.
  function agaveGeometry() {
    const positions=[],indices=[],uvs=[];
    for(let leaf=0;leaf<24;leaf++){
      const inner=leaf>=16,a=leaf*(Math.PI*2/16)+(inner?.28:0),radius=inner?.36+(leaf%3)*.055:.80+(leaf%4)*.085;
      const height=inner?1.18-(leaf%3)*.10:.38+(leaf%5)*.075,steps=7,start=positions.length/3;
      for(let i=0;i<=steps;i++){
        const t=i/steps,r=radius*Math.pow(t,.78),width=(inner?.072:.105)*Math.pow(Math.sin(Math.PI*t),.58)+.001;
        const y=height*t+.13*Math.sin(Math.PI*t),cx=Math.sin(a)*r,cz=Math.cos(a)*r,dx=Math.cos(a)*width,dz=-Math.sin(a)*width;
        positions.push(cx-dx,y,cz-dz,cx,y+.045*Math.sin(Math.PI*t),cz,cx+dx,y,cz+dz);
        uvs.push(0,t,.5,t,1,t);
      }
      for(let i=0;i<steps;i++){const q=start+i*3;indices.push(q,q+3,q+1,q+1,q+3,q+4,q+1,q+4,q+2,q+2,q+4,q+5);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return geometry(g);
  }
  const agave=agaveGeometry();
  function gardens(parent,beds) {
    const rocks=[],pebbles=[],plants=[],shadows=[],soil=[];
    for(const [x,z,s=1]of beds){
      soil.push([x,-.012,z,2.7*s,.045,3.4*s]);
      for(let i=0;i<3;i++){
        const px=x+(random()-.5)*1.9*s,pz=z+(random()-.5)*2.7*s,r=(.52+random()*.59)*s;
        rocks.push([px,.28*r,pz,r,.58*r,.73*r,random()*.25,random()*6,random()*.18]);
        shadows.push([px,.002,pz,r*2.7,r*2.2,1,-Math.PI/2,0,0]);
      }
      for(let i=0;i<44;i++){
        const a=random()*Math.PI*2,r=Math.sqrt(random());
        const px=x+Math.cos(a)*r*1.5*s,pz=z+Math.sin(a)*r*1.8*s,k=(.10+random()*.13)*s;
        pebbles.push([px,k*.35,pz,k,.60*k,k*(.7+random()*.5),random()*.4,random()*6,random()*.35]);
      }
      for(let i=0;i<3;i++){
        const size=(.58+random()*.28)*s,px=x+(i-1)*.69*s,pz=z+(.72-i*.50)*s;
        plants.push([px,.035,pz,size,size,size,0,random()*Math.PI*2,0]);
        shadows.push([px,.004,pz,size*2,size*2,1,-Math.PI/2,0,0]);
      }
    }
    instances(parent,box,materials.black,soil,'Recessed gravel garden beds');
    const rockMesh=instances(parent,boulder,materials.rock,rocks,'Weathered irregular boulders');
    rocks.forEach((_,i)=>rockMesh.setColorAt(i,new T.Color().setHSL(.55,.035,.72+random()*.22)));rockMesh.instanceColor.needsUpdate=true;
    const pebbleMesh=instances(parent,pebble,materials.rock,pebbles,'River pebbles');
    pebbles.forEach((_,i)=>pebbleMesh.setColorAt(i,new T.Color().setHSL(.53,.025,.61+random()*.36)));pebbleMesh.instanceColor.needsUpdate=true;
    const plantsMesh=instances(parent,agave,leafMaterial,plants,'Sculptural blue-green agaves');
    plants.forEach((_,i)=>plantsMesh.setColorAt(i,new T.Color().setHSL(.47+random()*.025,.20,.65+random()*.23)));plantsMesh.instanceColor.needsUpdate=true;
    const shadowMesh=instances(parent,plane,ao,shadows,'Soft contact shadows');shadowMesh.castShadow=false;shadowMesh.receiveShadow=false;shadowMesh.renderOrder=1;
    return {beds:beds.length,rocks:rocks.length,pebbles:pebbles.length,agaves:plants.length};
  }

  function newRoot(name){const root=new T.Group();root.name=name;roots.push(root);return root;}
  function water(parent,width,depth,x,z,kind='water',y=-.06) {
    const surface=waterSurface(width,depth,x,z,kind,y);surface.name=kind==='water'?'Reflecting pool':'Sea at the threshold';parent.add(surface);return surface;
  }
  const court=newRoot('Monumental concrete courtyard');
  // Four continuous surfaces surround a sunken pool; there is no opaque plane
  // floating on top of the water. The first foreground slab is the entry.
  instances(court,box,materials.wetStone,[
    [-6.1,-.21,-5,7.8,.28,26],[6.1,-.21,-5,7.8,.28,26],
    [0,-.21,13,20,.28,10],[0,-.21,-21,20,.28,6]
  ],'Wet courtyard paving');
  instances(court,box,materials.black,[
    [0,-.43,-5,4.4,.10,26],[-2.25,-.22,-5,.12,.43,26.2],[2.25,-.22,-5,.12,.43,26.2],
    [0,-.22,8.05,4.5,.43,.12],[0,-.22,-18.05,4.5,.43,.12]
  ],'Dark basin lining');
  water(court,4.4,26,0,-5);
  water(court,19,9,0,13,'wet',-.025);
  water(court,6.5,26,-5.6,-5,'wet',-.025);
  water(court,6.5,26,5.6,-5,'wet',-.025);
  // Thin warm lines run underneath the coping, not neon bars on the paving.
  instances(court,box,materials.amber,[
    [-2.193,-.037,-5,.018,.018,25.8],[2.193,-.037,-5,.018,.018,25.8],
    [-9.45,.045,-3,.018,.028,40],[9.45,.045,-3,.018,.028,40]
  ],'Recessed amber water-edge lighting');
  const steps=[];
  for(const z of [-2.1,-10.7])for(let i=0;i<5;i++)steps.push([-1.74+i*.87,.025,z,.77,.12,1.17]);
  instances(court,box,materials.wetStone,steps,'Stepping stones across the reflecting pool');
  // A spare basalt seat and irregular waterside rocks give the reflected
  // architecture scale without filling the symmetrical central sight line.
  instances(court,box,materials.black,[[-5.6,.35,3.3,2.0,.26,.69],[5.8,.35,-9.3,2.1,.26,.68]],'Basalt garden benches');
  instances(court,box,materials.rock,[[-6.34,.14,3.3,.24,.28,.55],[-4.86,.14,3.3,.24,.28,.55],[5.03,.14,-9.3,.25,.28,.55],[6.57,.14,-9.3,.25,.28,.55]],'Stone bench feet');

  // The near walls are twenty-seven metres high. Real missing lower pieces
  // form the narrow glowing embrasures; the upper concrete stays continuous.
  const wallPieces=[],recessFaces=[],recessFrames=[],upperWindowReveals=[];
  for(const side of [-1,1]){
    const x=side*10.65,openings=[-16,-5,7],half=.55;
    wallPieces.push([x,14.9,-3,2.3,24.2,42]);
    let edge=-24;
    for(const z of openings){const end=z-half;wallPieces.push([x,1.4,(edge+end)/2,2.3,2.8,end-edge]);edge=z+half;}
    wallPieces.push([x,1.4,(edge+18)/2,2.3,2.8,18-edge]);
    for(const z of openings){
      recessFaces.push([side*11.76,1.4,z,.035,2.72,1.07]);
      recessFrames.push([side*10.5,-.035,z,2.5,.05,1.1],[side*10.5,2.81,z,2.5,.055,1.1]);
    }
    // Rear towers meet the ground and rise continuously above the main
    // walls. Their inner faces stay beyond the two outside portal jambs.
    wallPieces.push([side*9,17,-19.7,2,34,8.6]);
    upperWindowReveals.push([side*7.976,15,-18.3,.026,3.35,1.48]);
    recessFaces.push([side*7.955,15.0,-18.3,.025,3.1,1.25]);
  }
  instances(court,box,materials.concrete,wallPieces,'Monumental board-formed concrete walls');
  instances(court,box,materials.concrete,recessFrames,'Deep embrasure reveals');
  instances(court,box,materials.black,upperWindowReveals,'Dark upper window reveals');
  instances(court,box,materials.amber,recessFaces,'Warm recessed interior surfaces');
  for(const side of [-1,1])for(const z of [-5,7]){
    const light=new T.PointLight(0xffbd77,52,7.5,2);light.position.set(side*9.05,1.4,z);court.add(light);
  }
  // The rear wall is pieced around three actual rectangular tunnels. Each
  // dark opening has two jambs, a soffit, and an independent recessed back.
  const doorwayXs=[-6.4,0,6.4],backWall=[],tunnelPieces=[];
  let edge=-9.5;
  for(const x of doorwayXs){
    backWall.push([(edge+x-1.1)/2,2.25,-23,(x-1.1)-edge,4.5,2]);edge=x+1.1;
    tunnelPieces.push([x-1.13,2.25,-22.65,.06,4.5,1.5],[x+1.13,2.25,-22.65,.06,4.5,1.5],[x,4.53,-22.65,2.32,.06,1.5],[x,-.025,-22.65,2.2,.05,1.5]);
  }
  backWall.push([(edge+9.5)/2,2.25,-23,9.5-edge,4.5,2],[0,7.25,-23,19,5.5,2]);
  instances(court,box,materials.concrete,backWall,'Rear wall around three rectangular portals');
  instances(court,box,materials.black,tunnelPieces,'Portal tunnel reveals');
  instances(court,box,materials.amber,doorwayXs.flatMap(x=>[[x-1.10,2.25,-22.01,.014,4.45,.014],[x+1.10,2.25,-22.01,.014,4.45,.014],[x,4.48,-22.01,2.2,.014,.014]]),'Fine portal reveal light');

  const covers=[],portals=[];
  const coverNames=['TotehmPaper {THP}','Origins','Neuro Street Art Digital'];
  function plaque(title) {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;
    const context=canvas.getContext('2d');context.clearRect(0,0,1024,128);context.fillStyle='#c1c6c8';context.textAlign='center';context.font='32px monospace';context.fillText(title.toUpperCase(),512,77);
    return texture(new T.CanvasTexture(canvas));
  }
  doorwayXs.forEach((x,room)=>{
    const opening=mesh(court,plane,materials.black,x,2.25,-23.46,2.2,4.5,1);opening.userData={room,portal:true};
    const aspect=room===1?ORIGINS[0].aspect:room===0?1:1.48;
    const width=room===1?1.42:1.78,height=width/aspect;
    const coverMaterial=material(new T.MeshBasicMaterial({transparent:true,opacity:1,color:0x000000,toneMapped:false,fog:false,depthWrite:false}));
    const cover=mesh(court,plane,coverMaterial,x,2.37,-21.96,width,height,1);cover.castShadow=false;cover.receiveShadow=false;cover.userData={room,portal:true};
    if(room===2&&lisbonPreview?.canvas){coverMaterial.map=texture(new T.CanvasTexture(lisbonPreview.canvas));coverMaterial.color.set(0xffffff);}
    else if(room<2){
      const image=new Image();image.onload=()=>{if(disposed)return;const t=texture(new T.Texture(image));t.needsUpdate=true;coverMaterial.map=t;coverMaterial.color.set(0xffffff);coverMaterial.needsUpdate=true;loaded++;onChange();};image.src=room===0?TOTEHMPAPER.src:ORIGINS[0].src;
    }
    const nameMaterial=material(new T.MeshBasicMaterial({map:plaque(coverNames[room]),transparent:true,toneMapped:false,fog:false,depthWrite:false}));
    const name=mesh(court,plane,nameMaterial,x,5.15,-21.98,3.9,.49,1);name.castShadow=false;name.receiveShadow=false;
    covers.push({room,x,z:-22,mesh:cover,material:coverMaterial});
    portals.push({room,x,z:-22,width:2.2,height:4.5,pickables:[opening,cover],approach:{x,z:-20.9}});
  });
  // Fine vertical streams are actual three-dimensional filaments, only
  // revealed beyond the central dark threshold when its cover dissolves.
  const streamMaterial=material(new T.MeshBasicMaterial({color:0xc7dbd9,transparent:true,opacity:.31,toneMapped:false,fog:false,depthWrite:false}));
  const streams=[];for(let i=0;i<35;i++)streams.push([-.97+i/34*1.94,1.75,-23.34,.007+random()*.008,3.38,.014]);
  instances(court,box,streamMaterial,streams,'Fine falling water at the far threshold');
  instances(court,box,materials.amber,[[0,3.49,-23.30,2.04,.018,.04],[0,.06,-23.30,2.04,.018,.04]],'Waterfall concealed light');
  const gardenCounts=gardens(court,[[-6.5,8.0,1],[-6.5,-3.2,1],[-6.5,-14.2,1],[6.5,8.0,1],[6.5,-3.2,1],[6.5,-14.2,1]]);
  const waterRocks=[[-3.15,.23,4.8,1.3,.7,.95,0,.6,0],[3.24,.29,-5.9,1.45,.8,1.04,.04,2.0,.1],[-3.2,.24,-14.1,1.20,.71,.91,.1,-.3,0],[3.35,.25,3.5,1.06,.67,.97,0,.2,.1]];
  instances(court,boulder,materials.rock,waterRocks,'Large pool-edge boulders');

  const passage=newRoot('Concrete passage toward the misty sea');
  instances(passage,box,materials.concrete,[[-6,3.5,-7,2,7,34],[6,3.5,-7,2,7,34]],'Paired seven-metre passage walls');
  instances(passage,box,materials.wetStone,[[-3.25,-.21,-7,3.5,.28,34],[3.25,-.21,-7,3.5,.28,34],[0,-.21,14,10,.28,8]],'Passage wet-stone ledges');
  instances(passage,box,materials.black,[[0,-.43,-7,3,.10,34],[-1.53,-.22,-7,.07,.43,34],[1.53,-.22,-7,.07,.43,34]],'Passage canal lining');
  water(passage,3,34,0,-7);
  water(passage,2.6,34,-3.2,-7,'wet',-.025);
  water(passage,2.6,34,3.2,-7,'wet',-.025);
  water(passage,9,8,0,14,'wet',-.025);
  // Its open far end meets a vast water plane below the horizon: no picture
  // wall or sky-coloured blocker interrupts the actual distant panorama.
  water(passage,230,300,0,-174,'ocean',-.09);
  const passageGardens=gardens(passage,[[-4.06,7.2,.44],[4.06,7.2,.44]]);
  instances(passage,box,materials.wetStone,[[-3.25,-.21,-24.28,3.5,.28,.55],[3.25,-.21,-24.28,3.5,.28,.55]],'Open-ended passage stone caps');

  function update(dt,eye,animate=true) {
    const x=eye?.x??0,z=eye?.z??14;let changed=false;
    for(const cover of covers){
      const distance=Math.hypot(x-cover.x,z-cover.z),opacity=T.MathUtils.smoothstep(distance,.65,3.25);
      if(Math.abs(cover.material.opacity-opacity)>.001){cover.material.opacity=opacity;changed=true;}
      if(cover.room===2&&cover.material.map&&animate&&opacity>.01){cover.material.map.needsUpdate=true;changed=true;}
    }
    return changed;
  }
  function dispose(){
    if(disposed)return;disposed=true;
    for(const root of roots){root.traverse(object=>{if(object.isInstancedMesh)object.dispose();});root.removeFromParent();}
    for(const item of geometries)item.dispose();for(const item of localMaterials)item.dispose();for(const item of textures)item.dispose();
  }
  return [
    {id:'courtyard',name:'Courtyard',root:court,portals,view:{position:[0,1.65,14],target:[0,5,-22]},update,diagnostics:()=>({kind:'courtyard',rectangularPortals:3,wallHeight:27,towerHeight:34,pool:{width:4.4,length:26},...gardenCounts,coversLoaded:loaded}),dispose},
    {id:'passage',name:'Passage',root:passage,portals:[],view:{position:[0,1.65,14],target:[0,1.65,-32]},update:()=>false,diagnostics:()=>({kind:'passage',wallHeight:7,pool:{width:3,length:34},openHorizon:true,...passageGardens}),dispose}
  ];
}
