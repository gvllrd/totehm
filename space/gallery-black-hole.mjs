import * as T from './vendor/three-0.180.0.mjs';
export const ORIGIN_PORTAL=Object.freeze({position:Object.freeze([0,118,-90]),radius:20,href:'/origin?arrival=1'});
// An unadorned black opening against the galaxy: no ring or illuminated rim.
export function createBlackHolePortal(parent,{position=ORIGIN_PORTAL.position,href=ORIGIN_PORTAL.href}={}){
 const root=new T.Group();root.name='Origins — galaxy event horizon';root.position.set(...position);parent.add(root);
 const geometry=new T.CircleGeometry(ORIGIN_PORTAL.radius*.285,128),material=new T.MeshBasicMaterial({color:0x000000,side:T.DoubleSide,toneMapped:false});
 const face=new T.Mesh(geometry,material);face.name='Plain black event horizon';root.add(face);let disposed=false,time=0;
 return{root,position:root.position,update(dt,eye,motion=true){if(disposed)return false;if(eye)root.lookAt(eye);if(motion){time+=Math.max(0,Math.min(Number(dt)||0,.1));}return!!motion;},
  diagnostics:()=>({kind:'origin-black-hole',position:root.position.toArray(),realPortal:true,eventHorizon:true,accretionDisk:false,decorativeRings:false,destination:href,time,disposed}),
  dispose(){if(disposed)return;disposed=true;geometry.dispose();material.dispose();root.removeFromParent();root.clear();}};
}

// A physical, restrained windshield surround remains in the passenger's
// foreground during flight; the event horizon stays completely unobstructed.
export function createSaucerCockpit(camera){
 const root=new T.Group();root.name='Saucer passenger windshield';camera.add(root);root.visible=false;
 const g=new T.BoxGeometry(1,1,1),black=new T.MeshBasicMaterial({color:0x020204,toneMapped:false}),trim=new T.MeshBasicMaterial({color:0x6b7d9c,transparent:true,opacity:.42,toneMapped:false});
 function bar(x,y,z,w,h,d,m){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(w,h,d);root.add(o);return o;}
 bar(0,-.76,-1.18,2.0,.16,.12,black);bar(0,-.679,-1.17,1.9,.003,.01,trim);
 for(const side of [-1,1]){const p=bar(side*.95,-.50,-1.18,.055,.65,.09,black);p.rotation.z=side*-.19;const line=bar(side*.924,-.50,-1.16,.003,.60,.01,trim);line.rotation.z=side*-.19;}
 return{root,update(visible,aspect){const changed=root.visible!==visible||root.scale.x!==aspect;root.visible=visible;root.scale.x=aspect;return changed;},dispose(){root.removeFromParent();g.dispose();black.dispose();trim.dispose();root.clear();}};
}
