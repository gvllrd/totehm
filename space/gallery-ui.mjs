const rooms = [...document.querySelectorAll('.room')];
const nav = [...document.querySelectorAll('.tour [data-room]')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const info = document.getElementById('work-info');
let selected = -1, engine = null, fallback = false;
function select(index, updateHash = true) {
  selected = Math.max(0, Math.min(rooms.length - 1, index));
  document.body.classList.add('exploring');
  nav.forEach((a, i) => a.setAttribute('aria-current', String(i === selected)));
  const room = rooms[selected];
  document.getElementById('work-title').textContent = room.querySelector('.caption h1,.caption h2').textContent;
  document.getElementById('work-kind').textContent = room.querySelector('.caption p').textContent;
  document.getElementById('work-links').replaceChildren(...[...room.querySelectorAll('.room-actions a')].map(a => a.cloneNode(true)));
  info.classList.add('is-open');
  if (updateHash) history.replaceState(null, '', location.pathname + location.search + '#' + room.id);
  if (document.body.classList.contains('list-view') || fallback) room.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
  else engine?.visit(selected);
}
function overview() {
  selected = -1;
  document.body.classList.remove('exploring'); info.classList.remove('is-open');
  nav.forEach(a => a.setAttribute('aria-current', 'false'));
  history.replaceState(null, '', location.pathname + location.search);
  engine?.overview();
}
nav.forEach((a, i) => a.addEventListener('click', e => { e.preventDefault(); select(i); }));
document.getElementById('enter-gallery').addEventListener('click', () => select(0));
document.getElementById('overview').addEventListener('click', overview);
document.getElementById('close-info').addEventListener('click', () => info.classList.remove('is-open'));
document.getElementById('view-list').addEventListener('click', e => {
  const list = document.body.classList.toggle('list-view');
  e.currentTarget.textContent = list ? 'Visit in 3D' : 'Artworks';
  e.currentTarget.setAttribute('aria-pressed', String(list));
  engine?.setList(list);
});
document.querySelector('.skip').addEventListener('click', () => {
  document.body.classList.add('list-view'); engine?.setList(true);
});
const member = document.getElementById('member'), menu = document.getElementById('member-menu');
member.addEventListener('click', () => { const open = menu.classList.toggle('is-open'); member.setAttribute('aria-expanded', String(open)); });
document.addEventListener('pointerdown', e => { if (!e.target.closest('.member')) { menu.classList.remove('is-open'); member.setAttribute('aria-expanded', 'false'); } });
document.addEventListener('keydown', e => {
  if (e.target.closest('input,textarea,select,[contenteditable=true]')) return;
  if (e.key === 'Escape') {
    menu.classList.remove('is-open'); member.setAttribute('aria-expanded','false'); info.classList.remove('is-open');
  }
  if (e.key === 'PageDown' || e.key === 'PageUp') { e.preventDefault(); select((selected + (e.key==='PageDown'?1:-1) + rooms.length) % rooms.length); }
  if (e.key === 'Home') { e.preventDefault(); overview(); }
});
window.__totehm_gallery = () => ({build:'2026-10-15-space-immersive',rooms:rooms.length,room:selected,reduced_motion:reduced.matches,list:document.body.classList.contains('list-view'),fallback,...engine?.diagnostics()});
function useFallback() {
  fallback = true; document.body.classList.add('no-3d','list-view'); engine?.setList(true);
}
try {
  const { createGallery } = await import('./gallery-3d.mjs');
  engine = await createGallery({ select, interact:() => document.body.classList.add('exploring'), fallback:useFallback, reduced });
  const deepLink = rooms.findIndex(r => '#'+r.id === location.hash);
  if (deepLink >= 0) select(deepLink, false);
} catch (error) {
  console.warn('[gallery] Artwork view available:', error?.name || 'unavailable'); useFallback();
}
