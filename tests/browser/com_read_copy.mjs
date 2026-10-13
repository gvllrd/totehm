// 07/10/2026 — chercher un membre (13/10 : le banc, un nom → /@nom) + Subscribe, le Totehm lu (joystick en bas, une Box s'ouvre en place, COPY, spaces, loupe), le menu
// membre plein écran au format de higher.boutique. Tout est simulé : aucune écriture réelle.
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';const browser=await launch();const origin='https://www.totehm.com';
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const source={ok:true,pseudo:'studio',steps:[{t:'Deep practice',is:['focus'],f:'every_morning'},{t:'Run the hill',is:['fight']}],objs:{'Deep practice':['o1']},trips:[{id:'o1',text:'Build a practice',is:['focus']}],reps:[{id:71,text:'Put the phone away',is:['focus'],hs:['Deep practice']}],wisdom:[{id:'w1',text:'Attention is a choice',is:['focus']}],visions:[{id:'v1',text:'A focused life',is:['focus']}]};
const hs={ok:true,mine:false,habits:[{habit:'Deep practice',total:1,spaces:[{id:'s1',format:'space',state:'will',city:'Porto',starts_at:new Date(Date.now()+864e5).toISOString(),visibility:'shared'}]}]};
const rpc={my_console:{signed_in:true,offer:{enabled:false}},my_landing:{signed_in:true,pseudo:'wah',visibility:'private',offer:{enabled:false},higher:{active:false,price_cents:700,currency:'eur'},thp:false,subscriptions:1,subscribers:0},totehm_of:source,habit_spaces:b=>b.p_pseudo?hs:{ok:true,mine:true,habits:[]},
  totehm_search:b=>b.p_q?[{pseudo:'studio',offer:true,price_cents:2400,currency:'eur',subscribed:true},{pseudo:'atelier',offer:true,price_cents:3600,currency:'eur',subscribed:false}]:[{pseudo:'studio',offer:true,price_cents:2400,currency:'eur',subscribed:true}],
  totehm_import_boxes:b=>({ok:true,created:b.p_selection[0].kind==='h'?1:0,reused:b.p_selection[0].kind==='h'?0:1,total:1})};
