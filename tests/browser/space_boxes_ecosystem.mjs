// Product checks: displayed Box data, independent mini-boxes, definition and central SSO.
// 06/10 (Wah): a small magnifier on every Box; its content grows IN PLACE — never a window.
// All API, video and account responses are fixtures; no production writes.
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/eco-boxes';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.space',iso=m=>new Date(Date.now()+m*60000).toISOString();
const habits=[{name:'Deep practice',freq:null,ints:['focus'],step:{id:'h1',t:'Deep practice',is:['focus']},objectives:[{text:'Build a practice'}],repulsions:[{text:'Put the phone away'}]}];
const future=(id,location)=>({id,habit:'Deep practice',intentions:['focus'],visibility:'shared',location,mode:'silent',city:'Lisbon',starts_at:iso(60),ends_at:iso(120),duration_min:60,creator:'studio',mine:false,exact:null});
const rpc={space_habits:{ok:true,habits},spot_rules:{clip_seconds:33,duration_min:5,duration_max:720,horizon_days:90},space_discover:{spots:[],more:false,match:'habit'},spots_list:{spots:[future('on','on')]}};
const browser=await launch();
try{
  const {pg,log}=await page(browser,{dir:'space',origin,rpc,tables:{profiles:[{pseudo:'wah'}]},hasTouch:true});
  await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_space?.().view==='feed');await pg.waitForTimeout(500);
  const identity=await pg.$eval('#member-txt',e=>({font:getComputedStyle(e).fontFamily,color:getComputedStyle(e).color}));ok(identity.font.includes('Quantico')&&identity.color==='rgb(251, 213, 202)','connected identity keeps Quantico Coral after the login label changes');
  ok((await pg.textContent('#tp-hint')).trim().toUpperCase()==='TAP ON YOUR TOTEHM TO TURN A HABIT INTO A SPACE','corrected Habit-to-space invitation');
  await pg.click('#space-about');await pg.waitForSelector('.eco-sheet');
  const definition=await pg.textContent('.eco-sheet');
  ok(/strategic Habits, lived/.test(definition)&&/objectives and repulsions/.test(definition)&&!/collective effervescence|SOCIAL|SILENT/.test(definition),'space definition says what a space is (content), the meeting rules live on figher.club');
  ok(await pg.$eval('#joy',e=>e.inert)&&await pg.$eval('#joy',e=>getComputedStyle(e).pointerEvents)==='none','joystick is muted while the definition is open');
  await pg.keyboard.press('ArrowUp');await pg.mouse.wheel(200,0);await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>window.__totehm_space().view)==='feed','definition blocks background navigation');
  await pg.screenshot({path:OUT+'/space_definition_mobile.png'});await pg.keyboard.press('Escape');
  ok(!await pg.locator('.eco-sheet').count()&&!await pg.$eval('#joy',e=>e.inert),'Escape restores navigation');
  await pg.click('#totehm-paper');await pg.waitForSelector('[data-filter-h]');
  const picker=pg.locator('[data-filter-h="0"]');
  ok(!/set time frequency|any rhythm|place ·/i.test(await picker.textContent()),'unconfigured frequency and place never appear in the mirrored Box');
  await picker.locator('.eco-box-zoom').click();await pg.waitForTimeout(150);
  ok(await picker.locator('.habit.is-zoom').count()===1&&await pg.locator('.eco-sheet').count()===0&&!(await pg.evaluate(()=>window.__totehm_space().habit_filter)),'SPACE magnifier enlarges the Box in place: no window, Habit not chosen');
  await picker.click();await pg.waitForTimeout(500);
  await pg.click('#cur-g');await pg.waitForFunction(()=>window.__totehm_space().view==='spots');await pg.waitForTimeout(500);
  ok(await pg.locator('#spots-door [data-club-spot]').count()===1&&await pg.locator('#v-list').count()===0,'LEFT opens the upcoming spot on Club; SPACE has no agenda');
  ok(!log.errors.some(e=>e.startsWith('pageerror')),'SPACE new features have no JavaScript errors');
  await pg.screenshot({path:OUT+'/space_boxes_mobile.png'});await pg.context().close();

  // COM reader: the five native Box types open IN PLACE, no magnifier, no source mutation.
  const source={ok:true,pseudo:'studio',steps:[{t:'Deep practice',is:['focus']}],objs:{'Deep practice':['o1']},trips:[{id:'o1',text:'Build a practice',is:['focus']}],reps:[{id:71,text:'Put the phone away',is:['focus'],hs:['Deep practice']}],wisdom:[{id:'w1',text:'Attention is a choice',is:['focus']}],visions:[{id:'v1',text:'A focused life',is:['focus']}]};
  const com=await page(browser,{dir:'com',origin:'https://www.totehm.com',tables:{profiles:[{pseudo:'wah'}]},rpc:{totehm_of:source,habit_spaces:{ok:true,mine:false,habits:[]}}});
  await com.pg.emulateMedia({reducedMotion:'reduce'});await com.pg.goto('https://www.totehm.com/totehm?ro=studio');await com.pg.waitForSelector('body.ro:not(.gate)');await com.pg.waitForTimeout(400);
  ok(!/set time frequency|set intention|no deadline/i.test(await com.pg.locator('#vnow').textContent()),'COM reader never invents unconfigured attributes');
  ok(await com.pg.locator('#habits .loupe').count()>=1&&await com.pg.locator('.eco-sheet').count()===0,'COM reader: a magnifier on each Box, never a window');
  await com.pg.locator('#habits [data-open]').first().evaluate(e=>e.click());await com.pg.waitForTimeout(400);
  ok(await com.pg.evaluate(()=>window.__totehm_zone?.boite_ouverte)==='h'&&await com.pg.locator('.eco-sheet,[role=dialog]:visible').count()===0,'a Box opens in place, in the list');
  ok(!com.log.rpc.some(x=>/rename|_create|_set|_delete|totehm_save/.test(x.name)),'reading never edits the COM source');await com.ctx.close();

  // Legacy login pages now redirect through COM, never send an email themselves.
  for(const [dir,host,url] of [['boutique','https://www.higher.boutique','/'],['club','https://www.figher.club','/']]){
    const sample=await page(browser,{dir,origin:host,session:false,network:(url,req,log)=>{
      if(url.pathname.startsWith('/auth/v1/'))log.network.push(req.method()+url.pathname);
      if(url.hostname==='www.totehm.com'&&url.pathname==='/auth')return{status:200,contentType:'text/html',body:'<!doctype html><p>COM login</p>'};
      return null;
    }});
    await sample.pg.goto(host+url);await sample.pg.waitForTimeout(800);
    const trigger=sample.pg.locator('[data-eco-connect]:visible').first();
    if(!(await trigger.count())){const member=sample.pg.locator('#member,#conn-bar,#conn').first();await member.click();}
    const connect=sample.pg.locator('[data-eco-connect]:visible,[data-signin]:visible,#mw-login:visible,#btn-send:visible,#pt-send:visible').first();await connect.waitFor();
    ok((await connect.textContent()).trim()==='CONNECT WITH MY TOTEHM',dir+' login uses the canonical label');
    const size=await connect.evaluate(e=>{const s=getComputedStyle(e),r=document.createRange();r.selectNodeContents(e);return{w:e.getBoundingClientRect().width,text:r.getBoundingClientRect().width,pad:parseFloat(s.paddingLeft)+parseFloat(s.paddingRight)};});ok(size.w<=size.text+size.pad+3&&size.pad<30,dir+' login background fits the text');
    await connect.click();await sample.pg.waitForURL(/www\.totehm\.com\/auth/);
    const next=new URL(sample.pg.url());ok(next.searchParams.has('state')&&next.searchParams.has('challenge')&&next.searchParams.get('client')===dir,dir+' uses COM SSO with state and PKCE');
    ok(!sample.log.network.some(x=>/\/otp/.test(x)),dir+' never requests local email login');await sample.ctx.close();
  }
}finally{await browser.close();}
