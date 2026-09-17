# -*- coding: utf-8 -*-
"""LOT DU 17/09/2026 · LES QUATRE REGRESSIONS
    python3 tools/lot17_regressions.py

1. LES INTENTIONS REDEVIENNENT L'AFFAIRE DES HABITUDES.
   Je les avais posees sur les cinq objets. C'est faux, et Wah a raison :
   une intention qualifie un GESTE REPETE, pas un souhait. Un objectif ou
   une repulsion n'en porte pas -- il HERITE de celles des habitudes qui
   lui sont liees. Le trait de gauche redevient donc la SOMME des
   intentions des habitudes liees : multicolore quand plusieurs habitudes
   d'intentions differentes s'y accrochent. C'etait le comportement
   d'avant, et il disait quelque chose de vrai.

2. LA BOITE D'EDITION NAIT EN BAS DE LISTE, pas en haut. On appuie sur
   [+ Add a ...] qui est en bas ; la boite doit s'ouvrir LA, sous le
   doigt. Elle apparaissait tout en haut : l'ecran sautait et on perdait
   ou on en etait.

3. PLUS D'ATTENTE A LA CREATION. `creer()` attendait la reponse du
   serveur avant d'ouvrir la boite -- 300 a 600 ms de vide sur un vrai
   reseau. On ouvre MAINTENANT, avec un identifiant provisoire, et on
   remplace l'identifiant quand le serveur repond. C'est la doctrine
   optimiste du reste du fichier ; la creation etait la seule exception.

4. PLUS D'ESPACE MEMBRE dans le Totehm deplie.

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
# 1 · LES INTENTIONS REDEVIENNENT L'AFFAIRE DES HABITUDES
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""const intCols=x=>intIds(x).map(intColor);""",
"""const intCols=x=>intIds(x).map(intColor);
/* ══ UN OBJET SERVEUR N'A PAS D'INTENTION — IL EN HÉRITE · 17/09/2026 ═
   ⚠️ J'avais posé les sept intentions sur les CINQ objets. C'est faux.
   Une intention qualifie un GESTE RÉPÉTÉ — pourquoi on le refait. Un
   objectif est une destination, une répulsion est ce qu'on arrête, une
   vision est ce qu'on voit venir : aucun des trois ne se répète, donc
   aucun des trois n'a d'intention propre.
   Ce qu'ils ont, c'est la SOMME de celles de leurs habitudes. Le trait
   de gauche d'un objectif lié à trois habitudes de trois intentions
   différentes est donc tricolore — et il dit quelque chose de vrai :
   « cet objectif tire sur ces trois registres de ma vie ».
   Les colonnes `i`/`is` restent en base sur les quatre tables : elles ne
   gênent personne, et les y remettre coûterait une migration pour rien.
   Ce qui compte, c'est que l'ÉCRAN ne les propose plus. */
const colsHeritees = habs => {
  const vu = new Set();
  habs.forEach(x => intIds(x).forEach(i => vu.add(i)));
  /* L'ordre des sept est celui de `INTS`, jamais celui de la rencontre :
     deux objectifs aux mêmes intentions doivent donner le même trait. */
  return INTS.filter(z => vu.has(z.id)).map(z => z.color);
};""",
'colsHeritees')

# ── l'objectif : plus de bouton d'intention, un trait herite
s = ech(s,
"""  const vs=visionsOfTrip(t), l=intIds(t);
  const unit = ouverte
    ? '<input class="in date" type="date" data-date="'+esc(String(t.id))+'" value="'+esc(dateIn(t.target_at))+'">'
      +(t.target_at?'<button type="button" class="v-b" data-nodate="'+esc(String(t.id))+'">no deadline</button>':'')
      +intBouton(t,'t')
    : '<span class="v-frq'+(late?' late':'')+'">'+esc(fmtDue(t.days_left))+'</span>'+intMots(t);""",
"""  const vs=visionsOfTrip(t);
  const unit = ouverte
    ? '<input class="in date" type="date" data-date="'+esc(String(t.id))+'" value="'+esc(dateIn(t.target_at))+'">'
      +(t.target_at?'<button type="button" class="v-b" data-nodate="'+esc(String(t.id))+'">no deadline</button>':'')
    : '<span class="v-frq'+(late?' late':'')+'">'+esc(fmtDue(t.days_left))+'</span>';""",
'objectif sans intention')

