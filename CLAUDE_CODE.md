# CLAUDE_CODE.md — la tâche de Claude Code (terminal de Wah)

> Depuis le 30/09/2026, la session cloud de Claude fait tout ce qui passe par
> Internet (code, base, fonctions, fusion, Vercel, Stripe). Claude Code ne
> reçoit ici que ce qui exige la machine de Wah : **la VM Oracle, docker
> compose, caddy, n8n, le master**. Une commande simple par ligne. Aucun
> secret dans ce fichier.

## Tâche en cours — 02/10/2026 · n8n ne tourne plus (priorité)

Mesuré par la session cloud (MCP n8n, exécution 72 du workflow F) :
`⚙️ CONFIG` lève `process is not defined` — le task runner de n8n n'expose
plus `process`. Les six workflows TOTEHM A→F lisent leurs clés ainsi (lu dans
B et F) : aucun vêtement ne se synchronise depuis Printful
(`totehm_cloth_support` = 0 ligne), aucune œuvre ne serait générée.

1. Dans chaque nœud `⚙️ CONFIG` (A, B, C, D, E, F) : `process.env.X` → `$env.X`
2. `docker compose` de n8n : `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, puis redémarrer n8n
3. API Printful (`GET /webhooks`) : l'URL doit être `https://n8n.higher.boutique/webhook/b7dc2823-a10d-4985-bae9-faae52ee0c49/printful-product`, types `product_synced`, `product_updated`, `product_deleted`
4. Rejouer F pour chaque produit du store Printful (`GET /store/products`) : POST sur cette URL avec `{"type":"product_updated","data":{"sync_product":{"id":<id>}}}`
5. Attendu : une ligne par produit dans `totehm_cloth_support`, `active=false`, `price=0`, `max_pieces=0`. Le prix et le stock = un « oui » de Wah (prix live), posés ensuite par la session cloud.
6. Rapport : une ligne par étape, la valeur mesurée (nombre de lignes, ids).

## Tâche précédente — 01/10/2026 · le ménage en base (une approbation)

La session cloud ne peut pas faire approuver un `drop`. Toi, si.

