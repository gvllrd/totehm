# space/CLAUDE.md — totehm.space

> L’état actuel (≤ 60 lignes). On y travaille à la demande de Wah. Les mesures de livraison vivent dans les commits.

Un pavillon de verre vit au sommet d’une Terre engloutie, sur une terrasse en calçada de Lisbonne, face à l’océan sous la Voie lactée.
La bouche originale, sa langue et son THP sculptés sont éclairés en façade. Dedans : comptoir pierre, pupitre noir, écran Lisbon et cheminée chaleureuse.
Le livre fermé ouvre Origins en pages tournantes ; Lisbon se joue dans l’écran. Les fichiers indépendants et toute la marketplace restent disponibles.

| fichier | rôle |
|---|---|
| `index.html` · `gallery-ui.mjs` · `gallery.css` | entrée, commandes des installations, panoramas, liste accessible et SSO existant |
| `gallery-spatial.mjs` · `gallery-modern-navigation.mjs` · `gallery-modern-layout.mjs` | caméra, parcours autour des meubles, collisions, saut et plafond/toit |
| `gallery-modern.mjs` · `gallery-white-stone.mjs` | structure vitrée, dalles alignées PBR, façade sculptée, comptoir pierre et pupitre |
| `gallery-lectern-book.mjs` · `gallery-play-installation.mjs` | volume noir fermé vers Origins ; couverture Lisbon et 22 panneaux jouables dans l’écran |
| `gallery-fireplace.mjs` · `gallery-fire-audio.mjs` | foyer panoramique, flammes volumiques, éclairage ambre, fumée extérieure et crépitement synthétisé |
| `gallery-3d.mjs` · `gallery-temple*.mjs` · `gallery-origins-book.mjs` | anciennes architectures et livre ouvert conservés ; paysage partagé |
| `gallery-lisbon-pavement.mjs` | calçada extérieure d’origine : vagues et caravelle ; pierre blanche uniquement dans le pavillon |
| `gallery-temple-landscape.mjs` | seul piton émergé, lune, pierre éclairée et environnement nocturne préfiltré |
| `gallery-drowned-ocean.mjs` | océan 3D à 360°, fronts irréguliers recourbés dans la surface, creux sombres, reflets lunaires et embruns |
| `gallery-ocean-foam.mjs` | mémoire d’écume GPU : naissance par compression, advection, drainage et dissipation |
| `gallery-ocean-spindrift.mjs` | volumes de brume arrachée aux crêtes, modelés par le vent et éclairés par la lune |
| `gallery-drowned-sky.mjs` | Voie lactée à filaments et poussières, étoiles fines et météore effilé ; champ proche pendant l’envol |
| `gallery-drowned-planet.mjs` | globe submergé, relief continental sous l’eau et fine atmosphère ; teinte partagée avec la mer |
| `gallery-temple-assets.mjs` · `assets/temple/` | 6 cartes de pierre PBR 1k chargées pour les arches et le socle ; sources CC0 dans LICENSE.txt |
| `gallery-audio.mjs` · `gallery-lisbon.mjs` | vent/mer stéréo synthétisés, grave des portes et souffle Web Audio ; aperçu des vrais panneaux |
| `get_higher.html` · `stoner.html` · `stoner_terms.html` | TotehmPaper et méthode Stoner, dans leurs propres fichiers et avec leurs droits serveur |
| `origins.html` · `origins-book.mjs` · `origins-book.css` | livre fermé/ouvert, 20 pages vidéo dans l’ordre, prix et acquisition serveur, un geste = une page |
| `play_lisbon_street.html` | Lisbon autonome et sa manette d’origine conservés |
| `market.html` | marketplace complète : achats primaires, revente, propriétaires, provenance et ma collection |
| `social.html` · `api/card.js` | lecteur ouvert par COM `/x/space` · aperçu `/s/:id` |
| `assets/ocean/` | deux cartes originales 1024² : normales Fourier et écume cellulaire, données linéaires avec mipmaps ; provenance dans LICENSE.txt |
| `vendor/` · `assets/` | Three.js/HLS, textures et vrais médias ; `assets/gallery/book-origins/` : 20 tirages originaux, sources dans LICENSE.txt |

