// 27/10/2026 — PRENDRE UN SPOT DANS LA VUE DE DROITE (Wah : « la prise de spot doit être la même que sur figher.club : la vue
// d'en bas, les options s'affichent petit à petit, ET celle d'en haut si l'utilisateur publie le spot NOW ou LATER »).
//   1 · le « + » de la MAP ouvre la prise : la Habit Box telle quelle → NOW | LATER → une question à la fois ;
//       NOW : la photo (capture EN LIGNE) → qui le voit → location → together → où (ma position) → durée → un mot → I AM HERE ;
//       pendant la prise, la navigation attend ; la publication la rend.
//   2 · LATER depuis la tuile « + » de la GRID : qui le voit → together → quand → où (un point POSÉ sur la Terre) → durée
//       → un mot → I WILL BE HERE.
//   3 · [Add a spot] dans une box du Totehm : le Totehm se replie, la vue de droite s'ouvre sur la prise, CETTE Habit choisie.
//   4 · MAP au doigt : la Terre ne tourne que si le doigt est SUR elle ; ailleurs, le geste navigue.
//   5 · le titre de la vue du Totehm déployé : en HAUT, centré.
// Tout est simulé (comptes, RPC, stockage) : aucune écriture en production. LANCER : node com_prise_spot.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';const browser=await launch();const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight'],f:'every_morning'},{t:'Call mum',t0:'Call mum',is:['love']}];
const VILLES={cities:[['Porto',41.15,-8.61,1,'PT'],['Lisbon',38.72,-9.14,1,'PT']]};
const MOMENT=new RegExp('^moments/'+UID+'/[0-9a-f-]{36}\\.(jpg|mp4|webm|mov)$');
const RPC={my_landing:{signed_in:true,pseudo:'wahigher'},
  my_trips:{signed_in:true,trips:[],reps:[],wisdom:[],visions:[]},
  habit_spaces:{ok:true,mine:true,habits:[]},
  club_spots_of:b=>({ok:true,period:b.p_period,items:[],total:0,has_more:false,next_offset:0,as_of:'2026-10-27T10:00:00Z'}),
  spot_rules:{clip_seconds:33,clip_max_bytes:48000000,duration_min:5,duration_max:720,horizon_days:90},
  spot_create_audience:b=>MOMENT.test('moments/'+b.p_video)?{ok:true,id:'sp9',audience:b.p_audience}:{ok:false,why:'video'},
  spot_schedule_audience:b=>({ok:true,id:'sp10',state:'will',audience:b.p_audience}),
  spot_video_attach:{ok:true}, spot_box_set:{ok:true,objectives:false,repulsions:false,hidden:0}};
