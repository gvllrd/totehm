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

### ⚠️ LE SWAP DU 15/09/2026 — LE NOM DU DOSSIER NE DIT PLUS CE QU'IL SERT

```
~/totehm/
  com/       →  totehm.com           LE RÉSEAU SOCIAL PRIVÉ  ← le produit
  space/     →  www.totehm.space     le branding, l'expérimentation
  boutique/  →  www.higher.boutique  le Cloth
  backend/   →  servi par PERSONNE
  oracle/    →  clés SSH, gitignoré
```

**Le contenu des deux dossiers a été ÉCHANGÉ ; le mapping Vercel n'a pas
bougé** (projet `com` → dossier `com/`, projet `space` → dossier
`space/`). Ce sont donc les **URL publiques** qui ont changé de rôle :

| avant le 15/09 | depuis |
|---|---|
| `totehm.space/totehm` = le réseau social | **`totehm.com/totehm`** |
| `totehm.com` = le branding | **`totehm.space`** |

```
com/     totehm.html · wisdom.html · vision.html · map.html
         higherself.html · totehm_world.html · next_objective.html
         totehm_7_intentions.html · terms.html · club/ · vercel.json
space/   discover.html · discover_lisbon.html · get_higher.html
         origins.html · stoner.html · stoner_terms.html
         play_lisbon_street.html · vercel.json
```

**Trois conséquences, et il faut les trois :**

1. **Tout `CLAUDE_CODE.md` préfixe par le dossier RÉEL** — `com__totehm.html`,
   `space__discover.html` — et les `cp` visent `~/totehm/com/` ou
   `~/totehm/space/` en cohérence. Un lot écrit contre l'ancien état doit
   être corrigé à la main, et ça s'est produit une fois.
2. **Les outils (`tools/*.py`) pointent sur `com/`.** Recalés le 15/09 ;
   chacun porte la marque du swap en tête.
3. **Les URL de retour Stripe visent `SITE_COM`.** Une URL de retour qui
   pointe encore sur `.space` renvoie l'influenceur sur la page de
   branding AU MILIEU de son onboarding — on ne le voit qu'en production,
   sur un vrai créateur.

**La règle qui en sort, et elle est générale : un nom de dossier ou de
projet n'est pas une source de vérité.** Ce qui fait foi, c'est ce
tableau. Lire avant de déplacer.

`backend/` doit **impérativement** rester à la racine. Dans un dossier Vercel,
le SQL, les Edge Functions et le `docker-compose.yml` deviendraient
téléchargeables.

**Produits indépendants = fichiers indépendants.** `totehm.com/` ne référence
jamais `space/`. Un contenu commun est copié, pas partagé. Un produit qui casse
quand un autre bouge n'est pas indépendant.

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

### ⛔ LE PONT SSO — QUATRE DOMAINES, UNE IDENTITÉ — 17/09/2026

**Il n'y a toujours pas de session partagée, et il ne peut pas y en
avoir** : quatre origines, quatre `localStorage`. Ce qui existe depuis le
17/09, c'est un PONT — on ne contourne pas la frontière, on la traverse.

Le mécanisme, en cinq lignes :

1. sur le domaine A (connecté), la page demande un **code de passage** ;
2. elle redirige vers B avec le code dans le fragment ;
3. B **retire le code de l'URL avant tout autre geste**, puis l'échange ;
4. le serveur vérifie, **brûle** le code, et rend un jeton Supabase ;
5. B ouvre sa propre session avec ce jeton (`verifyOtp`).

**⚠️ CE CODE N'EST PAS UN JETON DE SESSION.** La règle « jamais un jeton
de session dans une URL » tient parce qu'un jeton de session vit des
heures et ouvre tout. Ce code vit **60 secondes**, ne sert **qu'une
fois**, n'est valable que pour **un domaine cible**, est stocké
**haché**, et n'ouvre rien par lui-même — il faut l'échanger côté
serveur. C'est un code d'autorisation. Le confondre avec une clé, ce
serait s'interdire tout SSO.

**⚠️ ON NE SIGNE PAS DE JETON À LA MAIN.** `auth.admin.generateLink`
fabrique un jeton que Supabase sait déjà vérifier, et `verifyOtp` ouvre
une session normale — avec son refresh token et sa déconnexion. Signer
soi-même un JWT, ce serait réimplémenter l'expiration, le
rafraîchissement et la révocation, et se tromper quelque part.
`generateLink` **n'envoie aucun email** : elle génère, c'est sa raison
d'être.

