import { createLisbonPreview } from './gallery-lisbon.mjs';
import { ORIGINS } from './gallery-artworks.mjs';

const rooms = [...document.querySelectorAll('.room')];
const nav = [...document.querySelectorAll('.tour [data-room]')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const info = document.getElementById('work-info');
let selected = -1, selectedOrigin=null,engine = null, fallback = false,pendingExploration=false;
const lisbonPreview=createLisbonPreview({onChange:()=>engine?.invalidate()});
const lisbonCard=document.querySelector('#lisbon .artwork');
lisbonCard.append(lisbonPreview.canvas);lisbonCard.classList.add('has-preview');
let previewRaf=0,lastPreviewTime=0;
function listPreview(time) {
  previewRaf=0;
  if(document.hidden||reduced.matches||!document.body.classList.contains('list-view')){lisbonPreview.pause();return;}
  const rect=lisbonCard.getBoundingClientRect(),visible=rect.bottom>100&&rect.top<innerHeight-90;
  lisbonPreview.update(lastPreviewTime?Math.min((time-lastPreviewTime)/1000,.1):0,visible);
  lastPreviewTime=time;previewRaf=requestAnimationFrame(listPreview);
}
function syncPreview() {
  if(previewRaf)cancelAnimationFrame(previewRaf);previewRaf=0;lastPreviewTime=0;lisbonPreview.pause();
  if(!document.hidden&&!reduced.matches&&document.body.classList.contains('list-view'))previewRaf=requestAnimationFrame(listPreview);
}
document.addEventListener('visibilitychange',syncPreview);
reduced.addEventListener('change',syncPreview);
addEventListener('pagehide',()=>{if(previewRaf)cancelAnimationFrame(previewRaf);previewRaf=0;lisbonPreview.pause();});
addEventListener('pageshow',syncPreview);
function select(index, updateHash = true, origin=null, navigate=true) {
  selected = Math.max(0, Math.min(rooms.length - 1, index));
  selectedOrigin=origin;
  document.body.classList.add('exploring');
  nav.forEach((a, i) => a.setAttribute('aria-current', String(i === selected)));
  const room = rooms[selected];
  document.getElementById('work-title').replaceChildren(...[...room.querySelector('.caption h1,.caption h2').childNodes].map(n=>n.cloneNode(true)));
  document.getElementById('work-kind').textContent = room.querySelector('.caption p').textContent;
  document.getElementById('work-links').replaceChildren(...[...room.querySelectorAll('.room-actions a')].map(a => a.cloneNode(true)));
  if(selected===1&&origin!==null&&ORIGINS[origin]){
    const item=ORIGINS[origin];document.getElementById('work-title').textContent=item.title;
    document.getElementById('work-kind').textContent='Origins / Quantum · '+(origin+1)+' / 20';
    const links=document.getElementById('work-links');links.replaceChildren();
    for(const [href,text] of [['/origins?work='+String(origin+1).padStart(2,'0'),'Open'],['/market?art='+item.id,'Collect']]){const a=document.createElement('a');a.href=href;a.textContent=text;links.append(a);}
    for(const [next,text] of [[origin-1,'Previous'],[origin+1,'Next']])if(ORIGINS[next]){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',()=>select(1,true,next));links.append(b);}
  }
  info.classList.add('is-open');
  if (updateHash) history.replaceState(null, '', location.pathname + location.search + '#' + (selected===1&&origin!==null?'origin-'+String(origin+1).padStart(2,'0'):room.id));
  if (document.body.classList.contains('list-view') || fallback) room.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
  else if(navigate) engine?.visit(selected,origin);
}
function overview() {
  selected = -1;
  selectedOrigin=null;pendingExploration=false;
  document.body.classList.add('exploring'); info.classList.remove('is-open');
  nav.forEach(a => a.setAttribute('aria-current', 'false'));
  history.replaceState(null, '', location.pathname + location.search);
  engine?.overview();
}
nav.forEach((a, i) => a.addEventListener('click', e => { e.preventDefault(); select(i); }));
document.getElementById('enter-gallery').addEventListener('click', () => {document.body.classList.add('exploring');document.getElementById('space').focus();});
document.getElementById('overview').addEventListener('click', overview);
document.getElementById('return-dome').addEventListener('click',overview);
document.getElementById('explore-space').addEventListener('click',()=>{
  document.body.classList.add('exploring');
  if(engine)engine.explore();else pendingExploration=true;
});
document.getElementById('close-info').addEventListener('click', () => info.classList.remove('is-open'));
document.getElementById('view-list').addEventListener('click', e => {
  const list = document.body.classList.toggle('list-view');
  e.currentTarget.textContent = list ? 'Visit in 3D' : 'Artworks';
  e.currentTarget.setAttribute('aria-pressed', String(list));
  engine?.setList(list);
  syncPreview();
});
document.querySelector('.skip').addEventListener('click', () => {
  document.body.classList.add('list-view'); engine?.setList(true);
  syncPreview();
});
const member = document.getElementById('member'), menu = document.getElementById('member-menu');
member.addEventListener('click', () => { const open = menu.classList.toggle('is-open'); member.setAttribute('aria-expanded', String(open)); });
document.addEventListener('pointerdown', e => { if (!e.target.closest('.member')) { menu.classList.remove('is-open'); member.setAttribute('aria-expanded', 'false'); } });
document.addEventListener('keydown', e => {
  if (e.target.closest('input,textarea,select,[contenteditable=true]')) return;
  if (e.key === 'Escape') {
    menu.classList.remove('is-open'); member.setAttribute('aria-expanded','false'); info.classList.remove('is-open');
    if(engine?.diagnostics().zone==='void')overview();
  }
  if (e.key === 'PageDown' || e.key === 'PageUp') { e.preventDefault(); if(engine?.diagnostics().zone==='void'){if(e.key==='PageDown')engine.explore();else engine.previous();}else select((selected + (e.key==='PageDown'?1:-1) + rooms.length) % rooms.length); }
  if (e.key === 'Home') { e.preventDefault(); overview(); }
});
window.__totehm_gallery = () => ({build:'2026-10-17-space-temple-void',rooms:rooms.length,room:selected,origin:selectedOrigin,reduced_motion:reduced.matches,list:document.body.classList.contains('list-view'),fallback,...engine?.diagnostics(),lisbon:lisbonPreview.diagnostics()});
function useFallback() {
  fallback = true; document.body.classList.add('no-3d','list-view'); engine?.setList(true);
  syncPreview();
}
try {
  const { createGallery } = await import('./gallery-3d.mjs');
  engine = await createGallery({ select, onZone:(zone,room,origin)=>{if(zone==='void')select(room,true,origin,false);else{selected=-1;selectedOrigin=null;info.classList.remove('is-open');nav.forEach(a=>a.setAttribute('aria-current','false'));history.replaceState(null,'',location.pathname+location.search);}}, interact:() => document.body.classList.add('exploring'), fallback:useFallback, reduced, lisbonPreview });
  engine.setList(document.body.classList.contains('list-view'));syncPreview();
  const hash=location.hash==='#quantum'?'#origins':location.hash==='#stoner'?'#totehmpaper':location.hash;
  const frame=/^#origin-(\d{1,2})$/.exec(hash),origin=frame?Number(frame[1])-1:null;
  const deepLink = rooms.findIndex(r => '#'+r.id === hash);
  if(origin!==null&&ORIGINS[origin])select(1,false,origin);
  else if (deepLink >= 0) select(deepLink, false);
  else if(pendingExploration||hash==='#beyond')engine.explore();
} catch (error) {
  console.warn('[gallery] Artwork view available:', error?.name || 'unavailable'); useFallback();
}
