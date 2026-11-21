import {WORLD_CENTER_Y,WORLD_RADIUS} from './gallery-drowned-planet.mjs';

export const CRISTO_REI_LOCATION=Object.freeze({x:-500,z:-570,yaw:Math.atan2(500,570),scale:3.5});
export const PONTE_25_ABRIL_LOCATION=Object.freeze({x:95,z:-870,yaw:Math.PI*.486,scale:1.17});
export const CRISTO_PEDESTAL_HEIGHT=82;
export const CRISTO_STATUE_HEIGHT=28;
export const CRISTO_FEET_DEPTH=2.25;
export const BRIDGE_DECK_LOCAL_Y=79;
export const BRIDGE_DECK_DEPTH=76;
export const CRISTO_WAVE_SHADOW=Object.freeze({inner:24,outer:110,transmission:.029});

export function stillOceanHeight(x,z){
 const rho=Math.hypot(x,z);
 return WORLD_CENTER_Y+Math.sqrt(Math.max(0,(WORLD_RADIUS-rho)*(WORLD_RADIUS+rho)));
}

export function oceanDomain(x,z){
 const radius=Math.hypot(x,z);
 const scale=radius?WORLD_RADIUS*Math.asin(Math.min(1,radius/WORLD_RADIUS))/radius:1;
 return [x*scale,z*scale];
}

export function cristoFeetHeight(){
 return stillOceanHeight(CRISTO_REI_LOCATION.x,CRISTO_REI_LOCATION.z)-CRISTO_FEET_DEPTH;
}

export function bridgeHeight(x,z,localY){
 return stillOceanHeight(x,z)-BRIDGE_DECK_DEPTH+(localY-BRIDGE_DECK_LOCAL_Y)*PONTE_25_ABRIL_LOCATION.scale;
}
