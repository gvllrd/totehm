// SPACE · 11/10/2026 — the social network of the strategic Habit: home in the centre, WATCH ←,
// SHARE ↓, MY SPACE →, VIBES ↑; the feed filtered by a Habit Box and all it is made of.
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
let lastFeed=null;
const rpc={spot_rules:{clip_seconds:2,clip_max_bytes:33554432,duration_min:5,duration_max:720,video_provider:'storage'},space_habits:{ok:true,habits},
 space_feed:b=>{lastFeed=b;return {ok:true,signed_in:true,spots:b.p_filter?.shows==='video'?feed.filter(s=>s.video):feed,more:false,filtered:!!b.p_filter?.habit};},
 space_pulse:{spaces_week:2,members_week:1,vibes_week:3},
 space_vibe:b=>({ok:true,vibed:b.p_on,vibes:b.p_on?1:0}),
 space_profile:b=>({ok:true,pseudo:b.p_pseudo||'wah',mine:!b.p_pseudo,spaces_total:feed.length,vibes_total:3,spaces:feed,more:false}),
 my_vibes:{ok:true,received:[{space:'live',habit:'Run the hill',by:'nia',at:iso(-5)}],received_total:1,given:[]},
 space_post:b=>{const s=spot('newclip',-1,{habit:b.p_habit,mine:true,video:b.p_video,location:'off',mode:'silent',duration_min:5,comment:b.p_comment,exact:null});feed.unshift(s);return{ok:true,id:s.id};},
 spot_box_set:{ok:true,objectives:true,repulsions:false,hidden:1},spot_get:b=>({ok:true,spot:feed.find(s=>s.id===b.p_id)})};

