# space/CLAUDE.md — totehm.space : DO WITH ME (un Spot, cinq vues)

## ⛔ ÉTAT AU 03/10/2026 — LES SPACES, SANS TITRES DE VUE

Cette demande de Wah remplace les intitulés, l'auto-enregistrement et les dimensions du papier du 02/10. BUILD `2026-10-03-spaces`.

- Cinq vues, joystick, gestes, boussole, radar réduit et panneaux ordinateur : conserver. TOP planifie un space futur ; RIGHT liste les futurs ; LEFT city feed ; CENTER radar exact ; BOTTOM vidéo portrait.
- Aucun titre ou sous-titre visible de vue. Le choix d'une Habit complète reste commun aux trois vues ; fallback par ses intentions en serveur. Les définitions d'intention restent dans les Habit Boxes.
- Radar landing : papier rotatif 110 px (90 px sur petit écran court), hint et membre conservés. Radar abaissé à proximité du joystick ; boussole en coin gauche, zoom/recentrage en coin droit. Le papier navy reste une exception de marque.
- LEFT/RIGHT : papier-filtre réduit 58 px, posé (zéro animation pendant la vidéo), sans membre et sans hint. Il ouvre exactement le même sélecteur Habit. Habit Boxes du feed : ombre sombre autorisée.
- Identité : Quantico Coral #fbd5ca. Verso : nom dans une box noire arrondie ; les noms de créateurs aussi. Aucun point/carré membre. Pas de T statique centré ajouté.
- BOTTOM prépare la caméra ; texte « Share a space to your Totehm ». Aucun décompte ni REC automatique : appui volontaire sur le point rouge navy. STOP = le carré rouge du joystick. Vidéo ≤33 secondes, portrait Full HD et pipeline Bunny préservés.
- Après la vidéo : `#cam-body` est un frère des vues, hors de leur ancêtre transformé ; plein écran 100dvh, noir rgba(0,0,0,.86), défilement natif contenu, label DURATION. Aucune navigation derrière le formulaire (gestes, wheel, flèches, joystick), focus/Tab dans le dialogue ; Record again et Cancel explicites.
- TOP mobile : `#v-plan` z-index 20 au-dessus du canvas z-index 10 ; tout son panneau est exclu des gestes de navigation. Date/heure, lieu dans le radar et droits progressifs restent fonctionnels.
- Détail radar : un space seul, poignée visible et glissé vers le bas (poignée ou contenu au sommet du scroll). Garder [CLOSE], animation montée/descente ; joystick désactivé en sourdine et retour après fermeture. Le scroll du détail reste natif.
- City feed [go] seulement pour SHARED·ON : `spot_get` à l'appui, droits ACTUELS du créateur vérifiés. Coordonnées autorisées → itinéraire ; sans abonnement → détail ville/explication, aucun lien exact ni coordonnées dans le DOM.
- UI : « space » / « spaces ». Les noms internes Spot, tables, RPC, liens `?spot=id` et contrats Bunny restent compatibles. COM propose My spaces, historique propriétaire paginé.
- Vérifier `tests/browser/space.mjs`, `spaces_ui.mjs`, `space_video.mjs`, `space_performance.mjs`. Comptes/réseau simulés ; vidéos locales encodées/ffprobe, pas de compte QA ni contenu de production créé.

## LE PAPIER · 02/10/2026

- Le papier rotatif remplace visuellement Habit Box · all ; garder `#habit-filter` caché et tout son câblage. Même sélecteur, rendu et RPC.
- Une seule Habit (`S.habit`), commune aux trois vues horizontales ; All Habit Boxes efface le choix.
- Premier enfant de `#heading` : dimensions et visibilité remplacées par la demande du 03/10 ci-dessus. Rotation seulement sur radar ; petit filtre posé dans les vues latérales.
- Tap sur les deux faces : `poser` puis ouvrir ; re-tap : fermer et réveiller. Glissé >7 px : rotation, clic avalé, aucune navigation.
- Verso : `me && PSEUDO`, sinon Tap to open it ; `textContent`, Quantico mesuré, peint par `paintMember`, aucune lecture réseau supplémentaire.
- Copier le moteur du papier du 25/09 : ressort, rotation, dérive, souris, glissé/lancer ; retirer entièrement son gyroscope. La boussole du radar reste seule.
- Aucun `data-com` : le papier ouvre uniquement les Habits. Exclure la scène des deux chemins de gestes et de la fermeture extérieure.
- Posé tant que le sélecteur est ouvert ; zéro rAF hors radar, onglet caché ou mouvement réduit. Sélecteur placé sous la hauteur mesurée de l'en-tête.
- Hint selon la Habit, caché pendant l'ouverture ; diagnostic `paper` = booléens et compteur, jamais le pseudo. Aucun CDN ni fichier ajouté.

> Chargé automatiquement quand on travaille dans `space/`. Les règles
> transverses sont dans le `CLAUDE.md` de la racine ; l'histoire dans
> `docs/POSTMORTEMS.md`. Sections déplacées TELLES QUELLES de l'ancien
> `CLAUDE.md` le 30/09/2026, les plus récentes d'abord : un renvoi « plus
> haut » peut viser la racine ou un autre dossier. Fichier : `index.html` (≈104 Ko depuis le 01/10, navigation restaurée : `rg -n` puis lecture par plage) ; `cities.json` (Natural Earth, 1 251 villes).

## ⛔ DERNIÈRE DEMANDE · 02/10/2026 — Shorts verticaux et fluidité

Cette section fait autorité sur TOUTES les anciennes consignes SPACE. Ne
jamais enlever les cinq vues, le joystick, les gestes ni les panneaux
ordinateur pour simplifier le contenu. BUILD `2026-10-02-paper`.

| position | titre · sous-titre | parcours |
|---|---|---|
| TOP | PLAN A SPOT · I WILL BE HERE | Habit de MON Totehm, droits progressifs, date/heure futures, lieu choisi DANS le radar, durée et commentaire ; `spot_schedule`, vidéo facultative |
| LEFT | CITY FEED · I AM HERE / I WAS THERE | vidéo verticale de la ville et alentours ; pas de radar ni de commandes de carte DANS le fil |
| CENTER | RADAR · Exact places I can see | sélection d'une Habit Box personnelle, sans texte de recherche ni filtres d'intention verticaux ; point cliqué = CE Spot seul |
| RIGHT | FUTURE SPOTS · I WILL BE HERE | uniquement les futurs lisibles, pagination date + id ; ville ou lieu exact selon le serveur |
| BOTTOM | FILM A SPOT · I AM HERE / 9:16 / up to 33 seconds | caméra préparée, REC volontaire, vidéo ≤33 s, puis Habit et droits ; joystick = REC rond rouge / STOP carré rouge |

