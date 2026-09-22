# CLAUDE_CODE.md — LOT DU 22/09/2026 bis

**Le curseur porte les 3 couleurs et devient une manette · les titres
rentrent dans le Totehm · le classement ne déplace plus le T · et deux
bugs trouvés EN BASE, pas dans la page.**

Le zip contient tout l'historique du repo. **Ne prends que les quatre
fichiers listés ci-dessous.** Le reste est déjà chez toi.

---

## 1 · Les quatre fichiers

```
com/totehm.html
backend/supabase/migrations/20260922_le_lien_fantome_et_les_grants.sql   ← NOUVEAU
CLAUDE.md
CLAUDE_CODE.md
```

---

## 2 · Le contrôle AVANT de copier

Colle ce bloc. **Il doit afficher quatre `OK`.** Un seul `VIEUX` et tu as
une version d'avant dans les mains — ne copie rien, redemande le zip.

```bash
cd ~/inbox
grep -q "const BUILD='2026-09-22'" com/totehm.html && echo "OK  totehm.html" || echo "VIEUX  totehm.html"
grep -q "repulsion_seed_link" backend/supabase/migrations/20260922_le_lien_fantome_et_les_grants.sql && echo "OK  migration" || echo "VIEUX  migration"
grep -q "LE CURSEUR PORTE LES TROIS COULEURS" CLAUDE.md && echo "OK  CLAUDE.md" || echo "VIEUX  CLAUDE.md"
grep -q "LOT DU 22/09/2026 bis" CLAUDE_CODE.md && echo "OK  CLAUDE_CODE.md" || echo "VIEUX  CLAUDE_CODE.md"
```

Et quatre contrôles de plus.

```bash
grep -c "joy-stack i.on{" com/totehm.html
```

**Zéro attendu.** Le rond « actif » n'existe plus : celui de la vue
courante s'EFFACE, c'est la tuile qui porte sa couleur.

```bash
grep -c "var(--rw0)" com/totehm.html
```

**Trois attendus**, et pas moins : le T dans la règle générale, le T
dans le bloc ordinateur, et le wordmark. `--rw0` est le rail AU REPOS —
la marque s'y accroche et ne bouge plus quand le rail s'élargit pour le
classement. **Deux endroits disaient `--rw` pour le T**, et le second
gagnait par la cascade : à deux, c'est encore cassé sur ordinateur.

```bash
grep -c "id=\"ordbar\"" com/totehm.html
grep -c "bottom:calc(var(--joy-b) + var(--joy-d) + 40px)" com/totehm.html
```

**1 et 2.** La barre de classement a quitté le haut : elle se pose entre
la liste et le contrôleur, une fois dans la règle générale et une fois
dans le bloc ordinateur (les deux repères ne se calculent pas pareil).

```bash
grep -c "function manette" com/totehm.html
```

**1 attendu** — le geste neuf du lot : on attrape le disque et on le
tire, et la molette marche dessus.

---

## 3 · La copie

```bash
cp ~/inbox/com/totehm.html ~/totehm/com/totehm.html
cp ~/inbox/backend/supabase/migrations/20260922_le_lien_fantome_et_les_grants.sql ~/totehm/backend/supabase/migrations/20260922_le_lien_fantome_et_les_grants.sql
cp ~/inbox/CLAUDE.md ~/totehm/CLAUDE.md
cp ~/inbox/CLAUDE_CODE.md ~/totehm/CLAUDE_CODE.md
```

---

## 4 · Aucun secret ne part avec le lot

**Ce contrôle passe AVANT le commit, pas après.** Il doit ne rien
afficher.

```bash
git -C ~/totehm diff | grep -iE "sk_live|sk_test|whsec_|re_[A-Za-z0-9]{20}"
```

---

## 5 · Les commits — un par changement

⚠️ **Jamais `git add .`** — `oracle/` contient les clés SSH.

```bash
git -C ~/totehm add backend/supabase/migrations/20260922_le_lien_fantome_et_les_grants.sql
git -C ~/totehm commit -m "base: le trigger posait un lien vers le vide, et trois grants etaient revenus a anon"
```

```bash
git -C ~/totehm add com/totehm.html
git -C ~/totehm commit -m "totehm: le curseur devient une manette en 3 couleurs, les titres rentrent dans le carre"
```

