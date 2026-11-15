// COM — LE VERSO : LE NOM PREND LE CARRÉ (Wah, 12/11/2026 : « éparpiller les lettres du nom dans la face verso
// un peu à la manière d'un code binaire ; quand on la retourne, elles reforment le pseudo normal, aligné, sans
// retour de ligne »). Sur une ligne, un nom de 24 lettres tombait à 7,1 px sur le papier de 110 ; en grille il
// garde deux fois plus. Ce test mesure la TAILLE gagnée, la NOMENCLATURE, et surtout la CONTINUITÉ : les mêmes
// lettres du début à la fin, aucune qui apparaisse ou disparaisse entre la grille et la ligne.
// Comptes, réseau et RPC sont simulés. LANCER : node com_verso_nom.mjs /tmp
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.com';
const NOM='thehigherversionofme';   // 20 lettres : un bloc de 5 colonnes, 4 lignes
const tables={profiles:[{pseudo:NOM}]};
const LAND={signed_in:true,pseudo:NOM,visibility:'private',offer:{enabled:false,open:false},
  higher:{active:false,price_cents:700,currency:'eur',period:'month'},thp:false,subscriptions:0,subscribers:0,
  sm:{ready:true,habit:true,objective:true,higher:false,free_total:7,free_left:6,left:6}};
const rpc={my_landing:LAND,creator_dashboard:{ok:true,subscribers:0,month_cents:0,pending_cents:0,currency:'eur',
  next_payout:'2026-12-01',threshold_cents:2500,part:80,price_cents:2400,min_cents:300,max_cents:100000}};
const CORAL='rgb(251, 213, 202)';

