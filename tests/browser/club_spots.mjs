// 09/11/2026 — FIGHER.CLUB, LA SIXIÈME VUE (Wah : « le prolongement de totehm.com ; la configuration de la page
// est à l'image de la vue de droite, avec le RADAR au lieu de la map, et on garde les grid »).
//   1 · deux modes qui lisent le MÊME objet : RADAR (moi au centre, un carré par spot) et GRID (les tuiles de COM).
//   2 · plus de joystick, plus de « What is a spot? » : la définition vit DANS la prise de spot.
//   3 · le filtre : MES Habits → les spots dont la Habit RESSEMBLE à la mienne (`akin`, le serveur trie), et
//       [exactly this one] referme sur elle seule (`habit`). Chaque spot DIT pourquoi il répond.
//   4 · la prise de spot, ici : la même logique qu'à droite de COM — WHEN décide de WHERE.
//   5 · un spot ouvert : son média, sa box, ses gestes ; GO résout les droits au moment du geste.
// Tout est simulé (comptes, RPC, stockage, géocodeur) : aucune écriture en production. LANCER : node club_spots.mjs /tmp
import fs from 'node:fs'; import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp'; fs.mkdirSync(OUT,{recursive:true});
const browser=await launch(); const origin='https://www.figher.club'; const now=Date.now();
const UID='11111111-1111-4111-8111-111111111111';
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const MOMENT=new RegExp('^moments/'+UID+'/[0-9a-f-]{36}\\.(jpg|mp4|webm|mov)$');
const VILLES={cities:[['Lisbon',38.72,-9.14,1,'PT'],['Porto',41.15,-8.61,1,'PT']]};
const ADRESSES=[{lat:'41.1495',lon:'-8.6108',display_name:'Rua de Santa Catarina, Porto, Portugal'},
  {lat:'41.1579',lon:'-8.6291',display_name:'Praça da Liberdade, Porto, Portugal'}];
const HABITS=[{name:'Run the hill',freq:'every_morning',ints:['fight'],step:{t:'Run the hill',f:'every_morning',is:['fight']},
               objectives:[{text:'Move with friends'}],repulsions:[{text:'Skipping it'}]},
              {name:'Call mum',freq:'weekly',ints:['love'],step:{t:'Call mum',f:'weekly',is:['love']},objectives:[],repulsions:[]}];
const sp=(id,extra={})=>({id,habit:'Run the hill',intentions:['fight'],freq:'every_morning',visibility:'shared',mode:'social',
  creator:'nia',mine:false,city:'Lisbon',audience:'figher',starts_at:new Date(now-1000).toISOString(),
  ends_at:new Date(now+36e5).toISOString(),duration_min:60,exact:{lat:38.73,lng:-9.15,place:'the hill'},
  habit_box:{name:'Run the hill',ints:['fight'],freq:'every_morning',objectives:[{text:'Move with friends'}],repulsions:[]},...extra});
