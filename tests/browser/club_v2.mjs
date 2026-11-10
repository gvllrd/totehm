// 10/11/2026 — FIGHER.CLUB v2 (Wah : « 1) enlève "Higher Spots", reprends le TOTEHM de la vue de droite ; 2) une vue
// Shorts ; les trois boutons en haut à droite, la grille et le radar défilent aisément ; 3) le filtre au format de la vue
// de droite ; 4) demander directement la localisation, montrer ce qui est pertinent autour ; publier d'ici = FIGHER CLUB »).
//   1 · l'en-tête : coin membre · logo TOTEHM · RADAR GRID SHORTS sur UNE ligne, sans chevauchement (390 px, connecté ou non)
//   2 · la position est demandée À L'ARRIVÉE : la première lecture est PRÈS DE MOI ; rien autour → tout le Club, dit
//   3 · le radar défile : dessous, les spots du plus proche au plus loin ; « Simple terms of use » s'efface en glissant
//   4 · SHORTS : les spots qui ont un média, un par écran ; un seul joue, le suivant se prépare ; la box ouvre le spot
//   5 · la vidéo part chez Bunny (TUS) quand le compte est prêt, sinon dans `moments`
// Tout est simulé (comptes, RPC, Bunny, stockage) : aucune écriture en production. LANCER : node club_v2.mjs /tmp
import fs from 'node:fs'; import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp'; fs.mkdirSync(OUT,{recursive:true});
const VIDEO=new URL('./fixtures/spot_2s.webm',import.meta.url).pathname;
const origin='https://www.figher.club', now=Date.now();
const HABITS=[{name:'Run the hill',freq:'every_morning',ints:['fight'],step:{t:'Run the hill',f:'every_morning',is:['fight']},objectives:[],repulsions:[]}];
const sp=(id,extra={})=>({id,habit:'Run the hill',intentions:['fight'],freq:'every_morning',visibility:'shared',mode:'social',creator:'nia',mine:false,
  city:'Lisbon',audience:'figher',starts_at:new Date(now-1000).toISOString(),ends_at:new Date(now+36e5).toISOString(),duration_min:60,
  exact:{lat:38.80,lng:-9.20,place:'the hill'},habit_box:{name:'Run the hill',ints:['fight'],freq:'every_morning'},...extra});
/* trois spots : « loin » (8 km), « près » (la ville, au centre de Lisbonne), « photo » ; deux portent un média */
const CLUB=[sp('loin',{clip:{id:'v1'}}),sp('pres',{habit:'Yoga at dawn',habit_box:{name:'Yoga at dawn',ints:['flow']},exact:null}),
  sp('photo',{habit:'Read in the park',habit_box:{name:'Read in the park',ints:['focus']},exact:{lat:38.74,lng:-9.15},photo:'u/p.jpg'})];
const rpcs=(appels,vide)=>({spot_rules:{clip_seconds:33,clip_max_bytes:48000000,duration_min:5,duration_max:720,horizon_days:90},
  space_habits:{ok:true,habits:HABITS}, sso_epoch:1,
  club_spots:b=>{ appels.push(b); const f=b.p_filters||{};
    const l=b.p_period!=='now'||(vide&&f.scope==='near')?[]:CLUB;
    return {ok:true,period:b.p_period,items:l,total:l.length,has_more:false,next_offset:l.length,as_of:new Date(now).toISOString()}; },
  spot_create_audience:b=>({ok:true,id:'sp9',audience:b.p_audience}), spot_box_set:{ok:true}});
