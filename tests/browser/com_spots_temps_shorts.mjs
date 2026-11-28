// 23/11/2026 — LA VUE DE DROITE (Wah) :
//   1 · « ajouter une mention Shorts, en plus de Grid et Map, pour faire défiler ses spots » ;
//   2 · « pouvoir sélectionner TOUS les temps (now, later et past) comme on peut sélectionner plusieurs intentions ».
// Le serveur lit UN temps par appel : une lecture par temps choisi, fusionnées. Tout est simulé. LANCER : node com_spots_temps_shorts.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const UID='11111111-1111-4111-8111-111111111111', now=Date.now();
const AS_OF=new Date(now).toISOString();
const COMMENTAIRE='Au point de rendez-vous\n\n'+('ligne\n'.repeat(25))+'x'.repeat(100);
const TUILE=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight']}];
const sp=(id,per)=>({id,habit:'Run the hill',intentions:['fight'],mine:true,creator:'wahigher',city:'Lisbon',audience:'figher',mode:'social',location:'on',
  starts_at:new Date(now+(per==='past'?-864e5:per==='future'?864e5:-1000)).toISOString(),ends_at:new Date(now+(per==='past'?-80e6:36e5)).toISOString(),
  exact:{lat:38.72,lng:-9.14,place:'the hill'},habit_box:{name:'Run the hill',ints:['fight'],objectives:[],repulsions:[]}});
const kai={...sp('k1','now'),mine:false,creator:'kai'};
const PAR={now:[sp('n1','now'),kai],
  future:[sp('f1','future'),{...sp('f2','future'),city:'Porto',exact:{lat:41.15,lng:-8.61}}],
  past:[{...sp('p1','past'),comment:COMMENTAIRE},{...sp('k2','past'),mine:false,creator:'kai',location:'off',exact:null}]};
const RPC={my_landing:{signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false},higher:{active:false},thp:false,subscriptions:0,subscribers:0},
  my_totehm:{signed_in:true,objectives:[],repulsions:[],stories:[],visions:[]},element_media_list:{ok:true,items:[]},
  habit_spaces:{ok:true,mine:true,habits:[]},element_cloths:{ok:true,mine:true,elements:[]},my_visions:{ok:true,visions:[]},my_feed_badges:{ok:true,pos:{}},
  club_spots_of:b=>{
    const liste=PAR[b.p_period], offset=b.p_offset, limite=b.p_period==='past'?1:b.p_limit;
    const items=liste.slice(offset,offset+limite), suite=offset+items.length;
    return {ok:true,period:b.p_period,items,total:liste.length,has_more:suite<liste.length,next_offset:suite,as_of:AS_OF};
  },
  spot_pass_mine:b=>({ok:true,code:'K7Q2ZP',pseudo:'wahigher',creator:'kai',habit:'Run the hill',starts_at:new Date(now).toISOString()}),
  spot_passes_for:()=>({ok:true,items:PASSES}),
  spot_pass_check:b=>b.p_code==='AB23CD'?{ok:true,pseudo:'nia'}:{ok:false,why:'unknown'}};
