# CLAUDE_CODE.md — LOT DU 24/09/2026 · TOTEHM.SPACE COCKPIT · ACCÈS FONDATEUR · DÉMO

**totehm.space devient un cockpit** : un radar au centre, trois commandes
(Search · Create · My space), le reste qui apparaît au fur et à mesure — et
les Spots affichés comme les Habit Boxes de totehm.com, au pixel. Plus :
l'accès complet de Wah (`gvallerand5@gmail.com`) par une table de comps, une
recherche par mots en base, et 32 Spots de démonstration à Lisbonne.

**Claude Code exécute TOUT** — y compris la migration (MCP Supabase). Rien
n'est demandé à Wah avant la section B (tests navigateur).

⚠️ **L'ORDRE : la base, puis le push.** La page appelle `spots_radar` avec
NEUF paramètres ; poussée avant la migration, elle appelle une fonction qui
n'existe pas encore et le radar reste vide.

Le zip contient tout l'historique. **Ne prends que les fichiers listés.**

---

## 1 · Les fichiers

```
space/index.html                                                        ← RÉÉCRIT
backend/supabase/migrations/20260924_space_cockpit_fondateur_demo.sql   ← NOUVEAU
CLAUDE.md
BRAND.md
backend/SYSTEM.md
backend/README.md
CLAUDE_CODE.md
TOTEHM_MASTER_0-15.md          ← à INSÉRER dans TOTEHM_MASTER.md (non versionné), pas à copier
```

⚠️ **Base des documents : `main` à `0b7383d`** (« phase 2 — sortir les
postmortems »). Vérifie :

```bash
git -C ~/totehm log -1 --format=%h
```

Si ce n'est PAS `0b7383d`, **ne copie pas les quatre documents à
l'aveugle** : quelqu'un a écrit dedans depuis. Fais un diff et reporte les
sections du 24/09 (repère : `24/09/2026`) dans la version courante.

---

## 2 · Le contrôle AVANT de copier — sept `OK`

```bash
grep -q "const BUILD = '2026-09-24'" ~/inbox/space/index.html && echo "OK  space/index" || echo "VIEUX  space/index"
grep -q "p_intention" ~/inbox/space/index.html && echo "OK  space/index recherche v2" || echo "VIEUX  space/index recherche"
grep -q "create table if not exists public.figher_comps" ~/inbox/backend/supabase/migrations/20260924_space_cockpit_fondateur_demo.sql && echo "OK  migration" || echo "VIEUX  migration"
grep -q "TOTEHM.SPACE EST UN COCKPIT" ~/inbox/CLAUDE.md && echo "OK  CLAUDE.md" || echo "VIEUX  CLAUDE.md"
grep -q "The cockpit — 24/09/2026" ~/inbox/BRAND.md && echo "OK  BRAND.md" || echo "VIEUX  BRAND.md"
grep -q "LOT DU 24/09/2026 — TOTEHM.SPACE COCKPIT" ~/inbox/backend/SYSTEM.md && echo "OK  SYSTEM.md" || echo "VIEUX  SYSTEM.md"
grep -q "la recherche, l'accès fondateur, la démo" ~/inbox/backend/README.md && echo "OK  README.md" || echo "VIEUX  README.md"
```

Et deux absences :

```bash
grep -c "joy-box\|data-f=\"view\"" ~/inbox/space/index.html
```

**Zéro** — la manette et la bascule radar/cartes de la version du 23/09 sont
parties.

---

## 3 · La copie

```bash
cp ~/inbox/space/index.html ~/totehm/space/index.html
cp ~/inbox/backend/supabase/migrations/20260924_space_cockpit_fondateur_demo.sql ~/totehm/backend/supabase/migrations/20260924_space_cockpit_fondateur_demo.sql
cp ~/inbox/CLAUDE.md ~/totehm/CLAUDE.md
cp ~/inbox/BRAND.md ~/totehm/BRAND.md
cp ~/inbox/backend/SYSTEM.md ~/totehm/backend/SYSTEM.md
cp ~/inbox/backend/README.md ~/totehm/backend/README.md
cp ~/inbox/CLAUDE_CODE.md ~/totehm/CLAUDE_CODE.md
```