Les titres et sous-titres de cette table sont historiques et masqués depuis le 03/10. Une Habit sélectionnée reste commune
aux trois vues horizontales. `space_discover` cherche le NOM COMPLET de
cette Habit ; seulement si aucun Spot lisible ne correspond dans cette vue,
il cherche les intentions de MA Habit. Le sous-titre dit « Same intention ».
Sans Habit, toutes les intentions restent découvrables. Aucun filtre LOVE
persistant ou restriction invisible après suppression des sept boutons.

**Habit Boxes = COM**, fermées, en lecture seule : texte, sept intentions
avec leurs définitions, les 33 fréquences EXACTES de COM, lieu habituel,
mini-boxes WHY (objectifs, blue) et TRIGGER (répulsions, rep). `space_habits`
relit SA propre structure en base, sans reconstituer des liens côté client.
Le snapshot du Spot conserve la fréquence, le step, le lieu habituel et les
liens. Le contexte complet n'est rendu qu'au propriétaire : un Spot public
ne révèle jamais un Totehm privé ni le lieu habituel personnel de son auteur.

**Création progressive**, même règle pour présent et futur :
1. PRIVATE / SHARED, après la vidéo et la Habit pour le présent.
2. Si SHARED : ON « for the subscribers » / OFF « for the audience ».
3. Si ON : SILENT « Nobody disturb me » / SOCIAL « We can talk ».
4. Durée et commentaire ; pour le futur, date, heure et lieu aussi.
PRIVATE et SHARED·OFF n'imposent PAS SILENT/SOCIAL. Changer la visibilité
remet les choix dépendants à zéro ; OFF ne transmet ni n'affiche de mode.
La validation serveur applique la même règle, pas simplement le HTML.

**Navigation** : croix, chevrons, joystick glissé / tapé, flèches clavier,
souris, trackpad horizontal ET vertical (petits deltas, inertie verrouillée),
tactile. Depuis une vue latérale, un geste horizontal dans les DEUX sens
revient au radar. Le défilement vertical natif reste prioritaire. Les touches
emploient touchstart/move/end : un pointercancel de pan-y ne perd plus le
retour au centre. Pointer Events restent pour la souris, le joystick,
le pincement, la couronne et le déplacement du lieu.

**Boussole** : couronne graduée N/E/S/W, rotation manuelle, cap en degrés et
point cardinal ; toucher le cap revient au nord. Le cap de l'appareil ne
s'active qu'après un clic volontaire (permission iOS si demandée), reste
facultatif et ne bloque pas la rotation manuelle. Aucun cap de Spot sans
son point exact autorisé.

**Radar / panneaux** : ordinateur ≥900 px, gauche/droite 420 px, haut/bas
centrés depuis leurs bords ; radar toujours visible dans la place restante.
TOP réduit également le radar sur mobile, au-dessus du panneau. Choisir un
lieu déploie les tuiles OSM DANS son cercle : croix au centre, pan/pinch/zoom,
nom facultatif, Use this place / Cancel. Après validation, le lieu reste
marqué DANS le radar. Conversion Mercator aller/retour testée, pas de décalage
de longitude. LEFT mobile reste plein écran sans radar derrière la vidéo.

**Joystick COM** : blue #36498c, navy #333366, rep #743169. En BOTTOM,
le joystick remonte, son FOND reste NAVY, le contrôle est rouge (rond puis
carré), aucun Stop séparé. Les boutons s'ajustent au texte, pas d'étirement
horizontal ou de padding géant pour compenser le layout.

| lecteur | PRIVATE | SHARED·OFF | SHARED·ON |
|---|---|---|---|
| propriétaire | tout, point exact | tout, point exact | tout, point exact |
| abonné actif de CE créateur | rien | Habit, ville, vidéo publique | + point exact et nom du lieu |
| tous les autres | rien | Habit, ville, vidéo publique | Habit, ville, vidéo publique |

Même droits avant, pendant et après : `will` → `am` → `was`, calculés depuis
starts_at / ends_at. Aucun ancien accès Club, capacité, candidature ou match %.
Le lieu précis ne sort que dans `exact`. La table `spots` reste grossière
à 0,1° ; `spot_plans` reste RLS sans politique, fonctions avec search_path fixé.

**Vidéo = Short vertical, toujours 9:16**, téléphone ET ordinateur. La
caméra demande 1080 × 1920 / 30 fps, caméra arrière. Garder le flux NATIF
si ses images brutes sont déjà 9:16, sans canvas ni demande 4K systématique.
Les adaptations `crop-and-scale` du navigateur ne suffisent pas : certains
encodeurs reprennent le paysage brut malgré l'aperçu vertical. Sinon,
`video-capture.mjs` recadre au centre AVANT le seul encodage ; une source
paysage plus grande n'est demandée que si nécessaire au vrai crop Full HD.
Ne pas étirer ni agrandir une source insuffisante. Le fichier réel reste
portrait même si la caméra ou
l'écran est paysage ; audio conservé. Autofocus/exposition/balance continus
si le matériel les propose. Privilégier un codec fluide/économe testé par
MediaCapabilities quand disponible, H.264 en premier si accepté, pas VP9
systématique. MediaRecorder demande 10 Mbps + audio 192 kbps ;
33 s comptées depuis MediaRecorder.onstart (pas le lancement de l’encodeur),
enveloppe 48 000 000 octets, arrêt avant débordement. Vérifier les
dimensions du clip enregistré avant de le proposer à la publication. Un
fichier vide/illisible propose Again et ne peut pas être publié.
Cadres vidéo 9:16 dans le feed, le détail et la caméra desktop ; joystick
REC/STOP conservé. La qualité finale reste liée au matériel et à la lumière.

Bunny : création server-side, signature TUS par vidéo et par propriétaire,
binaire direct vers Bunny (chunks repris après panne), HLS signé par dossier.
Hls.js 1.6.13 local chargé en parallèle de l'autorisation si MSE disponible.
Qualité initiale selon le débit, puis adaptation automatique : conserver
le Full HD quand le réseau le permet, sans forcer 8–10 Mbps à tous ni cap
à la petite taille CSS du panneau. Le HLS natif lit le MASTER adaptatif.
Aucune URL hors du dossier signé. Une première image basse résolution
sur réseau lent est acceptable si elle monte ensuite ; éviter les gels.
Rien ne part vers Bunny avant configuration de la lecture protégée. Les
clips Storage restent lisibles par URL signée dans `moments` PRIVÉ ; la
capture Full HD corrigée fonctionne aussi avec ce stockage.

