import * as T from './vendor/three-0.180.0.mjs';
import {createWhiteStone} from './gallery-white-stone.mjs';
import {createAncientStoneSurfaces} from './gallery-ancient-floor.mjs';
import {createGalleryFacade} from './gallery-facade.mjs';
import {createHeritageIntervention} from './gallery-heritage-intervention.mjs';
import {createNewYorkBrick,createNewYorkPavement} from './gallery-new-york-materials.mjs';
import {TOTEHMPAPER} from './gallery-artworks.mjs';
import {NEW_YORK_LAYOUT as L,NEW_YORK_FLOORS,NEW_YORK_RAMPS,NEW_YORK_RAMP_TURNS,NEW_YORK_FLOOR_RECTS,NEW_YORK_CONNECTORS,newYorkConnectorHeight,NEW_YORK_STATIONS,NEW_YORK_EXHIBITION_WALLS} from './gallery-new-york-layout.mjs';

// Five real storeys surround one open atrium. Inclined stone aisles and floor
// openings come from the same section as collision: none are decorative stairs.
export function createNewYorkGallery(scene,renderer,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='TOTEHM — New York red-brick gallery';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),solids=[],walkable=[],interactables=[],batches=new Map(),stoneSurfaces=[],facadeWindows=[],exhibitionWalls=[];
 let disposed=false,dirty=true,paperLoaded=false,time=0;
 const changed=()=>{if(!disposed){dirty=true;if(renderer?.shadowMap)renderer.shadowMap.needsUpdate=true;onChange();}};
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m),anisotropy=Math.min(8,renderer?.capabilities?.getMaxAnisotropy?.()||1);
 const stone=createWhiteStone({mobile,anisotropy,onChange:changed});
 const brick=material(createNewYorkBrick()),pavement=material(createNewYorkPavement());
 const white=material(new T.MeshStandardMaterial({color:0xf1eee7,roughness:.92,metalness:0}));
 const iron=material(new T.MeshStandardMaterial({color:0x151719,roughness:.4,metalness:.75}));
 const ink=material(new T.MeshStandardMaterial({color:0x090a0b,roughness:.62}));
 const trim=material(new T.MeshStandardMaterial({color:0x635a4e,roughness:.75}));
 const black=material(new T.MeshBasicMaterial({color:0x000000,toneMapped:false}));
 const lightMaterial=material(new T.MeshBasicMaterial({color:0xffedcf,toneMapped:false}));
 const glass=material(new T.MeshPhysicalMaterial({color:0xd5e6ef,transparent:true,opacity:.045,roughness:.055,metalness:.015,side:T.DoubleSide,depthWrite:false,envMapIntensity:1.2}));
 const smokeGlass=material(new T.MeshPhysicalMaterial({color:0xdce6ea,transparent:true,opacity:.045,roughness:.035,side:T.DoubleSide,depthWrite:false}));
 const boxGeo=geometry(new T.BoxGeometry(1,1,1)),planeGeo=geometry(new T.PlaneGeometry(1,1));
 const heritage=createHeritageIntervention(root,{place:'new-york',mobile,anisotropy,geometry,material,onChange:changed});solids.push(...heritage.solids);
 function mesh(g,m,p=[0,0,0],{name='',solid=false,walk=false}={}){
  const item=new T.Mesh(g,m);item.position.set(...p);item.name=name;item.castShadow=!m.transparent;item.receiveShadow=true;root.add(item);if(solid)solids.push(item);if(walk){walkable.push(item);item.userData.walkable=true;}return item;
 }
 function block(m,p,size,{name='',solid=false,walk=false,batch=true}={}){
  if(!batch||walk){const item=mesh(boxGeo,m,p,{name,solid,walk});item.scale.set(...size);return item;}
  let data=batches.get(m);if(!data){data={positions:[],normals:[],uvs:[],solid:false,names:[]};batches.set(m,data);}
  const g=new T.BoxGeometry(...size).toNonIndexed(),a=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  for(let i=0;i<a.count;i++){data.positions.push(a.getX(i)+p[0],a.getY(i)+p[1],a.getZ(i)+p[2]);data.normals.push(n.getX(i),n.getY(i),n.getZ(i));data.uvs.push(uv.getX(i),uv.getY(i));}
  g.dispose();data.solid||=solid;if(name)data.names.push(name);return null;
 }
 function station(object,id,kind,room){object.userData={...object.userData,station:kind,stationId:id,action:'station',room};interactables.push({id,kind,room,object});return object;}
 const light=(p,power,distance=18,color=0xffead0)=>{const lamp=new T.PointLight(color,power,distance,2);lamp.position.set(...p);root.add(lamp);return lamp;};
 function flush(){for(const [m,d] of batches){const g=geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(d.positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(d.normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(d.uvs,2));g.computeBoundingBox();g.computeBoundingSphere();mesh(g,m,[0,0,0],{name:d.names.length?d.names.join(' · '):m.name,solid:d.solid});}batches.clear();}

 // Manhattan sidewalk: broad bluestone flags meet a dark asphalt lane, a
 // granite curb, iron cellar grates and flush round utility covers.
 block(ink,[0,-.65,0],[35.6,1.1,39.6],{name:'Shared island plinth'});
 for(const [x,z,w,d] of [[0,7,32,18],[0,-17.5,32,1],[-14.5,-9.5,3,15],[14.5,-9.5,3,15]]){
  const ground=mesh(geometry(new T.PlaneGeometry(w,d)),pavement,[x,L.groundY,z],{name:'New York bluestone and asphalt ground',solid:true,walk:true});ground.rotation.x=-Math.PI/2;
 }
 block(trim,[0,-.04,4.03],[31.6,.12,.17],{name:'Granite curb at the asphalt edge'});
 for(const x of [-11,-7,7,11])for(let i=0;i<9;i++)block(iron,[x+(i-4)*.095,-.078,1.75],[.045,.018,.86],{name:'Cast-iron cellar grate'});
 for(const x of [-8,8]){
  const cover=mesh(geometry(new T.CylinderGeometry(.44,.44,.022,32)),iron,[x,-.081,9.5],{name:'Flush Manhattan utility cover'});cover.receiveShadow=true;
  for(const z of [-.21,-.07,.07,.21])block(trim,[x,-.066,9.5+z],[.6,.008,.014]);
 }
 // Restrained white crosswalk bars belong to the actual island pavement.
 for(let x=-5.8;x<=5.8;x+=1.65)block(white,[x,-.077,7.8],[.66,.01,3.0]);

 const floorRect=(r,name=r.id)=>{
  const item=block(white,[(r.minX+r.maxX)/2,r.y-L.slabThickness/2-.03,(r.minZ+r.maxZ)/2],[r.maxX-r.minX,L.slabThickness,r.maxZ-r.minZ],{name:name+' — recessed structural underside',solid:true,walk:true});
  stoneSurfaces.push({...r,id:name});
  item.userData.floor=r.floor;return item;
 };
 for(const r of NEW_YORK_FLOOR_RECTS)floorRect(r);
 for(const r of NEW_YORK_RAMPS){
  const dx=r.to.x-r.from.x,dz=r.to.z-r.from.z,length=Math.hypot(dx,dz),nx=-dz/length*r.width/2,nz=dx/length*r.width/2,t=.14;
  const points=[[r.from.x+nx,r.from.y,r.from.z+nz],[r.to.x+nx,r.to.y,r.to.z+nz],[r.to.x-nx,r.to.y,r.to.z-nz],[r.from.x-nx,r.from.y,r.from.z-nz]];
  const positions=[],indices=[];for(const p of points)positions.push(p[0],p[1]-.03,p[2]);for(const p of points)positions.push(p[0],p[1]-t-.03,p[2]);
  indices.push(0,1,2,0,2,3,4,6,5,4,7,6);for(let i=0;i<4;i++){const j=(i+1)%4;indices.push(i,j,j+4,i,j+4,i+4);}
  const g=geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
  const ramp=mesh(g,white,[0,0,0],{name:r.id+' — recessed structural underside',solid:true,walk:true});ramp.userData.ramp=r.id;ramp.userData.floor=r.floor;
  stoneSurfaces.push({...r,kind:'ramp'});
  // Continuous glass guards and thin iron caps follow the slope, rather
  // than a staircase rhythm. Ends remain open onto their landing pads.
  for(const side of [-1,1]){
   const start=r.id.endsWith('-0')?Math.min(.3,2.05/length):0,end=r.id.endsWith('-3')?Math.max(.7,1-2.8/length):1;
   const a=new T.Vector3(r.from.x+dx*start+nx*side,r.from.y+(r.to.y-r.from.y)*start+1.04,r.from.z+dz*start+nz*side),b=new T.Vector3(r.from.x+dx*end+nx*side,r.from.y+(r.to.y-r.from.y)*end+1.04,r.from.z+dz*end+nz*side);
   const rail=mesh(geometry(new T.CylinderGeometry(.018,.018,a.distanceTo(b),5)),iron,a.clone().add(b).multiplyScalar(.5).toArray(),{name:'Continuous ramp handrail'});rail.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());
   const pane=new T.BufferGeometry(),p=[];for(const v of [a,b])p.push(v.x,v.y-1.0,v.z,v.x,v.y-.035,v.z);pane.setAttribute('position',new T.Float32BufferAttribute(p,3));pane.setIndex([0,1,2,1,3,2]);pane.computeVertexNormals();pane.computeBoundingSphere();geometry(pane);mesh(pane,glass,[0,0,0],{name:'Minimal clear ramp guard'});
  }
 }
 for(const p of NEW_YORK_RAMP_TURNS)floorRect({minX:p.x-p.size/2,maxX:p.x+p.size/2,minZ:p.z-p.size/2,maxZ:p.z+p.size/2,y:p.y,floor:p.floor},p.id);
 for(const c of NEW_YORK_CONNECTORS){
  const positions=[],indices=[],nx=16,nz=8;
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=c.minX+(c.maxX-c.minX)*i/nx,z=c.minZ+(c.maxZ-c.minZ)*j/nz;positions.push(x,newYorkConnectorHeight(c,x,z)-.03,z);}
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i;indices.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);}
  const g=geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();const patch=mesh(g,white,[0,0,0],{name:c.id+' — recessed structural underside',solid:true,walk:true});patch.userData.floor=c.floor;
  stoneSurfaces.push({...c,heightAt:(x,z)=>newYorkConnectorHeight(c,x,z)});
 }

 // Masonry belongs only to the street facade. The other three elevations
 // are clear glass, so the island, ocean and stars remain the building's view.
 const storeys=NEW_YORK_FLOORS.map((y,floor)=>({y,floor,minX:floor===4?-10:-13,maxX:floor===4?10:13,minZ:floor===4?-16:-17,maxZ:floor===4?-4:-2}));
 let windowCount=0;
 const crownProfiles=[
  [[-10,.56],[-9.8,.64],[-9.65,.21],[-9.1,.18],[-8.92,.45],[-8.5,.39],[-8.28,.84],[-7.65,.76],[-7.49,.32],[-7.06,.25],[-6.9,.51],[-6.39,.44],[-6.2,.10],[-5.75,0],[-5.62,.28],[-5.16,.35],[-4.99,.79],[-4.36,.72],[-4.1,.23],[-3.4,0]],
  [[3.4,0],[3.85,.19],[4.02,.67],[4.58,.76],[4.77,.35],[5.2,.29],[5.39,.62],[6.08,.73],[6.26,.18],[6.87,.09],[7.02,.42],[7.46,.51],[7.63,.16],[8.2,.24],[8.39,.89],[8.94,.80],[9.12,.43],[9.62,.36],[9.8,.69],[10,.75]]
 ];
 function facadeSegment(s,a,b,bottom,top,name){
  if(b-a<.001||top-bottom<.001)return;
  if(s.floor===0&&bottom<3.1&&a<2.4&&b>-2.4){
   facadeSegment(s,a,Math.min(b,-2.4),bottom,Math.min(top,3.1),name);
   facadeSegment(s,Math.max(a,2.4),b,bottom,Math.min(top,3.1),name);
   if(top>3.1)facadeSegment(s,a,b,3.1,top,name);return;
  }
  const p=[(a+b)/2,(bottom+top)/2,s.maxZ],size=[b-a,top-bottom,.38];
  block(brick,p,size,{solid:true,name});block(white,[p[0],p[1],s.maxZ-.216],[size[0],size[1],.045],{solid:true,name:'Plain white back of the street facade'});
 }
 function brokenCrown(s,bottom){
  const top=s.y+5.4;
  for(const [index,profile] of crownProfiles.entries()){
   const shape=new T.Shape();shape.moveTo(profile[0][0],bottom);shape.lineTo(profile.at(-1)[0],bottom);
   for(const [x,loss] of [...profile].reverse())shape.lineTo(x,top-loss);shape.closePath();
   const old=geometry(new T.ExtrudeGeometry(shape,{depth:.38,bevelEnabled:false,curveSegments:1}));
   mesh(old,brick,[0,0,s.maxZ-.19],{solid:true,name:'Broken surviving brick crown — '+index});
   const back=geometry(new T.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:false,curveSegments:1}));
   mesh(back,white,[0,0,s.maxZ-.2385],{solid:true,name:'White interior behind the fractured crown — '+index});
   // The old silhouette is incomplete; a continuous, very thin modern
   // glass plane seals the missing crown while the outer profile stays open.
   const min=profile[0][0],max=profile.at(-1)[0];
   block(glass,[(min+max)/2,(bottom+27)/2,s.maxZ-.12],[max-min,27-bottom,.035],{solid:true,name:'Unbroken modern glass behind the ruined crown'});
  }
  facadeSegment(s,-3.4,3.4,bottom,top,'Unbroken windowless central TOTEHM masonry spine');
 }
 function frontElevation(s){
  const centers=s.floor===4?[-8.1,-5.1,5.1,8.1]:[-11.3,-8.2,-5.1,5.1,8.2,11.3],lower=s.y+.8,upper=s.y+4.35,w=1.72;
  facadeSegment(s,s.minX,s.maxX,s.y,lower,'Street facade brick spandrels');
  if(s.floor===4)brokenCrown(s,upper);else facadeSegment(s,s.minX,s.maxX,upper,s.y+5.4,'Street facade brick lintel courses');
  let edge=s.minX;
  for(const c of centers){
   const a=c-w/2,b=c+w/2;facadeSegment(s,edge,a,lower,upper,'Windowless central TOTEHM spine and red-brick piers');edge=b;
   const p=[c,(lower+upper)/2,s.maxZ];block(glass,p,[w,upper-lower,.025],{name:'Street facade loft window'});
   for(const offset of [-w/2,w/2])block(iron,[c+offset,p[1],s.maxZ],[.045,upper-lower+.1,.055]);
   for(const offset of [-(upper-lower)/2,0,(upper-lower)/2])block(iron,[c,p[1]+offset,s.maxZ],[w,.042,.055]);
   block(iron,p,[.035,upper-lower,.055]);block(trim,[c,lower-.07,s.maxZ],[w+.25,.14,.55]);
   facadeWindows.push({floor:s.floor,minX:a,maxX:b,minY:lower,maxY:upper,z:s.maxZ});windowCount++;
  }
  facadeSegment(s,edge,s.maxX,lower,upper,'Street facade red-brick corner pier');
 }
 for(const s of storeys){
  frontElevation(s);
  block(glass,[0,s.y+2.7,s.minZ],[s.maxX-s.minX,5.4,.065],{name:'Continuous clear rear glass',solid:true});
  for(const x of [s.minX,s.maxX]){
   block(glass,[x,s.y+2.7,(s.minZ+s.maxZ)/2],[.065,5.4,s.maxZ-s.minZ],{name:'Continuous clear side glass',solid:true});
   block(iron,[x,s.y+2.7,s.minZ],[.035,5.4,.035],{name:'Fine glass corner joint'});
  }
  if(s.floor===4){
   block(trim,[0,s.y+5.26,s.maxZ],[6.8,.18,.66],{name:'Retained cornice over the central TOTEHM spine'});
   for(const [x,width,y] of [[-5.83,.54,26.56],[6.68,.40,26.60],[7.87,.42,26.47]])block(trim,[x,y,s.maxZ],[width,.12,.57],{name:'Isolated surviving fragment of the old stone cornice'});
   block(iron,[0,26.9775,s.maxZ-.12],[20.1,.045,.065],{name:'Ultra-modern uninterrupted glass roof edge'});
   for(const x of [-10.015,10.015])block(iron,[x,26.44,s.maxZ-.12],[.035,1.12,.045],{name:'Slender modern glazing edge beside the broken masonry'});
  }else{
   block(trim,[0,s.y+5.26,s.maxZ],[s.maxX-s.minX+.55,.18,.66],{name:'Street facade limestone cornice'});
   block(iron,[0,s.y+5.43,s.maxZ],[s.maxX-s.minX+.72,.13,.8],{name:'Street facade projecting SoHo cornice'});
  }
  light([0,s.y+4.8,-9.4],105,18,0xf0ece3);
  for(const x of [-6.5,6.5])block(lightMaterial,[x,s.y+4.95,-9.4],[.025,.012,3.0]);
 }
 // The blank masonry spine is intentional: no window interrupts the giant
 // tongue and its actual TOTEHM artwork, even on the upper facade levels.
 for(const x of [-2.4,2.4])block(iron,[x,1.51,-1.80],[.055,3.2,.09]);
 block(iron,[0,3.12,-1.8],[4.86,.065,.1]);
 const entrance=mesh(planeGeo,glass,[0,1.5,-1.78],{name:'Open gallery entrance interaction plane'});entrance.scale.set(4.65,3.0,1);entrance.material=material(glass.clone());entrance.material.opacity=.001;station(entrance,'gallery-entry','entrance',-1);

 // Rooftop around a genuine atrium skylight; the rear-left smoke shaft is
 // open to the sky and never terminates against an upper concrete slab.
 const roofY=27,roofRects=[[-10,10,-16,-10.8],[-10,10,-8,-4],[-10,-5.2,-10.8,-8],[5.2,10,-10.8,-8]];
 for(const [x0,x1,z0,z1] of roofRects){
  if(z0===-16){for(const [a,b,c,d] of [[x0,-8.62,z0,z1],[-7.38,x1,z0,z1],[-8.62,-7.38,z0,-15.82],[-8.62,-7.38,-14.58,z1]])block(glass,[(a+b)/2,roofY-.1,(c+d)/2],[b-a,.2,d-c],{solid:true,name:'Clear glass roof with open smoke shaft'});}
  else block(glass,[(x0+x1)/2,roofY-.1,(z0+z1)/2],[x1-x0,.2,z1-z0],{solid:true,name:'Continuous glass roof around the atrium'});
 }
 const skylight=mesh(geometry(new T.PlaneGeometry(10.4,2.8)),glass,[0,roofY,-9.4],{name:'Clear atrium roof skylight'});skylight.rotation.x=-Math.PI/2;
 // The fifth-storey setback leaves a real four-sided roof terrace above
 // the lower brick volume. Its top is shared with roof collision, 21.71 m.
 for(const [id,x0,x1,z0,z1] of [['west',-13,-10,-17,-2],['east',10,13,-17,-2],['back',-10,10,-17,-16],['front',-10,10,-4,-2]]){
  const terrace=block(white,[(x0+x1)/2,21.58,(z0+z1)/2],[x1-x0,.2,z1-z0],{name:'Setback roof terrace support — '+id,solid:true,walk:true});terrace.userData.roof=true;terrace.userData.floor=4;
  stoneSurfaces.push({id:'Setback roof terrace — '+id,minX:x0,maxX:x1,minZ:z0,maxZ:z1,y:21.71,floor:4});
 }
 const ancientFloor=createAncientStoneSurfaces(root,{mobile,anisotropy,onChange:changed,surfaces:stoneSurfaces});
 solids.push(...ancientFloor.solids);walkable.push(...ancientFloor.walkable);
 const flueStart=new T.Vector3(-8,4.85,-15.99),flueEnd=new T.Vector3(-8,roofY,-15.2),flueDirection=flueEnd.clone().sub(flueStart);
 const flue=mesh(geometry(new T.CylinderGeometry(.45,.55,flueDirection.length(),24,1,true)),smokeGlass,flueStart.clone().add(flueEnd).multiplyScalar(.5).toArray(),{name:'Minimal transparent smoke shaft through the five storeys'});flue.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),flueDirection.normalize());flue.castShadow=false;

 // Quiet white exhibition walls sit inside the galleries. The circulation
 // aisles stay outside them, beside glass, so no inclined path crosses a work.
 const artSurfaces=[];
 for(const wall of NEW_YORK_EXHIBITION_WALLS){
  const panel=block(white,[wall.x,wall.y,wall.z],[wall.depth,wall.height,wall.width],{name:wall.id,solid:true,batch:false});
  panel.userData={exhibitionWall:wall.id,floor:wall.floor};exhibitionWalls.push(panel);
  artSurfaces.push({id:wall.id,floor:wall.floor,normal:[...wall.normal],width:wall.artBounds.width,height:wall.artBounds.height,
   slots:wall.slots.map(slot=>({...slot,position:[...slot.position],normal:[...slot.normal]}))});
 }

 // Existing artworks retain their original positions, paths and access.
 const counter=block(stone.material,[0,.41,-12.05],[7,1,2],{solid:true,batch:false,name:'Monolithic limestone THP counter'});station(counter,'thp-counter','thp',0);
 const top=block(stone.material,[0,.97,-12.05],[7,.12,2],{batch:false});station(top,'thp-counter-top','thp',0);
 const fallback=new T.DataTexture(new Uint8Array([51,51,102,255]),1,1,T.RGBAFormat);fallback.colorSpace=T.SRGBColorSpace;fallback.needsUpdate=true;textures.add(fallback);
 const paperMaterial=material(new T.MeshStandardMaterial({map:fallback,color:0xffffff,roughness:.84,side:T.DoubleSide,alphaTest:.12}));
 const sculptedPaperMaterial=material(new T.MeshStandardMaterial({map:fallback,color:0xffffff,roughness:.58,alphaTest:.12,emissive:0x111120,emissiveIntensity:.16}));
 if(globalThis.document?.createElementNS){const texture=new T.TextureLoader().load(TOTEHMPAPER.src,loaded=>{if(disposed){loaded.dispose();return;}for(const m of [paperMaterial,sculptedPaperMaterial]){m.map=loaded;m.needsUpdate=true;}paperLoaded=true;changed();},undefined,changed);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=anisotropy;textures.add(texture);}
 const paperItems=[];for(const x of [-2.2,0,2.2])for(let row=0;row<6;row++)for(let col=0;col<8;col++)paperItems.push([x+(col-3.5)*.0233,1.055,-11.8+(row-2.5)*.0233]);
 const papers=new T.InstancedMesh(planeGeo,paperMaterial,paperItems.length),q=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,0)),matrix=new T.Matrix4();
 paperItems.forEach((p,i)=>{matrix.compose(new T.Vector3(...p),q,new T.Vector3(.022,.022,1));papers.setMatrixAt(i,matrix);});papers.instanceMatrix.needsUpdate=true;papers.computeBoundingSphere();root.add(papers);station(papers,'thp-papers','thp',0);
 const lecternBase=block(ink,[-7.6,-.04,-8],[1.1,.10,.96],{solid:true,batch:false,name:'Origins black lectern base'});station(lecternBase,'origins-lectern-base','origins',1);
 block(iron,[-7.6,.58,-8.04],[.13,1.17,.15],{solid:true,name:'Origins slender lectern stem'});
 const lecternTop=block(ink,[-7.6,1.31,-8],[1.08,.045,1.05],{solid:true,batch:false,name:'Origins inclined black lectern'});lecternTop.rotation.x=Math.PI/10;station(lecternTop,'origins-lectern','origins',1);
 block(iron,[8,3.1,-16.50],[7.16,4.06,.16],{name:'Independent Lisbon screen frame'});block(black,[8,3.1,-16.405],[7,3.9,.018]);
 const facadeSign=createGalleryFacade(root,{mobile,geometry,material,station,black,sculptedPaperMaterial,position:[0,14,-1.72],scale:2.6});
 for(const spec of [{p:[-3.6,7,3.2],power:190,color:0xffd59d},{p:[4.0,20,3.2],power:220,color:0xe1e8f1}]){
  const spot=new T.SpotLight(spec.color,spec.power,28,.5,.8,2);spot.position.set(...spec.p);spot.target.position.set(0,14,-1.3);root.add(spot,spot.target);
 }
 // Grazing facade wash reveals the red clay without replacing the night.
 for(const x of [-10,10]){const spot=new T.SpotLight(0xffd8ab,180,40,.48,.7,2);spot.position.set(x,1,3.4);spot.target.position.set(x,19,-2);root.add(spot,spot.target);}
 flush();changed();
 const portals=NEW_YORK_STATIONS.map(s=>{const p=s.position||s.book||s.screen;return{room:s.room,x:p[0],z:p[2],href:s.href};});
 return{
  root,solids,walkable,exhibitionWalls,artSurfaces,facadeWindows,interactables,pickables:interactables.map(i=>i.object),portals,setDay(){},
  update(dt,eye,motion=true){if(disposed)return false;if(motion)time+=Math.max(0,Math.min(Number(dt)||0,.1));const result=dirty;dirty=false;return result;},
  diagnostics:()=>({heritage:heritage.diagnostics(),kind:'new-york-brick-facade-glass-gallery',ready:!disposed,building:true,modernGallery:true,levels:5,floorHeights:[...NEW_YORK_FLOORS],topFloorSetback:{...L.upper},redBrick:true,runningBond:true,ruinedHistoricFacade:true,brokenMasonryCrown:true,modernGlassSeal:true,crown:{brokenWings:2,centralSpineHalfWidth:3.4,maximumLossMetres:.89,modernGlassTop:27},facadeOnlyMasonry:true,windows:windowCount,windowsFrontOnly:true,centralWindows:0,glassSides:true,glassRear:true,minimalWhiteInterior:true,stoneFloors:true,flooring:{sameAsLisbon:true,ancientStone:ancientFloor.diagnostics()},stairs:0,ramps:NEW_YORK_RAMPS.length,rampWidth:L.rampWidth,continuousAscent:true,walkableMeshes:walkable.length,atrium:true,roof:true,glassRoof:true,exhibition:{walls:exhibitionWalls.length,levels:NEW_YORK_FLOORS.length,reservedSlots:artSurfaces.reduce((n,s)=>n+s.slots.length,0),rampsCrossArtwork:false},smokeOutlet:{x:-8,y:roofY,z:-15.2,radius:.45,radiusZ:.45},facade:{mouth:true,originalDrawing:true,paperLoaded,threeDimensional:true,tongueVolume:true,tongueSmooth:true,paperVolume:true,edgeNotches:12,elegantlyLit:true,monumental:true,centered:true,scale:2.6,position:facadeSign.position.toArray(),blankCenter:true},pavement:{kind:'manhattan-bluestone-and-asphalt',calcada:false,curbs:true,cellarGrates:true,utilityCovers:true,crosswalk:true},stone:stone.diagnostics(),portals,rooms:4,independentFiles:true,time:+time.toFixed(3),disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();heritage.dispose();ancientFloor.dispose();stone.dispose();for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.clear();}
 };
}
