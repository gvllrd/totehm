// The physical volume, its enlargement and the reader share this exact cover.
export const ORIGINS_COVER=Object.freeze({width:.7,height:.98,ratio:5/7,title:'ORIGINS',series:'Quantum · Wah',intentions:7,neon:true});
const TRACES=Object.freeze(['#E24B4A','#e48b31','#fcbe21','#378ADD','#1D9E75','#7F77DD','#639922']);
export function createOriginsCoverCanvas({onChange=()=>{}}={}){
 const canvas=document.createElement('canvas'),emissiveCanvas=document.createElement('canvas');
 for(const surface of [canvas,emissiveCanvas]){surface.width=1000;surface.height=1400;}
 const c=canvas.getContext('2d'),glow=emissiveCanvas.getContext('2d');let disposed=false;
 function traces(ctx){
  ctx.save();
  TRACES.forEach((ink,n)=>{
   const x=29+n*7.2;
   // A fine luminous filament, with its light contained in the black binding.
   ctx.shadowColor=ink;ctx.shadowBlur=12;ctx.globalAlpha=.55;ctx.fillStyle=ink;ctx.fillRect(x,176,2.4,1048);
   ctx.shadowBlur=0;ctx.globalAlpha=.94;ctx.fillRect(x+.6,176,1.2,1048);
   ctx.globalAlpha=.32;ctx.fillRect(x-.35,170,3.1,3);ctx.fillRect(x-.35,1227,3.1,3);
  });
  ctx.restore();
 }
 function draw(){
  if(disposed)return;
  c.fillStyle='#080809';c.fillRect(0,0,1000,1400);
  c.strokeStyle='#0f0f11';c.lineWidth=1.1;
  for(let n=-1500;n<1500;n+=7){c.beginPath();c.moveTo(n,0);c.lineTo(n+510,1400);c.stroke();}
  const depth=c.createLinearGradient(0,0,1000,0);depth.addColorStop(0,'#000');depth.addColorStop(.025,'#030304');depth.addColorStop(.12,'#09090a');depth.addColorStop(.85,'#09090a');depth.addColorStop(1,'#020203');c.globalAlpha=.72;c.fillStyle=depth;c.fillRect(0,0,1000,1400);c.globalAlpha=1;
  c.fillStyle='#020203';c.fillRect(0,0,18,1400);traces(c);
  c.textAlign='center';c.textBaseline='middle';c.fillStyle='#c4c5c2';c.font='700 93px "Space Mono",monospace';c.fillText('ORIGINS',510,660);
  c.fillStyle='#777a7e';c.font='20px "Space Mono",monospace';c.fillText('Quantum · Wah',510,757);
  glow.fillStyle='#000';glow.fillRect(0,0,1000,1400);traces(glow);
  onChange(canvas);
 }
 draw();document.fonts?.ready?.then(draw);
 return{canvas,emissiveCanvas,diagnostics:()=>({sharedOriginal:true,intentions:TRACES.length,neon:true,ratio:5/7}),dispose(){disposed=true;}};
}
