# -*- coding: utf-8 -*-
"""LOT DU 17/09/2026 · LES CURSEURS SORTENT DU CARRE
    python3 tools/lot17_curseurs2.py

MESURE DU 17/09 : sur ordinateur les quatre curseurs se posaient DANS le
carre, par-dessus les boites. Deux raisons, et il fallait les deux :
  · `#stage` porte un transform, il est donc le bloc conteneur de tout ce
    qui est `position:fixed` dedans ;
  · `#stage` a `overflow:hidden`, donc tout ce qui deborde est COUPE.
Un curseur pose « a l'exterieur du carre » etait donc ramene dedans puis
rogne. Ils sortent du carre dans le DOM : ils se resolvent alors sur la
fenetre, et peuvent enfin se poser sur les quatre cotes.

DEUX ECRANS, DEUX VERITES, ET C'EST ASSUME
  · Sur ORDINATEUR le Totehm est un carre pose sur du noir : les quatre
    curseurs vivent dehors, un par cote. C'est litteralement ce que Wah
    demande, et il y a la place.
  · Sur TELEPHONE l'ecran EST le carre : il n'y a pas de dehors. Les
    quatre curseurs se rangent donc autour du TITRE — au-dessus, en
    dessous, et aux deux bords a sa hauteur. Jamais par-dessus la liste :
    c'est ce qui se passait, et c'est ce qu'on repare.

⚠️ N'ECRIT QU'A LA FIN.
"""
import os, sys
SC = os.path.dirname(os.path.abspath(__file__)) + '/'
P  = SC + '../com/totehm.html'
rates = []

def ech(s, vieux, neuf, quoi, attendu=1):
    n = s.count(vieux)
    if n != attendu:
        rates.append('%s : %d fois, attendu %d\n      %s' % (quoi, n, attendu, vieux.strip()[:96]))
        return s
    return s.replace(vieux, neuf)

s = open(P, encoding='utf-8').read()

# ── 1 · le balisage des quatre curseurs sort de #stage
DEB = s.index('<button class="cur sink-el" id="cur-h"')
FIN = s.index('</button>', s.index('id="cur-b"')) + len('</button>')
BLOC = s[DEB:FIN]
s = s[:DEB] + s[FIN:]

anc = '</div><!-- /#stage -->'
if s.count(anc)!=1:
    rates.append('ancre de fin de #stage : %d fois' % s.count(anc))
else:
    s = s.replace(anc, anc + """

<!-- ══ LES QUATRE CURSEURS VIVENT HORS DU CARRÉ · 17/09/2026 ══════════
     ⚠️ ILS ÉTAIENT DANS `#stage`, ET C'EST POUR ÇA QU'ILS PASSAIENT
     PAR-DESSUS LES BOÎTES. `#stage` porte un transform (donc il contient
     tout ce qui est `fixed` dedans) ET `overflow:hidden` (donc il rogne
     ce qui dépasse). Un curseur « à l'extérieur du carré » était ramené
     dedans puis coupé.
     Dehors, ils se résolvent sur la fenêtre : sur ordinateur ils se
     posent sur les quatre côtés du carré, sur téléphone autour du
     titre. -->
""" + BLOC)

# ── 2 · le placement, par ecran
s = ech(s,
"""/* Gauche et droite : au milieu de la hauteur, le mot sous le chevron
   pour ne pas manger la largeur d'un téléphone. */
#cur-g,#cur-d{top:50%;transform:translateY(-50%);
  flex-direction:column;gap:3px;text-align:center}
#cur-g{left:2px}
#cur-d{right:2px}
@media(hover:hover){#cur-g:hover{transform:translateY(-50%) translateX(-2px)}
                    #cur-d:hover{transform:translateY(-50%) translateX(2px)}}
/* Haut et bas : couchés, centrés, dans la bande qui leur reste. */
#cur-h,#cur-b{left:50%;transform:translateX(-50%)}
#cur-h{top:calc(var(--croix-t) + 44px)}
#cur-b{bottom:calc(var(--band-b) - 34px)}
@media(hover:hover){#cur-h:hover{transform:translateX(-50%) translateY(-2px)}
                    #cur-b:hover{transform:translateX(-50%) translateY(2px)}}""",
"""/* ══ LE PLACEMENT DE BASE — CELUI DU TÉLÉPHONE ══════════════════════
   L'écran EST le carré : il n'y a pas de dehors. Les quatre curseurs se
   rangent donc autour du TITRE. ⚠️ JAMAIS au milieu de la hauteur : ils
   se posaient sur les boîtes, mesuré le 17/09.
   Gauche et droite sont aux deux bords, À LA HAUTEUR DU TITRE — donc
   sur les côtés du haut de l'écran, là où rien ne défile. */
#cur-g,#cur-d{top:var(--croix-t);flex-direction:column;gap:3px;text-align:center}
#cur-g{left:4px}
#cur-d{right:4px}
#cur-h,#cur-b{left:50%;transform:translateX(-50%)}
#cur-h{top:calc(var(--croix-t) + 42px)}
#cur-b{bottom:calc(var(--band-b) - 30px)}
@media(hover:hover){
  #cur-g:hover{transform:translateX(-2px)}
  #cur-d:hover{transform:translateX(2px)}
  #cur-h:hover{transform:translateX(-50%) translateY(-2px)}
  #cur-b:hover{transform:translateX(-50%) translateY(2px)}}""",
'placement mobile')

# ── 3 · le placement sur ordinateur : dehors, un par cote
s = ech(s,
"""  /* Le rail s'arrête au T en haut et au wordmark en bas, au lieu de courir
     d'un bord à l'autre : 30px, la même valeur que #bigT et #wordmark. */
  #rail{top:30px;bottom:30px}""",
"""  /* ══ LES QUATRE CURSEURS SE POSENT SUR LES QUATRE CÔTÉS DU CARRÉ ═══
     Ici il y a un DEHORS : le carré fait `--stage` de côté, centré, et
     le reste est noir. Chaque curseur se pose donc à `--side-gap` de son
     côté, centré dessus. C'est la demande, au mot près — et c'est la
     seule disposition où aucun d'eux ne couvre une boîte.
     `--side-gap` existait déjà pour les anciens chevrons `.tnav` ; il
     reprend du service au lieu d'inventer une mesure de plus. */
  #cur-g,#cur-d{top:50%;transform:translateY(-50%)}
  #cur-g{left:calc(50% - var(--stage)/2 - var(--side-gap));right:auto}
  #cur-d{right:calc(50% - var(--stage)/2 - var(--side-gap));left:auto}
  #cur-h,#cur-b{left:50%;transform:translateX(-50%)}
  #cur-h{top:calc(50% - var(--stage)/2 - 42px);bottom:auto}
  #cur-b{bottom:calc(50% - var(--stage)/2 - 42px);top:auto}
  @media(hover:hover){
    #cur-g:hover{transform:translateY(-50%) translateX(-3px)}
    #cur-d:hover{transform:translateY(-50%) translateX(3px)}
    #cur-h:hover{transform:translateX(-50%) translateY(-3px)}
    #cur-b:hover{transform:translateX(-50%) translateY(3px)}}
  /* Le rail s'arrête au T en haut et au wordmark en bas, au lieu de courir
     d'un bord à l'autre : 30px, la même valeur que #bigT et #wordmark. */
  #rail{top:30px;bottom:30px}""",
'placement ordinateur')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (curseurs hors du carre)')