**Le master (non versionné)** : insère le contenu de
`~/inbox/TOTEHM_MASTER_0-15.md` dans `~/totehm/TOTEHM_MASTER.md`, **juste
avant** la double ligne `---` qui précède `# MASTER ARCHITECTURE TOTEHM`
(fin du §0). Puis, dans le même fichier, ajoute sous le titre de §0.9 et de
§0.10 la ligne : `> Interface remplacée le 24/09 par le cockpit — §0.15.`
Contrôle :

```bash
grep -c "0.15 · 24/09" ~/totehm/TOTEHM_MASTER.md
git -C ~/totehm check-ignore TOTEHM_MASTER.md
```

**1**, puis **`TOTEHM_MASTER.md`** (il ne doit jamais partir sur le dépôt).

---

## 4 · Aucun secret

```bash
grep -rlE "sk_live_[A-Za-z0-9]{8}|sk_test_[A-Za-z0-9]{8}|rk_live_[A-Za-z0-9]{8}|whsec_[A-Za-z0-9]{8}|re_[A-Za-z0-9]{20}" ~/inbox
```

Rien ne doit s'afficher.

---

## 5 · LA BASE — la migration, par le MCP Supabase

Projet `abujjbkbbiumxrokozph`. **`apply_migration`** avec le nom
`20260924_space_cockpit_fondateur_demo` et le contenu EXACT du fichier.
**Pas de `supabase db push`.** La migration est idempotente et lance
elle-même `demo_seed()`.

⚠️ **Si elle échoue sur `auth.users`** (colonne absente, trigger qui crée un
profil) : ne bricole pas la table `auth`. Rapporte l'erreur exacte — la
démo s'écrira autrement.

**Les contrôles, par `execute_sql`, dans cet ordre :**

```sql
select (public._figher(u.id))->>'member' as membre, (public._figher(u.id))->>'comp' as comp
  from auth.users u where lower(u.email) = 'gvallerand5@gmail.com';
```

**`true · true`.** (Si aucune ligne : le compte de Wah n'existe pas encore
sous cet email — dis-le, ne crée rien.)

```sql
select (select count(*) from public.spot_plans where demo)                          as spots_demo,
       (select count(*) from public.demo_members)                                   as membres_demo,
       (select count(*) from auth.users where email like '%@demo.totehm.invalid')   as auth_demo,
       (select count(*) from pg_proc where proname = 'spots_radar')                 as radar_versions,
       (select pronargs from pg_proc where proname = 'spots_radar')                 as radar_args;
```

**`32 · 10 · 10 · 1 · 9`.** Deux versions de `spots_radar` = l'ancienne n'a
pas été retirée : arrête-toi.

```sql
select jsonb_array_length(public.spots_radar(38.7223, -9.1393, 20000, 'box',  null, false, 60, null, null)->'spots') as box,
       jsonb_array_length(public.spots_radar(38.7223, -9.1393, 20000, 'tiago', null, false, 60, null, null)->'spots') as pseudo_invite,
       jsonb_array_length(public.spots_radar(38.7223, -9.1393, 20000, null,   null, false, 60, 'now', null)->'spots') as live;
```

