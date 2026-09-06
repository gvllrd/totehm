/* ══ LES TROIS VUES — UN SEUL MOTEUR · 06/09/2026 ═════════════════════
   `view` vaut 'habits' | 'objectives' | 'repulsions'.

   LE PAPIER NE CHANGE PAS : il est navy dans les trois vues. Ce sont les
   BOÎTES qui portent la couleur — navy, bleu clair, rouge-violet. Le
   Totehm ne se repeint pas, il se déplie : ce qui se déplie, ce sont ses
   pièces, et une pièce a une couleur.

   OUVRIR UNE BOÎTE MONTRE LE TRIP ENTIER, dans ses trois couleurs, ordonné
   par la vue d'où l'on vient : la pièce qu'on touche passe en premier,
   c'est elle qu'on est venu voir. On ne change JAMAIS de vue en éditant.

   IL N'Y A PLUS DE [Add a Trip]. Un seul bouton par vue, qui crée la pièce
   de CETTE vue, vide, et ouvre le triplet dessus. Les deux autres pièces
   sont OFFERTES — reprendre une existante (lookup) ou en écrire une neuve
   — jamais imposées : une habitude sans objectif reste une habitude, et
   forcer les trois empêcherait d'écrire. */
let view='habits';
/* L'ordre AFFICHÉ des trois carrés : c'est lui que suit le doigt et lui
   que suivent les flèches. Une seule liste, sinon les deux divergent. */
const VIEW_ORDER=['repulsions','habits','objectives'];
let TRIPS=[], REPS=[], tripsLoaded=false;

/* Ce qui est ouvert, et ce qui est en train d'être choisi. Six états
   séparés, jamais deux à la fois : deux menus ouverts en même temps, c'est
   un menu de trop. `editH`/`editR` survivent au rendu — c'est le panneau
   qui se souvient de la pièce qu'on écrit. */
let open=null, selOpen=null, intFor=null, lkFor=null,
    editH=null, editR=null, pickFor=null, ordering=false;

/* ── L'IDENTITÉ D'UNE HABITUDE ───────────────────────────────────────
   Une habitude vit dans `state.habits`, un tableau sans identifiant. On
   lui en donne un À L'AFFICHAGE : il ne sert qu'à désigner la ligne qu'on
   édite pendant cette session. Rien ne s'y rattache en base — une
   répulsion pointe une habitude par son TEXTE, parce que `steps` est du
   texte. C'est pour ça que renommer appelle `habit_rename_links`. */
let HSEQ=0;
function habIds(){ (state.habits||[]).forEach(x=>{ if(!x.id)x.id='h'+(++HSEQ); }); }
const habOf  =id=>(state.habits||[]).find(x=>x.id===id)||null;
const habByT =t =>(state.habits||[]).find(x=>x.t===t)||null;
const tripOf =id=>TRIPS.find(t=>String(t.id)===String(id))||null;
const repOf  =id=>REPS.find(r=>String(r.id)===String(id))||null;
/* `hs` porte des TEXTES d'habitudes — c'est ce que rend le serveur. */
const repsOfHab=id=>{const x=habOf(id);
  return x?REPS.filter(r=>(r.hs||[]).includes(x.t)):[];};
const habsOfRep=r=>(r.hs||[]).map(habByT).filter(Boolean);
const habsOfTrip=t=>(state.habits||[]).filter(x=>String(x.o||'')===String(t.id));

/* ── LE PAPIER, LES ONGLETS, LE LOGO ─────────────────────────────────
   Le wordmark vit HORS de #stage : c'est <body> qui porte la vue pour lui.
   Une seule expression pose toutes les classes du corps — `className=`
   écrase TOUT, et le mode classement y perdait sa classe à chaque rendu. */
function paintZone(){
  const st=$('stage'); if(!st)return;
  st.classList.toggle('v-h',view==='habits');
  st.classList.toggle('v-o',view==='objectives');
  st.classList.toggle('v-r',view==='repulsions');
  /* L'état du logo suit le SUJET, pas la vue : un objectif s'écrit aussi
     depuis la vue habitudes, et c'est encore un objectif. */
  const oLive = view==='objectives' || (open&&open.kind==='t');
  document.body.classList.toggle('v-habits',view==='habits');
  document.body.classList.toggle('v-objectives',view==='objectives');
  document.body.classList.toggle('v-repulsions',view==='repulsions');
  document.body.classList.toggle('o-live',!!oLive);
  document.body.classList.toggle('ordering',ordering);
  document.querySelectorAll('.vt').forEach(b=>{
    b.setAttribute('aria-selected', b.dataset.v===view ? 'true':'false');
  });
  const vn=$('vname'); if(vn)vn.textContent=view;
}
/* Changer de vue ne charge rien et ne quitte rien : c'est la même page,
   la même session, la même mémoire. C'est tout l'intérêt de la fusion. */
function setView(v){
  if(busy)return;
  /* ON NE CHANGE JAMAIS DE VUE EN ÉDITANT. Une boîte ouverte est un
     travail en cours : la vue qui bouge sous les doigts perd la saisie. */
  if(open)return;
  /* Les objectifs et les répulsions sont des données du serveur : sans
     session il n'y a rien à montrer, et l'écran vide ne dirait pas
     pourquoi. */
  if(v!=='habits'&&!me){
    $('member-window').classList.add('show');
    if(typeof memberPaint==='function')memberPaint();
    return;
  }
  view=v; renderZone();
  if(v!=='habits')loadTrips();
}
function showBook(on){ setView(on?'repulsions':'habits'); if(on)save(); }
function showNext(on){ setView(on?'objectives':'habits');  if(on)save(); }
function renderView(){ return renderZone(); }

