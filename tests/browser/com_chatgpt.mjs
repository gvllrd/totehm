// Higher my ChatGPT presents the system and opens the real connection setup, without a local chat.
// Accounts, sessions, RPCs and navigation are fixtures; no production requests.
import fs from 'node:fs';
import {launch,page,ok,USER} from './harness.mjs';

const origin='https://www.totehm.com',OUT=process.argv[2]||'/tmp/com-chatgpt';
fs.mkdirSync(OUT,{recursive:true});
const STEPS=[{t:'Draw ten minutes',is:['express'],f:'every_evening'}];
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:USER.id,steps:STEPS,vis:'private'}]};
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
    await pg.click('#lvn-dn');await settled(pg,'b');
    const state=await pg.evaluate(()=>{
      const pitch=document.getElementById('chatgpt-pitch'),button=document.getElementById('chatgpt-connect'),panel=document.getElementById('lv-b');
      return {label:panel.getAttribute('aria-label'),text:pitch?.textContent.replace(/\s+/g,' ').trim(),tab:pitch?.tabIndex,
        free:document.querySelector('#chatgpt-entry .cg-free')?.textContent,href:button?.getAttribute('href'),logos:document.querySelectorAll('#lv-slogan use[href="#higher-badge"]').length,
        gpt:document.getElementById('rf-gpt')?.getAttribute('src'),
        centered:Math.abs(document.getElementById('lv-slogan').getBoundingClientRect().top+document.getElementById('lv-slogan').getBoundingClientRect().height/2-(document.getElementById('rf-me').getBoundingClientRect().top+document.getElementById('rf-me').getBoundingClientRect().height/2))<2,
        old:!!document.querySelector('#lv-say,#lv-thread,#lv-focus,#lv-ici,.rf-proxy'),form:!!panel.querySelector('form,textarea,input'),
        button:button?.getAttribute('aria-label')||button?.textContent,disabled:!!button?.disabled,
        ctaLogo:button?.querySelector('svg use')?.getAttribute('href'),
        active:document.activeElement?.tagName,keyboard:document.body.classList.contains('rf-clavier'),geo:window.__geoCalls,
        setup:window.__totehm_lv().chatgpt?.setup,
        overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    ok(state.label==='Higher my ChatGPT'&&/YOUR TOTEHM IN CHATGPT/.test(state.text)&&!/memory|every relevant conversation/i.test(state.text),sample.name+' · signature describes on-demand context without promising native memory');
    ok(/habits/i.test(state.text)&&/goals/i.test(state.text)&&/repulsions/i.test(state.text)&&/visions/i.test(state.text)&&/story/i.test(state.text),sample.name+' · all five element kinds');
    ok(/members you subscribe to/i.test(state.text)&&/Figher Club/i.test(state.text),sample.name+' · subscriptions and accessible Club spots');
    ok(state.href==='/chatgpt'&&state.setup==='/chatgpt'&&state.logos===1&&state.centered&&state.gpt.endsWith('/com/gpt.png'),sample.name+' · singleton Higher badge is centered over GPT');
    ok(/my ChatGPT/i.test(state.button)&&state.ctaLogo==='#higher-badge'&&state.tab===0&&!state.overflow,sample.name+' · CTA uses the perforated Higher logo, remains named and fits the viewport');
    ok(!state.old&&!state.form&&!state.keyboard&&!['INPUT','TEXTAREA'].includes(state.active),sample.name+' · no chat, focus relay or keyboard opens');
    await pg.focus('#chatgpt-pitch');
    const before=await pg.$eval('#chatgpt-pitch',e=>({top:e.scrollTop,overflow:e.scrollHeight>e.clientHeight+2}));
    await pg.keyboard.press('PageDown');await pg.waitForTimeout(150);
    const after=await pg.$eval('#chatgpt-pitch',e=>e.scrollTop);
    ok(!before.overflow||after>before.top,sample.name+' · keyboard scroll reads the pitch without leaving the view');
    ok((await pg.evaluate(()=>window.__totehm_lv().vue))==='b',sample.name+' · scrolling preserves the bottom view');
    ok(attempts.length===0&&(await pg.evaluate(()=>window.__geoCalls))===0,sample.name+' · the pitch makes no Higher Self or location request');
    await pg.screenshot({path:OUT+'/'+sample.name+'.png'});
    await pg.click('#lvn-up');await settled(pg,'c');
    ok(noErrors(log),sample.name+' · back to centre without a runtime error');
    await pg.click('#lvn-dn');await settled(pg,'b');await pg.click('#chatgpt-connect');await pg.waitForURL(origin+'/chatgpt');
    ok(await pg.locator('#panel').count()===1,sample.name+' · CTA opens the connection page');
    await ctx.close();
  }

  // The bottom of another member's ecosystem still represents that member's offer.
  const OTHER={ok:true,pseudo:'kai3',steps:[{t:'Swim at dawn',is:['flow']}],trips:[],objs:{},reps:[],wisdom:[],visions:[]};
  const OFFER={ok:true,pseudo:'kai3',palette:['flow'],sale:{open:true,price_cents:2400,currency:'eur',period:'year'},
    viewer:{signed_in:true,me:false,subscribed:false,can_read:true}};
  {const {pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND,totehm_read:OTHER,creator_page:OFFER,member_media:{ok:true,items:[]},club_spots_of:{ok:true,items:[]}}});
    await pg.emulateMedia({reducedMotion:'reduce'});
    await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await settled(pg,'c');
    await pg.click('#lv-m-members');
    await pg.waitForSelector('#mb-q:visible');await pg.fill('#mb-q','kai3');await pg.keyboard.press('Enter');
    await pg.waitForFunction(()=>document.body.classList.contains('lv-membre')&&!document.body.classList.contains('mb-cherche')&&!window.__totehm_lv().bouge);
    await pg.click('#lvn-dn');await settled(pg,'b');
    await pg.waitForSelector('#mb-offre [data-mbo="sub"]',{state:'attached'});
    const offer=await pg.textContent('#mb-offre');
    console.log('Member offer fixture',JSON.stringify({offer,pitchVisible:await pg.isVisible('#chatgpt-pitch'),label:await pg.getAttribute('#lv-b','aria-label')}));

    ok(/kai3/.test(offer)&&/SUBSCRIBE/.test(offer)&&!(await pg.isVisible('#chatgpt-pitch'))&&(await pg.getAttribute('#lv-b','aria-label'))==='Member offer','Members · its bottom view keeps the member offer and hides the personal pitch');
    await pg.click('#lvn-up');await settled(pg,'c');
    ok((await pg.evaluate(()=>window.__totehm_lv().mode))==='members'&&noErrors(log),'Members · return keeps the visited ecosystem');
    await ctx.close();}


  // Normal motion: GPT rotates continuously; the shared badge stays level.
  {const {pg,ctx}=await page(browser,{dir:'com',origin,tables,session:false,viewport:{width:1280,height:860}});
    await pg.emulateMedia({reducedMotion:'no-preference'});
    await pg.goto(origin+'/totehm');await pg.waitForFunction(()=>window.__totehm_lv);await settled(pg,'c');
    await pg.click('#lvn-dn');await settled(pg,'b');await pg.waitForTimeout(250);
    const before=await pg.evaluate(()=>({gpt:getComputedStyle(document.getElementById('rf-gpt')).transform,badge:getComputedStyle(document.getElementById('lv-slogan')).transform}));
    await pg.waitForTimeout(250);
    const after=await pg.evaluate(()=>({gpt:getComputedStyle(document.getElementById('rf-gpt')).transform,badge:getComputedStyle(document.getElementById('lv-slogan')).transform,repeat:getComputedStyle(document.getElementById('rf-gpt')).animationIterationCount}));
    ok(before.gpt!==after.gpt&&before.badge===after.badge&&after.repeat==='infinite','Motion · only GPT rotates infinitely');
    await ctx.close();}

  // Retired sales callbacks lead to free Higher GPT, including for historical subscribers.
  for(const active of [false,true])for(const retour of ['open','paid']){
    const {pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:{...LAND,higher:{active}}}});
    await pg.goto(origin+'/totehm?higher='+retour);await pg.waitForURL(origin+'/chatgpt');
    ok(pg.url()===origin+'/chatgpt'&&noErrors(log),'Legacy Higher '+retour+' · free connector for active='+active);
    ok(!log.functions.some(f=>f.name==='higher-sub'),'Legacy Higher '+retour+' · no checkout, resume or cancellation');
    await ctx.close();
  }
}finally{await browser.close();}
