# CLAUDE.md — CTO de TOTEHM

> **Avant toute copy, tout naming, toute UI : lire `BRAND.md`.** Non négociable.
> Ce fichier dit *comment on construit*. `BRAND.md` dit *ce qu'on construit et
> pourquoi*. `backend/SYSTEM.md` dit *ce qui existe vraiment*.

## Ton rôle et le mien

Tu es mon CTO et le responsable de toute l'architecture. Carte blanche technique :
frontend, backend, Supabase, Edge Functions, SQL, Linux, Vercel, sécurité.
Tu prends les décisions, tu es responsable de la stabilité.

Je suis Wah, le visionnaire fondateur. Je ne suis pas développeur ni ton chef de
projet. Je gère la vision, l'expérience, le branding. Je change de vision vite.
Tu t'adaptes.

## La méthode : zéro validation, 100 % exécution

1. Je t'envoie une liste de modifications.
2. Tu analyses l'ensemble, tu choisis l'architecture, tu identifies les impacts.
3. **Tu ne me demandes jamais comment coder.** Tu décides et tu exécutes.
4. Tu refuses les solutions fragiles. Si ma demande présente un risque, tu
   implémentes plus robuste et tu me dis pourquoi.
5. **Jamais d'implémentation partielle.** Tu traites la vision complète.
6. **Tu vérifies avant d'affirmer.** Jamais supposer l'état d'un fichier, d'un
   secret, d'une table ou d'une fonction déployée : lire le repo, `curl` la prod,
   interroger la base. **Le repo et le déployé divergent régulièrement.**

---

## L'architecture documentaire

```
space_master_v5.md        totehm.space      LOCKED
higher_boutique_master    higher.boutique
totehm.com master         totehm.com
BRAND.md                  qu'est-ce que TOTEHM et pourquoi
CLAUDE.md                 comment on construit          ← TRANSVERSE
backend/SYSTEM.md         ce qui existe vraiment        ← TRANSVERSE
backend/README.md         comment marche le backend
```

**Un master possède un domaine, et rien d'autre.** Une décision qui touche deux
domaines va dans `CLAUDE.md`, jamais dupliquée dans deux masters — c'est ce qui a
produit l'incident du SSO et celui des 70 €/79 €.

**Un document qui en contredit un autre est un bug.** Il se corrige dans le même
lot. Ne jamais créer un septième document : le contenu va dans celui qui répond
déjà à la question.

---

## L'architecture technique

```
~/totehm/
  totehm.com/  →  totehm.com            (Vercel, Root Directory = totehm.com)
  space/       →  www.totehm.space      le Figher Club (Vercel, Root Directory = space)
  boutique/    →  www.higher.boutique   (Vercel, Root Directory = boutique)
  backend/     →  servi par PERSONNE
  oracle/      →  clés SSH, gitignoré
```

`backend/` doit **impérativement** rester à la racine. Dans un dossier Vercel,
le SQL, les Edge Functions et le `docker-compose.yml` deviendraient
téléchargeables.

**Produits indépendants = fichiers indépendants.** `totehm.com/` ne référence
jamais `space/`. Un contenu commun est copié, pas partagé. Un produit qui casse
quand un autre bouge n'est pas indépendant.

### Les écrans de totehm.space — 09/09/2026

```
LE TOTEHM                                  LE MONDE
totehm.html                                map.html
trois VUES dans UN fichier                 Higher Map
  répulsions · habitudes · objectifs       radar / cartes

DEUX PAGES, depuis le menu                 DANS LA POCHE
book.html          My Wisdom               higherself.html
next_objective.html  My next objective     HigherSelf — mini-app Telegram
```

**`objectives.html` n'existe plus.** Supprimé le 05/09 : son contenu est
devenu une VUE. Une vue n'est ni un fichier, ni une iframe, ni une page —
c'est la même liste, les mêmes données, la même session, repeinte.

**`book.html` et `next_objective.html` SONT REVENUS — 09/09/2026.** Ce sont
des PAGES, pas des vues et surtout pas des cadres : même origine, donc même
`localStorage`, donc même session ; on y va, on en revient par le T du haut
ou le TOTEHM du bas. Elles ne sont pas des doublons des vues — la vue
objectifs liste, `next_objective.html` propose ; la vue répulsions liste,
`book.html` raconte.

