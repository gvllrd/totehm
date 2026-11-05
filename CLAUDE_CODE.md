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
## 3 · E est la dernière du streetwear à ne pas être à jour
Sa version PUBLIÉE garde un nœud `⚙️ CONFIG` qui verse `SB_KEY` dans les items du flux, et non dans les seuls en-têtes.
Le brouillon qui le supprime attend : il accepte encore un événement non signé et une pièce d'essai. B, C, D
et F sont à jour. Sur la VM, vérifier que les onze clés des Code nodes et `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`
du `docker-compose.yml` correspondent au `.env`, et qu'un Code node lit `$env.SB_KEY`.
    supabase functions deploy stripe-webhook --project-ref abujjbkbbiumxrokozph
    node tests/n8n/streetwear/offline.mjs                                   (attendu : 83 succès)
`TOTEHM_MASTER.md`, en tête : « Domaines et accès : remplacés le 21/10/2026 par CLAUDE.md, La vision ».
