/* ══ LE MOT TOTEHM EST LE TOTEHM — copié de tools/totehm_word.js dans chaque page (jamais importé) ══
   Wah (12/11) : « à chaque fois qu'il y a le mot totehm, mettre le TOTEHM recto-verso rotatif, recto le
   logo, verso le nom du TOTEHM de l'utilisateur, dont la grandeur s'adapte au texte — dans tous les
   textes des 4 plateformes ». Le mot n'est donc plus écrit : il est la PIÈCE, celle du coin membre
   (`tools/member_corner.*`) à la taille du texte qui la porte. Règle n° 1 : rien n'est réinterprété.

   CE QUI NE CHANGE PAS : le mot reste dans le document, hors écran (`.tw-s`) — la page se lit à la voix,
   se cherche au clavier, et un test qui lit `textContent` trouve le même texte qu'avant.
   CE QUI N'EST JAMAIS TOUCHÉ : ce que le membre a ÉCRIT (une box, une mini-box, son nom, un champ), une
   adresse (`totehm.com`, `www.totehm.space`), un mot qui continue (`TOTEHMIZE`), et tout nœud marqué
   `data-notw`. Un domaine se reconnaît à ce qui suit : un point SUIVI d'une lettre.
   UNE SEULE BOUCLE pour toute la page : l'angle est une variable CSS de `:root` (`--tw-th`) ; vingt
   pièces coûtent vingt transformations de GPU, pas vingt boucles. Elle s'arrête sans pièce, sans nom,
   onglet caché, ou en mouvement réduit (la pièce est alors posée sur son verso, le nom lisible).
   La taille vient de la POLICE héritée (`getComputedStyle`), jamais de `clientWidth` : mesurer la boîte
   forcerait un calcul de mise en page à chaque peinture de la liste du Totehm. */
