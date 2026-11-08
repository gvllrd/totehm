# CLAUDE_CODE.md — les tâches du terminal de Wah
> Ce qui exige sa machine (VM Oracle, n8n, `psql`). Une commande par ligne, aucun secret ici. Faite = section retirée.
## 1 · Un secret à revoir
`TELEGRAM_BOT_TOKEN` manque ou est périmé côté Supabase (six fonctions le lisent) ; le `TG_TOKEN` de la VM est bon :
    supabase secrets list --project-ref abujjbkbbiumxrokozph | grep TELEGRAM
## 2 · La VM, quand tu y passes
Les cinq flux sont à jour et republiés ; plus aucun nœud `CONFIG` ne verse de clé dans les items. Vérifier que les onze
clés des Code nodes et `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` du `docker-compose.yml` correspondent au `.env`, et qu'un
Code node lit `$env.SB_KEY`.
    supabase functions deploy stripe-webhook --project-ref abujjbkbbiumxrokozph
    node tests/n8n/streetwear/offline.mjs                                   (attendu : 80 succès, zéro blocage)
`TOTEHM_MASTER.md`, en tête : « Domaines et accès : remplacés le 21/10/2026 par CLAUDE.md, La vision ».
