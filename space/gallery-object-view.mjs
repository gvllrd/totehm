import * as T from './vendor/three-0.180.0.mjs';

export const premiumCaseShot=(width,height)=>({pixels:Math.min(width*.56,height*.57,480),pitch:.13,yaw:.26,center:[0,-.075,0]});
export function modelShotRotation(shot){
 return new T.Quaternion().setFromEuler(new T.Euler(shot.pitch,shot.yaw||0,0));
}

export function projectModelFace(object,camera,width,height){
 object.updateWorldMatrix(true,false);
 return object.userData.faceCorners?.map(corner=>{
  const point=new T.Vector3(...corner).applyMatrix4(object.matrixWorld).project(camera);
  return [(point.x+1)*width/2,(1-point.y)*height/2];
 })||null;
}
export function addObjectLighting(scene){
 scene.add(new T.HemisphereLight(0xd9e1f7,0x56536b,2));
 for(const [color,intensity,position] of [[0xffe4c4,2.3,[-3,4,5]],[0xaac3ff,1.1,[4,1,2]]]){
  const light=new T.DirectionalLight(color,intensity);light.position.set(...position);scene.add(light);
 }
}

function copyGeometry(source){
 const copy=source.isMesh?new T.Mesh(source.geometry,source.material):new T.Group();
 copy.position.copy(source.position);copy.quaternion.copy(source.quaternion);copy.scale.copy(source.scale);
 copy.visible=source.visible;copy.renderOrder=source.renderOrder;
 copy.userData.faceCorners=source.userData.faceCorners;
 for(const child of source.children)copy.add(copyGeometry(child));
 return copy;
}

// Capture the camera and object in the same coordinate system as the displayed world.
export function captureObjectLift(object,worldCamera){
 object.updateWorldMatrix(true,false);worldCamera.updateMatrixWorld();
 const position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();
 new T.Matrix4().multiplyMatrices(worldCamera.matrixWorldInverse,object.matrixWorld).decompose(position,rotation,scale);
 const projection=worldCamera.projectionMatrix.elements;
 return {position:position.toArray(),rotation:rotation.toArray(),scale:scale.toArray(),
  projection:[projection[0],projection[5]],viewport:[innerWidth,innerHeight]};
}

export function createObjectLiftMotion(object,pose,{width,shot,geometric=false}){
 const camera=new T.Camera();
 const fromPosition=new T.Vector3().fromArray(pose.position),fromRotation=new T.Quaternion().fromArray(pose.rotation);
 const [viewportWidth,viewportHeight]=pose.viewport;
 const final=shot(viewportWidth,viewportHeight),toRotation=modelShotRotation(final);
 const center=new T.Vector3(...final.center).multiplyScalar(width).applyQuaternion(toRotation);
 const distance=Math.max(.03,-fromPosition.z);
 const [startScaleX,startScaleY]=pose.projection.map(value=>value/distance);
 const startX=fromPosition.x*startScaleX,startY=fromPosition.y*startScaleY;
 const finalScaleX=2*final.pixels/(width*viewportWidth),finalScaleY=2*final.pixels/(width*viewportHeight);
 const near=.01,far=Math.max(20,distance*3);
 object.scale.fromArray(pose.scale);
 const interpolate=geometric
  ? (from,to,amount)=>from*Math.pow(to/from,amount)
  : T.MathUtils.lerp;
 function draw(amount){
  const perspective=1-amount;
  const xScale=interpolate(startScaleX,finalScaleX,amount),yScale=interpolate(startScaleY,finalScaleY,amount);
  // Clip W stays one at the model's depth while perspective eases into an orthographic view.
  const nearW=amount+perspective*near/distance,farW=amount+perspective*far/distance;
  const zScale=-(nearW+farW)/(far-near),zOffset=-nearW+near*zScale;
  camera.projectionMatrix.set(xScale,0,0,0, 0,yScale,0,0, 0,0,zScale,zOffset, 0,0,-perspective/distance,amount);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.isOrthographicCamera=amount===1;
  object.quaternion.slerpQuaternions(fromRotation,toRotation,amount);
  object.position.set(startX*perspective/xScale,startY*perspective/yScale,-distance);
  object.position.addScaledVector(center,-amount);
 }
 return{camera,draw,corners:()=>projectModelFace(object,camera,viewportWidth,viewportHeight)};
}

// Paper uses a dedicated temporary canvas. The controller animates in its reader's own renderer.
export function createObjectLift(object,worldCamera,{width,shot}){
 const pose=captureObjectLift(object,worldCamera);
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(...pose.viewport,false);renderer.setClearColor(0,0);
 const scene=new T.Scene(),copy=copyGeometry(object);scene.add(copy);addObjectLighting(scene);
 const motion=createObjectLiftMotion(copy,pose,{width,shot});
 function draw(amount){motion.draw(amount);renderer.render(scene,motion.camera);}
 canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
 draw(0);
 return{element:canvas,draw,corners:motion.corners,dispose(){renderer.dispose();renderer.forceContextLoss();scene.clear();}};
}