const etat=pg=>pg.evaluate(()=>window.__totehm_club());
const etapes=pg=>pg.evaluate(()=>[...document.querySelectorAll('#rdr-new .sfl')].map(e=>e.textContent));
const clic=(pg,sel)=>pg.$eval(sel,e=>e.click());
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
try{
 for(const [nom,vp,tel] of [['téléphone',{width:390,height:844},true],['ordinateur',{width:1280,height:800},false]]){
  let appels=[], geocodes=0;
  const {pg,log}=await page(browser,{dir:'club',origin,viewport:vp,hasTouch:tel,
    tables:{profiles:[{pseudo:'wahigher'}]},
    rpc:{spot_rules:{clip_seconds:33,clip_max_bytes:48000000,duration_min:5,duration_max:720,horizon_days:90},
         space_habits:{ok:true,habits:HABITS}, sso_epoch:1,
         club_spots:b=>{ appels.push(b);
           const f=b.p_filters||{};
           const l=b.p_period!=='now'?[]
             :f.habit?[sp('a')]
             :f.akin?[sp('a',{kin:{score:1,why:'same'}}),sp('b',{id:'b',habit:'Lift heavy',exact:null,
                 habit_box:{name:'Lift heavy',ints:['fight']},kin:{score:0.36,why:'intentions'}})]
             :[sp('a'),sp('b',{id:'b',exact:null})];
           return {ok:true,period:b.p_period,items:l,total:l.length,has_more:false,next_offset:l.length,as_of:new Date(now).toISOString()}; },
         spot_get:b=>({ok:true,spot:sp(b.p_id)}),
         spot_create_audience:b=>MOMENT.test('moments/'+b.p_video)?{ok:true,id:'sp9',audience:b.p_audience}:{ok:false,why:'video'},
         spot_schedule_audience:{ok:true,id:'sp10',audience:'private'},
         spot_box_set:{ok:true}}});
  await pg.route('**/cities.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(VILLES)}));
  await pg.route('**nominatim.openstreetmap.org/**',r=>{geocodes++;r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(ADRESSES)});});
  await pg.goto(origin+'/');
  await pg.waitForFunction(()=>window.__totehm_club?.().signed_in,null,{timeout:12000});
  await pg.waitForTimeout(1200);

  // ══ 1 · LA PAGE ══
  const s0=await etat(pg);
  ok(s0.mode==='radar'&&s0.club.items===2&&s0.radar.lieux===2&&s0.radar.radius>40,
     nom+' · le Club se lit et le RADAR place ses spots (r='+s0.radar.radius+', lieux='+s0.radar.lieux+', portée '+s0.radar.portee+')');
  const nu=await pg.evaluate(()=>({joy:!!document.getElementById('joy'), about:!!document.getElementById('space-about'),
    quoi:/what is a spot/i.test(document.body.innerText), titre:!!document.getElementById('club-title'),
    logo:!!document.querySelector('#club-logo svg rect[mask]')&&!!document.querySelector('#club-logo svg path')}));
  ok(!nu.joy&&!nu.about&&!nu.quoi&&!nu.titre&&nu.logo,
     nom+' · plus de joystick, plus de « What is a spot? », plus de « [Higher] Spots » : le TOTEHM docké de totehm.com en tête');
  const barre=await pg.evaluate(()=>[...document.querySelectorAll('#rdr-flt button')].map(e=>e.textContent));
  ok(barre.join('|')==='now|Filter · 1',nom+' · la barre : le temps courant, puis Filter (near me, posé à l\'arrivée) — rien d\'autre');
  await pg.screenshot({path:OUT+'/club_radar_'+(tel?'tel':'ordi')+'.png'});

  // ══ 2 · RADAR | GRID, le même objet ══
  await clic(pg,'#rdr-mode [data-rmode="grid"]'); await pg.waitForTimeout(600);
  const g=await pg.evaluate(()=>({t:window.__totehm_club().grille.tuiles, mode:window.__totehm_club().mode,
    plus:!!document.querySelector('#rdr-g-f .tl-add'), box:[...document.querySelectorAll('.tl-bx .v-name')].map(e=>e.textContent)}));
  ok(g.mode==='grid'&&g.t===2&&g.plus&&g.box.length===2,
     nom+' · GRID : les mêmes spots en tuiles, la box du TOTEHM posée dessus, le « + » en tête → '+g.box.join(' · '));
  await pg.screenshot({path:OUT+'/club_grid_'+(tel?'tel':'ordi')+'.png'});

  // ══ 3 · LE FILTRE : une Habit choisie ouvre ses PARENTES ══
  await clic(pg,'#rdr-flt button:last-child'); await pg.waitForTimeout(500);
  const f0=await pg.evaluate(()=>({l:[...document.querySelectorAll('#rdr-sf .sfl')].map(e=>e.textContent),
    h:[...document.querySelectorAll('#rdr-sf [data-sf="habit"] .v-name')].map(e=>e.textContent)}));
  ok(f0.h.join('|')==='Run the hill|Call mum'&&f0.l.join('|')==='Habits|When|Where|Together|Intentions|It shows',
     nom+' · le filtre s\'ouvre sur MES Habits, au format du TOTEHM, puis : '+f0.l.slice(1).join(' · '));
  appels=[];
  await pg.$eval('#rdr-sf [data-sf="habit"]',e=>e.click());
  await pg.waitForFunction(()=>window.__totehm_club().akin,null,{timeout:6000}).catch(()=>{});
  await pg.waitForTimeout(400);
  const ak=appels.filter(a=>a.p_filters&&a.p_filters.akin).pop();
  const f1=await pg.evaluate(()=>({l:[...document.querySelectorAll('#rdr-sf .sfl')].map(e=>e.textContent),
    proche:[...document.querySelectorAll('#rdr-sf [data-sf="near"]')].map(e=>e.childNodes[0].textContent)}));
  ok(ak&&ak.p_filters.akin==='Run the hill'&&!ak.p_filters.habit&&f1.l.includes('how close')
     &&f1.proche.join('|')==='akin habits|exactly this one',
     nom+' · une Habit choisie demande au serveur ses PARENTES (`akin`), pas une égalité → '+JSON.stringify(ak&&ak.p_filters));
  await clic(pg,'#rdr-sf [data-sf="close"]'); await pg.waitForTimeout(500);
  const kin=await pg.evaluate(()=>({k:[...document.querySelectorAll('.tl-kin')].map(e=>e.textContent),
    n:(document.querySelector('#rdr-flt button:last-child')||{}).textContent}));
  ok(kin.k.join('|')==='same habit|same intentions'&&kin.n==='Filter · 2',
     nom+' · chaque spot DIT pourquoi il répond : '+kin.k.join(' · ')+' ; la barre compte le filtre ('+kin.n+')');
  appels=[];
  await clic(pg,'#rdr-flt button:last-child'); await pg.waitForTimeout(400);
  await clic(pg,'#rdr-sf [data-sf="near"][data-v="exact"]'); await pg.waitForTimeout(600);
  const ex=appels.filter(a=>a.p_filters&&a.p_filters.habit).pop();
  ok(ex&&ex.p_filters.habit==='Run the hill'&&!ex.p_filters.akin,
     nom+' · [exactly this one] referme sur la Habit SEULE (`habit`) → '+JSON.stringify(ex&&ex.p_filters));
  appels=[];
  await clic(pg,'#rdr-sf [data-sf="mode"][data-v="social"]'); await pg.waitForTimeout(500);
  const md=appels.pop();
  ok(md&&md.p_filters.mode==='social',nom+' · « together » part au serveur : le Club sert à se rencontrer → mode='+(md&&md.p_filters.mode));
  await clic(pg,'#rdr-sf [data-sf="all"]'); await pg.waitForTimeout(500);
  ok((await pg.evaluate(()=>window.__totehm_club().filtres))===0,nom+' · ALL rend la vue entière');
  await pg.screenshot({path:OUT+'/club_filtre_'+(tel?'tel':'ordi')+'.png'});
  await clic(pg,'#rdr-sf [data-sf="close"]'); await pg.waitForTimeout(400);

  // ══ 4 · LA PRISE DE SPOT, ICI ══
  await clic(pg,'#rdr-g-f .tl-add'); await pg.waitForTimeout(600);
  const p0=await pg.evaluate(()=>({def:(document.querySelector('#rdr-new .ns-def')||{}).textContent||'',
    l:[...document.querySelectorAll('#rdr-new .sfl')].map(e=>e.textContent),
    h:[...document.querySelectorAll('#rdr-new [data-ns="h"] .v-name')].map(e=>e.textContent)}));
  ok(/^A spot is a Habit of your TOTEHM that becomes an action in one exact place, one exact moment\.$/.test(p0.def)
     &&p0.l.join('|')==='+ spot|which habit?'&&p0.h.join('|')==='Run the hill|Call mum',
     nom+' · la prise DIT ce qu\'est un spot, puis MES Habits : '+p0.h.join(' · '));
  await pg.locator('#rdr-new [data-ns="h"]').filter({hasText:'Call mum'}).first().click(); await pg.waitForTimeout(300);
  await clic(pg,'#rdr-new [data-ns="quand"][data-v="later"]'); await pg.waitForTimeout(300);
  const l1=await etapes(pg);
  ok(l1.join('|')==='+ spot|my habit|when|the day and the hour|where',
     nom+' · LATER : la date ET l\'heure tout de suite, puis WHERE — rien d\'autre');
  await clic(pg,'#rdr-new [data-ns="ou"][data-v="ailleurs"]'); await pg.waitForTimeout(300);
  await pg.fill('#rdr-new [data-nsi="adr"]','rua de santa catarina porto'); await pg.waitForTimeout(300);
  ok(geocodes===0,nom+' · l\'adresse se tape sans RIEN demander au géocodeur ('+geocodes+' requête)');
  await clic(pg,'#rdr-new [data-ns="find"]');
  await pg.waitForFunction(()=>!!document.querySelector('#rdr-new .ns-hit'),null,{timeout:6000}).catch(()=>{});
  await clic(pg,'#rdr-new .ns-hit');
  await pg.waitForFunction(()=>[...document.querySelectorAll('#rdr-new .sfl')].some(e=>e.textContent==='who sees it'),null,{timeout:6000}).catch(()=>{});
  const ad=await pg.evaluate(()=>({d:window.__totehm_club().prise,
    ville:[...document.querySelectorAll('#rdr-new .ns-tag')].map(e=>e.textContent).join('|')}));
  ok(geocodes===1&&ad.d.pt&&ad.d.ptSrc==='adresse'&&ad.ville==='Porto',
     nom+' · UNE requête par geste ; l\'adresse choisie devient le point, sa ville vient de cities.json (« '+ad.ville+' »)');
  const cl=await pg.evaluate(()=>({choix:document.querySelectorAll('#rdr-new [data-ns="aud"]').length,
    qui:[...document.querySelectorAll('#rdr-new .sfl')].filter(e=>e.textContent==='who sees it').map(e=>e.nextElementSibling.innerText.replace(/\s+/g,' ')).join(''),
    l:[...document.querySelectorAll('#rdr-new .sfl')].map(e=>e.textContent)}));
  ok(cl.choix===0&&/^figher club every TOTEHM$/i.test(cl.qui)&&cl.l.slice(-1)[0]==='together'&&!cl.l.includes('location'),
     nom+' · publié d\'ici, FIGHER CLUB d\'office : montré (« '+cl.qui+' »), jamais demandé ; puis together, et jamais « location »');
  await clic(pg,'#rdr-new [data-ns="mode"][data-v="silent"]'); await pg.waitForTimeout(300);
  await clic(pg,'#rdr-new [data-ns="dur"][data-v="90"]'); await pg.waitForTimeout(300);
  const l2=await pg.evaluate(()=>({l:[...document.querySelectorAll('#rdr-new .sfl')].map(e=>e.textContent).slice(-2),
    go:(document.querySelector('#rdr-new .ns-go')||{}).textContent}));
  ok(l2.l.join('|')==='a word · optional|a photo or a video · optional'&&l2.go==='I WILL BE HERE',
     nom+' · un mot, un média facultatif, I WILL BE HERE');
  await pg.fill('#rdr-new input[data-nsi="place"]','the old court');
  await pg.screenshot({path:OUT+'/club_prise_'+(tel?'tel':'ordi')+'.png'});
  await clic(pg,'#rdr-new .ns-go');
  await pg.waitForFunction(()=>document.getElementById('rdr-new').hidden,null,{timeout:8000}).catch(()=>{});
  const sc=log.rpc.filter(r=>r.name==='spot_schedule_audience').pop();
  ok(sc&&sc.body.p_habit==='Call mum'&&sc.body.p_location==='on'&&sc.body.p_mode==='silent'&&sc.body.p_audience==='figher'
     &&sc.body.p_duration_min===90&&sc.body.p_place==='the old court'&&sc.body.p_city==='Porto'
     &&new Date(sc.body.p_starts_at).getTime()>Date.now(),
     nom+' · I WILL BE HERE → spot_schedule_audience : '+JSON.stringify(sc&&Object.assign({},sc.body,{p_lat:'…',p_lng:'…',p_starts_at:'…'})));
  ok(log.rpc.some(r=>r.name==='spot_box_set'),nom+' · un spot naît caché : spot_box_set montre sa box entière');

  // ══ 5 · UN SPOT OUVERT ══ (publié, la vue montre FUTURE : on revient à NOW par le filtre)
  await pg.waitForTimeout(700);
  ok((await etat(pg)).club.periode==='future',nom+' · publié : la vue montre le temps où le spot vit (future)');
  await clic(pg,'#rdr-flt button:last-child'); await pg.waitForTimeout(400);
  await clic(pg,'#rdr-sf [data-sf="per"][data-v="now"]'); await pg.waitForTimeout(500);
  await clic(pg,'#rdr-sf [data-sf="close"]'); await pg.waitForTimeout(600);
  await pg.$eval('#rdr-g-f .tl[data-cle]',e=>e.click());
  await pg.waitForFunction(()=>window.__totehm_club().detail,null,{timeout:6000}).catch(()=>{});
  await pg.waitForTimeout(400);
  const d=await pg.evaluate(()=>({n:(document.querySelector('#detail .v-name')||{}).textContent,
    tags:[...document.querySelectorAll('#detail .sd-tag')].map(e=>e.textContent.trim()),
    acts:[...document.querySelectorAll('#detail .acts .btn')].map(e=>e.textContent)}));
  ok(d.n==='Run the hill'&&d.tags.some(t=>/I AM HERE/.test(t))&&d.acts.includes('GO')&&d.acts.includes('CLOSE'),
     nom+' · le spot ouvert : sa box, son état, ses gestes → '+d.acts.join(' · '));
  await pg.screenshot({path:OUT+'/club_spot_'+(tel?'tel':'ordi')+'.png'});
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(500);
  ok(!(await etat(pg)).detail,nom+' · « précédent » referme le spot');
  ok(!erreurs(log).length,nom+' · aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();
 }
}finally{await browser.close();}
