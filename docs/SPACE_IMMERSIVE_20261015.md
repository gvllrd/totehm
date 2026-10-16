# Visite de la galerie SPACE — 15 octobre 2026

Direction actuelle du 16/10 : dôme noir absolu, arbre abstrait aux sept intentions, voyage après la porte,
TotehmPaper/Stoner réunis et vingt Origins accrochées. Voir `SPACE_DOME_20261016.md`. Les livraisons ci-dessous
gardent leurs mesures et leur date, y compris l'ancien décor marbre/ficus désormais remplacé.

Évolution Lisbon du 16/10 : la station 03 devient « Neuro Street Art Digital », les panneaux flottent dans le mur
et PLAY ouvre l'unique récit/manette `/play_lisbon_street`. Cette expérience reçoit les corrections explicites
de textes et de slogan ; les autres restent intactes. Voir `SPACE_LISBON_20261016.md` pour la direction actuelle.

Version marbre noir et ficus publiée : `4e1774d960d1f1716be3a6fcbe4c4052ae5ba49c`, build
`2026-10-15-space-estrela-marble`, production SPACE `dpl_3XLsijPW2zXaBPNHKBJdAAXFBWbM` READY.
Quatre projets et huit alias vérifiés. Les 19 contrôles HTTPS réels correspondent exactement au dépôt, avec les
bons types MIME ; les deux domaines COM servent toujours le travail de Claude `67941b5` sans modification.
Validation de ce lot : 44 contrôles du ficus/marbre, 34 de visite, 25 du ciel, 35 de cheminement et 68 invariants
des expériences originales réussis. Preuves : `/tmp/totehm-production/estrela-ready.json`, `estrela-live.json`,
`estrela/results.json`, `estrela-sky/results.json` et captures `estrela-immersive-final/`.

Évolution marbre et ficus : `gallery-marble.mjs` produit localement une dalle de marbre noir avec rubans de calcite,
nuages graphite et fini poli. La projection en coordonnées monde garde l'échelle des veines sur le sol et les tranches.
Les murs passent à 90 cm d'épaisseur vers l'extérieur, sans déplacer leurs faces d'exposition.

Au centre, `gallery-tree.mjs` remplace le socle par un ficus monumental inspiré du Jardim da Estrela de Lisbonne.
Tronc sculptural, 146 branches/racines dans un seul maillage, 17 712 feuilles individuelles sur ordinateur
(12 096 au téléphone), couronne étagée et ouverture de terre presque noire. Deux éclairages doux révèlent le bois et
le dessous des feuilles ; des poches de ciel restent ouvertes entre les branches. Aucune ressource distante ajoutée.

La marche bloque aux racines et au banc. `gallery-path.mjs` calcule un chemin dégagé pour les visites guidées et les
clics au sol ; la caméra suit ce trajet sans traverser le tronc. Le bois intercepte aussi les clics : un tableau
caché par le tronc ne se sélectionne pas au travers. Le mouvement réduit conserve les visites immédiates.
Si le GPU dépasse 90 ms par image de façon persistante, seule la résolution du rendu 3D diminue, jusqu'à un ratio
de 0,65 au minimum ; les textes et commandes HTML restent à leur résolution native. La vidéo et le ciel gardent leurs pauses.

Version « deep night » publiée : `4f6a61fb4d49fa6516659cce411efe005273c968`, production SPACE
`dpl_ECVgSn5ajvZGoQmun23PGVa6BGGq` READY avec ses deux alias. Quatre projets et huit alias vérifiés.
Huit contrôles HTTPS réels réussis : racines SPACE, styles, modules du ciel et de la galerie, marché et COM
correspondent exactement au dépôt ; le code COM de Claude `67941b5` est conservé. Captures finales d'arrivée :
`/tmp/totehm-production/dark-gallery-final` ; ciel final : `/tmp/totehm-production/dream-sky-centered`.

Ciel étoilé animé publié : `22ec60ca5d41f186f3bfc3c7c433e0e1fee9c611`, production SPACE
`dpl_9GrA67UEuUNuAFYufiWkWYK9kpgA` READY avec ses deux alias. Les quatre projets et leurs huit alias sont
vérifiés à ce commit. Douze contrôles HTTPS réels réussis : les fichiers du ciel, de la galerie et les deux
racines correspondent au dépôt ; les deux adresses COM servent toujours exactement le travail de Claude
`67941b5`. Vérification locale : 34 contrôles de visite et 25 contrôles du ciel réussis.

Première publication sur `https://www.totehm.space/` : code `5372e71413058b09cae2d573b158cc64bea0ef4c`,
production Vercel `dpl_7r88tzsHZXV2bdfnWULDNzbCWvkS` READY, deux alias associés. Les quatre projets
et leurs huit alias sont vérifiés à ce commit. Vingt contrôles HTTPS de contenu réussis : accueil,
moteur, modules, styles, aperçus, expériences, marché, social et raccordements entre domaines.
Les réponses correspondent exactement aux fichiers du dépôt, avec leurs types MIME attendus.

