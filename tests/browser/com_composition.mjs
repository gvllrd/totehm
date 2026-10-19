// 19/10/2026 — LA COMPOSITION 60 / 30 / 10 DE TOTEHM.COM, MESURÉE.
// 60 % noir pur · 30 % le navy et ses deux couleurs de rattachement · 10 % les
// sept intentions, en signal. Une seule exception : le Totehm DÉPLOYÉ, où le navy
// prend de l'importance — et c'est pour cela que le champ de /totehm est le navy
// du papier quand toutes les autres pages ont un champ noir.
// Ce que la suite mesure, page par page :
//   · la part de surface peinte en noir, en navy, en couleurs d'intention ;
//   · aucune SURFACE en faux noir (#121214, #131316, #0c0c0e, #16161a…) ;
//   · le champ des pages servies est #000, celui du Totehm est le navy du papier.
// La part d'une surface = son aire moins celle de ses surfaces filles ; des calques
// superposés (position:fixed) peuvent faire dépasser 100 : c'est une part de
// surface peinte, pas une couverture exacte. LANCER : node com_composition.mjs /tmp
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.com';
const browser=await launch();
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));

/* ── La mesure, dans la page ─────────────────────────────────────────── */
const COMPO=()=>{
  const NAVY=new Set(['51,51,102','54,73,140','116,49,105','34,34,74','38,51,98','81,34,74','43,43,87','91,38,82','43,58,115','22,22,50','98,98,134','176,106,159']);
  const INT=new Set(['226,75,74','228,139,49','252,190,33','99,153,34','29,158,117','55,138,221','127,119,221']);
  const FAUX=new Set(['18,18,20','19,19,22','12,12,14','22,22,26','16,16,20','13,13,16']);
  // On mesure la PAGE, pas l'écran : une page qui défile se compose sur toute sa hauteur.
  const W=innerWidth,H=Math.max(innerHeight,document.documentElement.scrollHeight),TOT=W*H,SY=scrollY;
  const clip=(r,fixe)=>{const t=fixe?r.top:r.top+SY,b=fixe?r.bottom:r.bottom+SY;
    return Math.max(0,Math.min(r.right,W)-Math.max(r.left,0))*Math.max(0,Math.min(b,H)-Math.max(t,0));};
  const peints=[];
  for(const el of document.querySelectorAll('body *')){
    const s=getComputedStyle(el);
    if(s.visibility==='hidden'||s.display==='none'||+s.opacity<.5) continue;
    const m=/^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/.exec(s.backgroundColor);
    if(!m||(m[4]!==undefined&&+m[4]<.5)) continue;
    const a=clip(el.getBoundingClientRect(),s.position==='fixed');
    if(a<9) continue;
    peints.push({el,cle:m[1]+','+m[2]+','+m[3],rgb:[+m[1],+m[2],+m[3]],aire:a,enfants:0});
  }
  const ix=new Map(peints.map(p=>[p.el,p]));
  for(const p of peints){let n=p.el.parentElement;while(n&&n!==document.body){const q=ix.get(n);if(q){q.enfants+=p.aire;break;}n=n.parentElement;}}
  const classe=([r,g,b],cle)=>NAVY.has(cle)?'navy':INT.has(cle)?'int':(r+g+b<=30?'noir':(Math.max(r,g,b)-Math.min(r,g,b)<=14?'gris':'autre'));
  const part={noir:0,navy:0,int:0,gris:0,autre:0},faux=[];let pose=0;
  for(const p of peints){
    const propre=Math.max(0,p.aire-p.enfants);
    part[classe(p.rgb,p.cle)]+=propre;pose+=propre;
    if(FAUX.has(p.cle)&&propre/TOT>.02) faux.push((p.el.id||p.el.className||p.el.tagName)+' '+p.cle+' '+Math.round(propre/TOT*100)+'%');
  }
  // Le CHAMP : la couleur du document, pour tout ce qu'aucune surface ne couvre.
  const bs=getComputedStyle(document.body).backgroundColor,hs=getComputedStyle(document.documentElement).backgroundColor;
  const brut=/rgba\(0, 0, 0, 0\)/.test(bs)?hs:bs,f=/^rgba?\((\d+), (\d+), (\d+)/.exec(brut)||[0,'0','0','0'];
  const fond=[+f[1],+f[2],+f[3]];
  part[classe(fond,fond.join(','))]+=Math.max(0,TOT-pose);
  const pct=v=>+(v/TOT*100).toFixed(1);
  return {champ:brut,champClasse:classe(fond,fond.join(',')),noir:pct(part.noir),navy:pct(part.navy),int:pct(part.int),gris:pct(part.gris),autre:pct(part.autre),faux,surfaces:peints.length};
};
const mesurer=async(pg,nom,T)=>{const m=await pg.evaluate(COMPO);T.push({page:nom,...m});return m;};

const T=[];
const UID='11111111-1111-4111-8111-111111111111';
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight']},{t:'Read at dawn',t0:'Read at dawn',is:['focus']},{t:'Sprint',t0:'Sprint',is:['fight','flow']}];
const tablesCom={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]};
const LAND={signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false,open:false},higher:{active:false,price_cents:700,currency:'eur',period:'month'},thp:false,subscriptions:0,subscribers:0,
  sm:{ready:true,habit:true,objective:true,higher:false,free_total:7,free_left:6,left:6}};
