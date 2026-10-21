# CLAUDE_CODE.md — les tâches du terminal de Wah

> Seulement ce qui exige sa machine (VM Oracle, n8n, `psql`). Une commande simple par ligne. Aucun secret ici.
> Tâche faite = section supprimée, mesure dans le message du commit.

## 1 · `club_spots` délègue à son cœur — prête

    psql "$SUPABASE_DB_URL" -f backend/supabase/migrations/20261020181000_club_spots_coeur.sql
    psql "$SUPABASE_DB_URL" -f tests/sql/ecosysteme_membre_selftest.sql      (attendu : FAIL={})

## 2 · ⛔ Les lecteurs de la confidentialité par box — NE PAS appliquer

`20261018091000_audience_par_box_lecteurs.sql` attend la pastille de niveau sur chaque box dans totehm.com (absente le
21/10). Avant elle, il cacherait les boxes nées depuis le 18/10, sans moyen de les rouvrir.

## 3 · Le mode test Stripe — à confirmer

    supabase secrets list --project-ref abujjbkbbiumxrokozph

S'il manque `STRIPE_TEST_SECRET_KEY` ou `STRIPE_TEST_WEBHOOK_SECRET` : Wah crée en mode test un endpoint vers
`…/functions/v1/stripe-webhook` (`checkout.session.completed`) et colle les deux valeurs ICI, avec `supabase secrets set`.

## 4 · n8n — ne rien publier seul

B et D tournent sur leurs anciennes versions, sans authentification. Leurs brouillons sécurisés se publient le jour où
`stripe-webhook` envoie la clé de service (lot cloud) : publier alors B, C, D et E ensemble, puis rejouer un achat test.

## 5 · Le master

En tête de `TOTEHM_MASTER.md` : « Domaines et accès : remplacés le 21/10/2026 par CLAUDE.md, La vision ».
