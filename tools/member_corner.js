/* ══ LE COIN MEMBRE — copié de tools/member_corner.js dans chaque page (jamais importé) ══
   Le NOM d'un membre tient sur son papier : il RÉTRÉCIT (13 → 8 px sur une ligne, puis deux lignes jusqu'à 6 px),
   le papier ne change jamais. Mesuré, jamais deviné : à chaque nom posé, à chaque taille, une fois les polices là. */
(() => {
  const fit = el => {
    if (!el.classList.contains('is-in')) { el.style.removeProperty('--mc-fs'); delete el.dataset.mcLong; return; }
    if (!el.clientWidth) return;
    let fs = 13; delete el.dataset.mcLong; el.style.setProperty('--mc-fs', fs + 'px');
    while (fs > 8 && el.scrollWidth > el.clientWidth + .5) { fs -= .5; el.style.setProperty('--mc-fs', fs + 'px'); }
    if (el.scrollWidth > el.clientWidth + .5) {
      el.dataset.mcLong = '1';
      while (fs > 6 && el.scrollHeight > el.clientHeight + .5) { fs -= .5; el.style.setProperty('--mc-fs', fs + 'px'); }
    }
  };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(list => list.forEach(e => fit(e.target))) : null;
  const watch = el => {
    if (el.__mc) return; el.__mc = 1; fit(el); if (ro) ro.observe(el);
    new MutationObserver(() => fit(el)).observe(el, { childList:true, characterData:true, subtree:true, attributes:true, attributeFilter:['class'] });
  };
  const start = () => { document.querySelectorAll('.mc').forEach(watch); document.fonts?.ready?.then(() => document.querySelectorAll('.mc').forEach(fit)); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true }); else start();
})();
