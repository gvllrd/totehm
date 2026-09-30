# backend/CLAUDE.md — la base, les fonctions, l'argent, le bot

> Chargé automatiquement quand on travaille dans `backend/`. Les règles
> transverses sont dans le `CLAUDE.md` de la racine ; l'histoire dans
> `docs/POSTMORTEMS.md`. Sections déplacées TELLES QUELLES de l'ancien
> `CLAUDE.md` le 30/09/2026, les plus récentes d'abord : un renvoi « plus
> haut » peut viser la racine ou un autre dossier. Procédures : `README.md`. État mesuré : `SYSTEM.md` (§0 d'abord).

## ⛔ ÉTAT AU 30/09/2026 — identité, droits, propriété, marché

**⚠️ TOTEHM.COM EST L'AUTORITÉ D'IDENTITÉ — PKCE, PAS DE COOKIE PARTAGÉ.**
Un satellite ne demande plus l'email : `ssoLogin()` (snippet **v2**,
`tools/sso_snippet.js`) crée un `verifier` et un `state` dans SON
`sessionStorage`, envoie à `totehm.com/auth?client=…&challenge=…&state=…&return=/chemin`.
`/auth` frappe un code lié au défi (`sso-mint`, colonne
`sso_handoff.code_challenge`) et renvoie dans le FRAGMENT ; seul le
satellite qui garde le `verifier` peut l'échanger (`sso-redeem`).
`client` est un NOM (space · club · boutique) traduit par une table fixe ;
`return` est un CHEMIN — jamais une URL reçue (pas de redirecteur ouvert).
Silencieux : un navigateur déjà connecté ici repasse UNE fois par onglet
(`prompt=none`). Le pont `ssoVersDomaine` (17/09) reste, inchangé.

**⚠️ UN SEUL SYSTÈME DE DROITS.** « Qui suis-je · à qui suis-je abonné ·
que possède-je · à quoi ai-je droit » se répond par `_figher`,
`_subscriber_of(créateur, fan)` (la seule définition d'un abonné vivant —
`is_subscribed_to`, `_spots_subscriber`, `_exact_ok` la lisent),
`creator_page(pseudo)` et `my_entitlements()`. Aucune page ne recompose.

**⚠️ LA PROPRIÉTÉ EST UN EXEMPLAIRE, PAS UN BOOLÉEN.** `art_editions`
(une ligne par exemplaire vendu, `edition_no`) est la source ;
`art_transfers` est son histoire, **en ajout seul** (trigger) ;
`stoner_access` n'est plus qu'une PROJECTION d'accès, et un trigger frappe
l'exemplaire du THP à chaque ligne qui y entre (Stripe, cadeau, NFT). Le
**numéro FIGHER = le numéro d'exemplaire du THP**. Le THP est l'œuvre
`totehmpaper` (777 000 exemplaires) : **son prix est une ligne de
`artworks`, lue par `higher-checkout`** — plus aucun prix du THP dans une
page (le « $30 » et le « €77 » sont partis ; `.thp-price` reçoit le prix
du serveur, ou rien).

**⚠️ LE MARCHÉ NE S'ÉCRIT QUE PAR LE WEBHOOK.** Réserver (`art_primary_reserve`
/ `art_resale_reserve`, 31 min, un index unique = un acheteur à la fois)
→ Stripe Checkout (30 min, donc la réservation survit toujours à la
session) → `checkout.session.completed` → `art_settle`, idempotent sur la
session. Revente : le vendeur fixe son prix, **7 % à TOTEHM, le reste
(arrondi inférieur) au grand livre du vendeur**, versé par le virement
mensuel. Pas de Stripe Connect. Si `art_settle` échoue en base → 500
(Stripe rejoue) ; s'il répond `ok:false` (réservation expirée, déjà
vendu…) → `market_incidents` + 200 : **c'est un remboursement à la main**.
Une œuvre (hors THP) ne s'achète qu'avec un THP (`thp_required`).
**Ce qui n'existe pas, et c'est voulu** : notes, avis, likes, abonnés,
enchères, gamification.


### ⛔ LE PASSEPORT FIGHER — UNE FONCTION, TROIS CLÉS — 23/09/2026

**MASTER §11 : TOTEHM COMPLET + THP POSSÉDÉ + ANNUEL ACTIF.** Trois clés,
**une** fonction : `_figher(uuid)`. Le Club, l'Espace, la Boutique et le
bot la lisent tous ; le jour où la règle change, elle change là.

| la clé | d'où elle vient |
|---|---|
| Totehm complet | `totehm_complete()` — une boîte NON VIDE dans chacune des 5 vues (19/09) |
| THP possédé | `stoner_access`, **par email**, en minuscules des deux côtés |
| annuel actif | `subscriptions.status in ('active','trialing')` |

