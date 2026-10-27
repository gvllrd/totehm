# CLAUDE_CODE.md — les tâches du terminal de Wah

> Ce qui exige sa machine (VM Oracle, n8n, `psql`). Une commande par ligne, aucun secret ici. Faite = section retirée.
## 1 · Prêtes : `club_spots` délègue à son cœur · l'ancien `my_dashboard` part (remplacé par `my_board`, 24/10)
    psql "$SUPABASE_DB_URL" -f backend/supabase/migrations/20261020181000_club_spots_coeur.sql
    psql "$SUPABASE_DB_URL" -f tests/sql/ecosysteme_membre_selftest.sql      (attendu : FAIL={})
    psql "$SUPABASE_DB_URL" -c "drop function public.my_dashboard(text)"

## 2 · Prêts : les lecteurs par box (la pastille existe depuis le 26/10 ; COM lit déjà par `totehm_read`)
    psql "$SUPABASE_DB_URL" -f backend/supabase/migrations/20261018091000_audience_par_box_lecteurs.sql
    psql "$SUPABASE_DB_URL" -f tests/sql/visibilite_par_box_selftest.sql      (attendu : FAIL={})

## 3 · Le mode test Stripe — les deux secrets manquent (Supabase, pas Oracle)
    supabase secrets list --project-ref abujjbkbbiumxrokozph

Wah crée en mode TEST un endpoint vers `…/functions/v1/stripe-webhook` (`checkout.session.completed`), puis
`supabase secrets set STRIPE_TEST_SECRET_KEY=… STRIPE_TEST_WEBHOOK_SECRET=…`. Sinon [Order] répond 503.

## 4 · La chaîne n8n — l'essai visuel est en base depuis le 23/10 (session cloud)
    supabase functions deploy stripe-webhook --project-ref abujjbkbbiumxrokozph
    node tests/n8n/streetwear/offline.mjs                                    (attendu : 59 succès)

Le déploiement attend l'API Management ; sans lui, un essai se lance à la main (POST `{"cloth_id"}` sur
`n8n.higher.boutique/webhook/streetwear-generate`, en-tête `apikey` = clé de service).

Sur la VM : les onze clés des Code nodes et `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` sont maintenant dans
`docker-compose.yml` — les comparer au `.env`, `docker compose up -d`, vérifier qu'un Code node lit `$env.SB_KEY`.
Puis le brouillon de E doit refuser un événement non signé et une pièce TEST (il les accepte) ; publier B, C, D, E
ENSEMBLE. Un faux paiement lance alors sept images et Telegram, rien ne part chez Printful.
`TOTEHM_MASTER.md`, en tête : « Domaines et accès : remplacés le 21/10/2026 par CLAUDE.md, La vision ».
