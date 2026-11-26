// COM · 24/11/2026 — LE DISCOVER EST LE RÉCIT, ET LE MENU.
// Wah : « les 5 sont liés et ça forme un storytelling » · « connecté ou pas on passe dans le discover qui par sa
// simplicité peut faire office de MENU en redirigeant vers d'autres fonctionnalités » · « Higher GPT est dans le
// dashboard de toute façon ». Donc : ↑ ouvre le Discover (ce n'est plus une vue), le fil conducteur est TA GREATNESS,
// et UN SEUL objet traverse les six écrans sans jamais disparaître. Tout est simulé : aucune écriture.
// LANCER : node com_accueil_discover.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'.';
const browser=await launch();const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,habits:[{t:'Run the hill',t0:'Run the hill',is:['fight']}],vis:'private'}]};
const LAND={signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false,open:false},higher:{active:false},thp:false};
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const D=pg=>pg.evaluate(()=>window.__totehm_discover());
const ecran=pg=>pg.evaluate(()=>{const h=document.getElementById('lvd'),b=document.getElementById('lvd-cta'),l=document.getElementById('lvd-lnk');
  const on=h.querySelector('.dc-s.is-on');
  return {i:+h.dataset.i, n:+h.dataset.n,
    tw:(on.querySelector('.dc-tw')||{}).textContent,
    cta:b.classList.contains('hide')?null:b.textContent.trim(),
    lien:l.classList.contains('hide')?null:l.textContent.trim(),
    etape:h.dataset.etape,
    objets:[...h.querySelectorAll('.dc-hero .lvh')].filter(n=>+getComputedStyle(n).opacity>.5).map(n=>n.className.replace('lvh ',''))};});
