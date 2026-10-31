// Exercise the new built geometry and its actual shared movement engine.
import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createModernGallery} from '../../space/gallery-modern.mjs';
import {createNewYorkGallery} from '../../space/gallery-new-york.mjs';
import {createModernPhysics,createModernWalkway} from '../../space/gallery-modern-navigation.mjs';
import {createNewYorkPhysics,createNewYorkWalkway} from '../../space/gallery-new-york-navigation.mjs';
import {GALLERY_LAYOUT as L,GALLERY_STATIONS} from '../../space/gallery-modern-layout.mjs';
import {GLASS_SHELL,glassRoofHeight} from '../../space/gallery-glass-shell.mjs';
import {createCastleFabric} from '../../space/gallery-castle-fabric.mjs';
import {castleFabricPlan} from '../../space/gallery-castle-plan.mjs';

let checks=0;
const check=(value,message)=>{assert(value,message);checks++;};
for(const [place,factory,physicsFactory,walkwayFactory] of [
 ['lisbon',createModernGallery,createModernPhysics,createModernWalkway],
 ['new-york',createNewYorkGallery,createNewYorkPhysics,createNewYorkWalkway]
]){
 const fabricScene=new T.Scene(),fabric=createCastleFabric(fabricScene,{place});fabricScene.updateMatrixWorld(true);
 for(const arch of castleFabricPlan(place).arches){
  const origin=arch.axis==='x'?new T.Vector3(arch.centre,1.65,arch.fixed+arch.depth/2+.7):new T.Vector3(arch.fixed+arch.depth/2+.7,1.65,arch.centre);
  const direction=arch.axis==='x'?new T.Vector3(0,0,-1):new T.Vector3(-1,0,0);
  const ray=new T.Raycaster(origin,direction,0,arch.depth+1.4);
  check(ray.intersectObjects(fabric.solids).length===0,'The '+place+' '+arch.id+' is a real full-depth arch opening');
 }
 fabric.dispose();
 const scene=new T.Scene(),gallery=factory(scene,null,{mobile:false});scene.updateMatrixWorld(true);
 const d=gallery.diagnostics();
 check(d.levels===1,'The '+place+' rebuild is one open double-height gallery');
 check(gallery.solids.length>0,'The '+place+' building has real collision geometry');
 const ray=new T.Raycaster(new T.Vector3(0,1.65,3),new T.Vector3(0,0,-1),0,8);
 check(ray.intersectObjects(gallery.solids).filter(h=>!h.object.material.transparent).length===0,'The '+place+' castle entrance is a genuine empty passage');
 let vertices=0;
 gallery.root.traverse(object=>{
  const p=object.geometry?.attributes.position;if(!p)return;
  for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)),place+' has finite built vertices');
  vertices+=p.count;
 });
 check(vertices>1000,'The '+place+' structure is built geometry rather than a façade picture');
 const nav=walkwayFactory(),body=physicsFactory({x:L.entry[0],z:L.entry[2]});
 const eye=()=>({x:body.position.x,y:body.position.y+L.eyeHeight,z:body.position.z});
 const destinations=[...GALLERY_STATIONS.map(s=>({id:s.id,x:s.approach[0],z:s.approach[2]})),{id:'fire',x:L.fireplace.approach[0],z:L.fireplace.approach[2]},{id:'outside',x:L.entry[0],z:L.entry[2]}];
 for(const destination of destinations){
  const route=nav.route(eye(),{...destination,y:1.65});
  check(route&&route.length>=2,'A '+place+' route exists to '+destination.id);
  for(const point of route.slice(1)){
   for(let i=0;i<1200&&Math.hypot(body.position.x-point.x,body.position.z-point.z)>.002;i++){
    const dx=point.x-body.position.x,dz=point.z-body.position.z,length=Math.hypot(dx,dz),stride=Math.min(.7,length);
    body.step(.05,{dx:dx/length*stride,dz:dz/length*stride,guided:true});
    assert(body.diagnostics().grounded,place+' guidance remains supported');
   }
   check(Math.hypot(body.position.x-point.x,body.position.z-point.z)<.003,'Real '+place+' movement reaches every collision-free waypoint toward '+destination.id);
  }
  check(Math.abs(body.position.y-L.groundY)<.00001,'The '+place+' visit stays on its physical castle floor');
 }
 const jump=physicsFactory({x:0,z:-7});check(jump.jump(),'Intentional jump starts inside '+place);
 let peak=-Infinity;
 for(let i=0;i<480;i++){jump.step(1/120);peak=Math.max(peak,jump.position.y+L.eyeHeight);}
 check(jump.diagnostics().grounded&&jump.diagnostics().headContacts>0,'The '+place+' glass roof stops an actual high-speed jump');
 check(peak<=glassRoofHeight(0,-7)+.025,'The '+place+' roof collision matches the sloped rendered glass');
 const side=physicsFactory({x:10,z:-8});for(let i=0;i<100;i++)side.step(.025,{dx:1});
 check(side.position.x<13,'The '+place+' perimeter blocks a walking body');
 gallery.dispose();gallery.dispose();check(scene.children.length===0,'The '+place+' rebuild disposes its full structure repeatably');
}
check(GLASS_SHELL.maxHeight-GLASS_SHELL.minHeight>1,'The clear roof has a deliberate asymmetric inclination');
console.log('PASS '+checks+' rebuilt castle geometry and movement checks');
