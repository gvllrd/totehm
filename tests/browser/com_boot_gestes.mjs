// COM · 21/10/2026 — LOT O : trois retours de Wah, mesurés.
// 1 · « Quelquefois les mouvements pour passer d'une vue à l'autre ne fonctionnent pas » : un glissé qui part SUR le
//     papier change de vue ; un geste pendant un voyage attend sa fin au lieu de se perdre ; un voyage qui ne se termine
//     pas (onglet caché en route) rend la main d'elle-même — plus jamais un atterrissage figé jusqu'au rechargement.
// 2 · « À chaque fois il affiche le mode hors connexion avant de me connecter » : une session gardée dans ce navigateur
//     n'affiche JAMAIS la vente ni CONNECT pendant qu'elle se lit ; un membre connu se peint avant la réponse de la base.
// 3 · « Remonter la langue et le TotehmPaper : on ne voit pas le cerveau » : en haut, la bouche contre le bord, la vente
//     sous le slogan, le cerveau ENTIER entre la vente et la manette, sur quatre écrans.
// 4 · (22/10) La manette est un MANCHE (tirée à gauche, elle va à gauche, à la souris comme au doigt) ; un geste fait
//     pendant le repli du TOTEHM attend la fin du repli au lieu de se perdre.
// Tout est simulé (comptes, RPC) : aucune écriture en production. LANCER : node com_boot_gestes.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const browser=await launch();const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight']},{t:'Read at dawn',t0:'Read at dawn',is:['focus']}];
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]};
const LAND={signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false,open:false},higher:{active:false},thp:false};
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const lv=pg=>pg.evaluate(()=>window.__totehm_lv());
const vers=(pg,v)=>pg.waitForFunction(v=>{const d=window.__totehm_lv();return d.vue===v&&!d.bouge;},v,{timeout:6000}).catch(()=>{});
const calme=pg=>pg.waitForFunction(()=>!window.__totehm_lv().bouge,null,{timeout:6000}).catch(()=>{});
const dort=ms=>new Promise(r=>setTimeout(r,ms));
/* Le profil répond tard (la base lointaine d'un téléphone) : c'est la fenêtre où la page hésitait. */
const lent=ms=>async url=>{ if(url.pathname==='/rest/v1/profiles') await dort(ms); return null; };
/* Ce que montre l'atterrissage, échantillonné à chaque image jusqu'à ce que le membre soit peint. */
const film=pg=>pg.evaluate(()=>new Promise(res=>{const t0=performance.now(), vu={vente:0, connect:0, attente:0, membre:null};
  const vis=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
  (function pas(){ const b=document.body;
    if(vis(document.getElementById('lv-pitch'))) vu.vente++;
    if([...document.querySelectorAll('#lv-join,[data-sm-connect]')].some(vis)) vu.connect++;
    if(b.classList.contains('ses-attente')) vu.attente++;
    if(vu.membre===null&&b.classList.contains('member')) vu.membre=Math.round(performance.now()-t0);
    if(performance.now()-t0>3500||(vu.membre!==null&&performance.now()-t0>vu.membre+400)) return res(vu);
    requestAnimationFrame(pas); })();}));
