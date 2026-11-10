# TOTEHM

Tout le code de TOTEHM : quatre sites et leur serveur. **GitHub est la référence** ; ce qui arrive sur `main` est en
ligne une minute plus tard (Vercel).

| site | dossier | ce que c'est |
|---|---|---|
| **totehm.com** | `com/` | l'écosystème : les 5 vues, ton TOTEHM, chercher un membre, s'abonner à lui, l'abonnement Higher |
| **figher.club** | `club/` | la sixième vue : le radar et la grille des spots visibles, le filtre par Habits parentes, publier un spot |
| **higher.boutique** | `boutique/` | les vêtements totehmisés à partir des boxes MY STORY |
| **totehm.space** | `space/` | deux galeries littorales de plain-pied : Lisbon retrouve son bâtiment intact aux azulejos bleu/blanc, balcons et toit de verre ondulé ; New York conserve son château en ruine et son toit vitré incliné ; mer, ciel étoilé, œuvres, signes de Lisbonne et marché conservés |
| — | `backend/` | le serveur : base Supabase, fonctions, automatisations n8n |

```
                 ↑ GET HIGHER (commune à tous)
  ← MES MÉDIAS   ● MON TOTEHM   → LES SPOTS      (← ● → = l'écosystème d'un membre)
                 ↓ HIGHER MY CHATGPT
```

Un tap sur **●** déploie le TOTEHM : HABITS · OBJECTIVES · REPULSIONS · VISIONS · MY STORY. Chaque liste conserve son classement ; Higher my ChatGPT retrouve ces priorités, leurs liens et les playlists des intentions, dans la langue de la conversation. Le TOTEHM porte les choix ; TotehmBot recueille les déclarations dans Telegram ; le dashboard montre les faits ; le partage facultatif des bilans permet à Higher ChatGPT de proposer des ajustements, sans écrire dans le TOTEHM ou dans sa mémoire native.

## Les fichiers

| où | quoi |
|---|---|
| `com/totehm.html` · `tracking.mjs` | l’app et son dashboard privé ; réglages du suivi et partage explicite avec Higher ChatGPT |
| `com/auth.html` · `creator.html` · `higher.html` | la connexion des 4 sites · la page d'un membre (`/@nom`) · la vente de Higher |
| `com/console.html` · `monetize.html` · `terms.html` | l'ancienne console (encore liée par les paiements) · la plaquette créateur · les conditions |
| `com/higherself.html` · `map.html` · `spot.html` · `club/totehmbot.html` | ce qu'ouvre TotehmBot sur Telegram |
| `club/index.html` · `club/create.html` | le Club (RADAR \| GRID, filtre, prise de spot) · l'ancien moteur, encore ouvert par TotehmBot |
| `boutique/index.html` · `streetwear.html` · `luxury.html` · `terms_of_sale.html` | l'accueil · Streetwear · Luxury sur devis · les conditions de vente |
| `space/index.html` + `gallery-*.mjs` | la galerie 3D |
| `space/get_higher.html` · `stoner.html` · `play_lisbon_street.html` · `market.html`… | les œuvres et le marché de l'art |
| `*/art-bridge.html` | les anciens liens d'œuvres (et les retours de paiement) → totehm.space, connexion gardée |
| `backend/supabase/functions/_shared/tracking-*.ts` | suivi déterministe : quatre états, contexte facultatif, livraisons vérifiées, horaires et plafonds ; `/suivi`, `/bilan`, `/pause`, `/reprendre` |
| `backend/supabase/migrations/` · `functions/` | les modifications de la base, dans l'ordre · les 40 fonctions serveur |
| `backend/n8n/` | les automatisations du vêtement (A → F) et la VM Oracle |
| `tools/` | 11 blocs communs, copiés dans les pages (connexion, coin membre, envoi vidéo Bunny, confidentialité, loupe, menu, survol) |
| `tests/` | les tests (navigateur avec une base simulée, SQL, logique) |

## Les documents

`CLAUDE.md` = les règles pour construire (lu par Claude à chaque session) · `BRAND.md` = la marque ·
`CLAUDE_CODE.md` = les tâches de ton terminal · `<dossier>/CLAUDE.md` = l'état d'un site. L'histoire : `git log`.

## Sur ta machine seulement (exprès : le dépôt est public)

`oracle/` (clés de la VM) · `TOTEHM_MASTER.md` (ta stratégie, tes prix) · les `.env` (clés). `.gitignore` les bloque.
Aucun secret n'est jamais passé sur GitHub (vérifié le 21/10/2026 sur tout l'historique).
