import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';

const origin='https://www.totehm.space';
const film=fs.readFileSync(new URL('../../space/assets/slides/init.mp4',import.meta.url));
const urls=Object.fromEntries(Array.from({length:11},(_,step)=>[step,origin+'/qa-stoner/'+step+'.mp4']));
const browser=await launch();
try{
 const fixture=await page(browser,{dir:'space',origin,viewport:{width:1360,height:900},
  functions:{'stoner-gate':{access:true,urls,expires_in:900}},
  network:url=>url.pathname.startsWith('/qa-stoner/')?{contentType:'video/mp4',body:film}:null});
 const {pg}=fixture;
 try{
  await pg.goto(origin+'/stoner');
  await pg.waitForFunction(()=>__totehm_stoner().access&&__totehm_stoner().slots.some(slot=>slot.on));
  const player=pg.locator('#stoner-player'),panel=pg.locator('#neuro-panel'),paper=pg.locator('#vid-wrap');
  const reader=pg.getByRole('button',{name:'Neurological reasons',exact:true});
  const [left,right,edition]=await Promise.all([player.boundingBox(),panel.boundingBox(),paper.boundingBox()]);
  assert.ok(Math.abs(left.width/(left.width+right.width)-.7)<.01&&edition.width>420);
  assert.equal(await reader.getAttribute('aria-expanded'),'true');
  assert.ok(await pg.locator('#neuro-content').isVisible());
  const native=pg.locator('#step0-intro .higher-inline svg');
  assert.equal(await native.locator('use').getAttribute('href'),'#higher-slogan');
  await pg.waitForFunction(()=>document.querySelector('#step0-intro .writing-logo')?.style.getPropertyValue('--written')==='100%');
  await reader.click();
  assert.equal(await reader.getAttribute('aria-expanded'),'false');
  assert.deepEqual(await paper.boundingBox(),edition);
  await pg.locator('.vb-inner video.on').evaluate(v=>v.dispatchEvent(new Event('ended')));
  await pg.locator('#btn-low').click();
  await pg.waitForFunction(()=>__totehm_stoner().step===1&&!__totehm_stoner().busy);
  assert.equal(await reader.getAttribute('aria-expanded'),'false');
  assert.equal(await pg.locator('#tech-text .higher-inline use').getAttribute('href'),'#higher-grind');
  await reader.click();
  assert.match(await pg.locator('#neuro-content').textContent(),/Every empire/);
  const my=pg.getByRole('link',{name:'My TOTEHM',exact:true});
  const footer=await my.boundingBox();
  assert.ok(Math.abs(footer.x+footer.width/2-680)<1&&footer.y+footer.height>890);
  assert.equal(await my.getAttribute('href'),'https://www.totehm.com/');
  assert.equal(await my.getAttribute('target'),'_blank');
  assert.ok(!fixture.log.errors.some(message=>message.startsWith('pageerror:')));
 }finally{await fixture.ctx.close();}
}finally{await browser.close();}
console.log('PASS Stoner 70/30, shared neurological panel, native Higher typing and centred My TOTEHM');
