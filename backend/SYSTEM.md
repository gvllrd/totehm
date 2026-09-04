# SYSTEM.md — état réel du système TOTEHM

**Dernier relevé : 4 septembre 2026.** Chaque chiffre vient d'une requête, pas d'une supposition.

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

## 1 · Architecture documentaire

```
space_master_v5.md          totehm.space   — LOCKED, 18/08
higher_boutique_master      higher.boutique
totehm.com master           totehm.com
CLAUDE.md                   comment on construit — TRANSVERSE
backend/SYSTEM.md           ce qui existe    — TRANSVERSE (ce fichier)
backend/README.md           comment marche le backend
```

**Un master possède un domaine, et rien d'autre.** Une décision qui touche deux
domaines va dans `CLAUDE.md`, jamais dupliquée dans deux masters — c'est ce qui a
produit l'incident du SSO et celui des 70 €/79 €.

### Les trois domaines

```
~/totehm/
  com/         →  totehm.com            acquisition, TotehmPaper {THP} — Lisbonne €11+, International €77
  space/       →  www.totehm.space      le Figher Club
  boutique/    →  www.higher.boutique   le Cloth
  backend/     →  servi par PERSONNE
  oracle/      →  clés SSH, gitignoré
```

Le projet Vercel qui sert `higher.boutique` s'appelle **`totehm`** (nom
historique). Celui qui sert `totehm.space` s'appelle **`space`**. La confusion a
déjà coûté un incident — **vérifier le domaine, pas le nom**.

**Trois origines = trois `localStorage` = trois sessions. Il n'y a pas de SSO**,
et il ne peut pas y en avoir : c'est le modèle de sécurité des navigateurs.
Le compte est unique, la session ne l'est pas.

---

## 2 · totehm.com — routing Vercel (au 28/08/2026)

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
| `places_matching_habits(lat, lng, radius, habits jsonb, include_club, limit)` | **NOUVEAU 03/09/2026 · l'appelé principal du radar.** `habits` = `[{intention, text, embedding}]` calculé côté edge. Retourne places rankées par cosine similarity intra-intention, avec `rank_tier` (0=MEMBER_DROP, 1=top tercile, 2=moyen, 3=bas/sans embedding), `score` (0-1) et `matched_habit` (attribution). `security definer`, révoquée pour `anon` et `authenticated`. |
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
