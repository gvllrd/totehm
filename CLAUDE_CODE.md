# CLAUDE_CODE.md — les tâches du terminal de Wah
> Ce qui exige sa machine (VM Oracle, n8n, `psql`). Une commande par ligne, aucun secret ici. Faite = section retirée.
## 1 · Deux migrations prêtes : `club_spots` délègue à son cœur · les lecteurs par box
    psql "$SUPABASE_DB_URL" -f backend/supabase/migrations/20261020181000_club_spots_coeur.sql
    psql "$SUPABASE_DB_URL" -f tests/sql/ecosysteme_membre_selftest.sql      (attendu : FAIL={})
    psql "$SUPABASE_DB_URL" -c "drop function public.my_dashboard(text)"
    psql "$SUPABASE_DB_URL" -f backend/supabase/migrations/20261018091000_audience_par_box_lecteurs.sql
    psql "$SUPABASE_DB_URL" -f tests/sql/visibilite_par_box_selftest.sql     (attendu : FAIL={})
## 2 · Un secret à revoir
`TELEGRAM_BOT_TOKEN` manque ou est périmé côté Supabase (six fonctions le lisent) ; le `TG_TOKEN` de la VM est bon :
    supabase secrets list --project-ref abujjbkbbiumxrokozph | grep TELEGRAM
## 3 · La VM, quand tu y passes
Les cinq flux sont à jour et republiés ; plus aucun nœud `CONFIG` ne verse de clé dans les items. Vérifier que les onze
clés des Code nodes et `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` du `docker-compose.yml` correspondent au `.env`, et qu'un
Code node lit `$env.SB_KEY`.
    supabase functions deploy stripe-webhook --project-ref abujjbkbbiumxrokozph
    node tests/n8n/streetwear/offline.mjs                                   (attendu : 78 succès, zéro blocage)
`TOTEHM_MASTER.md`, en tête : « Domaines et accès : remplacés le 21/10/2026 par CLAUDE.md, La vision ».
