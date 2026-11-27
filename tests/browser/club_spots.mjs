// Radar et Grid ouvrent un Short. Le Club partage la prise de spot de Totehm.
// Le rail Refine garde les Habits personnelles, puis les autres critères. La prise reste disponible depuis la grille.
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
/* 14/11 — `space_habits` rend le NIVEAU de chaque box (`audience`) : une Habit privée ne peut pas porter un
   spot du Club (Wah) ; elle s'affiche grisée, non sélectionnable, avec son bouton. « Secret » l'est. */
const HABITS=[{name:'Run the hill',freq:'every_morning',ints:['fight'],audience:'subscribers',step:{t:'Run the hill',f:'every_morning',is:['fight']},
               objectives:[{text:'Move with friends'}],repulsions:[{text:'Skipping it'}]},
              {name:'Call mum',freq:'weekly',ints:['love'],audience:'subscribers',step:{t:'Call mum',f:'weekly',is:['love']},objectives:[],repulsions:[]},
              {name:'Secret',freq:'weekly',ints:['focus'],audience:'private',step:{t:'Secret',f:'weekly',is:['focus']},objectives:[],repulsions:[]}];
const sp=(id,extra={})=>({id,habit:'Run the hill',intentions:['fight'],freq:'every_morning',visibility:'shared',mode:'social',
  creator:'nia',mine:false,city:'Lisbon',audience:'figher',starts_at:new Date(now-1000).toISOString(),
  ends_at:new Date(now+36e5).toISOString(),duration_min:60,exact:{lat:38.73,lng:-9.15,place:'the hill'},
  habit_box:{name:'Run the hill',ints:['fight'],freq:'every_morning',objectives:[{text:'Move with friends'}],repulsions:[]},...extra});
