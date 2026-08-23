# -*- coding: utf-8 -*-
"""
LA RÈGLE DU SURVOL, ÉCRITE PAR LA MACHINE.

« Tous les textes gris deviennent blancs au survol. Tous. Sans exception. »
Une liste de sélecteurs tenue à la main a déjà raté trois lots : chaque
nouveau bloc gris arrive sans son survol. On ne la tient plus à la main.

Ce script LIT la feuille de style, trouve toute règle qui pose une couleur
GRISE sur du texte, et écrit le bloc de survol correspondant. Ce qui est
gris est défini une fois : les trois canaux à moins de 30 d'écart, ou un
blanc transparent. Les couleurs d'intention (#E24B4A, #378ADD…) ne sont
pas grises et gardent leur teinte.

verify() relit le fichier produit et échoue s'il reste un seul gris sans
survol : l'exhaustivité est vérifiée, pas promise.
"""
import re, sys

MARK_A = '/* ══ SURVOL — BLOC GÉNÉRÉ, NE PAS ÉDITER À LA MAIN (hover.py) ══ */'
MARK_B = '/* ══ FIN DU BLOC GÉNÉRÉ ══ */'

SKIP_PSEUDO = (':hover', ':active', ':disabled', ':focus', '::-webkit',
               '::selection', '::-moz', ':checked')

def channels(c):
    c = c.strip().lower()
    m = re.fullmatch(r'#([0-9a-f]{3})', c)
    if m: return [int(ch*2, 16) for ch in m.group(1)], 1.0
    m = re.fullmatch(r'#([0-9a-f]{6})', c)
    if m: h = m.group(1); return [int(h[i:i+2], 16) for i in (0, 2, 4)], 1.0
    m = re.fullmatch(r'rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)', c)
    if m:
        return [int(float(m.group(i))) for i in (1, 2, 3)], float(m.group(4) or 1)
    return None, None

def is_grey(value, roots, depth=0):
    """Gris = trois canaux resserrés et pas du blanc opaque, ou un blanc translucide."""
    # PIÈGE MESURÉ : `rstrip('!important')` retire les CARACTÈRES de cet
    # ensemble, pas le mot. '#9a9a9a' devenait '#9a9a9' — cinq chiffres, plus
    # aucune couleur reconnue, et deux gris passaient à travers la génération.
    v = re.sub(r'\s*!\s*important\s*$', '', value.strip().lower()).strip()
    if depth > 4: return False
    m = re.match(r'var\(\s*(--[\w-]+)\s*(?:,\s*(.+)\s*)?\)$', v)
    if m:
        name, fb = m.group(1), m.group(2)
        if name in roots and is_grey(roots[name], roots, depth+1): return True
        return bool(fb) and is_grey(fb, roots, depth+1)
    if v in ('inherit', 'currentcolor', 'transparent', 'initial', 'unset', '#fff', '#ffffff', 'white'):
        return False
    ch, a = channels(v)
    if ch is None: return False
    if a is not None and a < .95:                 # blanc (ou autre) translucide = gris à l'œil
        return not (ch == [0, 0, 0])
    return (max(ch) - min(ch)) <= 30 and max(ch) < 250 and max(ch) > 12

def nocomment(css):
    return re.sub(r'/\*.*?\*/', '', css, flags=re.S)

def roots_of(css):
    css = nocomment(css); out = {}
    for blk in re.findall(r':root\s*\{([^}]*)\}', css):
        for d in blk.split(';'):
            if ':' in d:
                k, _, val = d.partition(':')
                if k.strip().startswith('--'): out[k.strip()] = val.strip()
    return out

def strip_generated(css):
    if MARK_A in css:
        i, j = css.index(MARK_A), css.index(MARK_B) + len(MARK_B)
        css = css[:i] + css[j:]
    return css

def rules(css):
    """Rend (selecteur, corps) pour chaque règle, @keyframes exclus."""
    css = nocomment(css)
    css = re.sub(r'@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}', '', css, flags=re.S)
    for sel, body in re.findall(r'([^{}@]+)\{([^{}]*)\}', css, flags=re.S):
        sel = sel.strip()
        if not sel or sel.startswith('/*'): continue
        yield sel, body

def collect(css):
    roots, out = roots_of(css), []
    for sel, body in rules(css):
        col = None
        for d in body.split(';'):
            k, _, val = d.partition(':')
            if k.strip() == 'color': col = val
        if col is None or not is_grey(col, roots): continue
        for one in sel.split(','):
            one = one.strip()
            if not one or one.startswith('@'): continue
            if any(p in one for p in SKIP_PSEUDO): continue
            if one in (':root', 'html', 'body', '*'): continue
            if '::placeholder' in one:
                out.append(one.replace('::placeholder', ':hover::placeholder'))
            elif '::' in one:
                base, _, pe = one.partition('::')
                out.append(base + ':hover::' + pe)
            else:
                out.append(one + ':hover')
    seen, keep = set(), []
    for x in out:
        if x not in seen: seen.add(x); keep.append(x)
    return keep

def build(path, write=True):
    src = open(path, encoding='utf-8').read()
    m = re.search(r'(<style>)(.*?)(</style>)', src, flags=re.S)
    if not m: return 0
    css = strip_generated(m.group(2))
    sels = collect(css)
    if not sels: return 0
    lines, CH = [], 4
    for i in range(0, len(sels), CH):
        lines.append(',\n'.join(sels[i:i+CH]))
    block = ('\n' + MARK_A + '\n'
             '/* Le gris en survol devient blanc. Généré depuis la feuille\n'
             '   elle-même : un nouveau bloc gris entre ici tout seul.        */\n'
             '@media(hover:hover){\n' + ',\n'.join(sels) + '{color:#fff}\n}\n'
             + MARK_B + '\n')
    if write:
        open(path, 'w', encoding='utf-8').write(src[:m.start(2)] + css + block + src[m.end(2):])
    return len(sels)

def verify(path):
    src = open(path, encoding='utf-8').read()
    m = re.search(r'(<style>)(.*?)(</style>)', src, flags=re.S)
    if not m: return []
    css = m.group(2)
    have = set()
    for sel, body in rules(css):
        if 'color:#fff' not in body.replace(' ', '') and 'color:#ffffff' not in body.replace(' ', ''):
            continue
        for one in sel.split(','):
            have.add(one.strip())
    need = collect(strip_generated(css))
    return [x for x in need if x not in have]

if __name__ == '__main__':
    for f in sys.argv[1:]:
        n = build(f)
        miss = verify(f)
        print(('  %-22s %3d sélecteurs' % (f, n)) + ('   MANQUE: ' + ', '.join(miss[:6]) if miss else '   complet'))
