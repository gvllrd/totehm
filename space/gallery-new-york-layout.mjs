import {GALLERY_LAYOUT,GALLERY_STATIONS} from './gallery-modern-layout.mjs';
import {LISBON_URBEX_LAYOUT} from './gallery-lisbon-urbex-layout.mjs';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const {groundY}=GALLERY_LAYOUT;
const counter={...LISBON_URBEX_LAYOUT.counter,position:[0,.52,3.36],approach:[-1.72,1.65,3.67],target:[-.32,.70,3.57],href:'/get_higher?paper=1'};
const seat={
 position:[0,groundY,6.15],size:[2.78,1.48],approach:[-1.86,1.65,5.75],
 eye:[-.31,1.03,6.06],target:[0,3.20,-.85],fov:80
};
export const NEW_YORK_FLOORS=freeze([groundY]);
export const NEW_YORK_LAYOUT=freeze({...GALLERY_LAYOUT,floors:NEW_YORK_FLOORS,levels:1,
 halfWidth:16,frontZ:16,backZ:-17.6,entry:[2.92,1.65,10.2],look:[-.35,4.35,-.85],
 inside:seat.approach,insideTarget:seat.target,counter,seat,
 paperCaseWidth:LISBON_URBEX_LAYOUT.paperCaseWidth,
 paperAttache:{...LISBON_URBEX_LAYOUT.paperAttache,position:[-.32,3.48]},
 paperCases:[{position:[-.416,3.531],angle:-.91},{position:[-.224,3.531],angle:-.91}]
});
export const NEW_YORK_STATIONS=freeze(GALLERY_STATIONS.map((station,index)=>index===0?counter:index===3?{...counter,id:'stoner',room:3}:station));
export const NEW_YORK_RAMPS=freeze([]);
export const NEW_YORK_RAMP_TURNS=freeze([]);
export const NEW_YORK_CONNECTORS=freeze([]);
export const NEW_YORK_LANDINGS=freeze([{x:0,y:groundY,z:-5,floor:0}]);
export const NEW_YORK_FLOOR_RECTS=freeze([{id:'new-york-stone-terrace',floor:0,y:groundY,minX:-16,maxX:16,minZ:-18.1,maxZ:17.9}]);
function furniture(id,[x,,z],[width,depth],maxY){
 return{id,minX:x-width/2,maxX:x+width/2,minZ:z-depth/2,maxZ:z+depth/2,minY:groundY,maxY};
}
export const NEW_YORK_GROUND_OBSTACLES=freeze([
 furniture('new-york-leather-sofa',seat.position,seat.size,1.38),
 furniture('new-york-coffee-table',counter.position,counter.size,counter.position[1])
]);
export const NEW_YORK_EXHIBITION_WALLS=freeze([]);
export const NEW_YORK_EXHIBITION_OBSTACLES=freeze([]);
export function newYorkRampHeight(){return null;}
export function newYorkConnectorHeight(c){return c.y;}
export function newYorkRoofHeight(){return Infinity;}
export function newYorkSurfacesAt(x,z){
 const b=GALLERY_LAYOUT.bounds;
 return x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ?[{y:groundY,id:'ground',floor:0}]:[];
}
export function newYorkFloorAt(x,z,feetY=groundY){return newYorkSurfacesAt(x,z).find(s=>s.y<=feetY+.23)??null;}
