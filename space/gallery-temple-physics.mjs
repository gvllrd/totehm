import {GROUND_Y,EYE_HEIGHT,TEMPLE_COLUMNS,TEMPLE_FLOOR,TEMPLE_PORTALS} from './gallery-temple-layout.mjs';

const GRAVITY=12,JUMP_SPEED=16,RADIUS=.14,EPSILON=1e-7;
const finite=Number.isFinite;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const withinTop=(column,x,z)=>Math.abs(x-column.x)<=column.halfWidth+RADIUS-EPSILON&&Math.abs(z-column.z)<=column.halfWidth+RADIUS-EPSILON;
function columnCeiling(column,x,z){
 const dx=Math.abs(x-column.x),dz=Math.abs(z-column.z);
 if(dx<1.135+RADIUS&&dz<1.135+RADIUS)return 9.155;
 if(dx<column.halfWidth+RADIUS&&dz<column.halfWidth+RADIUS)return 9.4;
 return null;
}
function archBounds(portal,x){
 const local=Math.abs(x-portal.x),spring=7.755;
 if(local>3.15+RADIUS)return null;
 const inner=local<2.25-RADIUS?spring+2.97*Math.sqrt(Math.max(0,1-((local+RADIUS)/2.25)**2)):GROUND_Y;
 const outer=spring+4.158*Math.sqrt(Math.max(0,1-(Math.max(0,local-RADIUS)/3.15)**2));
 return{inner,outer};
}

// Feet, velocity and contacts are independent of the renderer. Displacement
// is swept in short substeps, including a descending segment crossing a top.
export function createTemplePhysics(initial={x:0,z:12}){
 const position={x:0,y:GROUND_Y,z:12};
 let velocityY=0,grounded=true,supportColumn=null,jumps=0,landings=0;
 function reset(next={}){
  position.x=clamp(finite(next.x)?next.x:0,-TEMPLE_FLOOR.walkHalfWidth,TEMPLE_FLOOR.walkHalfWidth);
  position.z=clamp(finite(next.z)?next.z:12,TEMPLE_FLOOR.minZ,TEMPLE_FLOOR.maxZ);
  position.y=finite(next.y)?Math.max(GROUND_Y,next.y):GROUND_Y;
  velocityY=0;supportColumn=TEMPLE_COLUMNS.findIndex(column=>withinTop(column,position.x,position.z)&&Math.abs(position.y-column.top)<EPSILON);
  if(supportColumn<0)supportColumn=null;
  grounded=position.y===GROUND_Y||supportColumn!==null;
  return position;
 }
 function jump(){
  if(!grounded)return false;
  velocityY=JUMP_SPEED;grounded=false;supportColumn=null;jumps++;return true;
 }
 function validHorizontal(x,z,y){
  if(Math.abs(x)>TEMPLE_FLOOR.walkHalfWidth||z<TEMPLE_FLOOR.minZ||z>TEMPLE_FLOOR.maxZ)return false;
  for(const column of TEMPLE_COLUMNS){
   if(y>=column.top-EPSILON)continue;
   const ceiling=columnCeiling(column,x,z);
   if(ceiling!==null&&y+EYE_HEIGHT>ceiling)return false;
   if(y<9.18&&y+EYE_HEIGHT>8.69&&Math.hypot(x-column.x,z-column.z)<1.05+RADIUS)return false;
   if(y<8.715&&Math.hypot(x-column.x,z-column.z)<column.shaftRadius+RADIUS)return false;
  }
  for(const portal of TEMPLE_PORTALS){
   if(Math.abs(z-portal.z)>.67+RADIUS)continue;
   const bounds=archBounds(portal,x);
   if(bounds&&y<bounds.outer&&y+EYE_HEIGHT>bounds.inner)return false;
  }
  return true;
 }
 function step(dt,{dx=0,dz=0,guided=false}={}){
  const elapsed=finite(dt)?clamp(dt,0,.05):0;
  if(!elapsed)return position;
  dx=finite(dx)?dx:0;dz=finite(dz)?dz:0;
  const inputScale=Math.min(1,(guided?40:2.6)*elapsed/Math.max(Math.hypot(dx,dz),EPSILON));dx*=inputScale;dz*=inputScale;
  const steps=Math.max(1,Math.ceil(elapsed/(1/240)),Math.ceil(Math.hypot(dx,dz)/.02)),h=elapsed/steps;
  for(let i=0;i<steps;i++){
   const oldY=position.y;
   if(supportColumn!==null&&!withinTop(TEMPLE_COLUMNS[supportColumn],position.x,position.z)){grounded=false;supportColumn=null;}
   if(!grounded){
    position.y+=velocityY*h-.5*GRAVITY*h*h;velocityY-=GRAVITY*h;
    if(velocityY>0)for(const column of TEMPLE_COLUMNS){
     const ceiling=columnCeiling(column,position.x,position.z);
     if(ceiling!==null&&oldY+EYE_HEIGHT<=ceiling+EPSILON&&position.y+EYE_HEIGHT>ceiling){position.y=ceiling-EYE_HEIGHT;velocityY=0;break;}
    }
    if(velocityY>0)for(const portal of TEMPLE_PORTALS){
     if(Math.abs(position.z-portal.z)>.67+RADIUS)continue;
     const bounds=archBounds(portal,position.x);
     if(bounds&&oldY+EYE_HEIGHT<=bounds.inner+EPSILON&&position.y+EYE_HEIGHT>bounds.inner){position.y=bounds.inner-EYE_HEIGHT;velocityY=0;break;}
    }
   }
   const x=position.x+dx/steps,z=position.z+dz/steps;
   if(validHorizontal(x,position.z,position.y))position.x=x;
   if(validHorizontal(position.x,z,position.y))position.z=z;
   if(supportColumn!==null&&!withinTop(TEMPLE_COLUMNS[supportColumn],position.x,position.z)){grounded=false;supportColumn=null;}
   if(!grounded&&velocityY<=0){
    const columnIndex=TEMPLE_COLUMNS.findIndex(column=>oldY>=column.top-EPSILON&&position.y<=column.top&&withinTop(column,position.x,position.z));
    if(columnIndex>=0){position.y=TEMPLE_COLUMNS[columnIndex].top;velocityY=0;grounded=true;supportColumn=columnIndex;landings++;}
    else if(position.y<=GROUND_Y){position.y=GROUND_Y;velocityY=0;grounded=true;supportColumn=null;landings++;}
   }
  }
  return position;
 }
 function diagnostics(){return{grounded,feetHeight:+position.y.toFixed(4),velocityY:+velocityY.toFixed(4),supportColumn,jumps,landings,jumpSpeed:JUMP_SPEED,gravity:GRAVITY,jumpApex:JUMP_SPEED**2/(2*GRAVITY)};}
 reset(initial);
 return{position,jump,step,reset,diagnostics};
}
