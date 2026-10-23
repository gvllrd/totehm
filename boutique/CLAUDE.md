# boutique/CLAUDE.md — higher.boutique

> L'état ACTUEL et les pièges (≤ 60 lignes). Le sens d'un vêtement : `BRAND.md`. Un lot réécrit ces lignes, en place.

Des vêtements totehmisés : **n'importe quelle box** du TOTEHM d'un membre, un style artistique déterminé, produits par
Printful. Le numérique (THP, Stoner, Lisbon, Origins, marché) vit sur totehm.space.

**UN SEUL ÉCRAN QUI SE REMPLIT** : ni scène plein écran, ni vue latérale. Le vêtement en haut (les curseurs du manche
autour : ← → les modèles, ↑ ↓ ses vues), son nom, ce qui reste — puis le TOTEHM. Chaque étape APPARAÎT sous la
précédente et y reste ; la suivante n'existe pas encore. Retour = le « back » du navigateur. Boutons : ceux de COM.

**Le TOTEHM est la commande** : son logo — **les quatre calques de totehm.com copiés tels quels** (`#gl-bg` perforé,
`#gl-rail`, `#gl-t`, `#gl-wm`, mêmes pourcentages) — se décompose À SA PLACE : le FOND prend le dessus, le rail, le T
et le mot FONDENT, « MY GRIND » paraît, puis deux fonds glissent DEPUIS LUI aux extrémités : MY STORY et VISION.
Un tap sur MY GRIND empile OBJECTIVE · HABIT · REPULSION au centre de son navy ; un tap
sur une vue donne ses boxes. Une box tapée s'ouvre PRESQUE ENTIÈRE — ses mini-boxes DANS elle (`my_box_matter`) et le
SON de son intention (`intention_music`) —, puis elle devient le vêtement et la liste se réduit à ELLE ; la retaper, ou
taper une vue, rouvre la liste : on change d'avis sans rien perdre. Revenir au vêtement replie le logo.
Les sept intentions sont une COUTURE sous les papiers. Scène NOIRE, les papiers portent la couleur.
**Le nom est un IDENTIFIANT** — minuscules, sans espace, petit, dans la BOÎTE NAVY PERFORÉE ; le `0.` est posé par le
serveur et s'explique à ce moment-là (« 0 = this collection, june to may »). Le PRIX n'arrive qu'à la fin.
⚠️ `tools/ecosystem_ui*` écrase la taille de tout bouton qui porte du texte : le logo et les papiers en sont exemptés
(`#totehmize`, `#tz-papers`, dans la copie ET dans `tools/`), et les papiers pliés n'ont pas de prise
(`pointer-events:none`) — sinon celui de droite mange le tap du logo.

| fichier | rôle |
|---|---|
| `index.html` | l'accueil : **Decode en premier** (la boîte navy perforée, bouton ET saisie), puis Streetwear, Luxury |
| `streetwear.html` | le vêtement, la box (ou celle déjà choisie depuis COM, `?wear=<kind>:<ref>`), le nom, le style, la taille |
| seau `totehm-cloth-support` | `<dossier>/` = les vues GÉNÉRALES (défilement ↑ ↓) · `<dossier>/print/` = la ZONE D'IMPRESSION (l'aperçu de commande s'y pose). L'ordre vient des NOMS. Sans dossier : `image_url` (Printful, posée par n8n F) |
| `luxury.html` | le Luxe sur devis (`luxury-quote`, puis `luxury-checkout`) |
| `terms_of_sale.html` | les conditions de vente |
| `art-bridge.html` | `/get_higher`, `/stoner`, `/market`… y sont réécrits : il consomme le code SSO de la boutique puis en émet un pour SPACE — c'est aussi là que revient l'achat du THP (`/stoner?checked=1`) |

## Le parcours d'une pièce

`draft` → **paid** (`stripe-webhook`, `cloth`) → **generating** (n8n B : sept concepts) → **curation** (Telegram, Wah
choisit ; n8n C, `compose-artwork`) → **production** (n8n D : Printful) → **shipped** (n8n E) → l'œuvre visible (`cloth-art`).
- Le serveur pose le préfixe `0.` du nom ; `create-checkout` v42 accepte les cinq vues (`wisdom · vision · objective ·
  habit · repulsion`) et relit la box dans le Totehm de la session. La référence d'une habit est son TEXTE.
- Une pièce de TEST (`boutique_testers`, Stripe test) suit le MÊME chemin jusqu'à l'œuvre composée, puis s'arrête :
  `test_stop` ferme Printful et le suivi, `test_budget` limite les essais à 3 générations par 7 jours, et le stock
  n'est jamais consommé. Wah juge les visuels avec un faux paiement, sans qu'un vêtement parte.
- n8n F tient `totehm_cloth_support` depuis Printful ; les photos choisies par Wah ne sont jamais écrasées.
- Prix, stock, édition : un « oui » de Wah, posé par la session cloud. Jamais un prix dans une page.

## Écarts connus

- **La chaîne n8n n'a jamais tourné** : B, C, D, E publiés avec un CONFIG qui lit `process.env`, absent d'un Code node
  (zéro exécution). Leurs brouillons (`$env`) attendent une publication ENSEMBLE, et celui de E accepte un événement
  non signé : `CLAUDE_CODE.md` §4. `stripe-webhook` envoie `apikey` à B. Banc : `tests/n8n/streetwear/offline.mjs` (59).
- **Mode test Stripe** : `STRIPE_TEST_SECRET_KEY` et `STRIPE_TEST_WEBHOOK_SECRET` vivent dans les secrets Supabase
  (Edge Functions), jamais dans le `.env` d'Oracle ; sans eux [Order] répond `test_unavailable` (503).
- **L'essai visuel : la base est prête, le webhook non** — `20261022130000_essai_visuel.sql` APPLIQUÉE (auto-test en
  production : `FAIL={}`), mais le `stripe-webhook` déployé (v43) ne lance pas la génération d'un essai : jusqu'à son
  déploiement, on le lance à la main (POST `{"cloth_id"}` sur `n8n.higher.boutique/webhook/streetwear-generate`).
- **COM ne propose « + totehmize » que sur MY STORY** et son filtre de gauche n'est pas encore le LOGO qui se
  décompose (`#lv-sh-pick`) : les deux attendent un lot COM ; le lien `?wear=<kind>:<ref>` est prêt.
- **Une seule porte pour se connecter** : l'email OTP local de l'accueil est retiré (23/10) — il ouvrait une session
  qui n'était celle d'aucun autre domaine. Tout passe par `totehm.com/auth` (PKCE) ; connecté, le nom ramène à COM.

Tests : `tests/browser/streetwear.mjs`, `boutique_home.mjs`, `com_cloths.mjs`, `art_bridge.mjs` ;
`tests/sql/streetwear_immersive_selftest.sql`, `luxury_*_selftest.sql`.
