# com/CLAUDE.md — totehm.com

> L'état ACTUEL et les pièges (≤ 60 lignes), réécrits en place. **Règle n° 1 : les boxes sont la marque (`BRAND.md`).**
> Classement : `element_order_set` / `element_orders_for` ; Habits = ordre de `steps`.

## Les pages

| fichier | adresse | rôle |
|---|---|---|
| `totehm.html` | `/totehm` (`/` y mène) | L'APP, ≈ 15 000 lignes : jamais lue en entier (`grep -n` puis une plage) |
| `creator.html` | `/search` · `/@nom` | `/search` = noir plein écran, un nom en Quantico, des résultats qui sont des VERSOS (nomenclature) → `/@nom` = la page d'abonnement en Discover (8 écrans, SUBSCRIBE · PRIX gris sous chacun, `#cta`) ; l'univers vit dans l'écran des spots |
| `chatgpt.html` | `/chatgpt` | 5 écrans en Discover, le dernier = le panneau de connexion ; une demande de ChatGPT, un compte relié ou un service indisponible arrivent droit dessus. Sans `www` → redirigé vers `https://www.totehm.com` (OAuth) |
| `monetize.html` | `/monetize` | la vente aux créateurs en Discover (8 écrans, le curseur COMPTE, « Set my price » sous chacun) |
| `auth.html` | `/auth` | l'autorité SSO des quatre domaines (`sso-mint`) ; toute connexion passe par `tools/otp_signin.js` (copié) |
| `console.html` · `map.html` · `spot.html` · `terms.html` | | les retours de paiement · les liens de TotehmBot · les conditions |

`vercel.json` : `/@:name` et `/search` → `creator` ; `/mcp`, discovery et `/chatgpt-api/*` → `chatgpt-connector` ;
`/x/space` → SPACE ; `/x/club` ne sert que `spot.html` ; `/club` → figher.club ; `/higher`, `/higherself` → `/chatgpt` ;
seuls `/totehm` et `/totehm.html` autorisent les cadres Telegram (CSP). `overflow-x:hidden` sur `html` SEUL (sur `body`, il coupait le coin membre).

## L'accueil et ses cinq vues (`totehm.html`, `grep -n` le repère)

