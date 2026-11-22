# CLAUDE.md — construire TOTEHM

> Lu à chaque session, ≤ 100 lignes, au PRÉSENT. Un domaine : `<dossier>/CLAUDE.md`. La marque : `BRAND.md`.
> La carte des fichiers : `README.md`. L'histoire : `git log` (rien d'autre).

## Règle n° 1 — les boxes sont la marque

**Règle n° 1 — les boxes sont un invariant de marque.** Toute représentation visuelle d’un élément du TOTEHM, dans le TOTEHM ou ailleurs dans l’écosystème, conserve strictement sa box native : forme, couleur de catégorie, typographie, proportions, traits d’intention et états. Réutiliser le rendu de référence ; aucun composant, carte, badge ou style local ne le réinterprète. Une évolution se fait à la source puis se répercute partout, jamais sur un seul écran.
**Le mot TOTEHM devient la PIÈCE là où la page le DEMANDE** (Wah, 14/11 : « seulement les textes les plus stratégiques et brandés ; sinon remets le texte — et agrandis ceux que tu gardes ») : un nœud marqué `data-tw`, et rien d'autre. Recto le logo, verso le nom du membre, une rotation pour toute la page — posée sur les pièces VISIBLES, jamais sur `:root` (elle recalculait le style de toute la page à chaque image) —, 2,2 em (`--tw-k` = le `K` du JS). Bloc copié : `tools/totehm_word.css` PUIS `totehm_word.js` (il lit le nom tout seul : `#member-txt`, `#ast-name` ou `[data-nom]`). Jamais sur ce que le membre a ÉCRIT, ni sur une adresse (`totehm.com`), ni sur un mot qui continue (`TOTEHMIZE`) ; le mot reste dans le document, hors écran — `textContent` ne change pas. Aujourd'hui : « Get Higher with your TOTEHM » (accueil, Discover), « YOUR TOTEHM IN CHATGPT », la définition d'un spot (com + club), « Read <nom>'s whole TOTEHM ».
**Une box est une PHRASE** : ses intitulés (`.mg-l`) se voient et disent la logique — why · trigger · instead of · how · vision · the big why · instead · learn from · I was there to practice it. Et toute box des cinq vues porte son « + totehmize » vers higher.boutique.

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
| totehm.com | `com/` | l'écosystème : les 5 vues, la creator economy (s'abonner à un membre = entrer dans son écosystème), la recherche d'un ÉCOSYSTÈME |
| figher.club | `club/` | le prolongement de la vue Spots : se RENCONTRER dans un contexte et une action précis — un point de rencontre OUVERT (les 7 intentions, faire la fête compris), pas le grind : la box Habit dont il est question, avec son why (objectif ou vision) et ses répulsions. Filtrer par Habits semblables est sa raison d'être |
| higher.boutique | `boutique/` | les vêtements totehmisés, un style artistique choisi, à partir de toute catégorie personnelle ; une box suffit, production n8n. Le LUXE est un atelier : une pièce d'exception, un artiste LOCAL via une galerie partenaire, acompte de 770 € remboursé si aucun artiste en 30 jours |
| totehm.space | `space/` | Ordinateur. Lisbonne à ciel ouvert sur calçada, fauteuil de cuir, feu de bois, table en pierre, THP et manette 3D. Écran suspendu depuis la soucoupe, première page et objets grandissent sans coupure au clic. New York garde château, statue engloutie et six Think same but opposite. Les deux soucoupes tournent, mènent au seul livre Origins et reviennent à leur ville |

