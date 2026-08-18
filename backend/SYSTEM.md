# SYSTEM.md — état réel du système TOTEHM

**Mesuré le 18 août 2026.** Chaque chiffre vient d'une requête, pas d'une supposition.

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
| `subscriptions` | 0 | **source unique de l'adhésion** |
| `stripe_events` | 0 | idempotence webhook |
| `crew_codes` · `crew_attributions` | 0 | Crew Code, attribution définitive |
| `stoner_access` | 6 | les Fighers (achat unique, `.com`) |
| `spots` | 125 | lieux, 2 embeddings — **moteur COMPLET, prêt à brancher** |
| `bot_knowledge` | 55 | base de connaissance, embeddings |
| `totehm_clothes` | 1 | commandes Cloth · **`chapter_id`** relie au chapitre |
| `totehm_events` | 15 | ⚠️ journal **incomplet** — voir §7 |

**Table morte :** `_deprecated_user_roles_20260803` — à dropper après le
3 septembre 2026.

### Higher Map — état 18/08/2026

**Ce n'est pas les spots en base. C'est Google Places + le spectre du Totehm.**

```
1. Localisation de l'utilisateur (localStorage totehm_map_pos_v1 — jamais re-demandée)
2. POST /functions/v1/higher-map → Edge Function higher-map v1
3. Si GOOGLE_MAPS_API_KEY posée : Google Places Nearby Search (rayon 1 500 m)
   Sinon : fallback spots table filtrée par intention + triée par proximité
4. Filtrage par les intentions du Totehm du membre (steps[].intention)
→ Ce que tu vois sur la Map, c'est le monde filtré par qui tu es
```

**UI :** `#hmap` dans `space/totehm.html`. Sibling de `#stage`, **jamais à l'intérieur** — `#stage` a un `transform` sur desktop qui en ferait le containing block de `position:fixed` et empêcherait le plein écran.

**Membership :** 402 si pas membre, `reason:'no_intention'` si aucune intention posée.

**Secret manquant :** `GOOGLE_MAPS_API_KEY` → sans elle, fallback spots DB actif.

La table `spots` (125 lignes, 2 embeddings) est distincte — ne pas confondre avec la Higher Map.

**Ce qui reste à faire :** MapLibre GL JS, couche romantique, cache two-step Google Places → Supabase.

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
| `higher-map` | 1 | ✅ | localisation → Google Places (si clé) ou spots DB ; filtré par intentions du Totehm |

`verify_jwt=false` sur les webhooks est **normal** : Stripe et Telegram n'ont pas
de JWT Supabase. La sécurité vient de la signature vérifiée dans le code.

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
| `GOOGLE_MAPS_API_KEY` | `supabase secrets` | ❌ **manquant** — active Google Places dans higher-map |
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
| 18/08 | Settings desktop : `#settings-nav .sn-row{display:none}` — seul `#sn-home` reste | supprimer les boutons Autobiography et Generator du panel Settings sans toucher la nav mobile |
| 18/08 | Filtre : TIME FREQUENCY → étape intention avant fermeture | sans ça, la fenêtre se fermait avant que l'utilisateur ait pu choisir une intention |
| 18/08 | `GOOGLE_MAPS_API_KEY` absente des secrets Supabase | fallback spots DB actif jusqu'à la pose de la clé |
| 18/08 | Steps format compact `{f,i,t}` — `higher-map` lisait `s.intention` → `no_intention` toujours | corrigé v4 : `s.i \|\| s.intention` |

---

*Ce document se met à jour à chaque changement d'infrastructure.
Un document daté et faux est pire que pas de document.*
