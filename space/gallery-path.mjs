// The chamber opens only through its far portal; exterior navigation is unbounded.
export function createWalkway(tree) {
  const outside=-16.9;
  function allowed(x,z) {
    const chamber=Math.hypot(x,z+3)<12.25;
    const portal=Math.abs(x)<1.4&&z<-14;
    const space=z<outside&&Math.abs(x)<11.5;
    return (chamber||portal||space)&&Math.hypot(x-tree.x,z-tree.z)>tree.radius;
  }
  function clear(a,b) {
    if(!allowed(a.x,a.z)||!allowed(b.x,b.z))return false;
    if(a.z<outside&&b.z<outside)return true;
    let start=a,end=b;
    if(a.z<outside){const t=(outside-a.z)/(b.z-a.z);start={x:a.x+(b.x-a.x)*t,z:outside};}
    if(b.z<outside){const t=(outside-a.z)/(b.z-a.z);end={x:a.x+(b.x-a.x)*t,z:outside};}
    const steps=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)/.06));
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      if(!allowed(start.x+(end.x-start.x)*t,start.z+(end.z-start.z)*t))return false;
    }
    return true;
  }
  const waypoints=[{x:0,z:-14.4},{x:0,z:-18.5}];
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12,r=tree.radius+.32;
    waypoints.push({x:tree.x+Math.cos(a)*r,z:tree.z+Math.sin(a)*r});
  }
  function route(from,to) {
    if(!allowed(to.x,to.z))return null;
    if(clear(from,to))return [from,to];
    const nodes=[from,to,...waypoints],distances=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set();
    distances[0]=0;
    for(let count=0;count<nodes.length;count++){
      let current=-1;
      for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(current<0||distances[i]<distances[current]))current=i;
      if(current<0||!Number.isFinite(distances[current]))return null;
      if(current===1){const path=[];for(let i=1;i!==-1;i=previous[i])path.unshift(nodes[i]);return path;}
      visited.add(current);
      for(let i=0;i<nodes.length;i++){
        if(visited.has(i))continue;
        const d=distances[current]+Math.hypot(nodes[i].x-nodes[current].x,nodes[i].z-nodes[current].z);
        if(d<distances[i]&&clear(nodes[current],nodes[i])){distances[i]=d;previous[i]=current;}
      }
    }
    return null;
  }
  return {allowed,clear,route};
}
