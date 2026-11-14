import * as T from './vendor/three-0.180.0.mjs';
import {DOME as D,INTENTIONS,LISBON_DOME_LAYOUT as L,LISBON_DOME_STATIONS,LISBON_DOME_OBSTACLES,DOME_ROOF_PROFILE,DOME_SMOKE_OUTLET,domeRoofHeight} from './gallery-lisbon-dome-layout.mjs';
import {createDomeShellGeometry} from './gallery-lisbon-dome-shell.mjs';
import {createLisbonPavement} from './gallery-lisbon-pavement.mjs';
import {createPaperPackaging} from './gallery-paper-packaging.mjs';
import {TOTEHMPAPER} from './gallery-artworks.mjs';
import {createHigherPieceGeometry} from './gallery-higher-piece.mjs';
import {createTotehmPieceGeometry} from './gallery-totehm-piece.mjs';
import {createEmblemReliefGeometry} from './gallery-lisbon-emblem-relief.mjs';
import {createCurvedLisbonInstallation} from './gallery-curved-lisbon-installation.mjs';
import {LISBON_STREET_DISCOVER} from './lisbon-street-discover.mjs';

// The island is the public introduction. The dark glass reveals an immersive
// street-art interior; the original HTML experience owns playback and access.
export function createLisbonDome(scene,renderer,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Lisbon — black monolithic Higher dome';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),solids=[],walkable=[],interactables=[];
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 let disposed=false,dirty=true,inspecting=false,inspection=0,paperLoaded=false,emblemLoaded=false,time=0,doorTarget=0,doorAmount=0;
 const changed=()=>{if(!disposed){dirty=true;onChange();}};
 const black=material(new T.MeshPhysicalMaterial({color:0x000000,roughness:.78,metalness:.08,clearcoat:.12,clearcoatRoughness:.6,side:T.DoubleSide}));black.name='Raw black — dome and interior';
 const steel=material(new T.MeshStandardMaterial({color:0x050505,roughness:.27,metalness:.85}));
 const silver=material(new T.MeshStandardMaterial({color:0xbbc3cb,roughness:.32,metalness:.8}));
 const floorMaterial=material(black.clone());floorMaterial.roughness=.32;floorMaterial.clearcoat=.25;floorMaterial.name='Black street installation floor';
 const box=geometry(new T.BoxGeometry(1,1,1)),plane=geometry(new T.PlaneGeometry(1,1));
 function mesh(g,m,p,name,solid=false,scale=null,parent=root){const o=new T.Mesh(g,m);o.position.set(...p);if(scale)o.scale.set(...scale);o.name=name;o.castShadow=true;o.receiveShadow=true;parent.add(o);if(solid)solids.push(o);return o;}
 const block=(m,p,size,name,solid=false,parent=root)=>mesh(box,m,p,name,solid,size,parent);
 function mark(object,data){object.userData={...object.userData,...data};interactables.push({object,...data});return object;}
 function station(object,id,kind,room){return mark(object,{id,kind,room});}
 function tube(points,radius,m,name,parent=root){return mesh(geometry(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),mobile?64:112,radius,5,false)),m,[0,0,0],name,false,null,parent);}
 function texture(src,ready=()=>{}){if(!globalThis.document?.createElementNS)return null;const t=new T.TextureLoader().load(src,loaded=>{if(disposed)return;ready(loaded);changed();},undefined,changed);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer?.capabilities?.getMaxAnisotropy?.()||4);textures.add(t);return t;}
 function lettering(lines,p,width,height,name,{size=50,color='#d9d9df',parent=root}={}){
  if(!globalThis.document)return null;const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=Math.round(1600*height/width);const context=canvas.getContext('2d'),map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;textures.add(map);
  const m=material(new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide}));const o=mesh(plane,m,p,name,false,[width,height,1],parent);o.castShadow=false;
  const draw=()=>{if(disposed)return;context.clearRect(0,0,canvas.width,canvas.height);context.textAlign='center';context.textBaseline='middle';context.fillStyle=color;context.font='700 '+size+'px "Space Mono",monospace';const step=canvas.height/(lines.length+1);lines.forEach((line,n)=>context.fillText(line,canvas.width/2,(n+1)*step,canvas.width*.95));map.needsUpdate=true;changed();};draw();document.fonts?.ready?.then(draw);return o;
 }
 block(black,[0,-.38,0],[32,.44,36],'Black foundation on the original island');
 const pavement=createLisbonPavement({mobile,onChange:changed,boatCentre:[0,4]});
 const paving=new T.Shape();paving.moveTo(-16,-18);paving.lineTo(16,-18);paving.lineTo(16,18);paving.lineTo(-16,18);paving.closePath();const hole=new T.Path();
 for(let i=0;i<=128;i++){const a=-i/128*Math.PI*2,x=D.radiusX*Math.cos(a),z=D.centerZ+D.radiusZ*Math.sin(a);if(!i)hole.moveTo(x,-z);else hole.lineTo(x,-z);}paving.holes.push(hole);
 const pavingGeometry=geometry(new T.ShapeGeometry(paving));pavingGeometry.rotateX(-Math.PI/2);const terrace=mesh(pavingGeometry,pavement.material,[0,D.groundY,0],'Lisbon calçada — central original caravel',true);terrace.castShadow=false;terrace.userData.walkable=true;walkable.push(terrace);
 const floor=mesh(geometry(new T.CircleGeometry(1,mobile?96:144)),floorMaterial,[0,D.groundY,D.centerZ],'Continuous black interior floor',true,[D.radiusX,D.radiusZ,1]);floor.rotation.x=-Math.PI/2;floor.userData.walkable=true;walkable.push(floor);
 const shell=mesh(geometry(createDomeShellGeometry({mobile})),black,[0,0,0],'Raw black dome — glass entrance and smoke oculus',true);shell.userData.domeShell=true;
 const frontAt=(x,y)=>D.centerZ+D.radiusZ*Math.sqrt(Math.max(0,1-(x/D.radiusX)**2-((y-D.groundY)/D.height)**2));
 const frontZ=D.centerZ+D.radiusZ,doorZ=frontZ+.05;
 for(const x of [-D.entryHalfWidth,D.entryHalfWidth])tube(Array.from({length:25},(_,i)=>{const y=D.groundY+(D.entryHeight-D.groundY)*i/24;return[x,y,frontAt(x,y)+.015];}),.045,steel,'Black entrance reveal');
 tube(Array.from({length:49},(_,i)=>{const x=-D.entryHalfWidth+i/48*D.entryHalfWidth*2;return[x,D.entryHeight,frontAt(x,D.entryHeight)+.02];}),.045,steel,'Black portal lintel');
 const glassDoorMaterial=material(new T.MeshPhysicalMaterial({color:0x131b27,roughness:.10,metalness:.08,transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide,clearcoat:1}));
 const doorLeaves=[],doorHandles=[];
 for(const side of [-1,1]){
  const name=side<0?'left':'right',leaf=mesh(plane,glassDoorMaterial,[side*D.entryHalfWidth/2,2.36,doorZ],'Tinted glass entrance — '+name+' leaf',false,[D.entryHalfWidth,4.9,1]);
  leaf.userData={kind:'lisbon-door',id:'lisbon-door-'+name,room:2,tinted:true};interactables.push({object:leaf,...leaf.userData});doorLeaves.push(leaf);
  const handle=block(silver,[side*.18,1.3,doorZ+.06],[.025,.52,.025],'Dark glass door handle — '+name);handle.userData={kind:'lisbon-door',id:'lisbon-door-handle-'+name,room:2};interactables.push({object:handle,...handle.userData});doorHandles.push(handle);
 }
 // Collaboration identity is the facade's only emblem/signage installation.
 const facade=new T.Group();facade.name='Lisbon city collaboration facade';facade.userData.facadeCollaboration=true;root.add(facade);
 const identityZ=frontAt(0,7.15)+.35;
 let emblem;
 const emblemMap=texture('/assets/signs/lisboa_city_hall.png',loaded=>{const previous=emblem.geometry;emblem.geometry=geometry(createEmblemReliefGeometry(loaded.image,{width:2.15,depth:.18,mobile}));geometries.delete(previous);previous.dispose();emblemLoaded=true;});
 const emblemFace=material(new T.MeshStandardMaterial({map:emblemMap,color:0xffffff,transparent:true,alphaTest:.1,roughness:.4,metalness:.25,emissive:0xffffff,emissiveMap:emblemMap,emissiveIntensity:.12}));
 emblem=mesh(geometry(createEmblemReliefGeometry(null,{width:2.15,depth:.18,mobile})),[emblemFace,silver],[-2.15,7.15,identityZ],'Lisbon municipal emblem relief',false,null,facade);emblem.userData.cityHallRelief=true;
 const cross=new T.Group();cross.name='Collaboration multiplication X';cross.position.set(0,7.15,identityZ+.02);facade.add(cross);
 for(const a of [-Math.PI/4,Math.PI/4])block(silver,[0,0,0],[.12,1.25,.16],'Collaboration X stroke',false,cross).rotation.z=a;
 const paperMap=texture(TOTEHMPAPER.src,()=>{paperLoaded=true;});
 const paper=material(new T.MeshStandardMaterial({map:paperMap,color:0xffffff,roughness:.65,side:T.DoubleSide,alphaTest:.12,emissive:0xffffff,emissiveMap:paperMap,emissiveIntensity:.12}));
 const paperSides=material(new T.MeshStandardMaterial({color:0x333366,roughness:.65}));
 const identity=mesh(geometry(createTotehmPieceGeometry(1.7,.12)),[paper,paperSides],[2.12,7.15,identityZ],'TOTEHM native collaboration piece',false,null,facade);identity.userData.nativePerforations=12;
 const headingZ=frontAt(0,5.7)+.4;
 lettering(['MAKE THE LISBON STREETS'],[-.9,5.7,headingZ],7.6,.65,'MAKE THE LISBON STREETS',{size:97,parent:facade});
 const higherMap=texture('/assets/gallery/higher.svg'),higherMaterial=material(new T.MeshStandardMaterial({map:higherMap,transparent:true,alphaTest:.1,roughness:.55,emissive:0xffffff,emissiveMap:higherMap,emissiveIntensity:.18,side:T.DoubleSide}));
 mesh(geometry(createHigherPieceGeometry(2.2,.045)),[higherMaterial,paperSides],[4.2,5.7,headingZ],'Original Higher collaboration heading',false,null,facade);
 // The original seven intentions are architectural seams around the experience.
 INTENTIONS.forEach((intent,n)=>{
  const angle=(45+n*45)*Math.PI/180,ink=material(new T.MeshBasicMaterial({color:intent.color,toneMapped:false}));
  const foot=[D.radiusX*.982*Math.sin(angle),D.groundY+.018,D.centerZ+D.radiusZ*.982*Math.cos(angle)];
  const path=tube([[(n-3)*.022,D.groundY+.018,D.centerZ],foot],.009,ink,'Intention floor seam — '+intent.label);path.userData.intention=intent.id;
  const arc=Array.from({length:49},(_,i)=>{const t=Math.PI/2-i/48*Math.PI/2;return[D.radiusX*.985*Math.sin(t)*Math.sin(angle),D.groundY+D.height*.985*Math.cos(t),D.centerZ+D.radiusZ*.985*Math.sin(t)*Math.cos(angle)];});
  const meridian=tube(arc,.008,ink,'Intention dome seam — '+intent.label);meridian.userData.intention=intent.id;
 });
 const portico=new T.Group();portico.name='Sheltered exterior THP and Discover portico';root.add(portico);
 for(const side of [-1,1]){
  block(black,[side*5.3,3.45,.2],[4.8,.16,5.2],'THP canopy roof — '+(side<0?'left':'right'),true,portico);
  block(steel,[side*7.5,1.62,-1.6],[.065,3.35,.12],'Canopy rear support — '+side,false,portico);
  block(steel,[side*5.3,3.25,-1.6],[4.6,.12,.10],'Black canopy cantilever — '+side,false,portico);
  const light=new T.SpotLight(0xe4e7f0,42,7,.8,.8,2);light.position.set(side*5.1,3.25,1.1);light.target.position.set(side*5,1,1.4);portico.add(light,light.target);
 }
 const [tx,,tz]=L.counter.position;
 station(block(black,[tx,.97,tz],[3.6,.12,1.2],'Black sheltered exterior THP table',true),'thp-laboratory','thp',0);
 block(steel,[tx,.43,tz],[2.6,.94,.62],'Recessed exterior THP table support',false);
 const cases=[],caseWidth=.12;
 for(const x of [-.32,0,.32])for(const z of [-.2,.2]){
  const display=createPaperPackaging({paperMaterial:paper,geometry,material,width:caseWidth});display.rotation.x=-.6;display.position.set(tx+x,1.03+(caseWidth/2+.001)*Math.cos(.6)+(caseWidth*50/360)*Math.sin(.6),tz+z);
  display.userData.restPosition=display.position.toArray();display.userData.shelteredExterior=true;root.add(display);cases.push(display);display.traverse(part=>{if(part.isMesh)station(part,'thp-premium-case','thp',0);});
 }
 const inspectCase=cases[3],caseRest=new T.Vector3(...inspectCase.userData.restPosition);
 const glass=material(new T.MeshPhysicalMaterial({color:0xd5e5e6,roughness:.08,transparent:true,opacity:.15,depthWrite:false,side:T.DoubleSide,metalness:.12}));
 block(black,[5,1.0,1.4],[2.5,.10,.8],'Sheltered exterior analytical bench',true);block(steel,[5,.47,1.4],[1.8,1.0,.5],'Recessed exterior instrument bench support');
 function flask(x,z,scale=1){
  mesh(geometry(new T.CylinderGeometry(.038,.15,.28,24,1,true)),glass,[x,1.05+.14*scale,z],'Laboratory conical glass body',false,[scale,scale,scale]);
  mesh(geometry(new T.CylinderGeometry(.038,.038,.2,20,1,true)),glass,[x,1.05+.38*scale,z],'Laboratory glass neck',false,[scale,scale,scale]);
  mesh(geometry(new T.TorusGeometry(.039,.005,5,24)),glass,[x,1.05+.48*scale,z],'Fine glass lip',false,[scale,scale,scale]).rotation.x=Math.PI/2;
 }
 flask(4.25,1.4);flask(4.75,1.3,.8);block(steel,[5.3,1.08,1.4],[.52,.06,.4],'Analytical balance base');mesh(geometry(new T.CylinderGeometry(.12,.12,.015,24)),steel,[5.3,1.13,1.4],'Laboratory balance pan');block(glass,[5.3,1.35,1.4],[.47,.46,.36],'Clear analytical balance shield');
 for(let n=0;n<3;n++)mesh(geometry(new T.CylinderGeometry(.025,.025,.25+n*.035,14,1,true)),glass,[5.85+n*.1,1.22,1.4],'Laboratory sample tube');block(steel,[5.95,1.08,1.4],[.43,.035,.15],'Black sample-tube rack');
 // Public Discover remains outside; its complete original text opens at this
 // physical lectern, beside the sheltered paper editions and the tinted view.
 const discover=station(block(black,[-7.4,1.25,1.25],[1.3,2.5,.24],'Exterior Discover monolith',true),'lisbon-discover','lisbon-discover',undefined);
 discover.userData.href='/play_lisbon_street?discover=1';
 const discoverFace=lettering(['DISCOVER','THE LISBON STREETS','You see them everywhere,','every single day.','A Totehmpaper is your key to enter.'],[-7.4,1.3,1.39],1.18,2.2,'Discover text outside the tinted entrance',{size:63});
 if(discoverFace)mark(discoverFace,{kind:'lisbon-discover',id:'lisbon-discover-text',href:'/play_lisbon_street?discover=1'});
 const installation=createCurvedLisbonInstallation(root,{mobile,onChange:changed});
 const o=DOME_SMOKE_OUTLET,ring=Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2,x=o.x+o.radius*Math.cos(a),z=o.z+o.radiusZ*Math.sin(a);return[x,domeRoofHeight(x,z)+D.thickness+.015,z];});tube(ring,.018,steel,'Open black smoke oculus');
 for(const [p,target,power,color] of [
  [[-10,7,9],[0,6,-2],260,0xbccfff],[[10,6,8],[0,6,-2],200,0xe1ddda],[[0,8,5],[0,7,identityZ],165,0xe9e9ee],[[0,6,-6],[0,3,-12],45,0xcbd6ff]
 ]){const light=new T.SpotLight(color,power,25,.7,.8,2);light.position.set(...p);light.target.position.set(...target);root.add(light,light.target);}
 changed();
 return{root,solids,walkable,interactables,pickables:[...interactables.map(item=>item.object),...installation.pickables],artSurfaces:[],portals:[],obstacles:LISBON_DOME_OBSTACLES,
  layout:L,stations:LISBON_DOME_STATIONS,performance:installation,installation,doorLeaves,roofHeight:domeRoofHeight,roofProfile:DOME_ROOF_PROFILE,smokeOutlet:DOME_SMOKE_OUTLET,
  anchors:{counter:L.counter.position},setDay(){},setInspecting(value){inspecting=!!value;changed();},setDoorOpen(value){doorTarget=value?1:0;changed();},
  update(dt,eye,motion=true){
   if(disposed)return false;time+=Math.max(0,Math.min(Number(dt)||0,.1));let moved=false;
   const target=inspecting?1:0,next=motion?T.MathUtils.damp(inspection,target,6,Math.min(.1,dt)):target;
   if(Math.abs(next-inspection)>.0001||inspection!==target){inspection=Math.abs(next-target)<.0001?target:next;inspectCase.position.copy(caseRest).lerp(new T.Vector3(tx,1.43,tz+1.1),inspection);inspectCase.rotation.x=T.MathUtils.lerp(-.6,-.08,inspection);moved=true;}
   const nextDoor=motion?T.MathUtils.damp(doorAmount,doorTarget,5,Math.min(.1,dt)):doorTarget;
   if(Math.abs(nextDoor-doorAmount)>.0001||doorAmount!==doorTarget){doorAmount=Math.abs(nextDoor-doorTarget)<.0001?doorTarget:nextDoor;doorLeaves.forEach((leaf,n)=>{const side=n?1:-1;leaf.position.x=side*(D.entryHalfWidth/2+doorAmount*D.entryHalfWidth);doorHandles[n].position.x=side*(.18+doorAmount*D.entryHalfWidth);});moved=true;}
   const result=dirty||moved;dirty=false;return result;
  },
  diagnostics:()=>({kind:'lisbon-black-higher-dome',place:'lisbon',ready:!disposed,levels:1,blackExterior:true,blackInterior:true,rawMaterial:true,dome:true,roofHeight:D.height,realEntrance:true,entryWidth:D.entryHalfWidth*2,entryHeight:D.entryHeight,entryText:'MAKE THE LISBON STREETS HIGHER',islandPreserved:true,intentions:INTENTIONS.map(i=>({...i})),
   facade:{cityHallOnly:true,collaboration:true,cityHallRelief:emblemLoaded,totehmHoles:12,heading:'MAKE THE LISBON STREETS HIGHER',mouth:false,externalStreetSigns:0},
   door:{tinted:true,transparent:true,closed:doorAmount<.01,open:doorAmount>.99,opacity:glassDoorMaterial.opacity,amount:doorAmount},
   streetSigns:{count:22,loaded:installation.diagnostics().loaded,ready:installation.diagnostics().coverReady,outside:0,inside:22,groundMarkings:0,posts:0,originalSigns:true},
   laboratory:{black:true,scientificGlass:true,sampleTubes:3,analyticalBalance:true,outside:true,sheltered:true},
   thpCounter:{packagedPapers:cases.length,looseTabs:0,wallPapers:0,premiumSource:'/get_higher',caseWidthMetres:caseWidth,inspection,exterior:true,sheltered:true,position:L.counter.position},
   discover:{outside:true,originalSlides:LISBON_STREET_DISCOVER.length,requiresTotehmpaper:true,position:discover.position.toArray()},origins:{inDome:false,location:'orbital-vessel'},opposite:{inDome:false},
   branding:{nativeTotehmHoles:12,nativeHigherHoles:18,higherRatio:3,paperLoaded},pavement:pavement.diagnostics(),installation:installation.diagnostics(),performance:installation.diagnostics(),time,disposed}),
  dispose(){if(disposed)return;disposed=true;installation.dispose();pavement.dispose();root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();root.traverse(object=>{if(object.isLight)object.dispose?.();});root.clear();}
 };
}
