# Galerie SPACE et Club temporel — 15 octobre 2026

Cette livraison implémente la nouvelle direction dans le dépôt, fusionnée avec le processeur COM de Claude (`13abd34`). La migration `club_gallery` a été appliquée transactionnellement en production le 15 octobre 2026 ; les cinq fonctions Edge sont actives et leur source déployée a été vérifiée. Les quatre projets Vercel ont publié le commit fusionné `2bf4724`. Le correctif de routage `395c7ca` est en cours de publication et de vérification sur les anciennes adresses artistiques. Les mesures ci-dessous distinguent les vérifications locales et celles de production.

## Répartition et continuité

| Plateforme | Parcours |
| --- | --- |
| COM | Mon TOTEHM, stratégie, identité, création depuis une Habit ; entrée directe `/spot` pour les anciens liens de création |
| SPACE | Galerie, expériences digitales, marché, collection ; ancien lecteur social conservé à `/social` |
| Club | Passé / maintenant / futur, chaque période en RADAR ou SHORTS ; consultation, rejoindre et calendrier |
| Boutique | Streetwear, Luxury, Decode, commandes et production |

Les sept expériences `get_higher`, `stoner`, `stoner_terms`, `play_lisbon_street`, `discover`, `discover_lisbon`, `origins`, ainsi que les panneaux routiers et `/api/geo`, sont copiés vers SPACE. La comparaison de source vérifie l'égalité hors adaptation du protocole SSO : SVG, médias, textes, styles et interactions artistiques restent les mêmes. `boutique/totehm.html` est un outil physique historique, pas l'œuvre TotehmPaper ; il reste boutique. Les œuvres restent identifiées par les mêmes slugs et les mêmes lignes de base.

Le nouvel accueil galerie et la présentation du marché changent. Le marché conserve les réservations, les prix serveur, l'achat primaire, la revente, la collection, la provenance et le règlement existants. La navigation entre œuvres, les transitions et la collection améliorent l'exploration ; aucun point, classement, récompense, enchère ou nouvelle rareté.

Le mode SHORTS du Club reprend **le lecteur central de l'ancien SPACE et son système de filtres**. Le temps et le mode restent indépendants. Une seule lecture `club_spots` alimente RADAR et SHORTS : filtres serveur avant pagination, ancre temporelle, audience et localisation autorisées. Les spots sans média ou sans point exact restent consultables.

Les contenus sociaux ne sont ni supprimés ni convertis en œuvres. `space/social.html` préserve l'ancien lecteur ; les paramètres sociaux et `/s/:id` continuent de fonctionner. `club/create.html` conserve le moteur de création pour l'intégration COM, avec retour vers COM en accès public direct.

## Coordination COM

La livraison initiale ne modifiait pas `com/totehm.html`. La fusion de `main` conserve ensuite intégralement le nouveau processeur COM de Claude ; les 14 suites navigateur d'intégration passent, y compris `com_processeur` et `com_shorts`. Les raccordements sont limités à :

- `/x/space` → `https://www.totehm.space/social` ;
- `/x/club` → `https://www.figher.club/create` ;
- `/spot?v=plan|cam&habit=…&city=…` : cadre de création de la même origine, prêt avant envoi de commande, messages vérifiés par origine et fenêtre ;
- menus Get Higher : URL SPACE et cible SSO `space` changent ensemble.

Les commandes XO existantes restent `{totehm:'x',cmd:'url',q}` et `{cmd:'sleep'}` ; les événements restent `ready`, `close`, `signin`, `stale`, `go`. Conserver ce contrat lors des changements COM. Sans session sur `/spot`, le parcours COM existant s'ouvre avant la reprise du compositeur ; aucun nouveau système de compte.

Les anciennes adresses artistiques boutique et Club passent par un pont sur leur origine : échange du code lié à cette origine, puis émission d'un nouveau code lié à SPACE. Un 308 direct perdrait l'authentification des anciens liens COM. Les paramètres et fragments utiles sont préservés, les paramètres SSO consommés sont retirés. Le marqueur `migration=gallery-v1` contourne les anciennes redirections permanentes éventuellement en cache. Aucun jeton de session n'est copié dans une URL.

