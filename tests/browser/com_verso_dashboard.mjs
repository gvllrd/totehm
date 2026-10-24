// COM — le verso a TROIS ONGLETS et s'ouvre sur le TABLEAU DE BORD (Wah, 24/10/2026).
// « Enregistrer TOUT ce que fait l'utilisateur dans son Totehm et le mettre sous forme de visuels » · « le Telegram sert de
// tracking, pas le verso » · « 3 onglets : l'abonnement, la monétisation et le tableau de bord, en vue par défaut ».
// 1 · Dashboard par défaut (à chaque retournement) · Subscription · Monetize : un onglet ne montre que son bloc.
// 2 · Le tableau de bord DESSINE ce que le serveur a calculé (`my_board`, appelé avec MON fuseau) : la semaine, la
//     courbe, la matrice Habits × 7 jours (point = fait, de la couleur de l'intention ; trait = pas fait ; cercle = sans
//     réponse), les séries, les sept intentions, les objectifs qui arrivent, 12 semaines d'activité, le fil, les totaux.
// 3 · Il ne coche RIEN (le suivi se fait dans Telegram) ; Telegram pas relié : « Connect » mène à TotehmBot (Subscription).
// 4 · La charte : fonds noirs, aucun fond blanc, les intentions en point ou en trait ; ce que le membre a écrit est échappé.
// Tout est simulé (comptes, RPC) : aucune écriture en production. LANCER : node com_verso_dashboard.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';
const browser=await launch();const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight']},{t:'Read at dawn',t0:'Read at dawn',is:['focus']}];
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]};
const LAND={signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false,open:false},higher:{active:false,price_cents:700,currency:'eur',period:'month'},
  thp:false,telegram:false,sm:{ready:true,habit:true,objective:true,higher:false,free_total:7,free_left:6,left:6}};
const CREA={ok:true,subscribers:3,month_cents:1920,pending_cents:1920,currency:'eur',next_payout:'2026-11-01',threshold_cents:2500,part:80,price_cents:2400,min_cents:300,max_cents:100000};
const CONS={signed_in:true,offer:{enabled:true,price_cents:2400,currency:'eur',payout_fin:'1234'},subscriptions:[]};
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
/* Le tableau de bord tel que `my_board` le rend (mêmes clés), autour d'aujourd'hui. */
const iso=d=>d.toISOString().slice(0,10), J=k=>{const d=new Date();d.setUTCDate(d.getUTCDate()+k);return iso(d);};
const TODAY=J(0);
const DB={ok:true,tz:'UTC',today:TODAY,telegram:false,
  habits:[{t:'Run the hill',is:['fight'],f:'every_morning',cible:7,c:['d','d','m','d','a','d','d'],fait:5,serie:2,record:3},
          {t:'Read at dawn',is:['focus'],f:'every_other_day',cible:4,c:['','d','','m','','','a'],fait:1,serie:0,record:1},
          {t:'Call <b>mum</b>',is:['love'],f:null,cible:null,c:['','','','','','',''],fait:0,serie:0,record:0}],
  days:[-6,-5,-4,-3,-2,-1,0].map((k,i)=>({d:J(k),fait:[1,2,0,1,0,1,1][i],manque:[0,0,1,1,0,0,0][i],demande:[1,2,1,2,1,1,2][i]})),
  week:{fait:6,cible:11,manque:2,sans:2,aujourdhui:1,demandes:2,top:{t:'Run the hill',fait:5,serie:2,cible:7}},
  intentions:{fight:{habits:1,fait:12},flow:{habits:0,fait:0},enrich:{habits:0,fait:0},love:{habits:1,fait:3},express:{habits:0,fait:0},focus:{habits:1,fait:6},celebrate:{habits:0,fait:0}},
  objectives:[{t:'Run a marathon',i:'fight',by:J(12),jours:12,temps:.62,habits:1},{t:'Ship my collection',i:'express',by:J(40),jours:40,temps:.2,habits:0},
              {t:'Old promise',i:null,by:J(-3),jours:-3,temps:1,habits:0}],
  heat:Array.from({length:84},(_,i)=>i%9===0?0:(i*7)%5),
  totals:{habits:3,objectives:3,achieved:1,repulsions:2,visions:1,story:4,media:6,spots:2,reflections:9,tracked:31,chapters:0,gestes:212},
  feed:[{at:new Date(Date.now()-5*60e3).toISOString(),box:'track',k:'tracked_done',l:'Run the hill',i:'fight'},
        {at:new Date(Date.now()-3*3600e3).toISOString(),box:'reflection',k:'reflection',l:null,i:null},
        {at:new Date(Date.now()-26*3600e3).toISOString(),box:'habit',k:'habit_added',l:'<img src=x onerror=alert(1)>',i:'love'},
        ...Array.from({length:9},(_,i)=>({at:new Date(Date.now()-(3+i)*86400e3).toISOString(),box:'objective',k:'objective_added',l:'Goal '+i,i:'express'}))],
  since:'2026-08-06T10:00:00Z'};
