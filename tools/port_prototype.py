# -*- coding: utf-8 -*-
"""LE PORTAGE — le prototype validé entre dans le fichier servi.

    python3 tools/port_prototype.py

Il remplace, dans `space/totehm.html`, la couche des TROIS VUES — le CSS
des boîtes ouvertes, et tout le rendu objectifs/habitudes/répulsions — par
celle du prototype (`tools/prototype_totehm.py`), câblée aux VRAIES
données : `state.habits`, `TRIPS`, `REPS`, et les RPC du serveur.

POURQUOI UN SCRIPT ET PAS UNE ÉDITION À LA MAIN
  Le fichier servi fait 3 450 lignes. Chaque remplacement est ancré sur un
  repère qui doit exister EXACTEMENT UNE FOIS : si le fichier a bougé, le
  script s'arrête en disant lequel, au lieu de coller du code à côté de sa
  place. Un portage qui échoue bruyamment vaut mieux qu'un portage qui
  réussit à moitié.

CE QUI N'EST PAS TOUCHÉ
  L'atterrissage, le dépliage, la session, la recherche, le filtre, la
  fenêtre membre, l'abonnement, Telegram, la géolocalisation. Le portage
  ne descend pas plus bas que la liste.
"""
import io, os, re, sys

SC   = os.path.dirname(os.path.abspath(__file__)) + '/'
CIBLE = SC + '../space/totehm.html'
src  = io.open(CIBLE, encoding='utf-8').read()
avant = len(src)

def coupe(debut, fin, quoi, remplacement):
    """Remplace la tranche [debut..fin] — les deux repères doivent être
    uniques. On vérifie AVANT de couper : un repère en double veut dire
    qu'on ne sait pas laquelle des deux tranches on remplace."""
    global src
    for r in (debut, fin):
        n = src.count(r)
        if n != 1:
            sys.exit('ARRET · %s · le repere apparait %d fois :\n  %s' % (quoi, n, r[:90]))
    a = src.index(debut)
    b = src.index(fin, a) + len(fin)
    if b <= a:
        sys.exit('ARRET · %s · les reperes sont dans le desordre' % quoi)
    src = src[:a] + remplacement + src[b:]
    print('  remplace  %-34s %6d octets -> %d' % (quoi, b - a, len(remplacement)))

def insere_avant(repere, quoi, ajout):
    global src
    if src.count(repere) != 1:
        sys.exit('ARRET · %s · repere non unique : %s' % (quoi, repere[:90]))
    src = src.replace(repere, ajout + repere, 1)
    print('  insere    %-34s %6d octets' % (quoi, len(ajout)))


