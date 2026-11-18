import * as T from './vendor/three-0.180.0.mjs';
import {addObjectLighting} from './gallery-object-view.mjs';
import {createLisbonSignGeometry} from './lisbon-sign-buttons.mjs';

// The original sign layout is shared by the table and the fullscreen reader.
// Coordinates and sizes are in controller-width units, with the grips toward +Z.
export const LISBON_KEYS=Object.freeze({
  fire_exit:[-.35,-.209,.15],Heli:[0,-.234,.064],aed:[.35,-.209,.15],
  green_walk:[-.195,-.196,.056],red_walk:[-.195,-.126,.056],pharma:[-.35,-.10,.085],
  destination:[0,-.148,.24],lisboa_city_hall:[.193,-.156,.069],speed_bump_caution:[.325,-.105,.071],
  crosswalk_caution:[.25,-.011,.071],no_entry:[.397,-.010,.070],no_parking:[.33,.077,.076],
  hospital:[0,-.052,.047],parking:[0,.009,.06],Hotel:[0,.074,.062],
  dead_end:[-.341,.022,.065],roundabout:[-.163,.113,.107],left_or_straight:[.163,.113,.107],
  no_uturn:[.35,.171,.084],priority:[-.348,.177,.09],crosswalk:[0,.151,.073],stop:[.375,.28,.083]
});
const FACE_HEIGHT=.075;
export function lisbonControllerShot(viewportWidth,viewportHeight){
  return {
    center:[0,.032,.087],pitch:1.245,
    pixels:Math.min(viewportWidth*.70,1050,viewportHeight*.78/.79)
  };
}
function outline(){
  const shape=new T.Shape();
  shape.moveTo(0,.253);
  shape.bezierCurveTo(.164,.253,.297,.298,.407,.271);
  shape.bezierCurveTo(.501,.247,.479,.129,.485,-.007);
  shape.bezierCurveTo(.488,-.137,.567,-.301,.543,-.410);
  shape.bezierCurveTo(.526,-.488,.426,-.492,.373,-.427);
  shape.bezierCurveTo(.334,-.381,.331,-.262,.266,-.218);
  shape.bezierCurveTo(.198,-.173,.107,-.205,0,-.201);
  shape.bezierCurveTo(-.107,-.205,-.198,-.173,-.266,-.218);
  shape.bezierCurveTo(-.331,-.262,-.334,-.381,-.373,-.427);
  shape.bezierCurveTo(-.426,-.492,-.526,-.488,-.543,-.410);
  shape.bezierCurveTo(-.567,-.301,-.488,-.137,-.485,-.007);
  shape.bezierCurveTo(-.479,.129,-.501,.247,-.407,.271);
  shape.bezierCurveTo(-.297,.298,-.164,.253,0,.253);
  return shape;
}

function shellCurve(x,z){
  const shoulders=.015*Math.exp(-(((Math.abs(x)-.33)/.13)**2+((z+.082)/.22)**2));
  const handles=.065*T.MathUtils.smoothstep(z,.083,.48);
  return shoulders-handles;
}

// Round, diving handle profiles are visible from the low seated camera.
const GRIP_PROFILE=[
  {z:-.147,x:.309,y:.018,halfWidth:.049,halfHeight:.038},
  {z:-.051,x:.349,y:.010,halfWidth:.114,halfHeight:.052},
  {z:.059,x:.382,y:.002,halfWidth:.111,halfHeight:.066},
  {z:.162,x:.402,y:-.006,halfWidth:.107,halfHeight:.066},
  {z:.260,x:.426,y:-.015,halfWidth:.102,halfHeight:.061},
  {z:.356,x:.450,y:-.026,halfWidth:.091,halfHeight:.047},
  {z:.427,x:.458,y:-.026,halfWidth:.059,halfHeight:.032},
  {z:.470,x:.462,y:-.022,halfWidth:.005,halfHeight:.007}
];

