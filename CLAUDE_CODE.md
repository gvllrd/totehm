# CLAUDE_CODE.md — LOT DU 30/09/2026 · LA SOURCE UNIQUE

**Ce qui change pour le membre.** On se connecte partout par **totehm.com**
(un bouton, plus d'email demandé sur les autres domaines). On cherche un
Totehm sur **totehm.com/search**, et chaque membre a sa page de vente
**totehm.com/@nom**. **figher.club/market** vend, garde et revend l'art
(TOTEHMPAPER · QUANTUM · PLAY THE LISBON STREET, 7 % à TOTEHM à la
revente). **totehm.space** : le radar n'a plus de carte, la gauche est le
**Short-Live** (5 s filmées, un bouclier GPS), la droite la liste des
Spots. **higher.boutique/streetwear** : on ramasse d'abord une Box, puis
le vêtement.

**Ce qui est DÉJÀ fait (Claude, session cloud)** : la migration est en
base ; `sso-mint` et `sso-redeem` v6 sont déployées ; tout le code est
poussé sur la branche `claude/eloquent-faraday-lxxpli`.

**Ce qui te revient** : déployer quatre fonctions modifiées et une
nouvelle, dans l'ordre ci-dessous, vérifier Stripe en mode test, puis
fusionner la branche sur `main`.

---

## 1 · Les fichiers

```
backend/supabase/migrations/20260930_la_source_unique.sql   ← DÉJÀ APPLIQUÉE
backend/supabase/functions/stripe-webhook/index.ts          ← à déployer (1er)
backend/supabase/functions/artwork-checkout/index.ts        ← à déployer
backend/supabase/functions/market-checkout/index.ts         ← NOUVELLE, à déployer
backend/supabase/functions/higher-checkout/index.ts         ← à déployer
backend/supabase/functions/creator-subscribe/index.ts       ← à déployer
backend/supabase/functions/sso-mint · sso-redeem            ← DÉJÀ DÉPLOYÉES (v6)
com/auth.html · com/creator.html (NOUVELLES) · com/totehm.html · com/vercel.json
club/market.html (NOUVELLE) · club/index.html · club/console.html
space/index.html · space/vercel.json
boutique/streetwear.html · discover.html · discover_lisbon.html · get_higher.html
boutique/origins.html · boutique/play_lisbon_street.html
tools/sso_snippet.js (v2) · tests/browser/*.mjs
CLAUDE.md · BRAND.md · backend/SYSTEM.md · backend/README.md · CLAUDE_CODE.md
```

---

## 2 · La base — déjà appliquée, à VÉRIFIER (MCP Supabase, `execute_sql`)

```sql
select (select count(*) from public.art_editions) as exemplaires,
       (select count(*) from public.art_collections where active) as collections,
       (select price_cents||' '||currency from public.artworks where slug = 'totehmpaper') as prix_thp,
       (select count(*) from pg_proc where proname = 'spot_publish') as spot_publish,
       has_function_privilege('anon', 'public.market_view(text,text)', 'execute') as marche_public,
       (select public from storage.buckets where id = 'moments') as seau_moments;
```

**≥ 6 · 3 · `1700 usd` · 1 · true · true.** Relevé le 30/09 : identique.

---

## 3 · Déployer — DANS CET ORDRE

⚠️ **Le webhook d'abord.** Tant qu'il n'est pas déployé, un achat d'œuvre
est payé et **n'est écrit nulle part** (c'était déjà le cas avant ce lot :
la version en ligne n'a pas de cas `artwork`).

Une commande par ligne, depuis la racine du dépôt :

```bash
supabase functions deploy stripe-webhook --no-verify-jwt --workdir backend
supabase functions deploy artwork-checkout --workdir backend
supabase functions deploy market-checkout --workdir backend
supabase functions deploy higher-checkout --no-verify-jwt --workdir backend
supabase functions deploy creator-subscribe --workdir backend
```

Les drapeaux JWT reproduisent l'état en ligne (relevé le 30/09) :
`stripe-webhook` et `higher-checkout` sans vérification, les trois autres
avec.

⚠️ **`higher-checkout` change le prix du THP en ligne.** Il ne porte plus
aucun prix : il lit la ligne `artworks` `totehmpaper` — **17 $ (1 700 cents
USD)**, décision du brief du 30/09. L'ancien calcul (géographique, en
euros) disparaît. Si Wah veut un autre prix : changer la LIGNE, pas le code.

⚠️ **Le compte Stripe doit accepter l'USD** (le THP) et l'EUR (les œuvres).
Rien à cocher d'habitude pour la carte ; si le checkout du THP rend
`stripe`, regarder les logs de `higher-checkout`.

Contrôle :

```bash
supabase functions list --workdir backend
```

`market-checkout` apparaît, ACTIVE ; les quatre autres ont une version de plus.

---

## 4 · Stripe en mode TEST — le cycle complet, une fois

Avec une carte de test (`4242 4242 4242 4242`), connecté avec un compte qui
a un THP :

1. `https://www.figher.club/market?art=<slug d'une œuvre QUANTUM>` → cocher
   la case → **Buy** → payer → retour sur `/market?owned=…` : « it is mine ».
2. Dans *My collection* : poser une méthode de virement (IBAN de test),
   **List for resale** à 120 → la ligne dit « I receive €111.60 ».
