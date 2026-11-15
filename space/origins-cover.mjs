// One authored cover for the physical volume and its full-screen reader.
export const ORIGINS_COVER=Object.freeze({width:.7,height:.98,ratio:5/7,title:'ORIGINS',series:'Quantum · Wah'});
export function createOriginsCoverCanvas({onChange=()=>{}}={}){
 const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1400;const c=canvas.getContext('2d');let disposed=false;
 function draw(){if(disposed)return;c.fillStyle='#101010';c.fillRect(0,0,1000,1400);c.strokeStyle='#171717';c.lineWidth=2;for(let n=-1500;n<1500;n+=7){c.beginPath();c.moveTo(n,0);c.lineTo(n+510,1400);c.stroke();}c.fillStyle='#090909';c.fillRect(0,0,18,1400);['#E24B4A','#e48b31','#fcbe21','#378ADD','#1D9E75','#7F77DD','#639922'].forEach((ink,n)=>{c.globalAlpha=.66;c.fillStyle=ink;c.fillRect(24+n*6.7,168,2.2,1064);});c.globalAlpha=1;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#b2b0a7';c.font='700 93px "Space Mono",monospace';c.fillText('ORIGINS',510,660);c.fillStyle='#77766f';c.font='20px "Space Mono",monospace';c.fillText('Quantum · Wah',510,757);onChange(canvas);}
 draw();document.fonts?.ready?.then(draw);return{canvas,dispose(){disposed=true;}};
}
