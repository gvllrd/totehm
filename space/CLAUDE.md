# space/CLAUDE.md — totehm.space

> L’état actuel (≤ 60 lignes). On y travaille à la demande de Wah. Les mesures de livraison vivent dans les commits.

Le dernier temple au sommet d’une Terre engloutie : océan à 360°, houles monumentales sous une nuit permanente.
La terrasse en calçada de Lisbonne porte trois grandes portes sans étiquette au-dessus, face à l’océan ; aucune colonne, toit ou végétation.
Les trois portes ouvrent leurs pages indépendantes : `/get_higher`, `/origins`, `/play_lisbon_street`.
La porte TotehmPaper montre de nombreux papiers originaux perforés suspendus ; celle de Lisbon ses panneaux flottants.

| fichier | rôle |
|---|---|
| `index.html` · `gallery-ui.mjs` · `gallery.css` | entrée, portes, panoramas, liste accessible et SSO existant |
| `gallery-3d.mjs` · `gallery-temple-navigation.mjs` | caméra, guidage, clavier/sol/joystick, passage vers les pages |
| `gallery-temple.mjs` | terrasse pavée PBR et trois portes monumentales indépendantes |
| `gallery-lisbon-pavement.mjs` | calçada noir/blanc : vagues Mar Largo et caravelle en médaillon, joints et relief des mêmes pavés |
| `gallery-temple-layout.mjs` · `gallery-temple-physics.mjs` | dimensions partagées, saut balistique au sol et collisions des arches |
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
| `vendor/` · `assets/` | Three.js/HLS, textures de pierre et vrais médias |

- Nuit permanente : arche galactique relevée, filaments lumineux et poussières opaques ; 18 000 / 8 500 étoiles aux cœurs fins et halos discrets, quatre températures, lune à 34 cratères. PMREM issu du ciel local, sans panorama/HDR externe.
- Météore en ruban de 62 triangles : passage effilé de 1,15 s toutes les 47 s, sur la même horloge que le ciel ; aucun défilement autonome en mouvement réduit.
- Sol : pavés de basalte/calcaire 7,9 × 7,3 cm suivant les vagues, joints et biseaux PBR de 3,7 mm. Caravelle composée des mêmes pierres dans un médaillon de 7 m centré en x=0, z=4 ; masque vectoriel original 1024² / 512², sans DOM ni réseau.
- Océan à −96 m, crêtes de la surface principale bornées sous −11,48 m, calme à 110 m du piton ; aucun autre sol émergé. Astres/eau/embruns et simulation d’écume figés en mouvement réduit.
- Eau détaillée sur 24 km de diamètre : 327 680 triangles ordinateur / 172 032 téléphone, 4 800 / 1 800 points d’embruns ; maillage rapproché régulier puis logarithmique, détails filtrés jusqu’à 1 800 m.
- Trois échelles de normales spectrales ; les faces retournées reflètent l’eau sombre sous l’horizon, l’écume ancienne devient humide et translucide. Gouttes entraînées dans le vent tangent au globe.
- Brume : 80 / 40 ellipsoïdes sur les crêtes, 160 / 80 triangles de support, cinq échantillons de densité par rayon ; éclairage lunaire et profondeur réelle du volume, opacité ≤ 0,13, sommet borné sous −3,72 m. Aucun fichier externe ni texture propre.
- Mer courbée sur le globe de rayon 6 500 m : le déplacement Gerstner recourbe les fronts du même maillage, avec leurs tangentes exactes, eau sombre et transmission fine. En hauteur, les continents restent sous une seule mer.
- Écume persistante sur deux cibles 256² / 128² à 30 / 20 Hz : densité RG16, âge et naissance ; dissipation de 7,8 s, dentelle fine et sillages entraînés par le vent. Sans cartes ou sans rendu GPU, secours local ; état du moteur restauré après chaque passe.
- Arches à 12,024 m avec leurs biseaux, ouvertures de 4,5 × 10,725 m ; aucun panneau, support, texture de titre ou objet cliquable au-dessus.
- Terrasse libre hors des vraies pierres ; aucune collision des anciens bacs ou colonnes. Portes en x=−9/0/9, z=−12 ; limites de plateforme conservées.
- Espace ou bouton Jump : envol de 18 000 m en 14 s aller-retour simulées, réception au sol ; aucune relance en l’air. Les arches restent solides.
- Le guidage, le mode réduit et le cache arrière préservent altitude et vitesse. Une entrée demandée en l’air attend la réception au sol ; pause réelle en liste/onglet masqué.
- Marche 2,6 m/s, guidage doux 1 450–4 200 ms. Choisir une porte approche ; entrer/franchir lance sa page après le souffle/FOV de 800 ms.
- Vent et mer après un geste réel, grave des portes atténué par la hauteur ; au-delà de 3 000 m, onde méditative. Bouton muet/préférence conservés ; liste/masqué/blur suspendent le son.
- Au sommet, cadrage doux du globe entier et 1 600 / 720 points stellaires proches ; glisser reprend la vue. Mouvement réduit : décor figé, guidage horizontal immédiat, saut intentionnel sans recadrage/FOV. Sans WebGL, liens HTML.
- Les expériences gardent leurs propres fichiers et clients SSO. Aucune vidéo privée ou lecteur de paiement intégré au temple.
- Le marché reste autonome, y compris après Stripe. Prix, stock et accès du serveur, propriété au webhook ; aucun changement SQL/Edge/tarif.
- Menu Market et My collection, offres de chaque porte et cartes des vingt Origins conservent leurs routes absolues existantes.

Tests : `tests/browser/gallery_ocean.mjs`, `gallery_temple_restored.mjs`, `gallery_audio.mjs`, `market.mjs`, `tests/node/temple_navigation.mjs`, `temple_physics.mjs`.
