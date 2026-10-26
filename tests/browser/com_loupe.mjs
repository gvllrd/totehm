// 21/10/2026 — LA LOUPE DANS TOUTES LES BOXES DU TOTEHM DÉPLIÉ (Wah : « n'oublie pas le système de loupe-zoom dans
// TOUTES les box de la vue centrale, Totehm déployé-ouvert »). Les cinq vues, chaque box fermée PUIS ouverte, la boîte
// du filtre, et le Totehm d'un autre membre ; au téléphone et à l'ordinateur. Une loupe = un bouton visible, que rien
// ne recouvre (mesuré au point), qui agrandit la box EN PLACE (×1,25) et la rend d'un second tap — jamais une fenêtre.
// Tout est simulé (comptes, RPC) : aucune écriture en production.
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';const browser=await launch();const origin='https://www.totehm.com';
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const UID='11111111-1111-4111-8111-111111111111';
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight'],f:'every_morning',o:'o1'},{t:'Read at dawn',t0:'Read at dawn',is:['focus']},{t:'Call mum',t0:'Call mum',is:['love']}];
const MES={my_landing:{signed_in:true,pseudo:'wahigher'},
  my_trips:{signed_in:true,trips:[{id:'o1',text:'Ship it',habits:['Run the hill']}],reps:[{id:'r1',text:'The phone',hs:['Run the hill'],habits:['Run the hill']}],
    wisdom:[{id:'w1',text:'Slow is smooth'}],visions:[{id:'v1',text:'A house by the sea'}]}};
const LU={ok:true,pseudo:'studio',steps:[{t:'Deep practice',is:['focus']}],objs:{'Deep practice':['o1']},trips:[{id:'o1',text:'Build a practice',is:['focus']}],
  reps:[{id:71,text:'Put the phone away',is:['focus'],hs:['Deep practice']}],wisdom:[{id:'w1',text:'Attention is a choice',is:['focus']}],visions:[{id:'v1',text:'A focused life',is:['focus']}]};
/* Les cinq vues depuis les habitudes : la croix (↑ objectifs, ↓ répulsions, ← sagesse, → visions), on revient au centre entre deux. */
const TOUR=[['habits',[]],['objectives',['ArrowUp']],['repulsions',['ArrowDown','ArrowDown']],['wisdom',['ArrowUp','ArrowLeft']],['visions',['ArrowRight','ArrowRight']]];
const mesure=pg=>pg.evaluate(()=>{const cols=[...document.querySelectorAll('#habits .v-col')];
  return {vue:(window.__totehm_zone||{}).vue, n:cols.length, l:cols.map(c=>{const l=c.querySelector(':scope > .loupe');if(!l) return 'absente';
    l.scrollIntoView({block:'center'});const b=l.getBoundingClientRect(),cs=getComputedStyle(l);
    if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<.3||b.width<12) return 'cachée';
    const t=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return (t===l||l.contains(t))?'ok':'couverte';})};});
