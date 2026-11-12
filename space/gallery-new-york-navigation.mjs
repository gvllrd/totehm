import {createModernPhysics,createModernWalkway} from './gallery-modern-navigation.mjs';
import {GALLERY_LAYOUT} from './gallery-modern-layout.mjs';
import {NEW_YORK_GROUND_OBSTACLES} from './gallery-new-york-layout.mjs';

// The same precise ruin/glass geometry now encloses both single-level cities.
// Preserve eye-space route points for callers that previously used NY levels.
export function createNewYorkPhysics(initial={x:0,z:12}){
 const physics=createModernPhysics(initial,NEW_YORK_GROUND_OBSTACLES),diagnostics=physics.diagnostics;
 return{...physics,diagnostics:()=>({...diagnostics(),kind:'coastal-castle-physics',levels:1,level:0,ramps:0,stairs:0})};
}
export function createNewYorkWalkway(){
 const walkway=createModernWalkway(NEW_YORK_GROUND_OBSTACLES),diagnostics=walkway.diagnostics;
 return{...walkway,route(from,to){const path=walkway.route(from,to);return path?.map(p=>({...p,y:GALLERY_LAYOUT.groundY+GALLERY_LAYOUT.eyeHeight}))??null;},diagnostics:()=>({...diagnostics(),kind:'coastal-castle-walkway',floors:1,ramps:0,stairs:0,eyeCoordinates:true})};
}
