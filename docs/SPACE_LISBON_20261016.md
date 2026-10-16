# Lisbon dans la galerie — 16 octobre 2026

Publié : `a64e59a252e96e39b607ca23f54fc991b30d9985`, build galerie `2026-10-16-space-lisbon-play`,
expérience `2026-10-16-lisbon-space`. SPACE `dpl_D6ebbq6mATvZA8chDR4YsBumQqRs` READY ; quatre projets et
huit alias de production vérifiés. Les 23 contrôles HTTPS réels correspondent aux sources du dépôt et aux MIME
attendus. Les six anciennes adresses Lisbon www/apex arrivent sur le même parcours en conservant la query.
Les deux pages COM servent exactement le travail de Claude `67941b5`.
Preuves : `/tmp/totehm-production/lisbon-ready.json` et `lisbon-live.json`.

La page `/play_lisbon_street` contient le récit et la transformation des 22 panneaux en manette. PLAY est la
seule action de la station 03, désormais « Neuro Street Art Digital ». Les anciens chemins `/discover_lisbon`,
`/discover_lisbon.html` et `/lisbon` redirigent temporairement vers ce parcours unique ; la page ancienne reste
archivée dans le dépôt et les ponts SSO existants continuent sur l'origine SPACE.

`gallery-lisbon.mjs` dessine les images originales des 22 panneaux autour de « Higher the Lisbon Streets ».
Le slogan provient exactement de `assets/gallery/higher.svg`. Le canvas ne contient ni récit ni bouton. Il est
partagé entre le mur WebGL et la carte HTML ; cette dernière conserve également une présentation sans JavaScript.
Le rendu change à 12 images/s au maximum, en mouvement lent, et se fige avec le mouvement réduit. Le mur cesse
d'animer hors champ ; la carte HTML anime uniquement lorsqu'elle est visible dans la liste. En liste, le WebGL
et le ciel sont suspendus ; masquer l'onglet arrête le canvas.

Dans l'expérience, le CTA devient « MAKE THEM USEFUL FOR YOUR BRAIN », en Space Mono et capitales. Les phrases
« An artistic and cognitive performance tool conceived through neurology. », « They turn into active cognitive
stimuli. » et « You operate from a Higher perspective. » restent dans le récit en Space Mono neutre, sans flou
ni Quantico Coral. Tous les Higher visibles, y compris dans les textes et les boutons dynamiques, utilisent
le vrai SVG slogan. Les titres et phrases provenant du catalogue sont insérés comme texte, avec substitution
du seul mot Higher par ce SVG.

La manette conserve ses 22 panneaux, leurs coordonnées, les vidéos et les phrases d'origine. La fermeture et
Échap reviennent au récit dans cette page ; quitter le récit revient à `/#lisbon`. Le mouvement réduit évite
le déplacement animé vers la manette et fige les panneaux. Masquer une vidéo la met en pause ; elle ne reprend
que si elle jouait avant le masquage et que la même œuvre est toujours ouverte.

Propriété, authentification, prix, acquisition sur le marché et paiement sont inchangés. Les tests de migration
conservent une comparaison intégrale pour les autres expériences, et vérifient pour Lisbon les sources des
images, le slogan, la géométrie de la manette, les médias et les sections d'accès/paiement inchangées.

| Vérification locale | Résultat |
| --- | --- |
| `tests/browser/gallery_lisbon.mjs` | 65 réussites, 1440/390 px : pixels de l'aperçu animés, pauses, titres et CTA, manette, vidéos, propriété, authentification, acquisition simulée et vente épuisée |
| `tests/browser/gallery_immersive.mjs` | 34 réussites : visite 3D, stations, déplacement au clic, clavier, joystick tactile, vidéo et repli sans WebGL |
| `tests/browser/gallery_initial_list.mjs` | 10 réussites : ouvrir Artworks pendant le téléchargement du moteur conserve une seule animation HTML, sans rendu 3D derrière la liste |
| `tests/browser/art_migration.mjs` | 14 comparaisons téléphone/ordinateur : autres expériences identiques ; sources de manette, SVG, vidéo et authentification Lisbon conservées |
| `tests/node/art_migration.mjs` | 84 invariants : assets, géométrie, médias, accès, prix et ponts d'origine, anciennes entrées réunies |

Preuves et captures : `/tmp/totehm-production/lisbon-20261016/`, `lisbon-immersive-20261016/` et
`lisbon-initial-list-20261016/`. Les services, médias et achats sont interceptés localement ; aucun compte,
commande ou paiement de production créé. Les tests WebGL sont locaux ; la publication se mesure séparément
par l'état Vercel, ses alias et les fichiers servis en HTTPS avec vérification TLS.

Retour arrière : rétablir les fichiers de ce lot à leur version `4fc1be6`. Aucun SQL, fonction Edge ou secret
n'est modifié ; les redirections Lisbon sont temporaires.
