# TOTEHM · backend


## 03/10/2026 — COM search and reviewed copies

`totehm_discover(p_q, p_scope, p_kind, p_intention, p_offset, p_limit)` returns `{items,total,more}`. Scopes: names / subscriptions / boxes. Public discovery contains identity and offer only; authenticated box previews use `_shared_with_me`. Exact/prefix/substring names precede trigram suggestions; accents and case normalized, @profile links accepted, literal box words, pagination 12 (clamped 1–24), up to 3 box hits per result. Kind h/t/r/w/v and the existing seven intentions filter boxes.

`totehm_import_boxes(p_pseudo, p_selection)` accepts 1–50 `{kind,key}` references, never content from the browser. It checks current access, validates the complete selection before touching destination, locks the member's tree, creates or reuses own boxes and remaps only links whose endpoints were selected. Source boxes and locations/history remain untouched. Result `{ok,created,reused,total}`; `why=access/changed/signin` is an explicit refusal. Retry is safe even after an uncertain response. `my_box_sources()` returns only the viewer's copy provenance.

Migration `20261003155911_search_and_box_import.sql` applied once as `search_and_box_import`, journal `20261003164312`; helpers and copy ledger are inaccessible to anon/auth directly, ledger RLS deliberately has no policies. Existing visibility/subscription, annual creator price and 80/20 rules remain authoritative. Regression test `tests/sql/totehm_discovery_selftest.sql` ends with `TOTEHM DISCOVERY SELFTEST (rolled back): FAIL={}`; fixtures/imports are rolled back. UI suite `tests/browser/com_discovery.mjs` covers search → reader → review → import and logout.

Rollback of the UI: restore the two COM HTML files from the parent commit. Keep the additive backend and any members' own copied boxes; do not rerun the migration or delete members' content.

## 03/10/2026 — COM My spaces

`public.my_spaces(p_before timestamptz, p_before_id uuid, p_limit integer)` reads only published `spot_plans` owned by `auth.uid()`, private or shared, without a time-history cutoff. It returns `ok`, `spaces`, `more`; each space has id, Habit, visibility, start/end, place/city. No coordinates, video, creator content or legacy applications. Paging: starts_at DESC + spot_id DESC, limit clamped 1–100. Existing user/starts_at index supports owner access. SECURITY DEFINER with empty search_path, all references qualified; EXECUTE authenticated only.

Migration `20261003105748_my_spaces.sql` applied once (journal 20261003105748, name my_spaces). Do not reactivate the revoked legacy `my_space`. COM uses existing SSO to SPACE `?spot=id`; `spot_get` and Bunny keep their current authorization. GO from the city feed also rechecks `spot_get` at use time.

Checks: `tests/sql/my_spaces_selftest.sql` is read-only and self-rolls back; expected `FAIL={}`. Browser `spaces_ui.mjs` tests forms, mobile plan/radar stacking, sheets, GO, actual Coral names and history/SSO, with mocked accounts and network. The existing paper, SPACE navigation, Bunny portrait and performance suites remain applicable.

Socle commun aux quatre domaines. **Un seul projet Supabase** sert
`totehm.com`, `figher.club`, `totehm.space` et `higher.boutique`, et **un seul
webhook Stripe** route sur `metadata.product`.

```
~/totehm/
  com/         →  www.totehm.com        LA SOURCE — le Totehm, la Map, HigherSelf
  club/        →  www.figher.club       adhésion · droits · abonnements · argent
  space/       →  www.totehm.space      les Spots — une habitude vécue à plusieurs
  boutique/    →  www.higher.boutique   le Cloth + la méthode Stoner et le THP
  backend/     →  servi par PERSONNE    ← ce dossier
  oracle/      →  clés SSH, gitignoré
```

Historique : swap des contenus `com/` ↔ `space/` le 15/09 ; Stoner et THP
partis sur `boutique/` et `club/` créé le 23/09. Le tableau qui fait foi est
dans `CLAUDE.md` (**QUATRE DOMAINES, UNE SOURCE**).

Les sections datées du 23/09 sont historiques ; l’état actuel mesuré fait foi dans `SYSTEM.md` §0.

⚠️ **`backend/` doit rester à la racine.** Dans un dossier Vercel, le SQL, les
Edge Functions et le `docker-compose.yml` deviendraient téléchargeables.

**L'état mesuré du système vit dans `SYSTEM.md`, à côté.** Ce fichier-ci explique
*pourquoi* c'est construit ainsi et *où sont les pièges*.

---

## Projet Supabase

```
ref     abujjbkbbiumxrokozph
region  eu-west-1
```

---

## La Higher Map — trois couches, un seul classement

C'est le produit. Google Maps répond *où est-ce*. Ticketmaster répond *qu'est-ce
qui est en vente*. TOTEHM répond **pourquoi ça te concerne, toi, ce soir**.

```
   MEMBER_DROP     un membre l'a posé depuis TotehmBot        table spots
   PLACE           Google Places, cache par cellule 1 km      table places
   LIVE_EVENT      le monde  : Ticketmaster, cache 11 km      table live_events
                   la ville  : les agendas locaux, 1×/jour    même table
        |
   EMBEDDING       name + type + descriptions  (une fois, jamais deux)
        |
   COSINE          contre l'habitude PRÉCISE du membre, dans la même intention
        |
   rank_tier       0 drop humain · 1 fit fort · 2 moyen · 3 faible/sans embedding
        |
   LE RADAR        la luminosité du T EST le classement
```

**Le radar CLASSE, il ne filtre pas.** Un lieu sans embedding reste visible, en
périphérie : la carte n'a jamais de trou.

### Pourquoi Ticketmaster, et lui seul

Mesuré dans les logs edge le 03/09/2026, avant d'écrire une ligne :

| Source | État réel | Décision |
|---|---|---|
| Eventbrite | **404 à chaque requête** — API publique fermée depuis 2021, la clé était posée et l'appel partait quand même | supprimé |
| Songkick | fermée aux nouveaux comptes | supprimé |
| Meetup | plan Pro payant obligatoire | supprimé |
| **Ticketmaster Discovery** | gratuite, mondiale, 5 000 req/jour | **la couche LIVE** |

### Et la ville, alors ? — la couche LOCALE · 04/09/2026

Ticketmaster couvre le monde et **ne couvre pas le Portugal**. Le produit
tourne à Lisbonne. Une carte mondiale aveugle dans sa propre ville n'est pas
une carte mondiale.

