# space/CLAUDE.md — totehm.space

> L’état actuel (≤ 60 lignes). On y travaille à la demande de Wah. Les mesures de livraison vivent dans les commits.

Le dernier temple au sommet d’une Terre engloutie : océan à 360°, houles monumentales sous une nuit permanente.
La terrasse de pierre ne garde que huit colonnes libres et trois grandes portes ; aucun toit, fronton, arbre, fleur ou bac.
Les trois portes ouvrent leurs pages indépendantes : `/get_higher`, `/origins`, `/play_lisbon_street`.
La porte TotehmPaper montre de nombreux papiers originaux perforés suspendus ; celle de Lisbon ses panneaux flottants.

| fichier | rôle |
|---|---|
| `index.html` · `gallery-ui.mjs` · `gallery.css` | entrée, portes, panoramas, liste accessible et SSO existant |
| `gallery-3d.mjs` · `gallery-temple-navigation.mjs` | caméra, guidage, clavier/sol/joystick, passage vers les pages |
| `gallery-temple.mjs` | pierre PBR, 8 colonnes libres à 24 flûtes, trois portes plus hautes que les colonnes |
| `gallery-temple-layout.mjs` · `gallery-temple-physics.mjs` | dimensions partagées, saut balistique, collisions, réception et chute des colonnes |
| `gallery-temple-landscape.mjs` | seul piton émergé, lune, pierre éclairée et environnement nocturne préfiltré |
| `gallery-drowned-ocean.mjs` | océan radial 3D à 360°, trois houles asymétriques, reflets du ciel, écume filtrée et embruns |
| `gallery-drowned-sky.mjs` | ciel généré localement, Voie lactée/poussières, étoiles, lune et rare étoile filante |
| `gallery-temple-assets.mjs` · `assets/temple/` | 9 textures de pierre PBR 1k chargées ; sources CC0 dans LICENSE.txt |
| `gallery-audio.mjs` · `gallery-lisbon.mjs` | vent/mer stéréo synthétisés, grave des portes et souffle Web Audio ; aperçu des vrais panneaux |
| `get_higher.html` · `stoner.html` · `stoner_terms.html` | TotehmPaper et méthode Stoner, dans leurs propres fichiers et avec leurs droits serveur |
| `origins.html` · `play_lisbon_street.html` | Origins et Lisbon autonomes, leurs lecteurs/manette/médias originaux |
| `market.html` | marketplace complète : achats primaires, revente, propriétaires, provenance et ma collection |
| `social.html` · `api/card.js` | lecteur ouvert par COM `/x/space` · aperçu `/s/:id` |
| `vendor/` · `assets/` | Three.js/HLS, textures de pierre et vrais médias |

- Nuit permanente à toute heure. Environnement PMREM issu du vrai ciel procédural, sans téléchargement de panorama/HDR.
- Océan à −112 m, crêtes bornées sous −10,88 m, calme à 135 m du piton ; aucun autre sol émergé. Astres/eau/embruns figés en mouvement réduit.
- Eau détaillée sur 24 km de diamètre : 147 456 triangles ordinateur / 61 440 téléphone, 2 400 / 1 000 points d’embruns ; détails filtrés jusqu’à 900 m, ciel emprunté sans texture externe.
- Colonnes à 9,52 m ; arches à 12,024 m avec leurs biseaux, ouvertures de 4,5 × 10,725 m. Aucun entablement ni fronton.
- Terrasse libre hors des vraies pierres ; aucune collision des anciens bacs. Portes en x=−9/0/9, z=−12 ; limites de plateforme conservées.
- Espace ou bouton Jump : saut de 16 m/s, gravité 12 m/s², réception sur les huit chapiteaux ; pas de double saut ni vol.
- Le guidage depuis une colonne descend avec la gravité. Une porte ne se franchit qu’au sol ; les contrôles gardent leur activation clavier.
- Marche 2,6 m/s, guidage doux 1 450–4 200 ms. Choisir une porte approche ; entrer/franchir lance sa page après le souffle/FOV de 800 ms.
- Vent et mer audibles après un geste réel, vent renforcé en hauteur ; bouton muet et préférence conservée. Liste/onglet masqué/blur suspendent animation et son.
- Mouvement réduit fige le décor et rend le guidage immédiat ; passage sans étirement du FOV. Sans WebGL, liens HTML complets.
- Les expériences gardent leurs propres fichiers et clients SSO. Aucune vidéo privée ou lecteur de paiement intégré au temple.
- Le marché reste autonome, y compris après Stripe. Prix, stock et accès du serveur, propriété au webhook ; aucun changement SQL/Edge/tarif.
- Menu Market et My collection, offres de chaque porte et cartes des vingt Origins conservent leurs routes absolues existantes.

Tests : `tests/browser/gallery_temple_restored.mjs`, `gallery_audio.mjs`, `market.mjs`, `tests/node/temple_navigation.mjs`, `temple_physics.mjs`.
