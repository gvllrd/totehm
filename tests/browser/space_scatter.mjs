// SPACE · 11/10/2026 (bis) — the Habit Box scattered into Totehm boxes (navy Habit, blue
// objectives, red-violet repulsions, no labels); a box opens its HORIZON; the rail VIBE · SPOT ·
// SHARE; SPOT turns a space into a spot on figher.club; SHARE gives /s/<id>; fewer words.
// Accounts, feed and bridges are mocked; nothing reaches production.
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/space-scatter';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',now=Date.now(),iso=m=>new Date(now+m*60000).toISOString();
const V='22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.webm';
const sp=(id,start,extra={})=>({id,format:'space',habit:'Run the hill',freq:'every_morning',intentions:['love','fight'],visibility:'shared',mode:'silent',location:'off',city:'Lisbon',starts_at:iso(start),ends_at:iso(start+5),duration_min:5,creator:'nia',mine:false,video:V,exact:null,vibes:4,vibed:false,...extra});
const why={objectives:[{text:'Run the Lisbon marathon'},{text:'Sleep before 23h'}],repulsions:[{text:'Staying indoors all weekend'}]};
const base=[sp('a',-10,{why,comment:'sunrise, wind, my breath',matched:['habit','objective']}),sp('b',-60,{mine:true,creator:'wah',vibes:2,habit:'Read at dawn'}),sp('c',-90)];
const horizon=[sp('h1',-5,{habit:'Swim the bay',why:{objectives:[{text:'Run the Lisbon marathon'}],repulsions:[]}})];
const calls=[];
const rpc={spot_rules:{clip_seconds:2,duration_min:5,duration_max:720,video_provider:'storage'},space_habits:{ok:true,habits:[]},space_pulse:{spaces_week:12,members_week:5,vibes_week:31},
 space_feed:b=>{calls.push(b.p_filter);const f=b.p_filter||{};return {ok:true,signed_in:true,spots:(f.objectives?.length||f.repulsions?.length||f.habit)?horizon:base,more:false,filtered:!!(f.habit||f.objectives?.length)};}};