**⚠️ LE THP SE RECONNAÎT PAR L'EMAIL, PAS PAR L'UUID.** Le webhook écrit
`stoner_access` au paiement du TotehmPaper, **avant** que l'acheteur ait
un compte. L'email est la seule clé commune. Un membre qui a acheté le
THP avec une autre adresse que celle de son compte n'a pas de THP aux
yeux du Club — c'est le premier ticket de support à prévoir.

**⚠️ UN SEUL BOOLÉEN SORT : `member`.** La page ne recompose jamais la
règle à partir des trois morceaux : une page qui le fait finit par en
oublier un. Les trois morceaux sortent AUSSI, mais pour dire au membre
ce qui lui manque, jamais pour décider.

| fonction | pour qui | ce qu'elle rend |
|---|---|---|
| `_figher(uuid)` | `service_role` seul | le passeport de n'importe qui |
| `_is_figher(uuid)` | `service_role` seul | le booléen |
| `figher_access()` | toute page, même sans session | SON passeport + pseudo + monétisé |
| `totehmbot_access()` | toute page | même forme qu'avant, règle FIGHER |
| `club_console()` | la console | les six questions du MASTER §86, un appel |

**⚠️ TOTEHMBOT SUIT LA RÈGLE FIGHER ENTIÈRE** (MASTER §61). Avant :
annuel + complet. Maintenant : + THP. Un membre annuel sans THP perd le
bot quand la migration passe. Retour arrière : une ligne dans
`totehmbot_access`.

### ⛔ L'ARGENT EST UN GRAND LIVRE, PAS UN CALCUL — 23/09/2026

**MASTER §18-23.** 80 % au membre, 20 % à TOTEHM, jamais un virement par
abonnement, un solde qui s'accumule, un versement groupé au-dessus d'un
seuil. Zéro Stripe Connect (décision du 19/09, confirmée).

**⚠️ LE GRAND LIVRE EST LA SOURCE DE VÉRITÉ.** `member_ledger`. Jamais un
solde calculé à partir des abonnements en cours : un abonnement annulé a
quand même payé ses trois premiers mois. Et jamais un solde calculé dans
la page (MASTER §23).

**⚠️ ON CRÉDITE SUR `invoice.paid`, PAS AU CHECKOUT.** C'est la facture
qui prouve l'argent, et chaque renouvellement en produit une. Le
checkout n'ouvre que l'ACCÈS.

**⚠️ LE CRÉATEUR VIENT DE LA METADATA DE L'ABONNEMENT, PAS DE LA TABLE.**
`invoice.paid` arrive souvent AVANT `checkout.session.completed` : au
moment où l'argent est là, la ligne `creator_subscriptions` n'existe pas
encore. D'où, encore, la metadata posée en double dans
`subscription_data.metadata` (règle du 15/09) — c'est elle que le
webhook relit sur l'abonnement.