s = ech(s,
"""  let haut='';
  if(ouverte&&pkOn('int','t',t.id)) haut=intPicker(t,'t');
  let bas='';""",
"""  let haut='', bas='';""",
'objectif sans picker')

s = ech(s,
"""  return ligne(boiteHTML({kind:'t',id:t.id,titre:t.text,unit,minis,ouverte,haut,bas,tue:'Delete objective'}),
    ouverte?'open':'', intCols(t), k+1, t.id, k===0, k===NB-1);""",
"""  return ligne(boiteHTML({kind:'t',id:t.id,titre:t.text,unit,minis,ouverte,haut,bas,tue:'Delete objective'}),
    ouverte?'open':'', colsHeritees(hs), k+1, t.id, k===0, k===NB-1);""",
'trait herite de l objectif')

# ── la repulsion : idem, elle herite des habitudes qu'elle remplace
s = ech(s,
"""  const unit = ouverte ? intBouton(r,'r') : intMots(r);
  const mot = 'instead';""",
"""  const unit = '';
  const mot = 'instead';""",
'repulsion sans intention')

s = ech(s,
"""  let haut='';
  if(ouverte&&pkOn('int','r',r.id)) haut=intPicker(r,'r');
  let bas='';
  if(ouverte&&pkOn('lien','hr',r.id))""",
"""  let haut='', bas='';
  if(ouverte&&pkOn('lien','hr',r.id))""",
'repulsion sans picker')

s = ech(s,
"""  return ligne(boiteHTML({kind:'r',id:r.id,titre:r.text,unit,minis,ouverte,haut,bas,tue:'Delete repulsion'}),
    ouverte?'open':'', intCols(r), k+1, r.id, k===0, k===NB-1);""",
"""  return ligne(boiteHTML({kind:'r',id:r.id,titre:r.text,unit,minis,ouverte,haut,bas,tue:'Delete repulsion'}),
    ouverte?'open':'', colsHeritees(hs), k+1, r.id, k===0, k===NB-1);""",
'trait herite de la repulsion')

# ── la lecon : elle herite par les repulsions qu'elle eclaire
s = ech(s,
"""  const unit = ouverte ? intBouton(w,'w') : intMots(w);""",
"""  const unit = '';""",
'lecon sans intention')

s = ech(s,
"""  let haut='';
  if(ouverte&&pkOn('int','w',w.id)) haut=intPicker(w,'w');
  let bas='';""",
"""  let haut='', bas='';""",
'lecon sans picker')

s = ech(s,
"""  return ligne(boiteHTML({kind:'w',id:w.id,titre:w.t,unit,minis,ouverte,haut,bas,tue:'Delete teaching'}),
    ouverte?'open':'', intCols(w), k+1, w.id, k===0, k===NB-1);""",
"""  /* Une leçon hérite par ses répulsions, qui héritent de leurs
     habitudes : deux sauts, et le trait reste vrai. */
  return ligne(boiteHTML({kind:'w',id:w.id,titre:w.t,unit,minis,ouverte,haut,bas,tue:'Delete teaching'}),
    ouverte?'open':'',
    colsHeritees(rs.reduce((a,r)=>a.concat(habsOfRep(r)),[])),
    k+1, w.id, k===0, k===NB-1);""",
'trait herite de la lecon')

# ── la vision : elle herite par ses objectifs
s = ech(s,
"""  const unit = ouverte ? intBouton(v,'v') : intMots(v);""",
"""  const unit = '';""",
'vision sans intention')

