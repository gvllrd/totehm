#!/usr/bin/env python3
"""Recopie les blocs communs de `tools/` dans les pages qui les portent — et vérifie que chaque copie est EXACTE.

Un bloc commun se COPIE, jamais ne s'importe (CLAUDE.md). Cet outil ne décide pas QUI porte QUOI : une page porte un
bloc si elle contient sa première ligne. Il fait deux choses :

    python3 tools/recopier.py [sites]            réécrit les copies périmées (bornées par `/* ══ fin X ══ */`, ou de même forme)
    python3 tools/recopier.py --check [sites]    ne touche à rien ; sort en erreur si une copie diffère

`sites` : `com`, `club`, `boutique`, `space` — les quatre par défaut. `tests/node/blocs_copies.mjs` lance `--check com club`.

Un bloc sans borne de fin (coin membre, SSO, nomenclature, envoi Bunny, écosystème) ne se réécrit que si la copie périmée
a la même forme (autant de lignes, la même dernière ligne) ; sinon l'outil le signale et on le recopie à la main.
Après une recopie de CSS : `python3 tools/hover.py <page>`.
"""
import pathlib, sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
SITES = ['com', 'club', 'boutique', 'space']
# L'ancien moteur du Club (encore ouvert par TotehmBot, `com/spot.html`) garde ses copies d'époque, avec des règles locales
# ENTRE leurs bornes : on ne le réécrit pas et on ne le compare pas.
ANCIENS = {'club/create.html'}
# Le pont SSO est un GABARIT : chaque page l'adapte (son nom de domaine, ses constantes, pas de SORTIR sur figher.club).
# Il ne se compare pas ligne à ligne ; ses parcours sont tenus par les tests de connexion.
GABARITS = {'sso_snippet.js'}
BLOCS = sorted([p for p in (RACINE / 'tools').iterdir() if p.suffix in ('.js', '.css') and p.name not in GABARITS])


def pages(sites):
    for s in sites:
        for p in sorted((RACINE / s).glob('*.html')):
            if str(p.relative_to(RACINE)) not in ANCIENS:
                yield p


def bloc(p):
    t = p.read_text().rstrip('\n')
    lignes = t.split('\n')
    fin = lignes[-1] if lignes[-1].startswith('/* ══ fin ') else None
    return t, lignes[0], fin


def main():
    verifier = '--check' in sys.argv
    sites = [a for a in sys.argv[1:] if a in SITES] or SITES
    ecarts, recopies, portes = [], 0, 0
    for page in pages(sites):
        html = page.read_text()
        neuf = html
        for b in BLOCS:
            texte, tete, fin = bloc(b)
            if tete not in neuf:
                continue
            portes += 1
            if texte in neuf:
                continue
            if verifier:
                ecarts.append(f'{page.relative_to(RACINE)} ≠ tools/{b.name}')
                continue
            a = neuf.index(tete)
            if fin:
                z = neuf.find(fin, a)
                if z < 0:
                    ecarts.append(f'{page.relative_to(RACINE)} : la borne de fin de tools/{b.name} a disparu')
                    continue
                neuf = neuf[:a] + texte + neuf[z + len(fin):]
            else:
                # Sans borne de fin : on ne réécrit que si la copie périmée a la MÊME forme (autant de lignes, la même dernière
                # ligne) — sinon on ne sait pas où elle finit, et on le dit.
                lignes = texte.split('\n')
                vieux = neuf[a:].split('\n')[:len(lignes)]
                if len(vieux) != len(lignes) or vieux[-1] != lignes[-1]:
                    ecarts.append(f'{page.relative_to(RACINE)} ≠ tools/{b.name}  (forme différente : à recopier à la main)')
                    continue
                neuf = neuf[:a] + texte + neuf[a + len('\n'.join(vieux)):]
            recopies += 1
        if neuf != html and not verifier:
            page.write_text(neuf)
    print(f'{portes} copies dans les pages · {recopies} réécrites · {len(ecarts)} écart(s)')
    for e in ecarts:
        print('  ' + e)
    sys.exit(1 if ecarts else 0)


if __name__ == '__main__':
    main()
