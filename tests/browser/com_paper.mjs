// COM : le papier a deux faces. Au repos il est POSÉ, recto (le logo) : un tap
// le déploie en Totehm (inchangé). L'utilisateur le RETOURNE (au doigt, à la
// souris, ou par le mot du bas) : la recherche s'ouvre d'elle-même — on zoome
// dans le dos du papier, l'écran devient navy, le NOM devient la saisie.
// Comptes, réseau et RPC sont simulés. LANCER : node com_paper.mjs /tmp
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.com';
const ROWS=[{pseudo:'wa',offer:false,price_cents:null,currency:'eur',subscribed:false},
            {pseudo:'wah',offer:true,price_cents:1200,currency:'eur',subscribed:false},
            {pseudo:'wanda_flow',offer:false,price_cents:null,currency:'eur',subscribed:true}];
// « wa » répond lentement : si l'on tape « wah » entre-temps, seule la dernière frappe doit compter.
const rpc={totehm_search:async b=>{const q=b.p_q||'';if(q==='wa')await new Promise(r=>setTimeout(r,600));
  return q?ROWS.filter(r=>r.pseudo.startsWith(q)):ROWS.filter(r=>r.subscribed);}};
const tables={profiles:[{pseudo:'wahigher'}]};
const browser=await launch();
const R=(pg,sel)=>pg.$eval(sel,e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height].map(v=>+v.toFixed(2));});
const centre=async pg=>{const r=await R(pg,'#gate-asteroid');return[r[0]+r[2]/2,r[1]+r[3]/2];};
const lsd=pg=>pg.evaluate(()=>({...window.__totehm_lsd}));
const card=pg=>pg.$eval('#gate-card',e=>({cls:e.className.split(' ').filter(Boolean).sort().join(' '),tf:e.style.transform}));
const srch=pg=>pg.$eval('#srch',e=>e.className);
// tourner le papier : un glissé horizontal de `px` pixels, en `n` pas
const tourner=async(pg,px,n=12)=>{const[x,y]=await centre(pg);await pg.mouse.move(x,y);await pg.mouse.down();
  for(let i=1;i<=n;i++){await pg.mouse.move(x+px*i/n,y);await pg.waitForTimeout(16);}await pg.mouse.up();};
