/* ══ LA ZONE — UNE SEULE BOÎTE, PARTOUT LA MÊME · 08/09/2026 ══════════
   Réécriture complète de la couche d'affichage. Ce qui existait avant
   fabriquait DEUX objets — la boîte, et le « bloc » d'une pièce liée —
   avec deux paddings, deux graisses, deux grammaires. D'où « rien n'est
   fluide, rien n'est harmonieux ».

   IL N'Y A PLUS QU'UNE BOÎTE, et elle contient TROIS choses :
     1. son TITRE, toujours modifiable sur place ;
     2. sa LIGNE D'UNITÉ — ce qui la qualifie, et qui se touche ;
     3. ses MINI-BOÎTES — ce qui lui est lié, à la couleur de ce que
        c'est. C'est le format de la boîte répulsion, généralisé : une
        habitude montre ses objectifs en bleu clair et ses répulsions en
        rouge-violet, un objectif montre ses habitudes en navy.

   LES TROIS VUES SONT LA MÊME LISTE, lue par un bout différent. On
   travaille pleinement dans chacune ; seul le storytelling change. */

/* ── LES INTENTIONS SONT PLUSIEURS ───────────────────────────────────
   Une habitude peut en porter plusieurs. `is` est la liste, `i` reste la
   PREMIÈRE — c'est elle que le serveur et le bot lisent (`steps.i`), et
   la tenir à jour évite de toucher à la base. */
const intIds=x=>!x?[]:(Array.isArray(x.is)&&x.is.length?x.is:(x.i?[x.i]:[]));
function intToggle(x,id){
  const l=intIds(x).slice(), k=l.indexOf(id);
  if(k<0)l.push(id); else l.splice(k,1);
  x.is=l; x.i=l.length?l[0]:null; save();
}
const intCols=x=>intIds(x).map(intColor);

/* ── LES PIÈCES LIÉES, DANS LES DEUX SENS ────────────────────────── */
const repsOfHabX=x=>x&&x.t?REPS.filter(r=>(r.hs||[]).includes(x.t)):[];

/* ══ LE RAIL — UNE CHAÎNE DE TRAITS ══════════════════════════════════
   Le bord gauche d'une boîte habitude porte SES intentions, une par
   segment, de haut en bas. Sept intentions, sept traits : le spectre
   d'une vie, lisible avant d'avoir lu un mot.
   Les autres boîtes n'en portent pas — une couleur d'intention sur un
   objectif ou une répulsion ne voudrait rien dire. */
const tickHTML=cols=>'<span class="tick">'
  +(cols&&cols.length?cols.map(c=>'<i style="background:'+c+'"></i>').join(''):'')
  +'</span>';

/* ══ LA MINI-BOÎTE ═══════════════════════════════════════════════════
   Une pièce liée, vue depuis une autre. Elle porte la couleur de CE
   QU'ELLE EST, jamais celle de la boîte qui l'accueille : une habitude
   reste navy même posée dans une répulsion. */
const mini=(kind,txt,attr)=>'<span class="mini m-'+kind+'" '+(attr||'')+'>'
  +esc(txt||'untitled')+'</span>';
const miniDel=(kind,txt,data)=>'<span class="mini m-'+kind+'">'+esc(txt||'untitled')
  +'<button type="button" class="mini-x" '+data+' aria-label="Unlink">&times;</button></span>';
/* ══ LE MOT RACONTE LE LIEN ══════════════════════════════════════════
   WHY au-dessus des objectifs d'une habitude, HOW au-dessus des
   habitudes d'un objectif, PROTECTS au-dessus de celles d'une répulsion.
   Trois mots, et la liste devient une phrase. Un groupe vide ne s'écrit
   pas : un titre sans rien dessous n'est pas du storytelling, c'est un
   trou nommé. */
const groupe=(mot,contenu)=>contenu
  ? '<span class="mg"><span class="mg-l">'+mot+'</span>'
    +'<span class="minis">'+contenu+'</span></span>' : '';

/* ══ LA BOÎTE ════════════════════════════════════════════════════════
   `o.kind` h|t|r · `o.titre` · `o.unit` (HTML) · `o.minis` (HTML)
   · `o.ouverte` · `o.extra` (un choix ouvert : intentions, rythme, lien) */
