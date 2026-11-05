# backend/CLAUDE.md — la base, les fonctions, l'argent, le bot
> L'état ACTUEL et les pièges (≤ 60 lignes). Servi par personne : `backend/` n'entre jamais dans un dossier déployé.
## La base — Supabase `abujjbkbbiumxrokozph`
- Une migration s'applique UNE fois, son fichier reste dans `supabase/migrations/` (jamais `db push`) ; ce qui ne passe
  pas du cloud → `CLAUDE_CODE.md`. Auto-test `tests/sql/*_selftest.sql` (`FAIL={}`). Grants après le dernier `create`.
- Un déclencheur aux droits de l'appelant n'appelle que ce qu'`authenticated` peut exécuter (Postgres vérifie le droit même hors de la branche prise, sinon 403 sur l'écriture) : `_vis_shared()` lui est accordée ; `sauvegarde_selftest` le vérifie.
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
  `stripe_events` s'efface avant un 500. Test (`boutique_testers`) : v45 suit une pièce d'essai comme une vraie et le mode test REDESCEND (03/11 : endpoint `we_1UXQzu`, les deux `STRIPE_TEST_*` posés) ;
  un événement de test n'ouvre que `cloth` et `luxury`, marqués `test`, et `handleCloth` n'appelle jamais l'API Stripe.

## Les 41 Edge Functions (`supabase/functions/`)
| rôle | fonctions |
|---|---|
| identité | `sso-mint` · `sso-redeem` |
| argent | `stripe-webhook` · `higher-checkout` · `artwork-checkout` · `market-checkout` · `creator-subscribe` · `creator-price` · `club-billing` · `higher-sub` |
| vêtements | `create-checkout` v44 · `luxury-quote` v4 · `luxury-checkout` · `compose-artwork` · `streetwear-assets` · `cloth-art` · `streetwear-tick` (cron) ; les deux premiers prennent `pick:{matter,shots}` — ce qui est ALLUMÉ, en références, relu par `_box_matter` et `_box_shots` |
| vidéo, spots | `create-bunny-upload` · `bunny-video` · `bunny-webhook` · `spot-video` · `space-delete` |
| Higher Self, bot | `higher-self` · `bot-reply` · `bot-tick` (cron) · `agenda-ingest` (cron) · `higher-map` · `stoner-gate` |
| sans appelant visible | `totehm-bot` · `sync-knowledge` · `generate-embeddings` · `upload-leaf-videos` · `ghost-factory` · `prospects` · `bunny-maintenance` · `embed-places` · `generate_objective` · `subscription-checkout` · `creator-dashboard` · `creator-onboard` · `autobiographiste` (à vérifier dans leurs journaux avant de retirer) |

Le compte vient TOUJOURS de la session, jamais du corps ; une page ne reçoit que des nombres déjà calculés.

## Le bot et le Higher Self
- TotehmBot (Telegram) sans voix (jamais « je », zéro modèle) ; relances `push_decision` au rythme de chaque Habit, 6/jour.
- Higher Self (`higher-self` v7, `fmt:'r4'`) : le MIROIR. `_bot_mirror` = le TOTEHM relié (where, intentions, rythme, son, liens) ;
  `_shared/mirror.ts` : contexte + citations vérifiées (`@ok`) ; gratuit limité (`_sm_rules`), puis `higher_sub` ; un lieu réel (`_mirror_places`, `@lieu`).
  MON MOMENT : l'heure, la météo (`_shared/meteo.ts`, MET Norway, gratuite, 1,2 s au plus) et `ou` (home · out, de la page) → chez moi ou dehors (`@ici`). `higher-map` : Lisbonne seule.
- Ce que le membre MONTRE : `focus:{kind:'media'|'spot', id}` — une référence seule ; `montreDe()` relit la ligne dans SES
  lignes (`element_media` non retiré, `spot_plans` publié) et la box par `_box_matter`, et dit au modèle qu'il ne VOIT
  pas l'image. Deux lectures SQL, zéro appel payant de plus.