const vars=pg=>pg.evaluate(()=>['--tf-t','--tf-wm','--tf-rail','--tf-bg','--gate-bg-scale'].map(v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()).join('|'));
try{
 // ── MEMBRE, téléphone ─────────────────────────────────────────────
 {const{pg,log}=await page(browser,{dir:'com',origin,rpc,tables,viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);
  const paper=await R(pg,'#gate-asteroid'),v0=await vars(pg);
  let c=await card(pg);
  ok(c.cls==='is-flat'&&c.tf===''&&(await lsd(pg)).face===0,'départ : recto, posé, aucune transformation');
  ok(await pg.textContent('#ast-name')==='wahigher','le dos porte le nom du Totehm du membre');
  ok(await pg.$eval('#ast-back',e=>e.inert)&&!await pg.$eval('#ast-front',e=>e.inert),'seul le recto est atteignable (inert sur le verso)');
  await pg.waitForTimeout(1500);
  ok((await card(pg)).tf==='','il ne tourne JAMAIS tout seul (1,5 s : transform toujours vide)');
  // un petit glissé : il revient sur son recto
  {const[x,y]=await centre(pg);await pg.mouse.move(x,y);await pg.mouse.down();
   for(let i=1;i<=5;i++){await pg.mouse.move(x+i*10,y);await pg.waitForTimeout(16);}await pg.waitForTimeout(200);await pg.mouse.up();}
  await pg.waitForTimeout(900);
  ok((await lsd(pg)).face===0&&await srch(pg)===''&&(await card(pg)).cls==='is-flat','petit glissé (50 px, lent) : il revient sur son recto, rien ne s\'ouvre');
  // on le retourne : la recherche s'ouvre d'elle-même, le focus est pris DANS le geste
  await tourner(pg,260);
  ok(await pg.evaluate(()=>document.activeElement.id)==='srch-q','retourné à la main : la saisie a le focus dès le relâché (clavier du téléphone)');
  await pg.waitForTimeout(1500);
  const z=await pg.evaluate(()=>{const q=document.getElementById('srch-q');return{srch:document.getElementById('srch').className,v:q.value,sel:[q.selectionStart,q.selectionEnd],
    ff:getComputedStyle(q).fontFamily,tq:getComputedStyle(q).transform,tb:getComputedStyle(document.getElementById('srch-bg')).transform,
    bg:getComputedStyle(document.getElementById('srch-bg')).backgroundImage.includes('333366')};});
  ok(/is-open/.test(z.srch),'la recherche est dépliée');
  ok(z.v==='wahigher'&&z.sel[0]===0&&z.sel[1]===8,'le champ EST le nom, déjà sélectionné : taper le change');
  ok(/Quantico/.test(z.ff)&&z.tq==='matrix(1, 0, 0, 1, 0, 0)'&&z.tb==='matrix(1, 0, 0, 1, 0, 0)'&&z.bg,'zoom fini : le fond est le papier navy, le nom en Quantico à sa taille');
  c=await card(pg);ok((await lsd(pg)).face===1&&c.cls==='is-back is-flat'&&c.tf==='','dessous, le papier est posé sur son verso, sans transformation');
  ok(await pg.$eval('#gate',e=>e.inert&&getComputedStyle(e).visibility==='visible'),'#gate est inert mais reste peint (le Totehm dessous ne se révèle jamais)');
  ok(JSON.stringify(await pg.$$eval('.srch-name',e=>e.map(x=>x.textContent)))==='["wanda_flow"]','sans frappe : mes abonnements');
  await pg.keyboard.type('wa',{delay:30});await pg.waitForTimeout(260);await pg.keyboard.type('h',{delay:30});await pg.waitForTimeout(1500);
  const names=await pg.$$eval('.srch-name',e=>e.map(x=>x.textContent));
  ok(JSON.stringify(names)==='["wah"]','course réseau : « wa » (lent) ne recouvre pas « wah » → '+names);
  ok(await pg.$eval('.srch-row',e=>e.getAttribute('href'))==='/totehm?ro=wah','un résultat = un NOM qui ouvre son Totehm en lecture seule (/totehm?ro=nom)');
  // focus piégé dans la feuille
  const tab=async k=>{await pg.keyboard.press(k);return pg.evaluate(()=>{const e=document.activeElement;return e.closest('#srch')?(e.id||e.getAttribute('href')||e.tagName):'HORS:'+e.tagName;});};
  await pg.focus('#srch-q');const ring=[];for(let i=0;i<4;i++)ring.push(await tab('Tab'));
  ok(JSON.stringify(ring)==='["/totehm?ro=wah","srch-x","srch-q","/totehm?ro=wah"]','Tab tourne dans la feuille → '+ring);
  await pg.fill('#srch-q','w');await pg.waitForTimeout(400);
  ok(/two letters/.test(await pg.textContent('#srch-note')),'une lettre : « two letters, minimum »');
  await pg.screenshot({path:OUT+'/com_search.png'});
  // fermer : dézoom sur le dos, puis il se remet sur son recto
  await pg.click('#srch-x');await pg.waitForTimeout(2000);
  c=await card(pg);
  ok(await srch(pg)===''&&(await lsd(pg)).face===0&&c.cls==='is-flat'&&c.tf==='','la croix : dézoom, puis le papier se remet sur son recto');
  ok(!await pg.$eval('#gate',e=>e.inert)&&JSON.stringify(await R(pg,'#gate-asteroid'))===JSON.stringify(paper),'le papier est de nouveau atteignable, exactement à sa place');
  ok(await pg.textContent('#ast-name')==='wahigher','son dos porte de nouveau MON nom');
  // le mot du bas : retourner = chercher ; Échap ferme
  await pg.click('#search-corner',{force:true});
  ok(await pg.evaluate(()=>document.activeElement.id)==='srch-q','le mot du bas : le focus est pris dans le clic');
  await pg.waitForTimeout(1700);ok(/is-open/.test(await srch(pg)),'le mot du bas retourne le papier et ouvre la recherche');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(2000);
  ok(await srch(pg)===''&&(await lsd(pg)).face===0,'Échap : dézoom et retour au recto');
  // recto : le Totehm se déploie comme avant
  ok(await vars(pg)===v0,'les mesures de déconstruction sont celles du départ');
  await pg.mouse.click(...await centre(pg));await pg.waitForTimeout(2400);
  ok(await pg.evaluate(()=>document.body.className)==='v-habits member','tap sur le recto : le Totehm se déploie');
  await pg.click('#fold-x');await pg.waitForTimeout(1500);
  ok(JSON.stringify(await R(pg,'#gate-asteroid'))===JSON.stringify(paper)&&(await card(pg)).tf==='','repli : le papier revient posé, recto, à sa place');
  // déployer le Totehm pendant que la recherche est ouverte (#in, ?ro=, porte [My Higher Self])
  await tourner(pg,260);await pg.waitForTimeout(1500);
  await pg.evaluate(()=>window.__totehmDeplie());await pg.waitForTimeout(5000);
  ok(await pg.evaluate(()=>document.body.className)==='v-habits member'&&await srch(pg)==='','enter() pendant la recherche : dézoom, recto, puis déploiement');
  ok(!log.errors.length,'aucune erreur console : '+log.errors.join(' | '));}
 // ── INVITÉ, ordinateur, à la souris, vers la gauche ───────────────
 {const{pg,log}=await page(browser,{dir:'com',origin,rpc,tables:{},session:false,viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForTimeout(900);
  ok(await pg.textContent('#ast-name')==='search\na Totehm','invité : le dos dit « search a Totehm »');
  await tourner(pg,-300);await pg.waitForTimeout(1600);
  ok(/is-open/.test(await srch(pg))&&await pg.inputValue('#srch-q')===''&&!await pg.evaluate(()=>document.body.classList.contains('is-door')),'invité : retourné vers la gauche → recherche, champ vide, sans compte');
  await pg.keyboard.type('wan',{delay:30});await pg.waitForTimeout(700);
  ok(await pg.$$eval('.srch-name',e=>e.map(x=>x.textContent).join())==='wanda_flow','invité : résultat de « wan »');
  await pg.screenshot({path:OUT+'/com_search_desktop.png'});
  await pg.keyboard.press('Escape');await pg.waitForTimeout(2000);
  await pg.mouse.click(...await centre(pg));await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>document.body.classList.contains('is-door')),'invité : le recto ouvre toujours la porte d\'inscription');
  ok(!log.errors.length,'invité : aucune erreur console : '+log.errors.join(' | '));}
 // ── une pichenette le retourne ; un tour presque entier non ───────
 {const{pg}=await page(browser,{dir:'com',origin,rpc,tables,viewport:{width:390,height:844}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  {const[x,y]=await centre(pg);await pg.mouse.move(x,y);await pg.mouse.down();await pg.mouse.move(x+70,y,{steps:4});await pg.mouse.up();}
  await pg.waitForTimeout(1500);
  ok(/is-open/.test(await srch(pg)),'pichenette (70 px d\'un coup) : il se retourne et cherche');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(2000);
  await tourner(pg,470,20);await pg.waitForTimeout(1200);
  ok(await srch(pg)===''&&(await lsd(pg)).face===0,'presque un tour entier : il revient sur son recto, rien ne s\'ouvre');}
 // ── clavier ───────────────────────────────────────────────────────
 {const{pg}=await page(browser,{dir:'com',origin,rpc,tables,viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  const a=[];for(let i=0;i<4;i++){await pg.keyboard.press('Tab');a.push(await pg.evaluate(()=>document.activeElement.id));}
  ok(a.includes('gate-enter')&&!a.includes('gate-search-go'),'clavier, recto : #gate-enter seul → '+a);
  await pg.focus('#search-corner');await pg.keyboard.press('Enter');await pg.waitForTimeout(1700);
  ok(/is-open/.test(await srch(pg))&&await pg.evaluate(()=>document.activeElement.id)==='srch-q','clavier : Entrée sur le mot du bas → recherche, focus dans le nom');}
 // ── mouvement réduit ──────────────────────────────────────────────
 {const{pg}=await page(browser,{dir:'com',origin,rpc,tables,viewport:{width:390,height:844}});
  await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  await tourner(pg,260);await pg.waitForTimeout(200);
  ok(await srch(pg)===''&&(await card(pg)).tf==='','mouvement réduit : aucun geste n\'est écouté');
  await pg.click('#search-corner',{force:true});await pg.waitForTimeout(150);
  ok(/is-open/.test(await srch(pg)),'mouvement réduit : le mot du bas ouvre la recherche sans animation');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(150);
  ok(await srch(pg)===''&&(await lsd(pg)).face===0,'mouvement réduit : fermée, le papier est de nouveau sur son recto');}
}finally{await browser.close();}
