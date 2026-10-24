# space/CLAUDE.md — totehm.space

> L’état actuel (≤ 60 lignes). On y travaille à la demande de Wah. Les mesures de livraison vivent dans les commits.

Une petite galerie contemporaine vit au sommet d’une Terre engloutie, sur la calçada de Lisbonne, face à l’océan sous la Voie lactée.
La bouche originale orne la devanture noire vitrée. Dedans : comptoir THP en face, livre Origins à gauche, salon Lisbon à droite.
Les trois installations sont manipulables sur place ; les pages indépendantes et toute la marketplace restent disponibles.

| fichier | rôle |
|---|---|
| `index.html` · `gallery-ui.mjs` · `gallery.css` | entrée, commandes des installations, panoramas, liste accessible et SSO existant |
| `gallery-spatial.mjs` · `gallery-modern-navigation.mjs` · `gallery-modern-layout.mjs` | caméra, parcours autour des meubles, collisions, saut et plafond/toit |
| `gallery-modern.mjs` | pavillon noir/vitré, bouche originale, comptoir de papiers perforés, canapé et tables |
| `gallery-origins-book.mjs` · `gallery-play-installation.mjs` | livre de 10 doubles pages et manette de 22 panneaux commandant les clips publics sur l’écran 3D |
| `gallery-3d.mjs` · `gallery-temple*.mjs` | ancien temple et portes conservés ; paysage et pierre partagés avec la galerie |
| `gallery-lisbon-pavement.mjs` | calçada noir/blanc : vagues Mar Largo et caravelle en médaillon, joints et relief des mêmes pavés |
| `gallery-temple-landscape.mjs` | seul piton émergé, lune, pierre éclairée et environnement nocturne préfiltré |
| `gallery-drowned-ocean.mjs` | océan 3D à 360°, fronts irréguliers recourbés dans la surface, creux sombres, reflets lunaires et embruns |
| `gallery-ocean-foam.mjs` | mémoire d’écume GPU : naissance par compression, advection, drainage et dissipation |
| `gallery-ocean-spindrift.mjs` | volumes de brume arrachée aux crêtes, modelés par le vent et éclairés par la lune |
| `gallery-drowned-sky.mjs` | Voie lactée à filaments et poussières, étoiles fines et météore effilé ; champ proche pendant l’envol |
| `gallery-drowned-planet.mjs` | globe submergé, relief continental sous l’eau et fine atmosphère ; teinte partagée avec la mer |
| `gallery-temple-assets.mjs` · `assets/temple/` | 6 cartes de pierre PBR 1k chargées pour les arches et le socle ; sources CC0 dans LICENSE.txt |
| `gallery-audio.mjs` · `gallery-lisbon.mjs` | vent/mer stéréo synthétisés, grave des portes et souffle Web Audio ; aperçu des vrais panneaux |
| `get_higher.html` · `stoner.html` · `stoner_terms.html` | TotehmPaper et méthode Stoner, dans leurs propres fichiers et avec leurs droits serveur |
| `origins.html` · `play_lisbon_street.html` | Origins et Lisbon autonomes, leurs lecteurs/manette/médias originaux |
| `market.html` | marketplace complète : achats primaires, revente, propriétaires, provenance et ma collection |
| `social.html` · `api/card.js` | lecteur ouvert par COM `/x/space` · aperçu `/s/:id` |
| `assets/ocean/` | deux cartes originales 1024² : normales Fourier et écume cellulaire, données linéaires avec mipmaps ; provenance dans LICENSE.txt |
| `vendor/` · `assets/` | Three.js/HLS, textures et vrais médias ; `assets/gallery/book-origins/` : 20 tirages originaux, sources dans LICENSE.txt |