const vu=pg=>pg.evaluate(()=>{const o=s=>{const e=document.querySelector(s);if(!e||!e.getClientRects().length) return 0;let x=e,a=1;
    while(x&&x!==document.body){const c=getComputedStyle(x);if(c.visibility==='hidden'||c.display==='none') return 0;a*=+c.opacity;x=x.parentElement;}return +a.toFixed(2);};
  return {dash:o('#vs-dash'),gagne:o('#mw-creator'),higher:o('#mw-menu'),pied:o('.vs-foot'),vide:o('#vs-vide'),
    tab:document.getElementById('srch').dataset.tab,sel:[...document.querySelectorAll('#vs-tabs [aria-selected="true"]')].map(b=>b.dataset.vsTab).join()};});
try{
 for(const [nom,vp] of [['téléphone',{width:390,height:844}],['ordinateur',{width:1280,height:800}]]){
  {const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:vp,hasTouch:nom==='téléphone',
     rpc:{my_landing:LAND,creator_dashboard:CREA,my_console:CONS,my_board:DB,new_bot_link_code:'c0de'}});
   await pg.addInitScript(()=>{ window.__ouvert=[]; window.open=(u)=>{ window.__ouvert.push(String(u)); return null; }; });
   await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
   /* ── 1 · trois onglets, le Dashboard d'abord ── */
   await pg.click('#lv-tap-turn');
   await pg.waitForFunction(()=>document.getElementById('srch').classList.contains('is-pret'),null,{timeout:6000}).catch(()=>{});await pg.waitForTimeout(400);
   const a=await vu(pg), tabs=await pg.$$eval('#vs-tabs [data-vs-tab]',l=>l.map(b=>b.textContent.trim()));
   ok(tabs.join()==='Dashboard,Subscription,Monetize'&&a.tab==='dash'&&a.sel==='dash'&&a.dash===1&&!a.gagne&&!a.higher&&a.pied===1,
      nom+' · trois onglets (Dashboard · Subscription · Monetize), ouvert sur le DASHBOARD → '+JSON.stringify(a));
   const appel=log.rpc.find(x=>x.name==='my_board');
   ok(appel&&typeof appel.body.p_tz==='string'&&appel.body.p_tz.length>0,nom+' · my_board est appelé avec MON fuseau → '+JSON.stringify(appel&&appel.body));
   /* ── 2 · ce qu'il dessine ── */
   const d=await pg.evaluate(()=>{const q=s=>[...document.querySelectorAll('#vs-dash '+s)], t=s=>document.querySelector('#vs-dash '+s)?.textContent.trim();
     const k=q('.db-k > div').map(e=>e.querySelector('b').textContent.trim());
     const cel=q('.db-m .db-c').map(e=>e.className.replace('db-c','').trim()), pt=q('.db-m .db-c.is-d')[0];
     return {k, top:t('.db-k em'), courbe:{chemin:!!document.querySelector('#vs-dash .db-courbe path.l'),points:q('.db-courbe circle').length,auj:q('.db-courbe circle.is-auj').length,jours:q('.db-courbe text:not(.v)').length},
       noms:q('.db-n').map(e=>e.firstChild.textContent), cel, rond:pt?getComputedStyle(pt,'::before').backgroundColor:'', series:q('.db-s').map(e=>e.textContent),
       ints:q('.db-i .tr span').map(e=>e.style.width), intC:q('.db-i .tr').map(e=>getComputedStyle(e).getPropertyValue('--c').trim()),
       obj:q('.db-o .j').map(e=>e.textContent), heat:q('.db-heat span:not([style*="hidden"])').length, auj:q('.db-heat span.is-auj').length,
       fil:q('.db-f > div').length, filT:q('.db-f .q').map(e=>e.textContent), img:!!document.querySelector('#vs-dash img'), b:!!document.querySelector('#vs-dash .db-n b'),
       tot:q('.db-tot span').length, depuis:t('.db-tot')?null:null, tete:q('.db-t').map(e=>e.firstChild.textContent.trim()),
       fonds:[...new Set(q('.db, .db-k > div, .db-tot span, .db-tg').map(e=>getComputedStyle(e).backgroundColor))],
       blanc:q('*').filter(e=>/rgb\(255, 255, 255\)/.test(getComputedStyle(e).backgroundColor)&&!e.closest('.db-heat')&&!e.closest('.db-bar')).length,
       diag:window.__totehm_dash()};});
   ok(d.k[0]==='75%'&&/^1\s*\/ 2$/.test(d.k[1])&&/^2\s*d$/.test(d.k[2])&&d.top==='Run the hill',nom+' · la semaine : 75 % (6 faites, 2 manquées), aujourd\'hui 1 / 2, série 2 j sur « Run the hill » → '+JSON.stringify(d.k));
   ok(d.courbe.chemin&&d.courbe.points===7&&d.courbe.auj===1&&d.courbe.jours===7,nom+' · la courbe des 7 jours, aujourd\'hui marqué → '+JSON.stringify(d.courbe));
   ok(d.noms.join('|')==='Run the hill|Read at dawn|Call <b>mum</b>'&&!d.b&&d.cel.length===21
      &&d.cel.slice(0,7).join()==='is-d,is-d,is-m,is-d,is-a,is-d,is-d'&&d.rond==='rgb(226, 75, 74)'&&d.series.join()==='2d,0d,0d',
      nom+' · la matrice : 3 Habits × 7 jours ; fait = un POINT de la couleur de l\'intention (Fight #E24B4A) ; séries ; le texte du membre échappé');
   ok(d.ints.length===7&&d.ints[0]==='100%'&&d.ints[1]==='0%'&&d.intC[0].toUpperCase()==='#E24B4A',nom+' · les sept intentions en TRAITS de leur couleur, 28 jours → '+d.ints.join(' '));
   ok(d.obj.join()==='D-12,D-40,late',nom+' · les objectifs qui arrivent (D-12, D-40, en retard) → '+d.obj.join());
   ok(d.heat===84&&d.auj===1,nom+' · 12 semaines d\'activité, une case par jour, aujourd\'hui marqué ('+d.heat+')');
   ok(d.fil===8&&/^done · Run the hill$/.test(d.filT[0])&&!d.img,nom+' · le fil : les 8 derniers gestes, en mots, rien d\'injecté → '+d.filT.slice(0,3).join(' | '));
   ok(d.tot===10&&d.tete.includes('My Habits')&&d.tete.includes('My TOTEHM'),nom+' · mon TOTEHM en chiffres (10 compteurs)');
   ok(d.fonds.every(c=>c==='rgb(0, 0, 0)')&&d.blanc===0,nom+' · la charte : des fonds NOIRS, aucun fond blanc → '+d.fonds.join());
   ok(d.diag.onglet==='dash'&&d.diag.charge&&d.diag.habits===3&&d.diag.cases===10&&d.diag.heat===84&&!d.diag.telegram&&Object.values(d.diag).every(v=>typeof v!=='string'||v==='dash'),
      nom+' · __totehm_dash() : des nombres et des booléens, jamais une donnée de membre → '+JSON.stringify(d.diag));
   await pg.screenshot({path:OUT+'/dash_'+(nom==='téléphone'?'tel':'ordi')+'.png',fullPage:false});
   const sh=await pg.evaluate(()=>{const u=document.getElementById('srch-ui');return {h:u.scrollHeight,c:u.clientHeight};});
   /* ── 3 · il ne coche rien ; Connect mène à TotehmBot ── */
   ok(!(await pg.$('#vs-dash input, #vs-dash [type="checkbox"]'))&&!log.rpc.some(x=>/habit_outcome|track/.test(x.name)),nom+' · le verso ne coche RIEN : le suivi se fait dans Telegram');
   await pg.click('#vs-dash [data-db-tg]');await pg.waitForTimeout(500);
   const t=await vu(pg);
   ok(t.tab==='sub'&&t.higher===1&&!t.dash,nom+' · Telegram pas relié : « Connect » ouvre l\'onglet Subscription, là où vit TotehmBot → '+t.tab);
   /* ── 1 bis · Monetize ; puis refermer et rouvrir : de nouveau le Dashboard ── */
   await pg.click('#vs-tabs [data-vs-tab="money"]');await pg.waitForTimeout(150);
   const m=await vu(pg);
   ok(m.tab==='money'&&m.gagne===1&&!m.dash&&!m.higher&&!m.vide,nom+' · Monetize : ce que je gagne, seul');
   await pg.click('#srch-x');
   await pg.waitForFunction(()=>!document.getElementById('srch').className&&!window.__totehm_lv().reglages,null,{timeout:6000}).catch(()=>{});await pg.waitForTimeout(600);
   await pg.click('#lv-tap-turn');
   await pg.waitForFunction(()=>document.getElementById('srch').classList.contains('is-pret'),null,{timeout:6000}).catch(()=>{});await pg.waitForTimeout(300);
   const r=await vu(pg);
   ok(r.tab==='dash'&&r.dash>0.9&&log.rpc.filter(x=>x.name==='my_board').length===2,nom+' · rouvert : le Dashboard de nouveau, relu → '+JSON.stringify({r,n:log.rpc.filter(x=>x.name==='my_board').length}));
   ok(sh.h>sh.c,nom+' · le tableau de bord se lit en défilant ('+sh.h+' px pour '+sh.c+')');
   ok(!erreurs(log).length,nom+' · aucune erreur '+erreurs(log).join(' | '));
   await pg.context().close();}
 }
 /* ── les lectures en échec (tableau de bord, offre) : une ligne chacune, rien ne casse ── */
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:{width:390,height:844},rpc:{my_landing:LAND,creator_dashboard:{ok:false},my_console:CONS}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.click('#lv-tap-turn');
  await pg.waitForFunction(()=>document.getElementById('srch').classList.contains('is-pret'),null,{timeout:6000}).catch(()=>{});await pg.waitForTimeout(300);
  const e=await pg.evaluate(()=>({t:document.querySelector('#vs-dash')?.textContent.trim(),diag:window.__totehm_dash()}));
  await pg.click('#vs-tabs [data-vs-tab="money"]');await pg.waitForTimeout(150);
  const v=await vu(pg), msg=await pg.textContent('#vs-vide');
  ok(/back in a moment/.test(e.t)&&e.diag.erreurs===1&&!e.diag.charge,'lecture en échec : une ligne, compté dans __totehm_dash().erreurs → '+e.t);
  ok(v.vide===1&&!v.gagne&&/Monetize · back in a moment/.test(msg),'Monetize sans offre lisible : une ligne, jamais un onglet blanc → '+msg);
  ok(!erreurs(log).length,'lectures en échec : aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();}
}finally{await browser.close();}
