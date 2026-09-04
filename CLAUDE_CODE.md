# CLAUDE_CODE.md — lot « LA VILLE · LA RECHERCHE · HIGHERSELF » · 04/09/2026

> Le zip contient **tout l'historique du repo**. Ce fichier nomme précisément
> ce qu'il faut prendre. **Ignore tout le reste.**

---

## 0 · CE QUI EST DÉJÀ FAIT EN PRODUCTION — NE PAS REFAIRE

SQL appliqué et Edge Functions déployées directement sur
`abujjbkbbiumxrokozph`. Vérifié, mesuré, relu depuis l'API. **Il ne reste que
le front et les commits à pousser.**

| Objet | État | Version |
|---|---|---|
| migration `local_agendas_search_higherself` | ✅ appliquée | `20260904093833` |
| migration `search_totehms_and_higherself_state` | ✅ appliquée | `20260904093917` |
| migration `live_near_serves_real_source` | ✅ appliquée | `20260904094305` |
| migration `higherself_state_for_the_bot` | ✅ appliquée | `20260904095917` |
| cron `agenda-ingest` (`7 5 * * *`) | ✅ actif | — |
| cron `bot-tick` (`7 * * * *`) | ✅ actif | jobid 4 |
| edge `agenda-ingest` | ✅ déployée | **v2** |
| edge `bot-reply` | ✅ déployée | **v17** |
| edge `higher-map` | ✅ déployée | v26 (inchangée depuis le lot 1) |
| edge `bot-tick` | ✅ déployée | v14 (inchangée) |