/* l'état du verso : les lettres, leur taille, ce qui dépasse, et si elles sont sur UNE ligne */
const verso=pg=>pg.evaluate(()=>{
  const g=document.getElementById('ast-grid'), t=document.querySelector('#ast-back .ast-tile');
  if(!g||!t) return null;
  const c=t.getBoundingClientRect(), L=[...g.querySelectorAll('.tn-l')];
  let dehors=0, px=0, ys=[];
  for(const l of L){ const b=l.getBoundingClientRect(); px=Math.max(px,b.height); ys.push(b.top);
    if(b.left<c.left-.5||b.right>c.right+.5||b.top<c.top-.5||b.bottom>c.bottom+.5) dehors++; }
  /* compter les RANGÉES, pas les `top` : chaque lettre porte son décalage d'empreinte (±8 % de sa case) */
  ys.sort((a,b)=>a-b);
  let lignes=ys.length?1:0;
  for(let i=1;i<ys.length;i++) if(ys[i]-ys[i-1]>px*.6) lignes++;
  const sn=document.getElementById('ast-name');
  return {n:L.length, px:+px.toFixed(1), dehors, carre:+c.width.toFixed(1), lignes,
    mot:L.map(l=>l.textContent).join(''),
    couleur:L[0]?getComputedStyle(L[0]).color:'', police:L[0]?getComputedStyle(L[0]).fontFamily:'',
    refVisible:getComputedStyle(sn).visibility, refLargeur:+sn.getBoundingClientRect().width.toFixed(1),
    diag:window.__totehm_verso()};
});
const browser=await launch();
try{
 const{pg,log}=await page(browser,{dir:'com',origin,rpc,tables,viewport:{width:390,height:844},hasTouch:true});
 await pg.goto(origin+'/totehm'); await pg.waitForSelector('body.member'); await pg.waitForTimeout(1000);

 // ── LE VERSO AU REPOS : la grille ───────────────────────────────────────────────
 // Le papier est posé sur son RECTO : son dos est déjà peint (c'est ce qu'on verra en le retournant).
 const a=await verso(pg);
 ok(a&&a.n===NOM.length&&a.mot===NOM, 'le verso porte les '+NOM.length+' lettres du nom, dans l\'ordre ('+(a&&a.mot)+')');
 ok(a&&!a.dehors&&a.lignes>1, 'elles prennent le carré du papier sur '+(a&&a.lignes)+' lignes, aucune dehors');
 ok(a&&a.couleur===CORAL&&/Quantico/.test(a.police), 'Quantico coral, comme tout nom de TOTEHM ('+(a&&a.couleur)+')');
 /* 14/11 (Wah : « les lettres sont beaucoup trop grosses, c'est très moche ») : un bloc CARRÉ, des lettres ≤ 20 % du côté */
 ok(a&&a.px>=8&&a.px<=a.carre*.2+.5, 'une lettre fait '+(a&&a.px)+' px sur un papier de '+(a&&a.carre)+' : lisible (≥ 8) et jamais plus de 20 % du côté');
 ok(a&&a.refVisible==='hidden'&&a.refLargeur>0, 'la ligne de référence reste MESURABLE sans se voir ('+(a&&a.refLargeur)+' px)');

 // ── LE DÉPLOIEMENT : les mêmes lettres rejoignent la ligne ──────────────────────
 // → retourne le papier ET déplie mes réglages : c'est le geste de Wah (« quand on la retourne, elles
 // reforment le pseudo normal, aligné »). La recomposition part AVEC le demi-tour.
 await pg.focus('#gate-enter'); await pg.keyboard.press('ArrowRight');
 await pg.waitForTimeout(2400);
 ok(/is-open/.test(await pg.$eval('#srch',e=>e.className)), 'le verso s\'est déployé');
 const b=await verso(pg);
 ok(b&&b.n===a.n&&b.mot===a.mot, 'déployé : les MÊMES lettres, aucune apparue ni disparue ('+(b&&b.n)+' → '+(a&&a.n)+')');
 ok(b&&b.lignes===1, 'elles se sont reformées sur UNE ligne, le pseudo aligné ('+(b&&b.lignes)+' ligne)');
 ok(b&&b.diag&&b.diag.ligne===true, '__totehm_verso() dit la ligne');
 const sn=await pg.$eval('#self-name',e=>({t:e.textContent,w:e.getBoundingClientRect().width}));
 ok(sn.t===NOM&&sn.w>0, 'le nom déplié porte le même pseudo, sur une ligne ('+sn.t+')');
 await pg.screenshot({path:OUT+'/com_verso_nom_deploye.png'});

 // ── REFERMÉ : le nom retourne dans son carré ───────────────────────────────────
 await pg.keyboard.press('Escape');
 await pg.waitForTimeout(2000);
 const c=await verso(pg);
 ok(c&&c.n===a.n&&c.lignes===a.lignes&&!c.dehors, 'refermé : le nom est revenu dans son carré ('+(c&&c.lignes)+' lignes)');
 ok(c&&c.diag.ligne===false, '__totehm_verso() dit la grille');

 // ── LA NOMENCLATURE, aux bornes ────────────────────────────────────────────────
 const plan=await pg.evaluate(()=>['wah','wahvv','higher','seizelettresicibon','thehigherversionofmyselfetplus']
   .map(n=>{const p=window.TOTEHM_NOM.plan(n,.66);return [p.N,p.C,p.R];}));
 ok(plan.map(x=>x[0]).join()==='3,5,6,18,25'&&(r=>r.every(([N,C,R])=>N<=5?(R===1&&C===N):(C*R>=N&&(C-1)*R<N+C&&Math.abs(Math.log((C*.66*1.12)/(R*1.18)))<.4)))(plan),
   'la nomenclature : 1-5 une ligne · 6 et plus un BLOC CARRÉ (largeur ≈ hauteur) · au-delà 25 lettres + · ('+JSON.stringify(plan)+')');

 // ── 14/11 (Wah : « parfaitement carré et ALIGNÉ ») : une GRILLE exacte — même taille de colonne, même taille de ligne,
 // chaque lettre centrée dans sa case, un bloc dont la largeur égale la hauteur ──
 const g=await pg.evaluate(()=>{const h=document.getElementById('ast-grid'),L=[...h.querySelectorAll('.tn-l')],C=+h.dataset.cols,R=+h.dataset.rows;
   const cx=L.map(e=>{const r=e.getBoundingClientRect();return r.x+r.width/2;}), gy=[...new Set(L.map(e=>e.dataset.gy))];
   const parCol=Array.from({length:C},(_,c)=>cx.filter((_,i)=>i%C===c)), ecart=Math.max(...parCol.map(a=>Math.max(...a)-Math.min(...a)));
   const dots=h.querySelectorAll('.tn-v').length;
   return {C,R,B:+h.dataset.bloc,n:L.length,lignes:gy.length,ecart,dots,vides:C*R-L.length};});
 ok(g.C>1&&g.R>1&&g.lignes===g.R&&g.ecart<=2&&g.dots===g.vides&&g.B>0,
   'une GRILLE : '+g.C+' colonnes × '+g.R+' lignes, chaque ligne a son ordonnée unique, chaque colonne son axe (écart max '+g.ecart.toFixed(2)+' px), les '+g.vides+' cases vides sont des points ('+g.dots+')');
 ok(Math.abs(g.C*g.R-g.n-g.vides)<1e-9&&g.B/g.C>0&&g.B/g.R>0&&g.C*g.R>=g.n,
   'le bloc est EXACTEMENT carré : côté '+g.B+' px = '+g.C+' colonnes de '+(g.B/g.C).toFixed(2)+' = '+g.R+' lignes de '+(g.B/g.R).toFixed(2));

 // ── L'EMPREINTE : le même nom donne TOUJOURS le même dessin ────────────────────
 const emp=await pg.evaluate(()=>{
   const d=document.createElement('div'); d.style.cssText='position:absolute;left:-9999px;width:110px;height:110px';
   document.body.appendChild(d);
   const lire=()=>{ window.TOTEHM_NOM.poser(d,'thehigherversionofme',110);
     return [...d.querySelectorAll('.tn-l')].map(l=>l.dataset.gx+','+l.dataset.gy).join(' '); };
   const a=lire(), b=lire(); d.remove(); return a===b&&a.length>0;
 });
 ok(emp, 'le dessin d\'un nom est stable : deux rendus, le même placement');

 ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,'aucune erreur : '+log.errors.join(' | '));
}finally{ await browser.close(); }
