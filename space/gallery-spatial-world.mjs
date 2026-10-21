import * as T from './vendor/three-0.180.0.mjs';
import { ORIGINS, TOTEHMPAPER } from './gallery-artworks.mjs';
import { INTENTIONS } from './gallery-spatial-data.mjs';

// SPACE is the same paper and seven intention circuits, unfolded into depth.
// The colours belong to the shared architecture, never to invented artwork data.
export const SPATIAL_INTENTIONS = INTENTIONS;
export const SPATIAL_PATH = Object.freeze({spacing:32,firstZ:-34,firstStopZ:-25,height:4.8,eyeHeight:1.65});
const finiteIndex = n => Number.isFinite(Number(n)) ? Math.max(0,Math.floor(Number(n))) : 0;
const centre = n => new T.Vector3((n%2?-1:1)*4.8,5.1,-34-n*32);

export function createSpatialWorld(scene,{mobile=typeof innerWidth!=='undefined'&&innerWidth<650,onChange=()=>{}}={}) {
  const root=new T.Group();root.name='TOTEHM — one spatial ecosystem';scene.add(root);
  const geometry=new Set(),materials=new Set(),textures=new Map(),loader=new T.TextureLoader();
  const pickables=[],slots=[],pulses=[],circuits=[],limit=mobile?3:5;
  let disposed=false,dirty=true,time=0,index=0,paperLoaded=false,media=null,video=null,videoTexture=null;
  const geo=g=>(geometry.add(g),g),mat=m=>(materials.add(m),m);
  const basic=(color,opacity=1)=>mat(new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,toneMapped:false}));
  const navy=basic('#333366'),deepNavy=basic('#22224a'),black=basic('#000000');
  const quietNavy=basic('#333366',.16),edgeNavy=basic('#333366',.65);
  const boxGeometry=geo(new T.BoxGeometry(1,1,1)),planeGeometry=geo(new T.PlaneGeometry(1,1));
  const changed=()=>{if(!disposed){dirty=true;onChange();}};
  function box(parent,width,height,depth,x,y,z,material=deepNavy){
    const mesh=new T.Mesh(boxGeometry,material);mesh.scale.set(width,height,depth);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  function line(parent,points,color,opacity=1){
    const g=geo(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p))));
    const m=mat(new T.LineBasicMaterial({color,transparent:opacity<1,opacity,toneMapped:false}));
    const mesh=new T.Line(g,m);parent.add(mesh);return mesh;
  }
  function circuit(points,color,{pulse=true,opacity=.85}={}){
    const trace=line(root,points,color,opacity);circuits.push(trace);
    if(pulse){
      const path=points.map(p=>new T.Vector3(...p)),lengths=[0];
      for(let i=1;i<path.length;i++)lengths.push(lengths[i-1]+path[i-1].distanceTo(path[i]));
      const mesh=box(root,.07,.07,.07,...points[0],basic(color));
      pulses.push({mesh,path,lengths,offset:pulses.length*.131});
    }
    return trace;
  }

  // A low navy processor socket supports the entry plaza. Its two branches
  // become the Lisbon table and the uninterrupted Origins promenade.
  const plaza=new T.Group();plaza.name='The processor unfolded';root.add(plaza);
  box(plaza,48,.16,39,0,-.17,5,black);
  box(plaza,21,.11,19,0,-.12,0,quietNavy);
  box(plaza,11.4,.12,11.4,6,-.035,0,deepNavy);
  box(plaza,10.6,.14,10.6,6,.015,0,black);
  box(plaza,8.8,.08,8.8,6,.055,0,quietNavy);
  // All corners and branches retain COM's rectangular, unrounded circuit grammar.
  for(let k=0;k<7;k++){
    const c=SPATIAL_INTENTIONS[k],r=4.55+k*.15,offset=(k-3)*.24;
    circuit([[6-r,.105,r],[6-r,.105,-r],[6+r,.105,-r],[6+r,.105,r],[6-r,.105,r]],c,{pulse:true,opacity:.8});
    circuit([[6-r,.11,-r],[6-r,.11,-11-k*.24],[offset,.11,-11-k*.24],[offset,.11,-18],[-8.6-k*.13,.11,-18],[-8.6-k*.13,.11,-660]],c,{pulse:false,opacity:.54});
    circuit([[6-r,.12,r],[-3-k*.2,.12,r],[-3-k*.2,.12,1.5+k*.23],[-11,.12,1.5+k*.23],[-11,.12,-4.2]],c,{pulse:true,opacity:.68});
    // Seven structural strokes rise behind the paper and extend into the path.
    // They are thin rails in the field, not coloured walls or a decorative sky.
    const x=15+k*.9,y=9+k*.58;
    circuit([[6+r,.1,-r],[x,.1,-r],[x,y,-r],[x,y,-17-k*1.4],[9.8+k*.13,y,-17-k*1.4],[9.8+k*.13,y,-650]],c,{pulse:false,opacity:.35});
  }
  // A calm ribbon of navy is cut out of the black. Only nearby segments are
  // visible; a distant lit corridor never competes with the current original.
  const pathSegments=[];
  for(let n=0;n<21;n++){
    const group=new T.Group();root.add(group);
    box(group,18,.075,31.8,0,-.125,-20-n*32,quietNavy);
    box(group,.045,.025,31.8,-9.1,-.07,-20-n*32,edgeNavy);
    box(group,.045,.025,31.8,9.1,-.07,-20-n*32,edgeNavy);
    // Wide transverse seams and floating navy ribs lend depth without walls.
    line(group,[[-9.1,-.068,-35.9-n*32],[9.1,-.068,-35.9-n*32]],'#333366',.55);
    if(n%3===0){
      const rib=mat(new T.MeshBasicMaterial({color:'#22224a',transparent:true,opacity:.45,toneMapped:false}));
      box(group,.1,11,.1,-10.1,5.3,-33-n*32,rib);
      box(group,.1,11,.1,10.1,5.3,-33-n*32,rib);
      box(group,20.3,.1,.1,0,10.8,-33-n*32,rib);
    }
    pathSegments.push({group,z:-20-n*32});
  }

  // The real perforated paper is preserved. No replacement T glyph or newly
  // drawn logo is introduced; transparent perforations remain open to the void.
  const paperMaterial=mat(new T.MeshBasicMaterial({color:0x000000,transparent:true,alphaTest:.015,side:T.DoubleSide,toneMapped:false}));
  const paper=new T.Mesh(planeGeometry,paperMaterial);paper.name='TotehmPaper — original';
  paper.position.set(6,4,0);paper.scale.set(5,5,1);paper.userData={kind:'paper',id:'totehmpaper'};root.add(paper);
  const paperTexture=loader.load(TOTEHMPAPER.src,()=>{if(disposed){paperTexture.dispose();return;}paperLoaded=true;paperMaterial.color.set(0xffffff);changed();},undefined,changed);
  paperTexture.colorSpace=T.SRGBColorSpace;paperMaterial.map=paperTexture;
  // Discrete navy joints make the paper appear suspended inside its processor.
  for(const [x,y] of [[3.2,1.2],[8.8,1.2],[3.2,6.8],[8.8,6.8]])box(root,.16,.16,.16,x,y,-.1,navy);
  line(root,[[3.2,1.2,-.1],[3.2,6.8,-.1],[8.8,6.8,-.1],[8.8,1.2,-.1]],'#333366',.6);

  // Originals already contain Wah's signed white polaroid. Keep every pixel,
  // adding only a narrow navy mount and physical thickness behind the image.
  for(let i=0;i<limit;i++){
    const group=new T.Group(),backMaterial=mat(new T.MeshBasicMaterial({color:'#22224a',transparent:true,opacity:0,toneMapped:false}));
    const imageMaterial=mat(new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0,toneMapped:false,depthWrite:false}));
    const back=box(group,1,1,.16,0,0,-.085,backMaterial),image=new T.Mesh(planeGeometry,imageMaterial);
    image.position.z=.015;group.add(image);group.visible=false;root.add(group);
    slots.push({group,back,image,index:-1,entry:null,opacity:0});
  }
  function request(n){
    if(textures.has(n))return textures.get(n);
    const entry={texture:null,loaded:false};textures.set(n,entry);
    entry.texture=loader.load(ORIGINS[n].src,()=>{
      if(disposed||textures.get(n)!==entry){entry.texture.dispose();return;}
      entry.loaded=true;for(const slot of slots)if(slot.entry===entry)slot.image.material.color.set(0xffffff);changed();
    },undefined,changed);
    entry.texture.colorSpace=T.SRGBColorSpace;return entry;
  }
  function assign(slot,n){
    const work=ORIGINS[n],entry=request(n),width=SPATIAL_PATH.height*work.aspect;
    slot.index=n;slot.entry=entry;slot.group.position.copy(centre(n));slot.group.name=work.id;
    slot.back.scale.set(width+.22,SPATIAL_PATH.height+.22,.16);
    slot.image.scale.set(width,SPATIAL_PATH.height,1);slot.image.material.map=entry.texture;
    slot.image.material.color.set(entry.loaded?0xffffff:0x000000);slot.image.material.needsUpdate=true;
    const data={kind:'origin',index:n,id:work.id,title:work.title};slot.image.userData=data;slot.back.userData=data;
  }
  function arrange(n){
    const first=Math.max(0,Math.min(n-1,ORIGINS.length-limit));
    const wanted=Array.from({length:limit},(_,i)=>first+i),spares=slots.filter(s=>!wanted.includes(s.index));
    for(const k of wanted)if(!slots.some(s=>s.index===k))assign(spares.pop(),k);
    for(const [k,entry] of textures)if(!wanted.includes(k)){entry.texture.dispose();textures.delete(k);}
    changed();
  }
  const mediaMaterial=mat(new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:1,toneMapped:false,depthWrite:false}));
  const mediaPlane=new T.Mesh(planeGeometry,mediaMaterial);mediaPlane.visible=false;mediaPlane.name='One artwork playing in the space';root.add(mediaPlane);
  function fitMedia(){
    if(!media)return;
    const sourceAspect=video?.videoWidth&&video?.videoHeight?video.videoWidth/video.videoHeight:null;
    if(media.kind==='origin'){
      const slot=slots.find(s=>s.index===media.index),c=centre(media.index);
      const maxW=SPATIAL_PATH.height*ORIGINS[media.index].aspect,maxH=SPATIAL_PATH.height;
      const aspect=sourceAspect||ORIGINS[media.index].aspect,w=Math.min(maxW,maxH*aspect),h=w/aspect;
      mediaPlane.scale.set(w,h,1);mediaPlane.position.copy(c);mediaPlane.position.z+=.04;
      mediaPlane.visible=!!slot?.group.visible;mediaMaterial.opacity=slot?.opacity??0;
    }else{
      const aspect=sourceAspect||16/9,w=6,h=w/aspect;
      mediaPlane.scale.set(w,h,1);mediaPlane.position.set(6,4,.08);mediaPlane.visible=root.visible;
      mediaMaterial.opacity=1;
    }
  }
  function setMedia(nextVideo,selection){
    if(disposed||!nextVideo||!selection||!['paper','origin'].includes(selection.kind))return false;
    if(selection.kind==='origin'&&(!Number.isInteger(selection.index)||!ORIGINS[selection.index]))return false;
    if(video!==nextVideo){
      video?.removeEventListener('loadedmetadata',mediaMetadata);video=nextVideo;videoTexture?.dispose();
      videoTexture=new T.VideoTexture(video);videoTexture.colorSpace=T.SRGBColorSpace;
      video.addEventListener('loadedmetadata',mediaMetadata);
    }
    media={kind:selection.kind,...(selection.kind==='origin'?{index:selection.index}:{})};
    mediaPlane.userData={...media};mediaMaterial.map=videoTexture;mediaMaterial.needsUpdate=true;fitMedia();changed();return true;
  }
  function mediaMetadata(){fitMedia();changed();}
  function clearMedia(){
    media=null;mediaPlane.visible=false;mediaMaterial.map=null;mediaMaterial.needsUpdate=true;
    video?.removeEventListener('loadedmetadata',mediaMetadata);video=null;
    // A dormant VideoTexture still owns a requestVideoFrameCallback. Release
    // it when playback moves to Lisbon, so only the selected station uploads.
    videoTexture?.dispose();videoTexture=null;changed();
  }
  arrange(0);

  return {
    root,pickables,setMedia,clearMedia,
    getStop(n){
      const next=finiteIndex(n);if(next>=ORIGINS.length)return{end:true,total:ORIGINS.length};
      const c=centre(next);return{position:new T.Vector3(0,1.65,c.z+9),target:c,origin:next,index:next,work:ORIGINS[next].id,total:ORIGINS.length};
    },
    paperStop(){return{position:new T.Vector3(6,1.65,10),target:new T.Vector3(6,4,0)};},
    update(dt,eye,motion){
      if(disposed||!root.visible)return false;
      const next=Math.min(ORIGINS.length-1,finiteIndex(Math.floor((-eye.z-18)/32)));
      if(next!==index){index=next;arrange(index);}
      let visual=false;pickables.length=0;
      if(paper.visible)pickables.push(paper);
      for(const slot of slots){
        const depth=eye.z-slot.group.position.z;
        const opacity=T.MathUtils.smoothstep(depth,-6,2)*(1-T.MathUtils.smoothstep(depth,20,40));
        const visible=opacity>.001;
        if(slot.group.visible!==visible||Math.abs(slot.opacity-opacity)>.0001)visual=true;
        slot.group.visible=visible;slot.opacity=opacity;slot.image.material.opacity=opacity;slot.back.material.opacity=opacity;
        if(visible)pickables.push(slot.image,slot.back);
      }
      for(const section of pathSegments){const visible=Math.abs(eye.z-section.z)<85;if(section.group.visible!==visible){section.group.visible=visible;visual=true;}}
      if(motion){
        time+=Math.max(0,Math.min(Number(dt)||0,.1));
        for(const pulse of pulses){
          const distance=((time/6.2+pulse.offset)%1)*pulse.lengths.at(-1);
          let i=1;while(i<pulse.path.length-1&&pulse.lengths[i]<distance)i++;
          const length=pulse.lengths[i]-pulse.lengths[i-1];
          pulse.mesh.position.lerpVectors(pulse.path[i-1],pulse.path[i],length?(distance-pulse.lengths[i-1])/length:0);
        }
        visual=true;
      }
      fitMedia();
      if(mediaPlane.visible)pickables.unshift(mediaPlane);
      const result=dirty||visual||!!(media&&video&&!video.paused&&!video.ended);dirty=false;return result;
    },
    diagnostics:()=>({kind:'one spatial TOTEHM ecosystem',order:ORIGINS.map(w=>w.id),total:ORIGINS.length,index,
      currentWork:ORIGINS[index].id,spacing:32,pool:limit,loaded:[...textures.values()].filter(e=>e.loaded).length,
      visibleWorks:slots.filter(s=>s.group.visible).map(s=>s.index+1).sort((a,b)=>a-b),
      paperLoaded,paperSource:TOTEHMPAPER.src,paperPerforations:true,intentions:[...SPATIAL_INTENTIONS],
      circuits:circuits.length,time:+time.toFixed(3),media:media?{...media,playing:!!video&&!video.paused&&!video.ended}:null,
      videoTextures:videoTexture?1:0,continuous:true}),
    dispose(){
      if(disposed)return;disposed=true;root.visible=false;pickables.length=0;
      video?.removeEventListener('loadedmetadata',mediaMetadata);videoTexture?.dispose();paperTexture.dispose();
      for(const entry of textures.values())entry.texture.dispose();textures.clear();
      for(const g of geometry)g.dispose();for(const m of materials)m.dispose();root.removeFromParent();
    }
  };
}
