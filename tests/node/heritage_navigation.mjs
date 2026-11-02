// The rebuilt castle's stone openings and crowns are physical geometry.
import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createCastleFabric} from '../../space/gallery-castle-fabric.mjs';
import {castleFabricPlan} from '../../space/gallery-castle-plan.mjs';
import {createModernPhysics} from '../../space/gallery-modern-navigation.mjs';
import {GALLERY_LAYOUT as L} from '../../space/gallery-modern-layout.mjs';

let checks=0;
const check=(value,message)=>{assert(value,message);checks++;};
for(const place of ['lisbon','new-york']){
 const plan=castleFabricPlan(place),scene=new T.Scene(),fabric=createCastleFabric(scene,{place});scene.updateMatrixWorld(true);
 for(const arch of plan.arches){
  const onX=arch.axis==='x',start=onX?{x:arch.centre,z:arch.fixed+arch.depth/2+.6}:{x:arch.fixed+arch.depth/2+.6,z:arch.centre};
  const body=createModernPhysics(start,plan.obstacles);
  for(let i=0;i<120;i++)body.step(.025,onX?{dz:-.025}:{dx:-.025});
  const end=onX?body.position.z:body.position.x;
  check(end<arch.fixed-arch.depth/2-.3,'The full visitor body crosses the '+place+' '+arch.id+' through its real opening');
  check(body.diagnostics().grounded&&Math.abs(body.position.y-L.groundY)<1e-7,'The deep arch retains continuous ground support');
  const inside=onX?{x:arch.centre,z:arch.fixed}:{x:arch.fixed,z:arch.centre};
  const jump=createModernPhysics(inside,plan.obstacles);check(jump.jump(),'A jump begins inside the actual arch');let head=-Infinity;
  for(let i=0;i<240;i++){jump.step(1/120);head=Math.max(head,jump.position.y+L.eyeHeight);}
  check(jump.diagnostics().headContacts===1&&jump.diagnostics().grounded,'The curved stone crown intercepts a high-speed jump and returns the body to the ground');
  check(head<=arch.spring+arch.radius+.001&&head>arch.spring+.2,'Arch headroom follows its curve instead of an opaque rectangular lintel');
 }
 const wall=plan.walls.find(w=>w.id==='castle-front-east'),section=wall.sections[0],x=(section[0]+section[1])/2;
 const body=createModernPhysics({x,z:0},plan.obstacles);for(let i=0;i<160;i++)body.step(.025,{dz:-.05});
 check(body.position.z>=wall.fixed+wall.depth/2+.18-1e-5,'The metre-thick surviving curtain wall blocks a walking body');
 const fall=createModernPhysics({x,z:wall.fixed,y:section[2]+.6},plan.obstacles);for(let i=0;i<240;i++)fall.step(1/120);
 check(fall.diagnostics().grounded&&Math.abs(fall.position.y-section[2])<1e-6,'The broken stone crown supports a falling visitor at its own rendered height');
 const ray=new T.Raycaster(new T.Vector3(x,section[2]+.6,wall.fixed),new T.Vector3(0,-1,0),0,1);
 check(ray.intersectObjects(fabric.solids).some(h=>Math.abs(h.point.y-section[2])<.05),'A real raycast finds stone at the analytic wall support');
 fabric.dispose();check(scene.children.length===0,'The complete retained castle releases its geometry');
}
console.log('PASS '+checks+' rebuilt castle masonry navigation checks');
