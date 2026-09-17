# -*- coding: utf-8 -*-
"""LOT DU 18/09/2026 · LE JOYSTICK — LE TOTEHM COMME CONTROLEUR
    python3 tools/lot18_joystick.py

CE QUE WAH ENVOIE : trois vignettes tirees de la methode Stoner. Un carre
perfore dont le FOND change (bleu, navy, rouge-violet) et, dedans, une
structure 3D de trois dalles empilees qui GLISSE verticalement.

CE QUE CA VEUT DIRE, ET C'EST LA bonne IDEE
Le controleur n'est pas un menu : c'est une MAQUETTE DU TOTEHM. Le carre
perfore, c'est le Totehm lui-meme -- sa couleur dit ou l'on est sur l'axe
du TEMPS (sagesse / habitudes / vision). La pile de dalles dedans dit ou
l'on est sur l'axe de la PROFONDEUR (objectifs / habitudes / repulsions).
Une seule piece montre les deux axes, et elle le montre en IMAGE, pas en
mots. Quatre petits curseurs l'encadrent.

LA MISE EN PAGE SUIT : le T et le TOTEHM se rangent a GAUCHE, l'un sur
l'autre, et le controleur prend la droite. Le wordmark quitte le bas --
la bande basse se resserre, la liste y gagne.

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
# 1 · LE STYLE DU CONTROLEUR — il remplace celui du titre et des curseurs
# ═══════════════════════════════════════════════════════════════════════
DEB = s.index("/* ══ UN SEUL TITRE, QUATRE CURSEURS · 17/09/2026")
FIN = s.index("/* `.vt-c` / `.vt-n` / `.vt-n2` sont partis avec la croix")
s = s[:DEB] + """/* ══ LE JOYSTICK — LE TOTEHM COMME CONTRÔLEUR · 18/09/2026 ══════════
   Ce n'est pas un menu, c'est une MAQUETTE DU TOTEHM.

   Le carré perforé EST le Totehm : sa couleur dit où l'on est sur l'axe
   du TEMPS — rouge-violet (sagesse), navy (le présent), bleu (vision).
   La pile de dalles à l'intérieur dit où l'on est sur l'axe de la
   PROFONDEUR : elle glisse pour amener au centre l'objectif (bleu, en
   haut), l'habitude (navy, au milieu) ou la répulsion (rouge-violet, en
   bas).

   Une seule pièce, les deux axes, et elle le dit en IMAGE. C'est ce qui
   la distingue des cinq carrés d'hier : on ne lit pas un plan, on voit
   un objet dans une position. */
#joy{position:fixed;z-index:33;display:flex;flex-direction:column;
  align-items:center;gap:4px}
#joy-row{display:flex;flex-direction:row;align-items:center;gap:5px}

/* Le carré perforé. `--joy-tile` change avec la vue : c'est le seul
   endroit où la couleur du fond est décidée. */
#joy-box{width:58px;height:58px;flex:0 0 auto;position:relative;
  background:var(--joy-tile,var(--logo-navy)) 0 0/100% 100% no-repeat;
  /* La perspective vit sur le PARENT de ce qui tourne : sans elle, la
     pile s'écrase au lieu de se coucher. */
  perspective:190px;overflow:hidden;
  transition:background-image .42s ease}

/* La pile. Elle est COUCHÉE (rotateX) puis glissée (translateY) : deux
   transformations, une seule ligne, et l'ordre compte — coucher d'abord,
   glisser ensuite, sinon le glissement part de travers. */
#joy-stack{position:absolute;left:50%;top:50%;
  width:40px;height:44px;margin:-22px 0 0 -20px;
  transform-style:preserve-3d;
  transform:rotateX(52deg) translateY(var(--joy-y,0px));
  transition:transform .42s cubic-bezier(.22,.9,.3,1)}
#joy-stack i{position:absolute;left:0;right:0;height:13px;display:block;
  transition:opacity .42s ease}
/* Trois dalles, dans l'ordre de l'axe : l'objectif tire vers le haut,
   la répulsion vers le bas. */
#joy-stack .o{top:0;background:var(--blue)}
#joy-stack .h{top:16px;background:var(--navy);
  /* Un filet clair sur la tranche : c'est ce qui fait qu'on lit une
     DALLE et pas un rectangle. Une ombre serait une bordure déguisée ;
     un filet de la même famille, non. */
  box-shadow:0 1px 0 rgba(255,255,255,.22)}
#joy-stack .r{top:32px;background:var(--rep)}
/* La dalle centrée est pleine, les deux autres reculent. On voit où l'on
   est sans un mot — c'est tout l'intérêt de la maquette. */
