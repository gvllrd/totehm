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
  const {pg,ctx,log}=await page(browser,{dir:'com',origin:'https://www.totehm.com',viewport:vp,hasTouch:tel,rpc:RPC,
    network:url=>url.hostname==='tile.openstreetmap.org'?{status:200,contentType:'image/png',body:TUILE}:null,
    functions:{'creator-cut-off':b=>{ PASSES=PASSES.filter(x=>x.pseudo!==b.pseudo); return {ok:true,pseudo:b.pseudo}; }},
    tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,habits:STEPS,vis:'private'}]}});
  await pg.goto('https://www.totehm.com/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);
  await pg.click('#lvn-rt');
  await pg.waitForFunction(()=>window.__totehm_rdr().carte.zoom>400&&window.__totehm_rdr().club.items===6);
  await pg.waitForSelector('#rdr-map-credit:not([hidden])');
  const requetes=log.rpc.filter(r=>r.name==='club_spots_of').map(r=>r.body);
  const carte=await pg.evaluate(()=>window.__totehm_rdr().carte);
  ok(carte.points===5&&carte.groupes===1&&carte.villes===1&&await pg.locator('#rdr-map-credit').isVisible()
    &&new Set(requetes.map(b=>b.p_period)).size===3&&requetes.some(b=>b.p_period==='past'&&b.p_offset===1&&b.p_as_of===AS_OF)
    &&requetes.every(b=>b.p_lat===null&&b.p_lng===null),
    nom+' · Map zoome sur Lisbonne et charge les trois temps, toutes les pages, sans filtre de position → '+JSON.stringify(carte));
  const [x,y]=(await pg.evaluate(()=>window.__totehm_carte()))[0];
  if(tel) await pg.touchscreen.tap(x,y); else await pg.mouse.click(x,y);
  await pg.waitForSelector('body.rdr-voir');
  const repere=await pg.locator('#rdr-sh .lsh').evaluateAll(es=>es.slice(0,5).map(e=>e.dataset.lshK));
  ok(repere.includes('sp:k2')&&!repere.includes('sp:f2'),nom+' · le repère groupé donne accès aux cinq spots de Lisbonne');
  await pg.keyboard.press('Escape');
  /* 25/11 (Wah) : « pas besoin du mode SHORT dans la vue de droite, et mettre le même bouton format SELECT PS2 ». */
  const select=pg.getByRole('button',{name:'Grid view',exact:true});
  const refine=pg.getByRole('button',{name:'Refine',exact:true});
  const capuchon=select.locator('.k2k'), cap=await capuchon.boundingBox();
  ok(await select.isVisible()&&await select.getAttribute('aria-pressed')==='false'&&await select.locator('svg').count()===0
    &&cap.width===30&&cap.height===18&&Math.abs((await refine.locator('.k2k').boundingBox()).width-cap.width)<1,
    nom+' · Map est éclairé et la touche Refine reprend le rectangle SELECT');
  await select.click();
  await pg.waitForSelector('body.rdr-grid');
  ok(await select.getAttribute('aria-pressed')==='true',
     nom+' · SELECT sans icône indique que Grid est la vue active');
  await ctx.setGeolocation({latitude:41.15,longitude:-8.61});
  await select.click();
  await pg.waitForFunction(()=>window.__totehm_rdr().carte.zoom>400&&window.__totehm_rdr().carte.points===1);
  ok(await pg.evaluate(()=>window.__totehm_rdr().club.items===6),nom+' · la carte retrouve la nouvelle ville et conserve tous les spots');
  await select.click();
  const tuile=await pg.locator('#rdr-g .tl[data-cle]').first().evaluate(e=>{
    const disque=e.getBoundingClientRect(), box=e.querySelector('.tl-bx').getBoundingClientRect();
    const trait=e.querySelector('.tl-traits path'), contour=trait.getBBox();
    return {rond:getComputedStyle(e).borderRadius, largeur:Math.abs(box.width-disque.width)<1,
      base:Math.abs(box.bottom-disque.bottom)<1, bord:getComputedStyle(trait).stroke, haut:contour.y, bas:contour.y+contour.height};
  });
  ok(tuile.rond==='50%'&&tuile.largeur&&tuile.base&&tuile.bord==='rgb(226, 75, 74)'&&tuile.haut===56&&tuile.bas>98,
     nom+' · le trait Fight suit le haut et l’arc du segment navy → '+JSON.stringify(tuile));
  /* ── plusieurs temps ── */
  const tuiles=()=>pg.evaluate(()=>[...document.querySelectorAll('#rdr-g .tl[data-cle]')].map(t=>t.dataset.cle.slice(3)).join(','));
  ok((await tuiles()).split(',').length===6,nom+' · la grille retrouve les six spots chargés en Map');
  const cadre=await refine.boundingBox(), fx=cadre.x+cadre.width/2, fy=cadre.y+cadre.height/2;
  const cdp=tel?await ctx.newCDPSession(pg):null;
  if(tel) await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:fx,y:fy}]});
  else{ await pg.mouse.move(fx,fy); await pg.mouse.down(); }
  await pg.waitForFunction(()=>{
    const cap=document.querySelector('#rdr-flt button:last-child .k2k');
    return !!cap&&new DOMMatrixReadOnly(getComputedStyle(cap).transform).m42>2.5;
  },null,{timeout:4000});
  if(tel) await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); else await pg.mouse.up();
  await pg.waitForSelector('#rdr-sf:not([hidden])');
  const t=await pg.evaluate(()=>({on:[...document.querySelectorAll('#rdr-sf [data-sf="per"]')].filter(b=>b.classList.contains('is-on')).map(b=>b.dataset.v),
    chip:(document.querySelector('#rdr-flt [data-per]')||{}).textContent}));
  const lus=new Set(log.rpc.filter(r=>r.name==='club_spots_of').map(r=>r.body.p_period));
  ok(t.on.join('|')==='now|past|future'&&lus.size===3&&t.chip==='All times',
     nom+' · now + future + past ENSEMBLE : une lecture par temps, fusionnées → '+JSON.stringify({...t,tuiles:await tuiles()}));
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
  ok(band&&band.b.join('|')==='go|share|passes|delete'&&band.w<band.W*0.8,nom+' · la bande noire : go · share · passes · delete, à la largeur de ses boutons → '+JSON.stringify(band));
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
  ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,nom+' · aucune erreur '+log.errors.join(' | '));
  await pg.context().close();
 }
}finally{await browser.close();}