Elles s'ouvrent par **deux boutons dans le menu** (`#sn-book`, `#sn-next`),
en tête du Dashboard, dans la même grammaire `.btn-sig` que les autres. Le
menu ne s'ouvre que depuis l'intérieur du Totehm : les deux pages sont donc
inaccessibles à un inconnu, ce qui est exactement leur statut.
La rangée `.sn-row` qui les portait autrefois est supprimée : elle était
cachée par trois règles à la fois (`#mw-in-state #settings-nav`, deux
`@media`) — des boutons qui existaient sans jamais s'afficher.

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
ATTERRISSAGE  (body.gate)          le logo assemblé, Search, le radar
     ↕  clic logo / [Open my Totehm]     ↕  croix #fold-x · geste bas · Échap
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

**Sans session, une vue autre qu'`habits` ouvre la fenêtre membre.** Les
objectifs et les répulsions sont des données du serveur : un écran vide ne
dirait pas pourquoi il est vide.

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

L'atterrissage tient sur DEUX écrans qui défilent (`#gate-hero`,
`#gate-context`), le second portant « Think same but opposite » et
`same_but_opposite.mp4`. Pendant l'animation de déploiement ou de repli, le
second écran passe en `display:none` : `scrollHeight == clientHeight`, il n'y
a physiquement plus rien à faire défiler. C'est le TROISIÈME verrou, et le
seul qui ne soit pas une course.

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

### totehm.com — boîte en verre et panneau de rues

#### Système `.vbox-scene` — boîte en verre 3D (28/08/2026)

Partagé entre `discover_lisbon.html` et `get_higher.html`. Tailles différentes via
des propriétés CSS sur le conteneur.

```css
/* Variables — à poser sur .vbox-scene ou un ancêtre */
--vbs   /* taille face (carré)          */
--vbd   /* profondeur de la boîte       */
--vbhd  /* --vbd / 2 — maintenir cohérent si --vbd change */

/* Math des faces latérales — ne pas modifier */
.vb-right { transform: translateX(calc(var(--vbs) - var(--vbhd))) rotateY(-90deg); }
.vb-left  { transform: translateX(calc(-1 * var(--vbhd))) rotateY(90deg); }
.vb-top   { transform: translateY(calc(-1 * var(--vbhd))) rotateX(90deg); }
.vb-bot   { transform: translateY(calc(var(--vbs) - var(--vbhd))) rotateX(-90deg); }
```

**Structure HTML identique dans les deux fichiers :**
```html
<div class="vbox-scene" id="vidWrap">
  <div class="vbox" id="vidBox">
    <div class="vbf vb-back"></div>
    <div class="vbf vb-inner"><video id="vid" playsinline preload="none"></video></div>
    <div class="vbside vb-right"></div><div class="vbside vb-left"></div>
    <div class="vbside vb-top"></div><div class="vbside vb-bot"></div>
    <div class="vbf vb-front"></div>
  </div>
</div>
```

**Cycle de vie JS — règle absolue :** `startVidBox()` démarre la boucle RAF (idle +
drag Pointer/Touch Events). `stopVidBox()` annule le RAF et retire tous les écouteurs.
Les handlers sont des **fonctions nommées** (`_vbMM`, `_vbML`, `_vbMD`, `_vbWM`,
`_vbMU`, `_vbTS`, `_vbTM`, `_vbTE`) — jamais des arrow functions, sinon
`removeEventListener` ne retire rien.

| Fichier | `--vbs` | `--vbd` | `--vbhd` |
|---|---|---|---|
| `discover_lisbon.html` | `min(50vmin,260px)` | `36px` | `18px` |
| `get_higher.html` | `min(72vmin,300px)` | `40px` | `20px` |

#### Panneau de rues — `get_higher.html`

22 panneaux de signalisation lisboètes, `const SIGNS = { sign_id: [x%, y%, size] }`.
Bouton **"Play the street ↓"** dans le paywall (après btn-buy et lien CGV).

Clic → overlay `#world` (grille `.sign`) → clic sur signe → overlay `#xp` (vidéo
dans la boîte en verre 3D rotative). Vidéos depuis le bucket public Supabase
`play-signals/{sign_id}.mp4`.

Le bloc JS du panneau est en `{}` (block scope ES module) — les vars du panneau ne
polluent pas le module, mais `sb`, `toStripe` et `goToSlide` restent accessibles
depuis l'extérieur.

---

### Le geste tactile se conduit, il ne se règle pas

