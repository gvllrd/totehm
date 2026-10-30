// 29/10/2026 — LE NOM SUR UNE LIGNE, ET LE ZOOM CALÉ SUR LUI (Wah : « quand on retourne le Totehm, il doit y avoir inscrit
// le nom du totehm sur une ligne, de façon à ce que le déploiement se fasse dans des proportions adéquates dans l'animation
// zoom qui mène au dashboard »). Au dos du papier : le nom, UNE ligne, Coral (BRAND), rapetissé s'il est long. Au premier
// instant du zoom, le nom déplié recouvre celui du papier (même centre, même largeur), puis il grandit sans jamais
// rapetisser ni sauter, jusqu'à UNE ligne en haut du verso. Téléphone et ordinateur, un nom court et un nom long.
// Tout est simulé : aucune écriture en production. LANCER : node com_verso_nom.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const browser=await launch();const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
try{
 for(const NOM of ['wah','wahigher_the_great_one']){
  for(const [nom,vp] of [['téléphone',{width:390,height:844}],['ordinateur',{width:1280,height:800}]]){
   const{pg,log}=await page(browser,{dir:'com',origin,viewport:vp,hasTouch:nom==='téléphone',
     tables:{profiles:[{pseudo:NOM}],totehms:[{user_id:UID,steps:[{t:'Run',t0:'Run',is:['fight']}],vis:'private'}]},
     rpc:{my_landing:{signed_in:true,pseudo:NOM},my_trips:{signed_in:true,trips:[],reps:[],wisdom:[],visions:[]}}});
   await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1400);
   await pg.evaluate(()=>{ window.__z=[]; const t0=performance.now(), R=e=>{const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2,r.width,r.height];};
     const f=n=>{ const s=document.getElementById('srch'); if(s.classList.contains('is-show'))
       window.__z.push({ms:n-t0,self:R(document.getElementById('self-name')),ast:R(document.getElementById('ast-name'))}); if(n-t0<3500) requestAnimationFrame(f); }; requestAnimationFrame(f); });
   await pg.click('#lv-tap-turn'); await pg.waitForTimeout(3000);
   const z=await pg.evaluate(()=>window.__z), a=z[0];
   const dos=await pg.evaluate(()=>{const e=document.getElementById('ast-name'),cs=getComputedStyle(e),s=document.getElementById('self-name');
     return {txt:e.textContent,h:e.getBoundingClientRect().height,lh:parseFloat(cs.fontSize)*1.3,col:cs.color,
       self:{h:s.getBoundingClientRect().height,fs:parseFloat(getComputedStyle(s).fontSize),sw:s.scrollWidth,cw:s.clientWidth,col:getComputedStyle(s).color}};});
   ok(dos.txt===NOM&&dos.h<dos.lh*1.5&&dos.col==='rgb(251, 213, 202)',nom+' · « '+NOM+' » : au dos du papier, UNE ligne, en Coral → '+JSON.stringify({h:Math.round(dos.h),fs:+(dos.lh/1.3).toFixed(1),col:dos.col}));
   ok(dos.self.h<dos.self.fs*1.5&&dos.self.sw<=dos.self.cw+1&&dos.self.col==='rgb(251, 213, 202)',nom+' · « '+NOM+' » : déplié, UNE ligne entière (sans ellipse), en Coral → '+JSON.stringify(dos.self));
   const ecart=a?Math.max(Math.abs(a.self[0]-a.ast[0]),Math.abs(a.self[1]-a.ast[1])):99, rap=a?a.self[2]/a.ast[2]:0;
   ok(a&&ecart<1.5&&Math.abs(rap-1)<.03,nom+' · « '+NOM+' » : 1re image du zoom, le nom déplié RECOUVRE celui du papier (écart '+ecart.toFixed(1)+' px, largeur ×'+rap.toFixed(3)+')');
   const w=z.map(x=>x.self[2]), monte=w.every((v,i)=>!i||v>=w[i-1]-.5), saut=Math.max(...w.slice(1).map((v,i)=>v-w[i]));
   ok(z.length>10&&monte&&w[w.length-1]>w[0]*1.8&&saut<w[w.length-1]*.25,nom+' · « '+NOM+' » : il grandit sans rapetisser ni sauter, '+Math.round(w[0])+' → '+Math.round(w[w.length-1])+' px (plus grand pas '+Math.round(saut)+' px)');
   ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,nom+' · aucune erreur');
   await pg.context().close();
  }
 }
}finally{await browser.close();}
