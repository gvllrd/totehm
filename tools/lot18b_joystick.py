# -*- coding: utf-8 -*-
"""LOT DU 18/09/2026 (bis) · LE JOYSTICK NE BOUGE PLUS
    python3 tools/lot18b_joystick.py

CE QUE WAH DIT, ET IL A RAISON SUR LES QUATRE POINTS :
  1. « il y a des points noirs » -- le fond perfore. Il ne servait qu'a
     me MONTRER le Totehm dans la methode Stoner ; je l'ai pris pour une
     consigne de rendu. Il part.
  2. « il se deplace en fonction des vues » -- oui, et c'est ma faute.
     `.cur[hidden]{display:none}` retirait le curseur DU FLUX : la
     colonne se retassait et le carre sautait. J'avais cru garder la
     place avec une largeur ; une largeur ne garde rien quand l'element
     n'est plus affiche. Le controleur est maintenant une GRILLE de
     tailles fixes -- rien ne peut plus se deplacer, par construction.
  3. « on ne voit pas les curseurs » -- meme cause. Ils sont maintenant
     TOUJOURS la : un curseur sans voisin s'eteint mais garde sa case.
     C'est ce qui fait un CADRE.
  4. « les titres doivent etre plus visibles » -- 7 px a 72 % d'opacite,
     c'etait une note de bas de page. 11 px, blanc, plein.

ET LA MISE EN PAGE : le TOTEHM en BAS A DROITE, le T plus GRAND a
gauche. Les portes passent donc en bas a gauche -- la ou le wordmark
etait.

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
# 1 · LE CONTRÔLEUR DEVIENT UNE GRILLE RIGIDE
# ═══════════════════════════════════════════════════════════════════════
DEB = s.index("#joy{position:fixed;z-index:33;display:flex;flex-direction:column;")
FIN = s.index("/* `.vt-c` / `.vt-n` / `.vt-n2` sont partis avec la croix")
s = s[:DEB] + """/* ══ UNE GRILLE, ET RIEN NE PEUT PLUS BOUGER · 18/09/2026 ═══════════
   ⚠️ LE CONTRÔLEUR SAUTAIT D'UNE VUE À L'AUTRE, ET C'ÉTAIT MA FAUTE.
   `.cur[hidden]{display:none}` retirait le curseur DU FLUX : la colonne
   se retassait et le carré changeait de place. J'avais cru garder la
   place en donnant une largeur aux curseurs — une largeur ne garde rien
   quand l'élément n'est plus affiché.

   C'est maintenant une GRILLE 3×3 à cases FIXES. Le carré est au centre,
   les quatre chevrons dans les quatre cases du bord, le nom dessous. La
   position ne dépend plus de ce qui est visible : elle est écrite dans
   la grille. Un contrôleur qui se déplace n'est pas un contrôleur.

   ⚠️ ET UN CURSEUR SANS VOISIN NE DISPARAÎT PLUS : il s'éteint. C'est ce
   qui fait un CADRE — quatre points cardinaux autour d'une structure,
   toujours les quatre. */
#joy{position:fixed;z-index:33;
  display:grid;
  grid-template-columns:20px 62px 20px;
  grid-template-rows:20px 62px 20px auto;
  align-items:center;justify-items:center}
#cur-h  {grid-area:1/2/2/3}
#cur-g  {grid-area:2/1/3/2}
#joy-box{grid-area:2/2/3/3}
#cur-d  {grid-area:2/3/3/4}
#cur-b  {grid-area:3/2/4/3}
#vnow   {grid-area:4/1/5/4;margin-top:5px}

/* ══ LE CARRÉ ════════════════════════════════════════════════════════
   ⚠️ PLUS DE FOND PERFORÉ. Les trous noirs venaient de l'image du logo ;
   à 62 px ils ne se lisaient plus comme des perforations mais comme des
   points sales. Le carré perforé était dans la maquette de Wah pour me
   MONTRER le Totehm, pas pour être recopié à cette taille.
   Un aplat, et la couleur fait tout le travail. */
#joy-box{width:62px;height:62px;position:relative;overflow:hidden;
  background:var(--joy-fond,var(--navy));
  /* La perspective vit sur le parent de ce qui tourne. */
  perspective:210px;
  transition:background-color .42s ease}

/* La pile : trois dalles couchées, qui glissent pour amener au centre
   celle où l'on est. C'est le seul mouvement du contrôleur. */
#joy-stack{position:absolute;left:50%;top:50%;
  width:42px;height:46px;margin:-23px 0 0 -21px;
  transform-style:preserve-3d;
  transform:rotateX(50deg) translateY(var(--joy-y,0px));
  transition:transform .42s cubic-bezier(.22,.9,.3,1)}
