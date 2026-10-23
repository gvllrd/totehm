# boutique/CLAUDE.md — higher.boutique

> L'état ACTUEL et les pièges (≤ 60 lignes). Le sens d'un vêtement : `BRAND.md`. Un lot réécrit ces lignes, en place.

Des vêtements totehmisés : **n'importe quelle box** du TOTEHM d'un membre, un style artistique déterminé, produits par
Printful. Le numérique (THP, Stoner, Lisbon, Origins, marché) vit sur totehm.space.

**UN SEUL ÉCRAN QUI SE REMPLIT** (23/10) : plus de scènes plein écran, plus de vues latérales. Le vêtement en haut
(les curseurs du manche autour : ← → les modèles, ↑ ↓ ses vues), son nom, ce qui reste — puis le TOTEHM. Chaque étape
APPARAÎT sous la précédente et y reste ; la suivante n'existe pas encore. Retour = le geste « back » du navigateur.

**Le TOTEHM est la commande** : son logo — **les quatre calques de totehm.com, copiés tels quels** (`#gl-bg` perforé,
`#gl-rail`, `#gl-t`, `#gl-wm`, aux mêmes pourcentages) — se décompose À SA PLACE : le FOND prend le dessus pendant que
le rail, le T et le mot FONDENT, « MY GRIND » paraît, puis deux fonds glissent DEPUIS LUI vers les extrémités et
deviennent MY STORY et VISION. Un tap sur MY GRIND empile OBJECTIVE · HABIT · REPULSION au centre de son navy ; un tap
sur une vue donne ses boxes ; une box tapée devient le vêtement et la liste se réduit à ELLE. Revenir replie le logo.
Les sept intentions sont une COUTURE sous les papiers. Scène NOIRE, les papiers portent la couleur.
**Le nom est un IDENTIFIANT** — minuscules, sans espace, petit, dans la BOÎTE NAVY PERFORÉE ; le `0.` est posé par le
serveur et s'explique à ce moment-là (« 0 = this collection, june to may »). Le PRIX n'arrive qu'à la fin.
⚠️ `tools/ecosystem_ui*` transforme tout bouton qui porte du texte (`inline-size:fit-content!important`) : le logo et
les papiers en sont exemptés par `#totehmize` / `#tz-papers`, dans la copie ET dans `tools/ecosystem_ui_snippet.js`.
⚠️ Les papiers posés sur le logo (avant la décomposition) portent `pointer-events:none` : sinon celui de droite
intercepte le tap destiné au logo.

| fichier | rôle |
|---|---|
| `index.html` | l'accueil : **Decode en premier** (la boîte navy perforée, bouton ET saisie), puis Streetwear, Luxury |
| `streetwear.html` | le vêtement, la box (ou celle déjà choisie depuis COM, `?wear=<kind>:<ref>`), le nom, le style, la taille |
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
- **Le mode test Stripe n'a jamais servi** : `STRIPE_TEST_SECRET_KEY` et `STRIPE_TEST_WEBHOOK_SECRET` manquent — ils
  vivent dans les secrets Supabase (Edge Functions), pas dans le `.env` d'Oracle — donc [Order] répond
  `test_unavailable` (503) pour un compte de `boutique_testers` (`CLAUDE_CODE.md` §3).
- **L'essai visuel : la base est prête, le webhook non** — `20261022130000_essai_visuel.sql` APPLIQUÉE (auto-test en
  production : `FAIL={}`), mais le `stripe-webhook` déployé (v43) ne lance pas la génération d'un essai : jusqu'à son
  déploiement, on le lance à la main (POST `{"cloth_id"}` sur `n8n.higher.boutique/webhook/streetwear-generate`).
- **COM ne propose « + totehmize » que sur MY STORY** : la boutique accepte les cinq vues, c'est `com/totehm.html` qui
  doit suivre (le lien `?wear=<kind>:<ref>` est prêt).
- **Une seule porte pour se connecter** : l'email OTP local de l'accueil est retiré (23/10) — il ouvrait une session
  qui n'était celle d'aucun autre domaine. Tout passe par `totehm.com/auth` (PKCE) ; connecté, le nom ramène à COM.

Tests : `tests/browser/streetwear.mjs`, `boutique_home.mjs`, `com_cloths.mjs`, `art_bridge.mjs` ;
`tests/sql/streetwear_immersive_selftest.sql`, `luxury_*_selftest.sql`.