/* L'arbre entier en UN appel : objectifs, leurs habitudes, les répulsions
   de chaque habitude. Chargé à la première ouverture d'une des deux vues,
   pas au démarrage — le Totehm doit s'ouvrir sans attendre le réseau. */
async function loadTrips(force){
  if(!me)return;
  if(tripsLoaded&&!force)return;
  try{
    const {data,error}=await sb.rpc('my_trips');
    /* Une erreur de RPC se JOURNALISE, toujours : sans ce log, une liste
       vide ne dit pas si le membre n'a rien posé ou si l'appel casse. */
    if(error)throw error;
    if(!data||!data.signed_in)return;
    TRIPS=data.trips||[];
    /* UNE RÉPULSION, UNE LIGNE — même si elle protège quatre habitudes.
       Le serveur la renvoie une fois par habitude protégée ; on déduplique
       sur son id, et `habits` porte la liste complète. Sans ça, la vue
       répulsions afficherait la même pensée quatre fois. */
    const vu={}; REPS=[];
    (TRIPS.concat([{habits:data.loose||[]}])).forEach(t=>
      (t.habits||[]).forEach(h=>(h.repulsions||[]).forEach(r=>{
        if(vu[r.id])return; vu[r.id]=1;
        REPS.push({id:r.id, text:r.repulsion, obstacle:r.obstacle||'',
                   hs:Array.isArray(r.habits)&&r.habits.length?r.habits.slice():[h.t]});})));
    tripsLoaded=true;
    renderZone();
  }catch(e){
    console.error('[totehm] my_trips:',e&&e.message||e);
  }
}

/* `days_left` vient du SERVEUR : un client qui compare des dates compare
   aussi son horloge, et celle d'un téléphone ment plus souvent qu'on ne
   croit. `fmtDue` ne calcule rien, elle met en mots. */
function fmtDue(d){
  if(d==null)return 'no deadline';
  if(d<0)  return Math.abs(d)+' day'+(Math.abs(d)===1?'':'s')+' overdue';
  if(d===0)return 'today';
  if(d===1)return 'tomorrow';
  if(d<31) return d+' days left';
  const m=Math.round(d/30);
  return m+' month'+(m===1?'':'s')+' left';
}
/* Le <input type="date"> veut AAAA-MM-JJ, le serveur rend un timestamp. */
const dateIn=t=>t?String(t).slice(0,10):'';

/* ══ LES ÉCRITURES ═══════════════════════════════════════════════════
   Optimistes : on pose la valeur en mémoire, on dessine, et on envoie.
   Recharger l'arbre à chaque frappe fermerait le panneau sous les doigts.
   L'arbre est rafraîchi À LA FERMETURE, une fois, et pas avant. */
let wDirty=false, wTimer=null;
function apres(p){ /* une erreur de RPC se journalise, toujours */
  return Promise.resolve(p).then(({error}={})=>{ if(error)console.error('[totehm] rpc:',error.message); })
    .catch(e=>console.error('[totehm] rpc:',e&&e.message||e)); }
function differe(fn){ clearTimeout(wTimer); wTimer=setTimeout(fn,700); }

/* ══ LA LIGNE FERMÉE ═════════════════════════════════════════════════
   AUCUNE ICÔNE DANS UNE BOÎTE. Une boîte porte du TEXTE. Ce qui la
   qualifie, c'est sa COULEUR (la vue) et sa LIGNE D'UNITÉ.
   Le tiret du rail prend la couleur de l'intention : le rail est une
   pièce du logo, et il devient le spectre d'une vie, lisible avant même
   d'avoir lu une ligne. Sans intention il reste blanc — le blanc est
   l'absence, pas une huitième couleur. */
const ligne=(inner,cls,col,rank,id)=>'<div class="habit timed '+(cls||'')+'"'
  +(id?' data-row="'+esc(id)+'"':'')+'>'
  +'<span class="tick"'+(col?' style="background:'+col+'"':'')+'></span>'
  +(ordering&&rank?'<span class="rank">'+rank+'</span>':'')
  +'<span class="h-body">'+inner+'</span></div>';
const boite=(nom,sous,attr)=>'<span class="v-col" '+attr+' role="button" tabindex="0">'
  +'<span class="v-name">'+nom+'</span><span class="v-sub">'+sous+'</span></span>';

/* ══ LE PANNEAU — LE TRIP VU DEPUIS N'IMPORTE QUELLE BOÎTE ═══════════
   Les mots disent le LIEN, pas la catégorie : la couleur dit déjà la
   catégorie. WHY remonte, HOW descend, PROTECTS tient. */
const LBL={
  o:{h:'why',            t:'objective',      r:'why'},
  h:{h:'habit',          t:'how',            r:'it protects'},
  r:{h:'protected by',   t:'protected by',   r:'repulsion'}};
/* La pièce de la vue passe EN PREMIER : c'est elle qu'on est venu voir. */
const ORDRE={h:['h','o','r'], t:['o','h','r'], r:['r','h','o']};

/* UN SEUL COMPOSANT DE CHOIX, partout. `key` identifie le déroulant
   ouvert ; deux menus ouverts en même temps, c'est un menu de trop. */
/* MESURÉ : le bouton affichait `every_minute` — l'IDENTIFIANT, pas le
   libellé. La valeur qui COMPARE et le texte qui S'AFFICHE ne sont pas la
   même chose : `val` sert au `.on`, `aff` se lit. */
