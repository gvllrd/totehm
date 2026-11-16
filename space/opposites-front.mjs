import {OPPOSITES} from './gallery-opposites.mjs';
export const OPPOSITES_FRONT=Object.freeze({width:1920,height:1080,ratio:16/9,count:6,build:'2026-11-16-opposites-canonical-front'});
const clamp=n=>Math.max(0,Math.min(1,n));
export function oppositesFrontLayout(time=0){return OPPOSITES.map((work,i)=>{const row=Math.floor(i/3),column=i%3;return{...work,x:.23+column*.27+Math.sin(time*.18+i*.9)*.003,y:.32+row*.445+Math.sin(time*.25+i*.8)*.006,width:.25,height:.43,artHeight:.38};});}
export function createOppositesFront({width=1920,height=1080,onChange=()=>{}}={}){
 const canvas=globalThis.document?.createElement?.('canvas')||null;if(canvas){canvas.width=width;canvas.height=height;}
 const ctx=canvas?.getContext('2d'),images=new Map();let time=0,disposed=false,loaded=0,failed=0,highlight='',focus='',focusProgress=0,dirty=true;
 const invalidate=()=>{if(!disposed){dirty=true;draw();onChange();}};
 const ready=Promise.all(OPPOSITES.map(work=>new Promise(resolve=>{if(!globalThis.Image){resolve();return;}const image=new Image();image.onload=()=>{if(!disposed){images.set(work.id,image);loaded++;invalidate();}resolve();};image.onerror=()=>{failed++;invalidate();resolve();};image.src=work.image;}))).then(()=>{invalidate();return loaded===6;});
 function draw(){
  if(!ctx||disposed)return;const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.globalAlpha=1-focusProgress;ctx.fillStyle='#f0f0f1';ctx.font='700 '+Math.round(h*.039)+'px "Space Mono",monospace';ctx.fillText('THINK SAME BUT OPPOSITE',w*.5,h*.065);
  for(const box of oppositesFrontLayout(time)){
   const chosen=box.id===focus,p=chosen?focusProgress:0,alpha=chosen?1:1-focusProgress;
   const artHeight=h*(box.artHeight+(.78-box.artHeight)*p),artWidth=artHeight*200/356,x=w*(box.x+(.5-box.x)*p),y=h*(box.y+(.5-box.y)*p),image=images.get(box.id);
   ctx.globalAlpha=(highlight===box.id?1:.8)*alpha;
   if(image)ctx.drawImage(image,x-artWidth/2,y-artHeight/2,artWidth,artHeight);
   ctx.globalAlpha=(1-p)*alpha;ctx.font='400 '+Math.round(h*.013)+'px "Space Mono",monospace';ctx.fillStyle='#8e8e96';ctx.fillText(String(OPPOSITES.findIndex(work=>work.id===box.id)+1).padStart(2,'0'),x,y+artHeight/2+h*.027);
  }
  ctx.globalAlpha=1;dirty=false;
 }
 function update(dt=0,motion=true){if(disposed)return false;if(motion&&Number.isFinite(dt)&&dt>0){time+=Math.max(0,Math.min(dt,.25));dirty=true;}if(dirty)draw();return motion||dirty;}
 function hit(u,v){return oppositesFrontLayout(time).find(box=>Math.abs(u-box.x)<=box.width/2&&Math.abs(v-box.y)<=box.height/2)||null;}
 draw();globalThis.document?.fonts?.ready?.then(invalidate);
 return{canvas,ready,update,setTime(value){if(Number.isFinite(value)){time=Math.max(0,value);invalidate();}},setHighlight(id){highlight=OPPOSITES.some(w=>w.id===id)?id:'';invalidate();},setFocus(id,value=0){focus=id;focusProgress=clamp(value);invalidate();},hit,diagnostics:()=>({build:OPPOSITES_FRONT.build,canonical:true,ready:loaded===6,count:6,loaded,failed,time,focus,focusProgress,ids:OPPOSITES.map(w=>w.id),black:true,disposed}),dispose(){disposed=true;images.clear();}};
}
