// 07/10/2026 — chercher un membre (20/10 sexies : MEMBERS, le papier agrandi sur son dos ; un nom → son écosystème) + Subscribe, le Totehm lu (joystick en bas, une Box s'ouvre en place, COPY, spaces, loupe), le menu
// membre plein écran au format de higher.boutique. Tout est simulé : aucune écriture réelle.
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';const browser=await launch();const origin='https://www.totehm.com';
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const source={ok:true,pseudo:'studio',steps:[{t:'Deep practice',is:['focus'],f:'every_morning'},{t:'Run the hill',is:['fight']}],objs:{'Deep practice':['o1']},trips:[{id:'o1',text:'Build a practice',is:['focus']}],reps:[{id:71,text:'Put the phone away',is:['focus'],hs:['Deep practice']}],wisdom:[{id:'w1',text:'Attention is a choice',is:['focus']}],visions:[{id:'v1',text:'A focused life',is:['focus']}]};
/* 16/10 : il n'y a plus de spaces, seulement des SPOTS — une Habit lue montre donc ses spots. */
const hs={ok:true,mine:false,habits:[{habit:'Deep practice',total:1,total_spaces:0,total_spots:1,spaces:[],
  spots:[{id:'s1',format:'spot',state:'will',city:'Porto',starts_at:new Date(Date.now()+864e5).toISOString(),audience:'figher'}]}]};
const rpc={my_console:{signed_in:true,offer:{enabled:false}},my_landing:{signed_in:true,pseudo:'wah',visibility:'private',offer:{enabled:false},higher:{active:false,price_cents:700,currency:'eur'},thp:false,subscriptions:1,subscribers:0},totehm_of:source,habit_spaces:b=>b.p_pseudo?hs:{ok:true,mine:true,habits:[]},
  totehm_search:b=>b.p_q?[{pseudo:'studio',offer:true,price_cents:2400,currency:'eur',subscribed:true},{pseudo:'atelier',offer:true,price_cents:3600,currency:'eur',subscribed:false}]:[{pseudo:'studio',offer:true,price_cents:2400,currency:'eur',subscribed:true}],
  totehm_import_boxes:b=>({ok:true,created:b.p_selection[0].kind==='h'?1:0,reused:b.p_selection[0].kind==='h'?0:1,total:1})};
