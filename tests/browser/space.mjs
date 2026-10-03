// SPACE: real touch swipes, compass/radar, progressive creation, exact COM Habit Boxes.
// All accounts, positions, uploads and playback responses are mocked.
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2] || '/tmp';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',now=Date.now(),iso=m=>new Date(now+m*60000).toISOString();
const V='22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.webm';
const spot=(id,start,extra={})=>({id,habit:'Run the hill',freq:'every_morning',intentions:['love','fight'],visibility:'shared',mode:'social',location:'on',city:'Lisbon',starts_at:iso(start),ends_at:iso(start+60),duration_min:60,creator:'nia',mine:false,video:start>0?null:V,exact:null,...extra});
let feed=[spot('live',-10),spot('past',-300,{video:null})],exact=[spot('own',-10,{mine:true,visibility:'private',exact:{lat:38.7223,lng:-9.1393,place:'My place'}}),spot('other',-20,{exact:{lat:38.724,lng:-9.144}})],future=[spot('future-city',60),spot('future-own',120,{mine:true,visibility:'private',exact:{lat:38.728,lng:-9.148,place:'Future point'}})];
const habits=[{name:'Run the hill',freq:'every_morning',ints:['love','fight'],place:'Hill trail',step:{id:'h1',t:'Run the hill',f:'every_morning',is:['love','fight']},objectives:[{text:'Enjoy Lisbon together'}],repulsions:[{text:'Stay indoors'}]},{name:'Walk the river',freq:'every_sunday',ints:['love'],place:'River bank',objectives:[],repulsions:[]}];
const rpc={spot_rules:{clip_seconds:3,clip_max_bytes:33554432,countdown:1,duration_min:5,duration_max:720,horizon_days:90,video_provider:'storage'},space_habits:{ok:true,habits},
 space_discover:b=>{let list=b.p_view==='radar'?exact:b.p_view==='list'?future:feed,match='all';if(b.p_habit){const h=habits.find(h=>h.name===b.p_habit),same=list.filter(s=>s.habit===b.p_habit);match=same.length?'habit':'intention';list=same.length?same:list.filter(s=>s.intentions.some(i=>h?.ints.includes(i)));}return {spots:list,match,more:false};},
 spot_schedule:b=>{const s=spot('scheduled',1440,{habit:b.p_habit,mine:true,visibility:b.p_visibility,location:b.p_location,mode:b.p_mode,exact:{lat:b.p_lat,lng:b.p_lng,place:b.p_place},comment:b.p_comment});future.unshift(s);exact.unshift(s);return {ok:true,id:s.id};},
 spot_create:b=>{const s=spot('newclip',0,{habit:b.p_habit,mine:true,visibility:b.p_visibility,location:b.p_location,mode:b.p_mode,video:b.p_video,exact:{lat:b.p_lat,lng:b.p_lng,place:'My place'}});feed.unshift(s);exact.unshift(s);return {ok:true,id:s.id};},
 spot_get:b=>({ok:true,spot:[...feed,...exact,...future].find(s=>s.id===b.p_id)})};
