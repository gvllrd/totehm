# SYSTEM.md — état réel du système TOTEHM

**Dernier relevé : 9 octobre 2026, lot space / spot relu et corrigé** (§0) — le reste du fichier garde la date de son propre relevé. Chaque chiffre vient d'une requête, pas d'une supposition.

> **À quoi sert ce fichier.** Les masters disent *ce qu'on veut*. `CLAUDE.md` dit
> *comment on construit*. **Celui-ci dit ce qui existe vraiment.**
>
> Il a été créé après trois incidents où le repo, la doc et la production
> divergeaient : une clé Stripe absente que la doc supposait posée, une table
> d'idempotence décrite mais jamais créée, un code versionné portant une
> tarification périmée.
>
> **Règle : ne jamais affirmer l'état d'une table, d'un secret ou d'une fonction.
> Le vérifier.** Commandes en §8.

---


## 0 · LOT SPACE / SPOT RELU ET CORRIGÉ — 09/10/2026 (quinquies)

| quoi | valeur mesurée |
|---|---|
| erreurs trouvées dans le lot ChatGPT | figher.club : ~25 textes visibles disaient « space » (indice, caméra, plan, agenda, My spots, joystick, `.ics`) · vue passés au téléphone : boussole et zoom par-dessus la liste (règles `v-feed` supprimées au lieu d'être renommées `v-past`) · dates passés en format US · SPACE : « What is a space? » décrivait un lieu de rencontre ; My spaces affichait I WILL BE HERE pour un contenu · COM : « 1 SPACES », comptes faits sur 3 éléments mélangés, un test qui figeait l'erreur |
| migration `habit_spaces_split` (`20261009211744`, MCP) | même signature ; `spaces` / `spots` séparés, `total_spaces`, `total_spots`, `total` = somme ; anon refusé |
| auto-tests SQL | `habit_spaces_split` FAIL={} (4 spaces dont 1 privé + 2 spots : propriétaire 4/2, lecteur 3/2, aucun point) · `space_spot_split` (adapté) FAIL={} · `habit_spaces` FAIL={} |
| navigateur (Supabase simulé) | space 37/37 · space_top_left 20/20 · spaces_loupe 26/26 · space_boxes_ecosystem 22/22 · club_map 42/42 · club_publish 33/33 · club_ui 27/27 · club_luxury 48/48 · space_spot_links 35/35 · com_croix 51/51 · com_read_copy 20/20 · com_cloths 16/16 |
| non exécuté ici | `space_video` : délai dépassé AUSSI sur `a093940` (avant le lot) dans cet environnement — lecture HLS du Chromium de test, pas le code |
| Vercel `3094944` | com · space · club · boutique READY (production) |
| md5 prod = dépôt (pg_net, 200) | totehm.space `450c0a6b…` `2026-10-09-space-only` · figher.club `ef037fac…` `2026-10-09-club-spots` (aucun « into a space », « What is a spot? » présent) · `/meet` `45655bc1…` · totehm.com/totehm `81187519…` `2026-10-09-habit-split` |
| base | 0 space publié · 0 spot actif (vide, comme attendu) |

## 0 · SPACE / SPOT SÉPARÉS — 09/10/2026 (quater)

| quoi | valeur mesurée |
|---|---|
| migration | `space_spot_split` appliquée une fois par MCP ; `spot_plans.format` space/spot, défaut spot |
| données avant / après les tests | 0 publiés · 0 spots actifs · 19 plans ; fixtures SQL annulées |
| fonctions | 13 signatures existantes inchangées ; corps `spot_create` / `spot_schedule` identiques ; seul `space_post` insère format space parmi 14 écrivains audités |
| droits | `space_post` authenticated/service, `my_spots` authenticated ; anon interdit aux deux ; `_spot_view` ne révèle jamais le point d’un space |
| auto-tests SQL | 6/6 `FAIL={}` : space_spot_split, my_spaces, habit_spaces, spots, space_future, space_photo_why |
| navigateur (Supabase simulé, Chromium 143) | space 37/37 · space_top_left 20/20 · space_video 19/19 · spaces_loupe 26/26 · space_boxes_ecosystem 22/22 |
| navigateur (suite) | club_map 42/42 · club_publish 33/33 · club_ui 24/24 · space_spot_links 33/33 · com_croix 51/51 · com_read_copy 20/20 · club_luxury 48/48 |
| identité héritée | spaces_ui 43/47 ; les 4 échecs connus get_higher/stoner persistent ; aucun nouvel échec ni pageerror dans les parcours transférés |
| médias / dépendances | vraie capture 1080 × 1920 + audio, TUS et HLS signés testés avec fixtures locales ; villes/capture/HLS/licence Club identiques à SPACE |
| advisors security | ERROR 5 → 5 ; notices authenticated security-definer 127 → 129 (les deux nouvelles RPC à accès contrôlé), autres comptes inchangés |
| domaines du lot | SPACE BUILD `2026-10-09-space-feed` · Club `2026-10-09-club-map`, ancienne porte `/meet` · COM `2026-10-09-spaces-spots` |
| publication / production | lot publié sur `chatgpt/space-spot` puis `main` ; GitHub signale les trois déploiements réussis ; Vercel SPACE/COM READY, API Club 403 (inspection 404), CLI absente |
| contenu servi (pg_net, HTTP 200) | md5 = dépôt : SPACE `501ff45552539b882fbbe69c8f418cf8`, Club `665a8a30226d9a9e1ca9ebcabac767e1`, `/meet` `45655bc10cf804509e094e33c1d1fd45`, COM `2ea80275e890481cec3acfc3310c35f8` ; BUILD attendus |
| lectures en production | membre : feed/spots/my_spots `[]`, signed_in true ; anon : feed/spots `[]`, signed_in false, my_spots interdit |
| CORS depuis Club déployé (Chromium réel, aucune écriture) | create-bunny-upload 401 signin · space-delete 401 signin · spot-video 400 bad_spot ; trois origines figher.club, zéro erreur JS/CORS, radar et cinq vues visibles |
| correction du déploiement hérité | spot-video v10 utilisait une ancienne copie d’origins.ts sans Club ; v11 redéployée avec le fichier du dépôt, entrée identique et verify_jwt true conservé ; avant : préflight bloqué, après : trois appels passent |
| écarts techniques autorisés par Wah | lecteur feed direct (l’ancien déléguait à spots_feed), fixtures héritées actualisées aux écrivains shared/ON, caméra Club autorisée dans Permissions-Policy |
| hors lot | boutique/Stripe inchangés ; source Edge Functions inchangée, seul bundle spot-video remis à jour ; miroir phase 4 seulement sur « go miroir » |

## 0 · SPACES ET SPOTS REMIS À ZÉRO — 09/10/2026 (ter)

| quoi | valeur mesurée |
|---|---|
| avant | `spot_plans` 19 (5 `published`, 14 `cancelled`, 1 compte) · `spots` 21 (7 actifs) · `spot_takes` 8 · `spot_applications` 0 · `videos` 0 · seau `moments` 2 fichiers |
| migration `spaces_spots_reset` (MCP, `20261009120000`) | `published` → `cancelled` (5) · `active` → false (7) ; aucun trigger hors `updated_at` |
| après | `spot_plans` publiés 0 · `spots` actifs 0 · `spots_list` / `spots_feed` / `my_spaces` (membre et anon) → `[]` ; figher.club « passés » 5 → 0 |
| à faire (Claude Code) | purge définitive `20261009120001_spaces_spots_menage.sql` (`delete`) + 2 fichiers `moments` par l'API Storage |

## 0 · QUATRE DOMAINES, QUATRE FONCTIONS — 09/10/2026 (bis)

| quoi | valeur mesurée |
|---|---|
| fichiers | 8 pages + `api/geo.js` + 22 panneaux + `lisbon_phrases_backup.md` : `club/` → `boutique/` (git mv, octet pour octet) |
| redirections (pg_net) | figher.club `/get_higher?x=1` → higher.boutique `/get_higher?x=1` · `/stoner?checked=1` → `/stoner?checked=1` · `/market?owned=totehmpaper` → idem · totehm.space `/discover` → higher.boutique `/discover` ; requête conservée, page 200 au bout |
| higher.boutique | `/` 200 « HIGHER.BOUTIQUE — wear it, own it » · `/get_higher`, `/stoner`, `/market` 200 · `/api/geo` 200 `{"country":"IE","lisbon":false}` |
| figher.club | `/` 200 `2026-10-09-meet` « Meet in reality », spots `spots_list` + `spots_feed` (anon : 0 à venir, 5 passés en base) |
| fonction | `higher-checkout` v37 (retours sur la boutique) : devis anon depuis la boutique → `{amount:1700, currency:"usd", left:776994}` |
| md5 prod = dépôt (`4fde276`, Vercel READY com · space · boutique, club servi) | club `f299666f…` · boutique `afb70e00…` · get_higher `3d9568a2…` · market `7aa34f8e…` · totehm.com `58fa28e8…` (`2026-10-09-domaines`) · totehm.space `a55dfef8…` (`2026-10-09-domaines`) |
| tests navigateur | `club_luxury` 48/48 · `market` 14/14 · `boutique_home` 23/23 · `streetwear` 64/64 · `com_croix` 51/51 · `com_mouth` 30/30 · `com_read_copy` 20/20 · `com_paper` 40/40 · `com_member_menu` 28/28 · `com_creator` 29/29 · `console` 18/18 · `com_cloths` 16/16 · `spaces_loupe` 26/26 · `space_boxes_ecosystem` 22/22 · `space` 40/40 |
| connu, hors lot | `spaces_ui --identity` : 4 échecs sur get_higher et stoner (nom Coral, T centré) — mêmes 4 sur `main` avant le lot (pages restaurées à l'ancien format le 07/10) |
| pas déplacé | les spots (filmer, annoncer, rejoindre) vivent encore dans `space/index.html` ; figher.club les liste et y renvoie |

## 0 · LE SLOGAN NE PASSE PLUS PAR LE COIN — 09/10/2026

| quoi | valeur mesurée |
|---|---|
| avant | badge `#lv-slogan` visible en (0,0) aux premières images (46–60 ms en test, plus long au téléphone : le module attend esm.sh et le pont SSO) |
| après | invisible tant que non posé (`is-pose`) ; module retardé de 1,5 s : 0 image au coin à 390 et 1280 px, puis centré |
| tests | `com_croix` 51/51 · `com_mouth` 30/30 · `com_read_copy` 20/20 · `com_paper` 40/40 · `com_member_menu` 28/28 · `com_cloths` 16/16 |
| prod (pg_net, `f1fbeee`) | totehm.com/totehm 200 `2026-10-09-slogan`, md5 = dépôt (`5dbd25f6…`), verrou CSS présent |

## 0 · TOTEHMSM : LE HIGHER SELF EN FREEMIUM, EN FLUX, EN BULLES — 08/10/2026 (quater)

| quoi | valeur mesurée |
|---|---|
| base | migration `higher_self_freemium` (additive) : `sm_uses` RLS sans politique, aucun grant anon/auth ; `_sm_rules` (7 / 30 j, Higher 30 / 24 h), `_higher_active`, `_sm_count`, `_sm_state`, `sm_begin`/`sm_end` (service_role), `my_landing().sm` ; `tests/sql/higher_self_freemium_selftest.sql` → `FAIL={}` (annulé) |
| fonction | `higher-self` v3 (verify_jwt) : sans jeton 401, jeton anon 401 `no_session` (pg_net) ; la sonde de mesure (v2) n'existe plus |
| latence (sonde v2, contexte réel ≈ 850 jetons, 2 phrases EN/FR) | `gpt-5.1` none : 1er mot 1 168 / 565 ms, total 1 779 / 1 294 ms · `gpt-5` minimal : 713 / 570 ms · `gpt-4.1` : 585 / 1 103 ms · `gpt-5.1` low : 4 063 / 1 929 ms · `gpt-5.2` none et `gpt-5-mini` : réponse FRANÇAISE à une phrase anglaise → écartés |
| choix | `gpt-5.1` (none) → `gpt-5` (minimal) → `gpt-4.1` ; sortie 57–82 jetons ; ≈ 0,2 ¢ la réponse (tarif gpt-5) → 7 offertes ≈ 1,4 ¢ / membre / mois |
| tests navigateur | `com_croix` 47/47 · `com_cloths` 16/16 · `com_mouth` 30/30 · `com_paper` 40/40 · `com_read_copy` 20/20 · `com_member_menu` 28/28 · `com_creator` 29/29 · `console` 18/18 · `spaces_loupe` 26/26 · `boutique_home` 23/23 · `streetwear` 64/64 · `club_luxury` 44/44 |
| connu, hors lot | `space_boxes_ecosystem` 18 puis arrêt : `figher.club/stoner` (restauré à l'ancien format par le lot Figher de `main`) n'a plus de « CONNECT WITH MY TOTEHM » visible |
| prod (pg_net, `7fdfa68`, Vercel READY) | totehm.com/totehm 200 `2026-10-08-sm`, md5 = dépôt (`0d5ad63a…`), `#sm-first` présent, `#lv-slogan2` absent |
| à faire (Claude Code) | `20261008200001_higher_self_menage.sql` : drop `sm_thread`, `sm_messages` |
| non mesuré | une vraie réponse à un vrai membre (exige sa session ; Wah a l'accès offert) |

## 0 · COM ↔ BOUTIQUE : TOTEHMIZE DANS WISDOM ET VISION — 08/10/2026 (ter)

| quoi | valeur mesurée |
|---|---|
| migration `20261008120000_element_cloths.sql` | APPLIQUÉE (`element_cloths`) · auto-test `FAIL={}` (9 contrôles, annulé, 0 reste) · security definer, search_path vide · anon refusé, authenticated autorisé |
| base | 0 Cloth payé, 0 devis Luxury payé : les vues WISDOM / VISION n'affichent encore que « + totehmize » |
| tests navigateur | `com_cloths.mjs` 16/16 · `streetwear.mjs` 64/64 · `com_read_copy` 20/20 · `spaces_loupe` 26/26 · `com_croix` 40/40 (test réparé : `$$eval`) · `com_member_menu` 28/28 · `com_paper` 40/40 · `com_mouth` 30/30 · `com_creator` 29/29 · `console` 18/18 |
| écart trouvé, hors lot | `space_boxes_ecosystem` 18 puis arrêt : figher.club `/stoner` → `/get_higher` montre « Send code » (OTP local) au lieu de CONNECT WITH MY TOTEHM — déjà vrai avant ce lot |
| prod (pg_net, fusion `9150f31`) | `/totehm` 200 `BUILD 2026-10-08-cloths` (`element_cloths`, `data-totehmize`) · `/streetwear` 200 `2026-10-08-wear` (`?wear=`) · identiques au dépôt (569 398 · 92 241 caractères) |

## 0 · STREETWEAR : FENÊTRES-CÔTÉS SUR ORDINATEUR, WISDOM ET VISION, SANS PALETTE — 08/10/2026 (bis)

| quoi | valeur mesurée |
|---|---|
| base | aucune migration (la palette reste dans `box_snapshot`, jamais affichée) |
| Edge Function | `create-checkout` v40 ACTIVE, `KINDS = wisdom · vision` (autre vue → 422 `choose an element`) · sans session → 401 `signin`, CORS `https://www.higher.boutique` |
| tests navigateur | `streetwear.mjs` 51/51 (téléphone + ordinateur 1280×800 : WISDOM à gauche, VISION à droite, vêtement décalé, manette qui suit) · `boutique_home.mjs` 23/23 · `club_luxury.mjs` 44/44 |
| prod (pg_net, fusion `6007b47`, Vercel READY) | `/streetwear` 200 `BUILD 2026-10-08-wisdom-vision` (règles de côté, `WEARABLE` wisdom·vision) · `/` 200 `2026-10-08-bis` · `/luxury` 200 `2026-10-08-no-palette` · aucune palette affichée · identique au dépôt (89 990 · 51 362 · 70 875 caractères) |

## 0 · STREETWEAR PLEIN ÉCRAN, DECODE = LA PAGE DU CLOTH, « ELEMENT » — 08/10/2026

| quoi | valeur mesurée |
|---|---|
| migration `20261008100000_streetwear_immersive.sql` | APPLIQUÉE (`streetwear_immersive`) · auto-test `FAIL={}` (annulé) · grants : `_cloth_name_free`, `_cloth_draft_put`, `_cloth_art_path` service_role seul ; `name_available`, `reveal_cloth` anon + authenticated |
| Edge Functions | `create-checkout` v39 (sans session → 401 `signin`) · `cloth-art` v1 (nom inconnu → 404 `not_yet` ; nom invalide → 400 `name`) |
| dépôt ↔ prod | 3 migrations du 06/10, `streetwear-assets` v1, `_shared/streetwear-auth.ts`, `compose-artwork` v34 recopiés depuis la prod ; `stripe-webhook` v42 identique au dépôt |
| base | 1 support actif (Higher Champion Sweatshirt, 170 €, 177, S–2XL, 1 vue = `image_url`, dossier vide) · 6 styles × 7 pièces · 0 Cloth |
| tests navigateur | `streetwear.mjs` 45/45 · `boutique_home.mjs` 22/22 · `club_luxury.mjs` 43/43 |
| prod (pg_net, fusion `735b463`) | `/streetwear` 200 `BUILD 2026-10-08-immersive` (viewer, manette, TOTEHMIZE) · `/` 200 `2026-10-08-decode` (`dc-el`, `cloth-art`) · `/luxury` 200 `2026-10-08-element` (plus de « pick up the box ») · identique au dépôt (89 341 · 51 630 · 71 625 caractères) · anon : `name_available` true sur un nom libre, `reveal_cloth` `found:false`, `_cloth_draft_put` et `_cloth_art_path` refusés |

## 0 · L'ATTERRISSAGE EN CROIX, TOTEHMSM, L'ABONNEMENT HIGHER — 07/10/2026

| quoi | valeur mesurée |
|---|---|
| base | migrations `higher_self` (×4) + `landing_cloth_spot` : 4 fonctions (`my_landing`, `avatar_set`, `sm_thread`, `higher_sub_sync`), 2 tables RLS sans politique (`sm_messages`, `member_avatars`), `logo_spot` présent ; `tests/sql/higher_self_selftest.sql` → `FAIL={}` (annulé) |
| droits | anon : `my_landing` oui (→ `{signed_in:false, thp:false, higher:{700 eur, month}}`), `avatar_set` non, `sm_thread` non ; authenticated : `higher_sub_sync` non (service_role seul) |
| fonctions | `higher-self` v1, `higher-sub` v1 (verify_jwt) : sans jeton → 401 (pg_net) ; `stripe-webhook` v42 (`higher_sub`), endpoint inchangé |
| Stripe live | aucun prix `higher_month` : `higher-sub` répond `not_ready` → « opening soon » (prix = « oui » de Wah) |
| vêtement | `totehm_cloth_support` : 1 ligne active avec image ; `logo_spot` vide → poitrine par défaut (.5/.3/.3) |
| tests navigateur | `com_croix` 40/40 (nouveau) · `com_mouth` 30/30 · `com_paper` 40/40 · `com_read_copy` 20/20 · `com_member_menu` 28/28 · `com_creator` 29/29 · `console` 18/18 · `club_luxury` 43/43 · `boutique_home` 10/10 · `streetwear` 25/25 · `market` 14/14 · `spaces_loupe` 26/26 · `space` 40/40 · `space_boxes_ecosystem` 22/22 · `spaces_ui --identity` 27/27 |
| connu, hors lot | `spaces_ui` (volet SPACE) et `space_top_left` attendent `[data-pvis]`, retiré le 05/10 : périmés |
| prod (pg_net, `3be449b`, Vercel READY com · space · boutique) | totehm.com/totehm 200 `2026-10-07-croix`, md5 = dépôt ; figher.club/get_higher 200, md5 = dépôt (quatre pouvoirs) |
| non mesuré | l'appel LLM réel (exige une session membre ; Wah a l'accès offert) |

## 0 · NOUVEAU CHAMPION, PHOTO RÉCUPÉRÉE ET REPRISE AUTOMATIQUE — 06/10/2026

| quoi | valeur mesurée |
|---|---|
| support courant | `c615b050-cd3e-4560-a1aa-ce943192f34e` · Higher Champion Sweatshirt · Printful `478633385` ; remplace l'ancien produit supprimé par Wah |
| base | actif, prix préexistant 170 €, édition préexistante 177, claimed 0 ; `image_url` null avant resynchronisation, puis aperçu Printful renseigné ; dossier `higher-champion-sweatshirt-478633385` avec `.keep` seulement |
| n8n F publié | `c9638e70-0d0f-4dba-adb1-a78f2ccb8ec8` · quatre nœuds : Webhook, Sync Product, Photo pending?, Wait for Printful photo ; une minute entre reprises, cinq reprises maximum ; succès non sauvegardés après test |
| validations réelles | 91 resynchronisation manuelle : photo récupérée ; 92 attente forcée une fois dans le brouillon : 60 002 ms, deux Sync Product, sortie après reprise 1 ; 94 webhook publié : success, photo disponible, image_pending false, image_retry 0 |
| simulations du code final | photo au 2e retry → arrêt ; photo toujours absente → arrêt à 5 ; photo choisie → zéro reprise ; aucun écrasement de prix/édition/activation/claimed |
| navigateur public | higher.boutique/streetwear : image 800 × 800 chargée, titre Higher Champion Sweatshirt, 170 €, 177 / 177 left, S · M · L · XL · 2XL ; front inchangé |
| limite explicite | seule la photo principale Printful est automatique ; pas d'import de toute la galerie dans Storage ; si la photo reste absente après cinq reprises, image_pending reste true et la boucle s'arrête |

## 0 · F DÉBLOQUÉ, SUPPORT STREETWEAR ACTIF ET PHOTO DE SECOURS — 06/10/2026

| quoi | valeur mesurée |
|---|---|
| n8n F | actif, version publiée `10ab0cbc-4698-4962-a457-945ad5d58e42` ; `Printful Webhook` → `Sync Product`, `$env` accessible ; plus de `CONFIG process.env` ; succès non sauvegardés après validation |
| Printful | store `18517279` ; produit courant `478625396`, Champion Sweatshirt ; ancien produit `478320451` → 404 |
| exécutions | 84 création manuelle · 85 webhook publié · 86 photo manuelle · 87 webhook publié : success |
| support Supabase | `3387332a-a258-4a7e-9391-803fe446cfa6` : actif, prix préexistant 170 €, édition préexistante 12, claimed 0 ; variantes S/M/L/XL/2XL ; folder `champion-sweatshirt-478625396` |
| images | folder ne contient que `.keep` ; `image_url` renseignée avec l'aperçu réel Printful ; front BUILD `2026-10-06-streetwear-photo` : photos Storage prioritaires, URL de secours si dossier vide ou inaccessible |
| contrôle avant publication front | navigateur public : Champion Sweatshirt, 170 €, 12 / 12 left, S · M · L · XL · 2XL ; exécution 87 conserve activation/prix/édition ; aucun paiement ni génération |
| hors ce lot | B/C/D/E : ancienne version `CONFIG process.env` publiée à la lecture du 06/10 ; A inaccessible via connecteur, archivage à vérifier ; rotation/purge historiques non exécutées |

## 0 · TOUTE LA BOUCHE, LE STYLE ET LE NOM DU CLOTH, DECODE PERFORÉ — 06/10/2026 (ter)

| quoi | valeur mesurée |
|---|---|
| base | migration `luxury_style_name` (additive) : `luxury_quotes.name` + `style_id`, index `luxury_quotes_name_live`, `name_available` / `reveal_cloth` / `luxury_access` / `luxury_quotes_admin` ; `tests/sql/luxury_name_selftest.sql` → `FAIL={}` (annulé) ; 6 `artistic_styles` actifs (capacité 7/7) |
| fonction | `luxury-quote` v2 (verify_jwt false, auth applicative) : sans session → 401 `no_session` (pg_net) ; webhook, checkout, prix inchangés |
| tests navigateur | `club_luxury` 43/43 · `boutique_home` 10/10 · `streetwear` 25/25 · `com_mouth` 35/35 · `com_paper` 39/39 · `com_read_copy` 20/20 · `com_member_menu` 27/27 · `spaces_loupe` 26/26 |
| mesures UI | bouche 236 × 292 px à 390 × 844 (186 avant), bas à 344 px, papier à 451 ; buvard 44 px (`TAB=.285`) ; Decode survol + saisie : fond `rgb(51,51,102)`, tuile `6 fill`, carré |
| prod (pg_net, `7f58e7e`, Vercel READY) | totehm.com/totehm 200 `2026-10-06-bouche` · higher.boutique / 200 `2026-10-06-decode` · /luxury, /streetwear 200 `2026-10-06-cloth-name` · md5 = dépôt pour les 4 |

## 0 · TROIS GESTES, LIRE ET COPIER, MENU DE LA BOUTIQUE — 06/10/2026 (bis)

| quoi | valeur mesurée |
|---|---|
| base | aucune migration · `totehm_import_boxes` réutilisée telle quelle (une Box, une référence) |
| tests navigateur | `com_read_copy` 20/20 · `com_paper` 39/39 · `com_mouth` 35/35 · `com_member_menu` 27/27 · `com_creator` 29/29 · `console` 18/18 · `spaces_loupe` 26/26 · `space_boxes_ecosystem` 22/22 · `space` 40/40 · `boutique_home` 10/10 · `streetwear` 25/25 · `club_luxury` 35/35 |
| mesures UI (tests) | gestes : « Tap » → 3,4 s → « Tongue » → « Turn » ; verso vide, 0 résultat avant la 1re lettre ; Totehm lu : joystick à 738/844 px (en haut avant), Copy → `[{"kind":"h","key":"Deep practice"}]` puis `[{"kind":"t","key":"o1"}]` ; menu membre 390 × 844 px plein écran, 7 boutons centrés 12,5 px sans retour ; boutique : 0 bouton sur deux lignes ou débordant à 360 et 320 px |
| prod (pg_net, `76f0c79`, Vercel READY) | totehm.com/totehm 200 `2026-10-06-lecture-copie` (`#gestes`, copie, menu) · /search, /console, /monetize 200 `2026-10-06-menu` · higher.boutique /, /streetwear, /luxury 200 `2026-10-06-type` · md5 = dépôt pour les 7 |

## 0 · LOUPE EN PLACE, MY SPACES, SUPPRIMER UN SPACE — 06/10/2026

| quoi | valeur mesurée |
|---|---|
| migration `20261006100000_space_delete.sql` | APPLIQUÉE (`space_delete`) · EXECUTE authenticated seulement · auto-test `space_delete_selftest.sql` : étranger refusé, propriétaire → `cancelled`, médias vidés, my_spaces 14 → 13, absent d'habit_spaces et de spot_get, deux fois = not_found, `FAIL={}` (annulé) |
| Edge Function `space-delete` | v1 ACTIVE, JWT exigé · sans membre (clé anon) → 401 `{"error":"signin"}` |
| tests navigateur | `spaces_loupe` 26/26 · `com_mouth` 35/35 · `com_paper` 39/39 · `com_member_menu` 27/27 · `com_creator` 29/29 · `console` 18/18 · `space` 40/40 · `space_boxes_ecosystem` 22/22 · `spaces_ui --identity` 27/27 · `boutique_home` 10/10 · `streetwear` 25/25 · `club_luxury` 35/35 |
| mesures UI (tests) | loupe COM : 97 → 121 px (×1,25) sur les cinq vues, sans ouvrir ni fenêtre ; loupe SPACE 105 → 131 px ; papier SPACE 110 → 70 → 58 px en glissant ; invitation 11 px gras blanc sur boîte noire |
| prod (pg_net, `fc92330`, Vercel READY) | totehm.com/totehm 200 `2026-10-06-spaces-loupe` (loupe, langue `m-tongue-big`, `space-delete`) · totehm.space 200 `2026-10-06-spaces-loupe` (My spaces, `@property --tp`, loupe) · higher.boutique et figher.club 200 (loupe en place) · md5 = dépôt pour les 4 |

## 0 · TOTEHM.COM REMIS D'APLOMB — 05/10/2026 (nuit) : T, mini-boxes, lecture par nom, spaces dans les habits, vente, console

| quoi | valeur mesurée |
|---|---|
| migration `20261005200000_habit_spaces.sql` | APPLIQUÉE (`habit_spaces`) · EXECUTE : authenticated + service_role seulement · auto-test `habit_spaces_selftest.sql` : propriétaire 7 habits / 14 spaces, lecteur 12 partagés, `FAIL={}` (annulé) · base : 14 spaces publiés avec Habit, 12 partagés |
| bloc `ecosystem_ui` | 0 page COM (11 retirées) · loupe-fenêtre : 0 sur 15 pages satellites + `tools/` |
| tests navigateur | `com_creator` 29/29 · `console` 18/18 · `com_paper` 39/39 · `com_mouth` 35/35 · `com_member_menu` 27/27 · `space_boxes_ecosystem` 22/22 · `spaces_ui --identity` 27/27 · `space` 40/40 · `boutique_home` 10/10 · `streetwear` 25/25 · `club_luxury` 35/35 · `com_discovery` supprimé |
| connu, hors lot | `spaces_ui` (volet SPACE) attend `[data-pvis="private"]`, retiré par le lot SPACE du 05/10 : test périmé sur `main` avant ce lot |
| prod (pg_net, `a523f92`, Vercel READY) | `/totehm` 200 `BUILD 2026-10-05-com-aplomb`, `T_SVG` présent, `habit_spaces` appelé, ni bloc eco ni `totehm_discover` · `/search` et `/@wah` 200 (même fichier) · `/console` 200 (aucun Reveal dans l'interface) · `/monetize` 200 · totehm.space 200 `2026-10-05-in-place` sans loupe · higher.boutique et figher.club 200 sans loupe · md5 = dépôt pour les 7 |

## 0 · LA BOUTIQUE — 05/10/2026 (soir) : l'accueil d'avant, Totehm x Champion 2026, le mode test Stripe

| quoi | valeur mesurée |
|---|---|
| migration `20261005b_stripe_test_mode.sql` | APPLIQUÉE (`stripe_test_mode`) · `_boutique_test_mode(uuid)` service_role seul · `luxury_access()` rend `test_mode` (plus `test_price_cents`) |
| `boutique_testers` | 1 ligne, **active** (Wah, `Vallerand`) · `price_cents` inerte |
| Edge Functions | `create-checkout` v38 · `luxury-checkout` v3 (clé test, `test_unavailable` si absente) · `stripe-webhook` v41 (secret test en second ; en test : `cloth`/`luxury` seuls ; signature fausse → 400 `invalid signature`) |
| secrets Stripe test | **absents** → tâche Claude Code (CLAUDE_CODE.md) ; d'ici là un testeur reçoit `test_unavailable`, jamais le live |
| tests navigateur | `boutique_home.mjs` 10/10 · `club_luxury.mjs` 35/35 · `streetwear.mjs` 25/25 |
| prod (pg_net, fusion `68a622d`) | `/` 200 `BUILD 2026-10-05-landing` (Totehm x Champion 2026, branding `data-com`, sans manche, `reveal_cloth`) · `/luxury` 200 (`test_mode`) · `/streetwear` 200 · identique au dépôt (45 502 · 66 757 · 83 500 caractères) |

## 0 · LA BOUTIQUE OPÉRATIONNELLE — 05/10/2026 : la manette, le luxe sur devis, Decode, le banc d'essai

| quoi | valeur mesurée |
|---|---|
| migration `20261005_boutique_operationnelle.sql` | APPLIQUÉE (`boutique_operationnelle`) · `boutique_admins` 1 (Wah) · `boutique_testers` 1, **actif 0** (prix d'essai 1 € éteint : « oui » de Wah) · grants : `_boutique_admin`, `_boutique_test_price`, `luxury_quote_paid` service_role seul ; `luxury_quotes_admin` authenticated |
| auto-test `tests/sql/luxury_quote_selftest.sql` | `FAIL={}` (annulé) |
| Edge Functions | `luxury-quote` v1 (sans session → 401 `no_session`) · `luxury-checkout` v2 (`{quote:true}` → 200 50000 eur ; sans session → 401) · `create-checkout` v37 (sans session → 401 `signin`) · `stripe-webhook` v40 (sans signature → 400) |
| Stripe | un seul endpoint (Supabase `stripe-webhook`) ; avant ce lot `cloth` y était ignoré → **aucun Cloth payé n'aurait été traité** ; le workflow n8n A n'était abonné à rien |
| Decode (avant) | lecture directe de `totehm_clothes` : RLS = propriétaire seul → rien ne se trouvait ; désormais `reveal_cloth` |
| nom d'un Cloth (avant) | même RLS : un nom pris par un autre passait pour libre ; désormais `name_available` |
| n8n | `$env` dans les brouillons (02/10) mais **versions publiées = `process.env`** ; exécution manuelle 73 (F) : 400 ; `⚙️ CONFIG` écrit les clés en clair dans les exécutions → rotation demandée (CLAUDE_CODE.md) · `totehm_cloth_support` = **0 ligne** |
| webhook n8n B | `GET /webhook/streetwear-generate` → 404 « not registered for GET » (= chemin enregistré, POST attendu) |
| tests navigateur | `boutique_home.mjs` 23/23 · `club_luxury.mjs` 35/35 · `streetwear.mjs` 25/25 · `space.mjs` 40/40 · `com_paper.mjs` 39/39 · **`console.mjs` 1 échec (« offer per year ») et `market.mjs` 1 échec (« 3 collections ») déjà présents sur `main` avant ce lot (COM/Club non touchés)** |
| prod (pg_net, fusion `ae6960d`) | `/` 200 `BUILD 2026-10-05-joystick` (manche, Champion, `reveal_cloth`) · `/luxury` 200 `2026-10-05-quote` · `/streetwear` 200 `2026-10-05-joystick` (`name_available`) · contenu identique au dépôt (56 581 · 66 762 · 83 500 caractères) |

## 0 · COM — RECHERCHE, LECTEUR NATIF ET COPIES — 04/10/2026

| quoi | valeur mesurée |
|---|---|
| migration | `search_and_box_import` appliquée une fois ; journal `20261003164312`, fichier `20261003155911_search_and_box_import.sql` |
| auto-test local PostgreSQL/PGlite puis base réelle | `TOTEHM DISCOVERY SELFTEST (rolled back): FAIL={}` ; cinq types/jonctions, droits privés/annulés, pagination, accents/fautes, filtre, batch invalide, retry, déduplication du contenu personnel, import partiel, limite 50 |
| grants mesurés | discover anon oui ; import authenticated oui / anon non ; helper authenticated non ; registre aucun SELECT anon/auth, RLS true sans politique |
| après auto-test réel | registre 0 ligne : aucun compte, contenu ou import de test conservé |
| tests navigateur | `com_discovery.mjs` 50/50 · `com_paper.mjs` 39/39 · `com_mouth.mjs` 36/36 · `spaces_ui.mjs` 57/57 ; comptes/réseau simulés, captures mobile et desktop inspectées |
| prod, `main` `f3832ff` (PR #22 fusionnée) | com `dpl_HaboXdqrQReNHJqrQ61xTp2UGi77` READY, target production, alias `www.totehm.com` ; `/search` et `/totehm` HTTP 200, identiques aux fichiers testés, BUILD `2026-10-04-search-boxes` |
| empreintes servies | `/search` 29 379 o, md5 `4a4d97cc7b586c4c437b87d511a750c0` ; `/totehm` 548 804 o, md5 `0b1a0ecefbec1e6e1f7f3c51ebff2d02` |
| interfaces | mêmes cinq vues et joystick ; recherche du papier conservée ; résultat → `/totehm?ro=nom`, hit → box native ; revue hors de stage, focus/inert/Échap, purge à la déconnexion |
| lints nouveaux vérifiés | [RPC SECURITY DEFINER publiques](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) : names public volontaire ; [RPC authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) : accès source/owner contrôlés ; [RLS sans politique](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) : registre fermé volontaire |

## 0 · COM — LA BOUCHE ENTROUVERTE, EN TRANSE AU CLIC — 04/10/2026 (bis)

| quoi | valeur mesurée |
|---|---|
| `main` en avance rapide `8c6ae2c..a6d57fc`, déploiement auto | com `dpl_2g8Jkj3huN3CxZBnFUX2mnTWLETj` READY, alias `www.totehm.com` |
| prod = fichier de `main` (pg_net) | totehm.com `/totehm` 200, 529 233 o, md5 identique, `BUILD='2026-10-04b'`, langue au repos `translate(0,-748.8)`, `transePas` présent, `#m-shut` et `taquiner` absents |
| tests navigateur | `com_mouth.mjs` 36/36 (transe : 39 formes en 8,8 s, 28 ouverte / 12 refermée) · `com_paper.mjs` 39/39 |

---

## 0 · COM — LA BOUCHE EN QUATRE TEMPS — 04/10/2026 (ter)

| quoi | valeur mesurée |
|---|---|
| `main` en avance rapide `3536af2..f78f3ef`, déploiement auto | com `dpl_2hWoMV6gmFf5du6ErfTjJCLYfEEC` READY, alias `www.totehm.com` |
| prod = fichier de `main` (pg_net) | totehm.com `/totehm` 200, 550 275 o, md5 identique, `BUILD='2026-10-04c'`, bouche fermée au balisage, `taquiner`, `api.jouir`, `TAB=.36` présents, `transePas` absent |
| tests navigateur | `com_mouth.mjs` 35/35 (buvard 44 px pour 110 ; extase : 13 formes en 2,8 s, langue rentrée) · `com_paper.mjs` 39/39 · `com_discovery.mjs` 50/50 |

---

## 0 · COM — LA BOUCHE EN HAUT, ELLE TIRE LA LANGUE — 04/10/2026

| quoi | valeur mesurée |
|---|---|
| `main` en avance rapide `ca2bb19..abab32b`, déploiement auto | com `dpl_GxsNeTixxgpVW6CUjp1sKrDqj5r3` READY, alias `www.totehm.com` |
| prod = fichier de `main` (pg_net) | totehm.com `/totehm` 200, 530 559 o, md5 identique, `BUILD='2026-10-04'`, `#m-up`, bouche `top:max(52px,6dvh)`, `taquiner` présents |
| tests navigateur | `com_mouth.mjs` 32/32 · `com_paper.mjs` 39/39 |

---

## 0 · SPACE — PHOTO, WHY · TRIGGER, GESTES EN LIGNE, CAPTEUR À LA DEMANDE — 03/10/2026 (ter)

| quoi | valeur mesurée |
|---|---|
| migrations | `space_photo_why` puis `space_photo_column` appliquées une fois ; `spot_plans_video_check` refusait `.jpg` → colonne `photo` |
| auto-tests SQL (annulés) | `PHOTO WHY SELFTEST FAIL={}` · `FUTURE VIDEO SELFTEST FAIL={}` · `HABITS VIDEO SELFTEST FAIL={}` après les deux migrations |
| droits | `spot_why_set` authenticated oui / anon non ; `_spot_view`, `_clip_ok` service_role seul ; `spot_create` anon non |
| tests navigateur | `space.mjs` 35/35 · `spaces_ui.mjs` 57/57 · `space_top_left.mjs` 47/47 · `space.mjs` caméra paysage 35/35 |
| prod (pg_net), `main` `df91849` | space `dpl_8NFZxEwjBwSQfJfDz2nQ9WD1gvRr` READY, alias `www.totehm.space` ; `/` 200, md5 = `main`, `BUILD='2026-10-03-spaces-ter'`, `data-start="photo"`, `spot_why_set`, `data-ics` présents |

## 0 · SPACE — TOP = BOTTOM, VIDÉO FUTURE, LEFT FILTRÉ — 03/10/2026

| quoi | valeur mesurée |
|---|---|
| migration `20261003150000_space_future_video.sql` | appliquée une fois (`space_future_video`) ; `spot_video_attach` authenticated oui, anon non |
| `tests/sql/space_future_video_selftest.sql` | `FUTURE VIDEO SELFTEST (rolled back): FAIL={}` (ville seule, lien Bunny, idempotence, une vidéo = un space, vidéo d'autrui, space d'autrui, sans session) |
| tests navigateur | `space.mjs` 34/34 · `spaces_ui.mjs` 55/55 · `space_top_left.mjs` 27/27 · `space.mjs` caméra paysage 34/34 |
| non concluants dans le conteneur | `space_video.mjs`, `space_performance.mjs` : le Chromium de test ne décode pas H.264 → délai dépassé AVANT et APRÈS le lot, au même endroit |
| `cities.json` | 1 251 → 7 342 lieux (Natural Earth 10m), 249 Ko, 109 Ko gzip |
| prod (pg_net), `main` `a21c763` | space `dpl_2rSBgZ6h8N9WY5DvAMdmtv5jSde1` READY, alias `www.totehm.space` ; `/` 200, 156 127 o, md5 = `main`, `BUILD='2026-10-03-spaces-top'`, `#sf-btn`, `spot_video_attach`, `is-placed` présents ; `/cities.json` 200, md5 = `main` ; `/CLAUDE.md` 404 |

## 0 · SPACES — ACCÈS PROPRIÉTAIRE ET INTERFACE — 03/10/2026

- `my_spaces` absent avant ce lot ; ancien `my_space()` non exécutable par authenticated/anon (mesuré).
- Migration `20261003105748_my_spaces.sql` appliquée une fois, journal 20261003105748 / my_spaces.
- Lecture `spot_plans` du seul auth.uid(), privées/partagées publiées, pagination date+id, limites 1–100 ; payload minimal sans vidéo/coordonnées. Authenticated peut exécuter, anon ne peut pas.
- Test SQL read-only : `MY SPACES SELFTEST (rolled back) … FAIL={}` ; aucun compte/contenu créé ou modifié.
- Interface : REC volontaire, formulaire vidéo plein écran, TOP mobile au-dessus du canvas, radar abaissé, papier agrandi et filtre réduit latéral, noms Coral, détail à poignée/joystick sourdine, GO avec lecture autorisée fraîche. Tests navigateur du lot : navigation SPACE, formulaires/GO/identité/historique, papier COM, vidéo Bunny, fluidité et parcours club/boutique ; détails dans les suites versionnées. Les contrôles Vercel et le contenu servi sont vérifiés lors de la publication.

---

## 0 · COM — LA BOUCHE, EN LIGNE — 03/10/2026 11:20 UTC

| quoi | valeur mesurée |
|---|---|
| `main` en avance rapide `20f4a5c..21d1796`, déploiement auto | com `dpl_EmnHEwwD4CHDA6wtx38ZR2Bc2T6B` READY, alias `www.totehm.com` |
| prod = fichier de `main` (pg_net) | totehm.com `/totehm` 200, 518 666 o, md5 identique, `BUILD='2026-10-03'`, `#gate-mouth`, `#gate-get`, cible `figher.club/get_higher` présents |
| destination | figher.club `/get_higher` 200, md5 = `main`, `#btn-buy` et `sso-redeem` présents |
| tests navigateur | `com_mouth.mjs` 29/29 · `com_paper.mjs` 39/39 |

---

## 0 · COM — LE PAPIER QU'ON RETOURNE, EN LIGNE — 02/10/2026 17:15 UTC

| quoi | valeur mesurée |
|---|---|
| fusion `ea7a837` (PR #19), déploiement auto | com, space, club **refusés** « Deployment rate limited » (Hobby : 100 déploiements / 24 h glissantes) ; boutique READY |
| redéploiement manuel 17:10 UTC | com `dpl_HxYQ47Pq8eTbqSo8qydNwyFhwPZ5` READY · space `dpl_7zhuHMxTTM7hJMTYq4tnrY5LQ6NH` READY |
| prod = fichier de `main` (pg_net + fetch Vercel) | totehm.com `/totehm` 496 485 o, md5 identique, `BUILD='2026-10-02c'`, `#srch-q` présent · `/console` `BUILD='2026-10-02'`, bouton `#post` · totehm.space identique · figher.club 39 067 o, md5 identique |
| tests navigateur | `com_paper.mjs` 39/39 · `console.mjs` 13/13 |

---

## 0 · BOUTIQUE CENTRÉE + n8n EN PANNE — 02/10/2026 (soir)

| quoi | valeur mesurée |
|---|---|
| `totehm_cloth_support` | **0 ligne** (le vêtement ajouté n'est jamais arrivé) · bucket `totehm-cloth-support` : `hoodie-455627782/` 5 images (13/08) |
| n8n F, exécution 72 (rejeu hoodie 455627782) | **error** `process is not defined` au nœud `⚙️ CONFIG` ; même lecture `process.env` dans B (lu) → tâche Claude Code du 02/10 |
| `artistic_styles` actifs | 6 / 6, image pour chacun |
| tests navigateur | `streetwear.mjs` 22/22 · `club_luxury.mjs` 30/30 |
| pont SSO (logs Auth 02/10) | chaque `sso-redeem` 200 suivi de `/auth/v1/verify` **400** « Only the token_hash and type should be provided » · même appel sans `email` → 403 `otp_expired` sur un jeton factice (= validation passée) |
| pont SSO corrigé (fusion `aa1121f`) | 13 copies sans `email` · prod : boutique `/streetwear` `/luxury`, figher.club `/`, totehm.space `/`, totehm.com `/totehm` → 200, ancien appel absent, nouveau présent |
| prod (pg_net, fusion `e57f734`, Vercel boutique READY) | `/streetwear` 200, `BUILD='2026-10-02'`, `drawAura` présent, plus de `logo-rep` · `/luxury` 200, `BUILD='2026-10-02-centered'`, `#price` · contenu identique au fichier (64 373 et 21 770 caractères) |

## 0 · FIGHER.CLUB + LUXE — 02/10/2026 : le branding Higher au Club, deux clés, la totehmisation luxe

Migration `20261002_figher_club_luxury.sql` APPLIQUÉE par MCP (`20261002_figher_club_luxury`).

| vérifié le 02/10 | valeur mesurée |
|---|---|
| `_figher.member` | `comp OR (thp AND habit)` ; membres : 1 avant, 1 après (3 comptes) |
| porte de l'achat d'art | `_art_owns_thp(` restant : 0 · `_is_figher(` : 3 (primaire, revente, `market_view`) |
| `market_view(null,null)->door` | `{"thp": false, "habit": false}` |
| `luxury_access()` anonyme | `price_cents 50000 · eur · open true · thp false` |
| `luxury_settle` (selftest auto-annulé) | idempotent sur la session, pièce inconnue → `other`, note bornée à 280 → `SELFTEST_OK` |
| droits | `_figher`, `luxury_settle`, `art_*_reserve` : `service_role` seul · RLS active sur `luxury_offer`, `luxury_orders`, aucune politique |
| `luxury-checkout` v1 (pg_net) | `{quote:true}` → 200 `{price_cents:50000,currency:"eur",open:true}` · sans session → 401 `no_session` |
| `stripe-webhook` avant déploiement | v38 identique au dépôt (6 marqueurs comparés) |
| tests navigateur | `club_luxury.mjs` 29/29 · `market.mjs`, `streetwear.mjs`, `console.mjs` : 0 échec |
| prod (pg_net, après fusion `3272a73`) | `figher.club/` BUILD 2026-10-02 + `#higher-btn` · `/discover`, `/get_higher` portent `from:'method'` · `/stoner` 200 · `/api/geo` → `{"country":"IE","lisbon":false}` |
| prod boutique | `/luxury` 200 (`__totehm_luxury`) · accueil avec `data-club`, sans `hermes.jpg` · `/assets/img/hermes.jpg` 404 · `/discover` → `www.figher.club/discover` · `/assets/signs/stop.png` → figher.club (image/png, 16 260 o) |
| fonctions déployées | `stripe-webhook` v39 (POST sans signature → 400 `no signature`) · `higher-checkout` v36 (quote → 200, 1700 usd, 776 994 restants) · `luxury-checkout` v1 (quote → 200, 50000 eur) |
| non vérifié | un vrai paiement luxe de bout en bout (compte Stripe live seulement, aucun mode test dans la session) |

Pages : 7 pages + `api/geo.js` + `assets/signs/` passent de `boutique/` à `club/` ;
`boutique/vercel.json` et `space/vercel.json` redirigent (308) vers `www.figher.club/<page>`.
`higher-checkout` : `from:'method'` (depuis le Club) → `figher.club/stoner?checked=1`.
`stripe-webhook` : cas `luxury` → `luxury_settle` + email de confirmation ; lien de la
méthode dans l'email THP → `figher.club/stoner` (il pointait encore sur totehm.space).

## 0 · Bunny Stream — 02/10/2026 : configuration protégée activée

| vérification réelle (11:23 UTC) | résultat |
|---|---|
| accès API | bibliothèque 200, compte 200 ; BUNNY_ACCOUNT_API_KEY en secret serveur |
| protection CDN | ZoneSecurityEnabled true ; IP locking false ; BlockNoneReferrer false |
| test d'autorisation CDN | sans jeton avec Referer 403 ; signé sans Referer 404 (bibliothèque vide, signature acceptée) |
| webhook | URL bunny-webhook configurée ; clé lecture seule disponible ; unsigned/forgé 401 |
| activation | video_backend ready ; vrai spot_rules HTTP 200, video_provider bunny |
| contrôles serveur | faux lecteur/spot 404 ; aucun secret transmis au front |
| performance backend | API bibliothèque/paramètres en parallèle, sondes CDN en parallèle ; sonde sur vidéo déjà prête ; HD >=720p jouable sans attendre toutes les résolutions |
| fonctions déployées | create-bunny-upload v6 JWT ; bunny-video v5 JWT ; bunny-webhook v5 HMAC, JWT gateway false |
| maintenance ponctuelle | v3 retirée fonctionnellement : HTTP 410, aucun import/secret/réseau/mutation |
| tests backend | 12 scénarios, signature vérifiée par une implémentation indépendante ; hotlink faux positif, readiness HD/SD, upload en cours, webhook absent |
| tests navigateur | portrait + paysage/réseau lent : 39 contrôles passés ; TUS simulé expose correctement Location/Upload-Offset sous CORS ; fichier réellement décodé 1080 × 1920, audio conservé |
| limite du contrôle | zéro vidéo Bunny enregistrée : pas encore d'upload/encodage/CDN d'un nouveau Spot réel mesuré ; aucune supériorité TikTok revendiquée |
| test de compte de démonstration | refus auto-review : endpoint privilégié persistant avec créations sans nettoyage ; non déployé, aucun compte/spot créé |
| retour arrière | restaurer le helper précédent et son gating ; garder Token Authentication ON et webhook configuré ; le fallback Storage et les anciens clips restent disponibles |

## 0-précédent-fluidité · SPACE — 02/10/2026 : fluidité de capture, du feed et de publication

**État : [PR #15](https://github.com/gvllrd/totehm/pull/15) fusionnée (`7e86b2a`), déployé et vérifié.**
BUILD `2026-10-02-fluid-video`. Complète le Full HD ci-dessous ; remplace
le forçage HLS de qualité maximale. Aucun fichier HTML supplémentaire : les
cinq vues, panneaux desktop, gestes, boussole et joystick restent présents.

| mesure (02/10, ce lot) | résultat |
|---|---|
| référence avant | main `7dae705`, BUILD portrait-full-hd ; même navigateur logiciel et mêmes fichiers de test |
| capture native | demande 1080 × 1920 / 30 fps ; flux brut portrait directement enregistré, canvas seulement si crop nécessaire ; H.264 préféré si accepté, choix MediaCapabilities avec repli |
| piège caméra corrigé | crop-and-scale pouvait montrer du portrait et encoder le paysage brut ; contrôle du vrai fichier maintenu, adaptation d'aperçu seule refusée pour le chemin natif |
| cadence réelle, fixture en mouvement | avant 62 images / 4,553 s = **13,62 fps** ; après 122 / 4,0663 s = **30,00 fps** ; fichier réel 1080 × 1920, audio conservé |
| première image du clip suivant | **949 → 79 ms**, préchargement avant swipe ; signature artificiellement retardée de 600 ms, réponse média de 150 ms ; pas une mesure réseau de production |
| premier clip froid | **1 023 → 1 007 ms** dans ce même scénario ; pas de gain revendiqué sur cette étape réseau |
| rafraîchissement / pagination | avant lecteur remplacé ; après même nœud vidéo et même buffer ; réponse de géolocalisation tardive et page suivante vérifiées |
| chargement borné | un seul clip joue, au plus précédent/actuel/suivant ; suivant préparé après démarrage du visible ; jamais tout le feed ; metadata Storage/native et petit buffer HLS |
| économie / vie de page | Save-Data / 2G : pas de lookahead ; exit feed, background et logout libèrent sources/lecteurs ; réponse d'autorisation tardive écartée |
| radar | dessin réduit à son ancienne surface ; 15 fps derrière feed, 10 fps derrière caméra, transition 60 ; boussole immobile : **35 → 0 mutations DOM / 1,1 s** ; onglet caché suspendu |
| diffusion HLS | initialisation lecteur et autorisation en parallèle, qualité initiale selon débit, adaptation ensuite ; HLS natif sur master ; connexion lente n'impose plus le segment 8 Mbps |
| upload / publication | localisation/ville et binaire privés en parallèle après confirmation, aperçu en pause ; spot_create attend les deux ; upload terminé conservé si reprise nécessaire |
| encoding pending | première relecture après 1 s puis 2/4/5 s ; fixture processing→ready affichée en **1 213 ms**, deux appels, sans erreur JS |
| diagnostics locaux | __totehm_space().video : délai première image, upload/publication, frames décodées/perdues, lecteurs ; compteurs/enum, aucune donnée de membre |
| tests performance | space_performance.mjs : **16 contrôles**, mouvement réel encodé, réseau et API simulés, racé d'autorisation, arrière-plan et encodage pending |
| tests vidéo | space_video.mjs : **19 × 3 + 20 = 77 contrôles** ; paysage, portrait, HLS natif, connexion lente ; vrais fichiers TUS sondés/décodés, 9:16, audio et crop non déformé ; upload commence pendant la géolocalisation |
| parcours UI | space.mjs : **33 contrôles**, source paysage 4K simulée ; navigation, tactile, boussole, Habit Boxes, futur, lieu, publication Storage et joystick conservés ; zéro erreur JS |
| Bunny réel, diagnostic lu ce lot | secure_delivery_missing, checked_at 02/10 09:30 UTC ; API bibliothèque 200, paramètres compte 401 ; hostname/token/webhook key absents ; provider storage |
| blocage restant | vraie diffusion Bunny non activée ; upload 33 s / 10 Mbps + audio ≈42 MB, sa durée dépend du débit montant, puis de l'encodage ; clés bibliothèque seules insuffisantes |
| limites | mesures desktop avec encodeur logiciel et médias/services simulés ; pas de téléphone physique, CDN Bunny ou upload réel mesuré ; aucune supériorité TikTok annoncée |
| autres systèmes | aucune migration/Edge Function, donnée réelle, tarification, paiement, Stripe, Oracle/n8n modifié |
| Vercel preview + production | SPACE, COM, club, boutique : success ; commit code 75e65dc, fusion 7e86b2a |
| HTML public | https://www.totehm.space/ HTTP 200, BUILD fluid-video, 111 128 octets ; SHA-256 eb3165f2292b264d955a9cd0a9faee3cb58fc6a66c8ac8994fee55ca190c1820 ; identique au fichier testé |
| module public | video-capture.mjs HTTP 200, application/javascript, 5 111 octets ; SHA-256 983082f7ee468b788ee4f6a8491ca34d92ea9fda23dbfb524786ac72b799d80e ; identique au module testé |
| lecture publique réelle | sans session : clip actuel 1080 × 1920, readyState 4, en lecture et sans erreur ; suivant prêt/en pause ; après scroll le visible joue, le précédent se met en pause et un suivant est préparé ; aucun point exact révélé |
| anciens médias | un ancien clip public reste 1280 × 720 : contenu conservé, cadre 9:16 affiché ; ce lot ne réencode pas les vidéos historiques ni ne fabrique les images qui leur manquent |
| navigateur public | feed latéral, radar réduit, boussole et joystick conservés ; capture du rendu conservée ; aucune caméra physique ni publication réelle utilisée pour cette vérification |


## 0-précédent-Full-HD · SPACE — 02/10/2026 : le fichier vidéo devient un vrai Short Full HD

**État : migration et Edge Functions appliquées ; [PR #14](https://github.com/gvllrd/totehm/pull/14) fusionnée (`d150843`), déployé et vérifié.**
BUILD `2026-10-02-portrait-full-hd`. Cette section remplace les paramètres
vidéo du 01/10. Cinq vues, gestes, radar réduit, boussole et joystick gardés.

| mesure (02/10, ce lot) | résultat |
|---|---|
| défaut corrigé | la capture suivait l'orientation de l'écran et enregistrait du paysage ; un cadre CSS portrait seul ne changeait pas le fichier |
| nouvelle capture | source caméra haute résolution, recadrage central des images brutes avant leur seul encodage ; fichier 9:16, cible 1080 × 1920 / 30 fps, 10 Mbps + audio 192 kbps ; pas d'agrandissement artificiel d'une source insuffisante |
| démarrage enregistrement | la durée démarre sur MediaRecorder.onstart : un encodeur lent ne consomme plus toute la durée avant d’émettre ses images ; fichier vide/illisible rejeté avec reprise possible |
| cadres | feed, détail et caméra 9:16 sur mobile/desktop ; panneau caméra desktop portrait avec radar réduit ; REC/STOP rouge sur fond navy conservé |
| migration | fichier CLI `20261002071846_space_portrait_hd_video.sql` ; journal `20261002072508`, nom `space_portrait_hd_video`, APPLIQUÉE |
| plafond vidéo | videos check, video_reserve, spot_rules et bucket moments : **48 000 000 octets** ; 33 s, quota/jour et pending inchangés ; bucket privé ; pas de suppression de contenu |
| Edge Functions ACTIVE | create-bunny-upload v4 et bunny-video v3 : verify_jwt true ; bunny-webhook v3 : verify_jwt false avec HMAC-SHA256 obligatoire ; seul helper MAX_BYTES modifié |
| HLS | MSE/ManagedMediaSource : Hls.js local, première qualité maximale puis ABR ; natif sans MSE : meilleure variante du même dossier signé. Le master natif brut démarrait à 270 × 480 ; cette régression est testée |
| navigateur parcours complet | space.mjs : 33 contrôles ; radar, boussole, cinq vues/panneaux, lieu futur, publication Storage, retour tactile RIGHT/CENTER, défilement natif ; aucun JavaScript en erreur |
| tests vidéo | 18 contrôles × 3 cas : caméra paysage, caméra portrait, HLS natif sans MSE. Fichier TUS réellement capturé/sondé/décodé : 1080 × 1920 avec son ; carré non déformé, cadre rempli ; master HLS 270 × 480 + 1080 × 1920 démarre en Full HD |
| auto-test SQL annulé | space_habits_video_selftest.sql : FAIL={} ; 47 MB/33 s accepté, >48 MB refusé, Boxes, contexte, propriété et grants conservés |
| sécurité HTTP après redéploiement | upload anonyme 401 ; clip inexistant 404 ; callback sans signature 401 |
| intégrité relue | 0 Spot Selftest, 0 vidéo ; aucune fixture conservée en base |
| conseiller sécurité | videos et video_backend sans politique, service_role seul ; spot_rules public volontairement, search_path fixé ; aucun accès aux données élargi |
| Bunny réel, diagnostic du 02/10 06:42 UTC | secure_delivery_missing ; clés bibliothèque présentes et API vidéos 200, API configuration compte 401 ; hostname/token/read-only key manquants ; aucun secret rendu au client ou versionné |
| fonctionnement réel en attendant | capture portrait haute qualité et lecture originale signée dans moments PRIVÉ ; Bunny reste bloqué tant que la diffusion protégée n'est pas configurée |
| Vercel après fusion `d150843` | SPACE, COM, club, boutique : success |
| HTML public | https://www.totehm.space/ HTTP 200, BUILD attendu ; SHA-256 `01dbf34936eea407d9d07a9427e7a4c627561c99fc7e5b5500c8f449a8930533`, identique au fichier testé |
| module capture public | video-capture.mjs HTTP 200, MIME application/javascript, 3 366 octets ; SHA-256 `b3ebb22ef276c3ecec20a0f9ee22338a9ba72fff9bf7174e7ac37c4f37ce2402`, identique au module testé |
| navigateur public | FILM A SPOT · I AM HERE · 9:16 · up to 33 seconds ; caméra desktop 292,5 × 520 px (ratio 0,5625 = 9/16), radar réduit au-dessus et joystick navy conservés ; sans session membre ni capture de caméra réelle |
| limites des tests | caméras et services Bunny simulés ; pas de téléphone physique ni de CDN Bunny réel testé ; la qualité dépend du matériel et de la lumière |
| autre infrastructure | aucun prix, paiement, abonnement réel, webhook Stripe, Oracle ou n8n modifié |

## 0-précédent · SPACE — 01/10/2026 : boussole, Habit Boxes, création progressive, vidéo HD

**État : migrations et Edge Functions appliquées ; [PR #13](https://github.com/gvllrd/totehm/pull/13) fusionnée (`daad165`), déployé et vérifié.**
BUILD `2026-10-01-compass-habits-bunny`. Ce relevé remplace la section navigation précédente.

| mesure (01/10, ce lot) | résultat |
|---|---|
| migration principale | fichier `20261001215826_space_compass_habits_bunny.sql` ; journal `20261001220323` |
| réservation vidéo | fichier `20261001220550_space_bunny_upload_reservation.sql` ; journal `20261001220647` |
| Habit exacte | fichier `20261001222515_space_exact_habit_selection.sql` ; journal `20261001222604` |
| Habit Box COM | `space_habits` : nom, intentions, 33 fréquences, lieu habituel, WHY et TRIGGER reliés ; `space_discover` : nom complet exact puis repli intentions s’il n’existe pas de résultat lisible dans la vue |
| droits progressifs | PRIVATE / SHARED → ON / OFF → SILENT / SOCIAL seulement si ON ; contexte complet propriétaire seul ; lieu exact protégé inchangé |
| tables vidéo | `videos`, `video_backend` : RLS activée sans politique ; service_role seul ; `spot_plans.video_id` référence un clip possédé, utilisable une seule fois |
| règles relues | 33 s, 32 Mo ; durée 5–720 min ; 24 Spots/jour ; 10 futurs, horizon 90 jours ; bucket `moments` toujours privé |
| Edge Functions ACTIVE | `create-bunny-upload` v3 / `bunny-video` v2 : verify_jwt true ; `bunny-webhook` v2 : verify_jwt false, authentification HMAC-SHA256 obligatoire |
| Bunny réel | clé bibliothèque présente et API vidéos HTTP 200 ; API configuration compte HTTP 401 ; statut interne `secure_delivery_missing` |
| activation Bunny restante | `BUNNY_CDN_HOSTNAME`, `BUNNY_TOKEN_KEY`, `BUNNY_READ_ONLY_API_KEY`, protection Token Authentication du CDN et callback bibliothèque ; aucun secret lu, rendu au client ou versionné |
| comportement en attendant | capture HD 6 Mbps + audio 128 kbps, lecture Storage privée signée ; upload Bunny activé seulement quand une lecture signée protégée est vérifiée |
| auto-tests SQL annulés | `spots_selftest.sql`, `space_future_selftest.sql`, `space_habits_video_selftest.sql` : chacun `FAIL={}` ; propriété, abonnements, contexte, états, pagination, quota et grants |
| intégrité après tests | 12 Spots réels, 0 Spot `Selftest%`, 0 vidéo ; aucune fixture conservée |
| navigateur Chromium simulé | `space.mjs` : 33 contrôles ; `space_video.mjs` : 10 contrôles ; aucun JavaScript en erreur |
| navigation / radar | retour au centre depuis chaque côté dans les deux sens, tactile CDP réel, souris / trackpad ; boussole rotative ; lieu choisi dans le radar et conversion longitude vérifiée ; panneaux desktop + radar réduit, TOP réduit sur mobile |
| caméra / HLS local | REC rond → STOP carré rouge, fond navy remonté ; TUS direct vers Bunny sans Storage, reprise offset ; véritable lecture HLS 1080 × 1920 et segments conservant le préfixe signé ; services Bunny simulés |
| sécurité HTTP réelle | anon upload : 401 ; clip inexistant : 404 ; callback sans signature : 401 ; diagnostic uniquement en table privée |
| conseiller sécurité | RLS sans politique et RPC SECURITY DEFINER exposées volontairement ; auth / propriété / visibilité vérifiées, search_path fixé ; constats historiques hors lot conservés |
| Vercel après fusion `daad165` | SPACE, COM, club, boutique : **success** |
| HTML public | `https://www.totehm.space/` HTTP 200 ; BUILD attendu ; SHA-256 `1c9a383ae6e3994883c92e39b2badac6d1aed4eb0234132df99fe748a24ebe5b`, identique au fichier validé |
| module HLS public | `vendor/hls-1.6.13.mjs` HTTP 200, MIME JavaScript, 521 172 octets identiques au module testé |
| navigateur public | RADAR et boussole 000° N, rotation manuelle puis nord, RIGHT futur avec panneau latéral/radar réduit, retour central, TOP PLAN A SPOT avec contrôle de connexion ; sans session membre |
| autre infrastructure | SSO conservé ; aucun prix, paiement, abonnement réel, webhook Stripe ou Oracle modifié |

Bunny en production n’a PAS été annoncé actif : son encodage et son CDN réels
restent à vérifier après configuration. Tests caméra limités à 3 s dans le mock ;
limite réelle 33 s relue en base. Aucun test sur téléphone physique prétendu.

## 0-navigation · LOT PRÉCÉDENT DU 01/10/2026 : navigation et futur restaurés

**État : base appliquée, [PR #12](https://github.com/gvllrd/totehm/pull/12) FUSIONNÉE (`6f525a6`), déployé et vérifié.**
Ce relevé remplace les règles de navigation et l'interdiction du futur du
lot précédent ; les droits privé / abonné restent identiques.

| mesure (01/10, ce lot) | résultat |
|---|---|
| migration additive | `20261001201525_space_future_navigation.sql`, journal production `20261001202914` (`space_future_navigation`) |
| fonctions nouvelles | `spot_schedule` (connecté), `spots_list` (tous, futurs seulement), `spot_habit_context` (SA Habit, connecté) |
| état calculé | `will` avant starts_at → `am` pendant → `was` après ; aussi dans la mémoire du bot |
| lieu exact | coordonnées ET nom dans `exact` seulement ; propriétaire / abonnés actifs SHARED·ON |
| règles production relues | 33 s, décompte 3 s, 20 Mo ; durée 5–720 min ; 24/jour ; 10 futurs, horizon 90 jours |
| auto-test droits existants | `tests/sql/spots_selftest.sql` : `FAIL={}` (annulation volontaire) |
| auto-test futur | `tests/sql/space_future_selftest.sql` : `FAIL={}` (création, validations, pagination même date, filtres, droits, transitions, bot, GRANT ; annulation volontaire) |
| intégrité après tests | 11 Spots réels, 0 Spot `Selftest%`, 0 abonnement créateur ; aucune fixture conservée |
| Vercel après fusion `6f525a6` | SPACE, COM, boutique et club : **success** (statuts du commit) |
| version publique vérifiée | `https://www.totehm.space/` **HTTP 200**, `BUILD='2026-10-01-navigation'` ; réponse HTML identique octet pour octet au fichier validé (SHA-256 comparé) ; panneau futur et radar réduit observés dans le navigateur |
| navigateur Chromium, Supabase simulé | **56/56** ; desktop 1440 et 1024, mobile 390, véritables événements tactiles CDP, souris, trackpad, SDK / vidéo enregistrée |
| UI / gestes | joystick COM coloré, panneaux desktop et radar réduit, filtre Habit Box central, TOP futur détaillé, RIGHT futurs, BOTTOM REC/STOP sur joystick |
| identité / paiement / infrastructure | SSO conservé ; aucun prix, abonnement réel, secret, webhook Stripe ou Oracle changé |
| conseiller sécurité Supabase | exposition RPC SECURITY DEFINER volontaire pour les 3 fonctions, auth / propriété / visibilité vérifiées, search_path fixé ; [règle du linter](https://supabase.com/docs/guides/database/database-linter) ; constats historiques hors lot conservés |

Tests vidéo raccourcis à 3 s dans le mock ; limite réelle relue en base :
33 s. Captures et binaire Chromium sont des fichiers de travail, pas du
contenu produit. Aucun test sur un téléphone physique prétendu.

## 0a · LOT PRÉCÉDENT DU 01/10/2026 — UN SPOT, DEUX RÉGLAGES, L'ABONNEMENT ANNUEL

> **ÉTAT : APPLIQUÉ, DÉPLOYÉ, FUSIONNÉ (`main` = 72a93f1), relevé le 01/10.**
> Migration `20261001_un_spot_deux_reglages.sql` appliquée par la session
> cloud en six morceaux (`20261001_a…g`), sans rien de destructif. Le ménage
> `20261001_b_menage.sql` (les `drop`) attend Claude Code (`CLAUDE_CODE.md`).
>
> | mesure (production, 01/10) | valeur |
> |---|---|
> | `demo_purge()` avant migration | **42** Spots, **10** membres de démo ; `demo_members` = 0 |
> | `spot_plans` réels | **11** (6 publiés, 5 annulés), tous `shared` |
> | lignes `spots` actives de l'Espace | **6** ; position à 0,1° : **11/11** |
> | seau `moments` | **privé**, 20 Mo |
> | `totehms` | 3 : `members` 2 (= VISIBLE TO MY SUBSCRIBERS jusqu'au ménage), `private` 1 ; `_vis_shared()` = `members` |
> | `creator_subscriptions` | 0 (le passage à l'annuel ne touche personne) |
> | droits | anon : `spots_feed` oui, `spots_exact` non, ancien `spots_radar` non ; authenticated : `_bot_memory` non |
> | auto-test `tests/sql/spots_selftest.sql` (annulé) | `create_private=true · create_shared_off=true · create_shared_on=true · state_now=was · C_totehm=private · page_period=year · vis_private=true · memory_spots=3 · FAIL={}` |
> | Edge Functions | `club-billing` **v3** (retour totehm.com/console), `creator-subscribe` **v10** (`interval: year`) — verify_jwt true |
> | Vercel (72a93f1) | `com`, `space`, `boutique` **READY** ; `www.totehm.space` sert `BUILD='2026-10-01'` ; `www.totehm.com/console` **200** |
> | tests navigateur | space 42/42 · console 12/12 · market 14/14 · streetwear 11/11 |
>
> **⚠️ figher.club n'est servi par AUCUN des trois projets de l'équipe Vercel
> `gvllrds-projects`** (com · space · boutique) : `club/` (dont la redirection
> `/console` → totehm.com et le marché) n'a pas de cible de déploiement
> visible d'ici. À relier (projet Vercel `club`, dossier racine `club/`, domaines
> `figher.club` + `www`) — décision et accès de Wah.

## 0bis · LOT DU 30/09/2026 — LA SOURCE UNIQUE : IDENTITÉ · DROITS · PROPRIÉTÉ · MARCHÉ · MOMENTS

> **ÉTAT : migration `20260930_la_source_unique.sql` APPLIQUÉE le 30/09/2026
> par Claude (MCP Supabase), testée d'abord dans une transaction annulée.**
> Relevé en production après application (30/09) :
>
> | mesure | valeur |
> |---|---|
> | exemplaires `art_editions` | **6** (les 6 THP existants, numérotés #1–6 dans l'ordre de `granted_at`) |
> | `art_transfers` | 6 (une ligne `grant`/`primary` par exemplaire rétro-frappé) |
> | collections actives | **3** (totehmpaper · quantum · play-the-lisbon-street), redevance 700 bps |
> | œuvres rattachées à une collection | **43** |
> | prix du THP (`artworks` `totehmpaper`) | **1 700** centimes USD |
> | `market_incidents` | 0 |
> | `spot_plans` : expériences / moments | 52 / 0 |
> | seau `moments` | public, 2 politiques (insertion et suppression dans son dossier) |
> | versions de `spot_publish` | **1** (l'ancienne à 16 paramètres supprimée) |
> | `anon` peut exécuter | `market_view`, `moments_feed`, `creator_page`, `my_entitlements` |
> | `anon` ne peut PAS exécuter | `art_settle`, `art_primary_reserve`, `art_resale_reserve`, `art_list`, `my_collection`, `moment_publish`, `spot_video_set` |

| objet | ce qui change |
|---|---|
| `sso_handoff.code_challenge` | le défi PKCE d'une connexion centrale (NULL = code du pont, comme avant) |
| `_subscriber_of`, `creator_page`, `my_entitlements` | NOUVELLES — un seul système de droits ; `is_subscribed_to` et `totehm_of` réécrites dessus |
| `art_collections`, `art_editions`, `art_transfers` (ajout seul), `art_reservations`, `market_incidents` | NOUVELLES — la propriété et le marché |
| `artworks.collection` + ligne `totehmpaper` | le THP devient une œuvre (777 000 exemplaires) |
| trigger `stoner_access_mint` | chaque ligne de `stoner_access` frappe l'exemplaire THP suivant |
| `_figher` | la clé THP lit les exemplaires (repli `stoner_access`) ; numéro = n° d'exemplaire |
| `market_view`, `my_collection`, `art_list`, `art_unlist` | NOUVELLES — lecture et mise en vente |
| `art_primary_reserve`, `art_resale_reserve`, `art_reservation_session`, `art_release`, `art_settle` | NOUVELLES, `service_role` seul — le cycle d'un achat |
| `spot_plans.kind · shield · video · city` | un Spot (expérience) ou un moment ; bouclier ; vidéo ; ville |
| `spot_publish` (19 param.), `moment_publish`, `spot_video_set`, `moments_feed`, `_exact_ok`, `_clip_ok` | l'Espace |
| `spots_radar`, `spots_past`, `spots_globe`, `my_space` | expériences seules sur le radar ; `state` (will · am · was) ; bouclier ; position publique à 2 décimales |

### Edge Functions du lot — TOUTES DÉPLOYÉES le 30/09 (Claude Code)

| fonction | version en ligne | verify_jwt |
|---|---|---|
| `sso-mint`, `sso-redeem` | v6 | true |
| `stripe-webhook` | v36 (cas `artwork` et `resale` → `art_settle`) | false |
| `artwork-checkout` | v14 (réservation, `slug`) | true |
| `market-checkout` | v1 — NOUVELLE | true |
| `higher-checkout` | v33 (prix lu dans `artworks`, `quote` sans session) | false |
| `creator-subscribe` | v8 (`from:'com'` → `totehm.com/@nom`) | true |

**Endpoint Stripe vérifié le 30/09 (connecteur Stripe, compte live
« Higher »)** : `we_1U2T6Y…`, activé, écoute `checkout.session.completed`,
`invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`,
`customer.subscription.deleted`.

**Après déploiement (Claude Code, 30/09)** : `market_selftest.sql` vert en
production (rien laissé) ; `higher-checkout` `{quote:true}` →
`{"amount":1700,"currency":"usd","left":776994}` ; `main` = `8b07207`,
Vercel READY ; les onze contrôles du runbook verts.

### Pages du lot

`com/auth.html` (nouvelle), `com/creator.html` (nouvelle, `/search` et
`/@nom`), `com/totehm.html`, `com/vercel.json` · `club/market.html`
(nouvelle), `club/index.html`, `club/console.html` · `space/index.html`,
`space/vercel.json` (caméra) · `boutique/streetwear.html`,
`discover.html`, `discover_lisbon.html`, `get_higher.html`,
`origins.html`, `play_lisbon_street.html`. `BUILD='2026-09-30'` partout
où la page en porte un.

**Tests** : `tests/browser/space.mjs` (31), `market.mjs` (14),
`streetwear.mjs` (11) — verts le 30/09, Supabase simulé.

**Retour arrière** : les pages se redéploient depuis le commit précédent ;
la base garde ses nouvelles tables (vides ou de 6 lignes) sans effet sur
l'ancien code, sauf `spot_publish` (16 → 19 paramètres, les anciens gardent
leurs valeurs par défaut) et la position publique à 2 décimales.

## 0 · LOT DU 28/09/2026 — YESTERDAY = TOUS LES ANCIENS SPOTS · LE NAVY = LE TOTEHM

> **ÉTAT : migration `20260928_space_hier_tous.sql` appliquée le 28/09/2026
> par Claude (MCP Supabase) — AVANT la page.** Avant : aucune fonction
> `spots_past` n'existait ; `spots_radar` déployé relu (source de la
> copie). Contrôles après : `anon` peut l'exécuter (lecture publique,
> comme le radar) ; autour de Lisbonne sur 60 km elle rend 15 Spots
> terminés, sans créateur ni contexte pour un invité.

| objet | ce qui change |
|---|---|
| **`spots_past(lat, lng, radius, q, limit)`** — NOUVELLE | les Spots publiés et TERMINÉS depuis moins d'un an dans la portée, du plus récent au plus ancien, 60 au plus ; mêmes règles de lecture que `spots_radar` ; `again` = le lecteur est membre du Club |

**Pages** : `space/index.html` (`BUILD='2026-09-28'`) — YESTERDAY lit
`spots_past` (liste jour par jour + carte) ; My Spots et Joined dans le
coin membre ; les sept intentions de Search reprennent les rangées du
26/09 ; filtres, manette et trois clés sortent du navy.
`club/index.html`, `club/console.html` (`BUILD='2026-09-28'`) — les
boîtes d'accès, d'abonnement, de solde et les portes passent au gris
(filet vert = actif) ; seule Reveal the Box garde la couleur de la vue.

**Retour arrière** : `drop function public.spots_past(double precision,
double precision, integer, text, integer);` et redéployer la page du 27/09.

## 0 bis · LOT DU 27/09/2026 — YESTERDAY · TODAY · TOMORROW · LE CLUB · PLUS DE MONTSERRAT

> **ÉTAT : migration `20260927_space_hier.sql` appliquée le 27/09/2026 par
> Claude (MCP Supabase, projet `abujjbkbbiumxrokozph`) — AVANT la page.**
> Avant de l'appliquer, le corps déployé de `my_space` a été comparé à
> celui du dépôt (empreinte md5 identique, `3a53e747…`). Contrôles après :
> le corps contient `365 days` et plus `30 days` · `anon` ne peut pas
> l'exécuter · `authenticated` peut.

| objet | ce qui change |
|---|---|
| **`my_space()` v4** | mes Spots et mes candidatures sur **365 jours** (au lieu de 30) — la vue YESTERDAY ; mêmes champs, mêmes droits |

**Pages** : `space/index.html` (`BUILD='2026-09-27'`) — Today · Create ·
Search · Yesterday · Tomorrow, My space au coin membre, carte de rue dès
l'arrivée, rendez-vous en plein écran ; `club/index.html` et
`club/console.html` (`BUILD='2026-09-27'`) — Bebas Neue, saisies et
boutons gris arrondis, la tuile perforée réservée au nom d'un Totehm,
point blanc, sortie `scope:'local'`.
**Plus de Montserrat** : `com/totehm.html` (titres de vue, rangs,
wordmark, accroche du cercle → Bebas Neue), `com/higherself.html`,
`com/totehm_7_intentions.html`, `com/club/totehmbot.html`, et les sept
pages `boutique/` qui l'utilisaient — le slogan Higher y est désormais un
tracé vectoriel (plus de `<text font-family="Montserrat">`).

**Testé** : navigateur (Chromium sans tête, client Supabase simulé) —
**80 vérifications** pour l'Espace (1440 et 390 × 844, vrais événements
tactiles : toucher la carte, glisser la carte sous la croix, loupe) et
**15** pour le Club, zéro erreur JS. Non testé ici : la base réelle depuis
le navigateur, et `com/totehm.html` / `boutique/` (changements de police
et de symbole uniquement) → bloc B du `CLAUDE_CODE.md`.

**Retour arrière** : rejouer `my_space` depuis `20260926_space_monde.sql`.

---

## 0 · LOT DU 26/09/2026 — TOTEHM.SPACE À L'ÉCHELLE DU MONDE · NATURE D'UN SPOT · GLOBE

> **ÉTAT : migration `20260926_space_monde.sql` appliquée le 26/09/2026
> par Claude (MCP Supabase, projet `abujjbkbbiumxrokozph`) — AVANT la page.
> Elle est additive pour la page du 25/09 (`p_venue` a un défaut).**
> Contrôles relevés après application : `spot_publish` = **une seule
> version** (16 paramètres), `anon` refusé · `spots_globe` exécutable par
> `anon` · `spots_globe()` = **11 cellules, 43 Spots** après
> `demo_seed()` · **5** plans `private` · `spot_rules()->round_private` = 2.

| objet | ce qui change |
|---|---|
| **`spot_plans.venue`** | NOUVELLE colonne `text not null default 'public'`, `check in ('public','private')` |
| `spot_rules()` | `+ round_public 3 · round_private 2 · local_radius_km 60` |
| **`spot_publish(…, p_venue text default 'public')`** | 16 paramètres ; l'ancienne (15) est SUPPRIMÉE. Refus `venue` ; `spots.lat/lng` arrondis à 3 décimales (public, ~110 m) ou 2 (privé, ~1,1 km) |
| `spots_radar` · `my_space` | rendent `venue` ; `venue` entre dans les mots cherchés |
| **`spots_globe(p_when, p_intention, p_q, p_mode)`** | NOUVELLE, `anon` : des CELLULES (½° × ½°) — position moyenne publique, `n`, `live`, intention dominante. **Zéro identité, zéro contexte** |
| démo | `_demo_seed_world()` : 10 Spots dans le monde (New York, Tokyo, Berlin, Rio, Paris-privé, Londres, Le Cap, Sydney, Mexico, Bali-privé) + 3 Spots lisboètes passés en privé ; `demo_seed()` l'appelle |

**Fichiers servis** : `space/earth.json` (Natural Earth 1:110 M + 1 251
villes, 100 Ko) et `space/earth50.json` (côtes 1:50 M simplifiées, 360 Ko)
— domaine public. **Fond de rue** : tuiles `tile.openstreetmap.org`, en
création seulement, attribution affichée.

**Page** : `space/index.html`, `BUILD='2026-09-26'`.

**Testé** : navigateur (Chromium sans tête, client Supabase simulé, tuiles
et données Terre servies localement) — **101 vérifications**, desktop 1440
et téléphone 390 × 844 (vrais événements tactiles : balayage, appui long,
pincement à deux doigts), zéro erreur JS.

**Retour arrière** : rejouer `spot_publish` (15 paramètres), `spots_radar`
et `my_space` depuis `20260925_space_manette.sql` APRÈS
`drop function public.spot_publish(text,text[],uuid[],bigint[],boolean,timestamptz,integer,text,double precision,double precision,text,integer,text,text,text,text)` ;
`drop function public.spots_globe(text,text,text,text)` ; la colonne
`venue` peut rester (défaut `public`).

---

## 0 · LOT DU 25/09/2026 — TOTEHM.SPACE À LA MANETTE · BOÎTE-ACTION · LIMITES

> **ÉTAT : migration `20260925_space_manette.sql` appliquée le 25/09/2026
> par Claude (MCP Supabase, projet `abujjbkbbiumxrokozph`) — AVANT la page,
> et elle est additive : la page du 24/09 marche avec elle.**
> Contrôles relevés après application : droits `spot_rules` =
> `anon·authenticated·service_role` · `spot_publish` / `my_space` =
> `authenticated·service_role` (anon toujours refusé) · `spots_radar` =
> `anon·authenticated·service_role` · `my_space()->'limits'` =
> `{upcoming, max_upcoming:10}` · `spots_radar` à Lisbonne après
> `demo_seed()` : **today 3 · tomorrow 11 · next7 28 · later 29**.

| objet | ce qui change |
|---|---|
| **`spot_rules()`** | NOUVELLE, `immutable` — `max_upcoming 10 · capacity 1–50 · duration 5–720 · horizon_days 90`. La page lit ses bornes ici |
| `spot_publish(…)` | même signature, même corps — les CHIFFRES viennent de `spot_rules()` |
| **`spots_radar`** | même signature (9) — `p_when` accepte en plus `tomorrow`, `next7`, `later` (bornes = minuits de Lisbonne, jamais aujourd'hui) |
| **`my_space()` v3** | `limits {upcoming, max_upcoming}` ; mes Spots : `+ comment · mood · exact` ; candidatures : `+ lat/lng publics · exact (accepté seulement) · comment · selection · access · mood` |
| démo | `demo_seed()` relancé le 25/09 (32 Spots, 10 membres) |

**Pages** : `space/index.html` réécrite (la manette, cinq crans),
`BUILD='2026-09-25'` ; `com/totehm.html` — une ligne (la molette
horizontale du joystick suit le doigt), `BUILD='2026-09-25'`.

**Testé** : navigateur (Chromium sans tête, client Supabase simulé avec les
Spots de démo réels) — **83 vérifications**, desktop 1440 et téléphone
390 × 844, zéro erreur JS. Non testé ici : la base réelle depuis le
navigateur (le conteneur ne joint pas `esm.sh`/`supabase.co`) → bloc B du
`CLAUDE_CODE.md`.

**Retour arrière** : rejouer `spots_radar` et `my_space` depuis
`20260924_space_cockpit_fondateur_demo.sql`, `spot_publish` depuis
`20260923_le_club_l_espace_la_boite.sql` (ce sont les versions qui
tournaient avant ce lot — `spots_radar` relevé identique le 25/09) ;
`drop function public.spot_rules()` APRÈS `spot_publish`.

---

## 0 · LOT DU 24/09/2026 — TOTEHM.SPACE COCKPIT · ACCÈS FONDATEUR · DÉMO

> **ÉTAT : appliqué le 24/09/2026 par Claude Code — contrôles : _figher `true·true` · spots_demo `32·10·10·1·9` · radar `1·0·2` · droits `false·false·false·true·false` · advisors : aucune alerte nouvelle.**

**Testé** : réplique locale (schéma du 23/09 + ce lot) — migration passée
deux fois, **46 assertions SQL** (accès, démo, recherche, candidature,
publication, reseed, purge, retour arrière) + les **109 du 23/09** toujours
vertes ; **navigateur** avec les RPC de l'Espace exécutées contre la vraie
base de la réplique : **59 vérifications**, zéro erreur JS, zéro
défilement horizontal au téléphone.

| objet | ce qui change |
|---|---|
| table **`figher_comps`** | NOUVELLE — accès offerts (email, raison, dates). RLS, zéro politique. Contient `gvallerand5@gmail.com` |
| `_figher(uuid)` | `member = comp OR trois clés` ; clé `comp` en plus |
| **`spots_radar`** | **signature v2** (9 paramètres : `+ p_when`, `+ p_intention`) — l'ancienne (7) est SUPPRIMÉE ; recherche par mots, portée selon le rôle ; rend `freq`, `mood`, `demo` ; `why_not` teste le passeport d'abord |
| `my_space()` | rend `freq`, `context`, `intentions`, `demo`, `capacity`/`taken` des candidatures (pour dessiner la boîte) |
| colonne `spot_plans.demo` | NOUVELLE, `false` par défaut |
| table **`demo_members`** | NOUVELLE — les dix membres de démo (pour les purger) |
| `demo_seed()` · `demo_purge()` | NOUVELLES, `service_role` seul. La migration lance `demo_seed()` |
| `auth.users` | + 10 lignes `*@demo.totehm.invalid` (supprimées par `demo_purge()`) |

**Page** : `space/index.html` réécrite (cockpit), `BUILD='2026-09-24'`.

---

## 0 · LOT DU 23/09/2026 — EN LIGNE, TOUS CONTRÔLES VERTS

> **À lire avant tout le reste.** Lot **appliqué le 23/09/2026 au soir,
> finalisé le 24/09 au matin** : migration
> `20260923_le_club_l_espace_la_boite.sql` passée en base (22 fonctions,
> `false·false·false·true` sur les privilèges), six Edge Functions
> déployées sur `abujjbkbbiumxrokozph`, push GitHub à jour, **8/8
> contrôles post-déploiement verts** (§10 du CLAUDE_CODE).
>
> **Les trois clics d'admin qui restaient à Wah ont été faits par Claude,
> par API :**
> - **Stripe webhook `invoice.paid`** ajouté sur l'endpoint
>   `…functions/v1/stripe-webhook` (5 events désormais). `member_ledger`
>   reçoit chaque facture via `ledger_creator_invoice`.
> - **Stripe Customer portal** — une configuration par défaut a été créée
>   (features : update email/nom/adresse, historique factures, moyen de
>   paiement, annulation **en fin de période** — matche `ending` du grand
>   livre). Retour vers `figher.club/console`.
> - **Vercel `figher.club`** — le projet `club` et les domaines
>   `figher.club` (redirige 308 vers `www`) et `www.figher.club` étaient
>   déjà attachés côté Vercel ; la propagation DNS a rattrapé le 24/09.
>
> **Pattern pour toute future action Stripe** : la clé restricted vit
> dans `~/totehm/oracle/stripe-claude` (chmod 600, gitignoré). Lecture :
> `KEY=$(cat ~/totehm/oracle/stripe-claude) && curl -u "$KEY:" …`.

**Comment c'est testé.** Une réplique locale du schéma de production
(Postgres 16, rôles `anon`/`authenticated`/`service_role`, `auth.uid()`
simulé, les tables, contraintes et fonctions que le lot touche) : la
migration passe d'un bloc, se rejoue sans erreur, et **109 assertions SQL**
passent — dont deux candidatures simultanées sur une place. Les quatre
pages passent en navigateur (Playwright, faux Supabase qui refuse ce que le
vrai refuse) : **69 vérifications**, zéro erreur JS, zéro défilement
horizontal au téléphone. Chaque page porte `BUILD='2026-09-23'` et un
diagnostic console (`__totehm_club()`, `__totehm_space()`,
`__totehm_cloth()`) — des booléens et des compteurs, jamais une donnée de
membre.

### Ce que la migration `20260923_le_club_l_espace_la_boite.sql` crée

| bloc | objets | qui y touche |
|---|---|---|
| A · passeport FIGHER | `_figher(uuid)` · `_is_figher(uuid)` · `figher_access()` · `totehmbot_access()` réécrite | pages : `figher_access`, `totehmbot_access` (même `anon`) |
| B · l'argent | tables **`member_ledger`** (append-only, `unique(source,kind)`, RLS lecture propre) et **`member_payouts`** (`unique(user_id,currency,period)`) · colonnes `creator_profiles.monetized`, `.benefits` · `creator_subscriptions.ending` · `payout_rules()` · `ledger_creator_invoice(…)` · `_balances(uuid)` · `payouts_due(text)` · `payout_mark_paid(…)` | webhook et Wah : `service_role` seul |
| C · lecture à sens unique | `is_subscribed_to(uuid)` réécrite · `_shared_with_me(uuid)` · 4 politiques `… members read` remplacées (`totehms`, `objectives`, `wisdom`, `visions`) · `totehm_of(text)` réécrite · `monetization_set(bool,int,text[])` · `creator_card(text)` · `creator_offer(text,uuid)` | pages connectées ; `creator_offer` : `service_role` |
| D · la Boîte | colonnes `totehm_clothes.box_kind`, `.box_ref`, `.box_snapshot`, `.palette` · `_box_matter(…)` · `my_box_matter(text,text)` · `reveal_cloth(text)` · `decode_cloth(text)` réécrite | `reveal_cloth`, `decode_cloth` : même `anon` |
| E · l'Espace | tables **`spot_plans`** (RLS active, **zéro politique**) et **`spot_applications`** (`unique(spot_id,user_id)`) · `_spot_compat` · `_spot_expire` · `spot_publish` · `spots_radar` · `spot_apply` · `spot_withdraw` · `spot_decide` · `spot_cancel` · `my_space()` | `spots_radar` : même `anon` ; le reste : connectés |
| F · la console | `club_console()` | connectés |

**Extension** : `pg_trgm` (schéma `extensions`) — la compatibilité d'un Spot.
**Droits** : tous les `revoke`/`grant` sont en fin de fichier, après le
dernier `create` (règle du GRANT à PUBLIC). Les tables neuves n'acceptent
aucune écriture directe de `anon`/`authenticated`.

### Ce qu'elle corrige dans l'existant

| avant | après |
|---|---|
| `totehm_visibility='members'` ouvrait le Totehm à **tout** membre connecté | partagé + monétisé → **abonnés seulement** |
| la politique `visions members read` visait `public` (**anon compris**) | `authenticated` |
| `totehmbot_access` : annuel + complet | la règle FIGHER entière : + THP |
| `decode_cloth` rendait le texte de toute pièce | une pièce née d'une Box renvoie vers Reveal the Box |

### Edge Functions du lot — à déployer

| fonction | ce qui change |
|---|---|
| `stripe-webhook` | `invoice.paid` → `ledger_creator_invoice` ; `ending` sur les abonnements créateur ; efface sa ligne `stripe_events` avant de rendre 500 |
| `subscription-checkout` | mode `preview` (le prix sans Checkout) ; porte FIGHER ; URLs `SITE_CLUB` |
| `create-checkout` | session obligatoire ; modèle Box (`box_kind`/`box_ref` → `_box_matter` → `box_snapshot`) ; style curaté ; passeport |
| `creator-price` | `upsert` au lieu d'`update` (la fiche pouvait ne pas exister) |
| `creator-subscribe` | par pseudo, via `creator_offer` ; URLs `SITE_CLUB` |
| `club-billing` | **NOUVELLE** — portail Stripe · annulation en fin de période d'un abonnement à un membre |

`_shared/origins.ts` porte déjà `SITE_CLUB = "https://www.figher.club"` —
**à vérifier** dans le déployé avant de déployer les autres.

### Pages du lot

`club/index.html` (NOUVELLE version) · `club/console.html` (NOUVEAU) ·
`space/index.html` (NOUVEAU) · `space/vercel.json` (la redirection `/` →
`totehm.com/map` retirée) · `boutique/streetwear.html` · `com/club/index.html`
et `com/club/creator.html` (devenus des ponts) · `com/totehm.html` (lien de
monétisation vers la console, `BUILD='2026-09-23'`).

---

## 1 · Architecture documentaire

```
BRAND.md             qu'est-ce que TOTEHM et pourquoi
TOTEHM_MASTER.md     l'architecture des quatre domaines, les décisions,
                     les prix, les arbitrages (§0) — NON versionné
CLAUDE.md            comment on construit — TRANSVERSE
backend/SYSTEM.md    ce qui existe — TRANSVERSE (ce fichier)
backend/README.md    comment marche le backend
CLAUDE_CODE.md       la consigne terminal du dernier lot
```

**Depuis le 23/09/2026, un seul master** — le MASTER ARCHITECTURE de Wah —
remplace `TOTEHM_MASTER.html` et les trois masters par domaine. Une décision
qui touche plusieurs domaines va dans `CLAUDE.md` (le comment) ou dans le §0
du master (le quoi), jamais dupliquée — c'est ce qui a produit l'incident du
SSO et celui des 70 €/79 €.

### Les quatre domaines — état au 23/09/2026

```
~/totehm/
  com/         →  www.totehm.com        LA SOURCE : le Totehm, la Map, HigherSelf
                                        + com/club/* = deux ponts vers figher.club
  club/        →  www.figher.club       adhésion · droits · abonnements · argent
  space/       →  www.totehm.space      les Spots (+ 308 de l'ancien Stoner)
  boutique/    →  www.higher.boutique   le Cloth + la méthode Stoner et le THP
  backend/     →  servi par PERSONNE
  oracle/      →  clés SSH, gitignoré
```

**Le 23/09 à 12:06** (commit « l'expérience stoner rentre à la maison »), les
pages Stoner et THP sont passées de `space/` à `boutique/`, et
`space/vercel.json` redirige leurs anciennes URL vers `higher.boutique`.

⚠️ **Le projet Vercel qui sert `www.figher.club` et son dossier racine
(`club/`) ne sont PAS relevés dans ce document** — à vérifier dans le
dashboard avant de dire que le Club est en ligne.

<details><summary>Les trois domaines avant le 23/09 — archive</summary>

```
~/totehm/
  com/         →  www.totehm.com        le Figher Club — réseau social privé, porte internationale
  space/       →  www.totehm.space      expérimentation branding, méthode Stoner, TotehmPaper {THP}
  boutique/    →  www.higher.boutique   le Cloth
  backend/     →  servi par PERSONNE
  oracle/      →  clés SSH, gitignoré
```

</details>

**Swap 15/09/2026 :** les CONTENUS de `com/` et `space/` ont été échangés
(le mapping Vercel folder → URL reste fixe). `totehm.com` sert maintenant
ce que `totehm.space` servait, et inversement. Toute section de ce document
antérieure au 15/09 qui parle de ce qui vit « sur .space » ou « sur .com »
doit se lire à la lumière de cette inversion.

Le projet Vercel qui sert `higher.boutique` s'appelle **`totehm`** (nom
historique). Celui qui sert `totehm.space` s'appelle **`space`** et celui
qui sert `totehm.com` s'appelle **`com`** — noms Vercel inchangés au 15/09.
La confusion a déjà coûté un incident — **vérifier le domaine, pas le nom**.

**Quatre origines = quatre `localStorage` = quatre sessions.** Aucune session
n'est partagée, et il ne peut pas y en avoir : c'est le modèle de sécurité des
navigateurs. Le compte est unique, la session ne l'est pas. **Ce qui existe
depuis le 17/09, c'est un PONT** : `sso-mint` (code 60 s, usage unique, haché,
un domaine cible parmi `com` · `space` · `boutique` · `club`) → `sso-redeem`
(`generateLink` → `verifyOtp`). Le membre traverse sans se reconnecter.
**Jamais un jeton de session dans une URL** — le « token handoff » du MASTER
§4 n'est pas appliqué (`TOTEHM_MASTER.md` §0.1).

---

## 2 · totehm.com — routing Vercel (au 28/08/2026)

> **⚠️ DÉPASSÉ.** Ces pages sont passées sur `space/` au swap du 15/09, puis
> sur `boutique/` le 23/09. Relevé du dépôt le 23/09 : `boutique/vercel.json`
> ne porte **que des en-têtes** — le routage par pays et par cookie décrit
> ci-dessous n'existe plus nulle part ; `/` de `higher.boutique` sert la
> boutique, et les Discovers se servent à `/discover` et `/discover_lisbon`.
> Le tableau des prix du THP reste l'état mesuré le 01/09 — non re-mesuré.

```
vercel.json (com/vercel.json)
  /  + cookie totehm_geo=lisbon         → discover_lisbon.html
  /  + cookie totehm_geo=global         → get_higher.html
  /  + header x-vercel-ip-country=PT   → discover_lisbon.html
  /  (défaut)                           → discover.html   ← international
  /lisbon                               → discover_lisbon.html
  /global                               → discover.html
```

**Fichiers actifs :**
- `discover.html` — Discover international (manifeste neurologique, 9 slides, format identique à la version Lisbon)
- `discover_lisbon.html` — Discover Lisbon ; 22 panneaux de signalisation lisboètes superposés sur photo de rue — chaque signe ouvre sa vidéo dans une boîte en verre 3D rotative (`.vbox-scene`, voir `CLAUDE.md`)
- `get_higher.html` — paywall TotehmPaper (à confirmer — probable doublon de `discover_lisbon.html`) ; bouton "Play the street ↓" ouvre le même panneau de 22 signes ; logo TOTEHM dans boîte en verre 3D (idle + drag)
- `stoner.html`, `stoner_terms.html` — derrière le gate

**Fichier supprimé :** `lisbon.html` (remplacé par `discover_lisbon.html`).

### TotehmPaper {THP} — pricing (au 01/09/2026)

| Géographie | Prix | Logique |
|---|---|---|
| **Lisbonne** (`geo:'lisbon'`) | €11 → €76+ | Paliers en nombre d'or sur le compteur de membres |
| **International** (`geo:'global'`) | **€77 fixe** | Forfait — Totehm est née à Lisbonne |

Le `geo` est transmis dans le body POST vers `higher-checkout`. La fonction sert
le bon prix sans jamais exposer de montant côté client.

- `discover_lisbon.html` → `{ geo: 'lisbon', waiver: true, ... }`
- `discover.html` → `{ geo: 'global', waiver: true, ... }`

Stripe affiche : `"TotehmPaper — International"` (global) ou `"Figher Club — Higher · Tier N"` (Lisbonne).
`metadata.geo` est stocké dans chaque Checkout Session pour traçabilité.

---

## 3 · Figher Club — pricing officiel

> **Ces décisions sont prioritaires sur toute règle de pricing antérieure.**
> Ne pas implémenter tant qu'une tâche dédiée n'est pas demandée.
> Ne pas hard-coder les paliers dans le frontend.

### Le modèle

```
7 DAYS FREE
→ membership annuel payant
→ prix d'entrée actuel : 77 €/an
→ pas d'abonnement mensuel
→ pas de Free Plan permanent
```

### Gating — LE PASSEPORT FIGHER, 23/09/2026 (écrit, pas encore en base — §0)

MASTER §11 : **FIGHER = Totehm complet + THP possédé + annuel actif**, en
une fonction (`_figher`) et un booléen (`member`). L'annuel seul ne suffit
plus pour les droits premium (créer/candidater à un Spot, Reveal the Box,
s'abonner à un membre, monétiser, TotehmBot) : il reste nécessaire, il n'est
plus suffisant. Le THP se lit dans `stoner_access` **par email**.

La règle du 18/08 ci-dessous (mur de vente quand l'annuel tombe) reste vraie
pour l'annuel lui-même.

### Gating — décision du 18/08/2026

`my_membership()` renvoie `member: false` quand le trial expire ou le paiement échoue.
**Le front affiche le mur de vente. Point.**

- Pas de mode lecture seule.
- Pas de contenu dégradé.
- Pas de "tu as X jours restants" — Stripe gère l'état, le front lit `member`.

```
member: true   → accès complet
member: false  → mur de vente → subscription-checkout
```

C'est Stripe qui passe `trialing` → `canceled` à J+7 sans paiement.
Zéro logique de dates côté TOTEHM.

### Price lock — règle absolue

Le prix auquel un membre rejoint est **verrouillé pour lui tant que son
membership reste actif**, même si le Club monte de palier.

```
current_club_price   → prix affiché aux nouveaux membres
member_locked_price  → prix stocké à la souscription, jamais recalculé
```

Le renouvellement annuel d'un membre existant se fait **toujours** sur son
`member_locked_price`, jamais sur le `current_club_price` du moment.

### Paliers de prix (configurables, non hard-codés)

| Membres | Prix annuel |
|---|---|
| 1 – 100 | 77 € |
| 101 – 250 | 99 € |
| 251 – 500 | 129 € |
| 501 – 1 000 | 149 € |
| 1 001 – 2 500 | 177 € |
| 2 501 – 5 000 | 199 € |
| 5 001+ | 229 € |

Les paliers vivent en base ou en config serveur. **Jamais dans le frontend.**

### Champs en base — état 18/08/2026

**Créés (migration `20260817_subscriptions_figher_club`) :**
```
stripe_customer_id       text, nullable
stripe_subscription_id   text, nullable, unique index partiel
member_locked_price      integer (centimes), nullable
trial_started_at         timestamptz, nullable
trial_ends_at            timestamptz, nullable
tier                     désormais nullable (historique uniquement)
```

**Pas encore créés :**
```
current_club_price       prix actuel pour les nouveaux membres
member_number            position dans le Club
```

### Totehm Spots

Un membre peut proposer un spot (lieu, intention, capacité, date, visibilité,
prix éventuel). Le Club devient un réseau physique distribué.

Types : FOCUS · FIGHT · ENRICH · LOVE · etc.

Visibilité : `public` · `club` · `private`.

### Communication — règles

Ne jamais présenter comme un SaaS. Toujours en logique club :

```
MORE MEMBERS → MORE SPOTS → MORE PLACES → MORE VALUE
```

Pas de : Free/Pro/Premium · tableau comparatif mensuel/annuel · gamification.

Format officiel :

```
Figher Club
7 DAYS FREE
CURRENT CLUB PRICE — 77 €/YEAR
"Join at €77/year. Your price is locked while your membership is active."
```

### Stripe — à faire lors de l'implémentation

- Essai : **7 jours** (pas 30 — corriger le produit Stripe si créé avec 30 jours)
- Prix Stripe figé à la création de l'abonnement → `member_locked_price`
- `PRICE_FIGHER_YEAR` dans Supabase secrets = price ID du palier d'entrée

---

## 4b · Conflit connu : `trips` n'existe pas

`space_master_v5.md` §52 recommande une table `trips`. **Elle n'existe pas.**

```
trips     0 ligne — la table n'existe plus
totehms   8 lignes, 25 habitudes dans steps
```

Elle a été renommée `totehms`. `totehmBot.html` — le seul fichier qui
interrogeait encore `trips` — a été supprimé le 03/09/2026 (doublon strict
de `higherself.html`, table cible morte). Historique retenu pour éviter
qu'un nouveau fichier ne recrée le même piège de nommage.

Décision : on garde `totehms`. Renommer dans l'autre sens casserait le front
sans rien apporter.

---

## 4c · Supabase — `abujjbkbbiumxrokozph` · eu-west-1

### La boucle (master v5)

| Table | Lignes | Rôle |
|---|---:|---|
| `totehms` | 1 | **la vérité des habitudes** — `steps[]`, `bot`, `tz`, `quiet_from/to`, `max_daily` |
| `objectives` | 0 | **FUTURE** — un objectif ne se supprime pas, il change de statut |
| `objective_events` | 0 | append-only, alimenté par trigger |
| `habit_outcomes` | 0 | **DONE / MISSED**, `answered_at` NULL = silence, et c'est une donnée |
| `obstacles` | 0 | le WHY, mot pour mot + `normalized` pour compter |
| `repulsions` | 0 | une seule active par habitude ; la nouvelle retire l'ancienne |
| `pushes` | 0 | ce que le bot a envoyé |
| `book_chapters` | 0 | **PAST** — `visibility`, `closed_by`, `version` |
| `book_chapter_versions` | 0 | archive **automatique par trigger** |
| `chapter_context` | 0 | ce que l'utilisateur DÉCLARE — niveau USER WRITING |
| `intention_music` | 0 | un actif par intention, historique conservé |

### Le reste

| Table | Lignes | Rôle |
|---|---:|---|
| `profiles` | 3 | pseudo, `telegram_id` — **`telegram_id` n'est plus lisible ni écrivable par `authenticated`** (GRANT par colonne, 29/08) |
| `bot_link_codes` | 0 | code de liaison Telegram, usage unique, 10 min — RLS active, **aucune policy** |
| `bot_drafts` | 0 | conversation Telegram en cours — RLS active, **aucune policy** |
| `subscriptions` | 1 | **source unique de l'adhésion** — wavywah `trialing` (test) |
| `stripe_events` | 0 | idempotence webhook |
| `crew_codes` · `crew_attributions` | 0 | Crew Code, attribution définitive |
| `stoner_access` | 6 | les Fighers (achat unique, `.com`) |
| `spots` | **0** | ⚠️ **MESURÉ LE 03/09/2026 : LA TABLE EST VIDE.** Elle portait 125 lignes (121 actives+publiques). Elles ont disparu entre le 19/08 et le 03/09 — aucune migration du repo ne les supprime, aucune trace dans le journal. La couche éditoriale de la carte n'existe donc plus : `spots` ne sert aujourd'hui QUE de table des MEMBER_DROP posés par `/spot`. Ne pas réécrire « 125 » ici sans avoir recompté. |
| `bot_knowledge` | 55 | base de connaissance, embeddings |
| `totehm_clothes` | 1 | commandes Cloth · **`chapter_id`** relie au chapitre |
| `totehm_events` | 58 | ⚠️ journal **incomplet** — voir §7 |
| `live_events` | **0 · mesuré 04/09** | cache d'événements, **toutes sources confondues** — Ticketmaster (mondial) ET agendas locaux. `source`, `intentions[]`, `embedding vector(1536)`, `url`, `starts_at`, prix. RLS active, **aucune policy** : `service_role` seul. Vide parce que rien ne l'a encore remplie : `tm_calls_today = 0`, donc soit la clé Ticketmaster n'est pas posée, soit personne n'a ouvert la carte depuis le déploiement |
| `live_cells` | 0 | cellules événementielles balayées, 0,1° (~11 km), TTL 12 h |
| `live_budget` | 0 | appels Ticketmaster par jour, plafond 3 000 (quota gratuit 5 000) |
| `live_sources` | **18 · 0 active, 18 en erreur** | **NOUVELLE 04/09/2026** — les agendas d'une ville, DÉCLARÉS en base. Une salle de plus = une ligne, zéro ligne de code. RLS active, aucune policy. ⚠️ Les 18 sources lisboètes ont été sondées : **aucune ne publie de flux exploitable**. Voir §7 |
| `edge_tokens` | 31 | **RENOMMÉE 04/09/2026** (ex-`bot_tick_tokens`) — jetons à usage unique de `edge_call()`, 2 min de vie, colonne `purpose` (`bot-tick` / `agenda-ingest`). Purge d'un jour intégrée à `edge_token_consume()` : pas de tâche de nettoyage à oublier |
| `creator_profiles` | **0 · mesuré 19/09** | prix personnalisé, devise, et depuis le 19/09 `payout_method` + `payout_handle`. Les colonnes Connect (`stripe_account_id`, `charges_enabled`, `payouts_enabled`) RESTENT, vides — voir le journal §10. ⚠️ **Zéro créateur en base : le tiroir n'a encore jamais été rempli par personne.** Le premier qui pose son prix est le premier test réel |
| `creator_subscriptions` | **0 · mesuré 19/09** | un fan abonné au Totehm d'un créateur. `amount_cents` sert à calculer la part de 80 %. Vide, donc `creator_cercle()` rend `abonnes: 0` et `a_moi: 0` — c'est juste, pas cassé |
| `habit_spots` | **0 · mesuré 19/09** | **NOUVELLE 19/09/2026** — le lieu d'une habitude, une ligne par `(user_id, habit_text)`. Détail plus bas |
| `sso_handoff` | **2 · mesuré 19/09** | **NOUVELLE 17/09/2026** — le code de passage entre domaines : 32 octets, stocké HACHÉ en SHA-256, 60 s, usage unique, lié à UN produit cible. Les 2 lignes sont mes tests du pont — `sso_menage()` les balaie |

**Table morte :** `_deprecated_user_roles_20260803` — à dropper après le
3 septembre 2026.

### `wisdom` — les leçons de My Wisdom (créée le 21/08/2026)

| Colonne | Type | Note |
|---|---|---|
| `id` | uuid | pk |
| `user_id` | uuid | → `auth.users`, ON DELETE CASCADE |
| `text` | text | 1 à 400 caractères, contrainte en base |
| `i` | text | id d'intention, **optionnel** — une leçon peut n'en porter aucune |
| `created_at` | timestamptz | |

RLS activée, **4 policies, toutes `auth.uid() = user_id`** : select, insert,
update, delete. Aucune lecture croisée, même entre membres — My Wisdom n'est
pas un mur public, et ce n'est pas `totehms.totehm_visibility`.

Ce n'est **pas** `book_chapters`. Un chapitre a un titre, un corps et une date
d'ouverture, il est écrit par `autobiographiste`. Une leçon est écrite à la
main, en une ligne. Les mélanger aurait pollué la table que lit le générateur
de chapitres.

`delete_my_totehm()` efface `wisdom` depuis le 21/08/2026.

#### `wisdom` — le POIDS, pas l'intention (23/08/2026)

`importance smallint` (1-3), contrainte posée :
1 Worth keeping · 2 Holds up · 3 Changed me.

Une leçon ne « sert » pas une intention : elle pèse. Sept intentions sur une
leçon, c'était emprunter le vocabulaire des habitudes à un objet qui n'en a
pas besoin.

**EXPAND / CONTRACT.** `wisdom.i` est GARDÉE le temps d'un lot : entre le
`git push` et le build Vercel, le front encore en ligne écrit dans `i`. Elle
se retire au lot suivant :

    alter table public.wisdom drop column i;

#### `higher_badges` — DEUX conditions (23/08/2026)

La vue joint désormais `subscriptions` : méthode Stoner faite sur
`totehm.com` **ET** abonnement `active`/`trialing`. Un achat isolé sur `.com`
ne suffit plus — c'est l'engagement complet que le badge valorise.

**MESURÉ le 23/08/2026 : la vue renvoie 0 ligne.** 6 accès Stoner accordés,
**1 seul avec un compte `.space`**, 1 abonnement vivant (`trialing`) qui n'est
pas le sien. Ce n'est pas un bug de la vue : c'est une fuite d'acquisition —
cinq personnes ont payé sur `.com` et ne sont jamais venues sur `.space`.

#### `objectives` — enfin alimentée

`next_objective.html` insère une ligne à chaque Entrée, et chaque habitude
ajoutée porte `oid` (l'identifiant) et `o` (le texte) dans `totehms.steps`.
On sait désormais POURQUOI une habitude existe. Table vide avant ce lot.

### `spot_takes` — « TAKE ME THERE » (créée le 22/08/2026)

| Colonne | Type | Note |
|---|---|---|
| `ref` | text | clé du lieu — uuid d'un spot OU place_id Google |
| `user_id` | uuid | → `auth.users`, ON DELETE CASCADE |
| `created_at` | timestamptz | |

Clé primaire `(ref, user_id)` : un membre compte pour un, quel que soit le
nombre de clics. RLS activée **SANS aucune policy** — aucun accès direct.
Tout passe par deux fonctions SECURITY DEFINER, `execute` accordé au seul
rôle `authenticated` :

| Fonction | Rôle |
|---|---|
| `take_me_there(text)` | enregistre le geste, renvoie le total |
| `spot_takes_count(text[])` | les totaux d'une liste, en UN appel |

⚠️ **`spots.member_count` n'est PAS ce compteur.** C'est une colonne figée,
remplie à la main sur 20 lignes sur 125 (max 50). Elle ne compte rien et
n'est plus affichée.

### Tables de la carte — 19/08/2026 (mise à jour 03/09/2026)

| Table | Rôle | Lignes mesurées |
|---|---|---|
| `spots` | lieux éditoriaux + drops membres | 125 dont 121 actifs+publics, tous géolocalisés. Colonne `energy_mode` (silent/social) ajoutée le 03/09 |
| `places` | cache Google Places | **60 avec embedding vector(1536)** depuis 03/09 |
| `places_cells` | cellules balayées, TTL 90 j | ~10 |
| `places_budget` | appels Google par jour | actif, plafond 200/j |

RLS activée sans policy sur les trois dernières : seul `service_role` y accède.

**`places.embedding vector(1536)` · 03/09/2026** — text-embedding-3-small sur
`name + primaryType + descriptions.values()`. Index IVFFlat cosine (lists=10).
Backfill des lignes existantes via edge function `embed-places` (idempotente,
coût $0.00003 pour 60 lignes). Les nouveaux lieux ingérés par `warm()` sont
embedés à la volée. Utilisé par la nouvelle RPC `places_matching_habits`.

**⚠️ `spots.expires_at` :** tous les 125 spots avaient `expires_at = 2026-06-03` — expirés depuis 2 mois, la requête renvoyait 0 lignes. Passés à `NULL` le 18/08. **Ne jamais insérer de spots avec une `expires_at` en dur proche** — utiliser `NULL` pour les spots permanents.

#### Remplissage réel de `spots` (121 actifs+publics)

| Champ | Rempli | Note |
|---|---|---|
| `state_of_mind` | 121 | 21 valeurs distinctes, FR et EN mélangés |
| `duration_min` | 121 | |
| `tags` | 121 | contient parfois un genre musical, sans garantie |
| `vibe` | 121 | 2 valeurs seulement : `paper`, `leaf` |
| `image_url` | 121 | **105 pointent vers pollinations.ai** — image générée à la volée, non affichée par le front |
| `member_count` | 121 | **> 0 sur 16 seulement** — affiché uniquement dans ce cas |
| `commentaire` | 36 | |
| `video_url` | 0 | chaînes vides |
| `user_id` | 0 | aucun MEMBER_DROP à ce jour |
| `expires_at` | 0 | aucun LIVE_EVENT à ce jour |
| `energy_mode` | 0 | **ajoutée 03/09/2026** — `silent` / `social` / `null`, imposée par le bot sur toute nouvelle insertion (voir §Flow `/spot`). Les 121 lignes antérieures sont `NULL` : backfill manuel plus tard. `places_near` la renvoie ; `map.html` affiche un badge silent/social uniquement sur les MEMBER_DROP. |

Par intention, dans un rayon de 4 km depuis la Praça do Comércio :
love 14 · focus 12 · express 10 · celebrate 9 · enrich 6 · fight 5 · flow 4.

#### Dette identifiée

`image_url` en pollinations.ai est une image inventée, régénérée à chaque affichage par un service gratuit sans engagement. Pour la rendre utilisable : générer une fois, stocker dans Supabase Storage, servir depuis notre domaine. Tant que ce n'est pas fait, le front ne l'affiche pas.

#### Retour arrière

- Front : `cp space/totehm.html.bak-<date> space/totehm.html`
- Google : `PLACES_ENABLED = true` dans `higher-map/index.ts`, redéployer
- Serveur : v6 ou v5 depuis l'historique Supabase

### La couche LOCALE — les agendas d'une ville · 04/09/2026

**Le problème, mesuré :** Ticketmaster Discovery couvre le monde et **ne
couvre pas le Portugal**. Le produit tourne à Lisbonne. Une carte mondiale
qui ne voit rien dans sa propre ville n'est pas une carte mondiale.

**Ce qu'on n'a pas fait :** un adaptateur par site. Un site change de HTML
tous les six mois, une API privée ferme sans prévenir — Eventbrite l'a fait
en 2021, Songkick aussi. Trois adaptateurs morts en un lot, c'est la preuve.

**Ce qu'on a fait :** trois parseurs de FORMAT, et des sources déclarées en
base. Les formats, eux, ne changent pas.

| Parseur | Norme | Reconnaît |
|---|---|---|
| `parseIcs` | RFC 5545 | `.ics`, `?ical=1`, export Google/Apple Calendar |
| `parseJsonLd` | schema.org/Event | le `<script type="application/ld+json">` d'une page |
| `parseRss` | RSS 2.0 + `ev:` | un flux `/feed/` qui porte une date de DÉBUT |

`parseRss` **rejette** tout item sans `ev:startdate`, `startDate` ou
`dc:date` : sans ça, on ingérerait la date de PUBLICATION d'un article comme
l'heure d'un concert. Même piège dans `parseAgendaLx`, où les clés `date` et
`data` sont explicitement exclues — en WordPress, `date` est la date du post.

`lat`/`lng` sont portés par la **source**, pas par l'événement : une salle ne
bouge pas, elle n'a pas à être géocodée mille fois. Zéro appel payant.

**`agenda-ingest` a trois modes**, et le troisième est le seul honnête :

| Mode | Ce qu'il fait |
|---|---|
| `run` | ingère les sources actives (cron, 5 h 07) |
| `probe` | teste sans écrire, renvoie le rapport source par source |
| `discover` | **cherche le flux** : `/wp-json/wp/v2/types`, REST tribe, `?ical=1`, `.ics`, `/feed/` — et écrit l'URL gagnante dans `live_sources` |

`discover` existe parce que deviner l'URL d'un flux ne marche pas : les dix
premières graines lisboètes ont été posées à la main, et les dix ont renvoyé
404. On ne devine plus, on sonde et on mesure.

**Coût : zéro.** Onze requêtes HTTP par source, une fois par jour, sur des
serveurs publics. Aucune API payante, aucun modèle appelé.

### places_near — corrigée le 19/08/2026

Signature : `places_near(lat, lng, radius, intentions[], limit, places)`
→ `source, ref, name, intention, kind, lieu_type, why, state_of_mind, vibe, tags, member_count, ends_at, lat, lng, dist_m, duration_min`

`stable`, `security definer`, révoquée pour `anon` et `authenticated`.

**Correction du rayon.** `earth_box` est une *boîte*, pas un cercle : dans les coins elle laissait passer jusqu'à √2 × rayon, soit 5 657 m pour un rayon annoncé à 4 000. Mesuré avant correction : des spots à 5 033 m étaient servis. `earth_box` reste en tête pour l'index GiST, `earth_distance` tranche derrière. Sans ça, l'échelle du radar était calculée sur des lieux hors portée.

Les spots éditoriaux passent devant les places Google (`rank_tier`) : un lieu écrit vaut plus qu'un lieu trouvé.

### Higher Map — v7, mesuré le 19/08/2026

`verify_jwt = true` · POST `{ lat?, lng?, intention? }` · réponse
`{ spots[], intention, intentions[], origin:{lat,lng,fallback}, radius_m, sweeps, places_enabled }`

#### Ce qui a changé en v7

**`PLACES_ENABLED = false`.** La table `spots` seule pour l'instant. Le cache Google n'est **pas supprimé** : il ne coûte rien tant que la clé n'est pas posée, et le démolir pour le reconstruire dans trois semaines serait du travail jeté. Un seul booléen le rallume.

**Unified Spot Model**, déduit et non stocké :

| Nature | Déduite de |
|---|---|
| `MEMBER_DROP` | `spots.user_id` renseigné |
| `LIVE_EVENT` | `spots.expires_at` renseigné |
| `PLACE` | par défaut |

La réponse porte désormais `kind`, `state_of_mind`, `vibe`, `tags`, `member_count`, `ends_at` en plus des champs existants.

#### Chaîne d'exécution

1. `auth.getUser()` sur le bearer.
2. `subscriptions` — `.limit(1)`, jamais `.maybeSingle()` : deux lignes actives faisaient planter la requête et rendaient un 402 à un membre qui paie.
3. `totehms` — `.order('updated_at' desc).limit(1)`. Même raison.
4. **Contrôle d'intention** : si le corps porte `intention`, elle doit figurer dans le Totehm du membre. Sinon `403 not_your_intention`.
5. Coordonnées absentes → repli **Praça do Comércio** (38.7078, -9.1366), `origin.fallback = true`.
6. `places_near()` — rayon 4 000 m, 60 lignes max.
7. Google : dormant tant que `PLACES_ENABLED` vaut `false`.

#### Codes de réponse

| Cas | Réponse |
|---|---|
| pas de session | `401 unauthorized` |
| pas d'abonnement actif ou en essai | `402 members only` |
| aucune habitude ne porte d'intention | `200 { reason:'no_intention' }` |
| intention demandée hors du Totehm | `403 { reason:'not_your_intention' }` |
| nominal | `200 { spots, origin, … }` |

#### Doctrine de coût

La v4 appelait Google une fois par intention **à chaque ouverture** : 240 appels/mois ≈ 8,40 $/mois pour UN membre contre 6,75 € d'ARPU. Elle perdait de l'argent dès le premier abonné. Les trois verrous posés en v5 restent en place, éteints :

| Verrou | Constante | Valeur |
|---|---|---|
| Interrupteur global | `PLACES_ENABLED` | **false** |
| La base d'abord | `MIN_RESULTS` | 8 |
| Cellule géographique, pas personnelle | `CELL_TTL_DAYS` | 90 |
| Appels Google max par requête | `MAX_SWEEPS` | 3 |
| Plafond global quotidien | `DAILY_BUDGET` | 200 |
| Rayon servi | `RADIUS_M` | 4 000 m |

#### Contrainte posée le 19/08/2026

`totehms_user_id_uniq` — index unique sur `totehms(user_id)`. `cloudSave()` faisait `delete` puis `insert` : deux onglets en course avaient créé deux Totehms pour un membre, ce qui cassait `.maybeSingle()` côté serveur. Le front est passé en `upsert` sur `onConflict: 'user_id'` dans le même lot.

#### `origin` est une SUGGESTION, pas une vérité

`higher-map` v7 renvoie `origin:{lat,lng,fallback}`. Quand le corps de la
requête ne porte ni `lat` ni `lng`, la fonction retombe sur Lisbonne
(38.7078 / -9.1366) et pose `fallback:true`. C'est le comportement voulu :
le radar montre toujours quelque chose.

**Le front ne doit jamais traiter ce champ comme faisant autorité.** Le
navigateur connaît mieux la position que le serveur. Mesuré le 23/08/2026 :
c'est cette confiance aveugle qui rendait la localisation inopérante sur
`.space` malgré un GPS autorisé et répondant.

`dist_m` renvoyé par `places_near` est calculé depuis cette `origin` : si le
front garde sa propre position, il doit soit recalculer les distances, soit
relancer la requête avec les coordonnées. Le front fait le second
(`geoRefresh`), le seul qui reste juste pour les spots hors rayon.

---

## 4 · Fonctions Postgres

### Le geste quotidien
| Fonction | Rôle |
|---|---|
| `my_habits(uuid)` | lit `totehms.steps` — **la vérité**. `ready=false` si pas de fréquence |
| `habits_incomplete()` | ce qui manque, pour que le front le réclame |
| `record_outcome(...)` | complète la question ouverte, ne crée pas de doublon |
| `record_obstacle_admin(...)` | enregistre le WHY **et** renvoie la récurrence en un appel |
| `recurring_obstacle(text)` | 3 fois en 60 jours = récurrent |
| `suggest_repulsions(text,text)` | **le cadre, jamais la réponse** — corpus anonyme |
| `set_repulsion(...)` | la nouvelle retire l'ancienne |

### Le bot — `service_role` seul
| Fonction | Rôle |
|---|---|
| `push_decision(uuid)` | **NOTHING domine.** quiet hours · max_daily · gap 4 h · decay 3 silences |
| `record_push(...)` | envoi + question ouverte, **même transaction** |
| `set_repulsion_admin(...)` · `recurring_obstacle_admin(...)` · `suggest_repulsions_admin(...)` | variantes serveur : Telegram n'a pas de JWT |

### Le livre
| Fonction | Rôle |
|---|---|
| `chapter_full_material(bigint)` | **tout en UN appel** : objectifs, habitudes, consistency, obstacles, repulsions, musique, `user_said` |
| `chapter_should_close()` | une **décision** + au moins 5 réponses |
| `add_chapter_context(...)` | ce qu'il déclare sur sa vie — persisté avant génération |
| `habit_breakthroughs()` | 2 hard puis 2 easy = un basculement, **déduit** |
| `read_chapter(bigint)` | lecture publique — le Decode |
| `chapters_for_cloth()` | les chapitres portables sur un vêtement |

### La carte
| Fonction | Rôle |
|---|---|
| `places_matching_habits(lat, lng, radius, habits jsonb, include_club, limit, repulsions jsonb)` | **L'appelé principal du radar. RÉÉCRITE le 06/09/2026 — voir §7.** `habits` = `[{intention, text, embedding, rank}]`, `repulsions` = `[{text, embedding}]`, calculés côté edge. **L'intention n'est PLUS un filtre** : tout ce qui est dans le rayon est candidat, le classement décide. Retourne `rank_tier` (0=MEMBER_DROP, 1/2/3 par tercile), `score`, `matched_habit`, `matched_rank` (l'ordre d'importance posé par le membre) et `against` (la répulsion qui a fait rétrograder le lieu). `p_repulsions` a un défaut : un appel à 6 paramètres continue de fonctionner. |
| `spot_video(spot uuid)` | **NOUVEAU 06/09/2026.** Rend `file_id` Telegram, `kind`, l'URL en cache et `fresh` (cache < 55 min). Ouverte à `anon` : elle ne rend aucune donnée sensible. |
| `spot_video_cache(spot uuid, url text)` | **NOUVEAU 06/09/2026.** Repose le cache d'URL. **`service_role` UNIQUEMENT** — un client qui pourrait écrire une URL de média pourrait faire pointer un spot n'importe où. Vérifié après le `create`. |
| `places_near(lat, lng, radius, intentions[], limit, places, include_club)` | **Fallback pour intention-only** (utilisé quand OpenAI KO ou 0 habit). Union spots + places, tri `rank_tier, dist_m`. `earth_box` pour l'index GiST, `earth_distance` pour tronquer au cercle réel. Révoquée pour `anon` et `authenticated`. **03/09/2026 — renvoie `energy_mode`** (silent/social pour les spots membres, null pour Google Places et spots legacy) et **priorise `descriptions[intention]` sur `address`** comme `why`. |
| `places_budget_take(max)` | incrémente le compteur du jour s'il est sous le plafond, renvoie `true` si l'appel Google est autorisé |

### La couche live et les agendas — `service_role` seul
| Fonction | Rôle |
|---|---|
| `live_near(lat, lng, radius, habits jsonb, intentions[], limit, horizon_days)` | événements proches, rangés **exactement comme un lieu** : cosine similarity intra-intention, `rank_tier` 0-3. **04/09 : sert la vraie colonne `source`** — elle renvoyait `'ticketmaster'` en dur, écrit au temps où il n'y avait qu'une source au monde |
| `live_budget_take(max)` | plafond d'appels Ticketmaster du jour, 3 000 |
| `live_events_sweep_expired()` | efface ce qui est passé — un cache d'événements qui ne se vide pas devient un cimetière |
| `edge_call(fn, body)` | appelle UNE de nos Edge Functions depuis pg_cron, **liste blanche** (`bot-tick`, `agenda-ingest`). Ce n'est pas un proxy HTTP ouvert |
| `edge_token_consume(token, purpose)` | consomme le jeton une seule fois (`used_at is null` dans le WHERE = exclusion mutuelle), purge ce qui a plus d'un jour |
| `bot_tick_arm()` · `bot_tick_consume(token)` | enveloppes conservées : `bot-tick` v14 est déployée et les appelle. Renommer sans enveloppe casse la prod entre la migration et le redéploiement |

### HigherSelf et la recherche — 04/09/2026
| Fonction | Rôle |
|---|---|
| `higherself_state(p_user uuid default null)` | **tout l'état en UN appel** : habitudes + série + consistance 30 j + question en attente, wisdom, objectifs ouverts, spots posés, état du bot. `authenticated` (sa session) et `service_role` (le bot). **La session gagne toujours sur `p_user`** : un membre connecté ne peut pas lire le Totehm d'un autre |
| `search_totehms(q, limit)` | la recherche de membres. Ouverte à `anon`. Ne rend QUE des Totehms partagés (`totehm_visibility='members'`), **jamais un e-mail, jamais un `telegram_id`, jamais un id**. Classement exact > préfixe > sous-chaîne |
| `spot_search(lat, lng, radius, q, intention, limit)` | les lieux du Club autour d'un point, pour la mini-app et pour `/spots` |
| `add_wisdom_admin(uuid, text, intention)` · `add_objective_admin(uuid, text)` | poser une leçon ou un objectif **depuis Telegram**. `wisdom` et `objectives` sont protégées par RLS sur `auth.uid()` ; le bot n'a pas de session. `service_role` seul |

### Le Trip — objectifs, habitudes, répulsions · maj 13/09/2026

**« Trip » est du VOCABULAIRE, pas une entité.** C'est un TRIPLET lu
depuis n'importe quel angle :

- depuis une habitude → elle + ses objectifs + ses répulsions
- depuis un objectif → lui + ses habitudes + leurs répulsions
- depuis une répulsion (trigger) → elle + les habitudes à faire à la
  place + les objectifs qu'elles servent

Le seul endroit en base où le mot est juste, c'est `my_trips()` : elle
rend PLUSIEURS triplets, centrés sur les objectifs (plus `loose` et
`done`). Les autres fonctions agissent sur UNE pièce : elles portent
son nom.

| Fonction | Rôle | Accès |
|---|---|---|
| `my_trips()` | **l'arbre entier en UN appel** : objectifs, leurs habitudes, les répulsions de chaque habitude | `authenticated` |
| `repulsions_of(uuid,text)` | les répulsions d'une habitude, avec **toutes** les habitudes que chacune protège | `service_role` |
| `objective_create(text,timestamptz)` → `uuid` | crée un objectif — accepte `p_text=''` (draft, comme les autres pièces) | `authenticated` |
| `objective_rename(uuid,text)` · `objective_set_target(uuid,timestamptz)` | le renomme, pose sa deadline | `authenticated` |
| `objective_close(uuid,text)` | ferme un objectif — `p_outcome='dropped'` → `status='abandoned',outcome='no'` ; sinon `achieved/yes`. Vocabulaire de la contrainte `objectives_status_check` : `active,achieved,abandoned,converted` | `authenticated` |
| `objective_link(uuid,text)` · `objective_unlink(uuid,text)` | **le lookup** habitude → objectif, via la table pivot `objective_habits` | `authenticated` |
| `repulsion_set(text,text,text)` → `bigint` | crée une répulsion sur une habitude | `authenticated` |
| `repulsion_retire(bigint)` | la désactive | `authenticated` |
| `repulsion_link(bigint,text)` · `repulsion_unlink(bigint,text)` | **le lookup** : attache / détache une habitude | `authenticated` |
| `habit_rename_links(text,text)` → `boolean` | suit un renommage d'habitude dans les trois tables de liens **et déplace le spot** (19/09). ⚠️ Le `boolean` est imposé : `create or replace` ne peut pas changer un type de retour | `authenticated` |
| `habit_spot_set(text,text)` | **NOUVELLE 19/09/2026** — pose, change ou (texte vide) efface le lieu d'une habitude | `authenticated` |
| `totehm_complete(uuid default null)` → `jsonb` | **NOUVELLE 19/09/2026** — le PASSEPORT : une boîte non vide dans chacune des cinq vues. Renvoie les cinq booléens, `complete`, et `remplies` (0–5). Ne rend QUE des booléens, jamais un contenu — le paramètre `p_user` lit le Totehm de n'importe qui | `authenticated`, `service_role` |
| `creator_payout_set(text,text)` | **NOUVELLE 19/09/2026** — où virer : `iban` ou `paypal` + l'identifiant | `authenticated` |
| `intention_sound_set(text,text,text)` | **NOUVELLE 20/09/2026** — le son d'une intention : un TYPE (obligatoire) + une URL (facultative). Les deux vides retirent le son. Écrit dans `intention_music` : `title` = le type, `url` = le lien | `authenticated` |
| `intention_sounds()` → `jsonb` | **NOUVELLE 20/09/2026** — le son actif de chaque intention, indexé par intention, en un appel | `authenticated` |
| `totehmbot_access()` → `jsonb` | **NOUVELLE 21/09/2026** — la porte du TotehmBot. `ouvert` = membre du Club **ET** Totehm complet. Ne rend que des booléens et `remplies` (0–5), jamais un contenu. Ouverte à `anon` : un invité voit la page de vente comme un membre sans Club | `anon`, `authenticated` |
| `creator_cercle()` → `jsonb` | **NOUVELLE 19/09/2026** — tout le tiroir créateur en UN appel : prix, abonnés, `a_moi` (déjà net de 20 %), `payout_method`, `payout_fin` (**4 derniers caractères seulement**), `complete` | `authenticated` |

**Une porte future ouverte, pas encore construite.** Le TotehmBot pourra
composer des affirmations neuro-linguistiques par notification à la
fréquence de l'habitude, en lisant un triplet autour de n'importe quelle
pièce. Ça demandera une fonction `trip_at(kind,id)` symétrique — on
l'écrira le jour où le bot l'appellera, pas avant.

**Aucune ne prend d'identité en paramètre** : toutes lisent `auth.uid()`.
Une fonction qui prend l'utilisateur en argument attache une répulsion au
Totehm de quelqu'un d'autre.

**`repulsions_of` est écrite UNE fois.** `my_trips` l'appelle deux fois —
les habitudes d'un objectif, puis les habitudes libres. Le même
sous-select existait en double : deux copies divergent toujours.

### `habit_spots` — le lieu d'une habitude, créée le 19/09/2026

```
user_id     uuid              → auth.users(id) on delete cascade
habit_text  text              not null
place       text              not null, tronqué à 120 caractères
lat         double precision  NULL — vide aujourd'hui
lng         double precision  NULL — vide aujourd'hui
updated_at  timestamptz       default now()
primary key (user_id, habit_text)
RLS : le propriétaire seul, en lecture comme en écriture
```

**Table à part, pas une colonne dans `totehms`.** Les habitudes vivent
dans un `jsonb steps` : y glisser un lieu obligerait à réécrire tout le
tableau pour changer un mot, et rendrait toute recherche par lieu
impossible.

**⚠️ `lat`/`lng` EXISTENT ET SONT VIDES — MESURÉ LE 19/09/2026.** Le
picker ne pose qu'un NOM : « la salle du 5e » n'a pas de coordonnées et
n'en a pas besoin pour déclencher une habitude. Les remplir coûterait un
appel de géocodage par habitude. Elles attendent le Radar. **Ne pas
écrire ici qu'elles sont peuplées sans avoir compté.**

### `repulsion_habits` — le lookup, créée le 06/09/2026

```
repulsion_id  bigint      → repulsions(id) on delete cascade
user_id       uuid        → auth.users(id) on delete cascade
habit_text    text
created_at    timestamptz
primary key (repulsion_id, habit_text)
index (user_id, habit_text)
RLS : le propriétaire seul, en lecture comme en écriture
```

**`repulsions.habit_text` reste le PREMIER lien** — celui que le bot lit
déjà. Rien à réécrire côté bot.

**Un trigger `after insert on repulsions` pose le premier lien.** Ce n'est
pas du confort : une répulsion écrite par le bot, la carte, un admin ou une
insertion à la main naît avec son lien. Une table alimentée seulement par
le front serait vide pour tout ce qui n'est pas le front — et le jour où
elle sert de source de vérité, la moitié des répulsions auraient disparu.

**Le lien est du TEXTE** parce que `steps` est du texte : tant qu'une
habitude n'a pas d'identifiant en base, c'est la seule jointure possible.
D'où `habit_rename_links()`, qui répare en un appel au lieu de quatre
endroits du front.

**Mesuré le 06/09/2026, sous le rôle `authenticated`** : pose +1, retrait
−1, et `repulsion_link` sur une répulsion qui n'est pas la sienne rend
`false`. `my_trips` : 8 objectifs, 5 habitudes libres, les répulsions
portent bien leur tableau `habits`.

### Objectifs, musique, adhésion
| Fonction | Rôle |
|---|---|
| `my_objectives()` · `objective_to_habit(uuid,text)` | FUTURE → PRESENT |
| `set_music(...)` · `music_pattern()` | plateforme dérivée du domaine, **zéro appel réseau** |
| `my_membership()` | **le seul appel dont le front a besoin** |
| `my_tier()` | compat — mappé sur l'adhésion |
| `founder_seats()` | 100 places, compteur serveur |
| `my_crew_dashboard()` | MRR, actifs, churn |
| `decode_cloth(text)` | le Decode par le nom de la pièce |

**`my_membership()` sans session :**
```json
{"member":false,"trial":false,"status":null,"until":null,"ending":false}
```
Aucune ligne = pas membre. Un abonnement expiré, impayé ou annulé retombe
**automatiquement** à `false` : pas de tâche de nettoyage, pas d'oubli possible.

---

## 5 · Edge Functions — versions RELEVÉES le 04/09/2026

⚠️ Le tableau précédent listait `higher-map`, `bot-reply` et `bot-tick` DEUX
FOIS chacune, avec deux numéros de version différents — vestige d'un lot où
on a ajouté une ligne au lieu de corriger la sienne. Un document qui se
contredit lui-même est un bug : la table ci-dessous est relue depuis
l'API Supabase, une ligne par fonction, pas d'exception.

| Fonction | Ver. | `verify_jwt` | Rôle |
|---|---:|:---:|---|
| `higher-map` | **26** | ✅ | **v13 · 03/09/2026 — GOOGLE MAPS + TICKETMASTER + LA VILLE.** Trois couches (MEMBER_DROP · PLACE · LIVE_EVENT), un seul classement. Eventbrite / Songkick / Meetup supprimés. Cache d'événements via `_shared/live.ts`. Réponse enrichie de `sources{google,ticketmaster,openai}` — **des booléens, jamais des valeurs de clé** |
| `bot-reply` | **17** | ❌ | **v6 · 04/09/2026 — LE TOTEHM DANS TELEGRAM.** Bouton `web_app` qui ouvre HigherSelf DANS la conversation. `/moi` (le tracking, déduit), `/wisdom`, `/objectif`, `/spots`, `/tonight`, `/spot`, `/carte`, `/pause`, `/reprendre`. **Zéro appel IA** |
| `bot-tick` | **14** | ❌ | **v4 · 03/09/2026** — entrée par jeton à usage unique (plus de clé `service_role` dans `cron.job.command`). Une erreur de `push_decision` est enfin journalisée |
| `agenda-ingest` | **2** | ❌ | **NOUVELLE 04/09/2026** — la couche locale. Trois parseurs de format (ICS · JSON-LD · RSS), sources déclarées dans `live_sources`. Modes `run` / `probe` / `discover`. Cron 5 h 07. Budget mural 42 s |
| `embed-places` | 1 | ❌ | one-shot 03/09 : backfill des embeddings de `places`. Idempotente, ~$0,00003 pour 60 lignes. Conservée pour les prochains backfills |
| `stoner-gate` | 25 | ✅ | signe 11 URLs, bucket privé, 15 min |
| `higher-checkout` | 27 | ❌ | 5 paliers côté serveur, prix **serveur**, mode `quote` · Fix 03/09 : plus de `?? ""` sur `STRIPE_SECRET_KEY` — le `!` fait planter au démarrage si le secret manque, mieux qu'un paiement fantôme. ⚠️ divergence UI (front 30 $ fixe) toujours à aligner |
| `artwork-checkout` | 8 | ✅ | checkout artwork, `stoner_access` requis · même correctif Stripe |
| `stripe-webhook` | 29 | ❌ | routeur 3 flux + 4 événements, idempotence via `stripe_events` |
| `create-checkout` | 28 | ❌ | flux Cloth |
| `subscription-checkout` | 13 | ✅ | 7 j d'essai, price lock, `PRICE_FIGHER_YEAR` (typo connue, non urgente) |
| `autobiographiste` | 13 | ✅ | modèle premium, 8 règles, write/revise/accept |
| `generate_objective` | 34 | ❌ | 7 habitudes vérifiables, exclusions du profil, score 0-100 · Fix 03/09 : CORS wildcard remplacé par `corsHeaders` partagé |
| `prospects` | 25 | ❌ | outreach admin · Fix 03/09 : `ADMIN_KEY` en dur migrée vers le secret `PROSPECTS_ADMIN_KEY`, CORS restreint |
| `compose-artwork` | 25 | ❌ | signature streetwear PNG DTG, imagescript |
| `sync-knowledge` · `generate-embeddings` | 26 | ✅ | base de connaissance |
| `totehm-bot` | 26 | ❌ | ancien bot, laissé en place, **aucun webhook ne pointe dessus** |
| `upload-leaf-videos` | 24 | ❌ | outil |
| `ghost-factory` | 24 | ❌ | outil |

**Fonctions supprimées le 03/09/2026** : `probe-tmp` (déjà neutralisée par Wah), `debug-tm` (test Ticketmaster temporaire). Voir changelog en fin de doc.

`verify_jwt=false` sur les webhooks est **normal** : Stripe et Telegram n'ont pas
de JWT Supabase. La sécurité vient de la signature vérifiée dans le code.

### Une réponse tardive n'écrase jamais un état plus frais

`higher-map` renvoie `origin:{lat,lng,fallback}` — son propre repli Lisbonne
quand la requête part sans coordonnées. Le front faisait
`RAD.origin = j.origin` sans condition : une position GPS obtenue PENDANT la
requête était écrasée par le repli au retour. Définitivement, puisque plus
rien ne redemandait.

**Règle.** Toute réponse réseau qui pose un état partagé doit vérifier
qu'elle n'est pas dépassée :

1. un compteur de séquence (`PICK_SEQ`) — la réponse d'une demande périmée
   se jette, elle ne se fusionne pas ;
2. une garde de fraîcheur — le serveur ne corrige que ce que le client
   ignore (`if(j.origin && !RAD.coords)`).

Ça vaut pour toute donnée que le client peut connaître mieux que le serveur :
position, session, préférences locales.

### `objective_cache` — règle de cache (depuis v26)

**La couche sémantique est coupée dès qu'il y a un profil.**
Depuis la v26, `generate_objective` reçoit les habitudes déjà posées
(`exclude[]`) et doit proposer autre chose. L'empreinte de cette liste entre
dans `norm_hash`. La couche 2 (voisin pgvector) est **sautée** quand
`exclude` n'est pas vide, et l'`embedding` n'est écrit que pour les réponses
sans profil : un voisin sémantique a été conçu pour quelqu'un d'autre, ses
habitudes ne complètent pas ce Totehm-ci. Servir ce cache-là, ce serait
renvoyer une réponse fausse pour économiser un dixième de centime.

Conséquence de coût, mesurée : un membre avec des habitudes paie une génération
à chaque objectif nouveau (~0,0019 $ en gpt-4o-mini). À 1 000 membres × 3
générations/mois : ~5,70 $/mois contre 6 750 € d'ARPU. Le débit reste plafonné
à 30 objectifs/heure par IP.

### Le routage Stripe — `switch` avec `default` explicite

| `metadata.product` | Effet |
|---|---|
| `higher` | écrit dans `stoner_access` + email |
| `subscription` | écrit dans `subscriptions` + email |
| `cloth` | log seul — traitement manuel |
| *inconnu* | log, 200, **ne déclenche rien** |

⚠️ **Ne jamais transformer ce `switch` en `if`.** Un quatrième produit tomberait
dans une branche permissive : chaque acheteur de t-shirt recevrait l'accès Higher.

### Le piège des abonnements — fermé

`checkout.session.completed` porte la metadata. **Les trois événements de cycle
de vie ne la portent pas** — or ce sont eux qui coupent l'accès. La metadata est
donc posée **deux fois** : session *et* `subscription_data`.
**Irrattrapable sur un abonnement déjà créé sans elle.**

---

## 5b · Storage — buckets vidéos, mesuré le 23/08/2026 · maj 28/08/2026

| bucket | fichier | taille | servi à |
|---|---|---|---|
| `higher_boutique` | `same_but_opposite.mp4` | 211 Ko | higher.boutique |
| `space` | `same_but_opposite.mp4` | — | **À COPIER** — totehm.space |
| `space` | `earth.mp4` | 1,87 Mo | **plus référencé — à supprimer** |
| `play-signals` | `{sign_id}.mp4` × 22 | — | totehm.com — Play the Street |

`space/totehm.html` demande `space/same_but_opposite.mp4`. Le fichier
n'existe pour l'instant que dans `higher_boutique`. Il se COPIE : trois
origines, trois produits, un contenu commun ne se partage pas.

`play-signals` est un bucket **public**. Chaque fichier est nommé `{sign_id}.mp4`
où `sign_id` correspond à la clé dans `const SIGNS` de `discover_lisbon.html` et
`get_higher.html` (ex : `fire_exit.mp4`, `stop.mp4`). 22 vidéos attendues.

---

## 6 · Secrets

**Noms seulement. Aucune valeur ici, ni dans une conversation.**

| Clé | Emplacement | État |
|---|---|:---:|
| `SUPABASE_ANON_KEY` | en dur dans les `.html` | publique par nature |
| `SUPABASE_SERVICE_ROLE_KEY` | injectée par Supabase | ✅ |
| `STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` | `supabase secrets` | ✅ |
| `RESEND_API_KEY` | `supabase secrets` | ✅ |
| `OPENAI_API_KEY` | `supabase secrets` | ✅ (clé commune aux 3 entités) |
| `AUTOBIO_MODEL` | `supabase secrets` | optionnel, défaut `gpt-4o` |
| `TELEGRAM_BOT_TOKEN` | `supabase secrets` | ⚠️ **à remplacer** — valeur actuelle = TotehmManager, doit devenir TotehmBot |
| `TELEGRAM_WEBHOOK_SECRET` | `supabase secrets` | ❌ **manquant** |
| `PRICE_FIGHER_YEAR` | `supabase secrets` | ✅ `price_1U5Rca1hAyZo38svOccaGeiE` |
| `GOOGLE_MAPS_API_KEY` | `supabase secrets` | ✅ **posée** — prouvé par les logs du 03/09 (`warm()` a décrit 20 lieux en un balayage) |
| `TICKETMASTER_API_KEY` | `supabase secrets` | ❓ **À VÉRIFIER — c'est la moitié LIVE du produit.** Aucune trace dans les logs : la fonction renvoie `[]` en silence quand la clé manque. Se vérifie en une ligne : ouvrir la carte, lire `__totehm_map.sources.ticketmaster` |
| ~~`EVENTBRITE_API_KEY`~~ | `supabase secrets` | ❌ **à supprimer** — la clé est posée, l'API rend 404 depuis 2021. Elle faisait partir un appel mort à chaque ouverture du radar |
| ~~`SONGKICK_API_KEY`~~ · ~~`MEETUP_ACCESS_TOKEN`~~ | `supabase secrets` | ❌ **à supprimer si posées** — adaptateurs retirés le 03/09 |
| clés SSH Oracle | `~/totehm/oracle/` | ✅ gitignoré, 600 |

**TotehmBot est le bot unique des 3 entités** (`totehm.space`, `higher.boutique`,
`totehm.com`). TotehmManager est abandonné. Les workflows n8n qui pointaient vers
TotehmManager seront redirigés vers TotehmBot au fil des itérations.

**Un secret Supabase n'est jamais relisible.** `supabase secrets list` montre les
noms, jamais les valeurs. Les noter dans un gestionnaire au moment de la création.

### Resend

Domaine `higher.boutique` vérifié, expéditeur `no-reply@higher.boutique`.
Sert **deux chemins** : les codes de connexion via SMTP dans Supabase Auth, et
les emails transactionnels via `RESEND_API_KEY`.
⚠️ **Changer la clé casse les deux.** Il faut la reposer aux deux endroits.

---

## 7 · Pièges et divergences

### ⚠️ `places.intentions` N'EST PAS une propriété du lieu — mesuré 06/09/2026

**Cette colonne enregistre quel BALAYAGE a trouvé le lieu, pas ce qu'il est.**
On balaie `flow` (park, swimming_pool), Google rend aussi les salles du
quartier, et tout le lot hérite de `flow`.

Preuve, sur la base de production :

| lieu | `lieu_type` | `intentions` |
|---|---|---|
| Club 7 | `gym` | `flow` |
| Holmes Place Palácio SottoMayor | `gym` | `flow` |
| Street Workout Equipment | `park` | `flow` |

**Aucun lieu n'était étiqueté `fight`.** L'ancienne `places_matching_habits`
posait deux verrous cumulés sur cette colonne — candidature ET scoring — si
bien que *« Faire 30 minutes d'exercice physique »* (→ `fight`) rendait
**0 lieu**, alors que trois lieux d'entraînement étaient à moins de 2,4 km.

**Ne jamais filtrer sur `places.intentions`.** Depuis le 06/09 :

```
INTENTION   clé d'INGESTION + bonus de score (+0.06). Jamais un verrou.
HABITUDE    la REQUÊTE — le texte du membre, par similarité sémantique.
RÉPULSION   une RÉTROGRADATION en tier 3, jamais une exclusion.
```

Mesuré après correction, même habitude : **0 → 8 lieux**, les deux salles
dans les sept premiers, aucune librairie dans le lot.

La répulsion **rétrograde et le dit** (colonne `against`) : elle n'exclut
pas. « Le radar CLASSE, il ne filtre pas » — un filtre qui cache en silence
fait disparaître de bonnes réponses sans que personne ne le sache. Le seuil
est haut (cosine > 0,82 **et** > la similarité de la meilleure habitude) :
on rétrograde sur une ressemblance forte, jamais sur un écho lointain.

**`MAX_SWEEPS` est passé de 3 à 7.** Avec trois balayages par requête, une
ville ne finissait jamais de se couvrir : quatre intentions sur sept avaient
zéro lieu après des semaines. Ce n'était pas un défaut de conception, c'était
un démarrage à froid qui n'aboutissait pas. Le garde-fou reste
`DAILY_BUDGET` ; avec `CELL_TTL_DAYS = 90`, une cellule coûte 7 appels
(≈ 0,22 $) une fois par trimestre.

### ⚠️ Le lien Telegram expire, le `file_id` non — 06/09/2026

`getFile` rend une URL valable ~1 h ; `file_id` est permanent. `spots`
porte donc les deux : `tg_file_id` fait foi, `video_url` n'est qu'un cache
daté par `video_url_at`. **Ne jamais traiter `video_url` comme durable** —
un lecteur qui la garde affichera un média mort une heure plus tard.

La fonction `spot-video` est le seul pont : la carte ne doit jamais appeler
Telegram elle-même, ça exposerait `TELEGRAM_BOT_TOKEN` à qui ouvre le radar.

### ⚠️ `totehm_events` est un journal incomplet
25 habitudes réelles dans `steps`, **8 événements** `habit_added`.
**Tout ce qui décide ou raconte lit `my_habits()`**, jamais le journal.
`freq_changed` n'est jamais écrit alors que les masters le décrivent.

### ⚠️ Habitudes incomplètes
Sur 25 : **9 sans fréquence, 15 sans intention.** Sans fréquence, le bot les
ignore — il ne sait pas quand demander. `habits_incomplete()` les liste.
**C'est le blocage produit le plus rentable à lever.**

### ⚠️ `higher-checkout` — double divergence
1. Sur `main`, la fonction porte encore l'ancienne tarification (`COHORT_MAX=777`,
   17 €/29 €) — la production sert les cinq paliers en or.
2. Depuis le 28/08/2026, le frontend (`get_higher.html`) **ne montre plus les paliers** :
   prix fixe 30 $ affiché, checkbox waiver supprimée. La fonction doit être alignée
   sur 30 $ fixe avant tout redéploiement.
**Un `deploy` aveugle depuis le repo repasserait le paywall à 17 €. Un `deploy`
de la version actuelle du front sans fixer la fonction facturerait un montant différent
de ce qui est affiché.**

### ⚠️ `create or replace function` rétablit le GRANT à PUBLIC
Un `revoke` posé avant un `create or replace` est annulé.
`record_push` s'est retrouvée exposée à `anon`.
**Règle : tout `revoke` suit le dernier `create`, jamais l'inverse.**

### ⚠️ Doublon `figher_count()` / `higher_count()`
Même chose. Le front appelle `figher_count()`. Ne pas supprimer l'autre sans
vérifier qu'aucune page ne l'appelle.

### ⚠️ `cloth_concepts` — RLS active, zéro policy
Inaccessible sauf `service_role`. Volontaire ou oubli : à trancher avant de
brancher le pipeline Cloth.

### ⚠️ Format des steps — clé compacte `i`, pas `intention`

Les steps stockés dans `totehms.steps[]` utilisent un format compact :
`{ f: "daily", i: "focus", t: "Nom de l'habitude" }`.
La clé intention est **`i`**, pas `intention`.
Toute fonction qui lit les steps doit utiliser `s.i || s.intention`.
**`higher-map` v1-v3 lisait `s.intention` → renvoyait toujours `no_intention`.**
Corrigé en v4.

### ⚠️⚠️ UN `RENAME` NE SUIT PAS LE CORPS DES FONCTIONS PL/pgSQL

**Le piège le plus cher du projet à ce jour.** `outcomes` a été renommée
`habit_outcomes` le 18/08/2026. Quatre fonctions ont continué d'interroger
l'ancien nom : `push_decision` (3 réf.), `next_push` (6), `chapter_material`
(2), `log_asked` (1).

En PL/pgSQL une table absente ne se voit PAS à la création — elle lève à
l'exécution. `push_decision` plantait donc à chaque appel horaire ; `bot-tick`
recevait `undefined`, comptait « unknown » et passait au suivant. **Zéro
erreur visible, zéro message envoyé, pendant seize jours.**

Après tout renommage, cette requête, toujours :

```sql
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosrc like '%<ancien_nom>%';
```

Corrigé le 03/09 : `push_decision` et `log_asked` réécrites, `next_push` et
`chapter_material` supprimées (mortes, remplacées, non appelées).

### ⚠️ TROIS VERROUS SUR LA MÊME PORTE — pourquoi le bot n'a jamais parlé

Aucun n'était visible seul, et chacun suffisait à tout arrêter :

1. `push_decision` interrogeait une table disparue *(ci-dessus)* ;
2. `totehms.bot` valait `false` pour tout le monde et **rien dans le produit
   ne le passait à `true`** — `cloudSave()` écrivait `bot: !!profile.bot`,
   un champ qu'aucun bouton ne cochait, et **écrasait donc à `false` tout
   allumage venu d'ailleurs** à chaque enregistrement d'habitude ;
3. **aucune tâche pg_cron n'appelait `bot-tick`.** `README.md` affirmait
   « pg_cron l'appelle chaque heure » ; `select jobname from cron.job` ne
   renvoyait que `cleanup-drafts` et `prune_objective_cache`.

Un document qui affirme un comportement non vérifié est un bug. La règle
n°7 (« vérifier avant d'affirmer ») s'applique aussi aux documents.

### ⚠️ `revoke` par colonne : `authenticated` ≠ `anon`

Le lot du 29/08 a retiré `telegram_id` des GRANT de `authenticated`. Il ne
l'a **pas** retiré d'`anon`. Mesuré le 03/09 : `SELECT(telegram_id)->anon`,
`UPDATE(telegram_id)->anon`, `INSERT(telegram_id)->anon`.

Non exploitable **en l'état** (aucune policy RLS ne vise `anon` sur
`profiles`), mais exploitable à la seconde où quelqu'un ajoute une policy de
lecture publique — et une policy se pose en une ligne, sans penser aux GRANT.
Fermé le 03/09. **Un `revoke` par colonne se pose sur les DEUX rôles.**

### ⚠️ `higher_badges` — l'alerte `auth_users_exposed` est connue et sans effet

L'advisor Supabase la classe ERROR parce que la vue joint `auth.users`. Elle
n'expose que `id` et `pseudo`, deux colonnes déjà publiques dans `profiles`.
Vérifié le 03/09. Ne pas « corriger » sans lire la définition : `totehm.html`
s'en sert pour afficher le badge Higher sur le Totehm d'un autre.

### ⚠️ `spots.state_of_mind` — deux langues
`calm` (27) et `calme` (6). Pour l'affichage ça passe ; **pour du matching par
embedding, deux orthographes = deux clusters = résultat faux.**

---

### ⚠️ LISBONNE NE PUBLIE PAS — mesuré le 04/09/2026

**18 sources lisboètes déclarées, 11 chemins normalisés testés sur chacune,
0 flux exploitable.** Le rapport, cité tel quel depuis la prod :

```json
{"id":"lx_agendalx","name":"Agenda Cultural de Lisboa",
 "mode":"discover","tried":11,"error":"aucun flux exploitable"}
```

Ce n'est PAS une panne du parseur : `agenda_test.ts` passe 18 assertions sur
des chaînes réelles des trois formats. Le mécanisme marche, la ville ne
publie pas. Musei, salles, mairie : tout est en HTML, à la main.

**Conséquence produit :** la couche locale est en place, cron branché, coût
zéro — et elle restera vide tant qu'on n'aura pas trouvé des publishers qui
exposent un `.ics`, un RSS daté ou du JSON-LD. C'est un problème de TERRAIN,
pas d'ingénierie : il part chez Gemini (voir le brief dans `CLAUDE_CODE.md`).

**Ne pas « corriger » ça en écrivant un scraper HTML par site.** Un scraper
HTML se casse au premier redesign, silencieusement, et il faut le
re-maintenir pour chaque site. Le jour où on n'a vraiment pas le choix, on
paie une source agrégée, on ne construit pas dix parseurs jetables.

### ⚠️ `X-Frame-Options` TUAIT LA MINI-APP — trouvé le 04/09/2026

`space/vercel.json` posait `X-Frame-Options: SAMEORIGIN` sur `/(.*)`, donc
aussi sur `/higherself`. Un Telegram Mini App tourne dans une **iframe** sur
`web.telegram.org` : le cadre serait resté noir, sans message, pour tout
utilisateur de Telegram Web. Les clients mobiles ouvrent une webview et
n'auraient rien vu — le bug n'aurait été signalé que par une moitié des
membres, ce qui est la pire façon de découvrir un bug.

Corrigé : le bloc général exclut le chemin (`/((?!higherself).*)`) et
`/higherself` porte une CSP `frame-ancestors` qui nomme Telegram.
`Permissions-Policy` délègue explicitement la géolocalisation aux origines
Telegram, sans quoi la capture de spot échouerait en silence dans l'iframe.

**Se vérifie en une ligne, après déploiement :**

```bash
curl -sI https://www.totehm.space/higherself | grep -iE 'x-frame|frame-ancestors'
# attendu : AUCUN x-frame-options, et une CSP frame-ancestors qui cite telegram.org
curl -sI https://www.totehm.space/totehm | grep -i x-frame-options
# attendu : SAMEORIGIN — le reste du site reste protege
```

### ⚠️ UN LITTÉRAL POSÉ AU TEMPS DE LA SOURCE UNIQUE

`live_near` renvoyait `'ticketmaster'::text as source` : écrit le 03/09,
quand il n'existait qu'une seule source d'événements au monde. Le 04/09,
`agenda-ingest` a commencé à écrire `source = 'lx_<agenda>'` dans la même
table — et la lecture continuait d'annoncer Ticketmaster. Une colonne
écrite par l'ingestion et ignorée par la lecture, c'est une donnée qui ment :
la carte aurait promis une billetterie qui n'existe pas.

**La règle :** dès qu'une table gagne une DEUXIÈME source, on grep les
littéraux avant d'ajouter la source, pas après.

```sql
select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosrc ~ '''(ticketmaster|google)''';
```

## 8 · Comment vérifier

**Le lot du 03/09/2026, en une requête :**

```sql
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosrc like '%public.outcomes%')      as fonctions_cassees, -- 0
  (select count(*) from cron.job where jobname='bot-tick' and active)    as cron_bot_tick,     -- 1
  (select count(*) from public.live_events)                              as live_rows,
  (select coalesce(sum(calls),0) from public.live_budget)                as tm_calls_today,
  (select count(*) from public.totehms where bot)                        as bot_actif;
```

**Le lot du 04/09/2026, en une requête :**

```sql
select
  (select count(*) from public.live_sources)                      as sources,        -- 18
  (select count(*) from public.live_sources where active)         as sources_ok,     -- 0 au 04/09
  (select count(*) from public.live_events where source<>'ticketmaster') as evts_locaux,
  (select count(*) from cron.job where jobname='agenda-ingest' and active) as cron_agenda, -- 1
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='higherself_state')    as higherself,     -- 1
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='search_totehms')      as search,         -- 1
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosrc like '%''ticketmaster''::text as source%') as litteral_mort; -- 0
```

**La recherche, sans être connecté** (c'est tout l'intérêt) :

```sql
select * from public.search_totehms('wa', 8);
-- 0 ligne = personne ne porte ce nom OU personne ne l'a partagé.
-- Jamais « privé » par défaut : le front dit ce qui est vrai.
```

**Sonder les agendas sans rien écrire :**

```sql
select public.edge_call('agenda-ingest', '{"mode":"probe"}'::jsonb);
select status_code, content from net._http_response order by id desc limit 1;
-- chaque source rend {id, name, tried, found|error}. « aucun flux
-- exploitable » sur toutes = la ville ne publie pas, ce n'est pas un bug.
```

**Le bot, de bout en bout, sans attendre l'heure ronde :**

```sql
select public.bot_tick_arm();
select status_code, content from net._http_response order by id desc limit 1;
-- attendu : 200 {"checked":N,"sent":M,"reasons":{...}}
-- « quiet_hours » la nuit est une RÉUSSITE : la fonction dit non par défaut.
```

**Quelle couche de la carte est éteinte** — membre connecté, un bloc dans la
console sur `totehm.space/map`, après avoir cliqué une intention :

```js
copy(JSON.stringify(window.__totehm_map, null, 2))
// sources.ticketmaster === false    →  TICKETMASTER_API_KEY n'est pas posée
// live === 0 && live_swept === true →  clé posée, rien dans cette ville
```

**Ne jamais faire confiance à ce document sans vérifier.** Il est daté ;
la réalité bouge.

```sql
-- volumes et RLS
select c.relname, c.reltuples::bigint, c.relrowsecurity,
       (select count(*) from pg_policy p where p.polrelid=c.oid) as policies
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by 1;

-- l'adhésion vue par le front
select public.my_membership();

-- ce qui manque aux habitudes
select public.habits_incomplete();
```

```bash
supabase secrets list          # noms seulement

# backend/ n'est servi par personne — DOIT renvoyer 404 partout
curl -sL -o /dev/null -w "%{http_code}\n" https://www.totehm.space/backend/README.md
curl -sL -o /dev/null -w "%{http_code}\n" https://www.higher.boutique/backend/README.md

# aucun secret dans le repo
cd ~/totehm && git diff | grep -iE "service_role|sk_live|sk_test|whsec_|re_[A-Za-z0-9]{20}"
```

Si `backend/` renvoie 200 : **arrêter tout**, le SQL et le code des Edge
Functions sont téléchargeables.

---

## 9 · Règles non négociables

1. **Jamais `git add .`** — `oracle/` contient les clés SSH.
2. **Un commit par changement.** `git revert HEAD && git push` est le seul filet.
3. **`backend/` reste à la racine.** Dans un dossier Vercel, il devient public.
4. **Le prix et l'accès viennent du serveur**, jamais du client.
5. **Aucun secret dans une conversation.** Valeur remplacée par `xxxxx`.
6. **Ne jamais retirer le filtre `metadata.product`.**
7. **Vérifier avant d'affirmer.** Lire, `curl`, interroger la base.

---

## 10 · Journal des décisions

| Date | Décision | Pourquoi |
|---|---|---|
| 27/09 | **Les vues de l'Espace suivent le temps : Yesterday · Today · Tomorrow ; Search en bas ; My space au coin membre** | la croix du Totehm (passé · présent · futur) appliquée aux Spots ; « My Space » était une vue de plus alors que c'est MON compte |
| 27/09 | **Le rendez-vous se pose en plein écran, carte sous une croix fixe** | viser un point sur un radar de 30 px au téléphone était impossible |
| 27/09 | **Plus de Montserrat nulle part ; Bebas Neue pour titres et questions ; le slogan Higher vectorisé** | décision de marque de Wah ; un slogan qui dépend d'une webfont s'éteint le jour où la police ne charge pas |
| 27/09 | **La tuile perforée navy = le nom d'un Totehm ; saisies et boutons gris arrondis** (Espace, Club) | une texture de marque qui sert à tout ne signifie plus rien |
| 27/09 | **`my_space` remonte sur un an** | YESTERDAY doit retrouver ce qu'on refait |
| 28/09 | **YESTERDAY = tous les anciens Spots (`spots_past`) ; My Spots dans le coin membre** | Wah : hier, c'est ce qui s'est passé autour de moi ; mon histoire est mon compte |
| 28/09 | **Les intentions de Search reprennent les rangées du 26/09** | la version pastilles du 27/09 changeait un geste que Wah n'avait pas demandé de changer |
| 28/09 | **Navy / bleu clair / rouge-violet réservés aux boîtes du Totehm** (Espace, Club) | une couleur de boîte qui sert aussi de filtre ou de solde ne dit plus « ceci est mon Totehm » |
| 26/09 | **totehm.space va de la rue à la planète** | plateforme internationale : une projection orthographique, des lumières par région (`spots_globe`), la couronne qui fait tourner la carte ou le globe |
| 26/09 | **Un Spot a une nature : public ou privé** | chez soi, le radar ne doit montrer que le quartier (~1,1 km) — l'arrondi est en base |
| 26/09 | **Trait de côte Natural Earth servi par nous ; tuiles OpenStreetMap en création seulement** | zéro facture, zéro clé ; OSM a une politique d'usage — un fournisseur payant sera nécessaire à fort volume |
| 25/09 | **totehm.space se pilote à la manette de totehm.com : cinq crans, cinq vues** | « le joystick, directement sur l'atterrissage, en dessous du radar » ; la barre Search · Create · My space disparaît, le radar rétrécit |
| 25/09 | **La boîte-action n'est plus la boîte-habitude** | une action a une date, une heure, une durée, un lieu, des places — pas un rythme ; WHY/TRIGGER passent dans un tiroir |
| 25/09 | **Les règles d'un Spot sont une fonction (`spot_rules()`)** | la page affiche « 2 / 10 » sans connaître le 10 ; `spot_publish` lit les mêmes chiffres |
| 24/09 | **totehm.space devient un cockpit : trois commandes, la boîte de totehm.com** | « Plutôt que dix boutons, trois, et le reste au fur et à mesure » ; un réseau social qui ne ressemble ni au Totehm ni à la boutique, mais dont le CONTENU est la boîte du Totehm, au pixel |
| 24/09 | **Un accès offert est une table (`figher_comps`), pas une fausse ligne de paiement** | écrire dans `subscriptions` ou `stoner_access` mentirait au webhook, au grand livre et aux chiffres |
| 24/09 | **La recherche de l'Espace est en base, par mots, et ne cherche que ce qu'on peut lire** | un invité qui chercherait dans les objectifs devinerait le contexte caché un mot à la fois |
| 24/09 | **Spots de démo marqués, datés à partir de maintenant, purgeables d'un appel** | Wah doit pouvoir tester la recherche, candidater et recevoir des demandes ; rien de faux ne doit se confondre avec un vrai membre |
| 23/09 | **Un seul master, quatre domaines** — `TOTEHM_MASTER.md` remplace les masters par domaine et `TOTEHM_MASTER.html` | le MASTER de Wah couvre les quatre domaines d'un bloc ; trois masters décrivaient un découpage qui n'existait plus |
| 23/09 | **FIGHER = une fonction, trois clés** (`_figher`) | le Club, l'Espace, la Boutique et le bot lisent la même règle ; une page qui la recompose finit par oublier une clé |
| 23/09 | **Le THP n'est PAS verrouillé derrière un Totehm complet** (MASTER §7 non appliqué) | il s'achète avant d'avoir un compte : c'est la porte d'acquisition. Le sas tient par FIGHER, qui exige les deux |
| 23/09 | **L'argent des membres est un grand livre** (`member_ledger`), crédité sur `invoice.paid` | la facture prouve l'argent et chaque renouvellement en produit une ; un solde calculé depuis les abonnements oublierait ceux qui ont payé puis annulé |
| 23/09 | **Idempotence par contrainte** (`unique(source, kind)`), livre append-only | Stripe rejoue ; une facture ne doit créditer qu'une fois, et une erreur se corrige par une ligne, jamais par un UPDATE |
| 23/09 | **Le webhook efface sa ligne `stripe_events` avant de rendre 500** | sinon le rejeu de Stripe est avalé par l'idempotence : une panne passagère devient une facture jamais créditée |
| 23/09 | **Partagé + monétisé = lisible par les abonnés seulement** | `members` ouvrait le Totehm à tout membre connecté ; l'abonnement est à sens unique (MASTER §13) |
| 23/09 | **Seuls les bénéfices construits se vendent** (`totehm`, `spots`) | vendre « parler au Higher Self d'un autre » avant qu'il existe, c'est un remboursement programmé |
| 23/09 | **Le Spot reste une ligne de `spots` ; ce qui lui est propre vit dans `spot_plans`, sans politique RLS** | ne pas dupliquer la table que le radar et HigherSelf lisent ; `spots` est trop ouverte pour porter un rendez-vous exact |
| 23/09 | **Position publique d'un Spot arrondie à ~110 m** | le radar dit « par là » ; le lieu exact est pour les acceptés |
| 23/09 | **Compatibilité déterministe (trigrammes), un seul nombre** | zéro LLM, zéro API payante — 0 € à l'échelle ; une décomposition permettrait de reconstruire le Totehm d'un candidat (MASTER §38) |
| 23/09 | **Capacité par verrou de ligne** | testé à deux candidatures simultanées sur une place : une acceptée, une refusée |
| 23/09 | **La totehmisation part d'une Box, n'importe laquelle** ; matière et palette calculées côté serveur, figées au Checkout | ce que le membre voit est ce qui part à l'atelier ; le client ne choisit pas les couleurs |
| 23/09 | **Reveal the Box vit sur figher.club** ; `decode_cloth` ne rend plus la matière d'une pièce née d'une Box | sinon Reveal se contourne par la porte de derrière |
| 23/09 | **figher.club est un domaine** ; `totehm.com/club*` deviennent des ponts | MASTER §8 ; le pont SSO existe depuis le 17/09, la raison du vanity URL est tombée |
| 23/09 | **Migration écrite, PAS appliquée en production** | refus du garde-fou de permissions de la session ; application par Wah (éditeur SQL) ou par Claude avec sa permission explicite |
| 21/09 | **La stack police est une règle de marque, et elle se MESURE** | Bebas Neue titres · Quantico boutons et saisies · Space Mono corps et métadonnées · Montserrat EXCLUSIVEMENT le slogan `[Get Higher]`, donc uniquement dans le SVG. Un test relit la `fontFamily` calculée de chaque rôle : une règle de marque sans test est une règle qu'on recassera |
| 21/09 | **Des ronds EMPILÉS ne peuvent dire que l'axe EMPILÉ** | J'avais mis le temps (sagesse/habitudes/vision) à la verticale du pavé. La croix dit que l'horizontale est le temps et la verticale la profondeur : le pavé montre objectifs / habitudes / répulsions, et la TUILE porte l'époque. Deux axes, deux langages |
| 21/09 | **Le contrôleur et la croix se gardent par un TEST, pas par une formule** | `#fold-x` se résout sur `#stage`, `#joy` sur la fenêtre : deux repères pour le même coin. `croix21.mjs` vérifie le dégagement à six largeurs — 23 px sur ordinateur, 14 au téléphone |
| 21/09 | **Un identifiant ne contient jamais le séparateur de champs** | `tmp:1` dans un `data-edit="r:tmp:1"` relu par `split(':')` donnait `'tmp'` : la cible était introuvable et **chaque frappe d'une boîte neuve était jetée en silence**. `tmp-1`. C'était ça, « je ne peux pas rajouter de répulsion » |
| 21/09 | **Le faux serveur doit pouvoir être LENT** (`window.__LAT_W`) | La prod met 300–600 ms sur une création, la frappe part à 700 ms : toute la fenêtre du bug vit entre les deux, et à 80 ms elle n'existait pas. Troisième fois qu'un stub trop gentil cache une panne |
| 21/09 | **Une frappe attend le baptême au lieu d'être jetée** | `if(estProvisoire(id)) return;` était un abandon que rien ne reprogrammait. Et l'attente compte comme une écriture en vol, sinon le rechargement de l'arbre la double |
| 21/09 | **TotehmBot : on ne vend PAS de la « PNL »** | La revue systématique de référence (Sturt et al., BJGP 2012) conclut à « peu de preuves ». On vend les mécanismes réellement utilisés — implementation intentions (d = 0,65, 94 tests) et self-talk distancié (Kross 2014) — qui sont solides ET qui décrivent exactement ce que le Totehm stocke déjà |
| 21/09 | **TotehmBot est inclus dans le Figher Club, jamais vendu à part** | Ce n'est pas un module : c'est ce à quoi sert un Totehm complet. Deux verrous côté serveur — membre du Club ET Totehm complet — rendus en UN booléen |
| 20/09 | **Le son appartient à l'INTENTION, pas à l'habitude** | Deux habitudes en `focus` entendent la même chose : c'est le propre d'une intention. La table existait déjà (`intention_music`) — on n'en a pas créé une deuxième, le TYPE va dans `title` et le lien dans `url` |
| 20/09 | **Le lien musical devient facultatif, le TYPE devient obligatoire** | `set_music` exigeait une URL. Or « hard techno, 140 bpm » est une réponse complète : refuser cette saisie ferait perdre la moitié des réponses |
| 20/09 | **Le pavé montre TROIS ÉPOQUES, plus cinq vues** | Les cinq ronds blancs dessinaient le plan du produit. Un contrôleur montre où l'on est : la couleur dit l'époque, le titre dit la couche. Une information, un seul endroit |
| 20/09 | **Quatre coins, quatre objets — le contrôleur quitte le coin de la croix** | `#fold-x` se résout sur `#stage`, `#joy` sur la fenêtre : deux repères pour le même coin, aucune arithmétique ne les tient d'accord. Deux tentatives de réglage, deux chevauchements mesurés. La troisième est une règle, pas un chiffre |
| 20/09 | **Une création n'est finie que quand on peut écrire dedans** | Les cinq objets naissaient avec un champ vide de 10 px, sans invitation, et sans curseur au téléphone. Et le baptême (l'identifiant réel qui remplace le provisoire) reprenait le curseur 400 ms plus tard |
| 19/09 | **Le Totehm est le passeport — UNE BOÎTE NON VIDE DANS CHACUNE DES CINQ VUES** | Une seule clé pour TotehmBot, la monétisation, la visibilité, les Spots et le visuel textile. Écrite dans la base (`totehm_complete`), pas dans le navigateur : quatre produits l'interrogent, elle ne peut pas dire quatre choses |
| 19/09 | **Stripe Connect abandonné pour les créateurs — virements manuels le 1er** | Le profil plateforme a bloqué TOUS les créateurs trois jours, plus un KYC chacun et un compte connecté avant le premier euro. Pour virer 80 % à une poignée de gens une fois par mois, c'était une usine. **Palier de retour : cent créateurs** |
| 19/09 | **L'IBAN est chez nous, en clair, et c'est écrit** | RLS + chiffrement au repos, et la lecture ne rend QUE les 4 derniers caractères. Ce n'est pas un coffre-fort, c'est un carnet d'adresses bancaires — il se vide le jour où Connect revient |
| 19/09 | **Le tiroir créateur ne redirige plus** | Une redirection vers `/club/creator`, c'est perdre la moitié des gens à la seconde où ils disent oui. Un seul appel (`creator_cercle`) donne tout le tableau de bord |
| 19/09 | **L'axe du pad se DÉDUIT de la croix** | Une seconde table écrite à la main a cessé de dire la même chose que la croix à la minute où celle-ci s'est élargie. Deux tables qui doivent s'accorder finissent toujours par ne plus s'accorder |
| 19/09 | **Le lieu d'une habitude est une TABLE, pas une clé dans le `jsonb`** | Les habitudes vivent dans `totehms.steps` : y glisser un lieu obligerait à réécrire tout le tableau pour changer un mot, et rendrait toute recherche par lieu impossible. `lat`/`lng` restent vides — le géocodage attend le Radar |
| 19/09 | **Immersion : rien qui sorte du Totehm déplié** | Les trois portes et l'espace membre remontent sur l'atterrissage. Un bouton visible qui ne fait rien est un bouton cassé : on enlève, on ne débranche pas |
| 04/09 | **La couche locale est faite de FORMATS, pas de sites** | Trois parseurs (ICS · JSON-LD · RSS) et des sources déclarées en base : une salle de plus = une ligne. Un adaptateur par site se casse au premier redesign — trois adaptateurs sont déjà morts en un lot |
| 04/09 | **`discover` avant d'ingérer** | Les dix premières graines lisboètes ont été devinées à la main : les dix ont rendu 404. On ne devine plus une URL de flux, on sonde onze chemins normalisés et on écrit celui qui répond |
| 04/09 | **Mesuré : aucune des 18 sources lisboètes ne publie** | Le mécanisme marche (18 assertions passent sur des chaînes réelles), la ville ne publie pas. Problème de terrain → brief Gemini. **Pas de scraper HTML par site** |
| 04/09 | **La recherche rend une LISTE** | `ilike('%q%').limit(1)` ouvrait le Totehm d'un inconnu choisi par le hasard du plan d'exécution, et pour un invité le front servait TROIS PROFILS INVENTÉS. Une RPC `security definer` ouverte à `anon`, qui ne rend que ce qui est partagé |
| 04/09 | **HigherSelf : un seul appel, un seul calcul** | Six requêtes au chargement, c'est six fois la latence d'un réseau mobile. Et surtout : la mini-app et le bot lisent la MÊME fonction — deux calculs de la même série finissent toujours par annoncer deux chiffres différents au même membre |
| 04/09 | **Telegram devient une surface, pas une notification** | Un bouton `web_app` ouvre le Totehm entier DANS la conversation. Rien à configurer chez BotFather, la seule contrainte est le HTTPS. Coût : zéro |
| 03/09 | **Ticketmaster seule source LIVE, mise en cache** | Eventbrite rendait 404 à chaque ouverture ; Songkick et Meetup sont fermées ou payantes. Une seule API gratuite et mondiale, un balayage par cellule de 11 km toutes les 12 h |
| 03/09 | Un événement est **rangé**, pas relégué | il portait `rank_tier: 3` en dur : la moitié Ticketmaster du produit s'affichait en périphérie, à opacity .5 |
| 03/09 | Échelle du radar portée à 60 km | le plafond de 4 km cachait 100 % des événements — `layout()` les passait en `display:none` |
| 03/09 | Cinq places réservées à la couche LIVE | `sort(dist).slice(0,15)` laissait les 60 places physiques manger les 15 places avant le premier concert |
| 03/09 | **`push_decision` réécrite sur `habit_outcomes`** | elle interrogeait `outcomes`, renommée le 18/08. Le bot n'avait jamais envoyé un message |
| 03/09 | La liaison TotehmBot allume le bot | on ne demande pas deux fois la même permission |
| 03/09 | `bot` retiré du snapshot d'habitudes | le snapshot éteignait le bot à chaque sauvegarde |
| 03/09 | Cron `bot-tick` par **jeton à usage unique** | la clé `service_role` serait restée en clair dans `cron.job.command`, dans chaque dump |
| 03/09 | `telegram_id` retiré à `anon` | le lot du 29/08 ne l'avait retiré qu'à `authenticated` |
| 01/08 | Bucket `stoner-method` privé | les 11 vidéos étaient téléchargeables |
| 01/08 | `.gitignore` créé | les clés SSH allaient partir sur GitHub |
| 02/08 | Deux dossiers, deux projets Vercel | un domaine servait les fichiers de l'autre |
| 02/08 | `backend/` à la racine | Vercel aurait servi le SQL publiquement |
| 03/08 | Prix Higher calculé serveur | le front était modifiable en console |
| 08/08 | Import Supabase en module ES | le build UMD ne définit pas `window.supabase` |
| 08/08 | `email_status` sur `stoner_access` | l'échec d'envoi était totalement silencieux |
| 15/08 | `stripe_events` + `my_tier()` | idempotence et source unique |
| 15/08 | Le pic narratif **déduit**, pas demandé | « best one yet » mélangeait effort et satisfaction |
| 15/08 | Modèle premium pour l'autobiographie | 0,017 € contre 6,37 € net : la qualité *est* le produit |
| 18/08 | `outcomes` → `habit_outcomes`, DONE/MISSED | master v5 : deux taps, pas quatre |
| 18/08 | `obstacles` en table propre | un obstacle a sa propre vie |
| 18/08 | `objectives` + `objective_events` | la couche FUTURE n'existait pas |
| 18/08 | **Figher Club, adhésion unique** | Seed/Plant/Tree ne sont plus des paliers publics |
| 18/08 | `totehm_clothes.chapter_id` | un vêtement porte un **chapitre**, pas un texte |
| 17/08 | **TotehmBot bot unique des 3 entités**, TotehmManager abandonné | un bot par domaine = 3 bots à maintenir ; la curation illustrations n8n rejoint TotehmBot |
| 17/08 | **Figher Club pricing officiel** — 7 jours d'essai, 77 €/an, price lock, paliers par nombre de membres | vision club, pas SaaS ; la valeur augmente avec le réseau |
| 18/08 | Navigation 3 floors : 0=Habitudes · 1=Higher Map · 2=Settings | la Map n'est pas un 4e domaine ni un fichier séparé — elle vit dans `totehm.html` |
| 18/08 | `#hmap` sibling de `#stage`, jamais à l'intérieur | `#stage` a un `transform` desktop → devient containing block de `position:fixed` → full-screen impossible si #hmap est dedans |
| 18/08 | `body.in-map` + CSS `!important` pour la transition Map | `applyFloorFx()` pose des styles inline → seul `!important` peut les surcharger sans changer la signature |
| 18/08 | Settings desktop : `#settings-nav .sn-row{display:none}` — seul `#sn-home` reste | supprimer les boutons My Wisdom et My next objective du panel Settings sans toucher la nav mobile |
| 18/08 | Filtre : TIME FREQUENCY → étape intention avant fermeture | sans ça, la fenêtre se fermait avant que l'utilisateur ait pu choisir une intention |
| 18/08 | `GOOGLE_MAPS_API_KEY` : clé optionnelle, fallback spots DB si absente | fallback spots DB actif ; la clé active le cache Google mais n'est pas requise |
| 18/08 | Steps format compact `{f,i,t}` — `higher-map` lisait `s.intention` → `no_intention` toujours | corrigé v4 : `s.i \|\| s.intention` |
| 18/08 | `spots.expires_at` → NULL pour tous les spots | tous avaient `expires_at = 2026-06-03` → 0 spots depuis 2 mois |
| 18/08 | `loadMap()` : Lisbonne `{38.716,-9.142}` par défaut, plus de bloc GPS | GPS bloqué = liste sans carte ; Lisbonne couvre les spots en base |
| 18/08 | `body.in-map #bigT/wordmark/rail` : règle GLOBALE + `transition:none` | était dans `@media(min-width:700px)` → résidus T.svg/wordmark/rail sur mobile |
| 18/08 | Higher Map v1 : carte à tuiles tierce, ~800 ko JS depuis CDN | remplacé en v2 par le radar TOTEHM — fond noir, canvas, zéro dépendance externe |
| 18/08 | Liste spots fallback : horizontale (`overflow-x:auto`, cards 140 px) | scroll vertical clashait avec le swipe-floor du Totehm |
| 18/08 | `.acct-btn` CSS ajouté | bouton Delete my Totehm sans style ni couleur rouge-violet `#743169` |
| 18/08 | `go()` : suppression du fade 180 ms de `fv-inner` avant `paint()` | le fade rendait fv-inner transparent → bigT visible 180 ms contre le fond navy |
| 19/08 | **Higher Map v2 — radar TOTEHM** : fond noir, zéro tuile, marqueurs T, lignes pointillées | zéro requête cartographique, identité propre à TOTEHM |
| 19/08 | **Void Radar — Higher Map v3** : canvas+DOM, trigger par intention, librairie de carte retirée | 800 ko de JS pour un fond noir sans tuile ; trigger intention → coût Google par choix, pas par ouverture |
| 19/08 | **Swipe Deck & Radar — Higher Map v4** : rendu bifurque à 700 px, unified spot model, correction rayon `places_near`, `PLACES_ENABLED` | radar mauvais sur 390 px ; une machine à états, deux rendus, une carte de contenu |
| 19/08 | Cache géographique `places` + `places_cells` + `places_budget` | la v4 coûtait 8,40 $/mois par membre ; cache cellule = 0 $ à partir du 2e membre |
| 19/08 | `totehms_user_id_uniq` — index unique sur `totehms(user_id)` | deux onglets en course créaient deux Totehms → cassait `.maybeSingle()` côté serveur |
| 19/08 | `cloudSave()` : `delete`+`insert` → `upsert onConflict:'user_id'` | atomique, compatible avec l'index unique |
| 19/08 | Repli Praça do Comércio (38.7078, -9.1366) si GPS absent/refusé | un écran vide est un bug, pas un message |
| 28/08 | **TotehmPaper {THP}** — nouveau nom produit de l'expérience Stoner, 30 $ fixe | concept LSD paper : l'objet à consommer, pas un abonnement |
| 28/08 | `get_higher.html` — paywall refait : titre/description/tiers/checkbox supprimés, logo en placeholder 3D | minimalisme maximal, l'objet parle seul |
| 28/08 | `discover.html` (international) — reformaté à l'identique de `discover_lisbon.html` | cohérence des deux Discovers |
| 28/08 | `discover_lisbon.html` — récupéré depuis git `22128ed` (version supérieure à celle du zip) | la version zip était plus ancienne |
| 28/08 | `lisbon.html` supprimé, routing PT → `discover_lisbon.html` | un seul fichier PT, route claire |
| 28/08 | Vercel défaut `/` → `discover.html` (était `discover.html`, route `/global` ajoutée) | international sans ambiguïté |
| 28/08 | `higher-checkout` : divergence front/back identifiée — front 30 $ fixe, fonction encore sur 5 paliers | à aligner lors du prochain lot `higher-checkout` |
| 03/09 | **`spots.energy_mode`** — nouvelle colonne `silent \| social \| null`, check constraint. Imposée par `bot-reply` sur toute nouvelle insertion `MEMBER_DROP` (7e étape du flow `/spot`, entre visibilité et INSERT). `places_near` la renvoie ; `map.html`, `book.html`, `totehm.html` l'affichent en badge (uniquement sur `MEMBER_DROP`). Legacy : 121 lignes à NULL, badge omis — backfill manuel plus tard. |
| 03/09 | **Pilier** remplace `neuro` sur les 7 intentions dans le sélecteur — mapping `BODY=fight,flow` · `MENTAL=enrich,focus` · `SOUL=express,celebrate` · `SPIRIT=love`. Appliqué à `map.html`, `book.html`, `totehm.html` (les tags neurotransmetteurs `.s-int-ntag / .pk-ntag / .wp-ntag` supprimés, remplacés par un mot Space Mono en majuscules). `next_objective.html` n'était pas concerné (n'a que `IDEF`). |
| 03/09 | **Prompt OpenAI `batchDescribe`** réécrit dans `higher-map` — voix du mentor (Goggins/Watts/Naval/Perel/Abloh/Jobs/Bourdain), une ancre physique obligatoire, ban list explicite (`unlock`, `vibrant`, `hidden gem`, `must-visit`, `elevate`, `journey`, `embrace`, `immerse`, `experience`, `vibe`), 8 mots max. Les descriptions déjà en cache ne sont pas régénérées — le nouveau ton s'impose au fil du remplissage. |
| 03/09 | `GOOGLE_MAPS_API_KEY` **remise en place** dans Supabase secrets (elle manquait depuis un moment — les logs du 02/09 montraient `API_KEY_INVALID`). Testé end-to-end via une fonction `debug-gm` temporaire supprimée après validation. Clé restreinte à Places API (New) dans Cloud Console, aucune restriction d'application (Supabase Edge Functions n'ont pas d'IP fixe). |

---

*Ce document se met à jour à chaque changement d'infrastructure.
Un document daté et faux est pire que pas de document.*

---

## 9 · La production de contenu par les membres — mesuré le 29/08/2026

### Ce qui manquait, et pourquoi rien ne marchait

`bot-reply` répondait « Ouvre ton Totehm sur totehm.space pour lier ton
compte ». **Cette liaison n'existait nulle part** : zéro occurrence de
`telegram` dans les quatre fichiers de `space/`. Résultat mesuré :
`profiles.telegram_id` renseigné sur **0 profil sur 3**. Le bot n'a jamais
pu parler à personne depuis sa mise en service.

### Le chemin complet

```
totehm.space, menu membre
  [Connect TotehmBot]        →  rpc new_bot_link_code()   16 car. base64url
  ouvre t.me/TotehmBot?start=<code>
        |
  /start <code>              →  bot-reply lit bot_link_codes
                                pose profiles.telegram_id
                                marque used_at
        |
  /spot                      →  canPost(uid) : abonnement active|trialing
        |
  intention (7 boutons)  →  activité (texte, 80)  →  pourquoi (texte, 300,
  ou /passer)  →  position (NATIVE Telegram)  →  quand (1 h / 3 h / lieu)
  →  visibilité (Club / Public)
        |
  insert dans spots, user_id VENANT DE LA BASE
        |
  higher-map v8 passe p_include_club=true APRÈS son 402
        |
  le spot apparaît sur la carte de ceux qui portent cette intention
```

### Coût : zéro

La position vient de Telegram (`request_location`), pas d'un géocodage.
Aucun appel IA dans la boucle. La table `bot_drafts` porte l'état de la
conversation ; PostgreSQL, pas un service.

### Qui a le droit de publier

`REQUIRE_FIGHER = false` dans `bot-reply` — aujourd'hui l'abonnement Club
suffit. La condition visée par BRAND.md est le **Figher** (méthode Stoner
+ abonnement) ; elle rendrait la fonction morte : 6 accès Stoner, un seul
avec un compte `.space`, et l'unique abonnement n'est pas le sien.
Passer la constante à `true` suffit à resserrer, rien d'autre à changer.

### Trois trous fermés dans ce lot

| Trou | Mesuré | Fermé par |
|---|---|---|
| `spots` INSERT n'exigeait que `auth.role() = 'authenticated'` — un membre pouvait publier **au nom d'un autre** | 28/08 | policy `members insert own spots`, `auth.uid() = user_id` |
| `profiles.telegram_id` lisible **et écrivable** par tout membre — on pouvait s'attribuer le Telegram d'un autre et recevoir ses questions | 29/08 | GRANT par colonne (SELECT sans `telegram_id`, UPDATE sur `pseudo` seul) |
| `new_bot_link_code()` appelait `gen_random_bytes` avec `search_path = public` — pgcrypto vit dans `extensions`, la fonction **levait à chaque appel** | 29/08 | appel qualifié `extensions.gen_random_bytes` |

Le premier et le troisième sont invisibles à la lecture : le premier ne se
voit qu'en interrogeant `pg_policy`, le troisième qu'en appelant la fonction
sous le rôle `authenticated`. Les deux ont été reproduits avant d'être
corrigés.

### Le piège des GRANT par colonne

`revoke select (telegram_id) ... from authenticated` **ne fait rien** si le
GRANT a été posé au niveau table. PostgreSQL accepte, émet un WARNING, ne
change rien. Il faut `revoke select on <table>` puis `grant select (col, ...)`.
Conséquence à retenir : **toute colonne ajoutée à `profiles` sera invisible
au front** tant qu'elle n'est pas ajoutée à la liste du `grant`.

---

## 10 · Le design des quatre fichiers — arrêté le 29/08/2026

### Un seul système de filtre et de sélection

Il y en avait **cinq** : `book.html` alignait à gauche, `totehm.html` centrait,
`next_objective.html` affichait sans définition, `map.html` avait deux styles à
lui seul. Cinq fenêtres qui font la même chose et ne se ressemblent pas.

Le format retenu est celui du sélecteur d'intention, **centré** :

```
carte       #131316 · liseré #242429 · 520px · padding 26/22/18 · gouttière 10
question    Space Mono 10 · .14em · majuscules · blanc 50% · centrée
ligne       colonne centrée · padding 13px 8px · liseré haut blanc 7%
            survol blanc 5% · choisie blanc 4%
T           16×16, EN BLOC AU-DESSUS du nom, 6px sous lui
nom         Quantico 700 · 19px
définition  Quantico 400 · 13px · #b4b4b4 · 5px sous le nom
traces      Space Mono 8 · .13em · #b4b4b4 sur bord #3c3c3c · centrées
sortie      Space Mono 9 · .14em · #606060, liseré au-dessus
```

Appliqué à : `#wpick` et `#filter-modal` de `totehm.html`, `#pick` de
`book.html`, `#peek` de `next_objective.html`, `#filter-modal` et `#step` de
`map.html`.

**Les définitions sont en Quantico.** Elles étaient en Futura dans
`book.html`, et `next_objective.html` n'en affichait aucune.

### Les sept définitions sont copiées, jamais partagées

Elles vivent quatre fois : `INTS[].def` dans `totehm.html`, `book.html` et
`map.html`, `IDEF` dans `next_objective.html`. `tests/w8.mjs` §5 les compare
mot pour mot et échoue à la première divergence — c'est ce test qui remplace
le partage interdit par la règle des produits indépendants.

### La navigation : plus un seul chevron

Supprimés : `.side-nav` / `#side-left` / `#side-right` / `#side-home` avec
leurs carrés perforés et leurs intitulés, les tuiles `.sn-tile`, la flèche ↑
au-dessus du logo, et `#ctx-up` (déjà annulé en vague 5B).

Il reste **un objet, aux mêmes coordonnées dans les trois fichiers** :

```
.tnav   top:30px · 44px de part et d'autre du milieu · svg 13×22 · trait 1.5
        totehm   #tnav-l (#b06a9f, My Wisdom) · #tnav-r (#7fa3e8, Next objective)
        book     #edge-home à droite, blanc
        next     #edge-home à gauche, blanc
```

⚠️ **Le curseur DOIT vivre dans `#stage`.** Sur ordinateur `#stage` porte un
`transform` : un `position:fixed` à l'intérieur se cale sur LUI, pas sur
l'écran. Le T y est déjà. Un curseur placé dehors n'a pas le même repère et
se décale dès que la fenêtre change de taille. C'est la troisième fois que ce
piège mord dans ce produit.

Le seul chevron qui reste est le ↓ animé de « Think same but opposite » :
ce n'est pas de la navigation entre fichiers, c'est l'invitation au scroll de
la page d'atterrissage.

### Ce qui vérifie tout ça

`tests/w8.mjs` ne teste pas un fichier, il les **compare**. Sept contrôles :
zéro chevron résiduel, curseur au même pixel dans les trois fichiers,
symétrie autour du T, carte identique dans les quatre, définitions en
Quantico, les sept définitions mot pour mot, et le pas vertical de la ligne.

