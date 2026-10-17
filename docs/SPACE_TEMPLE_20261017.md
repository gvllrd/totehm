# SPACE, temple et vide absolu — 17 octobre 2026

Le contraste demandé remplace le dôme noir : un temple antique, vivant et lumineux au sommet du monde,
puis des couloirs d'œuvres dans le noir absolu. La mécanique de progression du voyage livré le 16 octobre
est conservée ; ses sculptures cèdent la place aux images originales.

## Temple au-dessus des nuages

`space/gallery-temple.mjs` construit le temple, son matériau de pierre antique, huit colonnes, six arbres,
des plantations et 216 fleurs. Le sommet plonge dans une mer de nuages. Depuis le temple, la mer est à gauche
et les chaînes de montagnes à droite. Géométrie, textures de pierre, eau et atmosphère sont produites en code.
Les images des expériences restent les fichiers originaux déjà présents dans le projet.

Le ciel suit l'heure locale de la personne, issue de `new Date().getHours()`. Entre 06:00 inclus et 20:00
exclus : ciel bleu, grand soleil et lumière de jour. Le reste du temps : ciel étoilé céleste et lumière de nuit.
L'état est réévalué chaque minute et lors de la reprise du rendu. Aucune localisation ou API météo n'est nécessaire.

Les trois arches antiques sont à x=-9, 0 et 9 m, z=-12 m. Elles montrent respectivement la vraie couverture
du TotehmPaper, celle d'Origins et l'aperçu Lisbon existant. Derrière, l'ouverture reste noire. Le choix d'une
collection guide vers son arche ; la marche libre peut également franchir son seuil.

`space/gallery-navigation.mjs` borne les déplacements sur la plateforme et contourne les six plantations
centrées à x=±11 m, z=-3/5/13 m. Ses routes utilisent un graphe de visibilité fixe, avec collisions exactes
contre les troncs et contrôle de segments tous les 12 cm. Les visites automatiques s'arrêtent devant l'arche
voulue, à z=-11,2 m ; elles ne traversent pas une autre porte par accident.

## Les œuvres dans le noir

Au passage, le groupe entier du temple est masqué. Le fond de rendu est `#000000`. Le groupe de
`space/gallery-void.mjs` ne contient que des surfaces portant les œuvres : aucun mur, sol, plafond, cadre,
ligne, particule, sculpture, décor ou lumière. Les matériaux non éclairés gardent les couleurs des images.
Les commandes HTML restent disponibles au-dessus du rendu.

La progression reprend les coordonnées et la cadence du voyage précédent :

| Paramètre | Valeur conservée |
| --- | --- |
| Axe de progression | Ligne droite vers les z négatifs |
| Premier arrêt | `(0, 1.65, -25)` |
| Centre de l'œuvre n, indexé de zéro | `((n % 2 ? -1 : 1) * 4.8, 5.1, -34 - n * 32)` |
| Espacement | 32 m |
| Vitesse de marche | 2,6 m/s |
| Durée d'une visite guidée | `clamp(distance * 110, 1450, 4200)` ms |
| Interpolation | Celle du voyage précédent |
| Images en mémoire | Cinq sur ordinateur, trois au téléphone |

Une image émerge à l'approche ; les suivantes ne forment pas une rangée illuminée au loin. Le pool réutilise
ses surfaces et libère les textures qui le quittent. Les commandes conservent le déplacement clavier,
le regard au glisser, les trajets guidés et le joystick tactile. La résolution du rendu reste adaptative.

Les trois collections gardent leur contenu et leurs portes existantes :

1. **TotehmPaper {THP} / The Stoner Experience** : une seule présentation, avec le vrai PNG de `get_higher`.
   Le lien vers la méthode Stoner conserve ses droits existants.
2. **Origins / Quantum** : les vingt images de `gallery-artworks.mjs`, strictement de `quantum-01` à
   `quantum-20`, correspondant aux chapitres 1 à 20 du lecteur original. Chaque œuvre garde son vrai titre
   et son lien `/origins?work=NN`, ainsi que le marché existant. Aucune nouvelle œuvre n'est inventée.
3. **Neuro Street Art Digital** : l'aperçu des panneaux flottants, le slogan Higher d'origine et l'unique
   PLAY vers `/play_lisbon_street` sont conservés. Le récit, la manette et leurs accès ne changent pas.

Échap et le bouton de retour ramènent au temple. Après la dernière œuvre, la commande d'avancée propose
aussi le retour. Les vingt images restent accessibles dans la liste HTML et le repli sans WebGL.

## Transition et son générés en code

`space/gallery-3d.mjs` fait varier légèrement le FOV sur 800 ms au passage du portail. Le temple est masqué
immédiatement, sans laisser son ciel ou sa lumière dans le vide. Le retour restaure le temple avec un doux
flash. La réduction des mouvements supprime cette animation et le flash ; le changement de lieu est immédiat.

