import * as T from './vendor/three-0.180.0.mjs';
import {createLisbonFirstPage} from './lisbon-first-page.mjs';
import {createOppositesFront} from './opposites-front.mjs';
export const PROJECTION_LAYOUTS=Object.freeze({lisbon:{position:[-3.4,4.2,-15.15],size:[13.2,7.425],approach:[-3.4,1.65,-5.1]},'new-york':{position:[0,4.45,-9],size:[14.4,8.1],approach:[0,1.65,.5]}});
export function createSaucerProjection(parent,{city='lisbon',mobile=false,onChange=()=>{}}={}){
 const layout=PROJECTION_LAYOUTS[city],root=new T.Group();root.name='Saucer — black projection of the original first page';root.position.set(...layout.position);parent.add(root);
 let disposed=false,dirty=true,active=false,opened=false,opens=0,projecting=true,opacity=1,callback=()=>{},drawTime=0;
 const changed=()=>{if(!disposed){dirty=true;onChange();}};
 const front=globalThis.document?(city==='lisbon'?createLisbonFirstPage:createOppositesFront)({width:mobile?1024:1600,height:mobile?576:900,onChange:changed}):null;
 const texture=front?.canvas?new T.CanvasTexture(front.canvas):null;if(texture){texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;}
 const material=new T.MeshBasicMaterial({map:texture,color:texture?0xffffff:0x000000,toneMapped:false,side:T.FrontSide,transparent:true}),geometry=new T.PlaneGeometry(...layout.size),screen=new T.Mesh(geometry,material);screen.name='Canonical animated experience first page';screen.userData={kind:'experience-projection',city,href:city==='lisbon'?'/play_lisbon_street':'/think_same_but_opposite'};root.add(screen);
 const backMaterial=new T.MeshBasicMaterial({color:0x000000,side:T.BackSide,toneMapped:false}),back=new T.Mesh(geometry,backMaterial);back.position.z=-.015;root.add(back);
 const source=new T.Vector3(0,18.93,-4.2).sub(root.position),w=layout.size[0]/2,h=layout.size[1]/2,corners=[[-w,h,-.02],[w,h,-.02],[w,-h,-.02],[-w,-h,-.02]],positions=[];
 for(let i=0;i<4;i++)positions.push(...source.toArray(),...corners[i],...corners[(i+1)%4]);
 const beamGeometry=new T.BufferGeometry();beamGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));beamGeometry.computeVertexNormals();
 const beamMaterial=new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.26,depthWrite:false,side:T.DoubleSide,toneMapped:false}),beam=new T.Mesh(beamGeometry,beamMaterial);beam.name='Black light — projection from the saucer underside';root.add(beam);
 const edgeGeometry=new T.BufferGeometry().setFromPoints(corners.flatMap(c=>[source.clone(),new T.Vector3(...c)])),edgeMaterial=new T.LineBasicMaterial({color:0x101222,transparent:true,opacity:.22,depthWrite:false}),edges=new T.LineSegments(edgeGeometry,edgeMaterial);edges.name='Restrained dark edges of the black beam';root.add(edges);
 function open(hit){if(disposed)return false;opened=true;opens++;let href=screen.userData.href;if(city==='new-york'&&hit?.uv){const work=front?.hit(hit.uv.x,1-hit.uv.y);if(work)href+='?work='+encodeURIComponent(work.id);}callback({href,projection:api});return true;}
 const api={root,screen,front,pickables:[screen],onOpen(fn){callback=fn;},setProjecting(value){projecting=!!value;},setActive(value){active=!!value;if(!active)opened=false;},reset(){opened=false;},acceptHit:h=>h?.object===screen,interact:open,open,
  handleKey(event){return active&&event.key==='Enter'&&!event.repeat?open():false;},
  update(dt,eye,motion=true){if(disposed)return false;front?.update(dt,motion);const time=front?.diagnostics().time||0;if(texture&&(dirty||time-drawTime>1/(mobile?16:24))){texture.needsUpdate=true;drawTime=time;dirty=true;}const target=projecting?1:0,next=motion?T.MathUtils.damp(opacity,target,6,Math.min(.1,dt)):target;if(Math.abs(next-opacity)>.001){opacity=next;dirty=true;}material.opacity=opacity;backMaterial.transparent=true;backMaterial.opacity=opacity;beamMaterial.opacity=opacity*.26;edgeMaterial.opacity=opacity*.22;const result=dirty;dirty=false;return result;},
  diagnostics:()=>({kind:'saucer-first-page-projection',city,canonicalFirstPage:true,blackPanel:true,blackBeam:true,beamSource:[0,18.93,-4.2],screenSize:layout.size,position:layout.position,signs:city==='lisbon'?22:0,works:city==='new-york'?6:0,coverReady:!!front?.diagnostics().ready,ready:!!front?.diagnostics().ready,time:front?.diagnostics().time||0,active,opened,opens,playing:false,videoDecoders:0,projecting,opacity,front:front?.diagnostics()||null}),
  dispose(){disposed=true;front?.dispose();texture?.dispose();geometry.dispose();material.dispose();backMaterial.dispose();beamGeometry.dispose();beamMaterial.dispose();edgeGeometry.dispose();edgeMaterial.dispose();root.removeFromParent();root.clear();}
 };return api;
}
