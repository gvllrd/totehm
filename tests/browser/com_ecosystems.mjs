// 23/11/2026 — ↓ ECOSYSTEMS (Wah) : la vue ↓ Get Higher est retirée ; ↓ retourne MON TOTEHM sur son verso en mode recherche
// (la creator economy), « comme si on le retournait avec le mouvement du scroll / trackpad ». Le papier SUIT le geste ;
// lâché avant la moitié, il revient. Sans nom tapé, le verso montre mes abonnements. Tout est simulé. LANCER : node com_ecosystems.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const origin='https://www.totehm.com', UID='11111111-1111-4111-8111-111111111111';
const tables={profiles:[{pseudo:'wah'}],totehms:[{user_id:UID,habits:[{t:'Run the hill',t0:'Run the hill',is:['fight']}],vis:'private'}]};
const GVA={ok:true,pseudo:'gva',palette:['flow'],sale:{open:true,price_cents:8400,currency:'eur',period:'year'},viewer:{signed_in:true,me:false,subscribed:true,until:'2027-11-18T13:02:59Z',ending:false,can_read:true}};
const rpc={my_landing:{signed_in:true,pseudo:'wah',visibility:'private',offer:{enabled:false},higher:{active:false},thp:false},
  figher_access:{signed_in:true,member:true}, creator_page:b=>String(b.p_pseudo).toLowerCase()==='gva'?GVA:{ok:false,why:'nobody'},
  totehm_read:{ok:false,why:'subscribe'}, my_console:{signed_in:true,offer:{enabled:false},subscriptions:[{creator:'gva',status:'active',price_cents:8400,currency:'eur'},{creator:'old',status:'canceled'}]}};
const angle=pg=>pg.evaluate(()=>{const m=(document.getElementById('gate-card').style.transform||'').match(/rotateY\(([-\d.]+)deg\)/);return m?+m[1]:0;});
const ouvert=pg=>pg.waitForFunction(()=>{const c=window.__totehm_cherche&&window.__totehm_cherche();return c&&c.ouvert;},null,{timeout:8000}).then(()=>true,()=>false);
const browser=await launch();
try{
 for(const [nom,vp,tel] of [['ordinateur',{width:1280,height:800},false],['téléphone',{width:390,height:844},true]]){
  const {pg,log}=await page(browser,{dir:'com',origin,viewport:vp,hasTouch:tel,rpc,tables});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1500);
  const nav=await pg.evaluate(()=>document.getElementById('lvn-dn').getAttribute('aria-label'));
  ok(nav==='Ecosystems',nom+' · ↓ s\'appelle Ecosystems (plus Get Higher) → '+nav);
  if(!tel){
    /* la molette vers le bas du manche (deltaY < 0) : le papier tourne PAR PAS, puis s'arrête et REVIENT si on lâche tôt */
    await pg.mouse.move(640,400);
    for(let k=0;k<2;k++){ await pg.mouse.wheel(0,-40); await pg.waitForTimeout(30); }
    const a1=await angle(pg);
    await pg.waitForTimeout(900);
    const a2=await angle(pg), c0=await pg.evaluate(()=>window.__totehm_cherche().ouvert);
    ok(a1>15&&a1<90&&a2<1&&!c0,nom+' · la molette RETOURNE le TOTEHM sous le geste ('+a1.toFixed(0)+'°), lâché tôt il revient ('+a2.toFixed(0)+'°)');
    for(let k=0;k<6;k++){ await pg.mouse.wheel(0,-60); await pg.waitForTimeout(30); }
    ok(await ouvert(pg),nom+' · au bout du geste : le verso Ecosystems s\'ouvre');
  } else {
    /* le doigt vers le bas : le papier suit, puis le verso */
    const cdp=await pg.context().newCDPSession(pg);
    const tp=(type,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:195,y}]});
    await tp('touchStart',260);for(const y of [300,340,380]){ await tp('touchMove',y); await pg.waitForTimeout(30); }
    const a1=await angle(pg);
    for(const y of [440,500]){ await tp('touchMove',y); await pg.waitForTimeout(30); }
    await tp('touchEnd',500);
    ok(a1>40&&a1<150&&await ouvert(pg),nom+' · le doigt RETOURNE le TOTEHM en le suivant ('+a1.toFixed(0)+'°), puis le verso Ecosystems');
  }
  await pg.waitForTimeout(600);
  const ab=await pg.evaluate(()=>[...document.querySelectorAll('#mb-res [data-mb-abo]')].map(b=>b.textContent));
  ok(ab.join('|')==='gva',nom+' · sans nom tapé : mes écosystèmes (abonnements actifs seulement) → '+ab.join(' · '));
  await pg.click('#mb-res [data-mb-abo="gva"]');
  await pg.waitForFunction(()=>window.__totehm_cherche().etat==='abonne',null,{timeout:6000}).catch(()=>{});
  ok((await pg.evaluate(()=>window.__totehm_cherche().etat))==='abonne',nom+' · un tap sur un abonnement ouvre son écosystème');
  await pg.click('#srch-x');await pg.waitForTimeout(1500);
  await pg.keyboard.press('ArrowDown');
  ok(await ouvert(pg),nom+' · au clavier, ↓ retourne le TOTEHM sur Ecosystems d\'un coup');
  ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,nom+' · aucune erreur '+log.errors.join(' | '));
  await pg.context().close();
 }
}finally{await browser.close();}