**Feed fluide** : un seul clip joue. Après son démarrage, préparer UN clip
suivant ; garder au maximum précédent/actuel/suivant, libérer les autres.
Pas de lookahead en Save-Data/2G ni avant d'ouvrir le feed. HLS suivant :
petit buffer (2 s visés, un segment peut dépasser) ; Storage/natif : metadata
seulement, hint que le navigateur peut ignorer. Les lectures anticipées
passent par les mêmes autorisations serveur. Appender la pagination, ne
jamais reconstruire les lecteurs existants. Un rafraîchissement aux mêmes
IDs/médias ne remplace que les informations, garde le défilement et la vidéo.
Annuler les réponses obsolètes,
renouveler une signature expirée ; purger lecteurs/cache au logout ou en
arrière-plan. Le radar reste visible desktop mais son animation descend à
15 fps derrière le feed, 10 fps derrière la caméra (60 pendant la transition).
Boussole et positions DOM seulement quand elles changent ; effacer seulement
la surface précédemment dessinée. Onglet caché : radar/lecteurs suspendus.
Clip encore en encodage : relire après 1 s, puis 2 s, 4 s, plafond 5 s ;
annuler ce polling dès que la vidéo n'est plus active. Pas de délai initial
fixe de 5 s après un encodage déjà terminé.

**Publication** : après confirmation, position/ville et upload se font en
parallèle, aperçu en pause ; spot_create attend les deux. Un upload terminé
reste privé et réutilisable si la localisation ou la publication échoue.
Ne pas annoncer un envoi instantané : 33 s à 10 Mbps ≈42 MB avec le son,
avant encodage Bunny. Diagnostic __totehm_space().video : millisecondes,
frames décodées/perdues, nombre de lecteurs ; aucune donnée personnelle.
Un fichier HTML conserve les cinq vues ; extraire des modules ciblés aide
l'entretien, ne remplace pas le pipeline capture/encodage/CDN/ABR.

État mesuré 02/10 après connexion du compte : API bibliothèque et compte 200,
CDN Token Authentication ON, pas d'IP locking ni de dépendance au Referer ;
webhook HMAC configuré. `video_backend` privé ready, `spot_rules` provider bunny.
Seul ready active Bunny ; sinon Storage conserve les droits et la capture HD.
La sonde non signée porte un Referer pour tester vraiment le jeton ; la
sonde signée fonctionne sans Referer. Une bibliothèque vide renvoie 404 signé,
403 sans jeton ; ce contrôle ne remplace pas un essai vidéo réel.
`bunny-webhook` vérifie HMAC-SHA256 du corps BRUT avec la clé lecture seule ;
aucun callback non signé n'écrit. Une résolution HD terminée peut devenir
ready sans attendre toutes les autres. Aucune clé ne touche le navigateur.
Le test d'un nouveau Spot Bunny réel reste à effectuer ; SYSTEM.md §0.

Règles : 24 Spots/jour, 10 futurs, horizon 90 jours ; durée 5–720 min.
UI sombre, Space Mono / Quantico ; perforation navy seulement au NOM du
Totehm, by à côté ; Simple terms of use toujours en dernier du menu membre.
Console sur COM, bot séparé ; aucun prix ni paiement changé dans ce lot.

Tests : `tests/browser/space.mjs`, `space_video.mjs` (caméras portrait ET
paysage, fichier réellement envoyé décodé et sondé, son/recadrage sans
déformation, HLS trois résolutions via Hls.js ET natif, connexion lente ;
Bunny simulé), `space_performance.mjs` (vrai mouvement, attente réseau
simulée, anticipation/pagination/libération ; aucune promesse téléphone),
`tests/sql/spots_selftest.sql`, `space_future_selftest.sql`,
`space_habits_video_selftest.sql` (annulés, attendu FAIL={}). Migrations du
lot : `space_compass_habits_bunny`, `space_bunny_upload_reservation`,
`space_exact_habit_selection`, `space_portrait_hd_video` (02/10, déjà appliquée).
État réel / journaux : backend/SYSTEM.md §0.

| intention | définition COM | pilier |
|---|---|---|
| Fight | Conquer yourself through harder effort. | BODY |
| Flow | Liberate energy through movement. | BODY |
| Enrich | Master your wealth through capital & network. | MENTAL |
| Love | Contemplate life through connection & beauty. | SPIRIT |
| Express | Give form to emotion through creation. | SOUL |
| Focus | Master your mind through deep mental focus. | MENTAL |
| Celebrate | Elevate energy through collective effervescence. | SOUL |

> Les sections du 30/09 et avant sont HISTORIQUES. Elles ne réactivent
> ni les sept filtres verticaux, ni le futur interdit, ni les accès Club.

## ⛔ ÉTAT AU 30/09/2026 — DÉPASSÉ LE 01/10 (voir au-dessus)

**⚠️ LE RADAR N'A PLUS DE CARTE.** Anneaux, points, la couronne — ni
terre, ni villes, ni rue. La rue (tuiles OSM) ne revient QUE pour poser un
rendez-vous (Create → « place it on the map », `mapMode()` = `PIN.on`).
Toucher le radar ne crée plus rien ; **un Spot ne naît plus d'un Spot**
(« Do it again » est parti).

