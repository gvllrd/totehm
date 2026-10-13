// SPACE · 12/10/2026 — what comes from the TOTEHM stays in TOTEHM format (Wah).
// Feed: the Habit Box stays whole (objectives and repulsions INSIDE, as in COM); an element opens its
// horizon. Publication: the box arrives AS IT IS, every mini-box and the rhythm on; a tap switches one
// off, a tap switches it back on; then SPACE's own controls. The rail VIBE · SPOT · SHARE stays.
// Accounts, feed, camera and bridges are mocked; nothing reaches production.
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/space-box';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',now=Date.now(),iso=m=>new Date(now+m*60000).toISOString();
const V='22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.webm';
const sp=(id,start,extra={})=>({id,format:'space',habit:'Run the hill',freq:'every_morning',intentions:['love','fight'],visibility:'shared',mode:'silent',location:'off',city:'Lisbon',starts_at:iso(start),ends_at:iso(start+5),duration_min:5,creator:'nia',mine:false,video:V,exact:null,vibes:4,vibed:false,...extra});
const why={objectives:[{text:'Run the Lisbon marathon'},{text:'Sleep before 23h'}],repulsions:[{text:'Staying indoors all weekend'}]};
const base=[sp('a',-10,{why,comment:'sunrise, wind, my breath'}),sp('b',-60,{mine:true,creator:'wah',vibes:2,habit:'Read at dawn'})];
const horizon=[sp('h1',-5,{habit:'Swim the bay',why:{objectives:[{text:'Run the Lisbon marathon'}],repulsions:[]}})];
const habits=[{name:'Run the hill',freq:'every_morning',ints:['love','fight'],place:'Hill trail',step:{t:'Run the hill',f:'every_morning',is:['love','fight']},objectives:[{text:'Run the Lisbon marathon'},{text:'Sleep before 23h'}],repulsions:[{text:'Staying indoors all weekend'}]}];
const calls=[];
const rpc={spot_rules:{clip_seconds:2,duration_min:5,duration_max:720,video_provider:'storage'},space_habits:{ok:true,habits},space_pulse:{spaces_week:12,members_week:5,vibes_week:31},
 space_feed:b=>{calls.push(b.p_filter);const f=b.p_filter||{};return {ok:true,signed_in:true,spots:(f.objectives?.length||f.repulsions?.length||f.habit)?horizon:base,more:false,filtered:!!(f.habit||f.objectives?.length)};},
 space_post_audience:b=>({ok:true,id:'new-space'}),spot_box_set:{ok:true,objectives:true,repulsions:false,hidden:2},spot_get:b=>({ok:true,spot:sp(b.p_id,-1,{mine:true})})};
