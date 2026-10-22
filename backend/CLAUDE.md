# backend/CLAUDE.md — la base, les fonctions, l'argent, le bot

> L'état ACTUEL et les pièges (≤ 60 lignes). Servi par personne : `backend/` n'entre jamais dans un dossier déployé.

## La base — Supabase `abujjbkbbiumxrokozph`

- Une migration s'applique UNE fois, son fichier reste dans `supabase/migrations/` (jamais `db push`). Ce qui ne
  passe pas du cloud → `CLAUDE_CODE.md`. Chaque migration a son auto-test `tests/sql/*_selftest.sql` (tout annulé,
  attendu `FAIL={}`). Grants après le dernier `create` ; `search_path` vide.
- **Le modèle est fermé** : HABITS = `totehms.steps` (un jsonb réécrit en entier par `cloudSave`) · `objectives` ·
  `repulsions` · `visions` · `wisdom` (MY STORY) ; liens = tables de jointure. Sept intentions (`check`),
  `intentions_set` pose `is` et `i`. Médias : seau `element-media`. Spots : `spot_plans` (point exact, lu par fonction).

## Les droits

- Membre du Club : `_figher().member` = habit + objectif + répulsion (`needs` dit ce qui manque). Accès offert = `figher_comps`.
- Abonné : `_subscriber_of(créateur, fan)` ; `creator_page`, `my_entitlements`, `totehm_of`, `member_media`, `club_spots_of`.
- Audience : `private` · `figher` · `subscribers` (`public` est normalisé en `figher`) ; `_audience_ok`, `_audience_listed`,
  `_point_ok`. Sans compte : seulement des NOMS (`totehm_galaxy`, `totehm_search`).
- Par box : colonne `audience` + table `habit_audience`, règle `_box_shared`, écrivains `box_audience_put` / `_set`.
  **Inachevé** : aucune page ne les appelle ; `totehm_of` et les politiques lisent encore `_shared_with_me`.

## L'argent

- `member_ledger` en ajout seul : crédit sur `invoice.paid`, idempotence `unique(source, kind)`, l'arrondi va à TOTEHM.
  80/20 ; revente 7 %. Versement manuel le 1er : `payouts_due()` → virement → `payout_mark_paid()`. Pas de Stripe Connect.
- Propriété : `art_editions` · `art_transfers` (ajout seul) · `stoner_access` ; le THP = l'œuvre `totehmpaper`.
  Le marché ne s'écrit que par le webhook (`art_settle`) ; `ok:false` → `market_incidents` = remboursement à la main.
- `stripe-webhook` : `higher` · `cloth` · `subscription` · `creator_sub` · `artwork` · `resale` · `luxury` · `higher_sub` ;
  `stripe_events` s'efface avant un 500. Mode test (`boutique_testers`) : jamais exercé, secrets à confirmer.

## Les 40 Edge Functions (`supabase/functions/`)

| rôle | fonctions |
|---|---|
| identité | `sso-mint` · `sso-redeem` |
| argent | `stripe-webhook` · `higher-checkout` · `artwork-checkout` · `market-checkout` · `creator-subscribe` · `creator-price` · `club-billing` · `higher-sub` |
| vêtements | `create-checkout` · `luxury-quote` · `luxury-checkout` · `compose-artwork` · `streetwear-assets` · `cloth-art` |
| vidéo, spots | `create-bunny-upload` · `bunny-video` · `bunny-webhook` · `spot-video` · `space-delete` |
| Higher Self, bot | `higher-self` · `bot-reply` · `bot-tick` (cron) · `agenda-ingest` (cron) · `higher-map` · `stoner-gate` |
| sans appelant visible | `totehm-bot` · `sync-knowledge` · `generate-embeddings` · `upload-leaf-videos` · `ghost-factory` · `prospects` · `bunny-maintenance` · `embed-places` · `generate_objective` · `subscription-checkout` · `creator-dashboard` · `creator-onboard` · `autobiographiste` (à vérifier dans leurs journaux avant de retirer) |

Le compte vient TOUJOURS de la session, jamais du corps ; une page ne reçoit que des nombres déjà calculés.

## Le bot et le Higher Self

- TotehmBot (Telegram) n'a pas de voix : jamais « je » ; les mots du membre ou un nombre. Zéro appel de modèle.
  Relances `push_decision` au rythme de chaque Habit, 6 par jour au plus.
- Higher Self (↓ de totehm.com, `higher-self`) : un LLM qui cite le TOTEHM du membre, vérifié mot pour mot ; gratuit
  limité (`_sm_rules`), puis `higher_sub`.

## n8n

`n8n/README.md` (VM Oracle) · `n8n/workflows/` (A → F). n8n n'accorde jamais un accès. F corrigé ; B/C/D/E
publiés avec l'ancien CONFIG. `tests/n8n/streetwear/offline.mjs` : 59 simulations sur exports archivés,
fournisseurs et RPC simulés ; six blocages détectés. La chaîne réelle reste à raccorder et tester.

Avis Supabase (21/10) : 2 ERROR connus (`higher_badges` lit `auth.users` pour `id`, `pseudo` ; 4 vues `security definer`,
dont `signature_styles` qui montre `system_prompt_prefix`).