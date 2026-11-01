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
        free:document.querySelector('#chatgpt-entry .cg-free')?.textContent,href:button?.getAttribute('href'),logos:panel.querySelectorAll('svg use[href="#higher-badge"]').length,
        old:!!document.querySelector('#lv-say,#lv-thread,#lv-focus,#lv-ici,.rf-proxy'),form:!!panel.querySelector('form,textarea,input'),
        button:button?.getAttribute('aria-label')||button?.textContent,disabled:!!button?.disabled,
        active:document.activeElement?.tagName,keyboard:document.body.classList.contains('rf-clavier'),geo:window.__geoCalls,
        setup:window.__totehm_lv().chatgpt?.setup,
        overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    ok(state.label==='Higher my ChatGPT'&&/NEUROLINK/i.test(state.text)&&/NEURALINK/i.test(state.text),sample.name+' · bottom view presents NEUROLINK, not NEURALINK');
    ok(/habit/i.test(state.text)&&/objective|what it serves/i.test(state.text)&&/story/i.test(state.text),sample.name+' · the pitch explains the personal links');
    ok(/subscribe to a member/i.test(state.text)&&/choose to share/i.test(state.text),sample.name+' · subscriptions expose the elements a member chooses to share');
    ok(/free to connect/i.test(state.free)&&/subscriptions are separate/i.test(state.free)&&state.href==='/chatgpt'&&state.setup==='/chatgpt'&&state.logos===2,sample.name+' · free connection setup and Higher slogan SVG are available');
    ok(/my ChatGPT/i.test(state.button)&&state.tab===0&&!state.overflow,sample.name+' · CTA is named, pitch is keyboard accessible, layout fits the viewport');
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
    const offer=await pg.textContent('#mb-offre');
    ok(/kai3/.test(offer)&&/SUBSCRIBE/.test(offer)&&!(await pg.isVisible('#chatgpt-pitch'))&&(await pg.getAttribute('#lv-b','aria-label'))==='Member offer','Members · its bottom view keeps the member offer and hides the personal pitch');
    await pg.click('#lvn-up');await settled(pg,'c');
    ok((await pg.evaluate(()=>window.__totehm_lv().mode))==='members'&&noErrors(log),'Members · return keeps the visited ecosystem');
    await ctx.close();}

  // Existing Higher subscribers retain their paid experience, separate from the free pitch.
  {const {pg,ctx}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND}});
    await pg.goto(origin+'/totehm?higher=open');await pg.waitForURL(origin+'/higherself');
    ok(pg.url()===origin+'/higherself','Higher open · existing deep link reaches the standalone experience');
    await ctx.close();}
  {let reads=0;const {pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:()=>({...LAND,higher:{active:++reads>=3}})}});
    await pg.emulateMedia({reducedMotion:'reduce'});
    await pg.goto(origin+'/totehm?higher=paid');
    await pg.waitForFunction(()=>window.__totehm_lv?.().reglages&&document.getElementById('member-window').classList.contains('show'),null,{timeout:12000});
    await pg.waitForFunction(()=>window.__totehm_lv?.().higher,null,{timeout:15000});
    ok(pg.url()===origin+'/totehm'&&(await pg.evaluate(()=>window.__totehm_lv().vue))==='c','Higher paid · cleaned URL opens subscription settings instead of the free pitch');
    ok(reads>=3&&/payment received|subscription active/i.test(await pg.textContent('#mw-menu-note'))&&noErrors(log),'Higher paid · state refresh observes the subscription after the webhook');
    await ctx.close();}
}finally{await browser.close();}
