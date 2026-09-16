# -*- coding: utf-8 -*-
"""LOT DU 16/09/2026 · 3/3 bis — LES CINQ BOITES ET LEURS LIENS

    python3 tools/lot16_moteur2.py   (apres lot16_moteur.py)

⚠️ N'ECRIT QU'A LA FIN.
"""
import os, sys
SC = os.path.dirname(os.path.abspath(__file__)) + '/'
P  = SC + '../com/totehm.html'
rates = []

def ech(s, vieux, neuf, quoi, attendu=1):
    n = s.count(vieux)
    if n != attendu:
        rates.append('%s : %d fois, attendu %d\n      %s'
                     % (quoi, n, attendu, vieux.strip()[:96]))
        return s
    return s.replace(vieux, neuf)

s = open(P, encoding='utf-8').read()

# ═══════════════════════════════════════════════════════════════════════
# 1 · LES ACCESSEURS DES CINQ OBJETS
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""const tripOf =id=>TRIPS.find(t=>String(t.id)===String(id))||null;
const repOf  =id=>REPS.find(r=>String(r.id)===String(id))||null;""",
"""const tripOf =id=>TRIPS.find(t=>String(t.id)===String(id))||null;
const repOf  =id=>REPS.find(r=>String(r.id)===String(id))||null;
const teachOf=id=>TEACH.find(w=>String(w.id)===String(id))||null;
const visOf  =id=>VIS.find(v=>String(v.id)===String(id))||null;
/* UN SEUL POINT D'ENTREE POUR LES CINQ. Tout ce qui est generique — les
   intentions, le renommage, la suppression — passe par ici. Cinq `if`
   recopies a cinq endroits, c'est cinq endroits ou en oublier un. */
const objetDe=(k,id)=> k==='h'?habOf(id) : k==='t'?tripOf(id) : k==='r'?repOf(id)
                     : k==='w'?teachOf(id) : k==='v'?visOf(id) : null;
/* ══ LES LIENS CROISES · 16/09/2026 ══════════════════════════════════
   Un objectif sert une VISION. Une repulsion s'eclaire d'une LECON.
   Les deux tables existaient depuis le 15 ; rien ne pouvait les remplir.
   On tient les DEUX cotes en memoire (`t.vs` et `v.os`) : sinon poser un
   lien depuis l'objectif ne se verrait pas dans la vision avant un
   rechargement, et l'ecran mentirait le temps d'un aller-retour. */
const visionsOfTrip =t=>(t&&t.vs||[]).map(visOf).filter(Boolean);
const tripsOfVision =v=>(v&&v.os||[]).map(tripOf).filter(Boolean);
const teachOfRep    =r=>(r&&r.ws||[]).map(teachOf).filter(Boolean);
const repsOfTeach   =w=>REPS.filter(r=>(r.ws||[]).includes(String(w.id)));""",
'accesseurs des cinq objets')

# ═══════════════════════════════════════════════════════════════════════
# 2 · LES MINI-BOITES ONT DEUX COULEURS DE PLUS
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
""".blk-o{--skin:var(--blue)}
.blk-h{--skin:var(--navy)}
.blk-r{--skin:var(--rep)}""",
""".blk-o{--skin:var(--blue)}
.blk-h{--skin:var(--navy)}
.blk-r{--skin:var(--rep)}
/* Une vision est de la famille du futur (bleu), une lecon de la famille
   du passe (rouge-violet) : la mini-boite porte la couleur de CE QU'ELLE
   EST, jamais celle de la boite qui l'accueille. */
.blk-v{--skin:var(--blue)}
.blk-w{--skin:var(--rep)}""",
'peaux des mini-boites v et w')

# ═══════════════════════════════════════════════════════════════════════
# 3 · listeDe / poseListe
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""const listeDe=v=>v==='habits'?(state.habits||[]):v==='objectives'?TRIPS:REPS;
function poseListe(v,arr){
  if(v==='habits'){state.habits=arr;state.ord=true;save();}
  else if(v==='objectives')TRIPS=arr; else REPS=arr;}""",
"""const listeDe=v=>v==='habits'?(state.habits||[]):v==='objectives'?TRIPS
  :v==='repulsions'?REPS:v==='wisdom'?TEACH:VIS;
function poseListe(v,arr){
  if(v==='habits'){state.habits=arr;state.ord=true;save();}
  else if(v==='objectives')TRIPS=arr;
  else if(v==='repulsions')REPS=arr;
  else if(v==='wisdom')TEACH=arr; else VIS=arr;}""",
