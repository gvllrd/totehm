# -*- coding: utf-8 -*-
"""LE PROTOTYPE DU TOTEHM — la source du dépliage.

Ce script COMPOSE le prototype que Wah valide avant tout portage dans
`space/totehm.html`. Il n'invente aucun dessin : le T, le wordmark et les
trois tuiles perforées viennent du fichier servi, recopiés tels quels.

    python3 tools/prototype_totehm.py        # écrit totehm_unfold.html

Il vit dans le dépôt et pas dans un bac à sable : six itérations de design
y sont accumulées, et un prototype qui disparaît avec sa session est un
prototype qu'on refait de zéro.
"""
import io, json, os, re
SC  = os.path.dirname(os.path.abspath(__file__)) + '/'
OUT = SC + '../totehm_unfold.html'
logo = json.load(io.open(SC + 'prototype_logo.json', encoding='utf-8'))

# Les trois tuiles perforées : elles vivent dans le fichier servi, et les
# redessiner serait une occasion de se tromper d'un pixel sur douze cercles.
SRC = SC + '../space/totehm.html'
src = io.open(SRC, encoding='utf-8').read()
TILES = {}
for name in ['logo-navy', 'logo-blue', 'logo-rep']:
    m = re.search(r'--' + name + r':(url\("data:image/svg\+xml,.*?"\));', src)
    TILES[name] = m.group(1)

