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
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,habits:STEPS,vis:'private'}]};
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
    if([...document.querySelectorAll('#lv-join')].some(vis)) vu.connect++;
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
  /* 24/11 (Wah) : ↑ n'est plus un voyage — le geste du scroll OUVRE LE RÉCIT (le Discover sert de menu), et le centre ne bouge pas. */
  const r1=await pg.evaluate(()=>({ouvert:window.__totehm_discover().ouvert,vue:window.__totehm_lv().vue}));
  ok(a1==='c'&&r1.ouvert&&r1.vue==='c','24/11 · un glissé VERS LE HAUT qui part sur le papier OUVRE LE RÉCIT, sans quitter le centre → '+JSON.stringify(r1));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(700);
  ok(!(await pg.evaluate(()=>window.__totehm_discover().ouvert)),'ÉCHAP referme le récit');
  p=await centre();
  const a3=await glisse(p.x,p.y-20,p.x,p.y+150);
  /* 23/11 (Wah) : la vue ↓ Get Higher est retirée ; ↓ retourne le TOTEHM vers Ecosystems (le détail : com_ecosystems) */
  ok(a3!=='h','23/11 · au centre, vers le bas : plus de Get Higher (↓ = Ecosystems) → '+a3);
  if(await pg.evaluate(()=>document.getElementById('srch').classList.contains('is-on'))){
    await pg.click('#srch-x'); await pg.waitForFunction(()=>!document.getElementById('srch').classList.contains('is-on'),null,{timeout:8000}).catch(()=>{}); }
  await vers(pg,'c'); await pg.waitForTimeout(600);
  /* b · deux gestes coup sur coup : le second attend la fin du premier au lieu de se perdre */
  await vers(pg,'c');
  const d0=(await lv(pg)).enAttente;
  /* 24/11 : la file se teste à L'HORIZONTALE — ↑ ouvre le récit et ↓ retourne le TOTEHM, ni l'un ni l'autre n'est un voyage. */
  await glisse(40,640,180,640,false); await pg.waitForTimeout(120); await glisse(180,640,40,640,false);
  await vers(pg,'c'); await pg.waitForTimeout(300);
  const d1=await lv(pg);
  ok(d1.vue==='c'&&d1.enAttente===d0+1,'← puis → pendant le voyage : mes médias, puis le retour au centre (le second geste a attendu) → '+d1.vue+' · en attente '+(d1.enAttente-d0));
  await pg.keyboard.press('ArrowLeft'); await pg.waitForTimeout(80); await pg.keyboard.press('ArrowRight');
  await vers(pg,'c'); await pg.waitForTimeout(300);
  ok((await lv(pg)).vue==='c','← puis → au clavier, sans attendre : mes médias puis le centre');
  /* c · un voyage qui ne se termine pas (l'onglet se cache en route : plus d'images) rend la main tout seul */
  await pg.evaluate(()=>{ window.__cache=true; Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__cache}); });
  await pg.evaluate(()=>window.__lvAller('g')); await pg.waitForTimeout(120);
  const bloque=(await lv(pg)).bouge;
  await pg.waitForTimeout(2600);
  const apres=await lv(pg);
  ok(bloque&&!apres.bouge&&apres.debloques===1,'voyage figé (onglet caché) : la main est rendue d\'elle-même ('+apres.debloques+' déblocage)');
  await pg.evaluate(()=>{ window.__cache=false; });
  await pg.click('#lvn-rt'); await vers(pg,'c'); await pg.waitForTimeout(300);   /* depuis mes médias (à gauche), → ramène au centre */
  const fin=await lv(pg);
  ok(fin.vue==='c'&&!fin.bouge,'… et le geste suivant passe : retour au centre → '+fin.vue);
  await pg.click('#lvn-lf'); await vers(pg,'g'); await pg.click('#lvn-rt'); await vers(pg,'c');
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
    await tire(0,-22);await pg.waitForTimeout(1200);
    const h=await pg.evaluate(()=>({ouvert:window.__totehm_discover().ouvert,vue:window.__totehm_lv().vue}));
    if(h.ouvert){ await pg.keyboard.press('Escape'); await pg.waitForTimeout(700); }
    ok(g==='g'&&h.ouvert&&h.vue==='c','22/10 · la manette à la souris est un manche : tirée à gauche → mes médias, vers le haut → LE RÉCIT (24/11) ('+g+', '+JSON.stringify(h)+')');
  }
  await pg.click('#lv-tap-open');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:6000}).catch(()=>{});await pg.waitForTimeout(500);
  const a0=(await lv(pg)).enAttente;
  /* Le geste à 650 ms doit arriver PENDANT le repli : les allers-retours Playwright de quatre mousemove
     peuvent autrement relâcher après sa fin, et tester à tort une mise en attente qui n'est plus nécessaire. */
  if(delai===200){
    await pg.evaluate(()=>document.getElementById('fold-x').click());await pg.waitForTimeout(delai);
    await pg.keyboard.press('ArrowLeft');   /* 24/11 : ni ↑ (le récit) ni ↓ (Ecosystems) ne sont des voyages — la file se teste à l'horizontale */
  }else{
    const pendant=await pg.evaluate(delai=>new Promise(resolve=>{
      document.getElementById('fold-x').click();
      setTimeout(()=>{
        const el=document.getElementById('lvj-box'),r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
        const folding=document.body.classList.contains('folding');
        for(const [type,dx] of [['pointerdown',0],['pointermove',-22],['pointerup',-22]])
          el.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,pointerType:'mouse',button:0,buttons:type==='pointerup'?0:1,clientX:x+dx,clientY:y}));
        resolve(folding);
      },delai);
    }),delai);
    ok(pendant,'le geste de manette est reçu avant la fin du repli');
  }
  await pg.waitForTimeout(1900);
  const d=await lv(pg);
  ok(d.vue==='g'&&d.enAttente===a0+1,'22/10 · un geste vers la GAUCHE ('+(delai===200?'clavier':'manette')+') '+delai+' ms après la croix (le TOTEHM se replie encore) attend la fin du repli, puis part → '+d.vue);
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
 {const{pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND,figher_access:{signed_in:true,member:true}},viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(800);
  const sans=await pg.evaluate(()=>!document.getElementById('lv-diag'));
  await pg.goto(origin+'/totehm?diag=1');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  /* 24/11 : ↑ ouvre le récit, ce n'est plus un voyage — le refus se teste depuis MES MÉDIAS, qui n'a pas de voisin en haut. */
  await pg.keyboard.press('ArrowLeft');await vers(pg,'g');await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(250);
  await pg.keyboard.press('ArrowRight');await vers(pg,'c');
  /* 18/11 — [Members] retourne le TOTEHM sur son verso, en mode recherche (membre du Club), sans onglet. Sans Totehm il
     n'ouvre rien et mène à la porte (`members:sans-totehm`). Refermé, l'atterrissage reste entièrement navigable :
     aucun état ne le retient. */
  await pg.evaluate(()=>{ window.__ouvert=[]; window.open=(u)=>{ window.__ouvert.push(u); return null; }; });
  await pg.click('#lv-m-members');
  const cherche=await pg.waitForFunction(()=>{const c=window.__totehm_cherche&&window.__totehm_cherche();return c&&c.ouvert;},null,{timeout:8000}).then(()=>true,()=>false);
  const onglets=await pg.evaluate(()=>window.__ouvert.slice());
  await pg.keyboard.press('Escape');await pg.waitForFunction(()=>!document.getElementById('srch').classList.contains('is-on'),null,{timeout:8000}).catch(()=>{});
  await pg.waitForTimeout(900);
  await pg.waitForTimeout(600);
  const m=await pg.evaluate(()=>{const e=document.getElementById('lv-diag'),d=window.__totehm_lv();return {r:d.refus,vue:d.vue,mode:d.mode,txt:e?e.textContent:'',pe:e?getComputedStyle(e).pointerEvents:''};});
  ok(sans&&m.r['voisin:g>h']===1&&!Object.keys(m.r).some(k=>/recherche/.test(k))&&m.vue==='c'&&m.mode==='mine'&&/refus voisin:g>h/.test(m.txt)&&m.pe==='none',
     '22/10 · le mouchard : un geste refusé dit pourquoi (dans mes médias, sans voisin au-dessus) ; à l\'écran avec ?diag=1 seulement → '+JSON.stringify({r:m.r,vue:m.vue,mode:m.mode}));
  ok(cherche&&onglets.length===0,
     '18/11 · [Members] retourne le TOTEHM sur son verso, en mode recherche, sans onglet → '+JSON.stringify({cherche,onglets}));
  ok(!erreurs(log).length,'mouchard : aucune erreur '+erreurs(log).join(' | '));
  await ctx.close();}

 /* 23/11 : la vue ↓ Get Higher (le TotehmPaper, le cerveau, la vente) est retirée — sa mise en page n'est plus testée */
}finally{await browser.close();}
