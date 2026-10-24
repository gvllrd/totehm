import * as T from './vendor/three-0.180.0.mjs';
import {createLisbonPavement} from './gallery-lisbon-pavement.mjs';
import {TOTEHMPAPER} from './gallery-artworks.mjs';
import {GALLERY_LAYOUT,GALLERY_OBSTACLES,GALLERY_STATIONS} from './gallery-modern-layout.mjs';

// The new pavilion lives on the existing calçada. All three original pages,
// their access checks and the marketplace remain independent of its furniture.
export function createModernGallery(scene,renderer,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='TOTEHM — the contemporary gallery above the sea';scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),solids=[],interactables=[];
 let disposed=false,dirty=true,time=0,paperLoaded=false;
 const changed=()=>{if(!disposed){dirty=true;if(renderer?.shadowMap)renderer.shadowMap.needsUpdate=true;onChange();}};
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 const anisotropy=Math.min(mobile?2:8,renderer?.capabilities?.getMaxAnisotropy?.()||1);
 const pavement=createLisbonPavement({mobile,anisotropy,onChange:changed});
 const ink=material(new T.MeshStandardMaterial({color:0x070809,roughness:.82,metalness:.12}));
 const edge=material(new T.MeshStandardMaterial({color:0x171b20,roughness:.35,metalness:.72}));
 const ivory=material(new T.MeshStandardMaterial({color:0xe8e6df,roughness:.86,metalness:0}));
 const leather=material(new T.MeshStandardMaterial({color:0xb8b5ae,roughness:.91,metalness:0}));
 const darkLeather=material(new T.MeshStandardMaterial({color:0x292c32,roughness:.96,metalness:0}));
 const glass=material(new T.MeshPhysicalMaterial({color:0xb5c6cf,roughness:.12,metalness:0,transparent:true,opacity:.075,depthWrite:false,side:T.DoubleSide,envMapIntensity:.65}));
 const lit=material(new T.MeshBasicMaterial({color:0xe4e8ef,toneMapped:false}));
 const warm=material(new T.MeshBasicMaterial({color:0xf2e3ca,toneMapped:false}));
 const black=material(new T.MeshBasicMaterial({color:0x000000,toneMapped:false}));
 const boxGeo=geometry(new T.BoxGeometry(1,1,1));
 const planeGeo=geometry(new T.PlaneGeometry(1,1));
 const roundShape=new T.Shape();roundShape.moveTo(-.39,-.46);roundShape.lineTo(.39,-.46);roundShape.quadraticCurveTo(.46,-.46,.46,-.39);roundShape.lineTo(.46,.39);roundShape.quadraticCurveTo(.46,.46,.39,.46);roundShape.lineTo(-.39,.46);roundShape.quadraticCurveTo(-.46,.46,-.46,.39);roundShape.lineTo(-.46,-.39);roundShape.quadraticCurveTo(-.46,-.46,-.39,-.46);
 const rounded=geometry(new T.ExtrudeGeometry(roundShape,{depth:.86,steps:1,bevelEnabled:true,bevelThickness:.07,bevelSize:.04,bevelSegments:3,curveSegments:5}));rounded.translate(0,0,-.43);
 function mesh(g,m,p,s={x:1,y:1,z:1},{solid=false,name=''}={}){
  const object=new T.Mesh(g,m);object.position.set(...p);object.scale.set(s.x,s.y,s.z);object.castShadow=true;object.receiveShadow=true;object.name=name;root.add(object);if(solid)solids.push(object);return object;
 }
 const block=(m,p,size,options)=>mesh(boxGeo,m,p,{x:size[0],y:size[1],z:size[2]},options);
 const soft=(m,p,size,options)=>mesh(rounded,m,p,{x:size[0],y:size[1],z:size[2]},options);
 function station(object,id,kind,room){object.userData={...object.userData,station:kind,stationId:id,action:'station',room};interactables.push({id,kind,room,object});return object;}
 function light(x,y,z,power,distance=12,colour=0xeaf0ff){const lamp=new T.PointLight(colour,power,distance,2);lamp.position.set(x,y,z);root.add(lamp);return lamp;}

 // The full exterior paving and caravel remain visible before the entrance.
 block(ink,[0,-.65,0],[35.6,1.1,39.6]);block(edge,[0,-.2,0],[32.6,.18,36.6]);
 const ground=mesh(geometry(new T.PlaneGeometry(32,36)),pavement.material,[0,-.09,0],undefined,{solid:true,name:'Lisbon calçada — exterior and gallery floor'});ground.rotation.x=-Math.PI/2;ground.castShadow=false;
 block(edge,[-15.8,-.035,0],[.3,.1,35.6]);block(edge,[15.8,-.035,0],[.3,.1,35.6]);block(edge,[0,-.035,17.8],[31.9,.1,.3]);block(edge,[0,-.035,-17.8],[31.9,.1,.3]);

 // A thin black roof, seamless glazing and an open central doorway replace
 // the freestanding doors without removing their historical source module.
 block(ink,[0,3.055,-17],[26,6.29,.4],{solid:true,name:'Gallery back wall'});
 block(ink,[0,4.65,-2],[26,3.1,.4],{solid:true,name:'Black gallery fascia'});
 for(const x of [-7.7,7.7]){
  block(glass,[x,1.505,-2],[10.6,3.19,.08],{solid:true,name:'Frameless front glazing'});
  block(edge,[x,.02,-2],[10.6,.08,.14]);
 }
 for(const x of [-13,13]){
  block(glass,[x,3.055,-9.5],[.08,6.29,15],{solid:true,name:'Ocean-side gallery glazing'});
  for(const z of [-16.9,-12,-7,-2.05])block(edge,[x,3.04,z],[.045,6.26,.055]);
 }
 for(const x of [-2.43,2.43])block(edge,[x,1.50,-1.96],[.07,3.18,.18]);
 block(edge,[0,.005,-1.98],[4.8,.018,.65]);
 // The skylight reveals the stars from the centre aisle. It remains a solid
 // glass ceiling for movement; its support is specified in the shared layout.
 block(ink,[-7.88,6.14,-9.425],[10.94,.28,15.75],{solid:true,name:'Left roof plane'});
 block(ink,[7.88,6.14,-9.425],[10.94,.28,15.75],{solid:true,name:'Right roof plane'});
 block(glass,[0,6.1,-9.425],[4.8,.16,15.75],{solid:true,name:'Central celestial skylight'});
 block(edge,[0,6.20,-1.56],[26.7,.16,.1]);block(lit,[0,6.075,-1.49],[26.5,.018,.025]);
 for(const x of [-12.4,12.4])block(lit,[x,5.91,-9.45],[.032,.025,14.8]);
 block(lit,[0,5.91,-16.42],[24.8,.025,.032]);
 // Quiet exhibition light is actual room lighting, not an unlit picture.
 light(0,4.35,-10.5,105,13,0xffeed5);light(-7.6,4.6,-8,100,11);light(8,4.6,-10.4,95,12);
 for(const [x,z,width] of [[0,-12.0,6.5],[-7.6,-8,3.3],[8,-10.4,4.8]]){
  block(edge,[x,4.9,z],[width,.07,.28]);block(lit,[x,4.852,z],[width-.08,.015,.20]);
  for(const dx of [-width*.35,width*.35])block(edge,[x+dx,5.45,z],[.014,1.1,.014]);
 }

 // The authentic THP is shown as a perforated sheet and individual tabs.
 // There is no local price, stock or permission flag on this display.
 block(ivory,[0,.41,-12.05],[7,1,2],{solid:true,name:'TotehmPaper sales counter'});
 const counterTop=block(ivory,[0,.97,-12.05],[7,.12,2]);station(counterTop,'thp-counter','thp',0);
 block(edge,[0,.99,-11.025],[7,.025,.018]);block(warm,[0,.02,-11.025],[6.75,.018,.022]);
 const fallbackPaper=new T.DataTexture(new Uint8Array([51,51,102,255]),1,1,T.RGBAFormat);fallbackPaper.colorSpace=T.SRGBColorSpace;fallbackPaper.needsUpdate=true;textures.add(fallbackPaper);
 const paperMaterial=material(new T.MeshStandardMaterial({map:fallbackPaper,color:0xffffff,roughness:.88,side:T.DoubleSide,alphaTest:.12}));
 const signPaperMaterial=material(new T.MeshBasicMaterial({map:fallbackPaper,color:0xffffff,alphaTest:.12,side:T.DoubleSide,toneMapped:false}));
 if(globalThis.document?.createElementNS){
  const paper=new T.TextureLoader().load(TOTEHMPAPER.src,loaded=>{if(disposed)return;paperMaterial.map=signPaperMaterial.map=loaded;paperMaterial.needsUpdate=signPaperMaterial.needsUpdate=true;paperLoaded=true;changed();},undefined,changed);
  paper.colorSpace=T.SRGBColorSpace;paper.anisotropy=anisotropy;textures.add(paper);
 }
 // The original THP is the single framed work above the sales counter.
 block(edge,[0,3.45,-16.73],[2.58,2.58,.09]);
 const framedPaper=mesh(planeGeo,signPaperMaterial,[0,3.45,-16.67],{x:2.4,y:2.4,z:1});station(framedPaper,'thp-framed-original','thp',0);
 const paperItems=[],q=new T.Quaternion(),matrix=new T.Matrix4(),s=new T.Vector3(),p=new T.Vector3();
 for(const x of [-2.2,0,2.2]){
  soft(edge,[x,1.055,-11.85],[1.52,.055,1.05]);
  block(edge,[x,1.69,-12.66],[1.34,.96,.035]);
  for(let row=0;row<3;row++)for(let column=0;column<4;column++){
   paperItems.push({x:x+(column-1.5)*.316,y:1.20+(row-1)*.316*Math.cos(1.16),z:-11.85-(row-1)*.316*Math.sin(1.16),size:.31,rotation:-1.16});
   paperItems.push({x:x+(column-1.5)*.266,y:1.72+(row-1)*.266,z:-12.63,size:.26,rotation:0});
  }
 }
 for(let i=0;i<5;i++)paperItems.push({x:-1.7+i*.86,y:1.036,z:-11.20,size:.19,rotation:-Math.PI/2});
 const papers=new T.InstancedMesh(planeGeo,paperMaterial,paperItems.length);papers.name='Original perforated THP — blotter sheets and loose tabs';papers.receiveShadow=true;papers.castShadow=false;
 paperItems.forEach((paper,i)=>{p.set(paper.x,paper.y,paper.z);q.setFromEuler(new T.Euler(paper.rotation,0,0));s.set(paper.size,paper.size,1);matrix.compose(p,q,s);papers.setMatrixAt(i,matrix);});papers.instanceMatrix.needsUpdate=true;papers.computeBoundingSphere();root.add(papers);station(papers,'thp-papers','thp',0);

 // Comfortable low furniture gives each work its own place in the room.
 soft(edge,[8,.08,-6.3],[5.7,.28,1.8],{solid:true,name:'Modern lounge sofa plinth'});
 soft(leather,[8,.39,-6.43],[5.5,.5,1.47]);
 for(const x of [6.19,8,9.81])soft(leather,[x,.65,-6.49],[1.73,.23,1.34]);
 soft(leather,[8,.90,-5.60],[5.66,.5,.35]);
 for(const x of [5.31,10.69])soft(leather,[x,.73,-6.3],[.32,.57,1.76]);
 soft(darkLeather,[6.15,.93,-5.82],[.95,.42,.24]);soft(darkLeather,[9.83,.93,-5.82],[.95,.42,.24]);
 const coffee=soft(edge,[8,.51,-10.4],[4.8,.08,1.8],{solid:true,name:'Play the Lisbon Street coffee table'});station(coffee,'play-table','play',2);
 for(const x of [6.25,9.75])block(edge,[x,.21,-10.4],[.11,.52,1.15]);
 // The live screen belongs to the Play module. This is only its dark recess.
 block(edge,[8,3.1,-16.50],[7.16,4.06,.22]);block(black,[8,3.1,-16.37],[7,3.9,.025]);
 block(lit,[8,1.11,-16.34],[6.95,.013,.018]);
 const photoTable=soft(ivory,[-7.6,.93,-8],[3.3,.08,2.2],{solid:true,name:'Origins photo-book table'});station(photoTable,'origins-table','origins',1);
 for(const x of [-8.91,-6.29])for(const z of [-8.82,-7.18])block(edge,[x,.40,z],[.09,1,.09]);

 // The exact mouth drawing from Get Higher is sculpted into the fascia.
 // Dark original fills and the original paper retain the reference image.
 const sign=new T.Group();sign.name='Original mouth and THP on the gallery facade';sign.position.set(0,4.6,-1.765);root.add(sign);
 const signScale=.00235;
 const point=v=>[(v[0]-540)*signScale,(940-v[1])*signScale];
 function curveShape(points){
  const shape=new T.Shape(),first=point(points[0]);shape.moveTo(...first);
  for(let i=0;i<points.length-1;i++){
   const a=points[i-1]||points[i],b=points[i],c=points[i+1],d=points[i+2]||c;
   const c1=point([b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6]),c2=point([c[0]-(d[0]-b[0])/6,c[1]-(d[1]-b[1])/6]);shape.bezierCurveTo(...c1,...c2,...point(c));
  }
  shape.closePath();return shape;
 }
 const top=[[47,740],[95,668],[150,580],[205,490],[262,410],[318,355],[378,334],[460,346],[540,360],[620,346],[702,334],[762,355],[818,410],[875,490],[930,580],[985,668],[1033,740]];
 const bottom=[[47,740],[92,825],[140,915],[195,1005],[300,1080],[540,1120],[780,1080],[885,1005],[940,915],[988,825],[1033,740]];
 const upper=[[110,740],[195,694],[285,648],[405,590],[540,608],[675,590],[795,648],[885,694],[970,740]];
 const lower=[[110,740],[200,786],[290,826],[400,852],[540,862],[680,852],[790,826],[880,786],[970,740]];
 function signPart(shape,colour,z){const part=new T.Mesh(geometry(new T.ShapeGeometry(shape,24)),material(new T.MeshBasicMaterial({color:colour,toneMapped:false,side:T.DoubleSide})));part.position.z=z;part.name='Mouth facade relief';sign.add(part);station(part,'gallery-entry','entrance',-1);return part;}
 signPart(curveShape([...top,...bottom.slice().reverse()]),0x1f1f1f,0);
 signPart(curveShape([...upper,...lower.slice().reverse()]),0x111111,.007);
 const teeth=upper.slice(2,7),depth=[0,80,72,80,0];signPart(curveShape([...teeth,...teeth.map((v,i)=>[v[0],v[1]+depth[i]]).reverse()]),0x3c3c3c,.009);
 const tongue=new T.Shape();tongue.moveTo(...point([540,762]));
 const cubic=(a,b,c)=>tongue.bezierCurveTo(...point(a),...point(b),...point(c));
 cubic([505,738],[460,727],[410,727]);cubic([300,727],[207,770],[207,880]);tongue.lineTo(...point([207,1190]));cubic([207,1390],[360,1540],[540,1540]);cubic([720,1540],[872,1390],[872,1190]);tongue.lineTo(...point([872,880]));cubic([872,770],[780,727],[670,727]);cubic([620,727],[575,738],[540,762]);tongue.closePath();signPart(tongue,0x2a2a2a,.012);
 const seam=new T.Mesh(planeGeo,material(new T.MeshBasicMaterial({color:0x232323,toneMapped:false})));seam.scale.set(.023,1.29,1);seam.position.set(0,(940-1066)*signScale,.015);sign.add(seam);
 const tonguePaper=new T.Mesh(planeGeo,signPaperMaterial);tonguePaper.scale.set(.44,.44,1);tonguePaper.position.set(0,(940-1168)*signScale,.019);tonguePaper.name='Original THP on the tongue';sign.add(tonguePaper);station(tonguePaper,'gallery-entry','entrance',-1);
 const portals=GALLERY_STATIONS.map(station=>{const position=station.position||station.book||station.table;return{room:station.room,x:position[0],z:position[2],href:station.href,approach:{x:station.approach[0],z:station.approach[2]},pickables:interactables.filter(item=>item.room===station.room).map(item=>item.object)};});
 changed();
 return{
  root,solids,interactables,pickables:interactables.map(item=>item.object),obstacles:GALLERY_OBSTACLES,portals,
  anchors:{playScreen:GALLERY_LAYOUT.play.screen,playTable:GALLERY_LAYOUT.play.table,originsBook:GALLERY_LAYOUT.origins.book,counter:GALLERY_LAYOUT.counter.position},
  setDay(){},
  update(dt,eye,motion=true){if(disposed)return false;if(motion)time+=Math.max(0,Math.min(Number(dt)||0,.1));const result=dirty;dirty=false;return result;},
  diagnostics:()=>({kind:'contemporary-gallery-pavilion',ready:pavement.diagnostics().ready,modernGallery:true,building:true,columns:0,arches:0,doors:1,roof:true,skyLight:true,overheadLabels:0,vegetation:false,time:+time.toFixed(3),rooms:3,independentFiles:true,pavement:pavement.diagnostics(),facade:{mouth:true,originalDrawing:true,paperLoaded},thpCounter:{papers:paperItems.length,sheets:6,looseTabs:5,perforated:true,originalAsset:TOTEHMPAPER.src,loaded:paperLoaded},lounge:{sofa:true,coffeeTable:true,screenFrame:true,screenCenter:GALLERY_LAYOUT.play.screen},origins:{table:true,bookAnchor:GALLERY_LAYOUT.origins.book},portals:portals.map(({room,x,z,href})=>({room,x,z,href})),disposed}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();pavement.dispose();for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.clear();}
 };
}
