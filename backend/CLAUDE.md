# backend/CLAUDE.md — la base, les fonctions, l'argent, le bot

## COM · 07/10/2026 — TotehmSM (Higher Self), l'abonnement Higher, l'atterrissage

Migrations additives `20261007100000_higher_self.sql` (appliquée en quatre :
`higher_self`, `higher_self_landing`, `higher_self_avatar_thread`,
`higher_self_sub_sync`) et `20261007110000_landing_cloth_spot.sql`
(`landing_cloth_spot`). Tables RLS sans politique : `sm_messages` (role
me|sm, kind habit|objective|repulsion, 1..1200), `member_avatars` (JPEG en
data URL ≤ 140 000). `totehm_cloth_support.logo_spot jsonb` ({x,y,w} 0..1).
- `my_landing()` (anon + auth) : tout l'atterrissage en UNE lecture — pseudo,
  vignette, visibilité, offre, `higher` (actif, offert, statut, fin, prix
  700 eur/mois), Telegram lié, THP (`_art_owns_thp`), compteurs.
- `avatar_set(p_data)` (auth) : remplace seulement (pas de suppression depuis le
  cloud : un `delete` exige une approbation). `sm_thread(p_before,p_limit)`
  (auth) : le plus récent d'abord. `higher_sub_sync(...)` (service_role) : le
  webhook écrit `bot_subscriptions`.
- Accès = `totehmbot_access()` (abonnement vivant OU `figher_comps`), lu SOUS la
  session du membre. Auto-test `tests/sql/higher_self_selftest.sql` : `FAIL={}`.
- Edge `higher-self` (JWT) : `say` = quota 30 / 24 h, contexte `_bot_memory`
  + 6 derniers messages, OpenAI (`OPENAI_API_KEY`, `HIGHER_SELF_MODEL` sinon
  gpt-5 → gpt-4.1 → gpt-4o), sortie `json_schema` {kind,text} à la PREMIÈRE
  personne, les deux lignes écrites après succès ; `telegram` = renvoie un
  reflet au `telegram_id` (409 `not_linked`). CORS `SITE_COM`.
- Edge `higher-sub` (JWT) : `checkout` (prix par `lookup_key` `higher_month`,
  503 `not_ready` tant qu'il n'existe pas ; `metadata.product='higher_sub'` en
  double), `cancel` / `resume` (`cancel_at_period_end`).