## Règles serveur

Migration : `backend/supabase/migrations/20261015120000_club_gallery.sql`.

- `_figher.member` = `totehm_complete(...).complete` : au moins une Box non vide dans chacune des cinq vues. Aucun THP, abonnement ou comp ne remplace cette condition.
- `_art_passport` préserve la règle artistique précédente : comp existant ou THP + Habit. Les fonctions commerciales concernées sont détachées de `_figher` avant sa modification.
- `stoner_access`, exemplaires THP, numéros, prix, stocks, royalties, réservations, règlements et droits créateur restent indépendants.
- `club_spots` utilise les audiences autorisées, y compris les spots des créateurs auxquels le lecteur est abonné, sans exiger simultanément l'adhésion au Club.
- Les projections serveur retirent les points exacts et mini-boxes non autorisés avant la recherche et avant l'envoi au navigateur.

La migration vérifie les signatures et les marqueurs des fonctions commerciales existantes. Elle refuse un corps différent plutôt que d'inventer son remplacement. L'application doit être transactionnelle ; en cas de divergence de production, lire les fonctions déployées et adapter explicitement la migration avant de reprendre. Ne jamais utiliser `supabase db push`.

Les trois fonctions de checkout digital reviennent directement sur SPACE ; produits Stripe, prix lus en base, réservations et métadonnées de règlement sont préservés. Le reçu THP nomme l'exemplaire, sans présenter son numéro comme un nouveau numéro d'adhésion Club.

## Vérification locale

Depuis `/workspace/totehm`, après `. /workspace/.totehm-cloud/activate.sh` :

```sh
node tests/node/art_migration.mjs
node tests/node/space_card.mjs
node tests/backend/bunny.mjs
node tests/backend/bunny_playback.mjs
node tests/backend/gallery_checkout.mjs
node backend/supabase/functions/_shared/agenda_test.ts
python3 tests/sql/club_gallery_local.py
mkdir -p /tmp/totehm-checks
node tests/browser/art_migration.mjs /tmp/totehm-checks
node tests/browser/art_bridge.mjs /tmp/totehm-checks
node tests/browser/gallery.mjs /tmp/totehm-checks
node tests/browser/club_temporal.mjs /tmp/totehm-checks
node tests/browser/com_spot.mjs /tmp/totehm-checks
node tests/browser/com_plateforme.mjs /tmp/totehm-checks
node tests/browser/boutique_home.mjs /tmp/totehm-checks
node tests/browser/space_box.mjs /tmp/totehm-checks
```

Les tests navigateur interceptent les requêtes. Les tests du pont utilisent un stockage réellement distinct entre origines. Les tests artistiques comparent avant/après sur téléphone et ordinateur. Les contrats Edge emploient des services synthétiques ; aucun paiement n'est émis. Le runner SQL crée puis détruit un PostgreSQL isolé sans réseau et extrait les vrais corps de fonctions du dépôt ; il modélise les tables préexistantes et le transport `auth.uid()`. Il ne prouve pas l'identité du schéma déployé.

Les anciennes suites vérifiant l'accueil social SPACE ou les cinq vues publiques du Club décrivent l'ancienne architecture. La régression courante utilise les parcours conservés et les nouvelles suites ci-dessus ; ne pas confondre une attente historique avec une panne d'installation.

Résultats sur l'instance cloud préparée :

| Vérification | Résultat |
| --- | --- |
| Processus de tests autonomes et navigateur listés ci-dessus (hors SQL) | 14 réussis |
| Comparaisons artistiques téléphone/ordinateur | 14 comparaisons réussies, incluses dans les tests navigateur |
| Suites SQL locales | 2 réussies ; migration réappliquée et dérive commerciale refusée transactionnellement |
| Démarrage statique après arrêt/redémarrage | 12 réponses HTTP avec contenu attendu |
| Source COM principale | Processeur Claude de `13abd34` conservé intégralement après fusion |
| Production Supabase | Migration appliquée, trois lecteurs HTTP 200, droits et adhésion vérifiés |
| Fonctions Edge | Cinq ACTIVE ; versions 38 / 17 / 4 / 33 / 43, sources exactes et modes JWT vérifiés ; 19/19 contrôles HTTP sans paiement |
| Domaine SPACE | Déploiement `395c7ca` READY ; domaine principal et alias associés ; routes publiques vérifiées |
| Projets Vercel | Quatre projets READY sur `395c7ca`, huit alias exacts, 25 contrôles HTTP et 40 anciennes adresses réussis |
| Restauration dans une nouvelle tâche | Non vérifiée |

