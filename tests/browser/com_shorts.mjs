// COM · 16/10/2026 bis — LA LISTE SEULE DANS LE TOTEHM ; MES SHORTS À GAUCHE, MES SPOTS À DROITE.
// Wah : « non on garde seulement le mode liste … sinon ça pète toute la structure. Sur la page d'atterrissage tu me
// remets une vue shorts en mode tiktok sur la vue de gauche et sur la vue de droite tu me mets la vue radar avec tous
// mes spots. » Donc : dans le Totehm, aucun mode, aucune bascule, la manette ne s'en va jamais ; sur l'atterrissage,
// ← un feed de MES médias plein écran (`element_media` + les photos de mes spots + l'image d'une VISION, déjà lus,
// zéro appel de plus) et → le radar de TOUS mes spots, centré sur le papier (son canvas est transparent).
// Capturer et importer DEPUIS l'élément reste dans le Totehm : privé (`element-media`), `element_media_add`,
// `_remove`, `_rekey`. En lecture : rien de tout ça. Sans compte : ni shorts ni spots. Tout est simulé.
// LANCER : node com_shorts.mjs /tmp
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight'],f:'every_morning',o:['o1']},{t:'Read at dawn',t0:'Read at dawn',is:['focus','love']},{t:'Call mum',t0:'Call mum',is:['love']}];
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]};
const LAND={signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false},higher:{active:false,price_cents:700,currency:'eur'},thp:false,subscriptions:0,subscribers:0};
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const lv=pg=>pg.evaluate(()=>window.__totehm_lv());
const vers=(pg,v)=>pg.waitForFunction(v=>{const d=window.__totehm_lv();return d.vue===v&&!d.bouge;},v,{timeout:8000}).catch(()=>{});
const ici=pg=>pg.evaluate(()=>(document.querySelector('#lv-sh .lsh.is-ici .lsh-t')||{}).textContent||null);
function serveur(){
  let items=[{id:'m1',kind:'h',ref:'Run the hill',path:UID+'/m-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',mime:'image/jpeg',bytes:1200,name:'hill.jpg',created_at:'2026-10-15T10:00:00Z'}],n=1;
  return {
    element_media_list:()=>({ok:true,items}),
    element_media_add:b=>{ if(!/^[0-9a-f-]{36}\/m-[0-9a-f-]{36}\.[a-z0-9]{2,5}$/.test(b.p_path)) return {ok:false,why:'path'};
      const id='m'+(++n); items=[{id,kind:b.p_kind,ref:b.p_ref,path:b.p_path,mime:b.p_mime,bytes:b.p_bytes,name:b.p_name},...items]; return {ok:true,id,mime:b.p_mime,bytes:b.p_bytes}; },
    element_media_remove:b=>{ const m=items.find(x=>x.id===b.p_id); items=items.filter(x=>x.id!==b.p_id); return m?{ok:true,path:m.path}:{ok:false,why:'not_mine'}; },
    element_media_rekey:b=>{ let k=0; items.forEach(m=>{ if(m.kind==='h'&&m.ref===b.p_old){ m.ref=b.p_new; k++; } }); return k; },
    my_trips:{signed_in:true,trips:[{id:'o1',text:'Ship it',is:['express'],hs:['Run the hill']}],
    reps:[{id:'r1',text:'The phone',is:['focus'],hs:['Run the hill']}],wisdom:[],visions:[{id:'v1',text:'The studio'}]},
    habit_spaces:{ok:true,mine:true,habits:[{habit:'Call mum',total:1,total_spaces:0,total_spots:1,spaces:[],spots:[{id:'sp1',format:'spot',state:'will',photo:UID+'/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg',starts_at:'2026-10-12T08:00:00Z',exact:{lat:38.72,lng:-9.14,place:'the hill'}}]}]},
    /* 20/10 quater — LA VUE DE DROITE LIT LE CLUB (`club_spots`) : maintenant rien, à venir MON spot (le point
       exact, une photo), passé le spot d'un autre membre (kai3 : sans média, la ville seule). */
    club_spots:b=>{ const f=b.p_filters||{}, mine={id:'sp1',habit:'Call mum',intentions:['love'],freq:'',state:'will',
        starts_at:'2026-10-24T08:00:00Z',duration_min:60,city:'Lisbon',location:'on',mode:'social',audience:'figher',
        comment:'Bring a coffee',photo:UID+'/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg',exact:{lat:38.72,lng:-9.14,place:'the hill'},
        mine:true,creator:'wahigher',habit_box:{name:'Call mum',ints:['love'],objectives:[],repulsions:[]}};
      const autre={id:'sp2',habit:'Swim at dawn',intentions:['flow'],state:'was',starts_at:'2026-10-13T07:00:00Z',duration_min:45,
        city:'Porto',location:'off',audience:'figher',mine:false,creator:'kai3',
        habit_box:{name:'Swim at dawn',ints:['flow'],freq:'every_morning',objectives:[{text:'Cross the bay'}],repulsions:[]}};
      const clip={id:'sp3',habit:'Dance',intentions:['celebrate'],state:'was',starts_at:'2026-10-11T20:00:00Z',duration_min:90,
        city:'Lisbon',location:'off',audience:'subscribers',mine:false,creator:'kai3',clip:{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',status:'ready'},
        habit_box:{name:'Dance',ints:['celebrate'],objectives:[],repulsions:[]}};
      let l=b.p_period==='future'?[mine]:b.p_period==='past'?[autre,clip]:[];
      if(Array.isArray(f.intentions)) l=l.filter(x=>x.intentions.some(i=>f.intentions.includes(i)));
      return {ok:true,period:b.p_period,items:l,spots:l,total:l.length,has_more:false,next_offset:l.length,as_of:'2026-10-20T10:00:00Z'}; },
    element_cloths:{ok:true,mine:true,elements:[]},
    my_visions:{ok:true,visions:[{id:'v1',image:UID+'/vision-cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg'}]},
    my_feed_badges:{ok:true,pos:{'sp:sp1':[20,30]}},
    feed_badge_set:b=>({ok:true,ref:b.p_ref,x:b.p_x,y:b.p_y}),
    my_landing:LAND};
}
const browser=await launch();
try{
 for(const [vp,tel] of [[{width:390,height:844},true],[{width:1280,height:800},false]]){
  const nom=tel?'téléphone':'ordinateur';
  const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:vp,hasTouch:tel,rpc:serveur(),
    functions:{'bunny-video':b=>({clips:(b.clips||[]).map(c=>({...c,status:'ready',url:'https://vz-test.b-cdn.net/'+c.id+'/playlist.m3u8',expires:Math.floor(Date.now()/1000)+3600}))})}});
  await pg.route(/\/storage\/v1\/object\/sign\//,r=>r.request().method()==='GET'?r.fulfill({status:200,contentType:'image/png',body:PNG}):r.fallback());
  await pg.addInitScript(()=>{window.__ouvert=[];window.open=(u)=>{window.__ouvert.push(u);return {location:{set href(x){window.__ouvert.push(x);}},close(){}};};});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);

  // ══ 1 · ← LA GRILLE (20/10 quater) ══
  // Wah : « la vue de gauche, c'est littéralement l'illustration média des boxes du Totehm sous la forme d'une
  // grille Instagram : une image, une vidéo, avec par-dessus la box qui lui est attribuée, légèrement surélevée ».
  await pg.click('#lvn-lf');await vers(pg,'g');await pg.waitForTimeout(1300);
  const g=await pg.evaluate(()=>{
    const t=[...document.querySelectorAll('#lv-sh .tl[data-pol]')], a=document.getElementById('gate-asteroid'), ra=a.getBoundingClientRect();
    const t0=t[0], b0=t0&&t0.querySelector('.tl-b'), r0=t0&&t0.getBoundingClientRect(), g0=document.querySelector('#lv-sh .tlg');
    return {n:t.length, add:!!document.querySelector('#lv-sh .tl-add'), carre:r0?Math.abs(r0.width-r0.height)<2:false,
      cols:g0?getComputedStyle(g0).gridTemplateColumns.split(' ').length:0,
      vieux:document.querySelectorAll('#lv-sh .etg,#lv-sh .pol').length,
      nom:(b0&&b0.querySelector('.tl-n')||{}).textContent||'', fond:b0?getComputedStyle(b0).backgroundColor:'',
      ombre:b0?getComputedStyle(b0).boxShadow:'', trait:t0?t0.querySelectorAll('.tl-i i').length:0,
      dessus:!!(b0&&r0&&b0.getBoundingClientRect().bottom<=r0.bottom&&b0.getBoundingClientRect().top>=r0.top),
      papier:[Math.round(ra.x+ra.width/2), Math.round(ra.y+ra.height/2), Math.round(ra.width)], W:innerWidth,
      dock:document.body.classList.contains('papier-haut'), items:window.__totehm_sh().items,
      spots:[...document.querySelectorAll('#lv-sh .tl-n')].some(e=>/Call mum/.test(e.textContent||''))};});
  ok(g.n===2&&g.add&&g.carre&&g.vieux===0&&g.cols===(tel?3:5),
     nom+' · LA GRILLE : des tuiles CARRÉES ('+g.n+' médias + la tuile « + »), '+g.cols+' colonnes, plus aucun étage');
  ok(g.nom==='Run the hill'&&g.fond==='rgb(51, 51, 102)'&&/rgba\(0, 0, 0/.test(g.ombre)&&g.trait===1&&g.dessus,
     'la boîte de SON élément est posée DESSUS, dans sa couleur de type (navy), surélevée (ombre), avec son filet');
  ok(g.dock&&Math.abs(g.papier[0]-Math.round(g.W/2))<=3&&g.papier[1]<90&&g.papier[2]<70,
     'le TOTEHM est sorti du centre : en haut, centré, petit ('+g.papier.join('/')+')');
  ok(!g.spots&&g.items===2,'aucun spot dans la vue de gauche : ce sont MES médias ('+g.items+')');
  await pg.screenshot({path:OUT+'/grille_'+(tel?'tel':'ordi')+'.png'});

  // ══ 2 · UN TAP SUR L'IMAGE L'OUVRE EN GRAND ; UN TAP SUR LA BOÎTE OUVRE SON ÉLÉMENT DANS LE TOTEHM ══
  await pg.click('#lv-sh .tl[data-i="0"] .tl-ph');await pg.waitForTimeout(500);
  const v=await pg.evaluate(()=>({vu:!document.getElementById('tlv').hidden, img:!!document.querySelector('#tlv .tlv-m img'),
    box:(document.querySelector('#tlv .tl-n')||{}).textContent||'', suiv:!document.querySelector('#tlv .tlv-n').hidden,
    prec:document.querySelector('#tlv .tlv-p').hidden, papier:getComputedStyle(document.getElementById('gate-asteroid')).opacity}));
  ok(v.vu&&v.img&&v.box==='Run the hill'&&v.suiv&&v.prec&&v.papier==='0','un tap sur l\'image l\'ouvre EN GRAND, sa boîte dessous, › vers le suivant');
  await pg.keyboard.press('ArrowRight');await pg.waitForTimeout(300);
  ok((await pg.$eval('#tlv .tl-n',e=>e.textContent))==='The studio'&&(await lv(pg)).vue==='g','→ montre le média suivant, sans quitter la vue');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>document.getElementById('tlv').hidden&&window.__totehm_lv().vue==='g'),'Échap referme la visionneuse : on reste dans la grille');
  await pg.locator('#lv-sh .tl[data-i="0"] .tl-b').evaluate(e=>e.click());
  await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});
  await pg.waitForTimeout(1200);
  const o=await pg.evaluate(()=>({vue:window.__totehm_zone.vue,ouverte:(document.querySelector('#habits .habit.open .v-name')||{}).textContent||''}));
  ok(o.vue==='habits'&&o.ouverte==='Run the hill','un tap sur la boîte ouvre SON élément dans le Totehm ('+o.vue+' · '+o.ouverte+')');

  // ══ 3 · DANS LE TOTEHM : LA LISTE, ET RIEN D'AUTRE ══
  const l0=await pg.evaluate(()=>({rows:document.querySelectorAll('#habits > .habit[data-row]').length,
    sh:document.querySelectorAll('#habits .lsh,#habits .sh').length,bascule:!!document.getElementById('vmode'),
    radar:!!document.querySelector('#habits #rdr-c'),joy:getComputedStyle(document.getElementById('joy')).opacity,
    cls:document.body.className.split(/\s+/).filter(c=>/^v-(shorts|radar)$/.test(c)).length,
    sorti:window.__totehm_sh().on||window.__totehm_rdr().on}));
  ok(l0.rows===3&&l0.sh===0&&!l0.bascule&&!l0.radar&&l0.joy==='1'&&l0.cls===0&&!l0.sorti,
     nom+' · la liste SEULE (3 Habits) : aucune bascule, aucun short, aucun radar, la manette reste, les deux moteurs à l\'arrêt');
  // ── capturer / importer DEPUIS l'élément (le Totehm les garde) ──
  await pg.locator('#habits .habit.open [data-x]').first().evaluate(e=>e.click()).catch(()=>{});await pg.waitForTimeout(300);
  const h2=await pg.evaluate(()=>[...document.querySelectorAll('#habits > .habit[data-row]')][1].dataset.row);
  await pg.locator('#habits [data-open="h:'+h2+'"]').evaluate(e=>e.click());await pg.waitForTimeout(400);
  const f0=await pg.locator('#habits .habit.open [data-cap]').count();
  ok(f0===1,'la boîte ouverte (la mienne) a ses fichiers et UN SEUL [Add a media]');
  await pg.locator('#habits .habit.open [data-cap]').first().evaluate(e=>e.click());await pg.waitForTimeout(450);
  const c=await pg.evaluate(()=>({on:document.getElementById('cap').classList.contains('is-on'),btn:[...document.querySelectorAll('#cap .cap-b')].map(b=>b.textContent.trim()),
    tr:getComputedStyle(document.getElementById('cap-in')).transitionDuration}));
  ok(c.on&&c.btn.join(',')==='PHOTO,VIDEO,IMPORT'&&!/^0s/.test(c.tr),'la capture s\'ouvre depuis l\'élément (animée) : PHOTO · VIDEO · IMPORT');
  const fc=pg.waitForEvent('filechooser',{timeout:5000});
  await pg.click('#cap [data-capk="file"]');
  await (await fc).setFiles({name:'notes.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 test')});
  await pg.waitForFunction(()=>!document.getElementById('cap').classList.contains('is-on'),null,{timeout:6000}).catch(()=>{});
  const up=log.upload.filter(u=>u.method==='POST').pop(), add=log.rpc.filter(r=>r.name==='element_media_add').pop();
  ok(up&&new RegExp('^element-media/'+UID+'/m-[0-9a-f-]{36}\\.pdf$').test(up.path),'IMPORT : le fichier part dans MON dossier, privé ('+(up&&up.path)+')');
  ok(add&&add.body.p_kind==='h'&&add.body.p_ref==='Read at dawn'&&add.body.p_mime==='application/pdf'&&add.body.p_name==='notes.pdf'&&up.path==='element-media/'+add.body.p_path,'rattaché à CETTE Habit (element_media_add : h, « Read at dawn »)');
  const puce=await pg.evaluate(()=>[...document.querySelectorAll('#habits .habit.open .m-f .mini-t')].map(b=>b.textContent));
  ok(puce.includes('notes.pdf'),'la capture se referme ; le fichier est là, dans l\'élément');
  ok(!log.rpc.some(r=>/^(spot_create|space_post|space_post_audience|spot_create_audience)$/.test(r.name)),'importer n\'est pas publier (aucun space, aucun spot)');
  // une photo : elle rejoint mes médias
  await pg.locator('#habits .habit.open [data-cap]').first().evaluate(e=>e.click());await pg.waitForTimeout(450);
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
  ok(ph&&ph.body.p_mime==='image/jpeg'&&/\.jpg$/.test(ph.body.p_path),'PHOTO : un JPEG (≤ 1 600 px), rattaché à l\'élément');
  // ouvrir, retirer un fichier
  await pg.locator('#habits .habit.open .m-f .mini-t',{hasText:'notes.pdf'}).evaluate(e=>e.click());await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>window.__ouvert.some(u=>/\/storage\/v1\/object\/sign\/element-media\//.test(u))),'un fichier s\'ouvre par son URL signée');
  const dels=log.upload.filter(u=>u.method==='DELETE').length;
  await pg.locator('#habits .habit.open .m-f',{hasText:'notes.pdf'}).locator('[data-emx]').evaluate(e=>e.click());await pg.waitForTimeout(700);
  ok(log.rpc.some(r=>r.name==='element_media_remove')&&log.upload.filter(u=>u.method==='DELETE').length===dels+1&&!(await pg.evaluate(()=>[...document.querySelectorAll('#habits .m-f .mini-t')].some(b=>b.textContent==='notes.pdf'))),'« × » : element_media_remove, le fichier s\'efface de mon dossier');
  // renommer : ses fichiers suivent ; supprimer : ils partent
  await pg.locator('#habits .habit.open .v-name[data-edit]').click();
  await pg.keyboard.press('End');await pg.keyboard.type(' slow');await pg.waitForTimeout(1600);
  const rk=log.rpc.find(r=>r.name==='element_media_rekey');
  ok(rk&&rk.body.p_old==='Read at dawn'&&rk.body.p_new==='Read at dawn slow'&&log.rpc.some(r=>r.name==='habit_rename_links'),'renommée : element_media_rekey avec habit_rename_links (ses fichiers la suivent)');
  const rm0=log.rpc.filter(r=>r.name==='element_media_remove').length;
  await pg.locator('#habits .habit.open [data-kill]').evaluate(e=>e.click());await pg.waitForTimeout(900);
  ok(log.rpc.filter(r=>r.name==='element_media_remove').length===rm0+1,'supprimée : ses fichiers partent avec elle');
  // ── Échap replie le Totehm d'un coup : il n'y a plus de mode dont sortir d'abord ──
  await pg.evaluate(()=>document.activeElement&&document.activeElement.blur&&document.activeElement.blur());
  await pg.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})));await pg.waitForTimeout(1500);
  ok(await pg.evaluate(()=>document.body.classList.contains('gate')),'Échap replie le Totehm d\'un coup (plus de mode à quitter)');

  // ══ 4 · → LES SPOTS : le radar, centré sur moi, nourri par le Club (`club_spots`) ══
  await vers(pg,'c');
  await pg.click('#lvn-rt');await vers(pg,'d');await pg.waitForTimeout(1200);
  const d=await pg.evaluate(()=>{const c=document.getElementById('rdr-c'),a=document.getElementById('gate-asteroid'),
      rc=c.getBoundingClientRect(),ra=a.getBoundingClientRect(),r=window.__totehm_rdr();
    return {pts:r.points,sans:r.sans,rayon:r.rayon,anime:r.anime,club:r.club,
      say:(document.getElementById('rdr-say')||{}).textContent||'',
      fond:getComputedStyle(c).backgroundColor,plein:Math.round(rc.width)===innerWidth&&Math.round(rc.height)>=innerHeight-2,
      dock:document.body.classList.contains('papier-haut'),
      haut:ra.y+ra.height/2<90&&Math.abs((ra.x+ra.width/2)-innerWidth/2)<4&&ra.width<70};});
  const lus=log.rpc.filter(x=>x.name==='club_spots').map(x=>x.body.p_period);
  ok(lus.join(',')==='now,future'&&d.club.periode==='future',
     '→ les spots du CLUB : rien maintenant, la vue montre ce qui VIENT (club_spots : '+lus.join(' → ')+')');
  ok(d.pts===1&&d.sans===0&&/^1 spot · \d+ (m|km)$/.test(d.say)&&d.rayon>0,'le radar place le spot qui a un point exact ('+d.say+')');
  ok(d.fond==='rgba(0, 0, 0, 0)'&&d.plein&&d.dock&&d.haut,
    'le canvas est plein écran et TRANSPARENT ; le Totehm est sorti se caler EN HAUT, centré');
  ok(d.anime,'le radar tourne quand il est à l\'écran');
  await pg.screenshot({path:OUT+'/spots_'+(tel?'tel':'ordi')+'.png'});
  await pg.click('#lvn-lf');await vers(pg,'c');await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>!window.__totehm_rdr().anime&&!window.__totehm_rdr().on),'quitté, le radar s\'arrête (zéro rAF au repos)');

  // ══ 4 bis · LE TOTEHM DOCKÉ CHOISIT LA BOX, LE FILTRE EST PROPRE À LA VUE, L'IMAGE SE RECADRE ══
  await vers(pg,'c');
  await pg.click('#lvn-lf');await vers(pg,'g');await pg.waitForTimeout(1000);
  // le papier docké ouvre le choix d'une Box — LES CINQ VUES à gauche
  await pg.click('#gate-asteroid');await pg.waitForTimeout(500);
  const pk=await pg.evaluate(()=>({vu:!document.getElementById('lv-sh-pick').hidden,
    l:[...document.querySelectorAll('#lv-sh-pick [data-pick]')].map(e=>e.textContent.trim())}));
  ok(pk.vu&&pk.l.includes('Ship it')&&pk.l.includes('The studio')&&pk.l.some(x=>/hill|mum|dawn/.test(x)),
    'le Totehm docké ouvre le choix : à gauche LES CINQ VUES ('+pk.l.join(' · ')+')');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(400);
  // le panneau de gauche : ce que ça montre, la vue d'origine, les intentions (la grille n'a plus d'étages)
  await pg.click('#lv-sh-flt [data-f="sf"]');await pg.waitForTimeout(400);
  const pan=await pg.evaluate(()=>({lab:[...document.querySelectorAll('#lv-sh-sf .sfl')].map(e=>e.textContent),
    ints:document.querySelectorAll('#lv-sh-sf [data-sf="int"]').length, vues:document.querySelectorAll('#lv-sh-sf [data-sf="vue"]').length}));
  ok(pan.ints===7&&pan.vues===5&&pan.lab.includes('It shows')&&pan.lab.includes('Views')&&pan.lab.includes('Intentions'),
    'le filtre de la grille : ce que ça montre, la vue, les SEPT intentions ('+pan.lab.join(' · ')+')');
  const avant=log.rpc.length, n0=(await pg.evaluate(()=>window.__totehm_sh())).items;
  await pg.click('#lv-sh-sf [data-sf="type"][data-v="video"]');await pg.waitForTimeout(500);
  const f1=await pg.evaluate(()=>window.__totehm_sh());
  await pg.click('#lv-sh-sf [data-sf="type"][data-v="video"]');await pg.waitForTimeout(300);
  await pg.click('#lv-sh-sf [data-sf="vue"][data-v="visions"]');await pg.waitForTimeout(500);
  const f2=await pg.evaluate(()=>window.__totehm_sh());
  await pg.click('#lv-sh-sf [data-sf="vue"][data-v="visions"]');await pg.waitForTimeout(300);
  await pg.click('#lv-sh-sf [data-sf="int"][data-v="fight"]');await pg.waitForTimeout(500);
  const f3=await pg.evaluate(()=>window.__totehm_sh());
  ok(n0===2&&f1.items===0&&f2.items===1&&f3.items===1&&log.rpc.length===avant,
    'il trie ce qui est DÉJÀ en mémoire : '+n0+' → video '+f1.items+' → visions '+f2.items+' → fight '+f3.items+', zéro appel');
  await pg.click('#lv-sh-sf [data-sf="all"]');await pg.waitForTimeout(400);
  await pg.keyboard.press('Escape');await pg.waitForTimeout(400);
  // LE POINT DE FOCALISATION : appui long sur l'image, puis on la recadre — et ce n'est pas un tap
  const foc=await pg.$eval('#lv-sh .tl[data-i="0"] .tl-ph',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/3,h:r.height};});
  await pg.mouse.move(foc.x,foc.y);await pg.mouse.down();await pg.waitForTimeout(460);
  for(let i=1;i<=6;i++){await pg.mouse.move(foc.x,foc.y-i*(foc.h/40));await pg.waitForTimeout(18);}
  await pg.mouse.up();await pg.waitForTimeout(1200);
  const fy=await pg.$eval('#lv-sh .tl[data-i="0"]',e=>({f:e.style.getPropertyValue('--fy'),op:getComputedStyle(e.querySelector('.tl-ph img')||e).objectPosition}));
  const mv=log.rpc.filter(x=>x.name==='feed_badge_set');
  ok(mv.length>=1&&mv[0].body.p_y<50&&/%/.test(fy.f)&&(await pg.evaluate(()=>document.getElementById('tlv').hidden)),
    'le point de focalisation se change et se garde (object-position '+fy.f+', feed_badge_set '+(mv[0]&&Math.round(mv[0].body.p_y))+' %), sans ouvrir la visionneuse');
  // la tuile « + » : l'élément d'abord (les cinq vues), la caméra ensuite
  await pg.click('#lv-sh .tl-add');await pg.waitForTimeout(500);
  const vide=await pg.evaluate(()=>({vu:!document.getElementById('lv-sh-pick').hidden,
    l:[...document.querySelectorAll('#lv-sh-pick [data-pick]')].map(e=>e.textContent.trim())}));
  ok(vide.vu&&vide.l.length>=5,'la tuile « + » demande l\'élément d\'abord ('+vide.l.length+' éléments, les cinq vues)');
  await pg.click('#lv-sh-pick [data-pick="0"]');await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>window.__totehm_sh().capture.ouvertures>0),'l\'élément choisi, la capture s\'ouvre POUR LUI');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(500);
  // la vue de droite : radar ↔ shorts, le TEMPS dans la barre, et le MÊME objet
  await pg.click('#lvn-rt');await vers(pg,'c');await pg.click('#lvn-rt');await vers(pg,'d');await pg.waitForTimeout(800);
  ok((await pg.evaluate(()=>window.__totehm_rdr())).mode==='radar','la vue de droite s\'ouvre sur le RADAR');
  await pg.click('#rdr-flt [data-f="mode"][data-v="shorts"]');await pg.waitForTimeout(900);
  const sh2=await pg.evaluate(()=>{const c=document.querySelector('#rdr-sh .ssp-s'),p=c&&c.querySelector('.lsh-pol'),
      m=p&&p.querySelector('.lsh-m'),top=m&&m.querySelector('.ssp-top'),b=p&&p.querySelector('.lsh-b');
    return {d:window.__totehm_rdr(), shorts:document.body.classList.contains('rdr-shorts'), n:document.querySelectorAll('#rdr-sh .ssp-s').length,
      px:p?p.style.getPropertyValue('--px'):'', haut:top&&m?Math.abs(top.getBoundingClientRect().top-m.getBoundingClientRect().top)<2:false,
      noir:top?getComputedStyle(top).backgroundImage:'', chips:top?[...top.querySelectorAll('span')].map(e=>e.textContent):[],
      say:(c&&c.querySelector('.ssp-say')||{}).textContent||'', sous:b&&m?b.getBoundingClientRect().top>=m.getBoundingClientRect().bottom-1:false,
      nom:(b&&b.querySelector('.lsh-t')||{}).textContent||'', cadre:p?getComputedStyle(p).backgroundColor:'',
      snap:getComputedStyle(document.getElementById('rdr-sh')).scrollSnapType, plein:c?Math.round(c.getBoundingClientRect().height)===innerHeight:false,
      cal:!!(c&&c.querySelector('[data-ics]')), go:!!(c&&c.querySelector('[data-go]')),
      per:[...document.querySelectorAll('#rdr-flt [data-f="per"]')].map(e=>e.textContent+(e.classList.contains('is-on')?'*':''))};});
  ok(sh2.shorts&&sh2.d.mode==='shorts'&&sh2.n===1&&/y mandatory/.test(sh2.snap)&&sh2.plein,
     'SHORTS : le format TikTok — un spot par écran, aimanté ('+sh2.n+')');
  ok(sh2.cadre==='rgb(51, 51, 102)'&&sh2.haut&&/gradient/.test(sh2.noir)&&sh2.sous&&sh2.nom==='Call mum',
     'LA FORME POLAROID : le cadre navy, EN HAUT la bande noire transparente, la Habit Box SOUS la fenêtre');
  ok(sh2.chips.some(t=>/I will be here/i.test(t))&&sh2.chips.some(t=>/OCT/.test(t))&&sh2.chips.some(t=>/location on/i.test(t))
     &&sh2.chips.some(t=>/social/i.test(t))&&sh2.say==='Bring a coffee'&&sh2.go&&sh2.cal,
     'les informations du spot dans la bande : '+sh2.chips.join(' · ')+' — son mot, GO, CALENDAR');
  ok(sh2.px==='20%','la place enregistrée revient du serveur (my_feed_badges) : '+sh2.px);
  ok(sh2.per.join(' ')==='was now next*','LES TROIS TEMPS de figher.club sont dans la barre : '+sh2.per.join(' '));
  // le passé : le spot d'un AUTRE membre, sans média, la ville seule, son auteur
  await pg.click('#rdr-flt [data-f="per"][data-v="past"]');await pg.waitForTimeout(800);
  const pas2=await pg.evaluate(()=>{const c=document.querySelector('#rdr-sh .ssp-s');
    return {n:document.querySelectorAll('#rdr-sh .ssp-s').length, by:(c&&c.querySelector('.ssp-by')||{}).textContent||'',
      sans:!!(c&&c.querySelector('.ssp-sans')), chips:c?[...c.querySelectorAll('.ssp-top span')].map(e=>e.textContent):[],
      mini:c?[...c.querySelectorAll('.lsh-o')].map(e=>e.textContent):[], d:window.__totehm_rdr()};});
  ok(pas2.n===2&&pas2.by==='kai3'&&pas2.sans&&pas2.chips.some(t=>/Porto/.test(t))&&pas2.chips.some(t=>/location off/i.test(t))
     &&pas2.mini.includes('Cross the bay')&&pas2.d.club.periode==='past',
     'was : le spot d\'un AUTRE membre (kai3), sans média, la ville seule, sa box et ses mini-boîtes');
  /* la vidéo du suivant (Bunny) : signée par le SERVEUR au moment où elle approche — jamais une URL en dur */
  await pg.waitForFunction(()=>true,null,{timeout:500});
  const bv=log.functions.filter(f=>f.name==='bunny-video');
  ok(bv.length>=1&&bv[0].body.clips[0].id==='cccccccc-cccc-4ccc-8ccc-cccccccccccc'&&bv[0].body.clips[0].spot==='sp3'
     &&await pg.evaluate(()=>!!document.querySelector('#rdr-sh video[data-bunny]')),
     'le clip du spot suivant est préparé : bunny-video signe {id, spot} (le lecteur ne voit jamais d\'URL Bunny en dur)');
  await pg.click('#rdr-sh [data-who]');await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>(window.__totehm_xo()||{}).actif==='univers'),'son nom ouvre SON univers /@kai3, sur place');
  /* le focus est DANS le cadre de l'univers : Échap se joue sur la page */
  await pg.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})));
  await pg.waitForFunction(()=>!(window.__totehm_xo()||{}).actif,null,{timeout:6000}).catch(()=>{});
  await pg.waitForTimeout(800);
  // le panneau de droite : à qui, où, ce que ça montre, les intentions — le serveur filtre
  await pg.click('#rdr-flt [data-f="sf"]');await pg.waitForTimeout(400);
  const panD=await pg.evaluate(()=>[...document.querySelectorAll('#rdr-sf .sfl')].map(e=>e.textContent));
  ok(panD.includes('Whose')&&panD.includes('Where')&&panD.includes('It shows')&&panD.includes('Intentions')&&!panD.includes('Views')&&!panD.includes('When'),
    'à droite, le panneau : '+panD.join(' · '));
  await pg.click('#rdr-sf [data-sf="int"][data-v="love"]');await pg.waitForTimeout(700);
  const q1=log.rpc.filter(x=>x.name==='club_spots').pop();
  ok(q1&&JSON.stringify(q1.body.p_filters.intentions)==='["love"]'&&(await pg.evaluate(()=>window.__totehm_rdr().club.items))===0,
     'une intention part au SERVEUR (club_spots filtre avant la pagination) : '+JSON.stringify(q1&&q1.body.p_filters));
  await pg.click('#rdr-sf [data-sf="ou"][data-v="near"]');await pg.waitForTimeout(900);
  const q2=log.rpc.filter(x=>x.name==='club_spots').pop();
  ok(q2&&q2.body.p_filters.scope==='near'&&typeof q2.body.p_lat==='number','« near me » demande la position au geste et la passe au serveur');
  await pg.click('#rdr-sf [data-sf="all"]');await pg.waitForTimeout(600);
  await pg.click('#rdr-sf [data-sf="qui"][data-v="mine"]');await pg.waitForTimeout(700);
  ok((await pg.evaluate(()=>window.__totehm_rdr())).items===0,'« mine » : seulement mes spots (kai3 sort)');
  await pg.click('#rdr-sf [data-sf="all"]');await pg.waitForTimeout(600);
  await pg.keyboard.press('Escape');await pg.waitForTimeout(400);
  await pg.click('#rdr-flt [data-f="mode"][data-v="radar"]');await pg.waitForTimeout(700);
  const g4=await pg.evaluate(()=>window.__totehm_rdr());
  ok(g4.mode==='radar'&&g4.sans===2&&g4.points===0,'le radar lit le MÊME objet : le spot passé, sans point exact, se pose sur l\'anneau');
  await pg.screenshot({path:OUT+'/spots_shorts_'+(tel?'tel':'ordi')+'.png'});
  await pg.click('#lvn-lf');await vers(pg,'c');await pg.waitForTimeout(300);

  // ══ 5 · DANS LA GALAXIE, L'HORIZONTALE APPARTIENT AUX ÉTOILES ══
  await pg.click('#lv-m-others');await pg.waitForTimeout(900);
  const gal=await pg.evaluate(()=>({lf:document.getElementById('lvn-lf').classList.contains('is-mort'),
    rt:document.getElementById('lvn-rt').classList.contains('is-mort')}));
  await pg.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'})));await pg.waitForTimeout(700);
  ok(gal.lf&&gal.rt&&(await lv(pg)).vue==='c','Others : les deux chevrons latéraux s\'éteignent, ← → ne naviguent pas (les étoiles gardent le geste)');
  ok(!erreurs(log).length,nom+' · aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── sans compte : ni « mes » shorts, ni « mes » spots ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables:{},session:false,rpc:{...serveur(),my_landing:{signed_in:false}}});
  await pg.goto(origin+'/totehm');await pg.waitForTimeout(1600);
  const v=await pg.evaluate(()=>({lf:document.getElementById('lvn-lf').classList.contains('is-mort'),
    rt:document.getElementById('lvn-rt').classList.contains('is-mort'),
    up:!document.getElementById('lvn-up').classList.contains('is-mort')}));
  await pg.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft'})));await pg.waitForTimeout(700);
  ok(v.lf&&v.rt&&v.up&&(await lv(pg)).vue==='c','sans compte : pas de shorts ni de spots (chevrons latéraux éteints) ; Get Higher reste');
  ok(!log.rpc.some(r=>r.name==='element_media_list'),'sans compte : mes fichiers ne sont jamais lus');
  ok(!erreurs(log).length,'sans compte : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── en lecture (le Totehm d'un autre) : ni fichiers, ni capture, ni shorts ──
 {const source={ok:true,pseudo:'studio',steps:[{t:'Deep practice',is:['focus']}],objs:{},trips:[],reps:[],wisdom:[],visions:[]};
  const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{...serveur(),totehm_of:source,habit_spaces:{ok:true,mine:false,habits:[]}}});
  await pg.goto(origin+'/totehm?ro=studio');await pg.waitForSelector('body.ro:not(.gate)');await pg.waitForTimeout(700);
  await pg.locator('#habits [data-open]').first().evaluate(e=>e.click());await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>!document.getElementById('vmode')&&!document.querySelector('#habits [data-cap],#habits .m-f')),'en lecture : ni bascule, ni fichiers, ni capture');
  ok(!log.rpc.some(r=>r.name==='element_media_list'),'en lecture : mes fichiers ne sont jamais lus');
  ok(await pg.evaluate(()=>window.__totehm_sh().items===0),'en lecture : aucun short (ce ne sont pas mes médias)');
  ok(!erreurs(log).length,'lecture : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── mouvement réduit : le feed sans défilement doux, le radar sans balayage ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:serveur()});
  await pg.emulateMedia({reducedMotion:'reduce'});
  await pg.route(/\/storage\/v1\/object\/sign\//,r=>r.request().method()==='GET'?r.fulfill({status:200,contentType:'image/png',body:PNG}):r.fallback());
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.click('#lvn-lf');await vers(pg,'g');await pg.waitForTimeout(700);
  const r=await pg.evaluate(()=>({n:document.querySelectorAll('#lv-sh .tl[data-pol]').length,
    sb:getComputedStyle(document.getElementById('lv-sh')).scrollBehavior,
    tr:getComputedStyle(document.querySelector('#lv-sh .tl-ph img')).transitionDuration,
    tb:getComputedStyle(document.querySelector('#lv-sh .tl-b')).transitionDuration}));
  ok(r.n===2&&r.sb==='auto'&&/^0s/.test(r.tr),'mouvement réduit : la grille, sans animation ni défilement doux ('+JSON.stringify(r)+')');
  await pg.click('#lvn-rt');await vers(pg,'c');await pg.click('#lvn-rt');await vers(pg,'d');await pg.waitForTimeout(600);
  const rr=await pg.evaluate(()=>window.__totehm_rdr());
  ok(rr.points===1&&rr.rayon>0,'mouvement réduit : le radar place ses points (une image, pas de balayage)');
  ok(!erreurs(log).length,'mouvement réduit : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
}finally{await browser.close();}