# ═══════════════════════════════════════════════════════════════════════
# 1 · LE CSS — la boîte ouverte devient le TRIP à trois blocs
# ═══════════════════════════════════════════════════════════════════════
CSS = r'''/* ══ LA BOÎTE OUVERTE — IL N'Y A PLUS DE FENÊTRE · 06/09/2026 ═════════
   `#trip-peek` était une modale plein écran sur un voile noir à 82 %. Elle
   ne vivait pas DANS le Totehm : elle le recouvrait — plus de T, plus de
   carrés, plus de wordmark, plus de rail. Le voile est parti.
   La boîte de la ligne S'AGRANDIT à sa place, garde la couleur de sa vue,
   et tout se saisit dedans. Le Totehm ne se quitte jamais.

   `flex:0 0 auto` n'est pas du zèle : #habits est une colonne flex, et un
   enfant flex se laisse comprimer par défaut — sans lui la boîte ouverte
   était écrasée à la hauteur d'une ligne et les suivantes se dessinaient
   par-dessus.

   LE TRIP SE LIT SUR DU NOIR. Une boîte FERMÉE porte la couleur de sa vue ;
   une boîte OUVERTE est un plan de travail, et un plan de travail se lit sur
   du noir — c'est là qu'on écrit, qu'on choisit, qu'on efface. Le filet
   garde la couleur de la vue : on sait toujours où l'on est. */
.habit.open{align-items:stretch;flex:0 0 auto}
.habit.open .h-body{display:block;padding:12px 12px 14px;cursor:default;
  background:#000;border:1px solid var(--skin)}
@media(hover:hover){.habit.open .h-body:hover{filter:none}}
.w-top{display:flex;align-items:flex-start;margin-bottom:10px}
.w-x{margin-left:auto;background:none;border:none;color:rgba(255,255,255,.5);
  font-size:20px;line-height:1;cursor:pointer;padding:0 3px;transition:color .15s}
.w-x:hover{color:#fff}

/* ══ LES TROIS BLOCS DU TRIP ═════════════════════════════════════════
   Ouvrir n'importe quelle boîte montre le TRIP ENTIER, dans ses trois
   couleurs. L'ORDRE dépend de la vue d'où l'on vient : la pièce qu'on
   touche passe en premier — c'est elle qu'on est venu voir.
   Les mots disent le LIEN, pas la catégorie : la couleur dit déjà la
   catégorie. WHY remonte, HOW descend, PROTECTS tient. */
.blk{position:relative;border:1px solid #000;padding:9px 11px 10px;margin-bottom:7px}
.blk-o{background:var(--blue)}
.blk-h{background:var(--navy)}
.blk-r{background:var(--rep)}
.blk-l{display:block;font-family:'Space Mono',monospace;font-size:8px;
  letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.62);
  margin-bottom:5px}
.blk-t{font-family:'Quantico',sans-serif;font-weight:400;font-size:14px;
  line-height:1.45;color:#fff;background:none;border:none;outline:none;
  width:100%;display:block;padding:0 22px 0 0;resize:none;overflow:hidden;
  text-align:left;caret-color:#fff;min-height:1.45em}
.blk-t.go{cursor:pointer;transition:opacity .15s}
.blk-t.go:hover{opacity:.78}
.blk-x{position:absolute;top:6px;right:7px;background:none;border:none;
  color:rgba(255,255,255,.45);font-size:16px;line-height:1;cursor:pointer;
  padding:0 3px;transition:color .15s}
.blk-x:hover{color:#fff}
.blk-u{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin-top:7px;
  font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.14em;
  text-transform:uppercase;color:rgba(255,255,255,.72)}
.blk-i{background:none;border:none;padding:0;cursor:pointer;font-family:'Space Mono',monospace;
  font-size:9px;letter-spacing:.14em;text-transform:uppercase;font-weight:700}
.blk .in{font-family:'Quantico',sans-serif;font-size:13px;color:#fff;
  background:rgba(0,0,0,.3);border:1px solid #000;padding:5px 7px;outline:none;
  transition:background .15s}
.blk .in:focus{background:rgba(0,0,0,.5)}
.blk .in::placeholder{color:rgba(255,255,255,.4)}
.blk .in.date{color-scheme:dark}
.blk .in.nw{width:100%;margin-bottom:6px}
/* UNE HABITUDE EST NAVY PARTOUT, y compris dans le noir du Trip et dans
   le bloc rouge-violet d'une répulsion. C'est la couleur du présent : elle
   ne change pas parce qu'on la regarde depuis ailleurs. */
.h-frame{background:var(--navy);border:1px solid #000;padding:2px 6px;
  display:inline-block}
.u-mini{font-family:'Quantico',sans-serif;font-size:11px;letter-spacing:0;
  text-transform:none}
.w-sec{margin-top:9px}
.acts{display:flex;gap:8px;justify-content:flex-end;margin-top:13px;flex-wrap:wrap}
.btn{background:none;border:1px solid #fff;color:#fff;cursor:pointer;padding:5px 12px;
  font-family:'Quantico',sans-serif;font-weight:700;font-size:12px;white-space:nowrap;
  transition:background .15s,color .15s}
.btn:hover{background:#fff;color:#000}
.btn.g{border-color:rgba(255,255,255,.28);color:rgba(255,255,255,.5)}
.btn.g:hover{background:none;border-color:#fff;color:#fff}
.dash{width:100%;background:none;border:1px dashed rgba(255,255,255,.28);
  color:rgba(255,255,255,.6);cursor:pointer;padding:6px;margin-bottom:7px;
  font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.18em;
  text-transform:uppercase;transition:border-color .15s,color .15s}
.dash:hover{border-color:#fff;color:#fff}
.add-box{width:100%;background:none;border:none;color:#fff;cursor:pointer;
  text-align:left;padding:0;font-family:'Quantico',sans-serif;font-size:14px}

/* ══ LE LOOKUP — UNE RÉPULSION PROTÈGE PLUSIEURS HABITUDES ═══════════
   Comme un lookup Airtable : on voit d'un coup d'œil ce que « la
   procrastination » menace, et on l'attache ou la détache d'un doigt.
   On ne réécrit jamais ce qui est déjà là. */
.lk{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-top:8px}
.lk-on{font-family:'Quantico',sans-serif;font-size:11px;color:#fff;
  background:var(--navy);border:1px solid #000;padding:2px 6px}
.lk-add{background:none;border:1px dashed rgba(255,255,255,.32);
  color:rgba(255,255,255,.7);cursor:pointer;padding:2px 7px;
  font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.16em;
  text-transform:uppercase;transition:border-color .15s,color .15s}
.lk-add:hover{border-color:#fff;color:#fff}
.lk-pick{display:flex;flex-direction:column;gap:4px;margin-top:7px;
  max-height:190px;overflow:auto}
.lk-o{text-align:left;background:rgba(0,0,0,.32);border:1px solid #000;color:#fff;
  cursor:pointer;padding:5px 8px;font-family:'Quantico',sans-serif;font-size:12px;
  transition:background .15s}
.lk-o:hover{background:rgba(0,0,0,.55)}
.lk-o.on{background:var(--navy)}

/* ══ LE DÉROULANT ════════════════════════════════════════════════════
   Un menu maison et pas un <select> natif : sur mobile il doit s'ouvrir
   en FENÊTRE CENTRÉE plein écran, ce qu'un <select> ne sait pas faire —
   et un menu de 33 rythmes dans une liste native est illisible au pouce. */
.selw{position:relative;display:inline-block}
.selb{background:rgba(0,0,0,.3);border:1px solid #000;color:#fff;cursor:pointer;
  padding:3px 8px;font-family:'Space Mono',monospace;font-size:9px;
  letter-spacing:.14em;text-transform:uppercase;transition:background .15s}
.selb:hover{background:rgba(0,0,0,.55)}
.selp{display:none}
.selp.on{display:block;position:absolute;z-index:60;top:calc(100% + 3px);left:0;
  min-width:190px;max-height:230px;overflow:auto;background:#000;
  border:1px solid var(--skin)}
.selp-in{display:flex;flex-direction:column}
.selo{text-align:left;background:none;border:none;color:#fff;cursor:pointer;
  padding:6px 10px;font-family:'Quantico',sans-serif;font-size:12px;
  transition:background .15s}
.selo:hover{background:rgba(255,255,255,.1)}
.selo.on{background:var(--navy)}
/* Sur mobile le déroulant devient une FENÊTRE CENTRÉE plein écran : un
   menu ancré sous son bouton finit sous le clavier ou hors du carré. */
@media(max-width:700px){
  .selp.on{position:fixed;inset:0;top:0;left:0;min-width:0;max-height:none;
    border:none;background:rgba(0,0,0,.92);z-index:120;
    display:flex;align-items:center;justify-content:center;padding:22px}
  .selp.on .selp-in{width:100%;max-width:340px;max-height:74vh;overflow:auto;
    background:#000;border:1px solid var(--skin)}
  .selo{padding:11px 14px;font-size:14px}
}

/* ══ LE CHOIX D'INTENTION — MINIMAL, EN FONDU ════════════════════════
   Pas de surlignage : la tuile prend un FONDU de sa couleur, et le mot
   reste lisible. Choisie, elle se remplit. Le pilier dit à quoi
   l'intention sert dans une vie — c'est le cadre mental du produit. */
.ints{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:5px}
.int{background:linear-gradient(180deg,color-mix(in srgb,var(--ic) 26%,transparent),transparent);
  border:none;color:#fff;cursor:pointer;padding:7px 6px;text-align:center;
  transition:background .18s ease}
.int:hover{background:linear-gradient(180deg,color-mix(in srgb,var(--ic) 46%,transparent),transparent)}
.int.on{background:var(--ic)}
.int-n{display:block;font-family:'Quantico',sans-serif;font-weight:700;font-size:12px}
.int-p{display:block;font-family:'Space Mono',monospace;font-size:7px;
  letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.6);margin-top:2px}
.int.on .int-p{color:rgba(0,0,0,.55)}

/* ══ LE MODE IMPORTANCE ══════════════════════════════════════════════
   L'ordre n'est pas cosmétique : c'est celui que le bot suivra, et celui
   qui départage la carte à classement égal. Un seul chemin pour le doigt
   et la souris — Pointer Events. `touch-action:none` est OBLIGATOIRE :
   sans lui le navigateur avale le glissement vertical et le classement se
   perd une fois sur deux. */
/* EN HAUT À GAUCHE, en miroir de la croix de repli. À droite il touchait
   la croix : deux cibles de 30 px à 20 px l'une de l'autre, c'est un clic
   sur deux qui referme le Totehm au lieu de classer. */
#ordbtn{position:absolute;top:30px;left:calc(var(--pad) + 2px);z-index:44;
  background:none;border:none;cursor:pointer;padding:4px;display:flex;
  flex-direction:column;gap:3px;-webkit-tap-highlight-color:transparent}
#ordbtn span{display:block;height:2px;background:rgba(255,255,255,.45);
  transition:background .15s,width .15s}
#ordbtn .ob-1{width:16px}#ordbtn .ob-2{width:11px}#ordbtn .ob-3{width:7px}
#ordbtn:hover span{background:#fff}
body.ordering #ordbtn span{background:#fff}
/* LA BARRE EST DANS LE FLUX, au-dessus de la première ligne. Posée en
   absolu elle traversait le T : le carré n'a pas de place libre en haut,
   et une bande de texte qui coupe le logo, c'est le logo qu'on abîme. */
.ordbar{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.2em;
  text-transform:uppercase;color:rgba(255,255,255,.72);
  padding:0 0 10px;margin-left:calc(var(--rl) + var(--rw) + 16px)}
body.ordering .habit{touch-action:none;cursor:grab}
body.ordering .habit .h-body{opacity:.92}
.habit.drag{opacity:.4}
.habit.over .h-body{outline:1px solid #fff;outline-offset:2px}
.rank{position:absolute;left:calc(var(--rl) - 20px);top:50%;transform:translateY(-50%);
  font-family:'Space Mono',monospace;font-size:10px;color:rgba(255,255,255,.8);
  font-variant-numeric:tabular-nums}
.void{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.2em;
  text-transform:uppercase;color:rgba(255,255,255,.45);padding:24px 0;text-align:center}'''