'listeDe / poseListe')

# ═══════════════════════════════════════════════════════════════════════
# 4 · renderZone — cinq branches
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""  }else{
    NB=REPS.length; h=REPS.map((r,k)=>vueRepulsion(r,k)).join('');
    if(!REPS.length)h+='<div class="void">'+(tripsLoaded?'no repulsion yet':'loading…')+'</div>';
    h+=ligne('<button type="button" class="add-box" data-add="r">+ <b>Add a Repulsion</b></button>','add');
  }""",
"""  }else if(view==='repulsions'){
    NB=REPS.length; h=REPS.map((r,k)=>vueRepulsion(r,k)).join('');
    if(!REPS.length)h+='<div class="void">'+(tripsLoaded?'no repulsion yet':'loading…')+'</div>';
    h+=ligne('<button type="button" class="add-box" data-add="r">+ <b>Add a Repulsion</b></button>','add');
  }else if(view==='wisdom'){
    NB=TEACH.length; h=TEACH.map((w,k)=>vueTeaching(w,k)).join('');
    if(!TEACH.length)h+='<div class="void">'+(tripsLoaded?'no teaching yet':'loading…')+'</div>';
    h+=ligne('<button type="button" class="add-box" data-add="w">+ <b>Add a Teaching</b></button>','add');
  }else{
    NB=VIS.length; h=VIS.map((v,k)=>vueVision(v,k)).join('');
    if(!VIS.length)h+='<div class="void">'+(tripsLoaded?'no vision yet':'loading…')+'</div>';
    h+=ligne('<button type="button" class="add-box" data-add="v">+ <b>Add a Vision</b></button>','add');
  }""",
'renderZone cinq branches')

s = ech(s,
"""    habitudes:(state.habits||[]).length, objectifs:TRIPS.length, repulsions:REPS.length,""",
"""    habitudes:(state.habits||[]).length, objectifs:TRIPS.length, repulsions:REPS.length,
    lecons:TEACH.length, visions:VIS.length,""",
'diagnostic')

# ═══════════════════════════════════════════════════════════════════════
# 5 · L'OBJECTIF MONTRE SES VISIONS, ET PORTE SES INTENTIONS
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""  const unit = ouverte
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
    ouverte?'open':'', null, k+1, t.id, k===0, k===NB-1);""",
"""  const vs=visionsOfTrip(t), l=intIds(t);
  const unit = ouverte
    ? '<input class="in date" type="date" data-date="'+esc(String(t.id))+'" value="'+esc(dateIn(t.target_at))+'">'
      +(t.target_at?'<button type="button" class="v-b" data-nodate="'+esc(String(t.id))+'">no deadline</button>':'')
      +intBouton(t,'t')
    : '<span class="v-frq'+(late?' late':'')+'">'+esc(fmtDue(t.days_left))+'</span>'+intMots(t);
  /* HOW descend vers les habitudes, TOWARDS monte vers la vision : un
     objectif est le milieu d'une phrase, pas une liste. */
  const minis = groupe('how', ouverte
    ? hs.map(x=>miniDel('h',x.t,'data-unlink="ho:'+esc(String(t.id))+'|'+esc(String(x.id))+'"')).join('')
      + plus('lien','h',t.id,'habit')
    : hs.map(x=>mini('h',x.t)).join(''))
   + groupe('towards', ouverte
    ? vs.map(v=>miniDel('v',v.t,'data-unlink="ov:'+esc(String(t.id))+'|'+esc(String(v.id))+'"')).join('')
      + plus('lien','ov',t.id,'vision')
    : vs.map(v=>mini('v',v.t)).join(''));
  let haut='';
  if(ouverte&&pkOn('int','t',t.id)) haut=intPicker(t,'t');
  let bas='';
  if(ouverte&&pkOn('lien','h',t.id))
    bas=lienPicker('h',t.id, hs.map(x=>String(x.id)),
        (state.habits||[]).map(x=>({id:x.id,txt:x.t})), 'a new habit','h');
  if(ouverte&&pkOn('lien','ov',t.id))
    bas=lienPicker('ov',t.id, vs.map(v=>String(v.id)),
        VIS.map(v=>({id:v.id,txt:v.t})), 'a new vision','v');
  return ligne(boiteHTML({kind:'t',id:t.id,titre:t.text,unit,minis,ouverte,haut,bas,tue:'Delete objective'}),
    ouverte?'open':'', intCols(t), k+1, t.id, k===0, k===NB-1);""",
