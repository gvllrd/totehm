import * as T from './vendor/three-0.180.0.mjs';
import {DOME as D,INTENTIONS,LISBON_DOME_LAYOUT as L,LISBON_DOME_STATIONS,LISBON_DOME_SIGNS,LISBON_DOME_OBSTACLES,DOME_ROOF_PROFILE,DOME_SMOKE_OUTLET,domeRoofHeight} from './gallery-lisbon-dome-layout.mjs';
import {createDomeShellGeometry} from './gallery-lisbon-dome-shell.mjs';
import {createLisbonPavement} from './gallery-lisbon-pavement.mjs';
import {createLisbonStreetSigns} from './gallery-lisbon-street-signs.mjs';
import {createGalleryFacade} from './gallery-facade.mjs';
import {createPaperPackaging} from './gallery-paper-packaging.mjs';
import {createStreetPerformance} from './gallery-lisbon-street-performance.mjs';
import {TOTEHMPAPER} from './gallery-artworks.mjs';
import {createHigherPieceGeometry} from './gallery-higher-piece.mjs';

export function createLisbonDome(scene,renderer,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Lisbon — black monolithic Higher dome';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),solids=[],walkable=[],interactables=[];
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 let disposed=false,dirty=true,inspecting=false,inspection=0,paperLoaded=false,time=0;
 const changed=()=>{if(!disposed){dirty=true;onChange();}};
 const black=material(new T.MeshPhysicalMaterial({color:0x000000,roughness:.78,metalness:.08,clearcoat:.12,clearcoatRoughness:.6,side:T.DoubleSide}));
 black.name='Raw black — dome and interior';
 black.customProgramCacheKey=()=> 'lisbon-raw-black-grain-v1';
 black.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat rawGrain=fract(sin(dot(vViewPosition.xy*600.,vec2(12.9898,78.233)))*43758.5453);\nroughnessFactor=clamp(roughnessFactor+rawGrain*.12,.6,1.);');};
 const steel=material(new T.MeshStandardMaterial({color:0x050505,roughness:.27,metalness:.85}));
 const floorMaterial=material(black.clone());floorMaterial.roughness=.32;floorMaterial.clearcoat=.25;floorMaterial.name='Black laboratory floor';
 const box=geometry(new T.BoxGeometry(1,1,1)),plane=geometry(new T.PlaneGeometry(1,1));
 function mesh(g,m,p,name,solid=false,scale=null){const o=new T.Mesh(g,m);o.position.set(...p);if(scale)o.scale.set(...scale);o.name=name;o.castShadow=true;o.receiveShadow=true;root.add(o);if(solid)solids.push(o);return o;}
 const block=(m,p,size,name,solid=false)=>mesh(box,m,p,name,solid,size);
 function station(object,id,kind,room){object.userData={...object.userData,id,kind,room};interactables.push({object,id,kind,room});return object;}
 function tube(points,radius,m,name){return mesh(geometry(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),mobile?64:112,radius,5,false)),m,[0,0,0],name);}
 function texture(src,ready=()=>{}){if(!globalThis.document?.createElementNS)return null;const t=new T.TextureLoader().load(src,loaded=>{if(disposed)return;ready(loaded);changed();},undefined,changed);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer?.capabilities?.getMaxAnisotropy?.()||4);textures.add(t);return t;}
 function text(value,p,width,height,color='#c8c8cb'){
  if(!globalThis.document)return null;const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=Math.round(2048*height/width);
  const context=canvas.getContext('2d'),map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;textures.add(map);
  const m=material(new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide}));
  const object=mesh(plane,m,p,value,false,[width,height,1]);object.castShadow=false;
  const draw=()=>{if(disposed)return;context.clearRect(0,0,canvas.width,canvas.height);context.fillStyle=color;context.textAlign='center';context.textBaseline='middle';context.font='700 '+Math.floor(canvas.height*.68)+'px "Space Mono",monospace';context.fillText(value,canvas.width/2,canvas.height/2,canvas.width);map.needsUpdate=true;changed();};draw();document.fonts?.ready?.then(draw);return object;
 }
 block(black,[0,-.38,0],[32,.44,36],'Black foundation on the original island');
 const pavement=createLisbonPavement({mobile,onChange:changed,boatCentre:[-6.5,11]});
 const paving=new T.Shape();paving.moveTo(-16,-18);paving.lineTo(16,-18);paving.lineTo(16,18);paving.lineTo(-16,18);paving.closePath();
 const hole=new T.Path();for(let i=0;i<=128;i++){const a=-i/128*Math.PI*2,x=D.radiusX*Math.cos(a),z=D.centerZ+D.radiusZ*Math.sin(a);if(!i)hole.moveTo(x,-z);else hole.lineTo(x,-z);}paving.holes.push(hole);
 const pavingGeometry=geometry(new T.ShapeGeometry(paving));pavingGeometry.rotateX(-Math.PI/2);
 const terrace=mesh(pavingGeometry,pavement.material,[0,D.groundY,0],'Lisbon calçada — the island, waves and caravel',true);terrace.castShadow=false;terrace.userData.walkable=true;walkable.push(terrace);
 const floor=mesh(geometry(new T.CircleGeometry(1,mobile?96:144)),floorMaterial,[0,D.groundY, D.centerZ],'Continuous black interior floor',true,[D.radiusX,D.radiusZ,1]);floor.rotation.x=-Math.PI/2;floor.userData.walkable=true;walkable.push(floor);
 const shell=mesh(geometry(createDomeShellGeometry({mobile})),black,[0,0,0],'Raw black dome — open entrance and smoke oculus',true);shell.userData.domeShell=true;
 const rim=Array.from({length:129},(_,i)=>{const a=i/128*Math.PI*2;return[D.radiusX*Math.sin(a),-.06,D.centerZ+D.radiusZ*Math.cos(a)];});
 tube(rim,.025,steel,'Subtle black foundation seam');
 // The portal's edges follow the actual cut surface, retaining a wide void.
 const frontAt=(x,y)=>D.centerZ+D.radiusZ*Math.sqrt(Math.max(0,1-(x/D.radiusX)**2-((y-D.groundY)/D.height)**2));
 for(const x of [-D.entryHalfWidth,D.entryHalfWidth])tube(Array.from({length:25},(_,i)=>{const y=D.groundY+(D.entryHeight-D.groundY)*i/24;return[x,y,frontAt(x,y)+.015];}),.045,steel,'Black entrance reveal');
 tube(Array.from({length:49},(_,i)=>{const x=-D.entryHalfWidth+i/48*D.entryHalfWidth*2;return[x,D.entryHeight,frontAt(x,D.entryHeight)+.02];}),.045,steel,'Black portal lintel');
 block(black,[0,5.15,4.64],[5.15,.32,.36],'Interior black exit-sign lintel',true);
 // Exact original tongue and paper, lit as a sculpture above the entrance.
 const paperMap=texture(TOTEHMPAPER.src,()=>{paperLoaded=true;});
 const paper=material(new T.MeshStandardMaterial({map:paperMap,color:0xffffff,roughness:.7,side:T.DoubleSide,alphaTest:.12}));
 const mouth=createGalleryFacade(root,{mobile,geometry,material,station,black,sculptedPaperMaterial:paper,position:[0,7.55,4.4],scale:1.15});
 for(const x of [-.78,.78])block(steel,[x,7.0,3.75],[.055,2.35,1.15],'Black sculpture support');
 text('MAKE LISBON STREETS',[-.72,5.36,5.22],3.65,.31);
 const higherMap=texture('/assets/gallery/higher.svg'),higherMaterial=material(new T.MeshStandardMaterial({map:higherMap,transparent:true,alphaTest:.1,roughness:.55,emissive:0xffffff,emissiveMap:higherMap,emissiveIntensity:.14,side:T.DoubleSide}));
 mesh(plane,higherMaterial,[1.85,5.36,5.23],'Original Higher entrance signature',false,[1.18,1.18/3,1]);
 // Seven actual intention seams: quiet lines, never coloured wall surfaces.
 INTENTIONS.forEach((intent,n)=>{
  const angle=(-142+n*44)*Math.PI/180,ink=material(new T.MeshBasicMaterial({color:intent.color,toneMapped:false}));
  const foot=[D.radiusX*.985*Math.sin(angle),D.groundY+.018,D.centerZ+D.radiusZ*.985*Math.cos(angle)];
  const points=[[(n-3)*.022,D.groundY+.018,-5.4],foot];
  const path=tube(points,.009,ink,'Intention floor seam — '+intent.label);path.userData.intention=intent.id;
  const arc=Array.from({length:49},(_,i)=>{const t=Math.PI/2-i/48*Math.PI/2;return[D.radiusX*.985*Math.sin(t)*Math.sin(angle),D.groundY+D.height*.985*Math.cos(t),D.centerZ+D.radiusZ*.985*Math.sin(t)*Math.cos(angle)];});
  const meridian=tube(arc,.008,ink,'Intention dome seam — '+intent.label);meridian.userData.intention=intent.id;
 });
 // Laboratory furniture remains black; the original editions are much smaller.
 const table=station(block(black,[0,.97,-2.4],[3.6,.12,1.2],'Black monolithic THP laboratory table',true),'thp-laboratory','thp',0);
 block(steel,[0,.43,-2.4],[2.6,.94,.62],'Recessed laboratory table support',true);
 const cases=[],caseWidth=.12;
 for(const x of [-.32,0,.32])for(const z of [-2.60,-2.20]){
  const display=createPaperPackaging({paperMaterial:paper,geometry,material,width:caseWidth});display.rotation.x=-.6;
  display.position.set(x,1.03+(caseWidth/2+.001)*Math.cos(.6)+(caseWidth*50/360)*Math.sin(.6),z);
  display.userData.restPosition=display.position.toArray();root.add(display);cases.push(display);display.traverse(part=>{if(part.isMesh)station(part,'thp-premium-case','thp',0);});
 }
 const inspectCase=cases[3],caseRest=new T.Vector3(...inspectCase.userData.restPosition);
 const glass=material(new T.MeshPhysicalMaterial({color:0xd5e5e6,roughness:.08,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide,metalness:.12}));
 block(black,[4.4,1.0,-3.5],[2.5,.10,.8],'Black analytical side bench',true);block(steel,[4.4,.47,-3.5],[1.8,1.0,.5],'Recessed instrument bench support');
 function flask(x,z,scale=1){
  mesh(geometry(new T.CylinderGeometry(.038,.15,.28,24,1,true)),glass,[x,1.05+.14*scale,z],'Laboratory conical glass body',false,[scale,scale,scale]);
  mesh(geometry(new T.CylinderGeometry(.038,.038,.2,20,1,true)),glass,[x,1.05+.38*scale,z],'Laboratory glass neck',false,[scale,scale,scale]);
  mesh(geometry(new T.TorusGeometry(.039,.005,5,24)),glass,[x,1.05+.48*scale,z],'Fine glass lip',false,[scale,scale,scale]).rotation.x=Math.PI/2;
 }
 flask(3.65,-3.5);flask(4.15,-3.6,.8);
 block(steel,[4.7,1.08,-3.5],[.52,.06,.4],'Analytical balance base');
 const balance=mesh(geometry(new T.CylinderGeometry(.12,.12,.015,24)),steel,[4.7,1.13,-3.5],'Laboratory balance pan');
 block(glass,[4.7,1.35,-3.5],[.47,.46,.36],'Clear analytical balance shield');
 for(let n=0;n<3;n++)mesh(geometry(new T.CylinderGeometry(.025,.025,.25+n*.035,14,1,true)),glass,[5.25+n*.10,1.22,-3.5],'Laboratory sample tube');
 block(steel,[5.36,1.08,-3.5],[.43,.035,.15],'Black sample-tube rack');
 // The COM paper is the unchanged native silhouette, extruded in real space.
 const nativePaper=mouth.getObjectByName('Dimensional original THP — twelve genuine edge notches');
 const totem=station(mesh(geometry(nativePaper.geometry.clone()),paper,[0,4.5,-5.4],'COM — native perforated TOTEHM in volume',false,[2.7,2.7,1]),'totehm-sculpture','thp',0);totem.userData.nativePerforations=12;
 const higherSides=material(new T.MeshStandardMaterial({color:0x333366,roughness:.65}));
 const higherSculpture=mesh(geometry(createHigherPieceGeometry()),[higherMaterial,higherSides],[4.3,3.3,-6.4],'Boutique — original Higher piece in space');higherSculpture.userData.nativePerforations=18;higherSculpture.userData.nativeRatio=3;
 for(const x of [3.35,5.25])block(steel,[x,5.3,-6.44],[.008,4,.008],'Fine suspension over the Higher piece');
 // Secondary artworks retain independent access on quiet black fittings.
 const [bx,by,bz]=L.origins.lectern,lectern=block(black,[bx,by,bz],[1.2,.12,1.1],'Origins black reading slab',true);lectern.rotation.x=Math.PI/10;station(lectern,'origins-lectern','origins',1);
 block(steel,[bx,.54,bz],[.55,1.14,.55],'Origins recessed black plinth');
 block(black,[-2.9,1.5,-11.74],[3,.2+2.9,.3],'Black backing for the secondary artwork',true);
 // A real, open roof vent remains aligned to the right-hand wood fire.
 const o=DOME_SMOKE_OUTLET,ring=Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2,x=o.x+o.radius*Math.cos(a),z=o.z+o.radiusZ*Math.sin(a);return[x,domeRoofHeight(x,z)+D.thickness+.015,z];});
 tube(ring,.018,steel,'Open black smoke oculus');
 const signs=createLisbonStreetSigns(root,{mobile,onChange:changed,signs:LISBON_DOME_SIGNS});
 const performance=createStreetPerformance(root,{onChange:changed});
 // Grazing light reveals raw black through highlights while the seven seams
 // remain the only architectural colour. No additional shadow-map passes.
 for(const [p,target,power,color] of [
  [[-10,7,12],[0,5,1],300,0xbccfff],[[10,5,10],[0,4,1],220,0xe1ddda],
  [[-2,7,-1],[0,1,-2.4],95,0xd8e5ff],[[5,4,-2],[4.4,1.1,-3.5],70,0xe7f0ff],
  [[-7.5,4,-6.8],[-7.5,1,-8.5],45,0xffe1cc],[[0,5,9],[0,7.1,4.5],180,0xe9e9ee]
 ]){const light=new T.SpotLight(color,power,25,.7,.8,2);light.position.set(...p);light.target.position.set(...target);root.add(light,light.target);}
 const fill=new T.PointLight(0xb8caff,22,18,2);fill.position.set(0,6,-5);root.add(fill);
 changed();
 return{root,solids,walkable,interactables,pickables:[...interactables.map(item=>item.object),...signs.pickables],artSurfaces:[],portals:[],obstacles:LISBON_DOME_OBSTACLES,
  layout:L,stations:LISBON_DOME_STATIONS,performance,roofHeight:domeRoofHeight,roofProfile:DOME_ROOF_PROFILE,smokeOutlet:DOME_SMOKE_OUTLET,
  anchors:{originsBook:L.origins.book,counter:L.counter.position},setDay(){},setInspecting(value){inspecting=!!value;changed();},
  update(dt,eye,motion=true){
   if(disposed)return false;time+=Math.max(0,Math.min(Number(dt)||0,.1));let moved=signs.update(dt,eye,motion);
   const target=inspecting?1:0,next=motion?T.MathUtils.damp(inspection,target,6,Math.min(.1,dt)):target;
   if(Math.abs(next-inspection)>.0001||inspection!==target){inspection=Math.abs(next-target)<.0001?target:next;inspectCase.position.copy(caseRest).lerp(new T.Vector3(0,1.43,-1.35),inspection);inspectCase.rotation.x=T.MathUtils.lerp(-.6,-.08,inspection);moved=true;}
   const result=dirty||moved;dirty=false;return result;
  },
  diagnostics:()=>({kind:'lisbon-black-higher-dome',place:'lisbon',ready:!disposed,levels:1,blackExterior:true,blackInterior:true,rawMaterial:true,dome:true,roofHeight:D.height,realEntrance:true,entryWidth:D.entryHalfWidth*2,entryHeight:D.entryHeight,entryText:'MAKE LISBON STREETS HIGHER',islandPreserved:true,intentions:INTENTIONS.map(i=>({...i})),streetSigns:signs.diagnostics(),laboratory:{black:true,scientificGlass:true,sampleTubes:3,analyticalBalance:true},thpCounter:{packagedPapers:cases.length,looseTabs:0,wallPapers:0,premiumSource:'/get_higher',caseWidthMetres:caseWidth,previousCaseWidthMetres:.38,inspection:inspection},origins:{blackPlinth:true,position:L.origins.book},branding:{nativeTotehmHoles:12,nativeHigherHoles:18,higherRatio:3,paperLoaded},pavement:pavement.diagnostics(),performance:performance.diagnostics(),time,disposed}),
  dispose(){if(disposed)return;disposed=true;performance.dispose();signs.dispose();pavement.dispose();root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();root.traverse(object=>{if(object.isLight)object.dispose?.();});root.clear();}
 };
}
