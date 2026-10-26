import * as T from './vendor/three-0.180.0.mjs';

// As with Lisbon, Space exhibits a cover. The full-size artwork plays only
// in its own page, after an explicit viewer gesture.
export function createOppositeInstallation(scene,{mobile=false,onChange=()=>{},onOpen=()=>{}}={}){
 const href='/same_but_opposite',root=new T.Group();root.name='Same but opposite — standalone artwork portal';scene.add(root);
 const hasDOM=typeof document!=='undefined'&&typeof document.createElement==='function';
 const canvas=hasDOM?document.createElement('canvas'):null;
 if(canvas){canvas.width=mobile?1536:2048;canvas.height=canvas.width*9/16;}
 const context=canvas?.getContext('2d')||null;
 const texture=canvas?new T.CanvasTexture(canvas):new T.DataTexture(new Uint8Array([0,0,0,255]),1,1);
 texture.name='SAME_BUT_OPPOSITE_SCREEN — static artwork cover';texture.colorSpace=T.SRGBColorSpace;
 texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.anisotropy=4;texture.needsUpdate=true;
 const geometry=new T.PlaneGeometry(1,1),material=new T.MeshBasicMaterial({map:texture,toneMapped:false});
 const screen=new T.Mesh(geometry,material);screen.name='SAME_BUT_OPPOSITE_SCREEN';screen.position.set(-12.72,3.1,-7);screen.rotation.y=Math.PI/2;screen.scale.set(5.6,3.15,1);
 screen.userData={installation:'opposite',room:4,href};root.add(screen);
 const pickables=[screen];let disposed=false,active=false,focused=false,opened=false,opens=0,frames=0,clock=0;
 function drawCover(){
  if(disposed||!context)return false;
  const W=canvas.width,H=canvas.height;context.setTransform(1,0,0,1,0,0);context.fillStyle='#000';context.fillRect(0,0,W,H);
  context.textAlign='center';context.textBaseline='middle';context.fillStyle='#f0f0f3';context.font='700 '+Math.round(W/19)+'px "Space Mono",monospace';context.fillText('Same but opposite',W/2,H*.38);
  context.fillStyle='#b9b9c3';context.font=Math.round(W/43)+'px "Space Mono",monospace';context.fillText('Wah',W/2,H*.55);
  context.strokeStyle='#777782';context.lineWidth=Math.max(1,W/1536);context.strokeRect(W*.416,H*.77,W*.168,H*.108);
  context.fillStyle='#eeeeef';context.font=Math.round(W/59)+'px "Space Mono",monospace';context.fillText('PLAY',W/2,H*.824);
  texture.needsUpdate=true;frames++;onChange();return true;
 }
 function setActive(value){if(disposed)return false;const next=!!value,changed=next!==active||next!==focused;active=focused=next;if(!next)opened=false;if(changed)onChange();return changed;}
 function open(){if(disposed||opened)return false;opened=true;opens++;onChange();onOpen({href});return true;}
 function acceptHit(hit){return!!(hit?.object&&pickables.includes(hit.object));}
 function interact(value,hit=null){const object=value?.object||hit?.object||value;if(disposed||!pickables.includes(object))return false;active=focused=true;return open();}
 function handleKey(event){const key=typeof event==='string'?event:event.key,repeated=typeof event==='string'?false:!!event.repeat;return !disposed&&active&&focused&&key==='Enter'&&!repeated?open():false;}
 drawCover();globalThis.document?.fonts?.ready?.then(()=>{if(!disposed)drawCover();});
 return{root,pickables,screen,canvas,texture,open,handleKey,interact,acceptHit,setActive,
  update(dt){if(disposed)return false;clock+=Math.max(0,Math.min(Number(dt)||0,.1));return false;},
  diagnostics:()=>({kind:'opposite-artwork-portal',portal:true,inGalleryPlayback:false,title:'Same but opposite',active,focused,opened,opens,coverReady:!!context,playing:false,mediaSource:null,videoFrames:0,frames,time:+clock.toFixed(3),screen:[-12.72,3.1,-7],standalone:href,disposed}),
  dispose(){if(disposed)return;disposed=true;active=focused=false;texture.dispose();material.dispose();geometry.dispose();root.removeFromParent();root.clear();if(canvas)canvas.width=canvas.height=1;}
 };
}
