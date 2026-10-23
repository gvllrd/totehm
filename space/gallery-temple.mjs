import * as T from './vendor/three-0.180.0.mjs';
import {TOTEHMPAPER,ORIGINS} from './gallery-artworks.mjs';
import {TEMPLE_ASSETS} from './gallery-temple-assets.mjs';
import {GROUND_Y,TEMPLE_FLOOR,TEMPLE_PORTALS} from './gallery-temple-layout.mjs';

// Architecture only. The surrounding sky/landscape and navigation are owned
// by the parent, so the experiences remain their own independent HTML pages.
export function createTempleArchitecture(scene,renderer,{onChange=()=>{},lisbonPreview=null,mobile=innerWidth<650}={}){
 const root=new T.Group();root.name='The open summit sanctuary';scene.add(root);
 const {scaleX:archScaleX,scaleY:archScaleY,outerHeight:archTop}=TEMPLE_PORTALS[0];
 const geometries=new Set(),materials=new Set(),textures=new Set(),solids=[],portals=[],covers=[];
 const loader=new T.TextureLoader(),matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3(),quaternion=new T.Quaternion();
 let seed=711179,disposed=false,time=0,day=true,loaded=0,dirty=true,stoneMapsLoaded=0;
 const paperCopies=[];let paperCover=null,paperLoaded=false,paperMoving=false;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 const changed=()=>{if(!disposed){dirty=true;renderer.shadowMap.needsUpdate=true;onChange();}};
 const anisotropy=Math.min(mobile?2:8,renderer.capabilities.getMaxAnisotropy());
 function texture(path,{colour=false,repeat=[1,1],ready=null}={}){
  const t=loader.load(path,value=>{if(disposed){value.dispose();return;}stoneMapsLoaded++;ready?.(value);changed();},undefined,changed);
  t.colorSpace=colour?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=anisotropy;textures.add(t);return t;
 }
 function pbrMaps(asset,repeat){return{map:texture(asset.color,{colour:true,repeat}),normalMap:texture(asset.normal,{repeat}),roughnessMap:texture(asset.roughness,{repeat})};}
 const stone=material(new T.MeshStandardMaterial({...pbrMaps(TEMPLE_ASSETS.column||TEMPLE_ASSETS.stone,[1.8,3.2]),color:'#eee4d3',roughness:.93,normalScale:new T.Vector2(.48,.48)}));
 const floorStone=material(new T.MeshStandardMaterial({...pbrMaps(TEMPLE_ASSETS.floor,[7.1,8]),color:'#e9dfcb',roughness:.92,normalScale:new T.Vector2(.65,.65)}));
 const shadowStone=material(new T.MeshStandardMaterial({...pbrMaps(TEMPLE_ASSETS.stone,[2,1]),color:'#c0b6a2',roughness:.97,normalScale:new T.Vector2(.4,.4)}));
 const paleStone=stone.clone();paleStone.color.set('#fbf2e3');materials.add(paleStone);
 const bronze=material(new T.MeshStandardMaterial({color:'#6e6040',metalness:.72,roughness:.56}));
 const black=material(new T.MeshBasicMaterial({color:'#000000',toneMapped:false}));
 const boxGeometry=geometry(new T.BoxGeometry(1,1,1));
 const blockShape=new T.Shape();blockShape.moveTo(-.48,-.48);blockShape.lineTo(.48,-.48);blockShape.lineTo(.48,.48);blockShape.lineTo(-.48,.48);blockShape.closePath();
 const dressedBlock=geometry(new T.ExtrudeGeometry(blockShape,{depth:.96,steps:1,bevelEnabled:true,bevelSize:.02,bevelThickness:.02,bevelSegments:2}));dressedBlock.translate(0,0,-.48);
 const planeGeometry=geometry(new T.PlaneGeometry(1,1));
 function instances(g,m,items,{parent=root,shadow=true,colours=false,solid=false}={}){
  const object=new T.InstancedMesh(g,m,items.length);
  items.forEach((item,index)=>{
   position.set(item[0],item[1],item[2]);scale.set(item[3]??1,item[4]??1,item[5]??1);
   quaternion.setFromEuler(new T.Euler(item[6]||0,item[7]||0,item[8]||0));matrix.compose(position,quaternion,scale);object.setMatrixAt(index,matrix);
   if(colours)object.setColorAt(index,new T.Color().setRGB(.85+random()*.15,.85+random()*.15,.82+random()*.15));
  });
  object.instanceMatrix.needsUpdate=true;if(object.instanceColor)object.instanceColor.needsUpdate=true;object.computeBoundingSphere();object.castShadow=shadow;object.receiveShadow=true;parent.add(object);if(solid)solids.push(object);return object;
 }
 function mesh(g,m,x=0,y=0,z=0,{parent=root,shadow=true,solid=false}={}){
  const object=new T.Mesh(g,m);object.position.set(x,y,z);object.castShadow=shadow;object.receiveShadow=true;parent.add(object);if(solid)solids.push(object);return object;
 }
 // Four receding stone courses make the gallery feel anchored to its summit.
 instances(boxGeometry,shadowStone,[[0,-1.15,0,35.6,1.1,39.6],[0,-.62,0,34.3,.28,38.3],[0,-.38,0,33.3,.2,37.3]],{solid:true});
 instances(boxGeometry,stone,[[0,-.19,0,32.6,.18,36.6]],{solid:true});
 const floor=mesh(geometry(new T.PlaneGeometry(TEMPLE_FLOOR.halfWidth*2,TEMPLE_FLOOR.halfDepth*2)),floorStone,0,GROUND_Y,0,{shadow:false,solid:true});floor.rotation.x=-Math.PI/2;
 // Individually jointed perimeter stones catch grazing sunlight at the edge.
 const paving=[];
 for(let i=0;i<23;i++){const z=-17.25+i*1.5;paving.push([-15.55,-.055,z,.9,.09,1.46],[15.55,-.055,z,.9,.09,1.46]);}
 for(let i=0;i<21;i++){const x=-15+i*1.5;paving.push([x,-.055,17.52,1.46,.09,.84],[x,-.055,-17.52,1.46,.09,.84]);}
 instances(dressedBlock,paleStone,paving,{colours:true,shadow:false});
 instances(boxGeometry,bronze,[[-14.98,-.038,0,.018,.012,34.2],[14.98,-.038,0,.018,.012,34.2],[0,-.038,17.02,29.98,.012,.018]],{shadow:false});

 // Voussoirs and separate jamb courses are actual volumes, with open recesses.
 const wedge=new T.Shape(),slice=Math.PI/15,gap=.008;
 wedge.moveTo(Math.cos(gap)*2.52,Math.sin(gap)*2.52);wedge.absarc(0,0,2.52,gap,slice-gap,false);wedge.lineTo(Math.cos(slice-gap)*1.8,Math.sin(slice-gap)*1.8);wedge.absarc(0,0,1.8,slice-gap,gap,true);wedge.closePath();
 const wedgeGeometry=geometry(new T.ExtrudeGeometry(wedge,{depth:1.34,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,curveSegments:4}));wedgeGeometry.translate(0,0,-.67);
 const archStones=[],jambs=[],archFoot=[],archStructure=new T.Group();archStructure.name='Three monumental freestanding doors';
 // Stretch the complete arch after rotating its voussoirs. Scaling individual
 // rotated stones would deform the curve differently for every joint.
 archStructure.scale.set(archScaleX,archScaleY,1);root.add(archStructure);
 for(const {x,z} of TEMPLE_PORTALS){
  const localX=x/archScaleX;
  for(let n=0;n<15;n++)archStones.push([localX,4.7,z,1,1,1,0,0,n*slice]);
  for(const side of [-1,1])for(let n=0;n<7;n++)jambs.push([localX+side*2.16,.35+n*.67,z,.72,.65,1.34]);
  for(const side of [-1,1])archFoot.push([localX+side*2.16,.105,z,1.08,.25,1.7],[localX+side*2.16,4.67,z,1.00,.18,1.66]);
 }
 instances(wedgeGeometry,stone,archStones,{parent:archStructure,solid:true,colours:true});instances(dressedBlock,stone,jambs,{parent:archStructure,solid:true,colours:true});instances(dressedBlock,paleStone,archFoot,{parent:archStructure,solid:true});
 const openingShape=new T.Shape();openingShape.moveTo(-1.8,-.05);openingShape.lineTo(1.8,-.05);openingShape.lineTo(1.8,4.7);openingShape.absarc(0,4.7,1.8,0,Math.PI,false);openingShape.lineTo(-1.8,-.05);openingShape.closePath();
 const openingGeometry=geometry(new T.ShapeGeometry(openingShape,32));openingGeometry.scale(archScaleX,archScaleY,1);
 const portalLights=[];
 TEMPLE_PORTALS.forEach(({x,z,room,width,height,outerHeight})=>{
  const opening=mesh(openingGeometry,black,x,0,z-.38,{shadow:false});opening.userData={room,portal:true};
  const coverMaterial=material(new T.MeshBasicMaterial({color:'#000000',transparent:true,opacity:1,toneMapped:false,depthWrite:false,side:room===0?T.DoubleSide:T.FrontSide,alphaTest:room===0?.08:0}));
  let cover;
  if(room===0){
   // The original perforated paper is an installation of individual suspended
   // sheets. One instanced draw and one shared image keep it light on a phone.
   // All sheets sit inside the arch's thickness and in front of its black back,
   // so their real depth does not depend on drawing over an opaque doorway.
   const count=mobile?18:24,rows=count/3;
   cover=new T.InstancedMesh(planeGeometry,coverMaterial,count);cover.name='Suspended TotehmPapers';cover.position.set(x,3.1*archScaleY,-11.96);
   cover.instanceMatrix.setUsage(T.DynamicDrawUsage);cover.castShadow=false;cover.receiveShadow=false;root.add(cover);paperCover=cover;
   for(let n=0;n<count;n++){
    const row=Math.floor(n/3),column=n%3,worldY=(.68+row*4.88/(rows-1))*archScaleY;
    paperCopies.push({x:((column-1)*.95+(random()-.5)*.14)*archScaleX,y:worldY-3.1*archScaleY,z:-.15+random()*.45,
     size:(column===1&&row%3===1?.81:.5+random()*.18)*archScaleX,phase:random()*Math.PI*2,
     yaw:(random()-.5)*.5,roll:(random()-.5)*.28});
   }
   arrangePapers(0);cover.computeBoundingSphere();if(cover.boundingSphere)cover.boundingSphere.radius+=.2;
  }else{
   cover=mesh(planeGeometry,coverMaterial,x,3.1*archScaleY,-11.96,{shadow:false});cover.scale.set((room===1?2.35:3.1)*archScaleX,(room===1?3.05:2.185)*archScaleX,1);
  }
  cover.userData={room,portal:true};covers.push(cover);
  if(room===2&&lisbonPreview?.canvas){const t=new T.CanvasTexture(lisbonPreview.canvas);t.colorSpace=T.SRGBColorSpace;textures.add(t);coverMaterial.map=t;coverMaterial.color.set('#ffffff');loaded++;}
  else{
   const path=room===0?TOTEHMPAPER.src:room===1?ORIGINS[0].src:'/assets/signs/destination.png';
   const t=loader.load(path,value=>{if(disposed){value.dispose();return;}coverMaterial.color.set('#ffffff');coverMaterial.needsUpdate=true;if(room===0)paperLoaded=true;loaded++;changed();},undefined,changed);t.colorSpace=T.SRGBColorSpace;t.anisotropy=anisotropy;textures.add(t);coverMaterial.map=t;
  }
  instances(boxGeometry,bronze,[[x,-.005,-11.45,3.57*archScaleX,.045,1.05]],{shadow:false});
  const light=new T.PointLight('#ffca83',3,16,2);light.position.set(x,6.6,-10.9);root.add(light);portalLights.push(light);
  const lampMaterial=material(new T.MeshStandardMaterial({color:'#c89a59',emissive:'#edb56a',emissiveIntensity:.15,roughness:.45,metalness:.6}));
  instances(boxGeometry,lampMaterial,[[x-1.94*archScaleX,1.0*archScaleY,-11.3,.045,1.2*archScaleY,.06],[x+1.94*archScaleX,1.0*archScaleY,-11.3,.045,1.2*archScaleY,.06]],{shadow:false});
  portals.push({room,x,z,width,height,outerHeight,href:['/get_higher','/origins','/play_lisbon_street'][room],approach:{x,z:-10.6},pickables:[opening,cover]});
 });
 function arrangePapers(at){
  if(!paperCover)return;
  paperCopies.forEach((paper,n)=>{
   const phase=paper.phase;
   position.set(paper.x+Math.sin(at*.31+phase)*.035,paper.y+Math.sin(at*.42+phase)*.065,paper.z+Math.cos(at*.34+phase)*.025);
   scale.set(paper.size,paper.size,1);
   quaternion.setFromEuler(new T.Euler(Math.sin(at*.24+phase)*.07,paper.yaw+Math.sin(at*.29+phase)*.12,paper.roll+Math.sin(at*.26+phase)*.055));
   matrix.compose(position,quaternion,scale);paperCover.setMatrixAt(n,matrix);
  });
  paperCover.instanceMatrix.needsUpdate=true;
 }

 return{
  root,portals,solids,columnTops:[],get pickables(){return [...portals.flatMap(p=>p.pickables),...solids];},
  setDay(value){const next=!!value;if(next===day)return;day=next;portalLights.forEach(light=>{light.intensity=day?3:42;});changed();},
  update(dt,eye,motion=true){
   if(disposed||!root.visible)return false;
   if(motion){time+=Math.min(.05,Math.max(0,Number(dt)||0));}
   covers.forEach((cover,n)=>{const portal=portals[n],distance=Math.hypot(eye.x-portal.x,eye.z-portal.z),opacity=T.MathUtils.smoothstep(distance,.28,.85);if(Math.abs(cover.material.opacity-opacity)>.001)dirty=true;cover.material.opacity=opacity;cover.visible=opacity>.001;});
   paperMoving=!!motion&&!!paperCover?.visible;if(paperMoving)arrangePapers(time);
   if(lisbonPreview?.canvas&&covers[2].material.map&&motion)covers[2].material.map.needsUpdate=true;
   const result=dirty||motion;dirty=false;return result;
  },
  diagnostics:()=>({kind:'PBR antique summit temple',columns:0,columnHeight:0,columnTops:[],roof:false,entablature:false,pediment:false,flutes:0,arches:TEMPLE_PORTALS.length,archHeight:archTop,overheadLabels:0,trees:0,leafCards:0,flowers:0,planters:0,vegetation:false,plants:[],covers:loaded,stoneMapsLoaded,pbr:true,externalTextures:'CC0 Poly Haven',day,time:+time.toFixed(3),paperPortal:{papers:paperCopies.length,loaded:paperLoaded,animated:paperMoving,time:+time.toFixed(3),instanced:true},portals:portals.map(({room,x,z,width,height,outerHeight,href})=>({room,x,z,width,height,outerHeight,href})),disposed}),
  dispose(){if(disposed)return;disposed=true;root.visible=false;root.removeFromParent();for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.clear();}
 };
}
