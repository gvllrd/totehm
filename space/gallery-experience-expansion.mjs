import {Vector3} from './vendor/three-0.180.0.mjs';
import {coverTransform} from './gallery-book-expansion.mjs';
import {captureObjectLift,createObjectLift} from './gallery-object-view.mjs';

let current=null;
const fronts={
 screen:{ready:'__totehm_experience_front',selector:'#experience-front-canvas',event:'totehm:experience-enter'},
 controller:{ready:'__totehm_controller_entry',event:'totehm:controller-enter'},
 discover:{ready:'__totehm_experience_front',event:'totehm:experience-enter'},
 paper:{ready:'__totehm_paper_entry',event:'totehm:paper-enter'}
};
function corners(rect){return [{x:rect.left,y:rect.top},{x:rect.right,y:rect.top},{x:rect.right,y:rect.bottom},{x:rect.left,y:rect.bottom}];}

export function expandProjectedExperience(projection,camera,href,options={}){
 if(!projection.front?.canvas)return false;
 const plane=projection.screen,canvas=projection.front.canvas,w=plane.geometry.parameters.width,h=plane.geometry.parameters.height;
 plane.updateWorldMatrix(true,false);camera.updateMatrixWorld();
 const from=[[-w/2,h/2,0],[w/2,h/2,0],[w/2,-h/2,0],[-w/2,-h/2,0]].map(point=>{
  const projected=new Vector3(...point).applyMatrix4(plane.matrixWorld).project(camera);
  return{x:(projected.x+1)*innerWidth/2,y:(1-projected.y)*innerHeight/2};
 });
 return openExperience({object:plane,href,type:'screen',from,canvas,time:projection.diagnostics().time,...options,
  onStart(){if(projection.rim)projection.rim.visible=false;options.onStart?.();},
  onClose(){if(projection.rim)projection.rim.visible=true;options.onClose?.();}
 });
}

export function expandLisbonDiscover(projection,href,options={}){
 if(!projection.root||!projection.setHandoff)return false;
 return openExperience({object:projection.root,href,type:'discover',projection,...options});
}

export function expandGalleryObject(object,camera,href,{kind,width,shot,...options}){
 if(current||!object)return false;
 return openExperience({object,camera,href,type:kind,width,shot,...options});
}

