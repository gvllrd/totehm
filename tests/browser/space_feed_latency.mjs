// Real decoded HLS/MP4 frames with deterministic signing/CDN delays.
// Synthetic accounts and media only. These are regression timings, not a TikTok benchmark.
import fs from 'node:fs';
import path from 'node:path';
import {launch,page} from './harness.mjs';
const baseline=process.argv.includes('--baseline'),origin='https://www.totehm.space';
if(baseline && !process.env.SPACE_FEED_BASELINE)throw new Error('Set SPACE_FEED_BASELINE to the previous version of the space directory.');
const source=baseline?process.env.SPACE_FEED_BASELINE:new URL('../../space',import.meta.url).pathname;
const fixture=process.env.SPACE_HLS_FIXTURE || '/tmp/space-portrait-fixtures';
const out=process.env.SPACE_FEED_REPORT_DIR || '/tmp/space-oct04-qa';fs.mkdirSync(out,{recursive:true});
let checks=0;const check=(yes,label)=>{checks++;if(!yes){console.error('FAIL '+label);process.exitCode=1;}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uid=i=>'aaaaaaaa-aaaa-4aaa-8aaa-'+String(i).padStart(12,'0');
const rows=Array.from({length:21},(_,i)=>({id:'spot-'+i,habit:'Walk',freq:'daily',intentions:['love'],visibility:'shared',location:'off',city:'Lisbon',starts_at:new Date(Date.now()-i*60000).toISOString(),ends_at:new Date(Date.now()+3600000).toISOString(),duration_min:60,creator:'nia',mine:false,exact:null,clip:{id:uid(i),status:'ready'}}));
const report={mode:baseline?'before':'after',network:'synthetic: signing 350 ms, CDN 90 ms + segment bytes / 4 MB per second',samples:[]};
const browser=await launch();
async function setup({storage=false,slow=false,saveData=false,signing=350,viewport={width:390,height:844},expired=false,processing=false,future=false}={}){
 const network=async(url,req,log)=>{
  if(url.origin===origin && ['/', '/index.html'].includes(url.pathname))return {status:200,contentType:'text/html',body:fs.readFileSync(path.join(source,'index.html'))};
  if(url.hostname==='test.b-cdn.net'){
   const name=path.basename(url.pathname),file=path.join(fixture,name);if(!fs.existsSync(file))return {status:404,body:''};
   const body=fs.readFileSync(file);log.network.push({kind:'cdn',path:url.pathname,time:Date.now(),bytes:body.length});
   await sleep(90+(name.endsWith('.ts')?body.length/4000000*1000:0));
   return {status:200,contentType:name.endsWith('.m3u8')?'application/vnd.apple.mpegurl':'video/mp2t',body};
  }
  if(url.pathname.startsWith('/storage/v1/object/sign/') && req.method()==='POST'){
   log.signed=(log.signed || 0)+1;await sleep(signing);
   return {status:200,contentType:'application/json',body:JSON.stringify({signedURL:'/object/sign/'+url.pathname.slice(24)+'?token=synthetic'})};
  }
  if(url.pathname.startsWith('/storage/v1/object/sign/') && req.method()==='GET'){
   const body=fs.readFileSync(fixture+'/playback.mp4'),range=req.headers().range?.match(/bytes=(\d+)-(\d*)/),start=Number(range?.[1] || 0),end=Math.min(body.length-1,range?.[2]?Number(range[2]):body.length-1);
   log.network.push({kind:'storage',time:Date.now(),path:url.pathname});await sleep(90);
   return {status:range?206:200,contentType:'video/mp4',headers:{'Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${end}/${body.length}`}:{})},body:body.subarray(start,end+1)};
  }
 };
 let reads=0;
 const authorize=async b=>{
  await sleep(signing);reads++;
  const one=({id,spot})=>({id,spot,status:processing && reads===1?'processing':'ready',url:'https://test.b-cdn.net/bcdn_token=SYNTHETIC&expires=9999999999&token_path=%2F'+id+'%2F/'+id+'/playlist.m3u8',expires:expired?Math.floor(Date.now()/1000)+35:9999999999});
  return b.clips?{clips:b.clips.map(one)}:one(b);
 };
 const list=storage?rows.map((s,i)=>({...s,clip:null,video:'11111111-1111-4111-8111-111111111111/'+i+'.mp4'})):rows;
 const result=await page(browser,{dir:'space',origin,network,viewport,hasTouch:true,rpc:{spot_rules:{video_provider:storage?'storage':'bunny'},space_discover:b=>({spots:b.p_view==='feed'?(b.p_before?list.slice(20):list.slice(0,20)):future && b.p_view==='list'?[{...list[0],starts_at:new Date(Date.now()+3600000).toISOString()}]:[],more:false}),space_habits:{ok:true,habits:[]}},functions:{'create-bunny-upload':{available:!storage},'bunny-video':authorize},tables:{profiles:[{pseudo:'synthetic'}]}});
 await result.pg.addInitScript(({slow,saveData})=>Object.defineProperty(navigator,'connection',{value:{downlink:slow?.8:12,effectiveType:slow?'3g':'4g',saveData},configurable:true}),{slow,saveData});
 // No second discovery request from a late geolocation result during timing samples.
 await result.pg.addInitScript(()=>{navigator.geolocation.getCurrentPosition=()=>{};});
 await result.pg.goto(origin+'/');await result.pg.waitForFunction(()=>window.__totehm_space?.().feed===20);await result.pg.waitForTimeout(120);
 return {...result,list};
}
const frame=(pg,k)=>pg.waitForFunction(k=>{const v=document.querySelector('.clip[data-k="'+k+'"] video');return v && !v.paused && v.currentTime>.04 && v.getVideoPlaybackQuality().totalVideoFrames>0;},k);
async function swipe(pg,k){const t=Date.now();await pg.$eval('#feed',(f,k)=>{f.scrollTop=f.querySelector('.clip').offsetHeight*k;},k);await frame(pg,k);return Date.now()-t;}
try{
 for(let sample=0;sample<3;sample++){
  const {pg,ctx,log}=await setup();check(!log.functions.some(f=>f.name==='bunny-video'),'no video authorization before entering the feed');
  const t=Date.now();await pg.click('#cur-g');await frame(pg,0);const cold=Date.now()-t;await pg.waitForTimeout(120);
  const warm=await swipe(pg,1);report.samples.push({cold_ms:cold,next_ms:warm});
  if(!baseline){
   check(warm<400,'prepared HLS successor starts within 400 ms in the controlled fixture');
   check(log.functions.some(f=>f.name==='bunny-video' && f.body.clips?.length===2),'active and next authorizations share one request');
   let hd=true;try{await pg.waitForFunction(()=>document.querySelector('.clip[data-k="1"] video').videoWidth>=720,{},{timeout:4000});}catch{hd=false;}
   report.samples.at(-1).quality=await pg.$eval('.clip[data-k="1"] video',v=>({width:v.videoWidth,start:v._startLevel,cap:v._hls?.autoLevelCapping,current:v._hls?.currentLevel,next:v._hls?.nextAutoLevel,bandwidth:v._hls?.bandwidthEstimate}));
   check(hd,'active HLS can upgrade to HD after its first image');
   await pg.waitForTimeout(200);await pg.click('#joy-box');await pg.waitForTimeout(80);
   check(await pg.$$eval('#feed video',vs=>vs.every(v=>v.paused)),'all videos pause outside the feed');
   const retained=await pg.$$eval('#feed video',vs=>vs.filter(v=>v.getAttribute('src') || v._hls).length);
   check(retained>0 && retained<=3,'a short radar visit retains only the small authorized playback window');
   const reads=log.functions.filter(f=>f.name==='bunny-video' && (f.body.id===uid(1) || f.body.clips?.some(c=>c.id===uid(1)))).length;
   const back=Date.now();await pg.click('#cur-g');await frame(pg,1);report.samples.at(-1).return_ms=Date.now()-back;
   check(log.functions.filter(f=>f.name==='bunny-video' && (f.body.id===uid(1) || f.body.clips?.some(c=>c.id===uid(1)))).length===reads,'returning to a ready clip needs no new signature request');
  }
  check(!log.errors.some(e=>e.startsWith('pageerror')),'HLS flow has no JavaScript page error');await ctx.close();
 }
 if(!baseline){
  const {pg,ctx,log}=await setup({storage:true});await pg.click('#cur-g');await frame(pg,0);await pg.waitForTimeout(120);report.storageNextMs=await swipe(pg,1);
  check(report.storageNextMs<400,'legacy MP4 successor has decoded frames before the swipe');
  await pg.$eval('#feed',f=>{f.scrollTop=f.querySelector('.clip').offsetHeight*18;});await frame(pg,18);await pg.waitForFunction(()=>window.__totehm_space().feed===21);
  check(await pg.$$eval('#feed video',vs=>vs.filter(v=>v.getAttribute('src') || v._hls).length)<=3,'fast skips and pagination never retain more than three clips');
  await pg.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  check(await pg.$$eval('#feed video',vs=>vs.every(v=>v.paused && !v.getAttribute('src') && !v._hls)),'background purges retained buffers');
  await pg.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await frame(pg,18);
  check(true,'foreground resumes the selected clip');await ctx.close();
  for(const config of [{saveData:true},{slow:true}]){
   const {pg,ctx,log}=await setup(config);await pg.click('#cur-g');await frame(pg,0);await pg.waitForTimeout(250);
   if(config.saveData)check(log.functions.filter(f=>f.name==='bunny-video').every(f=>f.body.clips?.length===1),'Save-Data never authorizes the next clip');
   else check(log.network.find(n=>n.kind==='cdn' && n.path.endsWith('.ts'))?.path.endsWith('/low00.ts'),'3G starts with the light rendition rather than forcing HD');
   check(!log.errors.some(e=>e.startsWith('pageerror')),'constrained network flow has no page error');await ctx.close();
  }
  {const {pg,ctx}=await setup({signing:600});await pg.click('#cur-g');await pg.waitForTimeout(50);await pg.click('#joy-box');await pg.waitForTimeout(1000);
  check(await pg.$$eval('#feed video',vs=>vs.every(v=>!v.getAttribute('src') && !v._hls)),'a late signature cannot attach after leaving an unprepared feed');await ctx.close();}
  {const {pg,ctx}=await setup();await pg.click('#cur-g');await frame(pg,0);await pg.clock.install();await pg.click('#joy-box');await pg.clock.fastForward(21000);
  check(await pg.$$eval('#feed video',vs=>vs.every(v=>v.paused && !v.getAttribute('src') && !v._hls)),'retained buffers expire after twenty seconds outside the feed');await ctx.close();}
  {const {pg,ctx,log}=await setup({expired:true});await pg.click('#cur-g');await frame(pg,0);await pg.clock.install();await pg.click('#joy-box');const reads=log.functions.filter(f=>f.name==='bunny-video').length;await pg.clock.fastForward(6000);await pg.click('#cur-g');await frame(pg,0);
  check(log.functions.filter(f=>f.name==='bunny-video').length>reads,'a near-expired retained signature is renewed before playback');await ctx.close();}
  {const {pg,ctx}=await setup({future:true});await pg.click('#cur-d');await pg.click('#list [data-watch]');await pg.waitForFunction(()=>document.querySelector('#list video')?.currentTime>.04);
  await pg.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  check(await pg.$eval('#list video',v=>v.paused && !v.getAttribute('src') && !v._hls),'background also releases the open agenda video');
  await pg.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await pg.waitForFunction(()=>document.querySelector('#list video')?.currentTime>.04 && !document.querySelector('#list video').paused);
  check(true,'foreground restores the agenda video after releasing it');await ctx.close();}
 }
 report.checks=checks;report.passed=!process.exitCode;report.medianNextMs=report.samples.map(s=>s.next_ms).sort((a,b)=>a-b)[1];
 fs.writeFileSync(path.join(out,'feed-latency-'+report.mode+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
