import * as T from './vendor/three-0.180.0.mjs';
import {WORLD_RADIUS,WORLD_CENTER_Y} from './gallery-drowned-planet.mjs';

// The submerged Statue of Liberty in the drowned New York space.
// Submerged in the rolling ocean: pedestal, feet and lower robes rest deep beneath
// the sea, while the crowned head, seven rays and raised gilded torch rise above the waves.
const LOCAL_FOOT_Y=-87;
export const LIBERTY_LOCATION=Object.freeze({x:48,y:-44,z:-118,yaw:-.68,calmRadius:110});

export function libertyWaterHeight(x,z){
 return WORLD_CENTER_Y+Math.sqrt(WORLD_RADIUS*WORLD_RADIUS-x*x-z*z);
}

export function createLiberty(scene,{mobile=false,onChange=()=>{},submerged=true}={}){
 const root=new T.Group();
 root.name='Liberty — the submerged statue in the drowned ocean';
 root.position.set(LIBERTY_LOCATION.x,LIBERTY_LOCATION.y,LIBERTY_LOCATION.z);
 root.rotation.y=LIBERTY_LOCATION.yaw;
 scene.add(root);

 const geometries=new Set(),materials=new Set();
 let disposed=false,dirty=true,time=0;

 const copper=new T.MeshStandardMaterial({color:0x52917f,roughness:.78,metalness:.24,vertexColors:true});
 const darkCopper=new T.MeshStandardMaterial({color:0x275950,roughness:.85,metalness:.18,vertexColors:true});
 const gold=new T.MeshStandardMaterial({color:0xd4a042,roughness:.36,metalness:.84,vertexColors:true,emissive:0x683c08,emissiveIntensity:.35});
 const recess=new T.MeshStandardMaterial({color:0x153d36,roughness:.92,metalness:.22,vertexColors:true});
 const stone=new T.MeshStandardMaterial({color:0x888b82,roughness:.97,metalness:0,vertexColors:true});
 for(const m of [copper,darkCopper,gold,recess,stone])materials.add(m);

 const radial=mobile?12:20,vertical=mobile?10:16;
 const hash=(x,y,z)=>{const v=Math.sin(x*12.93+y*17.17+z*7.63)*43758.5453;return v-Math.floor(v);};

 function repairPoleNormals(g){
  const p=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<n.count;i++)if(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))<.5){
   const len=Math.hypot(p.getX(i),p.getY(i),p.getZ(i))||1;
   n.setXYZ(i,p.getX(i)/len,p.getY(i)/len,p.getZ(i)/len);
  }
 }

 function own(g){
  repairPoleNormals(g);
  geometries.add(g);
  const p=g.attributes.position,colours=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   const broad=hash(Math.floor(x*.85),Math.floor(y*.7),Math.floor(z*.85)),fine=hash(x*3,y*3,z*3);
   const v=.82+.16*broad+.06*fine;
   colours.set([v*(.96+.04*broad),v,v*(.95+.05*fine)],i*3);
  }
  g.setAttribute('color',new T.BufferAttribute(colours,3));
  return g;
 }

 function mesh(g,m=copper,position=[0,0,0],name='Submerged copper'){
  const o=new T.Mesh(own(g),m);
  o.position.set(...position);o.name=name;o.castShadow=false;o.receiveShadow=true;
  root.add(o);return o;
 }

 function ellipsoid(position,scale,m=copper,name='Sculpted copper'){
  const g=new T.SphereGeometry(1,radial,vertical);g.scale(...scale);
  return mesh(g,m,position,name);
 }

 function line(points,radius,m=copper,name='Copper seam',segments=mobile?18:28){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  return mesh(new T.TubeGeometry(curve,segments,radius,mobile?5:8,false),m,[0,0,0],name);
 }

 function tapered(a,b,r1,r2,m=copper,name='Sculpted copper ray'){
  const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av);
  const o=mesh(new T.CylinderGeometry(r2,r1,delta.length(),mobile?7:11),m,av.clone().add(bv).multiplyScalar(.5).toArray(),name);
  o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
  return o;
 }

 function drape(points,radii,folds,depth,name){
  const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  const steps=mobile?24:40,sides=mobile?32:48;
  const frames=path.computeFrenetFrames(steps,false),positions=[],uvs=[],indices=[];
  for(let i=0;i<=steps;i++){
   const t=i/steps,p=path.getPointAt(t);
   const j=Math.min(radii.length-2,Math.floor(t*(radii.length-1))),f=t*(radii.length-1)-j;
   const r=T.MathUtils.lerp(radii[j],radii[j+1],f);
   const normal=frames.normals[i],binormal=frames.binormals[i];
   for(let s=0;s<=sides;s++){
    const theta=s/sides*Math.PI*2;
    const wave=1+Math.sin(theta*folds)*depth*(.7+.3*Math.sin(t*8));
    const rad=r*wave;
    const px=p.x+(normal.x*Math.cos(theta)+binormal.x*Math.sin(theta))*rad;
    const py=p.y+(normal.y*Math.cos(theta)+binormal.y*Math.sin(theta))*rad;
    const pz=p.z+(normal.z*Math.cos(theta)+binormal.z*Math.sin(theta))*rad;
    positions.push(px,py,pz);uvs.push(s/sides,t);
    if(i<steps&&s<sides){
     const a=i*(sides+1)+s,b=a+sides+1;
     indices.push(a,b,a+1,a+1,b,b+1);
    }
   }
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  g.setIndex(indices);g.computeVertexNormals();
  return mesh(g,copper,[0,0,0],name);
 }

 // Submerged stone pedestal entering the abyssal waters
 mesh(new T.BoxGeometry(28,1.2,32),stone,[0,LOCAL_FOOT_Y-.6,0],'Submerged pedestal top');
 mesh(new T.BoxGeometry(26,16,30),stone,[0,LOCAL_FOOT_Y-9.2,0],'Submerged pedestal shaft');
 mesh(new T.BoxGeometry(30,2.8,34),stone,[0,LOCAL_FOOT_Y-18.6,0],'Submerged pedestal foundation');

 // Lower pleated robes rising up through the dark sea
 const robe=drape([[0,-83,0],[0,-65,-1],[-1,-42,0],[0,-19,0],[0,-8,-.5],[0,-3,-.7]],[11,13,10,9,11,3.8],13,.12,'Standing pleated robe');
 const rp=robe.geometry.attributes.position;
 for(let i=0;i<rp.count;i++)rp.setZ(i,rp.getZ(i)*.63);
 robe.geometry.computeVertexNormals();repairPoleNormals(robe.geometry);

 ellipsoid([0,-1.8,0],[3.7,5,3.4],copper,'Copper neck');

 // Raised right arm holding the torch high above the flood
 drape([[-9,-12,0],[-15,0,0],[-20,17,0],[-22,25,0]],[6,5.1,3.6,2.7],10,.16,'Raised right arm — sleeve');
 tapered([-22,23.5,0],[-23,31.3,.2],2.4,1.8,copper,'Exposed raised wrist');

 // Lowered left arm holding the tablet
 drape([[9,-12,-.5],[14,-22,1],[14,-31,4],[10,-35,8]],[5.1,4.5,3.4,2.5],9,.14,'Lowered left arm');
 ellipsoid([9.8,-35,9],[2.5,2.3,1.4],copper,'Left hand supporting the tablet');

 const tabletShape=new T.Shape();
 tabletShape.moveTo(-4.2,-9);tabletShape.lineTo(4.2,-9);tabletShape.lineTo(4.2,7.5);
 tabletShape.lineTo(2.7,9);tabletShape.lineTo(-4.2,9);tabletShape.closePath();
 const tablet=mesh(new T.ExtrudeGeometry(tabletShape,{depth:1.6,bevelEnabled:true,bevelThickness:.15,bevelSize:.18,bevelSegments:2,steps:1}),copper,[9,-29,8],'Liberty tablet');
 tablet.rotation.z=-.14;tablet.updateMatrix();

 // Bartholdi classical face and head
 const headGeometry=new T.SphereGeometry(1,mobile?48:80,mobile?36:60);
 headGeometry.scale(6.25,9.6,4.9);
 const head=mesh(headGeometry,copper,[0,10.5,0],'Liberty — classical copper head');
 const hp=head.geometry.attributes.position;
 const gaussian=(x,y,cx,cy,sx,sy)=>Math.exp(-.5*(((x-cx)/sx)**2+((y-cy)/sy)**2));
 for(let i=0;i<hp.count;i++){
  const x=hp.getX(i),y=hp.getY(i),z=hp.getZ(i),Y=y+10.5;
  let relief=1.25*gaussian(x,Y,0,11.1,.52,2.2)+.92*gaussian(x,Y,0,8.8,.68,.58);
  relief+=.2*gaussian(x,Y,0,4.8,1.9,.9);
  relief-=1.1*gaussian(x,Y,0,9.6,1.4,.45);
  relief-=1.4*(gaussian(x,Y,-1.85,10.8,.92,.65)+gaussian(x,Y,1.85,10.8,.92,.65));
  relief+=.7*(gaussian(x,Y,-1.9,11.8,1.4,.45)+gaussian(x,Y,1.9,11.8,1.4,.45));
  relief+=1.45*(gaussian(x,Y,-2.8,9.2,1.3,1.6)+gaussian(x,Y,2.8,9.2,1.3,1.6));
  relief+=.78*gaussian(x,Y,0,7.3,1.15,.48)-.85*gaussian(x,Y,0,6.6,1.25,.3);
  relief+=.92*gaussian(x,Y,0,5.85,1.1,.42);
  hp.setZ(i,z+relief*smoothZ(z));
 }
 head.geometry.computeVertexNormals();repairPoleNormals(head.geometry);

 function smoothZ(z){const t=T.MathUtils.clamp((z/4.9+.2)/.9,0,1);return t*t*(3-2*t);}

 // Seven rays of the crown radiating over the sea
 const crownCenter=[0,16.8,-.3];
 const rayAngles=[-1.02,-.68,-.34,0,.34,.68,1.02];
 for(const [idx,ang] of rayAngles.entries()){
  const len=idx===3?15.8:idx===0||idx===6?13.2:14.5;
  const startX=crownCenter[0]+Math.sin(ang)*5.4,startY=crownCenter[1]+Math.cos(ang)*2.4,startZ=crownCenter[2]+Math.cos(ang)*3.2;
  const endX=crownCenter[0]+Math.sin(ang)*(5.4+len),endY=crownCenter[1]+Math.cos(ang)*(2.4+len*.9),endZ=crownCenter[2]+Math.cos(ang)*(3.2+len*.18);
  tapered([startX,startY,startZ],[endX,endY,endZ],.72,.08,copper,'Crown ray '+idx);
 }

 // The Torch held high into the stormy sky
 mesh(new T.CylinderGeometry(1.6,1.4,14,mobile?10:16),copper,[-23,38,.3],'Torch handle');
 mesh(new T.CylinderGeometry(3.6,1.8,3.2,mobile?12:20),copper,[-23,45.2,.3],'Torch basket base');
 mesh(new T.TorusGeometry(3.6,.22,mobile?6:10,mobile?16:24),darkCopper,[-23,46.8,.3],'Torch railing');

 const flameGeo=new T.ConeGeometry(2.1,7.2,mobile?12:20);
 flameGeo.rotateX(-.08);flameGeo.rotateZ(.12);
 const flame=mesh(flameGeo,gold,[-23,50.4,.3],'Gilded torch flame');

 // Beacon light from the torch illuminating the water and copper
 const beacon=new T.PointLight(0xffbe62,120,65,2);
 beacon.position.set(-23,51,2);root.add(beacon);

 const copperFill=new T.PointLight(0x78bcae,140,55,2);
 copperFill.position.set(4,14,16);root.add(copperFill);

 root.updateMatrixWorld(true);

 // Batch geometries by material to reduce draw calls
 const batches=new Map();
 for(const object of [...root.children]){
  if(!object.isMesh)continue;
  object.updateMatrix();
  const g=object.geometry.clone().applyMatrix4(object.matrix);
  const p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color;
  let batch=batches.get(object.material);
  if(!batch){batch={p:[],n:[],c:[],i:[]};batches.set(object.material,batch);}
  const offset=batch.p.length/3;
  for(let i=0;i<p.count;i++){
   batch.p.push(p.getX(i),p.getY(i),p.getZ(i));
   batch.n.push(n.getX(i),n.getY(i),n.getZ(i));
   batch.c.push(c.getX(i),c.getY(i),c.getZ(i));
  }
  if(g.index)for(let i=0;i<g.index.count;i++)batch.i.push(offset+g.index.getX(i));
  else for(let i=0;i<p.count;i++)batch.i.push(offset+i);
  g.dispose();root.remove(object);
 }
 for(const g of geometries)g.dispose();geometries.clear();

 for(const [mat,batch] of batches){
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(batch.p,3));
  g.setAttribute('normal',new T.Float32BufferAttribute(batch.n,3));
  g.setAttribute('color',new T.Float32BufferAttribute(batch.c,3));
  g.setIndex(batch.i);g.computeBoundingSphere();g.computeBoundingBox();
  geometries.add(g);
  const m=new T.Mesh(g,mat);
  m.name='Liberty — batched '+(mat===stone?'pedestal':mat===gold?'gilded flame':'copper');
  m.receiveShadow=true;root.add(m);
 }

 const triangles=[...geometries].reduce((sum,g)=>sum+(g.index?.count||g.attributes.position.count)/3,0);

 return {
  root,
  update(dt,eye,motion=true){
   if(disposed)return false;
   if(motion){
    time+=Math.max(0,Math.min(Number(dt)||0,.1));
    beacon.intensity=115+Math.sin(time*1.2)*12+Math.cos(time*2.7)*6;
    dirty=true;
   }
   const was=dirty;dirty=false;return was;
  },
  diagnostics:()=>({
   kind:'submerged-statue-of-liberty',
   place:'new-york',
   ready:!disposed,
   submerged:true,
   emergedFeatures:['crown-7-rays','gilded-torch','tablet','classical-head','draped-bust'],
   patinatedCopper:true,
   gildedTorch:true,
   beaconActive:true,
   location:[LIBERTY_LOCATION.x,LIBERTY_LOCATION.y,LIBERTY_LOCATION.z],
   triangles,
   drawMeshes:batches.size,
   time:+time.toFixed(3),
   disposed
  }),
  dispose(){
   if(disposed)return;
   disposed=true;
   root.removeFromParent();
   for(const g of geometries)g.dispose();
   for(const m of materials)m.dispose();
   root.clear();
   onChange();
  }
 };
}
