// COM · 15/10/2026 — DANS LE TOTEHM : la vue liste ne change pas ; la vue SHORTS montre UNE Habit par écran, sa boîte
// telle quelle (attributs, couleurs, liens), son média devant (le plus récent de ses fichiers, sinon la photo d'un de
// ses spaces) ; sans média, son papier et ses intentions. La bascule garde l'Habit courante et s'anime ; ↑ ↓ vont
// d'une Habit à l'autre. Capturer et importer DEPUIS l'élément (photo · vidéo · fichier) : privé (`element-media`),
// rattaché à l'élément (`element_media_add`), retiré par `element_media_remove` ; une Habit renommée garde ses fichiers
// (`element_media_rekey`), supprimée les emporte. En lecture : rien de tout ça. Tout est simulé.
// LANCER : node com_shorts.mjs /tmp
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight']},{t:'Read at dawn',t0:'Read at dawn',is:['focus','love']},{t:'Call mum',t0:'Call mum',is:['love']}];
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]};
const LAND={signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false},higher:{active:false,price_cents:700,currency:'eur'},thp:false,subscriptions:0,subscribers:0};
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const sh=pg=>pg.evaluate(()=>window.__totehm_sh());
const ici=pg=>pg.evaluate(()=>document.querySelector('#habits .sh.is-ici')?.querySelector('.v-name')?.textContent||null);
function serveur(){
  let items=[{id:'m1',kind:'h',ref:'Run the hill',path:UID+'/m-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',mime:'image/jpeg',bytes:1200,name:'hill.jpg',created_at:'2026-10-15T10:00:00Z'}],n=1;
  return {
    element_media_list:()=>({ok:true,items}),
    element_media_add:b=>{ if(!/^[0-9a-f-]{36}\/m-[0-9a-f-]{36}\.[a-z0-9]{2,5}$/.test(b.p_path)) return {ok:false,why:'path'};
      const id='m'+(++n); items=[{id,kind:b.p_kind,ref:b.p_ref,path:b.p_path,mime:b.p_mime,bytes:b.p_bytes,name:b.p_name},...items]; return {ok:true,id,mime:b.p_mime,bytes:b.p_bytes}; },
    element_media_remove:b=>{ const m=items.find(x=>x.id===b.p_id); items=items.filter(x=>x.id!==b.p_id); return m?{ok:true,path:m.path}:{ok:false,why:'not_mine'}; },
    element_media_rekey:b=>{ let k=0; items.forEach(m=>{ if(m.kind==='h'&&m.ref===b.p_old){ m.ref=b.p_new; k++; } }); return k; },
    my_trips:{signed_in:true,trips:[{id:'o1',text:'Ship it',is:['express']}],reps:[],wisdom:[],visions:[]},
    habit_spaces:{ok:true,mine:true,habits:[{habit:'Call mum',total:1,total_spaces:1,total_spots:0,spaces:[{id:'sp1',format:'space',photo:UID+'/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg',starts_at:'2026-10-12T08:00:00Z'}],spots:[]}]},
    element_cloths:{ok:true,mine:true,elements:[]},my_visions:{ok:true,visions:[]},my_landing:LAND};
}
const ouvrirTotehm=async pg=>{await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(800);
  await pg.click('#lv-tap');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});await pg.waitForTimeout(1300);};
