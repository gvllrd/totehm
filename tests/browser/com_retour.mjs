// 29/10/2026 — « PRÉCÉDENT » (Wah : « les boutons "précédent" natifs des téléphones et ordinateurs doivent s'intégrer
// adroitement dans certains endroits clés, pour éviter que l'utilisateur sorte du site »). Tant qu'on n'est pas à
// l'accueil, « précédent » referme la couche du dessus (le geste d'Échap), dans l'ordre : une visionneuse au-dessus du
// Totehm, le Totehm déployé, une visionneuse de vue, une vue de côté, le verso. À l'accueil, il quitte le site.
// Téléphone et ordinateur ; tout est simulé. LANCER : node com_retour.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const browser=await launch();const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight'],f:'every_morning'}];
const DEMAIN=new Date(Date.now()+864e5).toISOString().slice(0,10)+'T08:00:00Z';
const SP={id:'sp1',habit:'Run the hill',intentions:['fight'],state:'will',starts_at:DEMAIN,duration_min:60,city:'Lisbon',mine:true,audience:'private',location:'off',
  habit_box:{name:'Run the hill',ints:['fight']}};
const RPC={my_landing:{signed_in:true,pseudo:'wahigher'},my_trips:{signed_in:true,trips:[],reps:[],wisdom:[],visions:[]},
  element_media_list:{ok:true,items:[{id:'m1',kind:'h',ref:'Run the hill',path:UID+'/m-a.jpg',mime:'image/jpeg',name:'a.jpg'}]},
  club_spots_of:b=>({ok:true,items:b.p_period==='future'||b.p_period==='now'?[SP]:[],total:1})};
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const etat=pg=>pg.evaluate(()=>({url:location.pathname,vue:window.__totehm_lv().vue,mode:window.__totehm_lv().mode,deploye:!document.body.classList.contains('gate'),
  verso:document.body.classList.contains('searching'),tlv:document.body.classList.contains('is-tlv'),voir:document.body.classList.contains('rdr-voir'),
  vx:!document.getElementById('vx').hidden,r:window.__totehm_retour()}));
const pause=(pg,ms)=>pg.waitForTimeout(ms);
const retour=async pg=>{ await pg.goBack({timeout:4000}).catch(()=>{}); await pause(pg,1500); return etat(pg); };
try{
 for(const [nom,vp] of [['téléphone',{width:390,height:844}],['ordinateur',{width:1280,height:800}]]){
  const {pg,log}=await page(browser,{dir:'com',origin,viewport:vp,hasTouch:nom==='téléphone',rpc:RPC,
    tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]}});
  await pg.goto(origin+'/terms');await pause(pg,300);
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pause(pg,1200);
  const e0=await etat(pg);
  ok(e0.vue==='c'&&!e0.r.garde&&!e0.r.ailleurs,nom+' · à l\'accueil : aucune garde dans l\'historique');
  /* ── une vue de côté ── */
  await pg.click('#lvn-lf');await pause(pg,1600);
  const e1=await etat(pg);
  ok(e1.vue==='g'&&e1.r.garde,nom+' · vue de gauche : une garde est posée');
  const e2=await retour(pg);
  ok(e2.url==='/totehm'&&e2.vue==='c'&&!e2.r.garde,nom+' · « précédent » : retour au CENTRE, on reste sur le site → '+JSON.stringify({url:e2.url,vue:e2.vue}));
  /* ── la vue de droite, un spot ouvert ── */
  await pg.click('#lvn-rt');await pause(pg,1800);
  await pg.click('#rdr-mode button:last-child').catch(()=>{});await pause(pg,700);
  await pg.$eval('#rdr-g .tl:not(.tl-add)',e=>e.click()).catch(()=>{});await pause(pg,900);
  const e3=await etat(pg);
  ok(e3.vue==='d'&&e3.voir&&e3.r.garde,nom+' · vue de droite, un spot ouvert');
  const e4=await retour(pg);
  ok(e4.vue==='d'&&!e4.voir&&e4.r.garde,nom+' · « précédent » referme le spot, on reste dans la vue de droite (la garde revient)');
  const e5=await retour(pg);
  ok(e5.vue==='c'&&e5.url==='/totehm',nom+' · « précédent » encore : retour au centre');
  /* ── le TOTEHM déployé, une visionneuse au-dessus ── */
  await pg.click('#lv-tap-open');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});await pause(pg,1200);
  await pg.$eval('#habits .v-col[data-open]',e=>e.click());await pause(pg,500);
  await pg.$eval('#habits .habit.open [data-emo="m1"]',e=>e.click());await pause(pg,700);
  const e6=await etat(pg);
  ok(e6.deploye&&e6.vx&&e6.r.garde,nom+' · Totehm déployé, [Visualize it] ouvert au-dessus');
  const e7=await retour(pg);
  ok(e7.deploye&&!e7.vx&&e7.url==='/totehm',nom+' · « précédent » referme la visionneuse SEULE : le Totehm reste déployé');
  const e8=await retour(pg);
  ok(!e8.deploye&&e8.vue==='c'&&e8.url==='/totehm'&&!e8.r.garde,nom+' · « précédent » replie le Totehm (le repli, en un mouvement) → '+JSON.stringify({deploye:e8.deploye,vue:e8.vue}));
  /* ── le verso ── */
  await pg.click('#lv-tap-turn');await pause(pg,2600);
  const e9=await etat(pg);
  ok(e9.verso&&e9.r.garde,nom+' · le verso ouvert : une garde');
  const e10=await retour(pg);
  ok(!e10.verso&&e10.url==='/totehm'&&e10.vue==='c',nom+' · « précédent » referme le verso');
  /* ── à l'accueil, « précédent » quitte le site, comme partout ── */
  await pause(pg,600);
  const fin=await pg.goBack({timeout:5000}).then(()=>pg.url()).catch(()=>pg.url());
  ok(/\/terms$/.test(fin),nom+' · à l\'accueil, « précédent » quitte la page (vers la précédente) → '+fin);
  ok(!erreurs(log).length,nom+' · aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();
 }
}finally{await browser.close();}
