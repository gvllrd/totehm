# space/CLAUDE.md — totehm.space

> L’état actuel (≤ 60 lignes). Les mesures de livraison vivent dans les commits.

Lisbon retrouve le bâtiment intact du commit `c8ddaf0` : façade d’azulejos cobalt et ivoire, douze fenêtres sur trois rangées, huit balcons en fer et cinquante-huit balustres, prolongée par un toit de verre ondulé. New York conserve son château asymétrique en ruine, son donjon, ses trois baies voûtées et son grand volume de verre à toit plan incliné. Les deux galeries restent de plain-pied ; Lisbon garde sa calçada extérieure aux vagues et à la caravelle, New York sa pierre ancienne continue. L’île, la mer déchaînée, le ciel étoilé, le feu et les œuvres indépendantes sont communs.
Vercel dirige le Portugal vers `/lisbon-space`, les autres pays ou le pays inconnu vers `/new-york` ; ces deux entrées réécrivent vers `/`. Pays issu de l’IP, sans GPS ni certitude physique ; `/lisbon` reste l’œuvre Lisbon.
Space ouvre directement le monde, sans titre d’accueil ni commandes de panorama/saut/son. La navigation Artworks présente les expériences, sans destinations d’étage.

| fichier | rôle |
|---|---|
| `index.html` · `gallery-ui.mjs` · `gallery.css` | entrée immersive, liste accessible et connexion COM |
| `gallery-castle-space.mjs` | mobilier, œuvres et sols communs ; enveloppe aux azulejos à Lisbon, château et toit plan incliné à New York |
| `gallery-castle-plan.mjs` · `gallery-castle-fabric.mjs` | château de New York : murs épais, donjon, arches réellement ouvertes et collisions correspondantes |
| `gallery-modern.mjs` · `gallery-new-york.mjs` | fabriques des deux lieux : Lisbon aux azulejos restaurés, New York au château grisé |
| `gallery-modern-layout.mjs` · `gallery-modern-navigation.mjs` | ancrages des œuvres, parcours au sol, collisions et appuis selon le bâtiment et son profil de toit |
| `gallery-new-york-layout.mjs` · `gallery-new-york-navigation.mjs` | espace de plain-pied, parcours et physique du château de New York |
| `gallery-lisbon-azulejo-building.mjs` · `gallery-lisbon-azulejo-facade.mjs` · `gallery-lisbon-azulejo-tiles.mjs` | enveloppe Lisbon de `c8ddaf0`, façade intacte, balcons et toiture ondulée |
| `gallery-lisbon-shell.mjs` · `gallery-glass-shell.mjs` | profils de toit, collisions et oculus : vague à Lisbon, plan incliné à New York ; foyer à droite |
| `gallery-lisbon-exhibition-stone.mjs` | pierre d’exposition au fond et alcôve de lecture protégée à gauche dans Lisbon |
| `gallery-lisbon-pavement.mjs` | calçada extérieure originale de Lisbon, quatre surfaces jointives sans recouvrement du sol intérieur |
| `gallery-ancient-floor.mjs` · `gallery-white-stone.mjs` | dalles physiques à arêtes usées, cartes photographiques CC0 locales, table et pierre du foyer |
| `gallery-heritage-masonry.mjs` | maçonnerie photographique partagée par la pierre d’exposition et l’alcôve de Lisbon |
| `gallery-lectern-book.mjs` · `gallery-play-installation.mjs` · `gallery-opposite-installation.mjs` · `gallery-paper-packaging.mjs` | livre Origins dans l’alcôve à Lisbon ou le donjon à New York, écrans sur pierre et coffrets THP ; expériences indépendantes |
| `gallery-lisbon-street-signs.mjs` | 22 signes de Lisbon : marquages au sol, signalisation routière, plaques, feux piétons, croix de pharmacie et emblème en relief |
| `gallery-fireplace.mjs` · `gallery-fire-audio.mjs` | grand feu ouvert et véritable enregistrement de feu de bois |
| `gallery-temple-landscape.mjs` | seul piton émergé, lumière lunaire et environnement nocturne préfiltré |
| `gallery-liberty.mjs` | scan 3D photogrammétrique de la statue de la Liberté submergée dans la mer de New York : cuivre et torche dorée |
| `gallery-drowned-ocean.mjs` · `gallery-ocean-foam.mjs` · `gallery-ocean-spindrift.mjs` | océan 3D à 360°, crêtes, écume persistante et embruns volumétriques |
| `gallery-drowned-sky.mjs` · `gallery-drowned-planet.mjs` | Voie lactée, étoiles, météore, lune et globe submergé |
| `gallery-spatial.mjs` · `gallery-render-quality.mjs` | caméra, visite, suspendre/reprendre, adaptation graduelle du DPR |
| `vercel.json` · `api/location.js` · `api/card.js` | géographie, diagnostic sans cache et lecteurs sociaux |
| `origins.html` · `origins-book.mjs` · `origins-book.css` | vingt vidéos originales, pages tournantes et lecture au toucher |
| `get_higher.html` · `stoner.html` · `play_lisbon_street.html` · `same_but_opposite.html` | œuvres indépendantes, lecteurs et droits propres |
| `market.html` · `social.html` | marché, collection personnelle et lecteur ouvert par COM `/x/space` |
| `vendor/` · `assets/` | Three.js/HLS et véritables médias locaux ; licences dans les LICENSE.txt |