const browser=await launch();
try{
 const {pg,log}=await page(browser,{dir:'space',origin,rpc,tables:{profiles:[{pseudo:'wah'}]},viewport:{width:390,height:844},hasTouch:true});
 const state=()=>pg.evaluate(()=>window.__totehm_space());
 await pg.goto(origin+'/?v=feed');await pg.waitForFunction(()=>window.__totehm_space?.().feed===2);await pg.waitForTimeout(600);
 const card=pg.locator('#feed .clip[data-id="a"]');
 const box=await card.evaluate(c=>{const h=c.querySelector('.habit');return {minisInside:h.querySelectorAll('.mini.m-o').length+'/'+h.querySelectorAll('.mini.m-r').length,
   labels:[...h.querySelectorAll('.mg-l')].map(e=>e.textContent).join(','),navy:getComputedStyle(h.querySelector('.h-body')).backgroundColor,outside:c.querySelectorAll('.el,.scatter').length};});
 ok(box.minisInside==='2/1'&&box.labels==='OBJECTIVES,REPULSIONS'&&box.navy==='rgb(51, 51, 102)'&&box.outside===0,'the feed keeps the Habit Box WHOLE: objectives and repulsions inside, as in COM');
 ok(await card.locator('.rail [data-vibe]').count()===1&&await card.locator('.rail [data-spot-it]').count()===1&&await card.locator('.rail [data-share]').count()===1,'beside the box, in SPACE format: VIBE · SPOT · SHARE');
 await pg.screenshot({path:OUT+'/space_box_feed.png'});
 await card.locator('.habit .mini.m-o').first().click();await pg.waitForFunction(()=>window.__totehm_space().horizon&&window.__totehm_space().feed===1);
 ok(calls.at(-1).objectives[0]==='Run the Lisbon marathon'&&(await pg.$eval('#hz-el',e=>e.className))==='mini m-o','an objective inside the box opens its horizon, shown as its blue mini-box');
 await pg.click('#hz-x');await pg.waitForFunction(()=>!window.__totehm_space().horizon&&window.__totehm_space().feed===2);
 await pg.locator('#feed .clip[data-id="a"] .habit .v-name').click();await pg.waitForFunction(()=>window.__totehm_space().horizon);
 ok(calls.at(-1).habit==='Run the hill','the Habit itself opens the horizon of the Habit');
 await pg.keyboard.press('Escape');await pg.waitForFunction(()=>!window.__totehm_space().horizon);
 ok(!log.errors.some(e=>e.startsWith('pageerror')),'feed: no JavaScript error '+log.errors.filter(e=>e.startsWith('pageerror')).join(' | '));
 await pg.context().close();
 // ── la publication : la box telle quelle, un tap éteint, un tap rallume ──
 {const {pg,log}=await page(browser,{dir:'space',origin,rpc,tables:{profiles:[{pseudo:'wah'}]},viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/?v=cam');await pg.waitForFunction(()=>window.__totehm_space?.().view==='cam');await pg.waitForSelector('[data-start="photo"]');
  await pg.click('[data-start="photo"]');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='shot'||window.__totehm_space().rec.step==='ready',null,{timeout:15000});
  await pg.click('#joy-box');await pg.waitForFunction(()=>window.__totehm_space().rec.step==='habit',null,{timeout:15000});
  await pg.click('[data-h="0"]');await pg.waitForSelector('#cam-body [data-box-el]');
  const all=await pg.evaluate(()=>({els:document.querySelectorAll('#cam-body [data-box-el]').length,off:document.querySelectorAll('#cam-body .is-off').length,place:/Hill trail/.test(document.querySelector('#cam-body').textContent),labels:document.querySelectorAll('#cam-body .mg-l').length}));
  ok(all.els===4&&all.off===0&&all.labels===2,'the box arrives as it is: 2 objectives, 1 repulsion, its rhythm — all on');
  ok(!all.place,'the usual place (never published) is not in the box being published');
  await pg.click('#cam-body .mini.m-o >> nth=1');await pg.click('#cam-body .v-frq[data-box-el="f"]');
  ok(await pg.locator('#cam-body .is-off').count()===2&&(await pg.locator('#cam-body .mini.m-o >> nth=1').getAttribute('aria-pressed'))==='false'&&(await pg.evaluate(()=>window.__totehm_space().rec.step))==='form','a tap switches off one objective and the rhythm, the box stays');
  await pg.click('#cam-body .mini.m-r');await pg.click('#cam-body .mini.m-r');
  ok(await pg.locator('#cam-body .mini.m-r.is-off').count()===0,'a second tap switches it back on');
  await pg.screenshot({path:OUT+'/space_box_publish.png'});
  ok(await pg.locator('#c-say').count()===1&&await pg.locator('[data-send]').count()===1,'then SPACE\'s own controls: a word, SHARE');
  await pg.waitForFunction(()=>!document.querySelector('[data-send]')?.disabled,null,{timeout:15000});
  await pg.click('[data-send]');await pg.waitForFunction(()=>window.__totehm_space().view==='feed',null,{timeout:20000});
  const set=log.rpc.find(x=>x.name==='spot_box_set');
  ok(set&&set.body.p_spot==='new-space'&&set.body.p_hide.objectives.join()==='Sleep before 23h'&&!set.body.p_hide.repulsions.length&&set.body.p_hide.freq===true,'published: spot_box_set receives what was switched off, by text');
  ok(!log.rpc.some(x=>x.name==='spot_box_visibility_set'),'the old group switches are gone');
  ok(!log.errors.some(e=>e.startsWith('pageerror')),'publication: no JavaScript error '+log.errors.filter(e=>e.startsWith('pageerror')).join(' | '));
  await pg.context().close();}
}finally{await browser.close();}
