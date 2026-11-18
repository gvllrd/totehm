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

// The same 3D model replaces the exact object in the world, then rotates and
// grows into the camera shot used by the experience. It remains a volume.
export function createObjectLift(object,worldCamera,{width,shot}){
 object.updateWorldMatrix(true,false);worldCamera.updateMatrixWorld();
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight,false);renderer.setClearColor(0,0);
 const scene=new T.Scene(),copy=copyGeometry(object);scene.add(copy);addObjectLighting(scene);
 const camera=new T.Camera();
 new T.Matrix4().multiplyMatrices(worldCamera.matrixWorldInverse,object.matrixWorld).decompose(copy.position,copy.quaternion,copy.scale);
 const fromPosition=copy.position.clone(),fromRotation=copy.quaternion.clone();
 const final=shot(innerWidth,innerHeight),toRotation=modelShotRotation(final);
 // Shot centres are specified in units of the object's nominal width.
 const center=new T.Vector3(...final.center).multiplyScalar(width).applyQuaternion(toRotation);
 const distance=Math.max(.03,-fromPosition.z),startProjection=worldCamera.projectionMatrix.elements;
 const startScaleX=startProjection[0]/distance,startScaleY=startProjection[5]/distance;
 const startX=fromPosition.x*startScaleX,startY=fromPosition.y*startScaleY;
 const finalScaleX=2*final.pixels/(width*innerWidth),finalScaleY=2*final.pixels/(width*innerHeight);
 const near=.01,far=Math.max(20,distance*3);
 function draw(amount){
  const perspective=1-amount;
  const xScale=T.MathUtils.lerp(startScaleX,finalScaleX,amount),yScale=T.MathUtils.lerp(startScaleY,finalScaleY,amount);
  // Clip W is one at the model's centre throughout. At the end it is
  // constant everywhere, exactly matching the viewer's orthographic shot.
  const nearW=amount+perspective*near/distance,farW=amount+perspective*far/distance;
  const zScale=-(nearW+farW)/(far-near),zOffset=-nearW+near*zScale;
  camera.projectionMatrix.set(xScale,0,0,0, 0,yScale,0,0, 0,0,zScale,zOffset, 0,0,-perspective/distance,amount);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.isOrthographicCamera=amount===1;
  copy.quaternion.slerpQuaternions(fromRotation,toRotation,amount);
  copy.position.set(startX*perspective/xScale,startY*perspective/yScale,-distance);
  copy.position.addScaledVector(center,-amount);
  renderer.render(scene,camera);
 }
 canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
 draw(0);
 return{element:canvas,draw,corners:()=>projectModelFace(copy,camera,innerWidth,innerHeight),dispose(){renderer.dispose();renderer.forceContextLoss();scene.clear();}};
}
