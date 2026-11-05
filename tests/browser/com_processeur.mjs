// COM · 15/10/2026, mis à jour le 20/10 sexies — LE PROCESSEUR : CINQ vues, quatre voisins
// (↑ Get Higher · ← Media · My TOTEHM · Spots → · ↓ Higher my ChatGPT). Les deux côtés sont la TRANSFORMATION du centre :
// les sept traits se plient (rail à gauche, méridiens à droite). CENTRE : le papier dans son socle, les ramifications de
// mes intentions (les 7 couleurs) ; Mine · Members (plus de galaxie : le papier grandit, se retourne, on tape un nom,
// et l'on vit l'écosystème du membre). HAUT : la bouche du
// 12/10, le papier sur la langue, « Get [Higher] » l'avale → higher.boutique/get_higher?from=com. BAS : la condensation
// (seul #gl-bg tourne), le profil, Higher my ChatGPT en trois étages (citations vérifiées, proposition ≠ Habit).
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
/* Le Totehm d'un autre, lu SUR PLACE depuis MEMBERS (`totehm_read`). */
const AUTRE={ok:true,pseudo:'kai3',steps:[{t:'Swim at dawn',i:'flow',is:['flow']},{t:'Write it down',i:'express',is:['express']}],
  trips:[],objs:{},reps:[],wisdom:[],visions:[]};
const COULEURS=['#E24B4A','#e48b31','#fcbe21','#639922','#1D9E75','#378ADD','#7F77DD'];
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const lv=pg=>pg.evaluate(()=>window.__totehm_lv());
const R=(pg,sel)=>pg.$eval(sel,e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2};});
const ouvre=async pg=>{await pg.evaluate(()=>{window.__ouvert=[];window.open=(u)=>{window.__ouvert.push(u);return null;};});};
const vers=(pg,v)=>pg.waitForFunction(v=>{const d=window.__totehm_lv();return d.vue===v&&!d.bouge;},v,{timeout:6000}).catch(()=>{});
const calme=pg=>pg.waitForFunction(()=>!window.__totehm_lv().bouge,null,{timeout:6000}).catch(()=>{});
/* La manette de l'atterrissage tirée à la souris : 30 px dans une direction (son rayon est de 10). */
const tire=async(pg,dx,dy)=>{const r=await pg.evaluate(()=>{const b=document.getElementById('lvj-box').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};});
  await pg.mouse.move(r.x,r.y);await pg.mouse.down();await pg.mouse.move(r.x+dx/2,r.y+dy/2);await pg.mouse.move(r.x+dx,r.y+dy);await pg.mouse.up();};
