# -*- coding: utf-8 -*-
"""LOT DU 16/09/2026 · 2/3 — CINQ OBJETS, CINQ VUES, UNE CROIX

    python3 tools/lot16_cinq_vues.py

CE QUE CE SCRIPT FAIT
Il fusionne `wisdom.html` et `vision.html` DANS `totehm.html`. Les deux
jumeaux disparaissent : ce n'etaient pas deux produits, c'etaient deux
listes du meme. Le Totehm porte maintenant ses cinq objets, et la
navigation devient une CROIX :

                      MY OBJECTIVES
                            |
      MY WISDOM  ---   MY HABITS   ---   MY VISION
      (past)           (present)         (future)
                            |
                      MY REPULSIONS

Horizontal : le TEMPS. Vertical : la PROFONDEUR — ce qui tire l'habitude
vers le haut (l'objectif), ce qui la tire vers le bas (la repulsion).
On y va au balayage, a la molette laterale, aux fleches, ou en touchant
un carre. Le vertical se prend AU BOUT DE LA LISTE : arrive en bas des
habitudes, continuer descend sur les repulsions ; en haut, remonter monte
sur les objectifs. C'est le geste d'un OS, pas un bouton de plus.

Le PAPIER change pour deux vues seulement -- rouge-violet sur la sagesse,
bleu clair sur la vision -- parce que ce sont les deux qui etaient des
documents separes et que Wah les reconnait a leur fond.

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
# 1 · LE PAPIER ET LES PEAUX DES DEUX NOUVELLES VUES
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""#stage.v-h{--skin:var(--navy)}
#stage.v-o{--skin:var(--blue)}
#stage.v-r{--skin:var(--rep)}""",
"""#stage.v-h{--skin:var(--navy)}
#stage.v-o{--skin:var(--blue)}
#stage.v-r{--skin:var(--rep)}
/* ══ LES DEUX JUMEAUX SONT RENTRÉS · 16/09/2026 ══════════════════════
   `wisdom.html` et `vision.html` étaient deux COPIES du Totehm avec un
   autre fond. Deux fichiers de 280 ko pour afficher une liste de plus.
   Ils sont maintenant deux VUES — même document, même session, même
   mémoire. `tools/jumeau.py` n'a plus rien à dériver.
   La famille de couleur porte le sens : le PASSÉ et ce qu'on tue sont
   rouge-violet, le FUTUR et ce qui le vise sont bleu clair. */
#stage.v-w{--skin:var(--rep)}
#stage.v-v{--skin:var(--blue)}
/* ⚠️ LE PAPIER CHANGE POUR CES DEUX VUES, ET POUR ELLES SEULES. La règle
   du produit était « le papier ne change pas, ce sont les boîtes qui
   portent la couleur ». Elle tient pour les trois couches d'une même
   journée. Elle ne tient plus quand la vue est un AILLEURS dans le
   temps : Wah reconnaît sa sagesse au fond rouge-violet et sa vision au
   fond bleu — c'est comme ça qu'il les a lues pendant des semaines dans
   deux documents séparés. La transition est lente (.5 s) : on doit
   sentir qu'on se déplace, pas qu'on clignote. */
body{transition:background-color .5s ease}
body.v-wisdom {--paper:#5b2652}
body.v-visions{--paper:#2b3a73}
@media(prefers-reduced-motion:reduce){body{transition:none}}""",
'peaux des deux vues')

# ── les carrés de la croix
s = ech(s,
""".vt.r{background:var(--rep)}
.vt.h{background:var(--navy)}
.vt.o{background:var(--blue)}""",
""".vt.r{background:var(--rep)}
.vt.h{background:var(--navy)}
.vt.o{background:var(--blue)}
.vt.w{background:var(--rep)}
.vt.v{background:var(--blue)}""",
'carres w et v')