3. Avec un **deuxième** compte (qui a aussi un THP) : acheter cet
   exemplaire depuis la fiche. Retour : il est à lui.

Contrôle en base :

```sql
select kind, price_cents, seller_cents, royalty_cents, currency from public.art_transfers order by created_at desc limit 3;
select kind, amount_cents, currency, source from public.member_ledger order by created_at desc limit 2;
select count(*) from public.market_incidents where resolved_at is null;
```

**primary 9000 · resale 12000 / 11160 / 840 · une ligne `earning` 11160
au vendeur (source `stripe:cs_test_…`) · 0 incident.** Si un incident
apparaît : `backend/README.md`, « Le marché — ce qui se surveille ».

---

## 5 · Fusionner et contrôler après déploiement Vercel

Fusionner `claude/eloquent-faraday-lxxpli` sur `main` (Vercel redéploie
les quatre domaines). Puis :

```bash
curl -sL https://www.totehm.com/auth | grep -c "const BUILD = '2026-09-30'"
curl -sL -o /dev/null -w "%{http_code}\n" https://www.totehm.com/@wah
curl -sL https://www.figher.club/market | grep -c "const BUILD = '2026-09-30'"
curl -sL https://www.totehm.space/ | grep -c "const BUILD = '2026-09-30'"
curl -sI https://www.totehm.space/ | grep -ci "camera=(self)"
curl -sL https://www.higher.boutique/streetwear | grep -c "BUILD='2026-09-30'"
curl -sL https://www.higher.boutique/get_higher | grep -c '\$30'
curl -sL -o /dev/null -w "backend public ? %{http_code}\n" https://www.totehm.space/backend/README.md
```

**1 · 200 · 1 · 1 · 1 · 1 · 0 · 404.**

---

## 6 · Le master (non versionné)

Dans `~/totehm/TOTEHM_MASTER.md`, §0, ajoute sous la dernière entrée :

> **0.20 · 30/09 — Une seule source, reconnectée.** totehm.com est
> l'autorité d'identité (`/auth`, code d'autorisation + PKCE, jamais un
> cookie partagé), la recherche des Totehms (`/search`) et la page de
> vente de chaque membre (`/@nom`). Un seul système de droits
> (`_subscriber_of`, `creator_page`, `my_entitlements`). La propriété est
> un exemplaire (`art_editions`) ; le THP est l'œuvre `totehmpaper`,
> 777 000 exemplaires, 17 $, et le numéro FIGHER est son numéro
> d'exemplaire. FIGHER vend, garde et revend l'art ; revente = prix du
> vendeur, 7 % à TOTEHM, le reste au grand livre, virement mensuel manuel.
> totehm.space : radar sans carte ; Short-Live (moment, 5 s, bouclier GPS
> OFF = la ville / ON = le point pour mes abonnés, jamais une invitation) ;
> I will be / I am / I was here. higher.boutique : pick up the box.
> **Écarts connus** : le THP s'achète encore depuis la méthode Stoner
> (higher-checkout) ET sur le marché ; l'annulation d'un paiement dont la
> réservation a expiré est un remboursement manuel (`market_incidents`) ;
> la vidéo d'un moment est dans un seau public (URL non devinable, rendue
> aux seuls membres) ; les Spots passés (`spots_past`) restent en base
> sans écran.

Contrôle : `git -C ~/totehm check-ignore TOTEHM_MASTER.md` → `TOTEHM_MASTER.md`.

---

```bash
rm -rf ~/inbox/*
```

---

# CE QUI RESTE À WAH

## A · AUCUN CLIC DE DASHBOARD
(Le webhook Stripe écoute déjà `checkout.session.completed` et `invoice.paid`.)

## B · LES TESTS SUR TON TÉLÉPHONE (navigation privée, après la fusion)

1. **totehm.space** → *Sign in with TOTEHM* : tu passes par totehm.com
   (email + code la première fois), tu reviens connecté. Ouvre ensuite
   **figher.club** : un clignement, et tu es connecté sans rien taper.
2. **totehm.space, à gauche (Short-Live)** : touche la manette (point
   rouge) → autorise la caméra → **REC** → 5 s → choisis une habitude →
   silent → bouclier **on** → *Publish the moment*. Il apparaît en tête
   du fil, « I am here ».
3. **Le radar** : plus de rues ni de côtes, seulement les anneaux et les
   points. En haut (Create), *place it on the map* : la rue revient, là
   seulement.
4. **totehm.com/search** : cherche un nom, ouvre sa page `/@nom`.
5. **figher.club/market** : les trois collections, une fiche, *My
   collection*.
6. **higher.boutique/streetwear** : *Pick up the box* → une habitude →
   le vêtement → le nom.

Un écran vide ou un geste mort → colle ça dans la console et envoie tout :

```js
console.log(JSON.stringify({diag:(window.__totehm_space||window.__totehm_market||window.__totehm_club||window.__totehm_cloth||window.__totehm_auth||window.__totehm_creator)?.(),url:location.pathname+location.search+location.hash,appels:performance.getEntriesByType('resource').filter(r=>r.name.includes('/rest/v1/rpc/')||r.name.includes('/functions/v1/')).map(r=>r.name.split('?')[0].split('/').pop()+' '+Math.round(r.duration)+'ms')},null,2))
```
