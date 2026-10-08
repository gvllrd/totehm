# boutique/CLAUDE.md — higher.boutique : le Cloth, la méthode Stoner

## ⛔ BOUTIQUE · 08/10/2026 (bis) — ORDINATEUR : LES DÉCALAGES · WISDOM ET VISION · SANS PALETTE

Wah : « full-screen, c'est la version mobile ; sur ordinateur j'aime les
décalages, comme SPACE » ; « on oublie la palette et la fréquence » ; « garder
seulement WISDOM et VISION ». `streetwear.html` BUILD `2026-10-08-wisdom-vision`.
- **Téléphone (< 900 px) : inchangé**, une scène plein écran à la fois.
- **Ordinateur (≥ 900 px)** : le vêtement (`#s-cloth`) RESTE à l'écran ; chaque
  autre scène est une fenêtre-côté (`--pw` = clamp(360 px, 34vw, 460 px)) qui glisse
  (`translateX(±101%)` → 0, transition). ELEMENT : à GAUCHE pour WISDOM, à DROITE
  pour VISION (l'axe du temps) ; NAME · STYLE · ORDER à droite. `body[data-side]`
  décale le vêtement, la barre des étapes et la manette de ±`--pw`/2 (le
  centre de la place libre). Dès ELEMENT, la place de l'œuvre (`#vw-zone`, pointillé)
  se pose sur le vêtement ; le style la remplit, le nom s'y grave en tapant ;
  ORDER n'a pas de second aperçu (`#od-visual` caché). Les règles de côté portent
  `:not(#s-cloth):not(#s-done)` : une règle plus faible (`.is-left`) perd sinon.
- **WISDOM ← → VISION seulement** : habitudes, objectifs, répulsions restent à soi
  (un vêtement parle aux autres). `CROIX` = deux vues, `#el-map` = deux carrés,
  la manette n'a que ← ou → ; une pièce reprise d'une autre vue est oubliée.
  **Le serveur refuse le reste** : `create-checkout` v40 `KINDS = wisdom · vision`
  (422 `choose an element`). Luxury garde les cinq vues.
- **Ni palette ni fréquence à l'écran** : streetwear (matière, aperçu), Decode
  (`index.html` BUILD `2026-10-08-bis`), luxury (BUILD `2026-10-08-no-palette` :
  devis, admin, tuile, matière, le « rhythm » retiré). La palette reste dans
  l'instantané serveur (`box_snapshot`), jamais affichée.
Tests : `streetwear.mjs` 51/51, `boutique_home.mjs` 23/23, `club_luxury.mjs` 44/44.

## ⛔ BOUTIQUE · 08/10/2026 — STREETWEAR PLEIN ÉCRAN · DECODE = LA PAGE DU CLOTH · « ELEMENT »

Wah : « mode plus immersif… très minimaliste, visible et agréable… full screen,
fluidité gamifiée ». `streetwear.html` (BUILD `2026-10-08-immersive`,
`__totehm_cloth()`) = CINQ SCÈNES plein écran, une à la fois, glissées
(transition, jamais `@keyframes`) ; barre des étapes `#hud` (5 traits, un tap
revient en arrière) ; Back, la barre et le geste « retour » lisent la MÊME pile
d'historique linéaire (`HIST`, `goBackTo`).
1. **CLOTH** : le vêtement au centre (`#viewer`, `touch-action:none`) ; ← → / glissé
   horizontal / trackpad = les MODÈLES (supports actifs) ; ↑ ↓ / glissé vertical /
   molette = les VUES du même vêtement = les photos de son dossier Storage
   (`totehm-cloth-support/<storage_folder>/`, ordre des noms), sinon `image_url`.
   Points : vues en haut à droite, modèles dessous. Un bouton : **[TOTEHMIZE]**.
2. **ELEMENT** (bis : WISDOM ← → VISION seulement) : le Totehm DÉPLIÉ (papier, rail, la croix en petit `#el-map`) et LA
   MANETTE de COM (`#joy`, rayon 15 px, seuil 9 px, nomme la vue avant d'y aller,
   molette, flèches) — **seulement ici, jamais avant**. Un tap ouvre la matière
   (`my_box_matter`) ; le centre de la manette (anneau blanc) ou [Wear this
   element] la porte. Glissé horizontal sur la liste = vue voisine.
3. **NAME** : l'élément en tête ; `0.` + saisie en Quantico **Coral** ;
   `name_available` en direct (réponse tardive jetée). Ancré en haut (clavier).
4. **STYLE** : `artistic_styles` actifs, « n left » (`remaining_capacity`, 7 par
   style) ; épuisé = fermé.
5. **ORDER** : l'aperçu (place, style, nom — PAS l'œuvre ; bis : sans palette), la TAILLE (Printful ;
   une variante non `active` est fermée), « test · card 4242… » si
   `my_streetwear_test_mode()`, [Order · prix serveur] → Stripe (adresse +
   paiement sur la page sécurisée).
