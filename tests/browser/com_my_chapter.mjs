// 23/11/2026 — MY CHAPTER (Wah) : « tout ce qui a été fait dans le TOTEHM — spots compris, vraiment tout — serait analysé
// par ChatGPT ». En haut du verso, My Chapter ouvre le récit dans Higher GPT (get_my_activity) ; le site n'appelle aucun
// modèle. Le Grind reste dessous. Tout est simulé. LANCER : node com_my_chapter.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const origin='https://www.totehm.com', UID='11111111-1111-4111-8111-111111111111';
const rpc={my_landing:{signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false},telegram:true},
  my_totehm:{signed_in:true,objectives:[],repulsions:[],stories:[],visions:[]},
  my_board:{ok:true,today:'2026-11-23',tz:'UTC',telegram:true,habits:[],days:[],week:{},totals:{},heat:[],objectives:[],feed:[]},
  tracking_summary_for_me:{ok:true,days_count:7,counts:{on_it:2,no_energy:1,unanswered:0},habits:[],days:[]}};
const browser=await launch();
try{
 for(const [nom,vp] of [['téléphone',{width:390,height:844}],['ordinateur',{width:1280,height:800}]]){
  const {pg,log}=await page(browser,{dir:'com',origin,viewport:vp,rpc,tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,habits:[],vis:'private'}]}});
  await pg.addInitScript(()=>{ window.__ouvert=[]; window.__copie=[]; window.open=(u)=>{ window.__ouvert.push(u); return null; };
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>window.__copie.push(t)}}); });
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.click('#lv-tap-turn');await pg.waitForFunction(()=>document.getElementById('srch').classList.contains('is-open'),null,{timeout:9000});
  await pg.waitForSelector('#vs-dash [data-ch-box]',{timeout:8000});
  const a=await pg.evaluate(()=>{const b=document.querySelector('#vs-dash [data-ch-box]'),d=document.getElementById('vs-dash');
    return {premier:d.firstElementChild===b,b:[...b.querySelectorAll('[data-ch]')].map(x=>x.textContent),p:b.querySelector('.ch-p').textContent,grind:d.textContent.includes('My practice')};});
  ok(a.premier&&a.b.join('|')==='This week|This month'&&/Higher GPT writes it in my ChatGPT/.test(a.p)&&a.grind,nom+' · My Chapter EN HAUT : il ouvre Higher GPT ; le Grind dessous → '+JSON.stringify(a));
  await pg.click('#vs-dash [data-ch="28"]');await pg.waitForTimeout(300);
  const o=await pg.evaluate(()=>({u:window.__ouvert.at(-1)||'',c:window.__copie.at(-1)||'',dit:document.querySelector('#vs-dash [data-ch-dit]').textContent}));
  ok(/^https:\/\/chatgpt\.com\/\?q=/.test(o.u)&&/last 28 days/.test(decodeURIComponent(o.u))&&o.c===decodeURIComponent(o.u.split('?q=')[1])&&/Opened in ChatGPT/.test(o.dit),
     nom+' · « This month » : ChatGPT s\'ouvre avec la demande (28 jours), copiée aussi → '+JSON.stringify(o.dit));
  ok(!log.functions.some(f=>/chapter/.test(f.name))&&!log.rpc.some(r=>/chapter/.test(r.name)),nom+' · le site n\'appelle aucun modèle ni aucune fonction de chapitre');
  ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,nom+' · aucune erreur '+log.errors.join(' | '));
  await pg.context().close();
 }
}finally{await browser.close();}
