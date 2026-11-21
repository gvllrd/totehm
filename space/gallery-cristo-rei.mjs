import * as T from './vendor/three-0.180.0.mjs';

export function createCristoRei({mobile=false}={}){
 const root=new T.Group();root.name='Cristo Rei sculpted limestone figure';
 const geometries=new Set(),materials=new Set();
 const stone=new T.MeshStandardMaterial({color:0xd0c4aa,roughness:.87,vertexColors:true});
 const recess=new T.MeshStandardMaterial({color:0xb0a48d,roughness:.96,vertexColors:true});
 const limestone=new T.Color();
 materials.add(stone);materials.add(recess);
 const segments=mobile?28:56;
 function sculpture(geometry,name,finish=stone){
  const vertices=geometry.attributes.position,colours=new Float32Array(vertices.count*3);
  for(let i=0;i<vertices.count;i++){
   const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i);
   const wet=.72+.28*T.MathUtils.smoothstep(y,.38,2.55);
   const tone=wet*(.88+.055*Math.sin(x*4.3+y*.81+z*6.3)+.035*Math.cos(x*12.6-z*9.27+y*15.33));
   limestone.setRGB(tone,tone*.985,tone*.95).toArray(colours,i*3);
  }
  geometry.setAttribute('color',new T.BufferAttribute(colours,3));
  geometries.add(geometry);const mesh=new T.Mesh(geometry,finish);mesh.name=name;root.add(mesh);return mesh;
 }
 function radiusSections(sections,map,name){
  const points=[],indices=[];
  for(let j=0;j<sections.length;j++)for(let k=0;k<=segments;k++){
   const angle=k/segments*Math.PI*2;points.push(...map(sections[j],angle));
   if(j&&k){const a=j*(segments+1)+k,b=a-segments-1;indices.push(b-1,a-1,b,b,a-1,a);}
  }
  const crossSection=new T.BufferGeometry();
  crossSection.setAttribute('position',new T.Float32BufferAttribute(points,3));
  crossSection.setIndex(indices);crossSection.computeVertexNormals();return sculpture(crossSection,name);
 }
 function softStone(name,x,y,z,w,h,d,finish=stone,roll=0){
  const geometry=new T.SphereGeometry(1,mobile?12:20,mobile?8:14);
  geometry.scale(w,h,d);geometry.rotateZ(roll);geometry.translate(x,y,z);
  return sculpture(geometry,name,finish);
 }
 function reliefStrip(name,points,radius,finish=stone){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  return sculpture(new T.TubeGeometry(curve,mobile?9:16,radius,mobile?4:7,false),name,finish);
 }

 // Footprint origin is the stone soles. The cassock is sculpted from the hem to the shoulders.
 const robe=[
  [.34,2.69,1.58,.21],[.72,2.76,1.66,.31],[1.32,2.72,1.67,.33],[3.5,2.76,1.60,.34],
  [6.0,2.61,1.51,.29],[9.7,2.56,1.52,.34],[13.2,2.53,1.45,.30],[15.2,2.65,1.46,.23],
  [18.1,2.88,1.52,.23],[20.4,3.18,1.58,.23],[21.9,3.52,1.48,.16],[22.95,3.1,1.42,.12],
  [23.65,1.82,1.07,.06],[23.85,.98,.79,.02],[23.86,.02,.02,0]
 ];
 radiusSections(robe,([y,rx,rz,fold],angle)=>{
  const pleat=.57*Math.sin(11*angle+y*.115)+.24*Math.sin(17*angle-y*.11)+.18*Math.sin(5*angle+y*.29);
  const drift=.19*Math.sin(y*.17)-.08*Math.sin(y*.4);
  return [Math.cos(angle)*(rx+fold*pleat)+drift,y,Math.sin(angle)*(rz+fold*pleat*.65)];
 },'Vertically fluted stone tunic');
 for(const sign of [-1,1]){
  softStone('Sandalled foot',sign*.95,.42,1.20,.67,.42,1.04);
  reliefStrip('Sandal strap',[[sign*.60,.56,1.88],[sign*.92,.72,1.94],[sign*1.25,.56,1.87]],.075);
  const sleeves=[
   [2.52,21.80,0,1.47,1.19,.12],[3.72,21.91,.02,1.5,1.28,.18],
   [5.1,21.79,.04,1.44,1.18,.21],[7.18,21.58,.04,1.14,1.03,.21],
   [9.42,21.28,.08,.95,.86,.13],[10.84,21.02,.11,.73,.65,.12],
   [11.53,20.88,.17,.61,.55,.09],[11.74,20.86,.18,.57,.50,.04],[11.78,20.86,.18,.50,.46,.01]
  ];
  radiusSections(sleeves,([x,y,z,ry,rz,fold],theta)=>{
   const a=(sign>0?1:-1)*theta,crease=fold*(.63*Math.sin(a*7+x*.46)+.37*Math.cos(a*12-x*.49));
   return [x*sign,y+Math.cos(a)*(ry+crease),z-Math.sin(a)*(rz+crease*.60)];
  },'Open arm and carved sleeve');
  reliefStrip('Mantle gathers at the shoulder',[[sign*1.62,22.79,1.19],[sign*2.57,22.35,1.48],[sign*3.47,21.99,1.36],[sign*4.80,21.61,1.24]],.10);
  softStone('Wrist',sign*11.78,20.89,.21,.49,.40,.39);
  softStone('Carved open palm',sign*12.46,20.96,.25,.81,.58,.37,stone,.10*sign);
  for(let j=0;j<4;j++){
   const y=21.31-j*.255,length=[.54,.67,.57,.42][j];
   reliefStrip('Carved finger',[[sign*12.83,y,.23],[sign*(13.0+length*.4),y+.07,.24],[sign*(13.0+length),y+.035,.19]],.112);
   softStone('Rounded fingertip',sign*(13+length),y+.035,.19,.113,.112,.112);
  }
  reliefStrip('Carved thumb',[[sign*12.09,21.11,.51],[sign*12.22,21.52,.52],[sign*12.55,21.68,.47]],.176);
 }

 softStone('Neck',0,24.00,.05,.69,.88,.66);
 const head=[
  [24.16,.05,.13,.30],[24.29,.40,.38,.28],[24.51,.60,.57,.25],[24.80,.73,.75,.20],
  [25.24,.86,.82,.12],[25.86,.91,.93,.11],[26.43,.92,.99,.06],[27.12,.82,.92,.01],
  [27.62,.58,.72,-.05],[27.93,.21,.30,-.10],[28,.015,.018,-.15]
 ];
 radiusSections(head,([y,rx,rz,z],angle)=>{
  const forward=Math.max(0,Math.sin(angle)),flatten=.12*forward**3*(y<26.4?1:.21);
  return [Math.cos(angle)*rx,y,z+Math.sin(angle)*rz-flatten];
 },'Head with carved cheekbones and brow');
 const hair=[
  [24.60,.54,.35,-.54],[25.28,.73,.45,-.44],[26.12,.94,.64,-.32],
  [26.80,.91,.72,-.24],[27.32,.79,.72,-.19],[27.78,.45,.55,-.14],[27.99,.018,.035,-.13]
 ];
 radiusSections(hair,([y,rx,rz,z],angle)=>{
  const wave=.058*Math.sin(angle*13+y*.60);
  return [Math.cos(angle)*(rx+wave),y,z+Math.sin(angle)*(rz+wave)];
 },'Stone hair swept behind the ears');
 for(const sign of [-1,1]){
  softStone('Stone ear',sign*.90,25.92,.12,.19,.37,.22);
  reliefStrip('Brow ridge',[[sign*.12,26.11,.895],[sign*.36,26.19,.91],[sign*.67,26.11,.70]],.095);
  reliefStrip('Eye incision',[[sign*.19,26.00,.892],[sign*.40,26.02,.887],[sign*.57,25.98,.81]],.025,recess);
  reliefStrip('Flowing carved hair',[[sign*.09,27.43,.65],[sign*.42,27.39,.72],[sign*.80,26.99,.47],[sign*.94,26.16,.16],[sign*.77,24.94,-.26]],.14);
 }
 reliefStrip('Nose bridge',[[0,26.12,.91],[0,25.69,1.12],[0,25.56,1.13]],.134);
 softStone('Stone nose',0,25.52,1.052,.24,.14,.17);
 reliefStrip('Lip incision',[[-.27,25.16,.795],[0,25.13,.95],[.27,25.16,.795]],.033,recess);
 softStone('Sculpted beard',0,24.65,.65,.55,.53,.25);
 for(const sign of [-1,1]){
  reliefStrip('Beard fold',[[sign*.49,25.05,.63],[sign*.41,24.66,.80],[sign*.18,24.37,.73]],.065);
  softStone('Sacred Heart relief',sign*.22,20.67,1.47,.38,.38,.22);
 }
 softStone('Sacred Heart relief base',0,20.31,1.49,.38,.41,.22,stone,-.09);
 reliefStrip('Sacred Heart flames',[[0,20.99,1.65],[-.16,21.25,1.66],[.10,21.60,1.62],[.10,21.75,1.59]],.11);

 return {root,geometries,materials};
}
