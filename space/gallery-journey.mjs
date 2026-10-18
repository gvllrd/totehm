import * as T from './vendor/three-0.180.0.mjs';

// The published intention traits continue outside the gallery. These are parts
// of the space, never additional artworks, editions or things to purchase.
const COLOURS = ['#E24B4A','#e48b31','#fcbe21','#639922','#1D9E75','#378ADD','#7F77DD'];
const PALETTE = COLOURS.map(colour => new T.Color(colour));
const KINDS = ['orbits','bloom','woven-space','spiral'];
export const JOURNEY = Object.freeze({portalZ:-16,spacing:32,corridorHalfWidth:12});

export function createJourney(scene,{mobile=typeof innerWidth==='number'&&innerWidth<650}={}) {
  const root=new T.Group();root.name='intention-space-journey';scene.add(root);
  const lineMaterial=new T.LineBasicMaterial({vertexColors:true,toneMapped:false,transparent:true,opacity:.94});
  const nodeMaterial=new T.PointsMaterial({vertexColors:true,size:.065,sizeAttenuation:true,toneMapped:false});
  const black=new T.MeshBasicMaterial({color:0x000000});
  const orbGeometry=new T.IcosahedronGeometry(2.2,2);
  const limit=mobile?3:5,pool=[];
  let sector=0,maxVisited=-1,outside=false,time=0,animated=false,rebuilds=0;
  const axis=new T.Vector3(0,1,0),rotation=new T.Euler();
  const segments=mobile?96:144;

  function centre(index) {
    return {x:(index%2? -1:1)*4.8,y:5.1,z:-34-index*JOURNEY.spacing};
  }
  function geometry(points,colours) {
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(points,3));
    g.setAttribute('color',new T.Float32BufferAttribute(colours,3));
    g.computeBoundingSphere();return g;
  }
  function build(slot,index) {
    const positions=[],colours=[],nodes=[],nodeColours=[];
    const kind=index%KINDS.length,phase=Math.sin(index*93.71)*Math.PI;
    function vertex(p,colour,target=positions,targetColours=colours) {
      target.push(p.x,p.y,p.z);targetColours.push(colour.r,colour.g,colour.b);
    }
    function curve(sample,colour,count=segments,knots=false) {
      let prior=sample(0);
      for(let j=1;j<=count;j++) {
        const current=sample(j/count);vertex(prior,colour);vertex(current,colour);
        if(knots&&j%Math.max(1,Math.floor(count/9))===0)vertex(current,colour,nodes,nodeColours);
        prior=current;
      }
    }
    function vector(x,y,z){return new T.Vector3(x,y,z);}
    for(let i=0;i<7;i++) {
      const colour=PALETTE[i],angle=i*Math.PI*2/7;
      if(kind===0) {
        // Seven orbital planes, a quiet black centre and sparse junctions.
        rotation.set(i*.37+.4,angle+.2,phase*.16+i*.23);
        const transform=new T.Quaternion().setFromEuler(rotation),radius=3.15+i*.16;
        curve(t=>vector(Math.cos(t*Math.PI*2)*radius,Math.sin(t*Math.PI*2)*radius,0).applyQuaternion(transform),colour,segments,true);
        curve(t=>vector(Math.cos(t*Math.PI*2)*radius*.79,Math.sin(t*Math.PI*2)*radius*.79,0).applyQuaternion(transform),colour);
      } else if(kind===1) {
        // Open celestial petals. The curves leave generous gaps for the sky.
        for(let layer=0;layer<3;layer++) {
          const spread=3.5+layer*.26;
          curve(t=>{
            const a=t*Math.PI*2,r=spread*(.5-.5*Math.cos(a));
            return vector(Math.cos(angle)*r+Math.sin(angle)*Math.sin(a)*1.15,
              Math.sin(a)*2.7+(1-Math.cos(a))*.58,
              Math.sin(angle)*r-Math.cos(angle)*Math.sin(a)*1.15).applyAxisAngle(axis,phase*.12+layer*.035);
          },colour,segments,layer===0);
        }
      } else if(kind===2) {
        // A folded, floating fabric made solely from thin intention threads.
        for(let strand=0;strand<3;strand++) {
          const offset=(i-3)*.47+strand*.11;
          curve(t=>{
            const u=(t-.5)*8.2;
            return vector(u,Math.sin(u*.55+phase)*1.55+offset*.7,
              Math.cos(u*.47+phase)*1.5+offset);
          },colour,segments,strand===1);
        }
        curve(t=>{
          const a=t*Math.PI*2;
          return vector(Math.cos(a)*4.4,Math.sin(a)*2.8,Math.sin(a*2+angle)*.45);
        },colour);
      } else {
        // A spacious seven-strand spiral, with fine cross-sections suspended
        // inside it. It is a sculpture of lines, not an animated vortex.
        curve(t=>{
          const a=t*Math.PI*3.8+angle,r=2.1+Math.sin(t*Math.PI)*.9;
          return vector(Math.cos(a)*r,(t-.5)*7.3,Math.sin(a)*r);
        },colour,segments,true);
        const y=(i-3)*.94,r=2.1+Math.sin((i+.5)/7*Math.PI)*.9;
        curve(t=>vector(Math.cos(t*Math.PI*2)*r,y,Math.sin(t*Math.PI*2)*r),colour);
      }
    }
    slot.lines.geometry.dispose();slot.nodes.geometry.dispose();
    slot.lines.geometry=geometry(positions,colours);slot.nodes.geometry=geometry(nodes,nodeColours);
    const c=centre(index);slot.sculpture.position.set(c.x,c.y,c.z);
    slot.sculpture.rotation.set(0,phase*.12,0);
    slot.orb.visible=kind===0;slot.orb.scale.setScalar(kind===0?1:0);
    slot.index=index;slot.kind=KINDS[kind];slot.base=phase*.12;

    // At floor level, the seven traits form a quiet route through the void.
    // Each pooled stretch meets its neighbours exactly, without an end wall.
    const route=[],routeColours=[];
    for(let i=0;i<7;i++) {
      const colour=PALETTE[i],x=(i-3)*.105;
      const z0=index===0?JOURNEY.portalZ:-18-index*JOURNEY.spacing;
      const z1=-18-(index+1)*JOURNEY.spacing;
      vertex(vector(x,.026,z0),colour,route,routeColours);
      vertex(vector(x,.026,z1),colour,route,routeColours);
    }
    slot.route.geometry.dispose();slot.route.geometry=geometry(route,routeColours);
    rebuilds++;
  }
  for(let i=0;i<limit;i++) {
    const sculpture=new T.Group(),lines=new T.LineSegments(new T.BufferGeometry(),lineMaterial);
    const nodes=new T.Points(new T.BufferGeometry(),nodeMaterial),orb=new T.Mesh(orbGeometry,black);
    sculpture.add(orb,lines,nodes);root.add(sculpture);
    const route=new T.LineSegments(new T.BufferGeometry(),lineMaterial);root.add(route);
    const slot={sculpture,lines,nodes,orb,route,index:-1,kind:'',base:0};pool.push(slot);build(slot,i);
  }
  function arrange(next) {
    const first=Math.max(0,next-1),required=Array.from({length:limit},(_,i)=>first+i);
    const spare=pool.filter(slot=>!required.includes(slot.index));
    for(const index of required)if(!pool.some(slot=>slot.index===index))build(spare.pop(),index);
  }
  return {
    update(dt,eye,motion) {
      const next=Math.max(0,Math.floor((-eye.z-18)/JOURNEY.spacing));
      const changed=next!==sector;
      if(changed){sector=next;arrange(sector);}
      outside=eye.z<JOURNEY.portalZ;
      if(outside)maxVisited=Math.max(maxVisited,sector);
      // The caller already pauses this module for the list and hidden page.
      // Reduced motion neither advances this clock nor moves any sculpture.
      animated=!!motion&&outside;
      if(animated)time+=Math.max(0,Math.min(dt,.05));
      for(const slot of pool)slot.sculpture.rotation.y=slot.base+Math.sin(time*.09+slot.index*.7)*.06;
      return changed||animated;
    },
    nextStop(eye) {
      const index=eye.z>-25?0:Math.max(0,Math.floor((-eye.z-25)/JOURNEY.spacing)+1),c=centre(index);
      return {position:new T.Vector3(0,1.65,c.z+9),target:new T.Vector3(c.x,c.y,c.z),sector:index};
    },
    diagnostics:()=>({outside,sector,visited:maxVisited+1,chambers:pool.length,
      kinds:pool.slice().sort((a,b)=>a.index-b.index).map(slot=>slot.kind),
      firstSector:Math.min(...pool.map(slot=>slot.index)),lastSector:Math.max(...pool.map(slot=>slot.index)),
      animated,time:+time.toFixed(2),rebuilds,colours:COLOURS.slice()}),
    dispose() {
      for(const slot of pool){slot.lines.geometry.dispose();slot.nodes.geometry.dispose();slot.route.geometry.dispose();}
      orbGeometry.dispose();lineMaterial.dispose();nodeMaterial.dispose();black.dispose();scene.remove(root);
    }
  };
}
