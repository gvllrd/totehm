// Real Web Audio in an otherwise empty page: no WebGL, audio file or account.
// Instrumentation observes real nodes and output; it does not replace synthesis.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';

const OUT=process.argv[2]||'/tmp/totehm-production/temple-audio';
const origin='https://www.totehm.space',requests=[];
fs.mkdirSync(OUT,{recursive:true});
const fixture=`<!doctype html><meta charset="utf-8"><button id="unlock">Sound</button>
<script type="module">
  import {createGalleryAudio} from '/gallery-audio.mjs';
  const ActualContext=window.AudioContext;
  window.constructions=0;window.toneNodes=[];window.noiseNodes=[];window.filters=[];
  window.AudioContext=new Proxy(ActualContext,{construct(Target,args){
    window.constructions++;
    const ctx=Reflect.construct(Target,args);window.audioContext=ctx;
    const makeTone=ctx.createOscillator.bind(ctx);
    ctx.createOscillator=()=>{const node=makeTone();window.toneNodes.push(node);return node;};
    const makeSource=ctx.createBufferSource.bind(ctx);
    ctx.createBufferSource=()=>{const node=makeSource();window.noiseNodes.push(node);return node;};
    const makeFilter=ctx.createBiquadFilter.bind(ctx);
    ctx.createBiquadFilter=()=>{const node=makeFilter();window.filters.push(node);return node;};
    const makeGain=ctx.createGain.bind(ctx);let first=true;
    ctx.createGain=()=>{
      const gain=makeGain();
      if(first){first=false;window.meter=ctx.createAnalyser();window.meter.fftSize=2048;gain.connect(window.meter);}
      return gain;
    };
    return ctx;
  }});
  window.audio=createGalleryAudio();window.makeAudio=createGalleryAudio;
  window.rms=()=>{
    const data=new Float32Array(window.meter.fftSize);window.meter.getFloatTimeDomainData(data);
    return Math.sqrt(data.reduce((sum,value)=>sum+value*value,0)/data.length);
  };
  document.querySelector('#unlock').addEventListener('click',async()=>{window.unlockedResult=await window.audio.unlock();});
</script>`;