const tables={profiles:[{pseudo:'wah'}]};
const browser=await launch({videoFile:process.env.SPACE_CAMERA_FIXTURE});
try{
 const {pg,log}=await page(browser,{dir:'space',origin,rpc,tables,viewport:{width:1440,height:900}});
 const state=()=>pg.evaluate(()=>window.__totehm_space());const settle=()=>pg.waitForTimeout(600);
 const view=async v=>{await pg.waitForFunction(v=>window.__totehm_space?.().view===v,v);await settle();};
 const box=id=>pg.$eval('#'+id,e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
 async function drag(id,dx,dy){const r=await box(id),x=r.x+r.w/2,y=r.y+r.h/2;await pg.mouse.move(x,y);await pg.mouse.down();await pg.mouse.move(x+dx,y+dy,{steps:8});await pg.mouse.up();}
 await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_space?.().exact>0);await settle();
 ok(!await pg.isVisible('#title') && !await pg.isVisible('#int-def'),'SPACE has no visible view titles or subtitles');
 ok(await pg.locator('#ints').count()===0,'no vertical intentions selector');
 ok(await pg.textContent('#cmp')==='000° Nturn the ring','compass heading and manual ring restored');
 const initial=await state();
 await pg.mouse.move(initial.radar.cx,initial.radar.cy-initial.radar.radius-7);await pg.mouse.down();await pg.mouse.move(initial.radar.cx+initial.radar.radius+7,initial.radar.cy,{steps:10});await pg.mouse.up();await settle();
 ok((await state()).radar.heading>30,'manual crown rotation changes compass heading');
 await pg.click('#cmp');await settle();ok((await state()).radar.heading<2 || (await state()).radar.heading>358,'compass tap returns north');
 await pg.mouse.click(initial.radar.cx,initial.radar.cy);await settle();ok((await state()).detail && await pg.locator('#detail .habit').count()===1,'one radar point opens one Spot alone');await pg.keyboard.press('Escape');
 {const p=await box('totehm-paper');await pg.mouse.click(p.x+p.w/2,p.y+p.h/2);}await pg.waitForSelector('[data-filter-h]');
 const text=await pg.textContent('[data-filter-h="0"]');ok(['every morning','Hill trail','why','Enjoy Lisbon together','trigger','Stay indoors'].every(x=>text.includes(x)),'Habit Box includes every COM attribute and linked group');
 ok(await pg.locator('[data-filter-h="0"] .v-int[title]').count()===2,'exact intention definitions remain in the Box');
 await pg.click('[data-filter-h="1"]');await settle();ok((await state()).exact>0 && /Same intention/.test(await pg.textContent('#int-def')),'a missing exact Habit falls back to its intentions');
 ok(log.rpc.filter(c=>c.name==='space_discover').slice(-3).every(c=>c.body.p_habit==='Walk the river'),'same Habit choice reaches all three views');
 await drag('joy-box',-28,0);await view('feed');let r=(await state()).radar,pan=await box('v-feed');ok(pan.w===420 && r.cx-r.radius>420 && r.radius<initial.radar.radius,'desktop side feed keeps a reduced radar beside it');
 ok(!await pg.isVisible('#member') && !await pg.isVisible('#tp-hint') && await pg.isVisible('#totehm-paper'),'city feed has only the reduced Habit filter paper');
 await pg.screenshot({path:OUT+'/space_desktop_city.png'});await pg.click('#joy-box');await view('radar');
 await pg.mouse.move(740,400);for(let i=0;i<10;i++) await pg.mouse.wheel(10,0);await view('list');
 ok(!await pg.isVisible('#title') && await pg.locator('#list .it').count()===2,'future spaces list has no title and keeps future Spaces');
 r=(await state()).radar;pan=await box('v-list');ok(r.cx+r.radius<pan.x,'right desktop list preserves the reduced radar');
 await pg.click('#joy-box');await view('radar');await pg.click('#cur-h');await view('plan');
 await pg.click('[data-plan-h="0"]');
 ok(await pg.locator('[data-ploc]').count()===0 && await pg.locator('#p-date').count()===0,'future editor starts with privacy before details');
 await pg.click('[data-pvis="shared"]');ok(await pg.locator('[data-ploc]').count()===2 && await pg.locator('[data-pmode]').count()===0,'shared reveals location first');
 await pg.click('[data-ploc="on"]');ok(await pg.locator('[data-pmode]').count()===2 && await pg.locator('#p-dur').count()===0,'ON reveals silent/social before duration');
 await pg.click('[data-pmode="social"]');ok(await pg.locator('#p-date').count()===1 && await pg.locator('#p-dur').count()===1,'mode reveals future time and duration');
 await pg.click('[data-plan-place]');await settle();ok((await state()).radar.pin,'place selection uses the radar');
 const map=await box('radar-map');r=(await state()).radar;ok(Math.abs(map.w-r.radius*2)<3 && Math.abs(map.x+map.w/2-r.cx)<3,'map is clipped to the radar circle');
 await drag('radar-map',60,40);await pg.click('[data-zoom="1"]');await pg.fill('#place-name','Ribeira steps');await pg.click('#place-use');await settle();
 ok(!(await state()).radar.pin && (await state()).radar.place,'chosen meeting point stays marked in radar');
 await pg.click('[data-pdur="45"]');await pg.fill('#p-say','Bring water');await settle();
 await pg.screenshot({path:OUT+'/space_future_editor.png'});await pg.click('[data-plan-send]');await view('list');
 const scheduled=log.rpc.find(c=>c.name==='spot_schedule');ok(Math.abs(scheduled.body.p_lat-38.7223)<.1 && Math.abs(scheduled.body.p_lng+9.1393)<.1,'radar place picking preserves actual coordinates');ok(scheduled?.body.p_place==='Ribeira steps' && scheduled.body.p_mode==='social' && scheduled.body.p_location==='on','future location and progressive choices are submitted');
 await pg.keyboard.press('Escape');await pg.click('#joy-box');await view('radar');
 await pg.click('#cur-b');await view('cam');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='idle');ok(!(await state()).rec.camera,'entering the camera never turns the sensor on');await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='ready');await pg.waitForTimeout(1500);ok((await state()).rec.step==='ready','the red point turns the sensor on, never recording automatically');await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='habit');
 const joy=await box('joy');ok(joy.y+joy.h<840,'camera joystick moves upward');
 ok(await pg.$eval('#joy-box',e=>getComputedStyle(e).backgroundColor)==='rgb(51, 51, 102)','camera joystick remains navy');
 await pg.click('[data-h="0"]');await pg.click('[data-vis="shared"]');await pg.click('[data-loc="off"]');
 ok(await pg.locator('[data-mode]').count()===0 && await pg.locator('#c-dur').count()===1,'shared OFF skips mode and goes to duration');
 await pg.click('[data-dur="45"]');
 const btn=await pg.$eval('[data-send]',e=>({w:e.offsetWidth,p:getComputedStyle(e).padding}));ok(btn.w<200,'action button width fits its text');
 await pg.screenshot({path:OUT+'/space_camera_form.png'});await pg.click('[data-send]');await view('radar');
 const created=log.rpc.find(c=>c.name==='spot_create');ok(created.body.p_location==='off' && created.body.p_mode===null,'OFF publication has no interaction mode');
 ok(log.upload.some(u=>u.method==='POST'),'existing private Storage path remains available');
 await pg.keyboard.press('Escape');
 // Actual touch lifecycle on a real scrollable Habit Box, including a direction-reversing round trip.
 await pg.setViewportSize({width:390,height:844});await settle();await pg.click('#cur-d');await view('list');
 const client=await pg.context().newCDPSession(pg);
 async function swipe(x,y,dx,dy){await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let k=1;k<=9;k++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*k/9,y:y+dy*k/9}]});await pg.waitForTimeout(14);}await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 let item=await pg.locator('#list .habit').first().boundingBox();await swipe(item.x+item.width*.75,item.y+30,-150,12);await view('radar');
 ok((await state()).view==='radar' && !(await state()).detail,'mobile RIGHT → CENTER swipe works on the Habit Box');
 r=(await state()).radar;await swipe(r.cx,r.cy,-110,8);await view('list');
 await pg.screenshot({path:OUT+'/space_mobile_future.png'});
 // Native vertical scrolling must remain scrolling, not view navigation.
 await pg.evaluate(()=>{const list=document.querySelector('#list');for(let i=0;i<8;i++)list.append(list.firstElementChild.cloneNode(true));});
 await swipe(240,520,-5,-140);await settle();ok((await state()).view==='list' && await pg.$eval('#list',e=>e.scrollTop)>0,'mobile future list keeps native vertical scrolling');
 item=await pg.locator('#list').boundingBox();await swipe(290,340,-145,-20);await view('radar');ok((await state()).view==='radar','return works after scrolling with a slight diagonal');
 ok(!log.errors.some(e=>e.startsWith('pageerror')),'no JavaScript page errors');
 fs.writeFileSync(OUT+'/space_results.json',JSON.stringify({state:await state(),errors:log.errors,checks:log.rpc.length},null,2));
}finally{await browser.close();}
