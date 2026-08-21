# SYSTEM.md — état réel du système TOTEHM

**Mesuré le 19 août 2026.** Chaque chiffre vient d'une requête, pas d'une supposition.

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
  totehm.com/  →  totehm.com            acquisition, one-shot 11→76 €
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

## 2 · Figher Club — pricing officiel

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

## 3 · Conflit connu : `trips` n'existe pas

`space_master_v5.md` §52 recommande une table `trips`. **Elle n'existe pas.**

```
trips     0 ligne — la table n'existe plus
totehms   8 lignes, 25 habitudes dans steps
```

Elle a été renommée `totehms`. **`totehmBot.html` interroge encore `trips` : il
est mort, il ne charge aucune habitude pour personne.** C'est le blocage
frontend le plus urgent.

Décision : on garde `totehms`. Renommer dans l'autre sens casserait le front
sans rien apporter.

---

## 3 · Supabase — `abujjbkbbiumxrokozph` · eu-west-1

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
| `profiles` | 1 | pseudo, `telegram_id` — comptes test supprimés le 18/08 |
| `subscriptions` | 1 | **source unique de l'adhésion** — wavywah `trialing` (test) |
| `stripe_events` | 0 | idempotence webhook |
| `crew_codes` · `crew_attributions` | 0 | Crew Code, attribution définitive |
| `stoner_access` | 6 | les Fighers (achat unique, `.com`) |
| `spots` | 125 | lieux, 2 embeddings — **moteur COMPLET, prêt à brancher** |
| `bot_knowledge` | 55 | base de connaissance, embeddings |
| `totehm_clothes` | 1 | commandes Cloth · **`chapter_id`** relie au chapitre |
| `totehm_events` | 15 | ⚠️ journal **incomplet** — voir §7 |

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

### Tables de la carte — 19/08/2026

| Table | Rôle | Lignes mesurées |
|---|---|---|
| `spots` | lieux éditoriaux | 125 dont 121 actifs+publics, tous géolocalisés |
| `places` | cache Google | 0 (désactivé) |
| `places_cells` | cellules balayées, TTL 90 j | 0 |
| `places_budget` | appels Google par jour | 0 |

RLS activée sans policy sur les trois dernières : seul `service_role` y accède.

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

Par intention, dans un rayon de 4 km depuis la Praça do Comércio :
love 14 · focus 12 · express 10 · celebrate 9 · enrich 6 · fight 5 · flow 4.

#### Dette identifiée

`image_url` en pollinations.ai est une image inventée, régénérée à chaque affichage par un service gratuit sans engagement. Pour la rendre utilisable : générer une fois, stocker dans Supabase Storage, servir depuis notre domaine. Tant que ce n'est pas fait, le front ne l'affiche pas.

#### Retour arrière

- Front : `cp space/totehm.html.bak-<date> space/totehm.html`
- Google : `PLACES_ENABLED = true` dans `higher-map/index.ts`, redéployer
- Serveur : v6 ou v5 depuis l'historique Supabase

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
| `places_near(lat, lng, radius, intentions[], limit, places)` | `stable`, `security definer`. Union spots + places, tri `rank_tier, dist_m`. `earth_box` pour l'index GiST, `earth_distance` pour tronquer au cercle réel. Révoquée pour `anon` et `authenticated`. |
| `places_budget_take(max)` | incrémente le compteur du jour s'il est sous le plafond, renvoie `true` si l'appel Google est autorisé |

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

## 5 · Edge Functions

| Fonction | Ver. | `verify_jwt` | Rôle |
|---|---:|:---:|---|
| `stoner-gate` | 9 | ✅ | signe 11 URLs, bucket privé, 15 min |
| `higher-checkout` | 3 | ✅ | 5 paliers, prix **serveur**, mode `quote` |
| `stripe-webhook` | 18 | ❌ | routeur 3 flux + 4 événements, idempotence |
| `subscription-checkout` | 3 | ✅ | 7j trial, price lock, PRICE_FIGHER_YEAR |
| `autobiographiste` | 3 | ✅ | modèle premium, 8 règles, write/revise/accept |
| `bot-tick` | 3 | ❌ | cron horaire, DONE/MISSED |
| `bot-reply` | 3 | ❌ | webhook Telegram, **zéro appel IA** |
| `higher-map` | 7 | ✅ | localisation → spots DB (Google coupé, PLACES_ENABLED=false) ; filtré par `steps[].i` ; 402 sans abonnement, 403 sur une intention absente du Totehm |
| `generate_objective` | 26 | ❌ | 7 habitudes vérifiables, exclusions du profil, score 0-100 ; cache 3 couches |

`verify_jwt=false` sur les webhooks est **normal** : Stripe et Telegram n'ont pas
de JWT Supabase. La sécurité vient de la signature vérifiée dans le code.

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
| `GOOGLE_MAPS_API_KEY` | `supabase secrets` | ⚠️ **optionnelle** — sans elle, spots DB uniquement (0 appel Google) |
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

### ⚠️ Le repo et la prod divergent
Sur `main`, `higher-checkout` porte encore l'ancienne tarification
(`COHORT_MAX=777`, 17 €/29 €) alors que la production sert les cinq paliers.
**Un `deploy` aveugle depuis le repo repasserait le paywall à 17 €.**

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

### ⚠️ `spots.state_of_mind` — deux langues
`calm` (27) et `calme` (6). Pour l'affichage ça passe ; **pour du matching par
embedding, deux orthographes = deux clusters = résultat faux.**

---

## 8 · Comment vérifier

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

---

*Ce document se met à jour à chaque changement d'infrastructure.
Un document daté et faux est pire que pas de document.*
