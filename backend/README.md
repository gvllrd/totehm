# TOTEHM · backend

Socle commun aux trois domaines. **Un seul projet Supabase** sert `totehm.com`,
`totehm.space` et `higher.boutique`.

```
~/totehm/
  com/         →  totehm.com            (Vercel, Root Directory = com)
  space/       →  www.totehm.space      (Vercel, Root Directory = space)
  boutique/    →  www.higher.boutique   (Vercel, Root Directory = boutique)
  backend/     →  servi par PERSONNE    ← ce dossier
  oracle/      →  clés SSH, gitignoré
```

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

## La boucle de totehm.space

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

## ⚠️ Trois flux Stripe sur le même compte

`create-checkout` (Cloth), `higher-checkout` (l'expérience) et
`subscription-checkout` (Figher Club) créent tous des sessions.
`stripe-webhook` les reçoit **toutes**.

| `metadata.product` | Effet |
|---|---|
| `higher` | écrit dans `stoner_access` — TotehmPaper {THP}, 30 $ fixe |
| `cloth` | commande Printful |
| `subscription` | écrit dans `subscriptions` |
| *inconnu* | log, 200, **ne déclenche rien** |

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

---

## Le Figher Club — une seule adhésion

Seed / Plant / Tree ne sont plus des paliers publics. Le produit expose **un
état** : membre, ou pas.

```
PREMIER MOIS — GRATUIT
PUIS — ANNUEL
```

Le premier mois gratuit est un `trialing` Stripe : **aucune logique de dates à
maintenir de notre côté**, donc aucune dérive possible.

`my_membership()` est le seul appel dont le front a besoin. Aucune ligne = pas
membre. Un abonnement expiré, impayé ou annulé retombe **automatiquement** à
`false` : pas de tâche de nettoyage, pas d'oubli.

Les valeurs `seed`/`plant`/`tree` restent lisibles en base pour l'historique de
développement. **Elles ne sont jamais montrées à l'utilisateur.**

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
nulle part ailleurs. Apex + `www` pour les trois domaines, plus `localhost:3000`.

**Jamais de `Access-Control-Allow-Origin: '*'`** sur une fonction qui touche au
paiement ou à une donnée utilisateur.

## Sessions

Trois domaines = trois origines = trois `localStorage` = **trois sessions**.
Il n'y a pas de SSO. C'est le modèle de sécurité des navigateurs, pas une limite
de Supabase.

Le pont, le jour où un second domaine aura besoin d'un utilisateur connecté :
`auth.admin.generateLink` côté serveur → `token_hash` à usage unique et courte
durée → `verifyOtp` sur le domaine cible.
**Jamais un refresh token dans une URL.**

---

## Déployer

Les déploiements ne sont pas opérés à la main. Claude livre les commandes dans
`CLAUDE_CODE.md`, Claude Code les exécute.

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
supabase db push
```

`--no-verify-jwt` sur les webhooks : Stripe et Telegram n'ont pas de JWT
Supabase. Sans risque — la signature est vérifiée dans le code.

⚠️ **La CLI cherche `supabase/functions/<slug>` depuis le CWD.**
Depuis la racine du repo, ces commandes doivent être lancées avec
`cd backend && supabase functions deploy ...` — sinon la CLI ne trouve
pas le dossier.

⚠️ **Toujours vérifier l'état déployé avant un `deploy`.** Sur `main`,
`higher-checkout` porte encore l'ancienne tarification : un redéploiement aveugle
repasserait le paywall à 17 €.

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
sur `https://www.totehm.space/higherself` — **HigherSelf**, le Totehm entier :
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

## TotehmBot — bot unique des 3 entités

Un seul bot Telegram (`TELEGRAM_BOT_TOKEN`) sert `totehm.space`, `higher.boutique`
et `totehm.com`. **TotehmManager est abandonné.**

| Domaine | Usage |
|---|---|
| `totehm.space` | habitudes, Figher Club, autobiographie, **`/spot`** (production de contenu par les membres) |
| `higher.boutique` | curation des illustrations générées par n8n |
| `totehm.com` | à venir |

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