let PASSES=[{pseudo:'nia',code:'AB23CD',at:new Date(now).toISOString()}];
const browser=await launch();
try{
 for(const [nom,vp,tel] of [['téléphone',{width:390,height:844},true],['ordinateur',{width:1280,height:800},false]]){
  PASSES=[{pseudo:'nia',code:'AB23CD',at:new Date(now).toISOString()}];
  let panneCarte=!tel;
  const tuilesEnEchec=new Set(), tuilesRelues=new Set();
  const {pg,ctx,log}=await page(browser,{dir:'com',origin:'https://www.totehm.com',viewport:vp,hasTouch:tel,rpc:RPC,
    geo:{latitude:38.75,longitude:-9.14},
    network:url=>{
      if(url.hostname!=='tile.openstreetmap.org') return null;
      if(panneCarte){ tuilesEnEchec.add(url.pathname); return {status:503,body:''}; }
      if(tuilesEnEchec.has(url.pathname)) tuilesRelues.add(url.pathname);
      return {status:200,contentType:'image/png',body:TUILE};
    },
    functions:{'creator-cut-off':b=>{ PASSES=PASSES.filter(x=>x.pseudo!==b.pseudo); return {ok:true,pseudo:b.pseudo}; }},
    tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,habits:STEPS,vis:'private'}]}});
  await pg.goto('https://www.totehm.com/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);
  await pg.click('#lvn-rt');
  await pg.waitForFunction(()=>window.__totehm_rdr().carte.zoom===455.07&&window.__totehm_rdr().club.items===6);
  if(!tel){
    await pg.waitForTimeout(200);
    ok(tuilesEnEchec.size>0&&!await pg.locator('#rdr-map-credit').isVisible(),
      nom+' · le globe garde son fond de secours si les tuiles sont indisponibles');
    panneCarte=false;
    await pg.evaluate(()=>window.dispatchEvent(new Event('online')));
  }
  await pg.waitForSelector('#rdr-map-credit:not([hidden])');
  if(!tel) ok(tuilesRelues.size>0,nom+' · le retour du réseau recharge les tuiles au même endroit');
  const requetes=log.rpc.filter(r=>r.name==='club_spots_of').map(r=>r.body);
  const carte=await pg.evaluate(()=>window.__totehm_rdr().carte);
  ok(carte.points===5&&carte.groupes===1&&carte.villes===1&&await pg.locator('#rdr-map-credit').isVisible()
    &&new Set(requetes.map(b=>b.p_period)).size===3&&requetes.some(b=>b.p_period==='past'&&b.p_offset===1&&b.p_as_of===AS_OF)
    &&requetes.every(b=>b.p_lat===null&&b.p_lng===null),
    nom+' · Map zoome sur Lisbonne et charge les trois temps, toutes les pages, sans filtre de position → '+JSON.stringify(carte));
  const pointBlanc=await pg.evaluate(()=>{
    const c=document.getElementById('rdr-map'), h=innerHeight;
    const bas=Math.max(120,h-document.getElementById('lvjoy').getBoundingClientRect().top+70);
    const x=Math.round(c.width/2), y=Math.round((118+(h-118-bas)/2)*c.height/h);
    return [...c.getContext('2d').getImageData(x,y,1,1).data].join();
  });
  ok(carte.position&&pointBlanc==='255,255,255,255',nom+' · mon emplacement est un point plein blanc');
  const tap=async([x,y])=>tel?pg.touchscreen.tap(x,y):pg.mouse.click(x,y);
  if(!tel){
    const [x,y]=(await pg.evaluate(()=>window.__totehm_carte()))[0];
    await pg.evaluate(()=>{window.__zoomVu=[]; const f=()=>{window.__zoomVu.push(window.__totehm_rdr().carte.zoom);
      if(window.__zoomVu.length<90) requestAnimationFrame(f);}; requestAnimationFrame(f);});
    await pg.mouse.move(x,y);
    for(let i=0;i<6;i++) await pg.mouse.wheel(0,240);
    await pg.waitForFunction(()=>window.__totehm_rdr().carte.zoom<1.01);
    ok(await pg.evaluate(()=>new Set(window.__zoomVu).size>12),nom+' · le dézoom du trackpad passe par des échelles intermédiaires');
    const [sx,sy]=(await pg.evaluate(()=>window.__totehm_carte()))[0];
    await pg.mouse.move(sx,sy);
    await pg.mouse.down();
    await pg.mouse.move(sx+45,sy+25,{steps:5});
    await pg.mouse.move(sx,sy,{steps:5});
    await pg.mouse.up();
    await pg.waitForTimeout(180);
    ok(await pg.evaluate(()=>{
      const r=window.__totehm_rdr();
      return !r.voit&&r.carte.zoom===1;
    }),nom+' · un glissé aller-retour ne se transforme pas en appui');
  }
  await tap((await pg.evaluate(()=>window.__totehm_carte()))[0]);
  await pg.waitForFunction(nb=>{
    const r=window.__totehm_rdr(), p=window.__totehm_carte();
    return !r.voit&&r.carte.zoom>5&&p.length===nb&&p.every(([x,y],i)=>
      p.slice(0,i).every(([a,b])=>Math.hypot(x-a,y-b)>16));
  },tel?5:6,{timeout:5000});
  ok(true,nom+' · le nombre cadre la zone et sépare les spots sur la carte');
  await tap((await pg.evaluate(()=>window.__totehm_carte()))[0]);
  await pg.waitForSelector('body.rdr-voir');
  const repere=await pg.locator('#rdr-sh .lsh').evaluateAll(es=>es.map(e=>e.dataset.lshK));
  ok(repere.includes('sp:k2')&&repere.length===6,nom+' · un spot séparé ouvre sa fiche');
  const fermerSpot=pg.locator('#rdr-x');
  ok(await fermerSpot.evaluate(e=>getComputedStyle(e).getPropertyValue('--joy-vue').trim()==='#0b0b0b'&&!!e.querySelector('svg')),
    nom+' · le spot s’ouvre avec une touche croix noire');
  await pg.keyboard.press('Escape');
  await pg.waitForFunction(()=>!window.__totehm_rdr().voit&&window.__totehm_rdr().carte.zoom===1);
  ok(await pg.evaluate(()=>window.__totehm_lv().vue==='d'),nom+' · Échap referme le spot et rétablit le globe');
  const locate=pg.getByRole('button',{name:'Center on my location'});
  await locate.click();
  await pg.waitForFunction(()=>window.__totehm_rdr().carte.zoom>450);
  const zoomInitial=(await pg.evaluate(()=>window.__totehm_rdr().carte)).zoom;
  if(tel){
    const doigt=await ctx.newCDPSession(pg), x=vp.width/2, y=vp.height/2;
    const points=ecart=>[{id:1,x:x-ecart,y},{id:2,x:x+ecart,y}];
    await doigt.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(65)});
    for(const ecart of [52,42,34,27,21]){
      await doigt.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(ecart)});
      await pg.waitForTimeout(18);
    }
    await doigt.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[points(21)[1]]});
    const tours=await pg.evaluate(()=>window.__totehm_rdr().carte.tours||0);
    await doigt.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x-40,y:y+28}]});
    await pg.waitForTimeout(50);
    ok(await pg.evaluate(n=>window.__totehm_rdr().carte.tours>n,tours),
      nom+' · le doigt restant reprend le glissé dans le même geste');
    await doigt.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await pg.waitForFunction(k=>window.__totehm_rdr().carte.zoom<k*.5,zoomInitial,{timeout:4000});
    ok(true,nom+' · le pincement réduit l’échelle de la carte');
  }else{
    await pg.mouse.move(vp.width/2+68,vp.height/2);
    await pg.mouse.wheel(0,120);
    await pg.waitForFunction(k=>window.__totehm_rdr().carte.zoom<k*.72,zoomInitial);
  }
  await pg.keyboard.press('Escape');
  await pg.waitForFunction(()=>window.__totehm_rdr().carte.zoom===1);
  ok(await pg.evaluate(()=>window.__totehm_lv().vue==='d'),nom+' · Échap remet le globe à son échelle initiale après le zoom');
  await ctx.setGeolocation({latitude:41.15,longitude:-8.61});
  await pg.evaluate(()=>{
    const geo=navigator.geolocation, lire=geo.getCurrentPosition.bind(geo);
    window.__geoDemandes=0;
    geo.getCurrentPosition=(reussite,echec,opts)=>{
      if(++window.__geoDemandes===1) return setTimeout(()=>echec({code:2}),30);
      lire(reussite,echec,opts);
    };
  });
  if(tel) await locate.tap(); else await locate.click();
  await pg.waitForFunction(()=>window.__totehm_rdr().carte.zoom>400&&window.__totehm_rdr().carte.points===1);
  ok(await pg.evaluate(()=>window.__geoDemandes===2&&window.__totehm_rdr().club.items===6),
    nom+' · la localisation réessaie après une erreur et centre la nouvelle ville avec tous les spots');

  const select=pg.getByRole('button',{name:'Grid view',exact:true});
  const refine=pg.getByRole('button',{name:'Refine',exact:true});
  const capuchon=select.locator('.k2k'), cap=await capuchon.boundingBox();
  ok(await select.isVisible()&&await select.getAttribute('aria-pressed')==='false'&&await select.locator('svg').count()===0
    &&cap.width===30&&cap.height===18&&Math.abs((await refine.locator('.k2k').boundingBox()).width-cap.width)<1
    &&await pg.locator('#rdr-flt button:visible').count()===1,
    nom+' · Map est éclairé et la touche Refine reprend le rectangle SELECT');
  await select.click();
  await pg.waitForSelector('body.rdr-grid');
  ok(await select.getAttribute('aria-pressed')==='true'&&!await locate.isVisible(),
     nom+' · SELECT sans icône indique que Grid est la vue active');
  const tuile=await pg.locator('#rdr-g .tl[data-cle]').first().evaluate(e=>{
    const disque=e.getBoundingClientRect(), box=e.querySelector('.tl-bx').getBoundingClientRect();
    const trait=e.querySelector('.tl-traits path'), contour=trait.getBBox();
    return {rond:getComputedStyle(e).borderRadius, largeur:Math.abs(box.width-disque.width)<1,
      base:Math.abs(box.bottom-disque.bottom)<1, fraction:box.height/disque.height, bord:getComputedStyle(trait).stroke,
      haut:contour.y, bas:contour.y+contour.height, arc:/^M[\d.]+ 70A/.test(trait.getAttribute('d'))};
  });
  ok(tuile.rond==='50%'&&tuile.largeur&&tuile.base&&tuile.fraction<.31&&tuile.bord==='rgb(226, 75, 74)'&&tuile.haut===70&&tuile.bas>98&&tuile.arc,
     nom+' · la box occupe 30 % du rond et le trait Fight suit son arc extérieur → '+JSON.stringify(tuile));
  /* ── plusieurs temps ── */
  const tuiles=()=>pg.evaluate(()=>[...document.querySelectorAll('#rdr-g .tl[data-cle]')].map(t=>t.dataset.cle.slice(3)).join(','));
  ok((await tuiles()).split(',').length===6,nom+' · la grille retrouve les six spots chargés en Map');
  const cadre=await refine.boundingBox(), fx=cadre.x+cadre.width/2, fy=cadre.y+cadre.height/2;
  const cdp=tel?await ctx.newCDPSession(pg):null;
  if(tel) await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:fx,y:fy}]});
  else{ await pg.mouse.move(fx,fy); await pg.mouse.down(); }
  await pg.waitForFunction(()=>{
    const cap=document.querySelector('#rdr-flt [data-f="sf"] .k2k');
    return !!cap&&new DOMMatrixReadOnly(getComputedStyle(cap).transform).m42>2.5;
  },null,{timeout:4000});
  if(tel) await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); else await pg.mouse.up();
  await pg.waitForSelector('#rdr-sf:not([hidden])');
  ok(await pg.locator('#rdr-sf [data-sf="close"]').evaluate(e=>e.classList.contains('side-close')
    &&e.getAttribute('aria-label')==='Close'&&getComputedStyle(e).getPropertyValue('--joy-vue').trim()==='#0b0b0b'),
    nom+' · Refine se referme avec la même touche croix noire');
  const etape=k=>pg.click('#rdr-sf [data-sf="etape"][data-v="'+k+'"]');
  ok(await pg.locator('#rdr-sf .sfb .habit').count()>0&&await pg.locator('#rdr-sf [data-sf="per"]').count()===0,
    nom+' · Refine ouvre les Habit Boxes natives, une étape à la fois');
  await etape('intentions');
  const trait=pg.locator('#rdr-sf [data-sf="int"][data-v="fight"] i');
  ok(await trait.evaluate(e=>{const s=getComputedStyle(e); return s.width==='2px'&&s.borderRadius==='0px'&&e.offsetHeight>14;}),
    nom+' · une intention se dessine par un trait');
  await etape('where');
  ok(await pg.locator('#rdr-sf [data-sf="rayon"]').count()===0,nom+' · le rayon attend le choix Near me');
  await pg.click('#rdr-sf [data-sf="ou"][data-v="near"]');
  await pg.waitForSelector('#rdr-sf [data-sf="rayon"][data-v="50"]');
  await pg.click('#rdr-sf [data-sf="ou"][data-v=""]');
  await etape('when');
  const t=await pg.locator('#rdr-sf [data-sf="per"].is-on').evaluateAll(es=>es.map(b=>b.dataset.v));
  const lus=new Set(log.rpc.filter(r=>r.name==='club_spots_of').map(r=>r.body.p_period));
  ok(t.join('|')==='now|past|future'&&lus.size===3,
     nom+' · now + future + past ENSEMBLE : une lecture par temps, fusionnées → '+t.join(' · '));
  await pg.click('#rdr-sf [data-sf="per"][data-v="now"]');await pg.waitForTimeout(700);
  ok((await tuiles()).split(',').sort().join()==='f1,f2,k2,p1',nom+' · re-taper now le retire (comme une intention)');
  await pg.click('#rdr-sf [data-sf="per"][data-v="future"]');await pg.waitForTimeout(500);
  await pg.click('#rdr-sf [data-sf="per"][data-v="past"]');await pg.waitForTimeout(700);
  ok(await tuiles()==='p1,k2',nom+' · il reste toujours au moins un temps');
  await pg.click('#rdr-sf [data-sf="close"]');await pg.waitForTimeout(500);
  /* ── LE POLAROID : un tap sur une tuile (25/11 : il n'y a plus de mode Shorts) ── */
  await pg.click('#rdr-g .tl[data-cle]');await pg.waitForTimeout(1500);
  const s=await pg.evaluate(()=>({voit:document.body.classList.contains('rdr-voir'),etat:window.__totehm_lv().spots}));
  ok(s.voit&&s.etat.mode==='grid'&&s.etat.polaroid.on,nom+' · un tap sur une tuile : les spots défilent plein écran → '+JSON.stringify({voit:s.voit,mode:s.etat.mode,on:s.etat.polaroid.on}));
  const loupe=pg.locator('#rdr-sh [data-lsh-k="sp:p1"] [data-spot-zoom]');
  await loupe.click();
  ok(await loupe.getAttribute('aria-pressed')==='true'&&await loupe.locator('..').evaluate(e=>e.classList.contains('is-zoom')),
    nom+' · la loupe agrandit la box en place');
  const note=await pg.locator('#rdr-sh [data-lsh-k="sp:p1"] .sd-say').evaluate(e=>{
    const cadre=e.closest('.sdata').getBoundingClientRect(), texte=e.getBoundingClientRect();
    return {mot:e.textContent,lignes:getComputedStyle(e).whiteSpace,scroll:e.scrollHeight>e.clientHeight,
      dedans:texte.bottom<cadre.bottom&&texte.width<cadre.width&&e.scrollWidth<=e.clientWidth};
  });
  ok(note.mot===COMMENTAIRE&&note.lignes==='pre-wrap'&&note.scroll&&note.dedans,nom+' · le commentaire publié garde ses lignes et défile dans la box noire');
  /* 23/11 (Wah) : [Share] dans la bande noire (avec go et delete), et la bande pas plus large que ses boutons */
  await pg.evaluate(()=>{ window.__part=null; navigator.share=d=>{ window.__part=d; return Promise.resolve(); }; });
  const band=await pg.evaluate(()=>{ const r=document.querySelector('#rdr-sh .lsh.is-ici .ssp-row')||document.querySelector('#rdr-sh .ssp-row');
    return r?{w:Math.round(r.getBoundingClientRect().width),W:innerWidth,b:[...r.querySelectorAll('.ssp-acts button')].map(x=>x.textContent)}:null; });
  ok(band&&band.b.join('|')==='go|share|passes|delete'&&band.w<band.W*0.8,nom+' · les touches de la bande noire → '+JSON.stringify(band));
  await pg.evaluate(()=>{ const b=(document.querySelector('#rdr-sh .lsh.is-ici [data-share]')||document.querySelector('#rdr-sh [data-share]')); b.click(); });
  await pg.waitForTimeout(400);
  const part=await pg.evaluate(()=>window.__part);
  ok(part&&/^https:\/\/www\.figher\.club\/\?spot=/.test(part.url)&&/google\.com\/maps\/dir/.test(part.text)&&/Run the hill · the hill/.test(part.text),
     nom+' · [Share] : la Habit et son lieu, le chemin Google Maps, et le lien vers la plateforme → '+JSON.stringify(part));
  /* 23/11 (Wah) : le PASS d'invitation — le créateur vérifie un code et coupe en deux gestes ; l'abonné a SON pass */
  await pg.evaluate(()=>document.querySelector('#rdr-sh [data-passes]').click());await pg.waitForTimeout(500);
  const p0=await pg.evaluate(()=>({l:[...document.querySelectorAll('#spass .sp-r b')].map(e=>e.textContent)}));
  await pg.fill('#spass [data-sp="code"]','ab23cd');await pg.click('#spass [data-sp="check"]');await pg.waitForTimeout(300);
  const v=await pg.textContent('#spass [data-sp="dit"]');
  await pg.click('#spass [data-cut="nia"]');await pg.waitForTimeout(150);
  const coupe0=log.functions.filter(f=>f.name==='creator-cut-off').length;
  await pg.click('#spass [data-cut="nia"]');await pg.waitForTimeout(600);
  const p1=await pg.evaluate(()=>({l:document.querySelectorAll('#spass .sp-r').length,dit:document.querySelector('#spass [data-sp="dit"]').textContent}));
  ok(p0.l.join()==='nia'&&/✓ nia · valid pass/.test(v)&&coupe0===0&&log.functions.some(f=>f.name==='creator-cut-off'&&f.body.pseudo==='nia')&&p1.l===0&&/nia is cut off/.test(p1.dit),
     nom+' · [passes] : les passes de MON spot, un code vérifié, [Cut off] en deux gestes → '+JSON.stringify({p0,v,p1}));
  await pg.keyboard.press('Escape');await pg.waitForTimeout(300);
  await pg.evaluate(()=>document.querySelector('#rdr-sh [data-pass]').click());await pg.waitForTimeout(500);
  const mon=await pg.evaluate(()=>({n:(document.querySelector('#spass .sp-n')||{}).textContent,code:(document.querySelector('#spass .sp-code')||{}).textContent,p:(document.querySelector('#spass .sp-p')||{}).textContent}));
  ok(mon.n==='wahigher'&&mon.code==='K7Q2ZP'&&/cut off anyone/.test(mon.p),nom+' · [pass] : MON pass pour le spot de kai — mon nom, le code, la règle du cut off → '+JSON.stringify(mon));
  await pg.keyboard.press('Escape');await pg.waitForTimeout(300);
  await pg.keyboard.press('Escape');await pg.waitForTimeout(800);
  const g=await pg.evaluate(()=>({voit:document.body.classList.contains('rdr-voir'),mode:window.__totehm_lv().spots.mode}));
  ok(!g.voit&&g.mode==='grid',nom+' · refermer les Shorts rend la grille → '+JSON.stringify(g));
  const erreurs=log.errors.filter(e=>e.startsWith('pageerror'));
  ok(!erreurs.length,nom+' · aucune exception JavaScript '+erreurs.join(' | '));
  await pg.context().close();
 }
}finally{await browser.close();}
