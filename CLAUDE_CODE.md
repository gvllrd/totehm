# CLAUDE_CODE.md — la tâche de Claude Code (terminal de Wah)

> Depuis le 30/09/2026, la session cloud de Claude fait tout ce qui passe par
> Internet (code, base, fonctions, fusion, Vercel, Stripe). Claude Code ne
> reçoit ici que ce qui exige la machine de Wah : **la VM Oracle, docker
> compose, caddy, n8n, le master**. Une commande simple par ligne. Aucun
> secret dans ce fichier.

## Tâche en cours — 01/10/2026 · le ménage en base (une approbation)

La session cloud ne peut pas faire approuver un `drop`. Toi, si.

1. `git pull` dans `~/totehm`
2. MCP Supabase `apply_migration`, nom `20261001_b_menage`, contenu = `backend/supabase/migrations/20261001_b_menage.sql` (approuve)
3. MCP Supabase `execute_sql` avec le contenu de `tests/sql/spots_selftest.sql`
4. Attendu : une erreur « SELFTEST (rolled back): … | FAIL={} » (c'est le succès : tout est annulé)
5. Rapport : une ligne par étape, la valeur mesurée.

## À reporter dans `~/totehm/TOTEHM_MASTER.md` §0 (à ta prochaine intervention)

Ajoute, telle quelle, l'entrée **0.21 — 01/10/2026 · Pour soi, ou pour soi et les autres** :

> COM et SPACE sont gratuits pour soi. SPACE = DO WITH ME : un seul Spot,
> une Habit + une vidéo de 33 s filmée maintenant + une durée, PRIVATE ou
> SHARED (SILENT/SOCIAL, LOCATION ON/OFF), I AM HERE → I WAS THERE (déduit
> de l'heure). Plus de futur, capacité, candidature, sélection, accès par
> Spot, Short-Live, %. Cinq vues : recherche d'Habit · fil vidéo · radar des
> points autorisés · liste · caméra ; sept filtres (LOVE par défaut).
> Totehm : PRIVATE ou VISIBLE TO MY SUBSCRIBERS. Abonnement créateur ANNUEL,
> prix du créateur, 80/20, sans passeport FIGHER ; il ouvre le Totehm
> partagé et le point exact des Spots SHARED·ON. Console sur totehm.com.
> TotehmBot / Higher Self = offre séparée 7 €/mois (lot dédié). Space Mono et
> Quantico seulement, aucun fond blanc, tuile navy = nom du Totehm,
> conditions en dernier dans le menu membre. Migration
> `20261001_un_spot_deux_reglages.sql`.

## Le rapport

Un tableau : ce qui a été fait, la valeur mesurée, ce qui n'a pas pu l'être.
