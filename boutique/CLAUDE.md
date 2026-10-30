# boutique/CLAUDE.md — higher.boutique

> L'état ACTUEL et les pièges (≤ 60 lignes). Le sens d'un vêtement : `BRAND.md`. Un lot réécrit ces lignes, en place.

Des vêtements totehmisés : **n'importe quelle box** d'un membre, un style déterminé, produits par Printful.
**UN SEUL ROULEAU** (26/10, Wah : « à la place des [next], un scrolling fullscreen par fullscreen, ultra-fluide ») :
les étapes MÉRITÉES (`canShow` → `ouvrir()`) vivent l'une sous l'autre dans `#stages`, chacune valant EXACTEMENT la
fenêtre (`min-height:100%` du rouleau, ni `dvh` qui tremble avec la barre d'adresse, ni `svh` trop court quand elle se
replie), aimantée en PROXIMITÉ — jamais `mandatory`, qui interdisait de lire le bas d'une étape plus haute qu'un écran
(huit box = 917 px sur 844) — et `scroll-snap-stop:always`, pour qu'une lancée ne SAUTE jamais une étape. Un chevron
(`.sc-hint`) collé au bas de l'écran invite à descendre, seulement s'il y a VRAIMENT quelque chose dessous. L'étape
courante est celle qu'on a SOUS LES YEUX — dite par le navigateur (`IntersectionObserver`, 40 %), pas mesurée à chaque
image. ⚠️ **Le rouleau ne touche pas à l'historique** : UNE entrée remplacée (un rechargement retombe juste) ; le doigt
remonte, le « back » du navigateur QUITTE la page. ⚠️ Aucun focus automatique : le clavier rétrécit la fenêtre et
déplace les étapes sous le doigt. Deux boutons, aucun ne dit « suivant » : `#cl-go` (il connecte et vérifie le
passeport) et `#od-go` (il paie). CE QUI RESTE se lit sous le nom. **Rien n'est simulé** : ORDER montre la PHOTO.

