# club/CLAUDE.md — figher.club : radar et cinq vues restaurés

## 17/10/2026 — restauration demandée par Wah : avant la refonte du 15/10

L’interface publique `club/index.html` reprend EXACTEMENT le blob
`127c0cfaf7455aac78a02efbc5376b25f85d7f78` du commit
`b4ae3f066971ced6dfb4616a996bce7930737062`, parent de la refonte
`51081a2642c45e9db91f75d1ed9ba04384f09ab7`.
BUILD historique conservé : `2026-10-13-club-who`.

Cinq vues restaurées : centre radar, haut annonce/plan, droite agenda,
bas caméra, gauche passés. Papier, boussole, joystick, gestes, panneaux desktop,
Habit Boxes et parcours de création retrouvent ce code, sans nouvelle refonte.
Cette demande remplace la consultation publique trois périodes × RADAR/SHORTS
pour l’accueil uniquement ; les sections du 15/10 ci-dessous sont historiques.

`create.html` reste en place pour le moteur embarqué de COM. `vercel.json`,
`art-bridge.html`, médias, assets et les ponts artistiques vers SPACE restent
actuels. COM, SPACE et BOUTIQUE ne sont pas restaurés à une ancienne version.
Aucune migration, donnée, règle d’accès serveur ou configuration de paiement
n’est annulée. Les neuf RPC appelées par l’index existent toujours en production.


## 15/10/2026 — passé / maintenant / futur × RADAR / SHORTS (publiés en production)

Trois périodes horizontales : `past` rouge-violet #743169, `now` navy #333366, `future` bleu clair #36498c.
Le mode (`radar` ou `shorts`) est indépendant du temps. SHORTS reprend le lecteur **central** de l'ancien SPACE
et son système de filtres, pas l'ancienne vue de gauche. Les Habit Boxes gardent leurs couleurs et attributs.

Un seul `club_spots` alimente les deux modes, avec les mêmes filtres serveur : Habit, intentions, piliers/Mood,
rythmes, objectifs, répulsions, type et monde/près de moi. Une Habit se choisit en touchant le TOTEHM ; ses critères
se reprennent puis se règlent séparément. Pagination ancrée sur `as_of`, filtres avant pagination, réponses tardives
écartées, contexte conservé entre modes et périodes. Les limites horaires réelles font changer l'état du spot.

Le radar ne trace que les points exacts autorisés. Un spot sans point ou sans média reste dans les résultats,
SHORTS et sa fiche ; jamais de fausse position calculée depuis une ville. Les médias sont signés selon les droits,
le lecteur hors écran est arrêté, les préférences de réduction d'animations sont respectées.

Le Club public ne publie plus : les anciens `?v=plan|cam` et les actions de création passent à COM `/spot`,
Habit et paramètres conservés. `create.html` conserve le moteur pour `/x/club` sur COM ; l'accès direct standalone
revient au parcours COM. Le contrat XO reste identique pour ne pas chevaucher le travail COM parallèle.

Adhésion gratuite = cinq vues non vides, côté serveur. Un abonnement créateur donne accès aux spots autorisés
sans condition Club supplémentaire. Propriété THP et droits artistiques historiques restent séparés.
Les anciens liens artistiques Club passent par `art-bridge.html` avant SPACE pour préserver le SSO.

Tests actuels : `tests/browser/club_temporal.mjs`, `tests/browser/com_spot.mjs`, `tests/browser/com_plateforme.mjs`
et `tests/sql/club_gallery_local.py`. Détails et mise en service : `../docs/GALLERY_CLUB_20261015.md`.
Les sections suivantes sont historiques ; les anciennes cinq vues publiques ne décrivent plus l'entrée actuelle.

## 13/10/2026 — le coin membre = CONNECT WITH MY TOTEHM seul (lot B)

BUILD `2026-10-13-club-who`. Même coin que SPACE : `#who` = CONNECT WITH MY TOTEHM (+ « Simple terms of use » en tout petit
dessous) ; connecté, le nom seul → totehm.com. Menu et feuille My spots retirés (balisage et câblage) ; DELETE reste dans
la fiche d'un de mes spots ; mes spots vivent aussi dans COM (← MON MONDE). Tests : `spaces_loupe` §4, `club_ui`.

