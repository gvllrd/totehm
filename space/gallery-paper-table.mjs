import * as T from './vendor/three-0.180.0.mjs';
import {createPaperEdition,createPaperPackaging,PAPER_CASE_FACE_RATIO} from './gallery-paper-packaging.mjs';
import {createLisbonPaperAttache} from './gallery-lisbon-paper-attache.mjs';

export function roundedRectangle(width,depth,radius){
 const x=width/2,y=depth/2,shape=new T.Shape();
 shape.moveTo(-x+radius,-y);
 shape.lineTo(x-radius,-y);shape.quadraticCurveTo(x,-y,x,-y+radius);
 shape.lineTo(x,y-radius);shape.quadraticCurveTo(x,y,x-radius,y);
 shape.lineTo(-x+radius,y);shape.quadraticCurveTo(-x,y,-x,y-radius);
 shape.lineTo(-x,-y+radius);shape.quadraticCurveTo(-x,-y,-x+radius,-y);
 shape.closePath();return shape;
}

export function createPaperTable(root,{layout,stone,geometry,material,texture,mesh,mark,solids,anisotropy,onChange}){
 const [tableX,top,tableZ]=layout.counter.position;
 const table=new T.Group();table.name='Low hotel coffee table carved in antique limestone';table.position.set(tableX,0,tableZ);root.add(table);
 const slabShape=roundedRectangle(...layout.counter.size,.095);
 const slab=mesh(geometry(new T.ExtrudeGeometry(slabShape,{depth:.122,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:3,curveSegments:8})),stone.material,[0,top-.14,0],'Heavily rounded antique limestone tabletop',table);
 slab.rotation.x=-Math.PI/2;solids.push(slab);
 for(const x of [-.741,.741]){
  const footing=roundedRectangle(.43,.74,.062);
  const leg=mesh(geometry(new T.ExtrudeGeometry(footing,{depth:.43,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,curveSegments:8})),stone.material,[x,layout.groundY+.012,0],'Recessed carved limestone leg',table);
  leg.rotation.x=-Math.PI/2;solids.push(leg);
 }

 const paperAttache=createLisbonPaperAttache(root,{
  layout:layout.paperAttache,casePositions:layout.paperCases,top,roundedRectangle,geometry,material,texture,mesh,anisotropy
 });
 solids.push(...paperAttache.occluders);
 const edition=createPaperEdition({anisotropy,onChange});
 let disposed=false,paperLoaded=false;
 edition.ready.then(loaded=>{
  if(disposed)return;
  paperLoaded=loaded;
  paperAttache.applyHigher(edition.badgeMaterial.map?.image);
  onChange();
 });
 const [attacheX,attacheZ]=layout.paperAttache.position,caseWidth=layout.paperCaseWidth;
 const pickArea=geometry(new T.PlaneGeometry(.092,.086)),pickMaterial=material(new T.MeshBasicMaterial({visible:false,side:T.DoubleSide}));
 const cases=layout.paperCases.map(({position:[x,z],angle},index)=>{
  const box=createPaperPackaging({...edition,geometry,material,width:caseWidth});
  const depth=caseWidth*50/180;
  const base=layout.paperAttache.cradleHeight+Math.abs(Math.sin(angle))*caseWidth/2+Math.cos(angle)*depth/2+.002;
  box.position.set(x-attacheX,base,z-attacheZ);box.rotation.x=angle;paperAttache.root.add(box);
  const front=box.getObjectByName('Original clear premium case glass');
  const hitArea=mesh(pickArea,pickMaterial,[0,0,front.position.z+.001],'TotehmPaper click area',box);
  hitArea.castShadow=false;hitArea.receiveShadow=false;
  const item={root:box,front,width:caseWidth,index,href:'/get_higher?paper=1'};
  box.traverse(object=>{if(object.isMesh)mark(object,'totehmpaper',{paper:item});});
  return item;
 });
 return{table,paperAttache,cases,
  get loaded(){return paperLoaded;},
  diagnostics:()=>({tables:1,low:true,antiqueLimestone:true,size:layout.counter.size,height:top,packagedPapers:cases.length,caseWidthMetres:caseWidth,
   attache:paperAttache.diagnostics(),paperWidthMetres:caseWidth*PAPER_CASE_FACE_RATIO,signed:cases.every(item=>!!item.root.userData.signature),
   premiumSource:'/get_higher',position:layout.counter.position,chemistryEquipment:0}),
  dispose(){if(!disposed){disposed=true;edition.dispose();}}
 };
}
