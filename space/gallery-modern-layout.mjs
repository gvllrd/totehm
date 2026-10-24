// Shared world metres for the pavilion, furniture and collision/navigation.
// Historical temple dimensions remain in their independent module.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const GALLERY_LAYOUT=freeze({
 halfWidth:13,frontZ:-2,backZ:-17,height:6.2,entryWidth:4.8,entryHeight:3.1,
 groundY:-.09,eyeHeight:1.74,bounds:{minX:-15.8,maxX:15.8,minZ:-17.6,maxZ:16},
 entry:[0,1.65,12],look:[0,2.45,-8],inside:[0,1.65,-5],insideTarget:[0,1.35,-12],
 counter:{id:'thp',room:0,position:[0,1.03,-12.05],approach:[0,1.65,-8.8],target:[0,1.35,-12.2],href:'/get_higher'},
 origins:{id:'origins',room:1,table:[-7.6,.97,-8],book:[-7.6,1.03,-8],approach:[-7.6,1.65,-4],target:[-7.6,1.03,-8],href:'/origins'},
 play:{id:'play',room:2,table:[8,.55,-10.4],controller:[8,.575,-10.4],screen:[8,3.1,-16.18],screenSize:[7,3.9],sofa:[8,.43,-6.3],approach:[11.2,1.65,-7.9],target:[8,1.4,-12.2],href:'/play_lisbon_street'}
});
const box=(id,minX,maxX,minZ,maxZ,minY,maxY)=>({id,minX,maxX,minZ,maxZ,minY,maxY});
export const GALLERY_OBSTACLES=freeze([
 box('gallery-back-wall',-13,13,-17.2,-16.8,-.09,6.2),
 box('gallery-left-glass',-13.16,-12.94,-17,-2,-.09,6.2),
 box('gallery-right-glass',12.94,13.16,-17,-2,-.09,6.2),
 box('gallery-front-left',-13,-2.4,-2.2,-1.8,-.09,6.2),
 box('gallery-front-right',2.4,13,-2.2,-1.8,-.09,6.2),
 box('gallery-entry-lintel',-2.4,2.4,-2.2,-1.8,3.1,6.2),
 box('gallery-roof',-13.35,13.35,-17.3,-1.55,6.0,6.28),
 box('thp-counter',-3.5,3.5,-13.05,-11.05,-.09,1.03),
 box('origins-table',-9.25,-5.95,-9.1,-6.9,-.09,.97),
 box('play-coffee-table',5.6,10.4,-11.3,-9.5,-.09,.55),
 box('play-sofa',5.15,10.85,-7.2,-5.4,-.09,1.15)
]);
export const GALLERY_STATIONS=freeze([GALLERY_LAYOUT.counter,GALLERY_LAYOUT.origins,GALLERY_LAYOUT.play]);
