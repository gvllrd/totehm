// The gallery's twenty individual links open the existing Origins reader.
// Media, identity and prices are local test data; no payment is requested.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {launch,page} from './harness.mjs';
import {ORIGINS} from '../../space/gallery-artworks.mjs';

const OUT=process.argv[2]||'/tmp/totehm-production/origins-gallery-links';
fs.mkdirSync(OUT,{recursive:true});
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=0x333366:s=64x64:r=8','-t','2','-c:v','libx264','-threads','1','-preset','ultrafast','-pix_fmt','yuv420p','-movflags','+faststart',OUT+'/fixture.mp4']);
const media=fs.readFileSync(OUT+'/fixture.mp4'),origin='https://www.totehm.space';
const browser=await launch(),results=[];let checks=0;
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const artworks=ORIGINS.map(w=>({id:'fixture-'+w.index,slug:'origin-test-'+w.index,title:w.title,sort_order:w.index,price_cents:12000,currency:'eur',status:'available'}));
const network=url=>url.pathname.startsWith('/storage/v1/object/public/wah/')?{status:200,contentType:'video/mp4',body:media}:null;
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:true,viewport,tables:{artworks},network});
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});
   await pg.goto(origin+'/origins?work=17');
   await pg.waitForFunction(()=>document.querySelector('#counter').textContent==='17 / 20');
   check(await pg.locator('#vid16').getAttribute('src')===new URL('/storage/v1/object/public/wah/17.mp4','https://abujjbkbbiumxrokozph.supabase.co').href,'individual photo opens its exact original video at '+viewport.width);
   await pg.waitForFunction(()=>document.querySelector('#gl16 .gl-t').textContent==='Beta Comprehension');
   check(await pg.locator('#gl16 .gl-t').textContent()===ORIGINS[16].title&&await pg.locator('#gl16 .gl-p').textContent()==='€120','individual reader retains title and server-provided price at '+viewport.width);
   check(await pg.locator('.slide').count()===21&&await pg.locator('#deck video').count()===20,'all original chapters and the intro remain intact at '+viewport.width);
   await pg.screenshot({path:OUT+'/work17-'+viewport.width+'.png'});
   await pg.keyboard.press('ArrowDown');await pg.waitForFunction(()=>document.querySelector('#counter').textContent==='18 / 20');
   check((await pg.locator('#vid17').getAttribute('src'))?.endsWith('/18.mp4'),'original chapter navigation continues after a gallery deep link at '+viewport.width);
   await pg.goto(origin+'/origins?work=20');await pg.waitForFunction(()=>document.querySelector('#counter').textContent==='20 / 20');
   check(await pg.locator('#nav-down').evaluate(e=>e.classList.contains('hidden')),'last original artwork keeps the end-of-story control at '+viewport.width);
   await pg.goto(origin+'/origins?work=999');await pg.waitForSelector('#deck .slide');
   check(await pg.locator('#counter').textContent()==='','out-of-range deep link retains the original introduction at '+viewport.width);
   await pg.goto(origin+'/origins?work=bad');await pg.waitForSelector('#deck .slide');
   check(await pg.locator('#counter').textContent()==='','invalid deep link retains the original introduction at '+viewport.width);
   check(!log.errors.some(e=>e.startsWith('pageerror:')),'Origins has no application errors at '+viewport.width+': '+log.errors.join(' | '));
   results.push({viewport,log});
  }finally{fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));await ctx.close();}
 }
 console.log('PASS '+checks+' individual Origins reader checks; screenshots '+OUT);
}finally{await browser.close();}
