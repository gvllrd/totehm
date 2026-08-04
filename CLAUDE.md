# TOTEHM

Frontend vanilla HTML/CSS/JS. Aucun build, aucun framework.
Repo **public**, auto-déployé par Vercel : **un push = c'est en prod**.

## Structure — ne jamais en dévier

```
space/       → www.totehm.space      Vercel Root Directory = space
boutique/    → www.higher.boutique   Vercel Root Directory = boutique
backend/     → servi par PERSONNE    SQL, Edge Functions, n8n
.gitignore
```

Rien d'autre à la racine. Un fichier placé à la racine n'est servi par
aucun des deux domaines et sera introuvable.

**`backend/` doit rester à la racine.** Dans `space/` ou `boutique/`,
Vercel le servirait publiquement : le SQL et le code des fonctions
deviendraient téléchargeables.

## Règles absolues

- **Jamais `git add .`** — toujours les chemins explicites.
  `oracle/` contient les clés SSH du serveur Oracle.
- **Ne jamais modifier Supabase ni Vercel** sans demande explicite.
- **Avant tout push** : `git diff | grep -iE "service_role|sk_live|sk_test|whsec_"`
  Si ça sort quelque chose, ne pas pousser.
- **Un commit par changement**, jamais de commit fourre-tout : le
  rollback (`git revert HEAD && git push`) est le seul filet.
- Après toute modification JS : extraire les blocs `<script>` et
  passer `node --check`.
- Les patchs Python appliquent des **assertions de comptage** par edit
  (`assert h.count(old) == 1`). Un remplacement global sans assertion
  a déjà cassé la prod.

## Pièges connus — vérifiés en réel

**Chemins absolus.** `space/` est servi comme racine du domaine.
`/get_higher.html` est correct depuis `space/`. Ne pas « corriger »
en `/space/get_higher.html`.

**Supabase en front.** Toujours le module ES, jamais l'UMD :
```js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
```
Le build UMD d'esm.sh n'expose pas `window.supabase` : la page plante
silencieusement à la première ligne, sans rien dans la console.

**Écouteurs d'événements.** Pas de `getElementById` dans un
`setTimeout` : si l'élément n'existe pas encore, le `if(el)` avale
l'erreur et le bouton devient décoratif. Utiliser la délégation sur
`document`.

**iframes.** `totehm.html` charge `stoner.html`, `book.html` et
`next_objective.html` en iframe. Toute redirection vers un service
externe (Stripe) doit viser `window.top`, sinon le navigateur annule
en silence.

**Deux flux Stripe.** `create-checkout` (Cloth) et `higher-checkout`
(Figher Club) partagent le même webhook. Le filtre
`metadata.product === 'higher'` est ce qui les sépare.
**Ne jamais le retirer.**

**Le mot « Higher »** est toujours le SVG outlined
(`<use href="#higher-slogan">`), jamais une webfont. En email, un PNG :
ni SVG ni webfont ne passent chez Gmail ou Outlook.

## Doctrine visuelle

| | |
|---|---|
| Navy `#333366` | présent, habitudes, ancrage |
| Coral `#fbd5ca` | **exclusivement** actionnable — jamais décoratif |
| Rouge-violet `#743169` | répulsions, carburant |
| Quantico Bold coral | **exclusivement** techniques Stoner et Intentions |
| Bebas Neue gris | narration |
| Perforation | padding `0.02em 0.18em` |

## Méthode de travail

Une étape à la fois. Montrer le résultat, attendre validation avant la
suivante. Si quelque chose ne correspond pas à ce qui est décrit :
s'arrêter et le dire, plutôt qu'improviser.

Ne pas créer de README, de doc ou de commentaire non demandé.
