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
    const {Group}=await import('/vendor/three-0.180.0.mjs');
    const {createSaucerProjection}=await import('/gallery-saucer-projection.mjs');
    const projection=createSaucerProjection(new Group());
    await projection.front.ready;projection.front.setTime(19);
    const actual=document.querySelector('iframe').contentDocument.getElementById('experience-front-canvas');
    const equal=actual.toDataURL()===projection.front.canvas.toDataURL();
    const mapped=projection.screen.material.map.image===projection.front.canvas;
    const start=projection.diagnostics().time,version=projection.screen.material.map.version;
    projection.update(.1,null,true);
    const moving=projection.diagnostics().time>start&&projection.screen.material.map.version>version;
    const frame=projection.front.canvas.toDataURL(),time=projection.diagnostics().time;
    projection.update(.1,null,false);
    const still=projection.diagnostics().time===time&&projection.front.canvas.toDataURL()===frame;
    const opacity=projection.front.getSignOpacity(),signs=projection.front.getSigns().length;
    projection.dispose();return{equal,mapped,moving,still,opacity,signs};
   });
   check(shared.equal&&shared.mapped,'The suspended Space texture and fullscreen experience produce exactly the same first frame at '+viewport.width);
   check(shared.moving&&shared.still,'The suspended signs float during normal motion and hold their frame with reduced motion at '+viewport.width);
   check(shared.signs===22&&Math.abs(shared.opacity-.64)<1e-8,'The transition receives all 22 exact poses and their rendered opacity at '+viewport.width);
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
  await owner.pg.locator('.disc-block.is-first [data-street-enter]').click();
  await owner.pg.waitForFunction(()=>__totehm_lisbon().board&&!__totehm_lisbon().snapping);
  check(await owner.pg.locator('.street-rock[role=button]').count()===22,'An entitled member transforms the same 22 signs into the original controller');
  check(!owner.log.functions.some(call=>call.name==='lisbon-street-media'),'Arranging the controller still waits for a sign gesture before requesting private media');
  check(!owner.log.errors.some(error=>error.startsWith('pageerror:')),'The entitled controller transition has no script error');
  await owner.pg.screenshot({path:out+'/controller.png'});
 }finally{await owner.ctx.close();}
}finally{await browser.close();}
console.log('PASS '+checks+' canonical Lisbon first-page checks');
