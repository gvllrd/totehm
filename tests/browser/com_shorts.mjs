// COM · 16/10/2026 bis → 20/10 sexies — LA LISTE SEULE DANS LE TOTEHM ; MES MÉDIAS À GAUCHE (la grille Instagram),
// LES SPOTS À DROITE (MAP · GRID, le spot en grand par-dessus — plus de polaroid depuis le 21/10). Dans le Totehm, aucun mode, aucune bascule, la manette ne
// s'en va jamais ; sur l'atterrissage, ← la grille de MES médias (`element_media`, zéro appel de plus) et → les spots
// du Club (`club_spots`) sur la Terre ou en grille ; un tap ouvre le spot en grand, aimanté. Plus de radar (figher.club).
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
/* UN SPOT « I will be there » EST À VENIR : une date écrite en dur quitte le présent au bout d'un jour
   (mesuré le 25/10 : « yesterday 08:00 », et le banc tombait tout seul). Toujours demain, 08:00. */
const DEMAIN=new Date(Date.now()+864e5).toISOString().slice(0,10)+'T08:00:00Z';
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]};
const LAND={signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false},higher:{active:false,price_cents:700,currency:'eur'},thp:false,subscriptions:0,subscribers:0,
  /* La Reflection est ouverte : c'est là que se pose ce que je MONTRE (25/10). */
  sm:{ready:true,habit:true,objective:true,higher:false,free_total:7,free_left:6,left:6}};
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
    habit_spaces:{ok:true,mine:true,habits:[{habit:'Call mum',total:1,total_spaces:0,total_spots:1,spaces:[],spots:[{id:'sp1',format:'spot',state:'will',photo:UID+'/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg',starts_at:DEMAIN,exact:{lat:38.72,lng:-9.14,place:'the hill'}}]}]},
    /* 20/10 quater — LA VUE DE DROITE LIT LE CLUB (`club_spots`) : maintenant rien, à venir MON spot (le point
       exact, une photo), passé le spot d'un autre membre (kai3 : sans média, la ville seule). */
    club_spots:b=>{ const f=b.p_filters||{}, mine={id:'sp1',habit:'Call mum',intentions:['love'],freq:'',state:'will',
        starts_at:DEMAIN,duration_min:60,city:'Lisbon',location:'on',mode:'social',audience:'figher',
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
    totehm_of:b=>b.p_pseudo==='kai3'?{ok:false,why:'subscribe',pseudo:'kai3'}:{ok:false,why:'nobody'},
    my_landing:LAND};
}
const VILLES={cities:[['Porto',41.15,-8.61,1,'PT'],['Lisbon',38.72,-9.14,1,'PT']]};
const browser=await launch();
try{
 for(const [vp,tel] of [[{width:390,height:844},true],[{width:1280,height:800},false]]){
  const nom=tel?'téléphone':'ordinateur';
  const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:vp,hasTouch:tel,rpc:serveur(),
    functions:{'bunny-video':b=>({clips:(b.clips||[]).map(c=>({...c,status:'ready',url:'https://vz-test.b-cdn.net/'+c.id+'/playlist.m3u8',expires:Math.floor(Date.now()/1000)+3600}))})}});
  await pg.route(/\/storage\/v1\/object\/sign\//,r=>r.request().method()==='GET'?r.fulfill({status:200,contentType:'image/png',body:PNG}):r.fallback());
  await pg.route('**/cities.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(VILLES)}));
  await pg.addInitScript(()=>{window.__ouvert=[];window.open=(u)=>{window.__ouvert.push(u);return {location:{set href(x){window.__ouvert.push(x);}},close(){}};};});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);

  // ══ 1 · ← LA GRILLE (20/10 quater) ══
  // Wah : « la vue de gauche, c'est littéralement l'illustration média des boxes du Totehm sous la forme d'une
  // grille Instagram : une image, une vidéo, avec par-dessus la box qui lui est attribuée, légèrement surélevée ».
  await pg.click('#lvn-lf');await vers(pg,'g');await pg.waitForTimeout(1300);
  const g=await pg.evaluate(()=>{
    const t=[...document.querySelectorAll('#lv-sh .tl[data-pol]')], a=document.getElementById('gate-asteroid'), ra=a.getBoundingClientRect();
    const t0=t[0], b0=t0&&t0.querySelector('.tl-bx'), hb=b0&&b0.querySelector('.tb .habit .h-body'), tk=b0&&b0.querySelector('.tb .habit .tick'),
      r0=t0&&t0.getBoundingClientRect(), g0=document.querySelector('#lv-sh .tlg');
    return {n:t.length, add:!!document.querySelector('#lv-sh .tl-add'), carre:r0?Math.abs(r0.width-r0.height)<2:false,
      cols:g0?getComputedStyle(g0).gridTemplateColumns.split(' ').length:0,
      vieux:document.querySelectorAll('#lv-sh .etg,#lv-sh .pol').length,
      nom:(b0&&b0.querySelector('.v-name')||{}).textContent||'', fond:hb?getComputedStyle(hb).backgroundColor:'',
      ombre:b0?getComputedStyle(b0).boxShadow:'', trait:tk?tk.querySelectorAll('i').length:0, tw:tk?getComputedStyle(tk).width:'',
      inerte:b0?b0.querySelectorAll('[data-open],[data-go],[data-zoom],[role],button,.loupe').length:-1,
      dessus:!!(b0&&r0&&b0.getBoundingClientRect().bottom<=r0.bottom&&b0.getBoundingClientRect().top>=r0.top),
      papier:[Math.round(ra.x+ra.width/2), Math.round(ra.y+ra.height/2), Math.round(ra.width)], W:innerWidth,
      dock:document.body.classList.contains('papier-haut'), items:window.__totehm_sh().items,
      spots:[...document.querySelectorAll('#lv-sh .tl-n')].some(e=>/Call mum/.test(e.textContent||''))};});
  ok(g.n===2&&g.add&&g.carre&&g.vieux===0&&g.cols===(tel?3:5),
     nom+' · LA GRILLE : des tuiles CARRÉES ('+g.n+' médias + la tuile « + »), '+g.cols+' colonnes, plus aucun étage');
  ok(g.nom==='Run the hill'&&g.fond==='rgb(51, 51, 102)'&&/rgba\(0, 0, 0/.test(g.ombre)&&g.trait===1&&g.tw==='2px'&&g.dessus&&g.inerte===0,
     '20/10 · la box est CELLE DU TOTEHM (son rendu, sa peau navy, son filet de 2 px), posée DESSUS, surélevée, inerte ('+g.tw+')');
  ok(g.dock&&Math.abs(g.papier[0]-Math.round(g.W/2))<=3&&g.papier[1]<90&&g.papier[2]<70,
     'le TOTEHM est sorti du centre : en haut, centré, petit ('+g.papier.join('/')+')');
  ok(!g.spots&&g.items===2,'aucun spot dans la vue de gauche : ce sont MES médias ('+g.items+')');
  /* 21/10 bis — la PHOTO porte les douze trous du logo, aux mêmes places (comparées une à une à `#gl-bg`) ; la box n'est jamais découpée. */
  const pf=await pg.evaluate(()=>{const t=document.querySelector('#lv-sh .tl[data-i="0"]'), ph=t&&t.querySelector('.tl-ph'), bx=t&&t.querySelector('.tl-bx');
    const cs=e=>e?getComputedStyle(e):null, mk=e=>e?(cs(e).maskImage||cs(e).webkitMaskImage||''):'';
    const d=decodeURIComponent(mk(ph));
    const trous=[...d.matchAll(/<circle cx='([\d.]+)' cy='([\d.]+)' r='13\.86'/g)].map(m=>[+(+m[1]).toFixed(1),+(+m[2]).toFixed(1)]);
    const logo=[...document.querySelectorAll('#gl-bg mask circle')].map(c=>[+(+c.getAttribute('cx')).toFixed(1),+(+c.getAttribute('cy')).toFixed(1)]);
    const k=l=>l.map(x=>x.join(',')).sort().join(' ');
    return {n:trous.length, memes:k(trous)===k(logo)&&logo.length===12, fond:t?cs(t).backgroundColor:'', boxM:mk(bx)||'none',
      plus:mk(document.querySelector('#lv-sh .tl-add .tl-ph'))||'none'};});
  ok(pf.n===12&&pf.memes&&pf.fond==='rgba(0, 0, 0, 0)'&&/none/.test(pf.boxM),
     '21/10 bis · chaque image de la grille est PERFORÉE : les 12 trous du logo, aux mêmes places ; la box posée dessus reste entière → '+JSON.stringify(pf));
  await pg.screenshot({path:OUT+'/grille_'+(tel?'tel':'ordi')+'.png'});
  /* 22/10 — au survol (souris), la tuile ENTIÈRE grandit : l'image et sa box ensemble, au-dessus des voisines. */
  if(!tel){ const t1=await pg.$('#lv-sh .tl[data-i="0"]'), bb=await t1.boundingBox(); await pg.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2); await pg.waitForTimeout(350);
    const hv=await pg.evaluate(()=>{const t=document.querySelector('#lv-sh .tl[data-i="0"]'),cs=getComputedStyle(t);return {tr:cs.transform,z:cs.zIndex,f:cs.filter,bx:!!t.querySelector('.tl-bx')};});
    ok(/matrix\(1\.06, 0, 0, 1\.06/.test(hv.tr)&&hv.z==='2'&&/drop-shadow/.test(hv.f)&&hv.bx,'22/10 · au survol, la tuile ENTIÈRE (l\'image et sa box) grandit au-dessus de ses voisines → '+hv.tr);
    await pg.mouse.move(2,2); await pg.waitForTimeout(300); }

  // ══ 2 · UN TAP SUR L'IMAGE — OU SUR SA BOX — OUVRE LE MÉDIA, AVEC LA BOX DÉTAILLÉE PAR-DESSUS (20/10) ══
  // Wah : « quand on clique sur une image de la grille, on ouvre le média avec par-dessus la box détaillée, au lieu
  // de rediriger vers le Totehm ».
  await pg.click('#lv-sh .tl[data-i="0"] .tl-bx',{force:true});await pg.waitForTimeout(500);
  const v=await pg.evaluate(()=>{const s0=document.querySelector('#tlv .tlv-s[data-j="0"]'), b=s0&&s0.querySelector('.tlv-b'), m=s0&&s0.querySelector('.tlv-m'),
      f=document.querySelector('#tlv .tlv-f'), im=m&&m.querySelector('img');
    return {vu:!document.getElementById('tlv').hidden, img:!!im, fit:im?getComputedStyle(im).objectFit:'',
      box:(b&&b.querySelector('.tb .v-name')||{}).textContent||'', sub:(b&&b.querySelector('.tb .v-sub')||{}).textContent||'',
      minis:b?[...b.querySelectorAll('.tb .mini')].map(e=>e.textContent):[],
      dessus:b&&m?b.getBoundingClientRect().top<m.getBoundingClientRect().bottom&&getComputedStyle(b).position==='absolute':false,
      n:document.querySelectorAll('#tlv .tlv-s').length, fleches:document.querySelectorAll('#tlv .tlv-p,#tlv .tlv-n,#tlv [data-tlv="1"],#tlv [data-tlv="-1"]').length,
      snap:f?getComputedStyle(f).scrollSnapType:'', ox:f?getComputedStyle(f).overflowX:'', oy:f?getComputedStyle(f).overflowY:'',
      haut:s0&&f?Math.abs(s0.getBoundingClientRect().height-f.clientHeight)<2:false,
      gate:document.body.classList.contains('gate'), papier:getComputedStyle(document.getElementById('gate-asteroid')).opacity};});
  ok(v.vu&&v.img&&v.fit==='contain'&&v.gate&&v.papier==='0','un tap (même sur la box) ouvre le MÉDIA en grand, TEL QU\'IL EST (contain) — plus aucune redirection vers le Totehm');
  ok(v.box==='Run the hill'&&/fight/i.test(v.sub)&&v.minis.includes('Ship it')&&v.minis.includes('The phone')&&v.dessus,
     'par-dessus, la box DÉTAILLÉE du Totehm : '+v.box+' · '+v.sub+' · '+v.minis.join(' / '));
  /* 22/10 — la LOUPE, aussi dans la visionneuse : elle agrandit la box en place, puis la rend ; rien d'autre ne bouge. */
  const LP='#tlv .tlv-s[data-j="0"] .tlv-b .loupe[data-vz]';
  const lp=await pg.evaluate(s=>({n:document.querySelectorAll('#tlv .tlv-s[data-j="0"] .tlv-b .loupe').length, vis:(e=>e?getComputedStyle(e).display:'')(document.querySelector(s))}),LP);
  await pg.click(LP);await pg.waitForTimeout(250);
  const lz=await pg.evaluate(s=>({zoom:!!document.querySelector('#tlv .tlv-s[data-j="0"] .tlv-b .v-col.is-zoom'),vu:!document.getElementById('tlv').hidden,
    gate:document.body.classList.contains('gate'),pr:document.querySelector(s).getAttribute('aria-pressed')}),LP);
  await pg.click(LP);await pg.waitForTimeout(250);
  const lz2=await pg.evaluate(()=>!document.querySelector('#tlv .tlv-s[data-j="0"] .tlv-b .v-col.is-zoom'));
  ok(lp.n===1&&lp.vis==='flex'&&lz.zoom&&lz.pr==='true'&&lz.vu&&lz.gate&&lz2,'22/10 · la LOUPE sur la box de la visionneuse : elle l\'agrandit en place puis la rend — sans ouvrir le Totehm ni quitter le média → '+JSON.stringify(lz));
  ok(v.n===2&&v.fleches===0&&/y/.test(v.snap)&&/mandatory/.test(v.snap)&&v.ox==='hidden'&&v.oy==='auto'&&v.haut,
     '21/10 · la visionneuse défile À LA VERTICALE, aimantée, un média par écran — plus de ‹ › ni d\'horizontale → '+JSON.stringify({n:v.n,snap:v.snap,f:v.fleches}));
  await pg.keyboard.press('ArrowRight');await pg.waitForTimeout(400);
  ok(await pg.evaluate(()=>window.__totehm_sh().vu===0&&window.__totehm_lv().vue==='g'&&!document.getElementById('tlv').hidden),'21/10 · → ne fait rien dans la visionneuse (ni média voisin, ni changement de vue)');
  await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(1100);
  const v2=await pg.evaluate(()=>({vu:window.__totehm_sh().vu, nom:(document.querySelector('#tlv .tlv-s[data-j="1"] .tlv-b .v-name')||{}).textContent||'',
    top:document.querySelector('#tlv .tlv-f').scrollTop, h:document.querySelector('#tlv .tlv-f').clientHeight, vue:window.__totehm_lv().vue}));
  ok(v2.vu===1&&v2.nom==='The studio'&&Math.abs(v2.top-v2.h)<3&&v2.vue==='g','21/10 · ↓ fait DÉFILER jusqu\'au média suivant (aimanté), sans quitter la vue → '+JSON.stringify(v2));
  await pg.mouse.move(200,400);await pg.mouse.wheel(0,-700);await pg.waitForTimeout(1100);
  ok(await pg.evaluate(()=>window.__totehm_sh().vu===0&&window.__totehm_lv().vue==='g'),'21/10 · la molette (le doigt) remonte au média précédent : c\'est le défilement, pas un changement de vue');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>document.getElementById('tlv').hidden&&window.__totehm_lv().vue==='g'&&!document.querySelector('#tlv .tlv-s')),'Échap referme la visionneuse : on reste dans la grille');

  // ══ 2 bis · 25/10 (Wah) : « LIRE ET SÉLECTIONNER UN MÉDIA OU UN SPOT À ENVOYER À L'IA » ══
  // Le geste est posé SUR la chose, là où je la regarde. Il ferme la visionneuse, emmène en bas, et pose une
  // PASTILLE au-dessus de ce que j'écris : un mot, l'élément, une croix. Seule une RÉFÉRENCE partira.
  await pg.click('#lv-sh .tl[data-i="0"] .tl-bx',{force:true});await pg.waitForTimeout(500);
  const ask=await pg.evaluate(()=>{const s0=document.querySelector('#tlv .tlv-s[data-j="0"]'), b=s0&&s0.querySelector('.tlv-b .sh-ask');
    return {n:document.querySelectorAll('#tlv .sh-ask').length, mot:b?b.textContent:'', svg:!!(b&&b.querySelector('svg.ask-hi')), maj:b?getComputedStyle(b).textTransform:'',
      ref:b?b.dataset.ask:'', sous:!!(b&&s0.querySelector('.tb')&&b.getBoundingClientRect().top>=s0.querySelector('.tb').getBoundingClientRect().top)};});
  await pg.click('#tlv .tlv-s[data-j="0"] .tlv-b .sh-ask');await vers(pg,'b');await pg.waitForTimeout(500);
  const ch=await pg.evaluate(()=>{const f=document.getElementById('lv-focus'), s=document.getElementById('lv-say');
    return {vue:window.__totehm_lv().vue, ferme:document.getElementById('tlv').hidden, ouvert:!f.classList.contains('hide'),
      mot:(f.querySelector('i')||{}).textContent||'', nom:(f.querySelector('b')||{}).textContent||'',
      x:!!f.querySelector('[data-sm-unfocus]'), ecrit:!!s&&!s.classList.contains('hide'),
      haut:!!s&&f.getBoundingClientRect().bottom<=s.getBoundingClientRect().top+1,
      montre:window.__totehm_lv().reflection.montre, n:window.__totehm_lv().reflection.montres};});
  ok(ask.n===1&&ask.ref==='em:m1'&&/^ask my\s+self$/i.test(ask.mot)&&ask.svg&&ask.maj==='uppercase'&&ask.sous,
     '25/10 · MON média porte le geste SOUS sa box, et il n\'envoie qu\'une référence ('+ask.ref+') — la vision, elle, n\'en a pas');
  ok(ch.vue==='b'&&ch.ferme&&ch.ouvert&&ch.mot==='media'&&ch.nom==='Run the hill'&&ch.x&&ch.ecrit&&ch.haut&&ch.montre==='media'&&ch.n===1,
     '25/10 · le geste emmène en bas : la pastille (media · Run the hill · ✕) se pose AU-DESSUS de ce que j\'écris → '+JSON.stringify(ch));
  await pg.click('#lv-focus [data-sm-unfocus]');await pg.waitForTimeout(250);
  ok(await pg.evaluate(()=>document.getElementById('lv-focus').classList.contains('hide')&&window.__totehm_lv().reflection.montre===null),
     '25/10 · la croix retire ce que je montre, et ce que j\'écrivais reste');
  await pg.click('#lvn-up');await vers(pg,'c');await pg.waitForTimeout(300);
  await pg.click('#lvn-lf');await vers(pg,'g');await pg.waitForTimeout(700);
  // on entre dans le Totehm par le centre, et l'on ouvre l'Habit
  await pg.click('#lvn-rt');await vers(pg,'c');await pg.waitForTimeout(300);
  await pg.click('#lv-tap-open');
  await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});
  await pg.waitForTimeout(1200);
  const h1=await pg.evaluate(()=>[...document.querySelectorAll('#habits > .habit[data-row]')].find(e=>/Run the hill/.test(e.textContent))?.dataset.row);
  await pg.locator('#habits [data-open="h:'+h1+'"]').evaluate(e=>e.click());await pg.waitForTimeout(500);
  const o=await pg.evaluate(()=>({vue:window.__totehm_zone.vue,ouverte:(document.querySelector('#habits .habit.open .v-name')||{}).textContent||'',
    fichiers:[...document.querySelectorAll('#habits .habit.open .m-f .mini-t')].map(e=>e.textContent.trim())}));
  ok(o.vue==='habits'&&o.ouverte==='Run the hill','dans le Totehm, l\'Habit s\'ouvre ('+o.vue+' · '+o.ouverte+')');
  ok(o.fichiers.length===1&&o.fichiers[0]==='Visualize it','20/10 · ses fichiers disent « Visualize it », jamais le nom du fichier ('+o.fichiers.join(' / ')+')');

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
  ok(puce.length===1&&puce[0]==='Visualize it','la capture se referme ; le fichier est là, dans l\'élément (« Visualize it », pas son nom)');
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
  /* les fichiers disent « Visualize it » : on reconnaît le PDF à son icône de document */
  const doc=()=>pg.evaluate(()=>[...document.querySelectorAll('#habits .habit.open .m-f')].findIndex(m=>/M6 3h8/.test(m.innerHTML)));
  await pg.evaluate(()=>[...document.querySelectorAll('#habits .habit.open .m-f')].find(m=>/M6 3h8/.test(m.innerHTML)).querySelector('.mini-t').click());await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>window.__ouvert.some(u=>/\/storage\/v1\/object\/sign\/element-media\//.test(u))),'un fichier s\'ouvre par son URL signée');
  const dels=log.upload.filter(u=>u.method==='DELETE').length;
  await pg.evaluate(()=>[...document.querySelectorAll('#habits .habit.open .m-f')].find(m=>/M6 3h8/.test(m.innerHTML)).querySelector('[data-emx]').click());await pg.waitForTimeout(700);
  ok(log.rpc.some(r=>r.name==='element_media_remove')&&log.upload.filter(u=>u.method==='DELETE').length===dels+1&&(await doc())===-1,'« × » : element_media_remove, le fichier s\'efface de mon dossier');
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

  // ══ 4 · → LES SPOTS (20/10 sexies) : MAP · GRID — la Terre et ses spots, nourrie par le Club (`club_spots`) ══
  await vers(pg,'c');
  await pg.click('#lvn-rt');await vers(pg,'d');await pg.waitForTimeout(1600);
  const d=await pg.evaluate(()=>{const c=document.getElementById('rdr-map'),a=document.getElementById('gate-asteroid'),
      rc=c.getBoundingClientRect(),ra=a.getBoundingClientRect(),r=window.__totehm_rdr();
    return {r,fond:getComputedStyle(c).backgroundColor,plein:Math.round(rc.width)===innerWidth&&Math.round(rc.height)>=innerHeight-2,
      dock:document.body.classList.contains('papier-haut'),radar:!!document.getElementById('rdr-c'),
      bascule:[...document.querySelectorAll('#rdr-mode [data-rmode]')].map(e=>e.textContent+(e.getAttribute('aria-checked')==='true'?'*':'')),
      basculeVue:getComputedStyle(document.getElementById('rdr-mode')).display!=='none',
      haut:ra.y+ra.height/2<90&&Math.abs((ra.x+ra.width/2)-innerWidth/2)<4&&ra.width<70};});
  const lus=log.rpc.filter(x=>x.name==='club_spots').map(x=>x.body.p_period);
  ok(lus.join(',')==='now,future'&&d.r.club.periode==='future',
     '→ les spots du CLUB : rien maintenant, la vue montre ce qui VIENT (club_spots : '+lus.join(' → ')+')');
  ok(!d.radar&&d.r.mode==='map'&&d.bascule.join(' ')==='Map* Grid'&&d.basculeVue,'plus de radar : MAP · GRID, au format de MINE · MEMBERS ; la vue s\'ouvre sur la CARTE');
  ok(d.r.carte.terres>100&&d.r.carte.points===1&&d.r.carte.villes===0,'la Terre (Natural Earth, '+d.r.carte.terres+' terres) et mon spot : un carré plein, à son point');
  ok(d.plein&&d.dock&&d.haut,'la carte prend l\'écran ; le Totehm est sorti se caler EN HAUT, centré');
  await pg.screenshot({path:OUT+'/spots_'+(tel?'tel':'ordi')+'.png'});
  // un tap sur le point : SON spot en grand, par-dessus (21/10 : plus de polaroid)
  const pt=(await pg.evaluate(()=>window.__totehm_carte()))[0];
  if(tel) await pg.touchscreen.tap(pt[0],pt[1]); else await pg.mouse.click(pt[0],pt[1]);
  await pg.waitForTimeout(1100);
  const sh2=await pg.evaluate(()=>{const c=document.querySelector('#rdr-sh .ssp-s.is-ici')||document.querySelector('#rdr-sh .ssp-s'),
      info=c&&c.querySelector('.ssp-info'),m=c&&c.querySelector('.ssp-m'),sd=c&&c.querySelector('.sdata'),im=m&&m.querySelector('img'),bx=c&&c.querySelector('.ssp-box');
    return {d:window.__totehm_rdr(), voit:document.body.classList.contains('rdr-voir'), n:document.querySelectorAll('#rdr-sh .ssp-s').length,
      pol:document.querySelectorAll('#rdr-sh .lsh-pol,#rdr-sh [data-pol],#rdr-sh .ssp-bg,#rdr-sh .ssp-top').length,
      fond:c?getComputedStyle(c).backgroundColor:'', dessus:info&&m&&sd&&bx?sd.getBoundingClientRect().bottom<=bx.getBoundingClientRect().top+1
        &&bx.getBoundingClientRect().bottom>=innerHeight-90&&info.getBoundingClientRect().top>m.getBoundingClientRect().top:false,
      ombre:bx?getComputedStyle(bx).boxShadow:'', loupe:!!(bx&&bx.querySelector('.loupe[data-vz]')),
      fit:im?getComputedStyle(im).objectFit:'', src:!!(im&&im.getAttribute('src')), rond:im?getComputedStyle(im).borderRadius:'',
      sdR:sd?getComputedStyle(sd).borderRadius:'', st:(sd&&sd.querySelector('.sd-tag.is-st')||{}).textContent||'',
      chips:sd?[...sd.querySelectorAll('.sd-tag')].map(e=>e.textContent):[], tagF:(()=>{const t=sd&&sd.querySelector('.sd-tag');return t?getComputedStyle(t).fontFamily:'';})(),
      say:(sd&&sd.querySelector('.sd-say')||{}).textContent||'', nom:(c&&c.querySelector('.ssp-box .tb .v-name')||{}).textContent||'',
      snap:getComputedStyle(document.getElementById('rdr-sh')).scrollSnapType, plein:c?Math.round(c.getBoundingClientRect().height)===innerHeight:false,
      cal:!!(c&&c.querySelector('.ssp-acts [data-ics]')), go:!!(c&&c.querySelector('.ssp-acts [data-go]')), x:getComputedStyle(document.getElementById('rdr-x')).display,
      ask:(()=>{const a=c&&c.querySelector('.ssp-acts [data-ask]');return a?a.dataset.ask+'|'+a.textContent+'|'+a.querySelectorAll('svg.ask-hi use[href="#higher-badge"]').length:'';})(),
      per:[...document.querySelectorAll('#rdr-flt [data-per]')].map(e=>e.textContent)};});
  ok(sh2.voit&&sh2.d.voit&&sh2.n===1&&/y mandatory/.test(sh2.snap)&&sh2.plein&&sh2.x==='block',
     'un tap sur le point : SON spot en grand, par-dessus la carte (un spot par écran, aimanté), ✕ pour revenir');
  ok(sh2.pol===0&&sh2.fond==='rgb(0, 0, 0)'&&sh2.src&&sh2.fit==='contain'&&sh2.rond==='0px',
     '21/10 · PLUS DE POLAROID : l\'image TELLE QU\'ELLE (contain, ni cadre ni recadrage) sur le NOIR → '+JSON.stringify({pol:sh2.pol,fond:sh2.fond,fit:sh2.fit}));
  ok(sh2.dessus&&sh2.nom==='Call mum'&&sh2.sdR==='16px'&&/I will be there/i.test(sh2.st)&&/Space Mono/.test(sh2.tagF),
     '22/10 · comme à gauche : la Habit Box TOUT EN BAS, par-dessus l\'image, et JUSTE AU-DESSUS les infos au format de figher.club (`.sdata` : rayon 16, étiquettes Space Mono, l\'état en premier)');
  await pg.click('#rdr-sh .ssp-s .ssp-box .loupe[data-vz]');await pg.waitForTimeout(300);
  const rz=await pg.evaluate(()=>({zoom:!!document.querySelector('#rdr-sh .ssp-s .ssp-box .v-col.is-zoom'),voir:document.body.classList.contains('rdr-voir'),gate:document.body.classList.contains('gate')}));
  ok(sh2.loupe&&/rgba\(0, 0, 0/.test(sh2.ombre)&&rz.zoom&&rz.voir&&rz.gate,'22/10 · la box surélevée porte sa LOUPE : elle s\'agrandit en place, le spot reste ouvert, le Totehm fermé → '+JSON.stringify(rz));
  ok(sh2.chips.some(t=>/oct|today|tomorrow|yesterday/i.test(t))&&sh2.chips.some(t=>/location on/i.test(t))
     &&sh2.chips.some(t=>/social/i.test(t))&&sh2.say==='Bring a coffee'&&sh2.go&&sh2.cal,
     'les informations du spot : '+sh2.chips.join(' · ')+' — son mot, GO, CALENDAR');
  ok(sh2.per.join(' ')==='I will be there','le temps courant, dans la barre : « '+sh2.per.join(' ')+' »');
  /* 25/10 (Wah) : MON spot se montre au Higher Self ; 26/10 (« j'ai pas compris ») : le geste dit son verbe, « Higher » en SVG. */
  ok(sh2.ask==='sp:sp1|ask my  self|1','26/10 · MON spot porte « ask my [Higher] self » à côté de GO et CALENDAR → '+sh2.ask);
  await pg.keyboard.press('Escape');await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>!document.body.classList.contains('rdr-voir')&&window.__totehm_lv().vue==='d'),'Échap referme la vue agrandie : on est de retour sur la carte');
  await pg.click('#lvn-lf');await vers(pg,'c');await pg.waitForTimeout(300);

  // ══ 4 bis · LE TOTEHM DOCKÉ CHOISIT LA BOX, LE FILTRE EST PROPRE À LA VUE, L'IMAGE SE RECADRE ══
  await vers(pg,'c');
  await pg.click('#lvn-lf');await vers(pg,'g');await pg.waitForTimeout(1000);
  // ══ LE FILTRE INTELLIGENT (20/10) : le Totehm docké l'ouvre DIRECTEMENT — une vue, puis une box de cette vue ══
  /* 26/10 (Wah) : « tu cliques sur le Totehm et boom, MY WISDOM, MY GRIND et MY VISION naissent de lui, fusionné-dilué-glissé-zoomé » —
     on relève la scène image par image : le logo part de la taille du Totehm docké, zoome, fond, puis les côtés glissent. */
  await pg.evaluate(()=>{ window.__nait=[]; const t0=performance.now(); const f=()=>{ const t=performance.now()-t0; if(t>1100) return;
    const c=document.querySelector('#lv-sh-sf .sfcmd');
    if(c){ const m=getComputedStyle(c).transform.match(/matrix\(([-\d.e]+)/), s=c.querySelector('.sfv-s');
      window.__nait.push([t, m?+m[1]:1, +getComputedStyle(s).opacity, c.classList.contains('is-split')]); }
    requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const papierDock=await pg.evaluate(()=>document.getElementById('gate-asteroid').getBoundingClientRect().width);
  await pg.click('#gate-asteroid');await pg.waitForTimeout(1200);
  const nait=await pg.evaluate(()=>window.__nait), cmdW=await pg.evaluate(()=>document.querySelector('#lv-sh-sf .sfv-g').getBoundingClientRect().width);
  const k0=nait.length?nait[0][1]:1, fin=nait[nait.length-1]||[0,0,0,false];
  ok(nait.length>15&&Math.abs(k0-papierDock/cmdW)<.08&&nait.some(x=>x[1]>k0+.05&&x[1]<.98)&&fin[1]===1&&fin[2]>.9&&fin[3],
    '26/10 · UN tap sur le Totehm docké : le logo part de SA taille (×'+k0.toFixed(2)+'), zoome, puis MY WISDOM et MY VISION glissent de sous lui ('+nait.length+' images)');
  const fz=await pg.evaluate(()=>({vu:!document.getElementById("lv-sh-sf").hidden, pick:!document.getElementById('lv-sh-pick').hidden,
    papiers:document.querySelectorAll('#lv-sh-sf .sfcmd .sfv').length,
    vues:[...document.querySelectorAll('#lv-sh-sf [data-sf="vue"]')].map(e=>e.textContent), boxes:document.querySelectorAll('#lv-sh-sf .sfb').length}));
  ok(fz.vu&&!fz.pick&&fz.papiers===3&&fz.vues.length===5&&fz.boxes===0&&fz.vues[0]==='my wisdom'&&fz.vues[fz.vues.length-1]==='my vision',
    'le Totehm docké ouvre le FILTRE : ses trois papiers, les cinq vues ('+fz.vues.join(' · ')+') — 26/10 : MY WISDOM, plus « story »');
  const ouvert=await pg.evaluate(()=>{const c=document.querySelector('#lv-sh-sf .sfcmd'),p=c.querySelector('.sfpile'),
      g=c.querySelector('.sfv-g').getBoundingClientRect();
    return {split:c.classList.contains('is-split'), lg:+getComputedStyle(c.querySelector('.sf-lg')).opacity,
      cotes:[...c.querySelectorAll('.sfv-s,.sfv-v')].map(e=>+getComputedStyle(e).opacity),
      pile:+getComputedStyle(p).opacity, large:Math.round(p.getBoundingClientRect().width), papier:Math.round(g.width),
      noms:[...p.querySelectorAll('i')].map(e=>e.textContent)};});
  ok(ouvert.split&&ouvert.lg<0.05&&ouvert.cotes.every(o=>o>0.9),
    '… sans second tap : les calques ont fondu, les deux papiers ont glissé aux extrémités');
  await pg.click('#lv-sh-sf [data-sf="grind"]');await pg.waitForTimeout(600);
  const grind=await pg.evaluate(()=>{const c=document.querySelector('#lv-sh-sf .sfcmd'),p=c.querySelector('.sfpile');
    return {op:+getComputedStyle(p).opacity, large:Math.round(p.getBoundingClientRect().width),
      papier:Math.round(c.querySelector('.sfv-g').getBoundingClientRect().width),
      noms:[...p.querySelectorAll('i')].map(e=>e.textContent)};});
  ok(grind.op>0.9&&grind.large<=grind.papier&&grind.noms.join(',')==='my objectives,my habits,my repulsions',
    '… et MY GRIND empile ses trois boutons DANS son navy : courts ('+grind.large+' px pour un papier de '+grind.papier+' px)');
  await pg.click('#lv-sh-sf [data-sf="vue"][data-v="objectives"]');await pg.waitForTimeout(400);
  const f1b=await pg.evaluate(()=>({boxes:[...document.querySelectorAll('#lv-sh-sf .sfb .tb .v-name')].map(e=>e.textContent),
    peau:(()=>{const h=document.querySelector('#lv-sh-sf .sfb .tb .h-body');return h?getComputedStyle(h).backgroundColor:'';})()}));
  ok(f1b.boxes.join('|')==='Ship it'&&f1b.peau==='rgb(54, 73, 140)','une vue choisie déplie SES boxes, au format Totehm (objectif : bleu clair) : '+f1b.boxes.join(' · '));
  await pg.click('#lv-sh-sf [data-sf="vue"][data-v="habits"]');await pg.waitForTimeout(400);
  await pg.locator('#lv-sh-sf .sfb').filter({hasText:'Run the hill'}).first().click();await pg.waitForTimeout(600);
  const f1c=await pg.evaluate(()=>({ferme:document.getElementById('lv-sh-sf').hidden&&!document.body.classList.contains('sf-nait'), items:window.__totehm_sh().items,
    tete:(document.querySelector('#lv-sh .tl-sel .tb .v-name')||{}).textContent||'', minis:document.querySelectorAll('#lv-sh .tl-sel .tb .mini').length}));
  ok(f1c.ferme&&f1c.items===1&&f1c.tete==='Run the hill'&&f1c.minis===2,'la box choisie filtre la grille ET revient EN TÊTE des résultats, entière ('+f1c.tete+')');
  await pg.click('#lv-sh .tl-sel');await pg.waitForTimeout(400);
  ok(await pg.evaluate(()=>!document.getElementById('lv-sh-sf').hidden),'toucher la box en tête rouvre le filtre');
  await pg.click('#lv-sh-sf [data-sf="all"]');await pg.waitForTimeout(400);
  await pg.keyboard.press('Escape');await pg.waitForTimeout(400);
  // le panneau de gauche : ce que ça montre, la vue d'origine, les intentions (la grille n'a plus d'étages)
  await pg.click('#lv-sh-flt [data-f="sf"]');await pg.waitForTimeout(400);
  const pan=await pg.evaluate(()=>({lab:[...document.querySelectorAll('#lv-sh-sf .sfl')].map(e=>e.textContent),
    ints:document.querySelectorAll('#lv-sh-sf [data-sf="int"]').length, vues:document.querySelectorAll('#lv-sh-sf [data-sf="vue"]').length}));
  /* 21/10 — les cinq vues sont un BLOC DE COMMANDE (la croix du TOTEHM), sans libellé : le design parle. */
  ok(pan.ints===7&&pan.vues===5&&pan.lab.includes('It shows')&&!pan.lab.includes('Views')&&pan.lab.includes('Intentions')&&!pan.lab.includes('My Box'),
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
  // la tuile « + » (26/10, Wah : « le add a media sous la forme d'un plus, avec le Totehm qui se déploie avec la même logique —
  // le déploiement du Totehm filtre, pas celui de la vue centrale ») : le MÊME Totehm naît, on choisit l'élément, la caméra suit
  const fa=await pg.evaluate(()=>window.__totehm_sh().filtre), na=await pg.evaluate(()=>window.__totehm_sh().naissances);
  await pg.click('#lv-sh .tl-add');await pg.waitForTimeout(1000);
  const aj=await pg.evaluate(()=>({vu:!document.getElementById('lv-sh-sf').hidden, pick:!document.getElementById('lv-sh-pick').hidden, gate:document.body.classList.contains('gate'),
    mot:(document.querySelector('#lv-sh-sf .sf-aj')||{}).textContent||'', split:!!document.querySelector('#lv-sh-sf .sfcmd.is-split'),
    groupes:[...document.querySelectorAll('#lv-sh-sf .sfl')].map(e=>e.textContent), d:window.__totehm_sh()}));
  ok(aj.vu&&!aj.pick&&aj.gate&&aj.mot==='+ media'&&aj.split&&aj.d.ajout&&aj.d.naissances===na+1&&!aj.groupes.some(g=>/shows|Intentions/i.test(g)),
    '26/10 · la tuile « + » fait naître le Totehm du filtre (pas le déploiement central) : ses trois parties, rien d\'autre → '+JSON.stringify({mot:aj.mot,g:aj.groupes}));
  await pg.click('#lv-sh-sf [data-sf="grind"]');await pg.waitForTimeout(500);
  await pg.click('#lv-sh-sf .sfpile [data-v="habits"]');await pg.waitForTimeout(400);
  await pg.locator('#lv-sh-sf .sfb').filter({hasText:'Run the hill'}).first().click();await pg.waitForTimeout(500);
  const cap=await pg.evaluate(()=>({o:window.__totehm_sh().capture.ouvertures, ferme:document.getElementById('lv-sh-sf').hidden, f:window.__totehm_sh().filtre, aj:window.__totehm_sh().ajout}));
  ok(cap.o>0&&cap.ferme&&cap.f===fa&&!cap.aj,'… MY GRIND → MY HABITS → une box : la capture s\'ouvre POUR elle, et le filtre de la grille n\'a pas bougé ('+cap.f+')');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(500);
  // la vue de droite : le TOTEHM DOCKÉ ouvre le filtre — ses Habits (au format Totehm), le temps, les intentions « X [Higher] »
  await pg.click('#lvn-rt');await vers(pg,'c');await pg.click('#lvn-rt');await vers(pg,'d');await pg.waitForTimeout(1000);
  await pg.click('#gate-asteroid');await pg.waitForTimeout(500);
  const panD=await pg.evaluate(()=>({l:[...document.querySelectorAll('#rdr-sf .sfl')].map(e=>e.textContent),
    habits:[...document.querySelectorAll('#rdr-sf .sfb')].map(e=>(e.querySelector('.tb .v-name')?'':'!')+(e.querySelector('.v-name,.lsh-t')||{}).textContent.trim()),
    higher:document.querySelectorAll('#rdr-sf .sfi .sfh').length,
    quand:[...document.querySelectorAll('#rdr-sf [data-sf="per"]')].map(e=>e.textContent+(e.classList.contains('is-on')?'*':''))}));
  ok(panD.l.join(' · ')==='Habits · When · Intentions · It shows · Where · Whose','à droite, le Totehm docké ouvre LE filtre : '+panD.l.join(' · '));
  /* (« Read at dawn » a été renommée puis SUPPRIMÉE plus haut : il en reste deux.) */
  ok(panD.habits.join('|')==='Run the hill|Call mum','les HABITS seules, au format Totehm (un spot ne vit qu\'une Habit) : '+panD.habits.join(' · '));
  ok(panD.quand.join(' · ')==='I was here · I am here · I will be there*'&&panD.higher===7,'le temps : '+panD.quand.join(' · ')+' ; les intentions portent le badge [Higher]');
  // le passé : le spot d'un AUTRE membre, sans média, la ville seule, son auteur — puis la GRILLE
  await pg.click('#rdr-sf [data-sf="per"][data-v="past"]');await pg.waitForTimeout(800);
  await pg.click('#rdr-sf [data-sf="close"]');await pg.waitForTimeout(300);
  const mp=await pg.evaluate(()=>window.__totehm_rdr().carte);
  ok(mp.villes===2&&mp.points===2,'la carte : deux spots dont je ne vois que la VILLE — deux carrés CREUX, jamais un faux point');
  await pg.click('#rdr-mode [data-rmode="grid"]');await pg.waitForTimeout(1200);
  const gr=await pg.evaluate(()=>({d:window.__totehm_rdr(),grid:document.body.classList.contains('rdr-grid'),
    tuiles:document.querySelectorAll('#rdr-g .tl[data-cle]').length,boxes:[...document.querySelectorAll('#rdr-g .tl-bx .tb .v-name')].map(e=>e.textContent.trim()),
    navy:(()=>{const h=document.querySelector('#rdr-g .tl-bx .tb .habit .h-body');return h?getComputedStyle(h).backgroundColor:'';})(),
    rond:(()=>{const t=document.querySelector('#rdr-g .tl[data-cle]');return t?getComputedStyle(t).borderRadius:'';})(),
    vign:(document.querySelector('#rdr-g img[data-bunny]')||{}).src||''}));
  ok(gr.grid&&gr.d.mode==='grid'&&gr.tuiles===2&&gr.boxes.join('|')==='Swim at dawn|Dance'&&gr.navy==='rgb(51, 51, 102)',
     'GRID : une tuile par spot, et dessus SA Habit Box au format Totehm ('+gr.boxes.join(' · ')+')');
  ok(parseFloat(gr.rond)>=14,'21/10 · les images de la grille de droite sont ARRONDIES ('+gr.rond+')');
  if(!tel){ const t2=await pg.$('#rdr-g .tl[data-cle]'), b2=await t2.boundingBox(); await pg.mouse.move(b2.x+b2.width/2,b2.y+b2.height/2); await pg.waitForTimeout(350);
    const h2=await pg.evaluate(()=>{const cs=getComputedStyle(document.querySelector('#rdr-g .tl[data-cle]'));return cs.transform+' | '+cs.boxShadow;});
    ok(/matrix\(1\.06, 0, 0, 1\.06/.test(h2)&&/rgba\(0, 0, 0/.test(h2),'22/10 · à droite aussi, la tuile grandit au survol, son ombre suit ses coins arrondis → '+h2);
    await pg.mouse.move(2,2); await pg.waitForTimeout(300); }
  const bv=log.functions.filter(f=>f.name==='bunny-video');
  ok(bv.length>=1&&bv[0].body.clips[0].id==='cccccccc-cccc-4ccc-8ccc-cccccccccccc'&&bv[0].body.clips[0].spot==='sp3'&&/\/thumbnail\.jpg$/.test(gr.vign),
     'le clip : sa VIGNETTE Bunny, signée par le serveur ({id, spot}) — jamais une URL en dur');
  await pg.click('#rdr-g .tl[data-cle="sp:sp2"]');await pg.waitForTimeout(900);
  const pas2=await pg.evaluate(()=>{const c=document.querySelector('#rdr-sh .ssp-s.is-ici')||document.querySelector('#rdr-sh .ssp-s');
    return {n:document.querySelectorAll('#rdr-sh .ssp-s').length, by:(c&&c.querySelector('.ssp-by')||{}).textContent||'',
      sans:!!(c&&c.classList.contains('is-nu')&&!c.querySelector('.ssp-m')), chips:c?[...c.querySelectorAll('.sdata .sd-tag')].map(e=>e.textContent):[],
      mini:c?[...c.querySelectorAll('.ssp-box .tb .mini.m-o')].map(e=>e.textContent):[], rep:c?[...c.querySelectorAll('.ssp-box .tb .mini.m-r')].map(e=>e.textContent):[],
      ask:!!(c&&c.querySelector('[data-ask]')),
      d:window.__totehm_rdr()};});
  ok(pas2.n===2&&pas2.by==='kai3'&&pas2.sans&&pas2.chips.some(t=>/Porto/.test(t))&&pas2.chips.some(t=>/location off/i.test(t))&&pas2.chips.some(t=>/I was here/.test(t))
     &&pas2.mini.includes('Cross the bay')&&pas2.d.club.periode==='past',
     'la tuile ouvre SON spot en grand : un AUTRE membre (kai3), sans média (les infos seules, centrées), la ville seule, sa box et ses mini-boîtes au format Totehm → '+JSON.stringify({m:pas2.mini,r:pas2.rep}));
  ok(!pas2.ask,'25/10 · le spot d\'un AUTRE membre ne se montre pas à mon Higher Self (le serveur ne relit que mes lignes)');
  await pg.click('#rdr-sh .ssp-s.is-ici [data-who]');await pg.waitForTimeout(600);
  ok(await pg.evaluate(()=>(window.__totehm_xo()||{}).actif==='univers'),'son nom : il faut s\'abonner pour lire son Totehm → SA page de vente, sur place');
  await pg.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})));
  await pg.waitForFunction(()=>!(window.__totehm_xo()||{}).actif,null,{timeout:6000}).catch(()=>{});
  await pg.waitForTimeout(800);
  // le filtre part au SERVEUR
  await pg.click('#gate-asteroid');await pg.waitForTimeout(400);
  await pg.click('#rdr-sf [data-sf="int"][data-v="love"]');await pg.waitForTimeout(700);
  const q1=log.rpc.filter(x=>x.name==='club_spots').pop();
  ok(q1&&JSON.stringify(q1.body.p_filters.intentions)==='["love"]'&&(await pg.evaluate(()=>window.__totehm_rdr().club.items))===0,
     'une intention part au SERVEUR (club_spots filtre avant la pagination) : '+JSON.stringify(q1&&q1.body.p_filters));
  await pg.click('#rdr-sf [data-sf="box"]');await pg.waitForTimeout(700);
  const q3=log.rpc.filter(x=>x.name==='club_spots').pop();
  ok(q3&&q3.body.p_filters.habit==='Run the hill','une Habit choisie part au serveur (habit : '+(q3&&q3.body.p_filters.habit)+')');
  await pg.click('#gate-asteroid');await pg.waitForTimeout(400);
  await pg.click('#rdr-sf [data-sf="ou"][data-v="near"]');await pg.waitForTimeout(900);
  const q2=log.rpc.filter(x=>x.name==='club_spots').pop();
  ok(q2&&q2.body.p_filters.scope==='near'&&typeof q2.body.p_lat==='number','« near me » demande la position au geste et la passe au serveur');
  await pg.click('#rdr-sf [data-sf="all"]');await pg.waitForTimeout(600);
  await pg.click('#rdr-sf [data-sf="qui"][data-v="mine"]');await pg.waitForTimeout(700);
  ok((await pg.evaluate(()=>window.__totehm_rdr())).grille.tuiles===0,'« mine » : seulement mes spots (kai3 sort)');
  await pg.click('#rdr-sf [data-sf="all"]');await pg.waitForTimeout(600);
  await pg.keyboard.press('Escape');await pg.waitForTimeout(400);
  await pg.click('#rdr-mode [data-rmode="map"]');await pg.waitForTimeout(700);
  ok((await pg.evaluate(()=>window.__totehm_rdr())).mode==='map','retour à MAP : le même objet, rien de redemandé');
  await pg.screenshot({path:OUT+'/spots_grid_'+(tel?'tel':'ordi')+'.png'});
  await pg.click('#lvn-lf');await vers(pg,'c');await pg.waitForTimeout(300);

  // ══ 5 · PENDANT LA RECHERCHE MEMBERS (26/10, Wah : « les mouvements de joystick ne marchent plus ») : la croix reste vivante ;
  //      un geste referme la recherche, puis voyage ══
  await pg.click('#lv-m-members');await pg.waitForTimeout(1300);
  const gal=await pg.evaluate(()=>({lf:document.getElementById('lvn-lf').classList.contains('is-mort'),
    rt:document.getElementById('lvn-rt').classList.contains('is-mort')}));
  await pg.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'})));await vers(pg,'d');await pg.waitForTimeout(500);
  const ap=await lv(pg);
  ok(!gal.lf&&!gal.rt&&ap.vue==='d'&&ap.mode==='mine'&&!ap.membre.cherche,'26/10 · Members (la recherche) : les chevrons latéraux restent vivants ; → referme la recherche et mène à MES spots');
  await pg.click('#lvn-lf');await vers(pg,'c');await pg.waitForTimeout(300);
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

 // ── en lecture (le Totehm d'un autre, 20/10 sexies) : SON écosystème — ni mes fichiers ni la capture ; à gauche SES médias ──
 {const source={ok:true,pseudo:'studio',steps:[{t:'Deep practice',is:['focus']}],objs:{},trips:[],reps:[],wisdom:[],visions:[]};
  const SID='22222222-2222-4222-8222-222222222222';
  const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{...serveur(),totehm_of:source,habit_spaces:{ok:true,mine:false,habits:[]},
    member_media:{ok:true,items:[{id:'x1',kind:'h',ref:'Deep practice',path:SID+'/m-dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg',mime:'image/jpeg',created_at:'2026-10-18T10:00:00Z'}]},
    club_spots_of:{ok:true,items:[],total:0}}});
  await pg.route(/\/storage\/v1\/object\/sign\//,r=>r.request().method()==='GET'?r.fulfill({status:200,contentType:'image/png',body:PNG}):r.fallback());
  await pg.goto(origin+'/totehm?ro=studio');await pg.waitForSelector('body.ro:not(.gate)');await pg.waitForTimeout(700);
  await pg.locator('#habits [data-open]').first().evaluate(e=>e.click());await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>!document.getElementById('vmode')&&!document.querySelector('#habits [data-cap],#habits .m-f')),'en lecture : ni bascule, ni fichiers, ni capture');
  ok(!log.rpc.some(r=>r.name==='element_media_list')&&log.rpc.some(r=>r.name==='member_media'&&r.body.p_pseudo==='studio'),'en lecture : MES fichiers ne sont jamais lus — les SIENS (`member_media`)');
  await pg.keyboard.press('Escape');await pg.waitForFunction(()=>document.body.classList.contains('gate'),null,{timeout:8000}).catch(()=>{});await pg.waitForTimeout(1500);
  ok(await pg.evaluate(()=>document.body.classList.contains('lv-membre')&&document.getElementById('lv-m-who').textContent==='studio'),'replié : on est dans SON écosystème ([Members] · studio)');
  await pg.click('#lvn-lf');await vers(pg,'g');await pg.waitForTimeout(900);
  const g=await pg.evaluate(()=>({t:document.querySelectorAll('#lv-sh .tl[data-pol]').length,plus:!!document.querySelector('#lv-sh [data-add]'),
    box:(document.querySelector('#lv-sh .tl-bx .tb .v-name')||{}).textContent||''}));
  ok(g.t===1&&!g.plus&&g.box.trim()==='Deep practice','← chez lui : SES médias, avec SA box (« '+g.box.trim()+' »), et pas de « + »');
  ok(!erreurs(log).length,'lecture : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 25/10 (Wah : « il faut pouvoir supprimer les media dans la vue de gauche et de droite ») : DEUX gestes, puis le serveur ──
 {const srv=serveur(), retires=[];
  srv.spot_remove=b=>{ retires.push(b.p_spot); return b.p_spot==='sp1'?{ok:true}:{ok:false,why:'not_mine'}; };
  srv.vision_image_set=b=>({ok:true,image:b.p_path,old:b.p_path===null?UID+'/vision-cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg':null});
  const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:srv});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.click('#lvn-lf');await vers(pg,'g');await pg.waitForTimeout(700);
  const n0=await pg.evaluate(()=>document.querySelectorAll('#lv-sh .tl[data-i]').length);
  await pg.click('#lv-sh .tl[data-i="0"] .tl-bx',{force:true});await pg.waitForTimeout(500);
  const d0=await pg.evaluate(()=>{const b=document.querySelector('#tlv [data-tlv="del"]');return {vu:!b.hidden,t:b.textContent};});
  await pg.click('#tlv [data-tlv="del"]');await pg.waitForTimeout(150);
  const d1=await pg.evaluate(()=>({t:document.querySelector('#tlv [data-tlv="del"]').textContent,ouvert:!document.getElementById('tlv').hidden}));
  ok(d0.vu&&d0.t==='delete'&&d1.t==='delete?'&&d1.ouvert&&!log.rpc.some(r=>/element_media_remove|vision_image_set/.test(r.name)),
     '25/10 · à gauche, [delete] sur MON média : un premier tap l\'ARME (« delete? »), rien ne part encore → '+JSON.stringify({d0,d1}));
  await pg.click('#tlv [data-tlv="del"]');await pg.waitForTimeout(800);
  const d2=await pg.evaluate(()=>({ferme:document.getElementById('tlv').hidden,n:document.querySelectorAll('#lv-sh .tl[data-i]').length}));
  const r1=log.rpc.find(r=>r.name==='element_media_remove'||r.name==='vision_image_set');
  ok(d2.ferme&&d2.n===n0-1&&r1&&(r1.name==='vision_image_set'?r1.body.p_path===null:!!r1.body.p_id),
     '25/10 · le second tap le RETIRE au serveur ('+(r1&&r1.name)+') et la grille perd sa tuile : '+n0+' → '+d2.n);
  // → mes spots : [delete] sur le mien seulement
  await pg.click('#lvn-rt');await vers(pg,'c');await pg.waitForTimeout(300);await pg.click('#lvn-rt');await vers(pg,'d');await pg.waitForTimeout(900);
  const pt=(await pg.evaluate(()=>window.__totehm_carte()))[0];
  await pg.mouse.click(pt[0],pt[1]);await pg.waitForTimeout(1100);
  const s0=await pg.evaluate(()=>({mien:document.querySelectorAll('#rdr-sh .ssp-s .ssp-acts [data-del="sp1"]').length,
    autres:document.querySelectorAll('#rdr-sh .ssp-s .ssp-acts [data-del]:not([data-del="sp1"])').length}));
  await pg.click('#rdr-sh .ssp-acts [data-del="sp1"]');await pg.waitForTimeout(150);
  const arme=await pg.evaluate(()=>(document.querySelector('#rdr-sh .ssp-acts [data-del="sp1"]')||{}).textContent);
  await pg.click('#rdr-sh .ssp-acts [data-del="sp1"]');await pg.waitForTimeout(900);
  const s1=await pg.evaluate(()=>({reste:document.querySelectorAll('#rdr-sh [data-del="sp1"]').length,points:window.__totehm_carte().length}));
  ok(s0.mien===1&&s0.autres===0&&arme==='delete?'&&retires.join()==='sp1'&&s1.reste===0&&s1.points===0,
     '25/10 · à droite, [delete] sur MON spot seulement ; deux taps → `spot_remove`, il quitte le fil et la carte → '+JSON.stringify({s0,arme,retires,s1}));
  ok(!erreurs(log).length,'retirer : aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();}
 // ── mouvement réduit : la grille sans défilement doux, la carte sans transformation ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:serveur()});
  await pg.emulateMedia({reducedMotion:'reduce'});
  await pg.route(/\/storage\/v1\/object\/sign\//,r=>r.request().method()==='GET'?r.fulfill({status:200,contentType:'image/png',body:PNG}):r.fallback());
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.click('#lvn-lf');await vers(pg,'g');await pg.waitForTimeout(700);
  const r=await pg.evaluate(()=>({n:document.querySelectorAll('#lv-sh .tl[data-pol]').length,
    sb:getComputedStyle(document.getElementById('lv-sh')).scrollBehavior,
    tr:getComputedStyle(document.querySelector('#lv-sh .tl-ph img')).transitionDuration,
    tb:getComputedStyle(document.querySelector('#lv-sh .tl-bx')).transitionDuration}));
  ok(r.n===2&&r.sb==='auto'&&/^0s/.test(r.tr),'mouvement réduit : la grille, sans animation ni défilement doux ('+JSON.stringify(r)+')');
  await pg.click('#lvn-rt');await vers(pg,'c');await pg.click('#lvn-rt');await vers(pg,'d');await pg.waitForTimeout(600);
  const rr=await pg.evaluate(()=>({r:window.__totehm_rdr(),m:window.__totehm_lv().ramifications}));
  ok(rr.r.carte.points===1&&rr.m.morphs===0,'mouvement réduit : la carte place ses points, et les traits ne se transforment pas');
  ok(!erreurs(log).length,'mouvement réduit : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
}finally{await browser.close();}
