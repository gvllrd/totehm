# CLAUDE_CODE.md — les tâches du terminal de Wah

> Ce qui exige sa machine (VM Oracle, n8n, `psql`). Une commande par ligne, aucun secret ici. Faite = section retirée.

## 1 · `club_spots` délègue à son cœur — prête

    psql "$SUPABASE_DB_URL" -f backend/supabase/migrations/20261020181000_club_spots_coeur.sql
    psql "$SUPABASE_DB_URL" -f tests/sql/ecosysteme_membre_selftest.sql      (attendu : FAIL={})

## 2 · ⛔ Les lecteurs de la confidentialité par box — NE PAS appliquer
`20261018091000_audience_par_box_lecteurs.sql` attend la pastille de niveau sur chaque box : avant elle, il cacherait
les boxes nées depuis le 18/10, sans moyen de les rouvrir.

## 3 · Le mode test Stripe — les deux secrets manquent (Supabase, pas Oracle)

    supabase secrets list --project-ref abujjbkbbiumxrokozph

Wah crée en mode TEST un endpoint vers `…/functions/v1/stripe-webhook` (`checkout.session.completed`), puis
`supabase secrets set STRIPE_TEST_SECRET_KEY=… STRIPE_TEST_WEBHOOK_SECRET=…`. Sinon [Order] répond 503.

## 4 · L'essai visuel et la chaîne n8n — une seule session, dans cet ordre

    psql "$SUPABASE_DB_URL" -f backend/supabase/migrations/20261022130000_essai_visuel.sql
    psql "$SUPABASE_DB_URL" -f tests/sql/essai_visuel_selftest.sql           (attendu : FAIL={})
    supabase functions deploy stripe-webhook --project-ref abujjbkbbiumxrokozph
    node tests/n8n/streetwear/offline.mjs                                    (attendu : 59 succès)

Sur la VM : les onze clés des Code nodes et `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` sont maintenant dans
`docker-compose.yml` — les comparer au `.env` du serveur, `docker compose up -d`, vérifier qu'un Code node lit
`$env.SB_KEY`. Puis le brouillon de E doit refuser un événement non signé et une pièce TEST (il les accepte) ;
publier B, C, D, E ENSEMBLE. Un faux paiement lance alors sept images et Telegram, rien ne part chez Printful.
`TOTEHM_MASTER.md`, en tête : « Domaines et accès : remplacés le 21/10/2026 par CLAUDE.md, La vision ».
