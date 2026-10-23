// Unobstructed walking stone: no columns or planting beds remain in the
// scene or collision map. Guided walks stop at
// the sill; crossing an arch remains an explicit physical transition.
import {TEMPLE_PORTALS} from './gallery-temple-layout.mjs';
export function createTempleWalkway() {
 const gates=TEMPLE_PORTALS.map(portal=>portal.x),routeEdge=-11.4;
 const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
 function portalAt(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||z> -12)return null;
  const room=gates.findIndex(gate=>Math.abs(x-gate)<2.1);
  return room<0?null:room;
 }
 function allowed(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>14||z< -13||z>16)return false;
  return z>=routeEdge||gates.some(gate=>Math.abs(x-gate)<2.1);
 }
 function clear(a,b){
  // The walking terrace is convex. Valid endpoints above the sill therefore
  // define a clear segment through the empty forecourt.
  return !!(finite(a)&&finite(b)&&a.z>=routeEdge&&b.z>=routeEdge&&allowed(a.x,a.z)&&allowed(b.x,b.z));
 }
 function route(from,to){
  if(!finite(from)||!finite(to)||!allowed(to.x,to.z)||to.z<routeEdge||Math.abs(from.x)>15.8||from.z< -13||from.z>16)return null;
  if(clear(from,to))return[from,to];
  if(Math.abs(from.x)<=14){
   if(from.z>=routeEdge)return null;
   const distance=Math.min(...gates.map(gate=>Math.abs(from.x-gate)));
   // Openings and the real empty gaps have a clear return to the forecourt.
   if(from.z> -12||distance<2.1||distance>3.3)return[from,{x:from.x,z:-10.6},to];
   // A visitor behind a stone jamb goes around its back. The rear strip is
   // still real paving; traversing it avoids crossing the volume of a door.
   const gap=[-13.3,-4.5,4.5,13.3].reduce((best,x)=>Math.abs(x-from.x)<Math.abs(best-from.x)?x:best,-13.3);
   return[from,{x:from.x,z:-12.95},{x:gap,z:-12.95},{x:gap,z:-10.6},to];
  }
  // The outer edge is empty paving too. Return through the open forecourt;
  // if the visitor is jumping, gravity continues independently of this route.
  const side=Math.sign(from.x),points=[from];let z=from.z;
  const inward={x:side*13.3,z},anchor={x:side*13.3,z:Math.max(-10.6,z)};
  points.push(inward);if(anchor.z!==z)points.push(anchor);points.push(to);return points;
 }
 return {allowed,clear,route,portalAt};
}