try{
 /* ── 1 · 13/10 (lot B) : chercher un autre TOTEHM = le banc ; un nom → /@nom (son univers), déjà abonné → « subscribed » ── */
 {const {pg,log}=await page(browser,{dir:'com',origin,rpc,tables:{profiles:[{pseudo:'wah'}]}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  ok(/^(Tap|Click) to open it$/.test((await pg.textContent('#lv-tap')).trim())&&await pg.isVisible('#lv-tap'),'au centre : « Tap to open it » (« Click » à la souris)');
  await pg.click('#lv-find');await pg.waitForTimeout(600);
  const q=await pg.evaluate(()=>({v:document.getElementById('fish-q').value,ph:document.getElementById('fish-q').placeholder,rows:document.querySelectorAll('#fish-res .srch-row').length}));
  ok(q.v===''&&q.ph==='a name'&&q.rows<=1,'le banc : une recherche vide, « a name » (mes abonnements, au plus)');
  await pg.fill('#fish-q','stu');await pg.waitForFunction(()=>document.querySelectorAll('#fish-res .srch-row').length===2);
  const rows=await pg.$$eval('#fish-res .srch-row',l=>l.map(r=>({open:r.querySelector('.srch-open')?.getAttribute('href'),sub:r.querySelector('.srch-sub')?.getAttribute('href'),subT:r.querySelector('.srch-sub')?.textContent,meta:r.querySelector('.srch-meta')?.textContent})));
  ok(rows[0].open==='/@studio'&&rows[0].meta==='subscribed','on tape un nom : son univers (/@studio) ; déjà abonné → « subscribed »');
  ok(rows[1]&&rows[1].open==='/@atelier'&&/\/ year/.test(rows[1].meta||''),'un créateur : son univers porte la vente, le prix par an à côté ('+(rows[1]&&rows[1].meta)+')');
  await pg.screenshot({path:OUT+'/banc_search.png'});
  ok(!erreurs(log).length,'banc : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();
 }
 /* ── 3 · le Totehm d'un membre : joystick en bas, une Box s'ouvre en place, COPY, spaces, loupe ── */
 {const {pg,log}=await page(browser,{dir:'com',origin,rpc,tables:{profiles:[{pseudo:'wah'}]}});
  await pg.goto(origin+'/totehm?ro=studio');await pg.waitForSelector('body.ro:not(.gate)');await pg.waitForTimeout(600);
  const joy=await pg.$eval('#joy',e=>e.getBoundingClientRect().top),H=await pg.evaluate(()=>innerHeight);
  ok(joy>H*.7,'en lecture, le joystick est EN BAS ('+Math.round(joy)+' / '+H+' px)');
  ok(await pg.locator('#habits .copie').count()===2&&await pg.locator('#habits .loupe').count()===2,'chaque Box : COPY et la loupe');
  await pg.locator('#habits .copie').first().click();await pg.waitForFunction(()=>/Copied/.test(document.querySelector('#habits .copie').textContent));
  const c=log.rpc.find(x=>x.name==='totehm_import_boxes');
  ok(c&&c.body.p_pseudo==='studio'&&JSON.stringify(c.body.p_selection)==='[{"kind":"h","key":"Deep practice"}]','COPY : une RÉFÉRENCE au serveur (le texte de l\'habitude), jamais un contenu');
  ok(!(await pg.evaluate(()=>window.__totehm_zone?.boite_ouverte)),'copier n\'ouvre pas la Box');
  await pg.locator('#habits [data-open]').first().evaluate(e=>e.click());await pg.waitForTimeout(400);
  const open=await pg.evaluate(()=>({k:window.__totehm_zone?.boite_ouverte,spaces:document.querySelectorAll('#habits [data-space]').length,edit:document.querySelectorAll('#habits [contenteditable],#habits [data-kill],#habits [data-add],#habits [data-pk]').length,copied:document.querySelector('#habits .copie').classList.contains('is-done')}));
  ok(open.k==='h'&&open.spaces===1&&open.edit===0&&open.copied,'une Box s\'ouvre en place : ses liens, ses spaces, rien à modifier ; copiée, elle le reste (✓)');
  await pg.screenshot({path:OUT+'/ro_open_copy.png'});
  await pg.locator('#habits .w-x').first().evaluate(e=>e.click());await pg.waitForTimeout(200);
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(400);
  await pg.locator('#habits .copie').first().click();await pg.waitForFunction(()=>/Already/.test(document.querySelector('#habits .copie')?.textContent||''));
  const c2=log.rpc.filter(x=>x.name==='totehm_import_boxes')[1];
  ok(c2&&JSON.stringify(c2.body.p_selection)==='[{"kind":"t","key":"o1"}]','un objectif se copie par son id ; déjà à moi → « Already in my TOTEHM »');
  ok(!erreurs(log).length&&!log.rpc.some(x=>/rename|_create|_set|_delete|totehm_save/.test(x.name)),'lecture : aucune écriture sur le Totehm lu, aucune erreur');await pg.context().close();
 }
 /* ── 4 · l'espace membre (07/10) : plein écran, c'est l'utilisateur ; les boutons de higher.boutique ── */
 {const {pg,log}=await page(browser,{dir:'com',origin,rpc,tables:{profiles:[{pseudo:'wah'}]}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.click('#conn-bar');await pg.waitForTimeout(500);
  const m=await pg.evaluate(()=>{const w=document.getElementById('member-window').getBoundingClientRect(),a=[...document.querySelectorAll('#member-window .cm-action')].map(e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return {t:e.textContent.trim(),c:r.left+r.width/2,h:r.height,fs:cs.fontSize,ws:cs.whiteSpace,bg:cs.backgroundColor};});
    const outs=[...document.querySelectorAll('#mw-in-state > .mw-out')].map(e=>e.textContent.trim());return {w:w.width,h:w.height,W:innerWidth,H:innerHeight,bg:getComputedStyle(document.getElementById('member-window')).backgroundColor,a,outs,nom:!!document.querySelector('#member-window #name-btn')};});
  ok(m.w===m.W&&m.h===m.H&&m.bg==='rgb(0, 0, 0)','plein écran, noir');
  ok(m.a.length===4&&m.a.every(x=>Math.abs(x.c-m.W/2)<2&&x.h<48&&x.ws==='nowrap'&&x.fs==='12.5px'&&x.bg==='rgb(31, 31, 36)'),'quatre boutons centrés, sur une ligne, le bouton de la boutique : '+m.a.map(x=>x.t).join(' | '));
  ok(m.outs[m.outs.length-1]==='Simple terms of use'&&m.nom,'Simple terms of use en dernier ; le nom du Totehm y est revenu (13/10)');
  await pg.screenshot({path:OUT+'/member_menu.png',fullPage:true});
  ok(!erreurs(log).length,'menu membre : aucune erreur');await pg.context().close();
  const p2=await page(browser,{dir:'com',origin,rpc,tables:{profiles:[{pseudo:'wah'}]}});
  await p2.pg.goto(origin+'/creator');await p2.pg.waitForTimeout(800);await p2.pg.click('#member');await p2.pg.waitForTimeout(500);
  const r=await p2.pg.$eval('#menu',e=>{const b=e.getBoundingClientRect();return {w:b.width,h:b.height,W:innerWidth,H:innerHeight};});
  ok(r.w===r.W&&r.h===r.H&&await p2.pg.isVisible('#menu [data-menu-close]'),'/search : le même menu, plein écran, avec Close');
  await p2.pg.click('#menu [data-menu-close]');await p2.pg.waitForTimeout(450);
  ok(!(await p2.pg.$eval('#menu',e=>e.classList.contains('is-open'))),'Close le referme');await p2.pg.context().close();
 }
}finally{await browser.close();}