## 13/10/2026 — quatre niveaux (lot A)

BUILD `2026-10-13-club-aud`. Plan et caméra : QUI voit (PRIVATE · FIGHER CLUB · MY SUBSCRIBERS · PUBLIC, défaut
FIGHER CLUB, `PLAN.aud` / `REC.aud`, `[data-paud]` / `[data-aud]`) puis QUOI (ON « the exact point » / OFF « the city
only »). Écrivains : `spot_schedule_audience`, `spot_create_audience` (plus de `p_visibility`). Le radar et l'agenda
ne listent que public + FIGHER CLUB aux membres ; le point exact : `_point_ok`. Chaque spot dit son niveau
(`sd-aud`) ; SHARE = un spot PUBLIC seul. Les spots réservés aux FIGHER CLUB = le lot C (adhésion).

## 12/10/2026 (bis) — pur radar ; dans totehm.com

BUILD `2026-10-12-club-plateforme`. Centre : [Higher] SPOTS + le radar, sans phrase. Même bloc « DANS TOTEHM.COM »
que SPACE (copié) : en cadre, `boot()` ne demande NI la position NI les spots (`DORT`, aucune image du radar) et dit
`ready` ; la première commande : `prendre(p)` (Habit/ville d'un plan, filtre de l'agenda) puis `charger()` (position,
spots, radar, minuterie 30 s) puis `suivre(p)`. `sleep` : retour au radar, plan vidé (Habit, ville, vidéo), radar
arrêté, vidéos de l'agenda coupées. Noms sur le navy. Test : `com_plateforme` §2 (spot sur place, + a spot sur la Habit).

## 12/10/2026 — la box telle quelle dans le plan et la caméra