**⚠️ SHORT-LIVE = UN MOMENT ; SPOT = UNE EXPÉRIENCE.** Même table
(`spot_plans.kind`), deux natures. Un moment : 5 s filmées maintenant, une
Habit Box de MON Totehm pour contexte (relue en base), social/silent, le
**bouclier GPS** ; une heure « I am here », 24 h dans le fil
(`moments_feed`), 12 par jour. Personne ne rejoint un moment. La manette
TOUCHÉE à gauche = REC (`recStart`, une seule machine pour le moment, la
vidéo d'un Spot à la création, et après, `spot_video_set`). La vidéo va
dans le seau public `moments`, dossier `<uid>/` (politique d'insertion),
et **rien ne s'y attache si le fichier n'y est pas** (`_clip_ok`).
**Egress (historique, remplacé par le lookahead borné ci-dessus)** :
`IntersectionObserver`, jamais le fil entier. La caméra exige
`camera=(self), microphone=(self)` dans `space/vercel.json`.

**⚠️ LE BOUCLIER.** OFF : la ville et le contenu pour tous, jamais le
point. ON : le point exact aussi pour les **abonnés vivants** du
créateur. **ON n'est pas une invitation.** Le point exact d'une
expérience reste au créateur et aux acceptés, quel que soit le bouclier.
La position publique est arrondie à ~1,1 km (2 décimales). La ville vient
de Natural Earth (`cityNear`) : zéro géocodage.

**⚠️ LE TEMPS DIT « I ».** `I will be here` · `I am here` · `I was here`
(`state` rendu par le serveur) — jamais upcoming, live, archived.

**Search = `[ Habit ▾ ]` et UN contrôle** (habit · mood/music · mode ·
date · time · distance). Mots, mode, jour, intention filtrent en base ;
l'heure et la distance filtrent la liste reçue (zéro requête par clic).


### ⛔ TOTEHM.SPACE — YESTERDAY = TOUS LES ANCIENS SPOTS · LE NAVY = LE TOTEHM · 28/09/2026

> **⚠️ DÉPASSÉ LE 30/09 SUR TROIS POINTS** — voir **LA SOURCE UNIQUE** plus
> haut : la gauche n'est plus YESTERDAY mais SHORT-LIVE (les moments,
> `moments_feed`) ; « Do it again » est parti (un Spot ne naît plus d'un
> Spot) ; `spots_past` reste en base, plus lu par la page. Le navy
> réservé au Totehm reste vrai.

**La demande de Wah :** « La partie YESTERDAY, c'est tous les anciens
Spots. TOUTE la partie My Spots va dans l'espace membre. Remets EXACTEMENT
le système d'intention comme avant. Le bleu navy, c'est seulement les
boîtes du Totehm. » `space/index.html`, `club/index.html`,
`club/console.html` (`BUILD='2026-09-28'`), migration
`20260928_space_hier_tous.sql`.

| | le 27/09 (faux) | depuis le 28/09 |
|---|---|---|
| YESTERDAY (gauche) | MON histoire (`my_space`) | **tous les Spots terminés autour de la carte, depuis un an** (`spots_past`), jour par jour, sur la carte aussi ; chacun se refait |
| My Spots · joined | la vue YESTERDAY | **le coin membre** (My space) : Cancel, On the map, Withdraw, Do it again |
| les sept intentions (Search) | des pastilles Bebas | **les rangées du 26/09** (Space Mono, pastille, slogan Higher, pilier, la phrase) ; choisie → en tête + sept points + `all seven` |
| un filtre choisi | fond navy | fond **blanc**, texte noir |
| la manette de l'Espace | navy / bleu clair / rouge-violet | **grise** |
| les trois clés (My space) · le Club | boîtes navy, bleu clair, rouge-violet | **grises** ; filet vert (`.on`) = actif |

**⚠️ LE NAVY, LE BLEU CLAIR ET LE ROUGE-VIOLET SONT LES COULEURS DES
BOÎTES DU TOTEHM, ET D'ELLES SEULES.** Une habitude (la boîte-action d'un
Spot est une Habit Box), un objectif, une répulsion, une sagesse, une
vision, les mini-boîtes, la tuile du NOM d'un Totehm, et Reveal the Box
(qui montre une boîte). Jamais un filtre, un accès, un abonnement, un
solde, une porte, une manette. **Exception assumée : le badge Higher**
(slogan de marque, tracé sur son carré navy perforé) — et la manette de
`com/totehm.html`, dont les tuiles SONT les vues du Totehm.

**⚠️ `spots_past` EST LE MIROIR DE `spots_radar`, MÊMES RÈGLES DE
LECTURE.** Position publique arrondie pour tous ; créateur, contexte et
mot pour un membre ou le créateur ; point exact au créateur et aux
acceptés ; la compatibilité en un total ; la recherche par mots s'arrête
à ce que le lecteur peut lire. `again` (le lecteur est membre) sort du
serveur : la page ne recompose pas le passeport. Refaire le Spot d'un
autre pose le lieu et le format, **avec MON habitude**.

**Le globe ne montre que ce qui vient** : dans YESTERDAY, au-dessus de
80 km, la lecture dit « zoom in to read yesterday ».

**Le diagnostic** `__totehm_space()` : `build: "2026-09-28"` ; `spots`
compte les anciens Spots dans YESTERDAY.

### ⛔ TOTEHM.SPACE — YESTERDAY · TODAY · TOMORROW · 27/09/2026