L'accueil de SPACE est une salle d'exposition 3D visitable, avec murs et sol en marbre noir, cadres, ficus central,
banc et éclairage d'exposition.
Quatre œuvres existantes y donnent accès à TotehmPaper/Get Higher, Stoner, Play the Lisbon Street et Origins/Quantum.
Le marché et la collection restent accessibles dans l'en-tête et depuis les œuvres.

Le regard suit le glisser. Le clic au sol déplace le visiteur ; WASD et les flèches permettent de marcher sur
ordinateur, le joystick au toucher sur téléphone. Les quatre stations proposent une visite guidée. Le retour
à l'entrée retrouve la vue d'ensemble. La vue Artworks expose aussi toutes les œuvres dans un document HTML,
automatiquement en absence de WebGL ou en perte de contexte ; elle fonctionne également sans JavaScript.

Le toit est désormais ouvert sur un ciel nocturne : Voie lactée procédurale, 6 800 étoiles (4 300 au téléphone),
nébuleuses directionnelles 3D bleues, violettes et roses, halos, scintillement, rotation lente et une étoile filante
toutes les quatorze secondes. La nébuleuse traverse le cadrage d'arrivée. LOOK UP dirige la vue vers le ciel.
Le ciel réutilise la boucle WebGL existante, à 30 images/s maximum (25 sur téléphone), sans ressource externe.
Les ombres statiques ne sont calculées qu'une fois. La liste et l'arrière-plan suspendent le ciel ; le mouvement
réduit le fige, sans saut à la reprise. Dans ce mode, le rendu redevient à la demande.

Quantum ne charge son média
qu'à sa sélection ; quitter sa visite, masquer la page ou demander moins d'animations arrête la vidéo. Les
transitions deviennent immédiates avec cette préférence. Aucun microphone, caméra ou géolocalisation demandé.

Les SVG Higher et Stoner ainsi que les panneaux de Lisbonne sont les aperçus existants, sans modification des
expériences originales. Le poster Quantum est extrait du média public déjà utilisé par l'ancien accueil.
Le moteur Three.js 0.180.0 est versionné localement avec sa licence MIT ; archive npm vérifiée par SHA-512 :
`o+qycAMZrh+TsE01GqWUxUIKR1AL0S8pq7zDkYOQw8GqfX8b8VoCKYUoHbhiX5j+7hr8XsuHDVU6+gkQJQKg9w==`.

| Vérification | Résultat |
| --- | --- |
| `tests/browser/gallery_estrela.mjs` | 44 réussites à 1440/390 px : arbre, marbre, quatre stations, caméra contournant les racines et le banc, marche bloquée au tronc, retour entrée, pauses du ciel et absence d'erreur de shader |
| `tests/node/gallery_path.mjs` | 35 réussites : 25 paires de stations, détours, destinations bloquées et départs aux bords des racines et du banc |
| `tests/browser/gallery_immersive.mjs` | 34 réussites : rendu WebGL réel à 1440/390 px, stations, clic au sol, clavier, vrai toucher du joystick, vidéo, mouvement réduit, repli sans WebGL |
| `tests/browser/gallery_sky.mjs` | 25 réussites : ciel réellement animé à 1440/390 px, étoile filante, vue vers le ciel, absence de chevauchement mobile, pause avec mouvement réduit et liste, reprise en 3D |
| `tests/browser/gallery_dark.mjs` | 47 contrôles réussis : thème sombre, fonds noirs, contrastes, navigation, menu, œuvre, liste et repli ; 12 vérifications ciblées après placement final du titre |
| `tests/browser/gallery.mjs` | 41 contrôles réussis : marché, propriété, revente, paiement simulé, collection et ancienne adresse sociale |
| Expériences originales | 68 invariants réussis (`tests/node/art_migration.mjs`) ; seul l'accueil change |
| Navigateur en production | Non exécuté : certificat proxy Chromium non reconnu ; refus automatique de modification de confiance conservé |

Les tests navigateur utilisent les vrais fichiers du moteur et un rendu local, avec services et média interceptés.
Ils ne créent aucun compte et ne réalisent aucun paiement. Les captures sont sous
`/tmp/totehm-production/estrela`, `estrela-immersive-final` et `estrela-sky` pour cette évolution.
Les 47 contrôles du thème sombre et les 41 du marché datent de la livraison précédente ; ces interfaces sont inchangées.
La publication se vérifie sur `https://www.totehm.space/` par état Vercel,
association des alias et comparaison des fichiers servis.

La direction « deep night » rend les murs, le sol, les socles et les cartels noirs. Les lumières restent ciblées
sur les œuvres ; le cadre d'exposition reste distinct des couleurs originales des œuvres. Les menus, fiches,
commandes et la liste suivent ce même thème, avec ou sans WebGL. Les préférences système ne rétablissent pas
de thème clair ; les contrôles natifs du marché utilisent aussi `color-scheme: dark`.
