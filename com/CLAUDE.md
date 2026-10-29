# com/CLAUDE.md — totehm.com

> L'état ACTUEL et les pièges (≤ 60 lignes). Le sens des vues : `BRAND.md`. Un lot réécrit ces lignes, en place.

## Les pages

| fichier | adresse | rôle |
|---|---|---|
| `totehm.html` | `/totehm` (`/` y mène) | L'APP, ≈ 13 900 lignes : jamais lue en entier |
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
| ← mes médias | `const SH =` · `MBM` · `boxTotehm` · `#tlv` (visionneuse verticale, sa box porte `loupeVue`, et SOUS elle `.sh-ask` montre MON média au Higher Self ; [delete] en deux gestes : `element_media_remove` ou `vision_image_set(id,null)`) · `feed_badges` · filtre : `.sfcmd` = **le LOGO** (trois papiers `--perfo`, le sprite `#lg-rail/-t/-wm`) ; UN tap sur le TOTEHM docké le fait NAÎTRE de lui (`naitre` : il part de sa taille, zoome, fond, MY WISDOM et MY VISION glissent ; le docké s'efface, `sf-nait`) ; MY GRIND ouvre ses trois boutons courts (`SF.grind`) ; la tuile « + » ouvre le même Totehm (`SF.ajout`, `SF.ajVue`) : la box choisie reste SEULE (`SF.ajBox`) et la capture s'ouvre DESSOUS, en ligne (`CAP.ouvrir(k,ref,el,{hote})`), le filtre n'est pas touché ; `SH.ajouter(x)` = ce « + », la box déjà choisie |
| ● mon TOTEHM, le verso | `const PAPIER=` · `const RAM=` (`peindre` : → ↓ sont la transformation du centre ; ← = `passer` : l'arbre rentre dans le papier docké, puis sept cadres emboîtés font le tour de l'écran (`rail`, CSS `ram-cadre`) ; `circuit` = l'ARBRE (le circuit imprimé de Wah) : une broche dans chacune des 12 perforations (`TROUS`), sept troncs étroits qui s'ouvrent en couronne (`cime`, `BRINS` : le brin du trait + 4 rameaux `.fk`), chaque piste finie par une pastille (`circle`, `.is-plein` = une Habit), les racines jusqu'à la rangée du pied ; `coeur` (CSS, sur `#gate-logo`) bat au repos ; `anneau` = l'anneau du profil ; `palette` = un Totehm fermé) · `#self-h` · `ouvrirVerso` (les traits aspirés : `LV.aspirer`) → `is-pret` · DEUX PARTIES `#vs-tabs` (`#srch[data-tab]` : `money` = `#mw-creator`, Monetize my TOTEHM · `higher` à chaque retournement = `#vs-dash` + `#settings`, Go [Higher] ; elles ne font que cacher) · `const DASH=` (`my_board`, lecture seule : le suivi vit dans Telegram ; `__totehm_dash()`) · `#mw-menu` ([Higher] subscription, TotehmBot) · `#vs-subs-s` |
| le déploiement | `LV.deployer()` (appelé par `enter`) : les traits sont ASPIRÉS dans le TOTEHM (`is-aspire`, CSS seul) pendant que le papier se déploie ; ouvert, rien autour ; `__totehm_deploiement()`. Le repli `fold(then)` : le portail revient en fondu (`FONDU` 150 ms, `DUR_REPLI` 720), le papier rentre, `#lv` revient à la fin, `LV.revenu` fait RESSORTIR les traits, puis `then` (une box emmène vers SA vue : `lvAller`) |
| → mes spots | `const CLUBSP=` (MES spots : `club_spots_of` à mon nom ; filtre now · past · future, near me + `radius_km`, « who sees it » trié ici) · `SPOTMODE` · `SPMAP` (le doigt ne la tient que SUR le globe : `dans` ; `piquer` pose un point) · `SPGRID` · `SHS` (un spot ouvert ; sur les miens « higher self » puis [delete] : `spot_remove`) · `BUNNY` · `const NSPOT=` la prise (`#rdr-new`, `#rdr-plus`, tuile `data-nspot`) : Habit → NOW (média, `moments`) \| LATER (point), une question à la fois → `spot_create_audience` \| `spot_schedule_audience` (+ `spot_video_attach`) → `spot_box_set` ; `is-nspot` tient la navigation |
| ↓ Higher Self | `const REF=` (`higher-self`, `fmt:'r4'` le miroir) · `lireR3` · `lieuHTML` (le lieu `@lieu` posé par le serveur : GO, `spotDeLaStep` → figher.club) · `lieuInvite` · `posPermise` (Higher : position arrondie à ~1 km, jamais gardée) · **ce que je MONTRE** : `smMontrer` (depuis la gauche ou la droite, par `window.__smMontrer`), la pastille `#lv-focus` au-dessus de la saisie, `focus:{kind,id}` dans `say` — une RÉFÉRENCE seule que le serveur relit dans MES lignes ; un envoi réussi la consomme |
| MEMBERS | `const MB=` → `chercher` (calquée sur le clic : traits aspirés ; un geste de la croix la referme, `annuler`, puis voyage) → `totehm_read` (box par box) → `entrerChez()` : ses médias, son TOTEHM, ses spots, son offre (`OFFRE`) ; à abonnement : `verrouiller()` (`lv-verrou`, sa palette, l'offre `#mb-lock` sous le papier, tap = `LV.offrir` ; ↑ ↓ ouverts, ← → désignent l'offre) |
| la liste du TOTEHM déployé | `/* ══ LA BOÎTE` (une Habit : why · trigger · ses médias · ses spots ; [Add a media] → ←, [Add a spot] → →) · `/* ══ LES TROIS VUES` · `/* ══ LES ÉCRITURES` · `#vnow` (le titre, en haut au centre) · `const INTS=` · la manette `#joy` = celle de l'atterrissage (`#lvj-box`), hors de tout cadre : un puits rond, un manche dont la couleur = la vue (`--joy-vue`, `TEINTE`) ; module `manette` (`RAYON` 10, `SEUIL` 6, comme `manetteLV`) ; ordinateur : dans la bande noire sous le carré (`--lvj-b`), `--stage` cède sur un écran bas pour la lui garder |
| la session | `/* ══ LA SESSION` · `sessionChange` · `sesWait` · cache `totehm_habits_v1` |

Diagnostics : `__totehm_lv()` (`.refus` : pourquoi un geste est refusé ; à l'écran : `/totehm?diag=1`) · `__totehm_xo()` · `__totehm_sh()` · `__totehm_rdr()` · `__totehm_carte()` · `__totehm_nspot()` · `__totehm_zone()`.

## Les pièges

- Hors du TOTEHM, une box est rendue par les rendus de la liste (`boxTotehm`), jamais une copie.
- `cloudSave()` réécrit `steps` en entier : rien d'autre ne s'y range. `FREQS` (page) = `_freq_minutes` (base) : identiques.
- Ne jamais redéfinir `--perfo` (une seconde définition l'écrase en silence).
- Un verrou de navigation se rend toujours ; un geste reçu pendant un voyage OU le repli du TOTEHM attend sa fin (`guetter`,
  1,5 s au plus). Tout geste de navigation est un MANCHE (il va où il pousse : doigt, trackpad, souris, manette, papier) SAUF dans la liste du TOTEHM déployé (`#fv-inner`) : là il suit le défilement (plus bas que le bas → la vue du dessous) ;
  et il POUSSE le manche à l'écran — `POUSSE_JOY` (app), `POUSSE_LVJ` (atterrissage) : 240 ms, puis retour au centre ;
  la main posée sur la manette commande seule (`DU_MANCHE`, `DU_LVJ`). Trackpad : un geste ET son inertie = UNE vue (le
  verrou se prolonge tant que l'inertie dure : atterrissage, manette, liste — sinon deux vues d'un geste, mesuré).
- Session gardée : ni la vente ni CONNECT avant la fin de la lecture ; aucune écriture sur la foi du cache.
- Le socle `#lv-socket` ne se voit plus (le TOTEHM est le boîtier, `--sk` = le papier + 6 px) mais il donne la taille du
  boîtier et devient l'anneau du profil : ne pas le retirer. `enter()` aspire AVANT de mesurer (le cœur grossit le papier). Verso, clic, recherche = `LV.aspirer(true)` ; chaque
  sortie doit rendre `LV.aspirer(false)` (sinon le réseau reste caché). Fin du portail = l'app au pixel (papier `--paper`).
- Verso : le dos du papier porte le NOM seul ; déplié, tout ce qui n'est pas le nom porte `.srch-after` et n'apparaît
  qu'à `is-pret` (verso déployé ET console lue, 1,8 s au plus) — un nœud ajouté au verso sans `.srch-after` s'affiche trop tôt.
- Verso déplié : l'identifiant (`#self-h`) est à même le navy ; il colle en haut avec un bandeau `#333366` peint à
  `is-pret` seulement, et `top` compense le padding de `#srch-ui` (Chrome colle dessous). L'email (`#self-mail`) est
  dessous ; le pied = `.vs-acts` (boutons `.vs-acc` : Delete, Sign out) puis les conditions. Les gris lisibles (≥ #b8b8c2).
- **Visibilité** : une box est BINAIRE, privée par défaut — une ligne de mots dans la box OUVERTE (`.baud` : `.baud-o` PRIVATE · VISIBLE TO
  MY SUBSCRIBERS ; `AUDB`, `box_audience_set`) ; un autre lit par `totehm_read`. Mon spot : `[data-spaud]` → `spot_audience_set` (3 niveaux).
- La capture EN LIGNE vit dans un panneau qui se repeint : `CAP.dans(p)` → `CAP.fermer()` AVANT la peinture, sinon `#cap-in` est détruit.

**Tests** : `tests/browser/com_*.mjs`, `console.mjs` ; préparer et lancer : en tête de `tests/browser/harness.mjs`.