**Le bloc front se COPIE** (`tools/sso_snippet.js`), il ne s'importe pas
— règle du projet. Il est posé dans les sept pages qui portent une
session, et il **bloque au niveau du module** (`await` top-level) : quand
la page lit sa session, la session est déjà là. Plafond de 2,5 s — si le
pont tousse, on continue sans session et le membre se connecte par
email. Dégradé, pas cassé.

**Quatre cibles, jamais une URL reçue** : `com` · `space` · `boutique` ·
`club`. Une page qui choisirait librement sa destination laisserait
n'importe quel site demander un code « pour lui-même ».

### ⛔ SOUS `cleanUrls`, TOUT LIEN INTERNE EST ABSOLU — 16/09/2026

**C'est la cause du 404 de l'espace créateur.**

`vercel.json` pose `cleanUrls: true`. L'URL du Club est donc `/club`,
**sans barre oblique finale** — et le répertoire de base d'un document
servi à `/club` est `/`, pas `/club/`. Un `href="creator.html"` dans
cette page résout vers **`/creator.html`** : 404 NOT_FOUND. Vérifié en
production le 16/09 — `/club/creator` rend 200, `/creator.html` rend 404.

Deux liens voisins (`../map.html`, `../totehm.html#in`) marchaient **par
chance** : remonter d'un cran au-dessus de la racine y reste. C'est le
pire cas — la moitié des liens marche, donc on ne cherche pas la règle.

> **La règle : un lien vers une autre page du même domaine s'écrit en
> chemin ABSOLU** — `/club/creator`, `/map`, `/totehm#in`. Un chemin
> absolu ne dépend pas de la barre oblique finale. Ça vaut aussi pour les
> `return_url` envoyées à Stripe.

### ⛔ LE MODÈLE DE DONNÉES EST FERMÉ — 15/09/2026

**CINQ OBJETS, SEPT INTENTIONS. Aucune sixième catégorie, jamais.**

| l'objet | la table | ce qu'il porte en plus |
|---|---|---|
| HABITS      | `totehms.steps` (jsonb) | rythme · objectifs · répulsions |
| OBJECTIVES  | `objectives` | deadline · habitudes · **visions** |
| REPULSIONS  | `repulsions` | habitudes · **teachings** |
| VISIONS     | `visions` | — |
| TEACHINGS   | `wisdom` | **objectifs** |

**Chaque objet porte UNE OU PLUSIEURS intentions parmi les sept** —
fight · flow · enrich · love · express · focus · celebrate. La liste est
verrouillée EN BASE par une contrainte `check` sur les quatre tables, pas
seulement à l'écran : un front peut se tromper, une contrainte non. La
liste vide reste permise — un objet s'écrit avant de se qualifier, et
forcer l'intention à la création empêcherait d'écrire.

⚠️ **`is` EST LA LISTE, `i` EST LA PREMIÈRE.** Deux colonnes, une seule
vérité : `i` vaut toujours `is[1]`, et c'est `intentions_set(kind,id,is)`
qui pose les deux — jamais une écriture à la main. `i` existe parce que
le bot et la carte la lisent déjà ; la retirer voudrait dire réécrire les
deux. Même doctrine que `steps.o` face à `objective_habits` : la colonne
historique porte le premier lien, la table porte la vérité.

**Un seul verbe côté serveur pour les quatre tables** : `intentions_set`.
Le nom de table ne vient JAMAIS du client tel quel — il est traduit par
un `case` fermé, parce qu'un `format(%I)` sur une chaîne reçue laisserait
écrire dans n'importe quelle table de la base.

**Deux axes, deux langages visuels, et il ne faut pas les confondre :**
la COULEUR DE LA BOÎTE dit le TYPE (navy · bleu clair · rouge-violet) ;
le TRAIT du bord gauche dit l'INTENTION. Un objet a les deux, toujours.

**Les trois liens croisés** (`objective_visions`, `repulsion_teachings`,
`teaching_objectives`) sont des tables de jointure, jamais une colonne :
un lien qui n'en accepte qu'un finit toujours par en accepter plusieurs,
et c'est là qu'on réécrit la moitié du produit.

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

### `/verify` — LE REGISTRE D'AUTHENTICITÉ — architecture, 17/09/2026

Pas encore codé. Décidé, pour que le jour où on le code il n'y ait plus
qu'à écrire.

**Ce que ça doit prouver** : que telle œuvre digitale, achetée sur
`totehm.space`, appartient à telle personne. Rien de plus. Pas une
blockchain, pas un NFT : un **registre signé**, sur notre base, dont
l'URL publique est la preuve.

