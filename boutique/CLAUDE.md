# boutique/CLAUDE.md — higher.boutique

> L'état ACTUEL et les pièges (≤ 60 lignes). Le sens d'un vêtement : `BRAND.md`. Un lot réécrit ces lignes, en place.

Des vêtements totehmisés : **n'importe quelle box** du TOTEHM d'un membre, un style déterminé, produits par Printful.
**UNE STEP PAR ÉCRAN, EN PLEIN ÉCRAN** (25/10, Wah : « minimalisme, visibilité, une step à la fois, fluidité, focus
sur le centre ») : le vêtement, l'élément, le nom, le prix. Chaque scène prend tout l'écran et se centre (`.stage`,
`is-open` → `is-in`) ; celle qui part sort par le HAUT pendant que la suivante entre par le BAS, et on ne la retire
qu'à la fin du voyage (360 ms) — sinon l'écran saute. UN SEUL bouton mène à la suite (`#cl-go` Totehmize it, `#el-go`
Next). Retour = le « back » du navigateur. CE QUI RESTE se lit sous le nom : un compte BLANC en Quantico et une jauge
d'un pixel (le Coral est le NOM d'un TOTEHM, jamais un chiffre — `BRAND.md`). Boutons : ceux de COM. **Rien n'est
simulé** : ni pointillé d'impression, ni nom gravé d'avance — ORDER montre la PHOTO de la zone, l'œuvre arrive après.

**Le TOTEHM est la commande** : son logo — **les quatre calques de totehm.com copiés tels quels** (`#gl-bg` perforé,
`#gl-rail`, `#gl-t`, `#gl-wm`) — se décompose À SA PLACE : le FOND prend le dessus, le rail, le T et le mot FONDENT,
« MY GRIND » paraît, puis deux fonds glissent DEPUIS LUI : MY WISDOM STORY et MY VISION. Un tap sur MY GRIND empile
MY OBJECTIVES · MY HABITS · MY REPULSIONS dans son navy — les titres se LISENT (le padding cède, jamais le mot). Un
tap sur une vue donne ses boxes ; **une box tapée EST le choix** (aucun bouton, comme sur COM) : elle s'ouvre presque
entière — ses mini-boxes (`my_box_matter`) et le SON de son intention (`intention_music`) —, la liste se réduit à ELLE,
et la retaper la rouvre. **Une sous-box s'éteint d'un tap** (`button.mi.is-off`) : la page envoie `hide:[{kind,text}]`
et le serveur relit `_box_matter` puis la filtre — jamais un texte reçu. Les sept intentions sont une COUTURE sous les
papiers (UN seul `#tz-seam` : deux se dédoublent en silence). Scène NOIRE, les papiers portent la couleur.
**Le nom est un IDENTIFIANT** — minuscules, sans espace, petit, dans la BOÎTE NAVY PERFORÉE ; le `0.` est posé par le
serveur et s'explique à ce moment-là (« 0 = this collection, june to may »). Le PRIX n'arrive qu'à la fin.
⚠️ `tools/ecosystem_ui*` écrase la taille d'un bouton portant du texte : `#totehmize`, `#tz-papers` et `#matter` en
sont exemptés (dans la copie ET dans `tools/`) ; plié, un papier n'a pas de prise (`pointer-events:none`), sinon celui
de droite mange le tap du logo ; `.pap{min-width:0}`, sinon un titre long décentre le logo.

