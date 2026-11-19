import * as T from './vendor/three-0.180.0.mjs';
import {addObjectLighting} from './gallery-object-view.mjs';
import {createLisbonSignGeometry} from './lisbon-sign-buttons.mjs';

// The V2 sign groups retain their functions. The dimensions are in
// controller-width units, with the two grips toward +Z.
export const LISBON_KEYS=Object.freeze({
  fire_exit:[-.334,-.275,.228],Heli:[0,-.256,.075],aed:[.334,-.275,.228],
  green_walk:[-.191,-.184,.064],red_walk:[-.191,-.103,.064],pharma:[-.346,-.062,.158],
  destination:[0,-.139,.238],lisboa_city_hall:[.192,-.154,.079],speed_bump_caution:[.334,-.143,.084],
  crosswalk_caution:[.259,-.051,.082],no_entry:[.414,-.051,.082],no_parking:[.337,.039,.088],
  hospital:[0,-.037,.053],parking:[0,.027,.065],Hotel:[0,.094,.068],
  dead_end:[-.351,.144,.080],roundabout:[-.174,.105,.118],left_or_straight:[.174,.105,.118],
  no_uturn:[.351,.144,.098],priority:[-.375,.266,.104],crosswalk:[0,.164,.084],stop:[.375,.266,.100]
});
const FACE_HEIGHT=.080;
export function lisbonControllerShot(viewportWidth,viewportHeight){
  return {
    center:[0,.037,.025],pitch:1.20,
    pixels:Math.min(viewportWidth*.75,1140,viewportHeight*.82/.75)
  };
}
function outline(){
  const shape=new T.Shape();
  shape.moveTo(0,.268);
  shape.bezierCurveTo(.165,.268,.292,.314,.395,.272);
  shape.bezierCurveTo(.481,.239,.477,.105,.501,-.043);
  shape.bezierCurveTo(.530,-.212,.499,-.364,.418,-.377);
  shape.bezierCurveTo(.337,-.393,.291,-.278,.245,-.204);
  shape.bezierCurveTo(.197,-.148,.086,-.207,0,-.205);
  shape.bezierCurveTo(-.086,-.207,-.197,-.148,-.245,-.204);
  shape.bezierCurveTo(-.291,-.278,-.337,-.393,-.418,-.377);
  shape.bezierCurveTo(-.499,-.364,-.530,-.212,-.501,-.043);
  shape.bezierCurveTo(-.477,.105,-.481,.239,-.395,.272);
  shape.bezierCurveTo(-.292,.314,-.165,.268,0,.268);
  return shape;
}

// Cross-sections widen under the palm and taper into the rounded tip. The
// loft remains inside the top silhouette and has a closed underside.
const GRIP_PROFILE=[
  {z:-.159,x:.306,y:.005,halfWidth:.048,halfHeight:.033},
  {z:-.056,x:.340,y:.001,halfWidth:.103,halfHeight:.052},
  {z:.052,x:.371,y:-.001,halfWidth:.109,halfHeight:.061},
  {z:.153,x:.389,y:-.002,halfWidth:.101,halfHeight:.066},
  {z:.246,x:.407,y:-.010,halfWidth:.096,halfHeight:.064},
  {z:.310,x:.411,y:-.010,halfWidth:.072,halfHeight:.051},
  {z:.359,x:.418,y:.000,halfWidth:.038,halfHeight:.030},
  {z:.376,x:.419,y:.012,halfWidth:.006,halfHeight:.009}
];

