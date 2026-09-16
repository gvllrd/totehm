# -*- coding: utf-8 -*-
"""LOT DU 16/09/2026 · L'ATTERRISSAGE PREND LA FORME DE GOOGLE
    python3 tools/lot16_atterrissage.py

Le TOTEHM et [Open my Totehm] EN HAUT, la barre de recherche EN BAS, sur
telephone comme sur ordinateur. Et [Search a Totehm] n'est plus un bouton
qui revele un champ : c'est une BARRE DE RECHERCHE, tout de suite.

POURQUOI CA COMPTE : un bouton qui se transforme en champ demande deux
gestes pour une intention. Une barre demande zero geste — on tape. C'est
la seule raison pour laquelle la page d'accueil de Google est ce qu'elle
est depuis vingt-cinq ans.

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
# 1 · LE MARQUAGE — trois blocs deviennent deux groupes
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""  <div id="gate-id">
    <button class="btn-sig gid" id="name-btn">Name of my Totehm</button>
    <input class="line-input hide" id="set-name" maxlength="24" placeholder="my Totehm" autocomplete="off" spellcheck="false">
    <div class="note dim hide" id="name-note"></div>

    <button class="btn-sig gid" id="vis-btn">Visibility</button>
    <div class="hide" id="vis-panel"><div class="row"><button class="size-btn" id="set-private">Private</button><button class="size-btn" id="set-members">Visible to members</button></div></div>

    <button class="btn-sig" id="search-btn">Search a Totehm</button>
    <input class="line-input hide" id="search-input" maxlength="24" placeholder="name of a Totehm" autocomplete="off" spellcheck="false">
    <div class="note dim hide" id="search-note"></div>
  </div>

  <div id="gate-top-row">""",
"""  <div id="gate-top-row">""",
'sort gate-id du haut')

s = ech(s,
"""  <button class="btn-sig" id="gate-open">Open my Totehm</button>
  </div><!-- /gate-top-row -->""",
"""  <button class="btn-sig" id="gate-open">Open my Totehm</button>

  <!-- Le nom et la visibilité appartiennent à l'identité : ils restent
       collés sous le bouton, et n'existent que pour un membre. -->
  <div id="gate-id">
    <button class="btn-sig gid" id="name-btn">Name of my Totehm</button>
    <input class="line-input hide" id="set-name" maxlength="24" placeholder="my Totehm" autocomplete="off" spellcheck="false">
    <div class="note dim hide" id="name-note"></div>

    <button class="btn-sig gid" id="vis-btn">Visibility</button>
    <div class="hide" id="vis-panel"><div class="row"><button class="size-btn" id="set-private">Private</button><button class="size-btn" id="set-members">Visible to members</button></div></div>
  </div>
  </div><!-- /gate-top-row -->""",
'gate-id sous le bouton')

s = ech(s,
"""  <button id="ctx-down" type="button" aria-label="Think same but opposite">
    <span class="ctx-label">Think same but opposite</span>""",
"""  <!-- ══ LA BARRE DE RECHERCHE EST EN BAS · 16/09/2026 ═══════════════
       Le haut porte l'identité — le logo et la porte. Le bas porte
       l'action — on cherche quelqu'un. C'est la forme de Google, et
       elle tient pour la même raison : le pouce est en bas, l'œil est
       en haut.
       ⚠️ CE N'EST PLUS UN BOUTON QUI RÉVÈLE UN CHAMP. Il fallait deux
       gestes pour une intention ; il en faut zéro : on tape. Le bouton
       `#search-btn` et son `morph()` sont supprimés — le câblage le
       sait, il ne l'appelle plus. -->
  <div id="gate-foot">
    <div id="gate-search">
      <input class="line-input" id="search-input" maxlength="24"
             placeholder="search a Totehm" autocomplete="off" spellcheck="false"
             aria-label="Search a Totehm">
      <div class="note dim hide" id="search-note"></div>
    </div>

  <button id="ctx-down" type="button" aria-label="Think same but opposite">
    <span class="ctx-label">Think same but opposite</span>""",
'barre de recherche en bas')

s = ech(s,
"""    <svg class="chev bob" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
  </button>
</section>""",
"""    <svg class="chev bob" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
  </button>
  </div><!-- /gate-foot -->
</section>""",
'ferme gate-foot')

# ═══════════════════════════════════════════════════════════════════════
# 2 · LA MISE EN PAGE
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""#gate-id{display:flex;flex-direction:column;align-items:center;gap:7px;
  width:100%;max-width:340px;margin:0 auto 14px;padding:0 18px}""",
"""#gate-id{display:flex;flex-direction:column;align-items:center;gap:7px;
  width:100%;max-width:340px;margin:0 auto;padding:0 18px}
/* ══ LE BAS DE L'ATTERRISSAGE · 16/09/2026 ═══════════════════════════
   `#gate-hero` est déjà en `space-between` : deux groupes suffisent à
   pousser l'un en haut et l'autre en bas. Un troisième bloc au milieu
   aurait recentré le tout — c'est ce qui se passait avant. */
#gate-foot{display:flex;flex-direction:column;align-items:center;
  width:100%;flex-shrink:0}
#gate-search{width:100%;max-width:420px;padding:0 18px;
  display:flex;flex-direction:column;align-items:center;gap:8px}
/* La barre prend la largeur qu'on lui donne : une barre de recherche
   étroite ne se lit pas comme une barre de recherche. */
#gate-search #search-input{width:100%;max-width:none;font-size:15px;
  text-align:center}
#gate-search .note{width:100%}""",
'mise en page du bas')

# ═══════════════════════════════════════════════════════════════════════
# 3 · LE CABLAGE — plus de morph sur la recherche
# ═══════════════════════════════════════════════════════════════════════
s = ech(s,
"""morph($('name-btn'),$('set-name'),$('name-note'),true);        /* réservé aux membres */
morph($('search-btn'),$('search-input'),$('search-note'),false);""",
"""morph($('name-btn'),$('set-name'),$('name-note'),true);        /* réservé aux membres */
/* ⚠️ PAS DE `morph` SUR LA RECHERCHE · 16/09/2026. `#search-btn` n'existe
   plus : la recherche est une BARRE, visible dès l'arrivée. Appeler
   `morph` sur un nœud absent lèverait ici même — donc au chargement du
   module, donc page blanche. C'est arrivé trois fois cette semaine. */""",
'plus de morph sur la recherche')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (atterrissage)')
