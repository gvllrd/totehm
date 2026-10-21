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
- Une pièce de TEST (`boutique_testers`, Stripe test) ne lance jamais la génération.
- n8n F tient `totehm_cloth_support` depuis Printful ; les photos choisies par Wah ne sont jamais écrasées.
- Prix, stock, édition : un « oui » de Wah, posé par la session cloud. Jamais un prix dans une page.

## Écarts connus

- **n8n B et D publiés sans authentification** (adresses visibles dans ce dépôt public) ; leurs versions sécurisées
  sont en brouillon, et `stripe-webhook` appelle B sans en-tête : les publier seules casserait la génération (`CLAUDE_CODE.md` §4).
- **Luxury accepte les cinq vues** (`luxury-quote`) alors que la vision dit MY STORY seulement : à trancher par Wah.

Tests : `tests/browser/streetwear.mjs`, `boutique_home.mjs`, `com_cloths.mjs`, `art_bridge.mjs` ;
`tests/sql/streetwear_immersive_selftest.sql`, `luxury_*_selftest.sql`.
