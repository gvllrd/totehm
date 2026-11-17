// The original first frame, shared by the exhibition and its own experience.
export const LISBON_FRONT_NAMES=Object.freeze(['fire_exit','Heli','aed','green_walk','red_walk','pharma','destination','lisboa_city_hall','speed_bump_caution','crosswalk_caution','no_entry','no_parking','hospital','parking','Hotel','dead_end','roundabout','left_or_straight','no_uturn','priority','crosswalk','stop']);
export const LISBON_FRONT_SIZE=Object.freeze({width:1600,height:900});
export function lisbonFrontSigns(time=0){
 return LISBON_FRONT_NAMES.map((name,i)=>{
  const top=i<9,bottom=i>=9&&i<18,edge=!top&&!bottom,k=top?i:bottom?i-9:i-18;
  const x=edge?(k%2?1460:140):105+k*174,y=top?122:bottom?778:310+Math.floor(k/2)*280;
  return{name,x:x+Math.sin(time*.095+i*1.73)*29,y:y+Math.cos(time*.11+i*1.31)*25,size:name==='destination'?310:138+(i%4)*24,rotation:Math.sin(time*.055+i*2.1)*.24};
 });
}
export function createLisbonFirstPage({width=1600,height=900,onChange=()=>{}}={}){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Make the Lisbon streets Higher. Twenty-two original urban signals floating in darkness.');
 const ctx=canvas.getContext('2d'),images=new Map();let time=0,reveal=0,disposed=false,loaded=false,animated=false,failures=0;
 const logo=new Image();let brand=false;
 function draw(){if(disposed)return;ctx.setTransform(width/1600,0,0,height/900,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,1600,900);
  for(const sign of lisbonFrontSigns(time)){const image=images.get(sign.name);if(!image)continue;const scale=Math.min(sign.size/image.naturalWidth,sign.size/image.naturalHeight);ctx.save();ctx.translate(sign.x,sign.y);ctx.rotate(sign.rotation);ctx.globalAlpha=.29;ctx.drawImage(image,-image.naturalWidth*scale/2,-image.naturalHeight*scale/2,image.naturalWidth*scale,image.naturalHeight*scale);ctx.restore();}
  if(reveal<1){ctx.save();ctx.globalAlpha=1-reveal;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#d5d5d5';ctx.font='700 73px "Space Mono",monospace';ctx.fillText('MAKE THE LISBON',800,350);ctx.fillText('STREETS',800,438);if(brand)ctx.drawImage(logo,620,495,360,120);ctx.restore();}onChange();
 }
 function image(src,then){return new Promise(resolve=>{const im=new Image();im.onload=()=>{if(disposed){resolve(false);return;}then(im);draw();resolve(true);};im.onerror=()=>{failures++;resolve(false);};im.src=src;});}
 const ready=Promise.all([...LISBON_FRONT_NAMES.map(name=>image('/assets/signs/'+name+'.png',im=>images.set(name,im))),new Promise(resolve=>{logo.onload=()=>{brand=true;draw();resolve(true);};logo.onerror=()=>{failures++;resolve(false);};logo.src='/assets/gallery/higher.svg';})]).then(()=>{loaded=true;draw();return!failures;});
 draw();document.fonts?.ready.then(draw);
 return{canvas,ready,update(dt,motion=true){animated=!!motion;if(!motion||disposed)return false;time+=Math.max(0,Math.min(Number(dt)||0,.1));draw();return true;},setTime(value){time=Math.max(0,Number(value)||0);draw();},setReveal(value){reveal=Math.max(0,Math.min(1,Number(value)||0));draw();},getSigns:()=>lisbonFrontSigns(time),dispose(){disposed=true;images.clear();},diagnostics:()=>({kind:'lisbon-canonical-first-page',time:+time.toFixed(4),loaded:images.size,ready:loaded,failures,signs:22,animated,dimmed:true,reveal,ratio:16/9,minimumSignSize:138,maximumSignSize:310})};
}
