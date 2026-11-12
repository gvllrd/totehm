# CLAUDE.md — construire TOTEHM

> Lu à chaque session, ≤ 100 lignes, au PRÉSENT. Un domaine : `<dossier>/CLAUDE.md`. La marque : `BRAND.md`.
> La carte des fichiers : `README.md`. L'histoire : `git log` (rien d'autre).

## Règle n° 1 — les boxes sont la marque

**Règle n° 1 — les boxes sont un invariant de marque.** Toute représentation visuelle d’un élément du TOTEHM, dans le TOTEHM ou ailleurs dans l’écosystème, conserve strictement sa box native : forme, couleur de catégorie, typographie, proportions, traits d’intention et états. Réutiliser le rendu de référence ; aucun composant, carte, badge ou style local ne le réinterprète. Une évolution se fait à la source puis se répercute partout, jamais sur un seul écran.

## Qui fait quoi

| qui | fait |
|---|---|
| **Claude, session cloud** | conçoit ET exécute : code, migrations, Edge Functions, push sur `main`, contrôle de la prod, Stripe (lecture, tests) |
| **Claude Code, terminal de Wah** | seulement ce qui exige sa machine : la VM Oracle elle-même, et les migrations que le cloud ne passe pas (voir Base). **Un flux n8n se publie depuis le cloud** (11/11, mesuré : le MCP n8n atteint la production) |
| **Wah** | la vision, les tests sur téléphone, le « oui » avant : un prix live, un remboursement, l'endpoint webhook Stripe |

Wah fait le minimum (sauf OAuth, 2FA, décision produit). Une demande = un lot complet, sans plan à valider.
Push sur `main` = mise en ligne ; jamais réécrire l'historique.

## La vision (Wah, 21/10/2026)

| domaine | dossier | fonction |
|---|---|---|
| totehm.com | `com/` | l'écosystème : les 5 vues, la creator economy (s'abonner à un membre = entrer dans son écosystème), la recherche d'un membre |
| figher.club | `club/` | le prolongement de la vue Spots : chercher, publier des spots, se rencontrer |
| higher.boutique | `boutique/` | les vêtements totehmisés, un style artistique choisi, à partir de toute catégorie personnelle ; une box suffit, production n8n. Le LUXE est un atelier : une pièce d'exception, un artiste LOCAL via une galerie partenaire, acompte de 770 € remboursé si aucun artiste en 30 jours |
| totehm.space | `space/` | Lisbon au Portugal : bâtiment intact aux azulejos bleu/blanc de `c8ddaf0`, douze fenêtres, huit balcons et toit de verre ondulé ; New York ailleurs selon Vercel : château en ruine, donjon et verre à toit plan incliné ; plain-pied, mer, ciel et œuvres indépendantes conservés |