# ── #views devient une croix
s = ech(s,
"""#views{position:fixed;top:96px;left:50%;transform:translateX(-50%);
  z-index:33;display:flex;flex-direction:row;align-items:flex-start;gap:22px}""",
"""/* ══ LES CARRÉS FORMENT UNE CROIX · 16/09/2026 ═══════════════════════
   Trois carrés en rangée ne pouvaient dire que « à côté ». Il y a
   maintenant cinq objets, et deux axes qui ne veulent pas dire la même
   chose : l'horizontale est le TEMPS (passé · présent · futur), la
   verticale est la PROFONDEUR (ce qui tire l'habitude vers le haut, ce
   qui la tire vers le bas). La croix DIT ça sans une phrase
   d'explication — c'est pour ça qu'elle remplace la rangée.
   Les deux carrés du haut et du bas sont couchés (carré + mot côte à
   côte) : debout, ils auraient ajouté deux fois 22 px de hauteur à une
   bande qui n'en a pas. */
#views{position:fixed;top:78px;left:50%;transform:translateX(-50%);
  z-index:33;display:flex;flex-direction:column;align-items:center;gap:7px}
#vt-row{display:flex;flex-direction:row;align-items:flex-start;gap:22px}
/* Couché : le carré et son mot sur la même ligne. */
.vt-c.lay{flex-direction:row;align-items:center;gap:7px}
.vt-c.lay .vt{width:11px;height:11px}""",
'#views en croix')

# ═══════════════════════════════════════════════════════════════════════
# 2 · LE MARQUAGE DES CINQ CARRÉS
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""<div id="views" class="sink-el" role="tablist" aria-label="Les trois couches du Totehm">
  <button class="vt-c" type="button" role="tab" data-v="repulsions" aria-selected="false">
    <span class="vt r"></span><span class="vt-n vt-n2">repulsions<b>trigger</b></span></button>
  <button class="vt-c" type="button" role="tab" data-v="habits" aria-selected="true">
    <span class="vt h"></span><span class="vt-n">habits</span></button>
  <button class="vt-c" type="button" role="tab" data-v="objectives" aria-selected="false">
    <span class="vt o"></span><span class="vt-n">objectives</span></button>
</div>""",
"""<!-- ══ LA CROIX · 16/09/2026 ═══════════════════════════════════════
     Horizontale = le temps. Verticale = la profondeur. Chaque carré
     porte son nom : on lit avant de choisir. -->
<div id="views" class="sink-el" role="tablist" aria-label="Les cinq objets du Totehm">
  <button class="vt-c lay" type="button" role="tab" data-v="objectives" aria-selected="false">
    <span class="vt o"></span><span class="vt-n">my objectives</span></button>
  <div id="vt-row">
    <button class="vt-c" type="button" role="tab" data-v="wisdom" aria-selected="false">
      <span class="vt w"></span><span class="vt-n vt-n2">my wisdom<b>past</b></span></button>
    <button class="vt-c" type="button" role="tab" data-v="habits" aria-selected="true">
      <span class="vt h"></span><span class="vt-n vt-n2">my habits<b>present</b></span></button>
    <button class="vt-c" type="button" role="tab" data-v="visions" aria-selected="false">
      <span class="vt v"></span><span class="vt-n vt-n2">my vision<b>future</b></span></button>
  </div>
  <button class="vt-c lay" type="button" role="tab" data-v="repulsions" aria-selected="false">
    <span class="vt r"></span><span class="vt-n">my repulsions — habits to kill</span></button>
</div>""",
'markup des cinq carres')

# ── les deux portes du bas ne chargent plus de document
s = ech(s,
"""  <button class="door" id="door-book" type="button">My Wisdom</button>
  <button class="door" id="door-next" type="button">My vision for the future</button>""",
"""  <!-- ⚠️ CES DEUX PORTES N'OUVRENT PLUS DE DOCUMENT · 16/09/2026. Elles
       chargeaient `wisdom.html` et `vision.html`. Les deux fichiers sont
       rentrés dans celui-ci : ce sont deux VUES. La porte fait donc ce
       que fait un carré de la croix — et la session ne bouge pas. -->
  <button class="door" id="door-book" type="button">My Wisdom</button>
  <button class="door" id="door-next" type="button">My vision for the future</button>""",
'portes du bas')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)

open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html')
