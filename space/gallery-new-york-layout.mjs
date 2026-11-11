import {GALLERY_LAYOUT,GALLERY_STATIONS,GALLERY_EXHIBITION_WALLS,GALLERY_OBSTACLES} from './gallery-modern-layout.mjs';
import {GLASS_HEARTH,glassRoofHeight} from './gallery-glass-shell.mjs';

// Both locations now inhabit a single open coastal castle. The city selects
// the material atmosphere; the old stacked office floors and ramps are gone.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const NEW_YORK_FLOORS=freeze([GALLERY_LAYOUT.groundY]);
export const NEW_YORK_LAYOUT=freeze({...GALLERY_LAYOUT,floors:NEW_YORK_FLOORS,levels:1,slabThickness:.16,rampWidth:0,smokeOutlet:GLASS_HEARTH.smokeOutlet,inside:[0,1.65,-2.65],insideTarget:[0,2.75,-9]});
export const NEW_YORK_STATIONS=GALLERY_STATIONS;
export const NEW_YORK_RAMPS=freeze([]);
export const NEW_YORK_RAMP_TURNS=freeze([]);
export const NEW_YORK_CONNECTORS=freeze([]);
export const NEW_YORK_LANDINGS=freeze([{x:0,y:GALLERY_LAYOUT.groundY,z:-5,floor:0}]);
export const NEW_YORK_FLOOR_RECTS=freeze([{id:'castle-ground',floor:0,y:GALLERY_LAYOUT.groundY,minX:-13,maxX:13,minZ:-17,maxZ:-2}]);
export const NEW_YORK_OPPOSITES_WALL=freeze({id:'new-york-opposites-wall',minX:-7.4,maxX:7.4,minZ:-9.1,maxZ:-8.9,minY:.28,maxY:5.3});
export const NEW_YORK_GROUND_OBSTACLES=freeze([...GALLERY_OBSTACLES,NEW_YORK_OPPOSITES_WALL]);
export const NEW_YORK_EXHIBITION_WALLS=GALLERY_EXHIBITION_WALLS;
export const NEW_YORK_EXHIBITION_OBSTACLES=freeze([]);
export function newYorkRampHeight(){return null;}
export function newYorkConnectorHeight(c){return c.y;}
export function newYorkRoofHeight(x,z){return glassRoofHeight(x,z);}
export function newYorkSurfacesAt(x,z){
 const b=GALLERY_LAYOUT.bounds;
 return x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ?[{y:GALLERY_LAYOUT.groundY,id:'ground',floor:0}]:[];
}
export function newYorkFloorAt(x,z,feetY=GALLERY_LAYOUT.groundY){return newYorkSurfacesAt(x,z).find(s=>s.y<=feetY+.23)??null;}
