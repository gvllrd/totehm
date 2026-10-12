// figher.club · 11/10/2026 (bis) — SPACE → SPOT: the Club receives a space's Habit (and my city);
// an agenda with no spot for that Habit offers PLAN ONE; signed out, the plan keeps the Habit for
// after the sign-in. The centre says [Higher] SPOTS and its why, like totehm.com and totehm.space.
// Accounts and RPCs are mocked; nothing reaches production.
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/club-from-space';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.figher.club';
const habits=[{name:'Read at dawn',freq:'daily',ints:['focus'],objectives:[],repulsions:[]},{name:'Run the hill',freq:'every_morning',ints:['love','fight'],objectives:[],repulsions:[]}];
const rpc={spot_rules:{clip_seconds:33,duration_min:5,duration_max:720,horizon_days:90},space_habits:{ok:true,habits},space_discover:{spots:[],more:false},spots_feed:{spots:[],more:false}};
const state=pg=>pg.evaluate(()=>window.__totehm_club());
const browser=await launch();
try{
 // 1 · mon space devient un spot : le plan s'ouvre, Habit et ville posées
 {const {pg,log}=await page(browser,{dir:'club',origin,rpc});
  await pg.goto(origin+'/?v=plan&habit=read%20at%20dawn&city=Lisbon');await pg.waitForFunction(()=>window.__totehm_club?.().view==='plan');
  await pg.waitForSelector('#plan-body .plan-habit');await pg.click('#plan-body [data-pmode="silent"]');await pg.waitForFunction(()=>document.querySelector('#p-city')?.value==='Lisbon',null,{timeout:8000}).catch(()=>{});
  ok(/Read at dawn/.test(await pg.textContent('#plan-body .plan-habit')),'SPACE → SPOT: the plan opens on the Habit of my space (case does not matter)');
  ok(await pg.inputValue('#p-city').catch(()=>'')==='Lisbon','…and on its city');
  await pg.screenshot({path:OUT+'/club_plan_from_space.png'});
  ok(!log.errors.some(e=>e.startsWith('pageerror')),'plan from a space: no JavaScript error');
  await pg.context().close();}
 // 2 · le space d'un autre : l'agenda de cette Habit ; vide → PLAN ONE
 {const {pg,log}=await page(browser,{dir:'club',origin,rpc});
  await pg.goto(origin+'/?v=list&habit=Swim%20the%20bay');await pg.waitForFunction(()=>window.__totehm_club?.().view==='list');await pg.waitForTimeout(600);
  ok(log.rpc.some(c=>c.name==='space_discover'&&c.body.p_view==='list'&&c.body.p_habit==='Swim the bay'),'the agenda reads the spots of THIS Habit');
  ok(/no spot for this Habit yet/i.test(await pg.textContent('#list'))&&await pg.locator('#list [data-plan-one]').count()===1,'no spot yet: PLAN ONE');
  await pg.click('#list [data-plan-one]');await pg.waitForFunction(()=>window.__totehm_club().view==='plan');await pg.waitForSelector('#plan-body [data-plan-h]');
  ok(await pg.locator('#plan-body .plan-habit').count()===0&&await pg.locator('#plan-body [data-plan-h]').count()===2,'a Habit I do not have: the plan asks which of MY Habit Boxes');
  await pg.context().close();}
 // 3 · déconnecté : la vue plan garde la Habit jusqu'après la connexion
 {const auth=[];const {pg}=await page(browser,{dir:'club',origin,rpc,session:false,network:async url=>{if(url.host==='www.totehm.com'){auth.push(url.href);return {status:200,contentType:'text/html',body:'<!doctype html>'};}return null;}});
  await pg.goto(origin+'/?v=plan&habit=Run%20the%20hill');await pg.waitForFunction(()=>window.__totehm_club?.().view==='plan');await pg.waitForSelector('[data-plan-signin]');
  await pg.click('[data-plan-signin]');await pg.waitForTimeout(800);
  const ret=auth.length?new URL(auth.at(-1)).searchParams.get('return'):'';
  ok(/^\/\?/.test(ret)&&new URLSearchParams(ret.slice(2)).get('habit')==='Run the hill'&&new URLSearchParams(ret.slice(2)).get('v')==='plan','signed out: CONNECT keeps the Habit in the return path ('+ret+')');
  await pg.context().close();}
 // 4 · le centre : [Higher] SPOTS + le pourquoi
 {const {pg}=await page(browser,{dir:'club',origin,rpc,session:false});
  await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_club?.().view==='radar');await pg.waitForTimeout(500);
  ok(await pg.isVisible('#club-title')&&await pg.locator('#club-title svg use[href="#higher-badge"]').count()===1&&/spots/i.test(await pg.textContent('#club-title b'))&&await pg.locator('#club-title p').count()===0,'the centre reads [Higher] SPOTS, nothing else (12/10: the design speaks)');
  const r=(await state(pg)).radar,t=await pg.$eval('#club-title',e=>e.getBoundingClientRect().bottom);
  ok(r.cy-r.radius>t,'the radar sits below the title, never under it');
  await pg.screenshot({path:OUT+'/club_centre.png'});
  await pg.context().close();}
}finally{await browser.close();}
