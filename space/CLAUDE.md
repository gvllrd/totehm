# space/CLAUDE.md — totehm.space

> L’état actuel (≤ 60 lignes). Les mesures de livraison vivent dans les commits.

Lisbon et New York sont deux galeries littorales de plain-pied : un château asymétrique en ruine, un donjon rectangulaire en retrait, trois baies voûtées profondes et un grand espace double hauteur en verre clair. Lisbon a une pierre plus chaude, New York plus grise. Lisbon conserve sa calçada extérieure d’origine, aux vagues noires et blanches et au médaillon de caravelle ; pierre ancienne à l’intérieur. New York conserve son sol ancien continu entre terrasse et intérieur. Profils bronze fins, lumière chaude rasante, aucun cloisonnement vide. L’île, la mer déchaînée, le ciel étoilé, le feu et les œuvres indépendantes sont communs.
Vercel dirige le Portugal vers `/lisbon-space`, les autres pays ou le pays inconnu vers `/new-york` ; ces deux entrées réécrivent vers `/`. Pays issu de l’IP, sans GPS ni certitude physique ; `/lisbon` reste l’œuvre Lisbon.
Space ouvre directement le monde, sans titre d’accueil ni commandes de panorama/saut/son. La navigation Artworks présente les expériences, sans destinations d’étage.

| fichier | rôle |
|---|---|
| `index.html` · `gallery-ui.mjs` · `gallery.css` | entrée immersive, liste accessible et connexion COM |
| `gallery-castle-space.mjs` | galerie commune : vitrage panoramique, toit incliné, sol de pierre, mobilier minimal, éclairage et sculpture monumentale au-dessus de l’entrée |
| `gallery-castle-plan.mjs` · `gallery-castle-fabric.mjs` | murs épais, donjon et arches réellement ouvertes ; même plan en mètres pour la maçonnerie et ses collisions |
| `gallery-modern.mjs` · `gallery-new-york.mjs` | fabriques des deux lieux, calcaire chaud ou grisé |
| `gallery-modern-layout.mjs` · `gallery-modern-navigation.mjs` | ancrages des œuvres, parcours au sol, collisions du verre et du château, saut et appuis |
| `gallery-new-york-layout.mjs` · `gallery-new-york-navigation.mjs` | même espace de plain-pied pour l’entrée New York |
| `gallery-glass-shell.mjs` | plan incliné du toit et véritable ouverture de fumée partagés par rendu, physique et sons |
| `gallery-lisbon-pavement.mjs` | calçada extérieure originale de Lisbon, quatre surfaces jointives sans recouvrement du sol intérieur |
| `gallery-ancient-floor.mjs` · `gallery-white-stone.mjs` | dalles physiques à arêtes usées, cartes photographiques CC0 locales, table et pierre du foyer |
| `gallery-heritage-masonry.mjs` | chargeur partagé de matériaux photographiques pour la nouvelle maçonnerie |
| `gallery-lectern-book.mjs` · `gallery-play-installation.mjs` · `gallery-opposite-installation.mjs` · `gallery-paper-packaging.mjs` | livre Origins dans le donjon, écrans sur pierre et coffrets THP sur table ; expériences indépendantes |
| `gallery-fireplace.mjs` · `gallery-fire-audio.mjs` | grand feu ouvert et véritable enregistrement de feu de bois |
| `gallery-temple-landscape.mjs` | seul piton émergé, lumière lunaire et environnement nocturne préfiltré |
| `gallery-liberty.mjs` | statue de la Liberté submergée dans l’océan de New York : couronne à 7 rayons, tête et torche dorée |
| `gallery-drowned-ocean.mjs` · `gallery-ocean-foam.mjs` · `gallery-ocean-spindrift.mjs` | océan 3D à 360°, crêtes, écume persistante et embruns volumétriques |
| `gallery-drowned-sky.mjs` · `gallery-drowned-planet.mjs` | Voie lactée, étoiles, météore, lune et globe submergé |
| `gallery-spatial.mjs` · `gallery-render-quality.mjs` | caméra, visite, suspendre/reprendre, adaptation graduelle du DPR |
| `vercel.json` · `api/location.js` · `api/card.js` | géographie, diagnostic sans cache et lecteurs sociaux |
| `origins.html` · `origins-book.mjs` · `origins-book.css` | vingt vidéos originales, pages tournantes et lecture au toucher |
| `get_higher.html` · `stoner.html` · `play_lisbon_street.html` · `same_but_opposite.html` | œuvres indépendantes, lecteurs et droits propres |
| `market.html` · `social.html` | marché, collection personnelle et lecteur ouvert par COM `/x/space` |
| `vendor/` · `assets/` | Three.js/HLS et véritables médias locaux ; licences dans les LICENSE.txt |

