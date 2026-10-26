// COM — le verso et le filtre de gauche (Wah, 21/10/2026).
// 1 · Retourner le papier : le NOM seul ; il grandit et monte ; PUIS toute la console arrive ENSEMBLE, verso déployé
//     et console lue — jamais le bas (Higher, TotehmBot, email, Sign out, terms) avant.
// 2 · Deux mondes distincts au verso (26/10 : deux PARTIES, Monetize my TOTEHM · Go [Higher]) : « Monetize my TOTEHM — and get paid every month » (ce que je gagne) et
//     l'abonnement [Higher] avec ce qu'il ouvre (Higher Self chaque jour, TotehmBot qui suit chaque Habit).
// 3 · Le filtre de gauche : un bloc de commande rectangle — MY STORY et VISION en carrés perforés de leur couleur,
//     qui enferment OBJECTIVE · HABIT · REPULSION empilés.
// 4 · L'espace membre (22/10) : l'identifiant À MÊME LE NAVY (aucune boîte noire), l'email juste dessous, des gris
//     lisibles, DELETE MY TOTEHM et SIGN OUT en boutons, les conditions en dernier.
// Tout est simulé (comptes, RPC) : aucune écriture en production. LANCER : node com_verso_filtre.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const browser=await launch();const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight']},{t:'Read at dawn',t0:'Read at dawn',is:['focus']}];
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]};
const LAND={signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false,open:false},higher:{active:false,price_cents:700,currency:'eur',period:'month'},
  thp:false,telegram:false,sm:{ready:true,habit:true,objective:true,higher:false,free_total:7,free_left:6,left:6}};
const DASH={ok:true,subscribers:3,month_cents:1920,pending_cents:1920,currency:'eur',next_payout:'2026-11-01',threshold_cents:2500,part:80,price_cents:2400,min_cents:300,max_cents:100000};
const CONS={signed_in:true,offer:{enabled:true,price_cents:2400,currency:'eur',payout_fin:'1234'},subscriptions:[{creator:'kai3',price_cents:1200,currency:'eur',status:'active',renews:'2027-03-01'}]};
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
/* 24/10 : le tableau de bord du verso (my_board), assez plein pour qu'on y défile. */
const J=k=>{const d=new Date();d.setUTCDate(d.getUTCDate()+k);return d.toISOString().slice(0,10);};
const MYD={ok:true,tz:'UTC',today:J(0),telegram:true,habits:STEPS.map(x=>({t:x.t,is:x.is,f:'daily',cible:7,c:['d','m','d','','a','d','d'],fait:4,serie:2,record:3})),
  days:[-6,-5,-4,-3,-2,-1,0].map(k=>({d:J(k),fait:1,manque:0,demande:2})),week:{fait:8,cible:14,manque:2,sans:2,aujourdhui:2,demandes:2,top:{t:'Run the hill',fait:4,serie:2,cible:7}},
  intentions:{fight:{habits:1,fait:9},focus:{habits:1,fait:4}},objectives:[{t:'Run a marathon',i:'fight',by:J(12),jours:12,temps:.5,habits:1}],
  heat:Array.from({length:84},(_,i)=>i%4),totals:{habits:2,gestes:120},feed:Array.from({length:8},(_,i)=>({at:new Date(Date.now()-i*36e5).toISOString(),box:'track',k:'tracked_done',l:'Run the hill',i:'fight'})),since:'2026-08-06T10:00:00Z'};
/* La console répond tard (900 ms) : c'est la fenêtre où le bas du verso s'affichait trop tôt. */
const lent=async url=>{ if(/rpc\/(creator_dashboard|my_console)/.test(url.pathname)) await new Promise(r=>setTimeout(r,900)); return null; };
const vu=pg=>pg.evaluate(()=>{const o=s=>{const e=document.querySelector(s);if(!e||!e.getClientRects().length) return 0;let x=e,a=1;
    while(x&&x!==document.body){const c=getComputedStyle(x);if(c.visibility==='hidden'||c.display==='none') return 0;a*=+c.opacity;x=x.parentElement;}return +a.toFixed(2);};
  return {cls:document.getElementById('srch').className,nom:o('#self-name'),gagne:o('#mw-creator'),higher:o('#mw-menu'),abos:o('#vs-subs-s'),pied:o('.vs-foot'),x:o('#srch-x'),
    onglets:o('#vs-tabs'),dash:o('#vs-dash')};});
