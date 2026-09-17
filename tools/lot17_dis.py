# -*- coding: utf-8 -*-
"""LOT DU 17/09/2026 · LE TOTEHM SAIT DIRE UNE PHRASE
    python3 tools/lot17_dis.py

Il n'y avait AUCUN moyen de dire quoi que ce soit au membre dans le
Totehm deplie. Quand une ecriture echouait, ca partait dans la console --
c'est-a-dire nulle part. Avec la creation optimiste il FAUT pouvoir dire
« ca n'a pas ete enregistre » : une boite qu'on croit sauvee et qui
dispara)t au rechargement est le pire des etats.

Ce n'est pas une fenetre, pas un bandeau, pas un cadre : un MOT, a la
graisse des etiquettes du produit, sous la croix, qui s'efface seul.

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

# ── le style, juste apres celui de la bande de classement
s = ech(s,
"""#ordbar,.ordbar{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.2em;""",
"""/* ══ LE TOTEHM DIT UNE PHRASE · 17/09/2026 ══════════════════════════
   Une seule ligne, a la graisse des etiquettes, posee sous la croix.
   Pas de cadre, pas de fond, pas de croix pour la fermer : elle s'efface
   seule en trois secondes. Une alerte qu'il faut congedier est une
   alerte de trop.
   `pointer-events:none` : elle ne doit JAMAIS intercepter un doigt --
   elle apparait exactement la ou l'on vient d'appuyer. */
#dit{position:fixed;top:calc(var(--croix-t) + 82px);left:50%;
  transform:translateX(-50%);z-index:34;pointer-events:none;
  font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.2em;
  text-transform:uppercase;color:#d59ac4;white-space:nowrap;
  opacity:0;transition:opacity .22s ease}
#dit.on{opacity:1}
@media(prefers-reduced-motion:reduce){#dit{transition:none}}
#ordbar,.ordbar{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.2em;""",
'style de #dit')

# ── le balisage, a cote de la bande de classement
s = ech(s,
"""<div id="ordbar" class="sink-el">order by importance — the bot follows this order</div>""",
"""<div id="ordbar" class="sink-el">order by importance — the bot follows this order</div>
<div id="dit" class="sink-el" role="status" aria-live="polite"></div>""",
'balisage de #dit')

# ── la fonction
s = ech(s,
"""/* ══ LES TROIS VUES ══════════════════════════════════════════════════ */""",
"""/* ══ DIRE UNE PHRASE ═════════════════════════════════════════════════
   `dis('…')` pose un mot sous la croix, trois secondes. `dis()` l'efface.
   ⚠️ ELLE NE DIT JAMAIS UN DETAIL TECHNIQUE. « objective not saved » se
   comprend ; « PGRST204 » ne se comprend pas, et un message qu'on ne
   comprend pas fait peur sans aider. Le detail va dans la console. */
let ditT=null;
function dis(mot){
  const e=$('dit'); if(!e)return;
  clearTimeout(ditT);
  if(!mot){ e.classList.remove('on'); return; }
  e.textContent=mot; e.classList.add('on');
  ditT=setTimeout(()=>e.classList.remove('on'),3000);
}

/* ══ LES TROIS VUES ══════════════════════════════════════════════════ */""",
'fonction dis()')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (dis)')
