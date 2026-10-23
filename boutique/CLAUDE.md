# boutique/CLAUDE.md — higher.boutique

> L'état ACTUEL et les pièges (≤ 60 lignes). Le sens d'un vêtement : `BRAND.md`. Un lot réécrit ces lignes, en place.

Des vêtements totehmisés : une box MY STORY du TOTEHM d'un membre, un style artistique déterminé, produits par Printful.
Le numérique (THP, Stoner, Lisbon, Origins, marché) vit sur totehm.space.

| fichier | rôle |
|---|---|
| `index.html` | l'accueil : Streetwear, Luxury, Decode (retrouver une pièce par son nom, `reveal_cloth`) |
| `streetwear.html` | la box MY STORY (déjà choisie depuis COM, `?from=com`), le style, la taille, connexion avant paiement |
| `luxury.html` | le Luxe sur devis (`luxury-quote`, puis `luxury-checkout`) |
| `terms_of_sale.html` | les conditions de vente |
| `art-bridge.html` | `/get_higher`, `/stoner`, `/market`… y sont réécrits : il consomme le code SSO de la boutique puis en émet un pour SPACE — c'est aussi là que revient l'achat du THP (`/stoner?checked=1`) |

## Le parcours d'une pièce

`draft` → **paid** (`stripe-webhook`, `cloth`) → **generating** (n8n B : sept concepts) → **curation** (Telegram, Wah
choisit ; n8n C, `compose-artwork`) → **production** (n8n D : Printful) → **shipped** (n8n E) → l'œuvre visible (`cloth-art`).
- Le serveur pose le préfixe `0.` du nom ; `create-checkout` n'accepte qu'une box `wisdom`.
- Une pièce de TEST (`boutique_testers`, Stripe test) suit le MÊME chemin jusqu'à l'œuvre composée, puis s'arrête :
  `test_stop` ferme Printful et le suivi, `test_budget` limite les essais à 3 générations par 7 jours, et le stock
  n'est jamais consommé. Wah juge les visuels avec un faux paiement, sans qu'un vêtement parte.
- n8n F tient `totehm_cloth_support` depuis Printful ; les photos choisies par Wah ne sont jamais écrasées.
- Prix, stock, édition : un « oui » de Wah, posé par la session cloud. Jamais un prix dans une page.

## Écarts connus

- **La chaîne n8n n'a jamais tourné** : B, C, D, E sont publiés avec un CONFIG qui lit `process.env`, absent du
  runtime d'un Code node (zéro exécution enregistrée). Leurs brouillons sécurisés (`$env`) attendent d'être publiés
  ENSEMBLE, et celui de E accepte encore un événement non signé : `CLAUDE_CODE.md` §4. `stripe-webhook` envoie la clé
  de service à B en en-tête `apikey`. Banc hors réseau : `node tests/n8n/streetwear/offline.mjs` (59 succès).
- **Le mode test Stripe n'a jamais servi** : `STRIPE_TEST_SECRET_KEY` et `STRIPE_TEST_WEBHOOK_SECRET` manquent — ils
  vivent dans les secrets Supabase (Edge Functions), pas dans le `.env` d'Oracle — donc [Order] répond
  `test_unavailable` (503) pour un compte de `boutique_testers` (`CLAUDE_CODE.md` §3).
- **L'essai visuel : la base est prête, le webhook non** — `20261022130000_essai_visuel.sql` est APPLIQUÉE
  (auto-test en production : `FAIL={}`), mais le `stripe-webhook` déployé (v43) ne lance pas la génération d'une
  pièce de test : jusqu'à son déploiement, un essai se lance à la main (POST `{"cloth_id"}` sur
  `n8n.higher.boutique/webhook/streetwear-generate`, en-tête `apikey` = clé de service).
- **Luxury accepte les cinq vues** (`luxury-quote`) alors que la vision dit MY STORY seulement : à trancher par Wah.

Tests : `tests/browser/streetwear.mjs`, `boutique_home.mjs`, `com_cloths.mjs`, `art_bridge.mjs` ;
`tests/sql/streetwear_immersive_selftest.sql`, `luxury_*_selftest.sql`.
