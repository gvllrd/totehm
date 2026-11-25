/* ══ DISCOVER — copié de tools/discover.js dans chaque page (jamais importé) ══
   Le moteur du « découvrir » : des écrans `.dc-s` dans `.dc-stage`, UN visible à la fois, qui se succèdent au scroll, au
   geste (glisser vers le haut), au clavier (↓ ↑ Page Espace) ou au chevron — comme totehm.space/play_lisbon_street?discover=1.
   Il ne connaît NI le contenu NI la page : `monter(hote)` lit les écrans qui s'y trouvent, et `rafraichir()` les relit
   quand la page les a redessinés. Le dernier écran est celui qui AGIT (un bouton) : le chevron s'efface.
   Un champ, un bouton ou un lien dans un écran garde ses touches (Espace, Entrée) : le moteur ne les vole jamais. */
window.TOTEHM_DISCOVER = (() => {
  const FADE = 520, VERROU = FADE + 160, SEUIL_ROUE = 36, SEUIL_DOIGT = 44;
  const RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches:false };
  const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const ACTIF = 'input,textarea,select,button,a,[contenteditable]';
  function monter(hote, opt){
    const o = Object.assign({ surChangement:null }, opt || {});
    let i = 0, ecrans = [], verrou = 0, cumul = 0, tCumul = 0, y0 = null, actif = true, tEtape = 0, frappeSeq = 0;
    const stage = hote.querySelector('.dc-stage'), rail = document.createElement('div'), next = document.createElement('button');
    rail.className = 'dc-rail'; rail.setAttribute('aria-hidden', 'true');
    next.className = 'dc-next'; next.type = 'button'; next.setAttribute('aria-label', 'Next'); next.innerHTML = CHEVRON;
    hote.append(rail, next);
    /* L'ILLUSTRATION tient dans son CADRE (`.dc-ill`) : son contenu passe dans `.dc-ill-in`, que le moteur RÉDUIT (largeur
       ou hauteur) au rendu, à chaque écran et à chaque changement de taille — jamais rogné. */
    function envelopper(){ hote.querySelectorAll('.dc-ill,.dc-o').forEach(f => { if(f.querySelector(':scope>.dc-ill-in')) return;
      const n = document.createElement('div'); n.className = 'dc-ill-in'; while(f.firstChild) n.appendChild(f.firstChild); f.appendChild(n); }); }
    /* L'objet se pose sur le `.dc-ill` de l'écran ACTIF, lu en mise en page (`offset*`) : les écrans se centrent
       (25/11) et n'ont pas tous la même hauteur, donc la place de l'objet se MESURE au lieu de se calculer. */
    function cadre(){
      const e = ecrans[i], f = e && e.querySelector('.dc-ill'), h = hote.querySelector('.dc-hero');
      if(!f || !h || !f.offsetWidth) return;
      const v = [[ '--dc-hero-t', e.offsetTop + f.offsetTop ], [ '--dc-hero-l', e.offsetLeft + f.offsetLeft ],
                 [ '--dc-hero-w', f.offsetWidth ], [ '--dc-hero-h', f.offsetHeight ]];
      for(const [k, n] of v) hote.style.setProperty(k, n + 'px');
    }
    function ajuster(){ cadre(); hote.querySelectorAll('.dc-ill-in').forEach(n => { const f = n.parentNode, H = f.clientHeight, W = f.clientWidth; if(!H || !W) return;
      const k = Math.min(1, H / Math.max(1, n.offsetHeight), W / Math.max(1, n.scrollWidth));
      const v = k < .999 ? 'scale(' + k.toFixed(3) + ')' : ''; if(n.style.transform !== v) n.style.transform = v; }); }
    function lire(){ ecrans = [...stage.querySelectorAll('.dc-s')]; rail.innerHTML = ecrans.map(() => '<span></span>').join(''); envelopper(); }
    /* L'OBJET QUI VOYAGE (`.dc-o` dans `.dc-hero`) : il dit les écrans où il VIT (`data-o="0 1 2"`) et le moteur
       l'allume sur ceux-là. Entre deux de ses écrans il ne s'éteint jamais : il reste là et la page le transforme
       (elle lit `data-i` sur l'hôte). C'est la continuité : un objet ne disparaît pas pour réapparaître. */
    function objets(){ hote.querySelectorAll('.dc-o').forEach(n => {
      const ou = (n.dataset.o || '').trim().split(/\s+/);
      n.classList.toggle('is-on', ou.includes(String(i))); }); }
    /* LA LIGNE FRAPPÉE (`.dc-tw`) : l'écran qui arrive écrit sa phrase à la machine, UNE fois. Revenir en arrière ne la
       réécrit pas (on la lit, on ne l'attend pas) ; rouvrir le Discover depuis le premier écran, si (`remettre`). */
    function frapper(fin){
      const e = ecrans[i], n = e && e.querySelector('.dc-tw');
      if(!n){ if(fin) fin(); return; }
      if(n.dataset.frappe){ if(fin) fin(); return; }
      const txt = n.dataset.txt || (n.dataset.txt = n.textContent.trim());
      n.dataset.frappe = '1';
      if(RM.matches){ n.textContent = txt; if(fin) fin(); return; }
      const mien = ++frappeSeq;
      n.textContent = ''; n.classList.add('is-frappe');
      (function pas(k){
        if(!n.isConnected || mien !== frappeSeq) return;
        n.textContent = txt.slice(0, k);
        if(k < txt.length){ setTimeout(() => pas(k + 1), 21 + Math.random() * 17); return; }
        n.classList.remove('is-frappe'); if(fin) fin(); })(1);
    }
    /* L'ORDRE (Wah, 25/11) : la phrase se frappe (0), PUIS l'objet l'illustre (1), PUIS le tiroir et la porte (2). */
    function etapes(){
      clearTimeout(tEtape);
      const pose = k => { if(hote.dataset.etape !== String(k)) hote.dataset.etape = k; };
      if(RM.matches){ pose(2); frapper(); return; }
      pose(0);
      frapper(() => { if(!hote.isConnected) return; pose(1);
        tEtape = setTimeout(() => pose(2), 820); });
    }
    /* LE TIROIR : un seul écouteur sur l'hôte ; changer d'écran referme ce qui était ouvert. */
    function tiroirs(ferme){ hote.querySelectorAll('.dc-deep').forEach(b => {
      if(ferme || b.getAttribute('aria-expanded') === null) b.setAttribute('aria-expanded', 'false'); }); }
    function remettre(){ hote.querySelectorAll('.dc-tw').forEach(n => { delete n.dataset.frappe;
      if(n.dataset.txt) n.textContent = n.dataset.txt; }); }
    function peindre(instant){
      ecrans.forEach((e, k) => { const on = k === i; e.classList.toggle('is-on', on); e.classList.toggle('is-avant', k < i); e.setAttribute('aria-hidden', String(!on));
        if(instant) e.style.transition = 'none'; else e.style.removeProperty('transition'); });
      if(instant) void hote.offsetWidth;
      rail.querySelectorAll('span').forEach((s, k) => s.classList.toggle('on', k === i));
      hote.classList.toggle('is-last', i >= ecrans.length - 1);
      hote.dataset.i = i; hote.dataset.n = ecrans.length;
      objets(); tiroirs(true);
      ajuster();
      etapes();
      if(o.surChangement) o.surChangement(i, ecrans.length);
    }
    function aller(k, instant){
      k = Math.max(0, Math.min(ecrans.length - 1, k)); if(k === i && !instant) return false;
      if(verrou && !instant) return false;
      if(k === 0 && instant) remettre();
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
      let pris = true;
      if(['ArrowDown', 'PageDown'].includes(e.key) && !champ) suivant();
      else if(['ArrowUp', 'PageUp'].includes(e.key) && !champ) precedent();
      else if(e.key === ' ' && !dans) suivant();
      else pris = false;
      /* une touche PRISE ne va pas plus loin : la page dessous (une couche par-dessus un accueil qui navigue aux flèches) ne bouge pas */
      if(pris){ e.preventDefault(); e.stopPropagation(); }
    }
    /* un seul écouteur, EN CAPTURE : une page qui arrête ses flèches en route (totehm.com le fait) ne les lui vole pas.
       Il n'écoute que si le moteur est visible, et que le focus est dedans ou nulle part. */
    window.addEventListener('keydown', e => { if(hote.isConnected && !hote.hidden && !hote.classList.contains('hide') && (hote.contains(e.target) || document.activeElement === document.body)) touche(e); }, true);
    next.addEventListener('click', suivant);
    hote.addEventListener('click', e => { const b = e.target.closest('.dc-deep'); if(!b || !hote.contains(b)) return;
      b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
      /* le tiroir change la hauteur de l'écran, donc son centrage : l'objet SUIT la place qui lui est réservée,
         image par image, le temps de l'ouverture — sinon il resterait en arrière et passerait sur le texte. */
      const fin = Date.now() + 560;
      (function suivre(){ cadre(); if(Date.now() < fin) requestAnimationFrame(suivre); })(); });
    window.addEventListener('resize', () => { if(hote.isConnected) requestAnimationFrame(ajuster); });
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(ajuster);
    lire(); peindre(true);
    return { aller, suivant, precedent, index:() => i, total:() => ecrans.length, etape:() => +(hote.dataset.etape || 0),
      derniere:() => aller(ecrans.length - 1, true),
      rafraichir(garder){ const k = garder ? i : 0; lire(); i = Math.min(k, Math.max(0, ecrans.length - 1)); peindre(true); },
      ajuster, activer(v){ actif = !!v; } };
  }
  return { monter };
})();
/* ══ fin DISCOVER ══ */
