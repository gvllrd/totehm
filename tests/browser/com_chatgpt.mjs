// Higher my ChatGPT presents the system and opens the real connection setup, without a local chat.
// Accounts, sessions, RPCs and navigation are fixtures; no production requests.
import fs from 'node:fs';
import {launch,page,ok,USER} from './harness.mjs';

const origin='https://www.totehm.com',OUT=process.argv[2]||'/tmp/com-chatgpt';
fs.mkdirSync(OUT,{recursive:true});
const STEPS=[{t:'Draw ten minutes',is:['express'],f:'every_evening'}];
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:USER.id,habits:STEPS,vis:'private'}]};
const LAND={signed_in:true,pseudo:'wahigher',offer:{enabled:false},higher:{active:false},visibility:'private',thp:false,
  sm:{ready:true,habit:true,objective:true,free_total:7,free_left:6}};
const gptFixture=fs.existsSync('work/gpt.png')?fs.readFileSync('work/gpt.png'):null;
const noErrors=log=>!log.errors.some(e=>e.startsWith('pageerror'));
const settled=(pg,v)=>pg.waitForFunction(v=>{const d=window.__totehm_lv?.();return d&&d.vue===v&&!d.bouge;},v,{timeout:9000});
const fixtures=[
  {name:'member-mobile',viewport:{width:390,height:844},hasTouch:true},
  {name:'visitor-small',viewport:{width:390,height:664},session:false},
  {name:'guest',viewport:{width:390,height:844},guest:true,session:false},
  {name:'not-ready',viewport:{width:390,height:844},land:{...LAND,sm:{ready:false,habit:false,objective:false,free_left:0}}},
  {name:'member-desktop',viewport:{width:1280,height:860}}
];
const browser=await launch();
try{
  for(const sample of fixtures){
    const attempts=[];
    const guestUser={...USER,is_anonymous:true,email:''};
    const {pg,ctx,log}=await page(browser,{dir:'com',origin,tables,viewport:sample.viewport,hasTouch:sample.hasTouch,
      session:sample.session!==false,rpc:{my_landing:sample.land||LAND},network:(url,req)=>{
        if(gptFixture&&url.pathname.endsWith('/com/gpt.png'))return {status:200,contentType:'image/png',body:gptFixture};
        if(url.pathname==='/functions/v1/higher-self'){attempts.push(req.method());return {status:500,contentType:'application/json',body:'{"error":"removed"}'};}
        if(sample.guest&&url.pathname==='/auth/v1/user')return {status:200,contentType:'application/json',body:JSON.stringify(guestUser)};
        return null;
      }});
    await pg.emulateMedia({reducedMotion:'reduce'});
    await pg.addInitScript(({guestUser,isGuest})=>{
      window.__geoCalls=0;
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
        getCurrentPosition(_success,failure){window.__geoCalls++;failure?.({code:1,message:'No location needed for a pitch'});},
        watchPosition(_success,failure){window.__geoCalls++;failure?.({code:1,message:'No location needed for a pitch'});return 1;},
        clearWatch(){}
      }});
      if(isGuest)localStorage.setItem('sb-abujjbkbbiumxrokozph-auth-token',JSON.stringify({access_token:'guest-at',refresh_token:'guest-rt',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:guestUser}));
    },{guestUser,isGuest:!!sample.guest});
    await pg.goto(origin+'/totehm');
    await pg.waitForFunction(()=>typeof window.__totehm_lv==='function');
    if(sample.session!==false||sample.guest)await pg.waitForSelector('body.member');
    await settled(pg,'c');
    /* 18/11 (Wah) : sans compte, ↑ ouvre la porte d'inscription — Higher my ChatGPT se découvre par le Discover */
    if(sample.session===false&&!sample.guest){
      await pg.click('#lvn-up');await pg.waitForTimeout(700);
      ok(await pg.evaluate(()=>document.body.classList.contains('is-door')&&window.__totehm_lv().vue==='c'),sample.name+' · 18/11 · without an account, ↑ opens the sign-up door, not the ChatGPT view');
      ok(noErrors(log),sample.name+' · no runtime error');
      await ctx.close(); continue;
    }
    /* 24/11 (Wah : « Higher GPT est dans le dashboard de toute façon ») — ↑ N'EST PLUS UNE VUE : il ouvre le RÉCIT,
       qui sert de menu. Higher my ChatGPT se rejoint par SA porte, [Get Higher], au troisième écran — et par le verso
       (Go Higher). Le panneau `#lv-b` dort en attendant le ménage : plus aucun geste n'y mène, donc on ne le teste plus. */
    /* 25/11 (Wah) : connecté, ↑ ouvre la PRISE RAPIDE ; le récit s'ouvre par la touche [GREATNESS]. */
    await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(1200);
    const prise=await pg.evaluate(()=>document.getElementById('cap').classList.contains('is-on'));
    await pg.keyboard.press('Escape');await pg.waitForTimeout(500);
    await pg.click('#lv-great');await pg.waitForTimeout(1300);
    const recit=await pg.evaluate(()=>({ouvert:window.__totehm_discover().ouvert,vue:window.__totehm_lv().vue}));
    ok(prise&&recit.ouvert&&recit.vue==='c',sample.name+' · ↑ opens the quick capture, [GREATNESS] opens the story, no view travel → '+JSON.stringify(recit));
    for(let k=0;k<3;k++){await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(1150);}
    const porte=await pg.evaluate(()=>{const b=document.getElementById('lvd-cta');
      return {i:+document.getElementById('lvd').dataset.i,aria:b.getAttribute('aria-label'),badge:!!b.querySelector('use[href="#higher-badge"]')};});
    ok(porte.i===3&&porte.aria==='Get Higher'&&porte.badge,sample.name+' · the third screen carries [Get Higher], the badge, never the word → '+JSON.stringify(porte));
    await pg.screenshot({path:OUT+'/'+sample.name+'.png'});
    await pg.click('#lvd-cta');
    if(sample.guest){
      /* un INVITÉ n'a pas de TOTEHM : comme toutes les portes du récit, celle-ci mène d'abord à l'inscription */
      await pg.waitForTimeout(1600);
      const g=await pg.evaluate(()=>({ouvert:window.__totehm_discover().ouvert,porte:document.body.classList.contains('is-door'),url:location.pathname}));
      ok(!g.ouvert&&g.url!=='/chatgpt',sample.name+' · without a TOTEHM, [Get Higher] never reaches the connector → '+JSON.stringify(g));
    }else{
      await pg.waitForURL(origin+'/chatgpt',{timeout:9000});
      ok(await pg.locator('#panel').count()===1,sample.name+' · [Get Higher] opens the connection page');
    }
    await ctx.close();
  }

  // 18/11 — [Members] searches on the verso; at a member's, no top or bottom view (their offer lives on THEIR verso),
  // so my personal ChatGPT pitch can never show inside another member's ecosystem.
  const OTHER={ok:true,pseudo:'kai3',habits:[{t:'Swim at dawn',is:['flow']}],objectives:[],objs:{},repulsions:[],stories:[],visions:[]};
  const OFFER={ok:true,pseudo:'kai3',palette:['flow'],sale:{open:true,price_cents:2400,currency:'eur',period:'year'},
    viewer:{signed_in:true,me:false,subscribed:false,can_read:true}};
  {const {pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND,figher_access:{signed_in:true,member:true},totehm_read:OTHER,creator_page:OFFER,member_media:{ok:true,items:[]},club_spots_of:{ok:true,items:[]}}});
    await pg.emulateMedia({reducedMotion:'reduce'});
    await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await settled(pg,'c');
    await pg.click('#lv-m-sel');
    await pg.waitForSelector('#mb-q:visible');await pg.fill('#mb-q','kai3');await pg.keyboard.press('Enter');
    await pg.waitForFunction(()=>{const c=window.__totehm_cherche();return c.etat==='abonne'&&c.lu;},null,{timeout:9000});
    await pg.keyboard.press('Escape');
    await pg.waitForFunction(()=>document.body.classList.contains('lv-membre')&&!document.getElementById('srch').classList.contains('is-on')&&!window.__totehm_lv().bouge,null,{timeout:9000});
    await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(800);
    ok((await pg.evaluate(()=>window.__totehm_lv().vue))==='c'&&!(await pg.isVisible('#chatgpt-pitch')),'Members · no top view at a member\'s: the personal pitch never shows');
    ok((await pg.evaluate(()=>window.__totehm_lv().mode))==='members'&&noErrors(log),'Members · the visited ecosystem stays');
    await ctx.close();}


  // 24/11 — le panneau `#lv-b` (Higher my ChatGPT, le GPT qui tourne) DORT : ↑ ouvre le récit, plus aucun geste n'y
  // mène. Sa mise en page et son animation ne sont plus testées ; elles partiront avec lui, au ménage.

  // Retired sales callbacks lead to free Higher GPT, including for historical subscribers.
  for(const active of [false,true])for(const retour of ['open','paid']){
    const {pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:{...LAND,higher:{active}}}});
    await pg.goto(origin+'/totehm?higher='+retour);await pg.waitForURL(origin+'/chatgpt');
    ok(pg.url()===origin+'/chatgpt'&&noErrors(log),'Legacy Higher '+retour+' · free connector for active='+active);
    ok(!log.functions.some(f=>f.name==='higher-sub'),'Legacy Higher '+retour+' · no checkout, resume or cancellation');
    await ctx.close();
  }
}finally{await browser.close();}
