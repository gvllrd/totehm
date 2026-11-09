# club/CLAUDE.md — figher.club

> L'état ACTUEL et les pièges (≤ 60 lignes). Un lot réécrit ces lignes, en place.

**La sixième vue** : le prolongement de la vue → Spots de totehm.com. Deux choses, et deux seulement — TROUVER les
spots rendus visibles autour de soi, et en PUBLIER un sans passer par totehm.com. Un spot = une Habit du TOTEHM
devenue une action dans un temps et un lieu précis (I WILL BE HERE · I AM HERE · I WAS THERE).
Différence avec COM : ici ce sont les spots de TOUS les membres (`club_spots`) ; là-bas, les miens seuls.
Le RADAR vit ici (totehm.com montre MAP · GRID) ; la GRID est la même des deux côtés.

| fichier | rôle |
|---|---|
| `index.html` | la page : RADAR \| GRID, la barre, le filtre, un spot ouvert, la prise de spot |
| `create.html` | **l'ancien moteur**, encore servi : `com/spot.html` (TotehmBot, Telegram) l'encadre par `/x/club` |
| `art-bridge.html` | anciens liens d'œuvres → totehm.space, connexion gardée |
| `cities.json` · `video-capture.mjs` · `vendor/` | les villes · la caméra (de `create.html`) · hls.js |

Serveur : `club_spots`, `spot_get`, `spot_rules`, `space_habits`, `spot_create_audience`, `spot_schedule_audience`,
`spot_box_set`, `spot_video_attach`, `spot_remove`, `sso_epoch`. Droits : `_audience_ok`, `_spot_exact`, `_clip_readable`.

## La page (`grep -n` le repère)

| quoi | repères |
|---|---|
| les deux modes | `const MODE=` (gardé d'une visite à l'autre, `figher_mode`) · `peindreMode()` · `body.rdr-radar` \| `body.rdr-grid` |
| le radar | `const RAD=` · `situer()` (les spots → leurs lieux) · `draw()` : moi au centre, un carré par spot à sa distance et son relèvement ; PLEIN = le point exact m'est montré, CREUX = je ne vois que la ville ; l'anneau se tourne au doigt, `CMP` = la boussole du téléphone. Le radar S'ARRÊTE derrière un panneau ou un spot ouvert |
| la grille | `const GRID=` : la tuile carrée, la box du TOTEHM posée dessus, le « + » en tête (comme COM) |
| la lecture | `const CLUBSP=` : `club_spots`, trois temps (now · past · future), filtres au SERVEUR, pagination à 6 tuiles de la fin ; vide à l'arrivée → on montre ce qui vient, puis ce qui a été |
| le filtre | `const SF=` · `sfPaint()` : MES Habits (`space_habits`), When, Intentions, Mood, It shows, Together, Where + rayon |
| la prise | `const NSPOT=` (`#rdr-new`) : la définition, la Habit, WHEN, WHERE, qui le voit, together, durée, un mot, le média |
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
- Le coin membre = CONNECT WITH MY TOTEHM ; connecté = le nom seul, qui ramène à COM. **Pas de bouton SORTIR ici** :
  sortir de totehm.com sort de partout (`sso_epoch`, relu au démarrage et à chaque retour d'onglet).

## Écarts connus

- figher.club est servi par Vercel et à jour, mais le projet n'est PAS dans l'équipe Vercel de Wah
  (`gvllrds-projects` n'a que `com`, `space`, `boutique`) : ni alias, ni rollback, ni variables depuis sa console.
- `create.html` garde l'ANCIEN questionnaire (location on/off, ni définition ni adresse) et sa caméra 9:16 à
  décompte ; `index.html` prend son média par le fichier (`capture` ouvre la caméra), sans décompte ni cadrage,
  et n'a pas de sélecteur de point sur une carte — « elsewhere » passe par l'adresse.

Tests : `tests/browser/club_spots.mjs`, `com_spot.mjs`. Diagnostic : `__totehm_club()`.
