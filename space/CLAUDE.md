# space/CLAUDE.md — totehm.space

> L’état actuel (≤ 60 lignes). On y travaille à la demande de Wah. Les mesures de livraison vivent dans les commits.

Deux lieux partagent l’île, l’océan, la nuit étoilée et le grand feu de bois : Lisbon, pavillon de verre en vague sur calçada, et New York, immeuble de briques rouges à cinq niveaux, dernier étage en retrait, intérieur blanc et rampes de pierre.
Vercel dirige le Portugal vers `/lisbon-space`, les autres pays ou le pays inconnu vers `/new-york` ; pays issu de l’IP, sans GPS ni certitude physique. Les deux adresses restent directement visitables ; `/lisbon` reste l’œuvre Lisbon.
Space ouvre directement le monde, sans titre d’accueil ni commandes de panorama/saut/son. Livre Origins, écrans Lisbon et Same but opposite, cadre Stoner : chaque œuvre ouvre sa page indépendante ; marketplace conservée.

| fichier | rôle |
|---|---|
| `index.html` · `gallery-ui.mjs` · `gallery.css` | entrée directe, installations, liste accessible ; bouton TOTEHM → connexion COM ou retour chez soi |
| `vercel.json` · `api/location.js` | redirection géographique temporaire, priorité aux lecteurs sociaux, diagnostic pays sans cache ni coordonnées |
| `gallery-new-york*.mjs` · `gallery-facade.mjs` · `gallery-liberty.mjs` | briques et trottoir Manhattan, cinq niveaux reliés par rampes, sols et physique partagés ; façade originale commune, statue entière hors de l’eau |
| `gallery-spatial.mjs` · `gallery-modern-navigation.mjs` · `gallery-modern-layout.mjs` | caméra, parcours, saut ; collisions et appuis suivent le toit ondulé et son ouverture de fumée |
| `gallery-modern.mjs` · `gallery-glass-shell.mjs` · `gallery-white-stone.mjs` · `gallery-ancient-floor.mjs` | toiture en vague, oculus, collecteur de verre partagé avec physique/fumée ; pierre, comptoir et pupitre |
| `gallery-lectern-book.mjs` · `gallery-play-installation.mjs` · `gallery-opposite-installation.mjs` · `gallery-stoner-installation.mjs` | livre, deux écrans et cadre premium, liens vers leurs pages |
| `gallery-fireplace.mjs` · `gallery-fire-audio.mjs` | feu ouvert de 4,34 m, neuf bûches, lumière chaude, fumée vers le verre et véritable enregistrement de feu de bois |
| `gallery-3d.mjs` · `gallery-temple*.mjs` · `gallery-origins-book.mjs` | anciennes architectures et livre ouvert conservés ; paysage partagé |
| `gallery-lisbon-pavement.mjs` | calçada extérieure d’origine : vagues et caravelle ; pierre blanche uniquement dans le pavillon |
| `gallery-temple-landscape.mjs` | seul piton émergé, lune, pierre éclairée et environnement nocturne préfiltré |
| `gallery-drowned-ocean.mjs` | océan 3D à 360°, fronts irréguliers recourbés dans la surface, creux sombres, reflets lunaires et embruns |
| `gallery-ocean-foam.mjs` · `gallery-ocean-spindrift.mjs` | mémoire d’écume GPU et volumes de brume arrachée aux crêtes, modelés par le vent et la lune |
| `gallery-drowned-sky.mjs` | Voie lactée à filaments et poussières, étoiles fines et météore effilé ; champ proche pendant l’envol |
| `gallery-drowned-planet.mjs` | globe submergé, relief continental sous l’eau et fine atmosphère ; teinte partagée avec la mer |
| `gallery-temple-assets.mjs` · `assets/temple/` | 6 cartes de pierre PBR 1k chargées pour les arches et le socle ; sources CC0 dans LICENSE.txt |
| `gallery-audio.mjs` · `gallery-lisbon.mjs` | vent/mer stéréo synthétisés, grave des portes et souffle Web Audio ; aperçu des vrais panneaux |
| `get_higher.html` · `stoner.html` · `stoner_terms.html` | TotehmPaper et méthode Stoner, dans leurs propres fichiers et avec leurs droits serveur |
| `origins.html` · `origins-book.mjs` · `origins-book.css` | livre fermé/ouvert, 20 pages vidéo dans l’ordre, prix et acquisition serveur, un geste = une page |
| `play_lisbon_street.html` · `same_but_opposite.html` | Lisbon autonome et sa manette ; vidéo publique originale de Boutique, lecture au toucher |
| `market.html` | marketplace complète : achats primaires, revente, propriétaires, provenance et ma collection |
| `social.html` · `api/card.js` | lecteur ouvert par COM `/x/space` · aperçu `/s/:id` |
| `vendor/` · `assets/` | Three.js/HLS, vrais médias, vingt tirages Origins et cartes originales d’océan ; sources dans les LICENSE.txt |