**La table** : `artwork_owners` — `artwork_id`, `owner_id`,
`acquired_at`, `stripe_payment_intent`, `edition` (n° sur N), `cert`
(l'empreinte). Écrite **par le webhook Stripe uniquement**, jamais par
une page : une ligne de propriété écrite côté client est une ligne
inventée.

**L'empreinte** : `sha256(artwork_id || owner_id || acquired_at || sel)`
où le sel est un secret d'Edge Function. Elle ne protège pas l'œuvre —
elle protège le REGISTRE : on peut vérifier qu'une ligne n'a pas été
retouchée sans pouvoir en fabriquer une.

**La route** : `totehm.space/verify?c=<cert>` — publique, sans session.
Elle rend l'œuvre, l'édition, la date, et le **pseudo** du propriétaire
si son Totehm est partagé, sinon rien d'autre que « vérifié ». ⚠️ Jamais
un email, jamais un identifiant : une page de vérification est une page
qu'on envoie à un tiers.

**Ce qui se décide avant d'écrire une ligne** : que se passe-t-il à la
REVENTE. Soit le certificat est immuable et une revente crée une nouvelle
ligne qui chaîne la précédente (`supersedes`), soit il n'y a pas de
revente. Tant que ce n'est pas tranché, le registre ne se code pas — un
registre qu'on doit migrer n'est plus un registre.

### LE CLUB ET LES CRÉATEURS — 15/09/2026

**`figher.club` est un VANITY URL.** Le Club vit sur
**`totehm.com/club`**, c'est-à-dire sur l'origine du Totehm : même
`localStorage`, donc **même session**. Un membre passe de son Totehm au
Club et à ses gains sans se reconnecter. Le domaine, quand il sera
acheté, sera une simple redirection 308 — on garde le nom de marque sans
payer une quatrième session.

C'est Wah qui a tranché, et c'est la bonne tranche : le nom ne demandait
pas le domaine.

#### Le split 80/20 — ⚠️ CE N'EST PLUS STRIPE QUI LE FAIT · 19/09/2026

**Le taux n'a pas bougé : 80 % au créateur, 20 % à la plateforme. La
SORTIE a bougé.** Stripe Connect est abandonné pour les créateurs — voir
**⛔ STRIPE CONNECT EST ABANDONNÉ POUR LES CRÉATEURS — 19/09/2026** plus
bas, qui fait autorité sur tout ce paragraphe. L'argent arrive entier sur
le compte de la plateforme et les 80 % partent à la main le 1er.

Et l'IBAN, lui, est bien chez nous maintenant. Ce qui suit était vrai
jusqu'au 18/09 et ne l'est plus.

<details><summary>La version Connect (15/09) — archive</summary>

Le split était deux paramètres :

```
subscription_data.transfer_data.destination = compte connecté du créateur
subscription_data.application_fee_percent   = 20
```

Stripe versait 80 % au créateur et 20 % à la plateforme **à chaque
renouvellement**, sans virement manuel, sans réconciliation. Je l'avais
sous-estimé : ce n'était pas trois semaines de travail, c'était deux
paramètres. *Ce qui prenait du temps, ce n'était pas le code — c'était
l'activation Connect côté Stripe et la vérification de la plateforme.*
**Et c'est exactement là que tout a bloqué trois jours.**

**Connect Express** hébergeait l'identité, les pièces, la conformité
fiscale et les virements. On ne stockait QUE `stripe_account_id` — jamais
un IBAN, jamais une pièce d'identité, jamais une date de naissance.
C'était la seule forme de Connect qui tenait dans une timeline de
75 jours — et elle n'y a pas tenu.

</details>

#### ⚠️ LA CLÉ SECRÈTE NE TOUCHE JAMAIS LE NAVIGATEUR

Lire une balance demande la clé secrète. Une clé secrète dans un fichier
servi, c'est le compte Stripe entier — tous les créateurs, tous les
paiements — offert à qui ouvre l'inspecteur. **Quatre Edge Functions**
font les appels côté serveur ; la page ne reçoit que des NOMBRES DÉJÀ
CALCULÉS.

| fonction | ce qu'elle fait |
|---|---|
| `creator-onboard`   | crée le compte Express + un AccountLink à usage unique |
| `creator-dashboard` | balance, abonnés, MRR — lus avec `stripeAccount` |
| `creator-price`     | le prix, borné 3–500 € ici ET par la contrainte SQL |
| `creator-subscribe` | le Checkout du fan, avec le split 80/20 |

**Le compte connecté vient TOUJOURS de la session, jamais du corps de la
requête.** Sinon un créateur lirait la balance d'un autre en changeant un
identifiant, ou relierait le compte Stripe d'un autre au sien.

**`stripeAccount` n'est pas optionnel** sur `balance.retrieve` : sans cet
en-tête on renvoie la balance de la PLATEFORME à chaque influenceur — le
pire chiffre faux imaginable.

**Stripe rend une ligne PAR DEVISE.** Prendre `[0]` marche jusqu'au
premier fan qui paie en livres, puis affiche un chiffre faux sans
prévenir. On additionne par devise.

**On affiche SA part, pas le brut.** Un créateur qui lit 1 000 € et
reçoit 800 € se sent floué, même si le taux était écrit ailleurs.

**Et la metadata voyage EN DOUBLE** (`subscription_data.metadata` en plus
de celle de la session) : les événements de cycle de vie ne portent pas
la metadata du Checkout, et ce sont eux qui coupent l'accès.
Irrattrapable après coup.

#### Ce qu'un fan peut lire

`creator_subscriptions` est la jointure qui ouvre la lecture du Totehm
d'un créateur à son abonné, par `is_subscribed_to()` — `security
definer` et `stable`, sinon la politique rappelle la RLS de la table
qu'elle interroge et part en récursion.

### ⚠️ LE QUATRIÈME DOMAINE — l'arbitrage, et ce qu'il est devenu — 15/09/2026

J'ai recommandé de NE PAS acheter un quatrième domaine, pour une raison
qui reste vraie : quatre domaines = quatre `localStorage` = quatre
sessions, **et il n'y a pas de SSO**. Un membre connecté sur le Totehm
serait arrivé déconnecté sur `figher.club`, devant les trois choses qu'il
paie.

**Wah a tranché autrement et mieux : `figher.club` devient un VANITY
URL.** Le Club vit sur l'origine du Totehm, le domaine n'est qu'une
redirection. On garde le nom de marque et on ne paie pas la session.
C'est la réponse que je n'avais pas vue — je posais le choix comme
« le domaine OU la session », il l'a résolu en « le nom sans le domaine ».

**Ce qui reste vrai et qu'il ne faut pas oublier :** le jour où un
service TOTEHM vivra vraiment sur une autre origine, il lui faudra un
pont — `auth.admin.generateLink` → `token_hash` à usage unique et courte
durée, échangé côté serveur. **Jamais un jeton de session dans une URL.**

### Les écrans de totehm.space — 09/09/2026

```
LE TOTEHM                                  LE MONDE
totehm.html                                totehm_world.html  →  map.html
trois VUES dans UN fichier                 la porte           la Higher Map
  répulsions · habitudes · objectifs

DEUX PORTES, en bas à droite               DANS LA POCHE
wisdom.html   My Wisdom                    higherself.html
vision.html   My vision for the future     HigherSelf — mini-app Telegram
```

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

<details><summary>L'ancienne doctrine des jumeaux (13/09/2026) — archive</summary>

`wisdom.html` (rouge-violet) et `vision.html` (bleu clair) donnaient
l'impression qu'on a seulement changé le FOND du Totehm. Tout le reste
est le MÊME objet, à la même place, au pixel : le T en haut, le rail à
gauche, le TOTEHM en bas, l'accès membre au-dessus du T, la croix en haut
à droite, la boîte, et la piste de classement dans le rail.

**Ils sont GÉNÉRÉS, pas écrits** — `tools/jumeau.py` les dérive de
`totehm.html`. Deux copies tenues à la main divergent toujours, et ici la
divergence se verrait au premier saut de logo : c'est exactement ce qui a
été signalé deux fois. On COPIE (règle du projet : produits indépendants
= fichiers indépendants), mais on copie par une machine.

Ce qui change, et rien d'autre : le titre · `--paper` et `--skin` · le
moteur de liste (une table, un texte, une importance) · les trois carrés
de vue disparaissent · la croix ramène au Totehm.

**`#gate` est ARRACHÉ des jumeaux.** On n'y arrive QUE depuis le Totehm
déployé : il n'y a rien à déplier. Retirer la classe ne suffisait pas —
`#terms-corner` vit dans `#gate` en `position:fixed` et interceptait les
clics de toute la page, la croix comprise. Le bloc entier part.

**La croix renvoie sur `totehm.html#in`**, et le Totehm s'ouvre DÉJÀ
DÉPLOYÉ. ⚠️ La décision se prend à la ligne qui POSE la classe (dans le
module GATE), pas plus haut : elle s'exécute après, et elle reposait le
drapeau qu'on venait de retirer. Et il faut la RETIRER, pas seulement ne
pas la poser — elle est écrite dans le HTML (`<body class="gate">`) pour
éviter le flash au chargement.

**Pas de petit T à gauche du rail dans un jumeau.** Une intention sur une
leçon ou sur une vision ne voudrait rien dire — même règle que pour les
objectifs et les répulsions.

**⚠️ UNE REDÉCLARATION EST UNE SyntaxError, ET ELLE EMPORTE TOUT.** En
dérivant ces fichiers j'y suis tombé trois fois de suite — `open`,
`rangHTML`, `listeDe` : la page s'affichait, vide, sans un mot. Le
script AUDITE désormais chaque jumeau et refuse d'écrire si un nom est
déclaré deux fois au niveau du module. On ne cherche plus à la main ce
qui se mesure.

</details>

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

> **⚠️ DEUX POINTS DE CETTE SECTION SONT DÉPASSÉS.** Les ronds ne sont
> plus des tons éclaircis et le rond actif n'est plus blanc — voir
> **⛔ LE PAVÉ REND AUX RONDS LEURS COULEURS · 22/09**, qui fait
> autorité. Et le contrôleur n'est plus en haut sur ordinateur : il est
> au centre du BAS sur les deux écrans. Le reste — l'axe, la tuile qui
> porte l'époque — n'a pas bougé et reste la raison de fond.

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

---

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

---

### ⛔ ÉCHAP REPLIE LE TOTEHM, IL NE FERME PAS UNE BOÎTE — 20/09/2026

Noté parce que ça m'a coûté deux passes de test : `Échap` est le **même
geste que la croix `#fold-x`** — il ramène à l'atterrissage. Pour fermer
une BOÎTE, c'est sa propre croix (`data-x`).

Et le corollaire, qui est un bon comportement, pas un bug : **les flèches
DANS un champ de texte déplacent le curseur, elles ne changent pas de
vue.** Un test qui navigue doit refermer la boîte d'abord.

---

### ⛔ LE TOTEHM EST LE PASSEPORT — 19/09/2026

**Un Totehm complet = AU MOINS UNE BOÎTE REMPLIE DANS CHACUNE DES CINQ
VUES.** Habitudes, objectifs, répulsions, sagesse, visions. Pas quatre
sur cinq. Pas « cinq boîtes ». **Cinq vues habitées.**

C'est la clé d'accès de tout l'écosystème, et c'est volontairement la
même clé partout :

| Qui | Ce qui est fermé sans Totehm complet |
|---|---|
| Créateur | TotehmBot · la monétisation |
| Abonné | la visibilité de son profil · les candidatures Spot |
| Client galerie | l'achat d'art donne un pass à vie, mais **[Get Higher] reste fermé** tant que son Totehm est vide |
| Boutique | la génération du visuel textile |

**⚠️ LA RÈGLE VIT DANS LA BASE, PAS DANS LE NAVIGATEUR** —
`totehm_complete(p_user uuid default null)`, `security definer`. Une page
peut mentir sur ce qu'elle a affiché ; la base, non. Les quatre produits
interrogent la MÊME fonction, donc ils disent tous la même chose, et le
jour où la règle change elle change une fois.

**⚠️ UNE BOÎTE VIDE NE COMPTE PAS.** Les cinq objets naissent sans texte
puis s'écrivent dedans (c'est la création optimiste : la boîte apparaît,
on tape après). Compter les LIGNES laisserait passer un Totehm de cinq
boîtes vides — exactement le contraire d'un passeport. On compte donc les
lignes **dont le texte n'est pas vide**.

