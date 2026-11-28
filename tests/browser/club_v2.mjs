// Présentation du Club sur téléphone et ordinateur, lecture vidéo dans une fiche et envoi Bunny ou moments.
// Tout est simulé (comptes, RPC, Bunny, stockage) : aucune écriture en production. LANCER : node club_v2.mjs /tmp
import fs from 'node:fs'; import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp'; fs.mkdirSync(OUT,{recursive:true});
const VIDEO=new URL('./fixtures/spot_2s.webm',import.meta.url).pathname;
const origin='https://www.figher.club', now=Date.now();
const HABITS=[{name:'Run the hill',freq:'every_morning',ints:['fight'],audience:'subscribers',step:{t:'Run the hill',f:'every_morning',is:['fight']},objectives:[],repulsions:[]}];
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
    const m=await boite(pg,'#member'), s=await boite(pg,'#rdr-mode');
    const qui=session?'connecté':'déconnecté';
    if(!session) ok(!lus.length&&await pg.evaluate(()=>window.__totehm_club().located),
      'téléphone déconnecté · localisation automatique avec la vitrine du Radar');
    /* 12/11 — le TOTEHM central du haut est parti (Wah) : il reste le coin membre et la bascule. */
    const ctr=await pg.evaluate(()=>({x:innerWidth/2,y:innerHeight}));
    ok(!croise(m,s)&&m.y<20&&s.y>ctr.y-105&&Math.abs((s.x+s.r)/2-ctr.x)<1
      &&!(await pg.evaluate(()=>!!document.getElementById('club-logo'))),
       'téléphone '+qui+' · le coin membre reste en haut, SELECT se centre en bas');
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
    ok(d0.located&&d0.ou==='world'&&d0.radar.points===3&&new Set(appels.map(a=>a.p_period)).size===3,
       nom+' · le Radar se centre à l’arrivée avec les spots des trois temps');
    // La liste sous le Radar privilégie les spots proches.
    const li=await pg.evaluate(()=>({ids:[...document.querySelectorAll('#rdr-list .rl')].map(e=>e.dataset.cle), titre:(document.querySelector('#rdr-list .sfl')||{}).textContent,
      down:(document.getElementById('rdr-down')||{}).textContent, terms:getComputedStyle(document.getElementById('terms')).opacity}));
    ok(li.ids.join('|')==='pres|photo|loin'&&/the club/.test(li.titre)&&/3 spots/.test(li.down),
       nom+' · sous le Radar, les spots du plus proche au plus loin : '+li.ids.join(' · ')+' (« '+li.down+' »)');
    await pg.$eval('#rdr-down',e=>e.click()); await pg.waitForTimeout(900);
    const sc=await pg.evaluate(()=>({y:document.getElementById('v-radar').scrollTop, top:document.querySelector('#rdr-list .rl').getBoundingClientRect().top,
      scrolled:window.__totehm_club().scrolled}));
    ok(sc.y>200&&sc.top<innerHeightOf(vp)&&sc.scrolled,nom+' · « 3 spots ↓ » fait défiler jusqu\'à la liste ('+Math.round(sc.y)+' px)');
    await pg.waitForTimeout(400);
    const tz=await pg.evaluate(()=>getComputedStyle(document.getElementById('terms')).visibility);
    ok(tz==='hidden',nom+' · la carte défile : « Simple terms of use » s\'efface');
    await pg.$eval('#rdr-list .rl',e=>e.click()); await pg.waitForTimeout(600);
    ok((await pg.evaluate(()=>window.__totehm_club().detail)),nom+' · une ligne ouvre son spot');
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(500);

    await pg.click('#rdr-select');
    const premier=pg.locator('#rdr-g-f .tl[data-cle="loin"]');
    await premier.click();
    const fiche=pg.locator('#detail');
    await fiche.locator('video[data-bunny]').waitFor();
    ok(log.functions.some(f=>f.name==='bunny-video')&&!await pg.locator('#v-shorts').count(),
      nom+' · la vidéo est signée depuis la fiche de la grille');
    if(tel){
      await pg.waitForFunction(()=>Math.abs(document.getElementById('detail').getBoundingClientRect().top)<1);
      const doigt=await pg.context().newCDPSession(pg), x=vp.width/2;
      const glisse=(type,y)=>doigt.send('Input.dispatchTouchEvent',{type,touchPoints:y?[{x,y}]:[]});
      await glisse('touchStart',150);
      for(const y of [190,240,300,370,455,540,620,690]) await glisse('touchMove',y);
      await glisse('touchEnd');
    }else await pg.keyboard.press('ArrowUp');
    await fiche.locator('.dt-s[data-cle="photo"]:not([inert])').waitFor();
    ok(await fiche.locator('.dt-s:not([inert]) .v-name').textContent()==='Read in the park'
      &&await fiche.locator('video[data-bunny]').count()===0,
      nom+' · le flux vertical passe au spot voisin et libère la vidéo précédente');
    await fiche.getByRole('button',{name:'Close',exact:true}).click();

    // Une vidéo part chez Bunny.
    await pg.locator('#rdr-g-f .tl-add').click();
    await publierVideo(pg,'social');
    await pg.waitForFunction(()=>document.getElementById('rdr-new').hidden,null,{timeout:10000}).catch(()=>{});
    const cr=log.rpc.filter(r=>r.name==='spot_create_audience').pop();
    ok(cr&&cr.body.p_video==='bunny:11111111-2222-4333-8444-555555555555'&&cr.body.p_audience==='figher'&&(log.tus||[]).includes('POST')
       &&(log.tus||[]).some(x=>x.startsWith('PATCH:'))&&!log.upload.length,
       nom+' · la vidéo part chez Bunny par TUS ('+(log.tus||[]).join(' · ')+') ; le spot la porte (« '+(cr&&cr.body.p_video)+' »), FIGHER CLUB');
    ok(!erreurs(log).length,nom+' · aucune erreur '+erreurs(log).join(' | '));
    await pg.context().close();
  }
  // Le GPS suit le déplacement au Radar, puis se met en veille en quittant la vue.
  {
    const appels=[], {pg,ctx,log}=await page(browser,{dir:'club',origin,hasTouch:true,rpc:rpcs(appels,false)});
    await ctx.addInitScript(()=>{
      const gps=navigator.geolocation, suivre=gps.watchPosition.bind(gps), arreter=gps.clearWatch.bind(gps);
      window.suivis=0;
      gps.watchPosition=(...args)=>{ window.suivis++; return suivre(...args); };
      gps.clearWatch=id=>{ window.suivis--; arreter(id); };
    });
    await pg.route('**/cities.json',r=>r.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({cities:[['Lisbon',38.7223,-9.1393,1,'PT']]})}));
    await pg.goto(origin+'/');
    const premier=id=>pg.waitForFunction(x=>document.querySelector('#rdr-list .rl')?.dataset.cle===x,id,{timeout:6000});
    await premier('pres');
    ok(await pg.evaluate(()=>window.suivis===1),'le Radar n’a qu’un suivi GPS actif');
    await ctx.setGeolocation({latitude:38.8,longitude:-9.2});
    await premier('loin');
    ok(appels.length===3&&appels.every(a=>a.p_lat===null&&a.p_lng===null),
      'les spots se réordonnent après un déplacement dans le Radar, les requêtes mondiales restent sans coordonnées');
    await pg.click('#rdr-select');
    await pg.waitForFunction(()=>window.suivis===0);
    await ctx.setGeolocation({latitude:38.7223,longitude:-9.1393});
    await pg.click('#rdr-select');
    await premier('pres');
    ok(await pg.evaluate(()=>window.suivis===1),'le suivi GPS reprend en revenant au Radar');
    await pg.click('#rdr-flt button');
    await pg.waitForFunction(()=>window.suivis===0);
    await pg.click('#rdr-sf [data-sf="etape"][data-v="where"]');
    await pg.click('#rdr-sf [data-sf="ou"][data-v="near"]');
    await pg.waitForFunction(()=>window.__totehm_club().ou==='near'&&!window.__totehm_club().club.charge);
    await pg.click('#rdr-sf [data-sf="close"]');
    await pg.waitForFunction(()=>window.suivis===1);
    await pg.clock.setFixedTime(new Date(Date.now()+20000));
    const nouvelleZone=pg.waitForResponse(r=>r.url().endsWith('/club_spots')&&r.request().postDataJSON().p_lat===38.8);
    await ctx.setGeolocation({latitude:38.8,longitude:-9.2});
    await nouvelleZone;
    await premier('loin');
    await pg.waitForFunction(()=>!window.__totehm_club().club.charge);
    ok(appels.slice(-3).every(a=>a.p_filters.scope==='near'&&a.p_lat===38.8&&a.p_lng===-9.2),
      'le périmètre Near me suit le déplacement avec une lecture groupée des temps');

    const doigt=await ctx.newCDPSession(pg);
    const geste=(type,y)=>doigt.send('Input.dispatchTouchEvent',{type,touchPoints:y?[{x:10,y}]:[]});
    await pg.waitForFunction(()=>document.elementFromPoint(10,716)?.closest('#v-radar'));
    await geste('touchStart',716);
    for(const y of [667,617,552,472,405,344,282]){
      await geste('touchMove',y);
      await pg.waitForTimeout(20);
    }
    await geste('touchEnd');
    await pg.waitForFunction(()=>document.getElementById('v-radar').scrollTop>100,null,{timeout:3000});
    ok(true,'glisser hors du cadran défile vers la liste au toucher');

    for(const viewport of [{width:320,height:568},{width:667,height:375}]){
      await pg.setViewportSize(viewport);
      await pg.evaluate(()=>document.getElementById('v-radar').scrollTo({top:0,behavior:'instant'}));
      const accessible=await pg.waitForFunction(()=>{
        const b=document.getElementById('rdr-down'), r=b.getBoundingClientRect();
        const m=document.getElementById('rdr-mode').getBoundingClientRect();
        return document.getElementById('v-radar').scrollTop===0&&r.bottom<innerHeight
          &&(innerWidth>innerHeight?r.right<m.left:r.bottom<m.top)
          &&b===document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      },null,{timeout:3000});
      ok(await accessible.jsonValue(),viewport.width+' × '+viewport.height+' · Spots et SELECT ont deux zones entièrement distinctes');
    }
    ok(!erreurs(log).length,'suivi et formats compacts · aucune erreur');
    await ctx.close();
  }
  // ══ 2 bis · RIEN PRÈS DE MOI : tout le Club, et ça se DIT ; Bunny pas prêt : le seau `moments` ══
  { const appels=[];
    const {pg,log}=await page(browser,{dir:'club',origin,tables:{profiles:[{pseudo:'wahigher'}]},rpc:rpcs(appels,true),
      functions:{'create-bunny-upload':{available:false},'bunny-video':{clips:[]}}});
    await pg.goto(origin+'/'); await pg.waitForFunction(()=>window.__totehm_club?.().club.lu,null,{timeout:12000}); await pg.waitForTimeout(1200);
    await pg.click('#rdr-flt [data-f="sf"]');
    await pg.click('#rdr-sf [data-sf="etape"][data-v="where"]');
    await pg.click('#rdr-sf [data-sf="ou"][data-v="near"]');
    await pg.waitForFunction(()=>window.__totehm_club().club.lu&&window.__totehm_club().club.items===0);
    ok(appels.some(a=>a.p_filters.scope==='near')&&await pg.locator('#rdr-sf [data-sf="rayon"]').count()>0,
      'le filtre près de moi montre le rayon même sans spot');
    await pg.click('#rdr-sf [data-sf="all"]');
    await pg.click('#rdr-sf [data-sf="close"]');
    await pg.waitForFunction(()=>window.__totehm_club().club.items===3);
    await pg.$eval('#rdr-plus [data-nspot]',e=>e.click()); await pg.waitForTimeout(700);
    await publierVideo(pg,'silent');
    await pg.waitForFunction(()=>document.getElementById('rdr-new').hidden,null,{timeout:10000}).catch(()=>{});
    const cr=log.rpc.filter(r=>r.name==='spot_create_audience').pop();
    ok(cr&&/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webm$/.test(cr.body.p_video)&&log.upload.some(u=>u.path.startsWith('moments/')),
       'Bunny pas prêt : la vidéo part dans le seau `moments` (« '+(cr&&cr.body.p_video)+' »), rien ne se bloque');
    ok(!erreurs(log).length,'rien près de moi · aucune erreur '+erreurs(log).join(' | '));
    await pg.context().close(); }
}finally{await browser.close();}
function innerHeightOf(vp){ return vp.height; }
async function publierVideo(pg,mode){
  const ns=pg.locator('#rdr-new'), suite=ns.locator('[data-ns="continue"]');
  await ns.locator('#cap-in [data-capk="file"]').waitFor();
  await pg.setInputFiles('#cap-f-file',VIDEO);
  await ns.locator('.take-preview video').waitFor();
  await ns.locator('[data-ns="media-next"]').click();
  await ns.locator('[data-ns="h"]').first().click();
  await ns.locator('[data-ns="quand"][data-v="now"]').click();
  await suite.click();
  await suite.click();
  await ns.locator('[data-ns="mode"][data-v="'+mode+'"]').click();
  await ns.locator('[data-ns="dur"][data-v="30"]').click();
  await ns.locator('[data-ns="go"]').click();
}
