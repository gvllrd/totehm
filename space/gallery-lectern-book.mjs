import * as T from './vendor/three-0.180.0.mjs';

// A closed physical volume on the lectern. Its pages live in /origins, which
// retains the original moving works and server-backed acquisition details.
export function createLecternBook(scene,{mobile=false,onChange=()=>{},onOpen=()=>{}}={}){
 const root=new T.Group();root.name='Closed black Origins volume on the lectern';root.position.set(-7.6,1.37,-8);root.rotation.x=Math.PI/10;scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),pickables=[];
 let disposed=false,dirty=true,opening=false,opened=false,progress=0,opens=0,lastMotion=!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 const leather=material(new T.MeshStandardMaterial({color:0x060606,roughness:.78,metalness:.08}));
 const paper=material(new T.MeshStandardMaterial({color:0xd5cdbd,roughness:.96}));
 const edge=material(new T.MeshStandardMaterial({color:0x302a22,roughness:.9}));
 const box=geometry(new T.BoxGeometry(1,1,1));
 function block(parent,m,p,size,name){const o=new T.Mesh(box,m);o.position.set(...p);o.scale.set(...size);o.name=name;o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 block(root,leather,[0,-.035,0],[.7,.022,.94],'Black linen back cover');
 block(root,paper,[0,-.006,0],[.655,.043,.9],'Bound Origins paper block');
 for(let n=0;n<5;n++)block(root,edge,[0,-.020+n*.008,0],[.658,.001,.902],'Fine page edges');
 block(root,leather,[-.342,-.002,0],[.025,.08,.94],'Black rounded spine');
 const hinge=new T.Group();hinge.name='Opening black cover';hinge.position.set(-.342,.026,0);root.add(hinge);
 const cover=block(hinge,leather,[.342,.004,0],[.7,.02,.94],'Origins — closed black cover');
 cover.userData={kind:'origins-book',action:'open',href:'/origins?open=1'};pickables.push(cover);
 if(globalThis.document){
  const canvas=document.createElement('canvas');canvas.width=mobile?512:768;canvas.height=512;
  const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.add(texture);
  const lettering=material(new T.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,roughness:.7,metalness:.18}));
  const stamp=new T.Mesh(geometry(new T.PlaneGeometry(.47,.31)),lettering);stamp.rotation.x=-Math.PI/2;stamp.position.set(.342,.015,-.04);stamp.name='Subtle Origins cover stamp';hinge.add(stamp);
  const draw=()=>{if(disposed)return;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#c5bda9';ctx.font='700 '+Math.round(canvas.width*.105)+'px "Space Mono",monospace';ctx.fillText('ORIGINS',canvas.width/2,canvas.height*.39);ctx.fillStyle='#8b8579';ctx.font=Math.round(canvas.width*.027)+'px "Space Mono",monospace';ctx.fillText('WAH / QUANTUM',canvas.width/2,canvas.height*.63);texture.needsUpdate=true;dirty=true;onChange();};
  draw();document.fonts?.ready?.then(draw);
 }
 const notify=()=>{dirty=true;onChange();};
 function complete(){if(opened||disposed)return;opening=false;opened=true;progress=1;hinge.rotation.z=Math.PI*.74;notify();onOpen({href:'/origins?open=1'});}
 function open(){if(disposed||opening||opened)return false;opens++;opening=true;progress=0;notify();if(!lastMotion)complete();return true;}
 return{root,pickables,open,reset(){if(disposed)return;opening=opened=false;progress=0;hinge.rotation.z=0;notify();},interact(hit){return (hit?.object||hit)?.userData?.kind==='origins-book'?open():false;},
  update(dt,eye,motion=true){if(disposed)return false;lastMotion=!!motion;if(opening){if(!motion)complete();else{progress=Math.min(1,progress+Math.max(0,Math.min(Number(dt)||0,.1))/.85);const e=progress*progress*(3-2*progress);hinge.rotation.z=Math.PI*.74*e;dirty=true;if(progress===1)complete();}}const changed=dirty;dirty=false;return changed;},
  diagnostics:()=>({kind:'closed-origins-lectern-volume',closed:!opening&&!opened,opening,opened,opens,progress,black:true,lectern:true,position:root.position.toArray(),tilt:Math.PI/10,dimensions:[.7,.08,.94],href:'/origins?open=1',total:20,disposed}),
  dispose(){if(disposed)return;disposed=true;for(const t of textures)t.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();root.removeFromParent();root.clear();}
 };
}
