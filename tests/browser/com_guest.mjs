// 11/10/2026 — totehm.com : (1) le code vérifié ne vide plus rien avant l'arrivée du
// Totehm (un seul essai, champs gardés et grisés, « opening my TOTEHM… ») ; (2) sans
// email : un compte invité (connexion anonyme), puis « save it with my email ».
// Auth, tables et RPC simulés ; aucune écriture en production.
import fs from 'node:fs';import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp/com-guest';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.com',SB='https://abujjbkbbiumxrokozph.supabase.co';
const member={id:'22222222-2222-4222-8222-222222222222',aud:'authenticated',role:'authenticated',email:'wah@example.test',is_anonymous:false,app_metadata:{},user_metadata:{}};
const guestU={id:'33333333-3333-4333-8333-333333333333',aud:'authenticated',role:'authenticated',email:'',is_anonymous:true,app_metadata:{},user_metadata:{}};
const sess=u=>({access_token:'at-'+u.id.slice(0,4)+'-'+Math.random().toString(36).slice(2),token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'rt-'+u.id.slice(0,4),user:u});
const json=b=>({status:200,contentType:'application/json',body:JSON.stringify(b)});
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const browser=await launch();
try{
 // ── 1 · le code vérifié ─────────────────────────────────────────────
 {const A={verify:0,current:null,named:false};
  const network=async(url,req)=>{
    if(url.origin!==SB||!url.pathname.startsWith('/auth/v1/')) return null;
    const p=url.pathname.slice(9);
    if(p==='settings') return json({external:{anonymous_users:false,email:true}});
    if(p==='otp') return json({});
    if(p==='verify'){A.verify++;await new Promise(r=>setTimeout(r,700));A.current=member;A.named=true;return json(sess(member));}
    if(p==='user') return json(A.current||member);
    return json({});
  };
  const {pg,log}=await page(browser,{dir:'com',origin,session:false,network,tables:{profiles:()=>A.named?[{pseudo:'wah'}]:[]},viewport:{width:390,height:844}});
  await pg.goto(origin+'/totehm#in');await pg.waitForFunction(()=>document.body.classList.contains('is-door'));await pg.waitForTimeout(500);
  ok(await pg.isHidden('#mw-guest'),'no START WITHOUT EMAIL while the project keeps anonymous sign-in closed');
  await pg.fill('#mw-email','wah@example.test');await pg.press('#mw-email','Enter');await pg.waitForSelector('#mw-code:not(.hide)');
  await pg.fill('#mw-code','123456');await pg.$eval('#mw-code',e=>e.dispatchEvent(new Event('input',{bubbles:true})));
  await pg.waitForTimeout(250);
  const during=await pg.evaluate(()=>({mail:document.querySelector('#mw-email').value,code:document.querySelector('#mw-code').value,
    dis:document.querySelector('#mw-email').disabled&&document.querySelector('#mw-code').disabled,note:document.querySelector('#mw-note').textContent}));
  ok(during.mail==='wah@example.test'&&during.code==='123456'&&during.dis&&/verifying/.test(during.note),'while verifying, both fields keep their values, greyed, and the door says so');
  await pg.waitForFunction(()=>document.body.classList.contains('member'),null,{timeout:15000});await pg.waitForTimeout(600);
  ok(A.verify===1,'the code is verified ONCE even when the input event fires twice (iOS paste)');
  ok(await pg.inputValue('#mw-email')===''&&await pg.inputValue('#mw-code')===''&&!await pg.evaluate(()=>document.body.classList.contains('is-door')),'the fields clear only once the TOTEHM is open');
  ok(!erreurs(log).length,'code flow: no JavaScript error '+erreurs(log).join(' | '));
  await pg.context().close();}

 // ── 2 · sans email ──────────────────────────────────────────────────
 {const A={signup:0,update:null,verify:null,current:null,named:false};
  const network=async(url,req)=>{
    if(url.origin!==SB||!url.pathname.startsWith('/auth/v1/')) return null;
    const p=url.pathname.slice(9);let body={};try{body=JSON.parse(req.postData()||'{}');}catch(_){}
    if(p==='settings') return json({external:{anonymous_users:true,email:true}});
    if(p==='signup'){A.signup++;A.current=guestU;return json(sess(guestU));}
    if(p==='user'&&req.method()==='PUT'){A.update=body;return json({...guestU,new_email:body.email});}
    if(p==='user') return json(A.current||guestU);
    if(p==='verify'){A.verify=body;A.current={...guestU,email:body.email,is_anonymous:false};return json({user:A.current});}
    if(p==='token') return json(sess(A.current||guestU));
    return json({});
  };
  const {pg,log}=await page(browser,{dir:'com',origin,session:false,network,tables:{profiles:()=>A.named?[{pseudo:'wah'}]:[]},viewport:{width:390,height:844}});
  await pg.goto(origin+'/totehm#in');await pg.waitForFunction(()=>document.body.classList.contains('is-door'));
  await pg.waitForSelector('#mw-guest:not(.hide)');
  ok(/without email/i.test(await pg.textContent('#mw-guest'))&&await pg.isVisible('#mw-guest-hint'),'the door offers START WITHOUT EMAIL, and says the TOTEHM stays on this device');
  await pg.screenshot({path:OUT+'/com_door_guest.png'});
  await pg.click('#mw-guest');await pg.waitForFunction(()=>document.body.classList.contains('member'),null,{timeout:15000});await pg.waitForTimeout(800);
  ok(A.signup===1,'one anonymous sign-in (Supabase), no email asked');
  ok(!await pg.evaluate(()=>document.body.classList.contains('is-door')),'the guest enters the TOTEHM directly: no name asked');
  const card=await pg.evaluate(()=>({guest:!document.querySelector('#lv-guest').classList.contains('hide'),ident:document.querySelector('#ident-block').classList.contains('hide')}));
  ok(card.guest&&card.ident,'the centre card offers SAVE IT WITH MY EMAIL instead of a name and readers');
  /* 15/10 bis : l'espace membre vit DANS le verso — « save it with my email » replie le Totehm, retourne le
     papier, et déplie le compte dessous : on ne quitte jamais la page. */
  await pg.$eval('#lv-guest',e=>e.click());await pg.waitForSelector('#member-window.show',{state:'visible',timeout:12000});
  ok(await pg.isVisible('#mw-save')&&await pg.isHidden('#mw-menu')&&(await pg.textContent('#mw-who'))==='Guest','the member window is the guest one: save with my email, no paid menu');
  await pg.fill('#mw-save-email','wah@example.test');await pg.press('#mw-save-email','Enter');await pg.waitForSelector('#mw-save-code:not(.hide)');
  ok(A.update?.email==='wah@example.test','the email is attached to the SAME account (updateUser)');
  await pg.fill('#mw-save-code','654321');
  await pg.waitForFunction(()=>!document.querySelector('#mw-claim-state').classList.contains('hide'),null,{timeout:15000});
  ok(A.verify?.type==='email_change'&&A.verify?.token==='654321','the code confirms the email change');
  ok(/name your totehm/i.test(await pg.textContent('#door-q')),'saved: the TOTEHM now asks for its name');
  ok(!erreurs(log).length,'guest flow: no JavaScript error '+erreurs(log).join(' | '));
  await pg.context().close();}
}finally{await browser.close();}
