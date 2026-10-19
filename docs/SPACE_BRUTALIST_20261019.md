# SPACE, architecture brutaliste côtière — 19 octobre 2026

L'accueil reprend les quatre compositions visibles dans la vidéo fournie par l'utilisateur : béton monumental,
eau miroir, lumière ambre et ciel nocturne bleu pétrole. Cette direction remplace l'architecture et le ciel
jour/nuit du [temple du 17 octobre](SPACE_TEMPLE_20261017.md). Le couloir d'œuvres et sa navigation restent conservés.

## Référence et limites de reconstruction

| Source | Valeur observée |
| --- | --- |
| Fichier fourni | `IA Universe on Reels  Facebook.mp4` |
| Durée | 25,333 s |
| Image | 712 × 1 276 px, verticale |
| Cadence | 16 images/s |
| Compositions architecturales | Quatre, avec retour du montage sur la cour |
| Modèle 3D, plans et vues hors champ fournis | Aucun |

Le film présente des plans montés, avec des mouvements très faibles et une approche principalement axiale.
Il ne démontre aucune continuité physique entre les bâtiments. L'implémentation reconstruit des volumes
navigables à partir des cadrages visibles, sans revendiquer une identité pixel par pixel, les géométries
originales ou une copie exacte depuis des angles absents du film. La vidéo sert de référence visuelle ;
elle n'est pas utilisée comme fond vidéo substituant une image plate à la navigation.

Les quatre boutons **Court**, **Passage**, **Pavilion** et **Sea view** changent de lieu par une coupe de
caméra. Un chemin imaginaire entre ces architectures n'est pas présenté comme provenant de la référence.
Les passages vers les expériences restent dans la cour.

## Les quatre lieux

| Lieu | Composition reconstruite |
| --- | --- |
| Court | Deux volumes massifs en béton coffré bleu-gris, murs de 27 m et tours de 34 m, bassin axial de 4,4 × 26 m, margelles sombres humides, agaves et galets, éclairage ambre rasant et trois portes rectangulaires avec les vraies couvertures |
| Passage | Deux murs parallèles de béton clair, canal de 3 × 34 m, margelles latérales et ouverture vers la mer brumeuse |
| Pavilion | Deux rubans de béton ondulants au-dessus de l'eau, liserés ambre continus sous les courbes, baies vitrées sombres, agaves et petit foyer au fond |
| Sea view | Villa cubique à trois niveaux sur une falaise calcaire, balcons vitrés, éclairage intérieur chaud, terrasse aménagée et piscine turquoise à débordement au-dessus de la mer |

Le quatrième cadrage suit la vue aérienne du film : caméra `(15.2, 7.5, 18)` vers `(-4, -3, -4)`.
Elle se déplace dans un volume d'observation borné horizontalement ; ce n'est pas une promesse de marche
au sol ou d'accès à tous les niveaux de la villa. Les trois premiers lieux et les œuvres gardent un œil à
1,65 m. Le libellé « Sea view » distingue ce point de vue aérien.

Les dimensions sont des choix de reconstruction, pas des mesures certifiées des bâtiments du film. La
géométrie et les matériaux sont produits en code. Le béton utilise un grain fin, des pores, des joints de
coffrage et des trous de banches : pas de veines de marbre, colonnes antiques ou facettes de décor stylisé.
Les grandes surfaces sombres et l'eau reflètent les volumes clairs et les lignes d'éclairage chaud.

Le ciel conserve l'heure bleue couverte de la référence, indépendamment de `new Date().getHours()`.
L'ancien cycle jour/nuit local n'est plus actif. Il n'y a ni soleil de plein jour, ni champ d'étoiles, ni arbre
classique monumental ; la végétation demeure celle des plans : agaves, plantes basses et quelques petits arbres.

## Code et ressources graphiques

