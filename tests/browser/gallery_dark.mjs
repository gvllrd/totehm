// Real local WebGL, mocked identity/network. Captures dark UI in desktop and touch layouts.
// source /workspace/.totehm-cloud/activate.sh; node tests/browser/gallery_dark.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';

const OUT=process.argv[2]||'/tmp/totehm-production/dark-gallery';
const entranceOnly=process.argv.includes('--entrance-only');
fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',results=[];
const browser=await launch();
let checks=0;
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const capture=(pg,name,width)=>pg.screenshot({path:OUT+'/'+name+'-'+width+'.png'});
const snapshot=pg=>pg.evaluate(()=>{
 const rgba=value=>{
  const parts=value.match(/[\d.]+/g)?.map(Number)||[];
  return {r:parts[0]||0,g:parts[1]||0,b:parts[2]||0,a:parts.length>3?parts[3]:1};
 };
 const luminance=c=>{
  const channels=[c.r,c.g,c.b].map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});
  return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
 };
 const colorAt=el=>{
  if(!el)return {r:0,g:0,b:0,a:1};
  const own=rgba(getComputedStyle(el).backgroundColor);
  if(own.a===1)return own;
  const base=colorAt(el.parentElement);
  return {r:own.r*own.a+base.r*(1-own.a),g:own.g*own.a+base.g*(1-own.a),b:own.b*own.a+base.b*(1-own.a),a:1};
 };
 const sample=selector=>{
  const el=document.querySelector(selector),style=getComputedStyle(el),background=colorAt(el),foreground=rgba(style.color);
  const l1=luminance(background),l2=luminance(foreground);
  const rect=el.getBoundingClientRect();
  return {selector,background,foreground,backgroundLuminance:l1,contrast:(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05),display:style.display,
   bounds:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height}};
 };
 return {
  scheme:getComputedStyle(document.documentElement).colorScheme,
  viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,
  panels:['body','#member','#member-menu','.tour','#work-info','#gallery','.artwork'].map(sample),
  text:['.wordmark','#member','#member-menu a','.tour a','#work-title','#work-kind','.caption h1','.caption p','.room-actions a','.tour #view-list'].map(sample),
  gallery:{clientWidth:document.querySelector('#gallery').clientWidth,scrollWidth:document.querySelector('#gallery').scrollWidth},
  state:window.__totehm_gallery()
 };
});
const dark=sample=>Math.max(sample.background.r,sample.background.g,sample.background.b)<=40;
const fit=sample=>sample.documentWidth<=sample.viewport.width;
const panel=(sample,selector)=>sample.panels.find(p=>p.selector===selector);
const text=(sample,selector)=>sample.text.find(p=>p.selector===selector);

