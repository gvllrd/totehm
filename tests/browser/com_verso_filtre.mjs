// COM — le verso et le filtre de gauche (Wah, 21/10/2026).
// 1 · Retourner le papier : le NOM seul ; il grandit et monte ; PUIS toute la console arrive ENSEMBLE, verso déployé
//     et console lue — jamais le bas (Higher, TotehmBot, email, Sign out, terms) avant.
// 2 · Deux mondes distincts au verso : « Monetize my TOTEHM — and get paid every month » (ce que je gagne) et
//     l'abonnement [Higher] avec ce qu'il ouvre (Higher Self chaque jour, TotehmBot qui suit chaque Habit).
// 3 · Le filtre de gauche : un bloc de commande rectangle — MY STORY et VISION en carrés perforés de leur couleur,
//     qui enferment OBJECTIVE · HABIT · REPULSION empilés.
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
/* La console répond tard (900 ms) : c'est la fenêtre où le bas du verso s'affichait trop tôt. */
const lent=async url=>{ if(/rpc\/(creator_dashboard|my_console)/.test(url.pathname)) await new Promise(r=>setTimeout(r,900)); return null; };
const vu=pg=>pg.evaluate(()=>{const o=s=>{const e=document.querySelector(s);if(!e||!e.getClientRects().length) return 0;let x=e,a=1;
    while(x&&x!==document.body){const c=getComputedStyle(x);if(c.visibility==='hidden'||c.display==='none') return 0;a*=+c.opacity;x=x.parentElement;}return +a.toFixed(2);};
  return {cls:document.getElementById('srch').className,nom:o('#self-name'),gagne:o('#mw-creator'),higher:o('#mw-menu'),abos:o('#vs-subs-s'),pied:o('.vs-foot'),x:o('#srch-x')};});
try{
 for(const [nom,vp] of [['téléphone',{width:390,height:844}],['ordinateur',{width:1280,height:800}]]){
  /* ── 1 et 2 · le verso ── */
  {const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:vp,hasTouch:nom==='téléphone',network:lent,rpc:{my_landing:LAND,creator_dashboard:DASH,my_console:CONS}});
   await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
   const dos=await pg.$$eval('#ast-verso > *',l=>l.map(e=>e.id||e.className));
   ok(dos.length===1&&dos[0]==='ast-name',nom+' · le dos du papier ne porte que le NOM → '+dos.join(','));
   await pg.click('#lv-tap-turn');
   const film=[];
   for(let i=0;i<40;i++){ film.push(await vu(pg)); if(film[film.length-1].cls.includes('is-pret')) break; await pg.waitForTimeout(60); }
   const avant=film.filter(f=>!f.cls.includes('is-pret')), fin=film[film.length-1];
   const trop=avant.filter(f=>f.gagne||f.higher||f.abos||f.pied||f.x);
   ok(avant.length>3&&!trop.length,nom+' · retournement et zoom : rien que le nom, '+avant.length+' images mesurées, '+trop.length+' avec autre chose');
   ok(avant.some(f=>f.nom>0&&f.cls.includes('is-show')),nom+' · pendant le zoom, le nom grandit et monte, SEUL ('+avant.filter(f=>f.nom>0).length+' images)');
   await pg.waitForTimeout(400); const ap=await vu(pg);
   ok(ap.gagne===1&&ap.higher===1&&ap.abos===1&&ap.pied===1&&ap.x===1,nom+' · puis TOUT arrive ensemble → '+JSON.stringify(ap));
   const t=await pg.evaluate(()=>({g:document.querySelector('#mw-creator .vs-t')?.textContent.trim(), gs:document.querySelector('#mw-creator .vs-s')?.textContent.trim(),
     h:document.querySelector('#mw-menu .vs-t')?.textContent.trim(), hb:!!document.querySelector('#mw-menu .vs-t use[href="#higher-badge"]'),
     hs:document.querySelector('#mw-menu .vs-s')?.textContent.trim(), f:[...document.querySelectorAll('#mw-menu .vs-item .vs-k')].map(e=>e.textContent.trim()),
     hh:document.getElementById('mw-hs-hint').textContent, a:document.querySelector('#vs-subs-s .vs-t')?.textContent.trim(),
     ordre:[...document.querySelectorAll('#srch-ui .vs-t')].map(e=>e.closest('section').id)}));
   ok(/^Monetize my TOTEHM$/i.test(t.g)&&t.gs==='and get paid every month',nom+' · « Monetize my TOTEHM — and get paid every month » sur ce que je gagne');
   ok(t.hb&&/subscription/i.test(t.h)&&/fewer limits/.test(t.hs)&&/outcome/.test(t.hs)&&t.f.join()==='Self,TotehmBot'&&/free: 7/.test(t.hh),
     nom+' · l\'abonnement [Higher] à part, avec ce qu\'il ouvre → '+JSON.stringify({h:t.h,f:t.f,hh:t.hh}));
   ok(t.ordre.join()==='mw-creator,mw-menu,vs-subs-s',nom+' · trois sections dans l\'ordre : je gagne · Higher · mes abonnements → '+t.ordre.join());
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
   const g=await pg.evaluate(()=>{const r={};document.querySelectorAll('.lsh-sf [data-sf="vue"]').forEach(b=>{const x=b.getBoundingClientRect(),c=getComputedStyle(b);
       r[b.dataset.v]={l:x.left,t:x.top,r:x.right,b:x.bottom,w:x.width,h:x.height,m:(c.maskImage||c.webkitMaskImage||'').includes('svg'),bg:c.backgroundColor};});return r;});
   const {wisdom:w,visions:v,objectives:o,habits:h,repulsions:p}=g, px=1.5;
   ok(w&&v&&Math.abs(w.w-w.h)<px&&Math.abs(v.w-v.h)<px&&w.m&&v.m,nom+' · MY STORY et VISION : deux CARRÉS perforés ('+Math.round(w.w)+' px)');
   ok(w.bg==='rgb(116, 49, 105)'&&v.bg==='rgb(54, 73, 140)',nom+' · dans leur couleur : rouge-violet, bleu clair → '+w.bg+' · '+v.bg);
   ok(o.b<=h.t+px&&h.b<=p.t+px&&Math.abs(o.l-h.l)<px&&Math.abs(h.l-p.l)<px&&!o.m,nom+' · OBJECTIVE en haut, HABIT au milieu, REPULSION en bas, empilés');
   ok(w.r<=o.l&&p.r<=v.l&&Math.abs(w.t-o.t)<px&&Math.abs(w.b-p.b)<px&&Math.abs(v.t-o.t)<px&&Math.abs(v.b-p.b)<px,nom+' · les deux carrés ENFERMENT la pile : un seul rectangle');
   await pg.click('.lsh-sf [data-sf="vue"][data-v="wisdom"]');await pg.waitForTimeout(300);
   const on=await pg.evaluate(()=>[...document.querySelectorAll('.lsh-sf [data-sf="vue"].is-on')].map(b=>b.dataset.v));
   ok(on.join()==='wisdom',nom+' · un tap sur MY STORY la choisit → '+on.join());
   ok(!erreurs(log).length,nom+' · filtre : aucune erreur '+erreurs(log).join(' | '));
   await pg.context().close();}
 }
}finally{await browser.close();}
