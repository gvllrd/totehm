import * as T from './vendor/three-0.180.0.mjs';
import {createLisbonPavement} from './gallery-lisbon-pavement.mjs';
import {createWhiteStone} from './gallery-white-stone.mjs';
import {createPaperEdition,createPaperPackaging,PAPER_CASE_FACE_RATIO} from './gallery-paper-packaging.mjs';
import {createLisbonHologram} from './gallery-lisbon-hologram.mjs';
import {createLisbonPaperAttache} from './gallery-lisbon-paper-attache.mjs';
import {createLisbonArmchair} from './gallery-lisbon-lounge.mjs';
import {createLisbonController} from './gallery-lisbon-controller.mjs';
import {LISBON_URBEX_LAYOUT as L,LISBON_URBEX_STATIONS,LISBON_URBEX_FURNITURE} from './gallery-lisbon-urbex-layout.mjs';

function roundedRectangle(width,depth,radius){
 const x=width/2,y=depth/2,shape=new T.Shape();
 shape.moveTo(-x+radius,-y);
 shape.lineTo(x-radius,-y);shape.quadraticCurveTo(x,-y,x,-y+radius);
 shape.lineTo(x,y-radius);shape.quadraticCurveTo(x,y,x-radius,y);
 shape.lineTo(-x+radius,y);shape.quadraticCurveTo(-x,y,-x,y-radius);
 shape.lineTo(-x,-y+radius);shape.quadraticCurveTo(-x,-y,-x+radius,-y);
 shape.closePath();return shape;
}

function paintControllerShadow(shape){
 if(!globalThis.document)return null;
 const canvas=document.createElement('canvas');canvas.width=192;canvas.height=148;
 const context=canvas.getContext('2d');
 shape.getPoints(14).forEach(({x,y},index)=>{
  const px=(.5+x/1.25)*canvas.width,py=(.5-y/.96)*canvas.height;
  if(index===0)context.moveTo(px,py);else context.lineTo(px,py);
 });
 context.closePath();context.filter='blur(5px)';context.fillStyle='rgba(10,14,20,.44)';context.fill();
 return new T.CanvasTexture(canvas);
}

