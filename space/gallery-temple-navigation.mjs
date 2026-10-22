// Unobstructed walking stone: the former trees and their planting beds are
// removed from both the scene and its collision map. Guided walks stop at
// the sill; crossing an arch remains an explicit physical transition.
export function createTempleWalkway() {
 const gates=[-9,0,9],routeEdge=-11.4;
 const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
 function portalAt(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||z> -12)return null;
  const room=gates.findIndex(gate=>Math.abs(x-gate)<1.7);
  return room<0?null:room;
 }
 function allowed(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>14||z< -13||z>16)return false;
  return z>=routeEdge||gates.some(gate=>Math.abs(x-gate)<1.7);
 }
 function clear(a,b){
  // The walking terrace is convex. Valid endpoints above the sill therefore
  // define a clear segment; columns remain outside its side boundaries.
  return !!(finite(a)&&finite(b)&&a.z>=routeEdge&&b.z>=routeEdge&&allowed(a.x,a.z)&&allowed(b.x,b.z));
 }
 function route(from,to){return clear(from,to)?[from,to]:null;}
 return {allowed,clear,route,portalAt};
}
