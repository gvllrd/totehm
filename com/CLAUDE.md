# com/CLAUDE.md — totehm.com : le Totehm, la carte, HigherSelf

## ⛔ COM · 05/10/2026 (Claude) — REMIS D'APLOMB : CE QUI FAIT FOI

Wah : « ChatGPT m'a enlevé le T.svg au déploiement, changé le format des
mini-box réglé au millimètre, agrandi leur padding ; la loupe ouvre une
fenêtre hideuse — remets le zoom d'avant ; la recherche et la souscription
sont hideuses, je ne comprends pas les réglages : je veux juste taper le nom
et ouvrir son Totehm en lecture seule ; la page de vente, tu peux mieux
faire ; la console est à chier (encore des Reveal the Box) ; lie SPACE à COM
par les spots dans les habits. » BUILD `2026-10-05-com-aplomb`
(`totehm.html`, `creator.html`, `console.html`, `monetize.html`).

| quoi | règle |
|---|---|
| bloc `ecosystem_ui` | RETIRÉ de toutes les pages de `com/` ; ne JAMAIS le recopier ici (il masquait le T, remplaçait `T_SVG`, imposait un padding aux mini-boxes, posait la loupe) |
| le T, les mini-boxes | `T_SVG` d'origine ; mini-boxes `3px 7px`, Quantico 11 px ; une Box s'ouvre EN PLACE dans sa liste, sans loupe ni fenêtre (idem sur les satellites) |
| lire un autre Totehm | `/totehm?ro=nom` : barre « Reading · nom · back to mine », rien d'éditable ; abonnement requis → `location.replace('/@nom')` ; inconnu / non connecté / privé = trois messages |
| chercher | `NameSearch` (copié dans `creator.html` pour `/search`) : un champ, des NOMS (`totehm_search`, 12), Entrée = le nom exact sinon le premier, `@nom` / lien collé nettoyés, vide = mes abonnements, une lettre = « two letters, minimum ». Plus de modes, filtres, pages ni copies |
| SPACE dans les habits | `habit_spaces(p_pseudo)` : fermée, la boîte dit « N spaces » ; ouverte, un groupe `spaces` (3 au plus : en cours, à venir, passés ; « spaces · 3 of N »), mini `.m-s` noir translucide = état + lieu/ville · date. Tap → SPACE `?spot=id` par le pont SSO ; « + a space » (le mien seulement) → `?v=plan`. Droits = ceux de SPACE (`_spot_view`) ; réponse tardive jetée (`HSPACES.seq`), vidé au changement de compte |
| `/@nom` | le papier navy et le nom Coral, ses intentions, ce qu'un abonné ouvre (la croix des cinq vues, le point d'un space ON), le prix PAR AN du serveur, UNE action : Open · Subscribe · Renews/Ends · This is your page (console, lien) · Not open yet. Subscribe sans compte : email + code ICI, puis le paiement part seul (`WANT`) ; retour Stripe : 8 × 1,5 s d'attente du webhook |
| `/console` | Mon abonnement en trois étapes qui disent si elles sont faites (prix · où me payer · l'ouvrir ; ouvrir = TOTEHM lisible par les abonnés) puis ma page, le lien, le post ; qui lit mon TOTEHM ; abonnés ; gains ; abonnements (arrêt fin d'année) + Find a TOTEHM → `/search` ; TotehmBot ; paiements. Reveal the Box parti (boutique) |
| `/monetize` | publique, ne lit rien pour un invité ; même grammaire que `/@nom` ; plus de promesse de copie |
| tests | `com_creator.mjs` 29 · `console.mjs` 18 · `com_paper.mjs` 39 · `com_mouth.mjs` 35 · `com_member_menu.mjs` 27 · `space_boxes_ecosystem.mjs` 22 · `spaces_ui.mjs --identity` 27 · `tests/sql/habit_spaces_selftest.sql` FAIL={} ; `com_discovery.mjs` supprimé |


## COM · 05/10/2026 — menu de l'écosystème et offre aux créateurs

> **⚠️ REMPLACÉ LE 05/10 (Claude), sauf le menu membre :** voir « REMIS D'APLOMB » en haut.

BUILD `2026-10-05-member-ecosystem` : `totehm.html`, `creator.html`,
`console.html`, `monetize.html`. `/monetize` présente publiquement la creator
economy aux influenceurs et aux membres : abonnement ANNUEL choisi par le
membre, split 80/20, TOTEHM partagé et lieux des spaces ON. Aucun prix créé,
aucune offre activée ni paiement lancé par cette page. `/@nom` reste la page
qui vend l'abonnement de CE membre ; `/console` gère l'offre et les abonnements.

Le menu COM reprend sept actions, dans cet ordre : Open my TOTEHM (Tap on
it), Search a TOTEHM (Turn it over ; My subscriptions reste un mode de
recherche), Get Higher (Put it on your tongue), Reflect with my TOTEHM
(Higher Self · TotehmBot → `/higherself`), My TOTEHM spaces (My TOTEHM,
right now, right here · in SPACE), Totehmize my cloth (HIGHER BOUTIQUE),
Monetize my TOTEHM ecosystem (`/monetize`). Lorsque `my_console().offer.enabled`
est vrai, la dernière action devient Manage my subscriptions (`/console`).
L'abonnement payé par le membre et le passeport FIGHER ne décident pas de ce
libellé. Réponse illisible → console, sans inventer un état. Ignorer les
réponses tardives après changement de compte.

Plus de My Club dans le menu. My TOTEHM spaces réutilise l'historique
propriétaire (lien direct `/totehm?spaces=1`) et ses accès SSO à SPACE.
Les liens Get Higher et Boutique passent par leur pont SSO respectif ;
le papier, la langue, les gestes et la recherche restent inchangés.
Boutons sombres ajustés au label ; indication sous le bouton, hors de son
fond. SIMPLE TERMS OF USE reste la dernière entrée. Sources COPIÉES :
`tools/com_member_menu.js` et `.css`, aucun import runtime.
Tests : `tests/browser/com_member_menu.mjs`, `com_paper.mjs`, `com_discovery.mjs`.


## COM · 05/10/2026 — loupes et connexion commune

> **⚠️ REMPLACÉ LE 05/10 (Claude), sauf le menu membre :** voir « REMIS D'APLOMB » en haut.

BUILD `2026-10-05-spaces-boxes`. Règles UI : racine `CLAUDE.md`.
Les cinq types de Box ont une loupe ; copie en lecture seule du contenu
visible, attributs configurés seulement, sans sélection/import/écriture.
Le lecteur d'un autre TOTEHM ne montre pas Set Time Frequency, Set Intention
ou No deadline si ces attributs ne sont pas renseignés. L'édition personnelle
conserve ses invitations de configuration. Aucun T.svg statique d'interface ;
le papier et ses coordonnées de morphing restent intacts. Auth email sur
COM uniquement ; CTA `CONNECT WITH MY TOTEHM`. My spaces conserve aussi
l'historique privé antérieur (les nouveaux spaces sont partagés).



## ÉTAT AU 04/10/2026 — RECHERCHE, LECTURE ET COPIES

> **⚠️ REMPLACÉ LE 05/10 (Claude), sauf le menu membre :** voir « REMIS D'APLOMB » en haut.