function boiteHTML(o){
  const nom = o.ouverte
    ? '<span class="v-name" contenteditable="plaintext-only" spellcheck="false"'
      +' data-edit="'+o.kind+':'+esc(String(o.id))+'">'+esc(o.titre)+'</span>'
    : '<span class="v-name">'+esc(o.titre||'untitled')+'</span>';
  return '<span class="v-col"'+(o.ouverte?'':' data-open="'+o.kind+':'+esc(String(o.id))+'" role="button" tabindex="0"')+'>'
    + nom
    + (o.unit ?'<span class="v-sub">'+o.unit+'</span>':'')
    /* LE CHOIX SE POSE AU-DESSUS DE CE QU'IL CONCERNE. Régler l'intention
       ou le rythme, c'est régler L'HABITUDE : le choix s'ouvre sous sa
       ligne, avant ses objectifs et ses répulsions. Un lookup, lui,
       concerne les liens : il s'ouvre après eux. */
    + (o.haut||'')
    + (o.minis?'<span class="minis">'+o.minis+'</span>':'')
    + (o.bas||'')
    /* [Delete] EST LE DERNIER ENFANT DE LA COLONNE. Posé à côté de la
       boîte il flottait à droite et mangeait la largeur — sur un
       téléphone, la moitié de la ligne pour la commande la plus grave.
       Ici il est en bas, pleine largeur, et une saisie qui s'allonge le
       repousse sans jamais le croiser. */
    + (o.ouverte&&o.tue?'<button type="button" class="btn g" data-kill="'+o.kind+':'
        +esc(String(o.id))+'">'+o.tue+'</button>':'')
    + (o.ouverte?'<button type="button" class="w-x" data-x="1" aria-label="Close">&times;</button>':'')
    +'</span>';
}
const ligne=(inner,cls,cols,rank,id)=>'<div class="habit timed '+(cls||'')+'"'
  +(id?' data-row="'+esc(String(id))+'"':'')+'>'
  + tickHTML(cols)
  + (ordering&&rank?'<span class="rank">'+rank+'</span>':'')
  +'<span class="h-body">'+inner+'</span></div>';

/* ══ CE QUI EST OUVERT, ET CE QU'ON EST EN TRAIN DE CHOISIR ══════════
   UN SEUL choix à la fois : deux menus ouverts, c'est un menu de trop.
   `pk` vaut null, ou {q:'int'|'freq'|'lien'|'neuf', k:'h'|'t'|'r', id}. */
let pk=null;
/* La vue du rendu précédent : c'est elle qui dit si l'on vient de changer
   de vue, donc s'il faut jouer le fondu. Elle vivait dans l'ancienne zone
   et a disparu avec elle — sans elle, `renderZone` levait à la première
   ligne et l'écran restait vide. */
let lastView=null;
const pkOn=(q,k,id)=>!!pk&&pk.q===q&&pk.k===k&&String(pk.id)===String(id);
function pkSet(q,k,id){ pk = pkOn(q,k,id) ? null : {q,k,id:String(id)}; renderZone(); }

/* ══ LE RYTHME — ON L'ÉCRIT DANS SA LANGUE ═══════════════════════════
   `deduceFreq()` lit « tous les matins », « every morning », « jeden
   Morgen », « ogni mattina » et rend l'un des 33 rythmes. C'est ce qui
   permet d'écrire au lieu de chercher dans une liste — et ça marche dans
   toutes les langues sans un appel de modèle, donc sans facture.
   La liste reste dessous : on écrit OU on choisit, jamais l'un sans
   l'autre. */
function freqPicker(x){
  const devine = pk&&pk.q==='freq'&&pk.devine ? pk.devine : null;
  return '<span class="pkw">'
    +'<input class="in fq" data-fqin="'+esc(String(x.id))+'" autocomplete="off"'
    +' placeholder="write it in your language" value="'+esc(pk&&pk.txt||'')+'">'
    +(devine?'<button type="button" class="fq-hit" data-fq="'+esc(String(x.id))+'|'+devine+'">'
      +esc(flabel(devine))+'</button>':'')
    +'<span class="pk-list">'
    + FREQS.map(f=>'<button type="button" class="pk-o'+(x.f===f.id?' on':'')
        +'" data-fq="'+esc(String(x.id))+'|'+f.id+'">'+esc(f.label)+'</button>').join('')
    +'</span></span>';
}

/* LES SEPT INTENTIONS — plusieurs à la fois. Pas de surlignage : la tuile
   prend un fondu de sa couleur, et se remplit quand elle est choisie. */
const intPicker=x=>{const l=intIds(x);
  return '<span class="pkw"><span class="ints">'+INTS.map(z=>
    '<button type="button" class="int'+(l.includes(z.id)?' on':'')+'" data-int="'
    +esc(String(x.id))+'|'+z.id+'" aria-pressed="'+l.includes(z.id)+'" style="--ic:'+z.color+'">'
    +'<span class="int-n">'+esc(z.name)+'</span>'
    +'<span class="int-p">'+esc(z.pillar)+'</span></button>').join('')+'</span></span>';};

