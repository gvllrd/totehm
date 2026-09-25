# CLAUDE_CODE.md — LOT DU 25/09/2026 · TOTEHM.SPACE À LA MANETTE

**totehm.space se pilote à la manette de totehm.com.** La barre
`Search · Create · My space` disparaît ; le radar rétrécit, la manette vit
dessous, et ses cinq crans sont cinq vues : *Live & today* (centre),
*Create a Spot* (haut), *My space* (bas), *By intention* (gauche),
*Tomorrow & beyond* (droite). Les Spots deviennent des points, la distance
se lit en km (miles aux États-Unis), la boîte d'un Spot devient une
boîte-ACTION (date · heure · durée · lieu Google Maps · places · mode, et
un tiroir [details]), la création s'ouvre comme une Habit Box, la
boussole fait tourner le radar au téléphone, des gris délimitent les
parties, et **on peut se déconnecter dans tous les états**.

Plus : l'erreur de la manette de `totehm.html` (la molette horizontale DANS
le joystick partait à l'envers) est corrigée dans les deux fichiers.

**Ce lot a été exécuté par Claude dans une session cloud** : la migration
est DÉJÀ en base, les fichiers sont DÉJÀ poussés sur la branche
`claude/intelligent-galileo-a458ao`. Il reste à fusionner et à tester.

---

## 1 · Les fichiers

```
space/index.html                                           ← RÉÉCRIT (BUILD 2026-09-25)
com/totehm.html                                            ← une ligne (la molette du joystick) + BUILD 2026-09-25
backend/supabase/migrations/20260925_space_manette.sql     ← NOUVEAU — DÉJÀ APPLIQUÉ
CLAUDE.md · BRAND.md · backend/SYSTEM.md · backend/README.md · CLAUDE_CODE.md
```

---

## 2 · LA BASE — déjà appliquée, à VÉRIFIER (MCP Supabase, `execute_sql`)

⚠️ **L'ORDRE A ÉTÉ RESPECTÉ : la base avant la page.** La migration est
additive — la page du 24/09 marche avec elle ; la page du 25/09 a BESOIN
d'elle (`p_when = 'later'` renverrait zéro Spot sans elle).

```sql
select public.spot_rules() as regles,
       jsonb_array_length(public.spots_radar(38.7223,-9.1393,20000,null,null,false,60,'later',null)->'spots') as plus_tard,
       has_function_privilege('anon', 'public.my_space()', 'execute') as anon_myspace,
       has_function_privilege('anon', 'public.spot_publish(text,text[],uuid[],bigint[],boolean,timestamptz,integer,text,double precision,double precision,text,integer,text,text,text)', 'execute') as anon_publish;
```

**`{max_upcoming:10,…}` · un nombre > 0 · `false` · `false`.**
Relevé le 25/09 après application : `later = 29` (démo relancée).

---

## 3 · La fusion

La branche porte trois commits (base · pages · documents). Fusionne-la sur
`main` (pull request ou `git merge`) : Vercel redéploie `space` et `com`.

⚠️ **Jamais `git add .`** — `oracle/` contient les clés.

---

## 4 · Le contrôle après déploiement

```bash
curl -sL https://www.totehm.space/ | grep -c "const BUILD = '2026-09-25'"
curl -sL https://www.totehm.space/ | grep -c 'id="joy-box"'
curl -sL https://www.totehm.space/ | grep -c 'data-cmd='
curl -sL https://www.totehm.com/totehm | grep -c "const BUILD='2026-09-25'"
curl -sL -o /dev/null -w "backend public ? %{http_code}\n" https://www.totehm.space/backend/README.md
```

**1 · 1 · 0 · 1 · 404.**

---

## 5 · Le master (non versionné)

Dans `~/totehm/TOTEHM_MASTER.md`, §0, ajoute sous la dernière entrée :