| Fichier | Responsabilité |
| --- | --- |
| `space/gallery-brutalist.mjs` | Assemblage des quatre lieux, visibilité, sélection du lieu et diagnostics |
| `space/gallery-atmosphere.mjs` | Matériaux procéduraux, béton projeté en mètres, mer, ciel nuageux et lumière bleue/ambre |
| `space/gallery-courtyards.mjs` | Cour, trois portes d'expérience, canal et passage minimal |
| `space/gallery-pavilions.mjs` | Pavillon aux deux rubans, villa, terrasse, falaise et piscine |
| `space/gallery-reflection.mjs` | Caméra miroir et cible de rendu planaire commune aux surfaces mouillées |
| `space/gallery-brutalist-path.mjs` | Bornes et collisions propres à chaque lieu, routes contournant les bassins et plantations |
| `space/gallery-3d.mjs` | Intégration au moteur de navigation existant et aux couloirs d'œuvres |
| `space/gallery-ui.mjs`, `space/index.html`, `space/gallery.css` | Sélecteur des quatre lieux et interface conservée |

Le reflet provient d'un véritable rendu de la scène depuis une caméra miroir, avec découpe du plan d'eau ;
ce n'est ni une copie inversée de l'écran, ni une photographie de l'architecture. Une seule cible est partagée
par les surfaces, sans empilement de miroirs récursifs. Sa taille est indépendante du DPR de l'écran :

| Budget | Ordinateur | Téléphone |
| --- | --- | --- |
| Cible de reflet commune | 512 × 512 px | 256 × 256 px |
| Cadence maximale des captures | 8 Hz | 4 Hz |
| Carte d'ombres statiques | 1 024 × 1 024 px | 512 × 512 px |
| Textures procédurales | 1 024 × 1 024 px | 1 024 × 1 024 px |

En animation normale, le ciel évolue doucement : les captures peuvent continuer à cette cadence plafonnée,
même caméra immobile. Sans changement à refléter, la texture est réutilisée. En mouvement réduit, le décor
est fixe et une capture ne reprend qu'après une modification de vue ou de lieu ; la frame qui affiche le
nouveau reflet ne déclenche pas à elle seule une recapture. Les états liste, onglet masqué et couloir noir
suspendent les captures. Les ombres sont recalculées au changement de lieu, puis conservées. Les matériaux,
géométries et cibles disposent de leur libération explicite.

La résolution de la scène garde son adaptation aux performances du GPU. Le clavier, le regard au glisser,
le clic au sol et le joystick tactile utilisent les commandes existantes. Les routes sont locales au lieu
sélectionné : elles contournent les plantations, excluent l'eau et empêchent de franchir un mur ou une falaise.

## Le couloir noir reste inchangé

Franchir une porte masque l'ensemble de l'extérieur, son ciel et ses lumières. Le fond du couloir reste
`#000000` : aucun mur, sol, plafond, paysage ou effet lumineux ne remplace le vide. Les œuvres émergent
seules à l'approche, dans leur ordre original. La reconstruction extérieure ne modifie pas `gallery-void.mjs`.

| Paramètre conservé | Valeur |
| --- | --- |
| Axe de progression | Ligne droite vers les z négatifs |
| Premier arrêt | `(0, 1.65, -25)` |
| Centre de l'œuvre n, indexé de zéro | `((n % 2 ? -1 : 1) * 4.8, 5.1, -34 - n * 32)` |
| Espacement des étapes | 32 m |
| Vitesse de marche | 2,6 m/s |
| Durée d'une visite guidée | `clamp(distance * 110, 1450, 4200)` ms |
| Interpolation et commandes | Celles du parcours publié |
| Images conservées | Cinq sur ordinateur, trois au téléphone |
| Transition de franchissement | FOV pendant 800 ms ; immédiate en mouvement réduit |
| Retour | Échap, bouton discret et commande après la dernière œuvre |

**TotehmPaper {THP} / The Stoner Experience** reste une seule présentation du papier original de `get_higher`.
**Origins / Quantum** garde les vingt vraies images, leurs titres et l'ordre `quantum-01` à `quantum-20`.
Chaque lien `/origins?work=NN` continue d'ouvrir le chapitre correspondant du lecteur original ; prix,
vidéos et accès demeurent gérés par le système existant. **Neuro Street Art Digital** conserve son aperçu,
le vrai slogan Higher et l'unique PLAY vers `/play_lisbon_street`, son récit et sa manette.

`gallery-audio.mjs` reste inchangé : basses d'approche, souffle au franchissement et onde méditative sont
synthétisés par Web Audio après un geste réel, sans fichier audio externe. Coupure du son, suspension en
liste/onglet masqué et réduction des mouvements restent disponibles. Le retour restaure la cour, avec le
flash doux existant hors mouvement réduit. La liste HTML et le repli sans WebGL exposent toujours les trois
collections et les vingt images Origins/Quantum.

