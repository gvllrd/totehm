# com/CLAUDE.md — totehm.com

> L'état ACTUEL et les pièges (≤ 60 lignes). Le sens des vues : `BRAND.md`. Un lot réécrit ces lignes, en place.

## Les pages

| fichier | adresse | rôle |
|---|---|---|
| `totehm.html` | `/totehm` (`/` y mène) | L'APP, ≈ 12 850 lignes : jamais lue en entier |
| `auth.html` | `/auth` | l'autorité SSO des quatre domaines (`sso-mint`) |
| `creator.html` | `/@nom` · `/search` | la page d'un membre : lisible, réservé (flouté), Subscribe |
| `higher.html` | `/higher` | la vente de l'abonnement Higher (`higher-sub`) |
| `console.html` | `/console` | l'ancienne console, encore cible des retours Stripe et des satellites |
| `monetize.html` · `terms.html` | | la plaquette créateur · les conditions |
| `higherself.html` · `map.html` · `spot.html` · `club/totehmbot.html` | | ce qu'ouvre TotehmBot (Telegram) |

`vercel.json` : `/x/space` → SPACE `/social`, `/x/club` → Club `/create` (ouverts SUR PLACE par `XO`) ; `/club` →
figher.club ; `/vendor`, `/cities.json`, `/assets/signs` → SPACE ; Telegram n'encadre que `/higherself`.

## Les 5 vues dans `totehm.html` (`grep -n` le repère)

