// 10/11/2026 — LA LOUPE DU VERSO (Wah : « le contenu des parties MONETIZE MY TOTEHM et GO Higher doit pouvoir être zoomé
// en un coup, car quelquefois c'est difficilement lisible »). La loupe des boxes du TOTEHM déployé, au bout des deux onglets :
//   1 · un tap agrandit la partie montrée EN PLACE (+25 %) : le texte grandit, la colonne garde sa largeur, rien ne déborde ;
//   2 · l'état tient d'une partie à l'autre ; un second tap la rend.
// Tout est simulé. LANCER : node com_verso_loupe.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';
const browser=await launch();const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:[{t:'Run the hill',t0:'Run the hill',is:['fight']}],vis:'private'}]};
const LAND={signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false,open:false},higher:{active:false,price_cents:700,currency:'eur',period:'month'},thp:false,telegram:false};
const CREA={ok:true,subscribers:3,month_cents:1920,pending_cents:1920,currency:'eur',next_payout:'2026-11-01',threshold_cents:2500,part:80,price_cents:2400,min_cents:300,max_cents:100000};
const CONS={signed_in:true,offer:{enabled:true,price_cents:2400,currency:'eur',payout_fin:'1234'},subscriptions:[]};
const mesure=pg=>pg.evaluate(()=>{const r=s=>{const e=document.querySelector(s);if(!e||!e.getClientRects().length)return null;const b=e.getBoundingClientRect();return {l:Math.round(b.left),w:Math.round(b.width)};};
  const t=s=>{const e=document.querySelector(s);return e&&e.getClientRects().length?+(parseFloat(getComputedStyle(e).fontSize)*(parseFloat(getComputedStyle(e.closest('[id]')||e).zoom)||1)).toFixed(2):null;};
  const big=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return Math.round(b.height);};
  return {on:document.getElementById('srch').classList.contains('is-loupe'), tab:document.getElementById('srch').dataset.tab,
    pressed:document.getElementById('vs-loupe').getAttribute('aria-pressed'),
    mw:r('#mw-creator'), set:r('#settings'), dash:r('#vs-dash'), tabs:r('#vs-tabs'),
    hMenu:big('#mw-menu .vs-t'), hMw:big('#mw-creator .vs-month'),
    /* un débordement = un élément VISIBLE du verso qui sort de l'écran, ou la page qui défile de côté */
    deborde:document.documentElement.scrollWidth>innerWidth+1||[...document.querySelectorAll('#srch-ui *')].some(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1)};});
try{
 for(const [nom,vp] of [['téléphone',{width:390,height:844}],['ordinateur',{width:1280,height:800}]]){
  const {pg,log}=await page(browser,{dir:'com',origin,tables,viewport:vp,hasTouch:nom==='téléphone',
    rpc:{my_landing:LAND,creator_dashboard:CREA,my_console:CONS,my_board:{ok:true,tz:'UTC',habits:[],days:[],week:{},intentions:{},objectives:[],heat:[],totals:{},feed:[]}}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.click('#lv-tap-turn');
  await pg.waitForFunction(()=>document.getElementById('srch').classList.contains('is-pret'),null,{timeout:6000}).catch(()=>{});await pg.waitForTimeout(700);
  const a=await mesure(pg);
  ok(!a.on&&a.pressed==='false'&&!!a.tabs,nom+' · la loupe est au bout des deux onglets, fermée');
  await pg.click('#vs-loupe');await pg.waitForTimeout(300);
  const b=await mesure(pg);
  ok(b.on&&b.pressed==='true'&&b.hMenu>a.hMenu*1.15&&b.set&&a.set&&Math.abs(b.set.w-a.set.w)<=2&&!b.deborde,
     nom+' · GO Higher : un tap, le contenu grandit ('+a.hMenu+' → '+b.hMenu+' px de titre), la colonne garde sa largeur ('+a.set.w+' → '+b.set.w+'), rien ne déborde');
  await pg.screenshot({path:OUT+'/verso_loupe_'+(nom==='téléphone'?'tel':'ordi')+'.png'});
  await pg.click('#vs-tabs [data-vs-tab="money"]');await pg.waitForTimeout(500);
  const c=await mesure(pg);
  ok(c.on&&c.tab==='money'&&c.mw&&c.mw.w<=Math.round(Math.min(vp.width*.94,420))+2&&!c.deborde,
     nom+' · MONETIZE MY TOTEHM : la loupe tient d\'une partie à l\'autre, la colonne reste dans l\'écran ('+(c.mw&&c.mw.w)+' px)');
  await pg.click('#vs-loupe');await pg.waitForTimeout(300);
  const d=await mesure(pg);
  ok(!d.on&&d.pressed==='false'&&d.hMw<c.hMw,nom+' · un second tap rend la taille ('+c.hMw+' → '+d.hMw+' px de titre)');
  ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,nom+' · aucune erreur');
  await pg.context().close();
 }
}finally{await browser.close();}