**Deux fois cinq vues.** totehm.com : ↑ Higher my ChatGPT (connexion gratuite, lecture seule, le produit phare ; le scroll y mène — SANS COMPTE, pas de croix : le scroll ouvre le Discover, le joystick la porte) ·
← mes médias · ● mon TOTEHM · → les spots · ↓ Get Higher (le TotehmPaper, commune à tous) ; ← ● → = l'écosystème d'un membre, ouvert par l'abonnement.
**Le GRIND** = les objectifs DATÉS, les Habits qui les servent et leurs répulsions : c'est lui seul que TotehmBot relance. **On ne cherche pas un TOTEHM, on cherche un ÉCOSYSTÈME**, et il SE VOIT par la page d'atterrissage et le Tree : [Members] (membre du FIGHER CLUB, un point de rencontre ouvert : un Totehm avec une Habit et un why, objectif ou vision) retourne le TOTEHM sur son VERSO en mode recherche, avec la fluidité de [Mine] : on tape UN nom au format du nom du TOTEHM, Entrée, UN résultat — son abonnement au format de [Monetize my TOTEHM] ; abonné, le verso se retourne sur SON recto (lecture seule) et SON atterrissage n'a que ← ses médias · ● · → ses spots. **ON NE TRAVERSE JAMAIS LE MILIEU** : d'une vue à l'autre on s'arrête toujours sur celle du centre.
Le TOTEHM déployé : HABITS · OBJECTIVES · REPULSIONS · VISIONS · MY STORY. **Les boxes sont sacrées** : un seul rendu. **Objectif et vision sont UNE box : la deadline décide de la vue** (sans date → Vision, avec date → Objectifs, une ligne le dit) ; une Habit sert directement son why, le How d'une vision = ses Habits. Répulsion (combat présent) et My Story (leçon du passé) restent deux box, reliées par Learned from.
Higher GPT prépare à la demande un prochain pas avec médias, spots personnels, inspirations des abonnements et spots Club autorisés. Il relie ce quoi/pourquoi à des lieux réels, horaires, événements et météo vérifiés par ChatGPT, à partir de la ville donnée par le membre ; lieux habituels et dates des visions restent ses propres choix. Passage facultatif vers higher.boutique, sans commande automatique. Higher GPT et le suivi mécanique TotehmBot sont gratuits ; les seuls abonnements proposés sont ceux aux créateurs. Vêtements et œuvres restent des achats distincts.
Priorités : chaque liste garde son propre classement ; Higher GPT le lit avec les liens et les contraintes du moment, jamais comme un score global. TotehmBot privilégie l’ordre natif des Habits dues, rotation et plafonds conservés. Le suivi : TOTEHM = choix ; TotehmBot = Habit complète + Done/Missed, liens Why/Instead of dans l’ordre natif et préparation facultative depuis la box originale ; dashboard = faits sur 7/28 jours et configuration du bot ; Higher ChatGPT = un ajustement proposé à la demande, après partage explicite. Silence = inconnu, pas un échec. Préparer n’ajoute ni observation ni relance : textes liés dans Telegram sur demande explicite, illustrations dans la mini-app authentifiée. Aucun changement automatique des cinq vues.

## L'architecture

`com/` `club/` `boutique/` `space/` = un site et un projet Vercel chacun ; les alias www et apex se vérifient sur
le déploiement de production de chaque projet. `backend/` n'est servi par
personne. `oracle/` : jamais lu, jamais recopié. Une base Supabase (`abujjbkbbiumxrokozph`), un webhook Stripe.
- Produits indépendants = fichiers indépendants : un bloc commun se COPIE depuis `tools/`, jamais importé (`python3 tools/recopier.py` recopie et vérifie ; `tests/node/blocs_copies.mjs` tient com et club).
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
  reçue. Bloc copié de `tools/sso_snippet.js`. CTA : CONNECT WITH MY TOTEHM, un bouton normal ; connecté, le TOTEHM
  qui TOURNE, son nom coral sur tout le verso (blocs copiés : `tools/totehm_name.js` PUIS `member_corner.*`, classe `mc`). SORTIR d'un satellite = `ssoLogout()`,
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
- **Confidentialité** : UNE échelle, et chaque objet dit sa PORTÉE. Une **BOX** = private · subscribers (jamais tous les membres) ; elle se règle DANS la box (deux mots, un cadenas) et là où son niveau bloque un geste (la prise d'un spot), toujours en DEUX gestes — le premier demande et rappelle que ses médias et ses sous-box suivent. Un **MÉDIA** n'a jamais de niveau à lui : il prend celui de sa box (un abonné voit donc les médias des box qui lui sont ouvertes). Un **SPOT** = private · my subscribers · figher club (= EVERY MEMBER), porte toujours son point exact, et montre sa box Habit avec ses sous-box objectifs et répulsions — jamais les médias de la box. La box est le PLAFOND : box private → spot private ; monter un spot demande d'abord d'ouvrir la box (confirmation), et redescendre un spot ne fait JAMAIS redescendre sa box.
- **Interface** : états en `is-…` ; un état permanent = une `transition` ; un verrou de navigation se rend toujours ;
  overlays ancrés en haut ; « précédent » (téléphone, ordinateur) referme la couche du dessus et ne quitte le site
  qu'à l'accueil. Couleurs, polices, mots : `BRAND.md`. **Quantico gras corail = le « Get » seul** ; tout autre Quantico est en graisse normale (400), sauf ce que le membre saisit ou son nom (champs, noms). **Un texte qui EXPLIQUE se DÉCOUVRE** (Wah, 15/11, comme
  `totehm.space/play_lisbon_street?discover=1`) : un écran noir par idée, au geste — **UNE NOMENCLATURE** (Wah, 19/11 : « dès que je change le design de la nomenclature, ça change sur tous les discovery ») : tout le dessin vit dans `tools/discover.css` + `.js`, on le change LÀ puis `python3 tools/recopier.py` ; une page n'apporte que son contenu (`tests/node/discover_nomenclature.mjs` refuse qu'elle redessine une classe du bloc), sans numéro d'écran ni consigne écrite — seule la flèche du bas, animée, dit le scroll — et « Higher » y est TOUJOURS le badge (`.dc-hi`), jamais le mot ; l'accueil (com, club) reste minimal et [Discover] vend quand on le demande ; 60 % noir · 30 % texte · 10 % UN accent ; chaque écran porte une illustration faite des éléments NATIFS du site (box, pièce, badge), qui gardent leurs couleurs. **Le corail est SACRÉ** : le nom du membre et l'art de Wah, rien d'autre (prix et bouton = blanc et gris). L'appel à l'action (Subscribe · prix) reste sous CHAQUE écran.
