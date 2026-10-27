// 26/10/2026 — LA VISIBILITÉ PAR BOX (Wah : « il faut que chaque box ait un niveau de visibilité : private / my subscribers
// (binaire) »). Dans MON Totehm déployé, chaque box OUVERTE porte une ligne de mots DANS sa grammaire (27/10 : « pas un gros
// bouton noir qui fait tache ») : PRIVATE · VISIBLE TO MY SUBSCRIBERS, l'option vraie en blanc ; un tap sur l'autre, le serveur
// écrit (`box_audience_set` : habitude = son texte, le reste = son id), un refus remet l'ancien niveau. En lecture (le Totehm d'un autre, `totehm_read`), aucune pastille. Les cinq vues, téléphone et
// ordinateur. Tout est simulé (comptes, RPC) : aucune écriture en production. LANCER : node com_visibilite.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';const browser=await launch();const origin='https://www.totehm.com';
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const UID='11111111-1111-4111-8111-111111111111';
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight'],f:'every_morning',o:'o1'},{t:'Read at dawn',t0:'Read at dawn',is:['focus']}];
const LU={ok:true,pseudo:'studio',steps:[{t:'Deep practice',is:['focus']}],objs:{},trips:[],reps:[],wisdom:[],visions:[]};
const MES={my_landing:{signed_in:true,pseudo:'wahigher'},
  my_trips:{signed_in:true,trips:[{id:'o1',text:'Ship it',habits:['Run the hill']}],reps:[{id:'r1',text:'The phone',hs:['Run the hill'],habits:['Run the hill']}],
    wisdom:[{id:'w1',text:'Slow is smooth'}],visions:[{id:'v1',text:'A house by the sea'}]},
  my_box_audiences:{ok:true,h:{'Run the hill':'subscribers'},t:{o1:'subscribers'},r:{},w:{},v:{}},
  /* le serveur refuse la vision (un refus doit remettre l'ancien niveau) */
  box_audience_set:b=>b.p_kind==='v'?{ok:false,why:'not_mine'}:{ok:true,kind:b.p_kind,audience:b.p_audience,totehm:'subscribers'}};
/* vue, touches pour y aller depuis la précédente, niveau lu, ce qui part au serveur au tap, niveau après */
const VIS='visible to my subscribers';
const TOUR=[['habits',[],VIS,{p_kind:'h',p_id:'Run the hill',p_audience:'private'},'private'],
  ['objectives',['ArrowUp'],VIS,{p_kind:'t',p_id:'o1',p_audience:'private'},'private'],
  ['repulsions',['ArrowDown','ArrowDown'],'private',{p_kind:'r',p_id:'r1',p_audience:'subscribers'},VIS],
  ['wisdom',['ArrowUp','ArrowLeft'],'private',{p_kind:'w',p_id:'w1',p_audience:'subscribers'},VIS],
  ['visions',['ArrowRight','ArrowRight'],'private',{p_kind:'v',p_id:'v1',p_audience:'subscribers'},'private']];
/* la ligne : ses deux options, celle qui est vraie (`mot`), son style (aucun fond, ni bord : la grammaire de la box) */
const pastille=pg=>pg.evaluate(()=>{const b=document.querySelector('#habits .habit.open .baud');if(!b) return null;
  b.scrollIntoView({block:'center'});const on=b.querySelector('.baud-o.is-on'), r=on.getBoundingClientRect(),t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
  const cs=getComputedStyle(on), off=b.querySelector('.baud-o:not(.is-on)');
  return {mot:on.textContent.trim(),options:[...b.querySelectorAll('.baud-o')].map(e=>e.textContent.trim()).join('|'),
    vraie:on.getAttribute('aria-checked'),fond:cs.backgroundColor,bord:cs.borderTopStyle,police:cs.fontFamily,
    pale:off?getComputedStyle(off).color:'',libre:t===on||on.contains(t),vue:(window.__totehm_zone||{}).vue};});
