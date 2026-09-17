# -*- coding: utf-8 -*-
"""LOT DU 17/09/2026 · QUATRE CURSEURS, UN SEUL TITRE
    python3 tools/lot17_curseurs.py

CE QUE WAH DIT : « Le systeme de controle vue curseur est fourre-tout et
pas assez brande. Reprendre la structure du totehm de la methode stoner,
mettre 4 curseurs aux 4 cotes et faire defiler les vues une par une comme
les titres categories de chaque vue, un par un, avec une repercussion 3d
sur le controleur de vue. »

CE QUE JE FAIS, ET POURQUOI
La croix a cinq carres montrait TOUT en permanence : cinq couleurs, cinq
noms, deux axes, au-dessus d'une liste. C'est un plan du produit pose sur
le produit -- exactement « fourre-tout ».

A la place, la grammaire du Totehm lui-meme : le carre, et ses quatre
cotes. UN SEUL TITRE au centre, celui de la vue ou l'on est. QUATRE
CURSEURS, un par cote, chacun portant le nom de la vue qui est de ce
cote-la. On lit ou on est, et on voit ou on peut aller. Rien d'autre.

LA REPERCUSSION 3D. Quand on passe a cote, le titre PIVOTE dans la
direction du voyage : vers la droite il tourne sur son axe vertical, vers
le bas sur son axe horizontal. Le carre est un objet ; on vient d'en
tourner une face. C'est la meme grammaire que le depliage du gate.

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
# 1 · LE STYLE
# ═══════════════════════════════════════════════════════════════════════
VIEUX_CSS_DEBUT = """#views{position:fixed;top:var(--croix-t);left:50%;transform:translateX(-50%);
  z-index:33;display:flex;flex-direction:column;align-items:center;gap:7px}
#vt-row{display:flex;flex-direction:row;align-items:flex-start;gap:22px}
/* Couché : le carré et son mot sur la même ligne. */
.vt-c.lay{flex-direction:row;align-items:center;gap:7px}
.vt-c.lay .vt{width:11px;height:11px}"""

NEUF_CSS_DEBUT = """/* ══ UN SEUL TITRE, QUATRE CURSEURS · 17/09/2026 ═════════════════════
   La croix à cinq carrés montrait tout en permanence — cinq couleurs,
   cinq noms, deux axes, au-dessus d'une liste. Un plan du produit posé
   sur le produit.
   Il ne reste que le TITRE DE LA VUE OÙ L'ON EST. Les quatre cursseurs
   des quatre côtés disent où l'on peut aller. */
#views{position:fixed;top:var(--croix-t);left:50%;transform:translateX(-50%);
  z-index:33;display:flex;flex-direction:column;align-items:center;
  /* La perspective vit sur le PARENT : c'est elle qui fait qu'une
     rotation du titre se lit comme un volume et pas comme un
     écrasement. 620 px — assez pour que la face tourne, pas assez pour
     qu'elle parte en fuite. */
  perspective:620px}
#vnow{display:flex;flex-direction:column;align-items:center;gap:3px;
  transform-style:preserve-3d;backface-visibility:hidden;
  will-change:transform,opacity}
#vnow b{font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.24em;
  text-transform:uppercase;color:#fff;font-weight:700;white-space:nowrap}
#vnow i{font-family:'Space Mono',monospace;font-size:7px;letter-spacing:.2em;
  text-transform:uppercase;color:rgba(255,255,255,.4);font-style:normal}
/* ══ LA RÉPERCUSSION 3D ══════════════════════════════════════════════
   Le titre pivote DANS LA DIRECTION DU VOYAGE : on est allé à droite, il
   tourne sur son axe vertical ; on est descendu, sur son axe horizontal.
   Le carré est un objet, on vient d'en tourner une face.
   Deux temps : `.out` pousse l'ancienne face hors du champ, `.in` fait
   revenir la nouvelle. Une seule classe ne suffirait pas — il faut un
   avant et un après, et le texte change entre les deux. */
@keyframes face-d{from{transform:rotateY(-62deg) translateX(26px);opacity:0}
                  to{transform:none;opacity:1}}
@keyframes face-g{from{transform:rotateY(62deg) translateX(-26px);opacity:0}
                  to{transform:none;opacity:1}}
@keyframes face-b{from{transform:rotateX(62deg) translateY(18px);opacity:0}
                  to{transform:none;opacity:1}}