| vue | repères |
|---|---|
| la croix | `const LV=` · `VOISINS` (↑ = la vue `b`, ↓ = la vue `h` ; les noms `lv-h`/`lv-b` restent ceux des vues) · `demander(` · `garde(` · `guetter(` · `refus(` (le mouchard, `?diag=1`). **LE CENTRE EST UN ARRÊT** : arriver au centre vide la file. Un geste reçu pendant un voyage ou un repli attend sa fin (`guetter`, 1,5 s) |
| ● le centre | `#lv-title` « THE [Higher] WAY TO MAKE IT HAPPEN » (le mot est la place `#lv-title-h` : le badge `#lv-slogan` s'y pose, net, par `sloganPour('c')` ; titre absent = coin du socle) ; sans compte `#lv-pitch` = la porte + [Discover] ; avec un compte `#lv-tap` (tap · turn · Discover). `const DISC=` : la couche `#lvd` (10 écrans, moteur copié, la porte sous chacun, une illustration par écran faite des éléments du site — `ILL`, box natives par `inerteBox`, le radar du Club redessiné par `RADAR` (règles de `draw()` de club, ne tourne que sur son écran) ; « Monetize my TOTEHM » sur l'écran de l'argent) ; `body.is-dc` éteint les gestes de l'accueil (`libre`, `swallow` le laisse passer) ; Échap et « précédent » referment |
| ↑ Higher my ChatGPT | `#rf` : le GPT PNG tourne, le titre `#chatgpt-title` (la pièce) puis le texte puis le BOUTON `#chatgpt-connect` → `/chatgpt`. Chez un membre : SON offre (`OFFRE`, `#mb-offre`) |
| ↓ Get Higher | le slogan « Get [Higher] with your [TOTEHM] » (`#lv-slogan`, `.lvs-post` porte la pièce `data-tw`) · `RAM.cerveau` · `posHaut()` (la bouche rétrécit, jamais le cerveau ; le chevron ↑ borne la vue) · `#lv-sell` |
| ← mes médias | `const SH =` · `MBM` · les tuiles lisent la VIGNETTE (`tools/vignette.js`), la visionneuse `#tlv` la photo entière ; [delete] dans la rangée noire au-dessus de la box |
| → mes spots | `const CLUBSP=` (`club_spots_of`) · `SPMAP` · `SPGRID` · `SHS` · la prise `const NSPOT=` (définition d'abord, Habit → WHEN → WHERE → qui → durée → mot → média FACULTATIF) |
| MEMBERS | `chercherAilleurs()` : `/search` dans un onglet, il faut un TOTEHM. `?ro=<nom>` arrive sur SON atterrissage (`const MB=`, `entrerChez()`) ; un auteur à abonnement : `verrouiller()` |

## Le TOTEHM déployé et le verso

- Le déploiement : `LV.deployer()` (traits aspirés), `fold(then)` = UN mouvement (`DUR_REPLI` 720) ; le papier ×14 n'est
  jamais retracé (`#gl-paint` en opacité). La boîte : `/* ══ LA BOÎTE` — chaque box est une PHRASE (`.mg-l` visibles),
  `+ totehmize` dans les cinq vues ; la manette `#joy` = celle de l'atterrissage.
- Le verso : `ouvrirVerso()` (le papier se retourne, le nom zoome lettre pour lettre, `geometrie()`), deux onglets
  `#vs-tabs` — **Go Higher** (`const DASH=` + `tracking.mjs` : 7/28 jours, Done · Missed · No response, la grille des
  Habits en box natives, une rangée d'actions, les objectifs à échéance ; rien d'autre) et **Monetize my TOTEHM**
  (`#mw-creator`). Le nom en BLOC (`#ast-grid`, nomenclature carrée) ; `#ast-name` reste la LIGNE mesurée.
- **Pile ou face (≥ 700 px)** : le verso s'arrête au carré de `#stage` (`auFormat()`), son contenu défile dedans ;
  `#srch-flip` et `#fold-flip` retournent une face sur l'autre (`fermerVerso(→enter)`, `fold(→ouvrirVerso)`).

## Les pièges

- **Confidentialité** : la BOX se règle DANS la box (`AUDB.html` : un cadenas, PRIVATE · SUBSCRIBERS, la note n'apparaît
  qu'à la confirmation, deux gestes) ; ailleurs, seulement là où le niveau BLOQUE un geste (`ouvrirLaBox` dans la prise
  d'un spot). Un MÉDIA prend le niveau de SA box (serveur). Un SPOT a ses trois niveaux (`[data-spaud]`) sous le plafond
  de sa box (`_spot_plafond_ok`, refus `box_private`).
- `cloudSave()` réécrit `steps` en entier ; le serveur après `PAUSE_FRAPPE` (2,5 s) ou à la sortie du champ ; un refus
  laisse la saisie en ATTENTE (`NON_CONFIRME`) ; rien avant `cloudLoad`. Ne jamais redéfinir `--perfo`.
- `habit-rhythm.mjs` (35 langues, zéro LLM) propose un rythme à confirmer ; `f` seul règle le check-in. Telegram :
  `?telegram=1#practice=<id>` ouvre la box native (jamais d'identité par le SDK). Liens : `totehm-link.mjs`.
- La pièce TOTEHM tourne sur les pièces VISIBLES, jamais sur `:root` (21–25 images/s au déploiement → 60). Le socle
  `#lv-socket` donne la taille du boîtier : ne pas le retirer. Toute sortie de verso rend `LV.aspirer(false)`.
- Aucun menu sur totehm.com : le coin membre MÈNE au TOTEHM ; sortir et les conditions vivent au verso.

Diagnostics `__totehm_lv|discover|dash|audb|sh|rdr|nspot|save|retour|mot()` · Tests `tests/browser/com_*.mjs` (`harness.mjs`).