try{
 for(const [nom,vp] of [['téléphone',{width:390,height:844}],['ordinateur',{width:1280,height:800}]]){
  {const {pg,log}=await page(browser,{dir:'com',origin,viewport:vp,hasTouch:nom==='téléphone',rpc:MES,
     tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]}});
   await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1000);
   await pg.click('#lv-tap-open');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});await pg.waitForTimeout(1200);
   ok(await pg.evaluate(()=>window.__totehm_audb().lu&&!document.querySelector('#habits .baud')),nom+' · les niveaux sont lus avec mon arbre ; fermées, les boxes ne portent rien de plus (les boxes sont sacrées)');
   for(const [vue,touches,avant,envoi,apres] of TOUR){
    for(const k of touches){ await pg.keyboard.press(k); await pg.waitForTimeout(700); }
    await pg.$eval('#habits .v-col[data-open]',e=>e.click());await pg.waitForTimeout(450);
    const a=await pastille(pg);
    ok(a&&a.vue===vue&&a.mot===avant&&a.vraie==='true'&&a.options==='private|'+VIS&&a.fond==='rgba(0, 0, 0, 0)'&&a.bord==='none'&&/Space Mono/.test(a.police)&&a.libre,
       nom+' · '+vue+' : la box ouverte dit qui la voit, dans SA grammaire (ni fond ni bord) : « '+(a&&a.options)+' », vraie = « '+(a&&a.mot)+' »');
    const n0=log.rpc.filter(x=>x.name==='box_audience_set').length;
    await pg.$eval('#habits .habit.open .baud .baud-o.is-on',e=>e.click());await pg.waitForTimeout(300);
    ok(log.rpc.filter(x=>x.name==='box_audience_set').length===n0,nom+' · '+vue+' : un tap sur l\'option déjà vraie n\'écrit rien');
    await pg.$eval('#habits .habit.open .baud .baud-o:not(.is-on)',e=>e.click());await pg.waitForTimeout(400);
    const b=await pastille(pg), envoye=log.rpc.filter(x=>x.name==='box_audience_set').slice(n0);
    ok(b&&b.mot===apres&&envoye.length===1&&JSON.stringify(envoye[0].body)===JSON.stringify(envoi),
       nom+' · '+vue+' : un tap → '+JSON.stringify(envoye.map(x=>x.body))+(envoi.p_kind==='v'?' ; refusé, l\'ancien niveau revient':'')+' → « '+(b&&b.mot)+' »');
    await pg.$eval('#habits .habit.open [data-x]',e=>e.click());await pg.waitForTimeout(350);
   }
   if(nom==='téléphone'){ await pg.keyboard.press('ArrowLeft');await pg.waitForTimeout(600);await pg.$eval('#habits .v-col[data-open]',e=>e.click());await pg.waitForTimeout(450);
     await pg.screenshot({path:OUT+'/visibilite_box.png'}); }
   const d=await pg.evaluate(()=>window.__totehm_audb());
   ok(d.bascules===5&&d.erreurs===1&&Object.values(d).every(v=>typeof v!=='string'),nom+' · __totehm_audb() : des compteurs, jamais une donnée → '+JSON.stringify(d));
   ok(!erreurs(log).length,nom+' · aucune erreur '+erreurs(log).join(' | '));
   await pg.context().close();}
  /* ── en LECTURE (le Totehm d'un autre, `totehm_read`) : aucune pastille, aucune écriture ── */
  {const {pg,log}=await page(browser,{dir:'com',origin,viewport:vp,hasTouch:nom==='téléphone',tables:{profiles:[{pseudo:'wah'}]},
     rpc:{totehm_read:LU,habit_spaces:{ok:true,mine:false,habits:[]}}});
   await pg.goto(origin+'/totehm?ro=studio');await pg.waitForSelector('body.ro:not(.gate)');await pg.waitForTimeout(600);
   await pg.$eval('#habits .v-col[data-open]',e=>e.click());await pg.waitForTimeout(450);
   const r=await pg.evaluate(()=>({open:!!document.querySelector('#habits .habit.open'),baud:document.querySelectorAll('.baud').length}));
   ok(r.open&&r.baud===0&&log.rpc.some(x=>x.name==='totehm_read')&&!log.rpc.some(x=>/box_audience|my_box_audiences|totehm_of/.test(x.name)),
      nom+' · lecture : lu par totehm_read, box ouverte SANS pastille, rien n\'est lu ni écrit sur les niveaux → '+JSON.stringify(r));
   ok(!erreurs(log).length,nom+' · lecture : aucune erreur '+erreurs(log).join(' | '));
   await pg.context().close();}
 }
}finally{await browser.close();}