- Nuit permanente : 18 000 / 8 500 étoiles, Voie lactée et lune à 34 cratères. Lisbon : ciel étoilé sublimé à 7 classes spectrales O-M, nébuleuses ionisées et Pléiades maritimes. New York : statue de la Liberté submergée dans la mer déchaînée, couronne et torche dorée dressées. PMREM issu du ciel local. Météore effilé de 1,15 s toutes les 47 s ; mouvements figés en mode réduit.
- Mer à −96 m, crêtes bornées sous −11,48 m, calme à 110 m du piton. Eau détaillée sur 24 km de diamètre : 327 680 triangles ordinateur / 172 032 téléphone. Trois échelles de normales spectrales et courbure sur le globe de rayon 6 500 m.
- Écume persistante GPU sur deux cibles 256² / 128² à 30 / 20 Hz, dissipation de 7,8 s. Brume : 80 / 40 volumes, cinq échantillons par rayon, opacité ≤ 0,13 ; aucun autre sol émergé.
- Les deux galeries ont un seul sol à −0,09 m, un intérieur de 26 × 15 m, une entrée libre de 5,6 × 5,1 m et un toit vitré incliné d’environ 7,2 à 9,8 m. Aucune rampe ni étage intermédiaire. Les murs pleins restent au périmètre ; trois arches sont réellement vides et le donjon se visite.
- Lisbon : calçada extérieure originale à −0,09 m, caravelle centrée en [0, 4] et vagues Mar Largo ; pierre ancienne limitée à l’intérieur vitré, sans surfaces superposées. New York : pierre ancienne continue sur la terrasse et à l’intérieur. Les textures locales et les tableaux typés restent partagés.
- La table de pierre de 3,6 m expose six THP individuels dans leurs coffrets premium noirs et vitrés, aux proportions exactes de `/get_higher`. Aucun papier libre ni cadre THP mural. La bouche et sa langue sculptées sont monumentales, centrées juste au-dessus de l’entrée, avec leur THP original et deux éclairages dédiés.
- Origins repose sur un socle de la même pierre que la table, dans le donjon clos à gauche, avec sa dalle inclinée à 18°. Lisbon est à gauche et Same but opposite au centre du mur arrière en pierre ; aucun art sur le verre. Lisbon montre les 22 panneaux originaux flottant comme dans `/play_lisbon_street`, sans décodeur vidéo dans l’accueil 3D. L’ancien accès Stoner mène à la table.
- Feu à droite de 4,34 m : neuf bûches aux écorces fendues en relief, cendres, braises et étincelles ; flammes à pulsations indépendantes et filaments translucides. Le verre conduit la fumée à un véritable oculus. Toucher le bois guide au foyer. Son local stéréo de 25,54 s, boucle fondue ; source et crédit `assets/fire/LICENSE.txt`.
- Marche à 2,6 m/s et guidage autour des vrais obstacles. Touche Espace : envol extérieur de 18 000 m en 14 s simulées ; murs, toit et mobilier solides. Aucune relance en l’air. Une visite demandée en vol attend le retour sur la terrasse.
- Vent/mer atténués sous la toiture réelle ; geste initial et préférence muet conservés. Liste, onglet masqué ou perte de focus suspendent la scène et le son. Retour navigateur restaure le monde.
- Téléphone : DPR initial min(natif, 2), plancher min(natif, 1,5), adaptation graduelle réversible. Sans WebGL, les liens HTML donnent accès aux œuvres.
- Connexion unique : `totehm.com/auth` en PKCE ; connecté, pseudo du profil et clic vers COM `/totehm` par `sso-mint`. Aucun menu membre local. Market, My collection, Collect et Full experience restent accessibles.
- Propriété et argent au webhook ; prix, stock et accès du serveur. Aucun changement SQL, Edge Function ou tarif dans la galerie.

Tests actifs de la nouvelle architecture : `node tests/node/castle_rebuild.mjs` ; `tests/browser/gallery_castle_rebuild.mjs` pour les deux lieux, ordinateur/téléphone, mer/ciel et ouverture réelle des œuvres. Les tests indépendants des lecteurs, du marché, de la connexion et des gestes Origins restent propres à leurs composants.
