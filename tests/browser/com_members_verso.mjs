// COM · 18/11/2026 — [MEMBERS] : LA RECHERCHE EST SUR LE VERSO.
// Wah : « quand l'utilisateur clique sur [Members], le verso du TOTEHM s'affiche avec le mode recherche, dans le même format
// que le nom du TOTEHM. Ensuite l'abonnement au même format que [Monetize my TOTEHM]. La même fluidité que pour [Mine].
// Une fois abonné, toujours dans le verso, on retourne vers le recto et on navigue dans le TOTEHM ; on le ferme, on retrouve
// l'atterrissage : ← ses médias, → ses spots. Le joystick dans la vue [Member] : seulement gauche, centre, droite » ·
// « tu entres le nom, tu entres, et tu as un résultat — pas d'entre-deux ».
// Tout est simulé (harness) : aucune écriture. LANCER : node com_members_verso.mjs /tmp
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'.';
const origin='https://www.totehm.com';
const UID='11111111-1111-4111-8111-111111111111';
const tables={profiles:[{pseudo:'wah'}],totehms:[{user_id:UID,habits:[{t:'Run the hill',t0:'Run the hill',is:['fight']}],vis:'private'}]};
const LAND={signed_in:true,pseudo:'wah',visibility:'private',offer:{enabled:false,open:false},higher:{active:false},thp:false};
const GVA={ok:true,pseudo:'gva',palette:['flow','love'],sale:{open:true,price_cents:8400,currency:'eur',period:'year'},
  viewer:{signed_in:true,me:false,subscribed:true,until:'2027-11-18T13:02:59Z',ending:false,can_read:true}};
const KAI={ok:true,pseudo:'kai',palette:['focus'],sale:{open:true,price_cents:2400,currency:'eur',period:'year'},
  viewer:{signed_in:true,me:false,subscribed:false,until:null,ending:false,can_read:false}};
const LU={ok:true,pseudo:'gva',habits:[{t:'Swim at dawn',i:'flow',is:['flow']},{t:'Write it down',i:'love',is:['love']}],
  objectives:[],objs:{},repulsions:[],stories:[],visions:[]};
const rpc={my_landing:LAND, figher_access:{signed_in:true,member:true},
  creator_page:b=>({gva:GVA,kai:KAI})[String(b.p_pseudo||'').toLowerCase()]||{ok:false,why:'nobody'},
  totehm_read:b=>b.p_pseudo==='gva'?LU:{ok:false,why:'subscribe',pseudo:b.p_pseudo},
  member_media:{ok:true,items:[]}, club_spots_of:{ok:true,items:[],total:0}, habit_spaces:{ok:true,habits:[]}, element_cloths:{ok:true,elements:[]}};