> **⚠️ DÉPASSÉ LE 30/09** — le centre s'appelle RADAR et n'a plus de
> carte (plus de rue dès l'arrivée) ; le toucher ne crée plus de Spot ;
> TOMORROW s'appelle SPOTS. Le rendez-vous en plein écran reste : c'est
> désormais le SEUL endroit où la rue s'affiche.

> **⚠️ DÉPASSÉ LE 28/09 SUR TROIS POINTS** — YESTERDAY montre TOUS les
> anciens Spots (plus mon histoire, partie dans My space), les intentions
> de Search reprennent les rangées du 26/09, et le navy ne sert plus
> qu'aux boîtes du Totehm. Voir la section du 28/09 juste au-dessus.


**La demande de Wah :** My Space dans le coin membre, la recherche en bas,
la carte dès l'arrivée, créer un Spot en touchant la carte, un rendez-vous
qui se pose enfin au téléphone, et une grammaire (polices, saisies, tuile)
qui vaut aussi pour le Club. `space/index.html` (`BUILD='2026-09-27'`),
`club/index.html` + `club/console.html` (`BUILD='2026-09-27'`), migration
`20260927_space_hier.sql`.

| cran | titre (Bebas Neue) | ce qu'il montre | la carte |
|---|---|---|---|
| centre | **TODAY** | la carte de ce qui se passe aujourd'hui ; **la toucher hors d'un Spot = créer un Spot ICI, aujourd'hui** | pleine, fond de rue dès l'arrivée |
| haut | **CREATE A SPOT** | la boîte-action ; le lieu et le jour déjà posés si l'on vient de la carte ou d'hier | **en sourdine** (petite, pâle) |
| bas | **SEARCH** | la barre, les jours, le mode, les sept intentions (+ Higher, + la phrase) — quittés de la droite | **en sourdine** |
| gauche | **YESTERDAY** | ~~mes Spots et ceux que j'ai rejoints~~ → **tous les anciens Spots** depuis le 28/09 (`spots_past`) ; chacun se **refait** (`Do it again`) | pleine |
| droite | **TOMORROW** | ce qui vient, jour par jour, sans filtre | pleine |

**⚠️ MY SPACE EST DANS LE COIN MEMBRE (haut gauche).** Mon nom de Totehm
(Quantico, sur la tuile perforée — il ouvre mon Totehm), mes accès, mes
limites, **qui attend ma réponse** (le nombre est sur le coin), la
console, la sortie. Le coin porte un **point blanc**, le même objet que
« toi » au centre de la carte (plus de point vert).

**⚠️ LE RENDEZ-VOUS SE POSE EN PLEIN ÉCRAN.** « Tap on the map » était un
timbre-poste au téléphone. [◎ place it on the map] : la carte prend
l'écran, une **croix FIXE** au centre, et c'est la carte qu'on déplace
dessous (doigt, souris, deux doigts au trackpad, flèches), on pince, on
valide [Here]. Précis partout, et la manette disparaît le temps du geste
(`body.pin`, `PIN.on` : aucune vue ne change pendant qu'on vise).

**⚠️ PRE — CE QU'UNE CRÉATION REÇOIT AVANT SON HABITUDE.** Toucher TODAY
pose `{lieu, today}` ; `Do it again` pose `{habitude, lieu, heure, durée,
places, sélection, nature, mode, accès, mot}`. `pickHabit` l'applique ;
si l'habitude d'hier est encore dans mon Totehm, elle est choisie
d'office — il ne reste que le JOUR. Un Spot REJOINT se refait avec le
lieu et le format, mais avec MON habitude (`spot_publish` relit mon
Totehm, jamais celui d'un autre).

**⚠️ LA TUILE PERFORÉE NAVY = LE NOM D'UN TOTEHM, ET RIEN D'AUTRE**
(`.tname`, Quantico) : mon nom, `by <créateur>` sous une boîte-action
(il ouvre ce Totehm via le pont, `?ro=`), les noms dans la console.
Boutons et saisies : **gris, arrondis** (`border-radius:10px`). Un test
navigateur MESURE que seuls les `.tname` portent un `border-image`.

**⚠️ LE % DIT CE QU'IL EST** : `62% · match with my TOTEHM`, et « How it
works » l'explique (un nombre, jamais le détail ; un Spot contre un
Totehm, jamais une personne contre une personne). How it works met le
**Spot d'abord**, le site ensuite.

**⚠️ LE SURVOL AGRANDIT, LA LOUPE AU TÉLÉPHONE.** Sur ordinateur, la
boîte visée grandit (`scale(1.022)`, texte compris) ; au téléphone, une
loupe sur chaque boîte l'agrandit d'un toucher (`zoom:1.28`).

**⚠️ LA CARTE DÈS L'ARRIVÉE A UN COÛT À SURVEILLER.** Les tuiles
OpenStreetMap sont gratuites mais sous politique d'usage : on ne les
demande qu'une fois l'échelle posée (jamais pendant un vol ou un
pincement), pas en sourdine, 220 en mémoire. Un seul endroit à changer
pour un fournisseur payant : `TILE_URL`.

**Bebas Neue n'a qu'UNE graisse** : trois niveaux (`.b1` grand + contour
0,55 px, `.b2` question, `.b3` sous-titre). Voir BRAND.md, Polices.

**Le diagnostic** `__totehm_space()` gagne : `pin`, `muted`, `search`,
`history {mine, joined}`, `pre`, `scale.map_tiles`, `gestures.pan`.

### ⛔ TOTEHM.SPACE À L'ÉCHELLE DU MONDE — LE GESTE PARTOUT, LA COURONNE, LE GLOBE · 26/09/2026

> **⚠️ DÉPASSÉ LE 27/09 SUR QUATRE POINTS** — voir **YESTERDAY · TODAY ·
> TOMORROW** : les vues gauche/bas/droite ont changé de contenu (Yesterday,
> Search, Tomorrow sans filtre), My space est dans le coin membre, la carte
> de rue s'affiche dès l'arrivée (plus seulement en création), le rendez-vous
> se pose en plein écran. Le reste (geste partout, globe, couronne, nature)
> est intact.

**La demande de Wah :** que la manette marche « comme dans totehm.html »,
jouable et « PlayStation », sur une plateforme internationale. Neuf
changements, tous dans `space/index.html` (`BUILD='2026-09-26'`) et la
migration `20260926_space_monde.sql` :

| | avant (25/09) | depuis (26/09) |
|---|---|---|
| naviguer | la manette seule | **partout** : un doigt, deux doigts au trackpad, la souris tirée sur le radar — même table `CROIX` |
| zoomer | la molette | **le pincement** (doigts ; trackpad = `wheel`+`ctrlKey` ou `gesturechange` Safari) et `+ − ◎ ?` à droite de la manette |
| la boussole | l'appareil seul | **la couronne se tourne** (inertie, un cran vibré par 45°, deux touchers = nord) ; l'appareil reste une option au téléphone |
| l'échelle | ≤ 60 km | **de la rue à la planète** : projection orthographique, au-dessus de 80 km des LUMIÈRES (`spots_globe`) ; toucher une lumière = y voler |
| les fenêtres | une colonne à droite | **chacune de son côté** : gauche ← gauche, droite ← droite, Create descend du haut et y reste, My space monte du bas ; le Spot du centre s'ouvre sur place ; **la manette ne bouge jamais** |
| le fond | quatre gris | **noir pur** ; les gris ne font que délimiter (disque, fenêtre, section, bulle) |
| la bulle de survol | dans chaque point, translucide | **une seule `#tip`**, au-dessus des points (`z-index`), d'un gris PLEIN |
| le rendez-vous | viser à l'aveugle | **un fond de rue sombre** (OpenStreetMap inversé + désaturé) sous le radar, en création seulement, avec l'attribution |
| un Spot | public par défaut | **une NATURE** : `public` (~110 m) ou `private` (~1,1 km, chez le membre) — sans réponse par défaut |

**⚠️ LA TERRE EST À NOUS, LA RUE NE L'EST PAS.** Le trait de côte et les
villes viennent de **Natural Earth** (domaine public), servis par nous
(`space/earth.json` 100 Ko, `space/earth50.json` 360 Ko, chargé sous
2 500 km) : zéro service, zéro facture. Le fond de rue vient des tuiles
**OpenStreetMap** : gratuites mais sous **politique d'usage** (usage
modéré, attribution obligatoire — `#osm`). C'est l'écart assumé au
MASTER §44 (« ni Google Maps, ni Mapbox, ni Leaflet ») : pas de
bibliothèque, pas de clé, une image par tuile, et SEULEMENT pendant la
pose d'un rendez-vous. Le jour où l'Espace dépasse quelques milliers de
créations par jour, il faut un fournisseur de tuiles payant ou nos
propres tuiles — **à trancher avant, pas après un blocage**.

**⚠️ UN GESTE SUR UN POINT FAIT PARTIE DU GESTE.** Le radar écoute
`#world`, pas le canvas : mesuré, un pincement dont un doigt tombait sur
un Spot n'arrivait jamais. Et pas de `setPointerCapture` sur un point —
son `click` doit rester le sien. Le premier doigt d'un geste (`isPrimary`)
vide l'état : un relâcher perdu ne fausse pas le geste suivant.

**⚠️ LE CONTENU DÉFILE, LA VERTICALE NAVIGUE AU BOUT.** Dans une fenêtre
qui défile, la verticale appartient au défilement ; elle ne navigue qu'au
bord, après 420 ms de calme (trackpad) ou si le doigt y était déjà
(tactile). L'inertie d'un trackpad est avalée : 260 ms de silence avant
la navigation suivante — sinon un geste en fait deux.

**⚠️ UNE FENÊTRE QUI SORT PERD SES IDENTIFIANTS TOUT DE SUITE**
(`retire()`) et son contenu une fois sortie — sauf si elle est revenue.
Six fenêtres, un seul `#res`, un seul `#g-email` : sinon c'est la
mauvaise qui répond.

**⚠️ PRIVÉ = LE QUARTIER.** `spot_publish` arrondit `spots.lat/lng` à 2
décimales (~1,1 km) pour un Spot `private`, 3 (~110 m) pour `public`
(`spot_rules().round_private/round_public`). Le lieu exact reste réservé
au créateur et aux acceptés, comme avant.

**By intention rappelle les sept** : pastille, nom, **le slogan Higher en
SVG** (`#higher-badge`, recopié de `com/totehm.html`), pilier, et la
phrase de Wah (« Conquer yourself through harder effort »…). Choisie,
l'intention reste en tête ; les autres deviennent sept points.

**How it works** (`?`, la touche `?`, les liens des fenêtres) : la
manette, le zoom, la couronne ; puis Spot, places, automatic/manual,
public/private (« dans l'infrastructure du membre »), FIGHER
members/subscribers, social/silent, compatibilité.

**Le balayage ralentit** : un tour en 14 s (il en faisait un en 6).

**Le diagnostic** `__totehm_space()` gagne : `heading`, `scale {range_km,
mode, at_home, earth, coast50}`, `cells`, `planet`, `draft.map_tiles`,
`gestures {swipe, trackpad, pinch, ring}`.

### ⛔ TOTEHM.SPACE SE PILOTE À LA MANETTE — CINQ CRANS · 25/09/2026

> **⚠️ DÉPASSÉ LE 26/09 SUR CINQ POINTS** — voir **TOTEHM.SPACE À L'ÉCHELLE
> DU MONDE** : le zoom n'est plus la molette, la manette ne suit plus le
> panneau, le fond redevient noir pur, la distance vit dans une bulle
> unique, le balayage ralentit. Les cinq crans, la boîte-action, les
> points, les miles et la sortie dans tous les états restent vrais.

**La demande de Wah :** « remets le joystick de totehm.html directement sur
l'atterrissage de totehm.space, en dessous du radar — diminue le radar,
supprime la barre de navigation. » La barre `Search · Create · My space`
n'existe plus ; le radar vit entre le nom de la vue (en haut) et la manette
(en bas), et `resize()` MESURE ces objets au lieu de recopier leurs chiffres.

**La manette est COPIÉE de `com/totehm.html`** (pavé, pile de trois ronds,
chevrons, geste, `CROIX`) — produits indépendants, fichiers indépendants.
Cinq crans, cinq vues, UNE table `CROIX` lue par le manche, les chevrons,
la molette et les flèches :

| cran | tuile | vue | ce qu'elle demande à `spots_radar` |
|---|---|---|---|
| centre (repos) | navy | **Live & today** — le radar | `p_when='today'` |
| haut | bleu clair | **Create a Spot** | (le radar du centre) |
| bas | rouge-violet | **My space** — mes accès, mes limites, qui attend | (le radar du centre) |
| gauche (sagesse) | rouge-violet | **By intention** — les sept pastilles, d'emblée | `p_intention`, tout le temps |
| droite (vision) | bleu clair | **Tomorrow & beyond** — un jour, un mot | `p_when='tomorrow'\|'next7'\|'later'` + `p_q` + `p_mode` |

Toucher le pavé sans le tirer ramène au centre. Chaque vue a son titre
(Montserrat 600 — il NOMME une partie du produit), sa raison d'être en
sous-titre, et la lecture de l'instrument en troisième ligne (Space Mono :
ça se mesure).

**⚠️ L'ERREUR DE TOTEHM.HTML — LA MOLETTE HORIZONTALE DANS LE PAVÉ.**
`deltaX > 0 ? 'd' : 'g'` (« contenu, pas doigt ») : deux doigts vers la
gauche SUR le joystick envoyaient à droite, à l'opposé du manche tiré au
même endroit. Une molette horizontale est presque toujours un trackpad,
donc un geste de DOIGTS : `deltaX > 0` → gauche, dans les deux fichiers.
La verticale reste celle d'une molette de souris.

**⚠️ LA BOÎTE-ACTION N'EST PLUS LA BOÎTE-HABITUDE.** Au CHOIX de l'habitude
(Create, étape 1) : la Habit Box de totehm.com, rythme compris. Devenue
action, dans l'ordre, dans une boîte navy au format Habit Box :

1. le nom (Quantico 15) ;
2. intentions · **date · heure · durée** (plus de rythme) ;
3. **le lieu, lien Google Maps** (point exact au créateur et aux acceptés,
   sinon la position publique ~110 m — déjà montrée par le radar) · distance ;
4. **places** (`taken/capacity`) · **automatic / manual** ;
5. **social / silent** ;
6. `[details]` → un TIROIR qui prolonge la boîte : le mot du membre
   (**Quantico 400**), puis WHY (objectifs) et TRIGGER (répulsions).

Sous la boîte, jamais dedans : la compatibilité, le créateur, UNE action.
*Ceci remplace « l'instrumentation vit SOUS la boîte » du 24/09 : Wah veut
QUAND/OÙ/COMBIEN DANS la boîte, c'est ce qui en fait une action.*

**⚠️ CRÉER, C'EST OUVRIR UNE BOÎTE — COMME DANS LE TOTEHM.** La boîte-action
naît ouverte (soulevée, `scale(1.012) translateY(-2px)`), ce qui manque
RESPIRE (`.vit` : date, heure, durée, point de rendez-vous), chaque réglage
s'ouvre DANS la boîte sous la ligne qu'il règle, un seul à la fois, et on
ne redessine pas en écrivant. Seul `[Publish the Spot]` reste — publier,
c'est parler au monde. **En création, le radar est un outil** : le toucher
pose le point de rendez-vous (`unproject`, boussole comprise).

**⚠️ DES POINTS, PLUS DES T.** Un Spot est un point de la couleur de sa
première intention ; « toi » est un point blanc (plus un carré). Au survol
(ordinateur) ou au **long appui** (téléphone, 380 ms, n'ouvre pas le Spot),
l'étiquette dit **la distance en km — en miles aux États-Unis** — et le
cap (`1.2 km NE`). Les États-Unis, c'est le FUSEAU de l'appareil
(`America/New_York`…, `Pacific/Honolulu`) : zéro géocodage, zéro permission.

**⚠️ LA BOUSSOLE A UNE CONSÉQUENCE.** Au téléphone (`pointer:coarse`), elle
se PROPOSE à côté de la manette (« align · compass ») et ne s'allume qu'au
toucher : iOS exige `requestPermission()` dans un `click`, et un radar qui
tourne dès l'arrivée désoriente. Allumée, l'instrument tourne avec toi (le
haut = là où tu regardes), les Spots de ton cône (±22,5°) grossissent et
la lecture compte `N ahead`. Pas de mesure en 3 s → elle se retire, sans
un mot. Son interrupteur vit à côté de la manette : sous le radar, il
passait sous le panneau (mesuré, 390 px).

**⚠️ LES NUANCES DE GRIS.** « Trop noir pour délimiter les parties. »
Quatre valeurs : fond `#0b0b0d`, disque du radar `#121216`→`#17171c`,
panneau `#141418`, section `#1c1c21`. Une partie se détache par sa
VALEUR, jamais par un trait. Les deux coins du bas (wordmark, coordonnées,
heure de Lisbonne) sont partis : « on s'en fout ».

**⚠️ ON SE DÉCONNECTE DANS TOUS LES ÉTATS.** `[Sign out]` n'existait que
pour un membre complet : un compte sans pseudo ou sans ses trois clés était
enfermé. Il est dans la porte membre (trois états) ET dans My space, en
`signOut({ scope:'local' })` — quitter l'Espace ne déconnecte pas le
Totehm ouvert ailleurs — et l'état tombe dans la page sans attendre
l'événement réseau.

**⚠️ UNE ANIMATION ÉCRASE LE `transform`, QUATRIÈME FOIS.** Le point de
rendez-vous (`#pin`) souffle (`pulse`) : placé par `transform`, il partait
dans le coin haut gauche. Un élément animé se place par `left/top`.

**⚠️ L'HEURE AFFICHÉE EST CELLE DE L'APPAREIL** (plus « Europe/Lisbon »
en dur) : les miles supposent qu'on peut être à New York, l'heure doit
suivre. **Écart connu** : les fenêtres `today` / `tomorrow` du serveur
restent des jours de LISBONNE — identique à Lisbonne, décalé ailleurs.
À trancher le jour où un Spot existe hors d'Europe (MASTER §0.16).

**Les règles d'un Spot sont une fonction** : `spot_rules()` (10 Spots à
venir, 1–50 places, 5–720 min, 90 jours). `spot_publish` et la page la
lisent ; `my_space().limits` dit ce qui reste.

**Le diagnostic** : `__totehm_space()` → build, vue, panneau, membre, comp,
unités, boussole (dispo · allumée), Spots (démo · live · devant), filtres,
tiroirs ouverts, brouillon (complet · manques), demandes.

### ⛔ TOTEHM.SPACE EST UN COCKPIT — TROIS COMMANDES, LA BOÎTE DE TOTEHM.COM — 24/09/2026

> **⚠️ DÉPASSÉ LE 25/09 SUR TROIS POINTS** — voir **TOTEHM.SPACE SE PILOTE
> À LA MANETTE**. Les trois commandes sont devenues les cinq crans d'une
> manette ; l'instrumentation d'un Spot est entrée DANS la boîte (date,
> heure, durée, lieu, places) ; les T sont devenus des points. Restent
> vrais : la boîte COPIÉE de totehm.com, la recherche en base par mots,
> l'échelle qui suit la majorité, une demande = une personne.

**La demande de Wah, au mot près :** « un cockpit spatial ultra
minimaliste, ultra-fonctionnel et SURTOUT ultra-compréhensible — plutôt
que dix boutons, en mettre trois et afficher les autres au fur et à
mesure. Il ne doit ressembler ni à totehm.com ni à la boutique : c'est UN
RÉSEAU SOCIAL. Mais il reprend EXACTEMENT les boîtes de totehm.com, dans
sa propre infrastructure. »

**Deux couches, et elles ne se mélangent pas :**

| la couche | d'où elle vient | ce qu'elle porte |
|---|---|---|
| **l'infrastructure** — le cockpit | propre à l'Espace | noir, un instrument (le radar) au centre, des lectures aux bords (état, coordonnées, heure de Lisbonne), TROIS commandes, un panneau |
| **le contenu** — la boîte | COPIÉE de `com/totehm.html` au pixel | le tick d'intentions, le nom en Quantico 15 px, la ligne d'unité (intentions en couleur · rythme), les groupes WHY / TRIGGER, les mini-boîtes bleu clair et rouge-violet |

Le CSS `.habit` · `.tick` · `.h-body` · `.v-name` · `.v-sub` · `.v-int` ·
`.v-frq` · `.mg` · `.mg-l` · `.minis` · `.mini` · `.m-o` · `.m-r` est
**recopié** de `com/totehm.html` (produits indépendants = fichiers
indépendants). **Un seul écart, et il est d'infrastructure** : pas de rail,
donc `margin-left:0` et le tick à `left:0`. Le test navigateur MESURE la
boîte (police, taille, couleur, padding, groupes) : si `totehm.com`
change sa boîte, l'Espace doit être recopié — sinon ce ne sont plus les
mêmes boîtes.

**L'instrumentation d'un Spot vit SOUS la boîte, jamais dedans** :
`TOMORROW 07:00 · 50 MIN · 1.1 KM · 1/8 · SOCIAL`. La boîte dit QUOI (la
même chose que dans le Totehm) ; la ligne dit QUAND, OÙ, COMBIEN.

**⚠️ TROIS COMMANDES, JAMAIS DIX.** `Search · Create · My space`, en bas
au centre. À l'accueil il n'y a rien d'autre à toucher (le test compte
les boutons visibles : quatre, avec le coin membre). Tout le reste
apparaît quand on l'a demandé, à l'endroit où on l'a demandé :

