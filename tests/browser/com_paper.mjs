// COM : le papier a deux faces. Au repos il est POSÉ, recto (le logo) : un tap le déploie en Totehm (inchangé).
// L'utilisateur le RETOURNE (au doigt, à la souris, au clavier ← →) : 15/10 (lot processeur) — le verso est MES
// RÉGLAGES (Wah : « le verso de mon processeur = les paramétrages de mon TOTEHM ; plus d'IA là ») : on zoome dans le
// dos du papier, le nom devient le haut de la page, dessous le panneau du même objet — le nom, qui lit mon TOTEHM
// (quatre niveaux), mon programme d'abonnés. Aucun contrôle ne retourne le papier ni ne change de vue.
// Comptes, réseau et RPC sont simulés. LANCER : node com_paper.mjs /tmp
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.com';
const tables={profiles:[{pseudo:'wahigher'}]};
const LAND={signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false,open:false},higher:{active:false,price_cents:700,currency:'eur',period:'month'},thp:false,subscriptions:0,subscribers:0,
  sm:{ready:true,habit:true,objective:true,higher:false,free_total:7,free_left:6,left:6}};
const DASH={ok:true,subscribers:3,month_cents:1920,pending_cents:1920,currency:'eur',next_payout:'2026-11-01',threshold_cents:2500,part:80,price_cents:2400,min_cents:300,max_cents:100000};
const rpc={my_landing:LAND,creator_dashboard:DASH,visibility_set:b=>({ok:true,visibility:b.p_visibility})};
const browser=await launch();
const R=(pg,sel)=>pg.$eval(sel,e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height].map(v=>+v.toFixed(2));});
const centre=async pg=>{const r=await R(pg,'#gate-asteroid');return[r[0]+r[2]/2,r[1]+r[3]/2];};
const lsd=pg=>pg.evaluate(()=>({...window.__totehm_lsd}));
const card=pg=>pg.$eval('#gate-card',e=>({cls:e.className.split(' ').filter(Boolean).sort().join(' '),tf:e.style.transform}));
const srch=pg=>pg.$eval('#srch',e=>e.className);
// tourner le papier : un glissé horizontal de `px` pixels, en `n` pas
const tourner=async(pg,px,n=12)=>{const[x,y]=await centre(pg);await pg.mouse.move(x,y);await pg.mouse.down();
  for(let i=1;i<=n;i++){await pg.mouse.move(x+px*i/n,y);await pg.waitForTimeout(16);}await pg.mouse.up();};