export function createLisbonUrbexGallery(scene,renderer,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Lisbon — an open-air salon above the drowned city';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set();
 const solids=[],walkable=[],interactables=[];
 const geometry=value=>(geometries.add(value),value);
 const material=value=>(materials.add(value),value);
 const texture=value=>(textures.add(value),value);
 const anisotropy=Math.min(8,renderer?.capabilities?.getMaxAnisotropy?.()||4);
 let disposed=false,dirty=true,paperLoaded=false;
 function changed(){
  if(disposed)return;
  dirty=true;
  if(renderer?.shadowMap)renderer.shadowMap.needsUpdate=true;
  onChange();
 }
 function mesh(shape,finish,position,name,parent=root){
  const object=new T.Mesh(shape,finish);
  object.position.set(...position);object.name=name;object.castShadow=!finish.transparent;
  object.receiveShadow=true;parent.add(object);return object;
 }
 function mark(object,kind,metadata={}){
  object.userData={...object.userData,kind,...metadata};
  interactables.push({object,kind,...metadata});return object;
 }
 const pavement=createLisbonPavement({mobile,anisotropy,boatCentre:L.pavement.boatCentre,onChange:changed});
 const outline=roundedRectangle(...L.pavement.size,.53);
 const floor=mesh(geometry(new T.ShapeGeometry(outline,12)),pavement.material,[0,L.groundY,L.pavement.z],'One continuous Lisbon calçada with the caravel mosaic');
 floor.rotation.x=-Math.PI/2;floor.castShadow=false;floor.userData.walkable=true;
 solids.push(floor);walkable.push(floor);
 const edge=material(new T.MeshStandardMaterial({color:0x292927,roughness:.91}));
 const apron=mesh(geometry(new T.ExtrudeGeometry(outline,{depth:.38,bevelEnabled:false,curveSegments:12})),edge,[0,L.groundY-.384,L.pavement.z],'Dark limestone edge of the island paving');
 apron.rotation.x=-Math.PI/2;apron.castShadow=false;

 const stone=createWhiteStone({mobile,anisotropy,onChange:changed});
 const [tableX,top,tableZ]=L.counter.position;
 const table=new T.Group();table.name='Low hotel coffee table carved in antique limestone';table.position.set(tableX,0,tableZ);root.add(table);
 const slabShape=roundedRectangle(...L.counter.size,.095);
 const slab=mesh(geometry(new T.ExtrudeGeometry(slabShape,{depth:.122,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:3,curveSegments:8})),stone.material,[0,top-.14,0],'Heavily rounded antique limestone tabletop',table);
 slab.rotation.x=-Math.PI/2;solids.push(slab);
 for(const x of [-.741,.741]){
  const footing=roundedRectangle(.43,.74,.062);
  const leg=mesh(geometry(new T.ExtrudeGeometry(footing,{depth:.43,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,curveSegments:8})),stone.material,[x,L.groundY+.012,0],'Recessed carved limestone leg',table);
  leg.rotation.x=-Math.PI/2;solids.push(leg);
 }

 const paperAttache=createLisbonPaperAttache(root,{
  layout:L.paperAttache,casePositions:L.paperCases,top,roundedRectangle,geometry,material,texture,mesh,anisotropy
 });
 solids.push(...paperAttache.occluders);
 const edition=createPaperEdition({anisotropy,onChange:changed});
 edition.ready.then(loaded=>{
  if(disposed)return;
  paperLoaded=loaded;
  paperAttache.applyHigher(edition.badgeMaterial.map?.image);
  changed();
 });
 const [attacheX,attacheZ]=L.paperAttache.position,caseWidth=L.paperCaseWidth;
 const pickArea=geometry(new T.PlaneGeometry(.092,.086)),pickMaterial=material(new T.MeshBasicMaterial({visible:false,side:T.DoubleSide}));
 const cases=L.paperCases.map(({position:[x,z],angle},index)=>{
  const box=createPaperPackaging({...edition,geometry,material,width:caseWidth});
  const depth=caseWidth*50/180;
  const base=L.paperAttache.cradleHeight+Math.abs(Math.sin(angle))*caseWidth/2+Math.cos(angle)*depth/2+.002;
  box.position.set(x-attacheX,base,z-attacheZ);box.rotation.x=angle;paperAttache.root.add(box);
  const front=box.getObjectByName('Original clear premium case glass');
  const hitArea=mesh(pickArea,pickMaterial,[0,0,front.position.z+.001],'TotehmPaper click area',box);
  hitArea.castShadow=false;hitArea.receiveShadow=false;
  const item={root:box,front,width:caseWidth,index,href:'/get_higher?paper=1'};
  box.traverse(object=>{if(object.isMesh)mark(object,'lisbon-paper',{paper:item});});
  return item;
 });
 const controller=createLisbonController({width:L.controller.width,mobile,onChange:changed});
 const [controllerX,controllerZ]=L.controller.position;
 root.add(controller.root);
 controller.root.position.set(controllerX,0,controllerZ);
 controller.root.rotation.set(L.controller.tablePitch,L.controller.tableYaw,0,'YXZ');
 const lowest=new T.Box3().setFromObject(controller.root,true).min.y;
 controller.root.position.y=top-lowest+.0005;
 controller.root.updateWorldMatrix(true,true);
 // Short rubber feet keep the angled housing seated on the stone.
 const supportMaterial=material(new T.MeshStandardMaterial({color:0x09090a,roughness:.73}));
 const upward=new T.Raycaster(new T.Vector3(),new T.Vector3(0,1,0),0,.22);
 const axisY=new T.Vector3(0,1,0),controllerWidth=L.controller.width;
 const controllerFeet=[];
 for(const side of [-1,1]){
  const foot=new T.Vector3(side*.39*controllerWidth,0,.275*controllerWidth).applyAxisAngle(axisY,L.controller.tableYaw);
  foot.add(new T.Vector3(controllerX,top,controllerZ));
  upward.ray.origin.copy(foot);
  const base=upward.intersectObject(controller.root,true).find(hit=>hit.object.material?.visible&&hit.object.material.side!==T.BackSide);
  if(base?.distance>0){
   foot.y+=base.distance/2;
   controllerFeet.push(mesh(geometry(new T.CylinderGeometry(.022*controllerWidth,.027*controllerWidth,base.distance,20)),supportMaterial,foot.toArray(),'Controller rubber foot'));
  }
 }
 const contact=paintControllerShadow(controller.hitSurface.geometry.parameters.shapes);
 if(contact){
  const shadow=mesh(geometry(new T.PlaneGeometry(1.25*controllerWidth,.96*controllerWidth)),
   material(new T.MeshBasicMaterial({map:texture(contact),transparent:true,depthWrite:false,toneMapped:false})),
   [controllerX,top+.0006,controllerZ],'Controller contact shadow');
  shadow.rotation.set(-Math.PI/2,L.controller.tableYaw,0,'YXZ');shadow.receiveShadow=false;
 }
 const controllerAim=controller.root.localToWorld(new T.Vector3(0,controller.root.userData.faceCorners[0][1],0)).toArray();
 const seat=createLisbonArmchair(root,{layout:L.seat,geometry,material,texture,mark});
 solids.push(...seat.pickables);
 const installation=createLisbonHologram(root,{mobile,onChange:changed});

 // Small local pools make the leather and the glass cases legible under the open sky.
 const lights=[];
 function spot(color,intensity,position,target,angle){
  const light=new T.SpotLight(color,intensity,9,angle,.65,2);
  light.position.set(...position);light.target.position.set(...target);
  lights.push(light);root.add(light,light.target);
 }
 spot(0xffd3aa,23,[-2,2.7,2.2],[0,.72,1.85],.69);
 spot(0xaabdeb,19,[2.9,3.8,-.8],[.2,.6,2.55],.63);
 spot(0xe2efff,3.75,[1.10,1.58,2.12],[controllerX,.58,controllerZ],.33);
 changed();

 return{
  root,solids,walkable,interactables,
  pickables:[...interactables.map(item=>item.object),...controller.pickables,...installation.pickables],
  artSurfaces:[],portals:[],obstacles:LISBON_URBEX_FURNITURE,
  layout:L,stations:LISBON_URBEX_STATIONS,performance:installation,installation,
  table,seat,cases,paperAttache,controller,roofHeight:()=>Infinity,openAir:true,
  setDay(){},setInspecting(){},
  update(){const result=!disposed&&dirty;dirty=false;return result;},
  diagnostics:()=>({
   kind:'lisbon-open-air-lounge',ready:!disposed,place:'lisbon',openAir:true,
   walls:0,facade:false,roof:false,azulejos:false,ruins:false,islandPreserved:true,levels:1,
   floor:{surfaces:1,material:'lisbon-calcada',caravel:true},
   pavement:pavement.diagnostics(),stone:stone.diagnostics(),
   seat:{leather:true,brown:true,position:seat.position,eye:seat.eye,target:seat.target,fov:seat.fov},
   thpCounter:{tables:1,low:true,antiqueLimestone:true,size:L.counter.size,height:top,packagedPapers:cases.length,caseWidthMetres:caseWidth,attache:paperAttache.diagnostics(),paperWidthMetres:caseWidth*PAPER_CASE_FACE_RATIO,signed:cases.every(item=>!!item.root.userData.signature),premiumSource:'/get_higher',position:L.counter.position,chemistryEquipment:0},
   controller:{...controller.diagnostics(),tablePitch:L.controller.tablePitch,tableYaw:L.controller.tableYaw,contactShadow:!!contact,feet:controllerFeet.length,tableAim:controllerAim},streetSigns:{count:0,experience:22},paperLoaded,
   performance:installation.diagnostics(),installation:installation.diagnostics(),disposed
  }),
  dispose(){
   if(disposed)return;disposed=true;
   controller.dispose();installation.dispose();stone.dispose();pavement.dispose();edition.dispose();
   for(const light of lights)light.dispose();
   for(const value of geometries)value.dispose();
   for(const value of materials)value.dispose();
   for(const value of textures)value.dispose();
   root.removeFromParent();root.clear();
  }
 };
}
