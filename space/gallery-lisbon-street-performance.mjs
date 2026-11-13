import * as T from './vendor/three-0.180.0.mjs';
import {LISBON_DOME_SIGNS} from './gallery-lisbon-dome-layout.mjs';

const VIDEO_BASE='https://abujjbkbbiumxrokozph.supabase.co/storage/v1/object/public/play-signals/';
const byId=new Map(LISBON_DOME_SIGNS.map(sign=>[sign.id,sign]));
export const streetClipUrl=id=>byId.has(id)?VIDEO_BASE+id+'.mp4':null;

// The artist's original animations inhabit one world-space surface. Their
// black matte is removed, leaving the island and architecture visible through
// the picture. One decoder, loaded only by a gesture, serves all 22 works.
export function createStreetPerformance(parent,{onChange=()=>{}}={}){
 const root=new T.Group();root.name='Play the Lisbon Street — original animation in the world';parent.add(root);
 const geometry=new T.PlaneGeometry(1,1),material=new T.MeshBasicMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false});
 material.name='Original street animation — transparent black matte';
 material.customProgramCacheKey=()=> 'lisbon-original-film-black-matte-v1';
 material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat streetLight=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b));\ndiffuseColor.a*=smoothstep(.012,.07,streetLight);\nif(diffuseColor.a<.015)discard;');};
 const projection=new T.Mesh(geometry,material);projection.name='Street artwork — no screen, frame or black background';projection.visible=false;projection.scale.set(3.3,3.3,1);root.add(projection);
 const video=globalThis.document?.createElement('video')||null;
 if(video){video.crossOrigin='anonymous';video.playsInline=true;video.setAttribute('playsinline','');video.muted=true;video.preload='none';}
 let texture=null,disposed=false,id=null,state='idle',error=null,active=false,serial=0,frames=0,frameHandle=null,notify=()=>{},muted=true;
 const changed=()=>{if(!disposed)onChange();};
 function report(){const sign=byId.get(id);notify(sign?{kind:'lisbon-street-sign',...sign,state,error,muted}:null);changed();}
 function onFrame(){frameHandle=null;if(disposed||!active)return;frames++;projection.visible=true;changed();if(video?.requestVideoFrameCallback)frameHandle=video.requestVideoFrameCallback(onFrame);}
 function cancelFrame(){if(frameHandle!==null)video?.cancelVideoFrameCallback?.(frameHandle);frameHandle=null;}
 function stop({silent=false}={}){serial++;cancelFrame();video?.pause();active=false;projection.visible=false;state='idle';error=null;if(!silent)report();}
 function start(next){
  const sign=byId.get(next);if(disposed||!sign)return false;
  stop({silent:true});id=next;state='loading';error=null;active=true;frames=0;
  const normal=sign.normal?new T.Vector3(...sign.normal):new T.Vector3(Math.sin(sign.rotationY),0,Math.cos(sign.rotationY));
  if(sign.zone==='inside')normal.y=Math.max(normal.y,-.1);normal.normalize();
  projection.position.set(...sign.position).addScaledVector(normal,.8);projection.position.y=Math.max(1.8,projection.position.y+.3);
  if(sign.mount==='ground')projection.position.set(sign.position[0],2.0,sign.position[2]);
  projection.scale.set(3.3,3.3,1);report();
  if(!video){state='unavailable';error='Open the original experience to play this work.';report();return true;}
  const request=serial;video.onloadeddata=()=>{
   if(disposed||request!==serial||!active)return;
   if(!texture){texture=new T.VideoTexture(video);texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;material.map=texture;material.needsUpdate=true;}
   if(video.videoWidth&&video.videoHeight)projection.scale.set(3.3,3.3*video.videoHeight/video.videoWidth,1);
   projection.visible=true;changed();
  };
  video.onplaying=()=>{if(request!==serial||!active)return;state='playing';error=null;report();cancelFrame();if(video.requestVideoFrameCallback)frameHandle=video.requestVideoFrameCallback(onFrame);};
  video.onended=()=>{if(request!==serial||!active)return;state='ended';cancelFrame();report();};
  video.onerror=()=>{if(request!==serial||!active)return;state='error';error='This work could not load. Try again or open the original experience.';projection.visible=false;cancelFrame();report();};
  video.muted=muted;video.src=streetClipUrl(next);video.load();
  const promise=video.play();promise?.catch(cause=>{
   if(disposed||request!==serial||!active||state==='error')return;
   if(video.error||cause?.name==='NotSupportedError'){state='error';error='This work could not load. Try again or open the original experience.';projection.visible=false;}
   else{state='blocked';error='Tap Replay to start this work.';}
   report();
  });return true;
 }
 return{root,pickables:[],projection,video,start,open:()=>start(id||'priority'),stop,
  onState(callback){notify=typeof callback==='function'?callback:()=>{};},
  setActive(value){if(!value)stop({silent:true});return true;},
  setMuted(value){muted=!!value;if(video)video.muted=muted;report();},
  acceptHit:()=>false,interact:()=>false,
  handleKey(event){if(active&&event.key==='Enter'&&!event.repeat)return start(id);return false;},
  update(dt,eye){if(disposed||!active)return false;if(eye)projection.lookAt(eye);if(state==='playing'&&!video?.requestVideoFrameCallback){frames++;return true;}return false;},
  diagnostics:()=>({kind:'lisbon-street-world-performance',active,id,state,error,playing:state==='playing',originalAnimations:true,inGalleryPlayback:true,blackMatteRemoved:true,frame:false,videoFrames:frames,mediaSource:id?streetClipUrl(id):null,oneDecoder:true,muted,projection:projection.position.toArray(),signs:byId.size,standalone:'/play_lisbon_street',disposed}),
  dispose(){if(disposed)return;stop({silent:true});disposed=true;notify=()=>{};if(video){video.onloadeddata=video.onplaying=video.onended=video.onerror=null;video.removeAttribute('src');video.load();}texture?.dispose();geometry.dispose();material.dispose();root.removeFromParent();root.clear();}
 };
}
