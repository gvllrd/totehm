// SPACE: real touch swipes, compass/radar, progressive creation, exact COM Habit Boxes.
// All accounts, positions, uploads and playback responses are mocked.
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2] || '/tmp';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',now=Date.now(),iso=m=>new Date(now+m*60000).toISOString();
const V='22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.webm';
const spot=(id,start,extra={})=>({id,format:'space',habit:'Run the hill',freq:'every_morning',intentions:['love','fight'],visibility:'shared',mode:'social',location:'on',city:'Lisbon',starts_at:iso(start),ends_at:iso(start+60),duration_min:60,creator:'nia',mine:false,video:start>0?null:V,exact:null,...extra});
let feed=[spot('live',-10),spot('past',-300,{video:null})],exact=[spot('own',-10,{mine:true,visibility:'private',exact:{lat:38.7223,lng:-9.1393,place:'My place'}}),spot('other',-20,{exact:{lat:38.724,lng:-9.144}})],future=[spot('future-city',60),spot('future-own',120,{mine:true,visibility:'private',exact:{lat:38.728,lng:-9.148,place:'Future point'}})];
const habits=[{name:'Run the hill',freq:'every_morning',ints:['love','fight'],place:'Hill trail',step:{id:'h1',t:'Run the hill',f:'every_morning',is:['love','fight']},objectives:[{text:'Enjoy Lisbon together'}],repulsions:[{text:'Stay indoors'}]},{name:'Walk the river',freq:'every_sunday',ints:['love'],place:'River bank',objectives:[],repulsions:[]}];

feed=feed.map(s=>({...s,location:'off',mode:'silent',duration_min:5,format:'space',exact:null}));
future=future.map(s=>({...s,format:'spot'}));
const rpc={spot_rules:{clip_seconds:2,clip_max_bytes:33554432,duration_min:5,duration_max:720,video_provider:'storage'},space_habits:{ok:true,habits},
 space_discover:b=>({spots:feed,match:b.p_habit==='Walk the river'?'intention':b.p_habit?'habit':'all',more:false}),
 spots_list:()=>({spots:future}),
 space_post:b=>{const s=spot('newclip',-1,{habit:b.p_habit,mine:true,video:b.p_video,location:'off',mode:'silent',duration_min:5,comment:b.p_comment,exact:null});feed.unshift(s);return{ok:true,id:s.id};},
 spot_box_visibility_set:{ok:true},spot_get:b=>({ok:true,spot:feed.find(s=>s.id===b.p_id)})};
