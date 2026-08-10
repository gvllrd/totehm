# TOTEHM · backend

Socle commun aux deux domaines. **Un seul projet Supabase** sert
`totehm.space` et `higher.boutique` — c'est ce qui rend les deux
plateformes liées : même base, mêmes fonctions, même auth.

    ~/totehm/
      space/       →  www.totehm.space      (Vercel, Root Directory = space)
      boutique/    →  www.higher.boutique   (Vercel, Root Directory = boutique)
      backend/     →  servi par PERSONNE    ← ce dossier

⚠️ **`backend/` doit rester à la racine.** Placé dans `space/` ou
`boutique/`, Vercel le servirait publiquement : le SQL, le code des
Edge Functions et le `docker-compose.yml` deviendraient téléchargeables.

---

## Projet Supabase

    ref     abujjbkbbiumxrokozph
    region  eu-west-1
    nom     get Higher

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

## Lien Printful — totehm_cloth_support

Chaque support a deux colonnes Printful :

| Colonne | Type | Rôle |
|---|---|---|
| `printful_product_id` | BIGINT | ID du produit dans le store Printful |
| `printful_variant_map` | JSONB | `{ "S": { variant_id, sync_variant_id, retail_price }, … }` |

Le **Workflow D (n8n)** lit `printful_variant_map[cloth.size].sync_variant_id`
pour construire le payload `POST /orders` vers Printful.

Le fichier brodé (`embroidery_back_center`) est l'artwork généré par Replicate
(`cloth.artwork_print_url`). Le logo Higher sur le devant est configuré
directement dans le store Printful — il n'est pas renvoyé à chaque commande.

Actuellement mappé :
- **Heavyweight Crewneck** → store product `455053848` (Champion S149, Black, S/M/L/XL/2XL)

---

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

## Déployer (Via Claude Code)

Les déploiements et migrations ne sont plus opérés manuellement.
Claude (CTO) conçoit l'architecture et livre les commandes dans un fichier `CLAUDE_CODE.md`.
Claude Code exécute ensuite ces commandes dans le terminal :

    supabase functions deploy stoner-gate
    supabase functions deploy higher-checkout
    supabase functions deploy stripe-webhook --no-verify-jwt
    supabase db push

---

## Le Master n'est PAS ici

Le document stratégique unique `TOTEHM_MASTER.html` vit dans `~/totehm_docs/`, hors du repo public.

**Ce fichier est maintenu par le CTO (Claude) et le COO (Gemini).** 
Conformément à la **Règle d'Or**, à chaque nouvelle livraison via le `files.zip`, le fichier Master est mis à jour pour refléter la réalité de l'infrastructure, l'avancement des chantiers (ce qui tourne / ce qui manque), et documenter les décisions. Une tâche n'est terminée que si le code et les 3 documents sont synchronisés.
---

## 🚽 Règle inbox — Chasse d'eau

Après chaque déploiement, Claude Code vide `~/inbox/` :

    rm -rf ~/inbox/*

Dernière commande de chaque `CLAUDE_CODE.md`, sans exception.
