import {createOriginsCoverCanvas,ORIGINS_COVER} from './origins-cover.mjs';
import * as T from './vendor/three-0.180.0.mjs';
import {GALLERY_LAYOUT as DEFAULT_LAYOUT} from './gallery-modern-layout.mjs';

// A closed physical volume on the lectern. Its pages live in /origins, which
// retains the original moving works and server-backed acquisition details.
export function createLecternBook(scene,{mobile=false,onChange=()=>{},onOpen=()=>{},layout:L=DEFAULT_LAYOUT}={}){
 const root=new T.Group();root.name='Closed Origins volume on the stone lectern in the west keep';root.position.set(...L.origins.book);root.rotation.x=Math.PI/10;scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),pickables=[];
 let sharedCover;
 let disposed=false,dirty=true,opening=false,opened=false,progress=0,opens=0,lastMotion=!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 const leather=material(new T.MeshStandardMaterial({color:0x060606,roughness:.78,metalness:.08}));
 const paper=material(new T.MeshStandardMaterial({color:0x0b0b0b,roughness:.96}));
 const edge=material(new T.MeshStandardMaterial({color:0x151515,roughness:.9}));
 const box=geometry(new T.BoxGeometry(1,1,1));
 function block(parent,m,p,size,name){const o=new T.Mesh(box,m);o.position.set(...p);o.scale.set(...size);o.name=name;o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 block(root,leather,[0,-.035,0],[.7,.022,.98],'Black linen back cover');
 block(root,paper,[0,-.006,0],[.655,.043,.94],'Bound Origins paper block');
 for(let n=0;n<5;n++)block(root,edge,[0,-.020+n*.008,0],[.658,.001,.942],'Fine page edges');
 block(root,leather,[-.342,-.002,0],[.025,.08,.98],'Black rounded spine');
 const hinge=new T.Group();hinge.name='Opening black cover';hinge.position.set(-.342,.026,0);root.add(hinge);
 const cover=block(hinge,leather,[.342,.004,0],[.7,.02,.98],'Origins — closed black cover');
 cover.userData={kind:'origins-book',action:'open',href:'/origins?open=1'};pickables.push(cover);
 if(globalThis.document){
  let texture;
  sharedCover=createOriginsCoverCanvas({onChange:()=>{
   if(disposed)return;
   if(texture)texture.needsUpdate=true;
   dirty=true;onChange();
  }});
  texture=new T.CanvasTexture(sharedCover.canvas);
  texture.colorSpace=T.SRGBColorSpace;textures.add(texture);
  const lettering=material(new T.MeshBasicMaterial({map:texture,toneMapped:false}));
  const stamp=new T.Mesh(geometry(new T.PlaneGeometry(ORIGINS_COVER.width,ORIGINS_COVER.height)),lettering);stamp.rotation.x=-Math.PI/2;stamp.position.set(.342,.015,0);stamp.name='Shared original Origins cover';stamp.userData=cover.userData;hinge.add(stamp);pickables.push(stamp);

 }
 const notify=()=>{dirty=true;onChange();};
 function complete(){if(opened||disposed)return;opening=false;opened=true;progress=1;hinge.rotation.z=0;notify();onOpen({href:'/origins?open=1'});}
 function open(){if(disposed||opening||opened)return false;opens++;opening=true;progress=0;notify();complete();return true;}
 return{root,pickables,open,reset(){if(disposed)return;opening=opened=false;progress=0;hinge.rotation.z=0;notify();},interact(hit){return (hit?.object||hit)?.userData?.kind==='origins-book'?open():false;},
  update(dt,eye,motion=true){if(disposed)return false;lastMotion=!!motion;if(opening){if(!motion)complete();else{progress=Math.min(1,progress+Math.max(0,Math.min(Number(dt)||0,.1))/.85);hinge.rotation.z=0;dirty=true;if(progress===1)complete();}}const changed=dirty;dirty=false;return changed;},
  diagnostics:()=>({kind:'closed-origins-lectern-volume',closed:!opening&&!opened,opening,opened,opens,progress,black:true,lectern:true,stoneLectern:true,location:'west-keep',position:root.position.toArray(),tilt:Math.PI/10,dimensions:[.7,.08,.98],sharedCover:true,coverRatio:ORIGINS_COVER.ratio,coverIntentions:ORIGINS_COVER.intentions,neonTraces:ORIGINS_COVER.neon,coverFont:ORIGINS_COVER.font,coverWeight:ORIGINS_COVER.weight,coverInk:ORIGINS_COVER.ink,href:'/origins?open=1',total:20,disposed}),
  dispose(){if(disposed)return;disposed=true;sharedCover?.dispose();for(const t of textures)t.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();root.removeFromParent();root.clear();}
 };
}