**⚠️ L'IDEMPOTENCE EST UNE CONTRAINTE, PAS UN `if`.** `unique(source,
kind)` avec `source = 'stripe:<invoice>'` : Stripe rejoue un webhook,
deux instances peuvent le recevoir en même temps, une facture ne crédite
qu'une fois. C'est la base qui le garantit.

**⚠️ LE LIVRE NE SE CORRIGE PAS, IL S'AJOUTE.** Un trigger refuse tout
UPDATE et tout DELETE. Une erreur se répare par une ligne `adjustment`.
Et `on delete restrict` sur l'utilisateur : on ne supprime pas en silence
un membre à qui l'on doit de l'argent.

**⚠️ L'ARRONDI VA À LA PLATEFORME.** La part du membre est l'entier
inférieur ; le centime restant va à TOTEHM. Brut = part membre + part
TOTEHM, au centime — c'est ce qui se vérifie.

**⚠️ UN SOLDE PAR DEVISE.** Même règle que la balance Stripe du 15/09.

**Les règles du versement sont une FONCTION** (`payout_rules()` : seuil
25 €, le 1er, 80/20) — pas des chiffres dans une page. Le versement lui-
même reste manuel : `payouts_due()` → virement → `payout_mark_paid()`,
qui écrit le versement ET sa ligne de débit dans la même transaction (un
virement sans débit ferait payer deux fois). Procédure :
`backend/README.md`.

**⚠️ ET LE WEBHOOK REND SA CHANCE À STRIPE.** `stripe_events` inscrit
l'événement AVANT de le traiter (idempotence). Si le traitement échoue et
qu'on rend 500, Stripe rejoue… et l'idempotence avale le rejeu : **la
facture n'est jamais créditée, sans un mot.** Le webhook efface donc sa
ligne `stripe_events` avant de rendre 500. *Une idempotence qui retient
les échecs transforme une panne passagère en perte définitive.*

### ⛔ L'ABONNEMENT EST À SENS UNIQUE — 23/09/2026

**MASTER §13 : Bob → Alice ne donne rien à Alice sur Bob.** Et il y avait
un trou : `totehm_visibility = 'members'` ouvrait le Totehm à **tout
membre connecté**, alors que le bouton s'appelle « Visible to my paying
followers ».

`_shared_with_me(owner)` porte la règle, et les quatre politiques de
lecture (`totehms`, `objectives`, `wisdom`, `visions`) l'appellent :

| visibilité | monétisé | qui lit |
|---|---|---|
| privé | — | le propriétaire |
| partagé | non | les membres |
| partagé | oui | **ses abonnés actifs**, et seulement si le bénéfice `totehm` est coché |

**⚠️ `security definer` OBLIGATOIRE** — la fonction est appelée DANS la
politique de `totehms` et relit `totehms` : sans lui, récursion (règle du
15/09, `is_subscribed_to`).

**⚠️ LA VISIBILITÉ SUIT L'INTERRUPTEUR** (règle du 18/09).
`monetization_set(true)` avec `totehm` → partagé ; `monetization_set(false)`
→ **privé**. Jamais l'inverse : éteindre ne doit pas ouvrir un Totehm à
tous, gratuitement et en silence. Et éteindre **n'annule personne**.

**⚠️ SEULS LES DROITS QUI EXISTENT SE VENDENT.** La contrainte accepte
`totehm · spots · higherself · totehmbot` ; `monetization_set` refuse les
deux derniers tant qu'ils ne sont pas construits.

**Trouvé au passage** : la politique de lecture des `visions` visait
`public` — donc l'anonyme. Elle vise `authenticated`, comme ses sœurs.

### ⛔ L'ACCÈS FONDATEUR EST UNE DÉCISION, PAS UN FAUX PAIEMENT — 24/09/2026

« Donne-moi tous les accès pour créer et rechercher. » On n'écrit **pas**
de fausse ligne dans `subscriptions` ou `stoner_access` : ce serait mentir
au webhook, au grand livre et aux statistiques. Un accès offert a sa
table, **`figher_comps`** (email, raison, depuis, jusqu'à), et `_figher`
la lit : `member = comp OR (les trois clés)`. Les trois clés restent
VRAIES dans la réponse — on ne prétend pas que le Totehm est complet — et
`comp: true` dit pourquoi la porte est ouverte.

`spots_radar` teste désormais **le passeport d'abord, en un booléen**, et
ne regarde les trois clés que pour dire à un non-membre laquelle lui
manque. Avant, un membre par comp se serait vu répondre « complete my
TOTEHM ».

Retour arrière : `delete from figher_comps where email = '…'`.

### ⛔ LE PONT SSO — QUATRE DOMAINES, UNE IDENTITÉ — 17/09/2026

> **⚠️ COMPLÉTÉ LE 30/09** — la connexion d'un satellite passe par
> totehm.com (`/auth`, PKCE) : voir **LA SOURCE UNIQUE**. Le pont
> ci-dessous reste le chemin d'un domaine connecté vers un autre.

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
session (plus, depuis le 23/09, `club/index`, `club/console`,
`space/index`, `boutique/streetwear` et les deux ponts `com/club/*`), et
il **bloque au niveau du module** (`await` top-level) : quand
la page lit sa session, la session est déjà là. Plafond de 2,5 s — si le
pont tousse, on continue sans session et le membre se connecte par
email. Dégradé, pas cassé.

**Quatre cibles, jamais une URL reçue** : `com` · `space` · `boutique` ·
`club`. Une page qui choisirait librement sa destination laisserait
n'importe quel site demander un code « pour lui-même ».

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

> **⚠️ DÉPASSÉ LE 23/09 SUR DEUX POINTS.** `figher.club` n'est plus un
> vanity URL : c'est un domaine (dossier `club/`), et `totehm.com/club`
> est un pont vers lui. Et il n'y a plus de « créateurs » : **tout membre
> FIGHER peut monétiser** (MASTER §16). Voir **⛔ FIGHER.CLUB — LA PORTE
> ET LA CONSOLE**. Ce qui reste vrai ici : la clé secrète ne touche
> jamais le navigateur, le compte vient de la session, on affiche SA
> part, la metadata voyage en double.

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

Et l'IBAN, lui, est bien chez nous maintenant.

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
