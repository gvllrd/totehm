// COM · 16/11/2026 — PILE OU FACE SUR ORDINATEUR. Wah : « avoir vraiment le verso du TOTEHM comme le recto : actuellement le
// verso, contrairement au recto, est en plein écran ; deux facettes facilement retournables de part et d'autre ».
// 17/11 — LA PIÈCE. Wah : « quand on retourne le TOTEHM sur ordinateur, on ne repasse pas par la page d'atterrissage :
// il se retourne comme une pièce, recto / verso ». Au-delà de 700 px : le verso s'arrête au CARRÉ du recto déployé, et
// chaque face se retourne sur l'autre SANS l'atterrissage (ni `gate`, ni `folding`, ni `entered` pendant le geste).
// Au téléphone : rien ne change. Base simulée, aucune écriture. LANCER : node com_pile_face.mjs /tmp
import {launch,page,ok,USER} from './harness.mjs';
const OUT=process.argv[2]||'.';
const origin='https://www.totehm.com',browser=await launch();
const habits=[{t:'Run the hill',is:['fight'],f:'daily'}];
const rpc={my_landing:{signed_in:true,pseudo:'wahigher',telegram:false,higher:{active:true}},my_board:{ok:true,today:'2026-11-10',objectives:[],heat:[],feed:[],totals:{}},
 tracking_summary_for_me:{ok:true,days_count:7,counts:{done:2,missed:1,unanswered:1},days:Array.from({length:7},(_,d)=>({day:'2026-11-'+String(4+d).padStart(2,'0')})),habits:[],settings:{}},
 my_console:{signed_in:true,offer:{enabled:true,price_cents:2400,currency:'eur',payout_fin:'1234'},subscriptions:[]},my_totehm:{signed_in:true,objectives:[],repulsions:[],stories:[],visions:[]}};
const etat=pg=>pg.evaluate(()=>({gate:document.body.classList.contains('gate'),verso:document.getElementById('srch').classList.contains('is-open')}));
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
/* Ce que `body` a porté pendant le geste : l'atterrissage (`gate`), son repli (`folding`) ou son déploiement (`entered`). */
const guetter=pg=>pg.evaluate(()=>{ const vu=window.__vu={gate:false,folding:false,entered:false,max3d:0,angles:[],fantome:0,boutons:{recto:0,verso:0},ecartBoutons:0};
  const lire=()=>{ const c=document.body.classList; for(const k of ['gate','folding','entered']) if(c.contains(k)) vu[k]=true; };
  window.__obs&&window.__obs.disconnect(); window.__obs=new MutationObserver(lire); window.__obs.observe(document.body,{attributes:true,attributeFilter:['class']});
  /* la pièce TOURNE vraiment : une transformation 3D sur le carré ou le verso pendant le geste */
  const t0=performance.now();
  const pas=()=>{ for(const id of ['stage','srch-bg','srch-ui']){ const t=getComputedStyle(document.getElementById(id)).transform; if(t.startsWith('matrix3d')) vu.max3d++; }
    /* l'angle de la pièce, de 0 à 180°, lu sur la largeur visible de la face qui se montre */
    if(document.body.classList.contains('is-coin')){ const w=id=>document.getElementById(id).getBoundingClientRect().width;
      vu.angles.push([performance.now(),w('stage'),w('srch-bg'),document.getElementById('stage').offsetWidth]);
      const rotation=id=>{
        const t=getComputedStyle(document.getElementById(id)).transform;
        if(!t.startsWith('matrix3d')) return 0;
        const m=new DOMMatrix(t);
        return Math.asin(Math.max(-1,Math.min(1,-m.m13/m.m22)));
      };
      for(const [face,papier,ids] of [
        ['recto','stage',['fold-x','fold-flip','joy']],['verso','srch-bg',['srch-x','srch-flip']]
      ]){
        const angle=rotation(papier);
        if(Math.abs(angle)<.15||Math.abs(angle)>1.4) continue;
        vu.ecartBoutons=Math.max(vu.ecartBoutons,Math.abs(angle-rotation(face+'-controls')));
        if(ids.every(id=>{
          const c=getComputedStyle(document.getElementById(id));
          return c.visibility==='visible'&&Number(c.opacity)>.9&&c.pointerEvents==='none';
        })) vu.boutons[face]++;
      }
    }
    /* 17/11 — le FANTÔME : un contenu du verso encore visible alors que le verso est caché (il réapparaissait à plat
       sur le recto, 150 ms, le temps de son fondu) */
    const s=document.getElementById('srch');
    if(!s.classList.contains('is-on')) for(const e of s.querySelectorAll('.srch-after')){ const c=getComputedStyle(e);
      if(c.visibility==='visible'&&parseFloat(c.opacity)>.01&&e.getClientRects().length){ vu.fantome++; break; } }
    if(performance.now()-t0<1500) requestAnimationFrame(pas); };
  requestAnimationFrame(pas); });