try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:true,viewport,hasTouch:viewport.width<650});
  const samples={viewport};
  try{
   await pg.goto(origin+'/');
   await pg.waitForFunction(()=>window.__totehm_gallery?.().frames>0&&!window.__totehm_gallery().moving,null,{timeout:20000});
   samples.entrance=await snapshot(pg);
   check(samples.entrance.state.webgl,'real WebGL gallery rendered at '+viewport.width);
   check(samples.entrance.scheme==='dark','dark browser color scheme at '+viewport.width);
   check(['body','.tour'].every(s=>dark(panel(samples.entrance,s)))&&panel(samples.entrance,'#member').backgroundLuminance<=.08,'main UI surfaces are near black with a dark member accent at '+viewport.width);
   check(['.wordmark','#member','.tour a','.tour #view-list'].every(s=>text(samples.entrance,s).contrast>=4.5),'main navigation text is readable at '+viewport.width);
   check(fit(samples.entrance),'entrance has no horizontal overflow at '+viewport.width);
   check(await pg.evaluate(()=>{
    const welcome=document.querySelector('.welcome').getBoundingClientRect();
    return welcome.left>=0&&welcome.right<=innerWidth&&welcome.top>=0&&welcome.bottom<=innerHeight&&
     ['.guide','.controls','.tour'].every(selector=>{
      const other=document.querySelector(selector).getBoundingClientRect();
      return welcome.right<=other.left||welcome.left>=other.right||welcome.bottom<=other.top||welcome.top>=other.bottom;
     });
   }),'entrance title and CTA fit clear of guidance and navigation at '+viewport.width);
   await capture(pg,'entrance',viewport.width);
   if(entranceOnly){results.push({viewport,samples,log});continue;}

   await pg.click('#member');
   await pg.waitForSelector('#member-menu.is-open');
   samples.menu=await snapshot(pg);
   check(dark(panel(samples.menu,'#member-menu')),'member menu stays near black at '+viewport.width);
   check(text(samples.menu,'#member-menu a').contrast>=4.5,'member menu links are readable at '+viewport.width);
   const menuBounds=panel(samples.menu,'#member-menu').bounds;
   check(menuBounds.left>=0&&menuBounds.right<=viewport.width&&fit(samples.menu),'member menu stays inside viewport at '+viewport.width);
   await capture(pg,'menu',viewport.width);
   await pg.keyboard.press('Escape');

   await pg.click('#enter-gallery');
   await pg.waitForFunction(()=>window.__totehm_gallery().room===0&&!window.__totehm_gallery().moving);
   samples.work=await snapshot(pg);
   check(dark(panel(samples.work,'#work-info')),'artwork information stays near black at '+viewport.width);
   check(text(samples.work,'#work-title').contrast>=4.5&&text(samples.work,'#work-kind').contrast>=3,'artwork title and description stay readable at '+viewport.width);
   check(await pg.getAttribute('#work-links a:first-child','href')==='/get_higher','selected work keeps its authored experience link at '+viewport.width);
   check(fit(samples.work),'selected artwork UI has no horizontal overflow at '+viewport.width);
   await capture(pg,'selected-art',viewport.width);

   await pg.click('#view-list');
   await pg.waitForFunction(()=>window.__totehm_gallery().list);
   samples.list=await snapshot(pg);
   check(dark(panel(samples.list,'#gallery'))&&dark(panel(samples.list,'.artwork')),'artwork list and plinths stay near black at '+viewport.width);
   check(['.caption h1','.caption p','.room-actions a'].every(s=>text(samples.list,s).contrast>=4.5),'list captions and experience links stay readable at '+viewport.width);
   check(fit(samples.list)&&samples.list.gallery.scrollWidth<=samples.list.gallery.clientWidth,'artwork list has no horizontal overflow at '+viewport.width);
   check(await pg.locator('#gallery .room').count()===3,'three collections retain the unified THP/Stoner, Lisbon and all Origins works at '+viewport.width);
   check(await pg.locator('#gallery .room:has(a[href="/get_higher"]) a[href="/stoner"]').count()===1,'THP and Stoner share a single artwork card at '+viewport.width);
   for(const href of ['/get_higher','/play_lisbon_street','/origins'])
    check(await pg.locator('#gallery .room a[href="'+href+'"]').count()>=1,'original artwork doorway preserved: '+href+' at '+viewport.width);
   await capture(pg,'list',viewport.width);
   check(!log.errors.some(e=>e.startsWith('pageerror:')),'no application JavaScript errors at '+viewport.width+': '+log.errors.join(' | '));
   results.push({viewport,samples,log});
  }catch(error){
   await capture(pg,'failure',viewport.width).catch(()=>{});
   results.push({viewport,samples,log,error:String(error)});
   throw error;
  }finally{
   fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));
   await ctx.close();
  }
 }
 if(!entranceOnly){
 const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:true,viewport:{width:390,height:844},hasTouch:true});
 try{
  await pg.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
  await pg.goto(origin+'/');
  await pg.waitForFunction(()=>window.__totehm_gallery?.().fallback);
  const sample=await snapshot(pg);
  check(sample.scheme==='dark'&&dark(panel(sample,'#gallery'))&&dark(panel(sample,'.artwork')),'WebGL fallback retains full dark theme');
  check(sample.state.rooms===3&&await pg.locator('#gallery').isVisible(),'WebGL fallback exposes the complete real artwork collection');
  check(fit(sample)&&sample.gallery.scrollWidth<=sample.gallery.clientWidth,'dark fallback fits a touch viewport');
  check(text(sample,'.caption h1').contrast>=4.5&&text(sample,'.caption p').contrast>=4.5,'fallback captions remain readable');
  check(!log.errors.some(e=>e.startsWith('pageerror:')),'fallback has no application JavaScript errors');
  await capture(pg,'fallback',390);
  results.push({fallback:true,sample,log});
 }finally{
  fs.writeFileSync(OUT+'/results.json',JSON.stringify({checks,results},null,2));
  await ctx.close();
 }
 }
 console.log('PASS '+checks+' dark gallery checks; screenshots '+OUT);
}finally{await browser.close();}