**⚠️ `p_user` LIT LE TOTEHM DE N'IMPORTE QUI** — c'est nécessaire pour le
webhook et pour `creator_cercle()`. La fonction ne renvoie donc QUE des
booléens, jamais un contenu. Ça ne doit pas changer.

**Ce qu'on montre au membre qui n'y est pas encore** : `remplies` (0 à 5)
sort de la même fonction. Le calculer côté page, ce serait cinq additions
que le serveur a déjà faites.

---

### ⛔ STRIPE CONNECT EST ABANDONNÉ POUR LES CRÉATEURS — 19/09/2026

**Ce n'était pas un bug de code.** Les logs de la fonction rendaient les
mots de Stripe : *« You must complete your platform profile to use
Connect. »* Trois jours, tous les créateurs bloqués, et derrière ce
blocage : un KYC par créateur et un compte connecté exigé **avant le
premier euro** — pour virer 80 % à une poignée de gens **une fois par
mois**.

**La sortie est manuelle.** L'argent arrive ENTIER sur le compte de la
plateforme ; les 80 % partent à la main le 1er, vers l'IBAN ou le PayPal
que le créateur a posé dans son tiroir (`creator_payout_set`).

Dans `creator-subscribe` : **ni `transfer_data` ni
`application_fee_percent`**, et un commentaire à l'endroit exact où ils
étaient — pour que personne ne croie à un reversement automatique.
`PART_TOTEHM = 20` sert encore, mais à CALCULER ce qu'on doit, plus à
demander un partage à Stripe.

