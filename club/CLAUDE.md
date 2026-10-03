# club/CLAUDE.md — figher.club : la porte, l'art, le marché

> Chargé automatiquement quand on travaille dans `club/`. Les règles
> transverses sont dans le `CLAUDE.md` de la racine ; l'histoire dans
> `docs/POSTMORTEMS.md`. Sections déplacées TELLES QUELLES de l'ancien
> `CLAUDE.md` le 30/09/2026, les plus récentes d'abord : un renvoi « plus
> haut » peut viser la racine ou un autre dossier. Fichiers : `index.html` (la porte), `market.html` (le marché — le fonctionnement est écrit en tête du fichier ; la règle du marché est dans `backend/CLAUDE.md`), et depuis le 02/10 `discover*.html`, `get_higher.html`, `play_lisbon_street.html`, `stoner*.html`, `origins.html`, `api/geo.js`, `assets/signs/`.


## ⛔ ÉTAT AU 02/10/2026 — LE BRANDING HIGHER VIT ICI · DEUX CLÉS

**Wah, 02/10 : figher.club = l'expérimentation du branding de
higher.boutique.** [Get Higher] et Make the Lisbon Streets Higher ont
quitté la boutique : `discover`, `discover_lisbon`, `get_higher`,
`play_lisbon_street`, `stoner` (la méthode), `stoner_terms`, `origins`,
`api/geo.js` et `assets/signs/` sont ici. La boutique (et totehm.space)
redirigent en 308 chaque ancien chemin vers `www.figher.club/<page>`.

| | public | réservé (`member`) |
|---|---|---|
| porte, Get Higher, Lisbon, Origins, parcourir le marché | ✅ (ce sont eux qui vendent le THP) | |
| collectionner / revendre une œuvre | | THP + une Habit Box (`_is_figher`) |
| la méthode Stoner | | THP seul (`stoner-gate`) |

- **La porte** (`index.html`, `BUILD 2026-10-02`) : [Get Higher] →
  `/stoner` si `stoner-gate` dit `access`, sinon `/discover` ; Lisbon
  révélé par `/api/geo` (PT, fail-closed) ; deux clés (THP · Habit Box)
  et un bouton qui suit la clé manquante. Plus d'annuel, plus de
  simulateur 80/20 (l'économie créateur vit sur COM/SPACE), plus de
  « compatibility number ».
- **Depuis le 03/10, la bouche de totehm.com** (le papier posé sur la
  langue) arrive sur `/get_higher` par le pont (`sso=`) : la page est
  inchangée, l'achat reste le clic « Buy ».
- **Retour de paiement du THP** : les pages Get Higher envoient
  `from: 'method'` à `higher-checkout` → `figher.club/stoner?checked=1`.
  Le marché n'envoie rien → `/market?owned=totehmpaper`.
- Les pages déplacées se connectent par email (OTP local) et reçoivent le
  pont (`sso=` dans le fragment) ; même origine que le marché → plus de
  pont vers `/market`.
- `stoner.html` : `PAY_URL` n'existait pas (ReferenceError pour un
  non-acheteur) → `toStripe()` renvoie au mur `/get_higher`.

> La section ci-dessous (01/10) reste vraie pour la console.

### 01/10/2026 — la console est partie sur totehm.com

`club/console.html` n'existe plus : `figher.club/console` → 308 →
`totehm.com/console` (`club/vercel.json`). Les portes du Club vers la
console (`data-go="console"`, Reveal → `#s-reveal`) passent par le pont SSO.
`club_console()` est supprimée (remplacée par `my_console()`). Le Club garde
la porte FIGHER (les trois clés), l'art, les collections et le marché.

Bebas Neue est parti (titres → Space Mono Bold capitales, tailles ×0,66) ;
aucun fond blanc (`.tab.is-on`, `.tag` gris) ; « Simple terms of use » est
la dernière entrée du menu membre (`#sheet`, `#mmenu` du marché), plus
épinglée en haut à droite.

> La section ci-dessous (23/09) est DÉPASSÉE : la console (01/10) et les trois clés (02/10 : deux clés).

### ⛔ FIGHER.CLUB — LA PORTE ET LA CONSOLE — 23/09/2026

**Deux fichiers, et ils ne font pas la même chose.**

| | `club/index.html` — LA PORTE | `club/console.html` — LE MEMBRE |
|---|---|---|
| pour qui | tout le monde | un membre connecté |
| ce qu'elle dit | ce qu'est le Club, les trois clés, où l'on en est | les six questions du MASTER §86 |
| ce qu'elle lit | `figher_access()` | `club_console()` — **un seul appel** |

**Les trois clés s'affichent comme un état, pas comme une vente** : ce
que le membre a, ce qui lui manque, et la porte vers ce qui manque
(Totehm → `totehm.com/totehm#in`, THP → `higher.boutique`, annuel →
`subscription-checkout`). Chaque porte vers un autre domaine passe par
le pont.

**La console lit tout d'un appel** : adhésion, droits, mes abonnements,
mes abonnés, ma monétisation, mes gains, mes versements, et Reveal the
Box. Six requêtes côté page, c'était six allers-retours pour dessiner un
seul écran (même règle que `creator_cercle` le 19/09).

**La facturation passe par le portail Stripe** (`club-billing`,
`action: 'portal'`) : on ne réécrit pas une gestion de carte bancaire.
L'annulation d'un abonnement à un membre (`action: 'cancel_creator'`)
est une annulation **en fin de période** — la colonne `ending` le dit, la
console affiche « ends on … ».

**Depuis le Totehm**, le lien de monétisation s'écrit
`https://www.figher.club/console?to=<pseudo>` : la console ouvre
l'offre de ce membre. Ni `/club/creator`, ni un identifiant.

**⚠️ `creator-price` FAISAIT UN `update` SUR UNE LIGNE QUI N'EXISTAIT
PAS.** Zéro ligne touchée, zéro erreur : un membre qui posait son prix
avant sa méthode de virement lisait « ok » et n'avait rien d'enregistré.
`upsert … onConflict: 'user_id'`. *Un `update` sans ligne n'est pas une
erreur pour Postgres — c'en est une pour nous.*
