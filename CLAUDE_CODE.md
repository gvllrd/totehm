# CLAUDE_CODE.md — LOT DU 22/09/2026

**Entrée enregistre partout · les options sous le [close] · le téléphone
couché replie le Totehm · le pavé rend aux ronds leurs couleurs.**

Le zip contient tout l'historique du repo. **Ne prends que les trois
fichiers listés ci-dessous.** Le reste est déjà chez toi.

**Aucune migration, aucune Edge Function dans ce lot.** C'est du front
et de la documentation.

---

## 1 · Les trois fichiers

```
com/totehm.html
CLAUDE.md
CLAUDE_CODE.md
```

---

## 2 · Le contrôle AVANT de copier

Colle ce bloc. **Il doit afficher trois `OK`.** Un seul `VIEUX` et tu as
une version du 21/09 ou d'avant dans les mains — ne copie rien, redemande
le zip.

```bash
cd ~/inbox
grep -q "beforeinput" com/totehm.html && echo "OK  totehm.html" || echo "VIEUX  totehm.html"
grep -q "LE TÉLÉPHONE COUCHÉ REPLIE LE TOTEHM" CLAUDE.md && echo "OK  CLAUDE.md" || echo "VIEUX  CLAUDE.md"
grep -q "LOT DU 22/09/2026" CLAUDE_CODE.md && echo "OK  CLAUDE_CODE.md" || echo "VIEUX  CLAUDE_CODE.md"
```

Et quatre contrôles de plus, qui vérifient que le vieux code est bien
parti. **Chacun doit afficher zéro.**

```bash
grep -c "bas=lienPicker" com/totehm.html
```

Les options du lookup ne se dessinent plus en bas de la boîte : elles
sont le dernier enfant du GROUPE qui les a ouvertes, dans le
prolongement du `[close]`.

```bash
grep -c "couche-h\|couche-b" com/totehm.html
```

Le petit repère blanc du 21/09 est supprimé — style ET classe, dans le
même geste.

```bash
grep -c 'id="door-bot"' com/totehm.html
grep -c "\$('door-bot')" com/totehm.html
```

`[My Higher Self]` est ressorti du Totehm déployé. **Les DEUX doivent
afficher zéro** : balisage et câblage partent ensemble, parce qu'un
`.onclick` sur un nœud absent lève à l'évaluation du module et la page
s'affiche **blanche**. (Le nom reste dans un commentaire qui explique
la suppression — c'est voulu, d'où le `grep` précis.)

```bash
grep -c "0 0 0 1.5px rgba(255,255,255,.34)" com/totehm.html
```

Le liseré qui repeignait le rond actif en blanc est parti.

Et deux derniers, qui doivent afficher **`1`** chacun :

```bash
grep -c "pointer:coarse" com/totehm.html
grep -c "inset 0 1px 0 rgba(255,255,255,.20)" com/totehm.html
```

Le premier est le verrou du mode paysage. Sans lui, la règle
s'appliquerait à **tous les ordinateurs** — `(orientation:landscape)` y
est toujours vrai. Le second est le relief discret qui a remplacé le
liseré blanc sur le rond actif.

---

## 3 · La copie

```bash
cp ~/inbox/com/totehm.html ~/totehm/com/totehm.html
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

⚠️ **Jamais `git add .`** — `oracle/` contient les clés SSH. Chaque
chemin est nommé.

```bash
git -C ~/totehm add com/totehm.html
git -C ~/totehm commit -m "totehm: Entree enregistre partout, les options sous le close, le telephone couche replie"
```

```bash
git -C ~/totehm add CLAUDE.md CLAUDE_CODE.md
git -C ~/totehm commit -m "docs: le lot du 22/09, et les trois regles qui en sortent"
```

```bash
git -C ~/totehm push
```

---

## 6 · Le déploiement

**Rien à déployer à la main.** Pas de migration, pas d'Edge Function.
Vercel sert la nouvelle page au premier push.

---

## 7 · Le contrôle après déploiement

```bash
curl -sL -o /dev/null -w "le Totehm ? %{http_code}\n" https://www.totehm.com/totehm
curl -sL -o /dev/null -w "backend public ? %{http_code}\n" https://www.totehm.com/backend/README.md
```

**200 pour la première, 404 pour la seconde.** Si `backend/` rend 200,
arrête tout : le SQL et le code des Edge Functions sont téléchargeables.

---

```bash
rm -rf ~/inbox/*
```
