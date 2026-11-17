// COM · 16/11/2026 — l'accueil est MINIMAL et il vend QUAND ON LE DEMANDE.
// Wah : « sur la vue Totehm, rajouter Get Higher with your TOTEHM avec TOTEHM au format logo rotatif » · « Your TOTEHM in
// ChatGPT doit devenir le titre et Higher my ChatGPT plus en mode bouton » · « simple, minimaliste mais super bien expliqué
// et vendeur quand l'utilisateur le souhaite ». Tout est simulé : aucune écriture. LANCER : node com_accueil_discover.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'.';
const browser=await launch();const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:[{t:'Run the hill',t0:'Run the hill',is:['fight']}],vis:'private'}]};
const LAND={signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false,open:false},higher:{active:false},thp:false};
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const D=pg=>pg.evaluate(()=>window.__totehm_discover());
const vers=(pg,v)=>pg.waitForFunction(v=>{const d=window.__totehm_lv();return d.vue===v&&!d.bouge;},v,{timeout:6000}).then(()=>true).catch(()=>false);
try{
 /* ── 1 · SANS COMPTE : un titre, deux boutons, rien d'autre ── */
 {const{pg,ctx,log}=await page(browser,{dir:'com',origin,tables:{profiles:[]},rpc:{my_landing:{signed_in:false}},viewport:{width:390,height:844},hasTouch:true,session:false});
  await pg.goto(origin+'/totehm');await pg.waitForFunction(()=>typeof window.__totehm_lv==='function');await pg.waitForTimeout(2200);
  const c=await pg.evaluate(()=>{const q=s=>document.querySelector(s),t=q('#lv-title'),vu=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
    return {titre:t.textContent.replace(/\s+/g,' ').trim(),piece:t.querySelectorAll('.tw').length,vu:vu(t),
      boutons:[...document.querySelectorAll('#lv-pitch button')].filter(vu).map(b=>b.textContent.trim()),
      anciens:document.querySelectorAll('.lvp-headline,.lvp-science,#lv-explore').length,
      corail:[...document.querySelectorAll('#lv-c-acts *')].filter(e=>vu(e)&&!e.closest('.tw')&&getComputedStyle(e).color==='rgb(251, 213, 202)').length};});
  ok(c.vu&&/^THE HIGHER WAY TO MAKE IT HAPPEN$/.test(c.titre),'le titre de la vue centrale : « THE HIGHER WAY TO MAKE IT HAPPEN » → '+JSON.stringify(c));
  ok(c.boutons.join('|')==='Open my TOTEHM|Discover'&&c.anciens===0,'sans compte : la porte et [Discover], plus de pitch à lire → '+c.boutons.join(' | '));
  ok(c.corail===0,'aucun texte corail dans les actions (le corail est réservé au nom et à l\'art)');
  /* ── le Discover : en couche, une idée par écran, la porte sous chacun ── */
  await pg.click('#lv-discover');await pg.waitForTimeout(700);
  let d=await D(pg);
  const e0=await pg.evaluate(()=>{const h=document.getElementById('lvd'),r=h.getBoundingClientRect();return {plein:r.width===innerWidth&&r.height===innerHeight,fond:getComputedStyle(h).backgroundColor,
    on:h.querySelectorAll('.dc-s.is-on').length,titre:h.querySelector('.dc-s.is-on .dc-h').textContent.replace(/\s+/g,' ').trim(),cta:document.getElementById('lvd-cta').textContent,dc:document.body.classList.contains('is-dc')};});
  ok(d.ouvert&&d.n===10&&d.i===0&&e0.plein&&e0.fond==='rgb(0, 0, 0)'&&e0.on===1&&e0.dc,'[Discover] ouvre 10 écrans noirs plein écran, UN visible → '+JSON.stringify(e0));
  ok(/^Get Higher with your TOTEHM\.$/.test(e0.titre)&&e0.cta==='Open my TOTEHM','le premier écran reprend le titre ; la porte est dessous');
  await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(800);
  ok((await D(pg)).i===1&&(await pg.evaluate(()=>window.__totehm_lv().vue))==='c','↓ avance le Discover — l\'accueil, dessous, ne bouge pas');
  const cdp=await ctx.newCDPSession(pg);
  const glisse=async(y0,y1)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:y0}]});
    for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y:y0+(y1-y0)*i/5}]});await pg.waitForTimeout(16);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pg.waitForTimeout(850);};
  await glisse(600,380);
  ok((await D(pg)).i===2&&(await pg.evaluate(()=>window.__totehm_lv().vue))==='c','un glissé vers le haut : l\'écran suivant (le doigt appartient au Discover)');
  /* la porte est sous CHAQUE écran, grise, et l'ordre de la vente tient */
  const tour=[];
  for(let k=0;k<10;k++){
    tour.push(await pg.evaluate(k=>{const s=document.querySelectorAll('#lvd .dc-s')[k],b=document.getElementById('lvd-cta'),r=b.getBoundingClientRect();
      return {h:s.querySelector('.dc-h').textContent.replace(/\s+/g,' ').trim(),bouton:r.width>40&&r.bottom<=innerHeight&&getComputedStyle(b).backgroundColor};},k)); }
  ok(tour.every(x=>x.bouton==='rgb(42, 42, 42)'),'la porte reste sous les 10 écrans, en bouton gris normal');
  ok(tour[4].h==='Your TOTEHM in ChatGPT.'&&tour[5].h==='TotehmBot keeps the rhythm.'&&tour[6].h==='Get paid for how you build.'&&tour[7].h==='Follow who inspires you.'&&tour[8].h==='Meet on a spot.',
     'l\'ordre de la vente : Higher GPT, TotehmBot, être payé, suivre, le Club → '+tour.map(x=>x.h).join(' · '));
  const coul=await pg.evaluate(()=>{const vus=new Set();for(const e of document.querySelectorAll('#lvd *')){ if(e.closest('.tw')) continue; const c=getComputedStyle(e);
      for(const v of [c.color,c.backgroundColor]){ const m=v.match(/\d+(\.\d+)?/g); if(!m||(m[3]!==undefined&&+m[3]===0)) continue; const [r,g,b]=m.map(Number); if(Math.max(r,g,b)-Math.min(r,g,b)>24) vus.add(v); } } return [...vus];});
  ok(coul.length===0,'60 / 30 / 10 : hors de la pièce (l\'art), aucune couleur — noir, blanc, gris → '+JSON.stringify(coul));
  await pg.screenshot({path:OUT+'/accueil_discover.png'});
  await pg.keyboard.press('Escape');await pg.waitForTimeout(600);
  d=await D(pg);
  ok(!d.ouvert&&await pg.evaluate(()=>document.getElementById('lvd').hidden&&!document.body.classList.contains('is-dc')),'ÉCHAP referme, l\'accueil reprend ses gestes');
  await pg.keyboard.press('ArrowUp');
  ok(await vers(pg,'b'),'… et ↑ mène de nouveau à Higher my ChatGPT');
  await pg.keyboard.press('ArrowDown');await vers(pg,'c');
  await pg.click('#lv-discover');await pg.waitForTimeout(600);await pg.click('#lvd-cta');await pg.waitForTimeout(900);
  ok(await pg.evaluate(()=>document.body.classList.contains('is-door')&&!window.__totehm_discover().ouvert),'sans compte, la porte du Discover ouvre la porte d\'inscription');
  ok(!erreurs(log).length&&!log.rpc.some(x=>/_set|_save|_create|_delete/.test(x.name)),'visiteur : aucune erreur, aucune écriture '+erreurs(log).join(' | '));
  await ctx.close();}

 /* ── 2 · MEMBRE : le titre, le geste, « Discover » dans la légende ; « précédent » referme ── */
 {const{pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND},viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1500);
  const m=await pg.evaluate(()=>{const vu=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
    return {titre:vu(document.getElementById('lv-title')),pitch:vu(document.getElementById('lv-pitch')),legende:document.getElementById('lv-tap').textContent.replace(/\s+/g,' ').trim()};});
  ok(m.titre&&!m.pitch&&/ · Discover$/.test(m.legende),'membre : le titre, aucun bouton de vente, « Discover » au bout de la légende → '+m.legende);
  await pg.click('#lv-tap-disc');await pg.waitForTimeout(700);
  for(let k=0;k<6;k++){await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(750);}
  const a=await pg.evaluate(()=>({i:window.__totehm_discover().i,cta:document.getElementById('lvd-cta').textContent}));
  ok(a.i===6&&a.cta==='Monetize my TOTEHM','sur « Get paid for how you build », la porte d\'un membre devient « Monetize my TOTEHM »');
  await pg.mouse.move(640,400);await pg.mouse.wheel(0,120);await pg.waitForTimeout(900);
  ok((await D(pg)).i===7&&(await pg.evaluate(()=>document.getElementById('lvd-cta').textContent))==='Open my TOTEHM','la molette : un geste = un écran, et la porte redevient « Open my TOTEHM »');
  await pg.goBack().catch(()=>{});await pg.waitForTimeout(700);
  ok(!(await D(pg)).ouvert&&pg.url()===origin+'/totehm','« précédent » referme le Discover et reste sur le site');
  ok(!erreurs(log).length,'membre : aucune erreur '+erreurs(log).join(' | '));
  await ctx.close();}

 /* ── 3 · LA VUE CHATGPT (en haut) : le titre d'abord, puis le bouton ── */
 {const{pg,ctx,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND},viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.keyboard.press('ArrowUp');await vers(pg,'b');await pg.waitForTimeout(900);
  const g=await pg.evaluate(()=>{const t=document.getElementById('chatgpt-title').getBoundingClientRect(),b=document.getElementById('chatgpt-connect'),r=b.getBoundingClientRect(),c=getComputedStyle(b);
    return {ordre:t.bottom<=r.top,piece:document.querySelectorAll('#chatgpt-title .tw').length,fond:c.backgroundColor,rayon:c.borderTopLeftRadius,href:b.getAttribute('href'),texte:b.textContent.trim(),
      taille:parseFloat(getComputedStyle(document.getElementById('chatgpt-title')).fontSize)};});
  ok(g.ordre&&g.piece===1&&g.taille>=14,'« YOUR TOTEHM IN CHATGPT » est le TITRE, au-dessus, avec la pièce ('+g.taille+' px)');
  ok(g.fond==='rgb(42, 42, 49)'&&g.rayon==='10px'&&g.href==='/chatgpt'&&g.texte==='my ChatGPT','« Higher my ChatGPT » est un BOUTON (gris, 10 px de rayon) vers /chatgpt → '+JSON.stringify(g));
  await pg.screenshot({path:OUT+'/accueil_chatgpt.png'});
  ok(!erreurs(log).length,'ChatGPT : aucune erreur '+erreurs(log).join(' | '));
  await ctx.close();}
}finally{await browser.close();}
