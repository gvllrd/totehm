// 23/11/2026 — MY CHAPTER (Wah, décision B) : le récit de MA semaine en haut du verso, écrit par un modèle SEULEMENT
// après mon accord ; le Grind dessous. Tout est simulé (aucun appel au modèle). LANCER : node com_my_chapter.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const origin='https://www.totehm.com', UID='11111111-1111-4111-8111-111111111111';
const lundi=(()=>{const d=new Date();const k=(d.getUTCDay()+6)%7;return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-k)).toISOString();})();
let etat;
const chap=()=>({ok:true,enabled:etat.on,week:lundi,writes_left:3-(etat.v||0),chapters:etat.c?[{no:1,title:'The hill at dawn',body:'I ran the hill twice.\nOn Thursday I had no energy, and I said so.',from:lundi,to:new Date(Date.parse(lundi)+7*864e5).toISOString(),version:etat.v}]:[]});
const rpc={my_landing:{signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false},telegram:true},
  my_totehm:{signed_in:true,objectives:[],repulsions:[],stories:[],visions:[]},
  my_board:{ok:true,today:lundi.slice(0,10),tz:'UTC',telegram:true,habits:[],days:[],week:{},totals:{},heat:[],objectives:[],feed:[]},
  tracking_summary_for_me:{ok:true,days_count:7,counts:{on_it:2,no_energy:1,unanswered:0},habits:[],days:[]},
  my_chapters:()=>chap(), chapter_settings_set:b=>{ etat.on=!!b.p_enabled; return {ok:true,enabled:etat.on}; }};
const browser=await launch();
try{
 for(const [nom,vp] of [['téléphone',{width:390,height:844}],['ordinateur',{width:1280,height:800}]]){
  etat={on:false,c:false,v:0,quiet:false};
  const {pg,log}=await page(browser,{dir:'com',origin,viewport:vp,rpc,functions:{'my-chapter':()=>{ if(etat.quiet) return {error:'quiet'}; etat.c=true; etat.v=(etat.v||0)+1; return {ok:true,writes_left:3-etat.v}; }},
    tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,habits:[],vis:'private'}]}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.click('#lv-tap-turn');await pg.waitForFunction(()=>document.getElementById('srch').classList.contains('is-open'),null,{timeout:9000});
  await pg.waitForSelector('#vs-dash [data-ch-box]',{timeout:8000});
  const a=await pg.evaluate(()=>{const b=document.querySelector('#vs-dash [data-ch-box]'),d=document.getElementById('vs-dash');
    return {premier:d.firstElementChild===b,bouton:(b.querySelector('[data-ch="on"]')||{}).textContent,p:(b.querySelector('.ch-p')||{}).textContent||'',grind:d.textContent.includes('My practice')};});
  ok(a.premier&&a.bouton==='Turn on My Chapter'&&/only once I turn it on/.test(a.p)&&a.grind,nom+' · My Chapter EN HAUT, éteint : il dit ce qu\'il fait et attend mon accord ; le Grind reste dessous → '+JSON.stringify(a));
  ok(!log.functions.some(f=>f.name==='my-chapter'),nom+' · rien n\'est envoyé au modèle sans accord');
  await pg.click('#vs-dash [data-ch="on"]');await pg.waitForSelector('#vs-dash [data-ch="write"]',{timeout:6000});
  ok(log.rpc.some(r=>r.name==='chapter_settings_set'&&r.body.p_enabled===true)&&await pg.textContent('#vs-dash [data-ch="write"]')==='Write this week',nom+' · activé : « Write this week »');
  await pg.click('#vs-dash [data-ch="write"]');await pg.waitForSelector('#vs-dash .ch-t',{timeout:6000});
  const c=await pg.evaluate(()=>({t:document.querySelector('#vs-dash .ch-t').textContent,k:document.querySelector('#vs-dash .ch-k').textContent,
    p:document.querySelectorAll('#vs-dash .ch-body p').length,r:(document.querySelector('#vs-dash [data-ch="write"]')||{}).textContent,
    corail:getComputedStyle(document.querySelector('#vs-dash .ch-t')).color}));
  ok(log.functions.some(f=>f.name==='my-chapter'&&f.body.action==='write')&&c.t==='The hill at dawn'&&/^Chapter 1 · /.test(c.k)&&c.p===2&&c.r==='Rewrite · 2 left'&&c.corail!=='rgb(251, 213, 202)',
     nom+' · le chapitre de la semaine : son titre, ses paragraphes, « Rewrite · 2 left », jamais en corail → '+JSON.stringify(c));
  etat.quiet=true;await pg.click('#vs-dash [data-ch="write"]');await pg.waitForTimeout(500);
  ok(/Nothing to tell yet this week/.test(await pg.textContent('#vs-dash [data-ch-dit]')),nom+' · une semaine sans geste : une ligne honnête, rien d\'inventé');
  await pg.click('#vs-dash [data-ch="off"]');await pg.waitForSelector('#vs-dash [data-ch="on"]',{timeout:6000});
  ok(log.rpc.some(r=>r.name==='chapter_settings_set'&&r.body.p_enabled===false),nom+' · « Turn off » retire l\'accord');
  ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,nom+' · aucune erreur '+log.errors.join(' | '));
  await pg.context().close();
 }
}finally{await browser.close();}
