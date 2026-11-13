# space/CLAUDE.md — totehm.space

> L’état actuel (≤ 60 lignes). Les mesures de livraison vivent dans les commits. **Règle n° 1 : les boxes sont le branding essentiel ; conserver partout leur rendu natif intégral, sans réinterprétation locale (voir `BRAND.md`, règle n° 1).**

Lisbon est un dôme monolithique noir brut sur l’île, au-dessus de l’océan et sous le ciel étoilé. La langue originale surmonte « MAKE LISBON STREETS [Higher] ». Sept traits aux couleurs exactes des intentions délimitent le sol et la voûte. Les 22 signes conservent leur forme et leur petit sticker ; leurs animations originales apparaissent dans le monde. Dedans : laboratoire noir minimal, six petits coffrets THP, TOTEHM natif et Higher en volume. New York conserve son château, ses six œuvres Think same but opposite et sa statue submergée.
Vercel dirige le Portugal vers `/lisbon-space`, les autres pays ou le pays inconnu vers `/new-york` ; ces deux entrées réécrivent vers `/`. Pays issu de l’IP, sans GPS ni certitude physique ; `/lisbon` reste l’œuvre Lisbon.
Space ouvre directement le monde, sans titre d’accueil ni commandes de panorama/saut/son. La navigation Artworks présente les expériences, sans destinations d’étage.

| fichier | rôle |
|---|---|
| `index.html` · `gallery-ui.mjs` · `gallery.css` | entrée immersive, liste accessible et connexion COM |
| `gallery-lisbon-dome.mjs` · `gallery-lisbon-dome-shell.mjs` | dôme noir, véritable porte et oculus, paillasse, instruments, sept traits et sculptures natives |
| `gallery-castle-plan.mjs` · `gallery-castle-fabric.mjs` | château de New York : murs épais, donjon, arches réellement ouvertes et collisions correspondantes |
| `gallery-modern.mjs` · `gallery-new-york.mjs` · `gallery-castle-space.mjs` | Lisbon au dôme noir ; New York au château, mobilier ancien et six œuvres `gallery-opposites.mjs` |
| `gallery-lisbon-dome-layout.mjs` · `gallery-modern-navigation.mjs` | plan, intentions, vrais supports des signes et collisions du dôme ; marche et saut avec le profil du lieu |
| `gallery-new-york-layout.mjs` · `gallery-new-york-navigation.mjs` | espace de plain-pied, parcours et physique du château de New York |
| `gallery-lisbon-azulejo-*.mjs` · `gallery-lisbon-shell.mjs` · `gallery-lisbon-exhibition-stone.mjs` | ancienne enveloppe conservée pour les tests de composants, hors de la visite actuelle |
| `gallery-glass-shell.mjs` · `gallery-modern-layout.mjs` | profil et mobilier du château de New York ; oculus et physique du verre |
| `gallery-lisbon-street-performance.mjs` · `gallery-higher-piece.mjs` | un lecteur original en espace 3D sans fond noir ; Higher natif extrudé, ratio 3 et 18 perforations |
| `gallery-lisbon-pavement.mjs` | calçada originale découpée autour du dôme ; caravelle visible sur le parvis gauche, sans recouvrement du sol intérieur |
| `gallery-ancient-floor.mjs` · `gallery-white-stone.mjs` | dalles physiques à arêtes usées, cartes photographiques CC0 locales, table et pierre du foyer |
| `gallery-heritage-masonry.mjs` | matériaux photographiques des maçonneries conservées |
| `gallery-lectern-book.mjs` · `gallery-play-installation.mjs` · `gallery-opposite-installation.mjs` · `gallery-paper-packaging.mjs` | œuvres indépendantes et coffrets natifs ; ancrages propres à chaque lieu |
| `gallery-lisbon-street-signs.mjs` | 22 signes de Lisbon : marquages au sol, signalisation routière, plaques, feux piétons, croix de pharmacie et emblème en relief |
| `gallery-fireplace.mjs` · `gallery-fire-audio.mjs` | grand feu ouvert et véritable enregistrement de feu de bois |
| `gallery-temple-landscape.mjs` | seul piton émergé, lumière lunaire et environnement nocturne préfiltré |
| `gallery-liberty.mjs` | scan 3D photogrammétrique de la statue de la Liberté submergée dans la mer de New York : cuivre et torche dorée |
| `gallery-drowned-ocean.mjs` · `gallery-ocean-foam.mjs` · `gallery-ocean-spindrift.mjs` | océan 3D à 360°, crêtes, écume persistante et embruns volumétriques |
| `gallery-drowned-sky.mjs` · `gallery-drowned-planet.mjs` | Voie lactée, étoiles, météore, lune et globe submergé |
| `gallery-spatial.mjs` · `gallery-render-quality.mjs` | caméra, visite, suspendre/reprendre, adaptation graduelle du DPR |
| `vercel.json` · `api/location.js` · `api/card.js` | géographie, diagnostic sans cache et lecteurs sociaux |
| `origins.html` · `origins-book.mjs` · `origins-book.css` | vingt vidéos originales, pages tournantes et lecture au toucher |
| `get_higher.html` · `stoner.html` · `play_lisbon_street.html` · `same_but_opposite.html` · `think_same_but_opposite.html` | œuvres indépendantes et parcours Discover anglais, lecteurs et droits propres |
| `market.html` · `social.html` | marché, collection personnelle et lecteur ouvert par COM `/x/space` |
| `vendor/` · `assets/` | Three.js/HLS et véritables médias locaux ; licences dans les LICENSE.txt |

