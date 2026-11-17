# CLAUDE_CODE.md — les tâches du terminal de Wah
> Ce qui exige sa machine (VM Oracle, n8n, `psql`, la CLI Supabase). Une commande par ligne, aucun secret ici. Faite = section retirée.
## 1 · Supprimer les douze fonctions Edge retirées
Elles répondent 410 en production depuis le 16/11 et ont quitté le dépôt (aucun appelant). Depuis `backend/` :
    supabase functions delete totehm-bot --project-ref abujjbkbbiumxrokozph
    supabase functions delete sync-knowledge --project-ref abujjbkbbiumxrokozph
    supabase functions delete generate-embeddings --project-ref abujjbkbbiumxrokozph
    supabase functions delete upload-leaf-videos --project-ref abujjbkbbiumxrokozph
    supabase functions delete ghost-factory --project-ref abujjbkbbiumxrokozph
    supabase functions delete embed-places --project-ref abujjbkbbiumxrokozph
    supabase functions delete generate_objective --project-ref abujjbkbbiumxrokozph
    supabase functions delete autobiographiste --project-ref abujjbkbbiumxrokozph
    supabase functions delete creator-onboard --project-ref abujjbkbbiumxrokozph
    supabase functions delete creator-dashboard --project-ref abujjbkbbiumxrokozph
    supabase functions delete higher-self --project-ref abujjbkbbiumxrokozph
    supabase functions delete prospects --project-ref abujjbkbbiumxrokozph
## 2 · La VM, quand tu y passes
Vérifier que les onze clés des Code nodes et `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` du `docker-compose.yml` correspondent
au `.env`, et qu'un Code node lit `$env.SB_KEY`.
    node tests/n8n/streetwear/offline.mjs                                   (attendu : 80 succès, zéro blocage)
`TOTEHM_MASTER.md`, en tête : « Domaines et accès : remplacés le 21/10/2026 par CLAUDE.md, La vision ».
