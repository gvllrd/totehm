import * as T from './vendor/three-0.180.0.mjs';
export const ORIGIN_PORTAL=Object.freeze({position:Object.freeze([0,118,-90]),radius:20,href:'/origin?arrival=1'});
// An opaque event horizon, photon ring and sheared accretion light. The
// surrounding alpha remains open to the actual galaxy behind the portal.
export function createBlackHolePortal(parent){
 const root=new T.Group();root.name='Origins — galaxy event horizon';root.position.set(...ORIGIN_PORTAL.position);parent.add(root);
 const geometry=new T.PlaneGeometry(ORIGIN_PORTAL.radius*2,ORIGIN_PORTAL.radius*2),material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,
  uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform float uTime;varying vec2 vUv;
   void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);
    float horizon=1.-smoothstep(.276,.285,r);float photon=exp(-abs(r-.292)*210.);
    vec2 q=vec2(p.x,p.y*2.55);float d=length(q);float phi=atan(q.y,q.x);
    float shear=.55+.45*sin(phi*12.+1./max(d,.1)*9.-uTime*.65);
    float disk=exp(-pow((d-.52)/.17,2.))*(.5+.5*shear);
    float lens=exp(-pow((r-.38)/.08,2.))*(.22+.16*sin(a*4.+uTime*.15));
    float fade=1.-smoothstep(.70,1.,r);float light=(photon*1.8+disk*.8+lens)*fade*(1.-horizon);
    vec3 colour=mix(vec3(.25,.43,.66),vec3(1.,.77,.42),clamp(photon+disk,0.,1.))*light;
    gl_FragColor=vec4(colour,max(horizon,clamp(light,0.,.94)));}`});
 const face=new T.Mesh(geometry,material);face.name='Black event horizon with lensed accretion disk';root.add(face);let disposed=false,time=0;
 return{root,position:root.position,update(dt,eye,motion=true){if(disposed)return false;if(eye)root.lookAt(eye);if(motion){time+=Math.max(0,Math.min(Number(dt)||0,.1));material.uniforms.uTime.value=time;}return!!motion;},
  diagnostics:()=>({kind:'origin-black-hole',position:root.position.toArray(),realPortal:true,eventHorizon:true,accretionDisk:true,destination:ORIGIN_PORTAL.href,time,disposed}),
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
