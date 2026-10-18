# SPACE, dôme des intentions — 16 octobre 2026

Direction suivante : [temple au-dessus des nuages et couloirs dans le vide du 17 octobre](SPACE_TEMPLE_20261017.md).
Ce document conserve la conception et les mesures de la livraison du dôme du 16 octobre.

SPACE prolonge en 3D les sept traits d'intention du processeur COM. Les murs et le sol utilisent un matériau
noir absolu non éclairé ; le marbre et le ficus figuratif quittent la scène. `gallery-dome.mjs` dessine un arbre
abstrait, ses ramifications, les sept arcs du dôme et la porte avec un seul maillage de traits de 2 px CSS,
sans bloom ni flou. Le ciel animé reste visible entre les arcs. Palette identique à `com/totehm.html` :

| Intention | Couleur |
| --- | --- |
| Fight | `#E24B4A` |
| Flow | `#e48b31` |
| Enrich | `#fcbe21` |
| Love | `#639922` |
| Express | `#1D9E75` |
| Focus | `#378ADD` |
| Celebrate | `#7F77DD` |

Le mur circulaire de 80 cm d'épaisseur laisse une ouverture à l'opposé de l'entrée. La marche et les visites
contournent le tronc abstrait ; on ne traverse un mur que par cette porte. Le clic sur le passage et le bouton
Explore space conduisent dehors. Les mêmes commandes permettent de continuer ; Drift further propose une
nouvelle étape, Return to the dome revient à l'entrée. `gallery-path.mjs` borne le coût des collisions même
très loin du dôme et conserve un chemin de retour.

`gallery-journey.mjs` renouvelle des sculptures de lignes, des orbites, des pétales célestes, un tissu et une
spirale dans un espace sans limite de distance. Le nombre de secteurs conservés reste fixé à cinq sur
ordinateur, trois au téléphone, avec libération des géométries remplacées. Aucun second ciel ni média externe
n'est chargé par ce décor. Il ne crée aucune œuvre, édition ou offre commerciale.

La visite propose trois collections :

1. TotehmPaper {THP} / The Stoner Experience, réunis. Le cadre montre exactement le papier PNG présent dans
   `get_higher` ; Enter ouvre cette présentation et The method ouvre le lecteur Stoner avec ses droits existants.
2. Origins / Quantum : les vingt œuvres réelles accrochées en deux rangées de chaque côté de la porte.
   `gallery-artworks.mjs` reprend les titres et identifiants du catalogue public. Les JPG proviennent des vingt
   vidéos publiques `wah/1.mp4`…`20.mp4`, sans œuvre de substitution. Chaque cadre ouvre son information, avec
   accès à `/origins?work=NN` et au marché de l'œuvre. La grille HTML présente aussi les vingt images.
3. Neuro Street Art Digital : aperçu des 22 panneaux flottants et slogan Higher, unique PLAY vers le même
   récit/manette Lisbon. Cette expérience et ses corrections précédentes sont conservées.

Origins garde tous ses médias, textes, prix, droits et gestes. Le seul ajout à son lecteur est un bloc balisé
qui accepte le numéro `work` de 1 à 20 ; une valeur invalide conserve l'introduction. Les hashes historiques
`#stoner` et `#quantum` retrouvent leur collection, et `#origin-NN` retrouve une photo dans le dôme.

La réduction des mouvements fige les décors et rend les visites immédiates ; liste et page masquée suspendent
la scène. La résolution du rendu reste adaptative et les commandes HTML gardent leur définition. La liste et
le repli sans WebGL conservent toutes les portes vers les expériences. Aucun SQL, fonction Edge, prix ou droit
n'est modifié. Les changements COM/Club de Claude intégrés sur `c386ebc` (lots E et F) sont conservés ; sa migration déjà
appliquée n'est pas rejouée par ce lot.

Sources des images et vidéos, empreintes et temps d'extraction :
`/tmp/totehm-production/dome-assets/provenance.json`. Captures du premier parcours : `dome-smoke/`.


## Vérification avant publication

| Suite | Résultat |
| --- | --- |
| Dôme, arbre, vingt cadres, porte, voyage et retour (`gallery_dome`) | 60/60 |
| Déplacement, clavier, joystick tactile et repli (`gallery_immersive`) | 34/34 |
| Thème sombre, contraste, menu et liste (`gallery_dark`) | 49/49 |
| Lisbon : aperçu animé, récit/manette, accès et marché (`gallery_lisbon`) | 66/66 |
| Liens Origins : chapitre exact, suivant et requête invalide (`gallery_origins`) | 16/16 |
| Occlusion : mur extérieur opaque au clic, cadre accessible depuis l'intérieur | 5/5 |
| Trajets, collisions, vingt approches et retour depuis un million de mètres | 67/67 |
| Intégrité des expériences, médias, prix, accès et redirections | 85/85 |

230 vérifications navigateur et 152 invariants locaux réussis. Les suites principales passent à 1440 × 1000
et 390 × 844 px avec un vrai rendu WebGL, sans erreur JavaScript ni shader. Le test du voyage franchit la porte,
continue sur sept secteurs supplémentaires à plus de 200 mètres et revient ; le nombre de secteurs en mémoire
reste fixé à cinq/trois. Les pauses en liste, page masquée et mouvement réduit sont vérifiées.

Les tests navigateur servent les fichiers locaux sous l'origine réelle avec services interceptés. Ils ne
créent aucun compte, commande ni paiement. Les vérifications des domaines après publication utilisent HTTPS
avec validation TLS normale ; le navigateur de production reste limité par le certificat du proxy dans cet
environnement. Les copies COM de Claude du lot F (`c386ebc`) doivent être conservées octet pour octet.

Preuves : `/tmp/totehm-production/intention-dome/results.json`, `intention-dome-dark/results.json`,
`intention-dome-lisbon/results.json`, `origins-gallery-links/results.json`, `dome-occlusion/results.json`
et captures `intention-dome-immersive/`.


## Publication mesurée

Code publié sur main : `069ed64714c2e5fba8f21f38cd2a10a1180d589e`. Vérification des vrais domaines : `2026-10-16T18:36:09.318322+00:00`.
Les quatre projets Vercel sont READY en production à ce commit ; chacun des huit alias pointe sur le bon
déploiement. SPACE : `dpl_FJ6C3UZSfUZk1zEowhoukpLhtv7n`.

Les 49/49 lectures HTTPS ont réussi : accueil, styles et sept modules/lecteur sur www/apex SPACE, les vingt JPG
Origins et le PNG TotehmPaper, les quatre expériences/marché, et `/totehm`, `/higher`, `/monetize` sur les deux
origines COM. Tous les corps sont identiques au dépôt, avec le bon MIME et TLS validé. Les six lectures COM
sont aussi identiques à Claude `c386ebc`, octet pour octet.

Preuves du code publié : `/tmp/totehm-production/dome-code-ready.json` et `dome-code-live.json`.
Un commit documentaire peut suivre cette mesure sans modifier les fichiers servis.