1. `git pull` dans `~/totehm`
2. MCP Supabase `apply_migration`, nom `20261001_b_menage`, contenu = `backend/supabase/migrations/20261001_b_menage.sql` (approuve)
3. MCP Supabase `execute_sql` avec le contenu de `tests/sql/spots_selftest.sql`
4. Attendu : une erreur « SELFTEST (rolled back): … | FAIL={} » (c'est le succès : tout est annulé)
5. Rapport : une ligne par étape, la valeur mesurée.

## À reporter dans `~/totehm/TOTEHM_MASTER.md` §0 (à ta prochaine intervention)

Ajoute, telle quelle, l'entrée **0.21 — 01/10/2026 · Pour soi, ou pour soi et les autres** :

> COM et SPACE sont gratuits pour soi. SPACE = DO WITH ME : un seul Spot,
> une Habit + une vidéo de 33 s filmée maintenant + une durée, PRIVATE ou
> SHARED (SILENT/SOCIAL, LOCATION ON/OFF), I AM HERE → I WAS THERE (déduit
> de l'heure). Plus de futur, capacité, candidature, sélection, accès par
> Spot, Short-Live, %. Cinq vues : recherche d'Habit · fil vidéo · radar des
> points autorisés · liste · caméra ; sept filtres (LOVE par défaut).
> Totehm : PRIVATE ou VISIBLE TO MY SUBSCRIBERS. Abonnement créateur ANNUEL,
> prix du créateur, 80/20, sans passeport FIGHER ; il ouvre le Totehm
> partagé et le point exact des Spots SHARED·ON. Console sur totehm.com.
> TotehmBot / Higher Self = offre séparée 7 €/mois (lot dédié). Space Mono et
> Quantico seulement, aucun fond blanc, tuile navy = nom du Totehm,
> conditions en dernier dans le menu membre. Migration
> `20261001_un_spot_deux_reglages.sql`.

### Correction 0.22 — même jour, demande PLUS RÉCENTE de Wah

> Le futur revient dans SPACE. TOP = Spot futur détaillé dans sa Habit Box ;
> RIGHT = liste des Spots-Habits futurs uniquement ; CENTER = radar +
> sélection d'une Habit Box (aucune recherche libre) + intention ; BOTTOM =
> vidéo immédiate, joystick REC/STOP. Restaurer et conserver TOUS les gestes,
> le joystick COM coloré et les panneaux desktop avec radar réduit.
> `I WILL BE HERE` → `I AM HERE` → `I WAS THERE`, mêmes droits privés /
> abonnés que ci-dessus. Définitions des sept intentions identiques à COM.
> Migration `20261001201525_space_future_navigation.sql`, APPLIQUÉE via
> MCP (`space_future_navigation`, journal `20261001202914`). Aucun travail
> Oracle/n8n demandé par ce lot ; pas de réapplication de cette migration.

### Correction 0.23 — même jour, dernière demande de Wah

> SPACE conserve ses cinq vues et tous ses gestes. Boussole et couronne
> reviennent ; retour horizontal au radar depuis les côtés. Aucun filtre
> d'intention vertical : choisir SA Habit Box complète de COM, puis repli
> sur ses intentions s'il n'y a aucun Spot de cette Habit. Titres par vue.
> PRIVATE/SHARED → ON/OFF si SHARED → SILENT/SOCIAL si ON → durée/commentaire.
> TOP : Spot futur, lieu choisi puis marqué DANS le radar réduit. BOTTOM :
> capture HD, joystick remonté NAVY, rond/carré rouge REC/STOP. Boutons ajustés
> au texte. Migrations appliquées par MCP, ne pas réappliquer. Bunny : code
> et Edge Functions en place, API d'upload 200, activation CDN protégée encore
> bloquée par les secrets hostname/token/read-only manquants ; voir README.
> Cette correction REMPLACE toute règle contredite de 0.21 / 0.22.

### Correction 0.24 — 02/10/2026 · la vidéo est le fer de lance de SPACE

> Chaque Spot filmé est un vrai Short vertical 9:16, téléphone ET ordinateur.
> Cible Full HD 1080 × 1920, 30 fps, 10 Mbps + audio 192 kbps ; source caméra
> haute résolution recadrée avant son unique encodage, sans déformation ni
> agrandissement artificiel. Enveloppe 48 000 000 octets / 33 s. Cadres 9:16
> pour le feed, le détail et la caméra desktop, joystick REC/STOP conservé.
> HLS démarre dans la meilleure résolution disponible. Migration
> `20261002071846_space_portrait_hd_video.sql` APPLIQUÉE, journal
> `20261002072508` : ne pas réappliquer. Les fichiers réellement envoyés
> sont validés avec caméras simulées portrait et paysage. Bunny attend
> toujours la configuration CDN protégée décrite dans README ; stockage
> privé actif en attendant. Aucun travail Oracle/n8n ni nouveau paiement.
> Cette correction remplace les anciens paramètres capture/limite du 01/10.

### Correction 0.25 — 02/10/2026 · fluidité de la vidéo

> Fluidité pour la capture, le scroll et la publication, sans retirer les
> cinq vues, le joystick, la boussole ni les panneaux desktop. Flux natif
> 1080 × 1920 / 30 fps s'il est vraiment portrait ; canvas seulement pour le
> crop nécessaire. Codec choisi selon le matériel. Préparer UN clip suivant,
> conserver au plus trois lecteurs, append de pagination sans effacer le clip
> actif, libération hors vue/arrière-plan. HLS adaptatif, qualité initiale
> selon connexion : remplace le forçage de la résolution maximale de 0.24.
> Radar allégé pendant feed/caméra ; localisation et upload en parallèle.
> Mesures locales avec mouvement et latence simulée : pas une promesse
> TikTok sur téléphone. Bunny attend toujours son CDN protégé ; aucun nouveau
> paiement, travail Oracle/n8n, ni migration requis. Voir SYSTEM.md §0.

### Correction 0.26 — 02/10/2026 · figher.club = le branding Higher · le luxe

> figher.club = l'expérimentation du branding de higher.boutique : [Get
> Higher], Make the Lisbon Streets Higher, la méthode Stoner et Origins y
> vivent (308 depuis la boutique et totehm.space). FIGHER = THP + une Habit
> Box (l'annuel sort de la règle) ; collectionner/revendre l'art suit cette
> porte. higher.boutique = la totehmisation Streetwear et Luxe ; le luxe se
> lance à 500 € (`luxury_offer`), réservé aux propriétaires d'un THP,
> `metadata.product = 'luxury'`. Marques nommées, jamais leurs logos.
> L'économie créateur 80/20 reste sur COM/SPACE. Migration
> `20261002_figher_club_luxury.sql` APPLIQUÉE par MCP : ne pas réappliquer.
> Aucun travail Oracle/n8n demandé.

### Correction 0.27 — 02/10/2026 · Streetwear et Luxe, centrés

> /streetwear et /luxury : une colonne centrée, minimaliste mais visible ;
> trois étapes dites en haut (BOX → CLOTH → MATERIALIZE), un seul appel à
> l'action, contrôles gris (plus de tuile perforée sur les flèches). Prix et
> tailles Printful visibles sur le vêtement. L'APERÇU n'est pas l'œuvre : la
> place (`print_area`), la palette de la Box, le style et le nom gravé,
> dessinés sur la page, sans appel payant ; l'œuvre (n8n, gpt-image-1 ×7,
> curation Telegram) reste une surprise jusqu'au déballage. Un aperçu IA avant
> achat coûterait ~0,06 $ par image par visiteur et casserait la promesse :
> refusé. Luxe : prix serveur affiché d'emblée, pièces dessinées, le chemin
> en trois temps. Aucune migration. n8n en panne (`process.env`) : tâche
> Claude Code du 02/10.

### Correction 0.28 — 02/10/2026 · le papier de totehm.com a deux faces

> L'atterrissage de COM reste UN objet : le papier. Recto = MON Totehm (le
> logo se déconstruit en Totehm déplié, inchangé). Verso = la recherche d'UN
> AUTRE Totehm, sans compte : retourner le papier (le mot du bas), puis le
> toucher — il se déplie jusqu'à couvrir l'écran, la saisie est en Quantico,
> un résultat = un NOM et une offre, jamais un contenu. `/search` reste la
> même recherche sur sa page. La console gagne « Copy a post for my
> networks » (phrase + lien /@nom, aucun prix) ; pas de page « influenceurs »
> (BRAND : pas de caste créateur). Front seul : aucune migration, aucune
> Edge Function, aucun travail Oracle/n8n.

