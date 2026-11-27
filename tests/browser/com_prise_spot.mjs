// 09/11/2026 — PRENDRE UN SPOT DANS LA VUE DE DROITE (Wah : « le questionnaire est intelligent : le choix d'une réponse
// entraîne ou non d'autres choix, avec une logique implacable dans le flow »).
//   1 · NOW depuis la carte : média, Habit, date implicite, géolocalisation, accès, mode, durée et publication.
//   2 · LATER depuis la grille : média facultatif, date valide, adresse ou carte, confidentialité et résumé.
//   3 · Depuis une box : capture d'abord, puis l'Habit présélectionnée. Les boxes gardent leur rendu natif.
//   4 · MAP au doigt : la Terre ne tourne que si le doigt est sur elle. 5 · Le titre du Totehm reste en haut.
// Tout est simulé (comptes, RPC, stockage, géocodeur) : aucune écriture en production. LANCER : node com_prise_spot.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';const browser=await launch();const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight'],f:'every_morning'},{t:'Call mum',t0:'Call mum',is:['love']}];
const VILLES={cities:[['Porto',41.15,-8.61,1,'PT'],['Lisbon',38.72,-9.14,1,'PT']]};
const ADRESSES=[{lat:'41.1495',lon:'-8.6108',display_name:'Rua de Santa Catarina, Porto, Portugal'},
  {lat:'41.1579',lon:'-8.6291',display_name:'Praça da Liberdade, Porto, Portugal'}];
const MOMENT=new RegExp('^moments/'+UID+'/[0-9a-f-]{36}\\.(jpg|mp4|webm|mov)$');
/* 14/11 — les niveaux de box entrent dans le questionnaire (le PLAFOND d'un spot) : « Run the hill » est
   ouverte aux abonnés, « Call mum » reste privée. `box_audience_set` l'ouvre, sur confirmation. */
let AUD_BOX={'Run the hill':'subscribers'};
const RPC={my_landing:{signed_in:true,pseudo:'wahigher'},
  my_box_audiences:()=>({ok:true,h:Object.assign({},AUD_BOX),t:{},r:{},w:{},v:{}}),
  box_audience_set:b=>{ AUD_BOX[b.p_id]=b.p_audience; return {ok:true,kind:b.p_kind,audience:b.p_audience}; },
  my_totehm:{signed_in:true,objectives:[],repulsions:[],stories:[],visions:[]},
  habit_spaces:{ok:true,mine:true,habits:[]},
  club_spots_of:b=>({ok:true,period:b.p_period,items:[],total:0,has_more:false,next_offset:0,as_of:'2026-10-27T10:00:00Z'}),
  spot_rules:{clip_seconds:33,clip_max_bytes:48000000,duration_min:5,duration_max:720,horizon_days:90},
  spot_create_audience:b=>MOMENT.test('moments/'+b.p_video)?{ok:true,id:'sp9',audience:b.p_audience}:{ok:false,why:'video'},
  spot_schedule_audience:b=>({ok:true,id:'sp10',state:'will',audience:b.p_audience}),
  spot_video_attach:{ok:true}, spot_box_set:{ok:true,objectives:false,repulsions:false,hidden:0}};
