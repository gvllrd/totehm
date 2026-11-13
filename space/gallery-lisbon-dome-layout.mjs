import {LISBON_STREET_SIGNS as ORIGINAL_SIGNS} from './gallery-lisbon-signs-layout.mjs';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const INTENTIONS=freeze([
 {id:'fight',label:'Fight',color:'#E24B4A'}, {id:'flow',label:'Flow',color:'#e48b31'},
 {id:'enrich',label:'Enrich',color:'#fcbe21'}, {id:'focus',label:'Focus',color:'#378ADD'},
 {id:'express',label:'Express',color:'#1D9E75'}, {id:'celebrate',label:'Celebrate',color:'#7F77DD'},
 {id:'love',label:'Love',color:'#639922'}
]);
export const DOME=freeze({radiusX:12.65,radiusZ:10.7,centerZ:-4.2,height:10.25,groundY:-.09,thickness:.14,entryHalfWidth:2.55,entryHeight:5,oculus:{x:6,z:-9,radius:.52,radiusZ:.52}});
export function domeRoofHeight(x,z){return DOME.groundY+DOME.height*Math.sqrt(Math.max(0,1-(x/DOME.radiusX)**2-((z-DOME.centerZ)/DOME.radiusZ)**2))-.14;}
export function domeOpening(x,z,margin=0){
 const r=(x/DOME.radiusX)**2+((z-DOME.centerZ)/DOME.radiusZ)**2,o=DOME.oculus;
 return r>=1||Math.abs(x)<DOME.entryHalfWidth&&z>0&&domeRoofHeight(x,z)+.14<DOME.entryHeight+.02||((x-o.x)/(o.radius+margin))**2+((z-o.z)/(o.radiusZ+margin))**2<1;
}
export const DOME_ROOF_PROFILE=freeze({height:domeRoofHeight,smokeOpening:domeOpening,thickness:DOME.thickness});
const counter={id:'thp',room:0,position:[0,1.03,-2.4],approach:[0,1.65,-.5],target:[0,1.15,-2.4],href:'/get_higher'};
export const LISBON_DOME_LAYOUT=freeze({
 halfWidth:12.65,frontZ:5.8,backZ:-14.9,groundY:-.09,eyeHeight:1.74,levels:1,
 entry:[0,1.65,16],look:[0,4.2,-3.5],inside:[0,1.65,1.7],insideTarget:[0,1.5,-3],counter,
 origins:{id:'origins',room:1,book:[-7.5,1.34,-8.5],lectern:[-7.5,1.22,-8.5],approach:[-7.5,1.65,-6.8],target:[-7.5,1.34,-8.5],href:'/origins'},
 play:{id:'play',room:2,approach:[-6.8,1.65,8],target:[-5.8,3.0,4.5],href:'/play_lisbon_street'},
 stoner:{...counter,id:'stoner',room:3},
 opposite:{id:'opposite',room:4,screen:[-2.9,2.2,-11.5],screenSize:[2.6,1.4625],approach:[-2.9,1.65,-8.7],target:[-2.9,2.2,-11.5],href:'/same_but_opposite'},
 fireplace:{position:[6,0,-9],approach:[6,1.65,-6.5],target:[6,2.1,-9]}
});
export const LISBON_DOME_STATIONS=freeze([LISBON_DOME_LAYOUT.counter,LISBON_DOME_LAYOUT.origins,LISBON_DOME_LAYOUT.play,LISBON_DOME_LAYOUT.stoner,LISBON_DOME_LAYOUT.opposite]);