const functions={'creator-subscribe':{already:true}};
const erreurs=log=>log.errors.filter(e=>e.startsWith('pageerror'));
const C=pg=>pg.evaluate(()=>window.__totehm_cherche());
const L=pg=>pg.evaluate(()=>window.__totehm_lv());
const ouvert=pg=>pg.waitForFunction(()=>{const c=window.__totehm_cherche();return c&&c.ouvert;},null,{timeout:8000}).then(()=>true).catch(()=>false);
const ferme=pg=>pg.waitForFunction(()=>!document.getElementById('srch').classList.contains('is-on'),null,{timeout:8000}).then(()=>true).catch(()=>false);
const browser=await launch();
try{
 for(const [vp,tel] of [[{width:390,height:844},true],[{width:1280,height:800},false]]){
  const quoi=tel?'téléphone':'ordinateur';
  const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc,functions,viewport:vp,hasTouch:tel});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1300);
  await pg.evaluate(()=>{window.__ouvert=[];window.open=u=>{window.__ouvert.push(u);return null;};});

  /* ── 1 · [Members] retourne le TOTEHM sur son verso, en mode recherche ── */
  await pg.click('#lvn-dn');
  const focusTot=await pg.evaluate(()=>document.activeElement&&document.activeElement.id);
  ok(await ouvert(pg),quoi+' · [Members] retourne le TOTEHM sur son verso, en mode recherche');
  await pg.waitForTimeout(500);
  const v=await pg.evaluate(()=>{const q=document.getElementById('mb-q'),cs=getComputedStyle(q),sn=getComputedStyle(document.getElementById('self-name'));
    const cache=id=>{const e=document.getElementById(id);return !e||getComputedStyle(e).display==='none';};
    return {onglets:window.__ouvert.length,focus:document.activeElement===q,police:cs.fontFamily,taille:cs.fontSize,couleur:cs.color,
      memePolice:cs.fontFamily===sn.fontFamily&&cs.letterSpacing===sn.letterSpacing,dos:document.getElementById('ast-name').textContent,
      reglages:['vs-tabs','vs-dash','lv-card','member-window','self-mail'].every(cache),res:document.getElementById('mb-res').innerHTML};});
  ok(focusTot==='mb-q'&&v.focus,quoi+' · la saisie est mise au point DANS le geste (le clavier du téléphone s\'ouvre) → '+focusTot);
  ok(v.onglets===0&&/Quantico/.test(v.police)&&v.couleur==='rgb(251, 213, 202)'&&v.memePolice,
     quoi+' · aucun onglet ; la saisie a le format du nom du TOTEHM (Quantico corail, '+v.taille+')');
  ok(v.reglages&&v.dos===''&&v.res==='',quoi+' · ce n\'est pas MON verso : ni mes réglages, ni mon nom au dos du papier, aucun résultat avant Entrée');
  await pg.screenshot({path:OUT+'/members_verso_'+(tel?'tel':'ordi')+'.png'});

  /* ── 2 · Une recherche explicite donne une fiche, au format de Monetize. ── */
  await pg.keyboard.type('kai');await pg.waitForTimeout(500);
  const avant=log.rpc.filter(x=>x.name==='creator_page').length;
  ok(avant===0&&(await pg.evaluate(()=>document.getElementById('mb-res').innerHTML))==='',quoi+' · taper ne lance rien : aucune liste, aucune requête');
  await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>window.__totehm_cherche().etat==='offre',null,{timeout:6000}).catch(()=>{});
  const o=await pg.evaluate(()=>{const r=document.getElementById('mb-res');return {
    prix:r.querySelector('h2').textContent,sous:r.querySelector('.mb-result-detail').textContent,
    actions:[...r.querySelectorAll('[data-mb]')].map(b=>b.textContent),
    cut:r.querySelector('.mb-result-note').textContent,nom:document.getElementById('mb-q').value,
    icones:r.querySelectorAll('button svg').length,
    palette:r.querySelector('.mb-intentions').getAttribute('aria-label'),
    fond:getComputedStyle(r.querySelector('.mb-result')).backgroundColor};});
  /* 23/11 (Wah) : « tu gardes seulement le prix avec la possibilité d'annuler et le bouton [Discover] » + la règle du cut off */
  ok(o.prix==='24 €'&&o.sous==='per year · stop anytime'&&o.actions.join()==='Discover'&&!o.icones
     &&/can cut you off at any time/.test(o.cut)&&o.nom==='kai'&&o.fond==='rgb(0, 0, 0)'&&o.palette==='Intentions: Focus',
     quoi+' · l’offre rassemble le prix annuel, Discover et la règle d’accès → '+JSON.stringify(o));
  await pg.screenshot({path:OUT+'/members_offre_'+(tel?'tel':'ordi')+'.png'});
  ok(log.rpc.filter(x=>x.name==='creator_page').length===1&&!log.rpc.some(x=>x.name==='totehm_read'),quoi+' · une lecture de son offre ; son TOTEHM fermé n\'est pas lu');
  /* 18/11 (Wah : « ressors ici le Discover de la creator economy, qu'on ne trouve nulle part ») : [Discover] ouvre SA page
     d'abonnement en Discover par-dessus le verso ; s'y abonner part aussi avec `from:verso` ; refermé, le verso est là */
  await pg.click('#mb-res [data-mb="disc"]');
  const xo=await pg.waitForFunction(()=>{const x=window.__totehm_xo&&window.__totehm_xo();return x&&x.actif==='univers';},null,{timeout:8000}).then(()=>true,()=>false);
  const src=await pg.evaluate(()=>{const e=document.querySelector('#xo .xo-f.is-on');return e&&e.getAttribute('src');});
  const cadre=pg.frameLocator('#xo .xo-f.is-on');
  const dc=await cadre.locator('#offer .dc-s.is-on .dc-h').textContent({timeout:9000}).catch(()=>'');
  ok(xo&&src==='/@kai?embed=1&from=verso'&&/Inside the mind/i.test(dc),quoi+' · [Discover] : le Discover de la creator economy (SA page), par-dessus le verso → '+JSON.stringify({src,dc}));
  await cadre.locator('#cta [data-do="subscribe"]').click({timeout:8000}).catch(()=>{});await pg.waitForTimeout(800);
  const f2=log.functions.filter(x=>x.name==='creator-subscribe').at(-1);
  ok(!!f2&&f2.body.from==='verso'&&f2.body.pseudo==='kai',quoi+' · s\'abonner DANS le Discover part aussi avec `from:verso` → '+JSON.stringify(f2&&f2.body));
  const lectures=log.rpc.filter(x=>x.name==='creator_page').length;
  await pg.click('#xo-x');
  await pg.waitForFunction(()=>!window.__totehm_xo().actif,null,{timeout:8000}).catch(()=>{});
  await pg.waitForFunction(()=>document.querySelector('#mb-res [data-mb="disc"]')===document.activeElement
    &&document.getElementById('mb-res').getAttribute('aria-busy')==='false',null,{timeout:6000});
  ok((await C(pg)).ouvert&&(await C(pg)).etat==='offre'&&log.rpc.filter(x=>x.name==='creator_page').length>lectures,
    quoi+' · Discover refermé, la fiche et le focus reviennent pendant la relecture');
  /* taper efface le résultat : pas d'entre-deux */
  await pg.click('#mb-q');await pg.keyboard.press('End');await pg.keyboard.type('x');await pg.waitForTimeout(200);
  ok((await C(pg)).etat==='vide'&&(await pg.evaluate(()=>document.getElementById('mb-res').innerHTML))==='',quoi+' · retaper efface le résultat');
  await pg.fill('#mb-q','zz');await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>window.__totehm_cherche().etat==='personne',null,{timeout:6000}).catch(()=>{});
  ok(/No TOTEHM by that name/.test(await pg.textContent('#mb-res')),quoi+' · la fiche indique le nom inconnu');
  await pg.click('#mb-res [data-mb="editer"]');
  ok(await pg.locator('#mb-q').evaluate(e=>e===document.activeElement&&e.selectionStart===0&&e.selectionEnd===2),
    quoi+' · Edit name permet de corriger le nom immédiatement');

  /* ── 3 · abonné : mon année chez lui ; son TOTEHM est lu d'avance, ⟲ / [Open] le retourne sur SON recto ── */
  await pg.fill('#mb-q','GVA');await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>{const c=window.__totehm_cherche();return c.etat==='abonne'&&c.lu;},null,{timeout:6000}).catch(()=>{});
  const a=await pg.evaluate(()=>({t:document.querySelector('#mb-res h2').textContent,s:document.querySelector('#mb-res .mb-result-detail').textContent,
    q:document.getElementById('mb-q').value,ouvrir:!document.querySelector('#mb-res [data-mb="open"]').disabled,
    reste:document.getElementById('mb-res').textContent,icones:document.querySelectorAll('#mb-res button svg').length,
    flip:getComputedStyle(document.getElementById('srch-flip')).display}));
  ok(a.t==='Subscribed'&&/^renews .*Nov 2027$/.test(a.s)&&a.q==='gva'&&a.ouvrir&&a.reste===a.t+a.s+'Open'&&!a.icones,
    quoi+' · le résultat indique l’abonnement, son échéance et Open dès que le recto est prêt → '+JSON.stringify(a));
  ok(a.flip==='flex',quoi+' · la touche ⟲ est disponible quand son TOTEHM est lu');
  await pg.screenshot({path:OUT+'/members_abonne_'+(tel?'tel':'ordi')+'.png'});
  if(tel) await pg.click('#mb-res [data-mb="open"]'); else await pg.click('#srch-flip');
  await pg.waitForFunction(()=>document.body.classList.contains('ro')&&!document.body.classList.contains('gate')&&!document.getElementById('srch').classList.contains('is-on'),null,{timeout:9000}).catch(()=>{});
  await pg.waitForTimeout(500);
  const r=await pg.evaluate(()=>({ro:document.body.classList.contains('ro'),gate:document.body.classList.contains('gate'),qui:document.title,barre:!!document.getElementById('ro-bar'),
    habits:document.querySelectorAll('#habits [data-open]').length,ecrit:document.querySelectorAll('#habits [contenteditable],#habits [data-kill],#habits [data-add]').length,
    url:location.search,mode:window.__totehm_lv().mode,piece:window.__totehm_piece()}));
  ok(r.ro&&!r.gate&&r.qui==='gva · TOTEHM'&&!r.barre&&r.habits===2&&r.ecrit===0&&/ro=gva/.test(r.url)&&r.mode==='members',
     quoi+' · '+(tel?'[Open]':'⟲')+' : SON TOTEHM, en lecture, déployé '+(tel?'':'(la pièce se retourne) ')+'→ '+JSON.stringify({...r,piece:undefined}));
  if(!tel) ok(r.piece.versRecto>=1&&r.piece.dessous>=1,'ordinateur · la PIÈCE : son recto se déploie sous le verso puis se retourne (pas d\'atterrissage entre les deux) → '+JSON.stringify(r.piece));
  ok((await pg.evaluate(()=>document.getElementById('ast-name').textContent))==='wah',quoi+' · le dos de MON papier reprend mon nom');

  /* ── 4 · ordinateur : son recto se retourne sur SON verso (même principe que [Mine]) ── */
  if(!tel){
    ok(await pg.isVisible('#fold-flip'),'ordinateur · chez un membre, son recto porte ⟲ (son verso)');
    await pg.click('#fold-flip');
    ok(await ouvert(pg),'ordinateur · ⟲ sur SON recto : SON verso, en mode recherche');
    await pg.waitForFunction(()=>window.__totehm_cherche().etat==='abonne',null,{timeout:6000}).catch(()=>{});
    ok((await pg.evaluate(()=>document.getElementById('mb-q').value))==='gva'&&(await C(pg)).etat==='abonne','ordinateur · son verso dit mon année chez lui');
    await pg.keyboard.press('Escape');
    await pg.waitForFunction(()=>!document.getElementById('srch').classList.contains('is-on'),null,{timeout:8000}).catch(()=>{});
    await pg.waitForTimeout(400);
    ok(await pg.evaluate(()=>document.body.classList.contains('ro')&&!document.body.classList.contains('gate')),'ordinateur · Échap retourne le verso sur SON recto');
  }

  /* ── 5 · on ferme SON TOTEHM : SON atterrissage, ← ses médias · ● · → ses spots, ni haut ni bas ── */
  await pg.keyboard.press('Escape');
  await pg.waitForFunction(()=>document.body.classList.contains('gate')&&!window.__totehm_lv().bouge,null,{timeout:9000}).catch(()=>{});
  await pg.waitForTimeout(900);
  const m=await pg.evaluate(()=>({membre:document.body.classList.contains('lv-membre'),qui:document.getElementById('lv-m-who').textContent,
    morts:['lvn-up','lvn-dn'].map(id=>document.getElementById(id).classList.contains('is-mort')),vivants:['lvn-lf','lvn-rt'].map(id=>!document.getElementById(id).classList.contains('is-mort'))}));
  ok(m.membre&&m.qui==='gva'&&m.morts.every(Boolean)&&m.vivants.every(Boolean),quoi+' · fermé : SON atterrissage ; le joystick = gauche · centre · droite → '+JSON.stringify(m));
  await pg.keyboard.press('ArrowUp');await pg.waitForTimeout(1100);
  ok((await L(pg)).vue==='c',quoi+' · chez un membre, ↑ ne mène nulle part (le haut et le bas sont à [Mine])');
  await pg.click('#lvn-lf');await pg.waitForFunction(()=>{const d=window.__totehm_lv();return d.vue==='g'&&!d.bouge;},null,{timeout:6000}).catch(()=>{});
  ok((await L(pg)).vue==='g'&&log.rpc.some(x=>x.name==='member_media'&&x.body.p_pseudo==='gva'),quoi+' · ← : SES médias');
  await pg.click('#lvn-rt');await pg.waitForFunction(()=>{const d=window.__totehm_lv();return d.vue==='c'&&!d.bouge;},null,{timeout:6000}).catch(()=>{});
  await pg.waitForTimeout(500);

  /* ── 6 · [Mine] : je redeviens moi ; la croix d'une recherche vide rend MON atterrissage ── */
  await pg.click('#lv-m-sel');
  await pg.waitForFunction(()=>window.__totehm_lv().mode==='mine'&&!document.body.classList.contains('ro'),null,{timeout:9000}).catch(()=>{});
  await pg.waitForTimeout(1200);
  ok((await L(pg)).mode==='mine'&&!/ro=/.test(await pg.evaluate(()=>location.search)),quoi+' · [Mine] : je redeviens moi');
  await pg.click('#lvn-dn');ok(await ouvert(pg),quoi+' · [Members] rouvre la recherche');
  await pg.waitForTimeout(400);
  /* 23/11 (Wah : « un genre de zoom fullscreen ») — mesuré image par image : le fond du verso ne GRANDIT jamais en se refermant */
  await pg.evaluate(()=>{ const b=document.getElementById('srch-bg'); window.__largeurs=[];
    const t0=performance.now(); (function f(){ if(document.getElementById('srch').classList.contains('is-on')) window.__largeurs.push(Math.round(b.getBoundingClientRect().width)); if(performance.now()-t0<1400) requestAnimationFrame(f); })(); });
  await pg.click('#srch-x');ok(await ferme(pg),quoi+' · la croix referme la recherche');
  await pg.waitForTimeout(900);
  { const l=await pg.evaluate(()=>window.__largeurs), d=l.filter(Boolean), max=Math.max(...d);
    ok(d.length>5&&max<=d[0]+2,quoi+' · la croix : le verso rétrécit depuis sa taille, sans passer par le plein écran (départ '+d[0]+' px, max '+max+' px)'); }
  const fin=await pg.evaluate(()=>({mode:window.__totehm_lv().mode,ro:document.body.classList.contains('ro'),dos:document.getElementById('ast-name').textContent,
    cherche:document.getElementById('srch').classList.contains('is-cherche')}));
  ok(fin.mode==='mine'&&!fin.ro&&fin.dos==='wah'&&!fin.cherche,quoi+' · rien trouvé : MON atterrissage, mon nom au dos, le verso redevient le mien → '+JSON.stringify(fin));
  ok(!erreurs(log).length&&!log.rpc.some(x=>/_set|_save|_create|_delete/.test(x.name)),quoi+' · aucune erreur, aucune écriture '+erreurs(log).join(' | '));
  await pg.context().close();
 }

 /* ── 7 · un ancien lien `/search` et le retour de Stripe : `?members=<nom>` ouvre le verso sur ce nom ── */
 {let lectures=0;
  const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{...rpc,creator_page:()=>++lectures===1
    ?{...GVA,viewer:{...GVA.viewer,subscribed:false,can_read:false}}:GVA},functions,viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm?members=gva&subscribed=1');await pg.waitForSelector('body.member');
  ok(await ouvert(pg),'`?members=gva&subscribed=1` : le verso s\'ouvre en recherche');
  ok(await pg.locator('#mb-res h2').textContent()==='Checking access…'&&await pg.locator('#mb-res button').count()===0,
    'retour de Stripe : la fiche attend la confirmation du serveur');
  await pg.waitForFunction(()=>{const c=window.__totehm_cherche();return c.etat==='abonne'&&c.lu;},null,{timeout:8000}).catch(()=>{});
  const s=await pg.evaluate(()=>({etat:window.__totehm_cherche().etat,q:document.getElementById('mb-q').value,url:location.search}));
  ok(s.etat==='abonne'&&s.q==='gva'&&!/members|subscribed/.test(s.url),'retour de Stripe : mon année chez gva, et l\'adresse se nettoie → '+JSON.stringify(s));
  ok(!erreurs(log).length,'retour : aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();}

 /* Les états de recherche et de lecture, y compris une réponse qui arrive après une autre saisie. */
 {let pannes=0, lectures=0, relacher, lancee;
  const attente=new Promise(r=>{ lancee=r; });
  const FERME={...KAI,pseudo:'mira',palette:[],sale:{open:false}};
  const PARTAGE={...GVA,pseudo:'alix',viewer:{...GVA.viewer,subscribed:false,can_read:true}};
  const MOI={...FERME,pseudo:'wah',viewer:{me:true}};
  const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:{width:320,height:568},hasTouch:true,
    rpc:{...rpc,
      my_console:{signed_in:true,subscriptions:[{creator:'gva',status:'active'},{creator:'ancien',status:'canceled'}]},
      creator_page:async b=>{
        const n=b.p_pseudo.toLowerCase();
        if(n==='fantome'){ await new Promise(r=>{ relacher=r; lancee(); }); return GVA; }
        return {kai:KAI,mira:FERME,wah:MOI,alix:PARTAGE,panne:{...KAI,pseudo:'panne'},ferdinand:{...GVA,pseudo:'ferdinand'},
          prive:{ok:false,why:'private'}}[n]||{ok:false,why:'nobody'};
      },
      totehm_read:b=>b.p_pseudo==='alix'?{...LU,pseudo:'alix'}:{ok:false,why:'subscribe'}},
    network:(u,r)=>{
      const appel=u.pathname.match(/\/rpc\/(creator_page|totehm_read)$/)?.[1];
      if(!appel) return null;
      const n=JSON.parse(r.postData()).p_pseudo;
      if((appel==='creator_page'&&n==='panne'&&++pannes===1)||(appel==='totehm_read'&&n==='alix'&&++lectures===1))
        return {status:400,contentType:'application/json',body:JSON.stringify({message:'Temporary failure'})};
      return null;
    }});
  await pg.goto(origin+'/totehm');
  await pg.waitForSelector('body.member');
  await pg.click('#lvn-dn');
  ok(await ouvert(pg),'écran de 320 px · le verso de recherche s’ouvre');
  const q=pg.locator('#mb-q'), res=pg.locator('#mb-res'), action=k=>res.locator('[data-mb="'+k+'"]');
  const etat=e=>pg.waitForFunction(e=>window.__totehm_cherche().etat===e,e,{timeout:7000});
  async function chercher(n,e){
    await q.fill(n); await pg.locator('#mb-go').tap(); await etat(e);
  }
  await res.locator('[data-mb-abo="gva"]').waitFor();
  ok(await res.locator('[data-mb-abo]').count()===1&&await res.locator('[data-mb-abo] svg').count()===0,
    'champ vide · seuls les noms des abonnements actifs sont proposés');
  await chercher('https://example.com/@gva','court');
  ok(/Use a TOTEHM name or link/.test(await res.textContent())&&!log.rpc.some(x=>x.name==='creator_page'),
    'un lien d’un autre site demande un nom ou un lien TOTEHM');
  await chercher('fantome','cherche'); await attente;
  ok(await res.getAttribute('aria-busy')==='true'&&await res.locator('button').count()===0,
    'pendant la recherche, la fiche n’affiche aucune action périmée');
  await chercher('https://www.totehm.com/totehm?members=KAI&subscribed=1','offre');
  relacher();
  ok(await q.inputValue()==='kai'&&await action('disc').isVisible()&&await pg.locator('#mb-go svg').count()===0
    &&!await pg.locator('#srch-flip').isVisible()&&!log.rpc.some(x=>x.name==='totehm_read'),
    '[Search] accepte un lien TOTEHM et une réponse tardive ne remplace plus la fiche');
  const cadrage=await res.locator('.mb-result').evaluate(e=>{
    const a=e.getBoundingClientRect(), b=e.querySelector('button').getBoundingClientRect();
    return a.left>=0&&a.right<=innerWidth&&b.height>=44&&b.right<=a.right;
  });
  ok(cadrage,'écran de 320 px · la fiche et sa touche restent entières');
  await pg.screenshot({path:OUT+'/members_offre_320.png',animations:'disabled'});
  await pg.locator('#mb-clear').tap();
  await res.locator('[data-mb-abo="gva"]').waitFor();
  ok(await q.inputValue()===''&&await q.evaluate(e=>e===document.activeElement),'effacer le nom retrouve mes écosystèmes');
  await chercher('mira','ferme');
  ok(/Subscriptions closed/.test(await res.textContent())&&await action('disc').count()===0,'les abonnements fermés ne proposent pas de Discover');
  await chercher('prive','prive');
  ok(/This TOTEHM is private/.test(await res.textContent())&&await action('open').count()===0,'un accès privé ne propose pas Open');
  await chercher('panne','panne');
  ok(/Search unavailable/.test(await res.textContent())&&await action('retry').isVisible(),'une erreur réseau propose de réessayer la recherche');
  await action('retry').tap(); await etat('offre');
  ok(await action('disc').isVisible(),'réessayer retrouve l’offre avec le même nom');
  await chercher('alix','panne');
  ok(/Couldn’t open this TOTEHM/.test(await res.textContent())&&!await pg.locator('#srch-flip').isVisible(),
    'un recto en erreur propose de réessayer au lieu de laisser Open désactivé');
  await action('retry').tap(); await etat('abonne');
  ok(await res.locator('h2').textContent()==='Shared access'&&await action('open').isVisible()
    &&await res.locator('.mb-result-detail').count()===0,
    'un accès partagé s’ouvre dès que la lecture réussit');
  await chercher('ferdinand','indisponible');
  ok(/No shared views/.test(await res.textContent())&&await action('disc').count()===0&&await action('open').count()===0,
    'un abonnement sans vue lisible propose de vérifier l’accès');
  await chercher('wah','moi');
  await action('mine').tap();
  await pg.waitForFunction(()=>!document.body.classList.contains('gate')&&!document.body.classList.contains('ro')
    &&!document.getElementById('srch').classList.contains('is-on'),null,{timeout:9000});
  ok((await L(pg)).mode==='mine'&&!erreurs(log).length,'son propre résultat ouvre son TOTEHM');
  await pg.context().close();}

 /* ── 8 · 18/11 (Wah : « je ne veux pas de la bande noire en haut du TOTEHM, avec le nom et une petite flèche » · « les
    titres des parties sont décalés vers le haut en touchant le T ») : le TOTEHM d'un membre a la mise en page du mien ── */
 for(const [vp,tel] of [[{width:390,height:844},true],[{width:1280,height:800},false]]){
  const pos={};
  for(const qui of ['moi','gva']){
   const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc,functions,viewport:vp,hasTouch:tel});
   await pg.goto(origin+(qui==='moi'?'/totehm#in':'/totehm?ro=gva#in'));
   await pg.waitForFunction(()=>!document.body.classList.contains('gate'),null,{timeout:12000}).catch(()=>{});
   await pg.waitForTimeout(1500);
   pos[qui]=await pg.evaluate(()=>{const b=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {top:Math.round(r.top),bas:Math.round(r.bottom)};};
     return {T:b('#bigT'),titre:b('#vnow'),liste:b('#fv-inner'),croix:b('#fold-x'),barre:!!document.getElementById('ro-bar'),ro:document.body.classList.contains('ro')};});
   if(qui==='gva') await pg.screenshot({path:OUT+'/membre_deploye_'+(tel?'tel':'ordi')+'.png'});
   ok(!erreurs(log).length,(tel?'téléphone':'ordinateur')+' · '+qui+' déployé : aucune erreur '+erreurs(log).join(' | '));
   await pg.context().close();
  }
  const m=pos.moi, g=pos.gva, quoi=tel?'téléphone':'ordinateur';
  ok(g.ro&&!g.barre&&g.T.top===m.T.top&&g.titre.top===m.titre.top&&g.liste.top===m.liste.top&&g.croix.top===m.croix.top,
     quoi+' · chez un membre : plus de barre noire, le T, le titre, la liste et la croix exactement où ils sont chez moi → '+JSON.stringify({moi:m,gva:g}));
  if(!tel) ok(g.T.bas<=g.titre.top,'ordinateur · le titre de la vue ne touche plus le T ('+g.T.bas+' ≤ '+g.titre.top+')');
 }

 /* ── 9 · un lien vers un TOTEHM illisible (inconnu) : on redevient soi, et une ligne le dit — plus de coquille vide ── */
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{...rpc,totehm_read:{ok:false,why:'nobody'}},functions,viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm?ro=personne');await pg.waitForSelector('body.member');
  await pg.waitForFunction(()=>/No Totehm by that name/.test(document.getElementById('lv-m-say').textContent),null,{timeout:9000}).catch(()=>{});
  const s=await pg.evaluate(()=>({dit:document.getElementById('lv-m-say').textContent,ro:document.body.classList.contains('ro'),url:location.search,mode:window.__totehm_lv().mode}));
  ok(s.dit==='No Totehm by that name.'&&!s.ro&&!/ro=/.test(s.url)&&s.mode==='mine','`?ro=` inconnu : je redeviens moi, et une ligne le dit → '+JSON.stringify(s));
  ok(!erreurs(log).length,'lecture refusée : aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();}
 /* ── 10 · 18/11 (Wah : « ça c'est le Discover qui va dans la section [Monetize my TOTEHM] ») : [Discover] de Monetize ouvre
    `/monetize` (son texte, cinq écrans) par-dessus le verso ; [Set my price] le referme sur le réglage du prix ── */
 {const DASH={ok:true,price_cents:2400,min_cents:300,month_cents:0,subscribers:0,due_cents:0,open:false};
  const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{...rpc,creator_dashboard:DASH,my_console:{signed_in:true,offer:{enabled:false}}},functions,viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.locator('#gate-enter').press('ArrowRight');
  await pg.waitForFunction(()=>document.getElementById('srch').classList.contains('is-open'),null,{timeout:9000}).catch(()=>{});
  await pg.click('#vs-tabs [data-vs-tab="money"]');
  await pg.waitForSelector('#mwc-disc',{state:'visible',timeout:9000}).catch(()=>{});
  await pg.click('#mwc-disc');
  const xo=await pg.waitForFunction(()=>{const x=window.__totehm_xo&&window.__totehm_xo();return x&&x.actif==='monetize';},null,{timeout:8000}).then(()=>true,()=>false);
  const src=await pg.evaluate(()=>{const e=document.querySelector('#xo .xo-f.is-on');return e&&e.getAttribute('src');});
  const cadre=pg.frameLocator('#xo .xo-f.is-on');
  const titre=await cadre.locator('.dc-s.is-on .dc-h').textContent({timeout:9000}).catch(()=>'');
  ok(xo&&src==='/monetize?embed=1'&&/^Monetize your operating system\./.test(titre)&&await pg.isVisible('#xo-x'),
     '[Monetize my TOTEHM] · [Discover] : le Discover de la creator economy côté créateur, par-dessus le verso, une croix → '+JSON.stringify({src,titre}));
  await cadre.locator('#cta [data-setup]').click({timeout:8000}).catch(()=>{});
  await pg.waitForFunction(()=>!window.__totehm_xo().actif,null,{timeout:8000}).catch(()=>{});
  const apres=await pg.evaluate(()=>({xo:window.__totehm_xo().actif,verso:document.getElementById('srch').classList.contains('is-open'),onglet:document.getElementById('srch').dataset.tab}));
  ok(!apres.xo&&apres.verso&&apres.onglet==='money','[Set my price] referme la couche : le verso est là, sur Monetize → '+JSON.stringify(apres));
  ok(!erreurs(log).length,'Monetize · Discover : aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();}

 /* ── 11 · 18/11 (Wah : « your subscribers play by your rules or get cut off instantly » ; ses choix : le créateur coupe
    depuis la liste de ses abonnés, sans remboursement, pour toujours) ── */
 {const DASH={ok:true,price_cents:2400,min_cents:300,month_cents:0,subscribers:1,due_cents:0,open:true};
  let fans=[{pseudo:'kai',since:'2026-11-01T10:00:00Z',until:'2027-11-01T10:00:00Z',ending:false}];
  const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{...rpc,creator_dashboard:DASH,creator_subscribers:()=>({ok:true,items:fans}),
    my_console:{signed_in:true,offer:{enabled:true,open:true}}},
    functions:{...functions,'creator-cut-off':()=>{ fans=[]; return {ok:true,pseudo:'kai',stripe:true}; }},viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.locator('#gate-enter').press('ArrowRight');
  await pg.waitForFunction(()=>document.getElementById('srch').classList.contains('is-open'),null,{timeout:9000}).catch(()=>{});
  await pg.click('#vs-tabs [data-vs-tab="money"]');
  await pg.waitForSelector('#vs-fans [data-cut="kai"]',{state:'visible',timeout:9000}).catch(()=>{});
  const l=await pg.evaluate(()=>({nom:(document.querySelector('#vs-fans .vs-nom')||{}).textContent,h:(document.querySelector('#vs-fans .vs-h')||{}).textContent,
    b:(document.querySelector('#vs-fans [data-cut]')||{}).textContent,t:(document.querySelector('#vs-fans-s .vs-t')||{}).textContent}));
  ok(l.nom==='kai'&&/^since /.test(l.h)&&l.b==='Cut off'&&l.t==='My subscribers','Monetize · « My subscribers » : son nom TOTEHM, ses dates, [Cut off] → '+JSON.stringify(l));
  await pg.click('#vs-fans [data-cut="kai"]');await pg.waitForTimeout(200);
  const a1=await pg.evaluate(()=>({b:document.querySelector('#vs-fans [data-cut]').textContent,dit:document.getElementById('vs-fans-note').textContent}));
  ok(a1.b==='Confirm'&&/no refund/.test(a1.dit)&&/never subscribe to you again/.test(a1.dit)&&!log.functions.some(f=>f.name==='creator-cut-off'),
     '[Cut off] · premier geste : rien ne part, le bouton demande confirmation et dit ce qui arrive → '+JSON.stringify(a1));
  await pg.click('#vs-fans [data-cut="kai"]');
  await pg.waitForFunction(()=>/is cut off/.test(document.getElementById('vs-fans-note').textContent),null,{timeout:8000}).catch(()=>{});
  const f=log.functions.find(x=>x.name==='creator-cut-off');
  const a2=await pg.evaluate(()=>({dit:document.getElementById('vs-fans-note').textContent,reste:document.querySelectorAll('#vs-fans [data-cut]').length}));
  ok(!!f&&f.body.pseudo==='kai'&&/^kai is cut off\.$/.test(a2.dit)&&a2.reste===0,'[Cut off] · second geste : creator-cut-off {pseudo} et kai quitte la liste → '+JSON.stringify({body:f&&f.body,...a2}));
  ok(!erreurs(log).length,'Cut off : aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();}

 /* ── 12 · un abonné coupé retente de s'abonner : le serveur refuse (`banned`), le verso le dit ── */
 {const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc,functions:{'creator-subscribe':{error:'banned'}},viewport:{width:390,height:844},hasTouch:true});
  await pg.goto(origin+'/totehm');await pg.waitForSelector('body.member');await pg.waitForTimeout(1200);
  await pg.click('#lvn-dn');await ouvert(pg);await pg.waitForTimeout(400);
  await pg.keyboard.type('kai');await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>window.__totehm_cherche().etat==='offre',null,{timeout:6000}).catch(()=>{});
  await pg.click('#mb-res [data-mb="disc"]');
  const cadre=pg.frameLocator('#xo .xo-f.is-on');
  await cadre.locator('#cta [data-do="subscribe"]').click({timeout:9000}).catch(()=>{});
  const dit=await cadre.locator('#note').textContent({timeout:6000}).catch(()=>'');
  await pg.waitForTimeout(600);
  const dit2=await cadre.locator('#note').textContent({timeout:3000}).catch(()=>dit);
  ok(/^this ecosystem is closed to you$/.test(dit2),'banni : « this ecosystem is closed to you » dans son Discover, aucun paiement ne s\'ouvre → '+JSON.stringify(dit2));
  ok(!erreurs(log).length,'banni : aucune erreur '+erreurs(log).join(' | '));
  await pg.context().close();}
}finally{ await browser.close(); }
