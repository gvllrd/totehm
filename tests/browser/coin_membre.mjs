// 10/11/2026 — LE COIN MEMBRE, LE MÊME PARTOUT (Wah : « [CONNECT WITH MY TOTEHM] en format bouton normal sur TOUTES
// les plateformes (PAS EN CORAL) ; connecté, le nom de l'utilisateur en coral accompagné de son Totehm bleu navy verso »)
// et « Simple terms of use » tout en bas, effacé par une vue qui défile. Le bloc vient de tools/member_corner.{css,js},
// copié tel quel : ce test refuse une copie qui a dérivé.
// LANCER : node coin_membre.mjs
import {launch,page,ok} from './harness.mjs';
import fs from 'node:fs';
const ROOT=new URL('../../',import.meta.url).pathname;
const C={com:'https://www.totehm.com',club:'https://www.figher.club',space:'https://www.totehm.space',boutique:'https://www.higher.boutique'};
const PAGES=[['com','/console','console.html'],['com','/creator','creator.html'],['com','/higher','higher.html'],['com','/monetize','monetize.html'],
  ['club','/','index.html'],['club','/create','create.html'],['space','/','index.html'],['space','/market','market.html'],['space','/social?v=home','social.html'],
  ['boutique','/','index.html'],['boutique','/luxury','luxury.html']];
const CORAL='rgb(251, 213, 202)';
const rpc=n=>({my_landing:{signed_in:true,pseudo:n,visibility:'private',offer:{enabled:false},higher:{active:false},thp:false,subscriptions:0,subscribers:0},
  my_console:{ok:true,pseudo:n}, sso_epoch:0, club_spots:{ok:true,items:[],total:0}});
const mesure=pg=>pg.evaluate(()=>{ const e=document.querySelector('.mc'); if(!e) return null; const r=e.getBoundingClientRect(), s=getComputedStyle(e);
  return {w:r.width,h:r.height,vis:r.width>0&&s.visibility!=='hidden'&&s.display!=='none',bg:s.backgroundColor,bgi:s.backgroundImage,rad:s.borderTopLeftRadius,
    color:s.color,font:s.fontFamily,fs:parseFloat(s.fontSize),tient:e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1,txt:e.textContent.trim()}; });
const css=fs.readFileSync(ROOT+'tools/member_corner.css','utf8').trim(), js=fs.readFileSync(ROOT+'tools/member_corner.js','utf8').trim();
for(const [d,,f] of PAGES){ const s=fs.readFileSync(ROOT+d+'/'+f,'utf8');
  ok(s.includes(css)&&s.includes(js),d+'/'+f+' · le bloc du coin membre est la copie exacte de tools/'); }
