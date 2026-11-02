import * as T from './vendor/three-0.180.0.mjs';
import {createCastleFabric} from './gallery-castle-fabric.mjs';
import {createAncientStoneSurfaces} from './gallery-ancient-floor.mjs';
import {createLisbonPavement} from './gallery-lisbon-pavement.mjs';
import {createWhiteStone} from './gallery-white-stone.mjs';
import {createGalleryFacade} from './gallery-facade.mjs';
import {createPaperPackaging} from './gallery-paper-packaging.mjs';
import {TOTEHMPAPER} from './gallery-artworks.mjs';
import {GALLERY_LAYOUT as L,GALLERY_STATIONS,GALLERY_OBSTACLES} from './gallery-modern-layout.mjs';
import {GLASS_SHELL as S,GLASS_HEARTH,glassRoofHeight} from './gallery-glass-shell.mjs';

// A new coastal museum: a single, quiet glass insertion in the surviving castle.
// The original works are installations inside it, not part of its architecture.
export function createCastleSpace(scene,renderer,{place='lisbon',mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='The coastal castle — '+place;scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),solids=[],interactables=[];
 let disposed=false,dirty=true,paperLoaded=false,time=0;
 const changed=()=>{if(disposed)return;dirty=true;if(renderer?.shadowMap)renderer.shadowMap.needsUpdate=true;onChange();};
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 const anisotropy=Math.min(8,renderer?.capabilities?.getMaxAnisotropy?.()||1);
 const stone=createWhiteStone({mobile,anisotropy,onChange:changed});
 const bronze=material(new T.MeshStandardMaterial({color:place==='lisbon'?0x4c4030:0x343a3b,roughness:.3,metalness:.82}));
 const graphite=material(new T.MeshStandardMaterial({color:0x121719,roughness:.47,metalness:.32}));
 const black=material(new T.MeshBasicMaterial({color:0x000000,toneMapped:false}));
 const warm=material(new T.MeshBasicMaterial({color:0xffd3a0,toneMapped:false}));
 const glass=material(new T.MeshPhysicalMaterial({color:0xd9e4e1,roughness:.045,metalness:.01,transparent:true,opacity:.09,depthWrite:false,side:T.DoubleSide,envMapIntensity:1.5,clearcoat:1,clearcoatRoughness:.03}));
 glass.name='Low-iron museum glazing — sky reflections over warm ancient stone';
 glass.customProgramCacheKey=()=> 'coastal-castle-low-iron-v1';
 let glassCompiled=false;
 glass.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
  float grazing=pow(1.-clamp(abs(dot(normalize(normal),normalize(vViewPosition))),0.,1.),4.);
  diffuseColor.a=mix(.045,.32,grazing);
  #include <opaque_fragment>`);glassCompiled=true;};
 const box=geometry(new T.BoxGeometry(1,1,1));
 function mesh(g,m,p,name,solid=false){const o=new T.Mesh(g,m);o.position.set(...p);o.name=name;o.castShadow=!m.transparent&&!m.isMeshBasicMaterial;o.receiveShadow=!m.isMeshBasicMaterial;root.add(o);if(solid)solids.push(o);return o;}
 function block(m,p,size,name,solid=false){const o=mesh(box,m,p,name,solid);o.scale.set(...size);return o;}
 function station(object,id,kind,room){object.userData={...object.userData,station:kind,stationId:id,action:'station',room};interactables.push({id,kind,room,object});return object;}
 function beam(a,b,width,depth,m,name){const start=new T.Vector3(...a),end=new T.Vector3(...b),v=end.clone().sub(start);const o=block(m,start.clone().add(end).multiplyScalar(.5).toArray(),[width,v.length(),depth],name);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
 // Lisbon keeps its original exterior calçada; worn limestone begins at the
 // glazing. Adjacent surfaces share the walking height without overlapping.
 block(stone.material,[0,-.83,-.1],[32.2,1.32,36.2],'Old castle foundation under the terrace');
 const lisbon=place==='lisbon';
 const floor=createAncientStoneSurfaces(root,{mobile,anisotropy,onChange:changed,surfaces:[lisbon
  ?{id:'castle-stone-interior',floor:0,minX:-13,maxX:13,minZ:-17,maxZ:-2,y:L.groundY}
  :{id:'castle-stone-terrace',floor:0,minX:-16,maxX:16,minZ:-18.1,maxZ:17.9,y:L.groundY}]});
 solids.push(...floor.solids);
 const walkable=[...floor.solids];
 const pavement=lisbon?createLisbonPavement({mobile,anisotropy,onChange:changed}):null;
 if(pavement){
  const terraces=[
   [0,8,32,20,'Exterior calçada — waves and caravel'],
   [0,-17.5,32,1,'Exterior calçada — behind the pavilion'],
   ...[-14.5,14.5].map(x=>[x,-9.5,3,15,'Exterior calçada — side terrace'])
  ];
  for(const [x,z,width,depth,name] of terraces){
   const plane=mesh(geometry(new T.PlaneGeometry(width,depth)),pavement.material,[x,L.groundY,z],name,true);
   plane.rotation.x=-Math.PI/2;plane.castShadow=false;plane.userData={walkable:true,lisbonPavement:true};walkable.push(plane);
  }
 }
 const fabric=createCastleFabric(root,{place,mobile,anisotropy,onChange:changed,geometry,material});solids.push(...fabric.solids);
 // Large clear panes are cut to one sloping plane. A few deep bronze fins
 // carry the glass; no window grid competes with the ruins or the artworks.
 function pane(axis,fixed,start,end,bottom,name){
  const positions=[];
  for(const [a,top] of [[start,false],[end,false],[end,true],[start,true]]){const x=axis==='x'?a:fixed,z=axis==='x'?fixed:a;positions.push(x,top?glassRoofHeight(x,z):bottom,z);}
  const g=geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return mesh(g,glass,[0,0,0],name,true);
 }
 pane('x',-17,-13,13,L.groundY,'Full-height ocean-facing rear glass');
 for(const x of [-13,13])pane('z',x,-17,-2,L.groundY,'Uninterrupted glass against the surviving curtain wall');
 pane('x',-2,-13,-2.8,L.groundY,'West front glazing inserted into the castle');
 pane('x',-2,2.8,13,L.groundY,'East front glazing inserted into the castle');
 pane('x',-2,-2.8,2.8,5.1,'Clear transom over the completely open entrance');
 for(const x of [-13,-6.55,6.55,13])beam([x,-.06,-1.94],[x,glassRoofHeight(x,-1.94),-1.94],.045,.16,bronze,'Slender bronze facade fin');
 for(const x of [-2.82,2.82])beam([x,-.06,-1.94],[x,5.1,-1.94],.035,.09,bronze,'Open entry jamb');
 beam([-2.82,5.1,-1.94],[2.82,5.1,-1.94],.035,.08,bronze,'Open entry head');
 // Four corners and an actual open oculus, triangulated as a single roof.
 const o=GLASS_HEARTH.smokeOutlet;
 const outline=[new T.Vector2(S.minX,S.minZ),new T.Vector2(S.maxX,S.minZ),new T.Vector2(S.maxX,S.maxZ),new T.Vector2(S.minX,S.maxZ)];
 const hole=Array.from({length:48},(_,i)=>{const a=i/48*Math.PI*2;return new T.Vector2(o.x+o.radius*Math.cos(a),o.z+o.radiusZ*Math.sin(a));});
 const roofPoints=[...outline,...hole],faces=T.ShapeUtils.triangulateShape(outline,[hole]),roofPositions=[];
 for(const face of faces)for(const top of [false,true])for(const i of top?[face[0],face[2],face[1]]:face){const p=roofPoints[i];roofPositions.push(p.x,glassRoofHeight(p.x,p.y)+(top?S.thickness:0),p.y);}
 for(const ring of [outline,hole])for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];for(const [p,top] of [[a,false],[b,false],[b,true],[a,false],[b,true],[a,true]])roofPositions.push(p.x,glassRoofHeight(p.x,p.y)+(top?S.thickness:0),p.y);}
 const roofGeometry=geometry(new T.BufferGeometry());roofGeometry.setAttribute('position',new T.Float32BufferAttribute(roofPositions,3));roofGeometry.computeVertexNormals();roofGeometry.computeBoundingBox();roofGeometry.computeBoundingSphere();
 mesh(roofGeometry,glass,[0,0,0],'Single floating glass roof — open star oculus',true);
 for(const z of [S.minZ,S.maxZ]){
  beam([S.minX,glassRoofHeight(S.minX,z),z],[S.maxX,glassRoofHeight(S.maxX,z),z],.075,.18,bronze,'Thin cantilevered roof edge');
  if(z===S.maxZ)beam([S.minX+.3,glassRoofHeight(S.minX+.3,z)-.045,z+.015],[S.maxX-.3,glassRoofHeight(S.maxX-.3,z)-.045,z+.015],.012,.013,warm,'Concealed warm line below the floating eave');
 }
 for(const x of [S.minX,S.maxX])beam([x,glassRoofHeight(x,S.minZ),S.minZ],[x,glassRoofHeight(x,S.maxZ),S.maxZ],.065,.12,bronze,'Quiet perimeter glass channel');
 // Two broad roof seams span the clear hall, without columns or internal rooms.
 for(const x of [-4.5,5.8])beam([x,glassRoofHeight(x,S.minZ),S.minZ],[x,glassRoofHeight(x,S.maxZ),S.maxZ],.028,.045,bronze,'Structural silicone roof seam');
 const collectorGlass=glass.clone();collectorGlass.opacity=.035;collectorGlass.name='Transparent folded glass above the fire';materials.add(collectorGlass);
 const lipY=5.05,rx=1.95,rz=.95,positions=[],indices=[],segments=48;
 for(let j=0;j<=1;j++)for(let i=0;i<=segments;i++){
  const a=i/segments*Math.PI*2,x=o.x+Math.cos(a)*(j?o.radius:rx),z=o.z+Math.sin(a)*(j?o.radiusZ:rz);
  positions.push(x,j?glassRoofHeight(x,z):lipY,z);
  if(!j&&i<segments){const k=i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
 }
 const collectorGeo=geometry(new T.BufferGeometry());collectorGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));collectorGeo.setIndex(indices);collectorGeo.computeVertexNormals();collectorGeo.computeBoundingSphere();mesh(collectorGeo,collectorGlass,[0,0,0],'Clear fold leading the smoke to the open roof');
 // Sparse warm raking light reveals the thickness of the retained stone.
 for(const [p,target,power] of [[[4.8,.35,2.0],[9,5.5,-2],180],[[-4.8,.35,2.0],[-10,5,-2],165],[[11.6,.45,-12],[13,5,-12],100],[[-11.3,.4,-10],[-13,6,-12],90]]){
  const lamp=new T.SpotLight(0xffd2a1,power,22,.62,.8,2);lamp.position.set(...p);lamp.target.position.set(...target);root.add(lamp,lamp.target);
 }
 const ambient=new T.PointLight(0xffd9b5,25,18,2);ambient.position.set(0,5.8,-9);root.add(ambient);
 // Six individual editions, each protected by the original premium case.
 const counter=block(stone.material,[0,.97,-12.05],[3.6,.12,1.2],'A single floating limestone edition table',true);station(counter,'thp-counter','thp',0);
 block(graphite,[0,.43,-12.1],[.5,.94,.45],'Recessed support under the stone table',true);
 const fallback=new T.DataTexture(new Uint8Array([51,51,102,255]),1,1,T.RGBAFormat);fallback.colorSpace=T.SRGBColorSpace;fallback.needsUpdate=true;textures.add(fallback);
 const paperMaterial=material(new T.MeshStandardMaterial({map:fallback,color:0xffffff,roughness:.84,side:T.DoubleSide,alphaTest:.12}));
 const sculptedPaperMaterial=material(new T.MeshStandardMaterial({map:fallback,color:0xffffff,roughness:.58,alphaTest:.12}));
 if(globalThis.document?.createElementNS){const image=new T.TextureLoader().load(TOTEHMPAPER.src,loaded=>{if(disposed)return;for(const m of [paperMaterial,sculptedPaperMaterial]){m.map=loaded;m.needsUpdate=true;}paperLoaded=true;changed();},undefined,changed);image.colorSpace=T.SRGBColorSpace;image.anisotropy=anisotropy;textures.add(image);}
 const packages=[];
 for(const x of [-1.1,0,1.1])for(const z of [-12.32,-11.78]){
  const display=createPaperPackaging({paperMaterial,geometry,material,width:.38});
  display.rotation.x=-.6;
  // The lowest edge, including the case depth, rests on the stone slab.
  display.position.set(x,1.03+.192*Math.cos(.6)+.054*Math.sin(.6),z);
  root.add(display);packages.push(display);
  display.traverse(part=>{if(part.isMesh)station(part,'thp-premium-case','thp',0);});
 }
 // A dressed limestone monolith in the sheltered west keep. The slab uses
 // exactly the same stone material and thickness as the edition table.
 const [bx,by,bz]=L.origins.lectern;
 const lectern=block(stone.material,[bx,by,bz],[1.2,.12,1.1],'Origins — limestone reading slab in the west keep',true);lectern.rotation.x=Math.PI/10;station(lectern,'origins-lectern','origins',1);
 block(stone.material,[bx,(by-.06+L.groundY)/2,bz],[.86,by-.06-L.groundY,.78],'Solid dressed limestone book plinth',true);
 const bookLamp=new T.SpotLight(0xffe0b5,30,7,.6,.75,2);bookLamp.position.set(bx,4.3,bz+1.3);bookLamp.target.position.set(...L.origins.book);root.add(bookLamp,bookLamp.target);
 for(const work of [L.play,L.opposite]){
  const [x,y,z]=work.screen,[width,height]=work.screenSize;
  block(graphite,[x,y,z-.085],[width+.12,height+.12,.12],'Recessed artwork mount fixed to the old stone');
  block(black,[x,y,z-.019],[width,height,.012],'Thin black artwork backing on the masonry');
 }
 // A monumental original mouth crowns the actual entrance; its tongue ends
 // just above the open doorway, with the dimensional THP facing arrivals.
 const sign=createGalleryFacade(root,{mobile,geometry,material,station,black,sculptedPaperMaterial,position:[0,7.45,-1.48],scale:1.5});
 for(const x of [-1.75,1.75])beam([x,5.1,-1.94],[x,8.4,-1.58],.045,.08,bronze,'Slender support behind the entrance sculpture');
 for(const x of [-2.8,2.8]){
  const light=new T.SpotLight(0xffe4ca,160,12,.62,.75,2);light.position.set(x,5.3,1.25);light.target.position.set(0,7.2,-1.15);root.add(light,light.target);
 }
 changed();
 const portals=GALLERY_STATIONS.map(s=>{const p=s.position||s.book||s.screen||s.table;return{room:s.room,x:p[0],z:p[2],href:s.href};});
 return {root,solids,walkable,interactables,pickables:interactables.map(i=>i.object),artSurfaces:[],portals,obstacles:GALLERY_OBSTACLES,
  anchors:{playScreen:L.play.screen,originsBook:L.origins.book,counter:L.counter.position},setDay(){},
  update(dt,eye,motion=true){if(disposed)return false;if(motion)time+=Math.min(.1,Math.max(0,Number(dt)||0));const was=dirty;dirty=false;return was;},
  diagnostics:()=>({kind:'coastal-castle-glass-museum',place,rebuilt:true,building:true,modernGallery:true,ready:!disposed,levels:1,airyInterior:true,interiorPartitions:0,glassRoof:true,flatSlopingRoof:true,waveGlass:false,glassSides:true,glassRear:true,castle:fabric.diagnostics(),fabric:fabric.diagnostics(),glassCompiled,roofShell:{minimum:S.minHeight,maximum:S.maxHeight,actualAperture:true,smokeOutlet:{...o}},pavement:pavement?.diagnostics()||null,flooring:{continuousStone:!lisbon,exterior:lisbon?'lisbon-calcada':'ancient-stone',ancientStone:floor.diagnostics()},stone:stone.diagnostics(),facade:{paperLoaded,originalDrawing:true,monumentalEntranceMark:true,scale:1.5,position:sign.position.toArray()},thpCounter:{packagedPapers:packages.length,looseTabs:0,papers:packages.length,wallPapers:0,premiumSource:'/get_higher',caseSizeMetres:[.38,.38,.38*50/180]},origins:{lectern:true,stone:true,inKeep:true,closedBook:true,position:L.origins.lectern},exhibition:{walls:0,levels:1,reservedSlots:0,artworkSupport:'stone',glassMountedArtworks:0},rooms:4,independentFiles:true,time,disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();fabric.dispose();floor.dispose();pavement?.dispose();stone.dispose();for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.clear();}
 };
}