| vue | repères |
|---|---|
| l'atterrissage, les gestes | `const LV=` · `garde(` · `demander(` · `guetter(` · `reprendre(` · `quandLibre` · `refus(` (le mouchard) |
| ↑ Get Higher | `RAM.cerveau` · `posHaut()` (la bouche rétrécit, jamais le cerveau) |
| ← mes médias | `const SH =` · `MBM` · `boxTotehm` · `#tlv` (visionneuse verticale, sa box porte `loupeVue`) · `feed_badges` · filtre : `.sfcmd` (MY STORY ▢ · OBJ/HAB/REP empilés · ▢ VISION, carrés `--perfo`) |
| ● mon TOTEHM, le verso | `const PAPIER=` · `const RAM=` (`peindre` : ← → ↓ sont la transformation du centre ; `circuit` = 7 broches par arête du processeur, `anneau` = l'anneau du profil) · `#self-h` · `ouvrirVerso` → `is-pret` · TROIS ONGLETS `#vs-tabs` (`#srch[data-tab]` : `dash` à chaque retournement · `sub` · `money` ; ils ne font que cacher `#vs-dash`, `#settings`, `#mw-creator`) · `const DASH=` (`my_board`, lecture seule : le suivi vit dans Telegram ; `__totehm_dash()`) · `#mw-creator` (Monetize my TOTEHM) · `#mw-menu` ([Higher] subscription) · `#vs-subs-s` |
| le déploiement | `LV.deployer()` / `LV.replier(1|2)` (appelés par `enter`/`fold`) : `grandir` donne au socle sa vraie taille à chaque image (`is-geo`, le puits à 3 px du papier), les traits suivent ; ordinateur ouvert : `#app-proc` (`LV.posApp`, `--as`/`--aw`, `body.proc-ouvert`) ; `__totehm_deploiement()`. Le repli = le déploiement à l'envers : le portail revient en fondu (`FONDU`), puis papier, boîte et traits rentrent vers `R` (le repos, mesuré par `cibleDeploiement` APRÈS avoir effacé la taille posée — sinon la boîte garde sa taille déployée) ; `#lv` (légende, MINE/MEMBERS, manette) revient à la fin |
| → les spots | `const CLUBSP=` (`club_spots`, `club_spots_of`) · `SPOTMODE` · `SPMAP` · `SPGRID` · `SHS` (un spot ouvert : `.ssp-m` puis `.ssp-info` = infos, box en bas) · `BUNNY` |
| ↓ Higher Self | `const REF=` (`higher-self`, `fmt:'r4'` le miroir) · `lireR3` · `lieuHTML` (le lieu `@lieu` posé par le serveur : GO, `spotDeLaStep` → figher.club) · `lieuInvite` · `posPermise` (Higher : position arrondie à ~1 km, jamais gardée) |
| MEMBERS | `const MB=` → `totehm_of` → `entrerChez()` : ses médias, son TOTEHM, ses spots, son offre (`OFFRE`) |
| la liste du TOTEHM déployé | `/* ══ LA BOÎTE` · `/* ══ LES TROIS VUES` · `/* ══ LES ÉCRITURES` · `const INTS=` · la manette `#joy` = le socle de l'atterrissage (`#lvj-box`), un manche dont la couleur = la vue (`--joy-vue`, `TEINTE`) ; module `manette` (`RAYON` 10, `SEUIL` 6, comme `manetteLV`) |
| la session | `/* ══ LA SESSION` · `sessionChange` · `sesWait` · cache `totehm_habits_v1` |

Diagnostics : `__totehm_lv()` (`.refus` : pourquoi un geste est refusé ; à l'écran : `/totehm?diag=1`) · `__totehm_xo()` · `__totehm_sh()` · `__totehm_rdr()` · `__totehm_carte()` · `__totehm_zone()`.

## Les pièges

- Hors du TOTEHM, une box est rendue par les rendus de la liste (`boxTotehm`), jamais une copie.
- `cloudSave()` réécrit `steps` en entier : rien d'autre ne s'y range.
- `FREQS` (page) = `_freq_minutes` (base) : identiques.
- Ne jamais redéfinir `--perfo` (une seconde définition l'écrase en silence).
- Un verrou de navigation se rend toujours ; un geste reçu pendant un voyage OU le repli du TOTEHM attend sa fin (`guetter`,
  1,5 s au plus). Tout geste de navigation est un MANCHE : il va où il pousse (doigt, trackpad, souris, manette, papier),
  et il POUSSE le manche à l'écran — `POUSSE_JOY` (app), `POUSSE_LVJ` (atterrissage) : 240 ms, puis retour au centre ;
  la main posée sur la manette commande seule (`DU_MANCHE`, `DU_LVJ`).
- Session gardée : ni la vente ni CONNECT avant la fin de la lecture ; aucune écriture sur la foi du cache.
- Déploiement : jamais de `scale()` sur la boîte (arête épaissie, image étirée : « pixélisé ») — `grandir` pose sa taille.
  L'HEURE est celle du papier (`#gl-bg`, sa transition CSS) : boîte et traits (`morph(…, {suivre})`) la lisent à la même
  image ; deux horloges et les broches se détachent (mesuré : 19 px). Fin du portail = l'app au pixel (papier `--paper`).
- Verso : le dos du papier porte le NOM seul ; déplié, tout ce qui n'est pas le nom porte `.srch-after` et n'apparaît
  qu'à `is-pret` (verso déployé ET console lue, 1,8 s au plus) — un nœud ajouté au verso sans `.srch-after` s'affiche trop tôt.
- Verso déplié : l'identifiant (`#self-h`) est à même le navy ; il colle en haut avec un bandeau `#333366` peint à
  `is-pret` seulement, et `top` compense le padding de `#srch-ui` (Chrome colle dessous). L'email (`#self-mail`) est
  dessous ; le pied = `.vs-acts` (boutons `.vs-acc` : Delete, Sign out) puis les conditions. Les gris lisibles (≥ #b8b8c2).
- **Confidentialité par box : base prête, interface ABSENTE** (aucun appel à `box_audience_put/set`,
  `my_box_audiences`). Ordre : 1) la pastille sur chaque box (`tools/audience_ui.js`), 2) les lecteurs (terminal),
  3) passer à `box_audience_set`.

**Tests** : `tests/browser/com_*.mjs`, `console.mjs` ; préparer et lancer : en tête de `tests/browser/harness.mjs`.
