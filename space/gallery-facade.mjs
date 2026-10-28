import * as T from './vendor/three-0.180.0.mjs';

// The original drawing and sculpted THP are shared by both places. Resource
// ownership stays with the caller, including the photograph on the paper.
export function createGalleryFacade(root,{mobile=false,geometry,material,station,black,sculptedPaperMaterial,position=[0,4.6,-1.76]}){
 const sign=new T.Group();sign.name='The original mouth — sculpted tongue and dimensional THP';sign.position.set(...position);root.add(sign);
 const signScale=.00235,point=v=>[(v[0]-540)*signScale,(940-v[1])*signScale];
 function curveShape(points){const shape=new T.Shape();shape.moveTo(...point(points[0]));for(let i=0;i<points.length-1;i++){const a=points[i-1]||points[i],b=points[i],c=points[i+1],d=points[i+2]||c;shape.bezierCurveTo(...point([b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6]),...point([c[0]-(d[0]-b[0])/6,c[1]-(d[1]-b[1])/6]),...point(c));}shape.closePath();return shape;}
 const top=[[47,740],[95,668],[150,580],[205,490],[262,410],[318,355],[378,334],[460,346],[540,360],[620,346],[702,334],[762,355],[818,410],[875,490],[930,580],[985,668],[1033,740]],bottom=[[47,740],[92,825],[140,915],[195,1005],[300,1080],[540,1120],[780,1080],[885,1005],[940,915],[988,825],[1033,740]],upper=[[110,740],[195,694],[285,648],[405,590],[540,608],[675,590],[795,648],[885,694],[970,740]],lower=[[110,740],[200,786],[290,826],[400,852],[540,862],[680,852],[790,826],[880,786],[970,740]];
 const lipMaterial=material(new T.MeshPhysicalMaterial({color:0x242426,roughness:.32,metalness:.10,clearcoat:.25,clearcoatRoughness:.35}));
 const tongueMaterial=material(new T.MeshPhysicalMaterial({color:0x303033,roughness:.39,metalness:.035,clearcoat:.22,clearcoatRoughness:.30}));
 function relief(shape,m,z,depth=.09,bevel=.035,name='Sculpted mouth'){
  const g=geometry(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:mobile?3:5,curveSegments:mobile?18:28,steps:1}));
  const part=new T.Mesh(g,m);part.position.z=z;part.name=name;sign.add(part);station(part,'gallery-entry','entrance',-1);return part;
 }
 relief(curveShape([...top,...bottom.slice().reverse()]),lipMaterial,0,.09,.035,'Original mouth — rounded three-dimensional lips');
 const cavity=new T.Mesh(geometry(new T.ShapeGeometry(curveShape([...upper,...lower.slice().reverse()]),24)),black);cavity.position.z=.135;sign.add(cavity);station(cavity,'gallery-entry','entrance',-1);
 const teeth=upper.slice(2,7),toothDepth=[0,80,72,80,0];relief(curveShape([...teeth,...teeth.map((v,i)=>[v[0],v[1]+toothDepth[i]]).reverse()]),material(new T.MeshStandardMaterial({color:0x3c3c3c,roughness:.57})),.14,.018,.008,'Original subtle teeth relief');
 const tongue=new T.Shape();tongue.moveTo(...point([540,762]));const cubic=(a,b,c)=>tongue.bezierCurveTo(...point(a),...point(b),...point(c));
 cubic([505,738],[460,727],[410,727]);cubic([300,727],[207,770],[207,880]);tongue.lineTo(...point([207,1190]));cubic([207,1390],[360,1540],[540,1540]);cubic([720,1540],[872,1390],[872,1190]);tongue.lineTo(...point([872,880]));cubic([872,770],[780,727],[670,727]);cubic([620,727],[575,738],[540,762]);tongue.closePath();
 const tongueMesh=relief(tongue,tongueMaterial,.18,.18,.055,'Volumetric tongue curving out of the facade');
 const tongueCurve=y=>.15*Math.pow(T.MathUtils.clamp((.50-y)/1.91,0,1),2);
 function smoothTongue(source,maxEdge){
  const vertices=[],indices=[],welded=new Map(),attribute=source.attributes.position,limit=maxEdge*maxEdge;
  const squared=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
  const middle=(a,b)=>[(a[0]+b[0])*.5,(a[1]+b[1])*.5,(a[2]+b[2])*.5];
  function vertex(p){const key=p.map(n=>Math.round(n*1e7)).join(',');let index=welded.get(key);if(index===undefined){index=vertices.length/3;welded.set(key,index);vertices.push(...p);}return index;}
  function split(a,b,c,depth=0){
   const ab=squared(a,b),bc=squared(b,c),ca=squared(c,a),longest=Math.max(ab,bc,ca);
   if(longest<=limit||depth>=18){indices.push(vertex(a),vertex(b),vertex(c));return;}
   if(longest===ab){const m=middle(a,b);split(a,m,c,depth+1);split(m,b,c,depth+1);}
   else if(longest===bc){const m=middle(b,c);split(a,b,m,depth+1);split(a,m,c,depth+1);}
   else{const m=middle(c,a);split(a,b,m,depth+1);split(m,b,c,depth+1);}
  }
  for(let n=0;n<attribute.count;n+=3){const points=[];for(let k=0;k<3;k++)points.push([attribute.getX(n+k),attribute.getY(n+k),attribute.getZ(n+k)]);split(...points);}
  const g=new T.BufferGeometry();g.name='Smooth subdivided solid tongue — original silhouette';g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);
  const p=g.attributes.position;for(let n=0;n<p.count;n++)p.setZ(n,p.getZ(n)+tongueCurve(p.getY(n)));
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
 }
 const coarseTongue=tongueMesh.geometry;tongueMesh.geometry=geometry(smoothTongue(coarseTongue,mobile?.14:.095));coarseTongue.dispose();
 const seamPoints=[];for(let i=0;i<=16;i++){const y=T.MathUtils.lerp(point([540,792])[1],point([540,1340])[1],i/16);seamPoints.push(new T.Vector3(0,y,.18+.18+.055+tongueCurve(y)+.007));}
 const seam=new T.Mesh(geometry(new T.TubeGeometry(new T.CatmullRomCurve3(seamPoints),24,.004,5,false)),material(new T.MeshStandardMaterial({color:0x1d1d20,roughness:.65})));seam.name='Sculpted central tongue crease';sign.add(seam);
 const paperSize=.44,h=paperSize/2,r=paperSize*.06,paperShape=new T.Shape();paperShape.moveTo(-h,h);
 for(const c of [-h/2,0,h/2]){paperShape.lineTo(c-r,h);paperShape.absarc(c,h,r,Math.PI,Math.PI*2,false);}paperShape.lineTo(h,h);
 for(const c of [h/2,0,-h/2]){paperShape.lineTo(h,c+r);paperShape.absarc(h,c,r,Math.PI/2,Math.PI*1.5,false);}paperShape.lineTo(h,-h);
 for(const c of [h/2,0,-h/2]){paperShape.lineTo(c+r,-h);paperShape.absarc(c,-h,r,0,Math.PI,false);}paperShape.lineTo(-h,-h);
 for(const c of [-h/2,0,h/2]){paperShape.lineTo(-h,c-r);paperShape.absarc(-h,c,r,Math.PI*1.5,Math.PI*2.5,false);}paperShape.closePath();
 const uvGenerator={generateTopUV(g,v,a,b,c){return[a,b,c].map(i=>new T.Vector2(v[i*3]/paperSize+.5,v[i*3+1]/paperSize+.5));},generateSideWallUV(g,v,a,b,c,d){return[new T.Vector2(0,0),new T.Vector2(1,0),new T.Vector2(1,1),new T.Vector2(0,1)];}};
 const paperGeometry=geometry(new T.ExtrudeGeometry(paperShape,{depth:.028,bevelEnabled:true,bevelSize:.0015,bevelThickness:.002,bevelSegments:2,curveSegments:10,steps:1,UVGenerator:uvGenerator}));
 const paperSides=material(new T.MeshStandardMaterial({color:0x242443,roughness:.62}));
 const tonguePaper=new T.Mesh(paperGeometry,[sculptedPaperMaterial,paperSides]);tonguePaper.position.set(0,(940-1168)*signScale,.18+.18+.055+tongueCurve((940-1168)*signScale)+.012);tonguePaper.rotation.x=-.085;tonguePaper.name='Dimensional original THP — twelve genuine edge notches';sign.add(tonguePaper);station(tonguePaper,'gallery-entry','entrance',-1);
 return sign;
}
