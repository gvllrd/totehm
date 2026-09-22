# CLAUDE_CODE.md — LOT DU 22/09/2026 ter

**LA CAUSE DES RÉPULSIONS EST TROUVÉE.** Un index unique en base
interdisait la DEUXIÈME création. Plus : le joystick perd sa bordure et
ne se bat plus avec le balayage, la barre remonte en haut, le titre
passe à droite.

Le zip contient tout l'historique du repo. **Ne prends que les cinq
fichiers listés ci-dessous.**

---

## 1 · Les cinq fichiers

```
com/totehm.html
backend/supabase/migrations/20260922_lindex_unique_interdisait_la_deuxieme_repulsion.sql  ← NOUVEAU
backend/supabase/migrations/20260922_le_grand_menage.sql                                  ← NOUVEAU
CLAUDE.md
CLAUDE_CODE.md
```

⚠️ La migration `20260922_le_lien_fantome_et_les_grants.sql` du lot
précédent doit déjà être chez toi. Si `git status` ne la voit pas,
dis-le-moi.

---

## 2 · Le contrôle AVANT de copier

**Il doit afficher cinq `OK`.**

```bash
cd ~/inbox
grep -q "const BUILD='2026-09-22b'" com/totehm.html && echo "OK  totehm.html" || echo "VIEUX  totehm.html"
grep -q "repulsions_one_active" backend/supabase/migrations/20260922_lindex_unique_interdisait_la_deuxieme_repulsion.sql && echo "OK  migration index" || echo "VIEUX  migration index"
grep -q "LE GRAND MÉNAGE" backend/supabase/migrations/20260922_le_grand_menage.sql && echo "OK  migration menage" || echo "VIEUX  migration menage"
grep -q "LE PAVÉ ET LE BALAYAGE LISAIENT LE MÊME GESTE" CLAUDE.md && echo "OK  CLAUDE.md" || echo "VIEUX  CLAUDE.md"
grep -q "LOT DU 22/09/2026 ter" CLAUDE_CODE.md && echo "OK  CLAUDE_CODE.md" || echo "VIEUX  CLAUDE_CODE.md"
```

Trois contrôles de plus :

```bash
grep -c "closest('#joy,#freq-panel" com/totehm.html
```

**1 attendu.** C'est le correctif du joystick : un geste né sur le pavé
n'atteint plus le balayage horizontal. Sans lui, tirer à gauche ramenait
sur les habitudes.

```bash
grep -c "inset 0 0 0 3px var(--joy-vue" com/totehm.html
```

**Zéro attendu.** L'anneau qui se lisait comme une bordure est parti :
le fond EST la couleur.

```bash
grep -c "top:calc(var(--band-t) - 15px);left:0;right:0" com/totehm.html
```

**2 attendus** — la barre « order by importance » est remontée en haut,
à côté de `#dit`, comme avant.

---

## 3 · La copie

```bash
cp ~/inbox/com/totehm.html ~/totehm/com/totehm.html
cp ~/inbox/backend/supabase/migrations/20260922_lindex_unique_interdisait_la_deuxieme_repulsion.sql ~/totehm/backend/supabase/migrations/20260922_lindex_unique_interdisait_la_deuxieme_repulsion.sql
cp ~/inbox/backend/supabase/migrations/20260922_le_grand_menage.sql ~/totehm/backend/supabase/migrations/20260922_le_grand_menage.sql
cp ~/inbox/CLAUDE.md ~/totehm/CLAUDE.md
cp ~/inbox/CLAUDE_CODE.md ~/totehm/CLAUDE_CODE.md
```

---

## 4 · Aucun secret ne part avec le lot

```bash
git -C ~/totehm diff | grep -iE "sk_live|sk_test|whsec_|re_[A-Za-z0-9]{20}"
```

Rien ne doit s'afficher.

---

## 5 · Les commits

⚠️ **Jamais `git add .`** — `oracle/` contient les clés SSH.

```bash
git -C ~/totehm add backend/supabase/migrations/20260922_lindex_unique_interdisait_la_deuxieme_repulsion.sql backend/supabase/migrations/20260922_le_grand_menage.sql
git -C ~/totehm commit -m "base: l index unique interdisait la DEUXIEME repulsion, et le grand menage"
```

```bash
git -C ~/totehm add com/totehm.html
git -C ~/totehm commit -m "totehm: le pave ne se bat plus avec le balayage, plus de bordure, la barre remonte"
```

```bash
git -C ~/totehm add CLAUDE.md CLAUDE_CODE.md
git -C ~/totehm commit -m "docs: les trois causes du 22/09, et le trou dans ma regle sur les contraintes"
```

```bash
git -C ~/totehm push
```

---

## 6 · Le déploiement

**Rien à déployer à la main.** Les deux migrations sont **DÉJÀ
appliquées en production**. **Ne lance pas `db push`.**

---

## 7 · Le contrôle après déploiement

```bash
curl -sL https://www.totehm.com/totehm | grep -c "const BUILD='2026-09-22b'"
curl -sL -o /dev/null -w "backend public ? %{http_code}\n" https://www.totehm.com/backend/README.md
```

**1 pour la première, 404 pour la seconde.**

---

```bash
rm -rf ~/inbox/*
```

---

# CE QUI RESTE À WAH

## A · LES CLICS DANS UN DASHBOARD

**Rien.** Pas de Stripe, pas de Vercel, pas de Resend, pas de Printful.

## B · LES TESTS NAVIGATEUR

**⚠️ VIDE LE CACHE AVANT.** Sur iPhone : Réglages → Safari → Effacer
historique et données, ou ouvre en navigation privée. Si tu veux
vérifier en trois secondes que tu as la bonne version, colle ça dans la
console — la première ligne doit dire `2026-09-22b` :

```js
window.__totehmDiag().then(d => console.log(JSON.stringify(d, null, 2)))
```

1. **LES RÉPULSIONS.** Ajoutes-en **trois d'affilée**, dans la vue
   répulsions. C'est ça le test : avant, la première passait et la
   deuxième était refusée en silence.
2. **LE JOYSTICK, À GAUCHE ET À DROITE.** Tire le manche franchement.
   Gauche → sagesse. Droite → vision. **Et ça doit Y RESTER.**
3. **PAS DE BORDURE.** Le disque est un aplat plein : navy, bleu clair
   ou rouge-violet selon la vue. Rien autour.
4. **LA BARRE** « order by importance » est revenue en haut.
5. **LE TITRE** est abaissé et à droite.