```bash
git -C ~/totehm add CLAUDE.md CLAUDE_CODE.md
git -C ~/totehm commit -m "docs: pourquoi le meme bug est revenu quatre fois"
```

```bash
git -C ~/totehm push
```

---

## 6 · Le déploiement

**Rien à déployer à la main.** Pas d'Edge Function dans ce lot.

**La migration est DÉJÀ appliquée en production** (22/09). Le fichier
n'est là que pour que le repo dise la vérité. **Ne lance pas `db push`.**

---

## 7 · Le contrôle après déploiement

```bash
curl -sL https://www.totehm.com/totehm | grep -c "const BUILD='2026-09-22'"
curl -sL -o /dev/null -w "backend public ? %{http_code}\n" https://www.totehm.com/backend/README.md
```

**1 pour la première, 404 pour la seconde.** Si `backend/` rend 200,
arrête tout : le SQL et le code des Edge Functions sont téléchargeables.

---

```bash
rm -rf ~/inbox/*
```

---

# CE QUI RESTE À WAH

## A · LE BLOC À COLLER DANS LA CONSOLE — avant tout autre test

**C'est la seule chose que je te demande avant de retoucher une ligne
sur les répulsions.**

J'ai passé la journée à chercher un quatrième bug dans la création de
répulsions. Voilà ce que j'ai mesuré, dans ta base, sur ton compte :

- tes répulsions **sont bien enregistrées** — 19 lignes, 5 actives ;
- la dernière, du 21/09, a son texte, son lien d'habitude et son lien
  de leçon ;
- les 37 fonctions que la page appelle **existent toutes** ;
- aucune contrainte ne bloque ;
- la production **est à jour** (Vercel sert bien ton dernier lot) ;
- et j'ai rejoué le geste complet — clic, frappe au clavier, Entrée,
  rechargement — **sur tes données réelles chargées dans un navigateur** :
  ça marche, au téléphone comme sur ordinateur.

Donc **le code livré fonctionne**, et il me manque une seule
information : **est-ce que la page que TU ouvres est bien celle-là.**
Un onglet mobile gardé trois jours, un cache, et l'écran ressemble
exactement à « ce n'est pas corrigé ».

Ouvre `totehm.com/totehm`, déplie ton Totehm, ouvre la console, colle
ça, et renvoie-moi tout ce qui sort :

```js
window.__totehmDiag().then(d => console.log(JSON.stringify(d, null, 2)))
```

Une seule ligne. Elle relit la page, interroge le serveur, **et tente
une vraie création de répulsion qu'elle retire aussitôt** — donc elle
répond à la question directement, sans que tu aies à cliquer.


**La ligne qui compte est la première.** Si `VERSION` n'affiche pas
`2026-09-22`, ta page est périmée : recharge en vidant le cache
(iPhone : Réglages → Safari → Effacer historique et données ; ou ouvre
en navigation privée pour vérifier en dix secondes) et réessaie
d'ajouter une répulsion **avant** de me répondre.

Si `VERSION` affiche bien `2026-09-22` et que ça ne marche toujours pas,
renvoie-moi le bloc entier **plus** ce qui apparaît en rouge dans la
console au moment où tu appuies sur `[+ Add a Repulsion]`. Là, j'aurai
la cause en une passe au lieu de quatre.

## B · LES CLICS DANS UN DASHBOARD

**Rien ce lot.** Pas de Stripe, pas de Vercel, pas de Resend, pas de
Printful à toucher. La migration est déjà appliquée.

## C · LES TESTS NAVIGATEUR

1. **La manette.** Attrape le disque du contrôleur et **tire-le** vers le
   haut : le chevron du haut s'allume avant que tu lâches, et tu arrives
   sur les objectifs. Tire à peine : il revient au centre sans rien
   faire. Fais tourner la molette dessus : ça change de vue.
2. **Les 3 couleurs.** Passe les cinq vues. La tuile doit être navy sur
   les habitudes, bleu clair sur les objectifs et la vision,
   rouge-violet sur les répulsions et la sagesse. Dans les habitudes tu
   dois voir **deux** points : bleu clair en haut, rouge en bas.
3. **Le classement.** Appuie sur l'icône : **le T ne doit plus bouger
   d'un pixel**, et la phrase passe en bas.
4. **Le paysage.** Déplie ton Totehm et tourne le téléphone : il doit se
   replier tout seul. Couché, `[Open my Totehm]` est remplacé par
   « turn your phone upright ».
