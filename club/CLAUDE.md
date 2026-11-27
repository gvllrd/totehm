# club/CLAUDE.md — figher.club

> L'état ACTUEL et les pièges (≤ 60 lignes). Un lot réécrit ces lignes, en place. **Règle n° 1 : les boxes sont le branding essentiel ; conserver partout leur rendu natif intégral, sans réinterprétation locale (voir `BRAND.md`, règle n° 1).**

**La sixième vue** : le prolongement de la vue → Spots de totehm.com. Deux choses — TROUVER les spots visibles autour
de soi, en PUBLIER un sans passer par com. Un spot = une Habit du TOTEHM devenue une action dans un temps et un lieu
précis (I WILL BE HERE · I AM HERE · I WAS THERE).
**À QUOI SERT LE CLUB** (Wah, 14/11) : à la RENCONTRE des membres, dans un contexte et une action déterminés, sur une
vue PARTIELLE du grind — la box Habit dont il est question, avec ses objectifs et ses répulsions (le GRIND = TOUTES les
box Habits du TOTEHM avec leurs objectifs et leurs répulsions). Voir la stratégie derrière le geste, c'est ÇA aussi
l'intérêt du Club : un spot en Figher Club y montre ses sous-box. Filtrer par Habits SEMBLABLES est sa raison d'être.
Le Club propose les spots autorisés de tous les membres avec Map et Grid. L’onglet My Grind de Refine retrouve des actions par Habit semblable et affiche leurs objectifs et répulsions.

| fichier | rôle |
|---|---|
| `index.html` | Map, Grid, Refine, détail et prise d’un spot |
| `create.html` | **l'ancien moteur**, encore servi : `com/spot.html` (TotehmBot, Telegram) l'encadre par `/x/club` |
| `art-bridge.html` · `cities.json` · `video-capture.mjs` · `vendor/` | anciens liens d'œuvres → totehm.space · les villes · la caméra (de `create.html`) · hls.js |

Serveur : `club_spots`, `spot_get`, `spot_rules`, `space_habits`, `spot_create_audience`, `spot_schedule_audience`,
`spot_box_set`, `spot_video_attach`, `spot_remove`, `sso_epoch`. Droits : `_audience_ok`, `_spot_exact`, `_clip_readable`.

## La page (`grep -n` le repère)

