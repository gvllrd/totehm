import * as T from './vendor/three-0.180.0.mjs';
import {TEMPLE_ASSETS} from './gallery-temple-assets.mjs';
import {createDrownedSky} from './gallery-drowned-sky.mjs';
import {createDrownedOcean} from './gallery-drowned-ocean.mjs';
import {createDrownedPlanet} from './gallery-drowned-planet.mjs';

// The temple is the last dry summit. Its stone terrace stays above a flooded
// world, under a permanent night; no land or daytime panorama is substituted.
export function createTempleLandscape(scene,renderer,{onChange=()=>{},now=()=>new Date(),mobile=innerWidth<650}={}){
 const root=new T.Group();root.name='The last summit — a new beginning above the flood';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set();
 const ownGeometry=g=>(geometries.add(g),g),ownMaterial=m=>(materials.add(m),m);
 let disposed=false,dirty=true,time=0,hour=now().getHours(),environmentTarget=null;
 const priorEnvironment=scene.environment,priorIntensity=scene.environmentIntensity,priorFog=scene.fog;
 const changed=()=>{if(!disposed){dirty=true;onChange();}};
 const horizon=new T.Color(0x101e32),fog=new T.FogExp2(horizon,.00024);scene.fog=fog;
 const sky=createDrownedSky(root,{mobile,onChange:changed});
 const planet=createDrownedPlanet(root,{mobile,onChange:changed,moonDirection:sky.moonDirection});
 const ocean=createDrownedOcean(root,{mobile,renderer,onChange:changed,moonDirection:sky.moonDirection,horizonColor:horizon,environmentTexture:sky.environmentTexture});
 const hemisphere=new T.HemisphereLight(0x95b5da,0x242032,.62);root.add(hemisphere);
 const moon=new T.DirectionalLight(0xc2d9ff,1.65);moon.position.copy(sky.moonDirection).multiplyScalar(100);moon.castShadow=true;
 moon.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);
 Object.assign(moon.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:180});moon.shadow.camera.updateProjectionMatrix();
 moon.shadow.normalBias=.025;moon.shadow.bias=-.00015;moon.shadow.radius=2;root.add(moon,moon.target);moon.target.position.set(0,0,-1);
 const fill=new T.DirectionalLight(0x91aecf,.72);fill.position.set(-18,28,45);root.add(fill);
 // A small warm reflection on the stone terrace suggests shelter and rebirth.
 // The original three doors retain their own amber lighting and all previews.
 const sanctuary=new T.PointLight(0xffd6a1,32,34,2);sanctuary.position.set(0,6,5);root.add(sanctuary);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 const pmrem=new T.PMREMGenerator(renderer);pmrem.compileEquirectangularShader();
 environmentTarget=pmrem.fromEquirectangular(sky.environmentTexture);scene.environment=environmentTarget.texture;scene.environmentIntensity=.45;

 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const noise=(x,z)=>{
  const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
  const h=(a,b)=>{let n=Math.imul(a,374761393)+Math.imul(b,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
  return(h(ix,iz)*(1-u)+h(ix+1,iz)*u)*(1-v)+(h(ix,iz+1)*(1-u)+h(ix+1,iz+1)*u)*v;
 };
 function fbm2(x,z,octaves=5){let total=0,a=.55;for(let i=0;i<octaves;i++){total+=a*noise(x,z);x=x*2.03+17.7;z=z*2.03+31.4;a*=.49;}return total;}
 const terrainMaterial=ownMaterial(new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.98,metalness:0}));
 const rockMap=new T.TextureLoader().load(TEMPLE_ASSETS.column.color,changed,undefined,changed);rockMap.colorSpace=T.SRGBColorSpace;
 rockMap.wrapS=rockMap.wrapT=T.RepeatWrapping;rockMap.repeat.set(.075,.075);textures.add(rockMap);terrainMaterial.map=rockMap;
 // Only the temple's own narrow crag remains above water. No other dry island
 // competes with this summit; its steep base disappears into the dark ocean.
 const cragGeometry=ownGeometry(new T.CylinderGeometry(1,4,260,mobile?64:96,mobile?32:48,true));
 const cp=cragGeometry.attributes.position,cragColours=new Float32Array(cp.count*3),cragColour=new T.Color();
 for(let n=0;n<cp.count;n++){
  const x=cp.getX(n),y=cp.getY(n),z=cp.getZ(n),theta=Math.atan2(z,x),f=(130-y)/260;
  const variation=1+(.012+f*.035)*Math.sin(theta*13+f*7)+f*.031*Math.sin(theta*29-f*9);
  const exponent=.25+.75*Math.min(1,f*3),c=Math.cos(theta),s=Math.sin(theta);
  const rx=17.5+(110-17.5)*Math.pow(f,.72),rz=19.5+(118-19.5)*Math.pow(f,.72);
  cp.setXYZ(n,Math.sign(c)*Math.pow(Math.abs(c),exponent)*rx*variation,y-131.4,Math.sign(s)*Math.pow(Math.abs(s),exponent)*rz*variation);
  const grain=fbm2(x*.045+y*.012,z*.045),green=clamp((y-80)/55)*.25;
  cragColour.setRGB(.15+grain*.08,.155+grain*.075,.135+grain*.07);cragColour.lerp(new T.Color(.055,.09,.04),green);
  cragColours.set([cragColour.r,cragColour.g,cragColour.b],n*3);
 }
 cragGeometry.setAttribute('color',new T.BufferAttribute(cragColours,3));cragGeometry.computeVertexNormals();
 const crag=new T.Mesh(cragGeometry,terrainMaterial);crag.name='Limestone summit beneath the temple';root.add(crag);
 const cap=ownGeometry(new T.CircleGeometry(1,64));cap.rotateX(-Math.PI/2);
 const capPosition=cap.attributes.position,capColours=new Float32Array(capPosition.count*3);
 for(let n=0;n<capPosition.count;n++){
  const x=capPosition.getX(n),z=capPosition.getZ(n),r=Math.hypot(x,z),theta=Math.atan2(z,x),c=Math.cos(theta),s=Math.sin(theta);
  const px=r?Math.sign(c)*Math.pow(Math.abs(c),.25)*17.5*r:0,pz=r?Math.sign(s)*Math.pow(Math.abs(s),.25)*19.5*r:0;
  capPosition.setXYZ(n,px,-1.44-r*r*.24-fbm2(px*.21,pz*.21,3)*.22,pz);capColours.set([.17,.175,.15],n*3);
 }
 cap.setAttribute('color',new T.BufferAttribute(capColours,3));cap.computeVertexNormals();const capMesh=new T.Mesh(cap,terrainMaterial);capMesh.name='Rock crown tucked beneath the ancient steps';root.add(capMesh);

 return{
  root,get day(){return false;},get hour(){return hour;},
  update(dt,eye,motion){
   if(disposed)return false;
   hour=now().getHours();
   if(motion){time+=Math.max(0,Math.min(Number(dt)||0,.1));dirty=true;}
   const skyChanged=sky.update(dt,eye,motion),oceanChanged=ocean.update(dt,eye,motion),planetChanged=planet.update(dt,eye,motion);
   const result=dirty||skyChanged||oceanChanged||planetChanged;dirty=false;return result;
  },
  diagnostics:()=>({kind:'last-summit-drowned-world',day:false,permanentNight:true,hour,time:+time.toFixed(3),
   skyLoaded:sky.diagnostics().skyLoaded,environmentLoaded:!!environmentTarget,environment:'procedural nocturnal sky PMREM',
   sky:sky.diagnostics(),ocean:ocean.diagnostics(),planet:planet.diagnostics(),
   summit:{halfWidth:17.5,halfDepth:19.5,onlyDryLand:true,otherLandMeshes:0,flatApron:false},
   shadowSize:mobile?512:1024,triangles:[...geometries].reduce((n,g)=>n+(g.index?g.index.count:g.attributes.position.count)/3,0)+ocean.diagnostics().triangles,disposed}),
  dispose(){
   if(disposed)return;disposed=true;root.visible=false;
   if(scene.environment===environmentTarget?.texture){scene.environment=priorEnvironment;scene.environmentIntensity=priorIntensity;}
   if(scene.fog===fog)scene.fog=priorFog;environmentTarget?.dispose();pmrem.dispose();moon.shadow.map?.dispose();
   sky.dispose();ocean.dispose();planet.dispose();for(const t of textures)t.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();root.removeFromParent();root.clear();
  }
 };
}
