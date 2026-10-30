// 29/10/2026 — LES VISIONNEUSES ← ET →, AU-DESSUS DU TOTEHM DÉPLOYÉ (Wah : « quand on clique sur une mini-box spot du
// Totehm de la vue centrale, on tombe sur toute l'infrastructure figher.club … je veux un résultat fullscreen identique
// au clic d'un élément de la grid de la vue de droite » · « [Visualize it] … apercevoir dans une fenêtre le même
// résultat que lorsqu'on clique sur un élément de la vue de gauche » · « les images, sur mobile, le plus haut possible :
// au milieu, la box et les infos spot les cachent »). La visionneuse de la vue VIENT dans la couche `#vx` avec la liste de
// la box, puis RENTRE chez elle ; plus aucun cadre figher.club. L'image se colle en haut et, quand elle y tient, au-dessus
// de la box. Téléphone et ordinateur ; tout est simulé (comptes, RPC, fichiers) : aucune écriture en production.
// LANCER : node com_vx.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';const browser=await launch();const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight'],f:'every_morning'}];
const DEMAIN=new Date(Date.now()+864e5).toISOString().slice(0,10)+'T08:00:00Z';
const HIER=new Date(Date.now()-864e5).toISOString().slice(0,10)+'T08:00:00Z';
/* les fichiers : un paysage, un portrait, un carré (leurs vraies proportions), et un PDF */
const DIM={pay:[1200,800],por:[900,1600],car:[1000,1000]};
const svg=([w,h])=>'<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><rect width="'+w+'" height="'+h+'" fill="#36498c"/></svg>';
const MEDIA=[{id:'m1',kind:'h',ref:'Run the hill',path:UID+'/m-pay.jpg',mime:'image/jpeg',name:'a.jpg'},
             {id:'m2',kind:'h',ref:'Run the hill',path:UID+'/m-por.jpg',mime:'image/jpeg',name:'b.jpg'},
             {id:'m3',kind:'h',ref:'Run the hill',path:UID+'/m-doc.pdf',mime:'application/pdf',name:'c.pdf'}];
const spot=(id,state,quand,photo)=>({id,habit:'Run the hill',intentions:['fight'],state,starts_at:quand,duration_min:60,city:'Lisbon',
  photo:UID+'/'+photo+'.jpg',mine:true,audience:'private',location:'off',habit_box:{name:'Run the hill',ints:['fight']},comment:'up the hill'});
const SPOTS={future:[spot('sp1','will',DEMAIN,'s-car')],now:[],past:[spot('sp2','was',HIER,'s-pay'),spot('sp3','was','2026-10-20T08:00:00Z','s-por')]};
const RPC={my_landing:{signed_in:true,pseudo:'wahigher'},my_trips:{signed_in:true,trips:[],reps:[],wisdom:[],visions:[]},
  element_media_list:{ok:true,items:MEDIA},
  habit_spaces:{ok:true,mine:true,habits:[{habit:'Run the hill',total:3,total_spaces:0,total_spots:3,spaces:[],
    spots:[{id:'sp1',format:'spot',state:'will',starts_at:DEMAIN,city:'Lisbon'},{id:'sp2',format:'spot',state:'was',starts_at:HIER,city:'Lisbon'}]}]},
  club_spots_of:b=>({ok:true,items:(b.p_filters&&b.p_filters.habit==='Run the hill'?SPOTS[b.p_period]:[])||[],total:0}),
  club_spots:{ok:true,items:[],total:0}};
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
/* l'image DESSINÉE (contain, calée en haut) : son rectangle réel, et ce qui la couvre */
const compo=(pg,sel)=>pg.evaluate(sel=>{const sec=[...document.querySelectorAll(sel)].find(s=>{const r=s.getBoundingClientRect();return r.top>-2&&r.top<innerHeight/2;});
  if(!sec) return null; const m=sec.querySelector('.tlv-m,.ssp-m'), el=m&&m.querySelector('img'), info=sec.querySelector('.tlv-b,.ssp-info');
  if(!el||!el.naturalWidth) return {vide:true};
  const R=el.getBoundingClientRect(), k=Math.min(R.width/el.naturalWidth,R.height/el.naturalHeight), w=el.naturalWidth*k, h=el.naturalHeight*k;
  const top=R.top, I=info.getBoundingClientRect();
  return {cale:m.dataset.cale||'', top:Math.round(top), bas:Math.round(top+h), w:Math.round(w), h:Math.round(h), info:Math.round(I.top), H:innerHeight, W:innerWidth,
    pos:getComputedStyle(el).objectPosition};},sel);