**⚠️ LES COLONNES CONNECT RESTENT** (`stripe_account_id`,
`charges_enabled`, `payouts_enabled`). Vides, elles ne coûtent rien, et
elles reprennent leur rôle le jour où Connect revient. Une colonne
effacée est une migration de retour à écrire.

**Le palier de bascule : cent créateurs.** En dessous, Connect coûte plus
de friction qu'il ne fait gagner de temps. Au-dessus, virer à la main
devient le travail d'une demi-journée par mois et Connect redevient le
bon outil. Les tables ne bougeront pas ; seule la sortie changera.

**⚠️ L'IBAN EST STOCKÉ EN CLAIR, ET C'EST ÉCRIT DANS LA MIGRATION.**
Postgres est chiffré au repos, la table est en RLS, et **la lecture ne
rend JAMAIS que les 4 derniers caractères** (`creator_cercle` →
`payout_fin`). Assez pour reconnaître le sien, pas assez pour s'en
servir. Ce n'est pas un coffre-fort : c'est un carnet d'adresses
bancaires, et il se vide le jour où Connect revient.

---

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

---

### ⛔ LE JOYSTICK PASSE EN RONDS — 19/09/2026 · DÉPASSÉ LE 20/09

> **⚠️ CETTE SECTION A VÉCU UNE JOURNÉE.** Les cinq ronds blancs sont
> devenus **trois ronds de couleur** le 20/09 — voir **⛔ LE PAVÉ PASSE
> EN TROIS COULEURS**, qui fait autorité. Ce qui suit reste pour la
> raison du fond (le vrai navy, les curseurs blancs, le swipe horizontal
> depuis les vues verticales) : ces trois-là n'ont pas bougé.

