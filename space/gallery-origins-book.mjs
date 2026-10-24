import * as T from './vendor/three-0.180.0.mjs';
import {ORIGINS} from './gallery-artworks.mjs';

// The twenty authored Origins Polaroids, in the same order as origins.html.
// This is a physical photo book; it does not fetch videos, prices or ownership.
export function createOriginsBook(scene,{
 mobile=false,onChange=()=>{},onSelect=()=>{},textureLoader=null,
 position=[-7.6,1.03,-8]
}={}){
 if(!scene||typeof scene.add!=='function')throw new TypeError('Origins book requires a Three.js scene or group.');
 const changed=()=>{if(!disposed){dirty=true;if(typeof onChange==='function')onChange();}};
 const root=new T.Group();root.name='Origins — twenty photographs in a bound book';root.position.fromArray(position);scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),released=new WeakSet(),cache=new Map(),labels=new Map();
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 let disposed=false,dirty=true,spread=0,current=1,turn=null;
 let lastMotion=!(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
 const loader=textureLoader||(globalThis.document?new T.TextureLoader():null);
 const width=1.17,depth=1.62,spreadCount=Math.ceil(ORIGINS.length/2),pickables=[];
 const absoluteSrc=art=>'/assets/gallery/book-origins/'+String(art.index).padStart(2,'0')+'.jpg';
 function releaseTexture(texture){if(!texture||released.has(texture))return;released.add(texture);textures.delete(texture);texture.dispose();}
 function ownTexture(texture){if(!texture)return texture;if(disposed){releaseTexture(texture);return texture;}textures.add(texture);return texture;}
 const blank=ownTexture(new T.DataTexture(new Uint8Array([22,22,24,255]),1,1));blank.colorSpace=T.SRGBColorSpace;blank.needsUpdate=true;
 const blankLabel=ownTexture(new T.DataTexture(new Uint8Array([0,0,0,0]),1,1));blankLabel.colorSpace=T.SRGBColorSpace;blankLabel.needsUpdate=true;
 const leather=material(new T.MeshStandardMaterial({color:0x080809,roughness:.79,metalness:0}));
 const paper=material(new T.MeshStandardMaterial({color:0xf3f0e9,roughness:.98,metalness:0}));
 const pageEdges=material(new T.MeshStandardMaterial({color:0xc9c6c0,roughness:1,metalness:0}));
 const spineMaterial=material(new T.MeshStandardMaterial({color:0x121214,roughness:.88}));
 function mesh(g,m,name,parent=root){const object=new T.Mesh(g,m);object.name=name;object.receiveShadow=true;parent.add(object);return object;}
 const cover=mesh(geometry(new T.BoxGeometry(2.49,.025,1.73)),leather,'Black linen cover');cover.position.y=-.0475;
 const spine=mesh(geometry(new T.CylinderGeometry(.055,.055,1.72,16)),spineMaterial,'Rounded book spine');spine.rotation.x=Math.PI/2;spine.position.y=-.020;
 for(const side of [-1,1]){
  const block=mesh(geometry(new T.BoxGeometry(1.18,.052,1.64)),paper,'Bound paper block');block.position.set(side*.615,-.008,0);
  // Thin real edge courses catch the reading light without a repeated image.
  for(let i=0;i<5;i++){
   const edge=mesh(geometry(new T.BoxGeometry(1.17,.0012,1.645)),pageEdges,'Individual paper edges');edge.position.set(side*.615,-.026+i*.0094,0);
  }
 }
 function pageHeight(x,z){return .026+.015*(1.-Math.exp(-Math.abs(x)*8.))+.0015*Math.cos(z*3.4);}
 function surfaceGeometry(side,{photo=false,back=false,leaf=false}={}){
  const w=photo?1.20*ORIGINS[0].aspect:width,d=photo?1.20:depth;
  const g=new T.PlaneGeometry(w,d,mobile?10:18,mobile?12:20);g.rotateX(-Math.PI/2);
  const a=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<a.count;i++){
   const x=a.getX(i)+side*.615,z=a.getZ(i)+(photo?-.065:0);
   const rise=leaf?.004*Math.sin(Math.min(1,Math.abs(x)/(width+.06))*Math.PI):pageHeight(x,z);
   a.setXYZ(i,x,rise+(photo?(back?-.0012:.0012):0),z);
   if(back)uv.setX(i,1.-uv.getX(i));
  }
  g.computeVertexNormals();return geometry(g);
 }
 const photoMaterial=()=>material(new T.MeshBasicMaterial({map:blank,color:0xffffff,toneMapped:false,side:T.FrontSide}));
 const captionMaterial=()=>material(new T.MeshBasicMaterial({map:blankLabel,transparent:true,depthWrite:false,toneMapped:false}));
 const pages=[];
 for(const side of [-1,1]){
  mesh(surfaceGeometry(side),paper,side<0?'Left open page':'Right open page');
  const photo=mesh(surfaceGeometry(side,{photo:true}),photoMaterial(),side<0?'Origins photograph — left page':'Origins photograph — right page');
  photo.userData={kind:'origins-book',id:side<0?'book-left':'book-right',action:'select',bookSide:side};pickables.push(photo);
  const caption=mesh(geometry(new T.PlaneGeometry(.79,.145)),captionMaterial(),'Origins photograph caption');caption.rotation.x=-Math.PI/2;caption.position.set(side*.605,.044,.676);
  pages.push({photo,caption,index:side<0?0:1});
 }
 const leaves={};
 for(const side of [-1,1]){
  const pivot=new T.Group();pivot.name=side>0?'Turning right sheet':'Turning left sheet';pivot.position.y=.051;root.add(pivot);pivot.visible=false;
  mesh(surfaceGeometry(side,{leaf:true}),paper,'The turning paper sheet',pivot);
  const front=mesh(surfaceGeometry(side,{photo:true,leaf:true}),photoMaterial(),'Printed front of turning sheet',pivot);
  const backMaterial=photoMaterial();backMaterial.side=T.BackSide;
  const back=mesh(surfaceGeometry(side,{photo:true,back:true,leaf:true}),backMaterial,'Printed back of turning sheet',pivot);
  leaves[side]={pivot,front,back};
 }
 const buttons=[];
 const discGeometry=geometry(new T.CircleGeometry(.080,32));discGeometry.rotateX(-Math.PI/2);
 const arrowGeometry=geometry(new T.BufferGeometry());arrowGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array([-.025,0,-.030,.012,0,0,-.025,0,.030,-.025,0,-.016,-.005,0,0,-.025,0,.016]),3));arrowGeometry.setIndex([0,1,3,3,1,4,4,1,2,4,2,5]);
 for(const side of [-1,1]){
  const baseMaterial=material(new T.MeshBasicMaterial({color:0x141416,toneMapped:false,transparent:true}));
  const button=mesh(discGeometry,baseMaterial,side<0?'Previous Origins spread':'Next Origins spread');button.position.set(side*1.12,.052,.727);
  button.userData={kind:'origins-book',id:side<0?'book-previous':'book-next',action:side<0?'previous':'next'};pickables.push(button);
  const arrow=mesh(arrowGeometry,material(new T.MeshBasicMaterial({color:0xf1f0ec,toneMapped:false,side:T.DoubleSide,transparent:true})),'Page turn chevron');arrow.position.copy(button.position);arrow.position.y+=.0015;if(side<0)arrow.rotation.y=Math.PI;
  buttons.push({side,button,arrow});
 }
 function captionTexture(index){
  if(labels.has(index))return labels.get(index);
  if(typeof globalThis.document?.createElement!=='function')return blankLabel;
  const canvas=document.createElement('canvas');canvas.width=mobile?512:768;canvas.height=128;
  const ctx=canvas.getContext?.('2d');if(!ctx)return blankLabel;
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#252527';ctx.textBaseline='top';
  let size=28;const title=ORIGINS[index].title.toUpperCase();
  do{ctx.font=`700 ${size}px "Space Mono",monospace`;if(ctx.measureText(title).width<=canvas.width-16)break;size--;}while(size>15);
  ctx.fillText(title,8,20);ctx.fillStyle='#737376';ctx.font='400 22px "Space Mono",monospace';ctx.fillText(String(index+1).padStart(2,'0')+' / 20',8,73);
  const texture=ownTexture(new T.CanvasTexture(canvas));texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearMipmapLinearFilter;labels.set(index,texture);return texture;
 }
 function resizeForMobile(texture){
  if(!mobile||typeof globalThis.document?.createElement!=='function')return;
  const image=texture.image,w=image?.naturalWidth||image?.width,h=image?.naturalHeight||image?.height;
  if(!(w>0&&h>0)||Math.max(w,h)<=768)return;
  const canvas=document.createElement('canvas'),scale=768/Math.max(w,h);canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
  const context=canvas.getContext?.('2d');if(!context)return;
  context.drawImage(image,0,0,canvas.width,canvas.height);texture.image=canvas;texture.needsUpdate=true;
 }
 function request(index){
  if(cache.has(index))return cache.get(index);
  const entry={index,texture:null,loaded:false,failed:false,retired:false};cache.set(index,entry);
  if(!loader)return entry;
  const texture=loader.load(absoluteSrc(ORIGINS[index]),loaded=>{
   if(disposed||entry.retired){releaseTexture(loaded);return;}
   ownTexture(loaded);entry.texture=loaded;entry.loaded=true;resizeForMobile(loaded);refresh();changed();
  },undefined,()=>{if(disposed||entry.retired)return;entry.failed=true;refresh();changed();});
  if(!entry.texture)entry.texture=texture;
  if(texture){texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.anisotropy=mobile?2:4;ownTexture(texture);}
  return entry;
 }
 function mapFor(index){const entry=request(index);return entry.loaded?entry.texture:blank;}
 function imageOn(object,index){object.material.map=mapFor(index);object.material.needsUpdate=true;object.userData.artworkIndex=index+1;}
 function trimCache(){
  const keep=new Set();for(let s=Math.max(0,spread-1);s<=Math.min(spreadCount-1,spread+1);s++){keep.add(s*2);keep.add(s*2+1);}
  if(turn){keep.add(turn.to*2);keep.add(turn.to*2+1);}
  for(const [index,entry] of cache){if(keep.has(index))continue;entry.retired=true;releaseTexture(entry.texture);cache.delete(index);}
 }
 function refresh(){
  if(disposed)return;
  const left=turn?.direction<0?turn.to*2:spread*2,right=turn?.direction>0?turn.to*2+1:spread*2+1;
  [left,right].forEach((index,n)=>{pages[n].index=index;imageOn(pages[n].photo,index);pages[n].caption.material.map=captionTexture(index);pages[n].caption.material.needsUpdate=true;});
  if(turn){const leaf=leaves[turn.direction];imageOn(leaf.front,turn.direction>0?spread*2+1:spread*2);imageOn(leaf.back,turn.direction>0?turn.to*2:turn.to*2+1);}
  for(const b of buttons){const enabled=b.side<0?spread>0:spread<spreadCount-1;b.button.material.opacity=enabled?1:.28;b.arrow.material.opacity=enabled?.86:.22;}
 }
 function preload(){for(let s=Math.max(0,spread-1);s<=Math.min(spreadCount-1,spread+1);s++){request(s*2);request(s*2+1);}trimCache();}
 function complete(){if(!turn)return;spread=turn.to;current=spread*2+1;leaves[turn.direction].pivot.visible=false;leaves[turn.direction].pivot.rotation.z=0;turn=null;refresh();preload();changed();}
 function change(to,{animate=lastMotion}={}){
  if(disposed||turn||to===spread||to<0||to>=spreadCount)return false;
  if(!animate){spread=to;current=spread*2+1;refresh();preload();changed();return true;}
  const direction=to>spread?1:-1;turn={to,direction,elapsed:0,duration:.76};const leaf=leaves[direction];leaf.pivot.visible=true;leaf.pivot.rotation.z=0;refresh();changed();return true;
 }
 function select(index=current){
  if(disposed)return false;
  const n=Math.max(1,Math.min(ORIGINS.length,Math.trunc(Number(index)||current))),art=ORIGINS[n-1];current=n;
  if(typeof onSelect==='function')onSelect({id:art.id,index:n,title:art.title,href:'/origins?work='+n,marketHref:'/market?collection=quantum'});
  changed();return true;
 }
 refresh();preload();
 globalThis.document?.fonts?.ready?.then(()=>{if(disposed)return;for(const t of labels.values())releaseTexture(t);labels.clear();refresh();changed();});
 changed();
 return{
  root,pickables,approach:[-7.6,1.65,-4],target:[-7.6,1.03,-8],
  next:()=>change(spread+1),previous:()=>change(spread-1),
  goTo(work,{animate=false}={}){const n=Math.trunc(Number(work));if(!Number.isFinite(n)||n<1||n>ORIGINS.length||disposed)return false;if(turn)complete();const moved=change(Math.floor((n-1)/2),{animate}),selected=current!==n;current=n;if(selected)changed();return moved||selected;},
  select,
  interact(hit){if(disposed)return false;const data=(hit?.object||hit)?.userData;if(data?.kind!=='origins-book')return false;if(data.action==='next')return change(spread+1);if(data.action==='previous')return change(spread-1);if(data.action==='select')return select(data.artworkIndex);return false;},
  update(dt,eye,motion=true){if(disposed)return false;lastMotion=!!motion;if(turn){if(!lastMotion)complete();else{turn.elapsed+=Math.max(0,Math.min(Number(dt)||0,.1));const p=Math.min(1,turn.elapsed/turn.duration),ease=p*p*(3.-2.*p);leaves[turn.direction].pivot.rotation.z=turn.direction*Math.PI*ease;dirty=true;if(p>=1)complete();}}const result=dirty;dirty=false;return result;},
  diagnostics:()=>({kind:'origins-photo-book',total:ORIGINS.length,spreadCount,spreadIndex:spread,current,ncurrent:current,visibleIndices:[spread*2+1,spread*2+2],order:ORIGINS.map(a=>a.index),imageSources:ORIGINS.map(absoluteSrc),loadedVisible:[spread*2,spread*2+1].map(i=>!!cache.get(i)?.loaded),loaded:[...cache.values()].filter(e=>e.loaded).length,failed:[...cache.values()].filter(e=>e.failed).length,cacheSize:cache.size,cacheLimit:6,mobileLongestImageEdge:mobile?768:null,turning:!!turn,pendingSpread:turn?.to??null,canPrevious:spread>0,canNext:spread<spreadCount-1,aspectPreserved:true,publicStillsOnly:true,externalFiles:0,globalListeners:0,dimensions:[2.49,.095,1.73],position:root.position.toArray(),disposed}),
  dispose(){if(disposed)return;disposed=true;turn=null;for(const entry of cache.values())entry.retired=true;cache.clear();for(const texture of [...textures])releaseTexture(texture);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();labels.clear();root.removeFromParent();root.clear();}
 };
}