const toClub=[];
const network=async url=>{if(url.host==='www.figher.club'){toClub.push(url.href);return {status:200,contentType:'text/html',body:'<!doctype html><title>club</title>'};}return null;};
const browser=await launch();
try{
 const {pg,log}=await page(browser,{dir:'space',origin,rpc,network,functions:{'sso-mint':{code:'a'.repeat(64)}},tables:{profiles:[{pseudo:'wah'}]},viewport:{width:390,height:844},hasTouch:true});
 const state=()=>pg.evaluate(()=>window.__totehm_space());
 const words=()=>pg.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').trim().split(' ').filter(Boolean).length);
 await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_space?.().view==='home');await pg.waitForTimeout(600);
 const homeWords=await words();
 ok(homeWords<=45&&await pg.locator('#space-about').count()===0,'home says SPACE in few words ('+homeWords+'), no « What is a space? »');
 await pg.goto(origin+'/?v=feed');await pg.waitForFunction(()=>window.__totehm_space?.().feed===3);await pg.waitForTimeout(600);
 const card=pg.locator('#feed .clip[data-id="a"]');
 const colours=await card.evaluate(c=>({h:getComputedStyle(c.querySelector('.habit .h-body')).backgroundColor,o:[...c.querySelectorAll('.el-o')].map(e=>getComputedStyle(e).backgroundColor),r:[...c.querySelectorAll('.el-r')].map(e=>getComputedStyle(e).backgroundColor),
   x:[...c.querySelectorAll('.el')].map(e=>getComputedStyle(e).marginLeft),text:c.innerText}));
 ok(colours.h==='rgb(51, 51, 102)'&&colours.o.length===2&&colours.o.every(x=>x==='rgb(54, 73, 140)')&&colours.r.length===1&&colours.r[0]==='rgb(116, 49, 105)','the Habit stays navy; each objective a blue box, each repulsion a red-violet box (Totehm format)');
 ok(new Set(colours.x).size>=2,'the boxes are scattered, not stacked in one column ('+colours.x.join(' ')+')');
 ok(!/OBJECTIVES|REPULSIONS|same habit/i.test(colours.text),'no labels and no « same habit » line: the colour says the type');
 ok(await card.locator('.rail [data-vibe]').count()===1&&await card.locator('.rail [data-spot-it]').count()===1&&await card.locator('.rail [data-share]').count()===1,'the rail: VIBE · SPOT · SHARE');
 const mine=pg.locator('#feed .clip[data-id="b"]');
 ok(await mine.locator('[data-vibe]').count()===0&&/2 vibes/i.test(await mine.locator('.rail').textContent())&&await mine.locator('[data-spot-it]').count()===1,'my space: its vibes counted, SPOT, never a vibe on my own');
 await pg.screenshot({path:OUT+'/space_scatter.png'});
 // l'horizon d'un objectif
 await card.locator('.el-o').first().click();await pg.waitForFunction(()=>window.__totehm_space().horizon&&window.__totehm_space().feed===1);
 const last=calls.at(-1);
 ok(last.objectives.length===1&&last.objectives[0]==='Run the Lisbon marathon'&&!last.habit&&!last.ints.length,'a blue box opens its horizon: the spaces that share THIS objective');
 ok(await pg.isVisible('#hz')&&(await pg.textContent('#hz-el'))==='Run the Lisbon marathon'&&await pg.$eval('#hz-el',e=>e.classList.contains('el-o'))&&!await pg.isVisible('#sf-btn'),'the horizon shows its box, in its colour; the filter steps aside');
 await pg.screenshot({path:OUT+'/space_horizon.png'});
 await pg.click('#hz-x');await pg.waitForFunction(()=>!window.__totehm_space().horizon&&window.__totehm_space().feed===3);
 ok(await pg.isVisible('#sf-btn')&&await pg.locator('#feed .clip[data-id="a"]').count()===1,'✕ gives the feed back as it was');
 await pg.locator('#feed .clip[data-id="a"] .hz-h').click();await pg.waitForFunction(()=>window.__totehm_space().horizon);
 ok(calls.at(-1).habit==='Run the hill'&&(await pg.$eval('#hz-el',e=>e.className))==='hz-hb','the navy box opens the horizon of its Habit');
 await pg.keyboard.press('Escape');await pg.waitForFunction(()=>!window.__totehm_space().horizon);
 ok((await state()).view==='feed','Escape closes the horizon first, the feed stays');
 // SHARE → /s/<id>
 await pg.evaluate(()=>{navigator.share=d=>{window.__shared=d;return Promise.resolve();};});
 await pg.locator('#feed .clip[data-id="a"] [data-share]').click();await pg.waitForTimeout(200);
 ok(await pg.evaluate(()=>window.__shared?.url)==='https://www.totehm.space/s/a','SHARE gives the preview link /s/<id>');
 // SPOT : celui d'un autre → les spots de cette Habit ; le mien → le plan, Habit et ville posées
 await pg.locator('#feed .clip[data-id="a"] [data-spot-it]').click();await pg.waitForTimeout(800);
 const u1=toClub.at(-1)?new URL(toClub.at(-1)):null;
 ok(u1&&u1.searchParams.get('v')==='list'&&u1.searchParams.get('habit')==='Run the hill'&&!u1.searchParams.get('city')&&log.functions.some(f=>f.name==='sso-mint'&&f.body.target==='club'),'SPOT on a space of someone else → figher.club, the spots of this Habit, through the bridge');
 ok(!log.errors.some(e=>e.startsWith('pageerror')),'no JavaScript error '+log.errors.filter(e=>e.startsWith('pageerror')).join(' | '));
 await pg.context().close();
 {const {pg}=await page(browser,{dir:'space',origin,rpc,network,functions:{'sso-mint':{code:'b'.repeat(64)}},tables:{profiles:[{pseudo:'wah'}]},viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/?v=feed');await pg.waitForFunction(()=>window.__totehm_space?.().feed===3);await pg.waitForTimeout(400);
  await pg.locator('#feed .clip[data-id="b"] [data-spot-it]').click();await pg.waitForTimeout(800);
  const u2=new URL(toClub.at(-1));
  ok(u2.searchParams.get('v')==='plan'&&u2.searchParams.get('habit')==='Read at dawn'&&u2.searchParams.get('city')==='Lisbon','SPOT on my space → the plan of a spot, my Habit and my city already set');
  await pg.context().close();}
}finally{await browser.close();}