'vueObjectif')

# ═══════════════════════════════════════════════════════════════════════
# 6 · LA REPULSION MONTRE SES LECONS
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""  const unit = '';
  const mot = 'instead';
  const minis = groupe(mot, ouverte
    ? hs.map(x=>miniDel('h',x.t,'data-unlink="hr:'+esc(String(r.id))+'|'+esc(String(x.id))+'"')).join('')
      + plus('lien','hr',r.id,'habit')
    : hs.map(x=>mini('h',x.t)).join(''));""",
"""  const ws=teachOfRep(r);
  const unit = ouverte ? intBouton(r,'r') : intMots(r);
  const mot = 'instead';
  const minis = groupe(mot, ouverte
    ? hs.map(x=>miniDel('h',x.t,'data-unlink="hr:'+esc(String(r.id))+'|'+esc(String(x.id))+'"')).join('')
      + plus('lien','hr',r.id,'habit')
    : hs.map(x=>mini('h',x.t)).join(''))
   /* LEARNED : ce qu'on a compris de cette mauvaise habitude. C'est le
      seul pont entre le present qu'on tue et le passe qu'on garde. */
   + groupe('learned', ouverte
    ? ws.map(w=>miniDel('w',w.t,'data-unlink="rw:'+esc(String(r.id))+'|'+esc(String(w.id))+'"')).join('')
      + plus('lien','rw',r.id,'teaching')
    : ws.map(w=>mini('w',w.t)).join(''));""",
'vueRepulsion minis')

s = ech(s,
"""  const bas = (ouverte&&pkOn('lien','hr',r.id))
    ? '<span class="pk-say">write a new one or pick an existing one</span>'
      + lienPicker('hr',r.id, hs.map(x=>String(x.id)),
        (state.habits||[]).map(x=>({id:x.id,txt:x.t})), 'a new habit','h') : '';
  return ligne(boiteHTML({kind:'r',id:r.id,titre:r.text,unit,minis,ouverte,bas,tue:'Delete repulsion'}),
    ouverte?'open':'', null, k+1, r.id, k===0, k===NB-1);""",
"""  let haut='';
  if(ouverte&&pkOn('int','r',r.id)) haut=intPicker(r,'r');
  let bas='';
  if(ouverte&&pkOn('lien','hr',r.id))
    bas='<span class="pk-say">write a new one or pick an existing one</span>'
      + lienPicker('hr',r.id, hs.map(x=>String(x.id)),
        (state.habits||[]).map(x=>({id:x.id,txt:x.t})), 'a new habit','h');
  if(ouverte&&pkOn('lien','rw',r.id))
    bas=lienPicker('rw',r.id, ws.map(w=>String(w.id)),
        TEACH.map(w=>({id:w.id,txt:w.t})), 'a new teaching','w');
  return ligne(boiteHTML({kind:'r',id:r.id,titre:r.text,unit,minis,ouverte,haut,bas,tue:'Delete repulsion'}),
    ouverte?'open':'', intCols(r), k+1, r.id, k===0, k===NB-1);
}

/* ── LES DEUX RÉGLAGES D'INTENTION, PARTAGÉS ─────────────────────────
   Le bouton quand la boîte est ouverte, les mots quand elle est fermée.
   Quatre boîtes s'en servent : les écrire quatre fois, c'est se garantir
   que la cinquième sera différente. */
function intBouton(x,kind){ const l=intIds(x);
  return '<button type="button" class="v-b'+(l.length?'':' vit')+'" data-pk="int:'+kind+':'+esc(String(x.id))+'">'
    +(l.length?l.map(i=>'<b style="color:'+intColor(i)+'">'+esc(intName(i))+'</b>').join(' · ')
              :'set intention')+'</button>'; }
function intMots(x){ const l=intIds(x);
  return l.length?l.map(i=>'<span class="v-int" style="color:'+intColor(i)+'">'+esc(intName(i))+'</span>').join('')
                 :'<span class="v-pil vit">set intention</span>'; }

/* ── UNE LEÇON (MY WISDOM · le passé) ────────────────────────────────
   Ce qu'on a compris. Elle montre les répulsions qu'elle éclaire : une
   leçon sans la bêtise qui l'a produite n'est qu'une citation. */
