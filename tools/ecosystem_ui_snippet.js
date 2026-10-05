/* 05/10/2026 — copied into each independent page; no runtime import. */
(() => {
  const roots = '.habit:not(.add):not(.filtre),.r-habit,.bx';
  const glass = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/></svg>';
  let sheet = null, previous = null, inert = [], overflow = '';
  function close() {
    if (!sheet) return;
    sheet.remove(); sheet = null;
    inert.forEach(([el, before]) => { if (el.isConnected) el.inert = before; }); inert = [];
    document.body.style.overflow = overflow; document.body.classList.remove('eco-modal');
    if (previous?.isConnected) previous.focus({preventScroll:true});
  }
  function open(content, title, source) {
    if (sheet) close();
    previous = source || document.activeElement; overflow = document.body.style.overflow;
    sheet = document.createElement('div'); sheet.className = 'eco-sheet'; sheet.setAttribute('role','dialog');
    sheet.setAttribute('aria-modal','true'); sheet.setAttribute('aria-label',title); sheet.tabIndex = -1;
    const card = document.createElement('section'); card.className = 'eco-card';
    const exit = document.createElement('button'); exit.type = 'button'; exit.className = 'eco-text-btn eco-close';
    exit.textContent = 'CLOSE'; exit.addEventListener('click',close);
    card.append(exit,content); sheet.append(card);
    inert = Array.from(document.body.children).filter(el => !['SCRIPT','STYLE'].includes(el.tagName)).map(el => [el,el.inert]);
    inert.forEach(([el]) => el.inert = true);
    document.body.append(sheet); document.body.style.overflow = 'hidden'; document.body.classList.add('eco-modal');
    sheet.addEventListener('click',e => { if (e.target === sheet) close(); }); exit.focus();
  }
  function zoom(box, source) {
    const copy = box.cloneNode(true); copy.classList.add('eco-box-copy'); copy.classList.remove('open','is-on');
    const sourceNodes = box.querySelectorAll('*'), copyNodes = copy.querySelectorAll('*');
    sourceNodes.forEach((el,i) => { if (getComputedStyle(el).display === 'none') copyNodes[i].remove(); });
    copy.querySelectorAll('[data-box-zoom],.w-x,.h-x,[data-kill],[data-x],.box-copy,.ro-copy,.pk-list,.pkw,.rk,.mini-x,.dash').forEach(el => el.remove());
    const originals = box.querySelectorAll('textarea,input');
    copy.querySelectorAll('textarea,input').forEach((el,i) => { const text = document.createElement('span'); text.className = 'v-name'; text.textContent = originals[i]?.value || ''; el.replaceWith(text); });
    [copy,...copy.querySelectorAll('*')].forEach(el => {
      for (const attr of Array.from(el.attributes)) if (/^(id|name|for|data-|on|tabindex|contenteditable|autofocus)/.test(attr.name)) el.removeAttribute(attr.name);
      el.removeAttribute('role'); el.style.removeProperty('height'); el.style.removeProperty('max-height');
    });
    copy.querySelectorAll('button,a,select').forEach(el => { const span = document.createElement('span'); span.className = el.className; span.innerHTML = el.innerHTML; el.replaceWith(span); });
    open(copy,'Enlarged TOTEHM box',source);
  }
  function enhance(scope) {
    if (!(scope instanceof Element) || scope.closest('.eco-sheet')) return;
    const parentBox = scope.closest(roots);
    const boxes = [...(parentBox ? [parentBox] : []),...scope.querySelectorAll(roots)];
    boxes.forEach(box => {
      if (box.closest('.eco-sheet') || box.querySelector('[data-box-zoom]')) return;
      const text = box.querySelector('.v-name,.h-text,.r-text,.nm')?.textContent?.trim() || box.querySelector('textarea')?.value?.trim();
      if (!text) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'eco-box-zoom'; b.dataset.boxZoom = '1';
      b.setAttribute('aria-label','Enlarge this box'); b.innerHTML = glass; box.append(b);
    });
    const buttonSelector = 'button,a.m-it,a.mw-link,a.btn-sig,a.btn,a.ro-action';
    const parentButton = scope.closest(buttonSelector);
    const buttons = [...(parentButton ? [parentButton] : []),...scope.querySelectorAll(buttonSelector)];
    buttons.forEach(b => {
      if (b.closest('#joy,#totehm-paper,.eco-sheet') || b.matches('.pick-habit,.h-T,.h-Ti,.h-x,.w-x,.cur,.eco-box-zoom,.mini-toggle,.rk-a')) return;
      const text = b.textContent.trim(); if (!text || /^[×+−\-↑↓←→↔↕✕✖?°\d\s]+$/.test(text)) return;
      if (/^sign\s*in\b/i.test(text)) {
        const leaf = b.querySelector('#member-txt,#conn-txt') || b;
        leaf.textContent = 'CONNECT WITH MY TOTEHM'; b.classList.add('eco-connect');
      } else if (text !== 'CONNECT WITH MY TOTEHM') b.classList.remove('eco-connect');
      if (b.textContent.trim() === 'CONNECT WITH MY TOTEHM') b.classList.add('eco-connect');
      b.classList.add('eco-text-btn');
    });
    if (document.body.dataset.ecoAuth === 'central') {
      for (const input of scope.querySelectorAll('#mw-email,#in-email,#pt-email')) {
        if (input.parentElement.querySelector('[data-eco-connect]')) continue;
        const b = document.createElement('button'); b.type = 'button'; b.dataset.ecoConnect = '1';
        b.className = 'eco-text-btn eco-connect'; b.textContent = 'CONNECT WITH MY TOTEHM'; input.before(b);
      }
    }
  }
  document.addEventListener('click',e => {
    const zoomButton = e.target.closest?.('[data-box-zoom]');
    if (zoomButton) { e.preventDefault(); e.stopImmediatePropagation(); const box = zoomButton.closest(roots); if (box) zoom(box,zoomButton); return; }
    const definition = e.target.closest?.('[data-space-about]');
    if (definition) { e.preventDefault(); e.stopImmediatePropagation(); const content = document.querySelector('#space-definition')?.content?.cloneNode(true); if (content) open(content,'What is a space?',definition); }
  },true);
  document.addEventListener('keydown',e => {
    if (!sheet) return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') {
      const list = [...sheet.querySelectorAll('button,a[href],input,textarea,select,[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = list[0], last = list.at(-1);
      if (!first) { e.preventDefault(); sheet.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  },true);
  for (const name of ['pointerdown','touchstart','touchmove','touchend','wheel']) document.addEventListener(name,e => { if (sheet) e.stopImmediatePropagation(); },{capture:true,passive:true});
  const start = () => {
    enhance(document.body);
    new MutationObserver(records => {
      const scopes = new Set();
      for (const r of records) {
        if (r.target instanceof Element && !r.target.closest('.eco-sheet')) scopes.add(r.target);
        for (const node of r.addedNodes) if (node instanceof Element) scopes.add(node);
      }
      scopes.forEach(enhance);
    }).observe(document.body,{childList:true,subtree:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
