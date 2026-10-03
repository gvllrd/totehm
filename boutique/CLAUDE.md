# boutique/CLAUDE.md — higher.boutique : le Cloth, la méthode Stoner

## ⛔ IDENTITÉ MEMBRE · 03/10/2026

Noms du Totehm en Quantico Coral #fbd5ca, y compris au survol, sans point/carré d'état. Lire le vrai pseudo depuis le profil du compte, jamais fabriquer un nom avec le préfixe de l'email. Supprimer les T statiques centrés dans les espaces membres ; conserver Higher, les œuvres et le papier de marque. Quand un nom est encadré, fond noir arrondi, sans tuile perforée. Cette règle de Wah remplace les anciennes restrictions « Coral seulement Stoner/Get » pour l'identité. Protocoles de connexion/SSO, accès THP et prix inchangés. Sur les anciens menus de Get Higher, Stoner et Boutique, le callback auth reste synchrone ; lecture profil différée avec setTimeout pour éviter le verrou Supabase (getSession/RPC dans un callback async pouvait figer le nom sur Guest).

> Chargé automatiquement quand on travaille dans `boutique/`. Les règles
> transverses sont dans le `CLAUDE.md` de la racine ; l'histoire dans
> `docs/POSTMORTEMS.md`. Sections déplacées TELLES QUELLES de l'ancien
> `CLAUDE.md` le 30/09/2026, les plus récentes d'abord : un renvoi « plus
> haut » peut viser la racine ou un autre dossier. Fichiers : `index.html`, `streetwear.html`, `luxury.html`, `totehm.html`, `terms_of_sale.html`. Get Higher, Lisbon, Stoner et Origins sont sur figher.club depuis le 02/10 (`club/CLAUDE.md`).

## ⛔ 02/10/2026 (soir) — CENTRÉ, MINIMALISTE, VISIBLE · L'APERÇU N'EST PAS L'ŒUVRE

**`streetwear.html` (`BUILD 2026-10-02`) et `luxury.html` (`BUILD
2026-10-02-centered`) : une colonne centrée** (max 520 px), un titre Space
Mono Bold, les étapes dites en haut (`#flow` : BOX → CLOTH → MATERIALIZE),
UN appel à l'action (celui du vêtement ; `#pick-btn` seulement si la
collection est vide). Flèches et contrôles gris `border-radius:10px` : la
tuile perforée n'habille plus aucun contrôle. MATERIALIZE = une page : le
nom tout de suite, puis le style, puis les tailles du vêtement
(`printful_variant_map`, jamais inventées) ; « Order · 77 € ».

**⚠️ L'APERÇU N'EST PAS L'ŒUVRE.** L'œuvre naît après le paiement (n8n B :
gpt-image-1 ×7, Wah choisit sur Telegram) et reste une surprise jusqu'au
déballage. L'aperçu (`drawAura`, canvas) montre ce qui est DÉJÀ décidé : la
place (`print_area`), la palette de la Box, le style choisi, le nom gravé —
graine = Box + nom, zéro appel. **Un aperçu IA avant achat est refusé** :
~0,06 $ l'image à chaque visiteur, et il trahirait la surprise.

