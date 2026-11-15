import * as T from './vendor/three-0.180.0.mjs';
import {createLisbonAzulejoBuilding} from './gallery-lisbon-azulejo-building.mjs';
import {createHeritageMasonry} from './gallery-heritage-masonry.mjs';
import {createAncientFloor} from './gallery-ancient-floor.mjs';
import {createLisbonPavement} from './gallery-lisbon-pavement.mjs';
import {createPaperPackaging} from './gallery-paper-packaging.mjs';
import {createLaboratoryProps} from './gallery-laboratory-props.mjs';
import {createLisbonHologram} from './gallery-lisbon-hologram.mjs';
import {createTotehmPieceGeometry} from './gallery-totehm-piece.mjs';
import {createHigherPieceGeometry} from './gallery-higher-piece.mjs';
import {createEmblemReliefGeometry} from './gallery-lisbon-emblem-relief.mjs';
import {TOTEHMPAPER} from './gallery-artworks.mjs';
import {LISBON_URBEX_LAYOUT as L,LISBON_URBEX_STATIONS,INTENTIONS,LISBON_URBEX_STONE,LISBON_URBEX_FURNITURE} from './gallery-lisbon-urbex-layout.mjs';

export function createLisbonUrbexGallery(scene,renderer,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Lisbon — azulejo ruins, stone and modern glass';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),solids=[],walkable=[],interactables=[];
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 let disposed=false,dirty=true,inspecting=false,inspection=0,paperLoaded=false,emblemLoaded=false;
 const changed=()=>{if(!disposed){dirty=true;onChange();}};
 const black=material(new T.MeshPhysicalMaterial({color:0x000000,roughness:.19,metalness:.56,clearcoat:1,clearcoatRoughness:.12}));black.name='TOTEHM — absolute black alien support';
 const silver=material(new T.MeshStandardMaterial({color:0xc4cad1,roughness:.26,metalness:.86}));
 const box=geometry(new T.BoxGeometry(1,1,1));
 // The authored image is on the front cap only. The reverse seen through
 // glass is plain material, so a native word is never shown mirrored.
 function frontCapOnly(g){const n=g.attributes.normal;g.clearGroups();let start=0,last=null;for(let i=0;i<n.count;i+=3){const index=n.getZ(i)>.99?0:1;if(last!==null&&index!==last){g.addGroup(start,i-start,last);start=i;}last=index;}g.addGroup(start,n.count-start,last);return g;}

 function mesh(g,m,p,name,parent=root){const o=new T.Mesh(g,m);o.position.set(...p);o.name=name;o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);return o;}
 const block=(m,p,size,name,parent=root)=>{const o=mesh(box,m,p,name,parent);o.scale.set(...size);return o;};
 function mark(object,kind='thp',room=0){object.userData={...object.userData,kind,room};interactables.push({object,kind,room});return object;}
 function texture(src,ready=()=>{}){if(!globalThis.document?.createElementNS)return null;const t=new T.TextureLoader().load(src,m=>{if(disposed)return;ready(m);changed();},undefined,changed);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer?.capabilities?.getMaxAnisotropy?.()||4);textures.add(t);return t;}
 block(black,[0,-.48,0],[32,.65,36],'Quiet black foundation beneath the old stone');
 const floor=createAncientFloor(root,{mobile,onChange:changed});solids.push(...floor.solids);walkable.push(...floor.solids);
 const pavement=createLisbonPavement({mobile,onChange:changed,boatCentre:[0,4]});
 for(const [x,z,w,d] of [[0,8,32,20],[0,-17.5,32,1],[-14.5,-9.5,3,15],[14.5,-9.5,3,15]]){
  const p=mesh(geometry(new T.PlaneGeometry(w,d)),pavement.material,[x,L.groundY,z],'Original exterior Lisbon calçada');p.rotation.x=-Math.PI/2;p.castShadow=false;p.userData.walkable=true;solids.push(p);walkable.push(p);
 }
 const building=createLisbonAzulejoBuilding(root,{mobile,ruined:true,onChange:changed});solids.push(...building.solids);
 const stone=createHeritageMasonry(root,{mobile,walls:LISBON_URBEX_STONE.map(w=>({...w,breakTop:true})),onChange:changed});solids.push(...stone.solids);
 // Sparse fragments keep their physical thickness and irregular broken caps.
 const fragment=geometry(new T.DodecahedronGeometry(1,0));
 for(const [x,z,s] of [[-12,-10.5,.15],[-11.5,-10.7,.12],[11,-8.6,.14],[11.8,-9,.2],[-11.9,-11,.09]]){
  const rubble=mesh(fragment,stone.stoneMaterial,[x,L.groundY+s*.35,z],'Fallen limestone beside the retained wall');rubble.scale.set(s*1.5,s*.5,s);rubble.rotation.set(.2,x,.3);
 }
 // Exactly one table: uninterrupted black slab, recessed pedestal, two lab
 // wings and the original six premium cases in the central exhibition well.
 const [tx,top,tz]=L.counter.position;
 const slabShape=new T.Shape();const w=6.8,h=1.4,r=.065;
 slabShape.moveTo(-w/2+r,-h/2);slabShape.lineTo(w/2-r,-h/2);slabShape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);slabShape.lineTo(w/2,h/2-r);slabShape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);slabShape.lineTo(-w/2+r,h/2);slabShape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);slabShape.lineTo(-w/2,-h/2+r);slabShape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
 const slab=mark(mesh(geometry(new T.ExtrudeGeometry(slabShape,{depth:.105,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,curveSegments:8})),black,[tx,top-.008,tz],'Single premium black THP and laboratory table'));slab.rotation.x=Math.PI/2;slab.userData.table=true;solids.push(slab);
 const support=block(black,[tx,.43,tz],[1.4,.95,.55],'Recessed levitating black table pedestal');solids.push(support);
 const cold=material(new T.MeshBasicMaterial({color:0x8492bf,toneMapped:false,transparent:true,opacity:.35}));
 block(cold,[0,.91,tz+.694],[6.55,.006,.006],'One restrained technological seam beneath the table');
 const paperMap=texture(TOTEHMPAPER.src,()=>{paperLoaded=true;});
 const paper=material(new T.MeshStandardMaterial({map:paperMap,color:0xffffff,roughness:.64,side:T.DoubleSide,alphaTest:.12}));
 const cases=[],caseWidth=.12;
 for(const x of [-.38,0,.38])for(const dz of [-.19,.19]){
  const display=createPaperPackaging({paperMaterial:paper,geometry,material,width:caseWidth});display.rotation.x=-.6;
  display.position.set(x,top+(caseWidth/2+.001)*Math.cos(.6)+(caseWidth*50/360)*Math.sin(.6),tz+dz);root.add(display);cases.push(display);display.userData.restPosition=display.position.toArray();display.userData.inside=true;
  display.traverse(part=>{if(part.isMesh)mark(part);});
 }
 const inspectCase=cases[3],caseRest=inspectCase.position.clone();
 const laboratory=createLaboratoryProps(root,{geometry,material,black,mobile,top,z:tz});
 const installation=createLisbonHologram(root,{mobile,onChange:changed});
 // The collaboration belongs to the retained west stone wall, facing into
 // the room. The azulejo street facade carries no brand sculptures.
 const identity=new T.Group();identity.name='Interior Lisbon city hall × TOTEHM collaboration';identity.position.set(-12.2,2.8,-13.5);identity.rotation.y=Math.PI/2;root.add(identity);
 let emblem;
 const emblemMap=texture('/assets/signs/lisboa_city_hall.png',t=>{const old=emblem.geometry;emblem.geometry=geometry(createEmblemReliefGeometry(t.image,{width:1.35,depth:.14,mobile}));geometries.delete(old);old.dispose();emblemLoaded=true;});
 const face=material(new T.MeshStandardMaterial({map:emblemMap,color:0xffffff,transparent:true,alphaTest:.1,roughness:.4,metalness:.3,emissive:0xffffff,emissiveMap:emblemMap,emissiveIntensity:.1}));
 emblem=mesh(geometry(createEmblemReliefGeometry(null,{width:1.35,depth:.14,mobile})),[face,silver],[-1.45,0,0],'Interior Lisbon municipal emblem relief',identity);
 emblem.userData.cityHallRelief=true;
 for(const angle of [-Math.PI/4,Math.PI/4])block(silver,[0,0,0],[.065,.8,.1],'Interior collaboration X stroke',identity).rotation.z=angle;
 const sides=material(new T.MeshStandardMaterial({color:0x333366,roughness:.5}));
 const logo=mesh(geometry(frontCapOnly(createTotehmPieceGeometry(1.25,.1))),[paper,sides],[1.4,0,0],'Interior native TOTEHM 3D piece',identity);logo.userData.nativePerforations=12;
 const higherMap=texture('/assets/gallery/higher.svg'),higher=material(new T.MeshStandardMaterial({map:higherMap,alphaTest:.1,transparent:true,side:T.DoubleSide,emissive:0xffffff,emissiveMap:higherMap,emissiveIntensity:.25}));
 mesh(geometry(frontCapOnly(createHigherPieceGeometry(1.35,.035))),[higher,sides],[1.85,-1.05,0],'Interior native Higher piece',identity);
 if(globalThis.document){const c=document.createElement('canvas');c.width=1600;c.height=160;const ctx=c.getContext('2d'),map=new T.CanvasTexture(c);textures.add(map);map.colorSpace=T.SRGBColorSpace;
  const draw=()=>{if(disposed)return;ctx.clearRect(0,0,1600,160);ctx.fillStyle='#d3d6dd';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 88px "Space Mono",monospace';ctx.fillText('MAKE THE LISBON STREETS',800,80,1570);map.needsUpdate=true;changed();};draw();document.fonts?.ready?.then(draw);
  const label=mesh(geometry(new T.PlaneGeometry(3.6,.36)),material(new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false})),[-.72,-1.05,.015],'Interior invitation to Play the Street',identity);label.castShadow=false;
 }
 // Fine intentions make the modern insertion legible against the old stone.
 INTENTIONS.forEach((intent,n)=>{const ink=material(new T.MeshBasicMaterial({color:intent.color,toneMapped:false}));
  const seam=block(ink,[-.12+n*.04,L.groundY+.002,-4.1],[.006,.003,4.1],'Entrance intention hairline — '+intent.label);seam.userData.intention=intent.id;
  const rail=block(ink,[-12.97+n*.012,.025,-8.5],[.004,.005,11.7],'Glass and stone intention joint — '+intent.label);rail.userData.intention=intent.id;
 });
 for(const [p,target,power,color] of [
  [[-9,5,3],[-9,4,-2],360,0xb9c9f0],[[9,5,3],[9,4,-2],360,0xd2d7df],
  [[0,5.6,-5.4],[0,1,-7.4],125,0xe2e8ff],[[-3.2,4,-7.4],[-2.3,1.3,-7.4],48,0xbccfff],[[3.2,4,-7.4],[2.3,1.3,-7.4],48,0xcbd8ee],
  [[-11.7,1.3,-10],[-12.6,3,-13],80,0xffd8ad],[[11,2,-8],[12,3,-11],70,0xffd8ad],
  [[-7,5.7,-10],[-12.2,2.8,-13.5],95,0xdce6ff]
 ]){const light=new T.SpotLight(color,power,25,.75,.8,2);light.position.set(...p);light.target.position.set(...target);root.add(light,light.target);}
 const fill=new T.PointLight(0xc9d4ed,35,22,2);fill.position.set(0,5,-9);root.add(fill);
 const obstacles=[...building.obstacles,...LISBON_URBEX_STONE,...LISBON_URBEX_FURNITURE];
 changed();
 return{root,solids,walkable,interactables,pickables:[...interactables.map(item=>item.object),...installation.pickables],artSurfaces:[],portals:[],obstacles,
  layout:L,stations:LISBON_URBEX_STATIONS,performance:installation,installation,roofHeight:building.roofHeight,roofProfile:building.roofProfile,smokeOutlet:building.smokeOutlet,
  setDay(){},setInspecting(value){inspecting=!!value;changed();},
  update(dt,eye,motion=true){if(disposed)return false;const target=inspecting?1:0,next=motion?T.MathUtils.damp(inspection,target,6,Math.min(.1,dt)):target;let moved=false;
   if(Math.abs(next-inspection)>.0001||inspection!==target){inspection=Math.abs(next-target)<.0001?target:next;inspectCase.position.copy(caseRest).lerp(new T.Vector3(0,1.43,tz+1.1),inspection);inspectCase.rotation.x=T.MathUtils.lerp(-.6,-.08,inspection);moved=true;}
   const result=dirty||moved;dirty=false;return result;},
  diagnostics:()=>({kind:'lisbon-azulejo-urbex-gallery',ready:!disposed,place:'lisbon',dome:false,azulejos:true,ruins:true,stoneInterior:true,modernGlass:true,islandPreserved:true,levels:1,
   azulejoBuilding:building.diagnostics(),floor:floor.diagnostics(),stone:stone.diagnostics(),pavement:pavement.diagnostics(),
   facade:{externalStreetSigns:0,externalBrandSculptures:0,collaborationInside:true,cityHallRelief:emblemLoaded,totehmHoles:12,higherHoles:18},
   laboratory:{...laboratory.diagnostics(),outside:false},thpCounter:{tables:1,packagedPapers:cases.length,caseWidthMetres:caseWidth,premiumSource:'/get_higher',exterior:false,inside:true,position:L.counter.position,inspection,black:true,twoInOne:true,looseTabs:0,wallPapers:0},
   streetSigns:{count:22,inside:22,outside:0,groundMarkings:0,posts:0},discover:{outside:false,fullscreen:true,href:L.play.href},
   performance:installation.diagnostics(),installation:installation.diagnostics(),paperLoaded,disposed}),
  dispose(){if(disposed)return;disposed=true;installation.dispose();building.dispose();stone.dispose();floor.dispose();pavement.dispose();root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();root.traverse(o=>{if(o.isLight)o.dispose?.();});root.clear();}
 };
}
