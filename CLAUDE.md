# CLAUDE.md — construire TOTEHM

> Lu à chaque session, ≤ 100 lignes, au PRÉSENT. Un domaine : `<dossier>/CLAUDE.md`. La marque : `BRAND.md`.
> La carte des fichiers : `README.md`. L'histoire : `git log` (rien d'autre).

## Qui fait quoi

| qui | fait |
|---|---|
| **Claude, session cloud** | conçoit ET exécute : code, migrations, Edge Functions, push sur `main`, contrôle de la prod, Stripe (lecture, tests) |
| **Claude Code, terminal de Wah** | seulement ce qui exige sa machine : VM Oracle, n8n, et les migrations que le cloud ne passe pas (voir Base) |
| **Wah** | la vision, les tests sur téléphone, le « oui » avant : un prix live, un remboursement, l'endpoint webhook Stripe |

Wah fait le minimum (sauf OAuth, 2FA, décision produit). Une demande = un lot complet, sans plan à valider.
Push sur `main` = mise en ligne ; jamais réécrire l'historique.

## La vision (Wah, 21/10/2026)

| domaine | dossier | fonction |
|---|---|---|
| totehm.com | `com/` | l'écosystème : les 5 vues, la creator economy (s'abonner à un membre = entrer dans son écosystème), l'abonnement Higher, la recherche d'un membre |
| figher.club | `club/` | le prolongement de la vue Spots : chercher, publier des spots, se rencontrer |
| higher.boutique | `boutique/` | les vêtements totehmisés, un style artistique déterminé, à partir des boxes MY STORY ; production n8n |
| totehm.space | `space/` | le dernier temple au-dessus d’un monde englouti, sous une nuit étoilée ; trois expériences indépendantes et toute la marketplace |

**Deux fois cinq vues.** totehm.com : ↑ Get Higher (commune à tous) · ← mes médias · ● mon TOTEHM · → les spots ·
↓ Higher Self (TotehmBot, abonnement Higher) ; ← ● → = l'écosystème d'un membre, ouvert par l'abonnement à ce membre.
Le TOTEHM déployé : HABITS · OBJECTIVES · REPULSIONS · VISIONS · MY STORY. **Les boxes sont sacrées** : un seul rendu.

## L'architecture

`com/` `club/` `boutique/` `space/` = un site et un projet Vercel chacun ; les alias www et apex se vérifient sur
le déploiement de production de chaque projet. `backend/` n'est servi par
personne. `oracle/` : jamais lu, jamais recopié. Une base Supabase (`abujjbkbbiumxrokozph`), un webhook Stripe.
- Produits indépendants = fichiers indépendants : un bloc commun se COPIE depuis `tools/`, jamais importé.
- Chaque page porte `BUILD` et un diagnostic `__totehm_*()` (booléens et compteurs, jamais une donnée de membre).
- Aucun `.md` n'est servi (`.vercelignore`).

## Les règles absolues

- **Secrets** : jamais dans une conversation ni un fichier versionné (dépôt PUBLIC) ; `Deno.env.get()` seulement.
- **Git** : jamais `git add .` ; un commit par changement logique.
- **Base** : pas de `supabase db push`. Une migration s'applique UNE fois (`apply_migration`) et son fichier reste dans
  `backend/supabase/migrations/`. Le cloud ne passe pas : `drop`, `update`/`delete` sans `where`, `create or replace`
  d'une fonction existante, `alter policy` → fichier + une ligne dans `CLAUDE_CODE.md`. La base d'abord, le code ensuite.
  Grants APRÈS le dernier `create`. Table neuve : RLS sans politique, lue et écrite par fonction.
- **Identité** : totehm.com est l'autorité. Un satellite appelle `ssoLogin()` → `totehm.com/auth` (code + PKCE) →
  `sso-redeem` ; d'un domaine à l'autre : `ssoVersDomaine()`. Jamais un jeton dans une URL, jamais une URL de retour
  reçue. Bloc copié de `tools/sso_snippet.js`. CTA : CONNECT WITH MY TOTEHM.
- **Argent** : le prix et l'accès viennent du serveur. Un webhook, routé sur `metadata.product` (`switch` + `default`,
  jamais retiré) ; toute nouvelle fonction de checkout pose sa `metadata.product`, en double dans
  `subscription_data.metadata`. Propriété et argent ne s'écrivent QUE par le webhook. Grand livre en ajout seul.
- **Front** : Supabase en module ES. Liens internes ABSOLUS (`cleanUrls`). Retirer un nœud = retirer son câblage.
  Une erreur de RPC se journalise. Une réponse tardive n'écrase jamais un état plus frais. CORS : `corsHeaders()`.
- **Interface** : états en `is-…` ; un état permanent = une `transition` ; un verrou de navigation se rend toujours ;
  overlays ancrés en haut. Couleurs, polices, mots : `BRAND.md`.
- **Coût** : le gratuit reste mécanique (SQL, zéro centime) ; un LLM seulement pour ce que le membre achète.
- **Claude Code** : une commande simple par ligne, jamais `cd X && …`.
- **Lecture** : jamais un gros fichier en entier (`com/totehm.html` ≈ 12 850 lignes, `club/*.html`, migrations) :
  `grep -n` puis une plage.

## Les documents — anti-chaos

`README.md` (la carte, pour Wah) · `CLAUDE.md` (ici) · `<dossier>/CLAUDE.md` · `BRAND.md` · `CLAUDE_CODE.md`. C'est tout.
1. Un document dit le PRÉSENT. Un lot qui change une règle RÉÉCRIT la ligne, à sa place. Jamais de section datée,
   jamais de « mise à jour du … », jamais de journal.
2. L'histoire va dans le message du commit (ce qui change, pourquoi, la mesure en production).
3. Plafonds : ce fichier ≤ 100 lignes, un `CLAUDE.md` de dossier ≤ 60, `BRAND.md` ≤ 100, `CLAUDE_CODE.md` ≤ 30.

## Un lot est fini quand

le code est modifié, testé, sécurisé · le `CLAUDE.md` du domaine dit le nouvel état · c'est poussé, déployé et vérifié
en production · le commit raconte le lot. Rapport à Wah : un tableau de valeurs mesurées, en français, sans jargon.
