# Visite de la galerie SPACE — 15 octobre 2026

Publiée sur `https://www.totehm.space/` : code `5372e71413058b09cae2d573b158cc64bea0ef4c`,
production Vercel `dpl_7r88tzsHZXV2bdfnWULDNzbCWvkS` READY, deux alias associés. Les quatre projets
et leurs huit alias sont vérifiés à ce commit. Vingt contrôles HTTPS de contenu réussis : accueil,
moteur, modules, styles, aperçus, expériences, marché, social et raccordements entre domaines.
Les réponses correspondent exactement aux fichiers du dépôt, avec leurs types MIME attendus.

L'accueil de SPACE devient une salle d'exposition 3D visitable, avec murs, cadres, socle, banc et lumière naturelle.
Quatre œuvres existantes y donnent accès à TotehmPaper/Get Higher, Stoner, Play the Lisbon Street et Origins/Quantum.
Le marché et la collection restent accessibles dans l'en-tête et depuis les œuvres.

Le regard suit le glisser. Le clic au sol déplace le visiteur ; WASD et les flèches permettent de marcher sur
ordinateur, le joystick au toucher sur téléphone. Les quatre stations proposent une visite guidée. Le retour
à l'entrée retrouve la vue d'ensemble. La vue Artworks expose aussi toutes les œuvres dans un document HTML,
automatiquement en absence de WebGL ou en perte de contexte ; elle fonctionne également sans JavaScript.

Le rendu ne tourne que pendant un déplacement, une mise à jour ou la lecture vidéo. Quantum ne charge son média
qu'à sa sélection ; quitter sa visite, masquer la page ou demander moins d'animations arrête la vidéo. Les
transitions deviennent immédiates avec cette préférence. Aucun microphone, caméra ou géolocalisation demandé.

Les SVG Higher et Stoner ainsi que les panneaux de Lisbonne sont les aperçus existants, sans modification des
expériences originales. Le poster Quantum est extrait du média public déjà utilisé par l'ancien accueil.
Le moteur Three.js 0.180.0 est versionné localement avec sa licence MIT ; archive npm vérifiée par SHA-512 :
`o+qycAMZrh+TsE01GqWUxUIKR1AL0S8pq7zDkYOQw8GqfX8b8VoCKYUoHbhiX5j+7hr8XsuHDVU6+gkQJQKg9w==`.

| Vérification | Résultat |
| --- | --- |
| `tests/browser/gallery_immersive.mjs` | 34 réussites : rendu WebGL réel à 1440/390 px, stations, clic au sol, clavier, vrai toucher du joystick, vidéo, mouvement réduit, repli sans WebGL |
| `tests/browser/gallery.mjs` | 41 contrôles réussis : marché, propriété, revente, paiement simulé, collection et ancienne adresse sociale |
| Expériences originales | Préservées ; seul l'accueil change |
| Navigateur en production | Non exécuté : certificat proxy Chromium non reconnu ; refus automatique de modification de confiance conservé |

Les tests navigateur utilisent les vrais fichiers du moteur et un rendu local, avec services et média interceptés.
Ils ne créent aucun compte et ne réalisent aucun paiement. Les captures sont sous
`/tmp/totehm-production/immersive-final`. La publication se vérifie sur `https://www.totehm.space/` par état Vercel,
association des alias et comparaison des fichiers servis.
