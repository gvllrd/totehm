import * as T from './vendor/three-0.180.0.mjs';

// Camera choreography only: the visitor still follows the existing safe floor
// path, can interrupt walking, and reaches the same physical book and reader.
const ease=(a,b,t)=>T.MathUtils.smoothstep(t,a,b);
const settle=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
export const ORIGIN_BOOK_JOURNEY=Object.freeze({revealDuration:.85,desktopArrivalFov:64,mobileArrivalFov:65});

export function sampleOriginBookJourney({eye,book,startTarget,progress,startFov=72,mobile=false}){
 const p=T.MathUtils.clamp(progress,0,1);
 const windowView=ease(.06,.31,p)*(1-ease(.49,.76,p));
 const docking=ease(.56,.97,p);
 const ahead=eye.clone().add(new T.Vector3(0,.36,-12));
 const celestial=eye.clone().add(new T.Vector3(-6.5,6,-14));
 const target=ahead.lerp(celestial,windowView).lerp(book,docking);
 target.lerpVectors(startTarget,target,ease(0,.14,p));
 const arrival=mobile?ORIGIN_BOOK_JOURNEY.mobileArrivalFov:ORIGIN_BOOK_JOURNEY.desktopArrivalFov;
 const fov=T.MathUtils.lerp(startFov+windowView*(mobile?2.5:4.5),arrival,docking);
 return{target,fov,windowView,docking};
}

export function sampleOriginBookReveal({from,focus,startTarget,progress,startFov=64}){
 const p=settle(progress),distance=from.distanceTo(focus);
 // A short push along the existing sightline stops outside the lectern.
 const amount=T.MathUtils.clamp((distance-1.9)/Math.max(.01,distance),0,.18);
 const destination=from.clone().lerp(focus,amount);destination.y=from.y;
 const position=from.clone().lerp(destination,p);
 const target=startTarget.clone().lerp(focus,p);
 const fov=T.MathUtils.lerp(startFov,Math.min(startFov,56),p);
 return{position,target,fov};
}