**`1 · 0 · 2`.** (Sous `execute_sql` il n'y a pas de session : c'est la vue
d'un INVITÉ — il trouve « box », il ne trouve pas un pseudo.)

```sql
select has_function_privilege('anon', 'public.demo_seed()', 'execute')       as anon_seed,
       has_function_privilege('authenticated', 'public.demo_purge()', 'execute') as membre_purge,
       has_function_privilege('anon', 'public._figher(uuid)', 'execute')        as anon_passeport,
       has_function_privilege('anon', 'public.spots_radar(double precision,double precision,integer,text,text,boolean,integer,text,text)', 'execute') as anon_radar,
       has_function_privilege('anon', 'public.my_space()', 'execute')           as anon_myspace;
```

**`false · false · false · true · false`.**

**Les advisors de sécurité** (`get_advisors`, type `security`) : aucune
alerte NOUVELLE sur `figher_comps`, `demo_members`, `spot_plans`.

Puis, dans `backend/SYSTEM.md` §0 du 24/09, **remplace le bloc « ÉTAT :
écrit et testé… »** par : `> **ÉTAT : appliqué le <date> par Claude Code —
contrôles <résultats>.**`

---

## 6 · Les commits

⚠️ **Jamais `git add .`** — `oracle/` contient les clés.

```bash
git -C ~/totehm add backend/supabase/migrations/20260924_space_cockpit_fondateur_demo.sql
git -C ~/totehm commit -m "base: acces fondateur par comps, recherche de l Espace par mots, Spots de demo"
```

```bash
git -C ~/totehm add space/index.html
git -C ~/totehm commit -m "totehm.space: le cockpit - trois commandes, les boites de totehm.com"
```

```bash
git -C ~/totehm add CLAUDE.md BRAND.md backend/SYSTEM.md backend/README.md CLAUDE_CODE.md
git -C ~/totehm commit -m "docs: l Espace est un cockpit, l acces fondateur, la demo"
```

```bash
git -C ~/totehm push
```

---

## 7 · Le contrôle après déploiement

Attends que Vercel ait déployé le projet `space` (une à deux minutes), puis :

```bash
curl -sL https://www.totehm.space/ | grep -c "const BUILD = '2026-09-24'"
curl -sL https://www.totehm.space/ | grep -c "joy-box"
curl -sL -o /dev/null -w "backend public ? %{http_code}\n" https://www.totehm.space/backend/README.md
```

**1 · 0 · 404.**

---

## 8 · Les Spots de démo vieillissent

Ils sont datés à partir du moment de la migration (sur huit jours). Pour
les rafraîchir plus tard : `execute_sql` → `select public.demo_seed();`.
Pour tout retirer (avant d'ouvrir l'Espace au public) :
`select public.demo_purge();`.

---

```bash
rm -rf ~/inbox/*
```

---

# CE QUI RESTE À WAH

## A · AUCUN CLIC DE DASHBOARD

Tout passe par Claude Code.

## B · LES TESTS NAVIGATEUR — www.totehm.space

Navigation privée (l'ancienne redirection de la racine peut être en cache).
Dans la console, `__totehm_space()` doit dire `build: "2026-09-24"`,
`member: true`, `comp: true`.

1. **L'accueil** : un radar, une ligne d'état en haut (`32 Spots · 2 live`),
   l'heure de Lisbonne en bas à droite, **trois commandes** en bas. Rien
   d'autre à toucher.
2. **Search** : tape `box`, puis `fight park`, puis `marathon`, puis
   `tiago`, puis `silent`, puis `afrobeat`. Touche `When` → `now` : les deux
   LIVE. Touche `Intention` → `Love`.
3. **Un résultat** : touche la boîte. La compatibilité, qui, le mood, et
   UN bouton. `Run the river at dawn` → **Join** → « You are in » et le
   point de rendez-vous apparaît. `Tea, no phones` → « Full ».
   `Sparring Thursday` → réservé aux abonnés.
4. **Un T du radar** ouvre son Spot.
5. **Create** : *Which habit?* (tes Habit Boxes, comme dans totehm.com) →
   touche WHY / TRIGGER pour garder ou laisser → *When?* → *Where?* (ta
   position) → *With whom?* → **Publish**. Le Spot s'ouvre sur le radar.
6. **Les demandes** : demande à Claude (Claude Code) de lancer
   `select public.demo_seed();` — deux membres de démo candidatent à ton
   Spot. **My space · 2** : accepte-en un.
7. **Au téléphone** : le panneau monte du bas, les trois commandes restent
   visibles, rien ne déborde.

Un écran vide ou un bouton mort → colle ça dans la console et envoie tout :

```js
console.log(JSON.stringify({diag:window.__totehm_space?.(),url:location.pathname,appels:performance.getEntriesByType('resource').filter(r=>r.name.includes('/rest/v1/rpc/')).map(r=>r.name.split('?')[0].split('/').pop()+' '+Math.round(r.duration)+'ms')},null,2))
```
