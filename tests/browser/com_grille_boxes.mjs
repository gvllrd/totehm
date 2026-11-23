// 10/11/2026 — LA GRILLE DE GAUCHE : chaque vignette porte SA box, au format du TOTEHM, dès le premier dessin
// (Wah : « certaines boxes ne s'affichent pas ou mal sur les vignettes-images »). Mesuré avant le correctif :
// l'arbre (`my_totehm`) arrive après les médias, et 5 vignettes sur 7 n'avaient AUCUNE box en attendant.
//   1 · avant l'arbre : une box partout — la Habit de son nom, les quatre autres une box d'ATTENTE à leur couleur ;
//   2 · après l'arbre : la vraie box, au même endroit (jamais l'ancien rendu `.tl-b`) ;
//   3 · le filtre : la vue choisie n'a plus de trait blanc ; MY GRIND assombrit ses deux autres boutons.
// Tout est simulé. LANCER : node com_grille_boxes.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';
const UID='11111111-1111-4111-8111-111111111111';
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight']},{t:'Call mum',t0:'Call mum',is:['love']}];
const img=n=>UID+'/m-'+String(n).repeat(8)+'-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg';
const items=[['h','Run the hill'],['o','o1'],['r','r1'],['w','w1'],['v','v1']].map(([kind,ref],i)=>
  ({id:'m'+i,kind,ref,path:img(i+1),mime:'image/jpeg',bytes:1200,name:'x.jpg',created_at:'2026-10-15T10:0'+i+':00Z'}));
const ARBRE={signed_in:true,objectives:[{id:'o1',text:'Ship it',is:['express'],hs:['Run the hill']}],
  repulsions:[{id:'r1',text:'The phone in bed',is:['focus'],hs:['Run the hill']}],
  stories:[{id:'w1',text:'I left Paris at nineteen'}],visions:[{id:'v1',text:'The studio by the sea'}]};
const RPC={my_landing:{signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false},higher:{active:false},thp:false,subscriptions:0,subscribers:0},
  element_media_list:()=>({ok:true,items}),
  my_totehm:async()=>{ await new Promise(r=>setTimeout(r,2500)); return ARBRE; },
  habit_spaces:{ok:true,mine:true,habits:[]}, element_cloths:{ok:true,mine:true,elements:[]},
  my_visions:{ok:true,visions:[]}, my_feed_badges:{ok:true,pos:{}},
  club_spots_of:b=>({ok:true,period:b.p_period,items:[],total:0,has_more:false,next_offset:0})};
const boxes=pg=>pg.evaluate(()=>[...document.querySelectorAll('#lv-sh-f .tl[data-pol]')].map(el=>{
  const b=el.querySelector('.tl-bx>*');return b?b.className:'';}));