const pick=(key,val,opts,aff)=>
  '<span class="selw"><button type="button" class="selb" data-sel="'+esc(key)+'">'
  +esc(aff||'—')+' <span class="sel-v">\u25be</span></button>'
  +'<span class="selp'+(selOpen===key?' on':'')+'"><span class="selp-in">'
  +opts.map(o=>'<button type="button" class="selo'+(o.v===val?' on':'')
    +'" data-selv="'+esc(o.v)+'" data-selk="'+esc(key)+'">'+esc(o.l)+'</button>').join('')
  +'</span></span></span>';
const freqOpts=()=>FREQS.map(f=>({v:f.id,l:f.label}));

/* LE CHOIX D'INTENTION : le NOM et le PILIER, pas un pictogramme. Une
   intention n'est pas une icône, c'est un mot — et son pilier dit à quoi
   elle sert dans une vie. Pas de surlignage : la tuile prend un FONDU de
   sa couleur, et se remplit quand elle est choisie. */
const intGrid=(sel,hid)=>'<div class="ints">'+INTS.map(x=>
  '<button type="button" class="int'+(sel===x.id?' on':'')+'" data-i="'+x.id+'" data-ih="'+esc(hid)+'"'
  +' aria-pressed="'+(sel===x.id)+'" style="--ic:'+x.color+'">'
  +'<span class="int-n">'+esc(x.name)+'</span><span class="int-p">'+esc(x.pillar)+'</span></button>')
  .join('')+'</div>';

/* ── L'OBJECTIF ──────────────────────────────────────────────────── */
const blkO=(t,edit,mode)=>'<div class="blk blk-o">'
  +'<span class="blk-l">'+LBL.o[mode]+'</span>'
  +(edit
     ?'<textarea class="blk-t w-name" rows="1" data-tt="'+esc(t.id)+'">'+esc(t.text)+'</textarea>'
     :'<button type="button" class="blk-t go" data-goto="t:'+esc(t.id)+'">'+esc(t.text||'untitled')+'</button>')
  +'<div class="blk-u">'+(edit
     ?'<input class="in date" type="date" data-td="'+esc(t.id)+'" value="'+esc(dateIn(t.target_at))+'">'
     :'<span>'+esc(fmtDue(t.days_left))+'</span>')
  +'<span>'+habsOfTrip(t).length+' habit'+(habsOfTrip(t).length===1?'':'s')+'</span></div>'
  +'</div>';

/* ── UNE HABITUDE ────────────────────────────────────────────────── */
const blkH=(x,edit,mode)=>'<div class="blk blk-h">'
  +'<span class="blk-l">'+LBL.h[mode]+'</span>'
  +(edit
     ?'<textarea class="blk-t w-name" rows="1" data-ht="'+esc(x.id)+'">'+esc(x.t)+'</textarea>'
     :'<button type="button" class="blk-t go" data-goto="h:'+esc(x.id)+'">'+esc(x.t||'untitled')+'</button>')
  +'<button type="button" class="blk-x" data-hx="'+esc(x.id)+'" aria-label="Remove">&times;</button>'
  +'<div class="blk-u">'+pick('h:'+x.id, x.f, freqOpts(), x.f?flabel(x.f):'no rhythm')
  +'<button type="button" class="blk-i" data-ip="'+esc(x.id)+'" style="color:'
  +(x.i?intColor(x.i):'rgba(255,255,255,.62)')+'">'
  +(x.i?esc(intName(x.i))+' · '+esc(intPillar(x.i)):'set intention')+'</button></div>'
  +(intFor===x.id?'<div class="w-sec">'+intGrid(x.i,x.id)+'</div>':'')
  +'</div>';

/* ── UNE RÉPULSION ───────────────────────────────────────────────────
   Elle porte EN PREVIEW les habitudes qu'elle protège, en navy. C'est le
   lookup : on voit d'un coup d'œil ce que « la procrastination » menace,
   et on l'attache ou la détache d'un doigt. */
const blkR=(r,edit,mode)=>'<div class="blk blk-r">'
  +'<span class="blk-l">'+LBL.r[mode]+'</span>'
  +(edit
     ?'<textarea class="blk-t w-name" rows="1" data-rt="'+esc(r.id)+'">'+esc(r.text)+'</textarea>'
     :'<button type="button" class="blk-t go" data-goto="r:'+esc(r.id)+'">'+esc(r.text||'untitled')+'</button>')
  +'<button type="button" class="blk-x" data-rx="'+esc(r.id)+'" aria-label="Remove">&times;</button>'
  +'<div class="lk">'
  +  habsOfRep(r).map(h=>'<span class="lk-on">'+esc(h.t||'untitled habit')+'</span>').join('')
  +  '<button type="button" class="lk-add" data-lk="'+esc(r.id)+'">'
  +  (lkFor===String(r.id)?'done':'+ link a habit')+'</button>'
  +'</div>'
  +(lkFor===String(r.id)?'<div class="lk-pick">'
    +(state.habits||[]).map(h=>
      '<button type="button" class="lk-o'+((r.hs||[]).includes(h.t)?' on':'')
      +'" data-lkh="'+esc(r.id)+'|'+esc(h.id)+'">'+esc(h.t||'untitled habit')+'</button>').join('')
    +'</div>':'')
  +'</div>';

/* UN BLOC VIDE N'EST PAS UN TROU : c'est une invitation à deux temps —
   reprendre une pièce qui existe déjà, ou en écrire une nouvelle. C'est la
   règle du lookup : on ne réécrit jamais ce qui est déjà là. */