BUILD `2026-10-12-club-box`. Même bloc que SPACE (copié) : `contextHTML`/`habitInner`/`boxNew`/`boxOptionsClick`/
`publishBoxOptions`. Plan (`PLAN`) et caméra (`REC`) : la Habit Box choisie arrive entière, chaque mini-box et le
rythme s'éteignent d'un tap sans quitter la box (le clic d'un élément passe avant `data-plan-reh`) ; puis le format
du Club (Location, Together, When, Where, durée, un mot, média). Après `spot_schedule` / `spot_create` :
`spot_box_set`. Tests : `club_map` 42, `club_publish` 33.

## 11/10/2026 (bis) — le prolongement de SPACE : un space devient un spot

BUILD `2026-10-11-club-from-space`.
- **Reçoit SPOT de SPACE** : `?v=plan&habit=&city=` → le plan s'ouvre (même sans session : CONNECT garde Habit et
  ville dans le `return`), `PRE.habit` choisit MA Habit du même nom (`fold`, casse ignorée), `PRE.city` pose la
  ville quand `cities.json` arrive. `?v=list&habit=` → l'agenda de cette Habit (`S.q`, `space_discover('list')`) ;
  vide → « no spot for this Habit yet » + PLAN ONE (le plan, Habit pré-choisie si je l'ai). `?v=past` aussi.
- **Centre au format de COM et SPACE** : `#club-title` = [Higher] SPOTS + « meet in reality the people who live your
  habits » (radar seulement ; le radar se place dessous, `radarSize` lit le bas de `#heading`). Indice du papier :
  « tap to pick a Habit » (il ouvre le choix de Habit, il ne planifie pas).
- Tests : `club_from_space` 9/9 (nouveau), `club_ui` 27, `club_map` 42 (le radar latéral se mesure à côté du panneau,
  plus « plus petit que le centre » : le centre lui a laissé la place du titre), `club_publish` 33, `club_luxury` 48.

## 09/10/2026 (soir) — le club parle de spots, la vue « passés » propre

BUILD `2026-10-09-club-spots`. Le lot ChatGPT avait copié SPACE sans l'adapter : tous les textes visibles
disaient « space » (indice, caméra, plan, agenda, My spots, joystick, `.ics`) → « spot ». Caméra : « I am here —
start a spot from my TOTEHM ». « What is a spot? » porte les règles de la rencontre (lieu, ensemble, SOCIAL/SILENT),
retirées de « What is a space? ». Vue « passés » au téléphone : boussole et zoom cachés (`body.v-past #radar-tools`,
les règles `v-feed` avaient disparu au lieu d'être renommées). Dates des passés et de My spots : `dayOf` + `hhmm`.
Test `club_ui` : aucun mot « space » visible, définition du spot, vue passés sans outils du radar.

## 09/10/2026 — la carte, cinq vues

BUILD `2026-10-09-club-map`, SSO `club`. Copie du SPACE antérieur au transfert, puis retrait du fil et de son filtre.
CENTRE radar · HAUT annonce · DROITE agenda · BAS caméra (`spot_create`) · GAUCHE passés (`spots_feed`, `was`).
Cartes passées reprises de Meet ; curseur sur la réponse brute, même si une page ne contient que des spots en cours.
Ancien accueil renommé `meet.html`, How it works et footer conservés ; ses cartes ouvrent `/?spot=`.
`?spot=` d’un space → SPACE par SSO avec remplacement ; spot → fiche. Menu personnel → `my_spots`.
`cities.json`, capture vidéo et HLS copiés à l’identique ; caméra/micro autorisés pour le même domaine. 308 boutique inchangés.
Tests : `club_map`, `club_publish`, `club_ui`, `space_spot_links`, `club_luxury` (§1–2 sur `/meet`).
## 09/10/2026 — figher.club = SE RETROUVER DANS LA RÉALITÉ

Wah (avec ChatGPT) : « totehm.com c'est la stratégie, totehm.space le contenu
inspirant, figher.club la rencontre dans la réalité, higher.boutique l'achat
physique et virtuel. » BUILD `2026-10-09-meet`.
- **Partis sur higher.boutique** (git mv, octet pour octet) : `discover`,
  `discover_lisbon`, `get_higher`, `play_lisbon_street`, `origins`, `stoner`,
  `stoner_terms`, `market`, `api/geo.js`, `assets/signs/`. `vercel.json` les
  redirige (308, requête conservée) vers `https://www.higher.boutique/<page>`,
  `/lisbon` compris : liens, favoris, e-mails et retours Stripe d'avant
  continuent de marcher.
- **`index.html`** : « Meet in reality. » + les spots en trois onglets — I WILL
  BE HERE (`spots_list`) · I AM HERE · I WAS THERE (`spots_feed`), droits de
  SPACE (`_spot_view` : la ville pour tous, le point exact aux abonnés de
  l'hôte). Un spot s'ouvre sur SPACE (`?spot=id`, pont `space`) : la fiche, la
  vidéo et le « join » y vivent encore. Comment ça marche + pied de page : chaque
  domaine dit sa fonction. Plus de Get Higher, de marché, d'Origins ni de
  « deux clés » sur la porte (le passeport FIGHER reste la règle du marché).
- ⚠️ `tools/hover.py` replace le bloc « 03/10 — the member's TOTEHM name » AVANT
  le bloc généré : le remettre APRÈS, sinon `#member:hover` repasse au blanc.
- `#sh-go` porte `data-eco-connect` (test `space_boxes_ecosystem`). Diagnostic
  `__totehm_club()` : build, page `meet`, compteurs de spots. Test :
  `club_luxury.mjs` §1–2.


## 07/10/2026 — restauration exacte des six expériences avant migration

Demande de Wah : retrouver EXACTEMENT le format présent sur higher.boutique
juste avant le déplacement vers figher.club, sans refonte.
Référence : `80ebe9269a8f3ee772812e93e8978bfa60eef6d9`, parent de la migration
`0473b7ff839df268427bff00e0d72cb73e6c60a1` du 02/10.

Pages : `stoner.html`, `play_lisbon_street.html`, `origins.html`,
`get_higher.html`, `discover.html`, `discover_lisbon.html`.
CSS, balisage, SVG, textes, menus et interactions retrouvent leurs sources
dans `boutique/`. Les ajouts visuels `ecosystem_ui` des 05–06/10 sont retirés
de ces six pages : ne plus les y appliquer. Cette restauration remplace aussi le Discover « quatre pouvoirs » ajouté
le 07/10 dans get_higher.html. Les règles UI communes ci-dessous
restent valables pour les autres pages. La connexion locale d'origine de ces
expériences est restaurée ; les ponts SSO entre domaines restent reçus.

Seuls raccords techniques conservés : chemins absolus sous cleanUrls,
retour d'achat THP `from: 'method'`, acquisition sur le marché de la même
origine, redirection du PAY_URL inexistant vers le mur Get Higher, réception
SSO `verifyOtp({type, token_hash})` et callback auth synchrone dans les menus
Stoner/Get Higher. Aucune modification du serveur, des prix ni des droits.

Vérification : les CSS sont identiques octet pour octet aux six sources ;
le balisage statique est identique sauf le href des conditions migrées.
Tous les scripts inline passent `node --check`.
La comparaison visuelle automatisée locale est indisponible (Chromium absent).

## Historique du 07/10/2026 — Discover « quatre pouvoirs » (remplacé par la restauration ci-dessus)

`get_higher.html` `DSLIDES` : « One paper. Four powers. » puis A · Neurological
performance (le texte EEG de COM) · B · A digital artwork (Wah, un des 777 000,
son numéro = le numéro FIGHER) · C · Tradeable (marché FIGHER, historique) ·
D · The key to luxury (« What it opens is what it is worth. »), puis la marque.
**Jamais « investment »** (MiCA) : la valeur se dit par ce que le THP ouvre.
COM y mène depuis la vue du haut ([Get Higher], la langue, `?from=com`). Test : `com_processeur.mjs` §3.

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

Noms du Totehm en Quantico Coral #fbd5ca, y compris au survol, sans point/carré d'état. Lire le vrai pseudo depuis le profil du compte, jamais fabriquer un nom avec le préfixe de l'email. Supprimer les T statiques centrés dans les espaces membres ; conserver Higher, les œuvres et le papier de marque. Quand un nom est encadré : le navy du papier #333366, carré (12/10, Wah : « pas de boîte noire pour le nom »), sans tuile perforée. Cette règle de Wah remplace les anciennes restrictions « Coral seulement Stoner/Get » pour l'identité. Protocoles de connexion/SSO, accès THP et prix inchangés. Sur les anciens menus de Get Higher, Stoner et Boutique, le callback auth reste synchrone ; lecture profil différée avec setTimeout pour éviter le verrou Supabase (getSession/RPC dans un callback async pouvait figer le nom sur Guest).

> Chargé automatiquement quand on travaille dans `club/`. Les règles
> transverses sont dans le `CLAUDE.md` de la racine ; l'histoire dans
> `docs/POSTMORTEMS.md`. Sections déplacées TELLES QUELLES de l'ancien
> `CLAUDE.md` le 30/09/2026, les plus récentes d'abord : un renvoi « plus
> haut » peut viser la racine ou un autre dossier. Fichiers : `index.html` (la porte), `market.html` (le marché — le fonctionnement est écrit en tête du fichier ; la règle du marché est dans `backend/CLAUDE.md`), et depuis le 02/10 `discover*.html`, `get_higher.html`, `play_lisbon_street.html`, `stoner*.html`, `origins.html`, `api/geo.js`, `assets/signs/`.


## ⛔ ÉTAT AU 02/10/2026 — LE BRANDING HIGHER VIT ICI · DEUX CLÉS

**Wah, 02/10 : figher.club = l'expérimentation du branding de
higher.boutique.** [Get Higher] et Make the Lisbon Streets Higher ont
quitté la boutique : `discover`, `discover_lisbon`, `get_higher`,
`play_lisbon_street`, `stoner` (la méthode), `stoner_terms`, `origins`,
`api/geo.js` et `assets/signs/` sont ici. La boutique (et totehm.space)
redirigent en 308 chaque ancien chemin vers `www.figher.club/<page>`.

| | public | réservé (`member`) |
|---|---|---|
| porte, Get Higher, Lisbon, Origins, parcourir le marché | ✅ (ce sont eux qui vendent le THP) | |
| collectionner / revendre une œuvre | | THP + une Habit Box (`_is_figher`) |
| la méthode Stoner | | THP seul (`stoner-gate`) |

- **La porte** (`index.html`, `BUILD 2026-10-02`) : [Get Higher] →
  `/stoner` si `stoner-gate` dit `access`, sinon `/discover` ; Lisbon
  révélé par `/api/geo` (PT, fail-closed) ; deux clés (THP · Habit Box)
  et un bouton qui suit la clé manquante. Plus d'annuel, plus de
  simulateur 80/20 (l'économie créateur vit sur COM/SPACE), plus de
  « compatibility number ».
- **Depuis le 03/10, la bouche de totehm.com** (le papier posé sur la
  langue) arrive sur `/get_higher` par le pont (`sso=`) : la page est
  inchangée, l'achat reste le clic « Buy ».
- **Retour de paiement du THP** : les pages Get Higher envoient
  `from: 'method'` à `higher-checkout` → `figher.club/stoner?checked=1`.
  Le marché n'envoie rien → `/market?owned=totehmpaper`.
- Les pages déplacées se connectent par COM/auth (PKCE) et reçoivent le
  pont (`sso=` dans le fragment) ; même origine que le marché → plus de
  pont vers `/market`.
- `stoner.html` : `PAY_URL` n'existait pas (ReferenceError pour un
  non-acheteur) → `toStripe()` renvoie au mur `/get_higher`.

> La section ci-dessous (01/10) reste vraie pour la console.

### 01/10/2026 — la console est partie sur totehm.com

`club/console.html` n'existe plus : `figher.club/console` → 308 →
`totehm.com/console` (`club/vercel.json`). Les portes du Club vers la
console (`data-go="console"`, Reveal → `#s-reveal`) passent par le pont SSO.
`club_console()` est supprimée (remplacée par `my_console()`). Le Club garde
la porte FIGHER (les trois clés), l'art, les collections et le marché.

Bebas Neue est parti (titres → Space Mono Bold capitales, tailles ×0,66) ;
aucun fond blanc (`.tab.is-on`, `.tag` gris) ; « Simple terms of use » est
la dernière entrée du menu membre (`#sheet`, `#mmenu` du marché), plus
épinglée en haut à droite.

> La section ci-dessous (23/09) est DÉPASSÉE : la console (01/10) et les trois clés (02/10 : deux clés).

### ⛔ FIGHER.CLUB — LA PORTE ET LA CONSOLE — 23/09/2026

**Deux fichiers, et ils ne font pas la même chose.**

| | `club/index.html` — LA PORTE | `club/console.html` — LE MEMBRE |
|---|---|---|
| pour qui | tout le monde | un membre connecté |
| ce qu'elle dit | ce qu'est le Club, les trois clés, où l'on en est | les six questions du MASTER §86 |
| ce qu'elle lit | `figher_access()` | `club_console()` — **un seul appel** |

**Les trois clés s'affichent comme un état, pas comme une vente** : ce
que le membre a, ce qui lui manque, et la porte vers ce qui manque
(Totehm → `totehm.com/totehm#in`, THP → `higher.boutique`, annuel →
`subscription-checkout`). Chaque porte vers un autre domaine passe par
le pont.

**La console lit tout d'un appel** : adhésion, droits, mes abonnements,
mes abonnés, ma monétisation, mes gains, mes versements, et Reveal the
Box. Six requêtes côté page, c'était six allers-retours pour dessiner un
seul écran (même règle que `creator_cercle` le 19/09).

**La facturation passe par le portail Stripe** (`club-billing`,
`action: 'portal'`) : on ne réécrit pas une gestion de carte bancaire.
L'annulation d'un abonnement à un membre (`action: 'cancel_creator'`)
est une annulation **en fin de période** — la colonne `ending` le dit, la
console affiche « ends on … ».

**Depuis le Totehm**, le lien de monétisation s'écrit
`https://www.figher.club/console?to=<pseudo>` : la console ouvre
l'offre de ce membre. Ni `/club/creator`, ni un identifiant.

**⚠️ `creator-price` FAISAIT UN `update` SUR UNE LIGNE QUI N'EXISTAIT
PAS.** Zéro ligne touchée, zéro erreur : un membre qui posait son prix
avant sa méthode de virement lisait « ok » et n'avait rien d'enregistré.
`upsert … onConflict: 'user_id'`. *Un `update` sans ligne n'est pas une
erreur pour Postgres — c'en est une pour nous.*