/* Un tap sur la loupe de la i-ème box : elle grandit en place ; un second tap la rend. */
async function zoome(pg,sel){
  const h0=await pg.$eval(sel,e=>e.closest('.v-col').getBoundingClientRect().height);
  await pg.$eval(sel,e=>e.click());await pg.waitForTimeout(150);
  const z=await pg.$eval(sel,e=>{const c=e.closest('.v-col');return {on:c.classList.contains('is-zoom'),h:c.getBoundingClientRect().height,p:e.getAttribute('aria-pressed')};});
  await pg.$eval(sel,e=>e.click());await pg.waitForTimeout(120);
  const off=await pg.$eval(sel,e=>!e.closest('.v-col').classList.contains('is-zoom'));
  return {ok:z.on&&z.h>h0*1.1&&z.p==='true'&&off, h0:Math.round(h0), h1:Math.round(z.h)};
}
try{
 for(const [nom,vp] of [['téléphone',{width:390,height:844}],['ordinateur',{width:1280,height:800}]]){
  /* ── 1 · MON Totehm : chaque box des cinq vues, fermée puis ouverte ── */
  {const {pg,log}=await page(browser,{dir:'com',origin,viewport:vp,hasTouch:nom==='téléphone',rpc:MES,
     tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]}});
   await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1000);
   await pg.click('#lv-tap-open');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});await pg.waitForTimeout(1200);
   for(const [vue,touches] of TOUR){
    for(const k of touches){ await pg.keyboard.press(k); await pg.waitForTimeout(700); }
    const f=await mesure(pg);
    ok(f.vue===vue&&f.n>0&&f.l.every(x=>x==='ok'),nom+' · '+vue+' : une loupe sur CHAQUE box fermée ('+f.n+') → '+f.l.join(','));
    const z=await zoome(pg,'#habits .v-col > .loupe');
    ok(z.ok,nom+' · '+vue+' : un tap agrandit la box EN PLACE ('+z.h0+' → '+z.h1+' px), un second la rend');
    await pg.$eval('#habits .v-col[data-open]',e=>e.click());await pg.waitForTimeout(450);
    const o=await mesure(pg), x=await pg.evaluate(()=>{const l=document.querySelector('#habits .habit.open .v-col > .loupe'),w=document.querySelector('#habits .habit.open .w-x');
      if(!l||!w) return false;const a=l.getBoundingClientRect(),b=w.getBoundingClientRect();return a.right<=b.left+1||a.left>=b.right-1;});
    ok(o.l.every(v=>v==='ok')&&x,nom+' · '+vue+' : ouverte, la box GARDE sa loupe, à côté de la croix, jamais dessous → '+o.l.join(','));
    const zo=await zoome(pg,'#habits .habit.open .v-col > .loupe');
    ok(zo.ok,nom+' · '+vue+' : ouverte, la loupe l\'agrandit aussi ('+zo.h0+' → '+zo.h1+' px)');
    await pg.$eval('#habits .habit.open [data-x]',e=>e.click());await pg.waitForTimeout(350);
   }
   /* ── 2 · LA BOÎTE DU FILTRE (le T) : elle aussi ── */
   for(const k of ['ArrowLeft']){ await pg.keyboard.press(k); await pg.waitForTimeout(700); }
   await pg.$eval('#bigT',e=>e.click());await pg.waitForTimeout(450);
   const fl=await pg.evaluate(()=>{const l=document.querySelector('#habits .habit.filtre .v-col > .loupe'),w=document.querySelector('#habits .habit.filtre .w-x');
     if(!l) return {l:false};const a=l.getBoundingClientRect(),b=w.getBoundingClientRect(),t=document.elementFromPoint(a.x+a.width/2,a.y+a.height/2);
     return {l:true,libre:t===l||l.contains(t),cote:a.right<=b.left+1,vue:(window.__totehm_zone||{}).vue};});
   ok(fl.l&&fl.libre&&fl.cote&&fl.vue==='habits',nom+' · la boîte du FILTRE a sa loupe, à côté de sa croix → '+JSON.stringify(fl));
   const zf=await zoome(pg,'#habits .habit.filtre .v-col > .loupe');
   ok(zf.ok,nom+' · le filtre s\'agrandit en place ('+zf.h0+' → '+zf.h1+' px)');
   await pg.$eval('#habits .habit.filtre .v-col > .loupe',e=>e.click());await pg.waitForTimeout(150);
   await pg.$eval('#habits .habit.filtre [data-pk^="fint"]',e=>e.click());await pg.waitForTimeout(300);
   ok(await pg.evaluate(()=>{const c=document.querySelector('#habits .habit.filtre .v-col');return !!c&&c.classList.contains('is-zoom');}),nom+' · agrandi, le filtre le RESTE quand on y choisit quelque chose (l\'état survit au redessin)');
   if(nom==='téléphone') await pg.screenshot({path:OUT+'/loupe_filtre.png'});
   ok(!erreurs(log).length&&!log.rpc.some(x=>/rename|_create|_set|_delete|totehm_save/.test(x.name)),nom+' · la loupe ne lit ni n\'écrit rien '+erreurs(log).join(' | '));
   await pg.context().close();}
  /* ── 3 · LE TOTEHM D'UN AUTRE MEMBRE (lecture) : la loupe et COPY sur chaque box ── */
  {const {pg,log}=await page(browser,{dir:'com',origin,viewport:vp,hasTouch:nom==='téléphone',tables:{profiles:[{pseudo:'wah'}]},
     rpc:{totehm_read:LU,habit_spaces:{ok:true,mine:false,habits:[]}}});
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/totehm?ro=studio');await pg.waitForSelector('body.ro:not(.gate)');await pg.waitForTimeout(500);
   for(const [vue,touches] of TOUR){
    for(const k of touches){ await pg.keyboard.press(k); await pg.waitForTimeout(400); }
    const f=await mesure(pg), cp=await pg.locator('#habits .copie').count();
    ok(f.vue===vue&&f.n>0&&f.l.every(x=>x==='ok')&&cp===f.n,nom+' · lecture · '+vue+' : la loupe ET Copy sur chaque box ('+f.n+') → '+f.l.join(','));
   }
   ok(!erreurs(log).length,nom+' · lecture : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
 }
}finally{await browser.close();}