coupe("/* ══ LA BOÎTE OUVERTE — IL N'Y A PLUS DE FENÊTRE · 05/09/2026 ═════════",
      ".tp-btn.g:hover{background:none;border-color:#fff;color:#fff}",
      'CSS de la boite ouverte', CSS)


# ═══════════════════════════════════════════════════════════════════════
# 2 · LE MARKUP — le bouton du mode importance entre dans le carré
# ═══════════════════════════════════════════════════════════════════════
insere_avant('<div id="bigT" class="sink-el">', 'bouton du mode importance', r'''<!-- LE MODE IMPORTANCE. Trois traits dégressifs : c'est un classement,
     pas un menu. Il vit DANS #stage — donc dans le carré sur desktop. -->
<button id="ordbtn" class="sink-el" type="button" aria-label="Order by importance">
  <span class="ob-1"></span><span class="ob-2"></span><span class="ob-3"></span>
</button>

''')

# ON N'ÉCRIT QU'À LA FIN. Un `sys.exit` au milieu laisserait sinon le
# fichier servi à moitié porté — l'état le plus difficile à diagnostiquer.


# ═══════════════════════════════════════════════════════════════════════
# 3 · `renderHabits` DEVIENT UN AIGUILLAGE
#     Elle est appelée depuis quinze endroits (le filtre, le compte, la
#     fréquence, la migration…). On garde le NOM — c'est le contrat — et
#     on met le moteur derrière.
# ═══════════════════════════════════════════════════════════════════════
ALIAS = r'''/* `renderHabits()` GARDE SON NOM PARCE QUE QUINZE APPELANTS LE CONNAISSENT
   — le filtre, le compte, la fréquence, la migration locale→nuage. Elle ne
   dessine plus : elle appelle le moteur des trois vues, qui sait laquelle
   est ouverte. Un seul rendu pour trois vues, sinon la liste et le détail
   finissent par ne pas dire la même chose. */
function renderHabits(){ return renderZone(); }'''

