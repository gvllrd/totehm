# CLAUDE_CODE.md — LOT DU 27/09/2026 · YESTERDAY · TODAY · TOMORROW · LE CLUB · PLUS DE MONTSERRAT

**totehm.space suit le temps.** Gauche YESTERDAY (mes Spots et ceux que
j'ai rejoints, sur un an, chacun se refait), centre TODAY (la carte de rue
dès l'arrivée ; la toucher crée un Spot ici, aujourd'hui), droite TOMORROW
(jour par jour, sans filtre), bas SEARCH (la barre, les jours, le mode, les
sept intentions), haut CREATE A SPOT (la carte en sourdine). My space est
dans le coin membre (un point blanc, comme « toi » sur la carte). Le
rendez-vous se pose en plein écran, la carte sous une croix fixe. Boîtes
qui grandissent au survol, loupe au téléphone. `by <nom>` sous chaque
Spot, sur la tuile perforée — qui ne sert plus qu'aux noms de Totehm.

**figher.club** prend la même grammaire (Bebas Neue, saisies et boutons
gris arrondis, tuile = nom d'un Totehm, point blanc).

**Plus de Montserrat nulle part** : totehm.com, HigherSelf, TotehmBot, la
boutique. Le slogan Higher est un tracé vectoriel.

**Ce lot a été exécuté par Claude dans une session cloud** : la migration
est DÉJÀ en base, la branche `claude/intelligent-galileo-a458ao` est
fusionnée sur `main` (Vercel redéploie les domaines).

---

## 1 · Les fichiers

```
space/index.html                                     ← RÉÉCRIT (BUILD 2026-09-27)
club/index.html · club/console.html                  ← BUILD 2026-09-27
com/totehm.html                                      ← Montserrat → Bebas Neue (titres de vue, rangs, wordmark, accroche)
com/higherself.html · com/totehm_7_intentions.html · com/club/totehmbot.html
boutique/{index,totehm,discover,discover_lisbon,get_higher,play_lisbon_street,stoner}.html
                                                     ← Montserrat retirée, slogan Higher vectorisé
backend/supabase/migrations/20260927_space_hier.sql  ← NOUVEAU — DÉJÀ APPLIQUÉ
CLAUDE.md · BRAND.md · backend/SYSTEM.md · backend/README.md · CLAUDE_CODE.md
```

---

## 2 · LA BASE — déjà appliquée, à VÉRIFIER (MCP Supabase, `execute_sql`)

```sql
select position('365 days' in prosrc) > 0 as un_an,
       has_function_privilege('anon', 'public.my_space()', 'execute') as anon,
       has_function_privilege('authenticated', 'public.my_space()', 'execute') as membre
  from pg_proc where proname = 'my_space';
```

**`true` · `false` · `true`.** Relevé le 27/09 après application : identique.

---

## 3 · Le contrôle après déploiement

```bash
curl -sL https://www.totehm.space/ | grep -c "const BUILD = '2026-09-27'"
curl -sL https://www.figher.club/ | grep -c "const BUILD = '2026-09-27'"
curl -sL https://www.figher.club/console | grep -c "const BUILD = '2026-09-27'"
curl -sL https://www.totehm.com/totehm | grep -c "family=Montserrat"
curl -sL https://www.higher.boutique/ | grep -c "family=Montserrat"
curl -sL -o /dev/null -w "backend public ? %{http_code}\n" https://www.totehm.space/backend/README.md
```

**1 · 1 · 1 · 0 · 0 · 404.**

---

## 4 · Le master (non versionné)

Dans `~/totehm/TOTEHM_MASTER.md`, §0, ajoute sous la dernière entrée :

> **0.18 · 27/09 — l'Espace suit le temps ; plus de Montserrat.** Les vues
> latérales sont YESTERDAY (mon histoire, un an, chaque Spot se refait) et
> TOMORROW (jour par jour) ; TODAY est la carte, qu'on touche pour créer ;
> SEARCH en bas ; My space dans le coin membre. Le rendez-vous se pose en
> plein écran. Bebas Neue remplace Montserrat partout (une graisse :
> l'intensité par la taille et la lumière) ; le slogan Higher est un tracé.
> La tuile perforée navy est réservée au NOM d'un Totehm ; saisies et
> boutons gris et arrondis sur l'Espace et le Club. **Écarts connus** :
> totehm.com et higher.boutique gardent leurs boutons et champs perforés
> (à convertir) ; la carte de rue OpenStreetMap s'affiche désormais dès
> l'arrivée — gratuite mais sous politique d'usage : à fort trafic, un
> fournisseur payant (un seul endroit à changer, `TILE_URL`) ; « today »
> reste un jour de Lisbonne côté serveur.

Contrôle : `git -C ~/totehm check-ignore TOTEHM_MASTER.md` → `TOTEHM_MASTER.md`.

---

```bash
rm -rf ~/inbox/*
```

---

# CE QUI RESTE À WAH

## A · AUCUN CLIC DE DASHBOARD

## B · LES TESTS NAVIGATEUR (navigation privée)

Dans la console, `__totehm_space()` doit dire `build: "2026-09-27"`.

**totehm.space**
1. **TODAY** : la carte de rue sombre est là tout de suite ; toi, un point
   blanc au centre. Touche la carte **hors d'un Spot** → CREATE A SPOT
   s'ouvre, « here, today », le lieu est posé.
2. **CREATE** : choisis une habitude → le jour est « today », le point est
   posé ; ce qui manque respire. `set meeting point` → **◎ place it on the
   map** : la carte prend l'écran, une croix au centre. **Déplace la carte**
   du doigt, pince, puis **Here**.
3. **Bas = SEARCH** : écris un mot, choisis un jour, un mode, une
   intention (la phrase de l'intention s'affiche).
4. **Droite = TOMORROW** : les Spots à venir, un titre par jour, aucun filtre.
5. **Gauche = YESTERDAY** : mes Spots et ceux que j'ai rejoints. **Do it
   again** → Create avec tout rempli sauf le jour.
6. **Le coin haut gauche** (point blanc + ton nom) : ton nom sur la tuile
   perforée, tes accès, qui attend ta réponse (Accept), Sign out.
7. **Sous un Spot** : `62% match with my TOTEHM`, et `by <nom>` sur la
   tuile perforée — touche-le : son Totehm s'ouvre.
8. **Ordinateur** : passe la souris sur une boîte, elle grandit.
   **Téléphone** : la petite loupe en haut à droite d'une boîte l'agrandit.
9. **?** : How it works — le Spot d'abord, le site ensuite.

**figher.club** et **/console** : titres en Bebas Neue, champs gris
arrondis, ton nom sur la tuile perforée (il ouvre ton Totehm), point blanc.

**totehm.com/totehm** : les titres de vue (MY HABITS…) et le wordmark
sont en Bebas Neue. **higher.boutique** : le badge Higher s'affiche
toujours (c'est maintenant un tracé).

Un écran vide ou un geste mort → colle ça dans la console et envoie tout :

```js
console.log(JSON.stringify({diag:(window.__totehm_space||window.__totehm_club)?.(),url:location.pathname+location.hash,appels:performance.getEntriesByType('resource').filter(r=>r.name.includes('/rest/v1/rpc/')).map(r=>r.name.split('?')[0].split('/').pop()+' '+Math.round(r.duration)+'ms')},null,2))
```
