// Local fixture only: exercise the actual media element and viewer gesture.
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {launch,page} from './harness.mjs';
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'opposite-media-'));
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=320x180:rate=12','-t','4','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-movflags','+faststart',fixture+'/art.mp4']);
const media=fs.readFileSync(fixture+'/art.mp4'),origin='https://www.totehm.space',browser=await launch();let checks=0;
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const requests=[];
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:false,viewport,network:url=>{
   if(url.pathname.endsWith('/higher_boutique/same_but_opposite.mp4')){requests.push(url.href);return{status:200,contentType:'video/mp4',body:media};}return null;
  }});
  await pg.goto(origin+'/same_but_opposite');
  await pg.waitForFunction(()=>typeof __totehm_opposite==='function');
  assert.equal(await pg.$eval('#artwork',v=>v.src),'https://abujjbkbbiumxrokozph.supabase.co/storage/v1/object/public/higher_boutique/same_but_opposite.mp4');checks++;
  assert.equal(await pg.$eval('#artwork',v=>v.autoplay),false);checks++;
  await pg.waitForTimeout(250);assert.equal(requests.length,0,'opening the experience does not download or start its video');checks++;
  assert(await pg.locator('#play-artwork').isVisible());checks++;
  await pg.click('#play-artwork');await pg.waitForFunction(()=>!document.querySelector('#artwork').paused&&document.querySelector('#artwork').currentTime>0);
  assert.equal(requests.length,1,'explicit play fetches the artwork');checks++;
  assert.equal(await pg.locator('#play-artwork').isVisible(),false);checks++;
  await pg.$eval('#artwork',v=>v.pause());await pg.waitForFunction(()=>!document.querySelector('#play-artwork').hidden);
  await pg.click('#play-artwork');await pg.waitForFunction(()=>!document.querySelector('#artwork').paused);checks++;
  assert.equal(await pg.locator('a[aria-label="Return to the gallery"]').getAttribute('href'),'/');checks++;
  assert(!log.errors.some(e=>e.startsWith('pageerror:')),log.errors.join('\n'));checks++;
  await ctx.close();
 }
 console.log('PASS '+checks+' Same but opposite playback checks');
}finally{await browser.close();fs.rmSync(fixture,{recursive:true,force:true});}
