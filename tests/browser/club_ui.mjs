// 03/10: fullscreen creation, mobile plan stacking, closing sheet, entitled GO,
// Coral identity across the four platforms and COM's owner-only history.
// All users, positions, maps, RPCs and SSO responses are mocked. No production writes.
import fs from 'node:fs';import {launch,page,ok} from './harness.mjs';
const onlyIdentity=process.argv.includes('--identity');const out=process.argv[2] || '/tmp';fs.mkdirSync(out,{recursive:true});const browser=await launch();
const now=Date.now(),origin='https://www.figher.club';
const habit={name:'Run the hill',freq:'every_morning',ints:['love','fight'],step:{t:'Run the hill',f:'every_morning',is:['love','fight']},objectives:[{text:'Move with friends'}],repulsions:[]};
const make=(id,extra={})=>({id,habit:habit.name,freq:habit.freq,intentions:habit.ints,visibility:'shared',location:'on',mode:'social',creator:'nia',mine:false,city:'Lisbon',starts_at:new Date(now-1000).toISOString(),ends_at:new Date(now+3600000).toISOString(),duration_min:60,video:null,exact:null,...extra});
const on=make('on'),off=make('off',{location:'off'}),own=make('own',{mine:true,visibility:'private',exact:{lat:38.7223,lng:-9.1393,place:'My place'}});
const rect=(pg,id)=>pg.$eval('#'+id,e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});
const state=pg=>pg.evaluate(()=>window.__totehm_club());
const tapPaper=async pg=>{const r=await rect(pg,'totehm-paper');await pg.mouse.click(r.x+r.w/2,r.y+r.h/2);};
async function swipe(pg,x,y,dx,dy){const c=await pg.context().newCDPSession(pg);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let k=1;k<=10;k++){await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*k/10,y:y+dy*k/10}]});await pg.waitForTimeout(15);}await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach();await pg.waitForTimeout(400);}
const coral=async(pg,sel)=>pg.$eval(sel,e=>{const s=getComputedStyle(e);return s.color==='rgb(251, 213, 202)' && s.fontFamily.includes('Quantico');});
try{
 {let entitled=false;const maps=[];const {pg,log}=await page(browser,{dir:'club',origin,hasTouch:true,tables:{profiles:[{pseudo:'my_higher_self'}]},rpc:{spot_rules:{clip_seconds:2,duration_min:5,duration_max:720,video_provider:'storage'},space_habits:{ok:true,habits:[habit]},space_discover:b=>({spots:b.p_view==='radar'?[own]:b.p_view==='list'?[{...on,starts_at:new Date(now+3600000).toISOString(),ends_at:new Date(now+7200000).toISOString()},off]:[],more:false}),spot_get:b=>({ok:true,spot:b.p_id==='on'?{...on,exact:entitled?{lat:38.724,lng:-9.144}:null}:own})},network:async(url)=>{if(url.host==='www.google.com'){maps.push(url.href);return {status:200,contentType:'text/html',body:'<body>Mock map</body>'};}return null;}});
 await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_club?.().signed_in);await pg.waitForTimeout(600);
 let s=await state(pg),joy=await rect(pg,'joy'),paper=await rect(pg,'totehm-paper');
 ok(paper.w===110 && joy.y-(s.radar.cy+s.radar.radius)<48,'mobile landing has a larger paper and radar close to joystick');
 ok(await coral(pg,'#member-txt') && await coral(pg,'#tp-name'),'SPACE member and paper name are Quantico Coral');
 ok(!await pg.isVisible('#member i'),'SPACE member status dot is absent');
 const cmp=await rect(pg,'cmp'),tools=await rect(pg,'map-tools');ok(cmp.x+cmp.w/2<s.radar.cx && tools.x+tools.w/2>s.radar.cx && cmp.y<s.radar.cy+s.radar.radius && tools.y<s.radar.cy+s.radar.radius,'compass and zoom occupy opposite radar corners');
 await pg.screenshot({path:out+'/spaces_landing_mobile.png'});
 ok(/turn a habit into a spot/i.test(await pg.textContent('#tp-hint')) && !/\bspaces?\b/i.test(await pg.evaluate(()=>document.body.innerText)),'figher.club speaks of spots, never of spaces');
 await pg.click('#space-about');await pg.waitForSelector('.eco-sheet');{const d=await pg.textContent('.eco-sheet');
 ok(/What is a spot\?/.test(d)&&/I WILL BE HERE/.test(d)&&/collective effervescence/.test(d)&&/SOCIAL/.test(d)&&/SILENT/.test(d),'spot definition carries the meeting rules: together, both modes');}
 await pg.keyboard.press('Escape');await pg.waitForTimeout(300);
 await pg.click('#cur-g');await pg.waitForFunction(()=>window.__totehm_club().view==='past');await pg.waitForTimeout(700);
 ok(!await pg.isVisible('#radar-tools') && !await pg.isVisible('#cmp'),'phone past view hides the radar compass and zoom');
 await pg.click('#cur-d');await pg.waitForFunction(()=>window.__totehm_club().view==='radar');await pg.waitForTimeout(700);
 await pg.click('#cur-h');await pg.waitForSelector('[data-plan-h]');await pg.click('[data-plan-h]');await pg.click('[data-pmode="social"]');
 ok(await pg.isVisible('#p-date') && (await state(pg)).view==='plan','mobile future form receives real clicks above radar');
 await pg.$eval('#v-plan',e=>e.scrollTop=e.scrollHeight);let r=await rect(pg,'v-plan');await swipe(pg,r.x+5,r.y+r.h-25,0,-100);ok((await state(pg)).view==='plan','scrolling future form at its boundary never changes view');
 await pg.click('[data-plan-place]');await pg.waitForTimeout(350);ok((await state(pg)).radar.pin && await pg.isVisible('#radar-map'),'future place picker opens within radar');await pg.click('#place-cancel');await pg.keyboard.press('Escape');await pg.waitForTimeout(700);
 s=await state(pg);await pg.mouse.click(s.radar.cx,s.radar.cy);await pg.waitForFunction(()=>window.__totehm_club().detail);await pg.waitForTimeout(400);
 ok(await pg.locator('#detail .sheet-grab span').isVisible() && await pg.$eval('#joy-box',e=>e.disabled),'detail exposes a drag handle and mutes joystick');
 await pg.keyboard.press('ArrowRight');ok((await state(pg)).view==='radar','arrows do not navigate behind an open detail');
 r=await rect(pg,'detail');await swipe(pg,195,r.y+16,0,Math.min(130,820-r.y-16));ok(!(await state(pg)).detail && !await pg.$eval('#joy-box',e=>e.disabled),'downward handle swipe closes and restores joystick');
 await pg.click('#cur-b');await pg.waitForFunction(()=>window.__totehm_club().rec.step==='idle');await pg.waitForTimeout(1200);ok(!(await state(pg)).rec.camera && /start a spot from my TOTEHM/.test(await pg.textContent('#cam-body')) && await pg.locator('#cam-body [data-start]').count()===2 && await pg.locator('#cam-body [data-cancel]').count()===1,'the camera sensor stays off until VIDEO or PHOTO is pressed, with CANCEL');
 ok(await pg.$eval('#cam-body .say',e=>getComputedStyle(e).backgroundColor)==='rgba(0, 0, 0, 0.82)','camera texts sit in black boxes');
 await pg.click('[data-start="video"]');await pg.waitForFunction(()=>window.__totehm_club().rec.step==='ready');await pg.waitForTimeout(800);ok((await state(pg)).rec.camera && (await state(pg)).rec.step==='ready','VIDEO turns the sensor on, recording still waits for the red point');
 await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_club().rec.step==='habit');
 for(const viewport of [{width:390,height:844},{width:360,height:640},{width:1440,height:900}]){await pg.setViewportSize(viewport);r=await rect(pg,'cam-body');ok(r.x===0 && r.y===0 && r.w===viewport.width && r.h===viewport.height,'post-video form fills '+viewport.width+' × '+viewport.height);}
 await pg.setViewportSize({width:390,height:844});await pg.click('[data-h="0"]');await pg.click('[data-loc="on"]');await pg.click('[data-mode="social"]');ok((await pg.textContent('#cam-body')).includes('DURATION') && !(await pg.textContent('#cam-body')).includes('For how long'),'creation says DURATION');
 await pg.$eval('#cam-body',e=>e.scrollTop=e.scrollHeight);await swipe(pg,375,680,0,-140);ok((await state(pg)).view==='cam' && (await state(pg)).rec.step==='form','post-video boundary swipe keeps the recording and form');
 await pg.screenshot({path:out+'/spaces_recording_form.png'});await pg.click('[data-cancel]');await pg.click('#cur-d');await pg.waitForSelector('[data-go="on"]');await pg.waitForTimeout(600);
 ok(await pg.locator('[data-go]').count()===1 && await pg.locator('#list [data-go="off"]').count()===0,'city feed has GO only for ON and shadowed Habit Boxes');
 ok(!await pg.isVisible('#member') && !await pg.isVisible('#tp-hint') && (await rect(pg,'totehm-paper')).w===58,'side view keeps reduced paper without member or instruction');
 await tapPaper(pg);await pg.waitForSelector('[data-filter-h]');ok(await pg.locator('[data-filter-h]').count()===1,'reduced side paper opens the same Habit selector');await pg.click('[data-picker-close]');
 await pg.click('[data-go="on"]');await pg.waitForSelector('#list .acts-note:not([hidden])');ok(maps.length===0 && !(await state(pg)).detail && /subscribers/.test(await pg.textContent('#list .acts-note:not([hidden])')) && await pg.locator('#list .acts-note [data-com="/@nia"]').count()===1 && await pg.locator('#list a[href*="google"]').count()===0,'GO without entitlement explains in place, offers SUBSCRIBE, no exact map, no sheet');
 entitled=true;await pg.click('[data-go="on"]');await pg.waitForURL('**google.com/maps/dir/**');ok(maps.length===1 && maps[0].includes('destination=38.724%2C-9.144') && log.rpc.filter(x=>x.name==='spot_get').length>=2,'GO resolves current rights then navigates to authorized exact place');
 ok(!log.errors.some(x=>x.startsWith('pageerror')),'SPACE sheets and GO have no JavaScript page error');await pg.context().close();
 }
}finally{await browser.close();}