const blkVide=(key,mode,liste,ph)=>{
  const cls={o:'blk-o',h:'blk-h',r:'blk-r'}[key], on=pickFor===key;
  return '<div class="blk '+cls+'">'
   +'<span class="blk-l">'+LBL[key][mode]+'</span>'
   +'<div class="lk"><button type="button" class="lk-add" data-pk="'+key+'">'
   +(on?'close':'+ pick or write')+'</button></div>'
   +(on?'<div class="lk-pick">'
      +'<input class="in nw" data-nw="'+key+'" placeholder="'+esc(ph)+'">'
      +liste.map(o=>'<button type="button" class="lk-o" data-pick="'+key+'|'+esc(o.id)+'">'
        +esc(o.txt||'untitled')+'</button>').join('')
      +'</div>':'')
   +'</div>';};

function panneau(mode,t,hs,rs){
  const bloc={
    o: t ? blkO(t, mode==='t', mode)
         : blkVide('o',mode,TRIPS.map(x=>({id:x.id,txt:x.text})),'a new objective'),
    h: (hs.length?hs.map(x=>blkH(x, mode==='h'||x.id===editH, mode)).join('')
                 :blkVide('h',mode,(state.habits||[]).map(x=>({id:x.id,txt:x.t})),'a new habit'))
       +(mode!=='h'&&hs.length?'<button type="button" class="dash" data-ah="'+esc(t?t.id:'')+'">+ add a habit</button>':''),
    r: (rs.length?rs.map(r=>blkR(r, mode==='r'||String(r.id)===editR, mode)).join('')
                 :blkVide('r',mode,REPS.map(x=>({id:x.id,txt:x.text})),'a new repulsion'))
       +(hs.length&&rs.length?'<button type="button" class="dash" data-ar="'+esc(hs[0].id)+'">+ add a repulsion</button>':'')};
  return '<div class="w-top"><button type="button" class="w-x" data-x="1" aria-label="Close">&times;</button></div>'
   + ORDRE[mode].map(k=>bloc[k]).join('')
   + '<div class="acts">'
   +   (mode==='h'?'<button type="button" class="btn g" data-kill="'+esc(open.id)+'">Delete habit</button>':'')
   +   (mode==='t'?'<button type="button" class="btn g" data-tkill="'+esc(open.id)+'">Delete objective</button>':'')
   +   (mode==='r'?'<button type="button" class="btn g" data-rkill="'+esc(open.id)+'">Delete repulsion</button>':'')
   +   '<button type="button" class="btn" data-x="1">Done</button></div>';
}
function panneauHTML(){
  if(open.kind==='h'){const x=habOf(open.id); if(!x)return '';
    return panneau('h', x.o?tripOf(x.o):null, [x], repsOfHab(x.id));}
  if(open.kind==='t'){const t=tripOf(open.id); if(!t)return '';
    const hs=habsOfTrip(t), vu={}, rs=[];
    hs.forEach(h=>repsOfHab(h.id).forEach(r=>{if(!vu[r.id]){vu[r.id]=1;rs.push(r);}}));
    return panneau('t', t, hs, rs);}
  const r=repOf(open.id); if(!r)return '';
  const hs=habsOfRep(r);
  return panneau('r', hs[0]&&hs[0].o?tripOf(hs[0].o):null, hs, [r]);
}

/* ══ LE RENDU ════════════════════════════════════════════════════════
   Un seul rendu pour les trois vues et pour la boîte ouverte : la liste et
   le détail ne peuvent pas diverger s'ils sont dessinés ensemble. */
