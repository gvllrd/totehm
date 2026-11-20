import {INTENTIONS} from './gallery-lisbon-dome-layout.mjs';
import {PLAY_SIGNS} from './gallery-play-installation.mjs';
export {INTENTIONS};

function freeze(value) {
 if(value&&typeof value==='object'){
  Object.values(value).forEach(freeze);
  Object.freeze(value);
 }
 return value;
}

const groundY=-.09;
const counter={
 id:'thp',room:0,position:[0,.52,1.33],size:[2.35,1.12],
 approach:[-2.1,1.65,2.42],target:[0,.68,1.33],href:'/get_higher'
};
const seat={
 position:[0,groundY,3.75],size:[1.55,1.48],
 approach:[-1.38,1.65,3.37],eye:[0,1.04,3.63],target:[0,2.3,-12.7],fov:66
};
const play={
 id:'play',room:2,screen:[0,6.35,-12.7],screenSize:[16.8,9.45],
 approach:[0,1.65,-4.8],target:[0,6.35,-12.7],href:'/play_lisbon_street'
};
const fireplace={position:[2.65,0,2.65],approach:[1.2,1.65,1.3],target:[2.65,.55,2.65]};

export const LISBON_URBEX_LAYOUT=freeze({
 halfWidth:16,frontZ:16,backZ:-17.6,groundY,eyeHeight:1.74,levels:1,
 entry:[3.15,1.65,11.9],look:[0,4.9,-9.1],
 inside:[-1.7,1.65,2.55],insideTarget:seat.target,
 pavement:{size:[32,36],z:-.2,boatCentre:[0,8]},
 counter,seat,play,fireplace,controller:{position:[.50,1.63],width:.225,tablePitch:.16,tableYaw:-.23},
 paperCaseWidth:.042,
 paperAttache:{position:[-.59,1.49],size:[.57,.334],lidHeight:.295,cradleHeight:.082},
 paperCases:[{position:[-.686,1.541],angle:-.91},{position:[-.494,1.541],angle:-.91}],
 origins:{id:'origins',room:1,book:[0,21.34,-43],lectern:[0,21.22,-43],approach:[0,1.65,8.3],target:[0,20,-4.2],href:'/origins'},
 stoner:{...counter,id:'stoner',room:3},opposite:{id:'opposite',room:4,approach:[0,1.65,-4],target:[0,3,-14]}
});
export const LISBON_URBEX_STATIONS=freeze([LISBON_URBEX_LAYOUT.counter,LISBON_URBEX_LAYOUT.origins,play,LISBON_URBEX_LAYOUT.stoner,LISBON_URBEX_LAYOUT.opposite]);
// The original signs float on the projection and assemble in the experience.
export const LISBON_HOLOGRAM_SIGNS=freeze(PLAY_SIGNS.map(sign=>({...sign,zone:'experience',mount:'discover'})));
function box(id,x,z,width,depth,maxY){return{id,minX:x-width/2,maxX:x+width/2,minZ:z-depth/2,maxZ:z+depth/2,minY:groundY,maxY};}
export const LISBON_URBEX_FURNITURE=freeze([
 box('lisbon-coffee-table',counter.position[0],counter.position[2],...counter.size,counter.position[1]),
 box('lisbon-leather-seat',seat.position[0],seat.position[2],...seat.size,1.4),
 box('lisbon-wood-fire',fireplace.position[0],fireplace.position[2],1.8,1.8,.4)
]);
export const LISBON_URBEX_STONE=freeze([]);
