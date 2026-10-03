// Local Bunny TUS/HLS contract test, no real video or account touches Bunny.
// Run python tests/browser/space_video_fixtures.py first (camera + two HLS qualities).
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {launch,page,ok} from './harness.mjs';
const fixture=process.env.SPACE_HLS_FIXTURE || '/tmp/space-portrait-fixtures';
if(!fs.existsSync(fixture+'/playlist.m3u8')) throw new Error('Generate the local HLS fixture first (see backend/README.md).');
const origin='https://www.totehm.space',clip='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',guid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const publicSpot={id:'live',habit:'Run the hill',freq:'daily',intentions:['fight'],visibility:'shared',mode:null,location:'off',city:'Lisbon',starts_at:new Date(Date.now()-60000).toISOString(),ends_at:new Date(Date.now()+3600000).toISOString(),duration_min:60,creator:'nia',mine:false,video:null,clip:{id:clip,status:'ready'},exact:null};
const sourceMode=process.argv[2] || 'landscape',out='/tmp/space-portrait-qa';if(!['landscape','portrait'].includes(sourceMode)) throw new Error('Fixture mode invalid');fs.mkdirSync(out,{recursive:true});let reading=0,uploaded=0,patches=0;const buffers=[];
const functions={
 'create-bunny-upload':b=>b.action==='status'?{available:true}:{id:clip,endpoint:'https://video.bunnycdn.com/tusupload',headers:{AuthorizationSignature:'test-one-video-signature',AuthorizationExpire:'9999999999',VideoId:guid,LibraryId:'1'}},
 'bunny-video':b=>{if(b.action==='complete')return {status:'processing'};reading++;return {status:'ready',url:'https://test.b-cdn.net/bcdn_token=TEST&expires=9999999999&token_path=%2F'+guid+'%2F/'+guid+'/playlist.m3u8',expires:9999999999};}
};
const tusCORS={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST,PATCH,HEAD,OPTIONS','Access-Control-Expose-Headers':'Location,Upload-Offset,Tus-Resumable'};
const network=async(url,req,log)=>{
 if(url.hostname==='video.bunnycdn.com'){
  log.network.push({host:url.hostname,method:req.method(),headers:req.headers(),at:Date.now()});
  if(req.method()==='POST')return {status:201,headers:{...tusCORS,Location:'https://video.bunnycdn.com/tusupload/resource'}};
  if(req.method()==='PATCH'){const body=req.postDataBuffer();if(body)buffers.push(body);uploaded+=body?.length || 0;patches++;return {status:204,headers:{...tusCORS,'Upload-Offset':String(uploaded)}};}
  return {status:204,headers:{...tusCORS,'Upload-Offset':String(uploaded)}};
 }
 if(url.hostname==='test.b-cdn.net'){
  log.network.push({host:url.hostname,path:url.pathname});const filename=path.basename(url.pathname),file=path.join(fixture,filename);
  if(!fs.existsSync(file))return {status:404,body:''};return {status:200,contentType:filename.endsWith('.m3u8')?'application/vnd.apple.mpegurl':'video/mp2t',body:fs.readFileSync(file)};
 }
};
const rpc={spot_rules:{clip_seconds:2,countdown:1,clip_max_bytes:48000000,duration_min:5,duration_max:720,video_provider:'storage'},space_habits:{ok:true,habits:[{name:'Run the hill',freq:'daily',ints:['fight'],objectives:[],repulsions:[]}]},space_discover:b=>({spots:b.p_view==='feed'?[publicSpot]:[],match:'all',more:false}),spot_create:b=>({ok:true,id:'new'}),spot_get:{ok:true,spot:{...publicSpot,id:'new',mine:true}}};
const browser=await launch({videoFile:path.join(fixture,sourceMode+'.y4m')});
try{
 const {pg,log}=await page(browser,{dir:'space',origin,rpc,functions,network,tables:{profiles:[{pseudo:'wah'}]},viewport:{width:390,height:844},hasTouch:true});
 await pg.addInitScript(slow=>Object.defineProperty(navigator,'connection',{value:{downlink:slow ? 0.8 : 12,effectiveType:slow?'3g':'4g',saveData:false},configurable:true}),process.argv[3]==='slow');
 if(process.argv[3]==='native') await pg.addInitScript(()=>{window.MediaSource=undefined;window.ManagedMediaSource=undefined;window.WebKitMediaSource=undefined;});
 await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_space?.().signed_in);await pg.waitForTimeout(700);
 ok(reading===0,'no Bunny playback request before the video view is visible');
 await pg.click('#cur-g');await pg.waitForFunction(()=>{const v=document.querySelector('#feed video');return v?.videoWidth>0;});
 const dimensions=await pg.$eval('#feed video',v=>({w:v.videoWidth,h:v.videoHeight}));ok(['native','slow'].includes(process.argv[3])?dimensions.w>=270:dimensions.w>=720 && dimensions.h>=1280,'signed HLS adapts to the connection and preserves HD on a fast connection');
 if(process.argv[3]==='slow')ok(log.network.filter(x=>x.host==='test.b-cdn.net' && x.path.endsWith('.ts'))[0]?.path.endsWith('/low00.ts'),'slow connection does not force the 8 Mbps rendition');
 const stage=()=>pg.$eval('#feed .portrait-media',e=>{const r=e.getBoundingClientRect();return r.width/r.height;});
 ok(Math.abs(await stage()-9/16)<.001,'mobile playback frame is 9:16');
 await pg.setViewportSize({width:1440,height:900});await pg.waitForTimeout(300);ok(Math.abs(await stage()-9/16)<.001,'desktop feed keeps its vertical frame');
 await pg.setViewportSize({width:390,height:844});await pg.waitForTimeout(300);
 ok(log.network.filter(x=>x.host==='test.b-cdn.net').every(x=>x.path.includes('bcdn_token=')),'HLS playlist and segments retain the signed directory prefix');
 await pg.click('#joy-box');await pg.waitForTimeout(550);await pg.click('#cur-b');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='idle');await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='ready');await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='rec');
 await pg.waitForTimeout(220);
 const filming=await pg.evaluate(()=>window.__totehm_space().rec);ok(filming.width===1080 && filming.height===1920 && filming.bitrate>=10000000,'capture targets Full HD 9:16 at a high bitrate');
 await pg.setViewportSize({width:1440,height:900});await pg.waitForTimeout(100);ok(Math.abs(await pg.$eval('#v-cam',e=>{const r=e.getBoundingClientRect();return r.width/r.height;})-9/16)<.001,'desktop camera panel is vertical');
 ok(await pg.$eval('#joy-record',e=>getComputedStyle(e).borderRadius)==='3px','recording uses the red square in the joystick');
 await pg.waitForFunction(()=>['habit','retry','heavy','nocam'].includes(window.__totehm_space().rec.step));
 if((await pg.evaluate(()=>window.__totehm_space().rec.step))!=='habit')throw new Error(JSON.stringify({rec:await pg.evaluate(()=>window.__totehm_space().rec),errors:log.errors}));
 await pg.click('[data-h="0"]');await pg.click('[data-vis="private"]');await pg.click('[data-dur="30"]');
 await pg.evaluate(()=>{const locate=navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);navigator.geolocation.getCurrentPosition=(ok,fail,options)=>locate(pos=>setTimeout(()=>ok(pos),1000),fail,options);});
 const publishStart=Date.now();await pg.click('[data-send]');
 try{await pg.waitForFunction(()=>window.__totehm_space().view==='radar');}catch(e){console.error(JSON.stringify({diagnostic:await pg.evaluate(()=>window.__totehm_space()),errors:log.errors,functions:log.functions,upload:{uploaded,patches}}));throw e;}
 ok(log.network.find(x=>x.host==='video.bunnycdn.com' && x.method==='POST')?.at<publishStart+950,'upload starts while geolocation is still pending');
 const begin=log.functions.find(x=>x.name==='create-bunny-upload' && x.body.bytes);ok(begin.body.bytes>0 && begin.body.seconds<=33,'Bunny upload reserves a bounded captured clip');
 ok(patches>0 && uploaded===begin.body.bytes,'camera binary goes directly to Bunny via TUS');
 const captured=path.join(out,'recorded-'+sourceMode+'.webm');fs.writeFileSync(captured,Buffer.concat(buffers));
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',captured],{encoding:'utf8'}));const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
 ok(video?.width===1080 && video?.height===1920,'uploaded file itself is 1080 × 1920 from '+sourceMode+' camera');ok(!!audio,'uploaded portrait video keeps its audio');
 const rgb=execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-ss','0.2','-i',captured,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:16*1024*1024});
 const w=video.width,h=video.height,pixel=(x,y)=>rgb.subarray((y*w+x)*3,(y*w+x)*3+3);let minX=w,maxX=0,minY=h,maxY=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=pixel(x,y);if(p[0]>230 && p[1]>230 && p[2]>230){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
 const square=(maxX-minX+1)/(maxY-minY+1),corner=pixel(Math.floor(w*.1),Math.floor(h*.1));ok(minX<maxX && Math.abs(square-1)<.04,'portrait crop preserves the square without stretching');ok(corner[1]>150 && corner[0]<80 && corner[2]<80,'recorded frame is filled by the central camera image');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss','0.2','-i',captured,'-frames:v','1',path.join(out,'recorded-'+sourceMode+'.png')]);fs.writeFileSync(path.join(out,'probe-'+sourceMode+'.json'),JSON.stringify({video,audio,capturedBytes:uploaded,requestedBitrate:filming.bitrate,squareAspect:square},null,2));
 ok(log.upload.length===0,'Bunny binary never goes through Supabase Storage');
 const create=log.rpc.find(x=>x.name==='spot_create');ok(create.body.p_video==='bunny:'+clip && create.body.p_visibility==='private' && create.body.p_mode===null && create.body.p_location===null,'private Spot references its owned Bunny clip');
 ok(!JSON.stringify(log.network).includes('BUNNY_API_KEY'),'no library API key reaches the browser');
 ok(log.errors.filter(x=>x.startsWith('pageerror')).length===0,'Bunny contract has no JavaScript page error');
}finally{await browser.close();}
