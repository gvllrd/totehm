// 23/11/2026 — HIGHER GPT DANS LE DASHBOARD (Wah : « avant la section Telegram, avec la possibilité de le configurer »).
// L'état vient du serveur (chatgpt_my_status) ; [Disconnect] en deux gestes ; « My practice » partage ou non le suivi.
// Tout est simulé. LANCER : node com_higher_gpt_dashboard.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
let etat={ok:true,connected:true,since:'2026-11-02T10:00:00Z',ecosystem:true,share_tracking:false};
const rpc={my_landing:{signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false},telegram:true},
  my_totehm:{signed_in:true,objectives:[],repulsions:[],stories:[],visions:[]},
  chatgpt_my_status:()=>etat,
  chatgpt_my_disconnect:()=>{ etat={...etat,connected:false,since:null}; return {ok:true,count:1}; },
  tracking_settings_set:b=>{ etat={...etat,share_tracking:!!b.p_changes.share_chatgpt}; return {ok:true,settings:{}}; }};
const browser=await launch();
try{
 for(const [nom,vp] of [['téléphone',{width:390,height:844}],['ordinateur',{width:1280,height:800}]]){
  etat={ok:true,connected:true,since:'2026-11-02T10:00:00Z',ecosystem:true,share_tracking:false};
  const {pg,log}=await page(browser,{dir:'com',origin,viewport:vp,rpc,tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,habits:[],vis:'private'}]}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.click('#lv-tap-turn');await pg.waitForFunction(()=>document.getElementById('srch').classList.contains('is-open'),null,{timeout:9000});
  await pg.waitForFunction(()=>window.__totehm_gpt&&window.__totehm_gpt().lu,null,{timeout:6000}).catch(()=>{});
  const a=await pg.evaluate(()=>{const g=document.getElementById('mw-gpt'),t=document.getElementById('mw-menu');
    return {avant:!!(g&&t&&(g.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING)),titre:(g.querySelector('.vs-t')||{}).textContent,
      h:document.getElementById('mw-gpt-h').textContent,b:document.getElementById('mw-gpt-go').textContent,sh:document.getElementById('mw-gpt-sh').textContent};});
  ok(a.avant&&a.titre==='Higher GPT'&&/^connected since 2 Nov$/.test(a.h)&&a.b==='Disconnect'&&a.sh==='kept private',
     nom+' · Higher GPT, AVANT TotehmBot : connecté depuis, et le suivi gardé privé → '+JSON.stringify(a));
  await pg.click('#mw-gpt-share');await pg.waitForTimeout(400);
  ok(log.rpc.some(r=>r.name==='tracking_settings_set'&&r.body.p_changes.share_chatgpt===true)&&await pg.textContent('#mw-gpt-sh')==='shared with ChatGPT',
     nom+' · « Share » partage mon suivi avec ChatGPT (tracking_settings_set)');
  await pg.click('#mw-gpt-go');await pg.waitForTimeout(200);
  ok(!log.rpc.some(r=>r.name==='chatgpt_my_disconnect')&&await pg.textContent('#mw-gpt-go')==='Disconnect?',nom+' · premier geste : il demande, rien n\'est coupé');
  await pg.click('#mw-gpt-go');await pg.waitForTimeout(500);
  ok(log.rpc.some(r=>r.name==='chatgpt_my_disconnect')&&await pg.textContent('#mw-gpt-h')==='not connected'&&await pg.textContent('#mw-gpt-go')==='Connect',
     nom+' · second geste : ChatGPT est déconnecté, [Connect] revient');
  ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,nom+' · aucune erreur '+log.errors.join(' | '));
  await pg.context().close();
 }
}finally{await browser.close();}
