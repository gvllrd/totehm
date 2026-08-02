# Les trois abonnements — à valider avant code

Métaphore conservée : **graine → plante → arbre**. Elle décrit l'état du compte,
pas des paliers de produit — et elle colle à la mécanique réelle, puisque le Book
a besoin de temps pour se remplir.

Règle appliquée partout, c'est celle de ton master :
**ce qui démontre reste ouvert, ce qui coûte se paie.**

---

## 🌱 SEED — gratuit, pour toujours

*La graine. Tu poses ton Totehm et il commence à écrire.*

| Fonctionnalité | Ce que ça change pour la personne |
|---|---|
| **Le Totehm** — habitudes illimitées sur les 7 intentions, avec leurs fréquences | Elle voit enfin sa vie comme une structure, pas comme une liste de choses à faire |
| **La méthode Stoner** | Elle change son état intérieur avant d'agir, au lieu de forcer |
| **Le Book** — l'autobiographie écrite par ses habitudes | Elle découvre qui elle est devenue sans avoir eu à l'écrire |
| **Habits Generator** — un objectif, des habitudes notées par niveau de preuve | Elle sait quoi faire, et pourquoi ça marche |
| **TotehmBot — rappels intelligents** | La marque continue de fonctionner quand le navigateur est fermé |
| **La boutique classique** | Elle peut porter la marque tout de suite |
| **Decode** | Elle peut lire l'histoire derrière n'importe quelle pièce croisée dans la rue |

**Ce qui est contingenté ici**

- **Habits Generator : 3 objectifs / mois.** Chaque objectif neuf coûte un appel OpenAI. Le cache le rend gratuit à la deuxième personne qui demande la même chose, mais le premier se paie.
- **« Go deeper » sur un chapitre : 5 / mois.** C'est du raisonnement long sur du texte long, la partie réellement chère du bot.
- **Les rappels, eux, sont illimités.** L'habitude, la fréquence et le scoring sont déterministes ; seule la formulation passe par un modèle, et en mini. Ça ne coûte presque rien, donc ça ne se facture pas.

> **Pourquoi le Book est gratuit, alors que ton master le mettait en payant.**
> Deux raisons, et elles viennent de ta propre doctrine. Ses transformations sont
> déterministes — zéro appel OpenAI — donc il ne coûte rien, donc il ne se paie pas.
> Et il est la matière première du vêtement : mettre une gate dessus, c'est mettre
> une gate sur le tunnel vers ton moteur de revenu.

---

## 🪴 PLANT — la ville et le vêtement

*Tu plantes la graine. Le Totehm sort de l'écran et rencontre le monde.*

**Tout Seed, sans plafond** — Generator illimité, Go deeper illimité.

| Fonctionnalité | Ce que ça change pour la personne |
|---|---|
| **Totehm Map** — les lieux de sa ville filtrés par son Totehm | Sa ville arrête d'être un décor et devient un terrain qui lui correspond |
| **Événements matchés** — sur ses intentions *et* ses rythmes | Elle sort pour des choses qui la servent, pas pour remplir un agenda |
| **Le Book enregistre où elle est allée** | Ses sorties deviennent des chapitres : la ville écrit dans son autobiographie |
| **Le droit de créer un Totehm Custom Cloth depuis un chapitre** | Elle porte sa propre histoire, pas un graphisme choisi dans un catalogue |
| **Priorité sur les Artistic Styles limités** | Elle accède aux séries avant qu'elles ne ferment |

**Pourquoi c'est ce palier qui se paie** — la Map et les événements coûtent
réellement à la requête (Google Maps, Places, APIs événements). C'est exactement
« ce qui coûte se paie ». Prix de ton master : **79 € / an**.

> ⚠️ **À cadrer dans la copie, sinon ça passe pour une arnaque.**
> L'abonnement ne contient **pas** le vêtement. Il donne le droit de le créer
> depuis son Book ; la pièce s'achète séparément. Ton master le dit déjà —
> « il vend le droit de créer un Totehm Cloth, donc il pousse vers un achat de
> plus forte valeur au lieu de le remplacer » — mais le nom et le texte du palier
> doivent le porter, ou la personne se sentira piégée au moment de payer la pièce.

---

## 🌳 TREE — totehmiser ce qu'on possède déjà

*L'arbre. Ce que tu as de plus précieux porte ton Totehm.*

**Tout Plant**, plus :

| Fonctionnalité | Ce que ça change pour la personne |
|---|---|
| **Totehmisation d'une pièce qu'elle possède** — sac, veste, paire | L'objet qu'elle a déjà cesse d'être un logo de maison pour devenir le sien |
| **Devis sur mesure, atelier local, remise en main propre** | Sa pièce ne voyage pas. Aucun colis, aucune angoisse |
| **Decode attaché à la pièce** | L'histoire reste lisible par ceux qui viendront après |

### On n'entre pas dans Tree en s'abonnant, on y entre en commandant

Personne ne totehmise son Hermès tous les mois. Un abonnement mensuel dont
l'unique bénéfice est un acte qu'on pose une fois dans sa vie, la personne le
calculera et n'aimera pas le résultat.

Donc : **tu commandes une totehmisation, le devis est élevé, et l'arbre te reste
douze mois** avec tout ce que contient Plant. On n'achète pas un accès, on
commande une œuvre et l'appartenance vient avec. C'est le modèle des maisons :
le cercle ne se paie pas, il se mérite par la pièce.

Bénéfice secondaire, et il n'est pas petit : personne ne paie pour un service
qui n'existe pas encore. Le client ne verse rien avant que tu aies dit oui.

**Frais de dossier à la demande, remboursés intégralement en cas de refus** —
c'est déjà ce que ton master décrit.

---

## Ce qu'il faut trancher avant que je code

1. **Les noms.** « Make it grown » est incorrect. Trois options cohérentes :
   *Seed / Plant / Tree* (états, ma préférence — c'est ce que la personne **est**),
   *Plant the Seed / Grow the Tree* (actions), ou un mélange assumé.
   Aujourd'hui tu mélanges un nom et deux impératifs.

2. **Les prix.** J'ai repris 79 €/an pour Plant, c'est ton chiffre. Mensuel aussi,
   ou annuel seul ? Et le montant du frais de dossier Tree.

3. **Tree : commande ou abonnement ?** Je recommande la commande. Si tu préfères
   l'abonnement classique, dis-le, c'est le même code.

4. **Les quotas Seed.** 3 objectifs et 5 Go deeper par mois — à confirmer ou ajuster
   une fois qu'on aura vu la consommation réelle.

## Ce qui existe déjà côté technique

- Le cache de `generate_objective` rend un objectif déjà demandé gratuit — les quotas comptent donc des générations, pas des requêtes.
- Ton master spécifie `profiles.tier` + `tier_expires_at` + `user_tier(uid)`, quotas lus dans `bot_interventions`, **aucune table supplémentaire**. La table `subscriptions` que j'avais créée est à jeter : je code sur ta spec.
- Le bloc d'affichage dans l'espace membre est déjà écrit, il attend juste ces trois paliers.