const boite=(pg,sel)=>pg.$eval(sel,e=>{const r=e.getBoundingClientRect();return {x:r.left,y:r.top,r:r.right,b:r.bottom};});
const croise=(a,b)=>a.x<b.r&&b.x<a.r&&a.y<b.b&&b.y<a.b;
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const browser=await launch();
try{
  // ══ 1 · L'EN-TÊTE, déconnecté puis connecté, au téléphone ══
  for(const session of [false,true]){
    const lus=[];
    const {pg,log}=await page(browser,{dir:'club',origin,session,tables:{profiles:[{pseudo:'wahigher'}]},rpc:rpcs(lus,false)});
    await pg.goto(origin+'/'); await pg.waitForFunction(()=>window.__totehm_club?.().club.lu,null,{timeout:12000}); await pg.waitForTimeout(800);
    const m=await boite(pg,'#member'), l=await boite(pg,'#club-logo'), s=await boite(pg,'#rdr-mode');
    const qui=session?'connecté':'déconnecté';
    if(!session){ const v=await pg.evaluate(()=>({t:document.getElementById('radar-empty').textContent, loc:window.__totehm_club().located}));
      ok(!lus.length&&!v.loc&&/connect with my TOTEHM/i.test(v.t),
         'téléphone déconnecté · le serveur ne montrerait rien : zéro lecture du Club, zéro demande de position, « '+v.t+' »'); }
    ok(!croise(m,l)&&!croise(l,s)&&!croise(m,s)&&l.y<20&&s.y<20,
       'téléphone '+qui+' · coin membre, logo TOTEHM et RADAR · GRID · SHORTS sur une ligne, sans chevauchement (logo '+Math.round(l.x)+'→'+Math.round(l.r)+', bascule dès '+Math.round(s.x)+')');
    ok(!erreurs(log).length,'téléphone '+qui+' · aucune erreur');
    await pg.context().close();
  }
  for(const [nom,vp,tel] of [['téléphone',{width:390,height:844},true],['ordinateur',{width:1280,height:800},false]]){
    // ══ 2 · LA POSITION, DEMANDÉE À L'ARRIVÉE ══
    const appels=[];
    const {pg,log}=await page(browser,{dir:'club',origin,viewport:vp,hasTouch:tel,tables:{profiles:[{pseudo:'wahigher'}]},rpc:rpcs(appels,false),
      functions:{'create-bunny-upload':b=>b.action==='status'?{available:true}:{id:'11111111-2222-4333-8444-555555555555',endpoint:'https://video.bunnycdn.com/tusupload',headers:{AuthorizationSignature:'s',AuthorizationExpire:'1',VideoId:'v',LibraryId:'1'}},
        'bunny-video':b=>b.action==='complete'?{status:'processing'}:{clips:[{id:'v1',status:'processing'}]}},
      network:(url,req,log)=>{
        if(url.host!=='video.bunnycdn.com') return null;
        const cors={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'POST,PATCH,HEAD,OPTIONS','access-control-expose-headers':'Location,Upload-Offset'};
        log.tus=log.tus||[];
        if(req.method()==='OPTIONS') return {status:204,headers:cors};
        if(req.method()==='POST'){ log.tus.push('POST'); return {status:201,headers:{...cors,location:'https://video.bunnycdn.com/tusupload/abc'}}; }
        if(req.method()==='PATCH'){ const n=Number(req.headers()['upload-offset']||0)+(req.postDataBuffer()||Buffer.alloc(0)).length; log.tus.push('PATCH:'+n);
          return {status:204,headers:{...cors,'upload-offset':String(n)}}; }
        return {status:204,headers:cors}; }});
    await pg.route('**/cities.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({cities:[['Lisbon',38.7223,-9.1393,1,'PT']]})}));
    await pg.goto(origin+'/'); await pg.waitForFunction(()=>window.__totehm_club?.().club.lu,null,{timeout:12000}); await pg.waitForTimeout(1200);
    const d0=await pg.evaluate(()=>window.__totehm_club());
    ok(appels[0]&&appels[0].p_filters.scope==='near'&&appels[0].p_lat!=null&&d0.located&&d0.ou==='near',
       nom+' · la position est demandée À L\'ARRIVÉE : la première lecture est près de moi ('+JSON.stringify(appels[0]&&appels[0].p_filters)+')');

    // ══ 3 · LE RADAR DÉFILE : la liste, du plus proche au plus loin ══
    const li=await pg.evaluate(()=>({ids:[...document.querySelectorAll('#rdr-list .rl')].map(e=>e.dataset.cle), titre:(document.querySelector('#rdr-list .sfl')||{}).textContent,
      down:(document.getElementById('rdr-down')||{}).textContent, terms:getComputedStyle(document.getElementById('terms')).opacity}));
    ok(li.ids.join('|')==='pres|photo|loin'&&/around me/.test(li.titre)&&/3 spots/.test(li.down),
       nom+' · sous le radar, les spots du plus proche au plus loin : '+li.ids.join(' · ')+' (« '+li.down+' »)');
    await pg.$eval('#rdr-down',e=>e.click()); await pg.waitForTimeout(900);
    const sc=await pg.evaluate(()=>({y:document.getElementById('v-radar').scrollTop, top:document.querySelector('#rdr-list .rl').getBoundingClientRect().top,
      scrolled:window.__totehm_club().scrolled}));
    ok(sc.y>200&&sc.top<innerHeightOf(vp)&&sc.scrolled,nom+' · « 3 spots ↓ » fait défiler jusqu\'à la liste ('+Math.round(sc.y)+' px)');
    await pg.waitForTimeout(400);
    const tz=await pg.evaluate(()=>getComputedStyle(document.getElementById('terms')).visibility);
    ok(tz==='hidden',nom+' · le radar glisse : « Simple terms of use » s\'efface');
    await pg.$eval('#rdr-list .rl',e=>e.click()); await pg.waitForTimeout(600);
    ok((await pg.evaluate(()=>window.__totehm_club().detail)),nom+' · une ligne ouvre son spot');
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(500);

    // ══ 4 · SHORTS ══
    await pg.$eval('#rdr-mode [data-rmode="shorts"]',e=>e.click()); await pg.waitForTimeout(1500);
    const s1=await pg.evaluate(()=>({d:window.__totehm_club().shorts, ids:[...document.querySelectorAll('#rdr-sh-f .sh')].map(e=>e.dataset.cle),
      h:document.querySelector('#rdr-sh-f .sh').getBoundingClientRect().height, snap:getComputedStyle(document.getElementById('v-shorts')).scrollSnapType}));
    ok(s1.ids.join('|')==='loin|photo'&&Math.abs(s1.h-innerHeightOf(vp))<2&&/y/.test(s1.snap)&&s1.d.courant===0,
       nom+' · SHORTS : les spots qui ont un média, un par écran, aimantés ('+s1.ids.join(' · ')+', '+Math.round(s1.h)+' px)');
    const sig=log.functions.filter(f=>f.name==='bunny-video').length;
    ok(sig>=1,nom+' · la vidéo à l\'écran se signe chez Bunny au moment de jouer ('+sig+' signature)');
    await pg.$eval('#v-shorts',e=>e.scrollTo(0,e.clientHeight)); await pg.waitForTimeout(1200);
    const s2=await pg.evaluate(()=>window.__totehm_club().shorts);
    ok(s2.courant===1&&s2.joues>=2,nom+' · on glisse : l\'écran suivant prend la main (courant '+s2.courant+')');
    await pg.$eval('#rdr-sh-f .sh:nth-child(2) .sh-b',e=>e.click()); await pg.waitForTimeout(600);
    ok((await pg.evaluate(()=>window.__totehm_club().detail)),nom+' · la box d\'un short ouvre son spot');
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(500);
    const tz2=await pg.evaluate(()=>getComputedStyle(document.getElementById('terms')).visibility);
    ok(tz2==='hidden',nom+' · SHORTS défile : « Simple terms of use » absent');
    await pg.screenshot({path:OUT+'/club_shorts_'+(tel?'tel':'ordi')+'.png'});

    // ══ 5 · UNE VIDÉO PART CHEZ BUNNY ══
    await pg.$eval('#rdr-plus [data-nspot]',e=>e.click()); await pg.waitForTimeout(700);
    await pg.locator('#rdr-new [data-ns="h"]').first().click(); await pg.waitForTimeout(300);
    await pg.$eval('#rdr-new [data-ns="quand"][data-v="now"]',e=>e.click());
    await pg.waitForFunction(()=>[...document.querySelectorAll('#rdr-new .sfl')].some(e=>e.textContent==='together'),null,{timeout:8000}).catch(()=>{});
    await pg.$eval('#rdr-new [data-ns="mode"][data-v="social"]',e=>e.click()); await pg.waitForTimeout(300);
    await pg.setInputFiles('#ns-file',VIDEO); await pg.waitForTimeout(1500);
    await pg.$eval('#rdr-new [data-ns="dur"][data-v="30"]',e=>e.click()); await pg.waitForTimeout(300);
    await pg.$eval('#rdr-new .ns-go',e=>e.click());
    await pg.waitForFunction(()=>document.getElementById('rdr-new').hidden,null,{timeout:10000}).catch(()=>{});
    const cr=log.rpc.filter(r=>r.name==='spot_create_audience').pop();
    ok(cr&&cr.body.p_video==='bunny:11111111-2222-4333-8444-555555555555'&&cr.body.p_audience==='figher'&&(log.tus||[]).includes('POST')
       &&(log.tus||[]).some(x=>x.startsWith('PATCH:'))&&!log.upload.length,
       nom+' · la vidéo part chez Bunny par TUS ('+(log.tus||[]).join(' · ')+') ; le spot la porte (« '+(cr&&cr.body.p_video)+' »), FIGHER CLUB');
    ok(!erreurs(log).length,nom+' · aucune erreur '+erreurs(log).join(' | '));
    await pg.context().close();
  }
  // ══ 2 bis · RIEN PRÈS DE MOI : tout le Club, et ça se DIT ; Bunny pas prêt : le seau `moments` ══
  { const appels=[];
    const {pg,log}=await page(browser,{dir:'club',origin,tables:{profiles:[{pseudo:'wahigher'}]},rpc:rpcs(appels,true),
      functions:{'create-bunny-upload':{available:false},'bunny-video':{clips:[]}}});
    await pg.goto(origin+'/'); await pg.waitForFunction(()=>window.__totehm_club?.().club.lu,null,{timeout:12000}); await pg.waitForTimeout(1200);
    const d=await pg.evaluate(()=>({c:window.__totehm_club(), say:document.getElementById('rdr-say').textContent}));
    const suite=appels.map(a=>a.p_period+':'+(a.p_filters.scope||'world')).join(' → ');
    ok(suite==='now:near → future:near → now:world'&&d.c.club.items===3&&d.c.ou==='world'&&/nothing near me/.test(d.say),
       'rien près de moi : '+suite+' — tout le Club, et la barre le dit (« '+d.say+' »)');
    await pg.$eval('#rdr-plus [data-nspot]',e=>e.click()); await pg.waitForTimeout(700);
    await pg.locator('#rdr-new [data-ns="h"]').first().click(); await pg.waitForTimeout(300);
    await pg.$eval('#rdr-new [data-ns="quand"][data-v="now"]',e=>e.click());
    await pg.waitForFunction(()=>[...document.querySelectorAll('#rdr-new .sfl')].some(e=>e.textContent==='together'),null,{timeout:8000}).catch(()=>{});
    await pg.$eval('#rdr-new [data-ns="mode"][data-v="silent"]',e=>e.click()); await pg.waitForTimeout(300);
    await pg.setInputFiles('#ns-file',VIDEO); await pg.waitForTimeout(1500);
    await pg.$eval('#rdr-new [data-ns="dur"][data-v="30"]',e=>e.click()); await pg.waitForTimeout(300);
    await pg.$eval('#rdr-new .ns-go',e=>e.click());
    await pg.waitForFunction(()=>document.getElementById('rdr-new').hidden,null,{timeout:10000}).catch(()=>{});
    const cr=log.rpc.filter(r=>r.name==='spot_create_audience').pop();
    ok(cr&&/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webm$/.test(cr.body.p_video)&&log.upload.some(u=>u.path.startsWith('moments/')),
       'Bunny pas prêt : la vidéo part dans le seau `moments` (« '+(cr&&cr.body.p_video)+' »), rien ne se bloque');
    ok(!erreurs(log).length,'rien près de moi · aucune erreur '+erreurs(log).join(' | '));
    await pg.context().close(); }
}finally{await browser.close();}
function innerHeightOf(vp){ return vp.height; }
