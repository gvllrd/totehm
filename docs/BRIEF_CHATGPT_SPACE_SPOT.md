# [POUR ChatGPT] Séparer le space et le spot, puis le miroir TotehmBot

> Rédigé le 09/10/2026 par le CTO (Claude) pour un agent qui prend le relais.
> Tu exécutes ; tu n'improvises ni l'architecture, ni le design, ni le texte.
> Si une instruction ici contredit ce que tu lis dans le code ou la base,
> **tu t'arrêtes et tu le dis à Wah** : tu ne choisis pas seul.

---

## 1 · CONTEXTE

TOTEHM = quatre domaines, quatre fonctions. Une base Supabase
(`abujjbkbbiumxrokozph`, eu-west-1), dépôt GitHub `gvllrd/totehm` (public),
Vercel déploie chaque domaine depuis `main` (projets `com`, `space`, `club`,
`boutique` ; dossier = projet).

| domaine | dossier | fonction |
|---|---|---|
| www.totehm.com | `com/` | la stratégie, la source : le Totehm du membre (5 vues) |
| www.totehm.space | `space/` | **le TikTok de l'Habit stratégique** : des *spaces* = une Habit vécue en photo ou vidéo, avec son pourquoi |
| www.figher.club | `club/` | **le Waze de l'Habit stratégique** : des *spots* = un point + une heure dans la réalité (à venir · en cours · passé), on y va, on rejoint |
| www.higher.boutique | `boutique/` | l'achat (ne pas toucher dans ce lot) |

**Le problème à résoudre.** Aujourd'hui un seul objet sert de space ET de spot :
la table `spot_plans` (+ sa projection `spots`). Et `space/index.html`
(2 468 lignes) fait tout : fil, radar, agenda, annonce, caméra. Wah veut :
- SPACE = le fil + publier un space. Plus de radar, d'agenda, d'annonce.
- figher.club = la carte des spots : annoncer, voir, rejoindre.
- COM : chaque Habit montre **ses spaces ET ses spots**.
- TotehmBot (vue du bas de COM) = un **miroir** qui relie tout (phase 4).

**La base est vide** (remise à zéro du 09/10, 12 h) : 0 space publié, 0 spot
actif. Aucune donnée à migrer. C'est la raison de faire ce lot maintenant.

---

## 2 · AVANT TOUTE CHOSE — LIS, DANS CET ORDRE

1. `CLAUDE.md` (racine) — **en entier**. Ce sont les règles. Elles s'appliquent à toi.
2. `space/CLAUDE.md` : sections « 09/10 », « 06/10 », « 05/10 », « 03/10 (ter) », « 03/10 (bis) ».
3. `club/CLAUDE.md` : section « 09/10 ».
4. `com/CLAUDE.md` et `backend/CLAUDE.md` : seulement par recherche (`habit_spaces`, `spot`, `TotehmSM`).
5. **Le code de la base EN PRODUCTION, pas les fichiers du dépôt** (ils ont parfois
   du retard) : pour chaque fonction ci-dessous,
   `select pg_get_functiondef('public.<nom>'::regproc);` (si plusieurs
   signatures : `::regprocedure` avec les types).
   `spot_create`, `spot_schedule`, `space_discover`, `spots_list`, `spots_feed`,
   `spot_get`, `my_spaces`, `habit_spaces`, `space_habits`, `spots_exact`,
   `spot_video_attach`, `take_me_there`, `_spot_view`.

**Ne lis jamais en entier** `space/index.html`, `com/totehm.html` (9 511 lignes),
`backend/SYSTEM.md`, `backend/README.md`, `BRAND.md` : cherche (`grep -n`), puis
lis la plage utile.

---

## 3 · INTERDITS — UN SEUL MANQUEMENT = TU T'ARRÊTES ET TU PRÉVIENS WAH

- **Stripe** : rien. Aucun prix, aucun produit, aucun remboursement, aucun webhook.
- **Secrets** : jamais dans un fichier, un commit, un message. `Deno.env.get()` seulement.
  Ne lis pas `oracle/` (clés).
