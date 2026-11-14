import {LISBON_STREET_SIGNS as ORIGINAL_SIGNS} from './gallery-lisbon-signs-layout.mjs';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const INTENTIONS=freeze([
 {id:'fight',label:'Fight',color:'#E24B4A'}, {id:'flow',label:'Flow',color:'#e48b31'},
 {id:'enrich',label:'Enrich',color:'#fcbe21'}, {id:'focus',label:'Focus',color:'#378ADD'},
 {id:'express',label:'Express',color:'#1D9E75'}, {id:'celebrate',label:'Celebrate',color:'#7F77DD'},
 {id:'love',label:'Love',color:'#639922'}
]);
export const DOME=freeze({radiusX:12.65,radiusZ:8.2,centerZ:-8.8,height:10.25,groundY:-.09,thickness:.14,entryHalfWidth:2.55,entryHeight:5,oculus:{x:6,z:-9,radius:.52,radiusZ:.52}});
export function domeRoofHeight(x,z){return DOME.groundY+DOME.height*Math.sqrt(Math.max(0,1-(x/DOME.radiusX)**2-((z-DOME.centerZ)/DOME.radiusZ)**2))-.14;}
export function domeOpening(x,z,margin=0){const r=(x/DOME.radiusX)**2+((z-DOME.centerZ)/DOME.radiusZ)**2,o=DOME.oculus;return r>=1||Math.abs(x)<DOME.entryHalfWidth&&z>DOME.centerZ&&domeRoofHeight(x,z)+.14<DOME.entryHeight+.02||((x-o.x)/(o.radius+margin))**2+((z-o.z)/(o.radiusZ+margin))**2<1;}
export const DOME_ROOF_PROFILE=freeze({height:domeRoofHeight,smokeOpening:domeOpening,thickness:DOME.thickness});
const counter={id:'thp',room:0,position:[-5,1.03,1.4],approach:[-5,1.65,3.2],target:[-5,1.15,1.4],href:'/get_higher'};
export const LISBON_DOME_LAYOUT=freeze({halfWidth:12.65,frontZ:-.6,backZ:-17,groundY:-.09,eyeHeight:1.74,levels:1,entry:[0,1.65,16],look:[0,11.5,-6],inside:[0,1.65,1.2],insideTarget:[0,3,-8],counter,
 origins:{id:'origins',room:1,book:[0,21.34,-43],lectern:[0,21.22,-43],approach:[0,1.65,2],target:[0,20,-4.2],href:'/origins'},
 play:{id:'play',room:2,approach:[0,1.65,1.2],target:[0,3.5,-9],href:'/play_lisbon_street'},stoner:{...counter,id:'stoner',room:3},
 opposite:{id:'opposite',room:4,screen:[0,2,-12],screenSize:[2.6,1.4625],approach:[0,1.65,1.2],target:[0,3,-9],href:'/same_but_opposite'},fireplace:{position:[6,0,-9],approach:[6,1.65,1.2],target:[6,2.1,-9]}});
export const LISBON_DOME_STATIONS=freeze([LISBON_DOME_LAYOUT.counter,LISBON_DOME_LAYOUT.origins,LISBON_DOME_LAYOUT.play,LISBON_DOME_LAYOUT.stoner,LISBON_DOME_LAYOUT.opposite]);
export const LISBON_DOME_SIGNS=freeze(ORIGINAL_SIGNS.map(sign=>({...sign,zone:'inside',mount:'curved-preview'})));
export const DOME_SMOKE_OUTLET=freeze({...DOME.oculus,y:domeRoofHeight(DOME.oculus.x,DOME.oculus.z)+DOME.thickness});
const box=(id,x,z,w,d,height)=>({id,minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:-.09,maxY:height});
const rim=[];
for(let i=0;i<96;i++){const a=i/96*Math.PI*2,b=(i+1)/96*Math.PI*2,scale=.98,x0=DOME.radiusX*Math.sin(a)*scale,x1=DOME.radiusX*Math.sin(b)*scale,z0=DOME.centerZ+DOME.radiusZ*Math.cos(a)*scale,z1=DOME.centerZ+DOME.radiusZ*Math.cos(b)*scale;if(Math.max(Math.abs(x0),Math.abs(x1))<DOME.entryHalfWidth+.1&&z0>DOME.centerZ)continue;const xs=[x0,x1,x0/scale,x1/scale],zs=[z0,z1,DOME.centerZ+(z0-DOME.centerZ)/scale,DOME.centerZ+(z1-DOME.centerZ)/scale];rim.push({id:'dome-rim-'+i,minX:Math.min(...xs)-.035,maxX:Math.max(...xs)+.035,minZ:Math.min(...zs)-.035,maxZ:Math.max(...zs)+.035,minY:-.09,maxY:2.05});}
export const LISBON_DOME_OBSTACLES=freeze([...rim,{id:'lisbon-dome-roof',minX:-DOME.radiusX,maxX:DOME.radiusX,minZ:DOME.centerZ-DOME.radiusZ,maxZ:DOME.centerZ+DOME.radiusZ,minY:-.09,maxY:DOME.height+.2,waveRoof:true},box('lisbon-tinted-door',0,-.6,5.1,.4,5),box('thp-laboratory',-5,1.4,3.6,1.2,1.15),box('lab-instruments',5,1.4,2.5,.8,1.7),box('discover-monolith',-7.4,1.25,1.3,.24,2.4),box('fireplace-hearth',6,-9,4.3,1.62,4.65)]);
