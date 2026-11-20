// The parked vessel remains the physical connection to the submerged Earth.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const ORIGIN_RETURN=freeze({
 ship:[0,3500,-4.2],eye:[0,3502.45,-4.2],approach:[0,3501.65,-19],portal:[0,3598,90],
 corridor:[-36.5,-32.8,-27,-19],boarding:[-16,-13.9,-12,-8,-4.2],
 flight:[[0,3502.45,-4.2],[0,3510,4],[0,3540,25],[0,3580,65],[0,3598,89.7]],
 href:'/lisbon-space?arrival=origin'
});
export const reverseIslandFlight=journey=>journey.outbound.slice().reverse().map(p=>p.slice());