La solution n'est PAS un adaptateur par site : un site change de HTML tous
les six mois, et on a déjà trois adaptateurs morts dans le tableau ci-dessus.
Ce qui ne change pas, ce sont les **formats**.

| Parseur | Norme | Ce qu'il lit |
|---|---|---|
| ICS | RFC 5545 | `.ics`, `?ical=1`, export Google/Apple Calendar |
| JSON-LD | schema.org/Event | le bloc `application/ld+json` d'une page |
| RSS | RSS 2.0 + `ev:` | un flux qui porte une date de DÉBUT |

Les sources sont **déclarées en base** (`live_sources`), pas codées en dur :
une salle de plus, c'est **une ligne**, zéro ligne de code. `lat`/`lng` sont
portés par la source — une salle ne bouge pas, elle n'a pas à être géocodée
mille fois.

`agenda-ingest` a trois modes : `run` (le cron, 5 h 07), `probe` (tester sans
écrire) et `discover` (chercher le flux en sondant onze chemins normalisés, et
écrire celui qui répond). `discover` existe parce que deviner ne marche pas :
les dix premières graines ont été posées à la main, les dix ont rendu 404.

**⚠️ Mesuré le 04/09/2026 : 18 sources lisboètes, 0 flux exploitable.** Le
mécanisme marche (18 assertions passent sur des chaînes réelles des trois
formats) ; la ville publie tout en HTML, à la main. C'est un problème de
terrain, pas d'ingénierie. **Ne pas le « corriger » en écrivant un scraper
HTML par site** : ça se casse au premier redesign, en silence, et il faut le
re-maintenir pour chaque site.

**Coût : zéro.** Onze requêtes HTTP par source, une fois par jour, sur des
serveurs publics.

### Le coût, calculé avant de construire

L'ancienne version appelait quatre APIs **à chaque ouverture du radar**, sans
cache ni plafond. À 1 000 membres × 10 ouvertures/jour : 40 000 appels/jour pour
un quota de 5 000. Le produit se coupait tout seul au bout d'une heure.

Aujourd'hui : **une cellule de 0,1° (~11 km), un balayage toutes les 12 h.**
Une ville = ~4 cellules = 8 appels/jour, quel que soit le nombre de membres qui
l'ouvrent. Le deuxième membre d'une ville coûte **zéro**.

Embeddings : ~20 tokens par événement NOUVEAU, une seule fois. ~1 $/mois à
1 000 membres contre 6 750 € d'ARPU. C'est ce qui sépare « voici des lieux » de
« voici TES lieux » — on ne l'économise pas.

L'adaptateur vit dans `supabase/functions/_shared/live.ts`, importé par
`higher-map` **et** `bot-reply`. Deux copies finiraient par ne plus proposer la
même soirée.

---

## La boucle du Totehm (sur totehm.com depuis le swap du 15/09/2026)

```
   LE TOTEHM            l'habitude est déposée dans le logo (totehms.steps)
        |               fréquence (33) + intention (7)
   TOTEHMBOT            "Tu l'as fait ?"
        |
   DONE / MISSED        deux taps, c'est tout
        |
   WHY ?                si MISSED — texte libre, mot pour mot
        |
   OBSTACLE RÉCURRENT   3 fois en 60 jours
        |
   REPULSION            il CHOISIT dans le corpus, ou il écrit la sienne
        |
   MÉMOIRE              persistée, une seule active par habitude
        |
   +-------------------+-------------------+
   |                                       |
   AUTOBIOGRAPHIE                      FUTUR PUSH
   (LLM, sur événement)                (template + SES mots, 0 €)
```

**`totehms.steps` est la vérité.** `totehm_events` est un journal, et il est
incomplet. **Tout ce qui décide ou raconte lit `my_habits()`**, jamais le journal.

### L'horloge — corrigée le 03/09/2026

Ce document affirmait « pg_cron l'appelle chaque heure ». **C'était faux :
aucune tâche n'existait.** Elle existe maintenant, et elle ne transporte aucun
secret :

```
pg_cron :07  →  bot_tick_arm()  →  jeton à usage unique (2 min) en base
                                →  net.http_post(bot-tick, x-tick-token)
                 bot-tick       →  bot_tick_consume(jeton) → true
                                →  push_decision() par membre
```

Le geste habituel serait de mettre la clé `service_role` dans la commande cron.
Elle y resterait en clair, lisible dans `cron.job.command`, sauvegardée dans
chaque dump, et impossible à faire tourner sans rééditer la tâche. Le jeton ne
quitte jamais Postgres, et un jeton intercepté est déjà mort.

**Se teste sans attendre l'heure ronde :**

```sql
select public.bot_tick_arm();
select status_code, content from net._http_response order by id desc limit 1;
```

### L'interrupteur

`totehms.bot` valait `false` pour tout le monde et **rien ne le passait à
`true`**. Désormais : **lier TotehmBot allume le bot** — c'est la permission, on
ne la demande pas deux fois. `/pause` et `/reprendre` dans Telegram, ou le
bouton du menu membre, l'éteignent et le rallument (`set_bot()`).

⚠️ **Le snapshot d'habitudes ne doit plus jamais écrire la colonne `bot`.**
`cloudSave()` le faisait, avec un champ qu'aucun bouton ne cochait : chaque
sauvegarde d'habitude éteignait le bot.

---

## Deux régimes de coût — la règle qui gouverne tout

**MÉCANIQUE — jamais un centime.** Compter, matcher, décider quand pousser,
détecter une récurrence, composer un rappel. Le bot fait **zéro appel IA** :
un rappel de Repulsion est un gabarit + les mots exacts de l'utilisateur, et
c'est plus fidèle qu'une génération.

**QUALITÉ — le meilleur modèle.** L'autobiographie. ~0,017 € le chapitre contre
~6,37 € net par membre : 3,8 % du revenu même avec 14 générations par mois.
Économiser ici dégrade le produit pour rien.

---

## ⚠️ Quatre flux Stripe sur le même compte

`create-checkout` (Cloth), `higher-checkout` (le THP), `subscription-checkout`
(FIGHER annuel) et `creator-subscribe` (l'abonnement d'un membre au Totehm
d'un autre) créent tous des sessions. `stripe-webhook` les reçoit **toutes**.

| `metadata.product` | Effet |
|---|---|
| `higher` | écrit dans `stoner_access` (par email) — TotehmPaper {THP}, prix servi par `higher-checkout` |
| `cloth` | commande Printful |
| `subscription` | écrit dans `subscriptions` |
| `creator_sub` | ouvre l'accès (`creator_subscriptions`) ; **l'argent s'écrit sur `invoice.paid`** → `member_ledger` (23/09) |
| `artwork` | (30/09) premier achat d'une œuvre → `art_settle` : l'exemplaire, sa ligne `art_transfers` |
| `resale` | (30/09) revente sur FIGHER → `art_settle` : la propriété change de main, 93 % au grand livre du vendeur, 7 % à TOTEHM |
| *inconnu* | log, 200, **ne déclenche rien** |

⚠️ **`invoice.paid` doit être coché sur l'endpoint du webhook** (Stripe →
Developers → Webhooks). Sinon le grand livre ne reçoit jamais rien — et rien
ne le dit.

