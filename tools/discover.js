/* ══ DISCOVER — copié de tools/discover.js dans chaque page (jamais importé) ══
   Le moteur du « découvrir » : des écrans `.dc-s` dans `.dc-stage`, UN visible à la fois, qui se succèdent au scroll, au
   geste (glisser vers le haut), au clavier (↓ ↑ Page Espace) ou au chevron — comme totehm.space/play_lisbon_street?discover=1.
   Il ne connaît NI le contenu NI la page : `monter(hote)` lit les écrans qui s'y trouvent, et `rafraichir()` les relit
   quand la page les a redessinés. Le dernier écran est celui qui AGIT (un bouton) : la consigne et le chevron s'effacent.
   Un champ, un bouton ou un lien dans un écran garde ses touches (Espace, Entrée) : le moteur ne les vole jamais. */
window.TOTEHM_DISCOVER = (() => {
  const FADE = 520, VERROU = FADE + 160, SEUIL_ROUE = 36, SEUIL_DOIGT = 44;
  const RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches:false };
  const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const ACTIF = 'input,textarea,select,button,a,[contenteditable]';
  function monter(hote, opt){
    const o = Object.assign({ surChangement:null, consigne:null }, opt || {});
    let i = 0, ecrans = [], verrou = 0, cumul = 0, tCumul = 0, y0 = null, actif = true;
    const stage = hote.querySelector('.dc-stage'), prog = document.createElement('p'), rail = document.createElement('div'),
          hint = document.createElement('p'), next = document.createElement('button');
    prog.className = 'dc-progress'; prog.setAttribute('aria-live', 'polite'); rail.className = 'dc-rail'; rail.setAttribute('aria-hidden', 'true');
    hint.className = 'dc-hint'; next.className = 'dc-next'; next.type = 'button'; next.setAttribute('aria-label', 'Next'); next.innerHTML = CHEVRON;
    hote.append(prog, rail, hint, next);
    const doigt = () => !window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    function lire(){ ecrans = [...stage.querySelectorAll('.dc-s')]; rail.innerHTML = ecrans.map(() => '<span></span>').join(''); }
    function peindre(instant){
      ecrans.forEach((e, k) => { const on = k === i; e.classList.toggle('is-on', on); e.classList.toggle('is-avant', k < i); e.setAttribute('aria-hidden', String(!on));
        if(instant) e.style.transition = 'none'; else e.style.removeProperty('transition'); });
      if(instant) void hote.offsetWidth;
      rail.querySelectorAll('span').forEach((s, k) => s.classList.toggle('on', k === i));
      prog.textContent = ecrans.length > 1 ? (i + 1) + ' / ' + ecrans.length : '';
      hint.textContent = o.consigne || (doigt() ? 'Swipe up to discover ↑' : 'Scroll to discover ↓');
      hote.classList.toggle('is-last', i >= ecrans.length - 1);
      hote.dataset.i = i; hote.dataset.n = ecrans.length;
      if(o.surChangement) o.surChangement(i, ecrans.length);
    }
    function aller(k, instant){
      k = Math.max(0, Math.min(ecrans.length - 1, k)); if(k === i && !instant) return false;
      if(verrou && !instant) return false;
      i = k; peindre(instant || RM.matches);
      if(!instant && !RM.matches){ verrou = setTimeout(() => { verrou = 0; }, VERROU); }
      return true;
    }
    const suivant = () => aller(i + 1), precedent = () => aller(i - 1);
    /* la molette et le pavé tactile : un geste ET son inertie = UN écran (le verrou dure plus que le fondu) */
    hote.addEventListener('wheel', e => {
      if(!actif || e.target.closest('[data-dc-libre]')) return;
      const t = Date.now(); if(t - tCumul > 180) cumul = 0; tCumul = t; cumul += e.deltaY;
      if(Math.abs(cumul) >= SEUIL_ROUE){ const d = cumul > 0 ? 1 : -1; cumul = 0; aller(i + d); }
      e.preventDefault();
    }, { passive:false });
    hote.addEventListener('touchstart', e => { y0 = e.touches.length === 1 && !e.target.closest('input,textarea,select,[data-dc-libre]') ? e.touches[0].clientY : null; }, { passive:true });
    hote.addEventListener('touchmove', e => { if(y0 !== null) e.preventDefault(); }, { passive:false });
    hote.addEventListener('touchend', e => {
      if(y0 === null || !e.changedTouches.length) return; const dy = y0 - e.changedTouches[0].clientY; y0 = null;
      if(Math.abs(dy) >= SEUIL_DOIGT) aller(i + (dy > 0 ? 1 : -1));
    }, { passive:true });
    function touche(e){
      if(!actif) return; const dans = e.target.closest ? e.target.closest(ACTIF) : null, champ = dans && e.target.matches('input,textarea,select');
      if(['ArrowDown', 'PageDown'].includes(e.key) && !champ){ e.preventDefault(); suivant(); }
      else if(['ArrowUp', 'PageUp'].includes(e.key) && !champ){ e.preventDefault(); precedent(); }
      else if(e.key === ' ' && !dans){ e.preventDefault(); suivant(); }
    }
    /* un seul écouteur : sur la page, quand rien n'a le focus et que le moteur est visible ; dedans, il remonte jusqu'ici */
    window.addEventListener('keydown', e => { if(hote.isConnected && !hote.hidden && !hote.classList.contains('hide') && (hote.contains(e.target) || document.activeElement === document.body)) touche(e); });
    next.addEventListener('click', suivant);
    lire(); peindre(true);
    return { aller, suivant, precedent, index:() => i, total:() => ecrans.length,
      derniere:() => aller(ecrans.length - 1, true),
      rafraichir(garder){ const k = garder ? i : 0; lire(); i = Math.min(k, Math.max(0, ecrans.length - 1)); peindre(true); },
      activer(v){ actif = !!v; } };
  }
  return { monter };
})();
/* ══ fin DISCOVER ══ */