try{
 for(const [nom,vp] of [['téléphone',{width:390,height:844}],['ordinateur',{width:1280,height:800}]]){
  const popups=[];
  const {pg,log}=await page(browser,{dir:'com',origin,viewport:vp,hasTouch:nom==='téléphone',rpc:RPC,
    tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]},
    network:(url,req)=>{ if(req.method()==='GET'&&url.pathname.includes('/storage/v1/object/sign/')){ const k=(url.pathname.match(/\/[ms]-(pay|por|car)\./)||[])[1];
      if(k) return {status:200,contentType:'image/svg+xml',body:svg(DIM[k])}; } return null; }});
  pg.on('popup',p=>popups.push(p.url()));
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1000);
  await pg.click('#lv-tap-open');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});await pg.waitForTimeout(1200);
  await pg.$eval('#habits .v-col[data-open]',e=>e.click());await pg.waitForTimeout(500);
  const avant=await pg.evaluate(()=>({emo:document.querySelectorAll('#habits .habit.open [data-emo]').length,sp:document.querySelectorAll('#habits .habit.open [data-space]').length}));
  ok(avant.emo===3&&avant.sp===2,nom+' · la box ouverte porte ses fichiers (Visualize it ×'+avant.emo+') et ses mini-box spot (×'+avant.sp+')');
  /* ── ← [Visualize it] : la visionneuse de la vue de gauche, au-dessus du Totehm ── */
  const rpc0=log.rpc.length;
  await pg.$eval('#habits .habit.open [data-emo="m2"]',e=>e.click());await pg.waitForTimeout(700);
  const v=await pg.evaluate(()=>{const vx=document.getElementById('vx'),t=document.getElementById('tlv');
    return {vx:!vx.hidden&&getComputedStyle(vx).opacity==='1',dans:vx.contains(t),ouvert:!t.hidden,n:t.querySelectorAll('.tlv-s').length,
      vu:window.__totehm_sh().vu,box:!!t.querySelector('.tlv-s .tlv-b .habit'),deploye:!document.body.classList.contains('gate'),d:window.__totehm_vx()};});
  ok(v.vx&&v.dans&&v.ouvert&&v.n===2&&v.vu===1&&v.box&&v.deploye&&!popups.length,nom+' · [Visualize it] : la visionneuse de GAUCHE vient au-dessus du Totehm, ses 2 images (le PDF reste à part), sur celle touchée, sa box dessous → '+JSON.stringify({n:v.n,vu:v.vu}));
  await pg.waitForFunction(()=>{const i=document.querySelector('#vx .tlv-s:nth-child(2) .tlv-m img');return i&&i.naturalWidth>0;},null,{timeout:4000}).catch(()=>{});await pg.waitForTimeout(250);
  const cp=await compo(pg,'#vx .tlv-s');
  ok(cp&&/^50% 0(%|px)?$/.test(cp.pos)&&cp.top<=70&&(cp.cale==='dessus'?cp.bas<=cp.info:cp.h>=cp.H*.5),nom+' · le portrait se cale EN HAUT ('+(cp&&cp.cale)+', '+(cp&&cp.pos)+') : image '+(cp&&cp.top)+'→'+(cp&&cp.bas)+' px, la box commence à '+(cp&&cp.info));
  if(nom==='téléphone') await pg.screenshot({path:OUT+'/vx_media_portrait.png'});
  await pg.evaluate(()=>{const f=document.querySelector('#vx .tlv-f');f.scrollTop=0;});await pg.waitForTimeout(900);
  const cl=await compo(pg,'#vx .tlv-s');
  ok(cl&&/^(bloc|dessus)$/.test(cl.cale)&&cl.top<=70&&cl.info>=cl.bas&&cl.info-cl.bas<=30,nom+' · le paysage EN HAUT, et sa box REMONTE juste dessous (un seul bloc, rien ne le cache) : image '+(cl&&cl.top)+'→'+(cl&&cl.bas)+' px, box à '+(cl&&cl.info));
  if(nom==='téléphone') await pg.screenshot({path:OUT+'/vx_media_paysage.png'});
  ok(log.rpc.length===rpc0,nom+' · rien de plus n\'est demandé au serveur : les fichiers sont déjà là');
  await pg.$eval('#vx [data-tlv="x"]',e=>e.click());await pg.waitForTimeout(450);
  const f1=await pg.evaluate(()=>({vx:document.getElementById('vx').hidden,rentre:document.getElementById('tlv').parentElement.id,cl:document.body.classList.contains('is-vx'),
    box:!!document.querySelector('#habits .habit.open'),deploye:!document.body.classList.contains('gate')}));
  ok(f1.vx&&f1.rentre==='lv-g'&&!f1.cl&&f1.box&&f1.deploye,nom+' · ✕ : la visionneuse rentre dans la vue de gauche, le Totehm est là, la box toujours ouverte → '+JSON.stringify(f1));
  /* ── → une mini-box spot : le fil des spots de la vue de droite, ceux de CETTE Habit ── */
  const n0=log.rpc.filter(r=>r.name==='club_spots_of').length;
  await pg.$eval('#habits .habit.open [data-space="sp2"]',e=>e.click());
  await pg.waitForFunction(()=>window.__totehm_vx().pret,null,{timeout:4000}).catch(()=>{});await pg.waitForTimeout(700);
  const s=await pg.evaluate(()=>{const vx=document.getElementById('vx'),sh=document.getElementById('rdr-sh');
    const secs=[...sh.querySelectorAll('.lsh')], vis=secs.find(x=>{const r=x.getBoundingClientRect();return Math.abs(r.top)<4;});
    return {vx:!vx.hidden,dans:vx.contains(sh),x:vx.contains(document.getElementById('rdr-x')),n:secs.length,vu:vis?vis.dataset.lshK:'',
      club:!!document.querySelector('#xo iframe[data-k="club"]'),infos:!!(vis&&vis.querySelector('.sdata')),box:!!(vis&&vis.querySelector('.ssp-box'))};});
  const lus=log.rpc.filter(r=>r.name==='club_spots_of').slice(n0);
  ok(s.vx&&s.dans&&s.x&&s.n===3&&s.vu==='sp:sp2'&&s.infos&&s.box&&!s.club,nom+' · une mini-box spot : le fil de la vue de DROITE vient au-dessus du Totehm — ses 3 spots, sur celui touché, infos + box ; aucun cadre figher.club → '+JSON.stringify({n:s.n,vu:s.vu}));
  ok(lus.length===3&&lus.every(r=>r.body.p_pseudo==='wahigher'&&r.body.p_filters.habit==='Run the hill')&&['future','now','past'].every(p=>lus.some(r=>r.body.p_period===p)),
     nom+' · les spots de CETTE Habit, les trois temps (club_spots_of ×'+lus.length+')');
  await pg.waitForFunction(()=>{const i=[...document.querySelectorAll('#vx .lsh')].find(x=>Math.abs(x.getBoundingClientRect().top)<4);const m=i&&i.querySelector('.ssp-m img');return m&&m.naturalWidth>0;},null,{timeout:4000}).catch(()=>{});await pg.waitForTimeout(600);
  const cs=await compo(pg,'#vx .lsh');
  ok(cs&&(cs.cale==='bloc'?cs.info>=cs.bas&&cs.info-cs.bas<=30:cs.cale==='dessus'&&cs.bas<=cs.info)&&cs.top<=70,nom+' · le spot (paysage) : l\'image en haut, ses infos et sa box juste dessous, rien ne la cache ('+(cs&&cs.cale)+' : '+(cs&&cs.top)+'→'+(cs&&cs.bas)+', infos à '+(cs&&cs.info)+')');
  if(nom==='téléphone') await pg.screenshot({path:OUT+'/vx_spot.png'});
  await pg.keyboard.press('Escape');await pg.waitForTimeout(450);
  const f2=await pg.evaluate(()=>({vx:document.getElementById('vx').hidden,sh:document.getElementById('rdr-sh').parentElement.id,x:document.getElementById('rdr-x').parentElement.id,deploye:!document.body.classList.contains('gate')}));
  ok(f2.vx&&f2.sh==='lv-d'&&f2.x==='lv-d'&&f2.deploye,nom+' · Échap : le fil et sa croix rentrent dans la vue de droite, le Totehm est là → '+JSON.stringify(f2));
  /* ── « précédent » referme la couche, pas le site ── */
  await pg.$eval('#habits .habit.open [data-emo="m1"]',e=>e.click());await pg.waitForTimeout(600);
  await pg.goBack().catch(()=>{});await pg.waitForTimeout(600);
  const f3=await pg.evaluate(()=>({url:location.pathname,vx:document.getElementById('vx').hidden,deploye:!document.body.classList.contains('gate'),rentre:document.getElementById('tlv').parentElement.id}));
  ok(f3.url==='/totehm'&&f3.vx&&f3.deploye&&f3.rentre==='lv-g',nom+' · « précédent » referme la visionneuse, on reste dans le Totehm → '+JSON.stringify(f3));
  /* ── le PDF s'ouvre toujours à part ── */
  await pg.$eval('#habits .habit.open [data-emo="m3"]',e=>e.click());await pg.waitForTimeout(500);
  ok(popups.length===1&&await pg.evaluate(()=>document.getElementById('vx').hidden),nom+' · un PDF s\'ouvre à part, la couche reste fermée');
  const d=await pg.evaluate(()=>window.__totehm_vx());
  ok(d.media===2&&d.spots===1&&d.fermes===3&&Object.values(d).every(x=>typeof x!=='string'||x===''),nom+' · __totehm_vx() : des compteurs → '+JSON.stringify(d));
  ok(!erreurs(log).length,nom+' · aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();
 }
}finally{await browser.close();}