- **Search** — un champ. Dessous, trois MOTS (`When · Mode · Intention`)
  qui ne déplient leurs options que si on les touche, un à la fois. Un
  filtre posé s'écrit dans son mot (`When · now`).
- **Un résultat** — fermé : la boîte et sa ligne. Ouvert (on touche la
  boîte) : la jauge de compatibilité, qui, le mood, le mot du créateur,
  et **UNE** action (`Join`, `Ask to join`, ou la raison pour laquelle
  on ne peut pas). Jamais deux boutons côte à côte.
- **Create** — UNE question à la fois : *Which habit? → When? → Where? →
  With whom?* Chaque réponse se range en haut en une ligne et se rouvre
  d'un toucher. Durée, sélection, accès et commentaire sont derrière
  « more ». La vidéo n'est plus une étape : elle vient plus tard, de My
  space (MASTER §47).
- **My space** — trois listes qui ne s'affichent que si elles ont
  quelque chose à dire, les demandes reçues d'abord (quelqu'un attend).
  Le nombre de demandes est sur la commande elle-même.

**⚠️ UNE DEMANDE EST UNE PERSONNE, PAS UNE BOÎTE.** Un pseudo et un
pourcentage. Dessiner une boîte pour une personne ferait croire qu'on
voit son Totehm (MASTER §38).

