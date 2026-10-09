// 09/10 — formats, cross-domain SSO, SPACE's door and COM's two groups.
// All RPCs, identities and destinations are simulated. No production writes.
import {launch,page,ok} from './harness.mjs';
const browser=await launch(), now=Date.now();
const item=(id,format)=>({id,format,habit:'Deep practice',intentions:['focus'],visibility:'shared',location:format==='space'?'off':'on',mode:'silent',city:'Lisbon',starts_at:new Date(now+3600000).toISOString(),ends_at:new Date(now+7200000).toISOString(),duration_min:60,exact:null});
try{
 for(const [dir,origin,format,target] of [['space','https://www.totehm.space','space',null],['space','https://www.totehm.space','spot','club'],['club','https://www.figher.club','spot',null],['club','https://www.figher.club','space','space']]){
  let minted=null;const host=target==='club'?'https://www.figher.club':'https://www.totehm.space';
  const {pg,ctx,log}=await page(browser,{dir,origin,rpc:{spot_get:{ok:true,spot:item('link',format)},space_discover:{spots:[]},spots_list:{spots:[]},spots_feed:{spots:[]}},tables:{profiles:[{pseudo:'wah'}]},functions:{'create-bunny-upload':{available:false},'sso-mint':b=>{minted=b.target;return{code:'FORMAT-SSO'};}},network:url=>url.origin===origin&&url.pathname==='/prior'?{status:200,contentType:'text/html',body:'<!doctype html><p>Prior</p>'}:target&&url.origin===host?{status:200,contentType:'text/html',body:'<!doctype html><p>Destination</p>'}:null});
  if(target)await pg.goto(origin+'/prior');await pg.goto(origin+'/?spot=link');
  if(target){await pg.waitForURL(host+'/?spot=link#sso=FORMAT-SSO');ok(minted===target,dir+' redirects '+format+' through the correct authenticated bridge');await pg.goBack();ok(pg.url()===origin+'/prior',dir+' format redirect replaces its history entry');}
  else{await pg.waitForSelector('#detail.is-open');ok(await pg.locator('#detail .habit').count()===1,dir+' opens its own '+format+' directly');}
  ok(!log.errors.some(x=>x.startsWith('pageerror')),dir+' '+format+' link has no JavaScript page errors');await ctx.close();
 }
 // A full page of current spots must not make the past cursor loop forever.
 {const origin='https://www.figher.club',current=Array.from({length:30},(_,i)=>({...item('live-'+i,'spot'),starts_at:new Date(now-(i+1)*1000).toISOString()})),past={...item('past','spot'),starts_at:new Date(now-86400000).toISOString(),ends_at:new Date(now-86000000).toISOString()};
  const {pg,ctx,log}=await page(browser,{dir:'club',origin,rpc:{space_discover:{spots:[]},spots_feed:b=>({spots:b.p_before?[past]:current})},tables:{profiles:[{pseudo:'wah'}]}});
  await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_club?.().signed_in);await pg.click('#cur-g');await pg.waitForSelector('[data-past-more]');
  ok(await pg.locator('#past .sp-card').count()===0,'past view excludes all current spots');await pg.click('[data-past-more]');await pg.waitForSelector('#past .sp-card');
  ok(log.rpc.filter(x=>x.name==='spots_feed').at(-1).body.p_before===current.at(-1).starts_at&&await pg.locator('#past .sp-card').count()===1,'past pagination advances using the raw response cursor');
  ok(!log.errors.some(x=>x.startsWith('pageerror')),'past pagination has no JavaScript page errors');await ctx.close();
 }
 for(const button of ['[data-club-spot="s1"]','#find-spot']){
  const origin='https://www.totehm.space';let minted=null;
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,rpc:{space_discover:{spots:[]},spots_list:{spots:['s1','s2','s3','s4'].map(id=>item(id,'spot'))}},tables:{profiles:[{pseudo:'wah'}]},functions:{'sso-mint':b=>{minted=b.target;return{code:'DOOR-SSO'};}},network:url=>url.origin==='https://www.figher.club'?{status:200,contentType:'text/html',body:'<!doctype html><p>Club</p>'}:null});
  await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_space?.().spots_door===3);await pg.click('#cur-g');
  ok(await pg.locator('#spots-door [data-club-spot]').count()===3,'door limits previews to three upcoming spots');
  const r=log.rpc.find(x=>x.name==='spots_list');ok(r.body.p_limit===3&&Object.keys(r.body).length===5,'door uses the existing spots_list signature');
  await pg.click(button);await pg.waitForURL('https://www.figher.club/**');ok(minted==='club'&&pg.url().includes('#sso=DOOR-SSO'),button+' retains authentication in Club');
  ok(!log.errors.some(x=>x.startsWith('pageerror')),'door link has no JavaScript page errors');await ctx.close();
 }
 const source={ok:true,pseudo:'studio',steps:[{t:'Deep practice',is:['focus']}],objs:{'Deep practice':['o1']},trips:[{id:'o1',text:'Build a practice',is:['focus']}],reps:[],wisdom:[],visions:[]};
 for(const format of ['space','spot']){
  const origin='https://www.totehm.com',host=format==='space'?'https://www.totehm.space':'https://www.figher.club';let minted=null;
  const {pg,ctx,log}=await page(browser,{dir:'com',origin,tables:{profiles:[{pseudo:'wah'}]},rpc:{totehm_of:source,habit_spaces:{ok:true,mine:false,habits:[{habit:'Deep practice',total:2,spaces:[item('s','space'),item('p','spot')]}]}},functions:{'sso-mint':b=>{minted=b.target;return{code:'COM-SSO'};}},network:url=>url.origin===host?{status:200,contentType:'text/html',body:'<!doctype html><p>Destination</p>'}:null});
  await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/totehm?ro=studio');await pg.waitForSelector('body.ro:not(.gate)');
  await pg.waitForSelector('#habits .v-ecosystem');const labels=await pg.locator('#habits .v-ecosystem').allTextContents();ok(labels.join('|')==='1 SPACES|1 SPOTS','COM closed Habit has two separate format lines');
  const style=await pg.$eval('#habits .v-ecosystem',e=>{const s=getComputedStyle(e);return{font:s.fontFamily,weight:s.fontWeight,color:s.color};});ok(style.font.includes('Space Mono')&&Number(style.weight)>=700&&style.color!=='rgb(251, 213, 202)','COM format labels are bold Space Mono and grey');
  await pg.locator('#habits [data-open]').first().evaluate(e=>e.click());await pg.waitForSelector('#habits [data-space]');
  const groups=await pg.locator('#habits .mg-l').allTextContents();ok(groups.includes('SPACES')&&groups.includes('SPOTS')&&await pg.locator('#habits [data-space]').count()===2,'COM open Habit has both labelled groups');
  await pg.locator('#habits [data-format="'+format+'"]').click();await pg.waitForURL(host+'/**');ok(minted===(format==='space'?'space':'club')&&pg.url().includes('spot='+(format==='space'?'s':'p')+'#sso=COM-SSO'),'COM '+format+' opens its correct domain through SSO');
  ok(!log.rpc.some(x=>/rename|_create|_set|_delete|totehm_save/.test(x.name)),'reading COM groups does not mutate its source');
  ok(!log.errors.some(x=>x.startsWith('pageerror')),'COM '+format+' link has no JavaScript page errors');await ctx.close();
 }
}finally{await browser.close();}