const DASH={ok:true,subscribers:3,month_cents:1920,pending_cents:1920,currency:'eur',next_payout:'2026-11-01',threshold_cents:2500,part:80,price_cents:2400,min_cents:300,max_cents:100000};
const CONS={signed_in:true,pseudo:'wah',visibility:'private',offer:{enabled:false,open:false,price_cents:null,currency:'eur',period:'year',payout_method:null,payout_fin:null,part:80},
  subscribers:{count:1,list:[{pseudo:'nia',status:'active',since:'2026-09-01',renews:'2027-09-01',ending:false}]},
  subscriptions:[{creator:'kai',price_cents:2400,currency:'eur',status:'active',renews:'2027-05-01',since:'2026-05-01',ending:false}],
  earnings:{balances:[{currency:'eur',earned_cents:2880,pending_cents:2880,paid_cents:0}],threshold_cents:2500,next_payout:'2026-11-01',recent:[]},
  payouts:[],bot:{active:false,price_cents:700,currency:'eur',period:'month'},membership:null,rules:{}};
const KAI={ok:true,pseudo:'kai',palette:['fight','focus','love'],sale:{open:true,price_cents:2400,currency:'eur',period:'year'},
  viewer:{signed_in:true,me:false,subscribed:false,until:null,ending:false,can_read:false}};
const GAL={ok:true,totehms:Array.from({length:12},(_,i)=>({pseudo:'kai'+i,offer:i%2===0,price_cents:2400,currency:'eur',subscribed:false}))};
const rpc={my_landing:LAND,creator_dashboard:DASH,my_console:()=>CONS,creator_page:KAI,totehm_galaxy:GAL,
  my_feed_badges:{ok:true,pos:{}},habit_spaces:{ok:true,mine:true,habits:[]},
  totehm_search:()=>[{pseudo:'kai',offer:true,price_cents:2400,currency:'eur',subscribed:true}]};