let lastView=null;
function renderZone(anim){
  habIds();
  const box=$('habits'); if(!box)return;
  /* `anim` dit ce qui doit s'animer POUR CE RENDU. Sans ça, l'animation
     d'ouverture se rejouait à chaque frappe : une boîte qui repousse à
     chaque lettre n'est pas fluide, elle est nerveuse. */
  const change = lastView!==null && lastView!==view;
  lastView=view;
  const sc=$('fv-inner');
  /* MESURÉ : le défilement dérivait de quelques pixels à chaque rendu. Sur
     une longue liste, choisir une intention te déplaçait. On le garde et on
     le repose — sauf quand on vient d'ouvrir, où on VEUT bouger. */
  const keep = sc ? sc.scrollTop : null;
  paintZone();
  let h='';
  if(view==='habits'){
    /* L'ORDRE DU MEMBRE GAGNE. Tant qu'il n'a rien classé, les habitudes
       coulent par rythme (les plus fréquentes en haut) ; dès qu'il en
       déplace une, c'est SON ordre — et c'est celui que le bot suivra. */
    if(!state.ord)sortHabits();
    const list=(state.habits||[]).filter(x=>{
      if(filterF && x.f!==filterF) return false;
      if(filterI && x.i!==filterI) return false;
      return true;});
    h=list.map((x,k)=>{
      if(open&&open.kind==='h'&&open.id===x.id)
        return ligne('<span class="v-col open-in">'+panneauHTML()+'</span>','open'+(open.neuf?' neuf':''),null,null,x.id);
      const n=repsOfHab(x.id).length, t=x.o?tripOf(x.o):null;
      /* PAS DE CADRE NAVY SUR UNE BOÎTE DÉJÀ NAVY. `.h-frame` existe pour
         qu'une habitude reste navy quand elle est POSÉE AILLEURS — dans le
         noir d'un Trip, dans le rouge-violet d'une répulsion. Ici la boîte
         est la vue : le cadre ne faisait qu'un double filet. */
      return ligne(boite(esc(x.t),
        (x.i?'<span class="v-int" style="color:'+intColor(x.i)+'">'+esc(intName(x.i))+'</span>'
             +'<span class="v-pil">'+esc(intPillar(x.i))+'</span>'
            :'<span class="v-pil">set intention</span>')
        +'<span class="v-frq">'+esc(x.f?flabel(x.f):'no rhythm')+'</span>'
        +(n?'<span class="v-pil">'+n+' repulsion'+(n>1?'s':'')+'</span>':'')
        /* « no objective » ne s'écrit QUE si on sait qu'il n'y en a pas.
           Tant que l'arbre n'est pas chargé, une habitude rattachée n'a pas
           encore son objectif en mémoire : l'annoncer libre serait faux, et
           un écran qui ment une seconde est un écran auquel on ne croit
           plus. On se tait, puis on dit. */
        +(t?'<span class="v-pil">'+esc(t.text)+'</span>'
           :(!x.o?'<span class="v-pil">no objective</span>':'')),
        'data-h="'+esc(x.id)+'"'), '', x.i?intColor(x.i):null, k+1, x.id);}).join('');
    if(!list.length)h+='<div class="void">'+(state.habits&&state.habits.length
      ?'nothing matches this filter':'no habit yet')+'</div>';
    h+=ligne('<button type="button" class="add-box" data-add="1">+ <b>Add a Habit</b></button>','add');
  }else if(view==='objectives'){
    h=TRIPS.map((t,k)=>{
      if(open&&open.kind==='t'&&String(open.id)===String(t.id))
        return ligne('<span class="v-col open-in">'+panneauHTML()+'</span>','open'+(open.neuf?' neuf':''),null,null,t.id);
      const n=habsOfTrip(t).length, late=t.days_left!=null&&t.days_left<0;
      return ligne(boite(esc(t.text),
        '<span class="v-frq'+(late?' late':'')+'">'+esc(fmtDue(t.days_left))+'</span>'
        +'<span class="v-pil">'+n+' habit'+(n===1?'':'s')+'</span>',
        'data-t="'+esc(t.id)+'"'), '', null, k+1, t.id);}).join('');
    if(!TRIPS.length)h+='<div class="void">'+(tripsLoaded?'no objective yet':'loading…')+'</div>';
    h+=ligne('<button type="button" class="add-box" data-add="1">+ <b>Add an Objective</b></button>','add');
  }else{
    h=REPS.map((r,k)=>{
      if(open&&open.kind==='r'&&String(open.id)===String(r.id))
        return ligne('<span class="v-col open-in">'+panneauHTML()+'</span>','open'+(open.neuf?' neuf':''),null,null,r.id);
      const x=habsOfRep(r)[0];
      return ligne(boite(esc(r.text),
        '<span class="v-pil">protects</span>'
        +'<span class="h-frame u-mini">'+esc(x?x.t:'—')+'</span>',
        'data-r="'+esc(r.id)+'"'), '', x&&x.i?intColor(x.i):null, k+1, r.id);}).join('');
    if(!REPS.length)h+='<div class="void">'+(tripsLoaded?'no repulsion yet':'loading…')+'</div>';
    h+=ligne('<button type="button" class="add-box" data-add="1">+ <b>Add a Repulsion</b></button>','add');
  }
  /* La barre se pose ICI et pas dans `h` : chacune des trois branches
     REMPLACE `h` (`h=...`), donc un préfixe posé avant serait écrasé. Le
     genre de bug qui ne se voit qu'à l'écran — et qui s'est vu. */
  box.innerHTML=(ordering
    ? '<div class="ordbar">order by importance — the bot follows this order</div>' : '')+h;
  /* Retirer, forcer un reflow, remettre : sans le reflow le navigateur ne
     rejoue pas une animation dont la classe est déjà là. */
  /* On ne retire la classe QUE pour la remettre : la retirer au rendu
     suivant coupait le fondu en plein vol — `loadTrips` redessine deux
     cents millisecondes après le changement de vue, en plein milieu des
     260 ms de l'animation. */
  if(change){ box.classList.remove('swap'); void box.offsetWidth;
              box.classList.add('swap'); }
  if(keep!=null&&sc)sc.scrollTop=keep;
  const carte=box.querySelector('.habit.open');
  if(carte){ if(anim!=='grow')carte.style.animation='none'; cable(carte); }
  /* ══ LE DIAGNOSTIC ══ Tout écran qui peut être vide porte le sien. Un
     écran vide SANS diagnostic, c'est trois allers-retours au lieu d'un :
     on ne sait pas si le membre n'a rien posé, si la session est tombée,
     ou si la RPC casse. Des compteurs et des booléens, JAMAIS une valeur
     de clé ni un texte du membre. C'est le bloc à coller dans la console.
     Même contrat que `window.__totehm_map` et `window.__totehm_self`. */
  window.__totehm_zone={vue:view, session:!!me, arbre_charge:tripsLoaded,
    habitudes:(state.habits||[]).length, objectifs:TRIPS.length, repulsions:REPS.length,
    filtre:{rythme:!!filterF, intention:!!filterI},
    boite_ouverte:open?open.kind:null, classement:ordering, ordre_du_membre:!!state.ord};
  box.querySelectorAll('[data-h],[data-t],[data-r],[data-add]').forEach(el=>{
    const go=()=>{
      /* En mode classement, un appui DÉPLACE — il n'ouvre pas. */
      if(ordering)return;
      if(el.dataset.add)creerDansLaVue();
      else if(el.dataset.h)ouvrir('h',el.dataset.h);
      else if(el.dataset.t)ouvrir('t',el.dataset.t);
      else ouvrir('r',el.dataset.r);};
    el.addEventListener('click',go);
    el.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
  });
}

/* Ouvrir, c'est agrandir la boîte À SA PLACE : on reste dans le Totehm,
   rien ne recouvre le logo. */