@keyframes face-h{from{transform:rotateX(-62deg) translateY(-18px);opacity:0}
                  to{transform:none;opacity:1}}
#vnow.f-d{animation:face-d .42s cubic-bezier(.22,.9,.3,1)}
#vnow.f-g{animation:face-g .42s cubic-bezier(.22,.9,.3,1)}
#vnow.f-b{animation:face-b .42s cubic-bezier(.22,.9,.3,1)}
#vnow.f-h{animation:face-h .42s cubic-bezier(.22,.9,.3,1)}

/* ══ LES QUATRE CURSEURS ═════════════════════════════════════════════
   Un par côté du Totehm. Chacun porte la COULEUR de la vue qu'il ouvre
   et son nom. `position:fixed` dans `#stage` : sur ordinateur #stage
   porte un transform, il est donc le bloc conteneur — les curseurs
   restent collés au carré. Sur téléphone ils se posent sur l'écran.
   Un seul code, deux résultats justes : c'est déjà comme ça que les
   carrés vivaient.
   ⚠️ AUCUNE BORDURE. Ce qui les détache, c'est la couleur du chevron et
   l'écart, jamais un trait — règle de marque. */
.cur{position:fixed;z-index:33;background:none;border:none;padding:6px;
  cursor:pointer;-webkit-tap-highlight-color:transparent;
  display:flex;align-items:center;gap:6px;
  opacity:.5;transition:opacity .18s ease,transform .18s ease}
.cur[hidden]{display:none!important}
@media(hover:hover){.cur:hover{opacity:1}}
.cur:active{opacity:1}
.cur svg{width:14px;height:14px;flex:0 0 auto;display:block;
  stroke:currentColor;fill:none;stroke-width:1.7;
  stroke-linecap:round;stroke-linejoin:round}
.cur span{font-family:'Space Mono',monospace;font-size:7px;letter-spacing:.18em;
  text-transform:uppercase;color:rgba(255,255,255,.62);white-space:nowrap}
/* La couleur du chevron EST la couleur de la vue qu'il ouvre : on voit
   où l'on va avant d'y aller, comme les carrés le faisaient. */
.cur.to-habits    {color:var(--sky)}
.cur.to-objectives{color:var(--blue)}
.cur.to-repulsions{color:var(--rep)}
.cur.to-wisdom    {color:var(--rep)}
.cur.to-visions   {color:var(--blue)}

/* Gauche et droite : au milieu de la hauteur, le mot sous le chevron
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
                    #cur-b:hover{transform:translateX(-50%) translateY(2px)}}
@media(prefers-reduced-motion:reduce){
  .cur{transition:none}
  #vnow.f-d,#vnow.f-g,#vnow.f-b,#vnow.f-h{animation:none}
}"""
s = ech(s, VIEUX_CSS_DEBUT, NEUF_CSS_DEBUT, 'style des curseurs')

# ── les anciennes regles des carres disparaissent
s = ech(s,
""".vt{width:17px;height:17px;cursor:pointer;padding:0;
  border:none;outline:none;opacity:.42;
  -webkit-tap-highlight-color:transparent;transition:opacity .18s ease}
@media(hover:hover){.vt:hover{opacity:.75}}
.vt[aria-selected="true"]{opacity:1}
.vt:focus-visible{opacity:1}
.vt.r{background:var(--rep)}
.vt.h{background:var(--navy)}
.vt.o{background:var(--blue)}
.vt.w{background:var(--rep)}
.vt.v{background:var(--blue)}""",
"""/* `.vt`, `.vt-c`, `.vt-n` ont disparu avec la croix — voir `#vnow` et
   `.cur` plus haut. Les carrés vivent dans git, commit précédent. */""",
'retrait des carres')

# ═══════════════════════════════════════════════════════════════════════
# 2 · LE MARQUAGE
# ═══════════════════════════════════════════════════════════════════════
DEB = s.index('<!-- ══ LA CROIX · 16/09/2026')
FIN = s.index('</div>', s.index('data-v="repulsions"', DEB)) + len('</div>')
VIEUX_HTML = s[DEB:FIN]
NEUF_HTML = """<!-- ══ LE TITRE ET LES QUATRE CURSEURS · 17/09/2026 ══════════════════
     Un seul titre — celui de la vue où l'on est. Quatre curseurs, un par
     côté du Totehm, chacun portant le nom et la couleur de la vue de ce
     côté-là. Un curseur sans voisin se retire (`hidden`) : un bouton
     qui ne fait rien apprend à ne plus regarder les autres. -->