### Correction 0.29 — 02/10/2026 · le papier de COM : on le retourne, il cherche

> REMPLACE la mécanique de 0.28 (le mot du bas, puis un second tap). Le
> papier de totehm.com est POSÉ, recto, immobile ; il ne tourne jamais tout
> seul. Un tap sur le recto déploie MON Totehm (inchangé). Le retourner — au
> doigt, d'une pichenette ou par le mot du bas — lance la recherche tout de
> suite : on zoome dans son dos, l'écran devient le papier navy, le NOM du
> Totehm (en Quantico, au dos) devient la saisie, déjà sélectionnée ; on le
> change pour trouver un autre Totehm, sans compte. Fermée, la recherche
> dézoome sur le dos et le papier se remet sur son recto. Le buvard du 28/09
> (glisser, jeter, étirer) est retiré. Sur totehm.space, le papier tourne
> seul avec le nom du membre (autre lot). Front seul : aucune migration,
> aucun travail Oracle/n8n.

### Correction 0.30 — 03/10/2026 · la bouche : le papier sur la langue

> S'AJOUTE à 0.29 (le tap et le retournement sont inchangés). En bas de
> l'atterrissage de totehm.com, une bouche fermée (gris, le dessin de Wah).
> Un appui prolongé prend le papier : on le porte où l'on veut. Approché,
> la bouche s'ouvre et la langue se tire ; posé sur la langue, il rapetisse
> et « Get [Higher] » apparaît à sa place de repos. Lâché dessus : la langue
> rentre avec lui, la bouche se ferme → figher.club/get_higher (par le pont
> SSO). Lâché ailleurs : il rentre chez lui. Le paiement reste le clic
> « Buy » de la page d'achat (renonciation au droit de rétractation). Front
> seul : aucune migration, aucune Edge Function, aucun travail Oracle/n8n.

