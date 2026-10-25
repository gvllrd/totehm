// COM — la structure de la vue centrale (Wah, 22/10/2026 ; refaite le 25/10).
// 1 · (25/10) Plus de boîte noire : le TOTEHM est le BOÎTIER du processeur. Ses sept traits sont branchés sur SES arêtes,
//     une broche par trait en haut et en bas ; trois d'entre elles entrent dans ses perforations (25 %, 50 %, 75 %).
// 2 · (25/10) Un tap sur le TOTEHM : ses traits cessent leur activité et sont ASPIRÉS dans le papier pendant qu'il se
//     déploie (« on cesse l'activité du Totehm pour le configurer »). Ouvert : aucune boîte, aucun trait autour.
//     Le repli : le portail revient en fondu, le papier rentre, l'atterrissage revient à la fin — et les traits ressortent.
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
/* Les broches et le départ de chaque trait, comparés aux arêtes du PAPIER (le boîtier). */
const branche=pg=>pg.evaluate(()=>{const s=document.getElementById('gate-asteroid').getBoundingClientRect(),k=document.getElementById('lv-socket');
  const pins=[...document.querySelectorAll('#lv-ram rect.pin')].map(r=>{const b=r.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2,t:b.top,b:b.bottom};});
  const dep=[...document.querySelectorAll('#lv-ram > g')].map(g=>{const d=g.querySelector('path').getAttribute('d')||'',m=[...d.matchAll(/M\s*([-\d.]+)\s+([-\d.]+)/g)];return m.map(x=>[+x[1],+x[2]]);});
  const cs=getComputedStyle(k);
  return {s:{t:s.top,b:s.bottom,l:s.left,r:s.right,w:s.width,cx:s.left+s.width/2},pins,dep,socle:{bg:cs.backgroundColor,ombre:cs.boxShadow,puits:!!k.querySelector('.sk-well')}};});
/* L'état du réseau : aspiré ou non, son échelle, son opacité, ses impulsions. */
const reseau=pg=>pg.evaluate(()=>{const r=document.getElementById('lv-ram'),cs=getComputedStyle(r),m=cs.transform.match(/matrix\(([-\d.e]+)/),p=r.querySelector('.puls');
  return {aspire:document.body.classList.contains('is-aspire'),echelle:m?+m[1]:1,op:+cs.opacity,puls:p?getComputedStyle(p).animationName:'',d:window.__totehm_deploiement()};});
try{
 for(const [nom,vp] of [['ordinateur',{width:1280,height:800}],['téléphone',{width:390,height:844}]]){
  const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc,viewport:vp,hasTouch:nom==='téléphone'});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1500);
  /* ── 1 · le TOTEHM est le boîtier ── */
  const b=await branche(pg);
  const haut=b.pins.filter(p=>Math.abs(p.b-b.s.t)<=1.5), bas=b.pins.filter(p=>Math.abs(p.t-b.s.b)<=1.5);
  ok(b.socle.bg==='rgba(0, 0, 0, 0)'&&b.socle.ombre==='none'&&!b.socle.puits,nom+' · 25/10 · plus de boîte noire : le socle ne se voit plus (ni verre, ni puits)');
  ok(b.pins.length===14&&haut.length===7&&bas.length===7,nom+' · 14 broches posées SUR le TOTEHM : 7 contre son arête du haut, 7 contre celle du bas');
  const trous=[.25,.5,.75].map(f=>b.s.l+b.s.w*f), dans=haut.filter(p=>trous.some(x=>Math.abs(p.x-x)<=2.5)).length;
  ok(dans===3,nom+' · trois broches entrent dans ses perforations (25 %, 50 %, 75 %) : '+dans);
  ok(b.dep.length===7&&b.dep.every(d=>d.length===2&&Math.abs(d[0][1]-b.s.t)<5&&Math.abs(d[1][1]-b.s.b)<5),nom+' · chaque trait part de SA broche, en haut et en bas');
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
  const o=await pg.evaluate(()=>({proc:!!document.getElementById('app-proc'),traits:document.querySelectorAll('svg:not(#lv-ram) rect.pin').length,r:document.body.classList.contains('is-aspire')}));
  ok(!o.proc&&o.traits===0&&o.r,nom+' · ouvert : le TOTEHM seul — ni boîte ni traits autour, le réseau reste aspiré');
  /* ── le repli, deux fois : le portail revient en fondu, le papier rentre, l'atterrissage revient, les traits ressortent ── */
  for(const tour of [1,2]){
   if(tour===2){ await pg.click('#lv-tap-open');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:6000}).catch(()=>{});await pg.waitForTimeout(400); }
   await pg.evaluate(()=>{ window.__fondu=[]; const gt=document.getElementById('gate'), bg=document.getElementById('gl-bg'), lv=document.getElementById('lv'), r=document.getElementById('lv-ram'), t0=performance.now();
     const f=()=>{ const t=performance.now()-t0; if(t>1500) return;
       window.__fondu.push({t, o:+getComputedStyle(gt).opacity, w:bg.getBoundingClientRect().width, lv:+getComputedStyle(lv).opacity,
         asp:document.body.classList.contains('is-aspire'), folding:document.body.classList.contains('folding')}); requestAnimationFrame(f); }; requestAnimationFrame(f); });
   await pg.evaluate(()=>document.getElementById('fold-x').click());
   await pg.waitForFunction(()=>document.body.classList.contains('gate')&&!document.body.classList.contains('folding'),null,{timeout:6000}).catch(()=>{});
   const lvFin=await pg.evaluate(()=>+getComputedStyle(document.getElementById('lv')).opacity);await pg.waitForTimeout(900);
   const fo=await pg.evaluate(()=>window.__fondu), w1=fo[0]&&fo[0].w, avant=fo.filter(x=>x.o<0.9);
   ok(fo.length>10&&fo[0].o<0.5&&avant.length>=3&&avant.every(x=>Math.abs(x.w-w1)<0.5)&&fo[fo.length-1].o===1&&fo[fo.length-1].w<w1/3,
      nom+' · repli '+tour+' : le portail revient d\'abord en FONDU sur le TOTEHM ouvert ('+avant.length+' images), puis le papier rentre');
   ok(fo.filter(x=>x.folding).every(x=>x.lv===0&&x.asp)&&lvFin<1,nom+' · repli '+tour+' : pendant le repli, les traits restent aspirés et l\'atterrissage attend le papier, puis revient en fondu');
   const r=await branche(pg), rs=await reseau(pg);
   ok(Math.abs(r.s.t-b.s.t)<1&&r.pins.length===14&&!rs.aspire&&rs.echelle===1&&rs.op===1&&rs.puls==='ram-puls'&&rs.d.deploiements===tour,
      nom+' · repli '+tour+' : le papier posé, ses traits RESSORTENT et revivent → '+JSON.stringify(rs));
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
