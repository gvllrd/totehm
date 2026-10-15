# Galerie SPACE et Club temporel — 15 octobre 2026

Cette livraison implémente la nouvelle direction dans le dépôt. Les vérifications locales ne constituent pas un déploiement Supabase ou Vercel. Le dernier relevé de production dans `backend/SYSTEM.md` conserve sa date propre.

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

`com/totehm.html` est laissé intact pour le travail COM parallèle. Les raccordements sont limités à :

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
| Source COM principale | `com/totehm.html` inchangé |
| Production et restauration dans une nouvelle tâche | Non vérifiées |

## Mise en service restante

1. Vérifier l'état Supabase réellement déployé et appliquer la migration transactionnellement une seule fois. Aucun accès de production n'a été fourni à cette session.
2. Déployer depuis `backend/` les fonctions `higher-checkout`, `artwork-checkout`, `market-checkout`, `stoner-gate`, `stripe-webhook`, avec `_shared/origins.ts` et les modes de vérification JWT existants. Ne modifier ni secret, prix, endpoint ni abonnement Stripe.
3. Déployer SPACE, Club, Boutique et les raccordements COM ensemble après vérification de compatibilité avec le travail COM parallèle. Les ponts et anciennes routes assurent la transition.
4. En environnement de test autorisé, vérifier les vraies connexions entre domaines, les retours Stripe, les droits et les médias signés. Aucun paiement réel n'est requis pour la validation locale.
5. Dans les paramètres cloud, relire et enregistrer les instructions réutilisables, puis publier l'environnement. La sauvegarde du brouillon ne publie pas la configuration et ne maintient pas les processus en vie.