**Wah : « Des ronds, pas des carrés. »** Trois ronds verticaux posés sur
trois ronds horizontaux — **cinq, pas six** : celui des habitudes est
commun aux deux axes. C'est le Totehm, pas un pavé numérique.

- **Le fond ne change qu'avec l'axe HORIZONTAL.** Objectifs et répulsions
  sont la même colonne que les habitudes : même époque, donc même fond.
  Peindre le fond aussi, ce serait dire qu'on a changé d'époque.
- **Le vrai Navy est revenu.** J'avais glissé `--sky` dans la pile — un
  bleu clair hors charte. `--navy` (#333366) est la couleur du présent et
  elle ne se remplace pas.
- **Les curseurs sont BLANCS.** Colorés à la famille, ils étaient du
  sombre sur du sombre. Le blanc se voit sur les trois fonds.
- **Le swipe horizontal marche AUSSI depuis les vues verticales.** La
  croix s'élargit : `repulsions` et `objectives` ont maintenant `g` et
  `d`. On n'est jamais enfermé dans une colonne.

**⚠️ L'AXE NE SE RECOPIE PAS, IL SE DÉDUIT DE `CROIX`.** Il y avait une
seconde table `AXE` écrite à la main qui disait la même chose que la
croix — et qui a cessé de la dire **à la minute où la croix s'est
élargie** : depuis les objectifs on pouvait partir à gauche, mais les
ronds de la sagesse et de la vision restaient éteints. *Deux tables qui
doivent s'accorder finissent toujours par ne plus s'accorder.* Le pad
allume maintenant ce vers quoi on peut RÉELLEMENT aller.

---

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

---

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

---

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

---

### ⛔ LE FILTRE NE CONCERNE QUE LES HABITUDES — 19/09/2026

**Le T (`T.svg`) EST le filtre**, et il ne filtre que les habitudes.
Ailleurs, il ne clignote pas et ne s'ouvre pas. *Un bouton qui s'allume
sur un écran où il n'agit pas promet quelque chose qu'il ne tiendra pas.*

Et « Order by importance… » : cassé sur desktop, absent sur mobile. Même
cause que d'habitude — une règle de mise en page écrite dans un `@media`.

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

<details><summary>La version du matin (déplacée, perforée) — archive</summary>

### ⛔ LE JOYSTICK — LE TOTEHM COMME CONTRÔLEUR — 18/09/2026

**Ce n'est pas un menu, c'est une maquette du Totehm.** C'est la
différence avec les deux tentatives précédentes, et c'est ce qui la fait
tenir.

- **Le carré perforé EST le Totehm.** Sa couleur dit où l'on est sur
  l'axe du TEMPS : rouge-violet (sagesse) · navy (le présent) · bleu
  (vision). ⚠️ Elle ne change **qu'avec l'axe horizontal** — objectifs et
  répulsions sont la même colonne que les habitudes, leur fond est le
  même. Peindre le fond aussi, ce serait dire qu'on a changé d'époque.
- **La pile de dalles dedans** dit où l'on est sur l'axe de la
  PROFONDEUR : elle glisse pour amener au centre l'objectif (bleu, haut),
  l'habitude (navy, milieu) ou la répulsion (rouge-violet, bas). La dalle
  centrée est pleine, les deux autres reculent.
- **Sur la sagesse et la vision, il n'y a qu'une dalle.** L'axe vertical
  n'existe pas là-bas ; en montrer trois serait un mensonge.
- **Quatre chevrons l'encadrent, sans un mot.** Le carré dit déjà ce
  qu'il y a de chaque côté, par sa couleur et par la dalle allumée.

**La marque se range à gauche** : le T au-dessus du wordmark, même
colonne. Le wordmark quitte le bas — `--band-b` passe de 116 à 98 px et
la liste y gagne.

**Trois collisions mesurées le 18/09, et chacune a sa leçon :**

1. ⚠️ **`#bigT svg` et `#wordmark svg` étaient DÉCLARÉS DEUX FOIS**,
   séparés par vingt lignes. La seconde gagnait sans un mot, et mes
   tailles n'avaient aucun effet. *Un sélecteur écrit deux fois n'est pas
   une redondance, c'est un piège.*
2. ⚠️ **Le joystick passait sous `#fold-x`** (la croix, `z-index:34`,
   coin haut droit). Les curseurs étaient visibles et le clic partait
   dans la croix. La croix est un repère fixe du produit : c'est au
   nouveau venu de s'écarter — le joystick se pose à 58 px du bord.
3. ⚠️ **En lecture, `#ro-bar` couvrait tout le haut** (`z-index:40`,
   pleine largeur). Elle ne se déplace pas — elle dit qui on lit, c'est
   sa place. C'est le reste qui recule de sa hauteur (`--ro-h`), et
   `--band-t` en découle donc la liste suit toute seule.

</details>

### ⛔ « HIGHER » NE S'ÉCRIT JAMAIS EN TEXTE — 18/09/2026

Règle de marque, sans exception : **`Higher` est un slogan, donc un
SVG** (`<use href="#higher-badge">`), partout où il paraît. Tapé au
clavier il devient un mot ordinaire dans la fonte du système, et la
marque s'éteint à l'endroit exact où elle devrait parler.

Conséquence pour les tests : `textContent` d'une porte qui porte le
slogan rend un trou — « My  Self ». **C'est la preuve que la règle est
tenue**, pas un bug d'assertion.

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

### ⛔ AUCUNE BORDURE AUTOUR D'UNE BOÎTE — RÈGLE DE MARQUE · 09/09/2026

**Vaut sur les TROIS domaines, sans exception :** `totehm.com`,
`totehm.space`, `higher.boutique`. Aucune carte, aucun panneau, aucune
fenêtre, aucun bouton, aucune saisie ne porte de trait dessiné autour
d'elle.

**Ce qui délimite, et rien d'autre :**

| | |
|---|---|
| Navy `#333366` · Bleu clair `#36498c` · Rouge-violet `#743169` | les blocs |
| Noir absolu `#000` | le vide, les perforations |
| Le gris et ses nuances | les surfaces secondaires, le texte secondaire |

**Une boîte se détache par sa VALEUR, jamais par un contour.** C'est la
grammaire du Totehm empilé de `totehm.com` : des blocs pleins posés les
uns sur les autres, séparés par du noir. Un trait d'un pixel n'est ni le
bloc ni le vide — c'est un troisième objet, et il gagne en plus un
demi-pixel gris sur tout écran non entier.

**Quand une boîte n'avait QUE sa bordure pour exister** (`background:none`
+ `border`), elle reçoit une surface grise — `rgba(255,255,255,.06)` à
`.07`. Elle ne reste jamais invisible : c'est le point de la règle, pas
son effet de bord. **Et le papier recule d'un ton sous les blocs** :
`--paper` est plus sombre que `--skin`, sinon un bloc de la couleur du
papier disparaît (mesuré, deux fois).