try{
 /* ── 1 · 20/10 sexies : chercher un autre TOTEHM = MEMBERS ; le papier grandit, on tape son nom sur son dos → SON écosystème ── */
 {const {pg,log}=await page(browser,{dir:'com',origin,rpc:Object.assign({},rpc,{member_media:{ok:true,items:[]},club_spots_of:{ok:true,items:[]}}),tables:{profiles:[{pseudo:'wah'}]}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  ok(/^(Tap|Click) to open it · (Swipe|Turn) to configure it$/.test((await pg.textContent('#lv-tap')).trim())&&await pg.isVisible('#lv-tap'),'au centre : « Tap to open it · Turn to configure it » (15/10 bis)');
  await pg.click('#lv-m-members');await pg.waitForTimeout(1500);
  const q=await pg.evaluate(()=>({v:document.getElementById('mb-q').value,ph:document.getElementById('mb-q').placeholder,f:document.activeElement.id,gx:!!document.getElementById('gx-q')}));
  ok(q.v===''&&q.ph==="a member's TOTEHM"&&q.f==='mb-q'&&!q.gx,'[Members] : plus de galaxie, une saisie vide sur le dos du papier, « a member\'s TOTEHM », le focus déjà là');
  await pg.fill('#mb-q','@studio');await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>document.body.classList.contains('lv-membre'),null,{timeout:8000}).catch(()=>{});await pg.waitForTimeout(1200);
  const e=await pg.evaluate(()=>({who:document.getElementById('lv-m-who').textContent,ro:document.body.classList.contains('ro'),tap:document.getElementById('lv-tap').textContent.trim()}));
  ok(e.who==='studio'&&e.ro&&/(Swipe|Turn) to search$/.test(e.tap)&&/[?&]ro=studio/.test(pg.url()),'« @studio » ↵ : on vit SON écosystème (« '+e.tap+' »), sur place');
  ok(log.rpc.filter(x=>x.name==='totehm_of').length===1&&log.rpc.some(x=>x.name==='member_media'&&x.body.p_pseudo==='studio'),'une lecture de son Totehm, une de ses médias (`member_media`)');
  await pg.screenshot({path:OUT+'/members_search.png'});
  ok(!erreurs(log).length,'members : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();
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
  ok(open.k==='h'&&open.spaces===1&&open.edit===0&&open.copied,'une Box s\'ouvre en place : ses liens, ses SPOTS, rien à modifier ; copiée, elle le reste (✓)');
  await pg.screenshot({path:OUT+'/ro_open_copy.png'});
  await pg.locator('#habits .w-x').first().evaluate(e=>e.click());await pg.waitForTimeout(200);
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(400);
  await pg.locator('#habits .copie').first().click();await pg.waitForFunction(()=>/Already/.test(document.querySelector('#habits .copie')?.textContent||''));
  const c2=log.rpc.filter(x=>x.name==='totehm_import_boxes')[1];
  ok(c2&&JSON.stringify(c2.body.p_selection)==='[{"kind":"t","key":"o1"}]','un objectif se copie par son id ; déjà à moi → « Already in my TOTEHM »');
  /* 24/10 (Wah) : le trackpad qui change de vue POUSSE le manche, qui revient ensuite au centre. */
  await pg.mouse.move(200,Math.round(H*.45));await pg.mouse.wheel(90,0);await pg.waitForTimeout(70);
  const mx=await pg.$eval('#joy-stack',e=>parseFloat(e.style.getPropertyValue('--mx'))||0);
  await pg.waitForTimeout(800);
  const mz=await pg.$eval('#joy-stack',e=>parseFloat(e.style.getPropertyValue('--mx'))||0);
  ok(mx<0&&Math.abs(mz)<0.5,'24/10 · le trackpad pousse le manche vers sa vue, puis il revient au centre ('+mx+' → '+mz+')');
  ok(!erreurs(log).length&&!log.rpc.some(x=>/rename|_create|_set|_delete|totehm_save/.test(x.name)),'lecture : aucune écriture sur le Totehm lu, aucune erreur');await pg.context().close();
 }
 /* ── 4 · l'espace membre (07/10) : plein écran, c'est l'utilisateur ; les boutons de higher.boutique ── */
 {const {pg,log}=await page(browser,{dir:'com',origin,rpc,tables:{profiles:[{pseudo:'wah'}]}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);await pg.click('#lv-tap-turn');await pg.mouse.move(4,4);await pg.waitForTimeout(2200);
  const m=await pg.evaluate(()=>{const w=document.getElementById('member-window').getBoundingClientRect(),a=[...document.querySelectorAll('#member-window #mw-menu .vs-act')].map(e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return {t:e.textContent.trim(),c:r.left+r.width/2,h:r.height,fs:cs.fontSize,ws:cs.whiteSpace,bg:cs.backgroundColor};});
    const outs=[...document.querySelectorAll('#mw-in-state .vs-foot .vs-acc:not([hidden]),#mw-in-state .vs-foot .mw-terms')].map(e=>e.textContent.trim());return {w:w.width,h:w.height,W:innerWidth,H:innerHeight,dansVerso:!!document.querySelector('#srch #member-window'),statique:getComputedStyle(document.getElementById('member-window')).position==='static',a,outs,nom:!!document.querySelector('#member-window #name-btn'),verso:!!document.querySelector('#srch #name-btn')};});
  ok(m.w>0&&m.dansVerso&&m.statique,'l\'espace membre vit dans le verso du papier (15/10 bis) — plus une fenêtre plein écran');
  ok(m.a.length===2&&m.a.every(x=>x.h<48&&x.ws==='nowrap'&&x.bg==='rgb(31, 31, 36)'),'Higher et TotehmBot : une ligne chacun, UN geste gris (20/10) : '+m.a.map(x=>x.t).join(' | '));
  ok(m.outs[m.outs.length-1]==='Simple terms of use'&&!m.nom&&m.verso,'Simple terms of use en dernier ; le nom du Totehm vit au verso (mes réglages, 15/10), plus dans le compte');
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
