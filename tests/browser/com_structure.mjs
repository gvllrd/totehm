// COM — la structure de la vue centrale (Wah, 22/10/2026 ; refaite le 25/10).
// 1 · (25/10) Plus de boîte noire : le TOTEHM est le BOÎTIER du processeur. (26/10) Ses DOUZE perforations sont toutes
//     raccordées — une broche dans chaque trou — et ses sept traits forment un ARBRE DE VIE : les branches montent en
//     éventail jusqu'au haut de l'écran, les racines descendent en miroir ; le cœur (le TOTEHM) bat, très subtilement.
// 2 · (25/10) Un tap sur le TOTEHM : ses traits cessent leur activité et sont ASPIRÉS dans le papier pendant qu'il se
//     déploie (« on cesse l'activité du Totehm pour le configurer »). Ouvert : aucune boîte, aucun trait autour.
//     Le repli (29/10) : UN mouvement — le papier part pendant le fondu, l'arbre et l'atterrissage ressortent pendant qu'il se pose.
// 3 · Vers le bas, les traits se TRANSFORMENT en les sept traits de l'anneau du profil (comme ← et →).
// 4 · Le papier arrive dans la couleur de l'app — la fin du portail et l'app sont la même image.
// Tout est simulé (comptes, RPC) : aucune écriture en production. LANCER : node com_structure.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const browser=await launch();const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight'],f:'every_morning'},{t:'Read at dawn',t0:'Read at dawn',is:['focus','love']},{t:'Call mum',t0:'Call mum',is:['love']}];
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]};
const rpc={my_landing:{signed_in:true,pseudo:'wahigher'},my_trips:{signed_in:true,trips:[],reps:[],wisdom:[],visions:[]}};
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
/* Les broches, les douze trous du PAPIER (le boîtier : `--perfo`, trois par arête à 25, 50 et 75 %), et chaque trait : ses
   deux sous-chemins (la branche, la racine), leur départ et leur bout. */
