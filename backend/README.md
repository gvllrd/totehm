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

⚠️ **`backend/` doit rester à la racine.** Placé dans un dossier Vercel, le SQL,
le code des Edge Functions et le `docker-compose.yml` deviendraient
téléchargeables.

Les trois produits sont **indépendants**. Ils partagent une base, pas des
fichiers front. `totehm.com/` ne référence jamais `space/`.

---

## Projet Supabase

```
ref     abujjbkbbiumxrokozph
region  eu-west-1
nom     get Higher
```

## Qui utilise quoi

| Table / fonction | .com | .space | .boutique |
|---|---|---|---|
| `stoner_access` | ✅ gate | ✅ gate | — |
| `stoner_runs` | ✅ | ✅ | — |
| `totehm_events` | — | ✅ le Totehm | — |
| `book_chapters` | — | ✅ autobiographie | ✅ mode B du Cloth |
| `totehm_cloth_support` | — | — | ✅ |
| `totehm_clothes` | — | — | ✅ commandes |
| `spots` | — | ✅ | ✅ |
| `profiles`, `subscriptions` | — | ✅ | ✅ |
| `stoner-gate` | ✅ | ✅ | — |
| `higher-checkout` | — | ✅ | — |
| `create-checkout` | — | — | ✅ Cloth |
| `stripe-webhook` | reçoit **tout** | | |

`subscriptions` est la **source de vérité unique** de l'état d'un tier.
`_deprecated_user_roles_20260803` est morte et sera droppée après septembre 2026.

---

## ⚠️ Trois flux Stripe sur le même compte

`create-checkout` (Cloth), `higher-checkout` (Figher Club) et, à venir,
`subscription-checkout` (MRR) créent tous des sessions Stripe.
`stripe-webhook` les reçoit **toutes**.

Le routage se fait sur `metadata.product` :

| Valeur | Flux | Effet |
|---|---|---|
| `higher` | Stoner Experience | écrit dans `stoner_access` |
| `cloth` | Totehm Cloth | déclenche la commande Printful |
| `subscription` | Plant / Tree | écrit dans `subscriptions` |

**Règles :**
1. Un `switch` avec un `default` **explicite** qui log et renvoie 200. Jamais un
   `if` : un quatrième produit ne doit jamais tomber dans une branche permissive.
2. Toute nouvelle fonction de checkout pose sa propre `metadata.product`.
   Sans ça, un acheteur de t-shirt reçoit l'accès Higher gratuitement et
   personne ne s'en aperçoit.
3. **Ne jamais retirer ce filtre.**

### Le piège des abonnements

`checkout.session.completed` porte la metadata.
`customer.subscription.updated`, `.deleted` et `invoice.payment_failed` **ne la
portent pas** — or ce sont eux qui coupent l'accès à l'échéance.

La metadata doit donc être posée **aussi** dans `subscription_data.metadata` à la
création du checkout, pour qu'elle vive sur l'objet Subscription lui-même.
Une ligne. Irrattrapable sur les abonnements déjà créés.

### Idempotence

Stripe rejoue. Une table `stripe_events(event_id primary key)` et un insert en
tête de webhook : si ça conflicte, on renvoie 200 et on sort. Sans ça, un rejeu
sur une commande Cloth peut déclencher deux impressions Printful.

---

## CORS — une seule liste

Les origines autorisées vivent dans `supabase/functions/_shared/origins.ts` et
nulle part ailleurs. Six entrées : apex + `www` pour chacun des trois domaines,
plus `http://localhost:3000` en développement.

**Jamais de `Access-Control-Allow-Origin: '*'`** sur une fonction qui touche au
paiement ou à une donnée utilisateur.

## Sessions

Trois domaines = trois origines = trois `localStorage` = **trois sessions**.
Il n'y a pas de SSO. C'est le modèle de sécurité des navigateurs, pas une limite
de Supabase.

Le pont, le jour où un second domaine aura besoin d'un utilisateur connecté :
`auth.admin.generateLink` côté serveur → `token_hash` à usage unique et courte
durée → `verifyOtp` sur le domaine cible. **Jamais un refresh token dans une URL.**

---

## Secrets — où ils vivent

| Clé | Emplacement | Jamais dans git |
|---|---|---|
| `SUPABASE_ANON_KEY` | en dur dans les `.html` | — publique par nature |
| `SUPABASE_SERVICE_ROLE_KEY` | injectée par Supabase | ✅ |
| `STRIPE_SECRET_KEY` | `supabase secrets` | ✅ |
| `STRIPE_WEBHOOK_SECRET` | `supabase secrets` | ✅ |
| `RESEND_API_KEY` | `supabase secrets` | ✅ |
| `TOTEHM_LOGO_URL` | `supabase secrets` | — |
| clés SSH Oracle | `~/totehm/oracle/` | ✅ gitignoré |
| `.env` de n8n | serveur Oracle, permissions 600 | ✅ |

Les Edge Functions lisent tout par `Deno.env.get()` — aucune valeur n'apparaît
dans le code.

---

## ⚠️ Le repo et la prod divergent

Au 14 août 2026, `higher-checkout` sur `main` contient encore l'ancienne
tarification (`COHORT_MAX=777`, 17 € / 29 €) alors que la production sert les
cinq paliers (11 → 76 €) et expose un mode `{quote:true}`.

**Toujours vérifier l'état déployé avant un `supabase functions deploy`.** Un
redéploiement aveugle depuis le repo repasserait le paywall à 17 €.

## n8n — statut : gelé

Ni abandonné, ni développé. Workflows A→E opérationnels, Workflow F (Printful
listener) construit. Stockés dans `backend/n8n/workflows/`.
Le pipeline n'est pas nécessaire pour encaisser, il l'est pour scaler.
On automatise quand le manuel dépasse 5 h/semaine.
