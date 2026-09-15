# -*- coding: utf-8 -*-
"""Réinjecte tools/zone.js dans com/totehm.html, entre ses deux repères."""
# ⚠️ LE RÉSEAU SOCIAL VIT DANS `com/` DEPUIS LE SWAP DU 15/09/2026.
#    Le nom du dossier ne dit PLUS ce qu'il sert : `com/` = le Totehm,
#    `space/` = le branding. Le mapping Vercel n'a pas bougé (projet com
#    -> dossier com), donc ce sont les URL publiques qui ont changé de
#    rôle. Lire CLAUDE.md § « L'architecture technique » avant de
#    déplacer quoi que ce soit.
import io, os, sys
SC=os.path.dirname(os.path.abspath(__file__))+'/'
C=SC+'../com/totehm.html'
s=io.open(C,encoding='utf-8').read(); n0=len(s)
Z=io.open(SC+'zone.js',encoding='utf-8').read().rstrip()+'\n'
D='/* ══ LA ZONE — UNE SEULE BOÎTE, PARTOUT LA MÊME'
F='/* ══ LE CLASSEMENT PAR IMPORTANCE'
for r in (D,F):
    if s.count(r)!=1: sys.exit('ARRET · repere %d fois : %s'%(s.count(r),r[:50]))
a=s.index(D); b=s.index(F)
if b<=a: sys.exit('ARRET · reperes dans le desordre')
s=s[:a]+Z+'\n'+s[b:]
io.open(C,'w',encoding='utf-8').write(s)
print('  zone reinjectee : %d -> %d octets'%(n0,len(s)))
