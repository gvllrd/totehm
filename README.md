# TOTEHM

Tout le code de TOTEHM : quatre sites et leur serveur. **GitHub est la référence** ; ce qui arrive sur `main` est en
ligne une minute plus tard (Vercel).

| site | dossier | ce que c'est |
|---|---|---|
| **totehm.com** | `com/` | l'écosystème : les 5 vues, ton TOTEHM, chercher un membre, s'abonner à lui |
| **figher.club** | `club/` | la sixième vue : le radar et la grille des spots visibles, le filtre par Habits parentes, publier un spot |
| **higher.boutique** | `boutique/` | les vêtements totehmisés à partir d’un élément personnel, dans n’importe quelle catégorie |
| **totehm.space** | `space/` | Lisbon : dôme noir brut, sept intentions, laboratoire THP et 22 signes interactifs ; île, océan et ciel étoilé conservés. New York : château, six œuvres Think same but opposite et statue submergée ; œuvres et marché indépendants |
| — | `backend/` | le serveur : base Supabase, fonctions, automatisations n8n |

```
                 ↑ GET HIGHER (commune à tous)
  ← MES MÉDIAS   ● MON TOTEHM   → LES SPOTS      (← ● → = l'écosystème d'un membre)
                 ↓ HIGHER MY CHATGPT
```

Un tap sur **●** déploie le TOTEHM : HABITS · OBJECTIVES · REPULSIONS · VISIONS · MY STORY. Chaque box est une PHRASE : une habit dit son WHY (ses objectifs) et son TRIGGER · INSTEAD OF (ses répulsions — la Stoner method : chaque fois que tu veux faire ça, tu fais ça) ; un objectif dit HOW et VISION · THE BIG WHY ; une répulsion dit INSTEAD et WHY ; une vision dit HOW et LEARN FROM. Partout, un « + totehmize » emmène la box chez higher.boutique. Et dans tous les textes des quatre sites, le mot TOTEHM est le TOTEHM lui-même, qui tourne : recto le logo, verso ton nom. Chaque liste conserve son classement ; Higher GPT respecte ses rangs dans leur catégorie et leur source, avec les contraintes du moment. TotehmBot donne priorité aux Habits dues selon leur ordre natif et garde une rotation pour les autres, sans ajouter de notifications. Higher my ChatGPT retrouve ces priorités, leurs liens, les médias illustratifs en métadonnées et les spots associés, ainsi que les inspirations autorisées des TOTEHM auxquels le membre est abonné, toujours attribuées. Les playlists des intentions restent personnelles ; la réponse suit la langue de la conversation. Une Habit peut contenir son rythme dans son texte : reconnaissance locale de formulations courantes en 35 langues européennes et internationales, proposition à confirmer dans la box native, sans LLM ni transformation silencieuse du texte. Le champ Time frequency conserve les mots confirmés à côté du rythme utilisé pour les check-ins ; une heure ou une exception ne programme pas une alerte exacte. « where I usually do it » décrit le cadre habituel, distinct d’un spot daté et localisé. Higher GPT et Prepare lisent ces deux informations avec cette distinction. Les mots confirmés du champ Time frequency sont conservés à côté du rythme de check-in ; une heure précise ou une exception ne programme pas une alerte. « where I usually do it » conserve le contexte habituel, distinct d’un spot avec lieu et moment précis ; Higher GPT et Prepare lisent cette distinction après demande explicite. Le TOTEHM porte les choix ; TotehmBot envoie une notification avec la Habit complète et Done/Missed, sans menu ni questionnaire automatique. Prepare ouvre facultativement sa box native dans Telegram (connexion totehm.com requise), avec illustrations et spots privés ; Show linked text apporte ses seuls liens personnels dans le chat sur demande explicite, sans exporter les photos ni noter une pratique. Le lien Stoner conserve les conditions d’accès du parcours ; le dashboard montre les faits sur 7 ou 28 jours, puis la configuration du bot. Higher ChatGPT peut lire la même période après partage explicite et proposer un ajustement sur demande, sans écrire dans le TOTEHM ou dans sa mémoire native.

