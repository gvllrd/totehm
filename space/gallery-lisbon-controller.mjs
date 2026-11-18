import * as T from './vendor/three-0.180.0.mjs';
import {addObjectLighting} from './gallery-object-view.mjs';

// This is the authored Lisbon controller: traffic signs are its physical keys.
// Coordinates are in controller-width units, with the two grips toward +Z.
export const LISBON_KEYS=Object.freeze({
  fire_exit:[-.35,-.209,.15],Heli:[0,-.234,.064],aed:[.35,-.209,.15],
  green_walk:[-.195,-.196,.056],red_walk:[-.195,-.126,.056],pharma:[-.35,-.10,.085],
  destination:[0,-.148,.24],lisboa_city_hall:[.193,-.156,.069],speed_bump_caution:[.325,-.105,.071],
  crosswalk_caution:[.25,-.011,.071],no_entry:[.397,-.010,.070],no_parking:[.33,.077,.076],
  hospital:[0,-.052,.047],parking:[0,.009,.06],Hotel:[0,.074,.062],
  dead_end:[-.341,.022,.065],roundabout:[-.163,.113,.107],left_or_straight:[.163,.113,.107],
  no_uturn:[.35,.171,.084],priority:[-.348,.177,.09],crosswalk:[0,.151,.073],stop:[.375,.28,.083]
});
const FACE_HEIGHT=.077;
export function lisbonControllerShot(viewportWidth,viewportHeight){
  return {
    center:[0,.032,0],eye:[0,3,.58],pitch:Math.atan2(3-.032,.58),
    pixels:Math.min(viewportWidth*.72,1100,viewportHeight*.78/.68)
  };
}
function outline(){
  const shape=new T.Shape();
  shape.moveTo(0,.267);
  shape.bezierCurveTo(.155,.267,.287,.315,.393,.267);
  shape.bezierCurveTo(.479,.230,.470,.103,.493,-.032);
  shape.bezierCurveTo(.517,-.190,.482,-.320,.405,-.338);
  shape.bezierCurveTo(.332,-.357,.289,-.252,.244,-.188);
  shape.bezierCurveTo(.176,-.168,.068,-.198,0,-.196);
  shape.bezierCurveTo(-.068,-.198,-.176,-.168,-.244,-.188);
  shape.bezierCurveTo(-.289,-.252,-.332,-.357,-.405,-.338);
  shape.bezierCurveTo(-.482,-.320,-.517,-.190,-.493,-.032);
  shape.bezierCurveTo(-.470,.103,-.479,.230,-.393,.267);
  shape.bezierCurveTo(-.287,.315,-.155,.267,0,.267);
  return shape;
}