🛑 **NE LANCE PAS `supabase db push`.** Les quatre migrations sont déjà
enregistrées sous les versions ci-dessus. La divergence signalée au lot 1
(trois fichiers `20260903*` dont le contenu est en prod sous d'autres numéros)
n'est toujours **pas** tranchée : un `db push` les rejouerait.

🛑 **NE REDÉPLOIE AUCUNE EDGE FUNCTION.** En particulier pas `higher-checkout` :
sur `main` elle porte encore l'ancienne tarification.

⚠️ **Un fichier de migration a été SCINDÉ EN DEUX.** Si tu as déjà appliqué le
lot 1, tu as peut-être
`backend/supabase/migrations/20260904090000_local_agendas_search_higherself.sql`
en local — **supprime-le** : il portait un numéro que la base ne connaît pas,
et son contenu est désormais réparti sur les deux fichiers `20260904093833`
et `20260904093917`, qui eux correspondent exactement à ce qui est enregistré
en production.

---

## 1 · CE QU'IL FAUT PRENDRE DU ZIP

```
CLAUDE.md
BRAND.md
CLAUDE_CODE.md
backend/README.md
backend/SYSTEM.md

backend/supabase/functions/_shared/agenda.ts                                  ← NOUVEAU
backend/supabase/functions/_shared/agenda_test.ts                             ← NOUVEAU
backend/supabase/functions/agenda-ingest/index.ts                             ← NOUVEAU
backend/supabase/functions/bot-reply/index.ts                                 ← v6

backend/supabase/migrations/20260904093833_local_agendas.sql                   ← NOUVEAU
backend/supabase/migrations/20260904093917_search_totehms_and_higherself_state.sql ← NOUVEAU
backend/supabase/migrations/20260904094305_live_near_serves_real_source.sql    ← NOUVEAU
backend/supabase/migrations/20260904095917_higherself_state_for_the_bot.sql    ← NOUVEAU

space/higherself.html                                                          ← RÉÉCRIT
space/totehm.html
space/map.html
space/book.html
space/next_objective.html
space/vercel.json
```

`map.html`, `book.html` et `next_objective.html` ne changent **que** par le
bloc de survol régénéré (`tools/hover.py`, obligatoire après toute
modification de CSS dans `space/`). Prends-les quand même : un bloc généré à
moitié est un bloc faux.

Et si le lot 1 n'a **jamais** été poussé, prends aussi :

```
backend/supabase/functions/_shared/live.ts
backend/supabase/functions/higher-map/index.ts
backend/supabase/functions/bot-tick/index.ts
backend/supabase/migrations/20260903232507_live_layer_ticketmaster.sql
backend/supabase/migrations/20260903233545_push_decision_habit_outcomes.sql
backend/supabase/migrations/20260903233709_bot_tick_cron.sql
```

**Rien d'autre.** Pas `com/`, pas `boutique/`, pas les autres fonctions.

Et supprime l'ancien fichier scindé :

```bash
rm -f ~/totehm/backend/supabase/migrations/20260904090000_local_agendas_search_higherself.sql
```

---

## 2 · LE GREP DE CONTRÔLE — AVANT DE COMMITTER

Si une seule ligne sort autre chose que ce qui est annoncé, tu as pris une
vieille version : arrête et redemande le zip.

```bash
cd ~/totehm

# ── bot-reply est bien la v6 ─────────────────────────  attendu : 1
grep -c "bot-reply v6" backend/supabase/functions/bot-reply/index.ts

# ── le bouton qui ouvre la mini-app dans Telegram ────  attendu : 1
grep -c "web_app: { url: APP }" backend/supabase/functions/bot-reply/index.ts

# ── /moi existe ──────────────────────────────────────  attendu : 1
grep -c 'text === "/moi"' backend/supabase/functions/bot-reply/index.ts

# ── la vieille recherche a DISPARU ───────────────────  attendu : 0
#    `openTotehmView` ouvrait le Totehm du premier resultat au hasard,
#    `NETWORK` etait le tableau de trois profils inventes.
grep -c "openTotehmView\|const NETWORK" space/totehm.html

# ── la nouvelle recherche est branchee ───────────────  attendu : 1
grep -c "rpc('search_totehms'" space/totehm.html

# ── la mini-app lit l etat en UN appel ───────────────  attendu : 1
grep -c "rpc('higherself_state'" space/higherself.html

# ── la mini-app porte son diagnostic ─────────────────  attendu : 1
grep -c "window.__totehm_self = {" space/higherself.html

# ── les trois parseurs sont importes par l ingest ────  attendu : 1
grep -c 'from "../_shared/agenda.ts"' backend/supabase/functions/agenda-ingest/index.ts

# ── le mode discover existe (on ne devine plus) ──────  attendu : 1
grep -c "async function discover" backend/supabase/functions/agenda-ingest/index.ts

# ── les quatre migrations du 04/09 sont la ───────────  attendu : 4
ls backend/supabase/migrations/2026090409*.sql | wc -l

# ── et l ancien fichier scinde a disparu ─────────────  attendu : 0
ls backend/supabase/migrations/20260904090000_* 2>/dev/null | wc -l
```

**Les en-têtes de la mini-app se vérifient sur le SENS, pas sur le mot.** Les
deux commentaires du fichier contiennent « X-Frame-Options » et
« frame-ancestors » — un `grep -c` remonterait ces commentaires et crierait au
loup. On lit le JSON :

```bash
python3 - <<'PY'
import json
d = json.load(open('space/vercel.json'))
k = lambda r: {h['key'] for h in r['headers']}

# ATTENTION : `'higherself' in source` matche AUSSI le negative lookahead
# `/((?!higherself).*)`, qui contient le mot. Ma premiere version de ce
# controle criait au loup pour cette raison exacte. On teste la regle qui
# SERT la mini-app : celle dont la source COMMENCE par /higherself.
sert = [r for r in d['headers'] if r['source'].startswith('/higherself')]

print('regles qui posent X-Frame-Options :',
      [r['source'] for r in d['headers'] if 'X-Frame-Options' in k(r)])
print('regles qui servent la mini-app    :', [r['source'] for r in sert])
print('  dont une bloque l iframe        :',
      [r['source'] for r in sert if 'X-Frame-Options' in k(r)] or 'AUCUNE  <- attendu')
print('  toutes portent une CSP          :',
      bool(sert) and all('Content-Security-Policy' in k(r) for r in sert))
PY
# attendu :
#   regles qui posent X-Frame-Options : ['/((?!higherself).*)']
#   regles qui servent la mini-app    : ['/higherself', '/higherself.html']
#     dont une bloque l iframe        : AUCUNE  <- attendu
#     toutes portent une CSP          : True
```

**Les parseurs, testés sur des chaînes réelles** (aucun réseau, ~15 s) :

```bash
cd ~/totehm/backend/supabase/functions/_shared
deno run --no-lock agenda_test.ts
# attendu : ✓ agenda.ts — 18 assertions, tous les formats
cd ~/totehm
```

**Aucune valeur de secret ne part** — on cherche la FORME d'une clé, pas le
mot `service_role` (légitime dans chaque `grant execute ... to service_role`).
La clé `anon` est publique par nature et vit déjà en dur dans les `.html` :
elle est exclue. Le `.` **doit** rester dans la classe, sinon un JWT se
découpe en deux jetons et aucun ne correspond plus à la clé qu'on exclut.

```bash
git diff \
  | grep -oE "(sk_(live|test)_[A-Za-z0-9]{10,}|whsec_[A-Za-z0-9]{10,}|re_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_.-]{30,})" \
  | grep -vcF "cm9sZSI6ImFub24i"   # "role":"anon" en base64
# attendu : 0
```

> ⚠️ **Un grep de contrôle qui crie au loup est pire que pas de grep.** Les
> commentaires qui expliquent une correction doivent rester : ce sont eux qui
> empêchent de refaire le bug. C'est le contrôle qui s'adapte, jamais le code.

---

## 3 · LES COMMITS — un par changement, jamais `git add .`

`oracle/` contient les clés SSH. **Toujours nommer les fichiers.**

```bash
cd ~/totehm

# 0 — le fichier scinde disparait (il portait un numero inconnu de la base)
git rm --cached -f backend/supabase/migrations/20260904090000_local_agendas_search_higherself.sql 2>/dev/null || true

# 1 — le jeton d appel interne, generalise
git add backend/supabase/migrations/20260904093833_local_agendas.sql
git commit -m "feat(db): edge_tokens + edge_call sur liste blanche, live_sources et son cron"

# 2 — la couche LOCALE : trois parseurs de format, N sources
git add backend/supabase/functions/_shared/agenda.ts \
        backend/supabase/functions/_shared/agenda_test.ts \
        backend/supabase/functions/agenda-ingest/index.ts
git commit -m "feat(map): couche locale — ICS/JSON-LD/RSS, sources declarees, mode discover"

# 3 — la source n est plus un litteral
git add backend/supabase/migrations/20260904094305_live_near_serves_real_source.sql
git commit -m "fix(db): live_near renvoyait 'ticketmaster' en dur, ecrit au temps de la source unique"

# 4 — la recherche rend une liste
git add backend/supabase/migrations/20260904093917_search_totehms_and_higherself_state.sql
git commit -m "feat(db): search_totehms classee et ouverte a anon, higherself_state en un appel"

# 5 — HigherSelf pour le bot aussi
git add backend/supabase/migrations/20260904095917_higherself_state_for_the_bot.sql
git commit -m "feat(db): higherself_state(p_user) — la session gagne toujours sur l argument"

# 6 — TotehmBot devient une surface
git add backend/supabase/functions/bot-reply/index.ts
git commit -m "feat(bot): v6 — bouton web_app, /moi /wisdom /objectif /spots"

# 7 — le front : la recherche et la mini-app
git add space/totehm.html space/higherself.html
git commit -m "fix(space): la recherche rend une liste reelle, HigherSelf devient la mini-app"

# 8 — l en-tete qui aurait tue la mini-app
git add space/vercel.json
git commit -m "fix(space): X-Frame-Options bloquait higherself dans l iframe Telegram"

# 9 — le bloc de survol regenere
git add space/map.html space/book.html space/next_objective.html
git commit -m "chore(space): bloc de survol regenere (hover.py) apres les nouveaux styles"

# 10 — les documents, dans le MEME lot que le code
git add CLAUDE.md BRAND.md backend/SYSTEM.md backend/README.md CLAUDE_CODE.md
git commit -m "docs: couche locale, la recherche, HigherSelf, le piege X-Frame-Options"

git push
```

Vercel redéploie `space` tout seul au push.

---

## 4 · LA VÉRIFICATION APRÈS PUSH

```bash
# backend/ n'est servi par personne — DOIT renvoyer 404
curl -sL -o /dev/null -w "%{http_code}\n" https://www.totehm.space/backend/README.md

# LE POINT QUI COMPTE : la mini-app n'est PLUS bloquee dans une iframe
curl -sI https://www.totehm.space/higherself | grep -iE 'x-frame|content-security'
# attendu : AUCUN x-frame-options, et une CSP frame-ancestors citant telegram.org

# le reste du site reste protege
curl -sI https://www.totehm.space/totehm | grep -i x-frame-options
# attendu : X-Frame-Options: SAMEORIGIN
```

Et dans le SQL editor Supabase :

```sql
-- le lot, en une requete
select
  (select count(*) from public.live_sources)                             as sources,     -- 18
  (select count(*) from cron.job where jobname='agenda-ingest' and active) as cron_agenda, -- 1
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in
      ('search_totehms','higherself_state','spot_search',
       'add_wisdom_admin','add_objective_admin'))                        as fonctions;   -- 5

-- la recherche, sans etre connecte
select * from public.search_totehms('wa', 8);

-- sonder les agendas sans rien ecrire
select public.edge_call('agenda-ingest', '{"mode":"probe"}'::jsonb);
select status_code, content from net._http_response order by id desc limit 1;
```

---

## 5 · CE QUI RESTE À WAH — les clics dans un dashboard

### A. LE BRIEF GEMINI — trouver des agendas qui publient vraiment

**C'est l'action la plus importante du lot.** Le tuyau est posé, testé, câblé
sur un cron : il ne coûte rien et il ne rapporte rien tant qu'aucune source
lisboète ne publie un flux. J'ai sondé 18 sources × 11 chemins normalisés :
**zéro flux exploitable.** Ce n'est pas un problème d'ingénierie, c'est un
problème de terrain — donc ce n'est pas moi qui le résous.

| | |
|---|---|
| **QUI** | Wah |
| **POURQUOI** | sans une seule source qui publie, la moitié « ville » de la carte reste vide à Lisbonne — là où tourne le produit |
| **OÙ** | Gemini, en collant le brief ci-dessous |
| **ACTION** | coller, récupérer la réponse, me la renvoyer |
| **VALEUR ATTENDUE** | une liste d'URL de flux, chacune finissant par `.ics`, `?ical=1`, `/feed/`, ou une page dont le HTML contient `application/ld+json` |
| **OÙ LA STOCKER** | nulle part — tu me renvoies la liste, j'écris les lignes dans `live_sources` |

```
[POUR GEMINI]

CONTEXTE
TOTEHM est une carte qui montre à un membre les lieux et les événements qui
correspondent à ses habitudes, à Lisbonne et dans le monde. La couche mondiale
est branchée sur Ticketmaster. Ticketmaster ne couvre pas le Portugal.

Notre ingestion lit trois formats standards, et RIEN d'autre :
  1. ICS / iCalendar (RFC 5545) — une URL finissant par .ics, ou ?ical=1
  2. JSON-LD schema.org/Event — un <script type="application/ld+json"> dans
     la page, contenant "@type":"Event" avec une "startDate"
  3. RSS 2.0 AVEC une date de DÉBUT d'événement (ev:startdate, startDate ou
     dc:date) — un flux qui ne porte que la date de publication est inutile

J'ai déjà sondé 18 publishers lisboètes (Agenda Cultural de Lisboa, la CML,
les grandes salles, les musées) sur 11 chemins normalisés — REST WordPress,
The Events Calendar, ?ical=1, .ics, /feed/. AUCUN ne rend un flux exploitable.

OBJECTIF
Trouver des sources qui publient l'agenda culturel de Lisbonne dans l'un de
ces trois formats. Priorité : musique live, expositions, sport, ateliers,
marchés, événements de quartier.

CONTRAINTES
· Gratuit, sans inscription, sans clé API — ou une clé gratuite obtenue en
  moins de cinq minutes.
· Pas de scraping HTML : un site sans flux ne nous intéresse pas.
· Pas d'API fermée aux nouveaux comptes (Songkick, Eventbrite, Meetup Pro :
  déjà écartés, ne pas les proposer).
· Une source qui publie 20 événements par mois vaut mieux qu'un agrégat
  géant qui demande un contrat.

Pistes à creuser explicitement, sans t'y limiter :
· salles et clubs lisboètes tournant sous WordPress + The Events Calendar
  (l'export .ics y est activé par défaut, il suffit de le trouver)
· agendas universitaires et instituts culturels étrangers à Lisbonne
  (Goethe, Instituto Cervantes, Institut français, British Council…)
· plateformes de billetterie européennes qui exposent du JSON-LD dans leurs
  pages événement (Bandsintown, Dice, Resident Advisor, Shotgun, Ticketline,
  BOL, Bilheteira Online…) — vérifie la page, pas la brochure
· open data municipal portugais (dados.gov.pt, dados.cm-lisboa.pt) : y a-t-il
  un jeu de données « eventos » avec une URL stable ?

ATTENDU
Un tableau. Une ligne par source, dans cet ordre exact :
  nom | url_du_flux | format (ics|jsonld|rss) | ce que tu as VÉRIFIÉ | volume estimé

La colonne « ce que tu as VÉRIFIÉ » doit dire ce que tu as réellement ouvert :
« la page /events/?ical=1 rend un fichier BEGIN:VCALENDAR », pas « ce site
utilise probablement WordPress ». Une URL non vérifiée me coûte plus de temps
qu'aucune URL. Si tu n'as rien trouvé pour une piste, écris-le.
```

### B. LE TEST NAVIGATEUR — dix minutes, dans cet ordre

1. **`totehm.space` sans être connecté** → taper deux lettres dans Search.
   Attendu : une **liste** de noms cliquables, ou « no shared Totehm by that
   name ». Plus jamais l'ouverture directe du Totehm d'un inconnu, plus jamais
   trois profils qui n'existent pas.
2. Menu membre → **Connect TotehmBot** → `/start` dans Telegram.
   Attendu : « C'est lié » **et** un bouton *Ouvrir mon Totehm* sous le message.
3. **Appuyer sur ce bouton.** Attendu : HigherSelf s'ouvre **dans Telegram**,
   plein écran, quatre onglets NOW · WISDOM · NEXT · SPOTS, tes habitudes
   affichées avec leur série. ⚠️ **C'est le test qui compte** — si le cadre
   reste noir sur Telegram Web, le déploiement Vercel n'a pas pris `vercel.json`.
4. Dans l'onglet NOW : appuyer **DONE** sur une habitude. Le chiffre bouge.
5. Dans Telegram, en texte : `/moi`. Attendu : les mêmes chiffres qu'à l'écran.
   **Deux surfaces, un seul calcul** — s'ils divergent, dis-le-moi tout de suite.
6. `/wisdom on ne rattrape jamais une nuit blanche` → la leçon apparaît dans
   l'onglet WISDOM et dans `book.html` sur le site.
7. Onglet SPOTS → **poser un lieu** (position, intention, silent/social).
   Puis `/spots` dans Telegram : le lieu remonte.

Bug constaté → **un seul bloc à coller**, et renvoie-moi la sortie. Depuis la
mini-app, ouvre-la dans un navigateur normal (`totehm.space/higherself`) — on
ne peut pas ouvrir la console dans Telegram :

```js
copy(JSON.stringify({
  page: location.pathname,
  etat: window.__totehm_self || null,
  map:  window.__totehm_map  || null,
  tg:   !!(window.Telegram && window.Telegram.WebApp),
  ua:   navigator.userAgent
}, null, 2))
```

### C. RESTE DU LOT 1, TOUJOURS OUVERT

Rien de tout ça n'a bougé — je les répète parce qu'ils bloquent encore :

| | Action | Pourquoi ça compte |
|---|---|---|
| **`TICKETMASTER_API_KEY`** | vérifier / poser dans Supabase → Edge Functions → Secrets | `live_events` est à **0** et `tm_calls_today` à **0** : soit la clé manque, soit personne n'a ouvert la carte. Se tranche en une ligne : sur `totehm.space/map`, connecté, après avoir cliqué une intention, `copy(JSON.stringify(window.__totehm_map))` → `sources.ticketmaster` |
| **`TELEGRAM_WEBHOOK_SECRET`** | inventer une chaîne ≥ 32 car., la poser dans Supabase, **puis** `setWebhook` côté Telegram avec `secret_token` | sans lui, n'importe qui connaissant l'URL peut envoyer un faux message au bot |
| **`TELEGRAM_BOT_TOKEN`** | vérifier avec `getMe` que c'est bien `TotehmBot` | `SYSTEM.md` note depuis le 17/08 que la valeur posée est celle de TotehmManager, abandonné |
| **`EVENTBRITE_API_KEY`** & co. | supprimer | secrets morts : ils laissent croire qu'une couche existe |

---

## 6 · CE QUE J'AI TROUVÉ ET QUE JE N'AI PAS TOUCHÉ

À trancher, pas à corriger en douce :

- **Lisbonne ne publie pas.** Mesuré, pas supposé (§5.A). Le réflexe naturel
  serait d'écrire un scraper HTML par site : **non.** Ça se casse au premier
  redesign, en silence, et il faut le re-maintenir pour chacun. Le jour où on
  n'a vraiment pas le choix, on paie une source agrégée.
- **`spots` est toujours VIDE** (0 ligne). Elle portait 125 lignes le 19/08.
  La couche éditoriale de la carte n'existe donc plus : seuls les drops
  membres la remplissent désormais. Si un dump existe, c'est maintenant.
- **`higher-checkout`** : repo 17 €/29 €, prod cinq paliers, front 30 $ fixe.
  Trois vérités. Ne rien redéployer avant de trancher.
- **Trois migrations `20260903*` du repo** ne correspondent à aucune version
  enregistrée en base (leur contenu y est, sous d'autres numéros). Tant que ce
  n'est pas tranché, `supabase db push` est interdit.

---

```bash
rm -rf ~/inbox/*
```
