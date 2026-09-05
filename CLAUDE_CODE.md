# CLAUDE_CODE.md — lot du 05/09/2026 (v2)

## Ce qu'il y a dans ce zip

`totehm.bundle` — bundle **incrémental** : les commits de la branche
`lot/carte-ville-higherself` absents de `origin/main` (f04b88d). Il ne
s'applique donc que sur un clone à jour.

Les deux commits qui comptent pour ce lot :

    3beea49  le depliage — trois carres de vue, et la couleur passe du
             papier aux boites
    bd9eb1c  la boite s'agrandit a sa place — plus de modale, plus
             d'ombre, le O du wordmark

Fichiers touchés : **`space/totehm.html`** et **`CLAUDE.md`**. Rien d'autre.

---

## À COLLER DANS LE TERMINAL

```bash
cd ~/totehm            # <- le chemin de ton dépôt
git fetch origin
git fetch ~/inbox/totehm.bundle 'refs/heads/*:refs/remotes/inbox/*'
git checkout lot/carte-ville-higherself 2>/dev/null || \
  git checkout -b lot/carte-ville-higherself inbox/lot/carte-ville-higherself
git merge --ff-only inbox/lot/carte-ville-higherself
git log --oneline -1
```

Tu dois lire exactement :

    bd9eb1c feat(totehm): la boite s'agrandit a sa place — plus de modale, plus d'ombre, le O du wordmark

## GREP DE CONTRÔLE — contre les vieilles versions

```bash
# 1. Plus de modale plein écran pour un objectif.
grep -c 'id="trip-peek"' space/totehm.html
# ATTENDU : 0

# 2. La boîte s'agrandit à sa place.
grep -c 'habit.open' space/totehm.html
# ATTENDU : 5

# 3. Le O vient du wordmark, plus de Montserrat.
grep -c 'const O_SVG' space/totehm.html
# ATTENDU : 1
grep -c 'tp-O' space/totehm.html
# ATTENDU : 0

# 4. Plus une seule face extrudée.
grep -c 'box-shadow:[0-9]' space/totehm.html
# ATTENDU : 0

# 5. Les trois carrés de vue, ordre rouge · navy · bleu.
grep -c 'class="vt r"\|class="vt h"\|class="vt o"' space/totehm.html
# ATTENDU : 3

# 6. Le papier ne se repeint plus.
grep -c 'z-next\|z-book' space/totehm.html
# ATTENDU : 0

# 7. Un seul bleu de remplissage pour l'objectif.
grep -c 'v-o{--skin:var(--blue)}' space/totehm.html
# ATTENDU : 1
```

Si un seul de ces sept chiffres ne tombe pas juste, **ne déploie pas** :
tu es sur une vieille version, refais le `git fetch` ci-dessus.

## DÉPLOIEMENT

```bash
git push origin lot/carte-ville-higherself
```

Vercel construit tout seul. Aucune migration, aucune Edge Function, aucun
secret dans ce lot.

## IGNORE LE RESTE DU BUNDLE

Les commits précédents sont l'historique. `--ff-only` refusera de faire
n'importe quoi : s'il refuse, ton dépôt a divergé — dis-le-moi, ne force
rien.

---

```bash
rm -rf ~/inbox/*
```
