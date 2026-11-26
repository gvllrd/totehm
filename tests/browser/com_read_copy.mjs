// 07/10/2026 — chercher un membre (20/10 sexies : MEMBERS, le papier agrandi sur son dos ; un nom → son écosystème) + Subscribe, le Totehm lu (joystick en bas, une Box s'ouvre en place, COPY, spaces, loupe), le menu
// membre plein écran au format de higher.boutique. Tout est simulé : aucune écriture réelle.
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';const browser=await launch();const origin='https://www.totehm.com';
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const source={ok:true,pseudo:'studio',habits:[{t:'Deep practice',is:['focus'],f:'every_morning'},{t:'Run the hill',is:['fight']}],objs:{'Deep practice':['o1']},objectives:[{id:'o1',text:'Build a practice',is:['focus']}],repulsions:[{id:71,text:'Put the phone away',is:['focus'],hs:['Deep practice']}],stories:[{id:'w1',text:'Attention is a choice',is:['focus']}],visions:[{id:'v1',text:'A focused life',is:['focus']}]};
/* 16/10 : il n'y a plus de spaces, seulement des SPOTS — une Habit lue montre donc ses spots. */
const hs={ok:true,mine:false,habits:[{habit:'Deep practice',total:1,total_spaces:0,total_spots:1,spaces:[],
  spots:[{id:'s1',format:'spot',state:'will',city:'Porto',starts_at:new Date(Date.now()+864e5).toISOString(),audience:'figher'}]}]};
const rpc={figher_access:{signed_in:true,member:true},   /* 18/11 : la recherche est au Figher Club */
  my_console:{signed_in:true,offer:{enabled:false}},my_landing:{signed_in:true,pseudo:'wah',visibility:'private',offer:{enabled:false},higher:{active:false,price_cents:700,currency:'eur'},thp:false,subscriptions:1,subscribers:0},totehm_read:source,habit_spaces:b=>b.p_pseudo?hs:{ok:true,mine:true,habits:[]},
  totehm_search:b=>b.p_q?[{pseudo:'studio',offer:true,price_cents:2400,currency:'eur',subscribed:true},{pseudo:'atelier',offer:true,price_cents:3600,currency:'eur',subscribed:false}]:[{pseudo:'studio',offer:true,price_cents:2400,currency:'eur',subscribed:true}],
  totehm_import_boxes:b=>({ok:true,created:b.p_selection[0].kind==='h'?1:0,reused:b.p_selection[0].kind==='h'?0:1,total:1})};
