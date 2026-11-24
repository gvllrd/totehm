# club/CLAUDE.md — figher.club

> L'état ACTUEL et les pièges (≤ 60 lignes). Un lot réécrit ces lignes, en place. **Règle n° 1 : les boxes sont le branding essentiel ; conserver partout leur rendu natif intégral, sans réinterprétation locale (voir `BRAND.md`, règle n° 1).**

**La sixième vue** : le prolongement de la vue → Spots de totehm.com. Deux choses — TROUVER les spots visibles autour
de soi, en PUBLIER un sans passer par com. Un spot = une Habit du TOTEHM devenue une action dans un temps et un lieu
précis (I WILL BE HERE · I AM HERE · I WAS THERE).
**À QUOI SERT LE CLUB** (Wah, 14/11) : à la RENCONTRE des membres, dans un contexte et une action déterminés, sur une
vue PARTIELLE du grind — la box Habit dont il est question, avec ses objectifs et ses répulsions (le GRIND = TOUTES les
box Habits du TOTEHM avec leurs objectifs et leurs répulsions). Voir la stratégie derrière le geste, c'est ÇA aussi
l'intérêt du Club : un spot en Figher Club y montre ses sous-box. Filtrer par Habits SEMBLABLES est sa raison d'être.
Différence avec COM : ici les spots de TOUS les membres (`club_spots`), là-bas les miens ; ici RADAR · GRID · SHORTS, là-bas MAP · GRID. La définition, la même sur les deux : « A spot is your TOTEHM Habit in action: exact place, exact time, right people, your conditions. »

| fichier | rôle |
|---|---|
| `index.html` | la page : RADAR \| GRID \| SHORTS, la barre, le filtre, un spot ouvert, la prise de spot |
| `create.html` | **l'ancien moteur**, encore servi : `com/spot.html` (TotehmBot, Telegram) l'encadre par `/x/club` |
| `art-bridge.html` · `cities.json` · `video-capture.mjs` · `vendor/` | anciens liens d'œuvres → totehm.space · les villes · la caméra (de `create.html`) · hls.js |

Serveur : `club_spots`, `spot_get`, `spot_rules`, `space_habits`, `spot_create_audience`, `spot_schedule_audience`,
`spot_box_set`, `spot_video_attach`, `spot_remove`, `sso_epoch`. Droits : `_audience_ok`, `_spot_exact`, `_clip_readable`.

## La page (`grep -n` le repère)

