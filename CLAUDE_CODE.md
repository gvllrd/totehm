# CLAUDE_CODE.md — LOT DU 21/09/2026 bis

**L'axe du pavé corrigé, le contrôleur qui remonte en haut, et la page de
vente réécrite sur la stack police.**

Le zip contient tout l'historique du repo. **Ne prends que les six
fichiers listés ci-dessous.** Le reste est déjà chez toi.

---

## 1 · Les six fichiers

```
com/totehm.html
com/club/totehmbot.html                                      ← NOUVEAU
backend/supabase/migrations/20260921_la_porte_du_totehmbot.sql ← NOUVEAU
CLAUDE.md
backend/SYSTEM.md
CLAUDE_CODE.md
```

---

## 2 · Le contrôle AVANT de copier

Colle ce bloc. **Il doit afficher cinq `OK`.** Un seul `VIEUX` et tu as
une version du 20/09 ou d'avant dans les mains — ne copie rien, redemande
le zip.

```bash
cd ~/inbox
grep -q "LE SEPARATEUR ETAIT DANS L IDENTIFIANT\|LE SÉPARATEUR ÉTAIT DANS L'IDENTIFIANT" com/totehm.html && echo "OK  totehm.html" || echo "VIEUX  totehm.html"
grep -q "Bebas+Neue" com/club/totehmbot.html && echo "OK  page de vente" || echo "VIEUX  page de vente"
grep -q "totehmbot_access" backend/supabase/migrations/20260921_la_porte_du_totehmbot.sql && echo "OK  migration" || echo "VIEUX  migration"
grep -q "JE M.ÉTAIS TROMPÉ D.AXE" CLAUDE.md && echo "OK  CLAUDE.md" || echo "VIEUX  CLAUDE.md"
grep -q "totehmbot_access" backend/SYSTEM.md && echo "OK  SYSTEM.md" || echo "VIEUX  SYSTEM.md"
```

Et deux contrôles de plus, qui vérifient que le vieux code est bien parti :

```bash
grep -c "tmp:'+(++TSEQ)" com/totehm.html
```

**Zéro attendu.** L'identifiant provisoire s'écrit `tmp-`, plus `tmp:` —
c'est LA correction du lot.

```bash
grep -c "joy-stack .w{\|joy-stack .v{" com/totehm.html
```

**Zéro attendu.** Les trois ronds sont l'axe VERTICAL — `o`, `h`, `r` —
et plus les époques. C'est la correction de fond du lot.

```bash
grep -c "font-family:'Montserrat\|font-family: 'Montserrat" com/club/totehmbot.html
```

**Zéro attendu.** Montserrat n'a droit qu'à `[Get Higher]`, c'est-à-dire
au seul `font-family=` du `<symbol>` SVG — **jamais une règle CSS**. Une
seule occurrence en feuille de style voudrait dire qu'elle a fui dans le
corps de la page, ce qui était le cas de la première version.

---

## 3 · La copie

```bash
cp ~/inbox/com/totehm.html ~/totehm/com/totehm.html
cp ~/inbox/com/club/totehmbot.html ~/totehm/com/club/totehmbot.html
cp ~/inbox/backend/supabase/migrations/20260921_la_porte_du_totehmbot.sql ~/totehm/backend/supabase/migrations/20260921_la_porte_du_totehmbot.sql
cp ~/inbox/CLAUDE.md ~/totehm/CLAUDE.md
cp ~/inbox/backend/SYSTEM.md ~/totehm/backend/SYSTEM.md
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

⚠️ **Jamais `git add .`** — `oracle/` contient les clés SSH. Chaque
chemin est nommé.

```bash
git -C ~/totehm add backend/supabase/migrations/20260921_la_porte_du_totehmbot.sql
git -C ~/totehm commit -m "base: la porte du TotehmBot — Club ET Totehm complet, un seul booleen"
```

```bash
git -C ~/totehm add com/totehm.html
git -C ~/totehm commit -m "totehm: le pave dit l axe VERTICAL, et le controleur remonte en haut"
```

```bash
git -C ~/totehm add com/club/totehmbot.html
git -C ~/totehm commit -m "club: la page de vente reecrite sur la stack police, moitie plus courte"
```

```bash
git -C ~/totehm add CLAUDE.md backend/SYSTEM.md CLAUDE_CODE.md
git -C ~/totehm commit -m "docs: la stack police, et l axe que j avais pris a l envers"
```

```bash
git -C ~/totehm push
```

---

## 6 · Le déploiement

**Rien à déployer côté Edge Functions.**

**La migration est DÉJÀ appliquée en production.** Le fichier n'est là que
pour que le repo dise la vérité. **Ne lance pas `db push`.**

La nouvelle page est servie par Vercel au premier push, à
**`/club/totehmbot`** — `cleanUrls` retire le `.html`.

---

## 7 · Le contrôle après déploiement

```bash
curl -sL -o /dev/null -w "page de vente ? %{http_code}\n" https://www.totehm.com/club/totehmbot
curl -sL -o /dev/null -w "backend public ? %{http_code}\n" https://www.totehm.space/backend/README.md
```

**200 pour la première, 404 pour la seconde.** Si `backend/` rend 200,
arrête tout : le SQL et le code des Edge Functions sont téléchargeables.

---

```bash
rm -rf ~/inbox/*
```