#joy.v-objectives .h,#joy.v-objectives .r{opacity:.34}
#joy.v-habits     .o,#joy.v-habits     .r{opacity:.34}
#joy.v-repulsions .o,#joy.v-repulsions .h{opacity:.34}
#joy.v-objectives{--joy-y:14px}
#joy.v-habits    {--joy-y:0px}
#joy.v-repulsions{--joy-y:-14px}
/* ⚠️ SUR LA SAGESSE ET LA VISION, IL N'Y A QU'UNE COUCHE. L'axe vertical
   n'existe pas là-bas : montrer trois dalles y serait un mensonge. On
   n'en montre qu'une, à la couleur de la vue. */
#joy.seule .o,#joy.seule .r{opacity:0}
#joy.seule .h{opacity:1;top:16px}
#joy.v-wisdom .h{background:var(--rep)}
#joy.v-visions .h{background:var(--blue)}

/* ══ LES QUATRE CURSEURS ENCADRENT LE CARRÉ ══════════════════════════
   Plus de mot : le carré dit déjà, par sa couleur et par la dalle
   allumée, ce qu'il y a de chaque côté. Un chevron, et c'est tout.
   ⚠️ AUCUNE BORDURE — règle de marque. Ce qui les détache, c'est la
   couleur du chevron : celle de la vue qu'il ouvre. */
.cur{background:none;border:none;padding:4px;cursor:pointer;
  -webkit-tap-highlight-color:transparent;display:block;line-height:0;
  opacity:.55;transition:opacity .18s ease,transform .18s ease}
.cur[hidden]{display:none!important}
@media(hover:hover){.cur:hover{opacity:1}}
.cur:active{opacity:1}
.cur svg{width:13px;height:13px;display:block;
  stroke:currentColor;fill:none;stroke-width:1.9;
  stroke-linecap:round;stroke-linejoin:round}
.cur.to-habits    {color:var(--sky)}
.cur.to-objectives{color:var(--blue)}
.cur.to-repulsions{color:var(--rep)}
.cur.to-wisdom    {color:var(--rep)}
.cur.to-visions   {color:var(--blue)}
@media(hover:hover){
  #cur-g:hover{transform:translateX(-2px)}
  #cur-d:hover{transform:translateX(2px)}
  #cur-h:hover{transform:translateY(-2px)}
  #cur-b:hover{transform:translateY(2px)}}
/* Un curseur sans voisin ne laisse pas un trou : sa place est gardée,
   sinon le carré sauterait d'un côté à l'autre en changeant de vue. */
#cur-g,#cur-d{width:21px;height:21px}
#cur-h,#cur-b{height:21px}

/* Le nom de la vue, sous le carré. Le carré montre, le mot nomme. */
#vnow{line-height:1}
#vnow b{font-family:'Space Mono',monospace;font-size:7px;letter-spacing:.2em;
  text-transform:uppercase;color:rgba(255,255,255,.72);font-weight:400;
  white-space:nowrap}
#vnow i{display:none}
/* ══ LA RÉPERCUSSION 3D ══════════════════════════════════════════════
   Le nom pivote DANS LA DIRECTION DU VOYAGE, en même temps que la pile
   glisse. Deux mouvements, un seul geste : le carré est un objet, on
   vient d'en tourner une face. */
@keyframes face-d{from{transform:rotateY(-62deg) translateX(18px);opacity:0}to{transform:none;opacity:1}}
@keyframes face-g{from{transform:rotateY(62deg) translateX(-18px);opacity:0}to{transform:none;opacity:1}}
@keyframes face-b{from{transform:rotateX(62deg) translateY(12px);opacity:0}to{transform:none;opacity:1}}
@keyframes face-h{from{transform:rotateX(-62deg) translateY(-12px);opacity:0}to{transform:none;opacity:1}}
#vnow.f-d{animation:face-d .42s cubic-bezier(.22,.9,.3,1)}
#vnow.f-g{animation:face-g .42s cubic-bezier(.22,.9,.3,1)}
#vnow.f-b{animation:face-b .42s cubic-bezier(.22,.9,.3,1)}
#vnow.f-h{animation:face-h .42s cubic-bezier(.22,.9,.3,1)}
@media(prefers-reduced-motion:reduce){
  .cur{transition:none}
  #joy-box,#joy-stack,#joy-stack i{transition:none}
  #vnow.f-d,#vnow.f-g,#vnow.f-b,#vnow.f-h{animation:none}
}

""" + s[FIN:]

# Le bloc remplace couvrait deja tout : le titre, les images-cles 3D, les
# curseurs, leur placement et le bloc « mouvement reduit ». Rien d'autre a
# retirer -- verifie a la ligne pres avant d'ecrire.

if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (style du joystick)')
