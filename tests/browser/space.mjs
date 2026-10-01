// SPACE: restored five-view navigation, future Habit Spots, private live clips.
// Supabase is mocked; no real user, upload, content or location is written.
import fs from 'node:fs';
import { launch, page, ok } from './harness.mjs';
const OUT=process.argv[2] || '/tmp';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space', now=Date.now(), iso=m=>new Date(now+m*60000).toISOString();
const V='22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.webm';
const spot=(id,start,dur,extra={})=>({id,habit:'Run the hill',intentions:['love','fight'],visibility:'shared',mode:'social',location:'off',city:'Lisbon',starts_at:iso(start),ends_at:iso(start+dur),duration_min:dur,state:start>0?'will':start+dur>0?'am':'was',creator:'nia',mine:false,video:start>0?null:V,exact:null,...extra});
let feed=[spot('live',-10,60),spot('past',-300,60,{video:null}),spot('private',-5,45,{visibility:'private',mode:null,location:null,mine:true,exact:{lat:38.7223,lng:-9.1393,place:'My place'},context:{objectives:[{text:'My objective'}],repulsions:[]}})];
let exact=[feed[2],spot('on-live',-20,90,{location:'on',exact:{lat:38.729,lng:-9.15}}),spot('on-past',-400,60,{location:'on',exact:{lat:38.71,lng:-9.13}})];
let future=[spot('future-city',60,30),spot('future-exact',120,60,{mine:true,visibility:'private',exact:{lat:38.723,lng:-9.14,place:'Future meeting point'}})];
const filtered=(l,b)=>l.filter(s=>(!b.p_intention || s.intentions.includes(b.p_intention)) && (!b.p_q || s.habit === b.p_q));
const rpc={
 spot_rules:{clip_seconds:3,clip_max_bytes:20971520,countdown:2,duration_min:5,duration_max:720,horizon_days:90},
 spots_feed:b=>({spots:filtered(feed,b)}),spots_exact:b=>({spots:filtered(exact,b)}),spots_list:b=>({spots:filtered(future,b),more:false}),
 spot_habit_context:{ok:true,objectives:[{text:'Enjoy Lisbon together'}],repulsions:[{text:'Stay indoors'}]},
 spot_schedule:b=>{const s=spot('planned-new',1440,b.p_duration_min,{habit:b.p_habit,visibility:b.p_visibility,mine:true,video:null,exact:{lat:b.p_lat,lng:b.p_lng,place:b.p_place},comment:b.p_comment});future.unshift(s);exact.unshift(s);return{ok:true,id:s.id};},
 spot_create:b=>{const s=spot('clip-new',0,b.p_duration_min,{habit:b.p_habit,mine:true,visibility:b.p_visibility,video:b.p_video,exact:{lat:b.p_lat,lng:b.p_lng,place:'My place'},mode:b.p_mode,location:b.p_location});feed.unshift(s);exact.unshift(s);return{ok:true,id:s.id};},
 spot_get:b=>({ok:true,spot:[...feed,...exact,...future].find(s=>s.id===b.p_id)})
};
const tables={profiles:[{pseudo:'wah'}],totehms:[{steps:[{t:'Run the hill',f:'every_morning',is:['love','fight']},{t:'Cold shower',f:'daily',is:['focus']}]}]};
const browser=await launch();
try{
 const {pg,log}=await page(browser,{dir:'space',origin,rpc,tables,viewport:{width:1440,height:900}});
 const state=()=>pg.evaluate(()=>window.__totehm_space());
 const settle=()=>pg.waitForTimeout(550);
 async function view(v){await pg.waitForFunction(v=>window.__totehm_space().view===v,v);await settle();}
 const box=id=>pg.$eval('#'+id,e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
 async function drag(id,dx,dy){const r=await box(id),x=r.x+r.w/2,y=r.y+r.h/2;await pg.mouse.move(x,y);await pg.mouse.down();await pg.mouse.move(x+dx,y+dy,{steps:8});await pg.mouse.up();}
 await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_space?.().exact>0);await settle();
 const initial=await state();ok(initial.view==='radar' && initial.intention==='love','radar + LOVE on arrival');
 ok(initial.build==='2026-10-01-navigation','new diagnostic build');
 ok(await pg.textContent('#int-def')==='Contemplate life through connection & beauty.','COM definition of Love');
 ok((await pg.$$eval('#ints button',bs=>bs.map(b=>b.dataset.int))).join()==='celebrate,focus,express,love,enrich,flow,fight','chakra order');
 ok(await pg.locator('#ints button[title]').count()===7,'all seven definitions are accessible');
 ok(await pg.locator('#q').count()===0,'no free-text search');
 const palette=await pg.$$eval('#joy-stack i',es=>es.map(e=>getComputedStyle(e).backgroundColor));
 ok(palette.join()==='rgb(54, 73, 140),rgb(51, 51, 102),rgb(116, 49, 105)','three COM joystick colours');
 await pg.screenshot({path:OUT+'/space_radar.png'});
 // A point opens one detailed Habit Box, without turning into the list.
 await pg.mouse.click(initial.radar.cx,initial.radar.cy);await settle();
 ok((await state()).detail,'mouse click on a point opens a detail');
 ok(await pg.locator('#detail .habit').count()===1,'one Spot only in radar detail');await pg.keyboard.press('Escape');
 // Habit selection belongs to the radar and persists when moving.
 await pg.click('#habit-filter');await pg.waitForSelector('[data-filter-h]');
 ok(await pg.locator('#habit-picker [data-filter-h]').count()===2,'selection of my own Habit Boxes');
 await pg.click('[data-filter-h="0"]');await settle();
 ok((await state()).habit_filter,'Habit Box selected');
 ok(log.rpc.filter(c=>['spots_feed','spots_exact','spots_list'].includes(c.name)).slice(-3).every(c=>c.body.p_q==='Run the hill'),'same Habit filter for horizontal views');
 // Joystick drag to LEFT. Radar occupies the remaining desktop space.
 await drag('joy-box',-28,0);await view('feed');
 let r=(await state()).radar,pan=await box('v-feed');
 ok(pan.x===0 && pan.w===420,'desktop feed panel enters at left edge');
 ok(r.cx-r.radius>pan.w && r.radius<initial.radar.radius,'radar shrinks beside the desktop feed');
 ok(await pg.locator('#v-feed canvas,#v-feed .zoom,#v-feed .compass').count()===0,'no radar or map commands inside feed');
 ok(await pg.$eval('#joy',e=>getComputedStyle(e).opacity)==='1','joystick remains visible in feed');
 await pg.screenshot({path:OUT+'/space_desktop_left.png'});
 // Horizontal screen drag restores CENTER; no accidental detail after a drag.
 await pg.keyboard.press('ArrowRight');await view('radar');
 await drag('canvas',110,0);await view('feed');ok(!(await state()).detail,'mouse swipe is not a spot click');
 await pg.click('#joy-box');await view('radar');
 // Small trackpad deltas accumulate. Inertia cannot cross two views.
 await pg.mouse.move(740,440);
 for(let i=0;i<10;i++) await pg.mouse.wheel(10,0);
 await view('list');ok((await state()).view==='list','small horizontal trackpad deltas reach RIGHT');
 r=(await state()).radar;pan=await box('v-list');
 ok(pan.x===1020 && pan.w===420 && r.cx+r.radius<pan.x,'right desktop panel + radar on the left');
 ok(await pg.locator('#list .it').count()===2 && await pg.locator('#list [data-state="will"]').count()===2,'RIGHT shows future Habit Spots only');
 ok(!/I AM HERE|I WAS THERE/.test(await pg.textContent('#list')),'no present or past in the future list');
 await pg.screenshot({path:OUT+'/space_desktop_right.png'});
 await pg.click('#joy-box');await view('radar');await pg.waitForTimeout(380);
 await pg.mouse.move(700,430);for(let i=0;i<10;i++) await pg.mouse.wheel(0,-10);
 await view('plan');ok((await state()).view==='plan','vertical trackpad reaches TOP');
 for(let i=0;i<12;i++) await pg.mouse.wheel(0,-12);await pg.waitForTimeout(100);
 ok((await state()).view==='plan','trackpad inertia stays in its view');
 // Future creation uses the Habit Box itself as the detailed editor.
 await pg.waitForSelector('[data-plan-h]');await pg.click('[data-plan-h="0"]');await settle();
 ok(await pg.locator('.plan-draft').count()===1,'future Spot editor is inside its Habit Box');
 ok(await pg.$eval('[data-plan-send]',e=>e.disabled),'future confirmation requires date, place, duration and visibility');
 await pg.click('[data-plan-details]');
 ok(/Enjoy Lisbon together|Stay indoors/.test(await pg.textContent('.plan-draft')),'future details use my own linked objectives and repulsions');
 await pg.fill('#p-say','Bring water');
 await pg.click('[data-plan-place]');await pg.waitForSelector('#place-map');
 ok(await pg.$eval('#place-picker',e=>!e.classList.contains('hide')),'full-screen place selection');
 const beforeTiles=log.tiles;await drag('place-map',70,40);await pg.click('[data-zoom="1"]');
 ok(log.tiles>=beforeTiles,'the map can pan and zoom');
 await pg.fill('#place-name','Ribeira steps');await pg.click('#place-use');await settle();
 await pg.click('[data-pvis="shared"]');await pg.click('[data-pmode="social"]');await pg.click('[data-ploc="on"]');await pg.click('[data-pdur="45"]');
 ok(!(await pg.$eval('[data-plan-send]',e=>e.disabled)),'complete future Spot can be confirmed');
 await settle();await pg.screenshot({path:OUT+'/space_future_editor.png'});
 await pg.click('[data-plan-send]');await view('list');
 const scheduled=log.rpc.find(c=>c.name==='spot_schedule');
 ok(scheduled?.body.p_habit==='Run the hill' && new Date(scheduled.body.p_starts_at)>new Date(),'future scheduling sends Habit + future timestamp');
 ok(scheduled?.body.p_place==='Ribeira steps' && scheduled.body.p_comment==='Bring water' && scheduled.body.p_location==='on','future place and detailed choices persist');
 ok(!('p_video' in scheduled.body) && log.upload.length===0,'future creation requires no video upload');
 ok(await pg.locator('#detail .habit').count()===1 && /I WILL BE HERE/.test(await pg.textContent('#detail')),'confirmation shows the scheduled Spot alone');
 await pg.keyboard.press('Escape');await pg.click('#joy-box');await view('radar');
 // Narrow desktop retains the panels and reduced radar.
 await pg.setViewportSize({width:1024,height:700});await settle();await pg.click('#cur-d');await view('list');
 pan=await box('v-list');r=(await state()).radar;
 ok(pan.x===604 && r.cx+r.radius<pan.x && r.radius>20,'1024px desktop keeps side panel and reduced radar');
 // Mobile: one full-screen view, central Habit filter only.
 await pg.click('#joy-box');await view('radar');await pg.setViewportSize({width:390,height:844});await settle();
 await pg.click('#cur-g');await view('feed');
 ok(await pg.$eval('#v-radar',e=>getComputedStyle(e).visibility)==='hidden','mobile feed does not have a radar behind it');
 ok(await pg.$eval('#habit-filter',e=>getComputedStyle(e).visibility)==='hidden','Habit filter belongs to the mobile radar');
 ok((await state()).habit_filter,'Habit selection survives navigation');
 await pg.click('#cur-d');await view('radar');
 await pg.click('#cur-b');await view('cam');
 await pg.waitForFunction(()=>['count','rec','nocam','denied'].includes(window.__totehm_space().rec.step));
 ok(['count','rec'].includes((await state()).rec.step),'BOTTOM opens camera directly');
 if((await state()).rec.step==='count') await pg.click('#joy-box');
 await pg.waitForFunction(()=>window.__totehm_space().rec.step==='rec');
 ok(await pg.$eval('#joy-box',e=>e.classList.contains('is-recording')),'joystick becomes stop control while recording');
 ok(await pg.locator('[data-stop]').count()===0,'no separate Stop button');
 await pg.waitForTimeout(700);await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='habit');
 ok((await state()).rec.clip && !(await state()).rec.camera,'joystick stops video and closes camera tracks');
 await pg.click('[data-h="0"]');await pg.click('[data-vis="private"]');await pg.click('[data-dur="30"]');
 ok(await pg.locator('[data-mode],[data-loc]').count()===0,'private capture requires neither interaction mode nor location sharing');
 await pg.screenshot({path:OUT+'/space_mobile_camera_form.png'});
 await pg.click('[data-send]');await view('radar');
 const created=log.rpc.find(c=>c.name==='spot_create');
 ok(created?.body.p_visibility==='private' && created.body.p_mode===null && created.body.p_location===null,'private upload keeps private rights');
 ok(log.upload.some(u=>u.method==='POST' && u.size>0),'recorded video actually uploaded through the SDK');
 await pg.keyboard.press('Escape');
 // Auto-stop uses server clip limit; fixture shortens 33s to 3s.
 await pg.click('#cur-b');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='habit',null,{timeout:10000});
 ok((await state()).rec.clip,'video automatically stops at server clip limit');
 await pg.click('#cur-h');await view('radar');
 ok(!(await state()).rec.camera && !(await state()).rec.clip,'leaving camera releases recording and preview');
 // Pointer cancel never navigates; touchscreen horizontal/vertical paths.
 await pg.dispatchEvent('#joy-box','pointerdown',{pointerId:80,pointerType:'touch',clientX:195,clientY:780});
 await pg.dispatchEvent('#joy-box','pointermove',{pointerId:80,pointerType:'touch',clientX:230,clientY:780});
 await pg.dispatchEvent('#joy-box','pointercancel',{pointerId:80,pointerType:'touch'});
 ok((await state()).view==='radar','cancelled joystick gesture stays in place');
 const audit=await pg.evaluate(()=>({bebas:/Bebas/i.test(document.documentElement.outerHTML),white:[...document.querySelectorAll('button,input,textarea,.view')].filter(e=>getComputedStyle(e).backgroundColor==='rgb(255, 255, 255)').length,match:/\d+%.*match/i.test(document.body.innerText)}));
 ok(!audit.bebas && audit.white===0 && !audit.match,'dark UI, no Bebas, no match percentages');
 await pg.click('#member');ok(/simple terms of use/i.test(await pg.locator('#menu').locator(':scope > :last-child').textContent()),'terms remain last in member menu');await pg.click('#member');
 const unexpected=log.errors.filter(e=>!e.includes('Failed to load resource') && !e.includes('DEMUXER_ERROR'));
 ok(unexpected.length===0,'no browser exceptions: '+unexpected.join(' | '));
 // Real touch input via Chrome DevTools, instead of synthetic-only swipes.
 const touch=await page(browser,{dir:'space',origin,rpc,tables,hasTouch:true,viewport:{width:390,height:844}});
 await touch.pg.goto(origin+'/');await touch.pg.waitForFunction(()=>window.__totehm_space?.().exact>0);
 const cdp=await touch.ctx.newCDPSession(touch.pg);
 async function swipe(x1,y1,x2,y2){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x1,y:y1,id:1}]});
   for(let k=1;k<=8;k++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x1+(x2-x1)*k/8,y:y1+(y2-y1)*k/8,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.pg.waitForTimeout(550);
 }
 await swipe(190,400,310,400);ok((await touch.pg.evaluate(()=>window.__totehm_space())).view==='feed','real screen swipe opens LEFT');
 await swipe(220,400,90,400);ok((await touch.pg.evaluate(()=>window.__totehm_space())).view==='radar','real screen swipe restores CENTER');
 await swipe(195,350,195,480);ok((await touch.pg.evaluate(()=>window.__totehm_space())).view==='plan','real vertical screen swipe opens TOP');
 const anonBrowser=await launch();
 const anon=await page(anonBrowser,{dir:'space',origin,rpc:{...rpc,spots_exact:{spots:[]},spots_list:{spots:[future[0]],more:false}},tables,session:false});
 await anon.pg.goto(origin+'/');await anon.pg.waitForFunction(()=>window.__totehm_space && document.getElementById('member-txt').textContent==='Sign in');await anon.pg.click('#cur-d');
 ok((await anon.pg.textContent('#list')).includes('I WILL BE HERE'),'anonymous can discover public future Spot city');
 await anon.pg.click('#joy-box');await anon.pg.waitForFunction(()=>window.__totehm_space().view==='radar');await anon.pg.click('#cur-h');await anon.pg.waitForFunction(()=>window.__totehm_space().view==='plan');
 ok(await anon.pg.locator('[data-plan-signin]').count()===1,'anonymous future creation asks for sign-in');
 await anon.pg.click('#joy-box');await anon.pg.waitForFunction(()=>window.__totehm_space().view==='radar');await anon.pg.click('#cur-b');await anon.pg.waitForFunction(()=>window.__totehm_space().view==='cam');
 ok((await anon.pg.evaluate(()=>window.__totehm_space())).rec.step==='signin','anonymous camera creation requires sign-in');
 await anonBrowser.close();
} finally { await browser.close(); }
