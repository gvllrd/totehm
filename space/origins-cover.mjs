// The physical volume, its enlargement and the reader share this exact cover.
export const ORIGINS_COVER=Object.freeze({
 width:.7,height:.98,ratio:5/7,title:'ORIGINS',series:'Quantum · Wah',
 font:'Quantico',weight:700,ink:'#fbd5ca',intentions:0,neon:false
});
export function createOriginsCoverCanvas({onChange=()=>{}}={}){
 const canvas=document.createElement('canvas');
 canvas.width=1000;canvas.height=1400;
 const c=canvas.getContext('2d');
 const {title,series,font,weight,ink}=ORIGINS_COVER;
 const titleFont=`${weight} 114px "${font}",sans-serif`;
 let disposed=false;
 function draw(){
  if(disposed)return;
  const binding=c.createLinearGradient(0,0,canvas.width,0);
  binding.addColorStop(0,'#000');
  binding.addColorStop(.043,'#030303');
  binding.addColorStop(.18,'#0b0b0b');
  binding.addColorStop(.74,'#070707');
  binding.addColorStop(1,'#020202');
  c.fillStyle=binding;c.fillRect(0,0,canvas.width,canvas.height);
  const shade=c.createRadialGradient(520,580,180,520,580,840);
  shade.addColorStop(0,'#0000');shade.addColorStop(1,'#000b');
  c.fillStyle=shade;c.fillRect(0,0,canvas.width,canvas.height);
  c.textAlign='center';c.textBaseline='middle';c.fillStyle=ink;
  c.font=titleFont;c.fillText(title,515,655);
  c.font=`${weight} 31px "${font}",sans-serif`;c.fillText(series,515,757);
  onChange(canvas);
 }
 draw();
 // The 3D scene can use Quantico exclusively on this canvas.
 document.fonts?.load(titleFont,title+' '+series).then(draw,()=>{});
 return{canvas,diagnostics:()=>({sharedOriginal:true,intentions:0,neon:false,ratio:ORIGINS_COVER.ratio,font,weight,ink}),dispose(){disposed=true;}};
}