| quoi | repères |
|---|---|
| l'en-tête | coin membre SEUL (il porte LE TOTEHM qui tourne, un tap ramène à COM) · `#rdr-mode` en haut à droite : le bas reste au pouce, chaque vue DÉFILE |
| le Discover | `#club-disc` (visiteur : en bas au centre ; membre : discret en bas à droite) ouvre `#cd` — 7 écrans, moteur `tools/discover.*` COPIÉ (`tools/recopier.py`), la porte sous chacun : CONNECT sans compte, POST A SPOT avec (`const CD=`, `__totehm_club_discover()`) |
| les vues | SELECT bascule Map et Grid. Le choix survit aux visites. Un ancien choix Shorts mène à Grid. |
| la carte | `tools/spot_map.js` fournit le même globe que Totehm. La géolocalisation cadre la ville et affiche un point blanc. Les groupes chiffrés s’ouvrent au toucher. Le bouton Spots ouvre la liste sous la carte. |
| la grille | Tuiles rondes, deux colonnes sur téléphone, ajout en tête. Le filet d’intention suit l’arc extérieur sous le média. Les vignettes restent légères. |
| la lecture et le filtre | `CLUBSP` lit les trois temps par défaut avec pagination. Maintenant puis bientôt, selon la distance lorsqu’elle est connue. Refine affiche une étape à la fois parmi My Grind, When, Where, Together, Intentions et Media. En visite, `club_vitrine()` rend la ville, les intentions et le temps. |
| la prise | `const NSPOT=` (`#rdr-new`) : la définition EN AVANT (`.ns-what`, le mot TOTEHM y est la PIÈCE, `data-tw`), la Habit, WHEN, WHERE, FIGHER CLUB d'office = EVERY MEMBER (montré, jamais demandé), together, le média, durée, un mot. **LE MÉDIA EST FACULTATIF** (14/11, Wah : « un spot peut être sans media ») : trois pavés PHOTO · VIDEO · IMPORT au format de la vue de droite de com (`#ns-cap`, `.cap-b` et les icônes copiés de `com/totehm.html`), [remove] retire celui qu'on a pris, et rien ne garde la suite ; une vidéo part chez Bunny (`VID`, TUS, `tools/bunny_upload.js`), sinon dans `moments`. **UNE HABIT PRIVÉE NE PORTE PAS DE SPOT ICI** : `space_habits` rend le niveau de chaque box (`audience`), une box privée s'affiche GRISÉE (`.sfb.is-off`, l'opacité dit l'état — la box garde son rendu natif), non sélectionnable, avec [make visible to subscribers and Figher Club members] ; le tap EST la confirmation (`box_audience_set`), et `publier` refuse sans lui |
| un spot ouvert | Map et Grid ouvrent la même fiche. La box, le moment, le lieu et les actions immédiates sont visibles. Details ouvre la visibilité, la durée, le commentaire et les actions secondaires. Les flèches passent au spot voisin et la croix noire ferme la fiche. |
| la vidéo | `const BUNNY=` (HLS signé au moment de jouer) · `urlMoments()` (seau `moments`, URL signée d'une heure) |

## Les règles

- **La parenté** (Wah), le cœur du Club : une Habit choisie au filtre ouvre les spots dont la Habit lui RESSEMBLE —
  `akin` part au serveur (`_habit_kin` : radicaux, trigrammes, intentions, pilier ; zéro centime ; depuis le 24/11 un mot commun suffit — 0.35 au moins — et des intentions communes SEULES ne suffisent plus — 0.29 au plus, seuil 0.30), les plus proches
  d'abord, et chaque spot DIT pourquoi (`kin.why`). `[exactly this one]` renvoie le filtre EXACT (`habit`). Le filtre
  garde TOUTES mes Habits, privées comprises : il cherche chez les autres, seule la PRISE a un plafond.
- **Le lieu** : un point est un POINT. Ma position, ou une ADRESSE lue par Nominatim — UNE requête par geste, jamais
  une par lettre, réponses gardées. La VILLE se déduit toujours de `cities.json`, jamais du géocodeur : c'est le
  vocabulaire de la carte et du filtre `city`.
- **WHEN décide de WHERE** : `now` impose `here` et ne montre aucune date ; `later` déplie la date et l'heure.
- Ce qui vient du TOTEHM reste tel quel (Habit Box, mini-boxes OBJECTIVES / REPULSIONS). Un spot montre SA box et ses
  sous-box, jamais les médias de la box : un média prend le niveau de SA box, et c'est l'abonnement qui l'ouvre.
- Membre du Club = une habit + un why, objectif ou vision (serveur, `_figher`) : un point de rencontre, pas le grind. FIGHER CLUB est le niveau le plus
  ouvert : il n'y a pas de PUBLIC.
- Le coin membre (`tools/totehm_name.js` + `member_corner.*`) = CONNECT WITH MY TOTEHM en bouton normal ; connecté =
  LE TOTEHM qui TOURNE (~24 s), tap vers COM. **Pas de SORTIR ici** : sortir de totehm.com sort de partout (`sso_epoch`).
- La connexion passe par `tools/otp_signin.js` (copié) : l'email en vol survit au rechargement, un seul essai à la fois.

## Écarts connus

- Le projet Vercel Club est lié à `main`. Vérifier le déploiement sur www et l’apex.
- `create.html` garde l'ANCIEN questionnaire ; `index.html` n'a pas de point sur une carte, ni la caméra EN DIRECT.

Tests : `club_spots.mjs`, `club_discover.mjs`, `club_v2.mjs`, `com_spot.mjs`. Diagnostic : `__totehm_club()`.