const browser=await launch();
const {pg,ctx,log}=await page(browser,{
  dir:'space',origin,session:false,viewport:{width:600,height:400},
  network:url=>{
    requests.push(url.href);
    if(url.pathname==='/audio-test-fixture')return{status:200,contentType:'text/html',body:fixture};
    return null;
  },
});
let checks=0,templeRms=null,voidRms=null,unsupported=null,suspendedAt=null;
const results=[];
const check=(condition,message)=>{assert(condition,message);checks++;results.push(message);console.log('PASS '+message);};
try{
  await pg.goto(origin+'/audio-test-fixture');
  await pg.waitForFunction(()=>window.audio);
  check(await pg.evaluate(()=>audio.diagnostics().state==='uninitialized'&&constructions===0),'no AudioContext or voice is created before a gesture');
  await pg.evaluate(()=>{audio.update({active:true,zone:'temple',proximity:1.5});audio.transition('enter');});
  check(await pg.evaluate(()=>constructions===0&&audio.diagnostics().proximity===1),'updates and transitions cannot start sound; proximity clamps');
  await pg.click('#unlock');
  await pg.waitForFunction(()=>window.unlockedResult===true);
  check(await pg.evaluate(()=>audio.diagnostics().unlocked&&audioContext.state==='running'&&audio.diagnostics().voices===3),'real pointer gesture unlocks three stable voices');
  check(await pg.evaluate(()=>toneNodes.every(node=>node.type==='sine')&&toneNodes.map(node=>node.frequency.value).join(',')==='50,70,110'),'approach and meditation use real 50/70/110 Hz sine waves');
  await pg.waitForTimeout(550);
  templeRms=await pg.evaluate(()=>rms());
  check(templeRms>.0001&&templeRms<.04,'near-portal measured output remains soft ('+templeRms.toFixed(5)+' RMS)');
  await pg.evaluate(()=>audio.update({zone:'void',proximity:0}));
  await pg.waitForTimeout(650);
  voidRms=await pg.evaluate(()=>rms());
  check(voidRms>.0001&&voidRms<.03,'void measured ambience is audible and quiet ('+voidRms.toFixed(5)+' RMS)');
  await pg.evaluate(()=>audio.transition('enter'));
  check(await pg.evaluate(()=>{
    const buffer=noiseNodes[0]?.buffer;
    return audio.diagnostics().transitions===1&&audio.diagnostics().voices===4&&noiseNodes.length===1
      &&buffer?.numberOfChannels===1&&buffer.duration>=.8&&buffer.duration<=1&&filters[0]?.type==='lowpass';
  }),'entry creates one real, locally generated and low-pass-filtered breath buffer');
  await pg.waitForTimeout(1100);
  check(await pg.evaluate(()=>audio.diagnostics().voices===3),'temporary source is removed after its 0.8-second envelope');
  await pg.evaluate(()=>audio.update({active:false}));
  await pg.waitForTimeout(220);
  suspendedAt=await pg.evaluate(()=>audioContext.currentTime);
  await pg.waitForTimeout(120);
  check(await pg.evaluate(time=>audioContext.state==='suspended'&&!audio.diagnostics().active&&audioContext.currentTime===time,suspendedAt),'hidden/list activity fades and freezes the actual audio clock');
  await pg.evaluate(()=>audio.update({active:true}));
  await pg.waitForTimeout(150);
  check(await pg.evaluate(time=>audioContext.state==='running'&&audioContext.currentTime>time,suspendedAt),'returning to the visit resumes the previously unlocked audio clock');
  await pg.evaluate(()=>audio.setMuted(true));
  await pg.waitForTimeout(220);
  check(await pg.evaluate(()=>audio.diagnostics().muted&&audioContext.state==='suspended'),'sound preference mutes and suspends independently');
  await pg.evaluate(()=>{audio.update({active:false});audio.update({active:true});});
  await pg.waitForTimeout(180);
  check(await pg.evaluate(()=>audioContext.state==='suspended'),'activity changes cannot undo the mute preference');
  await pg.evaluate(()=>audio.setMuted(false));
  await pg.waitForTimeout(150);
  check(await pg.evaluate(()=>audioContext.state==='running'),'turning sound back on resumes normally');
  await pg.evaluate(async()=>{
    for(let i=0;i<5;i++){
      audio.update({active:false});await new Promise(resolve=>setTimeout(resolve,121));
      audio.update({active:true});await new Promise(resolve=>setTimeout(resolve,15));
    }
  });
  await pg.waitForTimeout(150);
  check(await pg.evaluate(()=>audioContext.state==='running'&&constructions===1),'rapid activity changes neither strand suspension nor create extra contexts');
  await pg.evaluate(()=>audio.transition('return'));
  await pg.waitForTimeout(1100);
  check(await pg.evaluate(()=>audio.diagnostics().transitions===2&&audio.diagnostics().voices===3&&noiseNodes.length===2),'return uses a second synthetic breath and cleans it up');
  await pg.evaluate(()=>{audio.dispose();audio.dispose();});
  check(await pg.evaluate(()=>audio.diagnostics().state==='closed'&&audio.diagnostics().voices===0),'disposal is idempotent and removes every voice');
  unsupported=await pg.evaluate(async()=>{
    window.AudioContext=undefined;window.webkitAudioContext=undefined;
    const silent=makeAudio(),result=await silent.unlock();
    silent.update({active:true,zone:'void'});silent.transition();return{result,...silent.diagnostics()};
  });
  check(unsupported.result===false&&!unsupported.supported&&unsupported.voices===0,'unsupported Web Audio retains a silent and functional API');
  check(!log.errors.length,'no Web Audio errors or unhandled promises');
  check(requests.length===2&&requests.every(url=>url===origin+'/audio-test-fixture'||url===origin+'/gallery-audio.mjs'),'only local HTML and JavaScript are requested; no audio file or external fetch');
  console.log('PASS '+checks+' real Web Audio checks; evidence '+OUT);
}finally{
  fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,templeRms,voidRms,suspendedAt,unsupported,requests,results,log},null,2));
  await ctx.close();await browser.close();
}