coupe('function renderHabits(){',
      "    const na=$('h-add');if(na)na.focus();\n  });\n}",
      'renderHabits -> aiguillage', ALIAS)


# ═══════════════════════════════════════════════════════════════════════
# 4 · LE MOTEUR DES TROIS VUES
#     Il vit dans `tools/vues_totehm.js` — un fichier .js qu'on peut passer
#     à `node --check` avant de l'injecter. Une erreur de syntaxe se voit
#     alors AVANT d'être dans le fichier servi, pas après.
# ═══════════════════════════════════════════════════════════════════════
MOTEUR = io.open(SC + 'vues_totehm.js', encoding='utf-8').read().rstrip() + '\n'

coupe('/* ══ LES TROIS VUES ═══════════════════════════════════════════════════',
      "  if(!REPS.length)box.innerHTML='<div class=\"v-empty\">'\n"
      "    +(tripsLoaded?'no repulsion yet — add one from a habit':'loading…')+'</div>';\n"
      "  else box.innerHTML=h;\n}",
      'moteur des trois vues', MOTEUR)


# ═══════════════════════════════════════════════════════════════════════
# 5 · L'ORDRE DU MEMBRE SURVIT AU CHANGEMENT D'APPAREIL
#     `cloudLoad` reconstruit `state` de zéro : sans ça, l'ordre choisi à la
#     main était oublié au premier chargement depuis le nuage, et les
#     habitudes se remettaient à couler par rythme.
# ═══════════════════════════════════════════════════════════════════════
coupe("  state={habits, vis:data.some(r=>r.totehm_visibility==='members')?'members':'private'};",
      "  state={habits, vis:data.some(r=>r.totehm_visibility==='members')?'members':'private'};",
      "l'ordre survit au nuage",
      "  /* L'ORDRE DU MEMBRE EST UNE DONNÉE. `state` est reconstruit de zéro\n"
      "     ici : sans ce report, l'ordre choisi à la main était oublié au\n"
      "     premier chargement depuis le nuage. L'ordre lui-même voyage dans\n"
      "     `steps` — c'est l'ordre du tableau ; seul le DRAPEAU se perdait. */\n"
      "  const ordonne = !!(state && state.ord);\n"
      "  state={habits, vis:data.some(r=>r.totehm_visibility==='members')?'members':'private'};\n"
      "  if(ordonne)state.ord=true;")


# ═══════════════════════════════════════════════════════════════════════
# 6 · L'AUDIT — aucun appel ne doit pointer vers une fonction supprimée
#     Retirer un élément sans retirer son appelant lève un TypeError À
#     L'ÉVALUATION DU MODULE : ce n'est pas la vue qui casse, c'est tout
#     le script. On le vérifie ici, pas dans le navigateur.
# ═══════════════════════════════════════════════════════════════════════
DISPARUS = ['tripCardHTML', 'wireTripCard', 'openTripPeek', 'closeTripPeek',
            'tripLine', 'renderObjectives', 'renderRepulsions', 'tripOpen',
            'autoGrow(add)']
orphelins = [n for n in DISPARUS if re.search(r'\b' + re.escape(n) + r'\b', src)]
if orphelins:
    sys.exit('ARRET · des appels pointent vers du code supprime : ' + ', '.join(orphelins))
print('  audit     aucun appel orphelin')

io.open(CIBLE, 'w', encoding='utf-8').write(src)
print('\n%s : %d -> %d octets' % (os.path.basename(CIBLE), avant, len(src)))
