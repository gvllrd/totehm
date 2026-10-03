// 03/10 bis/ter — SPACE: radar controls hidden until placed; TOP WHERE? (city
// AND/OR map; SHARED·ON needs the point), a video OR photo from the files or the
// camera (upload → spot_schedule → spot_video_attach); WHY · TRIGGER shown by
// choice; the detached context box; inline gestures (GO, WATCH, CALENDAR, SHARE)
// with no duplicate sheet; LEFT filters by intent; BOTTOM sensor off until a
// button; full-screen Habit choice on a phone.
// Accounts, positions, uploads and RPCs are mocked; local VP8 fixtures only.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {launch,page,ok} from './harness.mjs';
const out=process.argv[2] || '/tmp/space-top-left';fs.mkdirSync(out,{recursive:true});
const vp8=(name,size,secs)=>{const f=out+'/'+name+'.webm';if(!fs.existsSync(f))execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size='+size+':rate=24','-t',String(secs),'-c:v','libvpx','-b:v','300k',f]);return f;};
const portrait=vp8('portrait','270x480',2),landscape=vp8('landscape','480x270',2),long=vp8('long','270x480',36);
const origin='https://www.totehm.space',now=Date.now(),iso=m=>new Date(now+m*60000).toISOString();
const habit={name:'Run the hill',freq:'every_morning',ints:['love','fight'],step:{t:'Run the hill',f:'every_morning',is:['love','fight']},objectives:[{text:'Beautiful skin'}],repulsions:[{text:'Alcohol'}]};
const make=(id,start,extra={})=>({id,habit:habit.name,freq:habit.freq,intentions:habit.ints,visibility:'shared',location:'on',mode:'social',creator:'nia',mine:false,city:'Lisbon',starts_at:iso(start),ends_at:iso(start+60),duration_min:60,video:null,exact:null,...extra});
const U='22222222-2222-4222-8222-222222222222',V=U+'/33333333-3333-4333-8333-333333333333.webm',P=U+'/44444444-4444-4444-8444-444444444444.jpg';
const why={objectives:[{text:'Beautiful skin'}],repulsions:[{text:'Alcohol'}]};
const feed=[make('now-on',-10,{video:V}),make('now-off',-20,{location:'off',mode:null,photo:P}),make('before-silent',-300,{mode:'silent',why}),make('before-off',-400,{location:'off',mode:null})];
const future=[make('fut-photo',600,{location:'off',mode:null,photo:P}),make('fut-plain',900)];
const state=pg=>pg.evaluate(()=>window.__totehm_space());
const browser=await launch();
try{
 // 1 · Logged out, slow module: the two radar controls never show at the top left.
 {const {pg}=await page(browser,{dir:'space',origin,session:false,rpc:{spot_rules:{},space_discover:{spots:[],more:false}},
   network:async url=>{if(url.host==='esm.sh'){await new Promise(r=>setTimeout(r,1500));}return null;}});
  await pg.goto(origin+'/',{waitUntil:'commit'});await pg.waitForSelector('#map-tools',{state:'attached'});await pg.waitForTimeout(200);
  const early=await pg.evaluate(()=>['cmp','map-tools'].map(id=>getComputedStyle(document.getElementById(id)).visibility));
  ok(early.every(v=>v==='hidden'),'logged out: radar controls stay invisible before the radar places them');
  await pg.waitForFunction(()=>window.__totehm_space?.());await pg.waitForTimeout(500);
  const s=await state(pg),late=await pg.evaluate(()=>['cmp','map-tools'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return {v:getComputedStyle(e).visibility,x:r.x+r.width/2,y:r.y};}));
  ok(late.every(t=>t.v==='visible' && t.y>s.radar.cy-s.radar.radius) && late[0].x<s.radar.cx && late[1].x>s.radar.cx,'then they appear once, in the radar corners');
  await pg.context().close();}
 // 2 · TOP, then LEFT, signed in.
 const calls=[];let id=0;
 const rpc={spot_rules:{clip_seconds:2,clip_max_bytes:48000000,duration_min:5,duration_max:720,horizon_days:90,video_provider:'storage'},space_habits:{ok:true,habits:[habit]},
  space_discover:b=>({spots:b.p_view==='feed'?feed:b.p_view==='list'?future:[],more:false}),
  spot_create:b=>{calls.push({name:'create',body:b});return {ok:true,id:'made-'+(++id)};},
  spot_why_set:b=>{calls.push({name:'why',body:b});return {ok:true};},
  spot_schedule:(b,log)=>{calls.push({name:'schedule',uploads:log.upload.length,body:b});const s=make('plan-'+(++id),1440,{mine:true,visibility:b.p_visibility,location:b.p_location,mode:b.p_mode,city:b.p_city,exact:{lat:b.p_lat,lng:b.p_lng,place:b.p_place}});return {ok:true,id:s.id};},
  spot_video_attach:b=>{calls.push({name:'attach',body:b});return {ok:true};},
  spot_get:b=>({ok:true,spot:make(b.p_id,1440,{mine:true})})};
 const {pg,log}=await page(browser,{dir:'space',origin,rpc,tables:{profiles:[{pseudo:'wah'}]},viewport:{width:390,height:844}});
 await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_space?.().signed_in);await pg.waitForTimeout(600);
 const toPlan=async()=>{await pg.click('#cur-h');await pg.waitForFunction(()=>window.__totehm_space().view==='plan');await pg.waitForSelector('[data-plan-h]');await pg.click('[data-plan-h="0"]');};
 // Phone: choosing a Habit Box is full screen (paper picker and TOP).
 {const r=await pg.$eval('#totehm-paper',e=>e.getBoundingClientRect().toJSON());await pg.mouse.click(r.x+r.width/2,r.y+r.height/2);await pg.waitForSelector('[data-filter-h]');
  const pk=await pg.$eval('#habit-picker',e=>e.getBoundingClientRect().toJSON());ok(pk.x===0 && pk.y===0 && pk.width===390 && pk.height===844,'phone: the paper opens the Habit choice full screen');await pg.click('[data-picker-close]');}
 await pg.click('#cur-h');await pg.waitForSelector('[data-plan-h]');
 {const r=await pg.$eval('#v-plan',e=>e.getBoundingClientRect().toJSON());ok(r.y===0 && r.height===844 && await pg.isVisible('[data-plan-cancel]'),'phone: TOP Habit choice is full screen, with CANCEL');}
 await pg.click('[data-plan-h="0"]');
 ok((await pg.$eval('#v-plan',e=>e.getBoundingClientRect().height))<844,'once chosen, TOP returns to its panel above the radar');
 ok(await pg.$eval('#v-plan',e=>getComputedStyle(e).backgroundColor)==='rgba(0, 0, 0, 0.92)' && await pg.locator('#plan-body > .plan-habit .habit').count()===1 && await pg.locator('.plan-conf .habit').count()===0,'TOP = BOTTOM: the Habit Box apart, the configuration black and grey');
 await pg.click('[data-pvis="private"]');
 await pg.waitForFunction(()=>document.getElementById('p-city')?.value==='Lisbon');
 ok(true,'a known position prefills the city without asking');
 await pg.fill('#p-city','');await pg.type('#p-city','portl');await pg.waitForSelector('[data-pcity]');
 ok(await pg.locator('[data-pcity]').filter({hasText:/^Portland\s*AU$/}).count()===1 && await pg.locator('[data-pcity]').filter({hasText:/^Portland\s*US$/}).count()===2,'typing proposes local suggestions, homonyms told apart by country');
 await pg.fill('#p-city','');await pg.type('#p-city','Porto');await pg.waitForFunction(()=>window.__totehm_space().plan.city);
 ok(await pg.inputValue('#p-city')==='Porto' && (await state(pg)).plan.city && !(await state(pg)).plan.exact,'PRIVATE: a city alone, no map point');
 await pg.click('[data-pdur="45"]');
 ok(!await pg.$eval('[data-plan-send]',b=>b.disabled),'PRIVATE with a city can be sent');
 // From my files: refused when landscape or too long, accepted when vertical.
 await pg.setInputFiles('#p-file',landscape);await pg.waitForFunction(()=>/Vertical/.test(document.getElementById('p-note')?.textContent));
 ok(!(await state(pg)).plan.video,'a landscape file is refused');
 await pg.setInputFiles('#p-file',long);await pg.waitForFunction(()=>/seconds/.test(document.getElementById('p-note')?.textContent));
 ok(!(await state(pg)).plan.video,'a file longer than the clip limit is refused');
 await pg.setInputFiles('#p-file',portrait);await pg.waitForFunction(()=>window.__totehm_space().plan.video);
 ok(await pg.locator('.plan-video video').count()===1,'a vertical file is previewed at the end of TOP');
 await pg.screenshot({path:out+'/space_top_private_city_video.png'});
 await pg.click('[data-plan-send]');await pg.waitForFunction(()=>window.__totehm_space().view==='list');await pg.waitForTimeout(300);
 let sched=calls.find(c=>c.name==='schedule'),attach=calls.find(c=>c.name==='attach');
 ok(sched.uploads===1 && Math.abs(sched.body.p_lat-41.15)<.1 && sched.body.p_city==='Porto' && sched.body.p_place==='Porto','order: the video is sent first; the space uses the city centre');
 ok(attach?.body.p_spot==='plan-1' && attach.body.p_video===log.upload[0].path.replace(/^moments\//,''),'then the video is attached to the new space');
 ok(!(await state(pg)).detail,'after I WILL BE HERE: the agenda, no duplicate sheet');
 await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().view==='radar');
 // SHARED·ON needs the exact point; OFF does not.
 await toPlan();await pg.click('[data-pvis="shared"]');await pg.click('[data-ploc="on"]');await pg.click('[data-pmode="silent"]');await pg.click('[data-pdur="30"]');
 ok(await pg.$eval('[data-plan-send]',b=>b.disabled) && /exact point/.test(await pg.textContent('#p-note')),'SHARED·ON without the exact point cannot be sent');
 await pg.click('[data-ploc="off"]');await pg.click('[data-pdur="30"]');
 ok(!await pg.$eval('[data-plan-send]',b=>b.disabled),'SHARED·OFF goes with the city only');
 ok(await pg.locator('[data-pwhy]').count()===2,'SHARED with a WHY · TRIGGER offers to show it (hidden by default)');
 await pg.click('[data-ploc="on"]');await pg.click('[data-pmode="social"]');await pg.click('[data-pwhy="1"]');await pg.click('[data-plan-place]');await pg.waitForTimeout(400);await pg.click('#place-use');await pg.waitForTimeout(400);
 ok((await state(pg)).plan.exact && !await pg.$eval('[data-plan-send]',b=>b.disabled),'the map point completes SHARED·ON (city AND map)');
 // Film it: the SPACE camera, then back to TOP with the clip.
 await pg.click('[data-plan-film="video"]');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='ready');
 ok(/future space/.test(await pg.textContent('#cam-body')),'Film it opens the camera for the future space');
 await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().view==='plan' && window.__totehm_space().plan.video,null,{timeout:20000});
 ok((await state(pg)).plan.exact && await pg.locator('.plan-video video').count()===1,'the clip returns to TOP and the draft is kept');
 const before=calls.length;await pg.click('[data-plan-send]');await pg.waitForFunction(()=>window.__totehm_space().view==='list');await pg.waitForTimeout(300);
 sched=calls.slice(before).find(c=>c.name==='schedule');attach=calls.slice(before).find(c=>c.name==='attach');
 ok(sched.uploads===2 && sched.body.p_location==='on' && sched.body.p_mode==='social' && attach?.body.p_spot==='plan-2','the filmed clip is uploaded, the space scheduled, then linked');
 ok(calls.slice(before).find(c=>c.name==='why')?.body.p_spot==='plan-2','WHY · TRIGGER shown on this space by its author');
 // RIGHT: inline gestures, WATCH unfolds the media in place, CALENDAR downloads an .ics, no sheet.
 await pg.waitForSelector('#list .it[data-id="fut-photo"]');
 await pg.click('#list .it[data-id="fut-plain"] .habit');await pg.waitForTimeout(300);ok(!(await state(pg)).detail,'RIGHT: tapping a box opens no duplicate sheet');
 ok(await pg.locator('#list .it[data-id="fut-photo"] [data-watch]').count()===1 && await pg.locator('#list .it[data-id="fut-plain"] [data-watch]').count()===0 && await pg.locator('#list [data-ics]').count()===2,'RIGHT: WATCH only with media, CALENDAR on every future space');
 await pg.click('#list .it[data-id="fut-photo"] [data-watch]');await pg.waitForSelector('#list .it[data-id="fut-photo"] .it-media img[data-photo]');
 ok(await pg.textContent('#list .it[data-id="fut-photo"] [data-watch]')==='HIDE','WATCH unfolds the photo inside the agenda');
 const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#list .it[data-id="fut-plain"] [data-ics]')]);const ics=fs.readFileSync(await dl.path(),'utf8');
 ok(dl.suggestedFilename()==='space.ics' && /BEGIN:VEVENT/.test(ics) && /SUMMARY:Run the hill/.test(ics) && /LOCATION:Lisbon/.test(ics) && !/GEO:/.test(ics),'CALENDAR: a real .ics, the city only when the point is not mine to see');
 await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().view==='radar');
 // LEFT: Habit Box + data block, filter beside the paper, no extra request.
 await pg.click('#cur-g');await pg.waitForFunction(()=>window.__totehm_space().view==='feed');await pg.waitForTimeout(500);
 ok(await pg.locator('#feed .info .habit').count()===4 && await pg.locator('#feed .info .sdata').count()===4,'LEFT: every space shows its Habit Box and the black/grey data');
 const box=await pg.$eval('#feed .info .sdata',e=>{const s=getComputedStyle(e);return {r:parseFloat(s.borderTopLeftRadius),m:parseFloat(s.marginTop)};});
 ok(box.r>=14 && box.m>=6,'the context box is rounder and detached from the Habit Box');
 ok(await pg.locator('#feed .clip[data-id="now-off"] img[data-photo]').count()===1,'a photo space plays in the feed like a Short');
 ok(/Beautiful skin/.test(await pg.textContent('#feed .clip[data-id="before-silent"] .habit')) && /Alcohol/.test(await pg.textContent('#feed .clip[data-id="before-silent"] .habit')),'a shown WHY · TRIGGER lives in the Habit Box');
 ok(await pg.$$eval('#feed button,#list button',l=>l.every(b=>!/[\[\]]/.test(b.textContent))) && await pg.$eval('#feed [data-go]',b=>b.className)==='btn' && await pg.locator('#feed [data-share]').count()===4,'GO is a button like SHARE; no brackets on any button');
 await pg.click('#feed .clip[data-id="now-on"] .habit');await pg.waitForTimeout(200);ok(!(await state(pg)).detail,'LEFT: tapping a box opens no duplicate sheet');
 const paper=await pg.$eval('#totehm-paper',e=>e.getBoundingClientRect().toJSON()),btn=await pg.$eval('#sf-btn',e=>e.getBoundingClientRect().toJSON());
 ok(await pg.isVisible('#sf-btn') && btn.x>paper.x+paper.width && Math.abs((btn.y+btn.height/2)-(paper.y+paper.height/2))<4,'the filter sits beside the Totehm paper');
 const discovers=log.rpc.filter(c=>c.name==='space_discover').length;
 await pg.click('#sf-btn');await pg.click('[data-sf-want="join"]');
 ok((await state(pg)).feed_shown===1 && /Filter · 1/.test(await pg.textContent('#sf-btn')),'I want to JOIN: happening now with an exact place');
 await pg.click('[data-sf-want="inspire"]');ok((await state(pg)).feed_shown===2,'GET INSPIRED: what people live around, in video or photo');
 await pg.click('[data-sf-shows="photo"]');ok((await state(pg)).feed_shown===1,'It shows PHOTO');
 await pg.click('[data-sf-want="inspire"]');await pg.click('[data-sf-shows="why"]');ok((await state(pg)).feed_shown===1,'It shows WHY · TRIGGER (the brand-deal format)');
 await pg.click('[data-sf-mode="social"]');ok((await state(pg)).feed_shown===0 && /no space for this filter/.test(await pg.textContent('#feed')),'WE CAN TALK then shows nothing, said plainly');
 await pg.click('[data-sf-all]');ok((await state(pg)).feed_shown===4 && (await state(pg)).spot_filter===0,'All spaces clears the filter');
 ok(log.rpc.filter(c=>c.name==='space_discover').length===discovers,'filtering costs no request');
 await pg.screenshot({path:out+'/space_left_filter.png'});
 await pg.keyboard.press('Escape');await pg.keyboard.press('Escape');
 // BOTTOM: sensor off on arrival; PHOTO → still → Habit → WHY → published as a .jpg.
 await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().view==='radar');
 await pg.click('#cur-b');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='idle');
 ok(!(await state(pg)).rec.camera && await pg.isVisible('[data-start="photo"]'),'BOTTOM: the camera sensor waits for a button');
 await pg.click('[data-start="photo"]');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='ready');
 ok((await state(pg)).rec.kind==='photo' && /take the photo/.test(await pg.textContent('#cam-body')) && await pg.isVisible('#cam-body [data-cancel]'),'PHOTO mode, with CANCEL');
 await pg.screenshot({path:out+'/space_bottom_photo.png'});
 await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='habit');
 ok(await pg.isVisible('#cam-photo') && !(await state(pg)).rec.camera,'the still is shown and the sensor is off again');
 await pg.click('[data-h="0"]');await pg.click('[data-vis="shared"]');await pg.click('[data-loc="off"]');await pg.click('[data-why="1"]');await pg.click('[data-dur="30"]');
 const ups=log.upload.length;await pg.click('[data-send]');await pg.waitForFunction(()=>window.__totehm_space().view==='radar');await pg.waitForTimeout(300);
 const made=calls.filter(c=>c.name==='create').at(-1);
 ok(log.upload.length===ups+1 && /\.jpg$/.test(log.upload.at(-1).path) && /\.jpg$/.test(made.body.p_video) && calls.filter(c=>c.name==='why').at(-1)?.body.p_spot==='made-'+id,'the photo is stored as .jpg, the space published, its WHY shown');
 await pg.keyboard.press('Escape');
 ok(!log.errors.some(e=>e.startsWith('pageerror')),'no JavaScript page errors');
 if(log.errors.length) console.log(log.errors.slice(0,5).join('\n'));
}finally{await browser.close();}
