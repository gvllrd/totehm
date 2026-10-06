# CLAUDE_CODE.md — la tâche de Claude Code (terminal de Wah)

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