- **Base** : aucun `drop`, aucun `delete`, aucun `truncate`, aucun `update` sans `where`.
  Une migration = un fichier `backend/supabase/migrations/AAAAMMJJHHMMSS_nom.sql`
  appliqué **UNE fois** par l'outil Supabase `apply_migration` (même nom, sans le
  préfixe). Jamais `supabase db push`.
- **Signature d'une fonction SQL existante : ne la change JAMAIS.** `create or
  replace` avec d'autres paramètres crée une DEUXIÈME fonction du même nom et
  casse l'API (PostgREST ne sait plus laquelle appeler). Besoin d'un paramètre
  en plus → une nouvelle fonction, nouveau nom.
- `create or replace function` remet le droit d'exécution à PUBLIC : après le
  DERNIER `create` du fichier, réécris `revoke all … from public, anon;` puis
  `grant execute … to authenticated, service_role;` (et `anon` seulement si la
  fonction l'avait avant — vérifie avec `has_function_privilege`).
- **Git** : jamais `git add .` (`oracle/` existe) — ajoute les fichiers par nom.
  Jamais `push --force`, jamais `rebase` de `main`, jamais réécrire l'historique.
- **Front** : retirer un élément HTML = retirer AUSSI tout le JavaScript qui le
  vise (`$('id')`, `getElementById`, `querySelector`). Un `$('x')` sur un nœud
  absent lève une erreur au chargement du module → **page blanche**. C'est le
  piège n° 1 de ce lot.
- Ne touche ni à `boutique/`, ni aux Edge Functions `stripe-webhook`,
  `*-checkout`, `higher-self` (la phase 4 l'utilise TEL QUEL).
- Aucune police autre que Space Mono et Quantico ; aucun fond blanc ; aucune
  bordure autour d'une boîte ; interface en anglais, mots courts. Le détail est
  dans `CLAUDE.md` racine (« Doctrine visuelle ») : relis-le avant tout CSS.
- **Tu n'écris pas de texte marketing.** Les seuls textes d'écran autorisés sont
  ceux de ce brief, ou ceux déjà présents dans le code.

---

## 4 · LA MÉTHODE, À CHAQUE PHASE

1. Lire (section 2 + ce que la phase cite).
2. Changer — le minimum que la phase demande. Rien de plus.
3. Tester (section 9). Un test qui échoue = tu corriges ou tu t'arrêtes. Tu
   n'affirmes JAMAIS qu'un test passe sans l'avoir exécuté ; si tu ne peux pas
   l'exécuter, tu écris « non exécuté » dans le rapport.
4. Docs du même lot (section 8).
5. Commit (un par changement logique, message en français), push sur la
   branche `chatgpt/space-spot`, puis sur `main` en avance rapide
   (`git push origin chatgpt/space-spot:main`, refusé si `main` a bougé → fusionne
   `origin/main` dans ta branche, jamais l'inverse avec réécriture).
6. Vérifier la PRODUCTION (section 10).
7. Rapport à Wah = un tableau de valeurs mesurées (section 11). **Puis tu attends
   son « go » avant la phase suivante.**

---

## 5 · PHASE 0 — ÉTAT DES LIEUX (aucune écriture)

Mesure et rapporte :

```sql
select (select count(*) from public.spot_plans where status = 'published') vivants,
       (select count(*) from public.spots where active) spots_actifs,
       (select count(*) from public.spot_plans) plans;