- `stripe-webhook` v42 : `higher_sub` sur `checkout.session.completed` et
  `customer.subscription.updated|deleted` → `higher_sub_sync` ; `invoice.paid`
  ne crédite rien (pas de 80/20 : c'est TOTEHM qui vend). Endpoint inchangé.

## BOUTIQUE · 06/10/2026 — F : attendre la photo Printful

F publié `c9638e70-0d0f-4dba-adb1-a78f2ccb8ec8` : `Printful Webhook` →
`Sync Product` → `Photo pending?` ; branche vraie → `Wait for Printful
photo` (une minute) → `Sync Product`. Le compteur `image_retry` va de 0 à
5 ; la condition exige `image_pending=true` ET `image_retry<5`. Après cinq
reprises sans photo, la boucle s'arrête avec `image_pending=true` : aucune
image inventée, une nouvelle synchronisation peut réessayer.

L'item de reprise ne porte que les données publiques du produit et
`source_event` ; aucun secret recopié. Les nouvelles lignes restent
inactives avec prix/édition à zéro. Sur les lignes existantes, aucune
écriture des champs active/price/max_pieces/claimed ni remplacement d'une
photo choisie. Succès non sauvegardés après validation (`none`) ; erreurs
et tests manuels conservés. Snapshot :
`n8n/workflows/n8n_F_printful_listener.json`. Preuves : SYSTEM §0.

## SPACE · 05/10/2026 — mini-boxes indépendantes et futurs ON

Migration `20261005103704_space_box_visibility_location_on.sql`, appliquée
sous `space_box_visibility_location_on`. Aucun contenu migré/supprimé.
`spot_create`/`spot_schedule` refusent les nouvelles visibilités autres que
shared ; OFF exige ville et média possédé ; `spot_schedule` impose ON+mode.
`spots_list` exclut shield OFF, y compris les anciens futurs du propriétaire.
Snapshot JSON : `show_objectives` et `show_repulsions`, absents = fallback
historique show_why. `spot_box_visibility_set(uuid,boolean,boolean)` :
auth.uid(), propriétaire, verrou, refus d'un groupe vide, grant authenticated
seulement ; `_spot_view` retire effectivement les textes masqués des réponses
publiques, contexte complet propriétaire seul. `spot_why_set` synchronise les
deux flags pour garder le masquage des anciens clients. Search_path vide,
références qualifiées, helper de rendu révoqué aux clients. Historique privé
et droits exacts de l'abonnement au créateur conservés.
`tests/sql/space_boxes_location_selftest.sql` : exception finale attendue
`FAIL={}`, tous les fixtures annulés. Lint SECURITY DEFINER de la RPC
intentionnel (tables internes RLS sans accès direct) ; propriété/grants testés.


> Chargé automatiquement quand on travaille dans `backend/`. Les règles
> transverses sont dans le `CLAUDE.md` de la racine ; l'histoire dans
> `docs/POSTMORTEMS.md`. Sections déplacées TELLES QUELLES de l'ancien
> `CLAUDE.md` le 30/09/2026, les plus récentes d'abord : un renvoi « plus
> haut » peut viser la racine ou un autre dossier. Procédures : `README.md`. État mesuré : `SYSTEM.md` (§0 d'abord).


## SPACE · 06/10/2026 — supprimer un space : `space_delete` + `space-delete`

Migration additive `20261006100000_space_delete.sql`, appliquée UNE fois sous `space_delete`. `space_delete(p_spot uuid)` : security definer, authenticated seulement (public/anon révoqués), propriétaire seul (`auth.uid()`), `why=signin|not_found`. Le space passe `cancelled` (le statut existant, la contrainte ne change pas) : tous les lecteurs ne lisent que `published` (my_spaces, habit_spaces, spot_get, fil, radar, liste, `_clip_readable`) → il disparaît partout. Ses références média (`video`, `photo`, `video_id`) sont vidées sur la ligne et RENDUES (`media:{video_id, bunny, paths}`), sauf si un autre space publié les utilise encore. `spots.active=false`, candidatures héritées annulées. Auto-test `tests/sql/space_delete_selftest.sql` (annulé) : `FAIL={}` (un étranger ne supprime rien ; deux fois = not_found).

Edge Function `space-delete` (v1, JWT exigé) : appelle `space_delete` SOUS la session du membre (jamais d'après le corps), puis efface le média rendu — la vidéo Bunny (`DELETE /videos/{id}`, 404 accepté) et sa ligne `videos` (propriétaire), les fichiers du seau `moments` rangés dans SON dossier. Un média qui résiste est journalisé, la suppression tient (le space ne se lit déjà plus). CORS `corsHeaders(origin, SITE_SPACE)`. COM et SPACE l'appellent.

## BOUTIQUE · 06/10/2026 (ter) — Luxury : le style et le nom 0.{Nom}

Migration additive `20261006120000_luxury_style_name.sql`, appliquée UNE fois sous `luxury_style_name`. `luxury_quotes` + `name` (4–48, préfixe compris) + `style_id` (→ `artistic_styles`) ; index unique `luxury_quotes_name_live` sur `lower(btrim(name))` des devis VIVANTS (requested · quoted · paid). `name_available` regarde `totehm_clothes` ET ces devis (search_path vide). `reveal_cloth` : même règle de niveaux, cherche d'abord `totehm_clothes` payé puis un devis `paid`, rend en plus `line` (streetwear · luxury) et `style`. `luxury_access` / `luxury_quotes_admin` rendent `name`, `style`. Grants reposés après le dernier `create`. `luxury-quote` v2 : `style` (uuid actif) et `name` (sans préfixe) exigés, préfixe = année de collection (juin → mai, 0 = 2026-27), `name_taken` (409) aussi sur 23505. Webhook, prix, checkout : inchangés. Auto-test `tests/sql/luxury_name_selftest.sql` (annulé) : `FAIL={}`.

## COM · 05/10/2026 — `habit_spaces` : SPACE dans les habitudes de COM

Migration additive `20261005200000_habit_spaces.sql` appliquée UNE fois sous `habit_spaces`. `habit_spaces(p_pseudo text default null)` : security definer, stable, authenticated seulement (public/anon révoqués). Vide = MES spaces publiés (privés et partagés) ; un autre membre = ses spaces `shared` seulement. Regroupés par `lower(btrim(habit))`, trois au plus (en cours, à venir le plus proche, passés les plus récents) + `total`. Chaque space passe par `_spot_view(p, auth.uid())` : AUCUNE règle nouvelle (le point exact seulement si `_spot_exact` l'accorde). Rend `{ok, mine, habits:[{habit,total,spaces}]}` ; `why=signin|nobody`. Auto-test `tests/sql/habit_spaces_selftest.sql` (annulé) : `FAIL={}`.

**Front depuis le 05/10** : `totehm_discover` et `my_box_sources` ne sont plus appelés (recherche = un nom, `totehm_search`). **06/10 : `totehm_import_boxes` revient**, une Box à la fois (« Copy to my TOTEHM » dans le Totehm lu), sans changement serveur.

## COM · 03/10/2026 — découverte et import de boxes

Migration additive `20261003155911_search_and_box_import.sql` appliquée sous `search_and_box_import` (journal `20261003164312`). `totehm_discover` expose les noms à anon/auth ; boxes et abonnements exigent auth.uid(), `_shared_with_me` reste la source des droits. Helpers `_totehm_search_text` / `_totehm_box_index` révoqués anon/auth. Fonctions nouvelles : search_path vide, références qualifiées.

`totehm_import_boxes(p_pseudo,p_selection)` authenticated seulement ; 1–50 références, accès source actuel, refus de soi, validation de tout le lot, verrou de destination, cinq types, déduplication, remapping des cinq jonctions entre les seules boxes choisies. `totehm_box_copies` est un registre interne : RLS sans politique, aucun grant direct anon/auth ; `my_box_sources()` ne rend que la provenance de auth.uid(). Retenter ne duplique pas ; les copies appartiennent ensuite au membre, même si l'abonnement cesse. Aucun changement aux prix, paiements, visibilité ou contenus source.

Auto-test `tests/sql/totehm_discovery_selftest.sql` : exception finale attendue `FAIL={}`, tout annulé. Lints d'exposition SECURITY DEFINER attendus pour ces RPC contrôlées ; RLS sans politique volontaire pour le registre. Vérifier les grants, pas supprimer les accès nécessaires au produit.

## SPACE · 03/10/2026 (ter) — photo et WHY · TRIGGER

Migrations `20261003170000_space_photo_why.sql` (`space_photo_why`) puis
`20261003171000_space_photo_column.sql` (`space_photo_column`), additives.
`spot_plans.photo` (contrainte `<uid>/<uuid>.jpg`) : `spot_plans_video_check`
refusait `.jpg` et le relâcher exigeait un drop — la photo a donc SA colonne.
`_clip_ok` accepte `.jpg` ; seau `moments` + `image/jpeg` ; `spot_create` (même
signature) et `spot_video_attach` rangent un `.jpg` dans `photo` ; `_clip_readable`
signe la photo d'un space lisible. `spot_plans.show_why` (défaut false) +
`spot_why_set(spot, show)` (authenticated, propriétaire, refuse `empty`) ;
`_spot_view` rend `photo`, `show_why` (propriétaire seul) et `why` = les TEXTES
des objectifs/répulsions du snapshot, seulement SHARED et choisi. Le contexte
complet reste au propriétaire.

## SPACE · 03/10/2026 — la vidéo d'un space futur

`spot_video_attach(spot, video)` (authenticated, pas anon) : propriétaire seul,
vidéo `bunny:<uuid>` ou chemin Storage possédée et libre (`_space_video_owned`,
index unique `spot_plans_video_id`), idempotente. Fonction NEUVE : l'ancienne
`spot_video_set` reste révoquée et part au ménage. Migration
`20261003150000_space_future_video.sql` (appliquée sous `space_future_video`).
`spot_schedule` est inchangée : une ville seule = le centre de la ville.

## Dernière correction SPACE · 02/10/2026 — Short portrait Full HD

`space_habits` rend les Boxes personnelles complètes de COM. `space_discover`
cherche le nom complet puis, s'il n'existe aucun résultat lisible dans cette
vue, les intentions de SA Habit ; droits identiques aux lecteurs existants.
SHARED exige ON/OFF ; seulement ON exige SILENT/SOCIAL. OFF et PRIVATE ne
rendent pas de mode. Snapshot : fréquence, step, lieu habituel et liens,
contexte complet toujours propriétaire seul. `_spot_match` n'est plus une
recherche de mots. Migrations additives du 01/10, voir SYSTEM.md §0.

`videos` et `video_backend` : RLS sans politique, aucun GRANT anon/auth,
service_role seulement. `video_reserve` service_role seul, propriétaire,
limites / quota verrouillés. `spot_create` accepte aussi bunny:<UUID> d'une
vidéo possédée, processing/ready, non déjà liée à un autre Spot ; stockage
via video_id, anciens video paths préservés. `_spot_view` rend un clip local
(id/status), jamais des clés Bunny ou une URL non signée. Trois Edge Functions :
create-bunny-upload / bunny-video (JWT + contrôle applicatif), bunny-webhook
(HMAC brut, custom auth ; JWT gateway désactivé pour le callback signé).

Bunny activé le 02/10 après ajout de BUNNY_ACCOUNT_API_KEY côté serveur :
API bibliothèque/compte 200, Token Authentication CDN actif, IP locking OFF,
BlockNoneReferrer OFF (l'accès repose sur le jeton), webhook HMAC configuré.
`video_backend` ready ; sonde non signée avec Referer 403, signée sans
Referer 404 sur bibliothèque vide (jeton accepté, fichier absent).
Ne jamais confondre un refus de hotlink avec la protection par jeton.
Le helper exige aussi la clé webhook et sa configuration, et choisit une
vidéo déjà encodée pour la sonde : un nouvel upload ne ferme pas la bibliothèque.
Sondes indépendantes en parallèle ; cache Edge 60 s. Une résolution HD >=720p
terminée peut devenir ready avant la fin des autres résolutions ; un clip SD
reste lisible après encodage complet. L'historique Storage reste privé et intact.
Pas encore de nouveau Spot Bunny réel testé ; voir SYSTEM.md §0.
Migration `20261002071846_space_portrait_hd_video.sql` déjà appliquée
(journal `20261002072508`) : même enveloppe pour videos, video_reserve,
spot_rules et bucket privé moments. 10 Mbps + audio 192 kbps, fichier 9:16
cible 1080 × 1920 encodé une seule fois depuis les images caméra recadrées.
Ne pas réintroduire la capture paysage selon la taille de l’écran. Les
contrôles caméra/lecture sont dans space/CLAUDE.md ; aucun droit élargi.

## Dernière demande SPACE · 01/10/2026 — le futur revient

Migration additive `20261001201525_space_future_navigation.sql`, appliquée
sous `space_future_navigation` (journal `20261001202914`). `spot_schedule`
(authenticated) relit MON Habit, enregistre une date future / lieu sans
vidéo obligatoire, mêmes droits PRIVATE/SHARED et ON/OFF. `spots_list`
(anon aussi) rend **uniquement les futurs lisibles**, curseur date + id ;
`spots_feed` exclut ceux qui n'ont pas encore commencé. `_spot_view` et
`_bot_memory` distinguent `will` / `am` / `was` ; le nom du lieu précis
reste dans `exact` uniquement. `spot_habit_context` (authenticated) lit
les objectifs / répulsions reliés à SA Habit. Pas de nouveau droit Club,
aucun ancien écrivain ou candidature réactivé. Les droits ci-dessous restent.

## ⛔ ÉTAT AU 01/10/2026 — un Spot, deux réglages, l'abonnement annuel, le bot à part

Migration `20261001_un_spot_deux_reglages.sql` (appliquée en six morceaux,
SANS rien de destructif), ménage `20261001_b_menage.sql` (les `drop`, par
Claude Code), auto-test `tests/sql/spots_selftest.sql` (annulé en fin de
bloc ; mesuré le 01/10 : « FAIL={} »).

**⚠️ DEUX ÉCARTS JUSQU'AU MÉNAGE.** En base, `totehms.totehm_visibility =
'members'` VEUT DIRE « VISIBLE TO MY SUBSCRIBERS » (la contrainte ne se
remplace pas sans `drop`) : toute lecture teste `in ('subscribers','members')`,
toute écriture passe par `_vis_shared()` (la valeur que la contrainte
accepte). Et `spot_plans.shield` porte LOCATION ; `mode`/`shield` d'un Spot
PRIVATE sont inertes ('silent', 'off'), jamais rendus. Les colonnes
`capacity`, `access`, `selection`, `venue`, `kind` restent, inertes.

| | la règle | où elle vit |
|---|---|---|
| Totehm d'un autre | lisible si `subscribers` ET abonné vivant de CE créateur | `_shared_with_me` (les politiques de `totehms`, `objectives`, `visions`, `wisdom`) ; la politique « subscribers read » est supprimée |
| l'offre | ouverte si prix + versement + ON + Totehm visible aux abonnés | `_offer_open` ; `creator_offer` (service_role) sans FIGHER ; `creator-subscribe` en `interval: year` |
| chercher un Totehm | par NOM seulement ; nom · offre · abonné ? | `totehm_search` (l'ancienne `search_totehms` ne rend plus que le nom) |
| un Spot | PRIVATE = le propriétaire ; SHARED·OFF = la ville ; SHARED·ON = + le point aux abonnés | `_spot_exact`, `_spot_view`, `spots_feed`, `spots_exact`, `spot_get`, `spot_create`, `spot_schedule`, `spots_list` |
| une vidéo | URL signée, seulement si le Spot est lisible | seau `moments` privé + politique `moments read readable` → `_clip_readable` |
| TotehmBot | abonnement mensuel à part, ou un accès offert | `bot_subscriptions` (RLS sans politique), `totehmbot_access()` |
| la mémoire du bot | Totehm + Spots (privés compris), faits ≠ mots, « completion » et « mood » inconnus | `_bot_memory(uuid)` (service_role) — ne dépend pas de l'abonnement |

**⚠️ LA TABLE `spots` NE PORTE PLUS QU'UNE POSITION À 0,1°** pour les Spots
de l'Espace, et un PRIVATE y est `active = false` : la politique « members
read all spots » (tout connecté) ne peut plus rien en montrer. Le point
exact vit dans `spot_plans` (RLS sans politique, lu par fonction).

**Révoquées le 01/10, supprimées par le ménage** : `spot_publish`, `moment_publish`, `spot_video_set`,
`spots_radar`, `spots_past`, `spots_globe`, `moments_feed`, `my_space`,
`spot_apply`, `spot_decide`, `spot_withdraw`, `spot_cancel`, `_exact_ok`,
`_spot_compat`, `_spot_expire`, `_spots_subscriber`, `demo_seed`,
`_demo_seed_world`, `demo_purge` (lancée avant : 42 Spots et 10 membres de
démo), `search_totehms`, `club_console`, `creator_card`.
Les 2 candidatures réelles restent en base (lues par leur auteur seul).

> La règle « le passeport FIGHER ouvre l'abonnement » (23/09) et le tableau
> « partagé non monétisé = les membres » sont DÉPASSÉS.

## ⛔ ÉTAT AU 30/09/2026 — identité, droits, propriété, marché

**⚠️ TOTEHM.COM EST L'AUTORITÉ D'IDENTITÉ — PKCE, PAS DE COOKIE PARTAGÉ.**
Un satellite ne demande plus l'email : `ssoLogin()` (snippet **v2**,
`tools/sso_snippet.js`) crée un `verifier` et un `state` dans SON
`sessionStorage`, envoie à `totehm.com/auth?client=…&challenge=…&state=…&return=/chemin`.
`/auth` frappe un code lié au défi (`sso-mint`, colonne
`sso_handoff.code_challenge`) et renvoie dans le FRAGMENT ; seul le
satellite qui garde le `verifier` peut l'échanger (`sso-redeem`).
`client` est un NOM (space · club · boutique) traduit par une table fixe ;
`return` est un CHEMIN — jamais une URL reçue (pas de redirecteur ouvert).
Silencieux : un navigateur déjà connecté ici repasse UNE fois par onglet
(`prompt=none`). Le pont `ssoVersDomaine` (17/09) reste, inchangé.

**⚠️ UN SEUL SYSTÈME DE DROITS.** « Qui suis-je · à qui suis-je abonné ·
que possède-je · à quoi ai-je droit » se répond par `_figher`,
`_subscriber_of(créateur, fan)` (la seule définition d'un abonné vivant —
`is_subscribed_to`, `_spots_subscriber`, `_exact_ok` la lisent),
`creator_page(pseudo)` et `my_entitlements()`. Aucune page ne recompose.

**⚠️ LA PROPRIÉTÉ EST UN EXEMPLAIRE, PAS UN BOOLÉEN.** `art_editions`
(une ligne par exemplaire vendu, `edition_no`) est la source ;
`art_transfers` est son histoire, **en ajout seul** (trigger) ;
`stoner_access` n'est plus qu'une PROJECTION d'accès, et un trigger frappe
l'exemplaire du THP à chaque ligne qui y entre (Stripe, cadeau, NFT). Le
**numéro FIGHER = le numéro d'exemplaire du THP**. Le THP est l'œuvre
`totehmpaper` (777 000 exemplaires) : **son prix est une ligne de
`artworks`, lue par `higher-checkout`** — plus aucun prix du THP dans une
page (le « $30 » et le « €77 » sont partis ; `.thp-price` reçoit le prix
du serveur, ou rien).

**⚠️ LE MARCHÉ NE S'ÉCRIT QUE PAR LE WEBHOOK.** Réserver (`art_primary_reserve`
/ `art_resale_reserve`, 31 min, un index unique = un acheteur à la fois)
→ Stripe Checkout (30 min, donc la réservation survit toujours à la
session) → `checkout.session.completed` → `art_settle`, idempotent sur la
session. Revente : le vendeur fixe son prix, **7 % à TOTEHM, le reste
(arrondi inférieur) au grand livre du vendeur**, versé par le virement
mensuel. Pas de Stripe Connect. Si `art_settle` échoue en base → 500
(Stripe rejoue) ; s'il répond `ok:false` (réservation expirée, déjà
vendu…) → `market_incidents` + 200 : **c'est un remboursement à la main**.
Une œuvre (hors THP) ne s'achète qu'avec un THP (`thp_required`).
**Ce qui n'existe pas, et c'est voulu** : notes, avis, likes, abonnés,
enchères, gamification.


### ⛔ LE PASSEPORT FIGHER — UNE FONCTION, DEUX CLÉS — 02/10/2026

**Wah, 02/10 : « figher.club est accessible à toute personne possédant un
TotehmPaper et au moins une Habit Box ».** `member = comp OR (thp AND
habit)` ; `habit` = la vue Habit non vide (`totehm_complete()->habits`).
L'annuel sort de la règle ; `complete`, `annual`, `trial` restent dans la
réponse (des pages déployées les lisent). L'achat d'art suit la même porte :
`art_primary_reserve`, `art_resale_reserve`, `market_view.can_buy_art`
lisent `_is_figher` (code de refus inchangé : `thp_required`) ;
`market_view.door` dit ce qui manque. Lecteurs de `member` au 02/10 :
ces trois-là, `creator_card`, `reveal_cloth`, `my_entitlements`,
`spots_radar`, `spots_past`, `moments_feed`, et les anciens
`spot_publish` / `spot_apply` / `moment_publish` (SPACE ne les appelle
plus). Migration `20261002_figher_club_luxury.sql`.

> Le texte ci-dessous (23/09) décrit l'ancienne règle à trois clés.

#### 23/09/2026 — trois clés (dépassé le 02/10)

**MASTER §11 : TOTEHM COMPLET + THP POSSÉDÉ + ANNUEL ACTIF.** Trois clés,
**une** fonction : `_figher(uuid)`. Le Club, l'Espace, la Boutique et le
bot la lisent tous ; le jour où la règle change, elle change là.

| la clé | d'où elle vient |
|---|---|
| Totehm complet | `totehm_complete()` — une boîte NON VIDE dans chacune des 5 vues (19/09) |
| THP possédé | `stoner_access`, **par email**, en minuscules des deux côtés |
| annuel actif | `subscriptions.status in ('active','trialing')` |

**⚠️ LE THP SE RECONNAÎT PAR L'EMAIL, PAS PAR L'UUID.** Le webhook écrit
`stoner_access` au paiement du TotehmPaper, **avant** que l'acheteur ait
un compte. L'email est la seule clé commune. Un membre qui a acheté le
THP avec une autre adresse que celle de son compte n'a pas de THP aux
yeux du Club — c'est le premier ticket de support à prévoir.

**⚠️ UN SEUL BOOLÉEN SORT : `member`.** La page ne recompose jamais la
règle à partir des trois morceaux : une page qui le fait finit par en
oublier un. Les trois morceaux sortent AUSSI, mais pour dire au membre
ce qui lui manque, jamais pour décider.

| fonction | pour qui | ce qu'elle rend |
|---|---|---|
| `_figher(uuid)` | `service_role` seul | le passeport de n'importe qui |
| `_is_figher(uuid)` | `service_role` seul | le booléen |
| `figher_access()` | toute page, même sans session | SON passeport + pseudo + monétisé |
| `totehmbot_access()` | toute page | même forme qu'avant, règle FIGHER |
| `club_console()` | la console | les six questions du MASTER §86, un appel |

**⚠️ TOTEHMBOT SUIT LA RÈGLE FIGHER ENTIÈRE** (MASTER §61). Avant :
annuel + complet. Maintenant : + THP. Un membre annuel sans THP perd le
bot quand la migration passe. Retour arrière : une ligne dans
`totehmbot_access`.

### ⛔ L'ARGENT EST UN GRAND LIVRE, PAS UN CALCUL — 23/09/2026

**MASTER §18-23.** 80 % au membre, 20 % à TOTEHM, jamais un virement par
abonnement, un solde qui s'accumule, un versement groupé au-dessus d'un
seuil. Zéro Stripe Connect (décision du 19/09, confirmée).

**⚠️ LE GRAND LIVRE EST LA SOURCE DE VÉRITÉ.** `member_ledger`. Jamais un
solde calculé à partir des abonnements en cours : un abonnement annulé a
quand même payé ses trois premiers mois. Et jamais un solde calculé dans
la page (MASTER §23).

**⚠️ ON CRÉDITE SUR `invoice.paid`, PAS AU CHECKOUT.** C'est la facture
qui prouve l'argent, et chaque renouvellement en produit une. Le
checkout n'ouvre que l'ACCÈS.

**⚠️ LE CRÉATEUR VIENT DE LA METADATA DE L'ABONNEMENT, PAS DE LA TABLE.**
`invoice.paid` arrive souvent AVANT `checkout.session.completed` : au
moment où l'argent est là, la ligne `creator_subscriptions` n'existe pas
encore. D'où, encore, la metadata posée en double dans
`subscription_data.metadata` (règle du 15/09) — c'est elle que le
webhook relit sur l'abonnement.

**⚠️ L'IDEMPOTENCE EST UNE CONTRAINTE, PAS UN `if`.** `unique(source,
kind)` avec `source = 'stripe:<invoice>'` : Stripe rejoue un webhook,
deux instances peuvent le recevoir en même temps, une facture ne crédite
qu'une fois. C'est la base qui le garantit.

**⚠️ LE LIVRE NE SE CORRIGE PAS, IL S'AJOUTE.** Un trigger refuse tout
UPDATE et tout DELETE. Une erreur se répare par une ligne `adjustment`.
Et `on delete restrict` sur l'utilisateur : on ne supprime pas en silence
un membre à qui l'on doit de l'argent.

**⚠️ L'ARRONDI VA À LA PLATEFORME.** La part du membre est l'entier
inférieur ; le centime restant va à TOTEHM. Brut = part membre + part
TOTEHM, au centime — c'est ce qui se vérifie.

**⚠️ UN SOLDE PAR DEVISE.** Même règle que la balance Stripe du 15/09.

**Les règles du versement sont une FONCTION** (`payout_rules()` : seuil
25 €, le 1er, 80/20) — pas des chiffres dans une page. Le versement lui-
même reste manuel : `payouts_due()` → virement → `payout_mark_paid()`,
qui écrit le versement ET sa ligne de débit dans la même transaction (un
virement sans débit ferait payer deux fois). Procédure :
`backend/README.md`.

**⚠️ ET LE WEBHOOK REND SA CHANCE À STRIPE.** `stripe_events` inscrit
l'événement AVANT de le traiter (idempotence). Si le traitement échoue et
qu'on rend 500, Stripe rejoue… et l'idempotence avale le rejeu : **la
facture n'est jamais créditée, sans un mot.** Le webhook efface donc sa
ligne `stripe_events` avant de rendre 500. *Une idempotence qui retient
les échecs transforme une panne passagère en perte définitive.*

### ⛔ L'ABONNEMENT EST À SENS UNIQUE — 23/09/2026

**MASTER §13 : Bob → Alice ne donne rien à Alice sur Bob.** Et il y avait
un trou : `totehm_visibility = 'members'` ouvrait le Totehm à **tout
membre connecté**, alors que le bouton s'appelle « Visible to my paying
followers ».

`_shared_with_me(owner)` porte la règle, et les quatre politiques de
lecture (`totehms`, `objectives`, `wisdom`, `visions`) l'appellent :

| visibilité | monétisé | qui lit |
|---|---|---|
| privé | — | le propriétaire |
| partagé | non | les membres |
| partagé | oui | **ses abonnés actifs**, et seulement si le bénéfice `totehm` est coché |

**⚠️ `security definer` OBLIGATOIRE** — la fonction est appelée DANS la
politique de `totehms` et relit `totehms` : sans lui, récursion (règle du
15/09, `is_subscribed_to`).

**⚠️ LA VISIBILITÉ SUIT L'INTERRUPTEUR** (règle du 18/09).
`monetization_set(true)` avec `totehm` → partagé ; `monetization_set(false)`
→ **privé**. Jamais l'inverse : éteindre ne doit pas ouvrir un Totehm à
tous, gratuitement et en silence. Et éteindre **n'annule personne**.

**⚠️ SEULS LES DROITS QUI EXISTENT SE VENDENT.** La contrainte accepte
`totehm · spots · higherself · totehmbot` ; `monetization_set` refuse les
deux derniers tant qu'ils ne sont pas construits.

**Trouvé au passage** : la politique de lecture des `visions` visait
`public` — donc l'anonyme. Elle vise `authenticated`, comme ses sœurs.

### ⛔ L'ACCÈS FONDATEUR EST UNE DÉCISION, PAS UN FAUX PAIEMENT — 24/09/2026

« Donne-moi tous les accès pour créer et rechercher. » On n'écrit **pas**
de fausse ligne dans `subscriptions` ou `stoner_access` : ce serait mentir
au webhook, au grand livre et aux statistiques. Un accès offert a sa
table, **`figher_comps`** (email, raison, depuis, jusqu'à), et `_figher`
la lit : `member = comp OR (les clés)` — deux depuis le 02/10. Les trois clés restent
VRAIES dans la réponse — on ne prétend pas que le Totehm est complet — et
`comp: true` dit pourquoi la porte est ouverte.

`spots_radar` teste désormais **le passeport d'abord, en un booléen**, et
ne regarde les trois clés que pour dire à un non-membre laquelle lui
manque. Avant, un membre par comp se serait vu répondre « complete my
TOTEHM ».

Retour arrière : `delete from figher_comps where email = '…'`.

### ⛔ LE PONT SSO — QUATRE DOMAINES, UNE IDENTITÉ — 17/09/2026

> **⚠️ COMPLÉTÉ LE 30/09** — la connexion d'un satellite passe par
> totehm.com (`/auth`, PKCE) : voir **LA SOURCE UNIQUE**. Le pont
> ci-dessous reste le chemin d'un domaine connecté vers un autre.

**Il n'y a toujours pas de session partagée, et il ne peut pas y en
avoir** : quatre origines, quatre `localStorage`. Ce qui existe depuis le
17/09, c'est un PONT — on ne contourne pas la frontière, on la traverse.

Le mécanisme, en cinq lignes :

1. sur le domaine A (connecté), la page demande un **code de passage** ;
2. elle redirige vers B avec le code dans le fragment ;
3. B **retire le code de l'URL avant tout autre geste**, puis l'échange ;
4. le serveur vérifie, **brûle** le code, et rend un jeton Supabase ;
5. B ouvre sa propre session avec ce jeton (`verifyOtp`).

**⚠️ CE CODE N'EST PAS UN JETON DE SESSION.** La règle « jamais un jeton
de session dans une URL » tient parce qu'un jeton de session vit des
heures et ouvre tout. Ce code vit **60 secondes**, ne sert **qu'une
fois**, n'est valable que pour **un domaine cible**, est stocké
**haché**, et n'ouvre rien par lui-même — il faut l'échanger côté
serveur. C'est un code d'autorisation. Le confondre avec une clé, ce
serait s'interdire tout SSO.

**⚠️ ON NE SIGNE PAS DE JETON À LA MAIN.** `auth.admin.generateLink`
fabrique un jeton que Supabase sait déjà vérifier, et `verifyOtp` ouvre
une session normale — avec son refresh token et sa déconnexion. Signer
soi-même un JWT, ce serait réimplémenter l'expiration, le
rafraîchissement et la révocation, et se tromper quelque part.
`generateLink` **n'envoie aucun email** : elle génère, c'est sa raison
d'être.

**Le bloc front se COPIE** (`tools/sso_snippet.js`), il ne s'importe pas
— règle du projet. Il est posé dans les sept pages qui portent une
session (plus, depuis le 23/09, `club/index`, `club/console`,
`space/index`, `boutique/streetwear` et les deux ponts `com/club/*`), et
il **bloque au niveau du module** (`await` top-level) : quand
la page lit sa session, la session est déjà là. Plafond de 2,5 s — si le
pont tousse, on continue sans session et le membre se connecte par
email. Dégradé, pas cassé.

**Quatre cibles, jamais une URL reçue** : `com` · `space` · `boutique` ·
`club`. Une page qui choisirait librement sa destination laisserait
n'importe quel site demander un code « pour lui-même ».

### ⛔ LE MODÈLE DE DONNÉES EST FERMÉ — 15/09/2026

**CINQ OBJETS, SEPT INTENTIONS. Aucune sixième catégorie, jamais.**

| l'objet | la table | ce qu'il porte en plus |
|---|---|---|
| HABITS      | `totehms.steps` (jsonb) | rythme · objectifs · répulsions |
| OBJECTIVES  | `objectives` | deadline · habitudes · **visions** |
| REPULSIONS  | `repulsions` | habitudes · **teachings** |
| VISIONS     | `visions` | — |
| TEACHINGS   | `wisdom` | **objectifs** |

**Chaque objet porte UNE OU PLUSIEURS intentions parmi les sept** —
fight · flow · enrich · love · express · focus · celebrate. La liste est
verrouillée EN BASE par une contrainte `check` sur les quatre tables, pas
seulement à l'écran : un front peut se tromper, une contrainte non. La
liste vide reste permise — un objet s'écrit avant de se qualifier, et
forcer l'intention à la création empêcherait d'écrire.

⚠️ **`is` EST LA LISTE, `i` EST LA PREMIÈRE.** Deux colonnes, une seule
vérité : `i` vaut toujours `is[1]`, et c'est `intentions_set(kind,id,is)`
qui pose les deux — jamais une écriture à la main. `i` existe parce que
le bot et la carte la lisent déjà ; la retirer voudrait dire réécrire les
deux. Même doctrine que `steps.o` face à `objective_habits` : la colonne
historique porte le premier lien, la table porte la vérité.

**Un seul verbe côté serveur pour les quatre tables** : `intentions_set`.
Le nom de table ne vient JAMAIS du client tel quel — il est traduit par
un `case` fermé, parce qu'un `format(%I)` sur une chaîne reçue laisserait
écrire dans n'importe quelle table de la base.

**Deux axes, deux langages visuels, et il ne faut pas les confondre :**
la COULEUR DE LA BOÎTE dit le TYPE (navy · bleu clair · rouge-violet) ;
le TRAIT du bord gauche dit l'INTENTION. Un objet a les deux, toujours.

**Les trois liens croisés** (`objective_visions`, `repulsion_teachings`,
`teaching_objectives`) sont des tables de jointure, jamais une colonne :
un lien qui n'en accepte qu'un finit toujours par en accepter plusieurs,
et c'est là qu'on réécrit la moitié du produit.

### `/verify` — LE REGISTRE D'AUTHENTICITÉ — architecture, 17/09/2026

Pas encore codé. Décidé, pour que le jour où on le code il n'y ait plus
qu'à écrire.

**Ce que ça doit prouver** : que telle œuvre digitale, achetée sur
`totehm.space`, appartient à telle personne. Rien de plus. Pas une
blockchain, pas un NFT : un **registre signé**, sur notre base, dont
l'URL publique est la preuve.

**La table** : `artwork_owners` — `artwork_id`, `owner_id`,
`acquired_at`, `stripe_payment_intent`, `edition` (n° sur N), `cert`
(l'empreinte). Écrite **par le webhook Stripe uniquement**, jamais par
une page : une ligne de propriété écrite côté client est une ligne
inventée.

**L'empreinte** : `sha256(artwork_id || owner_id || acquired_at || sel)`
où le sel est un secret d'Edge Function. Elle ne protège pas l'œuvre —
elle protège le REGISTRE : on peut vérifier qu'une ligne n'a pas été
retouchée sans pouvoir en fabriquer une.

**La route** : `totehm.space/verify?c=<cert>` — publique, sans session.
Elle rend l'œuvre, l'édition, la date, et le **pseudo** du propriétaire
si son Totehm est partagé, sinon rien d'autre que « vérifié ». ⚠️ Jamais
un email, jamais un identifiant : une page de vérification est une page
qu'on envoie à un tiers.

**Ce qui se décide avant d'écrire une ligne** : que se passe-t-il à la
REVENTE. Soit le certificat est immuable et une revente crée une nouvelle
ligne qui chaîne la précédente (`supersedes`), soit il n'y a pas de
revente. Tant que ce n'est pas tranché, le registre ne se code pas — un
registre qu'on doit migrer n'est plus un registre.

### LE CLUB ET LES CRÉATEURS — 15/09/2026

> **⚠️ DÉPASSÉ LE 23/09 SUR DEUX POINTS.** `figher.club` n'est plus un
> vanity URL : c'est un domaine (dossier `club/`), et `totehm.com/club`
> est un pont vers lui. Et il n'y a plus de « créateurs » : **tout membre
> FIGHER peut monétiser** (MASTER §16). Voir **⛔ FIGHER.CLUB — LA PORTE
> ET LA CONSOLE**. Ce qui reste vrai ici : la clé secrète ne touche
> jamais le navigateur, le compte vient de la session, on affiche SA
> part, la metadata voyage en double.

**`figher.club` est un VANITY URL.** Le Club vit sur
**`totehm.com/club`**, c'est-à-dire sur l'origine du Totehm : même
`localStorage`, donc **même session**. Un membre passe de son Totehm au
Club et à ses gains sans se reconnecter. Le domaine, quand il sera
acheté, sera une simple redirection 308 — on garde le nom de marque sans
payer une quatrième session.

C'est Wah qui a tranché, et c'est la bonne tranche : le nom ne demandait
pas le domaine.

#### Le split 80/20 — ⚠️ CE N'EST PLUS STRIPE QUI LE FAIT · 19/09/2026

**Le taux n'a pas bougé : 80 % au créateur, 20 % à la plateforme. La
SORTIE a bougé.** Stripe Connect est abandonné pour les créateurs — voir
**⛔ STRIPE CONNECT EST ABANDONNÉ POUR LES CRÉATEURS — 19/09/2026** plus
bas, qui fait autorité sur tout ce paragraphe. L'argent arrive entier sur
le compte de la plateforme et les 80 % partent à la main le 1er.

Et l'IBAN, lui, est bien chez nous maintenant.

#### ⚠️ LA CLÉ SECRÈTE NE TOUCHE JAMAIS LE NAVIGATEUR

Lire une balance demande la clé secrète. Une clé secrète dans un fichier
servi, c'est le compte Stripe entier — tous les créateurs, tous les
paiements — offert à qui ouvre l'inspecteur. **Quatre Edge Functions**
font les appels côté serveur ; la page ne reçoit que des NOMBRES DÉJÀ
CALCULÉS.

| fonction | ce qu'elle fait |
|---|---|
| `creator-onboard`   | crée le compte Express + un AccountLink à usage unique |
| `creator-dashboard` | balance, abonnés, MRR — lus avec `stripeAccount` |
| `creator-price`     | le prix, borné 3–500 € ici ET par la contrainte SQL |
| `creator-subscribe` | le Checkout du fan, avec le split 80/20 |

**Le compte connecté vient TOUJOURS de la session, jamais du corps de la
requête.** Sinon un créateur lirait la balance d'un autre en changeant un
identifiant, ou relierait le compte Stripe d'un autre au sien.

**`stripeAccount` n'est pas optionnel** sur `balance.retrieve` : sans cet
en-tête on renvoie la balance de la PLATEFORME à chaque influenceur — le
pire chiffre faux imaginable.

**Stripe rend une ligne PAR DEVISE.** Prendre `[0]` marche jusqu'au
premier fan qui paie en livres, puis affiche un chiffre faux sans
prévenir. On additionne par devise.

**On affiche SA part, pas le brut.** Un créateur qui lit 1 000 € et
reçoit 800 € se sent floué, même si le taux était écrit ailleurs.

**Et la metadata voyage EN DOUBLE** (`subscription_data.metadata` en plus
de celle de la session) : les événements de cycle de vie ne portent pas
la metadata du Checkout, et ce sont eux qui coupent l'accès.
Irrattrapable après coup.

#### Ce qu'un fan peut lire

`creator_subscriptions` est la jointure qui ouvre la lecture du Totehm
d'un créateur à son abonné, par `is_subscribed_to()` — `security
definer` et `stable`, sinon la politique rappelle la RLS de la table
qu'elle interroge et part en récursion.

### ⛔ LE TOTEHM EST LE PASSEPORT — 19/09/2026

**Un Totehm complet = AU MOINS UNE BOÎTE REMPLIE DANS CHACUNE DES CINQ
VUES.** Habitudes, objectifs, répulsions, sagesse, visions. Pas quatre
sur cinq. Pas « cinq boîtes ». **Cinq vues habitées.**

C'est la clé d'accès de tout l'écosystème, et c'est volontairement la
même clé partout :

| Qui | Ce qui est fermé sans Totehm complet |
|---|---|
| Créateur | TotehmBot · la monétisation |
| Abonné | la visibilité de son profil · les candidatures Spot |
| Client galerie | l'achat d'art donne un pass à vie, mais **[Get Higher] reste fermé** tant que son Totehm est vide |
| Boutique | la génération du visuel textile |

**⚠️ LA RÈGLE VIT DANS LA BASE, PAS DANS LE NAVIGATEUR** —
`totehm_complete(p_user uuid default null)`, `security definer`. Une page
peut mentir sur ce qu'elle a affiché ; la base, non. Les quatre produits
interrogent la MÊME fonction, donc ils disent tous la même chose, et le
jour où la règle change elle change une fois.

**⚠️ UNE BOÎTE VIDE NE COMPTE PAS.** Les cinq objets naissent sans texte
puis s'écrivent dedans (c'est la création optimiste : la boîte apparaît,
on tape après). Compter les LIGNES laisserait passer un Totehm de cinq
boîtes vides — exactement le contraire d'un passeport. On compte donc les
lignes **dont le texte n'est pas vide**.

**⚠️ `p_user` LIT LE TOTEHM DE N'IMPORTE QUI** — c'est nécessaire pour le
webhook et pour `creator_cercle()`. La fonction ne renvoie donc QUE des
booléens, jamais un contenu. Ça ne doit pas changer.

**Ce qu'on montre au membre qui n'y est pas encore** : `remplies` (0 à 5)
sort de la même fonction. Le calculer côté page, ce serait cinq additions
que le serveur a déjà faites.

### ⛔ STRIPE CONNECT EST ABANDONNÉ POUR LES CRÉATEURS — 19/09/2026

**Ce n'était pas un bug de code.** Les logs de la fonction rendaient les
mots de Stripe : *« You must complete your platform profile to use
Connect. »* Trois jours, tous les créateurs bloqués, et derrière ce
blocage : un KYC par créateur et un compte connecté exigé **avant le
premier euro** — pour virer 80 % à une poignée de gens **une fois par
mois**.

**La sortie est manuelle.** L'argent arrive ENTIER sur le compte de la
plateforme ; les 80 % partent à la main le 1er, vers l'IBAN ou le PayPal
que le créateur a posé dans son tiroir (`creator_payout_set`).

Dans `creator-subscribe` : **ni `transfer_data` ni
`application_fee_percent`**, et un commentaire à l'endroit exact où ils
étaient — pour que personne ne croie à un reversement automatique.
`PART_TOTEHM = 20` sert encore, mais à CALCULER ce qu'on doit, plus à
demander un partage à Stripe.

**⚠️ LES COLONNES CONNECT RESTENT** (`stripe_account_id`,
`charges_enabled`, `payouts_enabled`). Vides, elles ne coûtent rien, et
elles reprennent leur rôle le jour où Connect revient. Une colonne
effacée est une migration de retour à écrire.

**Le palier de bascule : cent créateurs.** En dessous, Connect coûte plus
de friction qu'il ne fait gagner de temps. Au-dessus, virer à la main
devient le travail d'une demi-journée par mois et Connect redevient le
bon outil. Les tables ne bougeront pas ; seule la sortie changera.

**⚠️ L'IBAN EST STOCKÉ EN CLAIR, ET C'EST ÉCRIT DANS LA MIGRATION.**
Postgres est chiffré au repos, la table est en RLS, et **la lecture ne
rend JAMAIS que les 4 derniers caractères** (`creator_cercle` →
`payout_fin`). Assez pour reconnaître le sien, pas assez pour s'en
servir. Ce n'est pas un coffre-fort : c'est un carnet d'adresses
bancaires, et il se vide le jour où Connect revient.

## Le bot — ce qui l'a fait taire seize jours, et la règle qui en sort

Trois verrous fermés sur la même porte, aucun visible seul :

1. **`push_decision` interrogeait `outcomes`**, table renommée `habit_outcomes`
   le 18/08. En PL/pgSQL, une table absente lève à l'EXÉCUTION, pas à la
   création. La fonction plantait à chaque appel, `bot-tick` recevait
   `undefined` et comptait « unknown ». Zéro erreur visible.
2. **`totehms.bot` était `false` partout** et le snapshot d'habitudes
   (`cloudSave`) le réécrivait à `false` à chaque sauvegarde.
3. **Aucune tâche pg_cron n'appelait `bot-tick`**, alors que `README.md`
   affirmait le contraire.

**LES TROIS RÈGLES QUI EN SORTENT :**

- **Après tout `rename`, grepper `pg_proc.prosrc`.** Un renommage ne suit pas
  le corps des fonctions PL/pgSQL.
- **Une erreur de RPC se journalise, toujours.** `if (!d?.send)` sans regarder
  `error` transforme une panne en statistique.
- **Un document qui affirme un comportement non vérifié est un bug.** La règle
  « vérifier avant d'affirmer » s'applique aux documents autant qu'au code.

**LE BOT N'A PAS DE VOIX — C'EST CELLE DU MEMBRE · 06/09/2026.**
Le membre doit avoir l'impression de parler à son Higher Self. Ça ne
s'obtient pas en donnant un ton au bot : ça s'obtient en le lui RETIRANT.

La règle, littérale : **le bot ne dit jamais « je ».** Il n'a pas d'avis,
pas d'encouragement, pas de conseil, pas de personnage. Chaque phrase qu'il
envoie appartient à l'une de deux catégories, et à aucune autre :
1. **les mots du membre**, cités tels qu'il les a écrits — son habitude,
   son objectif, sa répulsion, sa leçon ;
2. **un nombre ou une date** — une série, un compte, une échéance, une
   distance.

Tout le reste est du décor de mentor et se supprime. « Je n'ai pas réussi
à le poser » devient « not saved ». « C'est reparti, je reprends mes
questions » devient « resumed ». Ce n'est pas de la sécheresse : c'est ce
qui fait que le membre lit SES mots et pas ceux d'une machine.

**Ce n'est pas une IA, et ça doit rester vrai techniquement.** Le bot fait
zéro appel de modèle. `/moi`, `/tonight`, `/spots` sont du SQL. Une réponse
générée serait une voix, donc un mentor, donc l'inverse du produit — et une
facture mensuelle sur le parcours gratuit.

**Multilingue, et c'est la règle du silence qui le rend possible.** Un bot
sans voix n'a presque rien à traduire : quelques dizaines de mots, pas des
paragraphes. La langue vient de `message.from.language_code`, l'anglais est
le défaut. Les mots du membre ne se traduisent jamais — ils sont déjà dans
sa langue.

**LE BOT EST UNE SURFACE, PAS UN CANAL DE NOTIFICATION · 04/09/2026.**
Un bouton `web_app` ouvre `higherself.html` DANS la conversation. Le bot
répond aussi `/moi` (séries, consistance, ce qui attend), `/wisdom`,
`/objectif` et `/spots`.

**La mini-app et le bot lisent la MÊME fonction**, `higherself_state()`. Le
bot passe l'uuid parce qu'il n'a pas de session ; la mini-app ne passe rien
parce qu'elle en a une — et **la session gagne toujours sur l'argument**,
sinon un membre connecté lirait le Totehm d'un autre en passant son uuid.
Ne jamais recalculer une série des deux côtés : le jour où les deux
divergent, la mini-app et le bot annoncent deux chiffres différents au même
membre, le même jour.

**Le bot reste à zéro appel IA.** `/moi` est du SQL, `/tonight` est du SQL,
`/spots` est du SQL. Le gratuit reste déterministe.

**Un secret n'entre jamais dans une commande cron.** `net.http_post` avec la
clé `service_role` la laisserait en clair dans `cron.job.command` et dans chaque
dump. On passe par un jeton à usage unique créé en base : il ne quitte jamais
Postgres, et intercepté, il est déjà mort.

