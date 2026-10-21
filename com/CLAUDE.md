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
| l'atterrissage, les gestes | `const LV=` · `garde(` · `demander(` · `reprendre(` · `quandLibre` |
| ↑ Get Higher | `RAM.cerveau` · `posHaut()` (la bouche rétrécit, jamais le cerveau) |
| ← mes médias | `const SH =` · `MBM` · `boxTotehm` · `#tlv` (visionneuse verticale) · `feed_badges` |
| ● mon TOTEHM, le verso | `const PAPIER=` · `const RAM=` (`peindre` : ← → sont la transformation du centre) · `#self-h` |
| → les spots | `const CLUBSP=` (`club_spots`, `club_spots_of`) · `SPOTMODE` · `SPMAP` · `SPGRID` · `SHS` · `BUNNY` |
| ↓ Higher Self | `const REF=` (`higher-self`) |
| MEMBERS | `const MB=` → `totehm_of` → `entrerChez()` : ses médias, son TOTEHM, ses spots, son offre (`OFFRE`) |
| la liste du TOTEHM déployé | `/* ══ LA BOÎTE` · `/* ══ LES TROIS VUES` · `/* ══ LES ÉCRITURES` · `const INTS=` |
| la session | `/* ══ LA SESSION` · `sessionChange` · `sesWait` · cache `totehm_habits_v1` |

Diagnostics : `__totehm_lv()` · `__totehm_xo()` · `__totehm_sh()` · `__totehm_rdr()` · `__totehm_carte()` · `__totehm_zone()`.

## Les pièges

- Hors du TOTEHM, une box est rendue par les rendus de la liste (`boxTotehm`), jamais une copie.
- `cloudSave()` réécrit `steps` en entier : rien d'autre ne s'y range.
- `FREQS` (page) = `_freq_minutes` (base) : identiques.
- Ne jamais redéfinir `--perfo` (une seconde définition l'écrase en silence).
- Un verrou de navigation se rend toujours ; un geste reçu pendant un voyage attend sa fin.
- Session gardée : ni la vente ni CONNECT avant la fin de la lecture ; aucune écriture sur la foi du cache.
- **Confidentialité par box : base prête, interface ABSENTE** (aucun appel à `box_audience_put/set`,
  `my_box_audiences`). Ordre : 1) la pastille sur chaque box (`tools/audience_ui.js`), 2) les lecteurs (terminal),
  3) passer à `box_audience_set`.

## Tests

`tests/browser/com_*.mjs`, `console.mjs` ; préparer et lancer : en tête de `tests/browser/harness.mjs`.
`com_plateforme.mjs` échoue sur « annoncer… le POINT » depuis avant le 21/10.