| fichier | rôle |
|---|---|
| `index.html` | l'accueil : **Decode en premier** (la boîte navy perforée, bouton ET saisie) — tapé, il devient une GRANDE saisie en Coral qui VIENT à l'utilisateur (`#decode-input`, `is-in` : elle grandit en place puis prend le curseur) ; puis Streetwear, Luxury. Aucune illustration : la totehmisation se vit dans le parcours, pas dans un dessin |
| `streetwear.html` | le vêtement, la box (ou celle déjà choisie depuis COM, `?wear=<kind>:<ref>`), le nom, le style, la taille |
| seau `totehm-cloth-support` | `<dossier>/` = les vues GÉNÉRALES (défilement ↑ ↓) · `<dossier>/print/` = la ZONE D'IMPRESSION (montrée à la commande). L'ordre vient des NOMS. Sans dossier : `image_url` (Printful, posée par n8n F) |
| `luxury.html` | le Luxe, en plein écran comme streetwear : une PHOTO de la pièce (seau `luxury-pieces`, dossier du membre), le MÊME TOTEHM, un nom, puis **500 € pour déposer le projet** (`luxury_offer`, relu par `luxury-quote` ; remboursé si la pièce ne peut pas être travaillée) · HOW IT WORKS dit le métier : étude, préparation, peinture qui plie, tenue. Plus de manette : le parcours n'a plus de côtés |
| `terms_of_sale.html` | les conditions de vente |
| `art-bridge.html` | `/get_higher`, `/stoner`, `/market`… y sont réécrits : il consomme le code SSO de la boutique puis en émet un pour SPACE — c'est aussi là que revient l'achat du THP (`/stoner?checked=1`) |

## Le parcours d'une pièce

`draft` → **paid** (`stripe-webhook`, `cloth`) → **generating** (n8n B : sept concepts) → **curation** (Telegram, Wah
choisit ; n8n C, `compose-artwork`) → **production** (n8n D : Printful) → **shipped** (n8n E) → l'œuvre visible (`cloth-art`).
- Le serveur pose le `0.` ; `create-checkout` v42 accepte les cinq vues, relit la box dans le Totehm de la session (la référence d'une habit est son TEXTE).
- Une pièce de TEST (`boutique_testers`, Stripe test) suit le MÊME chemin jusqu'à l'œuvre composée, puis s'arrête :
  `test_stop` ferme Printful et le suivi, `test_budget` limite à 3 générations par 7 jours, le stock reste intact.
- n8n F tient `totehm_cloth_support` depuis Printful (les photos de Wah ne sont jamais écrasées) ; prix, stock et
  édition viennent d'un « oui » de Wah, posé par la session cloud. Jamais un prix dans une page.

## Écarts connus

- **La chaîne n8n n'a encore jamais tourné** (zéro exécution) : B, C, D republiés le 23/10 avec le CONFIG qui lit `$env`
  (11 clés, `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, `401` sans la clé de service qu'envoie `stripe-webhook` en `apikey`) ;
  E reste sur l'ancien CONFIG, son brouillon accepte un événement non signé : `CLAUDE_CODE.md` §4. Banc : `tests/n8n/streetwear/offline.mjs` (59).
- **L'essai visuel attend l'endpoint de test Stripe** : `stripe-webhook` v44 déployée (une pièce d'essai suit le MÊME
  chemin) et `20261022130000_essai_visuel.sql` APPLIQUÉE (auto-test : `FAIL={}`), mais le mode test n'a AUCUN endpoint
  webhook — un paiement 4242 ne redescend jamais. Wah pose l'endpoint vers `…/functions/v1/stripe-webhook`, puis
  `STRIPE_TEST_SECRET_KEY` et `STRIPE_TEST_WEBHOOK_SECRET` dans les secrets Supabase (jamais dans le `.env` d'Oracle) ;
  sans la clé, [Order] répond `test_unavailable` (503).
- **COM** : « + totehmize » n'est offert que sur MY STORY. Le lien `?wear=<kind>:<ref>` est prêt ; le filtre de gauche EST le logo depuis le 24/10.
- **Une seule porte** : l'email OTP local est retiré (23/10) — tout passe par `totehm.com/auth` (PKCE) ; connecté, le nom ramène à COM.
Tests : `tests/browser/` streetwear, luxury, boutique_home, com_cloths, art_bridge ; `tests/sql/` streetwear_immersive, luxury.
