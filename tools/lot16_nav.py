# -*- coding: utf-8 -*-
"""LOT DU 16/09/2026 · LA NAVIGATION EN CROIX
    python3 tools/lot16_nav.py
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
# 1 · LE BALAYAGE TACTILE — horizontal ET vertical
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""  const dy=e.changedTouches[0].screenY-y0;const TH=32;
  if(axis==='h'){
    const dx=e.changedTouches[0].screenX-x0;
    if(Math.abs(dx)<TH)return;
    /* LE BALAYAGE = LES CARRÉS. Même ordre — rouge, navy, bleu clair — et
       le doigt le suit : glisser vers la GAUCHE avance dans la rangée.
       On ne change pas de fichier, on ne recharge rien : seules les boîtes
       changent. C'est le geste d'avant, sur la nouvelle architecture. */
    const i=VIEW_ORDER.indexOf(view)+(dx<0?1:-1);
    if(i>=0&&i<VIEW_ORDER.length)setView(VIEW_ORDER[i]);
  }
  /* Le geste VERTICAL ne pilote plus rien : le scroll d'ouverture du
     filtre et de repli du Totehm bugguait le défilement de la liste.
     Le T ouvre le filtre, la croix (#fold-x) replie. */
},{passive:true});""",
"""  const dy=e.changedTouches[0].screenY-y0;const TH=32;
  if(axis==='h'){
    const dx=e.changedTouches[0].screenX-x0;
    if(Math.abs(dx)<TH)return;
    /* LE BALAYAGE SUIT LE DOIGT : glisser vers la GAUCHE montre ce qui
       est à droite. L'axe horizontal est le TEMPS — sagesse, habitudes,
       vision. On ne change pas de fichier, on ne recharge rien. */
    versVoisin(dx<0?'d':'g');
    return;
  }
  /* ══ LE VERTICAL SE PREND AU BOUT DE LA LISTE · 16/09/2026 ═════════
     ⚠️ CE N'EST PAS UN BALAYAGE LIBRE, ET C'EST TOUTE LA DIFFÉRENCE.
     Un geste vertical libre entrerait en concurrence avec le défilement
     de la liste — c'est exactement ce qui avait « buggé le filtre » et
     fait retirer le vertical la première fois.
     Ici il ne se déclenche QUE lorsque la liste ne peut plus défiler :
     arrivé en bas, continuer vers le bas descend sur les répulsions ;
     en haut, tirer vers le bas remonte sur les objectifs. C'est le
     geste d'un OS — on tombe dans l'écran suivant, on ne le vise pas. */
  if(Math.abs(dy)<TH+18)return;
  const bord=scrollEdges();
  if(dy<0&&bord.bottom)versVoisin('b');
  else if(dy>0&&bord.top)versVoisin('h');
},{passive:true});""",
'balayage tactile en croix')

