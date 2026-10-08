// COM · 07/10/2026 (bas refait le 08/10 : TotehmSM en bulles, freemium) — la croix de l'atterrissage : cinq vues, une manette, les mêmes
// gestes que le Totehm déplié. Centre (nom + visibilité), bas (TotehmSM), droite
// (SPACE · boutique, [Higher] sur un vêtement), trackpad dans les QUATRE sens,
// le doigt, le retour de Stripe ; le Totehm déplié change aussi de vue en haut
// et en bas au trackpad ; figher.club : le THP en quatre pouvoirs.
// Tout est simulé (RPC, fonctions, réseau). LANCER : node com_croix.mjs /tmp
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.com';
const tables={profiles:[{pseudo:'wahigher'}]};
const CODE='b'.repeat(64);
const LAND=(o={})=>({signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false},
  higher:{active:false,price_cents:700,currency:'eur',period:'month'},thp:false,subscriptions:0,subscribers:0,...o});
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64');
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const lv=pg=>pg.evaluate(()=>window.__totehm_lv());
const R=(pg,sel)=>pg.$eval(sel,e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height];});
const ouvre=async pg=>{await pg.evaluate(()=>{window.__ouvert=[];window.open=(u)=>{window.__ouvert.push(u);return null;};});};
const browser=await launch();
try{
 // ── 1 · LE CENTRE : le nom et la visibilité ; « subscribers » → le programme ──
 {let vis='private';
  const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:()=>LAND({visibility:vis}),
    visibility_set:b=>{vis=b.p_visibility;return{ok:true,visibility:vis};}},viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  const c=await pg.evaluate(()=>({card:!document.getElementById('lv-card').classList.contains('hide'),
    nom:!!document.querySelector('#lv-card #ident-block #name-btn'),on:document.querySelector('[data-lvvis].is-on')?.dataset.lvvis,
    prog:document.getElementById('lv-prog').classList.contains('hide'),tap:document.getElementById('lv-tap').textContent}));
  ok(c.card&&c.nom&&c.on==='private'&&c.prog&&c.tap==='Click to open it','au centre : le nom, Private par défaut, pas de programme ; « Click to open it »');
  await pg.click('[data-lvvis="subscribers"]');await pg.waitForFunction(()=>!document.getElementById('lv-prog').classList.contains('hide'));
  ok(log.rpc.some(x=>x.name==='visibility_set'&&x.body.p_visibility==='subscribers')&&await pg.$eval('#lv-prog',e=>e.getAttribute('href'))==='/monetize'&&/subscribers/.test(await pg.textContent('#lv-vis-note')),
    'Visible to my subscribers : le serveur décide, puis le bouton vers la page du programme (/monetize)');
  await pg.screenshot({path:OUT+'/croix_centre.png'});
  await pg.click('[data-lvvis="private"]');await pg.waitForFunction(()=>document.getElementById('lv-prog').classList.contains('hide'));
  ok((await lv(pg)).visibilite==='private','Private : le bouton se retire');
  ok(!erreurs(log).length,'centre : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 2 · EN BAS (08/10) : prêt, gratuit — « Wassup ? », la photo de profil, le flux, 7 par mois ──
 {const REP='@objective focus\nI stop negotiating with myself and ship one detail tonight.\nDO: At 22:45 I open my collection file and fix ONE element.\nWHY: Ship my first collection by 2026-12-01. Discipline is freedom.';
  let say=0;const corps=[];
  const net=(url,req)=>{ if(url.pathname!=='/functions/v1/higher-self') return null;
    const b=JSON.parse(req.postData()||'{}');corps.push(b);
    if(b.action==='say'&&++say<=2) return {status:200,contentType:'text/plain; charset=utf-8',headers:{'X-SM-Left':String(6-say),'X-SM-Higher':'0','access-control-allow-origin':'*','access-control-expose-headers':'X-SM-Left, X-SM-Higher'},body:REP};
    return {status:402,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({error:'higher_required',state:{ready:true,habit:true,objective:true,higher:false,free_total:7,free_left:0,left:0}})}; };
  const{pg,log}=await page(browser,{dir:'com',origin,tables,network:net,functions:{'higher-sub':{error:'not_ready'}},
    rpc:{my_landing:LAND({sm:{ready:true,habit:true,objective:true,higher:false,free_total:7,free_days:30,free_left:6,left:6}})},viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(800);
  await pg.click('#lcur-b');await pg.waitForTimeout(1500);
  const b=await pg.evaluate(()=>{const cs=s=>getComputedStyle(document.querySelector(s));
    const t=document.getElementById('lv-thumb').getBoundingClientRect(),p=document.getElementById('gate-asteroid').getBoundingClientRect();
    return {vue:window.__totehm_lv().vue,cls:document.getElementById('lv-slogan').className,self:cs('#lv-slogan .lvs-self').opacity,dbl:!!document.getElementById('lv-slogan2'),
      tag:document.getElementById('lv-b-tag').textContent,first:document.querySelector('#sm-first .sm-b').textContent,
      clip:cs('#ast-front').clipPath,t:[t.left+t.width/2,t.top+t.height/2,t.width],p:[p.left+p.width/2,p.top+.363*p.height,.59*p.width],
      say:document.getElementById('lv-say').classList.contains('hide'),note:document.getElementById('lv-say-note').textContent,joy:document.getElementById('ljoy-say').textContent};});
  ok(b.vue==='b'&&b.cls==='is-b'&&b.self==='1'&&!b.dbl&&/AI made by you · your beliefs · your TOTEHM/.test(b.tag)&&/Talk is cheap\. Do with a why\./.test(b.tag),'↓ : « [Higher] Self », AI made by you…, Talk is cheap. Do with a why. ; plus de double « social media »');
  ok(b.first==='Wassup ?'&&/circle\(29\.5%/.test(b.clip)&&Math.abs(b.t[0]-b.p[0])<3&&Math.abs(b.t[1]-b.p[1])<3&&Math.abs(b.t[2]-b.p[2])<3,'le papier devient la photo de profil (un disque, le T) à côté de « Wassup ? » ('+b.p.map(Math.round)+' / '+b.t.map(Math.round)+')');
  ok(!b.say&&/^6 of 7 free this month/.test(b.note)&&b.joy==='TotehmSM','prêt : la saisie ; « 6 of 7 free this month »');
  await pg.fill('#lv-say-in','I procrastinate on my collection since 3 days');await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>window.__totehm_lv().envois===1,null,{timeout:4000}).catch(()=>{});await pg.waitForTimeout(300);
  const r=await pg.evaluate(()=>{const q=s=>document.querySelector(s),cs=e=>getComputedStyle(e);
    const me=q('#lv-thread .sm-row.me .sm-b'),sm=q('#lv-thread .sm-b.k-objective');
    return {me:me&&[me.textContent,cs(me).backgroundColor,cs(me).borderTopLeftRadius,cs(me).fontFamily],sm:sm&&[cs(sm).backgroundColor,cs(sm).borderTopLeftRadius,cs(sm).fontFamily],
      int:q('#lv-thread .sm-int')?.textContent,intc:q('#lv-thread .sm-int')&&cs(q('#lv-thread .sm-int')).color,t:q('#lv-thread .sm-t')?.textContent,
      do:q('#lv-thread .sm-do')?.textContent,why:q('#lv-thread .sm-why')?.textContent,acts:document.querySelectorAll('#lv-thread .sm-acts').length,
      note:q('#lv-say-note').textContent,lv:window.__totehm_lv()};});
  ok(r.me&&r.me[0]==='I procrastinate on my collection since 3 days'&&r.me[1]==='rgb(42, 42, 48)'&&r.me[2]==='18px'&&/Quantico/.test(r.me[3]),'ma bulle : grise, arrondie (18 px), Quantico');
  ok(r.sm&&r.sm[0]==='rgb(54, 73, 140)'&&r.sm[1]==='18px'&&/Quantico/.test(r.sm[2])&&r.int==='focus'&&r.intc==='rgb(55, 138, 221)','sa bulle : la couleur de la Box (objective), arrondie, l\'intention dans sa couleur');
  ok(r.t==='I stop negotiating with myself and ship one detail tonight.'&&r.do==='DOAt 22:45 I open my collection file and fix ONE element.'&&/^WHYShip my first collection/.test(r.why),'la solution, DO (le geste), WHY (son TOTEHM)');
  ok(r.acts===0&&/^5 of 7 free/.test(r.note)&&r.lv.gratuits===5,'gratuit : pas de Telegram/WhatsApp (c\'est Higher) ; « 5 of 7 » (l\'en-tête du serveur)');
  const c1=corps.find(x=>x.action==='say');
  ok(c1&&c1.text==='I procrastinate on my collection since 3 days'&&Array.isArray(c1.turns)&&c1.turns.length===0&&/^\w{3} \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(c1.now),'l\'appel : le texte, aucun tour avant, l\'heure locale ('+(c1&&c1.now)+')');
  await pg.screenshot({path:OUT+'/croix_bas_fil.png'});
  await pg.fill('#lv-say-in','ok and tomorrow');await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>window.__totehm_lv().envois===2,null,{timeout:4000}).catch(()=>{});
  const c2=corps.filter(x=>x.action==='say')[1];
  ok(c2&&c2.turns.length===2&&c2.turns[0].role==='me'&&c2.turns[1].role==='sm'&&/^@objective/.test(c2.turns[1].text),'le tour suivant porte la conversation (2 tours), rien n\'est gardé ailleurs');
  await pg.fill('#lv-say-in','and now ?');await pg.keyboard.press('Enter');await pg.waitForTimeout(800);
  const f=await pg.evaluate(()=>({sm:window.__totehm_lv().sm,v:document.getElementById('lv-say-in').value,say:document.getElementById('lv-say').classList.contains('hide'),
    offre:!!document.querySelector('#lv-thread .sm-offer [data-sm-sub]'),fin:/That is my 7 for this month/.test(document.getElementById('lv-thread').textContent),badge:document.querySelectorAll('#lv-thread .sm-offer use[href="#higher-badge"]').length}));
  ok(f.sm===4&&f.v==='and now ?'&&f.say&&f.offre&&f.fin&&f.badge>=3,'les 7 pris (402) : la phrase revient dans la saisie, la saisie se ferme, l\'offre Higher (badge SVG, jamais du texte)');
  await pg.screenshot({path:OUT+'/croix_bas_offre.png'});
  await pg.click('#lv-thread [data-sm-sub]');await pg.waitForFunction(()=>/opening soon/.test(document.getElementById('lv-say-note').textContent),null,{timeout:4000}).catch(()=>{});
  ok(log.functions.some(f=>f.name==='higher-sub'&&f.body.action==='checkout')&&/opening soon/.test(await pg.textContent('#lv-say-note')),'Get Higher : le checkout est demandé au serveur (prix absent → « opening soon »)');
  ok(!log.rpc.some(x=>x.name==='sm_thread'),'aucun historique relu (sm_thread n\'est plus appelé)');
  ok(!erreurs(log).length,'bas gratuit : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 3 · EN BAS : TOTEHM vide, puis abonné Higher (Telegram, WhatsApp) ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND({sm:{ready:false,habit:true,objective:false,higher:false,free_total:7,free_left:7,left:7}})},viewport:{width:390,height:844}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(800);
  await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(1400);
  const v=await pg.evaluate(()=>({t:document.getElementById('lv-thread').textContent,say:document.getElementById('lv-say').classList.contains('hide'),
    h:document.querySelector('[data-sm-write="habits"]')?.className,o:document.querySelector('[data-sm-write="objectives"]')?.className}));
  ok(/I do not know you/.test(v.t)&&/One Habit\. One Objective/.test(v.t)&&v.say&&/is-ok/.test(v.h)&&!/is-ok/.test(v.o),'TOTEHM sans Objective : pas de saisie ; Habit ✓, Objective à écrire');
  await pg.click('[data-sm-write="objectives"]');
  await pg.waitForFunction(()=>!document.body.classList.contains('gate')&&window.__totehm_zone&&window.__totehm_zone.vue==='objectives',null,{timeout:8000}).catch(()=>{});
  ok(await pg.evaluate(()=>!document.body.classList.contains('gate')&&window.__totehm_zone.vue==='objectives'),'« + my Objective » ouvre le TOTEHM sur les objectifs');
  ok(!erreurs(log).length,'TOTEHM vide : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
 {const REP='@habit flow\nI move before I think.\nDO: I put my shoes at the door now.\nWHY: Run the hill.';
  const net=(url,req)=>{ if(url.pathname!=='/functions/v1/higher-self') return null; const b=JSON.parse(req.postData()||'{}');
    if(b.action==='say') return {status:200,contentType:'text/plain; charset=utf-8',headers:{'X-SM-Left':'29','X-SM-Higher':'1','access-control-allow-origin':'*','access-control-expose-headers':'X-SM-Left, X-SM-Higher'},body:REP};
    return {status:409,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({error:'not_linked'})}; };
  const{pg,log}=await page(browser,{dir:'com',origin,tables,network:net,rpc:{my_landing:LAND({higher:{active:true,price_cents:700,currency:'eur'},avatar:'data:image/jpeg;base64,AAAA',
      sm:{ready:true,habit:true,objective:true,higher:true,free_total:7,free_left:7,left:30}}),new_bot_link_code:'c0de'},viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(800);await ouvre(pg);
  await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(1400);
  ok(await pg.textContent('#lv-say-note')==='','Higher : aucun compteur tant qu\'il en reste plus de 5 aujourd\'hui');
  await pg.fill('#lv-say-in','lazy today');await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>window.__totehm_lv().envois===1,null,{timeout:4000}).catch(()=>{});await pg.waitForTimeout(200);
  ok(await pg.$eval('#lv-thread .sm-row.me .sm-av',e=>/data:image\/jpeg/.test(e.style.backgroundImage))&&await pg.locator('#lv-thread .sm-acts').count()===1,'Higher : ma vignette dans la conversation ; Telegram · WhatsApp sous la réponse');
  await pg.click('#lv-thread [data-wa]');
  await pg.click('#lv-thread [data-tg]');await pg.waitForFunction(()=>/press Start/.test(document.getElementById('lv-say-note').textContent),null,{timeout:4000}).catch(()=>{});
  const o=await pg.evaluate(()=>window.__ouvert);
  ok(o[0]==='https://wa.me/?text='+encodeURIComponent('I move before I think.\nDO: I put my shoes at the door now.\nWHY: Run the hill.')&&o[1]==='https://t.me/TotehmBot?start=c0de','WhatsApp = le geste (solution, DO, WHY) en partage wa.me ; Telegram non lié → TotehmBot ('+o.length+')');
  await pg.reload();await pg.waitForSelector('body.member');await pg.waitForTimeout(700);await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(1300);
  ok((await lv(pg)).sm===0&&await pg.locator('#lv-thread .sm-b').count()===0,'rechargée : la conversation repart de « Wassup ? » (rien n\'est gardé)');
  ok(!erreurs(log).length,'bas Higher : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 4 · À DROITE : le vêtement de Supabase, [Higher] dessus ; le papier tourne en haut ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables:{...tables,totehm_cloth_support:[{title:'Box Tee',image_url:'https://cdn.test/tee.png',logo_spot:{x:.5,y:.35,w:.28}}]},
    rpc:{my_landing:LAND()},functions:{'sso-mint':{code:CODE}},viewport:{width:1280,height:800},
    network:url=>url.host==='cdn.test'?{status:200,contentType:'image/png',body:PNG}:url.host==='www.totehm.space'?{status:200,contentType:'text/html',body:'<p>space</p>'}:null});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(800);
  await pg.click('#lcur-d');await pg.waitForTimeout(1600);
  const t1=await pg.$eval('#gate-card',e=>e.style.transform);await pg.waitForTimeout(300);
  const d=await pg.evaluate(()=>{const i=document.getElementById('lv-cloth').getBoundingClientRect(),s=document.querySelector('#lv-slogan svg').getBoundingClientRect(),
    p=document.getElementById('gate-asteroid').getBoundingClientRect();
    return {vue:window.__totehm_lv().vue,vet:window.__totehm_lv().vetement,img:document.getElementById('lv-cloth-img').classList.contains('is-on'),
      cls:document.getElementById('lv-slogan').className,spot:[i.left+i.width*.5,i.top+i.height*.35],s:[s.left+s.width/2,s.top+s.height/2],
      py:p.top+p.height/2,H:innerHeight,tf:document.getElementById('gate-card').style.transform,
      space:document.getElementById('lv-space').textContent,shop:document.getElementById('lv-shop').textContent};});
  ok(d.vue==='d'&&d.vet&&d.img&&log.rpc.length>=0,'→ : le vêtement du moment, lu dans totehm_cloth_support');
  ok(d.cls==='is-d'&&Math.abs(d.s[0]-d.spot[0])<8&&Math.abs(d.s[1]-d.spot[1])<8,'[Higher] se cale sur le vêtement, au point du logo ('+d.s.map(Math.round)+' / '+d.spot.map(Math.round)+')');
  ok(d.py<d.H*.25&&d.tf!==t1,'le papier est en haut, et il tourne (comme SPACE)');
  ok(/SPACE/.test(d.space)&&/Do with me/.test(d.space)&&/HIGHER BOUTIQUE/.test(d.shop)&&/luxury on quote/.test(d.shop),'SPACE et la boutique, de part et d\'autre, expliqués');
  await pg.screenshot({path:OUT+'/croix_droite.png'});
  await pg.click('#lv-go-space');await pg.waitForURL(/totehm\.space/,{timeout:6000}).catch(()=>{});
  ok(pg.url()==='https://www.totehm.space/#sso='+CODE&&log.functions.some(f=>f.name==='sso-mint'&&f.body.target==='space'),'Open SPACE : par le pont SSO → '+pg.url());
  ok(!erreurs(log).length,'droite : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 5 · LE TRACKPAD, LES QUATRE SENS ; la molette sur la manette ; le doigt ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND()},viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(800);
  const geste=async(dx,dy)=>{await pg.waitForTimeout(260);for(let i=0;i<4;i++){await pg.mouse.wheel(dx/4,dy/4);await pg.waitForTimeout(16);}await pg.waitForTimeout(1800);return (await lv(pg)).vue;};
  await pg.mouse.move(200,500);
  const suite=[];
  suite.push(await geste(0,-220));   // ↑ haut
  suite.push(await geste(0,220));    // ↓ centre
  suite.push(await geste(0,220));    // ↓ bas
  suite.push(await geste(0,-220));   // ↑ centre
  suite.push(await geste(-220,0));   // droite
  suite.push(await geste(220,0));    // centre
  suite.push(await geste(220,0));    // gauche (la recherche)
  await pg.mouse.move(1100,700);
  suite.push(await geste(-220,0));   // centre
  ok(suite.join(',')==='h,c,b,c,d,c,g,c','trackpad hors manette, quatre sens : '+suite.join(','));
  {await pg.waitForTimeout(260);await pg.mouse.wheel(0,-60);await pg.waitForTimeout(900);ok((await lv(pg)).vue==='c','un petit défilement (60 px) ne change pas de vue');}
  {const[x,y,w,h]=await R(pg,'#ljoy-box');await pg.mouse.move(x+w/2,y+h/2);await pg.mouse.wheel(0,40);await pg.waitForTimeout(1300);
   ok((await lv(pg)).vue==='b','la molette SUR la manette : comme le manche');await pg.mouse.wheel(0,-40);await pg.waitForTimeout(1300);}
  ok((await lv(pg)).vue==='c'&&!erreurs(log).length,'retour au centre ; aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND()},viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(800);
  const cdp=await pg.context().newCDPSession(pg);
  const glisse=async(x0,y0,x1,y1)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]});
    for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/6,y:y0+(y1-y0)*i/6}]});await pg.waitForTimeout(16);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pg.waitForTimeout(1800);return (await lv(pg)).vue;};
  const s=[await glisse(40,780,40,640),await glisse(40,640,40,780),await glisse(40,640,40,780),await glisse(40,780,40,640),await glisse(330,560,200,560),await glisse(200,560,330,560)];
  ok(s.join(',')==='b,c,h,c,d,c','le doigt, comme le Totehm déplié (glisser vers le haut descend) : '+s.join(','));
  ok(!erreurs(log).length,'doigt : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 6 · RETOUR DE STRIPE (?higher=paid) : la vue du bas, l'attente du webhook ──
 {let n=0;const SMF={ready:true,habit:true,objective:true,higher:false,free_total:7,free_left:0,left:0};
  const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:()=>(++n>=3?LAND({higher:{active:true},sm:{...SMF,higher:true,left:30}}):LAND({sm:SMF}))},viewport:{width:390,height:844}});
  await pg.goto(origin+'/totehm?higher=paid');await pg.waitForSelector('body.member');
  await pg.waitForFunction(()=>window.__totehm_lv().vue==='b',null,{timeout:4000}).catch(()=>{});
  ok(pg.url()===origin+'/totehm'&&/payment received/.test(await pg.textContent('#lv-say-note')),'?higher=paid : l\'adresse est nettoyée, la vue du bas s\'ouvre');
  await pg.waitForFunction(()=>window.__totehm_lv().higher,null,{timeout:8000}).catch(()=>{});
  ok((await lv(pg)).higher&&!(await pg.$eval('#lv-say',e=>e.classList.contains('hide'))),'le webhook arrive : la saisie s\'ouvre ('+n+' lectures de my_landing)');
  ok(!erreurs(log).length,'retour Stripe : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 7 · INVITÉ : en bas, se connecter avec son Totehm ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables:{},session:false,viewport:{width:390,height:844}});
  await pg.goto(origin+'/totehm');await pg.waitForTimeout(900);
  await pg.click('#lcur-b');await pg.waitForTimeout(1400);
  ok(await pg.locator('[data-sm-connect]').count()===1&&(await pg.textContent('[data-sm-connect]'))==='CONNECT WITH MY TOTEHM'&&await pg.locator('#lv-card:not(.hide)').count()===0,'invité : le concept, CONNECT WITH MY TOTEHM ; pas de carte au centre');
  ok(!erreurs(log).length,'invité : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 8 · LE TOTEHM DÉPLIÉ : le trackpad change de vue en haut ET en bas ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND()},viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(800);
  await pg.click('#lv-tap');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:6000}).catch(()=>{});await pg.waitForTimeout(1500);
  const v0=await pg.evaluate(()=>window.__totehm_zone.vue);
  await pg.mouse.move(640,420);
  await pg.waitForTimeout(300);for(let i=0;i<4;i++){await pg.mouse.wheel(0,55);await pg.waitForTimeout(16);}await pg.waitForTimeout(1400);
  const v1=await pg.evaluate(()=>window.__totehm_zone.vue);
  await pg.waitForTimeout(300);for(let i=0;i<4;i++){await pg.mouse.wheel(0,-55);await pg.waitForTimeout(16);}await pg.waitForTimeout(1400);
  const v2=await pg.evaluate(()=>window.__totehm_zone.vue);
  ok(v1!==v0&&v2===v0,'Totehm déplié : ↓ au trackpad change de vue, ↑ revient ('+v0+' → '+v1+' → '+v2+')');
  ok(!erreurs(log).length,'déplié : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 9 · figher.club : le THP en quatre pouvoirs ──
 {const{pg,log}=await page(browser,{dir:'club',origin:'https://www.figher.club',tables:{},session:false,viewport:{width:390,height:844}});
  await pg.goto('https://www.figher.club/get_higher');await pg.waitForTimeout(600);
  await pg.click('#down-trigger');await pg.waitForTimeout(400);
  const t=await pg.$$eval('#disc-stage .disc-block',l=>l.map(b=>b.textContent.replace(/\s+/g,' ').trim()));
  ok(/One paper\. ?Four powers/.test(t[0])&&/^A · Neurological performance.*EEG/.test(t[1])&&/^B · A digital artwork.*777,000/.test(t[2])&&/^C · Tradeable/.test(t[3])&&/^D · The key to luxury.*What it opens is what it is worth/.test(t[4]),
    'discover : A performance neurologique · B œuvre d\'art digitale · C tradeable · D la clé du luxe');
  ok(!t.join(' ').match(/invest/i),'jamais « investment » (MiCA) : la valeur se dit par ce que le THP ouvre');
  ok(!erreurs(log).length,'club : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
}finally{await browser.close();}