const browser=await launch({videoFile:process.env.SPACE_CAMERA_FIXTURE});
try{
 const {pg,log}=await page(browser,{dir:'space',origin,rpc,tables:{profiles:[{pseudo:'wah'}]},viewport:{width:1440,height:900}});
 const state=()=>pg.evaluate(()=>window.__totehm_space()), settle=()=>pg.waitForTimeout(400);
 const view=async v=>{await pg.waitForFunction(v=>window.__totehm_space().view===v,v);await settle();};
 const box=id=>pg.$eval('#'+id,e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
 async function drag(id,dx,dy){const r=await box(id),x=r.x+r.w/2,y=r.y+r.h/2;await pg.mouse.move(x,y);await pg.mouse.down();await pg.mouse.move(x+dx,y+dy,{steps:8});await pg.mouse.up();}
 await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_space?.().feed>0);await settle();
 ok((await state()).view==='feed','SPACE arrives in the feed');
 ok((await box('v-feed')).w===1440 && (await box('v-feed')).h===900,'desktop feed fills the viewport');
 ok(await pg.locator('.view').count()===3,'SPACE has exactly three views');
 ok(await pg.locator('#v-plan,#v-radar,#v-list,#canvas,#radar-map,#radar-tools,#list').count()===0,'planning, radar and agenda nodes are absent');
 const diagnostic=await state();ok(!['radar','plan','exact','list'].some(k=>k in diagnostic),'diagnostic contains no removed state');
 ok(!await pg.isVisible('#title')&&!await pg.isVisible('#int-def'),'no visible view headings');
 ok(await pg.locator('#ints').count()===0,'no parallel intention selector');
 ok(await pg.isVisible('#member')&&await pg.isVisible('#totehm-paper'),'center keeps member and Habit selection');
 ok(await pg.locator('#feed [data-go],#feed [data-ics]').count()===0,'feed has no location or calendar actions');
 ok(!/5 min|location off|silent|until /i.test(await pg.textContent('#feed')),'technical space values never appear in feed');
 await pg.click('#totehm-paper');await pg.waitForSelector('[data-filter-h]');
 const text=await pg.textContent('[data-filter-h="0"]');ok(['every morning','Hill trail','OBJECTIVES','Enjoy Lisbon together','REPULSIONS','Stay indoors'].every(x=>text.includes(x)),'Habit Box preserves all COM attributes');
 ok(await pg.locator('[data-filter-h="0"] .v-int[title]').count()===2,'exact intention definitions remain');
 await pg.click('[data-filter-h="1"]');await settle();
 ok(/Same intention/.test(await pg.textContent('#int-def')),'feed keeps intention fallback');
 ok(log.rpc.filter(x=>x.name==='space_discover').at(-1).body.p_habit==='Walk the river','Habit choice reaches feed');
 ok(log.rpc.filter(x=>x.name==='spots_list').at(-1).body.p_q==='Walk the river','same Habit reaches the spots door');
 await pg.click('#sf-btn');await pg.waitForSelector('[data-sf-shows]');
 ok(await pg.locator('[data-sf-shows]').count()===3 && await pg.locator('[data-sf-want],[data-sf-mode]').count()===0,'filter retains VIDEO, PHOTO and WHY only');
 await pg.click('[data-sf-shows="video"]');await settle();ok((await state()).feed_shown===1,'VIDEO filter shows media without spot conditions');
 await pg.click('[data-sf-all]');await pg.click('[data-sf-close]');
 await drag('joy-box',-28,0);await view('spots');
 ok((await state()).spots_door===2 && await pg.locator('#spots-door [data-club-spot]').count()===2,'LEFT shows the next spots');
 ok(await pg.isVisible('#find-spot')&&(await pg.textContent('#find-spot'))==='FIND A SPOT','LEFT opens Club');
 await pg.click('#joy-box');await view('feed');
 await pg.keyboard.press('ArrowUp');await pg.keyboard.press('ArrowRight');await settle();ok((await state()).view==='feed','removed directions do not navigate');
 await pg.mouse.move(740,400);for(let i=0;i<10;i++)await pg.mouse.wheel(-10,0);await view('spots');await pg.keyboard.press('ArrowRight');await view('feed');
 await pg.click('#cur-b');await view('cam');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='idle');
 ok(!(await state()).rec.camera,'camera entry leaves sensor off');
 await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='ready');await pg.waitForTimeout(900);
 ok((await state()).rec.step==='ready','sensor waits for explicit recording');
 const centered=()=>pg.evaluate(()=>{const b=document.querySelector('#joy-box').getBoundingClientRect(),e=document.querySelector('#joy-record'),r=e.getBoundingClientRect(),s=getComputedStyle(e);return{x:Math.abs(r.x+r.width/2-b.x-b.width/2),y:Math.abs(r.y+r.height/2-b.y-b.height/2),color:s.backgroundColor,radius:s.borderRadius,w:r.width,h:r.height};});
 let rec=await centered();ok(rec.x<.1&&rec.y<.1&&rec.color==='rgb(116, 49, 105)'&&rec.radius==='50%','record point stays centered with its original color');
 await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='rec');await pg.waitForFunction(()=>getComputedStyle(document.querySelector('#joy-record')).borderRadius==='3px');
 rec=await centered();ok(rec.x<.1&&rec.y<.1&&Math.abs(rec.w-19)<.1&&Math.abs(rec.h-19)<.1,'same point becomes the original stop square');
 await pg.waitForFunction(()=>window.__totehm_space().rec.step==='habit');
 await pg.click('[data-h="0"]');await pg.waitForFunction(()=>!document.querySelector('[data-send]')?.disabled);
 ok(await pg.locator('[data-vis],[data-loc],[data-mode],[data-dur],#c-dur').count()===0&&!/WHERE|DURATION|Location|Together/.test(await pg.textContent('#cam-body')),'space publisher has no spot controls');
 ok(await pg.locator('#cam-body [data-box-group]').count()===2,'publisher keeps two independent mini-boxes');
 await pg.click('[data-box-group="objectives"]');
 ok(await pg.locator('#cam-body [data-box-group="objectives"]').getAttribute('aria-pressed')==='true'&&await pg.locator('#cam-body [data-box-group="repulsions"]').getAttribute('aria-pressed')==='false','objective and repulsion toggles are independent');
 const btn=await pg.$eval('[data-send]',e=>e.offsetWidth);ok(btn<200,'publish button fits its text');
 await pg.fill('#c-say','Bring focus');await pg.click('[data-send]');await view('feed');
 const created=log.rpc.find(x=>x.name==='space_post');ok(created&&Object.keys(created.body).length===6&&created.body.p_city==='Lisbon','space_post receives exactly its six arguments and city');
 ok(created.body.p_comment==='Bring focus'&&created.body.p_habit==='Run the hill','publication preserves Habit and comment');
 ok(log.rpc.some(x=>x.name==='spot_box_visibility_set'&&x.body.p_objectives===true&&x.body.p_repulsions===false),'published visibility keeps independent linked boxes');
 ok(log.upload.some(x=>x.method==='POST'),'private Storage media upload still works');
 ok(!log.rpc.some(x=>x.name==='spot_create'||x.name==='spot_schedule'||x.name==='space_discover'&&x.body.p_view!=='feed'),'SPACE never calls spot writers or radar/list discovery');
 await pg.keyboard.press('Escape');await pg.setViewportSize({width:390,height:844});await settle();
 ok((await box('v-feed')).w===390&&(await box('v-feed')).h===844,'mobile feed fills viewport');
 const client=await pg.context().newCDPSession(pg);async function swipe(x,y,dx,dy){await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let k=1;k<=9;k++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*k/9,y:y+dy*k/9}]});await pg.waitForTimeout(14);}await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 await swipe(200,450,110,8);await view('spots');ok((await state()).view==='spots','touch opens the left door');await swipe(200,450,-110,8);await view('feed');
 await pg.$eval('#feed',e=>e.scrollTo({top:0,behavior:'instant'}));await settle();const before=await pg.$eval('#feed',e=>e.scrollTop);await swipe(200,720,0,-600);await settle();ok((await state()).view==='feed'&&await pg.$eval('#feed',e=>e.scrollTop)>before,'native vertical feed scrolling stays in feed');
 await pg.screenshot({path:OUT+'/space_feed_mobile.png'});
 ok(!log.errors.some(x=>x.startsWith('pageerror')),'SPACE has no JavaScript page errors');
 fs.writeFileSync(OUT+'/space_results.json',JSON.stringify({state:await state(),errors:log.errors,checks:log.rpc.length},null,2));
}finally{await browser.close();}