function ouvrir(kind,id,neuf){
  open={kind,id:String(id),neuf:!!neuf}; selOpen=null; intFor=null; lkFor=null; pickFor=null;
  editH = kind==='h'?String(id):null; editR = kind==='r'?String(id):null;
  renderZone('grow');
  const b=$('habits').querySelector('.habit.open');
  if(b){
    /* MESURÉ : `scrollIntoView` ne bougeait le cadre que de 2 px. Il cherche
       « l'ancêtre défilant le plus proche » et, dans un document dont le
       corps ne défile pas, il ne trouve pas #fv-inner de façon fiable. On
       lui dit lequel, et de combien : plus de devinette. Affectation
       directe, pas `behavior:'smooth'` — un défilement doux est annulé
       quand le système demande moins d'animation. */
    requestAnimationFrame(()=>{const sc=$('fv-inner'); if(!sc)return;
      sc.scrollTop=sc.scrollTop+b.getBoundingClientRect().top-sc.getBoundingClientRect().top-6;});
    const f=b.querySelector('textarea.w-name');
    if(f&&window.innerWidth>700)f.focus();
  }
}
function fermer(){
  open=null;selOpen=null;intFor=null;lkFor=null;pickFor=null;editH=null;editR=null;
  renderZone();
  /* L'arbre se recharge ICI, une fois : pendant l'édition il fermerait le
     panneau sous les doigts, et après il remet la vérité du serveur. */
  if(wDirty){wDirty=false;loadTrips(true);}
}

/* ══ CRÉER — UN SEUL BOUTON PAR VUE ══════════════════════════════════
   Il crée la pièce de SA vue, vide, et ouvre le triplet dessus. La fenêtre
   qui sert à modifier est celle qui sert à créer : un deuxième chemin de
   création finirait par diverger. */
async function creerDansLaVue(){
  if(view==='habits'){
    const x={id:'h'+(++HSEQ), t:'', f:pendingF||null, i:pendingI||null, o:null};
    state.habits.unshift(x); state.ord=true; save(); ouvrir('h',x.id,true); return;
  }
  if(!me){$('member-window').classList.add('show');
          if(typeof memberPaint==='function')memberPaint();return;}
  if(view==='objectives'){
    const {data,error}=await sb.rpc('trip_create',{p_text:'',p_target:null});
    if(error){console.error('[totehm] trip_create:',error.message);return;}
    TRIPS.unshift({id:data,text:'',target_at:null,days_left:null,habits:[]});
    ouvrir('t',data,true); return;
  }
  /* Une répulsion se rattache à une habitude : le serveur la classe par
     `habit_text`. Sans habitude, il n'y a rien à protéger — on le dit. */
  const h0=(state.habits||[])[0];
  if(!h0||!h0.t){alert('write a habit first — a repulsion protects something');return;}
  const {data,error}=await sb.rpc('repulsion_set',{p_habit:h0.t,p_repulsion:'',p_obstacle:''});
  if(error){console.error('[totehm] repulsion_set:',error.message);return;}
  REPS.unshift({id:data,text:'',obstacle:'',hs:[h0.t]});
  ouvrir('r',String(data),true);
}

