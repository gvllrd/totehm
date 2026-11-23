import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';
import {LISBON_FRONT_NAMES,LISBON_FRONT_COPY} from '../../space/lisbon-first-page.mjs';

const out=process.argv[2]||'/tmp/lisbon-first-page';
fs.mkdirSync(out,{recursive:true});
const browser=await launch();
let checks=0;
const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};

try{
 for(const viewport of [{width:1440,height:900},{width:1024,height:768}]){
  const fixture=await page(browser,{
   dir:'space',origin:'https://www.totehm.space',session:false,viewport,
   network:url=>url.pathname==='/qa-lisbon-front'?{
    contentType:'text/html',
    body:'<!doctype html><style>html,body{margin:0;height:100%;background:#000}iframe{width:100%;height:100%;border:0}</style><iframe src="/play_lisbon_street?embedded=1&sceneTime=19"></iframe>'
   }:null
  });
  try{
   // Record the actual canvas paint, including the visibility of every source PNG.
   await fixture.ctx.addInitScript(()=>{
    const prototype=CanvasRenderingContext2D.prototype;
    const fill=prototype.fillRect,draw=prototype.drawImage,text=prototype.fillText;
    prototype.fillRect=function(...args){if(this.canvas.id==='experience-front-canvas')window.__qaFrontPaint={signs:[],text:[]};return fill.apply(this,args);};
    prototype.drawImage=function(source,...args){if(this.canvas.id==='experience-front-canvas'&&source.src)window.__qaFrontPaint.signs.push({name:new URL(source.src).pathname.split('/').at(-1).replace('.png',''),alpha:this.globalAlpha});return draw.call(this,source,...args);};
    prototype.fillText=function(value,...args){if(this.canvas.id==='experience-front-canvas')window.__qaFrontPaint.text.push({value,font:this.font});return text.call(this,value,...args);};
   });
   await fixture.pg.goto('https://www.totehm.space/qa-lisbon-front');
   const child=fixture.pg.frames().find(frame=>frame.parentFrame());
   await child.waitForFunction(()=>window.__totehm_experience_front?.().ready);
   const state=await child.evaluate(()=>__totehm_experience_front());
   check(state.loaded===22&&state.failures===0&&state.minimumSignSize>=138&&!state.titleOnly&&state.visibleSigns===22,'All 22 original floating signs are visible before entering Discover at '+viewport.width);
   const painted=await child.evaluate(()=>window.__qaFrontPaint);
   assert.deepEqual(painted.signs.map(sign=>sign.name),LISBON_FRONT_NAMES);
   check(painted.signs.every(sign=>sign.alpha>=.29),'Every original sign is painted visibly, in its canonical transition order at '+viewport.width);
   check(painted.text.map(line=>line.value).join('|')===[LISBON_FRONT_COPY.headline,LISBON_FRONT_COPY.subtitle].join('|')&&parseInt(painted.text[1].font.match(/\d+px/)[0])<parseInt(painted.text[0].font.match(/\d+px/)[0]),'The requested brain headline and smaller neurological caption are actually painted at '+viewport.width);
   check(await child.locator('#experience-front-canvas').getAttribute('aria-label')===LISBON_FRONT_COPY.headline+'. '+LISBON_FRONT_COPY.subtitle+'. 22 floating Lisbon signs.','The canvas exposes its headline, caption and 22 signs to assistive technology at '+viewport.width);
   await child.waitForTimeout(250);
   check(await child.evaluate(()=>__totehm_experience_front().time===19&&__totehm_experience_front().phase==='front'),'The embedded first page holds the exhibition time during expansion at '+viewport.width);
   const shared=await fixture.pg.evaluate(async()=>{
    const {Group,PerspectiveCamera,Vector3,ReplaceStencilOp}=await import('/vendor/three-0.180.0.mjs');
    const {createUfoLisbonSigns}=await import('/gallery-ufo-lisbon-signs.mjs');
    const projection=createUfoLisbonSigns(new Group()),projector=new Group();
    const {LISBON_PROJECTOR_PORTS}=await import('/gallery-lisbon-projector.mjs');
    projector.position.set(0,18.847,-4.2);projection.setProjector(projector);
    try{
     const deadline=performance.now()+8000;
     while(!projection.diagnostics().ready&&performance.now()<deadline)await new Promise(requestAnimationFrame);
     const {LISBON_URBEX_LAYOUT:L}=await import('/gallery-lisbon-urbex-layout.mjs');
     const camera=new PerspectiveCamera(L.fov,innerWidth/innerHeight,.08,9000);
     camera.position.fromArray(L.entry);camera.lookAt(new Vector3(...L.look));camera.updateMatrixWorld();
     const snapshot=()=>projection.snapshot(camera,innerWidth,innerHeight);
     const before=snapshot(),raysBefore=projection.rayEndpoints();
     const fields=raysBefore.filter(ray=>ray.held),floorProjections=raysBefore.filter(ray=>!ray.held);
     const magnetic=fields.length===20&&fields.every(ray=>ray.bend>.09)&&floorProjections.length===2&&floorProjections.every(ray=>ray.bend<.001);
     projector.rotateY(.2);
     projection.update(.1,camera.position,true);
     const moved=snapshot(),raysAfter=projection.rayEndpoints(),point=new Vector3();
     const moveEndpoints=raysAfter.every(({from,to},i)=>{
      const expected=projector.localToWorld(new Vector3(...LISBON_PROJECTOR_PORTS[i]));
      const body=projection.signs[i].hitTargets[0],{min,max}=body.geometry.boundingBox;
      const mounted=body.localToWorld(new Vector3((min.x+max.x)/2,min.y+(max.y-min.y)*.88,max.z));
      return point.fromArray(from).distanceTo(expected)<.001&&point.distanceTo(new Vector3(...raysBefore[i].from))>.1&&point.fromArray(to).distanceTo(mounted)<.001;
     });
     const encompasses=({from,aperture,bounds})=>{
      const origin=new Vector3(...from),rim=aperture.map(vertex=>new Vector3(...vertex));
      const normal=rim[1].clone().sub(rim[0]).cross(rim[2].clone().sub(rim[1])).normalize();
      const end=rim[0].clone().sub(origin).dot(normal);
      return bounds.every(corner=>{
       const delta=new Vector3(...corner).sub(origin),depth=delta.dot(normal);
       if(depth<=0||depth>end+.001)return false;
       const projected=origin.clone().addScaledVector(delta,end/depth);
       return rim.every((start,i)=>rim[(i+1)%rim.length].clone().sub(start).cross(projected.clone().sub(start)).dot(normal)>=-.001);
      });
     };
     const enclosesEveryObject=raysBefore.every(encompasses)&&raysAfter.every(encompasses);
     const mounted=projection.signs.flatMap(({id,group,hitTargets})=>{
      const post=hitTargets.find(mesh=>mesh.userData.streetPost);
      if(!post)return [];
      const panel=hitTargets[0],base=post.geometry.boundingBox.min.y+post.position.y;
      return [{id,length:(panel.geometry.boundingBox.min.y-base)*group.scale.y}];
     });
     const mountedIds=new Set(mounted.map(({id})=>id));
     const raisedPosts=mounted.length===12&&mounted.every(({length})=>length>1.4)&&
      raysAfter.filter(({id})=>mountedIds.has(id)).every(({bounds})=>bounds.every(([,y])=>y>L.groundY+.25));
     const paint=projection.signs.filter(({face})=>face.userData.groundMarking);
     const onPavement=paint.length===2&&paint.every(({face,group})=>group.children.length===1&&Math.abs(face.getWorldPosition(point).y-L.groundY)<.02);
     const paintImage=paint.find(({id})=>id==='crosswalk').face.material.map.image;
     const mask=paintImage.getContext('2d').getImageData(0,0,300,300).data;
     const transparentGaps=mask[(50*300+20)*4+3]===0&&mask[(90*300+150)*4+3]===0&&mask[(50*300+150)*4+3]===255;
     const originalColors=projection.signs.every(({face})=>face.material.stencilWrite&&face.material.stencilZPass===ReplaceStencilOp)&&
      projection.signs.filter(({id})=>['stop','destination','priority'].includes(id)).every(({face})=>face.material.isMeshBasicMaterial&&!face.material.toneMapped);
     projection.update(.1,camera.position,false);
     const still=snapshot();
     const floorIds=new Set(['Heli','crosswalk']);
     const paintStaysFixed=before.every((pose,i)=>!floorIds.has(pose.id)||JSON.stringify(pose)===JSON.stringify(moved[i]));
     const red=projection.signs.find(({id})=>id==='red_walk').group,green=projection.signs.find(({id})=>id==='green_walk').group;
     const lensesStayTogether=red.quaternion.dot(green.quaternion)>.999999&&
      red.position.clone().sub(green.position).distanceTo(new Vector3(0,.66,0).applyQuaternion(green.quaternion))<.001;
     const world=projection.diagnostics();
     const size=new Vector3(),scale=new Vector3();
     const rendered=mesh=>{
      for(let node=mesh;node;node=node.parent)if(!node.visible)return false;
      const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      return materials.some(material=>material?.visible&&material.opacity>0);
     };
     const visibleVolumes=projection.signs.filter(({face})=>!face.userData.groundMarking).map(({group})=>{
      const meshes=[];
      group.traverse(mesh=>{
       if(!mesh.isMesh||!rendered(mesh)||mesh.userData.hitProxy)return;
       mesh.geometry.computeBoundingBox();
       mesh.geometry.boundingBox.getSize(size).multiply(mesh.getWorldScale(scale));
       if(Math.min(size.x,size.y,size.z)>.001)meshes.push(mesh);
      });
      return meshes;
     });
     projection.setHandoff(true);
     const hidesAllBodies=visibleVolumes.every(meshes=>meshes.every(mesh=>!rendered(mesh)))&&!projection.diagnostics().beamVisible;
     projection.setHandoff(false);
     const restoresAllBodies=visibleVolumes.every(meshes=>meshes.every(rendered))&&projection.diagnostics().beamVisible;
     return {
      world,before,sources:projection.signs.map(({face})=>face.material.map?.image?.src??face.userData.source),
      volumes:visibleVolumes.map(meshes=>meshes.length),hidesAllBodies,restoresAllBodies,moveEndpoints,enclosesEveryObject,onPavement,transparentGaps,originalColors,magnetic,paintStaysFixed,lensesStayTogether,raisedPosts,
      moving:before.some((pose,i)=>Math.hypot(pose.x-moved[i].x,pose.y-moved[i].y)>.01),
      still:JSON.stringify(still)===JSON.stringify(moved)
     };
    }finally{projection.dispose();}
   });
   assert.deepEqual(shared.before.map(({id})=>id),LISBON_FRONT_NAMES);
   assert.deepEqual(shared.sources.map(src=>new URL(src,'https://www.totehm.space').pathname),LISBON_FRONT_NAMES.map(id=>'/assets/signs/'+id+'.png'));
   check(shared.world.ready&&shared.world.loaded===22&&shared.world.physicalObjects&&shared.volumes.length===20&&shared.volumes.every(count=>count>0),'Each of the 20 elevated signs includes geometry with thickness at '+viewport.width);
   check(shared.raisedPosts,'The 12 longer roadside posts are fully lifted off the paving at '+viewport.width);
   check(shared.enclosesEveryObject,'Each dark projection encloses every corner of its mounted object at '+viewport.width);
   check(shared.magnetic&&shared.paintStaysFixed&&shared.lensesStayTogether,'Twenty signs are held in curved fields, the linked signal stays rigid, and both ground marks stay fixed at '+viewport.width);
   check(shared.onPavement&&shared.transparentGaps,'The two road markings are flat decals with transparent ground between white strokes at '+viewport.width);
   check(shared.originalColors,'The panels retain their native artwork colors inside the dark projection at '+viewport.width);
   check(shared.hidesAllBodies&&shared.restoresAllBodies&&shared.moveEndpoints,'All beams follow the rotating ports and their actual objects, then hide and restore with them at '+viewport.width);
   check(shared.world.headline===LISBON_FRONT_COPY.headline&&shared.world.subtitle===LISBON_FRONT_COPY.subtitle,'The world projection and fullscreen introduction retain the same copy at '+viewport.width);
   check(shared.moving&&shared.still,'The suspended signs float during normal motion and hold their poses with reduced motion at '+viewport.width);
   check(shared.before.every(({x,y,width,height,rotation,corners})=>[x,y,width,height,rotation].every(Number.isFinite)&&width>0&&height>0&&corners.length===4&&corners.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y))),'The transition can sample one projected footprint per artwork at '+viewport.width);
   await fixture.pg.screenshot({path:out+'/front-'+viewport.width+'.png'});
   await child.evaluate(()=>dispatchEvent(new Event('totehm:experience-enter')));
   await child.waitForFunction(()=>__totehm_experience_front().phase==='discover'&&__totehm_experience_front().reveal===1&&__totehm_experience_front().visibleSigns===22);
   check(await child.evaluate(()=>__totehm_lisbon().step===0&&__totehm_lisbon().discoverSlides===9&&__totehm_lisbon().firstPage.time>19),'The floating field continues into the nine original Discover slides at '+viewport.width);
   const story=await child.evaluate(()=>window.__qaFrontPaint);
   check(story.signs.length===22&&story.signs.every(sign=>Math.abs(sign.alpha-.29)<1e-8)&&story.text.length===0,'The headline fades out while all 22 signs remain behind the Discover text at '+viewport.width);
   check(!fixture.log.functions.some(call=>call.name==='lisbon-street-media'),'The public first page never fetches a protected film at '+viewport.width);
   check(!fixture.log.errors.some(error=>error.startsWith('pageerror:')),'The first-page handoff has no script error at '+viewport.width);
  }finally{await fixture.ctx.close();}
 }
 const owner=await page(browser,{dir:'space',origin:'https://www.totehm.space',session:true,viewport:{width:1100,height:760},functions:{'stoner-gate':{access:true}}});
 try{
  await owner.pg.goto('https://www.totehm.space/play_lisbon_street');
  await owner.pg.waitForFunction(()=>window.__totehm_experience_front?.().ready&&__totehm_lisbon().access.owned);
  await owner.pg.locator('#sdisc-cover-next').click();await owner.pg.waitForTimeout(700);
  check(await owner.pg.locator('.disc-block.is-first [data-street-enter]').count()===0,'Discover starts with copy and a single Next arrow');
  check(await owner.pg.locator('#sdisc-trig').isVisible()&&await owner.pg.locator('#sdisc-reading-hint').count()===0,'The lower chevron is the only Discover arrow');
  for(let step=1;step<9;step++){await owner.pg.locator('#sdisc-trig').click();await owner.pg.waitForFunction(next=>__totehm_lisbon().step===next&&document.querySelectorAll('.disc-block.active').length===1,step);}
  check(await owner.pg.getByRole('button',{name:'Play the Lisbon Streets',exact:true}).count()===1,'Only the final slide offers Play the Lisbon Streets');
  await owner.pg.getByRole('button',{name:'Play the Lisbon Streets',exact:true}).click();
  await owner.pg.waitForFunction(()=>__totehm_lisbon().board&&!__totehm_lisbon().snapping);
  check(await owner.pg.locator('.street-rock[role=button]').count()===22,'An entitled member transforms the same 22 signs into the original controller');
  check(!owner.log.functions.some(call=>call.name==='lisbon-street-media'),'Arranging the controller still waits for a sign gesture before requesting private media');
  check(!owner.log.errors.some(error=>error.startsWith('pageerror:')),'The entitled controller transition has no script error');
  await owner.pg.screenshot({path:out+'/controller.png'});
 }finally{await owner.ctx.close();}
}finally{await browser.close();}
console.log('PASS '+checks+' canonical Lisbon first-page checks');