**⚠️ LA RECHERCHE EST EN BASE, PAR MOTS, ET ELLE NE CHERCHE QUE CE QU'ON
PEUT LIRE.** `spots_radar` découpe la requête en mots et exige qu'ils se
trouvent TOUS (« fight park » → un seul Spot). Tout le monde cherche dans
l'habitude, les intentions, les piliers, le mode, le rythme, le mood.
**Un membre** cherche aussi dans le pseudo du créateur, son commentaire,
ses objectifs et ses répulsions — **un invité non** : sinon la recherche
deviendrait un moyen de deviner, mot par mot, le contexte qu'on lui cache.

**⚠️ L'ÉCHELLE SUIT LA MAJORITÉ, PAS LE PLUS LOIN.** Un Spot à Carcavelos
(17 km) écrasait trente Spots du centre en une tache. La portée couvre
85 % des Spots ; les autres se posent sur le bord, à leur cap, plus
pâles. Un instrument dit « il y en a par là », il ne les cache pas.

**⚠️ UNE @keyframes SUR UNE ÉTAPE REJOUE À CHAQUE REDESSIN.** Toucher
« + » sur les places redessine le panneau : l'étape clignotait. Seule
l'étape qui VIENT d'apparaître porte `.fresh` (règle du 09/09, une
troisième fois).

