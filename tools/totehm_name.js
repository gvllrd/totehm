/* ══ LA NOMENCLATURE DU VERSO — copié de tools/totehm_name.js dans chaque page (jamais importé) ══
   Le NOM d'un TOTEHM se pose sur son verso EN BLOC CARRÉ, mesuré, jamais en pleine page.
   ⚠️ 14/11 (Wah) : « les lettres par rapport au verso sont beaucoup trop grosses et c'est très moche. Je veux
   quelque chose de littéralement plus CARRÉ : un bloc de lettres carré, mais pas trop gros par rapport au
   verso. S'il n'y a pas assez de lettres, une ligne centrée ; s'il y en a beaucoup, un peu plus petites. »
   Le 12/11, le nom remplissait 91 % du carré : une ligne montait à 34 % du côté en lettres, un nom de 24
   lettres à 22 % — des lettres de 50 px sur un papier de 232. Trop. La règle, la même partout :

     1 – 5 lettres  → UNE LIGNE, centrée, lettres plafonnées à 20 % du côté
     6 – 25         → UN BLOC PARFAITEMENT CARRÉ, sur une GRILLE : on choisit le nombre de colonnes dont le bloc
                      naturel est le plus proche d'un carré (une lettre est plus haute que large), puis on
                      ÉTIRE les cases pour que le bloc soit exactement carré — chaque colonne et chaque ligne
                      a la même taille, chaque lettre est centrée dans sa case. Les cases laissées vides par la
                      dernière ligne sont des POINTS : le carré se lit même incomplet
     26 +           → 25 lettres, la suite en ·

   ⚠️ 14/11 (Wah : « parfaitement carré et ALIGNÉ ») : plus aucun décalage de lettre, plus de dernière ligne
   centrée de travers — lecture gauche → droite, haut → bas, tout tombe sur la grille. Le bloc tient dans 58 %
   du côté au plus : plus il y a de lettres, plus elles sont petites, et jamais plus de 20 % du côté.
   Quantico n'a pas de chasse fixe : on MESURE (un étalon caché), jamais on ne devine.
   Les lettres sont dessinées à 24 px et mises à l'échelle : une position et une taille s'animent ensemble,
   en `transform` seul, donc sans reflow — c'est ce qui permet au nom de se reformer en UNE ligne sans coupure. */
window.TOTEHM_NOM = (() => {
  const BASE = 24, MAX = 25, LIGNE = 5;                 /* au plus LIGNE lettres : une ligne */
  const BLOC = .58, CAP = .20;                          /* le bloc = 58 % du côté ; une lettre ≤ 20 % du côté */
  const CASE_W = 1.12, CASE_H = 1.18;                   /* la case d'une lettre, en em : un peu d'air, et la hauteur de ligne */
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

  /* Le nombre de colonnes qui fait le bloc le plus CARRÉ. `lw` = la largeur de la plus large lettre, en em.
     score = l'écart de forme (|ln(largeur/hauteur)|) + un peu de cases vides : à égalité, le bloc plein gagne. */
  function colonnes(N, lw){
    let meilleur = 1, score = Infinity;
    for (let C = 2; C <= N; C++){
      const R = Math.ceil(N / C), W = C * lw * CASE_W, H = R * CASE_H, vides = C * R - N;
      const sc = Math.abs(Math.log(W / H)) + .12 * vides / (C * R);
      if (sc < score - 1e-9){ score = sc; meilleur = C; }
    }
    return meilleur;
  }

  function plan(nom, lw){
    const tout = Array.from((nom || '').trim());
    if (!tout.length) return null;
    const L = tout.slice(0, MAX);
    if (tout.length > MAX) L[MAX - 1] = '·';
    const N = L.length;
    if (N <= LIGNE) return { L, N, C:N, R:1, cells:L.map((c, i) => ({ c, col:i, row:0 })) };
    const C = colonnes(N, lw || .66), R = Math.ceil(N / C), cells = [];
    for (let i = 0; i < N; i++) cells.push({ c:L[i], col:i % C, row:Math.floor(i / C) });
    return { L, N, C, R, cells };
  }
  /* Peint le nom dans `hote` (un carré de `S` px, positionné). Rend la taille de lettre obtenue. */
  function poser(hote, nom, S, opt){
    const o = opt || {};
    hote.textContent = '';
    hote.removeAttribute('data-nom');
    const tout = Array.from((nom || '').trim());
    if (!tout.length || !S) return 0;
    const L0 = tout.slice(0, MAX); if (tout.length > MAX) L0[MAX - 1] = '·';
    let large = 0; for (const c of L0) large = Math.max(large, mesurer(c));
    const lw = large / BASE, p = plan(nom, lw), cap = S * CAP, T = S * BLOC;
    let px, place, bw, bh;
    if (p.R === 1){
      const w = mesurer(p.L.join('')) / BASE;            /* la ligne entière, en em */
      px = Math.min(cap, T / w);
      bw = w * px; bh = px;
      let x = (S - bw) / 2;
      place = c => { const r = [x, S / 2 - px * .36]; x += mesurer(c) * px / BASE; return r; };
    } else {
      /* la taille de lettre : ce qui tient dans 58 % du côté, plafonné à 20 % ; PUIS le côté du bloc, exactement
         carré : il est le plus grand des deux côtés naturels, et les cases s'étirent à cette mesure. */
      const W = p.C * lw * CASE_W, H = p.R * CASE_H;
      px = Math.min(cap, T / W, T / H);
      const B = Math.max(W, H) * px;
      bw = B; bh = B;
      const cw = B / p.C, ch = B / p.R, x0 = (S - B) / 2, y0 = (S - B) / 2;
      place = (c, i) => {
        const k2 = p.cells[i];
        return [x0 + (k2.col + .5) * cw - mesurer(c) * px / BASE / 2, y0 + (k2.row + .5) * ch - px * .36];
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
    /* les cases vides du bloc : des POINTS, comme les trous d'une carte perforée — le carré se lit même incomplet */
    if (p.R > 1){
      const cw = bw / p.C, ch = bh / p.R, x0 = (S - bw) / 2, y0 = (S - bh) / 2;
      hote.dataset.cols = p.C; hote.dataset.rows = p.R; hote.dataset.bloc = bw.toFixed(2);
      if (o.vides !== false) for (let k = p.N; k < p.C * p.R; k++){
        const d = document.createElement('i');
        d.className = 'tn-v';
        d.style.left = (x0 + ((k % p.C) + .5) * cw).toFixed(2) + 'px';
        d.style.top = (y0 + (Math.floor(k / p.C) + .5) * ch).toFixed(2) + 'px';
        hote.appendChild(d);
      }
    } else { delete hote.dataset.cols; delete hote.dataset.rows; delete hote.dataset.bloc; }
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