const browser=await launch();
try{
 for(const [vp,tel] of [[{width:390,height:844},true],[{width:1280,height:800},false]]){
  const nom=tel?'téléphone':'ordinateur';
  const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:vp,hasTouch:tel,rpc:serveur()});
  await pg.route(/\/storage\/v1\/object\/sign\//,r=>r.request().method()==='GET'?r.fulfill({status:200,contentType:'image/png',body:PNG}):r.fallback());
  await pg.addInitScript(()=>{window.__ouvert=[];window.open=(u)=>{window.__ouvert.push(u);return {location:{set href(x){window.__ouvert.push(x);}},close(){}};};});
  await ouvrirTotehm(pg);
  // ── la liste ne change pas ; la bascule vit à côté de la manette ──
  const l0=await pg.evaluate(()=>({rows:document.querySelectorAll('#habits > .habit[data-row]').length,sh:document.querySelectorAll('#habits .sh').length,
    btn:getComputedStyle(document.getElementById('vmode')).display,lbl:document.getElementById('vmode').getAttribute('aria-label')}));
  ok(l0.rows===3&&l0.sh===0&&l0.btn==='flex'&&l0.lbl==='Shorts',nom+' · la liste telle quelle (3 Habits) ; la bascule « Shorts » à côté de la manette');
  // l'Habit courante (ouverte) est gardée par la bascule
  await pg.locator('#habits [data-open="h:'+(await pg.evaluate(()=>[...document.querySelectorAll('#habits > .habit[data-row]')][1].dataset.row))+'"]').evaluate(e=>e.click());await pg.waitForTimeout(300);
  await pg.click('#vmode');await pg.waitForTimeout(250);
  const anim=await pg.evaluate(()=>document.getElementById('habits').getAnimations().length);
  await pg.waitForTimeout(900);
  const s1=await pg.evaluate(()=>{const sc=document.getElementById('fv-inner'),l=[...document.querySelectorAll('#habits .sh')],cs=getComputedStyle(sc);
    return {n:l.length,h:l.map(e=>Math.round(e.getBoundingClientRect().height)),root:sc.clientHeight,snap:cs.scrollSnapType,
      boites:l.map(e=>e.querySelector('.habit[data-row] .v-name')?.textContent),img:!!l[0].querySelector('.sh-m img[src]'),
      vide:!!l[1].querySelector('.sh-none'),traits:[...l[1].querySelectorAll('.sh-ints i')].map(i=>getComputedStyle(i).backgroundColor),cap:!!l[1].querySelector('.sh-none [data-cap]'),
      space:!!l[2].querySelector('.sh-m img[data-b="moments"]'),tick:getComputedStyle(l[0].querySelector('.habit .tick')).opacity};});
  ok(anim>=1,'la bascule liste → shorts s\'anime');
  ok(s1.n===3&&s1.h.every((x,i)=>i===1?x>=s1.root-2:Math.abs(x-s1.root)<=2)&&/y mandatory/.test(s1.snap),'shorts : UNE Habit par écran (la hauteur de la liste ; l\'ouverte grandit avec sa boîte), le défilement aimanté '+s1.h.join('/')+' ≈ '+s1.root);
  ok(JSON.stringify(s1.boites)===JSON.stringify(['Run the hill','Read at dawn','Call mum'])&&s1.tick==='1','chaque short porte SA boîte, telle quelle (le titre, le trait d\'intention)');
  ok(s1.img,'son média DEVANT : le fichier le plus récent de l\'Habit (photo signée)');
  ok(s1.vide&&JSON.stringify(s1.traits)===JSON.stringify(['rgb(55, 138, 221)','rgb(99, 153, 34)'])&&s1.cap,'sans média : son papier, ses intentions (focus, love), « photo · video » — rien d\'inventé');
  ok(s1.space,'sinon la photo d\'un de ses spaces (Call mum)');
  ok(await ici(pg)==='Read at dawn','la bascule garde l\'Habit courante (Read at dawn)');
  await pg.screenshot({path:OUT+'/shorts_'+(tel?'tel':'ordi')+'.png'});
  // ↑ ↓ d'une Habit à l'autre (le défilement aimanté, animé)
  /* la boîte ouverte se ferme par SA croix (Échap replie le Totehm) */
  await pg.locator('#habits .habit.open [data-x]').first().evaluate(e=>e.click()).catch(()=>{});await pg.waitForTimeout(300);
  await pg.evaluate(()=>document.activeElement&&document.activeElement.blur&&document.activeElement.blur());
  await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(1100);const a=await ici(pg);
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(1100);const b=await ici(pg);
  const tr=await pg.evaluate(()=>getComputedStyle(document.querySelector('#habits .sh .habit')).transitionDuration);
  ok(a==='Call mum'&&b==='Read at dawn'&&!/^0s(, 0s)*$/.test(tr),'↓ l\'Habit suivante, ↑ la précédente ; le passage s\'anime ('+a+' → '+b+')');
  // ── capturer / importer DEPUIS l'élément ──
  await pg.locator('#habits .sh.is-ici [data-open]').first().evaluate(e=>e.click());await pg.waitForTimeout(400);
  const f0=await pg.locator('#habits .sh.is-ici .habit [data-cap]').count();
  ok(f0===1,'la boîte ouverte (la mienne) a ses fichiers et « + »');
  await pg.locator('#habits .sh.is-ici .habit [data-cap]').first().evaluate(e=>e.click());await pg.waitForTimeout(450);
  const c=await pg.evaluate(()=>({on:document.getElementById('cap').classList.contains('is-on'),btn:[...document.querySelectorAll('#cap .cap-b')].map(b=>b.textContent.trim()),
    tr:getComputedStyle(document.getElementById('cap-in')).transitionDuration}));
  ok(c.on&&c.btn.join(',')==='PHOTO,VIDEO,IMPORT'&&!/^0s/.test(c.tr),'la capture s\'ouvre depuis l\'élément (animée) : PHOTO · VIDEO · IMPORT');
  await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(500);
  ok(await ici(pg)==='Read at dawn','pendant la capture, rien ne navigue dessous');
  const fc=pg.waitForEvent('filechooser',{timeout:5000});
  await pg.click('#cap [data-capk="file"]');
  await (await fc).setFiles({name:'notes.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 test')});
  await pg.waitForFunction(()=>!document.getElementById('cap').classList.contains('is-on'),null,{timeout:6000}).catch(()=>{});
  const up=log.upload.filter(u=>u.method==='POST').pop(), add=log.rpc.filter(r=>r.name==='element_media_add').pop();
  ok(up&&new RegExp('^element-media/'+UID+'/m-[0-9a-f-]{36}\\.pdf$').test(up.path),'IMPORT : le fichier part dans MON dossier, privé ('+(up&&up.path)+')');
  ok(add&&add.body.p_kind==='h'&&add.body.p_ref==='Read at dawn'&&add.body.p_mime==='application/pdf'&&add.body.p_name==='notes.pdf'&&up.path==='element-media/'+add.body.p_path,'rattaché à CETTE Habit (element_media_add : h, « Read at dawn »)');
  const puce=await pg.evaluate(()=>[...document.querySelectorAll('#habits .sh.is-ici .m-f .mini-t')].map(b=>b.textContent));
  ok(puce.includes('notes.pdf'),'la capture se referme ; le fichier est là, dans l\'élément');
  ok(!log.rpc.some(r=>/^(spot_create|space_post|space_post_audience|spot_create_audience)$/.test(r.name)),'importer n\'est pas publier (aucun space, aucun spot)');
  // une photo : elle devient le média de l'Habit, devant
  await pg.locator('#habits .sh.is-ici .habit [data-cap]').first().evaluate(e=>e.click());await pg.waitForTimeout(450);
  if(tel){
    const fp=pg.waitForEvent('filechooser',{timeout:5000});
    await pg.click('#cap [data-capk="photo"]');
    const ch=await fp;ok(await ch.element().getAttribute('capture')==='environment','PHOTO au doigt : l\'appareil photo du téléphone (capture)');
    await ch.setFiles({name:'run.png',mimeType:'image/png',buffer:PNG});
  } else {
    await pg.click('#cap [data-capk="photo"]');await pg.waitForFunction(()=>!document.getElementById('cap-cam').classList.contains('hide'),null,{timeout:6000}).catch(()=>{});
    ok(await pg.evaluate(()=>window.__totehm_sh().capture.camera),'PHOTO sur ordinateur : la caméra de l\'appareil');
    await pg.waitForTimeout(500);await pg.click('#cap-shot');
  }
  await pg.waitForFunction(()=>!document.getElementById('cap').classList.contains('is-on'),null,{timeout:8000}).catch(()=>{});
  const ph=log.rpc.filter(r=>r.name==='element_media_add').pop();
  await pg.waitForTimeout(600);
  ok(ph&&ph.body.p_mime==='image/jpeg'&&/\.jpg$/.test(ph.body.p_path)&&await pg.evaluate(()=>!!document.querySelector('#habits .sh.is-ici .sh-m img')),'PHOTO : un JPEG (≤ 1 600 px), il devient le média de l\'Habit, devant');
  // ouvrir, retirer un fichier
  await pg.locator('#habits .sh.is-ici .m-f .mini-t',{hasText:'notes.pdf'}).evaluate(e=>e.click());await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>window.__ouvert.some(u=>/\/storage\/v1\/object\/sign\/element-media\//.test(u))),'un fichier s\'ouvre par son URL signée');
  const dels=log.upload.filter(u=>u.method==='DELETE').length;
  await pg.locator('#habits .sh.is-ici .m-f',{hasText:'notes.pdf'}).locator('[data-emx]').evaluate(e=>e.click());await pg.waitForTimeout(700);
  ok(log.rpc.some(r=>r.name==='element_media_remove')&&log.upload.filter(u=>u.method==='DELETE').length===dels+1&&!(await pg.evaluate(()=>[...document.querySelectorAll('#habits .m-f .mini-t')].some(b=>b.textContent==='notes.pdf'))),'« × » : element_media_remove, le fichier s\'efface de mon dossier');
  // retour à la liste : l'Habit courante est gardée
  await pg.locator('#habits .sh.is-ici [data-x]').first().evaluate(e=>e.click()).catch(()=>{});await pg.waitForTimeout(300);
  await pg.click('#vmode');await pg.waitForTimeout(800);
  const l1=await pg.evaluate(()=>({sh:document.querySelectorAll('#habits .sh').length,rows:document.querySelectorAll('#habits > .habit[data-row]').length,lbl:document.getElementById('vmode').getAttribute('aria-label')}));
  ok(l1.sh===0&&l1.rows===3&&l1.lbl==='Shorts','retour à la liste, la même');
  // renommer une Habit : ses fichiers suivent ; la supprimer : ils partent
  const h1=await pg.evaluate(()=>[...document.querySelectorAll('#habits > .habit[data-row]')][0].dataset.row);
  await pg.locator('#habits [data-open="h:'+h1+'"]').evaluate(e=>e.click());await pg.waitForTimeout(300);
  await pg.locator('#habits .habit.open .v-name[data-edit]').click();
  await pg.keyboard.press('End');await pg.keyboard.type(' fast');await pg.waitForTimeout(1600);
  const rk=log.rpc.find(r=>r.name==='element_media_rekey');
  ok(rk&&rk.body.p_old==='Run the hill'&&rk.body.p_new==='Run the hill fast'&&log.rpc.some(r=>r.name==='habit_rename_links'),'renommée : element_media_rekey avec habit_rename_links (ses fichiers la suivent)');
  const rm0=log.rpc.filter(r=>r.name==='element_media_remove').length;
  await pg.locator('#habits .habit.open [data-kill]').evaluate(e=>e.click());await pg.waitForTimeout(900);
  ok(log.rpc.filter(r=>r.name==='element_media_remove').length===rm0+1,'supprimée : ses fichiers partent avec elle');
  // une autre vue : pas de bascule
  await pg.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp'})));await pg.waitForTimeout(900);
  ok(await pg.evaluate(()=>window.__totehm_zone.vue==='objectives'&&getComputedStyle(document.getElementById('vmode')).display==='none'),'la bascule n\'existe que dans les Habits');
  ok(await pg.evaluate(()=>{const h=document.getElementById('habits');return h.classList.contains('swap')&&h.classList.contains('sw-h')&&getComputedStyle(h).animationName==='swap-h';}),'changer de vue : la pile entre du côté du voyage (↑ : d\'en haut)');
  ok(!erreurs(log).length,nom+' · shorts : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
 // ── en lecture (le Totehm d'un autre) : ni bascule, ni fichiers ──
 {const source={ok:true,pseudo:'studio',steps:[{t:'Deep practice',is:['focus']}],objs:{},trips:[],reps:[],wisdom:[],visions:[]};
  const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{...serveur(),totehm_of:source,habit_spaces:{ok:true,mine:false,habits:[]}}});
  await pg.goto(origin+'/totehm?ro=studio');await pg.waitForSelector('body.ro:not(.gate)');await pg.waitForTimeout(700);
  await pg.locator('#habits [data-open]').first().evaluate(e=>e.click());await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>getComputedStyle(document.getElementById('vmode')).display==='none'&&!document.querySelector('#habits [data-cap],#habits .m-f')),'en lecture : ni shorts, ni fichiers, ni capture');
  ok(!log.rpc.some(r=>r.name==='element_media_list'),'en lecture : mes fichiers ne sont jamais lus');
  ok(!erreurs(log).length,'lecture : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
 // ── mouvement réduit : la bascule sans animation ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:serveur()});
  await pg.emulateMedia({reducedMotion:'reduce'});
  await pg.route(/\/storage\/v1\/object\/sign\//,r=>r.request().method()==='GET'?r.fulfill({status:200,contentType:'image/png',body:PNG}):r.fallback());
  await ouvrirTotehm(pg);
  await pg.click('#vmode');await pg.waitForTimeout(60);
  const r=await pg.evaluate(()=>({anim:document.getElementById('habits').getAnimations().length,n:document.querySelectorAll('#habits .sh').length,
    tr:getComputedStyle(document.querySelector('#habits .sh .habit')).transitionDuration,sb:getComputedStyle(document.getElementById('fv-inner')).scrollBehavior}));
  ok(r.n===3&&r.anim===0&&/^0s/.test(r.tr)&&r.sb==='auto','mouvement réduit : les shorts, sans animation ni défilement doux');
  ok(!erreurs(log).length,'mouvement réduit : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
}finally{await browser.close();}