# ═══════════════════════════════════════════════════════════════════════
# 2 · LE TRACKPAD — horizontal, et vertical au bord
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""(function(){
  let acc=0, t=0;
  addEventListener('wheel',e=>{
    if(document.body.classList.contains('gate'))return;
    if(Math.abs(e.deltaX) < Math.abs(e.deltaY)*1.6) return;
    const now=Date.now(); if(now-t>220)acc=0; t=now;
    acc+=e.deltaX;
    if(Math.abs(acc)<70)return;""",
"""(function(){
  let acc=0, t=0, accV=0, tV=0, froid=0;
  /* ══ LE VERTICAL À LA MOLETTE, AU BORD SEULEMENT · 16/09/2026 ═══════
     Même règle qu'au doigt : tant que la liste peut défiler, la molette
     la fait défiler et rien d'autre. Au bord, et au bord seulement, elle
     fait passer à la vue d'à côté.
     `froid` est un délai de garde : une molette à inertie envoie des
     événements pendant une seconde après le geste, et sans lui on
     traverserait deux vues d'un coup. */
  addEventListener('wheel',e=>{
    if(document.body.classList.contains('gate'))return;
    if(Math.abs(e.deltaY) > Math.abs(e.deltaX)*1.6){
      if(navBlocked())return;
      if(Date.now()<froid){accV=0;return;}
      const bord=scrollEdges();
      const versLeBas=e.deltaY>0;
      if(!(versLeBas?bord.bottom:bord.top)){accV=0;return;}
      const nowV=Date.now(); if(nowV-tV>260)accV=0; tV=nowV;
      accV+=e.deltaY;
      if(Math.abs(accV)<90)return;
      const cible=versLeBas?'b':'h';
      accV=0; froid=Date.now()+700;
      versVoisin(cible);
      return;
    }
    if(Math.abs(e.deltaX) < Math.abs(e.deltaY)*1.6) return;
    const now=Date.now(); if(now-t>220)acc=0; t=now;
    acc+=e.deltaX;
    if(Math.abs(acc)<70)return;""",
'molette verticale au bord')

s = ech(s,
"""    const i=VIEW_ORDER.indexOf(view)+(acc>0?-1:1);
    acc=0;
    if(i>=0&&i<VIEW_ORDER.length)setView(VIEW_ORDER[i]);
  },{passive:true});
})();""",
"""    const d = acc>0 ? 'g' : 'd';
    acc=0;
    versVoisin(d);
  },{passive:true});
})();""",
'molette horizontale en croix')

# ═══════════════════════════════════════════════════════════════════════
# 3 · LES FLECHES DU CLAVIER
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""const navLeft =()=>{ if(navBlocked())return;
  if(view==='objectives')setView('habits'); else setView('repulsions'); };
const navRight=()=>{ if(navBlocked())return;
  if(view==='repulsions')setView('habits'); else setView('objectives'); };""",
"""const navLeft =()=>{ if(navBlocked())return; versVoisin('g'); };
const navRight=()=>{ if(navBlocked())return; versVoisin('d'); };""",
'navLeft / navRight')

s = ech(s,
"""  if(e.key==='ArrowDown'){e.preventDefault();if(!hOpen())foldToGate();}
  else if(e.key==='ArrowUp'){e.preventDefault();if(!hOpen())openFilterModal();}
  /* Mêmes cibles que le balayage : une flèche parcourt la rangée. */
  else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();
    const i=VIEW_ORDER.indexOf(view)+(e.key==='ArrowRight'?1:-1);
    if(i>=0&&i<VIEW_ORDER.length)setView(VIEW_ORDER[i]);}""",
"""  /* ⚠️ LES QUATRE FLÈCHES SUIVENT LA CROIX · 16/09/2026. Haut et bas
     repliaient le Totehm et ouvraient le filtre — deux gestes qui ont
     maintenant leur propre porte (la croix `#fold-x`, le T). Sur la
     croix, une flèche ne peut vouloir dire qu'une chose : va voir à
     côté. Quand il n'y a pas de voisin dans cette direction, on retombe
     sur l'ancien geste : c'est le seul endroit où il restait utile. */
  if(e.key==='ArrowDown'){e.preventDefault();
    if(voisin('b'))versVoisin('b'); else if(!hOpen())foldToGate();}
  else if(e.key==='ArrowUp'){e.preventDefault();
    if(voisin('h'))versVoisin('h'); else if(!hOpen())openFilterModal();}
  else if(e.key==='ArrowLeft'){e.preventDefault();versVoisin('g');}
  else if(e.key==='ArrowRight'){e.preventDefault();versVoisin('d');}""",
'fleches du clavier')

# ═══════════════════════════════════════════════════════════════════════
# 4 · LES DEUX PORTES DU BAS NE CHARGENT PLUS RIEN
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""function showBook(on){ setView(on?'repulsions':'habits'); if(on)save(); }
function showNext(on){ setView(on?'objectives':'habits');  if(on)save(); }""",
"""/* ⚠️ CES DEUX-LÀ POINTAIENT SUR LES MAUVAISES VUES · 16/09/2026.
   `showBook` ouvrait les RÉPULSIONS et `showNext` les OBJECTIFS — un
   reste de l'époque où « le livre » et « le prochain objectif » étaient
   deux documents. Depuis que la sagesse et la vision sont deux vues,
   les deux portes du bas mènent où leur nom promet. */
function showBook(on){ setView(on?'wisdom':'habits');  if(on)save(); }
function showNext(on){ setView(on?'visions':'habits'); if(on)save(); }""",
'showBook / showNext')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (navigation)')