window.TOTEHM_MOT = (() => {
  const MOT = 'TOTEHM', NM = MOT.length, K = 1.12;      /* K = la taille de la pièce, en em (CSS) */
  const SAUT = /^(SCRIPT|STYLE|TITLE|TEXTAREA|INPUT|SELECT|OPTION|CODE|PRE|NOSCRIPT|IFRAME|CANVAS|VIDEO|AUDIO|IMG|SVG)$/;
  /* les classes de ce que le MEMBRE a écrit, et celles de la pièce elle-même */
  const CL = ['tw', 'v-name', 'v-int', 'mini', 'mini-t', 'mi', 'nm', 'tn-l', 'mc', 'sl-name', 'ms-w', 'ns-mot'];
  const RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches:false };
  const diag = { mots:0, pieces:0, passes:0, nom:'' };
  const cache = new Map();
  let nom = '', neuves = [], vivantes = new Set(), rafP = 0, raf = 0, th = 180, om = 0, last = 0, tmr = 0, aFaire = [];

  /* ── où le mot se trouve dans un texte ───────────────────────────────── */
  function places(s){
    const u = s.toUpperCase(), out = [];
    for(let i = 0;;){
      const a = u.indexOf(MOT, i); if(a < 0) break;
      const b = a + NM; i = b;
      if(a > 0 && /[\w/@.\-]/.test(s[a - 1])) continue;        /* www.totehm · /@totehm · un mot collé */
      const ap = s.slice(b, b + 2);
      if(/^[\w\-]/.test(ap)) continue;                          /* TOTEHMIZE · totehm-link */
      if(/^\.[A-Za-z]/.test(ap)) continue;                      /* totehm.com · totehm.space */
      out.push(a);
    }
    return out;
  }
  /* ── ce qu'on ne traverse jamais ─────────────────────────────────────── */
  function saute(el){
    if(!el || el.nodeType !== 1) return false;
    if(el.namespaceURI && el.namespaceURI !== 'http://www.w3.org/1999/xhtml') return true;
    if(SAUT.test(el.tagName)) return true;
    if(el.isContentEditable || el.hasAttribute('contenteditable')) return true;
    if(el.hasAttribute('data-notw') || el.hasAttribute('data-nom') || el.hasAttribute('data-edit')) return true;
    if(el.id === 'member-txt' || el.id === 'ast-name') return true;
    const c = el.classList;
    for(let i = 0; i < CL.length; i++) if(c.contains(CL[i])) return true;
    return false;
  }
  const interdit = n => { for(let e = n.parentNode; e && e.nodeType === 1; e = e.parentNode) if(saute(e)) return true; return false; };

  /* ── la pièce ────────────────────────────────────────────────────────── */
  function piece(mot){
    const s = document.createElement('span');
    s.className = 'tw';
    s.innerHTML = '<span class="tw-s">' + mot + '</span><span class="tw-p" aria-hidden="true">'
      + '<span class="tw-f tw-r"></span><span class="tw-f tw-b"></span></span>';
    diag.pieces++;
    return s;
  }
  function remplacer(t){
    const s = t.nodeValue;
    if(!s || s.length < NM || !t.parentNode) return;
    const occ = places(s); if(!occ.length) return;
    const frag = document.createDocumentFragment();
    let k = 0;
    for(const a of occ){
      if(a > k) frag.appendChild(document.createTextNode(s.slice(k, a)));
      const p = piece(s.substr(a, NM));
      frag.appendChild(p); neuves.push(p); vivantes.add(p);
      k = a + NM;
    }
    if(k < s.length) frag.appendChild(document.createTextNode(s.slice(k)));
    t.parentNode.replaceChild(frag, t);
    diag.mots += occ.length;
    planifier();
  }
  function parcourir(n){
    if(!n) return;
    if(n.nodeType === 3) return remplacer(n);
    if(n.nodeType !== 1 || saute(n)) return;
    const kids = n.childNodes, l = [];
    for(let i = 0; i < kids.length; i++) l.push(kids[i]);
    for(const k of l){ if(k.nodeType === 3) remplacer(k); else if(k.nodeType === 1) parcourir(k); }
  }

  /* ── le verso : le nom, par la nomenclature du TOTEHM ────────────────── */
  function dessinNom(S){
    const cle = nom + '|' + Math.round(S);
    let h = cache.get(cle);
    if(h != null) return h;
    const tmp = document.createElement('span');
    if(window.TOTEHM_NOM) window.TOTEHM_NOM.poser(tmp, nom, S);
    else {
      /* sans la nomenclature dans la page : une ligne, ajustée, jamais une devinette de grille */
      const l = Array.from(nom).slice(0, 16), px = Math.max(3, Math.min(S * .34, S * .82 / Math.max(1, l.length * .62)));
      const e = document.createElement('span');
      e.className = 'tn-l'; e.textContent = l.join('');
      e.style.cssText = 'left:50%;top:50%;transform-origin:50% 50%;transform:translate(-50%,-50%) scale(' + (px / 24).toFixed(4) + ')';
      tmp.appendChild(e);
    }
    /* ⚠️ LA LETTRE N'EST PAS DU TEXTE DU DOCUMENT · 12/11. Posée en nœud de texte, elle entrait dans le
       `textContent` de la phrase : « your TOTEHMwah Habit… ». Elle passe donc en `data-c` et c'est le CSS
       qui la dessine (`content:attr(data-c)`) — un contenu généré ne compte dans aucun `textContent`, ni
       dans une recherche de page, ni dans un test. Le mot hors écran (`.tw-s`) reste le seul texte. */
    tmp.querySelectorAll('.tn-l').forEach(e => { e.setAttribute('data-c', e.textContent || ''); e.textContent = ''; });
    h = tmp.innerHTML;
    if(cache.size > 40) cache.clear();
    cache.set(cle, h);
    return h;
  }
  function habiller(el, S){
    const dos = el.querySelector('.tw-b'); if(!dos) return;
    el.classList.toggle('is-plat', !nom);
    if(!nom || !S){ if(dos.firstChild) dos.textContent = ''; dos.removeAttribute('data-vu'); return; }
    const cle = nom + '|' + Math.round(S);
    if(dos.getAttribute('data-vu') === cle) return;
    dos.innerHTML = dessinNom(S);
    dos.setAttribute('data-vu', cle);
  }
  function planifier(){ if(!rafP) rafP = requestAnimationFrame(poser); }
  function poser(){
    rafP = 0;
    const l = neuves; neuves = [];
    if(!l.length){ relancer(); return; }
    /* les tailles d'abord (calcul de style), les écritures ensuite : jamais entrelacées */
    const t = l.map(e => e.isConnected ? parseFloat(getComputedStyle(e).fontSize) * K || 0 : 0);
    l.forEach((e, i) => { if(t[i]) habiller(e, t[i]); });
    diag.passes++; relancer();
  }

  /* ── la rotation, une pour toute la page ─────────────────────────────── */
  function boucle(now){
    raf = 0;
    const dt = Math.min(.05, Math.max(0, (now - (last || now)) / 1000)); last = now;
    const s = Math.sin(th * Math.PI / 180), nat = 22 * (.34 + .66 * s * s);   /* 22°/s de face : ~24 s le tour */
    om += (nat - om) * (1 - Math.exp(-dt / 1.6));
    th += om * dt; if(th > 3600) th %= 360;
    document.documentElement.style.setProperty('--tw-th', th.toFixed(2) + 'deg');
    if(vif()) raf = requestAnimationFrame(boucle);
  }
  const vif = () => !!nom && !document.hidden && !RM.matches && vivantes.size > 0;
  function relancer(){
    for(const p of vivantes) if(!p.isConnected) vivantes.delete(p);
    if(!raf && vif()){ last = 0; raf = requestAnimationFrame(boucle); }
  }
  document.addEventListener('visibilitychange', relancer);

  /* ── le nom : la page peut le dire, sinon il se trouve tout seul ─────── */
  /* ⚠️ LE NOM NE SE LIT QUE SUR UN COIN CONNECTÉ · 12/11, mesuré EN PRODUCTION sur figher.club.
     `#member-txt` existe aussi DÉCONNECTÉ : il porte alors le libellé du bouton, et le verso de chaque
     pièce affichait « CONNECT WITH MY TOTEHM ». La marque `is-in` (posée par la page quand le membre est
     là) est donc la condition, et on lit le nom comme `member_corner.js` : `#member-txt`, sinon le texte
     écrit à même le bouton, sinon son dernier enfant. Sans coin connecté : `#ast-name` (com), puis un
     `[data-nom]`, que seule la nomenclature pose — et jamais un libellé. */
  function trouver(){
    const mc = document.querySelector('.mc.is-in');
    if(mc){
      const t = mc.querySelector('#member-txt');
      let v = t ? (t.textContent || '').trim() : '';
      if(!v){ for(const n of mc.childNodes) if(n.nodeType === 3) v += n.nodeValue; v = v.trim(); }
      if(!v){ const d = mc.querySelector(':scope > span:not(.mcp)'); v = d ? (d.textContent || '').trim() : ''; }
      if(v) return v;
    }
    const a = document.getElementById('ast-name');
    if(a && (a.textContent || '').trim()) return (a.textContent || '').trim();
    const g = document.querySelector('[data-nom]');
    if(g && (g.getAttribute('data-nom') || '').trim()) return (g.getAttribute('data-nom') || '').trim();
    return '';
  }
  function setNom(n){
    const v = String(n || '').trim();
    if(v === nom) return;
    nom = v; diag.nom = v; cache.clear();
    for(const p of vivantes){ if(!p.isConnected){ vivantes.delete(p); continue; }
      const d = p.querySelector('.tw-b'); if(d) d.removeAttribute('data-vu');
      neuves.push(p); }
    planifier();
  }

  /* ── les textes qui arrivent après : un seul observateur, amorti ─────── */
  function vider(){
    tmr = 0;
    const l = aFaire; aFaire = [];
    for(const n of l){ if(!n.isConnected || interdit(n)) continue; parcourir(n); }
    setNom(trouver());
  }
  function observer(){
    if(typeof MutationObserver !== 'function') return;
    new MutationObserver(list => {
      for(const m of list){
        if(m.type === 'childList'){ for(const n of m.addedNodes) if(n.nodeType === 1 || n.nodeType === 3) aFaire.push(n); }
        else if(m.target) aFaire.push(m.target);
      }
      if(aFaire.length && !tmr) tmr = setTimeout(vider, 60);
    }).observe(document.body, { childList:true, subtree:true, characterData:true });
  }
  function demarrer(){
    if(!document.body) return;
    parcourir(document.body);
    setNom(trouver());
    observer();
    document.fonts?.ready?.then(() => {                       /* mesuré avant la vraie police = faux */
      cache.clear();
      for(const p of vivantes){ const d = p.querySelector('.tw-b'); if(d) d.removeAttribute('data-vu'); neuves.push(p); }
      planifier();
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer, { once:true }); else demarrer();
  const api = { scan:parcourir, setNom, nom:() => nom,
                etat:() => Object.assign({ vivantes:vivantes.size, tourne:!!raf }, diag) };
  window.__totehm_mot = api.etat;
  return api;
})();
/* ══ fin LE MOT TOTEHM ══ */
