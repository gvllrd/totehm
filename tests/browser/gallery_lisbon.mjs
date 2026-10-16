// Focused 16/10 Lisbon revision. Real WebGL, original sign images/controller;
// identity, artwork data, payment quotes and video are intercepted locally.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {launch,page} from './harness.mjs';

const OUT=process.argv[2]||'/tmp/totehm-production/lisbon-20261016';
fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',results=[];
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=96x96:rate=12','-t','8','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart',OUT+'/sign.mp4']);
const media=fs.readFileSync(OUT+'/sign.mp4');
const baseline=fs.readFileSync(new URL('../../boutique/play_lisbon_street.html',import.meta.url),'utf8');
const controller=Function('return ('+baseline.match(/const SIGNS = (\{[\s\S]*?\n\});/)[1]+')')();
const artwork={id:'22222222-2222-4222-8222-222222222222',slug:'fire-exit-test',title:'Fire Exit',price_cents:12000,currency:'eur',edition_total:8,edition_sold:2,status:'available',video_key:'fire_exit'};
const browser=await launch();let checks=0;
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const diag=pg=>pg.evaluate(()=>window.__totehm_lisbon());
const previewPixels=pg=>pg.locator('#lisbon .artwork canvas').evaluate(c=>{
 const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 let hash=2166136261;for(let i=0;i<data.length;i+=4){hash=Math.imul(hash^data[i],16777619);hash=Math.imul(hash^data[i+1],16777619);hash=Math.imul(hash^data[i+2],16777619);}
 return hash>>>0;
});
const network=url=>url.pathname.startsWith('/storage/v1/object/public/')?{status:200,contentType:'video/mp4',body:media}:null;
async function visibility(pg,hidden){
 await pg.evaluate(h=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>h});document.dispatchEvent(new Event('visibilitychange'));},hidden);
}
async function snap(pg){
 await pg.locator('.disc-block.active .btn-sig').click();
 await pg.waitForFunction(()=>window.__totehm_lisbon().board&&!window.__totehm_lisbon().snapping);
}
async function clickRock(pg,id){
 await pg.locator('#sdisc-bg img[src$="/'+id+'.png"]').locator('..').click();
 await pg.waitForFunction(()=>window.__totehm_lisbon().artwork);
 await pg.waitForFunction(()=>document.querySelector('#vid').readyState>=2);
}
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const evidence={viewport};
  if(!process.env.LISBON_EXPERIENCE_ONLY){
  const f=await page(browser,{dir:'space',origin,session:false,viewport,hasTouch:viewport.width<650,network});
  try{
   await f.pg.goto(origin+'/');
   await f.pg.waitForFunction(()=>window.__totehm_gallery?.().frames>0,null,{timeout:25000});
   await f.pg.click('.tour [data-room="2"]');
   await f.pg.waitForFunction(()=>window.__totehm_gallery().room===2&&!window.__totehm_gallery().moving);
   check(await f.pg.locator('#work-title use[href="#higher-slogan"]').count()===1&&(await f.pg.locator('#work-title').innerText()).includes('the Lisbon Streets'),'selected artwork uses authentic Higher the Lisbon Streets title at '+viewport.width);
   check((await f.pg.locator('.tour [data-room="2"] .label').textContent()).trim()==='Neuro Street Art Digital','tour identifies the renamed station at '+viewport.width);
   const links=await f.pg.locator('#work-links a').evaluateAll(els=>els.map(e=>({label:e.textContent.trim(),href:e.getAttribute('href')})));
   check(links.length===1&&links[0].label==='PLAY'&&links[0].href==='/play_lisbon_street','Lisbon has one canonical PLAY action at '+viewport.width);
   check(await f.pg.locator('#lisbon .room-actions a').count()===1&&await f.pg.locator('#lisbon a[href="/play_lisbon_street"]').count()===2&&!await f.pg.locator('#lisbon a[href*="discover"]').count(),'HTML artwork and its sole PLAY action share the canonical entrance at '+viewport.width);
   // Preview diagnostics are render-state counters, not a second page or iframe.
   await f.pg.waitForFunction(()=>window.__totehm_gallery().lisbon?.loaded===22);
   evidence.previewStart=await f.pg.evaluate(()=>__totehm_gallery().lisbon);
   evidence.previewPixelsStart=await previewPixels(f.pg);
   await f.pg.waitForTimeout(650);
   evidence.previewEnd=await f.pg.evaluate(()=>__totehm_gallery().lisbon);
   evidence.previewPixelsEnd=await previewPixels(f.pg);
   check(evidence.previewEnd.signs===22&&evidence.previewEnd.loaded===22&&evidence.previewEnd.animated&&evidence.previewEnd.time>evidence.previewStart.time,'all original sign previews float on the actual 3D wall at '+viewport.width);
   check(evidence.previewEnd.title==='Higher the Lisbon Streets'&&evidence.previewEnd.brandAsset==='/assets/gallery/higher.svg','wall has one central title with the original Higher asset at '+viewport.width);
   check(evidence.previewPixelsStart!==evidence.previewPixelsEnd,'floating preview changes its rendered pixels at '+viewport.width);
   await f.pg.screenshot({path:OUT+'/wall-'+viewport.width+'.png'});
   await f.pg.emulateMedia({reducedMotion:'reduce'});
   await f.pg.waitForFunction(()=>!window.__totehm_gallery().lisbon.animated);
   const frozen=await f.pg.evaluate(()=>__totehm_gallery().lisbon.time);
   await f.pg.waitForTimeout(350);
   check((await f.pg.evaluate(()=>__totehm_gallery().lisbon.time))===frozen,'wall preview respects reduced motion at '+viewport.width);
   await f.pg.emulateMedia({reducedMotion:'no-preference'});
   await f.pg.click('#view-list');
   if(viewport.width<650){
    const offscreen=await f.pg.evaluate(()=>__totehm_gallery().lisbon.time);
    await f.pg.waitForTimeout(350);
    check((await f.pg.evaluate(()=>__totehm_gallery().lisbon.time))===offscreen,'off-screen HTML preview pauses in the phone artwork list');
   }
   await f.pg.locator('#lisbon .artwork').scrollIntoViewIfNeeded();
   await f.pg.waitForFunction(()=>__totehm_gallery().lisbon.animated);
   const listed=await f.pg.evaluate(()=>__totehm_gallery());
   await f.pg.waitForTimeout(350);
   const listedEnd=await f.pg.evaluate(()=>__totehm_gallery());
   check(listedEnd.sky.time===listed.sky.time&&listedEnd.frames===listed.frames,'artwork list pauses the 3D renderer and sky at '+viewport.width);
   check(listedEnd.lisbon.time>listed.lisbon.time,'visible HTML artwork shares the floating sign preview at '+viewport.width);
   await f.pg.click('#view-list');
   await visibility(f.pg,true);
   const hidden=await f.pg.evaluate(()=>__totehm_gallery().lisbon.time);
   await f.pg.waitForTimeout(350);
   check((await f.pg.evaluate(()=>__totehm_gallery().lisbon.time))===hidden,'wall preview pauses on hidden-document event at '+viewport.width);
   await visibility(f.pg,false);
   await f.pg.waitForFunction(t=>window.__totehm_gallery().lisbon.time>t,hidden);
   check(!f.log.errors.some(e=>e.startsWith('pageerror:')),'gallery has no application errors at '+viewport.width);
   evidence.gallery=await f.pg.evaluate(()=>__totehm_gallery());
  }catch(error){
   evidence.galleryError=String(error);evidence.galleryLog=f.log;
   evidence.galleryFailureState=await f.pg.evaluate(()=>window.__totehm_gallery?.()).catch(()=>null);
   await f.pg.screenshot({path:OUT+'/gallery-failure-'+viewport.width+'.png',timeout:15000}).catch(()=>{});
   fs.writeFileSync(OUT+'/failure.json',JSON.stringify(evidence,null,2));throw error;
  }finally{await f.ctx.close();}
  }

  const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:true,viewport,hasTouch:viewport.width<650,network,tables:{artworks:[artwork]},functions:{'stoner-gate':{access:true},'higher-checkout':{amount:1700,currency:'usd'}}});
  try{
   await pg.goto(origin+'/play_lisbon_street');
   await pg.waitForFunction(()=>window.__totehm_lisbon?.().rocks===22);
   check(!(await diag(pg)).board,'PLAY begins in the existing floating-sign story at '+viewport.width);
   check(await pg.locator('#sdisc-bg img[src*="assets/signs/"]').count()===22,'all 22 original sign images remain at '+viewport.width);
   check(await pg.locator('.disc-block .btn-sig').count()===8&&await pg.locator('.disc-block .btn-sig').evaluateAll(els=>els.every(e=>e.textContent.trim()==='MAKE THEM USEFUL FOR YOUR BRAIN'&&getComputedStyle(e).fontFamily.includes('Space Mono'))),'every story CTA uses uppercase Space Mono at '+viewport.width);
   check(await pg.locator('.disc-block .t-futura').evaluateAll(els=>els.every(e=>{const s=getComputedStyle(e);return s.fontFamily.includes('Space Mono')&&s.filter==='none'&&s.animationName==='none'&&s.color!=='rgb(251, 213, 202)';})),'story copy uses neutral Space Mono without coral or blur animation at '+viewport.width);
   check(await pg.locator('.disc-block:nth-child(7) use[href="#higher-slogan"]').count()>0&&await pg.locator('.disc-block:nth-child(8) use[href="#higher-slogan"]').count()>0,'Higher in the story is the authentic vector slogan at '+viewport.width);
   for(let step=1;step<8;step++){
    await pg.keyboard.press('ArrowDown');
    await pg.waitForFunction(i=>window.__totehm_lisbon().step===i,step);
    await pg.waitForTimeout(700);
   }
   await pg.screenshot({path:OUT+'/story-'+viewport.width+'.png'});
   await snap(pg);
   check((await diag(pg)).board,'story CTA turns the floating signs into the playable controller at '+viewport.width);
   const geometry=await pg.evaluate(()=>{
    const W=innerWidth,H=innerHeight,s=matchMedia('(hover:hover) and (min-width:900px)').matches?.66:1;
    const w=Math.min(W*s,H*s*1.7778),h=Math.min(H*s,W*s/1.7778);
    return [...document.querySelectorAll('#sdisc-bg>div')].map(e=>{
     const img=e.querySelector('img'),r=e.getBoundingClientRect(),cs=getComputedStyle(e);
     return{id:img.getAttribute('src').split('/').pop().replace('.png',''),w:parseFloat(cs.width),x:parseFloat(cs.translate)||new DOMMatrixReadOnly(cs.transform).m41,y:cs.translate==='none'?new DOMMatrixReadOnly(cs.transform).m42:parseFloat(cs.translate.split(' ')[1]),br:{x:(W-w)/2,y:(H-h)/2,w,h}};
    });
   });
   check(geometry.length===22&&geometry.every(e=>{const [l,t,w]=controller[e.id];return Math.abs(e.x-(e.br.x+l/100*e.br.w))<2&&Math.abs(e.y-(e.br.y+t/100*e.br.h))<2&&Math.abs(e.w-w/100*e.br.w)<2;}),'story CTA retains every original PlayStation-style controller coordinate at '+viewport.width);
   await pg.screenshot({path:OUT+'/controller-'+viewport.width+'.png'});
   await clickRock(pg,'fire_exit');
   check((await pg.locator('#xp-artw-title').textContent()).trim()==='Fire Exit'&&await pg.locator('#xp-artw-price').innerText()==='€120','clicking a sign keeps original artwork metadata and price at '+viewport.width);
   check((await pg.locator('#xp-buy').innerText()).trim()==='Acquire →'&&await pg.locator('#xp-buy').getAttribute('data-slug')===artwork.slug,'linked artwork retains its market acquisition route at '+viewport.width);
   check((await pg.locator('#vid').getAttribute('src')).endsWith('/play-signals/fire_exit.mp4'),'sign launches the original media source at '+viewport.width);
   await pg.click('#xp-close');await pg.waitForFunction(()=>!__totehm_lisbon().artwork);await pg.waitForTimeout(650);
   check((await diag(pg)).board,'closing artwork returns to this controller at '+viewport.width);
   await pg.click('#sdisc-board-close');await pg.waitForFunction(()=>!__totehm_lisbon().board);
   check(new URL(pg.url()).pathname==='/play_lisbon_street'&&(await diag(pg)).step===0,'closing controller returns to its story within the same experience at '+viewport.width);
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.waitForFunction(()=>__totehm_lisbon().reduced_motion&&!__totehm_lisbon().moving);
   check(!(await diag(pg)).moving,'reduced motion freezes floating story signs at '+viewport.width);
   await snap(pg);check(!(await diag(pg)).snapping,'story CTA still works without a long animation in reduced motion at '+viewport.width);
   await clickRock(pg,'aed');
   check(await pg.locator('#xp-buy').getAttribute('data-mode')==='owned'&&await pg.locator('#xp-buy use[href="#higher-slogan"]').count()===1,'entitled member fallback preserves method access with vector Higher at '+viewport.width);
   await pg.click('#xp-close');await pg.waitForFunction(()=>!__totehm_lisbon().artwork);await pg.waitForTimeout(650);
   await pg.keyboard.press('Escape');await pg.waitForFunction(()=>!__totehm_lisbon().board);
   check(new URL(pg.url()).pathname==='/play_lisbon_street','Escape from controller stays within the same experience at '+viewport.width);
   check(!log.errors.some(e=>e.startsWith('pageerror:')),'experience has no application errors at '+viewport.width+': '+log.errors.join(' | '));
   evidence.experience=await diag(pg);evidence.log=log;
  }catch(error){await pg.screenshot({path:OUT+'/failure-'+viewport.width+'.png'}).catch(()=>{});throw error;}
  finally{results.push(evidence);fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await ctx.close();}
 }
 // A visitor without entitlement keeps the existing authentication gate;
 // a sold artwork stays unavailable. These mocks never create accounts/orders.
 const gate=await page(browser,{dir:'space',origin,session:false,network,functions:{'higher-checkout':{amount:1700,currency:'usd'}}});
 try{
  await gate.pg.emulateMedia({reducedMotion:'reduce'});await gate.pg.goto(origin+'/play_lisbon_street');
  await gate.pg.waitForFunction(()=>window.__totehm_lisbon?.().rocks===22);await snap(gate.pg);await clickRock(gate.pg,'aed');
  check(await gate.pg.locator('#xp-buy use[href="#higher-slogan"]').count()===1,'visitor purchase fallback also uses vector Higher');
  await gate.pg.click('#xp-buy');await gate.pg.waitForFunction(()=>__totehm_lisbon().auth);
  check(await gate.pg.locator('#auth-overlay').evaluate(e=>e.classList.contains('in')),'visitor still reaches the original email authentication gate');
  check(!gate.log.functions.some(e=>e.name==='higher-checkout'&&!e.body.quote),'tests do not request a real checkout');
 }finally{await gate.ctx.close();}
 const sold=await page(browser,{dir:'space',origin,session:false,network,tables:{artworks:[{...artwork,status:'sold',edition_sold:8}]},functions:{'higher-checkout':{amount:1700,currency:'usd'}}});
 try{
  await sold.pg.emulateMedia({reducedMotion:'reduce'});await sold.pg.goto(origin+'/play_lisbon_street');
  await sold.pg.waitForFunction(()=>window.__totehm_lisbon?.().rocks===22);await snap(sold.pg);await clickRock(sold.pg,'fire_exit');
  check(await sold.pg.locator('#xp-buy').isDisabled()&&(await sold.pg.locator('#xp-artw-edition').textContent()).trim()==='sold out','sold artwork cannot be acquired');
 }finally{await sold.ctx.close();}
 const market=await page(browser,{dir:'space',origin,session:true,network,tables:{artworks:[artwork]},functions:{'stoner-gate':{access:true},'higher-checkout':{amount:1700,currency:'usd'}}});
 try{
  await market.pg.emulateMedia({reducedMotion:'reduce'});await market.pg.goto(origin+'/play_lisbon_street');
  await market.pg.waitForFunction(()=>window.__totehm_lisbon?.().rocks===22);await snap(market.pg);await clickRock(market.pg,'fire_exit');
  await market.pg.click('#xp-buy');await market.pg.waitForURL(origin+'/market?art='+artwork.slug);
  check(new URL(market.pg.url()).searchParams.get('art')===artwork.slug,'Acquire actually opens the existing artwork market without requesting payment');
  check(!market.log.functions.some(e=>e.name==='higher-checkout'&&!e.body.quote),'acquisition navigation does not initiate checkout');
 }finally{await market.ctx.close();}
 console.log('PASS '+checks+' Lisbon revision checks; screenshots '+OUT);
}finally{fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await browser.close();}