function palmGrip(side,mobile){
  const path=new T.CatmullRomCurve3(GRIP_PROFILE.map(p=>new T.Vector3(side*p.x,p.y,p.z)));
  const radii=new T.CatmullRomCurve3(GRIP_PROFILE.map(p=>new T.Vector3(p.halfWidth,p.halfHeight,0)));
  const rings=mobile?20:34,sides=mobile?18:36,vertices=[],indices=[],uvs=[];
  for(let ring=0;ring<=rings;ring++){
    const center=path.getPoint(ring/rings),radius=radii.getPoint(ring/rings);
    for(let j=0;j<sides;j++){
      const angle=j*Math.PI*2/sides;
      vertices.push(center.x+Math.cos(angle)*radius.x,Math.max(-.069,center.y+Math.sin(angle)*radius.y),center.z);
      uvs.push(j/sides,ring/rings);
      if(ring<rings){
        const a=ring*sides+j,b=ring*sides+(j+1)%sides;
        indices.push(a,b,b+sides,a,b+sides,a+sides);
      }
    }
  }
  for(const ring of [0,rings]){
    const center=path.getPoint(ring/rings),cap=vertices.length/3;
    vertices.push(...center.toArray());
    uvs.push(.5,ring/rings);
    for(let j=0;j<sides;j++){
      const a=ring*sides+j,b=ring*sides+(j+1)%sides;
      indices.push(cap,ring===0?b:a,ring===0?a:b);
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}

function gripTexture(){
  const size=32,pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const ax=x%8-3.5,ay=y%8-3.5;
    const relief=Math.round(90+100*Math.exp(-(ax*ax+ay*ay)/5));
    pixels.set([relief,relief,relief,255],(y*size+x)*4);
  }
  const texture=new T.DataTexture(pixels,size,size);
  texture.wrapS=texture.wrapT=T.RepeatWrapping;
  texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;texture.repeat.set(5,9);texture.needsUpdate=true;
  return texture;
}

// An inlaid, textured skin rides a few millimetres above each curved grip.
function gripSkin(side,mobile){
  const geometry=new T.BufferGeometry(),segments=mobile?24:48,rings=8;
  const positions=[],uvs=[],indices=[];
  function addPoint(u,v){
    const z=.292+v*.151,x=side*(.425+v*.047+u*(.076-.011*v));
    const crown=.004*(1-Math.min(1,u*u+v*v));
    positions.push(x,FACE_HEIGHT+shellCurve(x,z)+.004+crown,z);uvs.push(u*.5+.5,v*.5+.5);
  }
  function triangle(a,b,c){indices.push(a,side>0?c:b,side>0?b:c);}
  addPoint(0,0);
  for(let ring=1;ring<=rings;ring++)for(let j=0;j<segments;j++){
    const angle=j*Math.PI*2/segments,radius=ring/rings;
    addPoint(Math.cos(angle)*radius,Math.sin(angle)*radius);
    const a=1+(ring-1)*segments+j,b=1+(ring-1)*segments+(j+1)%segments;
    if(ring===1)triangle(0,a,b);
    else{triangle(a-segments,a,b);triangle(a-segments,b,b-segments);}
  }
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
  geometry.computeVertexNormals();return geometry;
}

// The normal follows the derivative of the shell curvature, so a top face
// remains optically smooth even where its contour triangles are uneven.
function bendShell(mesh,scale=1,bottom=-.069){
  const position=mesh.geometry.attributes.position,normal=mesh.geometry.attributes.normal;
  const epsilon=.0002,direction=new T.Vector3();
  for(let i=0;i<position.count;i++){
    const x=position.getX(i)*scale,z=position.getY(i)*scale;
    const worldX=x+mesh.position.x,worldZ=mesh.position.z-z;
    const height=mesh.position.y+position.getZ(i)+shellCurve(worldX,worldZ);
    position.setXYZ(i,x,z,Math.max(bottom,height)-mesh.position.y);
    if(height<bottom){normal.setXYZ(i,0,0,-1);continue;}
    const dx=(shellCurve(worldX+epsilon,worldZ)-shellCurve(worldX-epsilon,worldZ))/(2*epsilon);
    const dz=(shellCurve(worldX,worldZ+epsilon)-shellCurve(worldX,worldZ-epsilon))/(2*epsilon);
    const nz=normal.getZ(i);
    direction.set(normal.getX(i)/scale-dx*nz,normal.getY(i)/scale+dz*nz,nz).normalize();
    normal.setXYZ(i,...direction.toArray());
  }
  return mesh;
}

export function createLisbonController({width=.52,mobile=false,onChange=()=>{}}={}){
  const root=new T.Group();root.name='Lisbon · original street controller';root.scale.setScalar(width);
  const materials=new Set(),geometries=new Set(),textures=new Set(),keys=new Map(),pending=[];
  let loaded=0,disposed=false;
  const skin=gripTexture();textures.add(skin);
  const shellInk=new T.MeshPhysicalMaterial({color:0x222533,roughness:.37,metalness:.18,clearcoat:.38,clearcoatRoughness:.3});
  const edgeInk=new T.MeshPhysicalMaterial({color:0x0a0d12,roughness:.49,metalness:.31});
  const gripInk=new T.MeshPhysicalMaterial({color:0x111319,roughness:.62,metalness:.06,clearcoat:.12});
  const gripSkinInk=new T.MeshPhysicalMaterial({color:0x090b11,roughness:.81,metalness:.025,bumpMap:skin,bumpScale:.0035});
  const rubberInk=new T.MeshPhysicalMaterial({color:0x090b0f,roughness:.66,metalness:.03});
  const buttonInk=new T.MeshPhysicalMaterial({color:0x1b1c26,roughness:.42,metalness:.22,clearcoat:.35});
  const bezelInk=new T.MeshPhysicalMaterial({color:0x363b4a,roughness:.31,metalness:.53});
  const lighting=new T.MeshBasicMaterial({color:0x7899d4,toneMapped:false});
  for(const ink of [shellInk,edgeInk,gripInk,gripSkinInk,rubberInk,buttonInk,bezelInk,lighting])materials.add(ink);
  const create=(geometry,material,x,y,z)=>{geometries.add(geometry);materials.add(material);const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);root.add(mesh);return mesh;};
  function shell(material,y,depth,bevel,scale){
    const geometry=new T.ExtrudeGeometry(outline(),{depth,curveSegments:mobile?10:24,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:mobile?2:4});
    const mesh=create(geometry,material,0,y,0);mesh.rotation.x=-Math.PI/2;
    return bendShell(mesh,scale);
  }
  const lower=shell(edgeInk,-.015,.035,.025,.963);
  const belt=shell(bezelInk,.021,.004,.005,.979);
  const face=shell(shellInk,.028,.034,.013,.985);
  lower.name='Radiused controller underside';belt.name='Controller shell joint';face.name='Bevelled graphite controller shell';
  const grips=[-1,1].map(side=>{
    const mesh=create(palmGrip(side,mobile),gripInk,0,0,0);
    mesh.name=side<0?'Left sculpted palm grip':'Right sculpted palm grip';
    return mesh;
  });
  const gripSkins=[-1,1].map(side=>{
    const mesh=create(gripSkin(side,mobile),gripSkinInk,0,0,0);
    mesh.name=side<0?'Left stippled grip inlay':'Right stippled grip inlay';
    return mesh;
  });
  const hitGeometry=new T.ShapeGeometry(outline(),mobile?10:24);
  const hitSurface=create(hitGeometry,new T.MeshBasicMaterial({visible:false,side:T.DoubleSide}),0,.075,0);
  hitSurface.rotation.x=-Math.PI/2;hitSurface.userData.kind='lisbon-controller';
  const shoulderControls=[];
  // Rounded bumpers above a second row of trigger paddles.
  for(const x of [-.35,.35]){
    const bumper=create(new T.CapsuleGeometry(.033,.154,6,mobile?10:20),buttonInk,x,.051,-.275);
    bumper.rotation.z=Math.PI/2;bumper.scale.set(.71,1,1);bumper.name='Rounded shoulder bumper';
    const trigger=create(new T.CapsuleGeometry(.043,.123,6,mobile?10:20),gripInk,x,-.014,-.283);
    trigger.rotation.set(.22,0,Math.PI/2);trigger.scale.set(.86,1,1.02);trigger.name='Sculpted rear trigger paddle';
    shoulderControls.push(bumper,trigger);
  }
  const light=create(new T.BoxGeometry(.11,.008,.006),lighting,0,.031,-.278);
  light.name='Controller status line';
  const loader=globalThis.document?new T.TextureLoader():null;
  const deckRay=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
  const deckSurfaces=[face,...gripSkins];
  for(const surface of deckSurfaces)surface.updateWorldMatrix(true,false);
  for(const [id,[x,z,size]] of Object.entries(LISBON_KEYS)){
    const stick=id==='roundabout'||id==='left_or_straight';
    // Fit the full directional plaque between Heli and Hospital at its native aspect.
    const faceSize=size*(id==='destination'?.69:.93);
    const depth=stick?.025:.028;
    deckRay.ray.origin.set(x*width,.4*width,z*width);
    const deck=deckRay.intersectObjects(deckSurfaces,false)[0];
    const deckY=deck ? deck.point.y/width : FACE_HEIGHT+shellCurve(x,z);
    const baseY=deckY+(stick?.039:-.008);
    if(stick){
      const stem=create(new T.CylinderGeometry(.021,.029,.051,28),rubberInk,x,deckY+.014,z);
      stem.name=id+' thumb-stick stem';
    }
    const ink=new T.MeshStandardMaterial({
      color:0xffffff,roughness:.46,metalness:.12,
      emissive:0xffffff,emissiveIntensity:.20,alphaTest:.15,toneMapped:false
    });
    const button=create(createLisbonSignGeometry(id,faceSize,depth),ink,x,baseY,z);
    button.name=id+' sculpted sign button';
    button.rotation.x=-Math.PI/2;
    button.visible=false;
    if(loader)pending.push(new Promise(resolve=>{
      const texture=loader.load('/assets/signs/'+id+'.png',()=>{
        if(!disposed){
          button.visible=true;loaded++;onChange();
        }
        resolve();
      },undefined,resolve);
      texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
      ink.map=texture;ink.emissiveMap=texture;textures.add(texture);
    }));
    keys.set(id,{id,x,z,size,y:baseY+depth,baseY,button});
  }
  root.userData.kind='lisbon-controller';
  root.userData.faceCorners=[[-.56,FACE_HEIGHT,-.33],[.56,FACE_HEIGHT,-.33],[.56,FACE_HEIGHT,.48],[-.56,FACE_HEIGHT,.48]];
  const pickables=[lower,belt,face,hitSurface,...grips,...gripSkins,...shoulderControls,...[...keys.values()].map(key=>key.button)];
  const data={kind:'lisbon-controller',action:'open',href:'/play_lisbon_street?board=1'};
  for(const mesh of pickables)Object.assign(mesh.userData,data);
  return {root,hitSurface,pickables,keys,ready:Promise.all(pending),
    diagnostics:()=>({kind:'lisbon-controller-original-3d',width,keys:keys.size,loaded,closedShell:true,physical:true,palmGrips:grips.length,thumbSticks:2,shoulderControls:shoulderControls.length,signShapedKeys:keys.size,gripInlays:gripSkins.length}),
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
    const topLeft=project(key.x+min.x,key.z-max.y);
    const bottomRight=project(key.x+max.x,key.z-min.y);
    const width=Math.max(23,box.width*(bottomRight.x-topLeft.x)/2);
    const height=Math.max(23,box.height*(topLeft.y-bottomRight.y)/2);
    return {
      x:box.left+(topLeft.x+bottomRight.x+2)*box.width/4-width/2,
      y:box.top+(2-topLeft.y-bottomRight.y)*box.height/4-height/2,
      width,height
    };
  }
  function feedback(id,value){
    const key=model.keys.get(id);if(!key)return;
    key.button.position.y=key.baseY-(value?.004:0);
    draw();
  }
  addEventListener('resize',layout);layout();
  return {canvas:renderer.domElement,model,ready:model.ready.then(draw),draw,layout,target,feedback,
    dispose(){if(drawFrame)cancelAnimationFrame(drawFrame);removeEventListener('resize',layout);model.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
  };
}
