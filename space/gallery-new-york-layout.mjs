import {GALLERY_LAYOUT,GALLERY_STATIONS} from './gallery-modern-layout.mjs';

// The renderer and collision engine consume these exact walkable surfaces.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const NEW_YORK_FLOORS=freeze(Array.from({length:5},(_,i)=>GALLERY_LAYOUT.groundY+i*5.4));
export const NEW_YORK_LAYOUT=freeze({...GALLERY_LAYOUT,height:27,entryHeight:3.1,
 floors:NEW_YORK_FLOORS,levels:5,slabThickness:.2,rampWidth:2.1,
 smokeOutlet:{x:-8,y:27,z:-15.2,radius:.45,radiusZ:.45},
 upper:{minX:-10,maxX:10,minZ:-16,maxZ:-4},
 entry:[0,1.65,15],look:[0,12,-9],inside:[0,1.65,-5],insideTarget:[0,2.5,-12]
});
export const NEW_YORK_STATIONS=GALLERY_STATIONS;
const loops=Array.from({length:4},(_,floor)=>{
 const x=floor===3?8.55:10.7,front=floor===3?-5.3:-4.7,back=floor===3?-13.9:-14.2;
 return [[x,front],[x,back],[-x,back],[-x,front],[x,front]];
});
export const NEW_YORK_RAMPS=freeze(loops.flatMap((loop,floor)=>{
 const lengths=loop.slice(1).map((p,i)=>Math.hypot(p[0]-loop[i][0],p[1]-loop[i][1])),total=lengths.reduce((a,b)=>a+b,0);let height=NEW_YORK_FLOORS[floor];
 return lengths.map((length,i)=>{const from={x:loop[i][0],y:height,z:loop[i][1]};height+=5.4*length/total;
  return{id:`ny-ramp-${floor}-${i}`,floor,width:2.1,length,from,to:{x:loop[i+1][0],y:height,z:loop[i+1][1]}};});
}));
export const NEW_YORK_LANDINGS=freeze(NEW_YORK_FLOORS.map((y,floor)=>({x:floor===4?8.55:10.7,y,z:floor===4?-5.3:-4.7,floor})));
export const NEW_YORK_RAMP_TURNS=freeze(NEW_YORK_RAMPS.filter((_,i)=>i%4!==3).map(r=>({id:r.id+'-turn',floor:r.floor,...r.to,size:2.1})));
export const NEW_YORK_CONNECTORS=freeze([
 ...[1,2].map(floor=>({id:`ny-level-${floor}-flush-ramp-link`,floor,minX:8.4,maxX:9.65,minZ:-6.7,maxZ:-5.8,y:NEW_YORK_FLOORS[floor],frontZ:-4.7,slope:5.4/61.8})),
 {id:'ny-level-3-flush-ramp-link',floor:3,minX:6.3,maxX:7.5,minZ:-7.3,maxZ:-6.3,y:NEW_YORK_FLOORS[3],frontZ:-5.3,slope:5.4/51.4}
]);
export function newYorkConnectorHeight(c,x,z){return c.y+Math.max(0,Math.min(1,(x-c.minX)/(c.maxX-c.minX)))*c.slope*(c.frontZ-z);}
const rect=(floor,minX,maxX,minZ,maxZ,id)=>({floor,minX,maxX,minZ,maxZ,y:NEW_YORK_FLOORS[floor],id});
export const NEW_YORK_FLOOR_RECTS=freeze([
 rect(0,-13,13,-17,-2,'ny-ground'),
 ...[1,2,3,4].flatMap(floor=>{
  const last=floor===4,x=last?7.15:9.3,back=last?-12.4:-12.6,front=last?-6.8:-6.3;
  // Four broad galleries surround a real rectangular atrium. Only the SE
  // bridge meets a ramp endpoint; slabs never cut through an inclined aisle.
  return[
   rect(floor,-x,x,back,-10.8,`ny-floor-${floor}-back`),
   rect(floor,-x,x,-8,front,`ny-floor-${floor}-front`),
   rect(floor,-x,-5.2,-10.8,-8,`ny-floor-${floor}-west`),
   rect(floor,5.2,x,-10.8,-8,`ny-floor-${floor}-east`),
   ...(last?[
    rect(floor,6.1,9.55,-7.1,-6.35,'ny-floor-4-landing-link'),
    rect(floor,8.55,9.55,-6.8,-4.25,'ny-floor-4-landing')
   ]:[
    rect(floor,8.1,10.7,-6.7,-5.8,`ny-floor-${floor}-landing-link`),
    rect(floor,10.7,11.75,-6.7,-3.65,`ny-floor-${floor}-landing`)
   ]),
   ...(floor===3?[
    rect(floor,8.55,11.75,-5.6,-5.0,'ny-setback-ramp-connector'),
    rect(floor,11.4,12.9,-5.6,-3.65,'ny-liberty-window-landing')
   ]:[])
  ];
 })
]);
export const NEW_YORK_GROUND_OBSTACLES=freeze([
 {id:'thp-counter',minX:-3.5,maxX:3.5,minZ:-13.05,maxZ:-11.05,minY:-.09,maxY:1.03},
 {id:'origins-lectern',minX:-8.15,maxX:-7.05,minZ:-8.48,maxZ:-7.52,minY:-.09,maxY:1.65},
 {id:'fireplace-hearth',minX:-10.15,maxX:-5.85,minZ:-16.8,maxZ:-15.18,minY:-.09,maxY:4.65}
]);
export function newYorkRampHeight(ramp,x,z,margin=0){
 const dx=ramp.to.x-ramp.from.x,dz=ramp.to.z-ramp.from.z,length2=dx*dx+dz*dz;
 const raw=((x-ramp.from.x)*dx+(z-ramp.from.z)*dz)/length2;
 if(raw< -1e-7||raw>1+1e-7)return null;
 const t=Math.max(0,Math.min(1,raw));
 const alongX=ramp.from.x+dx*t,alongZ=ramp.from.z+dz*t;
 if(Math.hypot(x-alongX,z-alongZ)>ramp.width/2+margin+1e-7)return null;
 return ramp.from.y+(ramp.to.y-ramp.from.y)*t;
}
export function newYorkSurfacesAt(x,z,margin=0){
 const surfaces=[];
 if(x>=NEW_YORK_LAYOUT.bounds.minX&&x<=NEW_YORK_LAYOUT.bounds.maxX&&z>=NEW_YORK_LAYOUT.bounds.minZ&&z<=NEW_YORK_LAYOUT.bounds.maxZ)surfaces.push({y:NEW_YORK_FLOORS[0],id:'ground',floor:0});
 for(const r of NEW_YORK_FLOOR_RECTS)if(r.floor>0&&x>=r.minX-margin-1e-7&&x<=r.maxX+margin+1e-7&&z>=r.minZ-margin-1e-7&&z<=r.maxZ+margin+1e-7)surfaces.push({y:r.y,id:r.id,floor:r.floor});
 for(const r of NEW_YORK_RAMPS){const y=newYorkRampHeight(r,x,z,margin);if(y!==null)surfaces.push({y,id:r.id,floor:r.floor,ramp:true});}
 for(const t of NEW_YORK_RAMP_TURNS)if(Math.abs(x-t.x)<=t.size/2+margin&&Math.abs(z-t.z)<=t.size/2+margin)surfaces.push({y:t.y,id:t.id,floor:t.floor,ramp:true});
 for(const c of NEW_YORK_CONNECTORS)if(x>=c.minX-margin-1e-7&&x<=c.maxX+margin+1e-7&&z>=c.minZ-margin-1e-7&&z<=c.maxZ+margin+1e-7)surfaces.push({y:newYorkConnectorHeight(c,x,z),id:c.id,floor:c.floor,ramp:true});
 return surfaces;
}
export function newYorkFloorAt(x,z,feetY=NEW_YORK_FLOORS[0]){
 const surfaces=newYorkSurfacesAt(x,z).filter(s=>s.y<=feetY+.23);return surfaces.sort((a,b)=>b.y-a.y)[0]??null;
}
export function newYorkRoofHeight(x,z){return x>=-10&&x<=10&&z>=-16&&z<=-4?27:21.71;}
