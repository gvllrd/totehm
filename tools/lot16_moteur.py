# -*- coding: utf-8 -*-
"""LOT DU 16/09/2026 · 3/3 — LE MOTEUR DES CINQ OBJETS

    python3 tools/lot16_moteur.py   (apres lot16_cinq_vues.py)

CE QU'IL CORRIGE, ET POURQUOI C'ETAIT CASSE
  · CREER UNE REPULSION ne creait rien : le brouillon partait dans
    `repulsion_set`, qui LEVE sur un texte vide -- et on ouvrait le
    lookup AVANT d'avoir un texte. Cul-de-sac silencieux. La repulsion
    se cree maintenant comme les quatre autres objets : une ligne vide,
    puis on ecrit dedans (`repulsion_create`).
  · AJOUTER UN TEACHING etait impossible : il n'y avait pas de bouton.
    Les teachings vivaient dans `wisdom.html`, un document separe.
  · LES OBJECTIFS D'UNE HABITUDE ne revenaient jamais du serveur :
    `my_trips` ne rendait pas `h.objectives`. `OBJ` restait vide.

CE QU'IL AJOUTE
  · cinq listes, cinq vues, une croix ;
  · les 7 intentions sur les CINQ objets (`intentions_set`) ;
  · les liens croises : objectif <-> vision, repulsion <-> teaching ;
  · le passage vertical AU BOUT DE LA LISTE.

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
# 1 · L'ETAT — cinq listes, une croix
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""const VIEW_ORDER=['repulsions','habits','objectives'];
let TRIPS=[], REPS=[], tripsLoaded=false;""",
"""/* ══ LA CROIX · 16/09/2026 ═══════════════════════════════════════════
   `VIEW_ORDER` decrivait une RANGEE. Il y a maintenant deux axes, et ils
   ne disent pas la meme chose : l'horizontale est le TEMPS, la verticale
   est la PROFONDEUR. Une seule table les porte, et tout ce qui navigue —
   le doigt, le trackpad, les fleches, les carres — la lit. Deux tables
   finiraient par dire deux choses differentes. */
const CROIX={
  wisdom:     {d:'habits'},
  habits:     {g:'wisdom', d:'visions', h:'objectives', b:'repulsions'},
  visions:    {g:'habits'},
  objectives: {b:'habits'},
  repulsions: {h:'habits'},
};
const voisin=d=>(CROIX[view]||{})[d]||null;
function versVoisin(d){ const v=voisin(d); if(v)setView(v); }
/* Les cinq listes. `state.habits` vit en local (elle est dans `steps`),
   les quatre autres viennent du serveur en UN appel — `my_trips`. */
let TRIPS=[], REPS=[], TEACH=[], VIS=[], tripsLoaded=false;""",
'la croix + les cinq listes')

# ═══════════════════════════════════════════════════════════════════════
# 2 · paintZone — cinq peaux
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""  st.classList.toggle('v-h',view==='habits');
  st.classList.toggle('v-o',view==='objectives');
  st.classList.toggle('v-r',view==='repulsions');""",
"""  st.classList.toggle('v-h',view==='habits');
  st.classList.toggle('v-o',view==='objectives');
  st.classList.toggle('v-r',view==='repulsions');
  st.classList.toggle('v-w',view==='wisdom');
  st.classList.toggle('v-v',view==='visions');""",
'paintZone stage')

s = ech(s,
"""  document.body.classList.toggle('v-habits',view==='habits');
  document.body.classList.toggle('v-objectives',view==='objectives');
  document.body.classList.toggle('v-repulsions',view==='repulsions');""",
"""  document.body.classList.toggle('v-habits',view==='habits');
  document.body.classList.toggle('v-objectives',view==='objectives');
  document.body.classList.toggle('v-repulsions',view==='repulsions');
  /* Ces deux-la changent le PAPIER : voir la feuille de style. */
  document.body.classList.toggle('v-wisdom',view==='wisdom');
  document.body.classList.toggle('v-visions',view==='visions');""",
'paintZone body')

# ═══════════════════════════════════════════════════════════════════════
# 3 · loadTrips — l'arbre entier
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""    TRIPS=data.trips||[];
    /* Le serveur rend, sur CHAQUE habitude, la liste de ses objectifs.
       On la range par texte d'habitude : c'est la seule clé que `steps`
       et la base ont en commun. */
    OBJ={};
    (TRIPS.concat([{habits:data.loose||[]}])).forEach(t=>
      (t.habits||[]).forEach(h=>{
        if(h&&h.t&&Array.isArray(h.objectives))OBJ[h.t]=h.objectives.map(String);}));
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
    tripsLoaded=true;""",