- **Continuité** (Wah, la règle la plus importante de l'expérience) : d'une vue, d'une page, d'une couche à l'autre, le
  moins de coupure possible — un objet ne disparaît pas pour réapparaître, il se TRANSFORME (le papier grandit, les traits
  se plient, le nom zoome lettre pour lettre) ; jamais une image figée ni un saut. Ça se mesure image par image, au téléphone.
- **Coût** : le gratuit reste mécanique (SQL, zéro centime) ; un LLM seulement pour ce que le membre achète.
- **Vocabulaire** (Wah, 19/11 : « les mots que j'utilise reflètent le backend… le code et le backend ») : UN mot = UNE chose, à l'écran, dans le code, dans la base — habit · objective · repulsion · vision · story (la 5e box : table `stories`, fonctions `story_*`, vue `stories`) ; l'arbre entier = `my_totehm()` (MY TOTEHM : `objectives` · `repulsions` · `stories` · `visions`). Les Habits vivent dans `totehms.habits`. Les PONTS — `steps`, `my_trips`, `wisdom`, `teaching_*` — restent en base pour leurs autres lecteurs ; le connecteur ChatGPT et TotehmBot lisent les noms natifs. Leur retrait est un lot séparé ; on écrit TOUJOURS le mot de Wah. `node tests/node/vocabulaire.mjs` (un cliquet : un ancien mot ne revient jamais) et `tests/sql/vocabulaire_selftest.sql`.
- **Claude Code** : une commande simple par ligne, jamais `cd X && …`. **Lecture** : jamais un gros fichier en entier (`com/totehm.html` ≈ 15 000 lignes, `club/*.html`, migrations) : `grep -n` puis une plage.

## Les documents — anti-chaos

`README.md` (la carte, pour Wah) · `CLAUDE.md` (ici) · `<dossier>/CLAUDE.md` · `BRAND.md` · `CLAUDE_CODE.md`. C'est tout.
1. Un document dit le PRÉSENT. Un lot qui change une règle RÉÉCRIT la ligne, à sa place. Jamais de section datée,
   jamais de « mise à jour du … », jamais de journal.
2. L'histoire va dans le message du commit (ce qui change, pourquoi, la mesure en production).
3. Plafonds : ce fichier ≤ 100 lignes, un `CLAUDE.md` de dossier ≤ 60, `BRAND.md` ≤ 100, `CLAUDE_CODE.md` ≤ 30.

## Un lot est fini quand

le code est modifié, testé, sécurisé · le `CLAUDE.md` du domaine dit le nouvel état · c'est poussé, déployé et vérifié
en production · le commit raconte le lot. Rapport à Wah : un tableau de valeurs mesurées, en français, sans jargon.
