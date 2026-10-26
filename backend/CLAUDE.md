# backend/CLAUDE.md — la base, les fonctions, l'argent, le bot

> L'état ACTUEL et les pièges (≤ 60 lignes). Servi par personne : `backend/` n'entre jamais dans un dossier déployé.

## La base — Supabase `abujjbkbbiumxrokozph`

- Une migration s'applique UNE fois, son fichier reste dans `supabase/migrations/` (jamais `db push`) ; ce qui ne passe
  pas du cloud → `CLAUDE_CODE.md`. Auto-test `tests/sql/*_selftest.sql` (`FAIL={}`). Grants après le dernier `create`.
- **Le modèle est fermé** : HABITS = `totehms.steps` (réécrit en entier par `cloudSave`) · `objectives` · `repulsions` · `visions` ·
  `wisdom` (MY STORY) ; liens = jointures ; 7 intentions (`check`, `intentions_set` pose `is`/`i`) ; médias `element-media` ; spots
  `spot_plans` (point lu par fonction ; en retirer un des miens : `spot_remove`, il passe à `cancelled`). **Journal** `totehm_journal` : tout geste, par déclencheurs jamais bloquants ; lu par `my_board`.

## Les droits

- Membre du Club : `_figher().member` = habit + objectif + répulsion (`needs` dit ce qui manque). Accès offert = `figher_comps`.
- Abonné : `_subscriber_of(créateur, fan)` ; `creator_page`, `my_entitlements`, `totehm_read`, `member_media`, `club_spots_of`.
- Audience : `private` · `figher` · `subscribers` (`public` → `figher`) ; `_audience_ok`, `_audience_listed`, `_point_ok`. Sans compte : des NOMS seuls (`totehm_galaxy`, `totehm_search`).
- Par box, BINAIRE (`private` · `subscribers` ; l'ancien `figher` d'une box → `subscribers`, 26/10) : colonne `audience` + `habit_audience`,
  règle `_box_shared` ; COM écrit par `box_audience_set`, lit par `totehm_read` (box par box). Reste au terminal : `totehm_of`, les politiques.

## L'argent

- `member_ledger` en ajout seul : crédit sur `invoice.paid`, idempotence `unique(source, kind)`, l'arrondi va à TOTEHM ; 80/20, revente 7 %. Versement manuel le 1er : `payouts_due()` → virement → `payout_mark_paid()`. Pas de Stripe Connect.
- Propriété : `art_editions` · `art_transfers` (ajout seul) · `stoner_access` ; le THP = l'œuvre `totehmpaper`. Le marché ne s'écrit que par le webhook (`art_settle`) ; `ok:false` → `market_incidents` = remboursement à la main.
- `stripe-webhook` : `higher` · `cloth` · `subscription` · `creator_sub` · `artwork` · `resale` · `luxury` · `higher_sub` ;
  `stripe_events` s'efface avant un 500. Test (`boutique_testers`) : v44 fait suivre une pièce d'essai comme une vraie,
  mais le mode test n'a pas d'endpoint webhook — rien ne redescend encore.

## Les 40 Edge Functions (`supabase/functions/`)

| rôle | fonctions |
|---|---|
| identité | `sso-mint` · `sso-redeem` |
| argent | `stripe-webhook` · `higher-checkout` · `artwork-checkout` · `market-checkout` · `creator-subscribe` · `creator-price` · `club-billing` · `higher-sub` |
| vêtements | `create-checkout` v44 · `luxury-quote` v4 · `luxury-checkout` · `compose-artwork` · `streetwear-assets` · `cloth-art` ; les deux premiers prennent `pick:{matter,shots}` — ce qui est ALLUMÉ, en références, relu par `_box_matter` et `_box_shots` |
| vidéo, spots | `create-bunny-upload` · `bunny-video` · `bunny-webhook` · `spot-video` · `space-delete` |
| Higher Self, bot | `higher-self` · `bot-reply` · `bot-tick` (cron) · `agenda-ingest` (cron) · `higher-map` · `stoner-gate` |
| sans appelant visible | `totehm-bot` · `sync-knowledge` · `generate-embeddings` · `upload-leaf-videos` · `ghost-factory` · `prospects` · `bunny-maintenance` · `embed-places` · `generate_objective` · `subscription-checkout` · `creator-dashboard` · `creator-onboard` · `autobiographiste` (à vérifier dans leurs journaux avant de retirer) |

Le compte vient TOUJOURS de la session, jamais du corps ; une page ne reçoit que des nombres déjà calculés.

## Le bot et le Higher Self

- TotehmBot (Telegram) sans voix (jamais « je », zéro modèle) ; relances `push_decision` au rythme de chaque Habit, 6/jour.
- Higher Self (`higher-self` v6, `fmt:'r4'`) : le MIROIR. `_bot_mirror` = le TOTEHM relié (chaque Habit entière : where,
  intentions, rythme, son, liens) ; `_shared/mirror.ts` : contexte + citations vérifiées (`@ok`). Gratuit limité (`_sm_rules`),
  puis `higher_sub` ; un lieu réel (`_mirror_places`) posé par le serveur (`@lieu`) ; `higher-map` : Lisbonne seule.
- Ce que le membre MONTRE : `focus:{kind:'media'|'spot', id}` — une référence seule ; `montreDe()` relit la ligne dans SES
  lignes (`element_media` non retiré, `spot_plans` publié) et la box par `_box_matter`, et dit au modèle qu'il ne VOIT
  pas l'image. Deux lectures SQL, zéro appel payant de plus.

## n8n

`n8n/README.md` (VM Oracle) · `n8n/workflows/` (A → F). n8n n'accorde jamais un accès. B republiée le 26/10 : elle SIGNE
les photos allumées (`box_snapshot.shots`), les fait lire par un modèle de vision et verse ce qu'il en dit dans le prompt
— matière, jamais instruction. C, D lisent `$env` (11 clés) ; E reste sur l'ancien (`process.env`).
Zéro exécution : `stripe-webhook` envoie `apikey` (clé de service) à B, que sa version publiée exige (`serviceAuth`), mais
aucun essai ne lui est parvenu. Banc hors ligne : `tests/n8n/streetwear/offline.mjs` (59 simulations, six blocages).

Avis Supabase : 2 ERROR connus (`higher_badges` lit `auth.users` ; 4 vues `security definer`, dont `signature_styles`).
