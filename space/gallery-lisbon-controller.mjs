import * as T from './vendor/three-0.180.0.mjs';
import {addObjectLighting,projectModelFace} from './gallery-object-view.mjs';
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
// Each adhesive is positioned on the actual sign silhouette in artwork units.
export const LISBON_PLAYED_STICKERS=Object.freeze({
  fire_exit:Object.freeze([-0.28,0.028,0.29,-11]),
  Heli:Object.freeze([0.095,0.005,0.187,15]),
  aed:Object.freeze([0.29,-0.052,0.27,8]),
  green_walk:Object.freeze([0.14,0.24,0.285,-8]),
  red_walk:Object.freeze([-0.18,-0.195,0.25,12]),
  pharma:Object.freeze([0.01,0.32,0.29,-9]),
  lisboa_city_hall:Object.freeze([-0.017,0.168,0.26,7]),
  speed_bump_caution:Object.freeze([0.12,0.279,0.28,-10]),
  crosswalk_caution:Object.freeze([-0.21,-0.27,0.28,7]),
  no_entry:Object.freeze([0.19,-0.19,0.3,-13]),
  no_parking:Object.freeze([-0.19,0.21,0.3,11]),
  hospital:Object.freeze([0.13,0.24,0.28,-10]),
  parking:Object.freeze([-0.19,-0.24,0.27,9]),
  Hotel:Object.freeze([0.23,0.273,0.295,12]),
  dead_end:Object.freeze([0.195,0.218,0.31,-7]),
  roundabout:Object.freeze([-0.17,0.17,0.33,-15]),
  left_or_straight:Object.freeze([0.2,-0.21,0.33,13]),
  no_uturn:Object.freeze([0.183,0.193,0.29,10]),
  priority:Object.freeze([-0.22,-0.266,0.29,7]),
  crosswalk:Object.freeze([-0.025,0.294,0.29,-10]),
  stop:Object.freeze([0.158,0.218,0.306,11])
});
const FACE_HEIGHT=.080;
const DISPLAY_FRAME={width:.260,depth:.158,radius:.016};
const DISPLAY_GLASS={width:.248,depth:.146,radius:.012};
export function lisbonControllerShot(viewportWidth,viewportHeight){
  return {
    center:[0,.037,.025],pitch:1.20,
    pixels:.95*Math.min(viewportWidth*.75,1140,viewportHeight*.82/.75)
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
  {z:-.140,x:.313,y:.012,halfWidth:.050,halfHeight:.024},
  {z:-.040,x:.346,y:.009,halfWidth:.093,halfHeight:.038},
  {z:.062,x:.369,y:.007,halfWidth:.105,halfHeight:.045},
  {z:.155,x:.386,y:.004,halfWidth:.103,halfHeight:.052},
  {z:.245,x:.402,y:.006,halfWidth:.092,halfHeight:.049},
  {z:.307,x:.412,y:.010,halfWidth:.069,halfHeight:.039},
  {z:.349,x:.418,y:.017,halfWidth:.035,halfHeight:.027},
  {z:.370,x:.419,y:.024,halfWidth:.006,halfHeight:.009}
];

function palmGrip(side,mobile){
  const path=new T.CatmullRomCurve3(GRIP_PROFILE.map(p=>new T.Vector3(side*p.x,p.y,p.z)));
  const radii=new T.CatmullRomCurve3(GRIP_PROFILE.map(p=>new T.Vector3(p.halfWidth,p.halfHeight,0)));
  const rings=mobile?20:34,sides=mobile?18:42,stride=sides+1,vertices=[],indices=[],uvs=[];
  for(let ring=0;ring<=rings;ring++){
    const center=path.getPoint(ring/rings),radius=radii.getPoint(ring/rings);
    for(let j=0;j<=sides;j++){
      const angle=j*Math.PI*2/sides;
      vertices.push(center.x+Math.cos(angle)*radius.x,center.y+Math.sin(angle)*radius.y,center.z);
      uvs.push(j/sides,ring/rings);
      if(ring<rings&&j<sides){
        const a=ring*stride+j,b=a+1;
        indices.push(a,b,b+stride,a,b+stride,a+stride);
      }
    }
  }
  for(const ring of [0,rings]){
    const center=path.getPoint(ring/rings),cap=vertices.length/3;
    vertices.push(...center.toArray());
    uvs.push(.5,ring/rings);
    for(let j=0;j<sides;j++){
      const a=ring*stride+j,b=a+1;
      indices.push(cap,ring===0?b:a,ring===0?a:b);
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}

function moldedGrain(){
  const size=64,pixels=new Uint8Array(size*size*4);
  let seed=44019;
  for(let i=0;i<pixels.length;i+=4){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const grain=98+(seed>>>25);
    pixels[i]=pixels[i+1]=pixels[i+2]=grain;pixels[i+3]=255;
  }
  const texture=new T.DataTexture(pixels,size,size);
  texture.wrapS=texture.wrapT=T.RepeatWrapping;
  texture.repeat.set(24,24);
  texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;texture.anisotropy=4;texture.needsUpdate=true;
  return texture;
}

function shoulderGeometry(width,depth,side,mobile){
  const shape=new T.Shape();
  // The outside wraps around the housing, while the inside tapers toward Heli.
  const x=value=>value*width*side,y=value=>value*width*.72;
  shape.moveTo(x(-.370),y(-.187));
  shape.bezierCurveTo(x(-.465),y(-.178),x(-.500),y(-.127),x(-.500),y(-.015));
  shape.bezierCurveTo(x(-.500),y(.109),x(-.445),y(.192),x(-.336),y(.209));
  shape.bezierCurveTo(x(-.103),y(.239),x(.179),y(.217),x(.376),y(.187));
  shape.bezierCurveTo(x(.460),y(.173),x(.500),y(.119),x(.500),y(.039));
  shape.bezierCurveTo(x(.500),y(-.060),x(.457),y(-.115),x(.364),y(-.127));
  shape.bezierCurveTo(x(.095),y(-.150),x(-.136),y(-.219),x(-.370),y(-.187));
  const geometry=new T.ExtrudeGeometry(shape,{depth,curveSegments:mobile?8:14,bevelEnabled:true,bevelThickness:.0025,bevelSize:.003,bevelSegments:3});
  const positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
  for(let i=0;i<positions.count;i++)uv.setXY(i,positions.getX(i)/width+.5,positions.getY(i)/(.36*width)+.5);
  geometry.computeBoundingBox();
  return geometry;
}

function shoulderTexture(artwork){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=184;
  const context=canvas.getContext('2d');
  context.fillStyle='#639922';context.fillRect(0,0,canvas.width,canvas.height);
  const size=253;
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

function roundedPanel({width,depth,radius},x=0,y=0){
  const shape=new T.Shape(),left=x-width/2,right=x+width/2,bottom=y-depth/2,top=y+depth/2;
  shape.moveTo(left+radius,bottom);
  shape.lineTo(right-radius,bottom);shape.quadraticCurveTo(right,bottom,right,bottom+radius);
  shape.lineTo(right,top-radius);shape.quadraticCurveTo(right,top,right-radius,top);
  shape.lineTo(left+radius,top);shape.quadraticCurveTo(left,top,left,top-radius);
  shape.lineTo(left,bottom+radius);shape.quadraticCurveTo(left,bottom,left+radius,bottom);
  return shape;
}

function mountDisplay(create,x,z,edgeInk){
  const frame=roundedPanel(DISPLAY_FRAME);
  frame.holes.push(roundedPanel(DISPLAY_GLASS));
  const bezel=create(new T.ExtrudeGeometry(frame,{depth:.012,curveSegments:12,bevelEnabled:false}),edgeInk,x,FACE_HEIGHT-.011,z);
  bezel.rotation.x=-Math.PI/2;bezel.name='Recessed display bezel';
  const well=create(new T.ExtrudeGeometry(roundedPanel(DISPLAY_GLASS),{depth:.003,curveSegments:12,bevelEnabled:false}),edgeInk,x,FACE_HEIGHT-.009,z);
  well.rotation.x=-Math.PI/2;well.name='Black backing beneath the LCD';
  const glassInk=new T.MeshPhysicalMaterial({color:0xb3d4ed,transparent:true,opacity:.115,roughness:.096,metalness:.15,clearcoat:1,clearcoatRoughness:.09,depthWrite:false});
  const glass=create(new T.ExtrudeGeometry(roundedPanel(DISPLAY_GLASS),{depth:.0015,curveSegments:12,bevelEnabled:false}),glassInk,x,FACE_HEIGHT-.001,z);
  glass.rotation.x=-Math.PI/2;glass.name='Flush display cover glass';glass.renderOrder=2;
  return {bezel,glass};
}

function thumbSurface(radius){return .064+.010*(radius/.061)**2;}

function mountThumbStick(create,root,x,z,edgeInk,rubberInk,bezelInk){
  const ringGeometry=new T.LatheGeometry([
    [.056,-.005],[.065,-.005],[.069,.001],[.069,.006],[.065,.010],[.057,.010],[.053,.005],[.056,-.005]
  ].map(([r,y])=>new T.Vector2(r,y)),56);
  const socket=create(ringGeometry,edgeInk,x,FACE_HEIGHT,z);
  socket.name='Thumbstick socket';
  const bootGeometry=new T.LatheGeometry([
    [0,0],[.056,0],[.061,.005],[.055,.007],[.049,.006],[.050,.010],[.044,.014],
    [.040,.013],[.041,.017],[.032,.022],[.027,.020],[.026,.024],[.013,.030],[0,.030]
  ].map(([r,y])=>new T.Vector2(r,y)),56);
  const boot=create(bootGeometry,rubberInk,x,FACE_HEIGHT,z);
  boot.name='Flexible thumbstick boot';
  const pivot=new T.Group();
  pivot.name='Thumbstick pivot';pivot.position.set(x,FACE_HEIGHT+.011,z);root.add(pivot);
  const stem=create(new T.CylinderGeometry(.014,.019,.047,32),bezelInk,0,.030,0);
  stem.name='Thumbstick shaft';pivot.add(stem);
  const profile=[
    [0,.044],[.034,.044],[.044,.048],[.053,.051],[.059,.054],[.063,.058],
    [.062,.060],[.064,.061],[.064,.064],[.062,.065],[.064,.066],[.064,.069],
    [.062,.073],[.059,thumbSurface(.059)],...[.052,.042,.032,.020,0].map(r=>[r,thumbSurface(r)])
  ];
  const cap=create(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),64),rubberInk,0,0,0);
  cap.name='Concave rubber thumb cap';pivot.add(cap);
  return {socket,boot,stem,cap,pivot};
}

function thumbArtwork(size){
  const geometry=new T.RingGeometry(0,size/2,56,12);
  const position=geometry.getAttribute('position');
  for(let i=0;i<position.count;i++)position.setZ(i,thumbSurface(Math.hypot(position.getX(i),position.getY(i)))+.0007);
  geometry.computeVertexNormals();geometry.computeBoundingBox();
  return geometry;
}

function higherStickerGeometry(key,placement,edge=false){
  const [horizontal,vertical,relativeWidth,degrees]=placement;
  const diameter=key.size*(key.shoulder?1:.93),width=diameter*relativeWidth;
  const rotation=-degrees*Math.PI/180,cos=Math.cos(rotation),sin=Math.sin(rotation);
  const geometry=new T.PlaneGeometry(width*(edge?1.045:1),width/3*(edge?1.09:1),key.stick?8:1,key.stick?4:1);
  const position=geometry.getAttribute('position'),surface=key.button.geometry.boundingBox.max.z;
  for(let i=0;i<position.count;i++){
    const u=position.getX(i),v=position.getY(i);
    const x=horizontal*diameter+cos*u-sin*v,y=-vertical*diameter+sin*u+cos*v;
    const height=key.stick?thumbSurface(Math.hypot(x,y))+.0007:surface;
    position.setXYZ(i,x,y,height+(edge?.00024:.00054));
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function createLisbonController({width=.52,mobile=false,onChange=()=>{}}={}){
  const root=new T.Group();root.name='Lisbon · original street controller';root.scale.setScalar(width);
  const materials=new Set(),geometries=new Set(),textures=new Set(),keys=new Map(),pending=[];
  let loaded=0,disposed=false;
  const grain=moldedGrain();textures.add(grain);
  const shellInk=new T.MeshPhysicalMaterial({color:0x282e39,roughness:.49,metalness:.16,clearcoat:.29,clearcoatRoughness:.38,bumpMap:grain,bumpScale:.0012});
  const edgeInk=new T.MeshPhysicalMaterial({color:0x171d26,roughness:.57,metalness:.18});
  const gripInk=new T.MeshPhysicalMaterial({color:0x121821,roughness:.73,metalness:.03,bumpMap:grain,bumpScale:.0024});
  const rubberInk=new T.MeshPhysicalMaterial({color:0x151b24,roughness:.70,metalness:.03,bumpMap:grain,bumpScale:.0017});
  const bezelInk=new T.MeshPhysicalMaterial({color:0x3b4958,roughness:.36,metalness:.42});
  const lighting=new T.MeshBasicMaterial({color:0x8aacd6,toneMapped:false});
  for(const ink of [shellInk,edgeInk,gripInk,rubberInk,bezelInk,lighting])materials.add(ink);
  const create=(geometry,material,x,y,z)=>{geometries.add(geometry);materials.add(material);const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);root.add(mesh);return mesh;};
  function shell(material,y,depth,bevel,scale,shape=outline()){
    const mesh=create(new T.ExtrudeGeometry(shape,{depth,curveSegments:mobile?10:24,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:mobile?2:4}),material,0,y,0);
    mesh.rotation.x=-Math.PI/2;mesh.scale.set(scale,scale,1);return mesh;
  }
  const lower=shell(edgeInk,0,.025,.026,.961);
  const belt=shell(bezelInk,.025,.003,.003,.991);
  const faceShape=outline(),faceScale=.982,displayZ=LISBON_KEYS.destination[1];
  faceShape.holes.push(roundedPanel({width:DISPLAY_FRAME.width/faceScale,depth:DISPLAY_FRAME.depth/faceScale,radius:DISPLAY_FRAME.radius/faceScale},0,-displayZ/faceScale));
  const face=shell(shellInk,.044,.016,.020,faceScale,faceShape);
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
    const mount=create(shoulderGeometry(.221,.012,x<0?1:-1,mobile),edgeInk,x,.065,z-.001);
    mount.rotation.x=-Math.PI/2;mount.name='Recessed shoulder seat';
    const trigger=create(new T.CapsuleGeometry(.042,.118,6,mobile?10:20),gripInk,x,-.012,z-.013);
    trigger.rotation.set(.22,0,Math.PI/2);trigger.scale.set(.86,1,1.02);trigger.name='Sculpted rear trigger paddle';
    shoulderMounts.push(mount,trigger);
  }
  const light=create(new T.BoxGeometry(.104,.008,.006),lighting,0,.042,-.279);
  light.name='Controller status line';
  const loader=globalThis.document?new T.TextureLoader():null;
  for(const [id,[x,z,size]] of Object.entries(LISBON_KEYS)){
    const isStick=id==='roundabout'||id==='left_or_straight';
    const shoulder=id==='fire_exit'||id==='aed';
    const isDisplay=id==='destination';
    const geometry=shoulder ? shoulderGeometry(size,.012,x<0?1:-1,mobile)
      : isStick ? thumbArtwork(size*.93)
      : createLisbonSignGeometry(id,size*(isDisplay?1:.93),isDisplay?.0013:.023);
    if(!isStick&&!isDisplay)tintButtonEdges(geometry,shoulder?.76:.44);
    const stick=isStick ? mountThumbStick(create,root,x,z,edgeInk,rubberInk,bezelInk) : undefined;
    const display=isDisplay ? mountDisplay(create,x,z,edgeInk) : undefined;
    const keyY=FACE_HEIGHT+(shoulder?.018:isDisplay?-.002:isStick?.080:id==='pharma'?.024:.019);
    const baseY=isStick ? 0 : keyY-geometry.boundingBox.max.z;
    const ink=isDisplay ? new T.MeshBasicMaterial({color:0xffffff,toneMapped:false,alphaTest:.15})
      : new T.MeshPhysicalMaterial({
        color:0xffffff,vertexColors:!isStick,roughness:isStick?.51:.43,metalness:.13,
        emissive:0xffffff,emissiveIntensity:.20,alphaTest:shoulder?0:.15,
        clearcoat:.30,clearcoatRoughness:.22,toneMapped:false
      });
    const button=create(geometry,ink,x,baseY,z);
    button.name=shoulder ? id+' slim shoulder button' : isDisplay ? 'Backlit Destination display' : id+' sign surface';
    button.rotation.x=-Math.PI/2;
    button.visible=false;
    if(stick){
      button.position.set(0,0,0);
      stick.pivot.add(button);
    }
    if(loader)pending.push(new Promise(resolve=>{
      const texture=loader.load('/assets/signs/'+id+'.png',source=>{
        if(!disposed){
          const map=shoulder ? shoulderTexture(source.image) : source;
          map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
          ink.map=map;
          if(!isDisplay)ink.emissiveMap=map;
          ink.needsUpdate=true;
          textures.add(map);
          button.visible=true;loaded++;onChange();
        }
        resolve();
      },undefined,resolve);
      textures.add(texture);
    }));
    const key={id,x,z,size,y:keyY,baseY,button,shoulder,stick,display,kind:shoulder?'shoulder':isStick?'stick':isDisplay?'display':'sign'};
    if(shoulder)key.artworkSize=[size*253/512,size*.36*253/184];
    if(shoulder)key.applyPressure=(amount,motion)=>{
      const travel=motion?.006*amount:0;
      button.position.y=baseY-travel;
      return {travel,tilt:0};
    };
    if(stick)key.applyPressure=(amount,motion)=>{
      const tilt=motion?.27*amount:0,travel=motion?.004*amount:0;
      stick.pivot.position.y=FACE_HEIGHT+.011-travel;
      stick.pivot.rotation.x=tilt;stick.pivot.rotation.z=Math.sign(x)*tilt*.35;
      return {travel,tilt};
    };
    if(display)key.applyPressure=amount=>{
      ink.color.setScalar(1+.24*amount);
      return {travel:0,tilt:0};
    };
    keys.set(id,key);
  }
  let stickerFace,stickerEdge,stickerLoaded=false;
  function markPlayed(id){
    const key=keys.get(id),placement=LISBON_PLAYED_STICKERS[id];
    if(!key||!placement||key.sticker)return;
    if(!stickerFace){
      const map=loader ? loader.load('/assets/gallery/higher.svg',()=>{
        if(disposed)return;
        stickerLoaded=true;
        for(const playedKey of keys.values())if(playedKey.sticker)playedKey.sticker.visible=true;
        onChange();
      }) : null;
      if(map){map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;textures.add(map);}
      stickerFace=new T.MeshPhysicalMaterial({map,color:0xf5f2ef,roughness:.52,metalness:.02,
        clearcoat:.22,clearcoatRoughness:.28,emissive:0xffffff,emissiveMap:map,emissiveIntensity:.14,alphaTest:.32,toneMapped:false});
      stickerEdge=new T.MeshBasicMaterial({map,color:0x827b72,alphaTest:.30,toneMapped:false});
    }
    const film=create(higherStickerGeometry(key,placement),stickerFace,0,0,0);
    const backing=create(higherStickerGeometry(key,placement,true),stickerEdge,0,0,0);
    film.name=id+' · Higher vinyl sticker';
    backing.name='Thin adhesive edge';
    key.sticker=new T.Group();key.sticker.add(backing,film);key.sticker.visible=stickerLoaded;
    key.button.add(key.sticker);
    onChange();
  }

  root.userData.kind='lisbon-controller';
  root.userData.faceCorners=[[-.54,FACE_HEIGHT,-.34],[.54,FACE_HEIGHT,-.34],[.54,FACE_HEIGHT,.39],[-.54,FACE_HEIGHT,.39]];
  const pickables=[lower,belt,face,hitSurface,...grips,...shoulderMounts,...[...keys.values()].map(key=>key.button)];
  const data={kind:'lisbon-controller',action:'open',href:'/play_lisbon_street?board=1'};
  for(const mesh of pickables)Object.assign(mesh.userData,data);
  return {root,hitSurface,pickables,keys,markPlayed,ready:Promise.all(pending),
    diagnostics:()=>({kind:'lisbon-controller-original-3d',version:6,width,keys:keys.size,loaded,stickers:[...keys.values()].filter(key=>key.sticker?.visible).map(key=>key.id),closedShell:true,physical:true,palmGrips:grips.length,texturedShell:true,thumbSticks:2,articulatedSticks:2,shoulderControls:4,activeShoulders:2,flushDisplay:true}),
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
  function faceRectangle(key,reachX,reachZ,minimum=0){
    const box=renderer.domElement.getBoundingClientRect();
    // Use the neutral face coordinates even while the control tilts or moves.
    const project=(x,z)=>model.root.localToWorld(new T.Vector3(x,key.y,z)).project(camera);
    const center=project(key.x,key.z);
    const topLeft=project(key.x-reachX,key.z-reachZ);
    const bottomRight=project(key.x+reachX,key.z+reachZ);
    const width=Math.max(minimum,box.width*(bottomRight.x-topLeft.x)/2);
    const height=Math.max(minimum,box.height*(topLeft.y-bottomRight.y)/2);
    return {
      x:box.left+(center.x+1)*box.width/2-width/2,
      y:box.top+(1-center.y)*box.height/2-height/2,
      width,height
    };
  }
  function target(id){
    const key=model.keys.get(id);if(!key)return null;
    const {min,max}=key.button.geometry.boundingBox;
    return faceRectangle(key,Math.max(-min.x,max.x),Math.max(-min.y,max.y),23);
  }
  function artworkTarget(id){
    const key=model.keys.get(id);if(!key)return null;
    if(key.artworkSize)return faceRectangle(key,key.artworkSize[0]/2,key.artworkSize[1]/2);
    const diameter=key.size*(key.kind==='display'?1:.93);
    return faceRectangle(key,diameter/2,diameter/2);
  }
  const artworkMaterials=new Map([...model.keys].map(([id,{button}])=>[id,{
    opacity:button.material.opacity,transparent:button.material.transparent,depthWrite:button.material.depthWrite
  }]));
  function setAssembly(levels){
    let changed=false;
    for(const [id,{button}] of model.keys){
      const level=levels?.get(id)??(levels?0:1),material=button.material,base=artworkMaterials.get(id);
      const fading=level>0&&level<1,opacity=base.opacity*level,transparent=base.transparent||fading;
      const visible=!!material.map&&level>0;
      if(visible!==button.visible||opacity!==material.opacity||transparent!==material.transparent){
        button.visible=visible;material.opacity=opacity;
        if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}
        material.depthWrite=base.depthWrite&&!fading;
        changed=true;
      }
    }
    if(changed)draw();
  }
  const presses=new Map();
  let pressFrame=0,lastFeedback=null;
  function pressureEffect(key){
    if(key.kind==='display')return (pressure,motion)=>key.applyPressure(pressure,motion);
    const material=key.button.material;
    const color=material.color.clone(),emissive=material.emissiveIntensity;
    return (pressure,motion)=>{
      let effect;
      if(key.applyPressure)effect=key.applyPressure(pressure,motion);
      else{
        const travel=motion ? .013*pressure : 0;
        key.button.position.y=key.baseY-travel;
        effect={travel,tilt:0};
      }
      material.color.copy(color).multiplyScalar(1-.32*pressure);
      material.emissiveIntensity=emissive*(1-.38*pressure);
      return effect;
    };
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
      const motion=!track.reduced;
      if(pressure!==track.amount||motion!==track.motion){
        track.amount=pressure;track.motion=motion;
        track.effect=track.applyPressure(pressure,motion);
        redraw=true;
      }
      lastFeedback={id,kind:track.kind,pressure,...track.effect,mode:finished&&pressure===0?'released':track.mode};
      if(finished){
        track.resolve?.();track.resolve=null;
        if(pressure===0)presses.delete(id);
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
      track={applyPressure:pressureEffect(key),kind:key.kind||'sign',amount:0};
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
  return {canvas:renderer.domElement,model,ready:model.ready.then(draw),draw,layout,target,artworkTarget,setAssembly,feedback,
    faceCorners:()=>projectModelFace(model.root,camera,renderer.domElement.clientWidth,renderer.domElement.clientHeight),
    feedbackState:()=>lastFeedback,
    dispose(){
      if(drawFrame)cancelAnimationFrame(drawFrame);
      if(pressFrame)cancelAnimationFrame(pressFrame);
      for(const track of presses.values()){track.resolve?.();track.applyPressure(0,false);}
      presses.clear();removeEventListener('resize',layout);model.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    }
  };
}
