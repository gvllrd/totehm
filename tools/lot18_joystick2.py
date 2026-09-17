# -*- coding: utf-8 -*-
"""LOT DU 18/09/2026 · LE JOYSTICK — MARQUAGE, PLACEMENT, MOTEUR
    python3 tools/lot18_joystick2.py
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

# ═══════════════════════════════════════════════════════════════════════
# 1 · LE MARQUAGE — le titre et les quatre curseurs entrent dans #joy
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""<div id="views" class="sink-el" role="group" aria-label="La vue courante">
  <div id="vnow"><b></b><i></i></div>
</div>""",
"""<!-- ══ LE JOYSTICK · 18/09/2026 ══════════════════════════════════════
     Une maquette du Totehm : le carré perforé porte la couleur de l'axe
     du TEMPS, la pile de dalles dedans porte l'axe de la PROFONDEUR.
     Quatre chevrons l'encadrent, le nom de la vue est dessous. -->
<div id="joy" class="sink-el" role="group" aria-label="Where I am in my Totehm">
  <button class="cur" id="cur-h" type="button" hidden>
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 10 L8 5 L13 10"/></svg></button>
  <div id="joy-row">
    <button class="cur" id="cur-g" type="button" hidden>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 L5 8 L10 13"/></svg></button>
    <div id="joy-box" aria-hidden="true">
      <div id="joy-stack"><i class="o"></i><i class="h"></i><i class="r"></i></div>
    </div>
    <button class="cur" id="cur-d" type="button" hidden>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3 L11 8 L6 13"/></svg></button>
  </div>
  <button class="cur" id="cur-b" type="button" hidden>
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6 L8 11 L13 6"/></svg></button>
  <div id="vnow"><b></b><i></i></div>
</div>""",
'marquage du joystick')

# les quatre curseurs qui vivaient hors de #stage disparaissent : ils sont
# maintenant DANS #joy, qui est lui-meme hors de #stage.
DEB = s.index("<!-- ══ LES QUATRE CURSEURS VIVENT HORS DU CARRÉ · 17/09/2026")
FIN = s.index('</button>', s.index('id="cur-b"', DEB)) + len('</button>')
s = s[:DEB] + s[FIN:]

# ⚠️ #joy doit sortir de #stage lui aussi : meme raison qu'hier, le
#    transform le contiendrait et l'overflow le rognerait sur ordinateur.
i = s.index('<div id="joy" class="sink-el"')
j = s.index('</div>', s.index('<div id="vnow">', i)) + len('</div>') + len('\n</div>')
BLOC = s[i:j]
s = s[:i] + s[j:]
anc = '</div><!-- /#stage -->'
if s.count(anc) != 1:
    rates.append('ancre de fin de #stage : %d fois' % s.count(anc))
else:
    s = s.replace(anc, anc + """

<!-- ⚠️ LE JOYSTICK VIT HORS DU CARRÉ, même raison qu'hier pour les
     curseurs : `#stage` porte un transform (il contient tout ce qui est
     `fixed` dedans) ET `overflow:hidden` (il rogne ce qui dépasse).
     Dedans, il serait ramené puis coupé. -->
""" + BLOC)

# ═══════════════════════════════════════════════════════════════════════
# 2 · LE PLACEMENT — le T et le TOTEHM à gauche, le joystick à droite
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""#bigT{position:fixed;top:30px;left:50%;transform:translateX(-50%);z-index:30;user-select:none;transition:opacity .4s;line-height:0;background:none;border:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}""",
"""/* ══ LA MARQUE SE RANGE À GAUCHE · 18/09/2026 ════════════════════════
   Le T était au centre et le TOTEHM tout en bas : le haut ne portait
   rien d'autre, et le bas portait deux choses. Les deux se rangent
   maintenant l'un sur l'autre, à gauche, et la droite revient au
   contrôleur. La bande basse y gagne : elle n'a plus que les portes. */
#bigT{position:fixed;top:26px;left:max(16px,5vw);transform:none;z-index:30;user-select:none;transition:opacity .4s;line-height:0;background:none;border:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
#bigT svg{height:40px;width:auto;display:block}""",
'placement du T')