/* LE LOOKUP — reprendre ce qui existe, ou écrire du neuf. On ne réécrit
   jamais ce qui est déjà là : les pièces déjà liées ne sont pas
   reproposées. */
/* `col` : la couleur de CE QU'ON VA POSER. Écrire un objectif se fait
   dans du bleu clair, une répulsion dans du rouge-violet, une habitude
   dans du navy — on voit ce qu'on fabrique avant de l'avoir fabriqué.
   Et les propositions RESPIRENT, comme le T : elles appellent le doigt
   sans crier. */
function lienPicker(k,id,dejaIds,liste,ph,col){
  const c=col||'h';
  return '<span class="pkw k-'+c+'">'
    +'<input class="in nw k-'+c+'" data-nw="'+k+':'+esc(String(id))+'" autocomplete="off" placeholder="'+esc(ph)+'">'
    +'<span class="pk-list">'
    + liste.filter(z=>!dejaIds.includes(String(z.id)))
        .map(z=>'<button type="button" class="pk-o vit k-'+c+'" data-lien="'+k+':'+esc(String(id))
          +'|'+esc(String(z.id))+'">'+esc(z.txt||'untitled')+'</button>').join('')
    +'</span></span>';
}
const plus=(q,k,id,mot)=>'<button type="button" class="dash'+(pkOn(q,k,id)?' on':'')+'"'
  +' data-pk="'+q+':'+k+':'+esc(String(id))+'">'+(pkOn(q,k,id)?'close':'+ '+mot)+'</button>';

