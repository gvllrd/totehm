import * as T from './vendor/three-0.180.0.mjs';
import {createWhiteStone} from './gallery-white-stone.mjs';
import {createLisbonPavement} from './gallery-lisbon-pavement.mjs';
import {TOTEHMPAPER} from './gallery-artworks.mjs';
import {GALLERY_LAYOUT,GALLERY_OBSTACLES,GALLERY_STATIONS} from './gallery-modern-layout.mjs';

// The glass pavilion is one spatial visit. Original pages and the market keep
// their own identity, media, prices and access checks.
export function createModernGallery(scene,renderer,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='TOTEHM — the glass pavilion above the sea';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),solids=[],interactables=[];
 let disposed=false,dirty=true,time=0,paperLoaded=false;
 const changed=()=>{if(!disposed){dirty=true;if(renderer?.shadowMap)renderer.shadowMap.needsUpdate=true;onChange();}};
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 const anisotropy=Math.min(8,renderer?.capabilities?.getMaxAnisotropy?.()||1);
 const stone=createWhiteStone({mobile,anisotropy,onChange:changed});
 const pavement=createLisbonPavement({mobile,anisotropy,onChange:changed});
 const ink=material(new T.MeshStandardMaterial({color:0x080809,roughness:.58,metalness:.12}));
 const metal=material(new T.MeshStandardMaterial({color:0x202122,roughness:.28,metalness:.82}));
 const bronze=material(new T.MeshStandardMaterial({color:0x5d5547,roughness:.32,metalness:.86}));
 const glass=material(new T.MeshPhysicalMaterial({color:0xd5e2e6,roughness:.055,metalness:.015,transparent:true,opacity:.055,depthWrite:false,side:T.FrontSide,envMapIntensity:1.2,clearcoat:1,clearcoatRoughness:.06}));
 const roofGlass=glass.clone();roofGlass.name='Unbroken celestial glass roof';roofGlass.opacity=.045;materials.add(roofGlass);
 const lit=material(new T.MeshBasicMaterial({color:0xffe3bb,toneMapped:false}));
 const warm=material(new T.MeshBasicMaterial({color:0xffcc84,toneMapped:false}));
 const black=material(new T.MeshBasicMaterial({color:0x000000,toneMapped:false}));
 const boxGeo=geometry(new T.BoxGeometry(1,1,1)),planeGeo=geometry(new T.PlaneGeometry(1,1));
 function mesh(g,m,p,s={x:1,y:1,z:1},{solid=false,name=''}={}){
  const object=new T.Mesh(g,m);object.position.set(...p);object.scale.set(s.x,s.y,s.z);object.castShadow=!m.transparent;object.receiveShadow=true;object.name=name;root.add(object);if(solid)solids.push(object);return object;
 }
 const block=(m,p,size,options)=>mesh(boxGeo,m,p,{x:size[0],y:size[1],z:size[2]},options);
 function station(object,id,kind,room){object.userData={...object.userData,station:kind,stationId:id,action:'station',room};interactables.push({id,kind,room,object});return object;}
 function light(x,y,z,power,distance=12,colour=0xffd6a1){const lamp=new T.PointLight(colour,power,distance,2);lamp.position.set(x,y,z);root.add(lamp);return lamp;}

 // White limestone stops exactly at the pavilion's glazing/entrance.
 // Five adjacent rectangles share the same height, without overlapping faces.
 // The original world-space calçada keeps its waves and caravel outside.
 block(ink,[0,-.65,0],[35.6,1.1,39.6]);block(metal,[0,-.2,0],[32.6,.18,36.6]);
 const floor=(m,x,z,w,d,name)=>{const plane=mesh(geometry(new T.PlaneGeometry(w,d)),m,[x,-.09,z],undefined,{solid:true,name});plane.rotation.x=-Math.PI/2;plane.castShadow=false;return plane;};
 floor(stone.material,0,-9.5,26,15,'Interior only — antique white limestone');
 floor(pavement.material,0,8,32,20,'Exterior calçada — waves and caravel');
 floor(pavement.material,0,-17.5,32,1,'Exterior calçada — behind the pavilion');
 for(const x of [-14.5,14.5])floor(pavement.material,x,-9.5,3,15,'Exterior calçada — side terrace');
 for(const x of [-15.8,15.8])block(metal,[x,-.035,0],[.3,.1,35.6]);
 for(const z of [-17.8,17.8])block(metal,[0,-.035,z],[31.9,.1,.3]);

 // All elevations and the roof are glass, supported only by fine metal fins.
 // The full star field remains visible from every installation.
 block(glass,[0,3.055,-17],[26,6.29,.12],{solid:true,name:'Panoramic rear glazing'});
 block(glass,[0,4.65,-2],[26,3.1,.10],{solid:true,name:'Transparent entrance transom'});
 for(const x of [-7.7,7.7])block(glass,[x,1.505,-2],[10.6,3.19,.08],{solid:true,name:'Frameless front glazing'});
 for(const x of [-13,13]){
  block(glass,[x,3.055,-9.5],[.08,6.29,15],{solid:true,name:'Ocean-side glass wall'});
  for(const z of [-16.94,-9.5,-2.05])block(metal,[x,3.055,z],[.055,6.29,.065]);
  block(bronze,[x,.025,-9.5],[.075,.05,15]);
 }
 for(const x of [-2.43,2.43])block(metal,[x,3.02,-1.96],[.055,6.22,.12]);
 block(bronze,[0,-.098,-1.98],[4.8,.018,.55]);
 block(roofGlass,[0,6.115,-9.425],[26.7,.13,15.75],{solid:true,name:'Full celestial glass roof'});
 for(const x of [-13.3,13.3])block(metal,[x,6.18,-9.425],[.09,.16,15.8]);
 for(const z of [-17.27,-1.56])block(metal,[0,6.18,z],[26.7,.16,.09]);
 for(const x of [-6.6,0,6.6])block(bronze,[x,6.105,-9.425],[.028,.075,15.6]);
 for(const z of [-12.8,-7.3])block(bronze,[0,6.105,z],[26.45,.075,.028]);
 // Recessed warm lines describe the structure without covering the sky.
 for(const x of [-12.85,12.85])block(lit,[x,6.045,-9.45],[.014,.012,14.8]);
 block(lit,[0,6.045,-16.9],[25.6,.012,.014]);
 light(0,4.15,-11.3,48,11,0xffd6a1);light(-7.6,3.5,-8,19,8,0xffc88b);light(8,4.2,-13,12,9,0xffddb1);
 for(const [x,z,width] of [[0,-12,5.8],[-7.6,-8,1.1]]){
  block(metal,[x,4.9,z],[width,.045,.13]);block(warm,[x,4.87,z],[width-.06,.010,.09]);
  for(const dx of [-width*.35,width*.35])block(metal,[x+dx,5.46,z],[.009,1.1,.009]);
 }

 // The stock display uses small blotter-sized pieces, rather than giant
 // squares. A six-by-eight sheet remains a physical perforated sheet.
 block(stone.material,[0,.41,-12.05],[7,1,2],{solid:true,name:'Monolithic antique limestone sales counter'});
 const counterTop=block(stone.material,[0,.97,-12.05],[7,.12,2]);station(counterTop,'thp-counter','thp',0);
 block(bronze,[0,.99,-11.025],[7,.017,.014]);block(warm,[0,.01,-11.025],[6.75,.009,.012]);
 const fallbackPaper=new T.DataTexture(new Uint8Array([51,51,102,255]),1,1,T.RGBAFormat);fallbackPaper.colorSpace=T.SRGBColorSpace;fallbackPaper.needsUpdate=true;textures.add(fallbackPaper);
 const paperMaterial=material(new T.MeshStandardMaterial({map:fallbackPaper,color:0xffffff,roughness:.84,side:T.DoubleSide,alphaTest:.12}));
 const sculptedPaperMaterial=material(new T.MeshStandardMaterial({map:fallbackPaper,color:0xffffff,roughness:.58,metalness:0,alphaTest:.12,emissive:0x111120,emissiveIntensity:.16}));
 if(globalThis.document?.createElementNS){
  const paper=new T.TextureLoader().load(TOTEHMPAPER.src,loaded=>{if(disposed){loaded.dispose();return;}for(const m of [paperMaterial,sculptedPaperMaterial]){m.map=loaded;m.needsUpdate=true;}paperLoaded=true;changed();},undefined,changed);
  paper.colorSpace=T.SRGBColorSpace;paper.anisotropy=anisotropy;textures.add(paper);
 }
 // The authentic premium shadowbox is a separate wall-mounted entry portal.
 const paperItems=[],q=new T.Quaternion(),matrix=new T.Matrix4(),s=new T.Vector3(),p=new T.Vector3();
 const tabSize=.022,tabPitch=.0233,sheetWidth=tabPitch*8,sheetDepth=tabPitch*6;
 for(const x of [-2.2,0,2.2]){
  const tray=block(metal,[x,1.039,-11.8],[.40,.018,.32]);station(tray,'thp-sheet-tray','thp',0);
  const stand=block(metal,[x,1.15,-12.28],[.25,.19,.015]);station(stand,'thp-sheet-stand','thp',0);
  for(let row=0;row<6;row++)for(let column=0;column<8;column++){
   paperItems.push({x:x+(column-3.5)*tabPitch,y:1.055,z:-11.8+(row-2.5)*tabPitch,size:tabSize,rotation:-Math.PI/2});
   paperItems.push({x:x+(column-3.5)*tabPitch,y:1.15+(row-2.5)*tabPitch,z:-12.269,size:tabSize,rotation:0});
  }
 }
 for(let i=0;i<5;i++)paperItems.push({x:-.065+i*.032,y:1.036,z:-11.19,size:.017,rotation:-Math.PI/2});
 const papers=new T.InstancedMesh(planeGeo,paperMaterial,paperItems.length);papers.name='Authentic THP blotters — small perforated editions';papers.receiveShadow=true;papers.castShadow=false;
 paperItems.forEach((paper,i)=>{p.set(paper.x,paper.y,paper.z);q.setFromEuler(new T.Euler(paper.rotation,0,0));s.set(paper.size,paper.size,1);matrix.compose(p,q,s);papers.setMatrixAt(i,matrix);});papers.instanceMatrix.needsUpdate=true;papers.computeBoundingSphere();root.add(papers);station(papers,'thp-papers','thp',0);

 // A black contemporary lectern evokes a church reading stand. Its inclined
 // top is shared with the separately managed CLOSED Origins cover.
 const lecternBase=block(ink,[-7.6,-.04,-8],[1.1,.10,.96],{solid:true,name:'Origins lectern — black plinth'});station(lecternBase,'origins-lectern-base','origins',1);
 const stem=block(metal,[-7.6,.58,-8.04],[.13,1.17,.15],{solid:true,name:'Origins lectern — slender black stem'});stem.rotation.x=-.065;
 const lecternTop=block(ink,[-7.6,1.31,-8],[1.08,.045,1.05],{solid:true,name:'Origins lectern — inclined black reading desk'});lecternTop.rotation.x=Math.PI/10;station(lecternTop,'origins-lectern','origins',1);
 const lip=block(metal,[-7.6,1.147,-7.51],[1.08,.025,.022]);station(lip,'origins-lectern-lip','origins',1);
 // The only object in the Lisbon area is its screen; no couch, coffee table
 // or hidden controller furniture remains in the pavilion.
 block(metal,[8,3.1,-16.50],[7.16,4.06,.16]);block(black,[8,3.1,-16.405],[7,3.9,.018]);
 block(lit,[8,1.11,-16.39],[6.95,.009,.012]);

 // Original mouth silhouette, now with true bevelled depth. The tongue
 // curves outward and carries an actual twelve-notched THP sculpture.
 const sign=new T.Group();sign.name='The original mouth — sculpted tongue and dimensional THP';sign.position.set(0,4.6,-1.76);root.add(sign);
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
 // ExtrudeGeometry is non-indexed: merely recalculating its normals gives
 // every large lid triangle its own flat highlight. Split the long edges,
 // weld matching positions, then bend and smooth the complete solid.
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
 const coarseTongue=tongueMesh.geometry;tongueMesh.geometry=geometry(smoothTongue(coarseTongue,mobile?.14:.095));geometries.delete(coarseTongue);coarseTongue.dispose();
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
 // Separate warm key and cool rim light reveal the depth, bevels and material.
 for(const spec of [{p:[-2.7,3,1.8],power:65,colour:0xffd59d},{p:[2.8,5.9,.5],power:36,colour:0xe1e8f1}]){
  const spot=new T.SpotLight(spec.colour,spec.power,11,.52,.8,2);spot.position.set(...spec.p);spot.target.position.set(0,4.15,-1.4);root.add(spot,spot.target);
 }
 for(const x of [-.68,.68])block(metal,[x,4.65,-1.86],[.035,.035,.25]);
 const portals=GALLERY_STATIONS.map(station=>{const position=station.position||station.book||station.table||station.screen;return{room:station.room,x:position[0],z:position[2],href:station.href,approach:{x:station.approach[0],z:station.approach[2]},pickables:interactables.filter(item=>item.room===station.room).map(item=>item.object)};});
 changed();
 return{
  root,solids,interactables,pickables:interactables.map(item=>item.object),obstacles:GALLERY_OBSTACLES,portals,
  anchors:{playScreen:GALLERY_LAYOUT.play.screen,originsBook:GALLERY_LAYOUT.origins.book,counter:GALLERY_LAYOUT.counter.position},setDay(){},
  update(dt,eye,motion=true){if(disposed)return false;if(motion)time+=Math.max(0,Math.min(Number(dt)||0,.1));const result=dirty;dirty=false;return result;},
  diagnostics:()=>({kind:'celestial-glass-gallery',ready:stone.diagnostics().ready&&pavement.diagnostics().ready,modernGallery:true,building:true,glassStructure:true,glassRoof:true,columns:0,arches:0,doors:1,roof:true,skyLight:true,overheadLabels:0,vegetation:false,time:+time.toFixed(3),rooms:3,independentFiles:true,pavement:pavement.diagnostics(),stone:stone.diagnostics(),flooring:{interiorOnlyWhiteStone:true,exteriorOriginalCalcada:true,interiorBounds:{minX:-13,maxX:13,minZ:-17,maxZ:-2},rectangles:5,sharedHeight:-.09,exteriorDarkPlinth:true},facade:{mouth:true,originalDrawing:true,paperLoaded,threeDimensional:true,tongueVolume:true,tongueSmooth:true,tongueIndexed:true,tongueProjectionMetres:.565,paperVolume:true,paperThicknessMetres:.028,edgeNotches:12,elegantlyLit:true},thpCounter:{papers:paperItems.length,sheets:6,looseTabs:5,perforated:true,tabSizeMetres:tabSize,sheetSizeMetres:[sheetWidth,sheetDepth],stone:true,originalAsset:TOTEHMPAPER.src,loaded:paperLoaded},lounge:{sofa:false,coffeeTable:false,screenFrame:true,screenCenter:GALLERY_LAYOUT.play.screen},origins:{table:false,lectern:true,black:true,closedBook:true,bookAnchor:GALLERY_LAYOUT.origins.book,inclinationDegrees:18},portals:portals.map(({room,x,z,href})=>({room,x,z,href})),disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();stone.dispose();pavement.dispose();for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.clear();}
 };
}