| quoi | repères |
|---|---|
| l'en-tête | coin membre SEUL (il porte LE TOTEHM qui tourne, un tap ramène à COM) · `#rdr-mode` en haut à droite : le bas reste au pouce, chaque vue DÉFILE |
| le Discover | `#club-disc` (visiteur : en bas au centre ; membre : discret en bas à droite) ouvre `#cd` — 7 écrans, moteur `tools/discover.*` COPIÉ (`tools/recopier.py`), la porte sous chacun : CONNECT sans compte, POST A SPOT avec (`const CD=`, `__totehm_club_discover()`) |
| les trois modes | `const MODES=` · `MODE` (gardé, `figher_mode`) · `peindreMode()` · `body.rdr-radar` \| `rdr-grid` \| `rdr-shorts` |
| le radar | `const RAD=` · `situer()` · `draw()` : moi au centre, un POINT LUMINEUX par spot (PLEIN = point exact, ANNEAU = la ville ; il rayonne de sa couleur), posé sous la barre avec de l'air (`radarSize`), `#rdr-plus` (+ SPOT) en grand en bas, le seul « + » en shorts, de la couleur de TOUTES ses intentions mélangées (`melange`, moyenne Oklab à saturation rendue — copié de com) ; l'anneau tourne au doigt, `CMP` = la boussole. **LA PORTÉE SE RÈGLE** : `RAD.z` multiplie la portée automatique (`radarAuto`), gardé dans `figher_portee` ; trois gestes — `#rdr-zoom` (± 1,6), deux doigts sur le disque, la molette —, et `#rdr-span` ÉCRIT la portée pendant le geste. L'anneau garde sa priorité (`stopImmediatePropagation`). Il DÉFILE (`.rd-top`) : dessous, `LISTE` (du plus proche au plus loin) ; il s'arrête hors de l'écran ou derrière un panneau |
| les shorts, la grille | `const SHORTS=` : les spots qui ONT un média (facultatif depuis le 14/11), un par écran, aimantés ; UN joue, le suivant se prépare ; tap image = le son, tap box = le spot · `const GRID=` : la tuile carrée, la box du TOTEHM dessus, le « + » en tête (comme COM) ; sa photo se lit en VIGNETTE (`VIGNETTE.de`, `tools/vignette.js`, 15/11), la photo entière seulement dans le détail et les shorts |
| la lecture, le filtre | `const CLUBSP=` : `club_spots`, trois temps, filtres au SERVEUR, pagination ; la position est demandée À L'ARRIVÉE (`boot`) : près de moi d'abord, rien autour → tout le Club, et la barre le dit. Déconnecté : AUCUNE lecture des spots ni position, mais la VITRINE (24/11, Wah : « pour donner envie ») : `club_vitrine()` → des anneaux à la VILLE, couleur des intentions, rien d'autre (ni point, ni Habit, ni auteur, ni média), une ligne « N spots in the club · connect… », le tap ouvre le Discover · `const SF=` · `sfPaint()` : le REFINE de la vue de droite de com, CENTRÉ (le centrage s'arrête au bord des boxes), les intentions une par une — Habits (box du TOTEHM, parenté ; la choisie reste SEULE, `SF.replie`, un tap sur elle rouvre la liste), When À PLUSIEURS (`st.pers`, une lecture par temps, fusionnées), Where + rayon, Together, Intentions, It shows |
| la prise | `const NSPOT=` (`#rdr-new`) : la définition EN AVANT (`.ns-what`, le mot TOTEHM y est la PIÈCE, `data-tw`), la Habit, WHEN, WHERE, FIGHER CLUB d'office = EVERY MEMBER (montré, jamais demandé), together, le média, durée, un mot. **LE MÉDIA EST FACULTATIF** (14/11, Wah : « un spot peut être sans media ») : trois pavés PHOTO · VIDEO · IMPORT au format de la vue de droite de com (`#ns-cap`, `.cap-b` et les icônes copiés de `com/totehm.html`), [remove] retire celui qu'on a pris, et rien ne garde la suite ; une vidéo part chez Bunny (`VID`, TUS, `tools/bunny_upload.js`), sinon dans `moments`. **UNE HABIT PRIVÉE NE PORTE PAS DE SPOT ICI** : `space_habits` rend le niveau de chaque box (`audience`), une box privée s'affiche GRISÉE (`.sfb.is-off`, l'opacité dit l'état — la box garde son rendu natif), non sélectionnable, avec [make visible to subscribers and Figher Club members] ; le tap EST la confirmation (`box_audience_set`), et `publier` refuse sans lui |
| un spot ouvert | `ouvrirDetail()` (`#detail`) : LE TRAIT en tête (`.dt-grab` tient le geste seul, `touch-action:none` ; un tiers de sa hauteur et elle part, elle n'écrit que `--dy`), son média s'il en a un, la box, GO · CALENDAR · SHARE · DELETE (les miens) · CLOSE |
| la vidéo | `const BUNNY=` (HLS signé au moment de jouer) · `urlMoments()` (seau `moments`, URL signée d'une heure) |

## Les règles

- **La parenté** (Wah), le cœur du Club : une Habit choisie au filtre ouvre les spots dont la Habit lui RESSEMBLE —
  `akin` part au serveur (`_habit_kin` : radicaux, trigrammes, intentions, pilier ; zéro centime ; depuis le 24/11 un mot commun suffit — 0.35 au moins — et des intentions communes SEULES ne suffisent plus — 0.29 au plus, seuil 0.30), les plus proches
  d'abord, et chaque spot DIT pourquoi (`kin.why`). `[exactly this one]` renvoie le filtre EXACT (`habit`). Le filtre
  garde TOUTES mes Habits, privées comprises : il cherche chez les autres, seule la PRISE a un plafond.
- **Le lieu** : un point est un POINT. Ma position, ou une ADRESSE lue par Nominatim — UNE requête par geste, jamais
  une par lettre, réponses gardées. La VILLE se déduit toujours de `cities.json`, jamais du géocodeur : c'est le
  vocabulaire du filtre `city` et du radar. Plus de `location on/off` : WHERE le disait déjà.
- **WHEN décide de WHERE** : `now` impose `here` et ne montre aucune date ; `later` déplie la date et l'heure.
- Ce qui vient du TOTEHM reste tel quel (Habit Box, mini-boxes OBJECTIVES / REPULSIONS). Un spot montre SA box et ses
  sous-box, jamais les médias de la box : un média prend le niveau de SA box, et c'est l'abonnement qui l'ouvre.
- Membre du Club = une habit + un why, objectif ou vision (serveur, `_figher`) : un point de rencontre, pas le grind. FIGHER CLUB est le niveau le plus
  ouvert : il n'y a pas de PUBLIC.
- Le coin membre (`tools/totehm_name.js` + `member_corner.*`) = CONNECT WITH MY TOTEHM en bouton normal ; connecté =
  LE TOTEHM qui TOURNE (~24 s), tap vers COM. **Pas de SORTIR ici** : sortir de totehm.com sort de partout (`sso_epoch`).
- La connexion passe par `tools/otp_signin.js` (copié) : l'email en vol survit au rechargement, un seul essai à la fois.

## Écarts connus

- Le projet Vercel de figher.club n'est PAS dans l'équipe de Wah (`gvllrds-projects` : `com`, `space`, `boutique`) : ni alias ni rollback d'ici.
- `create.html` garde l'ANCIEN questionnaire ; `index.html` n'a pas de point sur une carte, ni la caméra EN DIRECT.

Tests : `club_spots.mjs`, `club_discover.mjs`, `club_v2.mjs`, `com_spot.mjs`. Diagnostic : `__totehm_club()`.