<div id="views" class="sink-el" role="group" aria-label="La vue courante">
  <div id="vnow"><b></b><i></i></div>
</div>
<button class="cur sink-el" id="cur-h" type="button" hidden>
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 10 L8 5 L13 10"/></svg><span></span></button>
<button class="cur sink-el" id="cur-g" type="button" hidden>
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 L5 8 L10 13"/></svg><span></span></button>
<button class="cur sink-el" id="cur-d" type="button" hidden>
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3 L11 8 L6 13"/></svg><span></span></button>
<button class="cur sink-el" id="cur-b" type="button" hidden>
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6 L8 11 L13 6"/></svg><span></span></button>"""
s = ech(s, VIEUX_HTML, NEUF_HTML, 'marquage des curseurs')

# ═══════════════════════════════════════════════════════════════════════
# 3 · LE MOTEUR
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""const voisin=d=>(CROIX[view]||{})[d]||null;
function versVoisin(d){ const v=voisin(d); if(v)setView(v); }""",
"""const voisin=d=>(CROIX[view]||{})[d]||null;
/* Le nom et la glose de chaque vue : une seule table, lue par le titre
   ET par les quatre curseurs. Deux tables finiraient par se contredire. */
const NOM_VUE={
  wisdom:    ['my wisdom','past'],
  habits:    ['my habits','present'],
  visions:   ['my vision','future'],
  objectives:['my objectives','what I am heading for'],
  repulsions:['my repulsions','habits to kill'],
};
/* La direction du DERNIER voyage : c'est elle qui décide de quel côté le
   titre pivote. Null au chargement — on n'arrive de nulle part. */
let dernierSens=null;
function versVoisin(d){ const v=voisin(d); if(!v)return; dernierSens=d; setView(v); }""",
'table des noms')

s = ech(s,
"""  document.querySelectorAll('#views .vt-c').forEach(b=>{
    b.setAttribute('aria-selected', b.dataset.v===view ? 'true':'false');
  });""",
"""  /* ── LE TITRE ET LES QUATRE CURSEURS ──────────────────────────────
     Tout se peint ici, à chaque rendu : un curseur qui reste affiché
     alors que sa vue n'a plus de voisin est un bouton mort. */
  const nv=$('vnow');
  if(nv){
    const [nom,glose]=NOM_VUE[view]||['',''];
    nv.querySelector('b').textContent=nom;
    nv.querySelector('i').textContent=glose;
    /* ⚠️ UNE ANIMATION SE REJOUE À CHAQUE REDESSIN si on se contente de
       poser la classe. On la retire, on force un reflow, on la remet —
       c'est le seul moyen de la rejouer À LA DEMANDE et jamais sinon.
       Sans ça, cliquer dans une boîte faisait pivoter le titre. */
    nv.className='';
    if(dernierSens){ void nv.offsetWidth; nv.classList.add('f-'+dernierSens); dernierSens=null; }
  }
  [['cur-g','g'],['cur-d','d'],['cur-h','h'],['cur-b','b']].forEach(([id,d])=>{
    const b=$(id); if(!b)return;
    const cible=(CROIX[view]||{})[d]||null;
    b.hidden=!cible;
    if(!cible)return;
    b.className='cur sink-el to-'+cible;
    b.querySelector('span').textContent=(NOM_VUE[cible]||[''])[0];
    b.setAttribute('aria-label','Go to '+(NOM_VUE[cible]||[''])[0]);
  });""",
'peinture du titre et des curseurs')

s = ech(s,
"""document.querySelectorAll('#views .vt-c').forEach(b=>{
  b.onclick=()=>{ if(navBlocked())return; setView(b.dataset.v); };
});""",
"""[['cur-g','g'],['cur-d','d'],['cur-h','h'],['cur-b','b']].forEach(([id,d])=>{
  const b=$(id); if(b)b.onclick=()=>{ if(navBlocked())return; versVoisin(d); };
});""",
'cablage des curseurs')

# ── l'autre cablage des carres (ligne 4223 d'origine) tombe aussi
s = ech(s,
"""document.querySelectorAll('#views .vt-c').forEach(b=>""",
"""document.querySelectorAll('#views .vt-c-disparu').forEach(b=>""",
'ancien cablage neutralise')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (curseurs)')
