import * as T from './vendor/three-0.180.0.mjs';
import {createWhiteStone} from './gallery-white-stone.mjs';
import {createAncientFloor} from './gallery-ancient-floor.mjs';
import {createLisbonPavement} from './gallery-lisbon-pavement.mjs';
import {TOTEHMPAPER} from './gallery-artworks.mjs';
import {GALLERY_LAYOUT,GALLERY_OBSTACLES,GALLERY_STATIONS} from './gallery-modern-layout.mjs';
import {GLASS_SHELL,GLASS_HEARTH,glassRoofHeight} from './gallery-glass-shell.mjs';
import {createGalleryFacade} from './gallery-facade.mjs';

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
 const roofGlass=glass.clone();roofGlass.name='Wave-folded celestial glass shell';roofGlass.opacity=.075;roofGlass.side=T.DoubleSide;roofGlass.roughness=.035;materials.add(roofGlass);
 const collectorGlass=roofGlass.clone();collectorGlass.name='Clear glass smoke fold continuous with the roof';collectorGlass.opacity=.03;materials.add(collectorGlass);
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
 // The old flat floor hid these supports. Recess them ONLY beneath the new
 // interior stone: otherwise their top faces cut through the worn arrises
 // and hide the mortar. Each support remains one merged draw; its exterior
 // height, outline and material are exactly the original ones.
 const interiorSupportTop=-.15;
 function foundation(m,halfX,halfZ,bottom,top){
  const positions=[],normals=[],uvs=[];
  const pieces=[[-halfX,halfX,-2,halfZ,top],[-halfX,halfX,-halfZ,-17,top],[-halfX,-13,-17,-2,top],[13,halfX,-17,-2,top],[-13,13,-17,-2,interiorSupportTop]];
  for(const [x0,x1,z0,z1,y1] of pieces){
   const g=new T.BoxGeometry(x1-x0,y1-bottom,z1-z0).toNonIndexed(),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
   for(let i=0;i<p.count;i++){positions.push(p.getX(i)+(x0+x1)/2,p.getY(i)+(bottom+y1)/2,p.getZ(i)+(z0+z1)/2);normals.push(n.getX(i),n.getY(i),n.getZ(i));uvs.push(uv.getX(i),uv.getY(i));}
   g.dispose();
  }
  const g=geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeBoundingBox();g.computeBoundingSphere();
  return mesh(g,m,[0,0,0],undefined,{name:'Original exterior support with recessed interior'});
 }
 foundation(ink,17.8,19.8,-1.2,-.1);foundation(metal,16.3,18.3,-.29,-.11);
 const floor=(m,x,z,w,d,name)=>{const plane=mesh(geometry(new T.PlaneGeometry(w,d)),m,[x,-.09,z],undefined,{solid:true,name});plane.rotation.x=-Math.PI/2;plane.castShadow=false;return plane;};
 const ancientFloor=createAncientFloor(root,{mobile,anisotropy,onChange:changed});solids.push(...ancientFloor.solids);
 floor(pavement.material,0,8,32,20,'Exterior calçada — waves and caravel');
 floor(pavement.material,0,-17.5,32,1,'Exterior calçada — behind the pavilion');
 for(const x of [-14.5,14.5])floor(pavement.material,x,-9.5,3,15,'Exterior calçada — side terrace');
 for(const x of [-15.8,15.8])block(metal,[x,-.035,0],[.3,.1,35.6]);
 for(const z of [-17.8,17.8])block(metal,[0,-.035,z],[31.9,.1,.3]);

 // One continuous wave crosses the pavilion instead of a rectangular lid.
 // Its glazing, ribs and smoke aperture share the same world-space section
 // as collision. There is no flat roof hidden underneath the visible shell.
 const o=GLASS_HEARTH.smokeOutlet,roofLimit=mobile?2.6:2.2,roofError=mobile?.006:.004;
 function roofNormal(x,z,offset=1){const d=.005,n=new T.Vector3((glassRoofHeight(x-d,z)-glassRoofHeight(x+d,z))/(2*d),1,(glassRoofHeight(x,z-d)-glassRoofHeight(x,z+d))/(2*d));return n.normalize().multiplyScalar(offset);}
 function roofSurface(){
  const {minX,maxX,minZ,maxZ,thickness}=GLASS_SHELL;
  const outline=[new T.Vector2(minX,minZ),new T.Vector2(maxX,minZ),new T.Vector2(maxX,maxZ),new T.Vector2(minX,maxZ)];
  const hole=Array.from({length:mobile?64:96},(_,i)=>{const a=i/(mobile?64:96)*Math.PI*2;return new T.Vector2(o.x+Math.cos(a)*o.radius,o.z+Math.sin(a)*o.radiusZ);});
  const points=[...outline,...hole],faces=T.ShapeUtils.triangulateShape(outline,[hole]),positions=[],normals=[],uvs=[];
  const push=(p,top)=>{const n=roofNormal(p.x,p.y,top?1:-1);positions.push(p.x,glassRoofHeight(p.x,p.y)+(top?thickness:0),p.y);normals.push(n.x,n.y,n.z);uvs.push((p.x-minX)/(maxX-minX),(p.y-minZ)/(maxZ-minZ));};
  function split(a,b,c,depth=0){
   const ab=a.distanceToSquared(b),bc=b.distanceToSquared(c),ca=c.distanceToSquared(a),longest=Math.max(ab,bc,ca);
   const height=p=>glassRoofHeight(p.x,p.y),ha=height(a),hb=height(b),hc=height(c);
   const midpointError=(p,q,hp,hq)=>Math.abs(height(p.clone().add(q).multiplyScalar(.5))-(hp+hq)/2);
   const centre=a.clone().add(b).add(c).multiplyScalar(1/3),error=Math.max(midpointError(a,b,ha,hb),midpointError(b,c,hb,hc),midpointError(c,a,hc,ha),Math.abs(height(centre)-(ha+hb+hc)/3));
   if(longest<=roofLimit*roofLimit&&error<=roofError||depth>18){for(const p of [a,c,b])push(p,true);for(const p of [a,b,c])push(p,false);return;}
   if(longest===ab){const m=a.clone().add(b).multiplyScalar(.5);split(a,m,c,depth+1);split(m,b,c,depth+1);}
   else if(longest===bc){const m=b.clone().add(c).multiplyScalar(.5);split(a,b,m,depth+1);split(a,m,c,depth+1);}
   else{const m=c.clone().add(a).multiplyScalar(.5);split(a,b,m,depth+1);split(m,b,c,depth+1);}
  }
  for(const f of faces)split(...f.map(i=>points[i]));
  const g=geometry(new T.BufferGeometry());g.name='Continuous curved glass roof with actual open smoke oculus';g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeBoundingBox();g.computeBoundingSphere();return g;
 }
 const waveRoof=mesh(roofSurface(),roofGlass,[0,0,0],undefined,{solid:true,name:'Wave glass roof — open smoke oculus, no flat lid'});waveRoof.castShadow=false;
 function curvedGlazing(axis,fixed,start,end,bottom,name){
  const count=mobile?48:72,positions=[],indices=[];
  for(let i=0;i<=count;i++){const a=start+(end-start)*i/count,x=axis==='x'?a:fixed,z=axis==='x'?fixed:a;positions.push(x,bottom,z,x,glassRoofHeight(x,z),z);if(i<count){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const g=geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
  const pane=mesh(g,roofGlass,[0,0,0],undefined,{solid:true,name});pane.castShadow=false;return pane;
 }
 curvedGlazing('x',-17,-13,13,-.09,'Rear glazing following the lifted wave');
 curvedGlazing('x',-2,-13,13,3.1,'Wave entrance transom');
 for(const x of [-7.7,7.7])block(glass,[x,1.505,-2],[10.6,3.19,.08],{solid:true,name:'Frameless front glazing'});
 for(const x of [-13,13]){
  curvedGlazing('z',x,-17,-2,-.09,'Ocean-side glass cut to the flowing roof');
  for(const z of [-16.94,-2.05]){const height=glassRoofHeight(x,z)+.09;block(metal,[x,(height-.09)/2,z],[.036,height,.045]);}
  block(bronze,[x,.025,-9.5],[.055,.05,15]);
 }
 for(const x of [-2.43,2.43])block(metal,[x,1.50,-1.96],[.035,3.18,.055]);
 block(bronze,[0,-.098,-1.98],[4.8,.018,.55]);
 function swept(points,radius,m,name){const curve=new T.CatmullRomCurve3(points),g=geometry(new T.TubeGeometry(curve,mobile?72:112,radius,5,false));return mesh(g,m,[0,0,0],undefined,{name});}
 const section=(axis,fixed,start,end,offset=0)=>Array.from({length:49},(_,i)=>{const a=start+(end-start)*i/48,x=axis==='x'?a:fixed,z=axis==='x'?fixed:a;return new T.Vector3(x,glassRoofHeight(x,z)+offset,z);});
 // Sparse structural sweeps, never a Cartesian grid across the stars.
 for(const z of [-17.2,-9.4,-1.65])swept(section('x',z,-13.30,13.30,.045),.035,metal,'Slender wave-following roof rib');
 for(const x of [-13.30,13.30])swept(section('z',x,-17.2,-1.65,.045),.039,metal,'Swept glass eave');
 swept(section('x',-1.66,-13.26,13.26,-.035),.0065,lit,'Warm hairline on the undulating entrance');
 // The building itself gathers the rising plume. A transparent folded skirt
 // narrows into an open roof oculus; no steel hood, pipe or decorative cap.
 const rings=mobile?18:28,sides=mobile?48:72,collectorPositions=[],collectorIndices=[];
 for(let j=0;j<=rings;j++){
  const t=j/rings,ease=(1-t)*(1-t),rx=o.radius+(GLASS_HEARTH.collectorRadius[0]-o.radius)*ease,rz=o.radiusZ+(GLASS_HEARTH.collectorRadius[1]-o.radiusZ)*ease;
  for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2,x=o.x+rx*Math.cos(a),z=o.z+rz*Math.sin(a),roof=glassRoofHeight(o.x+o.radius*Math.cos(a),o.z+o.radiusZ*Math.sin(a))+GLASS_SHELL.thickness;
   // The rear lip grows out of the glazing; its low front edge reaches
   // toward the fire. This asymmetry reads as a fold of the building, not
   // a separate conical range hood suspended above the logs.
   const lip=GLASS_HEARTH.collectorBaseY+2.05*Math.pow((1-Math.sin(a))*.5,1.2);
   collectorPositions.push(x,lip+(roof-lip)*t,z);
   if(j<rings&&i<sides){const k=j*(sides+1)+i;collectorIndices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
  }
 }
 const cg=geometry(new T.BufferGeometry());cg.setAttribute('position',new T.Float32BufferAttribute(collectorPositions,3));cg.setIndex(collectorIndices);cg.computeVertexNormals();cg.computeBoundingBox();cg.computeBoundingSphere();
 const collector=mesh(cg,collectorGlass,[0,0,0],undefined,{name:'Folded glass smoke collector continuous with the wave roof'});collector.castShadow=false;
 const outletRing=Array.from({length:73},(_,i)=>{const a=i/72*Math.PI*2,x=o.x+o.radius*Math.cos(a),z=o.z+o.radiusZ*Math.sin(a);return new T.Vector3(x,glassRoofHeight(x,z)+GLASS_SHELL.thickness+.014,z);});
 swept(outletRing,.014,metal,'Minimal open smoke oculus rim');
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

 createGalleryFacade(root,{mobile,geometry,material,station,black,sculptedPaperMaterial});
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
  diagnostics:()=>({kind:'wave-glass-campfire-gallery',ready:stone.diagnostics().ready&&pavement.diagnostics().ready,modernGallery:true,building:true,glassStructure:true,glassRoof:true,waveGlass:true,flatRoof:false,roofShell:{continuous:true,minimum:GLASS_SHELL.minHeight,maximum:GLASS_SHELL.maxHeight,thickness:GLASS_SHELL.thickness,triangles:waveRoof.geometry.attributes.position.count/3,ribs:5,actualAperture:true,smokeOutlet:{...o},collector:{glass:true,rearGlazingFold:true,asymmetricLip:true,baseHeight:GLASS_HEARTH.collectorBaseY,topHeight:o.y,metalHood:false,metalFlue:false,integrated:true}},columns:0,arches:0,doors:1,roof:true,skyLight:true,overheadLabels:0,vegetation:false,time:+time.toFixed(3),rooms:4,independentFiles:true,pavement:pavement.diagnostics(),stone:stone.diagnostics(),flooring:{ancientStone:ancientFloor.diagnostics(),trueStoneGeometry:true,opaqueSupportTop:interiorSupportTop,exteriorSupportPreserved:true,interiorOnlyWhiteStone:true,exteriorOriginalCalcada:true,interiorBounds:{minX:-13,maxX:13,minZ:-17,maxZ:-2},rectangles:5,sharedHeight:-.09,exteriorDarkPlinth:true},facade:{mouth:true,originalDrawing:true,paperLoaded,threeDimensional:true,tongueVolume:true,tongueSmooth:true,tongueIndexed:true,tongueProjectionMetres:.565,paperVolume:true,paperThicknessMetres:.028,edgeNotches:12,elegantlyLit:true},thpCounter:{papers:paperItems.length,sheets:6,looseTabs:5,perforated:true,tabSizeMetres:tabSize,sheetSizeMetres:[sheetWidth,sheetDepth],stone:true,originalAsset:TOTEHMPAPER.src,loaded:paperLoaded},lounge:{sofa:false,coffeeTable:false,screenFrame:true,screenCenter:GALLERY_LAYOUT.play.screen},origins:{table:false,lectern:true,black:true,closedBook:true,bookAnchor:GALLERY_LAYOUT.origins.book,inclinationDegrees:18},portals:portals.map(({room,x,z,href})=>({room,x,z,href})),disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();stone.dispose();ancientFloor.dispose();pavement.dispose();for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.clear();}
 };
}