#joy-stack i{position:absolute;left:0;right:0;height:13px;display:block;
  transition:opacity .42s ease,background-color .42s ease}
#joy-stack .o{top:0;background:var(--blue)}
#joy-stack .h{top:16px;background:var(--sky);
  /* Un filet clair sur la tranche : c'est ce qui fait qu'on lit une
     DALLE et pas un rectangle. */
  box-shadow:0 1px 0 rgba(255,255,255,.3)}
#joy-stack .r{top:32px;background:var(--rep)}
/* La dalle où l'on est reste pleine, les deux autres reculent. */
#joy.v-objectives .h,#joy.v-objectives .r{opacity:.3}
#joy.v-habits     .o,#joy.v-habits     .r{opacity:.3}
#joy.v-repulsions .o,#joy.v-repulsions .h{opacity:.3}
#joy.v-objectives{--joy-y:15px}
#joy.v-habits    {--joy-y:0px}
#joy.v-repulsions{--joy-y:-15px}
/* ⚠️ SUR LA SAGESSE ET LA VISION, IL N'Y A QU'UNE COUCHE. L'axe vertical
   n'existe pas là-bas ; en montrer trois serait un mensonge. */
#joy.seule .o,#joy.seule .r{opacity:0}
#joy.seule .h{opacity:1}
#joy.v-wisdom  .h{background:#b06a9f}
#joy.v-visions .h{background:var(--sky)}

/* ══ LES QUATRE CHEVRONS ═════════════════════════════════════════════
   ⚠️ JAMAIS `display:none`. Un curseur sans voisin garde sa case et
   s'éteint : c'est lui qui fait le cadre, et un cadre à trois côtés
   n'est pas un cadre. */
.cur{background:none;border:none;padding:0;cursor:pointer;
  -webkit-tap-highlight-color:transparent;display:flex;
  align-items:center;justify-content:center;width:20px;height:20px;
  opacity:.85;transition:opacity .2s ease,transform .18s ease}
.cur.mort{opacity:.16;pointer-events:none;cursor:default}
@media(hover:hover){.cur:not(.mort):hover{opacity:1}}
.cur svg{width:14px;height:14px;display:block;
  stroke:currentColor;fill:none;stroke-width:2.1;
  stroke-linecap:round;stroke-linejoin:round}
.cur.to-habits    {color:var(--sky)}
.cur.to-objectives{color:var(--blue)}
.cur.to-repulsions{color:var(--rep)}
.cur.to-wisdom    {color:#b06a9f}
.cur.to-visions   {color:var(--sky)}
.cur.mort{color:#fff}
@media(hover:hover){
  #cur-g:not(.mort):hover{transform:translateX(-2px)}
  #cur-d:not(.mort):hover{transform:translateX(2px)}
  #cur-h:not(.mort):hover{transform:translateY(-2px)}
  #cur-b:not(.mort):hover{transform:translateY(2px)}}

/* ══ LE NOM DE LA VUE ════════════════════════════════════════════════
   ⚠️ 7 px à 72 % d'opacité, c'était une note de bas de page. Le nom de
   l'endroit où l'on se trouve est l'information la plus importante de
   l'écran après la liste elle-même. */
#vnow{line-height:1;text-align:center}
#vnow b{font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.2em;
  text-transform:uppercase;color:#fff;font-weight:700;white-space:nowrap;
  display:block}
#vnow i{display:none}
/* La répercussion 3D : le nom pivote dans la direction du voyage, en
   même temps que la pile glisse. */
@keyframes face-d{from{transform:rotateY(-62deg) translateX(18px);opacity:0}to{transform:none;opacity:1}}
@keyframes face-g{from{transform:rotateY(62deg) translateX(-18px);opacity:0}to{transform:none;opacity:1}}
@keyframes face-b{from{transform:rotateX(62deg) translateY(12px);opacity:0}to{transform:none;opacity:1}}
@keyframes face-h{from{transform:rotateX(-62deg) translateY(-12px);opacity:0}to{transform:none;opacity:1}}
#vnow.f-d{animation:face-d .42s cubic-bezier(.22,.9,.3,1)}
#vnow.f-g{animation:face-g .42s cubic-bezier(.22,.9,.3,1)}
#vnow.f-b{animation:face-b .42s cubic-bezier(.22,.9,.3,1)}
#vnow.f-h{animation:face-h .42s cubic-bezier(.22,.9,.3,1)}
@media(prefers-reduced-motion:reduce){
  .cur,#joy-box,#joy-stack,#joy-stack i{transition:none}
  #vnow.f-d,#vnow.f-g,#vnow.f-b,#vnow.f-h{animation:none}
}

""" + s[FIN:]

if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (grille du joystick)')
