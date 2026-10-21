# club/CLAUDE.md — figher.club

> L'état ACTUEL et les pièges (≤ 60 lignes). Un lot réécrit ces lignes, en place.

Le prolongement de la vue → Spots de totehm.com : chercher, publier des spots, se rencontrer. Un spot = un lieu + une
heure (I WILL BE THERE · I AM HERE · I WAS HERE). Le radar vit ICI (totehm.com montre MAP · GRID).

| fichier | rôle |
|---|---|
| `index.html` | le radar et ses cinq vues (annonce · agenda · caméra · passés) |
| `create.html` | le même moteur, ouvert dans totehm.com (`/x/club` → `/create`) |
| `art-bridge.html` | anciens liens d'œuvres → totehm.space, connexion gardée |
| `cities.json` · `video-capture.mjs` · `vendor/` | les villes · la caméra · hls.js |

Serveur : `space_habits`, `space_discover`, `spots_feed`, `spot_get`, `spot_rules`, `spot_create_audience`,
`spot_schedule_audience`, `spot_box_set`, `spot_video_attach`. Droits : `_spot_view`, `_point_ok`, `_clip_readable`.

## Les règles

- OFF = la ville, ON = le point exact ; jamais une position calculée depuis une ville.
- Ce qui vient du TOTEHM reste tel quel (Habit Box, mini-boxes OBJECTIVES / REPULSIONS) ; `spot_box_set` éteint un élément.
- Membre du Club = une habit + un objectif + une répulsion (serveur). Un abonné voit ce que le créateur lui réserve.
- Le coin membre = CONNECT WITH MY TOTEHM ; connecté = le nom seul, qui ramène à COM.

## Écarts connus

- figher.club n'est rattaché à aucun projet Vercel visible (DNS en parking) : vérifier qui le sert.
- `index.html` propose encore PUBLIC (quatre niveaux) : le serveur le lit FIGHER CLUB. Source à jour : `tools/audience_ui.js`.
- `index.html` et `create.html` ont une variante du bloc SSO (≠ `tools/sso_snippet.js`).

Tests : `tests/browser/club_*.mjs`, `com_spot.mjs`. Diagnostic : `__totehm_club()`.
