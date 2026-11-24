// CLUB · 16/11/2026 — figher.club est minimal et il vend QUAND ON LE DEMANDE : [Discover the Club] ouvre la même couche que
// totehm.com (moteur `tools/discover.*` copié), une idée par écran, la porte sous chacun. Base simulée. LANCER : node club_discover.mjs
import {launch,page,ok} from './harness.mjs';
const browser=await launch();const origin='https://www.figher.club';
const RPC={club_spots:{ok:true,items:[],spots:[],total:0,period:'now'},space_habits:{ok:true,habits:[]},sso_epoch:0,spot_rules:{ok:true},
  club_vitrine:{ok:true,items:[{city:'Lisbon',intentions:['flow'],when:'now'},{city:'Lisbon',intentions:['love'],when:'past'}]}};
const E=pg=>pg.evaluate(()=>window.__totehm_club_discover());
try{
 for(const [nom,vp,touch,session] of [['téléphone · visiteur',{width:390,height:844},true,false],['ordinateur · membre',{width:1280,height:800},false,true]]){
  const{pg,ctx,log}=await page(browser,{dir:'club',origin,session,tables:{profiles:[{pseudo:'wahigher'}]},rpc:RPC,viewport:vp,hasTouch:touch});
  await pg.goto(origin+'/');await pg.waitForTimeout(2500);
  ok(await pg.evaluate(()=>{const b=document.getElementById('club-disc'),r=b.getBoundingClientRect();return r.width>40&&r.bottom<=innerHeight&&getComputedStyle(b).visibility!=='hidden';}),nom+' · le bouton Discover the Club est là');
  /* 24/11 (Wah) : « affiche les spots sur le radar même pour les visiteurs pour donner envie » — la VITRINE : des anneaux
     à la ville, une ligne qui invite, et le tap sur un point ouvre le Discover ; le membre lit le Club, pas la vitrine. */
  const r0=await pg.evaluate(()=>({r:window.__totehm_club().radar,say:document.getElementById('rdr-say').textContent,
    vit:window.__totehm_club().radar.points}));
  if(!session){
    ok(r0.r.points===2&&/2 spots in the club · connect with my TOTEHM/.test(r0.say)&&!log.rpc.some(x=>x.name==='club_spots'),
       nom+' · la vitrine : les spots du Club sur le radar, sans compte et sans lecture des spots → '+JSON.stringify({points:r0.r.points,say:r0.say}));
    await pg.mouse.click(r0.r.cx,r0.r.cy);await pg.waitForTimeout(700);
    ok((await E(pg)).ouvert,nom+' · le tap sur un point ouvre le Discover (la porte : Connect with my TOTEHM)');
    await pg.keyboard.press('Escape');await pg.waitForTimeout(600);
  } else ok(!log.rpc.some(x=>x.name==='club_vitrine'),nom+' · un membre ne lit jamais la vitrine');
  await pg.click('#club-disc');await pg.waitForTimeout(700);
  let d=await E(pg);
  const v=await pg.evaluate(()=>{const h=document.getElementById('cd'),r=h.getBoundingClientRect();return {plein:r.width===innerWidth&&r.height===innerHeight,fond:getComputedStyle(h).backgroundColor,titre:h.querySelector('.dc-s.is-on .dc-h').textContent.trim()};});
  ok(d.ouvert&&d.n===7&&v.plein&&v.fond==='rgb(0, 0, 0)'&&v.titre==='Meet in reality.',nom+' · 7 écrans noirs plein écran, le premier : « Meet in reality. »');
  ok(d.porte===(session?'Post a spot':'Connect with my TOTEHM'),nom+' · la porte sous chaque écran : « '+d.porte+' »');
  await pg.keyboard.press('ArrowDown');await pg.waitForTimeout(800);
  ok((await E(pg)).i===1&&await pg.evaluate(()=>document.querySelectorAll('#cd .dc-s.is-on .tw').length===1),nom+' · ↓ : « A spot is your TOTEHM Habit in action. », le mot TOTEHM est la pièce');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(600);
  ok(await pg.evaluate(()=>!window.__totehm_club_discover().ouvert&&document.getElementById('cd').hidden),nom+' · Échap referme');
  ok(!log.errors.some(e=>e.startsWith('pageerror')),nom+' · aucune erreur');
  await ctx.close();
 }
}finally{await browser.close();}
