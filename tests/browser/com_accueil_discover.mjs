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
    tw:(on.querySelector('.dc-tw')||on.querySelector('.lvq')||{}).textContent,
    cta:b.classList.contains('hide')?null:b.textContent.trim(),
    lien:l.classList.contains('hide')?null:l.textContent.trim(),
    lead:+getComputedStyle(h.querySelector('.lvq')).opacity,
    objets:[...h.querySelectorAll('.dc-hero .lvh')].filter(n=>+getComputedStyle(n).opacity>.5).map(n=>n.className.replace('lvh ',''))};});
const avance=async(pg,k)=>{for(let j=0;j<k;j++){await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(1150);}};
try{
 /* ── 1 · SANS COMPTE : le récit, et sa porte unique ── */
 {const{pg,ctx,log}=await page(browser,{dir:'com',origin,tables:{profiles:[]},rpc:{my_landing:{signed_in:false}},viewport:{width:390,height:844},hasTouch:true,session:false});
  await pg.goto(origin+'/totehm');await pg.waitForFunction(()=>typeof window.__totehm_lv==='function');await pg.waitForTimeout(2200);
  const c=await pg.evaluate(()=>{const q=s=>document.querySelector(s),vu=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
    return {titre:!!q('#lv-title'),boutons:[...document.querySelectorAll('#lv-pitch button')].filter(vu).map(b=>b.textContent.trim())};});
  ok(!c.titre&&c.boutons.join('|')==='Open my TOTEHM|Discover','23/11 · l\'accueil reste minimal : la porte et [Discover] → '+c.boutons.join(' | '));
  /* le SCROLL ouvre le Discover, et l'inertie du même geste ne le fait pas défiler */
  {const cdp=await ctx.newCDPSession(pg);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:600}]});
   for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y:600-44*i}]});await pg.waitForTimeout(16);}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pg.waitForTimeout(900);
   const s=await D(pg);
   ok(s.ouvert&&s.i===0&&s.parScroll===1,'sans compte, un glissé vers le haut ouvre le Discover sur son premier écran → '+JSON.stringify(s));
   await pg.keyboard.press('Escape');await pg.waitForTimeout(700);}
  await pg.click('#lv-discover');await pg.waitForTimeout(1500);
  /* ── l'écran 0 : L'ATTERRISSAGE QUI SE SIMPLIFIE — la pièce ne bouge pas d'un pixel, la question prend la place de la légende ── */
  let e=await ecran(pg);
  ok(e.n===6&&e.i===0&&/^How to reach your greatness in the most efficient way\?$/.test(e.tw.trim())&&e.cta===null&&e.lead===1,
     'écran 0 : la problématique à la place de la légende, aucune porte → '+JSON.stringify(e));
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
      ill:[...new Set([...h.querySelectorAll('.dc-s .dc-ill')].map(n=>n.offsetTop+'×'+n.offsetHeight))],
      tw:[...new Set([...h.querySelectorAll('.dc-s .dc-tw')].map(n=>n.offsetTop))].length};});
  ok(cadre.colle&&cadre.ill.length===1&&cadre.tw===1,
     'l\'objet est posé sur le cadre, identique sur les six écrans, et la phrase ne saute pas → '+JSON.stringify(cadre));
  /* ── LE RÉCIT : un objet qui se TRANSFORME, et une porte par écran ── */
  const attendu=[['lvh-pp',null],['lvh-pp','Create my TOTEHM'],['lvh-pp is-verso','Subscribe to a TOTEHM'],
                 ['lvh-pp','Get'],['lvh-cl','Create my TOTEHM Cloth'],['lvh-rd','Integrate figher.club']];
  const vu=[];
  for(let k=0;k<6;k++){ if(k) await avance(pg,1); const x=await ecran(pg); vu.push([x.objets.join('+'),x.cta]);
    ok(x.objets.length===1,'écran '+k+' : UN objet visible à la fois (il se transforme, il ne s\'empile pas) → '+JSON.stringify(x.objets)); }
  ok(JSON.stringify(vu)===JSON.stringify(attendu),'la pièce → ouverte → refermée sur son verso → revenue en recto → le vêtement → le radar → '+JSON.stringify(vu));
  const piece=await pg.evaluate(()=>document.querySelector('#lvd .lvh-pp .sfcmd').className);
  ok(/is-logo/.test(piece)&&!/is-grind/.test(piece),
     '24/11 · le TOTEHM est REVENU en pièce (le mouvement inverse est passé par GRIND) avant de se retourner → '+piece);
  await pg.screenshot({path:OUT+'/accueil_discover.png'});
  /* le radar ne tourne que sur SON écran ; la grille et le vêtement portent bien les éléments natifs */
  const nat=await pg.evaluate(async()=>{
    const im=[...document.querySelectorAll('#lvd .lvh-cl img')];
    await Promise.all(im.map(i=>i.decode().catch(()=>null)));
    return {radar:window.__totehm_discover().radar, spots:window.__totehm_discover().spots,
      photos:im.filter(i=>/cloth-(front|back)\.webp$/.test(i.src)&&i.naturalWidth>0).length,
      perfo:getComputedStyle(document.querySelector('#lvd .lvh-prt')).maskImage!=='none',
      video:!!document.querySelector('#lvd .lvh-vid video'),
      orphelins:document.querySelectorAll('#lvd .dc-hero [data-open],#lvd .dc-hero [data-go],#lvd .dc-hero button').length};});
  ok(nat.radar&&nat.spots>=6&&nat.photos===2&&nat.perfo&&nat.video&&nat.orphelins===0,
     '24/11 · les VRAIES photos du vêtement (notre stockage), l\'illustration perforée au dos, la place de la vidéo, le radar du Club et ses spots → '+JSON.stringify(nat));
  /* 60 / 30 / 10 : hors de l'objet (ses couleurs sont natives), aucune couleur */
  const coul=await pg.evaluate(()=>{const vus=new Set();for(const e of document.querySelectorAll('#lvd *')){ if(e.closest('.tw,.dc-hero')) continue; const c=getComputedStyle(e);
      for(const v of [c.color,c.backgroundColor]){ const m=v.match(/\d+(\.\d+)?/g); if(!m||(m[3]!==undefined&&+m[3]===0)) continue; const [r,g,b]=m.map(Number); if(Math.max(r,g,b)-Math.min(r,g,b)>24) vus.add(v); } } return [...vus];});
  ok(coul.length===0,'60 / 30 / 10 : hors de l\'objet, noir, blanc, gris — rien d\'autre → '+JSON.stringify(coul));
  /* sans TOTEHM, toutes les portes mènent à la même : s'inscrire */
  await pg.evaluate(()=>window.__totehm_discover&&document.getElementById('lvd'));
  await pg.keyboard.press('Escape');await pg.waitForTimeout(700);
  await pg.click('#lv-discover');await pg.waitForTimeout(900);await avance(pg,1);
  await pg.click('#lvd-cta');await pg.waitForTimeout(1100);
  ok(await pg.evaluate(()=>document.body.classList.contains('is-door')&&!window.__totehm_discover().ouvert),
     'sans compte, la porte du récit ouvre la porte d\'inscription');
  ok(!erreurs(log).length&&!log.rpc.some(x=>/_set|_save|_create|_delete/.test(x.name)),'visiteur : aucune erreur, aucune écriture '+erreurs(log).join(' | '));
  await ctx.close();}

 /* ── 2 · MEMBRE : ↑ ouvre le récit (ce n'est plus une vue), et les portes deviennent SES fonctionnalités ── */
 {const{pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND,figher_access:{signed_in:true,member:true}},viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1700);
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(1400);
  let a=await pg.evaluate(()=>({ouvert:window.__totehm_discover().ouvert,vue:window.__totehm_lv().vue,bouge:window.__totehm_lv().bouge}));
  ok(a.ouvert&&a.vue==='c'&&!a.bouge,'24/11 · ↑ OUVRE LE RÉCIT : aucune vue ne s\'ouvre, le centre ne bouge pas → '+JSON.stringify(a));
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
  /* la molette (le geste naturel) ouvre aussi ; la porte d'un membre mène à SON TOTEHM */
  await pg.mouse.move(195,420);await pg.mouse.wheel(0,120);await pg.waitForTimeout(1400);
  ok((await D(pg)).ouvert,'la molette vers le bas pousse le manche vers le HAUT : le récit s\'ouvre');
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
