// Motion + delayed media + pagination: local performance evidence, no real account.
// These desktop software-encoder numbers are not phone/network benchmarks.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {launch,page,ok} from './harness.mjs';
const baseline=process.argv.includes('baseline'),origin='https://www.totehm.space',fixture='/tmp/space-portrait-fixtures',out='/tmp/space-fluidity-qa';fs.mkdirSync(out,{recursive:true});
const source=baseline?'/tmp/space-fluidity-baseline/space':new URL('../../space',import.meta.url).pathname;
const rows=Array.from({length:21},(_,i)=>({id:'spot-'+i,habit:'Walk',freq:'daily',intentions:['love'],visibility:'shared',location:'off',city:'Lisbon',starts_at:new Date(Date.now()-i*60000).toISOString(),ends_at:new Date(Date.now()+3600000).toISOString(),duration_min:60,creator:'nia',mine:false,exact:null,video:'11111111-1111-4111-8111-111111111111/'+i+'.mp4'}));
let captured=null;const report={mode:baseline?'before':'after',network:'local fixture: signing 600 ms; first media response 150 ms'};
const video=fs.readFileSync(fixture+'/playback.mp4');
const network=async(url,req,log)=>{
 if(url.origin===origin && ['/', '/index.html','/video-capture.mjs'].includes(url.pathname))return {status:200,contentType:url.pathname.endsWith('.mjs')?'text/javascript':'text/html',body:fs.readFileSync(path.join(source,url.pathname.endsWith('.mjs')?'video-capture.mjs':'index.html'))};
 if(url.pathname==='/__capture'){captured=req.postDataBuffer();return {status:200,body:'ok'};}
 if(url.hostname==='test.b-cdn.net'){const f=path.join(fixture,path.basename(url.pathname));return {status:200,contentType:f.endsWith('.m3u8')?'application/vnd.apple.mpegurl':'video/mp2t',body:fs.readFileSync(f)};}
 if(url.pathname.startsWith('/storage/v1/object/sign/') && req.method()==='POST'){log.signed=(log.signed||0)+1;log.network.push({kind:'sign',at:Date.now(),path:url.pathname});await new Promise(r=>setTimeout(r,600));return {status:200,contentType:'application/json',body:JSON.stringify({signedURL:'/object/sign/'+url.pathname.slice(24)+'?token=t'})};}
 if(url.pathname.startsWith('/storage/v1/object/sign/') && req.method()==='GET'){
  log.network.push({kind:'media',at:Date.now(),path:url.pathname});await new Promise(r=>setTimeout(r,150));
  const range=req.headers().range?.match(/bytes=(\d+)-(\d*)/),start=Number(range?.[1]||0),end=Math.min(video.length-1,range?.[2]?Number(range[2]):video.length-1);
  return {status:range?206:200,contentType:'video/mp4',headers:{'Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${end}/${video.length}`}:{})},body:video.subarray(start,end+1)};
 }
};
const browser=await launch({videoFile:fixture+'/motion.y4m'});
try{
 const {pg,ctx,log}=await page(browser,{dir:'space',origin,network,viewport:{width:1440,height:900},rpc:{spot_rules:{video_provider:'storage'},space_discover:b=>({spots:b.p_view==='feed'?(b.p_before?rows.slice(20):rows.slice(0,20)):[],more:false}),space_habits:{ok:true,habits:[]}},functions:{'create-bunny-upload':{available:false}},tables:{profiles:[{pseudo:'wah'}]}});
 await pg.addInitScript(()=>{const locate=navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);navigator.geolocation.getCurrentPosition=(ok,fail,options)=>locate(pos=>{window.__geolocationComplete=()=>ok(pos);},fail,options);});
 await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_space?.().signed_in);await pg.waitForTimeout(900);
 report.compassMutations=await pg.evaluate(()=>new Promise(resolve=>{let n=0;const observer=new MutationObserver(ms=>n+=ms.length);observer.observe(document.querySelector('#cmp'),{childList:true,subtree:true});setTimeout(()=>{observer.disconnect();resolve(n);},1100);}));
 if(!baseline)ok(report.compassMutations===0,'idle compass performs no DOM mutations');
 await pg.click('#cur-g');const cold=Date.now();await pg.waitForFunction(()=>document.querySelector('#feed video')?.currentTime>.04);report.coldFirstFrameMs=Date.now()-cold;
 await pg.evaluate(()=>{window.__firstVideo=document.querySelector('#feed video');window.__geolocationComplete?.();});await pg.waitForTimeout(1400);report.refreshPreservesVideo=await pg.evaluate(()=>window.__firstVideo===document.querySelector('#feed video'));
 if(!baseline)ok(report.refreshPreservesVideo,'late geolocation refresh preserves the active video');report.nextPrepared=log.network.some(x=>x.kind==='media'&&x.path.includes('/1.mp4'));
 if(!baseline)ok(report.nextPrepared,'next video is prepared before the swipe');
 const warm=Date.now();await pg.$eval('#feed',e=>e.scrollTop=e.querySelector('.clip').offsetHeight);await pg.waitForFunction(()=>document.querySelectorAll('#feed video')[1]?.currentTime>.04);report.nextFirstFrameMs=Date.now()-warm;
 if(!baseline)ok(report.nextFirstFrameMs<report.coldFirstFrameMs,'prepared next video starts faster than the cold first video');
 await pg.waitForTimeout(500);report.buffered=await pg.$$eval('#feed video',vs=>vs.filter(v=>v.getAttribute('src')||v._hls).length);
 if(!baseline)ok(report.buffered<=3,'only current, previous and next videos retain media');
 await pg.evaluate(()=>window.__paginationVideo=document.querySelectorAll('#feed video')[18]);await pg.$eval('#feed',e=>e.scrollTop=e.querySelector('.clip').offsetHeight*18);
 await pg.waitForFunction(()=>window.__totehm_space().feed===21);await pg.waitForTimeout(400);report.paginationPreservesVideo=await pg.evaluate(()=>window.__paginationVideo===document.querySelectorAll('#feed video')[18]);
 if(!baseline)ok(report.paginationPreservesVideo,'pagination preserves the active video and its buffer');
 await pg.click('#joy-box');await pg.waitForTimeout(300);report.outsideFeed=await pg.$$eval('#feed video',vs=>({paused:vs.every(v=>v.paused),retained:vs.filter(v=>v.getAttribute('src')||v._hls).length}));
 if(!baseline)ok(report.outsideFeed.paused&&report.outsideFeed.retained<=3,'leaving the feed pauses playback and retains at most three prepared videos');
 if(!baseline){
  await pg.$eval('#feed',e=>e.scrollTop=e.querySelector('.clip').offsetHeight*7);
  await pg.click('#cur-g');await pg.waitForTimeout(80);await pg.click('#joy-box');await pg.waitForTimeout(850);
  ok(await pg.$$eval('#feed video',vs=>vs.every(v=>!v.getAttribute('src')&&!v._hls)),'late authorization cannot attach media after leaving the feed');
  await pg.evaluate(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true,effectiveType:'4g',downlink:12},configurable:true}));
  await pg.click('#cur-g');await pg.waitForFunction(()=>[...document.querySelectorAll('#feed video')].some(v=>!v.paused&&v.currentTime>.04));await pg.waitForTimeout(500);
  ok(await pg.$$eval('#feed video',vs=>vs.filter(v=>v.getAttribute('src')||v._hls).length)===1,'Save-Data keeps only the visible video loaded');
  await pg.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  ok(await pg.$$eval('#feed video',vs=>vs.every(v=>v.paused&&!v.getAttribute('src')&&!v._hls)),'background visibility event releases playback');
  await pg.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  await pg.waitForFunction(()=>[...document.querySelectorAll('#feed video')].some(v=>!v.paused&&v.currentTime>.04));
  ok(true,'foreground visibility event resumes the current video');await pg.click('#joy-box');
 }
 await pg.screenshot({path:out+'/radar-'+report.mode+'.png'});
 // Record actual motion with the same code the application uses, isolated from feed.
 await pg.evaluate(async(origin)=>{
  const m=await import('/video-capture.mjs'),source=await navigator.mediaDevices.getUserMedia(m.cameraConstraints()),v=document.createElement('video');v.muted=true;v.srcObject=source;document.body.append(v);await v.play();
  const c=await m.portraitCapture(v,source),mime=m.recordingMime?await m.recordingMime(c):['video/mp4;codecs=avc1,mp4a','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
  const chunks=[],r=new MediaRecorder(c.stream,{mimeType:mime,videoBitsPerSecond:m.VIDEO.bitrate,audioBitsPerSecond:m.VIDEO.audioBitrate});r.ondataavailable=e=>chunks.push(e.data);
  const done=new Promise(resolve=>r.onstop=resolve);r.onstart=()=>setTimeout(()=>r.stop(),4000);r.start(250);await done;
  await fetch(origin+'/__capture',{method:'POST',body:new Blob(chunks,{type:r.mimeType})});window.__captureEvidence={path:c.path||'crop',width:c.width,height:c.height,mime:r.mimeType,requestedFps:c.fps};c.stop();source.getTracks().forEach(t=>t.stop());v.remove();
 },origin);
 const f=out+'/motion-'+report.mode+'.webm';fs.writeFileSync(f,captured);
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',f],{encoding:'utf8'}));
 const stream=probe.streams.find(s=>s.codec_type==='video'),packets=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_packets','-show_entries','packet=pts_time,duration_time','-of','json',f],{encoding:'utf8'})).packets;
 const seconds=Number(packets.at(-1).pts_time)-Number(packets[0].pts_time)+Number(packets.at(-1).duration_time || 1/30);
 report.capture={...await pg.evaluate(()=>window.__captureEvidence),frames:Number(stream.nb_read_frames),seconds,actualFps:Number(stream.nb_read_frames)/seconds};
 if(!baseline){ok(report.capture.path==='native'&&report.capture.width===1080&&report.capture.height===1920,'native portrait capture skips canvas while preserving Full HD');ok(report.capture.frames>=80,'moving fixture produces at least 20 actual encoded frames per second');ok(log.errors.filter(e=>e.startsWith('pageerror')).length===0,'performance flow has no JavaScript error');}
 await ctx.close();
 if(!baseline){
  await browser.close();const retryBrowser=await launch();try{
  let reads=0;const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',guid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const pending=await page(retryBrowser,{dir:'space',origin,network,rpc:{spot_rules:{video_provider:'bunny'},space_discover:b=>({spots:b.p_view==='feed'?[{...rows[0],video:null,clip:{id,status:'processing'}}]:[]})},tables:{profiles:[{pseudo:'wah'}]},functions:{'create-bunny-upload':{available:true},'bunny-video':()=>++reads===1?{status:'processing'}:{status:'ready',url:'https://test.b-cdn.net/bcdn_token=TEST&expires=9999999999&token_path=%2F'+guid+'%2F/'+guid+'/playlist.m3u8',expires:9999999999}}});
  await pending.pg.goto(origin+'/');await pending.pg.waitForFunction(()=>window.__totehm_space?.().signed_in);await pending.pg.waitForTimeout(300);await pending.pg.click('#cur-g');const start=Date.now();
  await pending.pg.waitForFunction(()=>document.querySelector('#feed video')?.currentTime>.04,null,{timeout:3000});report.processingReadyMs=Date.now()-start;
  ok(reads===2 && report.processingReadyMs<3000,'finished encoding is picked up promptly without the old five-second wait');
  ok(pending.log.errors.filter(e=>e.startsWith('pageerror')).length===0,'processing retry has no JavaScript error');await pending.ctx.close();
  }finally{await retryBrowser.close();}
 }
 fs.writeFileSync(out+'/'+report.mode+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