function palmGrip(side,mobile){
  const path=new T.CatmullRomCurve3(GRIP_PROFILE.map(p=>new T.Vector3(side*p.x,p.y,p.z)));
  const radii=new T.CatmullRomCurve3(GRIP_PROFILE.map(p=>new T.Vector3(p.halfWidth,p.halfHeight,0)));
  const rings=mobile?20:34,sides=mobile?18:36,vertices=[],indices=[];
  for(let ring=0;ring<=rings;ring++){
    const center=path.getPoint(ring/rings),radius=radii.getPoint(ring/rings);
    for(let j=0;j<sides;j++){
      const angle=j*Math.PI*2/sides;
      vertices.push(center.x+Math.cos(angle)*radius.x,Math.max(-.069,center.y+Math.sin(angle)*radius.y),center.z);
      if(ring<rings){
        const a=ring*sides+j,b=ring*sides+(j+1)%sides;
        indices.push(a,b,b+sides,a,b+sides,a+sides);
      }
    }
  }
  for(const ring of [0,rings]){
    const center=path.getPoint(ring/rings),cap=vertices.length/3;
    vertices.push(...center.toArray());
    for(let j=0;j<sides;j++){
      const a=ring*sides+j,b=ring*sides+(j+1)%sides;
      indices.push(cap,ring===0?b:a,ring===0?a:b);
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}

function shoulderGeometry(width,depth,side,mobile){
  const shape=new T.Shape();
  // The outside wraps around the housing, while the inside tapers toward Heli.
  const x=value=>value*width*side,y=value=>value*width;
  shape.moveTo(x(-.370),y(-.187));
  shape.bezierCurveTo(x(-.465),y(-.178),x(-.500),y(-.127),x(-.500),y(-.015));
  shape.bezierCurveTo(x(-.500),y(.109),x(-.445),y(.192),x(-.336),y(.209));
  shape.bezierCurveTo(x(-.103),y(.239),x(.179),y(.217),x(.376),y(.187));
  shape.bezierCurveTo(x(.460),y(.173),x(.500),y(.119),x(.500),y(.039));
  shape.bezierCurveTo(x(.500),y(-.060),x(.457),y(-.115),x(.364),y(-.127));
  shape.bezierCurveTo(x(.095),y(-.150),x(-.136),y(-.219),x(-.370),y(-.187));
  const geometry=new T.ExtrudeGeometry(shape,{depth,curveSegments:mobile?8:14,bevelEnabled:true,bevelThickness:.007,bevelSize:.006,bevelSegments:3});
  const positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
  for(let i=0;i<positions.count;i++)uv.setXY(i,positions.getX(i)/width+.5,positions.getY(i)/(.50*width)+.5);
  geometry.computeBoundingBox();
  return geometry;
}

function shoulderTexture(artwork){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const context=canvas.getContext('2d');
  context.fillStyle='#639922';context.fillRect(0,0,canvas.width,canvas.height);
  const size=300;
  context.drawImage(artwork,(canvas.width-size)/2,(canvas.height-size)/2,size,size);
  return new T.CanvasTexture(canvas);
}

function tintButtonEdges(geometry,intensity){
  const colors=new Float32Array(geometry.getAttribute('position').count*3).fill(1);
  for(const {start,count,materialIndex} of geometry.groups){
    if(materialIndex===1)colors.fill(intensity,start*3,(start+count)*3);
  }
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));
}