function openExperience({object,camera,href,type,from=null,canvas,time,width,shot,reduced=false,sourceReady=null,projection=null,onStart=()=>{},onLift=()=>{},onClose=()=>{}}){
 if(current)return false;
 const url=new URL(href,location.href);
 if(url.origin!==location.origin||!['/play_lisbon_street','/think_same_but_opposite','/get_higher'].includes(url.pathname))return false;
 const config=fronts[type],previous=location.href,state=history.state,wasVisible=object.visible;
 const siblings=[...document.body.children].map(el=>[el,el.inert]);
 const dialog=document.createElement('div'),veil=document.createElement('div'),frame=document.createElement('iframe');
 let disposed=false,entering=false,stage='preparing',raf=0,timer=0,progress=0,target=null,animation=null,visual=null,handoff=null,controllerLift=false,stopLift=null,projectionHidden=false;
 dialog.id='experience-projection-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Enter the original artwork');
 dialog.style.cssText='position:fixed;inset:0;z-index:100';
 veil.style.cssText='position:absolute;inset:0;background:#000;opacity:0';
 frame.title='The original TOTEHM experience';frame.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;color-scheme:dark;visibility:hidden;pointer-events:none';
 const embedded=new URL(url);embedded.searchParams.set('embedded','1');if(time!==undefined)embedded.searchParams.set('sceneTime',String(time));
 function makeLift(){
  try{return createObjectLift(object,camera,{width,shot});}
  catch(error){console.warn('[3D entrance]',error?.name||'unavailable');return null;}
 }
 if(type==='screen'){
  const image=document.createElement('img');image.src=canvas.toDataURL();image.alt='The original experience first page';
  image.style.cssText=`position:absolute;left:0;top:0;width:${canvas.width}px;height:${canvas.height}px;max-width:none;transform-origin:0 0;pointer-events:none`;
  const draw=amount=>{const pose=target?from.map((point,i)=>({x:point.x+(target[i].x-point.x)*amount,y:point.y+(target[i].y-point.y)*amount})):from;image.style.transform=coverTransform(pose,canvas.width,canvas.height);};
  visual={element:image,draw,dispose(){}};draw(0);
 }else if(type==='paper'&&!reduced)visual=makeLift();
 const releaseVisual=()=>{visual?.element.remove();visual?.dispose();visual=null;};
 current=dialog;
 window.__totehm_projection_expansion=()=>({stage,type,progress,from,target,handoff,documentReloads:0,overlays:visual?.element.isConnected||controllerLift?1:0,controllerLift,temporaryCanvas:visual?.element.tagName==='CANVAS',physicalPanelVisible:object.visible&&!projectionHidden,frames:frame.isConnected?1:0});
 function close(fromHistory=false){
  if(disposed)return;
  disposed=true;stage='closed';clearTimeout(timer);cancelAnimationFrame(raf);animation?.cancel();stopLift?.();
  removeEventListener('popstate',pop);removeEventListener('keydown',escape);removeEventListener('totehm:experience-navigate',navigate);
  const restoreWorld=projectionHidden||type==='controller'&&object.visible!==wasVisible;
  releaseVisual();object.visible=wasVisible;
  if(projectionHidden){projection.setHandoff(false);projectionHidden=false;}
  if(restoreWorld)onLift();
  dialog.remove();for(const [el,inert]of siblings)el.inert=inert;current=null;onClose();
  if(!fromHistory)history.back();
 }
 function pop(){close(true);}
 function escape(event){if(event.key==='Escape'){event.preventDefault();close();}}
 function leave(next){close(true);history.replaceState(state,'',previous);location.assign(next.href);}
 function navigate(event){
  if(disposed||typeof event.detail?.href!=='string')return;
  let next;try{next=new URL(event.detail.href,location.origin);}catch{return;}
  if(next.protocol!=='https:'||!(next.origin===location.origin&&['/get_higher','/market','/stoner','/play_lisbon_street'].includes(next.pathname)||next.origin==='https://www.totehm.com'&&next.pathname==='/auth'))return;
  event.preventDefault();leave(next);
 }
 function fail(){if(!disposed){if(type==='controller')close();else leave(url);}}
 async function animateController(win){
  const driver=win.__totehm_controller_lift;
  const entry=win.__totehm_controller_entry?.();
  if(reduced||!driver||!entry?.canvas||entry.model?.loaded!==22)return;
  if(sourceReady&&!(await sourceReady()))return;
  if(disposed)return;

  // Start with the exact pose of the world frame and dissolve in place first.
  // The reader's canvas then does the entire lift, including the final frame.
  let pose=captureObjectLift(object,camera);
  try{
   if(!driver.start(pose,width)){driver.finish();return;}
   controllerLift=true;stage='expanding';
   frame.style.opacity='0';frame.style.visibility='visible';
   clearTimeout(timer);
   const matched=await new Promise(resolve=>{
    let previous=null,elapsed=0;
    const complete=value=>{stopLift=null;clearTimeout(timer);resolve(value);};
    stopLift=()=>complete(false);
    timer=setTimeout(stopLift,5000);
    const tick=now=>{
     if(disposed){complete(false);return;}
     try{
      if(innerWidth!==pose.viewport[0]||innerHeight!==pose.viewport[1]){
       pose=captureObjectLift(object,camera);
       if(!driver.start(pose,width)){complete(false);return;}
      }
      if(previous!==null)elapsed+=Math.min(75,Math.max(0,now-previous));
      previous=now;
      const settle=Math.min(1,elapsed/125);
      frame.style.opacity=String(settle);
      progress=Math.max(0,Math.min(1,(elapsed-125)/700));
      const eased=progress*progress*progress*(10+progress*(-15+6*progress));
      if(progress>0&&!driver.frame(eased)){complete(false);return;}
      if(progress===1)complete(true);else raf=requestAnimationFrame(tick);
     }catch{complete(false);}
    };
    raf=requestAnimationFrame(tick);
   });
   cancelAnimationFrame(raf);
   if(disposed)return;
   const from=matched?win.__totehm_controller_entry?.().faceCorners:null;
   driver.finish();
   const to=win.__totehm_controller_entry?.().faceCorners;
   if(from?.length===4&&to?.length===4&&from.every(([x,y],i)=>Math.hypot(x-to[i][0],y-to[i][1])<.1))handoff={from,to};
  }catch{
   if(!disposed)try{driver.finish();}catch{}
  }finally{controllerLift=false;}
 }
 async function revealDiscover(win){
  stage='expanding';
  frame.style.opacity='0';frame.style.visibility='visible';
  win.dispatchEvent(new win.Event(config.event));
  if(!reduced){
   animation=frame.animate([{opacity:0},{opacity:1}],{duration:440,easing:'ease-in-out',fill:'forwards'});
   await animation.finished.catch(()=>{});
  }
  if(disposed)return;
  frame.style.opacity='1';animation?.cancel();
  projectionHidden=true;projection.setHandoff(true);
  onLift();progress=1;
 }
 async function ready(){
  try{
   const win=frame.contentWindow;if(entering||win.location.pathname!==url.pathname)return;entering=true;
   await new Promise(resolve=>{const wait=()=>{if(disposed||win[config.ready]?.().ready)resolve();else raf=requestAnimationFrame(wait);};wait();});
   if(disposed)return;
   const doc=win.document;
   if(type==='controller')await animateController(win);
   else if(type==='discover')await revealDiscover(win);
   else await doc.fonts?.ready;
   if(disposed)return;
   if(config.selector)target=corners(doc.querySelector(config.selector).getBoundingClientRect());
   if(type!=='controller'&&type!=='discover')stage='expanding';
   clearTimeout(timer);
   if(!reduced&&visual)await new Promise(resolve=>{
    let start;
    const tick=now=>{
     if(disposed){resolve();return;}
     start??=now;progress=Math.min(1,(now-start)/860);const eased=1-(1-progress)**3;
     visual.draw(eased);veil.style.opacity=String(eased);
     if(progress===1)resolve();else raf=requestAnimationFrame(tick);
    };raf=requestAnimationFrame(tick);
   });
   if(disposed)return;
   const paperView=type==='paper'&&win.__totehm_paper_entry?.();
   if(paperView?.sharedModel&&visual?.corners){
    handoff={from:visual.corners(),to:paperView.faceCorners};
   }
   if(type!=='controller')frame.style.visibility='visible';
   if(type!=='screen'&&!handoff&&!reduced&&visual){
    veil.style.opacity='1';animation=visual.element.animate([{opacity:1},{opacity:0}],{duration:180,fill:'forwards'});
    animation.finished.then(releaseVisual,()=>{});
   }else releaseVisual();
   veil.remove();
   win.addEventListener('click',event=>{
    if(event.target.closest('[data-experience-close]')){event.preventDefault();event.stopImmediatePropagation();close();return;}
    const link=event.target.closest('a[href]');if(!link)return;
    const next=new URL(link.href,frame.src);
    if(['http:','https:'].includes(next.protocol)&&(next.origin!==url.origin||next.pathname!==url.pathname)){
     event.preventDefault();event.stopImmediatePropagation();leave(next);
    }
   },true);
   win.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(type==='paper'&&win.document.getElementById('discover')?.classList.contains('in'))return;
    const lisbon=win.__totehm_lisbon?.();
    if(lisbon?.sequence==='phrase'||lisbon?.sequence==='art'||(type==='discover'&&lisbon?.board))return;
    event.preventDefault();event.stopImmediatePropagation();close();
   },true);
   // Activate the prepared controls before the visible frame accepts input.
   if(type!=='discover')win.dispatchEvent(new win.Event(config.event));
   frame.style.visibility='visible';frame.style.opacity='1';frame.style.pointerEvents='auto';
   stage='experience';frame.focus();
   if(type==='controller'&&win.__totehm_controller_entry?.().phase==='board')doc.getElementById('sdisc-board-close')?.focus({preventScroll:true});
  }catch(error){if(!disposed){console.warn('[experience entrance]',error?.name||'unavailable');fail();}}
 }
 frame.addEventListener('load',ready);frame.src=embedded.href;
 for(const [el]of siblings)el.inert=true;
 dialog.append(veil,frame);if(visual)dialog.append(visual.element);document.body.append(dialog);
 history.pushState({...state,totehmProjection:true},'',url.href);addEventListener('totehm:experience-navigate',navigate);
 if(visual){object.visible=false;}
 onStart();if(type==='controller'){veil.style.transition='opacity .16s ease';veil.style.opacity='.09';}
 addEventListener('popstate',pop);addEventListener('keydown',escape);timer=setTimeout(fail,25000);return true;
}
