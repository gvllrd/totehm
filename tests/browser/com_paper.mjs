// COM : le papier a deux faces. Recto = MON Totehm (déconstruction, inchangée) ;
// verso = la recherche d'un AUTRE Totehm (le papier se déplie jusqu'à couvrir l'écran).
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
const centre=async(pg,sel)=>{const r=await R(pg,sel);return[r[0]+r[2]/2,r[1]+r[3]/2];};
const lsd=pg=>pg.evaluate(()=>window.__totehm_lsd);
const flip=async pg=>{await pg.click('#search-corner',{force:true});await pg.waitForTimeout(1050);};
const tapPaper=async pg=>{const[x,y]=await centre(pg,'#gate-asteroid');await pg.mouse.click(x,y);};
try{
 // ── MEMBRE, téléphone ─────────────────────────────────────────────
 {const{pg,log}=await page(browser,{dir:'com',origin,rpc,tables,viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);
  const vars=()=>pg.evaluate(()=>['--tf-t','--tf-wm','--tf-rail','--tf-bg','--gate-bg-scale'].map(v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()).join('|'));
  const before={vars:await vars(),paper:await R(pg,'#gate-asteroid')};
  ok((await lsd(pg)).face===0&&await pg.$eval('#gate-card',e=>e.className)==='is-flat','départ : recto, posé à plat, aucune transformation');
  ok(await pg.$eval('#ast-back',e=>e.inert)&&!await pg.$eval('#ast-front',e=>e.inert),'départ : seul le recto est atteignable (inert sur le verso)');
  // retournement
  await pg.click('#search-corner',{force:true});await pg.waitForTimeout(350);
  const mid=await pg.$eval('#gate-card',e=>e.style.transform);
  ok(/rotateY\((?!0\.00)[\d.]+deg\) skew/.test(mid)&&!await pg.$eval('#gate-card',e=>e.classList.contains('is-flat')),'mi-course : le papier est en l\'air (demi-tour en cours)');
  await pg.mouse.click(...await centre(pg,'#gate-asteroid'));await pg.waitForTimeout(100);
  await pg.waitForTimeout(800);
  const s1=await pg.evaluate(()=>({l:window.__totehm_lsd,cls:document.getElementById('gate-card').className,tf:document.getElementById('gate-card').style.transform,
    label:document.getElementById('search-corner').textContent,srch:document.getElementById('srch').className}));
  ok(s1.l.face===1&&s1.l.flips===1&&s1.cls==='is-flat is-back'&&s1.tf==='','verso posé : face 1, `is-flat is-back`, transform vide (un seul demi-tour : le tap en vol est avalé)');
  ok(s1.srch===''&&/back/i.test(s1.label),'le tap pendant le demi-tour n\'ouvre rien ; le mot du bas propose de revenir');
  ok(!await pg.$eval('#ast-back',e=>e.inert)&&await pg.$eval('#ast-front',e=>e.inert),'verso : l\'accès clavier change de face');
  ok(JSON.stringify(await R(pg,'#gate-asteroid'))===JSON.stringify(before.paper),'le papier n\'a pas bougé d\'un pixel en se retournant');
  ok((await pg.$eval('#ast-say',e=>getComputedStyle(e).fontFamily)).includes('Quantico'),'le mot du verso est en Quantico');
  await pg.screenshot({path:OUT+'/com_verso.png'});
  // dépliage de la recherche
  await pg.mouse.click(...await centre(pg,'#gate-asteroid'));await pg.waitForTimeout(1050);
  const s2=await pg.evaluate(()=>({srch:document.getElementById('srch').className,sch:document.body.classList.contains('searching'),
    focus:document.activeElement&&document.activeElement.id,rows:[...document.querySelectorAll('.srch-name')].map(e=>e.textContent)}));
  ok(/is-open/.test(s2.srch)&&s2.sch,'tap sur le verso : la recherche se déplie et le papier s\'efface dessous');
  ok(s2.focus==='srch-q','la mise au point est dans le champ (clavier du téléphone)');
  ok(await pg.$eval('#gate',e=>e.inert&&getComputedStyle(e).visibility==='visible'),'#gate est inert mais reste peint (le Totehm dessous ne se révèle jamais)');
  ok(JSON.stringify(s2.rows)==='["wanda_flow"]','sans mot : mes abonnements');
  ok((await pg.$eval('#srch-q',e=>getComputedStyle(e).fontFamily)).includes('Quantico'),'la saisie est en Quantico');
  await pg.keyboard.type('wa',{delay:30});await pg.waitForTimeout(260);await pg.keyboard.type('h',{delay:30});await pg.waitForTimeout(1500);
  const names=await pg.$$eval('.srch-name',e=>e.map(x=>x.textContent));
  ok(JSON.stringify(names)==='["wah"]','course réseau : « wa » (lent) ne recouvre pas « wah » → '+names);
  ok(await pg.$eval('.srch-row',e=>e.getAttribute('href'))==='/@wah'&&/12/.test(await pg.textContent('.srch-meta')),'un résultat = un lien /@nom et son offre');
  // focus piégé dans la feuille : champ → résultats → croix → champ (et à l'envers)
  const tab=async(k)=>{await pg.keyboard.press(k);return pg.evaluate(()=>{const e=document.activeElement;return(e.closest('#srch')?e.id||e.getAttribute('href'):'HORS DE LA FEUILLE:'+e.tagName);});};
  await pg.focus('#srch-q');const ring=[];for(let i=0;i<4;i++)ring.push(await tab('Tab'));
  ok(JSON.stringify(ring)==='["/@wah","srch-x","srch-q","/@wah"]','Tab tourne dans la feuille → '+ring);
  ok(await tab('Shift+Tab')==='srch-q'&&await tab('Shift+Tab')==='srch-x','Maj+Tab tourne à l\'envers dans la feuille');
  await pg.focus('#srch-q');
  await pg.fill('#srch-q','w');await pg.waitForTimeout(400);
  ok(/two letters/.test(await pg.textContent('#srch-note')),'une lettre : « two letters, minimum »');
  await pg.screenshot({path:OUT+'/com_search.png'});
  // repli
  await pg.click('#srch-x');await pg.waitForTimeout(1000);
  ok(await pg.$eval('#srch',e=>e.className)===''&&!await pg.evaluate(()=>document.body.classList.contains('searching')),'la croix replie la recherche');
  ok(!await pg.$eval('#gate',e=>e.inert),'repli : #gate est de nouveau atteignable');
  ok(JSON.stringify(await R(pg,'#gate-asteroid'))===JSON.stringify(before.paper),'le papier revient exactement où il était');
  await pg.mouse.click(...await centre(pg,'#gate-asteroid'));await pg.waitForTimeout(1000);
  await pg.keyboard.press('Escape');await pg.waitForTimeout(1000);
  ok(await pg.$eval('#srch',e=>e.className)==='','Échap replie aussi');
  // retour au recto + le Totehm s'ouvre comme avant
  await flip(pg);
  ok((await lsd(pg)).face===0&&await vars()===before.vars,'retour au recto : les mesures de déconstruction sont identiques à celles d\'avant');
  await tapPaper(pg);await pg.waitForTimeout(2400);
  ok(await pg.evaluate(()=>document.body.className)==='v-habits member','recto : le Totehm se déploie comme avant');
  await pg.click('#fold-x');await pg.waitForTimeout(1500);
  ok(await vars()===before.vars&&JSON.stringify(await R(pg,'#gate-asteroid'))===JSON.stringify(before.paper),'repli : tout revient à la position de départ');
  // déployer le Totehm DEPUIS le verso (porte My Higher Self, #in…) : le papier se retourne d'abord
  await flip(pg);await pg.evaluate(()=>window.__totehmDeplie());await pg.waitForTimeout(3800);
  ok(await pg.evaluate(()=>document.body.className)==='v-habits member','enter() depuis le verso : retournement, puis déploiement');
  ok(!log.errors.length,'aucune erreur console : '+log.errors.join(' | '));}
 // ── INVITÉ, ordinateur ────────────────────────────────────────────
 {const{pg,log}=await page(browser,{dir:'com',origin,rpc,tables:{},session:false,viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForTimeout(900);
  await flip(pg);await tapPaper(pg);await pg.waitForTimeout(1050);
  ok(await pg.$eval('#srch',e=>e.classList.contains('is-open')),'invité : la recherche marche sans compte');
  ok(await pg.$$eval('.srch-row',e=>e.length)===0&&!await pg.evaluate(()=>document.body.classList.contains('is-door')),'invité : pas d\'abonnements, pas de porte');
  await pg.keyboard.type('wan',{delay:30});await pg.waitForTimeout(700);
  ok(await pg.$$eval('.srch-name',e=>e.map(x=>x.textContent).join())==='wanda_flow','invité : résultat de « wan »');
  await pg.screenshot({path:OUT+'/com_search_desktop.png'});
  await pg.keyboard.press('Escape');await pg.waitForTimeout(1000);await flip(pg);await tapPaper(pg);await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>document.body.classList.contains('is-door')),'invité : le recto ouvre toujours la porte d\'inscription');
  ok(!log.errors.length,'invité : aucune erreur console : '+log.errors.join(' | '));}
 // ── clavier : une seule face atteignable à la fois ────────────────
 {const{pg}=await page(browser,{dir:'com',origin,rpc,tables,viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  const tabs=async()=>{const s=[];for(let i=0;i<4;i++){await pg.keyboard.press('Tab');s.push(await pg.evaluate(()=>document.activeElement&&document.activeElement.id));}return s;};
  const a=await tabs();ok(a.includes('gate-enter')&&!a.includes('gate-search-go'),'clavier, recto : #gate-enter seul → '+a);
  await pg.focus('#search-corner');await pg.keyboard.press('Enter');await pg.waitForTimeout(1050);
  await pg.evaluate(()=>document.activeElement&&document.activeElement.blur());
  const b=await tabs();ok(b.includes('gate-search-go')&&!b.includes('gate-enter'),'clavier, verso : #gate-search-go seul → '+b);}
 // ── mouvement réduit ──────────────────────────────────────────────
 {const{pg}=await page(browser,{dir:'com',origin,rpc,tables,viewport:{width:390,height:844}});
  await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  await pg.click('#search-corner',{force:true});await pg.waitForTimeout(150);
  ok((await lsd(pg)).face===1,'mouvement réduit : retournement immédiat');
  await tapPaper(pg);await pg.waitForTimeout(150);
  ok(await pg.$eval('#srch',e=>e.classList.contains('is-open')),'mouvement réduit : recherche ouverte sans animation');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(150);
  ok(await pg.$eval('#srch',e=>e.className)==='','mouvement réduit : repli immédiat');}
}finally{await browser.close();}
