// Shared metres: rendered stone and movement use the same dimensions.
export const GROUND_Y = -.09;
export const EYE_HEIGHT = 1.74;
export const TEMPLE_FLOOR = Object.freeze({halfWidth:16,halfDepth:18,walkHalfWidth:15.8,minZ:-13,maxZ:16});
export const TEMPLE_PORTALS = Object.freeze([-9,0,9].map((x,room)=>Object.freeze({room,x,z:-12,width:4.5,height:10.725,outerHeight:11.913,scaleX:1.25,scaleY:1.65})));
