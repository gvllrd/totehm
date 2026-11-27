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
  stories:[{id:'w1',text:'I left Paris at nineteen'}],visions:[{id:'v1',text:'The studio by the sea'},{id:'v2',text:'The cabin in the woods'}]};
const RPC={my_landing:{signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false},higher:{active:false},thp:false,subscriptions:0,subscribers:0},
  element_media_list:()=>({ok:true,items}), element_media_add:(b,log)=>log.rpc.filter(r=>r.name==='element_media_add').length===1
    ?{ok:false,why:'retry'}:{ok:true,id:'m-new',kind:b.p_kind,ref:b.p_ref,path:b.p_path},
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
  await pg.locator('#lv-sh .tl[data-pol]').first().click();
  const fermerMedia=pg.locator('#tlv [data-tlv="x"]');
  ok(await fermerMedia.isVisible()&&await fermerMedia.evaluate(e=>e.classList.contains('k2')
    &&getComputedStyle(e).getPropertyValue('--joy-vue').trim()==='#0b0b0b'&&!!e.querySelector('svg')),
    nom+' · la visionneuse des médias reprend la touche croix noire');
  await fermerMedia.click();
  await pg.locator('#tlv').waitFor({state:'hidden'});
  await pg.getByRole('button',{name:/^Refine(?: · \d+)?$/}).click();await pg.waitForTimeout(900);
  await pg.click('#lv-sh-sf [data-sf="vue"][data-v="visions"]');await pg.waitForTimeout(500);
  const f=await pg.evaluate(()=>{const v=document.querySelector('#lv-sh-sf .sfv.is-on');return v?getComputedStyle(v).boxShadow:'absent';});
  ok(f==='none',nom+' · le filtre : la vue choisie sans trait blanc (box-shadow '+f+')');
  /* 24/11 (Wah) : une box choisie FERME les autres ; un tap sur elle rouvre la liste (le choix reste) */
  const nb=()=>pg.evaluate(()=>[...document.querySelectorAll('#lv-sh-sf [data-sf="box"]')].map(e=>e.dataset.v+(e.classList.contains('is-on')?'*':'')).join(','));
  const l0=await nb();
  await pg.click('#lv-sh-sf [data-sf="box"][data-v="v|v1"]');await pg.waitForTimeout(500);
  await pg.getByRole('button',{name:/^Refine(?: · \d+)?$/}).click();await pg.waitForTimeout(700);
  const l1=await nb();
  await pg.click('#lv-sh-sf [data-sf="box"][data-v="v|v1"]');await pg.waitForTimeout(400);
  const l2=await nb();
  ok(l0==='v|v1,v|v2'&&l1==='v|v1*'&&l2==='v|v1*,v|v2',nom+' · la box choisie reste SEULE ; un tap rouvre la liste, le choix gardé → '+[l0,l1,l2].join(' / '));
  await pg.click('#lv-sh-sf [data-sf="box"][data-v="v|v1"]');await pg.waitForTimeout(400);
  /* 23/11 (Wah) : GRIND se choisit TEL QUEL (objectifs + habits + répulsions), ses trois boutons affinent ; tout en pleine couleur */
  await pg.click('#lv-sh-sf [data-sf="grind"]');await pg.waitForTimeout(600);
  const g0=await pg.evaluate(()=>({f:window.__totehm_sh().filtre,n:window.__totehm_sh().items,on:document.querySelector('#lv-sh-sf .sfv-g').classList.contains('is-on'),
    q:document.querySelector('#lv-sh-sf .sfv-g').getBoundingClientRect().width,pile:[...document.querySelectorAll('#lv-sh-sf .sfpile i')].map(i=>Math.round(i.getBoundingClientRect().height))}));
  ok(g0.f==='grind'&&g0.n===3&&g0.on&&g0.pile.length===3,nom+' · GRIND seul : ses objectifs, habits et répulsions, sans choisir un sous-bouton (les trois boutons gardent leurs proportions) → '+JSON.stringify(g0));
  await pg.click('#lv-sh-sf .sfpile i[data-v="habits"]');await pg.waitForTimeout(500);
  await pg.mouse.move(2,2);await pg.waitForTimeout(300);
  const g=await pg.evaluate(()=>({pile:[...document.querySelectorAll('#lv-sh-sf .sfpile i')].map(i=>({on:i.classList.contains('is-on'),
    trait:getComputedStyle(i).boxShadow,f:getComputedStyle(i).filter})),vues:[...document.querySelectorAll('#lv-sh-sf .sfv')].map(v=>getComputedStyle(v).filter),filtre:window.__totehm_sh().filtre}));
  ok(g.filtre==='habits'&&g.pile.length===3&&g.pile.every(x=>x.trait==='none'&&x.f==='none')&&g.pile.filter(x=>x.on).length===1&&g.vues.every(f=>f==='none'),
     nom+' · MY HABITS affine ; tout reste en PLEINE couleur, aucun trait blanc → '+JSON.stringify(g));
  await pg.click('#lv-sh-sf .sfpile i[data-v="habits"]');await pg.waitForTimeout(400);
  ok(await pg.evaluate(()=>window.__totehm_sh().filtre)==='grind',nom+' · re-taper MY HABITS revient à GRIND entier');
  await pg.click('#lv-sh-sf [data-sf="close"]');await pg.waitForTimeout(500);
  /* 23/11 (Wah) : « + » commence par la PRISE (photo / vidéo / fichier), PUIS la box */
  const up0=log.upload.length;
  await pg.getByRole('button',{name:'Add a media',exact:true}).click();await pg.waitForTimeout(900);
  const c0=await pg.evaluate(()=>({cap:!!document.querySelector('#lv-sh-sf .sf-cap #cap-in'),cmd:!!document.querySelector('#lv-sh-sf .sfcmd'),
    b:[...document.querySelectorAll('#lv-sh-sf .sf-cap .cap-b')].map(e=>e.textContent.trim().toLowerCase())}));
  ok(c0.cap&&!c0.cmd,nom+' · « + » : la capture D\'ABORD, aucune box à choisir avant → '+JSON.stringify(c0));
  const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
  await pg.setInputFiles('#cap-f-file',{name:'shot.png',mimeType:'image/png',buffer:PNG});
  await pg.waitForFunction(()=>!!document.querySelector('#lv-sh-sf .sfcmd'),null,{timeout:6000}).catch(()=>{});
  const rail=k=>pg.locator('#lv-sh-sf [data-sf="aj-stage"][data-v="'+k+'"]');
  const save=pg.locator('#lv-sh-sf [data-sf="aj-save"]');
  ok(await rail('box').getAttribute('aria-current')==='step'&&await rail('review').isDisabled()&&log.upload.length===up0,
    nom+' · le média reste local pendant le choix de la box');
  await pg.click('#lv-sh-sf [data-sf="vue"][data-v="visions"]');
  await pg.click('#lv-sh-sf [data-sf="box"][data-v="v|v1"]');
  const recap=pg.locator('#lv-sh-sf .take-stage');
  ok(await recap.locator('.take-preview img').count()===1&&await recap.locator('.sfbx .tb.blk-v').count()===1
    &&await save.isEnabled()&&log.upload.length===up0&&!log.rpc.some(r=>r.name==='element_media_add'),
    nom+' · la box native et l’aperçu sont visibles avant toute écriture');
  await rail('media').click();
  ok(await recap.locator('.take-preview figcaption').textContent()==='shot.png',nom+' · revenir à Media garde le fichier');
  await rail('box').click();
  ok(await recap.locator('[data-sf="box"][data-v="v|v1"]').getAttribute('aria-pressed')==='true',
    nom+' · revenir à Box garde la sélection');
  await pg.click('#lv-sh-sf [data-sf="box"][data-v="v|v2"]');
  await pg.screenshot({animations:'disabled',path:OUT+'/prise_media_'+(tel?'tel':'ordi')+'.png'});
  await save.click();
  const statut=recap.getByRole('status');
  await statut.filter({hasText:'try again'}).waitFor();
  ok(await recap.locator('.take-preview img').count()===1
    &&await recap.locator('.sfbx .v-name').textContent().then(v=>v.trim()==='The cabin in the woods')
    &&await save.isEnabled(),nom+' · après un refus, le média et sa box restent disponibles pour réessayer');
  await save.click();
  await pg.locator('#lv-sh-sf').waitFor({state:'hidden'});
  const add=log.rpc.filter(r=>r.name==='element_media_add').at(-1);
  const up=log.upload.find(r=>r.method==='POST'&&r.path==='element-media/'+add?.body.p_path);
  ok(!!up&&/\/m-[0-9a-f-]{36}\.jpg$/.test(up.path)&&add.body.p_ref==='v2'&&add.body.p_name==='shot.png',
    nom+' · Save media rattache le fichier à la dernière box choisie');
  /* 23/11 (Wah) : le petit TOTEHM docké en haut OUVRE LE TOTEHM (seul [Refine] ouvre le filtre) */
  const loupes=await pg.evaluate(()=>[document.querySelectorAll('#lv-sh-f .tl-bx .loupe[data-vz]').length,document.querySelectorAll('#lv-sh-f .tl-bx').length]);
  ok(loupes[1]>0&&loupes[0]===loupes[1],nom+' · chaque box héritée de la grille porte sa loupe ('+loupes.join('/')+')');
  await pg.click('#gate-asteroid');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});
  const d=await pg.evaluate(()=>({vue:window.__totehm_lv().vue,deploye:!document.body.classList.contains('gate'),filtre:!document.getElementById('lv-sh-sf').hidden,cls:document.body.className,refus:window.__totehm_lv().dernierRefus}));
  ok(d.vue==='c'&&d.deploye&&!d.filtre,nom+' · le petit TOTEHM en haut : retour au centre et le TOTEHM se déploie, pas de filtre → '+JSON.stringify(d));
  ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,nom+' · aucune erreur');
  await pg.context().close();
 }
}finally{await browser.close();}
