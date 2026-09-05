# CLAUDE_CODE.md — lot du 05/09/2026

## Ce qu'il y a dans ce zip

`totehm.bundle` — bundle INCRÉMENTAL : les 29 commits de la branche
`lot/carte-ville-higherself` qui ne sont pas dans `origin/main`. Il ne
s'applique donc que sur un clone qui a déjà `origin/main` à jour
(f04b88d). Le commit qui compte pour ce lot est le dernier :

    3beea49  feat(totehm): le depliage — trois carres de vue, et la
             couleur passe du papier aux boites

**Un seul fichier change : `space/totehm.html`.** Rien d'autre.

---

## À COLLER DANS LE TERMINAL

```bash
cd ~/totehm            # <- le chemin de ton dépôt
git fetch origin                                   # origin/main à jour
git fetch ~/inbox/totehm.bundle 'refs/heads/*:refs/remotes/inbox/*'
git checkout lot/carte-ville-higherself 2>/dev/null || \
  git checkout -b lot/carte-ville-higherself inbox/lot/carte-ville-higherself
git merge --ff-only inbox/lot/carte-ville-higherself
git log --oneline -2
```

Tu dois lire, sur l'avant-dernier commit (`git log --oneline -2`) :

    3beea49 feat(totehm): le depliage — trois carres de vue, et la couleur passe du papier aux boites

## GREP DE CONTRÔLE — contre les vieilles versions

```bash
# 1. Les chevrons ont disparu du code (il ne reste que des commentaires).
grep -c 'id="tnav-l"\|id="tnav-r"' space/totehm.html
# ATTENDU : 0

# 2. Les trois carrés sont là.
grep -c 'class="vt h"\|class="vt o"\|class="vt r"' space/totehm.html
# ATTENDU : 3

# 3. Le papier ne se repeint plus.
grep -c 'z-next\|z-book' space/totehm.html
# ATTENDU : 0

# 4. Les boîtes portent la couleur de la vue.
grep -c '#stage.v-h{--skin\|#stage.v-o{--skin\|#stage.v-r{--skin' space/totehm.html
# ATTENDU : 3

# 5. Le bleu clair de l'objectif existe comme jeton.
grep -c -- '--sky:#7fa3e8' space/totehm.html
# ATTENDU : 1

# 6. Plus aucun fond de boîte en noir transparent.
grep -c 'h-body{background:rgba(0,0,0' space/totehm.html
# ATTENDU : 0
```

Si un seul de ces six chiffres ne tombe pas juste, **ne déploie pas** :
tu es sur une vieille version, refais le `git fetch` ci-dessus.

## DÉPLOIEMENT

```bash
git push origin lot/carte-ville-higherself
```

Vercel construit tout seul. Rien d'autre à faire : aucune migration,
aucune Edge Function, aucun secret dans ce lot.

## IGNORE LE RESTE DU BUNDLE

Les 28 commits précédents sont l'historique, ils sont déjà chez toi si tu
as appliqué les lots précédents. `--ff-only` refusera de faire n'importe
quoi : s'il refuse, c'est que ton dépôt a divergé — dis-le-moi, ne force
rien.

---

```bash
rm -rf ~/inbox/*
```