/* ══ LE CÂBLAGE DE LA BOÎTE OUVERTE ══════════════════════════════════ */
function grow(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}
function cable(carte){
  const on=(sel,ev,fn)=>carte.querySelectorAll(sel).forEach(el=>el.addEventListener(ev,fn));
  const stop=fn=>e=>{e.stopPropagation();fn(e);};
  /* MESURÉ : `.w-name` retombait à zéro. `grow()` lisait `scrollHeight`
     pendant que la boîte n'était pas encore affichée. On mesure APRÈS. */
  carte.querySelectorAll('textarea.w-name').forEach(grow);

  /* ── LE DÉROULANT ─────────────────────────────────────────────────── */
  on('[data-sel]','click',stop(e=>{
    const k=e.currentTarget.dataset.sel; selOpen=(selOpen===k?null:k); renderZone();}));
  on('[data-selv]','click',stop(e=>{
    const k=e.currentTarget.dataset.selk, v=e.currentTarget.dataset.selv;
    selOpen=null;
    if(k.indexOf('h:')===0){const x=habOf(k.slice(2)); if(x){x.f=v;save();}}
    renderZone();}));

  /* ── FERMER ───────────────────────────────────────────────────────── */
  on('[data-x]','click',stop(()=>fermer()));

  /* ── ÉDITER UNE AUTRE PIÈCE, SANS CHANGER DE VUE ──────────────────── */
  on('[data-goto]','click',stop(e=>{
    const d=e.currentTarget.dataset.goto, k=d.slice(0,1), id=d.slice(2);
    if(k==='h')editH=id; else if(k==='r')editR=id;
    intFor=null;lkFor=null;renderZone();}));

  /* ── LA SAISIE ────────────────────────────────────────────────────── */
  on('[data-tt]','input',e=>{
    const t=tripOf(e.target.dataset.tt); if(!t)return;
    t.text=e.target.value; grow(e.target); wDirty=true;
    differe(()=>apres(sb.rpc('trip_rename',{p_trip:t.id,p_text:t.text})));});
  on('[data-td]','change',e=>{
    const t=tripOf(e.target.dataset.td); if(!t)return;
    const v=e.target.value;
    t.target_at=v?v+'T00:00:00Z':null; wDirty=true;
    apres(sb.rpc('trip_set_target',{p_trip:t.id,p_target:t.target_at}));});
  on('[data-ht]','input',e=>{
    const x=habOf(e.target.dataset.ht); if(!x)return;
    const ancien=x.t; x.t=e.target.value; grow(e.target);
    differe(()=>{
      save();
      /* Renommer une habitude ne doit pas orpheliner ce qui la protège :
         le lien est du TEXTE, il se répare côté serveur, en un appel. */
      if(me&&ancien&&ancien!==x.t){
        REPS.forEach(r=>{const i=(r.hs||[]).indexOf(ancien); if(i>=0)r.hs[i]=x.t;});
        apres(sb.rpc('habit_rename_links',{p_old:ancien,p_new:x.t}));}
    });});
  on('[data-rt]','input',e=>{
    const r=repOf(e.target.dataset.rt); if(!r)return;
    r.text=e.target.value; grow(e.target); wDirty=true;
    differe(()=>apres(sb.rpc('repulsion_set',
      {p_habit:(r.hs||[])[0]||'', p_repulsion:r.text, p_obstacle:r.obstacle||''})));});

  /* ── L'INTENTION, sur l'habitude qu'on touche ─────────────────────── */
  on('[data-ip]','click',stop(e=>{
    const id=e.currentTarget.dataset.ip;
    intFor=(intFor===id?null:id); lkFor=null; renderZone();}));
  on('[data-i]','click',stop(e=>{
    const x=habOf(e.currentTarget.dataset.ih); if(!x)return;
    const v=e.currentTarget.dataset.i;
    x.i=(x.i===v?null:v); intFor=null; save(); renderZone();}));

  /* ── LE LOOKUP : une répulsion protège PLUSIEURS habitudes ────────── */
  on('[data-lk]','click',stop(e=>{
    const id=String(e.currentTarget.dataset.lk);
    lkFor=(lkFor===id?null:id); intFor=null; renderZone();}));
  on('[data-lkh]','click',stop(e=>{
    const p=e.currentTarget.dataset.lkh.split('|');
    const r=repOf(p[0]), x=habOf(p[1]); if(!r||!x||!x.t)return;
    const i=(r.hs||[]).indexOf(x.t);
    if(i<0){r.hs.push(x.t); apres(sb.rpc('repulsion_link',{p_id:r.id,p_habit:x.t}));}
    else   {r.hs.splice(i,1); apres(sb.rpc('repulsion_unlink',{p_id:r.id,p_habit:x.t}));}
    wDirty=true; renderZone();}));

  /* ── LE LOOKUP D'UN BLOC VIDE — reprendre, ou écrire ──────────────── */
  on('[data-pk]','click',stop(e=>{
    const k=e.currentTarget.dataset.pk;
    pickFor=(pickFor===k?null:k); intFor=null; lkFor=null; renderZone();}));
  on('[data-pick]','click',stop(e=>{
    const p=e.currentTarget.dataset.pick.split('|');
    lier(p[0],p[1]); pickFor=null; renderZone();}));
  on('[data-nw]','keydown',e=>{
    if(e.key!=='Enter')return; e.preventDefault();
    const v=e.target.value.trim(); if(!v)return;
    creerEtLier(e.target.dataset.nw, v);});

  /* ── AJOUTER UNE PIÈCE AU TRIP ────────────────────────────────────── */
  on('[data-ah]','click',stop(e=>{
    const x={id:'h'+(++HSEQ), t:'', f:null, i:null, o:e.currentTarget.dataset.ah||null};
    state.habits.unshift(x); state.ord=true; save(); editH=x.id; editR=null; renderZone();
    const el=$('habits').querySelector('[data-ht="'+x.id+'"]'); if(el)el.focus();}));
  on('[data-ar]','click',stop(async e=>{
    const x=habOf(e.currentTarget.dataset.ar); if(!x||!x.t)return;
    const {data,error}=await sb.rpc('repulsion_set',{p_habit:x.t,p_repulsion:'',p_obstacle:''});
    if(error){console.error('[totehm] repulsion_set:',error.message);return;}
    REPS.unshift({id:data,text:'',obstacle:'',hs:[x.t]});
    editR=String(data); editH=null; wDirty=true; renderZone();
    const el=$('habits').querySelector('[data-rt="'+data+'"]'); if(el)el.focus();}));

  /* ── RETIRER ──────────────────────────────────────────────────────── */
  on('[data-hx],[data-kill]','click',stop(e=>{
    const id=e.currentTarget.dataset.hx||e.currentTarget.dataset.kill;
    const x=habOf(id); if(!x)return;
    logTotehmEvent('habit_removed',x.t,{f:x.f,i:x.i});
    state.habits=state.habits.filter(h=>h.id!==id);
    /* Une répulsion qui ne protège plus rien RESTE : elle a été écrite,
       elle se rattache ailleurs. On retire le lien, pas la pensée. */
    REPS.forEach(r=>{const i=(r.hs||[]).indexOf(x.t);
      if(i>=0){r.hs.splice(i,1); if(me)apres(sb.rpc('repulsion_unlink',{p_id:r.id,p_habit:x.t}));}});
    save();
    if(editH===id)editH=null;
    if(open&&open.kind==='h'&&open.id===id)fermer(); else renderZone();}));
  on('[data-rx],[data-rkill]','click',stop(e=>{
    const id=String(e.currentTarget.dataset.rx||e.currentTarget.dataset.rkill);
    REPS=REPS.filter(r=>String(r.id)!==id);
    apres(sb.rpc('repulsion_retire',{p_id:Number(id)}));
    if(editR===id)editR=null;
    if(open&&open.kind==='r'&&String(open.id)===id)fermer(); else renderZone();}));
  on('[data-tkill]','click',stop(e=>{
    const id=String(e.currentTarget.dataset.tkill);
    TRIPS=TRIPS.filter(t=>String(t.id)!==id);
    (state.habits||[]).forEach(h=>{if(String(h.o||'')===id)h.o=null;});
    save(); apres(sb.rpc('trip_close',{p_trip:id,p_outcome:'dropped'}));
    fermer();}));
}

