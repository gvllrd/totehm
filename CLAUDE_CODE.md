# CLAUDE_CODE.md — la tâche de Claude Code (terminal de Wah)

> Depuis le 30/09/2026, la session cloud de Claude fait tout ce qui passe par
> Internet (code, base, fonctions, fusion, Vercel, Stripe). Claude Code ne
> reçoit ici que ce qui exige la machine de Wah : **la VM Oracle, docker
> compose, caddy, n8n, le master**. Une commande simple par ligne. Aucun
> secret dans ce fichier.

## Tâche en cours — 01/10/2026 · le ménage en base (une approbation)

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

## Le rapport

Un tableau : ce qui a été fait, la valeur mesurée, ce qui n'a pas pu l'être.
