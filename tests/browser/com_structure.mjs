// COM — la structure de la vue centrale (Wah, 22/10/2026).
// 1 · Les sept traits sont BRANCHÉS sur la boîte noire du processeur : une broche par trait, sur l'arête du haut et sur
//     celle du bas, et chaque trait part de sa broche.
// 2 · Un tap sur le TOTEHM déploie TOUTE la structure : la boîte grandit avec le papier (le papier reste dedans) et les
//     traits suivent, branchés, image par image. Ordinateur : la boîte et ses traits restent autour du TOTEHM ouvert
//     (22 px tout autour). Téléphone : le TOTEHM ouvert est celui d'avant (rien de plus à l'écran). Le repli rend tout.
// 3 · Vers le bas, les traits se TRANSFORMENT en les sept traits de l'anneau du profil (comme ← et →).
// 4 · (22/10) Jamais de zoom sur la boîte : sa vraie taille à chaque image, le puits à 3 px du papier, le papier arrive
//     dans la couleur de l'app — la fin du portail et l'app sont la même image.
// Tout est simulé (comptes, RPC) : aucune écriture en production. LANCER : node com_structure.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const browser=await launch();const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight'],f:'every_morning'},{t:'Read at dawn',t0:'Read at dawn',is:['focus','love']},{t:'Call mum',t0:'Call mum',is:['love']}];
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]};
const rpc={my_landing:{signed_in:true,pseudo:'wahigher'},my_trips:{signed_in:true,trips:[],reps:[],wisdom:[],visions:[]}};
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
/* Les broches et le départ de chaque trait, comparés aux arêtes de la boîte. */
const branche=pg=>pg.evaluate(()=>{const s=document.getElementById('lv-socket').getBoundingClientRect();
  const pins=[...document.querySelectorAll('#lv-ram rect.pin')].map(r=>{const b=r.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};});
  const dep=[...document.querySelectorAll('#lv-ram > g')].map(g=>{const d=g.querySelector('path').getAttribute('d')||'',m=[...d.matchAll(/M\s*([-\d.]+)\s+([-\d.]+)/g)];return m.map(x=>[+x[1],+x[2]]);});
  return {s:{t:s.top,b:s.bottom,l:s.left,r:s.right},pins,dep};});