const vars=pg=>pg.evaluate(()=>['--tf-t','--tf-wm','--tf-rail','--tf-bg','--gate-bg-scale'].map(v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()).join('|'));
try{
 // ── MEMBRE, téléphone ─────────────────────────────────────────────
 {const{pg,log}=await page(browser,{dir:'com',origin,rpc,tables,viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);
  const paper=await R(pg,'#gate-asteroid'),v0=await vars(pg);
  let c=await card(pg);
  ok(c.cls==='is-flat'&&c.tf===''&&(await lsd(pg)).face===0,'départ : recto, posé, aucune transformation');
  const dos=await pg.evaluate(()=>({nom:document.getElementById('ast-name').textContent.replace(/\s+/g,''),pastilles:!document.getElementById('ast-panel'),
    curseur:!!document.querySelector('#ast-verso .ast-slider b'),ia:!!document.querySelector('#ast-verso .ast-self')}));
  /* 18/10 — le dos ne porte plus de pastilles de confidentialité : elle vit sur chaque box. */
  /* 21/10 — Wah : « quand on tourne le Totehm en verso, on doit voir seulement le nom, rien d'autre » : le curseur du prix est parti. */
  ok(dos.nom==='wahigher'&&dos.pastilles&&!dos.curseur&&!dos.ia,'le dos porte le NOM, rien d\'autre (ni curseur, ni pastilles)');
  ok(await pg.$eval('#ast-back',e=>e.inert)&&!await pg.$eval('#ast-front',e=>e.inert),'seul le recto est atteignable (inert sur le verso)');
  await pg.waitForTimeout(1500);
  ok((await card(pg)).tf==='','il ne tourne JAMAIS tout seul (1,5 s : transform toujours vide)');
  {const[x,y]=await centre(pg);await pg.mouse.move(x,y);await pg.mouse.down();
   for(let i=1;i<=5;i++){await pg.mouse.move(x+i*10,y);await pg.waitForTimeout(16);}await pg.waitForTimeout(200);await pg.mouse.up();}
  await pg.waitForTimeout(900);
  ok((await lsd(pg)).face===0&&await srch(pg)===''&&(await card(pg)).cls==='is-flat','petit glissé (50 px, lent) : il revient sur son recto, rien ne s\'ouvre');
  // on le retourne : MES RÉGLAGES
  await tourner(pg,260);await pg.waitForTimeout(1700);
  const z=await pg.evaluate(()=>{const q=s=>document.querySelector(s);return{srch:q('#srch').className,vue:window.__totehm_lv().vue,reglages:window.__totehm_lv().reglages,
    nom:q('#self-name').textContent,ff:getComputedStyle(q('#self-name')).fontFamily,tb:getComputedStyle(q('#srch-bg')).transform,bg:getComputedStyle(q('#srch-bg')).backgroundImage.includes('333366'),
    niveaux:document.querySelectorAll('#srch [data-lvvis]').length,carte:!q('#lv-card').classList.contains('hide'),createur:!q('#mw-creator').classList.contains('hide'),
    ia:!!q('#srch #lv-say,#srch #lv-thread'),menu:!!q('#srch #member-window'),compte:q('#member-window').classList.contains('show'),
    /* 18/10 — le verso : plus de vignette, plus de confidentialité du Totehm, plus de /monetize ;
       le NOM est un identifiant fixe en haut, et la CONSOLE s'affiche une fois le verso posé. */
    vignette:!!q('#mw-avatar'),monetize:!!q('#lv-prog'),
    nomFixe:getComputedStyle(q('#self-h')).position,nomWrap:getComputedStyle(q('#self-name')).whiteSpace,
    nomPx:parseFloat(getComputedStyle(q('#self-name')).fontSize),
    console:!!q('#srch iframe,#srch-console')};});
  ok(/is-open/.test(z.srch)&&z.reglages&&z.vue==='c','retourné à la main : mes RÉGLAGES s\'ouvrent (le verso déplié), la vue ne change pas');
  ok(z.nom==='wahigher'&&/Quantico/.test(z.ff)&&z.tb==='matrix(1, 0, 0, 1, 0, 0)'&&z.bg,'zoom fini : le fond est le papier navy, le nom (Quantico) en haut');
  /* Un IDENTIFIANT : fixe en haut, sans retour de ligne ; posé à même le navy (22/10), un peu plus grand. */
  ok(z.nomFixe==='sticky'&&z.nomWrap==='nowrap'&&z.nomPx>=19&&z.nomPx<=26,'le nom est un identifiant FIXE en haut ('+z.nomPx+'px), sans retour de ligne');
  ok(z.carte&&z.niveaux===0&&!z.vignette&&!z.monetize&&z.createur&&!z.ia&&z.menu,
    'le verso SIMPLIFIÉ : plus de confidentialité du Totehm (elle est par box), plus de vignette, plus de /monetize ; restent le nom, le programme d\'abonnés et le compte');
  ok(!z.console,'20/10 : plus de page /console empilée dans le verso — mon argent tient en un écran');
  ok(z.compte,'retourner le papier AFFICHE le menu membre (Wah, 16/10) : pas de second geste');
  c=await card(pg);ok((await lsd(pg)).face===1&&c.cls==='is-back is-flat'&&c.tf==='','dessous, le papier est posé sur son verso, sans transformation');
  ok(await pg.$eval('#gate',e=>e.inert&&getComputedStyle(e).visibility==='visible'),'#gate est inert mais reste peint (le Totehm dessous ne se révèle jamais)');
  // aucun contrôle ne change de vue ni ne retourne le papier
  await pg.mouse.move(195,600);for(let i=0;i<4;i++){await pg.mouse.wheel(0,90);await pg.waitForTimeout(16);}
  await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(700);
  ok(/is-open/.test(await srch(pg))&&(await pg.evaluate(()=>window.__totehm_lv().vue))==='c'&&(await lsd(pg)).face===1,'molette et ↓ dans mes réglages : rien ne change de vue, le papier ne bouge pas');
  ok(!log.rpc.some(x=>x.name==='visibility_set'),'le verso n\'écrit plus la confidentialité du Totehm (elle vit sur chaque box)');
  /* 24/10 : le verso a trois onglets ; le prix vit dans Monetize. */
  await pg.click('#vs-tabs [data-vs-tab="money"]');await pg.waitForTimeout(100);
  await pg.fill('#mwc-price','3600');await pg.dispatchEvent('#mwc-price','input');
  ok(/100 subscribers/.test(await pg.textContent('#mwc-say'))&&/€36 \/ year/.test(await pg.textContent('#vs-price'))&&!await pg.locator('#mwc-save').count(),'le prix au curseur : la part se lit en direct, sans bouton Save (enregistré au lâcher, 20/10)');
  // focus piégé dans la feuille
  const tab=async()=>{await pg.keyboard.press('Tab');return pg.evaluate(()=>{const e=document.activeElement;return e.closest('#srch')?(e.id||e.tagName):'HORS:'+e.tagName;});};
  await pg.focus('#self-name');const ring=[];for(let i=0;i<24;i++)ring.push(await tab());
  ok(ring.every(x=>!/^HORS/.test(x))&&ring.includes('srch-x'),'Tab tourne dans la feuille → '+ring.join(','));
  await pg.screenshot({path:OUT+'/com_reglages.png'});
  await pg.click('#srch-x');await pg.waitForTimeout(2000);
  c=await card(pg);
  ok(await srch(pg)===''&&(await lsd(pg)).face===0&&c.cls==='is-flat'&&c.tf==='','la croix : dézoom, puis le papier se remet sur son recto');
  ok(!await pg.$eval('#gate',e=>e.inert)&&JSON.stringify(await R(pg,'#gate-asteroid'))===JSON.stringify(paper),'le papier est de nouveau atteignable, exactement à sa place');
  ok(!(await pg.evaluate(()=>!!document.getElementById('ast-panel')))&&!(await pg.evaluate(()=>!!document.getElementById('conn-bar'))),
    'le dos ne porte plus de pastilles, et il n\'y a plus d\'espace membre hors du verso (#conn-bar parti)');
  // 18/10 : on revient au verso par le papier — il n'y a plus d'autre porte
  await tourner(pg,260);await pg.waitForTimeout(2200);
  ok(/is-open/.test(await srch(pg))&&await pg.evaluate(()=>{const m=document.getElementById('member-window');
      return !!document.querySelector('#srch #member-window')&&m.classList.contains('show')&&getComputedStyle(m).position==='static';}),
    'l\'espace membre s\'ouvre DANS le verso (mes réglages, puis mon compte) — plus de fenêtre par-dessus');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(2000);
  ok(await srch(pg)===''&&(await lsd(pg)).face===0,'Échap : dézoom et retour au recto');
  // recto : le Totehm se déploie comme avant
  ok(await vars(pg)===v0,'les mesures de déconstruction sont celles du départ');
  await pg.mouse.click(...await centre(pg));await pg.waitForTimeout(2400);
  ok(await pg.evaluate(()=>!document.body.classList.contains('gate')&&/\bv-habits\b/.test(document.body.className)),'tap sur le recto : le Totehm se déploie');
  await pg.click('#fold-x');await pg.waitForTimeout(1500);
  ok(JSON.stringify(await R(pg,'#gate-asteroid'))===JSON.stringify(paper)&&(await card(pg)).tf==='','repli : le papier revient posé, recto, à sa place');
  // déployer le Totehm pendant que mes réglages sont ouverts (#in, ?ro=)
  await tourner(pg,260);await pg.waitForTimeout(1600);
  await pg.evaluate(()=>window.__totehmDeplie());await pg.waitForTimeout(5000);
  ok(await pg.evaluate(()=>!document.body.classList.contains('gate')&&/\bv-habits\b/.test(document.body.className))&&await srch(pg)==='','enter() pendant mes réglages : dézoom, recto, puis déploiement');
  ok(!log.errors.length,'aucune erreur console : '+log.errors.join(' | '));await pg.context().close();}
 // ── SANS COMPTE, ordinateur, à la souris, vers la gauche : la porte, pas de réglages ──
 {const{pg,log}=await page(browser,{dir:'com',origin,rpc,tables:{},session:false,viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForTimeout(900);
  await tourner(pg,-300);await pg.waitForTimeout(1600);
  ok(await srch(pg)===''&&await pg.evaluate(()=>document.body.classList.contains('is-door'))&&(await lsd(pg)).face===0,'sans compte : retourné → pas de réglages ; le papier se repose et la porte s\'ouvre');
  ok(!log.errors.length,'sans compte : aucune erreur console : '+log.errors.join(' | '));await pg.context().close();}
 // ── une pichenette le retourne ; un tour presque entier non ───────
 {const{pg}=await page(browser,{dir:'com',origin,rpc,tables,viewport:{width:390,height:844}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  {const[x,y]=await centre(pg);await pg.mouse.move(x,y);await pg.mouse.down();await pg.mouse.move(x+70,y,{steps:4});await pg.mouse.up();}
  await pg.waitForTimeout(1600);
  ok(/is-open/.test(await srch(pg)),'pichenette (70 px d\'un coup) : il se retourne, mes réglages');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(2000);
  await tourner(pg,470,20);await pg.waitForTimeout(1200);
  ok(await srch(pg)===''&&(await lsd(pg)).face===0,'presque un tour entier : il revient sur son recto, rien ne s\'ouvre');await pg.context().close();}
 // ── clavier ───────────────────────────────────────────────────────
 {const{pg}=await page(browser,{dir:'com',origin,rpc,tables,viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  const a=[];for(let i=0;i<4;i++){await pg.keyboard.press('Tab');a.push(await pg.evaluate(()=>document.activeElement.id));}
  ok(a.includes('gate-enter')&&!a.includes('gate-search-go'),'clavier, recto : #gate-enter seul → '+a);
  await pg.focus('#gate-enter');await pg.keyboard.press('ArrowRight');await pg.waitForTimeout(1700);
  ok(/is-open/.test(await srch(pg))&&(await pg.evaluate(()=>window.__totehm_lv().vue))==='c','clavier : → sur le papier le retourne (mes réglages) ; la vue ne change pas');await pg.context().close();}
 // ── mouvement réduit ──────────────────────────────────────────────
 {const{pg}=await page(browser,{dir:'com',origin,rpc,tables,viewport:{width:390,height:844}});
  await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  await tourner(pg,260);await pg.waitForTimeout(200);
  ok(await srch(pg)===''&&(await card(pg)).tf==='','mouvement réduit : aucun geste n\'est écouté');
  await pg.focus('#gate-enter');await pg.keyboard.press('ArrowLeft');await pg.waitForTimeout(200);
  ok(/is-open/.test(await srch(pg)),'mouvement réduit : ← ouvre mes réglages sans animation');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(200);
  ok(await srch(pg)===''&&(await lsd(pg)).face===0,'mouvement réduit : fermés, le papier est de nouveau sur son recto');await pg.context().close();}
}finally{await browser.close();}
