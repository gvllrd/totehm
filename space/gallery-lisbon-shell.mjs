// Restored c8ddaf0 wave section, isolated from New York's present castle roof.
// The current right-hand hearth retains its position and actual smoke opening.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const GLASS_SHELL=freeze({minX:-13.35,maxX:13.35,minZ:-17.3,maxZ:-1.55,thickness:.12,minHeight:6,maxHeight:8.4});
export function glassRoofHeight(x,z){
 const transverse=Math.sin((x+13.35)/26.7*Math.PI*1.4);
 const longitudinal=Math.cos((z+9.425)/15.75*Math.PI);
 const hearthLift=Math.exp(-(((x-8)/4)**2+((z+15.99)/4)**2));
 const wave=6.58+.68*(transverse+.2)+.28*longitudinal+.84*hearthLift;
 const t=Math.max(0,Math.min(1,(z+6)/4)),join=t*t*(3-2*t);
 return wave+(7.25-wave)*join;
}
export const GLASS_HEARTH=freeze({center:[8,.28,-15.99],smokeOutlet:{x:8,y:glassRoofHeight(8,-15.99)+GLASS_SHELL.thickness,z:-15.99,radius:.58,radiusZ:.44},collectorBaseY:4.85,collectorRadius:[2.05,1.02]});
export function glassSmokeOpening(x,z,margin=0){
 const {smokeOutlet:o}=GLASS_HEARTH;
 return ((x-o.x)/(o.radius+margin))**2+((z-o.z)/(o.radiusZ+margin))**2<1;
}
export const LISBON_ROOF_PROFILE=freeze({height:glassRoofHeight,smokeOpening:glassSmokeOpening,thickness:GLASS_SHELL.thickness});

