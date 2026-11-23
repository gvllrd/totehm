// 23/11/2026 — LA VUE DE DROITE (Wah) :
//   1 · « ajouter une mention Shorts, en plus de Grid et Map, pour faire défiler ses spots » ;
//   2 · « pouvoir sélectionner TOUS les temps (now, later et past) comme on peut sélectionner plusieurs intentions ».
// Le serveur lit UN temps par appel : une lecture par temps choisi, fusionnées. Tout est simulé. LANCER : node com_spots_temps_shorts.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const UID='11111111-1111-4111-8111-111111111111', now=Date.now();
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight']}];
const sp=(id,per)=>({id,habit:'Run the hill',intentions:['fight'],mine:true,creator:'wahigher',city:'Lisbon',audience:'figher',mode:'social',location:'on',
  starts_at:new Date(now+(per==='past'?-864e5:per==='future'?864e5:-1000)).toISOString(),ends_at:new Date(now+(per==='past'?-80e6:36e5)).toISOString(),
  exact:{lat:38.72,lng:-9.14,place:'the hill'},habit_box:{name:'Run the hill',ints:['fight'],objectives:[],repulsions:[]}});
const PAR={now:[sp('n1','now')],future:[sp('f1','future'),sp('f2','future')],past:[sp('p1','past')]};
const RPC={my_landing:{signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false},higher:{active:false},thp:false,subscriptions:0,subscribers:0},
  my_totehm:{signed_in:true,objectives:[],repulsions:[],stories:[],visions:[]},element_media_list:{ok:true,items:[]},
  habit_spaces:{ok:true,mine:true,habits:[]},element_cloths:{ok:true,mine:true,elements:[]},my_visions:{ok:true,visions:[]},my_feed_badges:{ok:true,pos:{}},
  club_spots_of:b=>({ok:true,period:b.p_period,items:PAR[b.p_period]||[],total:(PAR[b.p_period]||[]).length,has_more:false,next_offset:0})};
const browser=await launch();
try{
 for(const [nom,vp,tel] of [['téléphone',{width:390,height:844},true],['ordinateur',{width:1280,height:800},false]]){
  const {pg,log}=await page(browser,{dir:'com',origin:'https://www.totehm.com',viewport:vp,hasTouch:tel,rpc:RPC,
    tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,habits:STEPS,vis:'private'}]}});
  await pg.addInitScript(()=>{ try{ localStorage.setItem('totehm_spots_mode2','grid'); }catch(_){} });
  await pg.goto('https://www.totehm.com/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);
  await pg.click('#lvn-rt');await pg.waitForTimeout(1500);
  const modes=await pg.evaluate(()=>[...document.querySelectorAll('#rdr-mode [data-rmode]')].map(b=>b.textContent.trim()));
  ok(modes.join('|')==='Map|Grid|Shorts',nom+' · trois modes : Map · Grid · Shorts → '+modes.join(' · '));
  /* ── plusieurs temps ── */
  const tuiles=()=>pg.evaluate(()=>[...document.querySelectorAll('#rdr-g .tl[data-cle]')].map(t=>t.dataset.cle.slice(3)).join(','));
  ok(await tuiles()==='n1',nom+' · à l\'arrivée : now');
  await pg.click('#rdr-flt [data-f="sf"]');await pg.waitForTimeout(500);
  await pg.click('#rdr-sf [data-sf="per"][data-v="future"]');await pg.waitForTimeout(700);
  await pg.click('#rdr-sf [data-sf="per"][data-v="past"]');await pg.waitForTimeout(700);
  const t=await pg.evaluate(()=>({on:[...document.querySelectorAll('#rdr-sf [data-sf="per"]')].filter(b=>b.classList.contains('is-on')).map(b=>b.dataset.v),
    chip:(document.querySelector('#rdr-flt [data-per]')||{}).textContent}));
  const lus=new Set(log.rpc.filter(r=>r.name==='club_spots_of').map(r=>r.body.p_period));
  ok(t.on.join('|')==='now|past|future'&&await tuiles()==='n1,p1,f1,f2'&&lus.size===3&&t.chip==='now · past · future',
     nom+' · now + future + past ENSEMBLE : une lecture par temps, fusionnées → '+JSON.stringify({...t,tuiles:await tuiles()}));
  await pg.click('#rdr-sf [data-sf="per"][data-v="now"]');await pg.waitForTimeout(700);
  ok(await tuiles()==='p1,f1,f2',nom+' · re-taper now le retire (comme une intention)');
  await pg.click('#rdr-sf [data-sf="per"][data-v="future"]');await pg.waitForTimeout(500);
  await pg.click('#rdr-sf [data-sf="per"][data-v="past"]');await pg.waitForTimeout(700);
  ok(await tuiles()==='p1',nom+' · il reste toujours au moins un temps');
  await pg.click('#rdr-sf [data-sf="close"]');await pg.waitForTimeout(500);
  /* ── Shorts ── */
  await pg.click('#rdr-mode [data-rmode="shorts"]');await pg.waitForTimeout(1500);
  const s=await pg.evaluate(()=>({voit:document.body.classList.contains('rdr-voir'),etat:window.__totehm_lv().spots}));
  ok(s.voit&&s.etat.mode==='shorts'&&s.etat.polaroid.on,nom+' · Shorts : les spots défilent plein écran → '+JSON.stringify({voit:s.voit,mode:s.etat.mode,on:s.etat.polaroid.on}));
  /* 23/11 (Wah) : [Share] dans la bande noire (avec go et delete), et la bande pas plus large que ses boutons */
  await pg.evaluate(()=>{ window.__part=null; navigator.share=d=>{ window.__part=d; return Promise.resolve(); }; });
  const band=await pg.evaluate(()=>{ const r=document.querySelector('#rdr-sh .lsh.is-ici .ssp-row')||document.querySelector('#rdr-sh .ssp-row');
    return r?{w:Math.round(r.getBoundingClientRect().width),W:innerWidth,b:[...r.querySelectorAll('.ssp-acts button')].map(x=>x.textContent)}:null; });
  ok(band&&band.b.join('|')==='go|share|delete'&&band.w<band.W*0.8,nom+' · la bande noire : go · share · delete, à la largeur de ses boutons → '+JSON.stringify(band));
  await pg.evaluate(()=>{ const b=(document.querySelector('#rdr-sh .lsh.is-ici [data-share]')||document.querySelector('#rdr-sh [data-share]')); b.click(); });
  await pg.waitForTimeout(400);
  const part=await pg.evaluate(()=>window.__part);
  ok(part&&/^https:\/\/www\.figher\.club\/\?spot=/.test(part.url)&&/google\.com\/maps\/dir/.test(part.text)&&/Run the hill · the hill/.test(part.text),
     nom+' · [Share] : la Habit et son lieu, le chemin Google Maps, et le lien vers la plateforme → '+JSON.stringify(part));
  await pg.keyboard.press('Escape');await pg.waitForTimeout(800);
  const g=await pg.evaluate(()=>({voit:document.body.classList.contains('rdr-voir'),mode:window.__totehm_lv().spots.mode}));
  ok(!g.voit&&g.mode==='grid',nom+' · refermer les Shorts rend la grille → '+JSON.stringify(g));
  ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,nom+' · aucune erreur '+log.errors.join(' | '));
  await pg.context().close();
 }
}finally{await browser.close();}
