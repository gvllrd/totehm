// One inclined plane of low-iron glass threads through the ruined castle.
// Rendering, body collision, rain edge and smoke opening use these same metres.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const GLASS_SHELL=freeze({minX:-13.4,maxX:13.4,minZ:-17.4,maxZ:-1.6,thickness:.08,minHeight:7.15,maxHeight:9.85});
export function glassRoofHeight(x,z){return 8.5+.08*x-.03*(z+9.5);}
export const GLASS_HEARTH=freeze({center:[8,.28,-15.99],smokeOutlet:{x:8,y:glassRoofHeight(8,-15.99)+GLASS_SHELL.thickness,z:-15.99,radius:.58,radiusZ:.44},collectorBaseY:4.85,collectorRadius:[2.05,1.02]});
export function glassSmokeOpening(x,z,margin=0){
 const {smokeOutlet:o}=GLASS_HEARTH;
 return ((x-o.x)/(o.radius+margin))**2+((z-o.z)/(o.radiusZ+margin))**2<1;
}
