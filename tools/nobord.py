# -*- coding: utf-8 -*-
"""AUCUNE BORDURE AUTOUR D'UNE BOÎTE — les trois domaines · 13/09/2026

Ce qui délimite, dans tout TOTEHM : les trois couleurs de marque, le noir
absolu, et le gris avec ses nuances. Jamais un trait.

CE QU'ON RETIRE
  · `border:1px solid rgba(...)`      un trait posé autour d'une boîte
  · `border-<côté>:1px solid rgba()`  un séparateur de rangée
  · `border:1px dashed rgba(...)`     l'« invitation » pointillée

CE QU'ON NE TOUCHE PAS, ET IL FAUT LE SAVOIR
  · `border:6px solid transparent`    ce N'EST PAS une bordure : c'est le
    support de `border-image`, la PERFORATION du logo. La retirer
    effacerait les carrés perforés de toute la marque.
  · `border:6px solid #626283`        même mécanisme, teinte pleine.
  · `border:none` / `0`               déjà propre.

Une rangée qui perdait son filet garde sa séparation : elle la tient du
`gap` du conteneur, ou d'un fond à peine posé quand il n'y avait que le
trait pour la dire.
"""
import io, os, re, sys

RACINE = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(RACINE) == 'tmp':
    RACINE = '/home/claude/repo'

# Un trait gris/blanc translucide ou une couleur sombre — jamais `transparent`,
# jamais 6px (la perforation).
TRAIT = re.compile(
    r"border(?P<cote>-top|-bottom|-left|-right)?\s*:\s*"
    r"(?P<ep>[0-9.]+)px\s+(?P<style>solid|dashed|dotted)\s+"
    r"(?P<col>rgba?\([^)]*\)|#[0-9a-fA-F]{3,8})\s*;?")

def garde(m):
    """True si c'est la perforation du logo, pas une bordure."""
    return float(m.group('ep')) >= 4

def passe(chemin):
    s = io.open(chemin, encoding='utf-8').read()
    avant = s
    retires = []
    def sub(m):
        if garde(m):
            return m.group(0)
        retires.append(m.group(0).strip())
        # On laisse la place vide : la déclaration disparaît entièrement.
        return ''
    s = TRAIT.sub(sub, s)
    # Un `;;` ou `{;` laissé par le retrait se nettoie.
    s = re.sub(r';\s*;', ';', s)
    s = re.sub(r'\{\s*;', '{', s)
    if s != avant:
        io.open(chemin, 'w', encoding='utf-8').write(s)
    return retires

total = 0
for dossier in ('space', 'com', 'boutique'):
    d = os.path.join(RACINE, dossier)
    if not os.path.isdir(d): continue
    for nom in sorted(os.listdir(d)):
        if not nom.endswith('.html'): continue
        r = passe(os.path.join(d, nom))
        if r:
            total += len(r)
            print('  %-34s %2d trait(s)' % (dossier + '/' + nom, len(r)))
print('\n%d bordures retirees' % total)