## État de mise en service

1. Vérifier l'état Supabase réellement déployé et appliquer la migration transactionnellement une seule fois. Cette étape est effectuée : version `20261015120000`, source MD5 `644541bdeedf29476b3d07eafdd29159`, trois lecteurs anonymes HTTP 200, aucune position exacte exposée et zéro divergence d'adhésion.
2. Fonctions Edge déployées et vérifiées : `higher-checkout` v38 et `stripe-webhook` v43 sans vérification JWT de la passerelle ; `artwork-checkout` v17, `market-checkout` v4 et `stoner-gate` v33 avec vérification JWT. Les cinq sont ACTIVE et les fichiers sources extraits des bundles correspondent exactement aux sources revues. Les identifiants des fonctions et leurs modes JWT ont été conservés.
3. Fusion de production : `2bf472430bc07392b695e197aded6928d79cb087`, comprenant tout le COM de Claude (`13abd34`). SPACE est READY et son contenu public correspond à ce commit. Les quatre projets sont READY à `395c7ca` en production, avec leurs huit alias et les anciennes routes vérifiés. Les ponts et anciennes routes assurent la transition.
4. En environnement de test autorisé, vérifier les vraies connexions entre domaines, les retours Stripe, les droits et les médias signés. Aucun paiement réel n'est requis pour la validation locale.
5. La configuration cloud a été publiée avec les instructions réutilisables et les accès enregistrés. La sauvegarde du brouillon ne publie pas la configuration et ne maintient pas les processus en vie.

## Déploiements Vercel mesurés

Les quatre déploiements de production suivants sont READY, avec leurs huit alias vérifiés, pour le commit `395c7ca88d3a50e04d1b05353575c3c3dee87d07` :

| Projet | Déploiement |
| --- | --- |
| space | `dpl_9XYiELRDgqmWvtJbcv3DzbSiroCw` |
| club | `dpl_G6Y1sXhceJuNkuTXEAYTw1qWFL3i` |
| com | `dpl_HwGVTt9jhiD6Mo5DqyEd1ttkrpS6` |
| boutique | `dpl_2CvWKEihWog9xPbSCNxj3YCCMWt3` |

Les contrôles HTTPS du contenu publié et les trois lectures Club sont réels. Les 14 suites navigateur d'intégration passent avec des services simulés. Le navigateur réel de cette instance est bloqué par la chaîne de certificats du proxy ; la modification persistante du magasin de confiance a été refusée par la revue automatique d'approbation. Aucune désactivation de vérification TLS ni contournement n'a été utilisé. Les parcours SSO authentifiés, retours Stripe et paiements restent simulés ; aucun achat réel n'a été exécuté.

## Correctif des anciennes adresses artistiques

Le contrôle de production a révélé que les fichiers HTML historiques de la Boutique étaient prioritaires sur les réécritures Vercel. Avec `cleanUrls`, la destination du pont doit aussi être `/art-bridge`, sans suffixe `.html`. Le correctif `395c7ca88d3a50e04d1b05353575c3c3dee87d07` exclut uniquement du déploiement Boutique les huit anciens fichiers artistiques (ils restent dans le dépôt pour les comparaisons), adapte les destinations des ponts Boutique et Club et conserve les adresses `.html` par canonicalisation sur la même origine (308 mesuré avec `cleanUrls`). Vérifications locales du correctif : 68 invariants Node et 24 contrôles navigateur du pont réussis. Les 40 anciennes adresses servent exactement le pont attendu, avec origine, chemin et paramètres préservés (HTTP 200).