const avance=async(pg,k)=>{for(let j=0;j<k;j++){await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(1150);}};
try{
 /* ── 1 · SANS COMPTE : le récit, et sa porte unique ── */
 {const{pg,ctx,log}=await page(browser,{dir:'com',origin,tables:{profiles:[]},rpc:{my_landing:{signed_in:false}},viewport:{width:390,height:844},hasTouch:true,session:false});
  await pg.goto(origin+'/totehm');await pg.waitForFunction(()=>typeof window.__totehm_lv==='function');await pg.waitForTimeout(2200);
  const c=await pg.evaluate(()=>{const vu=e=>e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
    return {titre:!!document.querySelector('#lv-title'),actions:[...document.querySelectorAll('#lv-actions button')].filter(vu).map(b=>b.getAttribute('aria-label')),
      touches:[...document.querySelectorAll('#lv-keys button')].filter(vu).map(b=>b.querySelector('.k2l').textContent.trim())};});
  ok(!c.titre&&c.actions.join('|')==='Open my TOTEHM|Search a TOTEHM|Add a spot|Add an illustration'&&c.touches.join('|')==='Greatness',
     'sans compte : les quatre actions et Greatness → '+c.actions.join(' | '));
  /* le SCROLL ouvre le Discover, et l'inertie du même geste ne le fait pas défiler */
  {const cdp=await ctx.newCDPSession(pg);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:600}]});
   for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y:600-44*i}]});await pg.waitForTimeout(16);}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pg.waitForTimeout(900);
   const s=await D(pg);
   ok(s.ouvert&&s.i===0&&s.parScroll===1,'sans compte, un glissé vers le haut ouvre le Discover sur son premier écran → '+JSON.stringify(s));
   await pg.keyboard.press('Escape');await pg.waitForTimeout(700);}
  await pg.click('#lv-great');await pg.waitForTimeout(1500);
  /* ── l'écran 0 : L'ATTERRISSAGE QUI SE SIMPLIFIE — la pièce ne bouge pas d'un pixel, la question prend la place de la légende ── */
  let e=await ecran(pg);
  ok(e.n===6&&e.i===0&&/^Make it Happen$/.test(e.tw.trim())&&e.cta===null,
     '25/11 · écran 0 : « Make it Happen », frappé, sans porte ni tiroir → '+JSON.stringify(e));
  const cal=await pg.evaluate(()=>{const r=n=>{const q=n.getBoundingClientRect();return [Math.round(q.x),Math.round(q.y),Math.round(q.width),Math.round(q.height)];};
    return {atterrissage:r(document.getElementById('gate-asteroid')),recit:r(document.querySelector('#lvd .lvh-pp .sfv-g'))};});
  ok(JSON.stringify(cal.atterrissage)===JSON.stringify(cal.recit),
     '24/11 · la slide 0 EST l\'atterrissage : la pièce est à la MÊME place, à la MÊME taille → '+JSON.stringify(cal));
  /* ── LE CADRE NE BOUGE PAS : l'objet est exactement à la place du cadre d'illustration de chaque écran ── */
  /* la place est une affaire de MISE EN PAGE (`offsetTop`), pas de l'animation d'entrée des écrans (une translation) */
  const cadre=await pg.evaluate(()=>{const h=document.getElementById('lvd'),on=h.querySelector('.dc-s.is-on');
    const hr=h.querySelector('.dc-hero').getBoundingClientRect(), ir=on.querySelector('.dc-ill').getBoundingClientRect();
    return {colle:Math.round(hr.x)===Math.round(ir.x)&&Math.round(hr.y)===Math.round(ir.y)
      &&Math.round(hr.width)===Math.round(ir.width)&&Math.round(hr.height)===Math.round(ir.height),
      /* 25/11 : les écrans sont CENTRÉS, donc le cadre ne tombe plus à la même hauteur partout — ce qui doit rester
         identique, c'est sa TAILLE, et l'objet doit s'y poser exactement. */
      ill:[...new Set([...h.querySelectorAll('.dc-s .dc-ill')].map(n=>n.offsetWidth+'×'+n.offsetHeight))]};});
  ok(cadre.colle&&cadre.ill.length===1,
     'l\'objet est posé sur le cadre de l\'écran actif, et tous les cadres ont la même taille → '+JSON.stringify(cadre));
  /* ── LE RÉCIT : un objet qui se TRANSFORME, et une porte par écran ── */
  const attendu=[['lvh-pp',null],['lvh-pp','Create my TOTEHM'],['lvh-pp is-verso','Subscribe to a TOTEHM'],
                 ['lvh-pp','Get'],['lvh-cl','Create my TOTEHM Cloth'],['lvh-rd','Integrate figher.club']];
  const vu=[];
  const cadres=[];
  for(let k=0;k<6;k++){ if(k) await avance(pg,1); const x=await ecran(pg); vu.push([x.objets.join('+'),x.cta]);
    cadres.push(await pg.evaluate(()=>{const f=document.querySelector('#lvd .dc-s.is-on .dc-ill').getBoundingClientRect();
      return Math.round(f.width)+'×'+Math.round(f.height);}));
    ok(x.objets.length===1,'écran '+k+' : UN objet visible à la fois (il se transforme, il ne s\'empile pas) → '+JSON.stringify(x.objets)); }
  ok([...new Set(cadres)].length===1&&/^(\d+)×\1$/.test(cadres[0]),
     '25/11 · les six objets reprennent les MÊMES dimensions, un carré → '+JSON.stringify([...new Set(cadres)]));
  ok(JSON.stringify(vu)===JSON.stringify(attendu),'la pièce → ouverte → refermée sur son verso → revenue en recto → le vêtement → le radar → '+JSON.stringify(vu));
  const piece=await pg.evaluate(()=>document.querySelector('#lvd .lvh-pp .sfcmd').className);
  ok(/is-logo/.test(piece)&&!/is-grind/.test(piece),
     '24/11 · le TOTEHM est REVENU en pièce (le mouvement inverse est passé par GRIND) avant de se retourner → '+piece);
  /* le radar ne tourne que sur SON écran ; la grille et le vêtement portent bien les éléments natifs */
  const nat=await pg.evaluate(async()=>{
    const im=[...document.querySelectorAll('#lvd .lvh-cl img')];
    await Promise.all(im.map(i=>i.decode().catch(()=>null)));
    return {radar:window.__totehm_discover().radar, spots:window.__totehm_discover().spots,
      photos:im.filter(i=>/cloth-(front|back)\.webp$/.test(i.src)&&i.naturalWidth>0).length,
      perfo:getComputedStyle(document.querySelector('#lvd .lvh-prt')).maskImage!=='none',
      video:!!document.querySelector('#lvd .lvh-vid video'),
      orphelins:document.querySelectorAll('#lvd .dc-hero [data-open],#lvd .dc-hero [data-go],#lvd .dc-hero button').length};});
  /* 25/11 (Wah : « ça ne reprend pas le format verso du dashboard » · « sans le Discover ! ») — le verso du récit
     est le VRAI : papier CARRÉ, nom corail au format `#mb-q`, bande noire native (prix · per year · stop anytime),
     la ligne « Respect their rules… », et AUCUN bouton [Discover] (on y est déjà). */
  {const v=await pg.evaluate(()=>{const p=document.querySelector('#lvd .lvh-pap').getBoundingClientRect();
    const q=document.querySelector('#lvd .lvh-q'), n=document.querySelector('#lvd .lvh-r .mbr-nom');
    return {carre:Math.abs(p.width-p.height)<2, corail:getComputedStyle(q).color, nomCorail:n?getComputedStyle(n).color:null,
      prix:(document.querySelector('#lvd .vs-month b')||{}).textContent,
      an:(document.querySelector('#lvd .vs-month i')||{}).textContent,
      cut:!!document.querySelector('#lvd .vs-s.vs-cut'), disc:document.querySelectorAll('#lvd .vs-act').length};});
   ok(v.carre&&v.corail==='rgb(251, 213, 202)'&&v.prix==='60 €'
      &&/per year · stop anytime/.test(v.an)&&!v.cut&&v.disc===0,
      '25/11 · le verso : plein navy, le prix SEUL et centré, sans [Discover] ni ligne de règles → '+JSON.stringify(v));}
  ok(nat.radar&&nat.spots>=6&&nat.photos===2&&nat.perfo&&nat.video&&nat.orphelins===0,
     '24/11 · les VRAIES photos du vêtement (notre stockage), l\'illustration perforée au dos, la place de la vidéo, le radar du Club et ses spots → '+JSON.stringify(nat));
  /* 26/11 (Wah) : « on affiche d'abord les animations, ensuite la phrase » — et SURTOUT : « tout au long du
     discover le totehm mute, se transforme mais ne disparaît jamais ». On le mesure image par image. */
  {await pg.keyboard.press('Escape');await pg.waitForTimeout(700);await pg.click('#lv-great');await pg.waitForTimeout(2600);
   await pg.evaluate(()=>{ window.__suivi=[]; const h=document.getElementById('lvd');
     const tic=()=>{ const o=[...h.querySelectorAll('.lvh')].map(n=>+getComputedStyle(n).opacity);
       window.__suivi.push({hero:+getComputedStyle(h.querySelector('.dc-hero')).opacity, max:Math.max(0,...o)});
       if(window.__suivi.length<1400) requestAnimationFrame(tic); };
     requestAnimationFrame(tic); });
   for(let k=1;k<=5;k++){ await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(2400); }
   const s=await pg.evaluate(()=>window.__suivi);
   const creux=Math.min(...s.map(x=>x.max)), noir=s.filter(x=>x.hero<.98).length;
   ok(s.length>300&&noir===0&&creux>=.4,
      '26/11 · LE TOTEHM NE DISPARAÎT JAMAIS : '+s.length+' images, l\'objet jamais éteint ('+noir+'), cadre jamais vide (creux '+creux.toFixed(2)+')');}
  {await pg.keyboard.press('Escape');await pg.waitForTimeout(700);await pg.click('#lv-great');await pg.waitForTimeout(2600);
   await pg.keyboard.press('ArrowDown');
   const vus=[]; for(let j=0;j<10;j++){ vus.push(await pg.evaluate(()=>{const h=document.getElementById('lvd'),on=h.querySelector('.dc-s.is-on');
     return {e:h.dataset.etape, o:+getComputedStyle(h.querySelector('.dc-hero')).opacity>.9,
       w:+getComputedStyle(on.querySelector('.dc-tw')).opacity>.5, c:+getComputedStyle(h.querySelector('.dc-cta')).opacity>.5};}));
     await pg.waitForTimeout(320); }
   const e0=vus.findIndex(v=>v.e==='0'), e1=vus.findIndex(v=>v.e==='1'), e2=vus.findIndex(v=>v.e==='2');
   const iw=vus.findIndex(v=>v.w), ic=vus.findIndex((v,k)=>k>0&&v.c);
   ok(e0===0&&e1>e0&&e2>e1&&vus.every(v=>v.o)&&iw>=e1&&ic>=e2&&iw<ic,
      'l\'ordre : l\'objet se transforme (0, toujours visible), PUIS la phrase (1), PUIS la porte (2) → '+JSON.stringify({e0,e1,e2,iw,ic}));}
  await pg.screenshot({path:OUT+'/accueil_discover.png'});
  /* 60 / 30 / 10 : hors de l'objet (ses couleurs sont natives), aucune couleur */
  const coul=await pg.evaluate(()=>{const vus=new Set();for(const e of document.querySelectorAll('#lvd *')){ if(e.closest('.tw,.dc-hero')) continue; const c=getComputedStyle(e);
      for(const v of [c.color,c.backgroundColor]){ const m=v.match(/\d+(\.\d+)?/g); if(!m||(m[3]!==undefined&&+m[3]===0)) continue; const [r,g,b]=m.map(Number); if(Math.max(r,g,b)-Math.min(r,g,b)>24) vus.add(v); } } return [...vus];});
  ok(coul.length===0,'60 / 30 / 10 : hors de l\'objet, noir, blanc, gris — rien d\'autre → '+JSON.stringify(coul));
  /* sans TOTEHM, toutes les portes mènent à la même : s'inscrire */
  await pg.evaluate(()=>window.__totehm_discover&&document.getElementById('lvd'));
  await pg.keyboard.press('Escape');await pg.waitForTimeout(700);
  await pg.click('#lv-great');await pg.waitForTimeout(900);await avance(pg,1);
  await pg.click('#lvd-cta');await pg.waitForTimeout(1100);
  ok(await pg.evaluate(()=>document.body.classList.contains('is-door')&&!window.__totehm_discover().ouvert),
     'sans compte, la porte du récit ouvre la porte d\'inscription');
  ok(!erreurs(log).length&&!log.rpc.some(x=>/_set|_save|_create|_delete/.test(x.name)),'visiteur : aucune erreur, aucune écriture '+erreurs(log).join(' | '));
  await ctx.close();}

 /* ── 1 bis · TREE MODE : la touche MODE, sur ORDINATEUR seulement (25/11) ── */
 {const{pg,ctx}=await page(browser,{dir:'com',origin,tables:{profiles:[]},rpc:{my_landing:{signed_in:false}},viewport:{width:1280,height:860},session:false});
  await pg.goto(origin+'/totehm');await pg.waitForFunction(()=>typeof window.__totehm_lv==='function');await pg.waitForTimeout(2200);
  const a=await pg.evaluate(()=>({off:document.body.classList.contains('no-tree'),aff:getComputedStyle(document.getElementById('lv-ram')).display,
    vue:!!document.getElementById('lv-tree-k').getClientRects().length}));
  await pg.click('#lv-tree-k'); await pg.waitForTimeout(500);
  const b2=await pg.evaluate(()=>({off:document.body.classList.contains('no-tree'),aff:getComputedStyle(document.getElementById('lv-ram')).display,
    garde:localStorage.getItem('totehm_tree')}));
  await pg.click('#lv-tree-k'); await pg.waitForTimeout(400);
  /* 26/11 (Wah) : « le tree ne doit pas être affiché par défaut » — il part ÉTEINT, la touche MODE l'allume. */
  ok(a.vue&&a.off&&a.aff==='none'&&!b2.off&&b2.aff!=='none'&&b2.garde==='1',
     'TREE MODE : l\'arbre part éteint ; sur ordinateur, la touche MODE l\'allume, et le choix est gardé → '+JSON.stringify({a,b:b2}));
  await ctx.close();}

 /* ── 2 · MEMBRE : ↑ ouvre le récit (ce n'est plus une vue), et les portes deviennent SES fonctionnalités ── */
 {const{pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND,figher_access:{signed_in:true,member:true}},viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1700);
  /* 25/11 (Wah) : CONNECTÉ, ↑ ouvre la PRISE RAPIDE (photo · vidéo · fichier) ; le récit, lui, est sur [GREATNESS]. */
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(1200);
  let pr=await pg.evaluate(()=>({n:window.__totehm_prise().ouvertures,cap:document.getElementById('cap').classList.contains('is-on'),
    disc:window.__totehm_discover().ouvert,vue:window.__totehm_lv().vue}));
  ok(pr.n===1&&pr.cap&&!pr.disc&&pr.vue==='c','25/11 · membre : ↑ ouvre la PRISE RAPIDE, aucune vue ne s\'ouvre → '+JSON.stringify(pr));
  await pg.keyboard.press('Escape');await pg.waitForTimeout(500);
  await pg.click('#lv-great');await pg.waitForTimeout(1400);
  let a=await pg.evaluate(()=>({ouvert:window.__totehm_discover().ouvert,vue:window.__totehm_lv().vue,bouge:window.__totehm_lv().bouge}));
  ok(a.ouvert&&a.vue==='c'&&!a.bouge,'25/11 · [GREATNESS] OUVRE LE RÉCIT : aucune vue ne s\'ouvre, le centre ne bouge pas → '+JSON.stringify(a));
  const portes=[];
  for(let k=0;k<6;k++){ if(k) await avance(pg,1); const x=await ecran(pg); portes.push([x.cta,x.lien]); }
  ok(JSON.stringify(portes)===JSON.stringify([[null,null],['Open my TOTEHM',null],['Find an ecosystem','Monetize my TOTEHM'],
     ['Get',null],['Create my TOTEHM Cloth',null],['Integrate figher.club',null]]),
     'le MENU d\'un membre : son TOTEHM, chercher un écosystème (· Monetize), Get Higher, la boutique, le club → '+JSON.stringify(portes));
  const cal2=await pg.evaluate(()=>{const r=n=>{const q=n.getBoundingClientRect();return [Math.round(q.x),Math.round(q.y),Math.round(q.width)];};
    return {a:r(document.getElementById('gate-asteroid')),d:r(document.querySelector('#lvd .lvh-pp .sfv-g'))};});
  await pg.screenshot({path:OUT+'/accueil_discover_membre.png'});
  await pg.keyboard.press('Escape');await pg.waitForTimeout(800);
  ok(await pg.evaluate(()=>!window.__totehm_discover().ouvert&&window.__totehm_lv().vue==='c'&&!document.body.classList.contains('is-dc')),
     'ÉCHAP referme : on est déjà au centre, rien ne s\'est replié');
  /* la molette (le geste naturel) ouvre la PRISE chez un membre ; la porte du récit reste [GREATNESS] */
  await pg.mouse.move(195,420);await pg.mouse.wheel(0,120);await pg.waitForTimeout(1200);
  ok(await pg.evaluate(()=>window.__totehm_prise().ouvertures===2),'la molette vers le bas pousse le manche vers le HAUT : la prise rapide s\'ouvre');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(500);
  await pg.click('#lv-great');await pg.waitForTimeout(1400);
  ok((await D(pg)).ouvert,'[GREATNESS] rouvre le récit');
  await avance(pg,1);await pg.click('#lvd-cta');await pg.waitForTimeout(1400);
  ok(await pg.evaluate(()=>!window.__totehm_discover().ouvert&&(document.body.classList.contains('open')||!!document.querySelector('#stage.open')||window.__totehm_lv().papier!=null)),
     'membre : [Open my TOTEHM] referme le récit et ouvre son TOTEHM');
  /* ⚠️ 24/11 (Wah : « pas dans le totehm déployé ! ») — LE RÉCIT N'APPARTIENT QU'À L'ATTERRISSAGE.
     Papier DÉPLOYÉ, le geste vers le haut est refusé comme un autre : les cinq vues du TOTEHM déployé sont les siennes. */
  const deploye=()=>pg.evaluate(()=>!document.body.classList.contains('gate'));   /* le papier est DÉPLOYÉ : la porte a disparu */
  await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});
  await pg.waitForTimeout(900);
  ok(await deploye(),'le TOTEHM est déployé');
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(1500);
  const apres=await pg.evaluate(()=>({ouvert:window.__totehm_discover().ouvert,dernier:window.__totehm_lv().dernierRefus||null,
    deploye:!document.body.classList.contains('gate')}));
  ok(apres.deploye&&!apres.ouvert,
     'TOTEHM DÉPLOYÉ : ↑ n\'ouvre PAS le récit, le papier reste déployé → '+JSON.stringify(apres));
  /* la garde de `aller` est la SECONDE ceinture (le geste est déjà arrêté par `libre`) : on l'appelle en face */
  const direct=await pg.evaluate(()=>{const lv=window.__totehm_lv();try{ }catch(_){}
    return {avant:window.__totehm_discover().ouvert};});
  ok(!direct.avant,'et aucune autre route ne l\'ouvre pendant que le papier est déployé');
  ok(!erreurs(log).length,'membre : aucune erreur '+erreurs(log).join(' | '));
  await ctx.close();}
}finally{await browser.close();}
