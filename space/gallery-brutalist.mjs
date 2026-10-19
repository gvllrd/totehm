import * as T from './vendor/three-0.180.0.mjs';
import {createAtmosphere} from './gallery-atmosphere.mjs';
import {createReflection} from './gallery-reflection.mjs';
import {buildCourtyards} from './gallery-courtyards.mjs';
import {buildPavilions} from './gallery-pavilions.mjs';

// The reference is a montage of four places. Each is a real, navigable set;
// changing location follows its cuts rather than inventing a connected floorplan.
export function createBrutalist(scene,renderer,{lisbonPreview,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Coastal brutalist reference reconstruction';scene.add(root);
 const atmosphere=createAtmosphere(scene,renderer);root.add(atmosphere.root);
 const reflection=createReflection(scene,renderer,{mobile:innerWidth<650,parent:root});
 let dirty=true,disposed=false,revision=0,lastReflection='';
 const invalidate=()=>{dirty=true;revision++;onChange();};
 const context={materials:atmosphere.materials,waterSurface:(...args)=>reflection.horizontal(...args),lisbonPreview,onChange:invalidate};
 const courtyards=buildCourtyards(context),pavilions=buildPavilions(context),stages=[...courtyards,...pavilions];
 const solids=new Map();let current=stages[0];
 for(const stage of stages){
  root.add(stage.root);stage.root.visible=stage===current;
  const items=[];
  stage.root.traverse(object=>{
   if(!object.isMesh)return;
   const mats=Array.isArray(object.material)?object.material:[object.material];
   if(!object.userData.reflectiveSurface&&mats.every(m=>!m.transparent)){
    object.castShadow=true;object.receiveShadow=true;items.push(object);
   }
  });
  solids.set(stage.id,items);
 }
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 function setLocation(id){
  const next=stages.find(stage=>stage.id===id);if(!next)return null;
  current=next;for(const stage of stages)stage.root.visible=stage===next;
  reflection.setHeight(next.waterHeight??-.06);renderer.shadowMap.needsUpdate=true;
  invalidate();return next.view;
 }
 return {
  root,
  get location(){return current.id;},get portals(){return current.portals;},
  get locations(){return stages.map(stage=>({id:stage.id,name:stage.name,view:stage.view}));},
  get pickables(){return [...current.portals.flatMap(portal=>portal.pickables),...solids.get(current.id)];},
  setLocation,
  setVisible(value){root.visible=!!value;if(value){dirty=true;renderer.shadowMap.needsUpdate=true;}},
  update(dt,eye,motion){
   if(disposed||!root.visible)return false;
   if(atmosphere.update(dt,eye,motion))dirty=true;
   if(current.update?.(dt,eye,motion))dirty=true;
   const result=dirty;dirty=false;return result;
  },
  afterRender(camera,{time=0,changed=false}={}){
   if(disposed||!root.visible)return false;
   // Main render first: it creates the static shadow map. Reflections reuse it
   // and restore the renderer state, at an independent bounded frame rate.
   const signature=[current.id,revision,atmosphere.diagnostics().time,
    ...camera.matrixWorld.elements,...camera.projectionMatrix.elements].join(',');
   if(signature===lastReflection)return false;
   if(reflection.update(camera,{time,enabled:true,dirty:true}))lastReflection=signature;
   // A new texture needs one more main frame. A throttled capture stays
   // pending, but the resulting display frame does not request another mirror.
   return true;
  },
  invalidate,
  diagnostics:()=>({kind:'video reference reconstruction',visible:root.visible,location:current.id,
   locations:stages.map(stage=>stage.id),time:atmosphere.diagnostics().time,day:false,hour:19,
   portals:current.portals.map(({room,x,z,width})=>({room,x,z,width})),
   atmosphere:atmosphere.diagnostics(),reflection:reflection.diagnostics(),architecture:current.diagnostics?.(),
   reference:{duration:25.333,shots:4,source:'user video',reconstructed:true,original3D:false}}),
  dispose(){if(disposed)return;disposed=true;root.visible=false;courtyards[0].dispose?.();pavilions.dispose?.();reflection.dispose();atmosphere.dispose();root.removeFromParent();}
 };
}
