// COM · 07/10/2026 — la vue du HAUT de la croix : Get Higher.
// Au centre, pas de bouche. ↑ (manette, flèche, trackpad, doigt) : le papier
// monte en rapetissant se poser sur le bout de la langue, PENDANT que la bouche
// s'ouvre et que la langue se tire ; [Higher] glisse sous la langue et « Get »
// (Quantico corail) apparaît ; sans THP, l'explication du TotehmPaper.
// [Get Higher] : le papier est avalé, elle jouit (la bouche seule), puis
// figher.club/get_higher par le pont SSO. ↓ : tout revient, au pixel.
// Comptes, réseau et RPC sont simulés. LANCER : node com_mouth.mjs /tmp
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.com';
const tables={profiles:[{pseudo:'wahigher'}]};
const CODE='a'.repeat(64);
const functions={'sso-mint':{code:CODE}};
const LAND=(thp=false)=>({signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false},higher:{active:false,price_cents:700,currency:'eur'},thp,subscriptions:0,subscribers:0});
const club=(bloque=false)=>url=>url.host==='www.higher.boutique'
  ?(bloque?{status:204,body:''}:{status:200,contentType:'text/html',body:'<!doctype html><title>club</title>'}):null;
const browser=await launch();
const R=(pg,sel)=>pg.$eval(sel,e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height].map(v=>+v.toFixed(2));});
const centre=async(pg,sel='#gate-asteroid')=>{const r=await R(pg,sel);return[r[0]+r[2]/2,r[1]+r[3]/2];};
const lsd=pg=>pg.evaluate(()=>({...window.__totehm_lsd}));
const lv=pg=>pg.evaluate(()=>window.__totehm_lv());
const tf=pg=>pg.$eval('#gate-asteroid',e=>e.style.transform);
const langueT=pg=>pg.$eval('#m-tongue',e=>+e.getAttribute('transform').match(/,(-?[\d.]+)/)[1]);
// le point de pose sur la langue, en pixels d'écran (viewBox 30 310 1020 1260, pose 540·1150)
const pose=async pg=>{const r=await R(pg,'#gate-mouth');const k=r[2]/1020;return[r[0]+(540-30)*k,r[1]+(1150-310)*k];};
try{
 // ── MEMBRE, téléphone ─────────────────────────────────────────────
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,functions,rpc:{my_landing:LAND()},network:club(),viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');
  const d0=await pg.$eval('#m-lips',e=>e.getAttribute('d')),t0=await pg.$eval('#m-tongue',e=>e.getAttribute('transform'));
  await pg.waitForSelector('body.member');await pg.waitForTimeout(1800);
  ok(t0==='translate(0,-960)'&&await pg.$eval('#gate-mouth',e=>getComputedStyle(e).visibility)==='hidden','au centre : pas de bouche (le balisage : fermée, langue rentrée)');
  ok((await lsd(pg)).accueil===0&&await pg.$eval('#m-lips',e=>e.getAttribute('d'))===d0,'elle ne tire plus la langue à l\'arrivée : elle n\'existe que là-haut');
  const chez=await R(pg,'#gate-asteroid');
  // ↑ : le papier monte, la bouche s'ouvre et la langue se tire, EN MÊME TEMPS
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(380);
  const mi=await pg.evaluate(()=>({b:window.__totehm_lsd.bouche,t:+document.getElementById('m-tongue').getAttribute('transform').match(/,(-?[\d.]+)/)[1],
    tf:document.getElementById('gate-asteroid').style.transform,vis:getComputedStyle(document.getElementById('gate-mouth')).visibility}));
  ok(mi.b&&mi.t>-960&&/translate3d/.test(mi.tf)&&mi.vis==='visible','pendant le voyage : la bouche s\'ouvre, la langue se tire, le papier monte (ensemble)');
  await pg.waitForTimeout(900);
  const L=await pose(pg),p=await R(pg,'#gate-asteroid');
  ok(Math.abs(p[0]+p[2]/2-L[0])<3&&Math.abs(p[1]+p[3]/2-L[1])<3&&p[2]<chez[2]*.5,'posé sur le bout de la langue, en buvard ('+Math.round(p[2])+' px pour '+chez[2]+')');
  ok(await langueT(pg)>-40&&(await lv(pg)).vue==='h','la langue est tirée ; la vue est Get Higher');
  const s=await pg.evaluate(()=>{const g=document.querySelector('#lv-slogan .lvs-get'),c=getComputedStyle(g);
    return {cls:[...document.getElementById('lv-slogan').classList].filter(k=>/^is-.$/.test(k)).join(' '),op:c.opacity,ff:c.fontFamily,col:c.color,use:document.querySelector('#lv-slogan use').getAttribute('href'),
      y:document.getElementById('lv-slogan').getBoundingClientRect().top};});
  ok(s.cls==='is-h'&&s.op==='1'&&/Quantico/.test(s.ff)&&s.col==='rgb(251, 213, 202)'&&s.use==='#higher-badge','[Higher] a glissé : « Get » en Quantico corail, Higher = le badge SVG');
  ok(s.y>L[1]&&/distills selected mental-performance techniques/.test(await pg.textContent('#lv-thp-say'))&&await pg.isVisible('#lv-thp-say'),'sous la langue : Get [Higher], puis le TotehmPaper expliqué (pas de THP)');
  ok((await pg.textContent('#ljoy-say'))==='Get Higher'&&await pg.$eval('#lcur-h',e=>e.classList.contains('mort'))&&!await pg.$eval('#lcur-b',e=>e.classList.contains('mort')),'la manette : « Get Higher », seul le bas ramène');
  await pg.screenshot({path:OUT+'/com_mouth_open.png'});
  // ↓ : tout revient, au pixel
  await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(1200);
  ok(await tf(pg)===''&&JSON.stringify(await R(pg,'#gate-asteroid'))===JSON.stringify(chez)&&(await lv(pg)).vue==='c','↓ : le papier est chez lui, exactement à sa place');
  ok(await pg.$eval('#m-lips',e=>e.getAttribute('d'))===d0&&await pg.$eval('#m-tongue',e=>e.getAttribute('transform'))===t0&&await pg.$eval('#gate-mouth',e=>getComputedStyle(e).visibility)==='hidden','la bouche est refermée EXACTEMENT comme le balisage, puis se retire');
  ok(await pg.$eval('#lv-slogan',e=>[...e.classList].filter(k=>/^is-.$/.test(k)).join(' '))==='is-c'&&await pg.$eval('#lv-slogan .lvs-strat',e=>getComputedStyle(e).opacity)==='1','au centre : [Higher] Strategy');
  // ↑ puis [Get Higher] : avalé, elle jouit, la langue rentrée, puis le Club par le pont
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(1300);
  await pg.click('#lv-slogan');
  await pg.waitForFunction(()=>window.__totehm_lsd.extase,null,{timeout:3000}).catch(()=>{});
  {const ech=[];for(let i=0;i<14;i++){await pg.waitForTimeout(200);ech.push(await pg.evaluate(()=>({d:document.getElementById('m-lips').getAttribute('d'),
     l:document.getElementById('m-tongue').getAttribute('transform'),b:window.__totehm_lsd.bouche,u:location.host})));}
   const ici=ech.filter(e=>e.u==='www.totehm.com'),formes=new Set(ici.map(e=>e.d)).size,ouv=ici.filter(e=>e.b).length;
   ok(ici.length>=12&&ici.every(e=>e.l==='translate(0,-960)')&&formes>=10&&ouv>=8,'[Get Higher] : avalé, elle jouit, la bouche seule ('+formes+' formes, '+ouv+'/'+ici.length+' ouverte)');}
  await pg.waitForURL(/higher\.boutique/,{timeout:6000}).catch(()=>{});
  ok(pg.url()==='https://www.higher.boutique/get_higher#sso='+CODE,'avalé → '+pg.url());
  ok(log.functions.some(f=>f.name==='sso-mint'&&f.body.target==='boutique'),'le pont SSO est frappé pour higher.boutique');
  ok(!log.errors.length,'aucune erreur console : '+log.errors.join(' | '));}
 // ── la navigation n'aboutit pas : « précédent » remet tout au centre ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,functions,rpc:{my_landing:LAND()},network:club(true),viewport:{width:390,height:844}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);
  const chez=await R(pg,'#gate-asteroid');
  await pg.click('#lcur-h');await pg.waitForTimeout(1300);
  await pg.click('#lv-slogan');await pg.waitForTimeout(1800);
  ok((await lsd(pg)).avale===1&&await pg.$eval('#gate-asteroid',e=>e.style.opacity)==='0','avalé : le papier a disparu dans la bouche');
  await pg.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await pg.waitForTimeout(150);
  ok(await tf(pg)===''&&!(await lsd(pg)).bouche&&(await lv(pg)).vue==='c'&&JSON.stringify(await R(pg,'#gate-asteroid'))===JSON.stringify(chez),'revenu par « précédent » : le papier chez lui, la vue au centre');
  {const[x,y]=await centre(pg);await pg.mouse.move(x,y);await pg.mouse.down();await pg.waitForTimeout(500);
   ok(!(await lsd(pg)).pris&&await tf(pg)==='','un appui long ne prend plus le papier (la vue du haut l\'y pose)');await pg.mouse.up();await pg.waitForTimeout(2400);}
  ok(!(await pg.evaluate(()=>document.body.classList.contains('gate'))),'ensuite, relâché = le clic : le Totehm se déploie comme avant');
  ok(!log.errors.length,'aucune erreur console : '+log.errors.join(' | '));}
 // ── le Totehm se déploie depuis le haut : le papier rentre d'abord ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,functions,rpc:{my_landing:LAND(true)},network:club(),viewport:{width:390,height:844}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(1300);
  ok(/My TotehmPaper is mine/.test(await pg.textContent('#lv-thp-say')),'propriétaire du THP : la méthode, plus l\'explication');
  await pg.evaluate(()=>window.__totehmDeplie());await pg.waitForTimeout(3600);
  ok(!(await pg.evaluate(()=>document.body.classList.contains('gate')))&&(await lv(pg)).vue==='c','enter() depuis le haut : retour au centre, puis déploiement');
  ok(!log.errors.length,'aucune erreur console : '+log.errors.join(' | '));}
 // ── INVITÉ, ordinateur : Get Higher sans compte ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables:{},functions,session:false,network:club(),viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForTimeout(900);
  await pg.click('#lcur-h');await pg.waitForTimeout(1300);
  ok((await lv(pg)).vue==='h'&&!await pg.evaluate(()=>document.body.classList.contains('is-door')),'invité : la vue du haut s\'ouvre sans porte');
  await pg.click('#lv-slogan');
  await pg.waitForURL(/higher\.boutique/,{timeout:9000}).catch(()=>{});
  ok(pg.url()==='https://www.higher.boutique/get_higher','invité, avalé → '+pg.url()+' (sans pont : pas de session)');
  ok(!log.functions.some(f=>f.name==='sso-mint')&&!log.errors.length,'invité : aucun pont, aucune erreur : '+log.errors.join(' | '));}
 // ── clavier : Tab sur [Get Higher], Entrée ──
 {const{pg}=await page(browser,{dir:'com',origin,tables,functions,rpc:{my_landing:LAND()},network:club(),viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(1300);
  await pg.focus('#lv-slogan');await pg.keyboard.press('Enter');
  await pg.waitForURL(/higher\.boutique/,{timeout:9000}).catch(()=>{});
  ok(pg.url().startsWith('https://www.higher.boutique/get_higher'),'clavier : Entrée sur [Get Higher] → '+pg.url());}
 // ── mouvement réduit : tout de suite, sans animation ──
 {const{pg}=await page(browser,{dir:'com',origin,tables,functions,rpc:{my_landing:LAND()},network:club(),viewport:{width:390,height:844}});
  await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(150);
  ok((await lv(pg)).vue==='h'&&!(await lv(pg)).bouge,'mouvement réduit : la vue du haut, aussitôt');
  await pg.click('#lv-slogan');
  await pg.waitForURL(/higher\.boutique/,{timeout:9000}).catch(()=>{});
  ok(pg.url().startsWith('https://www.higher.boutique/get_higher'),'mouvement réduit : [Get Higher] mène tout droit → '+pg.url());}
 // ── paysage au téléphone : pas de bouche ──
 {const{pg}=await page(browser,{dir:'com',origin,tables,functions,rpc:{my_landing:LAND()},viewport:{width:844,height:390},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  const paysage=await pg.evaluate(()=>document.body.classList.contains('paysage'));
  ok(!paysage||(await R(pg,'#gate-mouth'))[2]===0,'paysage : la bouche n\'est pas là ('+(paysage?'paysage':'non détecté : pointeur fin')+')');}
}finally{await browser.close();}
