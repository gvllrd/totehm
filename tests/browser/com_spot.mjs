// COM's new direct spot route reuses the real composer and same-origin session.
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/totehm-com-spot';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.com';
const habits=[{name:'Deep practice',freq:'daily',ints:['focus'],objectives:[{text:'Build a practice'}],repulsions:[]}];
const rpc={space_habits:{ok:true,habits},spot_rules:{duration_min:5,duration_max:720,horizon_days:90,clip_seconds:33},
  space_discover:{spots:[],more:false},spots_feed:{spots:[],more:false},
  my_landing:{signed_in:true,pseudo:'studio',visibility:'private',offer:{enabled:false}},
  my_trips:{signed_in:true,trips:[],reps:[],wisdom:[],visions:[]},habit_spaces:{ok:true,habits:[]}};
const browser=await launch();
try{
  {
    const {pg,log,ctx}=await page(browser,{dir:'com',origin,rpc,tables:{profiles:[{pseudo:'studio'}]}});
    await pg.goto(origin+'/spot?v=plan&habit=Deep%20practice&city=Lisbon');
    await pg.waitForFunction(()=>window.__totehm_spot?.().ready);
    const child=pg.frame({url:u=>String(u).includes('/x/club')});
    await child.waitForFunction(()=>window.__totehm_club?.().view==='plan');
    await child.waitForSelector('.plan-habit');
    ok(/Deep practice/.test(await child.textContent('#plan-body')),'COM direct creation retains the selected Habit');
    ok(pg.url().includes('/spot?')&&new URL(child.url()).origin===origin,'composer runs on COM with its existing session');
    ok(!log.functions.some(f=>f.name==='sso-mint'),'same-origin composer does not need an SSO bridge');
    await pg.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{origin:location.origin,source:window,data:{totehm:'x',ev:'close'}})));
    ok(pg.url().includes('/spot?'),'messages from another window cannot close the composer');
    await pg.screenshot({path:OUT+'/com-spot.png'});
    await child.click('#x-back');await pg.waitForURL(/\/totehm/);
    ok(new URL(pg.url()).pathname==='/totehm','closing returns to My TOTEHM');
    await ctx.close();
  }
  {
    const {pg,ctx}=await page(browser,{dir:'com',origin,rpc,session:false});
    await pg.goto(origin+'/spot?v=plan&habit=Deep%20practice');
    await pg.waitForFunction(()=>window.__totehm_spot?.().login);
    ok(pg.frames().some(f=>new URL(f.url()||origin).pathname==='/totehm'),'missing session opens the existing COM identity flow');
    ok(new URL(pg.url()).searchParams.get('habit')==='Deep practice','login retains the creation intent on the wrapper URL');
    await ctx.close();
  }
  {
    const {pg,log,ctx}=await page(browser,{dir:'com',origin,rpc,session:false});
    await pg.goto(origin+'/spot?v=plan#sso='+('a'.repeat(64))+'&state=wrong');
    await pg.waitForFunction(()=>window.__totehm_spot?.().login);
    ok(!log.functions.some(f=>f.name==='sso-redeem')&&!pg.url().includes('sso='),'mismatched PKCE state is removed and never redeemed');
    await ctx.close();
  }
}finally{await browser.close();}
