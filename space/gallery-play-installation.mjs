import * as T from './vendor/three-0.180.0.mjs';
import {GALLERY_LAYOUT as L} from './gallery-modern-layout.mjs';

// The same original sign images and drift as the standalone page. Its
// controller, clips and access checks remain in that independent experience.
const SIGN_ROWS=[
 ['fire_exit','Fire exit',23.1,5.5,6.5,'To avoid a headache, stop thinking with your head.'],
 ['Heli','Helicopter',46.0,7.4,5.2,'The power of Habits: The sky is the limit.'],
 ['aed','Heart',70.1,5.5,6.5,'Consult your heart. The response is automatic.'],
 ['green_walk','Walk',33.7,9.0,3.8,'Advance with love. It leads to the best path.'],
 ['red_walk','Wait',33.7,16.5,3.8,'To stop mental bullsht: stay immobile one instant, avoid the crash.'],
 ['pharma','Pharmacy',20.8,22.5,10.0,'Attract all you love.'],
 ['destination','Higher Lisboa',40.1,9.5,18.5,'Elevation demands friction and aspiration.'],
 ['lisboa_city_hall','Lisboa',60.8,10.0,6.2,'Time creates the vibe. Travel creates discoveries.'],
 ['speed_bump_caution','Slow down',68.4,15.5,6.2,'Slow down! Come back to life urgently.'],
 ['crosswalk_caution','Crossing',63.5,27.0,5.6,'Intelligent grind needs strategy.'],
 ['no_entry','No entry',73.4,27.6,5.5,'Access denied to mental bullshit.'],
 ['no_parking','No parking',68.5,37.0,5.8,'Protect your strategy. Know your enemies.'],
 ['hospital','Hospital',46.8,37.0,3.8,'Healing is a process.'],
 ['parking','Parking',46.1,44.6,5.2,'Powerful Presence.'],
 ['Hotel','Hotel',46.0,55.0,5.6,'Hard fights lead to hard peace.'],
 ['dead_end','Dead end',20.4,51.0,6.9,'Action without preparation leads nowhere: Just do it.'],
 ['roundabout','Roundabout',32.9,49.5,10.2,'The supreme objective now is to appreciate the 360 of now.'],
 ['left_or_straight','Left or straight',56.9,49.5,10.2,'Yin / Yang. Feminine / Masculine. Inspiration / Expiration.'],
 ['no_uturn','No U-turn',69.8,49.7,8.8,'Never reverse intelligent decisions.'],
 ['priority','Priority',15.4,66.8,10.1,'Focus on your objectives, not the battles. They come by the way.'],
 ['crosswalk','Step by step',44.5,71.0,8.5,'Step by step is the road to success and the safest way.'],
 ['stop','Stop',73.3,66.0,11.6,'Yes, stop that sht.']
];
export const PLAY_SIGNS=Object.freeze(SIGN_ROWS.map(([id,title,left,top,width,phrase])=>Object.freeze({id,title,left,top,width,phrase,src:'/assets/signs/'+id+'.png'})));