const vu=pg=>pg.evaluate(()=>{ window.__obs&&window.__obs.disconnect(); return window.__vu; });
/* 17/11 — le plus grand pas d'une image à l'autre (ramené à 16,7 ms) quand la pièce passe la tranche. La face qui part
   rétrécit de 0 à 90°, celle qui arrive s'élargit de 90 à 180° : avant le correctif, 58° → 77° → 116° (un bond). */
const plusGrandPas=(angles,recto)=>{ const a=angles.map(([t,st,bg,W])=>{ const de=recto?st:bg, vers=recto?bg:st;
    const c=x=>Math.acos(Math.min(1,x/W))*180/Math.PI; return [t, de>.5?c(de):180-c(vers)]; });
  let m=0; for(let i=1;i<a.length;i++){ const dt=a[i][0]-a[i-1][0]; if(dt>4) m=Math.max(m,(a[i][1]-a[i-1][1])/dt*16.7); } return m; };
const auCarre=pg=>pg.evaluate(()=>{const r=id=>document.getElementById(id).getBoundingClientRect();const bg=r('srch-bg'),ui=r('srch-ui'),st=r('stage'),f=r('srch-flip');
  return {bg:[bg.x,bg.y,bg.width],st:[st.x,st.y,st.width],ui:ui.width<st.width&&ui.x>st.x&&ui.y>st.y,flip:f.width>20&&f.x>st.x&&f.y>st.y&&f.y<st.y+80};});