## ChatGPT — connexion dédiée, lecture seule
`chatgpt-connector` v6 est déployé et activé ; migrations additives `20261101090000_chatgpt_connector.sql` et `20261104140000_chatgpt_ecosystem.sql` appliquées, RLS et RPC réservées service_role. L’extension est enregistrée une seule fois dans l’historique Supabase sous `20261104133622` / `20261104140000_chatgpt_ecosystem` ; ne jamais la réappliquer. OAuth PKCE + jetons opaques hachés, jamais une session Supabase ; consentement `/chatgpt`, callback exact `https://chatgpt.com/connector_platform_oauth_redirect` avec `iss` (RFC 9207). Origine `https://www.totehm.com` ; `CHATGPT_CONNECTOR_ENABLED=true`. Redéployer via Management API ou `supabase functions deploy chatgpt-connector --project-ref abujjbkbbiumxrokozph --no-verify-jwt --use-api` depuis `backend/` ; si la CLI refuse le jeton injecté du cloud, utiliser Management API. `/mcp` : anciens consentements = 5 outils personnels ; reconnexion explicitement consentie = 10 outils, dont contexte mixte attribué, abonnements paginés, box membre, médias membre et spots Club, sans écriture ni GPS/pixels. `chatgpt-ecosystem.ts` convertit les cinq catégories et leurs liens ; ne jamais confondre inspiration et choix personnel. Consentement versionné PAR GRANT, émission atomique `chatgpt_authorize_ecosystem`. Lecteur service-only `chatgpt_read_ecosystem` relit l’abonnement à chaque appel et réutilise `totehm_read/member_media/club_spots[_of]` avec le sujet consenti, restauré ensuite. Aucun accès public élargi. Mémoire ChatGPT native : aucune écriture automatique ; contexte MCP à la demande. Tests `tests/fn/chatgpt-*` (SQL sous PGlite) + `tests/browser/chatgpt_connect.mjs`. RLS, droits et refus atomiques vérifiés en production par transaction annulée ; status/discovery publics vérifiés. L’essai réel connecté dans ChatGPT (reconsentement, lecture autorisée et révocation) nécessite l’intervention de Wah.

## n8n
`n8n/README.md` (VM Oracle) · `n8n/workflows/` (A → F). n8n n'accorde jamais un accès. B SIGNE les photos allumées, les
fait lire par un modèle de vision et verse ce qu'il en dit dans le prompt — matière, jamais instruction ; les sept
concepts partent un par un, un bouton `PICK` chacun, et elle retient quel message porte quel numéro. C est le POSTE TELEGRAM du streetwear :
`pick` (validé par le LOT, jamais par un message ; les six autres claviers tombent, l'image retenue dit
`PICKED`), `ship`/`hold` renvoyés à D, `retry`/`refund` sur une pièce bloquée. D pose un brouillon Printful (`confirm=false` : rien de fabriqué ni facturé),
montre le mockup du dos avec taille et adresse, et n'appelle `/confirm` que sur `SEND TO PRINT`. Un job `waiting` ou `queued` dont l'heure est venue REPART : `streetwear-tick`, arme toutes les cinq minutes par
`streetwear_tick_arm()` (jeton a usage unique, aucun secret dans le cron), requalifie les executions abandonnees
(`streetwear_recover_stalled`), reserve ce qui est pret (`streetwear_due`, qui repousse de trois minutes) et rappelle le
flux — `tracking` excepte, que Printful pousse. Une piece bloquee en `error_locked` est ANNONCEE une fois (`streetwear_alerts` pose `alerted_at`) avec deux sorties : `RETRY` (`streetwear_unlock` retire les seuls drapeaux « parti sans reponse » et la remet en file) et `REFUND`, qui redemande confirmation puis NOTE seulement (`streetwear_refund_mark`) : l'argent ne part jamais d'un tap, le remboursement se fait dans Stripe. C, D lisent `$env`
(11 clés) ; E reste sur l'ancien (`process.env`). Banc : `tests/n8n/streetwear/offline.mjs` (79 tests, six blocages).

Avis Supabase : 2 ERROR connus (`higher_badges` lit `auth.users` ; 4 vues `security definer`, dont `signature_styles`).
