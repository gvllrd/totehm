// Real audio bytes, real decoding and measured output; no production services.
import assert from 'node:assert/strict';import fs from 'node:fs';
import {launch,page} from './harness.mjs';
const origin='https://www.totehm.space',OUT=process.argv[2]||'/tmp/fire-recording';fs.mkdirSync(OUT,{recursive:true});
const browser=await launch();let checks=0;const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:false,network:url=>url.pathname==='/gallery-spatial.mjs'?{status:200,contentType:'text/javascript',body:'export async function createGallery(){return {setList(){},invalidate(){},diagnostics:()=>({webgl:false})}}'}:null});
try{
 await pg.goto(origin+'/');
 await pg.evaluate(async()=>{
  const {createFireAudio}=await import('/gallery-fire-audio.mjs');
  window.__recordedFire=createFireAudio();window.__recordingLoads=[];
  const fetchNative=window.fetch;window.fetch=function(input,...args){if(String(input).includes('/assets/fire/'))__recordingLoads.push(String(input));return fetchNative.call(this,input,...args);};
  const button=document.createElement('button');button.id='fire-gesture';button.textContent='Hear the fire';button.style.cssText='position:fixed;top:50%;left:50%;z-index:100';document.body.append(button);
  window.__fireInitial=__recordedFire.diagnostics();
  button.addEventListener('click',()=>{__recordedFire.update({active:true,proximity:1,pan:0});__recordedFire.unlock();});
 });
 check(await pg.evaluate(()=>__fireInitial.state==='uninitialized'&&!__fireInitial.unlocked&&__recordingLoads.length===0),'no context, download or playback before a real gesture');
 await pg.click('#fire-gesture');
 await pg.waitForFunction(()=>__recordedFire.diagnostics().loaded||__recordedFire.diagnostics().loadError,null,{timeout:15000});
 const d=await pg.evaluate(()=>__recordedFire.diagnostics());
 check(d.loaded&&!d.loadError&&d.unlocked&&d.recording&&d.kind==='recorded-wood-fire-audio','a real gesture downloads and decodes the genuine recording');
 check(d.recordedSeconds>25&&d.recordedSeconds<26&&d.loopSeconds>24&&d.crossfadeSeconds===.65,'the complete recording becomes a long loop with a crossfaded seam');
 check(d.textureStatistics[0].rms>.015&&d.textureStatistics[0].peak>.1&&d.voices===1&&d.externalFiles===1,'actual decoded sample has audible fire energy without synthetic layers');
 check(await pg.evaluate(()=>__recordingLoads.length===1&&__recordingLoads[0]==='/assets/fire/wood-fire.mp3'),'the source is local and loaded once');
 await pg.evaluate(()=>{__recordedFire.update({active:true,proximity:.3,pan:-1});});await pg.waitForTimeout(250);
 const far=await pg.evaluate(()=>__recordedFire.diagnostics());
 await pg.evaluate(()=>{__recordedFire.update({active:true,proximity:1,pan:1});});await pg.waitForTimeout(250);
 const near=await pg.evaluate(()=>__recordedFire.diagnostics());
 check(near.gain>far.gain*4&&far.pan===-.65&&near.pan===.65,'distance softens the fire and stereo direction follows the view');
 await pg.evaluate(()=>__recordedFire.setMuted(true));await pg.waitForTimeout(250);
 const muted=await pg.evaluate(()=>__recordedFire.diagnostics());check(muted.gain===0&&!muted.audible&&muted.state==='suspended','muting silences and suspends the owned context');
 await pg.evaluate(()=>__recordedFire.setMuted(false));await pg.waitForTimeout(250);check(await pg.evaluate(()=>__recordedFire.diagnostics().audible&&__recordedFire.diagnostics().state==='running'),'unmuting resumes the existing decoded recording');
 await pg.evaluate(()=>__recordedFire.update({active:false}));await pg.waitForTimeout(250);check(await pg.evaluate(()=>!__recordedFire.diagnostics().audible&&__recordedFire.diagnostics().gain===0&&__recordedFire.diagnostics().state==='suspended'),'hidden/list state suspends sound');
 await pg.evaluate(()=>__recordedFire.dispose());await pg.waitForTimeout(50);check(await pg.evaluate(()=>__recordedFire.diagnostics().disposed&&__recordedFire.diagnostics().voices===0&&__recordedFire.diagnostics().state==='closed'),'disposal stops the source and closes its owned context');
 await pg.evaluate(async()=>{
  const {createFireAudio}=await import('/gallery-fire-audio.mjs');
  document.querySelector('#fire-gesture').addEventListener('click',()=>{
   if(window.__borrowedFire)return;
   const context=new AudioContext(),analyser=context.createAnalyser();analyser.fftSize=2048;analyser.connect(context.destination);
   window.__borrowedContext=context;window.__fireAnalyser=analyser;window.__borrowedFire=createFireAudio({context,destination:analyser});__borrowedFire.update({active:true,proximity:1});__borrowedFire.unlock();
  });
 });
 await pg.click('#fire-gesture');await pg.waitForFunction(()=>window.__borrowedFire?.diagnostics().loaded,null,{timeout:15000});await pg.waitForTimeout(450);
 const output=await pg.evaluate(()=>{const data=new Float32Array(__fireAnalyser.fftSize);__fireAnalyser.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((sum,value)=>sum+value*value,0)/data.length);});
 check(output>.002,'the real native audio graph produces measurable recorded-fire output');
 await pg.evaluate(()=>{__borrowedFire.setMuted(true);__borrowedFire.update({active:false});});await pg.waitForTimeout(250);
 check(await pg.evaluate(()=>__borrowedFire.diagnostics().gain===0&&__borrowedContext.state==='running'),'muting a borrowed graph preserves its owner’s audio clock');
 await pg.evaluate(()=>__borrowedFire.dispose());check(await pg.evaluate(()=>__borrowedContext.state==='running'&&__borrowedFire.diagnostics().voices===0),'disposal never closes a borrowed context');await pg.evaluate(()=>__borrowedContext.close());
 check(!log.errors.some(e=>e.startsWith('pageerror:')||e.includes('[hearth audio]')),log.errors.join('\n'));
 fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,source:d,far,near,output,errors:log.errors},null,2));
 console.log('PASS '+checks+' recorded fire lifecycle checks');
}finally{await ctx.close();await browser.close();}
