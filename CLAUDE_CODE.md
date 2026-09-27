# CLAUDE_CODE.md — LOT DU 28/09/2026 · YESTERDAY = TOUS LES ANCIENS SPOTS · LE NAVY = LE TOTEHM

**totehm.space** : la vue de gauche YESTERDAY montre **tous les Spots
terminés autour de la carte, depuis un an**, jour par jour et sur la
carte ; chacun se refait (avec MON habitude). **Mes Spots et ceux que
j'ai rejoints** sont dans le **coin membre** (My space) : Cancel, On the
map, Withdraw, Do it again. Les **sept intentions** de Search reprennent
exactement les rangées du 26/09. **Le navy** (et le bleu clair, le
rouge-violet) ne sert plus qu'aux boîtes du Totehm : filtres, manette,
trois clés → gris.

**figher.club** : accès, abonnements, soldes, portes → gris (filet vert =
actif). Seule Reveal the Box garde la couleur de la boîte qu'elle montre.

**Ce lot a été exécuté par Claude dans une session cloud** : la migration
est DÉJÀ en base, la branche `claude/intelligent-galileo-a458ao` est
fusionnée sur `main` (Vercel redéploie les domaines).

---

## 1 · Les fichiers

```
space/index.html                                        ← BUILD 2026-09-28
club/index.html · club/console.html                     ← BUILD 2026-09-28
backend/supabase/migrations/20260928_space_hier_tous.sql ← NOUVEAU — DÉJÀ APPLIQUÉ
CLAUDE.md · BRAND.md · backend/SYSTEM.md · backend/README.md · CLAUDE_CODE.md
```

---

## 2 · LA BASE — déjà appliquée, à VÉRIFIER (MCP Supabase, `execute_sql`)

```sql
select has_function_privilege('anon', 'public.spots_past(double precision,double precision,integer,text,integer)', 'execute') as anon,
       jsonb_array_length(public.spots_past(38.72, -9.14, 60000, null, 60)->'spots') > 0 as rend_des_spots,
       (public.spots_past(38.72, -9.14, 60000, null, 60)->'spots'->0->>'creator') is null as invite_sans_createur;
```

**`true` · `true` · `true`.** Relevé le 28/09 après application : identique (15 Spots).

---

## 3 · Le contrôle après déploiement

```bash
curl -sL https://www.totehm.space/ | grep -c "const BUILD = '2026-09-28'"
curl -sL https://www.figher.club/ | grep -c "const BUILD = '2026-09-28'"
curl -sL https://www.figher.club/console | grep -c "const BUILD = '2026-09-28'"
curl -sL https://www.totehm.space/ | grep -c "spots_past"
curl -sL -o /dev/null -w "backend public ? %{http_code}\n" https://www.totehm.space/backend/README.md
```

**1 · 1 · 1 · ≥1 · 404.**

---

## 4 · Le master (non versionné)

Dans `~/totehm/TOTEHM_MASTER.md`, §0, ajoute sous la dernière entrée :

> **0.19 · 28/09 — Yesterday, c'est le passé de tous ; le navy, c'est le
> Totehm.** YESTERDAY montre tous les Spots terminés autour de la carte
> depuis un an (`spots_past`, mêmes règles de lecture que le radar) ;
> chacun se refait avec MON habitude. Mon histoire (mes Spots, ceux que
> j'ai rejoints) vit dans My space, au coin membre. Les sept intentions
> de Search sont les rangées du 26/09. Navy, bleu clair et rouge-violet
> sont réservés aux boîtes du Totehm et au nom d'un Totehm ; filtres,
> manette, accès, abonnements, soldes : gris. **Écarts connus** : le
> badge Higher garde son carré navy (c'est le slogan) ; la manette de
> totehm.com garde ses couleurs (ses tuiles sont les vues du Totehm) ;
> au-dessus de 80 km, YESTERDAY n'a pas de globe (le globe ne compte que
> ce qui vient).

Contrôle : `git -C ~/totehm check-ignore TOTEHM_MASTER.md` → `TOTEHM_MASTER.md`.

---

```bash
rm -rf ~/inbox/*
```

---

# CE QUI RESTE À WAH

## A · AUCUN CLIC DE DASHBOARD

## B · LES TESTS NAVIGATEUR (navigation privée)

Dans la console, `__totehm_space()` doit dire `build: "2026-09-28"`.

**totehm.space**
1. **Gauche = YESTERDAY**, même sans compte : les Spots passés autour de
   toi, un titre par jour, et leurs points sur la carte. Connecté membre :
   **Do it again** sur le Spot d'un autre → Create, le lieu et le format
   posés, tu choisis TON habitude puis le jour.
2. **Le coin haut gauche** (point blanc + ton nom) : sous tes accès et tes
   demandes, **my Spots** et **joined** — Cancel, On the map, Withdraw,
   Do it again.
3. **Bas = SEARCH** : les sept intentions en rangées (nom, Higher, pilier,
   la phrase). Touche-en une : elle reste en tête, les autres deviennent
   sept points ; **all seven** les rend. Un filtre choisi est blanc, plus navy.
4. La manette est grise.

**figher.club/console** : les boîtes d'accès, d'abonnement et de gains
sont grises ; un filet vert dit « actif ».

Un écran vide ou un geste mort → colle ça dans la console et envoie tout :

```js
console.log(JSON.stringify({diag:(window.__totehm_space||window.__totehm_club)?.(),url:location.pathname+location.hash,appels:performance.getEntriesByType('resource').filter(r=>r.name.includes('/rest/v1/rpc/')).map(r=>r.name.split('?')[0].split('/').pop()+' '+Math.round(r.duration)+'ms')},null,2))
```
