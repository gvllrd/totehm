// One floor joins the processor plaza to the Origins promenade.
const obstacles=[{minX:3,maxX:9,minZ:-.5,maxZ:.5},{minX:-16.2,maxX:-5.8,minZ:-5.3,maxZ:-4.7},{minX:-22,maxX:-9,minZ:-666,maxZ:-17},{minX:9,maxX:22,minZ:-666,maxZ:-17}];
const inside=(x,z,r)=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ;
export function allowed(x,z){return Number.isFinite(x)&&Number.isFinite(z)&&x>=-21&&x<=21&&z>=-660&&z<=24&&!obstacles.some(r=>inside(x,z,r));}
function touches(a,b,r){
 let lo=0,hi=1;
 for(const [axis,min,max] of [['x',r.minX,r.maxX],['z',r.minZ,r.maxZ]]){
  const d=b[axis]-a[axis];if(!d){if(a[axis]<min||a[axis]>max)return false;}
  else{let u=(min-a[axis])/d,v=(max-a[axis])/d;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return false;}
 }
 return true;
}
export function clear(a,b){return !!a&&!!b&&allowed(a.x,a.z)&&allowed(b.x,b.z)&&!obstacles.some(r=>touches(a,b,r));}
const corners=obstacles.flatMap(r=>[r.minX-.25,r.maxX+.25].flatMap(x=>[r.minZ-.25,r.maxZ+.25].map(z=>({x,z})))).filter(p=>allowed(p.x,p.z));
corners.push({x:0,z:10},{x:0,z:-16},{x:0,z:-18});
export function route(from,to){
 if(!from||!to||!allowed(from.x,from.z)||!allowed(to.x,to.z))return null;
 if(clear(from,to))return[from,to];
 const nodes=[from,to,...corners],cost=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),seen=new Set();cost[0]=0;
 for(let step=0;step<nodes.length;step++){
  let n=-1;for(let i=0;i<nodes.length;i++)if(!seen.has(i)&&(n<0||cost[i]<cost[n]))n=i;
  if(n<0||!Number.isFinite(cost[n]))return null;
  if(n===1){const path=[];for(let i=1;i>=0;i=prev[i])path.unshift(nodes[i]);return path;}
  seen.add(n);
  for(let i=0;i<nodes.length;i++)if(!seen.has(i)&&clear(nodes[n],nodes[i])){const c=cost[n]+Math.hypot(nodes[n].x-nodes[i].x,nodes[n].z-nodes[i].z);if(c<cost[i]){cost[i]=c;prev[i]=n;}}
 }
 return null;
}
