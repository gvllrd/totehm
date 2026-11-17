// COM · 16/11/2026 — PILE OU FACE SUR ORDINATEUR. Wah : « avoir vraiment le verso du TOTEHM comme le recto : actuellement le
// verso, contrairement au recto, est en plein écran ; deux facettes facilement retournables de part et d'autre ».
// Au-delà de 700 px : le verso s'arrête au CARRÉ du recto déployé, et chaque face se retourne sur l'autre.
// Au téléphone : rien ne change. Base simulée, aucune écriture. LANCER : node com_pile_face.mjs /tmp
import {launch,page,ok,USER} from './harness.mjs';
const OUT=process.argv[2]||'.';
const origin='https://www.totehm.com',browser=await launch();
const habits=[{t:'Run the hill',is:['fight'],f:'daily'}];
const rpc={my_landing:{signed_in:true,pseudo:'wahigher',telegram:false,higher:{active:true}},my_board:{ok:true,today:'2026-11-10',objectives:[],heat:[],feed:[],totals:{}},
 tracking_summary_for_me:{ok:true,days_count:7,counts:{done:2,missed:1,unanswered:1},days:Array.from({length:7},(_,d)=>({day:'2026-11-'+String(4+d).padStart(2,'0')})),habits:[],settings:{}},
 my_console:{signed_in:true,offer:{enabled:true,price_cents:2400,currency:'eur',payout_fin:'1234'},subscriptions:[]},my_trips:{signed_in:true,trips:[],reps:[],wisdom:[],visions:[]}};
const etat=pg=>pg.evaluate(()=>({gate:document.body.classList.contains('gate'),verso:document.getElementById('srch').classList.contains('is-open')}));
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
try{
 {const {pg,log}=await page(browser,{dir:'com',origin,viewport:{width:1280,height:800},tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:USER.id,steps:habits}]},rpc});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.click('#lv-tap-turn');await pg.waitForSelector('#srch.is-pret');await pg.waitForTimeout(900);
  const v=await pg.evaluate(()=>{const r=id=>document.getElementById(id).getBoundingClientRect();const bg=r('srch-bg'),ui=r('srch-ui'),st=r('stage'),f=r('srch-flip');
    return {bg:[bg.x,bg.y,bg.width],st:[st.x,st.y,st.width],ui:ui.width<st.width&&ui.x>st.x&&ui.y>st.y,flip:f.width>20&&f.x>st.x&&f.y>st.y&&f.y<st.y+80};});
  ok(Math.abs(v.bg[0]-v.st[0])<2&&Math.abs(v.bg[1]-v.st[1])<2&&Math.abs(v.bg[2]-v.st[2])<2,'ordinateur · le verso s\'arrête au CARRÉ du recto déployé ('+Math.round(v.bg[2])+' px, au pixel près du recto)');
  ok(v.ui&&v.flip,'ordinateur · son contenu défile DANS le carré, et le bouton « retourner » est dans son coin');
  await pg.screenshot({path:OUT+'/pile_face_verso.png'});
  await pg.click('#srch-flip');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});await pg.waitForTimeout(1300);
  let e=await etat(pg); ok(!e.gate&&!e.verso,'ordinateur · ⟲ sur le verso : le recto se déploie au même format');
  ok(await pg.evaluate(()=>{const b=document.getElementById('fold-flip').getBoundingClientRect(),s=document.getElementById('stage').getBoundingClientRect();return b.width>20&&b.x>s.x&&b.y>s.y&&b.y<s.y+80&&getComputedStyle(document.getElementById('fold-flip')).opacity==='1';}),
     'ordinateur · le recto déployé porte le même bouton, dans son coin');
  await pg.screenshot({path:OUT+'/pile_face_recto.png'});
  await pg.click('#fold-flip');await pg.waitForSelector('#srch.is-pret',{timeout:9000}).catch(()=>{});await pg.waitForTimeout(700);
  e=await etat(pg); ok(e.gate&&e.verso,'ordinateur · ⟲ sur le recto : le verso revient, au même format');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(1600);
  e=await etat(pg); const lv=await pg.evaluate(()=>window.__totehm_lv());
  ok(e.gate&&!e.verso&&lv.vue==='c'&&!lv.bouge,'Échap ramène à l\'accueil, et ses gestes sont libres');
  ok(!erreurs(log).length,'ordinateur · aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();}
 {const {pg,log}=await page(browser,{dir:'com',origin,viewport:{width:390,height:844},hasTouch:true,tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:USER.id,steps:habits}]},rpc});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.click('#lv-tap-turn');await pg.waitForSelector('#srch.is-pret');await pg.waitForTimeout(900);
  const t=await pg.evaluate(()=>{const ui=document.getElementById('srch-ui').getBoundingClientRect();return {plein:ui.width===innerWidth&&ui.height===innerHeight,flip:getComputedStyle(document.getElementById('srch-flip')).display};});
  ok(t.plein&&t.flip==='none','téléphone · rien ne change : le verso reste plein écran, sans bouton « retourner »');
  ok(!erreurs(log).length,'téléphone · aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();}
}finally{await browser.close();}