Connexion à [TOTEHMIZE] (PKCE, retour `/streetwear`) ; la pièce en cours vit dans
`sessionStorage` (`totehm_cloth_flow`) : retour de connexion → ELEMENT ;
`?cancel=1` → ORDER avec tous les choix ; `?paid=1&cloth=` → DONE, [Decode it] →
`/?decode=0.nom`. La page envoie le nom SANS préfixe : `create-checkout` pose `0.`.
**Le manche du 05/10 en bas de /streetwear est retiré** (la section « manette »
ci-dessous ne vaut plus que pour /luxury).

**DECODE** (`index.html`, BUILD `2026-10-08-decode`) : le résultat est LA PAGE DU
CLOTH — le nom (Quantico Coral), la ligne (n° d'exemplaire / édition, date),
**l'élément en tête, pleine largeur, à la couleur de sa vue**, ses intentions (bis :
plus de palette), la matière (propriétaire/abonné), l'œuvre, le vêtement · taille ·
style · by, l'étape (in the making · in production · shipped). Niveaux de
`reveal_cloth` inchangés ; un invité lit la vue, le vêtement, l'étape + CONNECT
WITH MY TOTEHM. **L'œuvre ne se montre qu'une fois la pièce EXPÉDIÉE**
(`cloth-art`, URL signée 1 h) : la promesse « you will not see it before it
lands » tient. L'adresse suit le Cloth (`/?decode=0.nom`, partageable) ; un nom
tapé sans `0.` se retrouve.

**« Box » est notre langage ; à l'écran on dit « element »** (Wah, 08/10) :
streetwear, Decode et luxury (BUILD `2026-10-08-element`) sont passés.
Tests : `streetwear.mjs` 45/45, `boutique_home.mjs` 22/22, `club_luxury.mjs` 43/43.

## BOUTIQUE · 06/10/2026 — nouveau support et photo différée

Wah a remplacé le précédent Champion. Support courant : `Higher Champion
Sweatshirt`, Printful `478633385`, Supabase
`c615b050-cd3e-4560-a1aa-ce943192f34e`. Valeurs existantes conservées : actif,
170 €, édition 177, claimed 0, tailles S/M/L/XL/2XL. Son dossier
`higher-champion-sweatshirt-478633385` ne contient que `.keep` : la photo
principale vient de `image_url`, récupérée par F à la resynchronisation 91.

F réessaie désormais une photo encore absente toutes les minutes, cinq
reprises maximum. Les photos personnalisées existantes restent prioritaires.
F renseigne l'URL de la photo principale Printful ; il ne copie pas une
galerie complète de mockups dans Storage. Pour des vues supplémentaires
choisies, les fichiers du dossier Storage restent le mécanisme existant.
Front inchangé (`2026-10-06-streetwear-photo`). Navigateur public : image
chargée 800 × 800, 170 €, 177 / 177 left, cinq tailles. Détails et preuves
n8n dans `backend/SYSTEM.md` §0.

