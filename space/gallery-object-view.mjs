import * as T from './vendor/three-0.180.0.mjs';

export const premiumCaseShot=(width,height)=>({pixels:Math.min(width*.56,height*.57,480),pitch:0,center:[0,0,0]});
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
 const camera=new T.PerspectiveCamera(worldCamera.fov,worldCamera.aspect,.015,10000);
 new T.Matrix4().multiplyMatrices(worldCamera.matrixWorldInverse,object.matrixWorld).decompose(copy.position,copy.quaternion,copy.scale);
 const fromPosition=copy.position.clone(),fromRotation=copy.quaternion.clone(),fromScale=copy.scale.clone();
 const final=shot(innerWidth,innerHeight),toRotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),final.pitch);
 const center=new T.Vector3(...final.center).multiply(fromScale).applyQuaternion(toRotation),fov=4;
 const distance=width*innerHeight/(2*final.pixels*Math.tan(T.MathUtils.degToRad(fov/2)));
 const target=new T.Vector3(0,0,-distance).sub(center);
 const fovRadians=T.MathUtils.degToRad(worldCamera.fov/2);
 const fromPixelWidth=width*innerHeight/(2*Math.max(.03,-fromPosition.z)*Math.tan(fovRadians));
 const fromX=fromPosition.x/(-fromPosition.z*Math.tan(fovRadians)*worldCamera.aspect),fromY=fromPosition.y/(-fromPosition.z*Math.tan(fovRadians));
 function draw(amount){
  camera.fov=T.MathUtils.lerp(worldCamera.fov,fov,amount);camera.updateProjectionMatrix();
  const size=T.MathUtils.lerp(fromPixelWidth,final.pixels,amount);
  const tan=Math.tan(T.MathUtils.degToRad(camera.fov/2));
  const z=width*innerHeight/(2*Math.max(1,size)*tan);
  copy.quaternion.slerpQuaternions(fromRotation,toRotation,amount);
  copy.position.set(fromX*(1-amount)*z*tan*worldCamera.aspect,fromY*(1-amount)*z*tan,-z);
  copy.position.addScaledVector(center,-amount);
  if(amount===1)copy.position.copy(target);
  renderer.render(scene,camera);
 }
 canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
 draw(0);
 return{element:canvas,draw,dispose(){renderer.dispose();renderer.forceContextLoss();scene.clear();}};
}
