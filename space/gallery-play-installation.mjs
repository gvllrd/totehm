import * as T from './vendor/three-0.180.0.mjs';

// Original sign metadata remains exported for existing callers. No controller
// image or clip is downloaded by the Space portal; playback stays in its page.
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

// Space is the immersive entrance. The actual controller, original clips,
// access checks and playback belong exclusively to the standalone HTML page.
export function createPlayInstallation(scene,{mobile=false,onChange=()=>{},onOpen=()=>{}}={}){
 const href='/play_lisbon_street',root=new T.Group();root.name='Lisbon Streets — standalone experience portal';scene.add(root);
 const hasDOM=typeof document!=='undefined'&&typeof document.createElement==='function';
 const canvas=hasDOM?document.createElement('canvas'):null;
 if(canvas){canvas.width=mobile?1536:2048;canvas.height=canvas.width*9/16;}
 const context=canvas?.getContext('2d')||null;
 const screenTexture=canvas?new T.CanvasTexture(canvas):new T.DataTexture(new Uint8Array([0,0,0,255]),1,1);
 screenTexture.name='LISBON_SCREEN — static standalone experience cover';
 screenTexture.colorSpace=T.SRGBColorSpace;screenTexture.minFilter=T.LinearMipmapLinearFilter;screenTexture.magFilter=T.LinearFilter;screenTexture.generateMipmaps=true;screenTexture.anisotropy=4;screenTexture.needsUpdate=true;
 const geometry=new T.PlaneGeometry(1,1),material=new T.MeshBasicMaterial({map:screenTexture,toneMapped:false});
 const screen=new T.Mesh(geometry,material);screen.name='PLAY_LISBON_SCREEN';screen.position.set(8,3.1,-16.18);screen.scale.set(7,3.9,1);screen.userData={installation:'play',playAction:'open',href};root.add(screen);
 const pickables=[screen];
 let disposed=false,active=false,focused=false,opened=false,clock=0,screenFrames=0,loadFailures=0,higherImage=null,higherTexture=null,coverReady=false,lastInput=null,opens=0;
 const changed=()=>{if(!disposed)onChange();};
 const font=(size,bold=false)=>(bold?'700 ':'400 ')+Math.round(size)+'px "Space Mono",monospace';
 function sloganRow(before,after,centreY,size,colour,{bold=false,gap=size*.28}={}){
  context.font=font(size,bold);context.textBaseline='middle';context.textAlign='left';context.fillStyle=colour;
  const beforeWidth=before?context.measureText(before).width:0,afterWidth=after?context.measureText(after).width:0,logoH=size*1.16,logoW=logoH*3;
  let x=(canvas.width-beforeWidth-afterWidth-logoW-(before?gap:0)-(after?gap:0))/2;
  if(before){context.fillText(before,x,centreY);x+=beforeWidth+gap;}
  // Both occurrences of Higher use the original perforated brand SVG.
  if(higherImage)context.drawImage(higherImage,x,centreY-logoH/2,logoW,logoH);
  x+=logoW+(after?gap:0);if(after)context.fillText(after,x,centreY);
 }
 function drawCover(){
  if(disposed||!context)return false;
  const W=canvas.width,H=canvas.height;
  context.setTransform(1,0,0,1,0,0);context.fillStyle='#000';context.fillRect(0,0,W,H);
  // A quiet exhibition cover stays sharp at every distance. It is never a
  // low-resolution duplicate player competing with the landscape renderer.
  sloganRow('','Lisbon Streets',H*.36,W/18,'#f0f0f3',{bold:true,gap:W*.02});
  sloganRow('Get','with a',H*.54,W/38,'#b9b9c3');
  context.font=font(W/38);context.fillStyle='#b9b9c3';context.textAlign='center';context.textBaseline='middle';context.fillText('Totehmpaper {THP} to get it',W/2,H*.61);
  const bx=W*.416,by=H*.77,bw=W*.168,bh=H*.108;
  context.strokeStyle='#777782';context.lineWidth=Math.max(1,W/1536);context.strokeRect(bx,by,bw,bh);
  context.font=font(W/59);context.fillStyle='#eeeeef';context.fillText('PLAY',W/2,by+bh/2);
  screenTexture.needsUpdate=true;screenFrames++;changed();return true;
 }
 if(hasDOM){
  higherTexture=new T.TextureLoader().load('/assets/gallery/higher.svg',texture=>{
   if(disposed){texture.dispose();return;}higherImage=texture.image;coverReady=true;drawCover();
  },undefined,()=>{if(!disposed){loadFailures++;changed();}});
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
  update(dt){if(disposed)return false;clock+=Math.max(0,Math.min(Number(dt)||0,.1));return false;},
  diagnostics:()=>({kind:'lisbon-experience-portal',supported:hasDOM,portal:true,inGalleryPlayback:false,active,focused,view:'cover',coverReady,loadFailures,loaded:coverReady?1:0,signs:0,title:'Higher Lisbon Streets',subtitle:'Get Higher with a Totehmpaper {THP} to get it',sloganSVG:'/assets/gallery/higher.svg',titleSloganSVG:true,subtitleSloganSVG:true,lastInput,opened,opens,playing:false,mediaState:'standalone',mediaSource:null,videoFrames:0,frames:screenFrames,parentClock:true,time:+clock.toFixed(3),physicalController:false,screen:[8,3.1,-16.18],controller:null,screenSignRects:[],standalone:href,textureSize:canvas?[canvas.width,canvas.height]:[1,1],disposed}),
  dispose(){if(disposed)return;disposed=true;active=focused=false;screenTexture.dispose();higherTexture?.dispose();material.dispose();geometry.dispose();root.removeFromParent();root.clear();higherImage=null;if(canvas)canvas.width=canvas.height=1;}
 };
}
