// 10/11/2026 — LE REPLI DU TOTEHM DÉPLOYÉ RESTE FLUIDE AU TÉLÉPHONE (Wah : « quand on appuie sur la croix pour fermer le
// totehm déplié, l'animation n'est PAS DU TOUT fluide »). Mesuré avant le correctif (390 px, écran ×3, processeur ÷4) :
// 43,9 images/s, 7 images > 50 ms, 855 à 1 087 ms de raster — la couleur du papier agrandi ×14 (`fill`) le faisait retracer
// à chaque image. Après : la couleur passe par l'opacité de `#gl-paint`, les décors invisibles ne s'animent plus.
// Les seuils sont larges (une machine partagée varie) mais séparent nettement l'avant de l'après.
// LANCER : node com_repli_fluide.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const UID='11111111-1111-4111-8111-111111111111';
const STEPS=Array.from({length:8},(_,i)=>({t:'Habit '+(i+1),t0:'Habit '+(i+1),is:[['fight'],['flow'],['focus','love'],['express'],['enrich'],['celebrate'],['love'],['fight','flow']][i],f:'every_morning'}));
const RPC={my_landing:{signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false},higher:{active:false},thp:false,subscriptions:0,subscribers:0},
  my_trips:{signed_in:true,trips:[{id:'o1',text:'Objective',is:['express'],hs:['Habit 1']}],reps:[{id:'r1',text:'Repulsion',is:['focus'],hs:['Habit 1']}],wisdom:[],visions:[]},
  element_media_list:{ok:true,items:[]}, habit_spaces:{ok:true,mine:true,habits:[]}, element_cloths:{ok:true,mine:true,elements:[]},
  my_visions:{ok:true,visions:[]}, my_feed_badges:{ok:true,pos:{}}, club_spots_of:b=>({ok:true,period:b.p_period,items:[],total:0})};
const browser=await launch();
try{
  const {pg,log}=await page(browser,{dir:'com',origin:'https://www.totehm.com',viewport:{width:390,height:844},hasTouch:true,deviceScaleFactor:3,rpc:RPC,
    tables:{profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]}});
  const cdp=await pg.context().newCDPSession(pg);
  await pg.goto('https://www.totehm.com/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1500);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await pg.click('#lv-tap-open');
  await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:12000}).catch(()=>{});
  await pg.waitForTimeout(2500);
  const ev=[]; cdp.on('Tracing.dataCollected',d=>ev.push(...d.value));
  const fini=new Promise(r=>cdp.once('Tracing.tracingComplete',r));
  await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline',transferMode:'ReportEvents'});
  await pg.evaluate(()=>{ window.__img=[]; let t0=0; const f=t=>{ window.__img.push(t); if(!t0) t0=t; if(t-t0<1300) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const xy=await pg.$eval('#fold-x',e=>{const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];});
  await pg.touchscreen.tap(xy[0],xy[1]);
  await pg.waitForTimeout(1500);
  await cdp.send('Tracing.end'); await fini;
  const img=await pg.evaluate(()=>window.__img), g=img.slice(1).map((t,i)=>t-img[i]), dur=img[img.length-1]-img[0];
  const fps=img.length/(dur/1000), max=Math.max(...g), lents=g.filter(x=>x>50).length;
  const raster=ev.filter(e=>e.name==='RasterTask'&&e.dur).reduce((a,e)=>a+e.dur/1000,0);
  const main=new Set(ev.filter(e=>e.name==='thread_name'&&e.args&&e.args.name==='CrRendererMain').map(e=>e.pid+':'+e.tid));
  const peint=ev.filter(e=>e.name==='Paint'&&main.has(e.pid+':'+e.tid)).length;
  ok(fps>=50&&lents<=2,'téléphone (÷4) · le repli tient la cadence : '+fps.toFixed(1)+' images/s, '+lents+' images > 50 ms, pire '+Math.round(max)+' ms (avant : 43,9 · 7)');
  ok(raster<=450,'téléphone (÷4) · le papier géant n\'est plus retracé : '+Math.round(raster)+' ms de raster (avant : 855 à 1 087)');
  ok(peint<=100,'téléphone (÷4) · '+peint+' peintures pendant le repli (avant : 130)');
  ok(await pg.evaluate(()=>document.body.classList.contains('gate')&&!document.body.classList.contains('folding')),'le repli se termine : l\'atterrissage est rendu');
  ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,'aucune erreur');
}finally{await browser.close();}
