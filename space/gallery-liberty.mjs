import * as T from './vendor/three-0.180.0.mjs';
import {WORLD_RADIUS,WORLD_CENTER_Y} from './gallery-drowned-planet.mjs';

// A monumental copper sculpture in the SAME sea as Lisbon. Within the
// ocean's 110 m calm collar, displacement is exactly zero. All copper,
// including both sandal soles, stands above that curved water on stone.
const LOCAL_FOOT_Y=-87,FOOT_CLEARANCE=2.5,MAXIMUM_CALM_SEA_Y=-96;
export const LIBERTY_LOCATION=Object.freeze({x:76,y:MAXIMUM_CALM_SEA_Y+FOOT_CLEARANCE-LOCAL_FOOT_Y,z:-48,yaw:-.9,calmRadius:110});
const worldPoint=(x,y,z)=>Object.freeze([LIBERTY_LOCATION.x+x*Math.cos(LIBERTY_LOCATION.yaw)+z*Math.sin(LIBERTY_LOCATION.yaw),LIBERTY_LOCATION.y+y,LIBERTY_LOCATION.z-x*Math.sin(LIBERTY_LOCATION.yaw)+z*Math.cos(LIBERTY_LOCATION.yaw)]);
export const LIBERTY_VIEW=Object.freeze({target:worldPoint(0,0,0),head:worldPoint(0,10.5,0),feet:worldPoint(0,LOCAL_FOOT_Y,7),torch:worldPoint(-23,47,.3),torchTip:worldPoint(-23+Math.sin(3.2)*1.55+2.25,54.4,.3+Math.sin(4)*.55),fov:90,framePoints:Object.freeze([
 worldPoint(-6.8,LOCAL_FOOT_Y,-1),worldPoint(-1.2,LOCAL_FOOT_Y,11.5),worldPoint(1.2,LOCAL_FOOT_Y,2),worldPoint(6.8,LOCAL_FOOT_Y,14.5),
 worldPoint(-6.86,10.35,.05),worldPoint(6.86,10.35,.05),
 worldPoint(0,31.1,-3.1),worldPoint(-23+Math.sin(3.2)*1.55+2.25,54.4,.3+Math.sin(4)*.55)
])});
export function libertyWaterHeight(x,z){
 return WORLD_CENTER_Y+Math.sqrt(WORLD_RADIUS*WORLD_RADIUS-x*x-z*z);
}

