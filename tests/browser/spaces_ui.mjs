// 03/10: fullscreen creation, mobile plan stacking, closing sheet, entitled GO,
// Coral identity across the four platforms and COM's owner-only history.
// All users, positions, maps, RPCs and SSO responses are mocked. No production writes.
import fs from 'node:fs';import {launch,page,ok} from './harness.mjs';
const onlyIdentity=process.argv.includes('--identity');const out=process.argv[2] || '/tmp';fs.mkdirSync(out,{recursive:true});const browser=await launch();
const now=Date.now(),origin='https://www.totehm.space';
const habit={name:'Run the hill',freq:'every_morning',ints:['love','fight'],step:{t:'Run the hill',f:'every_morning',is:['love','fight']},objectives:[{text:'Move with friends'}],repulsions:[]};
const make=(id,extra={})=>({id,habit:habit.name,freq:habit.freq,intentions:habit.ints,visibility:'shared',location:'on',mode:'social',creator:'nia',mine:false,city:'Lisbon',starts_at:new Date(now-1000).toISOString(),ends_at:new Date(now+3600000).toISOString(),duration_min:60,video:null,exact:null,...extra});
const on=make('on'),off=make('off',{location:'off'}),own=make('own',{mine:true,visibility:'private',exact:{lat:38.7223,lng:-9.1393,place:'My place'}});
const rect=(pg,id)=>pg.$eval('#'+id,e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});
const state=pg=>pg.evaluate(()=>window.__totehm_space());
const tapPaper=async pg=>{const r=await rect(pg,'totehm-paper');await pg.mouse.click(r.x+r.w/2,r.y+r.h/2);};
async function swipe(pg,x,y,dx,dy){const c=await pg.context().newCDPSession(pg);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let k=1;k<=10;k++){await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*k/10,y:y+dy*k/10}]});await pg.waitForTimeout(15);}await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach();await pg.waitForTimeout(400);}
const coral=async(pg,sel)=>pg.$eval(sel,e=>{const s=getComputedStyle(e);return s.color==='rgb(251, 213, 202)' && s.fontFamily.includes('Quantico');});
try{
 if(!onlyIdentity){

 {const {pg,log}=await page(browser,{dir:'space',origin,hasTouch:true,tables:{profiles:[{pseudo:'my_higher_self'}]},rpc:{spot_rules:{clip_seconds:2,duration_min:5,duration_max:720,video_provider:'storage'},space_habits:{ok:true,habits:[habit]},space_discover:{spots:[{...off,format:'space'}],more:false},spots_list:{spots:[]}}});
 await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_space?.().signed_in);await pg.waitForTimeout(600);
 ok(await coral(pg,'#member-txt')&&await coral(pg,'#tp-name'),'SPACE identity and paper retain native font and color');
 ok(!await pg.isVisible('#member i'),'SPACE has no member status dot');
 ok(await pg.locator('#canvas,#radar-tools,#v-plan,#v-list').count()===0,'SPACE contains no location interface');
 await tapPaper(pg);await pg.waitForSelector('[data-filter-h]');ok(await pg.locator('[data-filter-h]').count()===1,'center paper opens Habit selector');await pg.click('[data-picker-close]');
 await pg.click('#cur-b');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='idle');await pg.waitForTimeout(600);
 ok(!(await state(pg)).rec.camera&&/Share a space from your TOTEHM/.test(await pg.textContent('#cam-body'))&&await pg.locator('#cam-body [data-start]').count()===2&&await pg.locator('#cam-body [data-cancel]').count()===1,'idle camera keeps VIDEO, PHOTO and CANCEL without activating sensor');
 ok(await pg.$eval('#cam-body .say',e=>getComputedStyle(e).backgroundColor)==='rgba(0, 0, 0, 0.82)','camera instruction keeps original black box');
 await pg.click('[data-start="video"]');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='ready');await pg.waitForTimeout(500);ok((await state(pg)).rec.camera&&(await state(pg)).rec.step==='ready','VIDEO opens sensor but waits for recording');
 await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='habit');
 for(const viewport of [{width:390,height:844},{width:360,height:640},{width:1440,height:900}]){await pg.setViewportSize(viewport);const r=await rect(pg,'cam-body');ok(r.x===0&&r.y===0&&r.w===viewport.width&&r.h===viewport.height,'media form fills '+viewport.width+' × '+viewport.height);}
 await pg.setViewportSize({width:390,height:844});await pg.click('[data-h="0"]');await pg.waitForFunction(()=>!document.querySelector('[data-send]')?.disabled);
 ok(await pg.locator('#c-say').count()===1&&await pg.locator('#c-dur,[data-vis],[data-mode],[data-loc]').count()===0,'form retains comment and removes spot settings');
 await pg.$eval('#cam-body',e=>e.scrollTop=e.scrollHeight);await swipe(pg,375,680,0,-140);ok((await state(pg)).view==='cam'&&(await state(pg)).rec.step==='form','form boundary swipe keeps media draft');
 await pg.click('[data-cancel]');await pg.waitForFunction(()=>window.__totehm_space().view==='feed');
 ok(!(await state(pg)).rec.camera&&!(await state(pg)).rec.clip,'cancel returns to feed and releases media');
 ok(!log.errors.some(x=>x.startsWith('pageerror')),'SPACE media form has no JavaScript page error');await pg.context().close();
 }
 // COM history: private/live, past and planned spaces; cursor and cross-domain SSO.
 {const rows=[{id:'private-live',habit:'Run',visibility:'private',starts_at:new Date(now-1000).toISOString(),ends_at:new Date(now+60000).toISOString(),place:'Own private place'},{id:'planned',habit:'Walk',visibility:'shared',starts_at:new Date(now+86400000).toISOString(),ends_at:new Date(now+86403000).toISOString(),city:'Lisbon'}],more={id:'past',habit:'Swim',visibility:'private',starts_at:new Date(now-86400000).toISOString(),ends_at:new Date(now-86340000).toISOString(),place:'My old place'};
 const {pg,log}=await page(browser,{dir:'com',origin:'https://www.totehm.com',tables:{profiles:[{pseudo:'my_higher_self'}]},rpc:{my_spaces:b=>({ok:true,spaces:b.p_before?[more]:rows,more:!b.p_before})},functions:{'sso-mint':{code:'TEST-COM-SPACE'}},network:async(url)=>url.host==='www.totehm.space'?{status:200,contentType:'text/html',body:'<body>Mock SPACE</body>'}:null});
 await pg.goto('https://www.totehm.com/totehm');await pg.waitForSelector('body.member');await pg.click('#conn-bar');await pg.click('#myspaces-open');await pg.waitForSelector('[data-space]');
 ok(await pg.locator('[data-space]').count()===2 && /PRIVATE/.test(await pg.textContent('#myspaces-list')) && /I WILL BE HERE/.test(await pg.textContent('#myspaces-list')),'COM My spaces retrieves private and planned spaces');await pg.click('#myspaces-more');await pg.waitForFunction(()=>document.querySelectorAll('[data-space]').length===3);ok(/I WAS THERE/.test(await pg.textContent('#myspaces-list')) && log.rpc.filter(x=>x.name==='my_spaces')[1].body.p_before_id==='planned','COM history paginates with stable cursor');
 ok(await coral(pg,'#myspaces-name'),'COM history shows actual Totehm name in Coral');await pg.screenshot({path:out+'/com_my_spaces.png'});await pg.keyboard.press('Escape');ok(!await pg.isVisible('#myspaces') && await pg.isVisible('#member-window'),'history Escape returns to member menu');
 await pg.click('#myspaces-open');await pg.waitForSelector('[data-space]');await pg.click('[data-space="private-live"]');await pg.waitForURL('**totehm.space/**');ok(pg.url().includes('spot=private-live') && pg.url().includes('#sso=TEST-COM-SPACE'),'opening a space keeps member authentication via SSO');ok(!log.errors.some(x=>x.startsWith('pageerror')),'COM history has no JavaScript page error');await pg.context().close();
 }
 }
 const pages=[['club','/','member-txt'],['boutique','/market','member-txt'],['boutique','/get_higher','conn-bar'],['boutique','/stoner','conn-bar'],['boutique','/','conn-bar'],['boutique','/streetwear','conn-txt'],['boutique','/totehm','conn-bar'],['com','/console','member-txt'],['com','/creator','member-txt']];
 for(const [dir,path,identity] of pages){const host=dir==='club'?'www.figher.club':dir==='boutique'?'higher.boutique':'www.totehm.com';const {pg,log}=await page(browser,{dir,origin:'https://'+host,tables:{profiles:[{pseudo:'my_higher_self'}]},rpc:{figher_access:{signed_in:true,pseudo:'my_higher_self',thp:false,habit:true},my_collection:{pseudo:'my_higher_self',owned:[],listed:[]},market_view:{works:[],listings:[]},my_console:{signed_in:true,pseudo:'my_higher_self',offer:{},fans:{list:[]},subscriptions:[]}},functions:{'stoner-gate':{access:false},'higher-checkout':{amount:1700,currency:'usd',left:770000}}});await pg.goto('https://'+host+path);await pg.waitForTimeout(700);ok((await pg.textContent('#'+identity)).trim()==='my_higher_self' && await coral(pg,'#'+identity),dir+path+' uses actual Totehm name in Quantico Coral');ok(await pg.locator('#t').count()===0 && !await pg.isVisible('#conn-bar .dot').catch(()=>false) && !await pg.isVisible('#member>i').catch(()=>false),dir+path+' has no centered static T or member dot');ok(!log.errors.some(x=>x.startsWith('pageerror')),dir+path+' identity has no JavaScript page error');await pg.context().close();}
}finally{await browser.close();}
