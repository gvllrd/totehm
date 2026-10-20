# CLAUDE_CODE.md — la tâche de Claude Code (terminal de Wah)

## TÂCHE · 18/10/2026 — appliquer les LECTEURS de la confidentialité par box

Une migration attend la machine de Wah : elle contient des `alter policy`, que
le MCP du cloud refuse (il les classe destructifs et expire à 60 s).

Fichier : `backend/supabase/migrations/20261018091000_audience_par_box_lecteurs.sql`

Ce qu'elle fait : `totehm_of` filtre désormais BOX PAR BOX (`_box_shared`) au
lieu du seul plafond `totehms.audience` ; cinq politiques de lecture suivent
(`objectives`, `visions`, `wisdom` sur `_box_shared(user_id, audience)` ;
`totehms` ramené au propriétaire). Un `habit_rename_links` renommé emporte la
ligne `habit_audience`.

Commande (une ligne) :

    psql "$SUPABASE_DB_URL" -f backend/supabase/migrations/20261018091000_audience_par_box_lecteurs.sql

Puis, pour vérifier (le test saute ses contrôles « LECTEURS » tant que la
migration n'est pas passée ; après, il doit afficher `lecteurs=t FAIL={}`) :

    psql "$SUPABASE_DB_URL" -f tests/sql/audience_par_box_selftest.sql

Le `revoke` final est DANS le fichier, après le dernier `create or replace` :
ne pas réordonner.

## À reporter au master · 18/10/2026 — la confidentialité est par box, le papier se range

Dans `~/totehm/TOTEHM_MASTER.md` §0 : PLUS DE CONFIDENTIALITÉ AU NIVEAU DU
TOTEHM. Chaque box de chaque vue porte son niveau — `private` (moi seul) ·
`subscribers` (abonné à ce créateur) · `figher` (membre du Club). Défaut :
privé, une box neuve ne s'ouvre jamais toute seule. Les habitudes ont leur
table (`habit_audience`), jamais une colonne dans `steps` (que `cloudSave()`
réécrit en entier). Écrire = `box_audience_put`, lire ses niveaux =
`my_box_audiences()`. Composition des pages : 60 % black pur, 30 % navy TOTEHM
(et ses deux couleurs de rattachement), 10 % les 7 couleurs d'intention — sauf
DANS le Totehm déplié, où le navy reprend la main. Sur ordinateur le joystick
sort du papier (bas, centré, dans le noir) ; sur mobile il passe à droite et
partage l'écran avec TOTEHM.svg. Le joystick ne s'inverse plus à la souris. La
Reflection n'a plus de boîte de saisie ni de double curseur : on tape dans le
noir. BUILD `2026-10-18-com-place`.

Deuxième volet (BUILD `2026-10-18-com-lecture`) : la MANETTE est revenue sur
l'atterrissage, en bas au centre (les quatre chevrons entourent le manche) ;
les sept traits d'intention VIVENT et leurs couleurs se lisent (une intention
vide passe de .22 à .5, et porte une impulsion de veille) ; la galaxie est
décorative — 248 carrés deux fois plus petits, un filet d'intention sur
chacun — et **Entrée y ouvre le TOTEHM du nom tapé, EN LECTURE, dans la même
page** : `RO` s'arme en plein vol, l'URL suit par `replaceState`, on ne
navigue jamais. Sans compte, c'est toujours `/@nom` qui s'ouvre.

Quatrième volet (BUILD `2026-10-19-com-polaroid`) : l'élément du Totehm est un
POLAROID posé sur le média, et il SE DÉPLACE — sa place est à moi
(`feed_badges`, une lecture au chargement, des écritures groupées). Un seul
moteur de feed sert les DEUX vues : à gauche tous mes médias, à droite mes
spots. La vue de droite a deux modes, RADAR et SHORTS, qui lisent les mêmes
points et le MÊME filtre. Des filtres par type, par temps et par intention
(des points de couleur), calculés sur ce qui est déjà en mémoire : zéro appel
de plus. Le « + » de la vue de gauche ajoute un média en demandant D'ABORD
l'élément auquel il s'attribue.

Cinquième volet (BUILD `2026-10-19-com-60-30-10`) : la composition 60 / 30 / 10
est APPLIQUÉE page par page, et MESURÉE. Plus un seul faux noir comme surface
(`#121214`, `#131316`, `#0c0c0e`, `#16161a`…) : un panneau est navy un ton en
arrière (`#22224a` · `#263362` · `#51224a`) ou il est NOIR, les contrôles n'ont
qu'un gris. `terms.html` n'est plus une page entièrement navy. Mesuré :
`/higher` 70 % noir / 28 % navy · `/monetize` 75/21 · `/@nom` 75/24 ·
`/console` 52/37 · `/terms` 86/14 ; les cinq vues de l'atterrissage ≥ 94 % de
noir, les sept couleurs jamais au-dessus de 0,3 %. La seule exception reste le
Totehm DÉPLOYÉ, où le papier navy prend le champ.

Dixième volet (BUILD `2026-10-20-com-grille`) : À GAUCHE, UNE GRILLE
INSTAGRAM — chaque photo ou vidéo du Totehm, la boîte de son élément posée
dessus, légèrement surélevée, avec ses filtres. À DROITE, LES SPOTS DU CLUB
(figher.club en est le prolongement) : passé · maintenant · à venir, en radar
ou en shorts TikTok ; c'est là seulement qu'on a le polaroid, avec en haut
la bande noire transparente des informations du spot.

Neuvième volet (BUILD `2026-10-20-com-curseur`) : EN BAS, ON ARRIVE ET ON
TAPE. Passer à ma Reflection ouvre le clavier tout de suite ; le curseur
clignote à gauche, un seul à la fois, aucune boîte ; ce que j'écris est en
grand. Si le téléphone refuse le clavier pendant le glissé, un tap l'ouvre.

Huitième volet (BUILD `2026-10-20-com-verso`) : LE VERSO = MON ARGENT, EN
UN ÉCRAN. Le nom une fois en haut ; ce que je gagne, OPEN/OFF, le prix au
curseur (enregistré en le lâchant), où me payer, ma page à partager ; puis ce
que je paie (mes abonnements, Higher, TotehmBot), une ligne et un geste
chacun. La console n'est plus empilée dans le verso.

