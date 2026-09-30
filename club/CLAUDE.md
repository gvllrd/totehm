# club/CLAUDE.md — figher.club : la porte, la console, le marché

> Chargé automatiquement quand on travaille dans `club/`. Les règles
> transverses sont dans le `CLAUDE.md` de la racine ; l'histoire dans
> `docs/POSTMORTEMS.md`. Sections déplacées TELLES QUELLES de l'ancien
> `CLAUDE.md` le 30/09/2026, les plus récentes d'abord : un renvoi « plus
> haut » peut viser la racine ou un autre dossier. Fichiers : `index.html` (la porte), `console.html` (le membre), `market.html` (le marché — le fonctionnement est écrit en tête du fichier ; la règle du marché est dans `backend/CLAUDE.md`).


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
