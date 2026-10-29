# TOTEHM

Tout le code de TOTEHM : quatre sites et leur serveur. **GitHub est la référence** ; ce qui arrive sur `main` est en
ligne une minute plus tard (Vercel).

| site | dossier | ce que c'est |
|---|---|---|
| **totehm.com** | `com/` | l'écosystème : les 5 vues, ton TOTEHM, chercher un membre, s'abonner à lui, l'abonnement Higher |
| **figher.club** | `club/` | le prolongement de la vue Spots : chercher, publier des spots, se rencontrer |
| **higher.boutique** | `boutique/` | les vêtements totehmisés à partir des boxes MY STORY |
| **totehm.space** | `space/` | deux galeries : Lisbon à façade d’azulejos et New York à façade de briques sur cinq niveaux ; autres parois en verre, pierre ancienne et grand feu communs ; œuvres et marché indépendants |
| — | `backend/` | le serveur : base Supabase, fonctions, automatisations n8n |

```
                 ↑ GET HIGHER (commune à tous)
  ← MES MÉDIAS   ● MON TOTEHM   → LES SPOTS      (← ● → = l'écosystème d'un membre)
                 ↓ HIGHER SELF (TotehmBot)
```

Un tap sur **●** déploie le TOTEHM : HABITS · OBJECTIVES · REPULSIONS · VISIONS · MY STORY.

## Les fichiers

| où | quoi |
|---|---|
| `com/totehm.html` | l'app totehm.com (toutes les vues) |
| `com/auth.html` · `creator.html` · `higher.html` | la connexion des 4 sites · la page d'un membre (`/@nom`) · la vente de Higher |
| `com/console.html` · `monetize.html` · `terms.html` | l'ancienne console (encore liée par les paiements) · la plaquette créateur · les conditions |
| `com/higherself.html` · `map.html` · `spot.html` · `club/totehmbot.html` | ce qu'ouvre TotehmBot sur Telegram |
| `club/index.html` · `club/create.html` | le Club (radar) · son moteur de spot, ouvert dans totehm.com |
| `boutique/index.html` · `streetwear.html` · `luxury.html` · `terms_of_sale.html` | l'accueil · Streetwear · Luxury sur devis · les conditions de vente |
| `space/index.html` + `gallery-*.mjs` | la galerie 3D |
| `space/get_higher.html` · `stoner.html` · `play_lisbon_street.html` · `market.html`… | les œuvres et le marché de l'art |
| `*/art-bridge.html` | les anciens liens d'œuvres (et les retours de paiement) → totehm.space, connexion gardée |
| `backend/supabase/migrations/` · `functions/` | les modifications de la base, dans l'ordre · les 40 fonctions serveur |
| `backend/n8n/` | les automatisations du vêtement (A → F) et la VM Oracle |
| `tools/` | 8 blocs communs, copiés dans les pages (connexion, confidentialité, loupe, menu, survol) |
| `tests/` | les tests (navigateur avec une base simulée, SQL, logique) |

## Les documents

`CLAUDE.md` = les règles pour construire (lu par Claude à chaque session) · `BRAND.md` = la marque ·
`CLAUDE_CODE.md` = les tâches de ton terminal · `<dossier>/CLAUDE.md` = l'état d'un site. L'histoire : `git log`.

## Sur ta machine seulement (exprès : le dépôt est public)

`oracle/` (clés de la VM) · `TOTEHM_MASTER.md` (ta stratégie, tes prix) · les `.env` (clés). `.gitignore` les bloque.
Aucun secret n'est jamais passé sur GitHub (vérifié le 21/10/2026 sur tout l'historique).