- Nuit permanente : 18 000 / 8 500 étoiles, Voie lactée et lune à 34 cratères. Lisbon : ciel étoilé sublimé à 7 classes spectrales O-M, nébuleuses ionisées et Pléiades maritimes. New York : scan 3D photogrammétrique de la statue de la Liberté submergée dans la houle. PMREM issu du ciel local. Météore effilé de 1,15 s toutes les 47 s ; mouvements figés en mode réduit.
- Mer à −96 m, crêtes bornées sous −11,48 m, calme à 110 m du piton. Eau détaillée sur 24 km de diamètre : 327 680 triangles ordinateur / 172 032 téléphone. Trois échelles de normales spectrales et courbure sur le globe de rayon 6 500 m.
- Écume persistante GPU sur deux cibles 256² / 128² à 30 / 20 Hz, dissipation de 7,8 s. Brume : 80 / 40 volumes, cinq échantillons par rayon, opacité ≤ 0,13 ; aucun autre sol émergé.
- Plain-pied à −0,09 m. Lisbon : dôme elliptique 25,3 × 21,4 m, sommet 10,25 m, entrée réellement évidée de 5,1 × 5 m. Même profil pour le rendu, les contacts du corps et la fumée. New York conserve son toit vitré incliné et ses baies.
- Lisbon conserve sa calçada extérieure à vagues et caravelle, autour du sol intérieur noir. Aucun sol superposé. New York conserve ses dalles anciennes et sa terrasse. Océan, île, lune, étoiles et saut spatial sont conservés.
- Lisbon : 22 signes, 15 dehors et 7 dedans ; panneaux fixés à la coque, vrais marquages au sol, Hotel/AED/sortie sur plaques, emblème en relief, pharmacie lumineuse projetée vers l’arrivée, feux piétons jumelés. Trois supports au sol : deux pour le grand panneau autoroutier, un pour les feux. Stickers Higher petits, ratio 3:1.
- New York seulement : six PNG originaux alignés en cadres noirs sur un mur noir de 14,8 m, face à l'entrée. Le clic sur l'image ou le cadre ouvre `/think_same_but_opposite?work=…` : chaque opposition déroule son récit anglais en cinq étapes, puis un lien vers l'offre TOTEHM, HIGHER, GET HIGHER ou FIGHER concernée. Le mot TOTEHM y prend sa pièce de marque native. Liste HTML accessible en complément. Le mur est solide, les parcours contournent les deux extrémités et conservent l'accès aux autres œuvres.
- Table noire de 3,6 m, six THP dans leurs coffrets premium natifs de 12 cm. L’inspection rapproche le même coffret sans le grossir, puis le repose. Verrerie, tubes et balance sur paillasse secondaire. TOTEHM aux 12 perforations et Higher aux 18 perforations, sans déformation.
- Un clic « Make it useful » joue le clip original respectif dans le monde, son fond noir transparent, sans cadre ni changement de page. Un seul décodeur chargé sur geste ; Replay, son et erreurs récupérables, CTA « Get Higher to get it » et expérience indépendante. Liste accessible pour les 22 œuvres. Origins et Same but opposite restent accessibles sur leurs supports noirs.
- Feu à droite de 4,34 m, foyer noir à Lisbon, neuf bûches détaillées, cendres, braises, étincelles et flammes volumétriques. Fumée alignée au véritable oculus du dôme. Son stéréo local bouclé ; source et crédit `assets/fire/LICENSE.txt`.
- Marche à 2,6 m/s et guidage autour des vrais obstacles. Touche Espace : envol extérieur de 18 000 m en 14 s simulées ; murs, toit et mobilier solides. Aucune relance en l’air. Une visite demandée en vol attend le retour sur la terrasse.
- Vent/mer atténués sous la toiture réelle ; geste initial et préférence muet conservés. Liste, onglet masqué ou perte de focus suspendent la scène et le son. Retour navigateur restaure le monde.
- Téléphone : DPR initial min(natif, 2), plancher min(natif, 1,5), adaptation graduelle réversible. Sans WebGL, les liens HTML donnent accès aux œuvres.
- Connexion unique : `totehm.com/auth` en PKCE ; connecté, pseudo du profil et clic vers COM `/totehm` par `sso-mint`. Aucun menu membre local. Market, My collection, Collect et Full experience restent accessibles.
- Propriété et argent au webhook ; prix, stock et accès du serveur. Aucun changement SQL, Edge Function ou tarif dans la galerie. Les clips Lisbon restent le teasing public ; la possession du THP et l’accès Stoner restent vérifiés par le serveur.

Tests de restauration : `node tests/node/lisbon_azulejo_restoration.mjs` et `tests/browser/gallery_lisbon_azulejo_restoration.mjs`, avec conservation du château New York. `tests/browser/new_york_opposites.mjs` vérifie les six images, leur mur, le clic physique et les six Discover sur ordinateur et téléphone. Les tests des 22 signes contrôlent leurs objets, leurs parcours et le clic direct vers les animations. Les tests indépendants des lecteurs, du marché, de la connexion et des gestes Origins restent propres à leurs composants.