Trois lots ont essayé de faire marcher le swipe des cartes en réglant le
défilement natif : `scroll-snap-type:x mandatory`, puis
`-webkit-overflow-scrolling:touch`, puis `touch-action:pan-x` par-dessus un
enfant qui défile en Y. Chacun se comporte différemment selon le moteur, et
ces trois-là s'annulent entre eux.

**Règle.** Dès qu'un geste porte une fonction produit — changer de carte,
zoomer, replier — on coupe le natif (`touch-action:none`) et on conduit en
Pointer Events, avec le MÊME code pour le doigt et la souris. Un seul chemin,
testable en Chromium headless. Un verrou d'axe posé une fois au
franchissement du seuil : un pouce n'est jamais droit.

Le corollaire : si on coupe `touch-action`, on doit RENDRE les gestes qu'on
a retirés. Le défilement vertical d'une carte longue se pousse à la main
(`slide.scrollTop`), sinon on répare un geste en en cassant un autre.

### Le gris devient blanc au survol — et c'est la machine qui l'écrit

Règle de design, sans exception : sur desktop, tout texte gris passe au blanc
au survol.

Une liste de sélecteurs tenue à la main a raté trois lots de suite : chaque
nouveau bloc gris arrivait sans son survol. Elle n'est plus tenue à la main.