s = ech(s,
"""#wordmark{position:fixed;bottom:30px;left:max(18px,6vw);transform:none;z-index:30;user-select:none;transition:opacity .4s;line-height:0}""",
"""/* Le wordmark passe SOUS le T, aligné sur la même colonne gauche. Il
   reste le menu : on ne perd aucun geste. */
#wordmark{position:fixed;top:70px;left:max(16px,5vw);bottom:auto;transform:none;z-index:30;user-select:none;transition:opacity .4s;line-height:0;cursor:pointer}
#wordmark svg{height:26px;width:auto;display:block}
/* Le joystick prend la droite de la même bande. */
#joy{top:24px;right:max(14px,4vw);left:auto}""",
'placement du wordmark et du joystick')

# ── la bande haute et la bande basse changent de mesure
s = ech(s,
"""       titre : --croix-t          hauteur mesurée 24 px
       curseur du haut : +42      (il n'existe qu'au téléphone à cet
                                   endroit ; sur ordinateur il est hors
                                   du carré, mais un seul jeton suffit)
       bande de classement : +72
       première boîte : +78""",
"""       le joystick : 24 px du haut, hauteur mesurée 110 px
       bande de classement : --croix-t + 20
       première boîte : --croix-t + 26

     ⚠️ `--croix-t` NE POSITIONNE PLUS RIEN : le joystick a son propre
     placement (en haut à droite) et le T sa propre colonne (en haut à
     gauche). Le jeton reste parce que `--band-t`, `#ordbar` et `#dit` en
     découlent, et qu'un seul chiffre par écran vaut toujours mieux que
     trois.""",
'commentaire des bandes')

s = ech(s, "  --band-t:calc(var(--croix-t) + 78px);",
           "  --band-t:calc(var(--croix-t) + 26px);", 'band-t')
s = ech(s, "#ordbar{position:fixed;top:calc(var(--croix-t) + 72px);",
           "#ordbar{position:fixed;top:calc(var(--croix-t) + 20px);", 'ordbar')
s = ech(s, "#dit{position:fixed;top:calc(var(--croix-t) + 72px);",
           "#dit{position:fixed;top:calc(var(--croix-t) + 20px);", 'dit')
# la bande basse perd le wordmark : elle se resserre
s = ech(s, "  --band-b:116px;  /* bande basse : TOTEHM.png + flèche menu */",
"""  --band-b:78px;   /* bande basse : les trois portes, et rien d'autre.
                      Le TOTEHM est remonté à gauche le 18/09 ; la liste
                      récupère les 38 px qu'il occupait. */""",
'band-b')

# ── sur ordinateur, le T et le TOTEHM restent DANS le carré
s = ech(s,
"""  /* ══ LES QUATRE CURSEURS SE POSENT SUR LES QUATRE CÔTÉS DU CARRÉ ═══""",
"""  /* ⚠️ LA MARQUE ET LE JOYSTICK RESTENT DANS LE CARRÉ · 18/09/2026.
     `#bigT` et `#wordmark` sont `fixed` DANS `#stage`, donc ils se
     résolvent sur lui — ils suivent le carré tout seuls. `#joy`, lui,
     est DEHORS (il serait rogné) : il faut donc le ramener à la main sur
     le bord droit du carré. C'est la seule pièce qui a besoin des deux
     mesures, et c'est pour ça qu'elle les porte ici. */
  #bigT{top:24px;left:22px}
  #wordmark{top:68px;left:22px}
  #joy{top:calc(50% - var(--stage)/2 + 22px);
       right:calc(50% - var(--stage)/2 + 18px)}

  /* ══ LES QUATRE CURSEURS SE POSENT SUR LES QUATRE CÔTÉS DU CARRÉ ═══""",
'placement ordinateur')

# l'ancien placement desktop des curseurs n'a plus lieu d'etre
s = ech(s,
"""  #cur-g,#cur-d{top:50%;transform:translateY(-50%)}
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
""",
"""  /* Les curseurs vivent DANS le joystick depuis le 18/09 : ils n'ont
     plus de placement à eux, ils encadrent le carré. */
""",
'retrait du placement desktop des curseurs')

s = ech(s, "  #bigT{top:44px}\n", "", 'ancien top mobile du T')
s = ech(s, "  #bigT svg{height:48px}\n", "", 'ancienne taille mobile du T')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (marquage et placement)')
