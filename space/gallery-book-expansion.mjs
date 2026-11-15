import {Vector3} from './vendor/three-0.180.0.mjs';
import {createOriginsCoverCanvas} from './origins-cover.mjs';
let active=null;

// A projective map keeps all four physical corners, including their perspective.
export function coverTransform(points,width=1000,height=1400){
 const [p,q,r,s]=points,dx1=q.x-r.x,dx2=s.x-r.x,dx3=p.x-q.x+r.x-s.x,dy1=q.y-r.y,dy2=s.y-r.y,dy3=p.y-q.y+r.y-s.y,det=dx1*dy2-dx2*dy1;
 const g=Math.abs(det)>1e-9?(dx3*dy2-dx2*dy3)/det:0,h=Math.abs(det)>1e-9?(dx1*dy3-dx3*dy1)/det:0;
 return 'matrix3d('+[(q.x-p.x+g*q.x)/width,(q.y-p.y+g*q.y)/width,0,g/width,(s.x-p.x+h*s.x)/height,(s.y-p.y+h*s.y)/height,0,h/height,0,0,1,0,p.x,p.y,0,1].join(',')+')';
}
export function expandOriginsBook(volume,camera,href,{reduced=false,onStart=()=>{},onClose=()=>{}}={}){
 if(active)return false;
 const destination=new URL(href,location.href);if(destination.origin!==location.origin||destination.pathname!=='/origins')return false;
 volume.updateWorldMatrix(true,true);camera.updateMatrixWorld();
 const stamp=volume.getObjectByName('Shared original Origins cover'),points=(stamp?[[-.35,.49,0],[.35,.49,0],[.35,-.49,0],[-.35,-.49,0]]:[[-.35,.041,-.49],[.35,.041,-.49],[.35,.041,.49],[-.35,.041,.49]]).map(p=>new Vector3(...p).applyMatrix4((stamp||volume).matrixWorld).project(camera)).map(p=>({x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}));
 const cover=createOriginsCoverCanvas(),image=document.createElement('img'),veil=document.createElement('div'),frame=document.createElement('iframe'),dialog=document.createElement('div');
 const previousURL=location.href,previousState=history.state,wasVisible=volume.visible,siblings=[...document.body.children].map(el=>[el,el.inert]);let stage='preparing',disposed=false,pushed=false,timer=0,animation=0,progress=0,targetCorners=null;
 const diagnostics=()=>({stage,progress,readerFrames:disposed?0:1,coverOverlays:disposed||!image.isConnected?0:1,physicalBookVisible:volume.visible,projectedCorners:points,targetCorners});window.__totehm_book_expansion=diagnostics;
 dialog.id='origins-reader-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Origins — the original book');dialog.style.cssText='position:fixed;inset:0;z-index:100;background:transparent';
 veil.style.cssText='position:absolute;inset:0;background:#000;opacity:0;pointer-events:none';
 image.src=cover.canvas.toDataURL();image.alt='Origins — the original book';image.style.cssText='position:absolute;left:0;top:0;width:1000px;height:1400px;max-width:none;transform-origin:0 0;pointer-events:none';image.style.transform=coverTransform(points);
 frame.title='Origins — read and turn the original book';frame.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;visibility:hidden';
 const embedded=new URL(destination);embedded.searchParams.set('embedded','1');
 active={close};
 function close(fromHistory=false){
  if(disposed)return;disposed=true;stage='closed';clearTimeout(timer);cancelAnimationFrame(animation);removeEventListener('popstate',pop);removeEventListener('keydown',escape);dialog.remove();cover.dispose();volume.visible=wasVisible;for(const [el,inert]of siblings)el.inert=inert;active=null;onClose();
  if(pushed&&!fromHistory)history.back();
 }
 function pop(){close(true);}
 function escape(event){if(event.key==='Escape'){event.preventDefault();close();}}
 function fail(){if(disposed)return;close(true);history.replaceState(previousState,'',previousURL);location.assign(destination.href);}
 async function ready(){
  try{
   const win=frame.contentWindow,doc=win.document;
   if(!win.__totehm_origins)return;await doc.fonts?.ready;if(disposed)return;
   const target=doc.getElementById('book-cover').getBoundingClientRect();targetCorners=[{x:target.left,y:target.top},{x:target.right,y:target.top},{x:target.right,y:target.bottom},{x:target.left,y:target.bottom}];const to=coverTransform(targetCorners);
   clearTimeout(timer);stage='expanding';
   // Interpolate corners, not decomposed CSS matrices: perspective decomposition
   // can otherwise flip a shallow physical cover through an enormous diagonal.
   if(!reduced)await new Promise(resolve=>{let start;const tick=now=>{if(disposed){resolve();return;}start??=now;progress=Math.min(1,(now-start)/720);const eased=1-(1-progress)**3;image.style.transform=coverTransform(points.map((p,i)=>({x:p.x+(targetCorners[i].x-p.x)*eased,y:p.y+(targetCorners[i].y-p.y)*eased})));veil.style.opacity=String(eased);if(progress===1)resolve();else animation=requestAnimationFrame(tick);};animation=requestAnimationFrame(tick);});
   if(disposed)return;veil.style.opacity='1';image.style.transform=to;
   // The measured cover and the live reader occupy precisely the same pixels.
   frame.style.visibility='visible';image.remove();veil.remove();stage='reading';
   history.pushState({...previousState,totehmOriginsReader:true},'',destination.href);pushed=true;
   win.addEventListener('click',event=>{const link=event.target.closest('a');if(!link)return;event.preventDefault();if(link===doc.querySelector('.reader-header>a'))close();else location.assign(link.href);},true);
   win.addEventListener('keydown',event=>{if(event.key==='Escape'&&!win.__totehm_origins().opened){event.preventDefault();close();}},true);
   frame.focus();win.dispatchEvent(new win.Event('totehm:reader-open'));
  }catch(error){if(!disposed){console.warn('[origins reader]',error?.name||'unavailable');fail();}}
 }
 frame.addEventListener('load',ready);frame.addEventListener('error',fail,{once:true});
 for(const [el]of siblings)el.inert=true;dialog.append(veil,frame,image);document.body.append(dialog);frame.src=embedded.href;
 // Remove the physical volume in the same paint as its exact projected cover.
 volume.visible=false;onStart();addEventListener('popstate',pop);addEventListener('keydown',escape);timer=setTimeout(fail,20000);return true;
}
