# -*- coding: utf-8 -*-
"""
LA RÈGLE DU SURVOL, ÉCRITE PAR LA MACHINE.

« Sur ordinateur, tous les textes deviennent blancs au survol. »
Une liste de sélecteurs tenue à la main a déjà raté trois lots : chaque
nouveau texte arrive sans son survol. On ne la tient plus à la main.

Ce script LIT toutes les feuilles de style de la page et complète les
sélecteurs de texte par ceux qui posent une couleur. Le bloc final couvre
aussi les textes ajoutés dynamiquement et leurs couleurs en ligne. Seule
la couleur du texte change : les surfaces, images et dessins SVG restent
intacts. Le survol n'est activé qu'avec une souris, jamais au toucher.

verify() relit le fichier produit et signale toute couverture de texte
manquante, y compris les exclusions et la détection du pointeur.
"""
import re, sys

MARK_A = '/* ══ SURVOL — BLOC GÉNÉRÉ, NE PAS ÉDITER À LA MAIN (hover.py) ══ */'
MARK_B = '/* ══ FIN DU BLOC GÉNÉRÉ ══ */'

SKIP_PSEUDO = (':active', ':disabled', ':focus', '::-webkit',
               '::selection', '::-moz', ':checked')

TEXT = ('a,abbr,address,b,bdi,bdo,blockquote,button,caption,cite,code,dd,del,dfn,dt,'
        'em,figcaption,h1,h2,h3,h4,h5,h6,i,input,kbd,label,legend,li,mark,option,'
        'output,p,pre,q,rp,rt,ruby,s,samp,small,span,strong,sub,summary,sup,td,'
        'textarea,th,time,u,var')
# Divs with only text/line breaks are labels, not layout ancestors. Text in
# structured containers is covered by its own tag or authored color selector.
TEXT_SELECTORS = [':is(' + TEXT + ')', 'div:not(:has(> :not(br,wbr)))']
# An empty tag is decorative unless it is a form field. Illustration-only
# wrappers are explicitly marked so their currentColor never follows text.
TEXT_GUARD = ':where(:not(svg,svg *,img,video,canvas,:empty:not(input,textarea,[contenteditable]),[data-hover-art],[data-hover-art] *,:disabled,[disabled],[aria-disabled="true"],:disabled *,[disabled] *,[aria-disabled="true"] *))'
STYLES = re.compile(r'(<style\b[^>]*>)(.*?)(</style\s*>)', re.S | re.I)

def nocomment(css):
    return re.sub(r'/\*.*?\*/', '', css, flags=re.S)

def strip_generated(css):
    return re.sub(r'\n?' + re.escape(MARK_A) + r'.*?' + re.escape(MARK_B) + r'\n?',
                  '\n', css, flags=re.S)

def selectors(value):
    """Commas inside :is(), :not(), attributes and strings are not separators."""
    start, depth, quote, escaped = 0, 0, None, False
    for i, char in enumerate(value):
        if escaped: escaped = False; continue
        if char == '\\': escaped = True; continue
        if quote:
            if char == quote: quote = None
            continue
        if char in ('"', "'"): quote = char; continue
        if char in '([': depth += 1
        elif char in ')]': depth -= 1
        elif char == ',' and depth == 0:
            yield value[start:i].strip(); start = i + 1
    yield value[start:].strip()

def hover_text(selector):
    base, pseudo, suffix = selector.partition('::')
    if ':hover' not in base: base += ':hover'
    return base + (pseudo + suffix if pseudo else '')

def hover_block(sels):
    plain = [sel for sel in sels if '::' not in sel]
    lines = [':is(\n' + ',\n'.join(plain) + ')' + TEXT_GUARD + '{color:#fff!important}']
    for sel in sels:
        if '::' not in sel: continue
        base, _, suffix = sel.partition('::')
        lines.append(base + TEXT_GUARD + '::' + suffix + '{color:#fff!important}')
    return ('\n' + MARK_A + '\n'
            '/* Tout texte devient blanc sous la souris. Les dessins, surfaces\n'
            '   et contrôles désactivés gardent leur apparence. */\n'
            '@media(hover:hover) and (pointer:fine){\n' + '\n'.join(lines) + '\n}\n'
            + MARK_B + '\n')

def rules(css):
    """Rend (selecteur, corps) pour chaque règle, @keyframes exclus."""
    css = nocomment(css)
    css = re.sub(r'@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}', '', css, flags=re.S)
    for sel, body in re.findall(r'([^{}@]+)\{([^{}]*)\}', css, flags=re.S):
        sel = sel.strip()
        if not sel or sel.startswith('/*'): continue
        yield sel, body

def collect(css):
    out = [hover_text(sel) for sel in TEXT_SELECTORS]
    for sel, body in rules(css):
        col = None
        for d in body.split(';'):
            k, _, val = d.partition(':')
            if k.strip() == 'color': col = val
        if col is None: continue
        value = re.sub(r'\s*!\s*important\s*$', '', col.strip().lower()).strip()
        if value in ('inherit', 'currentcolor', 'transparent', 'initial', 'unset', '#fff', '#ffffff', 'white'): continue
        for one in selectors(sel):
            one = one.strip()
            if not one or one.startswith('@'): continue
            if any(p in one for p in SKIP_PSEUDO): continue
            if one in (':root', 'html', 'body', '*'): continue
            out.append(hover_text(one))
    seen, keep = set(), []
    for x in out:
        if x not in seen: seen.add(x); keep.append(x)
    return keep

def build(path, write=True):
    src = open(path, encoding='utf-8').read()
    styles = list(STYLES.finditer(src))
    if not styles: return 0
    sheets = [strip_generated(m.group(2)) for m in styles]
    css = '\n'.join(sheets)
    sels = collect(css)
    if not sels: return 0
    block = hover_block(sels)
    if write:
        for i in range(len(styles)-1, -1, -1):
            m = styles[i]
            sheet = sheets[i].rstrip() + (block if i == len(styles)-1 else '\n')
            src = src[:m.start(2)] + sheet + src[m.end(2):]
        open(path, 'w', encoding='utf-8').write(src)
    return len(sels)

def verify(path):
    src = open(path, encoding='utf-8').read()
    styles = list(STYLES.finditer(src))
    if not styles: return []
    css = '\n'.join(m.group(2) for m in styles)
    need = collect(strip_generated(css))
    # Compare the whole final block, including its pointer/disabled/artwork
    # guards, rather than mistaking an unrelated white color for coverage.
    return [] if hover_block(need).strip() in css else need

if __name__ == '__main__':
    for f in sys.argv[1:]:
        n = build(f)
        miss = verify(f)
        print(('  %-22s %3d sélecteurs' % (f, n)) + ('   MANQUE: ' + ', '.join(miss[:6]) if miss else '   complet'))
