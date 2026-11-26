// COM — 19/11/2026. Wah : « enlève l'image EXPENSIVE ADVISORY TALK IS CHEAP ; ce qui serait sympa, c'est que la connexion
// email s'intègre dans le tronc qui s'ouvre, comme ce que l'on a fait pour l'ancienne image ».
// 1 · Ordinateur, sans compte : au repos le tronc est FERMÉ (droit). La porte s'ouvre → elle se pose entre le papier et la
//     manette, et le tronc S'ÉCARTE autour d'elle (aucun trait à moins de 4 px), sans faire repousser la couronne.
// 2 · La porte change de question (le code) : le tronc s'ajuste. Échap : la porte s'efface, le tronc se referme.
// 3 · Mouvement réduit : le tronc s'ouvre d'un coup, sans transition.
// 4 · Téléphone (pas d'arbre) : la porte reste sous le papier, au-dessus du clavier ; plus d'image.
// Tout est simulé : aucune écriture en production. LANCER : node com_porte_tronc.mjs
import {launch,page,ok} from './harness.mjs';
const browser=await launch();const origin='https://www.totehm.com';
const erreurs=log=>log.errors.filter(e=>!/404|Failed to load resource/i.test(e));
/* La porte, et chaque point des traits (tous les 2 px) : combien entrent dans la porte (marge 4 px), en reste-t-il de
   chaque côté à sa hauteur, et l'écart de chaque piste du tronc sous le papier (droite = fermé). */
const etat=pg=>pg.evaluate(()=>{
  const q=s=>document.querySelector(s), d=q('#gate-door').getBoundingClientRect(), R=window.__totehm_lv().ramifications;
  const pts=[...document.querySelectorAll('#lv-ram path:not(.puls)')].flatMap(e=>{const L=e.getTotalLength(),n=Math.ceil(L/2),o=[];
    for(let i=0;i<=n;i++){const p=e.getPointAtLength(L*i/n);o.push([p.x,p.y]);}return o;});
  const P=q('#gate-asteroid').getBoundingClientRect(),jb=q('#lvj-box').getBoundingClientRect(),Jy=jb.top+jb.height/2;
  const sub=e=>(e.getAttribute('d')||'').split('M').filter(Boolean).map(s=>s.split('L').map(p=>p.trim().split(/\s+/).map(Number)));
  const xA=(l,y)=>{for(let k=1;k<l.length;k++){const a=l[k-1],b=l[k];if(a[1]<=y&&b[1]>=y&&b[1]>a[1])return a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]);}return null;};
  const bande=[];for(let y=P.bottom+30;y<=Jy-80;y+=6)bande.push(y);
  const ecart=Math.max(...[...document.querySelectorAll('#lv-ram > g')].map(g=>{const l=sub(g.querySelector('path'))[1]||[];
    const x=bande.map(y=>xA(l,y)).filter(v=>v!==null);return x.length?Math.max(...x)-Math.min(...x):99;}));
  const cs=getComputedStyle(q('#gate-door'));
  return {porte:{t:Math.round(d.top),b:Math.round(d.bottom),h:Math.round(d.height),l:Math.round(d.left),r:Math.round(d.right),vis:cs.visibility,op:+cs.opacity,tronc:q('#gate-door').classList.contains('is-tronc')},
    papierBas:Math.round(P.bottom),manche:Math.round(jb.top),
    dedans:pts.filter(p=>p[0]>d.left-4&&p[0]<d.right+4&&p[1]>d.top-4&&p[1]<d.bottom+4).length,
    gauche:pts.some(p=>p[1]>d.top&&p[1]<d.bottom&&p[0]<d.left-4),droite:pts.some(p=>p[1]>d.top&&p[1]<d.bottom&&p[0]>d.right+4),
    ecart:Math.round(ecart*10)/10,respirations:R.respirations,morphs:R.morphs,rameaux:R.rameaux,pastilles:document.querySelectorAll('#lv-ram circle').length,
    pousse:q('#lv-ram').classList.contains('is-pousse'),ouverte:document.body.classList.contains('is-door'),image:!!q('#lv-parental'),
    focus:document.activeElement&&document.activeElement.id};});
