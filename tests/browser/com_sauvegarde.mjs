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
 /* ── 7 · 01/11 — LE SERVEUR REFUSE (403, comme du 13/10 au 01/11 : « permission denied for function _vis_shared ») :
       la saisie se voit « not saved » et reste EN ATTENTE dans le cache ; au démarrage suivant elle l'emporte sur la
       copie (vieille) du serveur et repart — plus jamais un rechargement qui efface ce qu'on a écrit ── */
 { let refuse=true; const recus=[];
   const {pg,log}=await page(browser,{dir:'com',origin,viewport:{width:390,height:844},hasTouch:true,rpc:MES,
     network:(url,req)=>{ if(url.pathname==='/rest/v1/totehms'&&req.method()==='POST'){
         if(refuse) return {status:403,contentType:'application/json',body:JSON.stringify({code:'42501',message:'permission denied for function _vis_shared'})};
         try{recus.push(JSON.parse(req.postData()));}catch(_){}
         return {status:201,contentType:'application/json',body:'[]'}; } return null; },
     tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]}});
   await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1000);
   await pg.click('#lv-tap-open');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});await pg.waitForTimeout(1200);
   await pg.$eval('#habits .v-col[data-open]',e=>e.click());await pg.waitForTimeout(450);
   await pg.locator('#habits .habit.open .v-name[data-edit]').click(); await pg.keyboard.press('End');
   await pg.keyboard.type(' far'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(900);
   const a=await pg.evaluate(()=>({d:window.__totehm_save(), s:document.getElementById('fv-status').textContent, c:JSON.parse(localStorage.getItem('totehm_habits_v1')||'null')}));
   ok(a.d.echecs>=1&&a.s==='not saved'&&a.d.nonConfirme===true&&!!a.c&&a.c.attente===true&&a.c.habits[0].t==='Run far',
      '01/11 · le serveur refuse : « '+a.s+' » s\'affiche, la saisie reste en attente dans le cache du téléphone → '+JSON.stringify({echecs:a.d.echecs,attente:a.c&&a.c.attente,t:a.c&&a.c.habits[0].t}));
   refuse=false;
   await pg.reload(); await pg.waitForSelector('body.member');
   await pg.waitForFunction(()=>window.__totehm_save&&window.__totehm_save().envois>=1,null,{timeout:8000}).catch(()=>{});
   const b=await pg.evaluate(()=>({d:window.__totehm_save(), c:JSON.parse(localStorage.getItem('totehm_habits_v1')||'null')}));
   const dernier=recus[recus.length-1];
   ok(b.d.repris===1&&!!dernier&&dernier.steps[0].t==='Run far'&&b.d.nonConfirme===false&&b.c&&b.c.attente===false,
      '01/11 · au démarrage suivant, la saisie non confirmée l\'emporte sur la copie du serveur (« Run ») et repart : « '+(dernier&&dernier.steps[0].t)+' », confirmée → '+JSON.stringify({repris:b.d.repris,envois:b.d.envois,attente:b.c&&b.c.attente}));
   ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,'01/11 · refus puis reprise : aucune erreur de page '+log.errors.filter(e=>e.startsWith('pageerror')).join(' | '));
   await pg.context().close(); }
 /* ── 8 · 01/11 — LE CACHE DE LA PAGE D'AVANT (`pseudo`, sans `attente`) : s'il diffère d'une copie du serveur antérieure
       au droit rendu (01/11 20:46), il ne contient que des saisies refusées → il l'emporte et repart ; si le serveur a reçu
       depuis, sa copie est la plus récente → elle gagne, rien ne part ── */
 for(const [cas,recu,attendu] of [['serveur figé (20/08)','2026-08-20T13:41:51Z','Run uphill'],['serveur reçu après le droit rendu','2026-11-01T21:00:00Z','Run']]){
   const recus=[];
   const {pg,log}=await page(browser,{dir:'com',origin,viewport:{width:390,height:844},hasTouch:true,rpc:MES,
     network:(url,req)=>{ if(url.pathname==='/rest/v1/totehms'&&req.method()==='POST'){ try{recus.push(JSON.parse(req.postData()));}catch(_){}
         return {status:201,contentType:'application/json',body:'[]'}; } return null; },
     tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private',updated_at:recu}]}});
   await pg.addInitScript(([uid])=>{ if(sessionStorage.getItem('graine'))return; sessionStorage.setItem('graine','1');
     localStorage.setItem('totehm_habits_v1',JSON.stringify({habits:[{t:'Run uphill',t0:'Run',f:'every_morning',i:'fight',is:['fight'],o:null}],vis:'private',uid,pseudo:'wahigher'})); },[UID]);
   await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');
   await pg.waitForFunction(()=>window.__totehm_save&&(window.__totehm_save().envois>=1||document.body.classList.contains('member')),null,{timeout:8000}).catch(()=>{});
   await pg.waitForTimeout(1800);
   const d=await pg.evaluate(()=>({s:window.__totehm_save(), c:JSON.parse(localStorage.getItem('totehm_habits_v1')||'null')}));
   const parti=recus.length?recus[recus.length-1].steps[0].t:null;
   ok(d.c&&d.c.habits[0].t===attendu&&d.c.attente===false&&(attendu==='Run'?recus.length===0&&d.s.repris===0:parti===attendu&&d.s.repris===1),
      '01/11 · cache de la page d\'avant, '+cas+' : « '+(d.c&&d.c.habits[0].t)+' » gagne → '+JSON.stringify({envoye:parti,repris:d.s.repris,attente:d.c&&d.c.attente}));
   ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,'01/11 · cache d\'avant ('+cas+') : aucune erreur de page '+log.errors.filter(e=>e.startsWith('pageerror')).join(' | '));
   await pg.context().close(); }
}finally{await browser.close();}
