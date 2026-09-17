# -*- coding: utf-8 -*-
"""LOT DU 17/09/2026 · LES TROIS PORTES DU BAS, ET L'ESPACE MEMBRE
    python3 tools/lot17_portes.py

LES PORTES. [My Wisdom] et [My vision for the future] faisaient double
emploi avec les curseurs gauche et droite : deux chemins pour la meme
vue, dont un plus loin du pouce. Les portes vont maintenant DEHORS --
c'est leur seule raison d'etre.
  a) [Get Higher]      -> totehm.space, la ou vit l'experience Stoner.
                          « Get » en Quantico coral, « Higher » en slogan.
  b) [My Higher Self]  -> le bot Telegram, la ou le Totehm parle.
  c) [The Figher Club] -> inchange.

⚠️ [Get Higher] PASSE PAR LE PONT SSO. C'est un autre domaine, donc une
autre session : sans le pont, le membre arrive deconnecte sur .space et
doit se reconnecter pour acceder a ce qu'il a deja paye.

L'ESPACE MEMBRE. Il n'a rien a faire dans le Totehm deplie : tout ce qui
concerne le compte se regle sur l'atterrissage, ou la carte de visite
vit depuis le 15/09. `#conn-bar` reste un ETAT (le point vert, le nom) ;
il cesse d'etre une porte.

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

# ── 1 · le marquage des portes
s = ech(s,
"""  <!-- ⚠️ CES DEUX PORTES N'OUVRENT PLUS DE DOCUMENT · 16/09/2026. Elles
       chargeaient `wisdom.html` et `vision.html`. Les deux fichiers sont
       rentrés dans celui-ci : ce sont deux VUES. La porte fait donc ce
       que fait un carré de la croix — et la session ne bouge pas. -->
  <button class="door" id="door-book" type="button">My Wisdom</button>
  <button class="door" id="door-next" type="button">My vision for the future</button>""",
"""  <!-- ══ LES PORTES MÈNENT DEHORS · 17/09/2026 ═══════════════════════
       [My Wisdom] et [My vision] faisaient double emploi avec les
       curseurs gauche et droite : deux chemins pour la même vue, dont un
       plus loin du pouce. Une porte, maintenant, sort du Totehm — c'est
       sa seule raison d'être.
       ⚠️ « GET » EST LE SEUL MOT CORAL DU PRODUIT (BRAND.md). Il ne se
       réutilise nulle part ailleurs, et « Higher » n'est jamais tapé en
       texte : c'est le slogan, donc le SVG. -->
  <button class="door" id="door-book" type="button">
    <span class="get">Get</span> <svg class="higher-inline" viewBox="0 0 600 200"
      role="img" aria-label="Higher"><use href="#higher-badge"></use></svg></button>
  <button class="door" id="door-next" type="button">My Higher Self</button>""",
'marquage des portes')

# ── 2 · le coral du « Get »
s = ech(s,
""".door-club{color:#fff;font-weight:700}""",
""".door-club{color:#fff;font-weight:700}
/* ⚠️ LE CORAL EST RÉSERVÉ AU « GET » (BRAND.md). Nulle part ailleurs. */
.door .get{font-family:'Quantico',sans-serif;font-weight:400;color:var(--coral)}
.door .higher-inline{height:1.15em;vertical-align:-.26em;margin-left:1px}""",
'coral du Get')

# ── 3 · le cablage
s = ech(s,
"""$('door-book').onclick=requireMember(()=>{ showBook(true); });
$('door-next').onclick=requireMember(()=>{ showNext(true); });""",
"""/* ══ LES DEUX PORTES SORTENT DU DOMAINE · 17/09/2026 ═════════════════
   ⚠️ [Get Higher] PASSE PAR LE PONT. `totehm.space` est une autre
   origine, donc un autre `localStorage`, donc une autre session : sans
   le pont, le membre arrive déconnecté sur ce qu'il a déjà payé.
   `ssoVersDomaine` frappe un code de passage, redirige avec, et part
   quand même si le pont tousse — dégradé, pas cassé.

   [My Higher Self] mène au bot Telegram. Pas de pont : Telegram a son
   propre compte, et c'est le code de liaison (`new_bot_link_code`) qui
   fait le lien, pas une session web. */
$('door-book').onclick=requireMember(()=>{
  ssoVersDomaine(sb,'space','https://www.totehm.space/get_higher'); });
$('door-next').onclick=requireMember(()=>{
  window.open('https://t.me/TotehmBot','_blank','noopener'); });""",
'cablage des portes')

# ── 4 · `showBook` / `showNext` ne servent plus qu'au clavier
s = ech(s,
"""/* ⚠️ CES DEUX-LÀ POINTAIENT SUR LES MAUVAISES VUES · 16/09/2026.
   `showBook` ouvrait les RÉPULSIONS et `showNext` les OBJECTIFS — un
   reste de l'époque où « le livre » et « le prochain objectif » étaient
   deux documents. Depuis que la sagesse et la vision sont deux vues,
   les deux portes du bas mènent où leur nom promet. */
function showBook(on){ setView(on?'wisdom':'habits');  if(on)save(); }
function showNext(on){ setView(on?'visions':'habits'); if(on)save(); }""",
"""/* Les deux portes du bas mènent DEHORS depuis le 17/09 ; ces deux
   fonctions ne servent plus qu'à Échap, qui ramène aux habitudes. */
function showBook(on){ setView(on?'wisdom':'habits');  if(on)save(); }
function showNext(on){ setView(on?'visions':'habits'); if(on)save(); }""",
'commentaire showBook')

# ── 5 · l'espace membre ne s'ouvre plus depuis le Totehm deplie
s = ech(s,
"""$('conn-bar').onclick=()=>{$('member-window').classList.add('show');memberPaint();};""",
"""/* ══ PAS D'ESPACE MEMBRE DANS LE TOTEHM DÉPLIÉ · 17/09/2026 ══════════
   ⚠️ `#conn-bar` EST UN ÉTAT, PLUS UNE PORTE. Tout ce qui concerne le
   compte — le nom, la visibilité, la recherche — vit sur l'atterrissage
   depuis le 15/09. Ouvrir une fenêtre par-dessus le Totehm pour régler
   ce qui se règle à l'écran d'avant, c'était deux endroits pour une
   chose. Le point vert dit qu'on est connecté ; il ne fait rien de plus.
   Sur l'atterrissage, en revanche, il reste la porte — c'est là que la
   carte de visite vit. */
$('conn-bar').onclick=()=>{
  if(!document.body.classList.contains('gate'))return;
  $('member-window').classList.add('show'); memberPaint(); };""",
'conn-bar etat')

# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)
open(P, 'w', encoding='utf-8').write(s)
print('ecrit com/totehm.html  (portes)')
