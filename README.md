# TOTEHM

Tout le code de TOTEHM : quatre sites et leur serveur. **GitHub est la référence** ; ce qui arrive sur `main` est en
ligne une minute plus tard (Vercel).

| site | dossier | ce que c'est |
|---|---|---|
| **totehm.com** | `com/` | l'écosystème : ton TOTEHM et ses cinq vues, Higher my ChatGPT, chercher l'écosystème d'un membre et s'y abonner, être payé pour le sien |
| **figher.club** | `club/` | se rencontrer : les spots de tous les membres (Radar et Grid), le filtre par Habits semblables, publier un spot |
| **higher.boutique** | `boutique/` | les vêtements totehmisés à partir d'une box ; le Luxe, une pièce d'exception avec un artiste local |
| **totehm.space** | `space/` | les œuvres en 3D (Lisbon, New York, Origin) et le TotehmPaper |
| — | `backend/` | le serveur : la base Supabase, les fonctions, l'argent (Stripe), le bot, les automatisations n8n |

```
                 ↑ HIGHER MY CHATGPT (gratuit)
  ← MES MÉDIAS   ● MON TOTEHM   → MES SPOTS      (← ● → = l'écosystème d'un membre, ouvert par l'abonnement)
                 ↓ GET HIGHER (le TotehmPaper)
```

Un tap sur **●** déploie le TOTEHM : HABITS · OBJECTIVES · REPULSIONS · VISIONS · MY STORY. Chaque box est une PHRASE
(why · trigger · instead of · how · vision…) et porte son « + totehmize » vers higher.boutique. Le verso, c'est le
compte : **Go Higher** (ma pratique sur 7 ou 28 jours, TotehmBot) et **Monetize my TOTEHM** (mon prix, ce que je gagne).
Sur ordinateur, recto et verso ont le même format et se retournent l'un sur l'autre.
Higher GPT et TotehmBot lisent les mêmes Habits, MY STORY et liens why que l'app : la date distingue l'objectif de la
vision. Le connecteur et le bot utilisent les noms natifs ; les anciens ponts de la base restent en place jusqu'à leur lot de retrait.

**Ce qui se vend.** Un seul abonnement : celui d'un membre à un autre membre, à l'année, au prix choisi par le créateur,
80 % pour lui (versés le 1er dès 25 €). Higher my ChatGPT et TotehmBot sont gratuits. Les vêtements, le Luxe et les
œuvres sont des achats séparés. L'accueil reste minimal ; **[Discover]** explique tout, un écran par idée, quand on le
demande (totehm.com et figher.club, le même moteur).

**La confidentialité.** Une box est private ou visible to my subscribers (deux mots, dans la box) ; ses médias suivent.
Un spot a ses trois niveaux (private · my subscribers · figher club) et ne monte jamais au-dessus de sa box.

## Les fichiers

| où | quoi |
|---|---|
| `com/totehm.html` | l'app : l'accueil et ses cinq vues, le TOTEHM déployé, le verso (Go Higher, Monetize), le Discover |
| `com/creator.html` | `/@nom` (la page d'abonnement d'un membre, en Discover) ; `/search` n'y fait plus que renvoyer au verso du TOTEHM, où vit la recherche de [Members] |
| `com/chatgpt.html` · `monetize.html` · `auth.html` | la connexion ChatGPT · la vente aux créateurs · la connexion des quatre sites |
| `com/console.html` · `map.html` · `spot.html` · `terms.html` | les retours de paiement · les liens de TotehmBot · les conditions |
| `club/index.html` · `club/create.html` | le Club · l'ancien moteur, encore ouvert par TotehmBot |
| `boutique/*.html` · `space/*.html` | la boutique · les œuvres et le marché de l'art |
| `backend/supabase/migrations/` · `functions/` | les changements de la base, dans l'ordre · les fonctions serveur (dont `health`) |
| `backend/n8n/` | les automatisations du vêtement |
| `tools/` | les blocs communs, COPIÉS dans les pages (`python3 tools/recopier.py` recopie et vérifie ; `tools/hover.py` le survol) |
| `tests/` | navigateur avec une base simulée, SQL, logique ; `tests/prod/sonde_anonyme.sh` sonde la production sans compte |

## Les documents

`CLAUDE.md` = les règles pour construire · `BRAND.md` = la marque · `CLAUDE_CODE.md` = les tâches de ton terminal ·
`<dossier>/CLAUDE.md` = l'état d'un site. L'histoire : `git log`.

## Sur ta machine seulement (exprès : le dépôt est public)

`oracle/` (clés de la VM) · `TOTEHM_MASTER.md` (ta stratégie, tes prix) · les `.env` (clés). `.gitignore` les bloque.
Aucun secret n'est jamais passé sur GitHub.