## BOUTIQUE · 06/10/2026 — Streetwear : support actif et photo Printful

Le support Champion `478625396` était filtré par `active=false`, malgré son
prix déjà configuré à 170 € et son édition de 12 pièces. Il est maintenant
actif ; prix et quantité conservés. Support Supabase :
`3387332a-a258-4a7e-9391-803fe446cfa6`, tailles S · M · L · XL · 2XL.

`streetwear.html` (BUILD `2026-10-06-streetwear-photo`) conserve la priorité
des photos de `storage_folder`, puis utilise `image_url` si ce dossier est
vide ou inaccessible. F renseigne cette URL avec `thumbnail_url` Printful
seulement si aucune photo personnalisée n'est déjà définie. F reste chargé
de créer les nouveaux supports inactifs, prix et édition à zéro : une
synchronisation ne modifie pas les réglages commerciaux existants.

Vérifié : exécution F 87 en production réussie, support toujours actif à
170 € / 12 pièces ; navigateur public : titre, prix, stock et cinq tailles
visibles. Aucun paiement ni génération d'œuvre exécuté pour ce contrôle.

## BOUTIQUE · 06/10/2026 (ter) — le style du moment et le nom, Decode perforé

Wah : « pour la totehmisation Streetwear et Luxury, choisir un style artistique
du moment (la table Supabase) et le nom du Totehm Cloth : Decode utilise ce
nom, `0.{Nom}`, 0 = l'année en cours » · « [Decode a Totehm Cloth] : le survol
et la saisie en encadré box perforé bleu navy ».
- **Streetwear** (`streetwear.html`, BUILD `2026-10-06-cloth-name`) : avait
  déjà 1 · le nom (`0.` + saisie, `name_available`) et 2 · le style ; le
  style ne montre plus que les `artistic_styles` actifs ET `status='active'`.
- **Luxury** (`luxury.html`, BUILD `2026-10-06-cloth-name`) : 4 · The style
  of the moment (les mêmes cartes) · 5 · Engrave its name (`0.` affiché,
  `name_available` en direct, réponse tardive jetée). La demande part avec
  `style` (id) et `name` SANS préfixe : `luxury-quote` pose `0.` (année de
  collection, juin → mai), relit le style, refuse un nom pris (`name_taken`).
  Mes devis et la carte admin montrent le nom et le style.
- **Decode** (`index.html`, BUILD `2026-10-06-decode`) : survol / focus du
  bouton et saisie = la tuile navy perforée (`--tile-btn`, 6 px remplie,
  carrée) — exception demandée à « aucun motif perforé comme fond de
  contrôle ». Le résultat dit aussi le style ; une pièce Luxury payée se
  décode comme une Streetwear.
- Tests : `club_luxury.mjs` 43/43, `boutique_home.mjs` 10/10, `streetwear.mjs` 25/25.

## BOUTIQUE · 06/10/2026 — police un peu plus petite, boutons sur une ligne

Wah : « réduis un peu la police ; à chaque fois, les boutons sur une ligne ».
Les tailles de 12 à 18 px des cinq pages ont perdu 1 px ; le bloc
`<style data-boutique-type>` (fin de `<head>`) interdit le retour à la ligne
dans un bouton (sous 350 px, `.btn-sig` passe à 11,5 px). Mesuré : aucun
bouton sur deux lignes ni débordant à 360 et 320 px. BUILD `2026-10-06-type`.


## 05/10/2026 — connexion COM et UI commune

