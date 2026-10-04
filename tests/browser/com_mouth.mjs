// COM : la bouche (03/10, en haut depuis le 04/10). Fermée en haut de
// l'atterrissage, le Totehm plus bas ; au chargement elle tire la langue une
// fois et se referme. Un appui prolongé
// PREND le papier ; porté vers la bouche, elle s'ouvre et la langue se tire ;
// posé sur la langue, il rapetisse et « Get [Higher] » apparaît à sa place ;
// lâché dessus, il est avalé → figher.club/get_higher (par le pont SSO).
// Lâché ailleurs, il rentre chez lui. Comptes, réseau et RPC sont simulés.
// LANCER : node com_mouth.mjs /tmp
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.com';
const tables={profiles:[{pseudo:'wahigher'}]};
const CODE='a'.repeat(64);
const functions={'sso-mint':{code:CODE}};
// figher.club répond une vraie page : la navigation a lieu (le harnais rend 204 sinon).
const club=(bloque=false)=>url=>url.host==='www.figher.club'
  ?(bloque?{status:204,body:''}:{status:200,contentType:'text/html',body:'<!doctype html><title>club</title>'}):null;
const browser=await launch();
const R=(pg,sel)=>pg.$eval(sel,e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height].map(v=>+v.toFixed(2));});
const centre=async(pg,sel='#gate-asteroid')=>{const r=await R(pg,sel);return[r[0]+r[2]/2,r[1]+r[3]/2];};
const lsd=pg=>pg.evaluate(()=>({...window.__totehm_lsd}));
const get=pg=>pg.$eval('#gate-get',e=>e.classList.contains('is-on'));
const tf=pg=>pg.$eval('#gate-asteroid',e=>e.style.transform);
// la langue tirée : son milieu, en pixels d'écran (le viewBox est 30 310 1020 1260)
const langue=async pg=>{const r=await R(pg,'#gate-mouth');const k=r[2]/1020;return[r[0]+(540-30)*k,r[1]+(1150-310)*k];};
// prendre (appui de 500 ms sans bouger), puis porter en `n` pas jusqu'à (x,y)
const prendre=async pg=>{const[x,y]=await centre(pg);await pg.mouse.move(x,y);await pg.mouse.down();await pg.waitForTimeout(500);return[x,y];};
const porter=async(pg,[x0,y0],[x,y],n=14)=>{for(let i=1;i<=n;i++){await pg.mouse.move(x0+(x-x0)*i/n,y0+(y-y0)*i/n);await pg.waitForTimeout(24);}};
try{
 // ── MEMBRE, téléphone ─────────────────────────────────────────────
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,functions,network:club(),viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');
  const d0=await pg.$eval('#m-up',e=>e.getAttribute('d'));   // le balisage : la bouche fermée, avant tout script
  await pg.waitForSelector('body.member');
  // à l'arrivée : elle s'ouvre, tire la langue, se referme — une fois
  await pg.waitForFunction(()=>window.__totehm_lsd&&window.__totehm_lsd.accueil===1,null,{timeout:4000}).catch(()=>{});
  const tiree=await pg.waitForFunction(()=>+document.getElementById('m-tongue').getAttribute('transform').match(/,(-?[\d.]+)/)[1]>-150,null,{timeout:1500}).then(()=>true,()=>false);
  await pg.screenshot({path:OUT+'/com_mouth_hello.png'});
  await pg.waitForFunction(()=>window.__totehm_lsd.accueil===2,null,{timeout:3000}).catch(()=>{});await pg.waitForTimeout(300);
  ok(tiree&&!(await lsd(pg)).bouche&&await pg.$eval('#m-up',e=>e.getAttribute('d'))===d0,'à l\'arrivée : elle tire la langue, puis se referme EXACTEMENT comme le balisage');
  const chez=await R(pg,'#gate-asteroid'),m=await R(pg,'#gate-mouth');
  ok(m[1]>=50&&m[1]+m[3]<chez[1]&&Math.abs(m[0]+m[2]/2-195)<1&&Math.abs(chez[1]+chez[3]/2-844*.6)<2,'la bouche est en haut, centrée ; le papier dessous, à 60 % ('+m.map(Math.round)+' / '+chez.map(Math.round)+')');
  ok(await pg.evaluate(()=>{const g=id=>document.getElementById(id);return g('m-up').getAttribute('fill')==='#303030'&&g('m-down').getAttribute('fill')==='#3d3d3d'&&g('m-shut').getAttribute('opacity')==='1';}),'fermée : deux lèvres, deux gris (#303030 · #3d3d3d), reflet et commissures');
  ok(!(await lsd(pg)).bouche&&!await get(pg)&&(await pg.$eval('#m-tongue',e=>e.getAttribute('transform')))==='translate(0,-960)','au repos : bouche fermée, langue rentrée, slogan absent');
  // un appui long sans bouger : pris, puis rendu ; aucun clic n'ouvre le Totehm
  let p=await prendre(pg);
  ok((await lsd(pg)).pris&&await pg.$eval('#gate-asteroid',e=>e.classList.contains('is-pris')),'appui de 500 ms : le papier est PRIS');
  await pg.mouse.up();await pg.waitForTimeout(700);
  ok(!(await lsd(pg)).pris&&await tf(pg)===''&&JSON.stringify(await R(pg,'#gate-asteroid'))===JSON.stringify(chez)&&!await pg.evaluate(()=>document.body.classList.contains('entered'))&&await pg.evaluate(()=>document.body.classList.contains('gate')),'relâché sans bouger : il est chez lui, rien ne s\'ouvre');
  // porté à mi-chemin : la bouche s'ouvre, pas encore posé
  p=await prendre(pg);const L=await langue(pg);
  await porter(pg,p,[p[0],p[1]+(L[1]-p[1])*.62]);await pg.waitForTimeout(350);
  let s=await lsd(pg);
  ok(s.bouche&&!s.langue&&!await get(pg)&&await pg.$eval('#m-up',e=>e.getAttribute('d'))!==d0,'à mi-chemin : la bouche s\'ouvre, il n\'est pas encore sur la langue');
  // sur la langue : il rapetisse, « Get [Higher] » apparaît à sa place
  await porter(pg,[p[0],p[1]+(L[1]-p[1])*.62],L,8);await pg.waitForTimeout(600);
  s=await lsd(pg);const w=(await R(pg,'#gate-asteroid'))[2],g=await R(pg,'#gate-get');
  ok(s.langue&&await get(pg)&&w<chez[2]*.75,'sur la langue : posé, il rapetisse ('+Math.round(w)+' px), le slogan apparaît');
  ok(Math.abs(g[0]+g[2]/2-(chez[0]+chez[2]/2))<1&&Math.abs(g[1]+g[3]/2-(chez[1]+chez[3]/2))<1,'« Get [Higher] » est centré EXACTEMENT là où le papier reposait');
  ok(await pg.$eval('.gg-get',e=>{const c=getComputedStyle(e);return /Quantico/.test(c.fontFamily)&&c.color==='rgb(251, 213, 202)';})&&await pg.$eval('#gate-get use',e=>e.getAttribute('href'))==='#higher-badge','« Get » en Quantico corail, Higher = le badge SVG');
  ok(+(await pg.$eval('#m-tongue',e=>e.getAttribute('transform').match(/,(-?[\d.]+)/)[1]))>-60,'la langue est tirée');
  await pg.screenshot({path:OUT+'/com_mouth_open.png'});
  // ramené loin de la bouche et lâché : il rentre, la bouche se ferme
  await porter(pg,L,[60,760],8);await pg.mouse.up();await pg.waitForTimeout(1200);
  s=await lsd(pg);
  ok(!s.pris&&!s.bouche&&!await get(pg)&&await tf(pg)===''&&JSON.stringify(await R(pg,'#gate-asteroid'))===JSON.stringify(chez),'lâché hors de la langue : chez lui, bouche fermée, slogan parti');
  ok(await pg.$eval('#m-up',e=>e.getAttribute('d'))===d0&&await pg.$eval('#m-down',e=>e.getAttribute('fill'))==='#3d3d3d','refermée, la bouche est EXACTEMENT celle du départ');
  // posé et lâché sur la langue : avalé → figher.club/get_higher, par le pont
  p=await prendre(pg);await porter(pg,p,await langue(pg));await pg.waitForTimeout(300);
  await pg.mouse.up();await pg.waitForTimeout(500);
  ok((await lsd(pg)).langue&&await get(pg),'lâché sur la langue : la langue le garde, le slogan reste');
  await pg.waitForURL(/figher\.club/,{timeout:4000}).catch(()=>{});
  ok(pg.url()==='https://www.figher.club/get_higher#sso='+CODE,'avalé → '+pg.url());
  ok(log.functions.some(f=>f.name==='sso-mint'&&f.body.target==='club'),'le pont SSO est frappé pour figher.club');
  ok(!log.errors.length,'aucune erreur console : '+log.errors.join(' | '));}
 // ── le tap ouvre toujours ; les lèvres invitent ; le retour arrière le rend ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,functions,network:club(true),viewport:{width:390,height:844}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');
  await pg.waitForFunction(()=>window.__totehm_lsd&&window.__totehm_lsd.accueil===2,null,{timeout:5000}).catch(()=>{});await pg.waitForTimeout(300);
  const[mx,my]=await (async()=>{const r=await R(pg,'#gate-mouth');return[r[0]+r[2]/2,r[1]+r[2]*(680-310)/1020];})();
  await pg.mouse.click(mx,my);await pg.waitForTimeout(180);
  const ouvert=(await lsd(pg)).bouche;await pg.waitForTimeout(900);
  ok(ouvert&&!(await lsd(pg)).bouche&&pg.url().startsWith(origin),'un tap sur les lèvres : elle s\'entrouvre puis se referme, on reste ici');
  // avalé, mais la navigation n'aboutit pas : « précédent » (pageshow persisted) le remet chez lui
  const chez=await R(pg,'#gate-asteroid');
  let p=await prendre(pg);await porter(pg,p,await langue(pg));await pg.waitForTimeout(300);await pg.mouse.up();await pg.waitForTimeout(1800);
  ok((await lsd(pg)).avale===1&&await pg.$eval('#gate-asteroid',e=>e.style.opacity)==='0','avalé : le papier a disparu dans la bouche');
  await pg.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await pg.waitForTimeout(100);
  ok(await tf(pg)===''&&await pg.$eval('#gate-asteroid',e=>e.style.opacity)===''&&!(await lsd(pg)).bouche&&!await get(pg)&&JSON.stringify(await R(pg,'#gate-asteroid'))===JSON.stringify(chez),'revenu par « précédent » : chez lui, bouche fermée');
  await pg.mouse.click(...await centre(pg));await pg.waitForTimeout(2400);
  ok(await pg.evaluate(()=>document.body.className)==='v-habits member','ensuite, un tap déploie le Totehm comme avant');
  ok(!log.errors.length,'aucune erreur console : '+log.errors.join(' | '));}
 // ── INVITÉ, ordinateur : la porte s'efface quand on prend le papier ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables:{},functions,session:false,network:club(),viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForTimeout(900);
  await pg.mouse.click(...await centre(pg));await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>document.body.classList.contains('is-door'))&&await pg.$eval('#gate-mouth',e=>getComputedStyle(e).visibility)==='hidden','invité : la porte d\'inscription ouverte, la bouche se retire');
  {const d=await R(pg,'#gate-door'),a=await R(pg,'#gate-asteroid');
   ok(d[1]>=40&&d[1]+d[3]<a[1]-20&&Math.abs(d[0]+d[2]/2-(a[0]+a[2]/2))<1,'invité : la porte s\'ouvre AU-DESSUS du papier, centrée, hors du clavier ('+d.map(Math.round)+')');}
  const p=await prendre(pg);
  ok(!await pg.evaluate(()=>document.body.classList.contains('is-door'))&&(await lsd(pg)).pris,'invité : prendre le papier ferme la porte');
  await porter(pg,p,await langue(pg));await pg.waitForTimeout(400);await pg.mouse.up();
  await pg.waitForURL(/figher\.club/,{timeout:4000}).catch(()=>{});
  ok(pg.url()==='https://www.figher.club/get_higher','invité, avalé → '+pg.url()+' (sans pont : pas de session)');
  ok(!log.functions.some(f=>f.name==='sso-mint')&&!log.errors.length,'invité : aucun pont, aucune erreur : '+log.errors.join(' | '));}
 // ── clavier : le bouton de la bouche y porte le papier de lui-même ──
 {const{pg}=await page(browser,{dir:'com',origin,tables,functions,network:club(),viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  await pg.focus('#gate-mouth');await pg.keyboard.press('Enter');await pg.waitForTimeout(700);
  ok((await lsd(pg)).langue&&await get(pg),'clavier : Entrée sur la bouche, le papier va sur la langue');
  await pg.waitForURL(/figher\.club/,{timeout:4000}).catch(()=>{});
  ok(pg.url().startsWith('https://www.figher.club/get_higher'),'clavier : avalé → '+pg.url());}
 // ── mouvement réduit : aucun geste ; la bouche mène tout droit ──
 {const{pg}=await page(browser,{dir:'com',origin,tables,functions,network:club(),viewport:{width:390,height:844}});
  await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  const p=await prendre(pg);await pg.waitForTimeout(100);
  ok(!(await lsd(pg)).pris&&await tf(pg)===''&&(await lsd(pg)).accueil===0,'mouvement réduit : pas de langue à l\'arrivée, un appui long ne prend pas le papier');
  await pg.mouse.up();await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  await pg.click('#m-lips');
  await pg.waitForURL(/figher\.club/,{timeout:4000}).catch(()=>{});
  ok(pg.url().startsWith('https://www.figher.club/get_higher'),'mouvement réduit : la bouche mène à Get Higher → '+pg.url());}
 // ── paysage au téléphone : pas de bouche ──
 {const{pg}=await page(browser,{dir:'com',origin,tables,functions,viewport:{width:844,height:390},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  const paysage=await pg.evaluate(()=>document.body.classList.contains('paysage'));
  ok(!paysage||(await R(pg,'#gate-mouth'))[2]===0,'paysage : la bouche n\'est pas là ('+(paysage?'paysage':'non détecté : pointeur fin')+')');}
}finally{await browser.close();}