- Nuit permanente : arche galactique relevée, filaments lumineux et poussières opaques ; 18 000 / 8 500 étoiles aux cœurs fins et halos discrets, quatre températures, lune à 34 cratères. PMREM issu du ciel local, sans panorama/HDR externe.
- Météore en ruban de 62 triangles : passage effilé de 1,15 s toutes les 47 s, sur la même horloge que le ciel ; aucun défilement autonome en mouvement réduit.
- Lisbon : 301 dalles anciennes fusionnées, opus romain, arêtes arrondies et scans photographiques couleur/normale/rugosité CC0, cartes 2k/1k dans `assets/stone/`, licence locale. Calçada d’origine, vagues et caravelle dehors ; socle sombre. New York : pierre blanche et rampes sur les mêmes niveaux physiques que le rendu.
- Océan à −96 m, crêtes de la surface principale bornées sous −11,48 m, calme à 110 m du piton ; aucun autre sol émergé. Astres/eau/embruns et simulation d’écume figés en mouvement réduit.
- New York : statue entière sur socle de pierre, pieds au-dessus de toute la mer locale, dans la zone calme existante. Dans Artworks, Liberty guide vers un palier vitré ; cadrage de tous les sommets de cuivre entre les commandes, vue vérifiée à travers murs, sols et rocher.
- Eau détaillée sur 24 km de diamètre : 327 680 triangles ordinateur / 172 032 téléphone, 4 800 / 1 800 points d’embruns ; maillage rapproché régulier puis logarithmique, détails filtrés jusqu’à 1 800 m.
- Trois échelles de normales spectrales ; les faces retournées reflètent l’eau sombre sous l’horizon, l’écume ancienne devient humide et translucide. Gouttes entraînées dans le vent tangent au globe.
- Brume : 80 / 40 ellipsoïdes sur les crêtes, 160 / 80 triangles de support, cinq échantillons de densité par rayon ; éclairage lunaire et profondeur réelle du volume, opacité ≤ 0,13, sommet borné sous −3,72 m. Aucun fichier externe ni texture propre.
- Mer courbée sur le globe de rayon 6 500 m : le déplacement Gerstner recourbe les fronts du même maillage, avec leurs tangentes exactes, eau sombre et transmission fine. En hauteur, les continents restent sous une seule mer.
- Écume persistante sur deux cibles 256² / 128² à 30 / 20 Hz : densité RG16, âge et naissance ; dissipation de 7,8 s, dentelle fine et sillages entraînés par le vent. Sans cartes ou sans rendu GPU, secours local ; état du moteur restauré après chaque passe.
- Lisbon : pavillon de 26 × 15 m, entrée de 4,8 m, coque vitrée ondulée entre 6 et 8,4 m, cinq nervures. New York : cinq niveaux espacés de 5,4 m, dernier en retrait, atrium et rampes continues de 2,1 m ; aucun escalier. Destinations d’étage dans Artworks.
- Le comptoir pierre expose 6 feuilles de 48 THP de 2,2 cm et 5 papiers détachés ; dessin perforé original, aucun prix local. Langue et THP de façade en vrai volume éclairé.
- Volume noir fermé sur pupitre incliné à 18° : son ouverture mène à `/origins?open=1`. Origins conserve ses 20 vidéos, avec pages tournantes et lecture uniquement au toucher (« Tap to play the artwork ») ; introduction de Wah sur les 22 œuvres, sans lecture automatique au changement de page.
- Lisbon : couverture et Higher en SVG → `/play_lisbon_street`. Same but opposite : écran sur le verre gauche → `/same_but_opposite`, source publique `higher_boutique/same_but_opposite.mp4`. Aucun décodeur vidéo dans l’accueil 3D.
- Stoner : vrai cadre premium noir profond, verre et THP original, proportions du premier `/get_higher`. Clic → cette page ; les droits et la méthode `/stoner` restent contrôlés par le serveur.
- Feu partagé : neuf bûches, flammes volumiques de 4,34 m, braises et étincelles. À Lisbon, le verre asymétrique rejoint son oculus vers 8,27 m ; à New York, une gaine transparente rejoint une ouverture à 27 m. Toucher le bois guide près du foyer ; gel visuel en mode réduit.
- Marche 2,6 m/s, guidage autour des meubles et par les rampes physiques à New York ; toucher les sols permet de marcher. Les œuvres conservent leurs positions au rez-de-chaussée et ouvrent leurs pages indépendantes.
- Touche Espace : envol extérieur de 18 000 m en 14 s simulées ; plafond, murs, mobilier et toit solides. Aucune relance en l’air.
- Guidage/réduction/cache arrière préservent altitude et vitesse ; une visite demandée en l’air attend le retour sur la terrasse avant d’entrer.
- Vent/mer dehors, atténués sous le toit réel ; au foyer, enregistrement stéréo de 25,54 s (ezwa, domaine public, Blanket/SoundBible), MP3 local 345 Ko, boucle fondue. Proximité et direction stéréo suivent la vue ; geste initial, muet et suspension liste/masqué/blur conservés. Source et crédit : `assets/fire/LICENSE.txt`, lien dans Artworks.
- Au sommet, cadrage doux du globe entier et 1 600 / 720 points stellaires proches ; glisser reprend la vue. Mouvement réduit : décor figé, guidage horizontal immédiat, saut intentionnel sans recadrage/FOV. Sans WebGL, liens HTML.
- Règle : Space présente les expériences, chaque HTML possède son lecteur plein écran. Le départ suspend la 3D et les sons ; retour navigateur rétablit le monde et la préférence audio.
- Le marché reste autonome, y compris après Stripe. Prix, stock et accès du serveur, propriété au webhook ; aucun changement SQL/Edge/tarif.
- Téléphone : DPR initial min(natif, 2), plancher min(natif, 1,5), grâce au démarrage et adaptation graduelle réversible ; `gallery-render-quality.mjs`. Aucun effondrement permanent à 0,65.
- Connexion unique : `totehm.com/auth` en PKCE ; connecté, pseudo du profil et clic → COM `/totehm` par `sso-mint`, sans menu membre local. Market, My collection, Collect et Full experience restent accessibles.

Tests : navigateur `gallery_new_york.mjs`, `gallery_direct.mjs`, `gallery_campfire.mjs`, `gallery_glass_hearth.mjs`, `fire_recording.mjs`, `gallery_auth.mjs`, `origins_book.mjs` ; Node `location_routing.mjs`, `new_york_navigation.mjs`, `liberty.mjs`, `glass_shell.mjs`, `modern_navigation.mjs`.
