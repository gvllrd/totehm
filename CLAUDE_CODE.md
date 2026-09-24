# CLAUDE_CODE.md — LOT DU 23/09/2026 · LE CLUB, L'ESPACE, LA BOÎTE

> ✅ **LOT APPLIQUÉ LE 23/09/2026 AU SOIR.** Migration en base, six Edge
> Functions déployées, push fait (`main → 24b2fa5`). Sept contrôles §10
> verts sur huit — `figher.club` reste à rattacher côté Vercel (section A,
> point 3). Deux clics Stripe restent à Wah (webhook `invoice.paid`,
> Customer portal). Voir `backend/SYSTEM.md` §0 pour l'état exact.

**Le MASTER ARCHITECTURE devient le système.** `figher.club` (la porte + la
console du membre), `totehm.space` (un Spot naît d'une Habit Box), la
totehmisation de `higher.boutique` depuis n'importe quelle Box, et
l'argent des membres dans un grand livre.

⚠️ **CE LOT A UN ORDRE, ET IL NE SE DISCUTE PAS : la base, puis les
fonctions, puis le push.** Les pages appellent des fonctions qui
n'existent pas encore en base. Poussées avant, elles s'affichent vides —
une RPC absente ne lève rien (règle du 16/09).

Le zip contient tout l'historique. **Ne prends que les fichiers listés
ci-dessous.**

---

## 1 · Les fichiers

```
club/index.html
club/console.html                                                    ← NOUVEAU
space/index.html                                                     ← NOUVEAU
space/vercel.json
boutique/streetwear.html
com/totehm.html
com/club/index.html
com/club/creator.html
backend/supabase/migrations/20260923_le_club_l_espace_la_boite.sql   ← NOUVEAU
backend/supabase/functions/stripe-webhook/index.ts
backend/supabase/functions/subscription-checkout/index.ts
backend/supabase/functions/create-checkout/index.ts
backend/supabase/functions/creator-price/index.ts
backend/supabase/functions/creator-subscribe/index.ts
backend/supabase/functions/club-billing/index.ts                     ← NOUVEAU
CLAUDE.md
BRAND.md
backend/SYSTEM.md
backend/README.md
CLAUDE_CODE.md
TOTEHM_MASTER.md                                   ← NOUVEAU, NON versionné
```

**Ne copie PAS `PROJECT_INSTRUCTIONS.md`** : c'est pour Wah, à coller dans
les réglages du projet claude.ai (section C plus bas). Il n'entre pas dans
le dépôt.

---

## 2 · Le contrôle AVANT de copier

**Il doit afficher vingt et un `OK`.**

```bash
grep -q "const BUILD = '2026-09-23'" ~/inbox/club/index.html && echo "OK  club/index" || echo "VIEUX  club/index"
grep -q "club_console" ~/inbox/club/console.html && echo "OK  club/console" || echo "VIEUX  club/console"
grep -q "spots_radar" ~/inbox/space/index.html && echo "OK  space/index" || echo "VIEUX  space/index"
grep -q '"cleanUrls": true' ~/inbox/space/vercel.json && echo "OK  space/vercel.json" || echo "VIEUX  space/vercel.json"
grep -q "my_box_matter" ~/inbox/boutique/streetwear.html && echo "OK  streetwear" || echo "VIEUX  streetwear"
grep -q "const BUILD='2026-09-23'" ~/inbox/com/totehm.html && echo "OK  totehm.html" || echo "VIEUX  totehm.html"
grep -q "www.figher.club/console'" ~/inbox/com/club/index.html && echo "OK  com/club/index" || echo "VIEUX  com/club/index"
grep -q "console#subscribers" ~/inbox/com/club/creator.html && echo "OK  com/club/creator" || echo "VIEUX  com/club/creator"
grep -q "ELLE N'ÉTAIT PAS EN BASE" ~/inbox/backend/supabase/migrations/20260923_le_club_l_espace_la_boite.sql && echo "OK  migration" || echo "VIEUX  migration"
grep -q "ledger_creator_invoice" ~/inbox/backend/supabase/functions/stripe-webhook/index.ts && echo "OK  stripe-webhook" || echo "VIEUX  stripe-webhook"
grep -q "preview" ~/inbox/backend/supabase/functions/subscription-checkout/index.ts && echo "OK  subscription-checkout" || echo "VIEUX  subscription-checkout"
grep -q "box_kind" ~/inbox/backend/supabase/functions/create-checkout/index.ts && echo "OK  create-checkout" || echo "VIEUX  create-checkout"
grep -q "UPSERT, PAS UPDATE" ~/inbox/backend/supabase/functions/creator-price/index.ts && echo "OK  creator-price" || echo "VIEUX  creator-price"
grep -q "creator_offer" ~/inbox/backend/supabase/functions/creator-subscribe/index.ts && echo "OK  creator-subscribe" || echo "VIEUX  creator-subscribe"
grep -q "cancel_creator" ~/inbox/backend/supabase/functions/club-billing/index.ts && echo "OK  club-billing" || echo "VIEUX  club-billing"
grep -q "QUATRE DOMAINES, UNE SOURCE" ~/inbox/CLAUDE.md && echo "OK  CLAUDE.md" || echo "VIEUX  CLAUDE.md"
grep -q "THE FOUR DOMAINS" ~/inbox/BRAND.md && echo "OK  BRAND.md" || echo "VIEUX  BRAND.md"
grep -q "LOT DU 23/09/2026 — ÉCRIT ET TESTÉ" ~/inbox/backend/SYSTEM.md && echo "OK  SYSTEM.md" || echo "VIEUX  SYSTEM.md"
grep -q "Le versement du 1er" ~/inbox/backend/README.md && echo "OK  README.md" || echo "VIEUX  README.md"
grep -q "LOT DU 23/09/2026 · LE CLUB" ~/inbox/CLAUDE_CODE.md && echo "OK  CLAUDE_CODE.md" || echo "VIEUX  CLAUDE_CODE.md"
grep -q "ARBITRAGES DU 23/09/2026" ~/inbox/TOTEHM_MASTER.md && echo "OK  TOTEHM_MASTER.md" || echo "VIEUX  TOTEHM_MASTER.md"
```

Un contrôle de plus :

```bash
grep -c "totehm.com/map" ~/inbox/space/vercel.json
```

**Zéro attendu.** La racine de `totehm.space` redirigeait vers la carte de
`totehm.com` ; elle sert maintenant l'Espace.

---

## 3 · La copie

```bash
mkdir -p ~/totehm/club ~/totehm/backend/supabase/functions/club-billing
cp ~/inbox/club/index.html ~/totehm/club/index.html
cp ~/inbox/club/console.html ~/totehm/club/console.html
cp ~/inbox/space/index.html ~/totehm/space/index.html
cp ~/inbox/space/vercel.json ~/totehm/space/vercel.json
cp ~/inbox/boutique/streetwear.html ~/totehm/boutique/streetwear.html
cp ~/inbox/com/totehm.html ~/totehm/com/totehm.html
cp ~/inbox/com/club/index.html ~/totehm/com/club/index.html
cp ~/inbox/com/club/creator.html ~/totehm/com/club/creator.html
cp ~/inbox/backend/supabase/migrations/20260923_le_club_l_espace_la_boite.sql ~/totehm/backend/supabase/migrations/20260923_le_club_l_espace_la_boite.sql
cp ~/inbox/backend/supabase/functions/stripe-webhook/index.ts ~/totehm/backend/supabase/functions/stripe-webhook/index.ts
cp ~/inbox/backend/supabase/functions/subscription-checkout/index.ts ~/totehm/backend/supabase/functions/subscription-checkout/index.ts
cp ~/inbox/backend/supabase/functions/create-checkout/index.ts ~/totehm/backend/supabase/functions/create-checkout/index.ts
cp ~/inbox/backend/supabase/functions/creator-price/index.ts ~/totehm/backend/supabase/functions/creator-price/index.ts
cp ~/inbox/backend/supabase/functions/creator-subscribe/index.ts ~/totehm/backend/supabase/functions/creator-subscribe/index.ts
cp ~/inbox/backend/supabase/functions/club-billing/index.ts ~/totehm/backend/supabase/functions/club-billing/index.ts
cp ~/inbox/CLAUDE.md ~/totehm/CLAUDE.md
cp ~/inbox/BRAND.md ~/totehm/BRAND.md
cp ~/inbox/backend/SYSTEM.md ~/totehm/backend/SYSTEM.md
cp ~/inbox/backend/README.md ~/totehm/backend/README.md
cp ~/inbox/CLAUDE_CODE.md ~/totehm/CLAUDE_CODE.md
```

**Le master** — il remplace `TOTEHM_MASTER.html`, qu'on garde en archive
(on ne jette pas un document qu'on n'a pas relu) :

```bash
sed -i.bak 's/^TOTEHM_MASTER\.html$/TOTEHM_MASTER*/' ~/totehm/.gitignore
git -C ~/totehm check-ignore TOTEHM_MASTER.md
mv -n ~/totehm/TOTEHM_MASTER.html ~/totehm/TOTEHM_MASTER_avant_2026-09-23.html
cp ~/inbox/TOTEHM_MASTER.md ~/totehm/TOTEHM_MASTER.md
```

`check-ignore` doit répondre **`TOTEHM_MASTER.md`**. S'il ne répond rien,
**arrête-toi** : le master partirait sur le dépôt public avec ses prix.
(`sed -i.bak` laisse un `.gitignore.bak` — la même commande marche sur Mac
et sur Linux grâce à lui. Ne l'ajoute pas au dépôt ; supprime-le quand tu
veux. Si `TOTEHM_MASTER.html` n'existait pas chez toi, le `mv` le dit et
c'est sans conséquence.)

---

## 4 · Aucun secret ne part avec le lot

```bash
grep -rlE "sk_live_[A-Za-z0-9]{8}|sk_test_[A-Za-z0-9]{8}|rk_live_[A-Za-z0-9]{8}|whsec_[A-Za-z0-9]{8}|re_[A-Za-z0-9]{20}" ~/inbox
git -C ~/totehm status --short
```

La première ne doit rien afficher (elle lit les fichiers du lot, les
nouveaux compris — un `git diff` ne voit pas un fichier encore non suivi).
La seconde ne doit montrer **aucun** `TOTEHM_MASTER`, aucun `oracle/`.
La clé `anon` de Supabase (`"role":"anon"`) est dans les pages exprès :
elle est publique par construction.

---

## 5 · Les commits — sans pousser

⚠️ **Jamais `git add .`** — `oracle/` contient les clés SSH.
⚠️ **Pas de `git push` avant l'étape 9.** Vercel déploie au push.

```bash
git -C ~/totehm add backend/supabase/migrations/20260923_le_club_l_espace_la_boite.sql
git -C ~/totehm commit -m "base: passeport FIGHER, grand livre des membres, lecture a sens unique, Spots, Box"
```

```bash
git -C ~/totehm add backend/supabase/functions/stripe-webhook/index.ts backend/supabase/functions/subscription-checkout/index.ts backend/supabase/functions/create-checkout/index.ts backend/supabase/functions/creator-price/index.ts backend/supabase/functions/creator-subscribe/index.ts backend/supabase/functions/club-billing/index.ts
git -C ~/totehm commit -m "fonctions: invoice.paid vers le grand livre, checkout FIGHER, Cloth depuis une Box, portail"
```

```bash
git -C ~/totehm add club/index.html club/console.html
git -C ~/totehm commit -m "figher.club: la porte et la console du membre"
```

```bash
git -C ~/totehm add space/index.html space/vercel.json
git -C ~/totehm commit -m "totehm.space: une Habit Box devient un Spot, le radar des Spots"
```

```bash
git -C ~/totehm add boutique/streetwear.html
git -C ~/totehm commit -m "higher.boutique: la totehmisation part de n importe quelle Box"
```

```bash
git -C ~/totehm add com/totehm.html com/club/index.html com/club/creator.html
git -C ~/totehm commit -m "totehm.com: le Club passe sur figher.club, les anciennes adresses deviennent des ponts"
```

```bash
git -C ~/totehm add CLAUDE.md BRAND.md backend/SYSTEM.md backend/README.md CLAUDE_CODE.md .gitignore
git -C ~/totehm commit -m "docs: quatre domaines, un seul master, le lot du 23/09"
```

---

## 6 · LA BASE — la migration, une fois

**Pas de `supabase db push`** : il rejouerait des migrations déjà en base.

**Deux chemins. Wah en choisit UN.**

- **A · Wah, dans Supabase** → SQL Editor → New query → colle le fichier
  entier → Run. Pour le copier, sur Mac :

  ```bash
  pbcopy < ~/totehm/backend/supabase/migrations/20260923_le_club_l_espace_la_boite.sql
  ```

- **B · Claude, dans la conversation claude.ai** — Wah écrit
  « applique la migration du 23/09 » : Claude l'applique par le
  connecteur Supabase et fait les contrôles ci-dessous lui-même.

**Les contrôles, dans le SQL Editor, une fois la migration passée :**

```sql
select count(*) as fonctions_du_lot from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('_figher','_is_figher','figher_access','club_console',
   'ledger_creator_invoice','payouts_due','payout_mark_paid','payout_rules','monetization_set',
   'creator_card','creator_offer','my_box_matter','reveal_cloth','spot_publish','spots_radar',
   'spot_apply','spot_withdraw','spot_decide','spot_cancel','my_space','_shared_with_me','_spot_compat');
```

**22 attendu.**

```sql
select x as fonction_appelee_par_une_page_et_absente from unnest(array[
  'bot_state','club_console','creator_card','creator_cercle','creator_payout_set','delete_my_totehm',
  'figher_access','habit_rename_links','habit_spot_set','intention_sound_set','intention_sounds',
  'monetization_set','my_box_matter','my_space','my_trips','new_bot_link_code','objective_close',
  'objective_create','objective_link','objective_rename','objective_set_target','objective_unlink',
  'objective_vision_link','objective_vision_unlink','payout_rules','pseudo_available','repulsion_create',
  'repulsion_link','repulsion_rename','repulsion_retire','repulsion_teaching_link',
  'repulsion_teaching_unlink','repulsion_unlink','reveal_cloth','search_totehms','set_bot','spot_apply',
  'spot_cancel','spot_decide','spot_publish','spot_withdraw','spots_radar','teaching_create',
  'teaching_delete','teaching_rename','totehm_complete','totehm_of','totehmbot_access','vision_create',
  'vision_delete','vision_rename']) x
where not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname = x);
```

**Zéro ligne attendue.** C'est la liste EXACTE des `sb.rpc(…)` des cinq
pages du lot. Une ligne ici = un bouton qui ne fera rien.

```sql
select has_function_privilege('anon', 'public._figher(uuid)', 'execute')          as anon_passeport_interne,
       has_function_privilege('anon', 'public.club_console()', 'execute')         as anon_console,
       has_function_privilege('authenticated', 'public.payouts_due(text)', 'execute') as membre_lit_les_iban,
       has_function_privilege('anon', 'public.spots_radar(double precision,double precision,integer,text,text,boolean,integer)', 'execute') as anon_radar;
```

**`false · false · false · true`.** Un `true` sur les trois premiers =
arrête tout et dis-le-moi.

---

## 7 · Les fonctions

```bash
supabase functions deploy stripe-webhook --no-verify-jwt --project-ref abujjbkbbiumxrokozph --workdir ~/totehm/backend
supabase functions deploy subscription-checkout --project-ref abujjbkbbiumxrokozph --workdir ~/totehm/backend
supabase functions deploy create-checkout --project-ref abujjbkbbiumxrokozph --workdir ~/totehm/backend
supabase functions deploy creator-price --project-ref abujjbkbbiumxrokozph --workdir ~/totehm/backend
supabase functions deploy creator-subscribe --project-ref abujjbkbbiumxrokozph --workdir ~/totehm/backend
supabase functions deploy club-billing --project-ref abujjbkbbiumxrokozph --workdir ~/totehm/backend
```

`--no-verify-jwt` sur le **webhook seulement** : Stripe n'a pas de JWT, la
signature est vérifiée dans le code. Les cinq autres reçoivent toujours un
jeton (la session, ou la clé anon) : on garde la vérification.

---

## 8 · Avant le push : les clics de Wah (section A plus bas)

**`invoice.paid` coché sur le webhook Stripe** et **le portail client
activé**. Sans le premier, le grand livre ne reçoit rien ; sans le second,
le bouton « Billing » de la console rend une erreur.

---

## 9 · Le push

```bash
git -C ~/totehm push
```

---

## 10 · Le contrôle après déploiement

```bash
curl -sL https://www.totehm.com/totehm | grep -c "const BUILD='2026-09-23'"
curl -sL https://www.figher.club/ | grep -c "const BUILD = '2026-09-23'"
curl -sL https://www.figher.club/console | grep -c "club_console"
curl -sL https://www.totehm.space/ | grep -c "spots_radar"
curl -sL https://www.higher.boutique/streetwear | grep -c "my_box_matter"
curl -sL -o /dev/null -w "pont totehm.com/club : %{http_code}\n" https://www.totehm.com/club
curl -sL -o /dev/null -w "backend public ? %{http_code}\n" https://www.totehm.com/backend/README.md
curl -s -o /dev/null -w "club-billing sans jeton : %{http_code}\n" -X POST https://abujjbkbbiumxrokozph.supabase.co/functions/v1/club-billing
```

**Au moins 1** pour les cinq premières · **200** pour le pont · **404**
pour le backend · **401** pour `club-billing` sans jeton.

Si `figher.club` rend 0 : le domaine ne pointe pas sur le projet du
dossier `club/` — section A, point 3.

---

## 11 · Dis-le à Claude

La prochaine conversation commence par : **« migration du 23/09
appliquée, fonctions déployées, push fait »** (ou ce qui a échoué, avec la
sortie). `SYSTEM.md` §0 passera alors au passé — tant qu'il dit « pas
encore », personne ne doit croire que c'est en ligne.

---

```bash
rm -rf ~/inbox/*
```

---

# CE QUI RESTE À WAH

## A · LES CLICS DANS UN DASHBOARD

**1 · STRIPE — l'événement du grand livre** · AVANT le push
- **Pourquoi** : l'argent d'un abonnement à un membre s'écrit quand la
  facture est payée. Sans cet événement, aucun solde ne bouge, jamais.
- **Où** : Stripe → Developers → Webhooks → l'endpoint
  `…supabase.co/functions/v1/stripe-webhook` → *Select events*.
- **Action** : cocher **`invoice.paid`** (en plus de ceux déjà cochés).
- **Attendu** : `invoice.paid` apparaît dans la liste de l'endpoint.
- **Où le stocker** : nulle part — c'est un réglage Stripe.

**2 · STRIPE — le portail client** · AVANT le push
- **Pourquoi** : « Billing » dans la console ouvre le portail Stripe (carte,
  factures, annulation). On ne réécrit pas une gestion de carte.
- **Où** : Stripe → Settings → Billing → **Customer portal**.
- **Action** : *Activate*. Autoriser : mise à jour du moyen de paiement,
  historique des factures, annulation **en fin de période**.
- **Attendu** : un lien de portail « live » existe.

**3 · VERCEL — figher.club** · à vérifier
- **Pourquoi** : le Club vit sur son domaine.
- **Où** : Vercel → le projet dont le *Root Directory* est **`club`** →
  Settings → Domains.
- **Attendu** : `www.figher.club` (et `figher.club` qui redirige vers
  `www`) attaché à **ce** projet. S'il n'existe pas de projet `club`,
  dis-le-moi : je te donne les quatre clics pour le créer.

**4 · Le navigateur garde l'ancienne redirection de totehm.space**
La racine renvoyait en 308 (permanente) vers la carte de `totehm.com` ;
un navigateur qui l'a déjà vue peut la rejouer de mémoire. Si
`totehm.space` t'envoie encore sur la carte : navigation privée, ou vider
le cache du site. Rien à faire côté serveur.

## B · LES TESTS NAVIGATEUR

**Vide le cache ou ouvre en navigation privée.** Sur chaque page, la
console te dit en trois secondes si c'est la bonne version — `build` doit
dire `2026-09-23` :

```js
(window.__totehm_club || window.__totehm_space || window.__totehm_cloth)()
```

1. **figher.club, déconnecté** — la porte : ce qu'est le Club, les trois
   clés, le prix (il vient du serveur), un seul bouton.
2. **Depuis ton Totehm (connecté), va sur le Club** — tu arrives
   **connecté**, sans retaper ton email. C'est le pont.
3. **La console** — les six blocs : ce que j'ai, à quoi j'ai accès, mes
   abonnements, mes abonnés, ce que je gagne, quand je suis payé. Si l'une
   des trois clés te manque, la console le dit et t'emmène là où elle
   s'obtient.
4. **Monétiser** — pose un prix, une méthode de virement, active. Ton
   Totehm devient lisible **par tes abonnés seulement**. Éteins : il
   redevient **privé**.
5. **totehm.space** — le radar. *Create a Spot* → ton Totehm s'ouvre en
   mode sélection sur tes habitudes → choisis-en une → le contexte → date,
   lieu, mode, capacité → publie. Il apparaît sur le radar et dans
   *My space*. Annule-le.
6. **higher.boutique/streetwear** — choisis un support → ton Totehm
   s'ouvre sur les cinq vues → prends une Box de **Vision** ou de
   **Wisdom** (pas seulement une habitude) → la matière et la palette
   apparaissent → un style → `0.nom`. Pas besoin de payer pour tester.
7. **Reveal** — dans la console, cherche le `0.nom` d'une pièce déjà
   payée : tu dois voir **la Box**, jamais l'image.

Un écran vide ou un bouton mort → colle la ligne `build` ci-dessus + ce
bloc, et envoie-moi tout d'un coup :

```js
console.log(JSON.stringify({diag:(window.__totehm_club||window.__totehm_space||window.__totehm_cloth||(()=>null))(),url:location.pathname,appels:performance.getEntriesByType('resource').filter(r=>r.name.includes('/rest/v1/rpc/')||r.name.includes('/functions/v1/')).map(r=>r.name.split('?')[0].split('/').pop()+' '+Math.round(r.duration)+'ms')},null,2))
```

## C · LES INSTRUCTIONS DU PROJET claude.ai

Les instructions du projet disent encore « trois domaines », « il n'y a
pas de SSO » et `TOTEHM_MASTER.html`. `PROJECT_INSTRUCTIONS.md` (dans le
zip, **pas** dans le dépôt) contient la version à jour : Projet TOTEHM →
réglages → Instructions → remplacer le texte → enregistrer.

## D · LES BRIEFS À FAIRE PASSER

```
[POUR DeepSeek]
CONTEXTE : TOTEHM, un seul Supabase (Postgres + RLS + Edge Functions Deno),
un seul webhook Stripe. Nouveau lot : un grand livre d'argent dû aux membres
(80/20), une lecture de Totehm réservée aux abonnés, des Spots avec
candidatures et capacité. Fichiers : la migration
backend/supabase/migrations/20260923_le_club_l_espace_la_boite.sql et les
fonctions stripe-webhook, club-billing, creator-subscribe, create-checkout.
OBJECTIF : audit de sécurité avant mise en production.
CONTRAINTES : chercher en priorité (1) une façon pour un membre de créditer
son propre solde ou de lire un IBAN, (2) une façon de lire le Totehm de
quelqu'un sans abonnement actif, (3) une façon de dépasser la capacité d'un
Spot, (4) une fonction security definer qui prendrait l'identité en
paramètre au lieu de auth.uid(), (5) un rejeu de webhook qui crédite deux fois.
ATTENDU : une liste de failles classées (critique / haute / basse), chacune
avec le scénario d'attaque en trois lignes et la ligne concernée. Pas de
recommandations générales.
```

```
[POUR Mistral]
CONTEXTE : TOTEHM permet à tout membre payant de vendre un abonnement
mensuel (3 à 500 €) à son profil. L'argent arrive sur le compte Stripe de
TOTEHM ; TOTEHM garde 20 %, reverse 80 % à la main le 1er du mois, au-delà
de 25 € de solde, sur l'IBAN ou le PayPal que le membre a donné (stocké en
base, affiché en 4 derniers caractères). Membres en UE, société au Portugal.
OBJECTIF : ce que les CGU/CGV doivent dire, et ce que la loi impose à ce
modèle.
CONTRAINTES : traiter explicitement DAC7 (déclaration des vendeurs par les
plateformes), le statut fiscal du membre qui reçoit, le remboursement d'un
abonné, la conservation de l'IBAN (RGPD), et ce qui se passe quand un membre
supprime son compte avec un solde non versé.
ATTENDU : les clauses à ajouter, en français, prêtes à coller ; et la liste
de ce qui oblige à un changement technique (par ex. une donnée à collecter
avant le premier versement).
```

```
[POUR ChatGPT]
CONTEXTE : figher.club est le club des membres de TOTEHM. Sa porte
(club/index.html) et sa console (club/console.html) ont été écrites par le
CTO ; les mots sont provisoires. Règles de marque : BRAND.md (jamais
« platform », « solution », « creators » ; « Higher » n'est jamais tapé ;
minimaliste, underground). Le MASTER donne les six questions de la console :
WHAT DO I HAVE? · WHAT CAN I ACCESS? · WHAT DO I SUBSCRIBE TO? · WHO
SUBSCRIBES TO ME? · WHAT DO I EARN? · WHEN DO I GET PAID?
OBJECTIF : la copie de la porte du Club, et une phrase de désir pour
figher.club et une pour totehm.space (BRAND.md §10).
CONTRAINTES : anglais, mots courts, aucun prix écrit (il vient du serveur),
ne jamais présenter la monétisation comme un métier de « créateur » — tout
membre peut le faire.
ATTENDU : les textes, bloc par bloc, dans l'ordre de la page.
```
