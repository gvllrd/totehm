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

const origin='https://www.totehm.space',now=Date.now(),iso=m=>new Date(now+m*60000).toISOString();
const habit={name:'Run the hill',freq:'every_morning',ints:['love','fight'],step:{t:'Run the hill',f:'every_morning',is:['love','fight']},objectives:[{text:'Beautiful skin'}],repulsions:[{text:'Alcohol'}]};
const make=(id,start,extra={})=>({id,format:'space',habit:habit.name,freq:habit.freq,intentions:habit.ints,visibility:'shared',location:'on',mode:'social',creator:'nia',mine:false,city:'Lisbon',starts_at:iso(start),ends_at:iso(start+60),duration_min:60,video:null,exact:null,...extra});
const U='22222222-2222-4222-8222-222222222222',V=U+'/33333333-3333-4333-8333-333333333333.webm',P=U+'/44444444-4444-4444-8444-444444444444.jpg';
const why={objectives:[{text:'Beautiful skin'}],repulsions:[{text:'Alcohol'}]};
const feed=[make('now-on',-10,{video:V}),make('now-off',-20,{location:'off',mode:null,photo:P}),make('before-silent',-300,{mode:'silent',why}),make('before-off',-400,{location:'off',mode:null})];
const future=[make('fut-plain',900,{format:'spot'})];
const state=pg=>pg.evaluate(()=>window.__totehm_space());

const browser=await launch();
try{
 const calls=[];let id=0;
 const rpc={spot_rules:{clip_seconds:2,duration_min:5,duration_max:720,video_provider:'storage'},space_habits:{ok:true,habits:[habit]},space_discover:{spots:feed,more:false},spots_list:{spots:future},space_post:b=>{calls.push({name:'create',body:b});return{ok:true,id:'made-'+(++id)};},spot_box_visibility_set:b=>{calls.push({name:'boxes',body:b});return{ok:true};},spot_get:b=>({ok:true,spot:make(b.p_id,-1,{mine:true})})};
 const {pg,log}=await page(browser,{dir:'space',origin,rpc,tables:{profiles:[{pseudo:'wah'}]},viewport:{width:390,height:844}});
 await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_space?.().feed===4);await pg.waitForTimeout(600);
 await pg.click('#totehm-paper');await pg.waitForSelector('[data-filter-h]');
 const pk=await pg.$eval('#habit-picker',e=>e.getBoundingClientRect().toJSON());ok(pk.x===0&&pk.y===0&&pk.width===390&&pk.height===844,'phone Habit choice is full screen');await pg.click('[data-picker-close]');
 ok(await pg.locator('#v-plan,#v-radar,#v-list').count()===0,'removed views never load');
 ok(await pg.locator('#feed .info .habit').count()===4&&await pg.locator('#feed .info .sdata').count()===0,'each space shows its Habit without technical spot data');
 ok(await pg.locator('#feed .clip[data-id="now-off"] img[data-photo]').count()===1,'photo appears in the feed');
 ok(/Beautiful skin/.test(await pg.textContent('#feed .clip[data-id="before-silent"] .habit'))&&/Alcohol/.test(await pg.textContent('#feed .clip[data-id="before-silent"] .habit')),'shown WHY and TRIGGER remain inside Habit Box');
 ok(await pg.$$eval('#feed button',l=>l.every(b=>!/[\[\]]/.test(b.textContent)))&&await pg.locator('#feed [data-share]').count()===4&&await pg.locator('#feed [data-go],[data-ics]').count()===0,'SHARE stays inline; spot actions are absent');
 await pg.locator('#feed .clip[data-id="now-on"] .habit').evaluate(e=>e.click());await pg.waitForTimeout(200);ok(!(await state(pg)).detail,'tapping a feed box opens no duplicate sheet');
 const paper=await pg.$eval('#totehm-paper',e=>e.getBoundingClientRect().toJSON()),btn=await pg.$eval('#sf-btn',e=>e.getBoundingClientRect().toJSON());
 ok(await pg.isVisible('#sf-btn')&&btn.x>paper.x+paper.width&&Math.abs(btn.y+btn.height/2-paper.y-paper.height/2)<4,'filter stays beside paper');
 const discovers=log.rpc.filter(x=>x.name==='space_discover').length;
 await pg.click('#sf-btn');await pg.click('[data-sf-shows="photo"]');ok((await state(pg)).feed_shown===1,'PHOTO filters independently');
 await pg.click('[data-sf-shows="why"]');ok((await state(pg)).feed_shown===1,'WHY and TRIGGER filters independently');
 await pg.click('[data-sf-shows="video"]');ok((await state(pg)).feed_shown===1,'VIDEO filters independently');
 ok(await pg.locator('[data-sf-want],[data-sf-mode]').count()===0,'no meeting filters in SPACE');
 await pg.click('[data-sf-all]');ok((await state(pg)).feed_shown===4&&(await state(pg)).spot_filter===0,'ALL SPACES clears filter');
 ok(log.rpc.filter(x=>x.name==='space_discover').length===discovers,'filtering requires no additional read');await pg.keyboard.press('Escape');
 await pg.click('#cur-b');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='idle');
 ok(!(await state(pg)).rec.camera&&await pg.isVisible('[data-start="photo"]'),'sensor waits for explicit PHOTO');
 await pg.click('[data-start="photo"]');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='ready');
 ok((await state(pg)).rec.kind==='photo'&&/take the photo/.test(await pg.textContent('#cam-body'))&&await pg.isVisible('#cam-body [data-cancel]'),'PHOTO mode preserves CANCEL');
 await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='habit');
 ok(await pg.isVisible('#cam-photo')&&!(await state(pg)).rec.camera,'captured still appears and camera stops');
 await pg.click('[data-h="0"]');await pg.click('[data-box-group="objectives"]');await pg.waitForFunction(()=>!document.querySelector('[data-send]')?.disabled);
 const ups=log.upload.length;await pg.click('[data-send]');await pg.waitForFunction(()=>window.__totehm_space().view==='feed');await pg.waitForTimeout(300);
 const made=calls.find(x=>x.name==='create');ok(log.upload.length===ups+1&&/\.jpg$/.test(log.upload.at(-1).path)&&/\.jpg$/.test(made.body.p_video)&&calls.find(x=>x.name==='boxes')?.body.p_objectives===true,'photo uploads as owned jpg and publishes selected WHY');
 ok(made.body.p_city==='Lisbon'&&Object.keys(made.body).length===6,'photo uses the space_post contract');
 ok(!log.errors.some(x=>x.startsWith('pageerror')),'SPACE photo and filter have no JavaScript page errors');
}finally{await browser.close();}