La connexion Higher GPT est gratuite côté TOTEHM : préparation sur demande, suivi mécanique, aucun nouveau modèle serveur en boucle. Les seuls abonnements proposés sont ceux aux créateurs ; vêtements et œuvres restent des achats distincts. Sur demande explicite, un contexte peut réunir des spots du Club de membres hors abonnements et un passage vers la boutique pour un élément personnel ; aucun achat, média ou style n’est sélectionné automatiquement.

La creator economy est à retravailler : rendre la valeur et le prix **annuel** lisibles, préserver l’attribution et la distinction inspiration/adoption, empêcher les doubles souscriptions et rapprocher les comptes. Le partage est 80/20 ; les 7 % concernent la revente d’art. La découverte et l’import manuel doivent respecter la confidentialité de chaque élément.

## Règle n° 1 — les boxes sont la marque

**Règle n° 1 — les boxes sont un invariant de marque.** Toute représentation visuelle d’un élément du TOTEHM, dans le TOTEHM ou ailleurs dans l’écosystème, conserve strictement sa box native : forme, couleur de catégorie, typographie, proportions, traits d’intention et états. Réutiliser le rendu de référence ; aucun composant, carte, badge ou style local ne le réinterprète. Une évolution se fait à la source puis se répercute partout, jamais sur un seul écran. Référence visuelle : `BRAND.md`.

## Les fichiers

| où | quoi |
|---|---|
| `com/totehm.html` · `tracking.mjs` · `habit-rhythm.mjs` · `telegram-practice.mjs` | l’app et son dashboard privé ; réglages du suivi et partage explicite avec Higher ChatGPT |
| `com/auth.html` · `creator.html` · `higher.html` | la connexion des 4 sites · la page d'un membre (`/@nom`) · le renvoi vers Higher GPT gratuit |
| `com/console.html` · `monetize.html` · `terms.html` | l'ancienne console (encore liée par les paiements) · la plaquette créateur · les conditions |
| `com/map.html` · `spot.html` | les lieux ouverts par TotehmBot ; `/higherself` et `/club/totehmbot` sont des redirections historiques |
| `club/index.html` · `club/create.html` | le Club (RADAR \| GRID, filtre, prise de spot) · l'ancien moteur, encore ouvert par TotehmBot |
| `boutique/index.html` · `streetwear.html` · `luxury.html` · `terms_of_sale.html` | l'accueil · Streetwear · Luxury sur devis · les conditions de vente |
| `space/index.html` + `gallery-*.mjs` | la galerie 3D, dont le mur des six oppositions à New York |
| `space/get_higher.html` · `stoner.html` · `play_lisbon_street.html` · `think_same_but_opposite.html` · `market.html`… | les œuvres, les six parcours Discover et le marché de l'art |
| `*/art-bridge.html` | les anciens liens d'œuvres (et les retours de paiement) → totehm.space, connexion gardée |
| `backend/supabase/functions/_shared/tracking-*.ts` | notifications déterministes : Done/Missed dans le même message, périodes conservées, historique intact, livraisons vérifiées, horaires et plafonds ; `/prepare`, `/review`, `/settings`, `/pause`, `/resume` ; préparation explicite, aucune photo exportée |
| `backend/supabase/migrations/` · `functions/` | les modifications de la base, dans l'ordre · les 40 fonctions serveur |
| `backend/n8n/` | les automatisations du vêtement (A → F) et la VM Oracle |
| `tools/` | 13 blocs communs, copiés dans les pages (connexion, coin membre, **le mot TOTEHM qui devient la pièce**, envoi vidéo Bunny, confidentialité, loupe, menu, survol) |
| `tests/` | les tests (navigateur avec une base simulée, SQL, logique) |

## Les documents

`CLAUDE.md` = les règles pour construire (lu par Claude à chaque session) · `BRAND.md` = la marque ·
`CLAUDE_CODE.md` = les tâches de ton terminal · `<dossier>/CLAUDE.md` = l'état d'un site. L'histoire : `git log`.

## Sur ta machine seulement (exprès : le dépôt est public)

`oracle/` (clés de la VM) · `TOTEHM_MASTER.md` (ta stratégie, tes prix) · les `.env` (clés). `.gitignore` les bloque.
Aucun secret n'est jamais passé sur GitHub (vérifié le 21/10/2026 sur tout l'historique).