- Nuit permanente : arche galactique relevée, filaments lumineux et poussières opaques ; 18 000 / 8 500 étoiles aux cœurs fins et halos discrets, quatre températures, lune à 34 cratères. PMREM issu du ciel local, sans panorama/HDR externe.
- Météore en ruban de 62 triangles : passage effilé de 1,15 s toutes les 47 s, sur la même horloge que le ciel ; aucun défilement autonome en mouvement réduit.
- Sol : pavés de basalte/calcaire 7,9 × 7,3 cm suivant les vagues, joints et biseaux PBR de 3,7 mm. Caravelle composée des mêmes pierres dans un médaillon de 7 m centré en x=0, z=4 ; masque vectoriel original 1024² / 512², sans DOM ni réseau.
- Océan à −96 m, crêtes de la surface principale bornées sous −11,48 m, calme à 110 m du piton ; aucun autre sol émergé. Astres/eau/embruns et simulation d’écume figés en mouvement réduit.
- Eau détaillée sur 24 km de diamètre : 327 680 triangles ordinateur / 172 032 téléphone, 4 800 / 1 800 points d’embruns ; maillage rapproché régulier puis logarithmique, détails filtrés jusqu’à 1 800 m.
- Trois échelles de normales spectrales ; les faces retournées reflètent l’eau sombre sous l’horizon, l’écume ancienne devient humide et translucide. Gouttes entraînées dans le vent tangent au globe.
- Brume : 80 / 40 ellipsoïdes sur les crêtes, 160 / 80 triangles de support, cinq échantillons de densité par rayon ; éclairage lunaire et profondeur réelle du volume, opacité ≤ 0,13, sommet borné sous −3,72 m. Aucun fichier externe ni texture propre.
- Mer courbée sur le globe de rayon 6 500 m : le déplacement Gerstner recourbe les fronts du même maillage, avec leurs tangentes exactes, eau sombre et transmission fine. En hauteur, les continents restent sous une seule mer.
- Écume persistante sur deux cibles 256² / 128² à 30 / 20 Hz : densité RG16, âge et naissance ; dissipation de 7,8 s, dentelle fine et sillages entraînés par le vent. Sans cartes ou sans rendu GPU, secours local ; état du moteur restauré après chaque passe.
- La galerie mesure 26 × 15 m, entrée centrale de 4,8 m, verrière à 6,2 m. Aucune colonne ni végétation ; les baies révèlent l’océan.
- Le comptoir expose 6 feuilles de 12 THP et 5 papiers détachés, en utilisant le dessin perforé original, sans prix local.
- Livre physique : Origins 01–20 dans l’ordre exact, 10 doubles pages, vue de lecture, pages animées et bornes sans boucle ; tirages des vidéos publiques et cache limité.
- Manette : les 22 vrais PNG à leurs coordonnées originales ; un clic choisit le clip public correspondant, flèches choisissent, Entrée lance, Espace pause.
- Écran CanvasTexture 3D à 15 Hz pendant la lecture ; aucune lecture automatique. Liste/masqué/blur/départ du salon mettent en pause, sans reprise automatique.
- Marche 2,6 m/s, guidage 1 450–4 200 ms autour des murs et meubles. Les trois boutons conduisent aux installations, sans changer de page.
- Espace ou Jump : envol extérieur de 18 000 m en 14 s simulées ; plafond, murs, mobilier et toit solides. Aucune relance en l’air.
- Guidage/réduction/cache arrière préservent altitude et vitesse ; une visite demandée en l’air attend le retour sur la terrasse avant d’entrer.
- Vent et mer après un geste réel, grave à l’approche de l’entrée, atténué par la hauteur ; au-delà de 3 000 m, onde méditative. Bouton muet/préférence conservés ; liste/masqué/blur suspendent le son.
- Au sommet, cadrage doux du globe entier et 1 600 / 720 points stellaires proches ; glisser reprend la vue. Mouvement réduit : décor figé, guidage horizontal immédiat, saut intentionnel sans recadrage/FOV. Sans WebGL, liens HTML.
- Les expériences gardent leurs fichiers et clients SSO ; seuls les photos et clips publics sont montrés sur place. Collect mène au marché serveur existant.
- Le marché reste autonome, y compris après Stripe. Prix, stock et accès du serveur, propriété au webhook ; aucun changement SQL/Edge/tarif.
- Market, My collection, Collect et Full experience gardent leurs routes absolues existantes ; les anciens modules et pages sont conservés.

Tests : `tests/browser/gallery_modern.mjs` · `tests/node/modern_navigation.mjs` ; mer/ciel/pavés et pages indépendantes préservés.