const browser=await launch({videoFile:process.env.SPACE_CAMERA_FIXTURE});
try{
 const {pg,log}=await page(browser,{dir:'space',origin,rpc,tables:{profiles:[{pseudo:'wah'}]},viewport:{width:1440,height:900}});
 const state=()=>pg.evaluate(()=>window.__totehm_space()), settle=()=>pg.waitForTimeout(400);
 const view=async v=>{await pg.waitForFunction(v=>window.__totehm_space().view===v,v);await settle();};
 const box=id=>pg.$eval('#'+id,e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
 async function drag(id,dx,dy){const r=await box(id),x=r.x+r.w/2,y=r.y+r.h/2;await pg.mouse.move(x,y);await pg.mouse.down();await pg.mouse.move(x+dx,y+dy,{steps:8});await pg.mouse.up();}
 await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_space?.().feed>0);await settle();
 // 12/10 : on arrive dans le FIL (pur TikTok) ; le pouls est à sa gauche
 ok((await state()).view==='feed','SPACE arrives in the feed (pure TikTok), not on a home page');
 ok(await pg.locator('.view').count()===5,'SPACE has five views: watch (centre), pulse, share, my space, vibes');
 await pg.keyboard.press('ArrowLeft');await view('home');
 ok(await pg.isVisible('#home-title')&&/social media/i.test(await pg.textContent('#home-title'))&&await pg.locator('#home-title svg use[href="#higher-badge"]').count()===1,'home reads [Higher] SOCIAL MEDIA, Higher as the SVG');
 ok(await pg.locator('#home-what').count()===0&&/2 spaces this week/i.test(await pg.textContent('#home-pulse')),'left of the feed: the weekly pulse, no sentence (12/10)');
 ok(await pg.locator('#home-eco [data-eco-door="com"]').count()===1&&await pg.locator('#home-eco [data-eco-door="club"]').count()===1,'home opens totehm.com and figher.club');
 ok(await pg.locator('#v-plan,#v-radar,#v-list,#v-spots,#spots-door,#find-spot,#canvas').count()===0,'no spot, radar, agenda or spots door on SPACE');
 ok((await state()).paper.alive===true,'the TOTEHM turns on the home');
 ok(await pg.locator('.joy-lab').count()===0,'no words around the joystick (12/10: the design speaks)');
 ok(!await pg.isVisible('#title')&&!await pg.isVisible('#int-def'),'no visible view headings');
 ok(!log.rpc.some(x=>x.name==='space_discover'||x.name==='spots_list'),'SPACE never reads the spot readers');
 // → back to WATCH, the centre
 await drag('joy-box',28,0);await view('feed');
 ok((await box('v-feed')).w===1440&&(await box('v-feed')).h===900,'desktop feed fills the viewport');
 ok((await state()).paper.alive===false,'the TOTEHM rests outside the home');
 ok(await pg.locator('#feed [data-go],#feed [data-ics]').count()===0&&!/5 min|location off|silent|until /i.test(await pg.textContent('#feed')),'feed has no spot actions or technical values');
 ok(await pg.locator('#feed [data-vibe]').count()===2,'every shared space of someone else has a VIBE');
 await pg.click('#totehm-paper');await pg.waitForSelector('#sf-panel:not(.hide)');
 ok(await pg.locator('[data-sf-pick]').count()===1&&await pg.locator('[data-sf-int]').count()===7&&await pg.locator('[data-sf-pillar]').count()===4,'filter: my Habit Box, the seven intentions, the four moods');
 await pg.click('[data-sf-pick]');await pg.waitForSelector('[data-filter-h]');
 const text=await pg.textContent('[data-filter-h="0"]');ok(['every morning','Hill trail','OBJECTIVES','Enjoy Lisbon together','REPULSIONS','Stay indoors'].every(x=>text.includes(x)),'Habit Box preserves all COM attributes');
 ok(await pg.locator('[data-filter-h="0"] .v-int[title]').count()===2,'exact intention definitions remain');
 await pg.click('[data-filter-h="0"]');await pg.waitForSelector('#sf-panel:not(.hide) [data-sf-obj]');await pg.waitForTimeout(500);
 const f=lastFeed.p_filter;
 ok(f.habit==='Run the hill'&&f.ints.join()==='love,fight'&&f.freq==='every_morning'&&f.objectives[0]==='Enjoy Lisbon together'&&f.repulsions[0]==='Stay indoors','a Habit Box lights ALL its elements in the filter');
 ok((await pg.textContent('#sf-btn'))==='Filter · 6','the filter counts the box, its intentions, rhythm, objective and repulsion');
 await pg.click('[data-sf-obj="0"]');await pg.waitForTimeout(450);ok(lastFeed.p_filter.objectives.length===0&&lastFeed.p_filter.repulsions.length===1,'each element switches off on its own');
 await pg.click('[data-sf-pillar="MENTAL"]');await pg.waitForTimeout(450);ok(['enrich','focus'].every(i=>lastFeed.p_filter.ints.includes(i)),'a mood brings its intentions');
 await pg.click('[data-sf-shows="video"]');await pg.waitForTimeout(450);ok(lastFeed.p_filter.shows==='video'&&(await state()).feed===1,'IT SHOWS is applied by the server');
 ok(lastFeed.p_filter.near===false&&lastFeed.p_lat===undefined,'the feed is the world by default, no location asked');
 await pg.click('[data-sf-all]');await pg.waitForTimeout(450);ok(lastFeed.p_filter.habit===null&&lastFeed.p_filter.ints.length===0,'ALL SPACES clears the filter');
 await pg.click('[data-sf-close]');
 await pg.click('#feed [data-vibe="live"]');await pg.waitForTimeout(300);
 ok(log.rpc.some(x=>x.name==='space_vibe'&&x.body.p_space==='live'&&x.body.p_on===true)&&(await pg.textContent('#feed [data-vibe="live"]'))==='VIBE · 1'&&(await pg.getAttribute('#feed [data-vibe="live"]','aria-pressed'))==='true','VIBE is one tap, its count follows');
 await pg.click('#feed [data-profile="nia"]');await view('me');
 ok(log.rpc.some(x=>x.name==='space_profile'&&x.body.p_pseudo==='nia')&&/nia/.test(await pg.textContent('#profile'))&&await pg.locator('#profile [data-com="/@nia"]').count()===1,"an author's name opens their space, and their TOTEHM from there");
 await pg.click('[data-profile-me]');await pg.waitForTimeout(400);ok(log.rpc.filter(x=>x.name==='space_profile').at(-1).body.p_pseudo===null,'MY SPACE returns to mine');
 ok(await pg.locator('#profile .pf-tile').count()===feed.length,'my space is a grid of my spaces');
 await pg.click('#joy-box');await view('feed');
 // ↑ VIBES
 await pg.keyboard.press('ArrowUp');await view('vibes');
 ok(/nia/.test(await pg.textContent('#vibes'))&&/vibed/.test(await pg.textContent('#vibes')),'VIBES lists who vibed my spaces');
 await pg.keyboard.press('ArrowDown');await view('feed');
 await pg.keyboard.press('ArrowRight');await view('me');await pg.keyboard.press('ArrowLeft');await view('feed');
 await pg.mouse.move(740,400);for(let i=0;i<10;i++)await pg.mouse.wheel(-10,0);await view('home');await pg.keyboard.press('ArrowRight');await view('feed');
 // ↓ SHARE : the camera, then the space
 await pg.click('#cur-b');await view('cam');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='idle');
 ok(!(await state()).rec.camera,'camera entry leaves sensor off');
 ok(/not yourself/.test(await pg.textContent('#cam-body')),'the camera says: the place, not yourself, no added music');
 await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='ready');await pg.waitForTimeout(900);
 ok((await state()).rec.step==='ready','sensor waits for explicit recording');
 const centered=()=>pg.evaluate(()=>{const b=document.querySelector('#joy-box').getBoundingClientRect(),e=document.querySelector('#joy-record'),r=e.getBoundingClientRect(),s=getComputedStyle(e);return{x:Math.abs(r.x+r.width/2-b.x-b.width/2),y:Math.abs(r.y+r.height/2-b.y-b.height/2),color:s.backgroundColor,radius:s.borderRadius,w:r.width,h:r.height};});
 let rec=await centered();ok(rec.x<.1&&rec.y<.1&&rec.color==='rgb(116, 49, 105)'&&rec.radius==='50%','record point stays centered with its original color');
 await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='rec');await pg.waitForFunction(()=>getComputedStyle(document.querySelector('#joy-record')).borderRadius==='3px');
 rec=await centered();ok(rec.x<.1&&rec.y<.1&&Math.abs(rec.w-19)<.1&&Math.abs(rec.h-19)<.1,'same point becomes the original stop square');
 await pg.waitForFunction(()=>window.__totehm_space().rec.step==='habit');
 await pg.click('[data-h="0"]');await pg.waitForFunction(()=>!document.querySelector('[data-send]')?.disabled);
 ok(await pg.locator('[data-vis],[data-loc],[data-mode],[data-dur],#c-dur').count()===0&&!/WHERE|DURATION|Location|Together/.test(await pg.textContent('#cam-body')),'space publisher has no spot controls');
 ok(await pg.locator('#cam-body [data-box-el]').count()===3&&await pg.locator('#cam-body .is-off').count()===0&&await pg.locator('#cam-body [data-box-group]').count()===0,'the Habit Box arrives AS IT IS: its objective, its repulsion, its rhythm, all on (12/10)');
 await pg.click('#cam-body [data-box-el="r"]');
 ok(await pg.locator('#cam-body [data-box-el="r"]').getAttribute('aria-pressed')==='false'&&await pg.locator('#cam-body .mini.m-r.is-off').count()===1&&await pg.locator('#cam-body .mini.m-o.is-off').count()===0,'a tap switches off ONE element, the others stay on');
 const btn=await pg.$eval('[data-send]',e=>e.offsetWidth);ok(btn<200,'publish button fits its text');
 await pg.fill('#c-say','Bring focus');await pg.click('[data-send]');await view('feed');
 const created=log.rpc.find(x=>x.name==='space_post');ok(created&&Object.keys(created.body).length===6&&created.body.p_city==='Lisbon','space_post receives exactly its six arguments and city');
 ok(created.body.p_comment==='Bring focus'&&created.body.p_habit==='Run the hill','publication preserves Habit and comment');
 ok(log.rpc.some(x=>x.name==='spot_box_set'&&x.body.p_hide.repulsions.join()==='Stay indoors'&&!x.body.p_hide.objectives.length&&x.body.p_hide.freq===false),'publication sends what was switched off, by text (spot_box_set)');
 ok(log.upload.some(x=>x.method==='POST'),'private Storage media upload still works');
 ok(!log.rpc.some(x=>['spot_create','spot_schedule','space_discover','spots_list'].includes(x.name)),'SPACE never calls spot writers or spot readers');
 await pg.keyboard.press('Escape');await pg.setViewportSize({width:390,height:844});await settle();
 ok((await box('v-feed')).w===390&&(await box('v-feed')).h===844,'mobile feed fills viewport');
 const client=await pg.context().newCDPSession(pg);async function swipe(x,y,dx,dy){await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let k=1;k<=9;k++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*k/9,y:y+dy*k/9}]});await pg.waitForTimeout(14);}await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 if((await state()).view!=='feed'){await pg.keyboard.press('Escape');await view('feed');}
 await swipe(200,450,110,8);await view('home');ok((await state()).view==='home','touch swipe right from the feed shows the pulse');await swipe(200,450,-110,8);await view('feed');
 await pg.$eval('#feed',e=>e.scrollTo({top:0,behavior:'instant'}));await settle();const before=await pg.$eval('#feed',e=>e.scrollTop);await swipe(200,720,0,-600);await settle();ok((await state()).view==='feed'&&await pg.$eval('#feed',e=>e.scrollTop)>before,'native vertical feed scrolling stays in feed');
 await pg.screenshot({path:OUT+'/space_feed_mobile.png'});
 ok(!log.errors.some(x=>x.startsWith('pageerror')),'SPACE has no JavaScript page errors');
 fs.writeFileSync(OUT+'/space_results.json',JSON.stringify({state:await state(),errors:log.errors,checks:log.rpc.length},null,2));
}finally{await browser.close();}