- Nuit permanente : arche galactique relevée, filaments lumineux et poussières opaques ; 18 000 / 8 500 étoiles aux cœurs fins et halos discrets, quatre températures, lune à 34 cratères. PMREM issu du ciel local, sans panorama/HDR externe.
- Météore en ruban de 62 triangles : passage effilé de 1,15 s toutes les 47 s, sur la même horloge que le ciel ; aucun défilement autonome en mouvement réduit.
- Intérieur et comptoir : calcaire blanc antique PBR, dalles 2,75 × 1,55 m alignées. Extérieur : calçada d’origine, vagues et caravelle ; socle et rebords sombres. Jonction au seuil z=−2, même hauteur et sans superposition.
- Océan à −96 m, crêtes de la surface principale bornées sous −11,48 m, calme à 110 m du piton ; aucun autre sol émergé. Astres/eau/embruns et simulation d’écume figés en mouvement réduit.
- Eau détaillée sur 24 km de diamètre : 327 680 triangles ordinateur / 172 032 téléphone, 4 800 / 1 800 points d’embruns ; maillage rapproché régulier puis logarithmique, détails filtrés jusqu’à 1 800 m.
- Trois échelles de normales spectrales ; les faces retournées reflètent l’eau sombre sous l’horizon, l’écume ancienne devient humide et translucide. Gouttes entraînées dans le vent tangent au globe.
- Brume : 80 / 40 ellipsoïdes sur les crêtes, 160 / 80 triangles de support, cinq échantillons de densité par rayon ; éclairage lunaire et profondeur réelle du volume, opacité ≤ 0,13, sommet borné sous −3,72 m. Aucun fichier externe ni texture propre.
- Mer courbée sur le globe de rayon 6 500 m : le déplacement Gerstner recourbe les fronts du même maillage, avec leurs tangentes exactes, eau sombre et transmission fine. En hauteur, les continents restent sous une seule mer.
- Écume persistante sur deux cibles 256² / 128² à 30 / 20 Hz : densité RG16, âge et naissance ; dissipation de 7,8 s, dentelle fine et sillages entraînés par le vent. Sans cartes ou sans rendu GPU, secours local ; état du moteur restauré après chaque passe.
- Pavillon de 26 × 15 m, entrée de 4,8 m et toit entièrement vitré à 6,2 m ; ciel visible, fines nervures, aucune colonne ni végétation.
- Le comptoir pierre expose 6 feuilles de 48 THP de 2,2 cm et 5 papiers détachés ; dessin perforé original, aucun prix local. Langue et THP de façade en vrai volume éclairé.
- Volume noir fermé sur pupitre incliné à 18° : son ouverture mène à `/origins?open=1`. Origins conserve ses 20 vidéos, avec pages tournantes ; un geste de molette/inertie/swipe tourne une seule page, sans boucle.
- Lisbon : écran seul, couverture « Higher Lisbon Streets » et sous-titre demandé, Higher en SVG ; puis contrôleur à 22 panneaux dans l’écran. Aucun canapé, table basse ni manette physique.
- Écran CanvasTexture 3D à 15 Hz pendant la lecture ; aucun autoplay. Liste/masqué/blur/départ mettent en pause, sans reprise automatique.
- Cheminée panoramique noire, vrais éclairages ambre, flammes volumiques et fumée au-dessus du toit ; horloge du moteur, feu et fumée figés en mode réduit.
- Marche 2,6 m/s, guidage 1 450–4 200 ms autour des murs et meubles. Les trois boutons conduisent aux installations, sans changer de page.
- Espace ou Jump : envol extérieur de 18 000 m en 14 s simulées ; plafond, murs, mobilier et toit solides. Aucune relance en l’air.
- Guidage/réduction/cache arrière préservent altitude et vitesse ; une visite demandée en l’air attend le retour sur la terrasse avant d’entrer.
- Vent, mer et crépitement après un geste réel ; le feu augmente à proximité. Muet commun et préférence conservés ; liste/masqué/blur suspendent les sons. Au-delà de 3 000 m, onde méditative.
- Au sommet, cadrage doux du globe entier et 1 600 / 720 points stellaires proches ; glisser reprend la vue. Mouvement réduit : décor figé, guidage horizontal immédiat, saut intentionnel sans recadrage/FOV. Sans WebGL, liens HTML.
- Les expériences gardent leurs fichiers et clients SSO ; seuls les photos et clips publics sont montrés sur place. Collect mène au marché serveur existant.
- Le marché reste autonome, y compris après Stripe. Prix, stock et accès du serveur, propriété au webhook ; aucun changement SQL/Edge/tarif.
- Market, My collection, Collect et Full experience gardent leurs routes absolues existantes ; les anciens modules et pages sont conservés.

Tests : `tests/browser/gallery_glass_hearth.mjs` · `origins_book.mjs` · `tests/node/modern_navigation.mjs` · `origins_page_gestures.mjs`.
