# space/CLAUDE.md — totehm.space

> L’état actuel (≤ 60 lignes). On y travaille à la demande de Wah. Les mesures de livraison vivent dans les commits.

Le prolongement 3D du Totehm : papier original perforé, processeur navy sur noir et sept traits d’intention.
Une seule promenade relie les vingt Origins dans l’ordre, la vraie manette Lisbon et le TotehmPaper/Stoner.
Les œuvres se jouent sur leurs surfaces dans la scène ; leur offre s’ouvre sur place, sans page ou iframe séparée.

| fichier | rôle |
|---|---|
| `index.html` · `gallery-ui.mjs` · `gallery.css` | entrée, navigation, liste accessible, repli HTML et client SSO existant |
| `gallery-3d.mjs` · `gallery-spatial-path.mjs` | une caméra/scène, clavier, regard, sol, joystick et routes autour des sculptures |
| `gallery-spatial-world.mjs` | papier, processeur, circuits et pool de polaroids ; cinq images ordinateur, trois téléphone |
| `gallery-spatial-lisbon.mjs` · `gallery-spatial-data.mjs` | 22 panneaux aux coordonnées originales, clics alpha, écran partagé et phrases originales |
| `gallery-spatial-player.mjs` · `.css` | une vidéo HTML, textures actives, méthode autorisée et offre serveur ; aucune donnée privée dans les diagnostics |
| `gallery-artworks.mjs` · `gallery-audio.mjs` | vrais titres et images ; ambiance Web Audio après geste, suspendue pendant les œuvres |
| `get_higher.html` · `stoner.html` · `origins.html` · `play_lisbon_street.html` | pages historiques et liens existants, conservés |
| `market.html` | marché autonome ; un checkout spatial récent reprend la sélection sur `/?resume=1` |
| `social.html` · `api/card.js` | lecteur de spaces ouvert par COM `/x/space` · aperçu `/s/:id` |
| `vendor/` · `assets/` | Three.js/HLS et vrais médias ; les modules brutalistes/void restent historiques, non importés par l’accueil |

- Origins : centres `(±4.8,5.1,-34-n*32)`, arrêts `(0,1.65,-25-n*32)`, n=0…19. Une œuvre par arrêt ; transition douce entre elles.
- Guidage `clamp(distance*110,1450,4200)` ms et même interpolation ; marche 2,6 m/s. Fermer ne déplace pas la caméra.
- Lecture publique : `wah/1.mp4`…`20.mp4`, `play-signals/{id}.mp4`. Aucune vidéo chargée avant sélection.
- THP : onze séquences privées ; seul `stoner-gate` autorise les URL signées. Blob actif unique, signatures renouvelées ; Low/High garde `set_entry_mode`.
- Catalogue, slugs, prix, stock, propriétaires, droits : `market_view`. Consentement explicite ; `higher-checkout`, `artwork-checkout`, `market-checkout` existants.
- Aucun tarif, règle, migration ou règlement modifié. L’achat réel est déclenché seulement par le visiteur ; la propriété reste au webhook.
- Liste/onglet masqué suspendent la scène ; une œuvre de la liste utilise le lecteur HTML. Mouvement réduit fige l’ambiance et le guidage devient immédiat.
- Le retour Stripe garde ses URL serveur : un marqueur local récent reprend le parcours ; sans marqueur, aucun changement du marché.

Tests : `tests/browser/gallery_spatial.mjs`, `market.mjs`, `tests/node/gallery_spatial_path.mjs`.
