# CLAUDE_CODE.md — les tâches du terminal de Wah

> Ce qui exige sa machine (VM Oracle, n8n, `psql`). Une commande par ligne, aucun secret ici. Faite = section retirée.

## 1 · `club_spots` délègue à son cœur — prête

    psql "$SUPABASE_DB_URL" -f backend/supabase/migrations/20261020181000_club_spots_coeur.sql
    psql "$SUPABASE_DB_URL" -f tests/sql/ecosysteme_membre_selftest.sql      (attendu : FAIL={})

## 2 · ⛔ Les lecteurs de la confidentialité par box — NE PAS appliquer

`20261018091000_audience_par_box_lecteurs.sql` attend la pastille de niveau sur chaque box dans totehm.com (absente le
21/10). Avant elle, il cacherait les boxes nées depuis le 18/10, sans moyen de les rouvrir.

## 3 · Le mode test Stripe — les deux secrets manquent

    supabase secrets list --project-ref abujjbkbbiumxrokozph

Wah crée en mode TEST un endpoint vers `…/functions/v1/stripe-webhook` (`checkout.session.completed`), puis
`supabase secrets set STRIPE_TEST_SECRET_KEY=… STRIPE_TEST_WEBHOOK_SECRET=…` — jamais par une conversation.
Sans elles, [Order] sur `/streetwear` répond `test_unavailable` (503) : aucun essai possible.

## 4 · La chaîne n8n — une seule session, dans cet ordre

    supabase functions deploy stripe-webhook --project-ref abujjbkbbiumxrokozph

Il envoie maintenant `apikey` à B. Puis : le brouillon de E doit refuser un événement non signé et une pièce TEST
(il les accepte) ; publier B, C, D, E ENSEMBLE ; `node tests/n8n/streetwear/offline.mjs` (59 succès) ; une pièce
RÉELLE pour l'essai — une TEST ne génère rien et sept images coûtent chez OpenAI/Replicate.
En tête de `TOTEHM_MASTER.md` : « Domaines et accès : remplacés le 21/10/2026 par CLAUDE.md, La vision ».
