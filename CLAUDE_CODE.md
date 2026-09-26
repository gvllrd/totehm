# CLAUDE_CODE.md — LOT DU 26/09/2026 · TOTEHM.SPACE À L'ÉCHELLE DU MONDE

**totehm.space se joue comme le Totehm, et va de la rue à la planète.**
Le geste vaut partout (doigt, deux doigts au trackpad, souris tirée sur le
radar) ; le zoom est un pincement, avec un petit `+ − ◎ ?` à droite de la
manette ; la couronne du radar se tourne (inertie, deux touchers = nord) ;
en dézoomant, le radar devient la Terre et les Spots du monde s'y
allument ; chaque fenêtre arrive de son côté et la manette ne bouge plus ;
fond noir pur ; une bulle de survol opaque au-dessus des points ; un fond
de rue sombre pour poser le rendez-vous ; un Spot a une **nature**
(espace public / privé) ; *By intention* rappelle les sept avec le slogan
Higher ; un « How it works » ; le balayage ralentit.

**Ce lot a été exécuté par Claude dans une session cloud** : la migration
est DÉJÀ en base, les fichiers sont DÉJÀ poussés sur la branche
`claude/intelligent-galileo-a458ao` (pull request #2). Il reste à fusionner
et à tester.

---

## 1 · Les fichiers

```
space/index.html                                        ← RÉÉCRIT (BUILD 2026-09-26)
space/earth.json · space/earth50.json                   ← NOUVEAUX — Natural Earth, domaine public
backend/supabase/migrations/20260926_space_monde.sql    ← NOUVEAU — DÉJÀ APPLIQUÉ
CLAUDE.md · BRAND.md · backend/SYSTEM.md · backend/README.md · CLAUDE_CODE.md
```

---

## 2 · LA BASE — déjà appliquée, à VÉRIFIER (MCP Supabase, `execute_sql`)

```sql
select (select count(*) from pg_proc where proname = 'spot_publish') as versions_publish,
       has_function_privilege('anon', 'public.spots_globe(text,text,text,text)', 'execute') as anon_globe,
       jsonb_array_length(public.spots_globe(null,null,null,null)) as cellules,
       (select count(*) from public.spot_plans where venue = 'private') as prives,
       public.spot_rules()->>'round_private' as arrondi_prive;
```

**`1` · `true` · un nombre > 0 · un nombre > 0 · `2`.**
Relevé le 26/09 après application : `1 · true · 11 · 5 · 2`.

---

## 3 · La fusion

Fusionne la pull request #2 sur `main` : Vercel redéploie `space`.

⚠️ **Jamais `git add .`** — `oracle/` contient les clés.

---

## 4 · Le contrôle après déploiement

```bash
curl -sL https://www.totehm.space/ | grep -c "const BUILD = '2026-09-26'"
curl -sL https://www.totehm.space/ | grep -c 'id="higher-badge"'
curl -sL -o /dev/null -w "earth %{http_code}\n" https://www.totehm.space/earth.json
curl -sL -o /dev/null -w "earth50 %{http_code}\n" https://www.totehm.space/earth50.json
curl -sL -o /dev/null -w "backend public ? %{http_code}\n" https://www.totehm.space/backend/README.md
```

**1 · 1 · 200 · 200 · 404.**

---

## 5 · Le master (non versionné)

Dans `~/totehm/TOTEHM_MASTER.md`, §0, ajoute sous la dernière entrée :

> **0.17 · 26/09 — totehm.space à l'échelle du monde.** Le geste de la
> manette vaut partout ; le zoom est un pincement (+ − pour qui ne pince
> pas) et va de la rue à la planète (au-dessus de 80 km, des lumières par
> région : `spots_globe`, zéro identité). La couronne du radar se tourne.
> Un Spot a une NATURE : espace public (~110 m) ou privé, chez le membre
> (~1,1 km) — l'arrondi est en base. **Écart au §44** : pour poser le
> rendez-vous, un fond de rue OpenStreetMap (tuiles, sans bibliothèque ni
> clé, en création seulement, attribution affichée). Gratuit mais soumis
> à la politique d'usage d'OSM : à fort volume, fournisseur payant ou
> tuiles à nous. Le trait de côte est Natural Earth, servi par nous.
> **Écart connu, inchangé** : « today / tomorrow » sont des jours de
> LISBONNE côté serveur.

Contrôle : `git -C ~/totehm check-ignore TOTEHM_MASTER.md` → `TOTEHM_MASTER.md`.

---

## 6 · Les Spots de démo vieillissent

Relancés le 26/09 (`select public.demo_seed();` — 42 Spots, dont 10 dans
le monde). Pour les rafraîchir : même appel. Pour tout retirer avant
d'ouvrir l'Espace au public : `select public.demo_purge();`.

---

```bash
rm -rf ~/inbox/*
```

---

# CE QUI RESTE À WAH

## A · AUCUN CLIC DE DASHBOARD

## B · LES TESTS NAVIGATEUR — www.totehm.space (après la fusion)

Navigation privée. Dans la console, `__totehm_space()` doit dire
`build: "2026-09-26"`.

1. **Le fond** est noir pur ; seuls le disque du radar et les fenêtres sont
   gris. Le balayage fait un tour en 14 s.
2. **Le geste partout** : sur un Mac, deux doigts sur le RADAR vers la
   gauche → *Tomorrow & beyond* s'ouvre depuis la DROITE. Au téléphone,
   balaie le radar du doigt : même chose. La manette ne bouge jamais.
3. **Les côtés** : gauche = la fenêtre sort de la gauche ; haut (Create) =
   elle descend du haut et y reste ; bas (My space) = elle monte du bas.
4. **Le zoom** : pince (trackpad ou doigts), ou `+ −`. Dézoome jusqu'à la
   Terre : des lumières à New York, Tokyo, Rio… Touche-en une → le radar
   y vole. `◎` (qui clignote quand tu es loin) te ramène.
5. **La couronne** : saisis l'anneau gradué et fais-le tourner, lâche en
   mouvement → il continue et ralentit. Le haut devient la direction
   visée, la lecture compte `n ahead`. Deux touchers sur l'anneau = nord.
   Sur le globe, la couronne fait tourner la planète.
6. **La bulle** : survole un point (ou appui long au téléphone) → une
   bulle grise, opaque, au-dessus des points, `0.9 km SE`.
7. **By intention** : les sept, chacune avec le badge Higher, son pilier
   et sa phrase. Choisis-en une → elle reste en tête, les autres
   deviennent des points.
8. **Create** : choisis une habitude → le radar descend sur toi et un fond
   de rue sombre apparaît (en bas à gauche : © OpenStreetMap). Touche la
   carte pour poser le point. La **nature** (public space / private)
   respire tant qu'elle n'est pas choisie. `how it works` s'ouvre depuis
   chaque réglage.
9. **Un Spot privé** : sa ligne de lieu dit « the neighbourhood · address
   once in ».
10. **How it works** : la touche `?` ou le `?` à droite de la manette.

Un écran vide ou un geste mort → colle ça dans la console et envoie tout :

```js
console.log(JSON.stringify({diag:window.__totehm_space?.(),url:location.pathname+location.hash,appels:performance.getEntriesByType('resource').filter(r=>r.name.includes('/rest/v1/rpc/')||r.name.includes('earth')).map(r=>r.name.split('?')[0].split('/').pop()+' '+Math.round(r.duration)+'ms')},null,2))
```
