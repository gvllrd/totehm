import * as T from './vendor/three-0.180.0.mjs';
import {DOME as D} from './gallery-lisbon-dome-layout.mjs';
import {PLAY_SIGNS} from './gallery-play-installation.mjs';

const ROWS=[
 ['no_parking','Hotel','dead_end','priority','crosswalk','stop','no_entry','hospital'],
 ['crosswalk_caution','speed_bump_caution','roundabout','left_or_straight','no_uturn','parking','destination','pharma'],
 ['fire_exit','Heli','aed','green_walk','red_walk','lisboa_city_hall']
];
const HEIGHTS=[2.35,4.85,7.05],SOURCE=new Map(PLAY_SIGNS.map(sign=>[sign.id,sign]));

// Every vertex is measured on the dome's interior ellipsoid. The entire
// panorama and each floating image share that compound curvature; nothing
// is a flat screen or a camera-facing card placed in front of the wall.
function surface(phi,y,scale=.97){
 const h=T.MathUtils.clamp((y-D.groundY)/D.height,0,.97),r=Math.sqrt(1-h*h);
 return new T.Vector3(D.radiusX*r*Math.sin(phi)*scale,y,D.centerZ+D.radiusZ*r*Math.cos(phi)*scale);
}
function inward(point){return new T.Vector3(-point.x/D.radiusX**2,-(point.y-D.groundY)/D.height**2,-(point.z-D.centerZ)/D.radiusZ**2).normalize();}
function gridGeometry(columns,rows,positionAt){
 const positions=[],normals=[],uvs=[],indices=[];
 for(let row=0;row<=rows;row++)for(let column=0;column<=columns;column++){
  const u=column/columns,v=row/rows,position=positionAt(u,v),normal=inward(position);
  positions.push(...position.toArray());normals.push(...normal.toArray());uvs.push(u,v);
  if(column<columns&&row<rows){const i=row*(columns+1)+column;indices.push(i,i+1,i+columns+1,i+1,i+columns+2,i+columns+1);}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

export function createCurvedLisbonInstallation(parent,{mobile=false,onChange=()=>{}}={}){
 const root=new T.Group();root.name='Lisbon — immersive curved street installation';parent.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),pickables=[],panels=[];
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 let disposed=false,dirty=true,active=false,focused=false,opened=false,opens=0,loaded=0,failed=0,clock=0,lastDraw=-1,animated=false,headingLoaded=false;
 let openCallback=()=>{},stateCallback=()=>{};
 const changed=()=>{if(!disposed){dirty=true;onChange();}};
 const data={kind:'lisbon-street-installation',installation:'play',playAction:'open',href:'/play_lisbon_street',room:2,curved:true};
 const mark=object=>{object.userData={...object.userData,...data};pickables.push(object);return object;};
 function imageMaterial(src,onLoad=()=>{}){
  const m=material(new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,alphaTest:.045,depthWrite:false,side:T.DoubleSide,toneMapped:false}));
  if(globalThis.document?.createElementNS){
   const texture=new T.TextureLoader().load(src,loadedTexture=>{if(disposed)return;m.opacity=1;onLoad(loadedTexture);changed();},undefined,()=>{if(disposed)return;failed++;changed();});
   texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;texture.generateMipmaps=true;textures.add(texture);m.map=texture;
  }
  return m;
 }
 const backdropMaterial=material(new T.MeshBasicMaterial({color:0x070b16,transparent:true,opacity:.16,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
 const backdrop=new T.Mesh(geometry(gridGeometry(mobile?80:128,mobile?20:32,(u,v)=>surface((48+264*u)*Math.PI/180,.65+v*7.75,.984))),backdropMaterial);
 backdrop.name='Lisbon curved street panorama';backdrop.userData={panorama:true,compoundCurvature:true};root.add(backdrop);mark(backdrop);
 function writePanel(panel,time){
  // The authored frame-based drift is mapped from its logical pixel space
  // onto metres along the dome. UVs stay unchanged as the whole patch moves.
  const phi=panel.x/10,y=panel.y,spin=panel.rotation,c=Math.cos(spin),s=Math.sin(spin);
  const attr=panel.mesh.geometry.attributes.position,normals=panel.mesh.geometry.attributes.normal;
  const radius=Math.max(4,Math.hypot(D.radiusX*Math.cos(phi),D.radiusZ*Math.sin(phi))*Math.sqrt(1-((y-D.groundY)/D.height)**2));
  for(let i=0;i<attr.count;i++){
   const u=panel.mesh.geometry.attributes.uv.getX(i),v=panel.mesh.geometry.attributes.uv.getY(i),x=(u-.5)*panel.width,dy=(v-.5)*panel.height;
   const p=surface(phi+(x*c-dy*s)/radius,y+x*s+dy*c,.966),n=inward(p);
   attr.setXYZ(i,p.x,p.y,p.z);normals.setXYZ(i,n.x,n.y,n.z);
  }
  attr.needsUpdate=normals.needsUpdate=true;panel.mesh.geometry.computeBoundingBox();panel.mesh.geometry.computeBoundingSphere();
 }
 let seed=473294;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let row=0;row<ROWS.length;row++)ROWS[row].forEach((id,column)=>{
  const source=SOURCE.get(id),important=['priority','crosswalk','stop','destination','pharma'].includes(id),width=important?2.55:2.05;
  const phi=(56+column/(ROWS[row].length-1)*248)*Math.PI/180,y=HEIGHTS[row],phase=random()*Math.PI*2,tilt=(random()-.5)*.22;
  const g=geometry(gridGeometry(mobile?12:20,mobile?8:12,(u,v)=>surface(phi+(u-.5)*width/10,y+(v-.5)*width,.966)));
  g.userData={curved:true,compoundCurvature:true,source:id,originalWidthPercent:source.width};
  const m=imageMaterial(source.src,()=>{loaded++;}),mesh=new T.Mesh(g,m);mesh.name='Curved original Lisbon sign — '+id;
  mesh.userData={curvedStreetSign:true,id,title:source.title,phrase:source.phrase,source:source.src};root.add(mesh);mark(mesh);
  const panel={id,source,phi,x:phi*10,y,width,height:width,phase,tilt,rotation:tilt,vx:(random()*.06+.04)*(random()<.5?1:-1)*.030,vy:(random()*.06+.04)*(random()<.5?1:-1)*.010,vrot:(random()-.5)*.08*Math.PI/180,mesh};panels.push(panel);writePanel(panel,0);
 });
 function advanceSigns(dt){
  const steps=Math.max(1,Math.ceil(dt*60)),step=dt*60/steps;
  for(let n=0;n<steps;n++){
   for(let i=0;i<panels.length;i++)for(let j=i+1;j<panels.length;j++){
    const a=panels[i],b=panels[j],dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy)||1,minimum=(a.width+b.width)/2+.25;
    if(distance<minimum){const f=.0005*(minimum-distance)/distance*step;a.vx-=dx*f;a.vy-=dy*f;b.vx+=dx*f;b.vy+=dy*f;}
   }
   for(const panel of panels){
    const speed=Math.hypot(panel.vx,panel.vy),maximum=.12*.030;
    if(speed>maximum){panel.vx=panel.vx/speed*maximum;panel.vy=panel.vy/speed*maximum;}
    panel.x+=panel.vx*step;panel.y+=panel.vy*step;panel.rotation+=panel.vrot*step;
    const half=panel.width*.55,left=48*Math.PI/180*10+half,right=312*Math.PI/180*10-half,bottom=.65+half,top=8.35-half;
    if(panel.x>right){panel.x=right;panel.vx=-Math.abs(panel.vx);}else if(panel.x<left){panel.x=left;panel.vx=Math.abs(panel.vx);}
    if(panel.y>top){panel.y=top;panel.vy=-Math.abs(panel.vy);}else if(panel.y<bottom){panel.y=bottom;panel.vy=Math.abs(panel.vy);}
    // Like the source page, keep the title's protected zone free of signs.
    if(Math.abs(panel.x-Math.PI*10)<3.1&&panel.y>6.9)panel.vy-=.00065*step;
   }
  }
 }
 // Keep the original Higher word visible inside the panorama as well as on
 // the entry. Its native 3:1 silhouette is projected onto the same dome.
 const titleMaterial=imageMaterial('/assets/gallery/higher.svg',()=>{headingLoaded=true;});
 const titlePhi=Math.PI,titleY=8.65,titleWidth=4.2,titleHeight=titleWidth/3;
 const titleGeometry=geometry(gridGeometry(mobile?22:36,8,(u,v)=>surface(titlePhi+(u-.5)*titleWidth/7,titleY+(v-.5)*titleHeight,.965)));
 const heading=new T.Mesh(titleGeometry,titleMaterial);heading.name='Curved native Higher — panoramic title';heading.userData={nativeHigher:true,ratio:3};root.add(heading);mark(heading);
 function setActive(value){if(disposed)return false;const next=!!value,result=next!==active||next!==focused;active=focused=next;if(!next)opened=false;if(result)changed();return result;}
 function open(){if(disposed)return false;opened=true;opens++;changed();const event={kind:'lisbon-street-installation',href:'/play_lisbon_street'};stateCallback(event);openCallback(event);return true;}
 function acceptHit(hit){return!!(hit?.object&&pickables.includes(hit.object));}
 function interact(value,hit=null){const object=value?.object||hit?.object||value;if(!pickables.includes(object))return false;active=focused=true;return open();}
 return{root,pickables,screen:backdrop,panels,open,setActive,interact,acceptHit,
  onOpen(callback){openCallback=typeof callback==='function'?callback:()=>{};},onState(callback){stateCallback=typeof callback==='function'?callback:()=>{};},
  handleKey(event){const key=typeof event==='string'?event:event.key;if(!disposed&&active&&focused&&key==='Enter'&&!event?.repeat)return open();return false;},
  update(dt,eye,moving=true){
   if(disposed)return false;const elapsed=Math.max(0,Math.min(Number(dt)||0,.1));animated=!!moving&&elapsed>0;
   if(animated){clock+=elapsed;advanceSigns(elapsed);if(clock-lastDraw>=1/(mobile?12:18)){for(const panel of panels)writePanel(panel,clock);lastDraw=clock;dirty=true;}}
   const result=dirty;dirty=false;return result;
  },
  diagnostics:()=>({kind:'lisbon-curved-street-installation',ready:loaded===PLAY_SIGNS.length&&headingLoaded,portal:true,inGalleryPlayback:false,active,focused,opened,opens,signs:panels.length,loaded,failed,loadFailures:failed,curved:true,compoundCurvature:true,matchingStandaloneDrift:true,collisionAvoidance:true,originalSignImages:true,animated,videoDecoders:0,videoFrames:0,playing:false,mediaSource:null,coverReady:loaded===PLAY_SIGNS.length&&headingLoaded,view:'floating-signs',screenSize:[D.radiusX*2,8],screenBounds:{minY:.65,maxY:9.35,angleStart:48,angleEnd:312},positions:panels.map(p=>({id:p.id,width:p.width,phi:p.x/10,y:p.y})),title:'Higher the Lisbon Streets',sloganSVG:'/assets/gallery/higher.svg',standalone:'/play_lisbon_street',time:+clock.toFixed(3),disposed}),
  dispose(){if(disposed)return;disposed=true;active=focused=animated=false;openCallback=stateCallback=()=>{};root.removeFromParent();for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.clear();}
 };
}