/* ══ LES TROIS VUES ══════════════════════════════════════════════════ */
function renderZone(){
  habIds();
  const box=$('habits'); if(!box)return;
  const sc=$('fv-inner'); const keep = sc?sc.scrollTop:null;
  const change = lastView!==null && lastView!==view; lastView=view;
  paintZone();

  let h='';
  if(view==='habits'){
    if(!state.ord)sortHabits();
    const list=(state.habits||[]).filter(x=>{
      if(filterF && x.f!==filterF) return false;
      if(filterI && !intIds(x).includes(filterI)) return false;
      return true;});
    h=list.map((x,k)=>vueHabitude(x,k)).join('');
    if(!list.length)h+='<div class="void">'+((state.habits||[]).length
      ?'nothing matches this filter':'no habit yet')+'</div>';
    h+=ligne('<button type="button" class="add-box" data-add="h">+ <b>Add a Habit</b></button>','add');
  }else if(view==='objectives'){
    h=TRIPS.map((t,k)=>vueObjectif(t,k)).join('');
    if(!TRIPS.length)h+='<div class="void">'+(tripsLoaded?'no objective yet':'loading…')+'</div>';
    h+=ligne('<button type="button" class="add-box" data-add="t">+ <b>Add an Objective</b></button>','add');
  }else{
    h=REPS.map((r,k)=>vueRepulsion(r,k)).join('');
    if(!REPS.length)h+='<div class="void">'+(tripsLoaded?'no repulsion yet':'loading…')+'</div>';
    h+=ligne('<button type="button" class="add-box" data-add="r">+ <b>Add a Repulsion</b></button>','add');
  }

  box.innerHTML=(ordering
    ? '<div class="ordbar">order by importance — the bot follows this order</div>':'')+h;
  if(change){ box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap'); }
  if(keep!=null&&sc)sc.scrollTop=keep;
  peintTraits();
  window.__totehm_zone={vue:view, session:!!me, arbre_charge:tripsLoaded,
    habitudes:(state.habits||[]).length, objectifs:TRIPS.length, repulsions:REPS.length,
    filtre:{rythme:!!filterF, intention:!!filterI},
    boite_ouverte:open?open.kind:null, choix:pk?pk.q:null,
    classement:ordering, ordre_du_membre:!!state.ord};
  cable(box);
}

/* ── UNE HABITUDE ────────────────────────────────────────────────────
   Elle montre SES objectifs (bleu clair) et SES répulsions (rouge-violet).
   C'est le format de la boîte répulsion, dans l'autre sens. */
function vueHabitude(x,k){
  const ouverte = !!open && open.kind==='h' && String(open.id)===String(x.id);
  const ts=tripsOfHab(x), rs=repsOfHabX(x), l=intIds(x);
  /* CE QUI MANQUE RESPIRE. Une habitude sans intention ni rythme n'est pas
     encore une habitude : les deux réglages pulsent comme le T tant qu'ils
     sont vides, et s'arrêtent dès qu'ils sont posés. */
  const unit = ouverte
    ? '<button type="button" class="v-b'+(l.length?'':' vit')+'" data-pk="int:h:'+esc(String(x.id))+'">'
      +(l.length?l.map(i=>'<b style="color:'+intColor(i)+'">'+esc(intName(i))+'</b>').join(' · ')
                :'set intention')+'</button>'
      +'<button type="button" class="v-b'+(x.f?'':' vit')+'" data-pk="freq:h:'+esc(String(x.id))+'">'
      +esc(x.f?flabel(x.f):'set time frequency')+' ▾</button>'
    : (l.length?l.map(i=>'<span class="v-int" style="color:'+intColor(i)+'">'+esc(intName(i))+'</span>').join('')
               :'<span class="v-pil vit">set intention</span>')
      +'<span class="v-frq'+(x.f?'':' vit')+'">'+esc(x.f?flabel(x.f):'set time frequency')+'</span>';
  /* WHY au-dessus des objectifs, PROTECTED BY au-dessus des répulsions :
     la boîte raconte, elle ne liste pas. */
  const gO = ouverte
    ? ts.map(t=>miniDel('o',t.text,'data-unlink="o:'+esc(String(x.id))+'|'+esc(String(t.id))+'"')).join('')
      + plus('lien','o',x.id,'objective')
    : ts.map(t=>mini('o',t.text)).join('');
  const gR = ouverte
    ? rs.map(r=>miniDel('r',r.text,'data-unlink="r:'+esc(String(x.id))+'|'+esc(String(r.id))+'"')).join('')
      + plus('lien','r',x.id,'repulsion')
    : rs.map(r=>mini('r',r.text)).join('');
  const minis = groupe('why',gO) + groupe('protected by',gR);
  let haut='', bas='';
  if(ouverte&&pkOn('int','h',x.id))  haut=intPicker(x);
  if(ouverte&&pkOn('freq','h',x.id)) haut=freqPicker(x);
  if(ouverte&&pkOn('lien','o',x.id)) bas=lienPicker('o',x.id,
      ts.map(t=>String(t.id)), TRIPS.map(t=>({id:t.id,txt:t.text})), 'a new objective','o');
  if(ouverte&&pkOn('lien','r',x.id)) bas=lienPicker('r',x.id,
      rs.map(r=>String(r.id)), REPS.map(r=>({id:r.id,txt:r.text})), 'a new repulsion','r');
  return ligne(boiteHTML({kind:'h',id:x.id,titre:x.t,unit,minis,ouverte,haut,bas,tue:'Delete habit'}),
    ouverte?'open':'', intCols(x), k+1, x.id);
}

/* ── UN OBJECTIF ─────────────────────────────────────────────────────
   Il montre SES habitudes en navy. La deadline se pose ET se retire. */
function vueObjectif(t,k){
  const ouverte = !!open && open.kind==='t' && String(open.id)===String(t.id);
  const hs=habsOfTrip(t), late=t.days_left!=null&&t.days_left<0;
  /* PLUS DE COMPTEUR. « 3 habits » ne raconte rien — HOW suivi des trois
     habitudes raconte tout. La deadline reste : elle, elle périme. */
  const unit = ouverte
    ? '<input class="in date" type="date" data-date="'+esc(String(t.id))+'" value="'+esc(dateIn(t.target_at))+'">'
      +(t.target_at?'<button type="button" class="v-b" data-nodate="'+esc(String(t.id))+'">no deadline</button>':'')
    : '<span class="v-frq'+(late?' late':'')+'">'+esc(fmtDue(t.days_left))+'</span>';
  const minis = groupe('how', ouverte
    ? hs.map(x=>miniDel('h',x.t,'data-unlink="ho:'+esc(String(t.id))+'|'+esc(String(x.id))+'"')).join('')
      + plus('lien','h',t.id,'habit')
    : hs.map(x=>mini('h',x.t)).join(''));
  const bas = (ouverte&&pkOn('lien','h',t.id))
    ? lienPicker('h',t.id, hs.map(x=>String(x.id)),
        (state.habits||[]).map(x=>({id:x.id,txt:x.t})), 'a new habit','h') : '';
  return ligne(boiteHTML({kind:'t',id:t.id,titre:t.text,unit,minis,ouverte,bas,tue:'Delete objective'}),
    ouverte?'open':'', null, k+1, t.id);
}

/* ── UNE RÉPULSION ───────────────────────────────────────────────────
   Elle montre les habitudes qu'elle protège, en navy. */
function vueRepulsion(r,k){
  const ouverte = !!open && open.kind==='r' && String(open.id)===String(r.id);
  const hs=habsOfRep(r);
  /* UN SEUL MOT, ET IL RACONTE OÙ L'ON EN EST. Il y en avait deux :
     « protects » sur la ligne d'unité ET au-dessus des mini-boîtes — la
     même chose dite deux fois n'est pas du storytelling, c'est du bruit.
     Une répulsion n'a pas d'unité : elle n'existe que par ce qu'elle
     protège. Donc pas de ligne d'unité, et le mot du groupe change selon
     le moment :
       elle protège déjà      →  PROTECTS
       elle ne protège rien   →  WRITE A NEW ONE OR PICK AN EXISTING ONE
     Chaque clic doit dire ce qu'il attend. */
  const unit = '';
  const mot = hs.length ? 'protects' : 'write a new one or pick an existing one';
  const minis = groupe(mot, ouverte
    ? hs.map(x=>miniDel('h',x.t,'data-unlink="hr:'+esc(String(r.id))+'|'+esc(String(x.id))+'"')).join('')
      + plus('lien','hr',r.id,'habit')
    : hs.map(x=>mini('h',x.t)).join(''));
  const bas = (ouverte&&pkOn('lien','hr',r.id))
    ? lienPicker('hr',r.id, hs.map(x=>String(x.id)),
        (state.habits||[]).map(x=>({id:x.id,txt:x.t})), 'a new habit','h') : '';
  return ligne(boiteHTML({kind:'r',id:r.id,titre:r.text,unit,minis,ouverte,bas,tue:'Delete repulsion'}),
    ouverte?'open':'', null, k+1, r.id);
}

/* ══ LA COULEUR SUIT LE REGARD · 08/09/2026 ══════════════════════════
   Le rail s'éteignait selon la POSITION DANS LA LISTE — la première ligne
   pleine, les suivantes dégressives. Mais quand on défile, la première
   ligne n'est plus celle qu'on regarde : on lisait un dégradé qui ne
   parlait plus de rien.
   Désormais c'est la boîte EN HAUT DU CHAMP DE VISION qui porte sa
   couleur pleine, et celles d'en dessous s'éteignent. Le classement reste
   le même — c'est la lecture qui suit l'œil. */
const DEGRADE=[1,.62,.4,.26,.16];
function peintTraits(){
  const sc=$('fv-inner'), box=$('habits'); if(!sc||!box)return;
  const y=sc.getBoundingClientRect().top;
  const rows=[...box.querySelectorAll('.habit')];
  /* La première dont le BAS est encore sous le haut du cadre : c'est elle
     qu'on est en train de lire. */
  let tete=rows.findIndex(r=>r.getBoundingClientRect().bottom > y+4);
  if(tete<0)tete=0;
  rows.forEach((r,i)=>{
    const d=i-tete;
    r.style.setProperty('--tk', d<0?DEGRADE[DEGRADE.length-1]
      : DEGRADE[Math.min(d,DEGRADE.length-1)]);
  });
}
/* Un seul écouteur, et une seule peinture par image : au doigt, un
   `scroll` part quarante fois par seconde et repeindre à chaque fois
   coûterait plus que tout le reste de la page. */
let peintDemande=false;
(function(){ const sc=$('fv-inner'); if(!sc)return;
  sc.addEventListener('scroll',()=>{ if(peintDemande)return; peintDemande=true;
    requestAnimationFrame(()=>{peintDemande=false;peintTraits();}); },{passive:true});
})();

/* ══ OUVRIR, FERMER ══════════════════════════════════════════════════ */
function ouvrir(kind,id){
  open={kind,id:String(id)}; pk=null; renderZone();
  const b=$('habits').querySelector('.habit.open');
  if(!b)return;
  /* MESURÉ : `scrollIntoView` ne bougeait le cadre que de 2 px — dans un
     document dont le corps ne défile pas, il ne trouve pas #fv-inner de
     façon fiable. On lui dit lequel, et de combien. */
  requestAnimationFrame(()=>{const sc=$('fv-inner'); if(!sc)return;
    sc.scrollTop=sc.scrollTop+b.getBoundingClientRect().top-sc.getBoundingClientRect().top-6;});
  const f=b.querySelector('.v-name[contenteditable]');
  if(f&&window.innerWidth>700)f.focus();
}
function fermer(){
  /* UN BROUILLON QU'ON FERME N'A JAMAIS EXISTÉ. Le laisser dans la liste
     ferait croire à une répulsion enregistrée qui disparaîtrait au
     rechargement — le pire des états : visible et faux. */
  REPS=REPS.filter(z=>!z.brouillon);
  open=null; pk=null; renderZone();
  /* L'arbre se recharge ICI, une fois : pendant l'édition il fermerait la
     boîte sous les doigts, après il remet la vérité du serveur. */
  if(wDirty){wDirty=false;loadTrips(true);}
}

/* ══ CRÉER — un bouton par vue, la pièce de CETTE vue ═════════════════ */
async function creer(kind){
  if(kind==='h'){
    const x={id:'h'+(++HSEQ), t:'', f:null, i:null, is:[], o:null};
    state.habits.unshift(x); state.ord=true; save(); ouvrir('h',x.id); return;}
  if(!me){$('member-window').classList.add('show');
          if(typeof memberPaint==='function')memberPaint();return;}
  if(kind==='t'){
    const {data,error}=await sb.rpc('trip_create',{p_text:'',p_target:null});
    if(error){console.error('[totehm] trip_create:',error.message);return;}
    TRIPS.unshift({id:data,text:'',target_at:null,days_left:null,habits:[]});
    wDirty=true; ouvrir('t',data); return;}
  /* ══ UNE RÉPULSION PROTÈGE QUELQUE CHOSE — C'EST SA DÉFINITION ══════
     On ne peut donc pas la poser dans le vide : le serveur ne la rendrait
     plus, elle n'apparaît que PAR ses liens. Avant, on exigeait qu'une
     habitude existe déjà et on refusait par une alerte — un cul-de-sac.
     Maintenant on ouvre un BROUILLON : on écrit la répulsion, et c'est la
     première habitude attachée — reprise OU écrite là — qui la fait
     exister. Même format que les habitudes, logique différente. */
  REPS=REPS.filter(z=>z.id!=='new');
  REPS.unshift({id:'new',text:'',obstacle:'',hs:[],brouillon:true});
  ouvrir('r','new');
  /* APRÈS `ouvrir`, jamais avant : `ouvrir` remet le choix à zéro — c'est
     ce qui garantit qu'ouvrir une boîte n'hérite pas du menu de la
     précédente. Le brouillon ouvre donc son lookup ensuite. */
  pk={q:'lien',k:'hr',id:'new'}; renderZone();
}
/* Le brouillon devient réel : une répulsion, son premier lien, en un
   appel. `repulsion_set` crée la ligne ET le trigger pose le lien. */
async function poseBrouillon(r,habitTexte){
  const {data,error}=await sb.rpc('repulsion_set',
    {p_habit:habitTexte,p_repulsion:r.text||'',p_obstacle:''});
  if(error){console.error('[totehm] repulsion_set:',error.message);return null;}
  r.id=String(data); r.brouillon=false; r.hs=[habitTexte];
  if(open&&open.kind==='r')open.id=String(data);
  if(pk&&pk.k==='hr')pk.id=String(data);
  wDirty=true; return r.id;
}

/* ══ ATTACHER, DÉTACHER ══════════════════════════════════════════════
   Une seule fonction connaît les règles, et il n'y en a que trois :
     une habitude sert PLUSIEURS objectifs ;
     une répulsion protège PLUSIEURS habitudes ;
     détacher n'efface jamais — on retire le lien, pas la pensée. */
function attache(quoi,srcId,cibleId){
  if(quoi==='o'){ const x=habOf(srcId), t=tripOf(cibleId); if(!x||!x.t||!t)return;
    OBJ[x.t]=(OBJ[x.t]||[]).concat([String(t.id)]); posePremier(x);
    apres(sb.rpc('objective_link',{p_obj:t.id,p_habit:x.t})); }
  else if(quoi==='h'){ const t=tripOf(srcId), x=habOf(cibleId); if(!t||!x||!x.t)return;
    OBJ[x.t]=(OBJ[x.t]||[]).concat([String(t.id)]); posePremier(x);
    apres(sb.rpc('objective_link',{p_obj:t.id,p_habit:x.t})); }
  else if(quoi==='r'){ const x=habOf(srcId), r=repOf(cibleId); if(!x||!x.t||!r)return;
    if(!(r.hs||[]).includes(x.t)){r.hs.push(x.t);
      apres(sb.rpc('repulsion_link',{p_id:r.id,p_habit:x.t}));} }
  else { const r=repOf(srcId), x=habOf(cibleId); if(!r||!x||!x.t)return;   /* 'hr' */
    if(r.brouillon){ poseBrouillon(r,x.t).then(()=>renderZone()); return; }
    if(!(r.hs||[]).includes(x.t)){r.hs.push(x.t);
      apres(sb.rpc('repulsion_link',{p_id:r.id,p_habit:x.t}));} }
  wDirty=true;
}
function detache(quoi,aId,bId){
  if(quoi==='o'){ const x=habOf(aId); if(!x||!x.t)return;
    OBJ[x.t]=(OBJ[x.t]||[]).filter(o=>o!==String(bId)); posePremier(x);
    apres(sb.rpc('objective_unlink',{p_obj:bId,p_habit:x.t})); }
  else if(quoi==='ho'){ const x=habOf(bId); if(!x||!x.t)return;
    OBJ[x.t]=(OBJ[x.t]||[]).filter(o=>o!==String(aId)); posePremier(x);
    apres(sb.rpc('objective_unlink',{p_obj:aId,p_habit:x.t})); }
  else if(quoi==='r'){ const x=habOf(aId), r=repOf(bId); if(!x||!x.t||!r)return;
    r.hs=(r.hs||[]).filter(t=>t!==x.t);
    apres(sb.rpc('repulsion_unlink',{p_id:r.id,p_habit:x.t})); }
  else { const r=repOf(aId), x=habOf(bId); if(!r||!x||!x.t)return;          /* 'hr' */
    r.hs=(r.hs||[]).filter(t=>t!==x.t);
    apres(sb.rpc('repulsion_unlink',{p_id:r.id,p_habit:x.t})); }
  wDirty=true;
}
/* Écrire du neuf ET l'attacher, d'un seul geste. */
async function neufEtAttache(quoi,srcId,txt){
  if(quoi==='o'){
    const {data,error}=await sb.rpc('trip_create',{p_text:txt,p_target:null});
    if(error){console.error('[totehm] trip_create:',error.message);return;}
    TRIPS.unshift({id:data,text:txt,target_at:null,days_left:null,habits:[]});
    attache('o',srcId,data);}
  else if(quoi==='r'){
    const x=habOf(srcId); if(!x||!x.t)return;
    const {data,error}=await sb.rpc('repulsion_set',{p_habit:x.t,p_repulsion:txt,p_obstacle:''});
    if(error){console.error('[totehm] repulsion_set:',error.message);return;}
    REPS.unshift({id:data,text:txt,obstacle:'',hs:[x.t]});}
  else{ /* 'h' depuis un objectif, 'hr' depuis une répulsion */
    const x={id:'h'+(++HSEQ), t:txt, f:null, i:null, is:[], o:null};
    state.habits.unshift(x); state.ord=true; save();
    attache(quoi,srcId,x.id);}
  pk=null; renderZone();
  return;
}

/* ══ LE CÂBLAGE — un seul, posé sur la liste entière ═════════════════
   Délégation : la liste est redessinée à chaque geste, et rattacher
   trente écouteurs à chaque rendu, c'est trente fuites en puissance. */
let cableFait=false;
function cable(box){
  if(cableFait)return; cableFait=true;

  box.addEventListener('click',async e=>{
    const el=e.target.closest('[data-open],[data-add],[data-x],[data-pk],[data-int],'
      +'[data-fq],[data-lien],[data-unlink],[data-nodate],[data-kill]');
    if(!el)return;
    const d=el.dataset;

    if(d.open){ if(ordering)return; const p=d.open.split(':'); ouvrir(p[0],p[1]); return; }
    if(d.add){ if(ordering)return; creer(d.add); return; }
    if(d.x!==undefined){ e.stopPropagation(); fermer(); return; }
    if(d.pk){ e.stopPropagation(); const p=d.pk.split(':'); pkSet(p[0],p[1],p[2]); return; }

    e.stopPropagation();
    if(d.int){ const p=d.int.split('|'); const x=habOf(p[0]); if(x)intToggle(x,p[1]); renderZone(); return; }
    if(d.fq){ const p=d.fq.split('|'); const x=habOf(p[0]);
      if(x){x.f=p[1];save();} pk=null; renderZone(); return; }
    if(d.lien){ const p=d.lien.split('|'), q=p[0].split(':');
      attache(q[0],q[1],p[1]); pk=null; renderZone(); return; }
    if(d.unlink){ const p=d.unlink.split('|'), q=p[0].split(':');
      detache(q[0],q[1],p[1]); renderZone(); return; }
    if(d.nodate){ const t=tripOf(d.nodate); if(t){t.target_at=null;t.days_left=null;
      apres(sb.rpc('trip_set_target',{p_trip:t.id,p_target:null})); wDirty=true;}
      renderZone(); return; }
    if(d.kill){ const p=d.kill.split(':'); tue(p[0],p[1]); return; }
  });

  /* Le clavier ouvre ce que le doigt ouvre. */
  box.addEventListener('keydown',e=>{
    const el=e.target.closest&&e.target.closest('[data-open]');
    if(el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();
      const p=el.dataset.open.split(':'); ouvrir(p[0],p[1]);}
  });

  /* ══ LA SAISIE — TOUT S'ENREGISTRE EN ÉCRIVANT ═════════════════════
     Aucun bouton [Done] nulle part : ce qu'on écrit est posé. */
  box.addEventListener('input',e=>{
    const t=e.target;
    if(t.dataset.edit){
      const p=t.dataset.edit.split(':'), v=t.textContent;
      if(p[0]==='h'){ const x=habOf(p[1]); if(!x)return;
        const ancien=x.t; x.t=v;
        differe(()=>{ save();
          /* Renommer ne doit pas orpheliner ce qui s'y rattache : le lien
             est du TEXTE, il se répare côté serveur en un appel. */
          if(me&&ancien&&ancien!==x.t){
            REPS.forEach(r=>{const i=(r.hs||[]).indexOf(ancien); if(i>=0)r.hs[i]=x.t;});
            if(OBJ[ancien]){OBJ[x.t]=OBJ[ancien]; delete OBJ[ancien];}
            apres(sb.rpc('habit_rename_links',{p_old:ancien,p_new:x.t}));} }); }
      else if(p[0]==='t'){ const z=tripOf(p[1]); if(!z)return; z.text=v; wDirty=true;
        differe(()=>apres(sb.rpc('trip_rename',{p_trip:z.id,p_text:z.text}))); }
      else { const r=repOf(p[1]); if(!r)return; r.text=v; wDirty=true;
        /* Un brouillon s'écrit en mémoire : il n'a pas encore de ligne en
           base, et `repulsion_set` sans habitude en créerait une invisible. */
        if(r.brouillon)return;
        differe(()=>apres(sb.rpc('repulsion_set',
          {p_habit:(r.hs||[])[0]||'', p_repulsion:r.text, p_obstacle:r.obstacle||''}))); }
      return;
    }
    /* Le rythme écrit dans sa langue : on devine à la frappe, sans réseau. */
    if(t.dataset.fqin && pk){
      pk.txt=t.value;
      const g=(typeof deduceFreq==='function')?deduceFreq(t.value):null;
      const av=pk.devine; pk.devine = (g&&FREQ_BY_ID[g])?g:null;
      if(av!==pk.devine){ const cur=t.selectionStart; renderZone();
        const n=$('habits').querySelector('[data-fqin]');
        if(n){n.focus(); try{n.setSelectionRange(cur,cur);}catch(_){}} }
    }
  });
  box.addEventListener('change',e=>{
    if(e.target.dataset.date){ const t=tripOf(e.target.dataset.date); if(!t)return;
      const v=e.target.value; t.target_at = v ? v+'T00:00:00Z' : null;
      apres(sb.rpc('trip_set_target',{p_trip:t.id,p_target:t.target_at}));
      wDirty=true; }
  });
  box.addEventListener('keydown',e=>{
    if(e.key!=='Enter')return;
    const t=e.target;
    if(t.dataset.nw){ e.preventDefault();
      const v=t.value.trim(); if(!v)return;
      const q=t.dataset.nw.split(':'); neufEtAttache(q[0],q[1],v); return; }
    if(t.dataset.fqin){ e.preventDefault();
      if(pk&&pk.devine){ const x=habOf(pk.id); if(x){x.f=pk.devine;save();} pk=null; renderZone(); } }
  });
}

/* SUPPRIMER — ici, et nulle part ailleurs. */
function tue(kind,id){
  if(kind==='h'){ const x=habOf(id); if(!x)return;
    logTotehmEvent('habit_removed',x.t,{f:x.f,i:x.i});
    state.habits=state.habits.filter(z=>z.id!==id);
    REPS.forEach(r=>{const i=(r.hs||[]).indexOf(x.t);
      if(i>=0){r.hs.splice(i,1); if(me)apres(sb.rpc('repulsion_unlink',{p_id:r.id,p_habit:x.t}));}});
    if(x.t&&OBJ[x.t]){OBJ[x.t].forEach(o=>apres(sb.rpc('objective_unlink',{p_obj:o,p_habit:x.t})));
      delete OBJ[x.t];}
    save(); }
  else if(kind==='t'){ TRIPS=TRIPS.filter(t=>String(t.id)!==String(id));
    (state.habits||[]).forEach(x=>{ if(x.t&&OBJ[x.t]){
      OBJ[x.t]=OBJ[x.t].filter(o=>o!==String(id)); posePremier(x);} });
    apres(sb.rpc('trip_close',{p_trip:id,p_outcome:'dropped'})); }
  else { const r=repOf(id); REPS=REPS.filter(z=>String(z.id)!==String(id));
    if(r&&!r.brouillon)apres(sb.rpc('repulsion_retire',{p_id:Number(id)})); }
  wDirty=true; fermer();
}