BUILD `2026-10-05-spaces-boxes`. Lire les règles UI de la racine.
Toutes les pages satellites, y compris les anciennes pages déplacées,
passent par COM/auth avec PKCE+state. Plus d'email OTP demandé localement ;
les ponts sso existants restent compatibles. CTA `CONNECT WITH MY TOTEHM`,
fond sombre ajusté au texte. Pas de T.svg statique d'interface. Une petite
loupe agrandit chaque Box EN PLACE (06/10, Wah), jamais une fenêtre.
Attributs absents de COM absents du miroir.
Prix, commandes, THP et droits existants inchangés.


## ⛔ IDENTITÉ MEMBRE · 03/10/2026

Noms du Totehm en Quantico Coral #fbd5ca, y compris au survol, sans point/carré d'état. Lire le vrai pseudo depuis le profil du compte, jamais fabriquer un nom avec le préfixe de l'email. Supprimer les T statiques centrés dans les espaces membres ; conserver Higher, les œuvres et le papier de marque. Quand un nom est encadré, fond noir arrondi, sans tuile perforée. Cette règle de Wah remplace les anciennes restrictions « Coral seulement Stoner/Get » pour l'identité. Protocoles de connexion/SSO, accès THP et prix inchangés. Sur les anciens menus de Get Higher, Stoner et Boutique, le callback auth reste synchrone ; lecture profil différée avec setTimeout pour éviter le verrou Supabase (getSession/RPC dans un callback async pouvait figer le nom sur Guest).

> Chargé automatiquement quand on travaille dans `boutique/`. Les règles
> transverses sont dans le `CLAUDE.md` de la racine ; l'histoire dans
> `docs/POSTMORTEMS.md`. Sections déplacées TELLES QUELLES de l'ancien
> `CLAUDE.md` le 30/09/2026, les plus récentes d'abord : un renvoi « plus
> haut » peut viser la racine ou un autre dossier. Fichiers : `index.html`, `streetwear.html`, `luxury.html`, `totehm.html`, `terms_of_sale.html`. Get Higher, Lisbon, Stoner et Origins sont sur figher.club depuis le 02/10 (`club/CLAUDE.md`).

## ⛔ 05/10/2026 (soir) — L'ACCUEIL D'AVANT · LA COLLECTION DU MOMENT · LE MODE TEST STRIPE

**Wah a refusé la manette sur l'accueil** (« on oublie le curseur ici »).
`index.html` (`BUILD 2026-10-05-landing`) = la page d'avant (base `2ca0aeb`) :
la vidéo, [Create my Totehm Streetwear Cloth], **sous lui la collection du
moment « Totehm x Champion 2026 »** (`#collab`, au format des marques : un NOM,
jamais un logo ; `#sw-col-sold` = pièces restantes de `totehm_cloth_support`),
puis le Luxe et Decode (`reveal_cloth`). **[Experience our dope branding] →
totehm.com** par le pont (`data-com`, `ssoVersDomaine`) ; plus aucun lien
figher.club sur l'accueil. Le manche reste sur `/streetwear` et `/luxury`
seulement. La section « manette » ci-dessous vaut pour ces deux pages.

**LE MODE TEST STRIPE remplace le prix d'essai.** Un compte ACTIF de
`boutique_testers` paie avec `STRIPE_TEST_SECRET_KEY` (carte 4242 4242 4242
4242), au VRAI prix : `create-checkout` et `luxury-checkout` lisent
`_boutique_test_mode()` (serveur) ; Stripe affiche « TEST · » ; la page luxe
le dit (`luxury_access().test_mode`). Le webhook vérifie aussi
`STRIPE_TEST_WEBHOOK_SECRET` et, en mode test, n'écrit que `cloth`/`luxury`
(`test = true`), sans génération n8n ni Printful, email « [TEST] ».
Clé test absente → `test_unavailable` (jamais un repli sur le live).
`price_cents` de `boutique_testers` est inerte. Allumer un testeur = sans « oui ».

## ⛔ 05/10/2026 — LA MANETTE · LE LUXE SUR DEVIS · DECODE · LE BANC D'ESSAI