const lv=pg=>pg.evaluate(()=>window.__totehm_lv());
const innerHeightTiers=vp=>Math.round(vp.height/3);
const vers=(pg,v)=>pg.waitForFunction(v=>{const d=window.__totehm_lv();return d.vue===v&&!d.bouge;},v,{timeout:9000}).catch(()=>{});
const etapes=pg=>pg.evaluate(()=>[...document.querySelectorAll('#rdr-new .sfl')].map(e=>e.textContent));
const clic=(pg,sel)=>pg.$eval(sel,e=>e.click());
try{
 for(const [nom,vp,tel] of [['téléphone',{width:390,height:844},true],['ordinateur',{width:1280,height:800},false]]){
  const {pg,log}=await page(browser,{dir:'com',origin,viewport:vp,hasTouch:tel,rpc:RPC,
    tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]}});
  await pg.route('**/cities.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(VILLES)}));
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.click('#lvn-rt');await vers(pg,'d');await pg.waitForTimeout(1400);

  // ══ 1 · NOW, depuis le « + » de la MAP ══
  const plus=await pg.evaluate(()=>{const b=document.getElementById('rdr-plus');return !!b&&!b.hidden&&getComputedStyle(b).display!=='none'&&window.__totehm_rdr().mode==='map';});
  ok(plus,nom+' · MAP : un « + » pour prendre un spot (la GRID a sa tuile)');
  await clic(pg,'#rdr-plus');await pg.waitForTimeout(400);
  const e0=await etapes(pg), b0=await pg.evaluate(()=>[...document.querySelectorAll('#rdr-new .sfb .v-name')].map(e=>e.textContent.trim()));
  ok(await pg.evaluate(()=>!document.getElementById('rdr-new').hidden&&document.body.classList.contains('is-nspot'))&&e0.join('|')==='+ spot|which habit?'&&b0.join('|')==='Run the hill|Call mum',
     nom+' · la prise s\'ouvre sur MES Habits, au format Totehm (boxTotehm), et rien d\'autre : '+e0.join(' · ')+' → '+b0.join(' · '));
  await pg.keyboard.press('ArrowLeft');await pg.waitForTimeout(700);
  ok((await lv(pg)).vue==='d',nom+' · pendant la prise, la navigation ATTEND (← ne quitte pas la vue)');
  await pg.locator('#rdr-new .sfb').filter({hasText:'Run the hill'}).first().click();await pg.waitForTimeout(300);
  ok((await etapes(pg)).join('|')==='+ spot|my habit|when'&&await pg.evaluate(()=>document.querySelectorAll('#rdr-new .sfb').length===1),
     nom+' · la Habit choisie reste SEULE ; vient la question suivante : NOW · LATER');
  await clic(pg,'#rdr-new [data-ns="quand"][data-v="now"]');await pg.waitForTimeout(400);
  const n1=await pg.evaluate(()=>({l:[...document.querySelectorAll('#rdr-new .sfl')].map(e=>e.textContent),
    cap:[...document.querySelectorAll('#rdr-new .ns-cap .cap-b')].map(e=>e.textContent.trim()), modale:document.getElementById('cap').classList.contains('is-on')}));
  ok(n1.l[n1.l.length-1]==='a photo or a video · 33 s at most'&&n1.cap.join(',')==='PHOTO,VIDEO,IMPORT'&&!n1.modale&&!n1.l.includes('who sees it'),
     nom+' · NOW (I AM HERE) : d\'abord la photo ou la vidéo, la capture EN LIGNE dans le panneau (rien d\'autre n\'est encore demandé)');
  const fc=pg.waitForEvent('filechooser',{timeout:5000});
  await clic(pg,'#rdr-new [data-capk="file"]');
  const ch=await fc;ok((await ch.element().getAttribute('accept'))==='image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime',nom+' · IMPORT, pour un spot : une photo ou une vidéo seulement');
  await ch.setFiles({name:'here.png',mimeType:'image/png',buffer:PNG});
  await pg.waitForFunction(()=>!!document.querySelector('#rdr-new .ns-m img'),null,{timeout:6000}).catch(()=>{});
  const n2=await pg.evaluate(()=>({l:[...document.querySelectorAll('#rdr-new .sfl')].map(e=>e.textContent),
    aud:[...document.querySelectorAll('#rdr-new [data-ns="aud"]')].map(e=>e.childNodes[0].textContent)}));
  ok(n2.l.includes('photo')&&n2.l[n2.l.length-1]==='who sees it'&&n2.aud.join(' · ')==='private · my subscribers · figher club'&&!log.upload.length,
     nom+' · la photo se montre (rien n\'est envoyé avant la publication) ; puis QUI LE VOIT : '+n2.aud.join(' · '));
  await clic(pg,'#rdr-new [data-ns="aud"][data-v="figher"]');await pg.waitForTimeout(250);
  ok((await etapes(pg)).slice(-1)[0]==='location',nom+' · puis la location (on : le point exact · off : la ville)');
  await clic(pg,'#rdr-new [data-ns="loc"][data-v="on"]');await pg.waitForTimeout(250);
  ok((await etapes(pg)).slice(-1)[0]==='together',nom+' · ON : together (silent · social)');
  await clic(pg,'#rdr-new [data-ns="mode"][data-v="social"]');
  await pg.waitForFunction(()=>[...document.querySelectorAll('#rdr-new .sfl')].some(e=>e.textContent==='duration'),null,{timeout:8000}).catch(()=>{});
  const ou=await pg.evaluate(()=>[...document.querySelectorAll('#rdr-new .ns-tag')].map(e=>e.textContent).join('|'));
  ok(ou==='Lisbon'&&(await etapes(pg)).slice(-1)[0]==='duration',nom+' · où : ma position, la ville en découle (« '+ou+' ») ; puis la durée');
  await clic(pg,'#rdr-new [data-ns="dur"][data-v="60"]');await pg.waitForTimeout(250);
  ok(await pg.evaluate(()=>!!document.querySelector('#rdr-new textarea[data-nsi="mot"]')&&document.querySelector('#rdr-new .ns-go').textContent==='I AM HERE'),
     nom+' · puis un mot (facultatif) et I AM HERE');
  await pg.fill('#rdr-new textarea[data-nsi="mot"]','see you up there');
  await pg.screenshot({path:OUT+'/prise_now_'+(tel?'tel':'ordi')+'.png'});
  await clic(pg,'#rdr-new .ns-go');
  await pg.waitForFunction(()=>!document.body.classList.contains('is-nspot'),null,{timeout:8000}).catch(()=>{});
  const up=log.upload.filter(u=>u.method==='POST').pop(), cr=log.rpc.filter(r=>r.name==='spot_create_audience').pop(), bx=log.rpc.filter(r=>r.name==='spot_box_set').pop();
  ok(up&&MOMENT.test(up.path)&&/\.jpg$/.test(up.path),nom+' · la photo part dans MON dossier du seau des spots (moments/'+(up&&up.path.split('/').slice(2).join('/'))+')');
  ok(cr&&cr.body.p_habit==='Run the hill'&&cr.body.p_duration_min===60&&'moments/'+cr.body.p_video===up.path&&cr.body.p_city==='Lisbon'&&typeof cr.body.p_lat==='number'
     &&cr.body.p_mode==='social'&&cr.body.p_location==='on'&&cr.body.p_audience==='figher'&&cr.body.p_comment==='see you up there',
     nom+' · I AM HERE → spot_create_audience (le serveur décide) : '+JSON.stringify(cr&&Object.assign({},cr.body,{p_video:'…',p_lat:'…',p_lng:'…'})));
  ok(bx&&bx.body.p_spot==='sp9'&&JSON.stringify(bx.body.p_hide)==='{"objectives":[],"repulsions":[],"freq":false}',nom+' · un spot naît caché : spot_box_set montre sa box entière');
  const apres=await pg.evaluate(()=>({ferme:document.getElementById('rdr-new').hidden, per:window.__totehm_rdr().club.periode, d:window.__totehm_nspot()}));
  ok(apres.ferme&&apres.per==='now'&&apres.d.publies===1&&Object.values(apres.d).every(v=>typeof v!=='string'||['now','later',''].includes(v)),
     nom+' · publié : le panneau se ferme, la vue montre NOW ; __totehm_nspot() : des booléens et des compteurs → '+JSON.stringify(apres.d));

  // ══ 4 · MAP au doigt : la Terre ne tourne que sous le doigt posé SUR elle ══
  if(tel){
    const cdp=await pg.context().newCDPSession(pg);
    const glisse=async(x0,y0,x1,y1)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]});
      for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/6,y:y0+(y1-y0)*i/6}]});await pg.waitForTimeout(16);}
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pg.waitForTimeout(900);};
    const t0=(await pg.evaluate(()=>window.__totehm_rdr().carte.tours))||0;
    await glisse(195,420,95,420);
    const s1=await pg.evaluate(()=>({t:window.__totehm_rdr().carte.tours||0, vue:window.__totehm_lv().vue}));
    ok(s1.t>t0&&s1.vue==='d',nom+' · un glissé SUR la Terre la fait tourner (+'+(s1.t-t0)+' pas), la vue ne bouge pas');
    const h0=(await pg.evaluate(()=>window.__totehm_rdr().carte.horsDisque))||0;
    await glisse(386,640,240,640);await vers(pg,'c');
    const s2=await pg.evaluate(()=>({t:window.__totehm_rdr().carte.tours||0, h:window.__totehm_rdr().carte.horsDisque||0, vue:window.__totehm_lv().vue}));
    ok(s2.t===s1.t&&s2.h>h0&&s2.vue==='c',nom+' · le même glissé HORS de la Terre : elle ne tourne pas, le geste navigue (→ '+s2.vue+')');
    await pg.click('#lvn-rt');await vers(pg,'d');await pg.waitForTimeout(1200);
  }

  // ══ 2 · LATER, depuis la tuile « + » de la GRID, le point POSÉ sur la Terre ══
  await clic(pg,'#rdr-mode [data-rmode="grid"]');await pg.waitForTimeout(700);
  ok(await pg.evaluate(()=>!!document.querySelector('#rdr-g .tl-add[data-nspot]')&&getComputedStyle(document.getElementById('rdr-plus')).display==='none'),
     nom+' · GRID : la tuile « + » (le « + » de la MAP s\'efface)');
  await clic(pg,'#rdr-g .tl-add[data-nspot]');await pg.waitForTimeout(400);
  await pg.locator('#rdr-new .sfb').filter({hasText:'Call mum'}).first().click();await pg.waitForTimeout(250);
  await clic(pg,'#rdr-new [data-ns="quand"][data-v="later"]');await pg.waitForTimeout(250);
  ok((await etapes(pg)).slice(-1)[0]==='who sees it'&&!(await etapes(pg)).some(l=>/photo/.test(l)),nom+' · LATER (I WILL BE HERE) : d\'abord qui le voit (le média viendra à la fin, facultatif)');
  await clic(pg,'#rdr-new [data-ns="aud"][data-v="private"]');await pg.waitForTimeout(250);
  const l2=await pg.evaluate(()=>({l:[...document.querySelectorAll('#rdr-new .sfl')].map(e=>e.textContent).slice(-2), on:!!document.querySelector('#rdr-new span.sfc.is-on')}));
  ok(l2.l.join('|')==='location|together'&&l2.on,nom+' · un spot annoncé est ON (le point exact, fixe) ; together');
  await clic(pg,'#rdr-new [data-ns="mode"][data-v="silent"]');await pg.waitForTimeout(250);
  const q=await pg.evaluate(()=>({d:(document.querySelector('#rdr-new [data-nsi="date"]')||{}).value, t:(document.querySelector('#rdr-new [data-nsi="time"]')||{}).value,
    l:[...document.querySelectorAll('#rdr-new .sfl')].map(e=>e.textContent).slice(-2)}));
  ok(/^\d{4}-\d{2}-\d{2}$/.test(q.d)&&/^\d{2}:\d{2}$/.test(q.t)&&q.l.join('|')==='when|where',nom+' · quand (demain à cette heure, à changer) ; où → '+q.d+' '+q.t);
  await clic(pg,'#rdr-mode [data-rmode="map"]').catch(()=>{});
  await clic(pg,'#rdr-new [data-ns="carte"]');await pg.waitForTimeout(700);
  const pq=await pg.evaluate(()=>({cache:document.getElementById('rdr-new').hidden, pique:document.body.classList.contains('rdr-pique'),
    aide:getComputedStyle(document.getElementById('rdr-pique')).display, mode:window.__totehm_rdr().mode}));
  ok(pq.cache&&pq.pique&&pq.aide==='block'&&pq.mode==='map',nom+' · « on the map » : le panneau s\'efface, la Terre attend un tap → '+JSON.stringify(pq));
  const cv=await pg.$eval('#rdr-map',c=>{const r=c.getBoundingClientRect();return [r.x+r.width/2, r.y+r.height*0.42];});
  if(tel) await pg.touchscreen.tap(cv[0],cv[1]); else await pg.mouse.click(cv[0],cv[1]);
  await pg.waitForFunction(()=>!document.getElementById('rdr-new').hidden,null,{timeout:5000}).catch(()=>{});
  const pt=await pg.evaluate(()=>({d:window.__totehm_nspot(), on:!!document.querySelector('#rdr-new [data-ns="carte"].is-on'), dur:[...document.querySelectorAll('#rdr-new .sfl')].some(e=>e.textContent==='duration')}));
  ok(pt.d.point&&pt.on&&pt.dur,nom+' · un tap sur la Terre POSE le point (son anneau blanc) ; le panneau revient ; puis la durée');
  await clic(pg,'#rdr-new [data-ns="dur"][data-v="90"]');await pg.waitForTimeout(250);
  const l3=await pg.evaluate(()=>({l:[...document.querySelectorAll('#rdr-new .sfl')].map(e=>e.textContent).slice(-2), go:(document.querySelector('#rdr-new .ns-go')||{}).textContent}));
  ok(l3.l.join('|')==='a word · optional|a photo or a video · optional'&&l3.go==='I WILL BE HERE',nom+' · un mot, une photo ou une vidéo (facultative), I WILL BE HERE');
  await pg.fill('#rdr-new input[data-nsi="place"]','the old court');
  await pg.screenshot({path:OUT+'/prise_later_'+(tel?'tel':'ordi')+'.png'});
  const u0=log.upload.length;
  await clic(pg,'#rdr-new .ns-go');
  await pg.waitForFunction(()=>!document.body.classList.contains('is-nspot'),null,{timeout:8000}).catch(()=>{});
  const sc=log.rpc.filter(r=>r.name==='spot_schedule_audience').pop();
  ok(sc&&sc.body.p_habit==='Call mum'&&sc.body.p_location==='on'&&sc.body.p_mode==='silent'&&sc.body.p_audience==='private'&&sc.body.p_duration_min===90
     &&sc.body.p_place==='the old court'&&new Date(sc.body.p_starts_at).getTime()>Date.now()&&Math.abs(sc.body.p_lat)<=90&&Math.abs(sc.body.p_lng)<=180,
     nom+' · I WILL BE HERE → spot_schedule_audience : '+JSON.stringify(sc&&Object.assign({},sc.body,{p_lat:'…',p_lng:'…',p_starts_at:'…'})));
  ok(log.upload.length===u0&&!log.rpc.some(r=>r.name==='spot_video_attach'),nom+' · sans média, rien n\'est envoyé ni rattaché');
  ok(await pg.evaluate(()=>window.__totehm_rdr().club.periode==='future'&&!document.body.classList.contains('rdr-pique')),nom+' · publié : la vue montre FUTURE');
  ok(!erreurs(log).length,nom+' · aucune erreur '+erreurs(log).join(' | '));

  // ══ 3 · [Add a spot] dans une box du Totehm → la prise, CETTE Habit choisie ; 5 · le titre en haut ══
  await pg.click('#lvn-lf');await vers(pg,'c');await pg.waitForTimeout(400);
  await pg.click('#lv-tap-open');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});await pg.waitForTimeout(1200);
  /* en haut, centré : au-dessus de la première box (sur ordinateur, juste sous le T qui tient le centre du haut) */
  const ti=await pg.evaluate(()=>{const v=document.getElementById('vnow'), b=v.querySelector('b'), r=b.getBoundingClientRect(),
      t=document.querySelector('#bigT svg').getBoundingClientRect(), l=document.querySelector('#habits > .habit[data-row]').getBoundingClientRect();
    return {mot:b.textContent, haut:Math.round(r.top), bas:Math.round(r.bottom), centre:Math.round(r.x+r.width/2-innerWidth/2), liste:Math.round(l.top),
      sousT:r.top>=t.bottom-1, aCoteT:r.top<t.bottom&&r.bottom>t.top, vu:getComputedStyle(v).display!=='none'&&getComputedStyle(v).visibility!=='hidden'};});
  ok(ti.vu&&ti.mot==='my habits'&&ti.bas<ti.liste&&ti.haut<innerHeightTiers(vp)&&Math.abs(ti.centre)<=2&&(tel?ti.aCoteT:ti.sousT),
     nom+' · le titre de la vue : en HAUT, centré, au-dessus des boxes ('+(tel?'entre le T et la croix':'sous le T')+') → '+JSON.stringify(ti));
  await pg.screenshot({path:OUT+'/titre_haut_'+(tel?'tel':'ordi')+'.png'});
  const h1=await pg.evaluate(()=>[...document.querySelectorAll('#habits > .habit[data-row]')].find(e=>/Call mum/.test(e.textContent))?.dataset.row);
  await pg.evaluate(h=>{const e=document.querySelector('#habits [data-open="h:'+h+'"]'); if(e) e.click();},h1);await pg.waitForTimeout(450);
  await clic(pg,'#habits .habit.open [data-spotnew]');
  await pg.waitForFunction(()=>window.__totehm_lv().vue==='d'&&!document.getElementById('rdr-new').hidden,null,{timeout:9000}).catch(()=>{});
  await pg.waitForTimeout(300);
  const z4=await pg.evaluate(()=>({vue:window.__totehm_lv().vue, gate:document.body.classList.contains('gate'),
    h:[...document.querySelectorAll('#rdr-new .sfb')].map(e=>(e.classList.contains('is-on')?'+':'')+((e.querySelector('.v-name')||{}).textContent||'')).join('|'),
    l:[...document.querySelectorAll('#rdr-new .sfl')].map(e=>e.textContent).slice(-1)[0]}));
  ok(z4.vue==='d'&&z4.gate&&z4.h==='+Call mum'&&z4.l==='when',nom+' · [Add a spot] d\'une box : le Totehm se replie, la vue de droite s\'ouvre sur la prise, CETTE Habit choisie → '+JSON.stringify(z4));
  await clic(pg,'#rdr-new [data-ns="close"]');await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>document.getElementById('rdr-new').hidden&&!document.body.classList.contains('is-nspot')),nom+' · CLOSE rend la navigation');
  await pg.click('#lvn-lf');await vers(pg,'c');
  ok((await lv(pg)).vue==='c',nom+' · … et le geste repart');
  ok(!erreurs(log).length,nom+' · aucune erreur (fin) '+erreurs(log).join(' | '));
  await pg.context().close();
 }
}finally{await browser.close();}