HTML = r"""<title>Totehm Unfold</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Quantico:wght@400;700&family=Space+Mono:wght@400;700&family=Jost:wght@300;400&family=Montserrat:ital,wght@1,900&display=swap">
<style>
/* ═══════════════════════════════════════════════════════════════════
   TOTEHM — LE DÉPLIAGE
   Jetons, géométrie, carrés perforés, SVG du logo : tout vient de
   `space/totehm.html`. Rien n'est redessiné.

   LA GÉOMÉTRIE, ET C'EST ELLE QUI COMMANDE
     desktop  #stage est un CARRÉ centré — min(92vh,78vw,640px) — et TOUT
              vit dedans : rail, T, habitudes, wordmark, fenêtres.
              `overflow:hidden` : rien ne déborde du Totehm.
     mobile   #stage occupe l'écran. Même code, même règles.
   La fenêtre plein écran est en `position:absolute` DANS #stage : sur
   ordinateur elle couvre le carré, sur mobile elle couvre l'écran. Une
   seule règle pour les deux — c'est le carré qui change de taille, pas
   le comportement.

   LE PAPIER EST NAVY, TOUJOURS. Ce sont les BOÎTES qui portent la
   couleur — navy, bleu, rouge-violet, les trois couleurs de la marque et
   rien d'autre. Le Totehm ne se repeint pas : il se déplie, et ce qui se
   déplie ce sont ses pièces. Une pièce a une couleur, le papier n'en
   change pas.
   Corollaire : un texte gris, un noir transparent, un « fond de vue » —
   aucun n'est une couleur de la marque, aucun ne teinte une boîte.

   LA PROFONDEUR EST UNE INFORMATION : extrudé = ça se presse (habitude,
   répulsion), à plat = ça encadre (l'objectif). Et l'extrusion est une
   FACE PLEINE décalée, jamais un flou — BRAND.md interdit l'ombre
   décorative, et une face n'est pas une ombre.
   ═══════════════════════════════════════════════════════════════════ */
:root{
  --g-light:#e0e0e0;--g-mid:#909090;--g-dark:#606060;--bg:#000;
  --navy:#333366;--rep:#743169;
  /* LES TROIS COULEURS DES BLOCS : --navy, --blue, --rep. Mesurées sur le
     Totehm empilé de totehm.com, la référence de la marque.
     --sky est la version TEXTE du bleu de l'objectif : #36498c en aplat se
     lit sur le papier navy, mais en texte sur une carte sombre il ne se lit
     pas. Un remplissage n'est jamais --sky, un texte n'est jamais --blue. */
  --blue:#36498c;--sky:#7fa3e8;
  --navy-d:#22224a;--blue-d:#243158;--rep-d:#4a1f43;
  --futura:'Jost',sans-serif;
  --rl:46px;--rw:18px;--band-t:140px;--band-b:116px;
  --skin:var(--navy);--skin-d:var(--navy-d);
  --logo-navy:__TILE_NAVY__;
  --logo-blue:__TILE_BLUE__;
  --logo-rep:__TILE_REP__;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;background:#000;color:var(--g-light);
  font-family:var(--futura);font-weight:300;font-size:14px;overflow:hidden;
  -webkit-font-smoothing:antialiased}

/* MOBILE — le Totehm EST l'écran. */
#stage{position:fixed;inset:0;background:var(--navy);overflow:hidden;
  transition:background-color .3s}
/* Pas de .z-next / .z-book : le papier ne change pas de couleur. */

#rail{position:absolute;top:30px;bottom:30px;left:var(--rl);width:var(--rw);
  background:rgba(255,255,255,.22);z-index:1}
#bigT{position:absolute;top:30px;left:50%;transform:translateX(-50%);z-index:30;line-height:0}
#bigT svg{height:53px;width:auto;display:block}

#foot{position:absolute;bottom:30px;left:50%;transform:translateX(-50%);z-index:30;
  line-height:0}
#foot svg.wm{height:50px;width:auto;display:block}
/* ══ LE LOGO DIT OÙ L'ON EST ═════════════════════════════════════════
   Le O du wordmark clignote sur les OBJECTIFS, le H sur les HABITUDES.
   C'est la lettre elle-même qui signale : le logo n'illustre pas l'écran,
   il EST l'écran. Pas de lettre pour les répulsions — TOTEHM n'en
   contient pas, et un clignotement sans lettre serait du décor. */
/* LE O RESPIRE. Pas un clignotement à deux temps — un fondu, lent, qui
   respire. Un clignotement dit « alerte » ; un fondu dit « c'est ici ».
   Et il respire DÈS QU'IL EST QUESTION D'OBJECTIF : la vue objectifs,
   bien sûr, mais aussi un Trip ouvert depuis la vue habitudes — parce
   qu'alors on est en train d'écrire un objectif, quelle que soit la vue.
   Le H fait pareil pour les habitudes, et il se tait quand le O parle :
   deux lettres qui respirent en même temps ne désignent plus rien. */
/* ══ LE LOGO EST L'INDICATEUR ════════════════════════════════════════
   Quatre pièces, quatre états. Rien n'est ajouté à l'écran : ce sont les
   pièces du logo qui parlent, et elles respirent — un fondu lent, pas un
   clignotement. Un clignotement dit « alerte » ; un fondu dit « c'est ici ».

     O du wordmark   il est question d'un OBJECTIF
     H du wordmark   on est dans les HABITUDES
     pied du T       on est dans les RÉPULSIONS — seule, la barre du bas
                     forme un MOINS, et une répulsion est ce qu'on retire
     le T entier     on touche la TIME FREQUENCY

   Une seule pièce à la fois : deux pièces qui respirent ensemble ne
   désignent plus rien. */
body.o-live  #wm-O {animation:breathe 2.8s ease-in-out infinite}
body.h-live  #wm-H {animation:breathe 2.8s ease-in-out infinite}
body.r-live  #t-foot{animation:breathe 2.8s ease-in-out infinite}
body.f-live  #ui-t {animation:breathe 1.5s ease-in-out infinite}
@keyframes breathe{0%,100%{opacity:1}50%{opacity:.18}}
@media(prefers-reduced-motion:reduce){
  #wm-O,#wm-H,#t-foot,#ui-t{animation:none!important}}

/* ══ LES TROIS COUCHES — sous le T, en ligne ══════════════════════════
   Trois carrés pleins, ROUGE-VIOLET · NAVY · BLEU CLAIR, dans cet ordre.
   Sous le T.svg : c'est le T qui ouvre le Totehm, les trois couleurs sont
   ce en quoi il se déplie. Le sélecteur est donc SOUS la chose qu'il
   déplie, pas dans un coin.
   Pas d'ombre : le carré est plein, il se sépare du papier par du noir —
   la perforation du logo, jamais un flou. */
#views{position:absolute;top:92px;left:50%;transform:translateX(-50%);
  z-index:31;display:flex;flex-direction:row;gap:11px}
/* LES TROIS COULEURS RESSORTENT — les trois, tout le temps, à pleine
   valeur. Une couleur de marque ne se met pas en veilleuse : c'est ce qui
   les rendait grises et indistinctes de leur papier.
   Ce qui marque la vue courante n'est donc PAS la couleur mais un
   contour blanc — `outline`, qui ne prend aucune place et n'est pas une
   ombre. Le filet noir, lui, est la perforation : sans lui le carré navy
   n'existe pas sur un papier navy (mesuré, les deux valent #333366). */
/* Le filet blanc n'est pas décoratif : un carré navy sur un papier navy
   n'existe pas. Il est blanc et non noir — le noir a quitté les boîtes. */
.vt{width:17px;height:17px;cursor:pointer;padding:0;
  border:1px solid rgba(255,255,255,.34);transition:outline-color .16s;
  outline:1.5px solid transparent;outline-offset:2px;
  -webkit-tap-highlight-color:transparent}
.vt:hover{outline-color:rgba(255,255,255,.45)}
.vt[aria-selected="true"]{outline-color:#fff}
.vt:focus-visible{outline-color:#fff;outline-width:2px}
.vt.r{background:var(--rep)}
.vt.h{background:var(--navy)}
.vt.o{background:var(--blue)}
/* Le nom de la vue passe DANS LA COLONNE des carrés, sous eux, tourné :
   à droite il tombait sur le rail — et le rail est le logo, on ne pose
   rien dessus. */
#vname{position:absolute;top:116px;left:50%;transform:translateX(-50%);z-index:31;
  font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.24em;
  text-transform:uppercase;color:rgba(255,255,255,.42);pointer-events:none}

/* ══ LE TOTEHM SE DÉPLIE, IL NE CLIGNOTE PAS ═════════════════════════
   Deux animations, et seulement deux :
     `swap`  la liste se fond quand on CHANGE DE VUE — c'est le dépliage.
     `grow`  la boîte s'ouvre en grandissant depuis sa hauteur de ligne.
   Elles ne se jouent QUE sur le geste qui les mérite : une animation qui
   se rejoue à chaque frappe n'est pas de la fluidité, c'est du bruit. */
#mid.swap{animation:swap .26s cubic-bezier(.22,.61,.36,1)}
@keyframes swap{from{opacity:0;transform:translateY(6px)}
                to{opacity:1;transform:none}}
.bx.open{animation:grow .24s cubic-bezier(.22,.61,.36,1)}
@keyframes grow{from{opacity:.4;transform:scaleY(.92);transform-origin:top}
                to{opacity:1;transform:none}}
/* Le doigt n'a pas de survol : il lui faut sa propre réponse. */
.bx:active{filter:brightness(1.3)}
.vt:active{outline-color:rgba(255,255,255,.8)}
.int:active{background:color-mix(in srgb,var(--ic) 55%,transparent)}
@media(prefers-reduced-motion:reduce){
  #mid.swap,.bx.open{animation:none}}

#mid{position:absolute;left:0;right:0;top:var(--band-t);bottom:var(--band-b);
  overflow-y:auto;display:flex;flex-direction:column;gap:11px;padding:6px 0;z-index:2;
  scrollbar-width:none}
#mid::-webkit-scrollbar{display:none}

/* ── LA LIGNE — géométrie exacte de totehm.html ──────────────────── */
/* `flex-shrink:0` n'est pas du zèle : #mid est une colonne flex, et un
   enfant flex se laisse COMPRIMER par défaut. Sans lui, la boîte ouverte
   (488 px de haut, mesuré) était écrasée à la hauteur d'une ligne et les
   lignes suivantes se dessinaient par-dessus. */
.habit{position:relative;display:flex;align-items:flex-start;min-height:30px;
  padding-right:18px;flex:0 0 auto}
/* SUPPRIMÉ — `.meta`, `.h-T`, `.h-freq` : le T a quitté la marge pour le
   bloc, et la fréquence se lit dans le bloc et dans sa fenêtre. Il ne
   reste au rail que son tiret : le rail est le logo, pas de l'information.
   C'est aussi ce qui fait disparaître le débordement mesuré sous 600 px,
   où la fréquence sortait de l'écran à gauche du rail. */
/* Le tiret porte l'intention de sa ligne : le rail devient le spectre
   d'une vie, lisible avant même d'avoir lu un mot. */
.habit .tick{position:absolute;left:var(--rl);width:var(--rw);height:6px;
  background:#fff;top:15px;transition:background .25s ease}
.habit .h-body{margin-left:calc(var(--rl) + var(--rw) + 16px);flex:1;min-width:0}

/* ── LA BOÎTE EST UN BLOC PLEIN, SANS OMBRE ──────────────────────────
   La référence de la marque — le Totehm empilé de totehm.com — n'a AUCUNE
   ombre : des blocs pleins posés les uns sur les autres, séparés par du
   noir. C'est le logo, et c'est tout le vocabulaire. Mesuré sur cette
   image : le papier vaut #333366, le bloc de l'objectif #36498c, la barre
   de la répulsion #743169. Trois couleurs, aucune autre.
   Le filet noir n'est pas une bordure décorative : c'est la perforation,
   la seule chose qui sépare deux pièces du même logo — et la seule qui
   rende lisible un bloc navy posé sur un papier navy. */
.bx{width:100%;text-align:left;cursor:pointer;font:inherit;color:#fff;
  padding:10px 12px 11px;border:none;background:var(--skin);
  display:block;transition:filter .15s ease}
.bx:hover{filter:brightness(1.18)}
.bx:focus-visible{outline:2px solid #fff;outline-offset:3px}
/* LE T EST DANS LE BLOC. Il a quitté la barre latérale : le signe
   appartient à la chose, pas à la marge. Une répulsion porte l'onde. */
/* ══ UNE HABITUDE EST UN ENCADRÉ NAVY ════════════════════════════════
   Le TEXTE d'une habitude vit dans un cadre navy, partout où il paraît :
   dans sa ligne, dans un Trip, dans une répulsion qui la nomme. C'est la
   pièce navy du logo, et elle se reconnaît d'un coup d'œil.
   Sur le noir du Trip le cadre reste navy et le texte reste blanc :
   #333366 sur #000 fait 2,1:1, c'est illisible — c'est le CADRE qui porte
   la couleur, jamais le texte. */
.h-frame{display:inline-block;border:1.5px solid var(--navy);
  background:rgba(51,51,102,.34);padding:2px 7px 3px;color:#fff}
.bx-name .h-frame{font-family:'Quantico',sans-serif;font-size:15px}

/* LA LIGNE D'UNITÉ — minimale, mais VISIBLE. Ce qui compte se lit à
   pleine opacité ; ce qui contextualise s'efface. Un texte gris qu'on ne
   lit pas ne vaut pas mieux qu'un texte absent. */
.u-int{font-weight:700;letter-spacing:.2em}
.u-pil{color:rgba(255,255,255,.92);letter-spacing:.2em}
.u-frq{color:#fff}
.u-dim{color:rgba(255,255,255,.55)}
.u-set{color:#fff;font-weight:700;letter-spacing:.2em}
/* La vue choisit la peau. Une seule ligne par vue — le papier ne bouge pas. */
#mid.v-h{--skin:var(--navy)}
#mid.v-o{--skin:var(--blue)}
#mid.v-r{--skin:var(--rep)}
.bx-name{display:block;font-family:'Quantico',sans-serif;font-size:15px;
  line-height:1.45;word-break:break-word}
.bx-sub{display:flex;font-family:'Space Mono',monospace;font-size:9px;
  letter-spacing:.16em;text-transform:uppercase;margin-top:7px;
  align-items:center;gap:0 11px;flex-wrap:wrap;
  font-variant-numeric:tabular-nums;line-height:1.6}
.dot{width:7px;height:7px;flex-shrink:0}
.add-box{width:100%;text-align:left;background:none;cursor:pointer;font:inherit;
  border:1px dashed rgba(255,255,255,.32);padding:9px 12px;color:rgba(255,255,255,.55);
  font-family:'Quantico',sans-serif;font-size:15px;transition:color .15s,border-color .15s}
.add-box:hover{color:#fff;border-color:#fff}
.add-box b{font-weight:400;color:#fff}
.add-row .h-T svg{animation:blink 1.5s steps(1,end) infinite}
@keyframes blink{0%,55%{opacity:1}56%,100%{opacity:.25}}
.void{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.2em;
  text-transform:uppercase;color:rgba(255,255,255,.4);padding:22px 0;text-align:center}

/* ══ LA BOÎTE OUVERTE ════════════════════════════════════════════════
   Il n'y a PAS de fenêtre. Une modale posée sur un voile noir recouvre le
   Totehm au lieu d'y vivre : la boîte grandit à sa place, sur son rail,
   dans le carré, et elle garde la couleur de sa vue. On voit toujours où
   on est.
   Tout ce qui se saisit dedans est posé sur un lavis noir : sur un bloc
   coloré, c'est le noir qui creuse un champ — jamais un gris, jamais une
   ombre. Même grammaire que les perforations. */
/* ══ DEUX FONDS, ET ILS NE DISENT PAS LA MÊME CHOSE ══════════════════
   NAVY — on ouvre quelque chose QUI EXISTE. Le Totehm est navy, on ne
   l'a pas quitté : on regarde une pièce de son propre Totehm.
   NOIR — on CRÉE un Trip. La page est blanche, elle est noire, et les
   trois couleurs de la marque y apparaissent au fur et à mesure qu'on
   remplit. Le noir est le moment de la conception, pas de la lecture. */
/* Le panneau prend le navy SOMBRE du logo : sur le navy clair, un bloc
   navy n'existe pas. C'est un jeton de la marque, pas une couleur de
   plus — et c'est ce qui permet de n'avoir AUCUN filet. */
.bx.open{display:block;cursor:default;padding:14px 13px 15px;
  background:var(--navy-d);border:none}
.bx.open:hover{filter:none}
.w-top{display:flex;align-items:flex-start;gap:10px;margin-bottom:12px}
.w-top .h-T{line-height:0;color:#fff;flex-shrink:0;margin-top:3px}
.w-top .h-T svg{height:16px;width:auto;fill:currentColor;display:block}
.w-x{margin-left:auto;background:none;border:none;color:rgba(255,255,255,.55);
  font-size:21px;line-height:1;cursor:pointer;padding:0 3px;transition:color .15s}
.w-x:hover{color:#fff}
.w-name{font-family:'Quantico',sans-serif;font-weight:700;font-size:16px;line-height:1.35;
  min-height:1.35em;   /* une mesure ratée ne fait pas disparaître le titre */
  background:none;border:none;color:#fff;width:100%;outline:none;resize:none;
  overflow:hidden;padding:0}
.w-sec{display:flex;flex-direction:column;gap:4px;margin-top:12px}
.lbl{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.22em;
  text-transform:uppercase;opacity:.58}
.in.big{font-size:16px;font-weight:700;padding:9px 10px}
.in{font-family:'Quantico',sans-serif;font-size:14px;color:#fff;
  background:rgba(0,0,0,.32);border:none;padding:7px 9px;outline:none;width:100%;transition:background .15s}
.in:focus{background:rgba(0,0,0,.5)}
.in::placeholder{color:rgba(255,255,255,.4)}
/* LE BOUTON DÉROULANT. Un <select> natif : il s'ouvre là où on est, il
   connaît le clavier et le doigt, et il ne recouvre rien. La flèche est
   dessinée en fond — pas d'image, pas de librairie. */
select.in{appearance:none;cursor:pointer;padding-right:26px;
  background-image:linear-gradient(45deg,transparent 50%,#fff 50%),
                   linear-gradient(135deg,#fff 50%,transparent 50%);
  background-position:calc(100% - 14px) 51%,calc(100% - 9px) 51%;
  background-size:5px 5px,5px 5px;background-repeat:no-repeat}
select.in{background-color:rgba(0,0,0,.3)}
select.in option{background:#1b1b2e;color:#fff}

/* Le WHY est un bloc PLEIN du bleu de l'objectif, comme dans la liste. */
.why{border:none;background:var(--blue);padding:10px 12px;
  display:flex;flex-direction:column;gap:5px;margin-top:14px}
.why .in{font-weight:700}
.due{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.16em;
  text-transform:uppercase;opacity:.78;display:flex;align-items:center;gap:8px}
.due input{background:none;border:none;color:#fff;font:inherit;outline:none;
  border-bottom:1px solid rgba(255,255,255,.28);padding:2px 0}

.ints{display:grid;grid-template-columns:repeat(auto-fit,minmax(74px,1fr));gap:7px;margin-top:6px}
/* L'INTENTION EN FONDU. Pas de filet, pas de surlignage : un lavis de sa
   propre couleur, qui s'épaissit au survol et se remplit quand elle est
   choisie. La couleur devient la surface — c'est elle qu'on voit, pas un
   cadre autour d'elle. */
.int{border:none;cursor:pointer;padding:7px 6px 8px;font:inherit;
  display:flex;flex-direction:column;align-items:center;gap:2px;
  color:var(--ic);background:color-mix(in srgb,var(--ic) 15%,transparent);
  transition:background .18s ease,color .18s ease;
  -webkit-tap-highlight-color:transparent}
.int:hover{background:color-mix(in srgb,var(--ic) 32%,transparent)}
.int.on{background:var(--ic);color:#fff}
.int.on .int-p{opacity:.85}
.int-n{font-family:'Quantico',sans-serif;font-weight:700;font-size:10px;
  letter-spacing:.14em;text-transform:uppercase}
.int-p{font-family:'Space Mono',monospace;font-size:7px;letter-spacing:.2em;opacity:.7}
.int svg{height:13px;width:auto;fill:currentColor;display:block}
.int span{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.14em;
  text-transform:uppercase;color:#fff}
.int:hover{opacity:.9}
.int[aria-pressed="true"]{opacity:1}
.int[aria-pressed="true"] span{font-weight:700}

.reps{display:flex;flex-direction:column;gap:5px;margin-top:5px}
.rep-row{display:flex;align-items:center;gap:8px;background:var(--rep);
  padding:7px 9px 8px;
  box-shadow:3px 3px 0 var(--rep-d)}
.rep-row input{flex:1;min-width:0;background:none;border:none;color:#fff;outline:none;
  font-family:'Quantico',sans-serif;font-size:12px;padding:2px 0;
  border-bottom:1px solid transparent}
.rep-row input:focus{border-bottom-color:rgba(255,255,255,.5)}
.kill{background:none;border:none;color:rgba(255,255,255,.45);cursor:pointer;font-size:15px;
  line-height:1;padding:0 3px;transition:color .15s;flex-shrink:0}
.kill:hover{color:#fff}
.dash{background:none;border:1px dashed rgba(255,255,255,.32);cursor:pointer;padding:6px 9px;
  font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.2em;text-transform:uppercase;
  color:rgba(255,255,255,.55);text-align:left;width:100%;transition:color .15s,border-color .15s}
.dash:hover{color:#fff;border-color:#fff}

.mini{display:flex;flex-direction:column;gap:5px;margin-top:5px}
/* UNE HABITUDE EST NAVY PARTOUT, y compris sur le noir du Trip. Le texte
   ne peut pas être navy sur du noir — mesuré, #333366 sur #000 ne se lit
   pas — donc c'est le BLOC qui porte le navy, et le texte reste blanc
   dessus. La couleur reste l'information, la lisibilité n'est pas
   négociable.
   Deux rangs et pas un : le nom occupe toute la largeur, le déroulant de
   fréquence vit en dessous. Sur une ligne, le déroulant écrasait le champ
   de texte jusqu'à le faire disparaître — c'est ce qui s'est passé. */
.mini-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;
  background:var(--navy);padding:7px 9px 8px;color:#fff}
.mini-row input[data-wh],.mini-row input[data-ht]{flex:1 1 100%;min-width:0;
  background:none;border:none;color:#fff;outline:none;order:1;
  font-family:'Quantico',sans-serif;font-size:13px;padding:1px 0}
.mini-row .selw{flex:0 0 auto;width:auto;order:2}
.mini-row .selb{font-family:'Space Mono',monospace;font-size:8px;
  letter-spacing:.14em;text-transform:uppercase;padding:3px 22px 3px 6px;
  background:rgba(0,0,0,.35);width:auto}
.mini-row .kill{order:3;margin-left:auto}

.acts{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}
.btn{background:none;border:1px solid #fff;color:#fff;cursor:pointer;padding:6px 13px;
  font-family:'Quantico',sans-serif;font-weight:700;font-size:12px;white-space:nowrap;
  transition:background .15s,color .15s}
.btn:hover{background:#fff;color:#000}
.btn.g{border-color:rgba(255,255,255,.3);color:rgba(255,255,255,.55)}
.btn.g:hover{background:none;border-color:#fff;color:#fff}

.ask{font-family:'Quantico',sans-serif;font-weight:700;font-size:19px;color:#fff;
  line-height:1.3;margin-bottom:12px}
/* Le O est une lettre normale, en gras. Le O du wordmark, lui, clignote
   en bas — c'est là qu'il porte du sens. */
.ask b{font-weight:700}
.step{padding-top:14px;margin-top:14px;border-top:1px solid rgba(255,255,255,.18)}
.step.off{opacity:.3;pointer-events:none}
.step-n{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.24em;
  text-transform:uppercase;opacity:.62;display:block;margin-bottom:8px}
.row{display:flex;gap:7px;align-items:flex-end;flex-wrap:wrap}
.row .w-sec{flex:1;min-width:132px;margin-top:0}
.hint{font-size:12px;color:rgba(255,255,255,.5);margin-top:7px;line-height:1.5}
.whybox{border:1.5px dashed rgba(255,255,255,.32);background:none;padding:12px 13px;
  transition:border-color .3s,background .3s}
.whybox.set{border:none;background:var(--blue)}



/* ══ UNE HABITUDE EST NAVY PARTOUT ═══════════════════════════════════
   Y compris sur le noir du Trip. Le texte lui-même ne peut pas être navy
   sur du noir — #333366 sur #000 ne se lit pas, c'est mesurable — donc
   c'est le BLOC qui porte le navy et le texte reste blanc dessus. La
   couleur reste l'information ; la lisibilité n'est pas négociable. */

/* ══ LE DÉROULANT S'OUVRE EN FENÊTRE CENTRÉE SUR MOBILE ══════════════
   Un menu natif s'ouvre en bas de l'écran, sur trois lignes, sous le
   pouce et hors du Totehm. Ici il s'ouvre AU CENTRE, dans le carré, à la
   taille de son contenu — la même fenêtre que tout le reste. */
.selw{position:relative;width:100%}
.selb{width:100%;text-align:left;background:rgba(0,0,0,.32);border:none;
  color:#fff;font-family:'Quantico',sans-serif;font-size:14px;padding:6px 26px 6px 8px;
  cursor:pointer;position:relative;-webkit-tap-highlight-color:transparent}
.selb::after{content:'';position:absolute;right:10px;top:50%;width:0;height:0;
  border:4px solid transparent;border-top-color:#fff;margin-top:-2px}
.selb:hover{background:rgba(0,0,0,.5)}
.selp{display:none}
.selp.on{display:block}
/* ORDINATEUR — il se déroule sous le champ, là où on l'a touché. */
@media(min-width:701px){
  .selp.on{position:absolute;left:0;right:0;top:calc(100% + 3px);z-index:40;
    background:#000;border:1px solid var(--skin);max-height:210px;overflow-y:auto}
}
/* MOBILE — il s'ouvre en fenêtre CENTRÉE, dans le Totehm. */
@media(max-width:700px){
  .selp.on{position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.9);
    display:flex;align-items:center;justify-content:center;padding:24px}
  .selp.on .selp-in{width:100%;max-width:320px;max-height:70dvh;overflow-y:auto;
    background:#000;border:1px solid var(--skin)}
}
.selo{display:block;width:100%;text-align:left;background:none;border:none;
  color:#fff;font-family:'Quantico',sans-serif;font-size:14px;padding:10px 12px;
  cursor:pointer;-webkit-tap-highlight-color:transparent}
.selo:hover{background:var(--skin)}
.selo.on{background:var(--skin);font-weight:700}


/* ══ LES TROIS BLOCS DU TRIP ═════════════════════════════════════════
   Ouvrir une boîte, c'est voir le Trip : l'objectif en bleu clair,
   l'habitude en navy, la répulsion en rouge-violet. Toujours les trois,
   toujours dans cet ordre, quelle que soit la vue d'où l'on vient. Le
   panneau est noir : ce sont les BLOCS qui portent la couleur, et c'est
   ce qui fait qu'on lit un Trip et pas un formulaire. */
.blk{position:relative;padding:10px 11px 11px;margin-top:8px}
.blk:first-of-type{margin-top:0}
/* LES VRAIES COULEURS, PLEINES. Une couleur de marque diluée dans du
   noir n'est plus la couleur de la marque : c'est un gris teinté. Le
   filet noir sépare les blocs — la perforation du logo, comme partout. */
/* PAS DE FILET NOIR. Les blocs se séparent par leur ÉCART, pas par un
   trait : sur un fond navy chaque couleur se détache seule, et un trait
   noir entre deux couleurs pleines ne fait qu'ajouter du bruit. */
.blk-o{border:none;background:var(--blue)}
.blk-h{border:none;background:var(--navy)}
.blk-r{border:none;background:var(--rep)}
.blk.empty{opacity:.5}
.blk-l{display:block;font-family:'Space Mono',monospace;font-size:8px;
  letter-spacing:.24em;text-transform:uppercase;color:rgba(255,255,255,.62);
  margin-bottom:5px}
.blk-t{display:block;width:100%;background:none;border:none;color:#fff;
  font-family:'Quantico',sans-serif;font-weight:700;font-size:15px;line-height:1.35;
  min-height:1.35em;outline:none;resize:none;overflow:hidden;padding:0;text-align:left}
/* Un bloc qu'on n'édite pas se TOUCHE pour y aller : le Trip se parcourt
   par ses pièces, pas par un retour à la liste. */
.blk-t.go{cursor:pointer;transition:opacity .15s}
.blk-t.go:hover{opacity:.7}
.blk-u{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:7px;
  font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.16em;
  text-transform:uppercase;color:rgba(255,255,255,.8)}
.blk-u .selw{width:auto;flex:0 0 auto}
.blk-u .selb{width:auto;padding:3px 22px 3px 7px;font-family:'Space Mono',monospace;
  font-size:8px;letter-spacing:.16em;text-transform:uppercase}
/* Un <button> garde le fond du navigateur tant qu'on ne le lui retire
   pas : c'était la pastille blanche au milieu du bloc navy. */
.blk-i{background:none;border:none;padding:0;cursor:pointer;font:inherit;
  font-weight:700;letter-spacing:.18em;text-transform:uppercase;
  -webkit-tap-highlight-color:transparent;transition:opacity .15s}
.blk-i:hover{opacity:.72}
.blk-x{position:absolute;top:6px;right:6px;background:none;border:none;
  color:rgba(255,255,255,.5);font-size:17px;line-height:1;cursor:pointer;padding:2px 5px}
.blk-x:hover{color:#fff}
.in.date{width:auto;font-size:12px;padding:3px 6px}


/* ══ LE LOOKUP D'UNE RÉPULSION ═══════════════════════════════════════
   Les habitudes qu'elle protège, en preview navy, dans son bloc. On les
   attache et on les détache d'un doigt : « la procrastination » en menace
   dix, et on doit pouvoir le dire sans écrire dix fois la même phrase. */
.lk{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px;align-items:center}
.lk-on i,.lk-o i{opacity:.6;font-style:italic}
.lk-on{background:var(--navy);color:#fff;padding:4px 8px 5px;
  font-family:'Quantico',sans-serif;font-size:11px;line-height:1.3;
  max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lk-add{background:none;border:none;color:rgba(255,255,255,.72);cursor:pointer;
  font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.2em;
  text-transform:uppercase;padding:4px 2px;transition:color .15s;
  -webkit-tap-highlight-color:transparent}
.lk-add:hover{color:#fff}
.lk-pick{display:flex;flex-direction:column;gap:4px;margin-top:8px;
  background:rgba(0,0,0,.32);padding:6px}
.lk-o{display:block;width:100%;text-align:left;background:none;border:none;
  color:rgba(255,255,255,.75);cursor:pointer;padding:7px 9px;
  font-family:'Quantico',sans-serif;font-size:12px;transition:background .15s;
  -webkit-tap-highlight-color:transparent}
.lk-o:hover{background:rgba(255,255,255,.1);color:#fff}
.lk-o.on{background:var(--navy);color:#fff}
.lk-o.on::after{content:' ✓';opacity:.7}
/* Une étape verrouillée se voit, et elle ne se touche pas. */
.grp.lock{opacity:.34;pointer-events:none}

/* ══ LE MODE IMPORTANCE ══════════════════════════════════════════════
   Trois barres décroissantes : le pictogramme dit « classer », il n'a pas
   besoin d'un mot à côté. La barre d'annonce, elle, dit ce que ça CHANGE
   — le bot suivra cet ordre. Un mode qu'on ne comprend pas est un mode
   dans lequel on entre par accident. */
#ordbtn{position:absolute;top:30px;right:14px;z-index:32;background:none;
  border:none;cursor:pointer;padding:6px;display:flex;flex-direction:column;
  gap:3px;align-items:flex-end;-webkit-tap-highlight-color:transparent;
  opacity:.45;transition:opacity .16s}
#ordbtn:hover,body.ordering #ordbtn{opacity:1}
#ordbtn span{display:block;height:2px;background:#fff}
.ob-1{width:15px}.ob-2{width:11px}.ob-3{width:7px}
body.ordering #ordbtn span{background:var(--skin-live,#fff)}
#ordbar{position:absolute;top:var(--band-t);left:0;right:0;z-index:20;
  text-align:center;padding:0 14px 9px;
  font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.2em;
  text-transform:uppercase;color:rgba(255,255,255,.72)}
#ordbar[hidden]{display:none}
body.ordering #mid{top:calc(var(--band-t) + 22px)}

/* Le rang vit SUR le rail, à la place du tiret : c'est le rail qui
   ordonne, et le chiffre y prend naturellement sa place. */
.rank{position:absolute;left:var(--rl);width:var(--rw);top:8px;
  font-family:'Space Mono',monospace;font-size:11px;font-weight:700;
  text-align:center;color:#fff;pointer-events:none}
body.ordering .habit .tick{opacity:0}
/* `touch-action:none` est OBLIGATOIRE : sans lui le navigateur avale le
   geste vertical avant nous et le classement se perd une fois sur deux. */
body.ordering .habit{touch-action:none;cursor:grab}
body.ordering .habit .h-body{pointer-events:none}
body.ordering .habit.drag{opacity:.55;cursor:grabbing}
body.ordering .habit.over .h-body{outline:2px solid #fff;outline-offset:-1px}

/* ══ DESKTOP — LE CARRÉ. Tout tient dedans. ═════════════════════════ */
@media(min-width:700px){
  :root{
    --stage:min(92vh,78vw,640px);
    --pad:calc(var(--stage) * .0616);           /* profondeur d'une perforation */
    --rl:max(38px,calc(var(--stage) * .072));   /* dégage les T des perforations */
    --rw:max(16px,calc(var(--stage) * .034));
    --band-t:132px;--band-b:110px;
  }
  #stage{inset:auto;left:50%;top:50%;transform:translate(-50%,-50%);
    width:var(--stage);height:var(--stage);
    border:var(--pad) solid transparent;
    background:var(--logo-navy) 0 0/100% 100% no-repeat border-box;
    transition:none}
  /* Une seule tuile perforée, la navy. Le papier ne change pas. */
  #bigT svg{height:46px}
  #foot svg.wm{height:42px}
}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>

<div id="stage">
  <div id="rail"></div>
  <div id="bigT">__BIGT__</div>
  <div id="mid"></div>
  <div id="views" role="tablist" aria-label="Les trois couches du Totehm">
    <button class="vt r" role="tab" data-v="repulsions" aria-selected="false" aria-label="Repulsions"></button>
    <button class="vt h" role="tab" data-v="habits"     aria-selected="true"  aria-label="Habits"></button>
    <button class="vt o" role="tab" data-v="objectives" aria-selected="false" aria-label="Objectives"></button>
  </div>
  <div id="vname">habits</div>
  <button id="ordbtn" type="button" aria-label="Order by importance">
    <span class="ob-1"></span><span class="ob-2"></span><span class="ob-3"></span>
  </button>
  <div id="ordbar" hidden>order by importance — the bot follows this order</div>
  <div id="foot">__WORDMARK__</div>
</div>

<script>
/* SUPPRIMÉ (06/09) — la bibliothèque d'habitudes. Une liste figée
   proposait les mêmes cinq habitudes à tout le monde : ce n'est pas une
   stratégie de vie, c'est un formulaire. Le jour où le générateur
   revient, ce sera un appel de modèle SUR L'OBJECTIF ÉCRIT, et il vivra
   dans le payant — pas dans le gratuit, où il créerait une facture
   mensuelle sans revenu en face. */

/* Chaque intention porte son PILIER : BODY · MENTAL · SOUL · SPIRIT. Le
   pilier n'est pas décoratif, c'est le cadre mental du produit — il dit à
   quoi une habitude sert dans une vie, pas seulement ce qu'elle est. */
const INTS=[['fight','#E24B4A','BODY'],['flow','#e48b31','BODY'],
            ['enrich','#fcbe21','MENTAL'],['love','#639922','SPIRIT'],
            ['express','#1D9E75','SOUL'],['focus','#378ADD','MENTAL'],
            ['celebrate','#7F77DD','SOUL']];
/* L'ordre des carrés, donc celui du doigt : rouge, navy, bleu clair. */
const ORDER=['repulsions','habits','objectives'];
/* Une vue ne repeint pas le papier : elle change la couleur des boîtes.
   `BOXC` est la classe portée par #mid, et c'est elle qui décide. */
const BOXC={habits:'v-h',objectives:'v-o',repulsions:'v-r'};

/* UNE SEULE SOURCE DE VÉRITÉ. Une répulsion pointe une habitude par son ID,
   jamais par son texte : renommer ne doit pas orpheliner ce qui protège. */
let SEQ=100;const uid=p=>p+(++SEQ);
let TRIPS=[{id:'t1',why:'Devenir le plus grand artiste de tous les Temps',due:'2027-06-30'},
           {id:'t2',why:'Être au top level',due:'2026-12-31'}];
let HABITS=[
  {id:'h1',t:'Faire 30 minutes d’exercice physique',f:'every day',i:'fight',o:'t2',streak:12},
  {id:'h2',t:'Dormir au moins 7 heures par nuit',f:'every night',i:'flow',o:'t2',streak:5},
  {id:'h3',t:'Faire de la méditation dans les espaces verts',f:'3× a week',i:'love',o:null,streak:2},
  {id:'h4',t:'Établir un réseau avec 5 entrepreneurs',f:'every month',i:'enrich',o:'t1',streak:1},
  {id:'h5',t:'Boire de l’eau',f:'every day',i:'flow',o:null,streak:23}];
/* `hs` — les habitudes qu'une répulsion protège. Un tableau, jamais un
   id seul : le jour où il en faut deux, un champ scalaire oblige à
   dupliquer la répulsion, et deux copies divergent toujours. */
let REPS=[{id:'r1',hs:['h1'],t:'Pas de café après 16 h'},
          {id:'r2',hs:['h1'],t:'Sac préparé la veille'},
          {id:'r3',hs:['h2','h1'],t:'Téléphone hors de la chambre'},
          {id:'r4',hs:['h4','h3'],t:'Ne jamais annuler un café déjà posé'}];

const T='<svg viewBox="0 0 68 68" aria-hidden="true"><rect x="0.9" y="0" width="66.7" height="9.6"/><rect x="29.4" y="0" width="9.6" height="66.7"/><rect x="21.2" y="62.4" width="26.1" height="5.4"/></svg>';
/* LE O EST CELUI DU WORDMARK. Extrait du TOTEHM.svg servi, pas redessiné,
   pas une webfont : c'est la lettre de la marque, en plus petit. */
const O_SVG='<svg class="oglyph" viewBox="1.156 -15.656 16.297 15.797" aria-hidden="true">'
  +'<path fill="currentColor" d="M 9.3125 0.140625 C 7.769531 0.140625 6.375 -0.203125 5.125 -0.890625 C 3.882812 -1.578125 2.910156 -2.519531 2.203125 -3.71875 C 1.503906 -4.914062 1.15625 -6.265625 1.15625 -7.765625 C 1.15625 -9.253906 1.503906 -10.597656 2.203125 -11.796875 C 2.910156 -12.992188 3.882812 -13.9375 5.125 -14.625 C 6.375 -15.3125 7.769531 -15.65625 9.3125 -15.65625 C 10.851562 -15.65625 12.238281 -15.3125 13.46875 -14.625 C 14.707031 -13.945312 15.679688 -13.003906 16.390625 -11.796875 C 17.097656 -10.597656 17.453125 -9.253906 17.453125 -7.765625 C 17.453125 -6.265625 17.097656 -4.910156 16.390625 -3.703125 C 15.679688 -2.503906 14.707031 -1.5625 13.46875 -0.875 C 12.238281 -0.195312 10.851562 0.140625 9.3125 0.140625 Z M 9.3125 -1.328125 C 10.539062 -1.328125 11.648438 -1.601562 12.640625 -2.15625 C 13.628906 -2.71875 14.40625 -3.488281 14.96875 -4.46875 C 15.53125 -5.445312 15.8125 -6.546875 15.8125 -7.765625 C 15.8125 -8.972656 15.53125 -10.066406 14.96875 -11.046875 C 14.40625 -12.035156 13.628906 -12.804688 12.640625 -13.359375 C 11.648438 -13.910156 10.539062 -14.1875 9.3125 -14.1875 C 8.082031 -14.1875 6.96875 -13.910156 5.96875 -13.359375 C 4.976562 -12.804688 4.195312 -12.035156 3.625 -11.046875 C 3.050781 -10.066406 2.765625 -8.972656 2.765625 -7.765625 C 2.765625 -6.546875 3.050781 -5.445312 3.625 -4.46875 C 4.195312 -3.488281 4.976562 -2.71875 5.96875 -2.15625 C 6.96875 -1.601562 8.082031 -1.328125 9.3125 -1.328125 Z M 9.3125 -1.328125 "/></svg>';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const due=d=>{if(!d)return 'no deadline';
  const n=Math.round((new Date(d)-new Date())/864e5);
  return n<0?Math.abs(n)+' days overdue':n<31?n+' days left':Math.round(n/30)+' months left';};
const trip=o=>TRIPS.find(t=>t.id===o)||null;
const hab=h=>HABITS.find(x=>x.id===h)||null;
const repsOf=h=>REPS.filter(r=>(r.hs||[]).includes(h));
const habsOf=r=>(r.hs||[]).map(hab).filter(Boolean);
/* Le rattachement se fait par ID, jamais par texte : renommer une
   habitude ne doit pas orpheliner ce qui la protège. */
const repToggle=(r,hid)=>{r.hs=r.hs||[];
  const i=r.hs.indexOf(hid); if(i<0)r.hs.push(hid); else r.hs.splice(i,1);};
const intOf=n=>INTS.find(x=>x[0]===n);
/* Les fréquences proposées. Une valeur déjà posée qui n'y figure pas est
   ajoutée en tête : un menu ne doit jamais effacer ce qui existe. */
const FREQS=['every day','every night','every morning','twice a day',
  '3× a week','4× a week','every week','every weekend',
  'every 2 weeks','every month','every quarter','no frequency'];
/* UN SEUL COMPOSANT DE CHOIX, partout. `key` identifie le déroulant
   ouvert ; `f` est le champ que la valeur choisie renseigne. */
let selOpen=null;
const pickHTML=(key,val,opts,ph)=>
  '<div class="selw"><button type="button" class="selb" data-sel="'+key+'">'
  +esc(val||ph||'—')+'</button>'
  +'<div class="selp'+(selOpen===key?' on':'')+'" data-selp="'+key+'"><div class="selp-in">'
  +opts.map(o=>'<button type="button" class="selo'+(o===val?' on':'')
    +'" data-selv="'+esc(o)+'" data-selk="'+key+'">'+esc(o)+'</button>').join('')
  +'</div></div></div>';
const freqSel=(v,key)=>{const list=FREQS.includes(v)||!v?FREQS:[v].concat(FREQS);
  return pickHTML(key,v||'no frequency',list);};

let view='habits',open=null;
/* `card` n'est plus une modale : c'est la BOÎTE OUVERTE, retrouvée à chaque
   rendu. Tout le câblage de `wire()` interroge `card` — il n'a pas à savoir
   que la boîte a remplacé la fenêtre. */
let card=null;
const mid=document.getElementById('mid');

/* Plus de `meta` sur la barre : le signe est DANS le bloc. Il reste le
   rail et son tiret, qui sont le logo, pas de l'information. */
/* LE TIRET DU RAIL PREND LA COULEUR DE L'INTENTION. Le rail est une
   pièce du logo, pas une décoration : qu'il porte les couleurs des
   intentions et il devient le spectre d'une vie, lisible d'un coup d'œil
   avant même de lire une ligne. Sans intention, il reste blanc — le blanc
   est l'absence, pas une huitième couleur. */
const line=(inner,cls,col,rank,id)=>'<div class="habit '+(cls||'')+'"'
  +(id?' data-row="'+id+'"':'')+'>'
  +'<div class="tick"'+(col?' style="background:'+col+'"':'')+'></div>'
  +(ordering&&rank?'<div class="rank">'+rank+'</div>':'')
  +'<div class="h-body">'+inner+'</div></div>';
/* AUCUNE ICÔNE DANS UNE BOÎTE. Une boîte porte du TEXTE. Ce qui la
   qualifie, c'est sa COULEUR (la vue) et sa LIGNE D'UNITÉ — jamais un
   pictogramme posé devant. */
const bx=(name,sub,attr,cls)=>'<div class="bx '+(cls||'')+'" '+attr+' role="button" tabindex="0">'
  +'<span class="bx-name">'+name+'</span><span class="bx-sub">'+sub+'</span></div>';

/* Une boîte ouverte n'est plus un résumé : elle porte ses champs. Elle
   reste À SA PLACE, sur le rail, dans le carré — c'est ça, « dans le
   Totehm ». Rien ne se superpose, rien ne recouvre le logo. */
const isOpen=(k,id)=>!!open&&open.kind===k&&(id===undefined||open.id===id);
const openBx=(attr,inner,cls)=>'<div class="bx open '+(cls||'')+'" '+attr+'>'+inner+'</div>';

/* `anim` dit ce qui doit s'animer POUR CE RENDU. Sans ça, l'animation
   d'ouverture se rejouait à chaque frappe : une boîte qui repousse à
   chaque lettre n'est pas fluide, elle est nerveuse. */
let lastView=null;
function render(anim){
  /* MESURÉ : le défilement dérivait de 5 px par rendu (200 → 195). Sur
     une longue liste, choisir une intention te déplaçait. On le garde et
     on le repose — sauf quand on vient d'ouvrir, où on veut bouger. */
  const keep = anim==='grow' ? null : mid.scrollTop;
  const swap = lastView!==null && lastView!==view;
  lastView=view;
  mid.className=BOXC[view]+(swap?' swap':'');
  /* Le wordmark vit hors de #mid : c'est <body> qui lui porte l'état.
     `o-live` ne suit PAS la vue mais le SUJET : un objectif s'écrit aussi
     depuis la vue habitudes, et c'est encore un objectif. */
  /* L'état du logo suit le SUJET, pas la vue : un objectif s'écrit aussi
     depuis la vue habitudes, et c'est encore un objectif. La fréquence
     passe devant tout le reste — c'est un geste, pas un endroit. */
  const oLive = view==='objectives' || (open&&(open.kind==='w'||open.kind==='t'));
  const fLive = selOpen==='hf'||selOpen==='wf'
             || (selOpen&&(selOpen.startsWith('h:')||selOpen.startsWith('wk:')));
  /* `className=` écrase TOUT : le mode classement y perdait sa classe à
     chaque rendu. Une seule expression, qui connaît tous les états. */
  document.body.className='v-'+view
    +(ordering?' ordering':'')
    +(fLive?' f-live':oLive?' o-live'
      :view==='habits'?' h-live'
      :view==='repulsions'?' r-live':'');
  document.getElementById('vname').textContent=view;
  document.querySelectorAll('.vt').forEach(b=>
    b.setAttribute('aria-selected',String(b.dataset.v===view)));
  let h='';
  if(view==='habits'){
    h=HABITS.map((x,k)=>{const tr=trip(x.o),ic=intOf(x.i),n=repsOf(x.id).length;
      if(isOpen('h',x.id))return line(openBx('data-open="1"',habHTML(x)));
      /* LA LIGNE D'UNITÉ. L'INTENTION est la chose la plus importante
         d'une habitude : elle s'écrit, dans sa couleur, suivie de son
         pilier. Elle n'apparaissait nulle part — c'était ça, « on ne voit
         pas assez ». */
      return line(bx('<span class="h-frame">'+esc(x.t)+'</span>',
        (ic?'<span class="u-int" style="color:'+ic[1]+'">'+ic[0]+'</span>'
            +'<span class="u-pil">'+ic[2]+'</span>':'<span class="u-set">set intention</span>')
        +'<span class="u-frq">'+esc(x.f||'no rhythm')+'</span>'
        +'<span class="u-dim">'+x.streak+' in a row</span>'
        +(n?'<span class="u-dim">'+n+' repulsion'+(n>1?'s':'')+'</span>':'')
        +(tr?'':'<span class="u-dim">no objective</span>'),
        'data-h="'+x.id+'"'), '', ic?ic[1]:null, k+1, x.id);}).join('');
    h+=line('<button class="add-box" data-add="1">+ <b>Add a Habit</b></button>','add-row');
  }else if(view==='objectives'){
    h=TRIPS.map((t,k)=>{const n=HABITS.filter(x=>x.o===t.id).length;
      if(isOpen('t',t.id))return line(openBx('data-open="1"',objHTML(t)));
      return line(bx(esc(t.why),'<span class="u-frq">'+esc(due(t.due))+'</span>'
        +'<span class="u-dim">'+n+' habit'+(n===1?'':'s')+'</span>',
        'data-t="'+t.id+'"'), '', null, k+1, t.id);}).join('')
      ||'<div class="void">no objective yet</div>';
    h+=line('<button class="add-box" data-add="1">+ <b>Add an Objective</b></button>','add-row');
  }else{
    h=REPS.map((r,k)=>{const x=habsOf(r)[0];
      if(isOpen('r',r.id))return line(openBx('data-open="1"',repHTML(r)));
      return line(bx(esc(r.t),'<span class="u-dim">protects</span>'
        +'<span class="h-frame u-mini">'+esc(x?x.t:'—')+'</span>',
        'data-r="'+r.id+'"'), '', x&&x.i?intOf(x.i)[1]:null, k+1, r.id);}).join('')
      ||'<div class="void">no repulsion yet</div>';
    h+=line('<button class="add-box" data-add="1">+ <b>Add a Repulsion</b></button>','add-row');
  }
  mid.innerHTML=h;
  if(keep!=null)mid.scrollTop=keep;
  /* `card` désigne la boîte ouverte : tout `wire()` l'interroge, et il n'a
     pas à savoir que la boîte a remplacé la fenêtre. */
  card=mid.querySelector('.bx.open');
  /* L'animation d'ouverture ne se joue qu'au moment de l'ouverture : sans
     ça, chaque frappe la rejouait et la boîte pulsait sous les doigts. */
  if(card&&anim!=='grow')card.style.animation='none';
  if(card){card.querySelectorAll('textarea.w-name').forEach(grow);wire();}
  mid.querySelectorAll('[data-h],[data-t],[data-r],[data-add]').forEach(el=>{
    const go=()=>{
      /* En mode classement, un appui déplace — il n'ouvre pas. */
      if(ordering)return;
      /* Le bouton crée la pièce de SA vue, vide, et ouvre le triplet
         dessus. La fenêtre qui sert à modifier est celle qui sert à
         créer : un deuxième chemin de création finirait par diverger. */
      if(el.dataset.add)nouveau(view);
      else if(el.dataset.h)openWin('h',el.dataset.h);
      else if(el.dataset.t)openWin('t',el.dataset.t);
      else openWin('r',el.dataset.r);};
    el.addEventListener('click',go);
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
  });
}

/* Ouvrir, c'est agrandir la boîte à sa place. `render()` la dessine ouverte
   et `wire()` la câble : un seul chemin, celui de la liste. */
function openWin(kind,id){open={kind,id};selOpen=null;intFor=null;lkFor=null;
  editH = kind==='h'?id:null; editR = kind==='r'?id:null;
  render('grow');
  const b=mid.querySelector('.bx.open');
  /* `start` et pas `nearest` : une boîte ouverte est plus haute que le
     cadre, on veut son DÉBUT en haut de la liste — sinon on ouvre au
     milieu d'elle-même et on ne voit pas son titre. */
  if(b){b.scrollIntoView({block:'start',behavior:'smooth'});
        const f=b.querySelector('textarea.w-name,input.in');if(f&&window.innerWidth>700)f.focus();}}
function closeWin(){open=null;selOpen=null;pickFor=null;
  intFor=null;lkFor=null;editH=null;editR=null;render();}
addEventListener('keydown',e=>{if(e.key==='Escape'&&open)closeWin();});

/* LE CHOIX D'INTENTION : le NOM et le PILIER, pas un pictogramme. Une
   intention n'est pas une icône, c'est un mot — et son pilier dit à quoi
   elle sert dans une vie. Le sélectionné se remplit de sa couleur. */
/* SUR-ENCADRÉ : un filet de la couleur, et un SECOND filet autour, de la
   même couleur. C'est ce qui fait ressortir la couleur de marque sans
   remplir la tuile — le mot reste lisible, la couleur reste dominante.
   Choisi, le cadre s'épaissit et la tuile prend un fond de sa couleur. */
const intGrid=(sel,hid)=>'<div class="ints">'+INTS.map(([n,c,pil])=>
  '<button class="int'+(sel===n?' on':'')+'" data-i="'+n+'" data-ih="'+hid+'"'
  +' aria-pressed="'+(sel===n)+'" style="--ic:'+c+'">'
  +'<span class="int-n">'+n+'</span><span class="int-p">'+pil+'</span></button>')
  .join('')+'</div>';

/* `paint()` ne peint plus une fenêtre : elle redessine la liste, donc la
   boîte ouverte avec. Un seul rendu, un seul état — c'est ce qui évite que
   la liste et le détail finissent par ne pas dire la même chose. */
function paint(){ render(); }
/* Le contenu d'une boîte ouverte, choisi par ce qu'elle est. */
function detailHTML(){
  return open.kind==='h'?habHTML(hab(open.id))
    : open.kind==='t'?objHTML(trip(open.id))
    : repHTML(REPS.find(r=>r.id===open.id));
}

/* ══ LE TRIP, VU DEPUIS N'IMPORTE QUELLE BOÎTE ═══════════════════════
   `mode` dit ce qui est modifiable : 'h' l'habitude, 't' l'objectif,
   'r' la répulsion. Les trois blocs sont TOUJOURS là, chacun dans sa
   couleur — c'est ça, « voir le Trip dans son état ». */
/* Les mots disent le LIEN, pas la catégorie : la couleur dit déjà la
   catégorie. WHY remonte, HOW descend, PROTECTS tient. */
const LBL={
  o:{h:'why', t:'objective', r:'why'},
  h:{h:'habit', t:'how',      r:'it protects'},
  r:{h:'to protect it', t:'to protect it', r:'repulsion'}};

/* ══ L'OBJECTIF ══════════════════════════════════════════════════════ */
const blkO=(t,edit,mode)=>'<div class="blk blk-o">'
  +'<span class="blk-l">'+LBL.o[mode]+'</span>'
  +(t
    ? (edit?'<textarea class="blk-t w-name" rows="1" data-tf="why">'+esc(t.why)+'</textarea>'
          :'<button class="blk-t go" data-goto="t:'+t.id+'">'+esc(t.why)+'</button>')
      +'<div class="blk-u">'+(edit
         ?'<input class="in date" type="date" data-tf="due" value="'+esc(t.due||'')+'">'
         :'<span>'+esc(due(t.due))+'</span>')+'</div>'
    : '<div class="blk-u">'+pickHTML('ho','— no objective yet —',
        ['— no objective yet —'].concat(TRIPS.map(x=>x.why)))+'</div>')
  +'</div>';

/* ══ UNE HABITUDE ════════════════════════════════════════════════════ */
const blkH=(x,edit,mode)=>'<div class="blk blk-h'+(edit?' edit':'')+'">'
  +'<span class="blk-l">'+LBL.h[mode]+'</span>'
  +(edit?'<textarea class="blk-t w-name" rows="1" data-ht="'+x.id+'">'+esc(x.t)+'</textarea>'
        :'<button class="blk-t go" data-goto="h:'+x.id+'">'+esc(x.t)+'</button>')
  +'<button class="blk-x" data-hx="'+x.id+'" aria-label="Remove">&times;</button>'
  +'<div class="blk-u">'+freqSel(x.f,'h:'+x.id)
  +'<button class="blk-i" data-ip="'+x.id+'" style="color:'
  +(x.i?intOf(x.i)[1]:'rgba(255,255,255,.62)')+'">'
  +(x.i?intOf(x.i)[0]+' · '+intOf(x.i)[2]:'set intention')+'</button></div>'
  +(intFor===x.id?'<div class="w-sec">'+intGrid(x.i,x.id)+'</div>':'')
  +'</div>';

/* ══ UNE RÉPULSION ═══════════════════════════════════════════════════
   Elle porte EN PREVIEW les habitudes qu'elle protège, en navy. C'est le
   lookup : on voit d'un coup d'œil ce que « la procrastination » menace,
   et on l'attache ou la détache d'un doigt. */
const blkR=(r,edit,mode)=>'<div class="blk blk-r'+(edit?' edit':'')+'">'
  +'<span class="blk-l">'+LBL.r[mode]+'</span>'
  +(edit?'<textarea class="blk-t w-name" rows="1" data-rt="'+r.id+'">'+esc(r.t)+'</textarea>'
        :'<button class="blk-t go" data-goto="r:'+r.id+'">'+esc(r.t)+'</button>')
  +'<button class="blk-x" data-rx="'+r.id+'" aria-label="Remove">&times;</button>'
  +'<div class="lk">'
  +  habsOf(r).map(h=>'<span class="lk-on">'
       +(h.t.trim()?esc(h.t):'<i>untitled habit</i>')+'</span>').join('')
  +  '<button class="lk-add" data-lk="'+r.id+'">'
  +  (lkFor===r.id?'done':'+ link a habit')+'</button>'
  +'</div>'
  +(lkFor===r.id?'<div class="lk-pick">'
    +HABITS.map(h=>
      '<button class="lk-o'+((r.hs||[]).includes(h.id)?' on':'')
      +'" data-lkh="'+r.id+'|'+h.id+'">'
      +(h.t.trim()?esc(h.t):'<i>untitled habit</i>')+'</button>').join('')
    +'</div>':'')
  +'</div>';

/* UN BLOC VIDE N'EST PAS UN TROU : c'est une invitation à deux temps —
   reprendre une pièce qui existe déjà, ou en écrire une nouvelle. C'est
   la règle du lookup : on ne réécrit jamais ce qui est déjà là. */
const blkVide=(key,mode,liste,ph)=>{
  const cls={o:'blk-o',h:'blk-h',r:'blk-r'}[key];
  const on=pickFor===key;
  return '<div class="blk '+cls+' vide">'
   +'<span class="blk-l">'+LBL[key][mode]+'</span>'
   +'<div class="lk">'
   +  '<button class="lk-add" data-pk="'+key+'">'+(on?'close':'+ pick or write')+'</button>'
   +'</div>'
   +(on?'<div class="lk-pick">'
      +'<input class="in nw" data-nw="'+key+'" placeholder="'+ph+'">'
      +liste.map(o=>'<button class="lk-o" data-pick="'+key+'|'+o.id+'">'
        +(o.txt.trim()?esc(o.txt):'<i>untitled</i>')+'</button>').join('')
      +'</div>':'')
   +'</div>';};

const addH=(tid)=>'<button class="dash" data-ah="'+(tid||'')+'">+ add a habit</button>';
const addR=(hid)=>'<button class="dash" data-ar="'+(hid||'')+'">+ add a repulsion</button>';

/* ══ LE PANNEAU ══════════════════════════════════════════════════════
   `mode` : 'h' habitude · 't' objectif · 'r' répulsion. La pièce de la vue
   est éditable ; les deux autres sont là — existantes et touchables, ou
   vides et offertes au lookup. */
const ORDRE={h:['h','o','r'], t:['o','h','r'], r:['r','h','o']};

function panelHTML(mode,t,hs,rs){
  const bloc={
    o: t ? blkO(t, mode==='t', mode)
         : blkVide('o',mode,TRIPS.map(x=>({id:x.id,txt:x.why})),'a new objective'),
    h: (hs.length?hs.map(x=>blkH(x, mode==='h'||x.id===editH, mode)).join('')
                 :blkVide('h',mode,HABITS.map(x=>({id:x.id,txt:x.t})),'a new habit'))
       +(mode!=='h'?addH(t?t.id:''):''),
    r: (rs.length?rs.map(r=>blkR(r, mode==='r'||r.id===editR, mode)).join('')
                 :blkVide('r',mode,REPS.map(x=>({id:x.id,txt:x.t})),'a new repulsion'))
       +(hs.length?addR(hs[0].id):'')};
  return '<div class="w-top"><div style="flex:1"></div>'
   +'<button class="w-x" data-x="1" aria-label="Close">&times;</button></div>'
  + ORDRE[mode].map(k=>bloc[k]).join('')
  + '<div class="acts">'
  +   (mode==='h'?'<button class="btn g" data-kill="'+open.id+'">Delete habit</button>':'')
  +   (mode==='t'?'<button class="btn g" data-tkill="'+open.id+'">Delete objective</button>':'')
  +   (mode==='r'?'<button class="btn g" data-rkill="'+open.id+'">Delete repulsion</button>':'')
  +   '<button class="btn" data-x="1">Done</button></div>';
}

function habHTML(x){ return panelHTML('h', trip(x.o), [x], repsOf(x.id)); }
function repHTML(r){ const hs=habsOf(r);
  return panelHTML('r', hs[0]?trip(hs[0].o):null, hs, [r]); }
function objHTML(t){ const hs=HABITS.filter(h=>h.o===t.id);
  const rs=[...new Set(hs.flatMap(h=>repsOf(h.id)))];
  return panelHTML('t', t, hs, rs); }

/* Ce qui est ouvert, et ce qui est en train d'être choisi. Trois états
   séparés : deux menus ouverts en même temps, c'est un menu de trop. */
/* Ce qui est ouvert, et ce qui est en train d'être choisi. Quatre états
   séparés, jamais deux à la fois : deux menus ouverts en même temps, c'est
   un menu de trop. `editH`/`editR` survivent au rendu — c'est le panneau
   qui se souvient de la pièce qu'on écrit. */
let intFor=null, lkFor=null, editH=null, editR=null;
/* `pickFor` : quel bloc vide est en train d'offrir son lookup. */
let pickFor=null;

/* ══ CRÉER UN TRIPLET ════════════════════════════════════════════════
   On crée la pièce de la vue, vide, et on ouvre le panneau dessus. Les
   deux autres pièces sont OFFERTES — lookup d'une existante, ou écriture
   d'une nouvelle — jamais imposées : une habitude sans objectif reste une
   habitude, et forcer les trois empêcherait d'écrire. */
/* Créer une pièce du type demandé, vide de lien : `lier` s'en charge. */
function creer(k,txt){
  const id=uid(k==='o'?'t':k);
  if(k==='o')TRIPS.unshift({id,why:txt,due:null});
  else if(k==='h')HABITS.unshift({id,t:txt,f:'every day',i:null,o:null,streak:0});
  else REPS.unshift({id,t:txt,hs:[]});
  return id;}

/* LE LIEN SE POSE DEPUIS CE QU'ON A OUVERT. C'est la seule fonction qui
   connaît les règles de rattachement, et il n'y en a qu'une :
     un objectif tient plusieurs habitudes ;
     une habitude sert UN objectif ;
     une répulsion protège plusieurs habitudes. */
function lier(k,id){
  const m=open.kind;
  if(k==='o'){ // on rattache l'habitude courante à cet objectif
    const x = m==='h'?hab(open.id) : m==='r'?habsOf(rep(open.id))[0] : null;
    if(x)x.o=id; }
  else if(k==='h'){
    if(m==='t'){const x=hab(id); if(x)x.o=open.id;}
    else if(m==='r'){const r=rep(open.id); if(r)repToggle(r,id);} }
  else { // une répulsion protège l'habitude courante
    const x = m==='h'?hab(open.id) : m==='t'?HABITS.filter(h=>h.o===open.id)[0] : null;
    const r=rep(id); if(r&&x)repToggle(r,x.id); }
}

function nouveau(v){
  if(v==='habits'){const id=uid('h');
    HABITS.unshift({id,t:'',f:'every day',i:null,o:null,streak:0});
    openWin('h',id);}
  else if(v==='objectives'){const id=uid('t');
    TRIPS.unshift({id,why:'',due:null}); openWin('t',id);}
  else{const id=uid('r'); REPS.unshift({id,t:'',hs:[]}); openWin('r',id);}
  const f=card&&card.querySelector('textarea.w-name'); if(f)f.focus();
}
/* Le mode importance. `dragId` est la pièce qu'on déplace. */
let ordering=false, dragId=null;
const rep=id=>REPS.find(r=>r.id===id)||null;

function grow(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}
function wire(){
  const on=(sel,ev,fn)=>card.querySelectorAll(sel).forEach(el=>el.addEventListener(ev,fn));
  const stop=fn=>e=>{e.stopPropagation();fn(e);};
  card.querySelectorAll('textarea.w-name').forEach(grow);

  /* ── LE DÉROULANT ────────────────────────────────────────────────── */
  on('[data-sel]','click',stop(e=>{
    const k=e.currentTarget.dataset.sel; selOpen=(selOpen===k?null:k); paint();}));
  on('[data-selv]','click',stop(e=>{
    const k=e.currentTarget.dataset.selk, v=e.currentTarget.dataset.selv;
    selOpen=null;
    if(k==='ho'){ const t=TRIPS.find(x=>x.why===v)||null;
      const x=hab(open.id); if(x)x.o=t?t.id:null; }
    else if(k.startsWith('h:')){ const x=hab(k.slice(2)); if(x)x.f=v; }
    paint();}));
  on('.selp.on','click',e=>{if(e.target===e.currentTarget){selOpen=null;paint();}});

  /* ── ÉDITER, SANS CHANGER DE VUE ─────────────────────────────────── */
  on('[data-x]','click',closeWin);
  on('[data-goto]','click',stop(e=>{
    /* On n'ouvre PAS une autre vue : on désigne la pièce à éditer DANS
       le panneau courant. Le fil de ce qu'on faisait reste intact. */
    const [k,id]=e.currentTarget.dataset.goto.split(':');
    if(k==='h')editH=id; else if(k==='r')editR=id;
    intFor=null;lkFor=null;paint();}));

  on('[data-tf]','input',e=>{
    const t = trip(open.id);
    if(!t)return;
    if(e.target.dataset.tf==='why'){t.why=e.target.value;grow(e.target);
      if(open.kind==='w')paint();}
    else{t.due=e.target.value;}});
  on('[data-ht]','input',e=>{const x=hab(e.target.dataset.ht);
    if(x){x.t=e.target.value;grow(e.target);}});
  on('[data-rt]','input',e=>{const r=rep(e.target.dataset.rt);
    if(r){r.t=e.target.value;grow(e.target);}});

  /* ── L'INTENTION, sur l'habitude qu'on touche ─────────────────────── */
  on('[data-ip]','click',stop(e=>{
    const id=e.currentTarget.dataset.ip;
    intFor=(intFor===id?null:id); lkFor=null; paint();}));
  on('[data-i]','click',stop(e=>{
    const x=hab(e.currentTarget.dataset.ih); if(!x)return;
    const v=e.currentTarget.dataset.i;
    x.i=(x.i===v?null:v); intFor=null; paint();}));

  /* ── LE LOOKUP : une répulsion protège PLUSIEURS habitudes ────────── */
  on('[data-lk]','click',stop(e=>{
    const id=e.currentTarget.dataset.lk;
    lkFor=(lkFor===id?null:id); intFor=null; paint();}));
  on('[data-lkh]','click',stop(e=>{
    const [rid,hid]=e.currentTarget.dataset.lkh.split('|');
    const r=rep(rid); if(r)repToggle(r,hid); paint();}));

  /* ── LE LOOKUP D'UN BLOC VIDE ────────────────────────────────────
     Deux temps : reprendre une pièce existante, ou en écrire une neuve.
     Le LIEN se pose tout seul dans les deux cas — c'est tout l'intérêt du
     triplet : on n'a jamais à dire « et maintenant rattache-la ». */
  on('[data-pk]','click',stop(e=>{
    const k=e.currentTarget.dataset.pk;
    pickFor=(pickFor===k?null:k); intFor=null; lkFor=null; paint();}));
  on('[data-pick]','click',stop(e=>{
    const [k,id]=e.currentTarget.dataset.pick.split('|');
    lier(k,id); pickFor=null; paint();}));
  on('[data-nw]','keydown',e=>{
    if(e.key!=='Enter')return; e.preventDefault();
    const v=e.target.value.trim(); if(!v)return;
    const k=e.target.dataset.nw, id=creer(k,v);
    lier(k,id); pickFor=null; paint();});

  /* ── AJOUTER ─────────────────────────────────────────────────────── */
  on('[data-ah]','click',stop(e=>{
    const tid=e.currentTarget.dataset.ah||null;
    const id=uid('h');
    const x={id,t:'',f:'every day',i:null,o:tid||null,streak:0};
    HABITS.unshift(x);
    editH=id; editR=null; paint();
    const el=card.querySelector('[data-ht="'+id+'"]'); if(el)el.focus();}));
  on('[data-ar]','click',stop(e=>{
    const hid=e.currentTarget.dataset.ar||null;
    const id=uid('r');
    const r={id,t:'',hs:hid?[hid]:[]};
    REPS.push(r);
    editR=id; editH=null; paint();
    const el=card.querySelector('[data-rt="'+id+'"]'); if(el)el.focus();}));

  /* ── RETIRER ─────────────────────────────────────────────────────── */
  on('[data-hx]','click',stop(e=>{
    const id=e.currentTarget.dataset.hx;
    {HABITS=HABITS.filter(h=>h.id!==id);
      /* Une répulsion qui ne protège plus rien reste : elle a été écrite,
         elle se rattache ailleurs. On retire le lien, pas la pensée. */
      REPS.forEach(r=>{r.hs=(r.hs||[]).filter(h=>h!==id);});}
    if(editH===id)editH=null;
    if(open.kind!=='w'&&open.kind==='h'&&open.id===id)closeWin(); else paint();}));
  on('[data-rx]','click',stop(e=>{
    const id=e.currentTarget.dataset.rx;
    REPS=REPS.filter(r=>r.id!==id);
    if(editR===id)editR=null;
    if(open.kind==='r'&&open.id===id)closeWin(); else paint();}));
  on('[data-kill]','click',stop(e=>{const id=e.currentTarget.dataset.kill;
    HABITS=HABITS.filter(h=>h.id!==id);
    REPS.forEach(r=>{r.hs=(r.hs||[]).filter(h=>h!==id);});closeWin();}));
  on('[data-tkill]','click',stop(e=>{const id=e.currentTarget.dataset.tkill;
    TRIPS=TRIPS.filter(t=>t.id!==id);
    HABITS.forEach(h=>{if(h.o===id)h.o=null;});closeWin();}));
}


/* ══ LE CLASSEMENT PAR IMPORTANCE ════════════════════════════════════
   Un seul chemin pour le doigt et la souris — Pointer Events. On coupe le
   natif (`touch-action:none` en CSS) parce que le geste porte une
   fonction produit : sans ça le navigateur avale le glissement vertical
   et le classement se perd une fois sur deux.
   L'ordre n'est pas cosmétique : c'est celui que le bot suivra. */
const listeDe=v=>v==='habits'?HABITS:v==='objectives'?TRIPS:REPS;
const poseListe=(v,arr)=>{if(v==='habits')HABITS=arr;
  else if(v==='objectives')TRIPS=arr; else REPS=arr;};

document.getElementById('ordbtn').addEventListener('click',()=>{
  ordering=!ordering; dragId=null;
  document.getElementById('ordbar').hidden=!ordering;
  /* On ferme ce qui est ouvert : classer et écrire sont deux gestes, et
     une boîte ouverte au milieu d'un classement n'a pas de rang. */
  if(ordering&&open){open=null;}
  render();});

(function(){
  let from=null, cible=null;
  const rowAt=(x,y)=>{const el=document.elementFromPoint(x,y);
    return el&&el.closest?el.closest('.habit[data-row]'):null;};

  mid.addEventListener('pointerdown',e=>{
    if(!ordering)return;
    const row=e.target.closest('.habit[data-row]'); if(!row)return;
    from=row; dragId=row.dataset.row; row.classList.add('drag');
    row.setPointerCapture(e.pointerId);
  });
  mid.addEventListener('pointermove',e=>{
    if(!from)return;
    const over=rowAt(e.clientX,e.clientY);
    if(cible&&cible!==over)cible.classList.remove('over');
    if(over&&over!==from){over.classList.add('over');cible=over;}
  });
  const fin=()=>{
    if(!from)return;
    from.classList.remove('drag');
    if(cible){
      cible.classList.remove('over');
      const arr=listeDe(view).slice();
      const a=arr.findIndex(o=>o.id===from.dataset.row);
      const b=arr.findIndex(o=>o.id===cible.dataset.row);
      if(a>=0&&b>=0){const [m]=arr.splice(a,1);arr.splice(b,0,m);poseListe(view,arr);}
    }
    from=null;cible=null;dragId=null;render();
  };
  mid.addEventListener('pointerup',fin);
  mid.addEventListener('pointercancel',fin);
})();

document.querySelectorAll('.vt').forEach(b=>b.addEventListener('click',()=>{
  view=b.dataset.v;render();}));

/* ══ LE BALAYAGE — MÊME PAGE, MÊMES DONNÉES ═══════════════════════════
   On ne change pas de fichier : seules les BOÎTES changent. L'ordre est
   celui des carrés — rouge, navy, bleu clair — et le doigt le suit :
   glisser vers la gauche avance dans la rangée.
   Le seuil vertical n'est pas du zèle : #mid défile, et sans lui un
   défilement un peu oblique changeait de vue en pleine lecture. */
(function(){
  let x0=0,y0=0,live=false;
  const TH=46;
  addEventListener('touchstart',e=>{
    if(win.classList.contains('show')){live=false;return;}
    const t=e.touches[0];x0=t.clientX;y0=t.clientY;live=true;
  },{passive:true});
  addEventListener('touchend',e=>{
    if(!live)return;live=false;
    const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;
    if(Math.abs(dx)<TH||Math.abs(dx)<Math.abs(dy)*1.4)return;
    const i=ORDER.indexOf(view)+(dx<0?1:-1);
    if(i<0||i>=ORDER.length)return;
    view=ORDER[i];render();
  },{passive:true});
})();
/* Le carré actif se marque dans `render()` : une seule fonction décide de
   l'état de l'écran, sinon la sélection et la liste finissent par ne pas
   dire la même chose. */
render();
</script>
"""