const browser=await launch();
try{
 for(const [nom,vp,tel] of [['téléphone',{width:390,height:844},true],['ordinateur',{width:1280,height:800},false]]){
  const {pg,log}=await page(browser,{dir:'com',origin:'https://www.totehm.com',viewport:vp,hasTouch:tel,rpc:RPC,
    tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,habits:STEPS,vis:'private'}]}});
  await pg.goto('https://www.totehm.com/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);
  await pg.click('#lvn-lf');await pg.waitForTimeout(800);
  const avant=await boxes(pg);
  ok(avant.length===5&&avant.every(c=>/\btb\b/.test(c))&&avant.filter(c=>/tb-attente/.test(c)).length===4&&avant.some(c=>/blk-h/.test(c)&&!/tb-attente/.test(c))&&/blk-v/.test(avant[0]),
     nom+' · avant l\'arbre : une box sur CHAQUE vignette (la Habit de son nom, quatre en attente à leur couleur) → '+avant.join(' | '));
  await pg.waitForTimeout(3200);
  const apres=await boxes(pg);
  ok(apres.length===5&&apres.every(c=>/\btb\b/.test(c)&&!/tb-attente/.test(c))&&!(await pg.$('#lv-sh-f .tl-b')),
     nom+' · après l\'arbre : la vraie box, au format du TOTEHM, jamais l\'ancien rendu → '+apres.join(' | '));
  await pg.screenshot({path:OUT+'/grille_boxes_'+(tel?'tel':'ordi')+'.png'});
  await pg.click('#lv-sh-flt [data-f="sf"]');await pg.waitForTimeout(900);
  await pg.click('#lv-sh-sf [data-sf="vue"][data-v="visions"]');await pg.waitForTimeout(500);
  const f=await pg.evaluate(()=>{const v=document.querySelector('#lv-sh-sf .sfv.is-on');return v?getComputedStyle(v).boxShadow:'absent';});
  ok(f==='none',nom+' · le filtre : la vue choisie sans trait blanc (box-shadow '+f+')');
  /* 23/11 (Wah) : GRIND se choisit TEL QUEL (objectifs + habits + répulsions), ses trois boutons affinent ; tout en pleine couleur */
  await pg.click('#lv-sh-sf [data-sf="grind"]');await pg.waitForTimeout(600);
  const g0=await pg.evaluate(()=>({f:window.__totehm_sh().filtre,n:window.__totehm_sh().items,on:document.querySelector('#lv-sh-sf .sfv-g').classList.contains('is-on'),
    q:document.querySelector('#lv-sh-sf .sfv-g').getBoundingClientRect().width,pile:[...document.querySelectorAll('#lv-sh-sf .sfpile i')].map(i=>Math.round(i.getBoundingClientRect().height))}));
  ok(g0.f==='grind'&&g0.n===3&&g0.on&&g0.pile.every(h=>h>=26),nom+' · GRIND seul : ses objectifs, habits et répulsions, sans choisir un sous-bouton ; boutons hauts → '+JSON.stringify(g0));
  await pg.click('#lv-sh-sf .sfpile i[data-v="habits"]');await pg.waitForTimeout(500);
  await pg.mouse.move(2,2);await pg.waitForTimeout(300);
  const g=await pg.evaluate(()=>({pile:[...document.querySelectorAll('#lv-sh-sf .sfpile i')].map(i=>({on:i.classList.contains('is-on'),
    trait:getComputedStyle(i).boxShadow,f:getComputedStyle(i).filter})),vues:[...document.querySelectorAll('#lv-sh-sf .sfv')].map(v=>getComputedStyle(v).filter),filtre:window.__totehm_sh().filtre}));
  ok(g.filtre==='habits'&&g.pile.length===3&&g.pile.every(x=>x.trait==='none'&&x.f==='none')&&g.pile.filter(x=>x.on).length===1&&g.vues.every(f=>f==='none'),
     nom+' · MY HABITS affine ; tout reste en PLEINE couleur, aucun trait blanc → '+JSON.stringify(g));
  await pg.click('#lv-sh-sf .sfpile i[data-v="habits"]');await pg.waitForTimeout(400);
  ok(await pg.evaluate(()=>window.__totehm_sh().filtre)==='grind',nom+' · re-taper MY HABITS revient à GRIND entier');
  /* 23/11 (Wah) : le petit TOTEHM docké en haut OUVRE LE TOTEHM (seul [Refine] ouvre le filtre) */
  await pg.click('#lv-sh-sf [data-sf="close"]');await pg.waitForTimeout(500);
  const loupes=await pg.evaluate(()=>[document.querySelectorAll('#lv-sh-f .tl-bx .loupe[data-vz]').length,document.querySelectorAll('#lv-sh-f .tl-bx').length]);
  ok(loupes[1]>0&&loupes[0]===loupes[1],nom+' · chaque box héritée de la grille porte sa loupe ('+loupes.join('/')+')');
  await pg.click('#gate-asteroid');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});
  const d=await pg.evaluate(()=>({vue:window.__totehm_lv().vue,deploye:!document.body.classList.contains('gate'),filtre:!document.getElementById('lv-sh-sf').hidden,cls:document.body.className,refus:window.__totehm_lv().dernierRefus}));
  ok(d.vue==='c'&&d.deploye&&!d.filtre,nom+' · le petit TOTEHM en haut : retour au centre et le TOTEHM se déploie, pas de filtre → '+JSON.stringify(d));
  ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,nom+' · aucune erreur');
  await pg.context().close();
 }
}finally{await browser.close();}
