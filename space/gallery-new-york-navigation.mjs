import {createModernPhysics,createModernWalkway} from './gallery-modern-navigation.mjs';
import {GALLERY_LAYOUT} from './gallery-modern-layout.mjs';
import {NEW_YORK_GROUND_OBSTACLES} from './gallery-new-york-layout.mjs';

// The terrace is open. Routes only avoid the sofa and low table.
export function createNewYorkPhysics(initial={x:0,z:12}){
 const physics=createModernPhysics(initial,NEW_YORK_GROUND_OBSTACLES),diagnostics=physics.diagnostics;
 return{...physics,diagnostics:()=>({...diagnostics(),kind:'new-york-terrace-physics',levels:1,level:0,ramps:0,stairs:0})};
}
export function createNewYorkWalkway(){
 const walkway=createModernWalkway(NEW_YORK_GROUND_OBSTACLES),diagnostics=walkway.diagnostics;
 return{...walkway,route(from,to){const path=walkway.route(from,to);return path?.map(p=>({...p,y:GALLERY_LAYOUT.groundY+GALLERY_LAYOUT.eyeHeight}))??null;},diagnostics:()=>({...diagnostics(),kind:'new-york-terrace-walkway',floors:1,ramps:0,stairs:0,eyeCoordinates:true})};
}