**Luxe** : prix serveur affiché d'emblée (`#price`, `luxury_access`), quatre
pièces dessinées (traits, aucun logo), le chemin en trois temps (lancer →
on vous écrit : la Box, l'envoi → la pièce revient totehmisée).

## ⛔ ÉTAT AU 02/10/2026 — LA TOTEHMISATION : STREETWEAR ET LUXE

**Wah, 02/10 : higher.boutique = la totehmisation Streetwear et Luxe.** Get
Higher / Make the Lisbon Streets Higher / la méthode / Origins sont partis
sur figher.club ; `vercel.json` redirige (308) chaque ancien chemin et
`/assets/signs/*`. Sous la vidéo `same_but_opposite.mp4`, [Get Higher] et
Origins mènent à figher.club par le pont (`data-club`, cible `club`).

**LE LUXE** (`luxury.html`, `BUILD 2026-10-02-centered`, `__totehm_luxury()`) :
- réservé aux propriétaires d'un TotehmPaper — vérifié par
  `luxury-checkout` (`_art_owns_thp`), la page ne fait que le dire ;
- le prix vient de `luxury_offer` (slug `launch`, 500 € le 02/10), lu par
  `luxury_access()` ; jamais écrit dans la page ;
- le membre choisit sa pièce (bag · jacket · shoes · other), une note
  (280 car.), coche les CGV → Stripe (`metadata.product = 'luxury'`) →
  le webhook écrit `luxury_orders` (`luxury_settle`) et confirme par email ;
- Wah reçoit la notification de paiement de Stripe ; la suite (pièce, Box,
  envoi) se fait par email avec le membre.

**LES MARQUES : des NOMS, jamais des logos** (Hermès · Louis Vuitton ·
Gucci) + « Independent. Not affiliated with these brands. » Les fichiers
`hermes.jpg`, `louis_vuitton.jpg`, `gucci.jpg` sont supprimés : un logo
laisse croire à un partenariat.

## 01/10/2026 — Space Mono et Quantico, contrôles gris

Bebas Neue et Jost/Futura sont retirés des onze pages (imports et CSS) : la
méthode Stoner, les titres et les sous-titres passent en Space Mono (Bold
capitales pour un titre, tailles ×0,66). `.btn-sig`, `.line-input`, `.sz`,
`.btn-coral` et `.name-box` n'ont plus la tuile perforée navy (réservée au
NOM d'un Totehm) : gris, `border-radius:10px`. La carte d'`origins` n'a plus
de dos blanc. Exceptions gardées : `.fs-perf` (la texture plein écran de
« Experience our dope branding ») et les cartes `.hard` des conditions
(perforation blanche, pas navy). Les « Simple terms of SALE » (CGV) restent
au moment de l'achat ; les conditions d'utilisation sont la dernière entrée
du menu membre (`#member`).

## ⛔ ÉTAT AU 30/09/2026

**⚠️ LA BOUTIQUE MONTRE, FIGHER VEND.** « Acquire » (origins,
play_lisbon_street — sur figher.club depuis le 02/10) ouvre l'œuvre sur
`/market?art=<slug>`, même origine. Le THP s'achète encore depuis la méthode (higher-checkout) ; le
retour de Stripe dépend de l'origine (`origineDe`).

**Pick up the box** (`boutique/streetwear.html`) : MY TOTEHM → HABIT
BOXES → une Box → le vêtement → nom · style · taille → commande. Un
vêtement touché avant d'avoir une Box attend et devient le support.


### ⛔ STONER — LE LECTEUR À DEUX VOIES, UNE COUTURE INVISIBLE — 29/09/2026

**Le constat de Wah** (`boutique/stoner.html`, `BUILD='2026-09-29'`) : chaque
tap sur Higher (`#btn-slogan`) faisait « sauter » la page et passer un écran
noir. **Mesuré avant de toucher au code** (réseau simulé à 400 ms) :
`#technique` absent ~415 ms, Higher décalé de ~400 px, le bas de page de
~80 px, aucun préchargement (chaque tap repartait de zéro sur le réseau),
1 à 2 images vides à l'échange de source. **Après : 0 px, 0 image
absente, ~90 ms du tap à la nouvelle image.**

**⚠️ `display:none` EFFONDRE LA PAGE.** `#step0-intro`, `#step0-ui` et
`#technique` occupent LA MÊME cellule de grille (`#below`) : la hauteur est
celle du plus grand, elle ne change jamais. On les montre par
`opacity`/`visibility`, jamais par `display`. Même règle que « une
`@keyframes` rejoue, une `transition` non » : un état se dit par une
propriété qui se transitionne, pas par la présence dans le flux.

**⚠️ HIGHER NE BOUGE PLUS D'UN PIXEL.** Le texte des dix steps n'a pas la
même longueur ; `reserveHeights()` mesure hors-champ le PLUS LONG (les deux
modes) et réserve cette hauteur dans `.tech-head` ; « Neurological reasons »
s'accroche au bas de la réserve, collé à Higher. On peut retaper au même
endroit. Un seul constructeur (`fillHead`) sert l'affichage ET la mesure :
deux constructeurs finiraient par mesurer un texte qu'on n'affiche pas.
Coût assumé : sur un step court, un vide entre le texte et les contrôles.

**⚠️ DEUX <video>, PAS UN.** `#vid` et `#vid2` sont superposés dans la boîte
3D ; `vid` est toujours celui qu'on VOIT (`.on`). Le suivant est téléchargé
en mémoire (blob) et DÉCODÉ dans la voie cachée, en pause sur sa première
image (`stage()`). Le tap n'est plus « charger » : c'est `commit()`, qui
inverse deux calques en une frame. Tant que la voie cachée n'est pas
prête, l'ancien step reste à l'écran, intact ; Higher respire (`.busy`)
après 220 ms. **Opacité, jamais `display:none`** : un <video> masqué par
`display` n'est plus décodé, la première image ne serait pas prête.

**⚠️ UN RACCORD NE CLIGNOTE PAS.** Deux calques qui s'éteignent et
s'allument ensemble passent par 50 % + 50 % : un creux sombre. La voie
sortante reste OPAQUE dessous (`.under`) pendant que la nouvelle apparaît.
Et `currentStep` ne change qu'à l'échange : l'état dit ce qu'on VOIT.

**⚠️ UN GESTE À LA FOIS.** `busy` avale un tap pendant l'échange (~230 ms) :
sans lui, un double-clic sautait un step. On ne met PAS le tap en file —
une file transformerait le double-clic en deux steps.

**⚠️ ON NE PRÉCHARGE QUE LE STEP SUIVANT.** Chaque octet vient du stockage
Supabase (egress payant). Le suivant n'est demandé qu'une fois le courant à
l'écran ; au step 0, celui du dernier mode déclaré (`totehm_entry_mode`),
pas les deux. Mauvais pronostic = une vidéo de trop, une seule fois.
Mesuré : chaque step n'est téléchargé qu'UNE fois.

**⚠️ LES URLs SIGNÉES VIVENT 15 MINUTES** (`stoner-gate`, `TTL_SECONDS =
900`, toutes signées d'un coup au chargement). L'ancien code ne vérifiait
jamais `resp.ok` : passé ce délai, le « blob » était la page d'erreur JSON
et la vidéo restait morte, sans un mot. Maintenant : `resp.ok` est vérifié,
une 400 déclenche `resign()` puis un seul nouvel essai, et les URLs sont
renouvelées AVANT d'expirer (`SIGNED_AT`, `expires_in − 60 s`).
**`resign()` ne touche jamais à `ACCESS`** : un réseau qui tousse au milieu
de l'expérience ne renvoie pas un membre payant au mur.

**Intacts, vérifiés :** SSO (`ssoArrivee`, module bloquant), boîte 3D
(rotation idle + glisser), pause/lecture au tap sur la vidéo (sur la voie
visible), le mur (`showGate`), le mode « mouvement réduit » (aucun fondu,
même comportement). **Diagnostic** : `window.__totehm_stoner()` → build,
step, busy, voie visible, étape de chaque voie, step préparé, steps en
cache, âge des URLs signées, hauteur réservée — des booléens et des
compteurs, jamais une URL.

### ⛔ HIGHER.BOUTIQUE — N'IMPORTE QUELLE BOX — 23/09/2026

**MASTER §49-57.** `boutique/streetwear.html` : la totehmisation part
d'une Box, de n'importe laquelle des cinq vues. Plus de message libre.

**⚠️ LA MATIÈRE SE CALCULE CÔTÉ SERVEUR, UNE FOIS.** `_box_matter(user,
kind, ref)` rend la Box, ses intentions, ce qui lui est relié dans les
cinq vues, et la **palette** (les couleurs des intentions — le client ne
choisit pas les couleurs). La page la lit pour l'aperçu
(`my_box_matter`), `create-checkout` la relit pour l'instantané
(`totehm_clothes.box_snapshot`). **Ce que le membre voit est exactement
ce qui part à l'atelier.**

**⚠️ `message` RESTE REMPLI** — avec le texte de la Box d'ancrage. C'est
ce que lit la chaîne n8n. On ne casse pas l'usine pour changer la
matière première.

**Le style est curaté** (`artistic_styles`, actif) ; aucune sélection
manuelle d'intention (MASTER §30, §97).

**REVEAL THE BOX vit dans la console du Club** (`#reveal`, MASTER §55) —
pas une galerie : on ne rend jamais le visuel, on rend la donnée derrière,
selon qui cherche (invité → la vue et la date ; membre FIGHER → la Box et
ses intentions ; propriétaire ou abonné → + la matière). **Et
`decode_cloth` ne rend plus la matière d'une pièce née d'une Box** : ce
serait contourner Reveal par la porte de derrière. Les pièces d'avant
gardent leur Decode public — on ne retire pas ce qui a été promis.

### totehm.com — boîte en verre et panneau de rues

#### Système `.vbox-scene` — boîte en verre 3D (28/08/2026)

Partagé entre `discover_lisbon.html` et `get_higher.html`. Tailles différentes via
des propriétés CSS sur le conteneur.

```css
/* Variables — à poser sur .vbox-scene ou un ancêtre */
--vbs   /* taille face (carré)          */
--vbd   /* profondeur de la boîte       */
--vbhd  /* --vbd / 2 — maintenir cohérent si --vbd change */

/* Math des faces latérales — ne pas modifier */
.vb-right { transform: translateX(calc(var(--vbs) - var(--vbhd))) rotateY(-90deg); }
.vb-left  { transform: translateX(calc(-1 * var(--vbhd))) rotateY(90deg); }
.vb-top   { transform: translateY(calc(-1 * var(--vbhd))) rotateX(90deg); }
.vb-bot   { transform: translateY(calc(var(--vbs) - var(--vbhd))) rotateX(-90deg); }
```

**Structure HTML identique dans les deux fichiers :**
```html
<div class="vbox-scene" id="vidWrap">
  <div class="vbox" id="vidBox">
    <div class="vbf vb-back"></div>
    <div class="vbf vb-inner"><video id="vid" playsinline preload="none"></video></div>
    <div class="vbside vb-right"></div><div class="vbside vb-left"></div>
    <div class="vbside vb-top"></div><div class="vbside vb-bot"></div>
    <div class="vbf vb-front"></div>
  </div>
</div>
```

**Cycle de vie JS — règle absolue :** `startVidBox()` démarre la boucle RAF (idle +
drag Pointer/Touch Events). `stopVidBox()` annule le RAF et retire tous les écouteurs.
Les handlers sont des **fonctions nommées** (`_vbMM`, `_vbML`, `_vbMD`, `_vbWM`,
`_vbMU`, `_vbTS`, `_vbTM`, `_vbTE`) — jamais des arrow functions, sinon
`removeEventListener` ne retire rien.

| Fichier | `--vbs` | `--vbd` | `--vbhd` |
|---|---|---|---|
| `discover_lisbon.html` | `min(50vmin,260px)` | `36px` | `18px` |
| `get_higher.html` | `min(72vmin,300px)` | `40px` | `20px` |

#### Panneau de rues — `get_higher.html`

22 panneaux de signalisation lisboètes, `const SIGNS = { sign_id: [x%, y%, size] }`.
Bouton **"Play the street ↓"** dans le paywall (après btn-buy et lien CGV).

Clic → overlay `#world` (grille `.sign`) → clic sur signe → overlay `#xp` (vidéo
dans la boîte en verre 3D rotative). Vidéos depuis le bucket public Supabase
`play-signals/{sign_id}.mp4`.

Le bloc JS du panneau est en `{}` (block scope ES module) — les vars du panneau ne
polluent pas le module, mais `sb`, `toStripe` et `goToSlide` restent accessibles
depuis l'extérieur.
