import {GLASS_SHELL} from './gallery-glass-shell.mjs';
import {CASTLE_OBSTACLES} from './gallery-castle-plan.mjs';
// Shared world metres for the pavilion, furniture and collision/navigation.
// Historical temple dimensions remain in their independent module.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const counter={id:'thp',room:0,position:[0,1.03,-12.05],approach:[0,1.65,-10.35],target:[0,1.1,-11.85],href:'/get_higher'};
export const GALLERY_LAYOUT=freeze({
 halfWidth:13,frontZ:-2,backZ:-17,height:GLASS_SHELL.maxHeight,facadeHeight:GLASS_SHELL.maxHeight,entryWidth:5.6,entryHeight:5.1,levels:1,
 groundY:-.09,eyeHeight:1.74,bounds:{minX:-15.8,maxX:15.8,minZ:-17.6,maxZ:16},
 entry:[0,1.65,12],look:[0,3.4,-8],inside:[0,1.65,-5],insideTarget:[0,1.35,-12],
 counter,
 origins:{id:'origins',room:1,lectern:[-12,1.22,-15.65],book:[-12,1.34,-15.65],approach:[-12,1.65,-14.2],target:[-12,1.34,-15.65],href:'/origins'},
 play:{id:'play',room:2,screen:[-6,3.3,-16.68],screenSize:[6.5,3.65],approach:[-6,1.65,-10.4],target:[-6,3.3,-16.68],href:'/play_lisbon_street'},
 stoner:{...counter,id:'stoner',room:3},
 opposite:{id:'opposite',room:4,screen:[-.35,3.2,-16.68],screenSize:[3.8,2.14],approach:[-.35,1.65,-13.8],target:[-.35,3.2,-16.68],href:'/same_but_opposite'},
 fireplace:{position:[8,0,-15.99],approach:[8,1.65,-11],target:[8,2.1,-15.99]}
});
const box=(id,minX,maxX,minZ,maxZ,minY,maxY,shape={})=>({id,minX,maxX,minZ,maxZ,minY,maxY,...shape});
// Unoccupied partitions have no place in this open, double-height room.
export const GALLERY_EXHIBITION_WALLS=freeze([]);
export const GALLERY_OBSTACLES=freeze([
 box('gallery-back-wall',-13,13,-17.2,-16.8,-.09,GLASS_SHELL.maxHeight,{waveWall:{axis:'z',at:-17}}),
 box('gallery-left-glass',-13.16,-12.94,-17,-2,-.09,GLASS_SHELL.maxHeight,{waveWall:{axis:'x',at:-13}}),
 box('gallery-right-glass',12.94,13.16,-17,-2,-.09,GLASS_SHELL.maxHeight,{waveWall:{axis:'x',at:13}}),
 box('gallery-front-left',-13,-2.8,-2.2,-1.8,-.09,GLASS_SHELL.maxHeight,{waveWall:{axis:'z',at:-2}}),
 box('gallery-front-right',2.8,13,-2.2,-1.8,-.09,GLASS_SHELL.maxHeight,{waveWall:{axis:'z',at:-2}}),
 box('gallery-entry-lintel',-2.8,2.8,-2.2,-1.8,5.1,GLASS_SHELL.maxHeight,{waveWall:{axis:'z',at:-2}}),
 ...CASTLE_OBSTACLES,
 box('gallery-roof',GLASS_SHELL.minX,GLASS_SHELL.maxX,GLASS_SHELL.minZ,GLASS_SHELL.maxZ,GLASS_SHELL.minHeight,GLASS_SHELL.maxHeight+GLASS_SHELL.thickness,{waveRoof:true}),
 box('thp-counter',-1.8,1.8,-12.65,-11.45,-.09,1.03),
 box('origins-lectern',-12.65,-11.35,-16.25,-15.05,-.09,1.6),
 box('fireplace-hearth',5.85,10.15,-16.8,-15.18,-.09,4.65),
 ...GALLERY_EXHIBITION_WALLS.map(w=>box(w.id,w.x-w.depth/2,w.x+w.depth/2,w.z-w.width/2,w.z+w.width/2,GALLERY_LAYOUT.groundY,GALLERY_LAYOUT.groundY+w.height))
]);
export const GALLERY_STATIONS=freeze([GALLERY_LAYOUT.counter,GALLERY_LAYOUT.origins,GALLERY_LAYOUT.play,GALLERY_LAYOUT.stoner,GALLERY_LAYOUT.opposite]);