**Deux fois cinq vues.** totehm.com : ↑ Get Higher (commune à tous) · ← mes médias · ● mon TOTEHM · → les spots ·
↓ Higher my ChatGPT (connexion gratuite, lecture seule autorisée) ; ← ● → = l'écosystème d'un membre, ouvert par l'abonnement à ce membre.
Le TOTEHM déployé : HABITS · OBJECTIVES · REPULSIONS · VISIONS · MY STORY. **Les boxes sont sacrées** : un seul rendu.
Higher GPT prépare à la demande un prochain pas avec médias, spots personnels, inspirations des abonnements et spots Club autorisés ; passage facultatif vers higher.boutique, sans commande automatique. Higher GPT et le suivi mécanique TotehmBot sont gratuits ; les seuls abonnements proposés sont ceux aux créateurs. Vêtements et œuvres restent des achats distincts.
Le suivi : TOTEHM = choix ; TotehmBot = notification privée + Done/Missed ; dashboard = faits sur 7/28 jours et configuration du bot, sans bloc Higher subscription ; Higher ChatGPT = un ajustement proposé à la demande, après partage explicite. Silence = inconnu, pas un échec ; historiques partiel/mis de côté conservés. Aucun changement automatique des cinq vues.

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
  `backend/supabase/migrations/`. La session cloud passe tout ce qui a été essayé, `drop` et `create or replace` d'une
  fonction existante et `alter policy` compris (mesuré le 08/11) ; ce qui expire malgré tout → fichier + une ligne dans
  `CLAUDE_CODE.md`. La base d'abord, le code ensuite. Un gros lot se passe en MORCEAUX, pour qu'un blocage ne perde rien.
  Grants APRÈS le dernier `create` ; une fonction appelée par une POLITIQUE reste accordée à `authenticated` (Postgres
  vérifie le droit de l'appelant). Table neuve : RLS sans politique, lue et écrite par fonction, nom préfixé par sa
  FONCTIONNALITÉ (`streetwear_`, `chatgpt_`, `cloth_`…, jamais par un domaine : quatre tables sont lues par les quatre
  sites) et `comment on table` en tête `[COM]`/`[CLUB]`/`[BOUTIQUE]`/`[SPACE]`, combinés par `+`.
  `tests/sql/domaines_selftest.sql` refuse une table muette.
- **Identité** : totehm.com est l'autorité. Un satellite appelle `ssoLogin()` → `totehm.com/auth` (code + PKCE) →
  `sso-redeem` ; d'un domaine à l'autre : `ssoVersDomaine()`. Jamais un jeton dans une URL, jamais une URL de retour
  reçue. Bloc copié de `tools/sso_snippet.js`. CTA : CONNECT WITH MY TOTEHM, un bouton normal ; connecté, le nom coral sur
  son papier navy perforé (bloc copié de `tools/member_corner.*`, classe `mc`). SORTIR d'un satellite = `ssoLogout()`,
  jamais `sb.auth.signOut()` dans une page : le repère `SSO_KNOWN` s'efface DANS le geste, sinon le rechargement
  relance l'aller-retour silencieux et reconnecte ; `scope:'local'` ne ferme que ce site. **SORTIR DE TOTEHM.COM SORT
  DE PARTOUT** : toute sortie de com passe par `comSortir(sb)` — `sso_revoke_everywhere()` d'abord (le NUMÉRO DE
  SORTIE), `signOut({scope:'global'})` ensuite ; `scope:'local'` sur com ne révoque RIEN et laissait les satellites
  connectés sans fin (mesuré le 08/11). Un satellite relit `sso_epoch()` au démarrage et au retour d'onglet
  (`ssoVerifierSortie`) : plus grand que le numéro retenu = il sort. Un numéro illisible ne déconnecte JAMAIS.
- **Argent** : le prix et l'accès viennent du serveur. Un webhook, routé sur `metadata.product` (`switch` + `default`,
  jamais retiré) ; toute nouvelle fonction de checkout pose sa `metadata.product`, en double dans
  `subscription_data.metadata`. Propriété et argent ne s'écrivent QUE par le webhook. Grand livre en ajout seul.
- **Front** : Supabase en module ES. Liens internes ABSOLUS (`cleanUrls`). Retirer un nœud = retirer son câblage.
  Une erreur de RPC se journalise. Une réponse tardive n'écrase jamais un état plus frais. CORS : `corsHeaders()`.
- **Interface** : états en `is-…` ; un état permanent = une `transition` ; un verrou de navigation se rend toujours ;
  overlays ancrés en haut ; « précédent » (téléphone, ordinateur) referme la couche du dessus et ne quitte le site
  qu'à l'accueil. Couleurs, polices, mots : `BRAND.md`.
- **Continuité** (Wah, la règle la plus importante de l'expérience) : d'une vue, d'une page, d'une couche à l'autre, le
  moins de coupure possible — un objet ne disparaît pas pour réapparaître, il se TRANSFORME (le papier grandit, les traits
  se plient, le nom zoome lettre pour lettre) ; jamais une image figée ni un saut. Ça se mesure image par image, au téléphone.
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