/* LE LIEN SE POSE DEPUIS CE QU'ON A OUVERT. C'est la seule fonction qui
   connaît les règles de rattachement, et il n'y en a que trois :
     un objectif tient plusieurs habitudes ;
     une habitude sert UN objectif ;
     une répulsion protège plusieurs habitudes. */
function lier(k,id){
  const m=open.kind;
  if(k==='o'){
    const x = m==='h'?habOf(open.id) : m==='r'?habsOfRep(repOf(open.id)||{hs:[]})[0] : null;
    if(x){x.o=id; save();}
  }else if(k==='h'){
    if(m==='t'){const x=habOf(id); if(x){x.o=open.id; save();}}
    else if(m==='r'){const r=repOf(open.id), x=habOf(id);
      if(r&&x&&x.t&&!(r.hs||[]).includes(x.t)){
        r.hs.push(x.t); apres(sb.rpc('repulsion_link',{p_id:r.id,p_habit:x.t}));}}
  }else{
    const x = m==='h'?habOf(open.id) : m==='t'?habsOfTrip(tripOf(open.id)||{id:''})[0] : null;
    const r = repOf(id);
    if(r&&x&&x.t&&!(r.hs||[]).includes(x.t)){
      r.hs.push(x.t); apres(sb.rpc('repulsion_link',{p_id:r.id,p_habit:x.t}));}
  }
  wDirty=true;
}
async function creerEtLier(k,txt){
  if(k==='h'){
    const x={id:'h'+(++HSEQ), t:txt, f:null, i:null, o:null};
    state.habits.unshift(x); state.ord=true; save(); lier('h',x.id); pickFor=null; renderZone(); return;}
  if(!me)return;
  if(k==='o'){
    const {data,error}=await sb.rpc('trip_create',{p_text:txt,p_target:null});
    if(error){console.error('[totehm] trip_create:',error.message);return;}
    TRIPS.unshift({id:data,text:txt,target_at:null,days_left:null,habits:[]});
    lier('o',data); pickFor=null; renderZone(); return;}
  const cible = open.kind==='h'?habOf(open.id) : habsOfTrip(tripOf(open.id)||{id:''})[0];
  if(!cible||!cible.t)return;
  const {data,error}=await sb.rpc('repulsion_set',{p_habit:cible.t,p_repulsion:txt,p_obstacle:''});
  if(error){console.error('[totehm] repulsion_set:',error.message);return;}
  REPS.unshift({id:data,text:txt,obstacle:'',hs:[cible.t]});
  pickFor=null; wDirty=true; renderZone();
}

/* ══ LE CLASSEMENT PAR IMPORTANCE ════════════════════════════════════
   Un seul chemin pour le doigt et la souris — Pointer Events. On coupe le
   natif (`touch-action:none` en CSS) parce que le geste porte une fonction
   produit : sans ça le navigateur avale le glissement vertical et le
   classement se perd une fois sur deux.
   L'ordre n'est pas cosmétique. Il descend jusqu'au bot, et jusqu'à la
   carte : `places_matching_habits` départage deux lieux à classement égal
   par `matched_rank`, c'est-à-dire par CET ordre-là. */
const listeDe=v=>v==='habits'?(state.habits||[]):v==='objectives'?TRIPS:REPS;
function poseListe(v,arr){
  if(v==='habits'){state.habits=arr;state.ord=true;save();}
  else if(v==='objectives')TRIPS=arr; else REPS=arr;}

if($('ordbtn'))$('ordbtn').addEventListener('click',()=>{
  ordering=!ordering;
  /* Classer et écrire sont deux gestes : une boîte ouverte au milieu d'un
     classement n'a pas de rang. */
  if(ordering&&open)open=null;
  renderZone();});

(function(){
  const box=$('habits'); if(!box)return;
  let from=null, cible=null;
  const rowAt=(x,y)=>{const el=document.elementFromPoint(x,y);
    return el&&el.closest?el.closest('.habit[data-row]'):null;};
  box.addEventListener('pointerdown',e=>{
    if(!ordering)return;
    const row=e.target.closest&&e.target.closest('.habit[data-row]'); if(!row)return;
    from=row; row.classList.add('drag');
    try{row.setPointerCapture(e.pointerId);}catch(_){}
  });
  box.addEventListener('pointermove',e=>{
    if(!from)return;
    const over=rowAt(e.clientX,e.clientY);
    if(cible&&cible!==over)cible.classList.remove('over');
    if(over&&over!==from){over.classList.add('over');cible=over;}
  });
  const fin=()=>{
    if(!from)return;
    from.classList.remove('drag');
    if(cible){
      cible.classList.remove('over');
      const arr=listeDe(view).slice();
      const a=arr.findIndex(o=>String(o.id)===from.dataset.row);
      const b=arr.findIndex(o=>String(o.id)===cible.dataset.row);
      if(a>=0&&b>=0){const m=arr.splice(a,1)[0];arr.splice(b,0,m);poseListe(view,arr);}
    }
    from=null;cible=null;renderZone();
  };
  box.addEventListener('pointerup',fin);
  box.addEventListener('pointercancel',fin);
})();

/* Trois entrées, un seul état : les carrés, le balayage, les flèches.
   Aucune ne charge quoi que ce soit — c'est la même page, la même session,
   la même mémoire. */
document.querySelectorAll('.vt').forEach(b=>
  b.addEventListener('click',()=>setView(b.dataset.v)));
addEventListener('keydown',e=>{
  if(e.key==='Escape'&&open){e.preventDefault();fermer();}});