Septième volet (BUILD `2026-10-19-com-etages`) : LE TOTEHM SORT DU CENTRE et
se cale EN HAUT, CENTRÉ, sur mes shorts comme sur mes spots (c'est le même
objet qui voyage) ; un tap dessus choisit une Box — les CINQ vues à gauche,
les HABITS seules à droite. La vue de GAUCHE devient SEPT ÉTAGES d'intention
(Instagram-Netflix) : du rouge en bas au violet en haut, on REMONTE pour
passer à la suivante, une rangée par écran sur téléphone, les polaroids à
l'horizontale, un polaroid VIDE en bout de ligne. Le polaroid est une vraie
photo polaroid : BLANC, la Box du Totehm accolée dessous (nom, intention,
rythme, lieu habituel, mini-boîtes). Un appui long change le POINT DE
FOCALISATION de l'image. Les sept couleurs ne filtrent plus : elles
structurent. Plus aucun spot dans la vue de gauche.

Sixième volet (BUILD `2026-10-19-com-filter`) : LE POLAROID EST UN CADRE —
une carte navy, le média dans sa fenêtre, la Box imprimée dessous (nom,
intention dans sa couleur, rythme, mini-boîtes), et par-dessus le média du
NOIR TRANSPARENT qui porte les informations du spot (quand, durée, ville,
niveau, point ouvert ou non). Un appui long déplace la carte ; le reste du
temps le doigt fait défiler. Les filtres reprennent ceux de SPACE : le PAPIER
choisit une Box et tout ce qui la compose, [Filter · N] ouvre le reste
(intentions, mood, ce que ça montre, la vue ou le temps).

Troisième volet (BUILD `2026-10-18-com-verso`) : le NOM est un IDENTIFIANT
sans espace (normalisé à la frappe) et il ne vit QUE sur la face verso, fixe
en haut, en petit, sans retour de ligne — `#conn-bar` est parti, il n'y a plus
d'espace membre hors du verso. Le verso PORTE LA CONSOLE (affichée une fois le
verso posé), sans photo de profil, sans confidentialité du Totehm (elle est
par box) et sans `/monetize` — la page de vente devient une plaquette à
envoyer par mail aux influenceurs. [Others] met le papier côté VERSO dans la
case [MINE].

## À reporter au master · 11/10/2026 — boutons boutique encore plus compacts

Dans `~/totehm/TOTEHM_MASTER.md` §0 : le padding des boutons de la boutique
est désormais `.12em .24em` (règle commune), avec des styles natifs plus courts.
Les bordures transparentes des anciens boutons passent de 4 à 2 px ; Decode
garde la même taille au survol et au focus. Changement CSS dans `boutique/`.

## Mise à jour · 06/10/2026 — le nouveau produit récupère sa photo

Le précédent Champion a été remplacé par Wah. Produit courant Printful
`478633385`, Higher Champion Sweatshirt ; support
`c615b050-cd3e-4560-a1aa-ce943192f34e` actif, prix préexistant 170 €,
édition préexistante 177. Une resynchronisation (91) a rempli la photo
absente. F attend maintenant une minute puis réessaie une photo absente,
jusqu'à cinq reprises ; boucle bornée, photos choisies/prix/stock conservés.
Version publiée : `c9638e70-0d0f-4dba-adb1-a78f2ccb8ec8` ; tests 92
(attente réelle de 60 s dans le brouillon) et 94 (webhook publié) réussis.
Image visible dans le navigateur public. Aucun changement Oracle requis.

À reporter dans `~/totehm/TOTEHM_MASTER.md` §0 : photo principale Printful
automatique, avec reprise si absente à l'import ; les photos supplémentaires
choisies restent dans le dossier Storage du support. Les notes précédentes
sur `478625396` et l'édition 12 décrivent l'ancien produit, supprimé par Wah.

> Depuis le 30/09/2026, la session cloud de Claude fait tout ce qui passe par
> Internet (code, base, fonctions, fusion, Vercel, Stripe). Claude Code ne
> reçoit ici que ce qui exige la machine de Wah : **la VM Oracle, docker
> compose, caddy, n8n, le master**. Une commande simple par ligne. Aucun
> secret dans ce fichier.

## Mise à jour · 06/10/2026 — F débloqué et Streetwear visible

F a été corrigé et publié par la session cloud. Version active :
`10ab0cbc-4698-4962-a457-945ad5d58e42`. Plus de nœud `CONFIG` : les clés
sont lues via `$env` dans `Sync Product`, sans les recopier dans les items.
Les variables Oracle étaient accessibles ; la panne venait de l'ancienne
version publiée utilisant `process.env`. Aucune modification du runner
Oracle n'a été nécessaire. Les succès de production ne sauvegardent plus
leurs données (`saveDataSuccessExecution=none`).

Store Printful `18517279` ; produit courant `478625396` (Champion
Sweatshirt), l'ancien `478320451` renvoie 404. Exécutions 84 (création),
85 (webhook publié), 86 (photo), 87 (webhook avec prix/édition déjà réglés)
réussies. Support `3387332a-a258-4a7e-9391-803fe446cfa6` actif, prix
préexistant 170 €, édition préexistante 12, tailles S/M/L/XL/2XL.
F remplit une photo manquante avec l'aperçu Printful ; la page utilise cette
photo si le dossier Storage est vide, sans remplacer les photos choisies.

À reporter dans `~/totehm/TOTEHM_MASTER.md` §0 : F et l'affichage Streetwear
sont réparés ; la note du 05/10 ci-dessous ne décrit plus leur état actuel.
B/C/D/E avaient encore un ancien `CONFIG process.env` publié lors de la
lecture du 06/10 : ils restent à traiter. A n'était pas accessible par le
connecteur ; son archivage reste à vérifier. Rotation et purge des anciennes
clés/exécutions restent une tâche distincte sur Oracle.

## Tâche restante — 05/10/2026 · n8n : publier, cacher les clés, Printful (priorité)