**Les trois exceptions, et elles ne sont pas des bordures :**
1. **La tuile perforée** — `border: 6px solid transparent` +
   `border-image`. C'est une TEXTURE de marque, pas un trait ; c'est elle
   qui fait `.btn-sig` et `.line-input`.
2. **Les arêtes d'une boîte en verre 3D** (`.b-front`, `.bside`,
   `.vb-front`, `.vbside`). Ce sont les CÔTÉS d'un volume : sans elles la
   boîte n'est plus une boîte, c'est un carré.
3. **Le pointillé d'une place vide** — la ligne `+ add`. Elle ne cerne
   pas une boîte, elle dessine l'absence d'une boîte.

Un filet gris entre deux lignes DANS une boîte n'est pas la bordure
d'une boîte, et le gris est un délimitant autorisé : il reste.

**Le coral `#fbd5ca` ne délimite rien.** Il est réservé au mot **« Get »**
de `[Get Higher]` et à la méthode Stoner sur `totehm.com`. Jamais un
cadre, jamais une bordure, jamais sur `.space` ni `.boutique`.

`tools/nobord.py` passe sur les TROIS domaines et retire tout trait
dessiné de moins de 4 px. **Il garde ce qui n'est pas une bordure** : la
tuile perforée (`6px solid transparent` + `border-image`) et les faces
d'une boîte en verre. Ce qui n'avait QUE son trait pour exister reçoit
une surface à la main — jamais en masse.