def nameT(t):
    """Nomme les trois pieces du T : barre haute, fut, PIED.

    Le pied est la barre du bas — celle qui, seule, forme un MOINS. C'est
    elle qui clignote sur les repulsions : une repulsion, c'est ce qu'on
    retire. Les trois groupes se reperent par leurs clip-path, dans
    l'ordre du fichier source."""
    order = ['t-bar', 't-stem', 't-foot']
    keys  = ['tut_ad60c268aa', 'tut_d380122ed3', 'tut_1e85f52e0e']
    out = t
    for gid, key in zip(order, keys):
        needle = '<g clip-path="url(#' + key + ')">'
        if needle not in out:
            raise SystemExit('piece du T introuvable : ' + key)
        out = out.replace(needle, '<g id="' + gid + '" clip-path="url(#' + key + ')">', 1)
    return out

def nameOH(wm):
    """Nomme le O (groupe 2) et le H (groupe 7) du wordmark.

    Les indices viennent des `translate` du SVG servi : TOT est a y=137
    (T 87.4 · O 104.7 · T 127.8) et EHM a y=30 (E 0.8 · H 26.2 · M 55.8),
    avec des groupes vides intercales. On ne redessine rien, on nomme."""
    gs = list(re.finditer(r'<g transform="translate\(([\d.]+), ([\d.]+)\)">', wm))
    out, delta = wm, 0
    for idx, gid in ((2, 'wm-O'), (7, 'wm-H')):
        a = gs[idx].start() + delta
        ins = '<g id="' + gid + '" transform='
        out = out[:a] + ins + out[a + len('<g transform='):]
        delta += len(ins) - len('<g transform=')
    return out

HTML = (HTML.replace('__BIGT__', nameT(logo['bigT']))
            .replace('__WORDMARK__', nameOH(logo['wordmark'].replace('<svg id="ui-wm"', '<svg class="wm" id="ui-wm"')))
            .replace('__TILE_NAVY__', TILES['logo-navy'])
            .replace('__TILE_BLUE__', TILES['logo-blue'])
            .replace('__TILE_REP__',  TILES['logo-rep']))
io.open(OUT, 'w', encoding='utf-8').write(HTML)
print('écrit :', len(HTML), 'octets')