try{
 /* ── 1–2 · ordinateur ── */
 for(const vp of [{width:1440,height:900},{width:1280,height:800}]){
  const{pg,log}=await page(browser,{dir:'com',origin,session:false,viewport:vp,rpc:{my_landing:{signed_in:false}}});
  /* 26/11 : l'arbre part ÉTEINT (Wah) — ce test MESURE son dessin, il l'allume donc. */
  await pg.addInitScript(()=>{ try{ localStorage.setItem('totehm_tree','1'); }catch(_){} });
  await pg.goto(origin+'/totehm');
  await pg.waitForFunction(()=>window.__totehm_lv?.().vue==='c'&&!document.body.classList.contains('ses-attente'));
  await pg.waitForTimeout(2500);
  const nom=vp.width+'×'+vp.height;
  const r=await etat(pg);
  ok(!r.image&&!r.ouverte&&r.ecart<=5,nom+' · au repos : plus d\'image, le tronc est FERMÉ (chaque piste droite à '+r.ecart+' px près)');
  await pg.click('#lv-tap-open');
  await pg.waitForTimeout(160);
  const mi=await etat(pg);
  ok(mi.ouverte&&mi.porte.op<.35,nom+' · le tronc s\'écarte D\'ABORD : la porte n\'apparaît qu\'ensuite (opacité '+mi.porte.op+')');
  await pg.waitForTimeout(1100);
  const o=await etat(pg);
  ok(o.ouverte&&o.porte.vis==='visible'&&o.porte.op===1&&o.porte.tronc&&o.focus==='mw-email',nom+' · la porte est ouverte, le champ email a le curseur');
  ok(o.porte.t>o.papierBas+30&&o.porte.b<o.manche-30,nom+' · la porte est DANS le tronc, entre le papier et la manette → '+JSON.stringify({papier:o.papierBas,porte:[o.porte.t,o.porte.b],manche:o.manche}));
  ok(o.dedans===0&&o.gauche&&o.droite,nom+' · le tronc s\'ouvre AUTOUR d\'elle : aucun trait à moins de 4 px, des traits de chaque côté → '+JSON.stringify({dedans:o.dedans,g:o.gauche,d:o.droite}));
  ok(o.respirations===1&&o.morphs===r.morphs&&o.rameaux===r.rameaux&&o.pastilles===r.pastilles&&!o.pousse,
     nom+' · seul le tronc bouge : la couronne, les racines et les pastilles restent posées (rien ne repousse) → '+JSON.stringify({resp:o.respirations,rameaux:o.rameaux,pastilles:o.pastilles}));
  /* la porte passe au code : elle grandit, le tronc s'ajuste */
  await pg.evaluate(()=>{ document.getElementById('mw-code').classList.remove('hide'); document.getElementById('mw-note').textContent='code sent'; });
  await pg.waitForTimeout(1000);
  const c=await etat(pg);
  ok(c.porte.h>o.porte.h&&c.dedans===0&&c.gauche&&c.droite&&c.respirations>o.respirations,nom+' · la question suivante (le code) : la porte grandit, le tronc s\'ajuste autour d\'elle → '+JSON.stringify({h:[o.porte.h,c.porte.h],dedans:c.dedans}));
  await pg.evaluate(()=>{ document.getElementById('mw-code').classList.add('hide'); document.getElementById('mw-note').textContent=''; });
  await pg.waitForTimeout(800);
  await pg.keyboard.press('Escape');await pg.waitForTimeout(1100);
  const f=await etat(pg);
  ok(!f.ouverte&&f.porte.vis==='hidden'&&f.ecart<=5&&f.rameaux===r.rameaux&&!f.pousse,nom+' · Échap : la porte s\'efface, le tronc se REFERME (droit à '+f.ecart+' px près)');
  ok(!erreurs(log).length,nom+' · aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();
 }
 /* ── 2 bis · 19/11 (Wah : « quand la page d'inscription apparaît, le scroll Discover devrait continuer de fonctionner ») ── */
 {const{pg,log}=await page(browser,{dir:'com',origin,session:false,viewport:{width:1440,height:900},rpc:{my_landing:{signed_in:false}}});
  /* 26/11 : l'arbre part ÉTEINT (Wah) — ce test MESURE son dessin, il l'allume donc. */
  await pg.addInitScript(()=>{ try{ localStorage.setItem('totehm_tree','1'); }catch(_){} });
  await pg.goto(origin+'/totehm');
  await pg.waitForFunction(()=>window.__totehm_lv?.().vue==='c'&&!document.body.classList.contains('ses-attente'));
  await pg.waitForTimeout(1500);
  await pg.click('#lvj-box');await pg.waitForTimeout(900);
  const avant=await pg.evaluate(()=>({porte:document.body.classList.contains('is-door'),disc:window.__totehm_discover().ouvert}));
  await pg.mouse.move(300,700);
  for(let k=0;k<12;k++){ await pg.mouse.wheel(0,60); await pg.waitForTimeout(40); }
  await pg.waitForTimeout(900);
  const apres=await pg.evaluate(()=>({porte:document.body.classList.contains('is-door'),disc:window.__totehm_discover().ouvert,i:window.__totehm_discover().i,vue:window.__totehm_lv().vue}));
  ok(avant.porte&&!avant.disc&&apres.disc&&!apres.porte&&apres.i===0&&apres.vue==='c','ordinateur · le joystick ouvre la porte, puis la MOLETTE ouvre le Discover (porte refermée, premier écran) → '+JSON.stringify({avant,apres}));
  await pg.keyboard.press('Escape');await pg.waitForTimeout(600);
  ok(await pg.evaluate(()=>!window.__totehm_discover().ouvert&&!document.body.classList.contains('is-door')),'Échap referme le Discover ; l\'accueil est là, porte fermée');
  ok(!erreurs(log).length,'molette · aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();}
 {const{pg,log,ctx}=await page(browser,{dir:'com',origin,session:false,viewport:{width:390,height:844},hasTouch:true,rpc:{my_landing:{signed_in:false}}});
  /* 26/11 : l'arbre part ÉTEINT (Wah) — ce test MESURE son dessin, il l'allume donc. */
  await pg.addInitScript(()=>{ try{ localStorage.setItem('totehm_tree','1'); }catch(_){} });
  await pg.goto(origin+'/totehm');
  await pg.waitForFunction(()=>window.__totehm_lv?.().vue==='c'&&!document.body.classList.contains('ses-attente'));
  await pg.waitForTimeout(1500);
  await pg.click('#lv-tap-open');await pg.waitForTimeout(900);
  const c=ctx||pg.context(), cdp=await c.newCDPSession(pg);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:640}]});
  for(let i=1;i<=5;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y:640-220*i/5}]}); await pg.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pg.waitForTimeout(900);
  const r=await pg.evaluate(()=>({porte:document.body.classList.contains('is-door'),disc:window.__totehm_discover().ouvert,i:window.__totehm_discover().i}));
  ok(r.disc&&!r.porte&&r.i===0,'téléphone · la porte ouverte, un glissé du doigt ouvre le Discover (porte refermée) → '+JSON.stringify(r));
  ok(!erreurs(log).length,'glissé · aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();}
 /* ── 3 · mouvement réduit : pas de transition, le tronc s'ouvre d'un coup ── */
 {const{pg,log}=await page(browser,{dir:'com',origin,session:false,viewport:{width:1440,height:900},rpc:{my_landing:{signed_in:false}}});
  /* 26/11 : l'arbre part ÉTEINT (Wah) — ce test MESURE son dessin, il l'allume donc. */
  await pg.addInitScript(()=>{ try{ localStorage.setItem('totehm_tree','1'); }catch(_){} });
  await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/totehm');
  await pg.waitForFunction(()=>window.__totehm_lv?.().vue==='c'&&!document.body.classList.contains('ses-attente'));
  await pg.waitForTimeout(1200);
  await pg.click('#lv-tap-open');await pg.waitForTimeout(150);
  const o=await etat(pg);
  ok(o.respirations===0&&o.dedans===0&&o.gauche&&o.droite,'mouvement réduit : le tronc est ouvert autour de la porte dès le geste, sans transition → '+JSON.stringify({resp:o.respirations,dedans:o.dedans}));
  ok(!erreurs(log).length,'mouvement réduit · aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();}
 /* ── 4 · téléphone : pas d'arbre, la porte reste sous le papier (au-dessus du clavier) ── */
 for(const vp of [{width:390,height:844},{width:375,height:667}]){
  const{pg,log}=await page(browser,{dir:'com',origin,session:false,viewport:vp,hasTouch:true,rpc:{my_landing:{signed_in:false}}});
  /* 26/11 : l'arbre part ÉTEINT (Wah) — ce test MESURE son dessin, il l'allume donc. */
  await pg.addInitScript(()=>{ try{ localStorage.setItem('totehm_tree','1'); }catch(_){} });
  await pg.goto(origin+'/totehm');
  await pg.waitForFunction(()=>window.__totehm_lv?.().vue==='c'&&!document.body.classList.contains('ses-attente'));
  await pg.waitForTimeout(1500);
  await pg.click('#lv-tap-open');await pg.waitForTimeout(1200);
  const o=await etat(pg);
  ok(!o.image&&o.ouverte&&!o.porte.tronc&&o.porte.t<o.papierBas+60&&o.porte.b<vp.height*.6&&o.focus==='mw-email',
     vp.width+'×'+vp.height+' · téléphone : plus d\'image, la porte reste sous le papier, au-dessus du clavier → '+JSON.stringify({papier:o.papierBas,porte:[o.porte.t,o.porte.b]}));
  ok(!erreurs(log).length,'téléphone · aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();
 }
}finally{ await browser.close(); }
