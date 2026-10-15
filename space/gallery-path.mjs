// Camera clearance around the living centre and the stone bench (metres).
export function createWalkway(tree) {
  const bench={left:-4.65,right:-1.35,near:2.55,far:4.05};
  function allowed(x,z) {
    return x>-6.2&&x<6.2&&z>-11.8&&z<8.8 &&
      Math.hypot(x-tree.x,z-tree.z)>tree.radius &&
      !(x>bench.left&&x<bench.right&&z>bench.near&&z<bench.far);
  }
  function clear(a,b) {
    const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.08));
    for(let i=0;i<=steps;i++) {
      const t=i/steps;
      if(!allowed(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;
    }
    return true;
  }
  // A small visibility graph permits every guided station to skirt the roots.
  const waypoints=[];
  for(let i=0;i<24;i++) {
    const angle=i*Math.PI/12,r=tree.radius+.3;
    waypoints.push({x:tree.x+Math.cos(angle)*r,z:tree.z+Math.sin(angle)*r});
  }
  for(const x of [bench.left-.12,bench.right+.12])for(const z of [bench.near-.12,bench.far+.12])waypoints.push({x,z});
  function route(from,to) {
    if(!allowed(to.x,to.z))return null;
    if(clear(from,to))return [from,to];
    const nodes=[from,to,...waypoints.filter(p=>allowed(p.x,p.z))];
    const distances=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set();
    distances[0]=0;
    for(let count=0;count<nodes.length;count++) {
      let current=-1;
      for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(current<0||distances[i]<distances[current]))current=i;
      if(current<0||!Number.isFinite(distances[current]))return null;
      if(current===1) {
        const path=[];
        for(let i=1;i!==-1;i=previous[i])path.unshift(nodes[i]);
        return path;
      }
      visited.add(current);
      for(let i=0;i<nodes.length;i++) {
        if(visited.has(i))continue;
        const distance=distances[current]+Math.hypot(nodes[i].x-nodes[current].x,nodes[i].z-nodes[current].z);
        if(distance<distances[i]&&clear(nodes[current],nodes[i])){distances[i]=distance;previous[i]=current;}
      }
    }
    return null;
  }
  return {allowed,clear,route};
}
