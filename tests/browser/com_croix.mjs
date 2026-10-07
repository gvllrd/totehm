// COM · 07/10/2026 — la croix de l'atterrissage : cinq vues, une manette, les mêmes
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

 // ── 2 · EN BAS, sans abonnement Higher : le concept, le paiement ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND()},functions:{'higher-sub':{error:'not_ready'}},viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(800);
  await pg.click('#lcur-b');await pg.waitForTimeout(1400);
  const b=await pg.evaluate(()=>{const cs=s=>getComputedStyle(document.querySelector(s));
    const th=document.getElementById('gate-asteroid').getBoundingClientRect(),hd=document.getElementById('lv-thumb').getBoundingClientRect();
    return {vue:window.__totehm_lv().vue,cls:document.getElementById('lv-slogan').className,speak:cs('#lv-slogan .lvs-speak').opacity,self:cs('#lv-slogan .lvs-self').opacity,
      ff:[...document.querySelectorAll('#lv-thread .sm-b')].every(e=>/Quantico/.test(getComputedStyle(e).fontFamily)),dbl:cs('#lv-slogan2').opacity,social:document.querySelector('#lv-slogan2 .lvs-social').textContent,
      say:document.getElementById('lv-say').classList.contains('hide'),pitch:!!document.querySelector('#lv-thread .sm-pitch'),
      sub:document.querySelector('[data-sm-sub]')?.textContent,proof:document.querySelector('.sm-proof')?.textContent||'',
      bulles:[...document.querySelectorAll('#lv-thread .sm-b')].map(e=>[e.className,getComputedStyle(e).backgroundColor]),
      th:[th.left+th.width/2,th.top+th.height/2,th.width],hd:[hd.left+hd.width/2,hd.top+hd.height/2,hd.width],
      joy:document.getElementById('ljoy-say').textContent};});
  ok(b.vue==='b'&&b.cls==='is-b'&&b.speak==='1'&&b.self==='1'&&b.ff,'↓ : « Speak to your [Higher] Self » ; l\'échange en Quantico, des deux côtés');
  ok(b.dbl==='1'&&b.social==='your social media','le Higher se dédouble : [Higher] your social media');
  ok(Math.abs(b.th[0]-b.hd[0])<4&&Math.abs(b.th[1]-b.hd[1])<4&&b.th[2]<=b.hd[2]+2,'le papier devient la vignette du fil ('+Math.round(b.th[2])+' px)');
  ok(b.say&&b.pitch&&/^Get Higher Self · /.test(b.sub||'')&&/Gollwitzer/.test(b.proof),'sans abonnement : pas de saisie ; le concept, la preuve, « '+b.sub+' »');
  const coul={'k-habit':'rgb(51, 51, 102)','k-objective':'rgb(54, 73, 140)','k-repulsion':'rgb(116, 49, 105)'};
  const sm=b.bulles.filter(x=>/k-/.test(x[0])),moi=b.bulles.filter(x=>!/k-/.test(x[0]));
  ok(sm.length===3&&sm.every(x=>coul[x[0].split(' ').find(k=>k.startsWith('k-'))]===x[1])&&moi.length===3&&moi.every(x=>x[1]==='rgb(42, 42, 48)'),'trois couleurs de bulles (les Boxes) ; moi, en gris');
  ok(b.joy==='TotehmSM','la manette : « TotehmSM »');
  await pg.screenshot({path:OUT+'/croix_bas_pitch.png'});
  await pg.click('[data-sm-sub]');await pg.waitForFunction(()=>/opening soon/.test(document.getElementById('lv-say-note').textContent));
  ok(log.functions.some(f=>f.name==='higher-sub'&&f.body.action==='checkout'),'Get Higher Self : le checkout est demandé au serveur (prix absent → « opening soon »)');
  ok(!erreurs(log).length,'bas sans abonnement : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 3 · EN BAS, abonné Higher : le fil, l'envoi, Telegram, WhatsApp ──
 {const fil=[{id:2,role:'sm',kind:'habit',text:'I leave at 8:10.',created_at:'2026-10-07T08:00:00Z'},{id:1,role:'me',text:'I am always late.',created_at:'2026-10-07T07:59:00Z'}];
  const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND({higher:{active:true,price_cents:700,currency:'eur'},avatar:'data:image/jpeg;base64,AAAA'}),
      sm_thread:{ok:true,messages:fil,more:false},new_bot_link_code:'c0de'},
    functions:{'higher-self':b=>b.action==='say'?{ok:true,me:{id:3,role:'me',text:b.text},sm:{id:4,role:'sm',kind:'objective',text:'I run 10 km on 30 November.'},left:4}:{error:'not_linked'}},
    viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(800);await ouvre(pg);
  await pg.keyboard.press('ArrowDown');await pg.waitForFunction(()=>window.__totehm_lv().sm===2,null,{timeout:4000}).catch(()=>{});await pg.waitForTimeout(900);
  ok(!(await pg.$eval('#lv-say',e=>e.classList.contains('hide')))&&(await lv(pg)).sm===2&&await pg.locator('#lv-thread .sm-b').count()===2,'abonné : la saisie et mon fil (sm_thread)');
  ok(await pg.$eval('#lv-thread .sm-row.me .sm-av',e=>/data:image\/jpeg/.test(e.style.backgroundImage)),'ma vignette profil est dans la conversation');
  await pg.fill('#lv-say-in','One day I would like to run.');await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>window.__totehm_lv().envois===1,null,{timeout:4000}).catch(()=>{});
  const top=await pg.$eval('#lv-thread .sm-b',e=>[e.className,e.textContent]);
  ok(top[1]==='One day I would like to run.'&&await pg.$eval('#lv-thread .sm-b.k-objective',e=>e.textContent)==='I run 10 km on 30 November.'&&/4 left today/.test(await pg.textContent('#lv-say-note')),'Envoyer : ma phrase, puis son reflet en « Je » (bulle Objective) ; le quota se dit');
  ok(log.functions.some(f=>f.name==='higher-self'&&f.body.action==='say'&&f.body.text==='One day I would like to run.'),'le texte part au serveur (higher-self), jamais à OpenAI depuis la page');
  await pg.screenshot({path:OUT+'/croix_bas_fil.png'});
  await pg.click('[data-wa="4"]');
  await pg.click('[data-tg="4"]');await pg.waitForFunction(()=>/press Start/.test(document.getElementById('lv-say-note').textContent),null,{timeout:4000}).catch(()=>{});
  const o=await pg.evaluate(()=>window.__ouvert);
  ok(o[0]==='https://wa.me/?text='+encodeURIComponent('I run 10 km on 30 November.')&&o[1]==='https://t.me/TotehmBot?start=c0de','WhatsApp = partage wa.me ; Telegram non lié → TotehmBot avec un code ('+o.join(' · ')+')');
  ok(!erreurs(log).length,'bas abonné : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

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
 {let n=0;const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:()=>(++n>=3?LAND({higher:{active:true}}):LAND()),sm_thread:{ok:true,messages:[],more:false}},viewport:{width:390,height:844}});
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
