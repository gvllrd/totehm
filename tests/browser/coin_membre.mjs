// 12/11/2026 — LE COIN MEMBRE, LE MÊME PARTOUT (Wah : « [CONNECT WITH MY TOTEHM] en format bouton normal sur TOUTES
// les plateformes (PAS EN CORAL) ; connecté, le nom de l'utilisateur en coral accompagné de son Totehm bleu navy verso »,
// puis « ce totehm recto-verso EN UNE PIÈCE QUI TOURNE, le verso portant les lettres du pseudo sur tout le carré »)
// et « Simple terms of use » tout en bas, effacé par une vue qui défile. Le bloc vient de tools/member_corner.{css,js},
// copié tel quel : ce test refuse une copie qui a dérivé.
// LANCER : node coin_membre.mjs
import {launch,page,ok} from './harness.mjs';
import fs from 'node:fs';
const ROOT=new URL('../../',import.meta.url).pathname;
const C={com:'https://www.totehm.com',club:'https://www.figher.club',space:'https://www.totehm.space',boutique:'https://www.higher.boutique'};
/* `com/higher.html` n'est plus une page : elle redirige vers /chatgpt, et n'a plus de coin membre. */
const PAGES=[['com','/console','console.html'],['com','/creator','creator.html'],['com','/monetize','monetize.html'],
  ['club','/','index.html'],['club','/create','create.html'],['space','/','index.html'],['space','/market','market.html'],['space','/social?v=home','social.html'],
  ['boutique','/','index.html'],['boutique','/luxury','luxury.html']];
const CORAL='rgb(251, 213, 202)';
const rpc=n=>({my_landing:{signed_in:true,pseudo:n,visibility:'private',offer:{enabled:false},higher:{active:false},thp:false,subscriptions:0,subscribers:0},
  my_console:{ok:true,pseudo:n}, sso_epoch:0, club_spots:{ok:true,items:[],total:0}});
const mesure=pg=>pg.evaluate(()=>{ const e=document.querySelector('.mc'); if(!e) return null;
  const r=e.getBoundingClientRect(), s=getComputedStyle(e);
  const card=e.querySelector('.mcp'), rec=e.querySelector('.mcp-r'), ver=e.querySelector('.mcp-b');
  const lts=[...e.querySelectorAll('.tn-l')];
  let dehors=0, px=0;
  for(const l of lts){ const b=l.getBoundingClientRect(); px=Math.max(px,b.height);
    if(b.left<r.left-.5||b.right>r.right+.5||b.top<r.top-.5||b.bottom>r.bottom+.5) dehors++; }
  const txt=(e.querySelector('#member-txt')||{}).textContent
    ?? [...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join('');
  return {w:r.width,h:r.height,vis:r.width>0&&s.visibility!=='hidden'&&s.display!=='none',bg:s.backgroundColor,
    rad:s.borderTopLeftRadius,color:s.color,font:s.fontFamily,fs:parseFloat(s.fontSize),txt:(txt||'').trim(),
    piece:!!card, tr:card?card.style.transform:'', faces:e.querySelectorAll('.mcp-f').length,
    recto:rec?getComputedStyle(rec).backgroundImage:'', verso:ver?getComputedStyle(ver).backgroundImage:'',
    lettres:lts.length, lcolor:lts[0]?getComputedStyle(lts[0]).color:'', lfont:lts[0]?getComputedStyle(lts[0]).fontFamily:'',
    px:+px.toFixed(1), dehors}; });
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
      ok(m&&m.piece&&m.faces===2&&/svg/.test(m.recto)&&/svg/.test(m.verso)&&Math.abs(m.w-m.h)<1&&m.w>=56,
        ici+' · connecté : LE TOTEHM, une seule pièce à deux faces, carrée ('+(m&&Math.round(m.w))+'×'+(m&&Math.round(m.h))+')');
      ok(m&&m.lettres===[...(m.txt||'')].length&&m.lcolor===CORAL&&/Quantico/.test(m.lfont)&&!m.dehors,
        ici+' · « '+(m&&m.txt)+' » prend le carré du verso en Quantico coral, aucune lettre dehors ('+(m&&m.px)+' px)');
      { const a=await pg.evaluate(()=>(document.querySelector('.mcp')||{style:{}}).style.transform);
        await pg.waitForTimeout(260);
        const b=await pg.evaluate(()=>(document.querySelector('.mcp')||{style:{}}).style.transform);
        ok(a&&b&&a!==b,ici+' · la pièce TOURNE ('+a+' → '+b+')'); }
      ok(!log.errors.filter(e=>e.startsWith('pageerror')).length,ici+' · aucune erreur (connecté)');
      await ctx.close(); }
  }
  // LA NOMENCLATURE : un nom long prend le carré au lieu de rapetisser. Sur une ligne, 24 lettres tombaient
  // à 4,1 px sur ce papier de 58 ; en grille 5 × 5 elles gardent ~9 px — c'est tout l'objet du lot.
  for(const [d,p] of [['club','/'],['space','/']]){
    const {pg,ctx}=await page(browser,{dir:d,origin:C[d],rpc:rpc('thehigherversionofmyself'),tables:{profiles:[{pseudo:'thehigherversionofmyself'}]}});
    await pg.goto(C[d]+p,{waitUntil:'domcontentloaded'}); await pg.waitForTimeout(2200);
    const m=await mesure(pg);
    ok(m&&m.lettres===24&&!m.dehors&&m.px>=8&&Math.abs(m.w-m.h)<1,
      d+p+' · 24 lettres tiennent dans le carré à '+(m&&m.px)+' px (>= 8), le papier reste carré ('+(m&&Math.round(m.w))+'×'+(m&&Math.round(m.h))+')');
    const plan=await pg.evaluate(()=>window.TOTEHM_NOM.plan('thehigherversionofmyself'));
    ok(plan&&plan.C===5&&plan.R===5,d+p+' · la nomenclature pose 24 lettres en 5 × 5 ('+(plan&&plan.C)+' × '+(plan&&plan.R)+')');
    await ctx.close();
  }
  // La règle, aux bornes : sous 6 lettres une ligne (en grille elles seraient PLUS PETITES), 4 colonnes jusqu'à 16, 5 au-delà.
  { const {pg,ctx}=await page(browser,{dir:'club',origin:C.club,rpc:rpc('wah'),tables:{profiles:[{pseudo:'wah'}]}});
    await pg.goto(C.club+'/',{waitUntil:'domcontentloaded'}); await pg.waitForTimeout(1800);
    const r=await pg.evaluate(()=>['wah','wahvv','higher','seizelettresicibon','thehigherversionofmyselfetencoreplus']
      .map(n=>{const p=window.TOTEHM_NOM.plan(n);return [p.N,p.C,p.R];}));
    ok(JSON.stringify(r)===JSON.stringify([[3,3,1],[5,5,1],[6,4,2],[18,5,4],[25,5,5]]),
      'la nomenclature : 1-5 une ligne · 6-16 en 4 colonnes · 17-25 en 5 · au-delà 25 lettres + · ('+JSON.stringify(r)+')');
    await ctx.close(); }
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