Passage du 13/09/2026 : **63 traits retirés** sur les quinze fichiers,
dont les séparateurs de rangée et les soulignés de saisie de l'espace
membre.

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

### On MAINTIENT pour saisir — 09/09/2026 · REMPLACÉ

Trois choses manquaient au classement, et il fallait les trois :

1. **ON DÉFILE.** `touch-action:none` était posé sur toutes les lignes dès
   l'entrée en mode classement : le doigt ne pouvait plus rien faire
   d'autre que déplacer, donc impossible de descendre chercher une
   habitude en bas de liste pour la remonter en haut. Les lignes sont en
   `pan-y` ; un appui de **340 ms sans bouger** saisit, et c'est seulement
   à ce moment qu'on coupe le natif (`body.grabbing`). Un défilement du
   conteneur annule l'appui long — un doigt posé pendant que la liste
   glisse veut l'arrêter, pas prendre la carte.
2. **ON VOIT CE QU'ON TIENT.** La boîte suit le doigt (`--dy`).
3. **LA LISTE DÉFILE SOUS LA BOÎTE.** Tenir une carte contre le bord haut
   ou bas fait remonter la liste, à une vitesse proportionnelle à la
   proximité du bord. Sans ça, emmener une habitude du bas vers le haut
   reste impossible — c'était la demande littérale.

**⚠️ `pointer-events:none` SUR LA BOÎTE SAISIE, sinon rien ne se classe.**
Elle suit le doigt, donc elle est toujours SOUS lui : `elementFromPoint`
renvoyait la boîte qu'on tient au lieu de celle qu'on survole, la cible
restait nulle, et lâcher ne déplaçait rien. Mesuré : le geste marchait, le
classement non. La capture du pointeur continue de router les événements
vers elle — les deux mécanismes sont indépendants.

**La règle générale :** tout élément qui suit le curseur pendant un geste
doit sortir du test de survol. Sinon il se vise lui-même.

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

**`visions` est le JUMEAU de `wisdom`** (13/09/2026) : mêmes colonnes —
`text`, `i`, `importance` — mêmes deux politiques RLS (la sienne en
écriture, lecture par les membres quand le Totehm est partagé). Deux
formes d'une seule chose : ce que j'ai appris, ce que je vois venir.
Vérifiée en production sous `set local role authenticated` : zéro ligne
lisible sans session.

**L'importance est une COLONNE, pas un ordre implicite.** Elle se
réécrit en entier quand le classement bouge : un rang sur deux qui
manque produit un ordre instable, et c'est quelques dizaines de lignes.

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

### ⛔ LA STACK POLICE — QUATRE FAMILLES, QUATRE RÔLES · 21/09/2026

**Donnée par Wah, non négociable, et elle vaut sur les trois domaines.**

| Police | Rôle |
|---|---|
| **Bebas Neue** | titres · noms des œuvres |
| **Quantico** | **boutons et actions** — et les SAISIES du membre |
| **Space Mono** | texte, labels, prix, navigation, métadonnées |
| **Montserrat** | **EXCLUSIVEMENT `[Get Higher]`** |

**⚠️ MONTSERRAT N'A DROIT QU'AU SLOGAN.** Et comme « Higher » est
toujours un SVG (règle du 18/09), Montserrat ne doit apparaître dans
**aucune balise** d'aucune page : uniquement dans le `<symbol>` du
badge. La première version de la page TotehmBot l'utilisait pour
l'accroche et le corps — deux règles cassées d'un coup, et c'est ce qui
a motivé d'écrire ce tableau ici.

**⚠️ QUANTICO EST LA POLICE DE L'ACTION, PAS DU CORPS.** Un bouton, un
champ, ce que le membre tape. Un paragraphe en Quantico est une faute de
grammaire visuelle — le corps est en Space Mono.

**Ça se MESURE, pas ça se promet.** `bot21.mjs` relit la
`fontFamily` calculée de chaque rôle et échoue si une famille déborde du
sien. Une règle de marque sans test est une règle qu'on recassera.

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
