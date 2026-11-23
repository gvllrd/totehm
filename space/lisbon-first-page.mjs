// One floating artwork, shared by the suspended screen and its experience.
export const LISBON_FRONT_NAMES=Object.freeze(['fire_exit','Heli','aed','green_walk','red_walk','pharma','destination','lisboa_city_hall','speed_bump_caution','crosswalk_caution','no_entry','no_parking','hospital','parking','Hotel','dead_end','roundabout','left_or_straight','no_uturn','priority','crosswalk','stop']);
export const LISBON_FRONT_SIZE=Object.freeze({width:1600,height:900});
export const LISBON_FRONT_COPY=Object.freeze({headline:'Make them useful for your brain',subtitle:'Neurological & Digital Street Art'});
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function signRow(sizes,y){
 const slots=sizes.map(size=>size*1.085+9);
 const gap=(1560-slots.reduce((sum,width)=>sum+width,0))/(slots.length+1);
 let edge=20+gap;
 return sizes.map((size,i)=>{
  const width=slots[i],x=edge+width/2;
  edge+=width+gap;
  return [x,y,size];
 });
}
const SIGN_LAYOUT=[
 ...signRow([138,138,138,138,138,138,250,145,138],141),
 ...signRow([149,150,155,144,147,148,145,151,155],766),
 [125,344,172],[1475,344,185],[125,576,174],[1475,576,165]
];
export function lisbonFrontSigns(time=0){
 return LISBON_FRONT_NAMES.map((name,i)=>{
  const [x,y,size]=SIGN_LAYOUT[i],rotation=Math.sin(time*.37+i*2.1)*.085;
  const extent=size*(Math.abs(Math.cos(rotation))+Math.abs(Math.sin(rotation)))/2;
  return{name,x:clamp(x+Math.sin(time*.53+i*1.73)*4.5,extent+20,1600-extent-20),y:clamp(y+Math.cos(time*.39+i*1.31)*9,extent+20,900-extent-20),size,rotation};
 });
}
export function createLisbonFirstPage({width=1600,height=900,onChange=()=>{}}={}){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',LISBON_FRONT_COPY.headline+'. '+LISBON_FRONT_COPY.subtitle+'. 22 floating Lisbon signs.');
 const ctx=canvas.getContext('2d'),images=new Map();let time=0,reveal=0,disposed=false,loaded=false,animated=false,failures=0;
 const signOpacity=()=>1-.71*reveal;
 function getDrawings(){
  return lisbonFrontSigns(time).flatMap(sign=>{
   const image=images.get(sign.name);
   if(!image)return [];
   const scale=sign.size/Math.max(image.naturalWidth,image.naturalHeight);
   return [{...sign,image,width:image.naturalWidth*scale,height:image.naturalHeight*scale}];
  });
 }
 function draw(){if(disposed)return;ctx.setTransform(width/1600,0,0,height/900,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,1600,900);
  for(const sign of getDrawings()){ctx.save();ctx.translate(sign.x,sign.y);ctx.rotate(sign.rotation);ctx.globalAlpha=signOpacity();ctx.drawImage(sign.image,-sign.width/2,-sign.height/2,sign.width,sign.height);ctx.restore();}
  if(reveal<1){
   ctx.save();ctx.globalAlpha=1-reveal;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#e1e2e8';ctx.font='700 60px "Space Mono",monospace';ctx.fillText(LISBON_FRONT_COPY.headline,800,427);
   ctx.fillStyle='#999aa6';ctx.font='400 23px "Space Mono",monospace';ctx.fillText(LISBON_FRONT_COPY.subtitle,800,501);ctx.restore();
  }onChange();
 }
 function image(src,then){return new Promise(resolve=>{const im=new Image();im.onload=()=>{if(disposed){resolve(false);return;}then(im);draw();resolve(true);};im.onerror=()=>{failures++;resolve(false);};im.src=src;});}
 const ready=Promise.all(LISBON_FRONT_NAMES.map(name=>image('/assets/signs/'+name+'.png',im=>images.set(name,im)))).then(()=>{loaded=true;draw();return!failures;});
 draw();document.fonts?.ready.then(draw);
 return{canvas,ready,update(dt,motion=true){animated=!!motion;if(!motion||disposed)return false;time+=Math.max(0,Math.min(Number(dt)||0,.1));draw();return true;},setTime(value){time=Math.max(0,Number(value)||0);draw();},setReveal(value){reveal=clamp(Number(value)||0,0,1);draw();},getSigns:()=>lisbonFrontSigns(time),getDrawings,getSignOpacity:signOpacity,dispose(){disposed=true;images.clear();},diagnostics:()=>({kind:'lisbon-canonical-first-page',time:+time.toFixed(4),loaded:images.size,ready:loaded,failures,signs:22,visibleSigns:images.size,titleOnly:false,headline:LISBON_FRONT_COPY.headline,subtitle:LISBON_FRONT_COPY.subtitle,animated,dimmed:reveal>0,signOpacity:signOpacity(),reveal,ratio:16/9,minimumSignSize:138,maximumSignSize:250})};
}