- Nuit permanente : 18 000 / 8 500 étoiles, Voie lactée et lune à 34 cratères. Lisbon : ciel étoilé sublimé à 7 classes spectrales O-M, nébuleuses ionisées et Pléiades maritimes. New York : scan 3D photogrammétrique de la statue de la Liberté submergée dans la houle. PMREM issu du ciel local. Météore effilé de 1,15 s toutes les 47 s ; mouvements figés en mode réduit.
- Mer à −96 m, crêtes bornées sous −11,48 m, calme à 110 m du piton. Eau détaillée sur 24 km de diamètre : 327 680 triangles ordinateur / 172 032 téléphone. Trois échelles de normales spectrales et courbure sur le globe de rayon 6 500 m.
- Écume persistante GPU sur deux cibles 256² / 128² à 30 / 20 Hz, dissipation de 7,8 s. Brume : 80 / 40 volumes, cinq échantillons par rayon, opacité ≤ 0,13 ; aucun autre sol émergé.
- Les deux galeries ont un seul sol à −0,09 m et un intérieur de 26 × 15 m, sans rampe ni étage intermédiaire. Lisbon : entrée de 4,8 × 3,1 m, façade de 7,65 m et toit vitré en onde de 6 à 8,4 m rejoignant la corniche à 7,25 m. New York : entrée de 5,6 × 5,1 m, toit plan incliné d’environ 7,2 à 9,8 m ; trois arches réellement vides et donjon visitable.
- Lisbon : calçada extérieure originale à −0,09 m, caravelle centrée en [0, 4] et vagues Mar Largo ; pierre ancienne limitée à l’intérieur vitré, sans surfaces superposées. New York : pierre ancienne continue sur la terrasse et à l’intérieur. Les textures locales et les tableaux typés restent partagés.
- Lisbon seulement : 22 signes selon leur usage réel, 15 dehors et 7 dedans. Héliport et passage piéton peints au sol ; feux rouge/vert ensemble ; Hotel, AED et sortie sur plaques ; emblème en relief sur pierre ; pharmacie en croix lumineuse animée ; grand panneau autoroutier sur deux supports. Quinze supports solides, verre et caravelle dégagés. Stickers Higher discrets (environ 8–24 cm, 28 cm sur le grand panneau et 35 cm au sol), ratio 3:1. Stickers réduits aussi à 24 % dans la vue interactive. « Make it useful » au survol/clic ouvre immédiatement le clip respectif ; chaque clip propose « Get Higher to get it », Totehmpaper puis Stoner restant la clé de lecture.
- La table de pierre de 3,6 m expose six THP individuels dans leurs coffrets premium noirs et vitrés, aux proportions exactes de `/get_higher`. Aucun papier libre ni cadre THP mural. La bouche et sa langue sculptées sont monumentales, centrées juste au-dessus de l’entrée, avec leur THP original et deux éclairages dédiés.
- Origins garde son socle de la même pierre que la table et sa dalle inclinée à 18° : alcôve protégée par trois murs à gauche à Lisbon, donjon à New York. Lisbon est à gauche et Same but opposite au centre, fixés sur la pierre d’exposition au fond ; aucun art sur le verre. Lisbon montre les 22 panneaux originaux flottant comme dans `/play_lisbon_street`, sans décodeur vidéo dans l’accueil 3D. L’ancien accès Stoner mène à la table.
- Feu à droite de 4,34 m : neuf bûches aux écorces fendues en relief, cendres, braises et étincelles ; flammes à pulsations indépendantes et filaments translucides. Le verre conduit la fumée à un véritable oculus. Toucher le bois guide au foyer. Son local stéréo de 25,54 s, boucle fondue ; source et crédit `assets/fire/LICENSE.txt`.
- Marche à 2,6 m/s et guidage autour des vrais obstacles. Touche Espace : envol extérieur de 18 000 m en 14 s simulées ; murs, toit et mobilier solides. Aucune relance en l’air. Une visite demandée en vol attend le retour sur la terrasse.
- Vent/mer atténués sous la toiture réelle ; geste initial et préférence muet conservés. Liste, onglet masqué ou perte de focus suspendent la scène et le son. Retour navigateur restaure le monde.
- Téléphone : DPR initial min(natif, 2), plancher min(natif, 1,5), adaptation graduelle réversible. Sans WebGL, les liens HTML donnent accès aux œuvres.
- Connexion unique : `totehm.com/auth` en PKCE ; connecté, pseudo du profil et clic vers COM `/totehm` par `sso-mint`. Aucun menu membre local. Market, My collection, Collect et Full experience restent accessibles.
- Propriété et argent au webhook ; prix, stock et accès du serveur. Aucun changement SQL, Edge Function ou tarif dans la galerie. Les clips Lisbon restent le teasing public ; la possession du THP et l’accès Stoner restent vérifiés par le serveur.

Tests de restauration : `node tests/node/lisbon_azulejo_restoration.mjs` et `tests/browser/gallery_lisbon_azulejo_restoration.mjs`, avec conservation du château New York. Les tests des 22 signes contrôlent leurs objets, leurs parcours et le clic direct vers les animations. Les tests indépendants des lecteurs, du marché, de la connexion et des gestes Origins restent propres à leurs composants.