try{
 /* ── 2 · LA CONNEXION ── */
 {/* a · un membre DÉJÀ venu (le cache de son compte porte son nom) : peint avant la base, jamais la vente */
  const{pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND},network:lent(1800),viewport:{width:390,height:664},hasTouch:true});
  await ctx.addInitScript(([u])=>{ localStorage.setItem('totehm_habits_v1',JSON.stringify({habits:[{t:'Run the hill',is:['fight']}],vis:'private',uid:u,pseudo:'wahigher'})); },[UID]);
  await pg.goto(origin+'/totehm',{waitUntil:'commit'}); const v=await film(pg);
  ok(v.vente===0&&v.connect===0,'membre connu : ni la vente ni CONNECT pendant la lecture de la session → '+JSON.stringify(v));
  ok(v.membre!==null&&v.membre<1800,'membre connu : peint AVANT la réponse du profil (1,8 s) → '+v.membre+' ms');
  await pg.waitForTimeout(2200);
  const f=await pg.evaluate(()=>({att:document.body.classList.contains('ses-attente'),m:document.body.classList.contains('member'),tap:!document.getElementById('lv-tap').classList.contains('hide')}));
  ok(!f.att&&f.m&&f.tap,'la base a répondu : l\'attente est levée, le membre reste, « Tap to open it » est là → '+JSON.stringify(f));
  ok(!erreurs(log).length&&!log.rpc.some(x=>/_set|_save|_create|_delete|rename/.test(x.name)),'membre connu : aucune erreur, aucune écriture '+erreurs(log).join(' | '));
  await ctx.close();}
 {/* b · une session SANS cache (premier passage sur ce téléphone) : on attend la base, sans vendre ni ouvrir la porte */
  const{pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND},network:lent(1500),viewport:{width:390,height:664},hasTouch:true});
  await pg.goto(origin+'/totehm',{waitUntil:'commit'});
  const v=film(pg);
  await pg.waitForFunction(()=>typeof window.__totehm_lv==='function',null,{timeout:6000});
  await pg.evaluate(()=>document.getElementById('gate-enter').click());           /* un tap sur le papier, trop tôt */
  const r=await v;
  const porte=await pg.evaluate(()=>document.body.classList.contains('is-door'));
  ok(r.vente===0&&r.connect===0&&r.attente>0,'session sans cache : l\'attente couvre la lecture, ni vente ni CONNECT → '+JSON.stringify(r));
  ok(!porte,'un tap pendant la lecture n\'ouvre PAS la porte d\'inscription');
  await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:8000}).catch(()=>{});
  ok(await pg.evaluate(()=>!document.body.classList.contains('gate')),'… et le Totehm s\'ouvre dès que la session est lue (le tap n\'est pas perdu)');
  ok(!erreurs(log).length,'session sans cache : aucune erreur '+erreurs(log).join(' | '));
  await ctx.close();}
 {/* c · sans session : la vente se montre, comme avant */
  const{pg,ctx}=await page(browser,{dir:'com',origin,session:false,tables:{},viewport:{width:390,height:664}});
  await pg.goto(origin+'/totehm');await pg.waitForTimeout(1500);
  const r=await pg.evaluate(()=>({att:document.body.classList.contains('ses-attente'),vente:!!document.getElementById('lv-pitch').getClientRects().length}));
  ok(!r.att&&r.vente,'sans session : aucune attente, la vente est là → '+JSON.stringify(r));
  await ctx.close();}

 /* ── 1 · LES GESTES ── */
 {const{pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND},viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1000);
  const cdp=await ctx.newCDPSession(pg);
  const glisse=async(x0,y0,x1,y1,attendre=true)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]});
    for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/6,y:y0+(y1-y0)*i/6}]});await pg.waitForTimeout(16);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); if(attendre){ await calme(pg);await pg.waitForTimeout(400); } return (await lv(pg)).vue;};
  const centre=async()=>pg.$eval('#gate-asteroid',e=>{const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,h:r.height};});
  /* a · le doigt part SUR le papier (au centre) */
  let p=await centre();
  const a1=await glisse(p.x,p.y+20,p.x,p.y-140);
  ok(a1==='h'&&!(await lv(pg)).reglages,'22/10 · un manche : un glissé VERS LE HAUT qui part sur le papier → Get Higher (il ne penche plus pour rien) → '+a1);
  p=await centre();
  const a2=await glisse(p.x,p.y-10,p.x,p.y+150);
  ok(a2==='c','en haut, un glissé vers le bas qui part sur le papier posé sur la langue → le centre → '+a2);
  p=await centre();
  const a3=await glisse(p.x,p.y-20,p.x,p.y+150);
  ok(a3==='b','au centre, vers le bas depuis le papier → la Reflection → '+a3);
  p=await centre();
  const a4=await glisse(p.x,p.y+10,p.x,p.y-160);
  ok(a4==='c','dans la Reflection, un glissé vers le haut qui part sur le papier-profil → le centre → '+a4);
  /* b · deux gestes coup sur coup : le second attend la fin du premier au lieu de se perdre */
  await vers(pg,'c');
  const d0=(await lv(pg)).enAttente;
  await glisse(40,780,40,640,false); await pg.waitForTimeout(120); await glisse(40,640,40,780,false);
  await vers(pg,'c'); await pg.waitForTimeout(300);
  const d1=await lv(pg);
  ok(d1.vue==='c'&&d1.enAttente===d0+1,'↑ puis ↓ pendant le voyage : Get Higher, puis le retour au centre (le second geste a attendu) → '+d1.vue+' · en attente '+(d1.enAttente-d0));
  await pg.keyboard.press('ArrowUp'); await pg.waitForTimeout(80); await pg.keyboard.press('ArrowDown');
  await vers(pg,'c'); await pg.waitForTimeout(300);
  ok((await lv(pg)).vue==='c','↑ puis ↓ au clavier, sans attendre : Get Higher puis le centre');
  /* c · un voyage qui ne se termine pas (l'onglet se cache en route : plus d'images) rend la main tout seul */
  await pg.evaluate(()=>{ window.__cache=true; Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__cache}); });
  await pg.evaluate(()=>window.__lvAller('h')); await pg.waitForTimeout(120);
  const bloque=(await lv(pg)).bouge;
  await pg.waitForTimeout(2600);
  const apres=await lv(pg);
  ok(bloque&&!apres.bouge&&apres.debloques===1,'voyage figé (onglet caché) : la main est rendue d\'elle-même ('+apres.debloques+' déblocage)');
  await pg.evaluate(()=>{ window.__cache=false; });
  await pg.click('#lvn-dn'); await vers(pg,'c'); await pg.waitForTimeout(300);
  const fin=await lv(pg);
  ok(fin.vue==='c'&&!fin.bouge,'… et le geste suivant passe : retour au centre → '+fin.vue);
  await pg.click('#lvn-dn'); await vers(pg,'b'); await pg.click('#lvn-up'); await vers(pg,'c');
  ok((await lv(pg)).vue==='c','la croix fonctionne ensuite normalement');
  /* d · le retournement à l'horizontale sur le papier reste (Turn to configure it) */
  p=await centre();
  await glisse(p.x-60,p.y,p.x+90,p.y);await pg.waitForTimeout(900);
  ok((await lv(pg)).reglages===true,'à l\'horizontale, le papier se retourne toujours (mes réglages)');
  const warn=log.errors.filter(e=>/aller|rentrer|chercher/.test(e));
  ok(!erreurs(log).length&&!warn.length,'gestes : aucune erreur '+erreurs(log).concat(warn).join(' | '));
  await ctx.close();}

 /* ── 1 bis · LOT S (22/10) : la manette est un MANCHE, et elle répond pendant le repli du TOTEHM ──
    Wah : « quand on ouvre le Totehm et qu'on referme, les mouvements joystick ne fonctionnent plus » (mesuré avant : un
    geste à 200, 600 ou 1 000 ms après la croix était perdu) · « tous les mouvements sont inversés, réfléchis en joystick ». */
 /* 27/10 : le repli dure 0,15 + 0,72 s ; 650 ms tombe en plein retour du papier (1 000 ms tombait avant le 27/10). */
 for(const delai of [200,650]){
  const{pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND},viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  const tire=async(dx,dy)=>{const r=await pg.$eval('#lvj-box',e=>{const b=e.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};});
    await pg.mouse.move(r.x,r.y);await pg.mouse.down();await pg.mouse.move(r.x+dx,r.y+dy,{steps:4});await pg.mouse.up();};
  if(delai===200){
    await tire(-22,0);await vers(pg,'g');const g=(await lv(pg)).vue;await tire(22,0);await vers(pg,'c');
    await tire(0,-22);await vers(pg,'h');const h=(await lv(pg)).vue;await tire(0,22);await vers(pg,'c');
    ok(g==='g'&&h==='h','22/10 · la manette à la souris est un manche : tirée à gauche → mes shorts, vers le haut → Get Higher ('+g+', '+h+')');
  }
  await pg.click('#lv-tap-open');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:6000}).catch(()=>{});await pg.waitForTimeout(500);
  const a0=(await lv(pg)).enAttente;
  await pg.evaluate(()=>document.getElementById('fold-x').click());await pg.waitForTimeout(delai);
  /* 23/10 : la manette est cachée pendant le fondu du repli (comme au déploiement) : à 200 ms, le geste vient du clavier. */
  if(delai===200) await pg.keyboard.press('ArrowDown'); else await tire(0,22);
  await pg.waitForTimeout(1900);
  const d=await lv(pg);
  ok(d.vue==='b'&&d.enAttente===a0+1,'22/10 · un geste ('+(delai===200?'clavier':'manette')+') '+delai+' ms après la croix (le TOTEHM se replie encore) attend la fin du repli, puis part → '+d.vue);
  ok(!erreurs(log).length,'repli + manette : aucune erreur '+erreurs(log).join(' | '));
  await ctx.close();}

 /* ── 1 quater · LOT 24/10 (Wah) : « les mouvements sur le trackpad et sur l'écran tactile doivent aussi avoir une
    répercussion sur le joystick ». Un geste venu d'ailleurs POUSSE le manche vers sa vue, puis il revient au centre. ── */
 {const{pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND},viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  const my=()=>pg.$eval('#lvj-stack',e=>parseFloat(e.style.getPropertyValue('--my'))||0);
  await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(70);
  const pousse=await my();
  await pg.waitForTimeout(800);
  const retour=await my();
  ok(pousse>0&&Math.abs(retour)<0.5,'24/10 · un geste d\'ailleurs pousse la manette vers sa vue, puis elle revient au centre ('+pousse+' → '+retour+')');
  ok(!erreurs(log).length,'manette poussée : aucune erreur '+erreurs(log).join(' | '));
  await ctx.close();}

 /* ── 1 ter · LE MOUCHARD (22/10) : un geste refusé dit POURQUOI (un code) ; `?diag=1` l'affiche, sinon rien ── */
 {const{pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND},viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(800);
  const sans=await pg.evaluate(()=>!document.getElementById('lv-diag'));
  await pg.goto(origin+'/totehm?diag=1');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.keyboard.press('ArrowDown');await vers(pg,'b');await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(200);
  await pg.keyboard.press('ArrowUp');await vers(pg,'c');
  await pg.click('#lv-m-members');await pg.waitForTimeout(1500);await pg.evaluate(()=>document.activeElement.blur());
  /* 26/10 : pendant la recherche, un geste n'est plus refusé — il la referme et voyage (plus de code `:recherche`) */
  await pg.keyboard.press('ArrowDown');await vers(pg,'b');await pg.waitForTimeout(600);
  const m=await pg.evaluate(()=>{const e=document.getElementById('lv-diag'),d=window.__totehm_lv();return {r:d.refus,vue:d.vue,mode:d.mode,txt:e?e.textContent:'',pe:e?getComputedStyle(e).pointerEvents:''};});
  ok(sans&&m.r['voisin:b>b']===1&&!Object.keys(m.r).some(k=>/recherche/.test(k))&&m.vue==='b'&&m.mode==='mine'&&/refus voisin:b>b/.test(m.txt)&&m.pe==='none',
     '22/10 · le mouchard : un geste refusé dit pourquoi (en bas sans voisin) ; à l\'écran avec ?diag=1 seulement ; 26/10 · pendant la recherche, ↓ la referme et descend → '+JSON.stringify({r:m.r,vue:m.vue,mode:m.mode}));
  ok(!erreurs(log).length,'mouchard : aucune erreur '+erreurs(log).join(' | '));
  await ctx.close();}

 /* ── 3 · LA VUE DU HAUT : le cerveau entier, rien ne le recouvre ── */
 for(const [w,h] of [[390,664],[375,667],[390,844],[1280,720]]){
  const{pg,ctx}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND},viewport:{width:w,height:h},hasTouch:w<500});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1000);
  await pg.click('#lvn-up');await vers(pg,'h');await pg.waitForTimeout(700);
  const m=await pg.evaluate(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {t:b.top,b:b.bottom};};
    const ys=[...document.querySelectorAll('#lv-ram g path:first-child')].flatMap(p=>(p.getAttribute('d')||'').split(/[ML]/).filter(Boolean).map(t=>+t.trim().split(/[ ,]+/)[1])).filter(Number.isFinite);
    return {m:r('#gate-mouth'),s:r('#lv-slogan'),v:r('#lv-sell'),j:r('#lvj-box'),cb:Math.min(...ys),cB:Math.max(...ys),bouche:(window.__totehm_lv().haut||{}).bouche};});
  const tag=w+'×'+h;
  ok(m.m.t<=Math.max(14,h*.02)+1,tag+' : la bouche monte contre le haut ('+Math.round(m.m.t)+' px)');
  ok(m.v.t>=m.s.b-2&&m.v.t-m.s.b<=16,tag+' : la vente se pose juste sous « Get [Higher] » (écart '+Math.round(m.v.t-m.s.b)+' px)');
  ok(m.cb>=m.v.b+4&&m.cB<=m.j.t+2&&m.cB-m.cb>=120,tag+' : le cerveau ENTIER entre la vente et la manette ('+Math.round(m.cb)+' → '+Math.round(m.cB)+', vente '+Math.round(m.v.b)+', manette '+Math.round(m.j.t)+')');
  ok(m.bouche>=110,tag+' : la bouche garde au moins 110 px ('+m.bouche+')');
  await ctx.close();
 }
}finally{await browser.close();}
