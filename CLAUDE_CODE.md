# CLAUDE_CODE.md — LOT DU 20/09/2026

**Les deux bugs, le pavé en trois couleurs, les quatre coins, le son des
intentions.**

Le zip contient tout l'historique du repo. **Ne prends que les cinq
fichiers listés ci-dessous.** Le reste est déjà chez toi.

---

## 1 · Les cinq fichiers

```
com/totehm.html
backend/supabase/migrations/20260920_une_intention_a_son_son.sql
CLAUDE.md
backend/SYSTEM.md
CLAUDE_CODE.md
```

---

## 2 · Le contrôle AVANT de copier

Colle ce bloc. **Il doit afficher quatre `OK`.** Un seul `VIEUX` et tu as
une version du 19/09 ou d'avant dans les mains — ne copie rien, redemande
le zip.

```bash
cd ~/inbox
grep -q "DEUX ALPHABETS DANS LE MÊME FICHIER" com/totehm.html && echo "OK  totehm.html" || echo "VIEUX  totehm.html"
grep -q "intention_sound_set" backend/supabase/migrations/20260920_une_intention_a_son_son.sql && echo "OK  migration" || echo "VIEUX  migration"
grep -q "DEUX ALPHABETS POUR LA MÊME CHOSE" CLAUDE.md && echo "OK  CLAUDE.md" || echo "VIEUX  CLAUDE.md"
grep -q "intention_sound_set" backend/SYSTEM.md && echo "OK  SYSTEM.md" || echo "VIEUX  SYSTEM.md"
```

Et un contrôle de plus, qui vérifie que le VIEUX pavé est bien parti :

```bash
grep -c "joy-stack .o\|joy-stack .r" com/totehm.html
```

**Zéro attendu.** Les ronds `o` et `r` n'existent plus — il n'en reste que
trois : `w`, `h`, `v`.

---

## 3 · La copie

```bash
cp ~/inbox/com/totehm.html ~/totehm/com/totehm.html
cp ~/inbox/backend/supabase/migrations/20260920_une_intention_a_son_son.sql ~/totehm/backend/supabase/migrations/20260920_une_intention_a_son_son.sql
cp ~/inbox/CLAUDE.md ~/totehm/CLAUDE.md
cp ~/inbox/backend/SYSTEM.md ~/totehm/backend/SYSTEM.md
cp ~/inbox/CLAUDE_CODE.md ~/totehm/CLAUDE_CODE.md
```

---

## 4 · Aucun secret ne part avec le lot

**Ce contrôle passe AVANT le commit, pas après.** Il doit ne rien
afficher.

```bash
git -C ~/totehm diff | grep -iE "service_role|sk_live|sk_test|whsec_|re_[A-Za-z0-9]{20}"
```

---

## 5 · Les commits — un par changement

⚠️ **Jamais `git add .`** — `oracle/` contient les clés SSH. Chaque
chemin est nommé.

```bash
git -C ~/totehm add backend/supabase/migrations/20260920_une_intention_a_son_son.sql
git -C ~/totehm commit -m "base: une intention a son son — un type, un lien facultatif"
```

```bash
git -C ~/totehm add com/totehm.html
git -C ~/totehm commit -m "totehm: la mini-boite objectif s ouvre, la boite neuve dit quoi ecrire"
```

```bash
git -C ~/totehm add CLAUDE.md backend/SYSTEM.md CLAUDE_CODE.md
git -C ~/totehm commit -m "docs: le lot du 20/09, et les deux sections que Wah a re-inversees"
```

```bash
git -C ~/totehm push
```

---

## 6 · Le déploiement

**Rien à déployer.** `creator-subscribe` est déjà en production depuis le
18/09 à 16:15 — vérifié par lecture de la fonction déployée, pas supposé.

**La migration est DÉJÀ appliquée en production.** Le fichier n'est là que
pour que le repo dise la vérité. **Ne lance pas `db push`.**

---

## 7 · Le contrôle après push

```bash
curl -sL -o /dev/null -w "backend public ? %{http_code}\n" https://www.totehm.space/backend/README.md
```

**404 attendu.** Si c'est 200, arrête tout : le SQL et le code des Edge
Functions sont téléchargeables.

---

```bash
rm -rf ~/inbox/*
```