**Règles :**
1. Un `switch` avec `default` **explicite**. Jamais un `if` : un quatrième
   produit ne doit jamais tomber dans une branche permissive.
2. Toute nouvelle fonction de checkout pose sa propre `metadata.product`.
   Sans ça, un acheteur de t-shirt reçoit l'accès Higher et personne ne le voit.
3. **Ne jamais retirer ce filtre.**

### Le piège des abonnements

`checkout.session.completed` porte la metadata.
`customer.subscription.updated`, `.deleted` et `invoice.payment_failed` **ne la
portent pas** — or ce sont eux qui coupent l'accès à l'échéance.

La metadata doit donc être posée **aussi** dans `subscription_data.metadata` à la
création du checkout. Une ligne. **Irrattrapable sur les abonnements déjà créés.**

### Idempotence

`stripe_events(event_id primary key)` + un insert en tête de webhook : si ça
conflicte, on renvoie 200 et on sort. Sans ça, un rejeu peut déclencher deux
impressions Printful.

⚠️ **Et si le traitement échoue, on efface la ligne avant de rendre 500**
(23/09). Sinon Stripe rejoue, l'insert conflicte, on rend 200 — et
l'événement n'est jamais traité. Une idempotence qui retient les échecs
transforme une panne passagère en perte définitive.

---

## FIGHER — le passeport, le grand livre, les versements · 23/09

### Le passeport

`_figher(uuid)` : **THP + une Habit Box** (02/10 ; avant : Totehm complet + THP + annuel), un booléen
`member`. Tout ce qui est premium le lit — `figher_access()` pour les pages,
`_is_figher()` dans les fonctions. Le THP se lit dans `stoner_access` **par
email** (le webhook l'écrit avant que l'acheteur ait un compte).

### Le grand livre

```
invoice.paid (creator_sub)
      ↓   metadata de L'ABONNEMENT : creator_id, fan_id
ledger_creator_invoice()
      ↓   80 % au membre (entier inférieur), 20 % à TOTEHM
member_ledger   kind='earning'   source='stripe:<invoice>'   ← unique(source, kind)
      ↓
_balances()     par devise : gagné · versé · en attente
```

- **Append-only** : un trigger refuse UPDATE et DELETE. Une erreur → une
  ligne `adjustment` (montant signé, `source='manual:<raison>'`).
- Un **remboursement Stripe n'est pas débité automatiquement** en V1 :
  écrire l'`adjustment` négatif à la main, le jour même.
- `on delete restrict` : un compte à qui l'on doit de l'argent ne se
  supprime pas en silence.

### Le versement du 1er — la procédure

Les règles vivent dans `payout_rules()` : seuil **25 €**, le **1er**, 80/20.
Elles se changent là, jamais dans une page.