const browser=await launch();
try{
 // ── 1 · LE CENTRE : le processeur dans son socle, sept ramifications, Mine · Others ; ni manette, ni côtés ──
 for(const [vp,tel] of [[{width:390,height:844},true],[{width:1280,height:800},false]]){
  const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:vp,hasTouch:tel,rpc:{my_landing:LAND()}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1400);
  const c=await pg.evaluate(()=>{const q=s=>document.querySelector(s);
    const sk=q('#lv-socket').getBoundingClientRect(),pa=q('#gate-asteroid').getBoundingClientRect(),d=window.__totehm_lv();
    const flou=[...document.querySelectorAll('#lv-proc,#lv-proc *')].some(e=>{const cs=getComputedStyle(e);return /blur/.test(cs.filter+' '+(cs.backdropFilter||''));});
    return {vue:d.vue,mode:d.mode,dans:Math.abs((sk.x+sk.width/2)-(pa.x+pa.width/2))<1.5&&Math.abs((sk.y+sk.height/2)-(pa.y+pa.height/2))<1.5&&sk.width>=pa.width&&sk.width<=pa.width+12&&getComputedStyle(q('#lv-socket')).backgroundColor==='rgba(0, 0, 0, 0)',
      pistes:[...document.querySelectorAll('#lv-ram path:not(.puls):not(.sk):not(.fk)')].map(p=>p.getAttribute('stroke')),noeuds:document.querySelectorAll('#lv-ram circle.is-plein').length,
      pads:document.querySelectorAll('#lv-ram circle.pad').length,jonctions:document.querySelectorAll('#lv-ram circle.jonction').length,
      rameaux:document.querySelectorAll('#lv-ram path.fk').length,broches:document.querySelectorAll('#lv-ram rect.pin').length,
      pales:document.querySelectorAll('#lv-ram g.r-0').length,ramOp:getComputedStyle(q('#lv-ram')).opacity,flou,
      plein:(()=>{const r=q('#lv-ram').getBoundingClientRect();return Math.round(r.width)===innerWidth&&Math.round(r.height)>=innerHeight-2;})(),
      puls:[...document.querySelectorAll('#lv-ram .puls')].map(e=>getComputedStyle(e).animationName+'/'+getComputedStyle(e).animationDuration),
      veille:document.querySelectorAll('#lv-ram .puls.veille').length,
      creuxOp:(()=>{const g=q('#lv-ram g.r-0');return g?getComputedStyle(g).opacity:'';})(),
      partis:['ljoy','ljoy-say','lv-take','fish','lv-earth','lv-visions','lv-mine','lv-find','vmode','gx-c','gx-q','gx-tip','rdr-c'].filter(i=>document.getElementById(i)),
      up:q('#lvn-up').getAttribute('aria-label'),dn:q('#lvn-dn').getAttribute('aria-label'),
      lf:q('#lvn-lf').getAttribute('aria-label'),rt:q('#lvn-rt').getAttribute('aria-label'),
      cotes:['lv-g','lv-d'].filter(i=>document.getElementById(i)).length,
      mine:q('#lv-m-mine').getAttribute('aria-checked'),others:q('#lv-m-members').getAttribute('aria-checked'),
      /* 18/10 : le nom a quitté l'atterrissage — il ne vit QUE sur la face verso du papier (Wah). */
      sigAbs:!q('#ast-sig'),connAbs:!q('#conn-bar'),
      tap:q('#lv-tap').textContent,bouche:getComputedStyle(q('#gate-mouth')).opacity,
      /* Les pointes hautes touchent l'écran ; le tronc contourne le visuel advisory et
         les racines enveloppent les côtés et le dessous de la manette, sans toucher ses contrôles. */
      arbre:(()=>{const P=q('#gate-asteroid').getBoundingClientRect(),jb=q('#lvj-box').getBoundingClientRect(),J={x:jb.x+jb.width/2,y:jb.y+jb.height/2};
        const joy=q('#lvjoy').getBoundingClientRect(),avis=q('#lv-parental').getBoundingClientRect();
        const pts=d=>d.split('M').filter(Boolean).map(s=>s.split('L').map(p=>p.trim().split(/\s+/).map(Number)));
        const main=[...document.querySelectorAll('#lv-ram path:not(.puls):not(.sk):not(.fk)')].map(p=>pts(p.getAttribute('d')));
        const fk=[...document.querySelectorAll('#lv-ram path.fk')].map(p=>pts(p.getAttribute('d'))[0]);
        const coord=e=>[+e.getAttribute('cx'),+e.getAttribute('cy')];
        const hauts=[...document.querySelectorAll('#lv-ram circle.pad-haut')],haut=hauts.map(coord),bas=[...document.querySelectorAll('#lv-ram circle.pad-racine')].map(coord);
        const jonctions=[...document.querySelectorAll('#lv-ram circle.jonction')],tous=[].concat(...main.map(s=>[].concat(...s)),...fk);
        const bordHaut=hauts.map(e=>e.getBoundingClientRect().top-parseFloat(getComputedStyle(e).strokeWidth)/2);
        const glyphes=['lvn-up','lvn-dn','lvn-lf','lvn-rt'].map(id=>q('#'+id+' svg').getBoundingClientRect());
        const sous=glyphes[1].bottom+4;
        const echantillons=[...document.querySelectorAll('#lv-ram path:not(.puls):not(.sk)')].flatMap(e=>{
          const L=e.getTotalLength(),n=Math.ceil(L/.5),points=[];
          for(let i=0;i<=n;i++){const p=e.getPointAtLength(L*i/n);if(p.y>P.bottom+2)points.push([p.x,p.y]);}return points;});
        const marge=p=>Math.hypot(Math.max(avis.left-p[0],0,p[0]-avis.right),Math.max(avis.top-p[1],0,p[1]-avis.bottom))-1;
        const dans=p=>p[0]>=P.x-8&&p[0]<=P.right+8&&p[1]>=P.y-8&&p[1]<=P.bottom+8,mn=l=>Math.round(Math.min(...l)),mx=l=>Math.round(Math.max(...l));
        return {couronne:haut.length,cg:mn(haut.map(p=>p[0])),cd:innerWidth-mx(haut.map(p=>p[0])),ch:mn(haut.map(p=>p[1])),
          hautsTouches:bordHaut.every(y=>Math.abs(y)<.15),
          racines:bas.length,etendue:mx(bas.map(p=>p[0]))-mn(bas.map(p=>p[0])),rg:mn(bas.map(p=>p[0])),rd:innerWidth-mx(bas.map(p=>p[0])),rb:innerHeight-mx(bas.map(p=>p[1])),
          enveloppe:echantillons.some(p=>p[0]<joy.left-4&&p[1]>jb.top&&p[1]<joy.bottom)
            &&echantillons.some(p=>p[0]>joy.right+4&&p[1]>jb.top&&p[1]<joy.bottom)
            &&bas.some(p=>p[0]>joy.left&&p[0]<J.x&&p[1]>sous)&&bas.some(p=>p[0]>J.x&&p[0]<joy.right&&p[1]>sous),
          borne:bas.every(p=>p[0]>4&&p[0]<innerWidth-4&&p[1]>J.y+20&&p[1]<innerHeight-4),
          avis:{integre:q('#lv-parental').parentElement!==q('#lv-c-acts')&&avis.top>P.bottom+12&&avis.bottom<joy.top-8,
            marge:Math.min(...echantillons.map(marge)),
            continu:main.every(s=>{const l=s[1];return l.some(p=>p[1]<avis.top-3)&&l.some(p=>p[1]>avis.bottom+3)
              &&l.some((p,k)=>{const a=l[k-1];return a&&Math.max(a[1],p[1])>avis.top&&Math.min(a[1],p[1])<avis.bottom
                &&((a[0]<avis.left&&p[0]<avis.left)||(a[0]>avis.right&&p[0]>avis.right));});})},
          jonctions:jonctions.every(e=>{const p=coord(e),segments=main.flat().concat(fk);
            const liens=segments.reduce((n,l)=>n+l.reduce((m,q,j)=>m+(Math.hypot(p[0]-q[0],p[1]-q[1])<.15?+(j>0)+ +(j<l.length-1):0),0),0);
            return !e.classList.contains('is-plein')&&liens>=3&&fk.some(l=>Math.hypot(l[0][0]-p[0],l[0][1]-p[1])<.15);}),
          noeud:main.length===7&&main.every(s=>s.length===2&&dans(s[0][0])&&dans(s[1][0])),
          descend:main.every(s=>s[1].every((p,k,l)=>!k||p[1]>=l[k-1][1]-.15)),
          touche:tous.filter(p=>glyphes.some(g=>p[0]>g.left-4&&p[0]<g.right+4&&p[1]>g.top-4&&p[1]<g.bottom+4)||Math.hypot(p[0]-J.x,p[1]-J.y)<24).length,
          libre:mn(tous.map(p=>Math.hypot(p[0]-J.x,p[1]-J.y))),
          fruit:(()=>{const e=q('#lv-ram circle.is-plein');return e?getComputedStyle(e).fill+'|'+e.getAttribute('stroke'):'';})()};})()};});
  ok(c.vue==='c'&&c.mode==='mine'&&c.dans,(tel?'téléphone':'ordinateur')+' · centre, Mine : 25/10 · le TOTEHM est le boîtier — le socle ne se voit plus, il le serre à 3 px');
  ok(JSON.stringify(c.pistes)===JSON.stringify(COULEURS)&&c.noeuds>=3&&c.pads===56+c.arbre.racines&&c.jonctions===4&&c.rameaux===82&&c.broches===12&&c.pales===4&&c.ramOp==='1'&&c.plein,'le réseau PLEIN ÉCRAN, en ARBRE : sept pistes aux 7 couleurs exactes, 12 broches dans les perforations, les pastilles PLEINES = MES Habits et quatre jonctions distinctes → '+JSON.stringify({n:c.noeuds,pads:c.pads,j:c.jonctions,r:c.rameaux,b:c.broches}));
  /* 31/10 — Wah : « l'arbre prend tout l'écran (en particulier la partie haute), les branches s'élargissent sur tout l'écran ; le
     Totehm-cœur fait la jonction avec les branches et le haut du tronc ; à la base des racines se trouve le curseur, intégré ». */
  const A=c.arbre;
  ok(A.couronne===56&&A.cg<=40&&A.cd<=40&&A.hautsTouches,'04/11 · les 56 pointes de la COURONNE touchent chacune le haut de l\'écran, sur toute sa largeur → '+JSON.stringify({n:A.couronne,g:A.cg,d:A.cd,h:A.ch}));
  ok(A.noeud,'31/10 · le TOTEHM fait la jonction : chaque branche ET chaque piste du tronc part d\'une de ses perforations');
  ok(A.descend&&!A.touche,'les sept pistes descendent en laissant libres les chevrons et le puits de la manette (au plus près : '+A.libre+' px du centre)');
  ok(A.racines===12&&A.enveloppe&&A.jonctions&&A.borne,'les douze RACINES enveloppent les deux côtés et le dessous de la manette, avec quatre vraies fourches et des terminaisons dans l\'écran → '+JSON.stringify({n:A.racines,etendue:A.etendue,g:A.rg,d:A.rd,bas:A.rb}));
  ok(A.avis.integre&&A.avis.continu&&A.avis.marge>=4,'le visuel advisory est dans le tronc : les sept intentions continuent autour de lui et gardent au moins 4 px autour de ses lettres → '+JSON.stringify(A.avis));
  {const [f,s]=A.fruit.split('|'),hex=c=>'#'+(c.match(/\d+/g)||[]).slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('');
   ok(!!s&&hex(f)===s.toLowerCase(),'31/10 · une pastille PLEINE (une Habit) se voit : remplie de SA couleur ('+f+' / '+s+'), plus le noir du creux');}
  /* 18/10 — LES SEPT PISTES VIVENT : une impulsion par intention, épaisse et à la période RÉELLE
     sur une intention habitée, en VEILLE (lente, fine) sur une intention vide ; et la couleur d'un
     creux se LIT (.5, elle valait .22). Wah : « plus de vie dans les traits d'intention, et afficher
     les couleurs ». */
  ok(c.puls.length===7&&c.veille===4&&c.puls.every(x=>/^ram-puls\//.test(x))&&new Set(c.puls.map(x=>x.split('/')[1])).size>=2,
    'ça VIT : sept impulsions, quatre en veille, la période réelle sur les habitées ('+c.puls.join(' · ')+')');
  ok(parseFloat(c.creuxOp)>=.45,'la couleur d\'une intention vide se LIT ('+c.creuxOp+')');
  ok(!c.flou,'aucun flou (socle, ramifications)');
  ok(!c.partis.length,'plus de manette, plus de galaxie, plus de radar (balisage retiré) '+c.partis.join(','));
  ok(c.cotes===2&&c.up==='Get Higher'&&c.dn==='Higher my ChatGPT'&&c.lf==='Media'&&c.rt==='Spots'&&c.mine==='true'&&c.others==='false',
     'quatre chevrons discrets (↑ Get Higher, ↓ Higher my ChatGPT, ← Media, → Spots) ; [Mine] coché');
  ok(c.sigAbs&&c.connAbs&&/to open it · (Turn|Swipe) to configure it$/.test(c.tap)&&c.bouche==='0',
    'plus de nom ni d\'espace membre sur l\'atterrissage : le nom ne vit que sur la face VERSO ; « '+c.tap+' » ; la bouche invisible au centre');
  await pg.screenshot({path:OUT+'/proc_centre_'+(tel?'tel':'ordi')+'.png'});
  await pg.click('#lv-tap-open');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:8000}).catch(()=>{});
  ok(await pg.evaluate(()=>!document.body.classList.contains('gate')),'« '+c.tap+' » ouvre mon TOTEHM (la déconstruction)');
  ok(!erreurs(log).length,'centre : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // Le visiteur garde le visuel dans le tronc, même lorsque son pitch occupe plus de place.
 for(const vp of [{width:390,height:664},{width:390,height:844},{width:1280,height:860},{width:844,height:390}]){
  const{pg,log}=await page(browser,{dir:'com',origin,session:false,viewport:vp,rpc:{my_landing:{signed_in:false}}});
  await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/totehm');
  await pg.waitForFunction(()=>window.__totehm_lv?.().vue==='c'&&!document.body.classList.contains('ses-attente'));
  await pg.waitForTimeout(500);
  const a=await pg.evaluate(()=>{
    const r=s=>document.querySelector(s).getBoundingClientRect(),P=r('#gate-asteroid'),A=r('#lv-parental'),J=r('#lvjoy'),C=r('#lv-c-acts'),H=r('#lv-slogan svg');
    const croise=(a,b)=>a.left<b.right+4&&a.right>b.left-4&&a.top<b.bottom+4&&a.bottom>b.top-4;
    return{papier:P.top>=20&&P.bottom<A.top-12,avis:A.width>60&&Math.abs(A.height/A.width-200/278)<.02&&A.bottom<J.top-8,
      separes:!croise(A,C)&&!croise(C,J),dans:C.left>=0&&C.right<=innerWidth&&C.top>=0&&C.bottom<=innerHeight,
      higher:H.left>P.right-12&&H.top>P.bottom-20&&H.bottom<P.bottom+20};});
  ok(a.papier&&a.avis&&a.separes&&a.dans&&a.higher,`visiteur ${vp.width}×${vp.height} : papier, pitch et advisory restent séparés de la manette ; Higher suit le coin inférieur du papier → `+JSON.stringify(a));
  ok(!erreurs(log).length,'atterrissage visiteur : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();
 }

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
  /* 21/10 — le second geste n'est plus PERDU (Wah : « quelquefois les mouvements ne fonctionnent pas ») : il attend la fin du
     premier, puis part ; jamais deux voyages à la fois. */
  await pg.keyboard.press('ArrowDown');await pg.keyboard.press('ArrowUp');
  const mid=await lv(pg);await pg.waitForFunction(a=>{const d=window.__totehm_lv();return d.allers===a&&!d.bouge;},a0+2,{timeout:6000}).catch(()=>{});
  let d=await lv(pg);ok(mid.vue==='b'&&mid.bouge&&d.vue==='c'&&d.allers===a0+2,'↓ puis ↑ aussitôt : Higher my ChatGPT, PUIS le centre (le second attend, jamais deux à la fois)');
  await pg.keyboard.press('Escape');await vers(pg,'c');
  await pg.keyboard.press('ArrowUp');await vers(pg,'h');
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(500);
  ok((await lv(pg)).vue==='h','↑ : Get Higher ; ↑ encore : rien au-dessus');
  await pg.keyboard.press('ArrowDown');await vers(pg,'c');ok((await lv(pg)).vue==='c','↓ depuis Get Higher : le centre');
  const geste=async dy=>{await pg.waitForTimeout(300);for(let i=0;i<4;i++){await pg.mouse.wheel(0,dy/4);await pg.waitForTimeout(16);}await calme(pg);await pg.waitForTimeout(400);return (await lv(pg)).vue;};
  await pg.mouse.move(640,600);
  const t=[await geste(220),await geste(-220),await geste(-220),await geste(220)];
  ok(t.join(',')==='h,c,b,c','22/10 · le trackpad est un manche, vertical : deux doigts vers le haut (deltaY > 0) → Get Higher : '+t.join(','));
  {await pg.waitForTimeout(300);await pg.mouse.wheel(0,60);await pg.waitForTimeout(900);ok((await lv(pg)).vue==='c','un petit défilement (60 px) ne change pas de vue');}
  /* 22/10 — l'horizontale est un manche : deux doigts vers la gauche (`deltaX > 0`) vont à GAUCHE. */
  const gesteX=async dx=>{await pg.waitForTimeout(300);for(let i=0;i<4;i++){await pg.mouse.wheel(dx/4,0);await pg.waitForTimeout(16);}await calme(pg);await pg.waitForTimeout(400);return (await lv(pg)).vue;};
  const tx=[await gesteX(220),await gesteX(-220),await gesteX(-220),await gesteX(220)];
  ok(tx.join(',')==='g,c,d,c','le trackpad, horizontal : deltaX > 0 → mes shorts, < 0 → mes spots : '+tx.join(','));
  await pg.click('#lvn-dn');await vers(pg,'b');const dn=await pg.$eval('#lvn-dn',e=>getComputedStyle(e).opacity);
  await pg.click('#lvn-up');await vers(pg,'c');
  ok((await lv(pg)).vue==='c'&&dn==='0','les chevrons : ↓ Higher my ChatGPT (en bas, plus de chevron ↓), ↑ le centre');
  ok(!erreurs(log).length,'gestes : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:{width:390,height:844},hasTouch:true,rpc:{my_landing:LAND()}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1000);
  const cdp=await pg.context().newCDPSession(pg);
  const glisse=async(x0,y0,x1,y1)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]});
    for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/6,y:y0+(y1-y0)*i/6}]});await pg.waitForTimeout(16);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await calme(pg);await pg.waitForTimeout(500);return (await lv(pg)).vue;};
  const s=[await glisse(40,780,40,640),await glisse(40,640,40,780),await glisse(40,640,40,780),await glisse(40,780,40,640),
    await glisse(330,560,200,560),await glisse(200,560,330,560),await glisse(200,560,330,560),await glisse(260,400,130,400)];
  /* 20/10 sexies — sur la CARTE, le doigt POSÉ SUR la Terre la fait tourner (27/10 : seulement sur elle ; ailleurs il
     navigue, `com_prise_spot`) ; le chevron, la manette et le trackpad ramènent au centre. */
  ok(s.join(',')==='h,c,b,c,g,c,d,d','22/10 · le doigt est un manche : haut → Get Higher, bas → Higher my ChatGPT, gauche → mes shorts, droite → les spots ; sur la Terre, il la tourne : '+s.join(','));
  await pg.click('#lvn-lf');await vers(pg,'c');ok((await lv(pg)).vue==='c','le chevron ← ramène au centre');
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
  /* 20/10 septies — LE CERVEAU VIBRE : les sept couleurs pleines, rouge lent et ample → violet rapide et fin ;
     placé SOUS la vente, au-dessus de la manette ; immobile si le mouvement est réduit. */
  const cv=async()=>pg.evaluate(()=>{const g=[...document.querySelectorAll('#lv-ram g')],r=window.__totehm_lv().ramifications,
    se=document.getElementById('lv-sell').getBoundingClientRect(),jo=document.getElementById('lvj-box').getBoundingClientRect(),
    ys=g.flatMap(e=>e.querySelector('path').getAttribute('d').split(/[ML]/).filter(Boolean).map(t=>+t.trim().split(' ')[1]));
    return {r,d:g.map(e=>e.querySelector('path').getAttribute('d')),cols:g.map(e=>e.querySelector('path').getAttribute('stroke')),
      ops:g.map(e=>getComputedStyle(e).opacity),haut:Math.min(...ys),bas:Math.max(...ys),sell:se.bottom,joy:jo.top,
      contour:document.querySelectorAll('#lv-ram .sk-c').length,puls:[...document.querySelectorAll('#lv-ram .puls')].map(e=>getComputedStyle(e).opacity)};});
  await pg.waitForFunction(()=>!window.__totehm_lv().ramifications.enCours,null,{timeout:3000}).catch(()=>{});
  const c1=await cv();await pg.waitForTimeout(300);const c2=await cv();
  const fs=c1.r.ondes.map(o=>o.f), amps=c1.r.ondes.map(o=>o.amp);
  ok(c1.r.vue==='h'&&c1.cols.length===7&&c1.cols.join()==='#E24B4A,#e48b31,#fcbe21,#639922,#1D9E75,#378ADD,#7F77DD'&&c1.ops.every(o=>o==='1')&&c1.contour===2,
    (reduit?'mouvement réduit · ':'')+'20/10 septies · le cerveau : sept ondes, les sept couleurs PLEINES, deux hémisphères → '+JSON.stringify({c:c1.cols,o:c1.ops}));
  ok(fs.every((f,i)=>!i||f>fs[i-1])&&fs[0]<.5&&fs[6]>3&&c1.r.ondes[6].cyc>c1.r.ondes[0].cyc*4,'20/10 septies · rouge = basse fréquence, violet = haute fréquence → '+JSON.stringify(fs));
  ok(c1.haut>c1.sell&&c1.bas<c1.joy,'20/10 septies · le cerveau vit ENTRE la vente et la manette → '+JSON.stringify({haut:c1.haut,sell:c1.sell,bas:c1.bas,joy:c1.joy}));
  ok(c1.puls.every(o=>o==='0'),'20/10 septies · pas d\'impulsion dans le cerveau : c\'est l\'onde qui vit');
  if(reduit) ok(!c2.r.vibre&&c1.d.join()===c2.d.join(),'mouvement réduit · le cerveau est immobile (aucun rAF)');
  else ok(c2.r.vibre&&c2.r.vibrations>c1.r.vibrations&&c1.d.join()!==c2.d.join(),'20/10 septies · il VIBRE (les ondes bougent d\'une image à l\'autre) → '+c2.r.vibrations);
  if(!reduit) await pg.screenshot({path:OUT+'/proc_get_higher.png'});
  const req=pg.waitForRequest(r=>r.url().startsWith('https://www.higher.boutique/get_higher'),{timeout:9000}).catch(()=>null);
  await pg.click('#lv-slogan');
  if(!reduit){await pg.waitForTimeout(900);ok((await pg.evaluate(()=>window.__totehm_lsd.langue||window.__totehm_lsd.extase)),'clic : le papier est avalé (la langue rentre avec lui)');}
  const r=await req;
  ok(!!r&&/\/get_higher\?from=com/.test(r.url()),'puis higher.boutique/get_higher?from=com, par le pont ('+(r&&r.url())+')');
  ok(!erreurs(log).length,'Get Higher : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 4 · MEMBERS (20/10 sexies) : plus de galaxie. Le papier GRANDIT avec son socle et son réseau, se retourne,
 // la saisie est sur son dos ; validé, on retombe dans l'écosystème — le SIEN (processeur, médias, spots, offre). ──
 const OFFRE={ok:true,pseudo:'kai3',palette:['flow','express'],sale:{open:true,price_cents:2400,currency:'eur',period:'year'},
   viewer:{signed_in:true,me:false,subscribed:false,until:null,ending:false,can_read:true}};
 for(const [vp,tel] of [[{width:390,height:844},true],[{width:1280,height:800},false]]){
  const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:vp,hasTouch:tel,
    rpc:{my_landing:LAND(),habit_spaces:{ok:true,habits:[]},element_cloths:{ok:true,elements:[]},
         totehm_read:b=>b.p_pseudo==='kai3'?AUTRE:b.p_pseudo==='lock'?{ok:false,why:'subscribe',pseudo:'lock'}:{ok:false,why:'nobody'},
         creator_page:b=>b.p_pseudo==='lock'?Object.assign({},OFFRE,{pseudo:'lock'}):OFFRE,
         member_media:{ok:true,items:[]},club_spots_of:{ok:true,items:[],total:0}}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1000);await ouvre(pg);
  const p0=await pg.evaluate(()=>document.getElementById('gate-asteroid').getBoundingClientRect().width);
  const habits0=(await lv(pg)).ramifications.habits;
  await pg.click('#lv-m-members');await calme(pg);await pg.waitForTimeout(700);
  const o=await pg.evaluate(()=>{const q=s=>document.querySelector(s),d=window.__totehm_lv(),p=q('#gate-asteroid').getBoundingClientRect(),
      k=q('#lv-socket').getBoundingClientRect(),u=q('#mb-q').getBoundingClientRect();
    return {mode:d.mode,m:d.membre,pw:p.width,pcx:p.x+p.width/2,pcy:p.y+p.height/2,sk:k.width,dos:q('#gate-card').classList.contains('is-back'),
      focus:document.activeElement&&document.activeElement.id,ui:getComputedStyle(q('#mb-ui')).visibility,
      surLui:Math.abs(u.x+u.width/2-(p.x+p.width/2))<3&&u.y>p.y&&u.bottom<p.bottom,
      ram:getComputedStyle(q('#lv-ram')).opacity,asp:document.body.classList.contains('is-aspire'),pistes:document.querySelectorAll('#lv-ram path:not(.puls):not(.sk):not(.fk)').length,
      coude:(()=>{const r=[...document.querySelectorAll('#lv-ram rect')][0];return r?+r.getAttribute('y'):0;})(),
      checked:q('#lv-m-members').getAttribute('aria-checked'),gx:!!q('#gx-c'),haut:p.y<160};});
  ok(o.mode==='members'&&o.m.cherche&&o.checked==='true'&&!o.gx,(tel?'téléphone':'ordinateur')+' · [Members] : plus de galaxie, la recherche');
  ok(o.pw>p0*1.9&&o.dos&&o.haut,'le papier GRANDIT (×'+(o.pw/p0).toFixed(1)+'), sans boîte, se pose sur son DOS, ancré en haut');
  ok(o.focus==='mb-q'&&o.ui==='visible'&&o.surLui,'la saisie est SUR le dos du papier, et elle a déjà le focus (le clavier s\'ouvre dans le geste)');
  ok(o.ram==='0'&&o.asp&&o.pistes===7,'25/10 · calquée sur le clic : les sept traits sont ASPIRÉS dans le TOTEHM pendant la recherche');
  if(tel) await pg.screenshot({path:OUT+'/proc_members_'+(tel?'tel':'ordi')+'.png'});
  // un nom inconnu, puis un Totehm à abonnement : un refus ne touche jamais à MON état
  await pg.fill('#mb-q','nobody');await pg.keyboard.press('Enter');await pg.waitForTimeout(500);
  const n1=await pg.evaluate(()=>({t:document.getElementById('mb-note').textContent,ro:document.body.classList.contains('ro'),h:window.__totehm_lv().ramifications.habits}));
  ok(n1.t==='no TOTEHM by that name'&&!n1.ro&&n1.h===habits0,'un nom inconnu : « '+n1.t+' », et mon Totehm n\'a pas bougé');
  // 25/10 (Wah : « le mode résultat recherche pour la souscription à un Totehm … est devenu totalement obsolète ») :
  // la recherche se termine, le papier rentre ; ses traits sont SA palette, et l'offre se pose sous le papier.
  await pg.fill('#mb-q','lock');await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>document.body.classList.contains('lv-verrou')&&!document.body.classList.contains('mb-cherche'),null,{timeout:6000}).catch(()=>{});
  await calme(pg);await pg.waitForTimeout(900);
  const n2=await pg.evaluate(()=>{const q=s=>document.querySelector(s),p=q('#gate-asteroid').getBoundingClientRect();
    return {d:window.__totehm_lv(),pw:p.width,dos:q('#gate-card').classList.contains('is-back'),qui:q('#lv-m-who').textContent,
      lock:q('#mb-lock').innerText.replace(/\s+/g,' ').trim(),b:(q('#mb-lock [data-mbl]')||{}).textContent||'',tap:q('#lv-tap-open').textContent,
      asp:document.body.classList.contains('is-aspire'),pales:document.querySelectorAll('#lv-ram g.r-0').length,ro:document.body.classList.contains('ro')};});
  ok(n2.d.membre.verrou==='lock'&&!n2.dos&&Math.abs(n2.pw-p0)<2&&n2.qui==='lock'&&!n2.ro&&!n2.asp,
     '25/10 · un Totehm à abonnement : la recherche se termine (le papier rentre, sur son recto), SON nom sur [Members], rien de lui n\'est lu');
  ok(/^SUBSCRIBE · 24 € \/ year$/.test(n2.b)&&/subscribers only/i.test(n2.lock)&&n2.tap==='Subscribe to open it',
     '25/10 · sous le papier, UN geste au prix du serveur ('+n2.b+') ; le papier dit « '+n2.tap+' »');
  ok(n2.pales===5,'25/10 · ses traits ressortent : SA palette (deux intentions habitées), cinq en creux → '+n2.pales);
  await pg.evaluate(()=>document.getElementById('gate-enter').click());await pg.waitForTimeout(400);
  ok(await pg.evaluate(()=>document.body.classList.contains('gate')&&!!document.activeElement&&document.activeElement.dataset.mbl==='sub'),
     '25/10 · un tap sur SON papier n\'ouvre rien : il désigne le geste qui l\'ouvre');
  // 26/10 (Wah : « les mouvements de joystick ne marchent plus quand j'effectue une recherche ») : sur un Totehm verrouillé,
  // la manette va en haut (commun) et en bas (SON offre) ; ← → désignent l'offre (ses médias sont derrière l'abonnement).
  await tire(pg,0,-30);await vers(pg,'h');await pg.waitForTimeout(400);
  const vh=await lv(pg);await tire(pg,0,30);await vers(pg,'c');await pg.waitForTimeout(400);
  await tire(pg,-30,0);await pg.waitForTimeout(300);
  const vg=await pg.evaluate(()=>({d:window.__totehm_lv(),appel:!!document.querySelector('#mb-lock .is-appel')}));
  ok(vh.vue==='h'&&vg.d.vue==='c'&&vg.d.dernierRefus==='voisin:c>g:verrou'&&vg.appel&&vg.d.membre.verrou==='lock',
     '26/10 · Totehm verrouillé : la manette monte (Get Higher) et revient ; tirée à gauche, elle désigne l\'offre '+JSON.stringify({h:vh.vue,c:vg.d.vue,r:vg.d.dernierRefus,a:vg.appel}));
  await tire(pg,0,30);await vers(pg,'b');await pg.waitForTimeout(500);
  const vb=await pg.evaluate(()=>({v:window.__totehm_lv().vue,o:document.getElementById('mb-offre').textContent}));
  ok(vb.v==='b'&&/lock/.test(vb.o)&&/SUBSCRIBE/.test(vb.o),'26/10 · Totehm verrouillé : la manette descend sur SON offre (« '+vb.o.replace(/\s+/g,' ').trim()+' »)');
  await tire(pg,0,-30);await vers(pg,'c');await pg.waitForTimeout(500);
  await pg.click('#lv-m-members');await calme(pg);await pg.waitForTimeout(700);
  // le bon nom : SON écosystème
  const url0=pg.url();
  await pg.fill('#mb-q','kai3');await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>document.body.classList.contains('lv-membre')&&!document.body.classList.contains('mb-cherche'),null,{timeout:8000}).catch(()=>{});
  await calme(pg);await pg.waitForTimeout(800);
  await pg.mouse.move(10,10);await pg.waitForTimeout(250); // la couleur au repos ; le survol des textes est blanc sur ordinateur
  const e=await pg.evaluate(()=>{const q=s=>document.querySelector(s),d=window.__totehm_lv(),p=q('#gate-asteroid').getBoundingClientRect();
    return {d,pw:p.width,dos:q('#gate-card').classList.contains('is-back'),ro:document.body.classList.contains('ro'),qui:q('#lv-m-who').textContent,
      quiVu:getComputedStyle(q('#lv-m-who')).display!=='none',couleur:getComputedStyle(q('#lv-m-who')).color,
      tap:q('#lv-tap').textContent,pales:document.querySelectorAll('#lv-ram g.r-0').length};});
  ok(e.ro&&e.d.mode==='members'&&e.d.membre.chez&&!e.d.membre.cherche&&/[?&]ro=kai3/.test(pg.url())&&pg.url().split('?')[0]===url0.split('?')[0]&&!(await pg.evaluate(()=>window.__ouvert)).length,
    'validé : on retombe dans l\'écosystème — le SIEN, sur place, sans navigation ('+pg.url().replace(origin,'')+')');
  ok(Math.abs(e.pw-p0)<2&&!e.dos,'le papier redescend chez lui, sur son recto');
  ok(e.qui==='kai3'&&e.quiVu&&e.couleur==='rgb(251, 213, 202)','[Members] porte SON nom, en Coral');
  ok(e.d.ramifications.habits!==habits0&&e.pales===5,'le processeur est le SIEN : ses deux intentions habitées, cinq en creux');
  ok(/to open it · (Turn|Swipe) to search$/.test(e.tap),'« '+e.tap+' »');
  // ↓ chez lui : son offre, pas mon pitch ChatGPT
  await pg.keyboard.press('ArrowDown');await vers(pg,'b');await pg.waitForTimeout(700);
  const b=await pg.evaluate(()=>({o:document.getElementById('mb-offre').textContent,pitch:getComputedStyle(document.getElementById('chatgpt-pitch')).display,
    p:(()=>{const p=document.getElementById('gate-asteroid').getBoundingClientRect(),m=document.getElementById('rf-me').getBoundingClientRect();return Math.abs(p.x+p.width/2-(m.x+m.width/2))<4;})()}));
  ok(/kai3/.test(b.o)&&/SUBSCRIBE · 24 € \/ year/.test(b.o)&&b.pitch==='none'&&b.p,'↓ chez un membre : SON profil et SON offre (« '+b.o+' »), jamais mon pitch ChatGPT');
  await pg.keyboard.press('ArrowUp');await vers(pg,'c');await pg.waitForTimeout(500);
  // son Totehm, en lecture, puis on replie : on reste chez lui
  await pg.click('#lv-tap-open');await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});
  await pg.waitForTimeout(600);
  const x=await pg.evaluate(()=>({habits:[...document.querySelectorAll('#habits [data-open]')].map(e=>e.textContent.trim().slice(0,20)),
    ecrit:document.querySelectorAll('#habits [contenteditable],#habits [data-kill],#habits [data-add]').length,qui:(document.getElementById('ro-who')||{}).textContent}));
  ok(x.habits.length===2&&!x.ecrit&&x.qui==='kai3','tap : SON Totehm, en lecture, la même configuration que le mien ('+x.habits.join(' · ')+')');
  await pg.keyboard.press('Escape');await pg.waitForFunction(()=>document.body.classList.contains('gate'),null,{timeout:9000}).catch(()=>{});await pg.waitForTimeout(900);
  ok(await pg.evaluate(()=>document.body.classList.contains('lv-membre')&&document.body.classList.contains('ro')),'replier SON Totehm : on reste dans son écosystème');
  // [Mine] : je redeviens moi
  await pg.click('#lv-m-mine');await calme(pg);await pg.waitForTimeout(1200);
  const m=await pg.evaluate(()=>({d:window.__totehm_lv(),ro:document.body.classList.contains('ro'),cl:document.body.classList.contains('lv-membre')}));
  ok(m.d.mode==='mine'&&!m.ro&&!m.cl&&!/[?&]ro=/.test(pg.url()),'[Mine] : je redeviens moi, et l\'URL aussi '+JSON.stringify({mode:m.d.mode,ro:m.ro,cl:m.cl,u:pg.url().replace(origin,''),v:m.d.vue,b:m.d.bouge}));
  // Échap pendant la recherche : on revient d'où l'on vient
  if(!tel){
    await pg.click('#lv-m-members');await calme(pg);await pg.waitForTimeout(600);
    await pg.keyboard.press('Escape');await calme(pg);await pg.waitForTimeout(900);
    const q=await pg.evaluate(()=>({d:window.__totehm_lv(),w:document.getElementById('gate-asteroid').getBoundingClientRect().width,dos:document.getElementById('gate-card').classList.contains('is-back')}));
    ok(q.d.mode==='mine'&&!q.d.membre.cherche&&Math.abs(q.w-p0)<2&&!q.dos,'Échap pendant la recherche : le papier rentre, sur son recto, chez moi');
  }
  // 26/10 : pendant la recherche, la manette n'est plus morte — le geste QUITTE la recherche (comme Échap) puis voyage
  for(const [dx,dy,v] of [[0,-30,'h'],[0,30,'b']]){
    await pg.click('#lv-m-members');await calme(pg);await pg.waitForTimeout(600);
    const c0=await lv(pg);
    await tire(pg,dx,dy);await pg.waitForFunction(v=>{const d=window.__totehm_lv();return d.vue===v&&!d.bouge;},v,{timeout:5000}).catch(()=>{});await pg.waitForTimeout(500);
    const r=await pg.evaluate(()=>({d:window.__totehm_lv(),w:document.getElementById('gate-asteroid').getBoundingClientRect().width,dos:document.getElementById('gate-card').classList.contains('is-back'),
      asp:document.body.classList.contains('is-aspire'),ui:document.getElementById('mb-ui').getAttribute('aria-hidden')}));
    ok(c0.membre.cherche&&r.d.vue===v&&r.d.mode==='mine'&&!r.d.membre.cherche&&!r.dos&&!r.asp&&r.ui==='true',
       (tel?'téléphone':'ordinateur')+' · 26/10 · recherche ouverte, manette '+(v==='h'?'en haut':'en bas')+' : la recherche se referme, le papier rentre, et on arrive '+JSON.stringify({vue:r.d.vue,mode:r.d.mode,cherche:r.d.membre.cherche,refus:r.d.dernierRefus}));
    await pg.keyboard.press(v==='h'?'ArrowDown':'ArrowUp');await vers(pg,'c');await pg.waitForTimeout(500);
  }
  // un geste reçu pendant que le papier GRANDIT encore : il attend, puis quitte la recherche et voyage
  await pg.click('#lv-m-members');await pg.waitForTimeout(150);await tire(pg,0,-30);
  await pg.waitForFunction(()=>{const d=window.__totehm_lv();return d.vue==='h'&&!d.bouge;},null,{timeout:6000}).catch(()=>{});await pg.waitForTimeout(400);
  const t=await lv(pg);
  ok(t.vue==='h'&&t.mode==='mine'&&!t.membre.cherche,'26/10 · un geste pendant que la recherche s\'ouvre : il attend la fin, la referme, puis monte '+JSON.stringify({vue:t.vue,mode:t.mode,refus:t.dernierRefus}));
  await pg.keyboard.press('ArrowDown');await vers(pg,'c');
  ok(!erreurs(log).length,'MEMBERS : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // ── 4 bis · LES VUES DE CÔTÉ SONT LA TRANSFORMATION DU CENTRE : les sept traits se plient pendant le voyage ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:{width:390,height:844},hasTouch:true,rpc:{my_landing:LAND(),club_spots:{ok:true,items:[],total:0}}});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  const m0=(await lv(pg)).ramifications.morphs;
  await pg.click('#lvn-lf');await pg.waitForTimeout(260);
  const mi=await pg.evaluate(()=>({r:window.__totehm_lv().ramifications,op:getComputedStyle(document.getElementById('lv-ram')).opacity,
    pane:+getComputedStyle(document.getElementById('lv-g')).opacity,pistes:document.querySelectorAll('#lv-ram path:not(.puls)').length}));
  ok(mi.r.enCours&&mi.r.morphs===m0+1&&+mi.op>.5&&mi.pane<.5&&mi.pistes===7,'← en route : les SEPT traits se transforment, visibles, avant que la vue n\'entre (vue à '+mi.pane.toFixed(2)+')');
  await vers(pg,'g');await pg.waitForTimeout(1300);
  /* 26/10 (Wah : « les 7 traits d'intention, de la vue centrale à la vue de gauche, doivent encadrer l'écran ») : chaque trait
     devient un CADRE entier — sa branche fait le côté gauche, sa racine le côté droit — sept cadres emboîtés, 3 px d'écart. */
  const g=await pg.evaluate(()=>{const d=[...document.querySelectorAll('#lv-ram > g > path:not(.puls)')].map(p=>p.getAttribute('d'));
    const pts=s=>s.split('M').filter(Boolean).map(sp=>sp.split('L').map(q=>q.trim().split(/\s+/).map(Number)));
    return {r:window.__totehm_lv().ramifications,t:d.map(pts),W:innerWidth,H:innerHeight,op:getComputedStyle(document.getElementById('lv-ram')).opacity};});
  const coin=(l,x,y)=>l.some(p=>Math.abs(p[0]-x)<=.6&&Math.abs(p[1]-y)<=.6);
  const cadres=g.t.map((t,i)=>{ const m=2+i*3, [a,b]=t;
    return !!a&&!!b&&coin(a,m,m)&&coin(a,m,g.H-m)&&coin(b,g.W-m,m)&&coin(b,g.W-m,g.H-m)
      &&Math.abs(a[a.length-1][0]-b[b.length-1][0])<.6&&Math.abs(a[a.length-1][1]-(g.H-m))<.6; });
  ok(g.r.vue==='g'&&!g.r.enCours&&cadres.length===7&&cadres.every(Boolean),
     '26/10 · arrivé à gauche : les sept traits ENCADRENT l\'écran — sept cadres emboîtés, coins nets, la branche à gauche, la racine à droite → '+cadres.map(Number).join(''));
  await pg.waitForFunction(()=>!document.body.classList.contains('ram-trace'),null,{timeout:4000}).catch(()=>{});await pg.waitForTimeout(900);
  const g2=await pg.evaluate(()=>({op:getComputedStyle(document.getElementById('lv-ram')).opacity,traces:window.__totehm_lv().ramifications.traces}));
  ok(g2.op==='0'&&g2.traces===1,'puis, le cadre tracé, le réseau cède la place à la grille → '+JSON.stringify(g2));
  await pg.click('#lvn-rt');await vers(pg,'c');await pg.waitForTimeout(400);
  await pg.click('#lvn-rt');await pg.waitForTimeout(300);
  const dm=await pg.evaluate(()=>({r:window.__totehm_lv().ramifications,op:getComputedStyle(document.getElementById('lv-ram')).opacity}));
  ok(dm.r.enCours&&+dm.op>.5,'→ en route : les traits se plient autour du monde');
  await vers(pg,'d');await pg.waitForTimeout(1300);
  const dd=await pg.evaluate(()=>{const ps=[...document.querySelectorAll('#lv-ram path:not(.puls)')].map(p=>p.getAttribute('d').split(/[ML]/).filter(Boolean).map(t=>t.trim().split(' ').map(Number)));
    const g=window.__totehm_rdr().carte; return {vue:window.__totehm_lv().ramifications.vue, ys:ps.map(l=>[l[0][1],l[l.length-1][1]])};});
  ok(dd.vue==='d'&&dd.ys.every(([a,b])=>b>a),'arrivé à droite : sept méridiens, du pôle nord au pôle sud');
  /* 20/10 septies — puis ils DISPARAISSENT du globe (comme à gauche) : le réseau s'efface, et la Terre n'en dessine
     aucun — plus aucune longue ligne verticale aux couleurs d'intention sur le canvas. */
  const gl=await pg.evaluate(()=>{const c=document.getElementById('rdr-map'),x=c.getContext('2d'),w=c.width,h=c.height,im=x.getImageData(0,0,w,h).data;
    const C=[[226,75,74],[228,139,49],[252,190,33],[99,153,34],[29,158,117],[55,138,221],[127,119,221]];
    const est=i=>C.some(k=>Math.abs(im[i]-k[0])+Math.abs(im[i+1]-k[1])+Math.abs(im[i+2]-k[2])<60);
    let run=0;for(let cx=0;cx<w;cx+=2){let r=0;for(let y=0;y<h;y++){if(est((y*w+cx)*4)){r++;if(r>run)run=r;}else r=0;}}
    return {run,ram:getComputedStyle(document.getElementById('lv-ram')).opacity,w};});
  ok(gl.ram==='0'&&gl.run<30,'20/10 septies · arrivé : les méridiens ont quitté le globe (réseau à 0, plus longue ligne colorée '+gl.run+' px)');
  ok(!erreurs(log).length,'transformations : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

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
      t:getComputedStyle(q('#gl-t')).opacity,ram:getComputedStyle(q('#lv-ram')).opacity,slogan:getComputedStyle(q('#lv-slogan')).opacity,
      higherCentre:(()=>{const r=q('#lv-slogan').getBoundingClientRect();return Math.abs(r.x+r.width/2-(me.x+me.width/2))<2&&Math.abs(r.y+r.height/2-(me.y+me.height/2))<2;})(),
      tourne:q('#gl-bg').getAnimations().filter(a=>a.effect&&a.effect.getKeyframes().some(k=>/rotate/.test(k.transform||''))).length};});
  ok(b.tours===1&&b.tourne===0,'il a tourné une fois, puis s\'est posé d\'aplomb');
  ok(b.rayon==='50%'&&b.anneau==='1'&&b.centre&&b.points.length===7,'le socle s\'est condensé en ANNEAU autour du profil, sept points aux couleurs des intentions');
  ok(/circle\(29\.5%/.test(b.clip)&&b.rail==='0'&&b.wm==='0'&&b.t==='1'&&b.ram==='0','le papier : un profil autour du T (le même objet), le rail et le wordmark éteints sans tourner ; les ramifications résorbées');
  ok(b.slogan==='1'&&b.higherCentre,'le même badge Higher a voyagé du centre et reste fixe au cœur du GPT');
  await pg.screenshot({path:OUT+'/proc_chatgpt.png'});
  await pg.click('#lvn-up');await pg.waitForTimeout(240);
  const ret=await pg.evaluate(()=>document.getElementById('gl-bg').getAnimations().filter(a=>a.effect&&a.effect.getKeyframes().some(k=>/rotate/.test(k.transform||''))).length);
  await vers(pg,'c');await pg.waitForTimeout(900);
  const c=await pg.evaluate(()=>({clip:getComputedStyle(document.getElementById('ast-front')).clipPath,r:getComputedStyle(document.getElementById('lv-socket')).borderTopLeftRadius,ram:getComputedStyle(document.getElementById('lv-ram')).opacity}));
  ok(ret===1&&c.r==='0px'&&c.ram==='1'&&!/29\.5/.test(c.clip),'le retour aussi est animé (#gl-bg tourne à l\'envers) : le socle carré, les ramifications');
  ok(!erreurs(log).length,'condensation : aucune erreur '+erreurs(log).join(' | '));await pg.context().close();}

 // Le pitch gratuit, les états de compte et les retours Higher sont vérifiés dans com_chatgpt.mjs.
 // Le chat retiré n'a plus de saisie, quota, ajout de Habit ou publication Spot dans cette vue.

 // ── 7 · MOUVEMENT RÉDUIT : tout marche, rien ne tourne ni ne glisse ──
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:{width:390,height:844},rpc:{my_landing:LAND()}});
  await pg.emulateMedia({reducedMotion:'reduce'});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(900);
  const tr=await pg.evaluate(()=>['lv-socket','lv-b','mb-ui'].map(i=>getComputedStyle(document.getElementById(i)).transitionDuration));
  await pg.keyboard.press('ArrowDown');await vers(pg,'b');
  const b=await pg.evaluate(()=>({tours:window.__totehm_lv().tours,anim:document.getElementById('gl-bg').getAnimations().filter(a=>a.effect&&a.effect.getKeyframes().some(k=>/rotate/.test(k.transform||''))).length}));
  await pg.keyboard.press('ArrowUp');await vers(pg,'c');
  await pg.click('#lv-m-members');await calme(pg);await pg.waitForTimeout(600);
  const g=await lv(pg);
  ok(tr.every(t=>/^0s/.test(t))&&b.tours===0&&b.anim===0,'mouvement réduit : aucune transition, #gl-bg ne tourne pas ('+tr.join(' ')+')');
  ok(g.mode==='members'&&g.membre.cherche&&!g.ramifications.enCours&&await pg.evaluate(()=>document.activeElement.id==='mb-q'),'MEMBERS : la saisie est là, sans animation');
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

}finally{await browser.close();}
