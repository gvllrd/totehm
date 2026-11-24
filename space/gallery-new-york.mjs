import * as T from './vendor/three-0.180.0.mjs';
import {createAncientStoneSurfaces} from './gallery-ancient-floor.mjs';
import {createWhiteStone} from './gallery-white-stone.mjs';
import {createLisbonArmchair} from './gallery-lisbon-lounge.mjs';
import {createPaperTable} from './gallery-paper-table.mjs';
import {NEW_YORK_LAYOUT as L,NEW_YORK_FLOOR_RECTS,NEW_YORK_GROUND_OBSTACLES,NEW_YORK_STATIONS} from './gallery-new-york-layout.mjs';

export function createNewYorkGallery(scene,renderer,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='New York — open-air stone terrace';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),solids=[],interactables=[];
 const geometry=value=>(geometries.add(value),value);
 const material=value=>(materials.add(value),value);
 const texture=value=>(textures.add(value),value);
 const anisotropy=Math.min(8,renderer?.capabilities?.getMaxAnisotropy?.()||4);
 let disposed=false,dirty=true;
 function changed(){
  if(disposed)return;
  dirty=true;
  if(renderer?.shadowMap)renderer.shadowMap.needsUpdate=true;
  onChange();
 }
 function mesh(shape,finish,position,name,parent=root){
  const object=new T.Mesh(shape,finish);
  object.position.set(...position);object.name=name;
  object.castShadow=!finish.transparent;object.receiveShadow=true;parent.add(object);
  return object;
 }
 function mark(object,kind,metadata={}){
  object.userData={...object.userData,kind,...metadata};
  interactables.push({object,kind,...metadata});return object;
 }

 const stone=createWhiteStone({mobile,anisotropy,onChange:changed});
 const floor=createAncientStoneSurfaces(root,{mobile,anisotropy,onChange:changed,weathering:'coastal',surfaces:NEW_YORK_FLOOR_RECTS});
 const foundation=mesh(geometry(new T.BoxGeometry(32.14,1.24,36.14)),floor.material,[0,-.85,-.1],'Cut limestone edge below the old paving');
 foundation.castShadow=false;
 solids.push(...floor.solids);
 const seat=createLisbonArmchair(root,{layout:L.seat,geometry,material,texture,mark,seats:2});
 solids.push(...seat.pickables);
 const paperTable=createPaperTable(root,{layout:L,stone,geometry,material,texture,mesh,mark,solids,anisotropy,onChange:changed});
 const lid=paperTable.paperAttache.root.getObjectByName('Raised saddle-stitched leather lining');
 if(lid)mark(lid,'totehmpaper',{paper:paperTable.cases[0]});
 const lamps=[];
 for(const [position,color,power] of [[[-2.4,2.82,4.5],0xffd2aa,25],[[2.4,3.4,2.5],0xb1c6ef,16]]){
  const light=new T.SpotLight(color,power,11,.68,.78,2);
  light.position.set(...position);light.target.position.set(0,.55,4.66);root.add(light,light.target);lamps.push(light);
 }
 changed();

 return{
  root,solids,walkable:floor.solids,interactables,pickables:interactables.map(item=>item.object),
  artSurfaces:[],portals:[],obstacles:NEW_YORK_GROUND_OBSTACLES,layout:L,stations:NEW_YORK_STATIONS,
  seat,cases:paperTable.cases,paperAttache:paperTable.paperAttache,table:paperTable.table,
  roofHeight:()=>Infinity,openAir:true,setDay(){},setInspecting(){},
  update(){const result=!disposed&&dirty;dirty=false;return result;},
  diagnostics:()=>({
   kind:'new-york-open-air-lounge',place:'new-york',ready:!disposed,openAir:true,levels:1,
   building:false,glassRoof:false,glassSides:false,ruins:false,walls:0,legacyArtworkPickables:0,
   flooring:{continuousStone:true,exterior:'ancient-stone',ancientStone:floor.diagnostics()},
   seat:{leather:true,brown:true,seats:2,position:seat.position,eye:seat.eye,target:seat.target,fov:seat.fov},
   thpCounter:paperTable.diagnostics(),paperLoaded:paperTable.loaded,disposed
  }),
  dispose(){
   if(disposed)return;disposed=true;
   paperTable.dispose();floor.dispose();stone.dispose();
   for(const light of lamps)light.dispose();
   for(const value of geometries)value.dispose();
   for(const value of materials)value.dispose();
   for(const value of textures)value.dispose();
   root.removeFromParent();root.clear();
  }
 };
}
