# TOTEHM · backend

Socle commun aux deux domaines. **Un seul projet Supabase** sert
`totehm.space` et `higher.boutique` — c'est ce qui rend les deux
plateformes liées : même base, mêmes fonctions, même auth.

```
~/totehm/
  space/       →  www.totehm.space      (Vercel, Root Directory = space)
  boutique/    →  www.higher.boutique   (Vercel, Root Directory = boutique)
  backend/     →  servi par PERSONNE    ← ce dossier
```

⚠️ **`backend/` doit rester à la racine.** Placé dans `space/` ou
`boutique/`, Vercel le servirait publiquement : le SQL, le code des
Edge Functions et le `docker-compose.yml` deviendraient téléchargeables.

---

## Projet Supabase

```
ref     abujjbkbbiumxrokozph
region  eu-west-1
nom     get Higher
```

## Qui utilise quoi

| Table / fonction | space | boutique |
|---|---|---|
| `stoner_access` | ✅ le gate | — |
| `stoner_runs` | ✅ Low/High | — |
| `totehm_events` | ✅ le Totehm | — |
| `book_chapters` | ✅ autobiographie | ✅ mode B du Cloth |
| `totehm_clothes` | — | ✅ commandes |
| `spots` | ✅ Play the Street | ✅ Play the Street |
| `profiles`, `subscriptions` | ✅ | ✅ |
| `stoner-gate` | ✅ | — |
| `higher-checkout` | ✅ | — |
| `stripe-webhook` | ✅ Higher | ⚠️ voir plus bas |
| `create-checkout` | — | ✅ Cloth |

## ⚠️ Deux flux Stripe sur le même compte

`create-checkout` (Cloth) et `higher-checkout` (Figher Club) créent
tous deux des sessions Stripe. `stripe-webhook` reçoit **les deux**.

Il n'accorde l'accès Higher que si `metadata.product === 'higher'`.
Sans ce filtre, chaque acheteur de t-shirt recevrait l'accès Higher
gratuitement, sans que personne s'en aperçoive.

**Ne jamais retirer ce filtre.** Et toute nouvelle fonction de
checkout doit poser sa propre `metadata.product`.

---

## Ce qui reste à faire pour encaisser Higher

1. Endpoint Stripe → `https://abujjbkbbiumxrokozph.supabase.co/functions/v1/stripe-webhook`
   événement `checkout.session.completed` uniquement
2. `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`
3. Resend en SMTP custom dans Supabase Auth
   (défaut Supabase = **2 emails/heure**, les codes ne partiront pas)

Déjà en place : `STRIPE_SECRET_KEY`, les 3 Edge Functions déployées,
le bucket `stoner-method` en privé, les tables et les RPC.

---

## Secrets — où ils vivent

| Clé | Emplacement | Jamais dans git |
|---|---|---|
| `SUPABASE_ANON_KEY` | en dur dans les `.html` | — publique par nature |
| `SUPABASE_SERVICE_ROLE_KEY` | injectée par Supabase | ✅ |
| `STRIPE_SECRET_KEY` | `supabase secrets` | ✅ |
| `STRIPE_WEBHOOK_SECRET` | `supabase secrets` | ✅ |
| clés SSH Oracle | `~/totehm/oracle/` | ✅ gitignoré |
| `.env` de n8n | sur le serveur Oracle | ✅ |

Les Edge Functions lisent tout par `Deno.env.get()` — aucune valeur
n'apparaît dans le code, c'est pour ça qu'il est poussable sur un
repo public.

---

## Déployer

```bash
supabase functions deploy stoner-gate
supabase functions deploy higher-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
```

`--no-verify-jwt` sur le webhook : Stripe n'a pas de JWT Supabase.
Sans risque, la signature cryptographique est vérifiée dans le code.

Les migrations SQL se collent dans SQL Editor, ou :

```bash
supabase db push
```

---

## Les masters ne sont PAS ici

`totehm_space_master.html` et `higher_boutique_master.html` restent dans
`~/totehm_docs/`, hors du repo.

Raison : le repo GitHub est **public**. `backend/` n'est pas servi par
Vercel, mais il reste lisible sur GitHub. Les masters contiennent prix,
roadmap et unit economics — inutile de les publier.

Le `.gitignore` les exclut déjà via `*_master.html`.