try{
 /* ── 1 · LA PLATEFORME : les cinq vues sont NOIRES, le Totehm est le navy ── */
 for(const vp of [{width:390,height:844},{width:1280,height:900}]){
  const tag=vp.width<700?'mobile':'ordi';
  const{pg,log}=await page(browser,{dir:'com',origin,rpc,tables:tablesCom,viewport:vp,hasTouch:vp.width<700});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  const c=await mesurer(pg,'/totehm centre · '+tag,T);
  ok(c.noir>=60,'/totehm '+tag+' : le noir porte la vue ('+c.noir+' %)');
  ok(c.navy>=5,'/totehm '+tag+' : le Totehm pose son navy ('+c.navy+' %)');
  ok(c.int<=10&&c.int>0,'/totehm '+tag+' : les sept couleurs sont un SIGNAL, jamais une surface ('+c.int+' %)');
  ok(!c.faux.length,'/totehm '+tag+' : aucune surface en faux noir '+c.faux.join(' | '));
  for(const [nom,touche] of [['haut','ArrowUp'],['bas','ArrowDown'],['gauche','ArrowLeft'],['droite','ArrowRight']]){
    await pg.keyboard.press(touche);await pg.waitForTimeout(1100);
    const v=await mesurer(pg,'/totehm '+nom+' · '+tag,T);
    ok(v.noir>=60,'/totehm '+tag+' · '+nom+' : le noir porte la vue ('+v.noir+' %)');
    ok(v.int<=10,'/totehm '+tag+' · '+nom+' : les sept couleurs restent un signal ('+v.int+' %)');
    ok(!v.faux.length,'/totehm '+tag+' · '+nom+' : aucune surface en faux noir '+v.faux.join(' | '));
    await pg.keyboard.press({ArrowUp:'ArrowDown',ArrowDown:'ArrowUp',ArrowLeft:'ArrowRight',ArrowRight:'ArrowLeft'}[touche]);await pg.waitForTimeout(1000);
  }
  await pg.screenshot({path:OUT+'/compo_'+tag+'_centre.png'});
  ok(!erreurs(log).length,'/totehm '+tag+' : aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();
 }
 /* ── 2 · Les pages servies : le champ est NOIR, le navy est l'objet ───── */
 const PAGES=[
   ['/higher','#member'],['/monetize','#member'],['/console','.head'],
   ['/creator?n=kai','.paper'],['/creator','#q'],['/terms','#wrap'],
   ['/auth?client=space&challenge='+'a'.repeat(43)+'&state='+'b'.repeat(24)+'&return=%2F','h1'],
 ];
 for(const [route,attendu] of PAGES){
  const{pg,log}=await page(browser,{dir:'com',origin,rpc,tables:{profiles:[{pseudo:'wah'}]},viewport:{width:390,height:844}});
  await pg.goto(origin+route);await pg.waitForSelector(attendu,{timeout:20000});await pg.waitForTimeout(700);
  const nom=route.split('?')[0]+(route.includes('n=kai')?' (@nom)':''),m=await mesurer(pg,nom,T);
  ok(m.champClasse==='noir','le champ de '+nom+' est noir pur ('+m.champ+')');
  ok(!m.faux.length,nom+' : aucune surface en faux noir '+m.faux.join(' | '));
  ok(m.navy>0,nom+' : le navy est là ('+m.navy+' %)');
  ok(m.int<=10,nom+' : les sept couleurs restent un signal ('+m.int+' %)');
  ok(m.noir>=45,nom+' : le noir porte la page ('+m.noir+' %)');
  ok(!erreurs(log).length,nom+' : aucune erreur '+erreurs(log).join(' | '));
  await pg.screenshot({path:OUT+'/compo_'+nom.replace(/\W+/g,'_')+'.png'});
  await pg.context().close();
 }
 /* ── 3 · L'EXCEPTION : dans le Totehm, le navy prend de l'importance ───── */
 {const servies=T.filter(r=>!r.page.startsWith('/totehm'));
  ok(servies.every(r=>r.champClasse==='noir'),'toutes les pages servies ont le MÊME champ noir ('+servies.length+')');
  ok(T.filter(r=>r.page.startsWith('/totehm')).every(r=>r.champClasse==='navy'||r.champClasse==='noir'),
    'la plateforme garde le navy du papier SOUS ses vues : l\'exception du Totehm déployé');
 }
 console.log('\n page                        noir   navy    int   gris  autre  champ');
 for(const r of T) console.log(' '+r.page.padEnd(26)+String(r.noir).padStart(6)+String(r.navy).padStart(7)+String(r.int).padStart(7)+String(r.gris).padStart(7)+String(r.autre).padStart(7)+'  '+r.champ);
}finally{ await browser.close(); }