// One canvas, one texture and the gallery's clock: the street signs float on
// the stone-mounted screen without starting another renderer or video player.
export function createPlayInstallation(scene,{mobile=false,onChange=()=>{},onOpen=()=>{}}={}){
 const href='/play_lisbon_street',root=new T.Group();root.name='Lisbon Streets — standalone experience portal';scene.add(root);
 const hasDOM=typeof document!=='undefined'&&typeof document.createElement==='function';
 const W=1280,H=720;
 const canvas=hasDOM?document.createElement('canvas'):null;
 if(canvas){canvas.width=mobile?1152:1536;canvas.height=canvas.width*9/16;}
 const context=canvas?.getContext('2d')||null;
 const screenTexture=canvas?new T.CanvasTexture(canvas):new T.DataTexture(new Uint8Array([0,0,0,255]),1,1);
 screenTexture.name='LISBON_SCREEN — 22 original floating Lisbon street signs';
 screenTexture.colorSpace=T.SRGBColorSpace;screenTexture.minFilter=T.LinearFilter;screenTexture.magFilter=T.LinearFilter;screenTexture.generateMipmaps=false;screenTexture.needsUpdate=true;
 const geometry=new T.PlaneGeometry(1,1),material=new T.MeshBasicMaterial({map:screenTexture,toneMapped:false});
 const screen=new T.Mesh(geometry,material);screen.name='PLAY_LISBON_SCREEN';screen.position.set(...L.play.screen);screen.scale.set(...L.play.screenSize,1);screen.rotation.y=L.play.rotationY||0;screen.userData={installation:'play',playAction:'open',href,wallMounted:true,support:'stone'};root.add(screen);
 const pickables=[screen];
 const images=new Map(),pendingImages=new Set(),important=new Set(['crosswalk','stop','no_entry','parking']);
 let disposed=false,active=false,focused=false,opened=false,clock=0,screenFrames=0,loadFailures=0,higherImage=null,higherTexture=null,coverReady=false,lastInput=null,opens=0,animated=false,lastDraw=-1;
 let seed=473294;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 // Values are copied from spawnRock/startAsteroids in play_lisbon_street.
 // A fixed logical viewport keeps the same movement on desktop and phone.
 const zone={x:W/2,y:H/2,width:Math.min(320,W*.46)+40,height:240};
 const signs=PLAY_SIGNS.map(sign=>{
  const size=important.has(sign.id)?44+random()*12:28+random()*14;
  let x,y;
  for(let attempt=0;attempt<20;attempt++){
   x=random()*(W-size);y=random()*(H-size);
   if(Math.abs(x+size/2-zone.x)>=zone.width||Math.abs(y+size/2-zone.y)>=zone.height)break;
  }
  return{...sign,size,x,y,vx:(random()*.06+.04)*(random()<.5?1:-1),vy:(random()*.06+.04)*(random()<.5?1:-1),rot:random()*360,vrot:(random()-.5)*.08};
 });
 const changed=()=>{if(!disposed)onChange();};
 const font=(size,bold=false)=>(bold?'700 ':'400 ')+Math.round(size)+'px "Space Mono",monospace';
 function sloganRow(before,after,centreY,size,colour,{bold=false,gap=size*.28}={}){
  context.font=font(size,bold);context.textBaseline='middle';context.textAlign='left';context.fillStyle=colour;
  const beforeWidth=before?context.measureText(before).width:0,afterWidth=after?context.measureText(after).width:0,logoH=size*1.16,logoW=logoH*3;
  let x=(W-beforeWidth-afterWidth-logoW-(before?gap:0)-(after?gap:0))/2;
  if(before){context.fillText(before,x,centreY);x+=beforeWidth+gap;}
  // Both occurrences of Higher use the original perforated brand SVG.
  if(higherImage)context.drawImage(higherImage,x,centreY-logoH/2,logoW,logoH);
  x+=logoW+(after?gap:0);if(after)context.fillText(after,x,centreY);
 }
 function drawCover(){
  if(disposed||!context)return false;
  context.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);context.fillStyle='#000';context.fillRect(0,0,W,H);
  for(const sign of signs){
   const image=images.get(sign.id);if(!image)continue;
   context.save();context.translate(sign.x+sign.size/2,sign.y+sign.size/2);context.rotate(sign.rot*Math.PI/180);
   // The original page puts each image in a square wrapper, including the
   // narrow green/red walk panels; keep that exact visual treatment here.
   context.drawImage(image,-sign.size/2,-sign.size/2,sign.size,sign.size);context.restore();
  }
  sloganRow('','the Lisbon Streets',H*.43,W/30,'#f0f0f3',{bold:true,gap:W*.016});
  sloganRow('Get','with a',H*.54,W/52,'#b9b9c3');
  context.font=font(W/52);context.fillStyle='#b9b9c3';context.textAlign='center';context.textBaseline='middle';context.fillText('Totehmpaper {THP} to get it',W/2,H*.60);
  screenTexture.needsUpdate=true;screenFrames++;lastDraw=clock;changed();return true;
 }
 if(hasDOM){
  higherTexture=new T.TextureLoader().load('/assets/gallery/higher.svg',texture=>{
   if(disposed){texture.dispose();return;}higherImage=texture.image;coverReady=images.size===PLAY_SIGNS.length;drawCover();
  },undefined,()=>{if(!disposed){loadFailures++;changed();}});
  for(const sign of signs){
   const image=document.createElement('img');pendingImages.add(image);
   image.onload=()=>{pendingImages.delete(image);if(disposed)return;images.set(sign.id,image);coverReady=!!higherImage&&images.size===PLAY_SIGNS.length;drawCover();};
   image.onerror=()=>{pendingImages.delete(image);if(!disposed){loadFailures++;changed();}};
   image.src=sign.src;
  }
 }
 function advanceSigns(dt){
  // The page's original frame-based model runs at 60 steps per second. Fixed
  // steps preserve its gentle collisions and repulsion across refresh rates.
  const steps=Math.max(1,Math.ceil(dt*60)),step=dt*60/steps,MAX_V=.12;
  for(let n=0;n<steps;n++){
   for(let i=0;i<signs.length;i++)for(let j=i+1;j<signs.length;j++){
    const a=signs[i],b=signs[j],dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy)||1,min=(a.size+b.size)/2+6;
    if(dist<min){
     const f=.015*(min-dist)/dist*step;a.vx-=dx*f;a.vy-=dy*f;b.vx+=dx*f;b.vy+=dy*f;
     for(const sign of [a,b]){const speed=Math.hypot(sign.vx,sign.vy);if(speed>MAX_V){sign.vx=sign.vx/speed*MAX_V;sign.vy=sign.vy/speed*MAX_V;}}
    }
   }
   for(const sign of signs){
    const dx=sign.x+sign.size/2-zone.x,dy=sign.y+sign.size/2-zone.y;
    if(Math.abs(dx)<zone.width&&Math.abs(dy)<zone.height){
     sign.vx+=(dx>0?.025:-.025)*step;sign.vy+=(dy>0?.025:-.025)*step;
     const speed=Math.hypot(sign.vx,sign.vy);if(speed>MAX_V){sign.vx=sign.vx/speed*MAX_V;sign.vy=sign.vy/speed*MAX_V;}
    }
    sign.x+=sign.vx*step;sign.y+=sign.vy*step;sign.rot+=sign.vrot*step;
    if(sign.x>W-sign.size){sign.x=W-sign.size;sign.vx=-Math.abs(sign.vx);}else if(sign.x<0){sign.x=0;sign.vx=Math.abs(sign.vx);}
    if(sign.y>H-sign.size){sign.y=H-sign.size;sign.vy=-Math.abs(sign.vy);}else if(sign.y<0){sign.y=0;sign.vy=Math.abs(sign.vy);}
   }
  }
 }
 function setActive(value){
  if(disposed)return false;
  const next=!!value,didChange=next!==active||next!==focused;active=focused=next;
  if(!next)opened=false;
  if(didChange)changed();return didChange;
 }
 function open(){
  if(disposed||opened)return false;
  opened=true;opens++;lastInput='open';changed();onOpen({href});return true;
 }
 function acceptHit(hit){return!!(hit?.object&&pickables.includes(hit.object));}
 function interact(value,hit=null){
  const intersection=value?.object?value:hit,object=intersection?.object||value;
  if(disposed||!pickables.includes(object))return false;
  active=focused=true;lastInput='screen';return open();
 }
 function handleKey(event){
  if(disposed||!active||!focused)return false;
  const key=typeof event==='string'?event:event.key;
  if(key==='Enter'&&!event?.repeat){lastInput='keyboard';return open();}
  return false;
 }
 drawCover();
 globalThis.document?.fonts?.ready?.then(()=>{if(!disposed)drawCover();});
 return{
  root,pickables,screen,controller:null,canvas,texture:screenTexture,open,handleKey,interact,acceptHit,setActive,
  update(dt,eye,moving=true){
   if(disposed)return false;
   const elapsed=Math.max(0,Math.min(Number(dt)||0,.1));animated=!!moving&&elapsed>0;
   if(!animated)return false;
   clock+=elapsed;advanceSigns(elapsed);
   // Upload only a small preview texture at 12/18 Hz, even while the gallery
   // camera renders at full rate. Reduced motion keeps the same still signs.
   if(clock-lastDraw<1/(mobile?12:18))return false;
   return drawCover();
  },
  diagnostics:()=>({kind:'lisbon-experience-portal',supported:hasDOM,portal:true,inGalleryPlayback:false,active,focused,view:'floating-signs',coverReady,loadFailures,loaded:images.size,signs:signs.length,animated,originalSignImages:true,matchingStandaloneDrift:true,collisionAvoidance:true,title:'Higher the Lisbon Streets',subtitle:'Get Higher with a Totehmpaper {THP} to get it',sloganSVG:'/assets/gallery/higher.svg',titleSloganSVG:true,subtitleSloganSVG:true,lastInput,opened,opens,playing:false,mediaState:'standalone',mediaSource:null,videoFrames:0,frames:screenFrames,parentClock:true,time:+clock.toFixed(3),physicalController:false,screen:screen.position.toArray(),screenSize:[screen.scale.x,screen.scale.y],wallMounted:true,support:'stone',controller:null,screenSignRects:signs.map(({id,x,y,size,rot})=>({id,x:x/W,y:y/H,width:size/W,height:size/H,rotation:rot})),standalone:href,textureSize:canvas?[canvas.width,canvas.height]:[1,1],disposed}),
  dispose(){if(disposed)return;disposed=true;active=focused=animated=false;for(const image of pendingImages){image.onload=image.onerror=null;image.removeAttribute('src');}pendingImages.clear();images.clear();screenTexture.dispose();higherTexture?.dispose();material.dispose();geometry.dispose();root.removeFromParent();root.clear();higherImage=null;if(canvas)canvas.width=canvas.height=1;}
 };
}