Mesuré par la session cloud le 05/10. Les six `⚙️ CONFIG` lisent bien `$env`
(ta correction du 02/10) MAIS **la version publiée est encore l'ancienne**
(`process.env`) : en production, A→F plantent toujours. Et l'essai manuel
(exécution 73, workflow F) montre deux choses :

**⚠️ LES CLÉS SONT EXPOSÉES.** `⚙️ CONFIG` recopie SB_KEY, PRINTFUL_TOKEN,
STRIPE_KEY (live), OPENAI_KEY, RESEND_KEY dans les données de l'item : chaque
exécution les écrit en clair dans la base de n8n, lisibles par quiconque lit
les exécutions (MCP compris). Considère-les comme compromises.

1. Wah génère de nouvelles clés (2FA) : Stripe live (Developers → API keys → roll), OpenAI, Printful, Resend ; toi : la clé secrète Supabase (`sb_secret_…`, API de gestion)
2. Mets-les dans le `.env` de n8n (VM Oracle) ET dans les secrets Supabase quand elles y sont (`STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `OPENAI_API_KEY`) ; redémarre n8n
3. Dans les six workflows : supprime le nœud `⚙️ CONFIG` comme porteur de clés — chaque nœud lit `{{ $env.X }}` au moment où il en a besoin ; RIEN de secret dans un item
4. Paramètres n8n : ne plus enregistrer les données des exécutions réussies (`EXECUTIONS_DATA_SAVE_ON_SUCCESS=none`) et supprime les exécutions 72 et 73
5. Publie les six workflows (version active = version corrigée)
6. Workflow B (`/webhook/streetwear-generate`) : ajoute une authentification par en-tête (`x-totehm-key`, valeur dans `.env` ET dans un secret Supabase `N8N_GENERATE_KEY`) — aujourd'hui n'importe qui peut déclencher une génération payante. Dis-le à la session cloud : elle ajoutera l'en-tête dans `stripe-webhook`.
7. Workflow A (`stripe-streetwear`) : à ARCHIVER. Stripe ne l'appelle pas (un seul endpoint : Supabase `stripe-webhook`, qui traite désormais `cloth` lui-même et appelle B).
8. Workflow F : l'essai manuel rend **400** chez Printful ou Supabase (corps non visible d'ici). Lis la réponse ; si Printful exige `X-PF-Store-Id`, ajoute-le. Puis rejoue F pour chaque produit du store (`GET /store/products`), dont le produit Champion ajouté par Wah.
9. Attendu : une ligne par produit dans `totehm_cloth_support` (`active=false`, `price=0`, `max_pieces=0`). Prix et stock = un « oui » de Wah, posés par la session cloud.
10. Rapport : une ligne par étape, la valeur mesurée (versions publiées, lignes, ids). Aucune clé dans le rapport.

## Tâche 2 — 05/10/2026 (soir) · le mode test Stripe (avant ou après la tâche n8n)

La boutique sait payer en MODE TEST (code déployé). Il manque les deux secrets.
1. Wah ouvre dashboard.stripe.com en **mode test** (bascule « Test mode ») → Developers → API keys → copie la `sk_test_…` dans TON terminal (jamais dans une conversation cloud)
2. `supabase secrets set STRIPE_TEST_SECRET_KEY=… --project-ref abujjbkbbiumxrokozph`
3. Toujours en mode test : crée UN endpoint webhook → `https://abujjbkbbiumxrokozph.supabase.co/functions/v1/stripe-webhook`, événement `checkout.session.completed` seul (l'endpoint LIVE ne bouge pas)
4. `supabase secrets set STRIPE_TEST_WEBHOOK_SECRET=whsec_… --project-ref abujjbkbbiumxrokozph`
5. Contrôle : depuis le dashboard test, « Send test event » `checkout.session.completed` → réponse 200 `test ignored` (pas de `metadata.product`) ; puis Wah achète un Cloth avec 4242 4242 4242 4242 → pièce `paid`, `test = true`, email « [TEST] »
6. Workflow D (n8n) : ne jamais commander chez Printful une pièce `totehm_clothes.test = true`
7. Rapport : une ligne par étape (secrets présents oui/non, id de l'endpoint test, statut de l'événement). Aucune clé.

## Tâche 3 — 08/10/2026 · F : les vues du vêtement (utile, pas urgent)

/streetwear fait défiler ↑ ↓ les VUES d'un vêtement = les fichiers de son dossier
Storage. Le Champion n'en a qu'une (`image_url`, dossier vide).
1. Dans F, à la synchronisation d'un produit : Printful mockup generator
   (`POST /mockup-generator/create-task/{catalog_product_id}`, placements front et
   back, puis `GET /mockup-generator/task?task_key=…`) → déposer `1-front.png`,
   `2-back.png`… dans `totehm-cloth-support/<storage_folder>/` (upsert), sans
   écraser une photo posée à la main ; rejouer F pour le Champion `478633385`.
2. Rapport : le nombre de vues par support. Aucune clé dans le rapport.

## Tâche 5 — 11/10/2026 · ouvrir la connexion sans email (une ligne, réversible)

Le mode invité de totehm.com est livré mais CACHÉ : le projet refuse la connexion anonyme
(`/auth/v1/settings` → `external.anonymous_users: false`). La session cloud n'a pas de jeton Management API.
1. `PATCH https://api.supabase.com/v1/projects/abujjbkbbiumxrokozph/config/auth` avec
   `{"external_anonymous_users_enabled": true}` (jeton `sbp_…` local, jamais recopié) — ou Dashboard →
   Authentication → Sign In / Providers → « Allow anonymous sign-ins ».
2. Vérifier : `GET https://abujjbkbbiumxrokozph.supabase.co/auth/v1/settings` → `anonymous_users: true`.
3. Le gabarit « Change email address » doit contenir `{{ .Token }}` (l'invité tape un code, pas un lien).
4. Rapport : les deux valeurs. Retour arrière : le même PATCH à `false` (le bouton se recache seul).

## Tâche 4 — 09/10/2026 · purger les spaces et les spots d'essai (une approbation)

Tout est déjà annulé et invisible (session cloud, `spaces_spots_reset`). Reste
la purge, destructive :
1. `git pull` dans `~/totehm`
2. MCP Supabase `execute_sql` : la requête 1 en tête de
   `backend/supabase/migrations/20261009120001_spaces_spots_menage.sql` ;
   `vivants` doit valoir 0, sinon s'arrêter.
3. MCP Supabase `apply_migration`, nom `spaces_spots_menage`, contenu = ce fichier (approuve).
4. Supprimer les 2 fichiers du seau `moments` (requête 2 du fichier) par l'API
   Storage, jamais par un `delete` sur `storage.objects`.
5. Rapport : `spot_plans`, `spots`, `spot_takes`, fichiers `moments` (attendu 0 · 0 · 0 · 0).

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

### Correction 0.37 — 05/10/2026 · la boutique opérationnelle, la manette

> higher.boutique devient une manette (style SPACE) : HIGHER au centre, quatre
> portes — ↑ STREETWEAR, → LUXURY, ↓ DECODE, ← NEWS ; le joystick COM nomme
> et colore la porte avant d'y aller, le centre agit (GO · QUOTE · DECODE ·
> SEND · PLAY), un Cloth décodé prête sa palette au manche. Collaboration en
> cours écrite au format des marques : « Totehm x Champion · Limited
> collection » (un nom, jamais le logo). Le LUXE passe SUR DEVIS : le membre
> (THP) décrit sa pièce, sa marque et choisit la Box ; Wah répond par un prix
> sur /luxury (administrateur) ; le membre paie CE prix ; « à partir de
> 500 € ». DECODE lit `reveal_cloth` (invité · FIGHER · propriétaire). Le
> paiement Streetwear est enfin traité (`stripe-webhook`, cas `cloth` :
> payé → génération n8n → email) ; le nom d'un Cloth est vérifié par le
> serveur. Banc d'essai : un prix d'essai PAR COMPTE (`boutique_testers`,
> éteint ; l'allumer = un « oui » de Wah). Migration
> `20261005_boutique_operationnelle.sql` APPLIQUÉE (`boutique_operationnelle`) :
> ne pas réappliquer. n8n : tâche du 05/10.

### Correction 0.38 — 05/10/2026 (soir) · l'accueil d'avant, le mode test

> Wah refuse la manette sur l'accueil : higher.boutique reprend sa page
> d'avant ; sous [Create my Totehm Streetwear Cloth], la collection du
> moment « Totehm x Champion 2026 » (un nom, jamais le logo) ;
> [Experience our dope branding] mène à totehm.com. Le manche reste sur
> /streetwear et /luxury. Le prix d'essai à 1 € disparaît : un testeur paie
> en MODE TEST Stripe, au vrai prix, sans argent réel (pièces et commandes
> `test`, sans génération ni Printful). Migration `20261005b_stripe_test_mode.sql`
> APPLIQUÉE (`stripe_test_mode`) : ne pas réappliquer.

### Correction 0.62 — 16/10/2026 (bis) · la liste seule dans le Totehm ; ← mes shorts, → mes spots (lot F, à reporter)
> **Les modes de 0.61 sont ANNULÉS** (Wah : « on garde seulement le mode liste … sinon ça pète toute la structure »).
> Dans le Totehm : la LISTE seule, aucune bascule, la manette ne s'en va plus jamais, la croix et Échap replient d'un
> coup. Les deux moteurs sont des VUES de l'atterrissage, qui regagne l'horizontale (cinq vues, quatre voisins) :
> **← MES SHORTS** = un tiktok plein écran, UN MÉDIA par écran (mes fichiers, la photo d'un spot, l'image d'une
> VISION), la légende portant les traits d'intention et ouvrant son élément dans le Totehm ; **→ MES SPOTS** = le
> radar de TOUS mes spots, canvas transparent centré sur le papier (le centre, c'est moi). Zéro appel réseau de plus :
> les trois sources sont déjà en mémoire. Membre seulement, et jamais dans la galaxie (l'horizontale y fait tourner
> les étoiles). **Dette de 0.61 réparée** : `creator.html` (`/search`, `/@nom`) avait gardé « Manage my
> subscriptions » alors que les trois autres copies du menu membre disaient « My monetization » — les quatre
> copies sont alignées. Aucune migration, aucun prix : rien à approuver. BUILD `2026-10-16-com-vues`.

### Correction 0.61 — 16/10/2026 · le Club est le public, deux modes par vue, deux offres nommées (lot E, à reporter)
> **Le Club EST le public, et il s'ouvre à TROIS objets** : `_figher().member` = une habit + un objectif + une
> répulsion (plus les cinq vues). **IL N'Y A PLUS DE NIVEAU PUBLIC** : PRIVATE · FIGHER CLUB · MY SUBSCRIBERS.
> Conséquence assumée : un visiteur sans compte ne liste plus aucun contenu — restent ouverts les NOMS et `/@nom`,
> c'est la surface d'acquisition. Migration `20261016090000_club_ouvert_trois_objets.sql` APPLIQUÉE
> (`club_ouvert_trois_objets`) : ne pas réappliquer. La contrainte `check` accepte encore `public`, normalisé par
> les deux triggers — le jour où un `drop` sera possible depuis le terminal, la resserrer à trois valeurs.
> **Dans le Totehm : deux modes par vue** — ⚠️ ANNULÉ par 0.62 le même jour (la liste est seule ; les shorts et le
> radar sont devenus deux vues de l'atterrissage). **La galaxie** : une multitude de dos de papier, la recherche AU MILIEU, et `/@nom` s'ouvre SUR PLACE
> dans la couche (zéro saut d'URL), la fermeture rejouant la plongée à l'envers.
> **Le nom du Totehm** vit en haut au centre, en petit, et n'en bouge jamais (il a quitté le recto du papier).
> **Le verso = le menu membre**, d'emblée. **Plus de spaces dans COM** : My Totehm spaces, le groupe SPACES d'une
> Habit Box et « + a space » sont retirés ; un spot s'annonce DANS la boîte. `[Add a media]` / `[Add a spot]`,
> aucune icône dans une liste.
> **Deux offres, deux mots** : « Monetize my TOTEHM » (le créateur, 80 %, `/monetize` refait) et « My Higher »
> (le personnel, `/higher`, page de vente NEUVE : le Higher Self chaque jour + Telegram au rythme de chaque Habit
> + le tracker ; prix lu sur le serveur, checkout `higher-sub`). Prix inchangé : rien à approuver.

### Correction 0.60 — 15/10/2026 (bis) · le réseau neuronal (lot D, à reporter ; précise 0.59)
> Les ramifications prennent TOUT l'écran : la ligne du trait d'intention publié (2 px, les 7 couleurs exactes),
> qui se reconfigure par vue — le circuit autour du Totehm au centre, un CERVEAU vu de dessus en haut (scissure et
> tronc gris, sept circonvolutions, une par intention), résorbé en bas. Connecté, une impulsion circule sur chaque
> piste à la période RÉELLE de son Habit ; déconnecté, c'est atténué et immobile. Le premier écran revend (sans
> compte) : « [Higher] your brain », la preuve au clic (Gollwitzer & Sheeran 2006, Kross 2014 — jamais « Harvard »,
> l'étude est un mythe), CONNECT, « free · no card » ; en haut, « Neuroscience, not motivation » + la phrase THP.
> Un membre lit « Tap to open it · Turn to configure it ». La galaxie = le DOS du papier SEUL (plus une poussière),
> le nom en Quantico Coral qui grandit avec son carré, plus de liste de résultats. La Reflection au repos = le profil
> et un curseur ; puis direction · LA HABIT sur-élevée AU MILIEU (avec son trait d'intention choisi par le modèle) ·
> obstacle + Teaching. TOUT l'espace membre est passé au verso du papier, la console s'ouvre dedans (couche XO).
> **Telegram SEUL, pas de Meta** : les relances suivent la Time frequency de chaque Habit (migration
> `push_par_frequence` APPLIQUÉE : ne pas réappliquer). Aucun prix touché.

### Correction 0.59 — 15/10/2026 · le processeur (lot C, à reporter ; remplace la croix de 0.58)
> totehm.com = TROIS vues verticales, sans manette ni gauche/droite : ↑ Get Higher (la bouche du 12/10 restaurée,
> la langue → higher.boutique `?from=com`) · centre = le processeur (le papier dans son emboîtement de verre, des
> ramifications aux 7 couleurs exactes ; Mine · Others = la galaxie des TOTEHM présentables, recherche par nom →
> /@nom, retour avec la recherche) · ↓ ma Reflection (seul `#gl-bg` tourne, le papier se condense en profil IA ;
> trois étages : direction bleu clair · obstacle + Teaching from the story rouge-violet · prochaine step-Habit navy,
> refs vérifiées contre le Totehm, une proposition ≠ une Habit). Verso du papier = mes réglages (nom, 4 niveaux,
> programme d'abonnés), sortis de l'espace membre (qui garde le compte). Dans le Totehm : liste + SHORTS (une
> Habit par écran, son média devant) ; photo · vidéo · fichier depuis l'élément, privés (importer ≠ publier).
> Migration `processor_media_galaxy` APPLIQUÉE : ne pas réappliquer. `higher-self` v4 (`fmt:'r3'`). Aucun prix.
> Ménage plus tard (une approbation, rien d'urgent) : purger les lignes `element_media` où `removed_at` est posé.

### Correction 0.58 — 13/10/2026 (bis) · la croix de Wah, MY STORY, les satellites réduits (lot B, à reporter)
> totehm.com = une croix : centre = le papier signé (nom en petit, en bas à droite), My TOTEHM · Search another
> TOTEHM (le banc → /@nom) ; ↑ Higher Self (le verso) ; ↓ PHOTO · VIDEO · SPOT ; ← ma Terre + mes shorts ; → mes visions.
> Totehm minimal (sans titres, « + », place en pointillé) ; WISDOM = MY STORY ; un Cloth = MY STORY seul
> (`create-checkout` v41) ; une VISION porte une image libre. SPACE et figher.club : CONNECT WITH MY TOTEHM seul,
> connecté = le nom → COM. Get Higher = la langue sur higher.boutique. Migrations `vision_image`,
> `creator_dashboard` APPLIQUÉES : ne pas réappliquer. Aucun prix. En attente (lot C, prix + « oui ») : l'adhésion
> FIGHER CLUB, Generate (images payantes), la mémoire IA / Stoner, l'abonnement créateur mensuel.

### Correction 0.57 — 13/10/2026 · quatre niveaux, `/@nom` = l'univers (lot A, à reporter)
> Tout ce qu'un membre publie dit qui le voit : PRIVATE · FIGHER CLUB · MY SUBSCRIBERS · PUBLIC (défauts : Totehm
> PRIVATE, space PUBLIC, spot FIGHER CLUB). Un abonné lit tout sauf le privé ; les vitrines ne listent que public +
> FIGHER CLUB aux membres ; le point exact = auteur, membre FIGHER CLUB (public/figher), abonné. `/@nom` = l'univers
> (lisible net, réservé flouté, Subscribe). Migrations `audience_four_levels`, `audience_my_lists`,
> `audience_console` APPLIQUÉES : ne pas réappliquer. Aucun prix. En attente : l'adhésion FIGHER CLUB (lot C, prix + « oui »).

### Correction 0.56 — 12/10/2026 (bis) · une plateforme, le moins de mots (à reporter)
> totehm.com sert SPACE et le Club (`/x/space`, `/x/club`, même origine) dans une couche : un space, un spot,
> « + a space », « + a spot » s'ouvrent sur place, la Habit déjà choisie. totehm.space arrive dans le fil ;
> figher.club = le radar. Plus de « [Higher] STRATEGY », de phrase du pourquoi, de texte du THP ; le nom du
> Totehm est écrit sur le papier navy (plus de boîte noire, nulle part). Croix de COM : ← Get Higher, ↑ chercher.
> Trackpad de COM lu comme SPACE. TotehmSM = un miroir (une réponse, une boîte). Abonnement mensuel à un
> créateur et la boutique dans la couche : en attente (voir le rapport du 12/10). Aucun prix, aucune migration.
> (ter) Les couleurs de la manette d'avant reviennent sur COM et SPACE : chaque vue garde sa teinte.

### Correction 0.55 — 12/10/2026 · la box telle quelle (à reporter ; remplace la « boîte éparpillée » de 0.54)
> Dans le fil de SPACE, la Habit Box reste entière (objectifs et répulsions dedans), comme dans COM. À la
> publication d'un space ou d'un spot, la box choisie apparaît telle quelle, tout allumé : un tap éteint une
> mini-box ou le rythme, un tap la rallume ; ce qui est éteint ne se montre ni ne se compare jamais. Ensuite les
> réglages propres à SPACE ou au Club. Migration `space_box_elements` appliquée. Aucun prix.

### Correction 0.54 — 11/10/2026 (bis) · la boîte éparpillée, SPACE → SPOT (à reporter)
> Sur totehm.space, la Habit Box d'un space s'éparpille en boîtes du Totehm (objectifs bleus, répulsions
> rouge-violet) ; un tap ouvre l'horizon de l'élément. SPOT fait d'un space un spot sur figher.club (le mien :
> le plan ; celui d'un autre : ses spots). Un lien partagé montre l'Habit et l'image. Moins de mots partout.
> Aucune migration, aucun prix.

### Correction 0.53 — 11/10/2026 · le pourquoi, l'invité, SPACE réseau social (à reporter)
> totehm.com rappelle son pourquoi sous [Higher] STRATEGY ; le code de vérification ne vide plus rien ; un
> invité peut construire son TOTEHM sans email (connexion anonyme, à ouvrir : Tâche 5) puis le sauver.
> totehm.space devient le réseau social de l'Habit stratégique : concept au centre, fil filtré par une Habit
> Box (objectifs, répulsions), caméra, profil, vibes ; sans selfie ni musique ajoutée ; plus aucun spot.
> Migration `space_social` appliquée. Aucun prix changé.

### Correction 0.52 — 09/10/2026 (soir) · le lot space/spot relu et corrigé (à reporter)
> figher.club parle enfin de spots (il disait « space » partout) ; « What is a spot? » porte les règles de la
> rencontre, « What is a space? » ne dit plus que le contenu. COM compte vrai (« 1 SPACE », « 2 SPOTS ») et
> propose « + a spot ». Migration `habit_spaces_split` appliquée. Aucun travail Oracle/n8n.

### Correction 0.51 — 09/10/2026 · spaces et spots séparés (à reporter)
Une table : `spot_plans.format` space/spot. SPACE = fil + publication ; Club = carte + spots, ancienne porte `/meet` ; COM distingue les deux.
Migration `space_spot_split` appliquée ; signatures et médias conservés. Ne pas réappliquer ; la purge Oracle/n8n reste une tâche séparée.

### Correction 0.50 — 09/10/2026 (ter) · spaces et spots remis à zéro (à reporter)

> Les essais (5 spaces, 7 spots) sont retirés : on repart d'une base vide avant
> de séparer le space (le contenu, sur totehm.space) du spot (le rendez-vous,
> sur figher.club). Aucune règle ni aucun prix changé.

### Correction 0.49 — 09/10/2026 · quatre domaines, quatre fonctions (à reporter)

> totehm.com = la stratégie · totehm.space = l'inspiration (les Habits
> stratégiques vécues) · figher.club = la rencontre dans la réalité (les spots :
> à venir, en cours, passés) · higher.boutique = l'achat, physique et numérique.
> Get Higher, le TotehmPaper, Stoner, Lisbon, Origins et le marché de l'art
> reviennent sur higher.boutique ; leurs adresses figher.club redirigent (308).
> Retours Stripe du THP sur la boutique. Aucune règle d'accès ni aucun prix
> changé. **n8n (Claude Code, facultatif)** : les liens `figher.club/stoner`,
> `/get_higher`, `/market` des e-mails marchent (308) ; les remplacer par
> `higher.boutique/...` au prochain passage dans les workflows.

### Correction 0.48 — 09/10/2026 · le slogan ne passe plus par le coin (à reporter)

> totehm.com : au chargement, le badge [Higher] du slogan n'apparaît plus une
> fraction de seconde dans le coin haut gauche avant d'aller au centre ; il
> apparaît directement à sa place. Aucun travail Oracle/n8n.

### Correction 0.47 — 08/10/2026 (quater) · TotehmSM : le Higher Self en freemium (à reporter)

> totehm.com, vue du bas : TotehmSM devient une conversation en bulles —
> « [Higher] Self », « AI made by you · your beliefs · your TOTEHM », « Talk
> is cheap. Do with a why. » ; le papier devient la photo de profil à côté de
> « Wassup ? ». Chaque réponse = une solution, un geste (DO, avec son heure)
> et son pourquoi pris dans le TOTEHM du membre (WHY), en flux (premier mot
> ≈ 1 s, `gpt-5.1`). Il faut une Habit et un Objective ; 7 réponses offertes
> par 30 jours, puis Higher (7 €/mois : chaque jour, Telegram/WhatsApp,
> TotehmBot). Aucune conversation gardée. Migration additive
> `higher_self_freemium` APPLIQUÉE : ne pas réappliquer.
> **Ménage à faire (Claude Code)** : appliquer
> `backend/supabase/migrations/20261008200001_higher_self_menage.sql`
> (drop `sm_thread`, `sm_messages`) via MCP `apply_migration`, nom
> `higher_self_menage`, après la requête de vérification en tête du fichier.

### Correction 0.46 — 08/10/2026 (ter) · TOTEHMIZE se cale dans WISDOM et VISION (à reporter)

> Comme SPACE dans les habitudes : sur totehm.com, une leçon ou une vision dit
> combien de Totehm Cloths la portent ; ouverte, elle les montre (nom, étape → leur
> page Decode) et « + totehmize » ouvre la boutique avec CET élément déjà choisi
> (on choisit le vêtement, puis directement le nom). Chez un autre : ses Cloths
> seulement si on peut lire son Totehm. Migration `20261008120000_element_cloths.sql`
> APPLIQUÉE (`element_cloths`) : ne pas réappliquer.

### Correction 0.45 — 08/10/2026 (bis) · un vêtement porte WISDOM ou VISION (à reporter)

> Le plein écran de /streetwear vaut pour le TÉLÉPHONE ; sur ordinateur le
> vêtement reste et se décale, les fenêtres glissent sur le côté (comme SPACE) :
> WISDOM à gauche, VISION, nom, style, commande à droite. Un vêtement ne porte
> plus que MY WISDOM (ce que je transmets) ou MY VISION (ce que j'imagine pour le
> monde) ; habitudes, objectifs, répulsions restent à soi (Luxury garde les cinq
> vues). Ni palette de couleurs ni fréquence à l'écran (streetwear, Decode,
> Luxury). Aucune migration ; `create-checkout` v40 refuse les autres vues.

### Correction 0.44 — 08/10/2026 · la Streetwear plein écran, Decode = la page du Cloth (à reporter)

> higher.boutique/streetwear devient cinq scènes plein écran : CLOTH (le
> vêtement au centre, ← → les modèles, ↑ ↓ ses vues) → [TOTEHMIZE] → ELEMENT (le
> Totehm déplié et la manette, là seulement) → NAME (0. + le nom, disponibilité
> en direct) → STYLE (n pièces par style) → ORDER (taille, prix, paiement). « Box »
> reste notre langage ; à l'écran on dit « element ». Decode ouvre la page du
> Cloth : l'élément en tête, le vêtement, la taille, le style, le n°
> d'exemplaire, l'étape, et l'œuvre une fois la pièce expédiée. Un paiement
> abandonné garde le nom de son auteur. Migration
> `20261008100000_streetwear_immersive.sql` APPLIQUÉE (`streetwear_immersive`) :
> ne pas réappliquer.

### Correction 0.43 — 07/10/2026 · l'atterrissage en croix, TotehmSM, l'abonnement Higher (à reporter)

> totehm.com : l'atterrissage devient une croix de cinq vues pilotée par la
> manette du Totehm déplié (mêmes gestes ; le trackpad change de vue dans les
> quatre sens, aussi dans le Totehm déplié). Centre : mon Totehm, [Higher]
> Strategy, le nom et la visibilité (Private par défaut ; abonnés → le
> programme). Haut : Get Higher sur la langue, le THP expliqué. Bas : TotehmSM,
> « Speak to your Higher Self », reflet à la première personne par un LLM
> (OpenAI, quota 30/jour), Telegram / WhatsApp ; réservé à l'abonnement
> Higher 7 €/mois (prix live `higher_month` à créer après le « oui » de Wah).
> Gauche : chercher + Subscribe. Droite : SPACE, la boutique, [Higher] sur le
> vêtement du moment. L'espace membre = l'utilisateur (vignette, Higher,
> souscriptions). figher.club : le THP en quatre pouvoirs, jamais
> « investment ». Migrations additives `higher_self` (×4) et
> `landing_cloth_spot` APPLIQUÉES : ne pas réappliquer. Aucun travail Oracle/n8n.

### Correction 0.42 — 06/10/2026 (ter) · toute la bouche, le style et le nom du Cloth, Decode perforé

> Sur totehm.com, c'est toute la bouche qui grandit (lèvres et langue, ×1,27),
> plus la langue seule ; le buvard garde sa taille. Sur higher.boutique, la
> totehmisation Luxury demande, comme Streetwear, le style artistique du moment
> (`artistic_styles`) et le nom du Totehm Cloth, `0.{Nom}` (0 = l'année de la
> collection, posé par le serveur) ; un nom ne sert qu'une fois, Streetwear et
> Luxury confondus, et une pièce Luxury payée se décode. [Decode a Totehm
> Cloth] : survol et saisie en boîte perforée navy. Migration additive
> `luxury_style_name` ; prix, paiement, webhook inchangés. Aucun travail Oracle/n8n.

### Correction 0.41 — 06/10/2026 (bis) · trois gestes, lire et copier, menu de la boutique

> En bas de l'atterrissage de totehm.com, les trois gestes du papier défilent :
> Tap it to open it · Put it on your tongue to Get Higher · Turn it over to
> search a member's TOTEHM ; chacun fait ce qu'il dit. Retourné, le papier
> ouvre une recherche vide d'un membre. Le Totehm d'un membre se parcourt en
> lecture (joystick en bas, spaces, loupe) et chaque Box se copie dans mon
> Totehm. Le menu membre de totehm.com prend le format du menu de
> higher.boutique (plein écran, centré, mêmes boutons). Sur higher.boutique,
> police un peu plus petite et boutons sur une ligne. Aucune migration, prix et
> droits inchangés. Aucun travail Oracle/n8n.

### Correction 0.40 — 06/10/2026 · loupe en place, My spaces sur SPACE, supprimer un space

> Chaque Box, sur les cinq vues de COM et dans SPACE, porte une petite loupe :
> un tap agrandit son contenu en place, jamais une fenêtre. SPACE a sa
> rubrique My spaces (tout l'historique de mes spaces publiés) ; on peut
> supprimer un space (COM, SPACE) : il disparaît partout, sa vidéo et ses
> fichiers sont effacés. Dans SPACE, le papier TOTEHM rapetisse et regrandit
> en glissant d'une vue à l'autre, et « Tap on your TOTEHM… » se lit (blanc,
> gras, boîte noire). Sur totehm.com, la langue est plus grande. Migration
> `20261006100000_space_delete.sql` APPLIQUÉE (`space_delete`) : ne pas
> réappliquer. Prix et droits inchangés. Aucun travail Oracle/n8n.

### Correction 0.39 — 05/10/2026 · totehm.com remis d'aplomb (REMPLACE 0.36 « découvrir, lire, copier »)

> Ce que l'agent ChatGPT avait posé le 05/10 sur totehm.com est retiré : le T
> du Totehm déplié revient ; les mini-boxes reprennent leur format et leur
> padding d'origine ; une Box s'ouvre EN PLACE, dans sa liste — plus aucune
> loupe ni fenêtre, sur les quatre domaines. Chercher un Totehm = taper un
> NOM : il s'ouvre en lecture seule (sans abonnement requis → sa page
> /@nom). Plus de modes, de filtres ni de copies (le serveur les garde, le
> front ne les appelle plus). Les spaces d'une Habit apparaissent dans sa
> boîte sur COM (trois au plus, état I WILL BE HERE / I AM HERE / I WAS
> THERE, droits de SPACE ; un tap ouvre le space sur SPACE). /@nom = le
> papier et le nom, ce qu'un abonné ouvre, le prix par an, une action ;
> s'abonner sans compte : email, code, puis paiement. La console = mon
> abonnement en trois étapes (prix · où me payer · l'ouvrir), qui lit mon
> Totehm, abonnés, gains, abonnements, TotehmBot, paiements — sans Reveal
> the Box. /monetize refaite dans la même grammaire. Migration
> `20261005200000_habit_spaces.sql` APPLIQUÉE (`habit_spaces`) : ne pas
> réappliquer. Prix et droits inchangés. Aucun travail Oracle/n8n.

## Le rapport

Un tableau : ce qui a été fait, la valeur mesurée, ce qui n'a pas pu l'être.

### Correction 0.36 — 04/10/2026 · la bouche raconte quatre temps

À reporter dans TOTEHM_MASTER.md §0 (REMPLACE 0.35 ; la place en haut et la porte au-dessus du papier de 0.34 restent) : à l'arrivée, la bouche tire la langue une fois ; puis elle est fermée, immobile (le dessin de Wah) ; le Totehm approché, elle s'ouvre et tire la langue ; posé dessus, le papier n'est plus qu'un buvard (36 % de la largeur de la langue) ; avalé, la bouche seule, sans la langue, bouge comme une femme qui jouit (3,6 s), puis [Get Higher]. Plus de transe au clic : un tap sur les lèvres rejoue la langue. Front seul : aucune migration, aucun travail Oracle/n8n.

### Correction 0.36 — 04/10/2026 · découvrir, lire, copier, pratiquer

> COM : recherche par nom avec accents/fautes/liens, abonnements, boxes accessibles (type/intention). Le résultat EST le TOTEHM natif à cinq vues, en read-only ; copies individuelles ou de vue, revue, import personnel avec provenance, déduplication et liens remappés entre boxes sélectionnées. Accès source actuel requis ; aucune copie de coordonnées/statistiques/historique. Noms publics seulement sans abonnement. Migration `search_and_box_import` appliquée (journal `20261003164312`), ne pas réappliquer. Modèle annuel créateur et 80/20 conservé. Aucun travail Oracle/n8n demandé ; reporter la vision dans le master.

### Correction 0.35 — 04/10/2026 · la bouche entrouverte, en transe au clic

À reporter dans TOTEHM_MASTER.md §0 (REMPLACE la partie « bouche fermée lisible, langue tirée au chargement » de 0.34 ; la place en haut et la porte au-dessus du papier restent) : la bouche garde le dessin de Wah sans changement ; au repos elle est entrouverte, la pointe de la langue sur la lèvre ; un clic la lance dans une transe sans fin (montée de plus en plus rapide, acmé, relâchement, et ça recommence) qu'un second clic arrête — prendre le papier l'arrête aussi. Plus rien ne bouge au chargement. Front seul : aucune migration, aucun travail Oracle/n8n.

### Correction 0.34 — 04/10/2026 · la bouche en haut, elle tire la langue

À reporter dans TOTEHM_MASTER.md §0 (complète 0.30) : sur l'atterrissage de totehm.com, la bouche passe EN HAUT et le Totehm plus bas (on monte le papier vers la langue) ; la porte d'inscription s'ouvre au-dessus du papier. Fermée, la bouche se lit enfin comme une bouche (deux lèvres, deux gris, commissures). À l'arrivée, elle s'ouvre, tire la langue et se referme, une seule fois par chargement (pas en mouvement réduit). Front seul : aucune migration, aucun travail Oracle/n8n.

### Correction 0.33 — 03/10/2026 · ce que veut le membre, vue par vue

À reporter dans TOTEHM_MASTER.md §0 : l'idée de SPACE = vivre une habitude hors de chez soi, la rendre agréable. Radar = rejoindre maintenant ; fil = rejoindre (JOIN) ou s'inspirer (GET INSPIRED) ; agenda = prévoir (GO, WATCH, CALENDAR, SHARE) ; TOP = annoncer ; BOTTOM = vivre, caméra éteinte jusqu'à VIDEO ou PHOTO. Un space porte une vidéo OU une photo. Sur un space partagé, l'auteur peut montrer le WHY (objectifs) et le TRIGGER (répulsions) de sa Habit : le format natif des partenariats de marque (mention de partenariat payé à prévoir). GO sans abonnement → SUBSCRIBE vers la page du créateur sur COM. Plus de fiche qui répète la boîte. Prix et droits inchangés.

### Correction 0.32 — 03/10/2026 · TOP = BOTTOM, vidéo future, LEFT filtré

À reporter dans TOTEHM_MASTER.md §0 : créer un space futur (TOP) = la Habit Box, puis une configuration noire et grise comme après une vidéo. Le lieu : une ville ET/OU le point sur la carte ; seul SHARED·ON (le point pour les abonnés) exige le point exact, PRIVATE et SHARED·OFF se contentent de la ville, sans demander la position. Une vidéo peut finir le parcours : depuis les fichiers (verticale, ≤ 33 s, ≤ 48 Mo) ou filmée par la caméra SPACE. LEFT : chaque space = Habit Box + bloc de données noir et gris ; un filtre à côté du papier (now/before · location on/off · silent/social), gratuit (navigateur). Prix et droits inchangés.

### Correction 0.31 — 03/10/2026 · espaces et identité Coral

À reporter dans TOTEHM_MASTER.md §0 : le space est une Habit vécue ou planifiée dans un lieu, privé ou partagé. COM My spaces retrouve l'historique propriétaire avec des liens SSO vers SPACE. Filmer demande un REC volontaire ; après la prise, formulaire noir transparent plein écran, DURATION, sans gestes parasites. SPACE conserve cinq vues/gestes/panneaux desktop, enlève les titres, rapproche le radar du joystick et agrandit le papier ; les côtés montrent le petit filtre seul. Détail à poignée descendante et joystick en sourdine ; GO respecte les droits exacts ON. Noms en Quantico Coral, noir arrondi en recherche/verso, plus de points/carrés ni T statiques centrés. Prix et droits d'abonnement inchangés.
