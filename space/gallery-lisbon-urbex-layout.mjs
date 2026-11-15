import {INTENTIONS} from './gallery-lisbon-dome-layout.mjs';
import {PLAY_SIGNS} from './gallery-play-installation.mjs';
export {INTENTIONS};
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const counter={id:'thp',room:0,position:[0,1.03,-7.4],approach:[0,1.65,-3.9],approachMobile:[6.4,1.65,-4.7],target:[0,1.23,-7.4],href:'/get_higher'};
export const LISBON_URBEX_LAYOUT=freeze({halfWidth:13,frontZ:-2,backZ:-17,groundY:-.09,eyeHeight:1.74,levels:1,
 entry:[0,1.65,12],look:[0,3.45,-7],inside:[0,1.65,-4.1],insideTarget:[-3.5,3.4,-15.1],counter,
 origins:{id:'origins',room:1,book:[0,21.34,-43],lectern:[0,21.22,-43],approach:[0,1.65,2],target:[0,20,-4.2],href:'/origins'},
 play:{id:'play',room:2,screen:[-3.4,3.45,-15.15],screenSize:[13.2,5.15],approach:[-3.4,1.65,-8.3],approachMobile:[-3.4,1.65,-3.7],target:[-3.4,3.45,-15.15],href:'/play_lisbon_street?discover=1'},
 stoner:{...counter,id:'stoner',room:3},opposite:{id:'opposite',room:4,approach:[0,1.65,-4],target:[0,3,-14]},
 fireplace:{position:[8,0,-15.99],approach:[8,1.65,-11],target:[8,2.1,-15.99]}});
export const LISBON_URBEX_STATIONS=freeze([LISBON_URBEX_LAYOUT.counter,LISBON_URBEX_LAYOUT.origins,LISBON_URBEX_LAYOUT.play,LISBON_URBEX_LAYOUT.stoner,LISBON_URBEX_LAYOUT.opposite]);
export const LISBON_HOLOGRAM_SIGNS=freeze(PLAY_SIGNS.map(sign=>({...sign,zone:'inside',mount:'hologram'})));
const box=(id,x,z,w,d,height)=>({id,minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:-.09,maxY:height});
export const LISBON_URBEX_FURNITURE=freeze([box('thp-laboratory',0,-7.4,6.8,1.4,1.94)]);
export const LISBON_URBEX_STONE=freeze([
 box('hologram-stone-backing',-3.5,-16.65,14.1,.45,2.25),
 box('west-broken-rear-pier',-10.15,-16.65,.8,.55,4.4),
 box('east-broken-rear-pier',3.1,-16.65,.75,.55,3.5),
 box('west-retained-wall',-12.6,-13.6,.65,5.6,4.6),
 box('west-broken-return',-10.95,-10.9,2.7,.65,2.5),
 box('east-retained-pier',12.25,-11,.8,3.3,4.2),
 box('east-broken-return',11.55,-9.1,2.2,.6,1.55)
]);
