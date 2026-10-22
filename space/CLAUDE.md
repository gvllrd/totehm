# space/CLAUDE.md — totehm.space

> L’état actuel (≤ 60 lignes). On y travaille à la demande de Wah. Les mesures de livraison vivent dans les commits.

Un temple antique au sommet du monde : mer à gauche, montagnes à droite, mer de nuages, colonnades et oliviers.
Les trois portes ouvrent leurs pages indépendantes : `/get_higher`, `/origins`, `/play_lisbon_street`.
La porte TotehmPaper montre de nombreux papiers originaux perforés suspendus ; celle de Lisbon ses panneaux flottants.

| fichier | rôle |
|---|---|
| `index.html` · `gallery-ui.mjs` · `gallery.css` | entrée, portes, panoramas, liste accessible et SSO existant |
| `gallery-3d.mjs` · `gallery-temple-navigation.mjs` | caméra, guidage et collisions, clavier/sol/joystick, passage vers les pages |
| `gallery-temple.mjs` | pierre PBR, 8 colonnes à 24 flûtes, arches, oliviers, feuilles découpées et couvertures des portes |
| `gallery-temple-landscape.mjs` | terrains rocheux, mer, nuages, ciels photographiques et éclairage HDR/préfiltrage |
| `gallery-temple-assets.mjs` · `assets/temple/` | 9 textures PBR 1k, 2 panoramas 2k et un environnement HDR 1k ; sources CC0 dans LICENSE.txt |
| `gallery-audio.mjs` · `gallery-lisbon.mjs` | grave progressif près des portes et souffle Web Audio ; aperçu des vrais panneaux |
| `get_higher.html` · `stoner.html` · `stoner_terms.html` | TotehmPaper et méthode Stoner, dans leurs propres fichiers et avec leurs droits serveur |
| `origins.html` · `play_lisbon_street.html` | Origins et Lisbon autonomes, leurs lecteurs/manette/médias originaux |
| `market.html` | marketplace complète : achats primaires, revente, propriétaires, provenance et ma collection |
| `social.html` · `api/card.js` | lecteur ouvert par COM `/x/space` · aperçu `/s/:id` |
| `vendor/` · `assets/` | Three.js/HDRLoader/HLS et vrais médias |

- Jour de 06:00 à 20:00 selon l’heure locale du navigateur ; nuit étoilée sinon. Tout le décor reste dans le même monde.
- Routes autour de six plantations de rayon 2,7 m ; les portes sont en x=−9/0/9, z=−12. Aucun pas hors de la plateforme.
- Marche 2,6 m/s, guidage doux 1 450–4 200 ms. Choisir une porte approche ; entrer/franchir lance sa page après le souffle/FOV de 800 ms.
- Audio seulement après un geste réel, bouton muet, préférence conservée. Liste/onglet masqué suspendent animation et son.
- Mouvement réduit fige le décor et rend le guidage immédiat ; passage sans étirement du FOV. Sans WebGL, liens HTML complets.
- Les expériences gardent leurs propres fichiers et clients SSO. Aucune vidéo privée ou lecteur de paiement intégré au temple.
- Le marché reste autonome, y compris après Stripe. Prix, stock et accès du serveur, propriété au webhook ; aucun changement SQL/Edge/tarif.
- Menu Market et My collection, offres de chaque porte et cartes des vingt Origins conservent leurs routes absolues existantes.

Tests : `tests/browser/gallery_temple_restored.mjs`, `market.mjs`, `tests/node/temple_navigation.mjs`.
