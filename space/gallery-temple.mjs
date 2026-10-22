import * as T from './vendor/three-0.180.0.mjs';
import {TOTEHMPAPER,ORIGINS} from './gallery-artworks.mjs';
import {TEMPLE_ASSETS} from './gallery-temple-assets.mjs';

// Architecture only. The surrounding sky/landscape and navigation are owned
// by the parent, so the experiences remain their own independent HTML pages.
export function createTempleArchitecture(scene,renderer,{onChange=()=>{},lisbonPreview=null,mobile=innerWidth<650}={}){
 const root=new T.Group();root.name='The summit sanctuary';scene.add(root);
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
 const floor=mesh(geometry(new T.PlaneGeometry(32,36)),floorStone,0,-.09,0,{shadow:false,solid:true});floor.rotation.x=-Math.PI/2;
 // Individually jointed perimeter stones catch grazing sunlight at the edge.
 const paving=[];
 for(let i=0;i<23;i++){const z=-17.25+i*1.5;paving.push([-15.55,-.055,z,.9,.09,1.46],[15.55,-.055,z,.9,.09,1.46]);}
 for(let i=0;i<21;i++){const x=-15+i*1.5;paving.push([x,-.055,17.52,1.46,.09,.84],[x,-.055,-17.52,1.46,.09,.84]);}
 instances(dressedBlock,paleStone,paving,{colours:true,shadow:false});
 instances(boxGeometry,bronze,[[-14.98,-.038,0,.018,.012,34.2],[14.98,-.038,0,.018,.012,34.2],[0,-.038,17.02,29.98,.012,.018]],{shadow:false});

 // Doric columns: entasis, 24 deep flutes, torus bases and an echinus capital.
 // The shaft is one shared geometry, not eight separate imported models.
 const columnPositions=[];for(const x of [-15,15])for(const z of [-12,-4,4,12])columnPositions.push([x,z]);
 const shaft=geometry(new T.CylinderGeometry(1,1,8.05,mobile?72:96,18));
 const p=shaft.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,z);if(r<.01)continue;
  const t=(y+4.025)/8.05,angle=Math.atan2(z,x),radius=.79-.16*t+.055*Math.sin(t*Math.PI);
  const flute=1-.074*(.5+.5*Math.cos(angle*24));p.setXYZ(i,x/r*radius*flute,y,z/r*radius*flute);
 }
 shaft.computeVertexNormals();
 instances(shaft,stone,columnPositions.map(([x,z])=>[x,4.69,z]),{solid:true,colours:true});
 function lathe(points,segments=mobile?40:64){return geometry(new T.LatheGeometry(points.map(v=>new T.Vector2(...v)),segments));}
 const base=lathe([[.98,0],[1.04,.035],[1.04,.105],[.95,.14],[.88,.17],[.87,.21],[.92,.27],[.90,.33],[.81,.38],[.79,.46]]);
 const capital=lathe([[.64,0],[.66,.08],[.71,.11],[.73,.17],[.85,.27],[.98,.35],[1.05,.43],[1.05,.49]]);
 const neck=lathe([[.66,0],[.70,.025],[.70,.07],[.67,.095],[.67,.14],[.72,.17],[.72,.21],[.65,.24]]);
 instances(base,stone,columnPositions.map(([x,z])=>[x,.14,z]),{colours:true});
 instances(capital,paleStone,columnPositions.map(([x,z])=>[x,8.69,z]),{colours:true});
 instances(neck,stone,columnPositions.map(([x,z])=>[x,8.47,z]));
 instances(boxGeometry,paleStone,columnPositions.flatMap(([x,z])=>[[x,.035,z,2.25,.2,2.25],[x,9.28,z,2.27,.25,2.27],[x,9.46,z,2.41,.12,2.41]]),{solid:true});
 const beamCourses=[[-15,9.76,0,2.23,.51,28.7],[15,9.76,0,2.23,.51,28.7],[0,9.76,-14.05,32.45,.51,2.23],[-15,10.13,0,2.43,.16,28.9],[15,10.13,0,2.43,.16,28.9],[0,10.13,-14.05,32.65,.16,2.43],[-15,10.28,0,2.61,.14,29.1],[15,10.28,0,2.61,.14,29.1],[0,10.28,-14.05,32.85,.14,2.61]];
 instances(boxGeometry,stone,beamCourses,{solid:true});
 const dentils=[];
 for(const x of [-15,15])for(let n=0;n<49;n++)dentils.push([x+(x<0?.99:-.99),9.46,-13.7+n*.57,.34,.19,.25]);
 for(let n=0;n<57;n++)dentils.push([-15.95+n*.57,9.46,-12.99,.25,.19,.34]);
 instances(boxGeometry,paleStone,dentils);
 // A shallow classical pediment crowns the three doors without closing the sky.
 const pedimentShape=new T.Shape();pedimentShape.moveTo(-16.15,0);pedimentShape.lineTo(16.15,0);pedimentShape.lineTo(0,3.35);pedimentShape.closePath();
 const pedimentGeometry=geometry(new T.ExtrudeGeometry(pedimentShape,{depth:1.15,steps:1,bevelEnabled:true,bevelThickness:.07,bevelSize:.07,bevelSegments:2}));
 mesh(pedimentGeometry,stone,0,10.42,-14.7,{solid:true});
 const cornice=[];
 for(const side of [-1,1]){const dx=16.3,dy=3.37,len=Math.hypot(dx,dy);cornice.push([side*8.15,12.1,-14.08,len,.19,1.4,0,0,-side*Math.atan2(dy,dx)]);}
 instances(boxGeometry,paleStone,cornice);
 const disk=mesh(geometry(new T.TorusGeometry(.75,.065,8,48)),bronze,0,11.48,-13.48);disk.castShadow=false;
 const rays=[];for(let n=0;n<16;n++){const a=n/16*Math.PI*2;rays.push([Math.cos(a)*1.12,11.48+Math.sin(a)*1.12,-13.48,.24,.026,.035,0,0,a]);}instances(boxGeometry,bronze,rays,{shadow:false});

 // Voussoirs and separate jamb courses are actual volumes, with open recesses.
 const wedge=new T.Shape(),slice=Math.PI/15,gap=.008;
 wedge.moveTo(Math.cos(gap)*2.52,Math.sin(gap)*2.52);wedge.absarc(0,0,2.52,gap,slice-gap,false);wedge.lineTo(Math.cos(slice-gap)*1.8,Math.sin(slice-gap)*1.8);wedge.absarc(0,0,1.8,slice-gap,gap,true);wedge.closePath();
 const wedgeGeometry=geometry(new T.ExtrudeGeometry(wedge,{depth:1.34,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,curveSegments:4}));wedgeGeometry.translate(0,0,-.67);
 const archStones=[],jambs=[],archFoot=[];
 for(const x of [-9,0,9]){
  for(let n=0;n<15;n++)archStones.push([x,4.7,-12,1,1,1,0,0,n*slice]);
  for(const side of [-1,1])for(let n=0;n<7;n++)jambs.push([x+side*2.16,.35+n*.67,-12,.72,.65,1.34]);
  for(const side of [-1,1])archFoot.push([x+side*2.16,.105,-12,1.08,.25,1.7],[x+side*2.16,4.67,-12,1.00,.18,1.66]);
 }
 instances(wedgeGeometry,stone,archStones,{solid:true,colours:true});instances(dressedBlock,stone,jambs,{solid:true,colours:true});instances(dressedBlock,paleStone,archFoot,{solid:true});
 const openingShape=new T.Shape();openingShape.moveTo(-1.8,-.05);openingShape.lineTo(1.8,-.05);openingShape.lineTo(1.8,4.7);openingShape.absarc(0,4.7,1.8,0,Math.PI,false);openingShape.lineTo(-1.8,-.05);openingShape.closePath();
 const openingGeometry=geometry(new T.ShapeGeometry(openingShape,32));
 const portalNames=[['TOTEHMPAPER {THP}','THE STONER EXPERIENCE'],['ORIGINS','TWENTY ORIGINAL WORKS'],['PLAY THE STREET','NEURO STREET ART DIGITAL']];
 const plaques=[];
 function paintPlaque(entry){
  const ctx=entry.canvas.getContext('2d');ctx.clearRect(0,0,1024,160);ctx.fillStyle='#c9bb9d';ctx.fillRect(0,0,1024,160);ctx.fillStyle='#4b4433';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 30px "Space Mono", monospace';ctx.fillText(entry.title,512,54);ctx.font='16px "Space Mono", monospace';ctx.fillText(entry.subtitle,512,108);entry.texture.needsUpdate=true;changed();
 }
 const portalLights=[];
 [-9,0,9].forEach((x,room)=>{
  const opening=mesh(openingGeometry,black,x,0,-12.38,{shadow:false});opening.userData={room,portal:true};
  const coverMaterial=material(new T.MeshBasicMaterial({color:'#000000',transparent:true,opacity:1,toneMapped:false,depthWrite:false,side:room===0?T.DoubleSide:T.FrontSide,alphaTest:room===0?.08:0}));
  let cover;
  if(room===0){
   // The original perforated paper is an installation of individual suspended
   // sheets. One instanced draw and one shared image keep it light on a phone.
   // All sheets sit inside the arch's thickness and in front of its black back,
   // so their real depth does not depend on drawing over an opaque doorway.
   const count=mobile?18:24,rows=count/3;
   cover=new T.InstancedMesh(planeGeometry,coverMaterial,count);cover.name='Suspended TotehmPapers';cover.position.set(x,3.1,-11.96);
   cover.instanceMatrix.setUsage(T.DynamicDrawUsage);cover.castShadow=false;cover.receiveShadow=false;root.add(cover);paperCover=cover;
   for(let n=0;n<count;n++){
    const row=Math.floor(n/3),column=n%3,worldY=.68+row*4.88/(rows-1);
    paperCopies.push({x:(column-1)*.95+(random()-.5)*.14,y:worldY-3.1,z:-.15+random()*.45,
     size:column===1&&row%3===1?.81:.5+random()*.18,phase:random()*Math.PI*2,
     yaw:(random()-.5)*.5,roll:(random()-.5)*.28});
   }
   arrangePapers(0);cover.computeBoundingSphere();if(cover.boundingSphere)cover.boundingSphere.radius+=.2;
  }else{
   cover=mesh(planeGeometry,coverMaterial,x,3.1,-11.96,{shadow:false});cover.scale.set(room===1?2.35:3.1,room===1?3.05:2.185,1);
  }
  cover.userData={room,portal:true};covers.push(cover);
  if(room===2&&lisbonPreview?.canvas){const t=new T.CanvasTexture(lisbonPreview.canvas);t.colorSpace=T.SRGBColorSpace;textures.add(t);coverMaterial.map=t;coverMaterial.color.set('#ffffff');loaded++;}
  else{
   const path=room===0?TOTEHMPAPER.src:room===1?ORIGINS[0].src:'/assets/signs/destination.png';
   const t=loader.load(path,value=>{if(disposed){value.dispose();return;}coverMaterial.color.set('#ffffff');coverMaterial.needsUpdate=true;if(room===0)paperLoaded=true;loaded++;changed();},undefined,changed);t.colorSpace=T.SRGBColorSpace;t.anisotropy=anisotropy;textures.add(t);coverMaterial.map=t;
  }
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=160;const labelTexture=new T.CanvasTexture(canvas);labelTexture.colorSpace=T.SRGBColorSpace;textures.add(labelTexture);const entry={canvas,texture:labelTexture,title:portalNames[room][0],subtitle:portalNames[room][1]};plaques.push(entry);paintPlaque(entry);
  const labelMaterial=material(new T.MeshStandardMaterial({map:labelTexture,color:'#ffffff',roughness:.9}));
  const label=mesh(planeGeometry,labelMaterial,x,7.65,-11.91,{shadow:false});label.scale.set(4.9,.765,1);label.userData={room,portal:true};
  instances(boxGeometry,bronze,[[x,7.65,-11.985,5.02,.88,.1],[x,-.005,-11.45,3.57,.045,1.05]],{shadow:false});
  const light=new T.PointLight('#ffca83',3,7,2);light.position.set(x,4.2,-10.9);root.add(light);portalLights.push(light);
  const lampMaterial=material(new T.MeshStandardMaterial({color:'#c89a59',emissive:'#edb56a',emissiveIntensity:.15,roughness:.45,metalness:.6}));
  instances(boxGeometry,lampMaterial,[[x-1.94,1.0,-11.3,.045,1.2,.06],[x+1.94,1.0,-11.3,.045,1.2,.06]],{shadow:false});
  portals.push({room,x,z:-12,width:3.6,height:6.5,href:['/get_higher','/origins','/play_lisbon_street'][room],approach:{x,z:-10.6},pickables:[opening,cover,label]});
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
 document.fonts?.ready.then(()=>{if(!disposed)plaques.forEach(paintPlaque);});

 function canvasTexture(canvas){const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;textures.add(t);return t;}
 // Soft local contact occlusion anchors bases even under the broad night sky.
 const aoCanvas=document.createElement('canvas');aoCanvas.width=aoCanvas.height=128;const ax=aoCanvas.getContext('2d'),ao=ax.createRadialGradient(64,64,9,64,64,64);ao.addColorStop(0,'rgba(18,16,11,.3)');ao.addColorStop(.55,'rgba(18,16,11,.16)');ao.addColorStop(1,'rgba(18,16,11,0)');ax.fillStyle=ao;ax.fillRect(0,0,128,128);
 const aoMaterial=material(new T.MeshBasicMaterial({map:canvasTexture(aoCanvas),transparent:true,depthWrite:false,toneMapped:false}));
 instances(planeGeometry,aoMaterial,columnPositions.map(([x,z])=>[x,-.073,z,3.4,3.4,1,-Math.PI/2,0,0]),{shadow:false});

 return{
  root,portals,solids,get pickables(){return [...portals.flatMap(p=>p.pickables),...solids];},
  setDay(value){const next=!!value;if(next===day)return;day=next;portalLights.forEach(light=>{light.intensity=day?3:28;});changed();},
  update(dt,eye,motion=true){
   if(disposed||!root.visible)return false;
   if(motion){time+=Math.min(.05,Math.max(0,Number(dt)||0));}
   covers.forEach((cover,n)=>{const portal=portals[n],distance=Math.hypot(eye.x-portal.x,eye.z-portal.z),opacity=T.MathUtils.smoothstep(distance,.28,.85);if(Math.abs(cover.material.opacity-opacity)>.001)dirty=true;cover.material.opacity=opacity;cover.visible=opacity>.001;});
   paperMoving=!!motion&&!!paperCover?.visible;if(paperMoving)arrangePapers(time);
   if(lisbonPreview?.canvas&&covers[2].material.map&&motion)covers[2].material.map.needsUpdate=true;
   const result=dirty||motion;dirty=false;return result;
  },
  diagnostics:()=>({kind:'PBR antique summit temple',columns:8,flutes:24,arches:3,trees:0,leafCards:0,flowers:0,planters:0,vegetation:false,plants:[],covers:loaded,stoneMapsLoaded,pbr:true,externalTextures:'CC0 Poly Haven',day,time:+time.toFixed(3),paperPortal:{papers:paperCopies.length,loaded:paperLoaded,animated:paperMoving,time:+time.toFixed(3),instanced:true},portals:portals.map(({room,x,z,width,height,href})=>({room,x,z,width,height,href})),disposed}),
  dispose(){if(disposed)return;disposed=true;root.visible=false;root.removeFromParent();for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.clear();}
 };
}