s = ech(s,
"""  let haut='';
  if(ouverte&&pkOn('int','v',v.id)) haut=intPicker(v,'v');
  let bas='';""",
"""  let haut='', bas='';""",
'vision sans picker')

s = ech(s,
"""  return ligne(boiteHTML({kind:'v',id:v.id,titre:v.t,unit,minis,ouverte,haut,bas,tue:'Delete vision'}),
    ouverte?'open':'', intCols(v), k+1, v.id, k===0, k===NB-1);""",
"""  return ligne(boiteHTML({kind:'v',id:v.id,titre:v.t,unit,minis,ouverte,haut,bas,tue:'Delete vision'}),
    ouverte?'open':'',
    colsHeritees(ts.reduce((a,t)=>a.concat(habsOfTrip(t)),[])),
    k+1, v.id, k===0, k===NB-1);""",
'trait herite de la vision')

# ── `intBouton` et `intMots` ne servent plus qu'a l'habitude
s = ech(s,
"""/* ── LES DEUX RÉGLAGES D'INTENTION, PARTAGÉS ─────────────────────────
   Le bouton quand la boîte est ouverte, les mots quand elle est fermée.
   Quatre boîtes s'en servent : les écrire quatre fois, c'est se garantir
   que la cinquième sera différente. */
function intBouton(x,kind){ const l=intIds(x);""",
"""/* ── LES DEUX RÉGLAGES D'INTENTION ───────────────────────────────────
   Le bouton quand la boîte est ouverte, les mots quand elle est fermée.
   ⚠️ SEULE L'HABITUDE S'EN SERT DEPUIS LE 17/09. Les quatre autres
   objets HÉRITENT (voir `colsHeritees`). Le paramètre `kind` reste pour
   que la signature ne mente pas, mais il vaut toujours 'h'. */
function intBouton(x,kind){ const l=intIds(x);""",
'commentaire intBouton')

# ── `intentions_set` n'est plus appelee : intToggle redevient local
s = ech(s,
"""function intToggle(x,id,kind){
  const l=intIds(x).slice(), k=l.indexOf(id);
  if(k<0)l.push(id); else l.splice(k,1);
  x.is=l; x.i=l.length?l[0]:null;
  if(!kind||kind==='h'){ save(); return; }
  wDirty=true;
  apres(sb.rpc('intentions_set',{p_kind:kind,p_id:String(x.id),p_is:l}));
}""",
"""/* ⚠️ UNE INTENTION S'ÉCRIT DANS `steps`, ET NULLE PART AILLEURS.
   Elle appelait `intentions_set` pour les quatre objets serveur ; ces
   objets n'en portent plus. La fonction SQL reste en base — la retirer
   demanderait une migration pour supprimer du code que personne
   n'appelle, et elle resservira si un jour une vision doit se qualifier
   seule. */
function intToggle(x,id){
  const l=intIds(x).slice(), k=l.indexOf(id);
  if(k<0)l.push(id); else l.splice(k,1);
  x.is=l; x.i=l.length?l[0]:null; save();
}""",
'intToggle local')

s = ech(s,
"""    /* `data-int` porte maintenant le GENRE : sans lui on ne saurait pas
       dans quelle table écrire, et on écrirait dans `steps`. */
    if(d.int){ const p=d.int.split('|');
      const kind=p.length>2?p[0]:'h', oid=p.length>2?p[1]:p[0], iid=p[p.length-1];
      const x=objetDe(kind,oid); if(x)intToggle(x,iid,kind); renderZone(); return; }""",
"""    /* `data-int` vaut « h|<id>|<intention> ». Le genre est toujours 'h'
       depuis le 17/09 ; il reste dans la chaîne pour que le sélecteur et
       le dispatch se lisent pareil. */
    if(d.int){ const p=d.int.split('|');
      const x=habOf(p.length>2?p[1]:p[0]); if(x)intToggle(x,p[p.length-1]);
      renderZone(); return; }""",
'dispatch data-int local')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (intentions)')