const lv=pg=>pg.evaluate(()=>window.__totehm_lv());
const innerHeightTiers=vp=>Math.round(vp.height/3);
const vers=(pg,v)=>pg.waitForFunction(v=>{const d=window.__totehm_lv();return d.vue===v&&!d.bouge;},v,{timeout:9000}).catch(()=>{});
const etape=pg=>pg.locator('#rdr-new [aria-current="step"]').getAttribute('data-v');
const clic=(pg,sel)=>pg.$eval(sel,e=>e.click());
try{
 for(const [nom,vp,tel] of [['téléphone',{width:390,height:844},true],['ordinateur',{width:1280,height:800},false]]){
  const {pg,log}=await page(browser,{dir:'com',origin,viewport:vp,hasTouch:tel,rpc:RPC,
    tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,habits:STEPS,vis:'private'}]}});
  await pg.route('**/cities.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(VILLES)}));
  let geocodes=0;
  await pg.route('**nominatim.openstreetmap.org/**',r=>{geocodes++;r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(ADRESSES)});});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.click('#lvn-lf');await vers(pg,'g');
  await pg.getByRole('button',{name:'Add a media',exact:true}).click();
  await pg.waitForSelector('#lv-sh-sf .sf-cap .cap-b');
  ok((await lv(pg)).vue==='g',nom+' · la touche Illustration ouvre la capture dans la vue de gauche');
  await pg.click('#lv-sh-sf [data-sf="close"]');
  await pg.click('#lvn-rt');await vers(pg,'c');
  await pg.click('#lvn-rt');await vers(pg,'d');
  await pg.getByRole('button',{name:'Add a spot',exact:true}).click();
  await pg.waitForSelector('#rdr-new .ns-cap .cap-b');
  ok((await lv(pg)).vue==='d',nom+' · la touche Spot ouvre la prise dans la vue de droite');
  await pg.click('#rdr-new [data-ns="close"]');

  // ══ 1 · NOW, depuis le « + » de la MAP ══
  const plus=pg.getByRole('button',{name:'Add a spot',exact:true});
  await pg.waitForFunction(()=>getComputedStyle(document.getElementById('lv-d')).transform==='none');
  const tuileMap=await plus.boundingBox();
  ok(tuileMap&&Math.abs(tuileMap.width-tuileMap.height)<1&&await plus.evaluate(e=>getComputedStyle(e).borderRadius)==='50%',
    nom+' · la carte porte une tuile Add a spot ronde');
  await plus.click();
  const cap=pg.locator('#rdr-new .ns-cap .cap-b');
  const suite=pg.locator('#rdr-new [data-ns="continue"]');
  const rail=k=>pg.locator('#rdr-new [data-ns="stage"][data-v="'+k+'"]');
  const envois=()=>log.upload.filter(u=>u.method==='POST').length;
  ok(await etape(pg)==='media'&&await rail('habit').isDisabled()&&await rail('publish').isDisabled()
    &&await cap.allTextContents().then(v=>v.map(t=>t.trim()).join('|')==='PHOTO|VIDEO|IMPORT')
    &&await pg.locator('#rdr-new .sfb').count()===0,
    nom+' · la prise ouvre sur le média, les étapes suivantes attendent');
  ok(!await pg.getByRole('heading',{name:'Take a spot'}).count()&&!await pg.locator('#rdr-new .ns-what').count(),
    nom+' · la capture commence directement par ses trois choix');
  await pg.screenshot({animations:'disabled',path:OUT+'/prise_capture_'+(tel?'tel':'ordi')+'.png'});
  await pg.keyboard.press('ArrowLeft');
  ok((await lv(pg)).vue==='d',nom+' · la prise tient la navigation');

  const fc=pg.waitForEvent('filechooser',{timeout:5000});
  await pg.click('#rdr-new [data-capk="file"]');
  const ch=await fc;
  ok(await ch.element().getAttribute('accept')==='image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime',
    nom+' · un spot accepte les photos et les vidéos');
  await ch.setFiles({name:'here.png',mimeType:'image/png',buffer:PNG});
  await pg.locator('#rdr-new .take-preview img').waitFor();
  ok(await etape(pg)==='media'&&envois()===0,nom+' · aperçu local avant de continuer');
  await pg.click('#rdr-new [data-ns="media-next"]');

  const habits=await pg.locator('#rdr-new .sfb .tb .v-name').allTextContents();
  ok(await etape(pg)==='habit'&&habits.join('|').trim()==='Run the hill|Call mum',
    nom+' · les Habits se choisissent dans leurs boxes natives');
  await pg.locator('#rdr-new .sfb').filter({hasText:'Run the hill'}).click();
  ok(await etape(pg)==='when'&&await pg.locator('#rdr-new .sfb').count()===0,
    nom+' · choisir l’Habit fait apparaître le choix du moment');
  await pg.click('#rdr-new [data-ns="quand"][data-v="now"]');
  await pg.locator('#rdr-new .ns-tag').filter({hasText:'Lisbon'}).waitFor({timeout:8000});
  ok(await etape(pg)==='where'&&await pg.locator('#rdr-new [data-nsi="date"],#rdr-new [data-ns="ou"]').count()===0,
    nom+' · NOW relève ma position sans demander de date ni de lieu');
  await suite.click();
  const niveaux=await pg.locator('#rdr-new [data-ns="aud"]').evaluateAll(v=>v.map(e=>e.childNodes[0].textContent));
  ok(await etape(pg)==='access'&&niveaux.join('|')==='private|my subscribers|figher club',
    nom+' · les trois niveaux de visibilité sont proposés');
  await pg.click('#rdr-new [data-ns="aud"][data-v="figher"]');
  ok(await pg.locator('#rdr-new .ns-note-g').textContent().then(v=>v.includes('a habit, its why, its repulsions'))
    &&await pg.locator('#rdr-new [data-ns="mode"]').count()===0,
    nom+' · le choix Club est expliqué avant Together');
  await suite.click();
  await pg.click('#rdr-new [data-ns="mode"][data-v="social"]');
  ok(await etape(pg)==='duration'&&await pg.locator('#rdr-new [data-nsi="mot"]').count()===0,
    nom+' · le commentaire attend la dernière étape');
  await pg.click('#rdr-new [data-ns="dur"][data-v="60"]');
  ok(await etape(pg)==='publish'&&await pg.locator('#rdr-new .take-summary .tb').count()===1
    &&await pg.locator('#rdr-new .take-summary img').count()===1&&envois()===0,
    nom+' · le récapitulatif reprend la box et le média encore local');
  const commentaire=pg.locator('#rdr-new textarea[data-nsi="mot"]');
  await commentaire.fill('see you up there');
  await commentaire.press('End');
  await commentaire.press('Enter');
  await pg.keyboard.insertText('bring water');
  await rail('habit').click();
  ok(await pg.locator('#rdr-new .sfb.is-on .v-name').textContent().then(v=>v.trim()==='Run the hill'),
    nom+' · revenir à Habit conserve la box sélectionnée');
  await rail('media').click();
  ok(await pg.locator('#rdr-new .take-preview img').count()===1,nom+' · le média reste dans le brouillon');
  await rail('publish').click();
  ok(await commentaire.inputValue()==='see you up there\nbring water',nom+' · le commentaire multiligne est conservé');
  await pg.screenshot({animations:'disabled',path:OUT+'/prise_now_'+(tel?'tel':'ordi')+'.png'});
  await pg.click('#rdr-new [data-ns="go"]');
  await pg.waitForFunction(()=>!document.body.classList.contains('is-nspot'),null,{timeout:8000}).catch(()=>{});
  /* le MÉDIA, pas sa vignette (`<chemin>.jpg`, écrite à côté sans attendre) : on prend le dépôt qui porte le nom d'un moment */
  const up=log.upload.filter(u=>u.method==='POST'&&MOMENT.test(u.path)).pop(), cr=log.rpc.filter(r=>r.name==='spot_create_audience').pop(), bx=log.rpc.filter(r=>r.name==='spot_box_set').pop();
  ok(up&&MOMENT.test(up.path)&&/\.jpg$/.test(up.path),nom+' · la photo part dans MON dossier du seau des spots (moments/'+(up&&up.path.split('/').slice(2).join('/'))+')');
  ok(cr&&cr.body.p_habit==='Run the hill'&&cr.body.p_duration_min===60&&'moments/'+cr.body.p_video===up.path&&cr.body.p_city==='Lisbon'&&typeof cr.body.p_lat==='number'
     &&cr.body.p_mode==='social'&&cr.body.p_location==='on'&&cr.body.p_audience==='figher'&&cr.body.p_comment==='see you up there\nbring water',
     nom+' · I AM HERE → spot_create_audience (le serveur décide ; le point est toujours exact) : '+JSON.stringify(cr&&Object.assign({},cr.body,{p_video:'…',p_lat:'…',p_lng:'…'})));
  ok(bx&&bx.body.p_spot==='sp9'&&JSON.stringify(bx.body.p_hide)==='{"objectives":[],"repulsions":[],"freq":false}',nom+' · un spot naît caché : spot_box_set montre sa box entière');
  const apres=await pg.evaluate(()=>({ferme:document.getElementById('rdr-new').hidden, per:window.__totehm_rdr().club.periode, d:window.__totehm_nspot()}));
  ok(apres.ferme&&apres.per==='now+past+future'&&apres.d.publies===1&&apres.d.etape==='media',
     nom+' · publié : le panneau se ferme et la carte garde les trois temps → '+JSON.stringify(apres.d));

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
  await pg.click('#rdr-m-sel');
  const tuileGrid=await plus.boundingBox();
  ok(tuileMap&&tuileGrid&&['x','y','width','height'].every(k=>Math.abs(tuileMap[k]-tuileGrid[k])<=2)
    &&await pg.locator('#rdr-m-sel').getAttribute('aria-pressed')==='true',
    nom+' · la tuile ronde retrouve la même place en mode Grid');
  await plus.click();
  await pg.click('#rdr-new [data-ns="skip"]');
  await pg.locator('#rdr-new .sfb').filter({hasText:'Call mum'}).click();
  await pg.click('#rdr-new [data-ns="quand"][data-v="later"]');
  const date=pg.locator('#rdr-new [data-nsi="date"]');
  const demain=await date.inputValue();
  ok(/^\d{4}-\d{2}-\d{2}$/.test(demain)
    &&/^\d{2}:\d{2}$/.test(await pg.locator('#rdr-new [data-nsi="time"]').inputValue())
    &&await pg.locator('#rdr-new [data-ns="ou"]').count()===0,
    nom+' · LATER révèle la date et l’heure avant le choix du lieu');
  await date.fill('2020-01-01');
  ok(await suite.isDisabled()&&await rail('where').isDisabled(),nom+' · une date passée bloque la suite');
  await date.fill(demain); await suite.click();
  const ou1=await pg.evaluate(()=>[...document.querySelectorAll('#rdr-new [data-ns="ou"]')].map(e=>e.childNodes[0].textContent));
  ok(ou1.join('|')==='here|elsewhere',nom+' · WHERE a DEUX réponses quand c\'est « later » : '+ou1.join(' · '));
  // ── l'ADRESSE : une requête par GESTE, jamais une par lettre ──
  await clic(pg,'#rdr-new [data-ns="ou"][data-v="ailleurs"]');await pg.waitForTimeout(250);
  await pg.fill('#rdr-new [data-nsi="adr"]','rua de santa catarina porto');await pg.waitForTimeout(300);
  ok(geocodes===0&&await pg.evaluate(()=>!document.querySelector('#rdr-new .ns-hit')),
     nom+' · l\'adresse se tape sans RIEN demander au géocodeur ('+geocodes+' requête)');
  await clic(pg,'#rdr-new [data-ns="find"]');
  await pg.waitForFunction(()=>!!document.querySelector('#rdr-new .ns-hit'),null,{timeout:6000}).catch(()=>{});
  const hits=await pg.evaluate(()=>[...document.querySelectorAll('#rdr-new .ns-hit')].map(e=>e.textContent));
  ok(geocodes===1&&hits.length===2&&/Santa Catarina/.test(hits[0]),
     nom+' · [read it] : UNE requête, les lieux proposés → '+hits.join(' · '));
  await pg.locator('#rdr-new .ns-hit').first().click();
  await pg.locator('#rdr-new .ns-tag').filter({hasText:'Porto'}).waitFor({timeout:8000});
  ok(await pg.evaluate(()=>window.__totehm_nspot().ptSrc)==='adresse'&&await etape(pg)==='where',
    nom+' · l’adresse pose le point et la ville vient de cities.json');
  // ── le même geste, sur la Terre ──
  await clic(pg,'#rdr-new [data-ns="carte"]');await pg.waitForTimeout(700);
  const pq=await pg.evaluate(()=>({cache:document.getElementById('rdr-new').hidden, pique:document.body.classList.contains('rdr-pique'),
    aide:getComputedStyle(document.getElementById('rdr-pique')).display, mode:window.__totehm_rdr().mode}));
  ok(pq.cache&&pq.pique&&pq.aide==='block'&&pq.mode==='map',nom+' · « on the map » : le panneau s\'efface, la Terre attend un tap → '+JSON.stringify(pq));
  const point=await pg.$eval('#rdr-map',c=>{
    const r=c.getBoundingClientRect(), joy=document.getElementById('lvjoy').getBoundingClientRect();
    const haut=118, bas=Math.max(120,innerHeight-joy.top+70);
    const x=r.left+r.width/2, y=r.top+haut+(innerHeight-haut-bas)/2;
    return {x,y,hit:document.elementFromPoint(x,y)?.id};
  });
  ok(point.hit==='rdr-map',nom+' · le centre du globe reçoit le geste');
  if(tel) await pg.touchscreen.tap(point.x,point.y); else await pg.mouse.click(point.x,point.y);
  await pg.locator('#rdr-new').waitFor({state:'visible',timeout:6000});
  const pt=await pg.evaluate(()=>({d:window.__totehm_nspot(), on:!!document.querySelector('#rdr-new [data-ns="carte"].is-on')}));
  ok(pt.d.pt&&pt.d.ptSrc==='carte'&&pt.on&&pt.d.etape==='where',nom+' · la carte rend le point à l’étape Where → '+JSON.stringify(pt));
  await pg.fill('#rdr-new input[data-nsi="place"]','the old court');
  await suite.click();
  await pg.click('#rdr-new [data-ns="aud"][data-v="figher"]');
  ok(await suite.isDisabled()&&await pg.locator('#rdr-new [data-ns="ouvrirbox"]').isVisible()
    &&!log.rpc.some(r=>r.name==='box_audience_set'),nom+' · une box privée demande une confirmation explicite');
  await pg.click('#rdr-new [data-ns="aud"][data-v="private"]');
  await suite.click();
  ok(await etape(pg)==='together',nom+' · le mode de rencontre reste demandé');
  await pg.click('#rdr-new [data-ns="mode"][data-v="silent"]');
  const minutes=pg.locator('#rdr-new input[data-nsi="dur"]');
  await minutes.fill('2');
  ok(await suite.isDisabled(),nom+' · une durée hors limite bloque la suite');
  await minutes.fill('87'); await suite.click();
  ok(await etape(pg)==='publish'&&await pg.locator('#rdr-new .take-summary .ns-tag').allTextContents().then(v=>v.includes('the old court')),
    nom+' · le récapitulatif du spot à venir reprend le lieu');
  await pg.screenshot({animations:'disabled',path:OUT+'/prise_later_'+(tel?'tel':'ordi')+'.png'});
  const u0=envois();
  await pg.click('#rdr-new [data-ns="go"]');
  await pg.waitForFunction(()=>!document.body.classList.contains('is-nspot'),null,{timeout:8000}).catch(()=>{});
  const sc=log.rpc.filter(r=>r.name==='spot_schedule_audience').pop();
  ok(sc&&sc.body.p_habit==='Call mum'&&sc.body.p_location==='on'&&sc.body.p_mode==='silent'&&sc.body.p_audience==='private'&&sc.body.p_duration_min===87
     &&sc.body.p_place==='the old court'&&new Date(sc.body.p_starts_at).getTime()>Date.now()&&Math.abs(sc.body.p_lat)<=90&&Math.abs(sc.body.p_lng)<=180,
     nom+' · I WILL BE HERE → spot_schedule_audience : '+JSON.stringify(sc&&Object.assign({},sc.body,{p_lat:'…',p_lng:'…',p_starts_at:'…'})));
  ok(log.upload.filter(u=>u.method==='POST').length===u0&&!log.rpc.some(r=>r.name==='spot_video_attach'),nom+' · sans média, rien n\'est envoyé ni rattaché');
  ok(await pg.evaluate(()=>window.__totehm_rdr().club.periode.includes('future')&&!document.body.classList.contains('rdr-pique')),nom+' · publié : la vue inclut les spots à venir');
  ok(!erreurs(log).length,nom+' · aucune erreur '+erreurs(log).join(' | '));

  // ══ 3 · [Add a spot] dans une box du Totehm → la prise, CETTE Habit choisie ; 5 · le titre en haut ══
  await pg.click('#lvn-lf');await vers(pg,'c');await pg.waitForTimeout(400);
  await pg.click('#gate-enter');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});await pg.waitForTimeout(1200);
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
  const z4=await pg.evaluate(()=>({vue:window.__totehm_lv().vue, gate:document.body.classList.contains('gate'), prise:window.__totehm_nspot()}));
  ok(z4.vue==='d'&&z4.gate&&z4.prise.habit&&z4.prise.etape==='media',nom+' · depuis une box, la capture vient en premier');
  await pg.click('#rdr-new [data-ns="skip"]');
  ok(await etape(pg)==='when',nom+' · la box étant connue, la suite ouvre le choix du moment');
  await rail('habit').click();
  ok(await pg.locator('#rdr-new .sfb.is-on .v-name').textContent().then(v=>v.trim()==='Call mum'),
    nom+' · l’Habit de départ reste présélectionnée');
  await clic(pg,'#rdr-new [data-ns="close"]');await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>document.getElementById('rdr-new').hidden&&!document.body.classList.contains('is-nspot')),nom+' · CLOSE rend la navigation');
  await pg.click('#lvn-lf');await vers(pg,'c');
  ok((await lv(pg)).vue==='c',nom+' · … et le geste repart');
  ok(!erreurs(log).length,nom+' · aucune erreur (fin) '+erreurs(log).join(' | '));
  await pg.context().close();
 }
}finally{await browser.close();}