const browser=await launch();
try{
  for(const [d,p] of PAGES){
    const ici=d+p.replace(/\?.*/,'');
    { const {pg,ctx,log}=await page(browser,{dir:d,origin:C[d],session:false,rpc:rpc('wahigher')});
      await pg.goto(C[d]+p,{waitUntil:'domcontentloaded'}); await pg.waitForTimeout(1800);
      const m=await mesure(pg);
      ok(m&&m.bg==='rgb(37, 37, 41)'&&m.rad==='10px'&&m.color!==CORAL&&/Space Mono/.test(m.font)&&/CONNECT WITH MY TOTEHM/.test(m.txt),
        ici+' · déconnecté : CONNECT WITH MY TOTEHM en bouton normal, gris, jamais coral ('+(m&&m.bg)+', '+(m&&m.color)+')');
      ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,ici+' · aucune erreur (déconnecté)');
      await ctx.close(); }
    { const {pg,ctx,log}=await page(browser,{dir:d,origin:C[d],rpc:rpc('wahigher'),tables:{profiles:[{pseudo:'wahigher'}]}});
      await pg.goto(C[d]+p,{waitUntil:'domcontentloaded'}); await pg.waitForTimeout(2200);
      const m=await mesure(pg);
      ok(m&&/svg/.test(m.bgi)&&m.color===CORAL&&/Quantico/.test(m.font)&&Math.abs(m.w-m.h)<1&&m.w>=56,
        ici+' · connecté : le nom en Quantico coral sur son papier navy perforé, carré ('+(m&&Math.round(m.w))+'×'+(m&&Math.round(m.h))+')');
      ok(m&&m.tient,ici+' · « '+(m&&m.txt)+' » tient sur le papier ('+(m&&m.fs)+' px)');
      ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,ici+' · aucune erreur (connecté)');
      await ctx.close(); }
  }
  // Un nom très long RÉTRÉCIT, le papier non.
  for(const [d,p] of [['club','/'],['space','/']]){
    const {pg,ctx}=await page(browser,{dir:d,origin:C[d],rpc:rpc('thehigherversionofmyself'),tables:{profiles:[{pseudo:'thehigherversionofmyself'}]}});
    await pg.goto(C[d]+p,{waitUntil:'domcontentloaded'}); await pg.waitForTimeout(2200);
    const m=await mesure(pg);
    ok(m&&m.tient&&m.fs>=6&&Math.abs(m.w-m.h)<1,d+p+' · un nom de 24 lettres rétrécit ('+(m&&m.fs)+' px), le papier reste carré ('+(m&&Math.round(m.w))+'×'+(m&&Math.round(m.h))+')');
    await ctx.close();
  }
  // « Simple terms of use » : tout en bas ; une vue qui défile l'efface.
  { const {pg,ctx}=await page(browser,{dir:'club',origin:C.club,session:false});
    await pg.goto(C.club+'/',{waitUntil:'domcontentloaded'}); await pg.waitForTimeout(1500);
    const bas=()=>pg.$eval('#terms',e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {bas:innerHeight-r.bottom,vis:s.visibility==='visible'&&+s.opacity>0};});
    const a=await bas();
    ok(a.vis&&a.bas>=0&&a.bas<=30,'figher.club · RADAR : « Simple terms of use » tout en bas ('+Math.round(a.bas)+' px du bord)');
    await pg.click('#rdr-mode [data-rmode="grid"]'); await pg.waitForTimeout(500);
    const b=await bas(); ok(!b.vis,'figher.club · GRID (elle défile) : les conditions s\'effacent');
    const t=await pg.$eval('#member',e=>e.getBoundingClientRect().top); ok(t<40,'figher.club · CONNECT WITH MY TOTEHM reste en haut à gauche');
    await ctx.close(); }
  { const {pg,ctx}=await page(browser,{dir:'space',origin:C.space,session:false});
    await pg.goto(C.space+'/',{waitUntil:'domcontentloaded'}); await pg.waitForTimeout(1500);
    const r=await pg.$eval('.mc-terms',e=>{const r=e.getBoundingClientRect();return {bas:innerHeight-r.bottom,g:r.left};});
    ok(r.bas>=0&&r.bas<=30&&r.g<40,'totehm.space · accueil : « Simple terms of use » en bas à gauche ('+Math.round(r.bas)+' px du bord)');
    await ctx.close(); }
  { const {pg,ctx}=await page(browser,{dir:'boutique',origin:C.boutique,session:false});
    await pg.goto(C.boutique+'/',{waitUntil:'domcontentloaded'}); await pg.waitForTimeout(1500);
    const r=await pg.$eval('.mc-terms',e=>{const s=e.closest('section'),a=e.getBoundingClientRect(),b=s.getBoundingClientRect();
      return {id:s.id,bas:b.bottom-a.bottom,ecran:a.top<innerHeight};});
    ok(r.id==='context'&&r.bas>=0&&r.bas<=30&&!r.ecran,'higher.boutique · « Simple terms of use » au bas du DERNIER écran, pas sur le premier ('+Math.round(r.bas)+' px)');
    await ctx.close(); }
}finally{await browser.close();}