```
Attendu : `vivants = 0`, `spots_actifs = 0`. **Si `vivants > 0` : stop**, quelqu'un a
publié depuis ; demande à Wah.

Repère dans `space/index.html` (par `grep -n`) et note les numéros de ligne :
- les 5 vues : `id="v-plan"` (TOP, annoncer), `id="v-feed"` (LEFT, le fil),
  `id="v-radar"` (CENTRE), `id="v-list"` (RIGHT, l'agenda), `id="v-cam"` (BAS, la caméra) ;
- `const CROIX` (ligne ~2083), `const voisin`, `function go(v)`, `function joyTap` ;
- les appels `rpc('space_discover'` (3 : `p_view:'feed'`, `'radar'`, `'list'`),
  `rpc('spot_schedule'`, `rpc('spot_create'`, `rpc('spot_video_attach'`, `rpc('my_spaces'` ;
- `const BUILD`, `const SSO_CLIENT`, `window.__totehm_space`.

---

## 6 · PHASE 1 — LA BASE : UN CHAMP `format`, DEUX OBJETS

Un fichier : `backend/supabase/migrations/<horodatage>_space_spot_split.sql`,
nom d'application `space_spot_split`. En tête : `-- why / how / what` (comme les
autres migrations).

**Choix d'architecture (ne pas en changer) :** UNE table, deux objets, séparés
par une contrainte. Pas de nouvelle table : la vidéo (Bunny, Storage `moments`),
les droits (`_spot_view`), la suppression (`space-delete`) et les tests restent
communs et intacts.

1. Colonne :
   ```sql
   alter table public.spot_plans
     add column if not exists format text not null default 'spot'
     constraint spot_plans_format_check check (format in ('space','spot'));
   ```
   Défaut `spot` : `spot_create` (I AM HERE, maintenant) et `spot_schedule`
   (I WILL BE HERE) créent des spots **sans qu'on touche à leur code**.

2. Nouvelle fonction `public.space_post(p_habit text, p_video text, p_lat double
   precision, p_lng double precision, p_city text, p_comment text) returns jsonb`,
   `security definer`, `set search_path = public` :
   - **copie du corps de `spot_create`** (version PROD), avec ces seules différences :
     `format = 'space'` ; visibilité `shared` ; `shield = 'off'` (un space ne donne
     JAMAIS le point exact) ; `mode = 'silent'` et `duration_min = 5` (valeurs
     techniques imposées par les contraintes, jamais affichées) ;
   - mêmes contrôles que `spot_create` (connexion, Habit présente dans le Totehm,
     quota de `spot_rules`, média ou ville selon ce que `spot_create` exige) ;
   - même forme de réponse JSON que `spot_create` (`ok`, `id`, `why`…), pour que le
     front réutilise le même code de média (`spot_video_attach`, photo).
   - droits : `authenticated`, `service_role`. Pas `anon`.

3. Lectures — **mêmes signatures**, on ajoute un filtre :
   - `space_discover` : vue `feed` → `and p.format = 'space'` ; vues `radar` et
     `list` → `and p.format = 'spot'`. (Lis dans le corps comment `p_view` est testé.)
   - `spots_list`, `spots_feed` → `and p.format = 'spot'`.
   - `my_spaces` → `and p.format = 'space'`.
   - `habit_spaces` → **aucun filtre** ; ajoute la clé `'format', p.format` à
     chaque élément renvoyé.
   - `spot_get` → ajoute la clé `'format', p.format`.

4. Nouvelle fonction `public.my_spots(p_before timestamptz, p_before_id uuid,
   p_limit int) returns jsonb` = copie de `my_spaces` avec `format = 'spot'`, la
   liste sous la clé `spots` au lieu de `spaces`. Droits : `authenticated`.

5. Fin du fichier : tous les `revoke` / `grant` (voir interdits).

6. Auto-test `tests/sql/space_spot_split_selftest.sql` : copie la STRUCTURE de
   `tests/sql/my_spaces_selftest.sql` (tout dans une transaction qui se termine
   par `raise exception 'SELFTEST (rolled back): … | FAIL=%', …` → rien n'est
   écrit). Cas obligatoires :
   - `space_post` crée une ligne `format = 'space'`, `shield = 'off'` ;
   - `spot_schedule` crée une ligne `format = 'spot'` ;
   - `space_discover('feed')` ne voit que le space ; `('radar')` et `('list')` ne voient que le spot ;
   - `spots_list` / `spots_feed` ne voient que le spot ;
   - `my_spaces` ne voit que le space ; `my_spots` ne voit que le spot ;
   - `habit_spaces` renvoie les deux, chacun avec sa clé `format` ;
   - `anon` ne peut pas exécuter `space_post` ni `my_spots`.
   Exécution : outil Supabase `execute_sql` avec le contenu du fichier.
   **Attendu : une erreur dont le texte finit par `FAIL={}`** (c'est le succès).
   Lance aussi les auto-tests existants qui touchent ces fonctions :
   `my_spaces_selftest.sql`, `habit_spaces_selftest.sql`, `spots_selftest.sql`,
   `space_future_selftest.sql`, `space_photo_why_selftest.sql` → `FAIL={}` chacun.

7. Après application : `select proname from pg_proc where prosrc ~ 'spot_plans'`
   — relis chaque fonction listée qui écrit dans `spot_plans` et confirme qu'aucune
   n'insère un space par erreur. Puis `get_advisors` (security) : aucune alerte
   nouvelle.

⚠️ Entre la phase 1 et la phase 2, un média filmé sur SPACE part au radar et pas
au fil. C'est acceptable SEULEMENT parce que la base est vide : enchaîne la
phase 2 dans la journée.

---

## 7 · PHASES 2 ET 3 — COUPER `space/index.html` EN DEUX

**Méthode imposée : on COPIE puis on SOUSTRAIT. On n'écrit rien de zéro.**
Le code actuel est testé ; deux copies amputées valent mieux qu'une réécriture.

### Phase 2 — totehm.space = le fil

Dans `space/index.html` :

| vue | avant | après |
|---|---|---|
| CENTRE | `radar` | **`feed`** (le fil, plein écran) — page d'arrivée |
| BAS | `cam` → `spot_create` | `cam` → **`space_post`** |
| GAUCHE | `feed` | **`spots`** : les 3 prochains spots de la Habit cherchée (`spots_list`, `p_q = S.q`), chaque carte → `ssoVersDomaine(sb,'club','https://www.figher.club/?spot=<id>')` ; un bouton `FIND A SPOT` → `ssoVersDomaine(sb,'club','https://www.figher.club/')` |
| HAUT | `plan` (annoncer) | **supprimée** |
| DROITE | `list` (agenda) | **supprimée** |

- Retire `v-plan`, `v-radar`, `v-list` **avec** tout leur code : `PLAN`, `planOpen`,
  `planPaint`, `rpc('spot_schedule'`, le radar (`RAD`, `canvas`, `radarOn`, `draw`,
  `#radar-map`, `#map-tiles`, `#cmp`, `#map-tools`, `#radar-tools`), l'agenda
  (`#list`, `rpc('space_discover', {p_view:'list'`), `.ics`. Après chaque retrait :
  `grep -n` du nom retiré → **zéro occurrence restante**.
- `CROIX` devient exactement :
  `const CROIX = { feed:{b:'cam',g:'spots'}, cam:{h:'feed'}, spots:{d:'feed'} };`
  et `voisin` perd sa branche `REC.forPlan` (`const voisin = d => CROIX[VIEW][d] || null;`).
  Retire `REC.forPlan` partout (c'était « Film it » depuis le plan). La table des
  couleurs du joystick (`--joy-vue`) : `feed`, `cam`, `spots` seulement.
- `joyTap` : hors caméra, il ramène à `feed` (et non plus à `radar`).
- Formulaire de la caméra : média → Habit → OBJECTIVES / REPULSIONS (les deux
  mini-box, inchangées, `spot_box_visibility_set`) → commentaire → publier.
  **Retire** : durée, SILENT/SOCIAL, ON/OFF, WHERE (point exact). La ville reste
  envoyée (géolocalisation → ville, comme aujourd'hui), jamais affichée comme un point.
- Filtre du fil (`#sf-panel`) : garde `It shows VIDEO / PHOTO / WHY · TRIGGER`.
  Retire `When now/before`, `Location on/off`, `Together silent/social`,
  `I want to JOIN`.
- Arrivée avec `?spot=<id>` : `spot_get` ; si `format = 'spot'` →
  `location.replace` via le pont vers `https://www.figher.club/?spot=<id>` ; si
  `format = 'space'` → la fiche, comme aujourd'hui.
- « What is a space? » : garde le texte actuel. Tu n'en écris pas d'autre.
- My spaces (menu membre) : inchangé (il ne lit plus que les spaces).
- `BUILD = '<date>-space-feed'`. `window.__totehm_space()` : retire les clés du
  radar et du plan, ajoute `view` (déjà là) et `spots_door` (compteur).

### Phase 3 — figher.club = la carte des spots

1. `club/index.html` actuel → renomme-le `club/meet.html` par `git mv` (on garde
   sa section « How it works » et son pied de page).
2. Copie `space/index.html` **tel qu'il était AVANT la phase 2** (`git show
   <commit-avant-phase-2>:space/index.html > club/index.html`), puis soustrais :

| vue | contenu figher.club |
|---|---|
| CENTRE | `radar` — les points que le membre a le droit de voir (inchangé : `space_discover('radar')`, désormais spots seulement) |
| HAUT | `plan` — I WILL BE HERE (`spot_schedule`, inchangé) |
| DROITE | `list` — l'agenda des spots à venir (inchangé) |
| BAS | `cam` — I AM HERE : `spot_create`, inchangé (un spot qui commence maintenant, avec son clip) |
| GAUCHE | **`past`** — I WAS THERE : les spots passés (`spots_feed`, état `was`) ; reprends le rendu des cartes de `club/meet.html` (`paintSpots`) |

   `CROIX` = celui de SPACE avant la phase 2, `feed` remplacé par `past` :
   `{ radar:{h:'plan',b:'cam',g:'past',d:'list'}, plan:{b:'radar',g:'past',d:'list'}, cam:{h:'radar',g:'past',d:'list'}, past:{d:'radar'}, list:{g:'radar'} }`.

   - Retire de la copie : la vue `feed` (le fil) et tout son code (`pauseFeed`,
     `focusVisibleClip`, `#feed`, `#sf-panel`, `rpc('space_discover', {p_view:'feed'`).
   - `SSO_CLIENT = 'club'`, `BUILD = '<date>-club-map'`, `<title>FIGHER.CLUB —
     meet in reality</title>`, `window.__totehm_club()` (pas `__totehm_space`).
   - Le coin « What is a space? » devient « What is a spot? » avec, mot pour mot :
     `A spot is a strategic Habit, lived together in reality. I WILL BE HERE · I AM HERE · I WAS THERE.`
   - Fichiers dont la copie dépend → copie-les dans `club/` à l'identique :
     `cities.json`, `video-capture.mjs`, `vendor/hls-1.6.13.mjs` (+ `hls-LICENSE`),
     les images de `space/assets/` que la page cite (`grep -no "assets/[^'\") ]*"`).
   - `?spot=<id>` : `spot_get` ; si `format = 'space'` → pont vers
     `https://www.totehm.space/?spot=<id>` ; sinon la fiche.
   - Edge Functions appelées depuis figher.club (`create-bunny-upload`,
     `space-delete`, `spot-video`) : leur CORS passe par `corsHeaders` et
     `ALLOWED_ORIGINS` contient déjà `https://www.figher.club` — **vérifie-le**
     par un appel réel depuis la page déployée (console réseau : pas d'erreur CORS).
   - `club/vercel.json` : `cleanUrls` reste ; ajoute `/meet` si besoin ; les 308
     vers la boutique ne bougent pas.
   - Dans `club/meet.html`, les cartes qui renvoyaient vers SPACE (`?spot=`)
     renvoient vers `/?spot=<id>` (le même domaine).

### Phase 3 bis — COM : chaque Habit montre ses spaces ET ses spots

Dans `com/totehm.html`, autour de `rpc('habit_spaces'` (ligne ~4319) :
- sépare la liste par `format` : une ligne `spaces` puis une ligne `spots`
  (libellés exacts : `SPACES` et `SPOTS`, Space Mono Bold, gris) ;
- un space → `ssoVersDomaine(sb,'space','https://www.totehm.space/?spot=<id>')` ;
  un spot → `ssoVersDomaine(sb,'club','https://www.figher.club/?spot=<id>')` ;
- une ligne vide ne s'affiche pas (pas de « 0 »).

---

## 8 · DOCUMENTS À METTRE À JOUR DANS LE MÊME LOT (sinon le lot est refusé)

- `CLAUDE.md` racine : le tableau d'architecture (lignes `club/` et `space/`).
  Le fichier reste ≤ 250 lignes : tu REMPLACES, tu n'ajoutes pas de paragraphe.
- `space/CLAUDE.md`, `club/CLAUDE.md`, `com/CLAUDE.md` : une section datée EN HAUT
  (« ## <date> — … »), 10 lignes max, ce qui a changé et les tests.
- `backend/CLAUDE.md` : `format`, `space_post`, `my_spots`, la règle « un space
  ne donne jamais le point ».
- `backend/SYSTEM.md` §0 : une section EN HAUT, au format des précédentes
  (un tableau `quoi | valeur mesurée`).
- `CLAUDE_CODE.md` : une « Correction 0.51 — <date> · … (à reporter) », trois
  lignes, au-dessus de la 0.50.

---

## 9 · TESTS

**Navigateur** (Supabase simulé, aucun réseau réel) : il faut un terminal avec
Node ≥ 18 et `npm i playwright` (+ `npx playwright install chromium`).
`node tests/browser/<test>.mjs /tmp/shots` — n'affiche que les échecs.

| phase | tests à faire passer (les adapter à la nouvelle répartition des vues, jamais les affaiblir) |
|---|---|
| 2 | `space.mjs`, `space_top_left.mjs`, `space_video.mjs`, `spaces_loupe.mjs`, `space_boxes_ecosystem.mjs`, `spaces_ui.mjs` |
| 3 | un nouveau `club_map.mjs` (copie de `space.mjs` adaptée : radar au centre, plan en haut, agenda à droite, passés à gauche, caméra en bas, `?spot=` d'un space → redirection) ; `club_luxury.mjs` §1–2 pointé sur `/meet` |
| 3 bis | `com_croix.mjs`, `com_read_copy.mjs` + un cas : une Habit avec 1 space et 1 spot → deux lignes, deux liens, deux domaines |

Chaque test : aucune erreur console (`pageerror`) — c'est ce qui attrape la page blanche.
Échecs connus AVANT ce lot (ne pas les compter, ne pas les « réparer » au passage) :
`spaces_ui --identity` : 4 échecs sur get_higher et stoner.

**Pas de terminal ?** Écris-le dans le rapport (« tests navigateur : non
exécutés ») et fais la vérification de la section 10 sur les quatre vues, au
téléphone, avec Wah. Ne dis jamais « testé » sans l'avoir fait.

---

## 10 · VÉRIFIER LA PRODUCTION

1. Vercel : `list_deployments` du projet (`space`, `club`, `com`) → le
   déploiement dont le commit = ton commit, état `READY`.
2. Le contenu servi = le dépôt, par la base (pg_net) :
   ```sql
   select net.http_get('https://www.totehm.space/') id;   -- note l'id
   select status_code, md5(content),
          substring(content from 'const BUILD=''([^'']+)''') build
   from net._http_response where id = <id>;
   ```
   Compare `md5` au `md5sum` du fichier du dépôt et `build` à ton `BUILD`. Idem
   `https://www.figher.club/`, `https://www.figher.club/meet`, `https://www.totehm.com/`.
3. Les lectures, comme un membre puis sans compte :
   ```sql
   begin;
   select set_config('request.jwt.claims', json_build_object('sub','<un user_id>','role','authenticated')::text, true);
   set local role authenticated;
   select public.space_discover('feed', null, null, null, null, null, 5),
          public.spots_list(null, null, null, null, 5),
          public.my_spots(null, null, 5);
   rollback;
   ```
   (adapte l'ordre des arguments à la signature réelle).

---

## 11 · LE RAPPORT À WAH (après CHAQUE phase)

En français, un tableau, des valeurs mesurées, rien d'autre :

| quoi | valeur mesurée |
|---|---|
| commit sur `main` | `<sha>` |
| migration appliquée | `space_spot_split` → succès |
| auto-tests SQL | `space_spot_split` FAIL={} · `my_spaces` FAIL={} · … |
| tests navigateur | `space.mjs` 40/40 · … (ou « non exécutés ») |
| prod | totehm.space BUILD `…` md5 = dépôt · figher.club BUILD `…` md5 = dépôt |
| reste à faire | … |
| écart avec ce brief | … (ou « aucun ») |

Puis : « J'attends ton go pour la phase N+1. »

---

## 12 · PHASE 4 — LE MIROIR TOTEHMBOT (SEULEMENT SI WAH ÉCRIT « go miroir »)

La vue du bas de totehm.com (TotehmSM, `com/totehm.html`, `#lv-…`, `smFlux`,
`lireSM`, `bulleSM`) passe des bulles à un **miroir** : pas de conversation,
pas d'historique, un reflet.

- **Une ligne à taper**, au même rendu que la recherche de Totehm (fond noir
  arrondi, Quantico, Coral pour le nom). Envoyer = le même appel qu'aujourd'hui à
  l'Edge Function `higher-self` (flux, quota 7 / 30 j, Higher : **ne touche ni à
  la fonction ni à la base de TotehmSM**).
- **Le reflet** remplace le précédent (jamais empilé) : la réponse suit déjà le
  format `@intention … / DO: … / WHY: …` → affiche trois lignes : l'intention
  (badge de l'intention), `DO`, `WHY`. Pendant le flux, le texte s'écrit en place.
- **Quatre portes** sous le reflet, en grille 2 × 2, contrôles gris
  `border-radius:10px` : `SPACE` · `FIGHER` · `BOUTIQUE` · `MY TOTEHM`.
  Elles viennent d'UNE nouvelle fonction SQL `public.mirror_doors(p_text text,
  p_intention text) returns jsonb` (aucun appel payant) :
  - `element` : l'élément du Totehm du membre dont le nom partage le plus de mots
    avec `p_text` (insensible à la casse) ;
  - `space` : le dernier space publié de cette Habit (ou de l'intention) visible par le membre ;
  - `spot` : le prochain spot de cette Habit (ou de l'intention) visible par le membre ;
  - `cloth` : un Cloth relié à l'élément (lis la fonction existante
    `element_cloths(p_pseudo)` et reprends sa requête), sinon `null`.
  Une porte `null` ne s'affiche pas. Chaque porte ouvre son domaine par
  `ssoVersDomaine` (`space`, `club`, `boutique`) ; `MY TOTEHM` ramène au centre de
  COM sur l'élément.
- Le papier du membre (`#lv-thumb`) reste en haut, petit, centré : c'est le miroir.
- Les règles d'accès (Habit + Objective remplies, offre Higher à 0 réponse
  restante) restent celles du 08/10 : réutilise `offre`, ne les recompose pas.
- Tests : `com_croix.mjs` §2–3 réécrits pour le miroir + un auto-test SQL de
  `mirror_doors` (droits : jamais un spot ou un space qu'il n'a pas le droit de voir,
  jamais un point exact).

---

## 13 · HORS LOT — NE PAS FAIRE

La purge définitive des lignes annulées (Tâche 4 de `CLAUDE_CODE.md`, pour Claude
Code) · le prix live Higher · Luxury · tout ce qui touche `boutique/` · capacité et
acceptation d'un spot (`spot_apply`, `spot_decide` restent fermés) · un lien entre
un space et le spot où il a été filmé.
