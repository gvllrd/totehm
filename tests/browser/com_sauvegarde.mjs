// 29/10/2026 — LA SAUVEGARDE INTELLIGENTE (Wah : « à chaque fois que je rentre une lettre, ça "saved", c'est trop … un
// système intelligent qui ne va pas flinguer mes quotas »). La lettre va en mémoire et dans le cache ; le serveur ne reçoit
// qu'après une PAUSE (2,5 s), ou tout de suite quand on quitte le champ (Entrée, curseur ailleurs, onglet caché) ; un envoi
// identique ne part pas ; « saved » ne s'affiche qu'après l'accord du serveur ; aucune Edge Function n'est appelée en
// écrivant. Téléphone et ordinateur. Tout est simulé : aucune écriture en production. LANCER : node com_sauvegarde.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const browser=await launch();const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const STEPS=[{t:'Run',t0:'Run',is:['fight'],f:'every_morning'}];
const MES={my_landing:{signed_in:true,pseudo:'wahigher'},
  my_trips:{signed_in:true,trips:[{id:'o1',text:'Ship',habits:['Run']}],reps:[],wisdom:[],visions:[]},
  my_box_audiences:{ok:true,h:{},t:{},r:{},w:{},v:{}}};
try{
 for(const [nom,vp] of [['téléphone',{width:390,height:844}],['ordinateur',{width:1280,height:800}]]){
  const envois=[];
  const {pg,log}=await page(browser,{dir:'com',origin,viewport:vp,hasTouch:nom==='téléphone',rpc:MES,
    tables:{profiles:[{pseudo:'wahigher'}],totehms:(url,req)=>{ if(req.method()==='POST'){ try{envois.push(JSON.parse(req.postData()));}catch(_){} return []; }
      return [{user_id:UID,steps:STEPS,vis:'private'}]; }}});
  const pas=()=>envois.length, statut=()=>pg.$eval('#fv-status',e=>e.textContent);
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1000);
  await pg.click('#lv-tap-open');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});await pg.waitForTimeout(1200);
  await pg.$eval('#habits .v-col[data-open]',e=>e.click());await pg.waitForTimeout(450);
  const n0=pas(), f0=log.functions.length;
  await pg.locator('#habits .habit.open .v-name[data-edit]').click();
  await pg.keyboard.press('End');
  /* ── 1 · dix lettres, 90 ms d'écart : rien ne part, rien ne dit « saved » ── */
  const vus=new Set();
  for(const c of ' the hill!'){ await pg.keyboard.type(c); vus.add(await statut()); await pg.waitForTimeout(90); }
  await pg.waitForTimeout(1200);
  const pendant=pas()-n0, d1=await pg.evaluate(()=>window.__totehm_save());
  ok(pendant===0&&!vus.has('saved')&&d1.minuteries===1,nom+' · dix lettres puis 1,2 s : zéro envoi, jamais « saved » → '+JSON.stringify({envois:pendant,statuts:[...vus]}));
  /* ── 2 · la pause : UN envoi, le texte entier, puis « saved » ── */
  await pg.waitForFunction(n=>window.__totehm_save().envois>n,d1.envois,{timeout:4000}).catch(()=>{});
  const s2=await statut(), e2=envois.slice(n0);
  ok(e2.length===1&&e2[0].steps&&e2[0].steps[0].t==='Run the hill!'&&s2==='saved',nom+' · après la pause : UN envoi (le texte entier « '+(e2[0]&&e2[0].steps[0].t)+' »), puis « '+s2+' »');
  /* ── 3 · Entrée : ça part tout de suite, sans attendre la pause ── */
  const n3=pas(); await pg.locator('#habits .habit.open .v-name[data-edit]').click(); await pg.keyboard.press('End');
  await pg.keyboard.type('!'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(450);
  ok(pas()-n3===1&&envois[envois.length-1].steps[0].t==='Run the hill!!',nom+' · Entrée : parti en moins de 0,5 s ('+(pas()-n3)+' envoi)');
  /* ── 4 · rien n'a changé : rien ne part ── */
  const n4=pas(), i4=(await pg.evaluate(()=>window.__totehm_save())).identiques;
  await pg.locator('#habits .habit.open .v-name[data-edit]').click(); await pg.keyboard.press('Enter'); await pg.waitForTimeout(1200);
  ok(pas()===n4&&(await pg.evaluate(()=>window.__totehm_save())).identiques>=i4,nom+' · un champ quitté sans changement : zéro envoi');
  /* ── 5 · l'onglet se cache au milieu d'un mot : ce qui dort part ── */
  const n5=pas(); await pg.locator('#habits .habit.open .v-name[data-edit]').click(); await pg.keyboard.press('End'); await pg.keyboard.type('?');
  await pg.evaluate(()=>{ Object.defineProperty(document,'hidden',{value:true,configurable:true}); document.dispatchEvent(new Event('visibilitychange')); });
  await pg.waitForTimeout(450);
  await pg.evaluate(()=>{ Object.defineProperty(document,'hidden',{value:false,configurable:true}); });
  ok(pas()-n5===1,nom+' · onglet caché au milieu d\'un mot : parti tout de suite');
  /* ── 6 · un objectif : le renommage (RPC SQL) attend la pause, une fois ── */
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  await pg.$eval('#habits .habit.open [data-x]',e=>e.click()).catch(()=>{}); await pg.waitForTimeout(350);
  await pg.keyboard.press('ArrowUp'); await pg.waitForTimeout(800);
  await pg.$eval('#habits .v-col[data-open]',e=>e.click()); await pg.waitForTimeout(450);
  const r0=log.rpc.filter(x=>x.name==='objective_rename').length;
  await pg.locator('#habits .habit.open .v-name[data-edit]').click(); await pg.keyboard.press('End');
  for(const c of ' it now') { await pg.keyboard.type(c); await pg.waitForTimeout(90); }
  await pg.waitForTimeout(1000);
  const r1=log.rpc.filter(x=>x.name==='objective_rename').length-r0;
  await pg.waitForTimeout(2200);
  const ren=log.rpc.filter(x=>x.name==='objective_rename').slice(r0);
  ok(r1===0&&ren.length===1&&ren[0].body.p_text==='Ship it now',nom+' · un objectif : zéro renommage pendant la frappe, UN après la pause → '+JSON.stringify(ren.map(x=>x.body.p_text)));
  ok(log.functions.length===f0,nom+' · zéro Edge Function appelée en écrivant ('+(log.functions.length-f0)+')');
  const d=await pg.evaluate(()=>window.__totehm_save());
  ok(Object.values(d).every(v=>typeof v!=='string')&&d.envois>=3&&d.echecs===0,nom+' · __totehm_save() : des compteurs, jamais une donnée → '+JSON.stringify(d));
  ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,nom+' · aucune erreur '+log.errors.join(' | '));
  await pg.context().close();
 }
}finally{await browser.close();}
