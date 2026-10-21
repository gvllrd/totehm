# space/CLAUDE.md — totehm.space

> L'état ACTUEL (≤ 60 lignes). Hors du cœur produit : on n'y touche que sur demande de Wah.

La galerie d'art de Wah : ce qui a créé TOTEHM (branding, logo, slogan), les œuvres (TotehmPaper, Stoner, Origins),
Play the Lisbon Street, et le marché où elles s'achètent et se revendent.

| fichier | rôle |
|---|---|
| `index.html` · `gallery-ui.mjs` · `gallery.css` | l'entrée : la liste des œuvres, puis la visite 3D (`gallery-3d.mjs`, chargé à la demande) |
| `gallery-brutalist*.mjs` · `-atmosphere` · `-courtyards` · `-pavilions` · `-reflection` | quatre lieux de béton face à la mer, heure bleue fixe |
| `gallery-void.mjs` · `-artworks` · `-lisbon` · `-audio` | le couloir des 20 Origins · les œuvres · l'aperçu Lisbon · le son |
| `get_higher.html` · `stoner.html` · `stoner_terms.html` | le TotehmPaper (THP) et la méthode Stoner (`stoner-gate`, `higher-checkout`) |
| `play_lisbon_street.html` · `discover*.html` · `origins.html` | Play the Lisbon Street · Discover · Origins |
| `market.html` | le marché : achat, revente, collection (tout au serveur) |
| `social.html` · `api/card.js` | l'ancien lecteur de spaces (ouvert par COM `/x/space`) · l'aperçu `/s/:id` |
| `vendor/` · `assets/` | three.js et hls.js (servis aussi à COM) · les œuvres, les panneaux de Lisbonne |

- Le code nomme encore la scène `temple` et le retour `#return-dome` : des noms hérités, pas des scènes.
- Reflets sur UNE cible partagée (512 px / 8 Hz ordinateur, 256 px / 4 Hz téléphone) ; mouvement réduit = décor fixe.
- Propriété et accès au serveur : `stoner_access`, `art_editions`.

Tests : `tests/browser/gallery_*.mjs`, `market.mjs`, `space*.mjs` ; `tests/node/gallery_brutalist_path.mjs`, `space_card.mjs`.