try{
 for(const [nom,vp] of [['ordinateur',{width:1280,height:800}],['téléphone',{width:390,height:844}]]){
  const ordi=nom==='ordinateur';
  const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc,viewport:vp,hasTouch:!ordi});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1500);
  /* ── 1 · branchés ── */
  const b=await branche(pg);
  const haut=b.pins.filter(p=>Math.abs(p.y-b.s.t)<4), bas=b.pins.filter(p=>Math.abs(p.y-b.s.b)<4);
  ok(b.pins.length===14&&haut.length===7&&bas.length===7&&b.pins.every(p=>p.x>b.s.l+8&&p.x<b.s.r-8),nom+' · 14 broches sur la boîte : 7 en haut, 7 en bas, loin des coins');
  ok(b.dep.length===7&&b.dep.every(d=>d.length===2&&Math.abs(d[0][1]-b.s.t)<1.5&&Math.abs(d[1][1]-b.s.b)<1.5),nom+' · chaque trait part de SA broche, en haut et en bas');
  /* ── 2 · le déploiement, image par image ── */
  /* Mesuré à l'instant où la transformation écrit le trait (même image que la boîte) : un relevé de la boîte prend
     l'heure de l'image en cours, le tracé celle où il a été écrit — on les lit ensemble. */
  await pg.evaluate(()=>{ window.__suivi=[]; const s=document.getElementById('lv-socket'), svg=document.getElementById('lv-ram'), t0=performance.now();
    const ob=new MutationObserver(l=>{ const p=svg.querySelector('g path'); if(!p) return; const m=(p.getAttribute('d')||'').match(/M\s*([-\d.]+)\s+([-\d.]+)/);
      const r=s.getBoundingClientRect(); if(m) window.__suivi.push([performance.now()-t0,r.top,+m[2],r.width]); if(performance.now()-t0>1300) ob.disconnect(); });
    ob.observe(svg,{subtree:true,attributes:true,attributeFilter:['d']});
    /* 22/10 — la boîte à sa VRAIE taille, image par image (jamais `scale`) : son puits noir à 3 px du papier, relevé à
       l'instant où la boîte est écrite (lire avant l'écriture compterait l'image d'avant). */
    window.__puits=[]; const w=s.querySelector('.sk-well'), bg=document.getElementById('gl-bg');
    const ob2=new MutationObserver(()=>{ if(performance.now()-t0>1300) return ob2.disconnect(); const a=w.getBoundingClientRect(), c=bg.getBoundingClientRect();
      window.__puits.push({g:[c.left-a.left,a.right-c.right,c.top-a.top,a.bottom-c.bottom], tr:getComputedStyle(s).transform, pt:getComputedStyle(document.getElementById('lv-proc')).transform}); });
    ob2.observe(w,{attributes:true,attributeFilter:['style']}); });
  const w0=b.s.r-b.s.l;
  await pg.click('#lv-tap-open');await pg.waitForTimeout(1400);
  const sv=await pg.evaluate(()=>window.__suivi), vis=sv.filter(x=>x[1]>-20&&x[1]<vp.height);
  const ecart=Math.max(...vis.map(x=>Math.abs(x[2]-x[1]))), grandit=Math.max(...sv.map(x=>x[3]))/w0;
  ok(vis.length>10&&ecart<=2,nom+' · pendant le déploiement, les traits restent branchés sur la boîte : '+vis.length+' images, écart max '+ecart.toFixed(1)+' px');
  ok(grandit>3,nom+' · la boîte grandit AVEC le papier (× '+grandit.toFixed(1)+')');
  const pu=await pg.evaluate(()=>window.__puits), gs=pu.flatMap(x=>x.g);
  ok(pu.length>20&&pu.every(x=>(x.tr==='none'||x.tr==='matrix(1, 0, 0, 1, 0, 0)')&&x.pt==='none')&&Math.min(...gs)>=2.5&&Math.max(...gs)<=3.5,
     nom+' · 22/10 · la boîte n\'est JAMAIS agrandie par zoom (nette) : sa vraie taille à chaque image, le puits à 3 px du papier ('+pu.length+' images, '+Math.min(...gs).toFixed(1)+'…'+Math.max(...gs).toFixed(1)+' px)');
  const fin=await pg.evaluate(()=>getComputedStyle(document.querySelector('#gl-bg>rect')).fill);
  ok(fin==='rgb(43, 43, 87)',nom+' · 22/10 · le papier arrive dans la couleur de l\'app (#2b2b57) : le fondu de la fin ne mélange plus deux navys → '+fin);
  await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:6000}).catch(()=>{});await pg.waitForTimeout(400);
  const o=await pg.evaluate(()=>{const a=document.getElementById('app-sock').getBoundingClientRect(),s=document.getElementById('stage').getBoundingClientRect();
    return {vis:getComputedStyle(document.getElementById('app-proc')).visibility,ouvert:document.body.classList.contains('proc-ouvert'),
      m:[s.left-a.left,a.right-s.right,s.top-a.top,a.bottom-s.bottom].map(Math.round),pins:document.querySelectorAll('#app-ram rect.pin').length,
      tr:getComputedStyle(document.getElementById('app-sock')).transform, puits:getComputedStyle(document.getElementById('app-sock'),'::after').top,
      traits:document.querySelectorAll('#app-ram > g').length};});
  if(ordi) ok(o.ouvert&&o.vis==='visible'&&o.m.every(v=>Math.abs(v-22)<=1)&&o.pins===14&&o.traits===7&&o.tr==='none'&&Math.abs(parseFloat(o.puits)-19)<=1,'ordinateur · ouvert : la boîte (22 px autour du TOTEHM) et ses 7 traits branchés restent → '+JSON.stringify(o));
  else ok(!o.ouvert&&o.vis==='hidden','téléphone · ouvert : rien de plus que le TOTEHM d\'avant (la boîte et les traits sont sortis du champ)');
  /* le repli */
  await pg.evaluate(()=>document.getElementById('fold-x').click());
  await pg.waitForFunction(()=>document.body.classList.contains('gate')&&!document.body.classList.contains('folding'),null,{timeout:6000}).catch(()=>{});await pg.waitForTimeout(600);
  const r=await branche(pg), ret=await pg.evaluate(()=>({ouvert:document.body.classList.contains('proc-ouvert'),d:window.__totehm_deploiement()}));
  ok(Math.abs(r.s.t-b.s.t)<1&&r.pins.length===14&&r.dep.every(d=>Math.abs(d[0][1]-r.s.t)<1.5)&&!ret.ouvert&&ret.d.deploiements===1&&ret.d.replis===1,
     nom+' · le repli rend la boîte et ses traits à leur place → '+JSON.stringify(ret.d));
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