const memeCarre=v=>Math.abs(v.bg[0]-v.st[0])<2&&Math.abs(v.bg[1]-v.st[1])<2&&Math.abs(v.bg[2]-v.st[2])<2;
try{
 {const {pg,log}=await page(browser,{dir:'com',origin,viewport:{width:1280,height:800},tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:USER.id,habits:habits}]},rpc});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.click('#lv-tap-turn');await pg.waitForSelector('#srch.is-pret');await pg.waitForTimeout(900);
  let v=await auCarre(pg);
  ok(memeCarre(v),'ordinateur · le verso s\'arrête au CARRÉ du recto déployé ('+Math.round(v.bg[2])+' px, au pixel près du recto)');
  ok(v.ui&&v.flip,'ordinateur · son contenu défile DANS le carré, et le bouton « retourner » est dans son coin');
  await pg.screenshot({path:OUT+'/pile_face_verso.png'});

  /* 1. Verso ouvert depuis l'atterrissage → ⟲ : le recto se déploie SOUS le noir, puis la pièce se retourne. */
  await guetter(pg); let t0=Date.now();
  await pg.click('#srch-flip');
  await pg.waitForTimeout(200); await pg.screenshot({path:OUT+'/pile_face_tranche_1.png'});
  await pg.waitForFunction(()=>window.__totehm_piece&&window.__totehm_piece().recto&&!window.__totehm_piece().tourne,null,{timeout:4000}).catch(()=>{});
  let dt=Date.now()-t0, w=await vu(pg), e=await etat(pg), d=await pg.evaluate(()=>window.__totehm_piece());
  ok(!e.gate&&!e.verso&&d.recto,'ordinateur · ⟲ sur le verso : le recto déployé est là ('+dt+' ms)');
  ok(!w.folding&&!w.entered&&d.dessous===1&&d.versRecto===1,'ordinateur · ⟲ sur le verso : aucune animation de l\'atterrissage (le recto se déploie sous le noir, la pièce tourne)');
  ok(w.boutons.recto>0&&w.boutons.verso>0&&w.ecartBoutons<.01,
     'ordinateur · les boutons et le joystick restent visibles et tournent avec leur papier ('+JSON.stringify(w.boutons)+', écart '+w.ecartBoutons.toFixed(4)+')');
  ok(w.max3d>0,'ordinateur · ⟲ sur le verso : le carré TOURNE en 3D ('+w.max3d+' images)');
  let pas=plusGrandPas(w.angles,false);
  ok(w.angles.length>20&&pas<20,'ordinateur · ⟲ sur le verso : aucun bond à la tranche (au plus '+pas.toFixed(1)+'° par image, '+w.angles.length+' images)');
  ok(w.fantome===0,'ordinateur · ⟲ sur le verso : le tableau de bord ne réapparaît pas sur le recto ('+w.fantome+' image)');
  ok(await pg.evaluate(()=>{const b=document.getElementById('fold-flip').getBoundingClientRect(),s=document.getElementById('stage').getBoundingClientRect();return b.width>20&&b.x>s.x&&b.y>s.y&&b.y<s.y+80&&getComputedStyle(document.getElementById('fold-flip')).opacity==='1';}),
     'ordinateur · le recto déployé porte le même bouton, dans son coin');
  await pg.screenshot({path:OUT+'/pile_face_recto.png'});

  /* 2. Recto déployé → ⟲ : la pièce se retourne, l'atterrissage ne revient JAMAIS. */
  await guetter(pg); t0=Date.now();
  await pg.click('#fold-flip');
  await pg.waitForTimeout(200); await pg.screenshot({path:OUT+'/pile_face_tranche_2.png'});
  await pg.waitForFunction(()=>window.__totehm_piece().verso&&!window.__totehm_piece().tourne,null,{timeout:4000}).catch(()=>{}); dt=Date.now()-t0;
  w=await vu(pg); e=await etat(pg);
  ok(!e.gate&&e.verso,'ordinateur · ⟲ sur le recto : le verso est là ('+dt+' ms)');
  ok(!w.gate&&!w.folding,'ordinateur · ⟲ sur le recto : on ne repasse PAS par l\'atterrissage');
  ok(w.boutons.recto>0&&w.boutons.verso>0&&w.ecartBoutons<.01,
     'ordinateur · les boutons et le joystick restent visibles et tournent avec leur papier ('+JSON.stringify(w.boutons)+', écart '+w.ecartBoutons.toFixed(4)+')');
  ok(w.max3d>0,'ordinateur · ⟲ sur le recto : le carré TOURNE en 3D ('+w.max3d+' images)');
  pas=plusGrandPas(w.angles,true);
  ok(w.angles.length>20&&pas<20,'ordinateur · ⟲ sur le recto : aucun bond à la tranche (au plus '+pas.toFixed(1)+'° par image, '+w.angles.length+' images)');
  await pg.waitForTimeout(400); v=await auCarre(pg);
  ok(memeCarre(v)&&v.ui&&v.flip,'ordinateur · le verso retourné tient au même carré, son bouton dans le coin');

  /* 3. Échap sur ce verso : la pièce se retourne sur le recto (la couche du dessus se referme). */
  await guetter(pg);
  await pg.keyboard.press('Escape');
  await pg.waitForFunction(()=>window.__totehm_piece().recto&&!window.__totehm_piece().tourne,null,{timeout:4000}).catch(()=>{});
  w=await vu(pg); e=await etat(pg);
  ok(!e.gate&&!e.verso&&!w.gate&&!w.folding,'Échap sur le verso retourné : retour au recto déployé, sans l\'atterrissage');
  ok(w.fantome===0,'Échap sur le verso retourné : aucun fantôme du verso sur le recto ('+w.fantome+' image)');

  /* 4. Le wordmark du recto (mes réglages) retourne aussi la pièce. */
  await guetter(pg);
  await pg.click('#wordmark');
  await pg.waitForFunction(()=>window.__totehm_piece().verso&&!window.__totehm_piece().tourne,null,{timeout:4000}).catch(()=>{});
  w=await vu(pg); e=await etat(pg);
  ok(!e.gate&&e.verso&&!w.gate&&!w.folding,'ordinateur · le wordmark du recto ouvre mes réglages en retournant la pièce');
  await pg.click('#srch-x');
  await pg.waitForFunction(()=>window.__totehm_piece().recto&&!window.__totehm_piece().tourne,null,{timeout:4000}).catch(()=>{});
  e=await etat(pg); ok(!e.gate&&!e.verso,'la croix du verso retourné : retour au recto');

  /* 5. Échap sur le recto : le repli vers l'accueil, comme avant ; ses gestes sont libres. */
  await pg.keyboard.press('Escape');await pg.waitForTimeout(1600);
  e=await etat(pg); const lv=await pg.evaluate(()=>window.__totehm_lv());
  ok(e.gate&&!e.verso&&lv.vue==='c'&&!lv.bouge,'Échap sur le recto ramène à l\'accueil, et ses gestes sont libres');
  /* 6. Et depuis l'accueil, le chemin d'origine (le papier se retourne, le verso grandit) reste intact. */
  await pg.click('#lv-tap-turn');await pg.waitForSelector('#srch.is-pret',{timeout:6000}).catch(()=>{});await pg.waitForTimeout(700);
  v=await auCarre(pg); ok(memeCarre(v),'depuis l\'accueil, le verso s\'ouvre toujours au même carré');
  await pg.keyboard.press('Escape');await pg.waitForTimeout(1600);
  e=await etat(pg); ok(e.gate&&!e.verso,'Échap sur ce verso-là ramène à l\'accueil (le recto n\'était pas déployé)');
  ok(!erreurs(log).length,'ordinateur · aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();}
 {const {pg,log}=await page(browser,{dir:'com',origin,viewport:{width:390,height:844},hasTouch:true,tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:USER.id,habits:habits}]},rpc});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.click('#lv-tap-turn');await pg.waitForSelector('#srch.is-pret');await pg.waitForTimeout(900);
  const t=await pg.evaluate(()=>{const ui=document.getElementById('srch-ui').getBoundingClientRect();return {plein:ui.width===innerWidth&&ui.height===innerHeight,flip:getComputedStyle(document.getElementById('srch-flip')).display};});
  ok(t.plein&&t.flip==='none','téléphone · rien ne change : le verso reste plein écran, sans bouton « retourner »');
  ok(await pg.evaluate(()=>window.__totehm_piece().versVerso===0&&window.__totehm_piece().versRecto===0),'téléphone · la pièce ne tourne jamais');
  ok(!erreurs(log).length,'téléphone · aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();}
}finally{await browser.close();}
