# club/CLAUDE.md — figher.club

> L'état ACTUEL et les pièges (≤ 60 lignes). Un lot réécrit ces lignes, en place.

**La sixième vue** : le prolongement de la vue → Spots de totehm.com. Deux choses, et deux seulement — TROUVER les
spots rendus visibles autour de soi, et en PUBLIER un sans passer par totehm.com. Un spot = une Habit du TOTEHM
devenue une action dans un temps et un lieu précis (I WILL BE HERE · I AM HERE · I WAS THERE).
Différence avec COM : ici les spots de TOUS les membres (`club_spots`), là-bas les miens ; ici RADAR · GRID · SHORTS, là-bas MAP · GRID.

| fichier | rôle |
|---|---|
| `index.html` | la page : RADAR \| GRID \| SHORTS, la barre, le filtre, un spot ouvert, la prise de spot |
| `create.html` | **l'ancien moteur**, encore servi : `com/spot.html` (TotehmBot, Telegram) l'encadre par `/x/club` |
| `art-bridge.html` | anciens liens d'œuvres → totehm.space, connexion gardée |
| `cities.json` · `video-capture.mjs` · `vendor/` | les villes · la caméra (de `create.html`) · hls.js |

Serveur : `club_spots`, `spot_get`, `spot_rules`, `space_habits`, `spot_create_audience`, `spot_schedule_audience`,
`spot_box_set`, `spot_video_attach`, `spot_remove`, `sso_epoch`. Droits : `_audience_ok`, `_spot_exact`, `_clip_readable`.

## La page (`grep -n` le repère)

| quoi | repères |
|---|---|
| l'en-tête | coin membre · `#club-logo` (les calques du TOTEHM de totehm.com ; un tap y ramène, par le pont) · `#rdr-mode` en haut à droite : le bas reste au pouce, chaque vue DÉFILE ; ce qui glisse passe sous un fondu noir |
| les trois modes | `const MODES=` · `MODE` (gardé, `figher_mode`) · `peindreMode()` · `body.rdr-radar` \| `rdr-grid` \| `rdr-shorts` |
| le radar | `const RAD=` · `situer()` · `draw()` : moi au centre, un carré par spot (PLEIN = point exact, CREUX = la ville) ; l'anneau tourne au doigt, `CMP` = la boussole. Il DÉFILE (`.rd-top`, ses gestes dans SON repère) : dessous, `LISTE` (du plus proche au plus loin, « N spots ↓ ») ; il s'arrête hors de l'écran ou derrière un panneau |
| les shorts | `const SHORTS=` : les spots qui ont un média, un par écran, aimantés ; UN joue, le suivant se prépare, le reste est lâché ; tap image = le son, tap box = le spot |
| la grille | `const GRID=` : la tuile carrée, la box du TOTEHM posée dessus, le « + » en tête (comme COM) |
| la lecture | `const CLUBSP=` : `club_spots`, trois temps, filtres au SERVEUR, pagination ; la position est demandée À L'ARRIVÉE (`boot`) : près de moi d'abord (now → future), rien autour → tout le Club, et la barre le dit ; vide → ce qui vient, puis ce qui a été. Déconnecté : AUCUNE lecture ni position (le serveur ne montre rien sans compte), la vue invite à se connecter |
| le filtre | `const SF=` · `sfPaint()` : le format de la vue de droite de totehm.com — Habits (box du TOTEHM, parenté), When, Where + rayon, Together, Intentions (« Fight [Higher] »), It shows |
| la prise | `const NSPOT=` (`#rdr-new`) : la définition EN AVANT (`.ns-what`), la Habit, WHEN, WHERE, FIGHER CLUB d'office (montré, jamais demandé), together, durée, un mot, le média ; une vidéo part chez Bunny (`VID`, TUS, `tools/bunny_upload.js`), sinon dans `moments` |
| un spot ouvert | `ouvrirDetail()` (`#detail`) : le média, la box, GO · CALENDAR · SHARE · DELETE (les miens) · CLOSE |
| la vidéo | `const BUNNY=` (HLS signé au moment de jouer) · `urlMoments()` (seau `moments`, URL signée d'une heure) |

## Les règles

- **La parenté** (Wah) : une Habit choisie au filtre ouvre les spots dont la Habit lui RESSEMBLE — `akin` part au
  serveur (`_habit_kin` : radicaux, trigrammes, intentions, pilier ; zéro centime), les plus proches d'abord, et
  chaque spot DIT pourquoi (`kin.why` → same habit · same words · same intentions · close · same pillar).
  `[exactly this one]` renvoie le filtre EXACT (`habit`). Les intentions de la Habit viennent du serveur, pas d'ici.
- **Le lieu** : un point est un POINT. Ma position, ou une ADRESSE lue par Nominatim (OpenStreetMap, le même fonds
  que la carte) — UNE requête par geste, jamais une par lettre, et les réponses sont gardées. La VILLE se déduit
  toujours de `cities.json`, jamais du géocodeur : c'est le vocabulaire du filtre `city` et du radar.
  Plus de `location on/off` : WHERE le disait déjà. Un spot porte son point exact ; « who sees it » garde la vie privée.
- **WHEN décide de WHERE** : `now` impose `here` (maintenant ailleurs n'existe pas) et ne montre aucune date ;
  `later` déplie la date et l'heure tout de suite.
- Ce qui vient du TOTEHM reste tel quel (Habit Box, mini-boxes OBJECTIVES / REPULSIONS).
- Membre du Club = une habit + un objectif + une répulsion (serveur, `_figher`). Un abonné voit ce que le créateur
  lui réserve. FIGHER CLUB est le niveau le plus ouvert : il n'y a pas de PUBLIC.
- Le coin membre (`tools/member_corner.*`) = CONNECT WITH MY TOTEHM en bouton normal ; connecté = le nom coral sur son papier perforé, qui ramène
  à COM ; « Simple terms of use » tout en bas, effacé par une vue qui défile. **Pas de SORTIR ici** : sortir de totehm.com sort de partout (`sso_epoch`).

## Écarts connus

- figher.club est servi par Vercel et à jour, mais le projet n'est PAS dans l'équipe Vercel de Wah
  (`gvllrds-projects` n'a que `com`, `space`, `boutique`) : ni alias, ni rollback, ni variables depuis sa console.
- `create.html` garde l'ANCIEN questionnaire (location on/off, ni définition ni adresse) et sa caméra 9:16 à décompte ;
  `index.html` prend son média par le fichier (`capture` ouvre la caméra) et n'a pas de point sur une carte (l'adresse).

Tests : `tests/browser/club_spots.mjs`, `club_v2.mjs`, `com_spot.mjs`. Diagnostic : `__totehm_club()`.