**L'accueil (`index.html`, `BUILD 2026-10-05-joystick`, `__totehm_boutique()`)
est une manette, style SPACE** : HIGHER au centre (la croix des quatre portes,
la vidéo de marque au centre), ↑ STREETWEAR · → LUXURY · ↓ DECODE · ← NEWS.
Le manche est celui de COM/SPACE (rayon 15 px, seuil 9 px, flèches, molette,
clavier, glissé horizontal sur la scène) ; une direction opposée ramène au
centre ; pousser NOMME et COLORE la porte (et l'allume dans la croix) avant
d'y aller ; le CENTRE AGIT : PLAY · GO · QUOTE · DECODE · SEND. Le même
manche (copié, `#nav-*`) est en bas de `/streetwear` (centre : BOX → GO →
NAME → ORDER) et de `/luxury` (BOX → QUOTE → PAY). `/#luxury`, `/#decode`…
ouvrent la bonne porte. **Couleurs du manche : blue / navy / rep —
l'exception « joystick COM » de SPACE étendue à la boutique** ; un Cloth
décodé prête sa palette aux trois points.

**Connexion de l'accueil : PAR totehm.com** (SSO copié, `ssoLogin('/')`) ; l'ancien
email → code à 6 chiffres sur la boutique est retiré.

**La collaboration en cours, au format des marques** : « COLLABORATION IN
PROGRESS · Totehm x Champion · Limited collection » — un NOM, jamais le logo
(`assets/img/champion.jpg` n'est affiché nulle part).

**DECODE lit `reveal_cloth`** — la MÊME règle que Reveal the Box (invité : la
vue et la date ; FIGHER : la Box et ses intentions ; propriétaire/abonné : + la
matière ; pièce d'avant les Box : son message). Avant : lecture directe de
`totehm_clothes`, que la RLS réserve au propriétaire — rien ne se trouvait.

**LE LUXE SUR DEVIS** (`luxury.html`, `BUILD 2026-10-05-quote`,
`__totehm_luxury()`) : THP requis ; pièce · marque (Hermès · Louis Vuitton ·
Gucci · autre) · quelques mots · LA BOX (le Totehm en SELECT MODE, copié de
/streetwear) → `luxury-quote` (`request`, trois demandes ouvertes au plus) →
email au membre et aux administrateurs. **Wah répond sur /luxury** (section
« Quotes to answer », visible des seuls `boutique_admins`) : un prix en € +
un mot → `luxury-quote` (`price` | `decline`) → email. Le membre coche les CGV
et accepte → `luxury-checkout {quote_id}` (prix du DEVIS relu en base) →
webhook : `luxury_settle` puis `luxury_quote_paid`. `luxury_offer` = « à
partir de » (500 €).

**STREETWEAR** : le nom est vérifié par `name_available` (serveur) ; le
paiement est traité par `stripe-webhook` (cas `cloth`). Le stock et les
tailles viennent de `totehm_cloth_support` — **0 vêtement tant que n8n F ne
synchronise pas Printful** (CLAUDE_CODE.md, 05/10).

**LE BANC D'ESSAI** (remplacé le 05/10 soir par le mode test, ci-dessus) : `boutique_testers` (un prix d'essai PAR COMPTE, éteint
par défaut). Allumé, le compte paie ce prix partout (Streetwear et devis), la
page le dit (« test mode · you pay €1 »), Stripe affiche « TEST · », la pièce
et la commande portent `test = true`. L'allumer est un prix live : « oui » de
Wah. Procédure : `backend/README.md`.

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
place (`print_area`), la palette de la Box (retirée le 08/10 bis), le style choisi, le nom gravé —
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
  `luxury_access()` ; jamais écrit dans la page — **depuis le 05/10 : « à
  partir de », le prix réel est le devis** (voir plus haut) ;
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
d'une Box, de n'importe laquelle des cinq vues (08/10 bis : WISDOM ou VISION
seulement, voir en tête). Plus de message libre.

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
