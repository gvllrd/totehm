# TOTEHM · backend

Socle commun aux trois domaines. **Un seul projet Supabase** sert `totehm.com`,
`totehm.space` et `higher.boutique`.

```
~/totehm/
  totehm.com/  →  totehm.com            (Vercel, Root Directory = totehm.com)
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
incomplet : 25 habitudes réelles pour 8 événements. **Tout ce qui décide ou
raconte lit `my_habits()`**, jamais le journal.

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
| `higher` | écrit dans `stoner_access` |
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
supabase db push
```

`--no-verify-jwt` sur les webhooks : Stripe et Telegram n'ont pas de JWT
Supabase. Sans risque — la signature est vérifiée dans le code.

⚠️ **Toujours vérifier l'état déployé avant un `deploy`.** Sur `main`,
`higher-checkout` porte encore l'ancienne tarification : un redéploiement aveugle
repasserait le paywall à 17 €.

---

## n8n — statut : gelé

Ni abandonné, ni développé. Workflows A→E dans `backend/n8n/workflows/`.
Le pipeline n'est pas nécessaire pour encaisser, il l'est pour scaler.
On automatise quand le manuel dépasse 5 h/semaine.