try{
 for(const [nom,vp] of [['téléphone',{width:390,height:844}],['ordinateur',{width:1280,height:800}]]){
  /* ── 1 et 2 · le verso ── */
  {const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:vp,hasTouch:nom==='téléphone',network:lent,rpc:{my_landing:LAND,creator_dashboard:DASH,my_console:CONS,my_board:MYD}});
   await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
   const dos=await pg.$$eval('#ast-verso > *',l=>l.map(e=>e.id||e.className));
   ok(dos.length===1&&dos[0]==='ast-name',nom+' · le dos du papier ne porte que le NOM → '+dos.join(','));
   await pg.click('#lv-tap-turn');
   const film=[];
   for(let i=0;i<40;i++){ film.push(await vu(pg)); if(film[film.length-1].cls.includes('is-pret')) break; await pg.waitForTimeout(60); }
   const avant=film.filter(f=>!f.cls.includes('is-pret')), fin=film[film.length-1];
   const trop=avant.filter(f=>f.gagne||f.higher||f.abos||f.pied||f.x||f.onglets||f.dash);
   ok(avant.length>3&&!trop.length,nom+' · retournement et zoom : rien que le nom, '+avant.length+' images mesurées, '+trop.length+' avec autre chose');
   ok(avant.some(f=>f.nom>0&&f.cls.includes('is-show')),nom+' · pendant le zoom, le nom grandit et monte, SEUL ('+avant.filter(f=>f.nom>0).length+' images)');
   await pg.waitForTimeout(400); const ap=await vu(pg);
   /* 26/10 : DEUX PARTIES — le verso s'ouvre sur GO [HIGHER] (le tableau de bord, [Higher], mes abonnements) ; MONETIZE MY TOTEHM
      montre ce que je gagne, seul. */
   ok(ap.onglets===1&&ap.dash===1&&ap.gagne===0&&ap.higher===1&&ap.abos===1&&ap.pied===1&&ap.x===1,nom+' · puis TOUT arrive ensemble, ouvert sur GO HIGHER → '+JSON.stringify(ap));
   await pg.click('#vs-tabs [data-vs-tab="money"]');await pg.waitForTimeout(150); const mon=await vu(pg);
   ok(mon.gagne===1&&!mon.higher&&!mon.abos&&!mon.dash&&mon.pied===1,
      nom+' · 26/10 · Monetize my TOTEHM : ce que je gagne, seul ; le pied reste → '+JSON.stringify(mon));
   const t=await pg.evaluate(()=>({g:document.querySelector('#mw-creator .vs-t')?.textContent.trim(), gs:document.querySelector('#mw-creator .vs-s')?.textContent.trim(),
     h:document.querySelector('#mw-menu .vs-t')?.textContent.trim(), hb:!!document.querySelector('#mw-menu .vs-t use[href="#higher-badge"]'),
     hs:document.querySelector('#mw-menu .vs-s')?.textContent.trim(), f:[...document.querySelectorAll('#mw-menu .vs-item .vs-k')].map(e=>e.textContent.trim()),
     hh:document.getElementById('mw-hs-hint').textContent, a:document.querySelector('#vs-subs-s .vs-t')?.textContent.trim(),
     ordre:[...document.querySelectorAll('#srch-ui .vs-t')].map(e=>e.closest('section').id)}));
   ok(/^Monetize my TOTEHM$/i.test(t.g)&&t.gs==='and get paid every month',nom+' · « Monetize my TOTEHM — and get paid every month » sur ce que je gagne');
   ok(t.hb&&/subscription/i.test(t.h)&&/fewer limits/.test(t.hs)&&/outcome/.test(t.hs)&&t.f.join()==='Self,TotehmBot'&&/free: 7/.test(t.hh),
     nom+' · l\'abonnement [Higher] à part, avec ce qu\'il ouvre → '+JSON.stringify({h:t.h,f:t.f,hh:t.hh}));
   ok(t.ordre.join()==='mw-creator,mw-menu,vs-subs-s',nom+' · trois sections dans l\'ordre : je gagne · Higher · mes abonnements → '+t.ordre.join());
   /* ── 4 · l'espace membre ── */
   const lum=c=>{const m=(c||'').match(/\d+/g)||[0,0,0];return Math.round(.2126*m[0]+.7152*m[1]+.0722*m[2]);};
   const e=await pg.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(), c=s=>getComputedStyle(document.querySelector(s));
     const n=r('#self-name'),m=r('#mw-mail'),d=r('#acct-wipe'),o=r('#mw-signout'),t=r('#srch-ui .mw-terms');
     return {fond:c('#self-h').backgroundColor, nomB:n.bottom, nomX:n.left+n.width/2, mailT:m.top, mailX:m.left+m.width/2, mail:document.getElementById('mw-mail').textContent,
       cMail:c('#mw-mail').color, cH:c('#mw-menu .vs-h').color, cI:c('.vs-n i').color, cSay:c('.mwc-say').color, cTerms:c('#srch-ui .mw-terms').color,
       bD:{bg:c('#acct-wipe').backgroundColor,r:c('#acct-wipe').borderRadius,w:d.width,h:d.height,t:d.top}, bO:{bg:c('#mw-signout').backgroundColor,r:c('#mw-signout').borderRadius,h:o.height,t:o.top},
       ordre:t.top>d.bottom, txt:[document.getElementById('acct-wipe').textContent,document.getElementById('mw-signout').textContent]};});
   ok(e.fond==='rgb(51, 51, 102)'&&!/rgb\(0, 0, 0\)/.test(e.fond),nom+' · l\'identifiant sans boîte noire : à même le navy du papier → '+e.fond);
   ok(e.mail==='wah@example.test'&&e.mailT>=e.nomB-2&&e.mailT-e.nomB<24&&Math.abs(e.mailX-e.nomX)<3,nom+' · l\'email juste SOUS l\'identifiant, centré ('+Math.round(e.mailT-e.nomB)+' px)');
   const g={mail:lum(e.cMail),h:lum(e.cH),labels:lum(e.cI),phrase:lum(e.cSay),terms:lum(e.cTerms)};
   ok(Object.values(g).every(v=>v>=175),nom+' · les gris se lisent (luminance ≥ 175 sur 255) → '+JSON.stringify(g));
   ok(e.bD.bg==='rgb(31, 31, 36)'&&e.bO.bg===e.bD.bg&&e.bD.r==='10px'&&e.bO.r==='10px'&&e.bD.h>=40&&Math.abs(e.bD.t-e.bO.t)<2&&e.ordre,
     nom+' · DELETE MY TOTEHM et SIGN OUT : deux boutons gris côte à côte, les conditions dessous → '+e.txt.join(' · ')+' '+JSON.stringify({d:e.bD,o:e.bO,ordre:e.ordre}));
   await pg.$eval('#acct-wipe',b=>b.click());await pg.waitForTimeout(150);
   const arme=await pg.evaluate(()=>({t:document.getElementById('acct-wipe').textContent,a:document.getElementById('acct-wipe').classList.contains('armed')}));
   ok(arme.a&&/tap again/i.test(arme.t)&&!log.rpc.some(x=>x.name==='delete_my_totehm'),nom+' · Delete demande un second tap (rien n\'est effacé au premier) → '+arme.t);
   await pg.click('#vs-tabs [data-vs-tab="higher"]');await pg.waitForTimeout(100);
   const colle=await pg.evaluate(()=>{const u=document.getElementById('srch-ui');u.scrollTo(0,99999);const h=document.getElementById('self-h').getBoundingClientRect(),x=document.getElementById('srch-x');
     const p=x.getBoundingClientRect(),t=document.elementFromPoint(p.left+p.width/2,p.top+p.height/2);return {top:Math.round(h.top),x:x.contains(t)};});
   ok(colle.top===0&&colle.x,nom+' · au défilement, l\'identifiant reste en haut (y = '+colle.top+') et la croix reste au-dessus');
   await pg.click('#srch-x');await pg.waitForTimeout(1200);
   const ferme=await pg.evaluate(()=>document.getElementById('srch').className);
   ok(!/is-pret|is-open/.test(ferme),nom+' · refermé : la console repart avec le verso');
   ok(!erreurs(log).length,nom+' · verso : aucune erreur '+erreurs(log).join(' | '));
   await pg.context().close();}
  /* ── 3 · le bloc de commande du filtre ── */
  {const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:vp,hasTouch:nom==='téléphone',rpc:{my_landing:LAND,my_trips:{signed_in:true,trips:[],reps:[],wisdom:[],visions:[]},element_media_list:{ok:true,items:[]}}});
   await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
   await pg.keyboard.press('ArrowLeft');await pg.waitForFunction(()=>{const d=window.__totehm_lv();return d.vue==='g'&&!d.bouge;},null,{timeout:6000});
   await pg.evaluate(()=>window.__papierDock&&window.__papierDock());await pg.waitForTimeout(500);
   /* 24/10 (Wah) : le bloc de commande EST le logo. Replié, on ne voit qu'un papier ;
      un tap le décompose, un second ouvre MY GRIND sur ses trois boutons — DANS son navy. */
   const plie=await pg.evaluate(()=>{const c=document.querySelector('.lsh-sf .sfcmd');
     return {logo:c.classList.contains('is-logo'),calques:c.querySelectorAll('.sf-lg .gl').length};});
   ok(plie.logo&&plie.calques===3,nom+' · le filtre arrive en LOGO (le rail, le T et le mot sur le papier)');
   await pg.click('.lsh-sf [data-sf="grind"]');await pg.waitForTimeout(900);
   await pg.click('.lsh-sf [data-sf="grind"]');await pg.waitForTimeout(600);
   const g=await pg.evaluate(()=>{const r={};document.querySelectorAll('.lsh-sf [data-sf="vue"]').forEach(b=>{const x=b.getBoundingClientRect(),c=getComputedStyle(b);
       r[b.dataset.v]={l:x.left,t:x.top,r:x.right,b:x.bottom,w:x.width,h:x.height,m:(c.maskImage||c.webkitMaskImage||'').includes('svg'),bg:c.backgroundColor};});
     const gr=document.querySelector('.lsh-sf .sfv-g').getBoundingClientRect(), cg=getComputedStyle(document.querySelector('.lsh-sf .sfv-g'));
     r.grind={l:gr.left,t:gr.top,r:gr.right,b:gr.bottom,w:gr.width,h:gr.height,m:(cg.maskImage||cg.webkitMaskImage||'').includes('svg'),bg:cg.backgroundColor};
     return r;});
   const {wisdom:w,visions:v,objectives:o,habits:h,repulsions:p,grind:gr}=g, px=1.5;
   ok(w&&v&&Math.abs(w.w-w.h)<px&&Math.abs(v.w-v.h)<px&&w.m&&v.m&&gr.m&&Math.abs(gr.w-gr.h)<px,
     nom+' · trois CARRÉS perforés, comme les trois papiers du logo ('+Math.round(w.w)+' px)');
   ok(w.bg==='rgb(116, 49, 105)'&&v.bg==='rgb(54, 73, 140)'&&gr.bg==='rgb(51, 51, 102)',
     nom+' · dans leur couleur : rouge-violet, navy, bleu clair → '+w.bg+' · '+gr.bg+' · '+v.bg);
   ok(o.b<=h.t+px&&h.b<=p.t+px&&Math.abs(o.l-h.l)<px&&Math.abs(h.l-p.l)<px&&!o.m,nom+' · OBJECTIVES en haut, HABITS au milieu, REPULSIONS en bas, empilés');
   ok(o.l>=gr.l-px&&p.r<=gr.r+px&&o.t>gr.t&&p.b<gr.b&&w.r<=gr.l+px&&gr.r<=v.l+px,
     nom+' · la pile est DANS le navy, plus courte que lui ('+Math.round(p.r-o.l)+' px pour '+Math.round(gr.w)+' px)');
   await pg.click('.lsh-sf [data-sf="vue"][data-v="wisdom"]');await pg.waitForTimeout(300);
   const on=await pg.evaluate(()=>[...document.querySelectorAll('.lsh-sf [data-sf="vue"].is-on')].map(b=>b.dataset.v));
   ok(on.join()==='wisdom',nom+' · un tap sur MY STORY la choisit → '+on.join());
   ok(!erreurs(log).length,nom+' · filtre : aucune erreur '+erreurs(log).join(' | '));
   await pg.context().close();}
 }
}finally{await browser.close();}