## Le rapport

Un tableau : ce qui a été fait, la valeur mesurée, ce qui n'a pas pu l'être.

### Correction 0.34 — 03/10/2026 · découvrir, lire, copier, pratiquer

> COM : recherche par nom avec accents/fautes/liens, abonnements, boxes accessibles (type/intention). Le résultat EST le TOTEHM natif à cinq vues, en read-only ; copies individuelles ou de vue, revue, import personnel avec provenance, déduplication et liens remappés entre boxes sélectionnées. Accès source actuel requis ; aucune copie de coordonnées/statistiques/historique. Noms publics seulement sans abonnement. Migration `search_and_box_import` appliquée (journal `20261003164312`), ne pas réappliquer. Modèle annuel créateur et 80/20 conservé. Aucun travail Oracle/n8n demandé ; reporter la vision dans le master.

### Correction 0.33 — 03/10/2026 · ce que veut le membre, vue par vue

À reporter dans TOTEHM_MASTER.md §0 : l'idée de SPACE = vivre une habitude hors de chez soi, la rendre agréable. Radar = rejoindre maintenant ; fil = rejoindre (JOIN) ou s'inspirer (GET INSPIRED) ; agenda = prévoir (GO, WATCH, CALENDAR, SHARE) ; TOP = annoncer ; BOTTOM = vivre, caméra éteinte jusqu'à VIDEO ou PHOTO. Un space porte une vidéo OU une photo. Sur un space partagé, l'auteur peut montrer le WHY (objectifs) et le TRIGGER (répulsions) de sa Habit : le format natif des partenariats de marque (mention de partenariat payé à prévoir). GO sans abonnement → SUBSCRIBE vers la page du créateur sur COM. Plus de fiche qui répète la boîte. Prix et droits inchangés.

### Correction 0.32 — 03/10/2026 · TOP = BOTTOM, vidéo future, LEFT filtré

À reporter dans TOTEHM_MASTER.md §0 : créer un space futur (TOP) = la Habit Box, puis une configuration noire et grise comme après une vidéo. Le lieu : une ville ET/OU le point sur la carte ; seul SHARED·ON (le point pour les abonnés) exige le point exact, PRIVATE et SHARED·OFF se contentent de la ville, sans demander la position. Une vidéo peut finir le parcours : depuis les fichiers (verticale, ≤ 33 s, ≤ 48 Mo) ou filmée par la caméra SPACE. LEFT : chaque space = Habit Box + bloc de données noir et gris ; un filtre à côté du papier (now/before · location on/off · silent/social), gratuit (navigateur). Prix et droits inchangés.

### Correction 0.31 — 03/10/2026 · espaces et identité Coral

À reporter dans TOTEHM_MASTER.md §0 : le space est une Habit vécue ou planifiée dans un lieu, privé ou partagé. COM My spaces retrouve l'historique propriétaire avec des liens SSO vers SPACE. Filmer demande un REC volontaire ; après la prise, formulaire noir transparent plein écran, DURATION, sans gestes parasites. SPACE conserve cinq vues/gestes/panneaux desktop, enlève les titres, rapproche le radar du joystick et agrandit le papier ; les côtés montrent le petit filtre seul. Détail à poignée descendante et joystick en sourdine ; GO respecte les droits exacts ON. Noms en Quantico Coral, noir arrondi en recherche/verso, plus de points/carrés ni T statiques centrés. Prix et droits d'abonnement inchangés.