function vueTeaching(w,k){
  const ouverte = !!open && open.kind==='w' && String(open.id)===String(w.id);
  const rs=repsOfTeach(w);
  const unit = ouverte ? intBouton(w,'w') : intMots(w);
  const minis = groupe('learned from', ouverte
    ? rs.map(r=>miniDel('r',r.text,'data-unlink="wr:'+esc(String(w.id))+'|'+esc(String(r.id))+'"')).join('')
      + plus('lien','wr',w.id,'repulsion')
    : rs.map(r=>mini('r',r.text)).join(''));
  let haut='';
  if(ouverte&&pkOn('int','w',w.id)) haut=intPicker(w,'w');
  let bas='';
  if(ouverte&&pkOn('lien','wr',w.id))
    bas=lienPicker('wr',w.id, rs.map(r=>String(r.id)),
        REPS.map(r=>({id:r.id,txt:r.text})), 'a new repulsion','r');
  return ligne(boiteHTML({kind:'w',id:w.id,titre:w.t,unit,minis,ouverte,haut,bas,tue:'Delete teaching'}),
    ouverte?'open':'', intCols(w), k+1, w.id, k===0, k===NB-1);
}

/* ── UNE VISION (MY VISION · le futur) ───────────────────────────────
   Seulement ce qu'on voit venir, et seulement le bon. Elle montre les
   objectifs qui y mènent. */
function vueVision(v,k){
  const ouverte = !!open && open.kind==='v' && String(open.id)===String(v.id);
  const ts=tripsOfVision(v);
  const unit = ouverte ? intBouton(v,'v') : intMots(v);
  const minis = groupe('reached by', ouverte
    ? ts.map(t=>miniDel('o',t.text,'data-unlink="vo:'+esc(String(v.id))+'|'+esc(String(t.id))+'"')).join('')
      + plus('lien','vo',v.id,'objective')
    : ts.map(t=>mini('o',t.text)).join(''));
  let haut='';
  if(ouverte&&pkOn('int','v',v.id)) haut=intPicker(v,'v');
  let bas='';
  if(ouverte&&pkOn('lien','vo',v.id))
    bas=lienPicker('vo',v.id, ts.map(t=>String(t.id)),
        TRIPS.map(t=>({id:t.id,txt:t.text})), 'a new objective','o');
  return ligne(boiteHTML({kind:'v',id:v.id,titre:v.t,unit,minis,ouverte,haut,bas,tue:'Delete vision'}),
    ouverte?'open':'', intCols(v), k+1, v.id, k===0, k===NB-1);""",
'vueRepulsion bas + vueTeaching + vueVision')

# l'habitude utilise desormais les deux helpers partages
s = ech(s,
"""  const unit = ouverte
    ? '<button type="button" class="v-b'+(l.length?'':' vit')+'" data-pk="int:h:'+esc(String(x.id))+'">'
      +(l.length?l.map(i=>'<b style="color:'+intColor(i)+'">'+esc(intName(i))+'</b>').join(' · ')
                :'set intention')+'</button>'
      +'<button type="button" class="v-b'+(x.f?'':' vit')+'" data-pk="freq:h:'+esc(String(x.id))+'">'
      +esc(x.f?flabel(x.f):'set time frequency')+' ▾</button>'
    : (l.length?l.map(i=>'<span class="v-int" style="color:'+intColor(i)+'">'+esc(intName(i))+'</span>').join('')
               :'<span class="v-pil vit">set intention</span>')
      +'<span class="v-frq'+(x.f?'':' vit')+'">'+esc(x.f?flabel(x.f):'set time frequency')+'</span>';""",
"""  const unit = ouverte
    ? intBouton(x,'h')
      +'<button type="button" class="v-b'+(x.f?'':' vit')+'" data-pk="freq:h:'+esc(String(x.id))+'">'
      +esc(x.f?flabel(x.f):'set time frequency')+' ▾</button>'
    : intMots(x)
      +'<span class="v-frq'+(x.f?'':' vit')+'">'+esc(x.f?flabel(x.f):'set time frequency')+'</span>';""",
'vueHabitude utilise les helpers')

s = ech(s,
"""  if(ouverte&&pkOn('int','h',x.id))  haut=intPicker(x);""",
"""  if(ouverte&&pkOn('int','h',x.id))  haut=intPicker(x,'h');""",
'intPicker habitude')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (etape 2/3 du moteur)')
