// Metres shared by the new castle fabric, visitor collision and route planning.
// The ruin is an asymmetrical surviving building, rather than attached turrets.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const wall=(id,axis,fixed,depth,sections,arches=[])=>({id,axis,fixed,depth,sections,arches,minY:-.09});
const arch=(id,centre,radius,spring)=>({id,centre,radius,spring,ring:.40});
const WALLS=[
 wall('castle-front-west','x',-2.35,1.05,[[-13.5,-11.8,7.6],[-11.8,-10.6,7.35],[-10.6,-9.1,7.05],[-9.1,-7.8,6.65],[-7.8,-6.6,5.95]],[arch('great-west-arch',-10.05,1.32,2.6)]),
 wall('castle-front-east','x',-2.35,.90,[[7.6,9.4,4.8],[9.4,10.8,5.25],[10.8,12.0,5.85],[12,13.5,6.3]]),
 wall('castle-rear-west','x',-17.35,1.05,[[-10.9,-8.8,8.2],[-8.8,-6.5,7.9],[-6.5,-4.0,7.25],[-4,-1.4,6.8],[-1.4,1.7,6.15]]),
 wall('castle-rear-east','x',-17.35,.95,[[6.8,8.6,4.95],[8.6,10.9,5.7],[10.9,13.5,6.4]]),
 wall('castle-east-gallery','z',13.35,1.0,[[-17.35,-15.4,6.4],[-15.4,-13.5,6.65],[-13.5,-11.6,6.1],[-11.6,-10.0,5.3]],[arch('ocean-east-arch',-13.15,1.38,2.9)]),
 wall('castle-keep-west','z',-13.45,.95,[[-17.35,-15.85,11.65],[-15.85,-14.4,11.9],[-14.4,-12.45,11.25]]),
 wall('castle-keep-east','z',-10.75,.85,[[-17.35,-15.4,11.25],[-15.4,-13.9,10.6],[-13.9,-12.45,9.95]]),
 wall('castle-keep-back','x',-17.35,.95,[[-13.9,-12.5,11.65],[-12.5,-10.35,11.25]]),
 wall('castle-keep-front','x',-12.45,.85,[[-13.9,-12.5,10.8],[-12.5,-10.35,9.95]],[arch('keep-doorway',-12.05,.73,2.45)])
];
function box(w,a,b,y0,y1,id){return w.axis==='x'?{id,minX:a,maxX:b,minZ:w.fixed-w.depth/2,maxZ:w.fixed+w.depth/2,minY:y0,maxY:y1}:{id,minX:w.fixed-w.depth/2,maxX:w.fixed+w.depth/2,minZ:a,maxZ:b,minY:y0,maxY:y1};}
export function castleArchHalfWidth(a,y,outer=false){const radius=a.radius+(outer?a.ring:0);return y<=a.spring?radius:y<a.spring+radius?Math.sqrt(Math.max(0,radius*radius-(y-a.spring)**2)):0;}
function obstacles(){
 const result=[];
 for(const w of WALLS)for(const [index,[a,b,top]] of w.sections.entries()){
  const relevant=w.arches.filter(o=>o.centre+o.radius>a&&o.centre-o.radius<b);
  if(!relevant.length){result.push(box(w,a,b,w.minY,top,w.id+'-'+index));continue;}
  // Thin bands describe the actual curved void. Vertical and horizontal
  // collision never replaces an open arch with a solid rectangular wall.
  const archTop=Math.min(top,Math.max(...relevant.map(o=>o.spring+o.radius))),levels=[w.minY,...Array.from({length:14},(_,i)=>Math.min(archTop,relevant[0].spring)+Math.max(0,archTop-relevant[0].spring)*i/13),archTop,top].filter((v,i,array)=>i===0||v>array[i-1]+.001);
  for(let row=0;row<levels.length-1;row++){
   const y0=levels[row],y1=levels[row+1];let intervals=[[a,b]];
   for(const opening of relevant){const width=Math.max(castleArchHalfWidth(opening,y0),castleArchHalfWidth(opening,y1));if(!width)continue;
    const lo=opening.centre-width,hi=opening.centre+width;intervals=intervals.flatMap(([left,right])=>[[left,Math.min(right,lo)],[Math.max(left,hi),right]].filter(([x,z])=>z-x>.003));
   }
   for(const [i,[lo,hi]] of intervals.entries())result.push(box(w,lo,hi,y0,y1,w.id+'-'+index+'-archband-'+row+'-'+i));
  }
 }
 return result;
}
export const CASTLE_WALLS=freeze(WALLS);
export const CASTLE_OBSTACLES=freeze(obstacles());
export function castleFabricPlan(place='lisbon'){return{place,walls:CASTLE_WALLS,obstacles:CASTLE_OBSTACLES,arches:CASTLE_WALLS.flatMap(w=>w.arches.map(a=>({...a,wall:w.id,axis:w.axis,fixed:w.fixed,depth:w.depth}))),keep:{minX:-13.9,maxX:-10.325,minZ:-17.825,maxZ:-12.025,height:11.9},entry:{minX:-6.6,maxX:7.6,height:8.0}};}
