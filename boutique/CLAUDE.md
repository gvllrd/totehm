# boutique/CLAUDE.md — higher.boutique

> L'état ACTUEL et les pièges (≤ 60 lignes). Le sens d'un vêtement : `BRAND.md`. Un lot réécrit ces lignes, en place.

Des vêtements totehmisés : **n'importe quelle box** d'un membre, un style déterminé, produits par Printful.
**UN FEUILLETEUR, PLEIN ÉCRAN PAR PLEIN ÉCRAN** (02/11, Wah : « je veux du full screen par full screen, pas
d'entre-deux… un scrolling qui vire direct d'une section à une autre ») : `#stages` NE DÉFILE PAS (`overflow:hidden`),
`#stages-roll` se DÉPLACE d'une étape (`--roll`, 420 ms), et un geste — doigt, molette, trackpad, PageUp/Down — vaut UNE
étape, jamais une demie (verrou de 440 ms : une inertie de trackpad n'en tourne pas trois). Chaque étape vaut
EXACTEMENT la fenêtre (`height:100%` du rouleau, ni `dvh` qui tremble, ni `svh` trop court) et défile CHEZ ELLE si elle
déborde (une vue de huit box = 917 px sur 844) : le geste de page ne part qu'une fois son bord atteint. L'ORDRE est
**vêtement (+ taille) · style · box · nom · commande**, et `done` CLÔT le rouleau — il est dans `STAGES`, sinon `ouvrir()` ne l'ouvre jamais, le cas `fini` ferme tout le reste et le retour de Stripe (`?paid=1`) est un ÉCRAN NOIR sans erreur ; les étapes MÉRITÉES (`canShow` → `ouvrir()`) existent seules, et
un chevron (`.sc-hint`) invite à descendre s'il y a VRAIMENT quelque chose dessous. ⚠️ Le TOTEHM se décompose à la
première ARRIVÉE sur son étape (`arriver`), pas quand elle s'ouvre — depuis que le style passe devant, elle est méritée
bien avant qu'on la voie. ⚠️ **Le rouleau ne touche pas à l'historique** : UNE entrée remplacée ; le « back » du
navigateur QUITTE la page. ⚠️ Aucun focus automatique (le clavier rétrécit la fenêtre). Deux boutons, aucun ne dit
« suivant » : `#cl-go` (il connecte et vérifie le passeport) et `#od-go` (il paie). **Rien n'est simulé** : ORDER montre
la PHOTO. La DERNIÈRE étape est un RAPPEL : le nom dans le dos du Higher, la box dans sa couleur, la vignette du style,
le vêtement · la taille, le prix — et AUCUN reste (les pièces et le style se comptent dans LEURS sections).

**Le TOTEHM est la commande** : son logo — **les quatre calques de totehm.com copiés tels quels** (`#gl-bg` perforé,
`#gl-rail`, `#gl-t`, `#gl-wm`) — se décompose À SA PLACE : le FOND prend le dessus, le rail, le T et le mot FONDENT,
« MY GRIND » paraît, puis deux fonds glissent DEPUIS LUI : MY WISDOM STORY et MY VISION. Un tap sur MY GRIND empile
MY OBJECTIVES · MY HABITS · MY REPULSIONS dans son navy — les titres se LISENT (le padding cède, jamais le mot). Un tap
sur une vue donne ses boxes ; **une box tapée EST le choix** : elle s'ouvre presque entière — ses mini-boxes
(`my_box_matter`), le SON de son intention —, la liste se réduit à ELLE, et la retaper la rouvre. ⚠️ **UN SEUL TAP**
(02/11) : taper une des cinq vues pendant qu'une box est choisie DÉFAIT le choix et ouvre cette vue — on ne retape plus
la box d'abord. **TOUT PART ÉTEINT**
(26/10) : une mini-box assombrie (`button.mi`, jamais barrée) et, HORS de la box, posées DESSOUS (27/10), les PHOTOS de
son monde (`#shots`, `my_box_shots`) — SEULEMENT les images, trois par ligne : un media masqué par la perforation du
TOTEHM (grille de gauche de COM), un spot en rectangle à coins arrondis (vue de droite). Un tap LIE : la page envoie
`pick:{matter,shots}`, des RÉFÉRENCES, et le serveur relit `_box_matter` et `_box_shots` puis ne garde que ça — jamais
un texte ni un chemin reçu. Sept intentions = une COUTURE sous les papiers (UN seul `#tz-seam`). Scène NOIRE, les
papiers portent la couleur. **Le nom est un IDENTIFIANT** (minuscules, sans espace) écrit SUR LE DOS DU HIGHER — la
pièce elle-même (`#higher-dos` + `#hmask`, copiés de l'accueil), pas une bordure qui l'imite ; le serveur pose le `0.`.
⚠️ `tools/ecosystem_ui*` écrase la taille d'un bouton portant du texte — `#totehmize`, `#tz-papers`, `#matter`,
`#shots`, `#hb` en sont exemptés (dans les copies ET dans
`tools/`) ; plié, un papier n'a pas de prise (`pointer-events:none`), sinon celui de droite mange le tap du logo ;
`.pap{min-width:0}`, sinon un titre décentre.

| fichier | rôle |
|---|---|
| `index.html` | l'accueil : **le HIGHER est l'élément central** — UNE pièce, deux faces, QU'ON TOURNE À LA MAIN (doigt et souris) : le moteur `HI` est celui de `PAPIER` (com/totehm.html) COPIÉ avec ses mesures (0,72°/px, élan sur 100 ms, un QUART de tour change de face, jamais un tour entier ; posé, la face visible n'a AUCUNE transformation — `is-flat`/`is-back`). ⚠️ **UN SEUL `#hmask`** dans le document, hors des symboles : `#higher-slogan` et `#higher-dos` le référencent tous les deux, donc le dos a EXACTEMENT les perforations de la face (18 trous, 600 × 200) ; la `.hi-light` de chaque face est un rectangle masqué par lui, la lumière suit donc les trous. Posé sur son dos (à la main ou d'un tap) **c'est LUI qui grandit** : `#hb-bg` est `#higher-dos`, parti de la boîte du Higher (`--k`, `--dx/--dy`) jusqu'à couvrir — jamais le papier carré du Totehm (02/11, Wah : « les deux plateformes ont leur propre élément central »). Dedans, LE TABLEAU : trois onglets (MY TOTEHM STREETWEAR CLOTHS · MY TOTEHMIZATIONS · MY ACCOUNT, `my_boutique_board`) et, en tête, le PSEUDO — jamais une recherche ; MY TOTEHM, SIGN OUT et SIMPLE TERMS OF SALE sont des boutons gris, sans surlignage ; SIGN OUT appelle `ECO_AUTH.logout()` (jamais `signOut()` nu), sinon le rechargement repart en SSO silencieux et reconnecte au même compte. **[Decode a Totehm Cloth]**, au format de ses homologues, le retourne SUR PLACE et la recherche (`#decode-q`) s'écrit à son dos, le « 0. » posé ; le résultat paraît sous lui (`#dc-note`, `.dc-shots`). ⚠️ `nav{flex-direction:column}` ET centre ses enfants : `#hb-tabs` dit `row` et `stretch` à voix haute, et ses boutons sont les seuls de la page à revenir à la ligne ; `.fs-perf` (260) passe AU-DESSUS de `#hb` (240) ; un Enter dans `#decode-q` s'arrête là (`stopPropagation`) ; en écriture la pièce ne tourne plus (`HI.bloquer`, `.is-ecrit`). Puis Streetwear, Luxury. [Experience our dope branding] part sur totehm.space. Aucune illustration |
| `streetwear.html` | le vêtement ET sa taille · le style · la box (ou celle déjà choisie depuis COM, `?wear=<kind>:<ref>`, qui ne s'AFFICHE pas dans la section du vêtement) · le nom · le rappel |
| seau `totehm-cloth-support` | `<dossier>/` = les vues GÉNÉRALES · `<dossier>/print/` = la ZONE D'IMPRESSION (montrée à la commande). L'ordre vient des NOMS. Sans dossier : `image_url` (Printful, n8n F) |
| `luxury.html` | le Luxe, en plein écran comme streetwear : une PHOTO de la pièce (seau `luxury-pieces`, dossier du membre), le MÊME TOTEHM, un nom, puis **500 € pour déposer le projet** (`luxury_offer`, relu par `luxury-quote` ; remboursé si la pièce ne peut pas être travaillée) · HOW IT WORKS dit le métier : étude, préparation, peinture qui plie, tenue. Plus de manette : le parcours n'a plus de côtés. ⚠️ **NOIR ET GRIS** (27/10) : ce qui vient du TOTEHM garde son dessin EXACT (papiers perforés, box, mini-boxes, media perforé) ; tout ce que la boutique invente est du gris de figher.club (`--s2`, `--r`, le `.field` de `/create`) — la photo, le nom, une carte de devis (la couleur du Totehm n'y est qu'un rail de 3 px). Jamais de navy ailleurs |
| `terms_of_sale.html` | les conditions de vente |
| `art-bridge.html` | `/get_higher`, `/stoner`, `/market`… y sont réécrits : il consomme le code SSO de la boutique puis en émet un pour SPACE — c'est aussi là que revient l'achat du THP (`/stoner?checked=1`) |

## Le parcours d'une pièce

`draft` → **paid** (`stripe-webhook`, `cloth`) → **generating** (n8n B : sept concepts) → **curation** (Telegram ; n8n
C, `compose-artwork`) → **production** (n8n D) → **shipped** (n8n E) → l'œuvre visible (`cloth-art`).
- **L'œuvre ne porte QUE sa signature** (04/11, Wah : « juste le nom du TOTEHM cloth sous son fond perforé bleu navy. Point. ») : nom + `0.` d'epoch en Quantico coral sur la box navy perforée, CENTRÉE en bas, 200 px. Le logo posé en bas à gauche est retiré.
- **La curation est une MISSION payée** (03/11, Wah ; elle s'ubérise le jour où plusieurs curateurs travaillent) : bonjour, le GAIN annoncé (`GAIN_CURATEUR` = **20 €** par curation, en dur dans B et C ; « en même pas dix secondes »), et à la fin du choix une confirmation qui MONTRE l'œuvre composée — `compose-artwork` rend un aperçu léger (`preview_url`, JPEG 1400 px) à côté du PNG d'impression, trop lourd pour une messagerie. C'est le seul endroit où une pièce d'essai se vérifie à l'œil, l'artwork restant une surprise jusqu'à l'expédition. Tout en ANGLAIS. **Plus de REGEN** : sept images à chaque tap, trop cher.
- **La curation montre TOUTE la commande** (03/11, Wah) : un message d'ouverture — vêtement · taille · style, la VUE et le texte de la box, les intentions, la matière reliée, la palette, le compte des photos — puis les photos que le membre a ALLUMÉES, puis les sept concepts. ⚠️ Un ALBUM Telegram ne porte AUCUN bouton par image : chaque concept part SEUL, légendé « — N sur 7 — », son bouton `PRENDRE LA N` dessous ; le dernier message ne porte que REGEN. Un album rendait le choix aveugle.
- Le serveur pose le `0.` ; `create-checkout` v44 relit la box dans le Totehm de la session (une habit = son TEXTE).
- Une pièce de TEST (`boutique_testers`) suit le MÊME chemin jusqu'à l'œuvre composée puis s'arrête : `test_stop` ferme Printful et le suivi, `test_budget` limite à 3 générations par 7 jours, le stock reste intact. `streetwear-assets` ET `compose-artwork` ne lui ferment QUE le fichier d'impression (`purpose:'print'`) : la curation doit pouvoir signer ses sept concepts, sinon l'essai n'a pas lieu.
- n8n F tient `totehm_cloth_support` depuis Printful (les photos de Wah ne sont jamais écrasées) ; prix, stock, édition viennent d'un « oui » de Wah, posé par la session cloud. **Jamais un prix dans une page.**
- **Le BACKEND ecrit les concepts** (`streetwear-assets`, `action:'store'`, 03/11) : un Code node n8n ne peut PAS emettre d'octets bruts — tout `Buffer` ressort en `{"type":"Buffer","data":[...]}`, et les sept concepts etaient stockes en JSON deguise en `image/jpeg`, que Telegram telechargeait puis refusait. n8n envoie le base64 ; la fonction REFUSE ce qui ne commence pas par la signature JPEG `FF D8 FF`.
- **Les concepts sortent en JPEG 90** (03/11), pas en PNG : `gpt-image-2` rend des PNG de 9,85 à 12,02 Mo quand Telegram plafonne une photo à 5 Mo ; le même rendu pèse 0,43 Mo en JPEG. Le modèle `gpt-image-1` est refusé par `/v1/images/generations` tout en restant listé par `/v1/models`.
- **Une panne externe DIT pourquoi** (03/11, B et C) : `request()` joint le message du fournisseur au code HTTP (110 caractères, `streetwear_fail` tronque à 160). Sans lui, tout se résumait à `http_400`/`http_402`. ⚠️ D, E, F et T gardent l'ancien helper muet.
- **n8n B LIT les photos allumées** (26/10) : `box_snapshot.shots` → signées une heure → `gpt-4.1-mini` les regarde, et ce qu'il en dit entre dans le prompt comme MATIÈRE. Jamais une instruction, jamais chez Printful.

## Écarts connus

- **F tourne en production** (03/11) : un `product_updated` signé resynchronise le support — titre, description, 5 tailles, zone d'impression lue chez Printful (dtg · back · 1800 × 2400 px · 150 dpi) ; prix, stock et actif intacts, photo conservée, l'événement passe à `done`. Un appel non signé est refusé (401) sans rien écrire. Seul trou : `avg_fulfillment_days` reste nul, Printful ne renvoyant pas `avg_fulfillment_time` (avalé par un `catch` muet). B, C, D n'ont pas encore tourné ; elles lisent `$env` (11 clés, `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, `401` sans la clé de service) ; E reste sur l'ancien CONFIG et son brouillon accepte un événement non signé : `CLAUDE_CODE.md` §4. ⚠️ Les workflows ne gardaient AUCUNE exécution (`saveDataSuccessExecution: none`) : rien n'était observable. B, C, F et T journalisent maintenant ; à remettre à `none` la campagne finie. Banc : `offline.mjs` 62/62, 6 blocages connus.
- **L'essai visuel est OUVERT** (03/11) : endpoint de test `we_1UXQzu` vers `…/functions/v1/stripe-webhook` (l'ancien `we_1U0289` est désactivé), `STRIPE_TEST_SECRET_KEY` et `STRIPE_TEST_WEBHOOK_SECRET` posés dans les secrets Supabase. Contrôle T : `stripe_test_key` et `stripe_test_webhook` à vrai. Reste `telegram_shared_key_valid` à faux — il ne mesure PAS Telegram (connecté, `TG_TOKEN` bon sur la VM) mais `TELEGRAM_BOT_TOKEN` côté Supabase, que `streetwear-assets` ne retrouve pas ; sans effet sur la curation.
- **COM** : « + totehmize » n'est offert que sur MY STORY. Le lien `?wear=<kind>:<ref>` est prêt. **Une seule porte** : tout passe par `totehm.com/auth` (PKCE) ; connecté, le nom ramène à COM.
Tests : `tests/browser/` streetwear (85), luxury (27), boutique_home (40), com_cloths (16), art_bridge (24) ; `tests/sql/` streetwear_immersive, luxury, box_shots, boutique_board ; `tests/n8n/streetwear/offline.mjs`.