**Le TOTEHM est la commande** : son logo — **les quatre calques de totehm.com copiés tels quels** (`#gl-bg` perforé,
`#gl-rail`, `#gl-t`, `#gl-wm`) — se décompose À SA PLACE : le FOND prend le dessus, le rail, le T et le mot FONDENT,
« MY GRIND » paraît, puis deux fonds glissent DEPUIS LUI : MY WISDOM STORY et MY VISION. Un tap sur MY GRIND empile
MY OBJECTIVES · MY HABITS · MY REPULSIONS dans son navy — les titres se LISENT (le padding cède, jamais le mot). Un tap
sur une vue donne ses boxes ; **une box tapée EST le choix** : elle s'ouvre presque entière — ses mini-boxes
(`my_box_matter`), le SON de son intention —, la liste se réduit à ELLE, et la retaper la rouvre. **TOUT PART ÉTEINT**
(26/10) : une mini-box assombrie (`button.mi`, jamais barrée) et, HORS de la box, posées DESSOUS (27/10), les PHOTOS de
son monde (`#shots`, `my_box_shots`) — SEULEMENT les images, trois par ligne : un media masqué par la perforation du
TOTEHM (grille de gauche de COM), un spot en rectangle à coins arrondis (vue de droite). Un tap LIE : la page envoie
`pick:{matter,shots}`, des RÉFÉRENCES, et le serveur relit `_box_matter` et `_box_shots` puis ne garde que ça — jamais
un texte ni un chemin reçu. Sept intentions = une COUTURE sous les papiers (UN seul `#tz-seam`). Scène NOIRE, les
papiers portent la couleur. **Le nom est un IDENTIFIANT** (minuscules, sans espace) écrit SUR LE DOS DU HIGHER — la
pièce elle-même (`#higher-dos` + `#hmask`, copiés de l'accueil), pas une bordure qui l'imite ; le serveur pose le `0.`.
⚠️ `tools/ecosystem_ui*` écrase la taille d'un bouton portant du texte — `#totehmize`, `#tz-papers`, `#matter`,
`#shots`, `#hb` en sont exemptés (dans les copies ET dans
`tools/`) ; plié, un papier n'a pas de prise (`pointer-events:none`), sinon celui de droite mange le tap du logo ;
`.pap{min-width:0}`, sinon un titre décentre.

| fichier | rôle |
|---|---|
| `index.html` | l'accueil : **le HIGHER est l'élément central** — UNE pièce, deux faces, QU'ON TOURNE À LA MAIN (doigt et souris) : le moteur `HI` est celui de `PAPIER` (com/totehm.html) COPIÉ avec ses mesures (0,72°/px, élan sur 100 ms, un QUART de tour change de face, jamais un tour entier ; posé, la face visible n'a AUCUNE transformation — `is-flat`/`is-back`). ⚠️ **UN SEUL `#hmask`** dans le document, hors des symboles : `#higher-slogan` et `#higher-dos` le référencent tous les deux, donc le dos a EXACTEMENT les perforations de la face (18 trous, 600 × 200) ; la `.hi-light` de chaque face est un rectangle masqué par lui, la lumière suit donc les trous. Posé sur son dos (à la main ou d'un tap) il ouvre LE TABLEAU en plein écran (`#hb`, blocs de `#srch` de COM) : trois onglets (MY CLOTHS · MY LUXURY · MY ACCOUNT, `my_boutique_board`) et, en tête, le PSEUDO — jamais une recherche. **[Decode a Totehm Cloth]**, au format de ses homologues, le retourne SUR PLACE et la recherche (`#decode-q`) s'écrit à son dos, le « 0. » posé ; le résultat paraît sous lui (`#dc-note`, `.dc-shots`). ⚠️ `nav{flex-direction:column}` règne : `#hb-tabs` dit `row` à voix haute ; `.fs-perf` (260) passe AU-DESSUS de `#hb` (240) ; un Enter dans `#decode-q` s'arrête là (`stopPropagation`) ; en écriture la pièce ne tourne plus (`HI.bloquer`, `.is-ecrit`). Puis Streetwear, Luxury. [Experience our dope branding] part sur totehm.space. Aucune illustration |
| `streetwear.html` | le vêtement, la box (ou celle déjà choisie depuis COM, `?wear=<kind>:<ref>`), le nom, le style, la taille |
| seau `totehm-cloth-support` | `<dossier>/` = les vues GÉNÉRALES · `<dossier>/print/` = la ZONE D'IMPRESSION (montrée à la commande). L'ordre vient des NOMS. Sans dossier : `image_url` (Printful, n8n F) |
| `luxury.html` | le Luxe, en plein écran comme streetwear : une PHOTO de la pièce (seau `luxury-pieces`, dossier du membre), le MÊME TOTEHM, un nom, puis **500 € pour déposer le projet** (`luxury_offer`, relu par `luxury-quote` ; remboursé si la pièce ne peut pas être travaillée) · HOW IT WORKS dit le métier : étude, préparation, peinture qui plie, tenue. Plus de manette : le parcours n'a plus de côtés. ⚠️ **NOIR ET GRIS** (27/10) : ce qui vient du TOTEHM garde son dessin EXACT (papiers perforés, box, mini-boxes, media perforé) ; tout ce que la boutique invente est du gris de figher.club (`--s2`, `--r`, le `.field` de `/create`) — la photo, le nom, une carte de devis (la couleur du Totehm n'y est qu'un rail de 3 px). Jamais de navy ailleurs |
| `terms_of_sale.html` | les conditions de vente |
| `art-bridge.html` | `/get_higher`, `/stoner`, `/market`… y sont réécrits : il consomme le code SSO de la boutique puis en émet un pour SPACE — c'est aussi là que revient l'achat du THP (`/stoner?checked=1`) |

## Le parcours d'une pièce

`draft` → **paid** (`stripe-webhook`, `cloth`) → **generating** (n8n B : sept concepts) → **curation** (Telegram ; n8n
C, `compose-artwork`) → **production** (n8n D) → **shipped** (n8n E) → l'œuvre visible (`cloth-art`).
- Le serveur pose le `0.` ; `create-checkout` v44 relit la box dans le Totehm de la session (une habit = son TEXTE).
- Une pièce de TEST (`boutique_testers`) suit le MÊME chemin jusqu'à l'œuvre composée puis s'arrête : `test_stop` ferme Printful et le suivi, `test_budget` limite à 3 générations par 7 jours, le stock reste intact.
- n8n F tient `totehm_cloth_support` depuis Printful (les photos de Wah ne sont jamais écrasées) ; prix, stock, édition viennent d'un « oui » de Wah, posé par la session cloud. **Jamais un prix dans une page.**
- **n8n B LIT les photos allumées** (26/10) : `box_snapshot.shots` → signées une heure → `gpt-4.1-mini` les regarde, et ce qu'il en dit entre dans le prompt comme MATIÈRE. Jamais une instruction, jamais chez Printful.

## Écarts connus

- **La chaîne n8n n'a encore jamais tourné** (zéro exécution) : B (republiée le 26/10, elle lit les photos), C, D lisent `$env` (11 clés, `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, `401` sans la clé de service) ; E reste sur l'ancien CONFIG et son brouillon accepte un événement non signé : `CLAUDE_CODE.md` §4. Banc : `offline.mjs` 62/62, 6 blocages connus.
- **L'essai visuel attend l'endpoint de test Stripe** — le SEUL trou du parcours de A à Z : `stripe-webhook` v44 est déployée, mais le mode test n'a AUCUN endpoint webhook, donc un paiement 4242 ne redescend jamais. Wah pose l'endpoint vers `…/functions/v1/stripe-webhook`, puis `STRIPE_TEST_SECRET_KEY` et `STRIPE_TEST_WEBHOOK_SECRET` dans les secrets Supabase (jamais dans le `.env` d'Oracle) ; sans la clé, [Order] répond `test_unavailable` (503).
- **COM** : « + totehmize » n'est offert que sur MY STORY. Le lien `?wear=<kind>:<ref>` est prêt. **Une seule porte** : tout passe par `totehm.com/auth` (PKCE) ; connecté, le nom ramène à COM.
Tests : `tests/browser/` streetwear (79), luxury (27), boutique_home (33), com_cloths (16), art_bridge (24) ;
`tests/sql/` streetwear_immersive, luxury, box_shots, boutique_board ; `tests/n8n/streetwear/offline.mjs`.
