# -*- coding: utf-8 -*-
"""LOT DU 16/09/2026 · 1/3 — LA PLOMBERIE MORTE

    python3 tools/lot16_plomberie.py

Le front appelait quatre fonctions qui N'EXISTENT PLUS en base. Elles ont
ete renommees `objective_*` ; personne n'a repointe la page. Mesure dans
Supabase le 16/09 : `trip_create`, `trip_rename`, `trip_set_target`,
`trip_close` absentes. Consequence exacte de ce que Wah signale depuis
trois lots : creer un objectif ne cree rien, le supprimer ne supprime
rien -- il revient au rechargement.

Et le 404 de l'espace createur : sous `cleanUrls`, a l'URL `/club`, un
`href="creator.html"` resout vers `/creator.html`. Vercel rend un 404.
Tous les liens inter-pages passent en chemin ABSOLU : un chemin absolu ne
depend pas de la barre oblique finale.

⚠️ CE SCRIPT N'ECRIT QU'A LA FIN. Un `sys.exit` au milieu laisserait des
   fichiers a moitie corriges -- c'est deja arrive, deux fois.
"""
import os, sys

SC = os.path.dirname(os.path.abspath(__file__)) + '/'
COM = SC + '../com/'

rates = []          # les echecs, collectes puis affiches ensemble
sorties = {}        # chemin -> contenu, ecrit seulement si rates est vide


def ech(s, vieux, neuf, quoi, attendu=1):
    n = s.count(vieux)
    if n != attendu:
        rates.append('%s : le repere apparait %d fois, attendu %d\n    %s'
                     % (quoi, n, attendu, vieux.strip()[:100]))
        return s
    return s.replace(vieux, neuf)


# ═══════════════════════════════════════════════════════════════════════
# 1 · com/totehm.html — les quatre appels morts
# ═══════════════════════════════════════════════════════════════════════
p = COM + 'totehm.html'
s = open(p, encoding='utf-8').read()

s = ech(s,
    "sb.rpc('trip_create',{p_text:'',p_target:null})",
    "sb.rpc('objective_create',{p_text:'',p_target:null})",
    'trip_create')

s = ech(s,
    "sb.rpc('trip_rename',{p_trip:z.id,p_text:z.text})",
    "sb.rpc('objective_rename',{p_obj:z.id,p_text:z.text})",
    'trip_rename')

s = ech(s,
    "sb.rpc('trip_set_target',{p_trip:t.id,p_target:null})",
    "sb.rpc('objective_set_target',{p_obj:t.id,p_target:null})",
    'trip_set_target (efface)')

s = ech(s,
    "sb.rpc('trip_set_target',{p_trip:t.id,p_target:t.target_at})",
    "sb.rpc('objective_set_target',{p_obj:t.id,p_target:t.target_at})",
    'trip_set_target (pose)')

s = ech(s,
    "sb.rpc('trip_close',{p_trip:id,p_outcome:'dropped'})",
    "sb.rpc('objective_close',{p_obj:id,p_outcome:'dropped'})",
    'trip_close')

sorties[p] = s

# ═══════════════════════════════════════════════════════════════════════
# 2 · com/club/index.html — les liens relatifs sous cleanUrls
# ═══════════════════════════════════════════════════════════════════════
p = COM + 'club/index.html'
s = open(p, encoding='utf-8').read()

s = ech(s, 'href="../map.html"',      'href="/map"',         'club -> radar')
s = ech(s, 'href="creator.html"',     'href="/club/creator"', 'club -> createur')
s = ech(s, "location.href = '../totehm.html#in'",
           "location.href = '/totehm#in'",                    'club -> totehm')

sorties[p] = s

# ═══════════════════════════════════════════════════════════════════════
# 3 · com/club/creator.html — meme regle
# ═══════════════════════════════════════════════════════════════════════
p = COM + 'club/creator.html'
s = open(p, encoding='utf-8').read()
s = ech(s, "location.href = '../totehm.html#in'",
           "location.href = '/totehm#in'",                    'createur -> totehm')
sorties[p] = s


# ═══════════════════════════════════════════════════════════════════════
if rates:
    print('ARRET · rien ecrit :')
    for r in rates:
        print('  · ' + r)
    sys.exit(1)

for chemin, contenu in sorties.items():
    open(chemin, 'w', encoding='utf-8').write(contenu)
    print('ecrit  %s  (%d octets)' % (chemin.split('/com/')[-1], len(contenu)))
