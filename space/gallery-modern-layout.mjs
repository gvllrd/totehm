// Shared world metres for the pavilion, furniture and collision/navigation.
// Historical temple dimensions remain in their independent module.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const GALLERY_LAYOUT=freeze({
 halfWidth:13,frontZ:-2,backZ:-17,height:6.2,entryWidth:4.8,entryHeight:3.1,
 groundY:-.09,eyeHeight:1.74,bounds:{minX:-15.8,maxX:15.8,minZ:-17.6,maxZ:16},
 entry:[0,1.65,12],look:[0,2.45,-8],inside:[0,1.65,-5],insideTarget:[0,1.35,-12],
 counter:{id:'thp',room:0,position:[0,1.03,-12.05],approach:[0,1.65,-10.35],target:[0,1.1,-11.85],href:'/get_higher'},
 origins:{id:'origins',room:1,lectern:[-7.6,1.31,-8],book:[-7.6,1.37,-8],approach:[-7.6,1.65,-5.7],target:[-7.6,1.37,-8],href:'/origins'},
 play:{id:'play',room:2,screen:[8,3.1,-16.18],screenSize:[7,3.9],approach:[8,1.65,-7.5],target:[8,3.1,-16.18],href:'/play_lisbon_street'},
 fireplace:{position:[-8,0,-16.05],approach:[-8,1.65,-12.4],target:[-8,1.2,-15.9]}
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
 box('origins-lectern',-8.15,-7.05,-8.48,-7.52,-.09,1.65),
 box('fireplace-hearth',-10.15,-5.85,-16.8,-15.18,-.09,3.35),
 box('fireplace-flue',-8.22,-7.78,-16.42,-15.98,3.2,8.4)
]);
export const GALLERY_STATIONS=freeze([GALLERY_LAYOUT.counter,GALLERY_LAYOUT.origins,GALLERY_LAYOUT.play]);
