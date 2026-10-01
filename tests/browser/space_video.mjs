// Local Bunny TUS/HLS contract test, no real video or account touches Bunny.
// Create /tmp/space-hls-fixture/playlist.m3u8 with ffmpeg (1080×1920 H.264, 2 s).
import fs from 'node:fs';import path from 'node:path';import {launch,page,ok} from './harness.mjs';
const fixture=process.env.SPACE_HLS_FIXTURE || '/tmp/space-hls-fixture';
if(!fs.existsSync(fixture+'/playlist.m3u8')) throw new Error('Generate the local HLS fixture first (see backend/README.md).');
const origin='https://www.totehm.space',clip='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',guid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const publicSpot={id:'live',habit:'Run the hill',freq:'daily',intentions:['fight'],visibility:'shared',mode:null,location:'off',city:'Lisbon',starts_at:new Date(Date.now()-60000).toISOString(),ends_at:new Date(Date.now()+3600000).toISOString(),duration_min:60,creator:'nia',mine:false,video:null,clip:{id:clip,status:'ready'},exact:null};
let uploaded=0,patches=0,reading=0;
const functions={
 'create-bunny-upload':b=>b.action==='status'?{available:true}:{id:clip,endpoint:'https://video.bunnycdn.com/tusupload',headers:{AuthorizationSignature:'test-one-video-signature',AuthorizationExpire:'9999999999',VideoId:guid,LibraryId:'1'}},
 'bunny-video':b=>{if(b.action==='complete')return {status:'processing'};reading++;return {status:'ready',url:'https://test.b-cdn.net/bcdn_token=TEST&expires=9999999999&token_path=%2F'+guid+'%2F/'+guid+'/playlist.m3u8',expires:9999999999};}
};
const network=async(url,req,log)=>{
 if(url.hostname==='video.bunnycdn.com'){
  log.network.push({host:url.hostname,method:req.method(),headers:req.headers()});
  if(req.method()==='POST')return {status:201,headers:{Location:'https://video.bunnycdn.com/tusupload/resource'}};
  if(req.method()==='PATCH'){uploaded+=req.postDataBuffer()?.length || 0;patches++;return {status:204,headers:{'Upload-Offset':String(uploaded)}};}
  return {status:204,headers:{'Upload-Offset':String(uploaded)}};
 }
 if(url.hostname==='test.b-cdn.net'){
  log.network.push({host:url.hostname,path:url.pathname});const filename=path.basename(url.pathname),file=path.join(fixture,filename);
  if(!fs.existsSync(file))return {status:404,body:''};return {status:200,contentType:filename.endsWith('.m3u8')?'application/vnd.apple.mpegurl':'video/mp2t',body:fs.readFileSync(file)};
 }
};
const rpc={spot_rules:{clip_seconds:2,countdown:1,clip_max_bytes:33554432,duration_min:5,duration_max:720,video_provider:'storage'},space_habits:{ok:true,habits:[{name:'Run the hill',freq:'daily',ints:['fight'],objectives:[],repulsions:[]}]},space_discover:b=>({spots:b.p_view==='feed'?[publicSpot]:[],match:'all',more:false}),spot_create:b=>({ok:true,id:'new'}),spot_get:{ok:true,spot:{...publicSpot,id:'new',mine:true}}};
const browser=await launch();
try{
 const {pg,log}=await page(browser,{dir:'space',origin,rpc,functions,network,tables:{profiles:[{pseudo:'wah'}]},viewport:{width:390,height:844},hasTouch:true});
 await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_space?.().signed_in);await pg.waitForTimeout(700);
 ok(reading===0,'no Bunny playback request before the video view is visible');
 await pg.click('#cur-g');await pg.waitForFunction(()=>{const v=document.querySelector('#feed video');return v?.videoWidth>0;});
 const dimensions=await pg.$eval('#feed video',v=>({w:v.videoWidth,h:v.videoHeight}));ok(dimensions.w===1080 && dimensions.h===1920,'signed HLS plays the original portrait HD resolution');
 ok(log.network.filter(x=>x.host==='test.b-cdn.net').every(x=>x.path.includes('bcdn_token=')),'HLS playlist and segments retain the signed directory prefix');
 await pg.click('#joy-box');await pg.waitForTimeout(550);await pg.click('#cur-b');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='rec');
 await pg.waitForTimeout(220);
 ok(await pg.$eval('#joy-record',e=>getComputedStyle(e).borderRadius)==='3px','recording uses the red square in the joystick');
 await pg.waitForFunction(()=>window.__totehm_space().rec.step==='habit');await pg.click('[data-h="0"]');await pg.click('[data-vis="private"]');await pg.click('[data-dur="30"]');await pg.click('[data-send]');await pg.waitForFunction(()=>window.__totehm_space().view==='radar');
 const begin=log.functions.find(x=>x.name==='create-bunny-upload' && x.body.bytes);ok(begin.body.bytes>0 && begin.body.seconds<=33,'Bunny upload reserves a bounded captured clip');
 ok(patches>0 && uploaded===begin.body.bytes,'camera binary goes directly to Bunny via TUS');
 ok(log.upload.length===0,'Bunny binary never goes through Supabase Storage');
 const create=log.rpc.find(x=>x.name==='spot_create');ok(create.body.p_video==='bunny:'+clip && create.body.p_visibility==='private' && create.body.p_mode===null && create.body.p_location===null,'private Spot references its owned Bunny clip');
 ok(!JSON.stringify(log.network).includes('BUNNY_API_KEY'),'no library API key reaches the browser');
 ok(log.errors.filter(x=>x.startsWith('pageerror')).length===0,'Bunny contract has no JavaScript page error');
}finally{await browser.close();}