try{
 /* ── 1 · 14/11 : L'ÉCOSYSTÈME D'UN MEMBRE S'HABITE PAR SON ATTERRISSAGE ──
    Wah : « ce que l'on recherche ce n'est pas le TOTEHM mais l'ÉCOSYSTÈME, et l'écosystème est visible via
    la page d'atterrissage et le Tree » · « quand on est abonné, le verso redevient recto AVEC LE TREE et la
    page d'atterrissage du membre, avec ses vues respectives ». Donc `?ro=` arrive sur SON atterrissage —
    jamais dans son Totehm déployé —, et [Members] retourne le TOTEHM sur son verso, en mode recherche (18/11). */
 {const {pg,log}=await page(browser,{dir:'com',origin,rpc:Object.assign({},rpc,{member_media:{ok:true,items:[]},club_spots_of:{ok:true,items:[]}}),tables:{profiles:[{pseudo:'wah'}]}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(700);
  ok(await pg.locator('#lv-actions button:visible').count()===4&&!await pg.isVisible('#lv-m-sel'),'au centre : quatre actions, avec une touche dédiée à la recherche');
  await pg.evaluate(()=>{window.__ouvert=[];window.open=(u)=>{window.__ouvert.push(u);return null;};});
  /* 18/11 (Wah) : [Members] retourne le TOTEHM sur son verso, en mode recherche — un verso VIERGE, pas le mien */
  await pg.click('#lv-search');
  await pg.waitForFunction(()=>{const c=window.__totehm_cherche&&window.__totehm_cherche();return c&&c.ouvert;},null,{timeout:8000}).catch(()=>{});
  const q=await pg.evaluate(()=>({onglets:window.__ouvert.slice(),saisie:document.activeElement&&document.activeElement.id,dos:document.getElementById('ast-name').textContent,gx:!!document.getElementById('gx-q')}));
  ok(q.onglets.length===0&&q.saisie==='mb-q'&&q.dos===''&&!q.gx,
     '[Members] : le verso en mode recherche, la saisie prête, aucun onglet, ni mon nom au dos → '+JSON.stringify(q));
  await pg.keyboard.press('Escape');await pg.waitForFunction(()=>!document.getElementById('srch').classList.contains('is-on'),null,{timeout:8000}).catch(()=>{});
  await pg.goto(origin+'/totehm?ro=studio');await pg.waitForSelector('body.member');
  await pg.waitForFunction(()=>document.body.classList.contains('lv-membre'),null,{timeout:9000}).catch(()=>{});await pg.waitForTimeout(1200);
  const e=await pg.evaluate(()=>({who:document.getElementById('lv-m-who').textContent,ro:document.body.classList.contains('ro'),
    gate:document.body.classList.contains('gate'),actions:[...document.querySelectorAll('#lv-actions button')].filter(b=>b.getClientRects().length).map(b=>b.getAttribute('aria-label'))}));
  ok(e.who==='studio'&&e.ro&&e.gate&&e.actions.join('|')==='Open this TOTEHM|Search a TOTEHM'&&await pg.isVisible('#lv-m-sel')&&/[?&]ro=studio/.test(pg.url()),
     '`?ro=studio` : son atterrissage en lecture, avec retour à Mine → '+e.actions.join(' | '));
  ok(log.rpc.filter(x=>x.name==='totehm_read').length===1&&log.rpc.some(x=>x.name==='member_media'&&x.body.p_pseudo==='studio'),'une lecture de son Totehm, une de ses médias (`member_media`)');
  await pg.screenshot({path:OUT+'/members_search.png'});
  ok(!erreurs(log).length,'members : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();
 }
 /* ── 3 · le Totehm d'un membre : joystick en bas, une Box s'ouvre en place, COPY, spaces, loupe ── */
 {const {pg,log}=await page(browser,{dir:'com',origin,rpc,tables:{profiles:[{pseudo:'wah'}]}});
  await pg.goto(origin+'/totehm?ro=studio#in');await pg.waitForSelector('body.ro:not(.gate)');await pg.waitForTimeout(600);
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
  /* 25/10 (Wah) : dans le Totehm déployé, la manette = celle de l'atterrissage. 13/11 : un gros point de la couleur de la vue
     et trois points verticaux dedans (objectifs · habitudes · répulsions), celui de la vue où l'on est fondu dedans. */
  const manette=()=>pg.evaluate(()=>{const b=document.querySelector('#joy-box'),c=b.querySelector('.k2j-c'),s=getComputedStyle(c),i=document.querySelectorAll('#joy-stack i');
    return {w:b.getBoundingClientRect().width,bg:s.backgroundImage.slice(0,15),
      rond:s.borderRadius==='50%',n:i.length,cap:getComputedStyle(b).getPropertyValue('--k2j-c').trim(),courant:[...i].map(e=>getComputedStyle(e).opacity).join('|'),
      morts:[...document.querySelectorAll('#joy .cur.mort')].every(e=>getComputedStyle(e).opacity==='0')};});
  const mh=await manette();
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(400);
  await pg.locator('#habits .copie').first().click();await pg.waitForFunction(()=>/Already/.test(document.querySelector('#habits .copie')?.textContent||''));
  const c2=log.rpc.filter(x=>x.name==='totehm_import_boxes')[1];
  ok(c2&&JSON.stringify(c2.body.p_selection)==='[{"kind":"t","key":"o1"}]','un objectif se copie par son id ; déjà à moi → « Already in my TOTEHM »');
  await pg.waitForTimeout(500);const mo=await manette();
  ok(mh.w===64&&mh.rond&&mh.n===3&&mh.morts,
     '26/11 · le manche du Totehm déployé = le DÔME de l\'atterrissage (64 px), trois points verticaux dedans '+JSON.stringify(mh));
  ok(mh.cap==='#333366'&&mo.cap==='#36498c','25/10 · le capuchon prend la couleur de la vue (habitudes '+mh.cap+' → objectifs '+mo.cap+')');
  ok(mh.courant==='1|0|1'&&mo.courant==='0|1|1','13/11 · le point de la vue où l\'on est se fond dans le gros point (habitudes '+mh.courant+' → objectifs '+mo.courant+')');
  /* 24/10 (Wah) : le trackpad qui change de vue POUSSE le manche, qui revient ensuite au centre. */
  await pg.mouse.move(200,Math.round(H*.45));await pg.mouse.wheel(90,0);await pg.waitForTimeout(70);
  const mx=await pg.$eval('#joy-box',e=>parseFloat(e.style.getPropertyValue('--mx'))||0);
  await pg.waitForTimeout(800);
  const mz=await pg.$eval('#joy-box',e=>parseFloat(e.style.getPropertyValue('--mx'))||0);
  ok(mx<0&&Math.abs(mz)<0.5,'24/10 · le trackpad pousse le manche vers sa vue, puis il revient au centre ('+mx+' → '+mz+')');
  ok(!erreurs(log).length&&!log.rpc.some(x=>/rename|_create|_set|_delete|totehm_save/.test(x.name)),'lecture : aucune écriture sur le Totehm lu, aucune erreur');await pg.context().close();
 }
 /* ── 3 ter · 25/10 (Wah : « les scroll des listes sur l'axe vertical, c'est inversé ») : au DOIGT, dans la liste, le geste suit le
    défilement ; la manette reste un manche ── */
 {const {pg,ctx}=await page(browser,{dir:'com',origin,rpc,tables:{profiles:[{pseudo:'wah'}]},viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm?ro=studio#in');await pg.waitForSelector('body.ro:not(.gate)');await pg.waitForTimeout(900);
  const mobile=await pg.evaluate(()=>{const joy=document.querySelector('#joy'),r=joy.getBoundingClientRect(),liste=document.querySelector('#fv-inner').getBoundingClientRect();
    return {droite:innerWidth-r.right,bas:innerHeight-r.bottom,gap:parseFloat(getComputedStyle(joy).gap),marge:r.top-liste.bottom};});
  ok(mobile.droite===8&&mobile.bas===8&&mobile.gap===8&&mobile.marge===10,'téléphone : manette compacte dans le coin, liste dégagée → '+JSON.stringify(mobile));
  const cdp=await ctx.newCDPSession(pg);
  const vue=()=>pg.$eval('#joy',e=>(e.className.match(/v-(\w+)/)||[])[1]);
  const glisse=async(sel,dy)=>{const p=await pg.$eval(sel,e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});const a=await vue();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});
    for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y+dy*i/8}]});await pg.waitForTimeout(16);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pg.waitForTimeout(900);return a+'>'+await vue();};
  const liste=[await glisse('#fv-inner',-160),await glisse('#fv-inner',160),await glisse('#fv-inner',160),await glisse('#fv-inner',-160)];
  ok(liste.join(' | ')==='habits>repulsions | repulsions>habits | habits>objectives | objectives>habits','25/10 · au doigt, dans la liste : plus bas que le bas → les répulsions, plus haut que le haut → les objectifs → '+liste.join(' | '));
  const manche=[await glisse('#joy-box',-30),await glisse('#joy-box',30),await glisse('#joy-box',30),await glisse('#joy-box',-30)];
  ok(manche.join(' | ')==='habits>objectives | objectives>habits | habits>repulsions | repulsions>habits','25/10 · au doigt, la manette reste un manche (tirée vers le haut → la vue du haut) → '+manche.join(' | '));
  await ctx.close();
 }
 /* ── 3 bis · 26/11 (Wah : « le joystick dans le TOTEHM en bas à DROITE ») : sur ordinateur, la manette vit DANS le carré, calée dans son coin bas droit, hors des perforations ── */
 {const {pg}=await page(browser,{dir:'com',origin,rpc,tables:{profiles:[{pseudo:'wah'}]},viewport:{width:1280,height:800}});
  await pg.goto(origin+'/totehm?ro=studio#in');await pg.waitForSelector('body.ro:not(.gate)');await pg.waitForTimeout(600);
  const m=await pg.evaluate(()=>{const s=document.querySelector('#stage').getBoundingClientRect(),j=document.querySelector('#joy').getBoundingClientRect();
    /* Les cases vides de la grille ne dessinent rien. On mesure le manche et les quatre touches. */
    const r=s.width*0.0619, tr=[];
    [.25,.5,.75].forEach(f=>{ tr.push([s.left+s.width*f,s.top],[s.left+s.width*f,s.bottom],
      [s.left,s.top+s.height*f],[s.right,s.top+s.height*f]); });
    const touches=[...document.querySelectorAll('#joy > *')].map(el=>el.getBoundingClientRect());
    const touche=touches.some(t=>tr.some(([x,y])=>Math.hypot(Math.max(t.left-x,x-t.right,0),Math.max(t.top-y,y-t.bottom,0))<r));
    return {dans:j.right<=s.right+1&&j.bottom<=s.bottom+1&&j.left>=s.left&&j.top>=s.top,
      dBas:Math.round(s.bottom-j.bottom),dDroite:Math.round(s.right-j.right),
      surUnTrou:touche, carre:Math.round(s.width),gap:parseFloat(getComputedStyle(document.querySelector('#joy')).gap)};});
  ok(m.dans&&m.dBas===10&&m.dDroite===10&&!m.surUnTrou&&m.carre===640&&m.gap===8,
     '26/11 · ordinateur 1280×800 : la manette DANS le carré, dans son coin bas droit, hors des perforations '+JSON.stringify(m));
  /* 25/10 (Wah : « le joystick ne marche pas bien pour l'axe vertical ») : un geste de trackpad ET son inertie (≈ 1 s)
     faisaient sauter deux vues. 8 événements « doigt » de 30 px, puis 40 d'inertie qui décroissent. */
  const vue=()=>pg.$eval('#joy',e=>(e.className.match(/v-(\w+)/)||[])[1]);
  const geste=async(sur,signe)=>{const p=sur==='dehors'?[60,400]:await pg.$eval(sur==='joy'?'#joy-box':'#fv-inner',e=>{const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];});
    /* 12/11 — la liste est PLUS HAUTE depuis que les intitulés se voient : on la pose d'abord sur son bord,
       puisque la règle qu'on mesure est « plus bas que le BAS → la vue du dessous », pas « 280 px suffisent ». */
    if(sur==='liste'){await pg.evaluate(d=>{const e=document.querySelector('#fv-inner');if(e)e.scrollTop=d>0?e.scrollHeight:0;},signe);await pg.waitForTimeout(120);}
    await pg.mouse.move(p[0],p[1]);const vus=[await vue()];
    for(let i=0;i<48;i++){await pg.mouse.wheel(0,signe*(i<8?30:Math.max(1,Math.round(30*Math.pow(.93,i-8)))));await pg.waitForTimeout(16);
      const v=await vue();if(v!==vus[vus.length-1])vus.push(v);}
    await pg.waitForTimeout(700);return vus.join('>');};
  const parcours={};for(const sur of ['joy','dehors','liste']){parcours[sur]=[];for(const s of [1,-1,-1,1])parcours[sur].push(await geste(sur,s));}
  const manche='habits>objectives | objectives>habits | habits>repulsions | repulsions>habits';
  ok(parcours.joy.join(' | ')===manche&&parcours.dehors.join(' | ')===manche,'25/10 · au trackpad, un geste (inertie comprise) = UNE vue ; sur la manette et hors de la liste, un manche (deux doigts vers le haut → la vue du haut) → '+parcours.joy.join(' | ')+' // '+parcours.dehors.join(' | '));
  /* 25/10 (Wah : « les scroll des listes sur l'axe vertical, c'est inversé ») : DANS la liste, le geste suit le défilement —
     plus bas que le bas des habitudes → les répulsions, plus haut que le haut → les objectifs. */
  ok(parcours.liste.join(' | ')==='habits>repulsions | repulsions>habits | habits>objectives | objectives>habits','25/10 · dans la liste, le geste suit le défilement → '+parcours.liste.join(' | '));
  await pg.context().close();
 }
 /* ── 4 · l'espace membre (07/10) : plein écran, c'est l'utilisateur ; les boutons de higher.boutique ── */
 {const {pg,log}=await page(browser,{dir:'com',origin,rpc,tables:{profiles:[{pseudo:'wah'}]}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);await pg.locator('#gate-enter').press('ArrowRight');await pg.mouse.move(4,4);await pg.waitForTimeout(2200);
  const m=await pg.evaluate(()=>{const w=document.getElementById('member-window').getBoundingClientRect(),a=[...document.querySelectorAll('#member-window #mw-menu .vs-act')].map(e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return {t:e.textContent.trim(),c:r.left+r.width/2,h:r.height,fs:cs.fontSize,ws:cs.whiteSpace,bg:cs.backgroundColor};});
    const outs=[...document.querySelectorAll('#mw-in-state .vs-foot .vs-acc:not([hidden]),#mw-in-state .vs-foot .mw-terms')].map(e=>e.textContent.trim());return {w:w.width,h:w.height,W:innerWidth,H:innerHeight,dansVerso:!!document.querySelector('#srch #member-window'),statique:getComputedStyle(document.getElementById('member-window')).position==='static',a,outs,nom:!!document.querySelector('#member-window #name-btn'),verso:!!document.querySelector('#srch #name-btn')};});
  ok(m.w>0&&m.dansVerso&&m.statique,'l\'espace membre vit dans le verso du papier (15/10 bis) — plus une fenêtre plein écran');
  ok(m.a.length===2&&m.a.every(x=>x.h<48&&x.ws==='nowrap'&&x.bg==='rgb(31, 31, 36)'),'Higher et TotehmBot : une ligne chacun, UN geste gris (20/10) : '+m.a.map(x=>x.t).join(' | '));
  ok(m.outs[m.outs.length-1]==='Simple terms of use'&&!m.nom&&m.verso,'Simple terms of use en dernier ; le nom du Totehm vit au verso (mes réglages, 15/10), plus dans le compte');
  await pg.screenshot({path:OUT+'/member_menu.png',fullPage:true});
  ok(!erreurs(log).length,'menu membre : aucune erreur');await pg.context().close();
  /* 14/11 : /search n'a PLUS de menu — son coin membre mène à son TOTEHM. */
  const p2=await page(browser,{dir:'com',origin,rpc,tables:{profiles:[{pseudo:'wah'}]}});
  await p2.pg.goto(origin+'/search');await p2.pg.waitForTimeout(800);
  ok(await p2.pg.locator('#menu,.cm-menu').count()===0,'/search : aucun menu');
  await p2.pg.context().close();
 }
}finally{await browser.close();}
