# POSTMORTEMS.md — les bugs qui ont laissé une règle

> **Ce fichier n'est PAS chargé automatiquement par Claude Code.** Il vit
> ici pour référence historique : quand un bug ressemble à un ancien, on
> l'ouvre pour retrouver le récit et la règle qui en est sortie. Les
> règles générales sont dans `CLAUDE.md`, l'architecture actuelle dans
> `TOTEHM_MASTER.md` et `backend/SYSTEM.md`.
>
> Chaque section est datée. Le récit et la règle y sont conservés tels
> qu'écrits sur le moment.

---

## Sommaire

- [⛔ UN FAUX SERVEUR PLUS PERMISSIF QUE LE VRAI NE PROUVE RIEN — 17/09/2026](#un-faux-serveur-plus-permissif-que-le-vrai-ne-prouve-rien-17092026)
- [⛔ LE FRONT APPELAIT QUATRE FONCTIONS QUI N'EXISTAIENT PLUS — 16/09/2026](#le-front-appelait-quatre-fonctions-qui-nexistaient-plus-16092026)
- [⛔ LE SÉPARATEUR ÉTAIT DANS L'IDENTIFIANT — 21/09/2026](#le-séparateur-était-dans-lidentifiant-21092026)
- [⛔ L'INDEX UNIQUE INTERDISAIT LA DEUXIÈME RÉPULSION — 22/09/2026 ter](#lindex-unique-interdisait-la-deuxième-répulsion-22092026-ter)
- [⛔ LE PAVÉ ET LE BALAYAGE LISAIENT LE MÊME GESTE — 22/09/2026 ter](#le-pavé-et-le-balayage-lisaient-le-même-geste-22092026-ter)
- [⛔ AUCUNE BORDURE, MÊME DÉGUISÉE EN OMBRE — 22/09/2026 ter](#aucune-bordure-même-déguisée-en-ombre-22092026-ter)
- [⛔ LA MARQUE NE BOUGE PAS QUAND LE CONTENU S'ÉLARGIT — 22/09/2026 bis](#la-marque-ne-bouge-pas-quand-le-contenu-sélargit-22092026-bis)
- [⛔ LES TITRES RENTRENT DANS LE TOTEHM — 22/09/2026 bis](#les-titres-rentrent-dans-le-totehm-22092026-bis)
- [⛔ LE CURSEUR PORTE LES TROIS COULEURS, TOUJOURS — 22/09/2026 bis](#le-curseur-porte-les-trois-couleurs-toujours-22092026-bis)
- [⛔ QUATRE FOIS LE MÊME SIGNALEMENT — ET LA VRAIE LEÇON — 22/09/2026 bis](#quatre-fois-le-même-signalement-et-la-vraie-leçon-22092026-bis)
- [⛔ ENTRÉE ENREGISTRE, PARTOUT, ET SUR LES DEUX CLAVIERS — 22/09/2026](#entrée-enregistre-partout-et-sur-les-deux-claviers-22092026)
- [⛔ LES OPTIONS VIVENT DANS LE PROLONGEMENT DU [close] — 22/09/2026](#les-options-vivent-dans-le-prolongement-du-close-22092026)
- [⛔ LE TÉLÉPHONE COUCHÉ REPLIE LE TOTEHM — 22/09/2026](#le-téléphone-couché-replie-le-totehm-22092026)
- [⛔ LE PAVÉ REND AUX RONDS LEURS COULEURS — 22/09/2026](#le-pavé-rend-aux-ronds-leurs-couleurs-22092026)
- [⛔ LA BANDE BASSE S'ARRÊTE AU-DESSUS DU CONTRÔLEUR — 22/09/2026](#la-bande-basse-sarrête-au-dessus-du-contrôleur-22092026)
- [⛔ JE M'ÉTAIS TROMPÉ D'AXE — 21/09/2026 bis](#je-métais-trompé-daxe-21092026-bis)
- [⛔ LE PAVÉ REVIENT AU DISQUE — 21/09/2026 · AXE CORRIGÉ LE MÊME JOUR](#le-pavé-revient-au-disque-21092026-axe-corrigé-le-même-jour)
- [⛔ DEUX ALPHABETS POUR LA MÊME CHOSE — 20/09/2026](#deux-alphabets-pour-la-même-chose-20092026)
- [⛔ UNE BOÎTE NEUVE N'AVAIT AUCUN ENDROIT OÙ ÉCRIRE — 20/09/2026](#une-boîte-neuve-navait-aucun-endroit-où-écrire-20092026)
- [⛔ LE PAVÉ PASSE EN TROIS COULEURS — 20/09/2026 · CORRIGÉ LE 21/09](#le-pavé-passe-en-trois-couleurs-20092026-corrigé-le-2109)
- [⛔ UN CONTRÔLEUR QUI SE DÉPLACE N'EST PAS UN CONTRÔLEUR — 18/09/2026](#un-contrôleur-qui-se-déplace-nest-pas-un-contrôleur-18092026)
- [⛔ QUAND RÉESSAYER NE SERT À RIEN, ON NE DIT PAS « RÉESSAIE » — 18/09/2026](#quand-réessayer-ne-sert-à-rien-on-ne-dit-pas-réessaie-18092026)
- [⛔ UN TITRE, QUATRE CURSEURS — 17/09/2026](#un-titre-quatre-curseurs-17092026)
- [⛔ ARRIVER AU BOUT NE FAIT RIEN. IL FAUT REPARTIR. — 17/09/2026](#arriver-au-bout-ne-fait-rien-il-faut-repartir-17092026)
- [⛔ LE TOTEHM D'UN AUTRE EST LE MÊME TOTEHM — 17/09/2026](#le-totehm-dun-autre-est-le-même-totehm-17092026)
- [LE MOTEUR DE LIENS — trois pannes, une seule cause — 09/09/2026](#le-moteur-de-liens-trois-pannes-une-seule-cause-09092026)
- [ON NE LIT JAMAIS PENDANT QU'ON ÉCRIT — 09/09/2026](#on-ne-lit-jamais-pendant-quon-écrit-09092026)

---

### ⛔ UN FAUX SERVEUR PLUS PERMISSIF QUE LE VRAI NE PROUVE RIEN — 17/09/2026

**C'est la cause de « impossible d'ajouter des Teaching », signalée
quatre fois — et de la raison pour laquelle mes tests étaient au vert
pendant ce temps-là.**

La cause n'était pas dans le code : `wisdom_text_check` exigeait
`char_length(text) >= 1`. Or les cinq objets se créent VIDES puis
s'écrivent dedans. `teaching_create('')` violait la contrainte, la
fonction levait, et la leçon n'existait jamais. `objectives` et `visions`
n'ont aucune borne basse : c'est pour ça que ces deux-là marchaient.
**`wisdom` était la seule table à dire non, et c'est pour ça que c'était
le seul bouton mort.**

Le faux serveur, lui, acceptait tout. Il avait déjà fallu lui donner de
la LATENCE le 15/09 pour rendre une course visible ; il lui fallait ses
CONTRAINTES pour rendre un refus visible. Même classe d'erreur, deux
fois.

> **La règle : un faux serveur doit refuser tout ce que le vrai refuse.**
> Avant d'écrire un test sur une table, lire ses contraintes et les
> recopier dans le stub :
>
> ```sql
> select conname, pg_get_constraintdef(oid)
> from pg_constraint where conrelid='public.<table>'::regclass and contype='c';
> ```
>
> Un test qui ne peut pas échouer ne dit rien. Il coûte même quelque
> chose : il donne la confiance qui empêche de chercher ailleurs.

### ⛔ LE FRONT APPELAIT QUATRE FONCTIONS QUI N'EXISTAIENT PLUS — 16/09/2026

**C'est la cause de « les suppressions ne fonctionnent pas », et elle a
tenu trois lots.**

`trip_create`, `trip_rename`, `trip_set_target`, `trip_close` ont été
renommées `objective_*` en base. Personne n'a repointé la page. Mesuré
dans Supabase le 16/09 : les quatre sont **absentes**. Conséquence
exacte, et silencieuse :

| le geste | ce qu'il faisait vraiment |
|---|---|
| créer un objectif | rien — `data` était `null`, la boîte s'ouvrait vide |
| le renommer | rien — le texte vivait en mémoire jusqu'au rechargement |
| poser une deadline | rien |
| le supprimer | rien — **il revenait au rechargement** |

J'avais diagnostiqué une COURSE (`EN_VOL`, `await calme()`) et le
correctif était juste — mais ce n'était pas ça. Un appel dans le vide
ressemble exactement à une course : l'écran fait le geste, le serveur
n'en sait rien, le rechargement remet l'ancien état.

**La règle qui en sort, et elle est mécanique :**

> ⚠️ **Avant de croire à une course, vérifier que la fonction EXISTE.**
> Une RPC absente renvoie une erreur PostgREST, pas une exception : si
> personne ne lit `error`, il ne se passe **rien du tout**, sans un mot.
> Le contrôle tient en une requête, et il fait partie de tout lot qui
> touche aux RPC :
>
> ```sql
> select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
> where n.nspname='public' and p.proname in ( … la liste du front … );
> ```
>
> La liste du front s'extrait en une ligne :
> `grep -oE "sb\.rpc\('[a-z_]+'" com/*.html | sed "s/.*rpc('//;s/'//" | sort -u`

**Deux autres clés n'arrivaient jamais non plus.** `my_trips` ne rendait
ni `h.objectives` (que le front lisait pour remplir `OBJ`) ni les
répulsions de la table de liens `repulsion_habits` — seulement celles de
la colonne historique `habit_text`. Donc : un objectif lié par
`objective_link` et une répulsion liée par `repulsion_link` étaient
**écrits en base et invisibles à l'écran**. La fonction rend maintenant
l'arbre entier — cinq objets, tous les liens — en un appel.

### ⛔ LE SÉPARATEUR ÉTAIT DANS L'IDENTIFIANT — 21/09/2026

**« Je ne peux pas encore rajouter de répulsion. »** Troisième signalement,
et ce n'était ni la minuterie, ni le serveur, ni la contrainte. **C'était
un caractère.**

Tout le fichier encode une cible en `genre:identifiant` et la relit par
`split(':')` — `data-edit`, `data-open`, `data-go`, `data-pk`,
`data-kill`. L'identifiant provisoire d'une boîte neuve s'écrivait
**`tmp:1`**. Une répulsion neuve portait donc `data-edit="r:tmp:1"`, et le
lecteur en tirait `p[1] === 'tmp'`. `repOf('tmp')` ne trouve rien, la
fonction sort sur `if(!r)return;` — **chaque frappe était jetée**, sans un
mot, tant que le serveur n'avait pas renvoyé le vrai identifiant.

Mesuré, à 900 ms de latence : on tape « ZZTEST », le texte s'affiche, et
il disparaît au redessin qui suit le baptême. Il n'avait jamais atteint la
mémoire.

**⚠️ ET ÇA TOUCHAIT LES CINQ VUES**, pas les répulsions. Une seule a été
signalée parce qu'une seule a été essayée — exactement comme pour
l'invitation manquante la veille.

**⚠️ MON CORRECTIF DU 20/09 A RENDU LE BUG SYSTÉMATIQUE.** Avant, au
téléphone, une boîte neuve n'avait pas le curseur : on ne pouvait pas
taper dans les premières centaines de millisecondes, donc la frappe
tombait toujours APRÈS la réponse du serveur. En posant le curseur tout de
suite, j'ai mis toutes les frappes pile dans la fenêtre où elles étaient
jetées. *Un correctif qui réveille un bug dormant n'en est pas la cause —
mais c'est lui qui doit le réparer.*

> **La règle : un identifiant ne contient jamais le caractère qui sépare
> les champs.** `tmp-1`, pas `tmp:1`. Le séparateur appartient au format,
> jamais à la valeur. Ça vaut pour tout ce qu'on encodera dans un
> `data-*`.

**⚠️ ET LE FAUX SERVEUR RÉPONDAIT EN 80 ms — TROISIÈME FOIS.** La
production met 300 à 600 ms sur une création ; la frappe part à 700 ms.
Toute la fenêtre du bug vit entre ces deux chiffres, et à 80 ms elle
n'existait pas. Après la course de septembre (il lui fallait de la
latence) et la contrainte de `wisdom` (il lui fallait les contraintes), il
lui fallait **la lenteur réelle** : `window.__LAT_W` la règle, et le test
tourne aux deux vitesses.

**Deux corrections de fond sont restées**, parce qu'elles étaient justes
même si elles n'étaient pas la cause :

1. **Une frappe ne se jette plus quand la ligne est encore provisoire.**
   Les cinq écritures faisaient `if(estProvisoire(id)) return;` — un
   ABANDON, que rien ne reprogrammait. `quandNomme()` attend le baptême et
   part dès qu'il a lieu ; au bout de 3 s il abandonne **et le dit**.
2. **Cette attente compte comme une écriture en vol.** Sinon `fermer()`
   rechargeait l'arbre avant elle et écrasait le texte avec le vide du
   serveur — le même bug, déplacé de deux cents millisecondes. `calme()`
   fait trois tours au lieu de deux : pousser · attendre l'attente ·
   attendre l'écriture qu'elle a lancée.

---

### ⛔ L'INDEX UNIQUE INTERDISAIT LA DEUXIÈME RÉPULSION — 22/09/2026 ter

**LA CAUSE, APRÈS CINQ SIGNALEMENTS. Et elle tenait en une ligne de
DDL que je n'avais jamais regardée.**

```sql
repulsions_one_active : UNIQUE (user_id, habit_text) WHERE active
```

`repulsion_create` insère TOUJOURS `habit_text = ''` — les cinq objets
naissent vides puis s'écrivent dedans (création optimiste, 17/09). Donc :

- la **première** répulsion créée passe : `('', user)` est libre ;
- **la DEUXIÈME viole l'index**, la fonction lève, la RPC rend une
  erreur, la page annule la boîte. *« Je ne peux pas ajouter de
  répulsion. »*

Mesuré sur le compte de Wah : une ligne active portait déjà
`habit_text = ''` (ma propre ligne de test du 21/09). **À partir de cet
instant, plus aucune création ne pouvait aboutir.** Contre-épreuve : les
deux `repulsion_create` d'affilée, le premier passe, le second lève.
Après correction, cinq d'affilée passent.

**Le correctif** : l'index protège une vraie règle métier — une seule
répulsion ACTIVE par habitude. Mais `habit_text = ''` **ne désigne
aucune habitude**, donc la règle ne s'y applique pas :

```sql
create unique index repulsions_one_active
  on public.repulsions (user_id, habit_text)
  where active and btrim(habit_text) <> '';
```

C'est le MÊME défaut conceptuel que le trigger corrigé le matin même :
*un texte d'habitude vide n'est pas une habitude, et rien ne doit le
traiter comme telle.* Deux bugs, une seule idée fausse, écrite à deux
endroits à deux moments différents.

> **⚠️ LA RÈGLE, ET C'EST UN TROU DANS MA PROPRE RÈGLE DU 17/09 :
> « lire les contraintes de la table » NE SUFFIT PAS.** Je lisais
> `pg_constraint` — les `check`, les clés. **Un index unique n'y est
> pas** : il vit dans `pg_index`. Cinq lots perdus dans ce trou. La
> requête complète, à passer avant d'écrire un test sur une table :
>
> ```sql
> select conname, pg_get_constraintdef(oid) from pg_constraint
>  where conrelid='public.<t>'::regclass;
> select indexrelid::regclass, pg_get_indexdef(indexrelid) from pg_index
>  where indrelid='public.<t>'::regclass and (indisunique or indpred is not null);
> select tgname, pg_get_triggerdef(oid) from pg_trigger
>  where tgrelid='public.<t>'::regclass and not tgisinternal;
> ```
>
> **Un index unique partiel est une contrainte qui ne se déclare pas
> comme telle. Un trigger aussi.** Le faux serveur doit reproduire les
> trois.

**⚠️ ET LE DIAGNOSTIC A ÉCHOUÉ QUATRE FOIS POUR UNE RAISON DE MÉTHODE.**
Trois fois j'ai trouvé un vrai bug sur ce chemin, donc trois fois j'ai
cru avoir fini. *Un symptôme qui revient à l'identique après une
correction vérifiée n'est pas une rechute : c'est une SECONDE cause.*
Le réflexe juste, dès le deuxième signalement, est de reproduire le
geste **contre la vraie base**, pas contre un faux serveur — c'est ce
qui a tranché en dix minutes le cinquième jour.

---

### ⛔ LE PAVÉ ET LE BALAYAGE LISAIENT LE MÊME GESTE — 22/09/2026 ter

**« Quand je vais à gauche ça reste dans HABIT et quand je vais à droite
ça reste dans Habit. »** Symptôme exact, cause exacte.

Deux gestionnaires lisaient le même glissement, **et ils ne le lisent
pas dans le même sens** :

| qui | ce qu'il lit | tirer vers la gauche |
|---|---|---|
| le manche de la manette | un déplacement de **DOIGT** | va à gauche (sagesse) |
| le balayage horizontal | un déplacement de **CONTENU** | montre ce qui est à **DROITE** |

Les deux sont justes — la règle du 15/09 sur le sens du balayage tient.
Mais au-delà de **32 px** de traction, les deux partaient : la manette
allait sur la sagesse, puis le balayage lisait « à droite » et la
sagesse renvoie sur les habitudes. **On revenait à son point de départ.**
Symétriquement à droite, par la vision.

> **La règle : un geste né sur un contrôle appartient à ce contrôle.**
> `#joy` est en tête de la liste d'exclusion du balayage, et la molette
> globale ignore ce qui naît dans le pavé.

**⚠️ ET MON TEST TIRAIT 26 px — JUSTE SOUS LE SEUIL DE 32.** Toute la
fenêtre du bug vivait au-dessus, et mes quatre directions passaient au
vert. *Un test qui reste en deçà du seuil d'un AUTRE gestionnaire ne
prouve rien sur leur cohabitation.* `joyfort.mjs` tire à 40, 70 et
120 px, au doigt et à la souris. Contre-épreuve faite : sans le
correctif, 8 assertions tombent, toutes avec `obtenu=habits`.

**⚠️ ET IL FAUT `screenX` DANS UN FAUX `Touch`.** Le balayage lit
`changedTouches[0].screenX` ; un `Touch` construit sans lui rend 0, le
delta vaut toujours zéro, et le conflit ne se déclenche jamais. Un faux
événement incomplet est un faux serveur de plus.

---

### ⛔ AUCUNE BORDURE, MÊME DÉGUISÉE EN OMBRE — 22/09/2026 ter

**« Je t'ai pas demandé de bordure sur le joystick, juste le changement
de couleur de son background avec nos 3 couleurs. »**

J'avais posé un anneau intérieur de la couleur de la vue autour d'un
fond sombre, en me disant qu'un `box-shadow: inset 0 0 0 3px` n'est pas
techniquement une bordure. **Ça se voit comme une bordure, donc c'en est
une.** La règle de marque n'en admet aucune, et elle ne se contourne pas
par la technique employée pour la dessiner.

**Le fond EST la couleur.** Navy, bleu clair, rouge-violet, pleins.
Les deux ronds de destination se détachent par une **ombre portée** —
qui, elle, ne dessine rien autour de l'objet.

**⚠️ ET LE RATIO DE LUMINANCE EST LE MAUVAIS OUTIL SUR DES APLATS DE
MARQUE.** Rouge-violet sur bleu clair donne **1,04** — et se voit
parfaitement : ce sont deux teintes opposées, et la luminance ne mesure
pas la teinte. On mesure donc une **distance de couleur** pondérée, avec
un plancher à 60. Navy et bleu clair sont à 77 : ce sont les deux bleus
de la charte, et c'est voulu. *Exiger davantage reviendrait à demander à
la marque de changer ses couleurs pour satisfaire un test.* Ce qu'on
interdit, c'est le rond qui DISPARAÎT — distance proche de zéro, navy
sur navy, le cas mesuré deux fois.

**La barre « order by importance » remonte en haut.** Je l'avais
descendue en lisant « la barre passe en-dessous comme le TOTEHM.svg sur
mobile » : Wah parlait de la piste du rail, pas de cette phrase. Elle
reprend sa place sous la bande haute — et elle y tient, parce que **le
titre s'est décalé à droite** en même temps (« légèrement abaissé et à
droite »).

---

### ⛔ LA MARQUE NE BOUGE PAS QUAND LE CONTENU S'ÉLARGIT — 22/09/2026 bis

**« Quand on appuie sur l'icône classement, PAS besoin de faire bouger
le T.svg. La barre passe en-dessous comme le TOTEHM.svg sur mobile. »**

`body.ordering` fait passer `--rw` (la largeur du rail) de 18 à 34 px,
pour que le rang tienne dans le rail. Or `#bigT` et `#wordmark` se
posaient sur `--rl + --rw` : **la marque sautait de 26 px à chaque
entrée en mode classement.**

Deux jetons, désormais, et ils ne disent pas la même chose :

| jeton | qui s'y accroche |
|---|---|
| `--rw` | le rail, les boîtes, la piste de classement — **ils doivent s'élargir** |
| `--rw0` | le T et le wordmark — **ils ne doivent pas bouger** |

> **La marque est un repère fixe. C'est au contenu de s'écarter, jamais
> à elle.** (Même raison qu'au 18/09 pour la croix face au contrôleur.)

**⚠️ ET IL FALLAIT LE CORRIGER À DEUX ENDROITS.** La règle générale était
passée à `--rw0` ; le bloc ordinateur redéclarait `#bigT{left:…--rw…}`
et **gagnait par la cascade**. Mesuré : le T sautait encore de 12 px, sur
ordinateur seulement. *Un jeton qu'on renomme se renomme partout — un
`grep`, pas une relecture.*

**La barre de classement descend.** Elle était en haut, sous la croix,
là où le titre de la vue vient de monter. Elle se pose maintenant dans
la bande libre du bas, **entre la liste et le contrôleur** — et la liste
recule de 22 px pour lui faire place, uniquement en mode classement.
*Entre le bas de la liste et le haut du contrôleur il n'y a que dix
pixels : il faut les prendre, pas s'y glisser.*

**⚠️ ET SUR ORDINATEUR ELLE SE RÉSOLVAIT SUR `#stage`.** `#stage` porte
un `transform`, il est donc le bloc conteneur de ses descendants
`position:fixed` : `bottom:26px` visait le bas du CARRÉ — c'est-à-dire
exactement le contrôleur. Mesuré : 195 px du bas de l'écran, et un
chevauchement. **Quatrième fois que ce piège coûte une passe** (les
overlays, `#vnow` sous `#joy`, la croix, et maintenant la barre).

---

### ⛔ LES TITRES RENTRENT DANS LE TOTEHM — 22/09/2026 bis

**« Les titres et sous-titre dans le totehm sur ordinateur, et en plus
grand pour version ordi et mobile. »**

Le titre était à 22 px du haut de la FENÊTRE : sur ordinateur, ça le
posait sur le noir, **au-dessus** du carré — à côté du produit, pas
dedans. Il descend dans le carré, sous la bande de perforations, entre
le T (haut-gauche) et la croix (haut-droite) ; même calcul que le
contrôleur, en miroir, depuis les mêmes jetons (`--pad`).

Au téléphone il n'y a pas de carré — l'écran EST le carré — donc la
règle générale (22 px) reste la bonne.

Et les deux lignes grossissent : **19 px** pour le nom (au lieu de 15),
**11 px** pour le sous-titre (au lieu de 8).

---

### ⛔ LE CURSEUR PORTE LES TROIS COULEURS, TOUJOURS — 22/09/2026 bis

**« Je t'ai déjà demandé 100 fois à ce que dans le curseur ce soit
TOUJOURS les 3 couleurs. Dans la vue WISDOM c'est total rouge-violet,
dans la vue Habit c'est le bleu navy avec le point bleu clair pour
accéder aux objectifs et le point rouge pour les répulsions, et quand
c'est la vue Objective le curseur devient bleu clair. »**

J'avais mis l'ÉPOQUE sur la tuile — passé / présent / futur. C'est un
QUATRIÈME langage visuel, et la marque n'a que trois couleurs.

**La tuile dit LA VUE, dans sa propre couleur :**

| la vue | la tuile |
|---|---|
| habitudes | navy |
| objectifs · vision | bleu clair |
| répulsions · sagesse | rouge-violet |

**⚠️ ET LE ROND DE LA VUE COURANTE S'EFFACE.** C'est la clé, et c'est ce
que Wah décrit sans le nommer : il cite **deux** points, jamais trois.
Le troisième — celui de la vue où l'on est — n'a rien à dire, **la tuile
le dit déjà, et en grand**. Ce qui reste allumé, ce sont les
DESTINATIONS : où je peux aller d'ici, chacune dans sa couleur pleine.

*Et ça règle d'un coup le problème qui m'a coûté trois lots :* navy sur
navy est invisible, donc j'éclaircissais le navy, donc Wah me reprenait.
**Le rond qui posait problème n'avait simplement pas lieu d'exister.**

> **La règle : quand un objet de marque ne se lit pas sur son fond,
> c'est le FOND qui recule — ou l'objet qui n'avait rien à dire. Jamais
> la marque qui se dilue.**

**⚠️ LE PLANCHER DES TUILES EST FIXÉ PAR LE NAVY.** C'est la plus sombre
des trois couleurs : une tuile lisible pour le bleu clair et le
rouge-violet peut très bien effacer le navy. Première valeur pour les
objectifs, `#1f2a52` : le rond navy dessus tombait à **1,20** de
contraste — invisible. `lot23.mjs` mesure les trois ronds sur les cinq
tuiles et refuse en dessous de **1,40**.

**⚠️ ET C'EST UNE MANETTE, PAS UN BOUTON.** « Les scroll doivent aussi
fonctionner DANS la partie curseur. Il y a les flèches, le joystick
intérieur (ce que tu dois rajouter) et enfin ce que l'on a déjà. »
Trois moyens, et **ils mènent tous à `versVoisin`** — la table `CROIX`,
une seule. (Une seconde table finit toujours par dire autre chose : déjà
vu le 19/09 avec `AXE`.)

1. **Les chevrons** — ils existaient, ils ne bougent pas.
2. **Le manche** — on l'attrape et on le tire, borné à 15 px. Au-delà de
   9 px dans une direction **où l'on peut aller**, le chevron de ce
   côté s'allume : *on voit sa destination avant de lâcher*, et on peut
   revenir au centre sans rien déclencher.
3. **La molette sur le pavé** — elle navigue directement, **sans la
   condition « au bord de la liste »**. Cette condition existe parce que
   sur la LISTE, défiler et changer de vue sont le même geste (règle du
   17/09). Sur le pavé il n'y a rien à faire défiler : il n'y a rien à
   départager.

**⚠️ `touch-action:none` SUR LE SOCLE**, et Pointer Events : règle du
projet, dès qu'un geste porte une fonction produit on coupe le natif et
on conduit à la main, même code pour le doigt et la souris.

**⚠️ ET L'ÉTAT DU GESTE SE POSE SUR `#joy`, PAS SUR LA TUILE.** Le
combinateur `~` ne regarde qu'EN AVANT, et `#cur-g` PRÉCÈDE `#joy-box`
dans le balisage : la règle n'aurait allumé que deux chevrons sur
quatre, et seulement par chance.

---

### ⛔ QUATRE FOIS LE MÊME SIGNALEMENT — ET LA VRAIE LEÇON — 22/09/2026 bis

**« Encore une fois je ne peux pas ajouter de répulsion. Je veux que tu
vérifies toute la logique. »** Quatrième fois. Trois fois j'avais trouvé
un bug RÉEL — la contrainte `wisdom`, le séparateur dans l'identifiant,
la touche Entrée — corrigé, testé, déployé. Et le signalement revenait,
identique.

**La quatrième fois, j'ai changé de méthode, et c'est elle qu'il faut
garder.** Au lieu de chercher un quatrième bug dans le code, j'ai
mesuré, dans cet ordre :

| ce que j'ai vérifié | comment | résultat |
|---|---|---|
| les RPC existent | `pg_proc` vs `grep rpc(` du front | les 37 sont là |
| les droits | `has_function_privilege` | bons — mais **3 fonctions ouvertes à `anon`** |
| les contraintes | `pg_constraint` | aucune ne bloque |
| **ses données** | `select … from repulsions where user_id=…` | **19 lignes, 5 actives** |
| ce que le serveur lui rend | `my_trips()` sous `set local role` | 5 répulsions, dont une avec `hs:[""]` |
| la version déployée | l'API Vercel | **à jour, son dernier lot est en ligne** |
| le geste, sur SES données | ses données chargées dans le faux serveur | **tout passe** |

**Conclusion : la création de répulsions FONCTIONNE.** Sa dernière
répulsion a bien été écrite en base, avec son texte, ses liens et tout.

> **⚠️ LA RÈGLE QUI EN SORT, ET ELLE VAUT POUR TOUT SIGNALEMENT
> RÉPÉTÉ : quand un bug revient après une correction VÉRIFIÉE, la
> question n'est plus « où est le bug » mais « est-ce que la page
> ouverte est celle qu'on a livrée ».** Et je n'avais aucun moyen d'y
> répondre. Un onglet mobile gardé trois jours, un cache, un lot pas
> appliqué : tout ça ressemble EXACTEMENT à « ce n'est pas corrigé », et
> ça coûte un lot entier à chaque fois.
>
> `BUILD` (une constante, quatre caractères) est maintenant dans
> `window.__totehm_zone.version`. Trois secondes pour trancher, au lieu
> d'un lot.

**Deux bugs réels sont quand même sortis de cette inspection**, et
aucun des deux n'était dans le code de la page :

1. **Le trigger `repulsion_seed_link` posait un lien vers le vide.** Il
   insère `repulsion_habits(id, habit_text)` à chaque insertion ; or
   `repulsion_create` écrit `habit_text = ''` — les cinq objets naissent
   vides depuis la création optimiste du 17/09. Chaque répulsion naissait
   donc avec un lien vers une habitude de texte vide. Le front le filtre
   (`.filter(Boolean)`), donc ça ne cassait rien à l'écran — mais c'est
   une ligne fausse dans une table de liens, et elle se comptait comme
   un lien réel partout où l'on ne pense pas à écarter la chaîne vide.
   *Un trigger écrit avant la création optimiste ne connaît pas la
   création optimiste.*
2. **Trois fonctions étaient exécutables par `anon`** —
   `intention_sound_set` (qui ÉCRIT), `intention_sounds`,
   `totehmbot_access`. Toutes trois créées les 20 et 21/09. C'est
   exactement la règle écrite dans ce fichier — « `create or replace
   function` rétablit le GRANT à PUBLIC » — oubliée **trois fois de
   suite**, parce que rien ne la vérifie. Aucune ne fuit de donnée
   (elles passent par `auth.uid()`), mais une fonction d'écriture
   ouverte à l'anonyme est une surface offerte pour rien.

**⚠️ ET LE FAUX SERVEUR A MENTI UNE CINQUIÈME FOIS.** Il ne reproduisait
pas le trigger, et ses données étaient PROPRES : pas de lien vers une
habitude supprimée, pas de lien vide, cinq vues habitées. Le Totehm réel
de Wah a les trois. La règle du 17/09 s'élargit donc :

> **Un faux serveur doit refuser ce que le vrai refuse, ET rendre ce que
> le vrai rend** — triggers compris. `stub.mjs` accepte maintenant un
> état injecté (`__DB_OVERRIDE`), et `wahtest.mjs` rejoue le geste sur un
> relevé de production. C'est le seul test qui prouve quelque chose sur
> un Totehm vécu.

---

### ⛔ ENTRÉE ENREGISTRE, PARTOUT, ET SUR LES DEUX CLAVIERS — 22/09/2026

**« Je peux ajouter une wisdom mais pas une répulsion learned from »,
« même problème dans la vue habit », « pas possible dans la vue
répulsion ». Trois signalements, et une seule cause — et ce n'était
aucune des trois répulsions.**

L'écouteur `keydown` du Totehm connaissait quatre cas : le spot, le son,
la fréquence, et la création d'un lien (`data-nw`). **Il ne connaissait
pas le TITRE D'UNE BOÎTE** (`data-edit`) — c'est-à-dire le champ qu'on
remplit en premier dans les cinq vues. Appuyer sur Entrée dedans
n'enregistrait rien : ça insérait un RETOUR À LA LIGNE dans le
`contenteditable`. Le membre voyait son texte partir à la ligne et
concluait, logiquement, que « ça ne s'ajoute pas ».

**⚠️ ET LE TÉLÉPHONE N'EMPRUNTE PAS LE MÊME CHEMIN.** Un clavier virtuel
Android n'envoie pas de `keydown` exploitable : `e.keyCode` vaut 229
pendant toute la composition, et la touche « entrée » n'arrive parfois
pas du tout. Le seul signal fiable est **`beforeinput` avec
`inputType:'insertLineBreak'` ou `'insertParagraph'`**. Les deux chemins
sont donc branchés sur la MÊME fonction, `valide(cible)` :

```js
box.addEventListener('keydown',e=>{
  if(e.key!=='Enter' || e.isComposing || e.keyCode===229) return;
  if(valide(e.target)) e.preventDefault(); });
box.addEventListener('beforeinput',e=>{
  if(e.inputType!=='insertLineBreak' && e.inputType!=='insertParagraph') return;
  e.preventDefault();          /* aucun retour à la ligne, jamais */
  valide(e.target); });
```

**⚠️ `e.isComposing` N'EST PAS UNE PRÉCAUTION, C'EST LA RÈGLE.** En
saisie japonaise, coréenne ou en prédiction Android, Entrée valide LE
MOT, pas la boîte. L'ignorer fermerait la boîte au milieu d'un mot.

**⚠️ ET UN COLLER PEUT ENCORE APPORTER UNE LIGNE.** `pousse()` aplatit
donc le texte (`replace(/[\r\n]+/g,' ')`) : la règle est « aucun retour
à la ligne dans aucune boîte », pas « aucune touche Entrée ».

> **La règle : un raccourci qui vaut « partout » se branche sur la
> TABLE des cibles, pas sur une liste de cas écrite à la main.** Le cas
> manquant était le plus courant de tous, et il manquait depuis le
> début — personne ne l'a vu parce que la souris permet de cliquer
> ailleurs pour valider, et que c'est ce que je faisais en testant.

---

### ⛔ LES OPTIONS VIVENT DANS LE PROLONGEMENT DU [close] — 22/09/2026

**« Toutes les options qui s'affichent lorsque j'ajoute des mini-box
dans une box, y compris [A new …], doivent être dans le prolongement du
[Close]. »**

Le lookup s'écrivait dans `bas`, une fente située **tout en bas de la
boîte**, après TOUS les groupes. On appuyait sur `+ repulsion` dans le
groupe TRIGGER, le bouton devenait « close » — et le champ « a new
repulsion » apparaissait deux rangées plus bas, sous le groupe suivant,
parfois sous [Delete]. *Le bouton disait « close » ici, et ce qu'il avait
ouvert était là-bas.*

`groupe(mot, contenu, sous)` prend un troisième argument : le lookup
ouvert par le bouton **de ce groupe-là**. Il en devient le dernier
enfant — mini-boîtes, [close], puis les options, dans la même colonne et
au même bord gauche. Mesuré par `lot22.mjs` : 12 px dessous, 0 px de
décalage horizontal, aux deux tailles d'écran.

**La fente `bas` reste**, vide : elle servira à ce qui concerne la boîte
ENTIÈRE et non un groupe. Ce qui concerne un groupe vit dans le groupe.

---

### ⛔ LE TÉLÉPHONE COUCHÉ REPLIE LE TOTEHM — 22/09/2026

**« Retourner son téléphone a la même action que appuyer sur la croix.
Évidemment pas possible d'ouvrir le Totehm en mode paysage. »**

Le Totehm est un CARRÉ DEBOUT. Couché, la liste tient sur trois lignes,
le rail mange la moitié de la hauteur, et le clavier recouvre le reste.
Ce n'est pas une mise en page à corriger, c'est la forme de l'objet.

**⚠️ TROIS CONDITIONS, ET IL LES FAUT TOUTES.**
`(orientation:landscape)` **seul est vrai sur tous les ordinateurs** :
la règle aurait interdit le Totehm à tout le monde sauf aux téléphones
debout. On exige en plus une hauteur de téléphone couché (**≤ 540 px**)
ET un **pointeur grossier** — un doigt. Une fenêtre écrasée sur un
ordinateur garde sa souris, donc garde son Totehm.

```js
const PAYSAGE = window.matchMedia(
  '(orientation:landscape) and (max-height:540px) and (pointer:coarse)');
```

**⚠️ LE VERROU VIT DANS `enter()`, PAS SEULEMENT EN CSS.** Masquer le
bouton n'empêche ni le clavier, ni la porte [My Higher Self], ni un
`#in` dans l'URL d'ouvrir le Totehm à l'horizontale. La classe
`body.paysage` et le `return` de `enter()` sortent de la **même**
condition : une source, deux effets.

**⚠️ ET ON DIT POURQUOI.** « turn your phone upright » remplace
[Open my Totehm]. Un bouton qui disparaît sans raison est un bouton
cassé — règle du 19/09, elle vaut aussi quand c'est une orientation qui
le retire.

**⚠️ `matchMedia` NE SUFFIT PAS SUR IOS**, où la barre d'adresse change
la hauteur sans changer l'orientation et où l'ordre des événements varie
d'une version à l'autre. Les trois écoutes (`change`,
`orientationchange`, `resize`) coûtent un test de booléen, et `fold()`
sort immédiatement s'il n'y a rien d'ouvert. Et il faut **rejouer** la
vérification après la branche `#in` : au premier passage `open` valait
encore `false`, donc il n'y avait rien à replier.

---

### ⛔ LE PAVÉ REND AUX RONDS LEURS COULEURS — 22/09/2026

**« Je t'ai dit les 3 couleurs. Tu m'as enlevé mon bleu navy au milieu.
Et je ne veux pas de point blanc en zoom mais les points avec leurs
couleurs respectives en zoom. »**

Il avait raison sur les deux points, et les deux étaient la même faute :
**j'avais réglé un problème de contraste en effaçant l'information.**
J'avais éclairci les trois teintes de marque (`--navy` #333366 devenait
#9a9ae8, une couleur qui n'est nulle part dans la charte) et peint le
rond ACTIF en blanc.

> **La règle : quand un objet de marque ne se lit pas sur son fond, c'est
> le FOND qui recule. Jamais la marque qui se dilue.**

Les ronds reprennent `--blue`, `--navy`, `--rep` exactement. Ce sont les
**trois tuiles** qui descendent d'un cran, chacune gardant sa teinte
d'époque : `#1d0b1a` (sagesse) · `#101020` (présent) · `#0d1122`
(vision). C'est d'ailleurs ce qu'est la base d'une manette — un socle
sombre qui ne dit rien et fait ressortir ce qui est posé dessus.

**⚠️ ET LE CONTRASTE EST MESURÉ, SUR LES CINQ VUES.** `lot20.mjs`
calcule le rapport de luminance de chacun des trois ronds contre sa
tuile et échoue sous **1,6**. Deux fois déjà un rond avait disparu dans
son fond (le navy dans le papier, le rouge-violet dans la sagesse) : une
règle de lisibilité sans test se recasse au lot suivant.

**⚠️ ET LE LISERÉ REPEIGNAIT LE ROND EN BLANC PAR LA BANDE.** Premier
correctif : le rond gardait sa couleur, mais le liseré intérieur à .55
et l'anneau à .34 couvraient la moitié haute d'un rond de 21 px — au
pixel, le centre ressortait presque blanc. *Retirer le blanc déclaré ne
sert à rien si le relief le remet.* Le relief se fait par l'OMBRE, qui
ne repeint rien.

**Le petit repère blanc du 21/09 est supprimé.** Il disait la couche à
l'époque où les ronds disaient les ÉPOQUES ; depuis que les ronds SONT
les couches, il répète ce qu'ils disent déjà — et il le dit en blanc.
Une information, un seul endroit.

---

### ⛔ LA BANDE BASSE S'ARRÊTE AU-DESSUS DU CONTRÔLEUR — 22/09/2026

**« Mets-le en bas au final, en faisant bien attention de son placement
sur mobile et ordinateur… pas sur les trous noirs par exemple. »**

Le contrôleur descend au **centre du bas** — et cette fois il y reste :
le T tient le haut-gauche, la croix le haut-droite, le wordmark le
bas-gauche ; au centre du bas il ne peut croiser aucun des trois, quelle
que soit la largeur. Le **titre remonte en haut de la fenêtre**, avec son
sous-titre (`my habits` / `what I repeat`).

**⚠️ MAIS IL MORDAIT LA LISTE.** Mesuré au téléphone : le chevron du
haut tombait 9 px à l'intérieur de la dernière boîte. C'est la règle du
17/09 — « aucun curseur ne couvre la liste » — et elle ne se négocie
pas : *on ne pose pas une commande sur ce qu'on est en train d'écrire.*
`--band-b` **se déduit** maintenant du contrôleur au lieu d'être
recopiée : `--joy-b + --joy-d + 36px + 10px` (le pavé, ses deux rangées
de chevrons, et l'air). Changer la taille du pavé déplace la liste toute
seule.

**⚠️ ET SUR ORDINATEUR IL TOMBAIT SUR UN TROU.** Le carré porte une
perforation à **25 %, 50 % et 75 %** de son bord bas — et le contrôleur
est CENTRÉ, donc pile au-dessus de celle du milieu. Mesuré : le chevron
du bas était en plein dedans. Une perforation mord de `--pad` vers
l'intérieur, alors `--joy-b` vaut `--pad + 12px` sur ordinateur et le
pavé se pose au-dessus de la bande. `croix21.mjs` le vérifie aux six
largeurs : **51 px de dégagement**.

**⚠️ ET `--band-b` NE REPREND PAS `--pad`, SOUS PEINE DE LE COMPTER
DEUX FOIS.** `#joy` se mesure sur la FENÊTRE ; la liste, elle, vit DÉJÀ
dans le carré renfoncé de `--pad` — mesuré, son conteneur s'arrête pile
sur la ligne des perforations. Mettre `--pad` des deux côtés coûtait
**40 px de liste pour rien**. C'est exactement le piège de la croix et
du contrôleur, une troisième fois : *deux repères différents, deux
calculs différents, et on ne recopie jamais l'un dans l'autre.*

**⚠️ ET LE TITRE NE DOIT PAS VIVRE SOUS UN PARENT TRANSFORMÉ.** `#vnow`
était un enfant de `#joy`, qui se centre par `translateX(-50%)`. **Un
`transform` fait de l'élément le bloc conteneur de ses descendants
`position:fixed`** : `top:22px` se résolvait sur le contrôleur, en bas de
l'écran. Mesuré — le titre atterrissait à y=760 au lieu de 22. C'est le
même piège que `#stage`, documenté trois fois dans ce fichier. **Un
élément qui doit se placer sur la FENÊTRE ne vit jamais sous un parent
transformé.**

**Et le H ne clignote plus sur les répulsions.** Il disait « même lettre,
même chose vue par son revers » — mais le membre lit un clignotement
comme « tu es ici », et il était ici deux fois.

---

### ⛔ JE M'ÉTAIS TROMPÉ D'AXE — 21/09/2026 bis

**« C'est une façon de mettre en avant les répulsions, habitudes et
objectifs, tu comprends ? »**

J'avais mis sagesse / habitudes / vision dans les trois ronds empilés —
donc **l'axe du TEMPS, à la verticale**. C'est faux, et c'est faux
structurellement : la croix du produit dit que l'horizontale est le
temps et que **la verticale est la profondeur**. Des ronds EMPILÉS ne
peuvent dire que l'axe EMPILÉ.

```
        ●  objectifs    bleu clair    ce qui tire vers le haut
        ●  habitudes    navy          le présent
        ●  répulsions   rouge-violet  ce qui fait dérailler
```

**Et les couleurs ne se choisissent pas : on reprend celles des boîtes.**
Un objectif est bleu clair dans la liste ET sur le contrôleur. Une
palette inventée pour le pavé aurait fait un deuxième langage à tenir
d'accord.

**La TUILE porte l'époque** — c'est ce que Wah appelle « la logique de
défilement reste la même ». Elle se repeint au swipe horizontal :
rouge-violet sombre sur la sagesse, navy sur le présent, bleu sombre sur
la vision. **Deux axes, deux langages, aucun ne répète l'autre.**

~~**⚠️ LES RONDS SONT DES TONS CLAIRS DE LEUR FAMILLE, PAS LES VALEURS
PLEINES.** Chaque rond s'éclaircit juste assez pour se lire sur les
TROIS tuiles. **Et le rond ACTIF est blanc.**~~

> **⚠️ FAUX, CORRIGÉ LE 22/09.** Le constat était juste — navy `#333366`
> sur un papier `#2b2b57` est invisible, mesuré deux fois — mais j'en
> tirais la mauvaise conclusion : j'éclaircissais la MARQUE. Ce sont les
> tuiles qui reculent. Voir **⛔ LE PAVÉ REND AUX RONDS LEURS
> COULEURS**, qui fait autorité.

**Sur la sagesse et la vision, aucun rond ne s'allume.** L'axe vertical
n'existe pas là-bas : il n'y a ni objectif ni répulsion. En allumer un
serait un mensonge — règle posée le 18/09, elle tient toujours.

**⚠️ LE CONTRÔLEUR REMONTE EN HAUT SUR ORDINATEUR.** ~~Je l'avais
descendu dans le coin bas-droit le 20/09.~~ **Dépassé le 22/09 : il est
au centre du BAS, sur les deux écrans** — voir **⛔ LA BANDE BASSE
S'ARRÊTE AU-DESSUS DU CONTRÔLEUR**. Ce qui rendait ça difficile reste
vrai, et c'est pour ça que la section reste :
`#fold-x` se résout sur `#stage`, `#joy` sur la FENÊTRE — **les deux
coins ne se calculent pas dans le même repère, donc aucune formule ne
les tiendra d'accord.**

La réponse n'est pas une formule, c'est une **marge mesurée gardée par un
test** : `croix21.mjs` vérifie l'absence de chevauchement à 1280, 1440,
1680, 1920, 390 et 430 px. Mesuré : 23 px de dégagement sur ordinateur,
14 au téléphone. *Si un jour ça retouche, le test le dit avant Wah.*

---

### ⛔ LE PAVÉ REVIENT AU DISQUE — 21/09/2026 · AXE CORRIGÉ LE MÊME JOUR

> **⚠️ LES TROIS RONDS N'ÉTAIENT PAS LES BONS.** Voir **⛔ JE M'ÉTAIS
> TROMPÉ D'AXE**, qui fait autorité. Ce qui suit reste vrai sur le
> retour du disque et sur le titre.

**« Le design du joystick était très bien AVANT, sauf que je ne veux pas
des deux points latéraux aux extrémités horizontales. Garde les trois
points verticaux mais avec les 3 couleurs. »**

J'avais sur-corrigé : en retirant les deux ronds latéraux le 20/09, j'ai
aussi retiré le DISQUE — et c'est le disque qui faisait la manette. Il
revient, avec trois ronds empilés dessus : rouge-violet (sagesse), navy
(habitudes), bleu clair (vision). Le Totehm vu de profil.

**⚠️ LE DISQUE NE CHANGE PLUS DE COULEUR, ET C'EST OBLIGÉ.** Avant, il
prenait celle de l'époque : le rond rouge-violet sur un disque
rouge-violet aurait disparu pile au moment où il doit se voir. Les ronds
portent la couleur ; le disque redevient ce qu'est la base d'une manette —
un socle sombre qui ne dit rien et fait ressortir ce qui est posé dessus.

~~**Le point vertical en plus.** Un petit repère blanc se pose SUR le
disque, en haut dans les objectifs, en bas dans les répulsions.~~

> **⚠️ SUPPRIMÉ LE 22/09.** Il avait un sens quand les ronds portaient
> les ÉPOQUES. Depuis que les ronds SONT les couches, il répète ce
> qu'ils disent — et en blanc, la seule couleur exclue de ce pavé.

~~**Le titre redescend SOUS le pavé, en 15 px.**~~ **Dépassé le 22/09 :
le titre est EN HAUT DE LA FENÊTRE, avec son sous-titre, et il a quitté
la grille du contrôleur.** Le problème qu'on contenait avec `width:0` +
`overflow:visible` — un mot long qui déplace le pavé — **disparaît** au
lieu d'être contenu : les deux objets ne partagent plus rien. Voir
**⛔ LA BANDE BASSE S'ARRÊTE AU-DESSUS DU CONTRÔLEUR**.

---

### ⛔ DEUX ALPHABETS POUR LA MÊME CHOSE — 20/09/2026

**« La mini-box objectif dans la vue habit ne fonctionne pas. »** Une
lettre. Une seule.

Une mini-boîte d'objectif est construite avec `o` — c'est sa classe CSS
(`.m-o`), c'est son `data-unlink="o:…"`. Une boîte OUVERTE d'objectif, elle,
porte `open.kind === 't'`. **Deux alphabets pour la même chose, écrits à
six mois d'intervalle**, et personne ne s'en apercevait tant que les deux
mondes ne se parlaient pas.

Le 19/09 je les ai fait se parler. `VUE_DE` était écrite avec l'alphabet
des boîtes (`t`) ; `data-go` porte celui des minis (`o`). Donc
`VUE_DE['o'] === undefined`, la fonction sortait en silence, **le clic ne
faisait rien.** Les quatre autres lettres coïncidaient — voilà pourquoi
seul l'objectif était mort, et pourquoi les tests ne l'ont pas vu : ils
cliquaient sur une répulsion.

`PORTE` dit maintenant les DEUX : où aller, et sous quel nom la boîte
s'ouvre là-bas. Et un genre inconnu **écrit dans la console** au lieu de
sortir sans un mot.

> **La règle : traduire explicitement coûte une colonne, supposer que
> deux alphabets coïncident coûte un bouton mort.** Et un `return` muet
> sur une valeur absente est la meilleure cachette qui existe pour un
> bug.

---

### ⛔ UNE BOÎTE NEUVE N'AVAIT AUCUN ENDROIT OÙ ÉCRIRE — 20/09/2026

**« Il y a un problème d'affichage quand je clique add a répulsion. Il
faut revoir impérativement la fonctionnalité de l'app globale. »** Il
avait raison sur les deux points — le symptôme ET la portée.

Mesuré : la boîte neuve contient
`<span class="v-name" contenteditable></span>` — **vide**. Un
`contenteditable` vide se réduit à un trait de 10 px, sans un mot dedans.
On appuyait sur « + Add a Repulsion », une boîte s'ouvrait avec
« instead / + habit / learned / + teaching / Delete repulsion », et
**rien où poser le curseur**. La boîte existait, l'invitation non.

Et ce n'était pas la répulsion : c'était **les cinq vues**. Les cinq
objets naissent sans texte (création optimiste depuis le 17/09), donc les
cinq naissaient muets. Une seule vue a été signalée parce qu'une seule a
été essayée.

Trois causes, trois corrections :

1. **Pas d'invitation.** Chaque genre dit maintenant ce qu'il attend,
   dans sa langue : « what I do instead », « what I learned », « what I
   see ». Pas « Enter text » — *une répulsion n'est pas un titre, c'est
   ce qu'on fait À LA PLACE, et le mot juste fait la moitié du travail de
   la boîte.*
2. **Pas de cible.** Le champ vide garde une largeur de ligne
   (`min-width`), au lieu d'un trait invisible au pouce.
3. **Pas de curseur, au téléphone.** `if(f && window.innerWidth > 700)
   f.focus()` — bonne règle (ne pas faire surgir le clavier quand on
   ouvre une boîte pour la LIRE), **mauvaise portée** : elle s'appliquait
   aussi à une boîte qui vient de NAÎTRE. `ouvrir(kind, id, neuve)`
   sépare les deux gestes.

**⚠️ ET LE BAPTÊME VOLAIT LE CURSEUR.** La boîte naît avec un identifiant
provisoire et prend le curseur ; 300 à 600 ms plus tard le serveur
répond, `renderZone()` reconstruit la ligne, **et le champ qui avait le
curseur n'existe plus**. Au téléphone, le clavier retombait tout seul une
demi-seconde après s'être ouvert. `rendCurseur()` le repose après le
redessin — et seulement si le champ est encore vide et que le doigt n'est
pas ailleurs.

> **La règle : une création n'est pas finie quand la boîte apparaît, elle
> est finie quand on peut écrire dedans.**

---

### ⛔ LE PAVÉ PASSE EN TROIS COULEURS — 20/09/2026 · CORRIGÉ LE 21/09

> **⚠️ J'AVAIS SUR-CORRIGÉ.** En retirant les deux ronds latéraux, j'ai
> aussi retiré le DISQUE — et c'est lui qui faisait la manette. Voir
> **⛔ LE PAVÉ REVIENT AU DISQUE**, qui fait autorité. Ce qui suit reste
> vrai sur les couleurs et sur la lisibilité des ronds éteints.

**« Je ne veux pas des deux points latéraux aux extrémités et les trois
points verticaux, je veux nos 3 couleurs. »**

Les cinq ronds blancs dessinaient la CROIX — c'est-à-dire **le plan du
produit**. Un contrôleur n'a pas à montrer le plan : il doit montrer OÙ
L'ON EST. Et où l'on est se dit en deux mots : **quelle époque** (la
couleur) et **quelle couche** (le titre).

Trois ronds, les trois couleurs de la marque : rouge-violet le passé,
navy le présent, bleu clair l'à-venir. La colonne verticale du présent
(objectifs / habitudes / répulsions) n'a plus de rond à elle — elle se lit
sur les chevrons haut et bas et dans le titre. *Une information, un seul
endroit.*

**⚠️ ET LE TITRE A FAILLI REFAIRE BOUGER LE PAVÉ.** Wah m'a reproché deux
fois qu'il se déplace. En mettant le titre dans une colonne `auto`, je
l'ai réintroduit par la porte de derrière : « MY REPULSIONS » est plus
long que « MY HABITS », le contrôleur est ancré par la DROITE, il glissait
de **38 px** d'une vue à l'autre. Mesuré. La colonne est fixe.

**⚠️ ET À .34 D'OPACITÉ LES TROIS COULEURS ÉTAIENT LE MÊME GRIS** — donc
la demande entière était perdue. Un rond éteint reste RECONNAISSABLE :
c'est lui qui dit où l'on peut aller. Il s'efface par la TAILLE, pas par
la couleur.

**⚠️ ET LE NAVY ALLUMÉ DISPARAISSAIT DANS LE PAPIER.** `--navy` (#333366)
et `--paper` (#2b2b57) sont à deux doigts l'un de l'autre : le rond du
présent s'effaçait exactement au moment où il devait se voir. Un anneau
clair le détoure — seule pièce du pavé qui en a besoin, seule à l'avoir.

---

### ⛔ UN CONTRÔLEUR QUI SE DÉPLACE N'EST PAS UN CONTRÔLEUR — 18/09/2026

**Quatre reproches de Wah, quatre causes, et trois étaient la même.**

1. **« Il y a des points noirs. »** Le fond perforé. Sa maquette montrait
   le Totehm *de la méthode Stoner* pour me faire comprendre l'objet ;
   j'ai pris l'illustration pour une consigne de rendu. À 62 px les trous
   du logo ne se lisent plus comme des perforations — ils se lisent comme
   des points sales. **Un aplat, et la couleur fait tout le travail.**
2. **« Il se déplace en fonction des vues. »** `.cur[hidden]{display:none}`
   retirait le curseur **du flux** : la colonne se retassait et le carré
   sautait. J'avais cru garder la place en donnant une largeur aux
   curseurs — *une largeur ne garde rien quand l'élément n'est plus
   affiché.*
3. **« On ne voit pas les curseurs. »** Même cause. Ils étaient
   `display:none` dès qu'il n'y avait pas de voisin.
4. **« Les titres doivent être plus visibles. »** 7 px à 72 % d'opacité :
   une note de bas de page pour l'information la plus importante de
   l'écran après la liste.

**Ce qui répare les trois premiers d'un coup : une GRILLE 3×3 à cases
fixes.** Le carré au centre, les quatre chevrons dans les quatre cases du
bord, le nom dessous. **La position ne dépend plus de ce qui est
visible : elle est écrite dans la grille.** Et un curseur sans voisin ne
disparaît plus — il s'éteint (`.mort`), garde sa case, et continue de
faire le CADRE. *Un cadre à trois côtés n'est pas un cadre.*

**⚠️ UNE GRILLE NE PLACE QUE SES ENFANTS DIRECTS.** Le carré et les deux
chevrons latéraux étaient enveloppés dans un `#joy-row` hérité de la
version flex : leur `grid-area` était donc ignoré et ils se posaient
n'importe où. Les cinq pièces sont à plat.

**⚠️ LE CARRÉ N'EST PAS LA COULEUR DU PAPIER, IL EST CELLE DE LA
FAMILLE.** À `var(--paper)` il disparaissait purement et simplement. Même
rapport que les boîtes de la liste : le papier recule, l'objet avance.

**⚠️ LES CHEVRONS VIVENT SUR LE PAPIER, PAS DANS LE CARRÉ.** `--blue`
(#36498c) et `--rep` (#743169) sur un papier #2b2b57, c'est du sombre sur
du sombre : deux des quatre étaient là et ne se voyaient pas. Ils
prennent la version CLAIRE de leur famille — le bleu devient ciel, le
rouge-violet devient rose. La famille se lit toujours, le chevron se
voit.

**La mise en page, au mot près** : le **T plus grand, à gauche** (58 px —
seul, il n'a plus à rapetisser pour ne pas pénétrer le wordmark) et le
**TOTEHM en bas à droite**. Les trois portes passent donc à gauche, là où
le wordmark était. Le bas se lit de gauche à droite : ce qu'on peut
faire, puis qui on est.

> **⚠️ RE-INVERSÉ LE 20/09 : LE WORDMARK EST EN BAS À GAUCHE.** Il a fait
> le tour en trois jours, et cette fois la raison tient : le T est en
> haut à gauche, donc la marque tient la colonne de gauche d'un bout à
> l'autre, du côté du rail qui EST le logo. Et le coin bas-droit ainsi
> libéré est ce qui a permis de sortir le contrôleur de sous la croix —
> voir **⛔ QUATRE COINS, QUATRE OBJETS**.

### ⛔ QUAND RÉESSAYER NE SERT À RIEN, ON NE DIT PAS « RÉESSAIE » — 18/09/2026

**« L'ouverture du Stripe ne marche pas. »** Les logs de la fonction
donnaient la cause en trente secondes, dans les mots de Stripe :

> *You must complete your platform profile to use Connect and create live
> connected accounts.*

Connect est activé ; le **questionnaire de profil plateforme** ne l'est
pas. Aucune ligne de code n'y change quoi que ce soit — et tant qu'il
n'est pas rempli, **aucun** créateur ne peut ouvrir de compte.

La page disait « Stripe did not answer. Try again in a minute. » C'est un
mensonge doublé d'une faute : la cause est chez NOUS, et inviter le
créateur à recommencer le fait douter de lui. `creator-onboard` distingue
maintenant ce cas (`platform_incomplete`, 503) et la page dit *« Payouts
aren't open yet — this is on us, not on you. »*

> **La règle : deux échecs qui n'ont rien à voir ne doivent pas dire la
> même chose.** Un message d'erreur générique transforme un problème
> connu en mystère — et c'est comme ça qu'un bouton reste mort trois
> jours.

**⚠️ ÉPILOGUE · 19/09/2026 : le blocage n'a pas été levé, il a été
CONTOURNÉ.** Connect est abandonné pour les créateurs, donc il n'y a plus
de profil plateforme à remplir pour que quelqu'un soit payé. La leçon
sur le message d'erreur reste entière et `creator-onboard` garde son cas
`platform_incomplete` — le Club, lui, encaisse toujours par Stripe.

### ⛔ UN TITRE, QUATRE CURSEURS — 17/09/2026

La croix à cinq carrés montrait **tout en permanence** : cinq couleurs,
cinq noms, deux axes, au-dessus d'une liste. Un plan du produit posé sur
le produit — « fourre-tout », et Wah avait raison.

Il reste **le titre de la vue où l'on est** (`#vnow`) et **quatre
curseurs**, un par côté du Totehm (`.cur`), chacun portant le nom et la
couleur de la vue de ce côté-là. Un curseur sans voisin se retire
(`hidden`) : un bouton qui ne fait rien apprend à ne plus regarder les
autres.

**La répercussion 3D** : le titre pivote DANS LA DIRECTION DU VOYAGE —
à droite sur son axe vertical, en bas sur son axe horizontal. Le carré
est un objet, on vient d'en tourner une face. La perspective vit sur le
PARENT ; sans elle la rotation se lit comme un écrasement.
⚠️ Une animation se rejoue à chaque redessin si on se contente de poser
la classe : on la retire, on force un reflow, on la remet. Sans ça,
cliquer dans une boîte faisait pivoter le titre.

**⚠️ LES CURSEURS VIVENT HORS DE `#stage`.** Dedans, ils passaient
par-dessus les boîtes, pour deux raisons qu'il fallait toutes les deux :
`#stage` porte un transform (il contient donc tout ce qui est `fixed`
dedans) ET `overflow:hidden` (il rogne ce qui dépasse). Un curseur « à
l'extérieur du carré » était ramené dedans puis coupé.

**Deux écrans, deux vérités, et c'est assumé.** Sur ORDINATEUR le Totehm
est un carré posé sur du noir : les quatre curseurs vivent dehors, un par
côté, à `--side-gap`. Sur TÉLÉPHONE l'écran EST le carré : il n'y a pas
de dehors, ils se rangent autour du TITRE — jamais par-dessus la liste.

### ⛔ ARRIVER AU BOUT NE FAIT RIEN. IL FAUT REPARTIR. — 17/09/2026

**« Je voulais seulement aller en bas pour ajouter une box et je suis
passé à une autre vue à mon insu. »**

Descendre au bout de la liste, c'est ce qu'on fait pour atteindre
[+ Add a …]. Le geste normal et le geste de navigation étaient donc **le
même geste**, à l'élan près. Monter le seuil n'y change rien : on se
trompe juste un peu plus fort.

**Ce qui distingue un geste d'un autre, ce n'est pas la force : c'est le
TROU.** Un trackpad à inertie envoie des événements pendant une seconde
et demie après que le doigt a quitté la surface — au-delà de n'importe
quel délai de garde. Des événements d'inertie arrivent toutes les 16 ms ;
un silence de **200 ms** veut dire que la main est repartie. C'est la
seule mesure qui sépare « je descends ma liste » de « je veux la vue d'à
côté ».

Trois conditions, et il les faut toutes : la liste en butée **depuis**
420 ms, un **silence** de 200 ms avant le nouveau geste, et 260 px
accumulés. Au doigt : le doigt devait **déjà** être au bord quand il
s'est posé, et tirer de 110 px.

**⚠️ L'HORLOGE DU SILENCE SE MET À JOUR À CHAQUE ÉVÉNEMENT, AVANT TOUT
TEST.** Je ne la touchais qu'après le contrôle du bord : tant qu'on
défilait au milieu elle restait figée, et à l'arrivée en butée l'écart
calculé valait toute la durée du défilement — donc « nouveau geste »,
donc navigation. C'était le bug, dans le correctif du bug. *Un compteur
de silence qui ne compte que quand on l'écoute ne mesure rien.*

Le test ne le voyait pas non plus tant qu'il reproduisait l'ÉTAT (se
poser au bord, puis molette) au lieu du GESTE (partir du milieu, flux
continu qui dépasse). **Se poser au bord puis tirer, c'est déjà un
nouveau geste — et un nouveau geste doit naviguer.**

### ⛔ LE TOTEHM D'UN AUTRE EST LE MÊME TOTEHM — 17/09/2026

**« Le résultat de recherche, c'est le Totehm mais en READ ONLY. Là le
système est fucked up. »** Il l'était, et pire qu'incomplet :

- `loadRO()` ne chargeait que `steps` — quatre vues sur cinq vides ;
- changer de vue appelait `loadTrips()`, qui rend l'arbre **de celui qui
  regarde** : on voyait ses PROPRES objectifs chez quelqu'un d'autre ;
- `is` était jeté, donc le trait de gauche mentait — et comme les
  objectifs et répulsions en héritent, le mensonge se propageait.

Une seule fonction serveur, `totehm_of(pseudo)`, même forme que
`my_trips`, un aller-retour. **La visibilité est vérifiée en base**, pas
à l'écran : `security definer` court-circuite RLS, donc c'est cette
fonction qui porte toute la règle.

**Quatre verrous d'écriture, et il les faut tous** : `save()`,
`cloudSave()` (ils existaient), plus `creer()`, `tue()`, `attache()`,
`detache()` — qui parlent DIRECTEMENT au serveur. Le CSS masquait le
bouton [+ Add] ; **masquer n'est pas interdire**, et depuis le 17/09 la
ligne ne se dessine plus du tout.

Un Totehm qu'on vient lire s'ouvre **déjà déplié** : on arrive d'un
résultat de recherche pour regarder celui d'un autre, il n'y a rien à
déplier. ⚠️ Et `replaceState` garde `?ro=` — il désigne ce qu'on lit.

### LE MOTEUR DE LIENS — trois pannes, une seule cause — 09/09/2026

« Les objectifs et les répulsions ne s'affichent pas instantanément dans
les boxes. Et les suppressions ne fonctionnent pas non plus. » Trois
symptômes, trois bugs, et la même racine : **les liens sont du TEXTE, et
le texte bougeait sous eux.**

**1. L'ARBRE NE SE CHARGEAIT PAS DANS LA VUE HABITUDES.** `setView()`
faisait `if(v!=='habits')loadTrips()` — vrai avant la réécriture, quand
une habitude n'affichait pas ses liens. Depuis, la boîte habitude MONTRE
ses objectifs et ses répulsions : mesuré, elle les affichait vides tant
qu'on n'était pas passé par une autre vue. L'arbre part maintenant au
démarrage, à la connexion, et dans les trois vues. Il ne fait attendre
personne : la liste est déjà peinte depuis le stockage local.

**2. `t0` — LE TEXTE QUE LE SERVEUR CONNAÎT.** `steps` est du texte, donc
`objective_habits` et `repulsion_habits` pointent une habitude par son
TEXTE. Le front cherchait avec `x.t` — ce qui est AFFICHÉ, donc ce qu'on
est en train de taper. Taper une lettre dans un titre changeait la clé de
tous ses liens instantanément à l'écran alors que la base ne l'apprenait
que 700 ms plus tard : **les objectifs et les répulsions disparaissaient
de la boîte à chaque frappe.**

Pire, `habit_rename_links` partait avec « le texte d'il y a une lettre »
comme ancien nom, parce que `ancien` était recalculé à chaque frappe et
que le `differe` précédent était annulé : **les liens s'orphelinaient
pour de bon en base.** C'est ça qui faisait revenir une pièce supprimée.

La règle, désormais : **`x.t` est ce qu'on LIT, `x.t0` est ce que le
serveur CROIT.** On affiche avec `t`, on interroge et on écrit avec `t0`,
et `t0` ne bouge que quand le renommage a été envoyé. La migration en
mémoire suit la lettre ; seul le réseau attend.

**3. UNE MINUTERIE PAR CHAMP.** `differe()` en avait UNE pour tout le
Totehm : écrire dans une habitude puis dans un objectif annulait
l'écriture de l'habitude — `clearTimeout` jetait la fonction en attente
sans jamais l'exécuter. Chaque champ a sa clé (`h:h3`, `t:obj-1`), et
`pousse()` les vide toutes. `fermer()` pousse AVANT de recharger l'arbre :
sinon le serveur répond avec l'ancien texte et l'écran perd la dernière
frappe.

**Et supprimer coupe les liens avec `t0`.** Avec le texte affiché, une
habitude renommée puis supprimée laissait ses liens en base, et
`my_trips` la faisait revenir au rechargement suivant.

**La règle générale, et elle vaut pour tout lien par texte :** ce qu'on
affiche et ce qu'on envoie ne sont pas la même valeur dès qu'une écriture
est différée. Deux champs, jamais un.

### ON NE LIT JAMAIS PENDANT QU'ON ÉCRIT — 09/09/2026

« Quand je supprime un objectif, il apparaît de suite. » Ce n'était pas
un bug de suppression : c'était une COURSE, et elle se gagnait presque
toujours du mauvais côté.

```
1. on retire l'objectif de la liste          immédiat, à l'écran
2. on envoie `trip_close`                    parti, PAS arrivé
3. `fermer()` recharge l'arbre               `my_trips` répond AVANT (2)
4. le serveur renvoie l'objectif encore actif → il réapparaît
```

`apres()` envoyait sans jamais attendre. **`EN_VOL` tient maintenant les
écritures parties et pas encore revenues, et `loadTrips()` commence par
`await calme()` : aucune lecture de l'arbre ne démarre tant qu'il reste
une écriture en l'air.** `calme()` pousse aussi les minuteries — une
frappe qui dort compte comme une écriture qui n'est pas partie.

Ça vaut pour TOUTES les écritures — attacher, détacher, renommer,
supprimer — donc la même course ne peut plus se reproduire ailleurs.

**⚠️ ET LE TEST DOIT AVOIR DE LA LATENCE.** Le faux Supabase répondait
dans le même tour de boucle : une écriture était toujours arrivée avant
la lecture suivante, et la course était **structurellement invisible en
test**. Il applique maintenant la mutation QUAND ELLE ARRIVE (80 ms), pas
quand elle part. Contre-épreuve faite : sans le correctif, 6 assertions
sur 7 tombent ; avec, zéro.

**La règle : un faux serveur qui répond instantanément ne prouve rien
sur l'ordre des choses.** Toute panne d'ordonnancement lui échappe.