`space/gallery-audio.mjs` utilise uniquement la Web Audio API :

- À l'approche d'une arche, deux sinusoïdes graves à 50 et 70 Hz montent doucement selon la distance.
- Au passage, un bruit synthétisé puis filtré produit le souffle sourd, avec une enveloppe courte.
- Dans le couloir, une onde sinusoïdale pure de 110 Hz reste discrète et méditative.

Aucun fichier audio n'est chargé, décodé ou enregistré. Le contexte audio n'est créé qu'après un geste réel.
Le bouton de son permet de couper l'ambiance et mémorise le choix. La liste, une page masquée et l'arrêt
du rendu suspendent l'audio ; leurs transitions ne laissent pas de souffle ou d'oscillateur audible en fond.
Un navigateur sans Web Audio conserve la visite complète.

## Continuité et vérifications

Le retour du Club intégré sur main `1117c0c` et les changements COM de Claude sont conservés. Ce lot ne change
ni SQL, fonction Edge, prix, propriété, compte, paiement ou règle d'accès. Les expériences originales,
les médias Origins et les redirections historiques restent en place. Les nouveaux modules sont servis
localement avec la copie existante de Three.js.

Résultats locaux mesurés au moment de cette entrée :

| Vérification | Résultat |
| --- | --- |
| Navigation : 400 paires de stations, contournement des six plantations, bornes et arches | 420/420 |
| Temple et couloir : jour/nuit, 20 étapes, pixels noirs, clavier/tactile, portes, retour, pauses et repli | 197/197 |
| Audio synthétique : activation, ambiance, transitions, coupure et suspension | 19/19 |
| Lecteur Origins : bon chapitre, navigation, prix serveur et liens invalides | 16/16 |
| Lisbon : aperçu 22 panneaux, récit/manette, droits et marché | 68/68 |
| Disposition : 320/390/1440 px, jour et nuit, aide sans chevauchement | 6/6 variantes |
| Intégrité des expériences, médias, prix, accès et redirections | 85/85 |

Les 197 contrôles du temple passent avec un vrai rendu WebGL à 1440 × 1000 et 390 × 844 px, de jour comme
de nuit. Ils parcourent réellement les vingt arrêts de -25 à -633 m, leurs titres et liens, ainsi que les
arches au clic et à la marche. Le test lit les pixels du canvas : 96,78 % du premier cadrage du vide sur
ordinateur sont exactement noirs, les quatre coins sont entièrement noirs, et l'œuvre reste visible. Le
contexte Web Audio natif est absent avant un geste, puis réellement suspendu en liste et page masquée.
L'ouverture précoce de la liste et le repli sans WebGL conservent aussi toutes les images.

Preuves locales : `/tmp/totehm-production/temple-void/results.json`, captures `temple-void/`,
`temple-audio/results.json` et `temple-origins/results.json`. Les services sont interceptés dans les tests
navigateur ; aucun compte, paiement ni commande n'est créé. La régression Lisbon passe 68/68 et la disposition
est vérifiée sur six variantes ; preuves `temple-lisbon/results.json` et `temple-void/layout.json`. Les 197 contrôles fonctionnels et les six variantes de disposition ont été exécutés séparément ; la mesure
de disposition n’utilise pas WebGL. Les mesures réelles de publication suivent.


## Publication mesurée

Code publié sur main : `2239f0f57eff834e20efef99018fd0e64c4feb20`. Vérification des domaines : `2026-10-17T13:05:42.747051+00:00`.
Les quatre projets Vercel sont READY en production à ce commit, avec leurs huit alias exacts.
SPACE : `dpl_FHAk6niMEQLEm6zsL5ZeSrg3GLSP`.

51/51 lectures HTTPS réussies : accueil, CSS et nouveaux modules sur www/apex SPACE ; les vingt images
Origins et le vrai papier ; quatre expériences/marché ; `/totehm`, `/higher`, `/monetize` sur les deux origines
COM ; accueil du Club sur www/apex. Les corps sont identiques au dépôt octet pour octet, avec le MIME attendu
et TLS validé. Les six réponses COM et les deux réponses du Club sont aussi identiques au main `1117c0c` :
les travaux de Claude et la restauration du Club sont conservés.

Preuves du code publié : `/tmp/totehm-production/temple-code-ready.json` et `temple-code-live.json`.
Le contrôle navigateur des vrais domaines reste limité par le certificat proxy de cet environnement ;
les tests WebGL sont locaux, et les lectures HTTPS des vrais domaines utilisent la validation TLS normale.
Un commit documentaire peut suivre cette mesure sans changer les fichiers servis.