- BUILD `2026-10-04-search-boxes` dans `creator.html` (dans `totehm.html` jusqu'au lot bouche `2026-10-04c`, ci-dessous). Papier, bouche, déconstruction, joystick et cinq vues conservés.
- Un résultat ouvre `/totehm?ro=nom` : le vrai TOTEHM en lecture seule. Un hit de box ajoute `box_kind` / `box_key` et ouvre sa box native. L'offre inaccessible reste dans ce lecteur ; `/@nom` est le lien explicite de souscription.
- Recherche : Names (ordre exact, préfixe, contenu, noms similaires), My subscriptions, Boxes I can read. Noms tolérants aux accents, à la casse, aux fautes et aux liens `@nom` ; pagination. Boxes : mots littéraux, type, sept intentions ; aperçu de trois boxes maximum par TOTEHM, seulement si le compte a la lecture. Aucun pourcentage ni classement de personnes.
- Même contrôleur COPIÉ dans les deux pages COM indépendantes. Réponses invalidées dès la frappe et sur changement de compte ; purge des résultats déjà affichés à la déconnexion.
- Copy box / Copy this view → Review copies → Import into my TOTEHM. Sélection en mémoire seulement, maximum 50 ; dialogue hors de `#stage` avec fond inert, focus piégé et Échap. Les cinq types se copient ; pas de self-import. Lecture et sélection ne font aucune écriture sur la source.
- Import côté serveur : accès actuel revérifié, références uniquement, lot atomique, nouveaux identifiants chez auth.uid(), contenu existant réutilisé sans remplacement, liens entre endpoints sélectionnés remappés, retries idempotents. Provenance visible dans la box personnelle ouverte via `my_box_sources`. Pas de statistiques, coordonnées, historique ou IDs du créateur copiés.
- Migration `20261003155911_search_and_box_import.sql`, appliquée UNE FOIS sous `search_and_box_import`, journal `20261003164312`. Tests : `com_discovery.mjs` (50), `com_paper.mjs` (39), `com_mouth.mjs` (36), `spaces_ui.mjs` (57) et `totehm_discovery_selftest.sql` (annulation complète, FAIL={}). Mesures dans SYSTEM.md §0.

## ⛔ ÉTAT AU 04/10/2026 — LA BOUCHE : L'HISTOIRE EN QUATRE TEMPS

Wah, dernier mot du 04/10 : « on fait plus simple : le démarrage, tirage de
langue une fois, on ferme la bouche, on l'ouvre et on tire la langue quand
on approche le Totehm (à rétrécir encore), et on fait bouger simplement la
bouche, sans la langue, comme si une femme jouissait ». Remplace l'entrouverte
et la transe au clic du 04/10 (bis). `BUILD='2026-10-04c'`,
`tests/browser/com_mouth.mjs` 35/35, `com_paper.mjs` 39/39, `com_discovery.mjs` 50/50.

| temps | règle |
|---|---|
| 1 · l'arrivée | `BOUCHE.indice(1,1,650,fin)` : grande ouverte, langue tirée 650 ms, refermée — UNE fois par chargement. Pas en mouvement réduit, ni dedans (`#in`, `?ro=`), ni porte / recherche / geste déjà en cours ; un onglet caché attend d'être vu. `__totehm_lsd.accueil` 0 → 1 → 2 (2 = vraiment au repos : la suite attend les ressorts). Un tap sur les lèvres rejoue ce temps |
| 2 · le repos | FERMÉE, immobile, zéro rAF. Le dessin de Wah, ses gris au code près (`#m-lips` `#1f1f1f`, `#m-cav` `#111111`) ; le balisage porte la bouche fermée |
| 3 · l'approche | inchangé : elle s'ouvre, la langue se tire (`viser`). Le papier rapetisse davantage : `1,06 − 0,36·p^1,5` en approchant, un BUVARD sur la langue (`TAB` = 36 % de sa largeur, 44 px sur téléphone ; 60 % le 03/10) |
| 4 · avalé | la langue rentre avec lui, puis `BOUCHE.jouir(s)` conduit la bouche SEULE, la langue rentrée, 3,6 s : l'inspiration (0,5 s) · cinq halètements qui s'accélèrent (0,39 → 0,26 s, ouverte 0,70 → 0,85) · le « O » tenu, un frisson à 10 Hz (0,94) · le relâchement, fermée. « Get [Higher] » reste. Puis `surLangue()` → figher.club/get_higher. Mouvement réduit : tout de suite, sans animation. `__totehm_lsd.extase` |
| place | inchangée : bouche en haut (`top:max(52px,6dvh)`), papier à 60 %, porte d'inscription au-dessus du papier |

## ⛔ ÉTAT AU 03/10/2026 — QUANTICO CORAL ET MY SPACES

- BUILD `2026-10-03-spaces`. Préserver intégralement le papier recto/verso du 02/10 : posé au repos, glissé volontaire, zoom de recherche, déconstruction au tap.
- Noms de Totehm : Quantico Coral #fbd5ca, sans changement de teinte au survol. Verso et résultats des deux recherches : fond noir, coins arrondis ; saisie de recherche Coral sur noir. Accès membre sans point/carré.
- Retirer les T statiques centrés des espaces membres (`creator`), conserver le moteur de déconstruction et le logo du papier.
- My spaces dans le menu membre : dialogue propriétaire privé/partagé, présent/passé/futur, lecture `my_spaces`, pagination starts_at + id. Aucun autre compte comme argument. Métadonnées minimales ; détail et vidéo sur SPACE via `?spot=id`, pont SSO cible space conservé.
- Dialogue accessible au clavier, fermeture [CLOSE]/Échap vers le menu ; ignorer réponses tardives et purger les données sur changement de compte. Aucun ancien RPC `my_space` réactivé.
- `my_spaces` est défini par `backend/supabase/migrations/20261003105748_my_spaces.sql` ; lecture seule, auth.uid(), grants authenticated seulement. Tests `tests/sql/my_spaces_selftest.sql`, `tests/browser/spaces_ui.mjs` et `com_paper.mjs`.

> Chargé automatiquement quand on travaille dans `com/`. Les règles
> transverses sont dans le `CLAUDE.md` de la racine ; l'histoire dans
> `docs/POSTMORTEMS.md`. Sections déplacées TELLES QUELLES de l'ancien
> `CLAUDE.md` le 30/09/2026, les plus récentes d'abord : un renvoi « plus
> haut » peut viser la racine ou un autre dossier. Fichiers : `totehm.html` (le Totehm), `map.html`, `higherself.html`, `auth.html`, `creator.html`, `club/` (ponts).


## ⛔ ÉTAT AU 03/10/2026 — LA BOUCHE : LE PAPIER SUR LA LANGUE

> **⚠️ 04/10 :** la bouche est EN HAUT et raconte quatre temps (la langue à
> l'arrivée, fermée, ouverte à l'approche, elle jouit une fois l'avoir
> avalé) ; le papier devient un buvard sur la langue ; le Totehm plus bas,
> la porte au-dessus du papier — voir plus haut. Prendre, porter, avaler :
> inchangés.

**La demande de Wah :** « une bouche, fermée en bas du Totehm, ouverte
langue tirée comme sur le fichier joint ; un maintien du clic (appui
prolongé au téléphone) déplace le Totehm ; rapproché de la bouche, elle
s'ouvre et la langue se tire pour le recevoir ; il se réduit en se posant
sur la langue, « Get [Higher] » apparaît en haut à la place du Totehm au
repos ; relâché sur la langue, ça lance [Get Higher] — l'achat du
TotehmPaper. Une animation métaphorique du LSD paper posé sur la langue. »
`com/totehm.html` `BUILD='2026-10-03-spaces'` (avec identité et historique), test `tests/browser/com_mouth.mjs`
(29 mesures) ; `com_paper.mjs` inchangé (39/39).

| geste sur le papier | effet |
|---|---|
| tap | inchangé : recto → mon Totehm (ou la porte), verso → recherche |
| glissé AVANT 380 ms | inchangé : il se retourne |
| appui 380 ms SANS bouger | PRIS (`'pris'`) : il se soulève (×1,08), suit le doigt au pixel, penche dans le sens du geste ; la porte d'inscription s'efface |
| porté vers la bouche | à 70 % du chemin elle s'entrouvre, la langue suit ; au-dessus de la langue (`arme`) : il rapetisse à 60 % de la largeur de la langue, `#gate-get` (« Get » Quantico corail + badge `#higher-badge`) apparaît centré sur sa place de repos |
| lâché ailleurs | `'rentre'` : chez lui en 420 ms, bouche refermée ; on peut le reprendre au vol |
| lâché sur la langue | `'avale'` : posé au milieu de la langue (300 ms), un temps (220 ms), la langue rentre avec lui (600 ms, il s'efface en passant les lèvres), la bouche se ferme → `'parti'` → `ssoVersDomaine(sb,'club','https://www.figher.club/get_higher')` |

**La bouche (`BOUCHE`, `#gate-mouth`)** : deux nombres, `o` (mâchoire) et
`t` (langue). Quatre bords en suites de points, interpolés FERMÉE ↔
OUVERTE (le dessin de Wah, gris au code près : lèvres `#1f1f1f`, intérieur
`#111111`, dents `#3c3c3c`, langue `#2a2a2a`, raie `#232323`), lissés
Catmull-Rom → Bézier, réécrits en `d` (une transition CSS de `d` n'existe
pas sur Safari). La langue GLISSE (découpée sous la lèvre du haut,
`#m-clip`, devant la lèvre du bas, derrière les dents) : elle sort par sa
pointe, jamais plus que la bouche n'est ouverte. Le balisage porte la
bouche FERMÉE (le module attend le pont SSO). Ressorts éteints au repos ;
pendant qu'on avale, le papier la conduit (`forcer`) : une ligne de temps.
`ressort()` est désormais au niveau du module GATE : papier et bouche.

**⚠️ LE PAIEMENT RESTE UN CLIC SUR LA PAGE D'ACHAT.** La langue mène à
`figher.club/get_higher` (par le pont : un membre y arrive connecté),
jamais directement à Stripe : la renonciation au droit de rétractation
(`waiver`, exigée par `higher-checkout`) se donne en cliquant « Buy »,
pas par un geste sur un autre site. Un propriétaire du THP y trouve
[Get Higher] vers la méthode.

**⚠️ IL DÉPLACE LA SCÈNE, JAMAIS LA CARTE.** `#gate-asteroid` porte la
translation, la carte reste posée sur sa face (`aPlat`) ; `atterrir()`
remet d'abord un papier porté chez lui (`lacherTout`) : `enter()` part
toujours d'un papier à plat, `measure()` reste juste. `occupe()` = tout
mode autre que `'plat'`. Retour arrière (`pageshow` persisted) ou
navigation qui n'a pas lieu (12 s) : `remettre()`.

**Clavier / mouvement réduit** : `#gate-mouth` est un bouton (« Get
Higher ») ; Entrée y envoie le papier de lui-même (`offrir()`) ; en
mouvement réduit, aucun geste, la bouche mène tout droit à Get Higher. Un
tap sur les lèvres l'entrouvre (l'invitation), sans rien ouvrir. Paysage :
pas de bouche. Porte d'inscription ouverte ou Totehm déplié : bouche
retirée (`visibility`). Diagnostic `__totehm_lsd` : `pris`, `prises`,
`langue`, `avale`, `bouche`.

## ⛔ ÉTAT AU 02/10/2026 — LE PAPIER : ON LE RETOURNE, IL CHERCHE

**La demande de Wah, en trois messages :** « je veux le Totehm animé que tu
avais envoyé à ChatGPT, sauf qu'ici quand on le retourne ça lance
automatiquement la recherche, directement sur le fond bleu, comme si on
zoomait et que l'on changeait le nom » · « il ne faut pas qu'il tourne tout
seul, c'est à l'utilisateur de le retourner — il tourne automatiquement
avec le nom du membre sur Space » · « au début il est toujours en mode
recto, prêt à être déployé au clic ». `com/totehm.html` `BUILD='2026-10-02c'`,
test `tests/browser/com_paper.mjs` (39 mesures).

| | RECTO — mon Totehm | VERSO — le nom |
|---|---|---|
| au repos | posé, immobile, TOUJOURS au départ | jamais au repos sur l'atterrissage |
| on y arrive | au chargement, et après chaque recherche | en le retournant : la main (glissé horizontal), une pichenette, ou le mot du bas |
| l'action | un tap le déconstruit en Totehm déplié — **inchangé au pixel** (mesuré contre l'original, téléphone ET ordinateur) | AUTOMATIQUE : on zoome dans le dos, l'écran devient le papier navy perforé, le nom grandit et devient LA saisie (Quantico), déjà sélectionné : on le change, on trouve un autre Totehm |
| compte | exigé (porte d'inscription) | aucun (`totehm_search` est ouverte à `anon`) ; un invité lit « search a Totehm » au dos |
| sortie | croix `#fold-x`, Échap | croix `#srch-x`, Échap : dézoom sur le dos, puis le papier se remet sur son recto |

**Le moteur (`PAPIER`)** : `'plat'` (repos, zéro rAF) · `'tenu'` (le doigt
le tourne AU PIXEL, 0,72°/px, il se soulève et s'incline) · `'pose'`
(Hermite depuis l'angle ET la vitesse, soulèvement à mi-course quand il
part du repos). Le buvard du 28/09 (glisser, jeter, étirer) est parti : un
glissé sert désormais à le retourner. Ni rotation spontanée, ni suivi de
souris, ni gyroscope.

**⚠️ ON DÉCIDE PAR RAPPORT À LA FACE DE DÉPART, PAS PAR L'ANGLE PROJETÉ.**
Plus d'un quart de tour (90°–270°) = l'autre face ; une pichenette (≥ 30°,
≥ 350°/s, en s'éloignant) aussi ; presque un tour entier = la même face.
Mesuré à la souris : projeter l'angle avec l'élan faisait faire un tour
entier au papier et le reposait sur le recto. L'élan = la vitesse des 100
dernières ms lue au relâché (fenêtre, pas l'écart entre deux événements),
et l'élan ne peut ajouter qu'un tiers de demi-tour à l'atterrissage.

**⚠️ LE VERSO POSÉ N'EST PAS UN PAPIER À 180°** (`.is-back`) : la face
visible sans aucune transformation, le même invariant que le recto ; le
demi-tour n'existe que pendant qu'il tourne. **⚠️ LA RECHERCHE S'OUVRE
DANS LE GESTE** : `surVerso()` est appelé dans le `pointerup` (le clic pour
le mot du bas) et la saisie prend le focus là — iOS n'ouvre le clavier qu'à
cette condition ; la feuille est transparente (`.is-prep`) le temps que le
papier finisse de se poser, puis le zoom part d'EXACTEMENT le papier et de
son nom (mesurés à chaque fois, transformations retirées). **⚠️ UNE ÉCHELLE
UNIFORME** : le fond est un carré (`--s` = plus grand côté +20 %), sinon les
perforations s'étirent. **⚠️ `#gate` EST `inert`, PAS MASQUÉ** pendant la
recherche (le masquer révélait le Totehm derrière le papier qui grandit
dès qu'une minuterie glissait). La feuille est modale (Tab y tourne).
**⚠️ `sSeq`** : « wa » (lent) ne recouvre jamais « wah ». Un résultat = le
NOM d'un Totehm sur sa tuile perforée + son offre (`/ year`), jamais un
contenu. `paintAsteroid()` repeint le nom au dos (Quantico mesuré, deux
lignes puis 7,5 px). Diagnostic `__totehm_lsd` : `tenu`, `gestes`,
`retournements`, `face`, `recherche`, `resultats`.

**La console garde « Copy a post for my networks »** (`#post`) : la phrase
de Wah + le lien `/@nom`, aucun prix. `/monetize` présente l’offre aux influenceurs et à tous les
membres ; la page de vente de chacun reste `/@nom` (05/10).

## ⛔ ÉTAT AU 01/10/2026 — la console, deux réglages, l'abonnement annuel

**La console vit ICI : `com/console.html` (`/console`).** Elle vivait sur
`figher.club/console` (supprimé, 308 vers ici, la requête suit). Un appel,
`my_console()`. Dans l'ordre : qui voit mon TOTEHM (`visibility_set`) · mon
abonnement — un prix PAR AN, où me payer, ON/OFF (`monetization_set`,
`creator_payout_set`) et le lien `/@nom` · mes abonnés · mes abonnements
(arrêt en fin de période, `club-billing` · `cancel_creator`) et en trouver
un · ce qu'on me doit · TotehmBot (mensuel, à part) · mes paiements (portail
Stripe) · Reveal the Box. Connexion par email ICI (totehm.com est l'autorité).

**⚠️ DEUX RÉGLAGES, PAS TROIS.** `private` · `subscribers` (« VISIBLE TO MY
SUBSCRIBERS »). « Tout membre FIGHER lit » n'existe plus (en base, la valeur
reste écrite 'members' jusqu'au ménage : voir `backend/CLAUDE.md`). Allumer
l'offre rend le Totehm visible à ses abonnés ; l'éteindre ne change rien à
la visibilité. Repasser en PRIVATE ne résilie personne : la console dit
combien d'abonnés perdent la lecture.

**⚠️ LA VISIBILITÉ NE VOYAGE PLUS AVEC LES HABITUDES.** `cloudSave()`
(`com/totehm.html`) écrivait `totehm_visibility` à chaque enregistrement :
il aurait rouvert ou refermé un Totehm en douce. Il ne l'écrit plus ; une
seule porte, la console.

**La découverte publique ne révèle aucun contenu réservé.** `totehm_discover`
cherche les NOMS pour tous ; son mode boxes exige une session et la lecture
actuelle de chaque TOTEHM. `totehm_search` reste compatible (noms seulement).
`creator_page` expose l'identité et l'offre annuelle, jamais les boxes.
S'abonner exige seulement un compte, sans passeport FIGHER.

**Polices, tuile, menu (les quatre domaines, voir la racine).** Bebas Neue
et Jost/Futura sont partis de com (titres → Space Mono Bold capitales) ;
`.btn-sig` / `.line-input` sont gris — seul le NOM du Totehm (`#name-btn.claimed`,
`#set-name`) garde la tuile navy ; « Simple terms of use » est la dernière
entrée de la porte (invité) et de la fenêtre membre (`#terms-corner` parti).

### ⛔ LE PAPIER EST UN BUVARD — ON LE PREND, ON LE JETTE — 28/09/2026

> **⚠️ REMPLACÉ LE 02/10 :** on ne prend plus le papier pour le jeter, on le
> RETOURNE — et retourné, il cherche un autre Totehm. Voir « LE PAPIER : ON
> LE RETOURNE, IL CHERCHE » plus haut. Le tap qui le déploie est intact.

**La demande de Wah, verbatim :** « on abandonne totalement cette idée
d'hologramme. On fait plus vrai, plus organique : considère que le logo
(assemblé en 4 SVG) est comme un buvard de LSD posé à plat sur l'écran
tel qu'il est en version repos. Pour avoir cet effet 100 % organique
l'utilisateur doit pouvoir le manier de toutes les manières possible
comme un vrai buvard de LSD — le prendre, le jeter, le courber, le faire
glisser, l'étirer — dans les limites de l'écran, aussi bien à
l'ordinateur qu'au téléphone. » Elle **remplace en totalité** la Mission 1
de « ⛔ LE PAPIER LÉVITE SUR SON SOCLE » (27/09 → 28/09 quater) : le
socle, la plaque, le faisceau, l'électroaimant, toute leur CSS et tout
leur JS ont disparu de `com/totehm.html`. `BUILD='2026-09-28e'`.

**⚠️ AU REPOS, IMMOBILE — C'EST LE RENVERSEMENT.** L'ancien papier
tournait tout seul en permanence (18 s le tour, dérive d'apesanteur,
suivi de souris) : c'était un objet qui VIVAIT sans qu'on le touche.
Un buvard posé sur une table ne fait rien tant que personne n'y touche.
Le moteur (`PAPIER`, module GATE) ne tourne plus qu'à trois moments —
`'tenu'` (on le tient), `'vol'` (on l'a lâché, il file), `'pose'` (le tap
qui l'ouvre) — et reste éteint (`mode:'plat'`, l'ancien `.is-flat`) tout
le reste du temps : zéro calcul, zéro `requestAnimationFrame`.

**On le prend, on le fait glisser (`'tenu'`).** Le point de contact suit
le doigt ou la souris AU PIXEL, borné à l'écran (une marge garde toujours
un bord du papier atteignable) — pas de ressort sur la position : une
vraie prise ne traîne pas derrière la main. L'inclinaison, la torsion, la
courbure (un `skew`) et l'étirement (`scaleX`/`scaleY`, façon
« squash-and-stretch ») suivent, eux, par un ressort amorti-critique
nourri par la vitesse du geste et le point de prise — pris au bord, le
papier penche comme une vraie feuille tenue d'un coin ; tiré vite, il
s'étire et se tord un peu.

**On le jette (`'vol'`).** L'élan porte le papier hors de la main : il
glisse, tourne sur lui-même, l'étirement retombe — puis une attirance
légère vers le centre (LE MÊME ressort, cible zéro) freine sa course et
le ramène, en rebondissant doucement (×0,35) s'il touche un bord de
l'écran. Vitesse et amplitude sous le seuil → il se repose, EXACTEMENT
comme avant : identité exacte, `.is-flat`, prêt pour `measure()`.

**⚠️ UNE SEULE FONCTION FAIT LE RESSORT.** `ressort()` (amorti-critique)
est partagée par les neuf clés de la matrice (`rx,ry,rz,px,py,sc,sx,sy,
sk`) ; seuls `k,z` (raideur, amortissement) changent par clé — le spin
rebondit un peu, l'étirement est nerveux et bref, le déplacement est mou.
C'est le même mécanisme, pas neuf physiques différentes.

**⚠️ LA GARANTIE DU TAP-TO-OPEN N'A PAS BOUGÉ.** `poser()` part de la
position ET de la vitesse du moment (Hermite cubique, comme le 25/09) et
rejoint l'identité, à plat, vitesse nulle — depuis `'tenu'`, `'vol'` ou
déjà `'plat'`, peu importe où le geste a laissé le papier. Puis `aPlat()`
pose l'identité EXACTE : `measure()` lit toujours des calques non
transformés, et la déconstruction part inchangée, au pixel. **Vérifié :**
un tap PENDANT le vol (papier encore en mouvement, `diag.vol===true`)
déconstruit avec les mêmes écarts sub-pixel (`[0,-0.1,0,0.2]`) qu'un tap
depuis le repos.

**⚠️ ON NE JOUE PAS AVANT DE S'INSCRIRE, MAIS ON PEUT MANIER.** Mission 2
n'a pas changé : un tap SANS glisser ouvre la porte si l'on n'est pas
inscrit. Mais prendre, glisser et jeter le papier restent libres pour un
invité — c'est un objet physique sur l'écran, pas une fonctionnalité du
compte. La porte s'ouvre au moment de l'ouvrir, pas au moment d'y jouer.

**⚠️ LA GYROSCOPIE ET LE SUIVI DE SOURIS SONT PARTIS AVEC LE SOCLE.**
L'ancien papier tournait vers le curseur et vers l'inclinaison du
téléphone (avec toute la danse de permission iOS que ça demandait) —
c'était la grammaire de l'ancien objet « suspendu ». Un buvard sur une
table ne regarde pas qui s'approche : zéro `deviceorientation`, zéro
`requestPermission()`, zéro écouteur `mousemove`. Ce qui en reste :
`touch-action:none` sur `#gate-asteroid`, et Pointer Events pour le
doigt comme pour la souris, un seul chemin pour les deux.

**Mouvement réduit : aucun geste n'est écouté**, le papier reste plat et
immobile — seul le tap (`#gate-enter`, au clavier aussi) l'ouvre.
Diagnostic : `__totehm_lsd` → `{tenu, vol, jets, reduit}` — des booléens
et un compteur, jamais une valeur.

**⚠️ PLUS DE BEBAS NEUE DANS LE TOTEHM.** Wah : « dans le TOTEHM, je ne
veux pas de Bebas Neue, juste du Space Mono et le Quantico. » Exception
posée dans `com/totehm.html` à la doctrine générale de police (§ « LA
STACK POLICE » plus bas, qui reste la règle sur `totehm.space` et
`figher.club`) : le titre de vue (`#vnow b`), le chiffre de classement
qui se saisit (`.rk-n`, Quantico — c'est une prise, la police de
l'action), le label « PRIVATE » d'un Trip (`.tv-private`), l'accroche du
tiroir de monétisation (`.cv-hook`, Quantico) et la question de la porte
d'inscription (`.door-q`) sont repassés en Space Mono ou Quantico selon
leur rôle. `.wm-totehm` (jamais appliquée) est supprimée.

**`totehm.space` reçoit ce même logo, réduit, sans hologramme.** En haut
du cockpit (`#space-mark`, 48 px contre 110 sur `com`), immobile, avec le
nom du membre dessous (`F.pseudo`, même passeport que `#member-txt` —
peint une seule fois, par `paintMember()`). Touché, il ouvre CE Totehm
sur `com` par le pont SSO (`data-go="com"`, même mécanisme que
`.tname.big` dans le tiroir membre) — inerte pour un invité, qui n'a rien
à ouvrir. L'assemblage 4 SVG est COPIÉ de `com/totehm.html`
(« produits indépendants = fichiers indépendants ») : si `com` change son
logo, `space` doit être recopié.

### ⛔ LE PAPIER LÉVITE SUR SON SOCLE — ET RIEN NE S'OUVRE SANS ÊTRE INSCRIT — 27/09/2026

> **⚠️ LE TITRE EST DÉPASSÉ LE 28/09 POUR SA MOITIÉ.** Le papier ne
> lévite plus sur rien : voir « ⛔ LE PAPIER EST UN BUVARD » plus haut.
> Seule Mission 2 (pas inscrit, rien n'est permis) reste la vérité de ce
> titre.

**La demande de Wah, en deux missions :** « un socle à lévitation
électromagnétique ultra-épuré ; le Totehm remonté, qui donne l'illusion
d'un hologramme suspendu, sans lumières flashy ni fioritures — une œuvre
d'art qu'on a envie de toucher et d'ouvrir » ; et « pas inscrit, rien
n'est permis. Point. » Tout est dans `com/totehm.html`
(`BUILD='2026-09-27'`).

#### Mission 1 — le socle

> **⚠️ ABANDONNÉ LE 28/09 — PLUS DE SOCLE, PLUS D'HOLOGRAMME.** Wah :
> « on abandonne totalement cette idée d'hologramme. On fait plus vrai,
> plus organique : le logo est comme un buvard de LSD posé à plat sur
> l'écran tel qu'il est en version repos. » Tout ce qui suivait
> (28/09 → 28/09 quater : le socle, la plaque, le faisceau, les
> subtilités de lévitation) a disparu — `#gate-socle`, `#socle-beam` et
> tout ce qui les peignait sont supprimés de `com/totehm.html`, HTML,
> CSS et JS. **Voir « ⛔ LE PAPIER EST UN BUVARD » plus haut** pour ce qui
> remplace Mission 1. Mission 2, ci-dessous, n'a pas bougé.

#### Mission 2 — pas inscrit, rien n'est permis

**Inscrit = un compte ET le nom de son Totehm** (`inscrit()`). Rien
d'autre n'ouvre.

**⚠️ `enter()` EST LE VERROU, PAS LE BOUTON.** Le tap, le clavier, un
`#in` dans l'URL, un `?ro=`, `__totehmDeplie` : tout passe par `enter()`,
et sans inscription `enter()` ouvre **LA PORTE** (`#gate-door`) sous le
socle. Un verrou posé sur un seul bouton se contourne par les quatre
autres chemins.

**La porte pose une question à la fois** (Bebas Neue) : « Sign up to open
it » (l'email) → « The code from your email » → « Name your Totehm » →
le papier s'ouvre DE LUI-MÊME, 420 ms après le fondu de la porte. On
s'inscrivait pour ça : on ne retouche pas le papier une deuxième fois.
Un membre qui revient : email → code → ouvert. Un tap à côté ou Échap la
referme ; le papier continue de vivre.

**Ce qui est parti — le mode invité entier :** les trois habitudes de
démonstration, l'écriture locale sans compte, `loadState`, `pload`,
`KEYP`, `profile`, `migrateLocalToCloudIfNeeded`, `requireMember`, la
fenêtre membre qui demandait l'email sur quatre vues sur cinq (on
écrivait ses habitudes, puis on tombait sur une porte en passant aux
objectifs), et « Guest » dans le coin membre : le coin n'existe plus que
pour un inscrit (`body.member`).

**`#mw-out-state` et `#mw-claim-state` sont les MÊMES nœuds**, déplacés de
la fenêtre membre dans la porte — mêmes écouteurs, pas des copies.

**⚠️ LE CACHE LOCAL APPARTIENT À UN COMPTE.** `totehm_habits_v1` porte son
`uid`, n'est relu que par ce compte, s'efface à la déconnexion — et quand
un AUTRE compte le trouve. Les clés de l'époque invité
(`totehm_profile_v1`, `totehm_grind_v5`, `totehm_events`, un cache sans
`uid`) sont purgées à l'arrivée. Raison, et c'était une fuite : sur un
appareil partagé, un cache sans maître survivait à la déconnexion, et le
suivant qui s'inscrivait héritait du Totehm du précédent (la migration
du local vers le nuage le recopiait chez lui). `map.html` lit encore
`habits` dans ce cache : le champ est gardé.

**⚠️ LA SESSION A UN SEUL CHEMIN : `sessionChange()`** — arrivée, code
vérifié, nom réclamé, déconnexion, jeton expiré. Il y en avait deux, qui
chargeaient chacun de leur côté. Le compteur `sesSeq` jette la réponse
d'un appel dépassé. **Changer de compte, c'est d'abord VIDER**
(`quitter()`) : l'état, l'arbre, le cache et le tiroir du précédent
partent avant de charger quoi que ce soit.

**⚠️ LA GARDE.** Session perdue pendant que le Totehm est ouvert : il se
replie, et la porte s'ouvre.

**⚠️ LA QUESTION CHANGE, LE CURSEUR SUIT** (`champPorte()`, une seule
table pour le titre et le champ). Le code vérifié, son champ disparaît et
emporte le focus : mesuré, on tapait son nom dans le vide. Au téléphone,
c'est aussi ce qui garde le clavier ouvert d'une question à l'autre — le
nom prend le focus AVANT que le code se cache.

Téléphone couché : pas de porte, « turn your phone upright » — le Totehm
ne s'ouvre pas à l'horizontale, on ne s'inscrit pas devant un papier qui
ne s'ouvrira pas. Et le dialogue iOS du capteur n'est jamais demandé par
un geste dans la porte.

### ⛔ L'ATTERRISSAGE DE TOTEHM.COM EST UN PAPIER — 25/09/2026

> **⚠️ COMPLÉTÉ LE 27/09** — voir **LE PAPIER LÉVITE SUR SON SOCLE**. Le
> papier n'est plus au centre : il flotte dans le haut de l'écran,
> au-dessus d'un socle. Un tap sans inscription n'ouvre plus rien : il
> ouvre la porte. Le moteur, la pose à plat et la déconstruction
> ci-dessous restent vrais, au dixième de pixel.

**Un seul objet** sur l'atterrissage de `com/totehm.html` : un petit
carré de papier perforé (110 px, `--gate-size`), **deux faces**, en
apesanteur au centre de l'écran. **Devant : le logo** — les quatre
calques SVG de `#gate-logo`, ceux-là mêmes qui se déconstruisent en
Totehm déplié. **Derrière : « Tap to open it »**, ou le **nom du Totehm**
du membre connecté — Quantico 10 px, gris, discret. L'idée de Wah : toute
la stratégie d'une vie tient dans ce morceau de papier, et il doit se
lire comme un objet vrai.

**⚠️ LE TOTEHM DÉPLIÉ NE BOUGE PAS, NI SA DÉCONSTRUCTION.** Le 24/09 le
logo avait été caché hors écran pour faire tourner une carte vide : la
déconstruction continuait, invisible, et on entrait dans le noir. C'était
l'erreur. Les calques SONT la face avant du papier. Au tap, le papier se
**pose** face logo, à plat, puis `enter()` joue sa séquence d'origine,
ligne pour ligne (`measure()`, `.entered`, `DUR + REVEAL + 120`). Mesuré :
chaque calque arrive sur sa pièce du Totehm au dixième de pixel, comme
avant, quel que soit l'angle du papier au moment du tap.

**⚠️ ON NE MESURE JAMAIS UN PAPIER INCLINÉ.** `measure()` lit des
rectangles APRÈS transformation. `PAPIER.poser()` part de la position ET
de la vitesse du moment (Hermite cubique, 0,3 à 0,78 s selon le chemin),
arrive face logo à vitesse nulle, puis `aPlat()` pose l'identité EXACTE :
`transform` vide, `.is-flat` (les deux faces dans le même plan, la
lumière retirée). Seulement là, `enter()` continue.

**Le moteur (`PAPIER`, module GATE) — une seule matrice par frame :**

| ce qu'il fait | comment |
|---|---|
| il tourne | ~18 s le tour, lent face au regard, vif sur la tranche |
| il flotte | trois sinus de périodes premières entre elles — jamais la même boucle |
| il suit | souris (il regarde le curseur, ±15°/±20°, glisse de 7 px) ou téléphone (±16°/±20°), par RESSORT légèrement sous-amorti |
| on le tient | appuyer l'enfonce (0,965) et le retient ; glisser le fait tourner ; lâcher lui laisse l'élan |
| il prend la lumière | voile par face selon sa normale face à une lumière d'en haut à gauche — nul à plat. Pas une ombre portée. |

**⚠️ UNE ANIMATION CSS ÉCRASE LE `transform` DE SON ÉLÉMENT.** C'est pour
ça que tout passe par le JS : rotation, capteur, dérive et doigt doivent
se composer, et se poser ENSEMBLE face logo. Le moteur ne tourne que sur
l'atterrissage au repos ; posé (Totehm ouvert, mouvement réduit), il
s'arrête et ne coûte plus rien. Au repli, il repart de l'arrêt quand le
logo est revenu (`fold()` → `PAPIER.reveiller()`).

**⚠️ UN GLISSÉ N'EST PAS UN TAP.** Au-delà de 7 px, le geste fait tourner
le papier et le clic qui suit est avalé (écouteur en capture sur la
scène). Au clavier, `#gate-enter` reste le vrai bouton, sur la face.

**⚠️ iOS : `requestPermission()` DANS `touchend` OU `click`, jamais
`touchstart`** — Safari ne le compte pas comme un geste, la demande
serait refusée sans dialogue. **Et jamais dans le tap qui ouvre le
Totehm** : le dialogue tomberait par-dessus le déploiement. Il vient au
premier autre geste sur l'atterrissage — un glissé sur le papier, ou le
retour par la croix. Le zéro du capteur est la main du membre (première
mesure, qui suit lentement), pas l'horizon.

**Quantico au dos** : c'est la place du NOM du Totehm, et le nom s'écrit
en Quantico (BRAND, « sacré ») ; « Tap to open it » n'est que cette place
encore vide. Quantico n'a pas une chasse fixe : `paintAsteroid()` MESURE,
passe le nom sur deux lignes (coupé au séparateur le plus proche du
milieu) puis rapetisse jusqu'à 7,5 px s'il le faut.

Mouvement réduit : le papier reste posé, face logo. Diagnostic :
`__totehm_lsd` (vivant · gyro · permission · souris · lancers · réduit),
repris dans `__totehmDiag().asteroide`.

### ⛔ UNE RÉPULSION SE CRÉE COMME LES QUATRE AUTRES — 16/09/2026

**C'est la cause de « on ne peut pas ajouter correctement des
répulsions ».**

On créait une ligne fantôme (`id:'new'`, `brouillon:true`) et on ouvrait
le lookup d'habitude AVANT le texte, en comptant sur `repulsion_set` pour
la faire exister au premier lien. Or `repulsion_set` **lève sur un texte
vide** — et à cet instant le texte est toujours vide. L'erreur partait
dans la console, la boîte restait à l'écran, et rien n'existait en base.

`repulsion_set` fait AUSSI autre chose : elle **retire** l'ancienne
répulsion du même obstacle. Utile pour le bot, fatal pour une création —
la deuxième répulsion vide désactiverait la première. Et appelée à chaque
frappe pour renommer, elle empilait une ligne morte par lettre tapée.

D'où deux verbes dédiés, `repulsion_create` et `repulsion_rename`, qui ne
font que ce que leur nom dit. `repulsion_set` garde sa sémantique pour le
bot et n'est plus appelée par la page.

**La règle : les cinq objets se créent de la même façon** — une ligne
vide en base, puis on écrit dedans. Le brouillon n'existe plus. Un objet
qui a besoin d'un rite de naissance particulier est un objet dont on aura
oublié le rite six semaines plus tard.

### ⛔ LES DEUX JUMEAUX SONT RENTRÉS — 16/09/2026

**`wisdom.html` et `vision.html` N'EXISTENT PLUS.** Ce sont deux VUES de
`com/totehm.html`, au même titre que les habitudes, les objectifs et les
répulsions. `tools/jumeau.py` n'a plus rien à dériver et s'arrête en le
disant.

**Pourquoi on les a fusionnés.** Deux copies de 280 ko pour afficher une
liste de plus. Chaque copie embarquait son `createClient`, sa
vérification de session, ses SVG de logo — et surtout **sa propre
session de navigation** : ouvrir sa sagesse voulait dire quitter le
document, donc perdre la boîte ouverte, le filtre, le classement en
cours. Trois bugs signalés sur ces deux fichiers venaient tous de là, et
aucun n'était un bug de code : c'était l'architecture qui les produisait.

**Ce qui reste vrai de l'ancienne doctrine** : le PAPIER de ces deux vues
change (rouge-violet #5b2652, bleu clair #2b3a73) alors qu'il ne change
pas entre les trois couches d'une même journée. Ce n'est pas une
exception arbitraire : ces deux vues sont un AILLEURS DANS LE TEMPS, et
Wah les reconnaît à leur fond. ⚠️ **Il faut le poser DEUX FOIS** : sur
`body` (au téléphone, le corps EST le papier) et sur l'image perforée de
`#stage` (sur ordinateur, le corps est noir et c'est le carré qu'on
voit). Mesuré le 16/09 : un seul des deux et le fond ne changeait que
sur un écran.

### LA CROIX — CINQ OBJETS, DEUX AXES — 16/09/2026

```
                      MY OBJECTIVES
                            |
      MY WISDOM  ---   MY HABITS   ---   MY VISION
      (past)           (present)         (future)
                            |
                      MY REPULSIONS
```

**L'horizontale est le TEMPS. La verticale est la PROFONDEUR** — ce qui
tire l'habitude vers le haut (l'objectif), ce qui la tire vers le bas (la
répulsion). Les deux axes ne veulent pas dire la même chose, et la croix
le dit sans une phrase d'explication. C'est pour ça qu'elle remplace la
rangée de trois.

**Une seule table décrit la navigation** : `CROIX` dans `totehm.html`.
Le doigt, le trackpad, les quatre flèches et les cinq carrés la lisent
tous. Deux tables finiraient par dire deux choses différentes — c'est
déjà arrivé avec `VIEW_ORDER`.

**⚠️ LE VERTICAL SE PREND AU BOUT DE LA LISTE, jamais au milieu.** Un
geste vertical libre entre en concurrence avec le défilement — c'est ce
qui avait « buggé le filtre » et fait retirer le vertical la première
fois. Il ne part QUE lorsque la liste ne peut plus défiler : arrivé en
bas, continuer descend sur les répulsions ; en haut, tirer remonte sur
les objectifs. Un délai de garde de 700 ms empêche l'inertie d'une
molette de traverser deux vues.

**⚠️ UN SEUL CHIFFRE POUR LA BANDE HAUTE : `--croix-t`.** Il y en avait
trois à tenir d'accord par écran (le haut des carrés, le haut de la bande
de classement, `--band-t`). La croix est plus haute que la rangée, et au
téléphone son dernier intitulé est passé SOUS la première boîte — parce
qu'un des trois avait bougé et pas les autres. Les deux autres en
découlent maintenant : `+82` pour la bande de classement, `+100` pour la
première boîte.

### ⛔ TOTEHMBOT — CE QU'ON NE DIRA PAS SUR LA PAGE DE VENTE — 21/09/2026

Wah a demandé « des arguments scientifiques qui montrent les effets
positifs de la programmation neurolinguistique ». **Vérifié avant
d'écrire, et la réponse est non.**

La revue systématique de référence (Sturt et al., *British Journal of
General Practice*, 2012) a trouvé **dix études exploitables**, dont
**quatre essais randomisés sur cinq sans différence significative**, et
conclut qu'il y a *« peu de preuves que les interventions de PNL améliorent
les résultats de santé »*. Écrire « prouvé scientifiquement » à côté du mot
PNL serait faux — et faux sur une page de vente, c'est un risque juridique
en plus d'un risque de marque.

**On n'en a pas besoin.** Les mécanismes que TotehmBot utilise RÉELLEMENT
sont parmi les mieux établis de la psychologie de l'action, et ils disent
quelque chose de plus fort que « la PNL marche » — ils disent pourquoi
CE produit-ci marche :

| mécanisme | ce que ça vaut | où c'est déjà dans le Totehm |
|---|---|---|
| **Implementation intentions** — « à 07:00, au parc en bas, je fais X » | 94 tests indépendants, **d = 0,65** (Gollwitzer & Sheeran, 2006) | la Time Frequency **et le Spot** d'une habitude |
| **Self-talk distancié** — le pronom qu'on s'applique change la performance | 7 expériences, N = 585 (Kross et al., 2014, *JPSP*) | la voix du bot |
| **La répulsion citée au moment de l'excuse** | ses propres mots, écrits un jour plus clair | la vue répulsions |

**⚠️ ET LE DEUXIÈME CONTREDIT UNE RÈGLE DU PRODUIT.** Kross mesure que le
NON-première-personne (« tu », le prénom) bat le « je » pour se réguler
**sous pression**. Or la règle de Wah est « exclusivement à la première
personne ». Les deux ont raison sur des moments différents : le « je »
fait l'IDENTITÉ (c'est ma voix, c'est mon Totehm), le « tu » fait la
RÉGULATION (le moment de l'excuse). La synthèse retenue — **« je » pour
les directives, le prénom pour la boucle de correction** — est à mesurer,
pas à décréter.

**⚠️ LA PAGE A MAIGRI DE MOITIÉ · 21/09 bis.** « Trop longue : plus
minimaliste, percutant, un brin mystérieux. » Trois blocs de mécanisme
avec leurs citations, c'était un article de blog. Mesuré : 2 806 px de
haut. Il reste **une conversation Telegram, une phrase qui dit ce qu'on
fait, une ligne de preuve, le prix** — 1 738 px.

Et le bloc « what we don't claim » est parti avec : **la page ne prononce
plus le mot « PNL » du tout**, donc elle n'a plus rien à démentir. C'est
plus court ET plus honnête — on ne se défend pas d'une accusation qu'on
ne porte pas. La seule preuve gardée est celle des implementation
intentions (94 tests, d = 0,65), parce qu'elle décrit exactement ce que
le Totehm stocke déjà : une heure, un lieu, un geste.

**Le format des exemples est celui d'une messagerie** — mais en blocs
CARRÉS : la marque interdit le `border-radius`, et des blocs pleins posés
les uns sur les autres sont déjà sa grammaire. On lit « Telegram » sans
trahir le Totehm.

**⚠️ LA PORTE EST RESSORTIE DU TOTEHM · 22/09/2026.** « Tu peux enlever
le [My Higher Self] dans le Totehm version déployée. » J'en avais fait
la seule exception à l'immersion du 19/09, au motif qu'elle mène au
miroir de ce qu'on écrit et non dehors. Wah tranche l'inverse, et
l'immersion redevient **sans exception** : dans le Totehm déplié, rien
qui en sorte. `#door-bot` est supprimé — balisage ET câblage, dans le
même geste : retirer un nœud en laissant son `.onclick` lève à
l'évaluation du module, donc page blanche. La porte vit sur
l'atterrissage seule, avec les deux autres (`#door-next` dans
`#bottom-doors`), et c'est elle qui porte désormais
`totehmbot_access()`.

**⚠️ DEUX VERROUS, ET LE SERVEUR REND UN SEUL BOOLÉEN.**
`totehmbot_access()` → `ouvert` = membre du Club **ET** Totehm complet.
Le second n'est pas commercial : un miroir sans rien à refléter ne renvoie
rien. Et un membre qui paie, Totehm à trous, ne lit pas « tu n'as pas
accès » — il est emmené à la première vue vide.

### ⛔ QUATRE COINS, QUATRE OBJETS — 20/09/2026

**Deuxième tentative d'écarter le joystick de la croix, deuxième
chevauchement mesuré (27 px).** La cause est structurelle : `#fold-x` se
résout sur `#stage` (qui porte un `transform`, donc contient ses
descendants `fixed`) et `#joy` se résout sur la FENÊTRE, parce que dedans
il serait rogné. **Deux repères différents pour le même coin : aucune
arithmétique ne les tiendra d'accord à toutes les tailles d'écran.**

J'ai essayé deux fois. La troisième n'est pas un réglage, c'est une
règle :

| coin | objet |
|---|---|
| haut-gauche | le T |
| haut-droite | la croix |
| bas-gauche | le wordmark |
| bas-droite | le contrôleur |

Le wordmark ayant libéré le bas-droit en passant à gauche, il n'y a plus
rien à calculer — et rien à re-mesurer au prochain changement de largeur.

**⚠️ ET LE BOUTON DE CLASSEMENT DÉBORDAIT DE L'ÉCRAN.** Mesuré : centré
sur le rail avec 14 px de marge, son bord gauche tombait à **x = −14** au
téléphone. Un quart de la zone de clic hors de l'écran, et le reste qui
venait toucher le T (« le T.svg colle l'icône bouton classement »). Il
s'aligne sur le bord GAUCHE du rail et n'étend sa zone de clic que vers la
droite — là où il y a de la place.

### ⛔ UNE INTENTION A SON SON — 20/09/2026

**Le son appartient à l'INTENTION, pas à l'habitude.** Deux habitudes en
`focus` entendent la même chose : c'est le propre d'une intention. La clé
est donc `(user_id, intention)`, et l'écran le DIT — sinon on croit régler
la musique de cette habitude-là et on change celle de toutes les autres
sans le savoir.

**⚠️ LA TABLE EXISTAIT DÉJÀ** (`intention_music`, un actif par intention,
historique conservé). On n'en a pas créé une deuxième : le TYPE va dans
`title`, le lien dans `url`.

**⚠️ MAIS `set_music` EXIGEAIT UNE URL.** Or « hard techno, 140 bpm » est
une réponse complète. Le lien devient facultatif et c'est le TYPE qui
devient obligatoire — l'inverse de l'ancienne fonction, qui reste en place
pour ce qui l'appelle déjà.

**⚠️ LES DEUX CHAMPS PARTENT ENSEMBLE.** La fonction en base remplace la
ligne active : envoyer le type seul effacerait le lien posé trois secondes
plus tôt. Et on ne redessine PAS après l'envoi — `renderZone()`
reconstruit les champs, donc vole le curseur au milieu d'une saisie.

**⚠️ ET PERSONNE N'APPUIE SUR ENTRÉE DANS LE DEUXIÈME CHAMP.** `focusout`
(qui remonte, contrairement à `blur`) rattrape la saisie de celui qui tape
le type, colle le lien, et referme.

### ⛔ ÉCHAP REPLIE LE TOTEHM, IL NE FERME PAS UNE BOÎTE — 20/09/2026

Noté parce que ça m'a coûté deux passes de test : `Échap` est le **même
geste que la croix `#fold-x`** — il ramène à l'atterrissage. Pour fermer
une BOÎTE, c'est sa propre croix (`data-x`).

Et le corollaire, qui est un bon comportement, pas un bug : **les flèches
DANS un champ de texte déplacent le curseur, elles ne changent pas de
vue.** Un test qui navigue doit refermer la boîte d'abord.

### ⛔ LE TIROIR DU CERCLE — 19/09/2026

**« Visible to my paying followers » ouvre un tiroir SOUS lui.** Pas un
onglet, pas une page, pas une redirection : un dépliant en place. *Un
créateur qui découvre qu'il peut être payé ne doit pas changer d'écran
pour le croire.*

**Deux états, et un seul décide : le Totehm.**

- **Totehm incomplet** → un voile flouté par-dessus le tableau de bord
  réel, l'accroche (« TURN YOUR DISCIPLINE INTO CASH FLOW… »), le
  simulateur (10 abonnés = 800 €/an · 100 = 8 000 €/an), la barre
  d'avancement, et **[COMPLÉTER MON TOTEHM]** qui défile jusqu'à la
  PREMIÈRE vue vide. Le bouton ne dit pas « va remplir ton Totehm » : il
  y emmène.
- **Totehm complet** → le voile tombe (`#cercle.ouvert`), le badge live,
  le champ de prix avec le 80/20 écrit à côté, « Active Paying Members »,
  « Ready for next payout », et **[MONETIZE IT — COPY LINK]**.

**⚠️ ON MONTRE SA PART, PAS LE BRUT.** Un créateur qui lit 1 000 € et
reçoit 800 € se sent floué, même si le taux était écrit ailleurs sur la
page. `creator_cercle()` renvoie `a_moi` déjà net.

**⚠️ UN SEUL APPEL POUR TOUT LE TIROIR.** Prix, abonnés, part, méthode de
virement, et l'état du passeport : cinq requêtes côté page, c'était cinq
allers-retours pour dessiner un seul écran.

### ⛔ IMMERSION TOTALE — 19/09/2026

**Dans le Totehm déplié : rien qui en sorte.** Les trois portes
([Get Higher], [My Higher Self], [Totehmize my cloth]) et l'espace membre
(`#conn-bar`) remontent sur l'ATTERRISSAGE et n'y descendent plus.

Une porte mène DEHORS — l'autre domaine, la boutique, le bot. *La pièce
où l'on écrit n'a aucune raison de porter une sortie.* Sur
l'atterrissage, en revanche, elles sont exactement à leur place : c'est
l'écran des choix, et trois choix côte à côte se comparent quand trois
choix empilés se subissent.

**⚠️ UN BOUTON VISIBLE QUI NE FAIT RIEN EST UN BOUTON CASSÉ.** Le 17/09
j'avais neutralisé le point vert dans le Totehm en le laissant à l'écran.
Le 19/09 il est retiré. On enlève, on ne débranche pas.

**⚠️ UNE RÈGLE DE COMPORTEMENT NE VA JAMAIS DANS UN `@media`.**
`body:not(.gate) #conn-bar{display:none}` était écrit dans la requête
mobile : le point restait donc visible sur desktop. Une règle qui dit
« ceci n'existe pas ici » est vraie sur tous les écrans.

### ⛔ UNE MINI-BOÎTE EST UNE PORTE — 19/09/2026

Cliquer une mini-boîte **bascule vers la vue native de l'élément ET ouvre
sa boîte en édition**. Une vision citée dans un objectif n'est plus une
étiquette : c'est le chemin vers la vision.

**⚠️ `data-go` SE LIT AVANT `data-open`.** Une mini vit À L'INTÉRIEUR
d'une boîte ouverte : `closest('[data-open]')` remonterait jusqu'à la
boîte qui la contient et rouvrirait celle-là. L'ordre des deux tests EST
le comportement.

**⚠️ ON CHANGE DE VUE, PUIS ON OUVRE — À LA FRAME SUIVANTE.** `setView`
redessine la liste ; ouvrir dans la même frame viserait une boîte qui
n'existe pas encore.

### ⛔ UNE HABITUDE A UN LIEU — 19/09/2026

**Le Spot est un champ de l'habitude, avec la même pureté que les
autres** : pas d'icône, pas de cadre, un placeholder qui donne le ton
(« the park downstairs · my kitchen · the gym on 5th »).

Le lieu est le PREMIER déclencheur d'une habitude : « le parc en bas » dit
quand et comment mieux qu'une heure.

**⚠️ TABLE À PART, PAS UNE COLONNE DANS `totehms`.** Les habitudes vivent
dans un `jsonb steps` : y glisser un lieu obligerait à réécrire tout le
tableau pour changer un mot, et rendrait toute recherche par lieu
impossible.

**⚠️ UN LIEU VIDE EFFACE LE SPOT.** C'est le seul moyen de se détacher
d'un endroit sans supprimer l'habitude.

**⚠️ LE SPOT SUIT SON HABITUDE QUAND ELLE EST RENOMMÉE.** Comme les
répulsions et les objectifs — la clé est le TEXTE de l'habitude.
`habit_rename_links` libère d'abord la place cible, sinon la clé primaire
`(user_id, habit_text)` refuse le déplacement.

**⚠️ `lat`/`lng` EXISTENT ET RESTENT VIDES.** « la salle du 5e » n'a pas
de coordonnées et n'en a pas besoin pour déclencher. Les remplir
maintenant coûterait **un appel de géocodage par habitude** — voir la
DOCTRINE DE COÛT. Elles attendent le Radar.

### ⛔ LE FILTRE NE CONCERNE QUE LES HABITUDES — 19/09/2026

**Le T (`T.svg`) EST le filtre**, et il ne filtre que les habitudes.
Ailleurs, il ne clignote pas et ne s'ouvre pas. *Un bouton qui s'allume
sur un écran où il n'agit pas promet quelque chose qu'il ne tiendra pas.*

Et « Order by importance… » : cassé sur desktop, absent sur mobile. Même
cause que d'habitude — une règle de mise en page écrite dans un `@media`.

### ⛔ LA VISIBILITÉ EST LE COMMUTATEUR DE MONÉTISATION — 18/09/2026

Le nom et la visibilité étaient passés sur l'atterrissage le 15/09, avec
cette raison : « on les règle avant d'entrer, pas pendant ». **Elle ne
tient plus.** Choisir « visible to my paying followers », ce n'est plus
un réglage de confort — c'est ouvrir sa boutique. Ça se décide dans son
compte, à côté de l'abonnement et des virements, pas sur un écran
d'accueil entre deux boutons. Les deux blocs sont donc **retournés dans
l'espace membre**. La RECHERCHE reste sur l'atterrissage : c'est la porte
d'à côté, pas un réglage.

⚠️ **Ce sont les mêmes nœuds, déplacés — pas des copies.** Deux champs
« nom du Totehm » dans le même document finiraient par afficher deux
valeurs différentes, et `paintNameButton()` n'en peindrait qu'un.

L'espace créateur s'ouvre **avec** la visibilité payante.

**⚠️ IL NE RENVOIE PLUS VERS `/club/creator` · 19/09/2026.** Il DÉPLIE le
tableau de bord sur place — voir **⛔ LE TIROIR DU CERCLE**. Je craignais
deux tableaux de bord à tenir d'accord ; il n'y en a qu'un, parce qu'il
n'y a **qu'une seule source** : `creator_cercle()`. Ce qui divergeait,
c'étaient deux PAGES qui calculaient chacune de leur côté — pas deux
endroits où afficher le même appel.

### ⛔ UNE INTENTION QUALIFIE UN GESTE RÉPÉTÉ — 17/09/2026

**Retour en arrière assumé.** J'avais posé les sept intentions sur les
CINQ objets le 16/09. C'est faux, et Wah l'a repris : une intention
qualifie un **geste répété** — pourquoi on le refait. Un objectif est une
destination, une répulsion est ce qu'on arrête, une vision est ce qu'on
voit venir : aucun des trois ne se répète, donc aucun n'a d'intention
propre.

Ce qu'ils ont, c'est la **somme de celles de leurs habitudes**
(`colsHeritees`). Le trait de gauche d'un objectif lié à trois habitudes
de trois intentions différentes est tricolore — et il dit quelque chose
de vrai : *cet objectif tire sur ces trois registres de ma vie*. Une
leçon hérite par ses répulsions, qui héritent de leurs habitudes : deux
sauts, et le trait reste vrai.

L'ordre des segments est celui de `INTS`, jamais celui de la rencontre :
deux objectifs aux mêmes intentions doivent donner le même trait.

Les colonnes `i`/`is` restent en base sur les quatre tables, et
`intentions_set` aussi : les retirer demanderait une migration pour
supprimer du code que personne n'appelle.

### `next_objective.html` est mis de côté — 13/09/2026

TOTEHM est un réseau social **privé** : on n'y consomme pas du contenu,
on en écrit, pour d'autres membres. Une machine qui PROPOSE des habitudes
fait l'inverse — elle remplit l'écran à la place du membre. Le fichier
reste dans le dépôt, débranché ; plus aucune porte n'y mène.

À sa place, la **vision** : ce que le membre voit venir, et seulement le
bon côté. C'est là qu'est le visionnaire.

**`totehm_world.html` est la porte de la carte · 09/09/2026.** Le bouton
du bas de l'atterrissage disait `[Open my Totehm world]` et partait sur
`map.html` — c'était la SEULE entrée de la Higher Map. Retirée du
Totehm, la carte a désormais son propre fichier, `totehm_world.html`.
Elle a été sortie de `totehm.html` pour être retravaillée à part. La
retirer sans rien mettre à la place aurait laissé le produit sans
entrée.

Un chevron « Think same but opposite » a occupé ce rôle transitoirement
(du 09/09 au 17/09), descendant sur un deuxième écran vidéo dans le
même atterrissage. Les deux sont partis avec la remontée de la barre
de recherche : voir « L'ATTERRISSAGE TIENT SUR UN ÉCRAN ».

**`objectives.html` n'existe plus.** Supprimé le 05/09 : son contenu est
devenu une VUE. Une vue n'est ni un fichier, ni une iframe, ni une page —
c'est la même liste, les mêmes données, la même session, repeinte.

**`book.html` et `next_objective.html` SONT REVENUS — 09/09/2026.** Ce sont
des PAGES, pas des vues et surtout pas des cadres : même origine, donc même
`localStorage`, donc même session ; on y va, on en revient par le T du haut
ou le TOTEHM du bas. Elles ne sont pas des doublons des vues — la vue
objectifs liste, `next_objective.html` propose ; la vue répulsions liste,
`book.html` raconte.

Elles s'ouvrent par **deux portes en bas à droite de l'écran** —
`#bottom-doors` : **[My Wisdom]** et **[Habits Generator]**. Elles ont
d'abord été mises dans le menu membre ; à deux gestes d'un écran qu'on ne
quitte jamais, elles étaient invisibles. Sous le pouce, elles existent.

**Le TOTEHM du bas s'est décalé à GAUCHE** pour leur laisser la droite, et
**le petit chevron sous lui a disparu** : il ne faisait que répéter le
geste du wordmark, qui ouvre le menu depuis toujours.

La rangée `.sn-row` du menu est supprimée : elle était cachée par trois
règles à la fois (`#mw-in-state #settings-nav`, deux `@media`) — des
boutons qui existaient sans jamais s'afficher.

**Ce qui ne revient PAS avec elles :** l'iframe. Ce sont deux documents que
l'on visite, jamais deux cadres que l'on encastre. `pushMetrics()`, le
contrat `postMessage` et le fondu enchaîné restent morts.

Ce que la fusion a fait disparaître, et qu'il ne faut toujours pas
réintroduire — le retour des deux pages n'y change rien, elles se visitent
en pleine page :
- **`pushMetrics()`** — elle poussait la valeur résolue de `--rl` aux
  iframes, parce qu'une propriété personnalisée est SUBSTITUÉE et pas
  calculée. Dans un seul document, le rail est le même pour tout le monde.
- **Le contrat `postMessage`** (`totehm-read-peek`, `totehm-pick-weight`,
  `totehm-add-habit`, `totehm-metrics`) — il existait parce qu'une iframe ne
  peut pas couvrir l'écran au-delà de son cadre et devait DEMANDER au parent.
  Il n'y a plus de parent ni d'enfant : il y a une page.
- **Le fondu enchaîné `#book` / `#nextobj`** et leur rideau noir.
- **La course** où une écriture serveur était effacée par le snapshot
  d'habitudes suivant : tout passe désormais par le même `cloudSave`.

**My Wisdom et l'autobiographie n'ont plus d'écran sur `.space`.** Elles vont
dans Telegram. `book_chapters` et `autobiographiste` restent en base.

**La contrainte qui reste vraie, et qui vaut pour tout nouvel overlay :**
`#stage` porte `transform` sur desktop, il est donc le bloc conteneur de ses
descendants `position:fixed`. Un overlay qui doit couvrir le CARRÉ vit
DEDANS ; un overlay qui doit couvrir la FENÊTRE vit dehors. Les fenêtres du
Totehm (`#habit-peek`, `#trip-peek`, `#freq-panel`, `#filter-modal`) vivent
dedans : un seul code, deux résultats justes.

**`higherself.html` est la mini-app Telegram, ajoutée le 04/09/2026.** Ce
n'est pas un sixième produit : c'est les quatre écrans **repliés en un seul**,
pour un pouce, dans une conversation. Quatre onglets — NOW · WISDOM · NEXT ·
SPOTS — un seul appel réseau au chargement (`higherself_state()`), et les
mêmes RPC que les grands écrans. Rien de propre à la mini-app côté serveur :
le jour où le calcul de la série change, il change pour tout le monde en même
temps.

Elle s'ouvre par un bouton `web_app` dans Telegram : plein écran, dans la
conversation, session déjà là, **rien à configurer chez BotFather** — la seule
contrainte est le HTTPS. C'est ce qui sépare « va sur le site » de « c'est
ouvert ».

**⚠️ `X-Frame-Options: SAMEORIGIN` TUE UNE MINI-APP.** `space/vercel.json`
posait cet en-tête sur `/(.*)` — donc aussi sur `/higherself`. Sur Telegram
Web, un Mini App tourne dans une **iframe** hébergée par `web.telegram.org` :
le cadre serait resté noir, sans un mot d'explication, pour tout le monde sauf
les clients mobiles. Corrigé le 04/09 : le bloc général exclut le chemin par
un negative lookahead (`/((?!higherself).*)`), et `/higherself` porte à la
place une CSP `frame-ancestors` qui **nomme Telegram et personne d'autre** —
plus étroit qu'un wildcard, et c'est la seule forme que les navigateurs
modernes arbitrent correctement face à `X-Frame-Options`.

Deux règles qui en sortent :
- **Sur Vercel, deux règles d'en-têtes qui matchent le même chemin
  s'empilent.** On ne « surcharge » pas un en-tête restrictif : on exclut le
  chemin de la règle qui le pose.
- **La `Permissions-Policy` doit DÉLÉGUER à l'origine parente.**
  `geolocation=(self)` suffit pour une page ouverte directement ; dans une
  iframe Telegram, la capture de spot échouerait en silence. Les origines
  Telegram sont nommées explicitement.

**La Higher Map a son propre fichier depuis le 21/08/2026.** Elle n'est plus
un étage de `totehm.html` : elle est un environnement, avec son état, son
cycle de vie et sa porte. `totehm.html` ne la connaît que par un lien
(`[Open my Totehm World]`, sur l'atterrissage).

Pourquoi : tant qu'elle était un étage, la Map partageait `floor`, `paint()`,
`busy` et les écouteurs de geste avec la saisie d'habitudes. Trois écrans dans
une machine à états faite pour deux — c'est ce qui produisait « le filtre
manque de fluidité » et « le scroll ouvre la map ». Sortie, elle ne coûte plus
rien à la page d'à côté.

Les chapitres narratifs (`book_chapters`, `autobiographiste`) restent en
base et continuent d'exister pour le bot — ils n'ont plus d'écran à eux
depuis la fusion du 05/09.

### Navigation — règles absolues (`totehm.html`)

**Il n'y a plus d'étage.** Un seul écran de saisie, et l'atterrissage
au-dessus. `floor`, `animateSwap()`, `foldGesture()`, `body.in-map` et
`body.in-settings` sont supprimés — ne pas les réintroduire.

```
ATTERRISSAGE  (body.gate)          le papier sur son socle : logo au recto, nom au verso
     ↕  tap : inscrit → il se pose     ↕  croix #fold-x · geste bas · Échap
     │        sinon  → la porte (email · code · nom), puis il se pose seul
SAISIE        (body sans .gate)    le rail, les habitudes
```

Le repli est le déploiement joué à l'envers, sur les mêmes quatre calques
(`#gl-bg → #stage`, `#gl-t → #bigT`, `#gl-wm → #wordmark`, `#gl-rail → #rail`),
même durée, même easing (`--gate-dur`, `--gate-ease`).
**Le gate n'est plus détruit après l'entrée** (`gate.remove()` a disparu) :
sans lui, il n'y a rien à rejouer.

**L'ORDRE DANS `fold()` N'EST PAS NÉGOCIABLE.** `measure()` lit
`getBoundingClientRect()`, qui renvoie le rectangle **après** transformation.
Mesurer alors que `.entered` est déjà posé revient à mesurer des calques
déjà déplacés : `f` vaut `t`, donc `dx = 0` et `scale = 1`, et `--tf-bg`
retombe sur l'identité. Symptôme constaté : à partir du deuxième
déploiement, le carré navy du fond ne s'agrandissait plus du tout.
La séquence, dans cet ordre exact :
1. `gate.classList.add('no-anim')` — plus rien ne s'anime
2. afficher le gate **au repos** (`body.gate`, sans `entered`), `scrollTop=0`
3. `measure()` — rectangles non transformés
4. `body.classList.add('entered')` — saut aux positions d'UI, instantané
5. retirer `no-anim`, forcer un reflow
6. retirer `entered` — le repli part

**Stoner n'est plus dans `totehm.html`.** `[Get Higher with my Totehm]` est
un `<a href="https://www.totehm.com">`. L'overlay `#stoner`, `#lift-hg`,
`body.liftoff`, `#street-btn` et `#stoner-tagline` sont supprimés, ainsi que
`showStoner()`, `paintStreet()` et `portugalDetected`. La méthode a son
domaine ; ce fichier n'a pas à l'héberger.

**L'ATTERRISSAGE NE DÉFILE PAS PENDANT L'ANIMATION.** Deux verrous, et il
faut les deux :
```css
body.gate.entered #gate, body.gate.folding #gate { overflow:hidden }
```
```js
gate.addEventListener('scroll',()=>{ if(entered||folding) gate.scrollTop=0; });
```
Pourquoi : `#gl-bg` monte à `scale(60)` pendant le geste — sur mobile, faute
de `--tf-bg` mesurable, c'est la valeur de repli. 110 px × 60 = 6 600 px de
carré à l'intérieur d'un conteneur qui défile. **Mesuré : la hauteur de
défilement du gate passait de 844 px à 2 525 px**, le navigateur ajustait la
position et les boutons du bas sortaient de l'écran. C'était ça, « des
boutons qui disparaissent ».
`overflow:hidden` seul ne suffit pas : il bloque l'utilisateur, pas le
navigateur — un `scrollTop` programmatique passe quand même. D'où le
réépinglage par événement.
Et `measure()` ramène `--gate-bg-scale` à ce qu'il FAUT pour couvrir l'écran
(≈14 au lieu de 60) quand `#stage` n'a pas de boîte : le débordement tombe de
2 500 px à 33 px. Ne pas remettre 60 en dur.

**`measure()` EFFACE la variable quand la cible n'a pas de boîte.** Sur
mobile `#stage` n'a que des enfants `position:fixed`, donc une hauteur nulle.
Garder l'ancienne valeur, c'était rejouer en portrait une mesure prise en
desktop, et replier le fond sur un carré qui n'existe plus.

**La fenêtre membre est à `z-index:250`, au-dessus du gate (200).** Elle
vivait à 95 : cliquer sur l'accès membre depuis l'atterrissage ouvrait la
fenêtre DERRIÈRE l'écran noir, et rien ne se passait. `#conn-bar` vit
maintenant dans le flux du gate, **au-dessus du logo**.

**⚠️ Ne jamais lire `getPropertyValue('--rl')` pour obtenir des pixels.** Une
propriété personnalisée est SUBSTITUÉE, pas calculée : on récupère le jeton
`max(38px,calc(min(92vh,78vw,640px) * .072))`, pas sa valeur. Pour des pixels,
`getComputedStyle(rail).left`. La règle a survécu à `pushMetrics()`, qui est
morte avec les iframes — elle vaut pour toute mesure à venir.

**LES TROIS VUES · 05/09/2026.** `view` vaut `'habits'` | `'objectives'` |
`'repulsions'`. `setView(v)` pose la vue, `paintZone()` peint, `renderView()`
aiguille vers `renderHabits()` / `renderObjectives()` / `renderRepulsions()`.
`renderHabits()` n'est PAS touchée : elle est appelée depuis une quinzaine
d'endroits et c'est le chemin qui marche. On aiguille au-dessus.

Trois entrées, un seul état : les trois carrés `#views`, le balayage
horizontal, les flèches du clavier. Aucune ne charge quoi que ce soit :
c'est la même page, la même session, la même mémoire.

**Il n'y a plus de « sans session » dans la saisie (27/09).** On n'y entre
pas sans être inscrit (`enter()`), donc les cinq vues sont ouvertes à qui
est dedans. Avant, la fenêtre membre demandait l'email sur quatre vues
sur cinq — voir **LE PAPIER LÉVITE SUR SON SOCLE**.

Verticaux, dans la saisie :
- au **sommet** de la liste, geste vers le haut → le filtre
- au **pied** de la liste, geste vers le bas → le Totehm se replie

**Un seul écouteur `wheel`, dans `verticalGesture()`, en `passive:true`.**
Il y en avait trois avant, dont un en `passive:false` avec `preventDefault()`
et un accumulateur de 90 px : ils se disputaient le même geste et retenaient le
scroll. C'était ça, « le filtre manque de fluidité ». Ne jamais en rajouter un
deuxième.

**Le fix clavier, dans les quatre fichiers.** Tout écouteur global de touche
commence par :
```js
if (e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA'
    || e.target.isContentEditable) return;
```
Les habitudes et l'objectif sont des `<textarea>` : ne tester que `INPUT`
laissait les flèches changer de page en pleine écriture.

**`#hmap` n'existe plus dans `totehm.html`.** La règle « `#hmap` doit être
sibling de `#stage` » est caduque. La contrainte qui la fondait reste vraie :
`#stage` porte `transform` sur desktop, il est donc le bloc conteneur de ses
descendants `position:fixed`. Un overlay qui doit couvrir la FENÊTRE vit hors
de `#stage` ; un overlay qui doit rester DANS le carré vit dedans.

**Filtre deux étapes** : TIME FREQUENCY → étape intention avant fermeture.
`applyFreq()` sur `fpTarget==='filter'` appelle `showFpStage('int')`, pas
`closeFreqPanel()`. `applyIntent()` sur `fpTarget==='filter'` ferme le panneau
et applique le filtre. **Le filtre est persisté** dans `totehm_filter_v1`.

**LA RECHERCHE REND UNE LISTE, JAMAIS UN PARI · 04/09/2026.** Elle faisait
`ilike('%'||q||'%').limit(1)` : taper deux lettres ouvrait le Totehm d'UN
inconnu, choisi par le hasard du plan d'exécution. Et comme un invité ne peut
pas lire `profiles` (la RLS ne vise que `authenticated`), le fichier
compensait avec **trois profils inventés en dur** — quelqu'un cherchait une
personne et trouvait de la fiction.

Une seule RPC, `search_totehms()`, `security definer`, ouverte à `anon` :
elle ne rend que des Totehms explicitement partagés, jamais un e-mail ni un
id, et elle classe **exact > préfixe > sous-chaîne** — l'ordre dans lequel un
humain cherche un nom qu'il connaît déjà.

Trois règles qui en sortent, et qui valent partout :
- **Un `limit(1)` sans `order by` est un tirage au sort.** Si le résultat est
  montré à quelqu'un, il faut un classement explicite.
- **Aucune donnée de démonstration dans un fichier servi.** Un tableau de
  faux profils qui comble un trou de droits finit toujours par être pris pour
  du réel. Le trou se ferme côté serveur.
- **Un message d'erreur dit ce qui est vrai.** « this Totehm is private »
  s'affichait aussi quand le nom n'existait pas : trois situations, un seul
  message, aucun moyen de savoir laquelle.

**Settings desktop** : `#settings-nav .sn-row { display:none!important }`.
Seul `#sn-home` reste visible.

**L'atterrissage de `.space` est un radar, pas une vidéo.** `earth.mp4` est
supprimée : 1,9 Mo d'egress Supabase par visiteur pour une illustration.

`#gate-radar` est un canvas plein cadre, centré sur le logo — la carte tourne
autour de toi, et toi c'est ton Totehm. Grille, trois cercles de portée,
balayage en vingt secteurs dégressifs : le même dessin que `map.html`, copié,
jamais partagé. Zéro appel réseau, zéro donnée. La boucle s'arrête dès que le
Totehm est déployé ou l'onglet caché, et repart après un repli.

L'atterrissage tient sur UN écran (`#gate-hero`) depuis le 17/09/2026.
Le deuxième écran `#gate-context` (« Think same but opposite » et
`same_but_opposite.mp4`) est parti avec la remontée de la barre de
recherche — voir « L'ATTERRISSAGE TIENT SUR UN ÉCRAN ». Le troisième
verrou (empêcher un deuxième écran de rallonger le gate pendant
l'animation) est caduque : il n'y a plus qu'un écran.

### La carte est le produit — 03/09/2026

`map.html` n'est plus « le quatrième écran ». C'est **Google Maps + Ticketmaster,
à l'échelle mondiale, filtré par ce que la personne est en train de devenir.**

```
Google Maps  montre ce qui existe.
Ticketmaster montre ce qui est en vente.
TOTEHM       montre ce qui te correspond — dans cet ordre.
```

Trois couches, un seul classement : `MEMBER_DROP` (spots) · `PLACE` (Google) ·
`LIVE_EVENT` (Ticketmaster). Un événement se range **exactement comme un lieu** :
cosine similarity entre son embedding et l'habitude précise du membre. Il ne
porte plus `rank_tier: 3` en dur — ce qui affichait toute la moitié Ticketmaster
du produit en périphérie, à opacity .5.

**Une seule source événementielle, et elle est gratuite.** Eventbrite renvoyait
404 à chaque ouverture du radar (API fermée depuis 2021, clé posée, appel parti
quand même) ; Songkick est fermée aux nouveaux comptes ; Meetup exige un plan
Pro payant. Trois adaptateurs morts, retirés. Ticketmaster Discovery reste :
gratuite, mondiale, 5 000 requêtes/jour.

**Une cellule de 0,1° (~11 km), balayée toutes les 12 h.** Dix fois plus grosse
que la cellule Google (0,01°) : on cherche un café à la rue près, un concert à
la ville près. Le deuxième membre d'une ville ne coûte rien. Sans ce cache,
1 000 membres × 10 ouvertures = 40 000 appels/jour pour un quota de 5 000.

**L'adaptateur vit dans `_shared/live.ts`**, importé par `higher-map` ET
`bot-reply`. Même règle que `_shared/origins.ts` : une liste dupliquée finit
toujours par diverger, et ici la divergence se verrait le jour où la carte et
le bot ne proposent pas la même soirée.

### La ville, en plus du monde — 04/09/2026

Ticketmaster couvre le monde et **ne couvre pas le Portugal**. On tourne à
Lisbonne. La couche locale ne se règle pas en ajoutant un adaptateur par
site : un site change de HTML tous les six mois, une API privée ferme sans
prévenir — trois adaptateurs sont déjà morts en un lot.

**Ce qui ne change pas, ce sont les FORMATS.** Trois parseurs — ICS (RFC
5545), JSON-LD (`schema.org/Event`), RSS daté — et des sources **déclarées
en base** (`live_sources`). Une salle de plus = une ligne, zéro ligne de
code. Les deux couches écrivent dans la MÊME table `live_events` et se
rangent avec le même classement : un concert de la mairie et un concert
Ticketmaster sont deux points identiques sur le radar.

**On ne devine jamais l'URL d'un flux.** Les dix premières graines lisboètes
ont été posées à la main : les dix ont rendu 404. `agenda-ingest` a un mode
`discover` qui sonde onze chemins normalisés et écrit celui qui répond.

**Mesuré le 04/09/2026 : 18 sources lisboètes, 0 flux exploitable.** Le
mécanisme marche, la ville ne publie pas. C'est un problème de terrain — il
part chez Gemini. **Ne pas écrire de scraper HTML par site :** ça se casse au
premier redesign, silencieusement, et il faut le re-maintenir pour chacun.

### `map.html` — les règles

**Le rendu est un ÉTAT, pas une largeur.** `view` vaut `'map'` ou `'cards'`.
La largeur d'écran ne décide que du rendu par DÉFAUT, au premier affichage ;
ensuite c'est un choix, et il tient — y compris à la rotation du téléphone.
Ne jamais remettre une règle du type `@media(max-width:699px){#world{display:none}}` :
elle reprendrait à l'utilisateur un choix qu'il vient de faire.

**Les deux rendus sont construits à chaque chargement de spots.** Quelques
nœuds DOM en plus, et en échange la bascule ne redemande jamais rien au
réseau. C'est la seule façon que le bouton soit gratuit à presser.

**Le radar ne porte AUCUN HUD.** Le canvas, les T, le point blanc, et le seul
bouton de bascule. Météo, coordonnées, barre de statut et logo de retour ont
été retirés. Tout ce qui se lit ou se choisit s'ouvre en fenêtre plein écran
sur fond noirci. Le vide du radar est cliquable : il rouvre les intentions.

**La localisation n'a qu'une horloge.** Une seule minuterie, celle du
navigateur, à 45 s (60 s en mode précis). Il y en avait deux : une « échéance
douce » de 12 s déclarait l'échec pendant que `getCurrentPosition` courait
encore sur 20 s. Douze secondes, c'est moins que le temps de lire
« Autoriser » et de cliquer : on retombait sur Lisbonne pendant que la
personne acceptait. **Ne jamais remettre de deuxième minuterie.**

**Aucun message d'erreur de localisation.** Deux états et rien d'autre :
`locating…`, ou `tap to use your position`. Localisé, la ligne disparaît.
« location blocked », « timed out », « needs https » ne disaient rien de
faisable à qui les lisait.

**`vibe` ne s'affiche jamais.** La colonne vaut `leaf` ou `paper` : c'est une
classification interne. La description d'une carte vient de `commentaire`, et
à défaut d'une ligne composée avec `lieu_type` et `duration_min`.

**Une carte porte QUATRE choses.** Intention · Titre · Commentaire · Combien
de membres y sont allés. Les puces de faits (état d'esprit, durée, type de
lieu) ont été retirées : elles répétaient la description et remplissaient
l'écran de mots isolés. Seule la minute restante (`ends_at`) survit, parce
qu'elle périme.

**Depuis 03/09/2026, deux méta-badges peuvent apparaître dans `.c-top`
(en plus du badge de kind DROP/LIVE/PLACE) :**
- **energy** (`silent`/`social`) — uniquement sur les MEMBER_DROP, choisi
  par le membre au moment du drop via l'étape 7 du flow `/spot` du bot.
  Jamais dérivé du `lieu_type` : c'est un contrat social entre membres.
- **matched habit** — ligne `.c-match` sous la description : *« matches:
  {habit_text} »*. Explique POURQUOI ce lieu remonte : cosine similarity
  entre l'embedding de la place et celui de l'habit précis du membre.
  Nulle sur les PLACE sans embedding et sur les LIVE_EVENT.

**Le radar CLASSE, il ne filtre pas** (doctrine 03/09/2026). Chaque T
porte un `rank_tier` 0-3 qui pilote sa luminosité :
- **0 MEMBER_DROP** — glow max, opacity 1 (drop humain, prioritaire)
- **1 fit fort** — top tercile du cosine similarity intra-intention
- **2 fit moyen**
- **3 fit faible ou sans embedding** — périphérie du radar, opacity .5

Empty state = personne. Google Maps montre ce qui existe, TOTEHM montre
ce qui te correspond, dans cet ordre. Voir `places_matching_habits` RPC
+ `TIER_STYLE` dans `map.html` pour l'implémentation.

**L'ÉCHELLE DU RADAR VA JUSQU'À 60 KM.** Elle était plafonnée à 4 000 m, hérité
du rayon des lieux physiques. Un concert à 40 km voyait son T posé hors cadre,
puis passé en `display:none` par `layout()` : **aucun événement Ticketmaster
n'était visible sur le radar, quelle que soit la clé posée.** Le plafond suit le
rayon réellement servi. Ne jamais le remettre à 4 000.

**CINQ PLACES SONT RÉSERVÉES À LA COUCHE LIVE.** La sélection était
`sort(dist).slice(0, 15)` : les lieux physiques sont servis dans 4 km, les
événements dans 50 km — les soixante places remplissaient donc les quinze places
AVANT le premier concert, systématiquement. On trie par CLASSEMENT (le radar
classe, il ne filtre pas) et on garantit jusqu'à cinq LIVE. Cinq, pas quinze :
au-delà la carte devient un programme de salle, et on n'est pas Ticketmaster —
on est ce qui te correspond dedans.

**UN LIVE DIT QUAND, PAS COMBIEN DE TEMPS IL RESTE.** Ticketmaster ne renvoie
presque jamais d'heure de fin : la carte servait `ends_at` et annonçait donc la
fin d'un concert qui n'avait pas commencé. `fmtWhen(starts_at)` — « tonight
21:00 », « tomorrow 20:30 », sinon la date. `fmtLeft()` ne sert plus qu'à ce qui
périme vraiment.

**L'ACTION D'UN CONCERT EST UN BILLET, PAS UN ITINÉRAIRE.** `[Tickets]` passe
devant, en gras ; `[Go there]` reste derrière. Et « 140 min walk » ne s'affiche
plus au-delà de dix kilomètres : ce n'est pas une information, c'est une
insulte polie.

**`window.__totehm_map`** porte le dernier état servi (couches allumées,
compteurs, origine). C'est le bloc à coller dans la console quand la carte
semble vide. **Des booléens, jamais une valeur de clé.**

**`window.__totehm_self`** fait la même chose pour `higherself.html` :
compteurs, onglet courant, état du bot, et l'erreur de RPC si elle a eu lieu.
Tout écran qui peut être vide porte son diagnostic — un écran vide sans
diagnostic, c'est trois allers-retours au lieu d'un. Et une erreur de RPC se
**journalise** : `if(error) return` transforme une panne en écran vide, et un
écran vide ressemble à « je n'ai rien fait aujourd'hui ».

**`spots.member_count` NE COMPTE RIEN.** C'est une colonne figée, remplie à
la main sur 20 lignes sur 125 (max 50). Ne jamais l'afficher comme un
compteur. Le vrai compte vit dans `spot_takes`, alimenté au clic sur
[take me there], lu par `spot_takes_count(text[])` — un appel par écran de
spots, jamais un par carte.

**Le logo habité est sur la carte aussi.** Le T (coloré par l'intention
courante) et sa flèche ouvrent les filtres ; le TOTEHM du bas ramène au menu
des sept intentions, d'un seul clic — pas de geste à apprendre, la carte n'a
pas de liste à parcourir avant d'y arriver. Mêmes coordonnées que partout
ailleurs : T à 30 px du haut sur 53 px, TOTEHM à 30 px du bas sur 50 px.

**Les filtres de spots ne repartent JAMAIS sur le réseau.** Distance et type
filtrent la liste déjà reçue. Un filtre qui redemande au serveur, c'est une
facture par clic.

**Le zoom a trois entrées, le déplacement zéro.** Molette, boutons + / −,
pincement à deux doigts. `touch-action:none` sur le canvas est obligatoire —
sans lui le navigateur avale le pincement avant nous. La carte ne se déplace
pas : elle se dilate autour de toi, tu restes au centre.

**`touch-action:pan-x` sur `#deck`.** Sans cette ligne, un pouce jamais
parfaitement horizontal partait dans l'axe vertical de la carte et le swipe
se perdait une fois sur deux.

### Higher Map — architecture et mathématique · 19/08/2026

Aucune librairie externe.

#### Deux rendus, un seul état

La règle qui tient tout : **une machine à états, un chargeur, une carte de contenu**. Seules deux fonctions divergent.

| Partagé | Divergent |
|---|---|
| `pickIntention()` le déclencheur | `renderRadar()` ≥ 700 px |
| `HM_HITS` le cache de session | `renderDeck()` < 700 px |
| `cardHTML()` **le balisage de la carte** | |
| géoloc, météo, sélecteur, `RAD` | |

`cardHTML()` sert le deck **et** l'aperçu desktop. Le CSS ajuste les tailles, jamais le contenu. Le jour où la carte change, elle change une fois.

`applyMode()` pose `hm-radar` ou `hm-deck` sur `#hmap`. Au redimensionnement, si la frontière des 700 px est franchie, le rendu bascule et **l'état ne bouge pas** : aucune requête n'est refaite.

#### Trois couches, côté radar

| Couche | Élément | Rôle |
|---|---|---|
| 0 | `<canvas id="hm-canvas">` | grille, anneaux, balayage, lignes, plaques de distance |
| 1 | `<div id="hm-markers">` | les T, positionnés en `transform` |
| 2 | HUD | sélecteur, horloge, coins, aperçu |

**Pourquoi les marqueurs sont du DOM.** Un T dessiné dans le canvas n'a ni `:hover`, ni zone de clic, ni animation CSS, ni accessibilité. Les marqueurs sont des `<button>` avec `aria-label` : cible de 30 px, glyphe de 15 px.

#### La projection

**Distance affichée → Haversine.** Le chiffre sur lequel on décide de se déplacer, il doit être juste.

**Position pixel → projection plane locale**, équirectangulaire tangente, corrigée en cos(latitude). Écart < 0,03 px jusqu'à 4,2 km depuis Lisbonne. Exact là où ça se lit, économe là où ça ne se voit pas.

#### L'échelle

```
range  = clamp(distance_max × 1,15 ; 400 ; 4000)
rayon  = min(W, H) / 2 × 0,82
échelle = rayon / range
```

Une échelle fixe laisserait la moitié des lieux hors écran en zone dense. La portée est affichée en bas à droite.

#### La boucle

`requestAnimationFrame` tourne **uniquement** quand l'étage 1 est affiché **et** que le rendu est le radar. `radarStart()` refuse de démarrer si `isDeck()` : sur mobile il n'y a pas de canvas.

Les étiquettes de distance posent une **plaque noire** avant le texte, mesurée à `measureText()`. Sans elle, le pointillé se lisait au travers des chiffres.

#### Le cache d'intention

**`HM_HITS`** — `Map` intention → lieux, vidée à chaque session. Re-cliquer une intention déjà chargée est instantané, zéro requête.

#### Matching sémantique · 03/09/2026

**La RPC `places_matching_habits`** remplace `places_near` pour le radar.
Elle prend en entrée les habits du membre embedées via `text-embedding-3-
small` (côté edge, un seul appel OpenAI par requête utilisateur, ~30 tokens
par habit — coût négligeable). Elle calcule cosine similarity entre chaque
`places.embedding` et l'embedding de chaque habit de la même intention, et
retourne les lieux triés par `rank_tier` (0=MEMBER_DROP, 1=top tercile,
2=moyen, 3=bas ou sans embedding) puis par score.

**Chaque nouvelle place ingérée par `warm()` est embedée à la volée**
(name + primaryType + descriptions). Sans embedding, une place tombe en
tier 3 mais reste visible : le radar n'a jamais de trou.

**Pour backfiller les places préexistantes** (sans embedding) : appeler la
fonction one-shot `embed-places`. Idempotente, coût ~$0.00003 pour 60
lignes.

**Le placeholder de l'input `#fp-input`** dit "type any language — or
pick below" : la liste des 33 fréquences (`#fp-list`) reste toujours
visible sous l'input, min-height:120px, pour que le clavier mobile ne
la mange pas. Même règle pour `#fp-ints` (min-height:280px).

#### Pièges à connaître

`#hmap` est un overlay à `z-index: 55`. Tout élément censé rester accessible depuis la carte doit passer au-dessus (`#conn-bar` vivait à 45 — invisible depuis la carte).

Retirer un élément du DOM sans retirer son handler (`$('id').onclick` sur `null`) lève un TypeError **à l'évaluation du module** : ce n'est pas la carte qui casse, c'est tout le script. Tout retrait d'élément se vérifie avec l'audit `$('id')` vs `id=` présents.

### Une boîte, une seule, dans tout le produit

`#080808` sur le noir de la page, liseré `#161616`. La profondeur vient de la
NUANCE, jamais d'un cadre gris. Fenêtre de poids, de fréquence, de filtre, de
membre, carte d'un lieu : le même objet, deux tailles.

### Le papier ne change pas. Les boîtes portent la couleur. — 05/09/2026

La référence est le Totehm empilé de `totehm.com` : des blocs PLEINS posés
les uns sur les autres, séparés par du noir. **Aucune ombre.** Mesuré sur
l'image de référence : papier `#333366`, bloc de l'objectif `#36498c`, barre
de la répulsion `#743169`. Trois couleurs, aucune autre.

```
habitudes    #333366  navy
objectifs    #36498c  bleu clair
répulsions   #743169  rouge-violet
```

**Le Totehm ne se repeint pas, il se déplie.** `#stage` reste navy dans les
trois vues ; c'est `--skin`, posé par `#stage.v-h|.v-o|.v-r`, qui change la
couleur des blocs. Ne jamais remettre `.z-next` / `.z-book` sur le fond.

**Mesuré, et c'est ça qui commande le reste : un bloc navy sur un papier navy
est INVISIBLE** — les deux valaient exactement `#333366`.

**⚠️ LA RÉPONSE N'EST PLUS UN FILET NOIR · 09/09/2026.** Elle l'a été :
`1px solid #000` sur chaque bloc, au nom de la perforation du logo. Mais
la perforation n'est pas un TRAIT, c'est du VIDE — entre deux tuiles il y
a du noir de page, pas une bordure dessinée. Un liseré d'un pixel gagne en
plus un demi-pixel gris sur tout écran non entier.

**Le papier recule d'un ton : `--paper:#2b2b57`.** Les trois couleurs de
marque restent intactes sur leurs blocs — navy, bleu clair, rouge-violet —
et se détachent par leur VALEUR, comme les blocs empilés du Totehm de
`totehm.com`. Une différence de ton, pas une bordure. `html,body` et le
carré perforé du desktop (`--logo-navy`) portent le papier ; **plus aucune
bordure noire nulle part** — ni sur les boîtes, ni sur les mini-boîtes, ni
sur les propositions, ni sur les trois carrés de vue.

Le seul trait de toute l'interface est BLANC, et il ne dure que le temps
d'un geste : `.habit.over` pendant un classement.

**Le survol ne déplace plus rien** : `filter:brightness(1.18)`, pas de
translation, pas de face décalée.

**⚠️ UNE BOÎTE NE SAUTE JAMAIS · 09/09/2026.** J'avais donné à la boîte
ouverte une `@keyframes` partant de `translateY(7px)`. La liste est
redessinée à CHAQUE geste — donc l'animation rejouait aussi quand on
touchait un bouton DEDANS : un sautement à chaque clic.

**Une `@keyframes` rejoue au redessin ; une `transition` non.** C'est
toute la différence, et c'est la règle : un état permanent (ouverte,
saisie, survolée) se dit par une transition sur une propriété, jamais par
une animation. Il ne reste qu'un état — ouverte, la boîte est un peu plus
haute et un peu plus claire, et elle y va en 280 ms.

**Le signe est DANS le bloc.** Le T (ou l'onde d'une répulsion) a quitté la
marge à gauche du rail : il est le premier enfant de la boîte. Le rail ne
porte plus que son tiret — le rail est le logo, pas de l'information. Effet de
bord : le débordement mesuré sous 600 px, où la fréquence sortait de l'écran à
gauche du rail, n'existe plus.

**Le sélecteur de vue est SOUS le T**, en ligne : trois carrés pleins, ordre
**rouge-violet · navy · bleu clair**. Le balayage horizontal ET les flèches
suivent le même ordre, tiré de la MÊME liste `VIEW_ORDER` : deux listes
finissent toujours par diverger.

**Chaque carré porte SON nom · 09/09/2026.** Il y avait un seul intitulé,
celui de la vue courante, posé sous les trois : il fallait cliquer pour
savoir ce qu'on allait ouvrir. Le bouton est maintenant la COLONNE — le
carré, puis son mot dessous — et le mot est cliquable comme la couleur.

**Ni filet noir ni contour blanc autour des carrés.** Un carré est une
COULEUR ; l'entourer d'un trait en fait un bouton, et le produit n'a pas
de boutons encadrés. Ce qui marque la vue courante, c'est l'intitulé qui
passe au blanc et le carré à pleine opacité ; les deux autres reculent à
.42. Rien ne bouge, rien n'encadre.

### La couleur intentionnelle ne s'éteint plus — 09/09/2026

Il y a eu deux dégradés successifs sur les traits d'intention — par le
rang, puis par le champ de vision — et les deux avaient le même défaut :
ils transformaient une couleur de marque en gris. **Une intention à 16 %
d'opacité ne dit plus quelle intention c'est ; elle dit seulement « pas
celle-là ».** Or c'est la seule information que le trait porte.

`peintTraits()`, `DEGRADE`, `--tk` et l'écouteur de défilement qui les
servait sont supprimés. Pleine valeur, dans les trois vues, en mode
classement comme en lecture. Le trait descend à **1 px** sur ordinateur,
**2 px** au téléphone — une signature, pas un surligneur — et il passe
`z-index:3`, DEVANT la boîte : sans le filet noir, le fond de la boîte le
recouvrait et l'intention devenait invisible.

### Une répulsion naît de son premier lien — 08/09/2026

Une répulsion protège quelque chose : c'est sa définition. Elle n'existe
côté serveur que PAR ses liens (`my_trips` ne rend que celles rattachées à
une habitude). On ne peut donc pas la poser dans le vide.

Avant, `+ Add a Repulsion` exigeait qu'une habitude existe déjà et refusait
par une alerte — un cul-de-sac. Maintenant : un **brouillon** s'ouvre, on
écrit, et la première habitude attachée — reprise ou écrite là — la fait
exister. **Un brouillon qu'on ferme n'a jamais existé** : le laisser dans
la liste ferait croire à un enregistrement qui disparaîtrait au
rechargement, le pire des états — visible et faux.

### Ce qui manque respire — 08/09/2026

`[set intention]` et `[set time frequency]` pulsent tant qu'ils sont vides,
et s'arrêtent dès qu'ils sont posés. Même souffle que le T et que le O du
wordmark : `breathe`, 2,8 s, ease-in-out. C'est la grammaire du logo, pas
un clignotant de plus.

**Le réglage s'ouvre AU-DESSUS des liens.** Régler l'intention, c'est
régler l'habitude : le choix se pose sous sa ligne, avant ses objectifs et
ses répulsions. Un lookup, lui, concerne les liens : il s'ouvre après eux.
La boîte a deux fentes, `haut` et `bas`.

**On écrit dans la couleur de ce qu'on pose** : un nouvel objectif en bleu
clair, une répulsion en rouge-violet, une habitude en navy. Et les
propositions respirent — elles appellent le doigt sans crier.

### Le déplacement est organique — FLIP

On redessine la liste, donc les cartes SAUTAIENT. `glisse()` mesure avant,
redessine, remet chaque carte à son ancienne place et relâche : le
navigateur interpole. First, Last, Invert, Play — rien n'est animé à la
main, donc ça reste fluide sur un téléphone qui rame. Les styles en ligne
sont nettoyés après : un `transform` oublié fige la carte au rendu suivant.

**La carte qu'on tient se soulève** — `scale(1.025)` et un peu de clarté.
Jamais d'ombre : la marque l'interdit.

### L'ACCROCHE EST LE CHIFFRE, PAS LA BOÎTE — 13/09/2026

L'appui long sur la boîte entière (ci-dessous, 09/09) confisquait le
doigt : sur téléphone, plus moyen de défiler ni d'ouvrir sans se battre
avec le mode. Mesuré sur l'appareil de Wah : **le classement ne
fonctionnait pas du tout sur mobile.**

**Le rail est la piste, le NOMBRE est l'accroche.** Il respire comme le
T tant qu'on est en mode classement — même souffle, 2,8 s — puis se
saisit et glisse le long du rail. Trente pixels dans le rail, loin du
texte : tout le reste de l'écran garde son comportement normal, donc
**on classe et on écrit dans le même mode, sans jamais choisir.**
`touch-action:none` est posé sur le CHIFFRE seul.

Les deux chevrons restent : un cran à la fois, au doigt comme au
clavier. Le glissement sert les longues remontées, les chevrons servent
la précision.

**⚠️ DEUX CIBLES GÉNÉREUSES EMPILÉES, C'EST UNE CIBLE DE MOINS.** La
zone sensible des chevrons (`.rk-a::after`, 14 px de débord vertical)
recouvrait entièrement le nombre qui vit ENTRE eux : `elementFromPoint`
au centre du chiffre renvoyait la flèche, et l'accroche ne partait
jamais. Le chiffre passe `z-index:2`, les flèches `1`, et leur débord
vertical tombe à 2 px.

**⚠️ LA CAPTURE DU POINTEUR VA SUR LA LIGNE, PAS SUR LE CHIFFRE.** La
liste est redessinée pendant le geste (FLIP) : un pointeur capturé par
un nœud détruit relâche tout. La ligne porte `data-row` et survit.

Et `pointer-events:none` sur la ligne saisie, sinon elle se vise
elle-même — leçon déjà payée, ci-dessous.

### `--rw` est le jeton unique du rail

Le rail, les traits du bouton de classement et la marge des boîtes s'y
accrochent tous : un seul chiffre les épaissit ensemble. Au téléphone il
vaut **8 px** — à 6 px sur un écran tenu à trente centimètres, ce n'est
pas du minimalisme, c'est de l'invisible.

⚠️ La hauteur des traits est verrouillée par un trio
`height/min-height/max-height` plus bas dans la feuille : la rouvrir
demande de rouvrir les trois, sinon `max-height` gagne seul.

**L'icône de classement, c'est TROIS BARRES IDENTIQUES à la largeur du
rail.** J'avais essayé des largeurs dégressives : trois longueurs
différentes disent « menu », pas « classement », et l'icône ne tombait
plus en face du rail. Les trois valent exactement `--rw`.

**⚠️ UNE RÈGLE ÉCRITE DANS UN `@media` N'EXISTE QUE LÀ.** Ces trois
largeurs vivaient dans le bloc téléphone ; sur ordinateur, la règle
générique `#ordbtn span{width:var(--rw)}` — POSTÉRIEURE dans la feuille —
reprenait la main. Mesuré : 21,75 px les trois, alors que le bloc
téléphone disait autre chose. Elles suivent maintenant `#ordbtn span`
immédiatement, hors de tout `@media`.

Le test qui l'a trouvée ne lisait pas la feuille : il MESURAIT les trois
`getBoundingClientRect()` dans un vrai navigateur, aux deux tailles
d'écran. C'est la seule façon d'attraper une règle qui perd un duel de
cascade — grepper le fichier aurait dit « la règle est là », et la règle
était là.

**⚠️ UN SÉLECTEUR QUI NE VISE RIEN NE LÈVE JAMAIS D'ERREUR.**
`#member-window .dot` n'a jamais existé : le point vert vit dans
`#conn-bar`, et lui seul. La règle était écrite, jolie, commentée — et
morte. Mesuré : `animationName` valait `undefined`. C'est l'ÉTAT qui
commande, pas l'arbre — `body:has(#member-window.show) #conn-bar .dot`.
Tout style écrit pour un état doit être vérifié DANS cet état, sur
l'élément réel, par sa valeur calculée.

### LE FILTRE EST UNE BOÎTE — 15/09/2026

**« Tout ce qui concerne le Totehm reste dans le Totehm. »**

Le filtre s'ouvrait en fenêtre plein écran sur un voile noir : on
QUITTAIT le Totehm pour régler le Totehm, et une fois dedans il n'y
avait plus un repère — ni rail, ni couleur, ni boîte.

Il est maintenant la PREMIÈRE BOÎTE de la liste, dans la grammaire de
toutes les autres : un titre, une ligne d'unité qui se touche, et les
mêmes sélecteurs d'intention et de rythme qui s'ouvrent DEDANS. Le T du
haut la déplie et la replie. `#filter-modal` ne s'ouvre plus.

Elle ne porte pas la couleur de la vue : elle n'est pas une pièce du
Totehm, elle en est le RÉGLAGE — un gris à peine posé, et pas de trait
d'intention.

### LA CARTE DE VISITE EST SUR L'ATTERRISSAGE — 15/09/2026

Le NOM du Totehm, la VISIBILITÉ et la RECHERCHE ont quitté l'espace
membre pour l'atterrissage, au-dessus du logo (`#gate-id`).

Ce sont les trois seules choses qu'on règle AVANT d'entrer, pas pendant.
Nommer son Totehm et décider qui le voit, c'est la carte de visite ;
chercher celui d'un autre, c'est la porte d'à côté. Ce qui reste dans
l'espace membre est ce qui ne concerne QUE le membre connecté :
l'abonnement, le bot, le compte.

⚠️ `#gate-id` vit DANS `#gate`, et `tools/jumeau.py` arrache `#gate` des
jumeaux. Le générateur la met de côté et la replace CACHÉE : retirer un
nœud sans retirer son câblage lève à l'évaluation et emporte tout le
module. Il l'AUDITE désormais — tout `$('id').` doit trouver son nœud.

### Le souffle n'est pas un clignotant — 15/09/2026

`breathe` descendait à `.18` d'opacité : l'élément DISPARAISSAIT une
demi-seconde sur trois, et l'œil le lit comme une alarme, pas comme une
invitation. Il va de 1 à **.62**, sur **4,2 s** — plus lent qu'une
respiration au repos, donc calme. Les propositions d'un lookup sont
encore plus lentes (5 s).

Le LOGO garde un souffle marqué (`respire-logo`, jusqu'à .22) : lui ne
demande rien, il DIT où l'on est. Une signature peut s'effacer, une
invitation non.

### Le trackpad ne se lit pas comme un doigt — 15/09/2026

Sur un trackpad, `deltaX` POSITIF veut dire « je pousse le contenu vers
la gauche », donc « montre-moi ce qui est à DROITE ». Je l'avais lu
comme un déplacement de doigt : le balayage était inversé. Le geste
TACTILE, lui, lit bien un déplacement de doigt. **Les deux gestes ne se
lisent pas dans le même sens, et c'est normal.**

### La croix ne repliait pas en revenant d'un jumeau — 15/09/2026

`fold()` commence par `if(!open||moving) return;`. `open` est l'état
LOCAL du module GATE, et il n'était jamais posé quand on arrivait déjà
déplié depuis `wisdom.html` ou `vision.html` (`#in`). La croix ne
faisait donc RIEN — pas « parfois » : systématiquement sur ce
chemin-là. On arrive dedans, donc le Totehm est ouvert : on le dit.

Et le retour est une **fusion**, pas un saut : le châssis est identique
au pixel entre un jumeau et le Totehm, la seule chose qui change est la
couleur — alors on la change AVANT de naviguer, 200 ms de fondu vers le
navy. L'œil lit un écran qui se repeint, pas deux pages.

### L'ATTERRISSAGE TIENT SUR UN ÉCRAN — 17/09/2026

> **⚠️ LE CONTENU DE L'ÉCRAN EST DÉPASSÉ LE 24/09** — voir **⛔
> L'ATTERRISSAGE DE TOTEHM.COM EST UN PAPIER**. Le logo vit sur la face
> du papier ; [Open my Totehm] et la recherche ont quitté l'atterrissage.
> La règle reste : UN écran, rien à faire défiler.

Le logo, **[Open my Totehm]**, la carte de visite et la **barre de
recherche** sont TOUS dans le flux du haut, dans cet ordre — sur
téléphone comme sur ordinateur. `#gate-hero` porte un seul groupe,
`#gate-top-row`, en `justify-content:flex-start`.

**« Think same but opposite » est parti, et le deuxième écran avec.**
Il y avait `#gate-context` sous l'atterrissage — une vidéo plein cadre
(`same_but_opposite.mp4`) et une phrase — atteint par un chevron
`#ctx-down` qui pulsait au-dessus de la barre. Trois choses en même
temps : la barre de recherche, un curseur qui appelle vers le bas, et
un écran d'ambiance qui n'ouvre sur rien. Le curseur promettait un
ailleurs et l'écran d'ambiance ne le tenait pas : il ne portait ni
information, ni porte, ni action. La carte a son propre fichier
(`totehm_world.html`) ; l'atterrissage n'a plus à héberger l'un ni
l'autre.

**Ce qui part avec :** `#gate-foot`, `#gate-context`, `#ctx-video`,
`#ctx-vid`, `#ctx-say`, `#ctx-up`, `#ctx-down`, `.ctx-label`, `.chev`,
`.bob`, `@keyframes ctx-bob`, l'`IntersectionObserver` de la vidéo, et
la règle `body.gate.entered #gate-context{display:none}` — le troisième
verrou de l'atterrissage (empêcher un deuxième écran de rallonger le
gate pendant l'animation) n'a plus d'objet, puisqu'il n'y a plus qu'un
écran.

**La recherche n'est toujours pas un bouton qui révèle un champ.** Il
fallait deux gestes pour une intention ; il en faut zéro : on tape.
`#search-btn` et son `morph()` restent supprimés. ⚠️ Appeler `morph()`
sur un nœud absent lève au chargement du module — donc page blanche.
C'est arrivé trois fois en une semaine ; le câblage a été retiré dans
le même geste que le balisage.

### La recherche est REVENUE sur l'atterrissage — 15/09/2026

`[Search a Totehm]` avait quitté l'atterrissage le 08/09 pour l'espace
membre : chercher est un geste de membre. Le 15/09, elle y revient — la
carte de visite (nom · visibilité · recherche) s'adresse en partie à un
inconnu (la recherche) et en partie au membre (nom · visibilité). Toutes
trois se règlent AVANT d'entrer, jamais pendant.

`[Open my Totehm world]` a quitté l'atterrissage le 09/09 : la porte de
la carte a son propre fichier, `totehm_world.html`. **Une porte ne se
retire jamais sans en poser une autre** : `map.html` sans entrée, c'est
le produit sans entrée.

### UNE SEULE BOÎTE, PARTOUT — 08/09/2026

La couche d'affichage fabriquait DEUX objets : la boîte, et le « bloc »
d'une pièce liée. Deux paddings, deux graisses, deux grammaires. D'où
« rien n'est fluide, rien n'est harmonieux ». Elle est réécrite.

**Il n'y a plus qu'une boîte, et elle contient trois choses :**

1. son **titre**, toujours modifiable sur place (`contenteditable`) ;
2. sa **ligne d'unité** — ce qui la qualifie, et qui se touche ;
3. ses **mini-boîtes** — ce qui lui est lié, à la couleur de ce que c'est.

**La mini-boîte porte la couleur de CE QU'ELLE EST**, jamais celle de la
boîte qui l'accueille : une habitude reste navy posée dans une répulsion,
un objectif reste bleu clair posé dans une habitude. C'est le format de la
boîte répulsion, généralisé aux trois vues.

| vue | la boîte montre | les mots |
|---|---|---|
| habitudes  | ses objectifs (bleu clair) · ses répulsions (rouge-violet) | WHY · **TRIGGER** |
| objectifs  | ses habitudes (navy) | HOW |
| répulsions | les habitudes à faire à la place (navy) | **INSTEAD** |

### Une répulsion est une MAUVAISE HABITUDE — 09/09/2026

Ce n'est pas un garde du corps, et les mots le disaient de travers.

- Vue depuis l'habitude, une répulsion est ce qui la fait DÉRAILLER :
  **TRIGGER**, pas « protected by ». WHY monte vers l'objectif, TRIGGER
  descend vers ce qui casse.
- Vue depuis elle-même, ce qu'elle porte n'est pas ce qu'elle protégerait
  — ce sont les habitudes à faire À LA PLACE : **INSTEAD**. Le mot dit
  l'échange, et c'est tout le produit : on ne supprime pas une habitude,
  on en met une autre à sa place.
- Son intitulé de vue est **« REPULSIONS — TRIGGER »**, et le **H** du
  wordmark respire dessus comme sur les habitudes. Même lettre : c'est
  la même chose vue par son revers. Le mot sous le carré est le même que
  celui qui nomme le lien dans la boîte habitude — un seul mot pour une
  seule idée, à deux endroits.

**L'invitation « write a new one or pick an existing one » vit SOUS
CLOSE**, juste au-dessus des propositions. Au-dessus du groupe, elle
parlait de la répulsion ; en bas, elle parle des habitudes qu'on va
choisir — ce que le doigt s'apprête à faire.

**Chaque vue est complète.** On crée, on attache, on détache, on renomme
sans jamais en changer. Seul le storytelling change.

**Détacher n'efface jamais.** La croix d'une mini-boîte retire le LIEN.
Seul `[Delete]`, sur sa propre ligne, supprime la pièce.

**Tout s'enregistre en écrivant.** Aucun bouton [Done] nulle part.

### Une habitude porte PLUSIEURS intentions — 08/09/2026

`steps[].is` est la liste ; `steps[].i` reste la PREMIÈRE — c'est elle que
le serveur (`intention_of`) et le bot lisent. Tenir `i` à jour évite de
toucher à la base : aucune migration.

**Le bord gauche de la boîte les empile**, un trait par intention, de haut
en bas. Sept intentions, sept traits : le spectre d'une vie, lisible avant
d'avoir lu un mot. `.tick` est une colonne flex, chaque `i` prend sa part.

**Seules les boîtes habitude en portent.** Une couleur d'intention sur un
objectif ou une répulsion ne voudrait rien dire.

### Le rythme s'écrit dans sa langue — 08/09/2026

`deduceFreq()` existait et n'était plus branché : la liste des 33 avait
remplacé la saisie. On écrit « tous les matins », « every morning »,
« jeden Morgen », « ogni mattina » — la machine propose le rythme le plus
proche, en gros, au-dessus de la liste. **Zéro appel de modèle, donc zéro
facture** : c'est du lexique, pas de l'IA. La liste reste dessous : on
écrit OU on choisit, jamais l'un sans l'autre.

### Une deadline se retire — 08/09/2026

Poser une date était possible, l'enlever ne l'était pas. `[no deadline]`
n'apparaît que s'il y en a une, et remet `target_at` à `null`.

### Créer, c'est ouvrir une boîte — pas changer de monde

Le noir de la création a disparu. Deux fonds pour le même objet, ça se
discute à chaque écran au lieu de se lire d'un coup. Une boîte neuve porte
la couleur de sa vue — navy dans les habitudes. Le Totehm ne se quitte
jamais, même en créant.

### Deux états, et pas six

`open` et `ordering`. Le choix en cours (`pk`) vit avec le rendu. Il y en
avait cinq — `selOpen`, `intFor`, `lkFor`, `pickFor`, `editH`/`editR` —
chacun remis à zéro à un endroit différent : c'est comme ça qu'une boîte
gardait ouvert le menu d'une autre.

**Un seul écouteur, posé sur la liste, en délégation.** La liste est
redessinée à chaque geste : rattacher trente écouteurs à chaque rendu,
c'est trente fuites en puissance.

### Le prototype est ENTRÉ dans le fichier servi — 06/09/2026

Le fichier servi est resté six itérations derrière le prototype pendant un
lot entier. Ça ne se reproduit pas : le portage est un SCRIPT.

```
tools/prototype_totehm.py   compose le prototype        → totehm_unfold.html
tools/vues_totehm.js        le moteur des trois vues    → source unique
tools/port_prototype.py     injecte le moteur           → space/totehm.html
tools/hover.py              regénère les survols        (TOUJOURS en dernier)
```

Chaque remplacement est ancré sur un repère qui doit exister **exactement
une fois**. Si le fichier a bougé, le script s'arrête et dit lequel — au
lieu de coller du code à côté de sa place. **Il n'écrit qu'à la fin** :
un arrêt au milieu laisserait le fichier à moitié porté, l'état le plus
difficile à diagnostiquer. Et il **audite** : aucun appel ne doit pointer
vers du code supprimé, parce qu'un `$('id')` sur `null` lève à
l'évaluation du module et emporte tout le script, pas seulement la vue.

**L'ordre est : port → hover.** Relancer le port deux fois de suite
échoue (les repères ont disparu), et c'est voulu.

### Le Trip se lit depuis n'importe quelle boîte — 06/09/2026

Ouvrir une boîte montre le **Trip entier**, dans ses trois couleurs, et
l'ordre des blocs dépend de la vue d'où l'on vient : la pièce qu'on touche
passe en premier, c'est elle qu'on est venu voir.

| vue | ordre des blocs | les mots |
|---|---|---|
| habitudes  | habitude · objectifs · répulsions | WHY · **TRIGGER** |
| objectifs  | objectif · habitudes | HOW |
| répulsions | répulsion · habitudes | **INSTEAD** |

Les mots disent le **lien**, pas la catégorie — la couleur dit déjà la
catégorie. WHY remonte, HOW descend, TRIGGER fait dérailler, INSTEAD
remplace. (Voir « Une répulsion est une MAUVAISE HABITUDE ».)

**⚠️ ON CHANGE DE VUE EN ÉDITANT · 09/09/2026.** `setView()` refusait tant
qu'une boîte était ouverte — la règle protégeait la saisie et emprisonnait
le membre. Elle POUSSE maintenant l'écriture en attente (`pousse()`),
ferme la boîte, jette les brouillons, et passe. Rien n'est perdu : c'est
la minuterie qu'il fallait vider, pas le geste qu'il fallait interdire.

**Il n'y a plus de `[Add a Trip]`.** Un seul bouton par vue, qui crée la
pièce de CETTE vue, vide, et ouvre le triplet dessus. Les deux autres
pièces sont **offertes** — reprendre une existante (lookup) ou en écrire
une neuve — jamais imposées : une habitude sans objectif reste une
habitude, et forcer les trois empêcherait d'écrire.

**Une habitude est navy PARTOUT** — dans le noir d'un Trip, dans le
rouge-violet d'une répulsion. Mais **pas de cadre navy sur une boîte déjà
navy** : dans la vue habitudes, la boîte EST la vue, et `.h-frame` n'y
faisait qu'un double filet. Le cadre ne sert que lorsque l'habitude est
posée AILLEURS.

**Les écritures sont optimistes.** On pose la valeur en mémoire, on
dessine, on envoie. L'arbre (`my_trips`) est rechargé **à la fermeture**,
une fois : le recharger à chaque frappe fermerait le panneau sous les
doigts.

### Une répulsion protège plusieurs habitudes — 06/09/2026

C'est un **lookup**, au sens Airtable. « La procrastination » menace
quatre habitudes ; avec une seule colonne `habit_text` il fallait l'écrire
quatre fois, et quatre copies divergent toujours.

`repulsion_habits` porte les liens. `repulsions.habit_text` reste le
PREMIER lien — celui que le bot lit déjà, rien à réécrire côté bot. Un
**trigger** pose le premier lien à l'insertion, quel que soit l'écrivain :
une table alimentée seulement par le front serait vide pour tout ce qui
n'est pas le front.

Le serveur renvoie la répulsion **une fois par habitude protégée** ; le
front déduplique sur son `id` et lit `habits` pour la liste complète.
Sans ça, la vue répulsions afficherait la même pensée quatre fois.

**Détacher la dernière habitude ne supprime pas la répulsion.** Elle a été
écrite, elle se rattache ailleurs : on retire le lien, pas la pensée.

**Renommer une habitude ne l'orpheline pas** : `habit_rename_links()`
suit le texte dans les deux tables, en un appel. Le lien est du TEXTE
parce que `steps` est du texte — tant qu'une habitude n'a pas
d'identifiant en base, c'est la seule jointure possible.

### L'ordre d'importance descend jusqu'au bot — 06/09/2026

Le bouton en haut à GAUCHE du carré (trois traits dégressifs, en miroir de
la croix de repli — à droite il touchait la croix, et un clic sur deux
refermait le Totehm au lieu de classer). Un rang s'affiche à gauche du
rail, une barre dit qu'on y est.

`touch-action:none` est **obligatoire** : le geste porte une fonction
produit, on coupe le natif et on conduit en Pointer Events — un seul
chemin pour le doigt et la souris.

**L'ordre du membre gagne sur le tri par rythme.** Tant qu'il n'a rien
classé, les habitudes coulent par fréquence ; dès qu'il en déplace une,
`state.ord` passe à vrai et c'est SON ordre. Le drapeau est reporté dans
`cloudLoad` — `state` y est reconstruit de zéro, et sans ce report l'ordre
était oublié au premier chargement depuis le nuage.

Ce n'est pas cosmétique : `places_matching_habits` départage deux lieux à
classement égal par `matched_rank`, c'est-à-dire par cet ordre-là. Et le
bot le suivra.

### `window.__totehm_zone` — le diagnostic du Totehm

Comme `window.__totehm_map` et `window.__totehm_self` : vue courante,
session, arbre chargé, compteurs, filtre, boîte ouverte, mode classement.
**Des compteurs et des booléens, jamais une valeur de clé ni un texte du
membre.** C'est le bloc à coller dans la console quand un écran semble
vide — sans lui, un écran vide ne dit pas si le membre n'a rien posé, si
la session est tombée, ou si la RPC casse.

### Aucune icône dans une boîte — 06/09/2026

Une boîte porte du **texte**. Ce qui la qualifie, c'est sa COULEUR (la vue)
et sa **ligne d'unité** — jamais un pictogramme posé devant. Le T des
habitudes et des objectifs, l'onde des répulsions : supprimés.

Ce que la ligne d'unité dit, et qui manquait :

| | ligne d'unité |
|---|---|
| habitude  | **INTENTION** · PILIER · fréquence |
| objectif  | deadline · combien d'habitudes y mènent |
| répulsion | l'habitude qu'elle protège |

**L'intention est la chose la plus importante d'une habitude et elle
n'apparaissait nulle part sur la ligne.** Elle s'écrit maintenant, dans sa
couleur, suivie de son pilier — c'était ça, « on ne voit pas assez ».

**La ligne d'unité EST le contrôle** : on touche ce qu'on lit. Elle ouvre
l'aperçu si l'habitude est réglée, le choix d'intention sinon. Plus d'icône
dans la marge à viser.

### Le logo dit où l'on est — 06/09/2026

Le **O** du wordmark clignote sur la vue OBJECTIFS, le **H** sur la vue
HABITUDES. C'est la lettre elle-même qui signale : le logo n'illustre pas
l'écran, il EST l'écran. Les deux glyphes sont nommés dans le SVG servi
(`#wm-O`, `#wm-H`), rien n'est redessiné, et `<body>` porte la classe de
vue parce que le wordmark vit hors de `#stage`.

Il n'y a **pas** de lettre pour les répulsions : TOTEHM n'en contient pas,
et inventer un clignotement sans lettre serait du décor.

### Le Trip se lit sur du noir — 06/09/2026

Une boîte FERMÉE porte la couleur de sa vue. Une boîte OUVERTE est un plan
de travail — on y écrit, on y choisit, on y efface — et un plan de travail
se lit sur du **noir**. Le filet garde la couleur de la vue : on sait
toujours où l'on est.

### Une habit se crée depuis le peek, pas d'un wizard séquentiel · 03/09/2026

Le T blink de la ligne d'ajout (`#h-T`) ouvre `openNewHabitPeek()` — la
même fenêtre `#habit-peek` que pour éditer, en mode "new". Deux rangs :
TIME FREQUENCY + INTENTION. Chaque rang affiche un tiret « — » qui pulse
(`.hp-placeholder`, keyframe `hp-blink`) tant que la valeur n'est pas
posée. Le clic ouvre le picker approprié, l'autre attend. Une fois les
deux valeurs posées, l'habit est créée par le flux existant.

Ne pas revenir au wizard séquentiel (`applyFreq` cascadant vers
`showFpStage('int')` sur target='new') : le peek est le seul point
d'entrée depuis 03/09.

**Aucun gris comme surface.** Un gris sur du noir fait « application », et
`.space` n'en est pas une. Le gris ne sert qu'au TEXTE secondaire — et il
passe au blanc au survol (voir la règle du survol).

### Il n'y a plus d'iframe dans `.space` — 05/09/2026

Le contrat `postMessage` (`totehm-read-peek`, `totehm-pick-weight`,
`totehm-add-habit`, `totehm-metrics`) existait parce qu'une iframe ne peut pas
couvrir l'écran au-delà de son cadre : sur desktop elle était enfermée dans le
carré, et un voile qui s'arrête au bord du carré n'est pas un voile.

Il n'y a plus de parent ni d'enfant : il y a une page, et trois vues.
**Ne pas réintroduire d'iframe dans `totehm.html`.** Ce qui doit vivre à côté
vit dans un autre FICHIER (la Map) ou dans une VUE (les trois couches) — pas
dans un cadre.
