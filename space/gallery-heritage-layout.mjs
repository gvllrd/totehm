// Retained masonry lives inside the clear envelope. These same metre-sized
// volumes drive drawing, body collision and route planning in both places.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const HERITAGE_PORTAL=freeze({
 minY:-.09,maxY:3.0575,sideX:2.64,sideThickness:.045,
 minZ:-1.8,maxZ:1.15,roofY:3.035,roofThickness:.045,
 clearWidth:4.8,frameThickness:.035
});
const wall=(id,minX,maxX,minZ,maxZ,maxY,seed)=>({id,minX,maxX,minZ,maxZ,minY:-.09,maxY,seed,breakTop:false});
const walls=place=>{
 const ny=place==='new-york';
 return freeze([
  wall('heritage-entry-west',-2.85,-2.4,-3.3,-1.76,3.1,11),
  wall('heritage-entry-east',2.4,2.85,-3.3,-1.76,3.1,23),
  wall('heritage-front-west',-12.92,-12.28,-4.1,-2.2,ny?10.6:7.05,37),
  wall('heritage-front-east',12.28,12.92,-4.9,-2.2,ny?10.6:6.25,43),
  wall('heritage-ocean-west',-12.92,-12.28,-16.86,-11.0,ny?5.02:5.7,59),
  wall('heritage-ocean-east',12.28,12.92,-16.86,-12.3,ny?5.02:5.6,71)
 ]);
};
const LISBON_GROUPS=walls('lisbon'),NEW_YORK_GROUPS=walls('new-york');
export const heritageWallGroups=place=>place==='new-york'?NEW_YORK_GROUPS:LISBON_GROUPS;
// The new glass stays intact around genuinely incomplete old masonry. Each
// unequal fragment has its own exact physical top; zero-height spans are
// real missing portions, never a transparent image painted on a full wall.
const PROFILES=freeze({
 'heritage-front-west':[[.23,.78],[.18,.63],[.27,.91],[.32,1]],
 'heritage-front-east':[[.18,.51],[.22,.77],[.16,.62],[.21,.85],[.23,1]],
 'heritage-ocean-west':[[.15,1],[.12,.78],[.17,.92],[.10,0],[.18,.65],[.13,.32],[.15,.52]],
 'heritage-ocean-east':[[.19,1],[.14,.72],[.16,.86],[.21,.42],[.13,.65],[.17,.27]]
});
function fragments(place){return freeze(heritageWallGroups(place).flatMap(w=>{
 const profile=PROFILES[w.id];if(!profile)return[{...w,group:w.id}];
 const length=w.maxZ-w.minZ;let z=w.minZ;
 return profile.flatMap(([span,height],index)=>{
  const minZ=z;z+=span*length;if(!height)return[];
  return[{...w,id:w.id+'-fragment-'+index,group:w.id,minZ,maxZ:index===profile.length-1?w.maxZ:z,maxY:w.minY+(w.maxY-w.minY)*height}];
 });
}));}
const LISBON=fragments('lisbon'),NEW_YORK=fragments('new-york');
export const heritageWalls=place=>place==='new-york'?NEW_YORK:LISBON;
// Two hollow gatehouse remnants sit on the existing terrace, in front of the
// glass plane. Their shared sector bounds also keep body collision out of stone.
export const castleTowers=place=>[-1,1].map((side,i)=>({
 id:'castle-tower-'+(side<0?'west':'east'),x:side*12.9,z:-.35,
 radius:1.55,innerRadius:1.08,minY:-.09,height:(place==='new-york'?13.6:9.1)-(i?1.35:0),
 segments:20,openingHalfAngle:.68,openingTop:3.35,belvedereBase:place==='new-york'?5.15:4.45
}));
export function castleSector(t,index){
 const step=Math.PI*2/t.segments,a0=index*step,a1=(index+1)*step,mid=(a0+a1)/2;
 const front=Math.abs(Math.atan2(Math.sin(mid-Math.PI/2),Math.cos(mid-Math.PI/2)))<t.openingHalfAngle;
 // The open half is demolished down to the inserted glass floor; only a
 // broad, uneven rear crescent survives above it, rather than battlements.
 const profile=[.71,.72,.75,.78,.81,.83,.85,.87,.89,.91,.93,.94,.92,.88,.85,.84,.76,.70,.69,.70];
 const maxY=Math.sin(mid)>0?Math.min(t.minY+t.height*profile[index%profile.length],t.belvedereBase-.04):t.minY+t.height*profile[index%profile.length],points=[];
 for(const radius of [t.innerRadius,t.radius])for(const a of [a0,mid,a1])points.push([t.x+Math.cos(a)*radius,t.z+Math.sin(a)*radius]);
 return{id:t.id+'-sector-'+index,a0,a1,front,minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minZ:Math.min(...points.map(p=>p[1])),maxZ:Math.max(...points.map(p=>p[1])),minY:front?t.openingTop:t.minY,maxY};
}
export const castleBelvedere=(t,place)=>({x:t.x,z:t.z+1,width:2.42,depth:2.7,base:t.belvedereBase,height:2.35});
export const castleArchStones=t=>Array.from({length:13},(_,i)=>{
 const a0=i/13*Math.PI+.008,a1=(i+1)/13*Math.PI-.008;
 const points=[.72,1.14].flatMap(r=>[a0,a1].map(a=>[t.x+r*Math.cos(a),2.2+r*Math.sin(a)]));
 return{id:t.id+'-arch-stone-'+i,a0,a1,minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1])),minZ:t.z+.88,maxZ:t.z+1.39};
});
export const castleObstacles=place=>castleTowers(place).flatMap(t=>[
 ...Array.from({length:t.segments},(_,i)=>castleSector(t,i)),
 ...[-1,1].map(side=>({id:t.id+'-arch-jamb-'+side,minX:t.x+side*.91-.23,maxX:t.x+side*.91+.23,minZ:t.z+.88,maxZ:t.z+1.39,minY:t.minY,maxY:2.23})),
 ...castleArchStones(t),
 ...(()=>{const b=castleBelvedere(t,place),x0=b.x-b.width/2,x1=b.x+b.width/2,z0=b.z-b.depth/2,z1=b.z+b.depth/2;return[
  ...[-1,1].map(side=>({id:t.id+'-belvedere-side-'+side,minX:b.x+side*b.width/2-.011,maxX:b.x+side*b.width/2+.011,minZ:z0,maxZ:z1,minY:b.base,maxY:b.base+b.height})),
  {id:t.id+'-belvedere-front',minX:x0,maxX:x1,minZ:z1-.011,maxZ:z1+.011,minY:b.base,maxY:b.base+b.height},
  ...[0,b.height].map((h,i)=>({id:t.id+'-belvedere-'+(i?'roof':'floor'),minX:x0,maxX:x1,minZ:z0,maxZ:z1,minY:b.base+h-.033,maxY:b.base+h+.033}))
 ];})()
]);
const bounds=(id,minX,maxX,minZ,maxZ,minY,maxY)=>({id,minX,maxX,minZ,maxZ,minY,maxY});
const obstacles=place=>freeze([
 ...heritageWalls(place),
 ...castleObstacles(place),
 ...[-1,1].map(side=>bounds('heritage-portal-'+(side<0?'west':'east'),side*HERITAGE_PORTAL.sideX-HERITAGE_PORTAL.sideThickness/2,side*HERITAGE_PORTAL.sideX+HERITAGE_PORTAL.sideThickness/2,HERITAGE_PORTAL.minZ,HERITAGE_PORTAL.maxZ,HERITAGE_PORTAL.minY,HERITAGE_PORTAL.maxY)),
 bounds('heritage-portal-roof',-2.6625,2.6625,HERITAGE_PORTAL.minZ,HERITAGE_PORTAL.maxZ,HERITAGE_PORTAL.roofY-HERITAGE_PORTAL.roofThickness/2,HERITAGE_PORTAL.maxY)
]);
const LISBON_OBSTACLES=obstacles('lisbon'),NY_OBSTACLES=obstacles('new-york');
export const heritageObstacles=place=>place==='new-york'?NY_OBSTACLES:LISBON_OBSTACLES;
