import * as T from './vendor/three-0.180.0.mjs';

// The premium shadowbox is the original get_higher.html presentation made
// physical: 180-square black case, 50-deep sides, 68% THP set 37 units behind
// the glass. It is an entrance to the independent page, never a media player.
export function createStonerInstallation(scene,{mobile=false,onChange=()=>{},onOpen=()=>{}}={}){
 const root=new T.Group();root.name='Stoner — original premium wall-mounted shadowbox';root.position.set(0,3.45,-16.30);scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),pickables=[];
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m),texture=t=>(textures.add(t),t);
 const width=3,depth=width*50/180,halfDepth=depth/2;
 let disposed=false,active=false,opened=false,opens=0,loaded=false,failed=false,dirty=true;
 const changed=()=>{if(!disposed){dirty=true;onChange();}};
 const box=geometry(new T.BoxGeometry(1,1,1)),plane=geometry(new T.PlaneGeometry(1,1));
 const edge=material(new T.MeshStandardMaterial({color:0x000000,roughness:.39,metalness:.18}));
 const black=material(new T.MeshBasicMaterial({color:0x000000,toneMapped:false}));
 function mark(mesh){mesh.userData={installation:'stoner',kind:'stoner-frame',href:'/get_higher'};pickables.push(mesh);return mesh;}
 function block(m,p,size,name){const mesh=new T.Mesh(box,m);mesh.position.set(...p);mesh.scale.set(...size);mesh.name=name;root.add(mesh);return mark(mesh);}
 function sheet(m,p,size,name,{pick=true}={}){const mesh=new T.Mesh(plane,m);mesh.position.set(...p);mesh.scale.set(size[0],size[1],1);mesh.name=name;root.add(mesh);return pick?mark(mesh):mesh;}
 // Black backing and the four actual sides, with no invented decorative trim.
 block(black,[0,0,-halfDepth],[width,width,.018],'Original black shadowbox backing');
 for(const x of [-width/2,width/2])block(edge,[x,0,0],[.025,width+.025,depth],'Original black side edge');
 for(const y of [-width/2,width/2])block(edge,[0,y,0],[width,.025,depth],'Original black horizontal edge');
 const fallback=texture(new T.DataTexture(new Uint8Array([51,51,102,255]),1,1));fallback.colorSpace=T.SRGBColorSpace;fallback.needsUpdate=true;
 const artwork=material(new T.MeshBasicMaterial({map:fallback,alphaTest:.12,toneMapped:false}));
 sheet(artwork,[0,0,-width*12/180],[width*.68,width*.68],'Authentic THP inside its original premium case');
 if(globalThis.document?.createElementNS){
  const image=texture(new T.TextureLoader().load('/assets/img/totehm_logo.png',map=>{
   if(disposed){map.dispose();return;}map.colorSpace=T.SRGBColorSpace;map.anisotropy=mobile?2:4;artwork.map=map;artwork.needsUpdate=true;loaded=true;changed();
  },undefined,()=>{failed=true;changed();}));image.colorSpace=T.SRGBColorSpace;
 }
 // Original .b-front: 4% glass, a diagonal 14%→3%→transparent reflection,
 // and a fine 35% upper highlight. No transmission pass or extra render target.
 const glass=material(new T.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:.04,roughness:.10,metalness:.12,depthWrite:false,side:T.FrontSide}));
 const glassFront=sheet(glass,[0,0,halfDepth+.002],[width,width],'Original clear premium case glass');glassFront.renderOrder=3;
 const glint=material(new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){float diagonal=(vUv.x+1.-vUv.y)*.5;float a=diagonal<.4?mix(.14,.03,diagonal/.4):mix(.03,0.,clamp((diagonal-.4)/.25,0.,1.));gl_FragColor=vec4(vec3(1.),a);}'}));
 const reflection=sheet(glint,[0,0,halfDepth+.003],[width,width],'Original subtle diagonal glass reflection',{pick:false});reflection.renderOrder=4;
 const rim=material(new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35,depthWrite:false,toneMapped:false}));
 sheet(rim,[0,width/2-.006,halfDepth+.004],[width-.025,.006],'Original fine upper glass edge',{pick:false});
 // Concealed wall mounts and a quiet warm grazing light make this a hanging
 // artwork; all content remains static until its independent experience opens.
 for(const x of [-.82,.82])block(edge,[x,.95,-halfDepth-.10],[.045,.35,.20],'Recessed wall mount');
 const light=new T.SpotLight(0xffe1bb,13,7,Math.PI/5,.62,1.5);light.position.set(0,2.15,1.3);light.target.position.set(0,0,-.1);root.add(light,light.target);
 function open(){if(disposed||opened)return false;opened=true;opens++;changed();onOpen({href:'/get_higher'});return true;}
 function setActive(value){if(disposed)return false;const next=!!value;if(next===active)return false;active=next;if(!active)opened=false;changed();return true;}
 function acceptHit(hit){return!!(hit?.object&&pickables.includes(hit.object));}
 return{root,pickables,open,setActive,acceptHit,
  interact(value,hit=null){const object=value?.object||hit?.object||value;return!disposed&&pickables.includes(object)?open():false;},
  handleKey(event){const key=typeof event==='string'?event:event?.key;return!disposed&&active&&key==='Enter'?open():false;},
  update(){const changed=dirty;dirty=false;return!disposed&&changed;},
  diagnostics:()=>({kind:'stoner-premium-frame-portal',active,opened,opens,loaded,failed,static:true,mediaPlayer:false,videoElements:0,wallMounted:true,premiumFrame:true,originalFrame:true,premiumSource:'/get_higher',sourceClasses:['box-scene','box','b-front','b-back','b-logo','bside'],originalDimensions:[180,180,50],originalLogoRatio:.68,glassOpacity:.04,originalAsset:'/assets/img/totehm_logo.png',position:root.position.toArray(),dimensions:[width,width,depth],artworkDepth:-width*12/180,href:'/get_higher',standalone:'/get_higher',privateMedia:false,disposed}),
  dispose(){if(disposed)return;disposed=true;active=false;light.dispose();for(const t of textures)t.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();root.removeFromParent();root.clear();pickables.length=0;}
 };
}
