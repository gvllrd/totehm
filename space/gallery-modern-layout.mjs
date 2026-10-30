import {GLASS_SHELL} from './gallery-glass-shell.mjs';
import {LISBON_FACADE,LISBON_FACADE_BALCONIES} from './gallery-lisbon-facade.mjs';
import {heritageObstacles} from './gallery-heritage-layout.mjs';
// Shared world metres for the pavilion, furniture and collision/navigation.
// Historical temple dimensions remain in their independent module.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const GALLERY_LAYOUT=freeze({
 halfWidth:13,frontZ:-2,backZ:-17,height:GLASS_SHELL.maxHeight,facadeHeight:LISBON_FACADE.height,entryWidth:4.8,entryHeight:3.1,
 groundY:-.09,eyeHeight:1.74,bounds:{minX:-15.8,maxX:15.8,minZ:-17.6,maxZ:16},
 entry:[0,1.65,12],look:[0,2.45,-8],inside:[0,1.65,-5],insideTarget:[0,1.35,-12],
 counter:{id:'thp',room:0,position:[0,1.03,-12.05],approach:[0,1.65,-10.35],target:[0,1.1,-11.85],href:'/get_higher'},
 origins:{id:'origins',room:1,lectern:[-7.6,1.31,-8],book:[-7.6,1.37,-8],approach:[-7.6,1.65,-5.7],target:[-7.6,1.37,-8],href:'/origins'},
 play:{id:'play',room:2,screen:[8,3.1,-16.18],screenSize:[7,3.9],approach:[8,1.65,-7.5],target:[8,3.1,-16.18],href:'/play_lisbon_street'},
 stoner:{id:'stoner',room:3,position:[0,3.45,-16.30],approach:[0,1.65,-9.4],target:[0,3.45,-16.30],href:'/get_higher'},
 opposite:{id:'opposite',room:4,screen:[-12.72,3.1,-7],screenSize:[5.6,3.15],approach:[-5,1.65,-7],target:[-12.72,3.1,-7],href:'/same_but_opposite'},
 fireplace:{position:[-8,0,-16.05],approach:[-9.2,1.65,-8.3],target:[-8,3,-15.9]}
});
const box=(id,minX,maxX,minZ,maxZ,minY,maxY,shape={})=>({id,minX,maxX,minZ,maxZ,minY,maxY,...shape});
export const GALLERY_EXHIBITION_WALLS=freeze([-1,1].map(side=>{
 const width=side<0?2.2:3,height=3.8,depth=.12,x=side*9.12,z=side<0?-11.8:-7.4,normal=[-side,0,0],count=side<0?2:3;
 return{id:'lisbon-exhibition-'+(side<0?'west':'east'),floor:0,x,y:GALLERY_LAYOUT.groundY+height/2,z,width,height,depth,normal,
  slots:Array.from({length:count},(_,i)=>({id:'lisbon-art-slot-'+side+'-'+i,position:[x+normal[0]*(depth/2+.015),1.81,z+(i-(count-1)/2)*width/count],width:width/count-.16,height:2.8,normal:[...normal]}))};
}));
export const GALLERY_OBSTACLES=freeze([
 box('gallery-back-wall',-13,13,-17.2,-16.8,-.09,GLASS_SHELL.maxHeight,{waveWall:{axis:'z',at:-17}}),
 box('gallery-left-glass',-13.16,-12.94,-17,-2,-.09,GLASS_SHELL.maxHeight,{waveWall:{axis:'x',at:-13}}),
 box('gallery-right-glass',12.94,13.16,-17,-2,-.09,GLASS_SHELL.maxHeight,{waveWall:{axis:'x',at:13}}),
 box('gallery-front-left',-13,-2.4,-2.2,-1.8,-.09,LISBON_FACADE.height),
 box('gallery-front-right',2.4,13,-2.2,-1.8,-.09,LISBON_FACADE.height),
 box('gallery-entry-lintel',-2.4,2.4,-2.2,-1.8,3.1,LISBON_FACADE.height),
 ...LISBON_FACADE_BALCONIES,
 ...heritageObstacles('lisbon'),
 box('gallery-roof',GLASS_SHELL.minX,GLASS_SHELL.maxX,GLASS_SHELL.minZ,GLASS_SHELL.maxZ,GLASS_SHELL.minHeight,GLASS_SHELL.maxHeight+GLASS_SHELL.thickness,{waveRoof:true}),
 box('thp-counter',-3.5,3.5,-13.05,-11.05,-.09,1.03),
 box('origins-lectern',-8.15,-7.05,-8.48,-7.52,-.09,1.65),
 box('fireplace-hearth',-10.15,-5.85,-16.8,-15.18,-.09,4.65),
 ...GALLERY_EXHIBITION_WALLS.map(w=>box(w.id,w.x-w.depth/2,w.x+w.depth/2,w.z-w.width/2,w.z+w.width/2,GALLERY_LAYOUT.groundY,GALLERY_LAYOUT.groundY+w.height))
]);
export const GALLERY_STATIONS=freeze([GALLERY_LAYOUT.counter,GALLERY_LAYOUT.origins,GALLERY_LAYOUT.play,GALLERY_LAYOUT.stoner,GALLERY_LAYOUT.opposite]);