## Continuité COM et backend

La base intégrée est `2e84f37` : les volumes du lot G de Claude, COM et backend, restent conservés. Ce lot ne
modifie ni compte, paiement, prix, propriété, règle d'accès, SQL ou fonction Edge. Il ne rejoue aucune migration
déjà appliquée par Claude. `/market`, collection, `/social`, `/s/:id`, les expériences et leurs ponts SSO restent
en place. Les anciens modules du temple restent historiques ; ils ne sont plus importés par l'accueil courant.

## Vérifications et publication mesurées

| Vérification | Résultat mesuré à ce stade |
| --- | --- |
| Navigation des quatre lieux : bornes, bassins, plantations, seuils et routes | 811/811 |
| Smoke WebGL préliminaire, quatre lieux | Aucune erreur JavaScript ou shader |
| Validation visuelle des reflets et de la piscine | Deux défauts corrigés et recapturés : cible miroir sans remise à l’échelle DPR, ouverture réelle de la terrasse au-dessus de la piscine |
| Suite navigateur complète ordinateur/téléphone | 161/161 : quatre lieux, vrais reflets natifs 512/256, collisions, vingt Origins dans l'ordre et leurs arrêts de 32 m, portes, retours, audio, pauses, mouvement réduit, course d'initialisation et repli sans WebGL ; aucune erreur applicative ou shader |
| Intégrité des expériences, médias, prix, accès et redirections | 85/85 |
| Régression Lisbon : galerie, récit et manette d'origine | 68/68 ordinateur/téléphone : 22 panneaux, positions de manette, aperçu animé/pauses, unique PLAY, Higher vectoriel, accès membre/visiteur, lecture, retour et marché |
| Déploiement et lectures HTTPS des domaines | Quatre projets READY, huit alias exacts ; 63/63 lectures HTTPS, corps/MIME/TLS vérifiés |

Le smoke préliminaire a révélé un problème de cadrage du reflet selon le DPR et une surface de terrasse
masquant la piscine. Les deux sont corrigés : les captures finales montrent le miroir complet et la piscine
visible. Le rendu des quatre lieux ne produit aucune erreur JavaScript ou shader. Preuves :
`/tmp/totehm-production/video-reference/integration/`, notamment `coast-final.png` pour la vue aérienne.
La suite complète a confirmé le cadrage intégral de la cible miroir et la piscine visible. Preuves :
`/tmp/totehm-production/brutalist-checks/results.json` et captures des quatre lieux dans ce répertoire.
Régression Lisbon : `/tmp/totehm-production/brutalist-lisbon/results.json`.
Les tests WebGL locaux utilisent les services interceptés et ne créent aucun compte, achat ou commande
de production. Les lectures ci-dessous portent sur les vrais domaines avec TLS normal.


## Publication constatée

Code `0e09bea2ff726b40095b55a733218a654112282a`, build `2026-10-19-space-coastal-brutalism`, publié sur
[www.totehm.space](https://www.totehm.space/) et [totehm.space](https://totehm.space/).
Mesure HTTPS : `2026-10-19T15:51:36.385599+00:00`. SPACE : `dpl_3hzHN2oN642NsCexZFoqVWHgCpaw`.

Les quatre projets Vercel sont READY sur ce commit et leurs huit alias pointent vers leurs déploiements
de production respectifs. Les 63 lectures comparent octet pour octet les réponses HTTPS aux sources Git :
accueil et modules SPACE www/apex, vingt JPG, papier THP, Origins et expériences/marché, trois pages COM
www/apex et accueil Club www/apex. Les pages COM et Club correspondent aussi à la base Claude `2e84f37`.
Aucune migration, fonction Edge, donnée, tarification ou opération de paiement n'a été changée ou rejouée.

Preuves : `/tmp/totehm-production/brutalist-code-ready.json`, `brutalist-code-live.json`,
`brutalist-checks/results.json` et `brutalist-lisbon/results.json`. Le contrôle WebGL est local, avec services
interceptés ; les domaines réels sont vérifiés par lectures HTTPS standard. La limite de certificat du
proxy dans le navigateur de production demeure ; aucune validation TLS n'a été désactivée.