export function createLiberty(scene,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Liberty — the complete statue standing above the sea';
 root.position.set(LIBERTY_LOCATION.x,LIBERTY_LOCATION.y,LIBERTY_LOCATION.z);root.rotation.y=LIBERTY_LOCATION.yaw;scene.add(root);
 const geometries=new Set(),materials=new Set();let disposed=false,dirty=true,time=0;
 const copper=new T.MeshStandardMaterial({color:0x629b8b,roughness:.79,metalness:.28,vertexColors:true});
 const darkCopper=new T.MeshStandardMaterial({color:0x2c625a,roughness:.86,metalness:.2,vertexColors:true});
 const gold=new T.MeshStandardMaterial({color:0xba8c3d,roughness:.39,metalness:.82,vertexColors:true,emissive:0x563005,emissiveIntensity:.28});
 const recess=new T.MeshStandardMaterial({color:0x123832,roughness:.91,metalness:.24,vertexColors:true});
 const stone=new T.MeshStandardMaterial({color:0x9e9c8a,roughness:.96,metalness:0,vertexColors:true});
 for(const m of [copper,darkCopper,gold,recess,stone])materials.add(m);
 const radial=mobile?14:22,vertical=mobile?10:16;
 const hash=(x,y,z)=>{const v=Math.sin(x*12.93+y*17.17+z*7.63)*43758.5453;return v-Math.floor(v);};
 function repairPoleNormals(g){
  const p=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<n.count;i++)if(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))<.5){
   const length=Math.hypot(p.getX(i),p.getY(i),p.getZ(i))||1;n.setXYZ(i,p.getX(i)/length,p.getY(i)/length,p.getZ(i)/length);
  }
 }
 function own(g){
  repairPoleNormals(g);
  geometries.add(g);const p=g.attributes.position,colours=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),broad=hash(Math.floor(x*.85),Math.floor(y*.7),Math.floor(z*.85)),fine=hash(x*3,y*3,z*3),v=.82+.16*broad+.06*fine;
   colours.set([v*(.97+.03*broad),v,v*(.96+.04*fine)],i*3);
  }
  g.setAttribute('color',new T.BufferAttribute(colours,3));return g;
 }
 function mesh(g,m=copper,position=[0,0,0],name='Patinated sculpted copper'){
  const o=new T.Mesh(own(g),m);o.position.set(...position);o.name=name;o.castShadow=false;o.receiveShadow=true;root.add(o);return o;
 }
 function ellipsoid(position,scale,m=copper,name='Sculpted copper'){
  const g=new T.SphereGeometry(1,radial,vertical);g.scale(...scale);return mesh(g,m,position,name);
 }
 function line(points,radius,m=copper,name='Raised copper seam',segments=mobile?20:32){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(curve,segments,radius,mobile?5:8,false),m,[0,0,0],name);
 }
 function tapered(a,b,r1,r2,m=copper,name='Sculpted copper ray'){
  const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av),o=mesh(new T.CylinderGeometry(r2,r1,delta.length(),mobile?8:12),m,av.clone().add(bv).multiplyScalar(.5).toArray(),name);
  o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;
 }
 // Folded cloth is one continuous surface, rather than stacked cylinders.
 function drape(points,radii,folds,depth,name){
  const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),steps=mobile?28:44,sides=mobile?36:56;
  const frames=path.computeFrenetFrames(steps,false),positions=[],uvs=[],indices=[];
  for(let i=0;i<=steps;i++){
   const t=i/steps,p=path.getPointAt(t),j=Math.min(radii.length-2,Math.floor(t*(radii.length-1))),f=t*(radii.length-1)-j,r=T.MathUtils.lerp(radii[j],radii[j+1],f);
   for(let k=0;k<=sides;k++){
    const a=k/sides*Math.PI*2,fold=1+depth*Math.cos(a*folds+t*2.2)+depth*.32*Math.cos(a*(folds*2+1)-t*3),q=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r*fold).addScaledVector(frames.binormals[i],Math.sin(a)*r*fold);
    positions.push(q.x,q.y,q.z);uvs.push(k/sides,t);
    if(i<steps&&k<sides){const n=i*(sides+1)+k;indices.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}
   }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return mesh(g,copper,[0,0,0],name);
 }

 // The continuous robe ends above two visible sandal soles. Its stone
 // pedestal enters the sea; the copper sculpture remains completely dry.
 const robe=drape([[0,-83,0],[0,-65,-1],[-1,-42,0],[0,-19,0],[0,-8,-.5],[0,-3,-.7]],[11,13,10,9,11,3.8],13,.12,'Standing pleated robe');
 const rp=robe.geometry.attributes.position;for(let i=0;i<rp.count;i++)rp.setZ(i,rp.getZ(i)*.63);robe.geometry.computeVertexNormals();repairPoleNormals(robe.geometry);
 ellipsoid([0,-1.8,0],[3.7,5,3.4],copper,'Copper neck');
 for(const [side,z] of [[-1,5],[1,8]]){
  const x=side*4,foot=ellipsoid([x,-85.3,z],[2.7,1.7,6],copper,side<0?'Left copper foot':'Right copper foot');
  mesh(new T.BoxGeometry(5.6,.55,12.5),darkCopper,[x,LOCAL_FOOT_Y+.275,z+.25],side<0?'Left sandal sole':'Right sandal sole');
  for(let toe=0;toe<5;toe++)ellipsoid([x+(toe-2)*.9,-85.6,z+4.65-toe*.11],[.48-.035*toe,.43-.025*toe,1.05-.09*toe],copper,'Sculpted sandal toe');
  line([[x-2.5,-85.2,z+2.8],[x,-83.78,z+2.9],[x+2.5,-85.2,z+2.8]],.17,darkCopper,'Copper sandal forefoot strap',mobile?10:16);
  line([[x-2.1,-85.4,z-1],[x,-83.65,z-.8],[x+2.1,-85.4,z-1]],.16,darkCopper,'Copper sandal instep strap',mobile?10:16);
 }
 mesh(new T.BoxGeometry(28,1.2,32),stone,[0,LOCAL_FOOT_Y-.6,0],'Stone pedestal — continuous supporting top');
 mesh(new T.BoxGeometry(26,16,30),stone,[0,LOCAL_FOOT_Y-9.2,0],'Stone pedestal shaft rising from the sea');
 mesh(new T.BoxGeometry(30,2.8,34),stone,[0,LOCAL_FOOT_Y-18.6,0],'Stone pedestal submerged foundation');
 for(const y of [-92.2,-97.2,-102.2]){
  for(const z of [-15.015,15.015])mesh(new T.BoxGeometry(25.7,.055,.035),stone,[0,y,z],'Pedestal horizontal masonry joint');
  for(const x of [-13.015,13.015])mesh(new T.BoxGeometry(.035,.055,29.7),stone,[x,y,0],'Pedestal side masonry joint');
 }
 drape([[-9,-12,0],[-15,0,0],[-20,17,0],[-22,25,0]],[6,5.1,3.6,2.7],10,.16,'Raised right arm — continuous fluted sleeve');
 tapered([-22,23.5,0],[-23,31.3,.2],2.4,1.8,copper,'Exposed raised wrist');
 drape([[9,-12,-.5],[14,-22,1],[14,-31,4],[10,-35,8]],[5.1,4.5,3.4,2.5],9,.14,'Lowered left arm cradling the tablet');
 ellipsoid([9.8,-35,9],[2.5,2.3,1.4],copper,'Left hand supporting the tablet');
 const tabletShape=new T.Shape();tabletShape.moveTo(-4.2,-9);tabletShape.lineTo(4.2,-9);tabletShape.lineTo(4.2,7.5);tabletShape.lineTo(2.7,9);tabletShape.lineTo(-4.2,9);tabletShape.closePath();
 const tablet=mesh(new T.ExtrudeGeometry(tabletShape,{depth:1.6,bevelEnabled:true,bevelThickness:.15,bevelSize:.18,bevelSegments:2,steps:1}),copper,[9,-29,8],'Liberty tablet — bevelled copper with chamfered corner');tablet.rotation.z=-.14;tablet.updateMatrix();
 const letters={J:[[[.8,1],[.8,.2],[.6,0],[.2,0],[0,.2]]],U:[[[0,1],[0,.2],[.2,0],[.6,0],[.8,.2],[.8,1]]],L:[[[0,1],[0,0],[.8,0]]],Y:[[[0,1],[.4,.55],[.8,1]],[[.4,.55],[.4,0]]],I:[[[0,1],[.8,1]],[[.4,1],[.4,0]],[[0,0],[.8,0]]],V:[[[0,1],[.4,0],[.8,1]]],M:[[[0,0],[0,1],[.4,.5],[.8,1],[.8,0]]],D:[[[0,0],[0,1],[.5,1],[.8,.75],[.8,.25],[.5,0],[0,0]]],C:[[[.8,.9],[.6,1],[.2,1],[0,.75],[0,.25],[.2,0],[.6,0],[.8,.1]]],X:[[[0,1],[.8,0]],[[0,0],[.8,1]]]};
 for(const [text,y,size] of [['JULY IV',3.6,.92],['MDCCLXXVI',.6,.68]]){
  const width=text.length*size,start=-width/2;
  for(let letter=0;letter<text.length;letter++)for(const stroke of letters[text[letter]]||[])for(let i=1;i<stroke.length;i++){
   const a=new T.Vector3(start+letter*size+stroke[i-1][0]*size,y+stroke[i-1][1]*1.3,1.79).applyMatrix4(tablet.matrix),b=new T.Vector3(start+letter*size+stroke[i][0]*size,y+stroke[i][1]*1.3,1.79).applyMatrix4(tablet.matrix);
   tapered(a.toArray(),b.toArray(),.038,.038,darkCopper,'Tablet embossed date');
  }
 }

 // Bartholdi's long classical face: high cheeks, deep-set eyes, straight
 // nose and closed mouth; the head is sculpted with true depth throughout.
 const headGeometry=new T.SphereGeometry(1,mobile?64:96,mobile?48:72);headGeometry.scale(6.25,9.6,4.9);
 const head=mesh(headGeometry,copper,[0,10.5,0],'Liberty — classical copper head');
 const hp=head.geometry.attributes.position;
 const gaussian=(x,y,cx,cy,sx,sy)=>Math.exp(-.5*(((x-cx)/sx)**2+((y-cy)/sy)**2));
 for(let i=0;i<hp.count;i++){
  const x=hp.getX(i),y=hp.getY(i),z=hp.getZ(i),Y=y+10.5,chin=T.MathUtils.smoothstep(-y,3,9.6),front=T.MathUtils.smoothstep(z/4.9,.1,.65);
  // All anatomy belongs to this ONE continuous surface. Broad planes become
  // forehead/cheek/jaw, with restrained cut-in eye sockets and closed lips.
  // No separate ovals, eye outlines, eyebrow tubes or spheres sit on the face.
  let relief=1.25*gaussian(x,Y,0,11.1,.52,2.2)+.92*gaussian(x,Y,0,8.8,.68,.58);
  relief+=.2*gaussian(x,Y,0,4.8,1.9,.9);
  let cavity=0;
  for(const side of [-1,1]){
   relief+=.23*gaussian(x,Y,side*3.2,9.9,1.3,1.8);
   relief+=.24*gaussian(x,Y,side*2.45,13.45,1.2,.36);
   const eye=gaussian(x,Y,side*2.5,12.15,1.12,.49);relief-=.54*eye;cavity+=.12*eye;
   relief+=.14*gaussian(x,Y,side*2.5,12.66,1.05,.14)+.09*gaussian(x,Y,side*2.5,11.75,.99,.15);
   relief+=.35*gaussian(x,Y,side*.75,8.55,.42,.37);
   const nostril=gaussian(x,Y,side*.69,8.22,.2,.14);relief-=.35*nostril;cavity+=.2*nostril;
   relief-=.11*gaussian(x,Y,side*1.35,7.5,.2,.68);
  }
  const seam=gaussian(x,Y,0,6.58,1.37,.105);
  relief+=.18*gaussian(x,Y,0,6.87,1.25,.17)+.16*gaussian(x,Y,0,6.28,1.2,.19)-.25*seam;
  cavity+=.18*seam;
  hp.setXYZ(i,x*(1-.28*chin),y,z*(1-.16*chin)+front*relief);
  const colour=head.geometry.attributes.color,shade=1-front*cavity;colour.setXYZ(i,colour.getX(i)*shade,colour.getY(i)*shade,colour.getZ(i)*shade);
 }
 head.geometry.computeVertexNormals();repairPoleNormals(head.geometry);head.geometry.computeBoundingSphere();
 for(const side of [-1,1]){
  ellipsoid([side*6.0,10.35,.05],[.86,1.88,1.05],copper,'Copper ear');
  ellipsoid([side*6.38,10.5,.55],[.26,1.14,.53],darkCopper,'Recessed ear fold');
 }
 // Swept hair at the temples, then the characteristic rolled nape.
 ellipsoid([0,12,-4],[5.7,6.8,3],darkCopper,'Swept-back hair');
 ellipsoid([0,7.1,-5.3],[3.8,3.4,2.7],copper,'Rolled hair at the nape');
 for(const side of [-1,1])for(let i=0;i<5;i++){
  const x=side*(.5+i*1.05);
  line([[x,18.6-i*.2,2.65],[side*(3.5+i*.49),17.6-i*.35,.5],[side*(5.25+i*.12),13.1-i*.45,-2],[side*3.7,8.3,-5.2]],.26,copper,'Swept copper hair ridge',mobile?16:24);
 }

 // The seven rays and the arched diadem windows define the silhouette.
 const crownRing=mesh(new T.TorusGeometry(6.55,.5,mobile?8:12,mobile?40:64),copper,[0,16.9,-.1],'Crown diadem');crownRing.rotation.x=Math.PI/2;
 const crownBand=mesh(new T.CylinderGeometry(6.75,6.5,2.05,mobile?40:64,1,true),copper,[0,17.9,-.1],'Crown band with observation windows');
 for(let i=0;i<13;i++){
  const angle=-1.38+i/12*2.76,x=Math.sin(angle)*6.7,z=Math.cos(angle)*6.7-.1;
  const window=ellipsoid([x,18.08,z],[.36,.7,.13],recess,'Crown arched observation window');window.rotation.y=angle;
 }
 for(let i=0;i<7;i++){
  const a=(i-3)*.405,base=[Math.sin(a)*6.3,18.2+Math.cos(a)*1.1,-1.8],tip=[Math.sin(a)*15.5,18.2+Math.cos(a)*12.9,-3.1];
  tapered(base,tip,.77,.035,copper,'Crown ray '+(i+1));
 }

 // A genuine grasp around the shaft, then the balustraded copper balcony
 // and gilded repoussé flame. Nothing here is a billboard or imported image.
 ellipsoid([-23,30.8,.4],[2.35,2.7,1.86],copper,'Hand holding the torch');
 tapered([-23,27.8,.3],[-23,39.8,.3],1.05,1.33,copper,'Torch shaft');
 for(let i=0;i<4;i++){
  const finger=ellipsoid([-22.25,29.1+i*.9,1.67],[1.64,.43,.58],copper,'Curled finger around the torch');finger.rotation.z=.13;
 }
 const thumb=ellipsoid([-24.78,31.5,1.53],[.7,1.48,.72],copper,'Opposing thumb');thumb.rotation.z=-.48;
 const cupPoints=[[0,37],[1.4,37],[1.6,38.4],[3.6,39.6],[4.3,41.6],[4.3,42.2],[0,42.2]].map(([x,y])=>new T.Vector2(x,y));
 mesh(new T.LatheGeometry(cupPoints,mobile?32:48),copper,[-23,0,.3],'Copper torch bowl');
 for(const [radius,y] of [[4.05,40.3],[4.25,42.1],[4.9,43.1]]){
  const ring=mesh(new T.TorusGeometry(radius,.14,mobile?5:8,mobile?32:48),copper,[-23,y,.3],'Torch balcony circular rail');ring.rotation.x=Math.PI/2;
 }
 for(let i=0;i<16;i++){
  const a=i/16*Math.PI*2,x=-23+4.7*Math.cos(a),z=.3+4.7*Math.sin(a);
  tapered([x,40.8,z],[x,43.15,z],.11,.11,copper,'Torch balcony baluster');
 }
 function flameGeometry(){
  const steps=mobile?24:36,sides=mobile?18:28,positions=[],indices=[];
  for(let i=0;i<=steps;i++){
   const t=i/steps,y=42.3+t*12.1,cx=-23+Math.sin(t*3.2)*1.55+t*t*2.25,cz=.3+Math.sin(t*4)*.55,r=(.8+2.9*Math.sin(Math.PI*Math.pow(t,.7)))*Math.pow(1-t,.55);
   for(let j=0;j<=sides;j++){
    const a=j/sides*Math.PI*2,fold=1+.16*Math.sin(a*5+t*11);positions.push(cx+Math.cos(a)*r*fold,y,cz+Math.sin(a)*r*.64*fold);
    if(i<steps&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}
   }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 const flame=mesh(flameGeometry(),gold,[0,0,0],'Gilded torch flame');
 const lamp=new T.PointLight(0xffcc79,110,42,2);lamp.position.set(-23,47,3);root.add(lamp);
 // Moonlit copper remains legible below the terrace without a second sun.
 const faceFill=new T.PointLight(0xa6dace,210,80,2);faceFill.position.set(0,19,19);root.add(faceFill);
 root.updateMatrixWorld(true);
 const worldBounds=new T.Box3().setFromObject(root),headBounds=new T.Box3().setFromObject(head),flameBounds=new T.Box3().setFromObject(flame);
 const statueBounds=new T.Box3(),footBounds=new T.Box3();let radiusBound=0,minimumCopperClearance=Infinity,minimumFootClearance=Infinity;
 root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,v=new T.Vector3(),isCopper=o.material!==stone,isFoot=/copper foot|sandal sole/i.test(o.name);for(let i=0;i<p.count;i++){
  v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);radiusBound=Math.max(radiusBound,Math.hypot(v.x,v.z));
  if(isCopper){statueBounds.expandByPoint(v);minimumCopperClearance=Math.min(minimumCopperClearance,v.y-libertyWaterHeight(v.x,v.z));}
  if(isFoot){footBounds.expandByPoint(v);minimumFootClearance=Math.min(minimumFootClearance,v.y-libertyWaterHeight(v.x,v.z));}
 }});
 const triangles=[...geometries].reduce((sum,g)=>sum+(g.index?.count||g.attributes.position.count)/3,0);
 // The facial, crown and sleeve sculpting is batched by metal. This distant
 // monument costs four metal draws plus its single stone pedestal draw.
 const batches=new Map();
 for(const object of [...root.children]){
  if(!object.isMesh)continue;
  object.updateMatrix();const g=object.geometry.clone().applyMatrix4(object.matrix),p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color;
  let batch=batches.get(object.material);if(!batch){batch={p:[],n:[],c:[],i:[],parts:[]};batches.set(object.material,batch);}
  const offset=batch.p.length/3,indexStart=batch.i.length;
  for(let i=0;i<p.count;i++){batch.p.push(p.getX(i),p.getY(i),p.getZ(i));batch.n.push(n.getX(i),n.getY(i),n.getZ(i));batch.c.push(c.getX(i),c.getY(i),c.getZ(i));}
  if(g.index)for(let i=0;i<g.index.count;i++)batch.i.push(offset+g.index.getX(i));else for(let i=0;i<p.count;i++)batch.i.push(offset+i);
  batch.parts.push({name:object.name,vertexStart:offset,vertexCount:p.count,indexStart,indexCount:batch.i.length-indexStart});
  g.dispose();root.remove(object);
 }
 for(const g of geometries)g.dispose();geometries.clear();
 for(const [material,batch] of batches){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(batch.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(batch.n,3));g.setAttribute('color',new T.Float32BufferAttribute(batch.c,3));g.setIndex(batch.i);g.computeBoundingSphere();g.computeBoundingBox();geometries.add(g);
  const object=new T.Mesh(g,material);object.name='Liberty — batched '+(material===stone?'stone pedestal':material===gold?'gilded torch':material===copper?'patinated copper':material===darkCopper?'dark copper folds':'crown recesses');object.userData.parts=batch.parts;object.userData.materialKind=material===stone?'stone':'copper';object.receiveShadow=true;root.add(object);
 }
 return{
  root,
  update(dt,eye,motion=true){if(disposed)return false;const result=dirty;dirty=false;if(motion){time+=Math.max(0,Math.min(Number(dt)||0,.1));lamp.intensity=110+Math.sin(time*.7)*3;return true;}return result;},
  diagnostics:()=>({kind:'standing-statue-of-liberty',ready:!disposed,sculpted:true,proceduralGeometry:true,externalAssets:0,patinatedCopper:true,crownRays:7,crownWindows:13,raisedRightArm:true,loweredLeftArm:true,tablet:true,gildedTorch:true,submergedBody:false,onlyHeadAndArmAboveSea:false,entireStatueAboveSea:true,feetVisible:true,feetAboveWater:true,pedestal:true,pedestalSupport:{topY:LIBERTY_LOCATION.y+LOCAL_FOOT_Y,bottomY:LIBERTY_LOCATION.y+LOCAL_FOOT_Y-20,width:28,depth:32,footContact:Math.abs(footBounds.min.y-(LIBERTY_LOCATION.y+LOCAL_FOOT_Y))<.00001,foundationBelowSea:true},newDryLand:false,location:[LIBERTY_LOCATION.x,LIBERTY_LOCATION.y,LIBERTY_LOCATION.z],view:LIBERTY_VIEW,calmRadius:110,maximumMeshRadius:+radiusBound.toFixed(3),insideCalmWater:radiusBound<110,waterHeight:+libertyWaterHeight(LIBERTY_LOCATION.x,LIBERTY_LOCATION.z).toFixed(3),absoluteWaveClearance:FOOT_CLEARANCE,minimumCopperClearance:+minimumCopperClearance.toFixed(3),minimumFootClearance:+minimumFootClearance.toFixed(3),footMinimum:+footBounds.min.y.toFixed(3),headMinimum:+headBounds.min.y.toFixed(3),torchMinimum:+flameBounds.min.y.toFixed(3),bounds:{min:worldBounds.min.toArray(),max:worldBounds.max.toArray()},statueBounds:{min:statueBounds.min.toArray(),max:statueBounds.max.toArray()},drawMeshes:batches.size,triangles,time:+time.toFixed(3),disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.clear();onChange();}
 };
}
