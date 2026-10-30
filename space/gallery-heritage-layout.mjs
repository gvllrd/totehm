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
const bounds=(id,minX,maxX,minZ,maxZ,minY,maxY)=>({id,minX,maxX,minZ,maxZ,minY,maxY});
const obstacles=place=>freeze([
 ...heritageWalls(place),
 ...[-1,1].map(side=>bounds('heritage-portal-'+(side<0?'west':'east'),side*HERITAGE_PORTAL.sideX-HERITAGE_PORTAL.sideThickness/2,side*HERITAGE_PORTAL.sideX+HERITAGE_PORTAL.sideThickness/2,HERITAGE_PORTAL.minZ,HERITAGE_PORTAL.maxZ,HERITAGE_PORTAL.minY,HERITAGE_PORTAL.maxY)),
 bounds('heritage-portal-roof',-2.6625,2.6625,HERITAGE_PORTAL.minZ,HERITAGE_PORTAL.maxZ,HERITAGE_PORTAL.roofY-HERITAGE_PORTAL.roofThickness/2,HERITAGE_PORTAL.maxY)
]);
const LISBON_OBSTACLES=obstacles('lisbon'),NY_OBSTACLES=obstacles('new-york');
export const heritageObstacles=place=>place==='new-york'?NY_OBSTACLES:LISBON_OBSTACLES;
