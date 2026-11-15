# space/CLAUDE.md — totehm.space

> L’état actuel (≤ 60 lignes). Les mesures de livraison vivent dans les commits. **Règle n° 1 : les boxes sont le branding essentiel ; conserver partout leur rendu natif intégral, sans réinterprétation locale (voir `BRAND.md`, règle n° 1).**

Lisbon : bâtiment lisboète aux azulejos en ruine, relié par le verre moderne, intérieur en pierre ; une table noire unique réunit THP et laboratoire. Hologramme intérieur vers le Discover lisible et la manette réservée THP ; collaboration 3D dedans. Soucoupe et tunnel vers Origins, île et océan conservés ; New York garde son château et ses six œuvres.
Vercel dirige le Portugal vers `/lisbon-space`, les autres pays ou le pays inconnu vers `/new-york` ; ces deux entrées réécrivent vers `/`. Pays issu de l’IP, sans GPS ni certitude physique ; `/lisbon` reste l’œuvre Lisbon.
Space ouvre directement le monde, sans titre d’accueil ni commandes de panorama/saut/son. La navigation Artworks présente les expériences, sans destinations d’étage.

| fichier | rôle |
|---|---|
| `index.html` · `gallery-ui.mjs` · `gallery.css` | entrée immersive, liste accessible et connexion COM |
| `gallery-lisbon-urbex.mjs` · `gallery-lisbon-urbex-layout.mjs` | galerie lisboète aux azulejos en ruine, pierre, verre et table noire unique ; positions et collisions actuelles |
| `gallery-castle-plan.mjs` · `gallery-castle-fabric.mjs` | château de New York : murs épais, donjon, arches réellement ouvertes et collisions correspondantes |
| `gallery-modern.mjs` · `gallery-new-york.mjs` · `gallery-castle-space.mjs` | Lisbon aux azulejos en ruine ; New York au château et six œuvres `gallery-opposites.mjs` |
| `gallery-modern-navigation.mjs` | marche, saut et parcours suivant les obstacles et la toiture du lieu |
| `gallery-new-york-layout.mjs` · `gallery-new-york-navigation.mjs` | espace de plain-pied, parcours et physique du château de New York |
| `gallery-lisbon-azulejo-*.mjs` · `gallery-lisbon-shell.mjs` · `gallery-heritage-masonry.mjs` | façade historique restaurée de c8ddaf0, pertes de carreaux et corniche, raccord en verre et pierre physique |
| `gallery-glass-shell.mjs` · `gallery-modern-layout.mjs` | profil et mobilier du château de New York ; oculus et physique du verre |
| `gallery-lisbon-hologram.mjs` · `gallery-laboratory-props.mjs` · `gallery-origins-vessel.mjs` | hologramme intérieur des 22 signes, ailes de laboratoire et destination Origins |
| `gallery-lisbon-pavement.mjs` | calçada originale autour du bâtiment ; caravelle au centre du parvis, sans recouvrement du sol intérieur |
| `gallery-ancient-floor.mjs` · `gallery-white-stone.mjs` | dalles physiques à arêtes usées, cartes photographiques CC0 locales, table et pierre du foyer |
| `gallery-heritage-masonry.mjs` | matériaux photographiques des maçonneries conservées |
| `gallery-lectern-book.mjs` · `gallery-play-installation.mjs` · `gallery-opposite-installation.mjs` · `gallery-paper-packaging.mjs` | modules natifs du livre, des œuvres et des coffrets ; aucun Opposite à Lisbon |
| `gallery-lisbon-street-signs.mjs` · `gallery-lisbon-dome*.mjs` · `gallery-curved-lisbon-installation.mjs` | anciens supports et dôme conservés hors de la visite active |
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
- Lisbon : façade historique 26 m, entrée réellement ouverte de 4,8 × 3,1 m, azulejos ébréchés et corniche interrompue. Verre en vague, transparence sur les ruines et intérieur entièrement en pierre. Soucoupe à 20 m et salle Origins conservées ; départ depuis l’intérieur par un parcours libre avant l’envol.
- Calçada originale à vagues ; caravelle au centre [0,4], sans passage piéton ni héliport. Aucun signe, abri ni sculpture de marque sur la façade ou le parvis ; collaboration en relief et pièces natives à l’intérieur.
- Les 22 PNG d’origine flottent en profondeur dans un champ holographique transparent de 13,2 × 5,15 m devant la pierre, avec projecteur noir et faisceaux discrets. Aucun film dans le monde. Le clic physique ouvre `/play_lisbon_street?discover=1` ; la manette originale reste protégée.
- New York seulement : six PNG originaux alignés en cadres noirs sur un mur noir de 14,8 m, face à l'entrée. Le clic sur l'image ou le cadre ouvre `/think_same_but_opposite?work=…` : scène noire plein écran, sans image répétée, avec cinq étapes de texte anglais centré qui se succèdent au scroll, au geste ou au clavier comme Play the Street ; les liens vers l'offre et l'œuvre suivante apparaissent à la fin. Le mot TOTEHM y prend sa pièce de marque native. Liste HTML accessible en complément. Le mur est solide, les parcours contournent les deux extrémités et conservent l'accès aux autres œuvres.
- Une seule table noire de 6,8 × 1,4 m dedans : six coffrets THP natifs de 12 cm au centre, verrerie et instruments de laboratoire aux deux extrémités. L’inspection rapproche le même coffret sans l’agrandir ; vues adaptées au téléphone. Le Discover original compte neuf textes, en plein écran noir avec grandes polices, progression, clavier, scroll et toucher.
- Accès décidé par `stoner-gate` (grant THP/Stoner serveur). `lisbon-street-media` authentifie et signe un seul des 22 films ; bucket `play-signals` privé et ancienne policy publique retirée. Discover reste public, manette et films fermés aux invités, sans THP et sur erreur. Aucun prix, droit ou paiement écrit par le client.
- Feu à droite [8,0,−15,99], foyer noir, neuf bûches détaillées, cendres, braises, étincelles et flammes volumétriques. Fumée alignée à l’oculus réel du verre en vague. Son stéréo local bouclé ; source et crédit `assets/fire/LICENSE.txt`.
- Marche à 2,6 m/s sur l’île et dans le bâtiment ; les parcours contournent la seule table et les murs. Espace conserve le saut spatial. Origins suit un trajet dédié ; livre et vingt œuvres restent ouvrables dans leurs lecteurs indépendants.
- Vent/mer atténués sous la toiture réelle ; geste initial et préférence muet conservés. Liste, onglet masqué ou perte de focus suspendent la scène et le son. Retour navigateur restaure le monde.
- Téléphone : DPR initial min(natif, 2), plancher min(natif, 1,5), adaptation graduelle réversible. Sans WebGL, les liens HTML donnent accès aux œuvres.
- Connexion unique : `totehm.com/auth` en PKCE ; connecté, pseudo du profil et clic vers COM `/totehm` par `sso-mint`. Aucun menu membre local. Market, My collection, Collect et Full experience restent accessibles.
- Propriété et argent au webhook ; prix, stock et accès du serveur. Les PNG flottants et le Discover sont le teasing public ; les films restent privés, servis par URL signée après vérification THP/Stoner. Aucun tarif ni droit d’achat modifié.

Tests actuels : `tests/node/lisbon_urbex_hologram.mjs`, `tests/node/lisbon_street_portal.mjs`, `tests/browser/gallery_lisbon_urbex.mjs`, `tests/browser/gallery_lisbon_street_portal.mjs` et `tests/fn/lisbon-street-media.mjs` vérifient ruines, verrerie, table unique, hologramme physique, parcours, Discover et droits. `tests/node/castle_rebuild.mjs` et `tests/node/new_york_navigation.mjs` conservent New York. Les tests indépendants des lecteurs, du marché, de la connexion et des gestes Origins restent propres à leurs composants.