// Cross-sections widen under the palm and taper into the rounded tip. The
// loft remains inside the top silhouette and has a closed underside.
const GRIP_PROFILE=[
  {z:-.159,x:.306,y:.005,halfWidth:.048,halfHeight:.033},
  {z:-.056,x:.340,y:.001,halfWidth:.103,halfHeight:.052},
  {z:.052,x:.371,y:-.001,halfWidth:.109,halfHeight:.061},
  {z:.153,x:.389,y:-.002,halfWidth:.101,halfHeight:.066},
  {z:.236,x:.402,y:0,halfWidth:.086,halfHeight:.064},
  {z:.296,x:.404,y:.005,halfWidth:.059,halfHeight:.050},
  {z:.331,x:.405,y:.016,halfWidth:.027,halfHeight:.028},
  {z:.340,x:.404,y:.022,halfWidth:.006,halfHeight:.009}
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

export function createLisbonController({width=.52,mobile=false,onChange=()=>{}}={}){
  const root=new T.Group();root.name='Lisbon · original street controller';root.scale.setScalar(width);
  const materials=new Set(),geometries=new Set(),textures=new Set(),keys=new Map(),pending=[];
  let loaded=0,disposed=false;
  const shellInk=new T.MeshPhysicalMaterial({color:0x171821,roughness:.36,metalness:.23,clearcoat:.37,clearcoatRoughness:.3});
  const edgeInk=new T.MeshPhysicalMaterial({color:0x0a0d12,roughness:.49,metalness:.31});
  const gripInk=new T.MeshPhysicalMaterial({color:0x111319,roughness:.62,metalness:.06,clearcoat:.12});
  const rubberInk=new T.MeshPhysicalMaterial({color:0x090b0f,roughness:.66,metalness:.03});
  const buttonInk=new T.MeshPhysicalMaterial({color:0x1b1c26,roughness:.42,metalness:.22,clearcoat:.35});
  const bezelInk=new T.MeshPhysicalMaterial({color:0x363b4a,roughness:.31,metalness:.53});
  const lighting=new T.MeshBasicMaterial({color:0x7899d4,toneMapped:false});
  for(const ink of [shellInk,edgeInk,gripInk,rubberInk,buttonInk,bezelInk,lighting])materials.add(ink);
  const create=(geometry,material,x,y,z)=>{geometries.add(geometry);materials.add(material);const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);root.add(mesh);return mesh;};
  function shell(material,y,depth,bevel,scale=1){
    const mesh=create(new T.ExtrudeGeometry(outline(),{depth,curveSegments:mobile?10:24,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:mobile?2:4}),material,0,y,0);
    mesh.rotation.x=-Math.PI/2;mesh.scale.set(scale,scale,1);return mesh;
  }
  const lower=shell(edgeInk,-.026,.041,.024,.958);
  const belt=shell(bezelInk,.019,.004,.006,.978);
  const face=shell(shellInk,.031,.032,.013,.984);
  lower.name='Radiused controller underside';belt.name='Controller shell joint';face.name='Bevelled graphite controller shell';
  const grips=[-1,1].map(side=>{
    const mesh=create(palmGrip(side,mobile),gripInk,0,0,0);
    mesh.name=side<0?'Left sculpted palm grip':'Right sculpted palm grip';
    return mesh;
  });
  const hitGeometry=new T.ShapeGeometry(outline(),mobile?10:24);
  const hitSurface=create(hitGeometry,new T.MeshBasicMaterial({visible:false,side:T.DoubleSide}),0,.075,0);
  hitSurface.rotation.x=-Math.PI/2;hitSurface.userData.kind='lisbon-controller';
  const shoulderControls=[];
  // Rounded bumpers above a second row of trigger paddles.
  for(const x of [-.32,.32]){
    const bumper=create(new T.CapsuleGeometry(.033,.154,6,mobile?10:20),buttonInk,x,.051,-.275);
    bumper.rotation.z=Math.PI/2;bumper.scale.set(.71,1,1);bumper.name='Rounded shoulder bumper';
    const trigger=create(new T.CapsuleGeometry(.043,.123,6,mobile?10:20),gripInk,x,-.014,-.283);
    trigger.rotation.set(.22,0,Math.PI/2);trigger.scale.set(.86,1,1.02);trigger.name='Sculpted rear trigger paddle';
    shoulderControls.push(bumper,trigger);
  }
  const light=create(new T.BoxGeometry(.11,.008,.006),lighting,0,.031,-.278);
  light.name='Controller status line';
  const loader=globalThis.document?new T.TextureLoader():null;
  for(const [id,[x,z,size]] of Object.entries(LISBON_KEYS)){
    const stick=id==='roundabout'||id==='left_or_straight';
    const signWidth=id==='destination'?size:size*.93,signDepth=id==='destination'?size*.39:signWidth;
    const keyY=FACE_HEIGHT+(stick?.066:.022);
    let base;
    if(id==='destination'){
      base=create(new T.BoxGeometry(size+.012,.018,signDepth+.014),bezelInk,x,FACE_HEIGHT+.007,z);
    }else if(stick){
      const socket=create(new T.LatheGeometry([
        new T.Vector2(.024,-.008),new T.Vector2(.062,-.008),new T.Vector2(.066,.000),
        new T.Vector2(.064,.008),new T.Vector2(.058,.012),new T.Vector2(.046,.010),new T.Vector2(.040,.001),new T.Vector2(.024,-.008)
      ],mobile?24:44),edgeInk,x,FACE_HEIGHT,z);
      socket.name=id+' recessed thumb-stick socket';
      create(new T.SphereGeometry(.035,mobile?14:24,12),rubberInk,x,FACE_HEIGHT+.009,z).scale.y=.78;
      create(new T.CylinderGeometry(.017,.022,.035,20),rubberInk,x,FACE_HEIGHT+.036,z).name=id+' thumb-stick stem';
      base=create(new T.LatheGeometry([
        new T.Vector2(0,-.012),new T.Vector2(.040,-.012),new T.Vector2(.052,-.009),
        new T.Vector2(.054,-.002),new T.Vector2(.050,.002),new T.Vector2(.043,.004),
        new T.Vector2(.036,.001),new T.Vector2(0,.001)
      ],mobile?24:44),rubberInk,x,keyY-.0045,z);
    }else{
      base=create(new T.LatheGeometry([
        new T.Vector2(0,-.009),new T.Vector2(size*.556,-.009),new T.Vector2(size*.563,-.003),
        new T.Vector2(size*.53,.008),new T.Vector2(size*.48,.0126),new T.Vector2(0,.0126)
      ],mobile?18:32),buttonInk,x,FACE_HEIGHT+.007,z);
      const rim=create(new T.TorusGeometry(size*.525,.0027,6,mobile?16:28),bezelInk,x,FACE_HEIGHT+.006,z);
      rim.rotation.x=-Math.PI/2;
    }
    base.name=id+' physical key';
    const ink=new T.MeshBasicMaterial({color:0xffffff,transparent:true,alphaTest:.035,toneMapped:false});
    const mark=create(new T.PlaneGeometry(signWidth,signDepth),ink,x,keyY,z);
    mark.visible=false;mark.rotation.x=-Math.PI/2;mark.name=id+' original sign';
    if(loader)pending.push(new Promise(resolve=>{
      const texture=loader.load('/assets/signs/'+id+'.png',map=>{
        if(!disposed){
          const aspect=map.image.naturalWidth/map.image.naturalHeight;
          if(Number.isFinite(aspect)&&aspect>0){mark.scale.x=Math.min(1,signDepth*aspect/signWidth);mark.scale.y=Math.min(1,signWidth/aspect/signDepth);}
          mark.visible=true;loaded++;onChange();
        }
        resolve();
      },undefined,resolve);
      texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;ink.map=texture;textures.add(texture);
    }));
    keys.set(id,{id,x,z,size,y:keyY,baseY:base.position.y,mark,base});
  }
  root.userData.kind='lisbon-controller';
  root.userData.faceCorners=[[-.53,FACE_HEIGHT,-.32],[.53,FACE_HEIGHT,-.32],[.53,FACE_HEIGHT,.36],[-.53,FACE_HEIGHT,.36]];
  const pickables=[lower,belt,face,hitSurface,...grips,...shoulderControls,...[...keys.values()].map(key=>key.base)];
  const data={kind:'lisbon-controller',action:'open',href:'/play_lisbon_street?board=1'};
  for(const mesh of pickables)Object.assign(mesh.userData,data);
  return {root,hitSurface,pickables,keys,ready:Promise.all(pending),
    diagnostics:()=>({kind:'lisbon-controller-original-3d',width,keys:keys.size,loaded,closedShell:true,physical:true,palmGrips:grips.length,thumbSticks:2,shoulderControls:shoulderControls.length}),
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
    const point=project(key.x,key.z);
    const left=project(key.x-key.size/2,key.z),right=project(key.x+key.size/2,key.z);
    const keyDepth=id==='destination'?key.size*.39:key.size;
    const top=project(key.x,key.z-keyDepth/2),bottom=project(key.x,key.z+keyDepth/2);
    const width=Math.max(23,box.width*(right.x-left.x)/2),height=Math.max(23,box.height*(top.y-bottom.y)/2);
    return {x:box.left+(point.x+1)*box.width/2-width/2,y:box.top+(1-point.y)*box.height/2-height/2,width,height};
  }
  function feedback(id,value){
    const key=model.keys.get(id);if(!key)return;
    const travel=value ? .004 : 0;
    key.base.position.y=key.baseY-travel;
    key.mark.position.y=key.y-travel;
    draw();
  }
  addEventListener('resize',layout);layout();
  return {canvas:renderer.domElement,model,ready:model.ready.then(draw),draw,layout,target,feedback,
    dispose(){if(drawFrame)cancelAnimationFrame(drawFrame);removeEventListener('resize',layout);model.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
  };
}
