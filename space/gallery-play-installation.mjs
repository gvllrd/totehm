import * as T from './vendor/three-0.180.0.mjs';

// These are the same signs, controller positions, phrases and PUBLIC artwork
// clips as /play_lisbon_street. Acquisition stays on the existing server-backed
// pages; no price, entitlement or private media is copied into this installation.
const PUBLIC_CLIPS='https://abujjbkbbiumxrokozph.supabase.co/storage/v1/object/public/play-signals/';
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

export function createPlayInstallation(scene,{mobile=false,onChange=()=>{},onRequestAccess=()=>{}}={}){
 const root=new T.Group();root.name='Play the Lisbon Street — the living-room installation';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),pickables=[],images=new Map(),alphaMasks=new Map(),signMeshes=new Map();
 const ownGeometry=g=>(geometries.add(g),g),ownMaterial=m=>(materials.add(m),m),ownTexture=t=>(textures.add(t),t);
 const changed=()=>{if(!disposed)onChange();};
 const hasDOM=typeof document!=='undefined'&&typeof document.createElement==='function';
 const canvas=hasDOM?document.createElement('canvas'):null;
 if(canvas){canvas.width=mobile?1024:1536;canvas.height=Math.round(canvas.width*9/16);}
 const context=canvas?.getContext('2d')||null;
 const screenTexture=ownTexture(canvas?new T.CanvasTexture(canvas):new T.DataTexture(new Uint8Array([0,0,0,255]),1,1));
 screenTexture.name='PLAY_LISBON_SCREEN — public artwork controlled by visitor input';screenTexture.colorSpace=T.SRGBColorSpace;screenTexture.minFilter=T.LinearFilter;screenTexture.magFilter=T.LinearFilter;screenTexture.generateMipmaps=false;screenTexture.needsUpdate=true;
 let disposed=false,active=false,focused=false,selected=6,mediaSign=null,mediaState='idle',screenFrames=0,videoFrames=0,lastMediaTime=-1,drawClock=0,clock=0,selectionRevision=0,loaded=0,loadFailures=0,lastInput=null;
 let frameDirty=true,gamepadButtons=[],lastGamepadAxis=0;
 const video=hasDOM?document.createElement('video'):null;
 if(video){video.crossOrigin='anonymous';video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='none';video.setAttribute('playsinline','');video.setAttribute('aria-label','Play the Lisbon Street artwork');}
 const sharedPlane=ownGeometry(new T.PlaneGeometry(1,1));
 const screenMaterial=ownMaterial(new T.MeshBasicMaterial({map:screenTexture,toneMapped:false}));
 const screen=new T.Mesh(sharedPlane,screenMaterial);screen.name='PLAY_LISBON_SCREEN';screen.position.set(8,3.1,-16.18);screen.scale.set(7,3.9,1);screen.userData={installation:'play',playAction:'toggle'};root.add(screen);pickables.push(screen);

 // An understated physical controller: the original sign arrangement is laid
 // on a black acrylic tablet, with each real PNG an individually picked key.
 const shape=new T.Shape(),w=2.34,d=1.68,r=.10;
 shape.moveTo(-w/2+r,-d/2);shape.lineTo(w/2-r,-d/2);shape.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);shape.lineTo(w/2,d/2-r);shape.quadraticCurveTo(w/2,d/2,w/2-r,d/2);shape.lineTo(-w/2+r,d/2);shape.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);shape.lineTo(-w/2,-d/2+r);shape.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
 const controllerGeometry=ownGeometry(new T.ExtrudeGeometry(shape,{depth:.026,bevelEnabled:true,bevelSize:.005,bevelThickness:.005,bevelSegments:2,curveSegments:6}));
 const controllerMaterial=ownMaterial(new T.MeshStandardMaterial({color:0x050506,roughness:.37,metalness:.25}));
 const controller=new T.Mesh(controllerGeometry,controllerMaterial);controller.name='PLAY_LISBON_CONTROLLER';controller.rotation.x=-Math.PI/2;controller.position.set(8,.555,-10.4);controller.receiveShadow=true;controller.userData={installation:'play',playAction:'toggle'};root.add(controller);pickables.push(controller);
 const BOARD={x:128,y:12,width:768,height:540},worldScale=2.25/BOARD.width;
 const loader=hasDOM?new T.TextureLoader():null;
 for(const sign of PLAY_SIGNS){
  const size=sign.width/100*1024,x=sign.left/100*1024,y=sign.top/100*576;
  const mat=ownMaterial(new T.MeshBasicMaterial({color:0xffffff,transparent:true,alphaTest:.06,toneMapped:false,side:T.DoubleSide}));
  const key=new T.Mesh(sharedPlane,mat);key.name='Lisbon controller — '+sign.id;key.rotation.x=-Math.PI/2;
  key.position.set(8+(x+size/2-BOARD.x-BOARD.width/2)*worldScale,.596,-10.4+(y+size/2-BOARD.y-BOARD.height/2)*worldScale);key.scale.set(size*worldScale,size*worldScale,1);
  key.userData={installation:'play',signId:sign.id,playAction:'sign',sourceLayout:[sign.left,sign.top,sign.width]};root.add(key);pickables.push(key);signMeshes.set(sign.id,key);
  if(loader){
   const texture=ownTexture(loader.load(sign.src,loadedTexture=>{
    if(disposed){loadedTexture.dispose();return;}
    loaded++;images.set(sign.id,loadedTexture.image);
    // Alpha-aware hit testing prevents a transparent corner of one sign from
    // stealing the neighbouring key, while retaining the exact original PNG.
    try{const a=document.createElement('canvas');a.width=a.height=128;const ctx=a.getContext('2d');ctx.drawImage(loadedTexture.image,0,0,128,128);alphaMasks.set(sign.id,ctx.getImageData(0,0,128,128).data);}catch{}
    frameDirty=true;drawScreen();changed();
   },undefined,()=>{if(!disposed){loadFailures++;frameDirty=true;drawScreen();changed();}}));
   texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;mat.map=texture;
  }
 }
 function selectedSign(){return PLAY_SIGNS[selected];}
 function highlight(){for(const [id,mesh]of signMeshes){const isSelected=id===selectedSign().id;mesh.position.y=isSelected?.604:.596;mesh.material.color.setRGB(isSelected?1:.83,isSelected?1:.83,isSelected?1:.83);}}
 function textLines(text,maxWidth,font){
  context.font=font;const lines=[];let line='';for(const word of text.split(' ')){const next=line?line+' '+word:word;if(line&&context.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;
 }
 function drawBoard(){
  const W=canvas.width,H=canvas.height,scale=Math.min((W-100)/BOARD.width,(H-92)/BOARD.height),ox=(W-BOARD.width*scale)/2,oy=(H-BOARD.height*scale)/2-12;
  for(const sign of PLAY_SIGNS){const image=images.get(sign.id);if(!image)continue;const size=sign.width/100*1024;const x=ox+(sign.left/100*1024-BOARD.x)*scale,y=oy+(sign.top/100*576-BOARD.y)*scale;context.globalAlpha=sign.id===selectedSign().id?1:.84;context.drawImage(image,x,y,size*scale,size*scale);}
  context.globalAlpha=1;
 }
 function drawScreen(){
  if(disposed||!context)return false;
  const W=canvas.width,H=canvas.height;context.setTransform(1,0,0,1,0,0);context.fillStyle='#000';context.fillRect(0,0,W,H);
  const canDrawVideo=video&&mediaSign===selectedSign().id&&video.readyState>=2&&['playing','paused','loading'].includes(mediaState)&&video.videoWidth>0;
  if(canDrawVideo){
   const size=Math.min(W/video.videoWidth,(H-76)/video.videoHeight),vw=video.videoWidth*size,vh=video.videoHeight*size;
   try{context.drawImage(video,(W-vw)/2,(H-76-vh)/2,vw,vh);videoFrames++;lastMediaTime=video.currentTime;}catch{mediaState='error';drawBoard();}
   const image=images.get(selectedSign().id);if(image)context.drawImage(image,22,20,72,72);
   if(video.duration>0&&Number.isFinite(video.duration)){context.fillStyle='#26262a';context.fillRect(0,H-78,W,2);context.fillStyle='#d5d5da';context.fillRect(0,H-78,W*Math.min(1,video.currentTime/video.duration),2);}
  }else drawBoard();
  context.fillStyle=mediaState==='error'?'#aaa':'#ddd';context.textAlign='center';context.textBaseline='middle';
  const font=Math.round(W/68)+'px "Space Mono", monospace',lines=textLines(selectedSign().phrase,W*.82,font).slice(0,2);
  lines.forEach((line,index)=>context.fillText(line,W/2,H-43+(index-(lines.length-1)/2)*27));
  if(mediaState==='paused'&&canDrawVideo){context.fillStyle='rgba(0,0,0,.48)';context.beginPath();context.arc(W/2,H*.45,38,0,Math.PI*2);context.fill();context.fillStyle='#ddd';context.beginPath();context.moveTo(W/2-8,H*.45-14);context.lineTo(W/2+16,H*.45);context.lineTo(W/2-8,H*.45+14);context.fill();}
  screenTexture.needsUpdate=true;screenFrames++;frameDirty=false;changed();return true;
 }
 const onPlaying=()=>{if(disposed)return;if(!active||mediaSign!==selectedSign().id){video.pause();return;}mediaState='playing';frameDirty=true;changed();};
 const onPause=()=>{if(disposed)return;if(mediaState==='playing')mediaState='paused';frameDirty=true;changed();};
 const onData=()=>{if(disposed)return;frameDirty=true;drawScreen();changed();};
 const onError=()=>{if(disposed||!mediaSign)return;mediaState='error';frameDirty=true;drawScreen();changed();};
 const onEnded=()=>{if(disposed||!mediaSign)return;mediaState='ended';frameDirty=true;drawScreen();changed();};
 if(video){video.addEventListener('playing',onPlaying);video.addEventListener('pause',onPause);video.addEventListener('loadeddata',onData);video.addEventListener('error',onError);video.addEventListener('ended',onEnded);}
 function setActive(value){if(disposed)return false;const next=!!value;if(active===next)return false;active=next;if(!active){focused=false;video?.pause();if(mediaState==='loading'||mediaState==='playing')mediaState='paused';}frameDirty=true;drawScreen();changed();return true;}
 function activateSign(id){
  if(disposed)return false;const index=PLAY_SIGNS.findIndex(sign=>sign.id===id);if(index<0)return false;
  selected=index;active=focused=true;lastInput='sign:'+id;selectionRevision++;highlight();frameDirty=true;
  if(!video){mediaState='unavailable';return false;}
  video.pause();mediaSign=id;mediaState='loading';lastMediaTime=-1;
  video.src=PUBLIC_CLIPS+encodeURIComponent(id)+'.mp4';video.load();drawScreen();changed();
  const revision=selectionRevision;
  const started=video.play();started?.catch(()=>{if(!disposed&&revision===selectionRevision){mediaState='paused';frameDirty=true;drawScreen();changed();}});
  return true;
 }
 function nextSign(step=1){
  if(disposed)return false;const amount=Math.trunc(Number(step));if(!Number.isFinite(amount)||!amount)return false;
  const next=((selected+amount)%PLAY_SIGNS.length+PLAY_SIGNS.length)%PLAY_SIGNS.length;if(next===selected)return false;
  // Selection is separate from Enter/Play. Never show the previous artwork
  // under the newly selected sign's phrase while its clip is still running.
  selectionRevision++;video?.pause();selected=next;mediaSign=null;mediaState='idle';lastMediaTime=-1;
  lastInput='select:'+selectedSign().id;highlight();frameDirty=true;drawScreen();changed();return true;
 }
 function togglePlayback(){
  if(disposed)return false;active=focused=true;lastInput='toggle';
  if(!video)return false;
  if(!video.paused){video.pause();mediaState='paused';drawScreen();return true;}
  if(!video.src||mediaState==='idle'||mediaState==='error'||mediaState==='ended'||!video.src.endsWith('/'+encodeURIComponent(selectedSign().id)+'.mp4'))return activateSign(selectedSign().id);
  mediaState='loading';const revision=selectionRevision;video.play()?.catch(()=>{if(!disposed&&revision===selectionRevision){mediaState='paused';frameDirty=true;changed();}});frameDirty=true;changed();return true;
 }
 function acceptHit(hit){
  if(!hit?.object||!pickables.includes(hit.object))return false;
  const mask=alphaMasks.get(hit.object.userData.signId);if(!mask||!hit.uv)return true;
  const x=Math.max(0,Math.min(127,Math.floor(hit.uv.x*128))),y=Math.max(0,Math.min(127,Math.floor((1-hit.uv.y)*128)));
  return mask[(y*128+x)*4+3]>18;
 }
 function interact(value,hit=null){const object=value?.object||value||hit?.object;if(disposed||!pickables.includes(object))return false;if(value?.object&&!acceptHit(value))return false;focused=active=true;return object.userData.signId?activateSign(object.userData.signId):togglePlayback();}
 function handleKey(event){
  if(disposed||!active)return false;const key=typeof event==='string'?event:event.key;
  if(['ArrowRight','ArrowDown'].includes(key)){nextSign(1);return true;}
  if(['ArrowLeft','ArrowUp'].includes(key)){nextSign(-1);return true;}
  if(key==='Enter'){activateSign(selectedSign().id);return true;}
  if(key===' '||key==='Space'){togglePlayback();return true;}
  if(key==='Escape'){setActive(false);return true;}
  return false;
 }
 function pollGamepad(){
  if(!active||!focused||!globalThis.navigator?.getGamepads)return false;
  let pad;try{pad=Array.from(navigator.getGamepads()||[]).find(Boolean);}catch{return false;}if(!pad)return false;
  let did=false;const pressed=pad.buttons.map(button=>!!button.pressed);
  for(const index of [0,1,12,13,14,15])if(pressed[index]&&!gamepadButtons[index]){if(index===0)did=activateSign(selectedSign().id)||did;else if(index===1)did=togglePlayback()||did;else did=nextSign(index===12||index===14?-1:1)||did;}
  const axis=Math.abs(pad.axes[0]||0)>.65?Math.sign(pad.axes[0]):0;if(axis&&axis!==lastGamepadAxis)did=nextSign(axis)||did;
  gamepadButtons=pressed;lastGamepadAxis=axis;return did;
 }
 highlight();drawScreen();
 return{
  root,pickables,screen,controller,canvas,texture:screenTexture,activateSign,nextSign,togglePlayback,handleKey,interact,acceptHit,setActive,
  getSigns:()=>PLAY_SIGNS,
  requestAccess(){if(!disposed)onRequestAccess({href:'/play_lisbon_street',sign:selectedSign().id});},
  update(dt,eye,motion){if(disposed)return false;clock+=Math.max(0,Math.min(Number(dt)||0,.1));const gamepad=pollGamepad();if(!active)return gamepad;drawClock+=Math.max(0,Math.min(Number(dt)||0,.1));if(video&&!video.paused&&video.readyState>=2&&video.currentTime!==lastMediaTime&&drawClock>=1/15){drawClock=0;return drawScreen()||gamepad;}if(frameDirty)return drawScreen()||gamepad;return gamepad;},
  diagnostics:()=>({kind:'interactive-lisbon-lounge',supported:hasDOM,signs:PLAY_SIGNS.length,loaded,loadFailures,active,focused,selectedSign:selectedSign().id,mediaSign,selectionRevision,lastInput,playing:!!video&&!video.paused&&mediaState==='playing',mediaState,mediaSource:video?.getAttribute('src')||null,mediaTime:video?+video.currentTime.toFixed(3):0,muted:video?.muted??true,frames:screenFrames,videoFrames,parentClock:true,time:+clock.toFixed(3),originalLayout:true,publicMedia:true,privateMedia:false,screen:[8,3.1,-16.18],controller:[8,.596,-10.4],standalone:'/play_lisbon_street',disposed}),
  dispose(){if(disposed)return;disposed=true;active=focused=false;if(video){video.pause();video.removeEventListener('playing',onPlaying);video.removeEventListener('pause',onPause);video.removeEventListener('loadeddata',onData);video.removeEventListener('error',onError);video.removeEventListener('ended',onEnded);video.removeAttribute('src');video.load();}for(const texture of textures)texture.dispose();for(const material of materials)material.dispose();for(const geometry of geometries)geometry.dispose();root.removeFromParent();root.clear();images.clear();alphaMasks.clear();signMeshes.clear();if(canvas)canvas.width=canvas.height=1;}
 };
}