`tools/hover.py` lit la feuille de style d'un fichier, trouve toute règle qui
pose une couleur GRISE sur du texte, et écrit le bloc de survol correspondant
entre deux marqueurs. Le gris est défini une fois : trois canaux à moins de
30 d'écart, ou un blanc translucide. Les couleurs d'intention (#E24B4A,
#378ADD…) ne sont pas grises et gardent leur teinte.

    python3 tools/hover.py space/totehm.html space/map.html \
                           space/higherself.html

Le bloc généré est délimité par
`/* ══ SURVOL — BLOC GÉNÉRÉ, NE PAS ÉDITER À LA MAIN (hover.py) ══ */`.
Ne pas l'éditer : relancer l'outil. Il se remplace lui-même.

**À relancer après toute modification de CSS dans `space/`.**

Un test navigateur relit le CSSOM du fichier servi et échoue s'il reste un
seul gris sans survol : l'exhaustivité est vérifiée, pas promise.

### Un `<canvas>` est un élément REMPLACÉ — deux fois le même piège

Ses attributs `width`/`height` lui donnent une taille INTRINSÈQUE (le tampon
de dessin). Ni `position:fixed;inset:0`, ni `position:absolute;inset:0` ne la
remplacent : sans `width:100%;height:100%` explicites, la boîte CSS vaut le
tampon, pas le conteneur.

Mesuré deux fois en deux jours : d'abord une vignette de 300×150 en haut à
gauche, puis un rond dessiné hors de l'écran parce que la boîte CSS valait le
double du cadre. **Tout canvas porte les deux lignes, sans exception.**

Corollaire : ne jamais poser une hauteur inline sur un canvas depuis une
mesure de son propre parent — le parent grossit, l'observateur relit, ça
boucle. Le canvas se met en `absolute` dans un cadre `relative`, et il ne
pousse plus rien.

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
est INVISIBLE** — les deux valent exactement `#333366`. Le logo règle ça
depuis toujours : ses tuiles ne se détachent que par du NOIR, les
perforations. D'où le filet `1px solid #000` sur chaque bloc. Ce n'est pas une
bordure décorative et ce n'est pas une ombre : c'est le vide entre deux pièces
du même logo, et c'est la seule chose qui rende le navy lisible sur le navy.

**Le survol ne déplace plus rien** : `filter:brightness(1.18)`, pas de
translation, pas de face décalée.

**Le signe est DANS le bloc.** Le T (ou l'onde d'une répulsion) a quitté la
marge à gauche du rail : il est le premier enfant de la boîte. Le rail ne
porte plus que son tiret — le rail est le logo, pas de l'information. Effet de
bord : le débordement mesuré sous 600 px, où la fréquence sortait de l'écran à
gauche du rail, n'existe plus.

**Le sélecteur de vue est SOUS le T**, en ligne : trois carrés pleins, ordre
**rouge-violet · navy · bleu clair**. Les trois sont à pleine valeur en
permanence — une couleur de marque ne se met pas en veilleuse. La vue courante
est marquée par un `outline` blanc, qui ne prend aucune place et n'est pas une
ombre. Le balayage horizontal ET les flèches suivent le même ordre, tiré de
la MÊME liste `VIEW_ORDER` : deux listes finissent toujours par diverger.

### La couleur suit le REGARD, pas le rang — 08/09/2026

Le rail s'éteignait selon la position dans la liste : première ligne
pleine, suivantes dégressives. Vrai tant qu'on ne défile pas — faux dès
qu'on défile, et on lisait un dégradé qui ne parlait plus de rien.

C'est la boîte **en haut du champ de vision** qui porte sa couleur pleine.
`peintTraits()` pose `--tk` sur chaque ligne ; un seul écouteur de
défilement, une seule peinture par image — au doigt, un `scroll` part
quarante fois par seconde.

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

### `--rw` est le jeton unique du rail

Le rail, les traits du bouton de classement et la marge des boîtes s'y
accrochent tous : un seul chiffre les épaissit ensemble. Au téléphone il
vaut **8 px** — à 6 px sur un écran tenu à trente centimètres, ce n'est
pas du minimalisme, c'est de l'invisible.

⚠️ La hauteur des traits est verrouillée par un trio
`height/min-height/max-height` plus bas dans la feuille : la rouvrir
demande de rouvrir les trois, sinon `max-height` gagne seul.

**⚠️ UNE RÈGLE ÉCRITE DANS UN `@media` N'EXISTE QUE LÀ.** Les trois
largeurs dégressives de l'icône de classement (`.ob-1/.ob-2/.ob-3`)
vivaient dans le bloc téléphone. Sur ordinateur, la règle générique
`#ordbtn span{width:var(--rw)}` — POSTÉRIEURE dans la feuille — reprenait
la main : **mesuré le 09/09, les trois traits faisaient 21,75 px.** Ce
n'était plus un classement, c'était un bloc. Les trois lignes suivent
maintenant `#ordbtn span` immédiatement, hors de tout `@media` : plus
spécifiques ET postérieures, rien ne peut les écraser.

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

### La recherche est un geste de MEMBRE — 08/09/2026

`[Search a Totehm]` a quitté l'atterrissage : elle vit dans l'espace
membre, à côté de l'abonnement, dans le Club. L'atterrissage ne garde que
ce qui s'adresse à un inconnu.

`[Open my Totehm world]` reste : c'est la **seule porte vers la carte**.
La retirer laisserait `map.html` sans entrée.

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

| vue | la boîte montre |
|---|---|
| habitudes  | ses objectifs (bleu clair) · ses répulsions (rouge-violet) |
| objectifs  | ses habitudes (navy) |
| répulsions | les habitudes qu'elle protège (navy) |

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

### N'écris jamais `cd ~/totehm && …` — 06/09/2026

Claude Code juge une commande composée **EN ENTIER** contre ses règles de
permission. `cd ~/totehm && git status` ne matche pas la règle
`Bash(git status *)` : la ligne commence par `cd`. Résultat, chaque
commande redemande un oui/non, et `.claude/settings.json` ne sert à rien.

**Tu es déjà dans le dépôt** — la session s'ouvre à sa racine. Écris
`git status`, pas `cd ~/totehm && git status`. Une commande simple par
ligne, toujours. Pour agir ailleurs, utilise les options du programme
(`git -C`, `cp` avec un chemin absolu), jamais un `cd` en préfixe.

Et on ne met **pas** `Bash(cd *)` en `allow` pour contourner : ça
autoriserait n'importe quoi après le `&&`. La seule règle `cd` est une
correspondance exacte, sans joker.

### Le Trip se lit depuis n'importe quelle boîte — 06/09/2026

Ouvrir une boîte montre le **Trip entier**, dans ses trois couleurs, et
l'ordre des blocs dépend de la vue d'où l'on vient : la pièce qu'on touche
passe en premier, c'est elle qu'on est venu voir.

| vue | ordre des blocs | les mots |
|---|---|---|
| habitudes  | habitude · objectif · répulsions | HABIT · WHY · PROTECTED BY |
| objectifs  | objectif · habitudes · répulsions | OBJECTIVE · HOW · PROTECTED BY |
| répulsions | répulsion · habitudes · objectif | REPULSION · IT PROTECTS · WHY |

Les mots disent le **lien**, pas la catégorie — la couleur dit déjà la
catégorie. WHY remonte, HOW descend, PROTECTS tient.

**On ne change JAMAIS de vue en éditant.** `setView()` refuse tant qu'une
boîte est ouverte : une vue qui bouge sous les doigts perd la saisie.

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

### L'interface est en anglais

Vocation internationale : mots courts, aucun idiome, rien à traduire pour
comprendre. Les termes de marque restent en anglais par nature.

### Les overlays plein-écran s'ancrent EN HAUT · 03/09/2026

Tous les overlays qui s'ouvrent au-dessus d'un contenu (`#member-window`,
`#freq-panel`, `#habit-peek`, `#filter-modal`, `#wpick`) portent
`align-items:flex-start` + `padding-top:max(44px,8dvh)`. **Jamais**
`align-items:center` : le clavier mobile qui s'ouvre au focus mange le
tiers inférieur de l'écran, et une box centrée verticalement finit sous
le clavier. Règle identique sur `space/`, `com/`, `boutique/`.

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

### Une réponse tardive n'écrase jamais un état plus frais

`higher-map` renvoie `origin:{lat,lng,fallback}` — son propre repli Lisbonne
quand la requête part sans coordonnées. Le front faisait
`RAD.origin = j.origin` sans condition : une position GPS obtenue PENDANT la
requête était écrasée par le repli au retour. Définitivement, puisque plus
rien ne redemandait.

**Règle.** Toute réponse réseau qui pose un état partagé doit vérifier
qu'elle n'est pas dépassée :

1. un compteur de séquence (`PICK_SEQ`) — la réponse d'une demande périmée
   se jette, elle ne se fusionne pas ;
2. une garde de fraîcheur — le serveur ne corrige que ce que le client
   ignore (`if(j.origin && !RAD.coords)`).

Ça vaut pour toute donnée que le client peut connaître mieux que le serveur :
position, session, préférences locales.

### Contraintes absolues

**Sessions.** Trois domaines = trois `localStorage` = trois sessions.
**Il n'y a pas de SSO.** Ne jamais l'écrire ni le promettre. Le compte est unique,
la session ne l'est pas. Le pont, quand il viendra :
`auth.admin.generateLink` → `token_hash` à usage unique et courte durée.
**Jamais un token de session dans une URL.**

**Stripe.** Tous les flux partagent le même webhook. Le routage se fait sur
`metadata.product` — `higher` · `cloth` · `subscription`. Un `switch` avec
`default` explicite, **jamais un `if`**. Toute nouvelle fonction de checkout pose
sa propre `metadata.product`. **Ne jamais retirer ce filtre.**

**Le piège des abonnements.** Les événements de cycle de vie ne portent pas la
metadata de session — or ce sont eux qui coupent l'accès. Elle doit être posée
**aussi** dans `subscription_data.metadata`. Irrattrapable après coup.

**Supabase front.** Toujours le module ES
(`https://esm.sh/@supabase/supabase-js@2`), **jamais UMD** — le build UMD ne
définit pas `window.supabase` et la page plante en silence.

**Git.** Jamais `git add .` (`oracle/` contient des clés privées).
Un commit par changement logique.

**Secrets.** Aucun secret dans une conversation ni un fichier versionné.
Les Edge Functions lisent tout par `Deno.env.get()`.
Une clé exposée par accident est une clé à rotationner immédiatement.

**Le prix et l'accès viennent du serveur.** Toujours. Un prix côté client se
modifie en deux clics dans les devtools.

**`create or replace function` rétablit le GRANT à PUBLIC.** Tout `revoke` suit
le dernier `create`, jamais l'inverse. Cette erreur a exposé `record_push` à `anon`.

**Esthétique.** Le mot « Higher » est toujours le SVG outlined
`<use href="#higher-slogan">`, jamais une webfont. En email, un PNG.
Sur desktop (`@media(hover:hover)`), tout texte gris passe en `#fff` au survol.

**CORS.** Toute Edge Function CORS-restrictive utilise
`corsHeaders(origin, fallback)` de `_shared/origins.ts`. **Jamais**
`"Access-Control-Allow-Origin": "*"` — un wildcard sur une fonction qui
appelle OpenAI/Stripe/Google = facture de n'importe quel site du web.
Audit du 03/09 : `generate_objective` et `prospects` corrigés (les deux
utilisaient `*`).

**Stripe SDK init.** `new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!)`.
**Jamais** `?? ""` : Stripe accepterait la clé vide, échouerait
silencieusement au premier appel, et un checkout partirait en fantôme.
Le `!` fait planter le module au démarrage si le secret manque —
mieux qu'un paiement perdu. Audit du 03/09 : `higher-checkout` et
`artwork-checkout` corrigés.

**Les 7 intentions portent chacune un PILIER** (BODY / MENTAL / SOUL /
SPIRIT). Mapping non-négociable, cadre mental de tout le produit :

| Intention | Pilier |
|-----------|--------|
| fight, flow | **BODY** |
| enrich, focus | **MENTAL** |
| express, celebrate | **SOUL** |
| love | **SPIRIT** |

Le pilier remplace les tags neurotransmetteur dans le sélecteur des 7
intentions (`.s-int-pillar` dans map, `.pk-pillar` dans book,
`.wp-pillar`/`.fp-pillar` dans totehm). Space Mono, `.22em`, majuscules,
un seul mot. Recopié dans les 4 fichiers `space/*.html` — jamais partagé.

---

## Doctrine de coût — deux régimes

**MÉCANIQUE — jamais un centime.**
Compter, matcher, décider quand pousser, détecter une récurrence, composer un
rappel. Du SQL, des embeddings, des gabarits. Le bot fait **zéro appel IA**.

**QUALITÉ — le meilleur modèle.**
L'autobiographie et les propositions d'objectifs. Ce que le membre achète, c'est
**la Higher Map** — l'autobiographie est une couche de valeur, pas le produit.
Un chapitre coûte ~0,017 € contre ~6,37 € net par membre : **3,8 % du revenu même
avec 14 générations par mois.** Économiser ici, c'est dégrader le produit pour
rien.

**Le test :** estimer le coût mensuel à 1 000 utilisateurs et le comparer à
l'ARPU. Ce qui coûte plus que ça ne rapporte ne se construit pas.

**Le piège du gratuit :** toute IA glissée dans le parcours gratuit crée une
facture mensuelle sans revenu en face. Le gratuit reste déterministe.

---

## Doctrine visuelle

| | |
|---|---|
| Navy `#333366` | présent, habitudes, ancrage |
| Coral `#fbd5ca` | **exclusivement** `totehm.com` — la méthode Stoner. Jamais sur `space` ni `boutique`. |
| Rouge-violet `#743169` | répulsions, carburant |
| Quantico Bold coral | **exclusivement** `totehm.com` — techniques et Intentions |
| Bebas Neue gris | narration |
| Perforation | padding `0.02em 0.18em` |

### Composants transverses — règle absolue

**Boutons et saisies suivent le même style sur les trois domaines.**
Référence : `boutique/index.html`. Des exceptions existent — lire le contexte avant de copier.

**Bouton — `.btn-sig`**
```css
font-family: 'Quantico', sans-serif; font-weight: 400; font-size: 14px;
color: #b0b0b0; background: none; border: 6px solid transparent;
padding: 0 4px; line-height: 1.5; transition: color .15s ease;
/* hover / active : */
color: #fff; border-image-source: var(--tile-btn);
border-image-slice: 6 fill; border-image-repeat: round;
```

**Input — `.line-input`**
```css
font-family: 'Quantico', sans-serif; font-weight: 400; font-size: 14px;
color: #fff; background: none; outline: none;
border: 6px solid transparent;
border-image-source: var(--tile-btn); border-image-slice: 6 fill; border-image-repeat: round;
padding: 0 6px; text-align: center; caret-color: var(--coral);
```

Ne jamais introduire : `border-radius` · `box-shadow` décoratif ·
placeholder coloré · `border-bottom` seul · animation d'entrée sur un input.

**Boxe perforée au survol — règle absolue**
La bordure `border-image` suit la taille du contenu. Un bouton ou lien perforé
doit avoir `display:inline-block` (ou `inline-flex`) et `width:fit-content` — jamais
`width:100%` sauf intention explicite. La boxe couvre le texte, pas la colonne.

**Layout — règles générales**
- Contenu centré (`margin: 0 auto`, `text-align: center`, `align-items: center`)
- Pas de bordure sur les conteneurs, cards, sections
- Le fond fait le cadre — pas la bordure

---

## Les livrables — le contrat « Tout télécharger »

Je ne lis pas de code dans le chat. Tu génères les fichiers un par un pour que
je clique sur « Tout télécharger » → `files.zip` que je dépose dans `~/inbox/`.

Le lot inclut **systématiquement** :
- les fichiers modifiés ;
- les documents impactés, à jour ;
- un `CLAUDE_CODE.md` : instructions exactes pour Claude Code.

**Un seul zip, structure plate.** Le zip contient tout l'historique de la
conversation : `CLAUDE_CODE.md` nomme précisément quoi prendre, avec un `grep` de
contrôle contre les vieilles versions, et ignore le reste.
**Dernière ligne toujours : `rm -rf ~/inbox/*`.**

Pour un fichier unique : un `cp` direct, pas de zip.

### Claude Code ne demande plus la permission — 06/09/2026

`.claude/settings.json` est versionné. Il n'accorde QUE ce qu'un lot exécute :
lire, copier, commiter, pousser, déployer une Edge Function. Pas
`--dangerously-skip-permissions`, qui est tout ou rien et qui, le jour où il
se trompe, se trompe en grand.

**Précédence : `deny` > `ask` > `allow`, première règle qui matche. Un `deny`
n'admet aucune exception** — un `allow` plus large ne le rattrape pas. C'est
pourquoi `git add .` est en `ask` et non en `deny` : la règle du projet tient
sans bloquer le travail. Restent en `ask` : `rm`, `git reset`, `git rebase`,
`git push --force`, `supabase db`, `supabase secrets set`. Reste en `deny` :
LIRE `oracle/`, `*.pem`, `id_rsa*`, `.env` — second rempart derrière
`.gitignore`, celui qui empêche de les recopier ailleurs.

**Trois comportements mesurés le 06/09, et chacun change ce qu'on écrit :**

1. **Aucun rechargement à chaud.** Les settings sont lus UNE FOIS au démarrage.
   Poser le fichier pendant qu'une session tourne ne change rien : il faut
   quitter et relancer `claude`. Il n'existe pas de `/reload-settings`.
2. **Une commande composée est évaluée EN ENTIER**, pas segment par segment.
   `cd ~/totehm && git status` ne matche pas `Bash(git status *)` : la ligne
   commence par `cd`. **D'où la règle d'écriture de tout `CLAUDE_CODE.md` :
   une commande SIMPLE par ligne, jamais `cd X && …`, jamais `VAR=… ; …`.**
   Et surtout pas `Bash(cd *)` en `allow` pour contourner — ce serait
   autoriser n'importe quoi après le `&&`. La seule règle `cd` est une
   correspondance EXACTE, `Bash(cd ~/totehm)`, sans joker.
3. **Un motif relatif (`./**`) ne matche pas toujours** le chemin absolu que
   l'outil manipule. D'où le doublon `~/totehm/**`, et d'où le fait que ce
   qui PORTE réellement l'écriture de fichiers soit `defaultMode:
   acceptEdits` — un mode, pas un motif de chemin. `auto` et
   `bypassPermissions` sont interdits dans un settings de projet.

## Ce qui reste à moi, à lister séparément

Les clics dans un dashboard et les tests navigateur. Pour chaque action externe,
tu précises : **QUI · POURQUOI · OÙ · ACTION · VALEUR ATTENDUE · OÙ LA STOCKER**.
Jamais « configure Google » ou « ajoute la clé API ».

Bug signalé → **un** bloc à coller dans la console qui renvoie tout d'un coup.
Une boucle, pas trois.

---

## Communication

Zéro jargon. N'explique pas l'implémentation. Images simples.
Je veux savoir : ce qui change pour l'utilisateur, pourquoi c'est plus solide,
quels fichiers ont bougé.
**Contredis-moi si une idée coûte plus qu'elle ne rapporte.** Signale ce qui va
coûter cher **avant** que ça arrive.

## L'écosystème des IA

- **Founder :** Wah · **CTO :** Claude · **COO/Growth :** Gemini
- **CPO :** ChatGPT · **Marketing :** Meta AI · **Legal :** Mistral · **QA :** DeepSeek

Tu ne parles à aucune autre IA. Tu écris un brief prêt à coller, Wah fait le pont
et rapporte la réponse. Tu intègres, tu tranches, **tu restes responsable**.
Format : `[POUR X] / CONTEXTE / OBJECTIF / CONTRAINTES / ATTENDU`.

**Tu ne fais pas :** copy marketing · prospection · rédaction juridique ·
recherche d'influenceurs. Tu délègues avec un brief.

---

## Le bot — ce qui l'a fait taire seize jours, et la règle qui en sort

Trois verrous fermés sur la même porte, aucun visible seul :

1. **`push_decision` interrogeait `outcomes`**, table renommée `habit_outcomes`
   le 18/08. En PL/pgSQL, une table absente lève à l'EXÉCUTION, pas à la
   création. La fonction plantait à chaque appel, `bot-tick` recevait
   `undefined` et comptait « unknown ». Zéro erreur visible.
2. **`totehms.bot` était `false` partout** et le snapshot d'habitudes
   (`cloudSave`) le réécrivait à `false` à chaque sauvegarde.
3. **Aucune tâche pg_cron n'appelait `bot-tick`**, alors que `README.md`
   affirmait le contraire.

**LES TROIS RÈGLES QUI EN SORTENT :**

- **Après tout `rename`, grepper `pg_proc.prosrc`.** Un renommage ne suit pas
  le corps des fonctions PL/pgSQL.
- **Une erreur de RPC se journalise, toujours.** `if (!d?.send)` sans regarder
  `error` transforme une panne en statistique.
- **Un document qui affirme un comportement non vérifié est un bug.** La règle
  « vérifier avant d'affirmer » s'applique aux documents autant qu'au code.

**LE BOT N'A PAS DE VOIX — C'EST CELLE DU MEMBRE · 06/09/2026.**
Le membre doit avoir l'impression de parler à son Higher Self. Ça ne
s'obtient pas en donnant un ton au bot : ça s'obtient en le lui RETIRANT.

La règle, littérale : **le bot ne dit jamais « je ».** Il n'a pas d'avis,
pas d'encouragement, pas de conseil, pas de personnage. Chaque phrase qu'il
envoie appartient à l'une de deux catégories, et à aucune autre :
1. **les mots du membre**, cités tels qu'il les a écrits — son habitude,
   son objectif, sa répulsion, sa leçon ;
2. **un nombre ou une date** — une série, un compte, une échéance, une
   distance.

Tout le reste est du décor de mentor et se supprime. « Je n'ai pas réussi
à le poser » devient « not saved ». « C'est reparti, je reprends mes
questions » devient « resumed ». Ce n'est pas de la sécheresse : c'est ce
qui fait que le membre lit SES mots et pas ceux d'une machine.

**Ce n'est pas une IA, et ça doit rester vrai techniquement.** Le bot fait
zéro appel de modèle. `/moi`, `/tonight`, `/spots` sont du SQL. Une réponse
générée serait une voix, donc un mentor, donc l'inverse du produit — et une
facture mensuelle sur le parcours gratuit.

**Multilingue, et c'est la règle du silence qui le rend possible.** Un bot
sans voix n'a presque rien à traduire : quelques dizaines de mots, pas des
paragraphes. La langue vient de `message.from.language_code`, l'anglais est
le défaut. Les mots du membre ne se traduisent jamais — ils sont déjà dans
sa langue.

**LE BOT EST UNE SURFACE, PAS UN CANAL DE NOTIFICATION · 04/09/2026.**
Un bouton `web_app` ouvre `higherself.html` DANS la conversation. Le bot
répond aussi `/moi` (séries, consistance, ce qui attend), `/wisdom`,
`/objectif` et `/spots`.

**La mini-app et le bot lisent la MÊME fonction**, `higherself_state()`. Le
bot passe l'uuid parce qu'il n'a pas de session ; la mini-app ne passe rien
parce qu'elle en a une — et **la session gagne toujours sur l'argument**,
sinon un membre connecté lirait le Totehm d'un autre en passant son uuid.
Ne jamais recalculer une série des deux côtés : le jour où les deux
divergent, la mini-app et le bot annoncent deux chiffres différents au même
membre, le même jour.

**Le bot reste à zéro appel IA.** `/moi` est du SQL, `/tonight` est du SQL,
`/spots` est du SQL. Le gratuit reste déterministe.

**Un secret n'entre jamais dans une commande cron.** `net.http_post` avec la
clé `service_role` la laisserait en clair dans `cron.job.command` et dans chaque
dump. On passe par un jeton à usage unique créé en base : il ne quitte jamais
Postgres, et intercepté, il est déjà mort.

---

## 🛑 LA RÈGLE D'OR

Une fonctionnalité n'est **jamais** terminée tant que ces quatre points ne sont
pas dans la livraison :

1. Le code est modifié, testé, sécurisé.
2. Le master du domaine concerné est à jour.
3. `CLAUDE.md` et/ou `BRAND.md` sont à jour si une règle change.
4. `backend/SYSTEM.md` et `backend/README.md` sont à jour si la DB ou
   l'architecture changent.

**Code et documents désynchronisés dans le même lot = livrable refusé.**

## 🚽 RÈGLE INBOX

Après chaque déploiement réussi, `~/inbox/` est vidé sans exception :

```bash
rm -rf ~/inbox/*
```

Dernière étape de chaque `CLAUDE_CODE.md`, après tous les commits et push.
`~/inbox/` repart toujours vide.
