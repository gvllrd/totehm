# CLAUDE_CODE.md — les tâches du terminal de Wah
> Ce qui exige sa machine (VM Oracle, n8n, `psql`). Une commande par ligne, aucun secret ici. Faite = section retirée.
## 1 · Le jeton de TotehmBot
`TELEGRAM_BOT_TOKEN` est présent, mais la sonde de production n’authentifie pas le bot. Dans Supabase → Edge Functions → Secrets (projet `abujjbkbbiumxrokozph`), poser le jeton valide de **@TotehmBot** obtenu via BotFather, sans le transmettre en conversation. La sonde privée `GET bot-reply?health=1` vérifie ensuite le bot et le webhook avec un jeton opérateur à usage unique ; aucun message d’essai n’est envoyé. Les trois migrations `20261110120000_tracking_core`, `20261110121000_tracking_delivery`, `20261110122000_tracking_summary` sont appliquées une seule fois ; ne pas les rejouer.
## 2 · La VM, quand tu y passes
Les cinq flux sont à jour et republiés ; plus aucun nœud `CONFIG` ne verse de clé dans les items. Vérifier que les onze
clés des Code nodes et `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` du `docker-compose.yml` correspondent au `.env`, et qu'un
Code node lit `$env.SB_KEY`.
    supabase functions deploy stripe-webhook --project-ref abujjbkbbiumxrokozph
    node tests/n8n/streetwear/offline.mjs                                   (attendu : 80 succès, zéro blocage)
`TOTEHM_MASTER.md`, en tête : « Domaines et accès : remplacés le 21/10/2026 par CLAUDE.md, La vision ».