**1 · Qui est dû** (éditeur SQL, rôle `service_role` — c'est la seule
lecture qui rend l'IBAN/PayPal en entier) :

```sql
select * from public.payouts_due('2026-10');
```

Un membre sous le seuil n'apparaît pas : son solde attend le mois suivant.

**2 · Le virement** — à la main, depuis la banque, vers `handle`.

**3 · L'écrire** — le versement ET sa ligne de débit, dans la même
transaction :

```sql
select public.payout_mark_paid(
  '<user_id>', 'eur', <montant_en_centimes>, '2026-10', '<référence bancaire>');
```

La fonction refuse un montant supérieur au solde. Un versement par membre,
par devise, par mois (`unique`) : un second appel pour le même mois lève.

**Palier de retour à Stripe Connect : cent membres monétisés** (décision du
19/09). Les tables ne bougeront pas ; seule la sortie changera.

### Le marché — ce qui se surveille · 30/09

Tout passe par `art_settle(session, …)`, appelé par le webhook seul
(`service_role`), idempotent sur la session Stripe. Deux issues :

- **erreur SQL** → le webhook rend 500, efface sa ligne `stripe_events`,
  Stripe rejoue. Rien à faire.
- **`ok:false`** (réservation expirée, exemplaire déjà vendu, prix changé)
  → une ligne `market_incidents` et 200. **L'acheteur a payé et n'a rien :
  c'est un remboursement à la main**, dans le dashboard Stripe, depuis la
  session nommée dans l'incident.

```sql
select id, at, kind, stripe_session, detail from public.market_incidents
 where resolved_at is null order by at desc;
-- après le remboursement :
update public.market_incidents set resolved_at = now() where id = <id>;
```

**Le prix du THP** est la ligne `artworks` `slug = 'totehmpaper'`
(`price_cents`, `currency`). Le changer là change le checkout ET toutes les
pages (elles lisent `higher-checkout` `{quote:true}`). Jamais dans une page.

**La redevance** est `art_collections.royalty_bps` (700 = 7 %), par
collection ; `resale_min_cents` / `resale_max_cents` bornent le prix
d'une revente (NULL = 1 € à 100 000 €).

**Un exemplaire offert** : une ligne `stoner_access` (source `grant`) —
le trigger frappe l'exemplaire suivant du THP. On n'écrit jamais
`art_editions` à la main.

### Le portail de facturation

`club-billing` : `action:'portal'` ouvre le portail client Stripe (carte,
factures, annulation FIGHER ; retour vers `totehm.com/console` depuis le 01/10) ; `action:'cancel_creator'` annule un abonnement
à un membre **en fin de période** (`cancel_at_period_end`), et le webhook pose
`creator_subscriptions.ending`. ⚠️ Le portail client doit être **activé**
dans Stripe (Settings → Billing → Customer portal), sinon la fonction rend
une erreur Stripe.

---

## L'Espace — un Spot, PRIVATE / SHARED · 01/10 (fait autorité sur les sections 23/09 → 30/09 plus bas)

Lues par `space/index.html` — tout le reste de l'ancien Espace est RÉVOQUÉ
(puis supprimé par `20261001_b_menage.sql`) (`spot_publish`, `moment_publish`, `spots_radar`, `spots_past`,
`spots_globe`, `moments_feed`, `my_space`, `spot_apply`/`decide`/`withdraw`/
`cancel`, `demo_seed`, `demo_purge`…) : les sections plus bas sont l'histoire.

| fonction | qui | ce qu'elle rend |
|---|---|---|
| `spot_rules()` | tous | `clip_seconds` 33 · `clip_max_bytes` 48 000 000 octets · `countdown` 3 · durée 5–720 · `max_day` 24 · `radius_km` 60 · `feed_days` 90 · `horizon_days` 90 · `max_upcoming` 10 |
| `spot_create(habit, visibility, duration_min, video, lat, lng, city, comment, mode, location)` | connecté | crée MAINTENANT ; relit l'Habit dans MON Totehm (intentions, objectifs, répulsions reliés) ; SHARED exige `location`, et `mode` si ON seulement ; vidéo dans `moments/<mon uid>/` ou référence Bunny possédée, réservée par le serveur |
| `spots_feed(lat, lng, q, intention, before, limit)` | tous, même anonyme | les SHARED déjà commencés à 60 km (positions arrondies à 0,1° des deux côtés) + les miens ; la ville, jamais le point ni une distance |
| `spot_schedule(habit, visibility, starts_at, duration_min, place, lat, lng, city, comment, mode, location)` | connecté | futur, sans vidéo obligatoire ; mêmes droits et Habit relue en base ; 10 à venir, horizon 90 jours ; ville seule (PRIVATE, SHARED·OFF) = centre de la ville |
| `spot_video_attach(spot, video)` | connecté | relie APRÈS coup un média envoyé (`bunny:<uuid>`, chemin Storage vidéo ou `.jpg` → colonne `photo`) à SON space ; possédé et libre ; idempotente ; `why` = signin · video · not_mine |
| `spot_why_set(spot, show)` | connecté | l'auteur montre ou cache le WHY · TRIGGER (textes des objectifs/répulsions du snapshot) de SON space SHARED ; `why` = signin · not_mine · empty |
| `spot_create(…, video, …)` | connecté | `video` = `bunny:<uuid>`, chemin Storage vidéo, ou photo `<uid>/<uuid>.jpg` (03/10) |
| `spots_list(q, intention, before, before_id, limit)` | tous | UNIQUEMENT les futurs lisibles ; pagination date + id ; lieu et nom exact seulement si autorisé |
| `spot_habit_context(habit)` | connecté | objectifs et répulsions reliés à SA propre Habit ; ne lit pas un autre Totehm |
| `spots_exact(q, intention)` | connecté | les miens + les SHARED·ON des créateurs dont je suis l'abonné vivant, avec `exact` |
| `spot_get(id)` | tous | un Spot, selon les mêmes droits (lien partagé) |

Chaque Spot sort de `_spot_view` : `state` (`will` · `am` · `was`) se DÉDUIT de
l'heure (starts_at puis ends_at) ; `exact` n'existe que pour `_spot_exact` (propriétaire, ou SHARED·ON
+ abonné) ; `context` seulement pour le propriétaire ; `location`
(colonne `shield`) seulement pour un SHARED, `mode` seulement si ON. La vidéo : seau
`moments` PRIVÉ, URL signée côté page, autorisée par `_clip_readable`.

**Correction du 01/10 (la plus récente)** : `space_habits()` connecté rend
les mêmes attributs de Box que COM. `space_discover(view, habit, lat, lng,
before, before_id, limit)` : NOM COMPLET, puis intentions de SA Habit si
zéro résultat lisible, curseurs/droits conservés. Aucun filtre vertical.

**Bunny Stream** : `videos` (RLS, service_role) → `video_reserve` (quota
verrouillé) → `create-bunny-upload` (JWT + getUser, signature TUS 1 h) →
binaire direct de SPACE vers video.bunnycdn.com → `bunny-video` complete
(propriétaire) → `spot_create` bunny:<UUID>. `bunny-video` playback appelle
spot_get sous le JWT du lecteur AVANT une URL HLS signée par dossier 10 min.
Hls.js 1.6.13 local si MSE/ManagedMediaSource est disponible : démarrage
selon le débit initial, puis adaptation au réseau. Sinon HLS natif
sur le master adaptatif, dans le même dossier signé. Webhook
`https://abujjbkbbiumxrokozph.supabase.co/functions/v1/bunny-webhook` : HMAC
SHA256 corps brut, v1, clé lecture seule ; relit l'API pour le statut courant.

Activation réalisée le 02/10 via `BUNNY_ACCOUNT_API_KEY` en secret Edge :
le serveur lit la bibliothèque et son Pull Zone, récupère hostname CDN,
Token Authentication Key et Read-Only API Key sans les exposer. Alternative :
secrets explicites `BUNNY_CDN_HOSTNAME`, `BUNNY_TOKEN_KEY`,
`BUNNY_READ_ONLY_API_KEY`. Ne pas confondre ces clés avec la clé d'upload.
Token Authentication des fichiers CDN ON, IP validation OFF ;
BlockNoneReferrer OFF pour les lecteurs mobiles ; aucun accès sans jeton.
Webhook URL configuré, AllowEarlyPlay ON ; résolutions 240/360/480/720/1080p
conservées, aucun niveau d'encodage payant ni changement de tarif.
La signature HLS par dossier HMAC-SHA256 était correcte : le 403 venait
du blocage sans Referer, alors que ZoneSecurityEnabled était false.
`config()` exige le jeton, la clé webhook et sa configuration. La sonde
non signée porte un Referer pour ne pas confondre hotlink et autorisation.
Une vidéo en cours d'upload ne remplace pas la vidéo prête utilisée pour la
sonde. Bibliothèque sans vidéo prête : GUID synthétique, 404 signé accepté
uniquement si 403 sans jeton. API/paramètres et sondes CDN en parallèle,
cache 60 s, diagnostics privés sans clé ni URL.
`refreshVideo()` accepte la première résolution HD >=720p disponible en
status 4 ; status 3 rend aussi les sources SD lisibles. Ne pas attendre 100 %
de toutes les résolutions pour une vidéo HD déjà jouable.
Provider confirmé bunny via le vrai `spot_rules`. Le prochain enregistrement
sur SPACE utilisera TUS direct ; les anciens fichiers Storage restent lisibles.
Test d'un nouveau Spot Bunny réel non effectué (bibliothèque vide au contrôle).
La fonction de maintenance ponctuelle est retirée fonctionnellement : HTTP 410,
aucun secret, import, appel réseau ou mutation. Aucun endpoint de test privilégié
créant des comptes n'a été déployé.

Tests backend : installer esbuild dans l'environnement de test, puis
`node tests/backend/bunny.mjs` (ou `ESBUILD_MODULE=/chemin/esbuild/lib/main.js`).
12 scénarios : signature indépendante, absence de Referer, faux positif hotlink,
webhook/clé absents, vidéo en encodage, bibliothèque vide, readiness HD/SD/échec.

**Capture / fluidité du 02/10** : `space/video-capture.mjs` demande d'abord
1080 × 1920 / 30 fps. Flux natif si ses images brutes sont déjà portrait,
sinon crop central, source paysage haute résolution seulement si nécessaire.
Pas d'adaptation d'aperçu crop-and-scale prise pour une adaptation du fichier.
Codec préféré H.264 si accepté, puis choix fluide/économe selon le matériel.
Fichier
9:16, cible 1080 × 1920 / 30 fps, même si la caméra fournit du paysage.
Aucun agrandissement artificiel d'une source faible ; son conservé. La durée
commence avec MediaRecorder.onstart, et non pendant le démarrage de
l’encodeur. Un fichier vide/illisible ne peut pas être publié. Les
lecteurs et la caméra desktop gardent un cadre 9:16. La limite 48 MB est
inférieure au plafond 50 MB de Supabase Free ; pas de changement de plan.
Migration `20261002071846_space_portrait_hd_video.sql`, appliquée en journal
`20261002072508` : videos check, video_reserve, spot_rules, bucket moments
privé. Contraintes de propriété, quotas et droits inchangés.

Le feed prépare UN clip suivant après démarrage du visible, garde au plus
trois lecteurs, sans autoplay du voisin ni rechargement de la pagination.
Un refresh de géolocalisation aux mêmes IDs/médias conserve aussi le lecteur.
Save-Data/2G : aucune anticipation. Lecteurs/signatures libérés en sortant,
en arrière-plan et au logout ; réponses obsolètes écartées. HLS signé reste
adaptatif (qualité initiale selon connexion, Full HD accessible) ; ne plus
forcer la meilleure variante sur tous les réseaux. HLS natif lit le master.
Buffer HLS suivant : 2 s visés, un segment peut dépasser ; Storage/natif :
preload metadata, simple indication que le navigateur peut ignorer.
Le radar desktop garde sa place et la boussole, animation réduite pendant
feed/caméra, sans réécrire le DOM immobile. Position/ville et upload privés
se font en parallèle après confirmation ; spot_create attend leur succès.
Encodage pending : polling 1 / 2 / 4 / 5 s, uniquement sur le clip actif.

La limite 48 MB ne rend pas l'upload instantané : 33 s à 10 Mbps + audio
représentent ≈42 MB. Le débit montant et l'encodage serveur restent des
étapes distinctes ; séparer leur mesure du temps avant première image.
__totehm_space().video fournit des compteurs locaux sans contenu membre.

Tests locaux, aucun appel réel à Bunny :
```bash
python3 tests/browser/space_video_fixtures.py
node tests/browser/space_video.mjs landscape
node tests/browser/space_video.mjs portrait
node tests/browser/space_video.mjs landscape native
node tests/browser/space_video.mjs landscape slow
node tests/browser/space_performance.mjs
SPACE_CAMERA_FIXTURE=/tmp/space-portrait-fixtures/landscape.y4m node tests/browser/space.mjs /tmp/space-portrait-ui
```
`ffmpeg`/`ffprobe` requis. Chaque test capture vraiment la caméra simulée,
reconstitue le fichier binaire envoyé en TUS, le sonde et décode une image :
1080 × 1920, audio, carré non étiré, cadre rempli. Master HLS 270 × 480,
720 × 1280 et 1080 × 1920 : première qualité selon connexion, puis ABR,
lecture native possible sans verrouillage sur la variante maximale.
space_performance : mouvement 1080p30, signature simulée 600 ms + média
150 ms, anticipation, pagination, libération ; caméra logicielle desktop.
Bunny API/CDN sont simulés ; aucun test de téléphone physique annoncé.
Auto-test complet Boxes/droits : `tests/sql/space_habits_video_selftest.sql`,
annulation volontaire, attendu FAIL={}. Les deux anciens auto-tests restent.

**Le Totehm et la console (01/10)** : `totehm_search(q, limit)` (par nom :
pseudo · offer · price_cents · subscribed), `visibility_set('private'|'subscribers')`
(écrit `_vis_shared()` : 'members' jusqu'au ménage),
`monetization_set(enabled, price_cents)` (prix PAR AN, 3 € à 1 000 €),
`creator_payout_set`, `my_console()` — un appel pour la console de
`totehm.com/console`. `creator-subscribe` : `interval: year`, retour vers
`totehm.com/@nom` (ou `/console` si `from:'console'`). `club-billing` :
retour du portail vers `totehm.com/console`.

**TotehmBot** : `bot_subscriptions` (écrit par le webhook — lot dédié,
`metadata.product = 'totehmbot'`), `totehmbot_access()`, `_bot_memory(uuid)`
(service_role) — la mémoire (Totehm + Spots, privés compris) ne dépend pas
de l'abonnement.

**Auto-test des droits** (production, annulé) : coller
`tests/sql/spots_selftest.sql` dans `execute_sql` → « SELFTEST (rolled
back): … | FAIL={} ».

## L'Espace — radar sans carte, Short-Live, bouclier · 30/09 (DÉPASSÉ le 01/10)

- `moments_feed(lat, lng, radius, limit)` — les moments des dernières
  24 h (ouvert à `anon` : QUOI ; un membre voit QUI, le contexte, la vidéo).
- `moment_publish(habit, intentions, mode, shield, lat, lng, video, city, comment)`
  — la Habit Box relue dans le Totehm de la session ; 12 par 24 h
  (`spot_rules().moment_max_day`) ; la vidéo doit être dans
  `moments/<uid>/` (`_clip_ok`).
- `spot_publish(…, p_shield, p_video, p_city)` — 19 paramètres (l'ancienne
  version à 16 est supprimée) ; `spot_video_set(spot, video)` après coup.
- `_exact_ok(créateur, lecteur, bouclier, accepté)` — la seule règle du
  point exact, lue par le radar, le passé, le fil et My space.
- Seau **public** `moments` (8 Mo, webm/mp4/mov) : insertion et
  suppression seulement dans son dossier. Public = l'URL suffit ; elle
  contient deux UUID et n'est rendue qu'aux membres.

**Egress (historique du 28/09, remplacé par le pipeline ci-dessus)** :
5 s ≈ 0,4 Mo ; une vidéo ne se charge qu'à l'écran. À 1 000
membres qui regardent 20 moments par jour : ~8 Go/jour. À surveiller dans
Supabase → Usage avant de dépasser le quota du plan.

## L'Espace — Yesterday = tous les anciens Spots · 28/09

YESTERDAY (gauche) lit **`spots_past(p_lat, p_lng, p_radius, p_q,
p_limit)`** — ouverte à `anon`, miroir passé de `spots_radar` (mêmes
règles de lecture, `past:true`, `again` = membre). Mes Spots et ceux que
j'ai rejoints (`my_space()`, inchangée) s'affichent dans le **coin
membre**, avec Cancel (`spot_cancel`), Withdraw (`spot_withdraw`), On the
map et Do it again. Au-dessus de 80 km, YESTERDAY ne lit pas le globe.

## L'Espace — Yesterday · Today · Tomorrow · 27/09

Cinq crans, et ce que chacun demande à la base :

| cran | titre | RPC |
|---|---|---|
| centre | TODAY | `spots_radar(p_when='today')` — toucher la carte = créer un Spot ici |
| haut | CREATE A SPOT | `spot_publish` (inchangé) |
| bas | SEARCH | `spots_radar(p_q, p_when, p_mode, p_intention)` — tout combinable |
| gauche | YESTERDAY | ~~`my_space()`~~ → **`spots_past()`** depuis le 28/09 (tous les anciens Spots) |
| droite | TOMORROW | `spots_radar(p_when='later')` |

My space (le coin membre) lit `my_space()` aussi : `limits`, `requests`
(accepter/refuser = `spot_decide`). Aucune nouvelle fonction.

## L'Espace — le monde, la nature d'un Spot · 26/09

Au-dessus de 80 km de portée, la page cesse de demander des Spots un par
un : elle lit **`spots_globe(p_when, p_intention, p_q, p_mode)`** (`anon`
peut l'appeler) — des cellules d'un demi-degré, avec position moyenne
(déjà publique), `n`, `live` et l'intention dominante. Aucune identité,
aucun contexte. En dessous, `spots_radar` au CENTRE DE LA VUE (plus
seulement autour de soi), rayon `spot_rules().local_radius_km` (60).

**Nature** — `spot_publish(…, p_venue)` : `public` (défaut) ou `private`.
Privé = la position publique est arrondie à ~1,1 km (`round_private`),
public à ~110 m (`round_public`). Refus `venue` si autre chose.

**Démo** : `demo_seed()` sème aussi dix Spots dans le monde
(`_demo_seed_world()`) et passe trois Spots lisboètes en privé.

**La Terre** — `space/earth.json` et `space/earth50.json` sont
régénérables depuis Natural Earth (`ne_110m_land`, `ne_50m_land`,
`ne_50m_populated_places`) : anneaux `[lng, lat, …]` à 2 décimales,
Douglas-Peucker ε = 0,03° pour le 1:50 M. **Le fond de rue** (création
seulement) vient de `tile.openstreetmap.org` : attribution obligatoire,
usage modéré (politique OSMF) — à remplacer par un fournisseur payant ou
nos tuiles si le volume monte.

## L'Espace — la manette, les fenêtres de temps, les limites · 25/09

La page se pilote par une manette à cinq crans (voir `CLAUDE.md`, « LA
MANETTE ») ; chaque cran interroge `spots_radar` à sa façon :

| cran | ce que la page envoie |
|---|---|
| centre — Live & today | `p_when = 'today'` |
| gauche — By intention | `p_intention = <une des sept>`, `p_when` nul (tout le temps) |
| droite — Tomorrow & beyond | `p_when = 'tomorrow' \| 'next7' \| 'later'`, `p_q`, `p_mode` |
| haut — Create · bas — My space | le radar du centre (`today`) |

**`spot_rules()`** — les règles d'un Spot, une fonction (`anon` peut la
lire) : `max_upcoming` (10), `capacity_min/max` (1–50),
`duration_min/max` (5–720), `horizon_days` (90). `spot_publish` les lit ;
la page aussi, pour ses bornes. **Changer une règle = changer cette
fonction, et rien d'autre.**

**`my_space()`** rend `limits: {upcoming, max_upcoming}` — ce qui reste
avant le refus `too_many`.

## L'Espace — la recherche, l'accès fondateur, la démo · 24/09

**`spots_radar(p_lat, p_lng, p_radius, p_q, p_mode, p_live, p_limit, p_when, p_intention)`**
— la v2 a neuf paramètres ; la v1 (sept) est supprimée. `p_q` est découpé
en mots, TOUS doivent se trouver. Tout le monde cherche dans l'habitude,
les intentions, les piliers, le mode, le rythme et le mood ; un membre
aussi dans le pseudo, le commentaire, les objectifs et les répulsions.
`p_when` : `now` · `today` (Lisbonne) · `week` — et depuis le 25/09
`tomorrow` · `next7` · `later` (à partir de minuit, Lisbonne ; jamais
aujourd'hui). `p_intention` : une des sept.

**Accès offert** — `figher_comps` :

```sql
insert into public.figher_comps(email, reason) values ('x@y.z', 'pourquoi');   -- ouvrir
delete from public.figher_comps where email = 'x@y.z';                           -- refermer
```

**Démo** — `service_role` seul (Claude Code, MCP) :

```sql
select public.demo_seed();    -- (re)crée 10 membres *_demo et 32 Spots à Lisbonne, à partir de maintenant
select public.demo_purge();   -- efface tout ce qui est démo, rien d'autre
```

`demo_seed()` fait aussi candidater deux membres de démo à chaque Spot à
venir d'un membre « comp » : c'est ce qui remplit ses demandes reçues.

## L'Espace — les Spots · 23/09

`spots` garde une ligne par Spot (le radar historique et HigherSelf la
lisent), à position **arrondie ~110 m**. Tout ce qui est propre à l'Espace
vit dans `spot_plans` — RLS active, **zéro politique**, donc lisible et
inscriptible **par fonction seulement** : `spot_publish` · `spots_radar` ·
`spot_apply` · `spot_withdraw` · `spot_decide` · `spot_cancel` · `my_space`.

- **Instantané** : `spot_publish` relit dans le Totehm du membre tout ce qui
  est publié ; le client n'envoie qu'une sélection.
- **Capacité** : `for update` sur la ligne du plan dans `spot_apply`,
  `spot_decide`, `spot_withdraw`.
- **Compatibilité** : `_spot_compat`, interne, trigrammes (`pg_trgm`) — seul
  le total arrondi sort. **0 €.**
- **Expiration** : `_spot_expire`, appelée par les lectures. Aucun cron.

## La Boîte — la totehmisation · 23/09

`_box_matter(user, kind, ref)` → la Box, ses intentions, ce qui lui est relié
dans les cinq vues, la palette. `my_box_matter` pour l'aperçu,
`create-checkout` pour l'instantané (`totehm_clothes.box_snapshot`). `message`
reste rempli avec le texte de la Box : c'est ce que lit n8n.
`reveal_cloth('0.nom')` — la Box derrière un Cloth, selon les droits.

---

## Le Figher Club — une seule adhésion

Seed / Plant / Tree ne sont plus des paliers publics. Le produit expose **un
état** : membre, ou pas.

```
7 JOURS — GRATUITS          (SYSTEM.md §3 ; ce fichier disait « premier mois »)
PUIS — ANNUEL
```

L'essai gratuit est un `trialing` Stripe : **aucune logique de dates à
maintenir de notre côté**, donc aucune dérive possible.

`my_membership()` est le seul appel dont le front a besoin. Aucune ligne = pas
membre. Un abonnement expiré, impayé ou annulé retombe **automatiquement** à
`false` : pas de tâche de nettoyage, pas d'oubli.

Les valeurs `seed`/`plant`/`tree` restent lisibles en base pour l'historique de
développement. **Elles ne sont jamais montrées à l'utilisateur.**

⚠️ **Du 23/09 au 02/10, l'adhésion annuelle était une des clés** de FIGHER ;
depuis le 02/10 la règle est THP + une Habit Box (voir plus haut). `my_membership()` dit si l'annuel est actif ; `_figher()`
dit si la personne est membre FIGHER. Pour un droit premium, c'est toujours
la seconde qu'on lit.

---

## Le bot — ce qui le fait taire

`push_decision()` est entièrement déterministe. **NOTHING domine** : la fonction
dit non par défaut.

```
bot_off         non activé → silence
quiet_hours     22h → 8h, fuseau du membre, passage de minuit géré
max_daily       2 par jour
min_gap         4 heures
decay           3 questions ignorées → silence une semaine
nothing_due     aucune habitude en attente
```

**Le decay est le plus important.** Un bot qui insiste quand on l'ignore se fait
bloquer, pas obéir.

**La Repulsion ne déclenche jamais un push.** Elle en change les mots — et ce
sont les mots de l'utilisateur. Zéro appel IA.

`record_push()` crée l'envoi **et** la question ouverte dans la même transaction :
les deux ne peuvent pas diverger.

---

## L'Autobiographiste

**La règle du non-mensonge, qui gouverne tout le reste :**

> L'IA ne peut inventer aucun fait.
> L'utilisateur peut en ajouter — c'est sa vie, il en est l'autorité.

Une instruction sur la **forme** est toujours obéie. Une instruction qui demande
d'affirmer un fait absent des données et non déclaré par l'utilisateur ne l'est
jamais — et le modèle **ne commente pas son refus**.

Ce que l'utilisateur déclare est persisté **avant** la génération
(`chapter_context`) : une régénération future ne le perd jamais.

**Trois modes :**
- `write` — le premier chapitre
- `revise` — une **proposition**, rien n'est écrit
- `accept` — la proposition devient le chapitre, l'ancienne est archivée

`revise` n'écrit pas : l'utilisateur voit l'avant et l'après côte à côte avant de
trancher. Sans ça, il perd le texte qu'il aimait avant d'avoir vu le nouveau.

**Le versioning est un trigger, pas du code.** Un futur développeur qui oublie de
sauvegarder ne peut pas perdre un chapitre corrigé — la base le protège.

**Un chapitre se ferme sur une décision, jamais sur un calendrier** : une
Repulsion posée, un objectif clos, une habitude lâchée, une intention déplacée —
et au moins 5 réponses. Une décision sans matière donne un chapitre vide ;
de la matière sans décision n'a pas de fin.

---

## CORS

Les origines autorisées vivent dans `supabase/functions/_shared/origins.ts` et
nulle part ailleurs. Apex + `www` pour les quatre domaines (`SITE_CLUB` =
`https://www.figher.club`), plus `localhost:3000`.

**Jamais de `Access-Control-Allow-Origin: '*'`** sur une fonction qui touche au
paiement ou à une donnée utilisateur.

## Sessions

Quatre domaines = quatre origines = quatre `localStorage` = **quatre sessions**.
Aucune n'est partagée : c'est le modèle de sécurité des navigateurs, pas une
limite de Supabase.

**Le pont existe depuis le 17/09** : `sso-mint` (session du domaine de départ →
code de passage 60 s, usage unique, haché, un domaine cible parmi `com` ·
`space` · `boutique` · `club`) → redirection avec `#sso=<code>` → le domaine
d'arrivée retire le code de l'URL, puis `sso-redeem` → `auth.admin.generateLink`
→ `verifyOtp`. Le bloc front se copie depuis `tools/sso_snippet.js`.

**Depuis le 30/09, se connecter sur un satellite passe par totehm.com**
(`/auth`) : `ssoLogin()` → défi PKCE + `state` → `sso-mint` lie le code au
défi (`sso_handoff.code_challenge`) → retour dans le fragment → `sso-redeem`
exige le `verifier`. Un code frappé avec un défi ne s'échange jamais sans
lui ; un code du pont (sans défi) s'échange comme avant.
**Jamais un refresh token dans une URL** — c'est pourquoi le « token handoff »
du MASTER (§4) n'est pas appliqué.

---

## Déployer

Les déploiements ne sont pas opérés à la main. Depuis le 30/09/2026, la
session cloud de Claude déploie elle-même (MCP Supabase `deploy_edge_function`,
avec `_shared/origins.ts` quand la fonction l'importe, et le `verify_jwt` du
tableau de `SYSTEM.md` §0). Les commandes CLI ci-dessous restent valables
depuis un terminal.

```bash
supabase functions deploy bot-tick --no-verify-jwt
supabase functions deploy bot-reply --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy autobiographiste
supabase functions deploy higher-map           # JWT vérifié — jamais --no-verify-jwt
supabase functions deploy generate_objective --no-verify-jwt
supabase functions deploy prospects --no-verify-jwt
supabase functions deploy embed-places --no-verify-jwt   # one-shot backfill
supabase functions deploy agenda-ingest --no-verify-jwt  # appelée par pg_cron
# 23/09 — JWT vérifié : les pages envoient toujours un jeton (session ou clé anon)
supabase functions deploy subscription-checkout
supabase functions deploy create-checkout
supabase functions deploy creator-price
supabase functions deploy creator-subscribe
supabase functions deploy club-billing
# 30/09 — le marché
supabase functions deploy artwork-checkout
supabase functions deploy market-checkout
supabase functions deploy higher-checkout --no-verify-jwt   # la citation du prix est lue sans session
supabase functions deploy sso-mint
supabase functions deploy sso-redeem
```

⚠️ **Pas de `supabase db push`.** L'historique des migrations du dépôt ne suit
pas celui de la base : `db push` rejouerait des fichiers déjà appliqués. Une
migration s'applique UNE fois, par l'éditeur SQL de Supabase ou par Claude via
le MCP, et le fichier du dépôt en garde la trace.

`--no-verify-jwt` sur les webhooks : Stripe et Telegram n'ont pas de JWT
Supabase. Sans risque — la signature est vérifiée dans le code.

⚠️ **La CLI cherche `supabase/functions/<slug>` depuis le CWD.**
Depuis la racine du repo, ces commandes doivent être lancées avec
`cd backend && supabase functions deploy ...` — sinon la CLI ne trouve
pas le dossier.

⚠️ **Toujours vérifier l'état déployé avant un `deploy`.** Depuis le 30/09,
`higher-checkout` ne porte plus AUCUN prix : il lit la ligne `artworks`
`totehmpaper`. Le déployer applique le prix de cette ligne (17 $ au 30/09).

---

## Les commandes de TotehmBot

| Commande | Effet | Coût |
|---|---|---|
| `/start <code>` | lie le compte, **allume le bot**, et pose le bouton qui ouvre le Totehm | 0 € |
| `/moi` | où tu en es : séries, consistance sur 30 j, ce qui attend une réponse | 0 € |
| `/tonight` | envoie ta position → événements + lieux, rangés par tes intentions, avec les liens billetterie | 0 € |
| `/spot` | pose un lieu sur la carte du Club — 7 étapes | 0 € |
| `/spots` | envoie ta position → les lieux du Club autour de toi | 0 € |
| `/wisdom <texte>` | pose une leçon dans My Wisdom, en une ligne | 0 € |
| `/objectif <texte>` | pose un objectif, en une ligne | 0 € |
| `/carte` | ouvre la Higher Map | 0 € |
| `/pause` · `/reprendre` | coupe et rallume la question quotidienne | 0 € |
| `/annuler` | abandonne le brouillon en cours | 0 € |

### Le bouton qui change tout — `web_app` · 04/09/2026

Un bouton `web_app` ouvre une page **dans** Telegram, plein écran, session
déjà là. Rien à configurer chez BotFather : la seule contrainte est le HTTPS.

C'est ce qui sépare « va sur le site » de « c'est ouvert ». Le bouton pointe
sur `https://www.totehm.com/higherself` — **HigherSelf**, le Totehm entier :
habitudes avec leur série, DONE/MISSED, leçons, objectifs, spots posés,
recherche de lieux. Telegram cesse d'être un canal de notification et devient
une **surface du produit**.

**La mini-app et le bot lisent la MÊME fonction**, `higherself_state()`. Le
bot passe l'uuid (il n'a pas de session), la mini-app ne passe rien (elle en a
une) — et la session gagne toujours, donc personne ne peut lire le Totehm d'un
autre en passant un uuid. Deux calculs de la même série finiraient par
annoncer deux chiffres différents au même membre le même jour.

**`/tonight` ne calcule AUCUN embedding.** Le radar paie ~30 tokens par
habitude pour ranger finement ; le bot rend cinq lignes et n'en a pas besoin.
Sans embedding, `live_near` et `places_near` retombent sur le tri intention +
date + distance : moins fin, gratuit, et le bot reste déterministe. La boucle
du bot est mécanique — jamais un centime.

---

## TotehmBot — bot unique, transversal

Un seul bot Telegram (`TELEGRAM_BOT_TOKEN`) sert les quatre domaines.
**TotehmManager est abandonné.** Depuis le 23/09 (une fois la migration
appliquée), `totehmbot_access()` suit la règle FIGHER entière : Totehm complet
+ THP + annuel.

| Domaine | Usage |
|---|---|
| `totehm.com` | habitudes, autobiographie, **`/spot`** (le lieu posé depuis le bot — l'ancien modèle, sans capacité ni candidature) |
| `figher.club` | l'accès au bot se lit dans la console |
| `totehm.space` | les Spots du 23/09 ne passent pas encore par le bot (Proof of Vibe = V2) |
| `higher.boutique` | curation des illustrations générées par n8n |

Les workflows n8n qui pointaient vers TotehmManager seront redirigés vers TotehmBot
au fil des itérations — pas de migration forcée, on le fait au cas par cas.

**Un seul webhook par bot.** Telegram n'en accepte qu'un. Le geste quotidien
(DONE / MISSED / WHY) et la production de spots vivent donc dans la **même**
fonction, `bot-reply`. Les séparer demanderait un second bot, donc un second
token, donc un second compte à lier — pour rien.

L'ordre des branches dans `bot-reply` n'est pas cosmétique : **le brouillon
de spot est testé AVANT le « Pourquoi ? »**. Sans cette priorité, la réponse
à une étape du spot serait enregistrée comme l'obstacle d'une habitude ratée.
Le TTL de 30 minutes sur `bot_drafts` garantit l'inverse : un brouillon
oublié n'avale pas un WHY posé une heure plus tard.

**Flow `/spot` — 7 étapes (03/09/2026)** :
`intention → activite → commentaire → lieu → quand → visibilite → energie → INSERT`

Chaque étape stocke sa valeur dans `bot_drafts.data` (jsonb). L'étape
`energie` (silent | social) a été ajoutée le 03/09 : c'est le contrat
social du drop, imposé au moment de la création. Voir `kbEnergy()` et la
branche `s:e:` dans `bot-reply/index.ts`. Un draft mid-flow au moment du
deploy re-route sans perte : l'ancien callback `s:v:` passe directement
à l'étape énergie.

---

## n8n — statut : gelé

Ni abandonné, ni développé. Workflows A→E dans `backend/n8n/workflows/`.
Le pipeline n'est pas nécessaire pour encaisser, il l'est pour scaler.
On automatise quand le manuel dépasse 5 h/semaine.
