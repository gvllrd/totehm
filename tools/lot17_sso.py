# -*- coding: utf-8 -*-
"""LOT DU 17/09/2026 · LE PONT SSO DANS LES PAGES
    python3 tools/lot17_sso.py

Pose le bloc de `tools/sso_snippet.js` dans les pages qui ont une session.
Le bloc se COPIE (regle du projet : produits independants = fichiers
independants) -- un `<script src>` partage ferait qu'une panne sur un
domaine eteindrait les quatre.

⚠️ N'ECRIT QU'A LA FIN.
"""
import os, sys
SC = os.path.dirname(os.path.abspath(__file__)) + '/'
rates, sorties = [], {}

BLOC = open(SC+'sso_snippet.js', encoding='utf-8').read().strip()

SB_LINE = ("const sb=createClient('https://abujjbkbbiumxrokozph.supabase.co',"
 "'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidWpqYmtiYml1bXhyb2tvenBoIiwi"
 "cm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTUyODIsImV4cCI6MjA5MDUzMTI4Mn0.1baPwPzAeT91Re9xj6afBrNso-Ri46fvIIwvATZL2us');")

def pose(chemin, quoi):
    """Insere le bloc juste apres la creation du client, une seule fois."""
    s = open(chemin, encoding='utf-8').read()
    if 'ssoArrivee' in s:
        return s                                  # deja pose
    import re
    m = re.search(r"const\s+sb\s*=\s*createClient\([^;]*\);", s)
    if not m:
        rates.append('%s : pas de createClient trouve' % quoi); return s
    i = m.end()
    return s[:i] + "\n\n" + BLOC + "\n" + s[i:]

# ── com/totehm.html : depart ET arrivee
p = SC + '../com/totehm.html'
s = pose(p, 'com/totehm.html')
sorties[p] = s

# ── les pages de .space qui portent une session
for f in ['discover.html','discover_lisbon.html','get_higher.html',
          'origins.html','play_lisbon_street.html','stoner.html']:
    p = SC + '../space/' + f
    if not os.path.exists(p):
        rates.append('space/%s introuvable' % f); continue
    sorties[p] = pose(p, 'space/'+f)

if rates:
    print('ARRET · rien ecrit :')
    for r in rates: print('  · ' + r)
    sys.exit(1)

for chemin, contenu in sorties.items():
    open(chemin, 'w', encoding='utf-8').write(contenu)
    print('pose  ' + chemin.split('/repo/')[-1])