export function createLisbonController({width=.52,mobile=false,onChange=()=>{}}={}){
  const root=new T.Group();root.name='Lisbon · original street controller';root.scale.setScalar(width);
  const materials=new Set(),geometries=new Set(),textures=new Set(),keys=new Map(),pending=[];
  let loaded=0,disposed=false;
  const shellInk=new T.MeshPhysicalMaterial({color:0x181e29,roughness:.38,metalness:.22,clearcoat:.52,clearcoatRoughness:.28});
  const edgeInk=new T.MeshPhysicalMaterial({color:0x080d15,roughness:.47,metalness:.31});
  const gripInk=new T.MeshPhysicalMaterial({color:0x11151d,roughness:.67,metalness:.04,clearcoat:.12});
  const rubberInk=new T.MeshPhysicalMaterial({color:0x090b0f,roughness:.66,metalness:.03});
  const bezelInk=new T.MeshPhysicalMaterial({color:0x475665,roughness:.28,metalness:.56});
  const lighting=new T.MeshBasicMaterial({color:0x8aacd6,toneMapped:false});
  for(const ink of [shellInk,edgeInk,gripInk,rubberInk,bezelInk,lighting])materials.add(ink);
  const create=(geometry,material,x,y,z)=>{geometries.add(geometry);materials.add(material);const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);root.add(mesh);return mesh;};
  function shell(material,y,depth,bevel,scale=1){
    const mesh=create(new T.ExtrudeGeometry(outline(),{depth,curveSegments:mobile?10:24,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:mobile?2:4}),material,0,y,0);
    mesh.rotation.x=-Math.PI/2;mesh.scale.set(scale,scale,1);return mesh;
  }
  const lower=shell(edgeInk,-.029,.042,.025,.958);
  const belt=shell(bezelInk,.018,.005,.007,.982);
  const face=shell(shellInk,.031,.031,.018,.982);
  lower.name='Radiused controller underside';belt.name='Controller shell joint';face.name='Bevelled graphite controller shell';
  const grips=[-1,1].map(side=>{
    const mesh=create(palmGrip(side,mobile),gripInk,0,0,0);
    mesh.name=side<0?'Left sculpted palm grip':'Right sculpted palm grip';
    return mesh;
  });
  const hitGeometry=new T.ShapeGeometry(outline(),mobile?10:24);
  const hitSurface=create(hitGeometry,new T.MeshBasicMaterial({visible:false,side:T.DoubleSide}),0,.075,0);
  hitSurface.rotation.x=-Math.PI/2;hitSurface.userData.kind='lisbon-controller';
  // Supports and lower trigger paddles sit below the active green bumpers.
  const shoulderMounts=[];
  for(const id of ['fire_exit','aed']){
    const [x,z]=LISBON_KEYS[id];
    const mount=create(new T.CapsuleGeometry(.036,.127,6,mobile?10:20),edgeInk,x,.062,z-.004);
    mount.rotation.z=Math.PI/2;mount.scale.set(1,1,1.24);mount.name='Recessed shoulder seat';
    const trigger=create(new T.CapsuleGeometry(.042,.118,6,mobile?10:20),gripInk,x,-.012,z-.013);
    trigger.rotation.set(.22,0,Math.PI/2);trigger.scale.set(.86,1,1.02);trigger.name='Sculpted rear trigger paddle';
    shoulderMounts.push(mount,trigger);
  }
  const light=create(new T.BoxGeometry(.104,.008,.006),lighting,0,.042,-.279);
  light.name='Controller status line';
  const loader=globalThis.document?new T.TextureLoader():null;
  for(const [id,[x,z,size]] of Object.entries(LISBON_KEYS)){
    const stick=id==='roundabout'||id==='left_or_straight';
    const shoulder=id==='fire_exit'||id==='aed';
    const display=id==='destination';
    const geometry=shoulder ? shoulderGeometry(size,.034,x<0?1:-1,mobile) : createLisbonSignGeometry(id,size*(display?1:.93),stick?.030:.034);
    tintButtonEdges(geometry,shoulder?.76:.44);
    const keyY=FACE_HEIGHT+(shoulder?.045:stick?.064:id==='pharma'?.033:.025);
    const baseY=keyY-geometry.boundingBox.max.z;
    if(stick){
      const stem=create(new T.CylinderGeometry(.019,.030,.038,24),rubberInk,x,FACE_HEIGHT+.026,z);
      stem.name=id+' thumb-stick stem';
    }
    const ink=new T.MeshPhysicalMaterial({
      color:0xffffff,vertexColors:true,roughness:display?.27:.43,metalness:.13,
      emissive:0xffffff,emissiveIntensity:display?.40:.20,alphaTest:shoulder?0:.15,
      clearcoat:display?.78:.30,clearcoatRoughness:.22,toneMapped:false
    });
    const button=create(geometry,ink,x,baseY,z);
    button.name=shoulder ? id+' sculpted shoulder button' : id+' sculpted sign button';
    button.rotation.x=-Math.PI/2;
    button.visible=false;
    if(loader)pending.push(new Promise(resolve=>{
      const texture=loader.load('/assets/signs/'+id+'.png',source=>{
        if(!disposed){
          const map=shoulder ? shoulderTexture(source.image) : source;
          map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
          ink.map=map;ink.emissiveMap=map;ink.needsUpdate=true;
          textures.add(map);
          button.visible=true;loaded++;onChange();
        }
        resolve();
      },undefined,resolve);
      textures.add(texture);
    }));
    keys.set(id,{id,x,z,size,y:keyY,baseY,button,shoulder});
  }
  root.userData.kind='lisbon-controller';
  root.userData.faceCorners=[[-.54,FACE_HEIGHT,-.34],[.54,FACE_HEIGHT,-.34],[.54,FACE_HEIGHT,.39],[-.54,FACE_HEIGHT,.39]];
  const pickables=[lower,belt,face,hitSurface,...grips,...shoulderMounts,...[...keys.values()].map(key=>key.button)];
  const data={kind:'lisbon-controller',action:'open',href:'/play_lisbon_street?board=1'};
  for(const mesh of pickables)Object.assign(mesh.userData,data);
  return {root,hitSurface,pickables,keys,ready:Promise.all(pending),
    diagnostics:()=>({kind:'lisbon-controller-original-3d',version:3,width,keys:keys.size,loaded,closedShell:true,physical:true,palmGrips:grips.length,thumbSticks:2,shoulderControls:4,activeShoulders:2,signShapedKeys:keys.size}),
    dispose(){disposed=true;root.removeFromParent();for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures)texture.dispose();}
  };
}

