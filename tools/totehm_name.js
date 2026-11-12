/* ══ LA NOMENCLATURE DU VERSO — copié de tools/totehm_name.js dans chaque page (jamais importé) ══
   Le NOM d'un TOTEHM prend TOUT le carré de son verso. Sur une ligne il rapetissait jusqu'à 5,5 px
   (mesuré : 4,1 px au coin membre pour 24 lettres) ; posé sur la trame des 12 trous il reste 2 à 2,5 fois
   plus grand. La règle, la même partout :

     1 – 5 lettres  → une ligne, centrée (en grille elles seraient PLUS PETITES : mesuré × 0,63)
     6 – 16         → 4 colonnes, 2 à 4 lignes
     17 – 25        → 5 colonnes, 4 à 5 lignes
     26 +           → 25 lettres, la suite en ·

   Lecture gauche → droite, haut → bas : le nom se LIT toujours. La dernière ligne est centrée. Le décalage
   de chaque lettre (±8 % de sa case) et les points des cases vides viennent du nom LUI-MÊME : même nom,
   même dessin, sur les quatre domaines — c'est l'empreinte du membre, jamais du hasard.
   Quantico n'a pas de chasse fixe : on MESURE (un étalon caché), jamais on ne devine.
   Les lettres sont dessinées à 24 px et mises à l'échelle : une position et une taille s'animent ensemble,
   en `transform` seul, donc sans reflow — c'est ce qui permet au nom de se reformer en UNE ligne sans coupure. */
window.TOTEHM_NOM = (() => {
  const BASE = 24, PAD = .09, MAX = 25;
  let etalon = null, cache = Object.create(null);

  function mesurer(txt){
    if (!txt) return 0;
    if (cache[txt] != null) return cache[txt];
    if (!etalon){
      etalon = document.createElement('span');
      etalon.setAttribute('aria-hidden', 'true');
      etalon.style.cssText = 'position:absolute;left:-9999px;top:0;white-space:pre;visibility:hidden;'
        + "font:400 " + BASE + "px 'Quantico',sans-serif;letter-spacing:.04em";
      document.body.appendChild(etalon);
    }
    etalon.textContent = txt;
    return (cache[txt] = etalon.getBoundingClientRect().width);
  }
  /* les polices arrivent après la première peinture : tout ce qui a été mesuré avant est faux */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { cache = Object.create(null); });

  function plan(nom){
    const tout = Array.from((nom || '').trim());
    if (!tout.length) return null;
    const L = tout.slice(0, MAX);
    if (tout.length > MAX) L[MAX - 1] = '·';
    const N = L.length;
    if (N <= 5) return { L, N, C:N, R:1, cells:L.map((c, i) => ({ c, col:i, row:0 })) };
    const C = Math.min(5, Math.max(4, Math.ceil(Math.sqrt(N))));
    const R = Math.ceil(N / C), reste = N - (R - 1) * C, dec = (C - reste) / 2, cells = [];
    for (let i = 0; i < N; i++){
      const row = Math.floor(i / C);
      cells.push({ c:L[i], col:(i % C) + (row === R - 1 ? dec : 0), row });
    }
    return { L, N, C, R, cells };
  }
  /* FNV-1a sur le nom : stable d'un domaine à l'autre, d'une session à l'autre */
  function bruit(nom, i){
    let h = 2166136261; const s = nom + '|' + i;
    for (let k = 0; k < s.length; k++){ h ^= s.charCodeAt(k); h = (h * 16777619) >>> 0; }
    return ((h % 1000) / 1000) - .5;
  }

  /* Peint le nom dans `hote` (un carré de `S` px, positionné). Rend la taille de lettre obtenue. */
  function poser(hote, nom, S, opt){
    const o = opt || {}, p = plan(nom);
    hote.textContent = '';
    hote.removeAttribute('data-nom');
    if (!p || !S) return 0;
    const pad = S * PAD, inner = S - 2 * pad, k = BASE / 100;
    let px, place;
    if (p.R === 1){
      px = Math.min(S * .34, inner / (mesurer(p.L.join('')) / BASE));
      let x = (S - mesurer(p.L.join('')) * px / BASE) / 2;
      place = (c) => { const r = [x, S / 2 - px * .36]; x += mesurer(c) * px / BASE; return r; };
    } else {
      const cw = inner / p.C, ch = inner / p.R;
      let large = 0; for (const c of p.L) large = Math.max(large, mesurer(c));
      px = Math.min(cw * .94 / (large / BASE), ch * .94);
      place = (c, i) => {
        const k2 = p.cells[i];
        const cx = pad + (k2.col + .5) * cw + bruit(nom, i) * cw * .16;
        const cy = pad + (k2.row + .5) * ch + bruit(nom, i + 99) * ch * .16;
        return [cx - mesurer(c) * px / BASE / 2, cy - px * .36];
      };
    }
    const e = px / BASE;
    p.L.forEach((c, i) => {
      const [x, y] = place(c, i);
      const el = document.createElement('span');
      el.className = 'tn-l'; el.textContent = c;
      el.dataset.gx = x.toFixed(2); el.dataset.gy = y.toFixed(2); el.dataset.gs = e.toFixed(4);
      el.style.transform = 'translate(' + el.dataset.gx + 'px,' + el.dataset.gy + 'px) scale(' + el.dataset.gs + ')';
      hote.appendChild(el);
    });
    /* les cases vides : la trame se voit, comme les trous d'une carte perforée */
    if (p.R > 1 && o.vides !== false){
      const cw = inner / p.C, ch = inner / p.R, pris = {};
      p.cells.forEach(k2 => { pris[k2.row + ':' + Math.round(k2.col * 2)] = 1; });
      for (let r = 0; r < p.R; r++) for (let c = 0; c < p.C; c++){
        if (pris[r + ':' + (c * 2)] || pris[r + ':' + (c * 2 + 1)]) continue;
        const d = document.createElement('i');
        d.className = 'tn-v';
        d.style.left = (pad + (c + .5) * cw).toFixed(2) + 'px';
        d.style.top = (pad + (r + .5) * ch).toFixed(2) + 'px';
        hote.appendChild(d);
      }
    }
    hote.setAttribute('data-nom', nom);
    return px;
  }

  /* LE RETOUR À LA LIGNE — les MÊMES lettres glissent de leur case vers `cibles` (une position par lettre,
     en px dans le repère de l'hôte) : aucune n'apparaît, aucune ne disparaît. Sans cibles, elles rentrent
     dans leur case. C'est ce qui fait du nom reformé une TRANSFORMATION et non un autre écran. */
  function ligner(hote, cibles){
    const lts = hote.querySelectorAll('.tn-l');
    hote.classList.toggle('is-ligne', !!cibles);
    lts.forEach((el, i) => {
      const t = cibles && cibles[i];
      el.style.transform = t
        ? 'translate(' + t.x.toFixed(2) + 'px,' + t.y.toFixed(2) + 'px) scale(' + (t.s).toFixed(4) + ')'
        : 'translate(' + el.dataset.gx + 'px,' + el.dataset.gy + 'px) scale(' + el.dataset.gs + ')';
    });
  }
  return { poser, ligner, plan, mesurer, BASE };
})();