const etat=pg=>pg.evaluate(()=>window.__totehm_club());
const etape=pg=>pg.locator('#rdr-new [aria-current="step"]').getAttribute('data-v');
const clic=(pg,sel)=>pg.$eval(sel,e=>e.click());
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
try{
 for(const [nom,vp,tel] of [['téléphone',{width:390,height:844},true],['ordinateur',{width:1280,height:800},false]]){
  let appels=[], geocodes=0;
  const {pg,log}=await page(browser,{dir:'club',origin,viewport:vp,hasTouch:tel,
    tables:{profiles:[{pseudo:'wahigher'}]},
    rpc:{spot_rules:{clip_seconds:33,clip_max_bytes:48000000,duration_min:5,duration_max:720,horizon_days:90},
         space_habits:{ok:true,habits:HABITS},
         box_audience_set:b=>{ const h=HABITS.find(x=>x.name===b.p_id); if(h) h.audience=b.p_audience;
                               return {ok:true,kind:b.p_kind,audience:b.p_audience}; }, sso_epoch:1,
         club_spots:b=>{ appels.push(b);
           const f=b.p_filters||{};
           const l=b.p_period!=='now'?[]
             :f.habit?[sp('a')]
             :f.akin?[sp('a',{kin:{score:1,why:'same'}}),sp('b',{id:'b',habit:'Lift heavy',exact:null,
                 habit_box:{name:'Lift heavy',ints:['fight']},kin:{score:0.36,why:'intentions'}})]
             :[sp('a',{mine:true,comment:'first line\nsecond line'}),sp('b',{id:'b',exact:null})];
           return {ok:true,period:b.p_period,items:l,total:l.length,has_more:false,next_offset:l.length,as_of:new Date(now).toISOString()}; },
         spot_get:b=>({ok:true,spot:sp(b.p_id)}),
         spot_passes_for:{ok:true,items:[{pseudo:'nia',code:'AB23CD'}]},
         spot_remove:{ok:true},
         spot_create_audience:b=>MOMENT.test('moments/'+b.p_video)?{ok:true,id:'sp9',audience:b.p_audience}:{ok:false,why:'video'},
         spot_schedule_audience:{ok:true,id:'sp10',audience:'private'},
         spot_box_set:{ok:true}}});
  HABITS.forEach(h=>{ h.audience = h.name==='Secret' ? 'private' : 'subscribers'; });   /* le mock, à neuf */
  await pg.route('**/cities.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(VILLES)}));
  await pg.route('**nominatim.openstreetmap.org/**',r=>{geocodes++;r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(ADRESSES)});});
  await pg.goto(origin+'/');
  await pg.waitForFunction(()=>window.__totehm_club?.().signed_in,null,{timeout:12000});
  await pg.waitForTimeout(1200);

  // ══ 1 · LA PAGE ══
  const s0=await etat(pg);
  const radar=await pg.locator('#canvas').boundingBox();
  ok(s0.mode==='radar'&&s0.club.items===2&&s0.radar.points===2&&s0.located&&s0.club.pers.length===3
     &&radar.y===0&&radar.height===vp.height&&!await pg.locator('#v-shorts').count(),
     nom+' · Radar plein écran par défaut : position automatique et spots des trois temps');
  const nu=await pg.evaluate(()=>({joy:!!document.getElementById('joy'), about:!!document.getElementById('space-about'),
    quoi:/what is a spot/i.test(document.body.innerText), titre:!!document.getElementById('club-title'),
    /* 12/11 (Wah) : « tu peux enlever le totehm central en haut, il ne sert à rien » — le coin membre
       porte déjà LE TOTEHM qui tourne, et un tap y ramène à totehm.com. */
    logo:!!document.getElementById('club-logo'), coin:!!document.querySelector('#member.mc')}));
  ok(!nu.joy&&!nu.about&&!nu.quoi&&!nu.titre&&!nu.logo&&nu.coin,
     nom+' · plus de joystick, plus de « What is a spot? », plus de TOTEHM central en haut : le coin membre suffit');
  const barre=await pg.evaluate(()=>[...document.querySelectorAll('#rdr-flt button')].map(e=>e.textContent));
  ok(barre.join('|')==='Refine',nom+' · une seule touche Refine');
  await pg.screenshot({path:OUT+'/club_map_'+(tel?'tel':'ordi')+'.png'});

  const avant=(await etat(pg)).radar.range;
  await pg.click('#rdr-in');
  await pg.waitForFunction(r=>window.__totehm_club().radar.range<r,avant);
  await pg.click('#rdr-here');
  await pg.waitForFunction(()=>window.__totehm_club().radar.geo==='ready');
  ok(await pg.locator('#rdr-here svg').count()===1,nom+' · le Radar règle sa portée et donne accès à la touche de position');

  // ══ 2 · RADAR | GRID ══
  await clic(pg,'#rdr-select'); await pg.waitForTimeout(600);
  const g=await pg.evaluate(()=>({t:window.__totehm_club().grille.tuiles, mode:window.__totehm_club().mode,
    plus:document.querySelector('#rdr-g-f .tlg')?.firstElementChild.classList.contains('tl-add'),
    cols:getComputedStyle(document.querySelector('#rdr-g-f .tlg')).gridTemplateColumns.split(' ').length, box:[...document.querySelectorAll('.tl-bx .v-name')].map(e=>e.textContent)}));
  ok(g.mode==='grid'&&g.t===2&&g.plus&&g.box.length===2&&g.cols===(tel?2:3),
     nom+' · GRID : les mêmes spots en tuiles, la box du TOTEHM posée dessus, le « + » en tête → '+g.box.join(' · '));
  await pg.screenshot({path:OUT+'/club_grid_'+(tel?'tel':'ordi')+'.png'});

  // ══ 3 · LE FILTRE : une Habit choisie ouvre ses PARENTES ══
  await clic(pg,'#rdr-flt button:last-child'); await pg.waitForTimeout(500);
  const f0=await pg.evaluate(()=>({l:[...document.querySelectorAll('#rdr-sf .sf-nav button')].map(e=>e.textContent),
    h:[...document.querySelectorAll('#rdr-sf [data-sf="habit"] .v-name')].map(e=>e.textContent)}));
  /* le FILTRE, lui, garde toutes mes Habits : il cherche les spots des AUTRES par parenté — le niveau de MA
     box n'y change rien (seule la PRISE refuse une Habit privée). */
  ok(f0.h.join('|')==='Run the hill|Call mum|Secret'&&f0.l.join('|')==='My Grind|When|Where|Together|Intentions|Media',
     nom+' · le filtre s\'ouvre sur MES Habits, au format du TOTEHM, puis : '+f0.l.slice(1).join(' · '));
  appels=[];
  await pg.$eval('#rdr-sf [data-sf="habit"]',e=>e.click());
  await pg.waitForFunction(()=>window.__totehm_club().akin,null,{timeout:6000}).catch(()=>{});
  await pg.waitForTimeout(400);
  const ak=appels.filter(a=>a.p_filters&&a.p_filters.akin).pop();
  const f1=await pg.evaluate(()=>({l:[...document.querySelectorAll('#rdr-sf .sfl')].map(e=>e.textContent),
    proche:[...document.querySelectorAll('#rdr-sf [data-sf="near"]')].map(e=>e.childNodes[0].textContent)}));
  ok(ak&&ak.p_filters.akin==='Run the hill'&&!ak.p_filters.habit&&f1.l.includes('Find')
     &&f1.proche.join('|')==='Similar habits|Exact habit',
     nom+' · une Habit choisie demande au serveur ses PARENTES (`akin`), pas une égalité → '+JSON.stringify(ak&&ak.p_filters));
  /* 24/11 (Wah) : la box choisie reste SEULE ; un tap sur elle rouvre la liste, le choix reste */
  const boxes=()=>pg.evaluate(()=>[...document.querySelectorAll('#rdr-sf [data-sf="habit"] .v-name')].map(e=>e.textContent).join('|'));
  const seule=await boxes();
  await pg.$eval('#rdr-sf [data-sf="habit"]',e=>e.click()); await pg.waitForTimeout(300);
  const rouverte=await boxes(), garde=await pg.evaluate(()=>window.__totehm_club().akin);
  ok(seule==='Run the hill'&&rouverte==='Run the hill|Call mum|Secret'&&garde,
     nom+' · la box choisie ferme les autres ; un tap la rouvre, le choix gardé → '+seule+' / '+rouverte);
  /* 24/11 (Wah) : plusieurs temps à la fois, une lecture par temps */
  appels=[];
  await clic(pg,'#rdr-sf [data-sf="etape"][data-v="when"]');
  await clic(pg,'#rdr-sf [data-sf="per"][data-v="past"]'); await pg.waitForTimeout(600);
  const tps=[...new Set(appels.map(a=>a.p_period))].sort().join('+');
  const on=await pg.evaluate(()=>[...document.querySelectorAll('#rdr-sf [data-sf="per"].is-on')].map(e=>e.dataset.v).join('+'));
  ok(tps==='future+now'&&on==='now+future'&&!await pg.locator('#rdr-sf .sfb').count(),
     nom+' · WHEN se choisit à plusieurs (comme les intentions) → lus : '+tps+' · allumés : '+on);
  await clic(pg,'#rdr-sf [data-sf="per"][data-v="past"]'); await pg.waitForTimeout(500);
  await clic(pg,'#rdr-sf [data-sf="close"]'); await pg.waitForTimeout(500);
  const kin=await pg.evaluate(()=>({k:[...document.querySelectorAll('.tl-kin')].map(e=>e.textContent),
    n:(document.querySelector('#rdr-flt button:last-child')||{}).textContent}));
  ok(kin.k.join('|')==='same habit|same intentions'&&kin.n==='Refine · 1',
     nom+' · chaque spot DIT pourquoi il répond : '+kin.k.join(' · ')+' ; la barre compte le filtre ('+kin.n+')');
  appels=[];
  await clic(pg,'#rdr-flt button:last-child'); await pg.waitForTimeout(400);
  await clic(pg,'#rdr-sf [data-sf="etape"][data-v="habit"]');
  await clic(pg,'#rdr-sf [data-sf="near"][data-v="exact"]'); await pg.waitForTimeout(600);
  const ex=appels.filter(a=>a.p_filters&&a.p_filters.habit).pop();
  ok(ex&&ex.p_filters.habit==='Run the hill'&&!ex.p_filters.akin,
     nom+' · [exactly this one] referme sur la Habit SEULE (`habit`) → '+JSON.stringify(ex&&ex.p_filters));
  appels=[];
  await clic(pg,'#rdr-sf [data-sf="etape"][data-v="together"]');
  await clic(pg,'#rdr-sf [data-sf="mode"][data-v="social"]'); await pg.waitForTimeout(500);
  const md=appels.pop();
  ok(md&&md.p_filters.mode==='social',nom+' · « together » part au serveur : le Club sert à se rencontrer → mode='+(md&&md.p_filters.mode));
  await clic(pg,'#rdr-sf [data-sf="all"]'); await pg.waitForTimeout(500);
  ok((await pg.evaluate(()=>window.__totehm_club().filtres))===0,nom+' · ALL rend la vue entière');
  await pg.screenshot({path:OUT+'/club_filtre_'+(tel?'tel':'ordi')+'.png'});
  await clic(pg,'#rdr-sf [data-sf="close"]'); await pg.waitForTimeout(400);

  // ══ 4 · LE MÊME PARCOURS DE PRISE QUE TOTEHM ══
  const ns=pg.locator('#rdr-new'), suite=ns.locator('[data-ns="continue"]');
  const stage=k=>ns.locator('[data-ns="stage"][data-v="'+k+'"]');
  await pg.locator('#rdr-g-f .tl-add').click();
  ok(await etape(pg)==='media'&&await stage('habit').isDisabled()&&!await ns.locator('.ns-what').count()
     &&(await ns.locator('.cap-b').allTextContents()).join('|')==='PHOTO|VIDEO|IMPORT',
    nom+' · les choix média arrivent directement, les autres étapes attendent');
  await ns.locator('[data-ns="skip"]').click();
  const pr=ns.locator('.sfb.is-off');
  await pr.waitFor();
  ok(await pr.locator('.v-name').textContent()==='Secret'&&await pr.getAttribute('role')===null,
    nom+' · la Habit privée garde son rendu et un geste explicite');
  await pr.locator('[data-ns="demanderbox"]').click();
  ok(await pr.locator('.ns-note-g').isVisible()&&!log.rpc.some(r=>r.name==='box_audience_set'),
    nom+' · le premier geste explique ce que la confirmation ouvrira');
  await pr.locator('[data-ns="ouvrirbox"]').click();
  await ns.locator('[data-ns="h"][data-v="Secret"]').waitFor();
  const ouv=log.rpc.filter(r=>r.name==='box_audience_set').pop();
  ok(ouv?.body.p_id==='Secret'&&ouv?.body.p_audience==='subscribers',nom+' · seule la confirmation ouvre la box');
  await ns.locator('[data-ns="h"][data-v="Call mum"]').click();
  await ns.locator('[data-ns="quand"][data-v="later"]').click();
  ok(await etape(pg)==='when'&&await ns.locator('[data-nsi="date"]').isVisible()
    &&!await ns.locator('[data-ns="ou"]').count(),nom+' · Later demande la date avant le lieu');
  await suite.click();
  await ns.locator('[data-ns="ou"][data-v="ailleurs"]').click();
  await ns.locator('[data-ns="carte"]').click();
  await pg.locator('#rdr-choix-carte').waitFor();
  const globe=await pg.locator('#rdr-map').boundingBox();
  if(tel) await pg.touchscreen.tap(globe.width/2,globe.height/2);
  else await pg.mouse.click(globe.width/2,globe.height/2);
  await ns.waitFor();
  ok((await etat(pg)).prise.ptSrc==='carte'&&await etape(pg)==='where',
    nom+' · le globe revient avec le point choisi dans Where');
  await ns.locator('[data-nsi="adr"]').fill('rua de santa catarina porto');
  ok(geocodes===0,nom+' · aucun géocodage à la frappe');
  await ns.locator('[data-ns="find"]').click();
  await ns.locator('.ns-hit').first().click();
  await pg.waitForFunction(()=>document.querySelector('#rdr-new .ns-tag')?.textContent==='Porto');
  ok(geocodes===1&&(await etat(pg)).prise.ptSrc==='adresse',nom+' · le résultat de l’adresse remplace le point de la carte');
  await ns.locator('[data-nsi="place"]').fill('the old court');
  await suite.click();
  ok(await etape(pg)==='access'&&await ns.locator('.ns-c').textContent()==='figher clubevery member'
    &&!await ns.locator('[data-ns="aud"]').count(),nom+' · l’accès Club est affiché avant Together');
  await suite.click();
  await ns.locator('[data-ns="mode"][data-v="silent"]').click();
  await ns.locator('[data-ns="dur"][data-v="90"]').click();
  ok(await etape(pg)==='publish'&&await ns.locator('[data-ns="go"]').textContent()==='I will be here',
    nom+' · le récapitulatif précède la publication');
  await pg.screenshot({path:OUT+'/club_prise_'+(tel?'tel':'ordi')+'.png'});
  await ns.locator('[data-ns="go"]').click();
  await ns.waitFor({state:'hidden'});
  const sc=log.rpc.filter(r=>r.name==='spot_schedule_audience').pop();
  ok(sc&&sc.body.p_habit==='Call mum'&&sc.body.p_location==='on'&&sc.body.p_mode==='silent'&&sc.body.p_audience==='figher'
    &&sc.body.p_duration_min===90&&sc.body.p_place==='the old court'&&sc.body.p_city==='Porto',
    nom+' · la publication utilise la Habit, la durée, le point et l’audience Club');
  ok(log.rpc.some(r=>r.name==='spot_box_set'),nom+' · le spot publie sa box complète');

  // Le Club garde les trois temps après la publication.
  await pg.waitForTimeout(700);
  ok((await etat(pg)).club.pers.length===3,nom+' · la publication garde les trois temps');
  await pg.$eval('#rdr-g-f .tl[data-cle="a"]',e=>e.click());
  await pg.waitForFunction(()=>window.__totehm_club().detail,null,{timeout:6000}).catch(()=>{});
  await pg.waitForTimeout(400);
  const actif=pg.locator('#detail .dt-s:not([inert])');
  const d=await actif.evaluate(e=>({id:e.dataset.cle,h:e.clientHeight,keys:[...e.querySelectorAll('.spot-key')].map(x=>x.textContent),
    comment:e.querySelector('.sd-say').textContent}));
  ok(d.id==='a'&&d.h===vp.height&&d.keys.join('|')==='go|share|passes|delete'&&d.comment==='first line\nsecond line',
    nom+' · la grille ouvre directement son spot plein écran, commentaire et touches visibles');
  const loupe=actif.locator('[data-spot-zoom]');
  await loupe.click();
  ok(await loupe.getAttribute('aria-pressed')==='true',nom+' · la loupe agrandit la box spatio-temporelle');
  await actif.locator('[data-passes]').click();
  await pg.locator('#spass .sp-f').waitFor();
  await pg.keyboard.press('Escape');
  ok(await pg.locator('#detail').isVisible()&&!await pg.locator('#spass').isVisible(),nom+' · Échap referme les passes seuls');
  const del=actif.locator('[data-del]');
  await del.click();
  ok(await del.textContent()==='delete?'&&await del.locator('svg').count()===1&&!log.rpc.some(r=>r.name==='spot_remove'),
    nom+' · Delete garde son icône et demande un deuxième appui');
  await pg.screenshot({path:OUT+'/club_spot_'+(tel?'tel':'ordi')+'.png'});
  /* 12/11 (Wah) — ON ABAISSE LA FEUILLE : le trait en haut tient le geste à lui seul ; descendue d'un
     tiers de sa hauteur, elle s'en va, et elle ne laisse aucun `--dy` posé. */
  const g0=await pg.evaluate(()=>{const g=document.querySelector('#detail .dt-grab'),c=getComputedStyle(g),r=g.getBoundingClientRect();
    return {prise:c.touchAction, colle:c.position, x:Math.round(r.x+r.width/2), y:Math.round(r.y+r.height/2)};});
  ok(g0.prise==='none'&&g0.colle==='absolute',nom+' · la feuille porte SON trait, collé en haut → '+JSON.stringify(g0));
  await pg.mouse.move(g0.x,g0.y); await pg.mouse.down();
  for(let k=1;k<=8;k++){ await pg.mouse.move(g0.x,g0.y+k*40); await pg.waitForTimeout(16); }
  const suit=await pg.evaluate(()=>document.getElementById('detail').style.getPropertyValue('--dy'));
  await pg.mouse.up(); await pg.waitForTimeout(600);
  const ap=await pg.evaluate(()=>({detail:!!window.__totehm_club().detail, dy:document.getElementById('detail').style.getPropertyValue('--dy')}));
  ok(parseFloat(suit)>100&&!ap.detail&&!ap.dy,
     nom+' · on la descend au doigt : elle SUIT ('+suit+'), puis elle s\'en va sans rien laisser posé');
  await pg.$eval('#rdr-g-f .tl[data-cle="a"]',e=>e.click());
  await pg.waitForFunction(()=>window.__totehm_club().detail,null,{timeout:6000}).catch(()=>{});
  await pg.waitForTimeout(400);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(500);
  ok(!(await etat(pg)).detail,nom+' · « précédent » referme le spot');
  ok(!erreurs(log).length,nom+' · aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();
 }
}finally{await browser.close();}