> **0.16 · 25/09 — totehm.space à la manette.** Le cockpit n'a plus trois
> commandes : la manette du Totehm, cinq crans (centre Live & today · haut
> Create · bas My space · gauche By intention · droite Tomorrow & beyond).
> Un Spot est une boîte-ACTION (date · heure · durée · lieu · places ·
> acceptation · mode, tiroir [details] : le mot, WHY, TRIGGER) — la Habit
> Box ne sert plus qu'au choix de l'habitude. Les règles d'un Spot sont
> `spot_rules()`. **Écart connu** : les fenêtres « today / tomorrow » sont
> des jours de LISBONNE côté serveur, alors que la page affiche les heures
> à l'heure de l'appareil — identique à Lisbonne, décalé ailleurs.

Contrôle : `git -C ~/totehm check-ignore TOTEHM_MASTER.md` → `TOTEHM_MASTER.md`.

---

## 6 · Les Spots de démo vieillissent

Relancés le 25/09 (`select public.demo_seed();`). Pour les rafraîchir :
même appel. Pour tout retirer avant d'ouvrir l'Espace au public :
`select public.demo_purge();`.

---

```bash
rm -rf ~/inbox/*
```

---

# CE QUI RESTE À WAH

## A · AUCUN CLIC DE DASHBOARD

## B · LES TESTS NAVIGATEUR — www.totehm.space (après la fusion)

Navigation privée. Dans la console, `__totehm_space()` doit dire
`build: "2026-09-25"`.

1. **L'accueil** : *LIVE & TODAY*, le radar plus petit, **la manette
   dessous**, plus de barre de boutons, plus rien dans les coins du bas.
   Les Spots sont des **points** de couleur ; toi, un point blanc.
2. **La distance** : ordinateur — passe la souris sur un point →
   `0.9 km SE`. Téléphone — **garde le doigt** sur un point → même
   étiquette, et le Spot ne s'ouvre pas. Un toucher bref l'ouvre.
3. **La manette** : tire le manche (ou les chevrons, ou les flèches du
   clavier). Haut = *Create a Spot* (pavé bleu clair). Bas = *My space*
   (rouge-violet). Gauche = *By intention* : les sept pastilles tout de
   suite. Droite = *Tomorrow & beyond* : un champ, `tomorrow · next 7 days
   · all ahead`, `social · silent`. **Toucher le pavé sans tirer** ramène
   au centre.
4. **L'erreur corrigée** : sur un Mac, pose deux doigts SUR le joystick et
   glisse vers la gauche → ça part à GAUCHE (avant : à droite). Pareil dans
   totehm.com/totehm.
5. **Une boîte-action** : nom · intentions + date + heure + durée · le lieu
   (touche-le : Google Maps s'ouvre) · places + automatic/manual · social
   ou silent · **[details]** : le mot du créateur, WHY, TRIGGER.
6. **Create** : choisis une habitude (elle a encore sa Habit Box) → la
   boîte-action s'ouvre, date / heure / durée / point de rendez-vous
   **respirent** tant qu'ils manquent ; chacun s'ouvre dans la boîte. Touche
   le radar pour déplacer le point. **Publish the Spot**.
7. **My space** : *my access* (founder access · `upcoming Spots n / 10`),
   les demandes, mes Spots (le lieu exact), **Sign out**.
8. **Se déconnecter sans les trois clés** : avec un compte qui n'est pas
   membre, le coin haut gauche → **Sign out** est là.
9. **La boussole (téléphone)** : à gauche de la manette, « align ·
   compass ». Touche → autorise → le radar tourne avec toi ; les Spots
   devant toi grossissent, la ligne d'état dit `n ahead`.
10. **Aux États-Unis** (fuseau de l'appareil) : les distances en `mi`.

Un écran vide ou un bouton mort → colle ça dans la console et envoie tout :

```js
console.log(JSON.stringify({diag:window.__totehm_space?.(),url:location.pathname+location.hash,appels:performance.getEntriesByType('resource').filter(r=>r.name.includes('/rest/v1/rpc/')).map(r=>r.name.split('?')[0].split('/').pop()+' '+Math.round(r.duration)+'ms')},null,2))
```