function mount(degrees,y,inside=false){
 const angle=degrees*Math.PI/180,h=(y-DOME.groundY)/DOME.height,r=Math.sqrt(1-h*h),x=DOME.radiusX*r*Math.sin(angle),z=DOME.centerZ+DOME.radiusZ*r*Math.cos(angle);
 let normal=[x/DOME.radiusX**2,(y-DOME.groundY)/DOME.height**2,(z-DOME.centerZ)/DOME.radiusZ**2],length=Math.hypot(...normal);normal=normal.map(n=>n/length*(inside?-1:1));
 return{position:[x+normal[0]*.16,y+normal[1]*.16,z+normal[2]*.16],normal,rotationY:Math.atan2(normal[0],normal[2]),mount:'shell',zone:inside?'inside':'outside'};
}
const positions={
 priority:mount(-29,2.8),stop:mount(29,2.8),speed_bump_caution:mount(-51,2.5),crosswalk_caution:mount(51,2.5),
 no_parking:mount(-76,2.4),no_uturn:mount(76,2.4),left_or_straight:mount(-102,2.8),
 lisboa_city_hall:mount(-18,5.8),Hotel:mount(-29,1.5),pharma:mount(53,4.7),
 roundabout:mount(-98,2.6,true),no_entry:mount(98,2.6,true),parking:mount(-117,2.5,true),
 aed:mount(-57,1.8,true),hospital:mount(76,2.5,true),dead_end:mount(-146,2.5,true),
 fire_exit:{position:[0,5.02,4.42],normal:[0,0,-1],rotationY:Math.PI,mount:'shell',zone:'inside'},
 destination:{position:[-11,5.6,7.3],rotationY:.28,mount:'gantry',zone:'outside'},
 crosswalk:{position:[0,-.073,10.5],mount:'ground',zone:'outside'},
 Heli:{position:[11.2,-.074,11],width:4.5,mount:'ground',zone:'outside'},
 green_walk:{position:[3,2.25,9.3],rotationY:0,mount:'signal',zone:'outside'},
 red_walk:{position:[3,2.7,9.3],rotationY:0,mount:'signal',zone:'outside'}
};
// A projecting pharmacy cross faces arrivals rather than showing only its
// edge from the entrance. Its long bracket still reaches the curved shell.
positions.pharma.position[2]+=.75;positions.pharma.normal=[0,0,1];positions.pharma.rotationY=0;positions.pharma.bracketDepth=1.05;
export const LISBON_DOME_SIGNS=freeze(ORIGINAL_SIGNS.map(sign=>{
 const cue={...sign,...positions[sign.id]},nx=cue.normal?.[0]??Math.sin(cue.rotationY),nz=cue.normal?.[2]??Math.cos(cue.rotationY),length=Math.hypot(nx,nz);
 return{...cue,approach:[cue.position[0]+nx/length*3.6,1.65,cue.position[2]+nz/length*3.6]};
}));
export const DOME_SMOKE_OUTLET=freeze({...DOME.oculus,y:domeRoofHeight(DOME.oculus.x,DOME.oculus.z)+DOME.thickness});
const box=(id,x,z,w,d,height)=>({id,minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:-.09,maxY:height});
const rim=[];
for(let i=0;i<96;i++){
 const a=i/96*Math.PI*2,b=(i+1)/96*Math.PI*2,scale=.98,x0=DOME.radiusX*Math.sin(a)*scale,x1=DOME.radiusX*Math.sin(b)*scale,z0=DOME.centerZ+DOME.radiusZ*Math.cos(a)*scale,z1=DOME.centerZ+DOME.radiusZ*Math.cos(b)*scale;
 if(Math.max(Math.abs(x0),Math.abs(x1))<DOME.entryHalfWidth+.1&&z0>0)continue;
 // Include the complete low roof edge: an outside visitor's head must
 // clear its outer face, while an inside route keeps full headroom.
 const xs=[x0,x1,x0/scale,x1/scale],zs=[z0,z1,DOME.centerZ+(z0-DOME.centerZ)/scale,DOME.centerZ+(z1-DOME.centerZ)/scale];
 rim.push({id:'dome-rim-'+i,minX:Math.min(...xs)-.035,maxX:Math.max(...xs)+.035,minZ:Math.min(...zs)-.035,maxZ:Math.max(...zs)+.035,minY:-.09,maxY:2.05});
}
export const LISBON_DOME_OBSTACLES=freeze([
 ...rim,{id:'lisbon-dome-roof',minX:-DOME.radiusX,maxX:DOME.radiusX,minZ:DOME.centerZ-DOME.radiusZ,maxZ:DOME.centerZ+DOME.radiusZ,minY:-.09,maxY:DOME.height+.2,waveRoof:true},
 box('thp-laboratory',0,-2.4,3.6,1.2,1.15),box('lab-instruments',4.4,-3.5,2.5,.8,1.7),
 box('origins-lectern',-7.5,-8.5,1.3,1.2,1.6),box('fireplace-hearth',6,-9,4.3,1.62,4.65),
 box('opposite-black-plinth',-2.9,-11.65,3,.35,3.2),
 box('motorway-west',-11-2.05*Math.cos(.28)-.2*Math.sin(.28),7.3+2.05*Math.sin(.28)-.2*Math.cos(.28),.48,.48,5.6+5.4*.32),
 box('motorway-east',-11+2.05*Math.cos(.28)-.2*Math.sin(.28),7.3-2.05*Math.sin(.28)-.2*Math.cos(.28),.48,.48,5.6+5.4*.32),box('pedestrian-signal',3,9.3,.36,.36,3.1)
]);