const branche=pg=>pg.evaluate(()=>{const s=document.getElementById('gate-asteroid').getBoundingClientRect(),k=document.getElementById('lv-socket');
  const pins=[...document.querySelectorAll('#lv-ram rect.pin')].map(r=>{const b=r.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2,t:b.top,b:b.bottom};});
  const trous=[]; [.25,.5,.75].forEach(f=>{ trous.push([s.left+s.width*f,s.top],[s.left+s.width*f,s.bottom],[s.left,s.top+s.height*f],[s.right,s.top+s.height*f]); });
  const traits=[...document.querySelectorAll('#lv-ram > g')].map(g=>{const d=g.querySelector('path').getAttribute('d')||'';
    return d.split('M').filter(Boolean).map(sp=>sp.split('L').map(q=>q.trim().split(/\s+/).map(Number)));});
  const cs=getComputedStyle(k);
  const pads=[...document.querySelectorAll('#lv-ram circle')].map(c=>{const r=c.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
  return {pads,rameaux:document.querySelectorAll('#lv-ram path.fk').length,s:{t:s.top,b:s.bottom,l:s.left,r:s.right,w:s.width,cx:s.left+s.width/2,cy:s.top+s.height/2},H:innerHeight,pins,trous,traits,
    coeur:getComputedStyle(document.getElementById('gate-logo')).animationName,socle:{bg:cs.backgroundColor,ombre:cs.boxShadow,puits:!!k.querySelector('.sk-well')}};});
const pres=(p,l,t)=>l.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<=t);
/* L'état du réseau : aspiré ou non, son échelle, son opacité, ses impulsions. */
const reseau=pg=>pg.evaluate(()=>{const r=document.getElementById('lv-ram'),cs=getComputedStyle(r),m=cs.transform.match(/matrix\(([-\d.e]+)/),p=r.querySelector('.puls');
  return {aspire:document.body.classList.contains('is-aspire'),echelle:m?+m[1]:1,op:+cs.opacity,puls:p?getComputedStyle(p).animationName:'',d:window.__totehm_deploiement()};});
try{
 for(const [nom,vp] of [['ordinateur',{width:1280,height:800}],['téléphone',{width:390,height:844}]]){
  const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc,viewport:vp,hasTouch:nom==='téléphone'});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1500);
  /* ── 1 · le TOTEHM est le boîtier ── */
  const b=await branche(pg);
  ok(b.socle.bg==='rgba(0, 0, 0, 0)'&&b.socle.ombre==='none'&&!b.socle.puits,nom+' · 25/10 · plus de boîte noire : le socle ne se voit plus (ni verre, ni puits)');
  const occupes=b.trous.filter(t=>b.pins.filter(p=>Math.hypot(p.x-t[0],p.y-t[1])<=4.5).length===1).length;
  ok(b.pins.length===12&&occupes===12,nom+' · 26/10 · les DOUZE perforations sont raccordées : une broche dans chaque trou ('+occupes+'/12, '+b.pins.length+' broches)');
  const departs=b.traits.flatMap(t=>t.map(sp=>sp[0])), bouts=b.traits.map(t=>[t[0][t[0].length-1],t[1][t[1].length-1]]);
  ok(b.traits.length===7&&b.traits.every(t=>t.length===2)&&departs.every(p=>pres(p,b.trous,4.5))&&b.trous.every(t=>pres(t,departs,4.5)),
     nom+' · 26/10 · chaque trait part d\'un trou, et chaque trou porte au moins un trait (le tronc au milieu, les deux extrêmes se séparent dans le trou du milieu de leur côté)');
  /* 29/10 (Wah : « il faut que ça forme un arbre » + l'image : un circuit imprimé en éventail) : chaque trait monte en TRONC
     étroit, s'ouvre en COURONNE (son brin du milieu + 4 rameaux, chacun fini par une pastille), et descend en racine
     jusqu'à la rangée de pastilles du pied. */
  const xa=bouts.map(x=>x[0][0]), xb=bouts.map(x=>x[1][0]), monte=xa.every((x,i)=>!i||x>xa[i-1]), descend=xb.every((x,i)=>!i||x>xb[i-1]);
  const pads=b.pads, cime=pads.filter(p=>p.y<b.s.t), pied=pads.filter(p=>p.y>b.s.b), W=vp.width;
  ok(bouts.every(x=>x[0][1]<b.s.t-20&&x[1][1]>b.s.b+20)&&monte&&descend&&pads.length===42&&cime.length===35&&pied.length===7
     &&Math.min(...cime.map(p=>p.x))<b.s.l-40&&Math.max(...cime.map(p=>p.x))>b.s.r+40&&pads.every(p=>p.x>0&&p.x<W&&p.y>0&&p.y<b.H)
     &&Math.max(...pied.map(p=>p.y))-Math.min(...pied.map(p=>p.y))<1&&b.rameaux===28,
     nom+' · 29/10 · un ARBRE (le circuit imprimé de Wah) : 7 troncs, une couronne de 35 pastilles plus large que le TOTEHM, 28 rameaux, 7 racines alignées au pied, sans se croiser → '+xa.map(Math.round).join(','));
  ok(b.coeur==='coeur',nom+' · 26/10 · au repos, le cœur (le TOTEHM) bat → '+b.coeur);
  const r0=await reseau(pg);
  ok(!r0.aspire&&r0.echelle===1&&r0.op===1&&r0.puls==='ram-puls',nom+' · au repos, le réseau vit (impulsions)');
  /* ── 2 · le tap : les traits sont aspirés pendant le déploiement ── */
  await pg.evaluate(()=>{ window.__asp=[]; const r=document.getElementById('lv-ram'), t0=performance.now();
    const f=()=>{ const t=performance.now()-t0; if(t>1200) return; const cs=getComputedStyle(r), m=cs.transform.match(/matrix\(([-\d.e]+)/);
      window.__asp.push([t, m?+m[1]:1, +cs.opacity]); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await pg.click('#lv-tap-open');await pg.waitForTimeout(1300);
  const asp=await pg.evaluate(()=>window.__asp), ech=asp.map(x=>x[1]);
  const decroit=ech.every((v,i)=>!i||v<=ech[i-1]+1e-3), mi=asp.filter(x=>x[0]>150&&x[0]<450);
  ok(asp.length>20&&decroit&&ech[ech.length-1]<.05&&asp[asp.length-1][2]===0&&mi.some(x=>x[1]<1&&x[1]>.05),
     nom+' · 25/10 · au tap, les traits sont ASPIRÉS dans le TOTEHM : l\'échelle tombe de 1 à '+ech[ech.length-1].toFixed(2)+' en continu ('+asp.length+' images), puis ils disparaissent');
  const fin=await pg.evaluate(()=>getComputedStyle(document.querySelector('#gl-bg>rect')).fill);
  ok(fin==='rgb(43, 43, 87)',nom+' · le papier arrive dans la couleur de l\'app (#2b2b57) → '+fin);
  await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:6000}).catch(()=>{});await pg.waitForTimeout(400);
  const o=await pg.evaluate(()=>({proc:!!document.getElementById('app-proc'),traits:document.querySelectorAll('svg:not(#lv-ram) rect.pin').length,r:document.body.classList.contains('is-aspire'),
    coeur:getComputedStyle(document.getElementById('gate-logo')).animationName}));
  ok(!o.proc&&o.traits===0&&o.r&&o.coeur==='none',nom+' · ouvert : le TOTEHM seul — ni boîte ni traits autour, le réseau reste aspiré, le cœur ne bat plus');
  /* ── le repli, deux fois : le portail revient en fondu, le papier rentre, l'atterrissage revient, les traits ressortent ── */
  for(const tour of [1,2]){
   if(tour===2){ await pg.click('#lv-tap-open');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:6000}).catch(()=>{});await pg.waitForTimeout(400); }
   await pg.evaluate(()=>{ window.__fondu=[]; const gt=document.getElementById('gate'), bg=document.getElementById('gl-bg'), lv=document.getElementById('lv'), r=document.getElementById('lv-ram'), t0=performance.now();
     /* on ne relève qu'une fois le repli parti (`gate` posé) : une image avant le clic lirait le portail absent (largeur 0) */
     const f=()=>{ const t=performance.now()-t0; if(t>1500) return; if(!document.body.classList.contains('gate')){ requestAnimationFrame(f); return; }
       window.__fondu.push({t, o:+getComputedStyle(gt).opacity, w:bg.getBoundingClientRect().width, lv:+getComputedStyle(lv).opacity,
         asp:document.body.classList.contains('is-aspire'), folding:document.body.classList.contains('folding'), pose:document.body.classList.contains('is-pose')}); requestAnimationFrame(f); }; requestAnimationFrame(f); });
   await pg.evaluate(()=>document.getElementById('fold-x').click());
   await pg.waitForFunction(()=>document.body.classList.contains('gate')&&!document.body.classList.contains('folding'),null,{timeout:6000}).catch(()=>{});
   const lvFin=await pg.evaluate(()=>+getComputedStyle(document.getElementById('lv')).opacity);await pg.waitForTimeout(900);
   /* 29/10 (Wah : « le déploiement inverse … fait des sautages ; super fluide ») : UN SEUL MOUVEMENT. Le portail revient en
      fondu PENDANT que le papier part déjà ; le papier ne s'arrête jamais avant d'être posé (aucune image figée plus de
      100 ms), ne regrandit jamais ; l'arbre et l'atterrissage ressortent pendant qu'il se pose (`is-pose`), pas après. */
   const fo=await pg.evaluate(()=>window.__fondu), w1=fo[0]&&fo[0].w, wf=fo[fo.length-1].w, t1=fo[0]&&fo[0].t;
   const route=fo.filter(x=>x.w>wf+2); let fige=0, run=0;
   for(let i=1;i<route.length;i++){ run=Math.abs(route[i].w-route[i-1].w)<0.5?run+(route[i].t-route[i-1].t):0; fige=Math.max(fige,run); }
   const part=fo.find(x=>x.w<w1-1), pose=fo.find(x=>x.pose), finRoute=route.length?route[route.length-1].t:0;
   const jamaisPlus=fo.every((x,i)=>!i||x.w<=fo[i-1].w+0.5);
   ok(fo.length>10&&fo[0].o<0.5&&part&&part.t-t1<120&&fige<100&&jamaisPlus&&fo[fo.length-1].o===1&&wf<w1/3&&finRoute-t1<800,
      nom+' · repli '+tour+' : UN mouvement — le papier part '+Math.round(part?part.t-t1:-1)+' ms après le clic, pendant le fondu ; jamais figé (pire : '+Math.round(fige)+' ms), jamais en arrière ; posé en '+Math.round(finRoute-t1)+' ms');
   ok(fo.filter(x=>x.folding&&!x.pose).every(x=>x.lv===0&&x.asp)&&pose&&pose.w>wf+2&&lvFin>0.5,
      nom+' · repli '+tour+' : les traits restent aspirés, puis l\'arbre et l\'atterrissage ressortent PENDANT que le papier se pose (papier à '+Math.round(pose?pose.w:0)+' px, posé à '+Math.round(wf)+'), pas après');
   const r=await branche(pg), rs=await reseau(pg);
   ok(Math.abs(r.s.t-b.s.t)<1&&r.pins.length===12&&r.coeur==='coeur'&&!rs.aspire&&rs.echelle===1&&rs.op===1&&rs.puls==='ram-puls'&&rs.d.deploiements===tour,
      nom+' · repli '+tour+' : le papier posé, ses traits RESSORTENT et revivent, le cœur rebat → '+JSON.stringify(rs));
  }
  /* ── 3 · ↓ l'anneau ── */
  const m0=(await pg.evaluate(()=>window.__totehm_lv().ramifications.morphs));
  await pg.keyboard.press('ArrowDown');
  await pg.waitForFunction(m=>{const r=window.__totehm_lv().ramifications;return r.morphs>m&&!r.enCours;},m0,{timeout:4000}).catch(()=>{});
  const an=await pg.evaluate(()=>{const ts=[...document.querySelectorAll('#lv-socket .sk-ring b')].map(b=>{const r=b.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];});
    const ls=[...document.querySelectorAll('#lv-ram > g')].map(e=>{const p=(e.querySelector('path').getAttribute('d')||'').split('M')[1].split('L').map(q=>q.trim().split(' ').map(Number));const a=p[0],z=p[p.length-1];return [(a[0]+z[0])/2,(a[1]+z[1])/2];});
    return {e:ts.map((t,i)=>ls[i]?Math.hypot(t[0]-ls[i][0],t[1]-ls[i][1]):99), vue:window.__totehm_lv().ramifications.vue};});
  ok(an.vue==='b'&&an.e.length===7&&Math.max(...an.e)<=1.5,nom+' · vers le bas, les 7 traits se transforment en les 7 traits de l\'anneau (écart max '+Math.max(...an.e).toFixed(1)+' px)');
  ok(!erreurs(log).length,nom+' · aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();
 }
}finally{await browser.close();}
