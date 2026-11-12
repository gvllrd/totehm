/* ══ LE COIN MEMBRE — copié de tools/member_corner.js dans chaque page (jamais importé) ══
   Connecté, le coin membre EST le TOTEHM : une seule pièce de papier qui tourne, recto le logo plein,
   verso le nom (Wah : « ce totehm recto-verso en une pièce qui tourne »). Le nom prend tout le carré du
   verso, par `tools/totehm_name.js` — ce bloc exige donc que la nomenclature soit copiée AVANT lui.
   La page ne change pas : elle pose `is-in` et écrit le nom dans `#member-txt`, comme avant.
   Elle tourne LENTEMENT (un tour en ~24 s), plus vite de profil que de face : une feuille qui pivote,
   pas un carrousel. Elle s'arrête quand l'onglet est caché ; mouvement réduit = la pièce est posée sur
   son verso, le nom lisible. Une seule boucle pour toute la page. */
(() => {
  const RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches:false };
  const R = Math.PI / 180, W0 = 22;                 /* 22°/s de face : le tour moyen fait ~24 s */
  const LUM = (() => { const x = -.35, y = -.55, z = 1, n = Math.hypot(x, y, z); return [x / n, y / n, z / n]; })();
  const vivantes = [];
  let raf = 0, last = 0;

  function boucle(now){
    raf = 0;
    const dt = Math.min(.05, Math.max(0, (now - (last || now)) / 1000)); last = now;
    for (const p of vivantes){
      const s = Math.sin(p.th * R), nat = W0 * (.34 + .66 * s * s);
      p.om += (nat - p.om) * (1 - Math.exp(-dt / 1.6));
      p.th += p.om * dt;
      if (p.th > 3600) p.th %= 360;
      peindre(p);
    }
    if (vivantes.length && !document.hidden) raf = requestAnimationFrame(boucle);
  }
  function relancer(){ if (!raf && vivantes.length && !document.hidden && !RM.matches){ last = 0; raf = requestAnimationFrame(boucle); } }
  document.addEventListener('visibilitychange', relancer);

  function peindre(p){
    p.card.style.transform = 'rotateY(' + p.th.toFixed(2) + 'deg)';
    /* la normale de la face, passée par la rotation : elle dit ce que chaque côté prend de lumière */
    const d = (Math.sin(p.th * R) * LUM[0] + Math.cos(p.th * R) * LUM[2]) / LUM[2];
    eclairer(p.lr, d); eclairer(p.lb, -d);
  }
  /* la formule du papier d'origine : la face qui se détourne s'ASSOMBRIT, celle qui se tourne vers la
     lumière prend un souffle (jamais une ombre portée — BRAND : aucune ombre) */
  function eclairer(el, f){
    if (!el || f <= 0) return;
    if (f < 1){ el.style.background = '#000'; el.style.opacity = Math.min(.5, (1 - f) * .6).toFixed(3); }
    else      { el.style.background = '#fff'; el.style.opacity = Math.min(.06, (f - 1) * .3).toFixed(3); }
  }

  /* ⚠️ Le nom se lit SANS la pièce : elle vit dans le bouton, et ses lettres feraient un nom qui se
     recopie lui-même. Les pages qui n'ont pas de `#member-txt` écrivent le nom à même le bouton. */
  const nomDe = el => {
    const t = el.querySelector('#member-txt');
    if (t) return (t.textContent || '').trim();
    let s = '';
    for (const n of el.childNodes) if (n.nodeType === 3) s += n.nodeValue;   /* le nom écrit à même le bouton */
    if ((s = s.trim())) return s;
    const d = el.querySelector(':scope > span:not(.mcp)');
    return d ? (d.textContent || '').trim() : '';
  };

  function batir(el){
    let card = el.querySelector('.mcp');
    if (card) return card;
    card = document.createElement('span'); card.className = 'mcp'; card.setAttribute('aria-hidden', 'true');
    const r = document.createElement('span'); r.className = 'mcp-f mcp-r';
    const b = document.createElement('span'); b.className = 'mcp-f mcp-b';
    const lr = document.createElement('i'); lr.className = 'mcp-l';
    const lb = document.createElement('i'); lb.className = 'mcp-l';
    r.appendChild(lr); b.appendChild(lb);
    card.appendChild(r); card.appendChild(b);
    el.appendChild(card);
    return card;
  }

  function fit(el){
    const dedans = el.classList.contains('is-in');
    const p = el.__mcp;
    if (!dedans){
      if (p){ const i = vivantes.indexOf(p); if (i >= 0) vivantes.splice(i, 1); p.card.remove(); el.__mcp = null; }
      return;
    }
    const nom = nomDe(el), S = el.clientWidth;
    if (!S || !window.TOTEHM_NOM) return;
    const card = batir(el);
    const dos = card.querySelector('.mcp-b');
    if (dos.getAttribute('data-nom') !== nom) window.TOTEHM_NOM.poser(dos, nom, S);
    if (nom) el.setAttribute('aria-label', nom + ' — my TOTEHM on totehm.com');
    if (!el.__mcp){
      /* elle commence sur son VERSO : le nom d'abord, le logo ensuite */
      el.__mcp = { card, th:180, om:0, lr:card.querySelector('.mcp-r .mcp-l'), lb:card.querySelector('.mcp-b .mcp-l') };
      if (RM.matches){ peindre(el.__mcp); return; }
      vivantes.push(el.__mcp); relancer();
    } else if (el.__mcp.card !== card){
      /* ⚠️ la page qui réécrit le nom par `textContent` EFFACE la pièce : `batir` en refait une, et le
         moteur doit suivre la nouvelle, sinon il peint un nœud détaché et la pièce reste immobile. */
      el.__mcp.card = card;
      el.__mcp.lr = card.querySelector('.mcp-r .mcp-l');
      el.__mcp.lb = card.querySelector('.mcp-b .mcp-l');
      peindre(el.__mcp); relancer();
    }
  }

  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(list => list.forEach(e => fit(e.target))) : null;
  const watch = el => {
    if (el.__mc) return; el.__mc = 1; fit(el); if (ro) ro.observe(el);
    new MutationObserver(() => fit(el)).observe(el, { childList:true, characterData:true, subtree:true, attributes:true, attributeFilter:['class'] });
  };
  const start = () => {
    document.querySelectorAll('.mc').forEach(watch);
    document.fonts?.ready?.then(() => document.querySelectorAll('.mc').forEach(el => {
      const d = el.querySelector('.mcp-b'); if (d) d.removeAttribute('data-nom');   /* mesuré avec la vraie police */
      fit(el);
    }));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true }); else start();
})();
