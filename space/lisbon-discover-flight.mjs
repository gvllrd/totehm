import {LISBON_FRONT_SIZE} from './lisbon-first-page.mjs';
import {createLisbonCrosswalkPaint} from './lisbon-ground-markings.mjs';

export function drawLisbonSignQuad(context,image,corners){
 const [tl,tr,br,bl]=corners;
 function triangle(a,b,c,xx,xy,yx,yy,tx,ty){
  context.save();
  context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.lineTo(c.x,c.y);context.closePath();context.clip();
  context.transform(xx,xy,yx,yy,tx,ty);
  context.drawImage(image,0,0,1,1);
  context.restore();
 }
 triangle(tl,tr,bl,tr.x-tl.x,tr.y-tl.y,bl.x-tl.x,bl.y-tl.y,tl.x,tl.y);
 triangle(tr,br,bl,br.x-bl.x,br.y-bl.y,br.x-tr.x,br.y-tr.y,tr.x+bl.x-br.x,tr.y+bl.y-br.y);
}

const unit=value=>Math.max(0,Math.min(1,value));
const ease=value=>value*value*(3-2*value);
function discoverCorners(drawing,rect){
 const {x,y,width,height,rotation}=drawing,cos=Math.cos(rotation),sin=Math.sin(rotation);
 return [[-width/2,-height/2],[width/2,-height/2],[width/2,height/2],[-width/2,height/2]].map(([u,v])=>({
  x:rect.left+(x+u*cos-v*sin)*rect.width/LISBON_FRONT_SIZE.width,
  y:rect.top+(y+u*sin+v*cos)*rect.height/LISBON_FRONT_SIZE.height
 }));
}

export function startLisbonDiscoverFlight(host,firstPage,source,onLand){
 const drawings=firstPage.getDrawings();
 if(!Array.isArray(source)||source.length!==22||drawings.length!==22)return null;
 const origins=new Map(source.map(({id,corners})=>[id,corners]));
 if(drawings.some(({name})=>origins.get(name)?.length!==4||
  origins.get(name).some(({x,y})=>!Number.isFinite(x)||!Number.isFinite(y))))return null;
 const canvas=document.createElement('canvas');canvas.id='discover-sign-flight';canvas.setAttribute('aria-hidden','true');
 const context=canvas.getContext('2d');
 if(!context)return null;
 const crosswalk=createLisbonCrosswalkPaint();
 const root=document.documentElement;
 let raf,start,width,height,positions,resolve,progress=0,active=true;
 const finished=new Promise(done=>{resolve=done;});

 function resize(){
  width=innerWidth;height=innerHeight;
  const scale=Math.min(devicePixelRatio,1.5);
  canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  context.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
  const rect=firstPage.canvas.getBoundingClientRect();
  positions=drawings.map(drawing=>({
   drawing,from:origins.get(drawing.name).map(({x,y})=>({x:x*width,y:y*height})),
   to:discoverCorners(drawing,rect)
  }));
 }
 function paint(){
  context.clearRect(0,0,width,height);
  context.fillStyle='#000';context.globalAlpha=ease(unit((progress-.07)/.79));
  context.fillRect(0,0,width,height);
  positions.forEach(({drawing,from,to},i)=>{
   const t=ease(unit((progress-i%5*.023)/(1-i%5*.023)));
   const arc=Math.sin(Math.PI*t)*Math.min(30,Math.hypot(to[0].x-from[0].x,to[0].y-from[0].y)*.065)*(i%2?1:-1);
   const corners=from.map((point,j)=>({x:point.x+(to[j].x-point.x)*t,y:point.y+(to[j].y-point.y)*t+arc}));
   const opacity=1-.71*ease(unit((progress-.64)/.36));
   if(drawing.name==='crosswalk'&&progress<1){
    const blend=ease(unit((progress-.76)/.24));
    context.globalAlpha=opacity*(1-blend);drawLisbonSignQuad(context,crosswalk,corners);
    if(blend===0)return;
    context.globalAlpha=opacity*blend;
   }else context.globalAlpha=opacity;
   drawLisbonSignQuad(context,drawing.image,corners);
  });
  context.globalAlpha=1;
 }
 function finish(landed){
  if(!active)return;
  active=false;cancelAnimationFrame(raf);
  if(landed)firstPage.setReveal(1);
  canvas.remove();root.classList.remove('is-discover-flight');
  if(landed)onLand();
  resolve(landed);
 }
 function tick(now){
  start??=now;
  progress=unit((now-start)/1050);
  if(width!==innerWidth||height!==innerHeight)resize();
  if(progress===1){finish(true);return;}
  paint();raf=requestAnimationFrame(tick);
 }
 root.classList.add('is-discover-flight');host.append(canvas);
 resize();paint();raf=requestAnimationFrame(tick);
 return{finished,cancel:()=>finish(false),diagnostics:()=>({progress,signs:positions.length})};
}