"""    TRIPS=(data.trips||[]).map(t=>Object.assign({},t,{
      is:Array.isArray(t.is)?t.is:[], vs:(t.visions||[]).map(String)}));
    /* ⚠️ `OBJ` VIENT MAINTENANT DU SERVEUR, ET IL ARRIVE VRAIMENT.
       On lisait `h.objectives` sur chaque habitude — une clé que
       `my_trips` n'a JAMAIS rendue. `OBJ` restait donc vide et une
       habitude ne montrait que l'objectif porté par `steps.o`, un seul,
       alors que `objective_habits` en portait plusieurs. Les liens
       étaient écrits en base et invisibles à l'écran.
       `data.objs` est la table texte-d'habitude → identifiants. */
    OBJ={};
    const oj=data.objs||{};
    Object.keys(oj).forEach(k=>{ OBJ[k]=(oj[k]||[]).map(String); });
    /* UNE RÉPULSION, UNE LIGNE. Le serveur la rend maintenant À PLAT,
       avec TOUTES ses habitudes — la colonne historique ET la table de
       liens réunies. Avant, elle n'arrivait que nichée sous l'habitude de
       sa colonne `habit_text` : un lien posé par `repulsion_link` était
       écrit en base et invisible ici. */
    REPS=(data.reps||[]).map(r=>({id:r.id, text:r.text||'', obstacle:r.obstacle||'',
      hs:(r.hs||[]).slice(), ws:(r.ws||[]).map(String),
      is:Array.isArray(r.is)?r.is:[]}));
    TEACH=(data.wisdom||[]).map(w=>({id:String(w.id), t:w.text||'', t0:w.text||'',
      is:Array.isArray(w.is)?w.is:[], os:(w.os||[]).map(String)}));
    VIS=(data.visions||[]).map(v=>({id:String(v.id), t:v.text||'', t0:v.text||'',
      is:Array.isArray(v.is)?v.is:[], os:(v.os||[]).map(String)}));
    tripsLoaded=true;""",
'loadTrips')

# ═══════════════════════════════════════════════════════════════════════
# 4 · LES INTENTIONS SUR LES CINQ OBJETS
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""const intIds=x=>!x?[]:(Array.isArray(x.is)&&x.is.length?x.is:(x.i?[x.i]:[]));
function intToggle(x,id){
  const l=intIds(x).slice(), k=l.indexOf(id);
  if(k<0)l.push(id); else l.splice(k,1);
  x.is=l; x.i=l.length?l[0]:null; save();
}""",
"""const intIds=x=>!x?[]:(Array.isArray(x.is)&&x.is.length?x.is:(x.i?[x.i]:[]));
/* ══ LES 7 INTENTIONS SE RATTACHENT AUX 5 OBJETS · 16/09/2026 ════════
   Elles ne vivaient que sur les habitudes. Une intention sur un
   objectif, une répulsion, une vision ou une leçon dit la même chose —
   à quoi ça sert dans une vie — et c'est le filtre du produit entier.
   L'habitude s'écrit dans `steps` (donc `save()`), les quatre autres ont
   une ligne en base (donc `intentions_set`). Un seul verbe côté serveur
   pour les quatre : quatre fonctions finiraient par diverger. */
function intToggle(x,id,kind){
  const l=intIds(x).slice(), k=l.indexOf(id);
  if(k<0)l.push(id); else l.splice(k,1);
  x.is=l; x.i=l.length?l[0]:null;
  if(!kind||kind==='h'){ save(); return; }
  wDirty=true;
  apres(sb.rpc('intentions_set',{p_kind:kind,p_id:String(x.id),p_is:l}));
}""",
'intToggle')

# l'appel du picker porte le genre
s = ech(s,
"""    if(d.int){ const p=d.int.split('|'); const x=habOf(p[0]); if(x)intToggle(x,p[1]); renderZone(); return; }""",
"""    /* `data-int` porte maintenant le GENRE : sans lui on ne saurait pas
       dans quelle table écrire, et on écrirait dans `steps`. */
    if(d.int){ const p=d.int.split('|');
      const kind=p.length>2?p[0]:'h', oid=p.length>2?p[1]:p[0], iid=p[p.length-1];
      const x=objetDe(kind,oid); if(x)intToggle(x,iid,kind); renderZone(); return; }""",
'dispatch data-int')

s = ech(s,
"""const intPicker=x=>{const l=intIds(x);
  return '<span class="pkw"><span class="ints">'+INTS.map(z=>
    '<button type="button" class="int'+(l.includes(z.id)?' on':'')+'" data-int="'
    +esc(String(x.id))+'|'+z.id+'" aria-pressed="'+l.includes(z.id)+'" style="--ic:'+z.color+'">'""",
"""const intPicker=(x,kind)=>{const l=intIds(x); const kk=kind||'h';
  return '<span class="pkw"><span class="ints">'+INTS.map(z=>
    '<button type="button" class="int'+(l.includes(z.id)?' on':'')+'" data-int="'
    +kk+'|'+esc(String(x.id))+'|'+z.id+'" aria-pressed="'+l.includes(z.id)+'" style="--ic:'+z.color+'">'""",
'intPicker porte le genre')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (etape 1/3 du moteur)')
