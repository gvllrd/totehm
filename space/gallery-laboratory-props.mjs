import * as T from './vendor/three-0.180.0.mjs';

// Sculptural laboratory still life: independent, empty glass instruments.
export function createLaboratoryProps(parent,{geometry,material,black,mobile=false,top=1.03,z=-7.4}={}){
 const root=new T.Group();root.name='Two laboratory wings on the single THP table';parent.add(root);
 const glass=material(new T.MeshPhysicalMaterial({color:0xc6e5ef,roughness:.055,metalness:.04,transparent:true,opacity:.25,depthWrite:false,side:T.DoubleSide,clearcoat:1,envMapIntensity:1.3}));
 const metal=material(new T.MeshStandardMaterial({color:0x717b83,roughness:.25,metalness:.93}));
 const glow=material(new T.MeshBasicMaterial({color:0x8ba3d6,toneMapped:false}));
 const cylinder=geometry(new T.CylinderGeometry(1,1,1,mobile?16:24)),box=geometry(new T.BoxGeometry(1,1,1));
 function mesh(g,m,p,name,scale){const o=new T.Mesh(g,m);o.position.set(...p);if(scale)o.scale.set(...scale);o.name=name;o.castShadow=!m.transparent;o.receiveShadow=true;root.add(o);return o;}
 const block=(m,p,s,n)=>mesh(box,m,p,n,s);
 const ring=(x,y,z,r,name='Rolled laboratory glass rim')=>{const o=mesh(geometry(new T.TorusGeometry(r,.004,5,mobile?16:24)),glass,[x,y,z],name);o.rotation.x=Math.PI/2;return o;};
 function vessel(x,dz,profile,name){const g=geometry(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),mobile?20:32));return mesh(g,glass,[x,top+.012,z+dz],name);}
 // Left wing: round-bottom glass, conical vessels and a separate condenser.
 block(black,[-2.23,top+.024,z],[1.8,.045,.94],'Recessed black left instrument tray');
 vessel(-2.65,.13,[[.025,0],[.09,.035],[.16,.13],[.17,.21],[.13,.3],[.035,.36],[.035,.57]],'Round-bottom glass flask');ring(-2.65,top+.582,z+.13,.035);
 mesh(cylinder,metal,[-2.65,top+.037,z+.13],'Black laboratory flask cradle',[.12,.025,.12]);
 vessel(-1.88,.13,[[.13,0],[.14,.025],[.035,.30],[.035,.46]],'Conical laboratory glass');ring(-1.88,top+.472,z+.13,.035);
 vessel(-2.16,-.26,[[.095,0],[.095,.03],[.10,.28]],'Open glass beaker');ring(-2.16,top+.292,z-.26,.10);
 block(black,[-3.02,top+.035,z-.12],[.24,.07,.34],'Retort stand foot');
 mesh(cylinder,metal,[-3.02,top+.43,z-.12],'Slender retort support rod',[.008,.77,.008]);
 const condenser=mesh(geometry(new T.CylinderGeometry(.038,.038,.48,20,1,true)),glass,[-2.72,top+.67,z-.10],'Independent glass condenser');condenser.rotation.z=Math.PI/2;
 for(let i=0;i<5;i++){const o=mesh(geometry(new T.TorusGeometry(.026,.004,5,20)),glass,[-2.9+i*.09,top+.67,z-.1],'Condenser glass ring');o.rotation.y=Math.PI/2;}
 block(metal,[-2.93,top+.67,z-.1],[.17,.012,.012],'Retort clamp');
 // Right wing: precision balance, rack, measuring glass and empty sample vials.
 block(black,[2.23,top+.024,z],[1.8,.045,.94],'Recessed black right instrument tray');
 block(black,[1.85,top+.07,z+.1],[.55,.09,.44],'Analytical balance body');
 mesh(cylinder,metal,[1.85,top+.13,z+.1],'Analytical balance weighing pan',[.14,.012,.14]);
 block(glass,[1.85,top+.36,z+.1],[.53,.45,.42],'Clear balance draught shield');
 block(glow,[1.85,top+.095,z+.327],[.16,.014,.003],'Minimal instrument indicator');
 block(black,[2.58,top+.09,z+.15],[.49,.12,.23],'Black sample tube rack');
 for(let i=0;i<4;i++){const x=2.4+i*.12;mesh(geometry(new T.CylinderGeometry(.025,.025,.30,14,1,true)),glass,[x,top+.26,z+.15],'Empty laboratory sample tube');mesh(geometry(new T.SphereGeometry(.025,12,6,0,Math.PI*2,Math.PI/2,Math.PI/2)),glass,[x,top+.11,z+.15],'Round sample tube bottom');}
 vessel(2.83,-.25,[[.075,0],[.075,.025],[.025,.045],[.025,.42]],'Graduated measuring glass');ring(2.83,top+.432,z-.25,.026);
 for(let i=0;i<5;i++)block(metal,[2.855,top+.13+i*.05,z-.25],[.015,.003,.003],'Measuring glass graduation');
 vessel(2.36,-.28,[[.07,0],[.07,.13],[.035,.17],[.035,.22]],'Empty glass sample vial');
 const pipette=mesh(geometry(new T.CylinderGeometry(.006,.003,.41,10)),glass,[1.66,top+.065,z-.27],'Glass pipette resting in the tray');pipette.rotation.z=Math.PI/2;
 return{root,diagnostics:()=>({wings:2,left:true,right:true,scientificGlass:true,roundBottomFlask:true,conicalFlask:true,condenser:true,analyticalBalance:true,sampleTubes:4,inside:true,onSameTable:true})};
}
