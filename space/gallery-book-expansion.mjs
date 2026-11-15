import {Vector3} from './vendor/three-0.180.0.mjs';
import {createOriginsCoverCanvas} from './origins-cover.mjs';
let expanding=false;
export function expandOriginsBook(volume,camera,href,{reduced=false,beforeNavigate=()=>{}}={}){
 if(expanding)return;expanding=true;volume.updateWorldMatrix(true,false);camera.updateMatrixWorld();
 const points=[[-.35,.05,-.49],[.35,.05,-.49],[-.35,.05,.49],[.35,.05,.49]].map(p=>new Vector3(...p).applyMatrix4(volume.matrixWorld).project(camera));
 const xs=points.map(p=>(p.x+1)*innerWidth/2),ys=points.map(p=>(1-p.y)*innerHeight/2),cover=createOriginsCoverCanvas(),image=document.createElement('img'),veil=document.createElement('div');
 image.src=cover.canvas.toDataURL();image.alt='Origins — the original book';image.style.cssText='position:fixed;z-index:101;object-fit:fill;pointer-events:none';veil.style.cssText='position:fixed;inset:0;background:#000;z-index:100;pointer-events:none;opacity:0';
 const from={left:Math.min(...xs)+'px',top:Math.min(...ys)+'px',width:Math.max(1,Math.max(...xs)-Math.min(...xs))+'px',height:Math.max(1,Math.max(...ys)-Math.min(...ys))+'px'},h=Math.min(innerHeight*.76,innerWidth*.88*7/5),w=h*5/7;
 Object.assign(image.style,from);document.body.append(veil,image);let navigated=false;const navigate=()=>{if(navigated)return;navigated=true;beforeNavigate();location.assign(href);};
 addEventListener('pageshow',event=>{if(event.persisted){expanding=false;image.remove();veil.remove();cover.dispose();}},{once:true});
 if(reduced||typeof image.animate!=='function'){navigate();return;}
 veil.animate([{opacity:0},{opacity:1}],{duration:480,fill:'forwards'});image.animate([from,{left:(innerWidth-w)/2+'px',top:(innerHeight-h)/2+'px',width:w+'px',height:h+'px'}],{duration:480,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'}).finished.then(navigate,navigate);
}