**Au téléphone** le panneau monte du bas (64 % de la hauteur) et
s'arrête AU-DESSUS des commandes — sinon la liste défile sous elles.
L'instrument se réduit en haut ; la ligne d'état descend sous les coins.

**Le diagnostic** : `__totehm_space()` → build, membre, comp, panneau,
nombre de Spots et de Spots de démo, filtres actifs.

### ⛔ LES SPOTS DE DÉMO SE SAVENT DÉMO — 24/09/2026

`demo_seed()` crée dix membres `*_demo` et 32 Spots à Lisbonne, datés à
partir de MAINTENANT (jours + heure locale ; une heure déjà passée glisse
au lendemain ; deux Spots LIVE). Un complet (`Tea, no phones`), un
réservé aux abonnés (`Sparring Thursday`), des sélections automatiques et
manuelles. **Pour chaque Spot à venir d'un membre « comp », deux membres
de démo candidatent** — sinon l'onglet des demandes ne se teste jamais.
`demo_purge()` efface tout, sans toucher aux Spots réels.

**⚠️ Tout se voit** : pseudo `*_demo`, `spot_plans.demo`, et la ligne
d'instrument écrit `DEMO`. **⚠️ Les emails sont en `.invalid`** — un
domaine réservé qui ne reçoit jamais de courrier : personne ne s'y
connecte, aucun code ne part. **⚠️ `auth.users` : les jetons à `''`, pas
NULL** — GoTrue les lit comme des chaînes, un NULL casse la liste des
utilisateurs du dashboard.

Les Spots vieillissent : relancer `select public.demo_seed();` (Claude
Code, MCP) remet une semaine de Spots à partir de maintenant.

### ⛔ TOTEHM.SPACE — UN SPOT EST UNE HABITUDE À PLUSIEURS — 23/09/2026

> **⚠️ L'INTERFACE DE CETTE SECTION EST DÉPASSÉE LE 24/09** — voir
> **TOTEHM.SPACE EST UN COCKPIT**. Le deck sous 700 px, la croix et la
> manette du SELECT MODE, l'étape vidéo : partis. Les règles de BASE
> ci-dessous (spot_plans, arrondi, instantané, compatibilité, capacité,
> accès) sont intactes.

**MASTER §24-48.** `space/index.html` : le radar des Spots, Create a
Spot, My space.

**⚠️ LE SPOT RESTE UNE LIGNE DE `spots`.** Le radar historique et
HigherSelf lisent cette table : ne pas dupliquer (MASTER §71). Ce qui est
propre à l'Espace vit dans **`spot_plans`**, une table **sans aucune
politique RLS** — elle ne se lit et ne s'écrit que par fonction. Raison
mesurée : `spots` accepte l'insertion directe par tout membre connecté et
se lit par tout membre ; le point de rendez-vous et l'instantané n'y
seraient pas protégés.

**⚠️ LA POSITION PUBLIQUE EST ARRONDIE À ~110 m.** Le radar dit « c'est
par là », pas « c'est ici ». Le lieu exact ne se révèle qu'au créateur et
aux acceptés.

**⚠️ LE CLIENT ENVOIE UNE SÉLECTION, JAMAIS UN CONTENU.** `spot_publish`
reçoit le texte d'une habitude et des identifiants ; il RELIT dans le
Totehm du membre le texte, les intentions (sous-ensemble de celles de
l'habitude), les objectifs et répulsions **reliés à cette habitude**, et
le son de l'intention. C'est l'instantané (MASTER §42) : le Spot publié
ne change plus quand le Totehm change.

**⚠️ LA COMPATIBILITÉ NE SORT JAMAIS EN MORCEAUX** (MASTER §38).
`_spot_compat` est interne (`service_role`) ; seul le total arrondi part
dans une réponse. Déterministe — trigrammes (`pg_trgm`), zéro LLM, zéro
API payante — donc 0 € à un million de candidatures, et l'Espace reste
dans la doctrine de coût. 40 % intentions · 15 % piliers · 30 %
l'habitude · 15 % le contexte. **Elle mesure le Totehm de celui qui
regarde contre CE Spot**, jamais une personne contre une personne.

**⚠️ LA CAPACITÉ EST UN VERROU, PAS UN COMPTE** (MASTER §80).
`spot_apply` prend `for update` sur la ligne du plan avant de compter les
acceptés ; `spot_decide` et `spot_withdraw` prennent le même. Testé à
deux candidatures simultanées sur une place : une acceptée, une `full`.

**⚠️ SPOT ACCESS ≠ TOTEHM ACCESS** (MASTER §35). Candidater à un Spot
« subscribers » exige l'abonnement au créateur ; ça n'ouvre pas son
Totehm pour autant. Et le créateur voit un pseudo et un pourcentage —
jamais le Totehm du candidat.

**Pas de tâche cron** : les candidatures en attente d'un Spot commencé
passent `expired` à la lecture suivante (`_spot_expire`). Une tâche
qu'on oublie de planifier est une règle qui n'existe pas.

**Le radar est COPIÉ de `com/map.html`** (canvas, grille, anneaux,
balayage) — MASTER §44 : ni Google Maps, ni Mapbox, ni Leaflet. En
dessous de 700 px, un deck de cartes : même règle que la Higher Map, deux
rendus, une seule carte de contenu.

**SELECT MODE ≠ EDIT MODE** (MASTER §28). Le Totehm s'ouvre avec sa
croix, ses cinq vues, ses boîtes et ses couleurs — **en lecture seule**,
et copié, pas importé. Dans l'Espace, seule la Habit View se choisit.
