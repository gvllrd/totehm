// A Space sign launches only its authored clip. Services and video are local.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {launch,page} from './harness.mjs';

const OUT=process.argv[2]||'/tmp/lisbon-sign-launch',origin='https://www.totehm.space';
fs.mkdirSync(OUT,{recursive:true});
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=96x96:rate=12','-t','2','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart',OUT+'/clip.mp4']);
const media=fs.readFileSync(OUT+'/clip.mp4');
const ids=['fire_exit','Heli','aed','green_walk','red_walk','pharma','destination','lisboa_city_hall','speed_bump_caution','crosswalk_caution','no_entry','no_parking','hospital','parking','Hotel','dead_end','roundabout','left_or_straight','no_uturn','priority','crosswalk','stop'];
let checks=0;const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const browser=await launch();
async function fixture({owned=false,artwork=null,viewport={width:1440,height:1000}}={}){
 const calls=[];
 const value=await page(browser,{dir:'space',origin,viewport,session:owned,tables:{artworks:artwork?[artwork]:[]},functions:{'stoner-gate':{access:owned},'higher-checkout':{amount:1700,currency:'eur'}},network:url=>{
  if(url.pathname.startsWith('/storage/v1/object/public/play-signals/')){calls.push(url.pathname);return{status:200,contentType:'video/mp4',body:media};}
  if(['/lisbon-space','/get_higher','/stoner','/market'].includes(url.pathname))return{contentType:'text/html',body:'<!doctype html><title>Destination</title>'};
  return null;
 }});
 await value.pg.emulateMedia({reducedMotion:'reduce'});
 return{...value,calls};
}
async function openSign(pg,id,extra=''){
 await pg.goto(origin+'/play_lisbon_street?sign='+encodeURIComponent(id)+'&play=1&from=space'+extra,{waitUntil:'domcontentloaded'});
 await pg.waitForFunction(id=>window.__totehm_lisbon?.().activeSign===id&&__totehm_lisbon().playAttempted,id,{timeout:20000});
 await pg.waitForFunction(()=>document.getElementById('vid').readyState>=2,null,{timeout:10000});
}
try{
 const visitor=await fixture();
 try{
  for(const id of ids){
   await openSign(visitor.pg,id);
   const state=await visitor.pg.evaluate(()=>({d:__totehm_lisbon(),src:document.getElementById('vid').src,paused:document.getElementById('vid').paused,controls:document.getElementById('vid').controls}));
   check(state.src.endsWith('/play-signals/'+id+'.mp4')&&state.d.artwork&&state.d.directSign===id,'The '+id+' Space link selects its exact original animation');
   check(state.d.videoMuted&&state.controls&&!state.paused&&!state.d.playbackBlocked,'The '+id+' animation starts immediately with accessible audio controls');
   check(await visitor.pg.locator('#xp-get-higher').getAttribute('href')==='/get_higher'&&await visitor.pg.locator('#xp-get-higher').getAttribute('aria-label')==='Get Higher to get it'&&await visitor.pg.locator('#xp-get-higher use[href="#higher-slogan"]').count()===1,'The '+id+' teaser retains the branded Totehmpaper invitation');
  }
  check((await visitor.pg.locator('.xp-teaser p').textContent()).includes('Totehmpaper')&&(await visitor.pg.locator('.xp-teaser p').textContent()).includes('Stoner'),'The teaser states how Totehmpaper and Stoner provide its key');
  await visitor.pg.evaluate(()=>document.getElementById('vid').dispatchEvent(new Event('ended')));
  check(await visitor.pg.evaluate(()=>__totehm_lisbon().artwork),'Finishing a direct animation keeps the Totehmpaper invitation available');
  await visitor.pg.click('#xp-close');await visitor.pg.waitForURL(origin+'/lisbon-space');
  check(new URL(visitor.pg.url()).pathname==='/lisbon-space','Back from a Space animation returns directly to Lisbon');
  for(const id of ['__proto__','../stop','https://evil.test/clip','STOP']){
   const before=visitor.calls.length;
   await visitor.pg.goto(origin+'/play_lisbon_street?sign='+encodeURIComponent(id)+'&play=1&from=space');
   await visitor.pg.waitForFunction(()=>typeof window.__totehm_lisbon==='function');
   check(await visitor.pg.evaluate(()=>__totehm_lisbon().directSign===null&&!__totehm_lisbon().artwork&&!document.getElementById('vid').getAttribute('src'))&&visitor.calls.length===before,'An invalid '+id+' ID cannot select a clip or enter an experience');
  }
  await visitor.pg.goto(origin+'/play_lisbon_street?sign=stop&play=0&from=space');
  await visitor.pg.waitForFunction(()=>typeof window.__totehm_lisbon==='function');
  check(await visitor.pg.evaluate(()=>!__totehm_lisbon().artwork),'A sign query without the explicit play gesture keeps the normal story');
  await openSign(visitor.pg,'stop','&return=https%3A%2F%2Fevil.test');
  await visitor.pg.click('#xp-get-higher');await visitor.pg.waitForURL(origin+'/get_higher');
  check(new URL(visitor.pg.url()).pathname==='/get_higher','The visitor invitation opens the canonical Totehmpaper page');
  check(!visitor.log.functions.some(call=>call.name==='higher-checkout'&&!call.body.quote),'Teaser inspection never starts a checkout');
  check(!visitor.log.errors.some(error=>error.startsWith('pageerror:')),'The 22 direct animations have no application errors');
 }finally{await visitor.ctx.close();}
 const owner=await fixture({owned:true,viewport:{width:390,height:844}});
 try{
  await openSign(owner.pg,'pharma');
  await owner.pg.waitForFunction(()=>__totehm_lisbon().teaserHref==='/stoner');
  check(await owner.pg.locator('#xp-buy').getAttribute('data-mode')==='owned','An entitled owner retains the existing gated method fallback');
  check(await owner.pg.locator('#xp-get-higher').getAttribute('href')==='/stoner','The permanent invitation uses the server-authorized Stoner destination for an owner');
  check(await owner.pg.locator('#xp-get-higher').isVisible(),'The complete invitation remains visible on a phone');
  await owner.pg.waitForFunction(()=>getComputedStyle(document.getElementById('xp-label')).opacity==='1');
  await owner.pg.screenshot({path:OUT+'/phone-teaser.png'});
  await owner.pg.click('#xp-get-higher');await owner.pg.waitForURL(origin+'/stoner');
  check(new URL(owner.pg.url()).pathname==='/stoner','The owner invitation opens Stoner without changing its access control');
 }finally{await owner.ctx.close();}
 const artwork={id:'22222222-2222-4222-8222-222222222222',slug:'stop-original',title:'Stop Original',price_cents:12000,currency:'eur',edition_total:8,edition_sold:2,status:'available',video_key:'stop'};
 const sale=await fixture({artwork});
 try{
  await openSign(sale.pg,'stop');
  await sale.pg.waitForFunction(()=>document.getElementById('xp-buy').dataset.artworkId);
  check((await sale.pg.locator('#xp-buy').innerText()).trim()==='Acquire →'&&(await sale.pg.locator('#xp-artw-price').innerText()).trim()==='€120','Artwork acquisition and server pricing remain separate from the Totehmpaper invitation');
  await sale.pg.click('#xp-buy');await sale.pg.waitForURL(origin+'/market?art=stop-original');
  check(new URL(sale.pg.url()).searchParams.get('art')==='stop-original','The artwork acquisition destination is preserved');
 }finally{await sale.ctx.close();}
 const blocked=await fixture();
 try{
  await blocked.ctx.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('Blocked by browser','NotAllowedError'));};});
  await openSign(blocked.pg,'aed');
  await blocked.pg.waitForFunction(()=>__totehm_lisbon().playbackBlocked);
  check(await blocked.pg.locator('#vid').evaluate(video=>video.controls),'A browser refusing autoplay exposes native playback controls');
 }finally{await blocked.ctx.close();}
 fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,ids},null,2));
 console.log('PASS '+checks+' direct Lisbon sign animation checks');
}finally{await browser.close();}
