// COM · 15/10/2026, mis à jour le 16/10 bis — LE PROCESSEUR : CINQ vues, quatre voisins, sans manette
// (↑ Get Higher · ← My shorts · My TOTEHM · My spots → · ↓ My Reflection). L'horizontale est revenue avec mes
// shorts et mes spots (16/10 bis, détail dans com_shorts.mjs) ; elle s'éteint dans la galaxie. CENTRE : le papier dans son socle, les ramifications de mes intentions (les 7
// couleurs) ; Mine · Others (la galaxie des TOTEHMs, la recherche, l'univers /@nom, le retour). HAUT : la bouche du
// 12/10, le papier sur la langue, « Get [Higher] » l'avale → higher.boutique/get_higher?from=com. BAS : la condensation
// (seul #gl-bg tourne), le profil, la Reflection en trois étages (citations vérifiées, proposition ≠ Habit).
// Le verso = mes réglages : com_paper.mjs. Les shorts et la capture : com_shorts.mjs. Tout est simulé.
// LANCER : node com_processeur.mjs /tmp
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const STEPS=[{t:'Run the hill',t0:'Run the hill',is:['fight']},{t:'Read at dawn',t0:'Read at dawn',is:['focus']},{t:'Sprint',t0:'Sprint',is:['fight','flow']}];
const tables={profiles:[{pseudo:'wahigher'}],totehms:[{user_id:UID,steps:STEPS,vis:'private'}]};
const LAND=(o={})=>({signed_in:true,pseudo:'wahigher',visibility:'private',offer:{enabled:false,open:false},
  higher:{active:false,price_cents:700,currency:'eur',period:'month'},thp:false,subscriptions:0,subscribers:0,
  sm:{ready:true,habit:true,objective:true,higher:false,free_total:7,free_left:6,left:6},...o});
const GAL={ok:true,totehms:Array.from({length:12},(_,i)=>({pseudo:'kai'+i,offer:i%2===0,price_cents:2400,currency:'eur',subscribed:false}))};
/* 18/10 — le Totehm d'un autre, lu SUR PLACE depuis la galaxie (`totehm_of`). */
const AUTRE={ok:true,pseudo:'kai3',steps:[{t:'Swim at dawn',i:'flow',is:['flow']},{t:'Write it down',i:'express',is:['express']}],
  trips:[],objs:{},reps:[],wisdom:[],visions:[]};