// The full-screen reader lights the same meshes that rest on the stone table.
export function createLisbonControllerView(host,{onLayout=()=>{}}={}){
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.domElement.id='controller-3d-canvas';renderer.domElement.setAttribute('role','img');
  renderer.domElement.setAttribute('aria-label','The original 3D Lisbon street controller');
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0x000000,0);
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.02,12);
  camera.position.set(0,0,3);camera.updateMatrixWorld();addObjectLighting(scene);
  let drawFrame=0;
  function draw(){if(drawFrame)cancelAnimationFrame(drawFrame);drawFrame=0;renderer.render(scene,camera);}
  function queueDraw(){if(!drawFrame)drawFrame=requestAnimationFrame(draw);}
  const model=createLisbonController({width:1,onChange:queueDraw});
  const shot=lisbonControllerShot(innerWidth,innerHeight);
  model.root.rotation.x=shot.pitch;
  model.root.position.copy(new T.Vector3(...shot.center).applyQuaternion(model.root.quaternion)).negate();
  scene.add(model.root);
  host.replaceChildren(renderer.domElement);
  function layout(){
    const rectangle=host.getBoundingClientRect();if(!rectangle.width||!rectangle.height)return;
    renderer.setSize(rectangle.width,rectangle.height);
    const shot=lisbonControllerShot(rectangle.width,rectangle.height);
    camera.left=-rectangle.width/(2*shot.pixels);camera.right=-camera.left;
    camera.bottom=-rectangle.height/(2*shot.pixels);camera.top=-camera.bottom;
    camera.updateProjectionMatrix();camera.updateMatrixWorld();draw();onLayout();
  }
  function target(id){
    const key=model.keys.get(id);if(!key)return null;
    const box=renderer.domElement.getBoundingClientRect();
    const project=(x,z)=>model.root.localToWorld(new T.Vector3(x,key.y,z)).project(camera);
    const {min,max}=key.button.geometry.boundingBox;
    const reachX=Math.max(-min.x,max.x),reachZ=Math.max(-min.y,max.y);
    const center=project(key.x,key.z);
    const topLeft=project(key.x-reachX,key.z-reachZ);
    const bottomRight=project(key.x+reachX,key.z+reachZ);
    const width=Math.max(23,box.width*(bottomRight.x-topLeft.x)/2);
    const height=Math.max(23,box.height*(topLeft.y-bottomRight.y)/2);
    return {
      x:box.left+(center.x+1)*box.width/2-width/2,
      y:box.top+(1-center.y)*box.height/2-height/2,
      width,height
    };
  }
  const presses=new Map();
  let pressFrame=0,lastFeedback=null;
  function restoreButton(track){
    track.key.button.position.y=track.key.baseY;
    track.material.color.copy(track.color);
    track.material.emissiveIntensity=track.emissive;
  }
  function stepPresses(now){
    pressFrame=0;let redraw=false,running=false;
    for(const [id,track] of presses){
      if(!track.resolve)continue;
      track.start??=now;
      const elapsed=now-track.start;
      let pressure=track.amount;
      let finished=false;
      if(track.mode==='activating'){
        if(track.phase==='press'){
          const duration=track.reduced?0:56;
          pressure=elapsed>=duration?1:T.MathUtils.lerp(track.from,1,T.MathUtils.smoothstep(elapsed,0,duration));
          if(pressure===1){track.phase='hold';track.start=now;}
        }else if(track.phase==='hold'){
          // Measure the hold from the frame that first reaches full pressure.
          // A slow draw cannot skip the visible depression and show the clip.
          pressure=1;
          if(elapsed>=(track.reduced?95:112)){track.phase='release';track.start=now;}
        }else{
          const duration=track.reduced?0:72;
          finished=elapsed>=duration;
          pressure=finished?0:1-T.MathUtils.smoothstep(elapsed,0,duration);
        }
      }else{
        pressure=T.MathUtils.lerp(track.from,track.to,T.MathUtils.smoothstep(elapsed,0,track.duration));
        finished=elapsed>=track.duration;
      }
      const distance=track.key.shoulder ? .017 : .013;
      const travel=track.reduced?0:distance*pressure;
      if(pressure!==track.amount){
        track.amount=pressure;track.key.button.position.y=track.key.baseY-travel;
        track.material.color.copy(track.color).multiplyScalar(1-.32*pressure);
        track.material.emissiveIntensity=track.emissive*(1-.38*pressure);
        redraw=true;
      }
      lastFeedback={id,pressure,travel,mode:finished&&pressure===0?'released':track.mode};
      if(finished){
        track.resolve?.();track.resolve=null;
        if(pressure===0){restoreButton(track);presses.delete(id);}
      }else running=true;
    }
    if(redraw)draw();
    if(running)pressFrame=requestAnimationFrame(stepPresses);
  }
  function feedback(id,action){
    const key=model.keys.get(id);if(!key)return Promise.resolve();
    let track=presses.get(id);
    if(!track){
      if(!action)return Promise.resolve();
      const material=key.button.material;
      track={key,material,color:material.color.clone(),emissive:material.emissiveIntensity,amount:0};
      presses.set(id,track);
    }
    if(track.mode==='activating'&&action!=='activate')return Promise.resolve();
    track.resolve?.();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    Object.assign(track,{start:null,from:track.amount,reduced});
    if(action==='activate'){
      Object.assign(track,{mode:'activating',phase:'press'});
    }else{
      Object.assign(track,{mode:action?'holding':'releasing',to:action?1:0,duration:reduced?1:action?65:96});
    }
    const completed=new Promise(resolve=>{track.resolve=resolve;});
    if(!pressFrame)pressFrame=requestAnimationFrame(stepPresses);
    return completed;
  }
  addEventListener('resize',layout);layout();
  return {canvas:renderer.domElement,model,ready:model.ready.then(draw),draw,layout,target,feedback,
    feedbackState:()=>lastFeedback,
    dispose(){
      if(drawFrame)cancelAnimationFrame(drawFrame);
      if(pressFrame)cancelAnimationFrame(pressFrame);
      for(const track of presses.values()){track.resolve?.();restoreButton(track);}
      presses.clear();removeEventListener('resize',layout);model.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    }
  };
}
