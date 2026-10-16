import * as T from './vendor/three-0.180.0.mjs';

// A sculptural, mature ficus: fluted buttresses, twisting boughs and separate
// evergreen leaves. Everything is made locally; the canopy is not a billboard.
export function createTree(scene, renderer) {
  const mobile = innerWidth < 650, root = new T.Group();
  root.position.set(0, 0, -2.6); root.name = 'Estrela ficus'; scene.add(root);
  let seed = 340573;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a,b) => a + (b-a) * random();
  const v = (x,y,z) => new T.Vector3(x,y,z);
  const polar = (a,r,y) => v(Math.cos(a)*r,y,Math.sin(a)*r);
  const texture = canvas => {
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = Math.min(4,renderer.capabilities.getMaxAnisotropy()); return map;
  };
  const canvas = (w,h) => { const c=document.createElement('canvas'); c.width=w; c.height=h; return c; };

  // Smooth silvery bark, long fine fissures and the soft lichen marks of an old
  // ficus, rather than the deeply cracked bark of an oak.
  const barkCanvas=canvas(256,1024), barkContext=barkCanvas.getContext('2d');
  barkContext.fillStyle='#8e8978'; barkContext.fillRect(0,0,256,1024);
  for(let i=0;i<2200;i++){
    const x=range(0,256), y=range(-40,1024), length=range(7,145);
    barkContext.strokeStyle=random()<.58?`rgba(42,44,35,${range(.03,.23)})`:`rgba(207,202,175,${range(.025,.16)})`;
    barkContext.lineWidth=range(.3,2.8); barkContext.beginPath(); barkContext.moveTo(x,y);
    barkContext.bezierCurveTo(x+range(-3,3),y+length*.35,x+range(-5,5),y+length*.75,x+range(-2,2),y+length); barkContext.stroke();
  }
  for(let i=0;i<240;i++){
    barkContext.fillStyle=`rgba(67,81,48,${range(.025,.09)})`;
    barkContext.beginPath(); barkContext.ellipse(range(0,256),range(0,1024),range(1,9),range(2,18),range(-1,1),0,Math.PI*2); barkContext.fill();
  }
  const barkMap=texture(barkCanvas); barkMap.wrapS=barkMap.wrapT=T.RepeatWrapping;
  const barkMaterial=new T.MeshStandardMaterial({map:barkMap,bumpMap:barkMap,bumpScale:.032,color:0xb6b09f,roughness:.88});
  const positions=[], normals=[], uvs=[], indices=[];
  let limbCount=0;

  // All wood shares one mesh. Parallel transported rings stay rounded through
  // a bend, while small longitudinal flutes join the roots to the broad trunk.
  function limb(points,radiusStart,radiusEnd,{steps=18,sides=9,flute=.07,oval=1}={}){
    const curve=new T.CatmullRomCurve3(points,false,'centripetal'), frames=curve.computeFrenetFrames(steps,false);
    const offset=positions.length/3, length=curve.getLength();
    for(let j=0;j<=steps;j++){
      const t=j/steps, p=curve.getPointAt(t);
      const radius=T.MathUtils.lerp(radiusStart,radiusEnd,Math.pow(t,.78));
      for(let k=0;k<=sides;k++){
        const a=k/sides*Math.PI*2;
        const corr=1+flute*(Math.sin(a*5+t*1.8)+.42*Math.sin(a*9-t*3));
        const n=frames.normals[j].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[j],Math.sin(a));
        const q=p.clone().addScaledVector(frames.normals[j],Math.cos(a)*radius*corr).addScaledVector(frames.binormals[j],Math.sin(a)*radius*corr*oval);
        positions.push(q.x,q.y,q.z); normals.push(n.x,n.y,n.z); uvs.push(k/sides*2,t*length*.55);
        if(j<steps&&k<sides){ const a0=offset+j*(sides+1)+k, b0=a0+sides+1; indices.push(a0,a0+1,b0,b0,a0+1,b0+1); }
      }
    }
    limbCount++; return curve;
  }

  // A shallow, irregular dark planting well lets the living roots meet stone.
  const outline=new T.Shape();
  for(let i=0;i<=72;i++){
    const a=i/72*Math.PI*2, r=1.49+.035*Math.sin(a*7)+.025*Math.cos(a*11);
    if(i===0)outline.moveTo(Math.cos(a)*r,Math.sin(a)*r); else outline.lineTo(Math.cos(a)*r,Math.sin(a)*r);
  }
  const soil=new T.Mesh(new T.ShapeGeometry(outline),new T.MeshStandardMaterial({color:0x080b08,roughness:1}));
  soil.rotation.x=-Math.PI/2; soil.position.y=.012; soil.receiveShadow=true; root.add(soil);

  // The central trunk is wide enough to feel centuries old; the roots form
  // tall, sloping buttresses rather than an ornamental pot or a narrow pole.
  limb([v(0,-.16,0),v(-.13,.65,.06),v(.06,1.65,-.04),v(.17,2.8,.08),v(.05,4.1,.13),v(.21,5.5,.08)],.86,.30,{steps:38,sides:23,flute:.12,oval:.92});
  for(let i=0;i<11;i++){
    const a=i/11*Math.PI*2+range(-.1,.1), reach=range(1.25,1.61);
    limb([polar(a,.23,range(1.1,1.95)),polar(a+.06,.58,.63),polar(a+.04,reach*.76,.16),polar(a,reach,.022)],range(.26,.37),.025,{steps:18,sides:10,flute:.10,oval:.68});
  }
  // Twined columns and short aerial roots are characteristic of old banyans.
  limb([v(.64,.02,.14),v(.53,1.3,.21),v(.54,2.65,.12),v(.38,4.1,.13)],.34,.19,{steps:24,sides:12,flute:.1});
  limb([v(-.44,.04,-.40),v(-.46,1.1,-.33),v(-.27,2.75,-.19),v(.06,4.3,.09)],.27,.14,{steps:24,sides:11,flute:.11});

  const sprays=[];
  for(let i=0;i<9;i++){
    const a=i/9*Math.PI*2+.20, startY=3.35+(i%3)*.40;
    const reach=range(2.85,3.85), endY=range(7.25,8.65);
    const p0=v(.10,startY,.08), p1=polar(a+.10,.85,startY+1.30);
    const p2=polar(a-.05,reach*.65,endY-.35), p3=polar(a,reach,endY);
    limb([p0,p1,p2,p3],range(.31,.46),.105,{steps:30,sides:13,flute:.075});
    for(let j=0;j<3;j++){
      const spread=(j-1)*.46+range(-.12,.12), sa=a+spread;
      const start=polar(a,reach*.76,endY-.20);
      const tip=polar(sa,reach+range(.65,1.27),endY+range(.22,1.05));
      const bend=start.clone().lerp(tip,.55); bend.y+=range(.25,.65);
      limb([start,bend,tip],range(.078,.115),.026,{steps:15,sides:8,flute:.04});
      sprays.push({center:tip.clone(),angle:sa,scale:range(.65,.9)});
      for(let k=0;k<3;k++){
        const ta=sa+(k-1)*range(.32,.65), tr=reach+range(1.05,1.8);
        const startTwig=bend.clone().lerp(tip,range(.20,.78));
        const end=polar(ta,tr,tip.y+range(-.52,.72));
        const mid=startTwig.clone().lerp(end,.55); mid.y+=.19;
        limb([startTwig,mid,end],.029,.006,{steps:9,sides:6,flute:.02});
        sprays.push({center:end,angle:ta,scale:range(.65,1.05)});
      }
    }
  }
  // A few hanging strands stay above head height and make the open silhouette
  // recognisable without filling the walking space with dangling geometry.
  for(let i=0;i<15;i++){
    const a=range(0,Math.PI*2), r=range(1.15,2.7), top=range(5.7,7.1), bottom=range(3.8,5.1);
    const p=polar(a,r,top);
    limb([p,p.clone().add(v(.035,-.65,.03)),polar(a+.025,r+.06,bottom)],range(.013,.023),.004,{steps:10,sides:5,flute:0});
  }
  const woodGeometry=new T.BufferGeometry();
  woodGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  woodGeometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  woodGeometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2)); woodGeometry.setIndex(indices);
  woodGeometry.computeBoundingSphere();
  const wood=new T.Mesh(woodGeometry,barkMaterial); wood.castShadow=true; wood.receiveShadow=true; root.add(wood);

  const leafCanvas=canvas(96,192), ctx=leafCanvas.getContext('2d');
  const leafFill=ctx.createLinearGradient(12,0,76,192); leafFill.addColorStop(0,'#7c9273'); leafFill.addColorStop(.48,'#c0ce9b'); leafFill.addColorStop(1,'#4a6845');
  ctx.fillStyle=leafFill; ctx.beginPath(); ctx.moveTo(48,5); ctx.bezierCurveTo(1,37,1,125,48,185); ctx.bezierCurveTo(94,121,95,37,48,5); ctx.fill();
  ctx.strokeStyle='rgba(225,227,163,.63)'; ctx.lineWidth=1.25; ctx.beginPath(); ctx.moveTo(48,185); ctx.quadraticCurveTo(42,86,48,10); ctx.stroke();
  for(let i=0;i<9;i++){
    const y=28+i*15, extent=Math.sin((y-5)/180*Math.PI)*33;
    ctx.strokeStyle='rgba(211,220,164,.23)'; ctx.lineWidth=.65; ctx.beginPath(); ctx.moveTo(46,y+10); ctx.quadraticCurveTo(46-extent*.55,y,48-extent,y-6); ctx.moveTo(46,y+10); ctx.quadraticCurveTo(48+extent*.55,y,48+extent,y-6); ctx.stroke();
  }
  const leafMap=texture(leafCanvas), leafGeometry=new T.PlaneGeometry(1,1,1,2);
  const leafVertices=leafGeometry.attributes.position;
  for(let i=0;i<leafVertices.count;i++){
    const x=leafVertices.getX(i), y=leafVertices.getY(i);
    leafVertices.setZ(i,.12*Math.abs(x)*2+.07*(y+.5)*(y+.5));
  }
  leafGeometry.computeVertexNormals();
  const leavesPerSpray=mobile?112:164, leafCount=sprays.length*leavesPerSpray;
  const leafMaterial=new T.MeshLambertMaterial({map:leafMap,alphaTest:.52,side:T.DoubleSide,color:0x6c8861});
  const leaves=new T.InstancedMesh(leafGeometry,leafMaterial,leafCount); leaves.name='Individual ficus leaves';
  const dummy=new T.Object3D(), leafColor=new T.Color(); let leafIndex=0;
  for(const spray of sprays){
    for(let i=0;i<leavesPerSpray;i++){
      // A rounded spray follows the branch, but its individual leaves have
      // open pockets and irregular silhouettes against the stars.
      const a=range(0,Math.PI*2), rr=Math.sqrt(random()), yy=range(-1,1);
      const width=spray.scale*Math.sqrt(Math.max(.05,1-yy*yy));
      const dx=Math.cos(a)*rr*width, dz=Math.sin(a)*rr*width*.79;
      dummy.position.copy(spray.center).add(v(dx,yy*.48*spray.scale,dz));
      dummy.rotation.set(-Math.PI/2+range(-.65,.65),range(-.7,.7),spray.angle+range(-Math.PI,Math.PI));
      const size=range(.24,.43); dummy.scale.set(size*.52,size,1); dummy.updateMatrix();
      leaves.setMatrixAt(leafIndex,dummy.matrix);
      leafColor.setHSL(range(.245,.30),range(.12,.24),range(.40,.70)); leaves.setColorAt(leafIndex,leafColor); leafIndex++;
    }
  }
  leaves.instanceMatrix.needsUpdate=true; leaves.instanceColor.needsUpdate=true;
  leaves.castShadow=true; leaves.receiveShadow=false; leaves.computeBoundingSphere(); leaves.computeBoundingBox(); root.add(leaves);
  const height=Math.round(leaves.boundingBox.max.y*100)/100;

  // Low, warm architectural uplight reveals the fluted trunk; a soft neutral
  // light makes the underside of the evergreen crown legible at night.
  const trunkLight=new T.PointLight(0xeadbc0,25,11,2); trunkLight.position.set(1.6,1.2,1.4); root.add(trunkLight);
  const crownLight=new T.PointLight(0xd4e2d6,27,12,2); crownLight.position.set(-.65,5.9,.55); root.add(crownLight);

  return {
    collision:{x:0,z:-2.6,radius:1.85},
    pickables:[wood],
    diagnostics:()=>({species:'ficus',center:[0,-2.6],radius:1.85,branches:limbCount,leaves:leafCount,height,animated:false})
  };
}