const COULEURS=['#E24B4A','#e48b31','#fcbe21','#639922','#1D9E75','#378ADD','#7F77DD'];
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const lv=pg=>pg.evaluate(()=>window.__totehm_lv());
const R=(pg,sel)=>pg.$eval(sel,e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2};});
const ouvre=async pg=>{await pg.evaluate(()=>{window.__ouvert=[];window.open=(u)=>{window.__ouvert.push(u);return null;};});};
const vers=(pg,v)=>pg.waitForFunction(v=>{const d=window.__totehm_lv();return d.vue===v&&!d.bouge;},v,{timeout:6000}).catch(()=>{});
const calme=pg=>pg.waitForFunction(()=>!window.__totehm_lv().bouge,null,{timeout:6000}).catch(()=>{});
const browser=await launch();
try{
 // ── 1 · LE CENTRE : le processeur dans son socle, sept ramifications, Mine · Others ; ni manette, ni côtés ──
 for(const [vp,tel] of [[{width:390,height:844},true],[{width:1280,height:800},false]]){
  const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:vp,hasTouch:tel,rpc:{my_landing:LAND()}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1400);
  const c=await pg.evaluate(()=>{const q=s=>document.querySelector(s);
    const sk=q('#lv-socket').getBoundingClientRect(),pa=q('#gate-asteroid').getBoundingClientRect(),d=window.__totehm_lv();
    const flou=[...document.querySelectorAll('#lv-proc,#lv-proc *,#gx-c')].some(e=>{const cs=getComputedStyle(e);return /blur/.test(cs.filter+' '+(cs.backdropFilter||''));});
    return {vue:d.vue,mode:d.mode,dans:Math.abs((sk.x+sk.width/2)-(pa.x+pa.width/2))<1.5&&Math.abs((sk.y+sk.height/2)-(pa.y+pa.height/2))<1.5&&sk.width>pa.width*1.2,
      pistes:[...document.querySelectorAll('#lv-ram path:not(.puls):not(.sk)')].map(p=>p.getAttribute('stroke')),noeuds:document.querySelectorAll('#lv-ram rect').length,
      pales:document.querySelectorAll('#lv-ram g.r-0').length,ramOp:getComputedStyle(q('#lv-ram')).opacity,flou,
      plein:(()=>{const r=q('#lv-ram').getBoundingClientRect();return Math.round(r.width)===innerWidth&&Math.round(r.height)>=innerHeight-2;})(),
      puls:[...document.querySelectorAll('#lv-ram .puls')].map(e=>getComputedStyle(e).animationName+'/'+getComputedStyle(e).animationDuration),
      veille:document.querySelectorAll('#lv-ram .puls.veille').length,
      creuxOp:(()=>{const g=q('#lv-ram g.r-0');return g?getComputedStyle(g).opacity:'';})(),
      partis:['ljoy','ljoy-say','lv-take','fish','lv-earth','lv-visions','lv-mine','lv-find','vmode'].filter(i=>document.getElementById(i)),
      up:q('#lvn-up').getAttribute('aria-label'),dn:q('#lvn-dn').getAttribute('aria-label'),
      lf:q('#lvn-lf').getAttribute('aria-label'),rt:q('#lvn-rt').getAttribute('aria-label'),
      cotes:['lv-g','lv-d'].filter(i=>document.getElementById(i)).length,
      mine:q('#lv-m-mine').getAttribute('aria-checked'),others:q('#lv-m-others').getAttribute('aria-checked'),
      /* 18/10 : le nom a quitté l'atterrissage — il ne vit QUE sur la face verso du papier (Wah). */
      sigAbs:!q('#ast-sig'),connAbs:!q('#conn-bar'),
      tap:q('#lv-tap').textContent,bouche:getComputedStyle(q('#gate-mouth')).opacity};});
  ok(c.vue==='c'&&c.mode==='mine'&&c.dans,(tel?'téléphone':'ordinateur')+' · centre, Mine : le papier posé DANS son socle');
  ok(JSON.stringify(c.pistes)===JSON.stringify(COULEURS)&&c.noeuds>=7&&c.pales===4&&c.ramOp==='1'&&c.plein,'le réseau PLEIN ÉCRAN : sept pistes aux 7 couleurs exactes, les nœuds = MES Habits, les quatre intentions vides en creux');
  /* 18/10 — LES SEPT PISTES VIVENT : une impulsion par intention, épaisse et à la période RÉELLE
     sur une intention habitée, en VEILLE (lente, fine) sur une intention vide ; et la couleur d'un
     creux se LIT (.5, elle valait .22). Wah : « plus de vie dans les traits d'intention, et afficher
     les couleurs ». */
  ok(c.puls.length===7&&c.veille===4&&c.puls.every(x=>/^ram-puls\//.test(x))&&new Set(c.puls.map(x=>x.split('/')[1])).size>=2,
    'ça VIT : sept impulsions, quatre en veille, la période réelle sur les habitées ('+c.puls.join(' · ')+')');
  ok(parseFloat(c.creuxOp)>=.45,'la couleur d\'une intention vide se LIT ('+c.creuxOp+')');
  ok(!c.flou,'aucun flou (socle, ramifications, galaxie)');
  ok(!c.partis.length,'plus de manette, plus de bascule de mode (balisage retiré) '+c.partis.join(','));
  ok(c.cotes===2&&c.up==='Get Higher'&&c.dn==='My Reflection'&&c.lf==='My shorts'&&c.rt==='My spots'&&c.mine==='true'&&c.others==='false',
     'quatre chevrons discrets (↑ Get Higher, ↓ My Reflection, ← My shorts, → My spots) ; [Mine] coché');
  ok(c.sigAbs&&c.connAbs&&/to open it · (Turn|Swipe) to configure it$/.test(c.tap)&&c.bouche==='0',
    'plus de nom ni d\'espace membre sur l\'atterrissage : le nom ne vit que sur la face VERSO ; « '+c.tap+' » ; la bouche invisible au centre');
  await pg.screenshot({path:OUT+'/proc_centre_'+(tel?'tel':'ordi')+'.png'});
  await pg.click('#lv-tap-open');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:8000}).catch(()=>{});
  ok(await pg.evaluate(()=>!document.body.classList.contains('gate')),'« '+c.tap+' » ouvre mon TOTEHM (la déconstruction)');
  ok(!erreurs(log).length,'centre : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 2 · LES GESTES : ↑ ↓ Échap, ← → sans effet, une transition à la fois ; trackpad ; doigt ; chevrons ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:{width:1280,height:800},rpc:{my_landing:LAND()}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1000);
  await pg.keyboard.press('ArrowLeft');await vers(pg,'g');
  const g0=(await lv(pg)).vue;
  await pg.keyboard.press('ArrowRight');await vers(pg,'c');
  await pg.keyboard.press('ArrowRight');await vers(pg,'d');
  ok(g0==='g'&&(await lv(pg)).vue==='d','← mes shorts, → mes spots (l\'horizontale est revenue le 16/10 bis)');
  await pg.keyboard.press('Escape');await vers(pg,'c');
  const a0=(await lv(pg)).allers;
  await pg.keyboard.press('ArrowDown');await pg.keyboard.press('ArrowUp');await vers(pg,'b');await pg.waitForTimeout(200);
  let d=await lv(pg);ok(d.vue==='b'&&d.allers===a0+1,'↓ puis ↑ aussitôt : UNE navigation (la seconde attend, jamais deux)');
  await pg.keyboard.press('Escape');await vers(pg,'c');
  await pg.keyboard.press('ArrowUp');await vers(pg,'h');
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(500);
  ok((await lv(pg)).vue==='h','↑ : Get Higher ; ↑ encore : rien au-dessus');
  await pg.keyboard.press('ArrowDown');await vers(pg,'c');ok((await lv(pg)).vue==='c','↓ depuis Get Higher : le centre');
  const geste=async dy=>{await pg.waitForTimeout(300);for(let i=0;i<4;i++){await pg.mouse.wheel(0,dy/4);await pg.waitForTimeout(16);}await calme(pg);await pg.waitForTimeout(400);return (await lv(pg)).vue;};
  await pg.mouse.move(640,600);
  const t=[await geste(220),await geste(-220),await geste(-220),await geste(220)];
  ok(t.join(',')==='b,c,h,c','le trackpad, vertical : '+t.join(','));
  {await pg.waitForTimeout(300);await pg.mouse.wheel(0,60);await pg.waitForTimeout(900);ok((await lv(pg)).vue==='c','un petit défilement (60 px) ne change pas de vue');}
  /* 16/10 bis — l'horizontale : `deltaX > 0` veut dire « montre-moi ce qui est à DROITE » (la règle de SPACE). */
  const gesteX=async dx=>{await pg.waitForTimeout(300);for(let i=0;i<4;i++){await pg.mouse.wheel(dx/4,0);await pg.waitForTimeout(16);}await calme(pg);await pg.waitForTimeout(400);return (await lv(pg)).vue;};
  const tx=[await gesteX(220),await gesteX(-220),await gesteX(-220),await gesteX(220)];
  ok(tx.join(',')==='d,c,g,c','le trackpad, horizontal : deltaX > 0 → mes spots, < 0 → mes shorts : '+tx.join(','));
  await pg.click('#lvn-dn');await vers(pg,'b');const dn=await pg.$eval('#lvn-dn',e=>getComputedStyle(e).opacity);
  await pg.click('#lvn-up');await vers(pg,'c');
  ok((await lv(pg)).vue==='c'&&dn==='0','les chevrons : ↓ la Reflection (en bas, plus de chevron ↓), ↑ le centre');
  ok(!erreurs(log).length,'gestes : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:{width:390,height:844},hasTouch:true,rpc:{my_landing:LAND()}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1000);
  const cdp=await pg.context().newCDPSession(pg);
  const glisse=async(x0,y0,x1,y1)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]});
    for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/6,y:y0+(y1-y0)*i/6}]});await pg.waitForTimeout(16);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await calme(pg);await pg.waitForTimeout(500);return (await lv(pg)).vue;};
  const s=[await glisse(40,780,40,640),await glisse(40,640,40,780),await glisse(40,640,40,780),await glisse(40,780,40,640),await glisse(330,560,200,560),await glisse(200,560,330,560)];
  ok(s.join(',')==='b,c,h,c,d,c','le doigt : haut → la Reflection, bas → Get Higher, vers la gauche → mes spots : '+s.join(','));
  ok(!erreurs(log).length,'doigt : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 3 · EN HAUT : GET HIGHER, la bouche du 12/10 — le papier sur la langue, « Get [Higher] » l'avale → la boutique ──
 for(const reduit of [false,true]){
  const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:{width:390,height:844},hasTouch:true,rpc:{my_landing:LAND()}});
  if(reduit) await pg.emulateMedia({reducedMotion:'reduce'});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1000);
  await pg.click('#lvn-up');await vers(pg,'h');await pg.waitForTimeout(500);
  const h=await pg.evaluate(()=>{const q=s=>document.querySelector(s),m=q('#gate-mouth').getBoundingClientRect(),p=q('#gate-asteroid').getBoundingClientRect(),g=q('#lv-slogan').getBoundingClientRect();
    return {op:getComputedStyle(q('#gate-mouth')).opacity,ouverte:window.__totehm_lsd.bouche,haut:m.top<120,
      papier:p.top>m.top&&p.bottom<m.bottom+30&&p.width<60,get:q('#lv-slogan .lvs-get').textContent,getOp:getComputedStyle(q('#lv-slogan .lvs-get')).opacity,
      dessous:g.top>p.bottom,badge:!!q('#lv-slogan use[href="#higher-badge"]'),socle:getComputedStyle(q('#lv-socket')).opacity,tab:q('#lv-slogan').tabIndex};});
  ok(h.op==='1'&&h.ouverte&&h.haut&&h.papier,(reduit?'mouvement réduit · ':'')+'↑ Get Higher : la bouche EN HAUT, ouverte, le papier rapetissé sur la langue');
  ok(h.get==='Get'&&h.getOp==='1'&&h.badge&&h.dessous&&h.tab===0&&h.socle==='0','« Get [Higher] » sous la langue (le badge SVG), LE bouton ; le socle s\'efface '+JSON.stringify(h));
  if(!reduit) await pg.screenshot({path:OUT+'/proc_get_higher.png'});
  const req=pg.waitForRequest(r=>r.url().startsWith('https://www.higher.boutique/get_higher'),{timeout:9000}).catch(()=>null);
  await pg.click('#lv-slogan');
  if(!reduit){await pg.waitForTimeout(900);ok((await pg.evaluate(()=>window.__totehm_lsd.langue||window.__totehm_lsd.extase)),'clic : le papier est avalé (la langue rentre avec lui)');}
  const r=await req;
  ok(!!r&&/\/get_higher\?from=com/.test(r.url()),'puis higher.boutique/get_higher?from=com, par le pont ('+(r&&r.url())+')');
  ok(!erreurs(log).length,'Get Higher : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 4 · OTHERS : la galaxie — le papier rentre dans [Mine], des TOTEHMs en logo, la recherche, l'étoile, l'univers ──
 for(const [vp,tel] of [[{width:390,height:844},true],[{width:1280,height:800},false]]){
  const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:vp,hasTouch:tel,
    rpc:{my_landing:LAND(),totehm_galaxy:GAL,totehm_search:b=>b.p_q?[{pseudo:'kai3',offer:true,price_cents:2400,currency:'eur'}]:[],
         totehm_of:AUTRE,habit_spaces:{ok:true,habits:[]},element_cloths:{ok:true,elements:[]}}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1000);await ouvre(pg);
  await pg.click('#lv-m-others');await calme(pg);await pg.waitForTimeout(900);
  const o=await pg.evaluate(()=>{const q=s=>document.querySelector(s),d=window.__totehm_lv(),p=q('#gate-asteroid').getBoundingClientRect(),m=q('#lv-m-mine').getBoundingClientRect();
    return {mode:d.mode,g:d.galaxie,pc:p.x+p.width/2,pyc:p.y+p.height/2,dans:p.x+p.width/2>m.x&&p.x+p.width/2<m.x+m.width&&p.y+p.height/2>m.y&&p.y+p.height/2<m.y+m.height&&p.width<30,
      cv:getComputedStyle(q('#gx-c')).opacity,ui:getComputedStyle(q('#gx-ui')).visibility,checked:q('#lv-m-others').getAttribute('aria-checked'),ram:getComputedStyle(q('#lv-ram')).opacity,
      up:getComputedStyle(q('#lvn-up')).opacity,
      rech:(()=>{const u=q('#gx-ui').getBoundingClientRect(),c=q('#gx-c').getBoundingClientRect();
        return {centre:Math.abs(u.y+u.height/2-(c.y+c.height*.4))<Math.max(90,c.height*.18)&&Math.abs(u.x+u.width/2-innerWidth/2)<2,
                transparent:getComputedStyle(q('#gx-ui')).pointerEvents==='none',
                champ:getComputedStyle(q('#gx-q')).pointerEvents==='auto'};})()};});
  ok(o.mode==='others'&&o.checked==='true'&&o.dans,(tel?'téléphone':'ordinateur')+' · Others : le papier rentre DANS [Mine] (la continuité), [Others] coché');
  ok(o.g.etoiles===12&&o.g.fond>=100&&o.g.sprite&&o.g.poussiere===undefined&&o.g.anime&&o.cv==='1'&&o.ui==='visible'&&o.ram==='0',
    'la galaxie : 12 TOTEHMs réels dans une MULTITUDE de dos de papier ('+o.g.fond+' carrés de fond, le même background.svg) ; les ramifications se retirent');
  /* 16/10 : la recherche est AU MILIEU (sur le centre de la galaxie), et elle n'avale pas les étoiles. */
  ok(o.rech.centre&&o.rech.transparent&&o.rech.champ,'la zone de recherche est AU MILIEU de la galaxie, et le doigt passe à côté d\'elle');
  ok(log.rpc.filter(x=>x.name==='totehm_galaxy').length===1,'une seule lecture de totehm_galaxy');
  if(tel) await pg.screenshot({path:OUT+'/proc_galaxie.png'});
  // le nom au survol (souris) / au premier tap (doigt)
  const pos=await pg.evaluate(()=>window.__totehm_gx());
  /* La recherche est au MILIEU : on vise une étoile qui n'est pas derrière elle. */
  const champ=await pg.evaluate(()=>{const r=document.getElementById('gx-ui').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});
  const loin=([x,y])=>!(x>champ.x-8&&x<champ.x+champ.w+8&&y>champ.y-8&&y<champ.y+champ.h+8);
  const vis=pos.find(([x,y])=>x>40&&x<vp.width-40&&y>140&&y<vp.height*.75&&loin([x,y]))||pos.find(loin)||pos[0];
  if(tel){ await pg.touchscreen.tap(vis[0],vis[1]); } else { await pg.mouse.move(vis[0],vis[1]); }
  await pg.waitForTimeout(400);
  const tip=await pg.evaluate(()=>({on:document.getElementById('gx-tip').classList.contains('is-on'),t:document.querySelector('#gx-tip .srch-name').textContent}));
  ok(tip.on&&/^kai\d+$/.test(tip.t),(tel?'premier tap':'survol')+' : son nom, lisible ('+tip.t+')');
  // 15/10 bis : PAS de liste — la galaxie EST le résultat. Un nom tapé éteint les autres, agrandit le trouvé
  // et pose son nom en Coral dessus ; Entrée plonge dedans.
  await pg.fill('#gx-q','kai');await pg.waitForFunction(()=>window.__totehm_lv().galaxie.filtre===1,null,{timeout:6000}).catch(()=>{});
  const tr=await pg.evaluate(()=>{const t=document.getElementById('gx-tip'),n=t.querySelector('.srch-name');
    return {liste:getComputedStyle(document.getElementById('gx-res')).display,nom:n.textContent,
      couleur:getComputedStyle(n).color,police:getComputedStyle(n).fontFamily,sc:parseFloat(t.style.getPropertyValue('--sc')||'1')};});
  ok((await lv(pg)).galaxie.filtre===1&&tr.liste==='none','la recherche allume le Totehm trouvé — et AUCUNE liste ne s\'ouvre');
  ok(/^kai\d+$/.test(tr.nom)&&tr.couleur==='rgb(251, 213, 202)'&&/Quantico/.test(tr.police)&&tr.sc>1.4,
    'son nom se pose SUR son carré, Quantico Coral, agrandi avec lui (×'+tr.sc+')');
  /* ⚠️ 18/10 · ZÉRO SAUT, ET CE QUI S'OUVRE EST SON TOTEHM EN MODE READ (Wah : « tu prends au hasard
     un totehm décoratif, tu prends le nom entré et tu les regroupes en affichant DIRECT la page du
     Totehm » · « dans la même configuration que actuelle mais en mode READ »). Même document, même
     session : `RO` s'arme en plein vol, l'URL suit par `replaceState`, aucune navigation. */
  const url0=pg.url();
  await pg.focus('#gx-q');await pg.keyboard.press('Enter');
  await pg.waitForSelector('body.ro',{timeout:8000}).catch(()=>{});
  /* Le papier rentre d'abord chez lui (la galaxie se referme), PUIS le Totehm se déconstruit : c'est
     la même séquence que pour le mien — une seule déconstruction dans tout le fichier. */
  await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});
  await pg.waitForTimeout(600);
  const x=await pg.evaluate(()=>({ro:document.body.classList.contains('ro'),
    qui:(document.getElementById('ro-who')||{}).textContent,
    deplie:!document.body.classList.contains('gate'),
    xo:window.__totehm_xo().actif, g:window.__totehm_lv().galaxie,
    habits:[...document.querySelectorAll('#habits [data-open]')].map(e=>e.textContent.trim().slice(0,20)),
    ecrit:document.querySelectorAll('#habits [contenteditable],#habits [data-kill],#habits [data-add]').length}));
  ok(x.ro&&x.qui==='kai3'&&x.deplie&&!x.xo&&/[?&]ro=kai3/.test(pg.url())&&pg.url().split('?')[0]===url0.split('?')[0]
     &&!(await pg.evaluate(()=>window.__ouvert)).length,
    (tel?'téléphone':'ordinateur')+' · Entrée ouvre SON Totehm, ici même, en lecture ('+pg.url().replace(origin,'')+') : ni navigation, ni onglet');
  ok(x.habits.length===2&&!x.ecrit,'la même configuration que la mienne, mais rien n\'est éditable ('+x.habits.join(' · ')+')');
  ok(x.g.ouvertures===1,'la plongée a bien eu lieu');
  const ctx=await pg.evaluate(()=>JSON.parse(sessionStorage.getItem('totehm_gx')||'null'));
  ok(ctx&&ctx.p==='kai3'&&ctx.q==='kai','le contexte de recherche est gardé (un rechargement rend Others et le nom tapé)');
  await pg.click('#ro-out');
  await pg.waitForFunction(()=>!document.body.classList.contains('ro')&&document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});
  await pg.waitForTimeout(1000);
  const r=await lv(pg);
  ok(!(await pg.evaluate(()=>document.body.classList.contains('ro')))&&!/[?&]ro=/.test(pg.url()),
    'sortir de la lecture : je redeviens moi, et l\'URL aussi');
  ok(r.vue==='c'&&await pg.inputValue('#gx-q')==='kai',
    'on revient à l\'atterrissage, et le nom tapé est toujours là');
  if(!tel){
    await pg.click('#lv-m-mine');await calme(pg);await pg.waitForTimeout(800);
    const m=await pg.evaluate(()=>({d:window.__totehm_lv(),cv:getComputedStyle(document.getElementById('gx-c')).opacity}));
    ok(m.d.mode==='mine'&&!m.d.galaxie.anime&&m.cv==='0','retour à Mine : la galaxie se referme, plus aucune image calculée (rAF arrêté)');
  }
  ok(!erreurs(log).length,'galaxie : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
 // la galaxie s'arrête dès qu'elle n'est plus vue : une autre vue
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:{width:1280,height:800},rpc:{my_landing:LAND(),totehm_galaxy:GAL}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);
  await pg.click('#lv-m-others');await calme(pg);await pg.waitForTimeout(600);
  await pg.keyboard.press('ArrowDown');await vers(pg,'b');await pg.waitForTimeout(400);
  const b=await lv(pg);
  ok(b.vue==='b'&&b.mode==='others'&&!b.galaxie.anime,'de la galaxie vers la Reflection : la Reflection est la MIENNE, la galaxie s\'arrête');
  const p=await pg.evaluate(()=>{const p=document.getElementById('gate-asteroid').getBoundingClientRect(),m=document.getElementById('rf-me').getBoundingClientRect();return Math.abs(p.x+p.width/2-(m.x+m.width/2))<4;});
  ok(p,'mon papier devient le profil, même venu de la galaxie');
  await pg.keyboard.press('ArrowUp');await vers(pg,'c');await pg.waitForTimeout(500);
  const c=await lv(pg);ok(c.mode==='others'&&c.galaxie.anime,'retour : la galaxie reprend, telle quelle');
  ok(!erreurs(log).length,'galaxie / Reflection : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 5 · EN BAS : LA CONDENSATION — seul #gl-bg tourne ; le socle devient un anneau (7 couleurs) ; le profil ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:{width:390,height:844},hasTouch:true,rpc:{my_landing:LAND()}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1000);
  await pg.click('#lvn-dn');await pg.waitForTimeout(260);
  /* les ROTATIONS seules (les fondus du rail et du wordmark sont des transitions d'opacité) */
  const mi=await pg.evaluate(()=>['gl-bg','gl-rail','gl-t','gl-wm'].map(i=>document.getElementById(i).getAnimations()
    .filter(a=>a.effect&&a.effect.getKeyframes().some(k=>/rotate/.test(k.transform||''))).length));
  ok(mi[0]===1&&mi[1]===0&&mi[2]===0&&mi[3]===0,'pendant la condensation, SEUL #gl-bg tourne (animations : '+mi.join(',')+')');
  await vers(pg,'b');await pg.waitForTimeout(900);
  const b=await pg.evaluate(()=>{const q=s=>document.querySelector(s),sk=q('#lv-socket'),cs=getComputedStyle(sk),me=q('#rf-me').getBoundingClientRect(),sr=sk.getBoundingClientRect();
    return {tours:window.__totehm_lv().tours,rayon:cs.borderTopLeftRadius,anneau:getComputedStyle(q('#lv-socket .sk-ring')).opacity,
      points:[...document.querySelectorAll('#lv-socket .sk-ring b')].map(b=>getComputedStyle(b).backgroundColor),
      centre:Math.abs(sr.x+sr.width/2-(me.x+me.width/2))<3&&Math.abs(sr.y+sr.height/2-(me.y+me.height/2))<3,
      clip:getComputedStyle(q('#ast-front')).clipPath,rail:getComputedStyle(q('#gl-rail')).opacity,wm:getComputedStyle(q('#gl-wm')).opacity,
      t:getComputedStyle(q('#gl-t')).opacity,ram:getComputedStyle(q('#lv-ram')).opacity,self:getComputedStyle(q('#lv-slogan .lvs-self')).opacity,
      tourne:q('#gl-bg').getAnimations().filter(a=>a.effect&&a.effect.getKeyframes().some(k=>/rotate/.test(k.transform||''))).length};});
  ok(b.tours===1&&b.tourne===0,'il a tourné une fois, puis s\'est posé d\'aplomb');
  ok(b.rayon==='50%'&&b.anneau==='1'&&b.centre&&b.points.length===7,'le socle s\'est condensé en ANNEAU autour du profil, sept points aux couleurs des intentions');
  ok(/circle\(29\.5%/.test(b.clip)&&b.rail==='0'&&b.wm==='0'&&b.t==='1'&&b.ram==='0','le papier : un profil autour du T (le même objet), le rail et le wordmark éteints sans tourner ; les ramifications résorbées');
  ok(b.self==='1','« [Higher] Self » sous le profil');
  await pg.screenshot({path:OUT+'/proc_reflection_vide.png'});
  await pg.click('#lvn-up');await pg.waitForTimeout(240);
  const ret=await pg.evaluate(()=>document.getElementById('gl-bg').getAnimations().filter(a=>a.effect&&a.effect.getKeyframes().some(k=>/rotate/.test(k.transform||''))).length);
  await vers(pg,'c');await pg.waitForTimeout(900);
  const c=await pg.evaluate(()=>({clip:getComputedStyle(document.getElementById('ast-front')).clipPath,r:getComputedStyle(document.getElementById('lv-socket')).borderTopLeftRadius,ram:getComputedStyle(document.getElementById('lv-ram')).opacity}));
  ok(ret===1&&c.r==='0px'&&c.ram==='1'&&!/29\.5/.test(c.clip),'le retour aussi est animé (#gl-bg tourne à l\'envers) : le socle carré, les ramifications');
  ok(!erreurs(log).length,'condensation : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 6 · LA REFLECTION : trois étages ; seules les citations VRAIES (`@ok`) s'affichent comme miennes ; une
 //    step qui n'est pas une Habit est une PROPOSITION (pointillé, « + my Habit ») ──
 {const REP='@dir objective "Ship my first collection"\nI ship before December, one detail a night.\n@obs\nI keep scrolling instead of drawing.\n'
   +'@teach wisdom "Discipline is freedom"\nEvery night I give the screen is a night I steal from my collection.\n@step new\nI draw one sleeve at 22:00 tonight.\n'
   +'@ok {"dir":true,"teach":false,"step":null}';
  const corps=[];let say=0;
  const net=(url,req)=>{ if(url.pathname!=='/functions/v1/higher-self') return null;
    const b=JSON.parse(req.postData()||'{}');corps.push(b);
    if(b.action==='say'&&++say<=2) return {status:200,contentType:'text/plain; charset=utf-8',headers:{'X-SM-Left':String(6-say),'X-SM-Higher':'0','access-control-allow-origin':'*','access-control-expose-headers':'X-SM-Left, X-SM-Higher'},body:REP};
    return {status:402,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({error:'higher_required',state:{ready:true,habit:true,objective:true,higher:false,free_total:7,free_left:0,left:0}})}; };
  const{pg,log}=await page(browser,{dir:'com',origin,tables,network:net,functions:{'higher-sub':{error:'not_ready'}},viewport:{width:390,height:844},hasTouch:true,rpc:{my_landing:LAND()}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1000);
  await pg.click('#lvn-dn');await vers(pg,'b');await pg.waitForTimeout(400);
  const v=await pg.evaluate(()=>({say:!document.getElementById('lv-say').classList.contains('hide'),font:getComputedStyle(document.getElementById('lv-say-in')).fontFamily,
    note:document.getElementById('lv-say-note').textContent,etages:[...document.querySelectorAll('#lv-thread .rf-t')].map(e=>e.className),
    vide:document.getElementById('lv-say').classList.contains('is-vide'),cur:!!document.querySelector('#lv-say .rf-cur'),
    focus:document.activeElement===document.getElementById('lv-say-in'),ph:document.getElementById('lv-say-in').placeholder,
    px:getComputedStyle(document.getElementById('lv-say-in')).fontSize,boite:getComputedStyle(document.getElementById('lv-say-in')).backgroundColor,
    align:getComputedStyle(document.getElementById('lv-say-in')).textAlign,faux:getComputedStyle(document.querySelector('#lv-say .rf-cur')).opacity,coarse:matchMedia('(pointer:coarse)').matches,
    slo:(()=>{const r=document.getElementById('lv-slogan').getBoundingClientRect();return r.top>innerHeight*.8;})()}));
  ok(v.say&&/Quantico/.test(v.font)&&/^6 of 7 free this month/.test(v.note),'prêt : la saisie (Quantico), « 6 of 7 free this month »');
  ok(v.etages.length===0&&v.vide&&v.focus&&v.ph===''&&v.faux===(v.coarse?'1':'0'),'20/10 ter · en arrivant : le focus est déjà dans le champ ; à la souris le trait s\'efface (le vrai curseur est là), au doigt SANS clavier levé il reste — jamais deux ; plus de « Wassup ? » → '+JSON.stringify({f:v.focus,faux:v.faux,coarse:v.coarse}));
  ok(v.px==='22px'&&v.align==='left'&&v.boite==='rgba(0, 0, 0, 0)','20/10 ter · à GAUCHE, en GRAND (22 px), ni boîte ni fond → '+v.px+' '+v.align+' '+v.boite);
  /* ↑ dans le champ vide remonte ; redescendre remet le curseur dans le champ */
  await pg.keyboard.press('ArrowUp');await vers(pg,'c');await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>window.__totehm_lv().vue)==='c','20/10 · ↑ dans le champ vide remonte au centre');
  await pg.click('#lvn-dn');await vers(pg,'b');await pg.waitForTimeout(400);
  ok(await pg.evaluate(()=>document.activeElement===document.getElementById('lv-say-in')),'20/10 · redescendre : le curseur est de nouveau dans le champ');
  await pg.fill('#lv-say-in','I procrastinate on my collection');await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>window.__totehm_lv().reflection.envois===1,null,{timeout:5000}).catch(()=>{});await pg.waitForTimeout(300);
  const r=await pg.evaluate(()=>{const q=s=>document.querySelector(s),cs=e=>e&&getComputedStyle(e).backgroundColor;
    const t=[...document.querySelectorAll('#lv-thread .rf-t')];
    return {q:q('#lv-thread .rf-q')?.textContent,fonds:t.map(cs),refs:[...document.querySelectorAll('#lv-thread .rf-ref')].map(e=>e.textContent),
      dir:t[0]?.querySelector('p')?.textContent,obs:t[2]?.querySelector('p')?.textContent,teachK:t[2]?.querySelector('.rf-k')?.textContent,
      teach:t[2]?.querySelector('.rf-teach p')?.textContent,step:t[1]?.querySelector('p')?.textContent,prop:t[1]?.classList.contains('is-prop'),
      add:!!t[1]?.querySelector('[data-rf-add]'),acts:document.querySelectorAll('#lv-thread .sm-acts').length,pense:window.__totehm_lv().reflection.pense,
      classes:t.map(e=>e.className.match(/t-\w+/)[0]),
      haute:t[1]&&t[0]?t[1].getBoundingClientRect().width>t[0].getBoundingClientRect().width&&/matrix\(1, 0, 0, 1, 0, -\d/.test(getComputedStyle(t[1]).transform):false};});
  ok(r.q==='I procrastinate on my collection'&&JSON.stringify(r.fonds)===JSON.stringify(['rgb(54, 73, 140)','rgb(51, 51, 102)','rgb(116, 49, 105)'])
     &&JSON.stringify(r.classes)===JSON.stringify(['t-dir','t-step','t-obs']),'15/10 bis · direction (bleu clair) · LA HABIT (navy, AU MILIEU) · obstacle + Teaching (rouge-violet) : l\'action est le centre de gravité');
  ok(r.haute,'la Habit est sur-élevée : plus large que les deux autres, et elle monte');
  ok(r.dir==='I ship before December, one detail a night.'&&r.obs==='I keep scrolling instead of drawing.'&&r.teachK==='Teaching from the story'&&/screen/.test(r.teach),'direction · ce qui fait obstacle · « Teaching from the story »');
  ok(JSON.stringify(r.refs)===JSON.stringify(['Ship my first collection']),'seule la citation VÉRIFIÉE s\'affiche comme mienne (l\'objectif) ; la croyance non vérifiée n\'est jamais présentée comme mienne');
  ok(r.prop&&r.add&&r.step==='I draw one sleeve at 22:00 tonight.','la step nouvelle = une PROPOSITION (pointillé) + « + my Habit »');
  ok(r.acts===0&&!r.pense,'gratuit : pas de partage ; l\'anneau ne tourne plus une fois la réponse arrivée');
  const c1=corps.find(x=>x.action==='say');
  ok(c1&&c1.fmt==='r3'&&Array.isArray(c1.turns)&&c1.turns.length===0,'l\'appel demande le format r3 (trois étages vérifiés)');
  await pg.screenshot({path:OUT+'/proc_reflection.png'});
  await pg.click('#lv-thread [data-rf-add]');await pg.waitForTimeout(1400);
  const a=await pg.evaluate(()=>({h:(window.__totehm_zone||{}).habitudes,ref:[...document.querySelectorAll('#lv-thread .t-step .rf-ref')].map(e=>e.textContent),prop:document.querySelector('#lv-thread .t-step').classList.contains('is-prop'),aj:window.__totehm_lv().reflection.ajouts}));
  ok(a.aj===1&&JSON.stringify(a.ref)===JSON.stringify(['Draw one sleeve at 22:00 tonight'])&&!a.prop,'« + my Habit » : la proposition devient une Habit de mon TOTEHM (« Draw one sleeve at 22:00 tonight »)');
  await pg.fill('#lv-say-in','and tomorrow');await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>window.__totehm_lv().reflection.envois===2,null,{timeout:5000}).catch(()=>{});
  const c2=corps.filter(x=>x.action==='say')[1];
  ok(c2&&c2.turns.length===2&&c2.turns[1].role==='sm'&&!/@ok/.test(c2.turns[1].text),'le tour suivant porte les tours d\'avant, sans la ligne de vérification ; aucun historique à l\'écran');
  ok(await pg.locator('#lv-thread .rf-q').count()===1&&/and tomorrow/.test(await pg.textContent('#lv-thread .rf-q')),'la dernière Reflection seule');
  await pg.fill('#lv-say-in','and now');await pg.keyboard.press('Enter');await pg.waitForTimeout(900);
  const f=await pg.evaluate(()=>({v:document.getElementById('lv-say-in').value,ferme:document.getElementById('lv-say').classList.contains('hide'),offre:!!document.querySelector('#lv-thread .sm-offer [data-sm-sub]')}));
  ok(f.v==='and now'&&f.ferme&&f.offre,'les 7 pris (402) : la phrase revient, la saisie se ferme, l\'offre Higher');
  ok(!erreurs(log).length,'Reflection : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
 // les états : sans compte (un exemple, CONNECT), TOTEHM pas prêt, abonné Higher (partage), ?higher=paid
 {const{pg,log}=await page(browser,{dir:'com',origin,tables:{},session:false,viewport:{width:390,height:844}});
  await pg.goto(origin+'/totehm');await pg.waitForTimeout(1000);
  await pg.keyboard.press('ArrowDown');await vers(pg,'b');await pg.waitForTimeout(300);
  const s=await pg.evaluate(()=>({ex:document.querySelector('#lv-thread .rf-ex')?.textContent,n:document.querySelectorAll('#lv-thread .rf-t').length,
    btn:document.querySelector('[data-sm-connect]')?.textContent,say:document.getElementById('lv-say').classList.contains('hide'),add:document.querySelectorAll('[data-rf-add]').length}));
  ok(s.ex==='example'&&s.n===3&&s.btn==='CONNECT WITH MY TOTEHM'&&s.say&&!s.add,'sans compte : un EXEMPLE (dit comme tel), CONNECT WITH MY TOTEHM, pas de saisie');
  await pg.click('[data-sm-connect]');await pg.waitForTimeout(1200);
  ok(await pg.evaluate(()=>document.body.classList.contains('is-door')&&window.__totehm_lv().vue==='c'),'CONNECT : retour au centre, la porte s\'ouvre');
  ok(!erreurs(log).length,'sans compte : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:{width:390,height:844},rpc:{my_landing:LAND({sm:{ready:false,habit:true,objective:false,higher:false,free_total:7,free_left:7,left:7}})}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);
  await pg.keyboard.press('ArrowDown');await vers(pg,'b');
  const v=await pg.evaluate(()=>({say:document.getElementById('lv-say').classList.contains('hide'),h:document.querySelector('[data-sm-write="habits"]')?.className,o:document.querySelector('[data-sm-write="objectives"]')?.className}));
  ok(v.say&&/is-ok/.test(v.h)&&!/is-ok/.test(v.o),'TOTEHM pas prêt : pas de saisie ; Habit ✓, Objective à écrire');
  await pg.click('[data-sm-write="objectives"]');
  await pg.waitForFunction(()=>!document.body.classList.contains('gate')&&window.__totehm_zone&&window.__totehm_zone.vue==='objectives',null,{timeout:9000}).catch(()=>{});
  ok(await pg.evaluate(()=>!document.body.classList.contains('gate')&&window.__totehm_zone.vue==='objectives'),'« + my Objective » ouvre mon TOTEHM sur les objectifs (depuis le bas : retour au centre, puis la déconstruction)');
  ok(!erreurs(log).length,'pas prêt : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
 {const REP='@dir vision "A quiet house by the sea"\nI build the house one brick a day.\n@obs\nI wait for the mood.\n@teach story\nI already know waiting never built anything.\n@step habit "Run the hill"\nI run the hill at 7:00 tomorrow.\n@ok {"dir":true,"teach":null,"step":true}';
  const net=(url,req)=>{ if(url.pathname!=='/functions/v1/higher-self') return null; const b=JSON.parse(req.postData()||'{}');
    if(b.action==='say') return {status:200,contentType:'text/plain; charset=utf-8',headers:{'X-SM-Left':'29','X-SM-Higher':'1','access-control-allow-origin':'*','access-control-expose-headers':'X-SM-Left, X-SM-Higher'},body:REP};
    return {status:409,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({error:'not_linked'})}; };
  const{pg,log}=await page(browser,{dir:'com',origin,tables,network:net,viewport:{width:390,height:844},hasTouch:true,
    rpc:{my_landing:LAND({higher:{active:true,price_cents:700,currency:'eur'},sm:{ready:true,habit:true,objective:true,higher:true,free_total:7,free_left:7,left:30}}),new_bot_link_code:'c0de'}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);await ouvre(pg);
  await pg.keyboard.press('ArrowDown');await vers(pg,'b');
  await pg.fill('#lv-say-in','lazy today');await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>window.__totehm_lv().reflection.envois===1,null,{timeout:5000}).catch(()=>{});await pg.waitForTimeout(200);
  const h=await pg.evaluate(()=>({refs:[...document.querySelectorAll('#lv-thread .rf-ref')].map(e=>e.textContent),prop:document.querySelector('#lv-thread .t-step').classList.contains('is-prop'),
    add:document.querySelectorAll('[data-rf-add]').length,acts:document.querySelectorAll('#lv-thread .sm-acts button').length,
    tg:!!document.querySelector('#lv-thread [data-tg]'),wa:!!document.querySelector('#lv-thread [data-wa]')}));
  ok(JSON.stringify(h.refs)===JSON.stringify(['A quiet house by the sea','Run the hill'])&&!h.prop&&!h.add,'une step qui EST une de mes Habits (vérifiée) : sa mini-boîte, sans pointillé ni « + my Habit »');
  ok(h.acts===1&&h.tg&&!h.wa,'15/10 bis · Higher : « [Higher] my Telegram » SEUL sous la Reflection (pas de Meta)');
  /* Telegram : la Reflection part par le serveur (`higher-self` action telegram), jamais par une URL publique. */
  await pg.click('#lv-thread [data-tg]');await pg.waitForTimeout(600);
  const o=await pg.evaluate(()=>window.__ouvert);
  ok(!o.some(u=>/wa\.me|whatsapp/i.test(String(u))),'Telegram : l\'envoi passe par le serveur — plus aucune URL WhatsApp publique');
  ok(!erreurs(log).length,'Higher : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
 {let n=0;const SMF={ready:true,habit:true,objective:true,higher:false,free_total:7,free_left:0,left:0};
  const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:{width:390,height:844},rpc:{my_landing:()=>(++n>=3?LAND({higher:{active:true},sm:{...SMF,higher:true,left:30}}):LAND({sm:SMF}))}});
  await pg.goto(origin+'/totehm?higher=paid');await pg.waitForSelector('body.member');
  await vers(pg,'b');
  ok(pg.url()===origin+'/totehm'&&/payment received/.test(await pg.textContent('#lv-say-note')),'?higher=paid : l\'adresse est nettoyée, la Reflection s\'ouvre');
  await pg.waitForFunction(()=>window.__totehm_lv().higher,null,{timeout:9000}).catch(()=>{});
  ok((await lv(pg)).higher&&!(await pg.$eval('#lv-say',e=>e.classList.contains('hide'))),'le webhook arrive : la saisie s\'ouvre ('+n+' lectures de my_landing)');
  ok(!erreurs(log).length,'retour Stripe : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 7 · MOUVEMENT RÉDUIT : tout marche, rien ne tourne ni ne glisse ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:{width:390,height:844},rpc:{my_landing:LAND(),totehm_galaxy:GAL}});
  await pg.emulateMedia({reducedMotion:'reduce'});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);
  const tr=await pg.evaluate(()=>['lv-socket','lv-b','gx-c'].map(i=>getComputedStyle(document.getElementById(i)).transitionDuration));
  await pg.keyboard.press('ArrowDown');await vers(pg,'b');
  const b=await pg.evaluate(()=>({tours:window.__totehm_lv().tours,anim:document.getElementById('gl-bg').getAnimations().filter(a=>a.effect&&a.effect.getKeyframes().some(k=>/rotate/.test(k.transform||''))).length}));
  await pg.keyboard.press('ArrowUp');await vers(pg,'c');
  await pg.click('#lv-m-others');await calme(pg);await pg.waitForTimeout(600);
  const g=(await lv(pg)).galaxie;
  ok(tr.every(t=>/^0s/.test(t))&&b.tours===0&&b.anim===0,'mouvement réduit : aucune transition, #gl-bg ne tourne pas ('+tr.join(' ')+')');
  ok((await lv(pg)).mode==='others'&&g.etoiles===12&&!g.anime,'la galaxie, immobile (dessinée une fois)');
  ok(!erreurs(log).length,'mouvement réduit : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 8 · AU CHARGEMENT : le badge [Higher] n'apparaît jamais au coin ──
 for(const vp of [{width:390,height:844},{width:1280,height:800}]){
  const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND()},viewport:vp,
    network:async url=>{ if(url.host==='esm.sh') await new Promise(r=>setTimeout(r,1500)); return null; }});
  await pg.addInitScript(()=>{window.__coin=0;const t0=performance.now();
    const f=()=>{const e=document.getElementById('lv-slogan');
      if(e){const r=e.querySelector('svg').getBoundingClientRect(),cs=getComputedStyle(e);
        if(cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>0&&r.left<20&&r.top<20)window.__coin++;}
      if(performance.now()-t0<3000)requestAnimationFrame(f);};requestAnimationFrame(f);});
  await pg.goto(origin+'/totehm');await pg.waitForTimeout(3200);
  ok(await pg.evaluate(()=>window.__coin)===0,'module retardé de 1,5 s ('+vp.width+' px) : le badge [Higher] jamais au coin');
  ok(!erreurs(log).length,'chargement lent : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 20/10 · TÉLÉPHONE : on glisse vers le bas, le clavier est DÉJÀ ouvert (relais focalisé DANS le geste) ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND()},viewport:{width:390,height:844},hasTouch:true});
  await pg.addInitScript(()=>{const m=window.matchMedia.bind(window);window.matchMedia=q=>/^\(pointer:\s*coarse\)$/.test(q)?{matches:true,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}:m(q);});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  const cdp=await pg.context().newCDPSession(pg);
  const tp=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
  await tp('touchStart',195,600);for(let i=1;i<=6;i++) await tp('touchMove',195,600-i*40);await tp('touchEnd');
  const geste=await pg.evaluate(()=>document.activeElement&&document.activeElement.className);
  const course=await pg.evaluate(()=>getComputedStyle(document.querySelector('#lv-say .rf-cur')).animationName);
  await pg.keyboard.type('yo');await vers(pg,'b');await pg.waitForTimeout(300);
  const a=await pg.evaluate(()=>({act:document.activeElement&&document.activeElement.id,val:document.getElementById('lv-say-in').value,
    clav:document.body.classList.contains('rf-clavier'),joy:getComputedStyle(document.getElementById('lvjoy')).opacity}));
  ok(geste==='rf-proxy','20/10 · téléphone : le clavier s\'ouvre DANS le geste (relais focalisé pendant la course)');
  ok(a.act==='lv-say-in'&&a.val==='yo','20/10 · à l\'arrivée, le focus passe au vrai champ et garde ce qui a été tapé pendant la course → '+JSON.stringify(a));
  ok(a.clav&&a.joy==='0','20/10 · en tapant sur téléphone, la manette s\'efface');
  ok(course==='rf-blink','20/10 ter · pendant la course, le trait CLIGNOTE à gauche (le vrai curseur n\'est pas encore là)');
  /* le clavier se lève : la page rétrécit → le vrai curseur prend la place, le trait s'éteint (champ vidé d'abord) */
  await pg.fill('#lv-say-in','');await pg.focus('#lv-say-in');await pg.setViewportSize({width:390,height:480});await pg.waitForTimeout(300);
  const k=await pg.evaluate(()=>({tape:document.getElementById('lv-say').classList.contains('is-tape'),op:getComputedStyle(document.querySelector('#lv-say .rf-cur')).opacity}));
  ok(k.tape&&k.op==='0','20/10 ter · clavier levé : un seul curseur, le vrai → '+JSON.stringify(k));
  await pg.evaluate(()=>document.getElementById('lv-say-in').blur());await pg.setViewportSize({width:390,height:844});await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>!document.getElementById('lv-say').classList.contains('is-tape')&&getComputedStyle(document.querySelector('#lv-say .rf-cur')).animationName==='rf-blink'),'20/10 ter · clavier baissé : le trait clignote de nouveau à gauche');
  /* le secours : un tap n'importe où dans la vue ouvre le clavier */
  await pg.tap('#rf',{position:{x:200,y:600}});await pg.waitForTimeout(200);
  ok(await pg.evaluate(()=>document.activeElement===document.getElementById('lv-say-in')),'20/10 ter · un tap n\'importe où dans la vue met le curseur dans le champ (le téléphone accepte toujours un tap)');
  await tp('touchStart',195,500);for(let i=1;i<=6;i++) await tp('touchMove',195,500+i*40);await tp('touchEnd');await vers(pg,'c');await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>!document.body.classList.contains('rf-clavier')&&!['lv-say-in'].includes(document.activeElement&&document.activeElement.id)&&!(document.activeElement&&document.activeElement.classList.contains('rf-proxy'))),
    '20/10 · remonter ferme le clavier et rend la manette');
  ok(!erreurs(log).length,'téléphone : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 20/10 ter · À LA SOURIS : ↓ mène en bas, le vrai curseur est là, le trait s'efface ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{my_landing:LAND()},viewport:{width:1280,height:860}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.keyboard.press('ArrowDown');await vers(pg,'b');await pg.waitForTimeout(300);
  const m=await pg.evaluate(()=>({coarse:matchMedia('(pointer:coarse)').matches,f:document.activeElement===document.getElementById('lv-say-in'),
    faux:getComputedStyle(document.querySelector('#lv-say .rf-cur')).opacity}));
  ok(!m.coarse&&m.f&&m.faux==='0','20/10 ter · à la souris : ↓ et le curseur est dans le champ, un seul → '+JSON.stringify(m));
  await pg.keyboard.type('hey');ok(await pg.inputValue('#lv-say-in')==='hey','20/10 ter · on tape directement, sans cliquer');
  ok(!erreurs(log).length,'souris : aucune erreur');await pg.context().close();}
}finally{await browser.close();}
